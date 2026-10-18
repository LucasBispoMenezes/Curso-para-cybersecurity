# Módulo 3 — Anatomia de um Bug

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Reproduzir as cinco classes de bug que dominam o fuzzing moderno.
2. Entender o mecanismo de cada classe em nível de memória.
3. Reconhecer cada classe **pelo relatório do sanitizer**.
4. Explicar por que comportamento indefinido transforma bug em vulnerabilidade.
5. Saber qual classe dá controle de execução e qual dá só negação de serviço.

---

## ⚠ Conduta

Alvos escritos e compilados por você. Nada de fuzzing contra terceiro.

---

## 3.1 As cinco classes, e por que essas

A pesquisa do Project Zero mostra que **corrupção de memória responde por 68% dos CVEs de 0-day
usados na prática** (dado do rastreamento público do PZ). Dentro disso, as classes se repetem:

| # | Classe | Frequência em parser | Potencial de controle |
|---|---|---|---|
| 1 | **Stack buffer overflow** | Alta | Alto |
| 2 | **Heap buffer overflow** | **Muito alta** | **Alto** |
| 3 | **Use-after-free** | Média | **Muito alto** |
| 4 | **Integer overflow** | Alta | **Via de acesso** para as anteriores |
| 5 | **Type confusion** | Média (C++) | **Muito alto** |

⚠ **A tabela tem uma hierarquia implícita que você precisa saber:** integer overflow e type
confusion **raramente são o dano final**. Eles são o **caminho** para um heap overflow ou UAF. É
por isso que o ASan pega o segundo e o UBSan pega o primeiro — e é por isso que você liga os dois.

---

## 3.2 Classe 1 — Stack buffer overflow

Já visto no módulo 1. Aqui, a anatomia precisa.

```bash
cd ~/fuzz-lab

cat > alvos/stack_ovf.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

typedef struct {
    char nome[16];
    int  privilegio;
} Usuario;

/* ⚠ BUG: não valida o comprimento antes de copiar */
void registrar(const char *entrada) {
    Usuario u;
    u.privilegio = 0;

    /* se a entrada tiver >16 bytes, atinge `privilegio` */
    strcpy(u.nome, entrada);

    printf("nome='%s' privilegio=%d %s\n",
           u.nome, u.privilegio,
           u.privilegio ? "← ESCALOU" : "");
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;
    registrar(argv[1]);
    return 0;
}
EOF

clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o alvos/stack_ovf alvos/stack_ovf.c

echo "=== 12 bytes (seguro) ==="
./alvos/stack_ovf "AAAAAAAAAAAA"

echo
echo "=== 20 bytes (transborda o struct) ==="
./alvos/stack_ovf "AAAAAAAAAAAAAAAAAAAA"
```

### A anatomia

```
Stack frame de registrar()
        endereço maior
   ┌────────────────────────────┐
   │ endereço de retorno        │  ← se atingir aqui: CONTROLE
   ├────────────────────────────┤
   │ rbp salvo                  │
   ├────────────────────────────┤
   │ u.privilegio  (int, 4B)    │  ← 17º a 20º byte
   ├────────────────────────────┤
   │ u.nome        (char[16])   │  ← o strcpy escreve aqui
   └────────────────────────────┘
        endereço menor
```

⚠ **A ordem dos campos no struct é decisão do compilador, não do seu código.** Em `-O0` costuma
seguir a declaração; em `-O2` pode reordenar. E o **endereço de retorno** está em endereço maior
que o struct — por isso transbordo grande atinge controle.

**ASan detecta porque** o struct está na pilha com redzone ao redor. O relatório diz
`stack-buffer-overflow` e aponta a linha do `strcpy`.

| Campo do relatório | Valor esperado |
|---|---|
| Tipo | `stack-buffer-overflow` |
| `#0` | a linha do `strcpy` |
| Região | `[endereço, endereço+16)` ou o tamanho do struct |

⚠ **Por que o canário (`-fstack-protector`) pega isso** e não pega heap: o canário fica **entre**
o buffer local e o endereço de retorno. Transbordo que atinge o canário → `SIGABRT`. É por isso que
o canário é defesa **de stack**, e o ASan é defesa de **stack e heap**.

---

## 3.3 Classe 2 — Heap buffer overflow

**A classe mais frequente em parser**, porque parser aloca dinamicamente.

