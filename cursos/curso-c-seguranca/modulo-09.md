# Módulo 9 — Arquivo, Binário e Parsing

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Ler arquivo em modo binário e texto, e saber quando cada um.
2. Ler um formato binário de verdade, campo por campo.
3. Validar cabeçalho **antes** de usar qualquer campo.
4. Tratar erro de I/O sem deixar o estado inconsistente.
5. Preparar o alvo para o módulo 11 — que é o do curso de fuzzing.

---

## 9.1 Modo texto versus modo binário

⚠ **A diferença que não aparece em Linux, e destrói no Windows.**

```bash
cd ~/c-lab/src

cat > modo.c <<'EOF'
#include <stdio.h>
#include <string.h>

int main(void) {
    const char *dados = "a\nb\nc\n";        /* 6 bytes */
    unsigned char buf[16];

    printf("═══ escrita em modo TEXTO ═══\n");
    FILE *ft = fopen("../tmp/texto.txt", "w");
    if (!ft) return 1;
    fwrite(dados, 1, 6, ft);
    fclose(ft);

    printf("═══ escrita em modo BINÁRIO ═══\n");
    FILE *fb = fopen("../tmp/binario.bin", "wb");
    if (!fb) return 1;
    fwrite(dados, 1, 6, fb);
    fclose(fb);

    printf("\n═══ lendo os dois como binário ═══\n");
    for (const char *nome = "texto.txt"; nome; nome = NULL) {
        FILE *f = fopen("../tmp/texto.txt", "rb");
        if (!f) break;
        size_t n = fread(buf, 1, sizeof(buf), f);
        fclose(f);
        printf("  %-12s %zu bytes: ", "texto.txt", n);
        for (size_t i = 0; i < n; i++) printf("%02x ", buf[i]);
        printf("\n");
    }

    FILE *f = fopen("../tmp/binario.bin", "rb");
    if (f) {
        size_t n = fread(buf, 1, sizeof(buf), f);
        fclose(f);
        printf("  %-12s %zu bytes: ", "binario.bin", n);
        for (size_t i = 0; i < n; i++) printf("%02x ", buf[i]);
        printf("\n");
    }

    printf("\n═══ a diferença ═══\n");
    printf("  em LINUX os dois bytes são idênticos (0a)\n");
    printf("  ⚠ em WINDOWS, modo texto converte \\n para \\r\\n — 6 bytes viram 8\n");
    printf("  ⚠ por isso: SEMPRE 'b' em arquivo binário\n");
    printf("  ⚠ o 'b' não custa nada em Linux e é OBRIGATÓRIO no Windows\n");

    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/modo modo.c && ../bin/modo
```

⚠ **A regra:** **todo arquivo que não é texto legível abre com `"rb"`.** O `b` é ignorado em Linux e
essencial em Windows. Não colocar é bug que **não aparece** até o código chegar em Windows.

---

## 9.2 Lendo arquivo — o formato robusto

