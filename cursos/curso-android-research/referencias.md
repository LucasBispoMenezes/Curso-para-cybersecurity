# Referências — Android Security Research: Internals e Engenharia Reversa

**Documentação oficial, especificações e material aberto que sustentam o curso**

---

## Como este arquivo funciona

⚠ **Todas as referências são públicas e abertas** — documentação oficial, especificação de formato, e material publicado pelos próprios mantenedores.

⚠ **O curso é material original:** nenhum trecho de obra comercial foi reproduzido. As referências servem para **aprofundamento** e para **verificação** do que o curso afirma — e cada módulo indica quais usar.

⚠ **Nota sobre estabilidade:** Android muda rápido, e algumas referências descrevem **comportamento por versão**. ⚠ Onde o curso afirma algo que depende de versão, ele diz qual — e a referência serve para conferir a **versão alvo**.

---

## Módulo 1 — Arquitetura e modelo de segurança

| Referência | O que ela cobre |
|---|---|
| **Android Security — documentação oficial** (source.android.com/docs/security) | O modelo de `uid`, sandbox, permissão |
| **Android Application Sandbox** (source.android.com) | A separação por `uid` e o isolamento de processo |
| **Permissions overview** (developer.android.com/guide/topics/permissions) | Categorias, fluxo de concessão, permissões especiais |
| **SELinux no Android** (source.android.com/docs/security/features/selinux) | Domínio, tipo, contexto, e o modo `Enforcing` |
| **App Signing** (developer.android.com/studio/publish/app-signing) | Identidade de publicação e rotação de chave |

⚠ **O que conferir:** a lista de **permissões por categoria** muda entre versões — a referência oficial é a única fonte atualizada.

---

## Módulo 2 — APK, DEX, ART e o `AndroidManifest`

| Referência | O que ela cobre |
|---|---|
| **Application Fundamentals** (developer.android.com/guide/components/fundamentals) | Estrutura, componentes e manifesto |
| **`<application>` e atributos do manifesto** (developer.android.com/guide/topics/manifest) | ⚠ Inclui `allowBackup`, `debuggable`, `networkSecurityConfig` |
| **Dalvik Executable format** (source.android.com/docs/core/runtime/dex-format) | ⚠ A especificação do DEX |
| **ART and Dalvik** (source.android.com/docs/core/runtime) | Compilação, `odex`/`vdex`/`oat`, perfil |
| **`apktool`** (github.com/iBotPeaches/Apktool) | Decodificação de manifesto e recursos |
| **`jadx`** (github.com/skylot/jadx) | Descompilação DEX → Java |

⚠ **O que conferir:** o **default** de cada atributo do manifesto. ⚠ `allowBackup` ausente é `true` — e essa informação está na documentação, não no bom senso.

---

## Módulo 3 — Componentes

| Referência | O que ela cobre |
|---|---|
| **Intents and Intent Filters** (developer.android.com/guide/components/intents-filters) | ⚠ `exported` implícito por `intent-filter` |
| **Activities** / **Services** / **BroadcastReceivers** / **Content Providers** | O contrato de cada componente |
| **`<provider>`** (developer.android.com/guide/topics/manifest/provider-element) | `authorities`, `grantUriPermissions`, `permission` |
| **Task and Back Stack** (developer.android.com/guide/components/activities/tasks-and-back-stack) | ⚠ `taskAffinity` e `launchMode` — a base do *task hijacking* |
| **`adb shell am`** (developer.android.com/tools/adb) | Invocação de componente pela linha de comando |

⚠ **O que conferir:** a documentação de `<activity>` explica quando `exported` é **obrigatório** — e é a referência para distinguir o defeito real do exigido pelo sistema.

---

## Módulo 4 — Permissões, IPC e JNI

