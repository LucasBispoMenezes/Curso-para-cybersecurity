# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos onze módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — Por que o diff é a fonte mais honesta

**1. Por que o diff é a fonte mais honesta**

Porque **o desenvolvedor teve que corrigir de verdade** — e **a correção diz qual problema**. A
descrição do advisory pode ser vaga (foi escrita antes de entender completamente); **o diff mostra o
código exato que mudou.**

**2. Os três cenários**

**Fonte aberta** (o commit — `git diff`) · **binário publicado** (N-1 e N — patch diffing) · **só o
advisory** (inferência pela classe). **O cenário 2 é o do curso** — porque a maioria do software
comercial publica binário, não fonte.

**3. O cenário mais difícil**

**O 3 — só o advisory.** Porque **não dá o código** — dá a direção. **E você depende da classe
(CWE) para inferir.**

**4. "Código do patch localizado"**

**A FUNÇÃO** — não a linha exata. **A linha não existe no binário.** **E a função é suficiente para
reproduzir.**

**5. O que o diff dá**

O código exato · o invariante violado · a classe · **o padrão** (e é isso que destrava a variante) ·
a localização.

**6. O que o diff NÃO dá**

A alcançabilidade · o impacto real · a severidade · a exploitação · **se há outro bug no mesmo
patch**.

**7. Por que ler o diff inteiro**

Porque **um patch pode corrigir DOIS problemas, e o advisory descreve só um.** **O diff mostra os
dois.** **É a primeira aparição do tema do módulo 9** (silent patch) — **um patch com dois consertos
é um caso menor do mesmo fenômeno.**

**8. A proveniência**

**Se o par é diffável ou não.** *"Compiler/build differences can create enormous noise."* **Sem
proveniência, 400 funções e nenhuma resposta.**

**9. Cinco fontes de ruído**

Compilador diferente · versão do compilador · otimização · ordem de link · **build não
determinístico**.

**10. A pior**

**O build não determinístico.** Porque **duas compilações do MESMO fonte diferem** — **e você acha
que é o patch.** **Solução: usar os binários oficiais.**

**11. O teste de determinismo**

**Compilar duas vezes o mesmo fonte e comparar.** `gcc -o b1 f.c && sleep 1 && gcc -o b2 f.c &&
cmp b1 b2`.

**12. Por que não recompilar**

Porque **recompilar muda a proveniência** — **e o diff contra o binário oficial vira ruído.** **O
`DiffRays` usa os oficiais por construção.**

**13. O que o `DiffRays` automatiza**

**Identificar o componente, baixar os dois binários oficiais, e rodar o diff.** **Confiável porque
usa os binários do pipeline oficial** — não recompila.

**14. Critério de escolha do primeiro par**

Patch pequeno · binário pequeno · **fonte também disponível** · CVE com descrição · CWE
interessante · **não kernel**.

**15. Por que o fonte também é valioso**

Porque **você pode diffar o binário e conferir contra o fonte** — **e é assim que se calibra a
leitura de binário.**

**16. Por que não o kernel**

Porque o **binário é gigante, o ruído é alto, e a leitura exige contexto de subsistema.** É excelente
material — **depois.**

**17. O que o `EnBinDiff` mediu**

Que **focando em patch data-only** o falso negativo cai de **11,02% para 1,63%** — **e que a técnica
acha 1-days reais (20).**

**18. O que o `PLocator` faz**

**Localiza o código do patch** a partir do patch + **duas funções de referência.**

**19. O caderno**

Segue o **módulo 3 do curso de Pesquisa** — e o **módulo 8** (registro). Porque o diff é uma
**investigação**, e investigação tem hipótese e critério.

**20. O que o diff permite**

**Entender por que a correção funciona** — o que a ferramenta não explica. **A ferramenta dá a
lista; o diff dá o raciocínio.**

---

## Módulo 2 — Ambiente e proveniência

**1. Por que o diff é tão bom quanto a proveniência**

Porque **um par ruim não é "diff com mais trabalho" — é diff inútil.** 400 funções mudadas, 399 de
build, **e você não sabe qual é a 1.**

**2. Os quatro testes**

Arquitetura · compilador · build · **determinismo**.

**3. O decisivo**

**O determinismo.** Porque **se o build não é reproduzível, recompilar não serve** — **e você
precisa usar o oficial.** **Ninguém faz porque parece detalhe — e é o que decide tudo.**

**4. Compilador diferente**

**Ruído garantido.** Porque **o compilador transforma o código de forma diferente** — e **o diff
mostra a diferença do compilador, não a do patch.**

**5. Se o build não for determinístico**

**Usar os binários OFICIAIS do fornecedor** — que vêm do mesmo pipeline.

**6. Por que o `DiffRays` é confiável**

Porque **baixa os binários **oficiais**, do mesmo pipeline.** **A proveniência é boa por
construção.** **A sua recompilação não tem isso.**

