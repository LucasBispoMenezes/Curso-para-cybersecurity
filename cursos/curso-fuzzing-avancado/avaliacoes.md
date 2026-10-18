# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos doze módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — O que o fuzzing é, e o que não é

**1. O que o fuzzer é**

**A instalação e a mutação.** **`afl-fuzz -i in -o out ./alvo` e ele roda.**

**2. O que ele não é**

**A escolha do alvo, o harness, o corpus e o oráculo.** **Ele não sabe onde olhar.**

**3. Os cinco elementos**

**O alvo** · **o harness** · **o corpus** · **a mutação** · **o oráculo**.

**4. Quais vêm prontos**

**Só a mutação.** **Os outros quatro são seus** — **três deles explicitamente.**

**5. Quantos são seus, e por que isso define o curso**

**Três dos cinco.** **Porque o fuzzer resolve uma coisa só** — **e é a razão de isto ser um curso, e
não uma instalação.**

**6. O que acontece com corpus ruim**

**O fuzzer roda, a cobertura cresce um pouco, e nada aparece** — **porque a mutação nunca produziu
entrada válida o bastante.**

**7. Por que o corpus ruim é silencioso**

Porque **ele não gera erro.** **O fuzzer "funciona"** — **ele só não chega ao código.**

**8. O que acontece com oráculo fraco**

**Só acha o que crasha** — **e a maioria dos bugs não crasha.**

**9. O que acontece sem triagem**

**200 crashes e nenhum bug** — **porque o trabalho de separá-los não foi feito.**

**10. Qual recurso é barato, qual é caro**

**CPU é barato — alugável.** **Tempo de analista não é.**

**11. Por que mais CPU rende pouco**

Porque **ela multiplica crashes, não bugs** — **e o gargalo está na triagem.**

**12. O que mais CPU multiplica junto**

**O trabalho de triagem.** **E ele já é o gargalo.**

**13. O maior ganho disponível**

**O oráculo.** **Porque ele muda **o que está sendo buscado**, não a velocidade.**

**14. O que um fuzzer por crash acha**

**Segfaults.** **Um por diferencial acha bugs de lógica.**

**15. Por que CPU é alugável**

Porque **você compra mais núcleos** — **e o julgamento continua sendo seu.**

**16. As seis pastas**

**`alvos/`** · **`harness/`** · **`corpus/`** · **`crashes/`** · **`triagem/`** · **`caderno/`**.

**17. Por que o alvo se compila com sanitizer**

Porque **sem ele, o fuzzer acha o que crasha; com ele, acha o que está errado.**

**18. O que o harness nunca faz**

**Não valida antes de passar** — **porque validar no harness é validar **antes** do alvo, e o
caminho nunca é exercitado.**

**19. O que o README de `triagem/` lista**

**Timeout** · **OOM controlado** · **assert do harness** · **entrada inválida rejeitada** — **todos
como "não é bug".**

**20. O critério de escolha do alvo**

**Entrada estruturada** (o mais importante) · **fonte disponível** · **pequeno** · **já teve bugs** ·
**harness fácil** · **não é serviço de rede.**

**21. Por que não fuzzar servidor de rede**

**Não é por técnica — é por escopo.** **Fuzzar rede significa mandar entradas a um socket, e um
socket pode ser remoto.**

**22. O que saber antes de construir o corpus**

**Os campos e as fronteiras.** **Sem eles, não há corpus de fronteira.**

---

## Módulo 2 — Escolher o alvo

**1. Por que a maioria do código não tem bug alcançável**

Porque **a maioria do código não tem bug** — **e escolher alvo estéril é falha da escolha.**

**2. As cinco características férteis**

**Entrada estruturada** · **já teve bugs** · **complexidade** · **código antigo sem fuzzing** · **sem
sanitizer no CI.**

**3. As cinco estéreis**

**Entrada trivial** · **já muito fuzzado** · **bem revisado** · **fuzzado e sem sanitizer** ·
**harness impossível**.

**4. Por que "muito fuzzado" não é estéril**

Porque **o fuzzing por crash achou o que crasha** — **e os bugs de lógica ficaram.**

**5. O que um alvo exaustivo por crash ainda tem**

**Bugs de lógica** — **porque o oráculo foi fraco.**

