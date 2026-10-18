# Módulo 7 — Correlação: de Achado a Mapa

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Deduplicar achado de seis fontes diferentes.
2. Priorizar por **risco**, não por ordem de descoberta.
3. **Provar posse** de um ativo antes de reportá-lo.
4. Detectar ativo que ninguém reivindica — o achado mais valioso.
5. Produzir o mapa de superfície que serve de entrada para o teste.

---

## ⚠ Conduta

⚠ **Este módulo não faz consulta nova.** Ele **organiza o que você já achou** — e é onde o trabalho
de enumeração vira entregável.

⚠ **E é onde aparece a pergunta mais importante da auditoria:** *de quem é este ativo?*

| Situação | O que fazer |
|---|---|
| Ativo é do cliente | Reportar como superfície dele |
| Ativo é de terceiro | **Reportar ao terceiro** — ou não reportar |
| Ativo **não é de ninguém** | **Achado crítico** — ativo órfão |
| Você **não sabe** de quem é | **Declarar incerteza**, não atribuir |

⚠ **A última linha é a regra.** Atribuir posse sem evidência é o erro que faz o relatório perder
credibilidade — e no caso do ativo órfão, é o erro que faz você perder um achado crítico.

---

## 7.1 Deduplicar — o mesmo ativo, seis nomes

⚠ **O mesmo ativo aparece em várias fontes, escrito de formas diferentes.**

```
CT log:       api.exemplo.com
robots:       /api/                    (é o mesmo?)
CNAME:        api.exemplo.com → exemplo.herokudns.com
PTR:          ec2-1-2-3-4.compute.amazonaws.com
ASN:          1.2.3.4
CDX:          http://api.exemplo.com:8080/v1
        │
        ▼
⚠ UM ativo, SEIS representações
```

```bash
cd ~/enum-lab
mkdir -p lab7 && cd lab7

# Consolide tudo que você achou nos módulos 2 a 6
: > todos-achados.tsv
printf 'fonte\ttipo\tvalor\tobservacao\n' >> todos-achados.tsv

# Módulo 2 — DNS
[ -f ../lab2/dns-completo.txt ] && {
    grep -oE '[a-z0-9.-]+\.(com|net|org|io)' ../lab2/dns-completo.txt 2>/dev/null | \
        sort -u | while read -r n; do
            printf 'dns\tnome\t%s\t\n' "$n" >> todos-achados.tsv
        done
}

# Módulo 3 — CT log
[ -f ../lab3/nomes-ct.txt ] && \
    awk '{printf "ct\tnome\t%s\t\n", $1}' ../lab3/nomes-ct.txt >> todos-achados.tsv

# Módulo 4 — arquivo morto e robots
[ -f ../lab4/robots-caminhos.txt ] && \
    awk '{printf "robots\tcaminho\t%s\t\n", $1}' ../lab4/robots-caminhos.txt >> todos-achados.tsv

# Módulo 5 — bloco e PTR
[ -f ../lab5/asn-completo.txt ] && \
    grep -oE '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' ../lab5/asn-completo.txt 2>/dev/null | \
    awk '{printf "asn\tip\t%s\t\n", $1}' >> todos-achados.tsv

# Módulo 6 — serviços e take-over
[ -f ../lab6/servicos.txt ] && \
    awk -F'\t' 'NF>=3 {printf "cname\tnome\t%s\t%s\n", $1, $3}' ../lab6/servicos.txt >> todos-achados.tsv

echo "linhas: $(wc -l < todos-achados.tsv)"
cut -f1 todos-achados.tsv | sort | uniq -c | sort -rn
```

### A normalização que resolve a duplicata

⚠ **Três formas do mesmo ativo precisam virar uma.**

| Problema | Normalização |
|---|---|
| Maiúscula/minúscula | `tr 'A-Z' 'a-z'` |
| Ponto final (`exemplo.com.`) | `sed 's/\.$//'` |
| Curinga (`*.exemplo.com`) | `sed 's/^\*\.//'` |
| Com porta (`:8080`) | **Manter** — porta é parte da superfície |
| Com esquema (`https://`) | Remover para o nome; **manter** para o serviço |
| IP duplicado por forma | Normalizar com `ipaddress` |
| Espaço em branco | `tr -d ' '` |

