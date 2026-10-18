# Alvos do Curso — Código Completo

Todos os alvos são **compilados por você**, com bug deliberado, para laboratório local.

⚠ **Nenhum alvo é fuzável contra terceiro.** O servidor do módulo 8 escuta **apenas** em
`127.0.0.1` — trava deliberada no código.

---

## Como usar

```bash
mkdir -p ~/fuzz-lab/{alvos,harnesses,corpus,findings,triagem}
cd ~/fuzz-lab
# copie cada alvo para alvos/, compile conforme o módulo indica
```

---

## Índice dos alvos

| Alvo | Módulo | Bug | Classe |
|---|---|---|---|
| `mapa.c` | 1 | — (demonstração de layout) | — |
| `frame.c` | 1 | `strcpy` sem limite | stack overflow |
| `silencioso.c` | 1 | corrupção de variável vizinha | stack overflow silencioso |
| `parser.c` | 1, 4 | `num_itens` e destino sem validação | heap overflow |
| `intoverflow.c` | 2 | multiplicação em `uint32_t` | integer overflow |
| `stack_ovf.c` | 3 | `strcpy` em struct | stack overflow |
| `heap_ovf.c` | 3 | aloca `len`, escreve `2×len` | heap overflow |
| `uaf.c` | 3 | uso após `free` | use-after-free |
| `int_e_heap.c` | 3 | overflow → alocação pequena | integer → heap |
| `type_confusion.cpp` | 3 | `reinterpret_cast` cego | type confusion |
| `servidor.c` | 8 | `strcpy` sem limite em `ultimo_valor` | global overflow |

---

## 1. `mapa.c` — layout de memória (módulo 1)

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int global_iniciado = 42;
int global_zerado;
static const char *msg = "literal";

int main(void) {
    int   local = 7;
    char *heap  = malloc(32);
    strcpy(heap, "no heap");

    printf("código (main):      %p\n", (void *)main);
    printf("literal (.rodata):  %p\n", (void *)msg);
    printf(".data:              %p\n", (void *)&global_iniciado);
    printf(".bss:               %p\n", (void *)&global_zerado);
    printf("heap (malloc):      %p\n", (void *)heap);
    printf("stack (&local):     %p\n", (void *)&local);

    free(heap);
    return 0;
}
```

```bash
gcc -no-pie -o alvos/mapa alvos/mapa.c && ./alvos/mapa
```

---

## 2. `frame.c` — stack frame (módulo 1)

```c
#include <stdio.h>

void alvo(char *entrada) {
    char buffer[16];
    int  depois = 0x41414141;

    printf("&buffer   = %p\n", (void *)buffer);
    printf("&depois   = %p   (valor: 0x%x)\n", (void *)&depois, depois);
    printf("&entrada  = %p\n", (void *)&entrada);

    strcpy(buffer, entrada);           /* ⚠ BUG DELIBERADO */

    printf("depois    = 0x%x  (mudou? %s)\n", depois,
           depois == 0x41414141 ? "não" : "SIM — corrompido");
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "uso: %s <texto>\n", argv[0]); return 2; }
    alvo(argv[1]);
    return 0;
}
```

```bash
gcc -no-pie -fno-stack-protector -o alvos/frame alvos/frame.c
```

---

## 3. `silencioso.c` — corrupção silenciosa (módulo 1)

```c
#include <stdio.h>
#include <string.h>

int main(int argc, char **argv) {
    int  autenticado = 0;
    char nome[8];

    if (argc < 2) return 2;
    strcpy(nome, argv[1]);             /* ⚠ BUG DELIBERADO */

    if (autenticado)
        printf("⚠ ACESSO LIBERADO (autenticado = %d)\n", autenticado);
    else
        printf("negado (autenticado = %d)\n", autenticado);
    return 0;
}
```

```bash
gcc -no-pie -fno-stack-protector -O0 -o alvos/silencioso alvos/silencioso.c
```

---

## 4. `parser.c` e `parser_lib.c` — o alvo central

⚠ **Compilado com `-g` é obrigatório** — o módulo 11 depende dos símbolos.

### Versão com `main` (módulo 1)

```c
/* alvos/parser.c — CATEGORIA: alvo com bug deliberado */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct {
    uint8_t  magic[4];
    uint16_t versao;
    uint16_t num_itens;
    uint32_t tamanho;
} Cabecalho;

