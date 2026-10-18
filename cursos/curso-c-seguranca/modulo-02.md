# Módulo 2 — Ponteiro, Array e o Modelo de Memória

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Explicar o que um ponteiro **é**, fisicamente: um número que é endereço.
2. Desenhar o layout de memória de um programa, com endereços reais.
3. Distinguir array de ponteiro — e entender por que confundir causa bug.
4. Calcular `sizeof` de array e de ponteiro, e saber quando cada um vale.
5. Entender aritmética de ponteiro e por que ela passa do limite sem avisar.

---

## 2.1 Ponteiro é um número

⚠ **Toda a confusão sobre ponteiro desaparece quando você aceita isto:** um ponteiro **é** um
inteiro sem sinal, do tamanho do endereço, que o processador usa para acessar memória.

```
   int32_t  x = 42;         ┌──────────────┐
                            │  42          │  ← 4 bytes na memória
                            └──────────────┘
                              endereço: 0x7ffd1234

   int32_t *p = &x;         ┌──────────────┐
                            │ 0x7ffd1234   │  ← 8 bytes, e o valor É o endereço
                            └──────────────┘
```

```bash
cd ~/c-lab/src

cat > ponteiro1.c <<'EOF'
#include <stdio.h>
#include <stdint.h>

int main(void) {
    int32_t  x = 42;
    int32_t *p = &x;

    printf("valor de x        = %d\n", x);
    printf("endereço de x     = %p\n", (void *)&x);
    printf("valor de p        = %p   ← é o endereço de x\n", (void *)p);
    printf("endereço de p     = %p\n", (void *)&p);
    printf("valor apontado *p = %d\n", *p);

    printf("\no ponteiro como número:\n");
    printf("  p em decimal    = %lu\n", (unsigned long)p);
    printf("  sizeof(p)       = %zu bytes\n", sizeof(p));

    /* ⚠ manipular o ponteiro como inteiro — só para DEMONSTRAR */
    uintptr_t como_numero = (uintptr_t)p;
    printf("  como uintptr_t  = 0x%lx\n", (unsigned long)como_numero);

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/ponteiro1 ponteiro1.c && ../bin/ponteiro1
```

⚠ **`&x` = "endereço de x"; `*p` = "valor no endereço em p".** São operações inversas. E `p` guarda
8 bytes, porque em x86-64 todo endereço tem 64 bits.

⚠ **`%p` espera `void *`.** Passe o ponteiro com o cast `(void *)`. Sem isso, `%p` com outro tipo é
**comportamento indefinido** — e é o tipo de erro que passa em um compilador e falha em outro.

**Produza `ponteiro1.md`:**

| Expressão | Valor | O que é |
|---|---|---|
| `x` | | |
| `&x` | | |
| `p` | | |
| `&p` | | |
| `*p` | | |
| `sizeof(p)` | | |

**Responda:**

1. `p` e `&x` têm o mesmo valor? **Rode duas vezes** — mudam entre execuções?
2. `&p` é diferente de `p`. Por que? O que vive em `&p`?
3. Por que `sizeof(p)` é 8 e não 4?

---

## 2.2 O mapa de memória, com endereço real

O curso de assembly desenhou isso. Aqui você confirma com o kernel.

```bash
cat > mapa.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int    global_ini = 42;                 /* .data   */
int    global_zero;                     /* .bss    */
const char *literal = "texto";          /* .rodata */

int main(void) {
    int   local = 7;                    /* stack   */
    char *heap  = malloc(32);           /* heap    */
    strcpy(heap, "no heap");

    printf("código    (main)   : %p\n", (void *)main);
    printf("literal   .rodata  : %p\n", (void *)literal);
    printf(".data     global   : %p\n", (void *)&global_ini);
    printf(".bss      global   : %p\n", (void *)&global_zero);
    printf("heap      malloc   : %p\n", (void *)heap);
    printf("stack     &local    : %p\n", (void *)&local);

    free(heap);
    return 0;
}
EOF

gcc -Wall -Wextra -no-pie -g -O0 -o ../bin/mapa mapa.c && ../bin/mapa

echo
echo "════ mapa do kernel para o MESMO processo ════"
./../bin/mapa > /dev/null &
PID=$!
sleep 0.1
cat /proc/$PID/maps 2>/dev/null | head -12 || echo "(processo terminou rápido demais)"
```

