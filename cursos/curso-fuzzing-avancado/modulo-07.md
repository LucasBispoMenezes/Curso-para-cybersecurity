# Módulo 7 — O Oráculo

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6 · Parser Differentials (módulos 5 e 7)

---

## ⚠ Este é o módulo que define o que você vai achar

⚠ **A afirmação que organiza tudo:**

> **O oráculo decide o que é um bug.** **E um fuzzer com o oráculo errado procura no lugar errado** —
> **por mais rápida que seja a campanha.**

⚠ **E é a razão de o módulo 1 ter dito que "melhor oráculo" é o maior ganho disponível.** **Trocar o
oráculo não acelera a busca; ela **muda o que está sendo buscado.**

⚠ **A tese:**

> **Cinco oráculos, do mais fraco ao mais forte.** **E a escolha não é de gosto** — **é o que
> determina se a campanha acha segfault, lógica, ou nada.**

⚠ **A tabela dos cinco:**

| # | Oráculo | O que detecta | ⚠ Força |
|---|---|---|---|
| 1 | **Crash** | Segfault, abort | ⚠ **O mais fraco** |
| 2 | **Sanitizer** | Memória, UB | ⚠ **O mínimo aceitável** |
| 3 | **Timeout** | Travamento | ⚠ **Alto FP** |
| 4 | ⚠ **Diferencial** | ⚠ **Duas implementações discordam** | ⚠ **Lógica** |
| 5 | ⚠⚠ **Invariante** | ⚠ **Uma propriedade foi violada** | ⚠⚠ **O mais amplo** |

---

## 7.1 O órfão: o crash sozinho

⚠ **Por que o crash puro é fraco, e é a lição do módulo 6.**

| O bug | Crash? |
|---|---|
| Segfault em memória não mapeada | ⚠ **Sim** |
| ⚠ **Leitura de memória adjacente válida** | ⚠ **Não** |
| Índice errado dentro do buffer | ⚠ **Não** |
| ⚠ **Verificação ausente num caminho** | ⚠ **Não** |
| Ordem errada | ⚠ Não |
| ⚠ **Campo mentiroso tratado como verdade** | ⚠ **Não** |

⚠ **A tabela é o argumento, e ela é dura:** **a maioria dos bugs de segurança **não crasha**** — **ela
faz a coisa errada e continua.**

⚠ **A segunda linha é o bug do alvo do curso.** **`memcpy` de 64 bytes de uma entrada de 6 lê memória
adjacente** — **e o programa **funciona**.** **Nenhum crash.**

⚠ **A tabela da taxa de detecção, por oráculo:**

| Oráculo | Dos bugs de memória | ⚠ Dos de lógica |
|---|---|---|
| Crash puro | ⚠ ~30% | ⚠ **~0%** |
| Sanitizer | ⚠ **~95%** | ⚠ ~0% |
| ⚠ **Invariante** | ⚠ **~95%** | ⚠⚠ **Alto** |
| Diferencial | ⚠ **~95%** | ⚠⚠ **Alto** |

⚠ **A última coluna é o que motiva o curso.** **Bugs de lógica são invisíveis para o crash** — **e
são a maioria do que resta em código já fuzzado.**

⚠ **A regra escrita:**

> **Um fuzzer por crash responde "o programa quebra?".** **E a pergunta que importa é "o programa faz
> a coisa errada?"** — **que exige um oráculo que saiba o que é **certo**.**

