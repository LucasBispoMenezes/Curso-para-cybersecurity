# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos doze módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — O que separa operador de pesquisador

**1. Operador vs. pesquisador**

**Operador** recebe **escopo** e executa roteiro. **Pesquisador** recebe **pergunta** e busca
resposta. **Critério de sucesso:** o primeiro cobre o escopo; o segundo **responde à pergunta** —
e "não tem" é resposta.

**2. Por que falsificada é resultado**

Porque **elimina uma possibilidade**. A próxima tentativa é **informada pelo que já foi descartado**.
Se a falha não fosse resultado, **cada investigação começaria do zero** — e nada acumularia.

**3. O que se acumula**

**A teoria sobre onde procurar.** O operador tem 3 achados; o pesquisador tem 3 achados **e o
padrão** — que vale mais, porque **prevê onde mais há**.

**4. As três posturas**

**"Vou testar coisas"** (sem pergunta) · **"preciso achar um bug"** (o achado vira objetivo) ·
**"a ferramenta não achou, então não tem"** (ausência de achado ≠ ausência de bug).

**5. A postura 3 é a mais perigosa**

Porque **parece rigorosa**. "Rodei tudo e não achou" soa como método — **e é o oposto**: confunde
**o que a ferramenta cobre** com **o que existe**. É a mesma raiz do Enumeração Esotérica.

**6. Três propriedades da pergunta**

**Específica** (delimita) · **falsificável** (existe observação que a derruba) · **informada** (vem
de algo que você leu).

**7. "Esta biblioteca é segura"**

Porque **não é falsificável de forma prática** — não há observação concreta que a derrube. Vira
opinião.

**8. De onde vem a pergunta informada**

De **um patch, um CVE, um paper, ou um trecho de código** — nunca do nada.

**9. Os cinco tipos de pergunta**

**Validação** (bugs de tamanho) · **invariante** (bugs de estado) · **confiança** (bugs de fronteira) ·
**consistência** (parser differential) · **cobertura** (bugs de omissão).

**10. O mais produtivo**

**Consistência** — "os dois lados interpretam igual?" É o que o `HTTP Garden` fez em escala, e é a
pergunta dos cursos de Parser Differential, Smuggling e Fuzzing Avançado.

**11. As sete perguntas**

Invariante · quem confia · que suposição · por que o patch corrige · **irmão do padrão** · como
falsifico · o que destrava.

**12. A mais subestimada**

A **3** — "que suposição o código faz?". Porque **bug não é código errado; é suposição que não
vale**. Enumerar suposições é enumerar bugs possíveis.

**13. Suposição que não vale**

Porque o código **assume** `len <= máx`, que o ponteiro não é nulo, que o dado veio de onde diz.
**Cada suposição é um ponto de falha.**

**14. Qual produz o achado original**

A **5** — "existe irmão desse padrão?". Você acha o padrão uma vez e procura onde ninguém corrigiu.

**15. "O que isso destrava"**

Porque faz **cada achado gerar a próxima pergunta** — é a estrutura da enumeração esotérica,
aplicada à pesquisa. Sem ela, os achados ficam isolados.

**16. As dez seções do caderno**

Perfil · pergunta · de onde veio · invariante · hipótese · **critério** · teste · evidência ·
conclusão · **sobras**.

**17. A obrigatória**

**O critério de falsificação.** Sem ele, **não é hipótese — é expectativa**, e expectativa se
confirma por teimosia.

**18. Os três valores**

**Confirmou** (valeu) · **falsificou** (caiu — resultado) · **inconclusivo** (o **teste** falhou).

**19. Inconclusivo aponta para o teste**

Porque **"não consegui decidir" significa que o método foi mal desenhado** — não que o alvo é
seguro. Reformular o teste é mais barato que trocar de alvo.

**20. Relação com o Enumeração Esotérica**

**O mesmo princípio:** a ferramenta padrão **opera sobre a entrada que você deu**. **Ela não gera a
entrada** — e **enumeração esotérica é perguntar o que a ferramenta não cobre**. Aqui, é **ler o que
a ferramenta não lê.**

---

## Módulo 2 — Escolher o alvo

**1. Por que o alvo escolhe o resultado**

Porque **um alvo maduro não tem o que sobrar** — não porque você é ruim, mas porque centenas de
pesquisadores com anos de vantagem já passaram.

**2. Por que todos escolhem o maduro**

Porque é **glamouroso** e **tem tutorial**. E é exatamente por isso que **a competição é máxima**.

**3. Os quatro eixos**

**Superfície** · **acessibilidade** · **maturidade** · **competição**.

**4. Multiplicam, não somam**

Porque **um eixo ruim derruba tudo**. O kernel tem superfície 5 e acessibilidade 5 — e produtividade
baixa, porque **maturidade e competição também são 5**, e elas estão **no denominador**.

**5. O eixo esquecido**

**Competição.** Um alvo popular tem muitos pesquisadores — e **se você está começando, está numa
fila**.

**6. Vantagem relativa vs. prestígio**

Porque **um bug em projeto de nicho que você achou vale infinitamente mais que a tentativa frustrada
no navegador**.

**7. Superfície**

**Quanto código processa dado não confiável.** Níveis: 5 = protocolo/formato de rede; 4 = validador
/ deserializador; 3 = processador interno; 2 = lógica; 1 = config.

**8. Lógica: difícil de achar, fácil de explorar**

**Difícil de achar** porque exige entender o domínio (o que o sistema **deveria** fazer). **Fácil de
explorar** porque o impacto é direto — **você fez o que não devia.**

