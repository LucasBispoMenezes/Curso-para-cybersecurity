# Módulo 5 — O Harness Diferencial

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 4 · curso de Fuzzing

---

## Objetivos

1. Escrever o **harness** que roda N implementações e detecta discordância.
2. Construir o **corpus de fronteira por ponto de divergência** — não aleatório.
3. **Automatizar** a comparação, e manter o julgamento (módulo 3) fora dela.
4. Escalar de **duas** para **N** implementações.
5. Produzir a **saída que alimenta o módulo 3** — a lista de candidatos classificáveis.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O harness não é um fuzzer.** **Um fuzzer procura crash; o harness procura DISCORDÂNCIA** — **e
> discordância é mais fácil de achar e mais difícil de julgar.**

⚠ **E a diferença, escrita:**

| Fuzzer | Harness diferencial |
|---|---|
| Procura **crash** | Procura **discordância** |
| Precisa de instrumentação | ⚠ **Não precisa** |
| Entrada aleatória, guiada | ⚠ **Entrada de FRONTEIRA** |
| Sinal binário | ⚠ **Sinal comparativo** |
| Pode rodar contra uma impl. | ⚠ **Precisa de N** |

⚠ **A tese:**

> **O harness é simples porque o sinal é simples:** **a mesma entrada, N saídas, e a comparação.**
> **O trabalho não está na detecção — está no corpus e no julgamento.**

⚠ **E é por isso que ele é um módulo, e não um script:** **o corpus é a parte pesquisada** — **e o
julgamento é o módulo 3.**

---

## 5.1 A arquitetura

⚠ **Cinco partes. E a parte 2 é onde o método vive.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. AS IMPLEMENTAÇÕES (módulo 4)                                       │
│    · N processos locais, isolados                                     │
├──────────────────────────────────────────────────────────────────────┤
│ 2. ⚠ O CORPUS — a parte pesquisada                                    │
│    · de FRONTEIRA, por ponto da carta (módulo 2)                      │
│    · não aleatório                                                    │
├──────────────────────────────────────────────────────────────────────┤
│ 3. O EXECUTOR                                                         │
│    · mesma entrada → N implementações                                 │
│    · timeout, captura, isolamento                                     │
├──────────────────────────────────────────────────────────────────────┤
│ 4. O NORMALIZADOR (módulo 4)                                          │
│    · remove o que o AMBIENTE introduz                                 │
│    · preserva o que o PARSER produz                                   │
├──────────────────────────────────────────────────────────────────────┤
│ 5. O COMPARADOR                                                       │
│    · agrupa por resultado                                             │
│    · ⚠ reporta a DISCORDÂNCIA — não o veredito                         │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A parte 2 é a que distingue o harness de um script.** **O corpus **não é aleatório**: ele é
derivado da **carta de divergência** do módulo 2** — **um caso por ponto.**

⚠ **E a parte 5 faz a coisa certa:** **reporta a discordância, e **não** o veredito.** **É a mesma
divisão do Patch Diffing:** **a ferramenta lista, o critério julga.**

⚠ **A tabela do que cada parte exige:**

| Parte | Exige | Se faltar |
|---|---|---|
| Implementações | builds locais | não há o que comparar |
| **Corpus** | ⚠ a carta (módulo 2) | fuzzing cego |
| Executor | timeout e isolamento | travamento |
| Normalizador | critério (módulo 4) | falsos positivos |
| Comparador | agrupamento | leitura manual |

⚠ **A regra escrita:**

> **A detecção é a parte fácil.** **Se o corpus é bom, a discordância aparece na primeira execução;
> se é ruim, cem mil execuções não acham nada.**

