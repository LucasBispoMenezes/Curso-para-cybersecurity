# Módulo 4 — String, Buffer e o Limite Ausente

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Entender que em C **string não é um tipo** — é uma convenção.
2. Conhecer as funções de cópia e o que cada uma garante (ou não garante).
3. Reconhecer as cinco funções que **não** verificam limite.
4. Usar as alternativas seguras, e saber o custo de cada uma.
5. Saber por que `'\0'` é a causa raiz de metade dos bugs de C.

---

## 4.1 String não é um tipo

⚠ **A afirmação que organiza o módulo:** em C, string é **array de `char` terminado em `'\0'`**. Não
existe tipo string, não existe campo de tamanho, não existe verificação.

```bash
cd ~/c-lab/src

cat > string1.c <<'EOF'
#include <stdio.h>
#include <string.h>

int main(void) {
    char a[] = "abc";          /* array de 4 bytes: 'a','b','c','\0' */
    const char *b = "abc";     /* ponteiro para literal em .rodata */

    printf("═══ array vs. ponteiro para literal ═══\n");
    printf("  sizeof(a) = %zu   ← o ARRAY inteiro (3 + NUL)\n", sizeof(a));
    printf("  sizeof(b) = %zu   ← o PONTEIRO só\n", sizeof(b));
    printf("  strlen(a) = %zu   ← até o NUL, sem contar o NUL\n", strlen(a));

    printf("\n═══ os bytes de `a` ═══\n");
    for (size_t i = 0; i <= strlen(a); i++)
        printf("  a[%zu] = %3d  '%c'%s\n", i, (unsigned char)a[i],
               a[i] ? a[i] : ' ', a[i] == '\0' ? "   ← terminador" : "");

    printf("\n═══ o NUL é o que define o fim ═══\n");
    char sem_nul[4] = {'a', 'b', 'c', 'd'};   /* ⚠ NÃO é string! */
    printf("  sem_nul tem 4 chars e nenhum NUL: strlen dá %zu (aleatório!)\n",
           strlen(sem_nul));

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/string1 string1.c && ../bin/string1
```

⚠ **`char sem_nul[4] = {'a','b','c','d'}` não é string.** É um array de bytes. `strlen` nele
**continua lendo** até achar um `\0` em algum lugar da memória — e o resultado é indefinido.

⚠ **É por isso que o `+1` no `malloc(strlen(s) + 1)` é obrigatório** — o `strlen` **não** conta o
terminador.

| Expressão | Conta o `\0`? |
|---|---|
| `strlen(s)` | **Não** |
| `sizeof("abc")` | **Sim** (4) |
| `sizeof` de array de char | Sim |
| `sizeof` de ponteiro | Nada — é o tamanho do ponteiro |

---

## 4.2 As cinco funções que não verificam limite

⚠ **Todas as cinco escrevem sem saber o tamanho do destino.**

| Função | O que faz | Verifica destino? | Problema |
|---|---|---|---|
| **`strcpy(dst, src)`** | Copia até o `\0` | **Não** | Transbordo se `dst` for menor |
| **`strcat(dst, src)`** | Anexa ao fim | **Não** | Precisa do `\0` e ainda transborda |
| **`sprintf(dst, fmt, ...)`** | Formata | **Não** | Transbordo com campo largo |
| **`gets(dst)`** | Lê linha | **Não** | **Removida do padrão** em C11 |
| **`memcpy(dst, src, n)`** | Copia `n` bytes | **Não** | Transbordo se `n` > tamanho |

