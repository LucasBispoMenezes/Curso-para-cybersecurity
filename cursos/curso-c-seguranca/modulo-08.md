# Módulo 8 — Struct, union, enum e Layout Real

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Calcular o `sizeof` de uma struct **à mão**, com padding.
2. Prever o offset de cada campo, e confirmar com `offsetof`.
3. Entender por que a ordem dos campos muda o tamanho.
4. Saber o que `union` faz, e por que ela é um instrumento de corrupção.
5. Ler o layout de uma struct num dump de memória.

---

## 8.1 Padding — o espaço que você não declarou

⚠ **A struct na memória não é a soma dos campos.** O compilador insere **padding** para alinhar
cada campo ao tamanho dele.

```bash
cd ~/c-lab/src

cat > layout1.c <<'EOF'
#include <stdio.h>
#include <stddef.h>

typedef struct {
    char   a;      /* 1 byte  */
    int    b;      /* 4 bytes */
    char   c;      /* 1 byte  */
    long   d;      /* 8 bytes */
} Struct;

int main(void) {
    printf("═══ soma ingênua vs. real ═══\n");
    printf("  soma dos campos = %zu\n", sizeof(char) + sizeof(int) + sizeof(char) + sizeof(long));
    printf("  sizeof(Struct)  = %zu   ← tem PADDING\n\n", sizeof(Struct));

    printf("═══ offsets ═══\n");
    printf("  offsetof(a) = %zu\n", offsetof(Struct, a));
    printf("  offsetof(b) = %zu\n", offsetof(Struct, b));
    printf("  offsetof(c) = %zu\n", offsetof(Struct, c));
    printf("  offsetof(d) = %zu\n", offsetof(Struct, d));

    printf("\n═══ o mapa ═══\n");
    printf("  offset: 0    1    2    3    4    5    6    7    8 ...\n");
    printf("  campo : a    [pad][pad][pad] b    b    b    b    c    ...\n");
    printf("  ⚠ 3 bytes de padding depois de `a`\n");

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/layout1 layout1.c && ../bin/layout1
```

### A regra do alinhamento

⚠ **Cada campo começa em offset múltiplo do próprio tamanho.**

| Tipo | Alinhamento | Offset tem que ser múltiplo de |
|---|---|---|
| `char` | 1 | 1 (qualquer) |
| `short` | 2 | 2 |
| `int` | 4 | 4 |
| `long` / ponteiro | 8 | 8 |
| `double` | 8 | 8 |

**E o tamanho total da struct é múltiplo do maior alinhamento** — para que um array de structs
tenha cada elemento alinhado.

```
struct { char a; int b; char c; long d; }

offset 0  ┌──────┐
          │  a   │  1 byte
offset 1  ├──────┤
          │ pad  │  3 bytes (para `b` ir em múltiplo de 4)
offset 4  ├──────┤
          │  b   │  4 bytes
offset 8  ├──────┤
          │  c   │  1 byte
offset 9  ├──────┤
          │ pad  │  7 bytes (para `d` ir em múltiplo de 8)
offset 16 ├──────┤
          │  d   │  8 bytes
offset 24 └──────┘
          sizeof = 24, e não 14
```

⚠ **O último padding existe para o tamanho total ser múltiplo de 8** — o maior alinhamento. Sem
ele, um `Struct s[2]` teria o segundo elemento desalinhado.

---

## 8.2 A ordem dos campos muda o tamanho

⚠ **Reordenar os campos não muda o comportamento — e às vezes reduz o tamanho pela metade.**

