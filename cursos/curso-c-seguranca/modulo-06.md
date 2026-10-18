# Módulo 6 — As Sete Classes de Bug em C

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Reconhecer as sete classes **por leitura de código**, antes de rodar.
2. Entender o mecanismo de cada uma em nível de memória.
3. Relacionar cada classe com a fonte de UB que a origina.
4. Saber qual classe o sanitizer pega e qual ele **não** pega.
5. Escrever o antídoto de cada classe.

---

## ⚠ Este é o módulo mais importante do curso

Os módulos 1 a 5 ensinaram C e o que é UB. **Este ensina a achar o bug olhando o código** — que é
a habilidade de quem pesquisa vulnerabilidade.

⚠ **A tese do módulo:**

> **Bug de C não é aleatório. Ele tem sete formas, e você reconhece as sete por padrão de código.**

⚠ **E o inverso também vale:** quando você vir o padrão, o bug está lá. Não é "talvez". É
**reconhecimento**, e é treinável.

---

## 6.1 O mapa das sete classes

| # | Classe | Origem | Sanitizer | Severidade |
|---|---|---|---|---|
| 1 | **Stack buffer overflow** | Escrita além de buffer local | ASan | Alta |
| 2 | **Heap buffer overflow** | Escrita além de bloco alocado | ASan | Alta |
| 3 | **Use-after-free** | Uso após `free` | ASan | **Crítica** |
| 4 | **Integer overflow** | Aritmética estoura o tipo | UBSan | Média (isolado) |
| 5 | **Formato de `printf`** | Tipo não bate com o formato | `-Wformat` | Média-alta |
| 6 | **Desreferência de `NULL`** | Ponteiro nulo usado | ASan | Média |
| 7 | **Off-by-one** | Erro de 1 no limite | ASan (se redzone) | Média-alta |

⚠ **A ordem é por frequência em código real**, e as três primeiras respondem pela maioria dos CVEs
de corrupção de memória.

---

## 6.2 Classe 1 e 2 — buffer overflow

⚠ **A diferença entre stack e heap é onde o buffer vive** — o mecanismo do bug é o mesmo.

### Stack

```bash
cd ~/c-lab/src

cat > c1_stack.c <<'EOF'
#include <stdio.h>
#include <string.h>

typedef struct {
    char nome[8];
    int  nivel;            /* ⚠ vizinho na stack */
} Usuario;

int processar(const char *entrada) {
    Usuario u;
    u.nivel = 0;

    /* ⚠ BUG: sem verificação de limite */
    strcpy(u.nome, entrada);

    return u.nivel;
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;
    printf("nivel resultante: %d\n", processar(argv[1]));
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -fno-stack-protector -o ../bin/c1_stack c1_stack.c
clang -g -O1 -fsanitize=address,undefined -o ../bin/c1_stack_asan c1_stack.c

echo "═══ entrada curta (5) ═══"
../bin/c1_stack "abcde"
echo "═══ entrada exata (8) ═══"
../bin/c1_stack "abcdefgh"
echo "═══ entrada que passa (12) ═══"
../bin/c1_stack "aaaaaaaaaaaa"
echo
echo "═══ com ASan, entrada de 12 ═══"
../bin/c1_stack_asan "aaaaaaaaaaaa" 2>&1 | head -10
```

⚠ **O padrão que identifica a classe:**

```c
char buf[N];
strcpy(buf, fonte);        /* ← sem verificação */
sprintf(buf, "...", ...);  /* ← sem verificação */
memcpy(buf, fonte, n);     /* ← n não comparado com N */
```

**A regra de reconhecimento:** **toda** escrita em buffer local, com tamanho que **não** foi
comparado antes. Não importa a função — importa a ausência da comparação.

### Heap

```bash
cat > c2_heap.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char *expandir(const char *entrada, size_t n) {
    char *saida = malloc(n);              /* aloca n */
    if (!saida) return NULL;

    /* ⚠ BUG: escreve 2n num bloco de n */
    for (size_t i = 0; i < n; i++) {
        saida[i * 2]     = entrada[i];
        saida[i * 2 + 1] = '.';
    }
    return saida;
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;
    size_t n = strlen(argv[1]);
    char *r = expandir(argv[1], n);
    if (r) { printf("ok\n"); free(r); }
    return 0;
}
EOF

clang -g -O1 -fsanitize=address,undefined -o ../bin/c2_heap_asan c2_heap.c

echo "═══ entrada curta (3) ═══"
../bin/c2_heap_asan "abc" 2>&1 | head -6
echo
echo "═══ entrada maior (10) — o bug se manifesta ═══"
../bin/c2_heap_asan "abcdefghij" 2>&1 | head -12
```

