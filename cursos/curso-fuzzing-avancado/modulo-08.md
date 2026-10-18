# Módulo 8 — Dirigido: O `1dFuzz`

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 7 · Patch Diffing (módulo 7)

---

## Objetivos

1. Entender por que o **fuzzing cego gasta orçamento em código irrelevante**.
2. Conhecer as **três formas de dirigir**: por posição, por distância, por seed.
3. Aplicar o método do **`1dFuzz`** — a posição do patch como guia.
4. **Medir** o ganho — tempos e achados.
5. Reconhecer quando dirigir **não vale** — e por quê.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Um fuzzer cego explora tudo com o mesmo esforço.** **E "tudo" é vasto** — **e a maioria do
> código não tem o bug que você procura.**

⚠ **E é a razão de o `1dFuzz` existir.** **Ele não fuzza o programa; fuzza **o caminho até o
patch**.** **E o número medido é o argumento:**

| Métrica | Ganho |
|---|---|
| Achados | ⚠ **2,26× mais** |
| Tempo | ⚠ **43% menos** |

⚠ **A tese:**

> **Se você sabe onde o bug está, não fuzze o resto.** **E o patch te diz onde** — **porque o patch
> é a documentação do bug** (Patch Diffing, módulo 1).

⚠ **A tabela das três formas de dirigir:**

| Forma | A informação vem de | ⚠ Exige |
|---|---|---|
| **Por posição** | ⚠ **O patch** | ⚠ **Um patch** |
| **Por distância** | ⚠ **A sequência de chamadas** | ⚠ Análise |
| **Por seed** | ⚠ **Um corpus que alcança** | ⚠ Conhecer o formato |

⚠ **A linha 3 é a que você **já fez** nos módulos 5 e 6.** **O corpus de fronteira e a gramática
**são** fuzzing dirigido** — **só que dirigido pelo formato, e não pelo patch.**

---

## 8.1 O custo do cego

⚠ **O problema, em números. E ele é concreto.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ UM PROGRAMA DE 100.000 LINHAS                                        │
│                                                                      │
│   · o bug está em 20 linhas                                          │
│   · ⚠ a entrada precisa chegar a essas 20                            │
│   · e o fuzzer cego explora TODAS as outras 99.980                   │
│                                                                      │
│   ⚠ e a maior parte do orçamento é gasta em código             │
│     que NÃO tem o bug                                                │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **E a tabela do que o fuzzer cego gasta:**

| Onde o esforço vai | ⚠ Útil? |
|---|---|
| Inicialização | ⚠ Não |
| Parsing genérico | ⚠ Às vezes |
| Caminhos sem o bug | ⚠ **Não** |
| ⚠ **O caminho até o bug** | ⚠ **Só aí importa** |
| Verificação de versão | Não |

⚠ **A tabela é o argumento do módulo 11.** **A maior parte do orçamento é desperdiçada** — **e o
dirigido não torna o fuzzer mais rápido: torna o esforço melhor alocado.**

⚠ **A regra escrita:**

> **Dirigir não acelera o fuzzer; ele muda onde o fuzzer olha.** **E o ganho vem de não gastar em
> código que você sabe que não tem o bug.**