**9. Seis indicadores de maturidade**

CVE recentes · `oss-fuzz` · auditoria pública · idade + commits · testes com sanitizer · linguagem.

**10. `oss-fuzz`**

Significa que **o bug fácil já saiu** — foi fuzado milhões de vezes. **Não significa seguro:**
significa que **o que sobra é o que o fuzzer não alcança** (estado, protocolo, lógica).

**11. A linguagem**

**Muda QUAL bug você procura, não se há bug.** Rust é menos frágil em memória — **e igualmente
frágil em lógica e parsing.**

**12. O que sobra**

Depois de **fuzzing**: bug que o fuzzer não alcança. Depois de **auditoria**: bug sutil e o que a
auditoria não cobriu. Depois de **anos de CVE**: lógica, confusão de camada, invariante.

**13. As cinco regiões**

Parser differential · confusão de camada · lógica/invariante · código novo · **o que você conhece
por dentro**.

**14. A mais reprodutível**

**Parser differential** — porque "dois parsers, mesmo dado, resultados diferentes" é pergunta que
**se aplica a qualquer sistema com mais de um componente**.

**15. Confusão de camada**

Quando **a camada de cima decide algo que a de baixo re-lê**. Exemplos: HTTP/2 downgrade, `Pingora`
(CVE-2025-4366 e CVE-2026-2833).

**16. Bug de lógica e fuzzing**

Porque **a entrada é válida e a SAÍDA é que está errada**. Nenhum fuzzer compara com o que o sistema
**deveria** ter feito.

**17. Código novo**

Porque **nenhum auditor passou ainda**. Uma biblioteca de 2024 sem auditoria tem mais bug que o
`OpenSSL` — **e você não precisa ser melhor; precisa chegar primeiro.**

**18. Vantagem absoluta**

**O que você conhece por dentro.** Você tem o código, o histórico, e a intuição de onde ele é
frágil — **e ninguém mais tem isso**.

**19. Escrever o limite**

Porque **é mais fácil respeitar um limite que você escreveu antes de começar**. Depois, o achado
torna a linha tentadora.

**20. Alvo esgotado**

Quando **a superfície acessível acabou** — e os indicadores são maturidade 5 + competição 5. **O
que fazer:** trocar (módulo 9), ou aprofundar numa superfície específica.

---

## Módulo 3 — Ler um patch

**1. O patch é a documentação mais honesta**

Porque **o desenvolvedor teve que corrigir de verdade** — e a correção diz **qual** problema. A
descrição do advisory pode ser vaga; **o diff mostra o código exato**.

**2. Os três níveis**

1 — **o que mudou** · 2 — **por que isso corrige** · 3 — **qual invariante foi violado**.

**3. O nível 1**

**O que mudou** dá a mudança e nada mais. Serve para pouco — **o mecanismo e o padrão estão nos
níveis 2 e 3**.

**4. A diferença operacional**

O nível 2 te dá **este bug**. O nível 3 te dá **o PADRÃO** — e **o padrão é reutilizável**, porque
é o que você procura em outros lugares.

**5. Invariante**

Afirmação que **DEVE valer** num ponto do programa, e que o código garante (ou não). Exemplos:
`len <= máx` · `ptr != NULL` · `índice < tamanho` · estado consistente · dado é do tipo certo.

**6. Sintoma vs. raiz**

**Sintoma** impede o caso específico (`len == 0x400`). **Raiz** elimina a possibilidade do padrão
(`len > máx`). Só a segunda sobrevive a variante.

**7. Três correções incompletas**

Verificar **um caminho** e não o outro (a mesma falha pelo outro lado) · verificar **depois** do uso
(a janela fica aberta) · verificar o **resultado** e não a operação (o estouro já aconteceu).

**8. `if (a + b < a)`**

Porque **é UB** — **a operação já aconteceu**, e o compilador pode eliminar a verificação (curso de
C, módulo 5). **O correto:** `if (b > SIZE_MAX - a)`.

**9. Proveniência do build**

Porque **compilador, flags e ordem de linkagem diferentes** produzem diferenças que **não são de
segurança**. Comparar builds diferentes torna o diff inútil.

**10. Cinco itens de sinal**

Um `if` acrescentado · comparação com limite · verificação de tipo · mudança de tipo (`uint16` →
`size_t`) · retorno de erro novo.

**11. Cinco itens de ruído**

Endereço diferente · registrador diferente · otimização diferente · inline/desinlined · strings
movidas.

**12. A heurística**

**Mudança de CONTROLE DE FLUXO é sinal. Mudança de FORMA é ruído.**

**13. DiffRays**

O modo automático que, **dado o CVE**, identifica o componente, **baixa os dois binários** e roda o
diff. Automatiza **o passo que trava o iniciante**.

**14. PLocator**

Localiza **o código do patch** a partir do patch + duas funções de referência.

**15. EnBinDiff**

Porque **focou em patch "data-only"** e melhorou o tratamento — reduzindo falso negativo de 11%
para 1,63%, e **achando 20 1-days reais**.

**16. Os cinco tipos de irmão**

Mesmo arquivo · por caminho · por formato · **por ecossistema** · **por especificação**.

**17. Por ecossistema dá 0-day**

Porque **o projeto B nunca recebeu patch nenhum** — ninguém reportou nele. **O projeto A sabe que o
padrão existe; o B não.**

**18. `grep` que casa não é irmão**

Porque **irmão é o mesmo PADRÃO, verificado por leitura**. Um `grep` que casa pode ser falso
positivo dos cinco tipos.

