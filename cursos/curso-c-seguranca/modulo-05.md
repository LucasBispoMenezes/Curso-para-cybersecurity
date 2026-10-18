# Módulo 5 — Comportamento Indefinido: a Parte que Ninguém Ensina

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Distinguir **definido**, **não especificado**, **indefinido** e **dependente da implementação**.
2. Reconhecer as fontes de UB mais comuns em C.
3. **Prever** quando o compilador otimiza o bug para longe.
4. Ver `gcc` e `clang` divergirem no mesmo código.
5. Entender por que UB é a raiz de vulnerabilidade, não só de bug.

---

## ⚠ Este é o módulo central do curso

Os módulos 1 a 4 ensinaram C. **Este ensina por que o C quebra** — e é a diferença entre escrever C
e entender C.

⚠ **A afirmação que organiza tudo:**

> **O padrão C não garante o que acontece em comportamento indefinido. Não é "resultado errado" —
> é "nenhuma garantia".** O compilador pode fazer **qualquer coisa**, incluindo eliminar o código.

⚠ **E a consequência de segurança:** a maior parte das vulnerabilidades exploráveis de C nasce de
UB. **Não é coincidência** — UB é o que dá ao compilador liberdade para transformar um bug pequeno
em corrupção explorável.

---

## 5.1 As quatro categorias — e por que a distinção importa

| Categoria | O que o padrão garante | Exemplo |
|---|---|---|
| **Definido** | Comportamento exato, em toda implementação | `1 + 1` é `2` |
| **Não especificado** | Um de vários comportamentos válidos | Ordem de avaliação de `f() + g()` |
| **Dependente da implementação** | Documentado pela implementação | `sizeof(int)`, `char` com sinal |
| **Indefinido (UB)** | **Nada** | Overflow de `int`, desreferência de `NULL` |

⚠ **A linha entre "não especificado" e "indefinido" é a que mais confunde.** Não especificado
significa "o resultado é um dos válidos, mas qual deles é livre". **Indefinido significa "não há
resposta válida"** — e o compilador pode assumir que isso **nunca acontece**.

```
NÃO ESPECIFICADO                    INDEFINIDO
┌────────────────────────┐         ┌────────────────────────┐
│ A ordem pode ser A ou B│         │ O padrão diz: isso     │
│ Mas o RESULTADO está   │         │ NUNCA acontece.        │
│ dentro do esperado.    │         │                        │
│                        │         │ Então o compilador     │
│ Você pode até confiar  │         │ pode ELIMINAR o código │
│ em qual é, testando.   │         │ que trata esse caso.   │
└────────────────────────┘         └────────────────────────┘
```

⚠ **A diferença prática: em UB, o compilador pode remover a verificação que você escreveu para
lidar com o UB.** É o que faz `if (p == NULL)` desaparecer, e o que faz a checagem de overflow
sumir. **O módulo 5 existe para você entender isso antes de escrever código de segurança.**

---

## 5.2 As fontes de UB que você vai encontrar

| # | Fonte | Exemplo | Por que é UB |
|---|---|---|---|
| 1 | **Estouro de inteiro com sinal** | `INT_MAX + 1` | Não há representação |
| 2 | **Divisão por zero** | `x / 0` | Indefinido |
| 3 | **`INT_MIN / -1`** | Overflow | Indefinido |
| 4 | **Desreferenciar `NULL`** | `*p` com `p == NULL` | Indefinido |
| 5 | **Ler variável não inicializada** | `int x; use(x);` | Valor indefinido |
| 6 | **Acesso fora do array** | `a[10]` em `a[5]` | Indefinido |
| 7 | **`free` duas vezes** | `free(p); free(p);` | Indefinido |
| 8 | **Usar depois do `free`** | `free(p); use(p);` | Indefinido |
| 9 | **Shift inválido** | `x << 40` em `int` | Indefinido |
| 10 | **Sequência de avaliação** | `i = i++ + ++i` | Indefinido |
| 11 | **Aliasing estrito** | Acessar `int` por ponteiro `float` | Indefinido |
| 12 | **Modificar literal** | `char *s = "abc"; s[0] = 'X';` | Indefinido |
| 13 | **Ponteiro fora do objeto** | `int *p = &a[5]` (além do fim) | Indefinido |
| 14 | **Subtrop de ponteiros** | Subtrair ponteiros de objetos diferentes | Indefinido |
| 15 | **`printf` com formato errado** | `printf("%d", ptr)` | Indefinido |

