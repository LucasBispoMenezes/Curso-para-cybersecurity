# Módulo 5 — Ferramentas de Análise

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Identificar tipo, formato, arquitetura e proteções de um binário antes de abri-lo.
2. Navegar a estrutura de um ELF: seções, segmentos, símbolos, relocations.
3. Extrair strings e reconhecer o que elas revelam.
4. Usar `objdump`, `readelf`, `nm` e `strings` de forma combinada.
5. Carregar e navegar um binário no Ghidra e no GDB.
6. Fazer análise estática com `strace` e `ltrace`.

---

## ⚠ Ambiente e legalidade

Todas as ferramentas deste módulo servem para analisar binário de terceiro. **Antes de fazer isso
fora do laboratório, verifique a base legal:** sua própria licença de software, o contrato com
o cliente, ou o propósito de pesquisa de segurança. Análise de malware é atividade legítima;
análise de software comercial em violação de EULA é questão contratual; circumvenção de medida
técnica de proteção tem tratamento específico em lei.

No laboratório do curso, você compila tudo. Sem ambiguidade.

---

## 5.1 Antes de abrir: o que `file` diz

```bash
file binario
```

```
binario: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV),
         dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2,
         BuildID[sha1]=..., for GNU/Linux 3.2.0, not stripped
```

Cada termo importa:

| Trecho | Significado |
|---|---|
| `ELF 64-bit` | formato e largura |
| `LSB` | *little-endian* — x86-64 é sempre little-endian |
| `pie executable` | Position-Independent — endereços relativos, ASLR aplicável |
| `dynamically linked` | depende de bibliotecas externas em tempo de execução |
| `interpreter /lib64/ld-linux...` | qual loader dinâmico usar |
| `not stripped` | **tem tabela de símbolos** — os nomes de função estão lá |
| `stripped` | sem símbolos — você vai trabalhar com endereços |

**A presença ou ausência de símbolos muda a dificuldade do trabalho em ordens de magnitude.**
Sempre verifique isso na primeira linha.

```bash
file binario | grep -o 'stripped'
# "not stripped" ou "stripped"
```

---

## 5.2 Anatomia de um ELF

Um ELF tem duas visões da mesma coisa: **seções** (para o linker) e **segmentos** (para o loader).

### Seções que você vai usar

| Seção | Conteúdo | Interesse em RE |
|---|---|---|
| `.text` | código executável | Onde está a lógica |
| `.rodata` | constantes, strings literais | Mensagens, tabelas de salto |
| `.data` | globais inicializados | Configuração, chaves |
| `.bss` | globais não inicializados | Buffers |
| `.plt` | *Procedure Linkage Table* | Chamadas a libc — **muito importante** |
| `.got` | *Global Offset Table* | Endereços resolvidos em runtime |
| `.symtab` | tabela de símbolos | Nomes de função (some se *stripped*) |
| `.dynsym` | símbolos dinâmicos | Sobrevive a *stripping* parcial |
| `.init_array` | construtores | **Ponto de entrada de malware com construtor** |

### A dupla PLT/GOT

Isso confunde todo iniciante e é essencial. Quando um binário chama `printf`, ele não chama
`printf` diretamente — ele chama um *stub* na `.plt`:

```asm
0000000000401030 <printf@plt>:
    401030:  jmp    QWORD PTR [rip+0x2fe2]   ; salta para o endereço em .got
    401036:  push   0x0
    40103b:  jmp    401020 <plt_resolver>
```

Na primeira chamada, o endereço na GOT aponta de volta para o resolver; ele resolve o símbolo e
**escreve o endereço real na GOT**. Da segunda chamada em diante, o `jmp` vai direto.

**Consequências práticas:**

- Em análise estática, `printf@plt` é o nome que você vê. O alvo real só existe em runtime.
- Para saber **quais funções de biblioteca o binário usa**, olhe a `.plt` — não o corpo do código.
- A GOT é alvo clássico de exploração (GOT overwrite). Reconhecer o par é pré-requisito para
  entender isso.

