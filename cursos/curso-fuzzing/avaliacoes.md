# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos doze módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — Memória, corrupção e o crash

**1. Mapa de memória**

`.text` (código) → `.rodata` (literais) → `.data` (globais iniciadas) → `.bss` (globais zeradas) →
**heap** (cresce para cima) → **stack** (cresce para baixo). Endereços crescentes.

**2. `-no-pie`**

Desabilita endereço aleatório, então os endereços do `objdump` coincidem com os de execução e o
mapa fica legível. Sem ele, cada execução dá endereços diferentes e comparar manualmente é
impossível. Em produção PIE é o padrão — o laboratório usa `-no-pie` só para aprender.

**3. Ordem das variáveis**

O compilador reordena para minimizar *padding* de alinhamento, e pode até eliminar variáveis. A
ordem do fonte **não** é a ordem na memória — e por isso o layout precisa ser **medido**, não
deduzido.

**4. Byte a byte até `depois`**

`strcpy` copia byte a byte a partir de `buffer[0]`, sem verificar limite. `buffer` tem 16 bytes;
com 17 bytes de entrada, o byte 17 vai para o primeiro byte de `depois` (que está em endereço
**maior**, porque a stack cresce para baixo). Com 20 bytes, os quatro bytes de `depois` ficam
`0x41414141`.

**5. Três desfechos**

Crash imediato (SIGSEGV) · crash tardio (corrompeu e quebra depois) · **silencioso** (corrompeu
variável vizinha e segue). O silencioso é o pior porque **ninguém descobre** — o programa
"funciona".

**6. `-fno-stack-protector`**

Desativa o canário, que detecta sobrescrita da pilha e aborta. Sem ele, o transbordo é detectado
antes de você ver a corrupção acontecer. O laboratório desativa para **ver** o mecanismo.

**7. `-O2`**

Otimização tira proveito de comportamento indefinido: pode eliminar a variável, reordenar campos,
ou remover código que o compilador prova inalcançável. O bug muda — ou desaparece. **Não é o
compilador consertando; é o C permitindo.**

**8. SIGSEGV**

Indica acesso a endereço inválido. **Não indica** que o bug está na linha do crash, nem que é
explorável. Ele mostra o **sintoma**, não a causa — que pode estar centenas de linhas antes.

**9. `-11` vs. `-6`**

`-11` = `SIGSEGV` (acesso inválido). `-6` = `SIGABRT` (abortado — canário, `free()` inválido,
asserção). Cada um aponta para classe diferente.

**10. Crash longe da corrupção**

O programa morre **onde usa** o dado corrompido, não onde o corrompeu. Implica que você precisa
**voltar** para achar a origem — é o módulo 11 (causa raiz).

**11. Endereço controlado**

`0x4141414141414141` significa que a entrada **controlou** o ponteiro → potencial de controle
alto. `0x0000000000000008` é desreferência de nulo com offset → controle baixo. **A distinção
determina a severidade** (módulo 9).

**12. `-g`**

Sem símbolo de debug não há nomes de variável, números de linha nem tipo. O `gdb` e o ASan ficam
inúteis — e o módulo 11 depende dos dois.

---

## Módulo 2 — Ambiente e sanitizers

**1. Sanitizer**

Ele intercepta cada acesso à memória e compara com os limites conhecidos do bloco. Onde o programa
seguiria corrompendo, ele **aborta com diagnóstico**. Transforma bug silencioso em falha ruidosa.

**2. Quatro sanitizers**

ASan (corrupção de memória) · UBSan (comportamento indefinido, integer overflow) · TSan (race
condition) · LSan (vazamento). **TSan e ASan são mutuamente exclusivos.**

**3. UBSan**

Pega aritmética — integer overflow, shift inválido, alinhamento. **ASan não pega**: não é acesso
fora de limite, é cálculo errado. E integer overflow **leva a** heap overflow, então UBSan pega o
**primeiro** erro e o ASan o **sintoma**.

**4. `-O1`**

`-O0` é fiel mas lento; `-O2` pode otimizar o bug para longe ou criar outro. `-O1` é rápido,
mantém a instrumentação funcional e os bugs visíveis.

**5. `-fno-omit-frame-pointer`**

Sem ele, o `gdb` não consegue percorrer a pilha e o backtrace vira `??`. O módulo 11 depende disso.

**6. `WRITE of size 8`**

Escrita de 8 bytes — mais grave que leitura. Escrita é o que corrompe; **leitura** pode vazar
informação ou dar DoS.

