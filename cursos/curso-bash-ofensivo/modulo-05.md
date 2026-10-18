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

**NOTA** Em engajamento real, **use resolvedor local** (`dnsmasq`, `unbound`) ou o resolvedor
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

**NOTA** `${var,,}` converte para minúsculas (bash 4+). Combinado com comparação por `*substring*`,
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

**NOTA** Exemplificativo. Em engajamento real a criticidade depende do escopo, do ativo, do
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
```

Para um DNS de laboratório sem infraestrutura pesada, use um container dedicado:

```bash
# Zona DNS do laboratório
mkdir -p dns

cat > dns/named.conf <<'EOF'
options {
    directory "/var/cache/bind";
    listen-on { any; };
    listen-on-v6 { none; };
    recursion no;
};
zone "dominio.local" IN {
    type master;
    file "/etc/bind/dominio.local.zone";
};
EOF

cat > dns/dominio.local.zone <<'EOF'
$TTL 60
@   IN  SOA ns.dominio.local. admin.dominio.local. (
        2026101801 3600 600 86400 60 )
@   IN  NS  ns.dominio.local.
ns      IN  A   172.31.0.53
web1    IN  A   172.31.0.10
api     IN  A   172.31.0.10
web2    IN  A   172.31.0.11
painel  IN  A   172.31.0.11
EOF

docker run -d --name dns-lab --network net5 --ip 172.31.0.53 \
  -p 5353:53/udp -p 5353:53/tcp \
  -v "$PWD/dns/named.conf:/etc/bind/named.conf:ro" \
  -v "$PWD/dns/dominio.local.zone:/etc/bind/dominio.local.zone:ro" \
  internetsystemsconsortium/bind9:9.18 >/dev/null

sleep 3

# PROVA de que o DNS funciona
dig +short @172.31.0.53 web1.dominio.local    # -> 172.31.0.10
dig +short @172.31.0.53 api.dominio.local     # -> 172.31.0.10
dig +short @172.31.0.53 painel.dominio.local  # -> 172.31.0.11
```

⚠ **O host do aluno não é alterado.** Este lab **não** mexe em `/etc/resolv.conf` nem em
`/etc/hosts` da sua máquina. A resolução acontece **dentro da rede do laboratório**.

```bash
# Container auxiliar de resolução (opcional — útil para testes manuais)
docker run -d --name dns-cli --network net5 --ip 172.31.0.200 \
  --dns 172.31.0.53 alpine sleep 3600 >/dev/null

sleep 2

docker exec dns-cli getent hosts web1.dominio.local    # -> 172.31.0.10
docker exec dns-cli getent hosts painel.dominio.local  # -> 172.31.0.11
```

Para consultar do host sem alterar configuração nenhuma:
`dig +short @127.0.0.1 -p 5353 web1.dominio.local`

### Passo 2 — Estágio 1: coleta

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
    # Usa dig apontando para o DNS do lab (porta publicada no host)
    ip=$(dig +short @127.0.0.1 -p 5353 A "${nome}" 2>/dev/null \
         | grep -E '^[0-9]+\.' | head -n 1)
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

Você deve encontrar exatamente 4 nomes: `api`, `painel`, `web1`, `web2`.

### Passo 3 — Estágio 2: enriquecimento

```bash
cat > estagio2-portas.sh <<'EOF'
#!/usr/bin/env bash
#
# estagio2-portas.sh — recebe host\tip\tfonte e testa portas comuns
# Uso: ./estagio1-coleta.sh ... | ./estagio2-portas.sh
#
set -euo pipefail

JOBS="${JOBS:-20}"
PORTAS=(80 443 22 8080 8000)

testar_porta() {
    local host="$1" ip="$2" porta="$3"
    if timeout 1 bash -c "echo >/dev/tcp/${ip}/${porta}" 2>/dev/null; then
        local servico
        case "${porta}" in
            80|8080|8000) servico="http" ;;
            443)          servico="https" ;;
            22)           servico="ssh" ;;
            *)            servico="unknown" ;;
        esac
        printf '%s\t%s\t%s\t%s\tdns\n' "${host}" "${ip}" "${porta}" "${servico}"
    fi
    return 0
}
export -f testar_porta

