# Módulo 7 — Sanitizer, `gdb`, `valgrind`

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Compilar com `ASan`, `UBSan`, `MSan` e saber quando cada um serve.
2. **Ler** o relatório do sanitizer campo por campo.
3. Depurar com `gdb` de forma dirigida — não por tentativa.
4. Usar `valgrind` para o que o ASan não pega.
5. Montar o pipeline de detecção: compilador + sanitizer + `valgrind`.

---

## ⚠ Sanitizer e `valgrind` não convivem

⚠ **A regra prática:** ASan **substitui** o alocador e adiciona redzone; o `valgrind` **emula** o
processador e intercepta tudo. **Os dois juntos não funcionam** — e o resultado é confuso ou não
roda.

| Situação | Ferramenta |
|---|---|
| Desenvolvimento normal | **ASan + UBSan** |
| Bug que o ASan não pega | `valgrind` |
| Código sem recompilação possível | `valgrind` |
| `-O2` (produção) | `valgrind` — ASan muda o layout |
| Vazamento em código legado | `valgrind --leak-check=full` |

⚠ **A ordem:** primeiro ASan (rápido, aponta a linha). Se ele não pegar, `valgrind` (lento, mais
profundo).

---

## 7.1 Os sanitizers, um por um

```bash
cd ~/c-lab/src

cat > san.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

int main(int argc, char **argv) {
    int caso = (argc > 1) ? atoi(argv[1]) : 0;

    switch (caso) {
    case 1: {                                   /* heap overflow */
        char *p = malloc(4);
        if (!p) return 1;
        memcpy(p, "muito maior que quatro", 21);
        free(p);
        break;
    }
    case 2: {                                   /* stack overflow */
        char b[4];
        strcpy(b, "transborda");
        printf("%s\n", b);
        break;
    }
    case 3: {                                   /* use-after-free */
        char *p = malloc(8);
        if (!p) return 1;
        free(p);
        printf("%s\n", p);
        break;
    }
    case 4: {                                   /* integer overflow (com sinal) */
        volatile int a = INT_MAX;
        volatile int b = 1;
        printf("%d\n", a + b);
        break;
    }
    case 5: {                                   /* vazamento */
        for (int i = 0; i < 10; i++) {
            char *p = malloc(100);
            if (p) p[0] = 'x';
        }
        break;
    }
    case 6: {                                   /* variável não inicializada */
        int x;
        printf("%d\n", x);
        break;
    }
    case 7: {                                   /* double free */
        char *p = malloc(8);
        if (!p) return 1;
        free(p); free(p);
        break;
    }
    default:
        printf("uso: %s <1-7>\n", argv[0]);
    }
    return 0;
}
EOF

echo "═══ compilando as versões ═══"
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer -o ../bin/san_asan san.c && echo "  ASan+UBSan ✓"
clang -g -O1 -fsanitize=undefined -fno-sanitize-recover=all -o ../bin/san_ubsan san.c && echo "  UBSan ✓"
gcc   -g -O0 -o ../bin/san_plain san.c && echo "  plain ✓ (para valgrind)"
```

**Tabela de cobertura por caso:**

```bash
echo
printf '%-6s %-18s %-18s %-18s\n' "CASO" "ASan+UBSan" "UBSan só" "valgrind"
printf '%-6s %-18s %-18s %-18s\n' "────" "──────────" "────────" "────────"

for c in 1 2 3 4 5 6 7; do

    # ASan+UBSan
    out=$(timeout 15 ../bin/san_asan "$c" 2>&1)
    if printf '%s' "$out" | grep -q 'ERROR: AddressSanitizer'; then a="ASan: $(printf '%s' "$out" | grep -oE 'AddressSanitizer: [a-z-]+' | head -1 | cut -d' ' -f2)"
    elif printf '%s' "$out" | grep -q 'runtime error'; then a="UBSan"
    elif printf '%s' "$out" | grep -q 'LeakSanitizer'; then a="LeakSan"
    else a="—"; fi

    # UBSan só
    out=$(timeout 15 ../bin/san_ubsan "$c" 2>&1); rc=$?
    if printf '%s' "$out" | grep -q 'runtime error'; then u="UBSan"
    else u="—"; fi

    # valgrind (só nos casos que não são UB de aritmética)
    if command -v valgrind >/dev/null 2>&1; then
        out=$(timeout 40 valgrind -q --error-exitcode=99 ../bin/san_plain "$c" 2>&1)
        if printf '%s' "$out" | grep -q 'Invalid write'; then v="Invalid write"
        elif printf '%s' "$out" | grep -q 'Invalid read'; then v="Invalid read"
        elif printf '%s' "$out" | grep -q 'definitely lost'; then v="leak"
        elif printf '%s' "$out" | grep -q 'Invalid free'; then v="Invalid free"
        else v="—"; fi
    else
        v="(não instalado)"
    fi

    printf '%-6s %-18s %-18s %-18s\n' "$c" "$a" "$u" "$v"
done
```

