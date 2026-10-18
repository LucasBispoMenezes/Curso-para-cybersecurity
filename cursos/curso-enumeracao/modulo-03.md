# Módulo 3 — Certificado como Fonte de Host

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Entender por que o certificado é a fonte de host **mais completa** que existe.
2. Usar CT logs e a API do `crt.sh` com filtro.
3. Encontrar host que **não está no DNS** — a categoria mais valiosa.
4. Reconhecer padrão de emissão e o que ele revela.
5. Cruzar certificado com DNS e com ASN.

---

## ⚠ Conduta

⚠ **Toda consulta é ao `crt.sh` — a fonte pública — e nunca ao domínio do alvo.** Você consulta o
**log público de certificado**, não a infraestrutura de ninguém.

⚠ **A regra do módulo:** consulta passiva. **Nenhuma conexão ao host analisado**, nenhum
`openssl s_client` contra o alvo. Você lê o que **terceiro já publicou**.

---

## 3.1 Por que o certificado é a melhor fonte

⚠ **A razão é estrutural, e vale entender antes de usar.**

```
TLS exige certificado
        │
        ▼
Certificado é assinado por uma CA
        │
        ▼
CA é obrigada a registrar o certificado em LOG PÚBLICO (Certificate Transparency)
        │
        ▼
O log contém TODOS os nomes que o certificado cobre (SAN)
        │
        ▼
⚠ VOCÊ TEM A LISTA DE NOMES DA ORGANIZAÇÃO — de graça, sem tocar em nada
```

⚠ **Compare os métodos:**

| Método | Cobertura | Custo | Precisa autorização? |
|---|---|---|---|
| Brute force | **Parcial** — depende da wordlist | 2,8 h para 50.000 nomes | Sim |
| Fonte passiva (OSINT) | Baixa | Instantâneo | Não |
| **CT log** | **Quase completa** | **Segundos** | **Não** — é log público |

⚠ **A última coluna é o ponto:** a CT log é um **log público obrigatório**. Consultá-la é ler dado
que o mundo publica por exigência regulatória. **É a fonte passiva mais produtiva que existe.**

⚠ **E o motivo pelo qual a lista é quase completa:** para o certificado funcionar, ele precisa
**listar todos os nomes** que cobre. A organização não pode emitir certificado para um nome sem
colocá-lo no SAN — e o SAN vai para o log.

---

## 3.2 Consultando o CT log

```bash
cd ~/enum-lab
mkdir -p lab3 && cd lab3

ALVO=""   # ← o seu domínio

if [ -z "$ALVO" ]; then
    echo "⚠ defina ALVO"
else
    echo "═══ 1. todos os certificados do domínio ═══"
    curl -s --max-time 30 "https://crt.sh/?q=${ALVO}&output=json" | \
        jq -r '.[] | [.common_name, .issuer_name, .not_before] | @tsv' 2>/dev/null | \
        sort -u | head -20

    echo
    echo "═══ 2. nomes cobertos (SAN) — o pivô principal ═══"
    curl -s --max-time 30 "https://crt.sh/?q=%25.${ALVO}&output=json" | \
        jq -r '.[].name_value' 2>/dev/null | tr '\n' '\n' | sort -u | head -30
fi
```

⚠ **Note o `%25` na segunda consulta.** É o `%` codificado — ele faz busca por **subdomínio
curinga**, e é o que transforma "certificado de um domínio" em "todos os nomes da organização".

### Os filtros que economizam tempo

| Parâmetro | Efeito |
|---|---|
| `q=exemplo.com` | Certificados **com** esse nome |
| `q=%.exemplo.com` | Nomes que **terminam** com isso (subdomínio) |
| `q=%.exemplo.com&exclude=expired` | **Exclui expirados** |
| `q=%.exemplo.com&exclude=wildcards` | Exclui curinga |
| `exclude=ca` | Exclui certificado de CA |
| `output=json` | Formato para `jq` |

⚠ **`exclude=expired` é o filtro mais útil.** Sem ele, você recebe anos de certificado expirado, e
a lista vira ruído.

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ nomes VÁLIDOS, sem curinga ═══"
    curl -s --max-time 30 \
      "https://crt.sh/?q=%25.${ALVO}&output=json&exclude=expired&exclude=wildcards" | \
      jq -r '.[].name_value' 2>/dev/null | tr ',' '\n' | sort -u > nomes-ct.txt

    wc -l < nomes-ct.txt
    head -30 nomes-ct.txt

    echo
    echo "═══ emissores distintos ═══"
    curl -s --max-time 30 "https://crt.sh/?q=${ALVO}&output=json" | \
        jq -r '.[].issuer_name' 2>/dev/null | sort | uniq -c | sort -rn | head -6
