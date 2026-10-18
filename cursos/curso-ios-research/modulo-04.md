# Módulo 4 — `Code signing`, `entitlements` e Assinatura

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 4 de 11 · 4 horas
**Pré-requisitos:** Módulos 1 a 3
**Próximo:** Módulo 5 — `Sandbox`, `container` e `Keychain`

---

## O que este módulo entrega

Ao final, você vai entender **o mecanismo que decide o que um app iOS pode fazer** — e por que ele é **diferente de permissão**. Você vai saber **ler `entitlements`** como privilégio declarado, reconhecer o que a assinatura **garante e o que não garante**, e apontar onde o privilégio **excede** o que a interface sugere.

---

## 4.1 A cadeia de assinatura

⚠ **No iOS, a assinatura não é uma formalidade da loja — é o que permite o app rodar:**

```
   APPLE                          DESENVOLVEDOR / APP
   ─────                          ────────────────────

   ⚠ certificado de assinatura  <── emitido para o dev
        │
        ▼
   ⚠ PROVISIONING PROFILE        <── assinado pela Apple
        │   diz QUAIS entitlements
        │   aquele app PODE ter
        ▼
   ⚠ O BINARIO assinado          <── com os entitlements dentro
        │
        ▼
   ⚠ VERIFICACAO na instalacao e  a CADA execucao
     - a assinatura e' valida?
     - o perfil permite ESTE app?
     - ⚠ os entitlements batem?
```

⚠ **A frase que organiza o módulo:**

> **No iOS, privilégio não é pedido em runtime como no Android — é DECLARADO em um perfil
> assinado pela Apple, e embutido no binário.**

⚠ **As três verificações da figura são o que torna a assinatura **estrutural**:** ⚠ não basta assinar; ⚠ é preciso que **o perfil autorize aquele app**, e que os **`entitlements` declarados** estejam **contidos** no que o perfil concede. ⚠ Alterar qualquer um dos três faz o app **não rodar**.

⚠ **E a consequência para a análise, que é o ponto do módulo:** ⚠ como o privilégio está **no binário**, ele é **legível sem executar o app**. ⚠ Você vê **o que o app pode fazer** antes de rodá-lo — e o usuário, **não vê**.

---

## 4.2 `Entitlements`: o privilégio, em XML

⚠ **Um `entitlement` é um par chave/valor **assinado** — o que o app pode fazer:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC ...>
<plist version="1.0">
<dict>
    <!-- ⚠ IDENTIDADE -->
    <key>application-identifier</key>
    <string>TEAMID.com.exemplo.app</string>
    <key>com.apple.developer.team-identifier</key>
    <string>TEAMID</string>

    <!-- ⚠ ⚠ KEYCHAIN — QUAIS grupos o app alcanca -->
    <key>keychain-access-groups</key>
    <array>
        <string>TEAMID.com.exemplo.app</string>
        <!-- ⚠ cada item e' um grupo ALCANCAVEL -->
    </array>

    <!-- ⚠ ⚠ APP GROUP — compartilhamento com outros apps -->
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.com.exemplo.compartilhado</string>
    </array>

    <!-- ⚠ ⚠ iCloud -->
    <key>com.apple.developer.icloud-container-identifiers</key>
    <array><string>iCloud.com.exemplo.app</string></array>

    <!-- ⚠ ⚠ RECURSOS ESPECIAIS -->
    <key>com.apple.developer.networking.networkextension</key>
    <array><string>packet-tunnel-provider</string></array>

    <key>com.apple.developer.healthkit</key><true/>
    <key>com.apple.developer.homekit</key><true/>

    <!-- ⚠ ⚠ ALTA GRAVIDADE -->
    <key>com.apple.private.security.no-container</key><true/>
    <key>com.apple.private.skip-library-validation</key><true/>
    <key>get-task-allow</key><true/>          <!-- ⚠ DEPURACAO -->

    <!-- ⚠ ⚠ SE a assinatura vem de dev e nao da App Store -->
    <key>com.apple.developer.push-environment</key>
    <string>development</string>
