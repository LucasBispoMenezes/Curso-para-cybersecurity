# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos onze módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — O desync como consequência

**1. O que o atacante injeta**

**Nada.** Ele escreve bytes que **dois parsers leem de forma diferente** — e a discordância entre os
dois é o ataque.

**2. O que é o desync, e por que o termo é mais preciso**

**Os dois parsers ficam com estados diferentes.** **"Smuggling" sugere esconder um pedido e que o
ataque acaba ali; "desync" diz que o estado deslocado **persiste**.**

**3. A diferença de vítima**

**No smuggling, o efeito é no próprio pedido; no desync, no pedido de quem vem depois.** **A vítima
deixa de ser o atacante e passa a ser **uma terceira pessoa**.**

**4. As quatro classes**

**Smuggling** (pedido escondido — bypass) · **desync** (estados divergentes — idem, mais amplo) ·
**cache poisoning** (a resposta de um servida a outro — envenenar) · **client-side** (o navegador
como camada — afeta a vítima).

**5. O que o cache poisoning amplia**

**O alcance.** **Não atinge só quem vem depois na fila** — **atinge **todos** que pedirem a chave
envenenada, enquanto durar o TTL.**

**6. Os cinco efeitos**

**Bypass de autenticação** · **acesso a endpoint interno** · **vazamento** · **spoofing de usuário** ·
**envenenamento de cache**.

**7. O mais valioso**

**O bypass de autenticação.** Porque **o atacante não rouba credencial** — **ele faz a requisição
**cair fora** do caminho autenticado.**

**8. Por que o bypass não é "roubar credencial"**

Porque **o prefixo de uma requisição legítima vira o começo de outra** — **e o que sobra não tem os
headers.** **Não há roubo; há deslocamento.**

**9. O que não dá**

**Execução de código** · **RCE direto** · **não funciona se as duas camadas concordam** · e **não é
determinístico em tráfego real.**

**10. Por que o timing importa**

Porque **o desync depende da **ordem** em que as requisições chegam** — **e num servidor ocupado a
ordem é imprevisível.** **Os pesquisadores testam com o servidor **calmo** e confirmam com uma
requisição de **limpeza**.**

**11. O que o backend precisa logar**

**O path, os headers, o corpo e a contagem.** **Sem isso, o lab não mede** — **e você fica
afirmando sem ver.**

**12. O que acontece sem log**

**Você não vê o desync** — **porque o efeito é o que o backend **viu**.** **O lab deixa de ser
instrumento e vira suposição.**

**13. As cinco pastas**

**`frontends/`** (as configs de proxy) · **`backends/`** (os servidores — o instrumento) ·
**`harness/`** (o medidor) · **`evidencia/`** (os logs literais) · **`caderno/`** (o módulo 3 do
Pesquisa).

**14. Por que duas camadas bastam**

Porque **o mecanismo só precisa de **duas** que discordem.** **É o mínimo e é o suficiente** — **o
que muda entre um lab e um ataque é o destino.**

**15. Por que não reproduzir com CDN**

Porque **é o cenário dos artigos** — **e é o que você **não** roda contra terceiro.** **Você
reproduz o **mecanismo**, com camadas suas.**

**16. O critério de escolha do primeiro par**

**Proxy + backend simples** · **config legível** · **backend que loga** · **uma camada só** · **não é
CDN** · **não é HTTP/2 ainda**.

**17. Por que o backend é o instrumento**

Porque **o desync é o que ele **viu**.** **A medida é a contagem dele** — **e a prova é a marca no
log dele.**

**18. O que é o controle**

**Uma requisição normal, antes do ataque.** **Sem ele, você não sabe se o desync é o ataque ou o seu
lab quebrado.**

**19. O que muda entre um lab e um ataque**

**O destino.** **A técnica é a mesma** — **e é por isso que a linha é o endereço, não o método.**

**20. A regra sobre 127.0.0.1**

**Tudo roda em 127.0.0.1.** **E o isolamento se **verifica** — com um teste que falha.** **Um
smuggler funcional contra terceiro é crime consumado.**

---

## Módulo 2 — O protocolo e as camadas

**1. Por que a persistência é o pré-requisito**

Porque **sem ela não há **estado** a deslocar.** **O HTTP/1.0 fechava a conexão a cada pedido; o
`keep-alive` criou o estado** — **e o estado é o que se dessincroniza.**

**2. O que mudou do 1.0 para o 1.1**

**A conexão passou a persistir por padrão.** **E o servidor passou a precisar **inferir** onde cada
requisição termina.**

**3. O que o `Connection: close` faz**

**Elimina o smuggling entre requisições** — **porque não há estado a deslocar.** **É a defesa 3 do
módulo 10.**

**4. E o valor ausente em H1.1**

**Significa persistir** — **porque o padrão mudou.** **E muita implementação antiga assume o
contrário.** **É a armadilha.**

**5. As cinco operações**

**Parse** · **normalize** · **decide** · **reencode** · **forward**.

**6. Qual decide a imunidade**

