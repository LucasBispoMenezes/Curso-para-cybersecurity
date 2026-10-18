# Módulo 9 — Evasão: as Famílias

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 8 · Parser Differentials (módulo 5)

---

## Objetivos

1. Conhecer as **sete famílias** de evasão e o que cada uma explora.
2. Reconhecer **onde** cada família ataca — a regra, o parser ou o transporte.
3. Saber qual família a **sua** regra não resiste.
4. **Medir** a evasão por família — não descrevê-la.
5. Usar a evasão **para testar**, e declarar isso.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Evasão não é criatividade.** **É explorar uma discordância entre o que a regra vê e o que o alvo
> processa** — **e as discordâncias são poucas e conhecidas.**

⚠ **E é a mesma lição do módulo 10 do HTTP Smuggling:** **a evasão existe porque há **duas
transformações**, e a regra vê uma.**

⚠ **A tese:**

> **Sete famílias, cada uma com um mecanismo.** **E você não precisa inventar — precisa saber qual
> delas a sua regra não resiste.**

⚠ **A tabela das sete:**

| # | Família | Explora | Onde ataca |
|---|---|---|---|
| 1 | **Encoding** | ⚠ A decodificação | ⚠ **A regra** |
| 2 | **Case** | A comparação | A regra |
| 3 | **Aninhamento** | ⚠ **A remoção** | ⚠ **A sanitização** |
| 4 | **Delimitador** | A gramática | ⚠ O parser |
| 5 | **Fragmentação** | ⚠ **A ordem das camadas** | O transporte |
| 6 | **Ambiguidade** | ⚠ **O framing** | ⚠ **O parser** |
| 7 | **Volume** | O orçamento | ⚠ **O time** |

⚠ **A família 7 é a mais subestimada e a mais eficaz.** **Ela não esconde o ataque** — **ela **enche**
o detector de falsos positivos até o time desligar a regra.** **É o módulo 6 usado como arma.**

---

## 9.1 As sete famílias

⚠ **As três primeiras são sobre a **forma**; as três seguintes, sobre o **parser**; e a última, sobre
o **time**.**

| Família | O atacante faz | ⚠ A defesa |
|---|---|---|
| **1. Encoding** | Codifica o payload | ⚠ **Alinhar a decodificação** |
| **2. Case** | Troca a caixa | ✓ **`(?i)`** |
| **3. Aninhamento** | Insere o delimitador em si | ⚠ **Só rejeitar** |
| **4. Delimitador** | Usa forma inválida | ✓ **Comparar com a gramática** |
| **5. Fragmentação** | Divide entre camadas | ⚠ Reinstrumentar |
| **6. Ambiguidade** | Usa o framing | ⚠ Validar o framing |
| **7. Volume** | Enche o detector | ⚠ **Orçamento** |

⚠ **A família 6 é o HTTP Smuggling inteiro, visto do detector.** **Não é sobre o payload; é sobre
onde a mensagem termina** — **e a regra, no frontend, nunca vê o que o backend viu.**

⚠ **E a família 7 é a única que não ataca um parser.** **Ela ataca o **processo** — **e frequentemente
vence, porque o orçamento acaba antes da paciência do atacante.**

⚠ **A regra escrita:**

> **As famílias 3 e 6 não têm defesa por assinatura.** **Uma porque a remoção cria o padrão; a outra
> porque a regra está na camada errada.** **As duas só se resolvem rejeitando — ou mudando de
> camada.**