```bash
cat > layout2.c <<'EOF'
#include <stdio.h>
#include <stddef.h>

/* ⚠ ordem ruim: campos grandes intercalados com pequenos */
typedef struct {
    char   a;      /* 1 */
    long   b;      /* 8 */
    char   c;      /* 1 */
    long   d;      /* 8 */
    char   e;      /* 1 */
} Ruim;

/* ✓ ordem boa: do maior para o menor */
typedef struct {
    long   b;      /* 8 */
    long   d;      /* 8 */
    char   a;      /* 1 */
    char   c;      /* 1 */
    char   e;      /* 1 */
} Bom;

int main(void) {
    printf("%-8s %-8s\n", "struct", "sizeof");
    printf("%-8s %-8zu\n", "Ruim", sizeof(Ruim));
    printf("%-8s %-8zu\n", "Bom", sizeof(Bom));
    printf("\neconomia: %zu bytes (%.0f%%)\n",
           sizeof(Ruim) - sizeof(Bom),
           100.0 * (sizeof(Ruim) - sizeof(Bom)) / sizeof(Ruim));

    printf("\n═══ offsets de Ruim ═══\n");
    printf("  a=%zu  b=%zu  c=%zu  d=%zu  e=%zu\n",
           offsetof(Ruim,a), offsetof(Ruim,b), offsetof(Ruim,c),
           offsetof(Ruim,d), offsetof(Ruim,e));

    printf("═══ offsets de Bom ═══\n");
    printf("  a=%zu  b=%zu  c=%zu  d=%zu  e=%zu\n",
           offsetof(Bom,a), offsetof(Bom,b), offsetof(Bom,c),
           offsetof(Bom,d), offsetof(Bom,e));

    printf("\n⚠ mesma informação, %.0f%% menos memória\n",
           100.0 * (sizeof(Ruim) - sizeof(Bom)) / sizeof(Ruim));
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/layout2 layout2.c && ../bin/layout2
```

⚠ **Isso importa onde?** Em estrutura grande com muitos elementos — cache, buffer, lista com
milhões de nós. **Economizar 50% de memória em 1 milhão de nós é economia de 50%.**

⚠ **Mas cuidado com a ordem:** reordenar **quebra a compatibilidade binária** com arquivo salvo na
ordem antiga, e quebra sempre que o formato é serializado. **Reordene só quando o layout for
interno.**

---

## 8.3 `union` — memória compartilhada

⚠ **A `union` faz campos **sobreporem** o mesmo espaço.** Todos começam no offset 0.

```bash
cat > union1.c <<'EOF'
#include <stdio.h>
#include <stdint.h>
#include <string.h>

/* ⚠ todos os campos vivem no MESMO espaço */
typedef union {
    uint32_t inteiro;
    uint8_t  bytes[4];
    float    flutuante;
} Valor;

int main(void) {
    Valor v;

    printf("═══ sizeof(union) = o MAIOR campo ═══\n");
    printf("  sizeof(Valor) = %zu   (o maior é %zu)\n\n",
           sizeof(Valor), sizeof(uint32_t));

    printf("═══ escrevendo como inteiro, lendo como bytes ═══\n");
    v.inteiro = 0x41424344;

    printf("  inteiro        = 0x%08X\n", v.inteiro);
    printf("  bytes[0..3]    = ");
    for (int i = 0; i < 4; i++) printf("%02X ", v.bytes[i]);
    printf("\n");
    printf("  ⚠ os bytes estão em ordem LITTLE-ENDIAN: 44 43 42 41\n");
    printf("  ⚠ 'ABCD' seria 0x44434241 — a ordem inverte\n\n");

    printf("═══ o mesmo espaço, dois tipos ═══\n");
    v.flutuante = 3.14f;
    printf("  como float = %f\n", v.flutuante);
    printf("  como uint  = 0x%08X\n", v.inteiro);
    printf("  ⚠ escreveu float, lê int: os BITS são os mesmos\n");

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/union1 union1.c && ../bin/union1
```

### Por que `union` é um instrumento de corrupção

⚠ **A mesma memória interpretada como tipos diferentes é exatamente o mecanismo de type
confusion** — o bug crítico do módulo 6 do curso de fuzzing.