```bash
mkdir -p ~/fuzz-lab/mod07 && cd ~/fuzz-lab/mod07

echo "═══ 1. o crash sozinho ═══"
echo
cat > oraculo.md <<'EOF'
# Os cinco oráculos

| # | Oráculo | Detecta | Força |
|---|---|---|---|
| 1 | CRASH | segfault, abort | ⚠ O MAIS FRACO |
| 2 | SANITIZER | memória, UB | ⚠ o mínimo aceitável |
| 3 | TIMEOUT | travamento | ⚠ ALTO FP |
| 4 | ⚠ DIFERENCIAL | duas implementações discordam | ⚠ LÓGICA |
| 5 | ⚠⚠ INVARIANTE | propriedade violada | ⚠⚠ O MAIS AMPLO |

## Por que o crash puro é fraco
| O bug | Crasha? |
|---|---|
| segfault em memória não mapeada | ⚠ SIM |
| ⚠ leitura de memória ADJACENTE VÁLIDA | ⚠ NÃO |
| índice errado dentro do buffer | ⚠ NÃO |
| ⚠ verificação ausente num caminho | ⚠ NÃO |
| ordem errada | ⚠ não |
| ⚠ campo mentiroso tratado como verdade | ⚠ NÃO |

## ⚠ a segunda linha é o bug do alvo do curso
memcpy de 64 bytes de uma entrada de 6 lê memória ADJACENTE —
e o programa FUNCIONA. nenhum crash.

## A taxa de detecção
| Oráculo | memória | ⚠ lógica |
|---|---|---|
| crash puro | ⚠ ~30% | ⚠ ~0% |
| sanitizer | ⚠ ~95% | ⚠ ~0% |
| ⚠ INVARIANTE | ⚠ ~95% | ⚠⚠ ALTO |
| diferencial | ⚠ ~95% | ⚠⚠ ALTO |

## ⚠ A REGRA
um fuzzer por crash responde "o programa QUEBRA?".
e a pergunta que importa é "o programa faz a coisa ERRADA?" —
que exige um oráculo que saiba o que é CERTO.
EOF

cat oraculo.md
```

⚠ **A tabela do que crasha é o instrumento.** **E a coluna "não" é a maioria** — **e é onde os bugs
de segurança vivem.**

⚠ **E a taxa do sanitizer é honesta:** **~95% dos de memória, ~0% dos de lógica** — **é o mínimo, não
o suficiente.**

**Produza `oraculo.md`:**

| Oráculo | Detecta | Força |
|---|---|---|
| 1 | | |
| 4 | | |
| 5 | | |

**Responda:**

1. **Por que o crash puro é fraco?** O que ele não vê?
2. **Por que o bug do alvo não crasha?
3. **Qual oráculo é o mínimo aceitável?** E qual é o mais amplo?
4. **O que a coluna "lógica" mostra?

---

## 7.2 O timeout (e o seu problema)

⚠ **O oráculo mais fácil de ligar e o mais ruidoso.**

| Causa de timeout | ⚠ É bug? |
|---|---|
| Loop em entrada grande | ⚠ Frequentemente sim |
| ⚠ **Loop em entrada pequena** | ⚠⚠ **Bug de lógica** |
| Inicialização lenta | ⚠ Não — é o harness |
| ⚠ **Alocação gigante** | ⚠ Depende |
| Dependência externa | Não |

⚠ **A segunda linha é a mais valiosa.** **Um loop que não termina com **8 bytes de entrada** é bug**
— **com 8 MB, pode ser o custo normal.**

⚠ **E a tabela do que fazer com o timeout:**

| Situação | Ação |
|---|---|
| Loop em entrada mínima | ⚠ **Bug — reporte** |
| ⚠ **Tempo proporcional ao tamanho** | ⚠ Normal |
| Consumo de memória explodiu | ⚠ DoS — investigue |
| Inicialização | ⚠ Corrija o harness |

⚠ **A linha 2 é o filtro.** **Você mede o tempo **em função do tamanho da entrada**** — **e se ele
não cresce, o timeout é bug.**

⚠ **A regra escrita:**

> **O timeout vira bug quando o custo **não** acompanha o tamanho.** **Um parser que trava com 8
> bytes tem um problema; um que demora com 8 MB está trabalhando.**