```bash
mkdir -p ~/detect-lab/mod09 && cd ~/detect-lab/mod09

echo "═══ 1. as sete famílias ═══"
echo
cat > familias.md <<'EOF'
# As sete famílias de evasão

| # | Família | Explora | Onde ataca | A defesa |
|---|---|---|---|---|
| 1 | ENCODING | a decodificação | ⚠ a REGRA | alinhar a decodificação |
| 2 | CASE | a comparação | a regra | ✓ (?i) |
| 3 | ⚠ ANINHAMENTO | ⚠ a REMOÇÃO | ⚠ a SANITIZAÇÃO | ⚠ só REJEITAR |
| 4 | DELIMITADOR | a gramática | o parser | ✓ comparar com a GRAMÁTICA |
| 5 | FRAGMENTAÇÃO | a ordem das camadas | o transporte | reinstrumentar |
| 6 | ⚠ AMBIGUIDADE | ⚠ o FRAMING | ⚠ o PARSER | validar o framing |
| 7 | ⚠ VOLUME | o ORÇAMENTO | ⚠ **O TIME** | orçamento |

## ⚠ as três primeiras são sobre a FORMA
## ⚠ as três seguintes, sobre o PARSER
## ⚠ e a ULTIMA, sobre o TIME

## ⚠ a família 7 é a mais subestimada e a mais eficaz
ela NÃO esconde o ataque.
ela ENCHE o detector de falsos positivos
até o time DESLIGAR a regra.
✓ é o módulo 6 usado como ARMA.

## ⚠ A REGRA
as famílias 3 e 6 NÃO TÊM defesa por assinatura.
· a 3 porque a REMOÇÃO cria o padrão
· a 6 porque a regra está na CAMADA ERRADA
✓ as duas só se resolvem REJEITANDO — ou mudando de CAMADA.
EOF

cat familias.md
```

⚠ **A tabela das sete é o instrumento.** **E a coluna da defesa mostra que três famílias não têm
defesa por assinatura** — **e é onde o curso 4 (módulo 4) trabalhou.**

⚠ **E a família 7 é o achado do módulo:** **o ataque ao **orçamento** é o mais eficaz, e não é
técnico.**

**Produza `familias.md`:**

| # | Família | Onde ataca | Defesa |
|---|---|---|---|
| 1 | | | |
| 3 | | | |
| 7 | | | |

**Responda:**

1. **Quais famílias não têm defesa por assinatura?
2. **Por que a família 7 é a mais eficaz?
3. **O que a família 6 é, vista do detector?
4. **Por que as três primeiras são sobre a forma?

---

## 9.2 O mapa da evasão

⚠ **O mapa liga cada família à **contramedida** — e ao **custo** dela.**

| Família | Contramedida | ⚠ Custo |
|---|---|---|
| 1. Encoding | Alinhar a decodificação | ⚠ **Exige medir** |
| 2. Case | `(?i)` | ✓ **Nenhum** |
| 3. Aninhamento | ⚠ **Rejeitar a forma** | ⚠ Quebra tolerância |
| 4. Delimitador | Comparar com a gramática | ⚠ Zero FP, mas não pega payload válido |
| 5. Fragmentação | Instrumentar a camada certa | ⚠ **Caro** |
| 6. Ambiguidade | Validar o framing | ⚠ Quebra clientes |
| 7. Volume | ⚠ **Orçamento + limite** | ⚠ **Rate limit** |

⚠ **A linha 3 é a mais importante do mapa.** **"Rejeitar a forma" significa:** **a mensagem com
`TE`+`CL` não é aceita** — **e isso quebra o cliente que mandava os dois "por engano".** **É a
escolha do módulo 10 anterior, agora do lado do custo.**

⚠ **E a tabela do que cada contramedida **custa em FP**:**

| Contramedida | Efeito no FP |
|---|---|
| `(?i)` | ⚠ Aumenta pouco |
| Comparar com a gramática | ⚠ **Nenhum** |
| ⚠ **Rejeitar a forma** | ⚠ **Pode quebrar o legítimo** |
| Alinhar a decodificação | ⚠ **Aumenta** |
| ⚠ Rate limit | ⚠⚠ **Afeta o legítimo com volume** |

⚠ **A linha do rate limit é o custo da família 7.** **Limitar volume é a contramedida — e ela atinge
o cliente legítimo de alto volume**, **que frequentemente é o mais importante.**

⚠ **A regra escrita:**

