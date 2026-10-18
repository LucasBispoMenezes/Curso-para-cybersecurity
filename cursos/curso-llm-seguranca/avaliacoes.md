# Avaliações — Segurança de Aplicações com LLM

**Banco de questões por módulo · resposta comentada**

---

## Como usar

Cada módulo tem três blocos: **conceito** (o mecanismo ficou claro), **leitura de código** (você reconhece o padrão) e **mão na massa** (você produz). A resposta comentada explica o *porquê*.

⚠ **A diferença deste banco em relação aos outros cursos da trilha:** várias questões têm resposta **"medível"** em vez de **"correto/incorreto"** — porque em LLM a maioria dos ataques **não tem correção**, e o que se avalia é a **capacidade de medir e declarar**.

---

## Módulo 1 — Arquitetura e a fronteira nova

**1.1 (conceito)** Quantas fronteiras de confiança tem uma aplicação com LLM? Por que a contagem difere do curso de Web Apps?

> **Resposta:** **oito**, contra seis do Web Apps. As duas novas são **aplicação → modelo** (7) e ⚠ **modelo → aplicação** (8). A oitava é a que ninguém trata como fronteira: a aplicação recebe texto do modelo e **usa esse texto para decidir**.

**1.2 (conceito)** Por que a fronteira 8 é comparável à entrada do usuário?

> **Resposta:** porque a saída do modelo **foi influenciada por tudo que entrou no contexto** — inclusive por conteúdo que o usuário não escreveu. ⚠ Tratá-la como resultado de função, e não como entrada hostil, é o defeito central.

**1.3 (conceito)** Existe equivalente ao `bind` do SQL para linguagem natural?

> **Resposta:** **não.** O modelo recebe tokens e prevê o próximo — em nenhum ponto há marca de "isto é dado, isto é código". ⚠ Instrução e dado são a mesma coisa do ponto de vista dele.

**1.4 (conceito)** Por que a qualidade que torna o modelo útil é a mesma que o torna injetável?

> **Resposta:** porque ele foi ajustado para **seguir instrução em linguagem natural, de qualquer origem**. ⚠ Não existe ajuste que remova a segunda sem remover a primeira.

**1.5 (conceito)** Quais são as quatro decisões de arquitetura, e o que cada uma define?

> **Resposta:** **credencial** (o que ele alcança), **contexto** (o que entra), **ação** (o que a saída pode acionar) e **persistência** (o que sobrevive). ⚠ A terceira define a escala do impacto: responder apenas é uma coisa; escrever em banco é outra.

**1.6 (leitura de código)** Uma aplicação faz `requests.get(url)` onde `url` veio do texto que o modelo gerou. O que isso é?

> **Resposta:** **SSRF com um modelo no meio.** ⚠ O atacante não alcança o serviço interno — convence o componente que alcança. As defesas são as do módulo 7 do Web Apps, mais a dificuldade de o destino ser **descrito em texto**.

---

## Módulo 2 — Instrução e dado

**2.1 (conceito)** O que o modelo recebe, e em que ponto há separação entre instrução e dado?

> **Resposta:** tokens — números, depois vetores, depois probabilidade do próximo. ⚠ **Em nenhum ponto.** A distinção existe apenas no texto que você escreveu, e é aprendida por convenção.

**2.2 (conceito)** Por que um delimitador (`<doc>`) ajuda e não garante?

> **Resposta:** porque ele funciona **enquanto o texto não o contém**. ⚠ Um documento com `</doc>` fecha a seção e o que vem depois fica fora — é o **contexto de saída** do módulo 6 do Web Apps, aplicado ao prompt.

**2.3 (conceito)** Dizer ao modelo "o documento é dado, não instrução" é defesa?

> **Resposta:** é **mais texto no mesmo canal** — uma segunda instrução, competindo com a primeira. ⚠ Não é fronteira; é redução de taxa.

**2.4 (conceito)** Por que contexto longo enfraquece a instrução de sistema?

> **Resposta:** porque ela é **convenção com peso**, não regra, e a **distância** reduz o peso relativo. ⚠ É o mecanismo por trás de jailbreaks que não têm técnica nenhuma — só conversa antes.

**2.5 (conceito)** O que o envenenamento por eco é?