**A 5 — `forward`.** Porque **a camada que repassa o **original** mantém a divergência; a que repassa
o **normalizado** a elimina.**

**7. O que um proxy que normaliza faz**

**Reconstrói a mensagem a partir do que **ele entendeu**.** **O backend nunca vê os bytes
originais** — **e a divergência deixa de existir.**

**8. Por que a idade não explica a imunidade**

Porque **é a **arquitetura**, não a data.** **Um produto antigo que normaliza é imune; um novo que
repassa o original não é.**

**9. Três camadas vulneráveis**

**Proxy reverso** · **WAF** · **CDN** — **todas entregam os bytes originais.**

**10. Qual operação pode CRIAR a divergência**

**O `reencode`.** **Exemplo:** a ponte **H2 → H1**, que **fabrica** o H1 malformado a partir de um H2
válido.

**11. As três condições**

**Conexão persistente** · **duas camadas que discordam** · **a camada A repassa o original**.

**12. O que fazer sem persistência**

**Encerrar** — **não há o que testar.**

**13. O que fazer se não achar divergência**

**Mudar a **variante**, não o alvo.** **"Não achei" não é "não há".**

**14. Por que "não achei" não é "não há"**

Porque **você testou **uma** variante** — **e o espaço tem dez.** **A ausência de resultado numa
variante não diz nada sobre as outras.**

**15. Como se mede a regra de framing**

**Manda-se o payload ambíguo pelo frontend e lê-se o **log do backend** — quantas requisições ele
viu.**

**16. Os três resultados possíveis**

**O backend viu 1** (o frontend usa CL) · **viu 2** (usa TE) · **o frontend deu 400** (rejeitou).

**17. Qual é a defesa**

**A rejeição.** **Um proxy que rejeita a ambiguidade é imune** — **e é o que a spec moderna
recomenda.**

**18. Onde está a prova do desync**

**Na marca** — **a string que o atacante escreveu, aparecendo no log do backend.** **É literal e não
depende de interpretação.**

**19. O que o reencode faz com a divergência**

**Pode eliminar** (se normaliza) **ou **criar** (se fabrica uma forma nova).** **Você não sabe sem
ler a config.**

**20. A linha sobre 127.0.0.1**

**Nenhum payload sai para fora.** **E o teste de isolamento é um `curl` que **falha**.**

---

## Módulo 3 — TE / CL, as combinações

**1. O que a RFC 2616 dizia**

**Era ambígua sobre a precedência entre `TE` e `CL`.** **É o silêncio inicial — e a origem do
problema.**

**2. O que a 9112 recomenda, e por que não basta**

**Rejeitar a mensagem.** **Não basta porque as implementações em produção são de antes** — **e um
proxy de 2012 fala com um backend de 2024.**

**3. Por que "remover o CL e usar o TE" é tolerância**

Porque **é uma alternativa à rejeição** — **e um proxy que "remove" o CL pode **repassá-lo** ao
backend.** **E aí o backend usa um header que o proxy já descartou.**

**4. As cinco variantes**

**CL.TE** · **TE.CL** · **TE.TE** · **CL.CL** · **CL.0**.

**5. Em qual o frontend usa CL**

**CL.TE** — o frontend usa `Content-Length`; o backend, `Transfer-Encoding`.

**6. Quem mente em cada**

**CL.TE:** mente no `Content-Length` (menor que o corpo real). **TE.CL:** o chunk está certo, e o
`CL` mente.

**7. A diferença de encaminhamento**

**Em CL.TE o frontend repassa **tudo**** (consumiu menos, e o resto fica no socket). **Em TE.CL ele
repassa **menos** — e o backend **espera mais**.**

**8. Por que o frontend não "descarta"**

Porque **ele consumiu N bytes e repassou.** **O que sobra fica no **socket** — e é repassado quando
houver mais dados.**

**9. O que caracteriza o TE.TE**

**Os dois usam TE, e **um não reconhece** o header** — por causa de uma ofuscação.

**10. Quatro ofuscações**

**`xchunked`** · **`chunked `** (espaço no fim) · **`CHUNKED`** (case) · **`Transfer-Encoding :`**
(espaço antes dos dois pontos).

**11. A mais elegante**

**O espaço antes do `:`.** Porque **é **inválido** pela spec, e muitos parsers aceitam, outros não.**
**É a mesma divergência, num só header.**

**12. Quatro comportamentos do CL.CL**

**Rejeitar** (imune) · **usar o primeiro** · **usar o último** · **somar**.

**13. Por que a spec mudou para rejeitar**

Porque **há mais de dois comportamentos possíveis** — **e a única forma de garantir que as duas
camadas concordem é **não aceitar** a ambiguidade.**

**14. O que é o CL.0**

**Um `Content-Length`, e o backend **ignora** o corpo.** **Usa um header só porque o problema não é
o header — é o **fluxo de controle** do backend.**

**15. Três lugares onde o backend ignora**

**Endpoint que só faz GET** · **backend estático** · **handler que responde antes de ler o corpo.**

**16. Por que o WAF + backend rende mais**