```bash
mkdir -p ~/parser-lab/mod05 && cd ~/parser-lab/mod05

echo "═══ 1. a arquitetura ═══"
echo
cat > arquitetura.md <<'EOF'
# A arquitetura do harness

| # | Parte | Exige | Se faltar |
|---|---|---|---|
| 1 | implementações | builds locais | nada a comparar |
| 2 | ⚠ CORPUS | a carta (módulo 2) | fuzzing cego |
| 3 | executor | timeout + isolamento | travamento |
| 4 | normalizador | critério (módulo 4) | falsos positivos |
| 5 | comparador | agrupamento | leitura manual |

## ⚠ o harness NÃO é um fuzzer
| Fuzzer | Harness diferencial |
|---|---|
| procura crash | procura DISCORDÂNCIA |
| precisa instrumentação | ⚠ não precisa |
| entrada aleatória | ⚠ entrada de FRONTEIRA |
| sinal binário | ⚠ sinal comparativo |
| roda contra UMA | ⚠ precisa de N |

## ⚠ a parte 2 é onde o método vive
o corpus NÃO é aleatório.
é derivado da CARTA DE DIVERGÊNCIA (módulo 2) —
um caso por PONTO.

## ⚠ e a parte 5 faz a coisa certa
reporta a DISCORDÂNCIA — não o veredito.
✓ a ferramenta lista, o critério (módulo 3) julga.

## ⚠ A REGRA
a detecção é a parte fácil.
se o corpus é bom, a discordância aparece na 1ª execução.
se é ruim, cem mil execuções não acham nada.
EOF

cat arquitetura.md
```

**Produza `arquitetura.md`:**

| # | Parte | Exige | Se faltar |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

**Responda:**

1. **Qual parte é onde o método vive?** Por quê?
2. **O que o comparador reporta?** E o que ele não reporta?
3. **Cite três diferenças** entre fuzzer e harness diferencial.
4. **Quando a discordância aparece**, se o corpus é bom?

---

## 5.2 O corpus de fronteira

⚠ **A parte pesquisada. E ela vem da carta, não da imaginação.**

| Fonte do caso | O que dá |
|---|---|
| **A carta (módulo 2)** | ⚠ **Um caso por ponto de divergência** |
| As fronteiras do campo | Limite, limite ± 1, máximo |
| Os casos ambíguos | ⚠ **Onde a spec não decide** |
| Os casos de extensão | `X-` que um ignora |
| Os casos de encoding | `%xx`, unicode, case |
| Os valores vazios / nulos | ⚠ Sempre |

⚠ **A tabela dos casos por tipo de ponto, e ela é o mapa do corpus:**

| Ponto (tipo, módulo 2) | Casos a incluir |
|---|---|
| **Silêncio** | ⚠ o caso não mencionado, e o malformado |
| `SHOULD` | o caso que a spec "recomenda" |
| `MAY` | ⚠ **a forma opcional e a canônica** |
| Ambiguidade | ⚠ **as duas leituras, na mesma entrada** |
| Limite | 0, 1, máx-1, máx, máx+1 |
| Ordem | o dado que exige normalizar **antes** |
| Extensão | ⚠ o campo que um ignora e o outro não |

⚠ **A linha da ambiguidade é a mais importante.** **Você não testa "uma entrada"** — **testa a
entrada que **admite duas leituras**, e vê cada implementação escolher uma.**

⚠ **E a linha do limite é a mesma do módulo 8 do Patch Diffing.** **O limite, o limite ± 1, o
máximo** — **é o corpus de fronteira, e ele é o que encontra.**

⚠ **A regra escrita:**

> **Um caso por ponto da carta.** **Se você tem doze pontos, tem doze casos** — **e o corpus é
> completo, não grande.**

⚠ **E a consequência é econômica:** **um corpus de 40 entradas bem escolhidas rende mais que um de
40 mil aleatórias** — **porque cada uma testa um ponto que a spec deixou em aberto.**