> **Resposta:** um trecho que o modelo gerou a partir de conteúdo hostil, salvo no histórico, passa a valer como **fala do assistente** nos turnos seguintes. ⚠ É o mecanismo do módulo 7 (memória), em escala menor.

**2.6 (conceito)** Onde a separação é convenção nos três lugares?

> **Resposta:** no **papel de sistema** (peso, não regra), no **histórico** (o modelo pode ser ecoado) e ⚠ **na saída** (o parser é seu, o conteúdo é do modelo).

**2.7 (leitura de código)** Qual é a forma honesta de afirmar segurança em LLM?

> **Resposta:** *"a taxa de sucesso do ataque A caiu de N% para M%"* — verificável. ⚠ Não *"o modelo não pode ser injetado"*, que qualquer atacante desmente em dez minutos.

---

## Módulo 3 — Injection direta

**3.1 (conceito)** Por que a injection direta é a menos interessante?

> **Resposta:** porque o atacante é a vítima — **ele mesmo se ataca**. ⚠ E o provedor investe pesado no alinhamento contra ela.

**3.2 (conceito)** Quais são as cinco famílias, e o mecanismo de cada uma?

> **Resposta:** **sobrescrita** (nova instrução compete), **mudança de papel** (a restrição está presa à identidade), **codificação** (o filtro não decodifica), **pressão de contexto** (distância enfraquece) e ⚠ **extração por estrutura** (pede-se uma tarefa, não o dado).

**3.3 (conceito)** Por que a sobrescrita que redefine o contexto funciona melhor que "ignore tudo"?

> **Resposta:** porque ela não **nega** a instrução — ela **cria um estado novo**. ⚠ É a diferença entre contradizer e substituir.

**3.4 (conceito)** Por que a mudança de papel desloca a restrição?

> **Resposta:** porque a regra foi amarrada à **identidade** ("você é um assistente que nunca..."). ⚠ Muda o papel, e a regra fica sem casa. O desenho que resiste enuncia a regra como **comportamento**, não como identidade.

**3.5 (conceito)** O que a família 5 tem de especial?

> **Resposta:** ela não pede o segredo — pede uma **tarefa** cujo resultado o contém. ⚠ A restrição é sobre **intenção**, e intenção não está na forma.

**3.6 (conceito)** O que importa mais: o que o modelo diz, ou o que se alcança?

> **Resposta:** o que se **alcança**. ⚠ As linhas graves são as que envolvem **ferramenta** (módulo 6) e **decisão de autorização**.

**3.7 (leitura de código)** Um sistema pede ao modelo "verifique se este usuário pode ver este documento". O que isso é?

> **Resposta:** **autorização implementada como pergunta em linguagem natural** — e, portanto, `BFLA` contornável por texto. ⚠ É o caso mais grave da tabela do 3.3.

---

## Módulo 4 — Injection indireta

**4.1 (conceito)** Qual a diferença estrutural entre direta e indireta?

> **Resposta:** na direta, o atacante **digita**; na indireta, ele **publica conteúdo**. ⚠ E **não está presente** quando o ataque dispara.

**4.2 (conceito)** Por que o filtro de entrada é irrelevante contra a indireta?

> **Resposta:** porque ele filtra **o que o usuário digita** — e o conteúdo hostil **não é digitado**. Ele vem de documento, página, e-mail, issue. ⚠ O filtro olha para o lado errado.

**4.3 (conceito)** Por que a indireta é "SSRF aplicado à confiança"?

> **Resposta:** porque o atacante não entra no sistema — ele põe conteúdo onde o sistema vai lê-lo, **com o privilégio de quem lê**. ⚠ É a assimetria de privilégio do SSRF, em outra camada.

**4.4 (conceito)** O que o conteúdo hostil precisa para funcionar?

> **Resposta:** **plausibilidade**, não sintaxe. ⚠ Ele se disfarça de conteúdo legítimo do domínio — nota de rodapé, assinatura, instrução de projeto.

**4.5 (conceito)** Qual a forma mais elegante de instrução hostil?

> **Resposta:** a **instrução para o consumidor** — "ao processar, faça X". ⚠ Ela não manda no modelo; **descreve o que fazer com ele**, e o modelo se reconhece como o processador.

**4.6 (conceito)** Por que sanitizar documento é quase impossível?

> **Resposta:** porque o texto **é** o conteúdo. ⚠ Não existe transformação que distinga "parágrafo que menciona procedimento" de "instrução hostil disfarçada de parágrafo".