**7. Três causas de não determinismo**

Timestamp embutido (`__DATE__`) · caminho absoluto (debug info) · **UUID / ordem de link**.

**8. Build ID entre versões**

**Esperado** — é o objetivo dele. **Não impede o diff**, porque é **só um hash no cabeçalho.**

**9. Entre builds idênticos**

**Sinal de não determinismo.** **Duas compilações iguais devem dar o mesmo Build ID.**

**10. Os três casos**

**Determinístico** → recompilar é válido · **exceto Build ID** → diffável, ignore o ID · **não
determinístico** → use o binário oficial.

**11. O erro clássico**

**Ter o binário oficial e resolver recompilar "para comparar".** **O diff do seu build contra o
oficial é ruído.** **Você diffa oficial N-1 contra oficial N.**

**12. Por que o Patch Tuesday**

Porque **a Microsoft publica atualizações mensais, sistemáticas, para muitos produtos** — **e cada
uma é um par N-1 × N com CVE associado.**

**13. O `snapshot.debian.org`**

**Um arquivo histórico de TODOS os pacotes Debian, com data** — **você baixa exatamente o N-1 e o
N.** **É o "Patch Tuesday" do Linux, e quase ninguém usa.**

**14. Por que Docker é prático**

Porque **`docker pull imagem:versao-antiga` dá o binário exato, do pipeline oficial.** **Você não
recompila.**

**15. Por que a N-1 imediatamente anterior**

Porque **quanto menor a distância entre as versões, menor o ruído** — **menos código mudou além do
patch.**

**16. Por que registrar o hash**

Porque **é o que prova que você analisou ESTE binário.** **Sem ele, o registro não reproduz.**

**17. O que o `NOTAS.md` registra**

A **origem, a proveniência, o patch, o invariante, e as ordens que importam.** **O binário não
registra isso.**

**18. Por que a ordem importa**

Porque **a verificação de faixa vem antes da multiplicação** — **e a do destino antes do uso.** **Se
invertida, a correção não funciona.** **É o módulo 5 do curso de C.**

**19. O que o Ghidra faz**

**Carrega, analisa, casa funções, mostra lado a lado.** **A qualidade do casamento depende da
proveniência e dos símbolos.**

**20. O que separa um diff útil de um inútil**

**A proveniência.** **Os quatro testes são a diferença.**

---

## Módulo 3 — Diff de fonte

**1. Por que um commit de segurança é pequeno**

Porque **é cirúrgico** — **a correção é pontual, e o resto é outra coisa** (docs, testes, refactor).

**2. O que um release grande contém**

**Centenas de commits** — e **o de segurança é um.** **É a razão dos filtros (§3.3).**

**3. As cinco formas**

**Guarda acrescentada** · **guarda movida** · **condição corrigida** · **tipo alargado** ·
**validação acrescentada**.

**4. A mais sutil**

**A guarda movida.** Porque **o diff mostra o `if` em outro lugar** — **e sem atenção, você acha que
ele não mudou.** **Mas mover a verificação para antes do uso é correção** — **a janela estava
aberta.**

**5. Como reconhecer a forma 2**

**O mesmo `if` aparece em DOIS lugares** — um com `-` e outro com `+`. **É a assinatura.**

**6. Por que varrer e não ler**

Porque **o patch é sempre um bloco pequeno, reconhecível por forma.** **Ler linearmente gasta o tempo
no que não é o patch.**

**7. Por que os testes do patch são pista**

Porque **o teste diz o que o patch quer impedir** — **"count acima do máximo deve ser recusado"** é o
**invariante, entregue de graça.**

**8. Os três níveis**

**1 — o que mudou** · **2 — por que isso corrige** · **3 — qual invariante foi violado**.

**9. Qual habilita a variante**

**O nível 3** — porque **dá o PADRÃO**, e o padrão é o que se procura em outros lugares. **O nível 2
só dá este bug.**

**10. O que o padrão tem que o nome não tem**

**A forma.** **O nome muda de projeto para projeto; a forma não** — **e é o que permite a busca no
ecossistema.**

**11. Os cinco filtros**

Marcador (`CVE`) · mensagem (`fix`, `bound`) · **tamanho** · arquivo · autor.

**12. O mais eficaz**

**O de tamanho** (commits de 1–2 arquivos). **É o menos usado porque ninguém pensa em filtrar por
tamanho.**

**13. Como o autor ajuda**

Projetos grandes **têm equipe de segurança** — **e o commit vem do e-mail dela.** **É o caminho mais
direto.**

**14. O tracker da distro**

**O patch ISOLADO** — sem o resto do release. **O material mais limpo que existe.**

**15. Por que o backport é o mais limpo**

Porque **a distribuição pega só a correção de segurança** e a aplica na versão antiga — **isolada do
resto.**

**16. Quatro perguntas de completude**

