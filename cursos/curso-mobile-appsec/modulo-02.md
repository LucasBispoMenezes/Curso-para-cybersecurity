# Módulo 2 — Autenticação, Sessão e Identidade

**Curso:** Mobile Application Security: Análise e Pesquisa de Vulnerabilidades
**Módulo:** 2 de 12 · 4 horas
**Pré-requisitos:** Módulo 1
**Próximo:** Módulo 3 — Armazenamento inseguro de dados

---

## O que este módulo entrega

Ao final, você vai saber **investigar o ciclo de vida de autenticação de um app mobile** — onde a sessão vive, o que a invalida, e o que **sobrevive** ao logout. É o módulo que aplica o raciocínio do módulo 3 do curso de Web Apps ao cliente instalado, onde o problema é maior: **o token está no aparelho do usuário**.

---

## 2.1 O que muda em relação ao web

⚠ **A diferença estrutural, e ela é o centro do módulo:**

```
   NAVEGADOR                        ⚠ APP INSTALADO
   ─────────                        ───────────────

   ⚠ cookie gerenciado pelo          ⚠ TOKEN guardado pelo APP
     NAVEGADOR                         - Keychain (iOS)
     - HttpOnly protege o JS           - Keystore / EncryptedPrefs
     - SameSite protege CSRF           - ⚠ ou em CLARO
                                       ⚠ o APP decide onde
   ⚠ o site nao escolhe               ⚠ e o APP pode ser
     onde guardar                       MANIPULADO
```

⚠ **A frase que organiza o módulo:**

> **No web, o cookie é protegido pelo navegador contra o próprio site. No mobile, o app
> escolhe onde guardar o token — e o app é do usuário.**

⚠ **Três consequências, e cada uma é um achado possível:**

| Fato | ⚠ Achado |
|---|---|
| ⚠ **O app escolhe onde guardar** | ⚠ Token em `.plist`, `SharedPreferences`, log |
| ⚠ **O app decide quando usar** | ⚠ Token usado mesmo após logout |
| ⚠ **O app decide o que validar** | ⚠ ⚠ Expiração validada **só no app** |

⚠ **A terceira é a que mais rende, e é a mesma do módulo 4:** ⚠ se o app valida a expiração **localmente** e o servidor **não**, então **estender a data no aparelho** prolonga a sessão. ⚠ É o padrão *"o cliente decide, o servidor confia"*.

---

## 2.2 Onde a sessão vive

⚠ **Os quatro lugares, e o que cada um significa:**

| Onde | ⚠ Android | ⚠ iOS | ⚠ Risco |
|---|---|---|---|
| ⚠ **Armazenamento protegido** | `EncryptedSharedPreferences` | **`Keychain`** | ⚠ Baixo |
| ⚠ **Armazenamento comum** | `SharedPreferences` | `NSUserDefaults` | ⚠ ⚠ **Alto** |
| ⚠ **Arquivo** | interno, `SQLite` | `.plist`, `SQLite` | ⚠ ⚠ Alto |
| ⚠ **Memória** | variável | variável | ⚠ Baixo — mas some no restart |

⚠ **A segunda linha é a que aparece em auditoria real, e os Cursos 1 e 2 já mostraram onde olhar:** ⚠ `Library/Preferences/*.plist` no iOS, `shared_prefs/*.xml` no Android. ⚠ É o **mesmo achado**, em dois lugares diferentes.

⚠ **E a terceira é a que surpreende:** ⚠ token em `SQLite` de cache, ou em arquivo de log. ⚠ O módulo 3 trata o armazenamento; aqui, o que importa é: ⚠ **a sessão está ali?**

```bash
# ── ANDROID — onde o token esta ────────────────────────────
adb shell run-as com.exemplo.app find /data/data/com.exemplo.app/ -type f \
  -exec grep -l 'token\|Bearer\|session' {} \; 2>/dev/null
adb shell run-as com.exemplo.app cat \
  /data/data/com.exemplo.app/shared_prefs/*.xml 2>/dev/null | head -20
```

```bash
# ── iOS — onde o token esta ────────────────────────────────
CT=$(xcrun simctl get_app_container booted com.exemplo.app data 2>/dev/null)
grep -ril 'token\|bearer\|session' "$CT" 2>/dev/null | head
plutil -p "$CT/Library/Preferences/"*.plist 2>/dev/null | head -20
```

