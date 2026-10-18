# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos onze módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — C do zero, com olhar de memória

**1. Quatro etapas**

Preprocessar (`.c` → `.i`, resolve `#include`/`#define`) · compilar (`.i` → `.s`, C para assembly) ·
montar (`.s` → `.o`, assembly para código de máquina) · linkar (`.o` + libs → executável).

**2. Compilação vs. linker**

Erro de compilação é sintaxe ou tipo — **diz a linha**, porque o problema está **naquele arquivo**.
Erro de linker é símbolo indefinido — **não diz a linha**, porque o problema é uma **ausência**, e
o linker não sabe onde você deveria tê-la definido.

**3. `T` e `U`**

`T` = símbolo **definido** na `.text` (função presente neste objeto). `U` = **indefinido**, usado
mas definido em outro lugar — que o linker vai resolver.

**4. `long` entre plataformas**

`long` é 8 bytes em Linux x86-64 e **4 em Windows 64** (LLP64 vs. LP64). O padrão só garante
`sizeof(long) >= sizeof(int)`. **Use `int64_t`/`uint64_t`** de `<stdint.h>` quando o tamanho importa.

**5. `uint32_t` vs. `unsigned int`**

`uint32_t` tem tamanho **garantido** (32 bits); `unsigned int` tem tamanho que varia por plataforma.

**6. `printf` e libc**

`printf` é da **libc**. O `#include <stdio.h>` traz apenas a **declaração** — o linker pega a
definição na biblioteca. Sem o include, a declaração implícita é erro em C99+ e UB onde compila.

**7. `main(void)` vs. `main()`**

`(void)` diz "não recebe argumento". `()` diz "número de argumentos não especificado" — herança
antiga. Com `()`, você pode chamar com argumentos e **compilar**, o que é erro. Use `(void)`.

**8. `sem_void(1,2,3)`**

Compila porque `()` não declara os parâmetros. Chama a função com argumentos que ela ignora —
**comportamento incorreto que o compilador não recusa**. `-Wstrict-prototypes` avisa.

**9. Variável não inicializada**

C **não** inicializa local automaticamente — porque isso custaria tempo em código de sistema. O
local contém o que estava na pilha, que é **lixo**.

**10. `%f` com `int`**

`printf` lê o argumento como `double`, que em x86-64 vai em registrador `xmm` — enquanto `int` foi
para registrador inteiro. Ele lê o **registrador errado**.

**11. `-Werror`**

Transforma aviso em erro. Você é **obrigado** a resolver — e resolver é onde o bug aparece.

**12. `gcc` e `clang`**

Porque avisam de coisas diferentes. `clang` é frequentemente mais rigoroso em UB e transbordo.

**13. `return 0`**

É o **código de saída** do processo. `0` = sucesso. Importa para script (`$?`) e CI.

---

## Módulo 2 — Ponteiro, array e memória

**1. Ponteiro é um número**

Um inteiro sem sinal que **é** um endereço. `sizeof(p)` é 8 porque em x86-64 todo endereço tem
64 bits.

**2. `&x` e `*p`**

`&x` = endereço de `x`. `*p` = valor no endereço em `p`. São **inversas**: `*(&x) == x`.

**3. Mapa de memória**

`.text` → `.rodata` → `.data` → `.bss` → heap → stack, em ordem crescente de endereço. Heap cresce
para cima, stack para baixo.

**4. Direção**

Heap cresce para **cima**; stack cresce para **baixo**. Confirmado com `/proc/<pid>/maps` e
comparando `&local` com `&heap`.

**5. Ordem na stack**

**NÃO é garantida pelo padrão.** O compilador reordena para alinhamento, e pode eliminar variáveis.
Você **mede**, não deduz.

**6. `sizeof(arr)` vs. `sizeof(p)`**

Array **sabe** o tamanho (20 para `int32_t[5]`); ponteiro **não** (8). O array decai para ponteiro
ao ser passado.

**7. `sizeof(arr)` dentro de função**

Parâmetro `int32_t arr[5]` é **idêntico** a `int32_t *arr` — o `5` é ignorado. Isso obriga a
**passar o tamanho junto**.

**8. `arr[2]` = `*(arr + 2)`**

O compilador soma `2 × sizeof(*arr)` = 8 bytes (para `int32_t`). A escala é `sizeof` do tipo.

**9. Regra do passo**

`ptr + n` anda `n × sizeof(*ptr)` **bytes**.

**10. `(char *)`**

