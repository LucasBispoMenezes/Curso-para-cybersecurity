# Módulo 1 — Arquitetura e o Mapa da Máquina

**Carga:** 3 horas (1h30 teoria · 1h30 lab)
**Pré-requisitos:** saber programar em alguma linguagem; binário e hexadecimal sem pânico

---

## Objetivos

1. Explicar o que é assembly e por que existe mais de uma "linguagem de montagem".
2. Distinguir sintaxe Intel de sintaxe AT&T e não se perder entre as duas.
3. Nomear os registradores de propósito geral do x86-64 e entender os sub-registradores.
4. Entender o modelo de memória plano e endereçamento de 64 bits.
5. Ler a referência de instrução e saber onde procurar quando não souber algo.

---

## ⚠ Antes de começar

Este módulo não analisa nenhum binário de terceiro. Você vai compilar tudo o que examinar.
Engenharia reversa de software que não é seu tem implicações legais e contratuais — veja a
seção de ética na [ementa](00-ementa.md). Nada no curso requer sair da sua VM.

---

## 1.1 O que "assembly" realmente é

Um processador não entende `if`, `for`, nem `printf`. Ele entende **opcodes** — números. Um
opcode diz coisas como "mova 4 bytes da memória no endereço em RDI para o registrador EAX".

Código de máquina é a sequência desses bytes. Assembly é a **representação textual** dessa
sequência, um para um. Quando você vê:

```asm
mov eax, 42
```

O que está no arquivo binário são os bytes `B8 2A 00 00 00`. É literalmente a mesma coisa, escrita
de forma que um humano consiga ler.

Três consequências que decorrem disso:

**Assembly não é uma linguagem, é uma família.** x86-64, ARM64, RISC-V, MIPS — cada arquitetura
tem seu próprio conjunto de instruções e seu próprio assembly. Este curso é **x86-64**, a
arquitetura de quase todo servidor Linux e desktop Windows.

**Assembly não é portável.** Um binário x86-64 não roda em ARM, e o assembly correspondente não
faz sentido lá. Isso não é limitação — é o preço de estar perto do metal.

**A tradução é quase sempre fiel, mas não sempre.** Desmontadores fazem inferência: eles
reconstroem o texto a partir dos bytes. Às vezes um desmontador erra, ou o binário foi
deliberadamente construído para confundir desmontagem. O Módulo 7 trata disso.

---

## 1.2 Duas sintaxes, uma arquitetura

Aqui está o motivo pelo qual iniciantes desistem. A mesma instrução, na mesma arquitetura
x86-64, tem duas grafias concorrentes:

```asm
; Sintaxe Intel (NASM, MASM, Windows, Ghidra, IDA — padrão)
mov rax, rbx        ; rax = rbx
mov rax, 42         ; rax = 42
mov rax, [rbx]      ; rax = memória no endereço em rbx
```

```gas
# Sintaxe AT&T (GAS, objdump, GCC — padrão no Linux)
movq %rbx, %rax     # rax = rbx
movq $42, %rax      # rax = 42
movq (%rbx), %rax   # rax = memória no endereço em rbx
```

Quatro diferenças que resolvem 95% da confusão:

| Aspecto | Intel | AT&T |
|---|---|---|
| Ordem dos operandos | `destino, origem` | `origem, destino` |
| Prefixo de registrador | nenhum (`rax`) | `%` (`%rax`) |
| Literal imediato | nenhum (`42`) | `$` (`$42`) |
| Sufixo de tamanho | no registrador (`rax`=8B, `eax`=4B) | na instrução (`movq`=8B, `movl`=4B) |

**A inversão de ordem é a armadilha.** `mov rax, rbx` (Intel) copia **de** rbx **para** rax.
`movq %rbx, %rax` (AT&T) faz exatamente a mesma coisa. A leitura é que muda.

Mnemônico para não se perder: **AT&T é origem-primeiro.** Pense "de onde → para onde".

### Qual você vai usar

| Ferramenta | Sintaxe padrão | Como trocar |
|---|---|---|
| GAS (montador do GNU) | AT&T | `.intel_syntax noprefix` no topo |
| NASM | Intel | — |
| `objdump -d` | AT&T | `objdump -d -M intel` |
| GDB | AT&T | `set disassembly-flavor intel` |
| Ghidra, IDA, Binary Ninja | Intel | — |
| `gcc -S` | AT&T | `gcc -S -masm=intel` |

**Recomendação para este curso:** configure tudo para Intel. No `.gdbinit`:

```
set disassembly-flavor intel
set pagination off
```

E use sempre `objdump -d -M intel`. Ler Intel e AT&T alternadamente no começo é o caminho mais
rápido para a confusão. Domine uma, depois reconheça a outra — porque `objdump` puro, sem a flag,
vai continuar te mostrando AT&T quando você menos esperar.

