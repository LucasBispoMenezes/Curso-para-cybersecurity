# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos onze módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — O jogo

**1. O que o detector vê que o atacante não vê**

**O log.** **O atacante vê a entrada original; o detector vê a forma normalizada, o contexto do produto, e o erro registrado — mas com atraso.**

**2. E o inverso**

**O atacante vê o original e escolhe o tempo; o detector não escolhe quando o ataque chega, nem vê a forma crua.**

**3. A assimetria estrutural**

**O feedback.** **O atacante itera em segundos e sabe na hora; o detector descobre em horas, com 200 falsos positivos no meio.**

**4. As três posturas**

**Prevenir** (impede — quebra o legítimo) · **detectar** (registra — falso positivo) · **responder** (age — tempo de exposição).

**5. A sustentável**

**A equilibrada** — porque **declara** o falso positivo e o falso negativo em vez de escondê-los.

**6. Por que toda regra erra**

Porque **não existe regra sem falso positivo.** **A pergunta não é "esta é boa?" — é "quantas vezes ela erra, e alguém vai olhar?".**

**7. O que a linha "equilibrado" declara**

**O falso positivo orçado e o falso negativo declarado** — **enquanto as outras três escondem o custo.**

**8. As quatro posições do detector**

**Antes do WAF** · **no WAF** · **depois do WAF** · **no backend**.

**9. Qual vê o que aconteceu**

**No backend** — porque vê o que **executou**. **E é caro porque exige instrumentar o sistema em produção.**

**10. Onde a maioria está, e por que é o pior**

**No WAF.** Porque **o ponto cego tem exatamente o tamanho do diferencial de parsers** — **e é onde a evasão vive.**

**11. O tamanho do ponto cego no WAF**

**A distância entre a forma que o WAF compara e a que o backend processa** — **que é a assimetria do curso anterior.**

**12. Por que a evasão existe, em termos de forma**

Porque **o detector vê a forma da sua camada, não a do backend.** **O atacante escolhe um byte que a forma do detector não mostra.**

**13. Como o atacante itera**

**Em segundos.** **E o detector, em horas ou dias.**

**14. O que compensa a assimetria**

**Medir.** **Se o atacante itera mais rápido, o detector não pode ajustar por intuição — precisa de número.**

**15. As cinco pastas**

**`regras/`** · **`ataque/`** · **`telemetria/`** · **`medicoes/`** · **`caderno/`**.

**16. De onde vem o atacante**

**Do curso anterior** — **é o mesmo, rodando em 127.0.0.1.** **Porque sem ataque reproduzível não há detecção a medir.**

**17. Por que o tráfego legítimo é parte do lab**

Porque **sem ele não se mede o falso positivo** — **e sem medir, não há taxa.**

**18. Três fontes de tráfego legítimo**

**Você navegando** · **um crawler no seu site** · **tráfego sintético normal** — ou um PCAP público anonimizado.

**19. O critério de escolha do primeiro alvo**

**Você sabe reproduzir** · **deixa rastro** · **o rastro é distinguível** · **o tráfego legítimo é fácil.**

**20. Por que não começar pelo client-side**

Porque **o navegador da vítima produz requisições que parecem legítimas** — **e ele é o ataque que deixa menos rastro.** **É o mais difícil, então é o último.**

**21. "Detectar o que se distingue do normal"**

Significa **que você precisa saber como é o normal** — **e o normal é o tráfego legítimo do lab.**

---

## Módulo 2 — A superfície de detecção

**1. O que é a superfície**

**O conjunto de pontos onde há dado** — **e ela tem três dimensões.**

**2. As três dimensões**

**Existência** (o dado é gerado?) · **retenção** (por quanto tempo?) · **acesso** (você pode consultá-lo?).

**3. A mais subestimada**

**O acesso** — porque **é organizacional, não técnico** — **e um dado que existe mas não é consultável é, para efeito de detecção, inexistente.**

**4. O que fazer se o dado não existe**

**Instrumentar** — **e isso é um projeto, não uma configuração.**

**5. Por que o acesso é político**

Porque **o dado pode existir, ser retido, e estar numa ferramenta que o time de detecção não pode consultar** — **e o problema se resolve com acordo, não com código.**

**6. Os cinco pontos**

**Rede** · **access log** · **app log** · **SO/auditoria** · **endpoint**.

**7. O mais invasivo**

**A telemetria de endpoint** — **porque vê o que o processo fez, não o que ele pediu** — **e é a mais regulada.**