Ponteiro para `char` tem passo de 1 byte — controle byte a byte. É o único tipo que pode apontar
para qualquer coisa (aliasing).

**11. `void *`**

Não tem `sizeof(*ptr)` definido — você não pode desreferenciar. Sem tipo, o passo é indefinido.

**12. Sem verificação de limite**

C não verifica porque seria custo em runtime, e a linguagem foi projetada para código de sistema
onde o custo importa. **Leitura e escrita** passam sem aviso.

**13. `char **saida`**

Permite a função **escrever no ponteiro do chamador** — "devolver" um ponteiro alocado junto com
código de retorno de erro. É o formato do `parse()` do curso de fuzzing.

**14. `argv[argc]` é `NULL`**

Garantido pelo padrão — é a **única** posição onde o C garante um terminador.

**15. Esquecer o `+1`**

Aloca `n` bytes para `n` chars mais o terminador. O `\0` é escrito **fora** do bloco. O `printf`
depois lê além do buffer.

---

## Módulo 3 — Alocação e duração de vida

**1. Escopo vs. duração**

Escopo = onde o **nome** é visível. Duração = quanto tempo a **memória** existe. Poder usar o nome
não significa que o dado está vivo.

**2. Quatro durações**

Automática (stack, morre ao sair do bloco) · estática (`.data`/`.bss`, fim do programa) · alocada
(heap, no `free`) · de thread (TLS).

**3. `static` local e global**

Local: sobrevive ao retorno (a variável é única, inicializada uma vez). Global: **visível só neste
arquivo** — é outra coisa com a mesma palavra-chave.

**4. `free` — o que faz e o que não faz**

Faz: devolve o bloco ao alocador. **Não faz:** não zera a memória, e **não invalida o ponteiro**.
`p` continua com o endereço, e o dado continua lá até ser reusado.

**5. UAF silencioso**

Porque o `free` não zera. Sem sanitizer, ler memória liberada **funciona** na maioria dos casos —
e o dado geralmente ainda é o antigo.

**6. Reuso em quatro passos**

(1) `malloc` → bloco B. (2) `free(p)` → B devolvido, `p` ainda aponta. (3) `malloc(mesmo tamanho)`
→ alocador devolve B, com dado controlado. (4) usar `p` lê o dado do novo dono.

**7. Quatro erros**

Não checar `NULL` · vazamento · `double free` · use-after-free. Nenhum gera aviso porque são
**runtime**, e o compilador não simula alocação.

**8. Mais perigoso**

**Use-after-free** — porque o bloco reutilizado pode conter dado controlado, o que dá controle de
fluxo quando há ponteiro de função.

**9. `malloc(0)`**

Caso especial: o padrão permite `NULL` **ou** um ponteiro válido. Trate antes de chamar.

**10. Contrato de posse**

Todo bloco tem um dono, e o dono libera. Três convenções: `criar_*` devolve posse, `mostrar_*`
empresta, `destruir_*` consome.

**11. Prefixo do nome**

Porque C não tem tipo que expresse posse. **Nome + comentário no cabeçalho** são a única
documentação.

**12. `const`**

Comunica "não vou modificar nem liberar". Não é garantia (C permite burlar via cast), mas é a
intenção declarada.

**13. `p = realloc(p, n)`**

Se o `realloc` falha, devolve `NULL` — e você **perdeu o ponteiro original**, que continua válido e
vazando. Use variável temporária.

**14. `calloc` e `realloc`**

`calloc` zera; `realloc` **não** zera a parte nova. Confirmado lendo os valores novos.

**15. Ordem de liberação**

**Ordem inversa da alocação.** Liberar o `struct` primeiro perde o ponteiro para o membro interno —
e vaza.

**16. Caminho de erro**

Porque se a segunda alocação falha, você precisa liberar a primeira. **Ninguém testa** porque só
acontece em memória escassa — ou seja, nunca no seu teste.

---

## Módulo 4 — String e limite ausente

**1. String não é tipo**

É **convenção**: array de `char` terminado em `'\0'`. Sem tipo, sem campo de tamanho, sem
verificação.

**2. `strlen` e `sizeof`**

`strlen(s)` **não** conta o `\0`. `sizeof("abc")` é **4** — conta.

**3. `{'a','b','c','d'}`**

Não tem `\0`. `strlen` nele **continua lendo** até achar um `\0` em algum lugar — resultado
indefinido.

**4. Cinco funções**

`strcpy` · `strcat` · `sprintf` · **`gets`** (removida no C11) · `memcpy`.

**5. `strncpy` sem NUL**

