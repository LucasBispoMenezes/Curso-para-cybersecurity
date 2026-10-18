# Módulo 10 — C que Resiste a Entrada Hostil

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 9

---

## Objetivos

1. Aplicar o **padrão de validação** em todo limite de confiança.
2. Escrever o contrato de posse de forma verificável.
3. Compilar com hardening e saber o que cada flag defende.
4. Reconhecer as **cinco regras** que fazem código resistir.
5. Fechar o `Makefile` do curso com o pipeline completo.

---

## 10.1 A fronteira de confiança

⚠ **O conceito que organiza o módulo:** existe uma **fronteira** entre o dado que **você controla** e
o dado que **vem de fora**.

```
┌─────────────────────────────────────────────────────────────┐
│  DENTRO DO PROGRAMA — confiável                             │
│  · variável calculada por você                              │
│  · constante do código                                      │
│  · dado que já foi validado                                 │
├═════════════════════════════════════════════════════════════┤
│  ⚠ FRONTEIRA DE CONFIANÇA — tudo que cruza é validado       │
├═════════════════════════════════════════════════════════════┤
│  FORA — HOSTIL, presumir o pior                             │
│  · argv, stdin, ambiente                                    │
│  · arquivo, socket, pipe                                    │
│  · variável de ambiente                                     │
│  · entrada do usuário                                       │
│  · resposta de rede                                         │
│  · retorno de função que pode falhar                        │
└─────────────────────────────────────────────────────────────┘
```

⚠ **A regra:** **todo dado que cruza a fronteira é validado antes de ser usado.** Não "depois de
usado". Não "se der tempo". **Antes.**

⚠ **E a fronteira não é só de I/O.** O retorno de `malloc` cruza a fronteira — porque pode falhar.
O retorno de função que devolve `NULL` cruza. **Toda função que pode falhar é uma fronteira.**

---

## 10.2 As cinco regras

### Regra 1 — Valide na fronteira, não no uso

```c
/* ⚠ ERRADO: valida no uso, em cada lugar que consome */
void processar_um(const char *nome) { if (!nome || strlen(nome) > 31) return; /* ... */ }
void processar_dois(const char *nome) { if (!nome || strlen(nome) > 31) return; /* ... */ }
/* ← a validação está repetida, e alguém vai esquecer em processar_três */

/* ✓ CERTO: valida UMA vez, na fronteira */
int receber(const char *nome, char *dst, size_t dst_n) {
    if (!nome || !dst || dst_n == 0)      return -1;
    size_t n = strlen(nome);
    if (n == 0 || n >= dst_n)             return -2;   /* ← validado AQUI */
    memcpy(dst, nome, n + 1);
    return 0;
}
/* e a partir daqui, `dst` é confiável — não precisa revalidar */
```

### Regra 2 — Uma verificação por limite, e ela vem antes

```c
/* ⚠ ERRADO: verifica o destino, esquece a origem */
memcpy(dst, src, n);
if (n > sizeof(dst_buf)) return -1;       /* ← tarde demais! */

/* ✓ CERTO: todas as verificações antes de tocar na memória */
if (n > src_len)         return -1;       /* origem */
if (n > sizeof(dst_buf)) return -1;       /* destino */
memcpy(dst, src, n);
```

⚠ **O erro clássico é verificar só um dos dois.** Um `memcpy` tem **duas** superfícies: a origem
(precisa ter `n` bytes) e o destino (precisa caber `n` bytes). **Verifique as duas.**

### Regra 3 — Cheque a aritmética antes de usá-la como tamanho

```c
/* ⚠ ERRADO: multiplica primeiro, verifica depois */
size_t total = n * tam;
if (total > LIMITE) return -1;

/* ✓ CERTO: verifica a operação, não o resultado */
if (tam != 0 && n > SIZE_MAX / tam) return -1;    /* estouraria */
size_t total = n * tam;
if (total > LIMITE) return -1;
```

⚠ **A verificação do resultado não protege.** Se `n * tam` estourou, `total` é um número pequeno —
e passa no `if (total > LIMITE)`. **A única verificação eficaz é a que impede a operação de
acontecer.**

### Regra 4 — Um dono por bloco, e ele é declarado

