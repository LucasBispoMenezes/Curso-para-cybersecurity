# Módulo 3 — Alocação Dinâmica e Duração de Vida

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Distinguir **duração de vida** de **escopo** — e por que confundir causa bug.
2. Explicar as quatro durações: automática, estática, alocada e thread.
3. Entender o que `malloc` faz de verdade, e o que `free` **não** faz.
4. Reconhecer os quatro erros de alocação antes de rodar.
5. Saber quem é **dono** de um bloco alocado — o contrato de posse.

---

## 3.1 Duração de vida ≠ escopo

⚠ **A distinção que este módulo existe para fixar.**

| | Escopo | Duração de vida |
|---|---|---|
| **O que é** | Onde o **nome** é visível no código | Quanto tempo a **memória** existe |
| **Quem decide** | O compilador, pela estrutura do código | A linguagem e você |
| **Exemplo** | `local` só é visível dentro da função | `local` morre quando a função retorna |

⚠ **Poder usar o nome e o dado existir são coisas diferentes.** E voltar um ponteiro para dado que
já morreu é o erro que o próximo módulo formaliza — mas você precisa ver agora.

### As quatro durações

| Duração | Onde vive | Quando morre | Criado por |
|---|---|---|---|
| **Automática** | Stack | Ao sair do bloco | Declaração de variável local |
| **Estática** | `.data` / `.bss` | Ao fim do programa | `static` ou global |
| **Alocada** | Heap | No `free()` | `malloc` / `calloc` / `realloc` |
| **De thread** | TLS | Ao fim da thread | `_Thread_local` |

```bash
cd ~/c-lab/src

cat > duracao.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>

int    global;                    /* estática, sempre existe */
static int estatica = 5;          /* estática, visível só neste arquivo */

void funcao(void) {
    int       automatica = 10;    /* automática: morre ao RETORNAR */
    static int estatica_local = 0; /* estática: sobrevive ao retorno */
    int      *heap = malloc(sizeof(int));

    *heap = 20;
    estatica_local++;

    printf("  dentro: automatica=%d  estatica_local=%d  *heap=%d\n",
           automatica, estatica_local, *heap);

    free(heap);
    /* ⚠ daqui para baixo, `automatica` e `heap` ainda têm NOME,
       mas o dado já morreu / foi liberado */
}

int main(void) {
    printf("global=%d  estatica=%d\n\n", global, estatica);

    printf("chamada 1:\n"); funcao();
    printf("chamada 2:\n"); funcao();
    printf("chamada 3:\n"); funcao();

    printf("\nmain encerrando — global e estatica morrem agora.\n");
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/duracao duracao.c && ../bin/duracao
```

⚠ **Note a `static` local.** Ela **sobrevive** ao retorno — e por isso o contador cresce a cada
chamada. É a única variável local que não morre ao sair do bloco.

⚠ **E note que `estatica` é visível só neste arquivo.** `static` na **global** significa "visível só
neste arquivo", não "existe para sempre" (isso a global já é). Duas coisas diferentes com a mesma
palavra-chave — outra armadilha do C.

**Produza `duracao.md`:**

| Variável | Duração | Onde vive | Quando morre |
|---|---|---|---|
| `global` | | | |
| `estatica` | | | |
| `automatica` | | | |
| `estatica_local` | | | |
| `*heap` | | | |

**Responda:**

1. Por que `estatica_local` **não** reinicia entre chamadas?
2. `automatica` reinicia. Por quê?
3. Qual das quatro durações **você** controla com `free`?
4. O que `static` significa numa variável global? E numa local?

---

## 3.2 O que `malloc` faz — e o que `free` **não** faz

⚠ **A expectativa errada que causa use-after-free.**

```
malloc(32)                          free(p)
    │                                    │
    ▼                                    ▼
┌──────────────┐                  ┌──────────────┐
│ bloco de 32  │                  │ bloco        │
│ bytes, seu   │                  │ DEVOLVIDO    │
└──────────────┘                  └──────────────┘
                                       │
                                       ▼
                              ⚠ MAS o dado continua lá!
                              ⚠ E `p` continua apontando para lá!
```

