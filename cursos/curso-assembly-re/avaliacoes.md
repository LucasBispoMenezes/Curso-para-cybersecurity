# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos oito módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — Arquitetura e o mapa da máquina

**1. O que está no `.o` quando você escreve `mov eax, 42`?**

Os bytes `B8 2A 00 00 00`. Assembly é a representação textual de código de máquina — a
correspondência é praticamente um para um. A tradução não é sempre trivialmente reversível
(desmontadores fazem inferência e podem errar), mas não há camada de abstração no meio.

**2. Ordem dos operandos**

Em `mov rax, rbx` (Intel) a origem é `rbx` e o destino é `rax`. Em AT&T: `movq %rbx, %rax`.
Muda apenas a leitura — a operação é a mesma. Mnemônico: AT&T é **origem-primeiro**.

**3. Regra dos sub-registradores de 32 bits**

Escrever num registrador de 32 bits **zera os 32 bits superiores**. Depois de `mov rax, -1`
(rax = 0xFFFFFFFFFFFFFFFF) e `mov eax, 7`, `rax` vale `0x0000000000000007`. Depois de
`mov al, 7`, `rax` vale `0xFFFFFFFFFFFFFF07` — escrita em 8 ou 16 bits **preserva** os bits
superiores.

**4. Stack cresce para baixo**

`push rax` faz `rsp -= 8` e depois escreve `rax` no endereço que `rsp` aponta. "Cresce para
baixo" significa que cada item empilhado vai para um endereço **menor**. Consequência prática:
na stack, endereço menor = mais recente.

**5. `mov` vs. `lea`**

`mov rax, [rbx+8]` lê 8 bytes da memória no endereço `rbx+8`. `lea rax, [rbx+8]` **calcula**
`rbx+8` e coloca em `rax`, sem tocar em memória. Compiladores usam `lea` para aritmética porque
ela faz soma com escala numa instrução só: `lea rax, [rbx+rcx*4]` = `rax = rbx + rcx*4`.

**6. `cmp` e `test`**

Subtraem (cmp) ou fazem AND (test) sem guardar o resultado — só atualizam as flags. Isso basta
para um `je` porque o salto condicional lê as flags, não o resultado da operação.

**7. Escala 8**

`sizeof` do elemento. 8 significa ponteiro ou `long` (8 bytes). Escala 4 seria `int` ou `float`.
Escala 1, `char`. Escala 2, `short`.

**8. `fs:0x28`**

É o **stack canary**: o compilador lê o valor do TLS, guarda na stack frame, e verifica antes do
`ret`. Se a stack foi sobrescrita por buffer overflow, o valor não bate e o programa chama
`__stack_chk_fail`.

---

## Módulo 2 — Memória, stack e convenções de chamada

**1. Stack frame desenhado**

Para `int f(int a, int b) { int x, y, z; }` em `-O0`:

```
endereços maiores
    [rbp+0x10]  → argumento 7 (se houvesse)
    [rbp+0x8]   → endereço de retorno
    [rbp]       → rbp salvo do caller        ← rbp aponta aqui
    [rbp-0x4]   → variável local 1
    [rbp-0x8]   → variável local 2
    [rbp-0xc]   → variável local 3           ← rsp aponta aqui (após sub rsp, 0x10)
endereços menores
```

Note o `sub rsp, 0x10` para 3 variáveis de 4 bytes (12 bytes → arredondado para 16 por
alinhamento).

**2. Por que `push` subtrai**

A stack começa num endereço alto e cresce em direção a endereços menores. Subtrair move o
ponteiro na direção de crescimento.

**3. Os quatro primeiros argumentos**

`rdi`, `rsi`, `rdx`, `rcx`. Se fossem `double`, iriam em `xmm0`–`xmm3` — barramento
independente, sem relação com os registradores inteiros.

**4. Caller-saved vs. callee-saved como contrato**

*Caller-saved:* a função chamada pode destruir; se o caller precisa do valor depois, ele salva.
*Callee-saved:* a função chamada pode usar, mas **obriga-se** a restaurar antes de retornar.
Se `rbx` é modificado sem `push`/`pop`, quem quebra o contrato é a **função chamada** — ela é a
responsável por `rbx`, `rbp`, `r12`–`r15`.

**5. Por que `rbp` existe**

Porque `rsp` se move durante a execução (push, pop, call). `rbp` fica fixo durante toda a função,
permitindo offsets constantes para variáveis locais. Se você usasse `rsp` diretamente, cada
`push` dentro da função invalida os offsets das variáveis.

**6. Alinhamento de 16 bytes**

