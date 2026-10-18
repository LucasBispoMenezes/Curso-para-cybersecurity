# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos dez módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — Onde duas implementações discordam

**1. Por que duas implementações da mesma spec discordam**

Porque **a spec descreve o que é válido, e não o que fazer com o inválido.** **Onde há decisão não
especificada, há pelo menos duas.**

**2. As cinco causas**

**A spec omite o caso** · **a spec é ambígua** · **a spec mudou** · **a lib foi reusada** · ⚠ **o
atalho** (a tolerância "para funcionar com clientes quebrados").

**3. A mais perigosa**

**O atalho.** Porque **a tolerância é real e assimétrica** — **e a implementação que ACEITA MAIS é a
que deixa bytes sobrando.** **Bytes sobrando viram a próxima requisição.**

**4. Por que a que "aceita mais" é perigosa**

Porque **ela consome menos do que devia** — **e o que não consumiu é lido pelo componente
seguinte.** **É a origem do smuggling.**

**5. O que a RFC 7230 §3.5 pede**

**Robustez** — e **não diz o que fazer com cada caso ambíguo.** **É literalmente a spec deixando em
aberto.**

**6. As três possibilidades**

**A viola a spec** · **B viola a spec** · **a spec não decide.** **Nas três há um bug.**

**7. Por que a discordância proíbe que as duas estejam certas**

Porque **se ambas seguissem a spec, produziriam o mesmo resultado.** **Resultados diferentes provam
que pelo menos uma a viola** — **ou que a spec é ambígua.**

**8. Cinco contextos**

**Proxy ↔ servidor** (smuggling) · **WAF ↔ servidor** (bypass) · **filtro ↔ destino**
(sanitização) · **cliente ↔ servidor** (desync) · **cache ↔ origem** (cache poisoning).

**9. O que é framing**

**Onde a mensagem termina.** **É o caso central porque o efeito é objetivo:** **os bytes que sobram
viram a próxima mensagem.**

**10. Por que a discordância é o bug**

Porque **você não precisa saber qual erra.** **A discordância prova que pelo menos uma erra** — **e,
na prática, produz um efeito que o atacante controla.**

**11. O que o `HTTP Garden` mediu**

**100+ bugs, 68 corrigidos, 39 exploráveis** — **em servidores modernos e mantidos.**

**12. O que o `WAFFLED` mediu**

**120+ exploits contra 5 WAFs** — **produtos comerciais.**

**13. Por que "39 exploráveis" é o mais informativo**

Porque **100 bugs de parsing seriam curiosidade.** **39 exploráveis significa que a discordância tem
consequência** — **e é o que distingue o trabalho de uma lista de excentricidades.**

**14. Por que o `HTTP Garden` compara N**

Porque **um parser sozinho não revela nada.** **A discordância é o sinal** — **e ela só existe entre
dois.**

**15. A diferença de método**

**Comparar a RELAÇÃO, não os parsers.** **Testar um acha o que ele erra sozinho; comparar N acha o
que eles erram entre si.**

**16. Cinco formatos de treino**

**CSV** · **URL / query** · **JSON** · **Base64** · **datas ISO 8601**.

**17. Por que não começar pelo HTTP**

Porque **é o mais complexo** — 200 páginas de spec, muitas camadas, e o de maior risco. **Você
começa por spec curta.**

**18. Por que a data ambígua é o caso perfeito**

Porque **a discordância é clara, verificável e inofensiva** — **e a spec (a convenção local) não
decide.** **É o framing em miniatura.**

**19. O que "até onde vai o campo?" tem a ver com framing**

É **a mesma pergunta, noutra escala.** **CSV, datas e números discordam sobre onde o campo termina;
o HTTP discorda sobre onde a mensagem termina.**

**20. O que o laboratório garante**

**Que nenhuma implementação aponta para terceiro.** **A comparação é entre processos locais** — **e
o isolamento se verifica, não se promete.**

---

## Módulo 2 — Spec, implementação, e o espaço em aberto

**1. Por que a spec não é um programa**

Porque **é um conjunto de frases — e as frases têm força diferente.** **`MUST` obriga; o silêncio
não diz nada.**

**2. A força das palavras**

**`MUST`** obrigatório (todos fazem igual) · **`SHOULD`** recomendado (⚠ divergem) · **`MAY`**
permitido (⚠ divergem muito) · ⚠ **silêncio** (⚠⚠ é onde mais diverge).

**3. Por que `MUST` não rende**