```bash
mkdir -p ~/fuzz-lab/mod08 && cd ~/fuzz-lab/mod08

echo "═══ 1. o custo do cego ═══"
echo
cat > cego.md <<'EOF'
# O custo do cego

## O programa de 100.000 linhas
| Item | Valor |
|---|---|
| o bug está em | 20 linhas |
| ⚠ a entrada precisa CHEGAR lá | |
| o fuzzer cego explora | ⚠ as outras 99.980 |

## Onde o esforço vai
| Onde | Útil? |
|---|---|
| inicialização | ⚠ não |
| parsing genérico | ⚠ às vezes |
| caminhos SEM o bug | ⚠ NÃO |
| ⚠ o caminho ATÉ o bug | ⚠ SÓ AÍ IMPORTA |
| verificação de versão | não |

## ⚠ e não é sobre velocidade
dirigir não torna o fuzzer mais RÁPIDO.
ele torna o esforço MELHOR ALOCADO.
✓ o ganho vem de NÃO GASTAR em código que você
   sabe que NÃO TEM o bug.

## ⚠ A REGRA
dirigir não acelera o fuzzer;
ele muda ONDE o fuzzer olha.
EOF

cat cego.md

echo
echo "═══ 2. as três formas de dirigir ═══"
echo
cat <<'EXPL'
  ── A) POR POSIÇÃO (o 1dFuzz) ──
     ⚠ você sabe ONDE o patch foi aplicado.
     · o patch de segurança tocou a função X
     · ⚠ então o fuzzer deve tentar ALCANÇAR X
     ✓ e o resto do programa vira secundário.

  ── B) POR DISTÂNCIA ──
     ⚠ você mede QUÃO PERTO a execução chegou do alvo.
     · a "trailing call sequence" (TCS) do 1dFuzz
     · ⚠ e o fuzzer prefere a entrada que chegou mais perto
     ✓ é o mecanismo interno do 1dFuzz.

  ── C) POR SEED ──
     ⚠ você dá ao fuzzer uma entrada que JÁ ALCANÇA o alvo.
     · o corpus de fronteira (módulo 5)
     · a gramática (módulo 6)
     ✓ é a forma mais simples — e você já fez.

  ✓ e a C é o pré-requisito da A e da B:
     sem uma seed que alcança, o fuzzer nem chega perto.
EXPL
```

⚠ **As três formas são o mapa.** **E a nota da C é a ligação com os módulos anteriores:** **o corpus
de fronteira **é** fuzzing dirigido** — **só que dirigido pelo formato.**

⚠ **E a B é o mecanismo interno do `1dFuzz`:** **a "trailing call sequence"** — **a medida de quão
perto a execução chegou.**

**Produza `dirigir.md`:**

| Forma | Informação vem de | Exige |
|---|---|---|
| Por posição | | |
| Por distância | | |
| Por seed | | |

**Responda:**

1. **Por que o fuzzer cego desperdiça orçamento?
2. **O que o dirigido muda?** Velocidade ou alocação?
3. **Qual forma você já fez** nos módulos 5 e 6?
4. **O que é a trailing call sequence?

---

## 8.2 O método do `1dFuzz`

⚠ **O método, em cinco passos. E o passo 2 é o achado técnico.**

| # | Passo | O que fazer |
|---|---|---|
| 1 | **Localize o patch** | ⚠ **A função (Patch Diffing, módulo 7)** |
| 2 | ⚠ **Meça a distância até ela** | ⚠ **A sequência de chamadas** |
| 3 | **Direcione o fuzzer** | ⚠ **Prefira o que chega mais perto** |
| 4 | **Reproduza** | O bug do 1-day |
| 5 | **Confirme** | ⚠ **O comportamento difere?** |

⚠ **A linha 2 é o mecanismo.** **A "trailing call sequence" mede **quantas chamadas faltam** para
chegar à função do patch** — **e o fuzzer prefere as entradas que reduzem essa distância.**

⚠ **A tabela da medida de distância:**

| Entrada | Chamadas até o alvo | ⚠ Preferida? |
|---|---|---|
| Nem chega ao parser | ∞ | ⚠ Não |
| Chega ao parser | 5 | ⚠ Pouco |
| Chega na função vizinha | ⚠ **2** | ⚠ **Sim** |
| ⚠ **Chega na função do patch** | ⚠ **0** | ⚠⚠ **Alvo** |

⚠ **A linha 3 é o valor da técnica.** **Sem ela, o fuzzer trata "chegou ao parser" e "chegou na
função do patch" como iguais** — **porque ambos visitaram um bloco novo.**

⚠ **E é a diferença da cobertura de comparações (módulo 4):** **a de blocos diz "visitou"; a de
distância diz "chegou perto".**

⚠ **A regra escrita:**

> **A distância é uma cobertura com direção.** **A cobertura comum diz "você passou por ali"; a
> distância diz "você está a duas chamadas do alvo"** — **e é essa que o fuzzer deve minimizar.**