**Sintoma ou raiz?** · verifica **antes ou depois** do uso? · cobre **todos os caminhos**? ·
**sobrevive a variante**?

**17. Por que um patch de sintoma deixa o bug vivo**

Porque **ele corrige o VALOR do PoC** (`len == 0x400`), **não a CONDIÇÃO** (`len > MAX`). **O
caminho ao lado continua.**

**18. O que o `PLocator` faz**

**Localiza o código do patch** — **a função** — a partir do patch e das referências.

**19. Por que o padrão precisa estar sem nomes**

Porque **o nome muda de projeto para projeto.** **"Campo lido da entrada usado em aritmética antes de
validação de faixa"** se procura em qualquer parser; **`c.count` não.**

**20. O que a hipótese precisa ter**

**Critério de falsificação.** Sem ele, **não é hipótese — é expectativa** (Pesquisa, módulo 6).

---

## Módulo 4 — Diff de binário, manual

**1. O que o Ghidra acha e o que não acha**

**Acha:** as funções que mudaram (400). **Não acha:** **quais das 400 importam.** **É o módulo 5, e é
seu.**

**2. Por que manual antes de automatizar**

Porque **sem entender o processo, você não julga a saída.** **A ferramenta dá a lista; sem o
critério, você não sabe qual é a resposta.**

**3. Os sete passos**

Criar projeto · importar os dois · criar a sessão de Version Tracking · **rodar os correlators** ·
**avaliar e iterar** · filtrar as que mudaram · ler o descompilado.

**4. Por que rodar vários correlators**

Porque **cada um casa por um critério diferente** (estrutura, string, símbolo, chamada). **Função
não casada aparece como "removida e adicionada"** — **e gera ruído falso.**

**5. Os cinco correlators**

**Symbol Name** (nome) · **Exact Function Bytes** (bytes) · **Function Comparison** (estrutura — o
principal) · **Data / String References** · **Call Graph**.

**6. O que muda com símbolos**

**O casamento fica quase perfeito, e o diff fica trivial.** **Sem símbolos, o ruído sobe e você
depende dos correlators de estrutura.**

**7. O que o fornecedor publica**

**Símbolos** — a Microsoft publica para o Windows; Linux tem pacote `-dbgsym`. **Símbolos
transformam um diff difícil em fácil.**

**8. Os seis sinais**

Contagem de instruções · **chamadas** · **comparações** · tipos · ramificações · **constantes**.

**9. O mais direto**

**A constante nova.** **Um valor que só aparece em N é quase sempre o limite.**

**10. Uma chamada nova**

**Validação acrescentada** — forma 5 do módulo 3.

**11. O que o Ghidra faz com o assembly**

**Traduz** para pseudocódigo legível. **Não interpreta** — **não diz se está certo.**

**12. Cinco equivalências**

`if (a > b)` → `cmp` + `jle` · `memcpy` → `call` + argumentos · `uVar1 = f()` → `call` + `mov eax` ·
`return -2` → `mov eax, 0xfffffffe` · `local_58[16]` → array na pilha.

**13. Por que os nomes ruins não impedem**

Porque **as formas do patch não mudam com a idade do binário.** **`uVar1` e `local_58` são o preço
de não ter símbolos** — **e você trabalha assim mesmo.**

**14. Os cinco atalhos**

**`if` a mais** · constante nova · chamada nova · tamanho · componente do CVE.

**15. Por que o `if` a mais é o mais eficiente**

Porque **o patch acrescenta UM `if`** — **e contar os `if` nos dois lados mostra qual função tem um a
mais.** **Reduz 400 para 1–3.**

**16. Por que o atalho de tamanho funciona**

Porque **a correção é pequena e cirúrgica** — **e "mudou pouco" é filtrável.**

**17. "Removida e adicionada"**

**Pode ser casamento ruim** — e não mudança real. **Confira se a função existe nos dois lados.**

**18. Como confirmar**

**Comportamentalmente:** o N-1 permite o que o N recusa.

**19. Por que a confirmação é comportamental**

Porque **sem ela, você tem uma DIFERENÇA DE CÓDIGO** — não uma **correção identificada.**

**20. A proporção esperada**

**1 sinal para cada 100 funções** que mudaram. **É por isso que ler tudo não escala.**

---

## Módulo 5 — Sinal e ruído

**1. O critério único**

**"Se eu executar os dois com a mesma entrada, o resultado PODE diferir?"**

**2. A conexão com o fuzzing diferencial**

**A mesma ideia:** o fuzzer compara **comportamento** de duas implementações — **e a diferença é o
sinal.** **"Mudança de comportamento" e "mudança de fluxo" são a mesma ideia.**

**3. Cinco sinais e cinco ruídos**

**Sinal:** branch novo, comparação diferente, chamada nova, **constante nova**, tipo diferente.
**Ruído:** endereço, registrador, forma de zerar, instruções reordenadas, strings movidas.