**19. HTTP Garden**

Fez **fuzzing diferencial de fluxo HTTP** contra **N servidores** — achando 100+ bugs, 68 corrigidos,
39 exploráveis. **É o tipo 4 em escala.**

**20. Não determinar a primitiva**

Porque **a leitura não prova a alcançabilidade nem o efeito final**. **Declarar "não sei" é mais
forte que afirmar sem verificar** (módulo 11, vício 3).

---

## Módulo 4 — Ler um CVE

**1. Para quem o advisory é escrito**

Para **quem vai atualizar** — não para quem vai entender. **Ele diz o que fazer, não por que.**

**2. A fonte mais precisa**

**O commit de correção.** Porque o desenvolvedor teve que **corrigir de verdade**, e a descrição
pode ter sido escrita **antes** de entender completamente.

**3. Por que o CVSS é o menos útil**

Porque **mede IMPACTO, não padrão**. Um CVE com CVSS 9.8 pode ser irrelevante para você (condição
exótica), e um com 5.0 pode ser o mais interessante (padrão que se repete).

**4. O campo que dá a classe**

**O CWE.** É o nível 3 do módulo 3 entregue de graça — **a classe dá a busca**.

**5. Por que o crédito importa**

Porque o pesquisador que reportou **frequentemente tem writeup ou talk** — e isso abre o material
que explica **o método**.

**6. Três passos**

Advisory (componente, versão, CWE) → versões (o N-1 exato) → **commit** (o diff).

**7. "Improper input validation"**

Ignorar e ir ao commit. **É genérico demais para dar padrão.**

**8. "Integer overflow leading to..."**

A **causa é a aritmética**; o overflow de buffer é o **efeito**. **Você procura a aritmética.**

**9. A sequência de reconstrução**

Advisory → versões → commit → **invariante** → caminho → primitiva → **e sem PoC**, a reconstrução
vem da leitura.

**10. Reconstruir sem PoC**

Porque **treina o reflexo** — e **prepara para o bug que ainda não existe**. Ler o PoC alheio não
desenvolve a mesma habilidade.

**11. Silent patch**

Correção de segurança **que não gerou CVE nem advisory**.

**12. Por que vale mais**

Porque **há um CVE para cada N patches de segurança** — **os outros N-1 estão sem aviso e sem
caçador**.

**13. Como achar**

Duas versões consecutivas, `git log` com termos de correção (`fix`, `bound`, `check`, `validate`),
**descartando os que têm CVE**. O que sobra, você lê.

**14. A proporção de commits com CVE**

Porque **a diferença entre o total e os com CVE é a estimativa de silent patches**. É o tamanho da
superfície sem aviso.

**15. O critério mais importante**

**"O padrão se repete?"** — vale mais que o impacto.

**16. CVSS 9.8 vs. 7.5**

Porque o **9.8 tem padrão exótico** (não se repete), e o **7.5 está no protocolo** (se repete em
toda implementação). **O padrão é o critério, não o impacto.**

**17. CWE-444**

Porque **o padrão do smuggling está na especificação** — e **toda implementação pode errá-lo
independente**. É a região mais produtiva hoje.

**18. Padrão na especificação**

Porque o RFC **exige** um comportamento — e **cada implementação o cumpre (ou não) de forma
independente**. O padrão **não é do projeto; é do protocolo.**

**19. CWEs a evitar**

Os que **dependem de condição exótica** — build específico, configuração rara, versão particular.
**Sem repetição, sem valor.**

**20. Não determinar**

Porque a **leitura não prova alcançabilidade nem efeito**. É legítimo — e **declarar isso é o que o
módulo 11 chama de honestidade**.

---

## Módulo 5 — Ler um paper

**1. Paper não ensina técnica**

Porque **ele prova que o PADRÃO existe** — e é isso que muda a sua fila de trabalho. **O "como
fazer" está no artefato, se houver.**

**2. O que o paper dá que o CVE não dá**

**A população.** O CVE te dá **um bug**; o paper te dá **"este padrão existe em 100 sistemas, e eu
testei em 40"**. É a diferença entre saber que há um leão e saber **onde está a manada**.

**3. Os três passos**

**Passagem** (5–10 min, vale o passo 2?) · **Leitura** (~1 h, entendi o método?) · **Estudo**
(várias h, confio? uso?).

**4. Qual produz valor**

**O passo 3** — porque **é onde você verifica se o método funciona no SEU contexto**. A maioria para
no 1.

**5. O que o passo 1 decide**

**Se vale a leitura completa.** É econômico porque **a maioria dos papers não merece o passo 2** —
e reconhecer isso em 10 minutos é habilidade.

**6. O que ler primeiro no passo 2**

**As figuras e tabelas.** Porque **o resultado REAL está ali** — e o abstract pode dizer "até N×"
enquanto a tabela mostra a média.

**7. Os campos da ficha**

**Cinco:** método, resultado, **limitação declarada**, **limitação não declarada**, replicabilidade.
**Extras:** o padrão provado, o espaço em branco, a aplicação ao alvo.

**8. Declarada vs. não declarada**

**Declarada:** o que **os autores admitem** (procure em "Threats to Validity"). **Não declarada:**
o que **você percebe e eles não viram**.

**9. Por que ler a tabela antes**

Porque **o abstract vende, a tabela mede**. **"Até 2,26× mais"** é o melhor caso; **a média está na
tabela.**

**10. O que "até N×" esconde**

**Que é o melhor caso.** A média pode ser bem menor.