Porque **todos seguem** — **e onde todos seguem, não há divergência.** **O rendimento está no
`SHOULD`, no `MAY` e no silêncio.**

**4. Os sete tipos**

**Silêncio** · **`SHOULD`** · **`MAY`** · **ambiguidade lexical** · **ausência de limite** · **ordem
não especificada** · **extensão**.

**5. O mais sutil**

**A ordem não especificada.** **Se a spec não diz QUANDO normalizar**, uma normaliza antes de
comparar e a outra depois — **e a discordância é a consequência.** **É a origem de muitos
bypasses.**

**6. O mais subestimado**

**A extensão.** **Toda spec que permite `X-` deixa um espaço livre** — **e o que uma ignora, a outra
processa.** **É a razão de o `WAFFLED` funcionar.**

**7. Exemplo do tipo 6 fora do HTTP**

**`a, b` num CSV** — o campo é `" b"` ou `"b"`? **A spec não decide** — **e as implementações
divergem.**

**8. Por que `implementation-defined` é ouro**

Porque **a spec ESTÁ DIZENDO que não decide** — **é o espaço em aberto declarado.**

**9. Por que "if present" é silêncio disfarçado**

Porque **a spec diz o que fazer SE o campo vier** — **e não diz o que fazer se vier MALFORMADO.**

**10. Os comandos da leitura por força**

`grep -i 'should'` · `grep -i 'may'` · `grep -i 'if present'` · `grep -i 'undefined'` ·
`grep -i 'not specified'` · `grep -i 'implementation'`.

**11. O que a carta contém**

**O ponto** · **o tipo** · **o que A deve fazer** · **o que B deve fazer** · **o impacto** ·
**a prioridade.**

**12. Por que a carta vem antes do teste**

Porque **a previsão é hipótese** — **e testar sem carta é fuzzing; testar com carta é pesquisa.**

**13. O que a coluna de impacto filtra**

**A curiosidade.** **Uma divergência sem impacto não vale o tempo** — **e o impacto é o que muda
segurança.**

**14. Por que cinco pontos, e não 40**

**Economia.** **Você testa o que tem impacto** — **e o filtro vem antes do teste.**

**15. O que explica a divergência estruturalmente**

**O PROPÓSITO.** **Implementações com propósitos diferentes divergem** — **e é por isso que ela
existe em produtos maduros.**

**16. O que o WAF quer**

**Bloquear.** **Ele é rígido onde COMPARA e frouxo onde REPASSA** — **e o repasse é o que chega ao
servidor.**

**17. O que o cache quer**

**Identificar** — ele normaliza para a **chave**. **A origem normaliza para processar** — **e as
duas não são a mesma, então duas requisições compartilham a chave.**

**18. Por que existe em produtos maduros**

Porque **não é descuido: é propósito diferente.** **E propósito não se corrige com patch.**

**19. O que a previsão exige**

**Critério de falsificação.** **"Prevejo que A retorna X e B retorna Y; se ambas retornarem o mesmo,
a hipótese é falsificada."**

**20. Por que o erro de previsão é resultado**

Porque **significa que o mecanismo é outro.** **É o mesmo princípio do módulo 6 do curso de
Pesquisa:** **a hipótese falsificada ensina.**

---

## Módulo 3 — Divergência legítima vs. bug

**1. Por que achar é fácil e classificar é o trabalho**

Porque **discordância é observação; bug é conclusão** — **e a conclusão exige critério explícito.**
**Sem ele, você gera 40 falsos positivos.**

**2. As três categorias**

**Legítima** · **ambiguidade da spec** · ⚠ **viola a spec**.

**3. Por que só a terceira vale**

Porque **nas duas primeiras nenhuma implementação está errada** — **e não há o que corrigir no
código.**

**4. Por que a categoria 2 é a armadilha**

Porque **"a spec não decide" PARECE um achado.** **E é bug DA especificação** — **o destino é o dono
do formato, não o mantenedor.**

**5. Os três subtipos da categoria 3**

**Uma viola a spec** · ⚠ **as duas violam** · ⚠⚠ **discordância de framing**.

**6. O critério prático do curso**

**A discordância de framing.** Porque **você não precisa julgar qual está certa** — **a consequência
é objetiva:** **os bytes que sobram viram a próxima mensagem.**

**7. Por que framing não exige culpado**

Porque **a consequência existe independentemente de quem erra.** **As duas podem estar "certas"
segundo a spec — e ainda assim produzir efeito.**