```c
/* ✓ CONVENÇÃO DE NOME = CONTRATO */
Bloco *bloco_criar(void);          /* DEVOLVE posse: quem chama libera */
void   bloco_mostrar(const Bloco *); /* EMPRESTA: não libera, não modifica */
void   bloco_liberar(Bloco **);    /* CONSOME: libera E anula o ponteiro */
```

⚠ **A anulação no `liberar` é o que previne UAF.** Passar `Bloco **` permite zerar o ponteiro do
chamador — e aí usar depois é `NULL`, que o sanitizer pega na hora.

### Regra 5 — Compile com tudo ligado

```bash
# todos os avisos que pegam as classes do módulo 6
-Wall -Wextra -Wformat=2 -Wstrict-prototypes -Wshadow \
-Wconversion -Wsign-conversion -Wswitch-enum \
-Wstrict-overflow=5 -Wwrite-strings -Werror
```

⚠ **`-Werror` é a decisão que faz a diferença.** Sem ele, você tem os avisos e não os lê. Com ele,
você é **obrigado** a resolver — e resolver é onde o bug aparece.

---

## 10.3 Hardening

⚠ **O que o compilador faz **por você**, sem mudar o código.**

| Flag | O que defende | Custo |
|---|---|---|
| **`-D_FORTIFY_SOURCE=2`** | Detecta transbordo em `strcpy`, `memcpy`, `sprintf` **em tempo de execução** | Quase zero |
| **`-fstack-protector-strong`** | Canário antes do endereço de retorno | ~1% |
| **`-fPIE -pie`** | Endereços aleatórios (ASLR efetivo) | ~2% |
| **`-Wl,-z,relro,-z,now`** | GOT somente-leitura após carga | Zero |
| **`-Wl,-z,noexecstack`** | Pilha não-executável | Zero |
| `-fcf-protection=full` | Intel CET (se suportado) | ~1% |
| **`-fno-strict-aliasing`** | Desliga a regra de aliasing estrito | Pode reduzir otimização |

⚠ **`_FORTIFY_SOURCE` merece atenção especial.** Ele **troca** as funções de biblioteca por versões
que verificam o tamanho do destino — e **aborta** se o transbordo acontecer. **Ele detecta o bug em
produção**, não só em teste.

⚠ **E note a combinação `-Wl,-z,relro,-z,now`.** Ela faz a GOT ser **somente-leitura** depois que o
programa carrega — o que impede o ataque clássico de sobrescrever ponteiro de função na GOT.

```bash
cd ~/c-lab/src

cat > hard.c <<'EOF'
#include <stdio.h>
#include <string.h>

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    char buf[8];

    printf("═══ o mesmo transbordo, com e sem FORTIFY ═══\n");
    strcpy(buf, argv[1]);          /* ⚠ transborda se argv[1] > 7 chars */
    printf("buf = '%s'\n", buf);
    return 0;
}
EOF

echo "═══ SEM hardening ═══"
gcc -Wall -g -O0 -U_FORTIFY_SOURCE -o ../bin/hard-sim hard.c 2>/dev/null
../bin/hard-sim "$(python3 -c "print('A'*40)")" 2>&1 | head -4
echo "  código: $?"

echo
echo "═══ COM hardening ═══"
gcc -Wall -O2 -D_FORTIFY_SOURCE=2 -fstack-protector-strong -fPIE -pie \
    -Wl,-z,relro,-z,now -o ../bin/hard-com hard.c 2>/dev/null
../bin/hard-com "$(python3 -c "print('A'*40)")" 2>&1 | head -4
echo "  código: $?"

echo
echo "═══ o que o binário hardened tem ═══"
readelf -d ../bin/hard-com 2>/dev/null | grep -E 'BIND_NOW|FLAGS' | head -3
readelf -s ../bin/hard-com 2>/dev/null | grep -c '__stack_chk_fail' | xargs echo "  __stack_chk_fail presente:"
readelf -l ../bin/hard-com 2>/dev/null | grep -E 'GNU_STACK|GNU_RELRO' | head -2
```

⚠ **`__stack_chk_fail` presente** significa que o canário está ativo. **`GNU_RELRO` presente**
significa GOT protegida. **Você confirma o hardening olhando o binário** — não confiando na flag.