Produza `cobertura.md`:

| Caso | Bug | ASan+UBSan | UBSan só | `valgrind` |
|---|---|---|---|---|
| 1 | heap overflow | | | |
| 2 | stack overflow | | | |
| 3 | UAF | | | |
| 4 | integer (sinal) | | | |
| 5 | vazamento | | | |
| 6 | não inicializada | | | |
| 7 | `double free` | | | |

**Responda:**

1. **Qual caso o ASan+UBSan pegou e o `valgrind` não?**
2. Qual caso o `valgrind` pegou e o ASan não?
3. **Qual caso nenhum dos três pegou?** Por quê?
4. Se você tivesse que escolher **uma** ferramenta, qual e por quê?

⚠ **A resposta 3 é a lição.** Variável não inicializada (caso 6) exige **MSan** — que precisa
instrumentar a libc inteira. **É por isso que essa classe continua sendo bug difícil**, e é por isso
que o módulo 5 listou UB que o UBSan não pega.

---

## 7.2 Lendo o relatório do ASan

⚠ **O relatório é a peça que você vai ler centenas de vezes.**

```bash
echo "═══ relatório do heap overflow (caso 1) ═══"
../bin/san_asan 1 2>&1 | tee ../tmp/asan-heap.txt

echo
echo "═══ relatório do UAF (caso 3) ═══"
../bin/san_asan 3 2>&1 | tee ../tmp/asan-uaf.txt
```

### Anatomia — campo por campo

```
=================================================================            ← início
==12345==ERROR: AddressSanitizer: heap-buffer-overflow on address          ← TIPO
0x6020000000f1 at pc 0x... bp 0x... sp 0x...
WRITE of size 21 at 0x6020000000f1 thread T0                              ← ACESSO
    #0 0x... in main /home/.../san.c:18:9                                 ← ONDE
    #1 0x... in __libc_start_main
                                                                          ← separador
0x6020000000f1 is located 0 bytes to the right of 4-byte region           ← O ALVO
[0x6020000000b0,0x6020000000b4) allocated by thread T0 here:              ← QUEM ALOCou
    #0 0x... in malloc
    #1 0x... in main /home/.../san.c:17:18                                ← linha do malloc
```

| Campo | Significado | O que fazer |
|---|---|---|
| **Tipo** | `heap-buffer-overflow`, `stack-buffer-overflow`, `heap-use-after-free`, `double-free`, `SEGV` | Define a classe (módulo 6) |
| **`WRITE` / `READ`** | Acesso de escrita ou leitura | **Escrita é mais grave** |
| **`of size N`** | Quantos bytes | N grande = mais grave |
| **`#0 ... san.c:18`** | **A linha que acessou** | Onde investigar |
| **`#1 ...`** | Como chegou ali | Contexto |
| **`N bytes to the right of M-byte region`** | Quanto passou, e do que | Diz a severidade |
| **`allocated by ... san.c:17`** | **Onde o bloco nasceu** | **A linha do bug real** |

⚠ **A leitura que mais importa: comparar `#0` com `allocated by`.** `#0` é onde o acesso ilegal
aconteceu; `allocated by` é onde o bloco foi criado. **O bug real está entre as duas** — tipicamente
na ausência de verificação antes do `memcpy`.

### E o relatório do UAF tem três cadeias

```
ERROR: AddressSanitizer: heap-use-after-free on address 0x...
READ of size 8 at 0x... thread T0
    #0 ... in main /home/.../san.c:31:12              ← onde foi USADO

0x... is located 0 bytes inside of 8-byte region
    [0x..., 0x...) freed by thread T0 here:           ← ⚠ "freed by"
    #0 free
    #1 ... in main /home/.../san.c:30:9               ← onde foi LIBERADO
previously allocated by thread T0 here:               ← ⚠ "previously allocated"
    #1 ... in main /home/.../san.c:28:18              ← onde foi ALOCADO
```