fi
```

⚠ **Note o `tr ',' '\n'`.** O campo `name_value` às vezes traz **vários nomes separados por
vírgula** — e sem o `tr`, você perde todos menos o primeiro. **É o erro mais comum de quem usa a
API do `crt.sh`.**

⚠ **E a contagem de emissores revela o padrão.** Um domínio com **muitos emissores** diferentes é
fragmentado — cada equipe emite o seu. Um com **um emissor só** é centralizado.

---

## 3.3 A categoria mais valiosa: host que **não** está no DNS

⚠ **Este é o achado que justifica o módulo.**

```
CT log diz:  api.internal.exemplo.com  (certificado emitido em 2024)
DNS diz:     ⚠ NXDOMAIN — o nome não resolve
        │
        ▼
O QUE ISSO SIGNIFICA?

1. O nome existiu e foi removido do DNS — mas o certificado continua válido
2. O nome é interno e o DNS público não o tem
3. O nome aponta para serviço de terceiro que foi desativado
4. O nome nunca esteve no DNS público — só no certificado (raro, mas acontece)
```

⚠ **A categoria 3 é a mais perigosa: é o take-over.** O certificado existe, o nome está em CT log,
e o serviço de destino **não existe mais**. Quem reivindicar o destino, controla o subdomínio.

```bash
ALVO=""

if [ -n "$ALVO" ] && [ -f nomes-ct.txt ]; then
    echo "═══ cruzando CT log com DNS ═══"
    echo
    printf '%-45s %-18s %s\n' "NOME (do CT log)" "RESOLVE?" "OBSERVAÇÃO"
    printf '%-45s %-18s %s\n' "─────────────────" "────────" "──────────"

    while IFS= read -r nome; do
        [ -z "$nome" ] && continue
        nome=$(printf '%s' "$nome" | sed 's/^\*\.//' | tr -d ' ')

        ip=$(dig +short A "$nome" 2>/dev/null | head -1)
        cname=$(dig +short CNAME "$nome" 2>/dev/null | head -1)

        if [ -n "$ip" ]; then
            printf '%-45s %-18s %s\n' "$nome" "sim" "${ip}"
        elif [ -n "$cname" ]; then
            printf '%-45s %-18s %s\n' "$nome" "CNAME" "⚠ ${cname}"
        else
            printf '%-45s %-18s %s\n' "$nome" "NÃO" "⚠ no CT log, fora do DNS"
        fi
    done < nomes-ct.txt | head -40
fi
```

⚠ **A linha "CNAME" com `⚠` é a mais valiosa da saída.** Um nome que resolve apenas como CNAME
aponta para **terceiro** — e é o candidato a take-over.

⚠ **A linha "NÃO" também é achado.** Nome que existe no certificado e não existe no DNS é
**histórico** — e pode indicar ambiente que foi desativado, ou que ainda existe internamente.

**Produza `ct-vs-dns.md`:**

| Nome (CT log) | Resolve? | CNAME? | Classificação |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

⚠ **A coluna "classificação" tem quatro valores possíveis:**

| Classificação | Significado | Prioridade |
|---|---|---|
| **Ativo** | Resolve para IP | Baixa |
| **CNAME para terceiro** | Aponta para serviço externo | **Alta** |
| **No CT log, fora do DNS** | Histórico ou interno | Média |
| **Nunca existiu no DNS** | Raro — investigar | Baixa |

**Responda:**

1. **Quantos nomes estão no CT log e fora do DNS?**
2. Quantos resolvem por CNAME? **Para quais terceiros?**
3. Algum CNAME aponta para serviço que parece **desativado**?
4. **Qual nome é o candidato a take-over** mais provável? Como você confirmaria?

⚠ **A resposta 4 é o exercício do módulo 6.** Confirmar take-over exige testar se o nome de destino
está **disponível** — e isso é uma **reivindicação**, que só se faz em alvo próprio ou autorizado.
**Aqui, você identifica o candidato; a confirmação é o módulo 6.**

---

## 3.4 Padrão de emissão

⚠ **O certificado revela o padrão de operação da organização.**

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ emissores ═══"
    curl -s --max-time 30 "https://crt.sh/?q=%25.${ALVO}&output=json&exclude=expired" | \
        jq -r '.[].issuer_name' 2>/dev/null | \
        sed 's/.*O=\([^,]*\).*/\1/' | sort | uniq -c | sort -rn | head -8

    echo
    echo "═══ validade (dias) ═══"
    curl -s --max-time 30 "https://crt.sh/?q=%25.${ALVO}&output=json&exclude=expired" | \
        jq -r '.[] | [.not_before, .not_after] | @tsv' 2>/dev/null | \
        head -5 | while IFS=$'\t' read -r antes depois; do
            python3 -c "
from datetime import datetime as dt
a = dt.fromisoformat('${antes}'.replace('Z','+00:00'))
b = dt.fromisoformat('${depois}'.replace('Z','+00:00'))
print(f'  {a.date()} até {b.date()}  = {(b-a).days} dias')
" 2>/dev/null
        done
fi
```

