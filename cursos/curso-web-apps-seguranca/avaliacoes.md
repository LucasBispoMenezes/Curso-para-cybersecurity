# Avaliações — Segurança de Aplicações Web e APIs

**Banco de questões por módulo · resposta comentada**

---

## Como usar

Cada módulo tem três blocos: **conceito** (o mecanismo ficou claro), **leitura de código** (você reconhece o padrão) e **mão na massa** (você produz). A resposta comentada explica o *porquê*.

⚠ **As questões de leitura de código não trazem a resposta completa de propósito.** Elas apontam onde olhar; a resposta é o que você escreve depois de abrir o arquivo.

---

## Módulo 1 — Arquitetura e modelo de confiança

**1.1 (conceito)** O que é uma fronteira de confiança, e quantas tem uma aplicação web típica?

> **Resposta:** o ponto em que um dado passa de uma zona onde pode ser **forjado** para uma onde é **tratado como verdade**. São **seis**: cliente→servidor, proxy→aplicação, aplicação→banco, aplicação→terceiro, terceiro→aplicação, interno→cliente.

**1.2 (conceito)** Por que a fronteira 1 (cliente→servidor) produz a maioria dos bugs?

> **Resposta:** porque é a única em que o atacante controla **100% do dado, sem intermediário**. Todo o resto da aplicação existe para tratar esse dado como hostil — e é onde a disciplina falha.

**1.3 (conceito)** `X-Forwarded-For` chega pela infraestrutura. Por que ele é um risco?

> **Resposta:** porque ele **chega pelo cliente**. Se o proxy não o remove ou sobrescreve, o cliente escolhe o valor — e um `X-Forwarded-For: 127.0.0.1` burla rate limiting, log e, às vezes, autorização. É a fronteira 2: confiar na camada de cima.

**1.4 (conceito)** JWT é assinado. Isso o torna seguro para guardar dado sensível?

> **Resposta:** não. **Assinatura garante integridade, não sigilo** — o payload é legível por qualquer um que tenha o token. ⚠ Guardar dado sensível no JWT é publicá-lo.

**1.5 (conceito)** Para cada campo que o cliente envia, qual é a pergunta?

> **Resposta:** é **dado** ou é **identidade**? ⚠ Se o campo decide **o que** devolver, é dado, e pode ter qualquer valor. Se decide **quem** devolve, tem de vir do **token**, nunca da requisição.

**1.6 (leitura de código)** `GET /api/perfil?user_id=43` com o token do usuário 42 retorna o perfil do 43. Onde está o defeito — no SQL? No token? No filtro?

> **Resposta:** em **nenhum dos três**. O defeito é **qual das duas fontes decide**: o token diz "quem sou eu", e a consulta usa "o que eu pedi". ⚠ É o módulo 4 inteiro, e a razão de a distinção *dado vs. identidade* existir.

---

## Módulo 2 — Metodologia

**2.1 (conceito)** Qual a diferença entre observação, hipótese e evidência?

> **Resposta:** observação é **o que a resposta fez** (falsificável por repetição); hipótese é **o que você acha que explica** (falsificável por um teste que a derrube); evidência é **o que prova** — o registro do dado, não da conclusão.

**2.2 (conceito)** "Achei um IDOR" é observação?

> **Resposta:** **não** — é conclusão. A observação é: *"com o cookie da ana, `GET /api/perfil?user_id=2` retornou o perfil do bruno, status 200, campo `nome: bruno`"*. ⚠ A regra: se não cabe em **uma frase com requisição, credencial e resposta**, você não observou — inferiu.

**2.3 (conceito)** Por que a ordem das quatro fontes importa?

> **Resposta:** DevTools (o previsto) → proxy (repetir e modificar) → **log** (confirmar o que o backend viu) → **código** (a causa). ⚠ Pular do proxy para a conclusão é o erro comum: sem o log, você não sabe se a modificação chegou; sem o código, você não sabe corrigir.

**2.4 (conceito)** Quais as quatro variáveis que se testam uma de cada vez? E a quinta?