```bash
cd ~/fuzz-lab/mod08

echo "═══ 3. o método, em cinco passos ═══"
echo
cat > metodo.md <<'EOF'
# O método do 1dFuzz

| # | Passo | O que fazer |
|---|---|---|
| 1 | LOCALIZE o patch | a função (Patch Diffing, módulo 7) |
| 2 | ⚠ MEÇA a distância | ⚠ a SEQUÊNCIA de chamadas |
| 3 | DIRECIONE o fuzzer | ⚠ prefira o que chega mais perto |
| 4 | REPRODUZA | o bug do 1-day |
| 5 | CONFIRME | ⚠ o comportamento difere? |

## A medida de distância
| Entrada | Chamadas até o alvo | Preferida? |
|---|---|---|
| nem chega ao parser | ∞ | ⚠ não |
| chega ao parser | 5 | ⚠ pouco |
| chega na função VIZINHA | ⚠ 2 | ⚠ SIM |
| ⚠ chega na FUNÇÃO DO PATCH | ⚠ 0 | ⚠⚠ ALVO |

## ⚠ a linha 3 é o valor da técnica
sem ela, o fuzzer trata "chegou ao parser" e
"chegou na função do patch" como IGUAIS —
porque AMBOS visitaram um bloco novo.

## ⚠ e é a diferença para a cobertura de comparações
a de BLOCOS diz "visitou".
a de DISTÂNCIA diz "CHEGOU PERTO".

## ⚠ A REGRA
a distância é uma cobertura COM DIREÇÃO.
a comum diz "você passou por ali";
a distância diz "você está a DUAS CHAMADAS do alvo".
✓ e é essa que o fuzzer deve MINIMIZAR.
EOF

cat metodo.md

echo
echo "═══ 4. medindo a distância até o alvo ═══"
echo
cat > mede-distancia.py <<'PY'
#!/usr/bin/env python3
"""
mede-distancia.py — quão PERTO a entrada chega da função do patch?

⚠ DIDÁTICO. simula a "trailing call sequence" do 1dFuzz.

   ⚠ o alvo e as funções são os SEUS — nenhum serviço de terceiro.
"""
import re, sys, os, struct

# ── a sequência de chamadas, por entrada (simulada) ──
#    ⚠ no 1dFuzz real, isso vem da INSTRUMENTAÇÃO do alvo.
def traco(entrada: bytes) -> list:
    """retorna a sequência de funções que a entrada alcança"""
    if len(entrada) < 6:
        return ["main"]

    count = struct.unpack("<H", entrada[:2])[0]

    # ⚠ a cadeia de chamadas do alvo do curso
    seq = ["main", "parse"]
    if count > 1024:
        seq.append("valida_faixa")        # ⚠ FRONTEIRA 1
        return seq
    seq.append("calcula_total")
    if count * 4 > 64:
        seq.append("valida_destino")      # ⚠ FRONTEIRA 2
        return seq
    seq.append("copia_dados")             # ⚠ ONDE ESTÁ O BUG
    return seq


# ── a função do patch (o alvo) ──
ALVO = "copia_dados"


def distancia(entrada: bytes) -> int:
    """quantas chamadas faltam para chegar ao ALVO"""
    seq = traco(entrada)
    if ALVO in seq:
        return 0                              # ⚠ chegou
    return 999


def main():
    print("═══ MEDINDO A DISTÂNCIA ═══")
    print()
    print(f"  ⚠ o alvo é a função: {ALVO}")
    print()

    casos = [
        ("curta demais",       b"A" * 4),
        ("count = 0",          struct.pack("<H", 0) + b"\x00" * 4 + b"A" * 8),
        ("count = 4",          struct.pack("<H", 4) + struct.pack("<I", 16) + b"A" * 16),
        ("count = 16",         struct.pack("<H", 16) + struct.pack("<I", 64) + b"A" * 4),
        ("count = 1024",       struct.pack("<H", 1024) + b"\x00" * 4 + b"A" * 8),
        ("count = 1025",       struct.pack("<H", 1025) + b"\x00" * 4 + b"A" * 8),
    ]

    print(f"  {'caso':<16} {'sequência alcançada':<44} {'dist.':<7}")
    print("  " + "-"*72)
    for nome, entrada in casos:
        seq = traco(entrada)
        d = distancia(entrada)
        marca = "⚠ CHEGOU" if d == 0 else "        "
        print(f"  {nome:<16} {' → '.join(seq):<44} {d:<7} {marca}")

    print()
    print("  ═══ COMO O 1dFUZZ USA ISSO ═══")
    print("  · cada entrada tem uma DISTÂNCIA até o alvo")
    print("  · ⚠ o fuzzer PREFERE as que reduzem a distância")
    print("  ✓ e o corpus migra para perto do alvo — sozinho")
    print()
    print("  ⚠ e note: 'count = 16' CHEGA, e as outras fronteiras NÃO.")
    print("     ✓ é essa preferência que o dirigido instala.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-distancia.py
python3 mede-distancia.py
```

