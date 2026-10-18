# Módulo 2 — DNS Além do `A`

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Ler todos os tipos de registro e o que cada um revela.
2. Usar `TXT` como fonte de host, serviço e terceiro.
3. Detectar zona esquecida por `NS`, `SOA` e tentativa de `AXFR`.
4. Reconhecer wildcard e não confundir com subdomínio real.
5. Fazer brute force **com limite**, e saber quando ele é a ferramenta errada.

---

## ⚠ Conduta

⚠ **O alvo é seu, ou o lab local.** Brute force de subdomínio contra domínio de terceiro é
reconhecimento não autorizado — **e contra resolvedor público é abuso de recurso alheio**, mesmo
que você só faça "consultas".

⚠ **Limite autoimposto, desde este módulo:**

| Parâmetro | Valor seguro | Por quê |
|---|---|---|
| Consultas por segundo | **≤ 5** | Não sobrecarrega resolvedor |
| Wordlist | **≤ 5.000 nomes** | Sem isso, é varredura |
| Resolvedor | **O seu, ou o autoritativo do escopo** | Não use o do provedor de terceiro |
| Retry em `SERVFAIL` | **Não** | Insistir é abuso |

---

## 2.1 O que cada tipo de registro revela

⚠ **A maioria das pessoas consulta `A` e para.** Cada tipo adicional é uma pergunta nova.

| Tipo | O que é | **O que ele revela** |
|---|---|---|
| `A` / `AAAA` | Endereço | Onde o serviço está |
| **`CNAME`** | Apelido | **Para onde aponta** — e que terceiro é usado |
| **`MX`** | Correio | **Provedor de e-mail** — próprio ou terceirizado |
| **`TXT`** | Texto livre | **Verificação de serviço, SPF, DKIM, DMARC** |
| **`NS`** | Servidor de zona | **Provedor de DNS** |
| **`SOA`** | Autoridade da zona | **E-mail do responsável técnico**, serial |
| **`CAA`** | Quem pode emitir | **Restrição de certificado** |
| `SRV` | Serviço específico | Serviço exposto por convenção |
| `PTR` | Reverso | Módulo 5 |

```bash
cd ~/enum-lab/lab1

ALVO=""   # ← o seu

if [ -z "$ALVO" ]; then
    echo "⚠ defina ALVO"
else
    for t in A AAAA CNAME MX TXT NS SOA CAA; do
        echo "═══════════ ${t} ═══════════"
        dig +short "$t" "$ALVO" 2>/dev/null | head -8
        echo
    done
fi
```

⚠ **Note o `CNAME`:** ele revela **para onde** o nome aponta — e é aí que aparece o terceiro
(`herokudns.com`, `cloudfront.net`, `azurewebsites.net`). **É a fonte da cadeia do §1.4.**

---

## 2.2 `TXT` — a fonte mais subestimada

⚠ **O `TXT` é um campo livre, e por isso carrega tudo.** Cada entrada é uma declaração.

| Padrão no `TXT` | O que significa |
|---|---|
| `v=spf1 include:_spf.google.com` | **E-mail no Google Workspace** |
| `v=spf1 include:spf.protection.outlook.com` | **Microsoft 365** |
| `google-site-verification=...` | **Google Search Console** — confirma posse |
| `MS=ms12345678` | **Microsoft 365 / Azure** |
| `atlassian-domain-verification=...` | **Atlassian** (Jira, Confluence) |
| `adobe-idp-site-verification=...` | **Adobe** |
| `facebook-domain-verification=...` | **Meta Business** |
| `apple-domain-verification=...` | **Apple Business** |
| `docusign=...` | **DocuSign** |
| `_dmarc` → `v=DMARC1; p=none` | Política de e-mail **fraca** |
| `*=include:...` | Provedor de marketing/e-mail em massa |

⚠ **O `TXT` responde uma pergunta que nenhuma ferramenta de scan faz:** *que serviços de terceiro
esta organização usa?* E a resposta é uma **lista de superfície** — cada serviço é um ponto de
acesso que o adversário vai testar.

⚠ **A linha do `DMARC` é um achado de segurança.** `p=none` significa "monitore, não bloqueie" —
ou seja, **domínio sujeito a spoofing**. É um achado real, e frequentemente aparece em relatório.