Exigência da ABI para permitir que SSE use instruções de 16 bytes (`movaps`) na stack. Violar
isso causa SIGSEGV dentro de código de biblioteca, geralmente em instruções que você não
escreveu.

**7. Escala 4 vs. 8**

Escala 4 = `sizeof(int)` ou `sizeof(float)`. Escala 8 = `sizeof(ponteiro)` ou `sizeof(long)`.

**8. `[rbp+0x10]`**

É **argumento** — offset positivo a partir de `rbp` fica acima, na região onde o caller empilhou.
Variáveis locais ficam em offset negativo.

**9. Windows**

Usa `rcx, rdx, r8, r9` para os quatro primeiros. *Shadow space* são 32 bytes que o **caller**
reserva na stack e que a função chamada pode usar para salvar os registradores de argumento.

---

## Módulo 3 — Assembly na prática

**1. Quatro estágios**

`.asm` → montador → `.o` (objeto) → linker → executável. Um símbolo indefinido só causa erro no
**linker** — o montador apenas anota a referência como pendente.

**2. Número de syscall e argumentos**

Número em `rax`. Argumentos em `rdi`, `rsi`, `rdx`, `r10`, `r8`, `r9`. `r10` substitui `rcx`
porque a instrução `syscall` **sobrescreve `rcx`** com o endereço de retorno.

**3. `equ $ - mensagem`**

`$` é o endereço corrente em tempo de montagem. A diferença entre o endereço atual e o início da
string é o comprimento. É avaliação do montador — não há nada em runtime.

**4. `xor eax, eax` antes de `printf`**

`printf` é variádica. A ABI exige que `al` contenha o número de registradores `xmm` usados. Se
você não passa `float`/`double`, é zero. Omitindo, `printf` vai achar que há valores em `xmm` e
lê-los — resultado: lixo ou travamento.

**5. `if`/`else`**

```asm
    cmp  edi, 0
    jne  senao         ; condição INVERTIDA
    mov  eax, 1
    jmp  fim
senao:
    mov  eax, 2
fim:
```

O salto é invertido porque o fluxo cai direto no bloco "verdadeiro": você só salta **fora** dele
quando a condição não se aplica. Compiladores também geram a forma positiva + `jmp`; as duas são
válidas.

**6. Forma de todo laço**

(1) Um rótulo de entrada, (2) uma comparação com salto condicional para fora, (3) um `jmp` de
volta ao rótulo. A variante otimizada põe a comparação no fim e remove o `jmp`.

**7. `max3` sem prologue**

A função não usa stack — trabalha só em registradores. É uma **função folha** que não precisa
salvar nada. Prologue só existe para reservar espaço local ou preservar registradores
callee-saved.

**8. `global`**

Exporta o símbolo para que outros módulos possam referenciá-lo. Sem isso, o linker não encontra
a função e reporta símbolo indefinido.

**9. `and rsp, -16`**

`-16` em complemento de dois é `0xFFFFFFFFFFFFFFF0` — máscara que zera os 4 bits baixos e portanto
**arredonda para baixo** até múltiplo de 16. Conserta o desalinhamento da stack, que existe porque
o kernel saltou para `_start` sem fazer `call`.

**10. Obrigação com `rbx`**

A função deve `push rbx` no início e `pop rbx` antes de retornar. A obrigação existe porque o
caller conta com `rbx` preservado — ele não o salvou, por contrato.

---

## Módulo 4 — O compilador como tradutor

**1. `-O0` vs. `-O2`**

`-O0` traduz linha por linha, sem eliminar nada: mostra a **intenção** do código original.
`-O2` transforma agressivamente: mostra o **resultado** efetivo. Use `-O0` para aprender e
entender o código; use `-O2` para saber o que realmente roda.

**2. `x*8` e `x/4`**

`shl eax, 3` e `sar eax, 3`. `lea` aparece em multiplicações pequenas porque faz soma com escala
numa instrução só, sem escrever em flags, e é mais rápida que `imul`.

**3. Divisão por constante**

Implementada como multiplicação por um número mágico (recíproco da constante) seguida de shift,
porque `div`/`idiv` são dezenas de ciclos. Ao encontrar constante que não reconhece, **siga o
fluxo** e deduza pelo contexto em vez de tentar decodificar de cabeça.

**4. `cmp` + `setcc` sem salto**

A função **retorna** o booleano. Não há desvio de controle: o resultado é o valor de retorno.

**5. Duas formas de laço**

Forma com teste no início: duas comparações por iteração em alguns casos. Forma com teste no fim
e `jne`: uma comparação por iteração. A segunda é o padrão em `-O2`.

**6. Tabela de saltos**