⚠ **O medidor de distância é o instrumento.** **E a saída mostra o que a técnica faz:** **cada
entrada tem uma distância até o alvo** — **e o fuzzer prefere as que reduzem.**

⚠ **E a nota final é a mais importante:** **`count = 16` chega ao alvo; `count = 1025` não.** **E é
essa preferência que o dirigido instala** — **sozinho.**

**Produza `distancia.md`:**

| Caso | Sequência | Distância |
|---|---|---|
| `count = 16` | | |
| `count = 1025` | | |

**Responda:**

1. **Qual entrada chega ao alvo?** Qual não?
2. **Por que `count = 16` chega e `count = 1025` não?
3. **O que o fuzzer faz com a distância?
4. **Por que isso é uma cobertura "com direção"?

---

## 8.3 Quando dirigir não vale

⚠ **A parte honesta: há casos em que dirigir **piora** as coisas.**

| Situação | ⚠ Dirigir? |
|---|---|
| Você sabe o alvo | ✓ **Sim** |
| ⚠ **Você não sabe onde o bug está** | ⚠ **Não** |
| O alvo é uma biblioteca usada em N lugares | ⚠ Depende |
| ⚠ **Você quer bugs em toda a superfície** | ⚠ **Não** |
| Você só tem um alvo suspeito | ✓ Sim |

⚠ **A segunda linha é a que evita o erro.** **Se você não sabe onde o bug está, dirigir significa
**escolher um alvo no escuro** — **e você gasta o orçamento num lugar que pode estar vazio.**

⚠ **E a tabela do que dirigir custa:**

| Custo | Valor |
|---|---|
| ⚠ **Localizar o patch** | ⚠ **Horas** |
| Implementar a medida de distância | ⚠ Horas a dias |
| ⚠ **Manter a instrumentação** | ⚠ Constante |
| Risco de escolher o alvo errado | ⚠ Alto |

⚠ **A última linha é o risco real.** **E a mitigação é simples:** **rode as duas campanhas** — **a
cega e a dirigida** — **e compare.** **Se a dirigida não rende 2×, não valeu o esforço.**

⚠ **A regra escrita:**

> **Dirigir é um investimento, e ele tem retorno incerto.** **Você só sabe se valeu depois** — **e
> a forma de saber é rodar as duas e comparar.**