> **Resposta:** identidade, objeto, método e camada (header de proxy). ⚠ A quinta é o **paralelismo** — repetir ao mesmo tempo, que é o módulo 10.

**2.5 (conceito)** Por que demonstrar IDOR exige duas variáveis juntas?

> **Resposta:** trocar o **objeto** mostra que aparece dado alheio; trocar a **identidade** mostra que o dado é de outro. ⚠ Uma sozinha não prova **posse** — e é a posse que o achado afirma.

**2.6 (conceito)** Por que registrar a hipótese **descartada**?

> **Resposta:** evita retestar, prova que o método foi aplicado, e — no relatório — mostra que você testou além do que achou. ⚠ É a tabela que ninguém faz, e a que dá credibilidade.

---

## Módulo 3 — Autenticação e sessões

**3.1 (conceito)** Quais são os cinco momentos da sessão?

> **Resposta:** criação (identificador), entrega (onde vive), uso (como o servidor reconhece), rotação (muda ao elevar privilégio), destruição (logout invalida). ⚠ Uma falha em **qualquer um** basta.

**3.2 (conceito)** Por que a frase "ninguém quebra a sessão, quebram o gerador" vale?

> **Resposta:** porque a falha típica não é a primitiva — é a **aleatoriedade**. ⚠ É a mesma frase do curso de Criptografia Aplicada: `Math.random()`, contador sequencial e hash de nome+tempo são previsíveis.

**3.3 (conceito)** O que a fixação de sessão permite?

> **Resposta:** o atacante conhece um ID **antes** do login, a vítima autentica, e o ID **não muda** — o atacante passa a ter sessão autenticada. ⚠ A correção é **rotacionar no login**, e em todo evento que eleva privilégio.

**3.4 (conceito)** Por que o MFA é decorativo sem rotação?

> **Resposta:** se a sessão é criada no login **antes** do segundo fator e não rotaciona depois, quem já tem o ID **passa pelo MFA sem fazer MFA**. ⚠ O padrão correto é **sessão parcial** — um ID que só serve para o passo do segundo fator.

**3.5 (conceito)** `SameSite=Lax` elimina CSRF?

> **Resposta:** **não**. Ele permite o envio em navegação de topo **`GET`**. ⚠ Uma operação sensível que aceite `GET` continua vulnerável — é o caso do "link que exclui a conta".

**3.6 (conceito)** Por que o `localStorage` é uma escolha de compensação?

> **Resposta:** porque imuniza contra **CSRF** (o navegador não o envia sozinho) e entrega tudo ao **XSS**. ⚠ Não existe escolha gratuita — existe compensação.

**3.7 (leitura de código)** O logout apaga o cookie e o servidor não sabe. Qual o teste?

> **Resposta:** autenticar, fazer logout, e **reusar o mesmo cookie**. Se retornar o perfil, a sessão não morreu no servidor. ⚠ Correção: invalidar no servidor, **e** implementar o timestamp de senha.

---

## Módulo 4 — Autorização

**4.1 (conceito)** Por que autorização quebrada é o bug nº 1?

> **Resposta:** porque é **distribuída** — uma checagem por rota, por objeto, por campo — e **código distribuído erra por omissão**. ⚠ A omissão passa no caminho feliz; só aparece para quem usa como não foi previsto.

**4.2 (conceito)** Quais as três dimensões, e o teste de cada uma?

> **Resposta:** **objeto** (IDOR/BOLA) — trocar o ID mantendo a identidade; **função** (BFLA) — todos os verbos, como usuário comum; **propriedade** (mass assignment/BOPLA) — mandar campo que a tela não mostra.

**4.3 (conceito)** Por que a posse deve entrar no `WHERE` e não num `if` depois?

> **Resposta:** porque o `if` significa que o objeto **já foi buscado** — e qualquer caminho que use o objeto sem passar pela verificação é vulnerável. ⚠ Com a posse no `WHERE`, a omissão é **impossível**, não improvável.

**4.4 (conceito)** Por que responder `404` e não `403`?

> **Resposta:** o `403` **confirma que o objeto existe** — e isso é enumeração. ⚠ O `404` diz "não achei" e não revela nada.