⚠ **Decore a estrutura, não os itens.** As 15 fontes se agrupam em cinco famílias:

| Família | Fontes |
|---|---|
| **Aritmética** | 1, 2, 3, 9 |
| **Memória** | 4, 6, 7, 8, 13 |
| **Estado** | 5, 10 |
| **Tipo** | 11, 12, 14, 15 |
| **Sintaxe ambígua** | 10 |

---

## 5.3 O experimento central: o compilador elimina o código

⚠ **Esta é a demonstração que muda como você escreve C.**

```bash
cd ~/c-lab/src

cat > ub1.c <<'EOF'
#include <stdio.h>
#include <limits.h>

/* ⚠ UB: estouro de inteiro COM SINAL */
int estoura(int x) {
    return x + 1;
}

int main(void) {
    printf("═══ -O0 ═══\n");
    int a = INT_MAX;
    printf("  INT_MAX = %d\n", a);
    printf("  INT_MAX + 1 = %d   ← UB! mas provavelmente mostra INT_MIN\n", estoura(a));

    printf("\n═══ a verificação que o padrão NÃO obriga a funcionar ═══\n");
    int b = INT_MAX;
    if (b + 1 < b) {
        printf("  overflow detectado!\n");
    } else {
        printf("  sem overflow\n");
    }
    printf("  ⚠ 'b + 1 < b' já é UB — então a comparação é otimizada fora\n");

    return 0;
}
EOF

echo "╔══════════════════════════════════════════════╗"
echo "║  gcc -O0                                     ║"
echo "╚══════════════════════════════════════════════╝"
gcc -Wall -Wextra -g -O0 -o ../bin/ub1_O0 ub1.c 2>&1 | head -3
../bin/ub1_O0

echo
echo "╔══════════════════════════════════════════════╗"
echo "║  gcc -O2                                     ║"
echo "╚══════════════════════════════════════════════╝"
gcc -Wall -Wextra -g -O2 -o ../bin/ub1_O2 ub1.c 2>&1 | head -3
../bin/ub1_O2
```

⚠ **A diferença na segunda parte é o ponto.** Em `-O2`, o compilador sabe que `b + 1` **não pode**
ser menor que `b` — porque isso exigiria overflow, que é UB, o que ele assume que **nunca
acontece**. Então ele **elimina a verificação**.

⚠ **Isso é a fonte número um de vulnerabilidade.** O código de segurança que escrevemos
(`if (size + len > MAX)`) **é removido** se o compilador provar que `size + len` não pode estourar.
**A verificação existe, compila, e não roda.**

**Prova com o assembly:**

```bash
echo "═══ o `if` existe em -O0? ═══"
gcc -S -O0 -o ../tmp/ub1_O0.s ub1.c
grep -A4 'sem overflow\|overflow detectado\|cmp' ../tmp/ub1_O0.s | head -12

echo
echo "═══ e em -O2? ═══"
gcc -S -O2 -o ../tmp/ub1_O2.s ub1.c
grep -A4 'sem overflow\|overflow detectado\|cmp' ../tmp/ub1_O2.s | head -12
```

**Produza `ub1.md`:**

| Otimização | `INT_MAX + 1` | A verificação rodou? | Os avisos |
|---|---|---|---|
| `-O0` | | | |
| `-O2` | | | |

**Responda:**

1. **A saída mudou entre `-O0` e `-O2`?** Se sim, em quê?
2. No `.s` de `-O2`, o `cmp` da verificação **existe**? Por quê?
3. Por que o compilador **pode** eliminar a verificação? (Relacione com "UB nunca acontece".)
4. **Isso é bug do compilador?** Justifique.

⚠ **A resposta 4 é a mais importante do módulo.** **Não é bug do compilador.** O padrão C diz que
o resultado de `b + 1 < b` é indefinido — o compilador está autorizado a assumir qualquer coisa
sobre código UB. **O bug é de quem escreveu UB.**