**7. `#0` vs. `allocated by`**

`#0` é **onde o acesso ilegal aconteceu** (o sintoma). `allocated by` é **onde o bloco nasceu**.
O **bug real** está entre os dois — tipicamente a ausência de verificação antes do acesso.

**8. `0 bytes to the right`**

Passou **imediatamente** o final do bloco. Menos grave que `100 bytes to the right` — mas escrita
de 1 byte fora do limite ainda corrompe.

**9. UAF**

Porque o bloco liberado pode ser **reocupado com dado controlado** antes do uso. Isso dá controle
de fluxo quando há ponteiro de função ou vtable no objeto.

**10. Integer → heap**

`n * 16` estoura `uint32` → `bytes` vira pequeno → `malloc` aloca pouco → o laço escreve `n*16`
bytes. **A correção está no cálculo**, não no `memcpy`.

**11. Instrumentação parcial**

Se a biblioteca não estiver instrumentada, o ASan não vê os acessos dentro dela — **falso
negativo**. Por isso a regra: instrumente o binário inteiro, ou use interceptação.

**12. Crash só com ASan**

Merece investigação porque o ASan **muda o layout da heap** (adiciona redzone, alocador diferente).
O bug pode não se manifestar em produção. **Não significa que não seja bug** — significa que o
reporte precisa declarar.

**13. Velocidade sem detecção**

O `parser-plain` **não acha** o bug (o passo 2 do lab prova). Rodar 10× mais rápido sem detectar é
chegar mais rápido a lugar nenhum.

---

## Módulo 3 — Anatomia de um bug

**1. Cinco classes**

Stack overflow · heap overflow · use-after-free · integer overflow · type confusion. As duas
últimas **raramente são o dano final** — são o caminho para as três primeiras.

**2. Por que não são dano final**

Integer overflow sozinho não corrompe nada; ele **gera** alocação pequena que leva a overflow.
Type confusion também: o dano acontece quando o campo é **usado** com o tipo errado.

**3. Stack overflow**

`push rbp` → `mov rbp, rsp` → `sub rsp, N`. Variáveis locais em `[rbp-N]`. O endereço de retorno
está em **endereço maior** que os locais — por isso transbordo grande o atinge.

**4. Reordenar**

O compilador agrupa por alinhamento e pode mover variáveis para reduzir *padding*. Também pode
**eliminar** a variável se o endereço nunca for tomado.

**5. Entrada curta**

Com `len` pequeno, o bloco alocado pode ter redzone maior que o excesso — e o ASan não detecta o
acesso. O dano existe, a **detecção** depende do tamanho. **Por isso o corpus precisa de sementes
de vários tamanhos.**

**6. UAF vira controle**

(1) `malloc` → bloco B. (2) `free(o)` → B devolvido, ponteiro `o` ainda aponta para B.
(3) `malloc(tamanho_controlado)` → alocador devolve B **com dado do atacante**. (4) `o->processar()`
→ chama o que está em B.

**7. ASan e UAF**

Ele não devolve o bloco ao sistema — **envenena**. Qualquer acesso a memória envenenada dispara.
Sem ASan, o acesso a memória liberada é **silencioso** na maioria dos casos.

**8. Três cadeias**

Onde foi **usado** (`#0`) · onde foi **liberado** (`freed by`) · onde foi **alocado**
(`previously allocated by`). A causa está na **relação** entre as três — no contrato de posse.

**9. Integer → heap**

`bytes = n_itens * 16` estoura → `bytes` pequeno → `malloc(bytes)` aloca pouco → laço escreve
`n_itens * 16`. UBSan aponta a **multiplicação**; ASan aponta a **escrita**.

**10. Duas linhas**

UBSan: a multiplicação (linha 11 no exemplo). ASan: a escrita (linha 18). O **bug real é a
multiplicação** — é ali que a correção deve entrar.

**11. `(size_t)` não resolve**

Porque a multiplicação acontece **antes** da atribuição, no tipo dos operandos. Se `n_itens` é
`uint32`, a multiplicação é em 32 bits e estoura antes do cast. **A correção certa é checar antes:**
`if (n_itens > SIZE_MAX / 16) return NULL;`

**12. Type confusion**

Frequente porque C++ com herança e `reinterpret_cast`/`static_cast` cego é onipresente em parser de
documento. CFISan detecta chamada virtual que não corresponde ao tipo real — e exige **LTO**.