</dict>
</plist>
```

⚠ **Cinco `entitlements` decidem a análise, e cada um tem uma consequência diferente:**

| Entitlement | ⚠ O que ele concede |
|---|---|
| ⚠ **`keychain-access-groups`** | ⚠ ⚠ **Quais grupos de `Keychain` o app lê** |
| ⚠ **`application-groups`** | ⚠ Compartilhamento com **outros apps** |
| ⚠ ⚠ **`no-container`** | ⚠ ⚠ **O app ignora o sandbox de container** |
| ⚠ ⚠ **`skip-library-validation`** | ⚠ ⚠ **Carrega dylib não assinada pela Apple** |
| ⚠ **`get-task-allow`** | ⚠ ⚠ **Permite depuração** — o módulo 8 |

⚠ **As duas do meio são as de maior gravidade, e elas merecem a explicação:**

⚠ **`no-container`** — o app **sai do `container`**: ele acessa caminhos **fora** do próprio sandbox. ⚠ É um privilégio concedido pela Apple **apenas a apps do sistema** — e encontrá-lo em app de terceiro **é achado crítico**.

⚠ **`skip-library-validation`** — o app pode **carregar código** sem a validação de biblioteca. ⚠ É o que permite **injetar `dylib`** em execução — e é assim que boa parte da instrumentação funciona (módulo 8). ⚠ Concedido a app de terceiro, é um **enorme** privilégio.

⚠ **E `get-task-allow`** é o que **liga a depuração**: ⚠ presente em build de desenvolvimento, **ausente em app de produção**. ⚠ Encontrá-lo em app distribuído é achado — porque permite `lldb` **sem `jailbreak`**.

---

## 4.3 Ler o perfil e os `entitlements`

⚠ **Três lugares onde o privilégio aparece, e eles podem **divergir**:**

```bash
# 1. O PERFIL EMBUTIDO — o que a Apple concedeu
security cms -D -i MeuApp.app/embedded.mobileprovision > prov.plist
plutil -extract Entitlements xml1 -o - prov.plist

# 2. A ASSINATURA — o que esta assinado no app
codesign -d --entitlements - MeuApp.app

# 3. O QUE ESTA EM USO — se o app roda com eles
codesign -dvvv MeuApp.app 2>&1 | head -20
#    ⚠ Authorities, TeamIdentifier, flags
```

⚠ **A comparação entre 1 e 2 é o primeiro teste do módulo:** ⚠ o perfil diz **o que pode**; a assinatura diz **o que foi pedido**. ⚠ Um app assinado com um entitlement **não contido** no perfil **não roda** — e, se roda, houve perfil mais permissivo.

⚠ **E as informações do `codesign -dvvv` contam o que a assinatura é:**

| Campo | ⚠ O que ele diz |
|---|---|
| **`Authority`** | ⚠ Quem assinou — Apple, dev, ou **não assinado** |
| **`TeamIdentifier`** | ⚠ Quem é o dono |
| ⚠ **`flags`** | ⚠ ⚠ **`linker-signed`**, `adhoc`, `restrict` |
| **`Identifier`** | O bundle id **no momento da assinatura** |
| ⚠ **`Timestamp`** | ⚠ Quando foi assinado |

⚠ **A terceira linha é a que mais engana:** ⚠ um binário `linker-signed` **não tem assinatura real** — é o que o linker produz quando não há identidade. ⚠ Ele **não roda** em aparelho comum, e **roda** em simulador. ⚠ É a assinatura do **simulador**, e é a diferença do módulo 10.

```bash
# ⚠ A CLASSIFICACAO da assinatura
codesign -dvvv MeuApp.app 2>&1 | grep -E 'Authority|TeamIdentifier|flags|Timestamp'

# ⚠ e o teste direto
codesign --verify --deep --strict -vvv MeuApp.app 2>&1 | tail -5
#    ⚠ "valid on disk" e "satisfies its Designated Requirement"
```

---

## 4.4 O que a assinatura garante, e o que não

⚠ **A tabela honesta, e ela é a mesma estrutura do curso de Windows Internals:**

| ✅ A assinatura garante | ⚠ Não garante |
|---|---|
| ⚠ **Que o app veio de fonte identificada** | ⚠ Que o **código** seja seguro |
| ⚠ **Que não foi modificado desde a assinatura** | ⚠ Que os `entitlements` sejam **adequados** |
| ⚠ ⚠ **Que os `entitlements` são os autorizados** | ⚠ ⚠ **Que a **interface** os revele** |
| Que o app está autorizado a **rodar** | ⚠ Que ele seja **bem escrito** |
| ⚠ **A identidade do `Team`** | ⚠ Que o time **audite** o próprio código |

⚠ **A terceira linha é a força do modelo, e a segunda é o buraco:** ⚠ o sistema **garante** que os entitlements são exatamente os que o perfil autorizou — ⚠ mas **nada garante** que aquele conjunto **faça sentido** para o app. ⚠ É o autor que **pede** o entitlement, e é a Apple que **concede**.

⚠ **E a última linha da coluna da direita é a que o curso explora:** ⚠ um app com `no-container` porque **alguém pediu** — para "resolver um problema" — é o mesmo padrão do `CAP_SYS_ADMIN` do curso de Linux Internals: ⚠ *privilégio concedido por conveniência*.

⚠ **A frase para o relatório:** ⚠ **um `entitlement` a mais é um achado**, mesmo que o app **não o use**. ⚠ Porque ele **amplia a superfície** se qualquer parte do app for comprometida.

---

## 4.5 Assinatura e superfície: o que muda

⚠ **A relação entre privilégio e análise, em quatro perguntas:**

```
   1. QUAIS entitlements o app tem?
        │  ⚠ cada um e' uma capacidade
        ▼
   2. ALGUM deles EXCEDE o que a interface sugere?
        │  ⚠ ⚠ o achado principal
        ▼
   3. ALGUM permite RODAR CODIGO?
        │  ⚠ get-task-allow, skip-library-validation
        ▼
   4. ALGUM permite SAIR do container?
        │  ⚠ ⚠ no-container