⚠ **A causa está na relação entre as três.** Alocou na linha 28, liberou na 30, usou na 31. **O bug
é o contrato de posse** — não a linha 31.

**Produza `asan.md`:**

| Campo | Caso 1 (heap) | Caso 3 (UAF) |
|---|---|---|
| Tipo | | |
| `WRITE`/`READ` | | |
| Tamanho | | |
| `#0` | | |
| `#1` | | |
| Alocado em | | |
| Liberado em | | (não aplica) |

**Responda:**

1. No caso 1, `#0` e `allocated by` apontam **a mesma linha**? Por quê?
2. No caso 3, **quantas cadeias** o relatório tem? Nomeie cada uma.
3. **Onde está o bug real** no caso 3 — na linha 28, 30 ou 31?
4. Qual a diferença de severidade entre `WRITE of size 21` e `READ of size 1`?

---

## 7.3 `gdb` dirigido

⚠ **o `gdb` responde a pergunta que o ASan **não** responde:** *com que valores?*.

```bash
cd ~/c-lab/src

cat > gdb-alvo.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char   nome[16];
    size_t tamanho;
    int    ativo;
} Item;

Item *criar(const char *nome) {
    Item *it = calloc(1, sizeof(Item));
    if (!it) return NULL;

    size_t n = strlen(nome);
    printf("[debug] nome='%s'  n=%zu  sizeof(Item)=%zu\n",
           nome, n, sizeof(Item));

    /* ⚠ BUG: sem verificação de limite */
    memcpy(it->nome, nome, n);

    it->tamanho = n;
    it->ativo   = 1;
    return it;
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    Item *it = criar(argv[1]);
    if (!it) return 1;

    printf("criado: nome='%s' tamanho=%zu ativo=%d\n",
           it->nome, it->tamanho, it->ativo);

    free(it);
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/gdb-alvo gdb-alvo.c
clang -g -O1 -fsanitize=address -o ../bin/gdb-alvo-asan gdb-alvo.c
```

### Método em cinco passos

```bash
ENTRADA=$(python3 -c "print('A'*30)")

echo "═══ PASSO 1: onde o ASan aponta ═══"
../bin/gdb-alvo-asan "$ENTRADA" 2>&1 | grep -E '#0 |of size|is located' | head -4

echo
echo "═══ PASSO 2: valores no momento do bug ═══"
LINHA=$(../bin/gdb-alvo-asan "$ENTRADA" 2>&1 | grep -oP '#0 .*?:\K\d+' | head -1)
echo "  linha do bug: ${LINHA}"

gdb -q -batch \
    -ex 'set pagination off' \
    -ex "break gdb-alvo.c:${LINHA}" \
    -ex "run ${ENTRADA}" \
    -ex 'info locals' \
    -ex 'info args' \
    -ex 'print n' \
    -ex 'print sizeof(it->nome)' \
    -ex 'print n - sizeof(it->nome)' \
    --args ../bin/gdb-alvo "$ENTRADA" 2>&1 | tail -20

echo
echo "═══ PASSO 3: a estrutura ═══"
gdb -q -batch \
    -ex 'set pagination off' \
    -ex 'break gdb-alvo.c:14' \
    -ex "run ${ENTRADA}" \
    -ex 'print *it' \
    -ex 'print &it->nome' \
    -ex 'print &it->tamanho' \
    -ex 'print &it->ativo' \
    --args ../bin/gdb-alvo "$ENTRADA" 2>&1 | tail -14
```

⚠ **`info locals` e `info args` são o coração do passo 2.** Eles dizem **o valor** de cada variável
no momento do bug — que é o que o ASan não dá.

⚠ **O passo 3 calcula os offsets.** `&it->nome`, `&it->tamanho`, `&it->ativo` — subtraia para ver o
layout real da struct, que é o módulo 8.

**Produza `gdb.md`:**

| Passo | Comando | O que respondeu |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

**Responda:**

1. **Qual o valor de `n` e de `sizeof(it->nome)`?** Qual a diferença?
2. A verificação que falta é qual comparação? Escreva.
3. Os offsets de `nome`, `tamanho` e `ativo` — qual o layout real?
4. `sizeof(Item)` é igual à soma dos campos? Por quê?

---

## 7.4 `valgrind` — para o que o ASan não pega

⚠ **O `valgrind` não precisa recompilar** — ele instrumenta o binário. Isso o torna útil para
código legado, build de produção, ou quando você não controla as flags.