```bash
cat > normaliza.py <<'PY'
#!/usr/bin/env python3
"""normaliza.py — deduplica achados da enumeração."""
import sys, re, ipaddress
from collections import defaultdict

def norm(valor: str) -> str:
    v = valor.strip().lower().rstrip('.')
    v = re.sub(r'^\*\.', '', v)
    v = re.sub(r'^https?://', '', v)
    # se for IP, normaliza a representação
    try:
        return str(ipaddress.ip_address(v.split(':')[0]))
    except ValueError:
        pass
    return v

itens = defaultdict(lambda: {"fontes": set(), "tipos": set(), "obs": []})

with open(sys.argv[1]) as f:
    next(f)                      # cabeçalho
    for linha in f:
        p = linha.rstrip("\n").split("\t")
        if len(p) < 3:
            continue
        fonte, tipo, valor = p[0], p[1], p[2]
        obs = p[3] if len(p) > 3 else ""
        chave = norm(valor)
        if not chave:
            continue
        itens[chave]["fontes"].add(fonte)
        itens[chave]["tipos"].add(tipo)
        if obs:
            itens[chave]["obs"].append(obs)

print(f"{'ATIVO':<48} {'FONTES':<28} N")
print("-" * 86)
for k, v in sorted(itens.items(), key=lambda x: -len(x[1]["fontes"])):
    fontes = ",".join(sorted(v["fontes"]))
    print(f"{k:<48} {fontes:<28} {len(v['fontes'])}")

print()
print(f"total de ativos distintos: {len(itens)}")

# os mais corroborados — aparecem em várias fontes
print()
print("── ativos em 2+ fontes (corroboração) ──")
for k, v in itens.items():
    if len(v["fontes"]) >= 2:
        print(f"  {k:<46} {','.join(sorted(v['fontes']))}")
PY

python3 normaliza.py todos-achados.tsv 2>/dev/null | tee deduplicado.txt | head -40
```

⚠ **A coluna "fontes" é o que dá peso ao ativo.** Um nome que aparece **só** no CT log é um
indício; um nome que aparece no **CT log e no DNS e no arquivo morto** é **corroborado por três
fontes independentes** — e é prioridade alta.

⚠ **É o mesmo princípio do curso de OSINT:** independência de fonte é o que dá confiança. **E aqui
ela é calculada automaticamente.**

**Produza `dedupe.md`:**

| Métrica | Valor |
|---|---|
| Achados brutos | |
| Ativos distintos | |
| Ativos em 2+ fontes | |
| Ativos em 3+ fontes | |

**Responda:**

1. **Quantos achados brutos** você tinha? Quantos ativos distintos?
2. Qual a **taxa de duplicação**?
3. Quais ativos aparecem em **três ou mais fontes**?
4. Por que "aparece em várias fontes" é critério de prioridade?

---

## 7.2 Provar posse — a pergunta que decide o relatório

⚠ **Antes de reportar um ativo, você precisa saber de quem ele é.** E a prova vem de **evidência**,
não de proximidade.

| Evidência de posse | Força | Como obter |
|---|---|---|
| **Registro de domínio** (WHOIS) | Forte | Consulta o dono |
| **Certificado emitido** pela organização | Média | CT log — mas pode ser de terceiro |
| **Registro de empresa** (LEI, CNPJ) | **Forte** | OpenCorporates, GLEIF |
| **Bloco de IP** no nome da organização | Forte | `whois` de IP |
| **Página de contato** no domínio | Média | Conteúdo |
| **Compartilha o mesmo NS** | Média | `dig NS` |
| **Compartilha o mesmo MX** | Média | `dig MX` |
| **Está no mesmo ASN** | **Fraca** | Milhares compartilham |
| **Nome parecido** | **Fraca** | Não é prova |

⚠ **A tabela tem uma lição, e é a mesma do curso de OSINT:** o que **prova** é o que é **registrado
por autoridade**. O que é **declaração** (NS, MX) ou **infraestrutura compartilhada** (ASN) é
**indício**.

