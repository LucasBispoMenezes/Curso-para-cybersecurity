# Avaliações — Mobile Application Security: Análise e Pesquisa de Vulnerabilidades

**Banco de questões por módulo · resposta comentada**

---

## Como usar

Três blocos por módulo: **conceito**, **leitura de código** e **mão na massa**. A resposta comentada explica o *porquê*.

⚠ **O critério deste curso:** caminho **de fora**, **nível** declarado, causa-raiz com **as duas metades**, e impacto com **número, taxa e duração**.

---

## Módulo 1 — Modelagem de ameaças

**1.1 (conceito)** O que o atacante controla no mobile que ele não controla no web?

> **Resposta:** ⚠ **o app inteiro** — o armazenamento, a rede e o ambiente. No web ele manipula **requisições**; aqui, o **cliente**.

**1.2 (conceito)** Quais são os quatro atores, e qual é o específico do mobile?

> **Resposta:** dono, **app malicioso**, rede e servidor. ⚠ O **app malicioso no mesmo aparelho** é o específico — e é onde metade dos achados mora.

**1.3 (conceito)** Por que a gravidade depende do ator?

> **Resposta:** porque o **pre-requisito** muda tudo. ⚠ Atacante de **rede** não precisa de nada; ⚠ o **dono** manipulando o próprio app é **modelo de ameaça**, não ataque.

**1.4 (conceito)** Qual a pergunta que decide o impacto?

> **Resposta:** ⚠ **o que o servidor faz** quando o app mente. ⚠ É ela que distingue achado de observação.

**1.5 (conceito)** Por que o servidor do laboratório é obrigatório?

> **Resposta:** porque **metade dos achados** só é medível contra ele — ⚠ sessão, autorização, pinning parcial.

**1.6 (leitura de código)** Um servidor usa `request.form.get("usuario_id")` com o token disponível. O que é?

> **Resposta:** ⚠ o **padrão 1** do módulo 4 — identidade no corpo. ⚠ O servidor tem a identidade e **não a usa**.

**1.7 (mão na massa)** Por que a ficha de ameaça precede o teste?

> **Resposta:** porque sem modelo você testa tudo e conclui pouco. ⚠ O pre-requisito define o que o achado **vale**.

---

## Módulo 2 — Sessão e identidade

**2.1 (conceito)** O que muda em relação ao cookie do navegador?

> **Resposta:** ⚠ no web, o navegador protege o cookie **contra o próprio site**. ⚠ No mobile, **o app escolhe onde guardar** — e o app é do usuário.

**2.2 (conceito)** Quais os quatro lugares onde a sessão vive?

> **Resposta:** armazenamento protegido (`Keychain`/`EncryptedPrefs`), ⚠ **armazenamento comum** (`.plist`/`SharedPreferences`), arquivo e memória.

**2.3 (conceito)** ⚠ O teste mais simples do curso, e por quê?

> **Resposta:** ⚠ **reusar o token após o logout**. ⚠ Dois comandos, resposta binária — e o `200` é o achado.

**2.4 (conceito)** Logout que só limpa o app resolve?

> **Resposta:** **não** — ⚠ o servidor **nunca soube**. ⚠ É o mesmo bug do módulo 3 do curso de Web Apps.

**2.5 (conceito)** Por que a expiração validada só no app é achado?

> **Resposta:** porque ⚠ **estender a data no aparelho prolonga a sessão**. ⚠ O app decide, e o servidor não reconfere.

**2.6 (conceito)** O que o timestamp de senha resolve?

> **Resposta:** ⚠ que a troca de senha **derrube as sessões anteriores**. ⚠ Sem ele, o invasor continua dentro.

**2.7 (leitura de código)** O servidor aceita o papel em `X-Papel`. Qual o padrão?

> **Resposta:** ⚠ padrão 3 — ⚠ `BFLA`. É o módulo 4 do curso de Web Apps.

**2.8 (mão na massa)** Por que o MFA validado no app é decorativo?

> **Resposta:** porque ⚠ o atacante **altera o app** e afirma que validou. ⚠ A validação tem de estar no servidor.

---

## Módulo 3 — Armazenamento

