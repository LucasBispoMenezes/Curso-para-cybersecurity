# Módulo 11 — Projeto: Parser Fuzzável

**Carga:** 2 horas
**Pré-requisitos:** Módulos 1 a 10

---

## O objetivo do módulo

**Um entregável:** o parser que você vai fuzzar no curso de fuzzing.

⚠ **A conexão é literal.** O curso de fuzzing exige alvo com quatro propriedades — e este módulo as
entrega. Terminado o projeto, você tem o `parser_lib.c` que o Módulo 1 do curso de fuzzing usa.

| Propriedade exigida | Como este projeto entrega |
|---|---|
| **Lê de buffer** (não de arquivo) | `mfym_parse(buf, len, &info)` — sem I/O |
| **Determinístico** | Sem estado global, sem tempo, sem aleatoriedade |
| **Rápido** | Sem alocação no caminho de validação |
| **Tratamento de erro** | Oito códigos de retorno, todos testados |

---

## ⚠ O que você vai construir

```
projeto-final/
├── src/
│   ├── mfym.h              interface pública
│   ├── mfym.c              parser — o ALVO do fuzzing
│   └── mfym_main.c         wrapper CLI (não é o alvo)
├── fuzz/
│   └── mfym_fuzzer.c       harness LLVMFuzzerTestOneInput
├── test/
│   ├── mfym_test.c         testes de unidade
│   └── gerar_corpus.py     gera arquivos de teste
├── Makefile
└── README.md
```

⚠ **A separação é o ponto.** `mfym.c` é o alvo — puro, sem `main`, sem I/O. `mfym_main.c` é o
wrapper que lê arquivo e chama o parser. **O fuzzer fala com o `mfym.c`, não com o wrapper.**

---

## 11.1 A interface — `mfym.h`

```c
/*
 * mfym.h — parser do formato MFYM v1
 *
 * Formato (little-endian):
 *   offset  0 : magia      uint32 = 0x4D59464D ('MFYM')
 *   offset  4 : versao     uint16 = 1
 *   offset  6 : n_itens    uint16 <= 1024
 *   offset  8 : tamanho    uint32 = n_itens * 16
 *   offset 12 : corpo      n_itens * 16 bytes
 *
 * Cada item tem 16 bytes; os primeiros são o nome (NUL não garantido).
 */
#ifndef MFYM_H
#define MFYM_H

#include <stddef.h>
#include <stdint.h>

#define MFYM_MAGIA      0x4D59464DU
#define MFYM_VERSAO     1
#define MFYM_MAX_ITENS  1024U
#define MFYM_ITEM_TAM   16U
#define MFYM_CAB_TAM    12U

/* Códigos de retorno — TODOS documentados */
enum {
    MFYM_OK          =  0,
    MFYM_ERR_ARG     = -1,   /* ponteiro NULL                 */
    MFYM_ERR_CURTO   = -2,   /* buffer menor que o cabeçalho   */
    MFYM_ERR_MAGIA   = -3,   /* magia não bate                 */
    MFYM_ERR_VERSAO  = -4,   /* versão não suportada           */
    MFYM_ERR_ITENS   = -5,   /* n_itens acima do máximo        */
    MFYM_ERR_TAMANHO = -6,   /* tamanho declarado incoerente   */
    MFYM_ERR_CORPO   = -7,   /* corpo não cabe no buffer       */
    MFYM_ERR_IDX     = -8,   /* índice fora da faixa           */
    MFYM_ERR_MEM     = -9    /* alocação falhou                */
};

typedef struct {
    uint16_t n_itens;
    size_t   corpo_offset;
    size_t   corpo_len;
} MfymInfo;

/*
 * CONTRATO: valida o buffer e preenche `info`.
 *   EMPRESTA `buf` — não aloca, não modifica, não guarda o ponteiro.
 *   DEVOLVE `info` preenchido só quando retorna MFYM_OK.
 */
int mfym_parse(const uint8_t *buf, size_t len, MfymInfo *info);

/*
 * CONTRATO: copia o nome do item `idx` para buffer do chamador.
 *   EMPRESTA `buf` e `info`.
 *   DEVOLVE o comprimento copiado (sem NUL), ou código negativo.
 */
int mfym_item_nome(const uint8_t *buf, const MfymInfo *info,
                   size_t idx, char *dst, size_t dst_n);

#endif /* MFYM_H */
```