```bash
ALVO=""     # ← o seu

if [ -n "$ALVO" ]; then
    echo "═══ TXT do domínio raiz ═══"
    dig +short TXT "$ALVO" | sed 's/^"//;s/"$//'

    echo
    echo "═══ TXT de _dmarc ═══"
    dig +short TXT "_dmarc.${ALVO}"

    echo
    echo "═══ TXT comuns de verificação ═══"
    for sub in _dmarc _domainkey default._domainkey google._domainkey; do
        printf '%-28s ' "${sub}.${ALVO}"
        dig +short TXT "${sub}.${ALVO}" | head -1
    done
fi
```

**Produza `txt.md`:**

| Entrada `TXT` | Serviço identificado | O que revela | Risco |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

**Responda:**

1. **Quantos serviços de terceiro o `TXT` revelou?**
2. O `SPF` é `-all` (rígido), `~all` (brando) ou `?all` (nenhum)? **O que isso significa?**
3. O `DMARC` existe? Qual a política (`none` / `quarantine` / `reject`)?
4. **Qual terceiro revelado é o mais interessante** para uma enumeração? Por quê?

⚠ **A resposta 4 é uma decisão de priorização.** Um `TXT` de Atlassian sugere Jira/Confluence — e
`atlassian.net` tem subdomínio por organização. **Cada serviço revelado abre uma pergunta nova.**

---

## 2.3 Zona esquecida — a falha que ninguém testa

⚠ **`AXFR` é a transferência de zona.** Deveria ser restrita ao servidor secundário — e às vezes
**não é.**

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ delegação: quem responde pela zona ═══"
    dig +short NS "$ALVO"

    echo
    echo "═══ SOA: o e-mail do responsável ═══"
    dig +short SOA "$ALVO"

    echo
    echo "═══ tentativa de transferência de zona ═══"
    echo "⚠ só contra o SEU domínio ou o autoritativo do escopo"
    echo

    for ns in $(dig +short NS "$ALVO" | sed 's/\.$//'); do
        printf '%-40s ' "${ns}"
        if dig AXFR "$ALVO" @"${ns}" 2>/dev/null | grep -q 'XFR size\|IN[[:space:]]'; then
            echo "⚠ ZONA ABERTA — transferência permitida"
        else
            echo "✓ recusado"
        fi
    done
fi
```

⚠ **Zona aberta é achado de severidade média-alta.** Ela entrega **a lista completa de nomes** da
zona — o que normalmente exigiria brute force. **Se você a encontra, você para a enumeração de
nome: já tem a resposta.**

⚠ **E o `SOA` merece atenção.** Ele traz o **e-mail do responsável técnico** no formato
`hostmaster.exemplo.com` — que frequentemente é um endereço interno, e revela a estrutura de
e-mail da organização.

⚠ **O serial do `SOA` revela a última alteração da zona.** Comparar o serial entre consultas, ao
longo do tempo, diz **quando** a organização mudou algo.

**Produza `zona.md`:**

| Nameserver | `AXFR` permitido? | Severidade | O que a zona revelou |
|---|---|---|---|
| | | | |

**Responda:**

1. A zona estava aberta? **Se sim, quantos nomes revelou?**
2. Qual o e-mail do responsável técnico no `SOA`?
3. Qual o serial? O que ele indica?
4. **Se a zona está fechada, o que isso diz sobre a postura de segurança?**

---

## 2.4 Wildcard — o que confunde toda contagem

⚠ **Wildcard (`*.exemplo.com`) responde para QUALQUER nome.** E isso destrói a contagem de brute
force, porque tudo parece existir.

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ teste de wildcard ═══"
    echo "consultando nomes que COM CERTEZA não existem:"
    echo
    for aleatorio in "nao-existe-$(head -c 6 /dev/urandom | base64 | tr -d '/+=')" \
                     "zz-$(date +%s)" "aaaa-bbbb-cccc-1234"; do
        ip=$(dig +short A "${aleatorio}.${ALVO}" 2>/dev/null | head -1)
        if [ -n "$ip" ]; then
            printf '  %-40s → %s   ⚠ WILDCARD ATIVO\n' "${aleatorio}.${ALVO}" "${ip}"
        else
            printf '  %-40s → NXDOMAIN ✓\n' "${aleatorio}.${ALVO}"
        fi
    done
fi
```