```bash
cat > alvos/heap_ovf.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* ⚠ BUG: aloca pelo tamanho da ENTRADA, mas escreve mais que isso */
char *processar(const char *entrada, size_t len) {
    char *buf = malloc(len);                 /* aloca len */
    if (!buf) return NULL;

    /* expande cada byte: 2 de saída para 1 de entrada */
    for (size_t i = 0; i < len; i++) {
        buf[i * 2]     = entrada[i];         /* ⚠ escreve 2×len num buf de len */
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
EOF

clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o alvos/heap_ovf alvos/heap_ovf.c

echo "=== entrada curta ==="
./alvos/heap_ovf "abc"

echo
echo "=== entrada maior (o bug aparece) ==="
./alvos/heap_ovf "abcdefghij"
```

⚠ **Note que o bug **não** aparece com 3 bytes.** Isso ilustra o problema de cobertura: o parser
escreve `2×len`, e o bloco tem `len`. Com `len` pequeno, o ASan pode não detectar se o bloco tiver
redzone grande — mas o **dano é o mesmo**. Entrada maior, detecção mais confiável. **É por isso que
o corpus (módulo 5) importa tanto.**

### O relatório

```
ERROR: AddressSanitizer: heap-buffer-overflow on address 0x6020000000f0
WRITE of size 1 at 0x6020000000f0 thread T0
    #0 processar /home/.../heap_ovf.c:13:9
    ...
0x6020000000f0 is located 0 bytes to the right of 10-byte region
    [0x6020000000e0,0x6020000000f0) allocated by thread T0 here:
    #0 malloc
    #1 processar /home/.../heap_ovf.c:8:18
```

⚠ **A leitura crítica:** `#0` na linha 13 (a escrita), e `allocated by` na linha 8 (o `malloc`).
O bug real está **entre as duas** — o cálculo `len` em vez de `len * 2` na linha 8. **O ASan mostra
o sintoma; a correção está na alocação.**

**Correção:** `malloc(len * 2)` — e verificar overflow **nessa multiplicação**. Aí entra a classe 4.

---

## 3.4 Classe 3 — Use-after-free

⚠ **A classe mais perigosa, e a que você precisa entender melhor.**

```bash
cat > alvos/uaf.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char  *dado;
    size_t tamanho;
    int  (*processar)(const char *);        /* ponteiro de função */
} Objeto;

static int processar_padrao(const char *s) { (void)s; return 1; }

/* ⚠ BUG: libera o objeto mas o chamador continua usando */
Objeto *criar(const char *dado) {
    Objeto *o = malloc(sizeof(Objeto));
    if (!o) return NULL;
    o->dado     = strdup(dado);
    o->tamanho  = strlen(dado);
    o->processar = processar_padrao;
    return o;
}

void destruir(Objeto *o) {
    free(o->dado);
    free(o);                                /* ⚠ o chamador ainda tem `o` */
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    Objeto *o = criar(argv[1]);
    destruir(o);

    /* ⚠ USE-AFTER-FREE: o já foi liberado */
    printf("tamanho (após free): %zu\n", o->tamanho);
    printf("dado   (após free): %s\n",  o->dado);   /* leitura de memória liberada */

    return 0;
}
EOF

clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o alvos/uaf alvos/uaf.c

./alvos/uaf "texto de teste"
```

### Por que UAF dá controle

```
1. malloc(sizeof(Objeto))       → bloco B alocado
2. free(o)                       → bloco B devolvido ao alocador
                                    ⚠ o PONTEIRO `o` ainda aponta para B
3. malloc(tamanho_atacante)      → alocador devolve B, com dado CONTROLADO
4. o->processar(...)             → CHAMA o que estiver em B naquele offset
                                    ⚠ controle de fluxo
```

⚠ **O mecanismo em uma frase:** o programa usa um ponteiro para memória que ele **já devolveu** —
e o atacante consegue **reocupar** aquela memória com dado dele antes do uso. **É o bug que mais
dá controle**, e é por isso que `heap-use-after-free` tem severidade crítica.

⚠ **ASan detecta UAF com precisão porque ele "envenena" o bloco liberado.** Ele não devolve a
memória ao sistema, só marca como envenenada — qualquer acesso dispara. **É por isso que ASan é
essencial:** sem ele, o acesso a memória liberada é **silencioso** na maioria dos casos.

### O relatório

```
ERROR: AddressSanitizer: heap-use-after-free on address 0x6020000000b8
READ of size 8 at 0x6020000000b8 thread T0
    #0 main /home/.../uaf.c:34:12                          ← o uso ilegal

0x6020000000b8 is located 8 bytes inside of 32-byte region
    [0x6020000000b0,0x6020000000d0) freed by thread T0 here:  ← ⚠ "freed by"
    #0 free
    #1 destruir /home/.../uaf.c:25:5                       ← onde foi liberado
previously allocated by thread T0 here:
    #1 criar /home/.../uaf.c:14:26                         ← onde foi alocado
```