**8. As cinco perguntas**

**A spec decide?** · **o desvio é alcançável?** · **outra camada normaliza?** · **tem impacto?** ·
**pode ser explorado?**

**9. A mais dura**

**A 5.** Porque **"pode ser explorado" não significa "eu sei explorar"** — **significa que existe um
caminho com efeito observável.**

**10. O que "pode ser explorado" NÃO significa**

**Que você deva explorar.** **Classificar é conclusão técnica; não é autorização.**

**11. O que a pergunta 3 elimina**

**A divergência que não chega.** **Ex.: A não valida o campo, e B valida — mas outra camada valida
ANTES de chegar em A.** **Não há divergência observável.**

**12. Os três falsos positivos clássicos**

**Case** (a spec decide) · **camada que normaliza** (eliminado pela pergunta 3) · **limite
inalcançável** (pergunta 2).

**13. O mais importante para este curso**

**A camada que normaliza.** Porque **a divergência só importa se A realmente entrega o dado a B** —
**e se ninguém no meio corrige.**

**14. O que é consequência objetiva**

**Um efeito que não depende de opinião:** **bytes que sobram, chaves que coincidem, decisões que
divergem.**

**15. Quatro discordâncias com consequência**

**Onde a mensagem termina** → smuggling · **o que o filtro vê** → bypass · **o que é "a mesma
chave"** → cache poisoning · **o encoding** → bypass de assinatura.

**16. Discordâncias que NÃO são bug**

**`1.234`** (ambas defensáveis, sem efeito) · **case** (a spec decide) · **a mensagem de erro**
(não muda o efeito).

**17. Por que a mensagem de erro não é bug**

Porque **ela não muda o que acontece** — **só o que se lê.** **A maioria dos candidatos fracos cai
aqui.**

**18. Por que a categoria 3 não exige culpado**

Porque **a discordância pode ser perigosa sem que nenhuma implementação erre** — **desde que a
consequência seja objetiva.** **É o caso do framing.**

**19. O que o `HTTP Garden` filtrou**

**A discordância sobre o framing.** **É o filtro que torna 100 bugs críveis em vez de 400
curiosidades.**

**20. Por que passar nas cinco não faz o achado bom**

Porque **a cascata só ELIMINA.** **Passar significa que não é um dos falsos positivos conhecidos** —
**não que seja um achado forte.**

---

## Módulo 4 — O lab de N implementações

**1. Por que o lab é a fronteira ética**

Porque **se as N não estão no seu ambiente, você não está pesquisando — está atacando.** **O teste
diferencial exige N payloads, não um.**

**2. Por que subir N é um módulo**

Porque **é onde o iniciante desiste** — build que falha, dependência que arrasta uma stack, porta
que conflita. **E o método morre antes de começar.**

**3. Os seis critérios**

**Implementam o mesmo formato** · **maturas** · **linguagens diferentes** · **idades diferentes** ·
**propósitos diferentes** · **fáceis de subir**.

**4. Por que linguagens diferentes divergem mais**

Porque **a stdlib de cada linguagem já decidiu por elas** — **e as decisões das stdlibs não são as
mesmas.**

**5. Por que propósitos diferentes divergem estruturalmente**

Porque **cada implementação quer uma coisa** — **servidor quer aceitar, WAF quer bloquear, cache
quer identificar** — **e o que ela quer determina como ela parsa.**

**6. Três fontes de N implementações**

**As stdlibs de cada linguagem** · **os servidores de cada produto** · **as libs de cada
ecossistema.**

**7. As três formas de subir**

**Função em processo** (sem isolamento, mas local) · **processo sem rede** · ⚠ **container sem
saída**.

**8. Qual forma o módulo 6 exige**

**A terceira.** Porque **o alvo é um serviço** — **e um servidor precisa de rede.** **Você o isola
com `--network none`.**

**9. O teste de isolamento**

**Uma tentativa que FALHA.** **Do lab, você tenta alcançar um serviço externo — e não alcança.**

**10. Por que o isolamento se verifica**

Porque **não é uma promessa que você faz a si mesmo; é uma propriedade.** **E uma propriedade se
mede.**

**11. Cinco coisas a normalizar**

**Caminhos** · **timestamps** · **PIDs e endereços** · **a ordem de chaves** · **a caixa das
mensagens de erro.**

**12. Cinco coisas a NÃO normalizar**

**O resultado** · **o erro ou sucesso** · **o valor produzido** · **o limite aplicado** · **a
contagem.**