Porque **o WAF lê o `CL` e valida o corpo como "inofensivo"; o backend ignora o corpo** — **e o
corpo se torna a próxima requisição, **sem passar pelo WAF**.**

**17. Por que o CL.0 é a variante moderna**

Porque **não depende de ambiguidade de header** — **depende do fluxo de controle.** **E responder
antes de ler é **comum** por performance.**

**18. O que todas as cinco dependem**

**Das três condições do módulo 2.** **A variante é o **mecanismo**; as condições são a
**existência**.**

**19. Qual é a prova do desync**

**A string que você escreveu aparecendo no log do backend.** **Não a interpretação.**

**20. Qual categoria da cascata**

**A 3 — viola a spec.** Porque **a spec decide (rejeitar), e as implementações não seguem.** **Há
spec violada.**

---

## Módulo 4 — Outras variantes de H1

**1. Por que não precisa de dois headers**

Porque **a discordância basta que os dois parsers **não concordem sobre qual header é válido**.** **Um espaço pode ser a diferença inteira.**

**2. Seis formas de espaço**

**`CL: 6 `** (no fim) · **`CL : 6`** (antes do `:`) · **`CL:\t6`** (tab) · **`CL:  6`** (dois) ·
**` CL: 6`** (no início) · **`CL:6 `** — **e a tolerância varia por parser.**

**3. Por que um byte é suficiente**

Porque **o parser que **não converte** o valor usa `0`** — **e o que converte usa `6`.** **As duas
contagens divergem, e o desync está montado.**

**4. O que acontece quando um parser não converte**

**Ele assume `0`** — **trata como se não houvesse corpo** — **e o corpo declarado fica no socket.**

**5. O que é obs-fold**

**A continuação de header** — **uma linha que começa com espaço ou tab continua a anterior.**

**6. O que a 9112 diz**

**Rejeitar.** **Foi deprecado na 7230 e proibido na 9112.**

**7. Por que obs-fold é variante**

Porque **parsers antigos **aceitam**, e novos **rejeitam**.** **E a deprecação criou a divergência.**

**8. Cinco formas de chunk**

**`5 ;ext`** (espaço antes do `;`) · **`+5`** (sinal) · **`0x5`** (hex) · **`05`** (zero à
esquerda) · **`FFFFFFFF`** (overflow).

**9. O que o overflow no chunk explora**

**Um tamanho gigante** — **um parser estoura, outro rejeita.** **É a variante de overflow no
parser.**

**10. O que o espaço antes do `;` tem em comum**

**É a mesma forma do espaço antes do `:`** — **um espaço onde a spec não o permite, e a tolerância
diverge.**

**11. O que o CRLF no nome explora**

**O que o parser **aceita** no nome do header.** **A spec permite só `token` characters; a validação
diverge.**

**12. Como a contagem de headers pode divergir**

**Um header que o frontend vê como **dois** e o backend vê como **um**** (ou vice-versa). **A
contagem divergente é a discordância.**

**13. As 12 variantes**

**CL.TE · TE.CL · TE.TE · CL.CL · CL.0 · espaço no valor · espaço antes do `:` · obs-fold · chunk
malformado · CRLF no nome · H2→H1 · client-side.**

**14. Quais precisam de nada**

**As de espaço e obs-fold.** **Vêm primeiro porque **custam um byte** e não exigem preparação.**

**15. Quais precisam de conversão**

**As de H2 → H1.** **Exigem que o proxy traduza** — **e é o módulo 6.**

**16. O que a tabela é**

**O espaço de busca** — **não a lista de bugs conhecidos.** **Você a leva para um alvo novo.**

**17. Por que gerar o espaço é diferente**

Porque **testar um payload é uma tentativa; gerar o espaço é **sistemático**.** **E o espaço é
finito** — **o que garante que a varredura tem fim.**

**18. O que o harness reporta**

**Candidatos** — **não conclusões.** **Ele dá a contagem e a saída; a classificação é sua.**

**19. Por que a rejeição é resultado**

Porque **um frontend que rejeita a forma é **imune àquela variante**.** **É informação positiva** —
**e evita que você a teste de novo.**

**20. De quem é a tolerância, e por que importa**

**De um dos dois — e saber qual determina a direção do desync.** **Se é o frontend que tolera, o
desync vai numa direção; se é o backend, na outra.**

---

## Módulo 5 — O lab e o harness de desync

**1. Por que a contagem é a medida**

Porque **você não "vê" um desync — você o **conta**.** **E a diferença entre a contagem de duas
camadas é o fenômeno.**

**2. Os três requisitos da cadeia real**

**Container sem rede** · **config visível** · **log por camada**.

**3. Qual nível começar**

**Produto leve** — nginx como frontend e um backend seu, com log. **É o melhor equilíbrio entre
realismo e controle.**

**4. Por que não começar com três camadas**

Porque **cada camada multiplica as combinações de regra.** **Com duas, você tem uma variável; com
três, tem três pares.**

**5. Qual diretiva do nginx decide**