```bash
objdump -d -j .plt -M intel binario      # todas as chamadas de libc
objdump -R binario                        # relocations dinâmicas (a GOT)
```

### `readelf` para a estrutura

```bash
readelf -h binario          # cabeçalho ELF: arquitetura, entry point, tipo
readelf -S binario          # seções
readelf -l binario          # segmentos (visão do loader)
readelf -s binario          # símbolos
readelf -d binario          # dependências dinâmicas (quais .so ele usa)
readelf -r binario          # relocations
readelf -n binario          # notas: BuildID, ABI, propriedades
readelf -x .rodata binario  # dump de uma seção específica em hex
```

Campos que importam:

```bash
readelf -h binario | grep -E 'Entry|Type|Machine'
# Entry point address: o endereço de _start — por onde o kernel começa
# Type: DYN (PIE) ou EXEC (não-PIE)

readelf -d binario | grep NEEDED
# NEEDED: as bibliotecas compartilhadas de que o binário depende
```

⚠ **`Entry point` ≠ `main`.** O entry point é `_start`, que faz setup de libc e depois chama
`main`. Se você puser um breakpoint no entry point, está antes de qualquer código seu. Para achar
`main`, procure o símbolo, ou siga o `rdi` passado para `__libc_start_main`.

---

## 5.3 Símbolos: `nm`, `objdump -t`

Se o binário não está *stripped*, os nomes estão lá — e isso é uma vantagem enorme.

```bash
nm binario                    # todos os símbolos
nm -D binario                 # só dinâmicos (funciona mesmo stripped parcial)
nm -C binario                 # demangle (C++: _ZN3Foo3barEv → Foo::bar())
nm --defined-only binario     # só os definidos
objdump -t binario            # equivalente
objdump -T binario            # dinâmicos com endereço
```

Tipos de símbolo que aparecem:

| Letra | Significado |
|---|---|
| `T` | Em `.text`, global, definido (função) |
| `t` | Em `.text`, local (função estática) |
| `D` / `d` | Em `.data` (global inicializada) |
| `B` / `b` | Em `.bss` (não inicializada) |
| `R` / `r` | `.rodata` (somente leitura) |
| `U` | **Undefined** — usado mas definido em outro lugar (libc) |
| `W` / `w` | *weak* symbol |

**Dica prática:** filtre por `T` para listar as funções do próprio binário.

```bash
nm --defined-only binario | grep ' T ' | sort
```

Se o binário está *stripped*:

```bash
objdump -T binario        # ainda funciona: símbolos dinâmicos persistem
```

Binário *stripped* ainda precisa dos símbolos dinâmicos para resolver libc — então você vê
`printf` e `malloc`, mas não as funções internas. É um *stripping* parcial na prática.

---

## 5.4 `strings` — subestimada e essencial

```bash
strings binario                          # strings de 4+ caracteres
strings -n 8 binario                     # mínimo 8 caracteres (menos ruído)
strings -t x binario                     # com offset em hex
strings -e l binario                     # UTF-16 little-endian (binários Windows)
strings -a binario                       # todas as seções, não só as carregadas
```

### O que strings revela

```bash
strings -t x -n 6 binario | grep -iE 'passw|user|admin|/etc/|http|key|token'
```

Você encontra:

- caminhos de arquivo (`/etc/shadow`, `/var/log/auth.log`);
- URLs e nomes de host;
- strings de formato (`%s`, `%d` — indicam chamada a `printf`);
- mensagens de erro — que revelam a lógica interna;
- **nomes de função de bibliotecas VERSIONADAS** (`GCC: (GNU) 12.2.0` no comentário);
- chaves e tokens embutidos (surpreendentemente comum);
- em malware, comandos de shell e domínios C2.

### Comparando strings de duas versões

```bash
strings -n 6 v1 | sort -u > s1.txt
strings -n 6 v2 | sort -u > s2.txt
diff s1.txt s2.txt | grep '^>'
```