Reconhece-se por `jmp QWORD PTR [reg*8 + base]` — escala 8 (endereços) com base apontando para
`.rodata`. `movsxd` aparece porque o índice é `int` (32 bits) e precisa ser estendido para 64 bits
para o cálculo do endereço.

**7. `fs:0x28`**

Stack canary. Detecta sobrescrita da stack frame antes do `ret`. Aparece em funções que têm
buffer local (arrays de char, structs grandes na stack) — não em funções que só usam registradores.

**8. PIE**

Com PIE, acesso a global/string usa `lea rax, [rip+offset]` em vez de endereço absoluto. Na
tabela de saltos, o `add rax, rdx` existe porque a tabela guarda **offsets relativos**, não
endereços absolutos — a correção soma a base.

**9. Tail call**

`call f; ret` vira `jmp f`. Você não vê o `ret` da função que "chamou", e no disassembly a função
parece saltar para outra em vez de retornar.

**10. `-O2` e reconstrução**

Você não reconstrói a estrutura original — ela foi transformada. Você reconstrói a **semântica**:
o que a função calcula, em que condições, com quais dados. Nomes de variável locais ficam por
conta do analista.

---

## Módulo 5 — Ferramentas de análise

**1. `file`**

Formato (ELF), arquitetura (x86-64), endianness (LSB), tipo (PIE/não-PIE), linked
(dinâmico/estático), interpretador, e **`stripped` ou `not stripped`**. O último muda
drasticamente a dificuldade.

**2. Seção vs. segmento**

Seções são a visão do **linker** (`.text`, `.data`, `.rodata`, `.symtab`) — usadas para organizar
os dados. Segmentos são a visão do **loader** (`LOAD`, `INTERP`, `DYNAMIC`) — usados pelo kernel
para mapear memória com permissões.

**3. PLT/GOT**

`.plt` contém stubs; cada stub faz `jmp QWORD PTR [rip+offset]` para uma entrada da GOT. Na
primeira chamada, a GOT aponta para o resolver, que resolve o símbolo e atualiza a GOT. Para
descobrir as funções de libc usadas: `objdump -d -j .plt -M intel binario`.

**4. Entry point ≠ main**

`Entry point` é `_start`, que faz setup da libc e chama `main` via `__libc_start_main`. Para
achar `main` sem símbolos: breakpoint em `__libc_start_main`, e o endereço de `main` está em
`rdi`.

**5. `nm -D` em stripped**

Símbolos dinâmicos persistêm porque o binário precisa resolver libc em runtime. Você vê as
importações (`printf`, `malloc`) mas não as funções internas definidas no próprio binário.

**6. `strings` revela**

Caminhos de arquivo, URLs e domínios, strings de formato, mensagens de erro, nomes de biblioteca
versionados, chaves e tokens embutidos, comandos de shell.

**7. Poucas strings**

Sinal de empacotamento, cifra ou compressão. O código real está oculto até ser descomprimido em
memória.

**8. Erro do decompilador**

Exemplo: inferir `int` para um valor que é `size_t` — o decompilado mostra comparação com sinal
onde o correto é sem sinal. Confirmar no listing: a instrução de comparação é `jg` (com sinal)
ou `ja` (sem sinal)?

**9. `strace -f`**

Segue processos **filhos**. Importa porque muito programa (e praticamente todo malware com
stager) faz `fork`/`execve` e o trabalho real acontece no filho. Sem `-f`, você vê só o pai.

**10. `strace` contra malware**

Malware pode detectar `ptrace` e mudar de comportamento — ou não executar o payload. Também pode
usar syscalls diretas que confundem a leitura, ou só ativar o comportamento malicioso sob certas
condições (data, ambiente, rede). O strace mostra o que aconteceu **naquela execução**, não o que
o programa é capaz de fazer.

---

## Módulo 6 — Engenharia reversa aplicada

**1. Seis etapas**

Reconhecimento → localizar o alvo → delimitar a função → **anotar antes de interpretar** →
identificar padrões estruturais → reconstruir e validar. Anotar antes melhora o resultado porque
transforma bytes em narrativa mecânica sem exigir entendimento precoce; quando você chega na
etapa de interpretar, a estrutura já está visível.

**2. Array vs. struct**

Array: escala com índice variável (`[rdi+rax*4]`). Struct: offsets constantes (`[rdi+0x8]`).

**3. Dedução de estrutura**

`[rdi+0x18]` é DWORD (4 bytes), `[rdi+0x1c]` é BYTE (1 byte). Campo de 4 bytes em offset 24,
campo de 1 byte em offset 28. O offset 28 e não 25 porque o campo anterior ocupou 24–27. Se
houver um campo de 8 bytes depois em offset 32, há 3 bytes de padding para alinhamento.