**`chunked_transfer_encoding`.** Porque **decide se ele **reencoda** — e reencodar pode eliminar ou
criar a divergência.**

**6. Cinco diretivas que revelam a regra**

**`proxy_http_version`** · **`proxy_pass`** · **`proxy_set_header`** · **`client_max_body_size`** ·
**`chunked_transfer_encoding`**.

**7. O que o reencode pode fazer**

**Eliminar** a divergência (normalizando) **ou **criar** uma nova** (fabricando uma forma que a
próxima lê diferente). **É o mecanismo do H2→H1.**

**8. As quatro saídas**

**Sem efeito** · **desync** · **rejeitado** · **indeterminado**.

**9. O que distingue a 3 da 4**

**A 3 tem resposta (4xx); a 4 não tem nada.** **"Rejeitado" é conclusão; "indeterminado" é ausência
de conclusão.**

**10. Por que confundir as duas gera erro**

**Nos dois sentidos:** **declarar imune um alvo que só deu timeout** — **e declarar desync um que só
travou.** **Os dois relatórios são falsos.**

**11. Quatro causas da indeterminada**

**Timeout do harness** · **o frontend fechou a conexão** · **payload grande demais** · **o desync é
assíncrono.**

**12. Por que o desync pode ser assíncrono**

Porque **depende da **ordem de chegada**** — **e num servidor ocupado a ordem é imprevisível.** **Um
resultado indeterminado pode ser um desync que não se concretizou naquele instante.**

**13. As cinco partes do harness**

**O payload** · **o limpo** · **o contador** · **o leitor de resposta** · **o classificador**.

**14. O que a limpeza revela**

**O deslocamento** — **porque é ela que cai no lugar errado.** **É mais forte que a marca, porque o
desync é sobre a **próxima** requisição.**

**15. As três medidas**

**A contagem** · **a marca** · **a resposta.** **A marca é a mais forte.**

**16. Por que a marca é mais forte**

Porque **é **literal**:** **a string que você escreveu apareceu onde não devia.** **Não depende de
interpretação nem de timing.**

**17. O que o harness não conclui**

**Se há um bug.** **Ele dá a medida e a saída** — **e a classificação é o Parser Differentials,
módulo 3.**

**18. Os sete itens da evidência válida**

**Versão** de cada camada · **config literal** · **payload em bytes** · **log literal** · **comando
exato** · **determinismo declarado** · e o **"não fiz"**.

**19. Por que declarar o determinismo**

Porque **um desync que funciona 1 em 10 vezes é um achado** — **mas quem lê precisa saber a taxa.**
**Declarar "sempre funciona" quando não é torna o relatório falso.**

**20. O que separa um relatório de uma alegação**

**Os sete itens.** **Sem eles, o leitor não pode reproduzir** — **e não pode confirmar nada.**

---

## Módulo 6 — HTTP/2 e o descenso

**1. Por que o H2 não tem smuggling**

Porque **a mensagem é fatiada em **frames com tamanho explícito**.** **Não há limite a inferir** —
**e sem limite inferido, não há aposta a errar.**

**2. O que a ponte cria**

**Uma camada de tradução** — **e tradução é uma camada a mais para discordar.** **O proxy **fabrica**
o H1 a partir do H2.**

**3. Quatro coisas que o H2 proíbe**

**Nomes com maiúscula** · **o campo `Connection`** · **o `Transfer-Encoding`** · **qualquer
caractere inválido no nome.**

**4. Por que a proibição vira variante**

Porque **a proibição existe no lado do **cliente**, e a tolerância no lado do **proxy**.** **Um
proxy tolerante aceita o que o H2 proíbe — e o **converte**.**

**5. O H2.CL, nos três lados**

**Cliente H2:** manda `content-length: 0` e um corpo no frame. **Proxy:** confia no
`content-length` do H2. **Backend H1:** recebe o CL convertido **e o corpo inteiro.**

**6. O H2.TE**

**O cliente manda `transfer-encoding: chunked` no H2** (proibido) — **o proxy tolerante aceita e
converte para H1** — **e o backend lê em chunks.**

**7. Por que o cliente H2 não faz nada de errado**

Porque **ele manda um H2 **válido**.** **A malformação nasce na **conversão**.**

**8. O que o proxy faz que cria a divergência**

**Ele converte um header que o H2 não deveria ter** — **e o entrega em H1, onde ele **manda**.**

**9. Qual variante do módulo 3 o descenso produz**

**O CL.0** — **produzido pela conversão.** **O backend não lê o corpo, e os bytes ficam no socket.**

**10. O que o CRLF no nome explora**

**O que o proxy aceita no nome do header.** **Um `\r\n` embutido é rejeitado pelo H2** — **e um
proxy tolerante o escreve em H1, onde o CRLF **termina a linha**.**

**11. Os três requisitos para medir**

**Cliente H2** · **proxy que converte** · **backend que loga o H1**.

**12. Por que se mede do lado H1**

Porque **você não vê o H2 malformado** — **você vê o **H1 que o proxy gerou**.** **E é lá que a
divergência se manifesta.**