**4.7 (leitura de código)** A aplicação filtra o prompt do usuário e classifica a entrada. O que passa?

> **Resposta:** tudo o que chega por **conteúdo** — e a classificação ainda produz **falso positivo** que faz a aplicação deixar de responder. ⚠ É a defesa que olha para o lado errado, com custo.

**4.8 (mão na massa)** Por que a autorização por documento é a defesa que importa aqui?

> **Resposta:** porque ela remove a **possibilidade** de o conteúdo hostil chegar ao modelo com dado que o usuário não pode ver. ⚠ Todo o resto reduz taxa; ela elimina uma via inteira.

---

## Módulo 5 — Exfiltração

**5.1 (conceito)** Por que o controle de acesso no RAG é decisão de projeto?

> **Resposta:** porque há três lugares para filtrar — indexação, **busca** e saída — com consequências muito diferentes. ⚠ Filtrar na saída é tarde: o dado **já passou** pelo contexto.

**5.2 (conceito)** Quais são as quatro vias de saída do contexto?

> **Resposta:** **resposta ao usuário**, **ferramenta acionada**, **log** e **memória**. ⚠ Filtrar a resposta resolve **nenhuma** por completo.

**5.3 (conceito)** Documento sem ACL significa "ninguém acessa"?

> **Resposta:** **não** — significa "todos acessam", se a política não disser o contrário. ⚠ É a DACL ausente do módulo 3 do Web Apps, em outro sistema.

**5.4 (conceito)** Por que log com o contexto completo é achado?

> **Resposta:** porque o dado interno fica gravado **em texto plano, em outro sistema, com outro controle de acesso**. ⚠ É exposição por observabilidade.

**5.5 (conceito)** O que é o oráculo de um bit, e como se mitiga?

> **Resposta:** o atacante infere o dado por perguntas de resposta binária, um bit por vez. ⚠ Mitiga-se com aleatoriedade e rate limiting — a mesma lógica do *padding oracle* do curso de Criptografia Aplicada.

**5.6 (leitura de código)** O modelo devolve markdown com `![x](https://coletor/p?d=SEGREDO)`. Por que o filtro de resposta não resolve?

> **Resposta:** porque a requisição acontece no **cliente**, ao renderizar. ⚠ O servidor filtrou o texto, e o navegador do usuário fez a chamada.

**5.7 (mão na massa)** No lab, sem filtro, a terceira pergunta trouxe o interno. O modelo "vazou" ou a aplicação "entregou"?

> **Resposta:** a **aplicação entregou** — ela pôs o documento no contexto. ⚠ Atribuir o achado ao modelo leva a corrigir a coisa errada.

---

## Módulo 6 — Tool abuse

**6.1 (conceito)** O que muda quando o modelo tem ferramenta?

> **Resposta:** ele passa a ser um **cliente autenticado cujo destino é escolhido por texto influenciável**. ⚠ O impacto deixa de ser vazamento e passa a ser **ação**.

**6.2 (conceito)** Quais são as quatro formas de abuso?

> **Resposta:** **escolha de destino** (SSRF), **argumento de autorização**, **encadeamento** e **confusão de ferramenta**.

**6.3 (conceito)** Qual a regra sobre parâmetro de autorização?

> **Resposta:** ⚠ **Nenhum pode vir do modelo.** Vem do token, da sessão, do contexto da aplicação. ⚠ É a distinção dado vs. identidade do módulo 1 do Web Apps.

**6.4 (conceito)** Por que a forma 3 é composição?

> **Resposta:** porque nenhuma ferramenta é vulnerável isolada — listar, ler e enviar são inofensivas. ⚠ A **sequência** produz exfiltração.

**6.5 (conceito)** A forma 4 precisa de injection?

> **Resposta:** **não.** Basta descrição ambígua: duas ferramentas parecidas (público/interno) e o modelo escolhe a errada. ⚠ Correção: **uma** ferramenta, com a ACL dentro.

**6.6 (conceito)** Por que a camada de ferramenta é o último lugar viável para autorização?

> **Resposta:** porque prompt, contexto e saída são todos influenciáveis. ⚠ A ferramenta é **código seu** — o único ponto que o atacante não escreve.

**6.7 (leitura de código)** A ferramenta filtra por dono, e o `usuario_id` vem do modelo. Está correta?