**6. As três fontes de sinal, e a mais barata**

**Histórico** · **código** · **instrumentação**. **A instrumentação é a mais barata:** **uma hora de
fuzz diz mais que um dia de leitura.**

**7. O que o histórico indica**

**Que a área é fértil** — **porque a mesma equipe, no mesmo estilo, erra parecido.**

**8. O que a instrumentação revela**

**Se o harness e o corpus estão certos.** **Cobertura que satura rápido aponta para eles, não para o
alvo.**

**9. Cobertura que satura rápido**

**Que o corpus não entra no parser** — **ou que o harness filtra.**

**10. Os cinco elementos da superfície**

**Pontos de entrada** · **campos** · **fronteiras** · **caminhos** · **tamanho.**

**11. O que é o mapa de fronteiras**

**A tabela de campo × limite.** **E ele é o corpus em potencial.**

**12. Por que ele é o corpus em potencial**

Porque **cada campo com limite é um caso, e cada limite é um arquivo.**

**13. Como o uso difere do Parser Differentials**

**Lá, ele media a divergência; aqui, ele guia a mutação.**

**14. As duas famílias de bug**

**Parsing/memória** e **lógica.**

**15. Qual oráculo cada uma exige**

**Memória:** sanitizer. **Lógica:** ⚠ **diferencial ou invariante.**

**16. Por que o bug de lógica não crasha**

Porque **o código faz a coisa errada e continua** — **não há violação de memória.**

**17. Por que o sanitizer satura**

Porque **os bugs de memória fáceis já foram achados** em código maduro — **e o que resta é lógica.**

**18. Os campos do plano**

**Alvo** · **superfície** · **harness** · **corpus** · **oráculo** · **tempo** · **triagem.**

**19. Por que o orçamento de crashes limita**

Porque **é o número que você consegue triar** — **e gerar mais é produzir dívida.**

**20. O que acontece sem plano de triagem**

**A pasta `crashes/` com 200 arquivos e nenhuma conclusão.**

---

## Módulo 3 — O harness

**1. O que o harness é**

**A função que o fuzzer chama, e que traduz bytes em uma chamada ao alvo.**

**2. A forma canônica**

**`LLVMFuzzerTestOneInput(const uint8_t *data, size_t size)`.**

**3. O que ela não faz**

**Nenhuma validação.** **O alvo decide o que fazer com o inválido** — **e é o que se quer exercitar.**

**4. Cinco erros e o sintoma**

**Valida antes** → cobertura baixa · **aborta em erro** → falsos crashes · **inicializa no laço** →
lento · **não libera** → OOM falso · **chama só a segura** → metade do código.

**5. O erro do módulo, e por que parece correto**

**Validar antes.** **Parece correto porque é o que o programa real faria** — **e é exatamente por
isso que o fuzzer não chega ao código.**

**6. O que um `abort()` produz**

**Falsos crashes** — **porque o alvo recusar entrada inválida é comportamento correto.**

**7. Os cinco passos**

**Escolha a função** · **descubra o estado** · **inicialize uma vez** · **chame sem validar** ·
**limpe o que vaza.**

**8. Qual função fuzzar**

**A mais profunda que ainda aceita bytes.**

**9. Por que a "de dentro" é armadilha**

Porque **você perde todo o código que existe **antes** dela** — **inclusive o parsing.**

**10. Onde inicializar**

**Fora da função de fuzz** — **porque dentro, cada execução paga o custo, e pode ser 1000×.**

**11. O que fazer com o que vaza**

**Liberar** — **senão o fuzzer reporta OOM falso.**

**12. Os três oráculos**

**Crash** · **comparação** · **invariante.**

**13. O mais fraco**

**O crash** — **porque só vê o que o sistema operacional percebe.**

**14. O mais amplo**

**O invariante** — **porque vê o que está errado mesmo quando nada quebra.**

**15. Por que o sanitizer é o mínimo**

Porque **sem ele, a maioria dos bugs de memória não crasha** — **só corrompe.**

**16. O que o harness diferencial faz**

**Chama duas implementações e `abort()` quando discordam.** **E o `abort` é o canal do achado** —
**é o que faz o fuzzer guardar a entrada.**

**17. Por que exec/s importa mais que horas**

Porque **é o que multiplica a chance de achar** — **e o harness decide esse número.**

