# Módulo 2 — `IPA`, `Mach-O` e `Info.plist`

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 2 de 11 · 3 horas
**Pré-requisitos:** Módulo 1
**Próximo:** Módulo 3 — Objective-C, Swift e o runtime

---

## O que este módulo entrega

Ao final, você vai saber **abrir um `IPA`**, entender **o que há em cada parte**, e **ler o `Mach-O` e o `Info.plist`** a ponto de prever o comportamento do app antes de executá-lo. É o módulo que substitui "instalei e testei" por "li e sei o que ele vai fazer" — e que ensina o formato de binário que **não é** `ELF` nem `PE`.

---

## 2.1 O `IPA`, parte por parte

⚠ **Um `IPA` é um ZIP — e a estrutura é previsível:**

```
   app.ipa (ZIP)
   ├── Payload/
   │     └── MeuApp.app/
   │           ├── MeuApp               ⚠ ⚠ O BINARIO — Mach-O
   │           ├── Info.plist           ⚠ AS "INTENCOES" do app
   │           ├── ⚠ Embedded.mobileprovision   o PERFIL de provisionamento
   │           ├── Assets.car           recursos compilados
   │           ├── *.lproj/             idiomas
   │           ├── ⚠ Frameworks/        dylibs PROPRias do app
   │           │     └── LibX.framework/LibX
   │           ├── PlugIns/             extensoes
   │           └── _CodeSignature/      ⚠ assinatura (v1, recursos)
   └── ⚠ SwiftSupport/                  (em apps com Swift, versao antiga)
```

⚠ **Três partes definem a análise, e cada uma tem um módulo:**

| Parte | ⚠ O que ela é | Módulo |
|---|---|---|
| **`Info.plist`** | ⚠ **A intenção declarada** | 2 |
| **O binário `Mach-O`** | ⚠ **O código** | 3 e 6 |
| ⚠ **`Embedded.mobileprovision`** | ⚠ ⚠ **O PERFIL — e os `entitlements`** | 4 |

⚠ **A terceira é a que não existe no Android, e é a que mais rende:** ⚠ o perfil de provisionamento é um **arquivo assinado pela Apple** que diz **quais `entitlements` aquele app pode ter**. ⚠ Ele é **legível** — e é o primeiro lugar onde se vê **o privilégio declarado**.

⚠ **E o `Frameworks/` merece atenção própria:** ⚠ uma `dylib` dentro do app é **código**, e é **assinada junto** com o app. ⚠ Se ela não estiver na lista de assinatura, **o app não roda** — e é por isso que a verificação do módulo 9 olha essa pasta.

```bash
# O que ha dentro, sem extrair
unzip -l app.ipa | head -30
unzip -l app.ipa | grep -E 'Frameworks/|\.dylib$'
# ⚠ ha codigo proprio? quantas bibliotecas?
```

---

## 2.2 `Mach-O`: o formato que não é `ELF`

⚠ **O contraste que evita confusão, e vale escrever de início:**

| | `ELF` (Linux/Android) | `PE` (Windows) | ⚠ **`Mach-O`** (iOS/macOS) |
|---|---|---|---|
| Cabeçalho | `Elf64_Ehdr` | DOS + NT | ⚠ **`mach_header_64`** |
| Símbolos | `.symtab` / `.dynsym` | Export/Import | ⚠ **`LC_SYMTAB`**, `__LINKEDIT` |
| Bibliotecas | `.dynamic` | Import table | ⚠ **`LC_LOAD_DYLIB`** |
| ⚠ **Multi-arquitetura** | Não | Não | ⚠ ⚠ **SIM — fat binary** |
| Comandos | program headers | data directories | ⚠ **`load commands`** |

⚠ **A quarta linha é a específica do ecossistema Apple, e é a que surpreende:** ⚠ um único arquivo pode conter **várias arquiteturas** — `arm64` para aparelho, `x86_64` para simulador. ⚠ Isso significa que **o binário do simulador não é o do aparelho** — e é a raiz de todo o módulo 10.

```
   FAT BINARY (universal)
   ┌──────────────────────────────────────────┐
   │  FAT HEADER  (⚠ quantas fatias?)         │
   ├──────────────────────────────────────────┤
   │  ⚠ fatia 1: arm64     <- o APARELHO       │
   │  ⚠ fatia 2: x86_64    <- o SIMULADOR      │
   │  (cada fatia e' um Mach-O COMPLETO)      │
   └──────────────────────────────────────────┘
```