**Produza `hardening.md`:**

| Flag | Está ativa? | Como confirmou | O que defende |
|---|---|---|---|
| `_FORTIFY_SOURCE` | | | |
| `-fstack-protector` | | | |
| PIE | | | |
| RELRO | | | |
| NX stack | | | |

**Responda:**

1. Sem hardening, o transbordo de 40 chars **crashou ou passou**?
2. Com hardening, o que mudou? **A mensagem foi mais clara?**
3. Como você confirmou que o canário está ativo?
4. `_FORTIFY_SOURCE` funciona em `-O0`? **Teste** — por quê o resultado?

⚠ **A resposta 4 é um detalhe real:** `_FORTIFY_SOURCE` **exige otimização** (`-O1` ou acima). Compile
com `-O0` e ele **não faz nada** — e você acha que está protegido. **É o tipo de detalhe que só
aparece quando você confirma no binário.**

---

## 10.4 LAB — Reescreva o parser com todas as regras

**Duração:** 75 min

### Passo 1 — O parser resistente (45 min)

```bash
cd ~/c-lab/src

cat > lab10.c <<'EOF'
/*
 * Parser MFYM v1 — versão resistente a entrada hostil.
 * Aplica as cinco regras do módulo 10.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAGIA      0x4D59464D
#define VERSAO     1
#define MAX_ITENS  1024
#define ITEM_TAM   16
#define CAB_TAM    12
#define MAX_NOME   63

/* leitura portável — sem cast de ponteiro */
static uint32_t le_u32(const uint8_t *p) { uint32_t v; memcpy(&v, p, 4); return v; }
static uint16_t le_u16(const uint8_t *p) { uint16_t v; memcpy(&v, p, 2); return v; }

typedef struct {
    uint16_t n_itens;
    size_t   corpo_offset;
    size_t   corpo_len;
} Info;

/*
 * REGRA 1 — valida na fronteira, uma vez.
 * REGRA 2 — uma verificação por limite, antes de tocar na memória.
 * REGRA 3 — checa a aritmética antes de usá-la.
 *
 * Devolve: 0 = ok, <0 = motivo.
 */
int mfym_parse(const uint8_t *buf, size_t len, Info *info) {
    /* REGRA 1: valida argumentos na fronteira */
    if (!buf || !info) return -1;
    memset(info, 0, sizeof(*info));

    /* limite 1: o cabeçalho cabe? */
    if (len < CAB_TAM) return -2;

    /* limite 2: magia */
    if (le_u32(buf) != MAGIA) return -3;

    /* limite 3: versão */
    if (le_u16(buf + 4) != VERSAO) return -4;

    /* limite 4: n_itens em faixa — ANTES de qualquer aritmética */
    uint16_t n = le_u16(buf + 6);
    if (n > MAX_ITENS) return -5;

    /* REGRA 3: a multiplicação é segura porque n <= MAX_ITENS */
    size_t esperado = (size_t)n * ITEM_TAM;

    /* limite 5: o tamanho declarado bate? */
    if ((size_t)le_u32(buf + 8) != esperado) return -6;

    /* limite 6: o corpo cabe? */
    size_t disponivel = len - CAB_TAM;
    if (esperado > disponivel) return -7;

    info->n_itens      = n;
    info->corpo_offset = CAB_TAM;
    info->corpo_len    = esperado;
    return 0;
}

/* REGRA 4 — contrato: EMPRESTA o buffer, DEVOLVE posse do nome */
int mfym_nome_do_item(const uint8_t *buf, const Info *info,
                      size_t idx, char **nome) {
    if (!buf || !info || !nome) return -1;
    *nome = NULL;

    if (idx >= info->n_itens) return -2;

    /* REGRA 3: a multiplicação é segura — idx < n_itens <= 1024 */
    size_t off = info->corpo_offset + idx * ITEM_TAM;
    if (off + ITEM_TAM > info->corpo_offset + info->corpo_len) return -3;

    /* ⚠ o nome é definido como os primeiros 16 bytes do item, sem NUL garantido */
    size_t n = 0;
    while (n < ITEM_TAM && (buf[off + n] != 0)) n++;

    char *copia = malloc(n + 1);
    if (!copia) return -4;

    memcpy(copia, buf + off, n);
    copia[n] = '\0';

    *nome = copia;              /* DEVOLVE posse */
    return 0;
}

const char *motivo(int r) {
    switch (r) {
        case  0: return "ok";
        case -1: return "arg inválido";
        case -2: return "buffer curto";
        case -3: return "magia";
        case -4: return "versão";
        case -5: return "n_itens";
        case -6: return "tamanho";
        case -7: return "corpo não cabe";
        default: return "?";
    }
}

/* gera o buffer de teste */
static size_t montar(uint8_t *b, uint32_t magia, uint16_t versao,
                     uint16_t n, uint32_t tam, int truncar) {
    memset(b, 0, 4096);
    memcpy(b,     &magia,  4);
    memcpy(b + 4, &versao, 2);
    memcpy(b + 6, &n,      2);
    memcpy(b + 8, &tam,    4);
    for (size_t i = 0; i < (size_t)n * ITEM_TAM && i + CAB_TAM < 4096; i++)
        b[CAB_TAM + i] = (uint8_t)('A' + (i % 26));
    size_t len = CAB_TAM + (size_t)n * ITEM_TAM;
    if (truncar && len > 4) len -= 4;
    return len;
}

int main(void) {
    uint8_t buf[4096];
    Info  info;
    size_t len;
    int    r;

    printf("═══ casos de validação ═══\n");
    struct { const char *nome; uint32_t m; uint16_t v; uint16_t n; uint32_t t; int tr; } c[] = {
        { "válido n=3",      MAGIA, 1,    3,  3*ITEM_TAM, 0 },
        { "válido n=0",      MAGIA, 1,    0,  0,          0 },
        { "magia errada",    0xBAD, 1,    2,  2*ITEM_TAM, 0 },
        { "versão 9",        MAGIA, 9,    2,  2*ITEM_TAM, 0 },
        { "n acima",         MAGIA, 1, 5000, 5000*ITEM_TAM, 0 },
        { "tam incoerente",  MAGIA, 1,    2,  999,        0 },
        { "corpo truncado",  MAGIA, 1,    3,  3*ITEM_TAM, 1 },
    };

    for (size_t i = 0; i < sizeof(c)/sizeof(c[0]); i++) {
        len = montar(buf, c[i].m, c[i].v, c[i].n, c[i].t, c[i].tr);
        r = mfym_parse(buf, len, &info);
        printf("  %-16s len=%-5zu r=%2d (%s)\n", c[i].nome, len, r, motivo(r));
    }

    printf("\n═══ pegando nomes ═══\n");
    len = montar(buf, MAGIA, 1, 3, 3*ITEM_TAM, 0);
    r = mfym_parse(buf, len, &info);
    if (r == 0) {
        for (size_t i = 0; i < info.n_itens; i++) {
            char *nome = NULL;
            int rn = mfym_nome_do_item(buf, &info, i, &nome);
            if (rn == 0 && nome) {
                printf("  item %zu: '%s'\n", i, nome);
                free(nome);                    /* ✓ quem chamou é dono */
            }
        }
        /* índice fora da faixa */
        char *nulo = NULL;
        printf("  item 99: r=%d (%s)\n",
               mfym_nome_do_item(buf, &info, 99, &nulo), motivo(-2));
    }

    return 0;
}
EOF

gcc -Wall -Wextra -Wformat=2 -Wconversion -Wshadow -Wswitch-enum \
    -Wstrict-prototypes -Werror -g -O2 -o ../bin/lab10 lab10.c \
  && echo "✓ compilou com -Werror (zero avisos)" && ../bin/lab10
```

