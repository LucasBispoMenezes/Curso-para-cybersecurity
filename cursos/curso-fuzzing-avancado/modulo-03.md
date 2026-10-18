# Módulo 3 — O Harness

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 e 2 · C para Pesquisa

---

## ⚠ Este é o módulo mais caro e o mais decisivo

⚠ **A afirmação que organiza tudo:**

> **O harness é o que o fuzzer **pode** alcançar.** **E um harness que valida antes de passar é um
> harness que proíbe o fuzzer de chegar ao código.**

⚠ **E é o erro mais comum, e o menos percebido.** **O harness parece "correto"** — **ele rejeita o
inválido, como o programa real faria.** **E é exatamente por isso que não acha nada.**

⚠ **A tese:**

> **O harness não é o programa; é o instrumento que exercita o programa.** **Ele existe para
> **entrar** no código, não para protegê-lo.**

⚠ **A tabela do que o harness faz e do que ele **não** faz:**

| O harness faz | **Não** faz |
|---|---|
| Recebe os bytes do fuzzer | ⚠ **Não valida antes** |
| Chama o alvo | ⚠ Não filtra o "inválido" |
| Devolve ao fuzzer | ⚠ Não reinicia estado caro se evitável |
| ⚠ **Chama a função certa** | ⚠ Não chama só a "segura" |

---

## 3.1 O que o harness é

⚠ **O harness, definido: **a função que o fuzzer chama, e que traduz bytes em uma chamada ao alvo.**

| Fuzzer | Forma do harness |
|---|---|
| **LibFuzzer** | ⚠ **`LLVMFuzzerTestOneInput`** |
| **AFL++** | `main()` lendo de arquivo ou `stdin` |
| **`cargo-fuzz`** | Uma função `fuzz_target!` |
| **`honggfuzz`** | Similar ao LibFuzzer |

⚠ **A linha do LibFuzzer é a mais importante.** **A forma canônica é uma função** — **e é isso que
torna o modo **in-process** possível:**

```c
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    parse(data, size);      /* ⚠ a chamada ao alvo — e nada mais */
    return 0;
}
```

⚠ **E note o que **não** está lá:** **nenhuma verificação, nenhum `if (size < 6) return 0;`.**
**O alvo é que decide o que fazer com o inválido** — **e é o que você quer exercitar.**

⚠ **A tabela dos erros de harness, e o sintoma de cada:**

| Erro | ⚠ Sintoma |
|---|---|
| Valida antes de passar | ⚠ **Cobertura baixa, nada achado** |
| Chama só a função "segura" | ⚠ Metade do código, nunca exercitada |
| Não libera o estado entre chamadas | ⚠ Vazamento → OOM falso |
| Inicializa tudo a cada chamada | ⚠ **Execuções lentas** |
| ⚠ **Escreve em disco** | ⚠ Ainda mais lento |
| Aborta em erro esperado | ⚠ **Falsos crashes** |

⚠ **A primeira linha é o erro do módulo.** **E a última é o segundo mais comum:** **um harness que
chama `abort()` no erro do alvo gera "crashes" que são decisões do alvo, não bugs.**

⚠ **A regra escrita:**

> **O harness é um tradutor, não um porteiro.** **Ele passa os bytes; o alvo decide.** **Se o seu
> harness tem um `if` que rejeita, ele está filtrando o que o fuzzer deveria explorar.**

```bash
mkdir -p ~/fuzz-lab/mod03 && cd ~/fuzz-lab/mod03

echo "═══ 1. o que o harness é ═══"
echo
cat > harness.md <<'EOF'
# O que o harness é

| Fuzzer | Forma do harness |
|---|---|
| LibFuzzer | ⚠ LLVMFuzzerTestOneInput |
| AFL++ | main() lendo de arquivo ou stdin |
| cargo-fuzz | uma função fuzz_target! |
| honggfuzz | similar ao LibFuzzer |

## ⚠ a forma canônica
```c
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    parse(data, size);      /* ⚠ a chamada — e NADA MAIS */
    return 0;
}
```

## ⚠ e note o que NÃO está lá
nenhuma verificação.
nenhum `if (size < 6) return 0;`.
✓ o ALVO decide o que fazer com o inválido —
   e é o que você quer EXERCITAR.

## Os erros, e o sintoma
| Erro | Sintoma |
|---|---|
| ⚠ VALIDA antes de passar | ⚠ cobertura baixa, NADA achado |
| chama só a função "segura" | metade do código nunca exercitada |
| não libera estado entre chamadas | vazamento → OOM FALSO |
| inicializa tudo a cada chamada | ⚠ execuções LENTAS |
| ⚠ escreve em disco | ainda mais lento |
| ⚠ ABORTA em erro esperado | ⚠ FALSOS crashes |

## ⚠ A REGRA
o harness é um TRADUTOR, não um PORTEIRO.
ele passa os bytes; o ALVO decide.
⚠ se o seu harness tem um `if` que rejeita,
   ele está FILTRANDO o que o fuzzer deveria EXPLORAR.
EOF

cat harness.md
```