⚠ **As duas consultas fazem a mesma pergunta, com ferramenta diferente:** ⚠ *onde o token está guardado?* ⚠ E a resposta define a **gravidade** — ⚠ `Keychain`/`EncryptedSharedPreferences` é uma coisa; `.plist` em claro é outra.

⚠ **A verificação que qualifica o achado, no iOS:** ⚠ o item tem **`ThisDeviceOnly`**? (Curso 2, módulo 5) ⚠ Sem ele, o token **sai no backup** — e o achado muda de categoria.

---

## 2.3 O que invalida a sessão

⚠ **A investigação do ciclo, e ela precisa de **servidor** (módulo 1):**

```
   1. LOGIN       ->  o token e' emitido
        │
   2. USO         ->  ⚠ o token autentica
        │
   3. LOGOUT      ->  ⚠ ⚠ O TOKEN AINDA AUTENTICA?
        │              ⚠ teste com o mesmo token, direto na API
        ▼
   4. EXPIRACAO   ->  ⚠ o servidor confere o prazo?
        │
   5. TROCA DE SENHA -> ⚠ as OUTRAS sessoes caem?
```

⚠ **O passo 3 é o teste mais simples do curso, e o que mais produz achado** — e ele **exige o servidor**:

```bash
# ── 1. Autentique e guarde o token ─────────────────────────
T=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | \
    python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
echo "token: $T"

# ── 2. Use ─────────────────────────────────────────────────
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/perfil

# ── 3. ⚠ LOGOUT — e use o MESMO token ─────────────────────
curl -s -X POST -H "Authorization: Bearer $T" http://127.0.0.1:5000/logout
echo
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/perfil
#    ⚠ SE RETORNAR O PERFIL -> a sessao nao morreu no servidor
```

⚠ **O resultado esperado é `401`; o comum é `200`** — porque o logout apagou **o token do app**, e o **servidor nunca soube**. ⚠ É **literalmente** o mesmo bug do módulo 3 do curso de Web Apps — e aqui ele é ainda mais comum, porque no mobile o "logout" costuma ser só **limpar o armazenamento local**.

⚠ **E o passo 5 é o mais grave em impacto real:**

```bash
# ⚠ Trocar a senha derruba as OUTRAS sessoes?
T1=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
T2=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST -H "Authorization: Bearer $T1" -d "nova=outra" \
     http://127.0.0.1:5000/trocar-senha 2>/dev/null
curl -s -H "Authorization: Bearer $T2" http://127.0.0.1:5000/perfil
#    ⚠ T2 sobreviveu? -> trocar a senha NAO expulsou o invasor
```

⚠ **A correção é a do módulo 3 do curso de Web Apps, e vale repetir:** ⚠ **timestamp de senha** — o servidor guarda quando a senha mudou e **rejeita qualquer sessão anterior**. ⚠ Uma linha, e resolve a classe.

---

## 2.4 Identidade: quem o servidor acha que você é

⚠ **A pergunta central do curso, e ela é a do módulo 4 aplicada à sessão:**

> **O servidor decide a identidade pelo TOKEN, ou pelo que o app manda junto?**

```python
# ⚠ VULNERAVEL — o servidor aceita a identidade do corpo
@app.post("/pedido")
def pedido():
    e = eu()                                   # ⚠ tem o token
    uid = request.form.get("usuario_id")       # ⚠ ⚠ mas usa OUTRO
    return jsonify(dados_do_usuario(uid))

# ✅ CORRIGIDO — a identidade vem do TOKEN
@app.post("/pedido")
def pedido():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    return jsonify(dados_do_usuario(e["id"]))   # ⚠ do token
```

⚠ **É a mesma distinção *dado vs. identidade* do módulo 1 do curso de Web Apps** — e no mobile ela é **mais frequente**, porque o app costuma mandar "quem eu sou" em cada requisição, já que ele já sabe.

⚠ **O teste, e ele exige o app e o proxy (módulo 5):** ⚠ intercepte a requisição, troque o identificador, e veja **se o servidor obedece**. ⚠ Se obedecer, o achado é **`IDOR`** — e é o mesmo do curso de Web Apps.

⚠ **E a variante mobile-específica:** ⚠ o token pode **conter** a identidade — como `JWT` com o `sub`, ou o `papel` como claim. ⚠ Aqui, a pergunta muda: ⚠ **o servidor valida a assinatura, e usa o claim — ou confia no que o app decodificou?**