⚠ **O padrão de reconhecimento para heap:** **a alocação e a escrita usam contas diferentes.**

```c
char *p = malloc(len);        /* conta A */
for (i = 0; i < len; i++)
    p[i*2] = ...;             /* conta B ≠ A   ← BUG */
```

**Antídoto:** a conta da escrita **tem que ser** a mesma da alocação. Ou você aloca o dobro, ou
divide a escrita.

---

## 6.3 Classe 3 — use-after-free

⚠ **A mais perigosa.** Já demonstrada no módulo 3, aqui com o mecanismo completo.

```bash
cat > c3_uaf.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char     *dados;
    size_t    tamanho;
    int     (*acao)(const char *);       /* ⚠ ponteiro de função */
} Objeto;

static int acao_padrao(const char *s) { (void)s; return 0; }

Objeto *criar(const char *s) {
    Objeto *o = calloc(1, sizeof(Objeto));
    if (!o) return NULL;
    o->dados   = strdup(s);
    o->tamanho = strlen(s);
    o->acao    = acao_padrao;
    return o;
}

void destruir(Objeto *o) {
    if (!o) return;
    free(o->dados);
    free(o);                              /* ⚠ o chamador ainda tem `o` */
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    Objeto *o = criar(argv[1]);
    if (!o) return 1;

    destruir(o);

    /* ⚠ USE-AFTER-FREE */
    printf("tamanho: %zu\n", o->tamanho);
    printf("dados:   %s\n",  o->dados);
    printf("acao:    %d\n",  o->acao("x"));

    return 0;
}
EOF

clang -g -O1 -fsanitize=address,undefined -o ../bin/c3_uaf_asan c3_uaf.c
../bin/c3_uaf_asan "teste" 2>&1 | head -14
```

### O padrão de reconhecimento

```
1. Existe uma função que libera (destruir, liberar, fechar)
2. O chamador continua com o ponteiro
3. O chamador usa o ponteiro DEPOIS de liberar
```

⚠ **Os três erros de contrato que geram UAF:**

| Erro | O que falta |
|---|---|
| **Ponteiro pendurado** | Quem libera não anula o ponteiro do chamador |
| **Donos múltiplos** | Dois lugares acham que são donos e um libera |
| **Retorno de ponteiro interno** | Função devolve ponteiro para dado que ela libera |

**Antídoto em três camadas:**

```c
/* 1. a função que libera ANULA o ponteiro do chamador */
void destruir(Objeto **po) {
    if (!po || !*po) return;
    free((*po)->dados);
    free(*po);
    *po = NULL;                  /* ← o chamador não tem mais ponteiro válido */
}
/* e o chamador: destruir(&o);  — passar o ENDEREÇO */

/* 2. documentar posse: destruir_* CONSOME */

/* 3. com sanitizer sempre ligado, o UAF aparece na hora */
```

⚠ **A primeira camada é a mais eficaz e a menos usada.** Passar `Objeto **` permite anular o
ponteiro do chamador — e aí usar depois é `NULL` deref, que o ASan pega **imediatamente** e sem
ambiguidade.

---

## 6.4 Classe 4 — integer overflow

```bash
cat > c4_int.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* ⚠ BUG: multiplicação em uint32_t que estoura */
uint8_t *alocar_buffer(uint32_t n_itens, uint32_t tam_item) {
    uint32_t total = n_itens * tam_item;         /* ⚠ pode estourar */

    printf("  n_itens=%u  tam_item=%u  total calculado=%u\n",
           n_itens, tam_item, total);

    uint8_t *buf = malloc(total);                /* aloca o valor ESTOURADO */
    if (!buf) return NULL;

    /* ⚠ escreve n_itens * tam_item bytes */
    for (uint32_t i = 0; i < n_itens; i++)
        memset(buf + (size_t)i * tam_item, 0x41, tam_item);

    return buf;
}

int main(int argc, char **argv) {
    if (argc < 3) return 2;

    uint32_t n  = (uint32_t)strtoul(argv[1], NULL, 10);
    uint32_t ti = (uint32_t)strtoul(argv[2], NULL, 10);

    uint8_t *b = alocar_buffer(n, ti);
    printf("  resultado: %s\n", b ? "ok" : "falhou");
    free(b);
    return 0;
}
EOF

clang -g -O1 -fsanitize=address,undefined -o ../bin/c4_int_asan c4_int.c

echo "═══ valores seguros ═══"
../bin/c4_int_asan 100 16

echo
echo "═══ valores que estouram uint32 ═══"
../bin/c4_int_asan 268435456 16      # 268435456 * 16 = 2^32
echo
echo "═══ e o UBSan? ═══"
clang -g -O1 -fsanitize=undefined -o ../bin/c4_int_ub c4_int.c
../bin/c4_int_ub 268435456 16 2>&1 | head -6
```