⚠ **`-no-pie` faz os endereços serem fixos**, então `objdump` e execução coincidem. Sem ele, cada
execução dá endereços diferentes. **Com PIE você não consegue comparar.**

**Confirme a ordem de endereço:**

| Região | Endereço | Comparação |
|---|---|---|
| `.text` | | menor ✓ |
| `.rodata` | | |
| `.data` | | |
| `.bss` | | |
| heap | | |
| stack | | **maior** ✓ |

**Responda:**

1. O heap está em endereço **maior** ou **menor** que a stack?
2. `.rodata` está abaixo ou acima de `.data`?
3. Duas variáveis consecutivas na stack: **os endereços sobem ou descem?** Teste:

```bash
cat > direcao.c <<'EOF'
#include <stdio.h>
int main(void) {
    int a = 1, b = 2, c = 3;
    printf("&a = %p\n&b = %p\n&c = %p\n", (void*)&a, (void*)&b, (void*)&c);
    printf("\n&a < &b? %s\n", (&a < &b) ? "sim" : "não");
    return 0;
}
EOF
gcc -Wall -Wextra -no-pie -g -O0 -o ../bin/direcao direcao.c && ../bin/direcao
```

⚠ **A resposta 3 é importante e não é garantida pelo padrão.** A ordem de variáveis locais depende
do compilador e da otimização — e é exatamente o que torna stack overflow não trivial de prever.
O padrão C **não** diz nada sobre a ordem. É por isso que você **mede**, não deduz.

---

## 2.3 Array e ponteiro — parentes, não gêmeos

⚠ **O erro mais comum de C.** A relação entre array e ponteiro é real, mas limitada.

```bash
cat > array1.c <<'EOF'
#include <stdio.h>

int main(void) {
    int32_t arr[5] = {10, 20, 30, 40, 50};
    int32_t *p = arr;              /* array decai para ponteiro */

    printf("═══ valores ═══\n");
    printf("arr[2]     = %d\n", arr[2]);
    printf("p[2]       = %d\n", p[2]);
    printf("*(arr + 2) = %d\n", *(arr + 2));
    printf("*(p + 2)   = %d\n", *(p + 2));

    printf("\n═══ endereços ═══\n");
    printf("arr        = %p\n", (void *)arr);
    printf("&arr[0]    = %p\n", (void *)&arr[0]);
    printf("p          = %p\n", (void *)p);

    printf("\n═══ A DIFERENÇA QUE IMPORTA ═══\n");
    printf("sizeof(arr) = %zu   ← o array inteiro\n", sizeof(arr));
    printf("sizeof(p)   = %zu   ← o ponteiro só\n", sizeof(p));
    printf("nº de itens = %zu\n", sizeof(arr) / sizeof(arr[0]));

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/array1 array1.c && ../bin/array1
```

⚠ **`sizeof(arr)` é 20 (5 × 4); `sizeof(p)` é 8.** O array **sabe** seu tamanho; o ponteiro **não**.
É por isso que função que recebe array **não consegue** saber o tamanho:

```bash
cat > array2.c <<'EOF'
#include <stdio.h>

/* ⚠ ARMADILHA CLÁSSICA: sizeof aqui dá 8, não 20 */
void errada(int32_t arr[5]) {
    printf("dentro da função, sizeof(arr) = %zu  ← é o PONTEIRO\n", sizeof(arr));
}

/* a forma correta: passar o tamanho junto */
void correta(int32_t *arr, size_t n) {
    printf("com o tamanho passado, %zu itens\n", n);
    for (size_t i = 0; i < n; i++) printf("  arr[%zu] = %d\n", i, arr[i]);
}

int main(void) {
    int32_t arr[5] = {10, 20, 30, 40, 50};

    printf("em main, sizeof(arr) = %zu\n", sizeof(arr));
    errada(arr);
    correta(arr, sizeof(arr) / sizeof(arr[0]));
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/array2 array2.c && ../bin/array2
```

⚠ **A razão:** parâmetro de array **decai para ponteiro**. `int32_t arr[5]` no parâmetro é
**idêntico** a `int32_t *arr`. O `5` está lá só de enfeite — o compilador ignora.

⚠ **É por isso que toda função de biblioteca que opera em array recebe o tamanho.** `memcpy(dest,
src, n)`, `read(fd, buf, count)`, `snprintf(buf, size, ...)`. **A linguagem não tem como saber**, e
você passa.