⚠ **A forma canônica mostra o que **não** vai no harness.** **E é a lição mais contraintuitiva do
módulo:** **o harness "correto" é o que parece incompleto.**

⚠ **E a tabela dos erros traduz cada um em sintoma observável** — **porque o erro de harness se
manifesta como "não achou nada", não como erro.**

**Produza `harness.md`:**

| Erro | Sintoma |
|---|---|
| Valida antes | |
| Aborta em erro esperado | |
| Não libera estado | |

**Responda:**

1. **O que o harness canônico **não** faz?** Por quê?
2. **Por que "valida antes" parece correto e é errado?
3. **O que um `abort()` no harness produz?
4. **Por que inicializar tudo a cada chamada é ruim?

---

## 3.2 O harness do zero

⚠ **O processo, em cinco passos. E o passo 3 é o que exige conhecer o alvo.**

| # | Passo | O que fazer |
|---|---|---|
| 1 | **Escolha a função** | ⚠ **A mais profunda que aceita bytes** |
| 2 | **Descubra o estado** | O que precisa existir antes |
| 3 | ⚠ **Inicialize UMA vez** | ⚠ **Fora da função de fuzz** |
| 4 | **Chame sem validar** | ⚠ **O fuzzer manda lixo** |
| 5 | **Limpe o que vaza** | Só o que vaza |

⚠ **A linha 1 é a decisão mais importante do harness.** **A função "mais profunda que aceita bytes"**
— **porque uma função mais rasa deixa metade do código inalcançável.**

⚠ **A tabela da escolha da função, com exemplo:**

| Função escolhida | ⚠ Alcança |
|---|---|
| `main()` | ⚠ Depende do argv, do ambiente |
| ⚠ **`parse(bytes, size)`** | ⚠ **Tudo o que a entrada alcança** |
| `valida(bytes)` | ⚠ Só a validação |
| `processa_campo(x)` | ⚠ Só depois do parse |

⚠ **A linha 2 é a armadilha clássica.** **Fuzzar a função "de dentro" parece mais eficiente** —
**e faz você perder todo o código que existe **antes** dela** — **inclusive o parsing, que é onde
metade dos bugs mora.**

⚠ **E a linha 3 é a da performance.** **Inicializar o estado dentro da função de fuzz faz cada
execução pagar o custo** — **e o custo pode ser 1000×.**

⚠ **A regra escrita:**

> **Fuzze a função mais profunda que ainda aceita bytes.** **Cada nível que você desce é código que
> você deixa de exercitar** — **e o parsing é exatamente onde a entrada encontra o limite.**