**18. A diferença in-process × por processo**

**In-process: 10.000 a 100.000 exec/s.** **Por processo: 50 a 500** — **porque recriar o processo
domina.**

**19. O que o harness ruim custa**

**Centenas de falsos crashes** — **e o tempo de triá-los, que é o recurso escasso.**

**20. Como se liga ao módulo 8**

**A medida de distância exige instrumentar o alvo** — **que é uma forma de harness.**

---

## Módulo 4 — Cobertura e o guia

**1. O que a cobertura é**

**Um mecanismo** — **o critério de seleção do corpus.**

**2. Os três passos**

**Executa** · **registra os blocos** · **guarda se houver bloco novo.**

**3. Qual passo faz convergir**

**O terceiro** — **sem ele, a mutação é aleatória.**

**4. O que o fuzzer guarda, o que descarta**

**Guarda:** quem visitou bloco novo, e os crashes. **Descarta:** quem só visitou blocos conhecidos.

**5. Os três tipos**

**Blocos** · **arestas** · **comparações.**

**6. Qual guia melhor**

**Arestas** — **porque distingue caminhos que compartilham blocos.**

**7. O mais dirigido**

**Comparações** — **porque sabe **o que falta gerar**, e não só que existe um ramo não visitado.**

**8. Os seis campos**

**exec/s** · **cov** · **ft** · **"NEW"** · **cycles** · **"no new"**.

**9. O que "NEW" significa**

**Cobertura nova** — **o sinal de progresso.**

**10. O que "NEW" parando em segundos indica**

**Que o corpus não entra no parser.**

**11. O que exec/s baixo indica**

**Que o harness é lento** — **e quase sempre é ele, não a máquina.**

**12. O que cov estável e alta indica**

**Harness que filtrou, ou alvo estéril.**

**13. As quatro causas de saturação**

**Corpus não entra** · **harness filtra** · **comparação difícil** · **alvo estéril.**

**14. O que é uma barreira de comparação**

**`if (magic == 0xDEADBEEF)`** — **e a mutação aleatória nunca gera esse valor.**

**15. Por que a mutação não a vence**

Porque **o espaço de valores é vasto** — **e 4 bytes aleatórios levam anos.**

**16. Quatro barreiras e a solução**

**Magic number** → semente · **checksum** → calcular e semear · **string** → dicionário ·
**comprimento** → semente com o tamanho.

**17. O que o dicionário faz**

**Dá ao fuzzer os tokens que ele não descobriria** — **e ele os insere nas mutações.**

**18. Como uma semente destrava**

**Ela contém o valor exigido** — **e o fuzzer começa **depois** da barreira.**

**19. Por que a cobertura não é correção**

Porque **passar por um bloco não é verificar o que ele faz.**

**20. O que "90% de cobertura" não significa**

**"90% testado".** **Não diz que não há bug, nem que a entrada foi válida.**

---

## Módulo 5 — O corpus de fronteira

**1. O que o corpus é**

**O mapa que você dá ao fuzzer** — **a chave das portas fechadas.**

**2. Por que é o maior ganho depois do oráculo**

Porque **sem ele, o fuzzer procura a fronteira no escuro** — **e a fronteira é uma coordenada exata
num espaço enorme.**

**3. Os sete valores**

**0** · **1** · **limite − 1** · **limite** · **limite + 1** · **máximo do tipo** · **máximo + 1.**

**4. O que `count = 1024` exercita, e por que é especial**

**Passa a primeira verificação e cai na segunda** — **porque `1024 × 4 > 64`.** **É a **interação**
entre as duas fronteiras**, onde a ordem das verificações importa.**

**5. O que `limite + 1` exercita**

**O ramo de erro** — **a violação da fronteira.**

**6. Por que o cruzamento importa**

Porque **é onde a ordem das verificações decide o comportamento** — **e é onde o bug mora.**

**7. Os quatro critérios**

**Entra no parser** · **alcança ramo novo** · **válida o suficiente** · **pequena.**

**8. Por que a válida demais é ruim**

Porque **ela não exercita o erro** — **só o caminho feliz.**

**9. Por que a inválida é ruim**

Porque **ela não passa** — **e o fuzzer gasta mutando o que o parser rejeita.**

