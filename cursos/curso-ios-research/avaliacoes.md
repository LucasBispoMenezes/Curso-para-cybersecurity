# Avaliações — iOS Security Research: Internals e Engenharia Reversa

**Banco de questões por módulo · resposta comentada**

---

## Como usar

Três blocos por módulo: **conceito**, **leitura de código** e **mão na massa**. A resposta comentada explica o *porquê*.

⚠ **O critério deste curso:** causa raiz **com classe e seletor**, **nível de laboratório declarado**, e a linha **`VALE NO APARELHO?`**.

---

## Módulo 1 — Arquitetura e modelo de segurança

**1.1 (conceito)** Quantos mecanismos decidem acesso no iOS, contra o `uid` do Android?

> **Resposta:** **três pilares independentes** — `code signing`, **`entitlements`** e `sandbox` — mais `Data Protection` e o `SEP`. ⚠ No Android, o `uid` decide quase tudo.

**1.2 (conceito)** O que o `Secure Enclave` muda na análise?

> **Resposta:** ele é **fora do kernel**. ⚠ Uma chave que mora lá **não é extraível nem com kernel comprometido** — a análise se limita a observar **o uso**.

**1.3 (conceito)** Por que `entitlement` é mais grave que permissão de Android?

> **Resposta:** porque é **declarado e assinado no binário**, e ⚠ **o usuário não vê**. ⚠ No Android, permissão perigosa é **aprovada pelo usuário**.

**1.4 (conceito)** O que `attestation` muda?

> **Resposta:** é a **única proteção estrutural** — quem decide é o **servidor**, com base em hardware. ⚠ Derruba a lógica de "só preciso do app".

**1.5 (conceito)** O que "root" **não** alcança no iOS?

> **Resposta:** ⚠ o **`SEP`** — em **qualquer** cenário, inclusive com kernel comprometido.

**1.6 (leitura de código)** Um app declara `no-container`. O que isso significa?

> **Resposta:** ele **sai do sandbox de container** — acessa caminhos fora do próprio. ⚠ Privilégio de **app do sistema**; em terceiro, é achado **crítico**.

---

## Módulo 2 — `IPA`, `Mach-O` e `Info.plist`

**2.1 (conceito)** Por que `Mach-O` não é `ELF` nem `PE`?

> **Resposta:** entre outras diferenças, ⚠ **fat binary** — um arquivo com **várias arquiteturas**. ⚠ É a raiz do módulo 10.

**2.2 (conceito)** ⚠ O que `LC_ENCRYPTION_INFO` com `cryptid = 1` significa?

> **Resposta:** ⚠ o binário está **cifrado no disco** — o kernel decifra em memória. ⚠ A análise estática de app da loja **exige decifrar antes**.

**2.3 (conceito)** Por que o binário do simulador não é o do aparelho?

> **Resposta:** são **fatias diferentes** do fat binary — ⚠ **arquiteturas diferentes**, endereços diferentes, instruções diferentes.

**2.4 (conceito)** Cite as cinco chaves do `plist` que decidem a análise.

> **Resposta:** `CFBundleURLTypes`, **`NSAppTransportSecurity`**, `UIFileSharingEnabled`, `NSUbiquitousContainers` e `LSApplicationQueriesSchemes`.

**2.5 (conceito)** O que `NSAllowsArbitraryLoads` é?

> **Resposta:** ⚠ **HTTP em claro permitido** — achado direto, sem executar nada. ⚠ O Curso 3 aprofunda.

**2.6 (leitura de código)** O que o `embedded.mobileprovision` é?

> **Resposta:** o **perfil assinado pela Apple** que diz **quais `entitlements`** aquele app pode ter. ⚠ É **legível** — é onde o privilégio aparece primeiro.

**2.7 (mão na massa)** Por que `__objc_*` sobrevive a stripping?

> **Resposta:** porque são **metadados de runtime** — o runtime precisa deles. ⚠ É o que torna a análise Objective-C direta, mesmo em binário strippado.