Se a fonte é **maior ou igual** a `n`, ele não coloca o `\0`. O destino deixa de ser string — e
qualquer função de string lê além.

**6. `strncpy` e campo fixo**

Projetado para campo de tamanho fixo em struct de sistema, onde o padding com NUL é desejado. Para
string, o padding é desperdício e a falta de NUL é bug.

**7. `snprintf`**

Devolve o quanto **teria** cabido. Se `retorno >= n`, truncou — e **verificar isso é obrigatório**.

**8. `strlcpy`**

Não é padrão — existe em BSD, não em glibc. Use função própria (`copia_string`) ou `snprintf` com
verificação de retorno.

**9. Conta correta**

`strlen(s) + 1` para guardar a string inteira.

**10. Sobrescrever o `\0`**

Transforma string válida em array de bytes — e a partir dali **toda** função de string lê além,
porque não sabe onde parar.

**11. `if (strcmp(a,b))`**

Porque `strcmp` devolve **0 para igual** — e `0` é **falso**. Então o `if` entra quando são
**diferentes**. A forma correta é `== 0`.

**12. `strcmp` 0 e `memcmp` ≠ 0**

`strcmp` para no `\0` — e os dois primeiros `abc` são iguais. `memcmp` compara os 4 bytes e vê a
diferença no quarto.

**13. `memcmp` e senha**

Ele para no primeiro byte diferente — o **tempo de execução** vaza quantos bytes estavam certos. É
*timing attack*. Comparação de segredo exige função de tempo constante.

**14. Truncar em silêncio**

Esconde o problema: o dado saiu errado e o chamador não sabe. Recusar é explícito.

**15. `>=` e não `>`**

Porque `n` chars precisam de `n + 1` bytes com o NUL. `n == dst_n` **não cabe**.

---

## Módulo 5 — Comportamento indefinido

**1. Quatro categorias**

Definido · não especificado · **indefinido** · dependente de implementação. **Indefinido** não
garante nada.

**2. Não especificado vs. indefinido**

Não especificado: há resultado válido, mas qual é livre. **Indefinido: não há resposta válida** — e
o compilador pode assumir que **nunca acontece**, eliminando o código que o trata.

**3. Eliminar código**

Porque UB "nunca acontece". Se `b + 1 < b` exige UB, o compilador assume que é **falso** — e remove
a verificação.

**4. Cinco famílias**

Aritmética · memória · estado · tipo · ambiguidade de sintaxe.

**5. `b + 1 < b`**

Em `-O0` a comparação roda e detecta. Em `-O2` o compilador prova que não pode ser verdade e
**remove o ramo**.

**6. Não é bug do compilador**

O padrão diz que a **expressão** é UB. O compilador está autorizado a assumir qualquer coisa sobre
código UB. O bug é de quem escreveu.

**7. Qual está certo**

**Os dois.** Cada um escolhe um comportamento válido para código cujo padrão não garante nada.

**8. Overflow sem sinal**

**Não é UB** — envolve de forma **garantida**. Importa para segurança porque o wrap é previsível, e
o compilador **não pode** eliminar a verificação.

**9. `-Wstrict-overflow=5`**

Avisa onde o compilador **assume** que não há overflow — isto é, onde ele vai otimizar sua
verificação para fora.

**10. `-fno-sanitize-recover=all`**

Faz o UBSan **abortar** em vez de avisar e seguir. Você quer isso para achar a causa raiz.

**11. Três que o UBSan não pega**

Ordem de avaliação · variável não inicializada (só MSan) · aliasing (parcial). ASan pega o acesso
fora do array.

**12. MSan**

Exige instrumentar **todo** o programa, incluindo libc — senão dá falso positivo. Por isso quase
ninguém usa, e a classe continua difícil.

**13. Aliasing estrito**

Só `char *` e `unsigned char *` podem apontar para qualquer tipo; todo outro ponteiro só aponta
para o próprio tipo. `char` é exceção porque é como se copia byte a byte.

**14. `memcpy` e cast**

`memcpy` copia **bytes**, sem acessar pelo tipo errado. O compilador otimiza `memcpy` pequeno para
leitura direta — **custo zero**.

**15. Verificação de soma**

```c
if (b > 0 && a > SIZE_MAX - b) { /* estoura */ }
```

**16. `-fwrapv`**

Faz overflow com sinal ser **definido** (envolve). É **extensão** do GCC/Clang, não do padrão — não
dependa em código portável.

**17. UB e vulnerabilidade**

