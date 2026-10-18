# Módulo 4 — O Compilador como Tradutor

**Carga:** 3 horas (1h15 teoria · 1h45 lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Prever o assembly que o GCC gera para construções comuns de C.
2. Distinguir o que `-O0` mostra do que `-O2` mostra, e usar cada um para um propósito.
3. Reconhecer padrões de otimização e não confundi-los com lógica de negócio.
4. Identificar stack canary, PIE e outras inserções automáticas do compilador.
5. Ler a saída de `-S` e comparar com o disassembly do binário.

---

## 4.1 Por que ler o compilador

Duas razões, e a segunda é a que importa.

**Razão 1 — entender seu próprio código.** Saber o que `-O2` faz com um loop é a diferença entre
adivinhar desempenho e saber.

**Razão 2 — engenharia reversa sem código-fonte.** Você não tem o C. Tem bytes. Se você
conhece os **padrões** que o compilador produz, consegue inverter o processo: do assembly de volta
para a estrutura provável do código original. É isso que a ferramenta de decompilação faz — com
imperfeições. Saber os padrões é o que te permite julgar quando a ferramenta errou.

Um decompilador é um bom ponto de partida e um péssimo ponto de chegada. A diferença entre quem
sabe ler o assembly e quem só lê o decompilado é que o segundo não percebe quando está sendo
enganado.

---

## 4.2 O mesmo código em três níveis

```c
int soma(int a, int b) {
    return a + b;
}
```

```bash
gcc -O0 -S -masm=intel -o - soma.c
```

**`-O0`** — tradução literal:

```asm
soma:
    push    rbp
    mov     rbp, rsp
    mov     DWORD PTR [rbp-4], edi
    mov     DWORD PTR [rbp-8], esi
    mov     eax, DWORD PTR [rbp-4]
    mov     edx, DWORD PTR [rbp-8]
    add     eax, edx
    pop     rbp
    ret
```

**`-O1`** — já sem cerimônia:

```asm
soma:
    lea     eax, [rdi+rsi]
    ret
```

**`-O2`** — igual ao `-O1` aqui, mas em funções chamadas a partir do mesmo arquivo ela pode
desaparecer por completo (*inlining*).

```asm
main:
    mov     eax, 7        ; soma(3,4) já calculado em tempo de compilação
    ret
```

**A lição:** em `-O2`, uma função pode não existir mais como símbolo. Quando você procurar
`<soma>` no disassembly e não achar, não é bug do desmontador — é *inlining*, e a lógica está
embutida no chamador.

---

## 4.3 Padrões que você precisa reconhecer

### Multiplicação e divisão por constante viram shifts

```c
x * 8      →   shl eax, 3
x / 8      →   sar eax, 3        (com sinal)
x * 3      →   lea eax, [rax+rax*2]
x * 10     →   lea eax, [rax+rax*4]; add eax, eax
```

`lea` como aritmética é absoluta onipresença em código otimizado. `lea eax, [rax+rax*2]` calcula
`rax * 3` sem tocar em memória — é o compilador economizando uma multiplicação.

⚠ **Cuidado com divisão.** Divisão inteira por constante é implementada como **multiplicação por
um número mágico seguida de shift**, porque divisão é lenta. Você vai ver constantes "aleatórias"
em `imul` e não vai reconhecer nenhuma relação com o `3` ou `7` do código. Quando você vir
`imul rax, rax, 0xAAAAAAAB` seguido de `shr`, é `x / 3`. Não tente decodificar de cabeça; siga
o fluxo e deduza pelo contexto.

### Comparações viram `setcc`

```c
return (a > b);
```

```asm
cmp     edi, esi
setg    al            ; al = 1 se a > b, senão 0
movzx   eax, al       ; limpa o resto do registrador
ret
```

`setcc` (set condition code) escreve **1 byte** com 0 ou 1. Vem sempre seguido de `movzx` para
limpar o resto do registrador — porque a ABI diz que o retorno é em `eax`, e você não pode
deixar lixo nos bits altos.

### Ausência de salto é uma pista

Uma comparação que não gera salto significa que o resultado é **valor de retorno**, não desvio
de controle:

```asm
cmp     edi, 0
setne   al          ; não há `jne` — o resultado É o valor, não um desvio
```

Isso muda a leitura: quando você vê `setcc` sem salto, a função está retornando um booleano.

### Loops: as três formas

**Forma 1 — teste no início (mais legível, mais comum em `-O0`):**

```asm
    jmp  teste
corpo:
    ; ...
    inc  eax
teste:
    cmp  eax, ecx
    jl   corpo
```

**Forma 2 — teste no fim (mais comum em `-O2`):**

```asm
corpo:
    ; ...
    inc  eax
    cmp  eax, ecx
    jne  corpo
```

Uma comparação por iteração em vez de duas. **Reconhecer as duas formas é obrigatório** — quem
só aprendeu a forma 1 acha que a forma 2 não é um loop.

**Forma 3 — desenrolado (*unrolling*):**

```asm
    mov  ecx, DWORD PTR [rdi]
    add  ecx, DWORD PTR [rdi+4]
    add  ecx, DWORD PTR [rdi+8]
    add  ecx, DWORD PTR [rdi+12]
```

Quatro iterações escritas explicitamente. O compilador faz isso quando `n` é conhecido em tempo
de compilação. `-O3` também faz versões parcialmente desenroladas com o corpo uma vez e múltiplas
cópias — mais difícil de reconhecer como loop.

### `switch` compila de três maneiras

| Casos | Estratégia |
|---|---|
| Poucos, esparsos | Cadeia de `cmp`/`je` (parece um `if` encadeado) |
| Muitos, densos | **Tabela de saltos** (`jmp QWORD PTR [rax*8+0x4020]`) |
| Intervalos | Comparações de faixa |

A tabela de saltos é inconfundível: um `jmp` com **escala 8** e uma base que aponta para
`.rodata`. Você verá um array de endereços no segmento de dados, cada um sendo o destino de um
`case`. **Reconhecer isso é o que permite contar os casos de um `switch` desconhecido.**

```asm
    cmp  edi, 4
    ja   default_case
    lea  rdx, [rip+0x2f10]        ; tabela de saltos em .rodata
    movsxd rax, edi
    mov  rax, QWORD PTR [rdx+rax*8]
    add  rax, rdx                  ; caso PIE: offsets relativos
    jmp  rax
```

O `movsxd` (move with sign extension, doubleword to quadword) aparece porque o índice é `int`
(32 bits) e você precisa dele em 64 bits para o cálculo do endereço. Detalhe de leitura útil.

### Chamada de função com muitos argumentos: inicio de struct

Quando uma função retorna struct grande, o caller passa um ponteiro oculto:

```c
struct grande { char dados[64]; };
struct grande f(void);
```

```asm
    ; f(&resultado_oculto)
    lea  rdi, [rbp-0x50]    ; espaço reservado para o resultado
    call f
    ; o valor de retorno real (rax) é o próprio ponteiro
```

Você vê `lea rdi, [...]` seguido de `call` sem nenhum outro `mov` para `rdi`. Isso é a ABI de
retorno de struct grande, e confunde bastante quando você não sabe que existe.

### Variáveis: onde vivem

| Situação | Onde vai | Como reconhecer |
|---|---|---|
| Local simples, endereço não tomado | Registrador | Nenhum `sub rsp` grande, valor em registrador |
| Local com `&` tomado, ou array | Stack | `sub rsp, N` no prologue, acesso `[rbp-N]` |
| `static` local | `.data` / `.bss` | Endereço absoluto ou `rip`-relative |
| Global | `.data` / `.bss` | Endereço absoluto |
| Literal de string | `.rodata` | `lea rdi, [rip+...]` apontando para região read-only |

O compilador promove variável local para registrador sempre que consegue provar que o endereço
nunca é tomado. **É por isso que `-O2` parece não ter variáveis** — elas estão em registradores.

---

## 4.4 Proteções que o compilador insere

Estas linhas não vêm do seu código. Saber identificá-las evita atribuir propósito de negócio a
algo que é só proteção.

### Stack canary

```asm
    mov  rax, QWORD PTR fs:0x28     ; lê o canário do TLS
    mov  QWORD PTR [rbp-0x8], rax   ; guarda no fim da stack frame
    ...
    mov  rax, QWORD PTR [rbp-0x8]
    sub  rax, QWORD PTR fs:0x28     ; compara com o original
    je   .ok
    call __stack_chk_fail           ; buffer overflow detectado
.ok:
    ret
```

Você já viu `fs:0x28` no Módulo 1. Agora sabe o que ele faz: detecta sobrescrita da stack frame
antes do `ret`. Ative/desative com `-fstack-protector` / `-fno-stack-protector` para ver a
diferença — é uma das demonstrações mais instrutivas do curso.

### PIE e endereçamento relativo a `rip`

```bash
gcc -o binario codigo.c          # PIE por padrão em distros modernas
gcc -no-pie -o binario codigo.c  # endereços fixos
```

Com PIE, todo acesso a global ou string usa endereçamento relativo a `rip`:

```asm
    lea  rdi, [rip+0xe4a]        ; em vez de `mov edi, 0x402004`
```

Consequência para engenharia reversa: **os endereços que você vê no disassembly são relativos,
não absolutos.** O load base muda a cada execução com ASLR. No GDB você vê o endereço real
(`$rip` resolvido); no `objdump` estático, você vê o offset no arquivo.

Você vai ver o padrão PIE em tabelas de salto:

```asm
    lea  rdx, [rip+0x2f10]
    mov  rax, QWORD PTR [rdx+rax*8]
    add  rax, rdx                 ; ← este `add` é a correção do PIE
    jmp  rax
```

Aquele `add rax, rdx` só existe por causa de PIE: a tabela guarda offsets relativos, não
endereços absolutos. Em binário `-no-pie` você veria `jmp QWORD PTR [rax*8+0x4020]` direto.

### Otimizações que apagam informação

- **Inlining:** a função some; a lógica aparece no chamador.
- **Tail call:** `call f; ret` vira `jmp f`. Você não vê o `ret` da função que "chamou".
- **Constant folding:** `int x = 3 * 4 + 1;` vira `mov eax, 13`. A expressão some.
- **Dead code elimination:** código sem efeito observável desaparece.
- **Vectorização (SSE/AVX):** um loop sobre array vira operações em `xmm`/`ymm` processando 4 ou
  8 elementos por vez. Reconhece-se por `movdqu`, `paddd`, `addps` e afins.

⚠ **Consequência prática para engenharia reversa:** com `-O2`, você reconstrói a **intenção** do
código, não a forma original. Nomes de variável, estrutura de laço, tudo isso já foi
transformado. Quando você decompila e vê um `while` onde o código original tinha um `for`, isso
não é erro do decompilador — é o que sobrou.

---

## 4.5 `-S` vs. `objdump`: qual usar

| Aspecto | `gcc -S` | `objdump -d` |
|---|---|---|
| Fonte | C → assembly | binário → assembly |
| Nomes de função | Preservados | Preservados se não *stripped* |
| Nomes de variável | Preservados (só com `-g`) | Não |
| Endereços | Não resolvidos | Resolvidos (offsets) |
| Otimizações | Mostra o efeito | Mostra o efeito |
| Uso | Aprender | Analisar sem fonte |

**A melhor forma de aprender os padrões é compilar e comparar lado a lado.** O Módulo 4 tem
este exercício como lab, e é o exercício mais rentável do curso.

---

## 4.6 LAB — Prever antes de ver

**Duração:** 105 min
**Objetivo:** desenvolver o reflexo de prever o assembly a partir do C.

### Método

Para cada trecho abaixo: **escreva primeiro sua previsão em papel**, depois compile e compare.
Acertar não é o objetivo — descobrir onde você erra é.

Guarde suas previsões. Ao final, você terá uma lista dos seus erros recorrentes, e essa lista
vale mais que qualquer gabarito.

### Passo 1 — Os trechos

```bash
mkdir -p ~/re-lab/lab4 && cd ~/re-lab/lab4
```

**Trecho A — aritmética disfarçada**

```c
long a1(long x) { return x * 7; }
long a2(long x) { return x / 4; }
long a3(long x) { return x % 8; }
int  a4(int x)  { return x * 2 + 1; }
```

**Trecho B — comparações**

```c
int  b1(int a, int b) { return a > b; }
int  b2(int a)        { return a == 0; }
int  b3(int a, int b) { return (a & b) == b; }
```

**Trecho C — laços**

```c
int c1(int *v, int n) { int s = 0; for (int i = 0; i < n; i++) s += v[i]; return s; }
int c2(int n) { int s = 0; while (n > 0) { s += n; n--; } return s; }
int c3(int n) { int s = 0; for (int i = 0; i < 4; i++) s += i * n; return s; }
```

**Trecho D — switch**

```c
int d1(int x) {
    switch (x) {
        case 0: return 10;
        case 1: return 20;
        case 2: return 30;
        case 3: return 40;
        case 4: return 50;
        default: return -1;
    }
}
int d2(int x) {
    if (x == 1) return 100;
    if (x == 500) return 200;
    if (x == 10000) return 300;
    return 0;
}
```

**Trecho E — struct e ponteiro**

```c
struct s { int a; int b; long c; };
int e1(struct s *p) { return p->a + p->b; }
long e2(struct s *p) { return p->c; }
int e3(struct s **pp) { return (*pp)->a; }
```

**Trecho F — chamada de função**

```c
extern int externa(int, int, int, int, int, int, int);
int f1(int a) { return externa(a, 1, 2, 3, 4, 5, 6); }
```

### Passo 2 — Compile e compare

```bash
cat > trechos.c <<'EOF'
#include <stddef.h>
struct s { int a; int b; long c; };
extern int externa(int,int,int,int,int,int,int);

long a1(long x) { return x * 7; }
long a2(long x) { return x / 4; }
long a3(long x) { return x % 8; }
int  a4(int x)  { return x * 2 + 1; }

int  b1(int a, int b) { return a > b; }
int  b2(int a)        { return a == 0; }
int  b3(int a, int b) { return (a & b) == b; }

int c1(int *v, int n) { int s = 0; for (int i = 0; i < n; i++) s += v[i]; return s; }
int c2(int n) { int s = 0; while (n > 0) { s += n; n--; } return s; }
int c3(int n) { int s = 0; for (int i = 0; i < 4; i++) s += i * n; return s; }

int d1(int x) {
    switch (x) {
        case 0: return 10; case 1: return 20; case 2: return 30;
        case 3: return 40; case 4: return 50; default: return -1;
    }
}
int d2(int x) {
    if (x == 1) return 100; if (x == 500) return 200;
    if (x == 10000) return 300; return 0;
}

int  e1(struct s *p) { return p->a + p->b; }
long e2(struct s *p) { return p->c; }
int  e3(struct s **pp) { return (*pp)->a; }

int f1(int a) { return externa(a, 1, 2, 3, 4, 5, 6); }
EOF

for opt in 0 2; do
    gcc -O${opt} -S -masm=intel -fno-asynchronous-unwind-tables \
        -o trechos-O${opt}.s trechos.c
done
```

Leia `trechos-O0.s` e `trechos-O2.s` lado a lado com `less` ou `diff -y`.

### Passo 3 — Perguntas específicas para responder por escrito

1. `a1` em `-O2`: qual instrução o compilador usou para multiplicar por 7? Foi `imul`?
2. `a2` em `-O2`: divisão por 4 virou shift? Qual? Foi `sar` ou `shr` — e por quê?
3. `a3` em `-O2`: `% 8` de um número **com sinal** pode ser negativo. Como o compilador trata isso?
   (Dica: procure um `test`/`js` antes do `and`.)
4. `b1` em `-O2`: há `jmp`? Onde está o resultado, e por que `setcc` não precisa de salto?
5. `c3` em `-O2`: o laço de 4 iterações ainda existe? Foi desenrolado? Por que é possível?
6. `d1` em `-O2`: é tabela de saltos ou cadeia de comparações? Aparece `movsxd`?
7. `d2` em `-O2`: por que a estratégia foi diferente de `d1`, se ambos são `switch`-like?
8. `e2`: qual offset foi usado para `p->c` — `0x8` ou `0x10`? Por que existe padding?
9. `e3`: quantos acessos de memória em sequência você vê? Por quê?
10. `f1`: como os sete argumentos foram passados? Qual foi empilhado, e em que ordem?

### Passo 4 — Proteções

```bash
gcc -O0 -S -masm=intel -fstack-protector-all -o com-canary.s trechos.c
grep -n 'fs:0x28\|stack_chk' com-canary.s | head -20
```

Localize o canário em pelo menos duas funções e confirme que ele **não** aparece em funções sem
buffer local — o compilador só insere onde há risco de sobrescrita.

### Passo 5 — Compare com o binário real

```bash
gcc -O2 -o trechos trechos.c
objdump -d -M intel trechos | sed -n '/<a1>:/,/^$/p'
```

Compare com a versão de `-S`. As instruções devem ser equivalentes. Pergunte-se: **o que o `-S`
mostra que o `objdump` não mostra, e vice-versa?**

### Critérios de aceitação

- Você escreveu previsões antes de ver cada saída.
- Você respondeu as 10 perguntas por escrito, com o trecho de assembly que fundamenta a resposta.
- Você identificou o canário em `com-canary.s` e explicou o que ele detecta.
- Você consegue explicar `a2` sem consultar nada — divisão por 4 em código com sinal.
- Você listou pelo menos três padrões que seu palpite errou.

---

## Avaliação

1. Por que `-O0` mostra a intenção do código e `-O2` mostra o resultado? O que cada um é útil para?
2. Como o compilador implementa `x * 8` e `x / 4`? Por que `lea` é usado em vez de `imul`?
3. Por que divisão por constante vira multiplicação por número mágico? O que você deve fazer ao
   encontrar uma constante que não reconhece?
4. Um `cmp` seguido de `setcc` sem nenhum salto: o que isso indica sobre o código?
5. Descreva as duas formas de laço e explique por que a segunda executa uma comparação a menos
   por iteração.
6. Como você reconhece uma tabela de saltos? Por que `movsxd` aparece nela?
7. O que é `fs:0x28` e o que a sequência de verificação detecta? Em que funções ele aparece?
8. O que muda no acesso a uma string global entre binário PIE e `-no-pie`? Por que existe um
   `add rax, rdx` na tabela de saltos de binário PIE?
9. O que é tail call optimization e como ela remove um `ret` do disassembly?
10. Por que, em `-O2`, você não deve esperar reconstruir a estrutura original do código? O que
    você reconstrói no lugar?

---

**Próximo:** [Módulo 5 — Ferramentas de análise](modulo-05.md)