**10. O que é a semente "válida até a fronteira"**

**A que passa o suficiente para chegar ao ramo — e não mais.**

**11. O que uma semente de 1 MB custa**

**O fuzzer gasta a maioria das mutações em bytes irrelevantes** — **e o sinal se perde no ruído.**

**12. O que o mapa liga**

**A semente ao ramo** que ela exercita.

**13. Para que ele serve**

**Reproduzir** · **manter** · **declarar cobertura.**

**14. O que acontece sem ele quando o alvo muda**

**Uma semente deixa de ser válida, o fuzzer para de chegar ao ramo, e você não sabe qual.**

**15. Como se mede o efeito do corpus**

**Rodando dois corpus no mesmo tempo** — **e comparando cobertura, e quando o último "NEW"
apareceu.**

**16. O que "A = B" significa**

**Que o corpus não entrou no parser** — **revise o formato da semente.**

**17. O que o corpus não garante**

**Que há bug no ramo** — **só que o fuzzer chega lá.**

**18. Por que não garante bug**

Porque **cobertura não é correção.**

**19. Como o mapa se compara**

**Lá ligava o caso ao ponto de divergência; aqui, a semente ao ramo.** **O princípio é o mesmo.**

**20. O que o corpus declara**

**O que foi testado** — **e é o que dá auditabilidade ao relatório.**

---

## Módulo 6 — Fuzzing estrutural

**1. O que a mutação não sabe**

**O que é um campo.** **Ela troca um byte e quebra o formato.**

**2. Por que destrói o formato**

Porque **o formato é um contrato** — **e a mutação o viola.**

**3. Quatro mutações e o efeito**

**Trocar byte de campo** → depende · **inserir byte** → desalinha · **remover** → idem · **splice** →
lixo com campo de tamanho.

**4. O que o splice faz**

**Produz entrada inconsistente** — **porque o tamanho de uma semente não bate com os dados da
outra.**

**5. As duas abordagens**

**Por gramática** e **por invariante.**

**6. O que a gramática resolve**

**A alcançabilidade** — **gera entrada que passa.**

**7. O que o invariante resolve**

**O oráculo** — **julga a execução.**

**8. Por que são complementares**

**A gramática gera; o invariante julga.** **Geração sem oráculo forte só acha crash; oráculo forte
sem geração não alcança o código.**

**9. Quatro tipos de gramática**

**Estrutural simples** (baixo) · **gerador com escolhas** (médio) · **gramática formal** (alto) ·
**mutador ciente** (médio).

**10. O que o gerador simples precisa**

**Produzir entrada que passe na validação** — **e variar o campo que importa.**

**11. O que ele não deve fazer**

**Inserir byte aleatório no meio da estrutura.**

**12. Por que 70/25/5**

**70% válido** → o parser chega ao fundo · **25% fronteira** → os limites e além · **5%
inconsistente** → o campo mente.

**13. O que o inconsistente produz**

**`total` que não bate com os dados** — **e é útil porque exercita o caminho em que o campo mente.**

**14. Os quatro invariantes**

**Não lê além de `size`** · **retorno consistente** · **não escreve além** · **toda entrada
decide.**

**15. O que "não lê além" detecta**

**Leitura fora da entrada** — **o bug do alvo do curso.**

**16. O que "toda entrada decide" detecta**

**Caminho não tratado** — **o parser deixando o estado indefinido.**

**17. Qual o ASan já faz**

**Não lê além e não escreve além.**

**18. O bug do alvo, e por que não crasha**

**`memcpy` de 64 bytes de uma entrada de 6.** **Não crasha porque lê memória **adjacente válida** — e
o programa continua.**

**19. Por que modificar o alvo é legítimo**

Porque **é o **seu** alvo** — **e é o caminho mais simples para declarar o que ele leu.**

**20. O que o invariante não pega**

**A regra de negócio** (você não sabe a regra) **e o estado entre chamadas** (o harness reinicia).

---

## Módulo 7 — O oráculo

**1. O que o oráculo decide**

**O que é um bug.** **E trocar o oráculo muda o que está sendo buscado.**

**2. Por que a troca não é de velocidade**

Porque **ela muda o **objetivo** da busca, não a rapidez.**

**3. Os cinco oráculos**

**Crash** · **sanitizer** · **timeout** · **diferencial** · **invariante.**