```bash
cat > ler.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/*
 * Lê arquivo inteiro em buffer alocado.
 * Devolve: 0 = ok
 *         -1 = argumento inválido
 *         -2 = não abriu
 *         -3 = falha ao medir tamanho
 *         -4 = malloc falhou
 *         -5 = leitura incompleta
 *
 * CONTRATO: em sucesso, `*saida` é alocado e quem chama DEVE liberar.
 *           em falha, `*saida` é NULL.
 */
int ler_arquivo(const char *caminho, uint8_t **saida, size_t *tamanho) {
    if (!caminho || !saida || !tamanho) return -1;

    *saida   = NULL;
    *tamanho = 0;

    FILE *f = fopen(caminho, "rb");                    /* ⚠ 'rb' */
    if (!f) return -2;

    /* medir */
    if (fseek(f, 0, SEEK_END) != 0) { fclose(f); return -3; }
    long fim = ftell(f);
    if (fim < 0) { fclose(f); return -3; }
    if (fseek(f, 0, SEEK_SET) != 0) { fclose(f); return -3; }

    size_t n = (size_t)fim;
    if (n == 0) { fclose(f); return 0; }               /* arquivo vazio: ok, NULL */

    uint8_t *buf = malloc(n);
    if (!buf) { fclose(f); return -4; }                /* ✓ libera em falha */

    size_t lidos = fread(buf, 1, n, f);
    fclose(f);

    if (lidos != n) {                                  /* ✓ leitura parcial */
        free(buf);
        return -5;
    }

    *saida   = buf;
    *tamanho = n;
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "uso: %s <arquivo>\n", argv[0]); return 2; }

    uint8_t *dados; size_t n;
    int r = ler_arquivo(argv[1], &dados, &n);

    switch (r) {
        case  0: printf("lido %zu bytes\n", n); break;
        case -1: printf("argumento inválido\n"); return 1;
        case -2: printf("não abriu\n"); return 1;
        case -3: printf("falha ao medir\n"); return 1;
        case -4: printf("malloc falhou\n"); return 1;
        case -5: printf("leitura incompleta\n"); return 1;
        default: printf("erro desconhecido\n"); return 1;
    }

    if (dados) {
        printf("primeiros 16 bytes: ");
        for (size_t i = 0; i < 16 && i < n; i++) printf("%02x ", dados[i]);
        printf("\n");
        free(dados);                                   /* ✓ quem chamou é dono */
    }
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/ler ler.c

echo "═══ arquivo real ═══"
../bin/ler modo.c | head -3

echo
echo "═══ arquivo vazio ═══"
: > ../tmp/vazio.bin
../bin/ler ../tmp/vazio.bin

echo
echo "═══ arquivo inexistente ═══"
../bin/ler ../tmp/nao-existe.bin

echo
echo "═══ sem argumento ═══"
../bin/ler; echo "  código: $?"

echo
echo "═══ ASan confirma ausência de vazamento em todos os caminhos ═══"
clang -g -O1 -fsanitize=address -o ../bin/ler_asan ler.c
for a in modo.c ../tmp/vazio.bin ../tmp/nao-existe.bin; do
    printf '  %-24s ' "${a}"
    ../bin/ler_asan "${a}" >/dev/null 2>&1 && echo "✓" || echo "✗"
done
```

⚠ **Note que a função tem seis códigos de retorno** e cada um limpa o que alocou. **É o padrão que
o módulo 11 vai exigir.**

⚠ **E note o `fseek`/`ftell` para medir.** Ele funciona para arquivo comum e **falha para `stdin`,
para pipe e para `/proc`** — que não têm tamanho. Para esses casos, você lê em blocos até EOF. **O
módulo 11 trata os dois casos.**

---

## 9.3 Validar cabeçalho antes de usar

⚠ **Esta é a seção que o curso de fuzzing depende.**

