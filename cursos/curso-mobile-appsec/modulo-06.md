# Módulo 6 — `Deep Links`, `WebView` e Comunicação Entre Componentes

**Curso:** Mobile Application Security: Análise e Pesquisa de Vulnerabilidades
**Módulo:** 6 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 a 5
**Próximo:** Módulo 7 — Validação de entrada e lógica de negócio

---

## O que este módulo entrega

Ao final, você vai investigar **a superfície de invocação** — como outro app alcança o seu, e o que acontece quando alcança. É o módulo da fronteira mais específica do mobile, e onde metade dos achados do curso mora: ⚠ **os Cursos 1 e 2 mapearam as portas; aqui, você descobre o que acontece quando alguém entra.**

---

## 6.1 A superfície de invocação

⚠ **Os três canais pelos quais outro app alcança o seu, e a diferença entre eles:**

```
   ANDROID                          iOS
   ───────                          ───

   ⚠ Intent explicito                ⚠ URL scheme
     (componente nomeado)              (o app se REGISTRA)

   ⚠ Intent implicito                ⚠ Universal Link
     (acao + filtro)                   (associacao de dominio)

   ⚠ ContentProvider                 ⚠ Documento compartilhado
     (URI, consulta)                   (share sheet)
```

⚠ **A frase que organiza o módulo:**

> **A pergunta não é "o componente está exportado?". É: quando outro app o invoca,
> o que o app faz com o que recebeu — e quem o servidor acha que pediu?**

⚠ **E a segunda parte é a que este curso acrescenta:** ⚠ os Cursos 1 e 2 mostraram **que a porta existe**. ⚠ Aqui, você mede ⚠ **o efeito** — e ele costuma depender do **servidor** (módulo 4).

⚠ **A combinação que produz achado crítico, e ela é a mais frequente:**

```
   ⚠ OUTRO APP invoca com dado escolhido
        │
        ▼
   o app usa o dado SEM verificar a origem
        │
        ▼
   ⚠ o app faz a REQUISICAO com a SUA credencial
        │
        ▼
   ⚠ ⚠ O SERVIDOR responde ao app — e o atacante ve o dado
```

---

## 6.2 `Deep links`: a superfície de autorização

⚠ **O caso mais produtivo do módulo, e ele é `IDOR` por URL:**

```http
meuapp://perfil?id=42          ⚠ QUALQUER app abre
```

⚠ **As quatro perguntas, e cada uma é um achado:**

| # | Pergunta | ⚠ Se a resposta for ruim |
|---|---|---|
| 1 | ⚠ Verifica a **origem**? | ⚠ Outro app invoca |
| 2 | ⚠ Valida o **parâmetro**? | ⚠ Dado arbitrário entra |
| 3 | ⚠ Verifica **autorização**? | ⚠ ⚠ **Abre dado de outro** |
| 4 | ⚠ Usa a **credencial do usuário**? | ⚠ ⚠ A requisição sai autenticada |

⚠ **A quarta é a que fecha o achado:** ⚠ o `deep link` **não** traz credencial — ⚠ ele **usa a que o app já tem**. ⚠ Então o atacante **não precisa** de sessão: ⚠ ele **pega carona** na da vítima.

⚠ **O caminho completo, e ele é o que o relatório precisa:**

```
   1. ⚠ a VITIMA tem o app logado
        │
   2. outro app (ou um LINK na web) dispara:  meuapp://perfil?id=1
        │
   3. o app abre a tela, busca o dado COM A SESSAO DA VITIMA
        │
   4. ⚠ o dado da ana e' exibido
        │
   ⚠ IMPACTO: quem disparou o link escolhe o id
```

⚠ **A variante que aumenta o impacto:** ⚠ se o `deep link` **age** em vez de só exibir — ⚠ transferir, excluir, alterar senha — ⚠ o atacante **executa ação** em nome da vítima. ⚠ É `CSRF` por URL scheme, e é o padrão 5 do módulo 4 na forma mais direta.