⚠ **O padrão de reconhecimento:** **toda multiplicação ou soma que compõe tamanho de alocação, sem
verificação prévia.**

```c
size_t total = a * b;         /* ← a e b vêm de entrada */
char *p = malloc(total);      /* ← aloca o resultado estourado */
```

⚠ **A distinção crítica e a razão pela qual `uint32_t` não é seguro para tamanho:**

| Tipo | Overflow é | UBSan pega? |
|---|---|---|
| `int` (com sinal) | **UB** | **Sim** |
| `unsigned` / `uint32_t` | **Definido** — envolve | **Não** |

⚠ **É a surpresa do módulo 5, aplicada:** usar `uint32_t` para tamanho **não gera UB** — mas
**também não gera aviso**. O valor envolve em silêncio, e o bug passa.

**Antídoto — a verificação correta:**

```c
/* ✓ para multiplicação */
if (b != 0 && a > SIZE_MAX / b) return NULL;      /* estouraria */
size_t total = a * b;

/* ✓ para soma */
if (b > SIZE_MAX - a) return NULL;                /* estouraria */
size_t total = a + b;
```

⚠ **Note que a verificação usa `SIZE_MAX / b` em vez de multiplicar.** É o mesmo princípio do
módulo 3 do curso de fuzzing: **checar antes, sem executar a operação que estoura.**

---

## 6.5 Classe 5 — formato de `printf`

⚠ **A classe que o compilador **pega** — se você deixar.**

```bash
cat > c5_format.c <<'EOF'
#include <stdio.h>
#include <stdint.h>
#include <string.h>

int main(void) {
    int          i = 42;
    long         l = 1234567890123L;
    char        *s = "texto";
    size_t       sz = sizeof(int);
    unsigned int u = 4000000000U;
    uint64_t     u64 = 0xDEADBEEFCAFEBABEULL;

    printf("═══ corretos ═══\n");
    printf("  int      %%d  → %d\n", i);
    printf("  long     %%ld → %ld\n", l);
    printf("  char*    %%s  → %s\n", s);
    printf("  size_t   %%zu → %zu\n", sz);
    printf("  unsigned %%u  → %u\n", u);
    printf("  uint64_t %%llu→ %llu\n", (unsigned long long)u64);

    printf("\n═══ ERRADOS (UB!) ═══\n");
    printf("  int com %%f     → %f\n", i);           /* ⚠ lê double de onde tem int */
    printf("  size_t com %%d  → %d\n", (int)sz);     /* ⚠ ok por sorte do cast */
    printf("  long com %%d    → %d\n", (int)l);      /* ⚠ truncou */
    printf("  uint64 com %%u  → %u\n", (unsigned)u64); /* ⚠ truncou */

    return 0;
}
EOF

echo "╔══════════ SEM aviso extra ══════════╗"
gcc -Wall -o ../bin/c5_gcc c5_format.c 2>&1 | head -6
../bin/c5_gcc

echo
echo "╔══════════ COM -Wformat=2 ══════════╗"
gcc -Wall -Wextra -Wformat=2 -o /dev/null c5_format.c 2>&1 | head -12
```

⚠ **`-Wformat=2` é a flag que pega esta classe.** Com `-Wall` sozinho, parte passa. Com
`-Wformat=2`, o compilador **compara o tipo de cada argumento com o formato** e avisa.

⚠ **E note o `%f` com `int`.** É o caso mais didático: `printf` lê o argumento como `double`, que
em x86-64 vai em registrador `xmm` — enquanto `int` foi para registrador inteiro. **O `printf` lê o
registrador errado**, e imprime lixo. Não é corrupção de memória; é leitura do valor errado.