```bash
cd ~/parser-lab/mod05

echo "═══ 2. o corpus de fronteira ═══"
echo
cat > corpus.md <<'EOF'
# O corpus de fronteira

## De onde vem cada caso
| Fonte | O que dá |
|---|---|
| a CARTA (módulo 2) | ⚠ um caso por ponto |
| as fronteiras | limite, limite ± 1, máximo |
| os casos ambíguos | ⚠ onde a spec não decide |
| as extensões | `X-` que um ignora |
| os encodings | `%xx`, unicode, case |
| vazio / nulo | ⚠ sempre |

## Casos por tipo de ponto
| Tipo (módulo 2) | Casos |
|---|---|
| SILÊNCIO | o não mencionado, e o malformado |
| `SHOULD` | o caso "recomendado" |
| `MAY` | ⚠ a forma opcional E a canônica |
| AMBIGUIDADE | ⚠ as DUAS leituras, na mesma entrada |
| LIMITE | 0, 1, máx-1, máx, máx+1 |
| ORDEM | o dado que exige normalizar ANTES |
| EXTENSÃO | ⚠ o que um ignora, o outro não |

## Estrutura do arquivo
   corpus/<formato>/<ponto>.txt

## ⚠ A REGRA
um caso por ponto da carta.
se você tem 12 pontos, tem 12 casos.
✓ o corpus é COMPLETO, não grande.

## ⚠ e por isso é econômico
40 entradas bem escolhidas rendem mais que 40 mil aleatórias.
✓ porque cada uma testa um PONTO que a spec deixou em aberto.
EOF

cat corpus.md

echo
echo "═══ 3. as fronteiras, geradas ═══"
echo
cat > gera-fronteiras.py <<'PY'
#!/usr/bin/env python3
"""
gera-fronteiras.py — gera casos de FRONTEIRA para um campo.
⚠ não é aleatório: é o limite, o limite ± 1, e o máximo.
"""
import struct, sys

def fronteiras(tipo, limite=None):
    """valores de fronteira para um tipo"""
    casos = [0, 1]
    if "8" in tipo:   maxv = 0xFF
    elif "16" in tipo: maxv = 0xFFFF
    elif "32" in tipo: maxv = 0xFFFFFFFF
    else: maxv = 0xFFFF
    casos += [maxv - 1, maxv]
    if limite:
        casos += [limite - 1, limite, limite + 1]
    return sorted(set(c for c in casos if c >= 0))

def main():
    tipo = sys.argv[1] if len(sys.argv) > 1 else "16"
    limite = int(sys.argv[2]) if len(sys.argv) > 2 else None
    fmt = {"8": "B", "16": "H", "32": "I"}.get(tipo, "H")

    print(f"═══ FRONTEIRAS para uint{tipo} ═══")
    if limite: print(f"  limite declarado: {limite}")
    print()
    print(f"  {'valor':>12}  {'hex':<12} bytes")
    print("  " + "-"*40)
    for v in fronteiras(tipo, limite):
        b = struct.pack("<" + fmt, v)
        marca = " ⚠ limite+1" if limite and v == limite + 1 else (" ⚠ limite" if limite and v == limite else "")
        print(f"  {v:>12}  0x{v:0{len(fmt)*2}x}      {b.hex()}{marca}")
    print()
    print("  ✓ cada valor é um caso do corpus.")
    print("  ⚠ e o limite + 1 é o que testa off-by-one.")

if __name__ == "__main__":
    main()
PY

chmod +x gera-fronteiras.py
python3 gera-fronteiras.py 16 1024

echo
echo "═══ 4. o caso ambíguo — o mais importante ═══"
cat <<'EXPL'
  ── a entrada que ADMITE DUAS LEITURAS ──

     "1.234"
     · leitura 1: mil duzentos e trinta e quatro (ponto = milhar)
     · leitura 2: um vírgula duzentos e trinta e quatro (ponto = decimal)

     ✓ as duas são defensáveis, e a spec não decide.
     ⚠ é o tipo AMBIGUIDADE do módulo 2.

  ── e no HTTP (o módulo 6) ──

     "Content-Length: 6\r\nTransfer-Encoding: chunked"
     · leitura 1: o TE vence → ignora o CL
     · leitura 2: o CL vence → usa o CL

     ⚠ a MESMA ambiguidade, com consequência de segurança.

  ✓ o corpus precisa de UMA entrada por ambiguidade,
     e a implementação escolhe a leitura.
EXPL
```

⚠ **O gerador de fronteiras é o instrumento.** **E ele produz exatamente os valores que importam:**
**limite − 1, limite, limite + 1, máximo.** **Não há nada aleatório** — **e é por isso que
encontra.**