**4.5 (conceito)** UUIDs corrigem IDOR?

> **Resposta:** não — **encarecem**. O identificador vaza em e-mail, link, log, `Referer`. ⚠ A checagem de posse continua obrigatória.

**4.6 (conceito)** Por que allowlist e não denylist?

> **Resposta:** a denylist falha por **campo novo** (alguém adiciona uma coluna e esquece de bloqueá-la); a allowlist falha por **omissão visível** (o campo novo não funciona, e alguém nota). ⚠ É a mesma lógica do módulo 5.

**4.7 (conceito)** Por que a ferramenta não acha autorização quebrada?

> **Resposta:** falta **contexto de negócio**. A ferramenta não sabe que o pedido 91 é da ana, nem que `papel` é privilegiado. ⚠ A matriz é o instrumento — e é sua.

---

## Módulo 5 — Injeções

**5.1 (conceito)** Defina injeção em uma frase.

> **Resposta:** o dado do usuário e a instrução do programa ocupam **o mesmo canal**, e o interpretador não consegue mais separar um do outro. ⚠ Parametrizar **separa canais**; escapar só ensina o interpretador a adivinhar.

**5.2 (conceito)** O que fazer quando a sintaxe exige que o valor seja **estrutura** (`ORDER BY`)?

> **Resposta:** **allowlist**. ⚠ `ORDER BY ?` não funciona — e a saída **não** é concatenar: é validar contra uma lista fechada de colunas.

**5.3 (conceito)** Como o NoSQL/ORM injection funciona sem sintaxe estranha?

> **Resposta:** o dado vira **operador**. O cliente manda `{"papel__ne": "admin"}` ou `{"nome__regex": "^a"}` e filtra por campo que não deveria existir na tela. ⚠ Correção: allowlist de **chave**, não de valor.

**5.4 (conceito)** `shell=False` resolve command injection completamente?

> **Resposta:** não. Sobrevive a **argument injection**: um valor começando com `-` vira **opção** da ferramenta. ⚠ A correção completa é `shell=False` + lista + **allowlist de formato** + **`--`** antes do argumento.

**5.5 (conceito)** Por que filtrar `..` não corrige path traversal?

> **Resposta:** porque existem **infinitas** codificações — `....//`, `..%2f`, sobreposição dupla, barra invertida. ⚠ Correção: **`realpath` + conferência de base**, depois de resolver.

**5.6 (conceito)** Sintoma, causa-raiz e impacto — dê o exemplo do `ORDER BY`.

> **Resposta:** sintoma = o erro de SQL na tela; causa-raiz = a linha `f"...ORDER BY {ordem}"`; impacto = ler a tabela inteira. ⚠ Corrigir o sintoma **move o ataque**; corrigir a causa o **elimina**.

**5.7 (conceito)** Validação de entrada basta?

> **Resposta:** não. Validação **reduz superfície**; parametrização **separa canais**. E um e-mail validado por regex pode conter `'` — se a regex permitir `o'brien@x.com`.

---

## Módulo 6 — Camada cliente

**6.1 (conceito)** Defina XSS pelo contexto, não pela tag.

> **Resposta:** é fazer o dado ser interpretado **como código no contexto** em que foi colocado. ⚠ Não é "injetar `<script>`" — o contexto decide o que conta como código.

**6.2 (conceito)** Por que DOM-based XSS não aparece nas respostas do servidor?

> **Resposta:** porque o servidor **não participa** — o dado vai de `location.search` para `innerHTML` no JS. ⚠ Só ler o código acha.

**6.3 (conceito)** Em atributo de URL, o ataque precisa quebrar o HTML?

> **Resposta:** **não**. Basta trocar o **esquema**: `javascript:alert(document.cookie)` é HTML válido, sem tag quebrada. ⚠ Correção: validar **esquema**, não escapar.

**6.4 (conceito)** Existe codificação segura para dado dentro de `<script>`?

> **Resposta:** **não**, de forma confiável — escape de JS é quebrável (strings, template literal, regex, comentário). ⚠ A resposta é **não inserir dado ali**.