**8. Por que o PCAP com TLS é limitado**

Porque **o TLS o cega** — **sem a chave, ele captura o volume sem o conteúdo.** **É o ponto mais caro e o mais limitado.**

**9. O que o access log do frontend não vê**

**O que o backend viu.** **Ele registra o que ele entendeu** — **e o desync está no que o outro entendeu.**

**10. Por que isso importa para o smuggling**

Porque **o frontend conta uma requisição e o backend, duas** — **e o log do frontend nunca mostra a segunda.**

**11. O que o app log pode conter de sensível**

**O payload** — **que pode conter dado pessoal de terceiros** (a query do usuário, o corpo enviado).

**12. Como se preenche o inventário**

**Com teste.** **Você roda o ataque e olha o log** — **não supõe.**

**13. Por que "não sei" é perigoso**

Porque **parece um sim.** **E é a origem de metade das regras que não funcionam.**

**14. Como resolver um "não sei"**

**Testando** — **com o atacante do lab**, marcando o log antes e depois.

**15. Três fontes de tráfego legítimo**

**Você navegando** · **um crawler no seu site** · **um PCAP público anonimizado.**

**16. O que é escolher o ponto**

**Escolher o que você aceita não ver** — **e declarar essa cegueira.**

**17. O que a justificativa contém**

**O ponto** · **por que este** · **o que ele não vê** · **a retenção necessária** · **o volume estimado** · **o dado pessoal que ele contém.**

**18. Por que declarar a cegueira**

Porque **uma regra sem cegueira declarada promete demais** — **e o analista acredita que ela cobre o que não cobre.**

**19. O que a retenção determina**

**Por quanto tempo a regra funciona.** **Uma correlação de 7 dias não roda com retenção de 24 horas.**

**20. Como o custo de privacidade entra na escolha**

**Escolher o ponto não é só técnico** — **um log que registra o payload registra dado de terceiros**, **e isso muda o que se pode reter.**

**21. O que liga este módulo ao anterior**

**O ponto cego do WAF** — **que é a superfície da evasão do curso anterior.**

---

## Módulo 3 — Assinatura, comportamento, anomalia

**1. As três famílias**

**Assinatura** ("casa com o padrão?") · **comportamento** ("faz o que não deveria?") · **anomalia** ("é diferente do normal?").

**2. Quando a assinatura falha, e por quê é estrutural**

**Sob evasão** — **e é estrutural porque ela compara a forma **normalizada**, e o backend processa outra.**

**3. O que `%253C` demonstra**

**Que a regra está certa e ainda falha** — **porque o detector decodifica uma vez e o backend, duas.**

**4. Como o aninhamento funciona**

**O sanitizador procura `<script>` e remove.** **O que sobra de `<scr<script>ipt>` é `<script>`** — **o payload perigoso.**

**5. Por que o aninhamento é eficaz**

Porque **a remoção não é idempotente:** **remover uma vez **cria** o padrão na leitura seguinte.**

**6. Por que a assinatura envelhece**

Porque **ela é um retrato** — **e o atacante muda uma coisa.**

**7. O que o comportamento compara**

**A ação** — **não a forma.**

**8. Por que a ação é invariante**

Porque **a evasão muda a **forma**; ela não muda a **ação**.** **Um payload ofuscado que executa **executa**.**

**9. Por que o web shell é o exemplo mais forte**

Porque **a forma varia infinitamente** (`cmd`, `exec`, `base64`, `eval`) **e a ação é sempre a mesma:** **o servidor web gera um processo filho.**

**10. Onde o FP aparece no comportamento**

**No legítimo que também age** — **um CGI, um cron, um hook.** **Exige modelar o normal daquele host.**

**11. O que a anomalia descreve**

**A distribuição** — **e por isso pega o que ninguém previu.**

**12. Quatro sinais de anomalia**

**Volume** · **cardinalidade** · **hora do dia** · **sequência de ações**.

**13. Por que a cardinalidade é elegante**

Porque **pega a enumeração que o volume não pega** — **o total pode ser idêntico, e a variedade de valores, não.**

**14. O que a sequência pega**

**Uma ordem de ações que não existe no normal** — **mesmo que cada ação isolada seja comum.**

**15. Por que o FP da anomalia é alto**

Porque **o tráfego normal é intrinsecamente variável** — **e um modelo que não captura isso alerta em tudo.**

**16. Qual família sobrevive ao patch**

**Comportamento e anomalia.** **A assinatura não — porque o atacante muda um byte e ela apodrece.**

