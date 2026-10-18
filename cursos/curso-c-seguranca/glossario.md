# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Aliasing estrito | Strict aliasing | M5 | Regra que diz: só `char *` pode apontar para qualquer tipo. Acessar por ponteiro de tipo incompatível é UB. |
| Alinhamento | Alignment | M8 | Cada tipo tem múltiplo obrigatório de offset. Explica o padding. |
| Alocação dinâmica | Dynamic allocation | M3 | Memória pedida em runtime (`malloc`/`calloc`/`realloc`) e liberada com `free`. |
| Argumento | Argument | M2 | Valor recebido por função. Array como parâmetro **decai** para ponteiro. |
| ASan | AddressSanitizer | M7 | Detecta overflow, UAF, double-free. ~2× lento. Muda o layout da heap. |
| Aritmética de ponteiro | Pointer arithmetic | M2 | `ptr + n` anda `n × sizeof(*ptr)` **bytes**, não `n`. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Buffer overflow | Buffer overflow | M6 | Escrita além do limite. Stack, heap ou global. Classe 1 e 2 do módulo 6. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `calloc` | calloc | M3 | Aloca **e zera**. Leva dois argumentos (n, tamanho). |
| Canário | Stack canary | M10 | Valor antes do endereço de retorno. Detecta transbordo de stack. Confirmado por `__stack_chk_fail`. |
| Comportamento definido | Defined behavior | M5 | O padrão garante exatamente o que acontece. |
| Comportamento indefinido | Undefined behavior (UB) | **M5** | **O padrão não garante nada.** O compilador pode fazer qualquer coisa, inclusive eliminar código. |
| Comportamento não especificado | Unspecified behavior | M5 | Um de vários comportamentos válidos — mas há resultado válido. |
| Comportamento dependente de implementação | Implementation-defined | M5 | Documentado pela implementação (ex.: `sizeof(int)`). |
| Contrato de posse | Ownership contract | M3 | Quem é dono de um bloco alocado, e quem libera. Expresso por convenção de nome. |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Decaimento de array | Array decay | M2 | Array como parâmetro vira ponteiro. `sizeof` passa a dar 8. |
| Desreferência | Dereference | M2 | `*p` — acessa o valor no endereço. |
| `double free` | Double free | M3 | Liberar duas vezes. Corrompe o alocador. |
| Duração de vida | Storage duration | M3 | Quanto tempo a **memória** existe. Diferente de escopo. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Escopo | Scope | M3 | Onde o **nome** é visível. Diferente de duração de vida. |
| Estática (duração) | Static duration | M3 | Vive do início ao fim do programa. `static` local sobrevive ao retorno. |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Fronteira de confiança | Trust boundary | M10 | A linha entre dado controlado por você e dado que vem de fora. Tudo que cruza é validado. |
| `_FORTIFY_SOURCE` | FORTIFY_SOURCE | M10 | Substitui funções de biblioteca por versões que verificam tamanho. **Exige `-O1`+**. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Hardening | Hardening | M10 | Flags que defendem sem mudar o código: FORTIFY, canário, PIE, RELRO, NX. |
| Heap | Heap | M2 | Região de alocação dinâmica. Cresce para **cima**. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Integer overflow | Integer overflow | M6 | Aritmética estoura o tipo. **UB se com sinal**; definido (envolve) se sem sinal. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| LeakSanitizer | LSan | M7 | Detecta vazamento. Incluído no ASan. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `malloc` | malloc | M3 | Aloca sem zerar. Pode devolver `NULL` — **checar é obrigatório**. |
| `memcpy` | memcpy | M4 / M5 | Copia `n` bytes. **Definido** para reinterpretar bits; substitui cast de ponteiro sem custo. |
| MSan | MemorySanitizer | M7 | Detecta variável não inicializada. Exige instrumentar a libc. |
| `memcmp` | memcmp | M4 | Compara bytes, sem parar no NUL. **Nunca usar para senha** (timing). |