**13. O critério de normalização**

**Normalize tudo que o AMBIENTE introduz. Preserve tudo que o PARSER produz.** **Se você não sabe de
qual lado está, não normalize.**

**14. Normalização demais**

**ESCONDE a discordância** — **e você perde o achado.**

**15. Normalização de menos**

**INVENTA discordância** — **e você persegue ruído de ambiente.**

**16. Por que o mascaramento numérico é perigoso**

Porque **mascarar números para remover PIDs pode apagar o RESULTADO** — **e você perde exatamente o
que procurava.**

**17. O que a matriz mostra**

**Entradas × implementações.** **E a discordância é por LINHA.**

**18. Onde a discordância aparece**

**Na linha em que as colunas não são todas iguais.** **Cada linha discordante é um candidato.**

**19. O que a declaração garante**

**Que você declara o isolamento — e ele é verificável.** **Uma promessa não é.**

**20. O que o harness acrescenta**

**A automação da matriz e do agrupamento** — **para N implementações e muitos casos.** **E a
normalização consistente.**

---

## Módulo 5 — O harness diferencial

**1. Por que o harness não é um fuzzer**

Porque **o fuzzer procura crash; o harness procura DISCORDÂNCIA.** **E discordância é mais fácil de
achar e mais difícil de julgar.**

**2. Três diferenças**

**Procura discordância, não crash** · **não precisa de instrumentação** · **usa entrada de
FRONTEIRA, não aleatória.**

**3. As cinco partes**

**As implementações** · ⚠ **o corpus** · **o executor** · **o normalizador** · **o comparador**.

**4. Onde o método vive**

**No corpus.** Porque **o corpus não é aleatório** — **é derivado da carta, um caso por ponto.** **É
a parte pesquisada.**

**5. O que o comparador reporta**

**A discordância** — e **não o veredito.** **Ele agrupa por comportamento e mostra onde divergem.**

**6. As quatro garantias**

**Não trava** · **não derruba** · **não inunda** · **não mente**.

**7. Qual é a quarta**

**"Não mente"** — **a normalização.** Porque **sem ela o harness inventa discordância de ambiente.**

**8. Por que o código de retorno entra na assinatura**

Porque **um parser que retorna erro e outro que retorna 0 DISCORDAM** — **mesmo com a saída de texto
vazia nos dois.** **O código de retorno é comportamento.**

**9. De onde vem o corpus**

**Da carta de divergência** — **um caso por ponto** — **mais as fronteiras, os ambíguos, os de
encoding e os vazios.**

**10. Por que não é aleatório**

Porque **cada caso testa um ponto que a spec deixou em aberto.** **40 bem escolhidas rendem mais que
40 mil aleatórias.**

**11. Quantos casos por ponto**

**Um.** **Se você tem 12 pontos, tem 12 casos.** **O corpus é completo, não grande.**

**12. Os sete tipos e um caso de cada**

**Silêncio** → o malformado · **`SHOULD`** → o "recomendado" · **`MAY`** → a forma opcional ·
**ambiguidade** → as duas leituras · **limite** → limite ± 1 · **ordem** → o dado que exige
normalizar antes · **extensão** → o campo que um ignora.

**13. O caso ambíguo**

**A entrada que admite DUAS leituras** — **e cada implementação escolhe uma.** **É o mais importante
porque não há resposta certa: há duas defensáveis.**

**14. Os valores de fronteira**

**0** · **1** · **máximo − 1** · **máximo** · **limite − 1** · **limite** · **limite + 1**.

**15. Qual testa off-by-one**

**O limite + 1.** **E o limite exato** — **se o patch mudou `>` para `>=`.**

**16. O que `1.234` e TE/CL têm em comum**

**A mesma ambiguidade** — **uma entrada, duas leituras.** **A diferença é a consequência: no
primeiro, um valor; no segundo, uma mensagem extra.**

**17. O que fica fora do harness**

**A classificação** · **o julgamento** · **saber qual está certa** · **medir o impacto** ·
**confirmar explorabilidade** · **reportar.**

**18. Onde a automação para**

**Na detecção.** **Da detecção para a conclusão há uma cascata de julgamento que não se codifica.**

**19. A consequência de classificar no código**

**Falsos positivos em volume** — **e isso queima a credibilidade.**

**20. O que muda ao escalar para N**

**Só a lista de implementações.** **O corpus continua o mesmo: um caso por ponto.** **O que cresce é
o tempo e o número de grupos.**