```bash
cd ~/fuzz-lab/mod03

echo "═══ 2. o harness do zero ═══"
echo
cat > do-zero.md <<'EOF'
# O harness do zero

| # | Passo | O que fazer |
|---|---|---|
| 1 | ⚠ escolha a FUNÇÃO | a mais PROFUNDA que aceita bytes |
| 2 | descubra o ESTADO | o que precisa existir antes |
| 3 | ⚠ inicialize UMA vez | ⚠ FORA da função de fuzz |
| 4 | chame SEM validar | ⚠ o fuzzer manda lixo |
| 5 | limpe o que VAZA | só o que vaza |

## A escolha da função
| Função | Alcança |
|---|---|
| main() | ⚠ depende de argv e ambiente |
| ⚠ parse(bytes, size) | ⚠ TUDO o que a entrada alcança |
| valida(bytes) | ⚠ só a validação |
| processa_campo(x) | ⚠ só DEPOIS do parse |

## ⚠ a armadilha da linha 2
fuzzar a função "de dentro" parece mais EFICIENTE —
e faz você PERDER todo o código que existe ANTES dela.
✓ inclusive o PARSING, onde metade dos bugs mora.

## ⚠ a linha 3 é a da PERFORMANCE
inicializar o estado DENTRO da função de fuzz
faz cada execução pagar o custo.
⚠ e o custo pode ser 1000×.

## ⚠ A REGRA
fuzze a função mais PROFUNDA que ainda aceita bytes.
cada nível que você desce é código que você DEIXA DE EXERCITAR —
e o PARSING é exatamente onde a entrada encontra o LIMITE.
EOF

cat do-zero.md

echo
echo "═══ 3. três harnesses, comparados ═══"
echo
cat <<'EXPL'
  ── HARNESS RUIM 1: o que valida ──
```c
int LLVMFuzzerTestOneInput(const uint8_t *d, size_t n) {
    if (n < 6) return 0;              /* ⚠ FILTRA */
    if (n > 8192) return 0;           /* ⚠ FILTRA */
    parse(d, n);
    return 0;
}
```
     ⚠ o fuzzer nunca vê o que acontece com entrada curta ou longa.
     ✓ e a fronteira "size < 6" é exatamente onde pode haver bug.

  ── HARNESS RUIM 2: o que aborta ──
```c
int LLVMFuzzerTestOneInput(const uint8_t *d, size_t n) {
    int r = parse(d, n);
    if (r < 0) abort();               /* ⚠ FALSO CRASH */
    return 0;
}
```
     ⚠ o alvo REJEITAR entrada inválida é correto.
     ✓ e você transformou isso em "crash".

  ── HARNESS BOM ──
```c
int LLVMFuzzerTestOneInput(const uint8_t *d, size_t n) {
    parse(d, n);                      /* ✓ e só */
    return 0;
}
```
     ✓ o alvo decide; você traduz.
EXPL
```

⚠ **Os dois harnesses ruins são o instrumento.** **E o segundo é o mais insidioso:** **ele transforma
uma decisão correta do alvo em "crash"** — **e você gasta dias triando o que não é bug.**

⚠ **E o harness bom cabe numa linha.** **É o argumento do módulo:** **a qualidade do harness é
proporcional ao que ele **não** faz.**

**Produza `tres-harnesses.md`:**

| Harness | O que faz | Problema |
|---|---|---|
| O que valida | | |
| O que aborta | | |
| O bom | | |

**Responda:**

1. **O que o harness que valida impede?
2. **Por que o `abort()` gera falso crash?
3. **Por que o harness bom é tão curto?
4. **Qual dos três erros é o mais insidioso?** Por quê?

---

## 3.3 O harness que usa o diferencial

⚠ **O salto do curso: **o harness pode ter um oráculo melhor que o crash** — **e é o do Parser
Differentials.**

| Oráculo do harness | O que detecta |
|---|---|
| ⚠ **Crash** (padrão) | Bugs de memória |
| ⚠ **Comparação** | ⚠ **Duas implementações discordam** |
| ⚠ **Invariante** | ⚠ **Uma propriedade foi violada** |

⚠ **A tabela do que cada oráculo exige:**

| Oráculo | Exige | ⚠ Alcança |
|---|---|---|
| Crash | Sanitizer | ⚠ Satura |
| **Comparação** | ⚠ **Duas implementações** | ⚠ **Bugs de lógica** |
| **Invariante** | ⚠ **Saber o que DEVE valer** | ⚠ **O mais amplo** |

⚠ **A linha do invariante é a mais poderosa e a mais subestimada.** **Ela não precisa de duas
implementações** — **precisa de uma propriedade que você afirma ser verdadeira.**

⚠ **E o exemplo concreto, no alvo do curso:**

| Invariante | ⚠ Se violado |
|---|---|
| ⚠ **`size` suficiente para os bytes lidos** | ⚠ **Leitura fora da entrada** |
| `total` não excede o destino | Overflow |
| O retorno é consistente com a entrada | Lógica |
| ⚠ **A execução não lê fora do buffer** | ⚠ **O bug real do alvo** |