**Produza `array.md`:**

| Expressão | Valor | Por quê |
|---|---|---|
| `sizeof(arr)` em `main` | | |
| `sizeof(arr)` em `errada` | | |
| `sizeof(p)` | | |
| `arr == &arr[0]`? | | |
| `*(arr + 2)` é igual a `arr[2]`? | | |

**Responda:**

1. Por que `sizeof(arr)` muda de `main` para dentro da função?
2. Se `arr[2]` é `*(arr + 2)`, **quanto** o compilador soma a `arr`? O que é a escala?
3. `int32_t arr[5]` no parâmetro é igual a `int32_t *arr`? Como você provaria?

---

## 2.4 Aritmética de ponteiro — e a escala

⚠ **`p + 1` não soma 1 byte.**

```bash
cat > aritmetica.c <<'EOF'
#include <stdio.h>
#include <stdint.h>

int main(void) {
    int32_t  i32[4] = {1, 2, 3, 4};
    int8_t   i8[4]  = {1, 2, 3, 4};
    int64_t  i64[4] = {1, 2, 3, 4};

    printf("═══ int32_t (4 bytes) ═══\n");
    for (int i = 0; i < 4; i++)
        printf("  &i32[%d] = %p\n", i, (void *)&i32[i]);
    printf("  (i32+1) - i32 = %td   ← em ELEMENTOS, não bytes\n", (i32 + 1) - i32);
    printf("  (char*)(i32+1) - (char*)i32 = %td bytes\n",
           (char *)(i32 + 1) - (char *)i32);

    printf("\n═══ int8_t (1 byte) ═══\n");
    for (int i = 0; i < 4; i++)
        printf("  &i8[%d] = %p\n", i, (void *)&i8[i]);

    printf("\n═══ int64_t (8 bytes) ═══\n");
    for (int i = 0; i < 4; i++)
        printf("  &i64[%d] = %p\n", i, (void *)&i64[i]);
    printf("  (i64+1) - i64 = %td elementos\n", (i64 + 1) - i64);

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/aritmetica aritmetica.c && ../bin/aritmetica
```

⚠ **A escala é `sizeof(tipo)`.** `int32_t*` + 1 anda 4 bytes; `int8_t*` + 1 anda 1 byte; `int64_t*`
+ 1 anda 8. **É por isso que o tipo do ponteiro importa** — e é por isso que `(char *)` é usado
quando você quer controle de byte.

```bash
# A demonstração de que o tipo do ponteiro muda o resultado
cat > tipo_importa.c <<'EOF'
#include <stdio.h>
#include <string.h>

int main(void) {
    unsigned char buf[16];
    memset(buf, 0, sizeof(buf));

    /* escreve 0x41414141 usando ponteiro de 4 bytes */
    *(unsigned int *)(buf + 4) = 0x41414141;

    /* ⚠ mesmo endereço, ponteiro de 1 byte: escreve só 1 byte */
    *(unsigned char *)(buf + 8) = 0x42;

    printf("buf como hex: ");
    for (size_t i = 0; i < sizeof(buf); i++) printf("%02x ", buf[i]);
    printf("\n");
    printf("\nos 4 bytes em offset 4: 41 41 41 41  (int)\n");
    printf("o byte em offset 8:      42            (char)\n");
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/tipo_importa tipo_importa.c && ../bin/tipo_importa
```

⚠ **`0x41414141` escrito por um ponteiro de `int` ocupa 4 bytes; por um ponteiro de `char`, 1.**
Guarde isso — é a base de como uma escrita controlada vira controle de execução, no curso de fuzzing.

**E a demonstração de que aritmética de ponteiro **não** verifica limite:**

```bash
cat > sem_limite.c <<'EOF'
#include <stdio.h>
#include <stdint.h>

int main(void) {
    int32_t arr[4] = {10, 20, 30, 40};

    printf("tamanho real: %zu elementos\n\n", sizeof(arr) / sizeof(arr[0]));

    /* ⚠ lê além do array — o compilador NÃO reclama */
    for (int i = 0; i < 8; i++) {
        printf("arr[%d] = %d    (endereço %p)%s\n",
               i, arr[i], (void *)&arr[i],
               i >= 4 ? "   ← FORA DO ARRAY" : "");
    }
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/sem_limite sem_limite.c && ../bin/sem_limite
```