```bash
cd ~/fuzz-lab/mod08

echo "═══ 5. quando dirigir não vale ═══"
echo
cat > quando-nao.md <<'EOF'
# Quando dirigir não vale

| Situação | Dirigir? |
|---|---|
| você SABE o alvo | ✓ SIM |
| ⚠ você NÃO sabe onde o bug está | ⚠ NÃO |
| o alvo é biblioteca usada em N lugares | ⚠ depende |
| ⚠ você quer bugs em TODA a superfície | ⚠ NÃO |
| você só tem um alvo suspeito | ✓ sim |

## ⚠ a segunda linha evita o erro
se você não sabe onde o bug está, dirigir significa
ESCOLHER UM ALVO NO ESCURO —
e você gasta o orçamento num lugar que pode estar VAZIO.

## O que dirigir custa
| Custo | Valor |
|---|---|
| ⚠ LOCALIZAR o patch | ⚠ HORAS |
| implementar a medida de distância | horas a dias |
| ⚠ MANTER a instrumentação | ⚠ constante |
| ⚠ risco de escolher o alvo errado | ⚠ ALTO |

## ⚠ e a mitigação
rode as DUAS campanhas — a cega e a dirigida — e compare.
✓ se a dirigida não rende 2×, não valeu o esforço.

## ⚠ A REGRA
dirigir é um INVESTIMENTO, e ele tem retorno INCERTO.
você só sabe se valeu DEPOIS —
e a forma de saber é RODAR AS DUAS E COMPARAR.
EOF

cat quando-nao.md

echo
echo "═══ 6. o comparador de campanhas ═══"
echo
cat > compara-campanhas.sh <<'SCRIPT'
#!/usr/bin/env bash
# compara-campanhas.sh — a cega × a dirigida, no MESMO tempo
set -uo pipefail

FUZZER="${1:?uso: compara-campanhas.sh <fuzzer> <corpus-cego> <corpus-dirigido>}"
CEGO="${2:?informe o corpus cego}"
DIRIG="${3:?informe o corpus dirigido}"
SEG="${4:-60}"

roda() {
    local corpus="$1" nome="$2"
    echo "  ═══ $nome ═══"
    timeout $((SEG + 10)) "$FUZZER" "$corpus" -max_total_time="$SEG" 2>&1 | \
        grep -E 'cov:|DONE|stat::number_of_executed_units|stat::average_exec_per_sec|ERROR|crash' | \
        tail -8 | sed 's/^/     /'
    echo
}

echo "═══════════ CEGA × DIRIGIDA ═══════════"
echo "  tempo por campanha: ${SEG}s"
echo
roda "$CEGO" "A) CEGA"
roda "$DIRIG" "B) DIRIGIDA"

echo "  ═══ A COMPARAÇÃO ═══"
cat <<'EXPL'
  ⚠ compare:
     · cov final  — quanto cada uma alcançou
     · crashes    — quantos cada uma achou
     · ⚠ e ACHEGOU o caminho até o alvo?

  ✓ e o critério do módulo 8:
     se a dirigida não rende ~2×, o investimento não valeu.
EXPL
SCRIPT

chmod +x compara-campanhas.sh
echo "  ── pronto ──"
echo "     bash ~/fuzz-lab/mod08/compara-campanhas.sh \\"
echo "          ~/fuzz-lab/alvos/fuzz_minimo \\"
echo "          /tmp/corpus-vazio ~/fuzz-lab/corpus/oraculo 60"
```

⚠ **O comparador é o instrumento.** **E o critério é o do `1dFuzz`:** **a dirigida deve render cerca
de 2×** — **e se não render, o investimento não valeu.**

⚠ **E o corpus dirigido aqui é o `oraculo/` do módulo 7** — **que contém a entrada que chega ao
alvo.** **É o dirigido "por seed", a forma mais simples.**

**Produza `quando-nao.md`:**

| Situação | Dirigir? |
|---|---|
| Você sabe o alvo | |
| Você não sabe | |
| Quer toda a superfície | |

**Responda:**

1. **Quando dirigir não vale?** Por quê?
2. **Qual é o custo real?** O que é constante?
3. **Como mitigar o risco de escolher o alvo errado?
4. **Qual o critério de retorno?

---

## 8.4 LAB — O dirigido medido

**Duração:** 150 min

### Passo 1 — Prepare o corpus dirigido (50 min)

⚠ **O corpus que **alcança** o alvo — o pré-requisito de tudo.**

```bash
cd ~/fuzz-lab/mod08

echo "═══ O CORPUS DIRIGIDO ═══"
echo
cat <<'EXPL'
  ── AS TRÊS FORMAS, DO MAIS SIMPLES AO MAIS CARO ──

     1. POR SEED (você já tem)
        · o corpus de fronteira (módulo 5)
        · ⚠ e a entrada que alcança o alvo (módulo 7)

     2. POR DISTÂNCIA (o mecanismo do 1dFuzz)
        · ⚠ exige instrumentar o alvo para reportar a sequência
        · e recompensar quem chega mais perto

     3. POR POSIÇÃO (o mais completo)
        · exige o patch localizado (Patch Diffing, módulo 7)

     ✓ e a 1 já dá ganho — comece por ela.
EXPL

mkdir -p ~/fuzz-lab/corpus/dirigido

python3 - <<'PY'
import struct, os

base = os.path.expanduser("~/fuzz-lab/corpus/dirigido")
os.makedirs(base, exist_ok=True)

# ⚠ as sementes que ALCANÇAM a função do patch (copia_dados)
#    count pequeno o bastante para passar nas DUAS validações
for count in [1, 2, 4, 8, 15, 16]:
    total = count * 4
    corpo = struct.pack("<H", count) + struct.pack("<I", total) + b"A" * total
    with open(f"{base}/alcanca_{count}", "wb") as f:
        f.write(corpo)
    print(f"     ✓ alcanca_{count}  (count={count}, chega a copia_dados)")

# ⚠ e as que NÃO alcançam — para o contraste
for count in [1024, 1025]:
    corpo = struct.pack("<H", count) + struct.pack("<I", 0) + b"A" * 8
    with open(f"{base}/nao_alcanca_{count}", "wb") as f:
        f.write(corpo)
    print(f"     ✓ nao_alcanca_{count}  (parou na validação)")
PY

echo
printf '  ⚠ total: %s sementes\n' "$(ls -1 ~/fuzz-lab/corpus/dirigido | wc -l)"
echo
echo "  ⚠ E A DIFERENÇA:"
cat <<'EXPL'
     · as "alcanca_*" chegam à FUNÇÃO DO PATCH
     · ⚠ as "nao_alcanca_*" morrem na VALIDAÇÃO

     ✓ e é essa distinção que o dirigido explora:
       o fuzzer deve PREFERIR as primeiras.
EXPL
```

