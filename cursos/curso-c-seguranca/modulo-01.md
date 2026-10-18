# Módulo 1 — C do Zero, com Olhar de Memória

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** saber programar em qualquer linguagem

---

## Objetivos

1. Compilar e executar um programa em C, entendendo cada etapa.
2. Ler erro de **compilação** e distinguir de erro de **linker**.
3. Usar os tipos básicos e saber **quanto cada um ocupa**.
4. Entender que `printf` não é do C — é de biblioteca.
5. Ler os primeiros avisos do compilador e **saber por que ignorá-los é erro**.

---

## 1.1 Compilar é traduzir, em quatro etapas

Um curso de C comum entrega `gcc arquivo.c -o programa` e segue. Você vai entender as etapas,
porque cada uma tem um erro diferente.

```
                    ┌─────────────┐
  programa.c  ─────▶│ PREPROCESSA │  #include, #define resolvidos
                    └──────┬──────┘
                           ▼ programa.i
                    ┌─────────────┐
                    │  COMPILA    │  C → assembly
                    └──────┬──────┘
                           ▼ programa.s
                    ┌─────────────┐
                    │   MONTA     │  assembly → código de máquina
                    └──────┬──────┘
                           ▼ programa.o
                    ┌─────────────┐
                    │   LINKA     │  resolve símbolos, liga bibliotecas
                    └──────┬──────┘
                           ▼
                      programa (executável)
```

⚠ **A etapa que importa para você é a última.** Um **erro de compilação** é sintaxe ou tipo — o
compilador te diz a linha. Um **erro de linker** é símbolo que ninguém definiu — e ele **não** diz a
linha, porque o problema é a ausência.

```bash
mkdir -p ~/c-lab/{src,bin,tmp} && cd ~/c-lab/src

cat > ola.c <<'EOF'
#include <stdio.h>

int main(void) {
    printf("ola, mundo\n");
    return 0;
}
EOF

# Veja cada etapa
gcc -E ola.c -o ../tmp/ola.i     # só preprocessa
gcc -S ola.c -o ../tmp/ola.s     # só compila para assembly
gcc -c ola.c -o ../tmp/ola.o     # só monta (objeto)
gcc ../tmp/ola.o -o ../bin/ola   # só linka

../bin/ola
```

**Inspecione cada artefato:**

```bash
wc -l ../tmp/ola.i          # quantas linhas o preprocessador gerou?
head -20 ../tmp/ola.s       # o assembly (você vai entender isso no curso de assembly)
file ../tmp/ola.o           # objeto relocável
nm ../tmp/ola.o             # símbolos — main está aqui, printf não
file ../bin/ola             # executável ELF
```

⚠ **Note o `nm`:** o objeto tem `main` **definido** e `printf` **indefinido** (vai aparecer com
`U`). É o linker que resolve `printf`, pegando da libc. **É por isso que compilar sem `-lc` às
vezes falha** — e é por isso que erro de `printf` é erro de linker, não de compilação.

**Produza `etapas.md`:**

| Etapa | Comando | Arquivo gerado | O que é |
|---|---|---|---|
| Preprocessar | | | |
| Compilar | | | |
| Montar | | | |
| Linkar | | | |

**Responda:**

1. Quantas linhas tem o `.i` comparado com o `.c`? Por quê?
2. `nm` no `.o` — `main` tem que letra? `printf` tem que letra? O que cada letra significa?
3. O que aconteceria se você tentasse executar o `.o` diretamente?

---

## 1.2 Tipos: o que realmente importa é o tamanho

Um curso comum ensina os nomes. Você precisa dos **tamanhos** — porque todo bug de C nasce de um
tamanho errado.

```bash
cat > tipos.c <<'EOF'
#include <stdio.h>

int main(void) {
    printf("sizeof(char)          = %zu\n", sizeof(char));
    printf("sizeof(short)         = %zu\n", sizeof(short));
    printf("sizeof(int)           = %zu\n", sizeof(int));
    printf("sizeof(long)          = %zu\n", sizeof(long));
    printf("sizeof(long long)     = %zu\n", sizeof(long long));
    printf("sizeof(float)         = %zu\n", sizeof(float));
    printf("sizeof(double)        = %zu\n", sizeof(double));
    printf("sizeof(void *)        = %zu\n", sizeof(void *));
    printf("sizeof(char *)        = %zu\n", sizeof(char *));
    return 0;
}
EOF

gcc -Wall -Wextra -o ../bin/tipos tipos.c && ../bin/tipos
```