---

## Módulo 6 — Framing

**1. O que é framing**

**A regra que diz onde a mensagem começa e termina.**

**2. Cinco formatos e o que define o fim**

**HTTP/1.1** → `Content-Length` ou `Transfer-Encoding` · **HTTP/2** → o frame · **multipart** → o
boundary · **chunked** → o chunk 0 · **CSV** → a quebra de linha (ou a aspa).

**3. Por que "quantas mensagens" é a diferença crítica**

Porque **"quantas" decide se uma sequência é uma requisição ou duas** — **e a segunda pode não ter
passado pelo filtro.**

**4. Os três casos**

**TE + CL** · **CL duplicado** · **CL com espaço ou sinal**.

**5. Qual é o clássico**

**TE + CL.** **A spec o resolve** — **`Transfer-Encoding` vence** — **mas implementações antigas usam
o `Content-Length`.**

**6. Por que a spec resolver não basta**

Porque **as implementações em produção são de antes** — **e os proxies falam com ambas.** **A spec
de hoje e as implementações de ontem divergem.**

**7. O invariante de framing**

**"A leitura de uma mensagem consome EXATAMENTE os bytes dela."** **Nada sobra, nada falta.**

**8. O que ele viola**

**A implementação que usa o `Content-Length` consome 6 bytes** — **e os outros ficam.** **O
invariante de que tudo foi consumido quebrou.**

**9. Por que vale em qualquer formato**

Porque **todo formato com framing tem um limite** — **e "tudo foi consumido" é a propriedade que o
ataque viola.**

**10. O invariante no CSV e no WebSocket**

**CSV:** cada linha é um registro — **o mesmo número em todas**. **WebSocket:** cada frame é uma
mensagem.

**11. O que o atacante precisa**

**Dois parsers que discordem, e um caminho que os ligue.** **Não precisa de um parser quebrado.**

**12. As métricas**

**N de mensagens** · **bytes consumidos** · **bytes restantes** · **a segunda mensagem.**

**13. O que a medição conta**

**Quantas mensagens cada parser extrai da MESMA sequência.**

**14. O sinal de discordância**

**Os parsers extraem números diferentes de mensagens.**

**15. O que A vê que B não vê**

**A mensagem que sobra** — **e ela é controlada pelo atacante.**

**16. Quem controla os bytes que sobram**

**O atacante.** **É ele que escreve a sequência** — **e escolhe o que fica na parte que sobra.**

**17. A diferença**

**Sobrar bytes é um ERRO.** **Sobrar bytes que o próximo parser LÊ como mensagem é o SMUGGLING.** **É
a diferença entre um bug e uma vulnerabilidade.**

**18. O que dá a gravidade**

**O CAMINHO.** **Sem caminho entre as camadas, é um bug. Com caminho, é uma vulnerabilidade.**

**19. As três críticas**

**Alcançável?** · **a camada normaliza?** · **os bytes sobram e viram mensagem?**

**20. O que "pode ser explorado" autoriza**

**Nada.** **Você descreve o impacto; o mantenedor decide.**

---

## Módulo 7 — Discordância entre camadas

**1. Por que um parser sozinho não tem bug**

Porque **o bug está na RELAÇÃO.** **Isolado, cada parser pode estar correto** — **e a discordância
só aparece quando um entrega ao outro.**

**2. O que define uma camada**

**Qualquer componente que LÊ e REESCREVE a mensagem entre a origem e o destino.**

**3. Cinco camadas e o que querem**

**Proxy** → encaminhar · **WAF** → filtrar · **load balancer** → distribuir · **cache** →
identificar · **servidor** → processar.

**4. Qual par rende mais**

**O de propósitos opostos** — **WAF ↔ servidor, cache ↔ origem.** Porque **cada um quer uma coisa
diferente** — **e é aí que a divergência é estrutural.**

**5. Por que nunca foram testadas como par**

Porque **são desenvolvidas, testadas e mantidas em SEPARADO.** **A relação entre elas é território
de ninguém.**

**6. O que o `HTTP Garden` comparou**

**N servidores entre si** — **usando a mesma sequência e comparando as respostas.**

**7. Os números**

**100+ bugs · 68 corrigidos · 39 exploráveis.**

**8. O que ele mudou**

**Não fuzzou um servidor; fuzzou a RELAÇÃO.** **É a diferença de método.**

**9. Qual instrumento do curso ele é**

