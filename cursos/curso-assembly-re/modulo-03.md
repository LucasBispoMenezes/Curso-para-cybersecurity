# Módulo 3 — Assembly na Prática

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Montar, linkar e executar um programa em assembly puro.
2. Chamar funções da libc a partir de assembly, respeitando a ABI e o alinhamento.
3. Usar syscalls diretas do Linux.
4. Depurar assembly com GDB passo a passo.
5. Entender o que o montador aceita e o que o linker resolve.

---

## ⚠ Ambiente

Tudo neste módulo roda na sua VM Linux. Você escreve o código, então tem autorização por
definição. A regra geral do curso continua: nada de analisar binário de terceiro sem base legal.

---

## 3.1 Do texto ao processo executável

São quatro estágios, e confundir quais são ajuda a entender erros:

```
seu.asm  ──[montador: nasm]──▶  seu.o  ──[linker: ld]──▶  executável
  texto                        objeto                    ELF executável
                                 ↑
                    símbolos não resolvidos (printf, etc.)
                    ficam pendentes até o link
```

**O montador (NASM)** traduz mnemônicos em bytes. Ele não sabe onde `printf` está — só anota
"aqui tem uma referência a printf" e deixa pendente.

**O linker (`ld`)** resolve essas referências. Ele combina os `.o`, liga com as bibliotecas, e
produz o ELF final. É ele que decide endereços.

**Separar os dois estágios é a razão pela qual "erro de linker" e "erro de montagem" são coisas
completamente diferentes.** Erro de montagem é sintaxe; erro de linker é símbolo que ninguém
definiu.

```bash
nasm -f elf64 prog.asm -o prog.o     # monta
ld prog.o -o prog                     # linka
./prog
```

`-f elf64` é o formato de saída — obrigatório. No modo 64 bits é `elf64`, no 32 bits é `elf32`.

---

## 3.2 Hello World sem libc: syscall direta

Comece pelo caminho mais "cru" — falar direto com o kernel.

```asm
; hello-syscall.asm — escreve na saída padrão usando syscall direta
; nasm -f elf64 hello-syscall.asm -o hello.o && ld hello.o -o hello

section .data
    mensagem db "Ola, mundo!", 10      ; 10 = '\n'
    tam      equ $ - mensagem          ; $ é o endereço atual; diferença = comprimento

section .text
    global _start

_start:
    mov rax, 1          ; syscall 1 = write
    mov rdi, 1          ; fd 1 = stdout
    mov rsi, mensagem   ; ponteiro para o buffer
    mov rdx, tam        ; quantos bytes
    syscall

    mov rax, 60         ; syscall 60 = exit
    mov rdi, 0          ; código de saída 0
    syscall
```

### O que está acontecendo

- `mov rax, 1` coloca o **número da syscall** em `rax`. O kernel olha `rax` para saber o que fazer.
- Os argumentos vão em `rdi`, `rsi`, `rdx`, `r10`, `r8`, `r9` — a convenção de syscall.
- `syscall` transfere controle ao kernel.
- `$ - mensagem` é avaliação em tempo de montagem: `$` é o endereço corrente, então a diferença
  é o comprimento da string. Truque idiomático que você verá em todo código assembly.

### Tabela de syscalls que você vai usar

| Número | Nome | Argumentos |
|---|---|---|
| 0 | `read` | rdi=fd, rsi=buf, rdx=count |
| 1 | `write` | rdi=fd, rsi=buf, rdx=count |
| 2 | `open` | rdi=path, rsi=flags, rdx=mode |
| 3 | `close` | rdi=fd |
| 60 | `exit` | rdi=status |
| 9 | `mmap` | rdi=addr, rsi=len, rdx=prot, r10=flags, r8=fd, r9=offset |

N N `open` (syscall 2) é a versão antiga. Em código moderno você verá `openat` (257), que recebe
um fd de diretório como primeiro argumento. O Módulo 7 volta nisso.

---

## 3.3 Hello World com libc: a ABI em ação

Agora o caminho que importa para engenharia reversa — porque todo binário real usa libc.