**17. A mais forte para o smuggling**

**O comportamento** — **"o backend recebeu duas onde o frontend contou uma".** **É difícil porque exige correlacionar dois logs.**

**18. Por que a regra de comportamento é difícil**

Porque **exige que **dois** logs existam** (módulo 2) **e que sejam correlacionados por tempo.**

**19. Por que a assinatura vem primeiro**

**Porque é rápida** — **não porque seja suficiente.**

**20. Qual exige o módulo 6 antes de ser útil**

**A anomalia** — **porque sem medir o FP ela é um gerador de ruído.**

**21. Por que declarar limitações**

Porque **uma regra sem limitação declarada promete demais** — **e o time não sabe o que está comprando.**

---

## Módulo 4 — A normalização e o elo fraco

**1. Por que a regra está certa e ainda falha**

Porque **o problema não está na regra — está entre a regra e o que ela olha.** **A normalização do detector discorda da do backend.**

**2. As seis transformações**

**Decodificação de URL** · ⚠ **decodificação repetida** · **unicode** · **case folding** · ⚠ **remoção de delimitador** · **trim.**

**3. O elo central**

**A decodificação repetida** — **porque o detector decodifica uma vez e o backend, duas.**

**4. As quatro ordens**

**Decodificar → comparar** (✓ correto, se for a mesma) · **comparar → decodificar** (⚠ a regra vê a crua) · **remover → decodificar** (⚠⚠ o aninhamento funciona) · **decodificar → remover → decodificar** (⚠ ataque em duas rodadas).

**5. Por que "remover → decodificar" é perigosa**

Porque **deixa o payload cru passar por uma rodada** — **e a decodificação seguinte o completa.**

**6. Como o aninhamento funciona**

**Passo 1:** o sanitizador encontra `<script>` no meio e remove. **Passo 2:** o que sobra é `<script>alert(1)</script>` — **o payload perigoso.**

**7. Por que a defesa que remove é o vetor**

Porque **a remoção **cria** o padrão que ela mesma procura** — **não é um bug da regra; é a natureza de remover.**

**8. Por que "rejeitar" é superior**

Porque **rejeitar não cria padrão nenhum.** **Sanitizar transforma; rejeitar não.**

**9. As três estratégias**

**Normalizar igual** (exige conhecer) · ⚠ **detectar a forma inválida** (robusto) · ⚠ **detectar a ação** (o mais robusto, e caro).

**10. Qual não tem FP, e por quê**

**A de forma inválida** — porque **compara com a **gramática**, não com o payload.** **Uma mensagem inválida é inválida, ponto.**

**11. O que ela compara**

**O que é sintaticamente válido** — **não o payload conhecido.**

**12. Por que os quatro sinais do curso anterior não têm FP**

Pelo mesmo motivo: **dois `CL`, `TE`+`CL`, path com CR/LF — todos comparam com a gramática.**

**13. Cinco formas de evasão e a correção**

**Encoding** (⚠ impossível alinhar) · **aninhamento** (⚠ só rejeitar) · **case** (✓ `(?i)`) · **espaço** (✓ comparar com a gramática).

**14. Qual é corrigível trivialmente**

**O case** — **e é o primeiro teste de qualquer regra, porque custa um segundo e pega um erro real.**

**15. Qual só se resolve rejeitando**

**O aninhamento** — **porque a remoção é o mecanismo do ataque.**

**16. Como se mede a transformação do backend**

**Manda-se um prefixo inofensivo que se torne o padrão após N decodificações** — **e vê-se o que o backend **registra**.**

**17. Por que o número vai no arquivo da regra**

Porque **torna a regra auditável** — **e o número foi medido, não suposto.**

**18. O que a regra alinhada reduz**

**O FN das evasões por encoding.** **E não pega: o aninhamento, nem o encadeamento além do número imitado.**

**19. Por que a taxa de FN se mede**

Porque **não se elimina.** **Uma regra que pega o trivial e não pega a evasão ainda vale — desde que você saiba disso.**

**20. A única assinatura que não envelhece**

**A que compara com a gramática** — **porque a forma do ataque muda, e a invalidez não.**

---

## Módulo 5 — Telemetria e o que falta

**1. Para que os logs de aplicação nascem**

**Para depurar** — **e a depuração quer a forma limpa.** **A detecção quer a forma suja.**

**2. As três perguntas**

**O que o atacante mandou** (a forma original) · **o que o sistema entendeu** (a normalizada) · ⚠ **o que o sistema fez** (o efeito).