⚠ **E o que decorre disso para a análise:** ⚠ quando você abre o binário do simulador, está lendo **outra arquitetura**, com **outro conjunto de instruções** e **outros endereços**. ⚠ Um achado encontrado lá **precisa ser reconfirmado** no aparelho.

⚠ **Os `load commands` são o equivalente dos cabeçalhos que você conhece:**

| Comando | ⚠ O que ele diz |
|---|---|
| **`LC_SEGMENT_64`** | ⚠ Uma seção — `__TEXT`, `__DATA`, `__LINKEDIT` |
| ⚠ **`LC_LOAD_DYLIB`** | ⚠ ⚠ **Que bibliotecas o binário usa** |
| **`LC_SYMTAB`** | Onde os símbolos estão |
| ⚠ **`LC_CODE_SIGNATURE`** | ⚠ Onde a assinatura está — módulo 4 |
| ⚠ **`LC_ENCRYPTION_INFO`** | ⚠ ⚠ **O app está CIFRADO?** |
| `LC_UUID` | Identificador único do binário |
| ⚠ **`LC_MAIN`** | ⚠ **O ponto de entrada** |

⚠ **A quinta linha é a mais importante deste curso, e a mais específica do iOS:** ⚠ apps baixados da loja vêm **cifrados** — o `__TEXT` só é decifrado **em execução**, pelo kernel, no aparelho. ⚠ Isso significa que **a análise estática de um app da loja não funciona sem decifrá-lo primeiro** — e é a razão de existir o *decryption* no módulo 9.

```bash
# ⚠ Os comandos de carga — o mapa do binário
otool -l MeuApp | grep -A4 'LC_ENCRYPTION_INFO' | head
#    ⚠ cryptid = 1 -> CIFRADO (app da loja)
#    ⚠ cryptid = 0 -> decifrado (app proprio, ou decifrado)

otool -hv MeuApp
#    ⚠ MH_PIE = posicao aleatoria; MH_TWOLEVEL; etc.

otool -l MeuApp | grep -E 'segname|filesize|vmsize' | head -20
#    ⚠ as secoes do binario
```

⚠ **A primeira consulta é a que decide o que você pode fazer:** ⚠ `cryptid = 1` significa que **o binário no disco está cifrado**, e que a análise estática vai encontrar **dados ilegíveis** no `__TEXT`. ⚠ Não é ofuscação do autor — é proteção **da Apple**, e é o que o módulo 9 resolve.

---

## 2.3 As seções, e onde o código mora

⚠ **As três seções que importam, na ordem em que você as lê:**

| Seção | ⚠ O que contém | Onde olhar |
|---|---|---|
| **`__TEXT`** | ⚠ ⚠ **O CÓDIGO** e o `__cstring` | `otool -tV` (desmontagem) |
| **`__DATA`** | ⚠ Variáveis globais **inicializadas** | `otool -s __DATA` |
| ⚠ **`__DATA_CONST`** | ⚠ Ponteiros protegidos — **inclui `objc`** | Módulo 3 |
| **`__LINKEDIT`** | ⚠ Símbolos, assinatura | `nm`, `codesign` |
| **`__objc_*`** | ⚠ ⚠ **Metadados de Objective-C** | Módulo 3 |

⚠ **A quinta linha é a que faz o iOS ser diferente na análise:** ⚠ metadados de classe e método **continuam no binário**, mesmo compilado. ⚠ Isso significa que você **encontra os nomes de classe e de método** — e é o que torna a análise de app Objective-C **relativamente direta**.

⚠ **E a terceira é a que existe para proteger:** ⚠ `__DATA_CONST` guarda ponteiros que são **verificados em runtime** — inclusive de `objc`. ⚠ Alterá-los no disco **quebra a assinatura** e o app **não roda** (módulo 4).

```bash
# ⚠ As classes e metodos, mesmo sem decifrar — quando ha metadados
otool -oV MeuApp 2>/dev/null | head -40
#    ⚠ "-o" imprime o conteudo dos segmentos objc

nm -a MeuApp 2>/dev/null | grep -iE 'objc_|swift' | head -20
#    ⚠ simbolos de classe

# ⚠ E as strings — sempre legiveis, se nao cifradas
strings -n 6 MeuApp | grep -iE 'http|key|token|senha|api|secret' | head -20
```