```bash
cd ~/fuzz-lab/mod07

echo "═══ 2. o timeout ═══"
echo
cat > timeout.md <<'EOF'
# O timeout

| Causa | É bug? |
|---|---|
| loop em entrada GRANDE | frequentemente sim |
| ⚠ loop em entrada PEQUENA | ⚠⚠ BUG DE LÓGICA |
| inicialização lenta | ⚠ não — é o HARNESS |
| ⚠ alocação gigante | ⚠ depende |
| dependência externa | não |

## ⚠ a linha mais valiosa
um loop que não termina com 8 BYTES é bug.
com 8 MB, pode ser o custo NORMAL.

## O que fazer
| Situação | Ação |
|---|---|
| loop em entrada mínima | ⚠ BUG — reporte |
| ⚠ tempo ∝ tamanho | ⚠ normal |
| memória explodiu | ⚠ DoS — investigue |
| inicialização | ⚠ corrija o HARNESS |

## ⚠ o filtro
você mede o tempo EM FUNÇÃO do tamanho da entrada.
✓ se ele NÃO CRESCE, o timeout é bug.

## ⚠ A REGRA
o timeout vira bug quando o custo NÃO acompanha o tamanho.
um parser que trava com 8 bytes tem um PROBLEMA.
um que demora com 8 MB está TRABALHANDO.
EOF

cat timeout.md

echo
echo "═══ 3. o critério: o custo acompanha o tamanho? ═══"
echo
cat > mede-timeout.py <<'PY'
#!/usr/bin/env python3
"""
mede-timeout.py — o timeout é bug? o custo acompanha o tamanho?

⚠ DIDÁTICO. mede o tempo em função do tamanho da entrada.
"""
import time, subprocess, os, struct

FUZZER = os.path.expanduser("~/fuzz-lab/alvos/parser_asan")
ENTRADA = "/tmp/tmo.bin"


def mede(tamanho: int, count: int) -> float:
    corpo = struct.pack("<H", count) + struct.pack("<I", count * 4) + b"A" * tamanho
    with open(ENTRADA, "wb") as f:
        f.write(corpo)
    t0 = time.time()
    try:
        subprocess.run([FUZZER, ENTRADA], capture_output=True, timeout=5)
    except subprocess.TimeoutExpired:
        return -1.0
    return time.time() - t0


def main():
    print("═══ O TIMEOUT É BUG? ═══")
    print()
    print("  ⚠ mede o tempo em FUNÇÃO do tamanho da entrada")
    print()
    print(f"  {'tamanho':>9} {'count':>7} {'tempo (ms)':>12}  veredito")
    print("  " + "-"*52)

    if not os.path.exists(FUZZER):
        print("  ⚠ o binário não existe — compile o alvo (módulo 1)")
        return

    resultados = []
    for tam, count in [(16, 1), (64, 1), (256, 1), (1024, 1), (4096, 1),
                       (16, 512), (16, 1024), (16, 1025)]:
        t = mede(tam, count)
        if t < 0:
            v = "⚠ TIMEOUT"
        elif t < 0.05:
            v = "✓ rápido"
        else:
            v = "· normal"
        resultados.append((tam, count, t, v))
        print(f"  {tam:>9} {count:>7} {t*1000:>12.1f}  {v}")

    print()
    print("  ═══ A LEITURA ═══")
    print("  · tempo ∝ tamanho  → ✓ o custo ACOMPANHA: normal")
    print("  ⚠ tempo constante com count GRANDE e tamanho pequeno")
    print("     → ⚠⚠ o parser processa mais do que recebeu: é BUG")
    print()
    print("  ✓ e é o que o invariante do módulo 6 pega diretamente.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-timeout.py
echo "  ── pronto ──"
echo "     python3 ~/fuzz-lab/mod07/mede-timeout.py"
```

⚠ **O medidor de timeout é o instrumento.** **E o critério é direto:** **o tempo acompanha o
tamanho?** **Se não, é bug.**

⚠ **E a entrada com `count = 1025` e tamanho 16 testa exatamente isso:** **o parser deve parar no
`return -2`** — **e se ele demora, algo está errado.**

**Produza `timeout.md`:**

| Causa | É bug? |
|---|---|
| Loop em entrada pequena | |
| Tempo ∝ tamanho | |
| Inicialização lenta | |