⚠ **O relatório do UAF tem três cadeias, não duas:** onde foi **usado** (`#0`), onde foi
**liberado** (`freed by`), e onde foi **alocado**. **A causa está na relação entre as três**: o
`destruir` liberou, e o `main` usou depois. A correção é ajustar o **contrato de posse** do
ponteiro, não a linha 34.

---

## 3.5 Classe 4 — Integer overflow

Já demonstrado no módulo 2 (§2.4). Aqui, a anatomia completa e a ligação com a classe 2.

```bash
cat > alvos/int_e_heap.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* ⚠ BUG: overflow no cálculo do tamanho, e depois escrita baseada
   no VALOR ORIGINAL (grande), não no valor truncado */
void *alocar_para(uint32_t n_itens) {
    uint32_t bytes = n_itens * 16;            /* ⚠ overflow se n_itens grande */

    printf("n_itens=%u  bytes=%u\n", n_itens, bytes);
    if (bytes < n_itens) printf("⚠ OVERFLOW detectado no cálculo\n");

    char *buf = malloc(bytes);                /* aloca POUCO */
    if (!buf) return NULL;

    /* ⚠ escreve n_itens * 16 — mas o buffer é `bytes` (truncado) */
    for (uint32_t i = 0; i < n_itens; i++) {
        memset(buf + (size_t)i * 16, 'A', 16);
    }
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
EOF

clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o alvos/int_e_heap alvos/int_e_heap.c

echo "=== valor seguro ==="
./alvos/int_e_heap 100

echo
echo "=== valor que causa overflow de uint32 ==="
./alvos/int_e_heap 268435457     # 268435457 * 16 > 2^32
```

### A anatomia da cadeia

```
   uint32_t bytes = n_itens * 16;
        │
        │  n_itens grande → multiplicação estoura 2^32
        ▼
   bytes = valor PEQUENO (truncado)
        │
        ├──▶ malloc(bytes)          → aloca POUCO
        │
        └──▶ loop escreve n_itens*16 → escreve MUITO
                                       │
                                       ▼
                                  HEAP OVERFLOW
```

⚠ **A lição estrutural:** o **UBSan** aponta a linha da multiplicação (o *primeiro* erro); o
**ASan** aponta a linha da escrita (o *sintoma*). **Corrigir só o segundo deixa o bug.** A correção
certa é no cálculo — e a forma correta é checar antes: `if (n_itens > SIZE_MAX / 16) return NULL;`.

**Produza a correção:**

```c
/* versão corrigida */
void *alocar_para_seguro(uint32_t n_itens) {
    if (n_itens > SIZE_MAX / 16) return NULL;      /* ← antes de multiplicar */
    size_t bytes = (size_t)n_itens * 16;
    char *buf = malloc(bytes);
    if (!buf) return NULL;
    for (uint32_t i = 0; i < n_itens; i++)
        memset(buf + (size_t)i * 16, 'A', 16);
    return buf;
}
```

⚠ **Note `(size_t)` no cast.** Multiplicar em `uint32_t` e atribuir a `size_t` **não resolve** — o
overflow acontece antes da atribuição. É a classe de erro mais comum nesta correção.

---

## 3.6 Classe 5 — Type confusion

Específica de C++ (e de linguagem com herança), e a razão de o **CFISan** existir.

```bash
cat > alvos/type_confusion.cpp <<'EOF'
#include <cstdio>
#include <cstring>
#include <cstdint>

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

/* ⚠ BUG: reinterpret_cast entre tipos incompatíveis */
void processar(Animal *a, void *bruto) {
    Cachorro *c = reinterpret_cast<Cachorro *>(bruto);   /* ⚠ cegamente */

    /* escreve como se fosse Cachorro, mas pode ser Robo ou outro */
    char *dest = reinterpret_cast<char *>(c) + 16;
    memcpy(dest, a, 8);                                  /* ⚠ corrompe vizinhança */
    a->falar();                                          /* ⚠ vtable confusa */
}

int main() {
    Robo r;
    Cachorro c;
    printf("=== chamada legítima ===\n");
    processar(&c, &c);
    printf("=== type confusion ===\n");
    processar(&c, &r);     /* passa Robo onde se espera Cachorro */
    return 0;
}
EOF

clang++ -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer -std=c++17 \
      -o alvos/type_confusion alvos/type_confusion.cpp

./alvos/type_confusion
```