```bash
cd ~/enum-lab/lab7

cat > posse.sh <<'SCRIPT'
#!/usr/bin/env bash
# Avalia a força da evidência de posse de um ativo.
set -uo pipefail

ATIVO="${1:?uso: posse.sh <dominio>}"

echo "═══════ POSSE DE ${ATIVO} ═══════"
echo

echo "── 1. registro do domínio (FORTE) ──"
whois "$ATIVO" 2>/dev/null | grep -iE 'registrant|org|registrar:|creat' | head -6
echo

echo "── 2. servidor de DNS (MÉDIA — declaração) ──"
dig +short NS "$ATIVO" | head -4
echo

echo "── 3. correio (MÉDIA — declaração) ──"
dig +short MX "$ATIVO" | head -3
echo

echo "── 4. certificado (MÉDIA) ──"
curl -s --max-time 20 "https://crt.sh/?q=${ATIVO}&output=json" 2>/dev/null | \
    jq -r '.[0:2] | .[] | [.issuer_name, .not_before] | @tsv' 2>/dev/null | head -2
echo

echo "── 5. bloco de IP (FORTE) ──"
IP=$(dig +short A "$ATIVO" 2>/dev/null | head -1)
if [ -n "$IP" ]; then
    whois "$IP" 2>/dev/null | grep -iE 'netname|orgname|org-name' | head -3
else
    echo "  sem A"
fi
SCRIPT
chmod +x posse.sh

# posse.sh "exemplo.com"
```

⚠ **Note a marcação de força em cada bloco.** Você **classifica a evidência** — e declara no
relatório. **"Proprietário confirmado por registro de domínio"** é diferente de **"possivelmente do
mesmo dono porque compartilha o NS"**.

### O ativo órfão — o achado mais valioso

⚠ **A pergunta que revela o achado crítico:**

> **Este ativo está no certificado/DNS do cliente, mas o recurso de destino pertence a quem?**

```
api.exemplo.com  →  CNAME  →  exemplo-api.herokudns.com
                                    │
                                    ▼
                        ⚠ o recurso Heroku "exemplo-api" existe?
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
                    EXISTE                  NÃO EXISTE
                    (é do cliente)          (⚠ ÓRFÃO)
                                                 │
                                                 ▼
                                    NINGUÉM é dono do destino
                                    → qualquer um reivindica
```

⚠ **O ativo órfão é o take-over do módulo 6, mas a classificação é diferente:**

| Categoria | Quem é dono | Severidade |
|---|---|---|
| Ativo ativo | O cliente | Informativa |
| Ativo de terceiro legítimo | O terceiro | Baixa |
| **Ativo órfão** | **Ninguém** | **Crítica** |
| Ativo de outro cliente do mesmo serviço | Outro | ⚠ **Não reportar** |

⚠ **A quarta linha é importante.** Se o CNAME aponta para recurso de **outra organização**, isso é
o funcionamento normal da nuvem — e **não é achado nem do seu cliente nem seu para reportar**.
**Você declara que verificou e não é do cliente.**

**Produza `posse.md`:**

| Ativo | Registro | NS | MX | ASN | Força da evidência | Dono |
|---|---|---|---|---|---|---|
| | | | | | | |

**Responda:**

1. Para os ativos que você achou, **a evidência é forte ou fraca**?
2. Algum é **órfão**? Como você determinou?
3. Algum é de **terceiro legítimo**? Qual, e por que não é achado?
4. **Você conseguiria afirmar "isto é do cliente"?** Com qual evidência?

⚠ **A resposta 4 é o teste final.** Se a sua evidência é "está no mesmo ASN", você **não consegue**
afirmar — e o relatório diz isso.

---

## 7.3 Priorizar — risco, não ordem de descoberta

⚠ **A tentação é listar na ordem em que você achou.** Errado. **A ordem é por risco.**

### A matriz de priorização

```
RISCO = EXPOSIÇÃO × ALCANCE × FACILIDADE DE DESCOBERTA
```

| Eixo | Pergunta | Escala |
|---|---|---|
| **Exposição** | O que o ativo expõe se for comprometido? | dado / controle / existência |
| **Alcance** | Quem consegue alcançá-lo? | internet / interno / local |
| **Facilidade** | Quão fácil é para o atacante achar e usar? | trivial / médio / difícil |

