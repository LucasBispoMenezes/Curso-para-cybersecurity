# Módulo 1 — Memória, Corrupção e o Que É um Crash

**Carga:** 3 horas (1h30 teoria · 1h30 lab)
**Pré-requisitos:** C, linha de comando

---

## Objetivos

1. Explicar o layout de memória de um processo, com endereços reais.
2. Descrever o que acontece, **byte a byte**, quando um buffer transborda.
3. Distinguir os três desfechos: nada visível, corrupção silenciosa, crash.
4. Entender por que "funcionou no meu teste" não é prova de correção.
5. Ler um `SIGSEGV` e saber o que ele indica — e o que ele **não** indica.

---

## ⚠ Conduta

Todo alvo deste módulo é **escrito e compilado por você**, com bug deliberado, rodando na sua
máquina. Nada de fuzzing contra terceiro, em nenhum momento do curso.

---

## 1.1 O mapa da memória de um processo

Antes de entender corrupção, você precisa do mapa.

```
Endereços ALTOS (0x7fff...)
┌─────────────────────────────────┐
│  argv / env                     │
├─────────────────────────────────┤
│  STACK                          │  ← cresce PARA BAIXO
│  · variáveis locais             │
│  · endereço de retorno          │
│  · canário (se houver)          │
│              ↓                  │
├─────────────────────────────────┤
│              ↑                  │
│  HEAP                           │  ← cresce PARA CIMA
│  · malloc / calloc / realloc    │
├─────────────────────────────────┤
│  .bss    globais não iniciados  │
├─────────────────────────────────┤
│  .data   globais iniciados      │
├─────────────────────────────────┤
│  .rodata strings literais       │
├─────────────────────────────────┤
│  .text   o código               │
└─────────────────────────────────┘
Endereços BAIXOS (0x400000 típico com -no-pie)
```

```bash
mkdir -p ~/fuzz-lab/{alvos,corpus,findings,triagem} && cd ~/fuzz-lab

cat > alvos/mapa.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int global_iniciado = 42;                  /* .data  */
int global_zerado;                         /* .bss   */
static const char *msg = "literal";        /* .rodata */

int main(void) {
    int   local = 7;                       /* stack   */
    char *heap  = malloc(32);              /* heap    */
    strcpy(heap, "no heap");

    printf("código (main):      %p\n", (void *)main);
    printf("literal (.rodata):  %p\n", (void *)msg);
    printf(".data:              %p\n", (void *)&global_iniciado);
    printf(".bss:               %p\n", (void *)&global_zerado);
    printf("heap (malloc):      %p\n", (void *)heap);
    printf("stack (&local):     %p\n", (void *)&local);
    printf("&argc (stack alto): %p\n", (void *)&(int){0});

    free(heap);
    return 0;
}
EOF

gcc -no-pie -o alvos/mapa alvos/mapa.c && ./alvos/mapa
```

⚠ **Use `-no-pie` para o exercício.** Com PIE os endereços são aleatórios e o mapa fica difícil
de ler. Depois de entender o layout, você lida com PIE normalmente (a maioria do software moderno).

**Confirme com o mapa real do processo:**

```bash
# Veja as regiões como o kernel as vê
cat /proc/self/maps | head -20

# Ou, para o binário do exercício:
./alvos/mapa & sleep 0.2; cat /proc/$!/maps 2>/dev/null | head -12
```

Produza `mapa.md` com sua tabela:

| Região | Endereço observado | O que vive ali |
|---|---|---|
| `.text` | | |
| `.rodata` | | |
| `.data` | | |
| `.bss` | | |
| heap | | |
| stack | | |

**Responda:**

1. O heap está em endereço **maior** ou **menor** que a stack?
2. Em qual região vive o endereço de retorno de uma função?
3. Por que `.rodata` é somente-leitura — e o que acontece se você escrever nela?

---

## 1.2 A stack frame, com endereços reais

O módulo 2 do curso de assembly desenhou isso. Aqui você **vê** na memória.