⚠ **Compilou sem aviso, rodou, e leu lixo.** O C **não verifica** limite de array — nem em leitura,
nem em escrita. É a razão número um pela qual C produz vulnerabilidade.

**Produza `aritmetica.md`:**

| Tipo do ponteiro | Passo de `p+1` |
|---|---|
| `int8_t *` | |
| `int32_t *` | |
| `int64_t *` | |
| `void *` | **não compila** — por quê? |

**Responda:**

1. Por que `(i32+1) - i32` dá 1 e não 4?
2. O que `(char *)` faz, e quando você precisa dele?
3. `arr[7]` compilou sem aviso. **Por que o compilador não reclama?**
4. Por que `void *` não aceita aritmética?

---

## 2.5 Ponteiro de ponteiro e o formato que você vai usar

```bash
cat > duplo.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ⚠ esta função DEVOLVE o ponteiro por parâmetro — o formato de `parse` */
int criar_string(const char *texto, char **saida) {
    if (!texto || !saida) return -1;

    size_t n = strlen(texto);
    char *novo = malloc(n + 1);          /* +1 para o '\0' */
    if (!novo) return -1;

    memcpy(novo, texto, n);
    novo[n] = '\0';

    *saida = novo;                        /* escreve NO PONTEIRO DO CHAMADOR */
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "uso: %s <texto>\n", argv[0]); return 2; }

    char *resultado = NULL;
    if (criar_string(argv[1], &resultado) != 0) {
        fprintf(stderr, "falhou\n");
        return 1;
    }

    printf("criado: '%s'  (%zu bytes)\n", resultado, strlen(resultado));
    free(resultado);                      /* ⚠ quem chamou é dono */
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/duplo duplo.c && ../bin/duplo "teste de ponteiro"

echo
echo "═══ argv já é um array de ponteiros ═══"
cat > argv.c <<'EOF'
#include <stdio.h>

int main(int argc, char **argv) {
    printf("argc = %d\n", argc);
    for (int i = 0; i < argc; i++)
        printf("  argv[%d] = \"%s\"   (endereço %p)\n",
               i, argv[i], (void *)argv[i]);
    printf("\nargv[argc] é NULL: %s\n", argv[argc] == NULL ? "sim" : "não");
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/argv argv.c && ../bin/argv um dois tres
```

⚠ **O padrão `char **saida` é o que você vai usar em todo parser.** Ele permite que a função
**devolva** um ponteiro alocado — junto com código de retorno para o erro. É o formato do `parse()`
que o curso de fuzzing usa.

⚠ **E `argv[argc]` é `NULL` — garantido pelo padrão.** É a única posição onde o C garante um
terminador. Por isso você pode iterar com `while (*argv)`.

**Produza `duplo.md`:**

| Elemento | O que é |
|---|---|
| `char **saida` | |
| `*saida = novo` | |
| Quem é dono do `novo`? | |
| Por que `n + 1` no `malloc`? | |

**Responda:**

1. Por que a função **não** pode devolver o ponteiro pelo `return`?
2. Se você esquecer o `free(resultado)`, o que acontece?
3. O `+1` no `malloc` — o que falta se você esquecer?
4. **Teste esquecer o `+1`** e veja o que acontece com o `printf`:

```bash
sed 's/malloc(n + 1)/malloc(n)/' duplo.c > duplo_bug.c
gcc -Wall -Wextra -g -O0 -o ../bin/duplo_bug duplo_bug.c
echo "═══ sem o +1 ═══"
../bin/duplo_bug "teste"
../bin/duplo_bug "teste maior ainda para ver"
```

---

## 2.6 LAB — Layout de memória à mão

**Duração:** 150 min

### Passo 1 — Mapa completo (40 min)