⚠ **A gravidade real: `%s` com ponteiro de tipo errado.** Se o formato diz `%s` e o argumento é um
`int`, `printf` **interpreta o int como endereço** e tenta ler dali — **é corrupção de memória de
verdade**, e é o vetor de exploração de format string clássico.

**A tabela de formatos que você precisa de cor:**

| Tipo | Formato | Errado |
|---|---|---|
| `int` | `%d` | `%ld`, `%f` |
| `long` | `%ld` | `%d` (trunca) |
| `long long` | `%lld` | `%d` |
| `size_t` | **`%zu`** | `%d`, `%u` |
| `unsigned` | `%u` | `%d` |
| `char *` | `%s` | `%d` |
| `void *` | `%p` | `%s` |
| `double` | `%f` | `%d` |
| `uint64_t` | `%llu` com cast | `%u` |

⚠ **`%zu` para `sizeof` é obrigatório.** `sizeof` devolve `size_t`, e `%d` com `size_t` é UB — ainda
que "funcione" em máquina 32 bits.

---

## 6.6 Classe 6 — desreferência de `NULL`

```bash
cat > c6_null.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char *buscar(int id) {
    if (id < 0) return NULL;
    char *p = malloc(16);
    if (p) snprintf(p, 16, "item-%d", id);
    return p;                       /* pode devolver NULL */
}

int main(void) {
    printf("═══ caso 1: sem checar ═══\n");
    char *a = buscar(-1);
    printf("  a = %p\n", (void *)a);
    /* ⚠ sem checar NULL */
    printf("  a[0] = %c\n", a[0]);     /* UB: desreferência de NULL */

    return 0;
}
EOF

echo "═══ sem sanitizer: provavelmente SIGSEGV ═══"
gcc -Wall -Wextra -g -O0 -o ../bin/c6_null c6_null.c 2>/dev/null
../bin/c6_null; echo "  código: $?"

echo
echo "═══ com ASan ═══"
clang -g -O1 -fsanitize=address -o ../bin/c6_null_asan c6_null.c 2>/dev/null
../bin/c6_null_asan 2>&1 | head -8
```

⚠ **O padrão de reconhecimento:** **função que pode devolver `NULL`, cujo retorno é usado sem
checagem.** A pista está no `if (id < 0) return NULL;` — quem chama **precisa** checar.

⚠ **E `malloc` entra na mesma classe.** Todo `malloc` pode devolver `NULL`, e checar é obrigatório —
o módulo 3 já estabeleceu isso.

⚠ **A armadilha de `-O2`:** o compilador pode **assumir** que `NULL` nunca é desreferenciado, e
**remover** a checagem `if (!p)` — porque desreferenciar `NULL` é UB, então o caso não existe. É o
mecanismo do módulo 5, aplicado direto a código de segurança.

---

## 6.7 Classe 7 — off-by-one

⚠ **O erro de um byte, que é o mais sutil.**

```bash
cat > c7_offbyone.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

/* ⚠ BUG: escreve o NUL um byte além */
int copiar_errado(char *dst, size_t dst_n, const char *src) {
    size_t n = strlen(src);
    if (n > dst_n) return -1;

    memcpy(dst, src, n);
    dst[n] = '\0';                  /* ⚠ se n == dst_n, escreve FORA */
    return 0;
}

/* ✓ correto: o limite considera o NUL */
int copiar_certo(char *dst, size_t dst_n, const char *src) {
    size_t n = strlen(src);
    if (n >= dst_n) return -1;      /* >= : precisa do NUL */

    memcpy(dst, src, n + 1);
    return 0;
}

/* ⚠ outra forma de off-by-one: o laço clássico */
void preencher_errado(char *b, size_t n) {
    for (size_t i = 0; i <= n; i++)    /* ⚠ <= em vez de < */
        b[i] = 'x';
}

int main(void) {
    char buf[8];

    printf("═══ copiar_errado com n == dst_n ═══\n");
    printf("  src de 8 chars, dst de 8 bytes:\n");
    printf("  r=%d\n", copiar_errado(buf, sizeof(buf), "abcdefgh"));
    printf("  ⚠ o NUL foi escrito no byte 8 — FORA do buffer\n");

    printf("\n═══ copiar_certo com o mesmo caso ═══\n");
    printf("  r=%d  (recusa: 8 chars + NUL não cabem em 8)\n",
           copiar_certo(buf, sizeof(buf), "abcdefgh"));

    printf("\n═══ copiar_certo com 7 chars (cabe) ═══\n");
    printf("  r=%d  buf='%s'\n", copiar_certo(buf, sizeof(buf), "abcdefg"), buf);

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -fno-stack-protector -o ../bin/c7_off c7_offbyone.c
../bin/c7_off

echo
echo "═══ com ASan ═══"
clang -g -O1 -fsanitize=address,undefined -o ../bin/c7_off_asan c7_offbyone.c
../bin/c7_off_asan 2>&1 | head -10
```