| Tipo | Bytes típicos (x86-64) | Faixa |
|---|---|---|
| `char` | 1 | −128 a 127 |
| `short` | 2 | −32.768 a 32.767 |
| `int` | **4** | −2.147.483.648 a 2.147.483.647 |
| `long` | **8** (em Linux x86-64) | muito grande |
| `long long` | 8 | idem |
| `float` | 4 | ponto flutuante |
| `double` | 8 | ponto flutuante |
| **ponteiro** | **8** | endereço |

⚠ **Três armadilhas de tamanho que causam bug real:**

| Armadilha | O que acontece |
|---|---|
| `long` é 8 em Linux x86-64 e **4 em Windows 64** | Código que compila nos dois se comporta diferente |
| `int` é 4 e não é garantido pelo padrão | Em plataforma embarcada pode ser 2 |
| **Ponteiro é 8** | Por isso struct com ponteiro é maior que você espera (módulo 8) |

⚠ **A correção profissional: use os tipos de `<stdint.h>`** — `uint8_t`, `uint16_t`, `uint32_t`,
`uint64_t`, `int32_t`. O tamanho é **garantido** pelo padrão, não pela plataforma.

```bash
cat > tamanhos.c <<'EOF'
#include <stdio.h>
#include <stdint.h>

int main(void) {
    printf("uint8_t  = %zu\n", sizeof(uint8_t));
    printf("uint16_t = %zu\n", sizeof(uint16_t));
    printf("uint32_t = %zu\n", sizeof(uint32_t));
    printf("uint64_t = %zu\n", sizeof(uint64_t));
    return 0;
}
EOF
gcc -Wall -Wextra -o ../bin/tamanhos tamanhos.c && ../bin/tamanhos
```

**Produza `tipos.md`** com a tabela do seu sistema, medida — não copiada.

**Responda:**

1. `sizeof(void *)` deu 8. O que isso significa para o tamanho de uma struct com 3 ponteiros?
2. Por que `%zu` e não `%d` para `sizeof`? O que acontece se você usar `%d`?
3. Em qual situação `uint32_t` e `unsigned int` seriam tamanhos diferentes?

---

## 1.3 `printf` é de biblioteca, não do C

⚠ **A distinção que muda como você lê erro de linker.**

A linguagem C tem: tipos, operadores, controle de fluxo, função. Ela **não** tem `printf`, `malloc`,
nem `strcpy` — todos são da **libc** (biblioteca padrão), e o `#include <stdio.h>` só traz a
**declaração**.

```bash
# Esqueça o include: o compilador avisa, mas compila
cat > sem_include.c <<'EOF'
int main(void) {
    printf("sem include\n");     /* ⚠ declaração implícita */
    return 0;
}
EOF

gcc -o ../bin/sem_include sem_include.c 2>&1 | head -8
echo "--- código de saída: $? ---"
```

⚠ **Compiladores modernos tratam isso como erro** (a declaração implícita foi removida no C99, e
`clang` recusa por padrão). Onde ainda compila, é **comportamento indefinido**, e o resultado
depende da sorte.

**E aqui está a demonstração de por que erro de linker não diz a linha:**

```bash
cat > sem_main.c <<'EOF'
#include <stdio.h>

void funcao_que_nao_e_main(void) {
    printf("oi\n");
}
EOF

gcc -o ../bin/sem_main sem_main.c 2>&1 | head -8
```

```
/usr/bin/ld: ... undefined reference to `main'
collect2: error: ld returned 1 exit status
```

⚠ **Note que o linker não fala em linha.** Ele fala em **símbolo ausente**. É a diferença
conceitual entre compilar (traduzir um arquivo) e linkar (juntar vários, resolvendo referência
cruzada).

**Produza `linker.md`:**

| Erro | Etapa | Diz a linha? | O que significa |
|---|---|---|---|
| Faltou `;` | | | |
| Faltou `#include` | | | |
| Faltou `main` | | | |
| Tipo incompatível | | | |

**Responda:**

1. Por que o linker não consegue dizer a linha?
2. Se você tem dois arquivos `.c` e um chama função do outro, em qual etapa o erro aparece se o
   nome estiver escrito errado?
3. `printf` está em qual biblioteca? Como o linker sabe onde buscar?

---

## 1.4 Função — e a diferença entre `main` e as outras