### A tabela de prioridade

| Achado | Exposição | Alcance | Facilidade | Prioridade |
|---|---|---|---|---|
| **Take-over de subdomínio** | Cookie, phishing, allowlist | Internet | **Trivial** | **Crítica** |
| **Bucket livre** | Dado, conteúdo | Internet | Trivial | **Crítica** |
| Credencial em repositório público | **Tudo** | Internet | Média | **Crítica** |
| `.env` acessível | Credencial | Internet | Média | Alta |
| Painel com cadastro aberto | Acesso à organização | Internet | Média | Alta |
| Bucket público (não livre) | Dado | Internet | Média | Alta |
| `admin.` exposto | Superfície interna | Internet | Média | Média |
| Subdomínio abandonado **sem** CNAME | Histórico | Internet | Difícil | Média |
| Painel de terceiro existente | Informação | Internet | Fácil | Baixa |
| Nome no CT log, sem DNS | Histórico | — | Difícil | Baixa |
| Zona aberta (`AXFR`) | **Mapa completo** | Internet | Fácil | **Alta** |
| `DMARC p=none` | Spoofing | Internet | Fácil | Média |
| Ausência de `CAA` | Emissão indevida | Internet | Difícil | Média |

⚠ **Note onde a **zona aberta** entra.** Ela não é vulnerabilidade por si, mas **entrega o mapa
inteiro** — e isso multiplica o risco de tudo que está nele. **É achado de alto impacto indireto.**

⚠ **E note o `DMARC p=none` e a ausência de `CAA`.** São achados de **postura**, não de
vulnerabilidade — e num relatório de auditoria, eles aparecem separados: **"exposição"** contra
**"postura"**.

```bash
cd ~/enum-lab/lab7

cat > prioriza.py <<'PY'
#!/usr/bin/env python3
"""prioriza.py — pontua achados por exposição, alcance e facilidade."""
import csv, sys

EXPOSICAO = {"dado": 3, "controle": 3, "credencial": 3, "superficie": 2,
             "informacao": 1, "historico": 1}
ALCANCE   = {"internet": 3, "interno": 2, "local": 1}
FACIL     = {"trivial": 3, "facil": 2, "medio": 2, "dificil": 1}

def pontos(e, a, f):
    return EXPOSICAO.get(e, 1) * ALCANCE.get(a, 1) * FACIL.get(f, 1)

ax = sys.argv[1] if len(sys.argv) > 1 else "achados.csv"
linhas = []
with open(ax) as fh:
    for r in csv.DictReader(fh):
        p = pontos(r["exposicao"], r["alcance"], r["facilidade"])
        linhas.append((p, r))

linhas.sort(key=lambda x: -x[0])

def nivel(p):
    if p >= 18: return "CRÍTICA"
    if p >= 12: return "ALTA"
    if p >= 6:  return "MÉDIA"
    return "BAIXA"

print(f"{'PTS':>4}  {'NÍVEL':<8} {'ACHADO':<42} EXPOSIÇÃO")
print("-" * 86)
for p, r in linhas:
    print(f"{p:>4}  {nivel(p):<8} {r['achado']:<42} {r['exposicao']}")
PY

# Crie o CSV dos seus achados
cat > achados.csv <<'EOF'
achado,exposicao,alcance,facilidade
take-over de subdominio,controle,internet,trivial
bucket livre,dado,internet,trivial
.env acessivel,credencial,internet,medio
zona aberta AXFR,informacao,internet,facil
admin exposto,superficie,internet,medio
painel de terceiro,informacao,internet,facil
nome no CT sem DNS,historico,internet,dificil
EOF

python3 prioriza.py achados.csv
```

⚠ **A pontuação é heurística, e você declara isso.** O valor dela é **forçar a comparação** — em
vez de listar na ordem de descoberta, você **justifica** por que um achado vem antes de outro.

**Produza `prioridade.md`:**

| # | Achado | Exposição | Alcance | Facilidade | Pontos | Nível |
|---|---|---|---|---|---|---|
| | | | | | | |