```bash
cat > validar.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAGIA 0x4D59464D        /* "MFYM" */
#define MAX_ITENS 1024
#define ITEM_TAM  16

typedef struct {
    uint32_t magia;
    uint16_t versao;
    uint16_t n_itens;
    uint32_t tamanho;
} Cabecalho;

/*
 * Valida o cabeçalho contra o buffer REAL.
 * Devolve: 0 = ok, <0 = motivo da recusa.
 */
int validar_cabecalho(const uint8_t *buf, size_t len,
                      const Cabecalho **cab, size_t *corpo_offset) {
    if (!buf || !cab || !corpo_offset) return -1;

    /* 1. cabe o cabeçalho? */
    if (len < sizeof(Cabecalho)) return -2;

    const Cabecalho *c = (const Cabecalho *)buf;   /* ⚠ cast: cuidar do alinhamento */

    /* 2. a magia bate? */
    if (c->magia != MAGIA) return -3;

    /* 3. a versão é conhecida? */
    if (c->versao != 1) return -4;

    /* 4. n_itens está em faixa? */
    if (c->n_itens > MAX_ITENS) return -5;

    /* 5. o tamanho declarado bate com o real? */
    size_t esperado = (size_t)c->n_itens * ITEM_TAM;
    if (c->tamanho != esperado) return -6;

    /* 6. o corpo cabe no buffer? */
    if (esperado > len - sizeof(Cabecalho)) return -7;

    *cab          = c;
    *corpo_offset = sizeof(Cabecalho);
    return 0;
}

const char *motivo(int r) {
    switch (r) {
        case  0: return "ok";
        case -1: return "argumento inválido";
        case -2: return "buffer menor que o cabeçalho";
        case -3: return "magia errada";
        case -4: return "versão desconhecida";
        case -5: return "n_itens acima do máximo";
        case -6: return "tamanho declarado não bate";
        case -7: return "corpo não cabe no buffer";
        default: return "desconhecido";
    }
}

int main(void) {
    uint8_t buf[256];
    size_t  corpo = 0;
    const Cabecalho *c = NULL;
    int r;

    printf("═══ 1. cabeçalho válido ═══\n");
    memset(buf, 0, sizeof(buf));
    Cabecalho ch = { MAGIA, 1, 4, 4 * ITEM_TAM };
    memcpy(buf, &ch, sizeof(ch));
    r = validar_cabecalho(buf, 64 + sizeof(ch), &c, &corpo);
    printf("  r=%d (%s)\n\n", r, motivo(r));

    printf("═══ 2. buffer pequeno demais ═══\n");
    r = validar_cabecalho(buf, 4, &c, &corpo);
    printf("  r=%d (%s)\n\n", r, motivo(r));

    printf("═══ 3. magia errada ═══\n");
    buf[0] ^= 0xFF;
    r = validar_cabecalho(buf, 256, &c, &corpo);
    printf("  r=%d (%s)\n\n", r, motivo(r));
    buf[0] ^= 0xFF;

    printf("═══ 4. versão desconhecida ═══\n");
    ((Cabecalho *)buf)->versao = 99;
    r = validar_cabecalho(buf, 256, &c, &corpo);
    printf("  r=%d (%s)\n\n", r, motivo(r));
    ((Cabecalho *)buf)->versao = 1;

    printf("═══ 5. n_itens absurdo ═══\n");
    ((Cabecalho *)buf)->n_itens = 60000;
    r = validar_cabecalho(buf, 256, &c, &corpo);
    printf("  r=%d (%s)\n\n", r, motivo(r));
    ((Cabecalho *)buf)->n_itens = 4;

    printf("═══ 6. tamanho declarado incoerente ═══\n");
    ((Cabecalho *)buf)->tamanho = 999999;
    r = validar_cabecalho(buf, 256, &c, &corpo);
    printf("  r=%d (%s)\n\n", r, motivo(r));
    ((Cabecalho *)buf)->tamanho = 4 * ITEM_TAM;

    printf("═══ 7. corpo não cabe ═══\n");
    r = validar_cabecalho(buf, sizeof(Cabecalho) + 8, &c, &corpo);
    printf("  r=%d (%s)\n\n", r, motivo(r));

    printf("═══ o mesmo buffer, agora válido ═══\n");
    r = validar_cabecalho(buf, 256, &c, &corpo);
    printf("  r=%d (%s)  corpo em offset %zu\n", r, motivo(r), corpo);

    return 0;
}
EOF

gcc -Wall -Wextra -Wconversion -g -O0 -o ../bin/validar validar.c 2>&1 | head -6
../bin/validar
```

### As sete verificações, e por que cada uma