⚠ **As três formas de off-by-one:**

| Forma | Código | Diferença |
|---|---|---|
| **`<=` em vez de `<`** | `for (i = 0; i <= n; i++)` | Escreve `n+1` elementos |
| **`>` em vez de `>=`** | `if (n > dst_n)` | Aceita o caso que transborda |
| **Esquecer o NUL** | `if (n > dst_n)` para string | Precisa de `n+1` bytes |

⚠ **É a classe mais fácil de errar e a mais difícil de ver.** Um byte não quebra nada na maioria
dos testes — e é o byte que, num alocador com redzone pequena, corrompe a estrutura interna.

⚠ **E é a classe em que o ASan ajuda menos.** Se o byte extra cai numa área alinhada do alocador,
o redzone pode não pegar. **É por isso que o `valgrind` (módulo 7) é complementar.**

---

## 6.8 LAB — Ache as sete classes

**Duração:** 150 min

### Passo 1 — Reconheça antes de rodar (45 min)

⚠ **O alvo esconde as sete classes. Ache todas por leitura, ANTES de compilar.**

```bash
cd ~/c-lab/src

cat > lab6-alvo.c <<'EOF'
/*
 * Alvo do módulo 6 — contém as SETE classes de bug.
 * ⚠ Encontre cada uma por LEITURA antes de rodar.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_NOME  16
#define MAX_ITENS 8

typedef struct {
    char   nome[MAX_NOME];
    size_t tamanho;
} Item;

typedef struct {
    Item    *itens;
    size_t   n;
    int     (*render)(const Item *);
} Lista;

static int render_padrao(const Item *i) {
    printf("    %s (%zu)\n", i->nome, i->tamanho);
    return 0;
}

/* (A) cria um item */
Item *item_novo(const char *nome) {
    Item *it = malloc(sizeof(Item));
    if (!it) return NULL;

    size_t n = strlen(nome);
    if (n > MAX_NOME) return it;              /* ⚠ deixa sem copiar */

    strcpy(it->nome, nome);                   /* suspeito */
    it->tamanho = n;
    return it;
}

/* (B) libera um item */
void item_libera(Item *it) {
    free(it);                                 /* não anula o chamador */
}

/* (C) cria uma lista com n itens */
Lista *lista_nova(uint32_t n) {
    Lista *l = malloc(sizeof(Lista));
    if (!l) return NULL;

    l->itens  = malloc(n * sizeof(Item));     /* suspeito */
    l->n      = n;
    l->render = render_padrao;
    return l;
}

/* (D) preenche a lista a partir de um buffer */
int lista_preenche(Lista *l, const uint8_t *buf, size_t len) {
    for (size_t i = 0; i < l->n; i++) {
        size_t off = i * sizeof(Item);
        if (off + sizeof(Item) > len) return -1;
        memcpy(&l->itens[i], buf + off, sizeof(Item));
    }
    return 0;
}

/* (E) renderiza */
void lista_render(Lista *l) {
    for (size_t i = 0; i <= l->n; i++)        /* suspeito */
        l->render(&l->itens[i]);
}

/* (F) busca por índice */
Item *lista_busca(Lista *l, size_t idx) {
    if (idx > l->n) return NULL;              /* suspeito */
    return &l->itens[idx];
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    /* (G) o uso */
    Lista *l = lista_nova(4);
    if (!l) return 1;

    l->itens[0] = *item_novo(argv[1]);

    uint8_t dados[sizeof(Item) * 4] = {0};
    memcpy(dados, argv[1], strlen(argv[1]));  /* suspeito */

    lista_preenche(l, dados, sizeof(dados));
    lista_render(l);

    printf("\nbusca[4]: %p\n", (void *)lista_busca(l, 4));

    free(l->itens);
    free(l);
    return 0;
}
EOF

echo "═══ ANTES DE COMPILAR: preencha lab6-reconhecimento.md ═══"
echo
echo "── compile com TODOS os avisos possíveis ──"
gcc -Wall -Wextra -Wformat=2 -Wstrict-aliasing -Wstrict-overflow=5 \
    -Wconversion -Wsign-conversion -Wshadow -Wcast-qual \
    -g -O0 -c -o /dev/null lab6-alvo.c 2>&1 | \
  grep -E 'warning' | sed 's/^/  /' | head -30

echo
echo "── quantos avisos no total? ──"
gcc -Wall -Wextra -Wformat=2 -g -O0 -c -o /dev/null lab6-alvo.c 2>&1 | grep -c warning
```