> **Toda contramedida custa em FP ou em quebra de compatibilidade.** **O mapa não tem opção
> gratuita** — **exceto o `(?i)`, que é o único ajuste sem preço.**

```bash
cd ~/detect-lab/mod09

echo "═══ 2. o mapa da evasão ═══"
echo
cat > mapa.md <<'EOF'
# O mapa da evasão

| Família | Contramedida | Custo |
|---|---|---|
| 1 encoding | alinhar a decodificação | ⚠ exige MEDIR |
| 2 case | (?i) | ✓ NENHUM |
| 3 aninhamento | ⚠ REJEITAR a forma | ⚠ quebra tolerância |
| 4 delimitador | comparar com a gramática | ⚠ zero FP, mas não pega payload VÁLIDO |
| 5 fragmentação | instrumentar a camada certa | ⚠ CARO |
| 6 ambiguidade | validar o framing | ⚠ quebra clientes |
| 7 volume | ⚠ orçamento + limite | ⚠ RATE LIMIT |

## O custo em FP, por contramedida
| Contramedida | Efeito no FP |
|---|---|
| (?i) | ⚠ aumenta pouco |
| comparar com a gramática | ⚠ NENHUM |
| ⚠ REJEITAR a forma | ⚠ pode quebrar o LEGÍTIMO |
| alinhar a decodificação | ⚠ AUMENTA |
| ⚠ rate limit | ⚠⚠ afeta o legítimo COM volume |

## ⚠ a linha do rate limit
limitar volume é a contramedida —
e ela atinge o cliente legítimo de ALTO VOLUME,
que frequentemente é o MAIS IMPORTANTE.

## ⚠ A REGRA
toda contramedida custa em FP ou em COMPATIBILIDADE.
✓ o mapa não tem opção GRATUITA —
   exceto o (?i), que é o único ajuste SEM PREÇO.
EOF

cat mapa.md
```

⚠ **O mapa é o instrumento.** **E ele mostra que a maioria das contramedidas tem preço** — **e que a
gratuita é uma só.**

⚠ **E a nota do rate limit é a mais dolorosa:** **a contramedida da família 7 atinge o cliente que
você menos quer perder.**

**Produza `mapa.md`:**

| Família | Contramedida | Custo |
|---|---|---|
| 2 | | |
| 3 | | |
| 7 | | |

**Responda:**

1. **Qual contramedida é gratuita?
2. **O que "rejeitar a forma" quebra?
3. **Por que o rate limit atinge o cliente importante?
4. **O que o mapa mostra sobre opções gratuitas?

---

## 9.3 O que nenhuma regra pega

⚠ **A parte honesta do módulo: **o que fica de fora, sempre.**

| O que | Por quê |
|---|---|
| **O ataque com forma válida** | ⚠ **A regra por gramática não vê** |
| ⚠ **O aninhamento** | ⚠ **A remoção cria o padrão** |
| **A ambiguidade de framing** | ⚠ **A regra está na camada errada** |
| ⚠ **O ataque lento** | ⚠ **Não há assinatura no volume** |
| **O ataque distribuído** | ⚠ Cada origem, sozinha, é normal |

⚠ **A tabela é o que a sua regra **não** cobre — e precisa ser declarada.**

⚠ **E a última linha é a mais difícil.** **Um ataque distribuído em 10.000 IPs, cada um mandando uma
requisição** — **não é anômalo em nenhum deles.** **É o que a família 5 (fragmentação) faz em
escala.**

⚠ **A tabela do que fazer com cada lacuna:**

| Lacuna | O que fazer |
|---|---|
| Forma válida | ⚠ **Detecção por comportamento** (módulo 3) |
| Aninhamento | ⚠ **Rejeitar a entrada** |
| Framing | ⚠ **Instrumentar o backend** |
| Ataque lento | ⚠ Série temporal |
| Distribuído | ⚠ Correlação entre origens |