/* ⚠ BUG 1: num_itens não validado contra len
   ⚠ BUG 2: escreve além dos 64 bytes de dest */
int parse(const uint8_t *buf, size_t len, char **saida) {
    if (len < sizeof(Cabecalho)) return -1;
    const Cabecalho *c = (const Cabecalho *)buf;
    if (memcmp(c->magic, "FMT1", 4) != 0) return -1;

    char *dest = malloc(64);
    if (!dest) return -1;

    for (int i = 0; i < c->num_itens; i++)
        memcpy(dest + i * 8, buf + sizeof(Cabecalho) + i * 8, 8);

    *saida = dest;
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "uso: %s <arquivo>\n", argv[0]); return 2; }
    FILE *f = fopen(argv[1], "rb");
    if (!f) { perror("fopen"); return 3; }
    fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET);
    uint8_t *buf = malloc(n > 0 ? (size_t)n : 1);
    if (fread(buf, 1, (size_t)n, f) != (size_t)n) { fclose(f); free(buf); return 3; }
    fclose(f);

    char *saida = NULL;
    int r = parse(buf, (size_t)n, &saida);
    printf("resultado: %d\n", r);
    free(saida); free(buf);
    return 0;
}
```

### Versão refatorada (módulos 4 a 12)

⚠ **A diferença:** sem `main`, com `saida` opcional. É o que torna fuzzável.

```c
/* alvos/parser_lib.c — versão fuzzável */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct {
    uint8_t  magic[4];
    uint16_t versao;
    uint16_t num_itens;
    uint32_t tamanho;
} Cabecalho;

int parse(const uint8_t *buf, size_t len, char **saida) {
    if (saida) *saida = NULL;
    if (len < sizeof(Cabecalho)) return -1;

    const Cabecalho *c = (const Cabecalho *)buf;
    if (memcmp(c->magic, "FMT1", 4) != 0) return -1;

    char *dest = malloc(64);
    if (!dest) return -1;

    /* ⚠ BUG 1 e BUG 2 preservados */
    for (int i = 0; i < c->num_itens; i++)
        memcpy(dest + i * 8, buf + sizeof(Cabecalho) + i * 8, 8);

    if (saida) *saida = dest; else free(dest);
    return 0;
}
```

```bash
gcc     -g -O1 -no-pie -o alvos/parser      alvos/parser.c
clang   -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
        -o alvos/parser-asan alvos/parser.c
```

---

## 5. `intoverflow.c` — integer overflow (módulo 2)

```c
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    uint32_t n = (uint32_t)strtoul(argv[1], NULL, 10);
    uint32_t total = n * 8;            /* ⚠ BUG DELIBERADO */

    printf("n=%u  total=n*8=%u\n", n, total);
    if (total < n) printf("⚠ OVERFLOW: total ficou MENOR que n\n");

    char *buf = malloc(total);
    if (!buf) { printf("malloc falhou\n"); return 3; }
    for (uint32_t i = 0; i < n; i++) buf[i] = 'A';
    printf("escreveu %u bytes\n", n);

    free(buf);
    return 0;
}
```

```bash
clang -g -O1 -fsanitize=undefined -fno-omit-frame-pointer \
      -o alvos/intoverflow alvos/intoverflow.c
./alvos/intoverflow 536870912      # 536870912 * 8 = 2^32 → 0
```

---

## 6. `stack_ovf.c` — stack overflow em struct (módulo 3)

```c
#include <stdio.h>
#include <string.h>