**13. Regressão válida**

Precisa provar **os dois lados**: falha no código **com** bug, e passa no corrigido. Um teste que
só roda no código novo não protege contra reintrodução.

**14. UAF e regressão**

Porque o binário com bug **não crasha sem ASan** — só o sanitizer detecta. O teste de regressão
precisa rodar **com ASan** para valer.

---

## Módulo 4 — Harness

**1. Harness**

A função que o fuzzer chama para cada entrada. É o gargalo porque **quando o fuzzer não acha, o
harness é a causa em 8 de 10 casos** — não a ferramenta, não o alvo.

**2. Cinco erros**

Não chama o alvo (0 crashes) · ignora parte da entrada (cobertura estagnada) · **estado não
reinicializado** (crash não reproduzível) · vaza memória (OOM) · lento (poucas exec/s).

**3. Estado residual**

O mais insidioso porque o crash **não reproduz** ao rodar a entrada sozinha. Você perde horas
investigando um bug que é do harness. Detecta-se rodando a entrada isolada.

**4. Não pré-processar**

Porque o fuzzer precisa aprender o formato sozinho — com ajuda do **corpus**. Se você injeta o
`magic` no harness, o fuzzer nunca exercita o caminho onde o `magic` é inválido, que também tem
código.

**5. Guarda de tamanho máximo**

Sem limite, o fuzzer gera entradas de vários MB, o alvo gasta segundos processando, e você faz 0,5
exec/s em vez de 5.000. O `if (size > LIMITE) return 0;` multiplica a produtividade.

**6. Arquivo por chamada**

Porque escrever e ler arquivo tem custo de I/O a cada execução — e o libFuzzer faz 100.000 exec/s,
onde I/O destruiria a taxa.

**7. Refactor**

Separar `parse_de_buffer(buf, len, saida)` de `parse_de_arquivo(caminho)`. A primeira é fuzzável em
memória (rápida); a segunda é wrapper fino. É contribuição real porque é **o requisito de entrada
no OSS-Fuzz**.

**8. Três níveis**

Processo por entrada (~500–2.000 exec/s, `fork`+`exec`) · fork server (~5.000–20.000, só `fork`) ·
**in-process** (~50.000–500.000, sem `fork`). O ganho é 100×.

**9. Cobertura não sobe**

Harness não chama o alvo — ou a semente é inválida e o alvo rejeita antes de qualquer código
interessante.

**10. Crash não reproduz**

Estado residual no harness. Reinicialize todo o estado global a cada chamada.

**11. Cobertura 100%, zero crash**

(1) O alvo não tem bug alcançável — resultado legítimo. (2) O bug está atrás de validação que o
fuzzer não atravessa (checksum, tamanho). (3) O caminho não está instrumentado.

**12. "Não achei"**

É resultado legítimo quando sustentado por **cobertura alta e documentada**, tempo suficiente,
corpus adequado. É competência declarar — e o módulo 9 formaliza.

**13. "Parece funcionar"**

Porque você **não desconfia** dele. O `ruim1` (não faz nada) mostra cobertura zero e você conserta
na hora. O `ruim2` (exclui entradas) compila, roda, tem cobertura — e exclui justamente o caminho
do bug.

---

## Módulo 5 — Corpus e dicionário

**1. Corpus decide**

Porque o fuzzer coverage-guided só encontra o que está a **poucas mutações** do que você deu. Se a
semente nunca chegou perto do caminho, ele não chega.

**2. Quatro verificações**

Com `"AAAA"`, o fuzzer precisa descobrir `FMT1` por mutação aleatória — 2^32 combinações. Em tempo
útil, **não acontece**. Com `"FMT1"` na semente, ele chega em minutos.

**3. Quatro fontes**

Arquivo real (baixo esforço, melhor) · documentação do formato · saída do próprio alvo · síntese a
partir da spec (alto esforço).

**4. Arquivo real**

Tem a estrutura válida completa, então o fuzzer muta **dentro** do formato. Cuidado: pode conter
**dado sensível** — sanitize, ou use arquivo de teste público.

**5. Dicionário**

Lista de tokens que o fuzzer **injeta** nas mutações. Resolve o `magic` porque testa o valor exato
em vez de tentar adivinhar byte a byte.

**6. Dicionário não resolve**

Checksum · tamanho que precisa bater · formato aninhado · validação semântica · **criptografia**
(intratável). O que resolve: harness que corrige o campo, ou grammar-based.