⚠ **E a nota do caso ambíguo é a ponte com o módulo 6.** **`1.234` e o par TE/CL são a **mesma
ambiguidade** — com consequências diferentes.** **É o mesmo mecanismo.**

**Produza `corpus-fronteira.md`:**

| Ponto | Casos | Fronteira? |
|---|---|---|
| | | |
| | | |
| | | |

**Responda:**

1. **Por que o corpus não é aleatório?**
2. **Quantos casos por ponto?**
3. **Qual caso é o mais importante?** Por quê?
4. **O que o `1.234` e o par TE/CL têm em comum?**

---

## 5.3 Escrevendo o harness

⚠ **Cinco partes, e o código é curto — porque a parte difícil é o corpus.**

⚠ **A tabela do que o harness precisa ter, e do que ele **não** precisa:**

| Precisa | **Não** precisa |
|---|---|
| Timeout | ⚠ Instrumentação |
| Isolamento | Cobertura |
| Normalização | Aprendizado |
| Agrupamento | Paralelismo (no começo) |
| ⚠ Registro literal | ⚠ **Veredito** |

⚠ **A última linha merece a ênfase.** **O harness **não** classifica.** **Ele dá a lista de
candidatos com a evidência literal** — **e o módulo 3 classifica.**

⚠ **A tabela dos cuidados:**

| Cuidado | Por quê |
|---|---|
| **Timeout por execução** | ⚠ Um parser travado para tudo |
| **Isolamento de processo** | Um crash não derruba o harness |
| **Saída literal registrada** | ⚠ É a evidência |
| **Código de retorno incluído** | ⚠ É comportamento |
| **Limite de tamanho** | Um parser imprime 2 GB |

⚠ **A linha do código de retorno é a que a maioria esquece.** **Um parser que retorna erro e outro
que retorna 0 **discordam** — mesmo que a saída de texto seja vazia nos dois.** **O código de
retorno é comportamento.**

⚠ **A regra escrita:**

> **O harness tem quatro garantias: não trava, não derruba, não inunda, e não mente.** **E a quarta
> é a normalização.**

