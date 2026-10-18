# Módulo 1 — Arquitetura iOS e Modelo de Segurança

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 1 de 11 · 3 horas
**Pré-requisitos:** Linux para Segurança · C para Pesquisa · Assembly e RE
**Próximo:** Módulo 2 — `IPA`, `Mach-O` e `Info.plist`

---

## O que este módulo entrega

Ao final, você vai saber **desenhar o iOS em camadas** e apontar **onde cada uma decide acesso** — e vai entender por que o modelo dele é **diferente do Android** a ponto de exigir reaprendizado. É o módulo que sustenta os dez seguintes.

---

## 1.1 As camadas, e o que cada uma decide

```
   ┌────────────────────────────────────────────────────────┐
   │  APLICATIVOS          seu app, os do sistema           │
   ├────────────────────────────────────────────────────────┤
   │  FRAMEWORKS           UIKit, Foundation, Security      │
   ├────────────────────────────────────────────────────────┤
   │  RUNTIME              objc, Swift, dyld                │
   │                       ⚠ o carregador e o runtime        │
   ├────────────────────────────────────────────────────────┤
   │  DARWIN (userland)    XNU: BSD + Mach                  │
   │                       ⚠ sandbox, container, Keychain    │
   ├────────────────────────────────────────────────────────┤
   │  KERNEL               XNU: processo, VM, sycall        │
   ├────────────────────────────────────────────────────────┤
   │  ⚠ SEP / Secure Enclave                                │
   │     chave, biometria, atestacao — FORA do kernel       │
   └────────────────────────────────────────────────────────┘
```

⚠ **A última linha é o que não existe no Android, e é o que muda a análise de proteção:** ⚠ o **Secure Enclave** é um processador separado, com o próprio sistema. ⚠ Uma chave que **mora lá** não é extraível **nem com `root` nem com o kernel comprometido** — e é por isso que o `Keychain` do iOS não é o `KeyStore` do Android.

⚠ **E a consequência para a análise:** ⚠ quando você encontra "chave protegida por `Secure Enclave`", o achado **não** é "a chave é extraível". ⚠ É **o que o app faz com ela** — e é a distinção do módulo 5.

---

## 1.2 O modelo: três pilares, e não um

⚠ **No Android, o `uid` decide quase tudo. No iOS, são três mecanismos independentes:**

| Pilar | ⚠ O que decide | Onde é aplicado |
|---|---|---|
| **`Code signing`** | ⚠ **Quem pode rodar, e com que privilégio** | Módulo 4 |
| **`Entitlements`** | ⚠ ⚠ **O que o app PODE FAZER** | Módulo 4 |
| **`Sandbox`** | ⚠ O que o app **alcança** | Módulo 5 |
| **`Data Protection`** | ⚠ A proteção **por arquivo**, ligada ao desbloqueio | Módulo 5 |
| **`Secure Enclave`** | ⚠ Chave que **não sai** | Módulo 5 |

⚠ **A frase que organiza o módulo:**

> **No iOS, privilégio não é uma identidade — é um conjunto DECLARADO de permissões.**

⚠ **A diferença estrutural em relação ao Android, e vale escrever:**

```
   ANDROID                          iOS
   ───────                          ───

   ⚠ uid decide o acesso            ⚠ entitlement declara o acesso
     a ARQUIVO                        a RECURSO
     (mecanismo do kernel)            (verificado pelo sistema)

   permissao = API protegida        entitlement = ⚠ CAPACIDADE
     pedida em runtime                assinada no BINARIO
     ⚠ o usuario aprova               ⚠ o usuario NAO ve

   ⚠ mesmo app, qualquer aparelho    ⚠ entitlement invalido
                                      = app nao roda
```

⚠ **A terceira linha é a que mais surpreende quem vem do Android:** ⚠ no Android, permissões **perigosas** são aprovadas pelo usuário, e ele **vê**. ⚠ No iOS, o `entitlement` é **assinado no binário** — o usuário **não tem como saber** que o app tem acesso além do que a interface mostra.