⚠ **Note que a segunda função usa buffer do chamador**, em vez de alocar. É a decisão de projeto
do módulo 10, regra 4: **menos donos, menos bug.** Uma função que não aloca não pode vazar.

---

## 11.2 A implementação — `mfym.c`

```c
#include "mfym.h"
#include <string.h>

static uint32_t le_u32(const uint8_t *p) { uint32_t v; memcpy(&v, p, 4); return v; }
static uint16_t le_u16(const uint8_t *p) { uint16_t v; memcpy(&v, p, 2); return v; }

int mfym_parse(const uint8_t *buf, size_t len, MfymInfo *info)
{
    /* regra 1 — valida argumentos na fronteira */
    if (buf == NULL || info == NULL) return MFYM_ERR_ARG;
    memset(info, 0, sizeof(*info));

    /* limite 1 — cabe o cabeçalho? */
    if (len < MFYM_CAB_TAM) return MFYM_ERR_CURTO;

    /* limite 2 — magia */
    if (le_u32(buf) != MFYM_MAGIA) return MFYM_ERR_MAGIA;

    /* limite 3 — versão */
    if (le_u16(buf + 4) != MFYM_VERSAO) return MFYM_ERR_VERSAO;

    /* limite 4 — faixa ANTES da aritmética */
    const uint16_t n = le_u16(buf + 6);
    if (n > MFYM_MAX_ITENS) return MFYM_ERR_ITENS;

    /* regra 3 — a multiplicação é segura porque n <= MAX_ITENS */
    const size_t esperado = (size_t)n * MFYM_ITEM_TAM;

    /* limite 5 — tamanho declarado bate? */
    if ((size_t)le_u32(buf + 8) != esperado) return MFYM_ERR_TAMANHO;

    /* limite 6 — o corpo cabe? */
    if (esperado > len - MFYM_CAB_TAM) return MFYM_ERR_CORPO;

    info->n_itens      = n;
    info->corpo_offset = MFYM_CAB_TAM;
    info->corpo_len    = esperado;
    return MFYM_OK;
}

int mfym_item_nome(const uint8_t *buf, const MfymInfo *info,
                   size_t idx, char *dst, size_t dst_n)
{
    if (buf == NULL || info == NULL || dst == NULL) return MFYM_ERR_ARG;
    if (dst_n == 0) return MFYM_ERR_ARG;
    dst[0] = '\0';

    if (idx >= info->n_itens) return MFYM_ERR_IDX;

    /* regra 3 — aritmética segura: idx < n_itens <= 1024 */
    const size_t off = info->corpo_offset + idx * MFYM_ITEM_TAM;
    if (off + MFYM_ITEM_TAM > info->corpo_offset + info->corpo_len)
        return MFYM_ERR_CORPO;

    /* o nome é os primeiros bytes até NUL, no máximo ITEM_TAM */
    size_t n = 0;
    while (n < MFYM_ITEM_TAM && buf[off + n] != 0) n++;

    /* regra 2 — verifica o DESTINO antes de escrever */
    if (n >= dst_n) n = dst_n - 1;          /* trunca com segurança */

    memcpy(dst, buf + off, n);
    dst[n] = '\0';
    return (int)n;
}
```

⚠ **Três decisões de projeto para você defender no relatório:**