| # | Verificação | O que previne |
|---|---|---|
| 1 | **Buffer cabe o cabeçalho** | Ler além do fim |
| 2 | **Magia bate** | Processar formato errado |
| 3 | **Versão conhecida** | Interpretar campo de outra versão |
| 4 | **`n_itens` em faixa** | Integer overflow, alocação absurda |
| 5 | **Tamanho declarado bate com o real** | Cálculo inconsistente |
| 6 | **Corpo cabe no buffer** | Ler além do fim |
| 7 | (implícita) **`n_itens × tam` não estoura** | Overflow na multiplicação |

⚠ **A verificação 7 é implícita na 5.** Note que o `esperado = n_itens * ITEM_TAM` é calculado em
`size_t` — e `n_itens` já foi limitado a `MAX_ITENS` na 4. **A ordem das verificações importa:** a 4
**antes** da 5 evita o overflow na multiplicação.

⚠ **A ordem é a lição mais importante do módulo.** Validar em ordem errada: você calcula
`n_itens * 16` com `n_itens = 60000` e o resultado é válido — mas com `n_itens = 0x40000000` seria
overflow. **A faixa primeiro, o cálculo depois.**

⚠ **E note o cast `(const Cabecalho *)buf`.** Ele assume que `buf` está alinhado para `uint32_t`.
O `malloc` garante isso; um `buf` obtido de `&dados[3]` **não** — e é aliasing/alinhamento, que é
UB. **A forma portável é `memcpy` campo por campo**, e o módulo 11 usa essa.

---

## 9.4 Erro de I/O sem deixar estado inconsistente

⚠ **O padrão que evita o vazamento no caminho de erro.**

```bash
cat > io_erro.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <errno.h>

/*
 * ⚠ Padrão ERRADO: aloca, e libera em cada caminho de erro separadamente.
 * Fácil de esquecer um.
 */
int errado(const char *caminho, uint8_t **saida) {
    FILE *f = fopen(caminho, "rb");
    if (!f) return -1;

    uint8_t *buf = malloc(1024);
    if (!buf) { fclose(f); return -2; }

    if (fread(buf, 1, 1024, f) != 1024) {
        /* ⚠ esqueceu o free(buf) aqui — VAZAMENTO */
        fclose(f);
        return -3;
    }

    *saida = buf;
    fclose(f);
    return 0;
}

/*
 * ✓ Padrão CERTO: um único ponto de saída, com rótulo.
 */
int certo(const char *caminho, uint8_t **saida) {
    if (!caminho || !saida) return -1;
    *saida = NULL;

    FILE   *f   = NULL;
    uint8_t *buf = NULL;
    int     r   = 0;

    f = fopen(caminho, "rb");
    if (!f) { r = -2; goto fim; }

    buf = malloc(1024);
    if (!buf) { r = -3; goto fim; }

    if (fread(buf, 1, 1024, f) != 1024) { r = -4; goto fim; }

    *saida = buf;
    buf    = NULL;              /* ✓ transfere a posse: não libera no `fim` */

fim:
    free(buf);                  /* ✓ tolera NULL */
    if (f) fclose(f);
    return r;
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    uint8_t *a = NULL, *b = NULL;

    int ra = errado(argv[1], &a);
    int rb = certo(argv[1],  &b);

    printf("errado: r=%d  saida=%s\n", ra, a ? "alocada" : "NULL");
    printf("certo:  r=%d  saida=%s\n", rb, b ? "alocada" : "NULL");

    free(a);
    free(b);
    return 0;
}
EOF

gcc -Wall -Wextra -g -O0 -o ../bin/io_erro io_erro.c
echo "═══ com arquivo pequeno (força o erro de leitura) ═══"
echo "curto" > ../tmp/curto.bin
../bin/io_erro ../tmp/curto.bin

echo
echo "═══ ASan: qual vaza? ═══"
clang -g -O1 -fsanitize=address -o ../bin/io_erro_asan io_erro.c 2>/dev/null
../bin/io_erro_asan ../tmp/curto.bin 2>&1 | grep -E 'LeakSanitizer|SUMMARY|lost' | head -6
```