⚠ **Se o `-O2` não eliminou** (depende da versão), use `-O3` e `-fstrict-overflow`. O ponto é o
mecanismo, não o caso específico.

---

## 5.4 `gcc` e `clang` divergindo

⚠ **O mesmo código, dois compiladores, dois comportamentos.** Isso é UB: nenhuma garantia.

```bash
cd ~/c-lab/src

cat > ub2.c <<'EOF'
#include <stdio.h>

/* ⚠ UB: ordem de avaliação não especificada + modificação múltipla */
int f(void) { static int n = 0; return ++n; }

int main(void) {
    printf("═══ 1. ordem de avaliação ═══\n");
    /* ⚠ a ordem de f() e g() não é especificada */
    int r = f() * 10 + f();
    printf("  f() * 10 + f() = %d\n", r);
    printf("  ⚠ depende de qual f() foi chamado primeiro\n");

    printf("\n═══ 2. i = i++ ═══\n");
    int i = 5;
    i = i++ + 1;                    /* ⚠ UB: modifica e lê na mesma expressão */
    printf("  depois de 'i = i++ + 1', i = %d\n", i);

    printf("\n═══ 3. shift ═══\n");
    int x = 1;
    int s = 40;
    printf("  1 << 40 (int) = %d   ← UB: shift >= largura\n", x << s);

    printf("\n═══ 4. acesso fora do array ═══\n");
    int a[3] = {1, 2, 3};
    printf("  a[5] = %d   ← UB: fora do array\n", a[5]);

    return 0;
}
EOF

echo "╔═════════════ gcc -O0 ═════════════╗"
gcc -Wall -Wextra -g -O0 -o ../bin/ub2_gcc ub2.c 2>&1 | grep -c warning | xargs echo "  avisos:"
../bin/ub2_gcc

echo
echo "╔═════════════ clang -O0 ═════════════╗"
clang -Wall -Wextra -g -O0 -o ../bin/ub2_clang ub2.c 2>&1 | grep -c warning | xargs echo "  avisos:"
../bin/ub2_clang

echo
echo "╔═════════════ gcc -O2 ═════════════╗"
gcc -Wall -Wextra -g -O2 -o ../bin/ub2_gccO2 ub2.c 2>/dev/null
../bin/ub2_gccO2

echo
echo "╔═════════════ clang -O2 ═════════════╗"
clang -Wall -Wextra -g -O2 -o ../bin/ub2_clangO2 ub2.c 2>/dev/null
../bin/ub2_clangO2
```

⚠ **Compare as quatro saídas.** Elas podem diferir — e cada diferença é **consequência de UB**, não
de bug do compilador.

### Os avisos são a sua defesa

```bash
echo "═══ avisos de UB, por compilador e flag ═══"
for cc in gcc clang; do
    for flag in "-Wall -Wextra" "-Wall -Wextra -Wsequence-point" "-Wall -Wextra -Wstrict-overflow=5"; do
        n=$(${cc} ${flag} -O2 -c -o /dev/null ub2.c 2>&1 | grep -c warning)
        printf '  %-6s %-40s → %s aviso(s)\n' "${cc}" "${flag}" "${n}"
    done
done
```

⚠ **A flag `-Wstrict-overflow=5` é a mais útil e a menos conhecida.** Ela avisa onde o compilador
**assume** que não há overflow — isto é, onde ele vai otimizar a sua verificação para fora.

**Produza `ub2.md`:**

| Compilador | `-O0` | `-O2` | Avisos |
|---|---|---|---|
| `gcc` | | | |
| `clang` | | | |

**Responda:**

1. **As saídas divergiram entre `gcc` e `clang`?** Em quais linhas?
2. Qual dos dois avisou sobre UB? Quantos avisos cada um deu?
3. Qual das três combinações de flags avisou mais?
4. **Se dois compiladores divergem, qual está certo?** Justifique.

---

## 5.5 UB com sanitizer e o que ele **não** pega

```bash
echo "═══ os mesmos UB, com UBSan ═══"
clang -g -O1 -fsanitize=undefined -fno-sanitize-recover=all \
      -o ../bin/ub2_ubsan ub2.c 2>/dev/null

../bin/ub2_ubsan 2>&1 | head -20
echo
echo "─── código de saída: $? ───"
```