**3.1 (conceito)** Qual a pergunta que organiza o módulo?

> **Resposta:** ⚠ **o que este dado faz aqui?** ⚠ Não "está protegido?".

**3.2 (conceito)** Por que dado de autorização é categoria própria?

> **Resposta:** porque ele ⚠ **não vaza — escala**. ⚠ E o achado só fecha com **o servidor reconfirma?**

**3.3 (conceito)** Quais canais de saída não exigem `root`?

> **Resposta:** ⚠ **externo, backup e log** — e são os achados **reais**. ⚠ O que exige `root` é **condicionado**.

**3.4 (conceito)** O que `ThisDeviceOnly` decide no iOS?

> **Resposta:** se o item do `Keychain` **vai para o backup**. ⚠ Sem ele, o token **sai do aparelho**.

**3.5 (conceito)** Por que segredo embutido é achado de armazenamento?

> **Resposta:** porque é **persistente** e ⚠ **não rotacionável sem atualizar o app**. ⚠ A duração é o agravante.

**3.6 (leitura de código)** O app guarda `premium: true` e decide a partir dele. Qual o teste?

> **Resposta:** ⚠ alterar o valor **e ver se o servidor entrega o que não deveria**. ⚠ Se entregar, a decisão está no cliente.

**3.7 (mão na massa)** Por que a coluna "precisa estar aqui?" existe?

> **Resposta:** porque ela separa **inventário** de **achado**. ⚠ O app **tem** que guardar o token; **não tem** que guardar a senha.

---

## Módulo 4 — O que o servidor confia

**4.1 (conceito)** Enuncie a tese do módulo.

> **Resposta:** ⚠ **o achado não é "o app decide" — é "o servidor aceita"**.

**4.2 (conceito)** Quais são os cinco padrões?

> **Resposta:** identidade no corpo, valor de negócio, papel, **validação só no app** e **estado afirmado pelo app**.

**4.3 (conceito)** Qual é o mais grave, e por quê?

> **Resposta:** o **padrão 5** — ⚠ o app **afirma** ("já paguei") e o servidor **acredita**. ⚠ Validar a forma não torna a afirmação verdadeira.

**4.4 (conceito)** Qual operação de proxy é a mais esquecida?

> **Resposta:** ⚠ **remover** um campo. ⚠ Ela diz **de quem** é a decisão — se o servidor aceita sem o campo, ele não dependia dele.

**4.5 (conceito)** O app pode mandar o preço?

> **Resposta:** **não**. ⚠ Ele manda **referência** (`produto_id`, `quantidade`); ⚠ o servidor **consulta** o preço. ⚠ Referência é aceitável; decisão não.

**4.6 (conceito)** Por que "uma variável por vez"?

> **Resposta:** porque alterar duas coisas **não atribui causa**. ⚠ É a disciplina do módulo 2 do curso de Web Apps.

**4.7 (leitura de código)** Um `TrustManager` com `checkServerTrusted` vazio é qual achado?

> **Resposta:** ⚠ validação de certificado **desligada** — módulo 5. ⚠ Aceita **qualquer** certificado.

**4.8 (mão na massa)** Por que `20/20` é informação, não detalhe?

> **Resposta:** porque significa ⚠ **ausência de defesa** — nem rate limiting, nem validação. ⚠ É diferente de uma corrida, que varia.

---

## Módulo 5 — TLS e pinning

**5.1 (conceito)** O que o TLS garante, e o que não?

> **Resposta:** confidencialidade, integridade e ⚠ **autenticidade do SERVIDOR**. ⚠ Nada diz sobre o **app** nem sobre o dado no dispositivo.

**5.2 (conceito)** O que o pinning faz, com precisão?

> **Resposta:** ⚠ **reduz o conjunto de certificados aceitos** — de "qualquer CA confiável" para "este". ⚠ Ele **não** impede o dono do aparelho.

**5.3 (conceito)** ⚠ O que o pinning não cobre?

> **Resposta:** ⚠ conexões não pinadas, **SDKs de terceiro**, ⚠ **`WebView`** e o **dono do aparelho**.

**5.4 (conceito)** Por que pinning de certificado é frágil?