Produza `lab10-casos.md`:

| Caso | `len` | `r` | Recusado? | Verificação |
|---|---|---|---|---|
| válido n=3 | | | | |
| válido n=0 | | | | |
| magia errada | | | | |
| versão 9 | | | | |
| n acima | | | | |
| tam incoerente | | | | |
| corpo truncado | | | | |

**Responda:**

1. **Todos compilaram com `-Werror`?** Se não, qual aviso apareceu, e como você corrigiu?
2. Qual verificação pegou o `n acima`? E se ela viesse depois da multiplicação?
3. **O `mfym_nome_do_item` itera até `ITEM_TAM`.** O que acontece se o item não tiver NUL?
4. Por que `idx >= info->n_itens` e não `>`?

⚠ **A resposta 3 é um caso real.** Se o item não tiver NUL nos 16 bytes, o laço para em `ITEM_TAM` —
e o nome fica com 16 chars, com NUL colocado por você. **Não lê além**, porque o limite está no
laço. **Note que a verificação de offset no passo anterior garante que os 16 bytes existem.**

### Passo 2 — Confirme com ASan e valgrind (20 min)

```bash
cd ~/c-lab/src

clang -g -O1 -fsanitize=address,undefined -o ../bin/lab10_asan lab10.c
echo "═══ ASan ═══"
../bin/lab10_asan 2>&1 | tail -4

echo
echo "═══ valgrind ═══"
gcc -g -O0 -o ../bin/lab10_vg lab10.c
valgrind -q --leak-check=full --track-origins=yes ../bin/lab10_vg 2>&1 | tail -6

echo
echo "═══ o hardening no binário de release ═══"
gcc -O2 -D_FORTIFY_SOURCE=2 -fstack-protector-strong -fPIE -pie \
    -Wl,-z,relro,-z,now -o ../bin/lab10_rel lab10.c 2>/dev/null
readelf -s ../bin/lab10_rel 2>/dev/null | grep -c '__stack_chk_fail' | xargs echo "  canário:"
readelf -l ../bin/lab10_rel 2>/dev/null | grep -c 'GNU_RELRO' | xargs echo "  RELRO:"
```

