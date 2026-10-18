# Referências — iOS Security Research: Internals e Engenharia Reversa

**Documentação oficial, especificações e material aberto que sustentam o curso**

---

## Como este arquivo funciona

⚠ **Todas as referências são públicas e abertas** — documentação oficial da Apple, especificação de formato, e material publicado por pesquisadores.

⚠ **O curso é material original:** nenhum trecho de obra comercial foi reproduzido. As referências servem para **aprofundamento** e **verificação** — e cada módulo indica quais usar.

⚠ **Nota sobre estabilidade:** iOS muda a cada versão, e algumas referências descrevem **comportamento por versão**. ⚠ Onde o curso afirma algo que depende de versão, ele diz qual — e a referência serve para conferir a **versão alvo**.

⚠ **Nota sobre o laboratório:** nenhuma referência deste arquivo aponta para aplicativo de terceiro como alvo. ⚠ O alvo do curso é o app **escrito pelo aluno**.

---

## Módulo 1 — Arquitetura e modelo de segurança

| Referência | O que ela cobre |
|---|---|
| **Apple Platform Security** (support.apple.com/guide/security) | ⚠ O documento central: `SEP`, `Data Protection`, `Keychain`, `attestation` |
| **iOS Security Guide** (Apple) | O modelo em camadas e o `sandbox` |
| **Secure Enclave** (Apple Platform Security, capítulo próprio) | ⚠ Por que a chave **não sai** |
| **App Attest** (developer.apple.com/documentation/devicecheck) | ⚠ A verificação **fora do app** |
| **Pointer Authentication** (Apple, `arm64e`) | ⚠ Por que a exploração em iOS é diferente |

⚠ **O que conferir:** o capítulo do `Secure Enclave` — ⚠ é o que sustenta a afirmação de que `root` **não o alcança**.

---

## Módulo 2 — `IPA`, `Mach-O` e `Info.plist`

| Referência | O que ela cobre |
|---|---|
| **Mach-O Programming Topics** (Apple, arquivado) | ⚠ `load commands`, segmentos, seções |
| **`otool` / `nm` / `lipo`** (man pages) | Ferramentas de análise |
| **Bundle Resources** (developer.apple.com/documentation/bundleresources) | ⚠ Todas as chaves do `Info.plist` |
| **`NSAppTransportSecurity`** (Apple) | ⚠ A política de TLS e `NSAllowsArbitraryLoads` |
| **`ipsw`** (github.com/blacktop/ipsw) | Análise de firmware e binário |
| **`jtool2`** (newosxbook.com) | Análise complementar de `Mach-O` |

⚠ **O que conferir:** a documentação de `NSAppTransportSecurity` — ⚠ é ela que define o que `NSAllowsArbitraryLoads` **realmente** permite.

---

## Módulo 3 — Objective-C, Swift e o runtime

| Referência | O que ela cobre |
|---|---|
| **Objective-C Runtime Programming Guide** (Apple) | ⚠ Mensagem, seletor, `class_getInstanceMethod` |
| **`objc_msgSend`** (Apple, referência) | ⚠ A indireção que sustenta a instrumentação |
| **Swift ABI / Mangling** (github.com/apple/swift) | ⚠ A estrutura do nome mangled |
| **`swift demangle`** (Xcode toolchain) | ⚠ A reversão do nome |
| **`@objc` e interoperabilidade** (Swift docs) | ⚠ Por que a superfície de entrada é `@objc` |
| **Frida — Objective-C API** (frida.re/docs/javascript-api) | `ObjC.classes`, `Interceptor` |

⚠ **O que conferir:** a estrutura do mangling — ⚠ `$s` + módulo + classe + método + tipos é a chave para ler qualquer símbolo Swift.

---

## Módulo 4 — `Code signing` e `entitlements`

| Referência | O que ela cobre |
|---|---|
| **Code Signing Guide** (Apple, arquivado) | ⚠ As três verificações da assinatura |
| **Entitlements** (developer.apple.com/documentation/bundleresources/entitlements) | ⚠ **A lista oficial**, por recurso |
| **TN3125 — Inside Code Signing: Provisioning Profiles** (Apple) | ⚠ O perfil e a relação com os `entitlements` |
| **TN3126 — Inside Code Signing: Hashes** (Apple) | O que a assinatura cobre |
| **`codesign` / `security cms`** (man pages) | ⚠ Os comandos que o curso usa |
| **`ProcInfo` / `jtool2 --ent`** | Leitura de entitlements |