| Decisão | Por quê |
|---|---|
| **Não alocar em nenhuma função** | Sem alocação, não há vazamento nem contrato de posse |
| **Truncar em vez de recusar** no nome | A alternativa seria devolver erro — mais correto, menos útil |
| **Validar faixa antes de multiplicar** | `n <= 1024` garante que `n * 16` não estoura |

⚠ **A segunda linha é uma escolha, não um acerto.** Truncar é conveniente e esconde o dado cortado.
**Defenda a sua escolha no relatório** — e saiba qual seria a alternativa.

---

## 11.3 O harness — `mfym_fuzzer.c`

⚠ **O arquivo que o curso de fuzzing vai usar.**

```c
/*
 * mfym_fuzzer.c — harness para libFuzzer E AFL++
 * ⚠ o alvo é mfym.c, nunca o CLI
 */
#include <stdint.h>
#include <stddef.h>
#include "mfym.h"

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size)
{
    /* guarda 1 — entrada menor que o cabeçalho não exercita nada */
    if (size < MFYM_CAB_TAM) return 0;

    /* guarda 2 — limite de tempo */
    if (size > 64 * 1024) return 0;

    MfymInfo info;
    if (mfym_parse(data, size, &info) != MFYM_OK) return 0;

    /* exercita o caminho de leitura de item — é onde o bug costuma estar */
    char nome[MFYM_ITEM_TAM];
    for (size_t i = 0; i < info.n_itens; i++)
        (void)mfym_item_nome(data, &info, i, nome, sizeof(nome));

    return 0;
}
```

⚠ **Note as três coisas que o harness faz:**
1. **Guarda de tamanho** (mínimo e máximo) — módulo 4 do curso de fuzzing
2. **Chama o parser** com o dado bruto
3. **Exercita o caminho de item** — não só validar o cabeçalho

⚠ **A terceira é a que você pode esquecer**, e ela é a mais importante: se o harness só chama
`mfym_parse`, o fuzzer **nunca** chega no `mfym_item_nome` — e é ali que o bug de índice vive.
**É o erro nº 2 da tabela do Módulo 4 do curso de fuzzing.**

---

## 11.4 Os testes