```bash
echo "═══ vazamento (caso 5) ═══"
valgrind --leak-check=full --show-leak-kinds=all -q ../bin/san_plain 5 2>&1 | head -20

echo
echo "═══ heap overflow (caso 1) ═══"
valgrind -q --error-exitcode=99 ../bin/san_plain 1 2>&1 | head -20

echo
echo "═══ double free (caso 7) ═══"
valgrind -q ../bin/san_plain 7 2>&1 | head -14
```

### As opções que importam

| Opção | O que faz |
|---|---|
| `--leak-check=full` | Relatório completo de vazamento |
| `--show-leak-kinds=all` | Inclui "still reachable" e "indirect" |
| `--track-origins=yes` | **Rastreia de onde veio o valor não inicializado** |
| `-q` | Só erros, sem cabeçalho |
| `--error-exitcode=99` | Código de saída 99 se achar erro — **para CI** |
| `--tool=helgrind` | Race condition (multithread) |
| `--tool=drd` | Alternativa para race condition |

⚠ **`--track-origins=yes` é a opção mais valiosa e a mais lenta.** Ela responde "de onde veio este
valor não inicializado" — a pergunta que **só ela** responde.

```bash
echo "═══ rastreando origem de valor não inicializado (caso 6) ═══"
valgrind -q --track-origins=yes ../bin/san_plain 6 2>&1 | head -18
```

⚠ **Se o `valgrind` reportar "Conditional jump depends on uninitialised value", com
`--track-origins=yes` ele mostra a linha onde o valor nasceu.** É o antídoto do caso 6 — que o ASan
e o UBSan não pegam.

⚠ **O custo:** `valgrind` é **10 a 50× mais lento**. Some a isso `--track-origins=yes`, e você tem
o modo mais lento que existe. **Use para investigar, não para rodar em CI diário.**

**Produza `valgrind.md`:**

| Caso | O `valgrind` reportou | Mensagem |
|---|---|---|
| 1 heap | | |
| 5 vazamento | | |
| 6 não inicializada | | |
| 7 `double free` | | |

**Responda:**

1. Qual caso o `valgrind` pegou e o ASan **não**? Mostre as duas saídas.
2. Quantos tipos de vazamento o `valgrind` distingue? Quais?
3. O que `--track-origins=yes` acrescentou no caso 6?
4. **Por que `valgrind` é útil mesmo quando o ASan existe?**

---

## 7.5 O pipeline de detecção

⚠ **As três camadas, em ordem.**

```
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 1 — COMPILADOR                                       │
│   clang -Wall -Wextra -Wformat=2 -Wstrict-overflow=5 \      │
│         -Wconversion -Werror                                │
│   → pega: formato errado, tipo errado, conversão com perda  │
│   → custo: zero (só compilar)                               │
├─────────────────────────────────────────────────────────────┤
│ CAMADA 2 — SANITIZER                                        │
│   -fsanitize=address,undefined -fno-omit-frame-pointer      │
│   → pega: overflow, UAF, integer com sinal, off-by-one      │
│   → custo: ~2× mais lento                                   │
├─────────────────────────────────────────────────────────────┤
│ CAMADA 3 — VALGRIND                                         │
│   valgrind --leak-check=full --track-origins=yes            │
│   → pega: vazamento, não inicializada, o que escapou        │
│   → custo: 10–50× mais lento — só quando investigar         │
└─────────────────────────────────────────────────────────────┘
```