```bash
# ── ⚠ INVOCAR PELO CAMINHO DE FORA ─────────────────────────
# ANDROID — de outro app:
adb shell am start -a android.intent.action.VIEW \
     -d "meuapp://perfil?id=1" com.exemplo.app
#    ⚠ o `-a VIEW -d <uri>` simula o que OUTRO APP faria

# ⚠ e o teste honesto — um app CHAMADOR de verdade:
adb shell am start -n com.exemplo.chamador/.AtacarActivity

# iOS:
xcrun simctl openurl booted "meuapp://perfil?id=1"
#    ⚠ no aparelho: outro app, ou um link
```

⚠ **A distinção entre `adb` e app chamador é a mesma do módulo 3 do Curso 1:** ⚠ o `adb` roda como **shell**; ⚠ o teste honesto usa **um app de verdade**, com o `uid` dele. ⚠ O relatório diz **qual dos dois** foi usado — é a coluna **pre-requisito**.

---

## 6.3 `WebView`: a fronteira entre dois mundos

⚠ **A parte mais rica do módulo, e a que tem mais achado:**

```
   ⚠ APP NATIVO  ◄─────── WebView ───────►  ⚠ CONTEUDO WEB
        │                                        │
        ├─ pode expor INTERFACE JS               ├─ pode carregar QUALQUER URL
        │   (o web chama o nativo)               ├─ pode rodar SCRIPT
        │                                        └─ pode ter COOKIE/DADO
        └─ ⚠ a ponte e' a superficie ────────────┘
```

⚠ **As cinco configurações que decidem, e cada uma é um achado:**

| Configuração | ⚠ O que permite |
|---|---|
| ⚠ **`addJavascriptInterface`** | ⚠ ⚠ **O web chama código nativo** |
| ⚠ **`setAllowFileAccess`** | ⚠ O web lê arquivo **do app** |
| ⚠ **`setAllowUniversalAccessFromFileURLs`** | ⚠ ⚠ **Lê arquivo e manda para fora** |
| **`setJavaScriptEnabled`** | Script — necessário, e perigoso |
| ⚠ **Origem da URL carregada** | ⚠ ⚠ **Se vem de parâmetro, é injeção** |

⚠ **A linha do `addJavascriptInterface` é a mais crítica do módulo:** ⚠ ela **expõe métodos do app ao JavaScript** — ⚠ e se o `WebView` carrega **conteúdo influenciável**, ⚠ o script chama o método nativo. ⚠ É o equivalente do `XSS` do curso de Web Apps, mas o dano é **no app**.

```java
// ⚠ VULNERAVEL — a ponte exposta, e a URL vinda de fora
webView.getSettings().setJavaScriptEnabled(true);
webView.addJavascriptInterface(new Ponte(), "app");   // ⚠ metodo nativo exposto
webView.loadUrl(getIntent().getStringExtra("url"));    // ⚠ ⚠ URL do CHAMADOR

class Ponte {
    @JavascriptInterface
    public String lerToken() { return tokenDoApp(); }   // ⚠ ⚠ exposto ao web
}
```

⚠ **A combinação das duas linhas é o achado:** ⚠ ponte exposta **e** URL controlada. ⚠ Sozinhas, cada uma é conveniência; ⚠ juntas, são **execução de código com acesso ao app**.

⚠ **E a versão iOS é equivalente, com outro nome:** ⚠ `WKScriptMessageHandler` faz o mesmo papel do `addJavascriptInterface`. ⚠ E a URL vem de `load(_:)` com parâmetro — ⚠ **a mesma pergunta**.

```bash
# ── ⚠ AS CONFIGURACOES DO WEBVIEW ─────────────────────────
grep -rniE 'addJavascriptInterface|setAllowFileAccess|'\
'setAllowUniversalAccessFromFileURLs|setJavaScriptEnabled|'\
'loadUrl|loadData|evaluateJavascript' app_jadx/sources/ 2>/dev/null | head -20

grep -rniE 'WKScriptMessageHandler|evaluateJavaScript|'\
'loadHTMLString|load\(URLRequest' app_jadx/sources/ 2>/dev/null | head -15
```