⚠ **Consequência prática:** sem testar wildcard antes, seu brute force reporta **5.000 subdomínios
encontrados** — e todos são o mesmo wildcard. **Testar primeiro é obrigatório.**

⚠ **E há a variação perigosa: wildcard com CNAME.** Se `*.exemplo.com` aponta para
`exemplo.herokudns.com`, **todo nome não usado é um take-over em potencial** — e o módulo 6 volta
nisso.

**Produza `wildcard.md`:**

| Nome testado | Resolveu? | IP/CNAME | WILDCARD? |
|---|---|---|---|
| `nao-existe-1` | | | |
| `nao-existe-2` | | | |
| `nao-existe-3` | | | |

**Responda:**

1. **O wildcard está ativo?** Como você concluiu?
2. Se ativo, ele aponta para onde?
3. **Como você contaria subdomínios reais** num domínio com wildcard? (Dica: comparar conteúdo, não
   existência.)
4. Por que testar wildcard **antes** do brute force é obrigatório?

---

## 2.5 Brute force — com limite, e sabendo quando não usar

⚠ **A técnica mais conhecida e a mais abusada.**

```bash
cd ~/enum-lab
mkdir -p lab2 && cd lab2

# Wordlist pequena, para o exercício
cat > nomes.txt <<'EOF'
www
mail
api
dev
staging
teste
admin
vpn
portal
intranet
git
jenkins
s3
backup
db
EOF

# Brute force COM LIMITE — o padrão do curso
cat > bruteforce.sh <<'SCRIPT'
#!/usr/bin/env bash
#
# Bruteforce de subdomínio com limite autoimposto.
# Uso: ./bruteforce.sh <dominio> <wordlist> [rps] [resolvedor]
#
set -uo pipefail

DOMINIO="${1:?uso: bruteforce.sh <dominio> <wordlist> [rps] [resolvedor]}"
WORDLIST="${2:?informe a wordlist}"
RPS="${3:-5}"                    # ⚠ 5 por segundo: conservador
RESOLVEDOR="${4:-}"

if [ ! -r "$WORDLIST" ]; then echo "wordlist ilegível" >&2; exit 3; fi
if [ "$RPS" -gt 20 ]; then
    echo "⚠ RPS ${RPS} acima do limite do curso (20). Abortando." >&2
    echo "⚠ volume alto é abuso de resolvedor — ajuste se você não tem autorização" >&2
    exit 2
fi

INTERVALO=$(awk -v r="$RPS" 'BEGIN{printf "%.3f", 1/r}')
ARGS=(+short +time=3 +tries=1)
[ -n "$RESOLVEDOR" ] && ARGS+=("@${RESOLVEDOR}")

total=0; achados=0

while IFS= read -r nome; do
    [ -z "$nome" ] && continue
    case "$nome" in \#*) continue;; esac

    total=$((total + 1))
    fqdn="${nome}.${DOMINIO}"

    resultado=$(dig "${ARGS[@]}" A "$fqdn" 2>/dev/null | head -1)

    if [ -n "$resultado" ]; then
        printf '%-40s → %s\n' "$fqdn" "$resultado"
        achados=$((achados + 1))
    fi

    sleep "$INTERVALO"           # ⚠ o que respeita o resolvedor
done < "$WORDLIST"

printf '\n%d nomes testados, %d resolveram\n' "$total" "$achados" >&2
SCRIPT
chmod +x bruteforce.sh

echo "═══ teste rápido (só com o seu domínio) ═══"
# ./bruteforce.sh "$ALVO" nomes.txt 5
```

⚠ **Note a trava de RPS.** O script **recusa** acima de 20 por segundo — porque acima disso, contra
resolvedor de terceiro, é varredura.

⚠ **E note o `+tries=1`.** Sem ele, o `dig` tenta várias vezes em `SERVFAIL` — e isso é insistir.

### Quando o brute force é a ferramenta errada