⚠ **O corpus dirigido é o instrumento.** **E ele contém os dois tipos:** **as que alcançam o alvo e
as que não** — **para o contraste ficar visível.**

⚠ **E a nota das três formas é o mapa do esforço:** **a 1 você já tem; a 2 exige instrumentar; a 3,
o patch.**

**Produza `corpus-dirigido.md`:**

| Semente | Alcança o alvo? |
|---|---|
| `alcanca_4` | |
| `nao_alcanca_1025` | |

**Responda:**

1. **Quais sementes alcançam?** Quais não?
2. **Qual a diferença entre elas?
3. **Qual das três formas você começou?
4. **O que a forma 2 exige a mais?

### Passo 2 — Rode as duas e compare (60 min)

⚠ **A cega contra a dirigida — o mesmo tempo, e a comparação.**

```bash
cd ~/fuzz-lab/mod08

echo "═══ CEGA × DIRIGIDA ═══"
echo
bash ~/fuzz-lab/mod08/compara-campanhas.sh \
     ~/fuzz-lab/alvos/fuzz_minimo \
     /tmp/corpus-vazio \
     ~/fuzz-lab/corpus/dirigido 60 2>&1 | head -30

echo
cat > caderno/PD-008.md <<'EOF'
# PD-008 — fuzzing dirigido

**Data:** ____

## 1. O alvo do patch
| Item | Valor |
|---|---|
| a função do patch | |
| de onde veio (Patch Diffing?) | |
| ⚠ a distância até ela | |

## 2. As sementes dirigidas
| Semente | Alcança o alvo? | Distância |
|---|---|---|
| | | |

## 3. A comparação
| Campanha | cov final | crashes | tempo |
|---|---|---|---|
| CEGA | | | |
| ⚠ DIRIGIDA | | | |

## 4. ⚠ O ganho
| Métrica | Cega | Dirigida | Δ |
|---|---|---|---|
| cov | | | |
| crashes | | | |
| ⚠ chegou ao alvo? | | | |

## 5. O veredito
| Item | Valor |
|---|---|
| valeu o investimento? | |
| critério (rendeu ~2×?) | |
| ⚠ se não, por quê | |

## 6. ⚠ Quando dirigir NÃO vale
| Situação | Dirigir? |
|---|---|
| você não sabe o alvo | ⚠ NÃO |
| quer toda a superfície | ⚠ NÃO |

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro

## 8. O que NÃO foi verificado
⚠ mínimo 3
EOF

echo "  ⚠ a ficha PD-008 criada"
```

⚠ **A comparação é o entregável.** **E o critério é explícito:** **a dirigida deve render cerca de
2×** — **e se não render, você registra que não valeu.**

⚠ **E a seção 5 é a honesta:** **o veredito pode ser "não valeu", e isso é resultado.**

**Produza `comparacao.md`:**

| Métrica | Cega | Dirigida |
|---|---|---|
| Cobertura | | |
| Chegou ao alvo? | | |
| Veredito | | |

**Responda:**

1. **Qual campanha alcançou mais?** Por quê?
2. **A dirigida chegou ao alvo?
3. **O ganho foi de 2×?** Se não, valeu?
4. **Você registraria "não valeu" como resultado?

### Passo 3 — Documente (40 min)