### Com CFISan — a detecção específica

```bash
clang++ -g -O1 -fsanitize=cfi -flto -fvisibility=hidden -std=c++17 \
      -o alvos/type_confusion_cfi alvos/type_confusion.cpp

./alvos/type_confusion_cfi
```

⚠ **CFISan exige LTO e visibilidade controlada.** É por isso que a documentação do AFL++ menciona
`AFL_USE_CFISAN=1` — o suporte a CFI precisa de build LTO completo.

### Por que type confusion é crítica

| Aspecto | Detalhe |
|---|---|
| **Mecanismo** | Objeto de tipo A tratado como tipo B |
| **Vtable** | Chamada virtual despacha para endereço do tipo errado |
| **Layout** | Campo de A em offset onde B tem ponteiro |
| **Potencial** | **Controle de fluxo** via ponteiro de função ou vtable |
| **Frequência** | Alta em navegador, leitor de documento, qualquer coisa com polimorfismo |

⚠ **A razão de ser tão frequente em software moderno:** C++ com herança é onipresente em parser de
documento (Chrome, Office, leitores de PDF), e `reinterpret_cast`/`static_cast` cego é o padrão que
gera o bug.

---

## 3.7 LAB — Reproduza as cinco classes

**Duração:** 150 min

### Passo 1 — Reproduza cada classe (60 min)

Para **cada** um dos cinco alvos acima:

```bash
mkdir -p ~/fuzz-lab/triagem/classes && cd ~/fuzz-lab

for t in stack_ovf heap_ovf uaf int_e_heap; do
    echo "══════════ ${t} ══════════"
    case "${t}" in
        stack_ovf)  ./alvos/stack_ovf  "AAAAAAAAAAAAAAAAAAAA" ;;
        heap_ovf)   ./alvos/heap_ovf   "abcdefghij" ;;
        uaf)        ./alvos/uaf        "texto" ;;
        int_e_heap) ./alvos/int_e_heap 268435457 ;;
    esac
    echo "  código: $?"
    echo
done

echo "══════════ type_confusion ══════════"
./alvos/type_confusion
```

Produza `classes.md` — **a tabela central do módulo**:

| Classe | Alvo | Relatório do sanitizer (tipo) | Onde está o bug (linha) | Onde aparece o sintoma (linha) | Severidade | Dá controle? |
|---|---|---|---|---|---|---|
| Stack overflow | `stack_ovf` | | | | | |
| Heap overflow | `heap_ovf` | | | | | |
| Use-after-free | `uaf` | | | | | |
| Integer overflow | `int_e_heap` | | | | | |
| Type confusion | `type_confusion` | | | | | |

⚠ **A coluna "onde está o bug" vs. "onde aparece o sintoma" é o entregável.** Você preenche as
duas **com linhas diferentes** para cada classe — e essa diferença é o aprendizado.

**Responda:**

1. Em qual classe o bug e o sintoma estão **na mesma linha**? Em qual estão mais distantes?
2. Qual classe **só** o UBSan detecta? Qual **só** o ASan detecta?
3. **Por que `heap_ovf` não dispara com entrada de 3 bytes?** O que isso implica para o corpus?
4. No `uaf`, o relatório tem **três** cadeias. Nomeie cada uma e o que ela diz.

### Passo 2 — Corrija cada um (50 min)

Para **cada** um dos cinco, escreva a correção em `correcoes/`:

```
correcoes/
├── stack_ovf-fix.c      usar strncpy + verificação, ou snprintf
├── heap_ovf-fix.c       alocar len*2, com checagem de overflow
├── uaf-fix.c            ajustar contrato de posse (destruir = NULL no chamador)
├── int_e_heap-fix.c     checar SIZE_MAX/16 ANTES de multiplicar
└── type_confusion-fix.cpp  dynamic_cast com verificação de tipo
```

**Para cada correção, prove:**

```bash
# 1. O bug existia
./alvos/<alvo> <entrada-do-bug> 2>&1 | head -3

# 2. Depois da correção, o ASan silencia
clang -g -O1 -fsanitize=address,undefined -o /tmp/fix correcoes/<fix>   # (ajuste p/ C++)
/tmp/fix <entrada-do-bug> 2>&1 | head -3
```

Produza `correcoes.md`:

| Classe | Correção aplicada | ASan silenciou? | Funciona com entrada válida? | Regressão possível? |
|---|---|---|---|---|
| | | | | |