⚠ **E a última é a consequência prática:** ⚠ um app com `entitlement` que **ele não deveria ter** é o achado de maior gravidade deste curso — porque significa que o **perfil** concedeu algo a mais. ⚠ É o módulo 4.

---

## 1.3 O `container`: onde o app vive

⚠ **Cada app tem uma área própria, e ela **não** é protegida por `uid` como no Android:**

```
   /var/mobile/Containers/
   ├── Data/Application/<UUID>/           ⚠ os DADOS do app
   │      ├── Documents/                  ⚠ exposto ao usuario
   │      ├── Library/Preferences/*.plist ⚠ ⚠ configuracoes
   │      ├── Library/Caches/             cache
   │      ├── Library/Keychains/          referencias ao Keychain
   │      └── tmp/                        temporario
   │
   ├── Bundle/Application/<UUID>/         ⚠ O BINARIO
   │      └── MeuApp.app/                 (assinado, imutavel)
   │
   └── Shared/AppGroup/<UUID>/            ⚠ compartilhado entre apps do MESMO grupo
```

⚠ **A proteção do `container` é o `sandbox`, e ele é aplicado por **perfil** — não por `uid`:** ⚠ o perfil do app diz **quais operações ele pode fazer** — abrir arquivo em tal caminho, falar com tal serviço, usar tal recurso.

⚠ **Três coisas que a análise precisa saber, e cada uma é um achado:**

| Fato | ⚠ Consequência |
|---|---|
| `Documents/` exposto ao usuário | ⚠ O dado lá é **visível** — e saável por backup |
| ⚠ **`Library/Preferences/*.plist`** | ⚠ ⚠ **Configuração e, às vezes, credencial** |
| **`AppGroup` compartilhado** | ⚠ Dois apps leem o mesmo dado |
| ⚠ **`Data Protection` por arquivo** | ⚠ ⚠ **Nem todo arquivo é protegido igual** |

⚠ **A quarta é a que muda a conclusão:** ⚠ no iOS, a proteção de um arquivo é um **atributo dele** — e vai de "sempre acessível" a "só com a chave do aparelho desbloqueado". ⚠ Um arquivo com **classe fraca** é legível em **backup** e com aparelho **bloqueado**. ⚠ É o módulo 5, e é o análogo direto da coluna *"como li"* do curso de Android.

---

## 1.4 Backends: por que o "root" não resolve

⚠ **A pergunta que todo analista faz, e a resposta está em hardware:**

| Recurso | ⚠ O que ele protege |
|---|---|
| **`Secure Enclave` (`SEP`)** | ⚠ Chave que **nunca sai** do chip |
| **`Touch ID` / `Face ID`** | ⚠ Autenticação **no chip**, não no app |
| **`Passcode`** | ⚠ Alimenta a chave de `Data Protection` |
| ⚠ **`Attestation`** | ⚠ ⚠ Prova ao **servidor** que o app roda íntegro |
| **`PAYG` (`Pointer Authentication`)** | ⚠ ⚠ Endereço de retorno **assinado** |

⚠ **A quinta linha é a que muda o que é possível no runtime:** ⚠ no `arm64`, o iOS usa **`PAC`** — o endereço de retorno é **assinado por hardware**, e desviar o fluxo exige mais que sobrescrever um ponteiro. ⚠ É a razão de a exploração moderna em iOS não ser uma cópia do que se faz no Android.

⚠ **E a quarta é a que derruba a lógica de "só preciso do app":** ⚠ **`attestation`** permite que o **servidor** recuse um cliente que não prova integridade. ⚠ O app **não** impede a análise — o **servidor** é quem decide. ⚠ É a conclusão do módulo 10 do curso de Android, e aqui ela é **mais forte**, porque o mecanismo é **de hardware**.

---

## 1.5 O que "root" significa, e o que não significa

⚠ **A tabela honesta, e ela evitará conclusão errada em todo o curso:**