while IFS=$'\t' read -r host ip fonte || [[ -n "${host:-}" ]]; do
    [[ -z "${host}" || "${host}" =~ ^# ]] && continue
    for p in "${PORTAS[@]}"; do
        printf '%s\t%s\t%s\n' "${host}" "${ip}" "${p}"
    done
done | xargs -P "${JOBS}" -n 3 bash -c 'testar_porta "$1" "$2" "$3"' _
EOF
chmod +x estagio2-portas.sh
```

Teste:

```bash
./estagio1-coleta.sh -d dominio.local -w wordlist.txt \
  | ./estagio2-portas.sh | column -t -s$'\t'
```

### Passo 4 — Estágio 3: fingerprint e consolidação

```bash
cat > estagio3-finger.sh <<'EOF'
#!/usr/bin/env bash
#
# estagio3-finger.sh — fingerprint + deduplicação + priorização
# Uso: ... | ./estagio2-portas.sh | ./estagio3-finger.sh
#
set -euo pipefail

fingerprint() {
    local host="$1" ip="$2" porta="$3" servico="$4" fonte="$5"
    local url server

    case "${porta}" in
        80|8080|8000) url="http://${ip}:${porta}/" ;;
        443)          url="https://${ip}/" ;;
        *)
            printf '%s\t%s\t%s\t%s\t%s\t-\n' \
                "${host}" "${ip}" "${porta}" "${servico}" "${fonte}"
            return 0
            ;;
    esac

    server=$(curl -sS -I -k -L --connect-timeout 2 --max-time 5 "${url}" 2>/dev/null \
             | awk -F': ' 'tolower($1)=="server"{print $2; exit}' || true)
    server="${server:--}"

    printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
        "${host}" "${ip}" "${porta}" "${servico}" "${fonte}" "${server}"
}
export -f fingerprint

printf 'host\tip\tporta\tservico\tfonte\tserver\n'

tmp=$(mktemp)
trap 'rm -f "${tmp}"' EXIT

while IFS=$'\t' read -r host ip porta servico fonte || [[ -n "${host:-}" ]]; do
    [[ -z "${host}" || "${host}" == "host" ]] && continue
    fingerprint "${host}" "${ip}" "${porta}" "${servico}" "${fonte}"
done > "${tmp}"

# Deduplica por host+porta e ordena por criticidade
awk -F'\t' '
    BEGIN {
        score[22]=9; score[3306]=10; score[5432]=10; score[6379]=9
        score[80]=3; score[443]=3; score[8080]=4; score[8000]=4
    }
    NR==1 { next }
    {
        chave = $1 SUBSEP $3
        if (!(chave in visto)) {
            visto[chave] = 1
            s = ($3 in score) ? score[$3] : 1
            print s "\t" $0
        }
    }
' "${tmp}" \
  | sort -rn -k1,1 \
  | cut -f2-
EOF
chmod +x estagio3-finger.sh
```

Pipeline completo:

```bash
./estagio1-coleta.sh -d dominio.local -w wordlist.txt \
  | ./estagio2-portas.sh \
  | ./estagio3-finger.sh | column -t -s$'\t'
```

### Critérios de aceitação

- `./estagio1-coleta.sh -d dominio.local -w wordlist.txt` retorna exatamente 4 hosts.
- Os três estágios encadeiam por pipe sem arquivo intermediário.
- A saída do estágio 3 não tem duplicata de `host+porta`.
- Nenhum erro de rede aparece no stdout — só no stderr.
- Código de saída `0` quando há descoberta.
- `shellcheck` limpo nos três scripts (avisos de `export -f` / `xargs` são aceitáveis).

### Limpeza

```bash
docker rm -f web1 web2 dns-lab dns-cli 2>/dev/null || true
docker network rm net5 2>/dev/null || true
# Não é necessário mexer em /etc/hosts — o lab não altera o host
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
```