⚠ **A linha do framing é o resumo do módulo 5 do curso anterior:** **a contramedida não é uma regra;
é **ver** o que o backend viu.**

⚠ **A regra escrita:**

> **Declare as lacunas.** **Uma regra com lacuna declarada é auditável; uma sem é uma promessa que
> não se cumpre.** **E o atacante vive exatamente nas lacunas que ninguém escreveu.**

```bash
cd ~/detect-lab/mod09

echo "═══ 3. o que nenhuma regra pega ═══"
echo
cat > lacunas.md <<'EOF'
# O que nenhuma regra pega

| O que | Por quê |
|---|---|
| o ataque com FORMA VÁLIDA | ⚠ a regra por gramática não vê |
| ⚠ o ANINHAMENTO | ⚠ a remoção CRIA o padrão |
| o FRAMING | ⚠ a regra está na CAMADA ERRADA |
| ⚠ o ataque LENTO | ⚠ não há assinatura no VOLUME |
| o ataque DISTRIBUÍDO | ⚠ cada origem, sozinha, é NORMAL |

## O que fazer com cada lacuna
| Lacuna | O que fazer |
|---|---|
| forma válida | ⚠ detecção por COMPORTAMENTO |
| aninhamento | ⚠ REJEITAR a entrada |
| framing | ⚠ INSTRUMENTAR o backend |
| ataque lento | ⚠ série temporal |
| distribuído | ⚠ correlação entre ORIGENS |

## ⚠ a linha mais difícil
o ataque DISTRIBUÍDO.
10.000 IPs, cada um com UMA requisição —
não é anômalo em NENHUM deles.
✓ é o que a família 5 faz em ESCALA.

## ⚠ A REGRA
declare as LACUNAS.
uma regra com lacuna declarada é AUDITÁVEL.
uma sem é uma PROMESSA que não se cumpre.
⚠ e o atacante vive exatamente nas lacunas que NINGUÉM ESCREVEU.
EOF

cat lacunas.md
```

⚠ **A tabela das lacunas é o que torna a regra auditável.** **E a linha do distribuído é a mais
difícil de aceitar** — **porque não há nada de estranho em lugar nenhum.**

⚠ **E é a razão de a correlação entre origens existir** — **e de ela custar tanto.**

**Produza `lacunas.md`:**

| Lacuna | O que fazer |
|---|---|
| Forma válida | |
| Framing | |
| Distribuído | |

**Responda:**

1. **Por que a forma válida escapa?
2. **Por que o ataque distribuído é o mais difícil?
3. **Qual lacuna se resolve instrumentando?
4. **Por que declarar a lacuna torna a regra auditável?

---

## 9.4 LAB — A evasão medida

**Duração:** 150 min

### Passo 1 — Teste a sua regra contra as sete (55 min)

⚠ **As sete famílias, contra a regra do módulo 3 ou 4. E a taxa de cada.**