```bash
cat > malloc_uf.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    char *p = malloc(32);
    if (!p) return 1;
    strcpy(p, "dado sensivel");

    printf("antes do free:  p = %p   conteudo = '%s'\n", (void *)p, p);

    free(p);

    printf("depois do free:\n");
    printf("  p ainda vale:  %p\n", (void *)p);
    printf("  p ainda é usável como ponteiro? Sim, o VALOR está lá.\n");
    printf("  o conteúdo?    '");

    /* ⚠ USE-AFTER-FREE — só para DEMONSTRAR o mecanismo */
    for (int i = 0; i < 14; i++) putchar(p[i]);
    printf("'\n");

    printf("\n⚠ o conteúdo geralmente AINDA ESTÁ LÁ.\n");
    printf("⚠ e o ponteiro p ainda aponta para lá.\n");
    printf("⚠ mas o bloco NÃO É MAIS SEU.\n");

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/malloc_uf malloc_uf.c && ../bin/malloc_uf
```

⚠ **A saída costuma mostrar o texto intacto.** Isso é o que faz UAF ser **silencioso**: o `free` não
zera nada — ele devolve o bloco para o alocador. **O dado fica lá até alguém reusar a memória.**

```bash
# Agora demonstre o REUSO
cat > malloc_reuso.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    char *a = malloc(32);
    if (!a) return 1;
    strcpy(a, "SEGREDO-ORIGINAL");

    printf("1. a = '%s'   (endereço %p)\n", a, (void *)a);
    free(a);

    /* ⚠ alguém aloca do MESMO tamanho — o alocador devolve o MESMO bloco */
    char *b = malloc(32);
    if (!b) return 1;
    strcpy(b, "DADO-DE-OUTRO");

    printf("2. b = '%s'   (endereço %p)\n", b, (void *)b);
    printf("   mesmo endereço? %s\n", (a == b) ? "SIM" : "não");

    printf("3. o que `a` vê agora: '");
    for (int i = 0; i < 14; i++) putchar(a[i]);
    printf("'\n");

    printf("\n⚠ `a` mostra o dado de `b` — o bloco foi REUTILIZADO.\n");
    printf("⚠ é assim que UAF vira leitura de dado alheio\n");
    printf("⚠ e, com dado CONTROLADO, vira controle de execução.\n");

    free(b);
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/malloc_reuso malloc_reuso.c && ../bin/malloc_reuso
```

⚠ **Se os endereços coincidirem, você acabou de ver o mecanismo.** O alocador devolveu o mesmo
bloco, e `a` — que deveria estar morto — passa a apontar para o dado de `b`. **É o UAF do curso de
fuzzing, demonstrado por você em 50 linhas de C.**

⚠ **E `a == b` pode ser `não` em alguns alocadores.** Se for, o ponto continua: o bloco foi
**reutilizado**, só que em outro endereço. O mecanismo não muda.

**Produza `free.md`:**

| Pergunta | Sua resposta |
|---|---|
| `free` zera a memória? | |
| `free` invalida o ponteiro? | |
| O dado continua acessível depois? | |
| Os endereços de `a` e `b` coincidiram? | |
| Quem pode reusar o bloco? | |

**Responda:**

1. Por que o `free` **não** zera a memória? (Dica: quanto custaria?)
2. Se `a == b` foi `SIM`, o que isso prova sobre o alocador?
3. Se você escrevesse em `a` **depois** do `free`, o que estaria corrompendo?
4. **Por que o UAF é silencioso sem sanitizer?** (O módulo 7 mostra o antídoto.)

---

## 3.3 Os quatro erros de alocação

⚠ **Os quatro que você vai cometer. Reconhecer agora evita debugar depois.**

| # | Erro | O que acontece | Aviso do compilador? |
|---|---|---|---|
| 1 | **Não checar `NULL`** | `malloc` pode falhar e você desreferencia | Não |
| 2 | **Não liberar (leak)** | Memória cresce; em laço longo, esgota | Não |
| 3 | **Liberar duas vezes** | Corrompe o alocador | Não |
| 4 | **Usar depois de `free`** | Dado alheio, ou corrupção | Não |

⚠ **Nenhum dos quatro gera aviso.** É a característica que os torna perigosos — e é por isso que
existe sanitizer (§3.4).

### Erro 1 — não checar `NULL`

```bash
cat > erro1.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    /* ⚠ alocação absurda: provavelmente falha */
    size_t tamanho = (size_t)1 << 60;      /* 1 exabyte */
    char *p = malloc(tamanho);

    printf("malloc(%zu) devolveu %p\n", tamanho, (void *)p);

    /* ⚠ sem checar: desreferencia NULL */
    strcpy(p, "isso vai falhar");
    printf("nunca chega aqui\n");

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/erro1 erro1.c
../bin/erro1; echo "código de saída: $?"
```