**Responda:**

1. **Quando o timeout **não** é bug?
2. **Por que o loop em entrada pequena é bug?
3. **O que o medidor verifica?
4. **O que o timeout tem a ver com o invariante 1?

---

## 7.3 O diferencial e o invariante

⚠ **Os dois oráculos fortes. E a diferença entre eles é **de onde vem a referência**.**

| Oráculo | A referência é | ⚠ Exige |
|---|---|---|
| **Diferencial** | ⚠ **Outra implementação** | ⚠ **Duas** |
| ⚠ **Invariante** | ⚠ **Uma propriedade afirmada** | ⚠ **Saber o que deve valer** |

⚠ **A tabela das situações, e qual serve:**

| Situação | Oráculo |
|---|---|
| Há duas implementações do mesmo formato | ⚠ **Diferencial** |
| ⚠ **Há uma só, e você conhece a regra** | ⚠ **Invariante** |
| O formato tem spec | Ambos |
| ⚠ **Você não sabe o que é certo** | ⚠ **Nenhum — leia o código** |

⚠ **A terceira linha é a mais comum e a mais confortável.** **Com spec, o diferencial e o invariante
saem da mesma fonte:** **a especificação descreve o que **deve** acontecer.**

⚠ **E a tabela dos invariantes que valem sempre:**

| Invariante | Vale para |
|---|---|
| Não lê além de `size` | ⚠ **Qualquer parser** |
| Não escreve além do destino | Qualquer |
| Retorno num conjunto conhecido | Qualquer |
| ⚠ **A saída é função da entrada** | ⚠ **Determinismo** |
| Total consumido = total declarado | Formato com tamanho |

⚠ **A quarta linha é a mais subestimada.** **"A saída é função da entrada"** — **ou seja: a mesma
entrada produz a mesma saída.** **E um parser que viola isso tem estado escondido** — **que é a
origem de metade dos bugs de concorrência.**

⚠ **A regra escrita:**

> **Escolha o oráculo pela referência que você tem.** **Duas implementações dão o diferencial; uma
> spec dá o invariante; e nenhum dos dois substitui ler o código.**