**Responda:**

1. **Qual achado tem a maior pontuação?** Isso bate com a sua intuição?
2. Algum achado de **postura** (DMARC, CAA) entrou? Ele é "exposição" ou "postura"?
3. **Onde a zona aberta ficou?** Por que o impacto dela é indireto?
4. Qual achado você **não priorizaria** apesar da pontuação alta? Por quê?

⚠ **A resposta 4 é o julgamento.** A pontuação é heurística — e às vezes o contexto do cliente muda
a prioridade. **Você declara o ajuste e o motivo.**

---

## 7.4 O mapa de superfície

⚠ **O entregável do módulo:** um documento que serve de **entrada** para o teste.

```markdown
# Mapa de Superfície — [cliente] — [data]

## 1. Escopo e autorização
| Base | Referência |
|---|---|

## 2. Método e cobertura
| Fonte | Consultada? | Achados | Limitação |
|---|---|---|---|
| DNS | | | |
| CT log | | | |
| Arquivo morto | | | |
| ASN/PTR | | | |
| Terceiro | | | |

## 3. Inventário de ativo
| # | Ativo | Tipo | Fontes | Dono | Evidência de posse |
|---|---|---|---|---|---|

## 4. Achados priorizados
| # | Achado | Evidência | Pontos | Nível | Correção |
|---|---|---|---|---|---|

## 5. Achados de postura
| Achado | Evidência | Recomendação |
|---|---|---|

## 6. Candidatos a investigação (não confirmados)
| Ativo | Hipótese | O que confirmaria | Por que não confirmei |
|---|---|---|---|

## 7. O que NÃO foi coberto
⚠ Obrigatório:
- fontes não consultadas, e por quê
- jurisdição/faixa fora do escopo
- período não coberto pelo arquivo morto
- ⚠ nenhuma reivindicação, download ou acesso indevido foi feito

## 8. Próximos passos sugeridos
| # | Ação | Prioridade |
|---|---|---|
```

⚠ **A seção 6 é a que o cliente mais valoriza.** "Candidatos não confirmados" diz a ele **onde olhar
depois** — e mostra que você **não inventou achado** para inflar o relatório.

⚠ **E a seção 7 tem a declaração de conduta.** Ela é o que faz o relatório ser **defensável**.

---

## 7.5 LAB — O mapa completo

**Duração:** 120 min

### Passo 1 — Consolide (35 min)

```bash
cd ~/enum-lab/lab7

# Se você fez os módulos 2 a 6, consolide
: > todos-achados.tsv
printf 'fonte\ttipo\tvalor\tobservacao\n' >> todos-achados.tsv

for f in ../lab3/nomes-ct.txt:ct:nome \
         ../lab4/urls-arquivadas.txt:cdx:url \
         ../lab2/nomes.txt:dns:nome; do
    caminho="${f%%:*}"; resto="${f#*:}"
    fonte="${resto%%:*}"; tipo="${resto#*:}"
    [ -f "$caminho" ] || continue
    while IFS= read -r v; do
        [ -z "$v" ] && continue
        printf '%s\t%s\t%s\t\n' "$fonte" "$tipo" "$v" >> todos-achados.tsv
    done < "$caminho"
done

echo "linhas: $(wc -l < todos-achados.tsv)"
python3 normaliza.py todos-achados.tsv | tee dedup.txt | head -25
```

Produza `consolidado.md`:

| Fonte | Achados | Ativos distintos | Duplicação |
|---|---|---|---|
| | | | |

**Responda:**

1. **Quantas fontes você consolidou?**
2. Qual a **taxa de duplicação**?
3. **Qual fonte trouxe mais achado único** (que nenhuma outra trouxe)?
4. Por que essa informação importa para a próxima enumeração?

### Passo 2 — Avalie posse (35 min)