⚠ **A forma correta, desde o primeiro `malloc`:**

```c
char *p = malloc(n);
if (!p) {
    /* falha: registre e devolva erro — NÃO continue */
    fprintf(stderr, "erro: malloc falhou\n");
    return -1;
}
```

⚠ **`malloc(0)` é caso especial.** Pode devolver `NULL` ou um ponteiro válido — **o padrão permite
os dois**. Se você aloca `n` que pode ser zero, trate antes.

### Erro 2 — vazamento

```bash
cat > erro2.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void vaza(void) {
    char *p = malloc(1024);
    if (!p) return;
    strcpy(p, "isso nunca e liberado");
    /* ⚠ sem free — o bloco fica alocado para sempre */
}

int main(void) {
    for (int i = 0; i < 100000; i++) vaza();
    printf("100000 blocos de 1 KB = ~100 MB vazados\n");
    printf("em execução longa, isso esgota a memória\n");
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/erro2 erro2.c
/usr/bin/time -v ../bin/erro2 2>&1 | grep -E 'Maximum resident|blocos|esgota'
```

⚠ **Em laço de fuzzing (módulo 7 do curso de fuzzing), o vazamento é fatal.** 100 bytes por chamada
× 10.000 iterações × 8 processos = esgota. **É por isso que LSan existe.**

⚠ **Vazamento de uma vez só é tolerável** (`exit` logo depois). **Vazamento em laço é bug.**

### Erro 3 — `double free`

```bash
cat > erro3.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    char *p = malloc(32);
    if (!p) return 1;

    printf("alocado: %p\n", (void *)p);
    free(p);
    printf("liberado\n");

    /* ⚠ DOUBLE FREE */
    printf("liberando de novo...\n");
    free(p);

    printf("nunca chega aqui em muitos alocadores\n");
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/erro3 erro3.c
../bin/erro3; echo "código de saída: $?"

echo
echo "═══ o mesmo com ASan ═══"
clang -g -O1 -fsanitize=address -o ../bin/erro3_asan erro3.c
../bin/erro3_asan 2>&1 | head -12
```

⚠ **Note que sem sanitizer, às vezes não crasha.** O `double free` pode funcionar por sorte — e é
essa sorte que torna o bug perigoso. **Com ASan, ele é detectado sempre.**

### Erro 4 — use-after-free

Já demonstrado no §3.2. **O mais perigoso dos quatro**, porque a memória reutilizada pode conter
dado controlado.

**Produza `quatro-erros.md`:**

| Erro | Como reconhecer no código | Aviso? | Como detectar |
|---|---|---|---|
| Não checar `NULL` | | | |
| Vazamento | | | |
| `double free` | | | |
| Use-after-free | | | |

**Responda:**

1. **Por que nenhum dos quatro gera aviso do compilador?**
2. Qual dos quatro é o mais perigoso, e por quê?
3. Qual é o **mais fácil de detectar** por leitura de código?
4. O `double free` crashou sem sanitizer? **Rode três vezes** e compare.

---

## 3.4 O contrato de posse

⚠ **O conceito que previne os quatro erros.** Toda alocação tem **um dono** — e o dono é quem
libera.

```bash
cat > posse.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ⚠ CONTRATO: quem chama é DONO do que esta função devolve */
char *criar_copia(const char *src) {
    if (!src) return NULL;
    size_t n = strlen(src);
    char *copia = malloc(n + 1);
    if (!copia) return NULL;
    memcpy(copia, src, n + 1);           /* copia o '\0' junto */
    return copia;                         /* transfere a posse */
}

/* ⚠ CONTRATO: empresta o ponteiro, NÃO libera */
void mostrar(const char *s) {
    if (!s) { printf("(vazio)\n"); return; }
    printf("  '%s'\n", s);
}

/* ⚠ CONTRATO: esta função RECEBE a posse e libera */
void consumir(char *s) {
    if (!s) return;
    printf("  consumindo '%s'\n", s);
    free(s);                              /* libera: era dela */
}

int main(void) {
    char *a = criar_copia("primeiro");   /* EU sou dono */
    char *b = criar_copia("segundo");    /* EU sou dono */

    if (!a || !b) { free(a); free(b); return 1; }

    mostrar(a);                          /* empresta — não libero */
    mostrar(b);

    free(a);                             /* libero: era meu */

    consumir(b);                         /* transfiro: NÃO libero depois */

    /* ⚠ se eu fizesse free(b) aqui, seria double-free */
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/posse posse.c && ../bin/posse
```