**7. Checksum**

Recalcule o campo no harness antes de chamar o alvo. **Declare obrigatoriamente** que o bug pode
não ser alcançável com entrada real — porque você contornou a verificação.

**8. Semente perto do bug**

Porque reduz a distância de mutação até o caminho do bug a poucos bytes. **Não é trapaça:** você
usa conhecimento do **formato**, não do **bug**.

**9. Formato vs. bug**

Conhecer o **formato** = saber que existe um campo `num_itens` de 16 bits. Conhecer o **bug** =
saber que `num_itens = 8` causa overflow. **O primeiro guia a semente; o segundo seria fabricar o
achado.**

**10. Estagnou em 30%**

Você sabe que **70% do alvo não é tocado**. Ação: adicionar sementes que exercitem as partes não
cobertas — com base no código, não por tentativa.

**11. Cobertura oscilando**

Estado residual: a mesma entrada produz cobertura diferente entre execuções, porque algo persiste
entre chamadas. Reinicialize no harness.

**12. `-merge=1`**

Reduz o corpus mantendo a **mesma cobertura**. Menos entradas = menos tempo por ciclo = **mais
execuções por segundo** = mais chance de achar.

**13. Merge depois**

Porque durante a campanha você quer as entradas **novas** que o fuzzer descobre. Reduzir no meio
descarta sementes que ainda estão sendo exploradas.

---

## Módulo 6 — AFL++

**1. Instrumentação**

Injeta marcação em cada bloco básico, gravando em bitmap o caminho percorrido. Sem ela, o fuzzer
cai para **mutação aleatória pura** e perde a razão de existir.

**2. Modos**

`afl-clang-fast` (LLVM PCGUARD, rápido) · `afl-clang-lto` (mais rápido) · `afl-gcc-fast` (médio) ·
`afl-clang`/`afl-gcc` (assembley, lento) · QEMU (binário-só, muito lento).

**3. Reaproveitar harness**

Porque `LLVMFuzzerTestOneInput` é o padrão de fato — documentado no libFuzzer e suportado pelo
AFL++ via `afl_driver`. **Escreva uma vez, use nos dois fuzzers.**

**4. `afl-cmin`**

Roda todas as sementes, vê quais depositam **caminhos distintos**, e mantém só essas. Redução típica
de 50–80%. Sem ele, o fuzzer gasta tempo testando sementes redundantes todo ciclo.

**5. Campo diagnóstico**

**`stability`**. Se `< 100%`, a mesma entrada produz cobertura diferente — estado residual ou
aleatoriedade. Abaixo de 95%, o fuzzing está degradado e você conserta o harness primeiro.

**6. Modelos**

Master/secondary (tradicional) · main/secondary (AFL++ 4.x, com sincronização automática). O 4.x
prefere main/secondary.

**7. Mesmo `-o`**

Porque é assim que as instâncias **compartilham corpus**. Com `-o` diferente, você tem N campanhas
isoladas — nenhuma aproveita o que as outras descobriram.

**8. Quantas instâncias**

Uma por núcleo **físico**. Mais que isso competem por CPU e não ganham.

**9. Persistent mode**

O processo **não morre** entre entradas. Ganho típico de **10× a 50×** — de ~2.000 para ~50.000+
exec/s.

**10. Quatro regras**

Estado reinicializado · nada de `exit()` no laço · `__AFL_LOOP(N)` com N razoável · **vazamento
zero por iteração**. A última quebra campanha longa: 100 bytes × 10.000 iterações × 8 processos.

**11. Vazamento em persistent**

Com 10.000 iterações, 100 bytes por chamada = 1 MB por processo. Com 8 processos e horas de
campanha, esgota a memória.

**12. Cobertura alta, zero crash**

(1) Sem bug alcançável — resultado legítimo. (2) Bug atrás de validação. (3) Caminho não
instrumentado.

**13. Distinguir**

Compare o `showmap` da semente que chega perto do bug com o da semente ruim. Se a diferença for
**zero**, o problema é o corpus. Se for grande e não há crash, o problema é mais profundo.

---

## Módulo 7 — libFuzzer e CI

**1. Diferença arquitetural**

libFuzzer roda **in-process** (sem `fork`, sem `exec`). AFL++ usa **fork server** (cria processo
por entrada, mas sem `exec`).

**2. Velocidade e custo**

Rápido porque não gasta tempo criando processo. O custo: se o alvo **morre**, o fuzzer morre — e
estado global residual acumula.