```bash
cat > union2.c <<'EOF'
#include <stdio.h>
#include <stdint.h>
#include <string.h>

/* ⚠ a estrutura que "guarda dois tipos" — o padrão de tagged union mal feito */
typedef struct {
    uint8_t  tipo;         /* 0 = número, 1 = texto */
    union {
        int64_t numero;
        char    texto[8];
    } dado;
} Valor;

int main(void) {
    Valor v;

    /* caso 1: guarda número, lê número */
    v.tipo = 0;
    v.dado.numero = 42;
    printf("número: %ld\n", v.dado.numero);

    /* ⚠ caso 2: guarda TEXTO mas o campo `tipo` continua 0 */
    v.tipo = 0;                              /* ⚠ BUG: deveria ser 1 */
    strncpy(v.dado.texto, "abcdefg", 7);

    printf("⚠ o tipo diz 0 (número), mas guardei texto:\n");
    printf("  como número = %ld\n", v.dado.numero);
    printf("  como texto  = %s\n",  v.dado.texto);
    printf("\n⚠ é a MESMA memória: os bytes de 'abcdefg' lidos como int64\n");
    printf("⚠ é como type confusion funciona\n");

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/union2 union2.c && ../bin/union2
```

⚠ **A `union` é aceita e útil** — é como C implementa variante de tipo sem herança. **O bug está
no `tipo` que não bate com o membro usado** — e o C não verifica.

⚠ **Leve isso para o curso de fuzzing:** na classe *type confusion*, é exatamente isso que acontece,
só que numa classe C++ com vtable — e aí o campo lido não é `int64`, é **ponteiro de função**.

### `memcpy` versus `union` para reinterpretar bits

```bash
cat > union3.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include <stdint.h>

/* ✓ a forma DEFINIDA de reinterpretar bits */
float via_memcpy(uint32_t bits) {
    float f;
    memcpy(&f, &bits, sizeof(f));          /* definido: copia bytes */
    return f;
}

int main(void) {
    uint32_t bits = 0x40490FDB;            /* ~3.14159 em IEEE-754 */

    float m = via_memcpy(bits);
    printf("via memcpy: %.6f\n", m);

    printf("\n⚠ a union funciona na prática em GCC/Clang,\n");
    printf("   mas ler um membro diferente do que foi escrito É UB no padrão\n");
    printf("   (punning via union é extensão, não garantia)\n");
    printf("\n✓ memcpy é DEFINIDO e o compilador otimiza para leitura direta\n");
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/union3 union3.c && ../bin/union3
```

⚠ **É o aliasing estrito do módulo 5, aplicado.** `memcpy` **não custa nada** — o compilador
transforma em leitura direta — e é **definido**.

---

## 8.4 `enum` e o truque que dá bug

```bash
cat > enum1.c <<'EOF'
#include <stdio.h>
#include <stdint.h>

typedef enum {
    TIPO_NUMERO = 0,
    TIPO_TEXTO  = 1,
    TIPO_LISTA  = 2
} Tipo;

typedef struct {
    Tipo     tipo;
    char     dado[32];
} Item;

/* ⚠ o switch sem `default` é o padrão que gera bug */
const char *nome_tipo(Tipo t) {
    switch (t) {
        case TIPO_NUMERO: return "numero";
        case TIPO_TEXTO:  return "texto";
        case TIPO_LISTA:  return "lista";
        /* ⚠ FALTA o default! */
    }
    return "desconhecido";          /* ← esta linha é alcançável */
}

int main(void) {
    printf("═══ valores válidos ═══\n");
    for (int i = 0; i <= 2; i++)
        printf("  %d → %s\n", i, nome_tipo((Tipo)i));

    printf("\n═══ valor FORA do enum (cast forçado) ═══\n");
    Tipo invalido = (Tipo)99;
    printf("  (Tipo)99 → %s\n", nome_tipo(invalido));
    printf("  ⚠ o C não impede cast para valor fora do enum\n");
    printf("  ⚠ sem `default`, o caso cai no código depois do switch\n");

    printf("\n═══ e o tamanho? ═══\n");
    printf("  sizeof(Tipo)  = %zu   ← é um int\n", sizeof(Tipo));
    printf("  ⚠ enum é inteiro: cabe qualquer valor que couber em int\n");

    return 0;
}
EOF

gcc -Wall -Wextra -Wswitch-enum -g -O0 -o ../bin/enum1 enum1.c 2>&1 | head -4
../bin/enum1
```