```bash
cd ~/fuzz-lab/mod07

echo "═══ 4. diferencial × invariante ═══"
echo
cat > referencia.md <<'EOF'
# Diferencial × invariante

| Oráculo | A referência é | Exige |
|---|---|---|
| DIFERENCIAL | ⚠ outra IMPLEMENTAÇÃO | ⚠ DUAS |
| ⚠ INVARIANTE | ⚠ uma PROPRIEDADE afirmada | ⚠ saber o que deve valer |

## Qual serve, por situação
| Situação | Oráculo |
|---|---|
| duas implementações do mesmo formato | ⚠ DIFERENCIAL |
| ⚠ uma só, e você conhece a regra | ⚠ INVARIANTE |
| o formato tem spec | ambos |
| ⚠ você NÃO sabe o que é certo | ⚠ NENHUM — leia o código |

## ⚠ a terceira linha é a mais comum
com spec, os dois oráculos saem da MESMA fonte:
a especificação descreve o que DEVE acontecer.

## Invariantes que valem SEMPRE
| Invariante | Vale para |
|---|---|
| não lê além de `size` | ⚠ QUALQUER parser |
| não escreve além do destino | qualquer |
| retorno num conjunto conhecido | qualquer |
| ⚠ a saída é FUNÇÃO da entrada | ⚠ DETERMINISMO |
| consumido = declarado | formato com tamanho |

## ⚠ a quarta linha é a mais subestimada
"a mesma entrada produz a mesma SAÍDA".
✓ e um parser que viola isso tem ESTADO ESCONDIDO —
   origem de metade dos bugs de CONCORRÊNCIA.

## ⚠ A REGRA
escolha o oráculo pela REFERÊNCIA que você tem.
duas implementações dão o DIFERENCIAL.
uma spec dá o INVARIANTE.
⚠ e nenhum substitui LER O CÓDIGO.
EOF

cat referencia.md

echo
echo "═══ 5. os quatro invariantes universais, instrumentados ═══"
cat > harness_universal.c <<'EOF'
/*
 * ⚠ HARNESS COM OS QUATRO INVARIANTES UNIVERSAIS
 *
 *   eles valem para QUALQUER parser — não só este alvo.
 */
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

extern int parse_verifica(const uint8_t *data, size_t size,
                          size_t *bytes_lidos, int *retorno);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    size_t lidos = 0;
    int ret = 999;

    parse_verifica(data, size, &lidos, &ret);

    /* ── 1. NÃO LÊ ALÉM DE `size` ── */
    if (lidos > size) {
        fprintf(stderr, "INV1: leu %zu de %zu\n", lidos, size);
        abort();
    }

    /* ── 2. NÃO ESCREVE ALÉM DO DESTINO ── */
    /* ⚠ verificado pelo ASan; declarado aqui como INTENÇÃO */

    /* ── 3. RETORNO NUM CONJUNTO CONHECIDO ── */
    if (ret != 0 && ret < -1) {
        /* ⚠ qualquer negativo fora do esperado */
    }
    if (ret != 0 && ret != -1 && ret != -2 && ret != -3 && ret != 64 && ret < 0) {
        fprintf(stderr, "INV3: retorno desconhecido %d\n", ret);
        abort();
    }

    /* ── 4. A SAÍDA É FUNÇÃO DA ENTRADA ── */
    size_t lidos2 = 0; int ret2 = 999;
    parse_verifica(data, size, &lidos2, &ret2);
    if (ret != ret2 || lidos != lidos2) {
        fprintf(stderr, "INV4: NAO-DETERMINISMO ret=%d/%d lidos=%zu/%zu\n",
                ret, ret2, lidos, lidos2);
        abort();
    }

    return 0;
}
EOF

echo "  ── o harness universal está escrito ──"
echo
echo "  ⚠ E NOTE O INVARIANTE 4:"
cat <<'EXPL'
     ele roda o parser DUAS VEZES com a mesma entrada
     e verifica que o resultado é o MESMO.

     ⚠ se não for, há ESTADO ESCONDIDO —
        e é a origem de bugs que o crash nunca vê.
     ✓ e ele vale para QUALQUER parser.
EXPL
```

⚠ **O harness universal é o instrumento.** **E o invariante 4 — determinismo — é o mais elegante:**
**ele roda o parser duas vezes e compara** — **e não precisa de spec nem de referência.**

⚠ **E a nota do "vale para qualquer parser" é o ponto:** **os quatro invariantes são universais** —
**e você os leva para qualquer alvo.**

**Produza `invariantes-universais.md`:**

| # | Invariante | Como verificar |
|---|---|---|
| 1 | | |
| 4 | | |

**Responda:**

1. **De onde vem a referência** em cada oráculo?
2. **Qual serve quando há duas implementações?
3. **Qual invariante é o mais subestimado?** O que ele pega?
4. **O que o invariante 4 verifica, e o que ele não precisa?

---

## 7.4 LAB — Os cinco oráculos, medidos

**Duração:** 120 min

### Passo 1 — Instrumente os oráculos (50 min)

⚠ **Os cinco oráculos no mesmo alvo, e a diferença medida.**