Porque ele **remove a verificação** que você escreveu para se proteger. Um bug pequeno vira
corrupção explorável.

---

## Módulo 6 — As sete classes

**1. Sete classes**

Stack overflow · heap overflow · UAF · integer overflow · formato · `NULL` deref · off-by-one.

**2. Stack ou heap**

Muda **onde o buffer vive**, não o mecanismo. A correção é a mesma (verificar), a detecção é a
mesma (ASan), e a severidade é semelhante.

**3. Padrão de stack overflow**

Escrita em buffer local cujo tamanho **não foi comparado**. `strcpy`, `sprintf`, `memcpy` sem
verificação.

**4. Heap overflow**

A **conta da alocação** difere da **conta da escrita**. `malloc(len)` e escrever `2*len`.

**5. Três erros de contrato**

Ponteiro pendurado · donos múltiplos · retorno de ponteiro interno.

**6. `destruir(Objeto **)`**

Anula o ponteiro do chamador. Usar depois vira `NULL` deref — que o ASan pega **imediatamente**,
sem ambiguidade.

**7. Integer — dois comportamentos**

Com sinal: **UB**, e o UBSan pega. Sem sinal: **definido** (envolve) — e o UBSan **não** pega.
Por isso o `uint32_t` não protege.

**8. Verificação de multiplicação**

```c
if (b != 0 && a > SIZE_MAX / b) return -1;
```

**9. `%f` com `int`**

`printf` lê como `double`, que vai em `xmm` — enquanto o `int` foi para registrador inteiro. Lê o
registrador errado.

**10. `%s` com `int`**

Mais grave porque `printf` **interpreta o int como endereço** e tenta ler dali — é corrupção de
memória de verdade. É o vetor do format string clássico.

**11. `-Wformat=2`**

Ela compara o tipo de cada argumento com o formato. `-Wall` sozinho cobre só parte.

**12. `malloc` na classe 6**

Porque pode devolver `NULL`. Checar é obrigatório — e em `-O2` o compilador pode **remover** a
checagem, porque desreferenciar `NULL` é UB.

**13. Três formas de off-by-one**

`<=` em vez de `<` · `>` em vez de `>=` · esquecer o NUL.

**14. Off-by-one e ASan**

Porque o byte extra pode cair numa área alinhada do alocador, e o redzone não pega. **O `valgrind`
complementa.**

**15. Tabela vs. decorar**

Porque a tabela é **reconhecimento** — você olha o código e sabe a classe. Decorar dá o nome sem
dar a habilidade.

---

## Módulo 7 — Ferramentas

**1. Não rodam juntos**

ASan **substitui** o alocador e adiciona redzone; `valgrind` **emula** o processador e intercepta
tudo. Os dois juntos dão resultado confuso ou não rodam.

**2. Cobertura por caso**

ASan+UBSan: casos 1–5, 7. UBSan só: caso 4. `valgrind`: 1, 2, 3, 5, 7. **Caso 6 (não inicializada)**
exige MSan.

**3. Nenhum pega**

Variável não inicializada — só MSan com libc instrumentada.

**4. Uma ferramenta**

**ASan+UBSan** — cobre a maior parte, aponta a linha, e custa só 2×.

**5. Leitura do relatório**

`WRITE of size 21` na linha 18, bloco de 4 bytes alocado na linha 17. **O bug real é a linha 17** —
a alocação — e o `#0` mostra o sintoma.

**6. Três cadeias**

Onde foi **usado** (`#0`) · onde foi **liberado** (`freed by`) · onde foi **alocado**
(`previously allocated`).

**7. Bug real no UAF**

Na **relação** entre as três — o contrato de posse. Não na linha que usou.

**8. `WRITE` vs. `READ`**

Escrita **corrompe**; leitura vaza ou dá DoS. Escrita é mais grave.

**9. `info locals`**

Os **valores** das variáveis no momento do bug. **Valor** é o que o ASan não dá.

**10. Offsets**

`print &it->campo` para cada campo, e subtrair os endereços.

**11. `valgrind` sem recompilar**

Ele instrumenta o binário. Útil para código legado, build de produção, ou quando você não controla
as flags.

**12. `--track-origins=yes`**

Rastreia **de onde veio** o valor não inicializado. Muito lento, mas é o único que responde.

**13. Tipos de vazamento**

`definitely lost` · `indirectly lost` · `possibly lost` · `still reachable`.

**14. Pipeline**

Camada 1: `-Wall -Wextra -Wformat=2 -Werror`. Camada 2: `-fsanitize=address,undefined`. Camada 3:
`valgrind --leak-check=full --track-origins=yes`.