**11. O que "state-of-the-art" esconde**

**Comparado a quem, com que dado, em que configuração.** Um método pode ser SOTA num dataset e pior
em outro.

**12. "Disponível sob pedido"**

Limita **a possibilidade do passo 3**. Você não consegue verificar nem reimplementar.

**13. O tempo**

**Se ninguém replicou em cinco anos**, o método pode ser bom e ignorado — ou pode **não funcionar
fora do contexto do autor**. O tempo é o juiz.

**14. Por que um survey vale**

Porque **não traz bug — traz MAPA**. E **mapa é o que decide o alvo** (módulo 2).

**15. O campo mais importante**

**"O padrão que este paper prova que existe."** É a abstração do módulo 3 (nível 3) **aplicada a uma
população**.

**16. Espaço em branco**

**O que o paper não testou.** É o mais valioso porque **é onde você vai** — e **o próprio paper
declara onde não foi**.

**17. HTTP Garden e HTTP/1.1 Must Die**

Porque o **HTTP Garden (2024) testou HTTP/1.1** e **declarou que HTTP/2 ficou para trabalho
futuro**. **O `HTTP/1.1 Must Die` (Kettle, 2025) foi exatamente lá.**

**18. Dois papers que declaram não testar HTTP/2**

**HTTP Garden** e **WAFFLED**. Os dois declaram a limitação — **e é isso que o campo 9 captura**.

**19. O que o `1dFuzz` prova**

Que **o patch tem uma "trailing call sequence" identificável** — e que **fuzzing dirigido pela
posição do patch funciona** (2,26× mais, 43% menos tempo).

**20. O que o `EnBinDiff` prova**

Que **o padrão se REPETE entre projetos** — encontrando **20 1-days em binários reais**, com falso
negativo de 11% → 1,63%.

---

## Módulo 6 — Hipótese falsificável

**1. Expectativa, pergunta, hipótese**

**Expectativa:** "deve ter bug aqui" — não se falsifica. **Pergunta:** "o parser valida o tamanho?" —
indaga, mas não afirma. **Hipótese:** "o parser NÃO valida `len` antes do memcpy, porque a
verificação existe só no caminho de erro" — **afirma, e é derrubável.**

**2. Hipótese sem critério**

Porque **não há como derrubá-la** — e **expectativa se confirma por teimosia**.

**3. O valor está no que ela exclui**

Porque **uma hipótese que nunca pode ser derrubada é inútil** — **mesmo se confirmada, você não
aprendeu nada que pudesse ser diferente.**

**4. Os quatro campos**

**Invariante** · **afirmação** · **observação** · **critério de falsificação**.

**5. O critério é negativo**

Porque **"morre se [observação]"** define **o que você vai olhar**. Uma afirmação positiva não
distingue confirmar de não testar.

**6. Por que o critério vem antes**

Porque **se você não sabe o que te derruba, não sabe o que está olhando**. O critério define a
observação, e a observação define o teste.

**7. As cinco hipóteses ruins**

"Tem bug aqui" · "não é seguro" · **"se eu fuzzar, acho algo"** · **"a ferramenta não achou"** ·
"isto é claramente vulnerável".

**8. Por que "vou fuzzar" é método**

Porque **é uma técnica de busca, não uma afirmação sobre o sistema**. **Método sem alvo é
cobertura.**

**9. Como o `1dFuzz` evita**

Porque **o patch define o ALVO** — a posição do bug — e **o fuzzer é guiado até lá pela distância de
chamada**. **Não é "fuzzar e ver"; é "fuzzar com destino".**

**10. "A ferramenta não achou"**

Porque **ausência de achado não é observação sobre o sistema** — é observação **sobre a cobertura da
ferramenta**. A ferramenta cobre o **conhecido**.

**11. Reformular "isto é vulnerável"**

**"Com o campo X em N, a validação é ignorada"** — específica, com observação e critério.

**12. Os quatro insumos**

**Patch** (dá o invariante pronto) · **CVE** (dá a classe) · **paper** (dá o padrão numa população) ·
**leitura livre** (dá a suposição).

**13. Qual dá pronto**

**O patch** dá o invariante pronto. **A leitura livre é a mais difícil** — você precisa **deduzir o
invariante**.

**14. Os três tipos de observação**

**Leitura** (sempre disponível) · **código próprio** (verifica o mecanismo) · **alvo autorizado**
(confirma no sistema real). ⚠ **Terceiro não existe.**

**15. A linha do terceiro**

**Não existe.** Nem "só um testinho" — porque **a técnica não distingue intenção**.

**16. Como testar por leitura**

Ler o arquivo · traçar o fluxo da entrada · **marcar todo ponto de uso** · perguntar o que cada um
assume · verificar se algo garante antes · **se nada garante, a hipótese sobreviveu**.

**17. O que a leitura não prova**

**Que o caminho é alcançável** · **que não há validação em outra camada** · **que o efeito é o que
você imagina**.

**18. "Morrer"**

A hipótese **foi falsificada pelo teste** — e **é resultado** (módulo 1). Registra-se e segue.

**19. O que a verificação de mecanismo acrescenta**

**Mostra o mecanismo acontecer** — e **o que a validação impede**. É a diferença entre **ler que
falta um `if`** e **ver o `memcpy` estourar sem ele**.

**20. Inconclusivo aponta para o teste**

Porque **"não consegui decidir" significa que o método falhou** — não que o alvo é seguro.

---

## Módulo 7 — Variante e sibling bug