```bash
# ── ⚠ DE ONDE VEM A URL ───────────────────────────────────
#    ⚠ a pergunta que decide:
#      - constante no codigo?        -> ✅ ok
#    - ⚠ de Intent/extra?            -> ⚠ achado
#    - ⚠ de resposta do servidor?    -> ⚠ achado
#    - ⚠ de parametro de deep link?  -> ⚠ ⚠ critico
grep -rn 'loadUrl' app_jadx/sources/ 2>/dev/null | head -10
#    ⚠ leia o contexto do argumento
```

---

## 6.4 A ponte entre mundos: onde o dado vaza

⚠ **O fluxo que o relatório precisa mapear, e ele é o coração deste módulo:**

```
   ⚠ O QUE O APP METE NO WEBVIEW:
     - token em header?          ⚠ o web pode ler
     - token em cookie?          ⚠ idem
     - token via javascriptInterface?  ⚠ ⚠ exposto
     - URL com token na query?   ⚠ ⚠ em log, em historico

   ⚠ O QUE O WEB PODE CHAMAR:
     - metodos da ponte          ⚠ ⚠ o que eles fazem?
     - deeplinks                 ⚠ ⚠ o que eles abrem?
```

⚠ **A pergunta, em uma linha:** ⚠ **o que o conteúdo web consegue fazer com a identidade da vítima?** ⚠ Se a resposta é "chamar um método que lê o token", ⚠ o achado é **crítico**. ⚠ Se é "nada", ⚠ o achado é **menor**.

⚠ **E a razão de isso ser diferente do `XSS` web:** ⚠ no navegador, o script roda na **origem** e tem as limitações dela. ⚠ No `WebView`, o script pode ter uma **ponte para o nativo** — ⚠ e a ponte **não tem origem**. ⚠ É privilégio **além do que o web teria**.

| O script pode | ⚠ Sem ponte | ⚠ Com ponte |
|---|---|---|
| Ler cookie da página | ⚠ Sim | Sim |
| ⚠ **Ler arquivo do app** | ⚠ Não | ⚠ ⚠ **Sim** |
| ⚠ **Chamar o nativo** | ⚠ Não | ⚠ ⚠ **Sim** |
| ⚠ **Acessar o `Keychain`/`Keystore`** | ⚠ Não | ⚠ ⚠ **Via a ponte** |

---

## 6.5 Componentes e `IPC`: o que o Curso 1 deixou

⚠ **O que reaparece aqui, e como a pergunta mudou:**

| Curso 1 | ⚠ Este curso |
|---|---|
| ⚠ **O componente é exportado?** | ⚠ **O que acontece quando é invocado** |
| ⚠ Falta `Binder.getCallingUid()`? | ⚠ ⚠ **O efeito de não ter** |
| `ContentProvider` sem projeção validada | ⚠ ⚠ **O que ele devolve, e a quem** |
| `PendingIntent` sem `FLAG_IMMUTABLE` | ⚠ ⚠ **O que ele executa em nome de quem** |

⚠ **A diferença é de **natureza**: ⚠ o Curso 1 identifica a **omissão** (o código não verifica). ⚠ Aqui, o trabalho é demonstrar o **impacto** — ⚠ e ele depende do **servidor** e da **identidade** (módulos 2 e 4).

⚠ **E o `PendingIntent` merece a nota, porque é a autoridade emprestada do mobile:** ⚠ sem `FLAG_IMMUTABLE`, ⚠ outro app **preenche** o `Intent` interno — ⚠ e o app original executa **com a própria credencial**. ⚠ É a mesma classe do `Impersonation` do curso de Windows Internals.

```bash
# ── ⚠ A SUPERFICIE DE INVOCACAO, INTEIRA ──────────────────
# ANDROID:
adb shell dumpsys package com.exemplo.app 2>/dev/null | \
  grep -A2 -E 'Activity|Service|Receiver|Provider' | head -40
grep -B1 'android:exported="true"' \
  ~/android-lab/m02/app_smali/AndroidManifest.xml 2>/dev/null | head

# iOS:
plutil -extract CFBundleURLTypes xml1 -o - \
  ~/ios-lab/m02/ipa/Payload/*.app/Info.plist 2>/dev/null
```