### O que cada padrão revela

| Padrão | O que significa |
|---|---|
| **Um emissor só (Let's Encrypt)** | Automação centralizada — maturidade de DevOps |
| **Muitos emissores diferentes** | Equipes independentes, sem padrão |
| **CA paga** | Processo formal, ou exigência de compliance |
| **Validade longa (365+ dias)** | Emissão manual, com renovação anual |
| **Validade curta (90 dias)** | **Automação** (ACME/Let's Encrypt) |
| **Muitos nomes por certificado** | Infraestrutura organizada, um certificado para vários hosts |
| **Um nome por certificado** | Emissão por host, possivelmente manual |
| **Emissão em lote na mesma data** | Provisionamento automatizado |
| **Nomes com padrão previsível** | Convenção interna documentada |

⚠ **A última linha é a mais útil para enumeração.** Se os nomes seguem um padrão
(`api-PAIS.exemplo.com`, `PROJETO-dev.exemplo.com`), você pode **gerar nomes** que ainda não
apareceram — e testá-los. **É a enumeração dirigida por padrão, e é legítima.**

```bash
ALVO=""

if [ -n "$ALVO" ] && [ -f nomes-ct.txt ]; then
    echo "═══ padrões de nome ═══"
    echo

    echo "── prefixos mais comuns ──"
    sed 's/^[^.]*\.//' nomes-ct.txt | head -1 > /dev/null

    awk -F. '{print $1}' nomes-ct.txt | \
        sed -E 's/[0-9]+/N/g; s/-[a-z]{2}$/-PAIS/g' | \
        sort | uniq -c | sort -rn | head -12

    echo
    echo "── com separador ──"
    grep -c -- '-' nomes-ct.txt | xargs echo "  nomes com hífen:"
    grep -c -- '\.' nomes-ct.txt | xargs echo "  nomes com ponto:"
fi
```

⚠ **A normalização `s/[0-9]+/N/g` é o truque.** Ela agrupa `api-01`, `api-02`, `api-03` no mesmo
padrão `api-N` — e revela a convenção. **Sem isso, cada nome parece único e o padrão some.**

⚠ **E `s/-[a-z]{2}$/-PAIS/g`** agrupa `api-br`, `api-de`, `api-us` em `api-PAIS`. **Um padrão
regional revela presença geográfica** — que é informação, e que gera pergunta (o módulo 5).

**Produza `padrao.md`:**

| Padrão observado | Quantos nomes | O que revela | Nome que eu poderia gerar |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. Qual o **padrão dominante** de nome? Descreva em uma frase.
2. Quantos emissores diferentes? O que isso diz sobre a organização?
3. A validade é curta (automação) ou longa (manual)?
4. **Que nomes você geraria** a partir do padrão? Liste cinco.

⚠ **A resposta 4 é enumeração dirigida por padrão.** Você não está chutando — está derivando de um
padrão **observado e público**. **E testar cinco nomes derivados é uma consulta, não uma varredura.**

---

## 3.5 LAB — CT log completo

**Duração:** 120 min

### Passo 1 — Coleta (30 min)

```bash
cd ~/enum-lab/lab3
ALVO=""

if [ -z "$ALVO" ]; then
    echo "⚠ defina ALVO — domínio próprio ou escopo público declarado"
else
    # 1. todos os nomes, sem expirado, sem curinga
    curl -s --max-time 30 \
      "https://crt.sh/?q=%25.${ALVO}&output=json&exclude=expired&exclude=wildcards" | \
      jq -r '.[].name_value' 2>/dev/null | tr ',' '\n' | \
      sed 's/^\*\.//;s/^ *//;s/ *$//' | grep -v '^$' | sort -u > nomes-ct.txt

    echo "nomes no CT log: $(wc -l < nomes-ct.txt)"
    echo
    head -20 nomes-ct.txt

    # 2. metadados
    curl -s --max-time 30 "https://crt.sh/?q=%25.${ALVO}&output=json&exclude=expired" | \
      jq -r '.[] | [.common_name, .issuer_name, .not_before, .not_after] | @tsv' 2>/dev/null | \
      sort -u > certs.tsv

    echo
    echo "certificados: $(wc -l < certs.tsv)"
fi
```

Produza `coleta.md`:

| Métrica | Valor |
|---|---|
| Nomes no CT log | |
| Certificados válidos | |
| Emissores distintos | |
| Data da consulta | |

**Responda:**

1. Quantos nomes o CT log revelou?
2. Isso é **mais** ou **menos** que o brute force do módulo 2 acharia em 15 nomes?
3. Quantos emissores? Qual o dominante?
4. **Nenhuma conexão ao alvo foi feita?** Confirme.

### Passo 2 — Cruze com DNS (40 min)

```bash
cd ~/enum-lab/lab3

cat > cruza.sh <<'SCRIPT'
#!/usr/bin/env bash
# Cruza nomes do CT log com o DNS. Respeita 5 rps.
set -uo pipefail

ARQ="${1:?informe o arquivo de nomes}"
RPS="${2:-5}"
INTERVALO=$(awk -v r="$RPS" 'BEGIN{printf "%.3f", 1/r}')

printf '%-48s %-10s %s\n' "NOME" "RESOLVE" "DETALHE"
printf '%-48s %-10s %s\n' "────────────────────────────────────────────────" "───────" "───────"

ativos=0; cnames=0; mortos=0

while IFS= read -r nome; do
    [ -z "$nome" ] && continue

    ip=$(dig +short +time=3 +tries=1 A "$nome" 2>/dev/null | head -1)

    if [ -n "$ip" ]; then
        printf '%-48s %-10s %s\n' "$nome" "A" "$ip"
        ativos=$((ativos+1))
    else
        cn=$(dig +short +time=3 +tries=1 CNAME "$nome" 2>/dev/null | head -1 | sed 's/\.$//')
        if [ -n "$cn" ]; then
            printf '%-48s %-10s %s\n' "$nome" "CNAME" "⚠ ${cn}"
            cnames=$((cnames+1))
        else
            printf '%-48s %-10s %s\n' "$nome" "NÃO" "⚠ CT log sem DNS"
            mortos=$((mortos+1))
        fi
    fi

    sleep "$INTERVALO"
done < "$ARQ"

printf '\nA=%d  CNAME=%d  SEM-DNS=%d  total=%d\n' \
    "$ativos" "$cnames" "$mortos" "$((ativos+cnames+mortos))" >&2
SCRIPT
chmod +x cruza.sh

[ -f nomes-ct.txt ] && ./cruza.sh nomes-ct.txt 5 2>&1 | tee cruzamento.txt | head -40
```

Produza `cruzamento.md`:

| Métrica | Valor |
|---|---|
| Nomes com `A` | |
| Nomes com **`CNAME`** | |
| Nomes **sem DNS** | |
| Total | |

**Responda:**

1. **Quantos nomes estão no CT log e fora do DNS?** Isso é achado de quê?
2. Quantos apontam por CNAME? **Para quais terceiros?**
3. Entre os CNAME, algum aponta para serviço que parece **desativado**?
4. **Qual é o candidato a take-over mais forte?** Justifique.

### Passo 3 — Padrão e geração dirigida (30 min)

```bash
cd ~/enum-lab/lab3

if [ -f nomes-ct.txt ]; then
    echo "═══ padrões ═══"
    awk -F. '{print $1}' nomes-ct.txt | \
        sed -E 's/[0-9]+/N/g' | sort | uniq -c | sort -rn | head -15

    echo
    echo "═══ sufixos regionais ═══"
    grep -oE '\-[a-z]{2}\.' nomes-ct.txt | sort | uniq -c | sort -rn | head

    echo
    echo "═══ subdomínios de 2º nível ═══"
    awk -F. 'NF>=4 {print $(NF-3)}' nomes-ct.txt | sort | uniq -c | sort -rn | head
fi
```

Produza `gerados.md`:

| Padrão observado | Fórmula | Nomes que eu geraria | Justificativa |
|---|---|---|---|
| | | | |
| | | | |

⚠ **Teste apenas os nomes que você derivou — cinco ou dez, não mil.** É consulta dirigida por
hipótese, não varredura.

```bash
ALVO=""
if [ -n "$ALVO" ]; then
    echo "═══ testando nomes derivados do padrão ═══"
    for nome in api-staging.exemplo.com; do   # ← substitua pelos SEUS derivados
        printf '%-48s ' "$nome"
        dig +short +time=3 +tries=1 A "$nome" 2>/dev/null | head -1 | \
            grep -q . && echo "⚠ RESOLVE" || echo "não resolve"
        sleep 0.3
    done
fi
```

**Responda:**

1. **Quantos nomes derivados** você testou? Quantos resolveram?
2. Um nome derivado que **resolve mas não está no CT log** é achado de quê? (Dica: certificado
   curinga, ou host sem TLS.)
3. Por que testar **cinco** nomes derivados é legítimo e **cinco mil** não é?
4. **O padrão que você achou geraria quantos nomes possíveis?** Estime.

⚠ **A resposta 3 é a linha do módulo.** Derivar cinco nomes de um padrão público é **hipótese
dirigida**. Gerar cinco mil combinações é **varredura** — e é onde a enumeração vira abuso.

### Passo 4 — O relatório (20 min)

Produza `relatorio-ct.md`:

```markdown
# Certificado como fonte de host — [alvo]

## 1. Método
[o que você consultou, como, quando]

## 2. Resultado
| Métrica | Valor |
|---|---|
| Nomes no CT log | |
| Nomes que resolvem (A) | |
| Nomes com CNAME | |
| Nomes fora do DNS | |
| Emissores distintos | |

## 3. Achados
| Achado | Evidência | Severidade | Próxima pergunta |
|---|---|---|---|

## 4. Candidatos a investigar
| Nome | Por quê | O que confirmaria |

## 5. O que NÃO se pode concluir
⚠ Obrigatório, mínimo 3 itens

## 6. Consultas realizadas
| Data | Consulta | Fonte | Resultado |
```

**Os três itens obrigatórios da seção 5:**

- que o CT log **não** é prova de que o host existe **hoje** (certificado pode ser de 2024)
- que a ausência no CT log **não** significa que o nome não existe (certificado curinga cobre sem
  listar)
- que **não** foi feita nenhuma conexão ao alvo — a análise é integralmente passiva

### Critérios de aceitação

- `nomes-ct.txt` com o `tr ',' '\n'` aplicado — nomes **não truncados**.
- Você usou `exclude=expired` e explicou por que.
- `loja.md` com a contagem de emissores e a classificação do `SPF`.
- `cruzamento.md` com as **três** categorias separadas (A, CNAME, sem DNS).
- Você identificou **o candidato a take-over mais forte** e justificou.
- `padrao.md` com o padrão dominante descrito em uma frase.
- `gerados.md` com nomes **derivados do padrão**, e no máximo dez testados.
- Você explicou por que **cinco** nomes derivados é legítimo e cinco mil não.
- `relatorio-ct.md` com as **seis** seções e **três itens** na seção 5.
- ⚠ **Nenhuma conexão ao host analisado.** Só consulta ao `crt.sh`.

---

## Avaliação

1. Por que o certificado é a melhor fonte de host? Explique a cadeia estrutural.
2. Compare brute force e CT log em cobertura, custo e necessidade de autorização.
3. Por que a lista de nomes é "quase completa"? O que a torna incompleta?
4. Para que serve o `%25` na consulta ao `crt.sh`?
5. Por que `exclude=expired` é o filtro mais útil?
6. Por que é obrigatório o `tr ',' '\n'` sobre `name_value`?
7. Quais as **três** categorias de nome, ao cruzar CT log com DNS?
8. **Por que o nome com CNAME é a categoria mais valiosa?**
9. O que significa um nome no CT log que **não** resolve no DNS? Cite três causas.
10. O que a **validade do certificado** revela sobre a organização?
11. O que a **quantidade de emissores** revela?
12. Como você deriva nomes a partir de padrão, e por que isso é legítimo?
13. **Por que derivar cinco nomes é hipótese e gerar cinco mil é varredura?**
14. Cite três coisas que o CT log **não** permite concluir.

---

**Próximo:** [Módulo 4 — Superfície esquecida](modulo-04.md)