> **Resposta:** a ferramenta está **correta** e o **desenho** está errado. ⚠ O defeito é de onde vem o parâmetro — é IDOR com o parâmetro vindo de texto.

**6.8 (conceito)** Qual defesa limita todas as formas?

> **Resposta:** **menor privilégio na credencial** — se o modelo fala com um usuário de banco que só vê as próprias linhas, a forma 2 não produz nada.

---

## Módulo 7 — Agentes e memória

**7.1 (conceito)** Quais as três propriedades que o loop cria?

> **Resposta:** **iteração** (composição vira normal), **realimentação** (envenenamento por eco) e ⚠ **persistência**.

**7.2 (conceito)** Quais são as quatro superfícies de estado?

> **Resposta:** histórico da sessão, **memória de longo prazo**, estado de ferramenta e ⚠ **instrução auto-modificada**.

**7.3 (conceito)** Qual a mais grave, e por quê?

> **Resposta:** a **instrução auto-modificada** — um agente que edita o próprio prompt persiste a violação **entre execuções**, no lugar mais autoritativo que existe.

**7.4 (conceito)** O que é procedência, e por que ela é necessária?

> **Resposta:** cada item de memória carrega **quem escreveu, quando, a partir de qual conteúdo e com que autoridade**. ⚠ Sem ela, a memória é um **canal anônimo**, e a violação é indistinguível da preferência legítima.

**7.5 (conceito)** Qual a defesa conceitual central?

> **Resposta:** ⚠ **memória é DADO, e dado não vira instrução.** ⚠ É a distinção do módulo 1 aplicada ao armazenamento.

**7.6 (conceito)** Por que o ataque que persiste vale mais?

> **Resposta:** porque o atacante **planta uma vez e não volta**; a vítima pode ser **outra**; e no dia 90 o agente **não está sendo injetado** — está obedecendo a própria configuração.

**7.7 (mão na massa)** No lab, o dia 2 não teve ataque. Por que a "preferência" continuou sendo obedecida?

> **Resposta:** porque foi **gravada sem procedência**, e a política não tinha como distingui-la de instrução legítima. ⚠ É a razão de o terceiro exercício do lab resolver — e não o segundo.

---

## Módulo 8 — Guardrails

**8.1 (conceito)** Qual a pergunta que define uma defesa?

> **Resposta:** ⚠ **onde ela olha** — entrada do usuário, conteúdo, prompt montado, saída ou **ação**. ⚠ Onde olha determina qual família a derrota.

**8.2 (conceito)** Por que um filtro na entrada do usuário dá falsa segurança?

> **Resposta:** porque ele cobre a **família menos perigosa** e **não vê** a injection indireta — o conteúdo hostil nunca passa por ali.

**8.3 (conceito)** Por que um classificador é defesa que herda a fraqueza?

> **Resposta:** porque ele **é um modelo**, e modelos são influenciáveis (módulos 2 a 4). ⚠ A defesa tem a vulnerabilidade que pretende corrigir.

**8.4 (conceito)** Quantas vias de exfiltração o guardrail de saída cobre?

> **Resposta:** **uma** — a resposta. ⚠ Ferramenta, log e memória passam por fora.

**8.5 (conceito)** Qual a única defesa que não lê texto, e por que isso importa?

> **Resposta:** **validação de ação**. ⚠ Ela não pergunta "o texto é hostil?" — pergunta **"esta ação deve acontecer?"**. Por isso **não tem bypass por texto**.

**8.6 (conceito)** Por que os dois números valem juntos?

> **Resposta:** porque um guardrail que bloqueia **tudo** tem bypass zero e é **inútil** — a taxa de falso positivo é 100%. ⚠ É a aritmética do curso de Detecção e Evasão: dois erros, e o falso positivo é o que desliga a defesa.

**8.7 (conceito)** Por que a defesa em camadas começa pela autorização?

> **Resposta:** porque ela **remove a possibilidade**, em vez de tentar impedir a forma. ⚠ O mercado começa pela camada paliativa (prompt e filtro); o curso começa pela raiz.

**8.8 (leitura de código)** Um guardrail bloqueia 100% dos ataques e 30% dos pedidos legítimos. Veredito?

> **Resposta:** ele será **removido em produção** — por decisão de operação, não de segurança. ⚠ A recomendação tem de vir com os dois números e a latência.