```bash
cat > inseguras.c <<'EOF'
#include <stdio.h>
#include <string.h>

int main(void) {
    char destino[8];                        /* 8 bytes só */

    printf("═══ strcpy com 20 bytes em destino de 8 ═══\n");
    printf("destino está em %p\n", (void *)destino);
    strcpy(destino, "isso tem vinte bytes");   /* ⚠ TRANSBORDA */
    printf("depois: '%s'\n", destino);
    printf("⚠ compilou sem aviso, e escreveu 13 bytes além do limite\n");

    return 0;
}
EOF

echo "═══ gcc, sem sanitizer ═══"
gcc -Wall -Wextra -g -O0 -o ../bin/inseg_gcc inseguras.c
../bin/inseg_gcc; echo "código: $?"

echo
echo "═══ clang, sem sanitizer ═══"
clang -Wall -Wextra -g -O0 -o ../bin/inseg_clang inseguras.c 2>&1 | head -8
../bin/inseg_clang; echo "código: $?"

echo
echo "═══ com ASan ═══"
clang -g -O1 -fsanitize=address -o ../bin/inseg_asan inseguras.c
../bin/inseg_asan 2>&1 | head -12
```

⚠ **Sem sanitizer, o programa "funciona"** — imprime a string corretamente. Isso é o que torna a
classe perigosa: **o transbordo corrompeu memória, e ninguém notou.**

⚠ **Com `clang -O2`, o compilador moderno avisa** sobre `strcpy` com fonte de tamanho conhecido
maior que o destino. É uma das melhorias dos últimos anos — e é a razão de compilar com `clang`
além do `gcc`.

⚠ **E note `sprintf`.** Ele é frequentemente esquecido na lista, mas é tão perigoso quanto o
`strcpy` — porque `%s` com argumento largo transborda do mesmo jeito.

---

## 4.3 As alternativas — e o que cada uma garante

| Função segura | Garante | Custo |
|---|---|---|
| **`snprintf(dst, n, fmt, ...)`** | Não passa de `n`; **sempre** termina em `\0` | Mais lenta; precisa calcular `n` |
| **`strncpy(dst, src, n)`** | Escreve no máximo `n` | ⚠ **Pode não terminar em `\0`** |
| **`strncat(dst, src, n)`** | Anexa no máximo `n` | ⚠ Idem |
| **`strlcpy(dst, src, n)`** | Trunca e termina em `\0` | **Não é padrão** — BSD, não glibc |
| **`memcpy` com `n` correto** | Copia exatamente `n` | Você calcula `n` — e é aí que erra |
| **`strlen` + `memcpy`** | Controle total | Você faz a conta |

⚠ **A armadilha do `strncpy` é a mais traiçoeira da tabela.**

```bash
cat > strncpy_trap.c <<'EOF'
#include <stdio.h>
#include <string.h>

int main(void) {
    char a[8], b[8], c[8];

    memset(a, 'Z', sizeof(a));
    memset(b, 'Z', sizeof(b));
    memset(c, 'Z', sizeof(c));

    printf("═══ strncpy com fonte MAIOR que n ═══\n");
    strncpy(a, "muito longe de caber", sizeof(a));
    printf("  a: '%.8s'   terminou em NUL? %s\n", a,
           memchr(a, '\0', sizeof(a)) ? "sim" : "⚠ NÃO");
    printf("  ⚠ sem NUL, `a` não é string — e strlen(a) lê além!\n\n");

    printf("═══ strncpy com fonte MENOR que n ═══\n");
    strncpy(b, "curto", sizeof(b));
    printf("  b: '%.8s'\n", b);
    printf("  ⚠ strncpy preencheu o RESTO com NUL: ");
    for (int i = 0; i < 8; i++) printf("%02x ", (unsigned char)b[i]);
    printf("\n  ← gasta tempo preenchendo, e é o comportamento documentado\n\n");

    printf("═══ a forma correta: strncpy + NUL manual ═══\n");
    strncpy(c, "muito longe de caber", sizeof(c) - 1);   /* -1 para o NUL */
    c[sizeof(c) - 1] = '\0';                            /* ⚠ OBRIGATÓRIO */
    printf("  c: '%s'   terminou em NUL? %s\n", c,
           memchr(c, '\0', sizeof(c)) ? "sim ✓" : "não");
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/strncpy_trap strncpy_trap.c && ../bin/strncpy_trap
```