**4. Por que o crash puro é o mais fraco**

Porque **a maioria dos bugs de segurança não crasha** — **faz a coisa errada e continua.**

**5. Três bugs que não crasham**

**Leitura de memória adjacente válida** · **índice errado dentro do buffer** · **verificação ausente
num caminho.**

**6. O bug do alvo, e por que não crasha**

**`memcpy` de 64 de uma entrada de 6.** **Não crasha porque lê memória adjacente válida.**

**7. A taxa do crash puro, e do sanitizer**

**Crash puro:** ~30% memória, ~0% lógica. **Sanitizer:** ~95% memória, ~0% lógica.

**8. O que o sanitizer não pega**

**Bugs de lógica** — **porque não há violação de memória.**

**9. Quatro causas de timeout**

**Loop em entrada grande** · **loop em entrada pequena** · **inicialização lenta** · **alocação
gigante.**

**10. Quando o timeout é bug**

**Quando o custo não acompanha o tamanho da entrada.**

**11. Por que loop em entrada pequena é bug**

Porque **8 bytes não justificam demora** — **e um loop que não termina com 8 bytes tem um problema.**

**12. A referência no diferencial e no invariante**

**Diferencial:** outra **implementação**. **Invariante:** uma **propriedade** afirmada.

**13. Qual serve com duas implementações**

**O diferencial.**

**14. Qual serve com uma só**

**O invariante** — **desde que você conheça a regra.**

**15. O que fazer quando não sabe o que é certo**

**Ler o código** — **nenhum oráculo substitui isso.**

**16. Quatro invariantes universais**

**Não lê além de `size`** · **não escreve além** · **retorno num conjunto conhecido** · **a saída é
função da entrada.**

**17. O que o determinismo detecta**

**Estado escondido** — **e é a origem de metade dos bugs de concorrência.**

**18. O que o específico acrescenta**

**A regra do **seu** formato** — **que os universais não sabem.**

**19. De onde ele vem**

**Da spec, ou do código** — **"o que DEVE valer sempre?"**

**20. Por que o específico pega lógica**

Porque **ele sabe o que é **certo** — **e o universal só sabe o que é seguro.**

---

## Módulo 8 — Dirigido: o `1dFuzz`

**1. Por que o cego desperdiça**

Porque **explora tudo com o mesmo esforço** — **e a maioria do código não tem o bug.**

**2. O que o dirigido muda**

**A alocação do esforço**, não a velocidade.

**3. As três formas**

**Por posição** (o patch) · **por distância** (a sequência de chamadas) · **por seed** (um corpus que
alcança).

**4. Qual você já fez**

**Por seed** — **o corpus de fronteira e a gramática são fuzzing dirigido pelo formato.**

**5. O que é a trailing call sequence**

**A medida de quantas chamadas faltam** para chegar à função do patch.

**6. Os cinco passos**

**Localize o patch** · **meça a distância** · **direcione** · **reproduza** · **confirme.**

**7. O achado técnico**

**O passo 2** — **a medida de distância, que a cobertura comum não tem.**

**8. Como se mede a distância**

**Pela sequência de funções que a execução alcança** — **e quantas faltam até o alvo.**

**9. Por que "chegou ao parser" não é "chegou ao alvo"**

Porque **ambos visitaram um bloco novo** — **e a cobertura de blocos os trata igual.**

**10. O que a cobertura comum não distingue**

**Quão perto** a execução chegou.

**11. O que a distância acrescenta**

**Direção** — **"você está a duas chamadas do alvo".**

**12. O ganho do 1dFuzz**

**2,26× mais achados, 43% menos tempo.**

**13. Quando dirigir não vale**

**Quando você não sabe onde o bug está** · **quando quer bugs em toda a superfície.**

**14. Por que é erro sem saber o alvo**

Porque **dirigir significa escolher um alvo no escuro** — **e gastar o orçamento num lugar que pode
estar vazio.**

**15. Quatro custos**

**Localizar o patch** · **implementar a distância** · **manter a instrumentação** · **o risco de
escolher errado.**

**16. Qual é constante**

**Manter a instrumentação** — **ela precisa acompanhar o alvo.**

**17. Como mitigar o risco**

**Rodar as duas campanhas** — **a cega e a dirigida** — **e comparar.**