⚠ **`-fno-sanitize-recover=all` faz o UBSan abortar em vez de continuar.** Sem ela, ele **avisa e
segue** — o que é útil para varrer muito código, e ruim para descobrir a causa raiz.

⚠ **E o UBSan com ASan juntos** — a combinação do curso:

```bash
clang -g -O1 -fsanitize=address,undefined \
      -o ../bin/ub2_ambos ub2.c 2>/dev/null

../bin/ub2_ambos 2>&1 | grep -E 'runtime error|AddressSanitizer' | head -10
```

### O que o UBSan **não** pega

⚠ **Honestidade necessária:**

| UB | UBSan pega? | O que pega |
|---|---|---|
| Overflow de inteiro **com sinal** | **Sim** | `-fsanitize=signed-integer-overflow` |
| Overflow de inteiro **sem sinal** | **Não** — é definido! | — |
| Ordem de avaliação | **Não** | — |
| Variável não inicializada | **Não** (só MSan) | `-fsanitize=memory` |
| Aliasing estrito | Parcial | `-fsanitize=alignment` em parte |
| Acesso fora do array | **Sim** (ASan) | `-fsanitize=address` |

⚠ **A segunda linha é a mais surpreendente:** **overflow de `unsigned` é definido** em C — ele
**envolve** (wraps around) de forma determinística. É por isso que `uint32_t` é usado para contador
onde o wrap é o comportamento desejado **e** é por isso que um bug de segurança pode passar
despercebido pelo UBSan.

⚠ **A quarta linha é a que mais dói:** `-fsanitize=memory` (MSan) exige instrumentar **todo** o
programa, incluindo libc. Sem isso, ele dá falso positivo. **Por isso quase ninguém usa MSan** — e
por isso variável não inicializada continua sendo bug difícil.

⚠ **E a aliasing estrito é a fonte de UB que quase ninguém conhece.** Ela aparece no curso de
fuzzing, quando um ponteiro de tipo errado é usado para reocupar memória liberada.

---

## 5.6 Aliasing estrito — a UB que causa vulnerabilidade

⚠ **Merece seção própria porque é a menos conhecida e a mais explorável.**

```bash
cd ~/c-lab/src

cat > aliasing.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include <stdint.h>

/* ⚠ UB: acessar um objeto por ponteiro de tipo incompatível */
float quebra_bits(uint32_t bits) {
    /* o padrão diz: só char* e unsigned char* podem aliasar qualquer coisa */
    return *(float *)&bits;              /* ⚠ ALIASING ESTRITO */
}

/* ✓ a forma CORRETA: memcpy */
float correto(uint32_t bits) {
    float f;
    memcpy(&f, &bits, sizeof(f));        /* ✓ definido */
    return f;
}

int main(void) {
    uint32_t bits = 0x40490FDB;          /* representa ~3.14159 em IEEE-754 */

    printf("═══ com aliasing (UB) ═══\n");
    gcc_float: ;
    float a = quebra_bits(bits);
    printf("  %.6f\n", a);

    printf("\n═══ com memcpy (definido) ═══\n");
    float b = correto(bits);
    printf("  %.6f\n", b);

    printf("\n═══ a forma que o compilador prefere ═══\n");
    printf("  union é aceita por GCC/Clang (extensão), mas não pelo padrão\n");

    return 0;
}
EOF

echo "═══ gcc -O0 ═══"
gcc -Wall -Wextra -g -O0 -o ../bin/alias_O0 aliasing.c 2>&1 | head -4
../bin/alias_O0

echo
echo "═══ gcc -O2 (o UB pode aparecer) ═══"
gcc -Wall -Wextra -g -O2 -o ../bin/alias_O2 aliasing.c 2>&1 | head -4
../bin/alias_O2

echo
echo "═══ e o aviso que pega isso ═══"
clang -Wall -Wextra -Wstrict-aliasing -O2 -c -o /dev/null aliasing.c 2>&1 | head -6
```

⚠ **Se a saída de `-O2` divergir da de `-O0`, você acabou de ver o UB se manifestar.** O compilador
pode assumir que `float*` e `uint32_t*` não apontam para o mesmo lugar (é o que a regra de aliasing
diz), e otimizar com base nisso.