⚠ **A coluna "regressão possível" é importante:** toda correção precisa de um teste que **falharia
antes** e **passa depois**. Sem isso, alguém reintroduz o bug na próxima refatoração — e é o módulo
12 que formaliza isso.

**Responda:**

1. Na correção do `heap_ovf`, você checou o overflow da multiplicação? Por quê?
2. Na correção do `uaf`, a solução foi na linha 34 ou em outra parte? Explique.
3. Na `type_confusion`, `dynamic_cast` **sempre** resolve? Quando não resolve?
4. Qual correção foi **mais difícil** de escrever corretamente? Por quê?

### Passo 3 — Escreva a regressão (40 min)

Para **duas** classes (escolha as duas que você achou mais sutis):

```bash
mkdir -p ~/fuzz-lab/triagem/regressao && cd ~/fuzz-lab/triagem/regressao

cat > test_heap_ovf.sh <<'SCRIPT'
#!/usr/bin/env bash
# Regressão: falha ANTES da correção, passa DEPOIS
set -uo pipefail

ENTRADA="${1:-abcdefghij}"

# Binário com bug
if ./../../alvos/heap_ovf "$ENTRADA" >/dev/null 2>&1; then
    echo "⚠ o binário com bug NÃO falhou — a regressão não é válida"
    exit 1
fi

echo "✓ binário com bug falha (esperado)"

# Binário corrigido
if [ -x /tmp/heap_ovf-fix ]; then
    if /tmp/heap_ovf-fix "$ENTRADA" >/dev/null 2>&1; then
        echo "✓ binário corrigido passa"
    else
        echo "⚠ binário corrigido TAMBÉM falha — a correção está incompleta"
        exit 1
    fi
fi
SCRIPT
chmod +x test_heap_ovf.sh
./test_heap_ovf.sh
```

⚠ **Note que o script testa o binário com bug e espera que ele falhe.** Isso é o que faz o teste
ser **regressão** — ele prova que a entrada ainda dispara o bug no código antigo. Um teste que só
roda no código novo não protege contra reintrodução.

Produza `regressao.md`:

| Classe | Entrada de regressão | Com bug: falha? | Corrigido: passa? | O teste protege? |
|---|---|---|---|---|
| | | | | |

⚠ **A resposta honesta sobre o `uaf`:** o binário com bug **não falha** com `SIGSEGV` — ele só
falha **com ASan**. Isso significa que a regressão precisa rodar **ASan**, não o binário puro. Anote
isso, porque é uma limitação real do teste, e o módulo 12 volta nisso.

### Critérios de aceitação

- Os cinco alvos compilados e disparáveis.
- `classes.md` com **as cinco linhas** e as duas colunas de linha (bug vs. sintoma) preenchidas.
- Você identificou qual classe só o UBSan pega e qual só o ASan pega.
- As **cinco correções** escritas e provadas: bug existe → correção silencia ASan.
- Você checou o overflow da multiplicação na correção do `int_e_heap`.
- `regressao.md` com dois testes de regressão funcionando.
- Você identificou que o teste do `uaf` **precisa** de ASan para valer.
- Você respondeu quando `dynamic_cast` não resolve.

---

## Avaliação

1. Cite as cinco classes de bug e a frequência relativa de cada uma.
2. Por que integer overflow e type confusion **raramente são o dano final**?
3. Descreva a anatomia de um stack overflow, com o endereço de retorno no desenho.
4. Por que a ordem dos campos de um struct na memória não é a do fonte?
5. Por que `heap_ovf` não dispara com entrada curta? Que consequência isso tem para o corpus?
6. Explique, em quatro passos, como use-after-free vira controle de fluxo.
7. Por que o ASan detecta UAF **com precisão**? O que ele faz com o bloco liberado?
8. Quantas cadeias tem um relatório de UAF? Nomeie cada uma.
9. Explique como integer overflow leva a heap overflow, com o exemplo do `int_e_heap`.
10. O UBSan aponta uma linha e o ASan aponta outra, no mesmo bug. Qual é o bug real?
11. Por que `(size_t)n_itens * 16` **não** resolve o overflow? Qual é a correção certa?
12. Por que type confusion é frequente em C++ moderno? O que o CFISan detecta?
13. O que um teste de regressão precisa provar para ser válido?
14. Por que o teste de regressão do UAF precisa rodar com ASan, e não o binário puro?

---

**Próximo:** [Módulo 4 — Harness: a peça que decide tudo](modulo-04.md)