| "Acesso" | ⚠ O que se consegue | ⚠ O limite |
|---|---|---|
| **Mac + `IPA`** | ⚠ Análise **estática** completa | Nada de runtime |
| **Simulador** | App próprio, código do **host** | ⚠ Não é o binário do aparelho |
| ⚠ **Dispositivo + perfil** | ⚠ App **seu**, com `lldb`/`Frida` | ⚠ Só app depurável |
| ⚠ **`jailbreak`** | ⚠ ⚠ Instrumentação **ampla** | ⚠ `SEP` continua fora |
| **`jailbreak` + kernel** | Ainda mais | ⚠ ⚠ **`SEP` intocado** |
| **Rede** | ⚠ O que sai e entra | ⚠ Pinning (Curso 3) |

⚠ **A última linha da coluna do limite é a que **nunca** muda:** ⚠ **o `Secure Enclave` fica fora**, em qualquer cenário. ⚠ Uma chave que mora lá **não sai** — e a análise se limita a **observar o uso**.

⚠ **A frase para o relatório:** ⚠ *"obtive o dado com `jailbreak`"* e *"obtive o dado em aparelho comum"* são **achados de gravidade diferente**. ⚠ É a mesma coluna *"como li"* do curso de Android, e ela existe aqui desde o primeiro módulo.

---

## 1.6 Onde a confiança muda de lado

⚠ **A tabela que fecha a teoria, e que será usada nos dez seguintes:**

| Fronteira | ⚠ O que o app presume | Módulo |
|---|---|---|
| **App ↔ sistema** | "o `entitlement` me limita" | ⚠ 4 |
| **App ↔ `container`** | "ninguém lê meu dado" | ⚠ 5 |
| **App ↔ `Keychain`** | "a chave está protegida" | ⚠ 5 |
| **App ↔ app (mesmo grupo)** | "só o meu grupo alcança" | ⚠ 5 |
| **App ↔ servidor** | "a resposta é confiável" | Curso 3 |
| ⚠ **Análise ↔ proteção** | "não dá para me instrumentar" | ⚠ 9 |
| ⚠ **Simulador ↔ dispositivo** | ⚠ "aqui é igual" | ⚠ ⚠ 10 |

⚠ **A última linha é específica deste curso, e é a razão de o módulo 10 existir:** ⚠ o simulador **falseia** o ambiente — e um analista que não sabe **o que** ele falseia produz achado que **não vale no aparelho**.

---

## Laboratório 1 — Ler o modelo

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

**Objetivo:** observar o modelo **no Mac e no simulador** — `entitlement`, `container`, `Data Protection` — sem escrever código.

```bash
mkdir -p ~/ios-lab/m01 && cd ~/ios-lab/m01

# ── 1. As ferramentas, e suas versoes ──────────────────────
xcodebuild -version
xcrun --sdk iphoneos --show-sdk-version
which otool nm lldb codesign
jtool2 --version 2>/dev/null || echo "(jtool2 opcional)"

# ── 2. ⚠ UM APP DO SISTEMA — entitlement e sandbox ─────────
#    ⚠ no simulador, os apps do sistema estao no runtime do Xcode
SIM_APPS="/Library/Developer/CoreSimulator/Volumes"
APP=$(find "$SIM_APPS" -maxdepth 6 -name '*.app' 2>/dev/null | head -1)
echo "app: $APP"

#    ⚠ a assinatura e os direitos
codesign -dv --entitlements - "$APP" 2>&1 | head -30
#    ⚠ TODO entitlement listado e' uma CAPACIDADE concedida
```

```bash
# ── 3. O BINARIO E O SANDBOX ───────────────────────────────
BIN=$(find "$APP" -maxdepth 1 -type f -perm +111 2>/dev/null | head -1)
echo "binario: $BIN"
file "$BIN"                     # ⚠ Mach-O 64-bit, arm64?
otool -L "$BIN" | head -20      # ⚠ as bibliotecas que ele liga
otool -hv "$BIN" | head         # ⚠ o header e os FLAGS (⚠ PIE?)

# ⚠ e as strings que revelam caminho de container
strings -n 6 "$BIN" | grep -E '/var/mobile|Containers|Library/' | head
```