---

## 1.3 Registradores

No x86-64 existem 16 registradores de propósito geral, de 64 bits cada. Eles têm nomes herdados
de quarenta anos de história — e essa história é a razão pela qual cada um tem sub-registradores
com nomes diferentes.

### Os 16 registradores

| 64 bits | 32 bits | 16 bits | 8 bits (baixo) | Nome convencional | Papel típico |
|---|---|---|---|---|---|
| `rax` | `eax` | `ax` | `al` | Accumulator | Retorno de função, aritmética |
| `rbx` | `ebx` | `bx` | `bl` | Base | Armazenamento geral (callee-saved) |
| `rcx` | `ecx` | `cx` | `cl` | Counter | Contador de loop, shifts |
| `rdx` | `edx` | `dx` | `dl` | Data | 3º argumento, extensão de multiplicação |
| `rsi` | `esi` | `si` | `sil` | Source Index | 2º argumento, origem em cópia |
| `rdi` | `edi` | `di` | `dil` | Destination Index | 1º argumento, destino em cópia |
| `rbp` | `ebp` | `bp` | `bpl` | Base Pointer | Base do stack frame |
| `rsp` | `esp` | `sp` | `spl` | Stack Pointer | Topo da stack |
| `r8`–`r15` | `r8d`–`r15d` | `r8w`–`r15w` | `r8b`–`r15b` | — | Adicionados no x86-64 |

### A regra dos sub-registradores

**Escrever em um sub-registrador de 32 bits zera os 32 bits superiores.** Isso é uma decisão de
projeto do x86-64 e é fonte de bug sutil.

```asm
mov rax, 0xffffffffffffffff   ; rax = todos os bits em 1
mov eax, 42                   ; rax = 0x000000000000002a  ← os 32 bits altos foram ZERADOS
```

Compare com escrever em `ax` ou `al`, que **preserva** os bits superiores:

```asm
mov rax, 0xffffffffffffffff
mov al, 42                    ; rax = 0xffffffffffffff2a  ← só o byte baixo mudou
```

N O T A Isso aparece o tempo todo em código real. Quando você vê `mov eax, 0` num disassembly,
o autor está zerando `rax` inteiro — porque a escrita em 32 bits zera os 64. É a forma idiomática
de zerar registrador, e é mais curta que `xor rax, rax` em bytes... na verdade não é, mas o
compilador usa as duas formas por razões próprias.

### Registradores especiais que você vai encontrar

| Registrador | Papel |
|---|---|
| `rip` | Instruction Pointer — endereço da próxima instrução. Não se escreve diretamente. |
| `rflags` | Flags: resultado zero, carry, overflow, sinal. Alimenta os saltos condicionais. |
| `fs`, `gs` | Segmentos usados para TLS (thread-local storage) e canário de stack |

`fs` merece atenção desde já: em Linux x86-64, `fs:0x28` é o **stack canary** — o valor que o
compilador coloca para detectar buffer overflow. Você vai ver isso repetidas vezes a partir do
Módulo 4, e vale reconhecer agora.

---

## 1.4 O modelo de memória

x86-64 usa um espaço de endereços plano de 64 bits, na prática limitado a 48 bits de endereço
virtual (256 TB) nas implementações atuais. A memória é organizada em segmentos com propósitos
distintos:

```
Endereços altos (0x7fff...)
┌─────────────────────────┐
│   Stack                 │  ← cresce PARA BAIXO
│   (variáveis locais)    │
├─────────────────────────┤
│            ↓            │
│                         │
│            ↑            │
├─────────────────────────┤
│   Heap                  │  ← cresce PARA CIMA
│   (malloc, alocação     │
│    dinâmica)            │
├─────────────────────────┤
│   .bss                  │  ← variáveis globais não inicializadas
├─────────────────────────┤
│   .data                 │  ← variáveis globais inicializadas
├─────────────────────────┤
│   .rodata               │  ← strings literais, constantes
├─────────────────────────┤
│   .text                 │  ← o código do programa
└─────────────────────────┘
Endereços baixos (0x400000 típico em Linux)
```

Três coisas para guardar disso:

**A stack cresce para baixo.** `push` subtrai de `rsp`; `pop` soma. Isso surpreende quem vem de
outras arquiteturas — e é a razão pela qual "endereço menor" significa "mais recente" na stack.

**Os endereços que você vê em disassembly são virtuais.** O endereço `0x401136` de uma função
não é onde ela está na RAM física. O kernel traduz via tabelas de página. Por isso PIE
(Position-Independent Executable) existe: o binário pode ser carregado em endereço diferente a
cada execução.