**3. Cinco opções**

`-max_total_time` (limite de tempo) · `-rss_limit_mb` (memória) · `-max_len` (tamanho de entrada) ·
`-dict` (dicionário) · `-seed` (reprodutibilidade) · `-jobs`/`-workers` (paralelismo).

**4. `-fork=N`**

Roda em processo separado: **mais lento**, mas sobrevive a `exit()` e a vazamento acumulado. Use
quando o alvo tem estado que você não consegue limpar.

**5. Cinco execuções**

Se o crash não acontecer nas cinco, ele é **flaky** — provavelmente estado residual, dependência de
memória ou de tempo. **Crash flaky não é reportável.**

**6. Mesmas flags**

Link inconsistente = detecção parcial. Se o alvo não tem ASan e o harness tem, os acessos no alvo
não são interceptados.

**7. `$LIB_FUZZING_ENGINE`**

Fornecido pelo ambiente do OSS-Fuzz. Resolve para o engine de fuzzing na imagem deles — você **não**
linka libFuzzer diretamente.

**8. `primary_contact`**

É para onde os bugs são reportados. Endereço que não lê = bugs sem resposta = projeto removido por
inatividade. E `auto_ccs` com mais de uma pessoa evita perda quando alguém sai da equipe.

**9. Requisitos**

Projeto de código aberto com licença OSI · alvo fuzzável · harness `LLVMFuzzerTestOneInput` ·
`build.sh` · `project.yaml` · corpus inicial (opcional).

**10. Etapa de falha**

Sem ela, o CI passa mesmo com crash — e o fuzzer vira decoração. **Fuzzing no CI só serve se falhar
quando acha.**

**11. `schedule` com cron**

Porque fuzzing é **acumulativo**: cada madrugada adiciona corpus. Um projeto que fuzza há um ano
encontra bug em minutos, porque já conhece os caminhos.

**12. Persistir corpus**

Porque o corpus é a **memória** do fuzzing. Sem persistir entre execuções, cada uma começa do zero
— e você perde toda a vantagem de fuzzing contínuo.

**13. Cinco dimensões**

Velocidade (libFuzzer) · robustez (AFL++) · alvo binário-só (AFL++) · integração CI (libFuzzer) ·
paralelismo (AFL++).

**14. Os dois**

Porque o harness é o **mesmo arquivo** e o corpus é **compartilhado**. Rodar os dois é o que
projeto maduro faz — cada um cobre a fraqueza do outro.

---

## Módulo 8 — Protocolo e estado

**1. Três complicações**

A **estrutura** importa (aleatoriedade não chega ao parser) · o **estado** importa (mensagem 3
depende de 1 e 2) · a **resposta** importa (o cliente reage).

**2. Mutação aleatória**

Porque a chance de produzir mensagem **válida na etapa certa** é praticamente nula. Sem `HELLO`
antes, o servidor rejeita a `SET` — e a mutação nunca chega ao código que importa.

**3. `connect(A, B)`**

Encadeia: B só é enviada **depois** de A. Mantém a sessão válida entre as mutações — sem isso,
cada mensagem vai isolada e é rejeitada.

**4. `s_string` sem `max_len`**

O `boofuzz` gera strings de vários comprimentos, inclusive longos — o que exercita o `strcpy` sem
limite. Com `max_len` curto, você nunca chega ao tamanho que dispara o bug.

**5. Bom e ruim**

**Bom:** cadeia linear (HELLO→SET→GET). **Ruim:** estado paralelo, dependência de tempo,
dependência cruzada entre conexões, sessão autenticada complexa.

**6. Estado paralelo**

Porque as combinações **explodem** — não há uma sequência válida única para fuzzar. O espaço de
estado cresce combinatório.

**7. Quatro abordagens**

Um estado por vez (sobe o servidor no estado) · **fuzzar o parser isolado** (mais eficaz) · replay
de sessão com mutação · gramática de estado.

**8. Parser isolado**

Porque elimina rede, sessão, máquina de estado e `fork` — e o bug está no **parser**, não no
transporte. Você vai de centenas para dezenas de milhares de exec/s.

**9. O que se perde**

Máquina de estado · autorização · concorrência. **Perde pouco**, porque o fuzzing pela rede também
não acha bem essas classes.

**10. Não acha bug lógico**

Porque sanitizer detecta **corrupção de memória**, não lógica de negócio. Autenticação furada não
corrompe nada — e não há sinal para o fuzzer detectar.