```c
/* test/mfym_test.c — testes de unidade */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include "mfym.h"

static int falhas = 0;

#define VERIFICA(cond, msg) do {                        \
    if (!(cond)) { printf("  ✗ %s\n", msg); falhas++; } \
    else         { printf("  ✓ %s\n", msg); }           \
} while (0)

static size_t montar(uint8_t *b, size_t cap, uint32_t magia, uint16_t versao,
                     uint16_t n, uint32_t tam)
{
    if (cap < MFYM_CAB_TAM) return 0;
    memset(b, 0, cap);
    memcpy(b,     &magia,  4);
    memcpy(b + 4, &versao, 2);
    memcpy(b + 6, &n,      2);
    memcpy(b + 8, &tam,    4);
    size_t len = MFYM_CAB_TAM + (size_t)n * MFYM_ITEM_TAM;
    if (len > cap) len = cap;
    for (size_t i = MFYM_CAB_TAM; i < len; i++)
        b[i] = (uint8_t)('a' + ((i - MFYM_CAB_TAM) % 26));
    return len;
}

int main(void)
{
    uint8_t buf[4096];
    MfymInfo info;
    char nome[MFYM_ITEM_TAM];
    size_t len;

    printf("═══ validação do cabeçalho ═══\n");

    len = montar(buf, sizeof(buf), MFYM_MAGIA, MFYM_VERSAO, 3, 3 * MFYM_ITEM_TAM);
    VERIFICA(mfym_parse(buf, len, &info) == MFYM_OK, "cabeçalho válido");
    VERIFICA(info.n_itens == 3, "n_itens lido");

    VERIFICA(mfym_parse(NULL, len, &info)   == MFYM_ERR_ARG, "buf NULL");
    VERIFICA(mfym_parse(buf, len, NULL)     == MFYM_ERR_ARG, "info NULL");
    VERIFICA(mfym_parse(buf, 4, &info)      == MFYM_ERR_CURTO, "buffer curto");

    len = montar(buf, sizeof(buf), 0xBAD, MFYM_VERSAO, 1, MFYM_ITEM_TAM);
    VERIFICA(mfym_parse(buf, len, &info) == MFYM_ERR_MAGIA, "magia errada");

    len = montar(buf, sizeof(buf), MFYM_MAGIA, 99, 1, MFYM_ITEM_TAM);
    VERIFICA(mfym_parse(buf, len, &info) == MFYM_ERR_VERSAO, "versão errada");

    len = montar(buf, sizeof(buf), MFYM_MAGIA, MFYM_VERSAO, 5000, 0);
    VERIFICA(mfym_parse(buf, len, &info) == MFYM_ERR_ITENS, "n_itens acima");

    len = montar(buf, sizeof(buf), MFYM_MAGIA, MFYM_VERSAO, 2, 999);
    VERIFICA(mfym_parse(buf, len, &info) == MFYM_ERR_TAMANHO, "tamanho incoerente");

    len = montar(buf, sizeof(buf), MFYM_MAGIA, MFYM_VERSAO, 4, 4 * MFYM_ITEM_TAM);
    VERIFICA(mfym_parse(buf, len - 8, &info) == MFYM_ERR_CORPO, "corpo não cabe");

    printf("\n═══ leitura de itens ═══\n");
    len = montar(buf, sizeof(buf), MFYM_MAGIA, MFYM_VERSAO, 3, 3 * MFYM_ITEM_TAM);
    VERIFICA(mfym_parse(buf, len, &info) == MFYM_OK, "parse inicial");

    VERIFICA(mfym_item_nome(buf, &info, 0, nome, sizeof(nome)) > 0, "item 0");
    VERIFICA(mfym_item_nome(buf, &info, 3, nome, sizeof(nome)) == MFYM_ERR_IDX, "idx fora");
    VERIFICA(mfym_item_nome(buf, &info, 99, nome, sizeof(nome)) == MFYM_ERR_IDX, "idx 99");
    VERIFICA(mfym_item_nome(buf, &info, 0, NULL, 8) == MFYM_ERR_ARG, "dst NULL");
    VERIFICA(mfym_item_nome(buf, &info, 0, nome, 0) == MFYM_ERR_ARG, "dst_n 0");

    printf("\n═══ limite de destino ═══\n");
    char pequeno[4];
    int r = mfym_item_nome(buf, &info, 0, pequeno, sizeof(pequeno));
    VERIFICA(r == 3, "truncou para 3 chars");
    VERIFICA(strlen(pequeno) == 3, "terminou em NUL");

    printf("\n%s (%d falha(s))\n", falhas ? "FALHOU" : "PASSOU", falhas);
    return falhas ? 1 : 0;
}
```

---

## 11.5 O gerador de corpus

```python
#!/usr/bin/env python3
"""gerar_corpus.py — gera sementes para o fuzzer (Módulo 5 do curso de fuzzing)."""
import struct, os, sys

MAGIA, VERSAO, ITEM_TAM, CAB_TAM = 0x4D59464D, 1, 16, 12

def monta(n, versao=VERSAO, magia=MAGIA, tam=None, extra=b""):
    tam = n * ITEM_TAM if tam is None else tam
    corpo = bytes((ord('a') + (i % 26)) for i in range(n * ITEM_TAM))
    return struct.pack("<IHHI", magia, versao, n, tam) + corpo + extra

saida = sys.argv[1] if len(sys.argv) > 1 else "fuzz/corpus"
os.makedirs(saida, exist_ok=True)

casos = {
    "s1-vazio":        monta(0),
    "s2-um":           monta(1),
    "s3-tres":         monta(3),
    "s4-limite-max":   monta(1024),                      # o máximo permitido
    "s5-acima-max":    monta(1025),                      # logo acima
    "s6-pouco-abaixo": monta(1023),
    "s7-versao-bad":   monta(2, versao=99),
    "s8-magia-bad":    monta(2, magia=0),
    "s9-tam-zero":     monta(2, tam=0),
    "s10-extra":       monta(2, extra=b"\x00" * 64),     # dados após o corpo
    "s11-nome-curto":  struct.pack("<IHHI", MAGIA, VERSAO, 2, 32)
                       + b"ab" + b"\x00" * 14 + b"cd" + b"\x00" * 14,
}

for nome, dados in casos.items():
    with open(os.path.join(saida, nome), "wb") as f:
        f.write(dados)
    print(f"  {nome:18} {len(dados):6} bytes")

print(f"\n{len(casos)} sementes em {saida}/")
print("⚠ as sementes s6 e s5 ficam PERTO do limite — é a técnica do Módulo 5 do curso de fuzzing")
```