```bash
cd ~/enum-lab/lab7

# Avalie os 10 ativos mais corroborados
head -12 dedup.txt 2>/dev/null | tail -10 | awk '{print $1}' > top10.txt
cat top10.txt

echo
echo "═══ avaliando posse ═══"
while IFS= read -r ativo; do
    [ -z "$ativo" ] && continue
    case "$ativo" in
        http*|/|.*) continue ;;
    esac

    echo "── ${ativo} ──"
    reg=$(whois "$ativo" 2>/dev/null | grep -iE 'registrant|orgname|org-name' | head -1)
    ns=$(dig +short NS "$ativo" 2>/dev/null | head -1)
    printf '  registro: %s\n' "${reg:-não encontrado}"
    printf '  NS:       %s\n' "${ns:-nenhum}"
    sleep 1
done < top10.txt | tee posse-top10.txt
```

Produza `posse-top10.md`:

| Ativo | Registro | NS | Força | Dono provável | Órfão? |
|---|---|---|---|---|---|
| | | | | | |

**Responda:**

1. **Quantos ativos têm evidência forte** de posse?
2. Algum parece **órfão**?
3. Qual ativo você **não consegue atribuir**? Por quê?
4. **O que você declara** sobre o que não conseguiu atribuir?

### Passo 3 — Priorize (30 min)

```bash
cd ~/enum-lab/lab7

# Monte o CSV dos SEUS achados
cat > meus-achados.csv <<'EOF'
achado,exposicao,alcance,facilidade
EOF

# Adicione o que você achou — exemplo de linhas:
cat >> meus-achados.csv <<'EOF'
subdominio para servico de terceiro,informacao,internet,facil
nome no CT log sem DNS,historico,internet,medio
caminho no robots nao linkado,superficie,internet,medio
EOF

python3 prioriza.py meus-achados.csv
```

Produza `prioridade-lab.md`:

| # | Achado | Exposição | Alcance | Facilidade | Pontos | Nível | Ajuste |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

**Responda:**

1. **Quantos achados entraram?**
2. Algum ficou em nível **crítico**?
3. **Onde você ajustou a pontuação** por contexto?
4. Qual achado você levaria **primeiro** ao cliente?

### Passo 4 — O mapa (20 min)

Produza `mapa-superficie.md` com as **oito** seções do §7.4.

Requisitos:

| Seção | Mínimo |
|---|---|
| 3 — Inventário | **10 ativos**, com fontes e dono |
| 4 — Priorizados | **5 achados**, com nível |
| 5 — Postura | **2 achados** de postura |
| 6 — Candidatos | **3 itens**, com o que confirmaria |
| **7 — Não coberto** | **4 itens**, incluindo a declaração de conduta |

### Critérios de aceitação

- `todos-achados.tsv` consolidado de **no mínimo três** fontes.
- `normaliza.py` rodado, com a **taxa de duplicação** calculada.
- Você identificou **qual fonte trouxe mais achado único**.
- `posse-top10.md` com a **força da evidência** avaliada em cada ativo.
- Você distinguieu **evidência forte** (registro) de **fraca** (ASN).
- `prioridade-lab.md` com a pontuação e **um ajuste justificado**.
- Você separou **achados de exposição** de **achados de postura**.
- `mapa-superficie.md` com as **oito** seções e **quatro itens** na seção 7.
- A seção 6 tem **o que confirmaria** cada candidato — não só o candidato.

---

## Avaliação

1. Por que o mesmo ativo aparece em várias fontes? Cite quatro normalizações necessárias.
2. Por que "aparece em 2+ fontes" é critério de prioridade?
3. Cite cinco evidências de posse e a força de cada uma.
4. **Por que "está no mesmo ASN" é evidência fraca?**
5. O que é um **ativo órfão**, e por que é o achado mais valioso?
6. Por que ativo que aponta para recurso de **outra organização** não é achado?
7. Descreva a matriz de priorização e os três eixos.
8. Por que **zona aberta** é impacto indireto mas alto?
9. Diferencie achado de **exposição** de achado de **postura**. Dê dois exemplos de cada.
10. Por que a pontuação é heurística, e o que você faz quando ela erra?
11. Por que a seção "candidatos não confirmados" é a que o cliente mais valoriza?
12. Por que a declaração de conduta é parte do entregável e não formalidade?
13. O que você faz quando **não consegue atribuir** posse de um ativo?

---

**Próximo:** [Módulo 8 — Limites: volume, autorização, termo](modulo-08.md)