```bash
cat > alvos/frame.c <<'EOF'
#include <stdio.h>

void alvo(char *entrada) {
    char buffer[16];              /* 16 bytes na stack */
    int  depois = 0x41414141;     /* marcador, para você achar */

    printf("&buffer   = %p\n", (void *)buffer);
    printf("&depois   = %p   (valor: 0x%x)\n", (void *)&depois, depois);
    printf("&entrada  = %p\n", (void *)&entrada);

    /* ⚠ BUG DELIBERADO: sem verificação de limite */
    strcpy(buffer, entrada);

    printf("depois    = 0x%x  (mudou? %s)\n", depois,
           depois == 0x41414141 ? "não" : "SIM — corrompido");
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "uso: %s <texto>\n", argv[0]); return 2; }
    alvo(argv[1]);
    return 0;
}
EOF

gcc -no-pie -fno-stack-protector -o alvos/frame alvos/frame.c

echo "=== entrada pequena ==="
./alvos/frame "curto"

echo
echo "=== entrada que transborda (24 bytes) ==="
./alvos/frame "AAAAAAAAAAAAAAAAAAAAAAAA"
```

⚠ **Note `-fno-stack-protector`.** Sem ele, o canário detecta o transbordo e aborta — e você não
vê a corrupção acontecer. O módulo 2 liga o canário de volta e mostra por que ele existe.

**Agora desenhe o que aconteceu:**

```
                    endereço maior
    ┌──────────────────────────────┐
    │ &entrada (ponteiro, 8 bytes) │
    ├──────────────────────────────┤
    │ endereço de retorno          │  ← o que o `ret` desempilha
    ├──────────────────────────────┤
    │ rbp salvo                    │
    ├──────────────────────────────┤
    │ &depois (int, 4 bytes)       │  ← 0x41414141 vira AAAA
    ├──────────────────────────────┤
    │ &buffer (16 bytes)           │  ← o strcpy escreve AQUI, e segue
    └──────────────────────────────┘
                    endereço menor
```

⚠ **A ordem na stack é o ponto.** `depois` está em endereço **maior** que `buffer` — então o
`strcpy` que passa do 16º byte atinge `depois` primeiro. **É por isso que compiladores reordenam
variáveis**, e é por isso que a ordem que você vê no fonte não é a ordem na memória.

**Produza `frame.md`:**

| Pergunta | Sua resposta |
|---|---|
| Quantos bytes para atingir `depois`? | |
| Com 24 bytes, `depois` mudou? Para quanto? | |
| Com 24 bytes, o `ret` foi atingido? | |
| O programa crashou? Por quê (ou por quê não)? | |

---

## 1.3 Os três desfechos, e por que o silencioso é o pior

⚠ **Este é o conceito central do módulo.** Transbordo não significa crash.

| Desfecho | O que acontece | Por que é perigoso |
|---|---|---|
| **Crash imediato** | `SIGSEGV` — endereço inválido | **Visível.** Você descobre rápido |
| **Crash tardio** | Corrompeu algo, quebra 200 linhas depois | Difícil de rastrear |
| **Silencioso** | Corrompeu variável vizinha, programa segue | **O pior.** Ninguém descobre |

```
CASO SILENCIOSO — o que a maioria não percebe

  int autenticado = 0;
  char nome[8];

  strcpy(nome, entrada_do_usuario);   /* entrada com 9+ bytes */

        │
        ▼

  ┌──────────────┬───────────┐
  │ nome[8]      │autenticado│   ← a variável vizinha na stack
  └──────────────┴───────────┘
        │              │
        │ escreve até ─┘
        ▼
     "autenticado" vira 0x41 = 65 → VERDADEIRO
     O programa "funciona" e libera o acesso.
```

**Reproduza:**

```bash
cat > alvos/silencioso.c <<'EOF'
#include <stdio.h>
#include <string.h>

int main(int argc, char **argv) {
    int  autenticado = 0;
    char nome[8];

    if (argc < 2) return 2;
    strcpy(nome, argv[1]);

    if (autenticado) {
        printf("⚠ ACESSO LIBERADO (autenticado = %d)\n", autenticado);
    } else {
        printf("negado (autenticado = %d)\n", autenticado);
    }
    return 0;
}
EOF

gcc -no-pie -fno-stack-protector -O0 -o alvos/silencioso alvos/silencioso.c

echo "=== entrada curta ==="
./alvos/silencioso "ana"
echo "=== entrada longa ==="
./alvos/silencioso "AAAAAAAAAAAA"
```