```bash
cd ~/parser-lab/mod05

echo "═══ 5. o harness ═══"
echo
cat > harness.py <<'PY'
#!/usr/bin/env python3
"""
harness.py — roda N implementações na MESMA entrada e reporta DISCORDÂNCIAS.

⚠ as implementações são LOCAIS. nenhuma rede, nenhum terceiro.
⚠ ele NÃO classifica. a classificação é o módulo 3.
"""
import subprocess, sys, os, re, json, hashlib
from collections import defaultdict

# ─── as implementações (módulo 4) ───
IMPLS = [
    # (nome, comando, [argumentos extras])
    # ⚠ ajuste aos SEUS parsers
]

TIMEOUT = 5          # segundos por execução
MAX_SAIDA = 4096     # bytes de saída capturados


def normaliza(s: str) -> str:
    """remove o que o AMBIENTE introduz; preserva o que o PARSER produz (módulo 4)."""
    s = re.sub(r'/[\w/.\-]{3,}', '<PATH>', s)              # caminhos
    s = re.sub(r'\d{4}-\d{2}-\d{2}T[\d:.]+', '<TS>', s)    # timestamps ISO
    s = re.sub(r'\b0x[0-9a-f]{6,}\b', '<ADDR>', s)         # endereços
    s = re.sub(r'\s+', ' ', s)                             # espaços
    return s.strip()


def roda(nome, cmd, entrada: bytes):
    """executa UMA implementação, com as quatro garantias."""
    try:
        p = subprocess.run(
            cmd, input=entrada,
            capture_output=True, timeout=TIMEOUT,
        )
        saida = p.stdout[:MAX_SAIDA].decode(errors="replace")
        err = p.stderr[:512].decode(errors="replace")
        return {
            "rc": p.returncode,
            "out": normaliza(saida),
            "err": normaliza(err),
        }
    except subprocess.TimeoutExpired:
        return {"rc": "TIMEOUT", "out": "", "err": ""}
    except Exception as e:
        return {"rc": f"ERR:{type(e).__name__}", "out": "", "err": ""}


def assinatura(r) -> str:
    """a assinatura COMPORTAMENTAL: código de retorno + saída normalizada."""
    base = f"rc={r['rc']}|out={r['out']}"
    return hashlib.sha256(base.encode()).hexdigest()[:12]


def main():
    if not IMPLS:
        print("⚠ configure IMPLS com os SEUS parsers (módulo 4).")
        print()
        print("  exemplo:")
        print('    IMPLS = [')
        print('        ("stdlib",  ["python3", "p_csv.py"]),')
        print('        ("manual",  ["python3", "p_manual.py"]),')
        print('    ]')
        sys.exit(2)

    corpus = sys.argv[1] if len(sys.argv) > 1 else None
    if not corpus:
        print("uso: harness.py <corpus>")
        sys.exit(2)

    with open(corpus, "rb") as f:
        entradas = [l.rstrip(b"\n") for l in f if l.strip()]

    print("═══ HARNESS DIFERENCIAL ═══")
    print()
    print(f"  implementações : {len(IMPLS)}")
    print(f"  corpus         : {len(entradas)} entradas")
    print()

    candidatos = []
    for i, ent in enumerate(entradas):
        resultados = {}
        for nome, cmd, *extra in IMPLS:
            resultados[nome] = roda(nome, cmd + (extra[0] if extra else []), ent)

        grupos = defaultdict(list)
        for nome, r in resultados.items():
            grupos[assinatura(r)].append(nome)

        if len(grupos) > 1:
            candidatos.append((i, ent, resultados, grupos))

    print(f"  ⚠ DISCORDÂNCIAS : {len(candidatos)} de {len(entradas)}")
    print()
    print("  " + "="*72)
    for i, ent, resultados, grupos in candidatos:
        print(f"  #{i}  entrada: {ent[:60]!r}")
        for gid, nomes in grupos.items():
            print(f"      grupo [{gid}]: {', '.join(nomes)}")
            r = resultados[nomes[0]]
            print(f"        rc={r['rc']}  out={r['out'][:56]!r}")
        print("  " + "-"*72)

    print()
    print("═══ O QUE FAZER COM ISTO ═══")
    print("  ⚠ isto NÃO é a lista de bugs. é a lista de CANDIDATOS.")
    print("     · cada discordância passa pela CASCATA (módulo 3):")
    print("       Q1 a spec decide? Q2 as duas seguem? Q3 quais violam?")
    print("     · e pelas cinco perguntas (alcançável? camada? impacto? explorável?)")
    print("  ✓ e o destino: categoria 2 → dono da spec; categoria 3 → mantenedor.")


if __name__ == "__main__":
    main()
PY

chmod +x harness.py

echo "  ⚠ o harness está pronto. configure IMPLS com os SEUS parsers."
echo
echo "  ── e ele NÃO classifica. veja a nota final dele: ──"
tail -8 harness.py | sed 's/^/     /'

echo
echo "═══ 6. escalando de 2 para N ═══"
cat <<'EXPL'
  ── o harness é o MESMO com 2 ou com 10 implementações ──
     · a lista IMPLS cresce
     · o resto não muda

  ── e é aqui que o método escala ──
     ⚠ 2 implementações  → o diferencial
     ⚠ 10 implementações → o HTTP Garden (módulo 7)

  ── e o que cresce com N ──
     · o tempo de execução (N × corpus)
     · e o número de candidatos (mais grupos)

  ✓ mas o corpus continua o mesmo: um caso por PONTO.
EXPL
```

⚠ **O harness é curto porque a parte difícil é o corpus.** **E as quatro garantias — timeout,
isolamento, limite de saída, normalização — são o que o torna utilizável.**

⚠ **E a nota final do script é o que preserva o método:** **ele dá os **candidatos**, e a
classificação é o módulo 3.** **É o mesmo desenho do Patch Diffing.**

**Produza `harness.md`:**

| Garantia | Como |
|---|---|
| Não trava | |
| Não derruba | |
| Não inunda | |
| Não mente | |

**Responda:**