**1. Não precisa ser mais inteligente**

Porque **um patch corrige UM lugar** e **o padrão existe em todo lugar onde o mesmo raciocínio foi
aplicado**. **O desenvolvedor corrigiu o que o relatório descreveu, e seguiu em frente.**

**2. Por que a variante é o caminho mais curto**

Porque **a distância entre "o bug corrigido" e "o mesmo padrão não corrigido" é o trabalho de BUSCA**
— e ela é pequena, porque **você já sabe o que procurar.**

**3. 1-day vs. 0-day**

**1-day:** o projeto **já corrigiu em outro lugar** — então **ele sabe que o padrão existe**.
**0-day:** **o projeto nunca soube** — porque **ninguém reportou nele**.

**4. Os cinco tipos**

Mesmo arquivo · por caminho · por formato · **por ecossistema** · **por especificação**.

**5. Quais dão 0-day**

**Por ecossistema** e **por especificação** — porque a superfície é **N projetos independentes**.

**6. Por que o tipo 2 é subestimado**

Porque exige **ler o FLUXO, não a função**. E porque **o caminho não corrigido é frequentemente o de
compatibilidade** — que existe para dado antigo e **ninguém olha há anos**.

**7. Por que o caminho não corrigido é o menos usado**

Porque **é o caminho lento, ou o legado**. **Menos uso → menos teste → menos atenção → menos chance
de alguém achar.**

**8. Os cinco níveis**

Termo · estrutural · **AST** (`semgrep`) · **CodeQL** · **fuzzing diferencial**.

**9. Barato vs. caro**

**`grep` (níveis 1 e 2) é barato** — e sempre o primeiro. **CodeQL exige aprender a linguagem de
consulta** — e **vale quando o padrão é específico e o projeto é grande**.

**10. `grep` por `memcpy`**

Porque **acha 500 ocorrências** — a maioria legítima. **A forma já filtra um pouco (nível 2), mas o
falso positivo continua alto.**

**11. O que o CodeQL alcança**

**A RELAÇÃO entre dados** — "o comprimento vem de dado não confiável e não foi validado". **Acha 3
de 500.**

**12. Qual alcança o projeto B**

**O nível 5 (fuzzing diferencial)** — porque **compara COMPORTAMENTO**, não código. **O projeto B
está escrito de outra forma, mas se comporta igual.**

**13. O que o `1dFuzz` usa**

A **"trailing call sequence" (TCS)** — **a sequência de chamadas que segue a correção** — para
**localizar a posição do bug** e **dirigir o fuzzer até lá**.

**14. Fuzzing cego sem hipótese**

Porque **ele tem cobertura, mas não ALVO**. **É o mesmo que o método do módulo 6 (hipótese ruim nº
3): "vou fuzzar" é método sem afirmar nada.**

**15. Fuzzing diferencial**

**Manda a MESMA entrada para DUAS implementações** — e **a discrepância é o sinal**.

**16. Discrepância é candidato**

Porque **pode ser implementação legítima diferente**, ou **documentado na especificação**. **É
candidato, e você verifica.**

**17. Qual discrepância importa no smuggling**

**Diferença de FRAMING** — sobre **onde a mensagem termina**. Quando os dois discordam sobre o
limite, **um lê o resto como outra requisição**.

**18. Os cinco falsos positivos**

O chamador valida · outra camada valida · caminho inalcançável · a especificação permite · **código
morto**.

**19. Qual transforma candidato em bug**

**A especificação.** Se o RFC diz "o servidor DEVE recusar" e a implementação aceita — **é bug, sem
discussão**. É por isso que o tipo 5 é o mais forte: **tem o critério embutido.**

**20. "Correção incompleta"**

Porque significa que **o padrão persiste onde o mantenedor ACHOU que tinha resolvido**. É o que o
`EnBinDiff` fez: **achar o que a correção não pegou.**

---

## Módulo 8 — Registro de pesquisa

**1. Por que o registro é o produto**

Porque **pesquisa é acumulativa, e o que acumula é o registro**. Sem ele, **cada investigação
começa do zero** — porque você esqueceu o que já eliminou.

**2. Para você vs. para outro**

**Para você:** lembrar. **Para outro:** **reproduzir**. E se outra pessoa não consegue, **não serve
para nada.**

**3. As dez seções**

ID · pergunta · de onde veio · invariante · hipótese · **critério** · teste · **evidência** ·
conclusão · **sobras**.

**4. As três decisivas**

**Critério de falsificação** (sem ele, não há método) · **evidência literal** (sem ela, vira
alegação) · **sobras** (sem elas, não acumula).

**5. A regra da evidência**

**Comando e saída, literais, com data e versão.** Não "eu vi".

**6. Os quatro erros**

Evidência sem comando · conclusão sem critério · fonte sem referência · **sem sobras**.

**7. Qual mata o acúmulo**

**Sem sobras.** Porque **cada investigação fica isolada**, e você tem N investigações independentes
— **não um programa de pesquisa**.

**8. O mais fácil de corrigir**

**Evidência sem comando** — basta **copiar o comando junto com o resultado**. Custa dez segundos.

**9. Seis elementos**

Versão · commit · **comando literal** · entrada · ambiente · **data**.

**10. Por que a data importa**

Porque **um achado de 2025 pode ter sido corrigido em 2026** — e **o registro sem data não diz se o
achado ainda vale**.

**11. Por que o ambiente**

Porque **um comportamento observado na glibc 2.36 pode não ocorrer na 2.31**. Sem isso, **você não
reproduz.**