### As três convenções, e como documentá-las

| Convenção | Significa | Como nomear |
|---|---|---|
| **Devolve posse** | Quem chama libera | `criar_*`, `alocar_*`, `dup_*` |
| **Empresta** | Quem chama **não** libera | `mostrar_*`, `usar_*`, parâmetro `const` |
| **Consome posse** | A função libera | `consumir_*`, `destruir_*`, `liberar_*` |

⚠ **O prefixo do nome é o contrato.** Em C não há tipo que expresse posse — então **convenção de
nome e comentário no cabeçalho são a única documentação**. É o que separa código que funciona de
código que vaza e corrompe.

⚠ **E `const` no parâmetro é a marca de empréstimo.** `const char *s` diz "não vou modificar nem
liberar". Não é garantia (o C permite burlar), mas é a intenção declarada.

**Produza `posse.md`:**

| Função | Convenção | Quem libera |
|---|---|---|
| `criar_copia` | | |
| `mostrar` | | |
| `consumir` | | |

**Responda:**

1. Em `mostrar(a)`, se a função liberasse `a`, o que aconteceria depois?
2. Por que `consumir` **não** pode ser chamada com parâmetro `const`?
3. **Escreva o contrato** de uma função sua que aloca e devolve — em uma frase.
4. O que o `const` no parâmetro comunica?

---

## 3.5 `calloc`, `realloc` e o padrão que respeita o contrato

```bash
cat > realloc_demo.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    printf("═══ calloc: aloca E ZERA ═══\n");
    int *zeros = calloc(4, sizeof(int));
    if (!zeros) return 1;
    printf("  calloc: ");
    for (int i = 0; i < 4; i++) printf("%d ", zeros[i]);
    printf("  ← todos zero\n\n");

    printf("═══ malloc: NÃO zera ═══\n");
    int *nao_zerado = malloc(4 * sizeof(int));
    if (!nao_zerado) { free(zeros); return 1; }
    printf("  malloc: ");
    for (int i = 0; i < 4; i++) printf("%d ", nao_zerado[i]);
    printf("  ← LIXO (pode variar)\n\n");

    printf("═══ realloc: cresce ═══\n");
    printf("  antes:  %p  (4 ints)\n", (void *)nao_zerado);
    for (int i = 0; i < 4; i++) nao_zerado[i] = i * 10;

    /* ⚠ PADRÃO CORRETO: usar variável temporária */
    int *maior = realloc(nao_zerado, 8 * sizeof(int));
    if (!maior) {
        /* ⚠ realloc falhou: `nao_zerado` continua válido e vazando */
        free(nao_zerado);
        free(zeros);
        return 1;
    }
    nao_zerado = maior;

    printf("  depois: %p  (8 ints)\n", (void *)nao_zerado);
    printf("  os 4 primeiros valores sobreviveram: ");
    for (int i = 0; i < 4; i++) printf("%d ", nao_zerado[i]);
    printf("\n  os 4 novos: LIXO (realloc não zera a parte nova)\n");

    free(nao_zerado);
    free(zeros);
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/realloc_demo realloc_demo.c && ../bin/realloc_demo
```

⚠ **A armadilha do `realloc` é a clássica:**

```c
/* ⚠ ERRADO — se realloc falhar, você PERDE o ponteiro original e vaza */
p = realloc(p, tamanho_maior);

/* ✓ CORRETO — temporário primeiro */
void *tmp = realloc(p, tamanho_maior);
if (!tmp) { /* p ainda é válido: trate o erro */ return -1; }
p = tmp;
```

⚠ **`realloc` pode mover o bloco.** Por isso ele devolve o novo endereço — e por isso usar `p`
diretamente na atribuição é erro que vaza e perde o dado.

⚠ **E `realloc(ptr, 0)`** é caso especial: o padrão permite liberar ou devolver um bloco mínimo.
**Trate antes, não dependa do comportamento.**

**Produza `realloc.md`:**