⚠ **As duas armadilhas do `strncpy`:**
1. Se a fonte é **maior ou igual** a `n`, **não coloca o `\0`** — e o destino não é string.
2. Se a fonte é **menor**, ele **preenche o resto com NUL** — gastando tempo sem necessidade.

⚠ **`strncpy` não foi feito para string.** Ele foi feito para campo de tamanho fixo em struct de
sistema — onde o padding com NUL é o comportamento desejado. Usá-lo para string é o erro.

### A forma correta, e a recomendação

```bash
cat > seguras.c <<'EOF'
#include <stdio.h>
#include <string.h>

/* a função que este curso recomenda */
static int copiar_string(char *dst, size_t dst_n, const char *src) {
    if (!dst || !src || dst_n == 0) return -1;

    size_t src_n = strlen(src);
    if (src_n >= dst_n) {
        /* trunca em vez de transbordar — mas AVISE */
        memcpy(dst, src, dst_n - 1);
        dst[dst_n - 1] = '\0';
        return 1;                    /* 1 = truncou */
    }

    memcpy(dst, src, src_n + 1);     /* +1 leva o NUL */
    return 0;                        /* 0 = copiou tudo */
}

int main(void) {
    char dst[16];

    printf("═══ cabe ═══\n");
    printf("  r=%d  dst='%s'\n", copiar_string(dst, sizeof(dst), "curto"), dst);

    printf("\n═══ não cabe: trunca ═══\n");
    printf("  r=%d  dst='%s'  (%zu chars)\n",
           copiar_string(dst, sizeof(dst), "texto muito mais longo que cabe"),
           dst, strlen(dst));
    printf("  ⚠ devolveu 1 — quem chamou SABE que truncou\n");

    printf("\n═══ com snprintf, como alternativa ═══\n");
    int n = snprintf(dst, sizeof(dst), "%s", "outro texto bem longo mesmo");
    printf("  snprintf devolveu %d (o que CABERIA)\n", n);
    printf("  dst='%s'\n", dst);
    printf("  ⚠ se n >= sizeof(dst), truncou — teste isso!\n");

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/seguras seguras.c && ../bin/seguras
```

⚠ **Note o valor de retorno de `copiar_string`.** Ele diz **se truncou** — e é isso que permite ao
chamador decidir. Uma função que trunca em silêncio é tão perigosa quanto uma que transborda:
**o dado saiu errado e ninguém sabe.**

⚠ **E `snprintf` devolve o quanto *teria* cabido** — não o quanto escreveu. Se o retorno for
`>= sizeof(dst)`, truncou. **Verificar o retorno do `snprintf` é obrigatório** — e quase ninguém faz.

**Produza `seguras.md`:**

| Função | Transborda? | Termina em `\0`? | Devolve o quê |
|---|---|---|---|
| `strcpy` | | | |
| `strncpy` | | | |
| `snprintf` | | | |
| `copiar_string` | | | |

**Responda:**

1. **Por que `strncpy` pode não terminar em `\0`?** O que isso causa?
2. `snprintf` devolve `n`. O que `n >= sizeof(dst)` significa?
3. Por que `copiar_string` devolve `1` em vez de só truncar?
4. `strlcpy` existe no seu sistema? Teste:

```bash
echo '#include <string.h>
int main(void){ char b[4]; strlcpy(b,"abc",sizeof(b)); return 0; }' > /tmp/tl.c
gcc -Wall -o /tmp/tl /tmp/tl.c 2>&1 | head -3
```

---

## 4.4 O `\0` como causa raiz

⚠ **Metade dos bugs de string em C vêm de uma pergunta:** *onde está o `\0`?*