```bash
cd ~/c-lab

cat > Makefile.seguro <<'EOF'
# Makefile com o pipeline de detecção
CC        = clang
BASE      = -std=c17 -g -Wall -Wextra -Wformat=2 -Wstrict-prototypes \
            -Wshadow -Wconversion -Wsign-conversion
CAMADA1   = $(BASE) -Werror -O2
CAMADA2   = $(BASE) -O1 -fsanitize=address,undefined -fno-omit-frame-pointer
CAMADA3   = $(BASE) -O0

SRC = src
BIN = bin

all: check

# Camada 1: compilação estrita
check:
	@echo "═══ CAMADA 1: compilação estrita ═══"
	@for f in $(SRC)/*.c; do \
	    [ -f "$$f" ] || continue; \
	    case "$$f" in *alvo*|*ub*|*lab5*|*lab6*) continue;; esac; \
	    echo "  $$f"; \
	    $(CC) $(CAMADA1) -c -o /dev/null "$$f" || exit 1; \
	done
	@echo "  ✓ todos passaram"

# Camada 2: sanitizer
san:
	@mkdir -p $(BIN)
	$(CC) $(CAMADA2) -o $(BIN)/$(ALVO)_san $(SRC)/$(ALVO).c

# Camada 3: valgrind
val: 
	@mkdir -p $(BIN)
	$(CC) $(CAMADA3) -o $(BIN)/$(ALVO)_vg $(SRC)/$(ALVO).c
	valgrind -q --leak-check=full --track-origins=yes \
	         --error-exitcode=99 $(BIN)/$(ALVO)_vg $(ARGS)

# Camada 3 automatizada para CI
val-all:
	@for f in $(SRC)/*.c; do \
	    [ -f "$$f" ] || continue; \
	    base=$$(basename "$$f" .c); \
	    case "$$base" in *alvo*|*ub*|*lab5*|*lab6*) continue;; esac; \
	    echo "── $$base ──"; \
	    $(CC) $(CAMADA3) -o $(BIN)/$$base $(SRC)/"$$f" 2>/dev/null || continue; \
	    valgrind -q --leak-check=full --error-exitcode=99 $(BIN)/$$base >/dev/null 2>&1 \
	      && echo "    ✓ sem erro" || echo "    ⚠ ERRO detectado"; \
	done

.PHONY: all check san val val-all
EOF

make -f Makefile.seguro check 2>&1 | head -20
```

⚠ **Note as exclusões no `check`.** Os arquivos `alvo`, `ub`, `lab5` e `lab6` **contêm bug
deliberado** — e o `-Werror` recusaria. **O pipeline roda no seu código, não nos alvos.**

⚠ **E note `--error-exitcode=99` no `val-all`.** Ele faz o `valgrind` **falhar o build** quando
acha erro — que é o que permite rodá-lo em CI.

**Produza `pipeline.md`:**

| Camada | Flags | Pega o quê | Custo |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. Quantos dos seus arquivos passaram pela **camada 1** sem aviso?
2. Qual arquivo **falhou** e por quê?
3. Por que os alvos com bug ficam **fora** do `-Werror`?
4. **Por que `--error-exitcode` é essencial** para rodar em CI?

---

## 7.6 LAB — Pipeline nos seus arquivos

**Duração:** 120 min

### Passo 1 — Rode o pipeline completo (45 min)

```bash
cd ~/c-lab

# Camada 1
make -f Makefile.seguro check 2>&1 | tail -30 > ../tmp/pipeline-camada1.txt
cat ../tmp/pipeline-camada1.txt

# Camada 2 — nos alvos do curso, onde deve DETECTAR
echo
echo "═══ camada 2 nos alvos (deve detectar) ═══"
for a in lab6-alvo lab5 san c7_offbyone; do
    [ -f "src/${a}.c" ] || continue
    clang -g -O1 -fsanitize=address,undefined \
          -o "bin/${a}_chk" "src/${a}.c" 2>/dev/null || continue
    printf '  %-16s ' "${a}"
    out=$(timeout 15 "./bin/${a}_chk" x 2>&1)
    if printf '%s' "$out" | grep -q 'AddressSanitizer\|runtime error'; then
        printf '%s' "$out" | grep -oE 'AddressSanitizer: [a-z-]+|runtime error:.*' | head -1
    else
        echo "(sem detecção com esta entrada)"
    fi
done
```

Produza `pipeline-resultado.md`:

| Camada | Arquivos processados | Passou | Falhou | Diagnóstico |
|---|---|---|---|---|
| 1 — compilador | | | | |
| 2 — sanitizer | | | | |
| 3 — `valgrind` | | | | |

**Responda:**

1. **Quantos arquivos seus a camada 1 recusou?** Liste os avisos.
2. Os alvos com bug foram detectados pela camada 2? **Com qual entrada?**
3. **Algum arquivo passou nas três camadas** e você desconfia que ainda tem bug? Qual?
4. Qual camada pegou mais?

### Passo 2 — Ache o motivo de um aviso (35 min)

⚠ **Pegue um aviso da camada 1 e investigue até a causa.**

```bash
cd ~/c-lab/src

# Escolha um arquivo que deu aviso
for f in *.c; do
    avisos=$(clang -Wall -Wextra -Wformat=2 -Wconversion -c -o /dev/null "$f" 2>&1 | grep -c warning)
    [ "${avisos}" -gt 0 ] && printf '  %-24s %s aviso(s)\n' "$f" "${avisos}"
done | sort -k2 -rn | head -6

echo
echo "═══ escolha o arquivo com mais avisos e investigue ═══"
ARQ="${ARQ:-lab6-alvo.c}"
echo "  investigando: ${ARQ}"
clang -Wall -Wextra -Wformat=2 -Wconversion -c -o /dev/null "${ARQ}" 2>&1 | head -12
```