typedef struct { char nome[16]; int privilegio; } Usuario;

void registrar(const char *entrada) {
    Usuario u;
    u.privilegio = 0;
    strcpy(u.nome, entrada);           /* ⚠ BUG DELIBERADO */

    printf("nome='%s' privilegio=%d %s\n", u.nome, u.privilegio,
           u.privilegio ? "← ESCALOU" : "");
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;
    registrar(argv[1]);
    return 0;
}
```

```bash
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o alvos/stack_ovf alvos/stack_ovf.c
./alvos/stack_ovf "AAAAAAAAAAAAAAAAAAAA"
```

---

## 7. `heap_ovf.c` — heap overflow (módulo 3)

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char *processar(const char *entrada, size_t len) {
    char *buf = malloc(len);           /* aloca len */
    if (!buf) return NULL;

    for (size_t i = 0; i < len; i++) {
        buf[i * 2]     = entrada[i];   /* ⚠ BUG: escreve 2×len num buf de len */
        buf[i * 2 + 1] = '.';
    }
    return buf;
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;
    size_t len = strlen(argv[1]);
    char *r = processar(argv[1], len);
    if (r) { printf("ok\n"); free(r); }
    return 0;
}
```

```bash
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o alvos/heap_ovf alvos/heap_ovf.c
./alvos/heap_ovf "abcdefghij"
```

---

## 8. `uaf.c` — use-after-free (módulo 3)

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char  *dado;
    size_t tamanho;
    int  (*processar)(const char *);
} Objeto;

static int processar_padrao(const char *s) { (void)s; return 1; }

Objeto *criar(const char *dado) {
    Objeto *o = malloc(sizeof(Objeto));
    if (!o) return NULL;
    o->dado      = strdup(dado);
    o->tamanho   = strlen(dado);
    o->processar = processar_padrao;
    return o;
}

void destruir(Objeto *o) {
    free(o->dado);
    free(o);                            /* ⚠ o chamador ainda tem `o` */
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    Objeto *o = criar(argv[1]);
    destruir(o);

    /* ⚠ USE-AFTER-FREE DELIBERADO */
    printf("tamanho (após free): %zu\n", o->tamanho);
    printf("dado   (após free): %s\n",  o->dado);
    return 0;
}
```

```bash
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o alvos/uaf alvos/uaf.c
./alvos/uaf "texto de teste"
```

---

## 9. `int_e_heap.c` — integer overflow → heap overflow (módulo 3)

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

void *alocar_para(uint32_t n_itens) {
    uint32_t bytes = n_itens * 16;     /* ⚠ BUG: overflow */

    printf("n_itens=%u  bytes=%u\n", n_itens, bytes);
    if (bytes < n_itens) printf("⚠ OVERFLOW detectado no cálculo\n");

    char *buf = malloc(bytes);         /* aloca POUCO */
    if (!buf) return NULL;

    for (uint32_t i = 0; i < n_itens; i++)
        memset(buf + (size_t)i * 16, 'A', 16);   /* escreve MUITO */

    return buf;
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;
    uint32_t n = (uint32_t)strtoul(argv[1], NULL, 10);
    void *p = alocar_para(n);
    printf("%s\n", p ? "ok" : "falhou");
    free(p);
    return 0;
}
```

```bash
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o alvos/int_e_heap alvos/int_e_heap.c
./alvos/int_e_heap 268435457
```

### Correção — note o `(size_t)` e a checagem **antes** de multiplicar

```c
void *alocar_para_seguro(uint32_t n_itens) {
    if (n_itens > SIZE_MAX / 16) return NULL;      /* ← ANTES de multiplicar */
    size_t bytes = (size_t)n_itens * 16;
    char *buf = malloc(bytes);
    if (!buf) return NULL;
    for (uint32_t i = 0; i < n_itens; i++)
        memset(buf + (size_t)i * 16, 'A', 16);
    return buf;
}
```