```bash
cat > funcao.c <<'EOF'
#include <stdio.h>

/* a função recebe dois int e devolve um int */
int soma(int a, int b) {
    return a + b;
}

/* void = não devolve nada */
void saudacao(const char *nome) {
    printf("ola, %s\n", nome);
}

int main(void) {
    int resultado = soma(3, 4);
    printf("soma = %d\n", resultado);

    saudacao("mundo");
    saudacao("de novo");

    return 0;
}
EOF

gcc -Wall -Wextra -o ../bin/funcao funcao.c && ../bin/funcao
echo "código de saída: $?"
```

⚠ **O `return 0` do `main` é o código de saída do programa.** `0` é sucesso; qualquer outro valor
é falha. Isso importa para script, e desde o módulo 1 você trata isso com seriedade — é o mesmo
princípio do curso de bash.

```bash
# Confirme
../bin/funcao; echo "código: $?"

# Mude para return 1 e veja a diferença
sed 's/return 0;/return 1;/' funcao.c > funcao_erro.c
gcc -Wall -Wextra -o ../bin/funcao_erro funcao_erro.c && ../bin/funcao_erro
echo "código: $?"
```

⚠ **`void` como parâmetro tem significado.** `int main(void)` diz "não recebe argumento". `int
main()` diz "número de argumentos não especificado" — herança antiga do C. **Use `(void)`.**
`-Wstrict-prototypes` avisa sobre isso.

```bash
# Teste a diferença
cat > prototipo.c <<'EOF'
#include <stdio.h>

void sem_void() { printf("sem void\n"); }
void com_void(void) { printf("com void\n"); }

int main(void) {
    sem_void();
    sem_void(1, 2, 3);      /* ⚠ compila! e está errado */
    com_void();
    /* com_void(1); */      /* ← descomente: o compilador recusa */
    return 0;
}
EOF

gcc -Wall -Wextra -Wstrict-prototypes -o ../bin/prototipo prototipo.c 2>&1 | head -6
../bin/prototipo
```

**Produza `funcao.md`:**

| Pergunta | Sua resposta |
|---|---|
| Diferença entre `main(void)` e `main()`? | |
| O que `sem_void(1,2,3)` fez? Por quê? | |
| O que `return 0` significa para o shell? | |
| O que um protótipo (`int soma(int, int);`) faz? | |

---

## 1.5 Os avisos do compilador — e por que ignorar é erro

⚠ **Esta seção é a mais importante do módulo.** Em C, o compilador sabe de coisas que você não
sabe, e ele **avisa** — mas compila mesmo assim.

```bash
cat > avisos.c <<'EOF'
#include <stdio.h>

int main(void) {
    int numero = 42;
    printf("numero = %d\n", numero);

    /* ⚠ vários avisos deliberados */
    int nao_usado = 7;                      /* unused variable      */
    int outro;                              /* uninitialized        */
    printf("outro = %d\n", outro);

    printf("comparacao: %d\n", numero = 5); /* assignment in cond   */
    printf("formato errado: %f\n", numero); /* %f com int           */

    return 0;
}
EOF

echo "═══ COM avisos (sempre) ═══"
gcc -Wall -Wextra -o ../bin/avisos avisos.c 2>&1 | head -20

echo
echo "═══ Executando mesmo assim ═══"
../bin/avisos
```

⚠ **A saída de `outro` é lixo.** Variável local não inicializada contém o que estava na pilha. É
**comportamento indefinido** — o módulo 5 aprofunda, mas desde agora você vê o efeito.

⚠ **E `%f` com `int` é UB de verdade.** `printf` lê o argumento como `double` onde tem `int` — e
lê o registrador errado. Em x86-64 isso é ainda mais visível, porque `int` vai em registrador
inteiro e `double` vai em `xmm`. O resultado é lixo.

```bash
# Compare: o mesmo código com gcc e clang
echo "═══ gcc ═══"
gcc -Wall -Wextra -o ../bin/av_gcc avisos.c 2>&1 | grep -c warning

echo "═══ clang (mais rigoroso) ═══"
clang -Wall -Wextra -o ../bin/av_clang avisos.c 2>&1 | head -12
```

⚠ **Note que `clang` avisa de coisas que o `gcc` deixa passar** — e vice-versa. **Compile o mesmo
código com os dois.** É a primeira aparição de um tema que percorre o curso: **o compilador é parte
do problema e parte da solução.**

⚠ **A flag `-Werror` transforma aviso em erro.** Em módulo 10 você vai usá-la.