---

## Módulo 3 — Objective-C, Swift e o runtime

**3.1 (conceito)** O que é "mensagem" e por que ela importa?

> **Resposta:** `objc_msgSend(alvo, seletor, ...)` — ⚠ o método é resolvido **em runtime**. ⚠ É isso que torna a instrumentação possível e uniforme.

**3.2 (conceito)** ⚠ Por que os seletores são a superfície?

> **Resposta:** porque são **strings no binário**. ⚠ Um `grep` por `algo:` acha **qualquer** método chamado — e é a listagem mais rápida da análise.

**3.3 (conceito)** O que o nome da classe denuncia?

> **Resposta:** a **proteção**. ⚠ `RootDetection`, `JailbreakCheck` aparecem sem desmontagem — é o atalho do módulo 9.

**3.4 (conceito)** Por que Swift é mais difícil, e o que resolve?

> **Resposta:** ele **mangla** os nomes e tende à resolução estática. ⚠ `swift demangle` reverte o nome; ⚠ e `@objc` **reexpõe** o método ao runtime.

**3.5 (conceito)** Por que a superfície de entrada de app Swift tende a ser `@objc`?

> **Resposta:** porque ela responde a `UIApplication`, a URL scheme e a `NotificationCenter` — ⚠ e isso exige exposição. ⚠ É onde o dado entra.

**3.6 (leitura de código)** Em `openURL:options:`, o que quase nunca é lido?

> **Resposta:** ⚠ `UIApplicationOpenURLOptionsSourceApplicationKey` — **qual app abriu**. ⚠ É o equivalente do `Binder.getCallingUid()`.

**3.7 (mão na massa)** Por que `App Group` é achado?

> **Resposta:** porque **dois apps leem o mesmo dado** — ⚠ e o mais fraco compromete o mais forte. ⚠ E é **declarado por entitlement**, legível no binário.

---

## Módulo 4 — `Code signing` e `entitlements`

**4.1 (conceito)** Quais três verificações a assinatura faz?

> **Resposta:** a assinatura é válida; o perfil **autoriza aquele app**; os `entitlements` **batem** com o autorizado. ⚠ Alterar qualquer um faz o app não rodar.

**4.2 (conceito)** ⚠ O que `no-container` concede?

> **Resposta:** o app **ignora o sandbox de container** — acessa fora do próprio. ⚠ Privilégio de app do sistema.

**4.3 (conceito)** O que `skip-library-validation` concede?

> **Resposta:** ⚠ **carregar código sem validação de biblioteca** — a base da injeção de `dylib` e da instrumentação.

**4.4 (conceito)** O que `get-task-allow` habilita, e onde aparece?

> **Resposta:** **depuração** — `lldb` **sem `jailbreak`**. ⚠ Presente em build de dev, **ausente** em produção.

**4.5 (conceito)** O que `linker-signed` significa?

> **Resposta:** ⚠ **não há assinatura real** — é o que o linker produz sem identidade. ⚠ Não roda em aparelho comum; roda em simulador.

**4.6 (leitura de código)** ⚠ Um `entitlement` que o código **não usa** é achado?

> **Resposta:** **sim** — é **privilégio latente**. ⚠ Existe, está assinado, e qualquer comprometimento do app **pode usá-lo**.

**4.7 (mão na massa)** Por que comparar perfil e assinatura?

> **Resposta:** porque o **perfil** diz o que **pode**, e a **assinatura** o que foi **pedido**. ⚠ Divergência é achado.

---

## Módulo 5 — `Sandbox`, container e `Keychain`

**5.1 (conceito)** Como o `sandbox` do iOS difere do `uid` do Android?

> **Resposta:** é **por PERFIL** — descreve **operações**, não arquivos. ⚠ O app alcança caminhos específicos, e só.

**5.2 (conceito)** Que duas coisas quebram o isolamento, e por quê?