Novas strings entre versões costumam apontar diretamente para as funcionalidades adicionadas.
Este é um atalho que analistas usam antes de partir para o diff de binário do Módulo 8.

N O T A Se o binário está empacotado (packed) ou cifrado, `strings` retorna quase nada além de
nomes de biblioteca. **Poucas strings é, em si, um sinal.** O Módulo 7 volta nisso.

---

## 5.5 Ghidra: o decompilador

Ghidra é gratuito, da NSA, e é a ferramenta de referência para análise estática.

### Fluxo básico

1. **File → New Project → Non-Shared Project** (ou compartilhado, se for colaborar).
2. **File → Import File** → selecione o binário.
3. Ghidra detecta formato e arquitetura. **Confirme:** x86-64, little-endian.
4. Duplo clique no binário no projeto.
5. **Analysis → Auto Analyze** — aceite os padrões (alguns minutos para binários grandes).

### As três janelas que importam

| Janela | O que mostra |
|---|---|
| **Listing** | disassembly com anotações |
| **Decompiler** | pseudocódigo C — o ganho principal |
| **Symbol Tree** | funções e variáveis encontradas |

### Atalhos que aceleram tudo

| Ação | Efeito |
|---|---|
| `g` | ir para endereço ou símbolo |
| Duplo clique em função | navega para ela |
| `Ctrl+Shift+E` | renomear variável/função |
| `;` | comentário na linha |
| `L` | renomear rótulo |
| `Ctrl+Shift+G` | definir tipo (struct) |
| `X` | referências cruzadas (*xrefs*) |

### Xrefs — o recurso mais importante

Com o cursor sobre uma variável ou função, `Ctrl+Shift+F` (ou o painel de xrefs) mostra **quem
referencia isso**. É como você navega um binário sem símbolos: encontra uma string interessante,
vê quem a referencia, e chega na função que a usa.

**Workflow típico:** `strings` → string interessante → Ghidra → xref da string → função →
renomeia função → entende a lógica. Isso resolve 80% da análise inicial.

### Decompilador: use com ceticismo

O decompilado é uma **reconstrução plausível**, não o código original. Erros comuns:

- Tipos inferidos errado (`int` onde era `size_t`);
- Estruturas achatadas em variáveis soltas;
- Loops rearranjados;
- Variáveis com o mesmo nome (`local_18`, `uVar1`) que são a mesma coisa;
- Otimizações confundindo a reconstrução.

**A regra do curso:** sempre confira no listing quando o decompilado parecer estranho. Você
aprendeu a ler assembly nos Módulos 1–4 justamente para poder fazer isso.

---

## 5.6 GDB em binário real

```bash
gdb -q ./binario
```

```
(gdb) set disassembly-flavor intel
(gdb) info functions                  # lista símbolos de função
(gdb) info proc mappings              # mapa de memória do processo — MUITO útil
(gdb) break main
(gdb) run
(gdb) disas /r main                   # com bytes
(gdb) x/20i $pc                       # próximas 20 instruções
(gdb) info registers
(gdb) x/s 0x402004                    # string no endereço
(gdb) x/10gx 0x404040                 # 10 qwords (uma GOT, por exemplo)
```

### Sem símbolos: navegando por endereço

```bash
gdb -q ./binario-stripped
```

```
(gdb) info functions                 # vazio ou quase
(gdb) starti                         # para no entry point
(gdb) x/20i $pc
(gdb) break *0x401136                # breakpoint por endereço
(gdb) run
```

Com PIE, os endereços mudam. Para contornar:

```
(gdb) set disable-randomization on   # desativa ASLR no processo (só no gdb)
(gdb) set logging file gdb-out.txt
(gdb) set logging enabled on
```

⚠ **`set disable-randomization on` fixa o endereço base** e faz os endereços do `objdump`
coincidirem com os de runtime. É a primeira coisa a fazer quando você não consegue pôr breakpoint
por endereço.