| Referência | O que ela cobre |
|---|---|
| **Binder** (source.android.com/docs/core/architecture/hidl/binder-ipc) | O mecanismo de `IPC` |
| **`Binder.getCallingUid()`** (developer.android.com/reference/android/os/Binder) | ⚠ A API que identifica o chamador |
| **`PendingIntent`** (developer.android.com/reference/android/app/PendingIntent) | ⚠ `FLAG_IMMUTABLE` e o que ela impede |
| **Java Native Interface Specification** (docs.oracle.com/javase/8/docs/technotes/guides/jni) | ⚠ A especificação de `JNI` — assinaturas, referências, exceção |
| **Android JNI Tips** (developer.android.com/training/articles/perf-jni) | Boas práticas e armadilhas de `JNI` |

⚠ **O que conferir:** a especificação de `JNI` é o que sustenta a seção de conversão — ⚠ `GetArrayLength`, `Get*ArrayElements`, e a obrigação de `Release`.

---

## Módulo 5 — Engenharia reversa estática

| Referência | O que ela cobre |
|---|---|
| **Dalvik bytecode** (source.android.com/docs/core/runtime/dalvik-bytecode) | ⚠ As instruções que o smali representa |
| **`smali`/`baksmali`** (github.com/JesusFreke/smali) | A representação textual |
| **`jadx`** | Descompilação e suas limitações |
| **`androguard`** (github.com/androguard/androguard) | Análise programática de APK |

⚠ **O que conferir:** a tabela de instruções — ⚠ a semântica de `move-result`, dos `invoke-*` e dos `if-*` é o que se lê em qualquer smali.

---

## Módulo 6 — Análise dinâmica

| Referência | O que ela cobre |
|---|---|
| **`logcat`** (developer.android.com/tools/logcat) | Filtro por `pid`, por tag, e formato |
| **`strace`** (man7.org/linux/man-pages/man1/strace.1.html) | ⚠ Filtro por syscall — `openat`, `connect`, `execve` |
| **`/proc`** (man7.org/linux/man-pages/man5/proc.5.html) | ⚠ `/proc/net/tcp` e a leitura de conexões |
| **Network security configuration** (developer.android.com/training/articles/security-config) | ⚠ Por que app de produção recusa CA de usuário |
| **`mitmproxy`** (docs.mitmproxy.org) | Interceptação de tráfego |

⚠ **O que conferir:** o formato de `/proc/net/tcp` — endereço e porta em **hex**, e a ordem dos bytes. ⚠ É o que o curso usa para ver destino **sem decifrar TLS**.

---

## Módulo 7 — Bibliotecas nativas

| Referência | O que ela cobre |
|---|---|
| **JNI Specification** — capítulo de tipos e funções | ⚠ O contrato da fronteira |
| **ELF specification** (refspecs.linuxfoundation.org/elf) | O formato do `.so` |
| **`objdump` / `nm` / `readelf`** (GNU Binutils) | Símbolo, seção, dependência |
| **Ghidra** (ghidra-sre.org) | Descompilação de nativo |
| **Android ABI** (developer.android.com/ndk/guides/abis) | ⚠ `arm64-v8a`, `armeabi-v7a`, `x86_64` |

⚠ **O que conferir:** a convenção de nome de `JNI` está na especificação — ⚠ e a variante `RegisterNatives` também.

---

## Módulo 8 — Depuração e instrumentação

| Referência | O que ela cobre |
|---|---|
| **`Frida`** (frida.re/docs) | ⚠ Java e nativo, `Interceptor`, `Module` |
| **`frida-tools`** (frida.re/docs/frida-tools) | `frida-ps`, `frida`, `frida-trace` |
| **`objection`** (github.com/sensepost/objection) | Atalhos sobre `Frida` |
| **JDWP** (docs.oracle.com/javase/8/docs/technotes/guides/jpda) | O protocolo de depuração Java |
| **Android debugging** (developer.android.com/studio/debug) | ⚠ `debuggable` e o que ele habilita |

⚠ **O que conferir:** a lista de hooks de `Frida` para Android — ⚠ é a documentação que sustenta os scripts do curso.

---

## Módulo 9 — Armazenamento