Produza `lab10-confirmacao.md`:

| Ferramenta | Resultado | Conclusão |
|---|---|---|
| ASan + UBSan | | |
| `valgrind` | | |
| Canário no binário | | |
| RELRO no binário | | |

**Responda:**

1. O ASan acusou algo? O `valgrind`?
2. **Se os dois estão limpos, o parser está correto?** Justifique com o que você sabe do módulo 6.
3. Quantos `free` o parser faz, e em quais caminhos?
4. **Qual classe do módulo 6 este parser poderia ainda ter?** (Dica: nenhuma das sete está visível.)

⚠ **A resposta 4 é a conclusão honesta:** "ASan limpo" **não** significa "sem bug" — significa "sem
bug **que o ASan detecta**". Um bug **lógico** (validação faltando, ordem errada) passa por tudo.
**É por isso que o módulo 6 e o 10 existem separados.**

### Passo 3 — O `Makefile` final (10 min)

```bash
cd ~/c-lab

cat > Makefile <<'EOF'
# Makefile final do curso de C
CC         = clang
GCC        = gcc

WARN       = -Wall -Wextra -Wformat=2 -Wstrict-prototypes -Wshadow \
             -Wconversion -Wsign-conversion -Wswitch-enum -Wwrite-strings

DEV        = -std=c17 -g -O0 $(WARN)
STRICT     = -std=c17 -O2 $(WARN) -Werror
SAN        = -std=c17 -g -O1 $(WARN) -fsanitize=address,undefined -fno-omit-frame-pointer
REL        = -std=c17 -O2 -D_FORTIFY_SOURCE=2 -fstack-protector-strong \
             -fPIE -pie -Wl,-z,relro,-z,now -Wl,-z,noexecstack
VG         = -std=c17 -g -O0 $(WARN)

SRC = src
BIN = bin

# alvos com bug deliberado — fora do -Werror
BUGADOS = alvo ub lab5 lab6 san e1_ e2_ e3_ e4_ c1_ c2_ c3_ c4_ c5_ c6_ c7_ \
          inseg strncpy_trap nul comparacao

todos = $(wildcard $(SRC)/*.c)

all: $(BIN)/lab10 $(BIN)/lab9

$(BIN)/%: $(SRC)/%.c
	@mkdir -p $(BIN)
	$(CC) $(DEV) -o $@ $<

# ─── pipeline ───────────────────────────────────────────────

check:
	@echo "── camada 1: compilação estrita ──"
	@ok=0; falhou=0; \
	for f in $(todos); do \
	    b=$$(basename "$$f" .c); \
	    skip=0; for x in $(BUGADOS); do case "$$b" in $$x*) skip=1;; esac; done; \
	    [ $$skip -eq 1 ] && continue; \
	    if $(CC) $(STRICT) -c -o /dev/null "$$f" 2>/dev/null; then \
	        echo "  ✓ $$b"; ok=$$((ok+1)); \
	    else \
	        echo "  ✗ $$b"; falhou=$$((falhou+1)); \
	    fi; \
	done; \
	echo "  ── $$ok ok, $$falhou falhou"

san:
	@mkdir -p $(BIN)
	$(CC) $(SAN) -o $(BIN)/$(ALVO)_san $(SRC)/$(ALVO).c

rel:
	@mkdir -p $(BIN)
	$(CC) $(REL) -o $(BIN)/$(ALVO)_rel $(SRC)/$(ALVO).c
	@readelf -s $(BIN)/$(ALVO)_rel 2>/dev/null | grep -q stack_chk_fail \
	  && echo "  ✓ canário" || echo "  ⚠ sem canário"
	@readelf -l $(BIN)/$(ALVO)_rel 2>/dev/null | grep -q GNU_RELRO \
	  && echo "  ✓ RELRO" || echo "  ⚠ sem RELRO"

val:
	@mkdir -p $(BIN)
	$(GCC) $(VG) -o $(BIN)/$(ALVO)_vg $(SRC)/$(ALVO).c
	valgrind -q --leak-check=full --track-origins=yes \
	         --error-exitcode=99 $(BIN)/$(ALVO)_vg $(ARGS)

clean:
	rm -f $(BIN)/* tmp/*.i tmp/*.s tmp/*.o

.PHONY: all check san rel val clean
EOF

make check 2>&1 | tail -20
echo
make san ALVO=lab10 && ./bin/lab10_san 2>&1 | tail -2
echo
make val ALVO=lab10 2>&1 | tail -4
```