```bash
cd ~/fuzz-lab/mod07

echo "═══ INSTRUMENTANDO OS CINCO ═══"
echo
cat <<'EXPL'
  ── O MESMO ALVO, CINCO ORÁCULOS ──

     1. CRASH puro         → sem sanitizer
     2. SANITIZER          → + ASan
     3. TIMEOUT            → + -timeout
     4. DIFERENCIAL        → + a 2ª implementação (módulo 3)
     5. ⚠ INVARIANTE        → + os 4 universais

     ⚠ e a diferença de ACHADOS é o argumento do módulo.
EXPL

cd ~/fuzz-lab/mod07

# ── compila as cinco variantes contra o mesmo alvo ──
ALVO=~/fuzz-lab/mod06/alvo_instrumentado.c
HARN=~/fuzz-lab/mod06/harness_invariante.c

echo "  ── 1. crash puro (SEM sanitizer) ──"
clang -O1 -g -fsanitize=fuzzer -o fuzz_crash "$ALVO" "$HARN" 2>&1 | head -2
[ -f fuzz_crash ] && echo "     ✓ fuzz_crash" || echo "     ⚠ falhou"

echo "  ── 2. com ASan ──"
clang -O1 -g -fsanitize=fuzzer,address -o fuzz_asan "$ALVO" "$HARN" 2>&1 | head -2
[ -f fuzz_asan ] && echo "     ✓ fuzz_asan" || echo "     ⚠ falhou"

echo "  ── 3. com UBSan ──"
clang -O1 -g -fsanitize=fuzzer,undefined -o fuzz_ubsan "$ALVO" "$HARN" 2>&1 | head -2
[ -f fuzz_ubsan ] && echo "     ✓ fuzz_ubsan" || echo "     ⚠ falhou"

echo "  ── 5. invariante completo ──"
cp harness_universal.c harness_uni.c
sed 's/parse_verifica/parse_verifica/' harness_uni.c > /dev/null
clang -O1 -g -fsanitize=fuzzer,address -o fuzz_inv "$ALVO" harness_uni.c 2>&1 | head -2
[ -f fuzz_inv ] && echo "     ✓ fuzz_inv" || echo "     ⚠ falhou"
echo

echo "═══ O CORPUS QUE EXERCITA O BUG ═══"
python3 - <<'PY'
import struct, os
d = os.path.expanduser("~/fuzz-lab/corpus/oraculo")
os.makedirs(d, exist_ok=True)
# ⚠ a entrada que viola o invariante 1: size=6, count=16 (lê 64 de uma entrada de 6)
with open(f"{d}/viola_inv1", "wb") as f:
    f.write(struct.pack("<H", 16) + struct.pack("<I", 64) + b"A" * 0)
print(f"     ✓ viola_inv1: size=6, count=16 (lê 64 de 6)")
# e a válida
with open(f"{d}/valida", "wb") as f:
    f.write(struct.pack("<H", 4) + struct.pack("<I", 16) + b"A" * 16)
print(f"     ✓ valida: size=22, count=4")
PY
echo
echo "  ── PARA RODAR CADA UM ──"
cat <<'EXPL'
     for o in crash asan ubsan inv; do
        echo "── $o ──"
        ./fuzz_$o ~/fuzz-lab/corpus/oraculo -max_total_time=20 2>&1 | tail -4
     done
EXPL
```

⚠ **As cinco variantes são o instrumento.** **E o corpus é deliberado:** **`viola_inv1` tem `size =
6` e `count = 16`** — **a entrada que causa leitura fora.**

⚠ **E a comparação é direta:** **o `fuzz_crash` (sem sanitizer) provavelmente **não acha nada** —
**e é o argumento do módulo.**

**Produza `cinco-oraculos.md`:**

| Oráculo | Achou? | O que reportou |
|---|---|---|
| Crash puro | | |
| ASan | | |
| UBSan | | |
| Invariante | | |

**Responda:**

1. **Quantos oráculos acharam o bug?
2. **O crash puro achou?** Por quê?
3. **Qual deu a mensagem mais clara?
4. **O invariante acharia sem ASan?** Como você sabe?

### Passo 2 — Escreva o invariante do seu alvo (40 min)

⚠ **Um invariante **específico** do formato — além dos quatro universais.**