---

## 11.6 A tarefa

### Parte A — Construa o projeto (60 min)

```bash
mkdir -p ~/c-lab/projeto-final/{src,fuzz,test} && cd ~/c-lab/projeto-final

# 1. escreva src/mfym.h        (seção 11.1)
# 2. escreva src/mfym.c        (seção 11.2)
# 3. escreva fuzz/mfym_fuzzer.c (seção 11.3)
# 4. escreva test/mfym_test.c  (seção 11.4)
# 5. escreva test/gerar_corpus.py (seção 11.5)

# 6. o wrapper de linha de comando — NÃO é o alvo
cat > src/mfym_main.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "mfym.h"

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "uso: %s <arquivo>\n", argv[0]); return 2; }

    FILE *f = fopen(argv[1], "rb");
    if (!f) { perror("fopen"); return 3; }
    fseek(f, 0, SEEK_END); long fim = ftell(f); rewind(f);
    if (fim <= 0 || fim > 1024*1024) { fclose(f); return 0; }

    uint8_t *buf = malloc((size_t)fim);
    if (!buf) { fclose(f); return 3; }
    if (fread(buf, 1, (size_t)fim, f) != (size_t)fim) { free(buf); fclose(f); return 3; }
    fclose(f);

    MfymInfo info;
    int r = mfym_parse(buf, (size_t)fim, &info);
    if (r != MFYM_OK) { printf("recusado: %d\n", r); free(buf); return 1; }

    printf("ok: %u item(s)\n", info.n_itens);
    char nome[MFYM_ITEM_TAM];
    for (size_t i = 0; i < info.n_itens; i++) {
        int n = mfym_item_nome(buf, &info, i, nome, sizeof(nome));
        if (n >= 0) printf("  [%zu] '%s'\n", i, nome);
    }
    free(buf);
    return 0;
}
EOF

echo "estrutura:"
find . -type f | sort
```

### Parte B — `Makefile` do projeto (15 min)