⚠ **O `switch` sem `default` é bug de segurança real.** Se o valor vem de entrada externa e é
convertido para `enum`, um valor inválido cai no código **depois** do switch — que pode não tratar
o caso. **Sempre tenha `default`, mesmo que ele só registre o inesperado.**

⚠ **E `-Wswitch-enum` avisa quando um `case` falta** — inclusive se houver `default`. É mais
rigorosa que `-Wswitch`, que só avisa quando não há `default`.

⚠ **A regra prática:** `enum` em C é **inteiro sem verificação de faixa**. Se o valor vem de arquivo,
rede ou `argv`, ele pode ser qualquer coisa — e você valida antes de usar.

---

## 8.5 LAB — Layout à mão e conferido

**Duração:** 75 min

### Passo 1 — Calcule e confirme (30 min)

```bash
cd ~/c-lab/src

cat > lab8.c <<'EOF'
#include <stdio.h>
#include <stddef.h>
#include <stdint.h>

#define MOSTRAR(tipo, campo) \
    printf("  %-10s %-4zu  (alinhamento implícito)\n", #campo, offsetof(tipo, campo))

/* ⚠ ORDEM A — a "ingênua" */
typedef struct {
    char    a;
    int     b;
    char    c;
    long    d;
    char    e;
    short   f;
} TipoA;

/* ⚠ ORDEM B — só reordenada */
typedef struct {
    long    d;
    int     b;
    short   f;
    char    a;
    char    c;
    char    e;
} TipoB;

/* ⚠ ORDEM C — com ponteiro e double */
typedef struct {
    char    a;
    double  g;
    void   *p;
    int     b;
} TipoC;

int main(void) {
    printf("═══ ORDEM A ═══\n");
    printf("  sizeof = %zu\n", sizeof(TipoA));
    MOSTRAR(TipoA, a); MOSTRAR(TipoA, b); MOSTRAR(TipoA, c);
    MOSTRAR(TipoA, d); MOSTRAR(TipoA, e); MOSTRAR(TipoA, f);

    printf("\n═══ ORDEM B ═══\n");
    printf("  sizeof = %zu\n", sizeof(TipoB));
    MOSTRAR(TipoB, d); MOSTRAR(TipoB, b); MOSTRAR(TipoB, f);
    MOSTRAR(TipoB, a); MOSTRAR(TipoB, c); MOSTRAR(TipoB, e);

    printf("\n═══ ORDEM C ═══\n");
    printf("  sizeof = %zu\n", sizeof(TipoC));
    MOSTRAR(TipoC, a); MOSTRAR(TipoC, g); MOSTRAR(TipoC, p); MOSTRAR(TipoC, b);

    printf("\n═══ economia de A para B: %zu bytes (%.0f%%) ═══\n",
           sizeof(TipoA) - sizeof(TipoB),
           100.0 * (sizeof(TipoA) - sizeof(TipoB)) / sizeof(TipoA));

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/lab8 lab8.c && ../bin/lab8
```

⚠ **Antes de rodar, calcule os três à mão** e escreva em `lab8-previsao.md`:

| Struct | Meu cálculo de `sizeof` | Real | Acertei? |
|---|---|---|---|
| TipoA | | | |
| TipoB | | | |
| TipoC | | | |

**Depois, para cada struct, desenhe o mapa de bytes:**