⚠ **O que conferir:** a **lista oficial de entitlements** — ⚠ é ela que define o que `no-container` e `skip-library-validation` concedem, e por que são raros.

---

## Módulo 5 — `Sandbox`, `container` e `Keychain`

| Referência | O que ela cobre |
|---|---|
| **File System Programming Guide** (Apple) | ⚠ A estrutura do container |
| **`NSFileProtectionKey`** (Foundation docs) | ⚠ As classes de `Data Protection` |
| **Keychain Services** (developer.apple.com/documentation/security/keychain-services) | ⚠ Item, `access-group`, acessibilidade |
| **`kSecAttrAccessible`** (Security framework) | ⚠ ⚠ As classes, e o que cada uma garante |
| **`kSecAttrAccessible...ThisDeviceOnly`** | ⚠ O que decide sobre backup |
| **App Extension / App Group** (Apple) | ⚠ O compartilhamento por entitlement |
| **Custom URL Schemes** (developer.apple.com) | ⚠ A superfície de entrada e `LSApplicationQueriesSchemes` |

⚠ **O que conferir:** a tabela de `kSecAttrAccessible` — ⚠ é ela que sustenta a distinção entre "vai para o backup" e "não vai".

---

## Módulo 6 — Análise estática

| Referência | O que ela cobre |
|---|---|
| **Mach-O Reference** (Apple) | ⚠ `LC_ENCRYPTION_INFO`, `LC_MAIN`, `LC_UUID` |
| **`otool`** (man page) | `-l`, `-hv`, `-tV`, `-oV` |
| **`nm`** (man page) | Símbolos — definidos, indefinidos, `objc` |
| **Ghidra** (ghidra-sre.org) | ⚠ Decompilação de `Mach-O` |
| **Hopper** (hopperapp.com) | Decompilação — alternativa |
| **`ipsw`** — comandos `macho` e `symbols` | Extração e análise |

⚠ **O que conferir:** a descrição de `LC_ENCRYPTION_INFO` — ⚠ é ela que explica por que app da loja não se analisa sem decifrar.

---

## Módulo 7 — Análise dinâmica

| Referência | O que ela cobre |
|---|---|
| **`os_log` / Logger** (developer.apple.com) | ⚠ Por que o log não aparece por padrão, e como marcar dado privado |
| **`simctl`** (Apple, `xcrun simctl`) | ⚠ `openurl`, `spawn`, `get_app_container` |
| **`devicectl`** (Xcode) | ⚠ Instalação e execução no dispositivo |
| **`log`** (`man log`) | ⚠ `log stream`, `log show`, predicados |
| **Console / Instruments** (Apple) | Observação de processo |
| **`fs_usage`, `nettop`, `lsof`** (man pages) | ⚠ O que substitui o `/proc` sem `dtrace` |

⚠ **O que conferir:** a documentação de `os_log` — ⚠ é ela que explica a diferença entre "o app não loga" e "o log não é exibido".

---

## Módulo 8 — Depuração e instrumentação

| Referência | O que ela cobre |
|---|---|
| **`lldb`** (lldb.llvm.org) | ⚠ Breakpoint, registrador, pilha |
| **ARM64 ABI** (ARM, especificação) | ⚠ `x0`–`x7` como argumentos |
| **Frida — iOS** (frida.re/docs/ios) | ⚠ `ObjC`, `Interceptor`, `Module` |
| **`objection`** (github.com/sensepost/objection) | ⚠ Atalhos, incluindo o `jailbreak simulate` |
| **`cycript`** (cydia) | Runtime interativo — histórico |
| **Xcode Debugging** (developer.apple.com) | ⚠ `debuggable` e `get-task-allow` |

⚠ **O que conferir:** a ABI `arm64` para argumentos de função — ⚠ é o que faz `po $x2` mostrar o parâmetro certo.

---

## Módulo 9 — Integridade e proteções