```bash
echo "═══ Com -Werror ═══"
gcc -Wall -Wextra -Werror -o ../bin/av_err avisos.c 2>&1 | head -6
```

**Produza `avisos.md`:**

| Aviso | O que significa | É bug? |
|---|---|---|
| `unused variable` | | |
| `uninitialized` | | |
| `assignment in condition` | | |
| `format %f expects double` | | |

**Responda:**

1. Quantos avisos o `gcc` deu? Quantos o `clang`?
2. O programa **compilou** com todos os avisos. Por que o compilador não recusou?
3. `outro` imprimiu lixo. Por que o compilador não inicializou com zero?
4. **Qual aviso é mais grave** no seu caso, e por quê?

⚠ **A resposta 3 é a que surpreende quem vem de outra linguagem.** C **não** inicializa variável
local automaticamente — porque isso custaria tempo em código de sistema. **Você inicializa, ou
convive com o lixo.**

---

## 1.6 LAB — Primeiro programa com olhar de memória

**Duração:** 120 min

### Passo 1 — Escreva e compile (30 min)

```bash
cd ~/c-lab/src

cat > lab1.c <<'EOF'
#include <stdio.h>
#include <stdint.h>

/* devolve o dobro */
int32_t dobro(int32_t x) {
    return x * 2;
}

/* imprime uma linha de separação */
void separador(void) {
    printf("----------------------------------------\n");
}

int main(void) {
    separador();
    printf("C para pesquisa de seguranca\n");
    separador();

    int32_t n = 21;
    printf("dobro de %d = %d\n", n, dobro(n));

    printf("\ntamanhos:\n");
    printf("  int32_t  = %zu byte(s)\n", sizeof(int32_t));
    printf("  int64_t  = %zu byte(s)\n", sizeof(int64_t));
    printf("  ponteiro = %zu byte(s)\n", sizeof(void *));

    return 0;
}
EOF

gcc -Wall -Wextra -Wstrict-prototypes -g -O0 -o ../bin/lab1 lab1.c
../bin/lab1
echo "código de saída: $?"
```

### Passo 2 — Documente as etapas (30 min)

```bash
# Refaça as quatro etapas, com este arquivo
gcc -E lab1.c -o ../tmp/lab1.i
gcc -S lab1.c -o ../tmp/lab1.s
gcc -c lab1.c -o ../tmp/lab1.o
gcc ../tmp/lab1.o -o ../bin/lab1_linkado

ls -la ../tmp/lab1.* ../bin/lab1_linkado

# Símbolos
echo "═══ Símbolos do objeto ═══"
nm ../tmp/lab1.o

echo
echo "═══ Símbolos do executável (só os definidos) ═══"
nm ../bin/lab1_linkado | grep ' T ' | head -10
```

Produza `lab1-etapas.md`:

| Arquivo | Tamanho | O que é |
|---|---|---|
| `lab1.i` | | |
| `lab1.s` | | |
| `lab1.o` | | |
| `lab1_linkado` | | |

**Responda:**

1. `nm` no `.o`: quais símbolos estão **definidos** (letra `T`) e quais **indefinidos** (letra `U`)?
2. No executável linkado, `printf` ainda aparece como `U`? Por quê?
3. O `.s` tem quantas linhas? Compare com o `.c` — o que o compilador adicionou?
4. Do `.o` ao executável, o tamanho aumentou quanto? Por quê?

### Passo 3 — Provocar os avisos (35 min)

```bash
cd ~/c-lab/src

cat > lab1-avisos.c <<'EOF'
#include <stdio.h>
#include <stdint.h>

int32_t dobro(int32_t x) {
    int64_t nao_usado = 999;        /* ⚠ unused */
    return x * 2;
}

int main(void) {
    int32_t n = 10;

    /* ⚠ %d com int64_t: tamanho mismatch */
    printf("n = %d\n", n);

    /* ⚠ atribuição em vez de comparação */
    if (n = 5) {
        printf("n virou 5\n");
    }

    /* ⚠ variável não inicializada */
    int32_t lixo;
    printf("lixo = %d\n", lixo);

    /* ⚠ retorno ignorado de função que deveria ser usada */
    dobro(n);

    return 0;
}
EOF

echo "═══ gcc ═══"
gcc -Wall -Wextra -o ../bin/lab1_av_gcc lab1-avisos.c 2>&1 | head -15
echo
echo "═══ clang ═══"
clang -Wall -Wextra -o ../bin/lab1_av_clang lab1-avisos.c 2>&1 | head -15
echo
echo "═══ executando ═══"
../bin/lab1_av_gcc
echo "código: $?"
```