| Situação | Por que brute force é ruim | Melhor método |
|---|---|---|
| Você tem acesso à CT log | A lista já está lá | **Módulo 3** |
| Wildcard ativo | Tudo resolve | Comparação de conteúdo |
| Wordlist pequena | Cobertura baixa | Fonte passiva |
| Domínio grande | Volume absurdo | Fonte passiva |
| Você não tem autorização | **Não use** | — |

⚠ **A primeira linha é a mais importante:** **se existe CT log, você não precisa de brute force.**
A transparência de certificado entrega a lista de nomes quase completa — e de graça. **O módulo 3
existe por isso.**

**Produza `bruteforce.md`:**

| Métrica | Valor |
|---|---|
| Nomes testados | |
| Nomes que resolveram | |
| RPS usado | |
| Tempo total | |
| Wildcard ativo? | |

**Responda:**

1. Quantos subdomínios você achou? **Algum é inesperado?**
2. O RPS respeitou o limite? **Como você verificou?**
3. **Em qual situação você usaria brute force** em vez de fonte passiva?
4. Se o wildcard estivesse ativo, o resultado seria confiável? Por quê?

---

## 2.6 LAB — DNS completo, com registro

**Duração:** 120 min

### Passo 1 — Todos os tipos (30 min)

```bash
cd ~/enum-lab/lab2
ALVO=""

if [ -n "$ALVO" ]; then
    {
        echo "═══ $ALVO — $(date -Is) ═══"
        for t in A AAAA CNAME MX TXT NS SOA CAA SRV; do
            echo; echo "─── ${t} ───"
            dig +noall +answer "$t" "$ALVO" 2>/dev/null
        done

        echo; echo "─── _dmarc ───"
        dig +noall +answer TXT "_dmarc.${ALVO}"

        echo; echo "─── www ───"
        dig +noall +answer ANY "www.${ALVO}"
    } | tee dns-completo.txt
fi
```

Produza `dns-completo.md`:

| Tipo | Presente? | Valor | O que revela |
|---|---|---|---|
| `A` | | | |
| `AAAA` | | | |
| `CNAME` | | | |
| `MX` | | | |
| `TXT` | | | |
| `NS` | | | |
| `SOA` | | | |
| `CAA` | | | |
| `_dmarc` | | | |

⚠ **Ponha `X` nas linhas em que o tipo está ausente.** **Ausência é informação** — por exemplo, a
ausência de `CAA` significa que **qualquer CA pode emitir** certificado para o domínio.

⚠ **A resposta sobre `CAA` ausente é achado de segurança real.** Sem `CAA`, um emissor comprometido
— ou um erro de validação — emite certificado válido para o seu domínio. É o mesmo tipo de achado
que o `DMARC p=none`.

### Passo 2 — A cadeia de perguntas (35 min)

⚠ **O exercício central do módulo.**

Partindo do que você achou, **monte a cadeia**:

```
RESPOSTA 1: [o que você achou]
    │
    ▼ gera
PERGUNTA 2: [o que isso te faz perguntar]
    │
    ▼ método
RESPOSTA 2: [...]
    │
    ▼ gera
PERGUNTA 3: [...]
```

Produza `cadeia.md` com **no mínimo três níveis**:

| Nível | Pergunta | Método | Resposta | Próxima pergunta |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Responda:**

1. **Até onde a cadeia foi?** Você conseguiu ir além do nível 3?
2. Qual resposta **abriu mais perguntas**?
3. Alguma pergunta **não teve resposta** com fonte aberta? O que faltaria?
4. **Qual achado da cadeia é o de maior risco?**

⚠ **A resposta 4 exige julgamento.** Um subdomínio que aponta para serviço de terceiro desativado é
mais grave que um que aponta para serviço ativo — porque **pode ser reivindicado por qualquer um**.

### Passo 3 — Brute force com limite, registrado (35 min)

```bash
cd ~/enum-lab/lab2

# Prepare a wordlist do seu caso — mantendo PEQUENA
wc -l nomes.txt

# Rode com limite baixo
ALVO=""
[ -n "$ALVO" ] && ./bruteforce.sh "$ALVO" nomes.txt 3 2>&1 | tee bruteforce.txt

# Registre
{
    echo "data: $(date -Is)"
    echo "metodo: brute force DNS"
    echo "alvo: ${ALVO}"
    echo "wordlist: $(wc -l < nomes.txt) nomes"
    echo "rps: 3"
    if [ -n "$ALVO" ]; then
        echo "achados:"
        grep -c '→' bruteforce.txt 2>/dev/null || echo 0
    fi
} | tee registro-bruteforce.txt
```