### Achar `main` sem símbolos

```
(gdb) starti
(gdb) break __libc_start_main
(gdb) continue
(gdb) x/5i $pc
# inspecione o primeiro argumento (rdi) — é o endereço de main
(gdb) p/x $rdi
```

`__libc_start_main` recebe o ponteiro de `main` em `rdi`. É o caminho clássico para localizar
`main` em binário sem símbolos.

---

## 5.7 Análise dinâmica: `strace` e `ltrace`

Revelam o que o binário **faz** quando roda, sem precisar ler o assembly.

```bash
strace ./binario                        # todas as syscalls
strace -f ./binario                     # segue processos filhos  ← essencial
strace -e trace=open,openat,read,write ./binario
strace -o saida.txt ./binario           # para arquivo
strace -s 200 ./binario                 # strings de até 200 chars
strace -c ./binario                     # resumo estatístico
```

```
openat(AT_FDCWD, "/etc/passwd", O_RDONLY) = 3
read(3, "root:x:0:0:root:/root:/bin/bash\n"..., 4096) = 1876
write(1, "conteudo obtido\n", 16) = 16
```

**Isso conta a história do programa em uma tela.** Arquivos que abre, o que lê, o que escreve.

```bash
ltrace ./binario                        # chamadas de biblioteca
ltrace -f -e 'malloc+free+strcpy' ./binario
```

N O T A **`strace` em malware é atividade de risco** — o programa executa. Só em VM sem rede,
sem disco compartilhado, sem acesso a credenciais reais. E ainda assim: malware pode detectar
que está sendo traçado (`ptrace`) e mudar de comportamento. `strace` é ótimo para binário
benigno e para entender fluxo; não é sua primeira ferramenta contra amostra hostil.

---

## 5.8 LAB — Dissecar um binário com cada ferramenta

**Duração:** 120 min
**Objetivo:** usar todas as ferramentas do módulo sobre o mesmo binário e cruzar as informações.

### Passo 1 — O alvo

```bash
mkdir -p ~/re-lab/lab5 && cd ~/re-lab/lab5

cat > alvo.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define TAM_MAX 64

static const char *SEGREDO = "chave-interna-lab-2026";

struct registro {
    int   id;
    char  nome[TAM_MAX];
    long  pontos;
};

static int calcula_checksum(const char *s) {
    int h = 0;
    while (*s) {
        h = h * 31 + *s;
        s++;
    }
    return h;
}

int valida(const char *entrada) {
    int h = calcula_checksum(entrada);
    if (h == 0x5f3a21) {
        printf("acesso liberado\n");
        return 1;
    }
    printf("acesso negado\n");
    return 0;
}

int main(int argc, char **argv) {
    struct registro r = {1, {0}, 100};

    if (argc < 2) {
        fprintf(stderr, "uso: %s <token>\n", argv[0]);
        return 2;
    }

    strncpy(r.nome, argv[1], TAM_MAX - 1);
    printf("id=%d nome=%s pontos=%ld\n", r.id, r.nome, r.pontos);
    printf("checksum interno: %d\n", calcula_checksum(SEGREDO));

    return valida(argv[1]) ? 0 : 1;
}
EOF

gcc -O0 -g -o alvo-debug alvo.c
gcc -O2 -o alvo-opt alvo.c
cp alvo-opt alvo-stripped && strip alvo-stripped
```

### Passo 2 — Triagem (15 min)

Produza um arquivo `triagem.md` com, para **os três** binários:

```bash
file alvo-debug alvo-opt alvo-stripped
readelf -h alvo-opt | grep -E 'Type|Entry|Machine'
readelf -d alvo-opt | grep NEEDED
nm --defined-only alvo-opt | grep ' T ' | sort
objdump -d -j .plt -M intel alvo-opt
strings -t x -n 5 alvo-opt
```

Responda:

- Qual é PIE e qual não é?
- Quais funções o binário define? Quais importa de libc?
- Quais strings você encontrou e quais chamam atenção?
- Qual a diferença entre a lista de funções de `alvo-debug` e `alvo-stripped`?