```bash
# ── 4. O CONTAINER, no simulador ───────────────────────────
#    ⚠ no simulador, os dados ficam sob o device simulado
find ~/Library/Developer/CoreSimulator/Devices -maxdepth 6 \
     -type d -name 'Containers' 2>/dev/null | head
#    ⚠ liste a estrutura de um container de app
DATA=$(find ~/Library/Developer/CoreSimulator/Devices -maxdepth 9 \
       -type d -path '*Data/Application*' 2>/dev/null | head -1)
echo "container: $DATA"
ls -la "$DATA" 2>/dev/null | head

# ⚠ e o .plist de preferencias, se houver
find "$DATA" -name '*.plist' 2>/dev/null | head -5
```

```bash
# ── 5. ⚠ DATA PROTECTION — a classe por arquivo ────────────
#    ⚠ no simulador, o atributo aparece como extended attribute
xattr -l "$DATA/Documents" 2>/dev/null | head
#    ⚠ no APARELHO (nivel B), o comando e' este:
#    ⚠ device: `mdls` ou o `NSFileProtectionKey` via codigo
#    ⚠ anote a diferenca: o simulador NAO implementa as classes reais
```

```bash
# ── 6. ⚠ O QUE O SIMULADOR NAO TEM ─────────────────────────
echo "══ arquitetura do host"
uname -m
echo "══ arquitetura do aparelho (se houver device conectado)"
xcrun devicectl list devices 2>/dev/null | head

echo "══ o SEP existe no simulador?"
#    ⚠ NAO. Nenhum Keychain real, nenhuma chave de hardware.
#    ⚠ anote isso: todo achado de Keychain so' vale no aparelho.
```

**O que observar:** no passo 3, os **flags do header** — `PIE` indica posição aleatória. ⚠ E no passo 6, a confirmação do **limite do simulador**: ⚠ ele não tem `SEP`, não tem `Keychain` real e **não roda o `arm64` do aparelho**. ⚠ Toda conclusão sobre `Keychain` fica **pendente do Nível B**.

**Exercício 1:** monte a **tabela do 1.2** para o app do sistema que você abriu: para cada `entitlement` listado, escreva **o que ele concede** e **se a interface do app sugere isso**. ⚠ A diferença entre os dois é o achado que o módulo 4 formaliza.

**Exercício 2:** liste a estrutura do `container` do passo 4 e classifique cada pasta pelo **que ela expõe**: `Documents` (usuário), `Library/Preferences` (**configuração**), `Caches`, `tmp`. ⚠ Escreva, para cada uma, **quem consegue ler** — no simulador e no aparelho.

**Exercício 3 (o que vale):** escreva, em uma página, a **tabela do 1.5** para o seu ambiente: o que você **consegue** hoje (Mac? simulador? dispositivo?) e o que **fica fora**. ⚠ Marque explicitamente o que **só o Nível B** responde. É o mapa de limitações que todo relatório do curso vai repetir.

---

## Resumo

- ⚠ **iOS é fechado, não opaco** — o `IPA` é legível e o app é observável.
- ⚠ **Três pilares independentes:** `code signing`, **`entitlements`** e `sandbox` — mais `Data Protection` e o `SEP`.
- ⚠ **No iOS, privilégio é um conjunto DECLARADO** de permissões, assinado no binário — ⚠ **o usuário não vê**.
- ⚠ **O `container` não é protegido por `uid`** — é o `sandbox` por **perfil**, e a proteção **por arquivo** é a `Data Protection`.
- ⚠ **`Secure Enclave` fica fora até com kernel comprometido** — a análise se limita a observar o **uso**.
- ⚠ **`PAC` (`arm64`)** faz o endereço de retorno ser assinado — exploração em iOS não copia o Android.
- ⚠ **`Attestation` derruba a lógica de "só preciso do app"** — quem recusa é o **servidor**.
- ⚠ **Dois níveis de laboratório**, e o simulador **falseia** o ambiente — o módulo 10 é sobre isso.

---

## O que o próximo módulo entrega

Você entende o modelo. O módulo 2 abre **o pacote**: `IPA`, `Mach-O` e `Info.plist` — e ensina a prever o comportamento do app **antes de ele rodar**.