⚠ **A correção é `memcpy`.** Compilador otimiza `memcpy` de tamanho pequeno para uma leitura direta
— então **não custa nada** e é **definido**.

⚠ **A regra de aliasing em uma frase:** só `char *` e `unsigned char *` podem apontar para qualquer
tipo. **Todo outro ponteiro só pode apontar para o próprio tipo.**

**Produza `aliasing.md`:**

| Versão | `-O0` | `-O2` | Divergiu? |
|---|---|---|---|
| `quebra_bits` | | | |
| `correto` | | | |

**Responda:**

1. As duas versões deram o mesmo número? Em qual otimização?
2. O aviso `-Wstrict-aliasing` apareceu? O que ele disse?
3. **Por que `memcpy` é definido e o cast não?**
4. Por que `char *` é exceção na regra de aliasing?

---

## 5.7 LAB — Preveja o UB

**Duração:** 150 min

⚠ **O lab é de previsão.** Você escreve o que espera, **depois** roda.

### Passo 1 — Preveja sete casos (50 min)

```bash
cd ~/c-lab/src

cat > lab5.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

int main(void) {
    printf("═══ CASO 1: overflow com sinal ═══\n");
    int a = INT_MAX;
    printf("  a+1 = %d\n", a + 1);

    printf("\n═══ CASO 2: overflow sem sinal (DEFINIDO!) ═══\n");
    unsigned b = UINT_MAX;
    printf("  b+1 = %u   ← envolve, e isso é GARANTIDO\n", b + 1);

    printf("\n═══ CASO 3: divisão por zero ═══\n");
    volatile int zero = 0;              /* volatile: impede otimização */
    volatile int c = 10;
    if (zero != 0) {
        printf("  c/zero = %d\n", c / zero);
    } else {
        printf("  zero é 0 — evitando a divisão\n");
    }

    printf("\n═══ CASO 4: desreferenciar NULL ═══\n");
    int *p = NULL;
    if (p != NULL) {
        printf("  *p = %d\n", *p);
    } else {
        printf("  p é NULL — evitando\n");
    }

    printf("\n═══ CASO 5: variável não inicializada ═══\n");
    int nao_init;
    printf("  nao_init = %d   ← valor indefinido\n", nao_init);

    printf("\n═══ CASO 6: acesso fora do array ═══\n");
    int arr[3] = {1, 2, 3};
    printf("  arr[7] = %d   ← UB\n", arr[7]);

    printf("\n═══ CASO 7: shift além da largura ═══\n");
    volatile int d = 1;
    volatile int sh = 40;
    if (sh < 32) {
        printf("  1 << 40 = %d\n", d << sh);
    } else {
        printf("  sh=40 >= 32 — evitando o UB\n");
    }

    printf("\n═══ CASO 8: modificar literal ═══\n");
    /* ⚠ DESCOMENTE e veja — provavelmente SIGSEGV (literal está em .rodata) */
    /* char *lit = "abc"; lit[0] = 'X'; */

    printf("\n═══ CASO 9: free duas vezes ═══\n");
    char *q = malloc(16);
    if (q) { free(q); }
    printf("  free chamado uma vez — o segundo seria UB\n");

    return 0;
}
EOF

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ANTES DE RODAR: escreva sua previsão em lab5-previsao.md ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo

gcc -Wall -Wextra -g -O0 -o ../bin/lab5_O0 lab5.c 2>&1 | grep -E 'warning' | head -10
echo "═══ -O0 ═══"
../bin/lab5_O0

echo
gcc -Wall -Wextra -g -O2 -o ../bin/lab5_O2 lab5.c 2>/dev/null
echo "═══ -O2 ═══"
../bin/lab5_O2
```

⚠ **Antes de rodar, preencha `lab5-previsao.md`** com o que você **acha** que cada caso faz. Depois
compare. **Onde você errou é onde você aprende.**

Produza `lab5-previsao.md`:

| Caso | Minha previsão | Resultado real | Acertei? | É UB? |
|---|---|---|---|---|
| 1 — overflow com sinal | | | | |
| 2 — overflow sem sinal | | | | |
| 3 — divisão por zero | | | | |
| 4 — NULL | | | | |
| 5 — não inicializada | | | | |
| 6 — fora do array | | | | |
| 7 — shift | | | | |
| 9 — `free` duplo | | | | |