**18. O critério de retorno**

**Se a dirigida não rende ~2×, não valeu.**

**19. O que o dirigido não garante**

**Que há bug no alvo** (o patch pode ter corrigido outra coisa) · **que você alcança em produção** ·
**que os outros alvos são inúteis.**

**20. Por que "por seed" é pré-requisito**

Porque **sem uma seed que alcança, o fuzzer nem chega perto** — **e a medida de distância não tem o
que medir.**

---

## Módulo 9 — Snapshot e kernel

**1. O que o in-process assume**

**Que o custo por execução é o custo do alvo.**

**2. Onde não vale**

**Onde o custo é **levantar o ambiente**** — **serviço complexo, kernel, hypervisor, firmware.**

**3. O que o snapshot é**

**Congelar o estado e restaurá-lo a cada execução.** **Sem ele, o ciclo é de segundos; com ele, de
milissegundos.**

**4. Em que alvo não muda nada**

**No parser** — **porque a partida já é ~0, e a complexidade é puro custo.**

**5. O ganho no kernel**

**De ~5 exec/s para ~500.**

**6. Quatro ferramentas**

**QEMU + AFL** (kernel, firmware) · **Nyx** (kernel, hypervisor) · **`kkAFL`** (kernel Linux) ·
**snapshot em userspace** (serviço).

**7. Como se mede se compensa**

**Partida × processamento.** **Se a partida domina, compensa; se é 1% do ciclo, não.**

**8. O que o `/bin/true` revela**

**Que criar e destruir um processo custa ~1 ms** — **e é todo o custo de partida.**

**9. Três alvos que a mutação não alcança**

**Serviço com estado** · **kernel** · **firmware.**

**10. O que "alcançar" é num parser**

**Chamar a função.**

**11. Num serviço, no kernel**

**Serviço: chegar autenticado.** **Kernel: uma syscall com argumentos que o kernel não rejeita de
imediato.**

**12. Por que o serviço é o mais comum**

Porque **a maioria dos alvos exige estado** — **e o fuzzer não sabe fazer login.**

**13. O que é a semente de sessão**

**O estado pré-construído**, que o harness restaura.

**14. Por que é snapshot em escala menor**

Porque **a ideia é a mesma:** **construir uma vez, restaurar muitas** — **só que no estado da
aplicação, e não da máquina.**

**15. Cinco requisitos do lab de kernel**

**Image compilada** · **QEMU** · **rootfs com o trigger** · **snapshot** · **isolamento do host.**

**16. Por que o isolamento é obrigatório**

Porque **um kernel sem resposta pode travar a máquina** — **e o isolamento impede o host de cair
junto.**

**17. Qual alvo tem o melhor custo/benefício**

**O parser simples** — **monta em minutos e tem superfície alta.**

**18. Por que o kernel tem retorno incerto**

Porque **a superfície é maior, mas o custo também** — **e o ganho não escala com o custo.**

**19. O que "avançado" significa**

**Não o mais difícil** — **mas o que rende por hora investida.**

**20. O que o snapshot não resolve**

**O oráculo** · **o corpus** · **a trigger** (como a entrada chega). **A partida não é o sinal.**

---

## Módulo 10 — Triagem

**1. O que o fuzzer acha**

**Crashes.** **Não bugs.**

**2. Por que a maioria não é bug**

Porque **é timeout, OOM, bug do harness, ou o mesmo bug repetido.**

**3. Quatro métodos de dedup**

**Contagem bruta** (inútil) · **hash da entrada** (trivial) · **traço de pilha** (o padrão) ·
**cobertura do crash** (alta).

**4. Qual é o padrão**

**O traço** — **porque dois crashes no mesmo lugar são o mesmo bug.**

**5. Os números típicos**

**200 brutos** → 60 por entrada → ⚠ **3 a 8 por traço** → **1 a 3 após triagem.**

**6. Por que a dedup ignora endereços**

Porque **endereços mudam entre execuções** — **e agrupar por eles daria um grupo por crash.**

**7. Seis coisas que não são bug**

**Bug do harness** · **timeout** · **OOM do harness** · **assert do alvo** · **rejeição correta** ·
**bug já conhecido.**

**8. A mais comum, e como reconhecer**