**4. Qual exige verificação**

**O registrador trocado.** **Pode ser ruído** (o compilador escolheu outro) **ou sinal** (o dado vem
de outro lugar). **Verifique rastreando de onde o valor vem.**

**5. Os quatro falsos sinais**

**Registrador trocado** · **função inlined** · **constante deslocada** · **função nova**.

**6. Qual é o mais comum**

**A função nova.** Uma função adicionada e **não chamada pelo código que mudou** provavelmente é
biblioteca — **e não altera comportamento.**

**7. Função nova: quando é sinal**

**Quando ela É CHAMADA** pelo código que mudou. **Se não é chamada, não muda comportamento** — e é o
mesmo raciocínio do "código morto" (Pesquisa, módulo 7).

**8. Os quatro filtros**

**Tamanho** · **branch novo** · **chamada/constante** · **leitura**.

**9. Por que o filtro de tamanho é o mais barato**

Porque **é instantâneo** — e **função que não mudou de tamanho provavelmente não mudou de
comportamento.**

**10. Por que você nunca lê as 400**

Porque **o custo cresce**: filtrar é segundos, ler é horas. **Você filtra e lê cinco.**

**11. Por que branch vale mais**

Porque **é a mudança de fluxo MAIS DIRETA.** **Tamanho sozinho é ruído** — por isso vale 1.

**12. Origens evitáveis**

**Otimização · compilador · não determinístico** — todas se evitam **usando o binário OFICIAL.**

**13. Inevitáveis**

Ordem de link · biblioteca estática · **PIE**. **O que fazer:** ignorar endereços, filtrar por "é
chamada?", comparar offsets.

**14. Por que comparar offsets**

Porque **com PIE, o binário tem base variável** — **mas o offset é o mesmo.** **Comparar endereços
absolutos faz tudo "mudar".**

**15. O que o PIE muda**

**A base.** Você **alinha a base no Ghidra** (Image Base) **antes de comparar.**

**16. A proporção típica**

**1:100** — 50 a 400 funções mudadas, **1 a 5 são sinal.**

**17. O que a medição demonstrou**

**A diferença de ordem de grandeza:** mesma proveniência → poucas linhas; **proveniência diferente →
milhares.**

**18. Como confirmar**

**Pelo comportamento:** rode os dois com a entrada que dispara — **e veja se o N recusa o que o N-1
processa.**

**19. Em qual alvo**

**No seu** — compilado por você, CTF publicado, ou autorizado. **Nunca em terceiro.**

**20. O que a ferramenta faz**

**ORDENA por probabilidade.** **Não decide.** **A leitura confirma.**

---

## Módulo 6 — As ferramentas

**1. Onde todas param**

**Na LISTA.** **Quais das N importam é o módulo 5 — e é seu.**

**2. As quatro ferramentas**

**Ghidra** (analisa e casa) · **BinDiff** (diff estrutural) · **Ghidriff** (CLI) · **DiffRays**
(baixa e diffa). **Economizam:** descompilação, casamento, cliques, download.

**3. O que o `DiffRays` economiza e tira**

**Economiza:** o download e a coleta do par — **o passo mais chato.** **Tira:** **o contexto** —
**você não viu de onde veio, nem conferiu a proveniência.**

**4. Por que o `DiffRays` é confiável**

Porque **baixa os binários OFICIAIS** — **do mesmo pipeline.** **Não recompila.** **A proveniência é
boa por construção.**

**5. O que conferir depois**

**O que ele baixou** · a proveniência · se há símbolos melhores · **reordenar por fluxo**, não pela
ordem dele.

**6. A combinação do BinDiff**

**Similaridade ALTA + contagem de instruções DIFERENTE.** **A função quase igual, com algo
acrescentado** — **é a forma 1 em forma de número.**

**7. `Confidence` baixa**

**Casamento suspeito** — **e o diff dele é falso.** Descartar o par, ou recasar à mão.

**8. O que cada um ordena**

**A ferramenta:** similaridade. **Você:** **mudança de fluxo.** **As duas ordens são diferentes.**

**9. Por que o risco do lote é maior**

Porque **a tentação é aceitar o topo da lista** — **e o topo pode ser ruído de build**, já que a
pontuação mede **similaridade**, não significância de segurança.

**10. Os três erros**

**Casamento errado** · **função não casada** · **ruído ordenado primeiro**.

**11. O mais confuso**

**A função não casada.** Porque **você conclui "o patch removeu a validação"** — **e a função existe
nos dois lados.**

**12. "Removida e adicionada"**

**Pode ser casamento ruim** — **não mudança real.** **Verifique se existe nos dois lados.**

**13. Como detectar ruído no topo**

**Contagem de instruções** — **função grande que "mudou" é quase sempre ruído.**

**14. Por que desconfiar do topo**

