# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| ABI | ABI (Application Binary Interface) | M2 | Contrato em nível de binário: onde vão argumentos, quem preserva registradores, como o retorno volta. |
| Alinhamento de stack | Stack alignment | M2 | `rsp` deve ser múltiplo de 16 antes de `call`. Violar causa falha em instruções SSE. |
| Análise dinâmica | Dynamic analysis | M5 | Observar o programa em execução (`strace`, `ltrace`, depurador). Exige ambiente isolado se a amostra é hostil. |
| Análise estática | Static analysis | M5 | Examinar o binário sem executá-lo. Primeira escolha por não oferecer risco. |
| Anti-análise | Anti-analysis | M7 | Técnicas que dificultam a análise: anti-debug, anti-VM, ofuscação de fluxo. |
| Argumento | Argument | M2 | Valor passado a uma função. Os seis primeiros em registradores; o resto na stack. |
| Array de structs | Array of structs | M6 | Elementos de tamanho fixo; o multiplicador do índice revela o `sizeof`. |
| Assembly | Assembly | M1 | Representação textual de código de máquina. Praticamente um para um com os bytes. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Bind | Bind | — | Não usado neste curso. |
| Binário stripped | Stripped binary | M5 | Sem tabela de símbolos. Os nomes de função internos desaparecem; os dinâmicos permanecem. |
| Buffer overflow | Buffer overflow | M8 | Escrita além do limite do buffer. É o que o stack canary tenta detectar. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Callee-saved | Callee-saved / non-volatile | M2 | Registrador que a função chamada deve restaurar (`rbx`, `rbp`, `r12`–`r15`). |
| Caller-saved | Caller-saved / volatile | M2 | Registrador que a função chamada pode destruir (`rax`, `rcx`, `rdx`, `rsi`, `rdi`, `r8`–`r11`). |
| Canário de stack | Stack canary | M1 | Valor em `fs:0x28` guardado na stack frame e verificado antes do `ret`. |
| Chamada indireta | Indirect call | M7 | `call reg` em vez de `call endereço`. Quebra a análise estática. |
| Código de máquina | Machine code | M1 | Bytes que o processador executa. |
| Control flow flattening | Control flow flattening | M7 | Transformar o fluxo em uma máquina de estados com dispatcher. Destrói a estrutura original. |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Desmontador | Disassembler | M1 | Reconstroem texto a partir de bytes. Fazem inferência, podem errar. |
| Desempacotamento | Unpacking | M7 | Recuperar o código real escondido por um packer. |
| Disassembly | Disassembly | M5 | A saída textual de um desmontador. |
| Divisão por constante | Division by constant | M4 | Vira multiplicação por número mágico + shift. Reconhece-se pela constante estranha. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Endereçamento | Addressing mode | M1 | Forma `[base + índice*escala + deslocamento]`. Escala é o `sizeof` do elemento. |
| Endereço virtual | Virtual address | M1 | Endereço no espaço do processo, traduzido pelo kernel via tabelas de página. |
| Entropia | Entropy | M7 | Medida de aleatoriedade dos bytes. Acima de ~7.2 por seção indica cifra ou compressão. |
| Epilogue | Epilogue | M2 | Sequência final da função: restaura `rsp`/`rbp` e executa `ret`. |
| Executável PIE | PIE (Position-Independent Executable) | M4 | Binário carregável em endereço arbitrário. Usa endereçamento relativo a `rip`. |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Flags | Flags (EFLAGS/RFLAGS) | M1 | Bits de resultado: zero, carry, overflow, sinal. Alimentam os saltos condicionais. |
| Função folha | Leaf function | M3 | Função que não chama outras. Frequentemente sem prologue. |

## G

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| GOT | GOT (Global Offset Table) | M5 | Tabela de endereços resolvidos em runtime. Alvo clássico de exploração. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Hash de função | Function hash | M8 | Hash do corpo da função, usado para comparar versões de binário. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Inlining | Inlining | M4 | Função embutida no chamador; deixa de existir como símbolo. |
| Instrução | Instruction | M1 | Unidade de execução do processador. |
| Interpretador dinâmico | Dynamic linker / interpreter | M3 | Programa que carrega e liga as bibliotecas compartilhadas em runtime. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Laço desenrolado | Loop unrolling | M4 | Corpo do laço replicado para reduzir comparações. |
| Linker | Linker | M3 | Resolve símbolos e combina objetos em executável. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Montador | Assembler | M3 | Traduz assembly em código de máquina. NASM, GAS. |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Número mágico | Magic number | M4 | Constante que representa o recíproco de um divisor em divisão por constante. |