1. **Quais são as quatro garantias?**
2. **Por que o código de retorno entra na assinatura?**
3. **O que o harness **não** faz?** Por quê?
4. **O que muda** ao escalar de 2 para N?

---

## 5.4 O que o harness não faz

⚠ **A lista do que fica fora — e ela é o critério do módulo 3.**

| Fora do harness | Onde |
|---|---|
| Classificar (categoria 1/2/3) | ⚠ **Módulo 3** |
| Julgar se é bug | ⚠ **Módulo 3** |
| Saber qual está certa | ⚠ **Leitura da spec** |
| Medir o impacto | Módulo 3, pergunta 4 |
| Confirmar explorabilidade | ⚠ **Módulo 3, pergunta 5** |
| Reportar | Módulo 10 |

⚠ **A razão de tudo estar fora é a mesma:** **o harness **detecta**; o pesquisador **julga**.** **E
deixar o julgamento dentro do código é como escrever o veredito no fuzzer** — **ele automatiza o
que não é automático.**

⚠ **E a consequência é o alerta do módulo 6:** **um harness que classifica automaticamente produz
falsos positivos em volume** — **e queima a credibilidade.**

⚠ **A regra escrita:**

> **A automação para na detecção.** **Da detecção para a conclusão há uma cascata de julgamento**
> **que não se codifica** — **e é o que o curso treina.**

```bash
cd ~/parser-lab/mod05

echo "═══ 7. o que fica fora ═══"
echo
cat > fora.md <<'EOF'
# O que o harness NÃO faz

| Fora | Onde |
|---|---|
| classificar (1/2/3) | ⚠ módulo 3 |
| julgar se é bug | ⚠ módulo 3 |
| saber qual está certa | a leitura da spec |
| medir o impacto | módulo 3, pergunta 4 |
| confirmar explorabilidade | ⚠ módulo 3, pergunta 5 |
| reportar | módulo 10 |

## ⚠ por que TUDO fica fora
o harness DETECTA. o pesquisador JULGA.
deixar o julgamento no código é escrever o veredito no fuzzer —
✓ ele automatiza o que NÃO é automático.

## ⚠ a consequência
um harness que classifica sozinho produz falsos positivos em volume.
e isso QUEIMA a credibilidade.

## ⚠ A REGRA
a automação para na DETECÇÃO.
da detecção para a conclusão há uma cascata de julgamento
que NÃO se codifica.
✓ e é o que o curso treina.
EOF

cat fora.md
```

**Produza `fora.md`:**

| Fora do harness | Onde fica |
|---|---|
| | |
| | |

**Responda:**

1. **Onde a automação para?**
2. **Por que não codificar a classificação?**
3. **Qual a consequência** de um harness que classifica?
4. **O que fica fora do harness, no total?**

---

## 5.5 LAB — O harness completo

**Duração:** 150 min

### Passo 1 — Construa o corpus (50 min)

⚠ **Um caso por ponto da carta (módulo 2).**