Produza `lab6-reconhecimento.md`:

| # | Classe | Linha | Código suspeito | Por que é bug |
|---|---|---|---|---|
| 1 | Stack overflow | | | |
| 2 | Heap overflow | | | |
| 3 | Use-after-free | | | |
| 4 | Integer overflow | | | |
| 5 | Formato | | | |
| 6 | `NULL` deref | | | |
| 7 | Off-by-one | | | |

⚠ **O gabarito (só leia depois de preencher):**

| # | Classe | Linha | Onde |
|---|---|---|---|
| 1 | Stack overflow | `item_novo` | `strcpy(it->nome, nome)` — limite testado com `>` mas `MAX_NOME` precisa do NUL |
| 2 | Heap overflow | `lista_preenche` / `main` | `memcpy(dados, argv[1], strlen(argv[1]))` — sem limite |
| 3 | UAF | `main` | `*item_novo(...)` devolve ponteiro que **nunca é liberado** mas também **não é guardado** — e `item_libera` não anula |
| 4 | Integer overflow | `lista_nova` | `n * sizeof(Item)` — `n` é `uint32_t`, sem checagem |
| 5 | Formato | `render_padrao` | `%zu` com `size_t` está **certo** — o bug é que **não há** formato errado. ⚠ **Armadilha: esta classe não está no alvo** |
| 6 | `NULL` deref | `main` | `*item_novo(...)` — retorno de `malloc` não checado, e `item_novo` devolve `it` sem preencher quando `n > MAX_NOME` |
| 7 | Off-by-one | `lista_render` e `lista_busca` | `i <= l->n` e `idx > l->n` |

⚠ **A linha 5 é a armadilha do lab.** Eu disse "as sete classes estão no alvo" — e a classe 5
**não está**. **Encontrar o que NÃO está é tão importante quanto encontrar o que está** — e é a
habilidade que o módulo 9 do curso de fuzzing formaliza.

**Responda:**

1. **Quantas das sete você achou?** Quais errou?
2. Qual classe **não está** no alvo? Como você descobriu?
3. Quantos avisos o compilador deu, e qual classe ele **não** avisou?
4. **Qual bug é o mais grave** por leitura, e por quê?

### Passo 2 — Confirme cada uma correndo (45 min)

```bash
cd ~/c-lab/src

clang -g -O1 -fsanitize=address,undefined -o ../bin/lab6_asan lab6-alvo.c 2>/dev/null
gcc -Wall -Wextra -g -O0 -o ../bin/lab6_plain lab6-alvo.c 2>/dev/null

for entrada in "curto" "$(python3 -c 'print("A"*20)')" "$(python3 -c 'print("B"*100)')"; do
    echo "════════ entrada de ${#entrada} chars ════════"
    printf '  plain: '
    ../bin/lab6_plain "${entrada}" >/dev/null 2>&1 && echo "ok" || echo "crash ($?)"
    printf '  asan : '
    saida=$(../bin/lab6_asan "${entrada}" 2>&1)
    if printf '%s' "$saida" | grep -q 'AddressSanitizer'; then
        printf '%s' "$saida" | grep -oE 'ERROR: AddressSanitizer: [a-z-]+' | head -1
        printf '%s' "$saida" | grep -m1 '#0 ' | sed 's/^/         /'
    else
        echo "ok"
    fi
done
```

Produza `lab6-confirmacao.md`:

| Entrada | `plain` | ASan detectou | Classe | Linha |
|---|---|---|---|---|
| `"curto"` | | | | |
| 20 chars | | | | |
| 100 chars | | | | |

**Responda:**

1. **Quantas classes o ASan pegou** nas três execuções?
2. Alguma classe **não** apareceu? Por que não?
3. O `plain` crashou? Em qual entrada?
4. **Qual classe você confirmou por leitura mas o ASan não pegou?**