| Função | Zera? | Pode mover? | Devolve o quê em falha? |
|---|---|---|---|
| `malloc` | | | |
| `calloc` | | | |
| `realloc` | | | |

**Responda:**

1. Quando usar `calloc` em vez de `malloc`?
2. Por que `realloc` pode mover o bloco?
3. **Por que `p = realloc(p, n)` é erro?** O que você perde?
4. `realloc` zera a parte nova? Como você confirmou?

---

## 3.6 LAB — Provocar e diagnosticar os quatro erros

**Duração:** 120 min

### Passo 1 — Cada erro, com e sem sanitizer (50 min)

```bash
cd ~/c-lab/src
mkdir -p ../bin

# Os quatro arquivos
cat > e1_null.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main(void) {
    char *p = malloc((size_t)1 << 60);
    printf("malloc devolveu: %p\n", (void *)p);
    strcpy(p, "x");              /* ⚠ sem checar NULL */
    return 0;
}
EOF

cat > e2_leak.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
int main(void) {
    for (int i = 0; i < 20000; i++) {
        char *p = malloc(1024);
        if (p) p[0] = 'x';       /* ⚠ nunca libera */
    }
    printf("fim\n");
    return 0;
}
EOF

cat > e3_dfree.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
int main(void) {
    char *p = malloc(32);
    if (!p) return 1;
    free(p);
    free(p);                     /* ⚠ double free */
    printf("fim\n");
    return 0;
}
EOF

cat > e4_uaf.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main(void) {
    char *p = malloc(32);
    if (!p) return 1;
    strcpy(p, "dado original");
    free(p);
    printf("depois do free: '%s'\n", p);   /* ⚠ use-after-free */
    return 0;
}
EOF

echo "╔══════════════════════════════════════════════════╗"
echo "║  SEM SANITIZER                                    ║"
echo "╚══════════════════════════════════════════════════╝"
for f in e1_null e2_leak e3_dfree e4_uaf; do
    gcc -Wall -Wextra -g -O0 -o "../bin/${f}_plain" "${f}.c" 2>/dev/null
    printf '%-12s → ' "$f"
    ( ulimit -v 2000000; timeout 10 "../bin/${f}_plain" >/dev/null 2>&1 ); c=$?
    case $c in
        0)     echo "terminou normal (⚠ o bug NÃO apareceu)" ;;
        1)     echo "código 1 (pode ser o erro detectado)" ;;
        124)   echo "TIMEOUT (lento demais)" ;;
        134)   echo "SIGABRT — abortado pelo alocador" ;;
        139)   echo "SIGSEGV — crashou" ;;
        *)     echo "código ${c}" ;;
    esac
done

echo
echo "╔══════════════════════════════════════════════════╗"
echo "║  COM ASan + UBSan                                 ║"
echo "╚══════════════════════════════════════════════════╝"
for f in e1_null e2_leak e3_dfree e4_uaf; do
    clang -g -O1 -fsanitize=address,undefined \
          -o "../bin/${f}_asan" "${f}.c" 2>/dev/null
    printf '%-12s → ' "$f"
    out=$(timeout 15 "../bin/${f}_asan" 2>&1); c=$?
    tipo=$(printf '%s' "$out" | grep -oE 'ERROR: AddressSanitizer: [a-z-]+' | head -1)
    if [ -n "$tipo" ]; then
        echo "${tipo#ERROR: AddressSanitizer: }"
    elif printf '%s' "$out" | grep -q 'LeakSanitizer'; then
        echo "LeakSanitizer: vazamento detectado"
    else
        echo "código ${c} (sem diagnóstico)"
    fi
done
```

Produza `quatro-erros-lab.md`:

| Erro | Sem sanitizer | Com ASan/UBSan | O que o sanitizer diz |
|---|---|---|---|
| NULL | | | |
| Vazamento | | | |
| `double free` | | | |
| UAF | | | |

**Responda:**

1. **Quantos dos quatro o compilador avisou?** (Rode com `-Wall -Wextra` e conte.)
2. Quantos **crasharam** sem sanitizer?
3. Quantos o sanitizer detectou?
4. **Qual erro passou em silêncio nos dois casos?** Por quê?

⚠ **A resposta 4 varia por ambiente** e é justamente o ponto: **vazamento pode não aparecer sem
LSan**, e o `double free` pode não crashar. É a razão pela qual o módulo 7 existe.

### Passo 2 — O contrato de posse (40 min)