**Responda:**

1. **Quantos você acertou?** Quais errou?
2. Qual caso você **não sabia** que era UB?
3. **O caso 2 é UB?** Por quê não?
4. As saídas de `-O0` e `-O2` divergiram em algum caso?

⚠ **A resposta 3 é a surpresa do módulo.** Overflow **sem sinal** é **definido** em C — ele envolve
de forma garantida. É uma das razões pelas quais código de segurança usa `uint32_t` para tamanho:
o wrap é previsível, e o compilador **não pode** otimizar a verificação para fora.

### Passo 2 — Compare compiladores (40 min)

```bash
cd ~/c-lab/src

echo "╔════════════ gcc -O2 ════════════╗"
gcc -Wall -Wextra -g -O2 -o ../bin/lab5_gcc lab5.c 2>/dev/null
../bin/lab5_gcc > ../tmp/lab5-gcc.txt 2>&1; cat ../tmp/lab5-gcc.txt

echo
echo "╔════════════ clang -O2 ════════════╗"
clang -Wall -Wextra -g -O2 -o ../bin/lab5_clang lab5.c 2>/dev/null
../bin/lab5_clang > ../tmp/lab5-clang.txt 2>&1; cat ../tmp/lab5-clang.txt

echo
echo "╔════════════ DIFF ════════════╗"
diff <(sed 's/[0-9-]\+/N/g' ../tmp/lab5-gcc.txt) \
     <(sed 's/[0-9-]\+/N/g' ../tmp/lab5-clang.txt) \
  && echo "  (sem diferença estrutural)" || echo "  ↑ divergência entre compiladores"
```

Produza `lab5-compiladores.md`:

| Caso | `gcc -O2` | `clang -O2` | Divergiu? |
|---|---|---|---|
| 1 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |

**Responda:**

1. **Alguma linha divergiu?** Qual?
2. Se divergiu, **os dois compiladores estão certos?**
3. Quantos avisos cada compilador deu, no total?
4. **Se você reportasse um bug que depende de UB, como o mantenedor receberia?**

### Passo 3 — Encontre UB no código do curso (40 min)

⚠ **Vire o olhar para o código que você já escreveu.**

```bash
cd ~/c-lab/src

echo "═══ procurando padrões de UB nos seus arquivos ═══"
echo
echo "── 1. ordem de avaliação com efeito colateral ──"
grep -nE '\b\w+\(\)\s*[+\-*/]\s*\w+\(\)' *.c 2>/dev/null | head -5
grep -nE '\w+\s*=\s*\w+\+\s*\+' *.c 2>/dev/null | head -5

echo
echo "── 2. acesso com índice não verificado ──"
grep -nE '\[[a-z_]+ *[+-] *[0-9]+\]' *.c 2>/dev/null | grep -v 'sizeof\|for' | head -8

echo
echo "── 3. cast de ponteiro entre tipos ──"
grep -nE '\(\s*(int|float|char|long|short)\s*\*\s*\)\s*&' *.c 2>/dev/null | head -8

echo
echo "── 4. free/uso depois de free ──"
grep -nE '\bfree\s*\(' *.c 2>/dev/null | wc -l
echo "     (revisar manualmente se o ponteiro é usado depois)"

echo
echo "── 5. shift com variável ──"
grep -nE '<<\s*[a-z_]+|>>\s*[a-z_]+' *.c 2>/dev/null | head -6

echo
echo "── 6. strcpy/strcat/sprintf ──"
grep -nE '\b(strcpy|strcat|sprintf|gets)\s*\(' *.c 2>/dev/null | head -8
```

Produza `lab5-auditoria.md`:

| Padrão | Quantos achou | Em quais arquivos | É UB? | Ação |
|---|---|---|---|---|
| Ordem de avaliação | | | | |
| Índice não verificado | | | | |
| Cast de ponteiro | | | | |
| Uso após `free` | | | | |
| Shift com variável | | | | |
| `strcpy`/`sprintf` | | | | |

**Responda:**

1. **Quantas ocorrências você achou** nos arquivos dos módulos anteriores?
2. Alguma delas é UB de verdade, ou só código feio?
3. **Qual arquivo seu tem mais UB?** Por quê?
4. **Você vai corrigir antes dos módulos 6 e 7?** Justifique.