**15. Alvos fora do `-Werror`**

Porque têm **bug deliberado** — e o `-Werror` recusaria. O pipeline roda no código limpo.

**16. `--error-exitcode`**

Faz o `valgrind` **falhar o build** ao achar erro. É o que permite rodar em CI.

**17. Nem todo aviso é bug**

Mas corrigir todos **elimina a categoria** — e alguns falsos positivos são o preço de não perder o
aviso verdadeiro.

---

## Módulo 8 — Layout

**1. Padding**

Bytes inseridos para alinhar cada campo ao múltiplo do próprio tamanho.

**2. Regra**

Cada campo em offset múltiplo do próprio tamanho. **Tamanho total** múltiplo do **maior**
alinhamento.

**3. `char a; int b; char c;`**

`a` em 0; 3 bytes de padding; `b` em 4–7; `c` em 8; 3 bytes de padding final. `sizeof = 12`.

**4. Múltiplo do maior**

Para que `Struct s[2]` tenha o segundo elemento **alinhado** — sem isso, `long` no elemento 1
ficaria em offset não múltiplo de 8.

**5. Reordenar**

Reduz padding. **Não reordene** quando o layout é **serializado** — quebra compatibilidade binária
com arquivo salvo.

**6. `union`**

Campos **sobrepõem** o mesmo espaço. `sizeof` é o do **maior** membro.

**7. `union` e type confusion**

A mesma memória interpretada como tipos diferentes é o mecanismo. Em C++, o campo lido vira
**ponteiro de função** — e dá controle.

**8. `0x41424344`**

Em little-endian os bytes são `44 43 42 41` — ordem **invertida**.

**9. `memcpy` vs. `union`**

`memcpy` copia **bytes**, o que é definido. Punning via `union` **não é garantido** pelo padrão —
é extensão de GCC/Clang.

**10. `switch` sem `default`**

Valor fora do `enum` cai no código **depois** do switch, que pode não tratar o caso. `enum` em C é
inteiro sem verificação de faixa.

**11. `enum`**

**Não verifica faixa.** Valor vindo de arquivo pode ser qualquer coisa — valide antes.

**12. `-Wswitch` vs `-Wswitch-enum`**

`-Wswitch` avisa de `case` faltando **só se não houver `default`**. `-Wswitch-enum` avisa mesmo com
`default`.

**13. Validação de cabeçalho**

Magia, versão, faixa de `n_itens`, coerência do tamanho declarado, e se o corpo cabe — **nessa
ordem**.

---

## Módulo 9 — Arquivo e parsing

**1. Modo texto vs. binário**

Modo texto converte `\n` para `\r\n` em Windows — 6 bytes viram 8. Em Linux os dois são idênticos.

**2. Linux vs. Windows**

Porque Linux não tem tradução de fim de linha. Use `"rb"` sempre: ignorado em Linux, essencial em
Windows.

**3. `fseek`/`ftell`**

Falha para `stdin`, pipe e `/proc` — não têm tamanho. Nesse caso, leia em blocos até EOF.

**4. Contrato de `ler_arquivo`**

Em sucesso, `*saida` alocado e **quem chama libera**. Em falha, `*saida` é `NULL`. Seis códigos de
retorno.

**5. Sete verificações**

Buffer cabe o cabeçalho · magia · versão · faixa de `n_itens` · tamanho declarado bate · corpo
cabe · (implícita) multiplicação não estoura.

**6. Faixa antes da multiplicação**

Porque `n <= 1024` garante que `n * 16` não estoura. Invertendo, `0x40000000 * 16` estouraria — e a
verificação do resultado **não protege**.

**7. `memcpy` para ler campo**

O cast `(Cabecalho *)buf` assume **alinhamento** — UB se `buf` não estiver alinhado. `memcpy` lê
bytes e é definido.

**8. Cast de ponteiro**

Assumindo que `buf` está alinhado para `uint32_t`. É UB quando `buf` vem de `&dados[3]`, por
exemplo.

**9. `goto fim`**

Um único ponto de saída para limpeza. **Reduz** bug porque você não pode esquecer um `free` em um
dos vários caminhos.

**10. `buf = NULL`**

Transfere a posse. Sem isso, o `free(buf)` no `fim` libera o que você já devolveu — e o chamador
fica com ponteiro pendurado.

**11. `goto` e limpeza**

Porque em C, para limpeza, ele **elimina** a duplicação de `free`. É a exceção consagrada — como o
kernel Linux faz.