⚠ **O padrão `goto fim` é a forma consagrada em C** — é como o próprio kernel Linux escreve código
com muitos caminhos de erro. **Compare com a alternativa:** quatro `free` separados, um por
caminho. **Você vai esquecer um.**

⚠ **E note o `buf = NULL` depois de `*saida = buf`.** É a transferência de posse: o `free(buf)` no
`fim` não libera o que já foi entregue. **Sem essa linha, você liberaria o que devolveu** — e o
chamador teria um ponteiro pendurado.

⚠ **O rótulo e o `goto` são a exceção legítima à regra de evitar `goto`.** Em C, para limpeza,
eles **reduzem** bug.

---

## 9.5 LAB — Parser com validação completa

**Duração:** 75 min

### Passo 1 — Escreva o parser (40 min)

```bash
cd ~/c-lab/src

cat > lab9.c <<'EOF'
/*
 * Parser do formato MFYM v1 — com validação completa.
 *
 * Formato:
 *   offset 0 : magia    uint32 = 0x4D59464D
 *   offset 4 : versao   uint16 = 1
 *   offset 6 : n_itens  uint16 <= 1024
 *   offset 8 : tamanho  uint32 = n_itens * 16
 *   offset 12: itens[n_itens], cada um de 16 bytes
 *
 * Devolve: 0 = ok, <0 = recusa.
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

/* ✓ leitura portável: sem cast de ponteiro, sem problema de alinhamento */
static uint32_t le_u32(const uint8_t *p) {
    uint32_t v;
    memcpy(&v, p, sizeof(v));
    return v;
}
static uint16_t le_u16(const uint8_t *p) {
    uint16_t v;
    memcpy(&v, p, sizeof(v));
    return v;
}

int parse(const uint8_t *buf, size_t len, size_t *n_itens_out) {
    if (!buf || !n_itens_out) return -1;
    *n_itens_out = 0;

    /* 1. cabe o cabeçalho? */
    if (len < CAB_TAM)                  return -2;

    /* 2. magia */
    if (le_u32(buf) != MAGIA)           return -3;

    /* 3. versão */
    uint16_t versao = le_u16(buf + 4);
    if (versao != VERSAO)               return -4;

    /* 4. n_itens em faixa — ANTES de multiplicar */
    uint16_t n = le_u16(buf + 6);
    if (n > MAX_ITENS)                  return -5;

    /* 5. tamanho declarado bate? (multiplicação segura: n <= 1024) */
    uint32_t tam_declarado = le_u32(buf + 8);
    size_t   tam_esperado  = (size_t)n * ITEM_TAM;
    if ((size_t)tam_declarado != tam_esperado) return -6;

    /* 6. corpo cabe no buffer? */
    if (tam_esperado > len - CAB_TAM)   return -7;

    *n_itens_out = n;
    return 0;
}

const char *motivo(int r) {
    switch (r) {
        case  0: return "ok";
        case -1: return "argumento inválido";
        case -2: return "buffer < cabeçalho";
        case -3: return "magia errada";
        case -4: return "versão desconhecida";
        case -5: return "n_itens > máximo";
        case -6: return "tamanho não bate";
        case -7: return "corpo não cabe";
        default: return "desconhecido";
    }
}

static void monta(uint8_t *buf, size_t *len, uint32_t magia, uint16_t versao,
                  uint16_t n, uint32_t tam) {
    memset(buf, 0, 4096);
    memcpy(buf + 0, &magia,  4);
    memcpy(buf + 4, &versao, 2);
    memcpy(buf + 6, &n,      2);
    memcpy(buf + 8, &tam,    4);
    *len = (size_t)CAB_TAM + (size_t)n * ITEM_TAM;
}

int main(void) {
    uint8_t buf[4096];
    size_t  len = 0, n = 0;
    int     r;

    struct { const char *nome; uint32_t m; uint16_t v; uint16_t n; uint32_t t; size_t l; } casos[] = {
        { "válido (n=4)",        MAGIA, 1,    4,  4 * ITEM_TAM, 0 },
        { "válido (n=0)",        MAGIA, 1,    0,  0,            0 },
        { "magia errada",        0xDEAD, 1,   4,  4 * ITEM_TAM, 0 },
        { "versão 99",           MAGIA, 99,   4,  4 * ITEM_TAM, 0 },
        { "n=2000 (acima)",      MAGIA, 1, 2000, 2000 * ITEM_TAM, 0 },
        { "tam incoerente",      MAGIA, 1,    4,  999,          0 },
        { "buffer curto",        MAGIA, 1,    4,  4 * ITEM_TAM, CAB_TAM + 8 },
        { "só o cabeçalho",      MAGIA, 1,    0,  0,            CAB_TAM },
    };

    for (size_t i = 0; i < sizeof(casos)/sizeof(casos[0]); i++) {
        monta(buf, &len, casos[i].m, casos[i].v, casos[i].n, casos[i].t);
        if (casos[i].l) len = casos[i].l;

        r = parse(buf, len, &n);
        printf("  %-18s len=%-5zu r=%2d (%s)%s\n",
               casos[i].nome, len, r, motivo(r),
               r == 0 ? "" : "   ← recusado");
    }

    return 0;
}
EOF

gcc -Wall -Wextra -Wconversion -Werror -g -O0 -o ../bin/lab9 lab9.c && echo "✓ zero avisos" && ../bin/lab9
```