| Referência | O que ela cobre |
|---|---|
| **Data and file storage overview** (developer.android.com/training/data-storage) | ⚠ Interno, externo, escopo |
| **Scoped storage** (developer.android.com/training/data-storage/shared) | ⚠ O que mudou por versão |
| **Auto Backup** (developer.android.com/guide/topics/data/autobackup) | ⚠ `allowBackup` e `fullBackupContent` |
| **Keystore** (developer.android.com/privacy-and-security/keystore) | ⚠ Uso vs. extração de chave |
| **`abe`** (github.com/nelenkov/android-backup-extractor) | Desempacotar `adb backup` |
| **SQLite** (sqlite.org/docs.html) | ⚠ Inclui `wal` e `journal` |

⚠ **O que conferir:** a documentação de `Auto Backup` explica **o que sai** quando `allowBackup` está ligado — ⚠ e é ela que sustenta o achado de maior alcance do módulo.

---

## Módulo 10 — Proteção e anti-análise

| Referência | O que ela cobre |
|---|---|
| **`SafetyNet` / `Play Integrity`** (developer.android.com/privacy-and-security/safetynet) | ⚠ Atestação **fora** do app |
| **`Debug.isDebuggerConnected`** | Detecção de depurador |
| **`PackageManager.getPackageInfo`** | ⚠ Verificação de assinatura |
| **`DexClassLoader`** (developer.android.com/reference/dalvik/system/DexClassLoader) | ⚠ Carregamento dinâmico |
| **OWASP MASVS — `RESILIENCE`** (mas.owasp.org) | ⚠ O que a indústria considera proteção adequada |

⚠ **O que conferir:** o `MASVS` na categoria de resiliência — ⚠ ele é explícito sobre o que **não** se pode prometer com proteção local.

---

## Referências transversais do curso

| Referência | Onde ela serve |
|---|---|
| **OWASP Mobile Application Security** (mas.owasp.org) | ⚠ `MASVS` e `MASTG` — a base do Curso 3 |
| **`Frida` CodeShare** (codeshare.frida.re) | Exemplos de instrumentação |
| **`objection` wiki** | Fluxos prontos de análise |
| **Android Platform Security Model** (arXiv) | ⚠ O paper que descreve o modelo formalmente |
| **Android Security Bulletins** (source.android.com/docs/security/bulletin) | ⚠ O que foi corrigido, por versão |

⚠ **A última é a mais útil para `variant hunting`** — o mesmo raciocínio do módulo 10 do curso de Pesquisa em Windows: ⚠ a correção aplicada diz **o que era bug**, e a versão ao lado pode não tê-la recebido.

---

## Ferramentas do curso

| Ferramenta | ⚠ Papel |
|---|---|
| `adb` | Base de tudo — instalação, invocação, observação |
| `apktool` | Manifesto legível + smali |
| `jadx` | Java legível — conveniência |
| `frida` / `frida-tools` | ⚠ Instrumentação Java **e** nativa |
| `objection` | Atalhos sobre `Frida` |
| `androguard` | Análise programática |
| `sqlite3` | Ler banco extraído |
| `nm` / `objdump` / `readelf` | Análise de `.so` |
| `ghidra` | Descompilação de nativo |
| `strace` | ⚠ Camada de syscall |
| `mitmproxy` | Interceptação de tráfego |
| `abe` | Desempacotar backup |

---

## Sobre o laboratório do curso

⚠ **O aplicativo-alvo é escrito pelo aluno.** O curso fornece a estrutura — manifesto, componentes, código nativo, armazenamento — e o aluno compila, instala no **próprio aparelho** e analisa.

⚠ **Nenhuma referência deste arquivo aponta para aplicativo de terceiro como alvo de teste.** Elas servem para **entender** e **verificar** — e é assim que devem ser usadas.

⚠ **Os labs não foram testados em ambiente isolado.** Valide cada um antes de publicar ou usar em aula.

---

*Material original do curso. Todas as referências são públicas e abertas; nenhum trecho de obra comercial
protegida foi reproduzido.*