| Onde o papel está | ⚠ Se o servidor confia no app |
|---|---|
| ⚠ **No claim do `JWT`** | ⚠ ⚠ Se não valida a assinatura, o atacante **troca o claim** |
| **No corpo da requisição** | ⚠ ⚠ `IDOR` / escalada |
| ⚠ **Na resposta do login** | ⚠ ⚠ O app guarda, e o servidor **não reconfere** |
| ✅ **No banco, pelo token** | ✅ Correto |

---

## 2.5 MFA no mobile: onde cede

⚠ **O segundo fator, e as três falhas típicas:**

| Falha | ⚠ Mecanismo |
|---|---|
| ⚠ **Sessão criada antes do 2º fator, sem rotação** | ⚠ ⚠ O 2º fator é **decorativo** |
| ⚠ **O 2º fator é validado no APP** | ⚠ ⚠ O app decide que passou |
| **Código sem rate limiting** | ⚠ Força bruta de 6 dígitos |
| ⚠ **"Lembrar este aparelho" sem expiração** | ⚠ Bypass permanente |

⚠ **As duas primeiras são as específicas do mobile, e a primeira é a do módulo 3 do curso de Web Apps:** ⚠ se o app recebe a sessão **no login** e não rotaciona **após** o MFA, quem tem o token antes **passa sem fazer MFA**.

⚠ **A segunda é a que o curso cobra como achado:** ⚠ se o **app** valida o código e informa o servidor "validado", ⚠ o atacante **pula a validação** — alterando o app ou a requisição. ⚠ A validação **precisa** estar no servidor.

⚠ **A verificação, e ela exige o servidor (módulo 1):**

```bash
# ⚠ O servidor valida o MFA, ou aceita "ja validei" do app?
T=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | \
    python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")

# ⚠ mande uma requisicao que SO' deveria passar apos o MFA
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/area-restrita
#    ⚠ passou? -> o servidor nao exigiu o segundo fator
```

---

## 2.6 O relatório da sessão

⚠ **O formato, e ele tem a linha que qualifica o achado:**

```
ACHADO — SESSAO
──────────────────────────────────────────────────────────
ONDE VIVE:     Keychain | EncryptedPrefs | ⚠ plist | ⚠ SQLite | memoria
PROTECAO:      ⚠ ThisDeviceOnly? classe? criptografado?
                    │
LOGOUT:        ⚠ o token continua valido? (teste na API)
EXPIRACAO:     ⚠ validada no SERVIDOR, ou so' no app?
TROCA DE SENHA: ⚠ as outras sessoes caem?
MFA:           ⚠ validado no SERVIDOR?
IDENTIDADE:    ⚠ vem do TOKEN, ou do que o app manda?
                    │
CAMINHO:       o comando, do inicio ao efeito
PRE-REQUISITO: ⚠ o que o atacante precisa ter
──────────────────────────────────────────────────────────
```

⚠ **A linha `LOGOUT` é a que tem resposta **binária**, e é a de maior rendimento:** ⚠ o token continua valendo? ⚠ Sim ou não — e o teste leva dois comandos.

⚠ **E a linha `IDENTIDADE` é a que liga ao módulo 4:** ⚠ ela é a pergunta *"o servidor confia no app?"*, aplicada à sessão. ⚠ Se a identidade vem do que o app manda, ⚠ **todo** endpoint é candidato a `IDOR`.

---

## Laboratório 2 — Investigar o ciclo

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Exige o servidor do módulo 1.**

```bash
mkdir -p ~/mobile-lab/m02 && cd ~/mobile-lab/m02
curl -s http://127.0.0.1:5000/ -o /dev/null -w "servidor: %{http_code}\n" || \
  (cd ../m01 && python api/servidor.py &)
```

```bash
# ── 1. O CICLO, direto na API ──────────────────────────────
T=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | \
    python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
echo "T=$T"

echo "══ 1. uso normal"
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/perfil

echo; echo "══ 2. logout"
curl -s -X POST -H "Authorization: Bearer $T" http://127.0.0.1:5000/logout

echo; echo "══ 3. ⚠ o token AINDA vale?"
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/perfil
#    ⚠ 200 = a sessao nao morreu no servidor
```

```bash
# ── 2. ⚠ IDENTIDADE — o servidor obedece ao app? ───────────
T=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | \
    python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

echo "══ o pedido 10 e' do bruno"
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/pedido/10
echo; echo "══ ⚠ e o 91, que e' da ana?"
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/pedido/91
#    ⚠ retornou? -> IDOR: o servidor nao confere a posse
```