Produza `bruteforce-lab.md`:

| Métrica | Valor |
|---|---|
| Wordlist (nomes) | |
| RPS | |
| Tempo total | |
| Achados | |
| Wildcard testado antes? | |

**Responda:**

1. Você testou **wildcard antes**? Se não, refaça — o resultado anterior não é confiável.
2. Quantos achados? Algum **já aparecia** no `TXT` ou no `CNAME`?
3. **O brute force achou algo que a fonte passiva não acharia?** Qual?
4. **Quanto tempo levaria** com wordlist de 50.000 nomes a 5 RPS? Use a conta:

```bash
python3 -c "
n = 50000
rps = 5
print(f'{n} nomes / {rps} por segundo = {n/rps:.0f} s = {n/rps/3600:.1f} horas')
print('⚠ e é por isso que brute force não escala — o módulo 3 resolve isto')
"
```

⚠ **A resposta 4 é o argumento do módulo 3.** Brute force de 50.000 nomes a 5 RPS leva **2,8 horas**
— e ainda é cobertura parcial. **A CT log entrega mais, em segundos, e sem sobrecarregar ninguém.**

### Passo 4 — O registro consolidado (20 min)

Produza `registro-dns.tsv` com **uma linha por consulta**:

| Campo | Conteúdo |
|---|---|
| `data` | ISO 8601 |
| `metodo` | `dig A`, `dig TXT`, `AXFR`, `bruteforce` |
| `alvo` | o FQDN consultado |
| `fonte` | resolvedor usado |
| `resultado` | o que voltou |
| `wildcard` | sim/não |
| `nota` | interpretação |

⚠ **O formato TSV é o mesmo do curso de OSINT, e é o que torna o achado reproduzível.** Sem ele, a
enumeração não serve para relatório.

**Responda:**

1. Quantas linhas o registro tem?
2. **Toda linha tem data e fonte?** Se não, corrija.
3. Qual consulta foi a **mais produtiva**?
4. O registro é suficiente para **outra pessoa reproduzir**? Teste: releia como estranho.

### Critérios de aceitação

- `dns-completo.md` com os **nove** tipos, incluindo os **ausentes** marcados.
- Você explicou o que a **ausência** de `CAA` e de `DMARC` significa.
- `txt.md` com os serviços de terceiro identificados e o `SPF` classificado.
- `zona.md` com a tentativa de `AXFR` registrada (aberta ou recusada).
- `wildcard.md` com o teste de três nomes aleatórios **antes** do brute force.
- `bruteforce.sh` rodando com RPS ≤ 20, e o script **recusando** acima disso.
- `cadeia.md` com **três níveis** de pergunta → resposta → próxima pergunta.
- `bruteforce-lab.md` com o cálculo de tempo para 50.000 nomes.
- `registro-dns.tsv` com **data e fonte** em toda linha.

---

## Avaliação

1. Cite oito tipos de registro e o que cada um revela.
2. Por que o `CNAME` é a fonte da cadeia de perguntas?
3. **Por que o `TXT` é a fonte mais subestimada?** Cite quatro serviços que ele revela.
4. O que `v=spf1 ... -all` significa? E `~all`? E `?all`?
5. Por que `DMARC p=none` é achado de segurança?
6. Por que a **ausência** de `CAA` é achado?
7. O que é transferência de zona, e por que zona aberta é grave?
8. O que o `SOA` revela que quase ninguém olha? E o serial?
9. **Por que testar wildcard antes do brute force é obrigatório?**
10. Por que o wildcard com CNAME é mais perigoso que wildcard com A?
11. Por que brute force **não escala**? Mostre a conta para 50.000 nomes.
12. Em que situação o brute force é a ferramenta **errada**, e o que usar?
13. Por que o limite de RPS é conduta, e não performance?

---

**Próximo:** [Módulo 3 — Certificado como fonte de host](modulo-03.md)