Produza `relatorio-dirigido.md`:

```markdown
# Relatório — fuzzing dirigido

## 1. O alvo
| Item | Valor |
|---|---|
| a função do patch | |
| como foi localizada | |
| ⚠ a distância até ela | |

## 2. As sementes
| Semente | Alcança? | Distância |
|---|---|---|
| | | |

## 3. As duas campanhas
| Campanha | cov | crashes | chegou ao alvo? |
|---|---|---|---|
| cega | | | |
| dirigida | | | |

## 4. A evidência
```
a saída das duas
```

## 5. ⚠ O ganho medido
| Métrica | Δ |
|---|---|
| cobertura | |
| crashes | |
| ⚠ distância ao alvo | |

## 6. O veredito
| Item | Valor |
|---|---|
| rendeu 2×? | |
| ⚠ valeu o investimento? | |
| se não, o que fazer | |

## 7. ⚠ O que o dirigido NÃO garante
| Item | Por quê |
|---|---|
| que há bug no alvo | o patch pode ter corrigido outra coisa |
| que você alcança em produção | |
| ⚠ que os outros alvos são inúteis | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro
- [ ] não testei o 1-day contra alvo real

## 9. O que NÃO foi verificado
⚠ mínimo 3

## 10. O próximo passo
| # | Ação | Prioridade |
```

**Produza `relatorio-dirigido.md`:**

| Item | Valor |
|---|---|
| Alvo do patch | |
| Ganho | |
| Veredito | |
| O que não garante | |

**Responda:**

1. **O ganho medido está no relatório?
2. **O veredito é honesto?** Rendeu 2× ou não?
3. **O que o dirigido NÃO garante?
4. **Qual o próximo passo?

### Critérios de aceitação

- `cego.md` com o custo do fuzzing sem direção.
- Você explicou **o que o dirigido muda** (alocação, não velocidade).
- `dirigir.md` com as **três** formas e o que cada uma exige.
- Você explicou **qual forma você já fez** nos módulos 5 e 6.
- Você explicou **o que é a trailing call sequence**.
- `metodo.md` com os **cinco** passos.
- Você explicou **a medida de distância** e a tabela de preferência.
- Você explicou **a diferença entre cobertura de blocos e de distância**.
- `mede-distancia.py` rodado, com as distâncias medidas.
- Você explicou **por que `count = 16` chega e `count = 1025` não**.
- `quando-nao.md` com os **cinco** casos e o custo.
- Você explicou **por que dirigir sem saber o alvo é erro**.
- Você explicou **a mitigação** do risco (rodar as duas).
- O **corpus dirigido** preparado, com as sementes que alcançam e as que não.
- As **duas campanhas** rodadas, no mesmo tempo.
- Você mediu **a cobertura e a chegada ao alvo**.
- Você deu **o veredito** com o critério de 2×.
- Você registrou **honestamente se valeu ou não**.
- `caderno/PD-008.md` com as **oito** seções.
- `relatorio-dirigido.md` com as **dez** seções.
- ⚠ **Nenhum teste do 1-day contra alvo real.**

---

## Avaliação

1. **Por que o fuzzer cego desperdiça orçamento?
2. **O que o dirigido muda?** Velocidade ou alocação?
3. **Cite as três formas de dirigir.
4. **Qual delas você já fez?** Por quê?
5. **O que é a trailing call sequence?
6. **Cite os cinco passos do método.
7. **Qual passo é o achado técnico?** Por quê?
8. **Como se mede a distância até o alvo?
9. **Por que "chegou ao parser" não é "chegou ao alvo"?
10. **O que a cobertura comum não distingue?
11. **O que a distância acrescenta à cobertura?
12. **Qual o ganho medido do 1dFuzz?** Cite os números.
13. **Quando dirigir não vale?** Cite dois casos.
14. **Por que dirigir sem saber o alvo é erro?
15. **O que dirigir custa?** Cite quatro custos.
16. **Qual custo é constante?
17. **Como mitigar o risco de escolher o alvo errado?
18. **Qual o critério de retorno?
19. **O que o dirigido NÃO garante?
20. **Por que a forma "por seed" é o pré-requisito das outras?

---

**Próximo:** [Módulo 9 — Snapshot e kernel](modulo-09.md)