⚠ **A segunda consulta é a que revela Swift:** ⚠ símbolos com prefixo `$s` ou `_$s` são **Swift mangled** — e o módulo 3 ensina a lê-los.

---

## 2.4 `Info.plist`: a intenção declarada

⚠ **O documento mais importante da análise estática. Tudo que o app declara está aqui:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC ...>
<plist version="1.0">
<dict>
    <!-- ⚠ Identidade -->
    <key>CFBundleIdentifier</key>       <string>com.exemplo.app</string>
    <key>CFBundleVersion</key>          <string>1.2.3</string>
    <key>CFBundleShortVersionString</key> <string>1.2</string>
    <key>MinimumOSVersion</key>         <string>15.0</string>

    <!-- ⚠⚠ SUPERFICIE DE ENTRADA — URL schemes -->
    <key>CFBundleURLTypes</key>
    <array>
      <dict>
        <key>CFBundleURLSchemes</key>
        <array><string>meuapp</string></array>
        <!-- ⚠ Qualquer app pode abrir "meuapp://..." -->
      </dict>
    </array>

    <!-- ⚠⚠ BUSCA E COMPARTILHAMENTO -->
    <key>NSUserActivityTypes</key>
    <array><string>com.exemplo.app.ver</string></array>

    <!-- ⚠ PERMISSOES — com TEXTO que o usuario ve -->
    <key>NSCameraUsageDescription</key>
    <string>Precisamos da camera para ler codigos.</string>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>Para mostrar lojas proximas.</string>
    <key>NSFaceIDUsageDescription</key>
    <string>Para entrar com seguranca.</string>

    <!-- ⚠⚠ TRANSPORTE — a politica de TLS -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <!-- ⚠ permite HTTP em claro — achado -->
        <key>NSAllowsArbitraryLoads</key><true/>
        <!-- ⚠ excecoes por dominio -->
        <key>NSExceptionDomains</key>
        <dict>
            <key>interno.exemplo.com</key>
            <dict><key>NSExceptionAllowsInsecureHTTPLoads</key><true/></dict>
        </dict>
    </dict>

    <!-- ⚠ FILE SHARING — o dado sai pelo iTunes/Finder? -->
    <key>UIFileSharingEnabled</key>        <true/>
    <key>LSSupportsOpeningDocumentsInPlace</key> <true/>

    <!-- ⚠ BACKUP -->
    <key>NSURLIsExcludedFromBackupKey</key> <false/>

    <!-- ⚠ URL schemes que o app PODE ABRIR (LSApplicationQueriesSchemes) -->
    <key>LSApplicationQueriesSchemes</key>
    <array><string>whatsapp</string><string>tel</string></array>

    <!-- ⚠ App Groups — compartilhamento com outros apps -->
    <key>AppGroupIdentifier</key>  <!-- (⚠ na pratica, via entitlement) -->
</dict>
</plist>
```

⚠ **Cinco chaves decidem a análise, e vale destacá-las:**

| Chave | ⚠ O que decide |
|---|---|
| ⚠ **`CFBundleURLTypes`** | ⚠ ⚠ **Quem pode invocar o app por URL** — o módulo 5 |
| ⚠ **`NSAppTransportSecurity`** | ⚠ ⚠ **Se há HTTP em claro** — o Curso 3 aprofunda |
| **`UIFileSharingEnabled`** | ⚠ Se o dado sai por `Finder`/`iTunes` |
| **`NSUbiquitousContainers`** | ⚠ Sincronização com `iCloud` |
| ⚠ **`LSApplicationQueriesSchemes`** | ⚠ Quais apps o app tenta alcançar |

⚠ **A primeira é a superfície de entrada do iOS** — o equivalente de `exported` no Android: ⚠ um `URL scheme` registrado permite que **qualquer app** abra o seu, com parâmetro escolhido. ⚠ É o módulo 5, e é o análogo do módulo 3 do curso de Android.

⚠ **E a segunda é a que o Curso 3 investiga a fundo:** ⚠ `NSAllowsArbitraryLoads` ligado significa **HTTP em claro permitido** — e é achado direto, sem executar nada.

---

## 2.5 Ler o `IPA` como um mapa

⚠ **O método, em cinco passos, e ele **não executa o app**:**

```
   1. EXTRAIA     ->  unzip do IPA
   2. INVENTARIE  ->  ⚠ o Info.plist: URL schemes, ATS, sharing
   3. LEIA O PERFIL -> ⚠ Embedded.mobileprovision (modulo 4)
   4. CLASSIFIQUE ->  ⚠ o binario: arquitetura, cryptid, PIE
   5. PREVEJA     ->  ⚠ o que da' para alcancar, e por onde
