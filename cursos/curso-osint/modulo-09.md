# Módulo 9 — Ferramentas e Linha de Comando

**Carga:** 3 horas (45 min teoria · 2h15 lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Escolher a ferramenta certa para cada tipo de dado, sem decorar lista.
2. Usar `whois`, `dig`, `curl`, `jq`, `exiftool` de forma combinada.
3. Escrever script de coleta que **respeite** o serviço consultado.
4. Reconhecer quando automatizar é **errado**.
5. Montar um kit de linha de comando reutilizável.

---

## ⚠ Conduta — a linha técnica deste módulo

⚠ **Automação é onde a linha fica mais técnica.** Um script pode consultar 10.000 vezes em um
minuto — e isso tem nome.

| Você pode | Você **não pode** |
|---|---|
| Consultar API pública dentro do limite dela | Ignorar `robots.txt` ou termo de uso |
| Automatizar coleta em **fonte sua** | Sobrecarregar serviço de terceiro |
| Respeitar rate limit | Contornar rate limit |
| Usar API com chave própria | Usar API de forma que viole o contrato |
| Baixar o que é oferecido para download | Fazer scraping agressivo de site alheio |

⚠ **"Sobrecarregar serviço" não é detalhe técnico — é negação de serviço.** Um script mal feito
contra site pequeno derruba o site. O Módulo 10 trata isso como questão legal.

⚠ **Sujeito:** dado seu, de empresa pública, ou do curso. Nunca pessoa.

---

## 9.1 Escolher a ferramenta — o critério

Não é lista, é **critério**. Pergunte: **que tipo de dado eu tenho?**

| Tipo de dado | Classe de ferramenta | O que usar |
|---|---|---|
| Domínio, IP, ASN | Consulta de registro | `whois`, `dig`, `whois.cymru.com` |
| Certificado | Transparência | `crt.sh` (API), `openssl` em arquivo |
| HTTP / API | Requisição | `curl`, `wget` |
| JSON | Processamento | `jq` |
| Imagem, documento | Metadado | `exiftool` |
| Vídeo | Extração de quadro | `ffmpeg`, `ffprobe` |
| Arquivo grande | Filtro | `grep`, `awk`, `sort`, `uniq` |
| Histórico de página | Arquivo morto | CDX API |
| Conteúdo indexado | Busca | Operador (Módulo 3) |

⚠ **A regra que evita 80% do trabalho inútil:** **se existe API, use a API.** Ela é feita para
consulta automatizada, tem formato estável e limite declarado. *Scraping* de HTML quebra quando o
site muda e não tem permissão implícita.

---

## 9.2 O kit essencial

### Consulta de registro e rede

```bash
mkdir -p ~/osint-lab/lab9 && cd ~/osint-lab/lab9

# Whois com extração dos campos que importam
consulta_whois() {
    local alvo="$1"
    whois "$alvo" 2>/dev/null | grep -iE \
        'domain name|registrar:|creation date|created|updated|expiry|expiration|'\
'name server|registrant|org|country|inetnum|netname|orgname' | head -25
}
consulta_whois "exemplo.com"

# DNS estruturado
consulta_dns() {
    local d="$1" r
    for r in NS A AAAA MX TXT CAA SOA; do
        printf '%-6s ' "$r"
        dig +short "$r" "$d" 2>/dev/null | tr '\n' ' ' | head -c 200
        echo
    done
}
consulta_dns "exemplo.com"

# ASN de um IP
asn_de() {
    whois -h whois.cymru.com " -v ${1}" 2>/dev/null | tail -1
}
asn_de "1.1.1.1"
```

### Transparência de certificado

```bash
# Nomes cobertos por certificado (o pivô do Módulo 7)
cert_nomes() {
    local d="$1"
    curl -s --max-time 20 "https://crt.sh/?q=%25.${d}&output=json" 2>/dev/null | \
      jq -r '.[].name_value' 2>/dev/null | sort -u
}
cert_nomes "exemplo.com" | head -20

# Emissores
cert_emissores() {
    curl -s --max-time 20 "https://crt.sh/?q=${1}&output=json" 2>/dev/null | \
      jq -r '.[].issuer_name' 2>/dev/null | sort -u
}
cert_emissores "exemplo.com"
```

### Metadado

```bash
# Resumo de metadado relevante
meta_resumo() {
    exiftool -s -s -s \
      -GPSLatitude -GPSLongitude -DateTimeOriginal \
      -Make -Model -SerialNumber -Software -Artist \
      "$1" 2>/dev/null
}
meta_resumo "foto.jpg"

# Varredura em lote, só o que tem GPS
find . -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' \) 2>/dev/null | \
  while read -r f; do
      gps=$(exiftool -s -s -s -GPSLatitude "$f" 2>/dev/null)
      [ -n "$gps" ] && echo "GPS: $f → $gps"
  done | head -20
```

### Arquivo morto

```bash
# URLs que não existem mais
cdx_removidas() {
    curl -s --max-time 30 \
      "http://web.archive.org/cdx/search/cdx?url=${1}*&output=json&filter=statuscode:404&collapse=urlkey&limit=200" 2>/dev/null | \
      jq -r '.[] | .[2]' 2>/dev/null | sort -u
}
cdx_removidas "exemplo.gov.br" | head -20

# Todas as capturas de um caminho, ao longo do tempo
cdx_timeline() {
    curl -s --max-time 30 \
      "http://web.archive.org/cdx/search/cdx?url=${1}&output=json" 2>/dev/null | \
      jq -r '.[] | [.[1], .[2]] | @tsv' 2>/dev/null
}
cdx_timeline "exemplo.gov.br/pagina.html"
```

---

## 9.3 Coleta que respeita o serviço

⚠ **Este é o conteúdo importante do módulo.** Um script de OSINT que derruba o serviço consultado
não é ferramenta — é incidente.

```bash
cat > coleta-responsavel.sh <<'SCRIPT'
#!/usr/bin/env bash
#
# coleta-responsavel.sh — padrão de coleta que respeita o serviço
#
set -euo pipefail

# ── Parâmetros conservadores ────────────────────────────────────────
INTERVALO="${INTERVALO:-2}"      # segundos entre requisições
MAX="${MAX:-50}"                 # máximo de itens por execução
TIMEOUT="${TIMEOUT:-20}"         # timeout por requisição
UA="OSINT-research/1.0 (contato: seu@email)"   # ← identifique-se

requisita() {
    local url="$1"
    curl -s --max-time "${TIMEOUT}" \
         -H "User-Agent: ${UA}" \
         "$url"
}

log() { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*" >&2; }

# Exemplo: consultar uma lista de domínios, com pausa entre cada
coleta() {
    local arquivo="$1" i=0

    while IFS= read -r alvo; do
        [ -z "${alvo}" ] && continue
        [[ "${alvo}" == \#* ]] && continue

        i=$((i + 1))
        if (( i > MAX )); then
            log "limite de ${MAX} atingido — parando"
            break
        fi

        log "[${i}/${MAX}] consultando ${alvo}"
        # Sua consulta aqui, com o UA e o timeout
        requesita "https://exemplo-api/public?q=${alvo}" | jq -c '.' 2>/dev/null || true

        sleep "${INTERVALO}"     # ← o que respeita o serviço
    done < "${arquivo}"
}

# coleta alvos.txt
SCRIPT
chmod +x coleta-responsavel.sh
```

### As cinco regras da coleta responsável

| # | Regra | Por quê |
|---|---|---|
| 1 | **Identifique-se no `User-Agent`** | Administrador precisa saber quem você é |
| 2 | **Respeite o `robots.txt`** | É declaração de vontade do operador |
| 3 | **Ponha intervalo entre requisições** | Não sobrecarregar |
| 4 | **Ponha limite máximo** | Script descontrolado é acidente |
| 5 | **Respeite `429` / `Retry-After`** | É o serviço pedindo para parar |

⚠ **A regra 5 é a mais importante e a mais ignorada.** Um `429 Too Many Requests` não é erro —
é **instrução**. Um script que ignora `429` é um script que insiste: isso é abuso, e é o
comportamento que administrador bloqueia.

```bash
# Tratando 429 corretamente
requisita_com_respeito() {
    local url="$1" tentativa=1 max=3 resp

    while (( tentativa <= max )); do
        resp=$(curl -s -w '\n%{http_code}' --max-time "${TIMEOUT}" \
                    -H "User-Agent: ${UA}" "$url")
        codigo=$(printf '%s' "$resp" | tail -1)
        corpo=$(printf '%s' "$resp" | sed '$d')

        case "${codigo}" in
            200) printf '%s\n' "${corpo}"; return 0 ;;
            429) log "429 — serviço pediu para parar; aguardando 60s"
                 sleep 60; tentativa=$((tentativa + 1)) ;;
            5*)  log "erro ${codigo} do serviço; aguardando 20s"
                 sleep 20; tentativa=$((tentativa + 1)) ;;
            404) log "não encontrado"; return 1 ;;
            *)   log "código inesperado: ${codigo}"; return 1 ;;
        esac
    done

    log "desisti após ${max} tentativas"
    return 1
}
```

---

## 9.4 Quando **não** automatizar

Igualmente importante, e menos discutido.

| Situação | Por que não automatizar |
|---|---|
| **Consulta única** | O script dá mais trabalho que a consulta |
| **Fonte sem API** | Scraping quebra, e viola termo |
| **Resultado ambíguo** | Julgamento humano é necessário |
| **Fonte que proíbe** | Termo é vinculante |
| **Dado sensível** | Automação tende a coletar demais |
| **Pessoa** | Automatizar investigação de pessoa é escalar risco |
| **Fonte pequena** | 100 consultas derrubam |

⚠ **A linha "dado sensível" é importante.** Automação **coleta mais** que o necessário — é da
natureza dela. Em investigação de pessoa, isso viola o teste de necessidade do Módulo 4 sem que
você perceba.

⚠ **E a linha "pessoa" merece ênfase:** **nenhuma ferramenta deste curso automatiza investigação
de pessoa.** Não é limitação técnica — é decisão.

---

## 9.5 LAB — Kit de linha de comando

**Duração:** 135 min

⚠ **Sujeito:** empresa ou entidade pública, mais a sua pegada. Nunca pessoa.

### Passo 1 — Construa o kit (45 min)

Produza `kit-osint.sh` com as funções do §9.2, e **as cinco regras** embutidas:

```bash
cat > kit-osint.sh <<'SCRIPT'
#!/usr/bin/env bash
#
# kit-osint.sh — kit de coleta para OSINT
# Respeita: User-Agent identificado, intervalo, limite, tratamento de 429
#
set -uo pipefail

INTERVALO="${INTERVALO:-2}"
LIMITE="${LIMITE:-30}"
TIMEOUT="${TIMEOUT:-20}"
UA="${UA:-OSINT-research/1.0 (contato: seu@email)}"

log() { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*" >&2; }

# ── 1. Registro de domínio ──────────────────────────────────────────
whois_resumo() {
    local a="${1:?informe o domínio}"
    whois "$a" 2>/dev/null | grep -iE \
      'domain name|registrar:|creation|created|updated|expiry|expiration|name server' | head -15
}

# ── 2. DNS estruturado ──────────────────────────────────────────────
dns_resumo() {
    local d="${1:?informe o domínio}" r
    for r in NS A AAAA MX TXT CAA; do
        printf '%-6s ' "$r"
        dig +short "$r" "$d" 2>/dev/null | tr '\n' ' ' | head -c 150
        echo
    done
}

# ── 3. ASN de um IP ─────────────────────────────────────────────────
asn() { whois -h whois.cymru.com " -v ${1:?informe o IP}" 2>/dev/null | tail -1; }

# ── 4. Nomes por certificado ────────────────────────────────────────
cert_nomes() {
    local d="${1:?informe o domínio}"
    curl -s --max-time "${TIMEOUT}" "https://crt.sh/?q=%25.${d}&output=json" 2>/dev/null | \
      jq -r '.[].name_value' 2>/dev/null | sort -u
}

# ── 5. Metadado ─────────────────────────────────────────────────────
meta() {
    exiftool -s -s -s -GPSLatitude -GPSLongitude -DateTimeOriginal \
      -Make -Model -SerialNumber -Software -Artist "${1:?informe o arquivo}" 2>/dev/null
}

# ── 6. CDX — URLs removidas ─────────────────────────────────────────
cdx_removidas() {
    local d="${1:?informe o domínio}"
    curl -s --max-time "${TIMEOUT}" \
      "http://web.archive.org/cdx/search/cdx?url=${d}*&output=json&filter=statuscode:404&collapse=urlkey&limit=${LIMITE}" 2>/dev/null | \
      jq -r '.[] | .[2]' 2>/dev/null | sort -u
}

# ── 7. Coleta em lote, com respeito ao serviço ──────────────────────
coleta_lote() {
    local arquivo="${1:?informe o arquivo}" i=0 alvo resp codigo corpo

    while IFS= read -r alvo; do
        alvo="${alvo%%#*}"; alvo="$(printf '%s' "$alvo" | xargs)"
        [ -z "${alvo}" ] && continue
        i=$((i + 1)); (( i > LIMITE )) && { log "limite atingido"; break; }

        log "[${i}/${LIMITE}] ${alvo}"
        resp=$(curl -s -w '\n%{http_code}' --max-time "${TIMEOUT}" \
                    -H "User-Agent: ${UA}" \
                    "https://crt.sh/?q=${alvo}&output=json" 2>/dev/null)
        codigo=$(printf '%s' "$resp" | tail -1)
        corpo=$(printf '%s' "$resp" | sed '$d')

        case "${codigo}" in
            200) printf '%s' "${corpo}" | jq -r '.[].name_value' 2>/dev/null | sort -u ;;
            429) log "429 — aguardando 60s"; sleep 60 ;;
            *)   log "código ${codigo}" ;;
        esac
        sleep "${INTERVALO}"      # ← respeita o serviço
    done < "${arquivo}"
}

# ── Uso ─────────────────────────────────────────────────────────────
case "${1:-}" in
    whois)  whois_resumo "${2:-}" ;;
    dns)    dns_resumo "${2:-}" ;;
    asn)    asn "${2:-}" ;;
    cert)   cert_nomes "${2:-}" ;;
    meta)   meta "${2:-}" ;;
    cdx)    cdx_removidas "${2:-}" ;;
    lote)   coleta_lote "${2:-}" ;;
    *) cat <<EOF
Uso: $0 <comando> [argumento]

  whois <domínio>     Registro de domínio, campos principais
  dns   <domínio>     NS, A, AAAA, MX, TXT, CAA
  asn   <ip>          ASN e organização do bloco
  cert  <domínio>     Nomes cobertos por certificado (pivô)
  meta  <arquivo>     Metadado de imagem ou documento
  cdx   <domínio>     URLs que não existem mais

Variáveis: INTERVALO (seg) LIMITE (nº) TIMEOUT (seg) UA (identificação)
EOF
    ;;
esac
SCRIPT
chmod +x kit-osint.sh

# Teste cada função
./kit-osint.sh dns exemplo.com
./kit-osint.sh whois exemplo.com | head -10
```

### Passo 2 — Teste e documente (40 min)

Produza `kit-teste.md`:

| Função | Testada? | Resultado | Tempo de resposta | Problema encontrado |
|---|---|---|---|---|
| `whois` | | | | |
| `dns` | | | | |
| `asn` | | | | |
| `cert` | | | | |
| `meta` | | | | |
| `cdx` | | | | |

**Responda:**

1. Qual função **falhou** ou retornou vazio? Por quê?
2. O `crt.sh` respondeu em quanto tempo? **Ele é rápido o bastante para consulta em lote?**
3. Qual função depende de **API de terceiro** e, portanto, pode parar de funcionar?
4. **O que aconteceria** se você removesse o `sleep` da função `coleta_lote`?

⚠ **A resposta 4 é o ponto de conduta:** sem o `sleep`, você faz requisição em rajada contra
serviço de terceiro — o que é abuso, e é o comportamento que faz o serviço bloquear pesquisador
legítimo.

### Passo 3 — Coleta em lote, com respeito (30 min)

⚠ **Alvo: lista de domínios de entidades públicas ou seus.** Você cria a lista.

```bash
cat > alvos.txt <<'EOF'
# Lista de domínios de entidades PÚBLICAS para o exercício
example.org
example.com
EOF

# Rode com limite baixo e intervalo alto
LIMITE=2 INTERVALO=5 ./kit-osint.sh lote alvos.txt > lote-saida.txt 2> lote-log.txt
echo "=== LOG ==="; cat lote-log.txt
echo "=== SAÍDA ==="; head -20 lote-saida.txt
```

**Responda:**

1. O log mostra **o intervalo** entre consultas? Confira os timestamps.
2. O `User-Agent` foi enviado? **Como você verificaria isso?**
3. Se o serviço retornasse `429`, o que o script faria? **Está correto?**
4. **Com intervalo de 5s e limite de 100**, quanto tempo levaria a execução? Isso é razoável?

### Passo 4 — Quando não automatizar (20 min)

Produza `nao-automatizar.md`:

| Situação | Automatizar? | Por quê | Alternativa |
|---|---|---|---|
| Consultar 1 domínio | | | |
| Consultar 500 domínios de lista pública | | | |
| Consultar dado de pessoa | | | |
| Baixar documento de site que proíbe | | | |
| Verificar 200 números de contraparte | | | |
| Consultar fonte que exige interação | | | |

**Responda:**

1. Em qual linha a resposta é **"não, nunca"**? Por quê?
2. Por que automação tende a **coletar mais que o necessário**? Que princípio isso viola?
3. Se a fonte **proíbe** automação, mas você consegue tecnicamente — o que você faz?
4. **Escreva a sua regra**: em uma frase, quando você **não** automatiza.

### Critérios de aceitação

- `kit-osint.sh` funcional, com **as cinco regras** embutidas (UA, intervalo, limite, `429`,
  `robots`).
- `kit-teste.md` com cada função testada e o resultado real.
- Você identificou a função que **depende de API de terceiro** e pode parar de funcionar.
- A coleta em lote rodou com **log mostrando o intervalo**.
- Você explicou o que aconteceria sem o `sleep` — e por que isso é abuso.
- `nao-automatizar.md` com a tabela e as quatro respostas.
- **A sua regra escrita** de quando não automatizar.
- ⚠ Nenhuma pessoa como alvo. Nenhum serviço sobrecarregado.

---

## Avaliação

1. Qual o critério para escolher a ferramenta? Por que "existe API, use a API" evita 80% do
   trabalho inútil?
2. Cite as cinco regras da coleta responsável e explique cada uma.
3. Por que identificar-se no `User-Agent` é parte da ética, e não da técnica?
4. O que `429` significa, e por que ignorá-lo é abuso?
5. Como você trata `429` corretamente? Escreva o raciocínio.
6. Por que `robots.txt` é vinculante mesmo sendo apenas uma convenção?
7. Cite quatro situações em que automatizar é **errado**. Justifique a mais importante.
8. Por que automação **tende a coletar mais** que o necessário? Que princípio isso viola?
9. Por que nenhuma ferramenta deste curso automatiza investigação de pessoa?
10. Qual das funções do kit depende de terceiro e pode parar de funcionar? O que você faz se
    parar?
11. Por que *scraping* de HTML é pior que API, em dois aspectos?
12. O que acontece, tecnicamente e legalmente, se um script remove o intervalo entre requisições?

---

**Próximo:** [Módulo 10 — Ética, legalidade e limites globais](modulo-10.md)