**11. Três classes**

Bug lógico · race condition entre conexões · dependência cruzada. Também: timing, criptografia.

**12. Servidor morre**

Porque com ASan o processo **aborta** no crash. A campanha precisa reiniciar o servidor — o
`boofuzz` tem `restart_sleep_time` para isso.

**13. Declarar no reporte**

O que foi fuzzado (parser da mensagem X) e o que **não** foi (máquina de estado, autorização,
concorrência). Declarar o escopo da cobertura é parte do reporte honesto.

---

## Módulo 9 — Triagem

**1. 500 ≠ 500**

Um bug gera centenas de crashes: o fuzzer muta a entrada de formas diferentes e cada mutação que
atinge o mesmo `memcpy` produz um arquivo. O ratio (125:1 no exemplo) mostra a redução.

**2. Cinco critérios que falham**

Nome do arquivo · hash · tamanho · sinal (`SIGSEGV`) · **endereço literal**. Cada um agrupa errado:
entradas diferentes com o mesmo bug, ou o mesmo bug com entradas diferentes.

**3. Endereço literal**

Porque o **endereço muda** entre execuções (ASLR, heap diferente). Deduplicar por endereço dá 500
grupos de 1.

**4. Pilha normalizada**

Remove endereços, mantém `função + arquivo:linha`. Dois crashes com a mesma pilha normalizada são o
mesmo bug com alta probabilidade — porque a **linha** é estável e o **endereço** não.

**5. Pilha inteira vs. `#0`**

Pilha inteira pode ser **específica demais** (caminhos diferentes para o mesmo bug). Só `#0` pode
ser **genérico demais** (função grande com dois bugs). Top-3 é o ponto doce.

**6. Limitação**

Deduplicação por pilha é **heurística** — dois bugs em funções diferentes podem ter `#0` e `#1`
iguais. Detecta-se **lendo o código**, e é por isso que a triagem tem etapa manual.

**7. Árvore de severidade**

(1) Crash sem ASan? (2) Endereço controlado? (3) Escrita ou leitura? (4) Quantos bytes fora?
(5) Alcançável em produção?

**8. Endereço controlado**

Porque significa que a **entrada controlou o ponteiro** — potencial de controle de fluxo. Isso
move de "DoS" para "execução de código" na classificação.

**9. Controlado vs. não**

Controlado: `0x4141414141414141` (o `AAAA` da entrada) → potencial **alto**. Não controlado:
`0x0000000000000008` (desreferência de nulo com offset) → potencial **baixo**.

**10. UAF vs. vazamento**

UAF é **crítica** (controle via memória reocupada). Vazamento é **baixa** (DoS por esgotamento).
A diferença é se há **controle** sobre o que acontece.

**11. Sem ASan**

Se o bug só aparece com ASan, ele pode não se manifestar em produção (o layout da heap é
diferente). **Declara-se isso**, não se omite — e a severidade cai.

**12. Seção obrigatória**

Porque "500 → 4" sem dizer o que ficou de fora é incompleto. Quantos crashes só com ASan, quantos
timeouts não investigados, quantos vazamentos, quais caminhos não cobertos.

**13. A linha**

Você determina **se** há controle e **por que** — o que é necessário para classificar severidade.
Você **não** constrói payload, não calcula offset, não arma exploit.

---

## Módulo 10 — Minimização

**1. Quatro razões**

Mantenedor vê qual campo causa · depurador legível · correção verificável · **vira teste de
regressão** (a decisiva).

**2. Revela o bug**

Ao remover bytes e ver o crash persistir, você descobre **qual campo importa** — e caminha direto
para a causa raiz.

**3. `afl-tmin` vs. `-minimize_crash`**

`afl-tmin` reduz por **cobertura/caminho**; o libFuzzer por **número de bytes**. Teste os dois e
fique com a menor.

**4. `afl-tmin -e`**

Preserva a **execução** (não o crash). Útil para minimizar a entrada que chega ao código, quando
você quer estudar o caminho.

**5. Erro mais comum**

Reduzir até "algum crash" em vez do **seu** bug. Detecta-se comparando a **assinatura** da entrada
original com a minimizada.

**6. Reduzir até "algum crash"**

Porque você pode trocar de bug — achar que minimizou quando na verdade mudou de problema. O relatório
aponta o bug errado.

**7. Mesma assinatura**

Compara `ERROR: AddressSanitizer` + frame `#0` da original e da minimizada. Se diferirem, o
`afl-tmin` trocou de bug.