```
TipoA — offset 0 até sizeof
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ ...
├────┼────┼────┼────┼────┼────┼────┼────┤
│ a  │pad │pad │pad │ b  │ b  │ b  │ b  │ ...
└────┴────┴────┴────┴────┴────┴────┴────┘
```

**Responda:**

1. **Quantos você acertou?** Onde errou, e por quê?
2. Qual struct tem **mais padding**? Por quê?
3. **`TipoC` tem `double` e ponteiro.** Qual o tamanho total, e por quê?
4. Se você ordenasse `TipoC` do maior para o menor, quanto economizaria?

### Passo 2 — `union` e corrupção (25 min)

```bash
cd ~/c-lab/src

cat > lab8-union.c <<'EOF'
#include <stdio.h>
#include <stdint.h>
#include <string.h>

typedef struct {
    uint8_t tipo;         /* 0 = int, 1 = ponteiro */
    union {
        int64_t  valor;
        void    *ponteiro;
    } dado;
} Variante;

/* ⚠ processa assumindo um tipo, sem verificar o campo `tipo` */
void processar_errado(Variante *v) {
    /* assume que é ponteiro, sem olhar v->tipo */
    printf("  processando como ponteiro: %p\n", v->dado.ponteiro);
}

/* ✓ verifica antes */
void processar_certo(Variante *v) {
    if (v->tipo == 0)      printf("  valor    = %ld\n", v->dado.valor);
    else if (v->tipo == 1) printf("  ponteiro = %p\n",  v->dado.ponteiro);
    else                   printf("  ⚠ tipo inválido: %u\n", v->tipo);
}

int main(void) {
    Variante v;

    printf("═══ caso correto: tipo 0, guarda inteiro ═══\n");
    v.tipo = 0;
    v.dado.valor = 12345;
    processar_certo(&v);

    printf("\n═══ tipo 0, mas guardei ponteiro (BUG) ═══\n");
    v.tipo = 0;                                   /* ⚠ deveria ser 1 */
    v.dado.ponteiro = (void *)0xDEADBEEF;
    processar_certo(&v);
    printf("  ⚠ leu como inteiro: %ld\n", v.dado.valor);
    printf("  ⚠ o valor 0xDEADBEEF virou um inteiro qualquer\n");

    printf("\n═══ tipo inválido vindo de fora ═══\n");
    v.tipo = 200;                                  /* cast forçado ou dado corrompido */
    processar_certo(&v);

    printf("\n═══ e a versão sem verificação? ═══\n");
    v.dado.ponteiro = (void *)0x41414141;
    processar_errado(&v);
    printf("  ⚠ interpretou 0x41414141 como ponteiro válido\n");

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/lab8-union lab8-union.c && ../bin/lab8-union
```

Produza `lab8-union.md`:

| Caso | `tipo` | Guardou | Leu como | Correto? |
|---|---|---|---|---|
| 1 | 0 | int | | |
| 2 | 0 | ponteiro | | |
| 3 | 200 | — | | |
| 4 | — | ponteiro sem checar | | |

**Responda:**

1. **Por que o `tipo` não impede o bug?** O C verifica?
2. O que acontece com `tipo = 200`? Deveria ser possível?
3. **Qual processamento está errado** — o que não valida `tipo`?
4. **Onde isso aparece** no curso de fuzzing? (Dica: qual classe de bug.)

### Passo 3 — Leia o layout num dump (20 min)