```bash
cd ~/detect-lab/mod09

echo "═══ AS SETE FAMÍLIAS, CONTRA A SUA REGRA ═══"
echo
cat > mede-familias.py <<'PY'
#!/usr/bin/env python3
"""
mede-familias.py — mede a resistência da sua regra às SETE famílias de evasão.

⚠ DIDÁTICO. testa a REGRA — não ataca terceiros.
"""
import re, sys
from urllib.parse import quote

# ─── A SUA REGRA — ajuste ───
REGRA = re.compile(r"(?i)<script|union\s+select|\.\./", re.M)

BASE = "<script>alert(1)</script>"

FAMILIAS = [
    ("0. controle (literal)",       BASE),
    ("1. encoding 1x",              quote(BASE)),
    ("1. encoding 2x",              quote(quote(BASE))),
    ("1. encoding 3x",              quote(quote(quote(BASE)))),
    ("2. case",                     BASE.upper()),
    ("2. case misto",               "<ScRiPt>alert(1)</sCrIpT>"),
    ("3. aninhamento",              "<scr<script>ipt>alert(1)</scr</script>ipt>"),
    ("4. delimitador (null)",       "<scr\x00ipt>alert(1)"),
    ("4. espaço no delimitador",    "< script>alert(1)"),
    ("5. fragmentado",              "<scr" + "ipt>alert(1)"),
    ("6. ambiguidade (framing)",    "TE+CL semanticamente, forma válida"),
    ("7. volume (rajada)",          "N requisições legítimas em 1s"),
]


def main():
    print("═══ RESISTÊNCIA ÀS SETE FAMÍLIAS ═══")
    print()
    print(f"  a regra: {REGRA.pattern[:40]}...")
    print()
    print(f"  {'família':<30} {'casa?':<10} {'veredito'}")
    print("  " + "-"*60)

    pegos, falhas = 0, []
    for nome, payload in FAMILIAS:
        if nome.startswith(("6.", "7.")):
            print(f"  {nome:<30} {'⚠ N/A':<10} ⚠ não é payload — ver módulo 2/6")
            continue
        casa = bool(REGRA.search(payload))
        pegos += casa
        if not casa:
            falhas.append(nome)
        print(f"  {nome:<30} {'✓ SIM' if casa else '⚠ NÃO':<10} "
              f"{'ok' if casa else '⚠ LACUNA'}")

    n = len([f for f in FAMILIAS if not f[0].startswith(("6.", "7."))])
    print()
    print(f"  ⚠ resistência: {pegos}/{n} = {pegos/n:.0%}")
    print()
    if falhas:
        print("  ── as famílias que derrubam a regra ──")
        for f in falhas:
            print(f"     ⚠ {f}")
    print()
    print("  ═══ LEMBRE ═══")
    print("  · as famílias 6 e 7 NÃO são testáveis por payload")
    print("     · a 6 exige instrumentar a camada (módulo 5)")
    print("  ⚠ e a 7 exige medir o orçamento (módulo 6)")
    print()
    print("  ⚠ teste local. nenhum alvo de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-familias.py
python3 mede-familias.py
```

⚠ **O medidor testa as sete — e separa as duas que não são payload.** **A família 6 exige
instrumentar; a 7, medir o orçamento.**

⚠ **E a nota é a honestidade do módulo:** **duas das sete famílias não se testam por payload** —
**porque uma ataca a camada, e a outra, o time.**

**Produza `familias-testadas.md`:**

| Família | Casa? | Lacuna? |
|---|---|---|
| Encoding 1× | | |
| Encoding 2× | | |
| Case | | |
| Aninhamento | | |

**Responda:**

1. **Quantas famílias derrubam a sua regra?
2. **Qual a resistência medida?
3. **Por que as famílias 6 e 7 não são testáveis por payload?
4. **Qual lacuna você vai corrigir primeiro?

### Passo 2 — Corrija o que der, e declare o resto (50 min)

⚠ **Algumas famílias se corrigem; outras se declaram.**