⚠ **Se o `-O0` for importante:** em `-O2`, o compilador pode **eliminar** a variável `autenticado`
ou reordenar, e o efeito muda. **Isso não é o compilador quebrando seu exploit — é o compilador
otimizando algo que o C diz que é comportamento indefinido.** O módulo 3 aprofunda.

**Produza `desfechos.md`:**

| Entrada | `autenticado` | Acesso liberado? | Crashou? |
|---|---|---|---|
| `"ana"` | | | |
| `"AAAAAAAA"` (8) | | | |
| `"AAAAAAAAA"` (9) | | | |
| `"AAAAAAAAAAAA"` (12) | | | |
| 200 bytes | | | |

**Responda:**

1. Com quantos bytes `autenticado` virou não-zero? Isso bate com o layout?
2. **Por que não houve crash** na entrada de 12 bytes?
3. Se você só testasse entradas curtas, descobriria o bug? O que isso diz sobre cobertura?

---

## 1.4 O que o `SIGSEGV` diz — e o que ele não diz

```bash
# Provocar um crash e observar
./alvos/frame "$(python3 -c 'print("A"*200)')"
echo "código de saída: $?"
```

| O que você vê | O que significa | **O que NÃO significa** |
|---|---|---|
| `Segmentation fault` | Acesso a endereço inválido | Que o bug está na linha que crashou |
| `-11` (código) | `SIGSEGV` = 11 | Que é explorável |
| `Aborted` (`-6`) | `SIGABRT`, ex.: canário ou `free()` inválido | Que é o mesmo bug |
| Nenhum erro | Corrupção silenciosa | Que está correto |

⚠ **A linha mais importante é a segunda.** O crash acontece **onde o programa usou o dado
corrompido** — que pode ser muito depois de **onde o dado foi corrompido**. É por isso que o
módulo 11 (causa raiz) existe: o `SIGSEGV` mostra o **sintoma**, não a **causa**.

⚠ **E a terceira:** um crash que dá `SIGSEGV` em endereço controlado pela entrada tem potencial de
controle; um que dá em endereço aleatório, não. **Saber distinguir é o módulo 9** — e é o que faz
a diferença entre um reporte aceito e um ignorado.

```bash
# Onde, exatamente, o crash aconteceu
gdb -q -batch -ex run -ex bt -ex 'info registers rip rsp rbp' \
    --args ./alvos/frame "$(python3 -c 'print("A"*200)')" 2>&1 | head -30
```

---

## 1.5 LAB — Escreva o seu alvo com bug

**Duração:** 90 min

⚠ **Você escreve o alvo.** É o exercício do módulo, e o alvo é seu — não de terceiro.

### Passo 1 — Escreva um parser com bug (40 min)

Escreva um parser de um formato simples que **você inventa**. Requisitos:

| Requisito | Detalhe |
|---|---|
| Formato | Um cabeçalho de 12 bytes: `magic` (4), `versão` (2), `num_itens` (2), `tamanho` (4) |
| Corpo | `num_itens` registros de tamanho variável |
| **Bug 1** | Não valida `num_itens` contra o tamanho real do buffer |
| **Bug 2** | Copia `tamanho` bytes sem verificar contra o tamanho do destino |
| Entrada | Ler de arquivo, para poder ser fuzzado depois |

```c
/* alvos/parser.c — CATEGORIA: alvo com bug deliberado, para fuzzing */
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

/* ⚠ BUG 1: não valida num_itens nem tamanho contra o buffer real */
int parse(const uint8_t *buf, size_t len, char **saida) {
    if (len < sizeof(Cabecalho)) return -1;
    const Cabecalho *c = (const Cabecalho *)buf;

    if (memcmp(c->magic, "FMT1", 4) != 0) return -1;

    char *dest = malloc(64);          /* ⚠ BUG 2: destino de 64 bytes fixos */
    if (!dest) return -1;

    for (int i = 0; i < c->num_itens; i++) {
        /* sem verificação de índice, sem verificação de origem */
        memcpy(dest + i * 8, buf + sizeof(Cabecalho) + i * 8, 8);
    }
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
    if (saida) free(saida);
    free(buf);
    return 0;
}
```

**Compile sem proteção — para ver a corrupção:**

```bash
gcc -g -O1 -no-pie -fno-stack-protector -o alvos/parser alvos/parser.c
```