**3. Qual campo responde "o que o sistema fez"**

**O efeito** — **a query executada, o arquivo aberto, a conexão de saída, o processo filho.**

**4. Por que o efeito é o log mais forte**

Porque **a forma muda o tempo todo, e o efeito não** — **é o invariante do módulo 3.**

**5. Por que a forma original é essencial**

Porque **um log que registra o path **normalizado** já apagou o que você precisava ver** — **e a evasão por encoding fica invisível.**

**6. O campo mais valioso e o mais perigoso**

**A query executada** — **detecta SQLi trivialmente e registra os dados do usuário junto.**

**7. O mais elegante**

**O arquivo aberto** — **um path traversal abre um arquivo fora do webroot, e isso é observável no SO, sem analisar o payload.**

**8. As três moedas**

**Volume** · **latência** · **privacidade.**

**9. Qual estratégia é o melhor equilíbrio**

**Logar a forma, não o conteúdo** — **o hash do corpo, o tamanho, os headers originais, os primeiros N bytes.**

**10. Como logar a forma sem o conteúdo**

**O hash do corpo e os primeiros bytes** — **suficiente para detectar o padrão, e muito menos dado pessoal.**

**11. O que o hash do corpo permite**

**Identificar o payload sem guardá-lo** — **e correlacionar ocorrências sem expor o conteúdo.**

**12. Por que a amostragem é ruim**

Porque **perde eventos raros** — **e o ataque é raro por definição.**

**13. O paradoxo do "só o suspeito"**

**Logar só o suspeito exige a regra — e a regra precisa do log para ser escrita.**

**14. Como ele se resolve**

**Um período de log amplo, medir, e depois reduzir.**

**15. O que muda com a forma original**

**`%253Cscript%253E` deixa de ser invisível** — **e o espaço no header, e o obs-fold, e o path com CR/LF.**

**16. O que o log normalizado apaga**

**Exatamente o que a detecção precisa** — **a forma original.**

**17. O que exige auditoria do SO**

**Saber qual arquivo foi aberto** — **`auditd` no Linux, ou o EDR.**

**18. O equilíbrio prático de volume**

**Truncado + hash** — **os primeiros N bytes e o hash, em vez do payload inteiro.**

**19. Como se mede o custo**

**Bytes por evento × tráfego real × retenção** — **a extrapolação.**

**20. O que declarar quando algo permanece invisível**

**O item, o porquê, e se você aceita** — **porque a cegueira declarada é auditável.**

---

## Módulo 6 — Falso positivo e o orçamento

**1. Por que uma regra que alerta em tudo não é uma regra**

Porque **um alerta que ninguém olha não é detecção** — **é um filtro que o analista vai desligar.**

**2. Por que esse fracasso não parece fracasso**

Porque **parece diligência** — **escrever muitas regras parece trabalhar mais.**

**3. As quatro métricas**

**Detecção** · **FP** · **precisão** · **custo**.

**4. Qual o analista sente**

**A precisão** — **porque ela diz quantos falsos ele olha por cada verdadeiro.**

**5. Por que 99% de detecção pode ser inútil**

Porque **com 1% de precisão são 99 alertas falsos por verdadeiro** — **e é insustentável.**

**6. A tabela da precisão**

**50%** → 1 falso · **10%** → 9 · **1%** → 99 · **0,1%** → 999.

**7. Onde a maioria nasce**

**Em 1%** — **e é a razão de a área ter fama de ruidosa: as regras são escritas sem essa conta.**

**8. O que é necessário para medir o FP**

**Tráfego legítimo** — **e sem ele não há taxa.**

**9. Os cinco passos**

**Rodar sobre o legítimo** · **contar** · ⚠ **triar** · **calcular** · **ajustar e medir de novo.**

**10. Qual passo é o trabalho**

**A triagem** — **porque dizer se o alerta é falso consome o tempo do analista.**

**11. Por que o indeterminado é o custo escondido**

Porque **não aparece na conta de FP e consome o mesmo tempo** — **muitos alertas não se resolvem com o dado disponível.**

**12. O que ajustar com regex ampla**

**Ancorar e exigir contexto** — **em vez de ampliar a exclusão.**

**13. Por que a lista de exclusão é dívida**

Porque **cada exclusão reduz o FP e pode aumentar o FN** — **e a lista cresce até a regra virar uma colcha de retalhos.**

**14. O que significa quando ela cresce toda semana**