**12. `parse` que não aloca**

Sem alocação não há vazamento, não há contrato de posse, e não há estado. É o alvo ideal: puro e
determinístico.

**13. Quatro propriedades**

Lê de buffer · determinístico · rápido · tratamento de erro. **Tem as quatro.**

---

## Módulo 10 — C resistente

**1. Fronteira**

A linha entre dado controlado por você e dado externo. **Fora:** `argv`, `stdin`, arquivo, socket,
ambiente, resposta de rede.

**2. Retorno de `malloc`**

Porque pode **falhar** — e devolver `NULL`. É uma fronteira: valide.

**3. Regra 1**

Validar **uma vez, na fronteira**, em vez de repetir em cada consumidor — onde alguém vai esquecer.

**4. `memcpy` — duas superfícies**

A **origem** (precisa ter `n` bytes) e o **destino** (precisa caber `n`). Verifique as duas.

**5. Verificar o resultado**

Porque se a operação **estourou**, o resultado é um número **pequeno** — e passa no
`if (total > LIMITE)`.

**6. Verificação**

```c
if (tam != 0 && n > SIZE_MAX / tam) return -1;   /* multiplicação */
if (b > SIZE_MAX - a) return -1;                  /* soma */
```

**7. Três convenções**

`criar_*` (devolve posse) · `mostrar_*` (empresta) · `destruir_*` (consome).

**8. `liberar(Bloco **)`**

Permite **anular** o ponteiro do chamador — e aí usar depois é `NULL` deref, que o sanitizer pega
na hora.

**9. Flags por classe**

Classe 5 → `-Wformat=2`. Classe 4 → `-Wstrict-overflow=5`. Conversão → `-Wconversion`. `enum` →
`-Wswitch-enum`. **`-Werror`** para todas.

**10. `-Werror`**

Sem ele, você tem os avisos e **não os lê**. Com ele, é obrigado a resolver.

**11. `_FORTIFY_SOURCE`**

Troca funções de biblioteca por versões que verificam tamanho. Exige `-O1`+ porque depende da
análise de `__builtin_object_size`, que só roda com otimização.

**12. Confirmação no binário**

Porque a flag pode não fazer efeito. `readelf -s` mostra `__stack_chk_fail`; `readelf -l` mostra
`GNU_RELRO`.

**13. RELRO**

GOT somente-leitura após carga. Impede **sobrescrita de ponteiro de função** na GOT.

**14. ASan limpo**

**Não.** Significa "sem bug **que o ASan detecta**". Bug **lógico** (validação faltando, ordem
errada) passa por tudo.

**15. Bug lógico**

Porque ASan e `valgrind` detectam **corrupção de memória**, não regra de negócio. Ordem de
validação errada não corrompe nada — e passa.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Compila limpo | 30% | `-Werror` com todas as flags — zero avisos |
| Saída real | 30% | A saída do **seu** código, não exemplo |
| Explicação | 25% | Você entende por que funcionou (ou não) |
| Limitações | 15% | Declara o que não conseguiu e por quê |

**Penalidades automáticas:**

- Código que **não compila** com `-Werror`: −20%.
- Saída de exemplo em vez da real: −25%.
- Não identificar que uma classe **não está** no alvo (M6): −15%.
- Não distinguir **sintoma de causa** (M6, M7): −20%.
- Dizer que "ASan limpo" significa "sem bug": −20%.
- Parser do projeto final **alocando memória** (M11): −25%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| Estrutura | Um arquivo só | `src/` separado | `src/`, `fuzz/`, `test/` |
| Interface | Sem contrato | Códigos documentados | Nove códigos + convenção de posse |
| Validação | No uso, repetida | Na fronteira | Na fronteira, ordem correta, origem+destino |
| Alocação | Vaza no caminho de erro | Limpa em todos | **Nenhuma alocação** — elimina a classe |
| Harness | Não existe | Chama o parse | **Exercita o caminho de item** |
| Testes | Nenhum | Casos válidos | **Válidos + todos os de erro** |
| Corpus | Uma semente | Quatro fontes | **Sementes perto do limite** |
| Hardening | Sem flags | Flags aplicadas | **Confirmado no binário com `readelf`** |

**O item de maior valor:** a **hipótese de quebra** — a entrada que você acha que quebraria o
parser, com o raciocínio. É a semente da pesquisa que o curso de fuzzing formaliza.

---

*Material didático original. Bug provocado apenas em código próprio, na própria máquina.*