⚠ **A resposta 4 é o ponto.** A classe 4 (integer overflow) só aparece se `n` for grande o
suficiente. **A leitura pegou; o teste não.** É por isso que as duas skills são necessárias.

### Passo 3 — Escreva os antídotos (40 min)

⚠ **Para cada classe, o antídoto em código.**

```bash
cd ~/c-lab/src

cat > lab6-fix.c <<'EOF'
/*
 * Versão CORRIGIDA — antídoto para cada classe presente no alvo.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_NOME  16
#define MAX_ITENS 8

typedef struct {
    char   nome[MAX_NOME];
    size_t tamanho;
} Item;

typedef struct {
    Item    *itens;
    size_t   n;
    int     (*render)(const Item *);
} Lista;

static int render_padrao(const Item *i) {
    if (!i) return -1;
    printf("    %s (%zu)\n", i->nome, i->tamanho);
    return 0;
}

/* ✓ antídoto: verificação de limite ANTES de copiar */
Item *item_novo(const char *nome) {
    if (!nome) return NULL;

    size_t n = strlen(nome);
    if (n >= MAX_NOME) return NULL;            /* >= : precisa do NUL */

    Item *it = calloc(1, sizeof(Item));
    if (!it) return NULL;

    memcpy(it->nome, nome, n + 1);
    it->tamanho = n;
    return it;
}

/* ✓ antídoto: ANULA o ponteiro do chamador */
void item_libera(Item **pit) {
    if (!pit || !*pit) return;
    free(*pit);
    *pit = NULL;
}

/* ✓ antídoto: checa overflow antes de multiplicar */
Lista *lista_nova(uint32_t n) {
    if (n > MAX_ITENS) return NULL;
    if (n != 0 && (size_t)n > SIZE_MAX / sizeof(Item)) return NULL;

    Lista *l = calloc(1, sizeof(Lista));
    if (!l) return NULL;

    l->itens = calloc(n ? n : 1, sizeof(Item));   /* calloc: zera E checa */
    if (!l->itens) { free(l); return NULL; }      /* ✓ limpa no erro */

    l->n      = n;
    l->render = render_padrao;
    return l;
}

/* ✓ antídoto: valida offset E comprimento */
int lista_preenche(Lista *l, const uint8_t *buf, size_t len) {
    if (!l || !buf) return -1;
    if (l->n == 0) return 0;

    if (l->n > len / sizeof(Item)) return -1;     /* ✓ checa antes do laço */

    for (size_t i = 0; i < l->n; i++)
        memcpy(&l->itens[i], buf + i * sizeof(Item), sizeof(Item));
    return 0;
}

/* ✓ antídoto: < em vez de <= */
void lista_render(Lista *l) {
    if (!l || !l->render) return;
    for (size_t i = 0; i < l->n; i++)
        l->render(&l->itens[i]);
}

/* ✓ antídoto: >= em vez de > */
Item *lista_busca(Lista *l, size_t idx) {
    if (!l) return NULL;
    if (idx >= l->n) return NULL;
    return &l->itens[idx];
}

/* ✓ antídoto: libera a lista inteira */
void lista_libera(Lista **pl) {
    if (!pl || !*pl) return;
    free((*pl)->itens);
    free(*pl);
    *pl = NULL;
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    char *nome = argv[1];
    if (strlen(nome) >= MAX_NOME) {
        fprintf(stderr, "erro: nome longo demais\n");
        return 1;
    }

    Lista *l = lista_nova(4);
    if (!l) return 1;

    /* ✓ o item é guardado E liberado */
    Item *it = item_novo(nome);
    if (!it) { lista_libera(&l); return 1; }
    l->itens[0] = *it;
    item_libera(&it);                       /* anula `it` */

    /* ✓ copia com limite */
    uint8_t dados[sizeof(Item) * 4] = {0};
    size_t copiar = strlen(nome);
    if (copiar > sizeof(dados)) copiar = sizeof(dados);
    memcpy(dados, nome, copiar);

    lista_preenche(l, dados, sizeof(dados));
    lista_render(l);

    printf("\nbusca[4]: %s\n",
           lista_busca(l, 4) ? "achou (bug!)" : "NULL (correto)");
    printf("busca[0]: %s\n",
           lista_busca(l, 0) ? "achou" : "NULL");

    lista_libera(&l);
    printf("\nliberado — sem vazamento\n");
    return 0;
}
EOF

echo "═══ compilando com TODOS os avisos ═══"
gcc -Wall -Wextra -Wformat=2 -Wstrict-prototypes -Werror \
    -g -O0 -o ../bin/lab6-fix lab6-fix.c && echo "✓ zero avisos"

echo
echo "═══ testando ═══"
../bin/lab6-fix "curto"
echo
../bin/lab6-fix "$(python3 -c 'print("A"*20)')" ; echo "código: $?"

echo
echo "═══ ASan confirma? ═══"
clang -g -O1 -fsanitize=address,undefined -o ../bin/lab6-fix_asan lab6-fix.c
../bin/lab6-fix_asan "curto" 2>&1 | tail -3
```