```bash
cat > nul.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
    printf("═══ 1. esquecer o +1 no malloc ═══\n");
    const char *orig = "abcdef";
    size_t n = strlen(orig);                  /* 6, sem contar o NUL */

    char *errado = malloc(n);                 /* ⚠ devia ser n + 1 */
    if (!errado) return 1;
    memcpy(errado, orig, n);                  /* copia 6 bytes, sem NUL */
    printf("  alocado %zu bytes, copiado %zu, sem NUL\n", n, n);
    printf("  strlen(errado) = %zu  ← lê além, valor indefinido\n", strlen(errado));
    free(errado);

    printf("\n═══ 2. a forma correta ═══\n");
    char *certo = malloc(n + 1);
    if (!certo) return 1;
    memcpy(certo, orig, n + 1);               /* +1 leva o NUL */
    printf("  alocado %zu bytes, strlen = %zu\n", n + 1, strlen(certo));
    free(certo);

    printf("\n═══ 3. sobrescrever o NUL por acidente ═══\n");
    char buf[8];
    strcpy(buf, "abc");                       /* ok: 4 bytes */
    printf("  antes:  strlen=%zu  buf='%s'\n", strlen(buf), buf);

    buf[3] = 'X';                             /* ⚠ sobrescreveu o NUL */
    printf("  depois: strlen=%zu  buf='%s'  ← lê além!\n", strlen(buf), buf);

    printf("\n═══ 4. a conta que sempre erra ═══\n");
    printf("  strlen(s)        = %zu   ← sem NUL\n", strlen(orig));
    printf("  strlen(s) + 1    = %zu   ← com NUL: o tamanho a alocar\n", strlen(orig) + 1);
    printf("  sizeof(\"abc\")    = %zu   ← 4, porque conta o NUL\n", sizeof("abc"));

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/nul nul.c && ../bin/nul
```

⚠ **O caso 3 é o mais didático.** Sobrescrever o `\0` transforma uma string válida em array de
bytes — e a partir daí qualquer função de string **lê além do buffer**, porque não sabe onde parar.

⚠ **A conta que sempre erra, em uma tabela:**

| Você quer | Aloca |
|---|---|
| Guardar a string `s` inteira | `strlen(s) + 1` |
| Copiar `s` para `dst` com espaço `n` | Verifique `strlen(s) + 1 <= n` |
| Reservar para "até 100 chars" | `101` (100 + NUL) |
| Usar `sizeof("literal")` | Já inclui o NUL |

---

## 4.5 Comparação, busca e as armadilhas de retorno

```bash
cat > comparacao.c <<'EOF'
#include <stdio.h>
#include <string.h>

int main(void) {
    printf("═══ strcmp devolve 0 para IGUAL ═══\n");
    printf("  strcmp(\"abc\",\"abc\") = %d   ← 0 significa IGUAL\n", strcmp("abc","abc"));
    printf("  strcmp(\"abc\",\"abd\") = %d\n", strcmp("abc","abd"));
    printf("  strcmp(\"abd\",\"abc\") = %d\n", strcmp("abd","abc"));

    printf("\n⚠ ARMADILHA: if (strcmp(a,b)) testa DIFERENTE\n");
    const char *a = "senha", *b = "senha";
    if (strcmp(a, b)) printf("  'if (strcmp(a,b))' → entrou: são DIFERENTES?\n");
    else              printf("  'if (strcmp(a,b))' → não entrou: são iguais\n");
    printf("  ⚠ o correto é 'if (strcmp(a,b) == 0)'\n");

    printf("\n═══ memcmp: compara BYTES, sem parar no NUL ═══\n");
    char x[4] = {'a','b','c','\0'};
    char y[4] = {'a','b','c','X'};
    printf("  strcmp(x,y)  = %d   ← 0: iguais ATÉ o NUL\n", strcmp(x, y));
    printf("  memcmp(x,y,4)= %d   ← diferença no 4º byte\n", memcmp(x, y, 4));

    printf("\n═══ strstr e strchr ═══\n");
    const char *frase = "o rato roeu a roupa";
    printf("  strstr(...,\"roeu\") = '%s'\n", strstr(frase, "roeu"));
    printf("  strchr(...,'r')     = '%s'\n", strchr(frase, 'r'));
    printf("  strstr(...,\"xxxx\") = %s   ← NULL quando não acha\n",
           strstr(frase, "xxxx") ? "achou" : "NULL");

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/comparacao comparacao.c && ../bin/comparacao
```

