# Módulo 5 — Automação de Reconhecimento

**Carga:** 4 horas (1h15 teoria · 2h45 lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Construir wrappers confiáveis para ferramentas de enumeração.
2. Resolver nomes em massa com paralelismo controlado.
3. Descobrir subdomínios por dicionário em alvo de laboratório próprio.
4. Fazer fingerprinting de tecnologias a partir de cabeçalhos e corpo.
5. Agregar múltiplas fontes num dataset único, deduplicado e priorizado.

---

## ⚠ Ética

Enumeração de DNS e subdomínios é a atividade que mais gera incidente acidental. Consultar
um resolvedor público com 50 mil nomes pode fazer seu IP ser bloqueado, ou pior, gerar tráfego
que parece ataque a um terceiro.

⚠ **Regras que não são negociáveis:**

- Enumere **somente** domínios no escopo escrito do engajamento.
- Brute force de subdomínio consome recurso de resolvedor. Use um resolvedor local no laboratório.
- Nunca faça brute force de subdomínio de domínio que não é seu, mesmo "só para ver".
- Registre a origem de cada dado — em relatório, você precisa saber se um achado veio de DNS,
  de varredura, ou de fonte passiva.

---

## 5.1 O que é reconhecimento em automação

Recon é a fase de **coletar superfície de ataque**: hosts, subdomínios, portas, serviços, versões,
tecnologias. Manualmente, é impossível em escala. Automatizado, é um pipeline com quatro estágios:

```
[coleta]  →  [normalização]  →  [enriquecimento]  →  [priorização]
```

Cada estágio tem um script. Cada script tem uma responsabilidade. Isso importa porque quando
algo sai errado, você sabe qual script consertar.

A regra central deste módulo: **cada estágio lê de stdin ou de arquivo e escreve em stdout**,
num formato único e estável. É o que torna os estágios testáveis isoladamente.

### O formato canônico do curso

Adote TSV (tab-separated) para dado tabular e JSON Lines para dado com estrutura variável.
TSV porque `awk` e `cut` lidam nativamente; JSON Lines porque `jq -c` escreve e lê uma linha
por registro.

```
# alvos.tsv
host	porta	protocolo	servico	versao	fonte
10.0.0.5	443	tcp	https	nginx 1.24	varredura
api.exemplo.local	443	tcp	https	nginx 1.24	dns
```

---

## 5.2 Wrappers: envolvendo ferramenta externa com segurança

Uma ferramenta externa pode: não existir, mudar de formato, travar, ou retornar erro parcial.
Um wrapper bom isola tudo isso.

```bash
#!/usr/bin/env bash
#
# wrap.sh — execução segura de ferramenta externa
#
set -euo pipefail

exigir() {
    local ferramenta
    for ferramenta in "$@"; do
        if ! command -v "${ferramenta}" >/dev/null 2>&1; then
            echo "erro: dependência ausente: ${ferramenta}" >&2
            exit 3
        fi
    done
}

executar_com_timeout() {
    local segundos="$1"; shift
    local saida codigo

    # Captura stdout E stderr; o exit code vem do processo, não do timeout
    saida=$(timeout "${segundos}" "$@" 2>&1) && codigo=0 || codigo=$?

    case "${codigo}" in
        0)   printf '%s\n' "${saida}"; return 0 ;;
        124) echo "erro: timeout após ${segundos}s: $*" >&2; return 124 ;;
        *)   echo "erro: comando falhou (${codigo}): $*" >&2; printf '%s\n' "${saida}" | head -5 >&2; return "${codigo}" ;;
    esac
}

exigir dig curl jq
executar_com_timeout 10 dig +short A exemplo.local
```

Três decisões que fazem a diferença:

- **`command -v` antes de tudo.** Falhar na primeira linha é melhor que falhar na linha 200.
- **Código `124` é especial.** É o que o `timeout` usa. Trate separado de falha normal.
- **Mostre só as primeiras linhas do erro.** Ferramenta que falha pode despejar 800 linhas —
  você quer o diagnóstico, não o vômito.

---

## 5.3 Resolução em massa

### Sequencial vs. paralelo, de novo

```bash
# Lento: ~1s por nome em resolvedor distante
while read -r nome; do
    dig +short A "${nome}.exemplo.local"
done < nomes.txt
```

Resolver 5.000 nomes assim é inviável. Em paralelo:

```bash
#!/usr/bin/env bash
#
# resolver.sh — resolve A records em massa
# Uso: ./resolver.sh -d exemplo.local -w nomes.txt [-j 50] [-r 127.0.0.1]
#
set -euo pipefail

DOMINIO=""
WORDLIST=""
JOBS=50
RESOLVEDOR=""

while getopts ":d:w:j:r:h" opt; do
    case "${opt}" in
        d) DOMINIO="${OPTARG}" ;;
        w) WORDLIST="${OPTARG}" ;;
        j) JOBS="${OPTARG}" ;;
        r) RESOLVEDOR="${OPTARG}" ;;
        h) echo "Uso: $0 -d dominio -w wordlist [-j 50] [-r resolvedor]"; exit 0 ;;
        :) echo "erro: -${OPTARG} exige valor" >&2; exit 2 ;;
        \?) echo "erro: opção inválida -${OPTARG}" >&2; exit 2 ;;
    esac
done

[[ -r "${WORDLIST}" ]] || { echo "erro: wordlist ilegível" >&2; exit 3; }

ARGS=(+short +time=3 +tries=1)
[[ -n "${RESOLVEDOR}" ]] && ARGS+=("@${RESOLVEDOR}")

resolver_um() {
    local nome="$1" dominio="$2" ip
    ip=$(dig +short +time=3 +tries=1 A "${nome}.${dominio}" 2>/dev/null \
         | grep -E '^[0-9]+\.' | head -n 1)
    if [[ -n "${ip}" ]]; then
        printf '%s\t%s\n' "${nome}.${dominio}" "${ip}"
    fi
}

export -f resolver_um

grep -vE '^\s*(#|$)' "${WORDLIST}" \
  | xargs -P "${JOBS}" -I {} bash -c 'resolver_um "$1" "$2"' _ {} "${DOMINIO}" \
  | sort
```

N O T A Em engajamento real, **use resolvedor local** (`dnsmasq`, `unbound`) ou o resolvedor
autorizado do escopo. Bater 5.000 consultas num resolvedor público é o caminho mais rápido para
ser bloqueado — e para gerar um alerta em quem opera aquele resolvedor.

### CNAMEs e cadeia de resolução

Nome que aponta para outro nome conta como descoberta:

```bash
dig +short CNAME api.exemplo.local
# -> lb-prod-01.hosting.example.net.
```

Isso revela infraestrutura que o A record sozinho esconde. Vale capturar:

```bash
registrar_cadeia() {
    local nome="$1"
    local a cname
    a=$(dig +short A "$nome" | tr '\n' ',' | sed 's/,$//')
    cname=$(dig +short CNAME "$nome" | tr '\n' ',' | sed 's/,$//')
    printf '%s\tA=%s\tCNAME=%s\n' "$nome" "${a:--}" "${cname:--}"
}
```

---

## 5.4 Fingerprinting de tecnologia

Identificar o que roda num host a partir de sinais baratos: cabeçalhos HTTP, título, favicon.

```bash
#!/usr/bin/env bash
set -euo pipefail

fingerprint() {
    local url="$1"
    local headers server powered title body

    headers=$(curl -sS -I -L --connect-timeout 3 --max-time 8 "${url}" 2>/dev/null || true)

    server=$(printf '%s\n' "${headers}" | awk -F': ' 'tolower($1)=="server"{print $2; exit}')
    powered=$(printf '%s\n' "${headers}" | awk -F': ' 'tolower($1)=="x-powered-by"{print $2; exit}')

    body=$(curl -sS -L --connect-timeout 3 --max-time 8 "${url}" 2>/dev/null | head -c 20000 || true)
    title=$(printf '%s' "${body}" | grep -oPi '(?<=<title>).*?(?=</title>)' | head -n 1 || true)

    printf '%s\tserver=%s\tpowered=%s\ttitulo=%s\n' \
        "${url}" "${server:--}" "${powered:--}" "${title:--}"
}
```

### Correlacionando com lista de padrões

Em vez de decidir por um sinal só, cruze vários:

```bash
#!/usr/bin/env bash
set -euo pipefail

declare -A PADROES=(
    ["nginx"]="server:nginx"
    ["apache"]="server:apache"
    ["iis"]="server:Microsoft-IIS"
    ["php"]="powered:PHP"
    ["aspnet"]="powered:ASP.NET"
    ["wordpress"]="body:wp-content"
    ["drupal"]="body:Drupal"
    ["jenkins"]="server:Jetty|body:Jenkins"
)

detectar() {
    local server="$1" powered="$2" corpo="$3" nome padrao

    for nome in "${!PADROES[@]}"; do
        padrao="${PADROES[${nome}]}"
        if [[ "${padrao}" == *"|"* ]]; then
            # Padrão com alternativas: qualquer um casa
            IFS='|' read -ra alts <<< "${padrao}"
            for alt in "${alts[@]}"; do
                case "${alt}" in
                    server:*)  [[ "${server,,}"  == *"${alt#server:}"*  ]] && echo "${nome}" && return ;;
                    powered:*) [[ "${powered,,}" == *"${alt#powered:}"* ]] && echo "${nome}" && return ;;
                    body:*)    [[ "${corpo,,}"    == *"${alt#body:}"*    ]] && echo "${nome}" && return ;;
                esac
            done
        else
            case "${padrao}" in
                server:*)  [[ "${server,,}"  == *"${padrao#server:}"*  ]] && echo "${nome}" && return ;;
                powered:*) [[ "${powered,,}" == *"${padrao#powered:}"* ]] && echo "${nome}" && return ;;
                body:*)    [[ "${corpo,,}"    == *"${padrao#body:}"*    ]] && echo "${nome}" && return ;;
            esac
        fi
    done
    echo "desconhecido"
}
```

N O T A `${var,,}` converte para minúsculas (bash 4+). Combinado com comparação por `*substring*`,
evita escrever regex para cada padrão.

---

## 5.5 Agregação, deduplicação e priorização

Recon gera dado redundante: o mesmo host aparece de DNS, de varredura e de fonte passiva. Três
operações resolvem quase tudo.

### Deduplicar preservando ordem

```bash
# Deduplica linhas mantendo a primeira ocorrência
awk '!visto[$0]++' entrada.txt > saida.txt

# Deduplica pela primeira coluna, mantendo o restante da primeira linha vista
awk -F'\t' '!visto[$1]++' alvos.tsv
```

`awk '!visto[$0]++'` é o idioma clássico: o valor é avaliado antes do incremento, então `0`
(primeira vez) é falso e a linha passa; depois disso é verdadeiro e é filtrada.

### Unir várias fontes com origem rastreada

```bash
#!/usr/bin/env bash
set -euo pipefail

: > consolidado.tsv
printf 'host\tfonte\n' >> consolidado.tsv

adicionar_fonte() {
    local arquivo="$1" rotulo="$2"
    grep -vE '^\s*(#|$)' "${arquivo}" \
      | awk -v f="${rotulo}" -F'\t' '{print $1"\t"f}' \
      >> consolidado.tsv
}

adicionar_fonte dns.txt      dns
adicionar_fonte varredura.txt varredura
adicionar_fonte passivo.txt  passivo

# Agrupa por host, junta as fontes, ordena por relevância
awk -F'\t' 'NR>1 {f[$1]=f[$1]","$2}
            END {for (h in f) {sub(/^,/,"",f[h]); print h"\t"f[h]}}' consolidado.tsv \
  | awk -F'\t' '{n=split($2,a,","); print n"\t"$0}' \
  | sort -rn -k1,1 \
  | cut -f2- > alvos-final.tsv

cat alvos-final.tsv
```

Um host descoberto por três fontes independentes é mais relevante que um descoberto por uma.
Essa contagem é uma heurística de priorização defensável.

### Priorizar por serviço exposto

```bash
# Ordena por criticidade do serviço — define sua própria tabela
awk -F'\t' '
    BEGIN {
        score["postgresql"]=10; score["mysql"]=10; score["redis"]=9
        score["ssh"]=8; score["telnet"]=8; score["ftp"]=7
        score["http"]=3; score["https"]=3
    }
    NR>1 { s = ($5 in score) ? score[$5] : 1; print s"\t"$0 }
' alvos.tsv | sort -rn -k1,1 | cut -f2-
```

N N Exemplificativo. Em engajamento real a criticidade depende do escopo, do ativo, do
contexto de negócio. A tabela acima é um ponto de partida didático, não uma regra.

---

## 5.6 LAB — Pipeline de recon em três estágios

**Duração:** 150 min
**Objetivo:** construir um pipeline completo com estágios independentes e testáveis.

### Passo 1 — Ambiente com DNS local

```bash
mkdir -p lab5 && cd lab5
docker network create --subnet 172.31.0.0/24 net5 2>/dev/null || true

# Alvos web
docker run -d --name web1 --network net5 --ip 172.31.0.10 nginx:alpine >/dev/null
docker run -d --name web2 --network net5 --ip 172.31.0.11 httpd:alpine >/dev/null

# Arquivo de hosts que o resolvedor local vai servir
mkdir -p dns
cat > dns/dominio.local <<'EOF'
172.31.0.10
172.31.0.11
EOF
```

Para um DNS de laboratório sem infraestrutura pesada, use um container dedicado:

```bash
docker run -d --name dns-lab --network net5 --ip 172.31.0.53 \
  -p 5353:53/udp -p 5353:53/tcp \
  internetsystemsconsortium/bind9:9.18 >/dev/null 2>&1 || \
  echo "se o pull falhar, siga com o fallback abaixo"

# Fallback sem container de DNS: use /etc/hosts do host de laboratório
sudo tee -a /etc/hosts >/dev/null <<'EOF'
172.31.0.10 web1.dominio.local api.dominio.local
172.31.0.11 web2.dominio.local painel.dominio.local
EOF
```

O fallback com `/etc/hosts` é suficiente para o lab e evita dependência de imagem externa.
`getent hosts nome` consulta essa base e é o equivalente local ao `dig`.

```bash
getent hosts web1.dominio.local
```

### Passo 2 — Estágio 1: coleta

Escreva `estagio1-coleta.sh` que:

1. Lê uma wordlist de nomes candidatos (`api`, `painel`, `web1`, `web2`, `www`, `admin`, `teste`).
2. Para cada um, testa `<nome>.dominio.local`.
3. Resolve via `getent hosts` (fallback) **ou** `dig` com `-r` apontando para o resolvedor do lab.
4. Emite TSV: `host<TAB>ip<TAB>fonte`.

```bash
cat > wordlist.txt <<'EOF'
api
painel
web1
web2
www
admin
teste
EOF

cat > estagio1-coleta.sh <<'EOF'
#!/usr/bin/env bash
#
# estagio1-coleta.sh — resolução de nomes candidatos
# Uso: ./estagio1-coleta.sh -d dominio.local -w wordlist.txt [-j 10]
#
set -euo pipefail

DOMINIO=""
WORDLIST=""
JOBS=10

while getopts ":d:w:j:h" opt; do
    case "${opt}" in
        d) DOMINIO="${OPTARG}" ;;
        w) WORDLIST="${OPTARG}" ;;
        j) JOBS="${OPTARG}" ;;
        h) echo "Uso: $0 -d dominio -w wordlist [-j 10]"; exit 0 ;;
        *) exit 2 ;;
    esac
done

[[ -n "${DOMINIO}" && -r "${WORDLIST}" ]] || { echo "erro: argumentos inválidos" >&2; exit 2; }

resolver() {
    local nome="$1" ip
    ip=$(getent hosts "${nome}" 2>/dev/null | awk '{print $1}' | head -n 1)
    [[ -n "${ip}" ]] && printf '%s\t%s\t%s\n' "${nome}" "${ip}" "dns"
    return 0
}
export -f resolver

grep -vE '^\s*(#|$)' "${WORDLIST}" \
  | xargs -P "${JOBS}" -I {} bash -c 'resolver "$1"' _ "{}.${DOMINIO}" \
  | sort
EOF
chmod +x estagio1-coleta.sh

./estagio1-coleta.sh -d dominio.local -w wordlist.txt -j 8 | column -t -s$'\t'
```

Você deve encontrar 4 nomes: `api`, `painel`, `web1`, `web2`.

### Passo 3 — Estágio 2: enriquecimento

Escreva `estagio2-portas.sh` que recebe o TSV do estágio 1 em stdin e acrescenta portas abertas,
usando o `testar()` do Módulo 4:

Emissão: `host<TAB>ip<TAB>porta<TAB>servico<TAB>fonte`

```bash
cat > estagio2-portas.sh <<'EOF'
#!/usr/bin/env bash
#
# estagio2-portas.sh — descobre portas abertas nos hosts recebidos em stdin
# Uso: ./estagio1-coleta.sh ... | ./estagio2-portas.sh [-j 10]
#
set -euo pipefail

JOBS="${JOBS:-10}"
PORTAS=(22 80 443 8000 8080)

testar_porta() {
    local host="$1" ip="$2" porta="$3"
    if timeout 2 bash -c "exec 3<>/dev/tcp/${ip}/${porta}" 2>/dev/null; then
        printf '%s\t%s\t%s\t%s\t%s\n' "${host}" "${ip}" "${porta}" "?" "varredura"
    fi
}
export -f testar_porta

# Achata host×porta numa lista de jobs
awk -F'\t' -v portas="${PORTAS[*]}" '
    {
        n = split(portas, p, " ")
        for (i = 1; i <= n; i++) print $1"\t"$2"\t"p[i]
    }
' \
  | xargs -P "${JOBS}" -I {} bash -c \
      'IFS=$'"'"'\t'"'"' read -r h i p <<< "$1"; testar_porta "$h" "$i" "$p"' _ {} \
  | sort
EOF
chmod +x estagio2-portas.sh

./estagio1-coleta.sh -d dominio.local -w wordlist.txt \
  | ./estagio2-portas.sh | column -t -s$'\t'
```

### Passo 4 — Estágio 3: fingerprint e consolidação

Escreva `estagio3-finger.sh` que:

1. Recebe `host<TAB>ip<TAB>porta<TAB>servico<TAB>fonte`.
2. Para portas 80/443/8000/8080, faz `curl -I` e identifica o servidor.
3. Consolida num TSV final, **deduplicado por host+porta**, com contagem de fontes.
4. Ordena por criticidade de porta.

Consolidação — o idioma que resolve as três operações de uma vez:

```bash
consolidar() {
    # Deduplica host+porta mantendo primeira ocorrência
    awk -F'\t' '!v{[$1":"$3]++}' "$1" \
      | awk -F'\t' '{ print $3"\t"$0 }' \
      | sort -rn -k1,1 \
      | cut -f2-
}
```

Saída final esperada: uma tabela com host, ip, porta, serviço detectado, origem — sem
repetição, ordenada com as portas mais críticas primeiro.

### Critérios de aceitação

- `./estagio1-coleta.sh -d dominio.local -w wordlist.txt` retorna exatamente 4 hosts.
- Os três estágios encadeiam por pipe sem arquivo intermediário.
- A saída do estágio 3 não tem duplicata de `host+porta`.
- Nenhum erro de rede aparece no stdout — só no stderr.
- Código de saída `0` quando há descoberta, `1` quando não há.
- `shellcheck` limpo nos três scripts.

### Limpeza

```bash
docker rm -f web1 web2 dns-lab 2>/dev/null || true
docker network rm net5
# Remova as linhas de laboratório que você acrescentou em /etc/hosts
```

---

## Avaliação

1. Por que cada estágio do pipeline deve escrever em stdout num formato único e estável?
2. Qual a diferença entre `awk '!visto[$0]++'` e `sort | uniq`? Quando cada um é a escolha certa?
3. Por que `timeout` retorna código `124` e por que você deve tratá-lo separado de uma falha
   normal da ferramenta?
4. Em qual situação um CNAME é um achado relevante que o A record esconde?
5. Descreva três razões pelas quais usar um resolvedor público para 50.000 consultas é uma má
   ideia — tanto técnica quanto ética.
6. Como a contagem de fontes independentes serve como heurística de priorização? Que limitação
   essa heurística tem?
7. Você recebe uma wordlist de 100.000 nomes e um escopo de um único domínio. Descreva o pipeline
   que você monta, os limites de concorrência que escolhe, e como prova para o cliente que você
   ficou dentro do escopo.

---

**Próximo:** [Módulo 6 — Scanning, fuzzing e relatório](modulo-06.md)