```bash
cd ~/parser-lab/mod05

echo "═══ CONSTRUINDO O CORPUS ═══"
echo
cat <<'EXPL'
  ── PONTO A PONTO, DA SUA CARTA ──

     para cada ponto do módulo 2:
       1. escreva a entrada que O EXERCITA
       2. ⚠ e se o ponto é AMBIGUIDADE, a entrada admite DUAS leituras
       3. e se o ponto é LIMITE, inclua limite-1, limite, limite+1
       4. registre o ponto no nome do caso

  ── ESTRUTURA ──
     corpus/<formato>/<ponto>.txt
     ex.: corpus/csv/aspas-soltas.txt
          corpus/csv/crlf.txt
          corpus/csv/espaco-apos-virgula.txt
EXPL

mkdir -p ~/parser-lab/corpus/csv

cat > ~/parser-lab/corpus/csv/aspas-soltas.txt <<'EOF'
"a""b",c
"aspas soltas,b
a",b
""
EOF

cat > ~/parser-lab/corpus/csv/crlf.txt <<'EOF'
a,b
c,d
EOF

printf 'a,b\r\nc,d\r\n' > ~/parser-lab/corpus/csv/crlf-real.txt

cat > ~/parser-lab/corpus/csv/espaco.txt <<'EOF'
a, b, c
a ,b, c
 a,b,c
EOF

cat > ~/parser-lab/corpus/csv/vazio.txt <<'EOF'

a,,c
,,
EOF

echo "  ── o corpus criado ──"
for f in ~/parser-lab/corpus/csv/*.txt; do
    printf '     %-40s %s bytes\n' "$(basename "$f")" "$(stat -c %s "$f")"
done
echo

echo "═══ CADA CASO → UM PONTO ═══"
cat > ~/parser-lab/corpus/csv/MAPA.md <<'EOF'
# Mapa do corpus → pontos de divergência

| Caso | Ponto (módulo 2) | Tipo | Por que a spec não decide |
|---|---|---|---|
| aspas-soltas.txt | aspas não escapadas | 1 silêncio | a RFC não trata |
| crlf.txt | LF sozinho | 2 `should` | a RFC pede CRLF |
| crlf-real.txt | CRLF correto | — | controle |
| espaco.txt | espaço após vírgula | 6 ordem | não diz se o campo inclui |
| vazio.txt | campo vazio / linha vazia | 1 silêncio | não trata |
EOF

cat ~/parser-lab/corpus/csv/MAPA.md
```

⚠ **O `MAPA.md` é o que distingue o corpus pesquisado do corpus aleatório.** **Cada arquivo aponta
para um ponto, e o ponto aponta para a spec.** **É a rastreabilidade.**

⚠ **E a linha "controle" do `crlf-real` é importante.** **Você precisa de casos em que **todos
concordam** — **senão não sabe se o harness funciona.**

**Produza `corpus-construido.md`:**

| Caso | Ponto | Tipo | Rastreável? |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

**Responda:**

1. **Quantos casos você criou?**
2. **Cada um aponta para um ponto?**
3. **Qual é o caso de controle?** Por que ele existe?
4. **Qual caso admite duas leituras?**

### Passo 2 — Configure e rode o harness (55 min)

⚠ **Configure `IMPLS` com os **seus** parsers e rode.**

```bash
cd ~/parser-lab/mod05

echo "═══ CONFIGURANDO O HARNESS ═══"
echo

# copia o harness com IMPLS configurado para o lab do módulo 4
sed 's|^IMPLS = \[\]|IMPLS = [\n    ("stdlib", ["python3", "p_csv.py"]),\n    ("manual", ["python3", "p_manual.py"]),\n]|' \
    harness.py > harness-csv.py
chmod +x harness-csv.py

echo "  ── rodando no corpus do CSV ──"
echo
cd ~/parser-lab/impls/csv 2>/dev/null && {
    python3 ~/parser-lab/mod05/harness-csv.py ~/parser-lab/corpus/csv/aspas-soltas.txt 2>&1 | head -30
    echo
    echo "  ═══ e no corpus todo ═══"
    cat ~/parser-lab/corpus/csv/*.txt > /tmp/corpus-completo.txt
    python3 ~/parser-lab/mod05/harness-csv.py /tmp/corpus-completo.txt 2>&1 | head -18
} || echo "  ⚠ o lab do módulo 4 não existe — rode o módulo 4"
```

Produza `harness-rodado.md`:

| Métrica | Valor |
|---|---|
| Implementações | |
| Entradas | |
| **Discordâncias** | |
| Proporção | |

**Responda:**

1. **Quantas discordâncias o harness achou?**
2. **Qual entrada deu mais grupos?** Por quê?
3. **Os casos de controle concordaram?**
4. **Alguma discordância é sobre framing?**

### Passo 3 — Leve os candidatos para o módulo 3 (45 min)

⚠ **O harness deu os candidatos. Agora a cascata.**