Produza `lab9-casos.md`:

| Caso | `len` | `r` | Recusado? | Verificação que pegou |
|---|---|---|---|---|
| válido n=4 | | | | |
| válido n=0 | | | | |
| magia errada | | | | |
| versão 99 | | | | |
| n=2000 | | | | |
| tam incoerente | | | | |
| buffer curto | | | | |
| só cabeçalho | | | | |

**Responda:**

1. **Todos os oito casos deram o resultado esperado?**
2. Qual verificação pegou o caso `n=2000`? **E se ela viesse depois da multiplicação?**
3. Por que `le_u32` com `memcpy` e **não** com cast de ponteiro?
4. O caso `n=0` é recusado ou aceito? **Está correto?**

⚠ **A resposta 2 é o núcleo do módulo.** Se a verificação de faixa viesse **depois** do cálculo,
`2000 * 16 = 32000` não estouraria — mas `0x40000000 * 16` estouraria. **A ordem protege o cálculo.**

### Passo 2 — Teste com arquivo real e com ASan (20 min)

```bash
cd ~/c-lab/src

# Gere arquivos para cada caso, com python
python3 - <<'PY'
import struct, os
os.makedirs("../tmp/mfym", exist_ok=True)

def escreve(nome, magia, versao, n, tam, corpo_extra=0):
    cab = struct.pack("<IHHI", magia, versao, n, tam)
    corpo = b"\x41" * (n * 16 + corpo_extra)
    open(f"../tmp/mfym/{nome}", "wb").write(cab + corpo)

escreve("valido.bin",      0x4D59464D, 1, 4, 64)
escreve("magia-errada.bin",0xDEADBEEF, 1, 4, 64)
escreve("versao-99.bin",   0x4D59464D, 99, 4, 64)
escreve("n-grande.bin",    0x4D59464D, 1, 2000, 32000)
escreve("curto.bin",       0x4D59464D, 1, 4, 64, corpo_extra=-60)
escreve("vazio.bin",       0x4D59464D, 1, 0, 0)

print("arquivos criados:")
for f in sorted(os.listdir("../tmp/mfym")):
    print(f"  {f:22} {os.path.getsize('../tmp/mfym/'+f)} bytes")
PY
```

⚠ **Melhor ainda: fuzzar de verdade.** Mas isso é o curso de fuzzing — aqui, você **valida
manualmente** e confirma com ASan:

```bash
clang -g -O1 -fsanitize=address,undefined -o ../bin/lab9_asan lab9.c
../bin/lab9_asan 2>&1 | tail -3

echo
echo "═══ e com o leitor de arquivo do módulo 9 ═══"
cat > lab9-arq.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAGIA 0x4D59464D
int parse(const uint8_t *buf, size_t len, size_t *n_out);

int ler(const char *caminho, uint8_t **saida, size_t *n) {
    if (!caminho || !saida || !n) return -1;
    *saida = NULL; *n = 0;
    FILE *f = fopen(caminho, "rb");
    if (!f) return -2;
    if (fseek(f, 0, SEEK_END) != 0) { fclose(f); return -3; }
    long fim = ftell(f);
    if (fim < 0) { fclose(f); return -3; }
    rewind(f);
    size_t tam = (size_t)fim;
    if (tam == 0) { fclose(f); return 0; }
    uint8_t *b = malloc(tam);
    if (!b) { fclose(f); return -4; }
    if (fread(b, 1, tam, f) != tam) { free(b); fclose(f); return -5; }
    fclose(f);
    *saida = b; *n = tam;
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;
    uint8_t *d; size_t n;
    int r = ler(argv[1], &d, &n);
    if (r != 0) { printf("  leitura: r=%d\n", r); return 1; }

    size_t ni = 0;
    int p = parse(d, n, &ni);
    printf("  %-24s len=%-6zu parse=%2d\n", argv[1], n, p);
    free(d);
    return 0;
}
EOF

# O parse precisa estar acessível: compile os dois juntos
sed -n '/^int parse/,/^}/p' lab9.c > /tmp/parse.inc
cat > /tmp/parse-impl.c <<'PYEOF'
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#define MAGIA      0x4D59464D
#define VERSAO     1
#define MAX_ITENS  1024
#define ITEM_TAM   16
#define CAB_TAM    12
static uint32_t le_u32(const uint8_t *p){uint32_t v;memcpy(&v,p,4);return v;}
static uint16_t le_u16(const uint8_t *p){uint16_t v;memcpy(&v,p,2);return v;}
int parse(const uint8_t *buf, size_t len, size_t *n_itens_out) {
    if (!buf || !n_itens_out) return -1;
    *n_itens_out = 0;
    if (len < CAB_TAM) return -2;
    if (le_u32(buf) != MAGIA) return -3;
    if (le_u16(buf + 4) != VERSAO) return -4;
    uint16_t n = le_u16(buf + 6);
    if (n > MAX_ITENS) return -5;
    uint32_t td = le_u32(buf + 8);
    if ((size_t)td != (size_t)n * ITEM_TAM) return -6;
    if ((size_t)n * ITEM_TAM > len - CAB_TAM) return -7;
    *n_itens_out = n;
    return 0;
}
PYEOF

gcc -Wall -Wextra -g -O0 -o ../bin/lab9-arq lab9-arq.c /tmp/parse-impl.c
clang -g -O1 -fsanitize=address,undefined -o ../bin/lab9-arq_asan lab9-arq.c /tmp/parse-impl.c

echo
for f in ../tmp/mfym/*.bin; do
    printf '  %-22s ' "$(basename "$f")"
    ../bin/lab9-arq_asan "$f" 2>&1 | head -1
done
```

Produza `lab9-arquivo.md`:

| Arquivo | `len` | `parse` | Recusado? | ASan acusou? |
|---|---|---|---|---|
| `valido.bin` | | | | |
| `magia-errada.bin` | | | | |
| `versao-99.bin` | | | | |
| `n-grande.bin` | | | | |
| `curto.bin` | | | | |
| `vazio.bin` | | | | |

**Responda:**

1. **Todos os arquivos foram tratados sem crashar?** O ASan acusou algo?
2. O `vazio.bin` tem só o cabeçalho. Foi aceito?
3. **Se você removesse a verificação de faixa**, o `n-grande.bin` causaria problema? Teste.
4. Por que o `parse` **não** aloca nada? Qual a vantagem?