```bash
cd ~/fuzz-lab/mod07

echo "═══ O INVARIANTE ESPECÍFICO ═══"
echo
cat <<'EXPL'
  ── OS QUATRO UNIVERSAIS NÃO BASTAM ──
     eles valem para QUALQUER parser —
     e por isso não sabem nada sobre o SEU formato.

  ── E O INVARIANTE ESPECÍFICO VEM DA SPEC ──
     · "o total consumido é igual ao declarado no campo"
     · "o retorno é consistente com count"
     · ⚠ "a soma dos campos internos bate com o tamanho"
     · "a saída para a mesma entrada é sempre a mesma"

  ── COMO DESCOBRIR O SEU ──
     1. leia a spec (ou o código)
     2. ⚠ pergunte: "o que DEVE valer sempre?"
     3. e escreva a verificação
EXPL

cat > harness_especifico.c <<'EOF'
/*
 * ⚠ HARNESS COM INVARIANTE ESPECÍFICO DO FORMATO
 *
 *   além dos 4 universais, verifica uma regra DO FORMATO.
 */
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern int parse_verifica(const uint8_t *data, size_t size,
                          size_t *bytes_lidos, int *retorno);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    size_t lidos = 0;
    int ret = 999;

    parse_verifica(data, size, &lidos, &ret);

    /* ── os 4 universais ── */
    if (lidos > size) { fprintf(stderr, "INV1: leu %zu de %zu\n", lidos, size); abort(); }

    /* ── o ESPECÍFICO: o retorno bate com o count declarado? ── */
    if (size >= 6 && ret > 0) {
        uint16_t count;
        memcpy(&count, data, 2);
        /* ⚠ a spec diz: o retorno é count * 4, quando passa nas validações */
        if ((size_t)ret != (size_t)count * 4) {
            fprintf(stderr, "INV_SPEC: ret=%d mas count*4=%u\n", ret, count * 4);
            abort();
        }
    }

    /* ── o ESPECÍFICO 2: o total consumido é o esperado ── */
    if (size >= 6 && ret > 0) {
        size_t esperado = 6 + (size_t)ret;
        if (lidos != esperado) {
            fprintf(stderr, "INV_SPEC2: lidos=%zu esperado=%zu\n", lidos, esperado);
            abort();
        }
    }

    return 0;
}
EOF

echo "  ── o harness com invariante específico está escrito ──"
echo
echo "  ⚠ E A DIFERENÇA PARA OS UNIVERSAIS:"
cat <<'EXPL'
     · os universais valem para QUALQUER parser
     · ⚠ os específicos vêm da SPEC do SEU formato

     ✓ e é o segundo que pega bug de LÓGICA —
       porque ele sabe o que DEVE valer.
EXPL
```

⚠ **O invariante específico é o instrumento.** **E ele vem da spec** — **o que responde à pergunta
do §7.3:** **"você sabe o que é certo?"**

⚠ **E a nota é a ponte com o Parser Differentials:** **o invariante específico é a pergunta do
módulo 7 de lá** — **aplicada aqui como oráculo.**

**Produza `invariante-especifico.md`:**

| Invariante | De onde vem |
|---|---|
| Universais | |
| Específico | |

**Responda:**

1. **Por que os universais não bastam?
2. **De onde vem o invariante específico?
3. **O que o `INV_SPEC` verifica?
4. **Por que o específico pega lógica e o universal, não?

### Passo 3 — Documente (30 min)

Produza `caderno/PD-007.md`:

```markdown
# PD-007 — o oráculo

**Data:** ____

## 1. Os oráculos instrumentados
| # | Oráculo | Como | Achou? |
|---|---|---|---|
| 1 | crash puro | | |
| 2 | ASan | | |
| 3 | UBSan | | |
| 4 | diferencial | | |
| 5 | ⚠ invariante | | |

## 2. A entrada que dispara
| Item | Valor |
|---|---|
| arquivo | |
| bytes | |
| ⚠ o que ela causa | |

## 3. Os invariantes, por tipo
| Tipo | Invariante | Vale para |
|---|---|---|
| universal | lidos <= size | qualquer parser |
| universal | determinismo | qualquer parser |
| ⚠ específico | | este formato |

## 4. ⚠ O que cada oráculo NÃO pega
| Oráculo | Não pega |
|---|---|
| crash puro | ⚠ leitura válida, lógica |
| ASan | ⚠ lógica |
| timeout | ⚠ alto FP |
| ⚠ invariante universal | ⚠ regra de negócio |
| ⚠ invariante específico | ⚠ o que você não pensou |

## 5. A escolha
| Item | Valor |
|---|---|
| o oráculo PRIMÁRIO | |
| o secundário | |
| por quê | |

## 6. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro

## 7. O que NÃO foi verificado
⚠ mínimo 3
```