**Que a regra está na família errada** — **e ajustar mais não resolve.**

**15. O que é o orçamento, e como se calcula**

**N analistas × H horas × 60 minutos** — **o tempo de triagem disponível.**

**16. O custo típico por alerta**

**5 a 20 minutos.**

**17. O que a linha "regra típica" mostra**

**500 alertas/dia com 10 minutos cada = 83 horas/dia** — **mais que um analista inteiro, e é por isso que os alertas são ignorados.**

**18. Por que o veredito é aritmético**

Porque **uma regra acima do orçamento simplesmente não será triada** — **não é uma questão de disciplina.**

**19. O que fazer quando está acima**

**Ajustar, ou desligar** — **e, se persistir, mudar de família.**

**20. Por que "sem medida" é o pior caso**

Porque **sem a conta o time não sabe que está falido** — **e descobre quando o analista sai.**

---

## Módulo 7 — O perfil do atacante

**1. Por que "o atacante" não existe**

Porque **existe o atacante que faz a **sua** cadeia, com as ferramentas dele, contra o seu alvo** — **e é esse que se modela.**

**2. O que o time escreve contra o imaginário**

**Regras contra um atacante sofisticado e paciente** — **e não detecta o que de fato acontece: automatizado, rápido e raro.**

**3. O que o ATT&CK é**

**Um vocabulário comum, um mapa de comportamentos, um índice de técnicas.**

**4. O que ele não é**

**Não é lista de regras, nem ferramenta, nem checklist a cobrir.**

**5. O uso real**

**A ponte:** **a técnica nomeia o comportamento; o log diz se você pode vê-lo.**

**6. Por que cobrir tudo é inviável**

Porque **você escreveria regras para técnicas que não se aplicam à sua arquitetura.**

**7. Por que a regra emprestada carrega o FP do outro**

Porque **ela assume um ambiente** — **outros logs, outro volume, outro tráfego legítimo.**

**8. Lacuna de detecção × de instrumentação**

**Detecção:** você tem o dado e não tem a regra. **Instrumentação:** você não tem o dado — **e isso se resolve com log, não com regra.**

**9. Os cinco campos do perfil**

**A técnica** (do ATT&CK) · **a variante** (do lab) · **o rastro** (observado) · **o invisível** (do inventário) · **a hipótese.**

**10. Por que o rastro distingue o perfil útil**

Porque **"o atacante usa T1190" não ajuda** — **"CL.TE deixa um path estranho no backend e nada no frontend" permite escrever a regra.**

**11. O que o perfil revela**

**Comunicar** · **reproduzir** · **escrever a regra** · **saber o que falta** · **o que testar.**

**12. O que o perfil não faz**

**Prever** — **ele descreve esta cadeia, nesta variante, com este rastro.**

**13. Quem tenta prever**

**A detecção por anomalia** — **e ela custa o FP que o módulo 6 mede.**

**14. Os sete campos da hipótese**

**Técnica** · **comportamento** · **rastro** · **regra** · **falsificação** · **FP esperado** · **o que não pega.**

**15. Por que a falsificação a torna engenharia**

Porque **"a regra vai pegar" não é hipótese.** **"Casa quando X aparece e não casa quando X está ofuscado por Y" é.**

**16. As cinco perguntas**

**O que o atacante faz** · **onde isso aparece** · **o que casar** · **o que a derruba** · **quanto custa.**

**17. Por que o FP entra na hipótese**

Porque **detecção sem custo não é informação suficiente** — **e o módulo 6 mostrou que o custo decide se ela vive.**

**18. O que testar quando a hipótese diz "pega"**

**A evasão** — **a direção que a derruba.**

**19. Qual a segunda direção, e por que falta**

**A evasão.** **Falta porque a maioria das hipóteses só diz "pega", sem dizer até onde.**

**20. O que fazer se a técnica não existe no ATT&CK**

**Não inventar.** **O perfil fica sem o nome, e isso é honesto.**

**21. O que a hipótese não é**

**Não é expectativa** — **é engenharia, e diz como saber se está errada.**

---

## Módulo 8 — O ciclo purple

**1. Por que uma regra escrita uma vez expira**

Porque **não está errada — ela mede o ambiente de ontem.**

**2. As três coisas que mudam**

**O tráfego legítimo** (o FP muda) · **o produto** (a forma muda) · **o adversário** (a evasão muda).

**3. Por que nenhuma avisa**

Porque **a regra continua "funcionando"** — **ela só passou a medir outro ambiente.**

