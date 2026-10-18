# Glossário — iOS Security Research: Internals e Engenharia Reversa

**Termos do curso, definidos uma vez, em ordem alfabética**

---

## A

**`App Attest`** — Atestação por hardware. ⚠ **A única proteção estrutural do curso** — a chave nasce no `SEP` e quem verifica é o **servidor**.

**`App Group`** — Área compartilhada entre apps do mesmo grupo. ⚠ Por **`entitlement`** — e o app mais fraco compromete o mais forte.

**`attestation`** — Prova ao **servidor** que o cliente é íntegro. ⚠ É o que **impede** o uso por cliente modificado.

---

## C

**`CFBundleURLTypes`** — Chave do `plist` que registra URL schemes. ⚠ É a **superfície de entrada** do iOS.

**`code signing`** — Assinatura do app. ⚠ No iOS, é **controle de execução** — não impede leitura nem observação.

**`container`** — A área do app (`Data/Application/<UUID>/`). ⚠ Protegido pelo `sandbox`, **não por `uid`**.

**`cryptid`** — Campo de `LC_ENCRYPTION_INFO`. ⚠ `1` = binário **cifrado** no disco — a estática exige decifrar.

---

## D

**`Data Protection`** — Proteção **por arquivo**, ligada ao desbloqueio. ⚠ `UntilFirstUserAuthentication` é a classe que **engana**.

**`dyld`** — O carregador dinâmico. ⚠ Onde a lista de imagens carregadas pode ser consultada.

---

## E

**`entitlement`** — ⚠ ⚠ **Privilégio declarado e assinado.** Diferente de permissão: ⚠ **o usuário não vê**.

**`embedded.mobileprovision`** — O perfil embutido. ⚠ Diz **quais `entitlements`** a Apple concedeu — e é **legível**.

---

## F

**Fat binary** — ⚠ Um arquivo com **várias arquiteturas**. ⚠ É a razão de o binário do simulador **não ser** o do aparelho.

**`Frida`** — Instrumentação. ⚠ No iOS, exige **`jailbreak`**.

---

## G

**`get-task-allow`** — Entitlement que habilita **depuração**. ⚠ Presente em dev, **ausente** em produção.

---

## H

**`highlight`** — n/a.

---

## I

**`Info.plist`** — Declaração do app. ⚠ Onde URL schemes, ATS e sharing aparecem.

**`IPA`** — O pacote. É **ZIP**: `Payload/`, binário, `plist`, `Frameworks/` e o **perfil**.

---

## J

**`jailbreak`** — Comprometimento do aparelho. ⚠ Exige o **Nível B**, e ⚠ **não alcança o `SEP`**.

---

## K

**`Keychain`** — Armazenamento de **item**. ⚠ **Não é cofre de chave** — guarda senha, token, certificado.

**`keychain-access-groups`** — Entitlement. ⚠ Define **quais `Keychain`** o app alcança — pode incluir **outro app**.

---

## L

**`lldb`** — Depurador. ⚠ **Funciona no Nível A**; exige app **depurável**.

**`linker-signed`** — ⚠ **Sem assinatura real** — não roda em aparelho comum.

**`LSApplicationQueriesSchemes`** — Chave do `plist`. ⚠ Quais apps o app tenta alcançar.

---

## M

**`Mach-O`** — Formato de binário. ⚠ `load commands`, fat binary, seções.

**Mangled (Swift)** — Nome codificado. ⚠ `swift demangle` reverte.

**`method swizzling`** — Trocar implementação **em runtime**. ⚠ É mecanismo **nativo** do runtime.

---

## N

**`NSAllowsArbitraryLoads`** — ⚠ **HTTP em claro permitido** — achado direto.

**`NSFileProtectionComplete`** — Classe forte: ⚠ só com aparelho **desbloqueado**.

**`NSFileProtectionNone`** — ⚠ ⚠ **Sempre legível**.

**`NSUserDefaults`** — Preferências em disco. ⚠ O `SharedPreferences` do iOS — **dado local não confiável**.

**Nível A / Nível B** — ⚠ **Simulador** / **dispositivo**. ⚠ A coluna que qualifica todo achado do curso.

---

## O

**`os_log`** — Log atual do iOS. ⚠ **Não aparece por padrão** em produção.

**`ObjC.available`** — ⚠ Verificação do `Frida` no iOS — o runtime é **Objective-C**.

**`openURL:options:`** — ⚠ **O ponto de entrada externo**. ⚠ Recebe dado de qualquer app, e a **origem** quase nunca é lida.

---

## P

**`PAC`** — *Pointer Authentication*. ⚠ Endereço de retorno **assinado por hardware** — exploração em iOS não copia Android.

**`ptrace`** — Chamada de depuração. ⚠ Negada sem `get-task-allow`.

**`PT_DENY_ATTACH`** — ⚠ ⚠ **A proteção local que IMPEDE** — bloqueia o anexo por `ptrace`.

---

## S

**`sandbox`** — ⚠ Por **PERFIL** — decide **operação**, não arquivo.

**`sandbox deny`** — Registro de negação. ⚠ O `avc: denied` do iOS.

**`SEP` / `Secure Enclave`** — Processador separado. ⚠ Chave **não sai** — e fica fora **mesmo com kernel comprometido**.

**`skip-library-validation`** — Entitlement. ⚠ Permite **carregar código** — base da instrumentação.

**`swift demangle`** — ⚠ Reverte nome mangled.

---

## T

**`ThisDeviceOnly`** — ⚠ Decide se o item do `Keychain` **vai para o backup**. ⚠ Sem ele, o token **sai do aparelho**.

**`TeamIdentifier`** — Identidade do time de desenvolvimento. ⚠ Quem assinou.

---

## U

**`UIFileSharingEnabled`** — Chave do `plist`. ⚠ Expõe `Documents/` ao usuário.

---

## V

**`VALE NO APARELHO?`** — ⚠ ⚠ **A coluna do curso.** Três respostas: **sim**, **precisa B**, **só B responde**.

---

## Termos que NÃO são deste curso

| Termo | Curso correto |
|---|---|
| `uid`, `SELinux`, `ContentProvider`, `DEX`, `smali` | **Android Security Research** (Curso 1) |
| `OBJECT_HEADER`, `IOCTL`, `PPL`, `ETW` | Windows Internals / Pesquisa em Windows |
| `kmalloc`, `KASAN`, `nftables` | Linux Internals |
| Autorização de API, sessão, TLS pinning, deep link, WebView | **Mobile App Security** (Curso 3) |
| ROP, heap grooming, shellcode | Exploit Development |

⚠ **A regra da trilha:** conceito compartilhado aparece **breve** onde não pertence, e é **aprofundado** onde pertence. ⚠ `entitlements` e `Keychain` são **daqui**; `IPC` entre componentes é do Curso 1; **anti-tampering** e **TLS** são do Curso 3.

---

*Glossário original do curso. As definições assumem o contexto do material.*
