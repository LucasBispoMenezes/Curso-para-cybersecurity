# Módulo 6 — Scanning, Fuzzing e Relatório

**Carga:** 3 horas (45 min teoria · 2h15 lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Orquestrar scanners programaticamente e ler sua saída de forma estruturada.
2. Preferir formatos de saída parseáveis (XML/JSON) a parsing de texto de tela.
3. Executar fuzzing de descoberta de conteúdo contra alvo de laboratório próprio.
4. Deduplicar e priorizar achados.
5. Gerar um relatório técnico em Markdown a partir dos dados coletados.

---

## ⚠ Ética

Fuzzing é a técnica com maior potencial de dano colateral do curso. Requisições em massa podem
derrubar aplicação, encher log, disparar alerta, e em sistema frágil, causar indisponibilidade.

⚠ **Regras:**

- Fuzzing **somente** contra sistema próprio ou com autorização escrita que mencione fuzzing
  explicitamente e defina limite de requisições.
- Nunca aponte um fuzzer para serviço de terceiro.
- Wordlist grande e alvo pequeno = indisponibilidade. Ajuste a concorrência ao alvo.
- Todo achado precisa de evidência reproduzível — não basta "o fuzzer marcou".

---

## 6.1 Saída parseável vale mais que saída bonita

A decisão mais importante deste módulo: **nunca faça parsing de saída de tela quando existe
formato estruturado.**

| Ferramenta | Formato ruim | Formato bom |
|---|---|---|
| `nmap` | saída normal de terminal | `-oX` (XML) ou `-oG` (grepable) |
| `ffuf` | saída colorida | `-of json -o saida.json` |
| `gobuster` | saída padrão | `--output` |
| `curl` | corpo da resposta | `-w '%{json}'` |

Por que: a saída de tela muda entre versões, tem cor, tem barra de progresso, tem quebra de linha
por largura de terminal. Parsing dela é construir sobre areia.

```bash
# Frágil
nmap -sV 127.0.0.1 | grep open | awk '{print $1}' | cut -d/ -f1

# Robusto
nmap -sV -oX /tmp/scan.xml 127.0.0.1 >/dev/null 2>&1
# e depois processar XML (via python3, xmlstarlet, ou jq se converter para JSON)
```

---

## 6.2 Orquestrando scanner com saída estruturada

```bash
#!/usr/bin/env bash
#
# scan-host.sh — varredura + extração estruturada
# Uso: ./scan-host.sh <alvo> <saida.tsv>
#
set -euo pipefail

ALVO="${1:?uso: scan-host.sh <alvo> <saida.tsv>}"
SAIDA="${2:?informe o arquivo de saída}"

command -v nmap >/dev/null 2>&1 || { echo "erro: nmap ausente" >&2; exit 3; }

XML="$(mktemp)"
trap 'rm -f "${XML}"' EXIT

echo "varrendo ${ALVO}..." >&2

# -oX: XML estruturado. Nunca deixe de usar.
timeout 300 nmap -sV -T4 -oX "${XML}" "${ALVO}" >/dev/null 2>&1 || true

# Extração com a ferramenta certa:
# em ambiente sem python3, use grep -oP sobre o XML, aceitando a fragilidade
printf 'porta\tprotocolo\testado\tservico\tproduto\tversao\n' > "${SAIDA}"

grep -oP '<port protocol="\K[^"]+(?=" portid="\d+")' "${XML}" >/dev/null 2>&1 || true

# Abordagem portável: `nmap` também aceita -oG (grepable), que é plano e estável
GREAM="$(mktemp)"
trap 'rm -f "${XML}" "${GREAM}"' EXIT

timeout 300 nmap -sV -oG "${GREAM}" "${ALVO}" >/dev/null 2>&1 || true

# Formato grepable:
# Host: 127.0.0.1 ()  Ports: 22/open/tcp//ssh//OpenSSH 9.2p1/,80/open/tcp//http//nginx 1.24.0/
awk '
BEGIN { FS="\t"; OFS="\t" }
/^Host:/ {
    if (match($0, /Host: ([^ ]+)/, m)) host = m[1]
}
/Ports:/ {
    line = $0
    sub(/^.*Ports: /, "", line)
    n = split(line, entradas, ", ")
    for (i = 1; i <= n; i++) {
        e = entradas[i]
        # porta/estado/protocolo///servico//versao/
        split(e, c, "/")
        if (c[2] != "open") continue
        printf "%s\t%s\t%s\t%s\t%s\t%s\n", host, c[1], c[3], c[4], c[5], c[7]
    }
}
' "${GREAM}" >> "${SAIDA}"

echo "resultado em ${SAIDA}" >&2
wc -l < "${SAIDA}" >&2
```

N O T A Você pode trocar toda a extração por `python3` com `xml.etree` — é mais robusto que
`awk` sobre XML. Em automação séria, faça isso. O `awk` sobre `-oG` fica aqui como caminho
que não exige runtime extra.

---

## 6.3 Fuzzing de descoberta de conteúdo

O objetivo é descobrir caminhos que existem mas não estão linkados: `/admin`, `/backup`,
`/.git`, `/api/v2`, `/uploads`.

### O que o fuzzer faz e o que ele não faz

Ele **manda** uma requisição por palavra da wordlist e **compara** a resposta contra um baseline.
Ele não "descobre vulnerabilidade". Ele produz uma lista de caminhos que responderam diferente
do normal — e a sua parte é interpretar.

### Baseline é tudo

Se você não estabelecer o comportamento padrão do alvo, não consegue distinguir "encontrei algo"
de "todo mundo responde 200".

```bash
#!/usr/bin/env bash
set -euo pipefail

URL_BASE="http://172.32.0.2"

# 1. Baseline: um caminho que com certeza NÃO existe
aleatorio="nao-existe-$(head -c 12 /dev/urandom | base64 | tr -d '/+=')"
codigo_base=$(curl -sS -o /dev/null -w '%{http_code}' "${URL_BASE}/${aleatorio}")
tamanho_base=$(curl -sS -o /dev/null -w '%{size_download}' "${URL_BASE}/${aleatorio}")

echo "baseline: status=${codigo_base} tamanho=${tamanho_base}" >&2
```

Com isso você define: **resposta é interessante se o status for diferente do baseline, OU o
tamanho for significativamente diferente.**

### Fuzz com controle de concorrência

```bash
#!/usr/bin/env bash
#
# fuzz.sh — descoberta de conteúdo com baseline
# Uso: ./fuzz.sh -u http://alvo -w wordlist.txt [-j 20] [-s 200,301,302,401,403]
#
set -euo pipefail

URL=""
WORDLIST=""
JOBS=20
INTERESSANTES="200,204,301,302,307,401,403,405"
TIMEOUT=8

while getopts ":u:w:j:s:h" opt; do
    case "${opt}" in
        u) URL="${OPTARG}" ;;
        w) WORDLIST="${OPTARG}" ;;
        j) JOBS="${OPTARG}" ;;
        s) INTERESSANTES="${OPTARG}" ;;
        h) echo "Uso: $0 -u URL -w wordlist [-j 20] [-s 200,301]"; exit 0 ;;
        *) exit 2 ;;
    esac
done

[[ -n "${URL}" && -r "${WORDLIST}" ]] || { echo "erro: argumentos inválidos" >&2; exit 2; }

# Baseline
aleatorio="zz-$RANDOM-$RANDOM"
status_base=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "${TIMEOUT}" \
              "${URL}/${aleatorio}" || echo "000")
echo "baseline status=${status_base}" >&2

export URL TIMEOUT INTERESSANTES

testar_caminho() {
    local caminho="$1" status tamanho
    status=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "${TIMEOUT}" \
             "${URL}/${caminho}" 2>/dev/null || echo "000")

    # Interessa se não é o baseline e não é erro de rede
    if [[ "${status}" != "000" && "${status}" != "404" ]]; then
        tamanho=$(curl -sS -o /dev/null -w '%{size_download}' --max-time "${TIMEOUT}" \
                  "${URL}/${caminho}" 2>/dev/null || echo "0")
        printf '%s\t%s\t%s\n' "${status}" "${tamanho}" "${caminho}"
    fi
}
export -f testar_caminho

grep -vE '^\s*(#|$)' "${WORDLIST}" \
  | xargs -P "${JOBS}" -I {} bash -c 'testar_caminho "$1"' _ {} \
  | sort -k1,1n -k3,3
```

N O T A O `if` acima filtra `404` e erro de rede. Note também que **não** estou comparando com a
lista `INTERESSANTES` no código — a lista é didática; na prática, "diferente de 404 e de erro de
rede" já é o filtro útil, porque muitos frameworks retornam `200` para tudo.

### Deduplicação e priorização de achados

```bash
consolidar_achados() {
    local arquivo="$1"

    # Deduplica por caminho, priorizando status mais "interessante" primeiro
    awk -F'\t' '
        BEGIN {
            prioridade["200"]=5; prioridade["201"]=5; prioridade["204"]=4
            prioridade["301"]=3; prioridade["302"]=3; prioridade["307"]=3
            prioridade["401"]=9; prioridade["403"]=8; prioridade["405"]=2
        }
        {
            p = ($1 in prioridade) ? prioridade[$1] : 1
            if (!(($3) in visto) || p > visto[$3]) {
                visto[$3] = p
                linha[$3] = $1"\t"$2"\t"$3
            }
        }
        END { for (c in linha) print visto[c]"\t"linha[c] }
    ' "${arquivo}" \
      | sort -rn -k1,1 \
      | cut -f2-
}
```

A intuição: entre duplicatas do mesmo caminho, guarde a ocorrência com status mais revelador.
`401` e `403` sugerem recurso existente e protegido — muito mais interessante que `200` de
página genérica.

---

## 6.4 Gerando o relatório

O último estágio é o que transforma dado em entrega. Um relatório em Markdown que o cliente lê
e entende.

```bash
#!/usr/bin/env bash
#
# relatorio.sh — gera relatório Markdown a partir dos dados coletados
# Uso: ./relatorio.sh -a achados.tsv -h alvos.tsv -o relatorio.md
#
set -euo pipefail

ACHADOS=""
ALVOS=""
SAIDA="relatorio.md"
CLIENTE="[cliente]"
DATA_INICIO=""
DATA_FIM=""

while getopts ":a:h:o:c:i:f:" opt; do
    case "${opt}" in
        a) ACHADOS="${OPTARG}" ;;
        h) ALVOS="${OPTARG}" ;;
        o) SAIDA="${OPTARG}" ;;
        c) CLIENTE="${OPTARG}" ;;
        i) DATA_INICIO="${OPTARG}" ;;
        f) DATA_FIM="${OPTARG}" ;;
        *) exit 2 ;;
    esac
done

: "${ACHADOS:?informe -a achados.tsv}"

hoje="$(date '+%Y-%m-%d')"

{
cat <<EOF
# Relatório de Teste de Intrusão — ${CLIENTE}

**Data de emissão:** ${hoje}
**Período de execução:** ${DATA_INICIO:-não informado} a ${DATA_FIM:-não informado}
**Classificação:** Confidencial

---

## 1. Resumo executivo

Este documento apresenta os resultados do teste de intrusão executado no escopo acordado.
Todos os testes foram conduzidos com autorização escrita, dentro da janela e do escopo
definidos. Os achados estão classificados por severidade e acompanhados de evidência
reproduzível.

**Total de achados:** $(($(wc -l < "${ACHADOS}") - 1))

---

## 2. Escopo testado
EOF

if [[ -n "${ALVOS}" && -r "${ALVOS}" ]]; then
    echo
    echo '| Host | Porta | Serviço | Fonte |'
    echo '|---|---|---|---|'
    awk -F'\t' 'NR>1 && NR<=51 {printf "| %s | %s | %s | %s |\n", $1, $2, $4, ($5==""?"-":$5)}' "${ALVOS}"
    total=$(( $(wc -l < "${ALVOS}") - 1 ))
    if (( total > 50 )); then
        echo
        echo "_(mostrando 50 de ${total} ativos; lista completa no anexo)_"
    fi
else
    echo
    echo "Lista de ativos não fornecida."
fi

cat <<EOF

---

## 3. Achados

| # | Severidade | Caminho | Status | Tamanho | Descrição |
|---|---|---|---|---|---|
EOF

n=0
awk -F'\t' '{print}' "${ACHADOS}" | tail -n +2 | while IFS=$'\t' read -r status tamanho caminho; do
    n=$((n + 1))
    case "${status}" in
        401|403) sev="Média" ; desc="Recurso existente com acesso restrito — revisar necessidade de exposição" ;;
        200|201|204) sev="Alta" ; desc="Recurso acessível publicamente — validar se é intencional" ;;
        301|302|307) sev="Baixa" ; desc="Redirecionamento — verificar destino e cadeia" ;;
        *) sev="Informativa" ; desc="Comportamento distinto do baseline" ;;
    esac
    printf '| %d | %s | %s | %s | %s | %s |\n' "${n}" "${sev}" "${caminho}" "${status}" "${tamanho}" "${desc}"
done

cat <<EOF

---

## 4. Metodologia

- Enumeração de serviços e fingerprinting a partir de sinais públicos (cabeçalhos HTTP, DNS).
- Descoberta de conteúdo por dicionário, com baseline estabelecido antes da execução.
- Toda saída de ferramenta foi processada em formato estruturado, nunca por parsing de tela.
- Limite de concorrência respeitado conforme acordado na regra de engajamento.

## 5. Limitações

- Os resultados refletem o estado do ambiente durante a janela de teste. Alterações
  posteriores em configuração, código ou infraestrutura invalidam os achados.
- Achados não explorados até a comprovação de impacto estão marcados como "requer validação".
- Este relatório não constitui certificação de segurança nem garantia de ausência de falhas.

## 6. Recomendações

1. Revisar exposição de recursos administrativos e de backup.
2. Implementar controles de autenticação em endpoints que retornam conteúdo.
3. Estabelecer política de cabeçalhos HTTP e remover banners que revelam versão.
4. Monitorar e alertar sobre varredura de conteúdo (requisições 404 em volume).

---

*Relatório gerado automaticamente a partir dos dados coletados durante o teste.*
EOF
} > "${SAIDA}"

echo "relatório em ${SAIDA}" >&2
```

N O T A Reporte severidade com honestidade. `200` de página genérica **não** é "Alta". Inflar
severidade para parecer produtivo é o vício mais comum e destrói a credibilidade do relatório.

---

## 6.5 LAB — Pipeline end-to-end

**Duração:** 135 min
**Objetivo:** receber um alvo, executar o pipeline completo e devolver relatório Markdown.

### Passo 1 — Alvo de laboratório com superfície variada

```bash
mkdir -p lab6 && cd lab6
docker network create --subnet 172.32.0.0/24 net6 2>/dev/null || true

mkdir -p alvo/admin alvo/backup alvo/api
echo '<html><head><title>Painel</title></head><body>admin</body></html>' > alvo/admin/index.html
echo 'index backup' > alvo/backup/index.html
echo '{"status":"ok","v":2}' > alvo/api/index.html
echo '<html><head><title>Bem-vindo</title></head><body>home</body></html>' > alvo/index.html

docker run -d --name alvo-lab --network net6 --ip 172.32.0.2 \
  -v "$PWD/alvo:/usr/share/nginx/html:ro" nginx:alpine >/dev/null

sleep 2
curl -sS -o /dev/null -w 'alvo responde: %{http_code}\n' http://172.32.0.2/
```

⚠ `172.32.0.0/24` é a rede do seu laboratório. Não aponte o fuzzer para nada fora dela.

### Passo 2 — Wordlist

```bash
cat > wordlist.txt <<'EOF'
admin
api
backup
uploads
.git
config
teste
naoexiste
EOF
```

### Passo 3 — Execute os estágios

```bash
# Estágio: varredura
./scan-host.sh 172.32.0.2 servicos.tsv

# Estágio: fuzzing
./fuzz.sh -u http://172.32.0.2 -w wordlist.txt -j 10 > achados-brutos.tsv

# Estágio: consolidação (cole a função do 6.3 num script)
./consolidar.sh achados-brutos.tsv > achados.tsv

# Estágio: relatório
./relatorio.sh -a achados.tsv -h servicos.tsv -o relatorio.md -c "Laboratório Interno"
```

### Passo 4 — Verificação

```bash
head -40 relatorio.md
echo "---"
wc -l relatorio.md achados.tsv servicos.tsv
```

### Critérios de aceitação

- O relatório tem as seis seções, com dados reais nas tabelas.
- `admin` e `api` aparecem como achados; `naoexiste` **não** aparece (é o baseline).
- `achados.tsv` não contém caminho duplicado.
- Nenhuma linha do relatório contém saída crua de ferramenta.
- Pipeline completo roda do zero em menos de 2 minutos no laboratório.
- `shellcheck` limpo em todos os scripts.

### Limpeza

```bash
docker rm -f alvo-lab
docker network rm net6
```

---

## Projeto final

Escolha um dos dois:

**A) Pipeline genérico parametrizável.** Um único ponto de entrada `./pentest-pipeline.sh -t <alvo> -o <dir>` que executa os quatro estágios, salva cada artefato intermediário em `<dir>/`, roda tudo com um limite de concorrência único, e produz `relatorio.md`. Deve funcionar em qualquer alvo do laboratório sem edição de código.