```

⚠ **O passo 3 é o que quase ninguém faz, e é o que rende mais neste curso:** ⚠ o perfil de provisionamento diz **quais `entitlements` a Apple concedeu àquele app**. ⚠ É o **privilégio declarado**, e é o módulo 4.

⚠ **E o passo 4 tem duas perguntas cujo resultado muda tudo:**

| Pergunta | ⚠ Consequência |
|---|---|
| **`cryptid` = 1?** | ⚠ Binário cifrado — a estática precisa de decryption |
| **Fat binary?** | ⚠ Qual fatia é a do aparelho |
| **`PIE`?** | Posição aleatória em runtime |
| ⚠ **Swift?** | ⚠ Metadados de outro runtime — módulo 3 |

```bash
# O inventario minimo do IPA
unzip -o app.ipa -d ipa/ >/dev/null
APP=$(find ipa/Payload -maxdepth 1 -name '*.app')
BIN=$(find "$APP" -maxdepth 1 -type f -perm +111 | head -1)

plutil -p "$APP/Info.plist" | head -60          # ⚠ plist legivel
file "$BIN"; otool -hv "$BIN" | head -3         # ⚠ arquitetura e flags
otool -l "$BIN" | grep -A3 LC_ENCRYPTION_INFO   # ⚠ cifrado?
codesign -d --entitlements - "$APP" 2>&1 | head -20   # ⚠ os direitos
```

⚠ **A primeira consulta é o começo de toda análise de app iOS.** ⚠ Ela produz, em uma tela, **o mapa**: o que o app declara, o que o binário é, e **com que privilégio ele foi assinado**.

---

## Laboratório 2 — Abrir o pacote

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Este lab é inteiramente estático — nenhum app é executado.**

```bash
mkdir -p ~/ios-lab/m02 && cd ~/ios-lab/m02

# ── 0. O alvo ──────────────────────────────────────────────
#    ⚠ compile o app de laboratorio no Xcode (o curso traz o esqueleto),
#      ou use o IPA do SEU proprio projeto.
cp ~/ios-lab/alvo/MeuApp.ipa .
ls -la MeuApp.ipa
```

```bash
# ── 1. O ZIP, por dentro ───────────────────────────────────
unzip -l MeuApp.ipa | head -30
echo "── bibliotecas proprias:"
unzip -l MeuApp.ipa | grep -E 'Frameworks/|\.dylib$'
echo "── extensoes:"
unzip -l MeuApp.ipa | grep 'PlugIns/'

unzip -o MeuApp.ipa -d ipa/ >/dev/null
APP=$(find ipa/Payload -maxdepth 1 -name '*.app' | head -1)
BIN=$(find "$APP" -maxdepth 1 -type f -perm +111 | head -1)
echo "app: $APP"; echo "binario: $BIN"
```

```bash
# ── 2. ⚠ O Info.plist — a intencao declarada ───────────────
plutil -p "$APP/Info.plist" | head -80

echo "══ URL schemes (⚠ superficie de entrada)"
plutil -extract CFBundleURLTypes xml1 -o - "$APP/Info.plist" 2>/dev/null

echo "══ ⚠ ATS — transporte"
plutil -extract NSAppTransportSecurity xml1 -o - "$APP/Info.plist" 2>/dev/null

echo "══ compartilhamento de arquivo"
plutil -extract UIFileSharingEnabled raw -o - "$APP/Info.plist" 2>/dev/null
```

```bash
# ── 3. ⚠ O PERFIL — o privilegio declarado (modulo 4) ──────
#    ⚠ o perfil esta EMBUTIDO no app
if [ -f "$APP/embedded.mobileprovision" ]; then
  #    ⚠ ele e' um CMS/PKCS#7 — extraia o XML interno
  security cms -D -i "$APP/embedded.mobileprovision" > prov.plist 2>/dev/null
  plutil -p prov.plist | head -40
  echo "══ entitlements concedidos:"
  plutil -extract Entitlements xml1 -o - prov.plist 2>/dev/null