**13. O que o `:path` pode virar no H1**

**A linha de requisição** — **e um `\r\n` nele injeta uma linha nova.**

**14. Por que o cliente manda headers proibidos**

Porque **é o **proxy** que valida (ou não).** **Você testa a tolerância dele, não a do cliente.**

**15. O que o log do backend revela**

**Os headers que ele recebeu** — **e o header que você **nunca mandou** é a prova de que o proxy o
criou.**

**16. O achado mais forte**

**O header que você nunca mandou.** Porque **significa que o **proxy** o fabricou na conversão** —
**e não há outra explicação.**

**17. Por que o controle é obrigatório**

Porque **sem o normal, você não sabe se o seu cliente H2 funciona** — **e um descenso "em tudo" é um
bug no harness, não no alvo.**

**18. Quem cria o header**

**O proxy, na conversão.** **O cliente mandou um H2 válido; o proxy produziu o H1.**

**19. O que o proxy poderia fazer para ser imune**

**Validar os headers proibidos pelo H2 e rejeitar** — **em vez de tolerar e converter.**

**20. A linha sobre CDNs**

**Você reproduz o mecanismo com um nginx seu.** **Testar CDN de terceiro é crime** — **e a variante
é famosa justamente em CDNs.**

---

## Módulo 7 — Client-side desync

**1. O que muda no modelo**

**A discordância deixa de ser entre empresas e passa a ser **interna ao produto**.** **Não há proxy e
backend separados — há um produto com dois parsers.**

**2. Quem manda o payload**

**O navegador da vítima.** **O atacante só fornece a **isca** e o **JS**.**

**3. Quem é a vítima**

**O alvo.** **Ela não está "depois na fila" — ela **é** o alvo.**

**4. Alcance e restrição**

**Alcance: qualquer usuário.** **Restrição: exige que o navegador fale com o servidor de um jeito
específico** — **e os navegadores têm regras.**

**5. Cinco coisas que o navegador faz**

**Normaliza a URL** · **adiciona headers** · **reescreve o corpo** · **decide a conexão** ·
**aplica CORS**.

**6. O que a página consegue e não consegue**

**Consegue:** mandar requisição com corpo customizado (`no-cors`), e enviar parcialmente com stream.
**Não consegue:** **ler a resposta** (CORS), nem mandar headers arbitrários.

**7. Por que o CORS não impede**

Porque **o ataque não precisa de **leitura** — precisa de **desalinhamento**.** **A página manda e
não lê; e é o suficiente.**

**8. O que o stream permite**

**Mandar parte, esperar, e mandar o resto.** **É o controle de **cadência** do módulo 9 do Parser
Differentials** — **as duas pontas se encontram.**

**9. Como isso se liga ao módulo 9**

**A cadência é a variável que o `fetch` em stream permite controlar.** **E o desync depende dela.**

**10. As cinco condições**

**Conexão persistente** · **o servidor discorda de si mesmo** · **o navegador pode ser induzido** ·
**requisição controlável** · **o servidor responde antes de ler o corpo.**

**11. Quem provê cada uma**

**1 e 5: o produto.** **2: o produto.** **3 e 4: o atacante.**

**12. Por que a condição 2 muda o modelo**

Porque **o "frontend" e o "backend" são o **mesmo produto**:** **o parser do front (lê do navegador)
e o do pool (lê a conexão reusada).**

**13. Quem são o frontend e o backend**

**Os dois parsers do mesmo servidor:** **o que lê do cliente e o que lê do pool de conexões.**

**14. Os cinco passos**

**A vítima abre a página** · **a página manda a requisição envenenada** · **o servidor não lê o
corpo** · **a conexão é reusada** · **a segunda sai prefixada.**

**15. Qual passo o atacante não controla**

**O 4 — o reuso da conexão.** **É o **navegador** que decide** — **e ele tem heurísticas.**

**16. Por que o ataque é "às vezes"**

Por causa do passo 4. **O reuso não é garantido** — **e é por isso que o ataque não é
determinístico** — **e por isso ele é real.**

**17. Por que a página só pode apontar para local**

Porque **apontá-la para fora é **crime**.** **E induzir alguém a abri-la é **CSRF** — crime
autônomo.**

**18. O que induzir outra pessoa configura**

**CSRF** — **crime além do 154-A.** **Uma página que faz o navegador de terceiro mandar requisição
não autorizada.**

**19. O que o log do alvo revela**

**Os paths registrados** — **e um path com prefixo, ou uma requisição a mais, é o desync.**

**20. Por que declarar "não reproduzi" é obrigatório**

Porque **o reuso é heurístico.** **Um relatório que diz "sempre funciona" é falso** — **e o
mantenedor precisa saber a taxa.**

---

## Módulo 8 — Desync de cache

**1. Por que o cache é o maior alcance**

Porque **ele **armazena** a resposta ruim e a serve a quem pedir a chave.** **Não é "quem vem
depois" — são **todos**.**

**2. O que a vítima precisa fazer**