**6.5 (conceito)** Quais as três condições para CSRF existir?

> **Resposta:** ação com efeito; autoridade **implícita** (cookie); parâmetros **previsíveis**. ⚠ Remover qualquer uma mata o CSRF — o token remove a terceira, o `SameSite` a segunda.

**6.6 (conceito)** CORS é defesa da aplicação?

> **Resposta:** **não**. A same-origin policy já impede; o CORS **relaxa** essa proteção para o caso legítimo. ⚠ Refletir a origem **com credencial** é vulnerabilidade — um CSRF de **leitura**.

**6.7 (conceito)** Uma CSP com `unsafe-inline` é defesa?

> **Resposta:** não — é declaração de intenção. ⚠ E `script-src 'self'` não impede XSS servido da própria origem.

**6.8 (conceito)** O WebSocket aplica same-origin no handshake?

> **Resposta:** **não** — diferente de `fetch`. ⚠ Quem decide é o **servidor**, conferindo `Origin` no handshake — e a maioria não confere.

---

## Módulo 7 — SSRF e uploads

**7.1 (conceito)** Defina SSRF.

> **Resposta:** confusão de posição — o atacante convence o servidor a usar as credenciais de **rede e configuração** dele, em um pedido do atacante. ⚠ Trocar de posição vale mais que qualquer injeção.

**7.2 (conceito)** Qual o destino de maior valor?

> **Resposta:** `169.254.169.254` — o metadata da nuvem, que entrega **credencial de instância**. ⚠ Quem alcança assume a identidade da máquina.

**7.3 (conceito)** Por que a defesa por string falha quatro vezes?

> **Resposta:** notação alternada (`127.1`, decimal, `[::1]`), nome que resolve para local, **redirect** e **DNS rebinding** (TOCTOU). ⚠ A quarta exige validar o IP **no momento da conexão**.

**7.4 (conceito)** Por que `file://` importa?

> **Resposta:** porque o **esquema** também é dado do usuário. ⚠ Bloquear IP privado não impede `file:///etc/passwd`.

**7.5 (conceito)** Upload são quantas falhas?

> **Resposta:** quatro, independentes: **nome** (traversal), **tipo declarado** (header do cliente), **extensão** e **conteúdo** (explora o processador). ⚠ A correção mais eficaz é **gerar o nome**.

**7.6 (conceito)** Só aceitar `.docx` evita XXE?

> **Resposta:** **não** — `.docx` **é** um ZIP com XML dentro. ⚠ O parser de XML roda de qualquer forma; a correção é **desligar entidade externa**.

**7.7 (conceito)** Por que webhook é SSRF por desenho?

> **Resposta:** porque a aplicação **é feita** para buscar uma URL que o usuário cadastra. ⚠ Não se pode bloquear; valida-se o destino **e revalida-se no disparo**. E assinatura com **`compare_digest`**.

---

## Módulo 8 — APIs

**8.1 (conceito)** Qual a diferença estrutural entre aplicação web e API?

> **Resposta:** na aplicação web, o **frontend filtra** — a tela mostra três campos, o formulário envia três. Na API, **não há tela**: o cliente vê o JSON inteiro, e nada esconde.

**8.2 (conceito)** Quais fontes revelam rotas de API?

> **Resposta:** OpenAPI, **JavaScript** do frontend, **app móvel**, `OPTIONS`, erro 404 vs 405, versão, log. ⚠ O app móvel é o mais produtivo: ele **não tem como esconder**.

**8.3 (conceito)** Por que `OPTIONS` é o teste mais barato?

> **Resposta:** ele responde **sem autenticar** e revela os métodos permitidos. ⚠ Um `Allow` com `PUT`/`DELETE` é candidato imediato.

**8.4 (conceito)** Por que o versionamento é a superfície esquecida?

> **Resposta:** a correção é aplicada na versão **atual**, e a **anterior** continua respondendo — porque algum cliente ainda a usa. ⚠ A falha corrigida fica viva em outra rota.

**8.5 (conceito)** `401` ou `404` — qual informa mais?