Produza `lab10-makefile.md`:

| Alvo do `make` | O que faz | Resultado |
|---|---|---|
| `check` | | |
| `san ALVO=x` | | |
| `rel ALVO=x` | | |
| `val ALVO=x` | | |

**Responda:**

1. **Quantos dos seus arquivos passaram** pelo `check`?
2. Por que os arquivos com bug ficam **fora** do `check`?
3. O `rel` confirmou canário e RELRO?
4. **Qual alvo do `make` você rodaria em CI?** Por quê?

### Critérios de aceitação

- `lab10.c` compilando com **`-Werror`** e todas as flags de aviso — zero avisos.
- `lab10-casos.md` com os sete casos e a verificação que pegou cada um.
- Você explicou por que `idx >= n_itens` e não `>`.
- `lab10-confirmacao.md` com ASan, `valgrind` e a confirmação de hardening **no binário**.
- Você respondeu que "ASan limpo" **não significa** "sem bug".
- `Makefile` com os quatro alvos funcionando.
- Você confirmou `__stack_chk_fail` e `GNU_RELRO` com `readelf`, **não** confiando na flag.
- Você testou `_FORTIFY_SOURCE` com `-O0` e explicou o resultado.

---

## Avaliação

1. O que é fronteira de confiança? Cite cinco coisas que estão **fora** dela.
2. Por que o retorno de `malloc` é uma fronteira?
3. Explique a regra 1 com o exemplo dos três `processar_*`.
4. **Um `memcpy` tem quantas superfícies de limite?** Quais?
5. Por que verificar o **resultado** de `n * tam` não protege contra overflow?
6. Escreva a verificação correta para `n * tam` e para `n + tam`.
7. Cite as três convenções de posse e como cada uma se expressa no nome.
8. Por que `liberar(Bloco **)` é mais seguro que `liberar(Bloco *)`?
9. Qual a flag de aviso que você usa para cada classe do módulo 6?
10. Por que `-Werror` é a decisão que faz a diferença?
11. O que `_FORTIFY_SOURCE` defende, e por que exige `-O1`?
12. **Como você confirma que o hardening está ativo?** Por que não confiar na flag?
13. O que `-Wl,-z,relro,-z,now` defende, e contra qual ataque?
14. **"ASan limpo" significa "sem bug"?** Justifique.
15. Por que um bug **lógico** passa por todas as camadas do módulo 7?

---

**Próximo:** [Módulo 11 — Projeto: parser fuzzável](modulo-11.md)