```bash
# ── 3. ⚠ O TOKEN NO APARELHO — onde ele foi guardado ───────
# ANDROID:
adb shell run-as com.exemplo.app find /data/data/com.exemplo.app/ -type f \
  2>/dev/null | head -20
adb shell run-as com.exemplo.app cat \
  /data/data/com.exemplo.app/shared_prefs/*.xml 2>/dev/null | head -20

# iOS:
CT=$(xcrun simctl get_app_container booted com.exemplo.app data 2>/dev/null)
grep -ril 'token\|bearer' "$CT" 2>/dev/null | head
plutil -p "$CT/Library/Preferences/"*.plist 2>/dev/null | head
#    ⚠ o token esta' em claro? em qual arquivo?
```

```bash
# ── 4. ⚠ O TOKEN NO LOG ────────────────────────────────────
# ANDROID:
adb logcat -c; adb shell am start -n com.exemplo.app/.MainActivity; sleep 2
adb logcat -d | grep -iE 'token|bearer|authorization' | head

# iOS:
xcrun simctl spawn booted log show --last 2m 2>/dev/null | \
  grep -iE 'token|bearer' | head
#    ⚠ achado que vale em aparelho COMUM
```

```bash
# ── 5. ⚠ TROCA DE SENHA ────────────────────────────────────
#    (⚠ o endpoint nao existe no servidor do lab — adicione)
cat >> ../m01/api/servidor.py <<'EOF'

@app.post("/trocar-senha")
def trocar_senha():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    # ⚠ DEFEITO: nao invalida as outras sessoes
    return jsonify({"ok": True})
EOF
# ⚠ reinicie o servidor e teste os DOIS tokens
```

```bash
# ── 6. O RELATORIO ─────────────────────────────────────────
cat > sessao.md <<'EOF'
# Sessao — <app>
| Aspecto | Resultado observado | ⚠ Veredito |
|---------|---------------------|------------|
| Onde o token vive | | |
| Protecao (ThisDeviceOnly/classe) | | |
| Logout invalida no servidor? | | |
| Expiracao e' validada onde? | | |
| Troca de senha derruba sessoes? | | |
| Identidade vem do token? | | |
## ⚠ CAMINHO de cada achado
## ⚠ O que o atacante precisa ter (pre-requisito)
EOF
```

**O que observar:** no passo 1, o **`200` depois do logout** — ⚠ é o achado, e ele vale em **qualquer** app, sem `root` e sem instrumentar. ⚠ E no passo 2, o `200` no pedido da ana — ⚠ **o servidor confia no app**, e é a mesma classe do módulo 4 do curso de Web Apps.

**Exercício 1:** complete o `sessao.md` com o resultado **observado** de cada linha. ⚠ A coluna `veredito` precisa dizer o que o achado **é** — não "ok" ou "falha".

**Exercício 2:** corrija **um** dos defeitos no `servidor.py` — o logout que não invalida, ou a posse no `/pedido`. ⚠ Rode os **dois** lados do teste: o indevido falha, e o **legítimo continua funcionando**.

**Exercício 3 (o que vale):** implemente o **timestamp de senha** no servidor (módulo 3 do curso de Web Apps): ⚠ o servidor guarda quando a senha mudou e **rejeita sessão anterior**. Prove que o token antigo **deixa de valer** — e escreva o **teste de regressão**.

---

## Resumo

- ⚠ **No mobile, o app escolhe onde guardar o token** — e o app é do usuário.
- ⚠ **A sessão vive em quatro lugares**, e `.plist`/`SharedPreferences` em claro é o achado mais comum.
- ⚠ **`ThisDeviceOnly` (iOS) e `EncryptedSharedPreferences` (Android) qualificam o achado.**
- ⚠ **O teste do logout é binário e leva dois comandos** — e o `200` é o achado.
- ⚠ **Logout que só limpa o app não invalida nada** no servidor.
- ⚠ **Expiração validada só no app** significa que estender a data no aparelho **prolonga a sessão**.
- ⚠ **Troca de senha sem invalidar sessão não expulsa o invasor** — o **timestamp de senha** resolve.
- ⚠ **A identidade precisa vir do TOKEN** — não do que o app manda. É a distinção *dado vs. identidade*.
- ⚠ **MFA validado no APP é decorativo** — a validação tem de estar no servidor.

---

## O que o próximo módulo entrega

Você sabe onde a sessão vive. O módulo 3 abre **o armazenamento**: o que o app guarda, o que ele **não deveria**, e quem consegue ler.