Produza `lab6-antidotos.md`:

| # | Classe | Antídoto aplicado | Verificação |
|---|---|---|---|
| 1 | Stack overflow | | |
| 2 | Heap overflow | | |
| 3 | UAF | | |
| 4 | Integer | | |
| 5 | `NULL` | | |
| 6 | Off-by-one | | |

**Responda:**

1. Quantos avisos o compilador deu **na versão corrigida** com `-Werror`?
2. **Qual antídoto mudou a assinatura** de uma função? Por quê era necessário?
3. O `lista_libera` anula o ponteiro. **O que isso previne?**
4. Teste removendo a checagem `if (n >= MAX_NOME)`. O ASan pega? **Faça o teste.**

### Passo 4 — A tabela de reconhecimento (20 min)

⚠ **O entregável que você vai usar para sempre.**

Produza `lab6-tabela.md`:

```markdown
# Tabela de reconhecimento — as sete classes

| Classe | Padrão de código | Aviso do compilador | Sanitizer | Antídoto |
|---|---|---|---|---|
| Stack overflow | | | | |
| Heap overflow | | | | |
| Use-after-free | | | | |
| Integer overflow | | | | |
| Formato | | | | |
| NULL deref | | | | |
| Off-by-one | | | | |
```

**Perguntas para fechar:**

1. **Qual classe o compilador pega melhor?** Com qual flag?
2. Qual classe o compilador **nunca** pega?
3. Qual classe o ASan pega **melhor**?
4. Qual classe **nem o ASan** pega de forma confiável?
5. **Se você tivesse que automatizar a detecção**, que três ferramentas você encadearia?

⚠ **A resposta 5 é o pipeline de segurança:** `clang -Wall -Wextra -Wformat=2 -Werror` na
compilação, `ASan+UBSan` no teste, `valgrind` para o que escapar. **É o módulo 7.**

### Critérios de aceitação

- `lab6-reconhecimento.md` preenchido **antes** de compilar, com as sete linhas.
- Você identificou que **uma classe não está** no alvo — e qual.
- `lab6-confirmacao.md` com as três entradas e o que o ASan detectou em cada.
- Você explicou por que uma classe confirmada por leitura **não** apareceu no teste.
- `lab6-fix.c` compilando com **`-Werror`** — zero avisos.
- Você testou remover uma checagem e confirmou que o ASan pega.
- `lab6-tabela.md` com as sete linhas preenchidas.
- Você respondeu qual classe **nem o ASan** pega de forma confiável.

---

## Avaliação

1. Cite as sete classes em ordem de frequência, e o sanitizer de cada.
2. Qual a diferença entre stack overflow e heap overflow? O mecanismo muda?
3. **Qual o padrão de código que identifica stack overflow?** Cite três funções.
4. Como você reconhece heap overflow por leitura? Qual a pista na relação alocação/escrita?
5. Cite os três erros de contrato que geram UAF.
6. **Por que `destruir(Objeto **)` é mais seguro** que `destruir(Objeto *)`?
7. Por que a classe 4 (integer) tem dois comportamentos diferentes conforme o tipo?
8. Escreva a verificação correta para `a * b` estourar.
9. **Por que `%f` com `int` é UB?** O que o `printf` lê?
10. Por que `%s` com `int` é mais grave que `%f` com `int`?
11. Qual flag pega a classe 5? Por que `-Wall` sozinho não basta?
12. Por que `malloc` entra na classe 6? O que checar?
13. Cite as três formas de off-by-one.
14. **Por que o off-by-one é a classe em que o ASan ajuda menos?** O que complementa?
15. Por que a tabela de reconhecimento vale mais que decorar as sete classes?

---

**Próximo:** [Módulo 7 — Sanitizer, `gdb`, `valgrind`](modulo-07.md)