**8. Cinco execuções**

Porque crash flaky varia entre execuções. Flaky vem de estado residual, dependência de memória
(endereço às vezes válido) ou de tempo.

**9. Três causas**

Estado residual → reinicializar no harness · dependência de memória → investigar alocador ·
dependência de tempo → remover a dependência.

**10. Não reportável**

Porque o mantenedor não consegue reproduzir. O reporte é descartado — e você perde credibilidade.

**11. Seis arquivos**

`entrada.bin` · `SHA256SUMS` · `build.sh` · `comando.txt` · `relatorio-asan.txt` · `README.md`. O
`build.sh` é essencial porque sem ele o mantenedor gasta uma hora descobrindo como compilar — e
isso atrasa a correção.

**12. Commit**

Porque o projeto muda. Sem o hash, o mantenedor não sabe sobre qual código o bug existe — e pode
não reproduzir.

**13. Estagna**

Quando o byte removido **importa** (é a informação). Cabe redução manual guiada, ou minimizar só o
corpo.

**14. Código de saída**

Testa por `returncode != 0` porque é mais rápido que parsear a mensagem. **Cuidado:** pode trocar
de bug (qualquer crash serve) — então rode o teste de mesma-assinatura depois.

---

## Módulo 11 — Causa raiz

**1. Sintoma, causa, crash**

Exemplo: causa na linha 32 (verificação ausente) · sintoma na 34 (o `memcpy`) · crash na 52 (onde o
dado corrompido é usado).

**2. Corrigir o sintoma**

Porque a **origem** continua sem verificação. Corrigir a causa elimina **a classe**; corrigir o
sintoma elimina **a instância**.

**3. A pergunta**

"**Qual verificação, se existisse, teria impedido esta entrada de chegar aqui?**"

**4. Seis passos**

(1) O crash (`bt`) (2) Estado das variáveis (3) Instrução da falha (4) Pelo ASan (5) Rastrear ao
ponto de decisão (6) Provar a causa.

**5. `rip`**

Aponta a **instrução** exata — mais preciso que o número de linha, especialmente com otimização.

**6. ASan vs. `gdb`**

ASan: tipo exato, linha, tamanho do acesso, quem alocou. `gdb`: **valores das variáveis** naquele
momento. Nenhum dá o que o outro dá.

**7. Dividir o trabalho**

Porque nenhuma ferramenta dá tudo. ASan diz **onde e o quê**; `gdb` diz **com que valores**;
disassembly diz **como chegou**.

**8. Quatro testes**

(1) Crash existe (2) Correção resolve (3) Uso legítimo preservado (4) **Limite numérico**. O quarto
é o mais valioso porque dá o **número** — a informação que o mantenedor precisa.

**9. Uso legítimo**

Descarta que a correção foi **restritiva demais** e quebrou funcionalidade.

**10. `(size_t)`**

Sem ele, a multiplicação em tipo menor pode estourar — e você **reintroduz** o bug do módulo 3,
classe 4.

**11. Causa em várias linhas**

Crash em biblioteca (a causa está no **chamador**) · UAF com múltiplos donos (o bug é no
**contrato de posse**).

**12. `watchpoint`**

Dispara quando o **valor muda**. Responde "**quando** isso mudou" — pergunta que nem ASan nem
backtrace respondem. Essencial para corrupção tardia.

**13. `-O0` e `-O1`**

`-O0` para **entender** (fiel ao fonte, variáveis com valor real). `-O1` para **confirmar** que o
bug existe em build representativo de produção.

**14. Não persiste em `-O1`**

Investigar antes de reportar: pode ser que o bug dependa de layout específico. **Declarar** no
reporte que não reproduz em `-O1` — e não reportar como se fosse bug confirmado.

---

## Módulo 12 — Do achado ao reporte

**1. Patch errado**

Corrigir o `memcpy` resolve **aquela** entrada. O patch certo verifica **antes do laço** — o que
vale para qualquer entrada e elimina a classe.

**2. Origem e destino**

São duas superfícies distintas: a **entrada** (buffer de origem) e o **buffer de destino**. Um
`memcpy` pode ser seguro quanto à origem e inseguro quanto ao destino.

**3. `sizeof`**

Sobrevive à mudança de tamanho do buffer. Literal `64` quebra se o buffer virar 128.

**4. `(size_t)`**