## O

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Opaque predicate | Opaque predicate | M7 | Expressão cujo resultado é conhecido mas indemonstrável estaticamente. |
| Ofuscação | Obfuscation | M7 | Técnica que dificulta a compreensão. Usada legitimamente e maliciosamente. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Packer | Packer | M7 | Programa que comprime/cifra o binário e adiciona um stub de descompressão. |
| Padding | Padding | M2 | Bytes inseridos para alinhar campos de struct. Explica offsets "estranhos". |
| Patch diffing | Patch diffing | M8 | Comparar duas versões para isolar o que mudou. |
| PLT | PLT (Procedure Linkage Table) | M5 | Stubs de chamada a funções de biblioteca. |
| Prologue | Prologue | M2 | Sequência inicial: `push rbp`, `mov rbp, rsp`, `sub rsp, N`. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Registrador | Register | M1 | Armazenamento interno do processador, muito mais rápido que memória. |
| Relocação | Relocation | M5 | Registro de endereço a ser corrigido em tempo de carga. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| S-box | S-box (substitution box) | M6 | Tabela de substituição de 256 bytes. Presente em AES e cifras customizadas. |
| Seção | Section | M5 | Visão do linker sobre o ELF (`.text`, `.data`, `.rodata`). |
| Segmento | Segment | M5 | Visão do loader sobre o ELF (`LOAD`, `INTERP`). |
| Shadow space | Shadow space | M2 | 32 bytes reservados pelo caller na ABI Windows x64. |
| Stack frame | Stack frame | M2 | Estrutura de uma chamada de função na stack: retorno, `rbp` salvo, locais. |
| Sub-registrador | Sub-register | M1 | Parte de um registrador (`eax`, `ax`, `al`). Escrita em 32 bits zera os 32 altos. |
| Símbolo | Symbol | M5 | Nome associado a endereço. Presente na `.symtab` se o binário não está stripped. |
| Syscall | Syscall | M3 | Chamada direta ao kernel. Número em `rax`, argumentos em registradores. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Tabela de saltos | Jump table | M4 | Array de endereços em `.rodata`. Assinatura de `switch` denso. |
| Tail call | Tail call optimization | M4 | `call f; ret` vira `jmp f`. Remove um `ret` do disassembly. |
| Transliteração | — | — | Não usado neste curso. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Validação por assembly | Assembly comparison validation | M6 | Compilar o C reconstruído e comparar o assembly gerado com o original. Prova mais forte que teste comportamental. |
| Valor de retorno | Return value | M2 | Em `rax` (inteiro/ponteiro) ou `xmm0` (ponto flutuante). |
| Vetorização | Vectorization | M4 | Processar múltiplos elementos por instrução (SSE/AVX) em `xmm`/`ymm`. |

## X

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Xref | Cross-reference (xref) | M5 | Referência cruzada: quem usa esta função/variável/string. Ferramenta central de navegação. |

---

## Registradores — resumo de consulta rápida

| 64 | 32 | Papel | Classe |
|---|---|---|---|
| `rax` | `eax` | Retorno, aritmética | Caller-saved |
| `rbx` | `ebx` | Uso geral | **Callee-saved** |
| `rcx` | `ecx` | 4º arg, contador | Caller-saved |
| `rdx` | `edx` | 3º arg | Caller-saved |
| `rsi` | `esi` | 2º arg | Caller-saved |
| `rdi` | `edi` | 1º arg | Caller-saved |
| `rbp` | `ebp` | Base do frame | **Callee-saved** |
| `rsp` | `esp` | Topo da stack | **Callee-saved** |
| `r8`–`r9` | `r8d`–`r9d` | 5º e 6º arg | Caller-saved |
| `r10`–`r11` | `r10d`–`r11d` | Temporários | Caller-saved |
| `r12`–`r15` | `r12d`–`r15d` | Uso geral | **Callee-saved** |

---

## Convenções de chamada — resumo

| | System V (Linux/macOS) | Microsoft x64 (Windows) |
|---|---|---|
| Arg 1 | `rdi` | `rcx` |
| Arg 2 | `rsi` | `rdx` |
| Arg 3 | `rdx` | `r8` |
| Arg 4 | `rcx` | `r9` |
| Arg 5 | `r8` | stack |
| Arg 6 | `r9` | stack |
| Retorno | `rax` | `rax` |
| Shadow space | não | 32 bytes |

---

## Constantes que identificam algoritmos

| Constante | Algoritmo |
|---|---|
| `0x5DEECE66D` | `rand()` glibc (LCG) |
| `0x67452301`, `0xEFCDAB89`, `0x98BADCFE` | MD5 / SHA-1 |
| `0x6A09E667`, `0xBB67AE85` | SHA-256 |
| `0xEDB88320` | CRC-32 (polinômio reverso) |
| `0x04C11DB7` | CRC-32 (polinômio normal) |
| `0xCBF29CE484222325`, `0x100000001B3` | FNV-1a / FNV prime (64 bits) |
| `0x9E3779B9` | TEA, XXTEA, hash baseado em golden ratio |
| `0x9E3779B97F4A7C15` | splitmix64 |
| `0x7feb352d`, `0x846ca68b` | hash multiplicativo (variante de splitmix) |

---

*Material didático original.*