⚠ **A armadilha do `strcmp` é clássica e custa bug de segurança.** `if (strcmp(a, b))` entra quando
as strings são **diferentes** — o inverso do que a maioria espera ler. **A forma correta sempre
explícita: `if (strcmp(a, b) == 0)`.**

⚠ **E `memcmp` nunca deve ser usado para comparar senha.** Ele para no primeiro byte diferente, e o
tempo de execução **vaza** quantos bytes estavam certos. A comparação de segredo exige função de
**tempo constante** — como `CRYPTO_memcmp` do OpenSSL. É o primeiro contato com *timing attack*.

**Produza `comparacao.md`:**

| Chamada | Devolve | Cuidado |
|---|---|---|
| `strcmp(iguais)` | | |
| `strcmp(diferentes)` | | |
| `memcmp(4 bytes)` | | |
| `strstr` sem achar | | |
| `strchr` sem achar | | |

**Responda:**

1. Por que `if (strcmp(a,b))` testa **diferente**?
2. `strcmp(x,y)` deu 0 e `memcmp(x,y,4)` não. Por quê?
3. Por que `memcmp` em comparação de senha é falha de segurança?
4. O que fazer quando `strstr` devolve `NULL`?

---

## 4.6 LAB — Transbordo, correção e prova

**Duração:** 120 min

### Passo 1 — Transborde e veja (35 min)

```bash
cd ~/c-lab/src

cat > lab4.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

/* ⚠ versão insegura — o alvo do exercício */
int processar_inseguro(const char *entrada) {
    char buffer[16];                 /* 16 bytes */
    strcpy(buffer, entrada);         /* ⚠ sem limite */
    return (int)strlen(buffer);
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "uso: %s <texto>\n", argv[0]); return 2; }
    printf("processado: %d chars\n", processar_inseguro(argv[1]));
    return 0;
}
EOF

echo "═══ compilando ═══"
gcc -Wall -Wextra -g -O0 -fno-stack-protector -o ../bin/lab4-plain lab4.c
clang -g -O1 -fsanitize=address,undefined -o ../bin/lab4-asan lab4.c

echo
for LEN in 5 15 16 20 50 200; do
    TEXTO=$(python3 -c "print('A'*${LEN})")
    printf '%-5s chars → ' "${LEN}"

    if ../bin/lab4-plain "${TEXTO}" >/dev/null 2>&1; then p="ok"; else p="crash($?)"; fi
    printf 'plain: %-12s  ' "${p}"

    saida=$(../bin/lab4-asan "${TEXTO}" 2>&1)
    if printf '%s' "$saida" | grep -q 'stack-buffer-overflow'; then a="DETECTOU"
    elif printf '%s' "$saida" | grep -q 'ok\|chars'; then a="ok"
    else a="?"; fi
    printf 'asan: %s\n' "${a}"
done
```

### Passo 2 — O relatório do ASan, campo por campo (35 min)

```bash
echo "═══ RELATÓRIO COMPLETO (entrada de 50) ═══"
../bin/lab4-asan "$(python3 -c "print('A'*50)")" 2>&1 | tee ../tmp/lab4-relatorio.txt

echo
echo "═══ campos extraídos ═══"
grep -E '#0 |#1 |of size|is located|allocated|AddressSanitizer' \
     ../tmp/lab4-relatorio.txt | head -10
```

Produza `lab4-relatorio.md`:

| Campo | Valor no seu caso | Significado |
|---|---|---|
| Tipo do erro | | |
| `WRITE` ou `READ` | | |
| Tamanho do acesso | | |
| `#0` (arquivo:linha) | | |
| Bytes além do bloco | | |
| Tamanho do bloco | | |