**Cada seção tem permissão distinta.** `.text` é executável e somente-leitura; `.data` é
gravável e não-executável. Essa separação é a base de proteções modernas (NX, W^X) — e a razão
pela qual exploração clássica de injeção de shellcode direto na stack não funciona mais.

---

## 1.5 Instruções: as poucas que você precisa agora

Você não vai decorar centenas de instruções. Vai reconhecer padrões. Estas são as que aparecem
em praticamente todo código:

### Movimentação

```asm
mov  rax, rbx            ; copia
lea  rax, [rbx+8]        ; "Load Effective Address" — calcula endereço SEM acessar memória
```

`lea` merece uma nota. Ela **calcula** um endereço e coloca no destino; não lê memória. Por isso
compiladores a usam para aritmética disfarçada: `lea rax, [rbx+rcx*4]` faz `rax = rbx + rcx*4`
sem tocar em memória nenhuma. Você vai ver isso constantemente no Módulo 4.

### Aritmética

```asm
add  rax, rbx            ; rax += rbx
sub  rax, 42             ; rax -= 42
inc  rax                 ; rax++
dec  rax                 ; rax--
imul rax, rbx            ; rax *= rbx (com sinal)
xor  rax, rax            ; rax = 0 (idiomático — mais rápido e mais curto)
and  rax, 0xff           ; máscara: mantém só o byte baixo
or   rax, rbx            ; combina bits
not  rax                 ; inverte todos os bits
shl  rax, 3              ; rax <<= 3 (equivale a multiplicar por 8)
shr  rax, 3              ; rax >>= 3 (equivale a dividir por 8, sem sinal)
```

`shl`/`shr` por potência de 2 são o que compiladores geram para multiplicação e divisão por
constante. Reconhecer isso é metade do trabalho de ler código otimizado.

### Controle de fluxo

```asm
jmp  label               ; salto incondicional
cmp  rax, rbx            ; compara (subtrai sem guardar, só atualiza flags)
test rax, rax            ; testa (AND sem guardar — usa para "é zero?")
je   label               ; salta se igual (ZF=1)
jne  label               ; salta se diferente
jg   label               ; salta se maior (com sinal)
jl   label               ; salta se menor (com sinal)
ja   label               ; salta se acima (sem sinal)
jb   label               ; salta se abaixo (sem sinal)
call funcao              ; chama função (empilha endereço de retorno)
ret                      ; retorna (desempilha endereço de retorno)
```

**`cmp` e `test` não modificam os operandos** — só as flags. Essa é a chave para ler todo
condicional em assembly: procure o `cmp`/`test` antes do salto.

### Acesso a memória

```asm
mov rax, [rbx]           ; lê 8 bytes no endereço em rbx
mov [rbx], rax           ; escreve
mov rax, [rbx+8]         ; lê no endereço rbx+8 (campo seguinte de uma struct)
mov rax, [rbx+rcx*8]     ; array: base + índice*sizeof(elemento)
mov eax, [rbx]           ; lê só 4 bytes (e zera o alto de rax, pela regra dos 32 bits)
```

A forma `[base + índice*escala + deslocamento]` é o **endereçamento de memória do x86** e é o que
faz a arquitetura boa para arrays e structs. Escala pode ser 1, 2, 4 ou 8 — as larguras nativas.

---

## 1.6 Onde procurar quando não souber

Você vai encontrar instruções que não estão neste módulo. Duas fontes:

```bash
# Referência rápida local — se tiver o manual instalado
# https://www.intel.com/sdm — baixe o Volume 2

# A ferramenta que responde na hora, offline:
objdump -d -M intel binario | less

# Para entender uma instrução específica:
# procure "<mnemônico> x86 instruction" — ou use o "x86 instruction reference"
# do site felixcloutier.com (espelho navegável do manual Intel, sem download)
```

Não decore. Aprenda o padrão e saiba onde consultar. Profissionais de engenharia reversa
consultam a referência de instrução regularmente — ninguém tem o manual inteiro na cabeça.

---

## 1.7 LAB — Seu primeiro contato com o metal

**Duração:** 90 min
**Objetivo:** ver código C virar assembly, e entender o que cada linha faz.

### Passo 1 — O programa mais simples possível

```bash
mkdir -p ~/re-lab/lab1 && cd ~/re-lab/lab1

cat > simples.c <<'EOF'
int soma(int a, int b) {
    return a + b;
}

int main(void) {
    int r = soma(3, 4);
    return r;
}
EOF
```

### Passo 2 — Compile sem otimização e leia

```bash
gcc -O0 -g -o simples-O0 simples.c
objdump -d -M intel simples-O0 | sed -n '/<soma>:/,/^$/p'
```

Você deve ver algo assim (endereços variam):