```

⚠ **A segunda pergunta é a que rende em auditoria real:** ⚠ um app de lista de tarefas que declara `keychain-access-groups` **além do próprio** está dizendo que **lê o `Keychain` de outro app**. ⚠ Não é hipótese — é **declaração assinada**.

⚠ **E a terceira é a que liga ao módulo 8:** ⚠ `get-task-allow` e `skip-library-validation` são o que **permite** a instrumentação **sem `jailbreak`**. ⚠ Um app de produção que os tenha é um app **instrumentável em aparelho comum** — e isso é achado de alta gravidade.

```bash
# ⚠ A CLASSIFICACAO dos entitlements, por gravidade
codesign -d --entitlements - "$APP" 2>&1 | tee _ent.xml

echo "══ permite rodar codigo?"
grep -E 'get-task-allow|skip-library-validation|dynamic-codesigning' _ent.xml

echo "══ sai do container?"
grep -E 'no-container|no-sandbox' _ent.xml

echo "══ alcanca Keychain de outros?"
grep -A4 'keychain-access-groups' _ent.xml

echo "══ compartilha com outros apps?"
grep -A4 'application-groups' _ent.xml
```

⚠ **As quatro consultas são a triagem do módulo** — e cada resultado é uma linha da tabela de gravidade que o relatório vai usar.

---

## 4.6 O que a assinatura impede, e o que ela não impede

⚠ **A delimitação, escrita com clareza:**

| A assinatura impede | ⚠ Não impede |
|---|---|
| Rodar app **sem assinatura válida** | ⚠ ⚠ **Observar um app que roda** |
| Rodar app com **entitlement não autorizado** | ⚠ **Instrumentar** (módulo 8) |
| ⚠ **Modificar o binário** | ⚠ ⚠ **Ler o binário** (módulo 6) |
| Rodar **dylib não assinada** | ⚠ Carregar dylib **com** o entitlement |
| Instalar app de fora da loja | ⚠ Instalar **com perfil de dev** |

⚠ **A segunda e a quarta linhas são a tese do curso, em uma tabela:** ⚠ a assinatura é **controle de execução**, não de **leitura**. ⚠ Ela decide **o que roda** — não o que se **observa**.

⚠ **E a quinta é a que o `jailbreak` contorna:** ⚠ no aparelho comprometido, a verificação de assinatura **pode ser desativada** — e aí o que sobra é o **`attestation`** (módulo 1): ⚠ quem recusa é o **servidor**.

⚠ **A conclusão, e ela é a mesma do módulo 10 do curso de Android:** ⚠ a assinatura **encarece** o ataque — e a **única** coisa que **impede** é a verificação **fora do app**.

---

## Laboratório 4 — Ler o privilégio

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Este lab é inteiramente estático.**

```bash
mkdir -p ~/ios-lab/m04 && cd ~/ios-lab/m04
cp -r ../m02/ipa ipa 2>/dev/null || unzip -o ../m02/MeuApp.ipa -d ipa >/dev/null
APP=$(find ipa/Payload -maxdepth 1 -name '*.app' | head -1)
BIN=$(find "$APP" -maxdepth 1 -type f -perm +111 | head -1)
```

```bash
# ── 1. ⚠ O PERFIL — o que a Apple concedeu ─────────────────
if [ -f "$APP/embedded.mobileprovision" ]; then
  security cms -D -i "$APP/embedded.mobileprovision" > prov.plist
  echo "══ nome e time"
  plutil -extract Name raw -o - prov.plist 2>/dev/null
  plutil -extract TeamIdentifier xml1 -o - prov.plist 2>/dev/null
  echo "══ validade"
  plutil -extract ExpirationDate raw -o - prov.plist 2>/dev/null
  echo "══ ⚠ ENTITLEMENTS CONCEDIDOS"
  plutil -extract Entitlements xml1 -o - prov.plist 2>/dev/null | head -40
  echo "══ dispositivos provisionados (⚠ dev/ad-hoc)"
  plutil -extract ProvisionedDevices raw -o - prov.plist 2>/dev/null | head -3
else
  echo "⚠ sem perfil — build de simulador? (modulo 10)"
fi
```

```bash
# ── 2. ⚠ A ASSINATURA — o que foi assinado ────────────────
echo "══ quem assinou"
codesign -dvvv "$APP" 2>&1 | grep -E 'Authority|TeamIdentifier|flags|Timestamp|Identifier'