**Só pedir a URL envenenada.** **Não precisa estar na fila, nem abrir página nenhuma.**

**3. As três classes**

**Cache poisoning** · **cache deception** · **desync de cache**.

**4. O que distingue poisoning de deception**

**Poisoning armazena a resposta **do atacante**; deception armazena a resposta **privada** de
alguém.** **O primeiro envenena; o segundo expõe.**

**5. Por que o efeito é permanente**

Porque **o cache serve a resposta guardada até o **TTL** expirar** — **e o TTL pode ser horas ou
dias.**

**6. Seis componentes da chave**

**Path** (quase sempre) · **query** (depende) · **`Host`** (depende) · **encoding** (às vezes) ·
**`X-`** (⚠ quase nunca) · **método** (depende).

**7. Por que o `X-Forwarded-Host` é clássico**

Porque **não entra na chave, e o backend o usa para montar URLs.** **O cache armazena a resposta com
o host do atacante.**

**8. O que o desync acrescenta**

**Não depende de header refletido.** **A **posição** no stream faz o backend ver outra requisição** —
**e o cache associa a resposta a uma chave pública.**

**9. As duas discordâncias**

**Sobre o limite** (o framing) **e sobre a chave** (o cache). **O efeito é o **produto** delas.**

**10. Os cinco passos**

**O atacante manda a sequência** · **frontend e cache veem uma** · **o backend vê duas** · **a
resposta da segunda é armazenada** · **a vítima pede a URL.**

**11. O que o passo 4 multiplica**

**O alcance.** **E a vítima não precisa de nada além de pedir a URL.**

**12. O que o atacante escolhe**

**O path** (a chave) · **o header** (o que o cache ignora) · **o momento** · **o payload**.

**13. Por que o momento importa**

Porque **se o cache já tem a chave, o pedido do atacante não a substitui.** **É por isso que ele
escolhe uma URL que **ninguém pediu**.**

**14. As quatro medições**

**A chave envenenada?** · **sem o header?** · **de outra sessão?** · **quanto dura?**

**15. Qual caracteriza**

**A resposta alterada chegar a quem **não mandou nada**.** **Se precisa do header, é reflexo.**

**16. O que distingue reflexo de envenenamento**

**O alcance.** **Reflexo só afeta quem manda o header; envenenamento afeta todos.**

**17. O que tornaria o cache imune**

**Incluir **todos** os headers na chave** — **ou validar o framing.**

**18. Por que o `Cache-Control` importa**

Porque **sem uma diretiva cacheável, a resposta não é armazenada** — **e não há envenenamento.**

**19. Quantos destinatários**

**Dois:** **o cache** (a chave) **e o backend** (o uso do header). **E cada um sabe do seu.**

**20. O que cada um confirma**

**O cache:** por que o `X-Forwarded-Host` não entra na chave? **O backend:** por que usa o header na
resposta?

---

## Módulo 9 — Encontrar a variante

**1. O que você faz numa variante**

**Varre um espaço.** **O espaço é definido pela **carta**, não pela imaginação** — **e ele é
finito.**

**2. A pergunta única**

**"O que esta camada **entrega** à próxima?"** **Se entrega os bytes originais, ela mantém a
divergência viva.**

**3. O padrão, e o que tem de igual**

**Onde a spec deixa em aberto** → **onde o framing é inferido.** **A pergunta que atravessa** →
**"este produto lê com qual regra?"** **Liste as implementações** → **liste as variantes.**
**Verifique por leitura** → **leia a config.**

**4. O que o reencode pode fazer**

**Eliminar** ou **criar** a divergência. **Você não sabe sem ler a config.**

**5. As cinco faixas de custo**

**Um byte** (espaço, obs-fold) · **dois headers** (CL.TE, TE.CL, TE.TE, CL.CL) · **backend que não
lê** (CL.0) · **conversão** (H2→H1) · **navegador** (client-side).

**6. Por que começar pelo barato**

Porque **custa um byte e não exige preparação** — **e frequentemente funciona.** **Montar o cliente
H2 antes de testar um espaço é desperdício.**

**7. O que a carta contém**

**A variante** · **o que ela exige** · **a cadeia tem?** · **a prioridade** · **o que não testei**.

**8. Por que a coluna "a cadeia tem?" filtra**

Porque **se a cadeia não faz conversão H2→H1, a variante 9 não se aplica** — **e você não perde
tempo.**

**9. Por que listar as descartadas**

Porque **declarar **por que** uma variante não se aplica é parte do método** — **e mostra que a
varredura foi completa, não preguiçosa.**

**10. O que a hipótese precisa ter**

**Critério de falsificação.** **Sem ele, a carta é uma lista.**

**11. O que o `smuggler` faz e não faz**

**Faz:** testa as variantes conhecidas e reporta candidatos. **Não faz:** **julgar o resultado** —
**o "possível" dele é heurístico.**

**12. Por que o timing é frágil**

Porque **é o sinal mais **indireto**** — **e o que produz **falso positivo**.** **Você confirma com a
contagem no log.**