**12. O que o registro sem data não permite**

**Saber se a observação ainda vale.** É a diferença entre prova e anotação.

**13. Os três tipos de ligação**

**Deriva de** · **destrava** · **contradiz**.

**14. A mais valiosa**

**Contradiz** — porque **quando uma investigação refuta a anterior, você aprendeu sobre o SISTEMA**,
e não só sobre o caso.

**15. O que a contradição evita**

**Repetir a mesma hipótese errada sob outro nome.** Economiza semanas.

**16. Por que é grafo**

Porque **as investigações se ligam** — e **é a ligação que faz acumular**. Uma lista perde as
relações.

**17. A coluna "destrava"**

**O grafo em forma de tabela** — o que você abre quando quer saber onde continuar.

**18. Por que não reescrever**

Porque **a história fica preservada** — e **é isso que permite ver o raciocínio**. Você muda o
**estado**, não a ficha.

**19. A mesma disciplina**

**O "confirmado por" do curso de Linux é o comando que prova o estado do sistema.** Aqui é o comando
que prova a observação. **O selo é o comando, não a intenção.**

**20. Três meses depois**

**Reconstruir o raciocínio** — e **saber o que já foi eliminado**, para não repetir.

---

## Módulo 9 — Quando desistir

**1. Dispersão vs. teimosia**

**Desistir sem critério:** você troca de alvo por cansaço. **Insistir sem critério:** você continua
por apego. **O método é ter o critério antes de precisar dele.**

**2. Onde escrever o critério**

**Junto com a hipótese** — **antes de investir tempo**. Depois, o custo afundado contamina o
julgamento.

**3. Os três tipos de parada**

**Falsificou** · **inconclusivo** · **alvo esgotado**.

**4. Falsificado vs. inconclusivo**

**Falsificado:** o teste **decidiu**, e a hipótese caiu. **Inconclusivo:** o teste **não decidiu** —
**o problema é o teste**.

**5. Por que falsificar é resultado**

Porque **elimina uma possibilidade**, e **a próxima tentativa é informada**. É o que faz acumular.

**6. O que "inconclusivo" diz**

Que **o teste foi mal desenhado** — não que o alvo é seguro. **Reformular o teste é mais barato que
trocar de alvo.**

**7. O que "alvo esgotado" diz**

Que **a superfície acessível acabou** — **não é sobre a hipótese, é sobre o alvo**.

**8. Os três erros de confusão**

Confundir **inconclusivo com falsificado** (troca de rumo cedo) · **falsificado com alvo esgotado**
(troca de alvo sem motivo) · **alvo esgotado com teimosia** (insiste onde não há).

**9. Custo afundado e antídoto**

O tempo gasto **não deve influenciar** a decisão. **Antídoto:** o critério escrito antes, e a
pergunta **"se eu começasse hoje, investiria aqui?"**

**10. A pergunta**

**"Se eu começasse hoje, investiria aqui?"** — **zera o passado** e deixa só o mérito.

**11. Por que funciona**

Porque **remove o investimento da equação** — e **a decisão passa a ser sobre o sistema**, não sobre
o que você já gastou.

**12. A comparação com exploit dev**

**Quando o exploit falha, você verifica o OFFSET — não "tenta mais".** A decisão é sobre o **dado**,
não sobre a **vontade**.

**13. Hipótese falsificada ensina**

Que **o invariante É garantido ali** — e melhora a precisão da sua leitura.

**14. Teste inconclusivo ensina**

Que **o teste foi mal desenhado** — e melhora o seu **desenho de teste**.

**15. Alvo esgotado ensina**

**Que tipo de alvo não rende** — e melhora a sua **escolha de alvo**.

**16. Falso positivo ensina**

**Qual dos cinco ele era** — e melhora o seu **filtro de busca**.

**17. Por que três são sobre você**

Porque **você também está aprendendo a pesquisar** — e **os três (teste, alvo, filtro) são sobre o
seu método**, não sobre o sistema.

**18. Muito auditado vs. muito quebrado**

**Muito auditado:** muita gente olhou. **Muito quebrado:** ainda acham. **Os dois podem ser verdade
ao mesmo tempo** — porque a superfície é grande.

**19. O sinal de alarme**

**"Vou tentar de novo" pela terceira vez.** É custo afundado disfarçado de rigor. **Em vez disso:**
mudar o **teste**, ou reformular a **hipótese** — nunca repetir igual.

**20. Por que é o módulo 10**

Porque **quando o alvo esgota, a vontade é "testar aquele outro sistema"** — que frequentemente
**está fora do escopo**. É a tentação que o módulo 10 trata.

---

## Módulo 10 — Escopo e ética

**1. Por que mais tentado aqui**

Porque **este curso é sobre derivar padrão** — e **um padrão derivado aponta para outros sistemas**.
**A pergunta seguinte frequentemente está fora do escopo.**

**2. Qual passo é a linha**

**O passo 5 — "preciso confirmar".** Os passos 3 e 4 (ler o projeto B, achar o padrão no código)
são **legítimos**. O 5 transforma **leitura** em **teste não autorizado**.

**3. Três argumentos que não funcionam**

"É público" · "só quero confirmar" · **"é só um GET"**.

**4. "O fornecedor precisa saber"**

Porque **é verdade** — **e o caminho é REPORTAR, não testar**. Você leu, você tem o padrão, você tem
a hipótese. **O fornecedor confirma no ambiente dele.**

**5. "É só um GET"**