Sem o cast, a multiplicação acontece no tipo dos operandos (possivelmente 32 bits) e pode estourar
antes da atribuição — reintroduzindo o bug.

**5. Regressão válida**

Precisa **falhar no código com bug** e **passar no corrigido**. Sem a primeira metade, não protege
contra reintrodução.

**6. Regressão + fuzzing**

Regressão garante que **aquele** bug não voltou. Fuzzing garante que **nenhum** bug novo apareceu.
Cobrem coisas diferentes.

**7. Quatro flags**

`-D_FORTIFY_SOURCE=2` (transbordo em funções conhecidas) · `-fstack-protector-strong` (stack) ·
`-fPIE -pie` (endereços) · `-Wl,-z,relro,-z,now` (GOT/PLT).

**8. Irmãos**

Porque quem escreveu um `memcpy` sem verificação tende a escrever outros. Reportar os irmãos junto
é o que faz o patch ser **completo**.

**9. Cinco elementos de aceitação**

Reprodução em **um comando** · **causa raiz correta** · impacto **realista** · anexos completos ·
**declaração do que não foi testado**.

**10. Quatro erros de rejeição**

Severidade inflada · causa raiz errada · sem entrada anexada · **reivindicar exploração não
demonstrada**.

**11. Reivindicar exploração**

Porque é **verificável** — o mantenedor tenta reproduzir e não consegue. O correto: "escrita fora do
limite em heap; endereço não controlado nesta configuração; **potencial de execução não foi
avaliado**".

**12. Divulgação responsável**

Reportar em canal privado (dia 0) → confirmação (0–7 dias) → correção (até 90 dias) → publicação
(após o patch, ou 90 dias).

**13. Issue pública**

Porque é divulgação **imediata** — todos os usuários ficam expostos antes do patch. Use **security
advisory** ou e-mail de segurança.

**14. Quatro barreiras**

Checksum (harness corrige) · formato aninhado (**grammar-based**) · validação semântica
(*structure-aware*) · criptografia (**intratável**).

**15. Declarar**

Que o harness **contornou** a verificação, então o bug pode **não ser alcançável** com entrada real
— e a severidade é menor.

**16. Fluxo fuzzing + simbólica**

Fuzzing acha caminho A mas não atravessa a validação V → converte corpus para `.ktest` com
`ktest-gen` → execução simbólica resolve V e dá o input que passa → alimenta o fuzzer, que agora
explora o que há depois.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Alvo compilado e reproduzível | 30% | O comando funciona, a evidência está anexada |
| Evidência real | 25% | Saída do ASan, do fuzzer, do `gdb` — não exemplo |
| Interpretação | 25% | Lê o resultado corretamente, inclusive o negativo |
| Limitações | 20% | Declara o que não conseguiu fazer e por quê |

**Penalidades automáticas:**

- Saída de exemplo em vez da saída real do seu alvo: −25%.
- Alvo sem `-g`: −10% (o módulo 11 fica impossível).
- Crash reportado sem teste de reprodução: −20%.
- Fuzzing contra alvo que não é seu: **lab zerado**.
- Servidor escutando em `0.0.0.0` em vez de `127.0.0.1`: **lab zerado**.
- Reporte reivindicando exploração não demonstrada: −25%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| Alvo | Copiado do material | Próprio, com bug | Próprio + harness + corpus construído |
| Harness | Não chama o alvo | Chama corretamente | Chama, limpa estado, mede velocidade |
| Corpus | Uma semente | Quatro fontes | Sementes **perto do bug** + dicionário |
| Campanha | Rodou uma vez | Paralela, com `cmin` | Paralela + persistent mode com ganho medido |
| Triagem | Lista de crashes | Deduplica | **Ratio calculado** + severidade por critério |
| Minimização | Sem minimizar | `afl-tmin` | `afl-tmin` + redução manual + **mesma assinatura** |
| Causa raiz | Aponta o sintoma | Aponta a linha | **Separa causa de sintoma**, com prova dupla |
| Reporte | Descreve o crash | Reporte completo | **Comando único** + declaração do não testado |

**O item de maior valor em todo o curso:** a capacidade de dizer **"não achei, e aqui está a
evidência de que procurei"** — com cobertura medida, tempo suficiente e corpus adequado. Isso separa
quem usa ferramenta de quem entende o método.

---

*Material didático original, de propósito defensivo e de pesquisa. Todo alvo é compilado pelo aluno.
Nenhum material que ensine armar exploit ou atacar alvo de terceiro.*