**13. O que dá candidato e o que dá prova**

**A ferramenta dá candidato; o log dá prova.**

**14. O que é a prova, em uma frase**

**A string que você escreveu aparecendo onde não devia.**

**15. As quatro saídas e a ação**

**Sem efeito** → teste outra · **desync** → reproduza e documente · **rejeitado** → imune, registre ·
**indeterminado** → reconfira.

**16. O que fazer quando acha**

**Parar e documentar com cuidado:** **payload, log, contagem.** **Documentar bem um achado vale mais
que varrer o resto.**

**17. O que fazer com o indeterminado**

**Reconferir antes de seguir.** **Senão a conclusão errada vem depois.**

**18. O que significa "nada nesta faixa"**

**Que as variantes de prioridade 1–3 não funcionaram neste alvo.** **E que as de prioridade 4+ ainda
não foram testadas.**

**19. Por que "nada" é resultado**

Porque **informa que a próxima tentativa deve ser outra faixa** — **e informa a escolha do próximo
alvo.** **Não é fracasso; é dado.**

**20. O que declarar quando não se acha nada**

**O que foi testado, o que **não** foi, e o que isso significa.** **O "não testei" é obrigatório.**

---

## Módulo 10 — Detecção e defesa

**1. Por que a defesa não é "corrigir o parser"**

Porque **nenhum dos dois está errado isoladamente.** **A defesa é fazer as **duas camadas
concordarem**.**

**2. As quatro defesas**

**Rejeitar** a ambiguidade · **normalizar** antes de repassar · **fechar a conexão** · **separar o
pool** — **e não fazer cache.**

**3. Quais eliminam a classe**

**Rejeitar** e **normalizar**. **Porque atacam a causa — a divergência — e não o efeito.**

**4. A defesa ideal, e por que é rara**

**Normalizar antes de repassar.** **É rara porque exige que a camada **reconstrua** a mensagem** —
**o que custa performance e pode quebrar clientes legados.**

**5. As cinco razões pelas quais a defesa é difícil**

**Duas camadas, dois times** · **tolerância por compatibilidade** · **a spec antiga** · **normalizar
custa** · **o desync é assíncrono.**

**6. Por que a spec antiga é estrutural**

Porque **um proxy de 2012 segue a RFC 2616, que era ambígua.** **Ele não é "bugado" — é **da
época**.** **E atualizar custa.**

**7. Por que o desync é difícil de detectar**

Porque **ele não produz erro no log do atacante** — **produz uma requisição estranha **no log de
outra pessoa**.**

**8. Seis regras de detecção**

**Dois `CL`** · **`TE` + `CL`** · **`TE` com valor estranho** · **espaço antes do `:`** · **path com
CR/LF** · **requisição muito lenta.**

**9. Quais não têm falso positivo**

**Dois `CL`**, **`TE` + `CL`**, **path com CR/LF**. **Porque a spec diz que a mensagem é inválida** —
**rejeitar é conforme.**

**10. Por que a lentidão é ruim**

Porque **timeouts são normais** — **e uma regra que dispara em tráfego normal é uma regra que o time
desliga.**

**11. O que fazer com dois `CL`**

**Rejeitar a requisição.** **A spec manda, e não há falso positivo.**

**12. Por que monitorar não é defender**

Porque **o produto continua **vulnerável**.** **O alerta informa; não impede.**

**13. Como medir o efeito de uma defesa**

**Roda-se a mesma varredura antes e depois** — **e conta-se quantas variantes passaram de DESYNC
para REJEITADO.**

**14. Três recomendações para o proxy**

**Rejeitar a mensagem ambígua** · **normalizar antes de repassar** · **não repassar o `CL` quando há
`TE`.**

**15. O que o backend deve fazer**

**Não confiar no `CL` recebido** · **ler o corpo sempre** · **rejeitar `CL` duplicado.**

**16. O que o cache deve fazer**

**Incluir todos os headers na chave** · **não cachear respostas com header não-chave** ·
**`Cache-Control: private` onde couber.**

**17. O que NÃO é defesa**

**Monitorar e alertar** · **um WAF na frente** · **"atualizar o produto"** (vago).

**18. Por que o WAF pode piorar**

Porque **é uma camada **a mais**** — **e camada a mais é oportunidade a mais de divergir.** **Um WAF
que já foi explorado por parser differential é a prova.**

**19. A recomendação principal**

**Normalizar a mensagem antes de repassar.** **É a única que **elimina** a classe sem depender de a
spec ser seguida.**

**20. Como o relatório de defesa difere**

**O de ataque descreve a divergência; o de defesa diz o que fazer** — **e distingue **eliminar** de
**reduzir**, porque são recomendações diferentes.**

---

## Módulo 11 — Projeto

**1. Por que o percurso**

Porque **é o que se acumula e o que se pode repetir.** **Um desync sem percurso não ensina** — **e
não informa o próximo alvo.**

**2. Por que "varri e não achei" é resultado**

Porque **concluir que a cadeia não divergiu nas faixas testadas é **dado**.** **Informa que a
próxima tentativa deve ser outra faixa ou outro alvo.**