---

## Módulo 9 — Bypass: as famílias

**9.1 (conceito)** Por que família e não lista de payload?

> **Resposta:** porque família é **mecanismo** e lista é **acervo**. ⚠ Quem entende o mecanismo **gera** payload; quem tem a lista só repete.

**9.2 (conceito)** Quais são as oito famílias?

> **Resposta:** reformulação semântica, idioma, codificação, turno, ⚠ **canal**, envenenamento do guardrail, recurso e caminho de trás.

**9.3 (conceito)** Qual a família mais importante, e por quê?

> **Resposta:** **F5, canal.** ⚠ Ela não derrota o filtro — **passa por fora** dele. É a razão de o módulo 4 ser o coração do curso.

**9.4 (conceito)** Por que a codificação funciona?

> **Resposta:** porque o modelo **sabe decodificar** — foi treinado em base64, código e texto codificado. ⚠ A capacidade que o torna útil é a que torna a codificação viável.

**9.5 (conceito)** O que a F8 tem em comum entre as seis técnicas?

> **Resposta:** a restrição é sobre **intenção** ("não revele"), e a técnica pede uma **tarefa legítima** cujo resultado contém o dado. ⚠ "Repita o texto acima" é o exemplo mais simples e mais eficaz.

**9.6 (conceito)** O que a coluna `Ação` do mapa mostra?

> **Resposta:** que **nenhuma** família contorna validação de ação — porque ela **não lê texto**. ⚠ A família pode convencer o modelo a **tentar**; a ação não executa.

**9.7 (conceito)** Se você não sabe qual guardrail a técnica derrota, o que você tem?

> **Resposta:** um **payload de fórum** — não um achado. ⚠ Sem mecanismo e sem alvo, não há o que reportar nem o que corrigir.

**9.8 (mão na massa)** Por que F6 é a mais elegante?

> **Resposta:** porque ela **ataca a defesa** em vez de contorná-la. ⚠ Um documento que instrui o **classificador** a responder `SEGURO` é defesa por modelo sendo derrotada por texto.

---

## Módulo 10 — A medição

**10.1 (conceito)** Qual a diferença entre demonstração e medição?

> **Resposta:** demonstração responde *"é possível?"*; medição responde *"com que frequência, contra qual alvo, a que custo de defesa"*. ⚠ A primeira vale uma linha; a segunda vale uma decisão.

**10.2 (conceito)** Por que o controle é obrigatório?

> **Resposta:** sem ele, você não sabe se o resultado vem da **técnica** ou do **desenho**. ⚠ Se o controle já vaza 40%, o achado é o prompt — não o bypass.

**10.3 (conceito)** O que o critério de sucesso precisa ser?

> **Resposta:** **binário, explícito e automatizável.** ⚠ *"A string `TOKEN-LAB-9X7` aparece na resposta"*. "Parece suspeito" não é critério.

**10.4 (conceito)** Por que temperatura 0 é obrigatória e insuficiente?

> **Resposta:** obrigatória para **comparar**; insuficiente porque **subestima o risco de produção**, onde a variância é maior e a chance de o ataque passar em alguma execução também.

**10.5 (conceito)** Qual a equivalência com o curso de Detecção e Evasão?

> **Resposta:** bypass ↔ falso negativo; falso positivo ↔ falso positivo; custo de filtrar ↔ custo de detectar. ⚠ **A estrutura é idêntica**, e a conclusão também: o falso positivo é o que desliga a defesa.

**10.6 (conceito)** Por que publicar o conjunto de ataque junto com a taxa?

> **Resposta:** porque a taxa **depende do conjunto escolhido**. ⚠ Um conjunto fácil produz número alto; sem publicá-lo, o número não é comparável.

**10.7 (leitura de código)** O que significa *"a ação permanece contida em 100%"*?

> **Resposta:** que o injection **acontece e não causa dano** — e **isso é um resultado**. ⚠ É a diferença entre *"o modelo foi burlado"* e *"o sistema foi comprometido"*.

---

## Módulo 11 — A superfície que não é sua

**11.1 (conceito)** Até onde vai a cadeia de confiança?

> **Resposta:** corpus de pré-treino, dados de ajuste, fine-tuning de terceiro, publicação. ⚠ Tudo isso **antes** de o modelo chegar, e **influenciando o comportamento** dele.