Porque **o topo é o que mudou MAIS** — **e "mais" quase sempre significa ruído.** **A função do
patch é pequena, cirúrgica, e frequentemente no meio.**

**15. Os sete passos do pipeline**

**Coleta · proveniência · diff · triagem · leitura · confirmação · variante.**

**16. Quantos são seus**

**Os passos 4 a 7** — **a ferramenta faz 1 e 3.** **Cinco de sete são julgamento.**

**17. O que a comparação mostrou**

Que **as três chegam ao mesmo lugar SE o critério for aplicado.** **Sem ele, as três falham** — de
formas diferentes.

**18. O que falha sem o critério**

**A** → lê 400 e desiste · **B** → clica por horas e não conclui · **C** → **aceita o topo, que pode
ser ruído.**

**19. Por que a abordagem sem instalar nada é viável**

Porque **`objdump` + `diff` + a triagem fazem o trabalho** — **e ensinam mais.** **O critério é o que
importa.**

**20. O que usar no dia a dia**

Depende do volume: **par pequeno → A; com símbolos → B; muitos CVEs → C.**

---

## Módulo 7 — Localizar o código do patch

**1. O que significa localizar**

**Achar o LUGAR onde o comportamento mudou** — **o suficiente para reproduzir.** **Não a linha
exata** — **ela não existe no binário.**

**2. Por que a função basta**

Porque **é o nível que permite reproduzir.** **A linha exata é luxo**, e só existe com fonte.

**3. Os quatro insumos**

**Patch de fonte** (dá a assinatura) · **duas referências** (desambiguação) · binário N-1 (alvo) ·
binário N (confirmação).

**4. O que o `PLocator` compara**

**O patch de fonte com o binário** — **não dois binários.** **É mais dirigido porque o patch diz O
QUE procurar.**

**5. As duas referências**

**Desambiguação** — **porque a assinatura sozinha pode casar em vários lugares.** **E o contexto da
função sobrevive à otimização.**

**6. O que o `1dFuzz` faz**

**Dirige o fuzzer** até a posição localizada — **usando a "trailing call sequence" (TCS)** e a
distância de chamada.

**7. Por que são complementares**

**`PLocator` localiza; `1dFuzz` reproduz.** **Localizar sem reproduzir deixa hipótese aberta;
reproduzir sem localizar é força bruta.**

**8. Os cinco passos**

**Leia o patch** (assinatura) · **traduza** para o binário · **procure** nas que mudaram ·
**desambigue** com o componente · **confirme** comportamentalmente.

**9. `if (x > C) return -2`**

`cmp x, C` + `jg` + **`mov eax, 0xfffffffe`** + `ret`.

**10. `x * 4`**

`shl eax, 2`.

**11. O sinal mais forte**

**A constante nova.** **Um valor que só aparece em N é quase sempre o limite.**

**12. O risco da assinatura sozinha**

**O compilador pode eliminar a verificação** — **se ele provar que é sempre falsa.** **Com `-O2`, a
assinatura desaparece do binário.**

**13. As quatro métricas**

**Posição na lista** · **cobertura** · **falsos positivos** · **suficiente para reproduzir**.

**14. Posição normal**

**2 a 10º lugar.** **Normal e suficiente** — **mesmo que não seja o primeiro.**

**15. Quando a localização falha**

**Revise a assinatura** — **você traduziu errado, ou o compilador otimizou.** **As duas são
resultado.**

**16. Como o compilador elimina**

**Se o tipo torna a verificação inútil** — ex.: `uint8_t count > 1024` **é sempre falso**, e o
compilador **remove**.

**17. Por que é o módulo 5 do curso de C**

Porque **é o mesmo mecanismo:** **o compilador pode assumir que UB não acontece** — **e eliminar a
verificação.** **Aqui, a verificação é removida por ser sempre falsa.**

**18. Como contornar**

**Mude para a técnica B (mudança de fluxo)** — **que sobrevive à otimização.** **Um dos dois
funciona.**

**19. As três técnicas**

**A — assinatura** (do patch) · **B — fluxo** (dos binários) · **C — componente** (do CVE).

**20. Qual funciona com silent patch**

**A B** — porque **não depende do patch.** **É a razão de o módulo 9 existir.**

---

## Módulo 8 — Reproduzir o 1-day

**1. Reproduzir**

**Confirmar que o N-1 faz o que o N recusa.** **Não é construir exploit** — **e é onde você PARA.**

**2. As quatro partes**

**Alvo** (com hash) · **entrada** · **critério** · **ambiente**.

**3. A que a maioria esquece**

**O critério.** **"Reproduzi" sem dizer COMO se sabe não é reprodução** — é afirmação.

**4. O que o reproducer prova**

Que **a correção mudou o comportamento** · que **o achado é real** · que **a leitura do diff estava
certa** · e dá ao mantenedor o que ele precisa.

**5. O que não prova**