**3. Por que a carta vem antes**

Porque **sem carta, a varredura não tem **ordem** nem **fim**.**

**4. O que "a cadeia tem?" filtra**

**As variantes cuja condição o alvo não satisfaz** — **evitando que você gaste tempo com elas.**

**5. Por que listar o que não se aplica**

Porque **mostra que a varredura foi **completa**, e evita que o leitor ache que você esqueceu.**

**6. O que a varredura ordena**

**Do barato ao caro.** **Começa pelo que custa um byte.**

**7. Por que começar pelo barato**

Porque **não exige preparação** — **e **frequentemente funciona**.**

**8. As quatro saídas e a ação**

**Sem efeito** · **desync** · **rejeitado** · **indeterminado** — **com a ação de cada.**

**9. O que fazer com o indeterminado**

**Reconferir**, porque **senão vira conclusão errada** — **nos dois sentidos.**

**10. Qual é a medida mais forte**

**A marca.** Porque **é literal** — **não depende de interpretação nem de timing.**

**11. O que a marca prova**

**Que a string que você escreveu apareceu onde não devia** — **e a contagem sozinha não prova isso**
— **ela pode ser de outra requisição.**

**12. Por que declarar a reprodutibilidade**

Porque **o desync depende da ordem de chegada.** **Declarar "sempre" quando não é torna o relatório
falso.**

**13. As três condições**

**Persistência** · **camadas que discordam** · **repasse do original.**

**14. O que o backend precisa logar**

**Path, headers, corpo e contagem** — **porque é o instrumento de medida.**

**15. As três perguntas críticas**

**Sobram bytes?** · **viram mensagem?** · **há caminho entre as camadas?**

**16. O que a cascata classifica**

**A categoria:** **legítima, ambiguidade, ou viola a spec** — **e o destino de cada.**

**17. Quantos destinatários**

**Um por camada** — **mais a spec, se a omissão for a raiz.**

**18. O que não mencionar a cada um**

**O comportamento do outro.** Porque **expõe terceiro — e frequentemente antes da correção.**

**19. A recomendação de defesa mais eficaz**

**Normalizar antes de repassar** — **a única que elimina sem depender de a spec ser seguida.**

**20. O que separa este curso, quanto ao dano**

**A linha é mais estreita.** **Um smuggler funcional contra terceiro é crime **consumado** — não há
"acesso indevido sem intenção".** **O payload **é** a execução.**

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| **Carta de variantes** | 20% | Pontos, prioridade, descarte |
| **Isolamento verificado** | 15% | Tudo em 127.0.0.1, teste que falha |
| **Instrumentação** | 15% | O backend loga contagem, path e corpo |
| **As quatro saídas** | 20% | Corretamente atribuídas |
| ⚠ **A marca como prova** | 20% | Literal, não interpretada |
| Limitações | 10% | O que não testou |

**Penalidades automáticas:**

- Apontou para host de terceiro: **lab zerado**.
- Testou CDN, WAF ou serviço público: **lab zerado**.
- Usou o desync para acessar algo: **lab zerado**.
- Induziu outra pessoa a abrir página: **lab zerado**.
- Construiu exploit funcional: **lab zerado**.
- Varredura sem carta: −25%.
- Indeterminado tratado como "não funciona": −20%.
- Sem a marca como prova: −20%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| **Alvo** | escolhido por gosto | com critério | **+ config lida** |
| **Carta** | ausente | variantes listadas | **+ prioridade + descarte** |
| Lab | uma camada | duas | **+ verificação automática** |
| **Instrumentação** | sem log | loga | **+ contagem por camada** |
| **Varredura** | tentativa e erro | ordenada | **+ indeterminados tratados** |
| **Saídas** | "funcionou/não" | quatro | **+ a marca como prova** |
| Reprodutibilidade | ausente | menciona | **+ taxa declarada** |
| Relatório | descreve | com evidência | **+ o que prova e o que não prova** |
| **Destinatários** | um | separados | **+ o que não mencionar** |
| Defesa | ausente | sugere | **+ elimina × reduz** |
| Não fiz | ausente | 1 item | **6+ itens** |
| Conduta | ausente | menciona | **todas as caixas** |
| **Nada achado** | — | — | **✓ ainda é exemplar se o percurso está completo** |

**Os dois itens de maior valor:**

1. **A marca como prova literal** — porque **é o que distingue um achado de uma alegação**, e não
   depende de interpretação nem de timing.
2. **As quatro saídas corretamente atribuídas** — porque **é o que separa "não funciona" de "não
   sei"**, e é onde a maioria dos relatórios erra.

---

*Material didático original, de propósito defensivo e de pesquisa. Duas camadas ou mais, sempre no
laboratório próprio, ou com autorização escrita. Nenhum payload é enviado a serviço de terceiro. O
achado é reportado ao mantenedor — nunca usado contra sistema alheio. Request smuggling contra
infraestrutura de terceiro é crime (art. 154-A e 266).*