⚠ **Escreva um módulo com contrato explícito.**

```bash
cd ~/c-lab/src

cat > lab3-posse.c <<'EOF'
/*
 * Módulo com CONTRATO DE POSSE explícito.
 *
 * Convenções:
 *   criar_*     → DEVOLVE posse: quem chama libera
 *   mostrar_*   → EMPRESTA: quem chama NÃO libera
 *   destruir_*  → CONSOME posse: a função libera
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char  *texto;      /* OWNED: este struct é dono */
    size_t tamanho;
} Item;

/* DEVOLVE posse de um Item, ou NULL em falha */
Item *item_criar(const char *texto) {
    if (!texto) return NULL;

    Item *it = calloc(1, sizeof(Item));      /* calloc: zera */
    if (!it) return NULL;

    size_t n = strlen(texto);
    it->texto = malloc(n + 1);
    if (!it->texto) {
        free(it);                             /* ⚠ limpa o parcial! */
        return NULL;
    }

    memcpy(it->texto, texto, n + 1);
    it->tamanho = n;
    return it;
}

/* EMPRESTA: não modifica, não libera */
void item_mostrar(const Item *it) {
    if (!it || !it->texto) { printf("  (vazio)\n"); return; }
    printf("  '%s' (%zu chars)\n", it->texto, it->tamanho);
}

/* CONSOME: libera tudo */
void item_destruir(Item *it) {
    if (!it) return;
    free(it->texto);                          /* libera o interno primeiro */
    free(it);                                 /* depois o struct */
}

int main(void) {
    Item *a = item_criar("primeiro item");
    Item *b = item_criar("segundo");
    Item *c = item_criar(NULL);               /* deve devolver NULL */

    printf("a: "); item_mostrar(a);
    printf("b: "); item_mostrar(b);
    printf("c: "); item_mostrar(c);

    printf("\nc é NULL? %s\n", c == NULL ? "sim ✓" : "não");

    item_destruir(a);                         /* consome */
    item_destruir(b);
    item_destruir(c);                         /* destruir trata NULL */

    printf("\nliberado — sem vazamento\n");
    return 0;
}
EOF

echo "═══ compilando com avisos ═══"
gcc -Wall -Wextra -Wstrict-prototypes -g -O0 -o ../bin/lab3-posse lab3-posse.c

echo "═══ executando ═══"
../bin/lab3-posse

echo
echo "═══ verificando vazamento com ASan ═══"
clang -g -O1 -fsanitize=address -o ../bin/lab3-posse_asan lab3-posse.c
../bin/lab3-posse_asan 2>&1 | tail -5
```

⚠ **Note o `free(it)` no caminho de erro do `item_criar`.** Se o segundo `malloc` falha, você libera
o que já alocou. **Esta é a parte que quase todo mundo esquece** — e é o vazamento que só aparece em
situação de memória escassa, ou seja, **nunca no seu teste**.

⚠ **E note o `destruir` trata `NULL`.** Toda função de consumo deve tolerar `NULL` — é o que
permite `item_destruir(c)` sem `if`.

Produza `lab3-contrato.md`:

| Função | Convenção | Aloca? | Libera? | Tolera `NULL`? |
|---|---|---|---|---|
| `item_criar` | | | | |
| `item_mostrar` | | | | |
| `item_destruir` | | | | |

**Responda:**

1. **Por que `item_criar` libera `it` no caminho de erro?** O que aconteceria sem isso?
2. Por que `item_destruir` libera `texto` **antes** de `it`?
3. O ASan acusou vazamento? **Teste removendo o `free(it)`** e veja.
4. O que o `const Item *` em `item_mostrar` comunica?

⚠ **A resposta 2 é uma ordem que importa.** Se você liberar `it` primeiro, perde o ponteiro para
`it->texto` — e vaza o texto. **Libere na ordem inversa da alocação.**

### Passo 3 — Prove os dois caminhos (30 min)

⚠ **Todo teste de memória precisa dos dois caminhos.**