```bash
cd ~/c-lab/src

cat > lab2.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

int    global_ini  = 42;
int    global_zero;
const char *lit = "literal em rodata";

int main(void) {
    int32_t  local_a = 1;
    int32_t  local_b = 2;
    int32_t  arr[4]  = {10, 20, 30, 40};
    char    *heap    = malloc(64);
    strcpy(heap, "dado no heap");

    printf("═══ REGIÕES ═══\n");
    printf("  .text   main       %p\n", (void *)main);
    printf("  .rodata literal    %p\n", (void *)lit);
    printf("  .data   global_ini %p\n", (void *)&global_ini);
    printf("  .bss    global_zero %p\n", (void *)&global_zero);
    printf("  heap    malloc     %p\n", (void *)heap);
    printf("  stack   &local_a   %p\n", (void *)&local_a);

    printf("\n═══ STACK, na ordem do endereço ═══\n");
    printf("  &local_a = %p\n", (void *)&local_a);
    printf("  &local_b = %p\n", (void *)&local_b);
    for (int i = 0; i < 4; i++)
        printf("  &arr[%d]  = %p\n", i, (void *)&arr[i]);

    printf("\n═══ TAMANHOS ═══\n");
    printf("  sizeof(arr)     = %zu\n", sizeof(arr));
    printf("  sizeof(&arr)    = %zu\n", sizeof(&arr));
    printf("  sizeof(arr[0])  = %zu\n", sizeof(arr[0]));
    printf("  nº elementos    = %zu\n", sizeof(arr) / sizeof(arr[0]));

    free(heap);
    return 0;
}
EOF

gcc -Wall -Wextra -no-pie -g -O0 -o ../bin/lab2 lab2.c
../bin/lab2
```

### Passo 2 — Desenhe o mapa (40 min)

⚠ **O entregável central.** Em `lab2-mapa.md`, desenhe — com **endereços reais do seu sistema**:

```
endereço MAIOR
┌──────────────────────────────────────┬──────────────────┐
│ região                               │ endereço         │
├──────────────────────────────────────┼──────────────────┤
│ stack          (&local_a)            │ 0x...            │
│ stack          (&local_b)            │ 0x...            │
│ ...                                  │                  │
├──────────────────────────────────────┼──────────────────┤
│ heap           (malloc)              │ 0x...            │
├──────────────────────────────────────┼──────────────────┤
│ .bss           (global_zero)         │ 0x...            │
├──────────────────────────────────────┼──────────────────┤
│ .data          (global_ini)          │ 0x...            │
├──────────────────────────────────────┼──────────────────┤
│ .rodata        (lit)                 │ 0x...            │
├──────────────────────────────────────┼──────────────────┤
│ .text          (main)                │ 0x...            │
└──────────────────────────────────────┴──────────────────┘
endereço MENOR
```

**Responda:**

1. Os endereços estão em ordem? Alguma região está fora do lugar esperado?
2. `&local_a` e `&local_b` — qual é maior? **Isso bate com a ordem de declaração?**
3. `&arr[0]` até `&arr[3]` — sobem de 4 em 4? Confirme subtraindo.
4. `sizeof(arr)` vs. `sizeof(&arr)` — por que o segundo é 8?

⚠ **A resposta 2 não é garantida pelo padrão.** Se a ordem for invertida em relação à declaração,
isso é normal — o compilador reordena. **O ponto é: você mediu, não deduziu.**

### Passo 3 — Prove a aritmética (35 min)

```bash
cd ~/c-lab/src

cat > lab2-arit.c <<'EOF'
#include <stdio.h>
#include <stdint.h>

int main(void) {
    int32_t  a[4] = {1, 2, 3, 4};
    uint8_t  b[4] = {1, 2, 3, 4};
    int64_t  c[4] = {1, 2, 3, 4};

    printf("═══ passo em elementos ═══\n");
    printf("  (a+1)-a = %td\n", (a + 1) - a);
    printf("  (b+1)-b = %td\n", (b + 1) - b);
    printf("  (c+1)-c = %td\n", (c + 1) - c);

    printf("\n═══ passo em bytes ═══\n");
    printf("  int32_t*  +1 = %td bytes\n", (char *)(a + 1) - (char *)a);
    printf("  uint8_t*  +1 = %td bytes\n", (char *)(b + 1) - (char *)b);
    printf("  int64_t*  +1 = %td bytes\n", (char *)(c + 1) - (char *)c);

    printf("\n═══ sizeof do tipo apontado ═══\n");
    printf("  sizeof(*a) = %zu\n", sizeof(*a));
    printf("  sizeof(*b) = %zu\n", sizeof(*b));
    printf("  sizeof(*c) = %zu\n", sizeof(*c));

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/lab2-arit lab2-arit.c && ../bin/lab2-arit
```

Produza `lab2-aritmetica.md`:

| Ponteiro | Passo em elementos | Passo em bytes | `sizeof(*ptr)` |
|---|---|---|---|
| `int32_t *` | | | |
| `uint8_t *` | | | |
| `int64_t *` | | | |