⚠ **`(size_t)n_itens * 16` sem a checagem NÃO resolve** — o overflow acontece antes da atribuição.

---

## 10. `type_confusion.cpp` — type confusion (módulo 3)

```cpp
#include <cstdio>
#include <cstring>

class Animal {
public:
    virtual void falar() { printf("...\n"); }
    virtual ~Animal() {}
};

class Cachorro : public Animal {
public:
    void falar() override { printf("au au\n"); }
};

class Robo : public Animal {
public:
    void falar() override { printf("bip\n"); }
    char  buffer[8];
    void *ponteiro_critico;
};

void processar(Animal *a, void *bruto) {
    Cachorro *c = reinterpret_cast<Cachorro *>(bruto);   /* ⚠ BUG */
    char *dest = reinterpret_cast<char *>(c) + 16;
    memcpy(dest, a, 8);
    a->falar();
}

int main() {
    Robo r;
    Cachorro c;
    printf("=== chamada legítima ===\n");
    processar(&c, &c);
    printf("=== type confusion ===\n");
    processar(&c, &r);          /* passa Robo onde se espera Cachorro */
    return 0;
}
```

```bash
clang++ -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer -std=c++17 \
        -o alvos/type_confusion alvos/type_confusion.cpp
./alvos/type_confusion

# Com CFI (exige LTO)
clang++ -g -O1 -fsanitize=cfi -flto -fvisibility=hidden -std=c++17 \
        -o alvos/type_confusion_cfi alvos/type_confusion.cpp
```

---

## 11. `servidor.c` — servidor de protocolo (módulo 8)

⚠ **Escuta APENAS em `127.0.0.1`** — trava no código, não em configuração.

```c
/*
 * Servidor de protocolo com bug deliberado — LABORATÓRIO APENAS
 *
 * Protocolo (texto, terminado em \n):
 *   HELLO <nome>\n        → OK <saudacao>\n
 *   SET <chave> <valor>\n → OK\n            ⚠ BUG: valor sem limite
 *   GET <chave>\n         → VAL <valor>\n
 *   QUIT\n                → BYE\n
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>

#define PORTA 9999
#define MAX_CHAVES 64

typedef struct { char chave[32]; char valor[64]; } Par;

static Par  store[MAX_CHAVES];
static int  n_chaves = 0;
static char ultimo_valor[4096];        /* ⚠ alvo do transbordo */

static void tratar_linha(int fd, char *linha) {
    char resp[8192];

    if (strncmp(linha, "HELLO ", 6) == 0) {
        snprintf(resp, sizeof(resp), "OK ola %s\n", linha + 6);
        send(fd, resp, strlen(resp), 0);

    } else if (strncmp(linha, "SET ", 4) == 0) {
        char *chave = linha + 4;
        char *esp   = strchr(chave, ' ');
        if (!esp) { send(fd, "ERR\n", 4, 0); return; }
        *esp = '\0';
        char *valor = esp + 1;

        strcpy(ultimo_valor, valor);           /* ⚠ BUG 1 */

        /* ⚠ BUG 2: não verifica n_chaves contra MAX_CHAVES */
        snprintf(store[n_chaves].chave, sizeof(store[0].chave), "%s", chave);
        snprintf(store[n_chaves].valor, sizeof(store[0].valor), "%s", valor);
        n_chaves++;

        send(fd, "OK\n", 3, 0);

    } else if (strncmp(linha, "GET ", 4) == 0) {
        for (int i = 0; i < n_chaves; i++) {
            if (strcmp(store[i].chave, linha + 4) == 0) {
                snprintf(resp, sizeof(resp), "VAL %s\n", store[i].valor);
                send(fd, resp, strlen(resp), 0);
                return;
            }
        }
        send(fd, "NF\n", 3, 0);

    } else if (strncmp(linha, "QUIT", 4) == 0) {
        send(fd, "BYE\n", 4, 0);
    } else {
        send(fd, "ERR\n", 4, 0);
    }
}

int main(void) {
    int srv = socket(AF_INET, SOCK_STREAM, 0);
    if (srv < 0) { perror("socket"); return 1; }

    int on = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &on, sizeof(on));

    struct sockaddr_in end = {0};
    end.sin_family      = AF_INET;
    end.sin_port        = htons(PORTA);
    end.sin_addr.s_addr = inet_addr("127.0.0.1");     /* ⚠ SÓ loopback */

    if (bind(srv, (struct sockaddr *)&end, sizeof(end)) < 0) { perror("bind"); return 1; }
    if (listen(srv, 8) < 0) { perror("listen"); return 1; }

    fprintf(stderr, "servidor de laboratorio em 127.0.0.1:%d\n", PORTA);

    for (;;) {
        int cli = accept(srv, NULL, NULL);
        if (cli < 0) continue;

        char buf[8192];
        ssize_t n;
        while ((n = recv(cli, buf, sizeof(buf) - 1, 0)) > 0) {
            buf[n] = '\0';
            char *linha = strtok(buf, "\n");
            while (linha) {
                tratar_linha(cli, linha);
                linha = strtok(NULL, "\n");
            }
        }
        close(cli);
    }
    return 0;
}
```