**Bug do harness** — **se o traço **começa** no harness, o bug é seu.**

**9. Por que o assert é sutil**

Porque **pode ser bug do alvo, ou a verificação funcionando** — **e só se sabe lendo o código.**

**10. Quando um bug já corrigido é achado**

**Se a versão antiga ainda está em uso.** **Se não está, não é.**

**11. As três perguntas**

**O traço é do alvo?** · **o alvo decidiu isso?** · **já foi corrigido?**

**12. Como se respondem**

**Lendo o código e o traço** — **não supondo.**

**13. As cinco etapas do reproducer**

**Confirmar** · **reduzir** · **confirmar de novo** · **capturar** · **verificar a versão.**

**14. O que a redução alcança**

**De 4 KB para 20 bytes** — **e a entrada mínima mostra qual campo causa o bug.**

**15. Por que não é estética**

Porque **uma entrada grande esconde o mecanismo no ruído** — **e o mantenedor não consegue
analisar.**

**16. O que reduzir, o que não**

**Reduzir:** bytes irrelevantes, padding, campos ignorados. **Não reduzir:** o campo que causa, o
tamanho que dispara, o valor de fronteira.

**17. O que capturar além da entrada**

**O comando** · **a saída do sanitizer** · **a versão do alvo** · **o ambiente.**

**18. O que o reproducer mínimo permite**

**Confirmar e corrigir** — **sem ele, o mantenedor não consegue nem um nem outro.**

**19. O que um crash sem reproducer é**

**Uma anedota.**

**20. O que o achado não prova**

**Que é explorável** · **a severidade** · **que afeta produção.**

---

## Módulo 11 — O rendimento

**1. Por que "72 horas" não é resultado**

Porque **é custo.** **O resultado é o que sobrou depois da triagem.**

**2. O que o rendimento mede, e a fração**

**Bugs triados / horas de analista.**

**3. Por que CPU não entra no denominador**

Porque **ela é alugável** — **e o recurso escasso é o julgamento.**

**4. Qual etapa custa zero**

**Rodar a campanha** — **e é a única que a maioria mede.**

**5. Qual é o gargalo**

**A triagem** — **consome mais que todo o resto junto.**

**6. As três métricas e o que enganam**

**Horas de campanha** (é custo) · **crashes brutos** (é ruído) · **bugs triados/hora** (não engana).

**7. Os quatro eixos**

**Mais CPU** · **melhor corpus** · **melhor oráculo** · **triagem automática.**

**8. Qual tem o maior retorno**

**O oráculo** — **~10× mais bugs.** **Porque muda **o que se busca**.**

**9. Por que CPU parece o melhor**

Porque **custa zero horas de analista** — **e por isso parece gratuita.**

**10. O que mais CPU multiplica junto**

**Crashes, e portanto triagem** — **mas não bugs.**

**11. A ordem de investimento**

**Oráculo → triagem → corpus → CPU.**

**12. Os quatro critérios de parada**

**Rendimento caiu** · **triagem estourou** · **alvo saturado** · ⚠ **achou o bug.**

**13. Por que continuar depois do achado é ruim**

Porque **gera crashes que você não vai triar** — **e eles **enterram** o achado.**

**14. O que a campanha produz quando cresce mais que a triagem**

**Dívida de triagem.**

**15. O que é dívida de triagem**

**Crashes acumulados que ninguém olhou** — **e que precisam ser pagos antes de continuar.**

**16. O que fazer quando a triagem estoura**

**Parar até triar o que tem.**

**17. O que fazer quando o rendimento cai**

**Mudar de eixo** — **corpus, ou oráculo.**

**18. O que o rendimento não diz**

**A qualidade do bug** · **o valor para o produto** · **se outro alvo renderia mais.**

**19. Por que um bug crítico vale mais**

Porque **o rendimento conta bugs, não impacto** — **e um bug crítico pode justificar toda a
campanha.**

**20. O que reportar em vez de horas**

**Bugs triados, e as horas de analista que eles custaram.**

---

## Módulo 12 — Projeto

**1. Por que o percurso**

Porque **um crash sem percurso não se reproduz nem se avalia** — **e não informa o próximo alvo.**

**2. Por que "não achou, com diagnóstico" é válido**