### Passo 3 — Análise estática com Ghidra (45 min)

Abra `alvo-opt` no Ghidra e:

1. Localize `main` e `valida`.
2. Use xref sobre a string `"acesso liberado"` para chegar em `valida` (mesmo sem símbolos).
3. Renomeie as variáveis do decompilado para nomes significativos.
4. Responda: **qual entrada faz `valida` retornar 1?** Deduza a partir da constante de comparação.

Dica: você precisa descobrir qual string tem checksum `0x5f3a21`. Você pode calcular isso em
Python ou C, já que o algoritmo está visível.

```bash
python3 - <<'EOF'
alvo = 0x5f3a21
# o algoritmo é: h = h*31 + c
# inverta para achar uma string de 1 byte, 2 bytes, etc.
for c in range(32, 127):
    if c % (2**32) == alvo:
        print("1 byte:", chr(c))
# tente 2 bytes
for a in range(32, 127):
    for b in range(32, 127):
        if (((a*31 + b) & 0xffffffff) == alvo):
            print("2 bytes:", chr(a)+chr(b))
print("(procure a string correta — use o valor real do alvo)")
EOF
```

N O T A Se a constante no seu binário for diferente do exemplo (o compilador pode ter
transformado a expressão), **use o valor que você viu no disassembly**. O objetivo é você seguir
o método, não reproduzir um número.

### Passo 4 — Análise dinâmica (30 min)

```bash
strace -f -s 200 ./alvo-opt teste 2>&1 | head -40
ltrace ./alvo-opt teste 2>&1 | head -30
```

Correlacione: as chamadas de `strncpy` e `printf` aparecem igual no `ltrace`?

Rode com a entrada que você descobriu no passo 3 e confirme que funciona.

### Passo 5 — GDB sobre o binário sem símbolos (30 min)

```bash
gdb -q ./alvo-stripped
```

```
(gdb) set disassembly-flavor intel
(gdb) set disable-randomization on
(gdb) starti
(gdb) break __libc_start_main
(gdb) continue
(gdb) p/x $rdi                       # endereço de main
(gdb) break *<endereço> 
(gdb) continue
(gdb) x/20i $pc
```

Compare os endereços encontrados com o `objdump` de `alvo-opt`. Eles coincidem agora? Por quê?

### Critérios de aceitação

- `triagem.md` cobre os três binários com todas as saídas relevantes.
- Você identificou corretamente PIE vs. não-PIE nos três.
- Você localizou `valida` no Ghidra **usando xref de string**, mesmo sem símbolos.
- Você renomeou ao menos quatro variáveis no decompilado com nomes justificados.
- Você encontrou uma entrada que faz o programa imprimir `acesso liberado`.
- Você localizou `main` no GDB sem símbolos, via `__libc_start_main`.
- Você explicou por que `set disable-randomization on` faz os endereços coincidirem.

---

## Avaliação

1. Liste cinco informações que `file` fornece e explique a relevância de cada uma para a análise.
2. Qual a diferença entre seção e segmento num ELF? Quem usa cada um?
3. Explique o mecanismo PLT/GOT. Como você descobre quais funções de libc um binário usa?
4. Por que `Entry point` não é `main`? Como você encontra `main` em binário sem símbolos?
5. Como `nm -D` funciona em binário *stripped*? O que permanece e o que desaparece?
6. Cite quatro tipos de informação que `strings` pode revelar num binário real.
7. O que significa um binário com pouquíssimas strings?
8. O decompilador do Ghidra erra tipos. Dê um exemplo de erro que você já viu ou esperaria ver, e
   como você confirmaria no listing.
9. O que `strace -f` mostra que `strace` sem `-f` não mostra? Por que isso importa?
10. Por que `strace` pode dar resultado enganoso contra malware?

---

**Próximo:** [Módulo 6 — Engenharia reversa aplicada](modulo-06.md)