**B) Ferramenta de nicho bem-feita.** Escolha um problema específico — por exemplo, correlação entre portas abertas e achados de conteúdo para sugerir vetores — e construa uma ferramenta que faça **uma** coisa muito bem, com `--help` completo, `--dry-run`, logs estruturados e testes.

**Critérios de avaliação do projeto:** código legível, tratamento de erro real, saída em formato estável, documentação de uso, e um `README` que explica as decisões de projeto — não só o que faz.

---

## Avaliação

1. Por que parsing de saída de tela é frágil e parsing de XML/JSON não é? Dê um exemplo concreto
   de quebra.
2. O que é baseline num fuzzer de conteúdo, e o que acontece se você não estabelecê-lo?
3. Por que `401` é mais interessante que `200` em achado de fuzzing?
4. Escreva o idioma `awk` que, entre duplicatas de um mesmo caminho, mantém a ocorrência com
   maior prioridade.
5. Descreva a diferença entre "achado" e "vulnerabilidade comprovada". Por que o relatório precisa
   distinguir os dois?
6. Por que inflar severidade de achado é um erro profissional grave?
7. Enuncie as três informações que um relatório precisa ter para que o achado seja acionável:
   o que foi encontrado, como reproduzir, e qual o impacto.

---

## Encerramento do curso

Você começou escrevendo um script que falha de forma controlada. Termina com um pipeline que
recebe um alvo e devolve relatório. O que você aprendeu não foi uma lista de comandos — foi a
capacidade de transformar ferramenta em automação e saída crua em decisão.

O que separa um profissional que usa essas técnicas de forma legítima é uma única coisa:
**autorização escrita e escopo definido.** Sem isso, tudo o que você aprendeu aqui é crime.

Material de referência aberta para continuar:
**GNU Bash Reference Manual** · **MITRE ATT&CK** · **NIST SP 800-115** · **OWASP WSTG** · **Kali Docs**