```asm
; hello-libc.asm — usa printf da libc
; nasm -f elf64 hello-libc.asm -o hello-libc.o
; ld -dynamic-linker /lib64/ld-linux-x86-64.so.2 -lc hello-libc.o -o hello-libc

extern printf
extern exit

section .data
    fmt  db "Ola, %s! Numero: %d", 10, 0    ; string de formato, terminada em NUL
    nome db "mundo", 0

section .text
    global _start

_start:
    ; printf(fmt, nome, 42)
    mov  rdi, fmt        ; 1º argumento: ponteiro para a string de formato
    mov  rsi, nome       ; 2º argumento
    mov  rdx, 42         ; 3º argumento
    xor  eax, eax        ; AL = 0 → nenhum argumento em xmm (obrigatório em variádicas)
    call printf

    ; exit(0)
    mov  rdi, 0
    call exit
```

### As três coisas que dão erro aqui

**1. O `xor eax, eax` antes de função variádica.** `printf` é variádica (recebe número variável
de argumentos). A ABI exige que `al` contenha o número de registradores `xmm` usados. Se você
não passar nenhum `float`/`double`, é zero. **Omitir isso é o erro mais clássico** — o programa
pode travar ou imprimir lixo, porque `printf` vai tentar ler registradores `xmm` que você não
preparou.

**2. O link com `-dynamic-linker`.** Sem essa flag, o linker não sabe qual interpretador dinâmico
usar e o executável não roda. É a diferença entre um ELF que carrega e um que dá
"cannot execute binary file".

**3. O alinhamento da stack.** `_start` não é chamada por ninguém — o kernel salta para lá. A
stack nesse ponto está alinhada de forma que `call printf` a desalinha. Se o programa travar
dentro de libc com erro de `movaps` ou SIGSEGV em código que você não escreveu, o conserto é:

```asm
_start:
    and  rsp, -16        ; força alinhamento de 16 bytes
    ; ou, se precisar preservar: sub rsp, 8 no ponto certo
```

### Comparação das duas abordagens

| Aspecto | Syscall direta | Via libc |
|---|---|---|
| Dependência | Nenhuma | libc dinâmica |
| Tamanho do binário | Minúsculo (~4 KB) | Bem maior |
| Portabilidade entre OS | Não (números mudam) | Sim |
| Uso em engenharia reversa | Comum em malware e shellcode | Comum em software normal |
| Iniciante deve começar por | Sim | Depois |

---

## 3.4 Estruturas de controle em assembly

Aqui está o padrão que, uma vez visto, você reconhece em qualquer disassembly.

### `if` / `else`

```c
if (a > b) { x = 1; } else { x = 2; }
```

```asm
    cmp  eax, ebx        ; compara a com b
    jle  senao           ; se a <= b, pula para o else
    mov  ecx, 1          ; então: x = 1
    jmp  fim
senao:
    mov  ecx, 2          ; senão: x = 2
fim:
```

**O idioma:** compara, salta **condição invertida** para o bloco seguinte. E o `jmp fim` no final
do bloco principal.

### `while`

```c
while (i < 10) { i++; }
```

```asm
    mov  eax, 0          ; i = 0
inicio:
    cmp  eax, 10         ; i < 10 ?
    jge  fim             ; se NÃO, sai do laço
    inc  eax             ; i++
    jmp  inicio
fim:
```

Padrão inconfundível: um rótulo, um `cmp`, um salto condicional **para fora**, e um `jmp` de
volta ao rótulo. Todo laço em assembly tem essa forma.

### `for`

Compiladores geralmente convertem `for` em `while` ou na forma com o incremento no fim:

```c
for (int i = 0; i < n; i++) { total += v[i]; }
```

```asm
    xor  eax, eax        ; i = 0
    xor  edx, edx        ; total = 0
teste:
    cmp  eax, esi        ; i < n ?
    jge  fim
    mov  ecx, DWORD PTR [rdi+rax*4]   ; v[i], escala 4 = sizeof(int)
    add  edx, ecx        ; total += v[i]
    inc  eax             ; i++
    jmp  teste
fim:
```

O `[rdi+rax*4]` com `rdi` como base e `rax` como índice é a assinatura de array de `int`.

### Loop otimizado: o que muda em `-O2`

```asm
    xor  eax, eax
    xor  edx, edx
    test esi, esi
    jle  fim
.loop:
    add  edx, DWORD PTR [rdi+rax*4]
    add  rax, 1
    cmp  rax, rsi
    jne  .loop
fim:
```

Três mudanças para reconhecer:

- `test esi, esi` + `jle` trata o caso `n <= 0` **antes** do laço — evita a primeira comparação
  em cada iteração.
- `cmp rax, rsi` + `jne` no fim em vez de `cmp` + `jge` no início: uma comparação por iteração
  em vez de duas.