Porque **quase todo ataque começa com um**. O `1dFuzz` reproduz bugs com **um request**; o padding
oracle funciona com requests inocentes.

**6. O que fazer em vez do passo 5**

**Escrever o achado com a evidência da LEITURA.** **"Na versão X, commit Y, a função Z não valida o
campo W"** é um achado completo.

**7. Por que a leitura basta**

Porque **a evidência de código é verificável** — e **o mantenedor confirma a alcançabilidade** no
ambiente dele, onde tem autoridade.

**8. As cinco situações de posse**

**Seu código** (corrigir) · **cliente** (reportar ao cliente) · **projeto aberto** (reportar ao
mantenedor) · **terceiro** (reportar ao terceiro) · **não sei** (⚠ **declarar incerteza**).

**9. Reportar vs. testar**

**Reportar** é o canal previsto — pode ser feito **sem tocar no sistema**. **Testar** é **enviar
entrada ao sistema de outro** — e exige autorização.

**10. Onde reportar**

`/.well-known/security.txt` · `SECURITY.md` · GitHub Security Advisory (privado) · `security@` do
domínio. ⚠ **Nunca** issue pública.

**11. Quando não sabe de quem é**

**Declarar incerteza** — e **não atribuir por proximidade**.

**12. Prazo padrão**

**90 dias** — o padrão do mercado, adotado explicitamente pelo Project Zero.

**13. Vantagem da leitura**

**O alcance.** Você pode ler **40 implementações** — o `HTTP Garden` fez e achou 100 bugs.
**Testar 40 exigiria autorização de 40 partes.**

**14. Limitação da leitura**

**Não prova alcançabilidade.** Mas **isso não é fraqueza — é declaração**: você reporta e o
mantenedor confirma.

**15. O que a seção de limites acrescenta**

**Credibilidade.** Prova que você **separou o verificado do inferido** — e é o que faz o
mantenedor confiar no resto.

**16. O que pedir ao mantenedor**

**Duas perguntas objetivas:** o caminho é alcançável? outra camada valida? **Ele responde no
ambiente dele, com autoridade que você não tem.**

**17. Por que o escopo não cobre**

Porque o **bug bounty cobre a instância em produção** (`*.projetob.com`) — e **o código open source
que você leu está fora dele**.

**18. Isso impede o achado?**

**Não.** Porque **você não precisa testar** — **lê, escreve o achado, e reporta pelo `security.txt`**.
**A evidência é a leitura**, e ela está sempre disponível.

**19. Se você já cruzou**

**Parar**, **não usar o dado**, **reportar o ocorrido** — e registrar na declaração.

**20. A linha em uma frase**

**"Ler é sempre legítimo; testar exige autorização escrita."**

---

## Módulo 11 — Escrever o achado

**1. Por que comunicar**

Porque **achado que não é comunicado não é achado** — e comunicar mal **destrói o valor**, mesmo
quando o bug é real.

**2. Os quatro vícios**

**Inflar** · **vago** · **onisciente** · **longo sem estrutura**.

**3. Qual derruba a confiança**

**Onisciente** — porque **uma inferência apresentada como fato é um ERRO verificável**, e erros
derrubam a confiança no relatório inteiro.

**4. Inferência como fato**

Porque **o mantenedor tenta verificar e não consegue**. **"É explorável remotamente"** vira
**"não consegui reproduzir"** — e o resto do relatório é descartado.

**5. Os três formatos**

**Nota técnica** (você e quem segue — registro completo) · **advisory** (mantenedor e usuários — 1
página) · **relatório de pesquisa** (comunidade ou cliente — 5–15 páginas).

**6. O que o advisory omite**

**O caminho de exploração.** Porque **enquanto a correção não está aplicada, o caminho detalhado é
uma arma.**

**7. Por que não é censura**

Porque **é o padrão da área** — e o material do `TORCH` diz explicitamente que não fornece os passos
para transformar um diff em exploit.

**8. As quatro partes**

**O que é** (2–3 frases) · **evidência** · **impacto — e o que não sei** · **correção sugerida**.

**9. Por que a ordem é contrária**

Porque **quem escreve narra o processo**, e **o mantenedor lê duas páginas e sai**. **O essencial
vem primeiro; o método vira apêndice.**

**10. A parte 3**

**Impacto E o que você não sabe** — na mesma seção. **Fortalece**, porque mostra que você **separou
o verificado do inferido**.

**11. O que não entra na evidência**

**Adjetivo.** "Claramente vulnerável" é **afirmação sem evidência**. **O código e o commit falam por
si.**

**12. Contraste interno**

**"O mesmo projeto valida em `parser.c:88`."** É forte porque **prova que o invariante é conhecido
pelo projeto** — e **que o ponto corrigido foi esquecido**.

**13. Os cinco canais**

`/.well-known/security.txt` · `SECURITY.md` · GitHub Security Advisory · `security@` · ⚠ **issue
pública: nunca**.

**14. Por que a issue pública é última**

Porque **expõe TODOS os usuários antes de existir correção**. É divulgação irresponsável.

**15. Se discordar**

**Aceite** — porque **ele conhece o contexto**: a arquitetura, a API pública, os usuários.
**Insistir é o mesmo custo afundado do módulo 9.**

**16. O que não enviar**

**PoC funcional**, mesmo se pedido. **Descreva o suficiente** — e ele confirma no ambiente dele.

**17. Por que "não verifiquei" fortalece**

Porque **o mantenedor sabe que você é honesto sobre o escopo do que fez** — e isso faz o resto do
relatório ser levado a sério.

**18. A nota técnica**