> **Resposta:** porque **quebra na renovação** — ⚠ e a equipe **remove o pinning** para resolver. ⚠ A proteção mais forte é a que foi desligada por operação.

**5.5 (leitura de código)** O app fixa a API principal e o `WebView` carrega conteúdo externo. Qual o achado?

> **Resposta:** ⚠ **pinning parcial** — o `WebView` **não usa** a pilha do app, e passa por fora.

**5.6 (mão na massa)** Por que comparar hosts contatados com hosts pinados?

> **Resposta:** porque a **diferença** é a superfície **não protegida** — e é onde o proxy funciona.

---

## Módulo 6 — Invocação

**6.1 (conceito)** Qual a pergunta do módulo?

> **Resposta:** ⚠ não "o componente é exportado?" — mas ⚠ **o efeito** quando outro app invoca.

**6.2 (conceito)** Quais as quatro perguntas do `deep link`?

> **Resposta:** origem, parâmetro, **autorização** e ⚠ **credencial**.

**6.3 (conceito)** Por que a quarta é a que fecha o achado?

> **Resposta:** porque o `deep link` **não traz credencial** — ⚠ ele **pega carona na da vítima**. ⚠ O atacante não precisa de conta.

**6.4 (conceito)** ⚠ O que `addJavascriptInterface` expõe?

> **Resposta:** ⚠ **o nativo ao JavaScript** — e a ponte **não tem origem**. ⚠ É privilégio **além do que o script teria no navegador**.

**6.5 (conceito)** Quando a combinação vira achado crítico?

> **Resposta:** ⚠ ponte exposta **e** URL controlada. ⚠ Sozinhas, são conveniência; juntas, **execução de código com acesso ao app**.

**6.6 (leitura de código)** A URL do `WebView` vem de `getIntent().getStringExtra("url")`. Qual o achado?

> **Resposta:** ⚠ o **chamador** escolhe o que o `WebView` carrega — ⚠ e a ponte, se existir, fica exposta ao conteúdo dele.

**6.7 (mão na massa)** Por que `adb` não prova acesso entre apps?

> **Resposta:** porque roda com o `uid` do **shell**. ⚠ Prova **alcançabilidade**; o teste honesto usa **app chamador**.

---

## Módulo 7 — Lógica de negócio

**7.1 (conceito)** Por que o app valida mais que o servidor?

> **Resposta:** porque valida **por UX** — para dar erro bonito na tela. ⚠ E o servidor **confunde isso com defesa**.

**7.2 (conceito)** Quais as sete classes?

> **Resposta:** validação só no app, valor do cliente, **ordem**, limite, **concorrência**, estado afirmado e ⚠ **divergência de regra**.

**7.3 (conceito)** Qual é a que o mobile acrescenta?

> **Resposta:** a **divergência de regra** — ⚠ o app e o servidor calculam diferente, e ⚠ **nenhum dos dois está errado** isoladamente.

**7.4 (conceito)** Por que a concorrência é mais fácil no mobile?

> **Resposta:** porque o app **já paraleliza** (sync, telemetria) ⚠ e o **`HTTP/2` reenvia** em falha. ⚠ O achado pode aparecer **sem atacante**.

**7.5 (conceito)** Qual a correção da concorrência?

> **Resposta:** ⚠ **condição dentro da escrita** (`UPDATE ... WHERE saldo >= ?`), ou **chave de idempotência** no cliente.

**7.6 (conceito)** Quais os três valores de veredito?

> **Resposta:** `recusa`, `aceita` e ⚠ **`aceita-e-ignora`** — o mais traiçoeiro: o servidor não recusa **e** não usa.

**7.7 (leitura de código)** O app calcula o desconto e envia o valor final. Qual o achado?

> **Resposta:** ⚠ **divergência de regra** — o atacante calcula com outra regra. ⚠ A correção é o **servidor calcular**.

---

## Módulo 8 — Anti-tampering

**8.1 (conceito)** Qual a pergunta do módulo — e como difere dos Cursos 1 e 2?

> **Resposta:** ⚠ **o que a proteção MUDA** — não o que ela faz. ⚠ Lá era contornar; aqui é **medir**.