> **Resposta:** `AppGroup` e **`keychain-access-group`** — ⚠ ambos por **`entitlement`**. ⚠ É o desenho, não falha — mas amplia a superfície.

**5.3 (conceito)** ⚠ Por que `UntilFirstUserAuthentication` engana?

> **Resposta:** porque protege **até o primeiro desbloqueio** — e depois disso o arquivo fica legível **enquanto o aparelho estiver ligado**. ⚠ É a classe **padrão** de muitos apps.

**5.4 (conceito)** O que `NSFileProtectionNone` significa?

> **Resposta:** ⚠ **sempre legível** — inclusive com aparelho **bloqueado**.

**5.5 (conceito)** O `Keychain` do iOS é cofre de chave?

> **Resposta:** **não** — é armazenamento de **item** (senha, token, certificado). ⚠ Tratá-lo como cofre leva a conclusão errada.

**5.6 (conceito)** ⚠ O que `ThisDeviceOnly` decide?

> **Resposta:** se o item **vai para o backup**. ⚠ Sem ele, o token **sai do aparelho** — é o mesmo resultado do `allowBackup`, com outro mecanismo.

**5.7 (leitura de código)** Um `deep link` abre `meuapp://perfil?id=42` sem checar posse. O que é?

> **Resposta:** **`IDOR` por URL scheme** — a mesma classe do módulo 4 do curso de Web Apps.

**5.8 (mão na massa)** Qual a armadilha da validação de parâmetro na URL?

> **Resposta:** a URL é **percent-encoded**, e validar **antes** de decodificar é vulnerável a `%2e%2e%2f` — path traversal (módulo 5 do curso de Web Apps).

---

## Módulo 6 — Análise estática

**6.1 (conceito)** Qual a ordem de uso das ferramentas?

> **Resposta:** ⚠ **`strings` primeiro** (URL, SQL, erro, chave, proteção), depois `nm`, depois desmontagem **localizada**. ⚠ Ler tudo não escala.

**6.2 (conceito)** O que um binário strippado ainda tem?

> **Resposta:** ⚠ **metadados de `objc`** — que não são strippados, porque o runtime precisa deles.

**6.3 (conceito)** ⚠ O que distingue mensagem de chamada direta na desmontagem?

> **Resposta:** `bl _objc_msgSend` é **indireção** (instrumentável); ⚠ `bl 0x...` é **chamada direta** (só por `Interceptor`). ⚠ A razão entre os dois diz o que o módulo 8 alcança.

**6.4 (conceito)** Quais os quatro pontos de entrada do iOS?

> **Resposta:** `openURL:options:`, `continueUserActivity`, ⚠ **`NSUserDefaults`** e resposta de rede.

**6.5 (conceito)** Por que `NSUserDefaults` é ponto de entrada?

> **Resposta:** porque é **dado local, em disco** — ⚠ e pode ter sido alterado. ⚠ É o `SharedPreferences` do iOS.

**6.6 (leitura de código)** Um app valida `invalid_token` e `expired_session`. O que isso revela?

> **Resposta:** que o app **tem esses conceitos no código**. ⚠ Mensagem de erro é escrita **para o caso que o autor previu**.

**6.7 (mão na massa)** O que a estática **não** vê?

> **Resposta:** o que o app **faz**, valor calculado, código carregado depois, ⚠ e **se a proteção é eficaz**.

---

## Módulo 7 — Análise dinâmica

**7.1 (conceito)** Por que `os_log` engana?

> **Resposta:** porque **não aparece por padrão** em produção — só em dev ou com diagnóstico. ⚠ "Não vejo log" pode ser log que existe e não é exibido.

**7.2 (conceito)** O dado pode ser marcado como privado no log?

> **Resposta:** **sim** (`%{private}@`) — ⚠ mas é **opcional**, e app que não marca **vaza**.

**7.3 (conceito)** Qual o análogo do `avc: denied` no iOS?

> **Resposta:** ⚠ **`sandbox deny`** — e o log diz **qual operação** foi negada.