```bash
cd ~/c-lab/projeto-final

cat > Makefile <<'EOF'
CC      = clang
GCC     = gcc
WARN    = -Wall -Wextra -Wformat=2 -Wstrict-prototypes -Wshadow \
          -Wconversion -Wsign-conversion -Wswitch-enum -Werror
STRICT  = -std=c17 -O2 $(WARN)
SAN     = -std=c17 -g -O1 $(WARN) -fsanitize=address,undefined -fno-omit-frame-pointer
FUZZ    = -std=c17 -g -O1 $(WARN) -fsanitize=fuzzer,address,undefined -fno-omit-frame-pointer
REL     = -std=c17 -O2 -D_FORTIFY_SOURCE=2 -fstack-protector-strong \
          -fPIE -pie -Wl,-z,relro,-z,now
VG      = -std=c17 -g -O0 -Wall -Wextra

BIN = bin
SRC = src
TST = test
FZZ = fuzz

all: $(BIN)/mfym $(BIN)/mfym_test $(BIN)/mfym_fuzz corpus

$(BIN):
	@mkdir -p $(BIN)

$(BIN)/mfym: $(SRC)/mfym.c $(SRC)/mfym_main.c | $(BIN)
	$(CC) $(SAN) -o $@ $^

$(BIN)/mfym_test: $(SRC)/mfym.c $(TST)/mfym_test.c | $(BIN)
	$(CC) $(SAN) -I$(SRC) -o $@ $^

$(BIN)/mfym_fuzz: $(SRC)/mfym.c $(FZZ)/mfym_fuzzer.c | $(BIN)
	$(CC) $(FUZZ) -I$(SRC) -o $@ $^

$(BIN)/mfym_rel: $(SRC)/mfym.c $(SRC)/mfym_main.c | $(BIN)
	$(CC) $(REL) -o $@ $^
	@readelf -s $@ 2>/dev/null | grep -q stack_chk_fail && echo "  ✓ canário" || echo "  ⚠ sem canário"
	@readelf -l $@ 2>/dev/null | grep -q GNU_RELRO && echo "  ✓ RELRO" || echo "  ⚠ sem RELRO"

$(BIN)/mfym_vg: $(SRC)/mfym.c $(SRC)/mfym_main.c | $(BIN)
	$(GCC) $(VG) -o $@ $^

corpus:
	python3 $(TST)/gerar_corpus.py $(FZZ)/corpus

test: $(BIN)/mfym_test
	$(BIN)/mfym_test

fuzz: $(BIN)/mfym_fuzz corpus
	$(BIN)/mfym_fuzz $(FZZ)/corpus -max_total_time=60 -print_final_stats=1

val: $(BIN)/mfym_vg corpus
	for f in $(FZZ)/corpus/*; do \
	    printf '%-24s ' "$$f"; \
	    valgrind -q --leak-check=full --error-exitcode=99 $(BIN)/mfym_vg $$f >/dev/null 2>&1 \
	      && echo "✓" || echo "⚠"; \
	done

clean:
	rm -rf $(BIN) $(FZZ)/corpus

.PHONY: all test fuzz val corpus clean
EOF

make all 2>&1 | tail -12
```

### Parte C — Rode os testes (20 min)

```bash
cd ~/c-lab/projeto-final

echo "═══ testes de unidade ═══"
make test

echo
echo "═══ ASan nos testes ═══"
./bin/mfym_test 2>&1 | tail -3

echo
echo "═══ valgrind nas sementes ═══"
make val 2>&1 | tail -14

echo
echo "═══ fuzzing (60 s) ═══"
make fuzz 2>&1 | tail -8
```

### Parte D — Documente (25 min)

Produza `README.md` do projeto com:

```markdown
# Parser MFYM v1

## O que é
## Formato (tabela de offsets)
## Como compilar
## Como testar
## Como fuzzar
## Decisões de projeto
| Decisão | Por quê | Alternativa considerada |
## Limites do formato
## O que este parser NÃO faz
## Próximo passo: fuzzing
```

E produza `relatorio.md` respondendo:

1. **Quais das quatro propriedades de fuzzingabilidade** o parser tem? Prove cada uma.
2. **Quantos testes passaram?** Algum falhou?
3. O `valgrind` acusou algo nas sementes?
4. O fuzzer achou crash em 60 s? **Se não, o que isso significa?**
5. **Qual verificação do parser é a mais importante?** Por quê?
6. Se você tivesse que remover uma verificação, qual seria a **menos** crítica? Por quê?
7. **O que você mudaria** no `mfym_item_nome` se pudesse refazer?
8. **Que entrada você acha que quebraria este parser?** Escreva o raciocínio.

⚠ **A pergunta 8 é a mais importante.** Você acabou de escrever o parser — **você sabe onde ele
pode falhar**. Escreva essa hipótese. É a semente da pesquisa que o curso de fuzzing formaliza.