```bash
cd ~/detect-lab/mod09

echo "═══ CORRIGINDO E DECLARANDO ═══"
echo
cat <<'EXPL'
  ── AS QUE SE CORRIGEM ──

     2. CASE      → ✓ adicione (?i). custo: nenhum.
     4. DELIMIT.  → ✓ compare com a GRAMÁTICA (módulo 4).
     1. ENCODING  → ⚠ alinhe a decodificação. custo: exige MEDIR.

  ── AS QUE NÃO SE CORRIGEM ──

     3. ANINHAMENTO → ⚠ SÓ REJEITANDO a forma.
     5. FRAGMENTAÇÃO → ⚠ reinstrumente a camada certa.
     6. AMBIGUIDADE  → ⚠ instrumente o BACKEND (módulo 5).
     7. VOLUME       → ⚠ orçamento + rate limit.

  ✓ e as quatro de baixo entram na DECLARAÇÃO DE LACUNAS.
EXPL

cat > ~/detect-lab/regras/lacunas.yml <<'EOF'
# DECLARAÇÃO DE LACUNAS
# ⚠ toda regra declara o que NÃO pega
regra: <id da sua regra>

lacunas:
  - familia: 3 — aninhamento
    por_que: "a remoção do delimitador CRIA o padrão na leitura seguinte"
    contramedida: "rejeitar a forma, não sanitizar"
    status: ⚠ aberta

  - familia: 5 — fragmentação
    por_que: "o ataque é dividido entre camadas"
    contramedida: "instrumentar a camada do backend"
    status: ⚠ aberta (módulo 5)

  - familia: 6 — ambiguidade de framing
    por_que: "a regra está no frontend; o desync acontece no backend"
    contramedida: "correlacionar os dois logs"
    status: ⚠ aberta

  - familia: 7 — volume
    por_que: "não é assinatura; é o orçamento de triagem"
    contramedida: "rate limit + orçamento medido"
    status: ⚠ aberta

  - familia: 1 — encoding profundo
    por_que: "encadeamento além do número de decodificações imitado"
    contramedida: "nenhuma fiável"
    status: ⚠ ACEITA — declarada

⚠ o que esta declaração resolve:
  ela NÃO elimina a lacuna.
  ela torna a regra AUDITÁVEL.
  ✓ e o time sabe exatamente o que está comprando.
EOF

echo "  ── a declaração escrita ──"
cat ~/detect-lab/regras/lacunas.yml | head -20
echo
echo "  ⚠ e é isto que entra no relatório final."
```

⚠ **A declaração de lacunas é o entregável.** **E ela é honesta:** **quatro famílias ficam abertas, e
uma é **aceita** — porque não há contramedida fiável.**

⚠ **E a nota final é o valor da declaração:** **ela não elimina a lacuna; ela torna a regra
auditável.**

**Produza `declaracao-lacunas.md`:**

| Família | Contramedida | Status |
|---|---|---|
| Aninhamento | | |
| Framing | | |
| Volume | | |

**Responda:**

1. **Quais famílias você corrigiu?** Quais declarou?
2. **Qual família não tem contramedida fiável?
3. **Por que a declaração não elimina a lacuna?
4. **O que a declaração dá ao time?

### Passo 3 — Documente (45 min)

Produza `caderno/PD-009.md`:

```markdown
# PD-009 — as famílias de evasão

**Data:** ____

## 1. A regra testada
| Item | Valor |
|---|---|
| id | |
| família (módulo 3) | |
| versão | |

## 2. As sete famílias
| # | Família | Casa? | ⚠ Lacuna? |
|---|---|---|---|
| 1 | encoding 1× | | |
| 1 | encoding 2× | | |
| 2 | case | | |
| 3 | aninhamento | | |
| 4 | delimitador | | |
| 5 | fragmentação | | |
| 6 | ambiguidade | | |
| 7 | volume | | |

## 3. A resistência medida
| Item | Valor |
|---|---|
| famílias testáveis | |
| ⚠ pegas | |
| resistência | |

## 4. As que eu corrigi
| # | Família | Correção | ⚠ ΔFP |
|---|---|---|---|
| | | | |

## 5. ⚠ As que eu DECLAREI
| # | Família | Contramedida | Status |
|---|---|---|---|
| | | | |

## 6. ⚠ A família 6 — instrumentação
| Item | Valor |
|---|---|
| o que eu preciso ver | |
| está instrumentado? | |
| ⚠ lacuna de | detecção / instrumentação |

## 7. ⚠ A família 7 — o orçamento
| Item | Valor |
|---|---|
| alertas/dia (módulo 6) | |
| uso do orçamento | |
| ⚠ vulnerável a volume? | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não testei evasão contra alvo real
- [ ] não testei fora de 127.0.0.1
- [ ] não publiquei bypass
- [ ] não usei a evasão contra terceiro

## 9. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `relatorio-evasao.md`:**

```markdown
# Relatório — a evasão

## 1. A regra
| Item | Valor |
|---|---|
| id e família | |
| o que detecta | |