**4. Ponteiro ou valor**

Ponteiro: o argumento é **desreferenciado** (`[rdi]`, `[rdi+8]`). Valor: usado
aritmeticamente (`add eax, edx`, `cmp edi, 5`).

**5. `setcc` + `movzx`**

Retorno booleano — `int` com valor 0 ou 1, convencionalmente resultado de comparação.

**6. Constantes**

`0x5DEECE66D` → `rand()` glibc (LCG). `0x67452301`/`0xEFCDAB89` → MD5/SHA-1.
`0x6A09E667` → SHA-256. `0xEDB88320` → CRC-32. `0xCBF29CE484222325` → FNV-1a 64.
`0x9E3779B9` → TEA/XXTEA.

**7. Tabela de 256 bytes**

S-box ou tabela de substituição — AES, ou um algoritmo customizado que faz substituição byte a
byte. Se indexada por byte de entrada e o resultado é o byte de saída, é substituição.

**8. `lea` vs. `imul`**

`lea eax, [rax+rax*2]` calcula `rax*3` numa instrução, sem usar a unidade de multiplicação e sem
escrever em flags. `imul` tem latência maior (3+ ciclos contra 1 do `lea` em muitos
processadores).

**9. Validação**

Comparação de assembly gerado é mais forte porque cobre **todos** os caminhos, não só os que você
testou. Testes comportamentais verificam os casos que você pensou; a comparação de assembly
mostra se sua lógica é estruturalmente idêntica.

**10. `pontua`**

Recebe um **array de structs** (ponteiro + contagem), não uma struct única. Evidência: há um
laço com índice, e o acesso é `[base + índice*16]` com `sizeof(struct) = 16` — o multiplicador
aparece via `shl rdx, 4` ou `lea` equivalente.

---

## Módulo 7 — Análise de malware e ofuscação

**1. Cinco sinais de empacotamento**

Poucas strings legíveis; entropia alta em `.text` (> 7.2); `.text` gravável; tamanho do arquivo
muito maior que a soma das seções; nomes de packer nas seções (UPX0, .aspack). Entropia é medida
com histograma de bytes por seção e a fórmula de Shannon.

**2. Stub**

É o código pequeno que roda primeiro, descomprime o payload real na memória, e salta para ele. O
código no arquivo é o stub comprimido — o que executa é diferente do que está no disco.

**3. Desempacotamento dinâmico**

Executar sob depurador, pôr breakpoint depois do loop de descompressão (ou em `mprotect`, quando
o stub torna a região executável), e despejar a memória. Exige executar o binário — é a razão
pela qual todo o protocolo de isolamento é obrigatório.

**4. Detecção de depurador**

`ptrace(PTRACE_TRACEME)` (falha se já traçado); ler `/proc/self/status` e checar `TracerPid`;
`ptrace(PTRACE_PEEKUSER)` em si mesmo; medir tempo com `rdtsc`; procurar byte `0xCC` no próprio
`.text`. Em análise estática aparecem como chamadas de `ptrace`, abertura de `/proc/self/status`,
e leitura de memória própria.

**5. Control flow flattening**

Transformar todo o fluxo em uma máquina de estados: um dispatcher no topo do laço decide qual
bloco executar com base numa variável de estado. Destrói a estrutura original — você vê uma
cadeia de comparações em vez de `if`/`for` aninhados.

**6. Opaque predicate**

Expressão que sempre resulta no mesmo valor, mas cujo resultado o analisador não consegue provar
estaticamente. Ex.: `mov eax,5; imul eax,eax,4; test eax,eax; jz .nunca` — o salto nunca ocorre,
mas obscurece o fluxo.

**7. Strings cifradas vs. comprimidas**

Cifradas: entropia uniforme alta, tamanho múltiplo do bloco, geralmente com loop de decifração
visível. Comprimidas: entropia alta mas com estrutura de cabeçalho (zlib começa com `0x78`).
Para decifrar: identifique o algoritmo no disassembly (geralmente um XOR simples), extraia os
bytes com `objdump -s`, e **replique em Python** sem executar o binário.

**8. `socket` isolado**

Não é sinal. Toda aplicação de rede usa. Combinação forte: `socket` + `connect` + varredura de
sistema de arquivos + cifra + `unlink` — isso descreve ransomware com exfiltração.

**9. `/dev/shm` e `/tmp`**

Graváveis por qualquer usuário, frequentemente excluídos de limpeza de sistema, e em `/dev/shm`
o conteúdo está em memória (não persiste em disco, não aparece em forense de disco).