```bash
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o protocolo/servidor protocolo/servidor.c

# Suba e confirme que só escuta em loopback
cd protocolo && ./servidor 2>servidor.log & sleep 1
ss -tlnp 2>/dev/null | grep 9999       # DEVE mostrar 127.0.0.1:9999
```

⚠ **Se `ss` mostrar `0.0.0.0:9999`, PARE e corrija.** O servidor está exposto na rede.

---

## Harness — o arquivo que serve nos dois fuzzers

```c
/* harnesses/parser_harness.c — funciona com libFuzzer E com AFL++ */
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>

int parse(const uint8_t *buf, size_t len, char **saida);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    if (size < 12)    return 0;        /* pequeno demais p/ o cabeçalho */
    if (size > 65536) return 0;        /* limite de tempo */

    char *saida = NULL;
    (void)parse(data, size, &saida);
    free(saida);
    return 0;
}
```

⚠ **O mesmo arquivo serve nos dois.** `LLVMFuzzerTestOneInput` é o padrão de fato —
documentado tanto no libFuzzer quanto no AFL++ (via `afl_driver`).

---

## Compilação — tabela de referência

| Uso | Comando |
|---|---|
| **Referência** (sem sanitizer) | `gcc -g -O1 -no-pie -o out alvo.c` |
| **ASan** | `clang -g -O1 -fsanitize=address -fno-omit-frame-pointer -o out alvo.c` |
| **ASan + UBSan** ← padrão do curso | `clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer -o out alvo.c` |
| **Hardened** | `. + -fstack-protector-all -D_FORTIFY_SOURCE=2` |
| **CPI (C++)** | `clang++ -g -O1 -fsanitize=cfi -flto -fvisibility=hidden` |
| **libFuzzer** | `clang -g -O1 -fsanitize=fuzzer,address,undefined -fno-omit-frame-pointer alvo.c harness.c` |
| **AFL++** | `AFL_USE_ASAN=1 afl-clang-fast -g -O1 -fno-omit-frame-pointer alvo.c main.c` |

⚠ **`-g` em todas.** Sem símbolo de debug, o módulo 11 não funciona.

---

## Segurança do laboratório

| Regra | Por quê |
|---|---|
| **VM isolada, com snapshot** | Um alvo com bug é um alvo com bug |
| **Servidor só em `127.0.0.1`** | Trava no código, do módulo 8 |
| **Nunca fuzzar terceiro** | Consumo de recurso alheio = DoS |
| **Nada de alvo de produção** | Óbvio, e violado com frequência |

⚠ **Um alvo com bug deliberado é um alvo com bug.** Rode em VM, e não em máquina com dado que
importa.