```bash
# ── ⚠ TESTE POR CANAL, e registre o efeito ────────────────
# Activity com dado:
adb shell am start -n com.exemplo.app/.PerfilActivity --es usuario_id "1"

# Service com destino:
adb shell am startservice -n com.exemplo.app/.SyncService --es url "http://127.0.0.1:8000/"

# Broadcast:
adb shell am broadcast -a com.exemplo.app.ACAO_INTERNA --es comando "apagar_tudo"

# Provider:
adb shell content query --uri content://com.exemplo.app.dados/

# Deep link:
adb shell am start -a android.intent.action.VIEW -d "meuapp://perfil?id=1"

# ⚠ e para CADA um: o servidor foi envolvido? com QUAL credencial?
```

⚠ **A última linha é a que o curso cobra:** ⚠ o `Intent` dispara o app, ⚠ e o app faz a requisição **com a sessão dele**. ⚠ O servidor vê **o app autenticado** — ⚠ e não **outro app**. ⚠ É por isso que a autorização precisa estar no **servidor** (módulo 4).

---

## 6.6 O relatório da invocação

⚠ **O formato, e ele tem a coluna que amarra os módulos:**

```
ACHADO — SUPERFICIE DE INVOCACAO
──────────────────────────────────────────────────────────
CANAL:         Intent | deep link | WebView | Provider | share
VERIFICA:      ⚠ origem? parametro? autorizacao?
                    │
CHAMADOR:      ⚠ adb (shell) | APP proprio | link | web
⚠ CREDENCIAL:   com a sessao de QUEM?
                    │
EFEITO:        ⚠ o que aconteceu, observado
⚠ SERVIDOR:     a requisicao chegou? com que identidade?
                    │
PRE-REQUISITO: ⚠ nada | app instalado | outro app
CORRECAO:      ⚠ onde deve ficar a verificacao
──────────────────────────────────────────────────────────
```

⚠ **A linha `CREDENCIAL` é a que faz o achado ser grave ou não:** ⚠ se a invocação usa **a sessão da vítima**, ⚠ o atacante **não precisa** de conta. ⚠ Se exige **sessão própria**, ⚠ o impacto é outro.

⚠ **E a `SERVIDOR` é o que o Curso 1 e o Curso 2 não tinham como responder:** ⚠ a requisição **chegou** à API? ⚠ Com **qual identidade**? ⚠ E o servidor **autorizou**? ⚠ É a resposta que fecha o ciclo com o módulo 4.

---

## Laboratório 6 — Invocar pelo caminho de fora

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Exige o servidor do módulo 1 e os apps dos Cursos 1 e 2.**

```bash
mkdir -p ~/mobile-lab/m06 && cd ~/mobile-lab/m06
curl -s -o /dev/null -w "servidor: %{http_code}\n" http://127.0.0.1:5000/ || \
  (cd ../m01 && python api/servidor.py &)
```

```bash
# ── 1. A SUPERFICIE — enumere ANTES de testar ─────────────
grep -B1 'android:exported="true"' \
  ~/android-lab/m02/app_smali/AndroidManifest.xml 2>/dev/null | head -20
plutil -extract CFBundleURLTypes xml1 -o - \
  ~/ios-lab/m02/ipa/Payload/*.app/Info.plist 2>/dev/null
```

```bash
# ── 2. ⚠ DEEP LINK — o teste central ──────────────────────
#    ⚠ baseline: o caminho previsto (a tela do proprio app)
adb shell am start -n com.exemplo.app/.MainActivity
sleep 1

#    ⚠ variante: invocacao externa, com id escolhido
adb shell am start -a android.intent.action.VIEW -d "meuapp://perfil?id=1"
sleep 2
adb logcat -d | tail -20 | grep -iE 'perfil|id|usuario'

#    ⚠ e o caminho de fora DO APARELHO — pelo link
#    xcrun simctl openurl booted "meuapp://perfil?id=1"  (iOS)
```