echo "══ ⚠ ENTITLEMENTS NA ASSINATURA"
codesign -d --entitlements - "$APP" 2>&1 | tee _ent.txt | head -30

echo "══ validacao"
codesign --verify --deep --strict -vvv "$APP" 2>&1 | tail -4
```

```bash
# ── 3. ⚠ A DIVERGENCIA — perfil vs assinatura ─────────────
if [ -f prov.plist ]; then
  plutil -extract Entitlements xml1 -o perfil_ent.xml prov.plist 2>/dev/null
  echo "══ no PERFIL:"; grep -oE '<key>[^<]+</key>' perfil_ent.xml | head -20
  echo "══ na ASSINATURA:"; grep -oE '<key>[^<]+</key>' _ent.txt | head -20
  #    ⚠ alguma chave so' aparece em um dos dois?
fi
```

```bash
# ── 4. ⚠ CLASSIFICACAO POR GRAVIDADE ──────────────────────
echo "══ permite rodar codigo?"
grep -B1 -A1 -E 'get-task-allow|skip-library-validation|dynamic-codesigning' _ent.txt

echo "══ sai do container?"
grep -E 'no-container|no-sandbox' _ent.txt

echo "══ alcanca Keychain de outros?"
grep -A4 'keychain-access-groups' _ent.txt

echo "══ compartilha com outros apps?"
grep -A4 'application-groups' _ent.txt

echo "══ iCloud"
grep -A3 'icloud' _ent.txt | head
```

```bash
# ── 5. ⚠ O APP USA O QUE DECLARA? ────────────────────────
#    Cruze cada entitlement com o uso no binario
strings -n 5 "$BIN" | grep -iE 'keychain|SecItem|AppGroup|iCloud|'\
'NSUserDefaults.*suite|containerURL' | head -15
#    ⚠ um entitlement declarado e NAO usado no codigo e' achado
```

```bash
# ── 6. O RELATORIO ────────────────────────────────────────
cat > privilegio.md <<'EOF'
# Privilegios do app — <app>
## Assinatura
- Authority: · TeamIdentifier: · flags: · Timestamp:
## Entitlements
| Entitlement | ⚠ O que concede | ⚠ Usado no codigo? | Gravidade |
|-------------|-----------------|--------------------|-----------|
## ⚠ O que excede o que a interface sugere
## ⚠ O que permite rodar codigo ou sair do container
EOF
```

**O que observar:** no passo 4, cada linha é uma **capacidade assinada**. ⚠ E no passo 5, a comparação entre **declarado** e **usado**: ⚠ um `entitlement` que o código **nunca usa** é privilégio **latente** — ele existe, está assinado, e qualquer comprometimento do app **pode usá-lo**.

**Exercício 1:** complete o `privilegio.md` com **todos** os `entitlements`, classificados por gravidade. ⚠ A coluna "usado no código" precisa de evidência — o `grep` do passo 5.

**Exercício 2:** no passo 3, aponte **qualquer** divergência entre perfil e assinatura. ⚠ Se não houver, explique **o que** a ausência de divergência prova — e por que ela é esperada.

**Exercício 3 (o que vale):** escolha o entitlement de **maior gravidade** do seu app e escreva: **o que ele concede**, **o que o app faz com ele**, e **o que aconteceria se o app fosse comprometido**. ⚠ Depois compare com o `no-container` e o `CAP_SYS_ADMIN` do curso de Linux Internals — a mesma classe? Por quê?

---

## Resumo

- ⚠ **A assinatura não é formalidade: é o que permite o app rodar** — e ela verifica **três coisas**.
- ⚠ **`Entitlements` são privilégio DECLARADO e assinado** — e o **usuário não vê**.
- ⚠ **`keychain-access-groups` define quais `Keychain` o app alcança** — pode incluir **outro app**.
- ⚠ **`no-container`** faz o app **sair do sandbox** — privilégio de app do sistema.
- ⚠ **`skip-library-validation`** permite **carregar código** — a base da instrumentação.
- ⚠ **`get-task-allow`** habilita **depuração** — e é **ausente** em app de produção.
- ⚠ **O perfil e a assinatura podem divergir** — comparar os dois é o primeiro teste.
- ⚠ **`linker-signed` é assinatura de simulador** — não roda em aparelho comum.
- ⚠ **A assinatura é controle de EXECUÇÃO, não de leitura** — ela não impede observar nem instrumentar.
- ⚠ **Um `entitlement` a mais é achado**, mesmo não usado — é superfície latente.

---

## O que o próximo módulo entrega

Você sabe ler o privilégio. O módulo 5 abre **o dado**: `sandbox`, `container`, `Data Protection` e `Keychain` — onde o app guarda, e o que cada proteção garante.