## O

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Off-by-one | Off-by-one | M6 | Erro de um byte. Classe 7 do módulo 6. |
| Otimização | Optimization | M5 | `-O2` pode **eliminar** a verificação de overflow — porque UB "nunca acontece". |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Padding | Padding | M8 | Bytes inseridos para alinhar campos. Explica `sizeof` maior que a soma. |
| Ponteiro | Pointer | M2 | Um inteiro sem sinal que **é** um endereço. 8 bytes em x86-64. |
| Ponteiro pendurado | Dangling pointer | M3 | Ponteiro para bloco já liberado. Causa UAF. |
| `printf` | printf | M1 | **Da libc**, não do C. O `#include` só traz a declaração. |
| Punning via `union` | Type punning | M8 | Ler membro diferente do escrito. Funciona em GCC/Clang, mas **não é garantido**. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `realloc` | realloc | M3 | Redimensiona. **Pode mover o bloco** — usar variável temporária. |
| RELRO | RELRO | M10 | GOT somente-leitura após carga. Impede sobrescrita de ponteiro de função. |
| Retorno de função | Return value | M1 | Em `main`, é o código de saída do processo. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Sanitizer | Sanitizer | M7 | ASan, UBSan, TSan, LSan, MSan. Transforma corrupção silenciosa em falha diagnosticada. |
| `snprintf` | snprintf | M4 | Escreve no máximo `n`. **Sempre** termina em `\0`. Devolve o que **cabería**. |
| Stack | Stack | M2 | Região automática. Cresce para **baixo**. |
| `strncpy` | strncpy | M4 | Escreve no máximo `n`. ⚠ **Pode não terminar em `\0`**. |
| `strcmp` | strcmp | M4 | Devolve **0 para igual**. Por isso `if (strcmp(a,b))` testa diferente. |
| `strcpy` | strcpy | M4 | Copia até o `\0`. **Não verifica o destino.** |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Tipo fixo | Fixed-width type | M1 | `uint32_t` etc. Tamanho **garantido** pelo padrão, diferente de `int`. |
| TSan | ThreadSanitizer | M7 | Detecta race condition. **Mutuamente exclusivo com ASan.** |

## U

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| UBSan | UndefinedBehaviorSanitizer | M7 | Detecta integer com sinal, shift inválido. **Não pega oversão sem sinal.** |
| `union` | union | M8 | Campos sobrepõem o mesmo espaço. Instrumento de type confusion. |
| Use-after-free | UAF | M3 / M6 | Usa memória já liberada. Maior potencial de controle. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `valgrind` | Valgrind | M7 | Emula o processador. Não precisa recompilar. 10–50× mais lento. |
| Variável não inicializada | Uninitialized variable | M1 | Contém lixo — C **não** zera local. Só MSan e `valgrind` pegam. |

---

## As sete classes de bug — consulta rápida

| # | Classe | Origem | Compilador | Sanitizer | Antídoto |
|---|---|---|---|---|---|
| 1 | Stack overflow | Escrita além do local | `-Wstringop-overflow` | ASan | Verificar limite antes |
| 2 | Heap overflow | Escrita além do bloco | parcial | ASan | Conta igual à alocação |
| 3 | Use-after-free | Uso após `free` | não | ASan | Anular o ponteiro no `liberar` |
| 4 | Integer overflow | Aritmética estoura | `-Wstrict-overflow` | UBSan (só com sinal) | Checar **antes** de operar |
| 5 | Formato | Tipo ≠ formato | **`-Wformat=2`** | — | Usar `%zu` para `size_t` |
| 6 | `NULL` deref | Ponteiro nulo usado | parcial | ASan | Checar todo retorno que pode falhar |
| 7 | Off-by-one | Erro de 1 no limite | parcial | ASan (imperfeito) | `>=` em vez de `>` |

⚠ **A classe 5 é a única que o compilador pega bem.** Todas as outras exigem sanitizer ou revisão.

---

## As placas de aviso — consulta rápida

| Flags | Pega |
|---|---|
| `-Wall -Wextra` | Base: não usado, não inicializado, sombra |
| `-Wformat=2` | **Classe 5** |
| `-Wconversion -Wsign-conversion` | Conversão com perda, sinal |
| `-Wstrict-overflow=5` | Onde o compilador **assume** que não há overflow |
| `-Wswitch-enum` | `case` faltando em `enum` |
| `-Wwrite-strings` | Literal em `char *` |
| **`-Werror`** | Transforma tudo em erro — **a decisão que faz a diferença** |

---

## O pipeline de detecção — consulta rápida

| Camada | Ferramenta | Flags | Pega |
|---|---|---|---|
| 1 | Compilador | `-Wall -Wextra -Wformat=2 -Werror` | Formato, tipo, conversão |
| 2 | Sanitizer | `-fsanitize=address,undefined` | Overflow, UAF, integer com sinal |
| 3 | `valgrind` | `--leak-check=full --track-origins=yes` | Vazamento, não inicializada |

⚠ **Sanitizer e `valgrind` não rodam juntos.** Use um ou outro.

---

## As cinco regras — consulta rápida

| # | Regra |
|---|---|
| 1 | **Valide na fronteira, uma vez** — não no uso, repetido |
| 2 | **Uma verificação por limite**, e cobre **origem e destino** |
| 3 | **Cheque a aritmética antes** de usá-la como tamanho |
| 4 | **Um dono por bloco**, declarado por convenção de nome |
| 5 | **Compile com tudo ligado** — e `-Werror` |

---

## Os cinco pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **"Funcionou" não é prova de nada em C.** Saber **por que** funcionou é o trabalho. |
| 2 | **UB não é "resultado errado"** — é "nenhuma garantia", e o compilador pode eliminar seu código. |
| 3 | **Toda validação vem antes da operação**, e cobre origem e destino. |
| 4 | **Sem alocação, não há vazamento** — o contrato de posse mais simples é não ter dono. |
| 5 | **Confirme o hardening no binário**, não na flag. |

---

*Material didático original. Bug provocado apenas em código próprio, na própria máquina.*