**Que é explorável** · o impacto real · a severidade · que outros caminhos não existem.

**6. Por que não precisa ser exploit**

Porque **o mantenedor precisa de EVIDÊNCIA, não de exploit.** **"A N-1 processa X e a N recusa" é o
suficiente para ele confirmar e corrigir.**

**7. Os cinco passos**

**Entenda a entrada** · **construa a que dispara** · **verifique no N** · **verifique no N-1** ·
**minimize**.

**8. Onde a leitura do módulo 3 entra**

**No passo 2:** **o invariante do patch diz QUAL campo**, **e a fronteira diz QUAL valor.**

**9. Seis valores de fronteira**

**O limite exato** · **limite + 1** · **limite × 2** · **0** · **máximo do tipo** · máximo + 1.

**10. Por que a fronteira**

Porque **um valor aleatório testa o caso comum; a fronteira testa o caso que quebra.** **É o mesmo
raciocínio do corpus do curso de Fuzzing.**

**11. Qual testa off-by-one**

**O limite exato.** **Se o patch mudou `>` para `>=`, o valor que dispara é exatamente o limite.**

**12. Se não for determinístico**

**Você DECLARA** — **e a instabilidade também é informação.** **É o mesmo princípio do "funciona às
vezes" no curso de Exploit.**

**13. A linha**

**Reproduzir:** confirmar a **diferença**, no **seu** alvo, como **evidência**. **Explorar:** obter
**controle**, em sistema em uso, como **arma**.

**14. Qual ato é a linha**

**Mandar entrada a instância em produção.** **É tentador** porque **"o binário é público, então o
serviço também pode ser testado"** — **e não é verdade.**

**15. Como provar o impacto**

**Descrevendo o caminho, e declarando que não o executou.** **O mantenedor tem o ambiente e a
autoridade para confirmar.**

**16. O que a seção "não fiz" declara**

Plural: **que você não construiu exploit · não mandou entrada a terceiro · não confirmou contra
produção · não verificou explorabilidade · não calculou severidade.** **É o que torna o relatório
defensável.**

**17. Por que o hash importa**

Porque **prova QUAL binário você usou.** **Sem ele, o reproducer não reproduz.**

**18. O que o mantenedor confirma**

**Se o caminho é alcançável em produção** · **se outra camada valida.** **Ele responde no ambiente
dele, com autoridade que você não tem.**

**19. Por que a minimização é o último passo**

Porque **você primeiro faz FUNCIONAR; depois reduz.** **Minimizar cedo demais pode perder o disparo.**

**20. O reproducer, em uma frase**

**A evidência de que a correção mudou o comportamento — não uma alegação de exploit.**

---

## Módulo 9 — Silent patch

**1. Por que existe um CVE para cada N**

Porque **muitos patches de segurança não geram aviso** — corrigidos "de passagem", achados
internamente, **ou simplesmente porque ninguém olhou.** **Os outros N-1 estão sem caçador.**

**2. Cinco motivos**

Não considerou vulnerabilidade · **corrigido de passagem** · achado internamente · corrigido antes de
alguém reportar · **ninguém nunca olhou.**

**3. Por que rende mais**

Porque **um CVE famoso tem centenas de pessoas lendo o mesmo patch no mesmo dia** — **e um silent
patch tem ZERO.** **A competição é nula.**

**4. O que você perde**

A descrição · o CWE · **a certeza de que é de segurança** · a lista de "o que procurar".

**5. O que substitui**

**A varredura por forma** (módulo 3) **substitui a descrição.** **A triagem por fluxo** (módulo 5)
**substitui o CWE.** **A confirmação** (módulo 8) **diz se é de segurança.**

**6. Os sete passos**

Escolha o alvo · **duas versões** · **filtre os commits** · **descarte os que têm CVE** · aplique a
varredura · triagem por fluxo · confirme.

**7. Qual define o silent patch**

**O passo 4** — descartar os que têm CVE. **Se tem CVE, é 1-day catalogado.** **O silent é o que NÃO
tem — e corrige segurança.**

**8. Cinco sinais de "é de segurança"**

**Muda o que o código ACEITA** · adiciona limite ou validação · muda tipo para caber mais · corrige
uma condição · **impede um estado inválido.**

**9. Por que `fix typo` pode esconder**

Porque **um "typo" numa comparação** — `>` escrito como `>=` — **é off-by-one, e o commit diz
"typo".** **Você lê o diff, não a mensagem.**

**10. Por que a mensagem não é evidência**

Porque **ela não descreve o que mudou** — **o diff sim.** **E a confirmação comportamental é o
árbitro.**

**11. Os quatro critérios**

**Aceitação** (aceita menos?) · **fluxo** (branch novo?) · **comportamento** (difere?) · **direção**
(restringe ou reorganiza?).

**12. Por que "guarda movida" parece refactor**