```bash
cd ~/c-lab/src

cat > lab3-testes.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* a MESMA função com caminho de erro completo */
int copiar(const char *src, char **dest) {
    if (!src || !dest) return -1;
    *dest = NULL;

    size_t n = strlen(src);
    if (n > 4096) return -2;                 /* limite explícito */

    char *novo = malloc(n + 1);
    if (!novo) return -3;

    memcpy(novo, src, n + 1);

    if (n == 0) { free(novo); return -4; }   /* caso de borda */
    *dest = novo;
    return 0;
}

int main(void) {
    char *d = NULL;

    printf("═══ 1. caso normal ═══\n");
    printf("  r=%d  d='%s'\n", copiar("texto ok", &d), d ? d : "(null)");
    free(d);

    printf("\n═══ 2. entrada vazia ═══\n");
    d = NULL;
    printf("  r=%d  d=%s\n", copiar("", &d), d ? d : "(null)");

    printf("\n═══ 3. ponteiro de saída NULL ═══\n");
    printf("  r=%d\n", copiar("x", NULL));

    printf("\n═══ 4. entrada NULL ═══\n");
    d = NULL;
    printf("  r=%d  d=%s\n", copiar(NULL, &d), d ? d : "(null)");

    printf("\n═══ 5. acima do limite ═══\n");
    char grande[5000];
    memset(grande, 'A', 4999); grande[4999] = '\0';
    d = NULL;
    printf("  r=%d  d=%s   (deve ser -2, sem alocar)\n",
           copiar(grande, &d), d ? d : "(null)");

    printf("\nnenhum vazamento: todo caminho limpa o que alocou\n");
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/lab3-testes lab3-testes.c
../bin/lab3-testes

echo
echo "═══ confirmando com ASan ═══"
clang -g -O1 -fsanitize=address,undefined \
      -o ../bin/lab3-testes_asan lab3-testes.c
../bin/lab3-testes_asan 2>&1 | tail -4
```

⚠ **O teste 5 é o que prova o limite.** `copiar` recusa antes de alocar — e por isso **não vaza**.
Se ele alocasse primeiro e recusasse depois, vazaria.

Produza `lab3-caminhos.md`:

| Caso | `r` | `d` | Alocou? | Liberou? |
|---|---|---|---|---|
| Normal | | | | |
| Vazio | | | | |
| `dest` NULL | | | | |
| `src` NULL | | | | |
| Acima do limite | | | | |

**Responda:**

1. Quantos caminhos de erro a função tem? Ela limpa em todos?
2. **Qual caminho você não teria testado** se eu não tivesse listado?
3. Por que o teste 5 não vaza? (Dica: onde está o `malloc` em relação à verificação.)
4. O ASan acusou vazamento? Se sim, onde?

### Critérios de aceitação

- `quatro-erros-lab.md` com os quatro erros **medidos**, com e sem sanitizer.
- Você contou **quantos o compilador avisou** — a resposta é zero, ou perto.
- `free.md` com a resposta de que `free` **não** zera e **não** invalida o ponteiro.
- `lab3-posse.c` compilando **sem aviso** e sem vazamento no ASan.
- Você explicou por que `free(it)` é obrigatório no caminho de erro do `item_criar`.
- `lab3-caminhos.md` com os **cinco** casos testados.
- Você identificou qual caminho de erro **você não teria testado**.
- O ASan confirmou ausência de vazamento em `lab3-posse` e `lab3-testes`.

---

## Avaliação

1. Diferencie escopo de duração de vida, com um exemplo de cada.
2. Cite as quatro durações de vida e onde cada uma vive.
3. Por que `static` local sobrevive ao retorno? O que `static` significa numa global?
4. **O que `free` faz, e o que ele NÃO faz?** Cite as duas coisas que ele não faz.
5. Por que o use-after-free é **silencioso** sem sanitizer?
6. Explique, em quatro passos, como o bloco liberado pode ser reutilizado.
7. Cite os quatro erros de alocação. Por que nenhum gera aviso?
8. Qual dos quatro é o mais perigoso, e por quê?
9. Por que `malloc(0)` é caso especial?
10. O que é contrato de posse? Cite as três convenções e como documentá-las.
11. Por que o prefixo do nome da função é a única documentação de posse em C?
12. O que `const` no parâmetro comunica, e por que não é garantia?
13. **Por que `p = realloc(p, n)` é erro?** O que se perde?
14. `calloc` zera; `realloc` zera a parte nova? Como você confirmou?
15. Em que ordem você libera um struct com ponteiro interno? Por quê?
16. Por que o caminho de erro precisa de `free` — e por que ninguém testa isso?

---

**Próximo:** [Módulo 4 — String, buffer e o limite ausente](modulo-04.md)