**11.2 (conceito)** O que caracteriza o backdoor por gatilho?

> **Resposta:** comportamento normal, e anômalo sob frase específica — **estável e persistente**, e indistinguível de comportamento legítimo sem conhecer o corpus.

**11.3 (conceito)** O que se pode verificar, e o que não?

> **Resposta:** verificável — **taxa de bypass, contenção da ação e a versão**. Não auditável — corpus, dados de ajuste, dados privados no treino.

**11.4 (conceito)** Por que trocar a versão do modelo é mudança de superfície de segurança?

> **Resposta:** porque a taxa medida **ontem não vale hoje**. ⚠ Deveria ser tratada como evento que exige **nova medição**, não como atualização de dependência.

**11.5 (conceito)** Se o provedor reforça o guardrail, o que acontece com a sua medição?

> **Resposta:** a sua taxa cai — e você conclui, **errado**, que **sua** defesa melhorou. ⚠ É a razão de o laboratório do curso ser local, com versão fixada.

**11.6 (conceito)** Por que "o modelo recusa" não é garantia?

> **Resposta:** porque **recusa é uma taxa, não uma propriedade**. ⚠ O mesmo modelo, mesma versão, outra seed, pode obedecer.

**11.7 (leitura de código)** O que a linha sobre ferramenta nova no parágrafo de limitação diz?

> **Resposta:** que a **contenção não se propaga**. ⚠ Ferramenta adicionada depois da auditoria **não está coberta** — e é assim que a maior parte dos incidentes acontece.

---

## Módulo 12 — Projeto final

**12.1 (conceito)** Qual é a coluna que só este curso tem, e por quê?

> **Resposta:** **`CONTINUA POSSÍVEL`**. ⚠ Em Web Apps a coluna "corrigido" fica preenchida; em LLM, muitas vezes está **vazia** — e o relatório honesto diz por quê.

**12.2 (conceito)** Por que medir o controle *antes* de atacar?

> **Resposta:** porque sem ele você não sabe se a técnica funcionou — ou se o modelo **já vazava**. ⚠ É o passo que separa medição de anedota.

**12.3 (conceito)** Qual a diferença entre *"o modelo foi burlado"* e *"o sistema foi comprometido"*?

> **Resposta:** o primeiro é comportamento; o segundo é **alcance**. ⚠ Só o segundo é incidente — e a distinção é o entregável do curso.

**12.4 (conceito)** Por que corrigir o alcance e não o prompt?

> **Resposta:** porque o `if` na ferramenta é **estrutural**; a frase nova na instrução é **redução de taxa**. ⚠ E o relatório tem de dizer qual dos dois você fez.

**12.5 (leitura de código)** Um relatório diz "o guardrail resolve". O que ele erra?

> **Resposta:** ele **não tem taxa**, não tem **controle**, não diz **onde o guardrail olha** e não declara o **que continua possível**. ⚠ É o que será desmentido no primeiro teste.

---

## Avaliação final — o que você deve saber fazer

Ao final do curso, sem consultar:

1. Desenhar as **oito** fronteiras de uma aplicação com LLM, e dizer qual é a que ninguém trata como fronteira.
2. Explicar por que **não existe `bind`** para linguagem natural, em termos do que o modelo recebe.
3. Classificar uma técnica de injection nas **cinco famílias do módulo 3**.
4. Explicar por que **filtrar a entrada do usuário não protege** contra injection indireta.
5. Dizer as **quatro vias** de saída do contexto, e por que filtrar a resposta resolve uma.
6. Enunciar a regra sobre **parâmetro de autorização** em ferramenta.
7. Explicar o que é **procedência** de memória, e qual ataque ela impede.
8. Dizer **onde olha** cada um dos cinco tipos de guardrail.
9. Classificar uma técnica nas **oito famílias de bypass**, com o mecanismo.
10. Medir uma taxa com **controle**, **N** repetições e **um** critério binário.
11. Explicar por que a defesa em camadas **começa pela autorização** e termina em **detecção**.
12. Produzir um relatório com taxa, ficha de guardrail, **limitação declarada** e a coluna **`CONTINUA POSSÍVEL`**.

⚠ **Se os doze itens fecham, o curso cumpriu o objetivo.** Os itens 10 e 12 são os que distinguem este curso de todo material de jailbreak.