Produza `investigacao.md`:

```markdown
## Aviso investigado
Arquivo: ______
Linha: ______
Mensagem: ______

## O que o compilador está dizendo
(traduza o aviso em linguagem sua)

## Por que isso é (ou não é) bug
(você concorda com o compilador?)

## A correção
(código)

## Testei que a correção
[ ] mata o aviso
[ ] mantém o comportamento correto
[ ] não introduz novo aviso
```

**Responda:**

1. **Você concordou** com o compilador, ou é falso positivo? Justifique.
2. Depois da correção, **quantos avisos sobraram** naquele arquivo?
3. A correção mudou o comportamento? **Teste.**
4. **Por que nem todo aviso é bug** — e por que corrigir todos ainda vale?

### Passo 3 — `valgrind` no que escapou (40 min)

```bash
cd ~/c-lab

# Rode valgrind em todo o código "limpo"
echo "═══ valgrind por arquivo ═══"
for f in src/*.c; do
    base=$(basename "$f" .c)
    case "$base" in *alvo*|*ub*|*lab5*|*lab6*|*san*|*e1_*|*e2_*|*e3_*|*e4_*) continue;; esac
    gcc -g -O0 -o "bin/${base}_vg" "$f" 2>/dev/null || continue
    printf '  %-20s ' "${base}"
    out=$(timeout 60 valgrind -q --leak-check=full --track-origins=yes \
              "./bin/${base}_vg" 2>&1)
    if printf '%s' "$out" | grep -qE 'Invalid|definitely lost|uninitialised'; then
        printf '%s' "$out" | grep -oE 'Invalid [a-z]+|definitely lost: [0-9,]+ bytes|uninitialised value' | head -1
    else
        echo "✓ sem erro"
    fi
done
```

Produza `valgrind-resultado.md`:

| Arquivo | O `valgrind` reportou | Severidade | Corrigido? |
|---|---|---|---|
| | | | |

**Responda:**

1. **Quantos arquivos o `valgrind` acusou** que o ASan não tinha acusado?
2. Qual vazamento foi o maior? **Quantos bytes?**
3. O `--track-origins=yes` deu informação útil em algum caso?
4. **Se você rodasse só o `valgrind`**, perderia o quê?

### Critérios de aceitação

- `pipeline.md` com as três camadas e as flags de cada uma.
- `pipeline-resultado.md` com as contagens reais **dos seus arquivos**.
- Você identificou **quantos arquivos a camada 1 recusou**.
- `investigacao.md` com **um** aviso investigado até a causa, com correção testada.
- Você respondeu se o aviso era bug verdadeiro ou falso positivo.
- `valgrind-resultado.md` com a varredura e **um vazamento quantificado**.
- Você respondeu o que perderia se rodasse só o `valgrind`.
- `Makefile.seguro` funcionando com `check`, `san` e `val`.

---

## Avaliação

1. Por que sanitizer e `valgrind` não rodam juntos? O que cada um faz de diferente?
2. Descreva os sete casos de bug e qual ferramenta pega cada um.
3. **Qual caso nenhuma das três camadas pega?** Por quê?
4. Se você tivesse uma só ferramenta, qual escolheria? Justifique.
5. Leia: `WRITE of size 21 ... #0 main san.c:18 ... allocated by #1 main san.c:17`. O que você sabe?
6. **Quantas cadeias tem um relatório de UAF?** Nomeie cada uma.
7. Onde está o **bug real** num UAF — na linha que usou, ou na que liberou?
8. Por que `WRITE` é mais grave que `READ`?
9. O que `info locals` e `info args` respondem que o ASan não responde?
10. Como você descobre os offsets de uma struct no `gdb`?
11. Por que o `valgrind` não precisa recompilar? Qual a vantagem prática?
12. O que `--track-origins=yes` faz, e qual o custo?
13. Quantos tipos de vazamento o `valgrind` distingue? Cite três.
14. Descreva o pipeline de três camadas, com as flags de cada uma.
15. Por que os alvos com bug ficam **fora** do `-Werror`?
16. Por que `--error-exitcode` é essencial para CI?
17. Nem todo aviso é bug. Por que corrigir todos ainda vale?

---

**Próximo:** [Módulo 8 — Struct, union, enum e layout real](modulo-08.md)