| Referência | O que ela cobre |
|---|---|
| **App Attest** (developer.apple.com/documentation/devicecheck) | ⚠ ⚠ A atestação — a proteção **estrutural** |
| **`DCAppAttestService`** (DeviceCheck) | `generateKey`, `attestKey` |
| **`ptrace` / `PT_DENY_ATTACH`** (man page) | ⚠ A proteção local que **impede** |
| **`sysctl` e `P_TRACED`** (man page) | Detecção de depurador |
| **Technical Note TN3125** (Apple) | Perfil, assinatura e integridade |
| **OWASP MASVS — `RESILIENCE`** (mas.owasp.org) | ⚠ O que a indústria considera proteção adequada |

⚠ **O que conferir:** o `MASVS` na categoria de resiliência — ⚠ ele é explícito sobre o que **não** se pode prometer com proteção local.

---

## Módulo 10 — Simulador × dispositivo

| Referência | O que ela cobre |
|---|---|
| **Simulator — documentação** (developer.apple.com/documentation/xcode) | ⚠ O que o simulador **é** |
| **Running on device** (developer.apple.com) | ⚠ O fluxo de perfil e instalação |
| **`devicectl`** (Xcode) | Instalação, execução, cópia de container |
| **Apple Platform Security — `SEP`** | ⚠ A ausência no simulador |
| **`simctl`** — `get_app_container` | ⚠ Acesso ao container no simulador |

⚠ **O que conferir:** a documentação de limitações do simulador — ⚠ ela lista explicitamente os recursos de hardware que **não** existem lá.

---

## Referências transversais

| Referência | Onde serve |
|---|---|
| **OWASP MASVS / MASTG** (mas.owasp.org) | ⚠ A base do **Curso 3** |
| **Apple Security Releases** (support.apple.com/en-us/HT201222) | ⚠ O que foi corrigido, por versão — `variant hunting` |
| **`ipsw`** — firmware | Pesquisa de kernel e bootchain |
| **Frida CodeShare** (codeshare.frida.re) | Exemplos de instrumentação |
| **Apple Developer Documentation** | A fonte de tudo que muda |

⚠ **A segunda é a mais útil para acompanhar patching:** ⚠ a correção aplicada diz **o que era bug** — o mesmo raciocínio do módulo 10 do curso de Pesquisa em Windows.

---

## Ferramentas do curso

| Ferramenta | ⚠ Papel |
|---|---|
| `xcodebuild` / `xcrun` | Base — SDK, simulador, `devicectl` |
| `simctl` | ⚠ Nível A: instalar, abrir URL, container |
| `devicectl` | ⚠ Nível B: instalar, executar no aparelho |
| `otool` / `nm` / `lipo` | Análise de `Mach-O` |
| `codesign` / `security cms` | ⚠ Assinatura, entitlements, perfil |
| `plutil` | Leitura de `plist` |
| `strings` | ⚠ O mapa em trinta segundos |
| `lldb` | ⚠ Depuração — **funciona no Nível A** |
| `frida` / `objection` | ⚠ Instrumentação — Nível B |
| `ipsw` / `jtool2` | Análise complementar |
| `ghidra` | Decompilação |
| `swift demangle` | ⚠ Nomes Swift |
| `log` | Console e `sandbox deny` |
| `fs_usage` / `nettop` / `lsof` | ⚠ Observação sem `dtrace` |

---

## Sobre o laboratório do curso

⚠ **O aplicativo-alvo é escrito pelo aluno**, compilado no Xcode e instalado no **próprio aparelho** ou simulador. O curso fornece a estrutura — `plist`, `entitlements`, classes, `Keychain`, URL scheme — e o aluno analisa o que escreveu.

⚠ **O material descreve o mecanismo de decifração de binário** (módulo 9) por razão **didática** — para que o aluno entenda **por que** app da loja exige um passo a mais, e saiba avaliar **a proteção do próprio app**. ⚠ Ele **não** é exercitado contra software de terceiro.

⚠ **Os labs não foram testados em ambiente isolado.** Valide cada um antes de publicar ou usar em aula.

---

*Material original do curso. Todas as referências são públicas e abertas; nenhum trecho de obra comercial
protegida foi reproduzido.*