**4. As cinco fases**

**Reproduzir** · **medir a detecção** · ⚠ **evasar** · **medir de novo** · **ajustar ou aposentar.**

**5. Qual define o ciclo**

**A fase 3** — **porque muda **uma** variável, e é o método controlado do Patch Diffing aplicado à regra.**

**6. As duas saídas da fase 5**

**Ajustar** — **ou aposentar.**

**7. Por que aposentar é resultado**

Porque **uma regra que consome mais que o time tem está gastando o tempo que outra usaria** — **e manter é custo de oportunidade puro.**

**8. O que registrar por volta**

**A evasão testada** · **a regra antes** · **a regra depois** · **o FP depois** · **o veredito.**

**9. Por que "dobrar a detecção" pode não ser ganho**

Porque **se quadruplica o FP, é uma **troca** — e o ciclo existe para que ela seja escolhida.**

**10. As cinco voltas**

**Encoding** · **case** · **aninhamento** · **ordem dos headers** · **delimitador.**

**11. O que a primeira volta revela**

**Que a regra literal não casa nada codificado** — **e que a alinhada casa 1× e 2×.**

**12. Por que a alinhada é o melhor ganho**

Porque **ela imita a transformação do backend** — **e é o melhor que a assinatura consegue.**

**13. Onde aparece o custo do ganho**

**No FP** — **uma regra que decodifica mais casa mais ataques **e** mais tráfego legítimo.**

**14. Os quatro vereditos**

**Manter** · **ajustar** · **trocar de família** · ⚠ **aposentar.**

**15. Qual exige aposentar, e por que ninguém decide**

**"Detecta pouco, FP alto".** **Ninguém decide porque aposentar parece desistência.**

**16. O que registrar ao aposentar**

**A regra** · **a taxa que tinha** · **o motivo** · ⚠ **a lacuna que ela deixa.**

**17. Como se liga ao módulo 7**

**A lacuna entra no inventário**, **junto com as de instrumentação.**

**18. O que o ganho marginal diz**

**Quando parar:** **Δ = 0 por 2+ voltas significa que a regra chegou ao limite.**

**19. Se o Δ é zero e o FP não cai**

**Mudar de família** — **porque o limite não é da regra, é da abordagem.**

**20. O que o ciclo não elimina**

**O trade-off entre FN e FP.** **O que ele faz é torná-lo consciente.**

---

## Módulo 9 — Evasão: as famílias

**1. O que a evasão explora**

**Uma discordância entre o que a regra vê e o alvo processa** — **e as discordâncias são poucas e conhecidas.**

**2. As sete famílias**

**Encoding** · **case** · **aninhamento** · **delimitador** · **fragmentação** · **ambiguidade** · **volume.**

**3. Quais atacam a forma, quais o parser**

**As três primeiras, a forma; as três seguintes, o parser; a última, o time.**

**4. Qual ataca o time, e por que é eficaz**

**O volume** — **porque não esconde o ataque: enche o detector até o time desligar a regra.**

**5. Quais não têm defesa por assinatura**

**O aninhamento** (a remoção cria o padrão) **e a ambiguidade** (a regra está na camada errada).

**6. O que a família 6 é, vista do detector**

**O HTTP Smuggling inteiro** — **não é sobre o payload; é sobre onde a mensagem termina.**

**7. As sete contramedidas e o custo**

**Alinhar a decodificação** (exige medir) · **`(?i)`** (✓ nenhum) · **rejeitar a forma** (quebra tolerância) · **comparar com a gramática** (não pega payload válido) · **instrumentar** (caro) · **validar o framing** (quebra clientes) · **rate limit** (atinge o legítimo).

**8. Qual é gratuita**

**O `(?i)`** — **o único ajuste sem preço.**

**9. O que "rejeitar a forma" quebra**

**O cliente que mandava os dois headers "por engano"** — **a tolerância legada.**

**10. Por que o rate limit atinge o cliente importante**

Porque **o cliente legítimo de alto volume frequentemente é o mais importante** — **e é ele que o limite atinge.**

**11. As cinco lacunas**

**Forma válida** · **aninhamento** · **framing** · **ataque lento** · **distribuído.**

**12. Por que a forma válida escapa**

Porque **a regra por gramática só vê o inválido** — **um ataque com forma válida não dispara nada.**

**13. Por que o aninhamento não se corrige**

Porque **a remoção **cria** o padrão** — **não há regra que resolva; só rejeitar a entrada.**

**14. Por que o framing exige outra camada**