**8.2 (conceito)** O que muda o alcance?

> **Resposta:** ⚠ ⚠ **só `attestation` e a verificação no servidor.** ⚠ Todo o resto **encarece**.

**8.3 (conceito)** Por que a proteção no app não limita o dono do aparelho?

> **Resposta:** porque ⚠ ele **já controla o app** — ⚠ e simplesmente **remove a verificação**.

**8.4 (conceito)** Quais os três resultados do teste comparativo?

> **Resposta:** **igual** (o achado segue), **diferente** (o achado tem condição), ⚠ **impede** (o achado **cai**).

**8.5 (conceito)** Qual a parte construtiva do módulo?

> **Resposta:** ⚠ a **detecção no servidor** — requisição impossível, sequência, taxa e dispositivo.

**8.6 (conceito)** O que `DeviceCheck`/`App Attest` permitem?

> **Resposta:** ⚠ detectar **contas múltiplas no mesmo aparelho** — ⚠ e **não se contorna** com app modificado.

**8.7 (mão na massa)** Por que a sub-linha "e a prova" existe?

> **Resposta:** porque ⚠ ela mostra **o mesmo achado**, com e sem a proteção. ⚠ Sem ela, o veredito é opinião.

---

## Módulo 9 — Instrumentação

**9.1 (conceito)** O que o hook prova, e o que não prova?

> **Resposta:** ⚠ prova que o código **pode** ser desviado. ⚠ **Não** prova que um atacante pode — ⚠ ele **não está dentro do processo**.

**9.2 (conceito)** Quais os quatro usos legítimos?

> **Resposta:** observar o valor, ver a requisição, ⚠ **bloquear validação para medir**, e medir tempo.

**9.3 (conceito)** Por que bloquear a validação local não é o ataque?

> **Resposta:** porque é o ⚠ **controle experimental** — ⚠ desliga-se para descobrir **de quem é a decisão**. ⚠ Se o servidor recusa, a defesa está lá.

**9.4 (conceito)** O que o hook mostra que o proxy não mostra?

> **Resposta:** ⚠ o que o app **montou** — antes de sair. ⚠ Com **pinning**, o proxy não vê nada.

**9.5 (conceito)** Qual item do registro não existia nos Cursos 1 e 2?

> **Resposta:** ⚠ **se foi CONTROLE ou observação**. ⚠ Um controle altera o comportamento, e o achado precisa dizer.

**9.6 (leitura de código)** Um achado só é observável com `Frida` e `jailbreak`. Qual o nível?

> **Resposta:** ⚠ **nível 3** — é **anexo**, não achado.

**9.7 (mão na massa)** Por que `curl` em paralelo é mais honesto que o hook?

> **Resposta:** porque **vem de fora**. ⚠ O hook serve quando o problema é **como o app dispara**.

---

## Módulo 10 — Reprodução e causa-raiz

**10.1 (conceito)** O que é achado, e o que é evidência?

> **Resposta:** ⚠ **achado é o que um terceiro reproduz**; ⚠ o que exige instrumento é **evidência**.

**10.2 (conceito)** Quais os três níveis?

> **Resposta:** **1** — de fora, sem instrumento (**real**); **2** — de fora, com instrumento (**condicionado**); **3** — só com instrumento (**anexo**).

**10.3 (conceito)** Por que a maioria dos achados é nível 1?

> **Resposta:** porque a pergunta é ⚠ **o que o servidor confia** — ⚠ e isso se responde com **`curl`**.

**10.4 (conceito)** Por que o `deep link` (nível 2) vale mais que o `.plist` (nível 2)?

> **Resposta:** porque o `deep link` exige apenas ⚠ **um app instalado** — o caso de **qualquer** usuário. ⚠ O `.plist` exige app **depurável** ou `root`.

**10.5 (conceito)** Quais as duas metades da causa-raiz?

> **Resposta:** ⚠ **o erro** e ⚠ **onde a regra deveria estar**. ⚠ Sem a segunda, a correção fica pela metade.

**10.6 (conceito)** Qual a direção do rastreio, e quais as três paradas?