else
  echo "sem perfil embutido (⚠ build de simulador?)"
fi
#    ⚠ E os entitlements da ASSINATURA (podem diferir):
codesign -d --entitlements - "$APP" 2>&1 | head -30
```

```bash
# ── 4. ⚠ O BINARIO — classificacao ─────────────────────────
file "$BIN"
otool -hv "$BIN"
echo "══ arquitetura(s)"
lipo -info "$BIN" 2>/dev/null || file "$BIN"

echo "══ ⚠ CIFRADO?"
otool -l "$BIN" | grep -A4 'LC_ENCRYPTION_INFO' | head

echo "══ ponto de entrada e UUID"
otool -l "$BIN" | grep -A4 -E 'LC_MAIN|LC_UUID' | head -20
```

```bash
# ── 5. STRINGS e SIMBOLOS ──────────────────────────────────
echo "══ strings relevantes"
strings -n 6 "$BIN" | grep -iE 'http|https|key|token|senha|api|secret|'\
'password|admin' | head -25

echo "══ classes e metodos objc"
otool -oV "$BIN" 2>/dev/null | grep -E 'name 0x' | head -20

echo "══ simbolos Swift"
nm -a "$BIN" 2>/dev/null | grep -E '_?\$s' | head -10
```

```bash
# ── 6. PREVEJA — antes de testar ───────────────────────────
cat > previsao.md <<'EOF'
# Previsao de superficie — <app>
## Alvo
- bundle id: · versao: · minOS:
## Entrada
| URL scheme | O que abre | ⚠ Parametros |
|-----------|-----------|--------------|
## Atributos de risco
| Chave | Valor | ⚠ Consequencia |
|-------|-------|----------------|
## Binario
- arquiteturas: · cryptid: · PIE: · Swift:
## ⚠ Entitlements que chamam atencao
EOF
```

**O que observar:** no passo 3, os **`entitlements`**. ⚠ Eles são o privilégio **assinado** — e, no iOS, é essa a superfície que o usuário **não vê**. ⚠ Um app que declara `keychain-access-groups` incomum, ou um entitlement de recurso que a interface não sugere, é **achado de alta gravidade**.

**Exercício 1:** complete o `previsao.md`, com os `entitlements` listados e **o que cada um concede**. ⚠ Para cada um, escreva também: **a interface do app sugere isso?**

**Exercício 2:** abra o binário e responda as quatro perguntas do passo 4. ⚠ Se `cryptid = 1`, escreva **o que a análise estática consegue e o que ela não consegue** nesse caso — e onde o curso resolve (módulo 9).

**Exercício 3 (o que vale):** escolha **um** `URL scheme` do `Info.plist` e escreva **o que ele abre** e **quais parâmetros** aceita — deduzido só do código (`grep` no binário pelo nome do scheme). ⚠ É a previsão que o módulo 5 vai confirmar.

---

## Resumo

- ⚠ **Um `IPA` é um ZIP** — `Payload/`, `Info.plist`, binário, `Frameworks/` e o **perfil embutido**.
- ⚠ **`Mach-O` não é `ELF` nem `PE`** — e a diferença que mais importa é o **fat binary**.
- ⚠ **O binário do simulador não é o do aparelho** — arquitetura diferente, endereços diferentes.
- ⚠ **`LC_ENCRYPTION_INFO` com `cryptid = 1`** significa **binário cifrado** — a estática precisa de decryption.
- ⚠ **`__objc_*` mantém os nomes** de classe e método — é o que torna a análise Objective-C direta.
- ⚠ **`CFBundleURLTypes` é a superfície de entrada** — o equivalente de `exported` no Android.
- ⚠ **`NSAppTransportSecurity` com `NSAllowsArbitraryLoads`** é HTTP em claro — achado direto.
- ⚠ **O `embedded.mobileprovision` é legível** — e é onde o **privilégio declarado** aparece primeiro.

---

## O que o próximo módulo entrega

Você sabe abrir o pacote. O módulo 3 abre **o runtime**: Objective-C, Swift e método swizzling — como o iOS resolve uma chamada, e por que isso torna a instrumentação possível.