Produza `relatorio-oraculo.md`:

```markdown
# Relatório — os oráculos

## 1. Os cinco, instrumentados
| # | Oráculo | Achou? | Mensagem |
|---|---|---|---|
| | | | |

## 2. ⚠ A entrada que dispara
```
[hex]
```

## 3. A evidência literal
```
ASAN: ...
INV1: leu N de M bytes
```

## 4. O bug
| Item | Valor |
|---|---|
| tipo | memória / lógica |
| ⚠ crasha sem sanitizer? | |

## 5. Os invariantes
| Tipo | Invariante | O que pega |
|---|---|---|
| universal | | |
| específico | | |

## 6. ⚠ O que o oráculo NÃO pega
| Item | Por quê |
|---|---|
| | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro
- [ ] não reportei sem reproducer mínimo

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O próximo passo
| # | Ação | Prioridade |
```

**Produza `relatorio-oraculo.md`:**

| Item | Valor |
|---|---|
| Oráculo primário | |
| Achou | |
| Crash sem sanitizer | |
| O que não pega | |

**Responda:**

1. **Qual oráculo achou?** Qual não?
2. **O crash puro achou?** O que isso confirma?
3. **Você escreveu um invariante específico?** Qual?
4. **O que o oráculo não pega?

### Critérios de aceitação

- `oraculo.md` com os **cinco** oráculos e a força de cada.
- Você explicou **por que o crash puro é fraco**.
- Você explicou **por que o bug do alvo não crasha**.
- Você explicou **a taxa do sanitizer** (memória × lógica).
- `timeout.md` com as **cinco** causas e o filtro.
- Você explicou **quando o timeout é bug**.
- Você explicou **o que o medidor verifica**.
- `referencia.md` com a origem da referência de cada oráculo.
- Você explicou **qual serve quando há duas implementações**.
- Você explicou **por que o determinismo é subestimado**.
- Os **quatro invariantes universais** listados.
- O **harness universal** escrito, com o invariante 4.
- As **cinco variantes** compiladas contra o mesmo alvo.
- O **corpus que exercita o bug** gerado, com `viola_inv1`.
- A **comparação medida**: quais oráculos acharam.
- Você explicou **se o crash puro achou** e por quê.
- O **invariante específico** escrito, vindo da spec.
- Você explicou **por que os universais não bastam**.
- `caderno/PD-007.md` com as **sete** seções.
- `relatorio-oraculo.md` com as **nove** seções.
- ⚠ **Nenhum fuzz pela rede.**

---

## Avaliação

1. **O que o oráculo decide?
2. **Por que trocar o oráculo muda o que se busca?
3. **Cite os cinco oráculos** e a força de cada.
4. **Por que o crash puro é o mais fraco?
5. **Cite três bugs que não crasham.
6. **Qual é o bug do alvo do curso?** Por que não crasha?
7. **Qual a taxa de detecção do crash puro?** E do sanitizer?
8. **O que o sanitizer NÃO pega?
9. **Cite quatro causas de timeout.**
10. **Quando o timeout é bug?** Qual o filtro?
11. **Por que loop em entrada pequena é bug?
12. **De onde vem a referência** no diferencial? E no invariante?
13. **Qual oráculo serve quando há duas implementações?
14. **Qual serve quando há uma só?
15. **O que fazer quando você não sabe o que é certo?
16. **Cite quatro invariantes universais.
17. **O que o determinismo detecta?
18. **O que o invariante específico acrescenta?
19. **De onde ele vem?
20. **Por que o invariante específico pega lógica e o universal, não?

---

**Próximo:** [Módulo 8 — Dirigido: o 1dFuzz](modulo-08.md)