Porque **concluir que "o alvo saturou por causa do corpus, e o harness filtrava" é resultado** — **e
informa a correção.**

**3. Por que o corpus vem antes**

Porque **sem ele, as horas são gastas no parser.**

**4. O que o harness não pode fazer**

**Validar antes de passar** · **abortar em erro esperado.**

**5. Por que o exec/s importa**

Porque **é o que multiplica a chance de achar.**

**6. O que o mapa declara**

**O que cada semente exercita** — **e portanto o que foi testado.**

**7. O que as interações exercitam**

**Onde duas fronteiras se cruzam** — **e a ordem das verificações decide.**

**8. Por que o oráculo além do crash é obrigatório**

Porque **o crash é o mais fraco** — **e não vê lógica.**

**9. O que o invariante específico acrescenta**

**A regra do formato** — **e é o que pega lógica.**

**10. O que o diagnóstico revela**

**O elemento culpado** — corpus, harness ou alvo.

**11. Quantos crashes viram quantos bugs**

**200 brutos → 3 a 8 por traço → 1 a 3 após triagem.**

**12. Por que dedup por traço**

Porque **dois crashes no mesmo lugar são o mesmo bug.**

**13. As três perguntas**

**Traço do alvo?** · **o alvo decidiu?** · **já foi corrigido?**

**14. Quatro coisas que não são bug**

**Bug do harness** · **timeout** · **assert de rejeição** · **bug conhecido.**

**15. Por que o reproducer precisa ser mínimo**

Porque **a entrada grande esconde o mecanismo** — **e o mantenedor não consegue analisar.**

**16. O que o reproducer prova**

**Que a entrada X causa o erro Y na versão Z.**

**17. O que ele não prova**

**Explorabilidade** · **severidade** · **que afeta produção** · **que é o único bug.**

**18. Como se calcula o rendimento**

**Bugs triados / horas de analista** — em bugs por hora, não em horas de CPU.

**19. Qual o próximo investimento**

**O oráculo** — **e depois a triagem automática.**

**20. O que a declaração precisa deixar claro**

**Que o fuzzer rodou local, com o alvo próprio, e que o crash foi reportado** — **não explorado.**

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| **Escolha do alvo** | 10% | Superfície e critério |
| **O harness** | 20% | Não valida, mede exec/s |
| **O corpus** | 15% | Fronteira, mapa, interações |
| **O oráculo** | 20% | Além do crash |
| **A triagem** | 25% | Dedup, veredito, reproducer |
| Limitações | 10% | O que não testou |

**Penalidades automáticas:**

- Fuzzou serviço de terceiro: **lab zerado**.
- Reportou sem reproducer mínimo: −30%.
- Crashes sem deduplicar: −25%.
- Sem oráculo além do crash: −15%.
- Sem rendimento: −10%.
- "Não fiz" ausente: −10%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| **Alvo** | por gosto | com critério | **+ superfície mapeada** |
| **Harness** | valida | correto | **+ exec/s medido** |
| **Corpus** | aleatório | de fronteira | **+ interações + mapa** |
| **Oráculo** | crash | + sanitizer | **+ invariante específico** |
| **Campanha** | rodou | com tempo | **+ diagnóstico** |
| **Triagem** | contou | dedup | **+ 3 perguntas + veredito** |
| **Reproducer** | guardou | reduziu | **+ mínimo em hex + saída** |
| **Rendimento** | ausente | calculado | **+ próximo investimento** |
| Relatório | descreve | com evidência | **+ o que não prova** |
| Não fiz | ausente | 1 item | **6+ itens** |
| Conduta | ausente | menciona | **+ o volume declarado** |
| **Nada achado** | — | — | **✓ válido com diagnóstico** |

**Os dois itens de maior valor:**

1. **A triagem** — porque **é o trabalho real**, e onde a maioria para em "contei os arquivos".
2. **O oráculo além do crash** — porque **é o maior ganho disponível**, e o que muda o que se busca.

---

*Material didático original, de propósito defensivo e de pesquisa. O alvo é código próprio ou
aberto, compilado e instrumentado no laboratório. Nenhuma entrada é enviada a serviço de terceiro. O
crash é reportado ao mantenedor — nunca usado contra sistema alheio. Fuzzing contra infraestrutura
de terceiro é crime (art. 154-A e 266).*