> **Resposta:** o `401`. ⚠ Ele confirma que **a rota existe**; o `404` não diz nada. A comparação de status é descoberta.

**8.6 (conceito)** Por que rate limit por IP não impede força bruta?

> **Resposta:** porque é burlável com origem distribuída — e o `X-Forwarded-For` do módulo 1 é justamente o que a burla. ⚠ Limita-se por **identidade** e por **alvo**.

**8.7 (conceito)** O que significa "endpoint não testado é lacuna declarada"?

> **Resposta:** que a ausência de teste não é "ok". ⚠ A matriz precisa ter observação em **todas** as linhas — inclusive nas que passaram.

---

## Módulo 9 — GraphQL e contrato

**9.1 (conceito)** O que o GraphQL inverte?

> **Resposta:** no REST o **servidor** define os endpoints; no GraphQL o **cliente** monta a consulta. ⚠ A autorização migra do **endpoint** para o **campo**.

**9.2 (conceito)** Qual o bug típico de GraphQL?

> **Resposta:** manter a autorização **no endpoint** e não checar no **resolver**. ⚠ O cliente acrescenta o campo `dono` à consulta, e a resposta traz `senhaHash`.

**9.3 (conceito)** Desligar introspecção é a correção?

> **Resposta:** não. O esquema vaza por erro de validação e sugestão de campo. ⚠ A defesa real é **autorização por campo**; desligar introspecção é atrito.

**9.4 (conceito)** Por que batching burla rate limiting?

> **Resposta:** porque o GraphQL aceita um **array de consultas** em um só `POST`. ⚠ Limitar "requisição por segundo" não limita **consulta** por segundo.

**9.5 (conceito)** Qual formato de serialização nunca aceita dado de usuário?

> **Resposta:** o que **constrói objeto** — `pickle`, Java serializado, `.NET BinaryFormatter`, PHP `unserialize`. ⚠ Eles executam **código**; não existe "sanitizar" — a postura é **não usar**.

**9.6 (conceito)** A documentação descreve a API?

> **Resposta:** é uma **hipótese** sobre ela. ⚠ Testar contra a spec testa a spec; testar contra o **comportamento** encontra o bug. Um parâmetro não documentado que muda o resultado é mass assignment.

---

## Módulo 10 — Lógica e concorrência

**10.1 (conceito)** Por que nenhuma ferramenta acha falha de lógica?

> **Resposta:** porque só faz sentido no **negócio**, produz `200` normal, existe naquela aplicação, e se corrige por **regra de negócio** — não por biblioteca.

**10.2 (conceito)** O que o grupo 1 explora?

> **Resposta:** sequência e estado — a aplicação confia na **ordem** das etapas e não verifica o **estado** de cada uma. ⚠ Etapa pulada, repetida, ou valor lido numa etapa e usado em outra sem revalidação.

**10.3 (conceito)** Como a soma pode ser inválida com linhas válidas?

> **Resposta:** uma linha com valor **negativo** anula o total — e nenhuma validação por linha pega. ⚠ O grupo 2 valida o tipo e não a **plausibilidade**.

**10.4 (conceito)** Qual a causa única da concorrência?

> **Resposta:** `ler → decidir → gravar` sem que o intervalo seja **atômico**. ⚠ E a correção preferida é pôr a **condição dentro da escrita** — assim a omissão é impossível.

**10.5 (conceito)** Qual a quinta variável do método?

> **Resposta:** o **paralelismo** — repetir N vezes ao mesmo tempo e **contar**. ⚠ É a mesma disciplina de medir reprodutibilidade do curso de Linux Internals.

**10.6 (conceito)** Onde o cache poisoning se encaixa?

> **Resposta:** no grupo 4 — emergente. ⚠ É o módulo 1 com impacto em todos: header do **cliente** entrando na chave de cache.

**10.7 (conceito)** Onde aprofundar confusão entre parsers?

> **Resposta:** nos cursos **`Parser Differentials`** (as N implementações) e **`HTTP Smuggling`** (as 10 variantes e a medição de desync). ⚠ Aqui aparece como uma classe entre outras, deliberadamente.