## 2. A resistência
| # | Família | Casa? |
|---|---|---|
| | | |

## 3. ⚠ O que a regra NÃO pega
| # | Família | Por quê | Status |
|---|---|---|---|
| | | | |

## 4. As correções aplicadas
| # | Correção | ΔFP | ΔFN |
|---|---|---|---|
| | | | |

## 5. ⚠ A declaração de lacunas
```
[cole o lacunas.yml]
```

## 6. As famílias que exigem outra camada
| Família | Onde resolver |
|---|---|
| 6 — ambiguidade | instrumentar o backend |
| 7 — volume | orçamento + rate limit |

## 7. ⚠ O que eu NÃO fiz
- [ ] não testei contra alvo real
- [ ] não testei fora de 127.0.0.1
- [ ] não publiquei bypass de produto vivo
- [ ] não usei a evasão para atacar
- [ ] não calculei severidade

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O que isso destrava
| # | Próxima ação | Prioridade |
```

**Produza `relatorio-evasao.md`:**

| Item | Valor |
|---|---|
| Resistência | |
| Lacunas declaradas | |
| Exigem outra camada | |
| O que não fiz | |

**Responda:**

1. **Qual a resistência da sua regra?
2. **Quantas lacunas ficaram abertas?
3. **Quais exigem outra camada** (instrumentação ou orçamento)?
4. **O que você declarou e não corrigiu?

### Critérios de aceitação

- `familias.md` com as **sete** famílias, o mecanismo e a defesa.
- Você explicou **quais não têm defesa por assinatura**.
- Você explicou **por que a família 7 é a mais eficaz**.
- Você explicou **o que a família 6 é, vista do detector**.
- `mapa.md` com as **sete** contramedidas e o custo de cada.
- Você identificou **qual contramedida é gratuita**.
- Você explicou **o que "rejeitar a forma" quebra**.
- Você explicou **por que o rate limit atinge o cliente importante**.
- `lacunas.md` com as **cinco** lacunas e o que fazer com cada.
- Você explicou **por que o ataque distribuído é o mais difícil**.
- Você explicou **por que declarar a lacuna torna a regra auditável**.
- `mede-familias.py` rodado, com a **resistência medida**.
- Você identificou **as famílias que derrubam** a sua regra.
- Você explicou **por que as famílias 6 e 7 não são testáveis** por payload.
- As **correções aplicadas** às famílias que se corrigem.
- A **declaração de lacunas** escrita, com as famílias abertas.
- Você explicou **a família que não tem contramedida fiável**.
- `caderno/PD-009.md` com as **nove** seções.
- `relatorio-evasao.md` com as **nove** seções.
- ⚠ **Nenhuma evasão usada contra alvo real.**

---

## Avaliação

1. **O que a evasão explora?** Por que não é criatividade?
2. **Cite as sete famílias** e o que cada uma explora.
3. **Quais atacam a forma?** Quais o parser?
4. **Qual ataca o time?** Por que é eficaz?
5. **Quais não têm defesa por assinatura?** Por quê?
6. **O que a família 6 é, vista do detector?
7. **Cite as sete contramedidas** e o custo de cada.
8. **Qual é gratuita?** Por quê?
9. **O que "rejeitar a forma" quebra?
10. **Por que o rate limit atinge o cliente legítimo?
11. **Cite as cinco lacunas que nenhuma regra cobre.
12. **Por que a forma válida escapa?
13. **Por que o aninhamento não se corrige?
14. **Por que o framing exige outra camada?
15. **Por que o ataque distribuído é o mais difícil?
16. **O que fazer com cada lacuna?** Cite três.
17. **O que a declaração de lacunas resolve?
18. **O que ela não resolve?
19. **Como se mede a resistência de uma regra?
20. **Por que as famílias 6 e 7 não são testáveis** por payload?

---

**Próximo:** [Módulo 10 — O detector que discorda](modulo-10.md)