```bash
# ── 3. ⚠ A CREDENCIAL — quem paga a requisicao ────────────
#    ⚠ observe o proxy/servidor: a requisicao saiu autenticada?
tail -20 /tmp/servidor.log 2>/dev/null || \
  echo "⚠ adicione log ao servidor para ver as requisicoes"

# ⚠ e a prova: rode o servidor com log de cabecalhos
cat > log_srv.py <<'EOF'
# ⚠ rode este wrapper na frente, ou adicione ao servidor:
#   print(request.method, request.path, request.headers.get("Authorization"))
EOF
```

```bash
# ── 4. ⚠ WEBVIEW — as configuracoes ──────────────────────
grep -rniE 'addJavascriptInterface|setJavaScriptEnabled|'\
'setAllowFileAccess|setAllowUniversalAccessFromFileURLs|loadUrl' \
  ../m05/app_jadx/sources/ 2>/dev/null | head -15

#    ⚠ e DE ONDE VEM A URL:
grep -rn -A2 -B2 'loadUrl' ../m05/app_jadx/sources/ 2>/dev/null | head -20
#    ⚠ constante? extra? resposta? -> o veredito muda
```

```bash
# ── 5. ⚠ PROVIDER e a projecao ────────────────────────────
adb shell content query --uri content://com.exemplo.app.dados/ 2>/dev/null
adb shell content query --uri content://com.exemplo.app.dados/ \
  --projection "_id,nome,senha_hash" 2>/dev/null
#    ⚠ a projecao nao autorizada devolveu algo?
```

```bash
# ── 6. O RELATORIO ────────────────────────────────────────
cat > invocacao.md <<'EOF'
# Superficie de invocacao — <app>
| # | Canal | Verifica origem? | Parametro | ⚠ Credencial | ⚠ Efeito | Servidor |
|---|-------|------------------|-----------|--------------|----------|----------|
## ⚠ WebView — a ponte e o que ela expoe
## ⚠ De onde vem a URL carregada
## ⚠ Causa raiz por achado (uma frase)
EOF
```

**O que observar:** no passo 2, o `deep link` com `id=1` — ⚠ o app abriu o dado da ana, **com a sessão de quem o tem**. ⚠ E no passo 4, a origem da URL do `WebView`: ⚠ se ela vem de `extra` ou de resposta, a combinação com a ponte é **execução de código**.

**Exercício 1:** complete o `invocacao.md` com todos os canais testados. ⚠ A coluna `credential` é obrigatória — com a sessão de **quem**.

**Exercício 2:** para o `deep link`, corrija em **duas** partes: ⚠ validar a origem **e** verificar autorização no **servidor**. ⚠ Rode os dois lados do teste.

**Exercício 3 (o que vale):** escolha **um** `WebView` e responda: ⚠ **o que o conteúdo web consegue fazer com a identidade da vítima?** ⚠ Liste os métodos expostos pela ponte, e o que cada um alcança. ⚠ Se a resposta for "nada", escreva por que ele ainda é achado — ou por que não é.

---

## Resumo

- ⚠ **A pergunta não é "o componente é exportado?"** — é o **efeito** quando outro app invoca.
- ⚠ **A combinação crítica:** outro app invoca → o app usa o dado sem verificar → **a requisição sai com a sessão da vítima**.
- ⚠ **As quatro perguntas do `deep link`:** origem, parâmetro, autorização e **credencial**.
- ⚠ **O `deep link` não traz credencial — ele pega carona na da vítima.**
- ⚠ **`addJavascriptInterface` expõe o nativo ao script** — e a ponte **não tem origem**.
- ⚠ **A URL do `WebView` vinda de `extra` ou de resposta é o achado** — a ponte só agrava.
- ⚠ **No `WebView`, o script tem privilégio que teria no navegador** — a ponte é além do web.
- ⚠ **`adb` testa alcançabilidade; um app chamador testa acesso real.**
- ⚠ **A autorização precisa estar no SERVIDOR** — ele vê o app autenticado, não outro app.

---

## O que o próximo módulo entrega

Você sabe invocar. O módulo 7 trata do que sobrevive depois: **validação de entrada e lógica de negócio** — onde o app e o servidor discordam.