Porque **a MESMA validação, em outra ordem, parece reorganização.** **Mas mover para ANTES do uso é
correção** — **a janela estava aberta.**

**13. Como decidir um caso ambíguo**

**Pelo COMPORTAMENTO.** **Rode os dois com a mesma entrada** — **a diferença decide.**

**14. Três casos ambíguos**

**Guarda movida** → segurança (a janela) · **tipo alargado** → segurança (o valor não cabia) ·
**validação extraída** → verificar (a função nova valida o mesmo?).

**15. Quando a dúvida persiste**

**O comportamento é o árbitro** — **não a mensagem, não a aparência do diff.**

**16. Os quatro indicadores sem CVE**

**A forma do patch** · **a mudança de fluxo** · **o critério de aceitação** · **a confirmação.**

**17. Por que o comportamento é o árbitro**

Porque **a mesma validação em outra ordem muda o resultado** — **e é a única coisa que prova que é
correção de segurança e não refactor.**

**18. O que a demonstração mostrou**

Duas versões com a **mesma validação** — e a **ordem** muda o comportamento com a entrada longa.
**Ordem não é refactor; é correção.**

**19. A quem reportar**

**Ao mantenedor do projeto que tem o bug** — **pelo `security.txt` ou `SECURITY.md`.** **Não a quem
já corrigiu.**

**20. Por que não publicar**

Porque **publicar antes expõe todos os usuários** — **antes de existir correção.** **É divulgação
irresponsável** — **e o prazo coordenado existe por isso.**

---

## Módulo 10 — Variante por ecossistema

**1. Por que vira 0-day**

Porque **o projeto B nunca recebeu patch nenhum** — **ninguém reportou nele.** **O projeto A sabe que
o padrão existe; o B não.**

**2. Por que B tem o mesmo bug**

**Não porque copiou** — **porque o PADRÃO é o mesmo.** **Dois lugares responderam a mesma pergunta de
forma incompleta, independente.**

**3. O que liga os dois**

**O formato** — arquivo, protocolo, API — **e a especificação.** **E o padrão é a pergunta mal
respondida.**

**4. Cinco ecossistemas**

Protocolo de rede · formato de arquivo · biblioteca de parsing · implementação de cripto ·
compilador.

**5. O mais produtivo**

**Protocolo de rede** — porque **cada stack é independente, e o `HTTP Garden` provou (100+ bugs).**

**6. Os quatro passos**

**Abstraia o padrão** · **traduza para pergunta** · **liste as implementações** · **verifique por
leitura.**

**7. Qual exige abstração**

**O 2** — porque **você não procura a mesma linha, e sim a mesma PERGUNTA.** **É o que atravessa
linguagens e estilos.**

**8. O que você procura**

**A pergunta** — **não a linha.** **"Esta implementação valida a faixa antes de usá-la?"**

**9. Três exemplos**

**Campo usado em aritmética sem faixa** → "esta valida a faixa?" · **verificação depois do uso** →
"esta valida ANTES?" · **parsing divergente** → "as duas camadas concordam?"

**10. Por que a leitura é obrigatória**

Porque **"o padrão é comum" não significa "esta tem o bug".** **É o falso positivo do módulo 7 do
curso de Pesquisa.**

**11. As três técnicas**

**Leitura** (escala baixa) · **`grep`** (média) · **fuzzing diferencial** (alta).

**12. Por que o diferencial escala**

Porque **não exige entender cada implementação** — **ele dá a mesma entrada às duas e vê onde
discordam.**

**13. O que o corpus deve conter**

**FRONTEIRAS** — o limite, o limite + 1, o máximo do tipo. **Não entradas aleatórias** (módulo 8).

**14. Qual discrepância é bug**

**Discordância sobre o FRAMING** — onde a mensagem termina. **Discordar sobre outra coisa pode ser
implementação legítima diferente.**

**15. O que o harness exige**

**As implementações no SEU lab** — baixadas e compiladas. **Nenhuma aponta para serviço de terceiro.**

**16. A quem reportar quando já corrigiu**

**A ninguém.** **O achado está em B, C e D** — **não em A.**

**17. Por que não mencionar os outros**

Porque **dizer ao B que "C e D também têm"** parece útil — **e é divulgação de informação sobre
sistemas de terceiros.** **Cada mantenedor sabe do SEU.**

**18. Quando o bug é da especificação**

**Quando ela é ambígua.** **Corrigir em B, C e D não resolve** — **o próximo implementador erra
igual.** **Você reporta ao dono do formato** (IETF, W3C, a empresa).

**19. O prazo com N projetos**

**O do mais lento** — **porque publicar antes expõe quem não corrigiu.** **E você avisa antes de
publicar.**

**20. O que o `HTTP Garden` provou**

Que **a técnica escala**: **fuzzing diferencial de fluxo HTTP contra N servidores** — **100+ bugs, 68
corrigidos, 39 exploráveis.** **Não em um servidor: no conjunto.**