⚠ **A quarta linha é o bug que o alvo do módulo 1 tem.** **E ele **não crasha sozinho** — **só com
ASan.** **É por isso que o sanitizer é o oráculo mínimo.**

⚠ **A regra escrita:**

> **O crash é o oráculo mais fraco que existe.** **Ele só vê o que o sistema operacional percebe.**
> **O invariante vê o que está errado mesmo quando nada quebra.**

```bash
cd ~/fuzz-lab/mod03

echo "═══ 4. o harness com invariante ═══"
echo
cat > invariante.md <<'EOF'
# O harness com invariante

| Oráculo | Exige | Alcança |
|---|---|---|
| ⚠ CRASH (padrão) | sanitizer | ⚠ SATURA |
| COMPARAÇÃO | duas implementações | ⚠ bugs de LÓGICA |
| ⚠ INVARIANTE | saber o que DEVE valer | ⚠ o MAIS AMPLO |

## ⚠ a linha do invariante
ela NÃO precisa de duas implementações —
precisa de uma PROPRIEDADE que você afirma ser verdadeira.

## O exemplo, no alvo do curso
| Invariante | Se violado |
|---|---|
| ⚠ `size` suficiente para os bytes lidos | ⚠ leitura FORA da entrada |
| `total` não excede o destino | overflow |
| o retorno é consistente com a entrada | lógica |
| ⚠ a execução não lê fora do buffer | ⚠ **o bug REAL do alvo** |

## ⚠ a quarta linha é o bug do módulo 1
e ele NÃO crasha sozinho — só com ASan.
✓ é por isso que o SANITIZER é o oráculo MÍNIMO.

## ⚠ A REGRA
o crash é o oráculo mais FRACO que existe.
ele só vê o que o SISTEMA OPERACIONAL percebe.
⚠ o invariante vê o que está ERRADO mesmo quando nada quebra.
EOF

cat invariante.md

echo
echo "═══ 5. e o harness que compara ═══"
cat > harness_diferencial.c <<'EOF'
/*
 * ⚠ HARNESS DIFERENCIAL — o oráculo do curso de Parser Differentials.
 *
 *   ele roda DUAS implementações e ABORTA quando elas discordam.
 *   ✓ e o "crash" que ele produz É o achado.
 */
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

/* ⚠ as duas implementações — a sua e a de referência */
extern int parse_impl_a(const uint8_t *data, size_t size);
extern int parse_impl_b(const uint8_t *data, size_t size);

static int ja_inicializou = 0;

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    /* ⚠ inicialize UMA vez — fora do caminho quente */
    if (!ja_inicializou) {
        ja_inicializou = 1;
    }

    int a = parse_impl_a(data, size);
    int b = parse_impl_b(data, size);

    /* ⚠ O ORÁCULO: as duas discordam? */
    if (a != b) {
        /* ✓ e o abort É o achado — o LibFuzzer guarda a entrada */
        fprintf(stderr, "DIVERGENCIA: a=%d b=%d size=%zu\n", a, b, size);
        abort();
    }

    return 0;
}
EOF

echo "  ── o harness diferencial está escrito ──"
echo
echo "  ⚠ E NOTE O QUE ELE FAZ:"
cat <<'EXPL'
     · chama AS DUAS implementações
     · compara os resultados
     · ABORTA quando discordam
     ✓ e é o abort que faz o fuzzer guardar a entrada.

  ── POR QUE ISSO IMPORTA ──
     ⚠ um fuzzer por crash acha o que CRASHA.
     ⚠ um fuzzer por diferencial acha o que está ERRADO.
     ✓ e é o que o 1dFuzz formaliza (módulo 8).
EXPL
```

⚠ **O harness diferencial é a ponte com o curso anterior.** **E ele é curto** — **porque o oráculo é
uma comparação.**

⚠ **E a nota do "abort é o achado" é o mecanismo:** **o harness usa o **crash** como canal para
reportar a **divergência**.** **É a mesma técnica do `1dFuzz`.**

**Produza `harness-diferencial.md`:**

| Oráculo | O que exige |
|---|---|
| Crash | |
| Comparação | |
| Invariante | |

**Responda:**

1. **O que o harness diferencial faz?** E o que o `abort` significa?
2. **Por que o invariante é o mais amplo?
3. **O que o crash não vê que o invariante vê?
4. **Como isso se liga ao módulo 8?