**É o registro completo** — não omite o método nem o caminho. É o material que sustenta os outros
dois formatos.

**19. O relatório de pesquisa**

**O método explícito** (as sete perguntas, os níveis de leitura) e **a limitação declarada**. É o
que a comunidade pode avaliar.

**20. A declaração de conduta**

Porque **o que você não fez protege tanto quanto o que fez** — e **declarar é o que impede a
dúvida.**

---

## Módulo 12 — Projeto

**1. O percurso, não o achado**

Porque **o que se acumula é o método** — e **uma pesquisa que não achou, mas documentou o que
eliminou, informa a próxima**.

**2. Falsificar é válido**

Porque **eliminou uma possibilidade** — e **o registro diz qual**. **É o resultado mais provável num
projeto de 3 horas.**

**3. O que não é válido**

**Não achar e não registrar**, ou **achar e não documentar**. **O percurso sem registro não
informa ninguém.**

**4. Por que o alvo vem primeiro**

Porque **sem alvo, nada se faz** — e **sem o critério, você escolhe pelo prestígio**.

**5. O que a avaliação evita**

**"Acho que é difícil"** → **"tem 47 CVE em dois anos, está no `oss-fuzz`, e tem sanitizer no CI"**.
**A decisão passa a ser informada.**

**6. As sete perguntas**

Porque **transformam "vou olhar o código" em pesquisa** — cada uma é uma pergunta que gera a
seguinte.

**7. A convergência**

**Sinal forte** — porque **três fontes independentes concordam**. É a mesma lógica do módulo 7 do
curso de OSINT.

**8. Declarar o insumo que não obteve**

Porque **faz parte do método** — **omiti-lo faria o relatório parecer completo e ser menos útil**.

**9. Hipótese antes da busca**

Porque **evita a busca sem destino** — o erro que o módulo 6 chama de hipótese ruim nº 3.

**10. "Morre se"**

**Que existe uma observação concreta que derruba a hipótese** — e portanto que **você sabe o que
está olhando**.

**11. Limite de esforço antes**

Porque **depois, o custo afundado contamina o julgamento** — e **o limite decide por você**.

**12. Níveis 1 e 2**

**Onde o nome aparece** e **onde o padrão de uso aparece**. **Não alcançam a relação entre dados**
(CodeQL) nem **o comportamento** (fuzzing diferencial).

**13. Verificar os cinco falsos positivos**

Porque **um `grep` que casa não é um irmão**. **Os cinco separam o candidato do achado.**

**14. Evidência literal**

**A reprodução.** A narrativa diz o que você achou; **o comando e a saída permitem conferir**.

**15. Data e commit**

Porque **dizem QUANDO e QUAL código** — e **sem isso você não sabe se a observação ainda vale**.

**16. O critério de parada**

**Se a investigação falsificou, ficou inconclusiva, ou se o alvo esgotou** — e **cada um leva a um
próximo passo diferente**.

**17. O que inconclusivo ensina**

Que **o teste foi mal desenhado** — e **melhora o seu desenho de teste**, não o seu conhecimento do
alvo.

**18. "Não verifiquei"**

Porque **prova que você separou o verificado do inferido** — e **é o que dá credibilidade ao
resto**.

**19. O backlog**

**A próxima pesquisa.** Sem ele, **cada investigação começa do zero** — e **nada acumula**.

**20. Cabe na leitura**

Porque **ler é sempre legítimo** — **material publicado**. **Nenhum contrato é necessário** para
ler código aberto, patch, CVE ou paper.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| **Critério de falsificação** | 30% | Sem ele, não é hipótese |
| Evidência literal | 25% | Comando e saída, não narrativa |
| Referência à fonte | 15% | Commit, versão, URL |
| Sobras | 15% | O que destrava |
| Declaração de limite | 15% | O que não verificou |

**Penalidades automáticas:**

- Hipótese sem critério: −30%.
- Evidência sem comando/código literal: −15%.
- Fonte sem referência (commit/versão): −10%.
- Sem "sobras": −15%.
- **Teste contra terceiro**: **lab zerado**.
- Registro declarado reprodutível mas sem versão/commit: −10%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| **Alvo** | escolhido por gosto | com justificativa | **avaliação numérica dos 4 eixos** |
| Método | lista de passos | as 7 perguntas | **+ a convergência dos insumos** |
| **Hipótese** | afirmação vaga | com observação | **+ "morre se" explícito** |
| Busca | um `grep` | níveis 1 e 2 | **+ falsos positivos verificados** |
| Caderno | fichas soltas | com ligações | **+ ao menos uma falsificada** |
| Parada | não menciona | menciona | **+ o que a falha ensinou sobre o método** |
| Achado | narrativa | no template | **+ contraste interno + limite declarado** |
| Limitações | ausente | 1 item | **3+ itens** |
| Sobras | ausente | 1 pergunta | **+ backlog priorizado** |
| Conduta | ausente | menciona | **todas as caixas + a linha em uma frase** |
| **Não achou nada** | — | — | **✓ ainda é exemplar se o percurso está completo** |

**Os dois itens de maior valor:**

1. **A hipótese com "morre se" escrito** — porque **é o que separa método de expectativa**, e é o
   item central do curso.
2. **A pesquisa que falsificou e documentou o que aprendeu** — porque **é o resultado mais provável,
   e o que a maioria trata como fracasso.**

---

*Material didático original. Leitura de código publicado, patch e paper — material de estudo. Nenhum
teste contra sistema de terceiro sem autorização escrita.*
