# Módulo 2 — Memória, Stack e Convenções de Chamada

**Carga:** 3 horas (1h30 teoria · 1h30 lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Desenhar um stack frame à mão e explicar cada campo.
2. Aplicar a ABI System V: quais registradores carregam quais argumentos.
3. Distinguir registradores *caller-saved* de *callee-saved* e prever o efeito de cada um.
4. Entender como funções são chamadas, retornam e passam estruturas grandes.
5. Reconhecer prologue e epilogue em qualquer disassembly.

---

## Por que este é o módulo que decide tudo

A maioria das pessoas que desiste de engenharia reversa desiste aqui, sem saber que é aqui.

O motivo é sempre o mesmo: elas tentam entender instrução por instrução sem ter o modelo mental
de **onde as coisas estão e por que estão ali**. Aí o disassembly vira sopa de registradores —
você lê `mov rax, [rbp-0x18]` e não faz ideia do que está em `rbp-0x18`, nem por que aquele
endereço, nem por que 0x18.

Uma vez que o modelo mental existe, o disassembly deixa de ser sopa e passa a ser legível.
Este módulo é o que constrói esse modelo. Vá devagar.

---

## 2.1 A stack: o que é e por que cresce para baixo

A stack é uma região de memória com disciplina LIFO (last in, first out). `rsp` sempre aponta
para o **topo** — o endereço do último item empilhado.

```asm
push rax    ; rsp -= 8; memória[rsp] = rax
pop  rbx    ; rbx = memória[rsp]; rsp += 8
```

Detalhe que confunde: `push` **subtrai** 8 de `rsp`. Por isso "topo da stack" tem endereço
**menor** que o resto. Quando você vê uma stack frame desenhada com `rsp` embaixo, isso não é
escolha estética — reflete os endereços reais.

### Por que cresce para baixo

Escolha histórica, mas com uma consequência prática útil: stack e heap crescem em direções
opostas, a partir das extremidades do espaço de endereços. Se ficarem grandes demais, eles colidem
— e a colisão é detectável. Se crescessem no mesmo sentido, não haveria como saber onde termina um
e começa o outro.

---

## 2.2 Anatomia de um stack frame

Toda função não-trivial em `-O0` monta esta estrutura. Memorize o desenho — você vai usá-lo em
todo disassembly daqui para frente.

```
Endereços MAIORES (topo da memória, argumentos vieram daqui)
┌──────────────────────────────────────┐
│  argumento 7                         │  ← passados na stack pelo CALLER
│  argumento 6                         │    (a partir do 7º em diante)
├──────────────────────────────────────┤
│  endereço de retorno                 │  ← empilhado pelo `call`  ← rsp ANTES do prologue
├══════════════════════════════════════┤ ← rbp depois do prologue aponta AQUI
│  rbp salvo (valor antigo)            │  ← `push rbp`
├──────────────────────────────────────┤
│  variável local 1     [rbp-0x8]      │
│  variável local 2     [rbp-0x10]     │
│  variável local 3     [rbp-0x18]     │  ← offset NEGATIVO a partir de rbp
│  ...                                 │
├──────────────────────────────────────┤ ← rsp (topo atual; `sub rsp, N` foi feito aqui)
│  espaço alocado, stack canary        │
└──────────────────────────────────────┘
Endereços MENORES (fundo da stack)
```

### Prologue: as linhas que abrem toda função

```asm
push rbp            ; salva o rbp do caller na stack
mov  rbp, rsp       ; rbp agora aponta para esta posição
sub  rsp, 0x20      ; reserva 32 bytes para variáveis locais
```

Traduzindo: "guarde onde o caller estava, marque onde estou agora, e Separe espaço para mim".

**Por que `rbp` existe se `rsp` já aponta para a stack?** Porque `rsp` se move durante a execução
(`push`, `pop`, chamadas de função). `rbp` fica **fixo** durante toda a função, então o compilador
pode usar offsets constantes — `[rbp-0x8]` — para acessar variáveis locais sem se preocupar com
o quanto `rsp` já andou.

### Epilogue: as linhas que fecham

```asm
mov  rsp, rbp       ; desfaz o `sub rsp, N` — ou `leave`, que faz isto + pop rbp
pop  rbp            ; restaura o rbp do caller
ret                 ; desempilha o endereço de retorno e salta para ele
```

`leave` é açúcar sintático para `mov rsp, rbp` + `pop rbp`. Você vai ver as duas formas.

### Lendo com o modelo na cabeça

Agora este disassembly tem sentido:

```asm
0000000000001129 <exemplo>:
    1129:  push   rbp                      ; prologue
    112a:  mov    rbp, rsp
    112d:  mov    DWORD PTR [rbp-0x4], edi ; 1º argumento → local 1
    1131:  mov    DWORD PTR [rbp-0x8], esi ; 2º argumento → local 2
    1135:  mov    eax, DWORD PTR [rbp-0x4]
    1138:  mov    edx, DWORD PTR [rbp-0x8]
    113b:  add    eax, edx
    113d:  pop    rbp                      ; epilogue
    113e:  ret
```

Sempre que você vir `mov DWORD PTR [rbp-N], <registrador>`, está vendo o compilador salvar um
argumento numa variável local. E `mov <registrador>, DWORD PTR [rbp-N]` é o inverso: carregar
a variável de volta para trabalhar com ela.

---

## 2.3 ABI System V: a convenção de chamada do Linux

Uma **ABI** (Application Binary Interface) define como funções se comunicam em nível de binário:
onde vão os argumentos, quem preserva o quê, como o retorno volta. Sem ela, uma função compilada
por GCC não poderia chamar uma compilada por Clang.

No Linux x86-64 a convenção é **System V AMD64**. Este é o ponto mais importante do módulo.

### Argumentos inteiros e ponteiros

| Ordem | Registrador |
|---|---|
| 1º | `rdi` |
| 2º | `rsi` |
| 3º | `rdx` |
| 4º | `rcx` |
| 5º | `r8` |
| 6º | `r9` |
| 7º em diante | **na stack**, empilhados na ordem inversa |

```asm
; chamada de funcao(1, 2, 3, 4, 5, 6, 7)
mov  edi, 1
mov  esi, 2
mov  edx, 3
mov  ecx, 4
mov  r8d, 5
mov  r9d, 6
push 7              ; 7º argumento vai na stack
call funcao
add  rsp, 8         ; o CALLER limpa a stack depois
```

N O T A Os argumentos são passados em ordem `rdi, rsi, rdx, rcx, r8, r9` — e não `rcx, rdx` como
em outras arquiteturas. Essa ordem específica aparece em toda função de libc que você analisar.
Se você vir um `call` logo depois de quatro `mov` para `edi`, `esi`, `edx`, `ecx`, está olhando
uma função de quatro argumentos.

### Argumentos de ponto flutuante

Vão em registradores `xmm0`–`xmm7`. Isso importa porque uma função com `float` e `int` misturados
usa **dois barramentos independentes** — o `int` vai para `rdi`, o `double` para `xmm0`, sem
relação entre eles.

### Valor de retorno

| Tipo | Registrador |
|---|---|
| Inteiro/ponteiro até 64 bits | `rax` |
| Inteiro 128 bits | `rdx:rax` (rdx é o alto) |
| Ponto flutuante | `xmm0` |
| Estrutura pequena (≤16 bytes) | `rax`, `rdx` |
| Estrutura grande | ponteiro passado pelo caller em `rdi` |

### Caller-saved vs. callee-saved

Esta é a distinção que a maioria dos tutoriais explica mal. Vamos devagar.

| Classe | Registradores | Quem é responsável por preservar |
|---|---|---|
| **Caller-saved** (voláteis) | `rax`, `rcx`, `rdx`, `rsi`, `rdi`, `r8`–`r11` | O **caller**, se precisar do valor depois da chamada |
| **Callee-saved** (não-voláteis) | `rbx`, `rbp`, `r12`–`r15`, `rsp` | A **função chamada**, se for usá-los |

Vamos ler isso como contrato, não como tabela:

**Contrato do caller-saved:** "a função que você chamar pode destruir estes registradores à
vontade. Se o valor importa depois, **você** salva antes de chamar." Isso libera a função chamada
de gastar instruções salvando registradores que talvez ninguém use.

**Contrato do callee-saved:** "se você usar este registrador, você **obriga-se** a restaurá-lo
ao valor original antes de retornar. O caller conta com isso."

Por isso você vê isto numa função que usa `rbx`:

```asm
0000000000001139 <com_rbx>:
    1139:  push   rbx                  ; salva o rbx do caller
    113a:  mov    rbx, rdi             ; agora pode usar rbx à vontade
    113d:  ...
    1145:  pop    rbx                  ; restaura ANTES de retornar
    1146:  ret
```

Se a função é interrompida por uma exceção no meio, o `pop rbx` não roda e o caller fica com
estado corrompido — mas isso é problema de unwinding, não deste módulo.

**Consumo prático:** quando você lê uma função e vê `push rbx` / `push r12` no prologue e os
`pop` correspondentes no epilogue, você acabou de descobrir quais registradores persistentes a
função usa. É uma pista valiosa: `push rbx` no começo sugere que `rbx` guarda algo que sobrevive
a chamadas de função dentro dela.

### Alinhamento da stack

A ABI exige que `rsp` esteja alinhado a **16 bytes** antes de uma instrução `call`. Se você
escrever assembly à mão e esquecer isso, a função chamada pode travar — e o erro é enigmático
(geralmente dentro de código de SSE que faz `movaps` em memória desalinhada).

Você vai ver no disassembly compensações estranhas como `sub rsp, 8` antes de uma chamada quando
tudo indica que não seria necessário. É alinhamento.

⚠ **Este é o erro número um de quem escreve assembly à mão.** Se sua função trava dentro de
libc com erro de "movaps" ou "general protection fault" em código que você não escreveu, quase
certamente é alinhamento. Módulo 3 volta nisto.

---

## 2.4 Estruturas, arrays e ponteiros em memória

Agora que você tem o modelo, os padrões ficam previsíveis.

### Struct: campos em offsets fixos

```c
struct ponto {
    int   x;      // offset 0
    int   y;      // offset 4
    long  z;      // offset 8 (com 4 bytes de padding depois de y)
    char  nome[8]; // offset 16
};
```

```asm
; p->x
mov eax, DWORD PTR [rdi]

; p->y  (offset 4)
mov eax, DWORD PTR [rdi+0x4]

; p->z  (offset 8) — 8 bytes → registrador de 64 bits
mov rax, QWORD PTR [rdi+0x8]

; p->nome[2]  (offset 16+2)
movzx eax, BYTE PTR [rdi+0x12]
```

**Padding** é por que `z` está em offset 8 e não em 8... espera, está em 8, mas `y` termina em
offset 7 e `z` exige alinhamento de 8 bytes, então há 4 bytes de padding. Você vai ver offsets
"estranhos" como `+0x18` e eles sempre têm explicação: alinhamento.

`movzx` (move with zero extend) aparece quando você lê 1 byte para um registrador maior: lê o
byte e zera o resto. Sem ele, os bits antigos permaneceriam.

### Array: base + índice × escala

```c
int v[10];
v[3] = 7;
```

```asm
mov  DWORD PTR [rbp+rbx*4-0x30], 7   ; rbx = índice, escala 4 = sizeof(int)
```

A escala é o `sizeof` do elemento: 4 para `int`, 8 para ponteiro ou `long`, 1 para `char`.
**Reconhecer a escala é reconhecer o tipo.** `[base + rcx*8]` quase sempre é array de ponteiros.

### Ponteiro para ponteiro: desreferência dupla

```c
void f(char **argv) { char *p = argv[1]; }
```

```asm
mov  rax, QWORD PTR [rdi+0x8]   ; argv[1]  → um ponteiro
mov  rax, QWORD PTR [rax]       ; *p       → segundo acesso
```

Dois acessos de memória em sequência. Quando você vê isso num disassembly, está olhando um
ponteiro para ponteiro (ou um array de strings, ou um parâmetro `**`).

### String em loop

```asm
; Laço típico de strlen
    xor  eax, eax
loop_inicio:
    cmp  BYTE PTR [rdi+rax], 0    ; fim da string?
    je   loop_fim
    inc  rax
    jmp  loop_inicio
loop_fim:
    ; rax = comprimento
```

Padrão inconfundível: acessa byte a byte, compara com zero, incrementa índice. `strlen`,
`strcpy`, `strcmp` — todos têm essa cara.

---

## 2.5 Chamando função com mais de seis argumentos

Ponto que trava muita gente. A partir do 7º argumento, os valores vão na stack, e a ordem importa.

```c
long f(int a, int b, int c, int d, int e, int f6, int g, int h);
```

```asm
; Chamada de f(1,2,3,4,5,6,7,8)
; h=8 primeiro, g=7 depois — empilhados em ordem INVERSA
push 8
push 7
mov  edi, 1
mov  esi, 2
mov  edx, 3
mov  ecx, 4
mov  r8d, 5
mov  r9d, 6
call f
add  rsp, 16     ; caller limpa os DOIS valores empilhados
```

**Por que inverso?** Porque a stack cresce para baixo. Empilhando 8 e depois 7, o 7 fica em
endereço menor — que é o "primeiro" na leitura da função chamada. A função lê `[rbp+0x10]` para
o 7º argumento e `[rbp+0x18]` para o 8º, em ordem crescente de endereço.

Dentro da função chamada, é assim que os argumentos da stack são lidos:

```asm
; dentro de f
mov  eax, DWORD PTR [rbp+0x10]   ; g (7º argumento)
mov  eax, DWORD PTR [rbp+0x18]   ; h (8º argumento)

; o 1º argumento de retorno está em [rbp+0x8] — o endereço de retorno
```

N N **Note o offset positivo.** Argumentos acima de `rbp` (offset positivo), variáveis locais
abaixo (offset negativo). Isso resume o desenho do stack frame numa frase, e é o que você precisa
para orientar-se em qualquer função desconhecida.

---

## 2.6 Outras convenções que você vai encontrar

System V é o padrão no Linux, mas você vai encontrar outras:

| Convenção | Onde | 1º argumento | Diferença chave |
|---|---|---|---|
| System V AMD64 | Linux, macOS, BSD | `rdi` | A que este curso usa |
| Microsoft x64 | Windows | `rcx` | `rcx, rdx, r8, r9`; 32 bytes de "shadow space" na stack |
| ARM64 AAPCS | ARM | `x0` | Registradores `x0`–`x7` |

Se você analisar binário Windows, a ordem é `rcx, rdx, r8, r9` — e há o conceito de *shadow
space*: o caller reserva 32 bytes na stack que a função chamada pode usar para salvar os
argumentos. É uma diferença que confunde muito quem está acostumado com Linux.

---

## 2.7 LAB — Desenhe a stack frame à mão

**Duração:** 90 min
**Objetivo:** produzir, com suas próprias palavras e traços, o mapa completo de uma função real.

### Passo 1 — Compile alvo com estruturas

```bash
mkdir -p ~/re-lab/lab2 && cd ~/re-lab/lab2

cat > alvo.c <<'EOF'
#include <stdio.h>
#include <string.h>

struct dados {
    int  id;
    int  valor;
    long total;
    char nome[8];
};

int processa(struct dados *d, int multiplicador, int limite) {
    int conta = 0;
    int i;

    for (i = 0; i < limite; i++) {
        if (d->valor * multiplicador > i) {
            conta++;
        }
    }

    d->total += conta;
    strncpy(d->nome, "processado", 8);

    return conta;
}

int muitos(int a, int b, int c, int d, int e, int f, int g, int h) {
    return a + b + c + d + e + f + g + h;
}

int main(void) {
    struct dados d = {1, 2, 0, {0}};
    int r = processa(&d, 3, 10);
    int m = muitos(1, 2, 3, 4, 5, 6, 7, 8);

    printf("conta=%d total=%ld nome=%s muitos=%d\n", r, d.total, d.nome, m);
    return 0;
}
EOF

gcc -O0 -g -no-pie -o alvo-O0 alvo.c
gcc -O2 -g -no-pie -o alvo-O2 alvo.c
```

Usei `-no-pie` de propósito: sem PIE, os endereços são fixos e o disassembly fica mais fácil de
ler enquanto você aprende. Bem mais adiante isso deixa de conveniente.

### Passo 2 — Disseque `processa` em `-O0`

```bash
objdump -d -M intel alvo-O0 | sed -n '/<processa>:/,/^$/p' > processa-O0.txt
cat processa-O0.txt
```

Identifique e **anote os endereços** de:

1. O prologue (`push rbp`, `mov rbp, rsp`, `sub rsp, N`).
2. Onde cada argumento é salvo na stack.
3. O loop `for` — encontre o `cmp` e o salto condicional que o implementam.
4. O `if` interno — encontre o segundo par `cmp`/`salto`.
5. O `return conta` — qual registrador recebe o valor?
6. O epilogue.

### Passo 3 — Desenhe

Em papel (ou num arquivo texto), desenhe o stack frame de `processa` com:

- O endereço de retorno e o `rbp` salvo.
- Cada variável local, com **o offset exato** (`[rbp-0x4]`, `[rbp-0x8]`, ...).
- Qual variável é qual, deduzido do fluxo do código.
- A posição de `rsp` ao longo da execução.

Este desenho é o entregável central do lab. Deve ser possível para outra pessoa ler seu desenho e
entender a função sem ver o disassembly.

### Passo 4 — Compare com `-O2`

```bash
objdump -d -M intel alvo-O2 | sed -n '/<processa>:/,/^$/p'
```

Perguntas para responder por escrito:

- Quantas variáveis locais sobraram na stack?
- O loop foi transformado? Como? (Procure por `setg`, `setle` ou saltos que você não esperava.)
- `strncpy` virou o quê? (Provavelmente uma escrita direta de 8 bytes ou um `movabs`.)
- Onde foi parar o contador `conta`?

### Passo 5 — Os oito argumentos

```bash
objdump -d -M intel alvo-O0 | sed -n '/<muitos>:/,/^$/p'
objdump -d -M intel alvo-O0 | sed -n '/<main>:/,/^$/p' | grep -A 20 'call.*muitos'
```

Confirme:

- Em `main`, os seis primeiros argumentos vão para `edi`, `esi`, `edx`, `ecx`, `r8d`, `r9d`.
- Os dois últimos são empilhados **em ordem inversa**.
- Em `muitos`, os argumentos 7 e 8 são lidos em `[rbp+0x10]` e `[rbp+0x18]`.
- Depois do `call`, o `main` faz `add rsp, 16` para limpar.

### Passo 6 — Prove pela execução

```bash
gdb -q ./alvo-O0
```

```
(gdb) break processa
(gdb) run
(gdb) info registers rdi rsi rdx
(gdb) p *(struct dados *)$rdi
(gdb) p $rsi
(gdb) p $rdx
(gdb) info frame
(gdb) x/8xg $rbp-0x20
(gdb) disassemble /r processa
```

`info frame` mostra o mapa que o GDB construiu. Compare com o seu desenho — e onde divergir,
descubra quem está certo. Anote a diferença: é aprendizado real, não erro.

⚠ Note que `p *(struct dados *)$rdi` funciona porque você tem os símbolos de debug (`-g`). Em
binário sem símbolos — o caso normal em engenharia reversa — você terá que deduzir a estrutura
por conta própria. É o Módulo 6.

### Critérios de aceitação

- Seu desenho de stack frame lista todos os offsets corretos.
- Você anotou o offset de cada variável e consegue justificar cada um.
- Você identificou loop e condicional e apontou as instruções exatas.
- Você comparou `-O0` e `-O2` e explicou por escrito três diferenças.
- Você confirmou no GDB, com `info registers`, onde os argumentos chegaram.
- Você explicou por que os argumentos 7 e 8 são empilhados em ordem inversa.

---

## Avaliação

1. Desenhe o stack frame de uma função com três variáveis locais `int` e dois argumentos.
   Indique `rbp`, `rsp`, o endereço de retorno e cada offset.
2. Por que `push` subtrai de `rsp`? O que significa dizer que a stack cresce "para baixo"?
3. Quais registradores carregam os quatro primeiros argumentos inteiros na System V? E se fossem
   `double`?
4. Explique a diferença entre *caller-saved* e *callee-saved* como um contrato. Quem quebra o
   contrato se `rbx` é modificado sem `push`/`pop`?
5. Por que `rbp` existe se `rsp` já aponta para a stack? O que aconteceria com os offsets das
   variáveis locais se você usasse `rsp` diretamente?
6. Por que a ABI exige alinhamento de 16 bytes em `rsp` antes de `call`? O que se manifesta
   quando isso é violado?
7. Em `[rdi+rbx*4]`, o que a escala 4 informa sobre o tipo? O que informaria a escala 8?
8. Um argumento é lido em `[rbp+0x10]`. Ele é variável local ou argumento? Por quê?
9. Por que binário Windows usa `rcx` como primeiro registrador e o que é *shadow space*?

---

**Próximo:** [Módulo 3 — Assembly na prática](modulo-03.md)