---

## 3.4 LAB — Escreva o harness

**Duração:** 150 min

### Passo 1 — O harness mínimo (50 min)

⚠ **O alvo do módulo 1, e o harness que **não** valida.**

```bash
cd ~/fuzz-lab/harness

echo "═══ O HARNESS MÍNIMO ═══"
echo

cat > harness_minimo.c <<'EOF'
/*
 * ⚠ O HARNESS MÍNIMO — e o correto.
 *   ele NÃO valida. ele NÃO filtra. ele NÃO aborta em erro.
 */
#include <stdint.h>
#include <stddef.h>

int parse(const uint8_t *data, size_t size);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    /* ⚠ e só isto */
    parse(data, size);
    return 0;
}
EOF

cat > harness_ruim.c <<'EOF'
/*
 * ⚠ O HARNESS RUIM — para você MEDIR a diferença.
 */
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>

int parse(const uint8_t *data, size_t size);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    if (size < 6) return 0;          /* ⚠ FILTRA */
    if (size > 4096) return 0;       /* ⚠ FILTRA */
    int r = parse(data, size);
    if (r < 0) abort();              /* ⚠ FALSO CRASH */
    return 0;
}
EOF

echo "  ── os dois harnesses estão escritos ──"
echo
echo "═══ COMPILANDO OS DOIS, CONTRA O MESMO ALVO ═══"
echo
cd ~/fuzz-lab/alvos 2>/dev/null && {
    clang -fsanitize=fuzzer,address -g -o fuzz_minimo \
        parser_alvo.c ~/fuzz-lab/harness/harness_minimo.c 2>&1 | head -3
    [ -f fuzz_minimo ] && echo "     ✓ fuzz_minimo" || echo "     ⚠ falhou"

    clang -fsanitize=fuzzer,address -g -o fuzz_ruim \
        parser_alvo.c ~/fuzz-lab/harness/harness_ruim.c 2>&1 | head -3
    [ -f fuzz_ruim ] && echo "     ✓ fuzz_ruim" || echo "     ⚠ falhou"
} || echo "  ⚠ o alvo do módulo 1 não existe"
echo

echo "═══ E O CORPUS MÍNIMO, PARA OS DOIS ═══"
mkdir -p /tmp/corpus-min && printf '\x01\x00\x00\x00\x00\x00AAAA' > /tmp/corpus-min/seed
ls -l /tmp/corpus-min/ | sed 's/^/     /'
echo
echo "  ── PARA RODAR ──"
cat <<'EXPL'
     # terminal 1 — o harness BOM
     ./alvos/fuzz_minimo /tmp/corpus-min -max_total_time=120 -print_final_stats=1

     # terminal 2 — o harness RUIM
     ./alvos/fuzz_ruim /tmp/corpus-min -max_total_time=120 -print_final_stats=1

     ⚠ e compare as duas saídas:
        · cov: a cobertura de cada
        · ⚠ e quantos "crashes" o ruim reporta
EXPL
```

⚠ **Os dois harnesses, compilados contra o mesmo alvo, são o experimento.** **E a comparação é
direta:** **o ruim filtra e inventa crashes; o bom chega mais longe.**

⚠ **E a nota dos "falsos crashes" é o custo real:** **o harness ruim vai reportar cada entrada
inválida como crash** — **e você vai triar centenas de não-bugs.**

**Produza `harness-minimo.md`:**

| Harness | O que faz | Cobertura |
|---|---|---|
| Mínimo | | |
| Ruim | | |

**Responda:**

1. **O harness mínimo validou algo?** Por quê?
2. **Quantos "crashes" o harness ruim reportou?
3. **A cobertura difere?** Como?
4. **Qual dos dois você manteria?

### Passo 2 — Meça o custo de inicializar (40 min)

⚠ **A performance do harness — e ela decide quantas execuções você tem.**