---

## Módulo 11 — Causa-raiz e correção

**11.1 (conceito)** Qual o critério de qualidade da causa-raiz?

> **Resposta:** **se não cabe em uma frase, você não entendeu o bug**. ⚠ "Falta de sanitização" não é causa; a linha com interpolação é.

**11.2 (conceito)** Por que rastrear do `sink` para o `source`?

> **Resposta:** porque **subir** é mais fácil que descer, e garante que você achou **todos** os caminhos — não só o primeiro.

**11.3 (conceito)** Qual a pergunta que revela a omissão?

> **Resposta:** *existe caminho do `source` ao `sink` que **não passe** pela validação?* ⚠ Em código com validação centralizada, a resposta costuma ser sim — porque algum consumidor chama a camada de baixo direto.

**11.4 (conceito)** Qual o critério da correção estrutural?

> **Resposta:** ela torna a omissão **impossível**, ou apenas menos provável? ⚠ E a segunda pergunta, obrigatória: **o que ela não resolve?**

**11.5 (conceito)** Três regras do teste de regressão?

> **Resposta:** tem de **falhar no código antigo**; verifica o **efeito**, não a implementação; e cobre a **correção negativa** (o indevido tem de falhar). ⚠ Sem a primeira, não prova nada.

**11.6 (conceito)** Por que log que registra token é achado?

> **Resposta:** porque cria um **segundo vazamento**, dentro de casa. ⚠ Um `token_reset` em log é a conta tomada.

**11.7 (conceito)** O que se escreve sobre ferramenta no relatório?

> **Resposta:** o que ela achou, o que você achou que **ela não achou**, e o que ela reportou e você **descartou**. ⚠ A terceira prova método.

---

## Módulo 12 — Projeto final

**12.1 (conceito)** Por que a seção "o que não foi testado" qualifica o relatório?

> **Resposta:** porque declarar a lacuna é honestidade técnica e protege o trabalho. ⚠ *"Não testei fila assíncrona"* é informação; o silêncio é lacuna escondida.

**12.2 (conceito)** O que significa PoC controlada?

> **Resposta:** a **requisição mínima** que demonstra o alcance — com dado fictício, no ambiente autorizado, **sem** executar a consequência. ⚠ Demonstrar que se alcança a credencial é prova; exfiltrá-la não é prova, é dano.

**12.3 (conceito)** Por que mapear antes de testar?

> **Resposta:** quem testa antes de mapear acha o que **estava procurando**; quem mapeia primeiro acha o que **está lá**. ⚠ É a diferença entre projeto e tentativa.

**12.4 (conceito)** Qual item da entrega mais distingue um bom relatório?

> **Resposta:** o **limite da correção** declarado. ⚠ Um relatório que diz "corrigido" sem dizer o que ficou de fora é incompleto — toda correção tem limite.

---

## Avaliação final — o que você deve saber fazer

Ao final do curso, sem consultar:

1. Desenhar as seis fronteiras de confiança de uma aplicação e dizer quem controla o dado em cada uma.
2. Escrever uma observação que caiba em uma frase com requisição, credencial e resposta.
3. Testar as três dimensões de autorização — objeto, função e propriedade.
4. Explicar por que a posse entra no `WHERE`, e por que `404` e não `403`.
5. Dizer a causa-raiz de uma injeção **em uma frase, com a linha**.
6. Identificar o **contexto** de saída de um dado e a codificação que corrige.
7. Enumerar os quatro bypasses de uma defesa de SSRF ingênua.
8. Preencher a matriz de endpoints e apontar a **versão antiga** que ficou viva.
9. Explicar por que a autorização em GraphQL vive no **resolver**.
10. Reconhecer uma operação não atômica e corrigi-la com a condição **dentro da escrita**.
11. Escrever um teste de regressão que **falha antes** e passa depois.
12. Produzir um relatório com causa-raiz, impacto **medido**, PoC **controlada**, correção e **limite declarado**.

⚠ **Se os doze itens fecham, o curso cumpriu o objetivo.** Os itens 3, 8 e 12 são os que a prática cobra primeiro.