---

## Módulo 11 — Projeto

**1. Por que o percurso**

Porque **o que se acumula é o método** — e **o percurso documentado informa a próxima
investigação.** **Um achado sem percurso não ensina.**

**2. Por que "não achou nada" é válido**

Porque **concluir que "o release não tem correção de segurança" é RESULTADO** — **e informa a
escolha do próximo alvo.**

**3. Por que a fonte oficial**

Porque **recompilar muda a proveniência** — **e o diff vira ruído.** **O oficial vem do mesmo
pipeline.**

**4. O que os quatro testes decidem**

**Se o par é diffável** — ou se você vai gastar horas lendo ruído.

**5. Por que não recompilar**

Porque **o seu build difere do oficial** (flags, compilador, ordem) — **e o diff é ruído puro.**

**6. O que as métricas dizem**

**O tamanho do problema:** quantas funções mudaram — **e portanto quantas você vai filtrar.**

**7. O critério de sinal vs. ruído**

**"O comportamento PODE diferir?"** — mudança de **controle de fluxo** é sinal; **de forma** é ruído.

**8. Por que a triagem tem o maior peso**

Porque **é a habilidade central do curso** — **e onde as ferramentas não chegam.**

**9. A proporção medida**

Depende do par — **mas tipicamente 1:100.** **E é a razão de você nunca ler as 400.**

**10. O que é um falso sinal**

Uma diferença que **parece** mudança de fluxo e não é: registrador trocado, inline, constante
deslocada, **função nova não chamada.**

**11. O que é a assinatura**

**As operações que o patch acrescenta, traduzidas para o binário** — comparação, branch, constante,
chamada.

**12. As três técnicas**

**Assinatura** (do patch) · **fluxo** (dos binários) · **componente** (do CVE).

**13. Qual precisão basta**

**2 a 10º lugar.** Porque **a função é o nível suficiente** — e **a posição não muda o resultado.**

**14. As quatro partes do reproducer**

**Alvo** · **entrada** · **critério** · **ambiente**.

**15. Qual a maioria esquece**

**O critério.** **Sem ele, "reproduzi" é alegação.**

**16. O que o teste de fronteira procura**

**O ponto de virada** — entre o valor que os dois aceitam e o que só o N-1 aceita.

**17. Por que o padrão sem nomes**

Porque **o nome muda de projeto para projeto; a forma não** — **e é o que permite a busca no
ecossistema.**

**18. O que a pergunta permite**

**Atravessar implementações** — **e transformar 1-day em 0-day.**

**19. O que declarar quando não há variante**

**O que você tentou, e o que concluiu.** **Não achar é resultado** — **e informa o próximo alvo.**

**20. A linha**

**Reproduzir é confirmar a diferença; explorar é obter controle.**

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| **Proveniência verificada** | 20% | Os quatro testes, com resultado |
| **Critério de sinal** | 25% | O fluxo, não a similaridade |
| Evidência literal | 20% | Comando e saída, com hash |
| Localização medida | 20% | A posição, e a confirmação comportamental |
| Limitações | 15% | O que não verificou |

**Penalidades automáticas:**

- Recompilar o fonte e diffar contra o oficial: −20%.
- Par sem os quatro testes: −15%.
- Triagem sem o critério de fluxo: −20%.
- Reproducer sem critério: −15%.
- **Teste contra terceiro**: **lab zerado**.
- **Construir exploit**: **lab zerado**.
- Evidência sem hash: −10%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| **Alvo** | escolhido por gosto | com critério | **+ fonte oficial declarada** |
| **Proveniência** | não verifica | menciona | **os quatro testes + hashes** |
| Diff | sem métricas | com métricas | **+ atalhos usados** |
| **Triagem** | lista | com filtros | **+ critério + proporção + falsos sinais** |
| Localização | achou a função | com técnica | **+ posição medida + precisão** |
| **Reproducer** | roda | com entrada | **+ critério + fronteira + evidência literal** |
| Padrão | com nomes | sem nomes | **+ a pergunta derivada** |
| Variante | ausente | menciona | **+ verificação + reporte planejado** |
| Não fiz | ausente | 1 item | **4+ itens** |
| Conduta | ausente | menciona | **todas as caixas** |
| **Não achou nada** | — | — | **✓ ainda é exemplar se o percurso está completo** |

**Os dois itens de maior valor:**

1. **A proveniência verificada com os quatro testes** — porque **é o que separa um diff útil de
   horas perdidas em ruído.**
2. **O critério de sinal aplicado, com a proporção medida** — porque **é a habilidade central**, e
   **as ferramentas não chegam lá.**

---

*Material didático original, de propósito defensivo e de pesquisa. Diff de binário público, e
reprodução apenas em alvo próprio, CTF publicado, ou com autorização escrita. O achado é reportado
ao mantenedor — nunca usado contra sistema de terceiro.*