- O índice ficou em `rax`, e a comparação é com `rsi` (64 bits) em vez de `esi`.

**Leitura de código otimizado é reconhecimento de forma, não decodificação literal.** Você
identifica "isso é um laço de soma de array de int" e segue.

---

## 3.5 Funções em assembly

```asm
; max3.asm — retorna o maior de três inteiros
; int max3(int a, int b, int c)

section .text
    global max3
    global _start

max3:
    ; argumentos já chegam em edi, esi, edx
    mov  eax, edi        ; eax = a (candidato inicial)
    cmp  esi, eax        ; b > a ?
    jle  .teste_c
    mov  eax, esi        ; sim: eax = b
.teste_c:
    cmp  edx, eax        ; c > eax ?
    jle  .fim
    mov  eax, edx        ; sim: eax = c
.fim:
    ret                  ; valor de retorno já está em eax

_start:
    mov  edi, 7
    mov  esi, 23
    mov  edx, 12
    call max3            ; eax = 23
    mov  edi, eax        ; código de saída = 23
    mov  rax, 60
    syscall
```

### Pontos que importam

- **Não há prologue nem epilogue.** A função não usa stack para nada — não precisa. Essa é a
  marca de função folha otimizada.
- **Nomes locais começando com `.`** são locais ao arquivo (`local labels` no NASM). Sem o ponto,
  um rótulo dentro de duas funções com o mesmo nome colidiria.
- **O valor de retorno já está em `eax`** porque trabalhamos com ele direto. Nada de mover para
  `rax` no final.
- `global max3` **exporta** o símbolo. Sem isso, outro arquivo não consegue chamar a função —
  e você recebe um erro de linker.

### Quando a função precisa de stack

```asm
; int soma_array(int *v, int n)
soma_array:
    push rbp
    mov  rbp, rsp
    sub  rsp, 16              ; espaço para duas variáveis locais
    mov  QWORD PTR [rbp-0x8], rdi   ; salva o ponteiro
    mov  DWORD PTR [rbp-0x10], esi  ; salva n

    mov  eax, 0               ; i = 0
    mov  edx, 0               ; total = 0
.loop:
    cmp  eax, DWORD PTR [rbp-0x10]
    jge  .fim
    mov  rcx, QWORD PTR [rbp-0x8]
    add  edx, DWORD PTR [rcx+rax*4]
    add  eax, 1
    jmp  .loop
.fim:
    mov  eax, edx             ; return total

    mov  rsp, rbp             ; epilogue
    pop  rbp
    ret
```

Isso é exatamente o que o GCC gera em `-O0`. Você acabou de escrever, à mão, o que o compilador
faria — e essa é a ponte para o Módulo 4.

---

## 3.6 Depurando assembly com GDB

Com assembly, você é a linguagem de alto nível. O GDB é seu compilador mental.

```bash
nasm -f elf64 -g -F dwarf prog.asm -o prog.o    # -g: informação de debug
ld prog.o -o prog

gdb -q ./prog
```

Comandos essenciais:

```
(gdb) set disassembly-flavor intel     # sempre, no começo
(gdb) layout asm                       # janela de assembly
(gdb) layout regs                      # janela de registradores — o mais útil aqui
(gdb) break _start
(gdb) run
(gdb) si                               # stepi: uma instrução por vez
(gdb) ni                               # nexti: pula sobre `call`
(gdb) info registers                   # todos os registradores
(gdb) info registers rax rdi rsi       # só os que interessam
(gdb) x/8xg $rsp                       # examina 8 valores de 8 bytes a partir de rsp
(gdb) x/s $rdi                         # examina como string
(gdb) x/10i $rip                       # as próximas 10 instruções
(gdb) p/x $rax                         # imprime rax em hexadecimal
(gdb) display /x $rax                  # mostra rax automaticamente a cada passo
```

### O fluxo de trabalho real

1. `layout regs` — você vê registradores e disassembly juntos.
2. `si` repetidamente, observando qual registrador muda e por quê.
3. Quando algo não faz sentido, `x/` no endereço para ver o que está na memória.
4. `display /x $rax` nos registradores que importam, para não precisar pedir toda vez.

N N **Registradores em vermelho no `layout regs` são os que mudaram na última instrução.**
Isso transforma a depuração de assembly de "ler tudo" em "olhar o que mudou" — ordens de
magnitude mais rápido.

### Comandos de memória