**Responda:**

1. **Com quantos caracteres o ASan começou a detectar?** Bate com os 16 do buffer?
2. Com **20** caracteres, o `plain` crashou? Se não, o que aconteceu?
3. O erro é `stack-buffer-overflow` ou `heap-buffer-overflow`? Por quê?
4. **Por que o `plain` não detectou nada até 200 chars?**

### Passo 3 — Corrija e prove (35 min)

```bash
cd ~/c-lab/src

cat > lab4-fix.c <<'EOF'
#include <stdio.h>
#include <string.h>

/*
 * Versão CORRIGIDA.
 * Retorna:
 *   >= 0 : comprimento processado
 *   -1   : entrada NULL
 *   -2   : entrada não cabe (truncou)
 */
int processar(const char *entrada) {
    char buffer[16];

    if (!entrada) return -1;

    size_t n = strlen(entrada);
    if (n >= sizeof(buffer)) {
        /* ⚠ RECUSA em vez de truncar — a decisão é explícita */
        memcpy(buffer, entrada, sizeof(buffer) - 1);
        buffer[sizeof(buffer) - 1] = '\0';
        return -2;
    }

    memcpy(buffer, entrada, n + 1);      /* +1 leva o NUL */
    return (int)n;
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "uso: %s <texto>\n", argv[0]); return 2; }

    int r = processar(argv[1]);
    if (r == -1) { printf("erro: entrada nula\n"); return 1; }
    if (r == -2) { printf("erro: entrada longa demais\n"); return 1; }

    printf("processado: %d chars\n", r);
    return 0;
}
EOF

echo "═══ compilando e testando ═══"
gcc -Wall -Wextra -Werror -g -O0 -o ../bin/lab4-fix lab4-fix.c
clang -g -O1 -fsanitize=address,undefined -o ../bin/lab4-fix-asan lab4-fix.c

for LEN in 5 15 16 20 50 200; do
    TEXTO=$(python3 -c "print('A'*${LEN})")
    printf '%-5s chars → ' "${LEN}"
    ../bin/lab4-fix "${TEXTO}" 2>&1 | head -1
done

echo
echo "═══ o ASan silencia? ═══"
for LEN in 50 200; do
    TEXTO=$(python3 -c "print('A'*${LEN})")
    printf '%-5s chars: ' "${LEN}"
    if ../bin/lab4-fix-asan "${TEXTO}" 2>&1 | grep -q 'AddressSanitizer'; then
        echo "⚠ AINDA DETECTA"
    else
        echo "✓ sem erro"
    fi
done
```

Produza `lab4-correcao.md`:

| Entrada | Inseguro | Corrigido | O que a correção faz |
|---|---|---|---|
| 5 chars | | | |
| 15 chars | | | |
| 16 chars | | | |
| 50 chars | | | |

**Responda:**

1. **Por que a correção recusa em vez de truncar?** Qual é o argumento a favor de cada escolha?
2. `n >= sizeof(buffer)` — por que `>=` e não `>`?
3. Por que `memcpy(buffer, entrada, n + 1)` e não `n`?
4. **Escreva a versão que trunca em vez de recusar.** Qual o valor de retorno nesse caso?

⚠ **A resposta 1 é uma decisão de projeto real.** Recusar é mais seguro (o chamador sabe); truncar
é mais conveniente. **A escolha errada é truncar em silêncio** — que esconde o problema.

### Passo 4 — Generalize: a função reutilizável (15 min)

⚠ **Escreva uma vez, use no curso inteiro.**