Produza `lab1-diagnostico.md`:

| Linha | Problema | Aviso do gcc? | Aviso do clang? | É UB? |
|---|---|---|---|---|
| | | | | |

**Responda:**

1. Qual aviso só o `clang` deu?
2. `lixo` imprimiu o quê? **Rode três vezes** — o valor é o mesmo?
3. `if (n = 5)` fez o quê? Por que o compilador avisa mas compila?
4. **Dos quatro problemas, quais são UB e quais são só "código ruim"?**

⚠ **A resposta 2 é o ponto.** Rode o programa **três vezes** e compare o valor de `lixo`. Se mudar,
você acabou de ver comportamento indefinido com os próprios olhos — e é a porta do módulo 5.

⚠ **A resposta 4 é a distinção mais importante do curso em formação.** "Código ruim" é código que
funciona de forma previsível mas está mal escrito. **UB é código cujo resultado o padrão não
garante** — e o módulo 5 mostra o compilador fazendo coisas com ele.

### Passo 4 — Escreva o Makefile (25 min)

⚠ **Você vai usar `make` o curso inteiro.** Escreva o seu agora.

```bash
cd ~/c-lab

cat > Makefile <<'EOF'
# Makefile do laboratório de C
CC      ?= gcc
CFLAGS   = -g -O0 -Wall -Wextra -Wstrict-prototypes -std=c17
SANFLAGS = -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer -std=c17

SRC = src
BIN = bin

# alvos — cada um é um programa
ALVOS = $(BIN)/lab1

all: $(ALVOS)

$(BIN)/%: $(SRC)/%.c
	@mkdir -p $(BIN)
	$(CC) $(CFLAGS) -o $@ $<

# versão instrumentada de qualquer alvo:  make san ALVO=lab1
san:
	@mkdir -p $(BIN)
	$(CC) $(SANFLAGS) -o $(BIN)/$(ALVO)_asan $(SRC)/$(ALVO).c

clean:
	rm -f $(BIN)/* $(BIN)/*.asan tmp/*

.PHONY: all san clean
EOF

make            # compila tudo
make san ALVO=lab1   # compila instrumentado
ls -la bin/

make clean
```

Produza `makefile.md`:

| Comando | O que faz |
|---|---|
| `make` | |
| `make san ALVO=lab1` | |
| `make clean` | |

**Responda:**

1. O que `$@` e `$<` significam no Makefile?
2. Por que `@mkdir -p` tem `@` na frente?
3. Se você editar o `lab1.c`, `make` recompila? **Teste.**
4. Por que separar `CFLAGS` de `SANFLAGS`?

### Critérios de aceitação

- `etapas.md` com as quatro etapas e os arquivos gerados.
- Você identificou **`T` e `U`** no `nm` e explicou a diferença entre compilar e linkar.
- `tipos.md` com a tabela **medida** no seu sistema.
- `funcao.md` com as quatro respostas, incluindo o `sem_void(1,2,3)` que compila.
- `avisos.md` com os quatro avisos e a identificação de qual é **UB**.
- `lab1.c` compilando **sem aviso** com `-Wall -Wextra -Wstrict-prototypes`.
- Você rodou `lixo` **três vezes** e comparou — a observação está registrada.
- `Makefile` funcionando com `make`, `make san` e `make clean`.

---

## Avaliação

1. Descreva as quatro etapas da compilação e o que cada uma produz.
2. Qual a diferença entre erro de compilação e erro de linker? Qual diz a linha, e por quê?
3. `nm` mostra `T` e `U`. O que cada letra significa?
4. Por que `long` pode ter tamanho diferente entre Linux e Windows? O que usar em vez disso?
5. Por que usar `uint32_t` em vez de `unsigned int`?
6. `printf` é do C ou da libc? O que o `#include` faz, então?
7. Qual a diferença entre `int main(void)` e `int main()`? Por que preferir `(void)`?
8. Por que `sem_void(1,2,3)` **compila** e está errado?
9. Por que variável local não inicializada contém lixo, e não zero?
10. Por que `%f` com `int` é comportamento indefinido?
11. O que `-Werror` faz, e por que você usaria?
12. Por que compilar o mesmo código com `gcc` **e** `clang`?
13. O que `return 0` significa para o shell, e por que isso importa?

---

**Próximo:** [Módulo 2 — Ponteiro, array e o modelo de memória](modulo-02.md)