⚠ **A resposta 4 é a chave do módulo 11.** Um `parse` que **só valida** e **não aloca** é puro,
determinístico e **trivialmente fuzzável** — sem estado, sem vazamento, sem contrato de posse. **É
o formato ideal de alvo.**

### Passo 3 — Documente o contrato (15 min)

Produza `lab9-contrato.md`:

```markdown
# Contrato do parser MFYM v1

## Entrada
- `buf`: ponteiro para bytes. NÃO é dono. Pode ser NULL.
- `len`: tamanho em bytes.
- `n_item_out`: ponteiro para saída. Pode ser NULL (e aí devolve erro).

## Saída
- `*n_item_out`: número de itens, só se r == 0.

## Aloca?
[ ] sim  [ ] não

## Estado global?
[ ] sim  [ ] não

## Determinístico?
[ ] sim  [ ] não

## Códigos de retorno
| Código | Significado | Verificação |
|---|---|---|
| 0 | | |
| -1 | | |
| -2 | | |
| -3 | | |
| -4 | | |
| -5 | | |
| -6 | | |
| -7 | | |

## Limites do formato
- n_itens: 0 a ____
- tamanho total máximo: ____ bytes
- versão suportada: ____

## O que este parser NÃO faz
⚠ Liste o que ele deliberadamente não faz.
```

**Responda:**

1. **Este parser é determinístico?** Ele depende de algo externo?
2. Ele tem estado global? **Por que isso importa para fuzzing?**
3. **Ele aloca memória?** Por que a resposta é boa notícia?
4. Que formato de alvo o curso de fuzzing prefere? **Este se encaixa?**

⚠ **A resposta 4 é literal.** O módulo 11 vai entregar este parser como alvo — e as quatro
propriedades que o curso de fuzzing exige (lê de buffer, determinístico, rápido, sem estado) estão
satisfeitas.

### Critérios de aceitação

- `lab9.c` compilando com `-Wconversion -Werror` — **zero avisos**.
- `lab9-casos.md` com os **oito** casos e a verificação que pegou cada um.
- Você explicou por que a verificação de faixa vem **antes** da multiplicação.
- Você usou `memcpy` em vez de cast de ponteiro para ler os campos, e explicou por quê.
- `lab9-arquivo.md` com os seis arquivos processados **sem crash**.
- Você testou **removendo** uma verificação e relatou o efeito.
- `lab9-contrato.md` completo, com os oito códigos de retorno.
- Você respondeu as quatro propriedades de fuzzingabilidade.

---

## Avaliação

1. Qual a diferença entre modo texto e binário? Por que `"rb"` sempre?
2. Por que a diferença não aparece em Linux e aparece em Windows?
3. Por que `fseek`/`ftell` falha para `stdin` e pipe? O que fazer nesse caso?
4. Descreva o contrato de `ler_arquivo`: quem libera, e o que acontece em falha.
5. Cite as sete verificações de cabeçalho, e o que cada uma previne.
6. **Por que a verificação de faixa vem antes da multiplicação?** O que mudaria invertendo?
7. Por que ler campo com `memcpy` e não com cast de ponteiro?
8. O que é o cast `(const Cabecalho *)buf` assumindo? Quando ele é UB?
9. Explique o padrão `goto fim` para limpeza. Por que ele **reduz** bug?
10. Por que `buf = NULL` depois de `*saida = buf`? O que aconteceria sem isso?
11. Por que `goto` para limpeza é exceção legítima à regra de evitar `goto`?
12. Por que um `parse` que não aloca é melhor alvo de fuzzing?
13. Cite as quatro propriedades que um alvo fuzzável precisa. Este parser tem todas?

---

**Próximo:** [Módulo 10 — C que resiste a entrada hostil](modulo-10.md)