Porque **a regra está no frontend e o desync acontece no backend** — **a contramedida é **ver** o que o backend viu.**

**15. Por que o distribuído é o mais difícil**

Porque **cada origem, sozinha, é normal** — **10.000 IPs com uma requisição cada não é anômalo em nenhum deles.**

**16. O que fazer com cada lacuna**

**Forma válida** → comportamento · **framing** → instrumentar · **distribuído** → correlação entre origens.

**17. O que a declaração de lacunas resolve**

**Ela torna a regra auditável** — **e o time sabe o que está comprando.**

**18. O que ela não resolve**

**A lacuna.** **Ela não pega o que a regra não pega.**

**19. Como se mede a resistência**

**Testando a regra contra as famílias testáveis** — **e contando quantas a derrubam.**

**20. Por que as famílias 6 e 7 não são testáveis por payload**

Porque **a 6 ataca a camada** (exige instrumentar) **e a 7 ataca o orçamento** (exige medir o time).

---

## Módulo 10 — O detector que discorda

**1. Por que o detector é uma camada a mais**

Porque **ele lê e reescreve a mensagem** — **e uma camada a mais é uma divergência a mais.**

**2. O que isso implica**

Que **ele não resolve a divergência — ele adiciona uma.** **E o que ele não resolve é o que acontece na camada de baixo.**

**3. As cinco etapas**

**Parsear** · **decodificar** · **normalizar** · **comparar** · ⚠ **repassar.**

**4. O ponto cego estrutural**

**A etapa 5.** **O WAF não vê o que ele entrega — ele só sabe que repassou.**

**5. O que o WAF compara e o que entrega**

**Compara o que ele entendeu; entrega o que ele recebeu.**

**6. Onde vive o espaço da evasão**

**Na distância entre as duas coisas** — **entre a forma comparada e a forma entregue.**

**7. O que corrigiria, e o custo**

**Normalizar antes de repassar** — **e custa performance, e quebra clientes legados.**

**8. O que o `WAFFLED` mediu**

**120+ exploits contra 5 WAFs comerciais** — **todos por parser differential.**

**9. Por que mais regras não resolvem**

Porque **as regras estão certas** — **o problema é a camada.**

**10. As quatro medições**

**O que o WAF viu** · **o que o backend viu** · ⚠ **a diferença** · **o veredito de cada.**

**11. Como se mede a assimetria, e por que só assim**

**Comparando dois logs** — **porque a assimetria é, por definição, a diferença entre o que duas camadas registram.**

**12. O que a diferença de contagem significa**

**Desync** — **o WAF contou uma requisição e o backend, duas.**

**13. E a diferença de forma**

**Divergência de normalização** — **o mesmo dado, interpretado diferente.**

**14. O que a comparação revela**

**Dupla decodificação** · **divergência de forma** · **desync** · **header transformado.**

**15. As três ações**

**Adicionar regra** (nada) · **correlacionar os logs** (detecta o efeito) · ⚠ **instrumentar o backend** (detecta a ação).

**16. Qual é a tentação**

**Adicionar regra** — **e é exatamente o que o módulo 9 mostrou que não funciona para as famílias 3 e 6.**

**17. O que correlacionar pega**

**O framing** — **porque a divergência **é** a diferença entre os dois logs.**

**18. Por que instrumentar o backend é o mais eficaz**

Porque **vê a **ação** — e a ação é invariante sob evasão.**

**19. Por que o efeito não muda com a evasão**

Porque **a evasão muda a **forma** do pedido, não o que o sistema **faz**.**

**20. Quando o problema é a camada**

**A solução é outra camada** — **a que vê o efeito.**

---

## Módulo 11 — Projeto

**1. Por que a regra medida**

Porque **uma regra sem número não é auditável** — **e o número é o que permite decidir se ela vive.**

**2. Por que "aposentada com registro" é válido**

Porque **é uma decisão de engenharia** — **com motivo, taxa, e a lacuna que ela deixa.**

**3. O que o inventário precisa provar**

**Que o dado existe, é retido e é acessível** — **e a prova é o **teste**, não a suposição.**

**4. Por que declarar a cegueira aceita**

Porque **sem ela a regra promete demais** — **e o time acredita que ela cobre o que não cobre.**

**5. O que a família justificada exige**

**Comparar com as alternativas** — **por que não comportamento, por que não anomalia.**

**6. Por que a hipótese precisa da falsificação**

Porque **sem ela a hipótese é expectativa** — **e não diz como saber se está errada.**