**O harness do módulo 5** — **com N implementações em vez de 2.** **O que muda é o escopo.**

**10. O que o `WAFFLED` comparou**

**WAF ↔ servidor** — **o filtro com o alvo.**

**11. Por que o WAF didático basta**

Porque **o método não depende do produto.** **O `WAFFLED` comparou produtos; você compara o
CONCEITO — normalização, ordem, encoding.**

**12. Quatro medições de desvio**

**N de requisições** · **bytes no destino** · **o destino visto** · **a resposta.**

**13. O sinal mais revelador**

**O byte que ninguém pôs.** **Se o destino recebe mais do que a origem mandou, alguém duplicou** — **e
a duplicação é a discordância.**

**14. A contar 1 e B contar 2**

**Discordância de framing.** **E a segunda requisição não passou pelo filtro.**

**15. O destino receber path diferente**

**Normalização divergente** — **e o path que ele viu foi escolhido por quem montou o payload.**

**16. O desvio mais grave**

**A resposta conter dado de outra requisição.** Porque **a discordância não é sobre parsing — é
sobre IDENTIDADE.** **Duas requisições foram tratadas como uma.**

**17. Cache poisoning em termos de discordância**

**Duas implementações discordam sobre o que é "a mesma chave"** — **e o cache serve a resposta de uma
requisição a outra.**

**18. Como instrumentar**

**Logar, por camada:** **o cliente o que mandou; o proxy quantas contou; o servidor quantas contou e
qual PATH.**

**19. Quantos destinatários**

**Um por camada** — **mais a spec, se ela for a raiz.** **E cada um sabe do seu.**

**20. O que o proxy didático garante**

**Que ele aponta para 127.0.0.1** — **e o mesmo código apontado para fora seria smuggling.**

---

## Módulo 8 — WAFs e o caso WAFFLED

**1. Por que o WAF é uma implementação a mais**

Porque **ele parsa a mesma requisição** — **e o que ele faz com ela determina se o backend a
recebe.**

**2. Por que a discordância não é bug**

Porque **cada um faz o que promete.** **O WAF rejeita o ruim; o servidor aceita o bom.** **O
problema é a RELAÇÃO, não o código.**

**3. As seis dimensões**

**Objetivo** · **padrão de decisão** · **normalização** · **encoding** · **caso ambíguo** · **o que
faz com o resto.**

**4. O que cada um quer**

**O WAF quer REJEITAR o ruim; o servidor quer ACEITAR o bom.** **E as duas perguntas têm respostas
diferentes para o mesmo payload.**

**5. Por que as normalizações divergem**

Porque **o WAF normaliza para COMPARAR e o servidor para PROCESSAR** — **e os dois objetivos não
coincidem.**

**6. Qual componente explica tudo**

**O REPASSADOR.** **O WAF compara a forma normalizada e ENTREGA a original** — **e é entre as duas
que o bypass vive.**

**7. Os cinco pontos**

**Dupla decodificação** · **case** · **espaço / branco** · **ordem de normalização** · **parâmetro
duplicado.**

**8. O clássico**

**A dupla decodificação.** **O WAF decodifica `%2541` uma vez e vê `%41`, que não casa; o servidor
decodifica duas vezes e vê `A`.**

**9. O que o HPP explora**

**Qual parâmetro importa.** **O WAF checa o primeiro; o servidor usa o último.**

**10. O que os cinco têm em comum**

**Todos são NORMALIZAÇÃO** — **não parsing.** **É o que distingue do módulo 6.**

**11. Por que o WAF didático basta**

Porque **o mecanismo é transferível.** **O `WAFFLED` provou que existe em produtos reais; você
demonstra o conceito.**

**12. O que o `WAFFLED` mediu**

**120+ exploits contra 5 WAFs** — **produtos comerciais, mantidos.**

**13. As quatro combinações**

**Bloqueou / não executou** · **bloqueou / executou** · **passou / não executou** · ⚠ **passou /
executou.**

**14. Qual é impossível**

**Bloqueou e executou.** Porque **o que o WAF bloqueia não chega ao servidor.**

**15. O que define bypass**

**As duas condições medidas:** **o WAF passou, e o servidor executou.**

**16. A evidência**

**Dois logs** — **o veredito do WAF e o do servidor.** **Não uma impressão.**

**17. Falso positivo**

**A assinatura do WAF é mais LARGA que o perigoso real** — **e ele bloqueia pedido legítimo.** **É o
mesmo mecanismo ao contrário.**