**7.4 (conceito)** ⚠ Por que `dtrace` não é o caminho principal?

> **Resposta:** porque exige **SIP desabilitado**, e é **restrita no aparelho**. ⚠ Em iOS, o caminho é **instrumentação**.

**7.5 (conceito)** O que substitui o `strace openat`?

> **Resposta:** ⚠ **`find -newer`** — marca o tempo, roda o app, e vê o que mudou. ⚠ É o `openat` do iOS, sem comprometer o sistema.

**7.6 (leitura de código)** A hipótese não se confirmou. Quais as duas causas?

> **Resposta:** **hipótese errada** ou **proteção existe**. ⚠ Confundi-las é **falso negativo**.

**7.7 (mão na massa)** Quais os cinco itens do registro?

> **Resposta:** ⚠ **nível (A/B)**, como provoquei, a saída **bruta**, a versão, e **se houve contorno**.

---

## Módulo 8 — Depuração e instrumentação

**8.1 (conceito)** Qual ferramenta funciona no Nível A?

> **Resposta:** ⚠ **`lldb`** — porque Xcode anexa ao app **depurável** no simulador. ⚠ **`Frida` exige `jailbreak`**.

**8.2 (conceito)** O que é `method swizzling`?

> **Resposta:** trocar a implementação de um método **em runtime** — ⚠ é mecanismo **nativo** do runtime, não um hack.

**8.3 (conceito)** ⚠ Por que o seletor inclui os dois-pontos?

> **Resposta:** porque `verificar:` (um parâmetro) ≠ `verificar` (zero). ⚠ Errar isso faz o hook **não instalar**.

**8.4 (conceito)** O que o hook em `openURL` mostra?

> **Resposta:** ⚠ **a URL e a origem** — e se o app **não lê a origem**, o achado do módulo 5 é confirmado em runtime.

**8.5 (conceito)** Por que o `lldb` só anexa app depurável?

> **Resposta:** porque sem `get-task-allow` o **`ptrace` é negado**. ⚠ É a razão de o atributo ser achado.

**8.6 (conceito)** ⚠ O que forçar o retorno **prova** e **não** prova?

> **Resposta:** prova que a validação estava **ali** e era **o único obstáculo**. ⚠ **Não** prova que outro app alcança o mesmo.

**8.7 (leitura de código)** ⚠ "O app não lê a origem" equivale a "qualquer app pode invocá-lo"?

> **Resposta:** **não**. ⚠ Depende também do **registro do URL scheme** e das restrições do sistema. ⚠ As duas coisas juntas é que produzem o achado.

---

## Módulo 9 — Integridade e proteções

**9.1 (conceito)** Enuncie a tese, e a exceção.

> **Resposta:** nenhuma proteção **impede**; todas **encarecem** — ⚠ **exceto `attestation`**, que é **fora do app**.

**9.2 (conceito)** ⚠ Qual proteção local **impede** de fato?

> **Resposta:** ⚠ **`PT_DENY_ATTACH`** — bloqueia o `ptrace`, e ⚠ **sem `ptrace` não há `lldb`**.

**9.3 (conceito)** Por que a verificação de assinatura não é barreira?

> **Resposta:** porque **o valor esperado está no app** — ⚠ legível, observável e alterável.

**9.4 (conceito)** O que `App Attest` faz de diferente?

> **Resposta:** a chave nasce no **`SEP`** e **não sai**; ⚠ quem verifica é o **servidor**. ⚠ É a única proteção **estrutural**.

**9.5 (conceito)** O que `App Attest` **não** resolve?

> **Resposta:** ⚠ **a análise em si** — ele impede o **uso** por cliente modificado, não a leitura do app.

**9.6 (leitura de código)** Por que o contorno pode quebrar o app legítimo?

> **Resposta:** porque `fileExistsAtPath:` que devolve `NO` para `/bin/bash` afeta **qualquer** verificação. ⚠ O contorno precisa ser **cirúrgico**.