```bash
cd ~/c-lab/src

cat > lab8-dump.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include <stdint.h>

typedef struct {
    uint32_t magia;        /* offset 0 */
    uint16_t versao;       /* offset 4 */
    uint16_t n_itens;      /* offset 6 */
    uint32_t tamanho;      /* offset 8 */
    char     nome[8];      /* offset 12 */
} Cabecalho;               /* sizeof = ? */

int main(void) {
    Cabecalho c;
    memset(&c, 0, sizeof(c));

    c.magia    = 0x4D59464D;      /* 'MFYM' em little-endian */
    c.versao   = 0x0001;
    c.n_itens  = 0x0005;
    c.tamanho  = 0x00000100;
    memcpy(c.nome, "teste", 5);

    printf("sizeof(Cabecalho) = %zu\n\n", sizeof(Cabecalho));

    printf("═══ dump em hexadecimal ═══\n");
    unsigned char *p = (unsigned char *)&c;
    for (size_t i = 0; i < sizeof(c); i++) {
        if (i % 8 == 0) printf("  offset %2zu: ", i);
        printf("%02x ", p[i]);
        if (i % 8 == 7) printf("\n");
    }
    if (sizeof(c) % 8) printf("\n");

    printf("\n═══ lendo cada campo do dump ═══\n");
    printf("  magia    (0-3)  = 0x%08X\n", c.magia);
    printf("  versao   (4-5)  = 0x%04X\n", c.versao);
    printf("  n_itens  (6-7)  = 0x%04X\n", c.n_itens);
    printf("  tamanho  (8-11) = 0x%08X\n", c.tamanho);
    printf("  nome    (12-19) = '%s'\n", c.nome);

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/lab8-dump lab8-dump.c && ../bin/lab8-dump
```

Produza `lab8-dump.md`:

| Campo | Offset | Tamanho | Valor no dump |
|---|---|---|---|
| `magia` | | | |
| `versao` | | | |
| `n_itens` | | | |
| `tamanho` | | | |
| `nome` | | | |
| **`sizeof`** | — | | |

**Responda:**

1. **O dump bate com os offsets calculados?** Confira byte a byte.
2. `magia = 0x4D59464D` — quais bytes aparecem no dump, e em que ordem? Por quê?
3. Há padding no final? **Como você sabe?**
4. **Se este cabeçalho viesse de arquivo**, quais campos você validaria antes de usar?

⚠ **A resposta 4 é a ponte para o módulo 9.** Todo campo de cabeçalho lido de arquivo precisa de
validação — e é exatamente isso que o módulo 9 e o projeto final formalizam.

### Critérios de aceitação

- `lab8-previsao.md` com os três `sizeof` calculados **à mão** antes de rodar.
- Para cada struct, o **mapa de bytes** desenhado com os offsets.
- Você identificou qual struct tem mais padding e por quê.
- `lab8-union.md` com os quatro casos e a resposta sobre o `tipo` que não impede o bug.
- Você relacionou a `union` com **type confusion** do curso de fuzzing.
- `lab8-dump.md` com o dump conferido **byte a byte**.
- Você explicou a **ordem little-endian** dos bytes de `magia`.
- Você listou quais campos de cabeçalho validaria antes de usar.

---

## Avaliação

1. O que é padding, e por que ele existe?
2. Qual a regra de alinhamento de um campo? E do tamanho total da struct?
3. Calcule `sizeof(struct { char a; int b; char c; })` — mostre o raciocínio.
4. **Por que o tamanho total é múltiplo do maior alinhamento?** O que quebraria sem isso?
5. Por que reordenar os campos muda o tamanho? Quando **não** reordenar?
6. O que `union` faz com a memória? Qual o `sizeof` de uma `union`?
7. Por que `union` é um instrumento de type confusion?
8. `v.inteiro = 0x41424344` — quais bytes aparecem na memória, e em que ordem?
9. Por que `memcpy` é definido e o punning por `union` **não** é garantido?
10. **Por que um `switch` sem `default` é bug de segurança?**
11. `enum` em C verifica faixa? O que isso implica para valor vindo de arquivo?
12. Qual a diferença entre `-Wswitch` e `-Wswitch-enum`?
13. Se um cabeçalho vem de arquivo, quais campos você valida antes de usar?

---

**Próximo:** [Módulo 9 — Arquivo, binário e parsing](modulo-09.md)