**18. Quantos donos**

**Dois** — **o WAF e o servidor.** **E três, se a spec for a raiz.**

**19. O que não mencionar**

**Ao WAF, nada sobre o backend; ao servidor, nada sobre o WAF.** Porque **mencionar o outro expõe
sistema de terceiro — e frequentemente antes de ele estar corrigido.**

**20. Como declarar a outra parte**

**"Reportado separadamente".** **Você diz que existe outra parte, e não diz qual.**

---

## Módulo 9 — Cadência de ataque

**1. O que mudou em relação ao módulo 6**

**O módulo 6 é sobre ESPAÇO; este é sobre TEMPO.** **Até aqui a divergência era sobre o QUÊ; a
cadência é sobre o QUANDO.**

**2. As cinco razões**

**Timeout de cabeçalho** · **timeout de corpo** · **timeout de inatividade** · **buffer de
leitura** · **leitura incremental.**

**3. A mais subestimada**

**O buffer de leitura.** **Um lê em blocos de 4 KB e para no fim do bloco; outro lê até o fim do
disponível** — **e discordam sobre onde a leitura terminou.** **Não é tempo; é o tamanho da
leitura.**

**4. O que o buffer muda**

**Onde a leitura termina** — **e o que sobra é reinterpretado.**

**5. O que streaming e buffering mudam**

**Streaming repassa cada pedaço assim que chega; buffering espera o fim.** **Se o proxy já repassou
o cabeçalho e o servidor reconsidera, há uma JANELA.**

**6. As quatro classes**

**Framing** (espaço) · **cadência** (tempo) · **timing side-channel** (CPU) · **DoS por lentidão**
(recurso).

**7. O que separa cadência de timing side-channel**

**O alvo.** **A cadência é sobre o PARSING — o que é uma mensagem. O side-channel é sobre a
INFORMAÇÃO que o tempo de execução revela.**

**8. O que separa de DoS por lentidão**

**O objetivo.** **A cadência MEDE uma divergência; o slowloris EXAURE um recurso.**

**9. Por que o slowloris é outra linha**

Porque **o efeito é a NEGAÇÃO de serviço** — **e contra terceiro é crime.** **Timing e parsing não
são o alvo.**

**10. Quatro medições**

**N de mensagens** · **momento do corte** · **o que sobrou** · **o veredito.**

**11. O que a matriz temporal mostra**

**Cadências × implementações** — **e onde o comportamento diverge.**

**12. Por que o achado é um intervalo**

Porque **a divergência só aparece entre os dois timeouts** — **e o valor exato é um ponto dentro
dele.** **O achado é a região.**

**13. Em qual região está**

**Entre o menor e o maior timeout.** **Abaixo do menor, os dois desistem ou os dois aceitam; acima do
maior, o mesmo.**

**14. Código ou configuração**

**Configuração.** **E isso muda o destinatário:** **é o administrador que ajusta o timeout, não só o
desenvolvedor.**

**15. Quem corrige um timeout**

**Quem configura o componente** — **e, na raiz, quem mantém a especificação.**

**16. Como a cascata se aplica**

**Q1 — a spec decide? NÃO** (a spec não fala de timeout). **Q2 — não há spec a seguir.** **Q3 —
nenhuma viola.**

**17. Qual categoria**

**Categoria 2** — **ambiguidade da spec.** **Não é 3 porque não há spec violada.**

**18. O que a torna prática**

**A CONSEQUÊNCIA.** **A omissão produz uma discordância observável** — **mensagem extra ou recusa.**
**E aí deixa de ser acadêmico.**

**19. A quem reportar**

**Aos dois mantenedores** (o efeito) **e à especificação** (a omissão). **É um destinatário a mais
que os outros módulos.**

**20. O sinal prático**

**Você está contando MENSAGENS?** Pesquisa. **Está contando CONEXÕES ABERTAS?** ⚠ **Pare.**

---

## Módulo 10 — Projeto

**1. Por que o percurso**

Porque **é o que se acumula e o que se pode repetir.** **Um bypass sem percurso não ensina** — **e
não informa o próximo alvo.**

**2. Por que "não achou categoria 3" é válido**

Porque **concluir que "não há violação de spec neste par" é RESULTADO.** **E informa a escolha do
próximo alvo.**

**3. Por que a carta vem antes do corpus**

Porque **sem carta, o corpus é aleatório** — **e o método vira fuzzing.**

**4. O que é corpus de fronteira**