**10. Ofuscação e julgamento**

Ofuscação é usada legitimamente (anti-cheat, proteção de IP, DRM). O que determina se um software
é malicioso é o **comportamento**: o que faz com dados, rede e sistema, e se age com ou sem
consentimento. Julgar pela técnica é erro de principiante, e leva a falso positivo e falso
negativo ao mesmo tempo.

---

## Módulo 8 — Patch diffing e automação

**1. Patch diffing**

Comparar versão antiga e nova para isolar o que mudou. Reduz o espaço de análise de dezenas de
milhares de funções para as poucas que realmente mudaram. Números típicos: 50.000 funções no
binário, 200 alteradas no patch, 5 realmente interessantes.

**2. Tamanho de função**

O tamanho é propriedade do código, não do nome. Você consegue comparar duas funções sem saber
como se chamam — basta localizar a mesma por heurística (ordem, tamanho, strings referenciadas)
e comparar tamanho. Mudança de tamanho implica mudança de código.

**3. Normalização**

Sem normalizar, todo endereço difere entre versões e o diff aponta diferença em tudo. Normalizar
significa remover o endereço da linha, substituir endereços absolutos por placeholder, e manter
apenas mnemônico e operandos estruturais.

**4. Sinais de modificação**

Tamanho diferente; hash do corpo diferente; novas strings referenciadas; novas chamadas na `.plt`;
novos destinos de salto; diferença no conjunto de instruções de comparação.

**5. `cmp rax, 0x100`**

A versão original aceitava valores acima de 256 sem verificação — provavelmente um
estouro de buffer em `p->dados[256]`. A correção adiciona o limite. Dedução: o tipo de falha é
buffer overflow; a entrada explorável é qualquer texto com 256 caracteres ou mais.

**6. Delta é suspeito**

Porque o diff mostra **diferença**, não **significado**. A diferença pode ser: mudança de
compilador, variável renomeada, otimização diferente, ou código morto. Só a leitura da função
determina se é correção de falha, e qual falha.

**7. Quatro limitações**

Otimizações diferentes entre builds; inlining; reordenação de funções pelo compilador; binário
stripped sem nomes para correlacionar. (Também: mudança de dependência, build não-determinístico.)

**8. Inlining**

A função que mudou pode ter deixado de existir como símbolo separado — a lógica foi embutida no
chamador. Procure a função e não ache: o delta está em `main` ou no caller, ampliado.

**9. Heurísticas de correlação sem símbolos**

(a) Ordem relativa das funções, quando o compilador mantém a ordem do código-fonte; (b) tamanho
e hash do corpo, casando funções idênticas entre versões e tratando as não-casadas como
candidatas; (c) strings referenciadas dentro da função; (d) grafo de chamadas — a posição da
função na árvore de chamadas.

**10. Detalhes não publicados**

Enquanto o binário corrigido não circula amplamente, ninguém consegue fazer o diff e derivar a
exploração. É uma corrida: o fornecedor quer que os usuários atualizem antes que atacantes
reversem o patch. Detalhes são publicados **depois** que a maioria atualizou.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Correção técnica | 40% | As conclusões da análise estão certas e são verificáveis |
| Método explícito | 25% | O raciocínio está documentado, não só o resultado |
| Validação | 20% | As hipóteses foram testadas (compilação comparada, execução, GDB) |
| Documentação | 15% | Outra pessoa consegue seguir o que você fez |

**Penalidades automáticas:**

- Conclusão sem evidência no disassembly: −25%.
- Análise sem validação por compilação comparada (Módulos 4 e 6): −20%.
- Hipótese não testada apresentada como fato: −15%.
- Executar amostra fora de ambiente isolado (Módulo 7): lab zerado.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| Escopo | Analisa "o binário" | Analisa funções escolhidas | Funções escolhidas com critério justificado |
| Reconstrução | Pseudocódigo aproximado | C equivalente, validado | C equivalente + structs reconstruídas + validação por assemby |
| Estruturas | Ignora tipos | Deduz tipos dos offsets | Reconstrói struct completa com padding e `sizeof` |
| Erros | Não registra | Registra o resultado final | Registra hipóteses erradas e como descobriu |
| Ferramenta (opção B) | Script funciona | Script funciona com tratamento de erro | Heurísticas documentadas e justificadas |

**O item de maior valor em todo o curso:** documentar **onde sua primeira hipótese estava
errada** e como você descobriu. É o que distingue quem tem método de quem tem sorte, e é o
hábito que faz um analista melhorar.

---

*Material didático original. Nenhum trecho reproduzido de obra comercial protegida.*