**9.7 (mão na massa)** Explique o custo assimétrico.

> **Resposta:** o autor **paga uma vez**; quem analisa **paga a cada versão**.

---

## Módulo 10 — Simulador × dispositivo

**10.1 (conceito)** O simulador é um iOS pequeno?

> **Resposta:** **não** — é ambiente **diferente**, que imita a interface. ⚠ Roda com a arquitetura do **Mac**.

**10.2 (conceito)** ⚠ O que a ausência de `SEP` invalida?

> **Resposta:** ⚠ ⚠ **toda conclusão sobre `Keychain`** — no simulador, ele é **imitação**.

**10.3 (conceito)** O que a ausência de `Data Protection` invalida?

> **Resposta:** ⚠ qualquer afirmação sobre a **classe de proteção** de um arquivo. ⚠ Você vê a referência no código, **não o efeito**.

**10.4 (conceito)** ⚠ Por que o `sandbox` frouxo engana?

> **Resposta:** porque uma leitura que **funciona** no simulador pode **falhar** no aparelho — e ⚠ o simulador **deixa passar** o que o aparelho **nega**.

**10.5 (conceito)** O que **vale** no simulador?

> **Resposta:** ⚠ tudo que é **assinado** ou **do binário**: pacote, `plist`, `entitlements`, metadados, lógica e **`lldb`**.

**10.6 (conceito)** Como se sobe para o dispositivo **sem `jailbreak`**?

> **Resposta:** com **Apple ID + perfil de desenvolvimento** — ⚠ e o app ganha `get-task-allow`, ficando **depurável**.

**10.7 (mão na massa)** Quantas respostas tem a coluna `VALE NO APARELHO?`?

> **Resposta:** **três** — sim, **precisa B**, e ⚠ **só B responde**. ⚠ A terceira é **resultado**, não lacuna escondida.

---

## Módulo 11 — Projeto final

**11.1 (conceito)** Por que inventariar antes de executar?

> **Resposta:** porque o comportamento não anunciado aparece **contra o esperado**.

**11.2 (conceito)** ⚠ Por que o passo "nível" qualifica o relatório?

> **Resposta:** porque sem ele, achado **de estrutura** (que vale) e achado **de hardware** (não medido) se misturam — ⚠ e a prioridade sai errada.

**11.3 (conceito)** Quais os três itens da seção de limitações?

> **Resposta:** o que exigiu Nível B; ⚠ o que **só** B responde; e o que é **específico da versão**.

**11.4 (leitura de código)** Um relatório diz "o app tem anti-jailbreak, logo é seguro". O que erra?

> **Resposta:** confunde **ter proteção** com **análise**. ⚠ A pergunta é **o que ela consegue** — e a resposta é **encarecer**.

---

## Avaliação final

Sem consultar, você deve saber:

1. Explicar os três pilares e por que `entitlement` é privilégio **invisível ao usuário**.
2. Abrir um `IPA`, dizer o que é fat binary e o que `cryptid = 1` implica.
3. Ler classe e seletor, e explicar por que a indireção permite instrumentar.
4. Listar `entitlements` por gravidade — incluindo `no-container` e `get-task-allow`.
5. Distinguir `Data Protection` por arquivo, e por que `UntilFirstUserAuthentication` engana.
6. Dizer o que `ThisDeviceOnly` decide, e o que acontece sem ele.
7. Fazer a triagem por `strings` e apontar a proteção pelo nome.
8. Confirmar comportamento **sem instrumentar**, e declarar o nível.
9. Instrumentar com `lldb`, e explicar o que o hook **não** prova.
10. Dizer qual proteção **impede**, e por que as outras só encarecem.
11. Listar três coisas que **só o dispositivo** responde.
12. Produzir relatório com **causa raiz**, **nível** e **limitações**.

⚠ **Se os doze itens fecham, o curso cumpriu o objetivo.** Os itens 4, 11 e 12 são os que a prática cobra primeiro.