**7. O que medir na normalização**

**O número de decodificações do backend** — **porque a regra alinhada precisa imitá-lo.**

**8. Por que a forma original é pré-requisito**

Porque **sem ela a regra alinhada não tem o que comparar** — **e a evasão por encoding fica invisível.**

**9. Como se mede o FP**

**Rodando a regra sobre tráfego legítimo** — **e contando os alertas, que nele são falsos por construção.**

**10. O que acontece se você não medir**

**Você tem a taxa de antes** — **e não sabe se a regra sobrevive ao orçamento.**

**11. O trade-off de todo ajuste**

**Reduzir o FP aumenta o FN** — **e o ciclo existe para que a troca seja escolhida.**

**12. Por que a lista de exclusão é dívida**

Porque **reduz o ruído hoje e cobra em manutenção** — **e se cresce toda semana, a regra está na família errada.**

**13. Como se calcula o orçamento**

**N analistas × H horas × 60 minutos** — **em minutos, não em alertas.**

**14. O que fazer quando está acima**

**Ajustar, desligar, ou mudar de família** — **porque acima do orçamento ela não será triada.**

**15. Quantas famílias se testam por payload**

**Cinco:** **encoding, case, aninhamento, delimitador, fragmentação.**

**16. Por que as outras duas não**

**A 6 ataca a camada** (exige instrumentar) **e a 7 ataca o orçamento** (exige medir o time).

**17. O que o ganho marginal diz**

**Quando parar** — **Δ = 0 por 2+ voltas significa o limite.**

**18. O que significa "o ajuste foi troca"**

**Que o ganho de detecção custou mais FP do que valia** — **e a decisão precisa ser consciente.**

**19. Por que declarar a lacuna torna a regra auditável**

Porque **o time sabe o que está comprando** — **e o analista não acredita numa cobertura que não existe.**

**20. O que a declaração de conduta precisa deixar claro**

**Que a evasão foi escrita para **medir**, e não para atacar** — **e que dual-use não é licença: o destino é o que define.**

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| **Superfície testada** | 15% | Inventário por teste, ponto justificado |
| **A regra** | 15% | Família justificada, normalização medida |
| ⚠ **O FP medido** | 25% | Com tráfego legítimo, taxa calculada |
| **O orçamento** | 15% | Conta feita, veredito aritmético |
| **A resistência** | 20% | As sete famílias testadas |
| **As lacunas** | 10% | Declaradas e classificadas |

**Penalidades automáticas:**

- Testou sensor de terceiro: **lab zerado**.
- Usou a evasão contra alvo real: **lab zerado**.
- Publicou bypass de produto vivo: **lab zerado**.
- Regra sem taxa de FP: −30%.
- Sem declaração de lacunas: −20%.
- Sem o orçamento: −15%.
- "Não fiz" ausente: −10%.
- Evasão não declarada como instrumento de medição: −15%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| **Alvo** | escolhido por gosto | com critério | **+ o que não vai detectar** |
| **Superfície** | suposta | testada | **+ cegueira declarada** |
| **Regra** | escrita | com família | **+ normalização medida** |
| **FP** | estimado | medido | **+ trade-off dos ajustes** |
| **Orçamento** | ausente | calculado | **+ veredito com ação** |
| **Resistência** | uma família | sete | **+ as não testáveis explicadas** |
| **Ciclo** | uma volta | duas | **+ ganho marginal** |
| **Lacunas** | ausentes | listadas | **+ classificadas + a aceita** |
| Relatório | descreve | com números | **+ o que prova e o que não prova** |
| Não fiz | ausente | 1 item | **5+ itens** |
| Conduta | ausente | menciona | **+ dual-use declarado** |
| **Nada achado** | — | — | **✓ válido se o percurso está completo** |

**Os dois itens de maior valor:**

1. **O FP medido com tráfego legítimo** — porque **é o que separa a regra que sobrevive da que o time desliga**, e é onde a maioria para.
2. **As lacunas declaradas** — porque **uma regra com lacuna declarada é auditável**, e uma sem é uma promessa que não se cumpre.

---

*Material didático original, de propósito defensivo e de pesquisa. O atacante é simulado no
laboratório próprio, e a regra roda no sensor próprio. Nenhum teste contra SIEM, WAF ou serviço de
terceiro. A falha de detecção é reportada ao mantenedor — nunca publicada antes da correção. Evasão
usada contra sistema alheio é crime (art. 154-A e 266).*