**Responda:**

1. **O passo em bytes é sempre igual a `sizeof(*ptr)`?** Confirme com os três.
2. O passo em elementos é sempre 1. Por quê?
3. Se você tem `char *p` apontando para um `int32_t` e faz `p + 4`, você andou quantos bytes?
4. **Escreva a regra**: `ptr + n` anda `____` bytes.

### Passo 4 — Leia fora do array e explique (35 min)

```bash
cd ~/c-lab/src

cat > lab2-fora.c <<'EOF'
#include <stdio.h>
#include <stdint.h>

int main(void) {
    int32_t arr[4] = {100, 200, 300, 400};

    printf("lendo 10 posições, o array tem 4:\n\n");
    for (int i = 0; i < 10; i++) {
        printf("  arr[%2d] = %-12d  endereço %p%s\n",
               i, arr[i], (void *)&arr[i],
               (i >= 4) ? "   ← FORA" : "");
    }

    printf("\no que está fora do array é memória de OUTRA coisa.\n");
    return 0;
}
EOF

gcc -Wall -Wextra -no-pie -g -O0 -o ../bin/lab2-fora lab2-fora.c
../bin/lab2-fora
```

Produza `lab2-fora.md`:

| Índice | Valor | É do array? | O que provavelmente é |
|---|---|---|---|
| 0–3 | | sim | |
| 4 | | **não** | |
| 5 | | **não** | |
| ... | | | |

**Responda:**

1. **O compilador avisou** ao ler fora do array? Por quê não?
2. **Rode duas vezes.** Os valores de `arr[4]` em diante são os mesmos? Por quê?
3. Com `-O2`, o comportamento muda? **Teste** e relate.
4. Se isso fosse uma **escrita** em vez de leitura, o que mudaria de severidade?

⚠ **A resposta 2 é o ponto do módulo.** Se os valores mudam entre execuções, você está lendo
memória que **não é sua** — e o programa "funciona" por sorte. É a semente do módulo 5.

⚠ **Teste o `-O2` de verdade:**

```bash
gcc -Wall -Wextra -no-pie -g -O2 -o ../bin/lab2-fora-O2 lab2-fora.c
echo "═══ -O0 ═══"; ../bin/lab2-fora | head -8
echo "═══ -O2 ═══"; ../bin/lab2-fora-O2 | head -8
```

### Critérios de aceitação

- `ponteiro1.md` com os seis valores e a comparação entre execuções.
- `mapa.md` com a tabela de ordem, **medida** com `/proc/<pid>/maps`.
- `array.md` explicando por que `sizeof` muda dentro da função.
- Você provou que `int32_t arr[5]` no parâmetro é igual a `int32_t *arr`.
- `aritmetica.md` com a **regra** escrita: `ptr + n` anda `n × sizeof(*ptr)` bytes.
- `lab2-mapa.md` com o desenho e os **endereços reais**.
- Você comparou `-O0` e `-O2` no `lab2-fora` e **relatou a diferença**.
- Você explicou por que ler fora do array não gera aviso do compilador.

---

## Avaliação

1. Ponteiro é o quê, fisicamente? Por que `sizeof(p)` é 8?
2. Qual a diferença entre `&x` e `*p`? São inversas?
3. Desenhe o mapa de memória na ordem de endereço.
4. Heap e stack crescem em que direção? Como você confirmou?
5. A ordem das variáveis locais na stack é garantida pelo padrão? O que isso implica?
6. `sizeof(arr)` e `sizeof(p)` — por que diferem?
7. **Por que `sizeof(arr)` dentro de uma função dá 8?** O que isso obriga a fazer?
8. `arr[2]` é igual a `*(arr + 2)`. Quanto o compilador soma, e por quê?
9. Escreva a regra do passo de ponteiro: `ptr + n` anda quantos bytes?
10. Por que `(char *)` é usado quando você quer controle de byte?
11. Por que `void *` não aceita aritmética?
12. Por que o C **não** verifica limite de array? Cite leitura e escrita.
13. O que `char **saida` faz numa função, e por que o formato é útil?
14. Por que `argv[argc]` é `NULL`?
15. Por que esquecer o `+1` no `malloc` de string causa problema?

---

**Próximo:** [Módulo 3 — Alocação dinâmica e duração de vida](modulo-03.md)