```bash
cd ~/c-lab/src

cat > safe.h <<'EOF'
/* safe.h — utilitários de string com limite verificado */
#ifndef SAFE_H
#define SAFE_H
#include <stddef.h>

/*
 * copia_string — copia com verificação de limite.
 * Devolve:  0 = copiou tudo
 *           1 = truncou
 *          -1 = argumento inválido
 */
int copia_string(char *dst, size_t dst_n, const char *src);

#endif
EOF

cat > safe.c <<'EOF'
#include "safe.h"
#include <string.h>

int copia_string(char *dst, size_t dst_n, const char *src) {
    if (!dst || !src || dst_n == 0) return -1;

    size_t n = strlen(src);
    if (n >= dst_n) {
        memcpy(dst, src, dst_n - 1);
        dst[dst_n - 1] = '\0';
        return 1;
    }
    memcpy(dst, src, n + 1);
    return 0;
}
EOF

cat > safe-teste.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include "safe.h"

int main(void) {
    char dst[10];
    const char *casos[] = {"curto", "exatamente", "bem mais longo que dez", NULL};

    for (int i = 0; casos[i]; i++) {
        memset(dst, 'X', sizeof(dst));
        int r = copia_string(dst, sizeof(dst), casos[i]);
        printf("  r=%2d  dst='%s'  strlen=%zu\n", r, dst, strlen(dst));
    }
    return 0;
}
EOF

gcc -Wall -Wextra -Werror -g -O0 -o ../bin/safe-teste safe-teste.c safe.c
../bin/safe-teste
```

Produza `lab4-safe.md`:

| Entrada | `r` | `dst` | `strlen` |
|---|---|---|---|
| `"curto"` | | | |
| `"exatamente"` | | | |
| `"bem mais longo que dez"` | | | |

**Responda:**

1. `"exatamente"` tem 10 chars e `dst` tem 10. **O que aconteceu?** Por quê?
2. Qual o maior comprimento que cabe em `dst[10]` **com o NUL**?
3. A função é reutilizável? Ela depende de algo global?
4. **Onde você usaria esta função** no curso de fuzzing?

⚠ **A resposta 1 é a armadilha do `>=`.** `"exatamente"` tem 10 chars; `10 >= 10` é verdade, então
**trunca** — mesmo cabendo 9 chars + NUL. **O limite correto é `n >= dst_n`**, e o resultado
truncado é o comportamento certo: **10 chars não cabem em 10 bytes com terminador.**

### Critérios de aceitação

- `lab4-relatorio.md` com os **seis** campos do relatório ASan real.
- Você identificou com **quantos caracteres** o ASan começa a detectar.
- Você explicou por que o binário sem sanitizer **não** detectou até 200 chars.
- `lab4-correcao.md` com a comparação e a **decisão** entre recusar e truncar.
- Você explicou por que `>=` e não `>`.
- Você escreveu a versão que **trunca**, com o valor de retorno.
- `safe.h`, `safe.c` e `safe-teste.c` compilando com **`-Werror`** — zero avisos.
- Você explicou por que `"exatamente"` trunca em `dst[10]`.

---

## Avaliação

1. Por que string não é um tipo em C? O que ela é?
2. `strlen(s)` conta o `\0`? E `sizeof("abc")`?
3. Por que `char a[4] = {'a','b','c','d'}` **não é** string?
4. Cite as cinco funções que não verificam limite. Qual foi removida do padrão?
5. **Por que `strncpy` pode não terminar em `\0`?** O que isso causa?
6. Para que `strncpy` foi projetado? Por que usar em string é erro?
7. O que `snprintf` devolve? Como saber se truncou?
8. Por que `strlcpy` não é portável? O que usar em vez disso?
9. Qual a conta correta para alocar espaço para uma string `s`?
10. Por que sobrescrever o `\0` transforma uma string válida em bug?
11. **Por que `if (strcmp(a,b))` testa diferente?** Qual a forma correta?
12. `strcmp` deu 0 e `memcmp` com 4 bytes não. Por quê?
13. Por que `memcmp` em comparação de senha é falha de segurança?
14. Por que recusar entrada longa é mais seguro que truncar em silêncio?
15. Por que o limite é `n >= dst_n` e não `n > dst_n`?

---

**Próximo:** [Módulo 5 — Comportamento indefinido](modulo-05.md)