⚠ **A resposta 4 é a decisão prática.** Corrigir agora evita que o UB atrapalhe os módulos 6 e 7 —
onde você precisa distinguir **bug real** de **artefato do seu UB**.

### Passo 4 — Escreva a regra (20 min)

⚠ **A regra que você vai aplicar no código de segurança do curso inteiro.**

Produza `lab5-regra.md`:

```markdown
# Regra de UB — o que eu aplico daqui para frente

## 1. Em aritmética
(Como você evita overflow com sinal? Use `unsigned` para tamanho? Cheque antes?)

## 2. Em memória
(Como você valida índice? Como você checa `NULL`?)

## 3. Em tipo
(Quando você usa `memcpy` em vez de cast?)

## 4. Na dúvida
(O que você faz quando não sabe se é UB?)

## 5. Ferramentas
(Quais flags e sanitizers você usa, e quando?)
```

**Perguntas para fechar:**

1. **Por que usar `size_t` (sem sinal) para tamanho é mais seguro que `int`?**
2. Se você precisa checar overflow antes, **qual a condição correta** para `a + b`?
3. Por que `memcpy` substitui o cast sem custo?
4. **Por que `-fwrapv` faz o overflow com sinal ser definido?** Teste:

```bash
echo "═══ com -fwrapv ═══"
gcc -Wall -Wextra -g -O2 -fwrapv -o ../bin/lab5_wrapv lab5.c 2>/dev/null
../bin/lab5_wrapv | sed -n '/CASO 1/,/CASO 2/p'
echo "  ⚠ -fwrapv muda a REGRA: overflow passa a ser definido"
echo "     é uma extensão do GCC/Clang, não do padrão"
```

⚠ **A resposta 2 é a que você vai usar:**

```c
/* checar se a + b estoura (b > 0) */
if (b > 0 && a > SIZE_MAX - b) { /* overflow */ }

/* checar se a * b estoura */
if (b != 0 && a > SIZE_MAX / b) { /* overflow */ }
```

### Critérios de aceitação

- `lab5-previsao.md` com as **oito** previsões, escritas **antes** de rodar.
- Você identificou quantos acertou e **quais errou**.
- `lab5-compiladores.md` com o `gcc` e o `clang` comparados, e a resposta sobre **qual está certo**.
- Você explicou por que overflow **sem sinal** não é UB.
- `lab5-auditoria.md` com a varredura **dos seus próprios arquivos**.
- Você rodou as seis buscas de padrão de UB e reportou as contagens.
- `lab5-regra.md` com a regra de UB, em cinco seções.
- Você testou `-fwrapv` e explicou o que ele muda **e** que é extensão, não padrão.

---

## Avaliação

1. Cite as quatro categorias de comportamento. Qual não garante **nada**?
2. **Qual a diferença prática entre "não especificado" e "indefinido"?**
3. Por que o compilador pode **eliminar** o código que trata UB?
4. Relacione as 15 fontes de UB nas cinco famílias.
5. Explique o experimento `b + 1 < b` em `-O0` e `-O2`. Por que a verificação some?
6. **Isso é bug do compilador?** Justifique com o que o padrão diz.
7. `gcc` e `clang` divergem no mesmo código. Qual está certo?
8. Overflow **sem sinal** é UB? Por quê isso importa para código de segurança?
9. O que `-Wstrict-overflow=5` avisa, e por que é útil?
10. O que `-fno-sanitize-recover=all` faz, e quando você quer isso?
11. Cite três UB que o UBSan **não** pega, e o que pegaria cada um.
12. Por que MSan exige instrumentar a libc inteira? Qual a consequência prática?
13. **Explique aliasing estrito em uma frase.** Por que `char *` é exceção?
14. Por que `memcpy` é definido e o cast de ponteiro não? Qual o custo do `memcpy`?
15. Escreva a condição que checa overflow em `a + b`.
16. O que `-fwrapv` muda? Por que você **não** deve depender dele em código portável?
17. Por que UB é a raiz de vulnerabilidade, e não só de bug?

---

**Próximo:** [Módulo 6 — As sete classes de bug em C](modulo-06.md)