```bash
cd ~/parser-lab/mod05

echo "═══ DO CANDIDATO AO VEREDITO ═══"
echo
cat <<'EXPL'
  ── para CADA candidato do harness ──

     Q1: a spec DECIDE este caso?
         → NÃO = categoria 2 (vai ao dono da spec)
         → SIM = Q2
     Q2: as DUAS seguem a spec?
         → SIM = categoria 1 (nada a reportar)
         → NÃO = Q3
     Q3: quais violam?
         → uma/duas = categoria 3 (vai ao mantenedor)

     E as cinco perguntas (módulo 3):
     alcançável? · camada normaliza? · impacto? · explorável?

  ⚠ e NADA disto está no harness. é o seu trabalho.
EXPL

cat > caderno/PD-005.md <<'EOF'
# PD-005 — do candidato ao veredito

**Data:** ____

## 1. O harness
| Item | Valor |
|---|---|
| Implementações | |
| Corpus | |
| Discordâncias | |

## 2. Cada candidato
| # | Entrada | Grupo A | Grupo B | Q1 | Q2 | Categoria |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

## 3. As cinco perguntas (só para candidatas de categoria 3)
| # | Alcançável? | Camada? | Impacto? | Explorável? | Veredito |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |

## 4. A consequência objetiva
| # | Discordância sobre | Consequência | Habilita |
|---|---|---|---|
| 1 | | | |

## 5. O que o harness NÃO viu
| # | O que ficou fora | Por quê |
|---|---|---|
| 1 | classificação | é o módulo 3 |
| 2 | | |

## 6. O que NÃO foi verificado
⚠ mínimo 3

## 7. O que isso destrava
| # | Próxima pergunta | Prioridade |
EOF

cat caderno/PD-005.md | head -28
```

Produza `vereditos.md`:

| # | Entrada | Categoria | Destino |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. **Quantos candidatos viraram categoria 3?**
2. **Algum é categoria 2?** Vai a quem?
3. **Algum tem consequência objetiva?**
4. **O que o harness não viu** que você viu?

### Critérios de aceitação

- `arquitetura.md` com as **cinco** partes e o que cada uma exige.
- Você explicou **onde o método vive**.
- Você explicou **o que o comparador reporta** e o que não.
- Você citou **três diferenças** entre fuzzer e harness.
- `corpus.md` com os **sete** tipos de ponto e os casos de cada.
- Você explicou **o que é o caso ambíguo** e por que é o mais importante.
- `gera-fronteiras.py` rodando, com limite e limite ± 1.
- Você explicou **o que o `1.234` e o TE/CL têm em comum**.
- `harness.md` com as **quatro** garantias.
- Você explicou **por que o código de retorno entra na assinatura**.
- `fora.md` com o que fica fora — e onde fica.
- Você explicou **onde a automação para**.
- `~/parser-lab/corpus/csv/MAPA.md` criado, com **um caso por ponto**.
- Você identificou **o caso de controle** e explicou por que existe.
- O harness rodou com **as suas** implementações.
- Você mediu **a proporção de discordâncias**.
- Os candidatos passaram pela **cascata do módulo 3**.
- Você identificou **o que o harness não viu**.
- ⚠ **Nenhum serviço de terceiro.**

---

## Avaliação

1. **Por que o harness não é um fuzzer?**
2. **Cite três diferenças** entre os dois.
3. **Cite as cinco partes** do harness.
4. **Qual parte é onde o método vive?** Por quê?
5. **O que o comparador reporta?** E o que não?
6. **Cite as quatro garantias** do harness.
7. **Qual é a quarta?** Por que ela importa?
8. **Por que o código de retorno entra na assinatura?**
9. **De onde vem o corpus?**
10. **Por que o corpus não é aleatório?**
11. **Quantos casos por ponto?** Por quê?
12. **Cite os sete tipos de ponto** e um caso de cada.
13. **O que é o caso ambíguo?** Por que é o mais importante?
14. **Quais valores de fronteira** sempre entram?
15. **Qual valor testa off-by-one?** Por quê?
16. **O que `1.234` e TE/CL têm em comum?**
17. **O que fica fora do harness?** Cite cinco.
18. **Onde a automação para?** Por quê?
19. **Qual a consequência** de um harness que classifica?
20. **O que muda** ao escalar de 2 para N implementações?

---

**Próximo:** [Módulo 6 — Framing](modulo-06.md)