**Um caso por ponto de divergência**, mais as fronteiras e os ambíguos. **E não é:** **entradas
aleatórias, ou um corpus grande sem mapa.**

**5. Por que o controle é obrigatório**

Porque **sem ele você não sabe se os parsers funcionam** — **e uma discordância em tudo pode ser
erro do harness.**

**6. O caso ambíguo**

**A entrada que admite duas leituras.** **Importa porque não há resposta certa** — **e a
implementação escolhe.**

**7. Os sete tipos**

**Silêncio** · **`SHOULD`** · **`MAY`** · **ambiguidade** · **limite** · **ordem** · **extensão.**

**8. As quatro garantias**

**Não trava** · **não derruba** · **não inunda** · **não mente.**

**9. A que evita falsos positivos**

**"Não mente"** — **a normalização correta.**

**10. O que o harness não faz**

**Classificar · julgar · saber qual está certa · medir impacto · confirmar explorabilidade ·
reportar.**

**11. O critério de normalização**

**Ambiente sim, parser não.** **Na dúvida, não normalize.**

**12. As três categorias e o destino**

**Legítima** → nada · **ambiguidade** → o dono da spec · **viola a spec** → o mantenedor.

**13. Por que a categoria 2 é a armadilha**

Porque **parece achado e não é bug de implementação.** **O destino é outro.**

**14. Por que a categoria 3 não exige culpado**

Porque **a consequência objetiva resolve** — **e ela existe mesmo quando as duas são "defensáveis".**

**15. Consequência objetiva**

**Bytes que sobram viram mensagem** · **o filtro vê diferente do backend** · **duas requisições
compartilham a chave.**

**16. As três críticas do framing**

**Sobram bytes?** · **viram mensagem?** · **há caminho entre as camadas?**

**17. Por que "pode ser explorado" não autoriza**

Porque **é uma conclusão técnica, não uma permissão.** **Você descreve; o mantenedor decide.**

**18. Quantos destinatários**

**Um por camada** — **e a spec, quando a omissão é a raiz.**

**19. O que não mencionar**

**O comportamento do outro.** Porque **expõe terceiro — e frequentemente antes da correção.**

**20. Quando a spec é destinatária**

**Quando ela omite ou é ambígua.** Porque **corrigir nas implementações não resolve: o próximo
implementador erra igual.**

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| **Carta de divergência** | 20% | Pontos, tipos, impacto, prioridade |
| **Corpus de fronteira** | 20% | Um caso por ponto, com mapa |
| **Isolamento verificado** | 15% | As N no lab, rede fechada |
| **Classificação pela cascata** | 25% | Categorias e destinatários |
| Evidência literal | 10% | Comando, saída, contagens |
| Limitações | 10% | O que não verificou |

**Penalidades automáticas:**

- Apontou para serviço de terceiro: **lab zerado**.
- Testou WAF de produção: **lab zerado**.
- Exauriu recurso: **lab zerado**.
- Corpus aleatório, sem carta: −25%.
- Classificação sem a cascata: −20%.
- Evidência sem o comando literal: −15%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| **Alvo** | escolhido por gosto | com critério | **+ fonte oficial declarada** |
| **Carta** | ausente | pontos listados | **+ tipos + impacto + prioridade** |
| Lab | uma implementação | duas | **+ verificação automática** |
| **Corpus** | aleatório | com casos | **+ um por ponto + mapa + controle** |
| Harness | roda | com timeout | **+ as quatro garantias** |
| **Classificação** | "são diferentes" | categorias | **+ cascata + consequência + falsos positivos** |
| Relatório | descreve | com evidência | **+ o que prova e o que não prova** |
| Destinatários | um | separados | **+ o que não mencionar a cada um** |
| Não fiz | ausente | 1 item | **5+ itens** |
| Conduta | ausente | menciona | **todas as caixas** |
| **Nada achado** | — | — | **✓ ainda é exemplar se o percurso está completo** |

**Os dois itens de maior valor:**

1. **A carta de divergência** — porque **sem ela o corpus é aleatório, e o método vira fuzzing.**
2. **A classificação pela cascata** — porque **é a habilidade central: separar divergência
   legítima de bug.**

---

*Material didático original, de propósito defensivo e de pesquisa. Comparação entre implementações
no laboratório próprio, ou com autorização escrita. Nenhum payload é enviado a serviço de terceiro.
O achado é reportado ao mantenedor — nunca usado contra sistema alheio.*