```
(gdb) x/x  $rsp          # um valor em hex
(gdb) x/4xw $rsp         # quatro words (4 bytes cada)
(gdb) x/8xg $rsp         # oito giant words (8 bytes cada)  ← stack frame inteira
(gdb) x/s  $rdi          # string terminada em NUL
(gdb) x/10c $rsi         # 10 caracteres
(gdb) x/i  $rip          # a instrução atual
```

---

## 3.7 LAB — Programa em assembly que chama libc

**Duração:** 150 min
**Objetivo:** escrever um programa em assembly que lê entrada, processa e escreve saída —
usando tanto syscall direta quanto libc.

### Parte A — Syscall direta (40 min)

Escreva `cat-syscall.asm`: lê da entrada padrão e escreve na saída, em loop, até EOF.

Requisitos:

- Use `read` (0) e `write` (1).
- Buffer de 4096 bytes em `.bss` (com `resb 4096`).
- Loop: lê, escreve os bytes lidos, repete até `read` retornar 0 (EOF).
- Trate o caso de `read` retornar negativo (erro).

```asm
section .bss
    buffer resb 4096

section .text
    global _start

_start:
    ; seu código aqui
```

Teste:

```bash
nasm -f elf64 cat-syscall.asm -o cat.o && ld cat.o -o cat-syscall
echo "linha de teste" | ./cat-syscall
./cat-syscall < /etc/hostname
```

### Parte B — Chamando libc (50 min)

Escreva `processa.asm` que:

1. Chama `printf` para imprimir uma mensagem de cabeçalho.
2. Chama `malloc` para alocar 64 bytes.
3. Escreve uma string nessa memória usando acesso direto (`mov BYTE PTR [rax], ...`).
4. Chama `printf` com `%s` para imprimir o conteúdo.
5. Chama `free`.
6. Chama `exit`.

```asm
extern printf
extern malloc
extern free
extern exit
```

⚠ **Não esqueça `xor eax, eax` antes de cada `printf`.** É o requisito de função variádica, e o
programa vai falhar de forma estranha se você omitir.

Se o programa travar dentro de libc, adicione `and rsp, -16` no início de `_start` e explique
por que funcionou.

### Parte C — Depuração guiada (60 min)

Pegue o `processa` do lab e execute no GDB com `layout regs`. Produza um arquivo
`traco-execucao.md` com, para cada passo:

```
Passo N: [instrução]
  Antes: rax=0x... rdi=0x... 
  Depois: rax=0x... rdi=0x...
  O que aconteceu: ...
```

Faça isso para **no mínimo 15 instruções**, cobrindo:

- A preparação dos argumentos de um `printf`.
- A instrução `call` e o que mudou em `rsp`.
- O retorno de `malloc` em `rax` (note o endereço — é do heap).
- O acesso à memória alocada.
- O epilogue de uma função qualquer.

### Critérios de aceitação

- `cat-syscall` funciona com pipe e com redirecionamento de arquivo.
- `cat-syscall` lida com arquivo vazio sem entrar em loop infinito.
- `processa.asm` imprime as três linhas esperadas, sem travar.
- Você sabe explicar por que o `xor eax, eax` é obrigatório.
- Você identificou no GDB em qual região de memória `malloc` retornou (dica: compare com `info proc mappings`).
- `traco-execucao.md` tem 15 passos com registradores antes/depois.

---

## Avaliação

1. Descreva os quatro estágios de `seu.asm` até executável. Em qual deles um símbolo indefinido
   causa erro?
2. Em que registrador vai o **número** da syscall? Em que registradores vão os argumentos? Por que
   `r10` em vez de `rcx` no quarto argumento de syscall?
3. O que faz `mov rdx, tam` quando `tam` foi definido com `equ $ - mensagem`? Por que isso
   funciona em tempo de montagem?
4. Por que `xor eax, eax` é obrigatório antes de chamar `printf`? O que acontece se você omitir?
5. Reescreva em assembly: `if (x == 0) { y = 1; } else { y = 2; }`. Explique por que o salto é
   para a condição **invertida**.
6. Qual a forma de todo laço em assembly? Identifique as três partes.
7. Por que a função `max3` do exemplo não tem prologue? O que isso indica sobre ela?
8. O que `global` faz no NASM? O que acontece se você omitir?
9. O que o `and rsp, -16` faz e por que é o conserto para travamento dentro de libc?
10. Se uma função usa `rbx`, o que ela é obrigada a fazer? Por que essa obrigação existe?

---

**Próximo:** [Módulo 4 — O compilador como tradutor](modulo-04.md)