```bash
cd ~/fuzz-lab/harness

echo "═══ O CUSTO DA INICIALIZAÇÃO ═══"
echo
cat <<'EXPL'
  ── O EXPERIMENTO ──

     1. um harness que inicializa DENTRO
     2. um harness que inicializa FORA
     3. ⚠ e compare as execuções por segundo

  ── E A ESCALA DO PROBLEMA ──
     · in-process:        10.000 a 100.000 exec/s
     · ⚠ inicializando a cada chamada: 10 a 1.000 exec/s
     · ⚠ e por processo (AFL++ sem persistent): 50 a 500 exec/s

     ✓ a diferença é de ORDENS DE MAGNITUDE.
EXPL

cat > harness_lento.c <<'EOF'
/*
 * ⚠ HARNESS LENTO — inicializa a cada chamada.
 *   didático: mostra o custo.
 */
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

int parse(const uint8_t *data, size_t size);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    /* ⚠ inicialização CARA dentro do caminho quente */
    char *buf = malloc(65536);
    if (!buf) return 0;
    memset(buf, 0, 65536);              /* ⚠ 64 KB a cada execução */

    parse(data, size);

    free(buf);                          /* ⚠ e libera */
    return 0;
}
EOF

cat > harness_rapido.c <<'EOF'
/*
 * ✓ HARNESS RÁPIDO — inicializa UMA vez.
 */
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

int parse(const uint8_t *data, size_t size);

static char *buf = NULL;

static void inicializa(void) __attribute__((constructor));
static void inicializa(void) {
    /* ⚠ UMA vez, antes do fuzz */
    buf = malloc(65536);
    if (buf) memset(buf, 0, 65536);
}

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    parse(data, size);
    return 0;
}
EOF

cd ~/fuzz-lab/alvos 2>/dev/null && {
    clang -fsanitize=fuzzer,address -g -o fuzz_lento \
        parser_alvo.c ~/fuzz-lab/harness/harness_lento.c 2>&1 | head -3
    [ -f fuzz_lento ] && echo "     ✓ fuzz_lento" || echo "     ⚠ falhou"
    clang -fsanitize=fuzzer,address -g -o fuzz_rapido \
        parser_alvo.c ~/fuzz-lab/harness/harness_rapido.c 2>&1 | head -3
    [ -f fuzz_rapido ] && echo "     ✓ fuzz_rapido" || echo "     ⚠ falhou"
} || echo "  ⚠ o alvo não existe"
echo
echo "  ── e a medição ──"
cat <<'EXPL'
     ⚠ rode os dois por 30s e compare a linha "exec/s":

     ./alvos/fuzz_lento  /tmp/corpus-min -max_total_time=30 2>&1 | tail -5
     ./alvos/fuzz_rapido /tmp/corpus-min -max_total_time=30 2>&1 | tail -5

     ✓ a diferença mostra POR QUE a inicialização sai do caminho quente.
EXPL
```

⚠ **O custo da inicialização é o instrumento.** **E a escala é o argumento:** **in-process são
100.000 exec/s; por processo, 500** — **e inicializando a cada chamada, menos ainda.**

⚠ **E é o módulo 11 antecipado:** **execuções por segundo é o que multiplica a chance de achar** —
**e o harness decide esse número.**

**Produza `custo.md`:**

| Harness | Exec/s | Diferença |
|---|---|---|
| Lento | | |
| Rápido | | |

**Responda:**

1. **Qual a diferença de execuções por segundo?
2. **Por que a inicialização sai do caminho quente?
3. **O que o `constructor` faz?** Por que funciona?
4. **Por que exec/s importa mais que horas de campanha?

### Passo 3 — Documente o harness (60 min)

Produza `caderno/PD-003.md`:

```markdown
# PD-003 — o harness

**Data:** ____

## 1. O alvo
| Item | Valor |
|---|---|
| o que é | |
| a função FUZZADA | |
| ⚠ por que esta (a mais profunda?) | |

## 2. O estado
| Item | Valor |
|---|---|
| precisa inicializar algo? | |
| ⚠ inicializo onde | fora / dentro |
| o que vaza entre chamadas | |

## 3. O harness
```c
[cole o harness]
```

## 4. ⚠ O que o harness NÃO faz
| Item | Feito? |
|---|---|
| não valida antes | [ ] |
| não filtra o inválido | [ ] |
| não aborta em erro esperado | [ ] |

## 5. A medição
| Harness | exec/s | cobertura |
|---|---|---|
| mínimo | | |
| ruim | | |
| lento | | |
| rápido | | |

## 6. ⚠ Os falsos crashes do harness ruim
| Item | Valor |
|---|---|
| quantos reportou | |
| ⚠ por quê | |
| o custo de triar isso | |

## 7. O oráculo
| # | Oráculo | Usado? |
|---|---|---|
| 1 | crash (sanitizer) | |
| 2 | comparação | |
| 3 | ⚠ invariante | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro

## 9. O que NÃO foi verificado
⚠ mínimo 3
```