⚠ **`-g` é obrigatório.** Sem símbolo de debug, o módulo 11 não funciona. Compile **sempre** com
`-g` — não custa nada e é o que salva você depois.

### Passo 2 — Faça o bug acontecer à mão (30 min)

```bash
# Entrada VÁLIDA
python3 - <<'PY'
import struct
cab = b"FMT1" + struct.pack("<HHI", 1, 2, 16)
corpo = b"A" * 32
open("corpus/valido.bin", "wb").write(cab + corpo)
print("valido.bin:", len(cab + corpo), "bytes")
PY

# Entrada que dispara o BUG 1 (num_itens absurdo)
python3 - <<'PY'
import struct
cab = b"FMT1" + struct.pack("<HHI", 1, 60000, 16)
open("corpus/bug1.bin", "wb").write(cab + b"A" * 64)
print("bug1.bin criado (num_itens = 60000)")
PY

echo "=== entrada válida ==="
./alvos/parser corpus/valido.bin; echo "código: $?"

echo
echo "=== entrada com bug1 ==="
./alvos/parser corpus/bug1.bin; echo "código: $?"
```

### Passo 3 — Documente a corrupção (20 min)

Produza `alvo-proprio.md`:

```markdown
# Alvo próprio — parser FMT1

## 1. Bug 1 — num_itens não validado
- Como disparar:
- O que acontece (com a saída real):
- Endereço/tamanho que transborda:
- Por que o compilador não pegou:
- Correção mínima:

## 2. Bug 2 — destino de 64 bytes fixos
- Como disparar:
- O que acontece:
- Correção mínima:

## 3. Por que o parser é adequado para fuzzing
- [ ] Lê de arquivo (fácil de harness)
- [ ] Determinístico
- [ ] Rápido
- [ ] Tem caminho de erro tratado

## 4. Observação
Com entrada pequena, o bug aparece? Com entrada grande? O que isso diz sobre
a cobertura que você precisará no fuzzing?
```

**Responda por escrito:**

1. Com **quantos bytes** o bug 2 começa a corromper? Como você descobriu?
2. O bug aparece com entrada **válida**? Por quê?
3. **Por que este alvo é bom candidato a fuzzing** — cite as quatro características?
4. O que teria acontecido se você tivesse compilado com `-O2`? Teste e relate.

⚠ **A resposta 4 é importante e você deve testar de verdade.** Compile com `-O2` e veja se o
comportamento muda. Se mudar, anote — é a primeira aparição do comportamento indefinido, que o
módulo 3 trata.

### Critérios de aceitação

- `mapa.md` com o layout confirmado por `/proc/<pid>/maps`.
- `frame.md` com a contagem de bytes até `depois` — **medida**, não estimada.
- `alvos/silencioso.c` com a tabela de desfechos preenchida e o ponto de virada identificado.
- Você explicou por que a corrupção silenciosa é pior que o crash.
- `alvos/parser.c` compilando com `-g`, e os dois bugs disparáveis.
- `corpus/valido.bin` e `corpus/bug1.bin` criados.
- `alvo-proprio.md` com as quatro seções e a resposta sobre `-O2` com o teste **feito**.
- Você distinguiu o que o `SIGSEGV` indica do que ele **não** indica.

---

## Avaliação

1. Desenhe o mapa de memória com as seis regiões, em ordem de endereço.
2. Para que serve `-no-pie` no laboratório? O que muda sem ele?
3. Por que a ordem das variáveis na stack não é a ordem do fonte?
4. Explique, byte a byte, o que o `strcpy` faz até atingir `depois`.
5. Cite os três desfechos de um transbordo. Qual é o pior, e por quê?
6. O que o `-fno-stack-protector` faz, e por que o laboratório usa?
7. Por que `-O2` pode mudar o comportamento da corrupção?
8. O que `SIGSEGV` indica? **O que ele não indica**, e por que isso importa?
9. Qual a diferença entre `SIGSEGV` (`-11`) e `SIGABRT` (`-6`)? O que cada um sugere?
10. Um crash acontece na linha 200, e a corrupção foi na linha 12. O que isso implica para a
    análise?
11. Por que um crash em endereço controlado pela entrada é mais grave que um em endereço aleatório?
12. Por que `-g` é obrigatório para o curso todo?

---

**Próximo:** [Módulo 2 — Ambiente e sanitizers](modulo-02.md)
