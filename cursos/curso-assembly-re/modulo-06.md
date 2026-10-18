# Módulo 6 — Engenharia Reversa Aplicada

**Carga:** 4 horas (1h teoria · 3h lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Seguir um método repetível para analisar função desconhecida.
2. Reconstruir estruturas de dados a partir do padrão de acesso à memória.
3. Reconstruir tipos e assinaturas de função.
4. Identificar algoritmos por assinatura (hash, cripto, codificação, compressão).
5. Reconstruir o pseudocódigo de uma função completa e validar sua hipótese.

---

## 6.1 O método

Engenharia reversa sem método é tentativa e erro. Este é o método do curso, em ordem. Ele é
repetível e você vai usá-lo em toda função que analisar.

### Passo 1 — Reconhecimento (30 segundos)

```bash
file binario
strings -n 6 binario | grep -iE 'passw|error|key|/etc|http|token'
nm --defined-only binario | grep ' T '
objdump -d -j .plt -M intel binario
```

Antes de olhar qualquer assembly, responda: **que tipo de programa é este?** Um utilitário de
rede usa `socket`, `connect`, `send`. Um programa de arquivo usa `open`, `read`, `write`. Um
servidor de licença usa `time`, comparações, talvez cripto. A lista de importações de libc conta
a história antes de você ler uma linha de código.

### Passo 2 — Localizar o alvo (1–5 minutos)

Você não analisa "o binário". Analisa **uma função**. Encontre-a:

- Por string: `strings` → Ghidra → xref.
- Por importação: quem chama `strcmp`? Provavelmente é uma validação.
- Por símbolo: se não está *stripped*, o nome está lá.
- Por xref de constante: quem usa `0x5f3a21`?
- Por fluxo: parta de `main` e siga.

### Passo 3 — Delimitar a função (2 minutos)

Encontre o começo e o fim:

```bash
objdump -d -M intel binario | sed -n '/<funcao>:/,/^$/p'
```

Marque:

- **Prologue:** `push rbp` / `mov rbp, rsp` / `sub rsp, N` → quantos bytes de stack? Isso te diz
  quantas e quão grandes são as variáveis locais.
- **Epilogue:** `leave`/`pop rbp`/`ret` ou variações.
- **Registradores callee-saved salvos** (`push rbx`, `push r12`...) → quais valores persistem
  entre chamadas?
- **Chamadas externas** (`call ...@plt`) → o que a função usa do mundo externo?

### Passo 4 — Anotar antes de interpretar

Esta etapa é a que separa análise boa de análise ruim. **Reescreva o disassembly anotado linha a
linha, antes de tentar entender o todo.** Exemplo:

```asm
0000000000401184 <valida>:
  401184: push   rbp                    ; prologue
  401185: mov    rbp, rsp
  401188: sub    rsp, 0x20              ; 32 bytes de locais
  40118c: mov    QWORD PTR [rbp-0x18], rdi   ; arg1 (char*) → local1
  401190: mov    rax, QWORD PTR [rbp-0x18]
  401194: mov    rdi, rax               ; prepara arg para chamada
  401197: call   401150 <checksum>      ; chama checksum(local1)
  40119c: mov    DWORD PTR [rbp-0x4], eax    ; retorno → local2 (int)
  40119f: cmp    DWORD PTR [rbp-0x4], 0x5f3a21   ; local2 == CONST?
  4011a6: jne    4011c0
  ...
```

O objetivo **não é entender ainda**. É transformar bytes em uma narrativa mecânica. Quando você
termina, a estrutura aparece sozinha — porque você já viu que há um `call`, que o retorno é
comparado com uma constante, que há um desvio condicional.

### Passo 5 — Padrões estruturais

Agora identifique as formas conhecidas. Consulte o Módulo 4:

| O que você vê | O que é |
|---|---|
| Rótulo + `cmp` + salto para fora + `jmp` de volta | Laço |
| `cmp` + `jcc` com condição invertida | `if` |
| `jmp QWORD PTR [reg*8+base]` | Tabela de saltos (`switch`) |
| `setcc` + `movzx` sem salto | Retorno booleano |
| `[rbp-N]` com N múltiplo de 4, acessado em sequência | Struct ou array de `int` |
| Escala 8 no endereçamento | Array de ponteiros ou `long` |
| Dois `mov` de memória em sequência sobre o mesmo valor | Ponteiro para ponteiro |
| `shr`/`sar` + `imul` com constante estranha | Divisão por constante |
| `xor eax, eax` no fim de um corpo de laço | Soma/contador |

### Passo 6 — Reconstruir e **validar**

Escreva o pseudocódigo C. Depois **valide** — e este passo é o que quase ninguém faz:

1. Compile seu C reconstruído com `-O0` e `-O2`.
2. Compare o assembly gerado com o original.
3. Se divergir, seu modelo está errado em algum ponto. Volte ao Passo 4.

Comparar assembly gerado com assembly original é a validação mais forte que existe. Ela não
mente.

---

## 6.2 Reconstruindo estruturas de dados

Sem informação de tipo, você deduz pelos **padrões de acesso**.

### A pista dos offsets

```asm
mov  eax, DWORD PTR [rdi]        ; offset 0
mov  ecx, DWORD PTR [rdi+0x4]    ; offset 4
mov  rdx, QWORD PTR [rdi+0x8]    ; offset 8
movzx eax, BYTE PTR [rdi+0x10]   ; offset 16
```

Você acabou de reconstruir:

```c
struct desconhecida {
    int  campo1;    // offset 0, 4 bytes
    int  campo2;    // offset 4, 4 bytes
    long campo3;    // offset 8, 8 bytes
    char campo4;    // offset 16, 1 byte
    // sizeof provavelmente 24 (alinhamento)
};
```

**Regras de dedução:**

| Largura acessada | Tipo provável |
|---|---|
| `BYTE PTR` (1) | `char` / `uint8_t` |
| `WORD PTR` (2) | `short` / `uint16_t` |
| `DWORD PTR` (4) | `int` / `uint32_t` / ponteiro em 32 bits |
| `QWORD PTR` (8) | `long` / ponteiro / `size_t` |
| `xmm` | `float`/`double` ou vetor (SSE) |

**Espaços entre campos** ("buracos" de 4 bytes entre offset 4 e 8) são `padding` de alinhamento.
Struct em C alinha cada campo ao tamanho dele — um `long` precisa estar em offset múltiplo de 8.

⚠ **Se você vir um offset que não fecha com nenhuma estrutura plausível, considere que o "objeto"
não é uma struct.** Pode ser um array (acesso por índice), uma união, ou um bloco de bytes
interpretado de formas diferentes.

### Diferenciando struct de array

```asm
; STRUCT: base fixa, offsets constantes
mov eax, DWORD PTR [rdi]
mov eax, DWORD PTR [rdi+0x4]
mov eax, DWORD PTR [rdi+0x8]

; ARRAY: base fixa, offsets variáveis com escala
mov eax, DWORD PTR [rdi+rax*4]
mov eax, DWORD PTR [rdi+rcx*4]
```

A presença de **escala com índice variável** indica array. Offsets constantes indicam struct.

### Array de structs

```asm
; v[i].campo  onde sizeof(struct) = 16
lea  rdx, [rax+rax*1]      ; rdx = i*2
shl  rdx, 3                ; rdx = i*16   ← sizeof
mov  eax, DWORD PTR [rdi+rdx]      ; campo em offset 0
mov  eax, DWORD PTR [rdi+rdx+0x8]  ; campo em offset 8
```

O `i * N` intermediário revela o `sizeof`. **O multiplicador é o tamanho do elemento**, e isso
é sempre informação valiosa.

---

## 6.3 Reconstruindo assinaturas de função

### Contando argumentos

Pelos valores lidos nas linhas iniciais:

```asm
; função usa rdi, rsi, rdx, ecx → provavelmente 4 argumentos
mov  rax, QWORD PTR [rdi]     ; arg1 é ponteiro
mov  eax, DWORD PTR [rsi]     ; arg2 é ponteiro para int (ou int)
mov  ecx, edx                 ; arg3 é int
add  ecx, ecx                 ; arg4 usado depois?
```

**Como diferenciar valor de ponteiro:** um argumento que é **desreferenciado** (`[rdi]`) é
ponteiro. Um argumento que é **usado aritmeticamente** (`add eax, edx`) é valor.

### Determinando o tipo de retorno

```asm
; Retorna int/valor:
mov  eax, DWORD PTR [...]
ret

; Retorna ponteiro:
mov  rax, QWORD PTR [...]
ret

; Retorna void:
; nenhuma escrita em eax antes do ret; ou apenas `ret` no fim
```

N N **`setcc` seguido de `movzx eax, al` significa retorno booleano.** É um dos padrões mais
úteis: quando você vê essa sequência, sabe que a função retorna `int` com valor 0 ou 1 — que em
C é `_Bool` ou convencionalmente um `int` booleano.

### Reconhecendo a libc sem nome

Mesmo *stripped*, o comportamento denuncia:

| Padrão | Função provável |
|---|---|
| Loop byte a byte até NUL, incrementa índice | `strlen` |
| Dois ponteiros, copia byte a byte | `strcpy` / `memcpy` |
| Compara byte a byte, retorna diferença | `strcmp` |
| `imul` com 0x5DEECE66D, shifts | RNG ou hash |
| Loop com 4/8 bytes por iteração, usa `xmm` | `memcpy` vetorizado |

---

## 6.4 Identificando algoritmos por assinatura

### Constantes que denunciam

| Constante | Algoritmo |
|---|---|
| `0x5DEECE66D`, `0xB` | `rand()` do glibc (LCG) |
| `0x67452301`, `0xEFCDAB89`, `0x98BADCFE` | MD5 / SHA-1 (iniciais) |
| `0x6A09E667`, `0xBB67AE85` | SHA-256 |
| `0x9E3779B9` | TEA, XXTEA, ou hash baseado em golden ratio |
| `0xCCCCCCCC` | `int3` padding ou valor de inicialização |
| `0xCBF29CE484222325` | FNV-1a 64 bits |
| `0x100000001B3` | FNV prime 64 bits |
| `0xEDB88320` | CRC-32 (polinômio reverso) |
| `0x04C11DB7` | CRC-32 (polinômio normal) |
| `0x9E3779B97F4A7C15` | hash multiplicativo / splitmix64 |

**Reconhecer essas constantes economiza horas.** Você não precisa reconstruir o algoritmo —
identifica e segue em frente.

### Padrões estruturais

| Padrão | Algoritmo provável |
|---|---|
| Blocos de 64 bytes, 64 rodadas, constantes em `.rodata` | SHA-256 / SHA-512 |
| Blocos de 16 bytes, 10 rodadas, tabela de 256 bytes | AES |
| `i * 31 + byte` em loop sobre string | hash de string estilo Java |
| `h ^= byte; h *= 0x1000193` | FNV-1a |
| XOR com chave de 1 byte repetida | cifra XOR trivial |
| Rotação (`rol`/`ror`) + XOR + adição, 16–32 rodadas | ARX (ChaCha20, Salsa20, TEA) |
| Tabela de 256 bytes indexada por byte de entrada | S-box (AES, ou substituição customizada) |
| `zlib`-style: dois valores de histograma, árvore | Deflate |

### Tabelas em `.rodata`

Muitos algoritmos trazem tabela. Localize:

```bash
readelf -x .rodata binario | head -40
```

Uma tabela de 256 bytes com valores aparentemente aleatórios é quase sempre uma S-box ou tabela
de substituição. Uma tabela de 64 valores em 32 bits é provavelmente constantes de rodada.

---

## 6.5 LAB — Reconstruir uma função desconhecida

**Duração:** 180 min
**Objetivo:** aplicar o método completo, de ponta a ponta, em binário sem símbolos.

### Passo 1 — O alvo

```bash
mkdir -p ~/re-lab/lab6 && cd ~/re-lab/lab6

cat > alvo.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Estrutura que você vai ter que reconstruir */
struct item {
    int    tipo;
    char   rotulo[12];
    long   peso;
    int    ativo;
};

/* Função 1: você vai reconstruir esta */
static long pontua(struct item *itens, int n) {
    long total = 0;
    int  i;

    for (i = 0; i < n; i++) {
        if (!itens[i].ativo)
            continue;
        switch (itens[i].tipo) {
            case 1:  total += itens[i].peso * 3; break;
            case 2:  total += itens[i].peso * 7; break;
            case 3:  total += itens[i].peso * 2 + 1; break;
            default: total += itens[i].peso; break;
        }
    }
    return total;
}

/* Função 2: também */
static unsigned int embaralha(unsigned int x) {
    x ^= x >> 16;
    x *= 0x7feb352dU;
    x ^= x >> 15;
    x *= 0x846ca68bU;
    x ^= x >> 16;
    return x;
}

int main(void) {
    struct item itens[4] = {
        {1, "alfa",  10, 1},
        {2, "beta",  20, 1},
        {3, "gama",  30, 0},
        {9, "delta", 40, 1}
    };

    long p = pontua(itens, 4);
    unsigned int e = embaralha((unsigned int)p);

    printf("pontuacao=%ld embaralhado=0x%08x\n", p, e);
    return 0;
}
EOF

gcc -O1 -o alvo-6 alvo.c
cp alvo-6 alvo-6-stripped && strip alvo-6-stripped
gcc -O1 -o alvo-6-sym alvo.c
```

⚠ **Não abra `alvo.c` de novo até terminar a análise.** O arquivo está aí só para você compilar.
O exercício é analisar o binário sem ele. Se você espiar, o lab perde o valor.

### Passo 2 — Reconhecimento

```bash
file alvo-6-stripped
strings -n 6 -t x alvo-6-stripped
objdump -d -j .plt -M intel alvo-6-stripped
```

Anote: quais funções de libc o binário usa? Isso te diz o que ele faz no nível macro.

### Passo 3 — Encontre `pontua`

Sem símbolos, mas você tem uma pista: a string `"pontuacao=%ld embaralhado=0x%08x\n"` está em
`.rodata`. O `main` a referencia. Quem chama a função que você quer está dentro de `main`.

```bash
# Localize a string e veja quem a referencia — no GDB ou no Ghidra
objdump -s -j .rodata alvo-6-stripped | grep -A2 pontuacao
```

No Ghidra: abra, analise, ache a string, use xref, chegue em `main`, e siga a chamada.

### Passo 4 — Analise com o método

Para a função `pontua`:

1. **Delimite:** onde começa, onde termina, quanto de stack reserva.
2. **Anote** cada instrução linha a linha, sem interpretar ainda (Passo 4 do método).
3. **Identifique:** há laço? Quantos? Há `switch`? É tabela de saltos ou cadeia?
4. **Reconstrua a struct `item`:** quais são os campos, os tipos, os offsets, o `sizeof`?
5. **Reconstrua a assinatura:** quantos argumentos, de que tipo, o que retorna?
6. **Escreva o C.**

Perguntas específicas para responder:

- Qual o `sizeof(struct item)`? (Dica: procure o multiplicador do índice.)
- O campo `ativo` está em qual offset, e qual a largura acessada?
- O `continue` no laço `for` deixou rastro? Como?
- O `switch` virou tabela de saltos? Quantos casos?
- Por que a multiplicação por 3 pode aparecer como `lea` em vez de `imul`?

### Passo 5 — Analise `embaralha`

Esta é uma função sem laço, pura aritmética. Reconheça o padrão:

- Qual o tamanho da entrada? (Que registrador é usado?)
- Quantas rodadas de xor-shift-multiply?
- As constantes são conhecidas? Consulte a tabela da seção 6.4.
- Qual é o algoritmo?

Escreva o C reconstruído e **compile com `-O1`** para comparar com o original. As duas versões
devem gerar assembly equivalente.

### Passo 6 — Validação obrigatória

Este é o passo que fecha o método:

```bash
# Escreva seu C reconstruído em reconstruido.c
gcc -O1 -S -masm=intel -fno-asynchronous-unwind-tables -o meu.s reconstruido.c
gcc -O1 -S -masm=intel -fno-asynchronous-unwind-tables -o orig.s alvo.c
diff <(grep -A40 'pontua' meu.s) <(grep -A40 'pontua' orig.s)
```

Se as funções divergem, seu modelo está errado em algum ponto. **Volte ao passo 4** e reanalise o
trecho específico onde divergiu. Iterar aqui é o trabalho real de engenharia reversa.

N N **Seu binário reconstruído não precisa ser byte-idêntico** — nomes de variável e ordem de
operações independentes podem variar. O que precisa coincidir é a **lógica**: mesmos saltos,
mesmas comparações, mesmo número de acessos de memória relevantes.

### Passo 7 — Validação comportamental

Confirme que sua reconstrução se comporta igual:

```bash
./alvo-6-sym
# sua versão reconstruída deve imprimir a MESMA linha

gcc -O1 -o reconstruido alvo.c   # com a struct e a função que você reconstruiu
./reconstruido
```

### Critérios de aceitação

- Você documentou a struct `item` com todos os campos, tipos, offsets e `sizeof` — **corretos**.
- Você reconstruiu a assinatura de `pontua` corretamente (argumentos e retorno).
- Você identificou `embaralha` como um hash multiplicativo e listou as constantes.
- Você escreveu C reconstruído que compila e gera assembly equivalente em lógica.
- Você validou comportamentalmente: a saída coincide com a do binário original.
- Você documentou **pelo menos dois pontos onde sua primeira hipótese estava errada** e como
  descobriu. Isso é o entregável mais valioso do lab.

### Bônus (se houver tempo)

Aumente a dificuldade com `-O2` e `-O3`:

```bash
gcc -O2 -o alvo-6-O2 alvo.c && strip alvo-6-O2
gcc -O3 -o alvo-6-O3 alvo.c && strip alvo-6-O3
```

Refaça a análise em `-O3` e veja o que mudou: o laço de `pontua` foi vetorizado? O `switch` mudou
de estratégia? `embaralha` foi inlined em `main`?

---

## Avaliação

1. Descreva as seis etapas do método. Por que anotar linha a linha **antes** de interpretar
   melhora o resultado?
2. Como você diferencia um array de uma struct pela forma do endereçamento?
3. Você vê `mov eax, DWORD PTR [rdi+0x18]` e `movzx eax, BYTE PTR [rdi+0x1c]` na mesma função.
   O que você deduz sobre a estrutura? Por que o offset 28 e não 25?
4. Como determinar se um argumento é ponteiro ou valor?
5. `setcc` + `movzx eax, al` no fim de uma função: qual o tipo de retorno provável?
6. Cite três constantes que identificam algoritmo e o que cada uma indica.
7. O que significa uma tabela de 256 bytes com valores aparentemente aleatórios em `.rodata`?
8. Por que multiplicação por 3 pode aparecer como `lea` e não `imul`? Qual é mais rápida e por quê?
9. Como você valida uma reconstrução? Por que a comparação de assembly gerado é mais forte que
   a comparação de comportamento em testes?
10. Encontre a assinatura de `pontua`: ela recebe uma struct ou um array de structs? Como você
    distingue os dois casos no disassembly?

---

**Próximo:** [Módulo 7 — Análise de malware e ofuscação](modulo-07.md)