```asm
0000000000001129 <soma>:
    1129:  push   rbp
    112a:  mov    rbp, rsp
    112d:  mov    DWORD PTR [rbp-0x4], edi     ; primeiro argumento → memória
    1131:  mov    DWORD PTR [rbp-0x8], esi     ; segundo argumento → memória
    1135:  mov    eax, DWORD PTR [rbp-0x4]
    1138:  mov    edx, DWORD PTR [rbp-0x8]
    113b:  add    eax, edx
    113d:  pop    rbp
    113e:  ret
```

Leia com calma. É literalmente "salve a base antiga, crie a nova, guarde os argumentos na
stack, leia de volta, some, restaure, retorne". **Todo o vaivém com a memória é desperdício** —
o compilador sem otimização traduz linha por linha, sem pensar. Isso é importante: `-O0` mostra
a intenção do código; `-O2` mostra o resultado.

### Passo 3 — Compile com otimização

```bash
gcc -O2 -o simples-O2 simples.c
objdump -d -M intel simples-O2 | sed -n '/<soma>:/,/^$/p'
```

Agora:

```asm
0000000000001040 <soma>:
    1040:  lea    eax, [rdi+rsi*1]     ; eax = rdi + rsi, sem tocar em memória
    1043:  ret
```

**Duas instruções.** Toda a stack frame desapareceu. `lea` foi usada como aritmética pura. Os
argumentos já chegaram em `rdi` e `rsi` — que é a convenção de chamada, assunto do Módulo 2.

Compare as duas saídas e escreva, com suas palavras, por que `-O2` removeu tudo o que `-O0` fez.

### Passo 4 — Traduza uma linha de cada vez

Escolha uma linha do `main` em `-O0` e escreva num arquivo o que ela faz. Exemplo de formato:

```
112d: mov DWORD PTR [rbp-0x4], edi
→ Guarda os 4 bytes do registrador edi no endereço rbp-4.
   rbp é a base do stack frame; rbp-4 é a primeira variável local.
   edi é o primeiro argumento da função (edi é a metade baixa de rdi).
```

### Passo 5 — Reconheça a sintaxe AT&T

```bash
objdump -d simples-O0 | sed -n '/<soma>:/,/^$/p'
```

Agora sem `-M intel`. Identifique as três linhas equivalentes e escreva a tradução AT&T ↔ Intel
de cada uma.

### Passo 6 — Escreva assembly você mesmo

Agora a parte que consolida. Escreva um programa em NASM que retorna 42 como código de saída:

```bash
cat > ret42.asm <<'EOF'
section .text
global _start

_start:
    mov rax, 60      ; syscall 60 = exit
    mov rdi, 42      ; código de saída = 42
    syscall
EOF

nasm -f elf64 ret42.asm -o ret42.o
ld ret42.o -o ret42
./ret42; echo "código de saída: $?"
```

Deve imprimir `código de saída: 42`.

N O T A Aqui não há `main` nem libc: `_start` é o ponto de entrada que o linker usa, e você fala
direto com o kernel via `syscall`. O número da syscall vai em `rax` e os argumentos em `rdi`,
`rsi`, `rdx`, `r10`, `r8`, `r9` — outra convenção que você vai encontrar no Módulo 2.

### Critérios de aceitação

- Você tem as duas saídas (`-O0` e `-O2`) de `<soma>` salvas em arquivo.
- Você escreveu, com suas palavras, por que a versão otimizada tem duas instruções.
- Você traduziu corretamente as três linhas AT&T ↔ Intel.
- `./ret42; echo $?` retorna `42`.
- Você consegue explicar o que `lea` faz e por que ela não acessa memória.

---

## Avaliação

1. O que está no arquivo `.o` quando você escreve `mov eax, 42` em NASM? Por que assembly e
   código de máquina são a "mesma coisa"?
2. Em `mov rax, rbx` (Intel), qual registrador é a origem? Como a mesma instrução se escreve em
   AT&T, e o que muda na leitura?
3. Explique a regra dos sub-registradores de 32 bits. O que vale em `rax` depois de
   `mov rax, -1` seguido de `mov eax, 7`? E depois de `mov al, 7`?
4. Por que a stack cresce para baixo? O que `push rax` faz com `rsp`?
5. Qual a diferença entre `mov rax, [rbx+8]` e `lea rax, [rbx+8]`? Por que compiladores usam
   `lea` para aritmética?
6. `cmp` e `test` não guardam resultado. O que elas fazem, e por que isso basta para um `je`?
7. Em `mov rax, [rbx+rcx*8]`, o que a escala `8` representa? Em que situação ela seria `4`?
8. Por que `fs:0x28` aparece em código compilado no Linux?

---

**Próximo:** [Módulo 2 — Memória, stack e convenções de chamada](modulo-02.md)