> **Resposta:** ⚠ do **efeito para a origem**: efeito, mecanismo e **origem**. ⚠ "O app manda o preço" não é a causa — ⚠ a causa é o **servidor aceitar**.

**10.7 (mão na massa)** Quando o `COMANDO` precisa do seu ambiente, qual o nível?

> **Resposta:** ⚠ **não é 1**. ⚠ E o relatório diz qual é.

---

## Módulo 11 — Impacto e correção

**11.1 (conceito)** Quais os três componentes do impacto?

> **Resposta:** ⚠ **o quê**, ⚠ **quantas vezes** e ⚠ **por quanto tempo**.

**11.2 (conceito)** Qual é o que os relatórios de mobile esquecem?

> **Resposta:** a ⚠ **duração**. ⚠ Ela qualifica armazenamento e segredo embutido — que **não expiram**.

**11.3 (conceito)** Por que ofuscar segredo não é correção?

> **Resposta:** porque é **adiar**. ⚠ E **corrigir o app** não resolve se o **servidor** continua confiando.

**11.4 (conceito)** Quais as três regras do teste?

> **Resposta:** tem de ⚠ **falhar no código antigo**; verifica o **efeito**; e cobre a ⚠ **correção positiva**.

**11.5 (conceito)** Por que a correção positiva importa tanto?

> **Resposta:** porque é o que impede que a correção ⚠ **quebre o app** — o erro mais comum.

**11.6 (conceito)** O que a migração precisa declarar?

> **Resposta:** versão mínima, período de transição e ⚠ ⚠ **a janela em que o achado segue vivo**.

**11.7 (leitura de código)** O servidor corrigido mantém o endpoint antigo por compatibilidade. O que isso significa?

> **Resposta:** ⚠ que o achado **continua explorável** até o último app antigo sair. ⚠ É a **janela**, e ela vai no relatório.

**11.8 (mão na massa)** Por que priorizar por pre-requisito, impacto e duração?

> **Resposta:** porque ⚠ o achado **difícil** dá orgulho e o **fácil** dá prejuízo. ⚠ Um `preco=1` com `curl` vale mais que um `deep link` com três condições.

---

## Módulo 12 — Projeto final

**12.1 (conceito)** Por que começar pelo servidor?

> **Resposta:** porque ele ⚠ **diz o que esperar do app** e economiza metade do trabalho. ⚠ É a inversão em relação aos Cursos 1 e 2.

**12.2 (conceito)** Qual a seção que resume o curso?

> **Resposta:** ⚠ a **tabela do servidor** — endpoint por endpoint, **reconfirma ou não**.

**12.3 (conceito)** Por que a janela de exposição é decisão de negócio?

> **Resposta:** porque ⚠ o cliente **vai** corrigir o servidor e **não vai** atualizar todos os apps hoje. ⚠ Saber **por quanto tempo** permite decidir.

**12.4 (conceito)** Um achado só reproduzível com o seu script — o que fazer?

> **Resposta:** ⚠ vai para a seção de **limitações** como **anexo**. ⚠ Não é achado nível 1.

---

## Avaliação final

Sem consultar, você deve saber:

1. Construir modelo de ameaça com ativo, ator e **pre-requisito**.
2. Dizer onde a sessão vive, e **provar** que o logout invalida — ou não.
3. Classificar dado guardado, e responder **precisa estar aqui?**
4. ⚠ Enumerar os **cinco padrões** de confiança indevida e testar cada um.
5. Explicar por que **remover** um campo revela de quem é a decisão.
6. Dizer o que o **pinning cobre** e o que passa por fora.
7. Testar um `deep link` pelas **quatro perguntas**.
8. Explicar por que a ponte do `WebView` é privilégio além do web.
9. Medir uma **corrida**, com taxa.
10. Avaliar o que uma proteção **muda** — com e sem.
11. Escrever causa-raiz com as **duas metades**.
12. Produzir relatório com **nível**, impacto com **duração**, regressão e **janela**.

⚠ **Se os doze itens fecham, o curso cumpriu o objetivo.** Os itens 4, 10 e 12 são os que a prática cobra primeiro — e o 4 resume a trilha inteira.