Produza `relatorio-harness.md`:

```markdown
# Relatório — o harness

## 1. O alvo e a função fuzzada
| Item | Valor |
|---|---|
| alvo | |
| função | |
| por que a mais profunda | |

## 2. O harness final
```c
[cole]
```

## 3. O que ele NÃO faz
| Item | Justificativa |
|---|---|
| não valida | ⚠ o alvo decide |
| não aborta | ⚠ rejeitar é correto |

## 4. A medição de performance
| Versão | exec/s | Δ |
|---|---|---|
| inicializando dentro | | |
| inicializando fora | | |

## 5. ⚠ A comparação bom × ruim
| Métrica | bom | ruim |
|---|---|---|
| cobertura | | |
| crashes | | |
| ⚠ falsos | | |

## 6. O oráculo escolhido
| # | Oráculo | Por quê |
|---|---|---|
| | | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro
- [ ] não triei crash que não reproduzi

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O próximo passo
| # | Ação | Prioridade |
```

**Produza `relatorio-harness.md`:**

| Item | Valor |
|---|---|
| Função fuzzada | |
| exec/s | |
| Falsos crashes | |
| Oráculo | |

**Responda:**

1. **Qual função você fuzzou?** É a mais profunda?
2. **Quantas exec/s você tem?** O que a limita?
3. **Quantos falsos crashes o harness ruim gerou?
4. **Qual oráculo você escolheu?** Por quê?

### Critérios de aceitação

- `harness.md` com a **forma canônica** e o que ela **não** faz.
- Você explicou **por que "validar antes" parece correto e é errado**.
- Você explicou **o que o `abort()` produz**.
- `do-zero.md` com os **cinco** passos.
- Você explicou **por que a função mais profunda** que aceita bytes.
- Você explicou **por que inicializar fora do caminho quente**.
- `tres-harnesses.md` comparando os três.
- Você explicou **qual dos três erros é o mais insidioso**.
- `invariante.md` com os **três** oráculos e o que cada um exige.
- Você explicou **por que o crash é o mais fraco**.
- Você explicou **por que o sanitizer é o oráculo mínimo**.
- O **harness diferencial** escrito, com o `abort` como canal.
- **Os dois harnesses compilados** contra o mesmo alvo.
- A **cobertura medida** nos dois, com a diferença.
- Você explicou **quantos falsos crashes** o harness ruim gerou.
- O **custo da inicialização** medido, com exec/s.
- Você explicou **por que exec/s importa mais que horas**.
- `caderno/PD-003.md` com as **nove** seções.
- `relatorio-harness.md` com as **nove** seções.
- ⚠ **Nenhum fuzz pela rede.**

---

## Avaliação

1. **O que o harness é?** Para que ele existe?
2. **Qual a forma canônica** no LibFuzzer?
3. **O que ela **não** faz?** Por quê?
4. **Cite cinco erros de harness** e o sintoma de cada.
5. **Qual é o erro do módulo?** Por que parece correto?
6. **O que um `abort()` no erro esperado produz?
7. **Cite os cinco passos** do harness do zero.
8. **Qual função fuzzar?** Por quê?
9. **Por que fuzzar a função "de dentro" é armadilha?
10. **Onde inicializar o estado?** Por quê?
11. **O que fazer com o que vaza?
12. **Cite os três oráculos** e o que cada um exige.
13. **Qual é o mais fraco?** Por quê?
14. **Qual é o mais amplo?** Por quê?
15. **Por que o sanitizer é o oráculo mínimo?
16. **O que o harness diferencial faz?** O que o `abort` significa?
17. **Por que exec/s importa mais que horas de campanha?
18. **Qual a diferença entre in-process e por processo?
19. **O que o harness ruim custa** em triagem?
20. **Como o harness se liga ao módulo 8?

---

**Próximo:** [Módulo 4 — Cobertura e o guia](modulo-04.md)