⚠ **E a pergunta 4 tem resposta honesta:** se o fuzzer não achou em 60 s, **isso pode significar**
que o parser está correto — ou que o corpus não chegou perto. **As duas são respostas válidas, e
você declara qual você acha.**

---

## Critérios de aceitação

- Estrutura de diretórios **completa**: `src/`, `fuzz/`, `test/`.
- `mfym.h` com os **nove** códigos de retorno documentados.
- `mfym.c` compilando com **`-Werror`** e todas as flags — zero avisos.
- **Nenhuma função do parser aloca memória** — verificado por `grep -n 'malloc\|calloc\|realloc' src/mfym.c`.
- `mfym_fuzzer.c` exercitando **o caminho de item**, não só o cabeçalho.
- `mfym_test.c` com os **dez** testes, todos passando.
- `gerar_corpus.py` gerando as **onze** sementes, incluindo as **perto do limite**.
- `Makefile` com `all`, `test`, `fuzz`, `val`, `rel` funcionando.
- Testes passando **com ASan** e sem vazamento no `valgrind`.
- `README.md` com a tabela de decisões de projeto.
- `relatorio.md` com as **oito** respostas, incluindo **a hipótese de quebra**.
- O binário de release confirmado com `__stack_chk_fail` e `GNU_RELRO`.

---

## Avaliação

1. Cite as quatro propriedades de alvo fuzzável e como este projeto entrega cada uma.
2. Por que separar `mfym.c` de `mfym_main.c`? O que o fuzzer usa?
3. **Por que nenhuma função do parser aloca?** Qual classe de bug isso elimina?
4. Quais as **seis** verificações do `mfym_parse`, em ordem?
5. Por que a faixa de `n_itens` vem antes da multiplicação?
6. Por que `mfym_item_nome` devolve o comprimento em vez de alocar?
7. **Por que o harness precisa exercitar o caminho de item?** O que ele perde se não o fizer?
8. Descreva o `mfym_item_nome` quando o destino é pequeno. O que ele faz — trunca ou recusa?
9. Por que as sementes `s5` e `s6` ficam **perto do limite**?
10. Se o fuzzer não acha crash em 60 s, cite duas interpretações possíveis.
11. Qual a verificação **mais crítica** do parser? E a **menos**? Justifique.
12. Por que "escreva a entrada que quebraria" é a pergunta mais importante do relatório?

---

## Encerramento do curso

Você começou no `hello world` e termina com um parser que valida entrada hostil, tem contrato de
posse claro, compila com hardening, passa em ASan, `valgrind` e teste de unidade — e é **o alvo do
curso de fuzzing**.

O que você aprendeu não foi sintaxe de C. Foi **por que o C quebra** — e as sete formas pelas quais
ele quebra, e o que fazer com cada uma.

| # | O que fica |
|---|---|
| 1 | **"Funcionou" não é prova de nada em C.** Você precisa saber **por que** funcionou. |
| 2 | **UB não é "resultado errado"** — é "nenhuma garantia", e o compilador pode eliminar seu código. |
| 3 | **Toda validação vem antes da operação**, e cobre **origem e destino**. |
| 4 | **Sem alocação, não há vazamento** — o contrato de posse mais simples é não ter dono. |
| 5 | **Você confirma o hardening no binário**, não na flag. |

⚠ **E a ponte para o próximo curso.** O parser que você escreveu aqui é o que o **Módulo 1 do curso
de fuzzing** vai fazer você fuzzar. **Os bugs que ele tem são os que você vai achar** — e agora você
sabe onde eles podem estar, porque foi você que escreveu.

Referências para continuar: **ISO/IEC 9899** (draft `n2310`) · **LLVM UB Manual** ·
**CERT C Coding Standard** · **"Modern C"** (Gustedt, livre) · **"Expert C Programming"**
(van der Linden) · **AddressSanitizer** e **UBSan** docs · **Valgrind Manual** ·
**OpenSecurityTraining2 `Vulns1001`/`Vulns1002`**
