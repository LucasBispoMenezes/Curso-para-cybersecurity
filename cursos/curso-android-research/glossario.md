# Glossário — Android Security Research: Internals e Engenharia Reversa

**Termos do curso, definidos uma vez, em ordem alfabética**

---

## A

**`Activity`** — Componente de tela. ⚠ Exportada, é **invocável por qualquer app**, sem passar pela tela.

**`adb`** — *Android Debug Bridge*. ⚠ Roda com o `uid` do **shell** — e por isso **não** prova acesso entre apps.

**`allowBackup`** — Atributo do manifesto. ⚠ **Ausente significa `true`** — e o dado sai por `adb backup`, sem `root`.

**`AndroidManifest.xml`** — Declaração do app. ⚠ **Binário dentro do APK**; a ferramenta decodifica.

**`APK`** — O pacote. É **ZIP**: manifesto, DEX, recursos, `assets` e `lib/`.

**`AIDL`** — *Android Interface Definition Language*. ⚠ Interface de `Service` **bound** — expõe métodos.

**`ART`** — Runtime. ⚠ **Compila** o DEX — o que roda **não é exatamente** o do pacote.

**`avc: denied`** — Registro de negação do `SELinux`. ⚠ Responde **por qual domínio** o acesso falhou.

---

## B

**`Binder`** — O `IPC` do Android. ⚠ **Não esconde o chamador** — `getCallingUid()` devolve o `uid` real.

**`bionic`** — A libc do Android.

---

## C

**`ContentProvider`** — Componente que **expõe dado**. ⚠ O mais crítico dos quatro — existe para compartilhar.

**`classes.dex`** — O bytecode. ⚠ **Todas as classes, um arquivo**; `multidex` quando estoura.

**Cifra de string** — Ofuscação de literal. ⚠ **A chave precisa estar no app** — é recuperável.

**`CallingUid`** — `Binder.getCallingUid()`. ⚠ **Quem chamou** — e o dado **não é forjável**.

---

## D

**`debuggable`** — Atributo. ⚠ Habilita `JDWP` **e** `run-as`.

**`DexClassLoader`** — Carregador dinâmico. ⚠ Traz DEX **que não está no APK**.

**`DEX`** — Formato de bytecode. ⚠ Registradores, não pilha.

---

## E

**`exported`** — Atributo. ⚠ ⚠ **Quem pode invocar** — a porta mais importante.

**`ELF`** — Formato do `.so` nativo.

---

## F

**`Frida`** — Instrumentação. ⚠ A única que atravessa **Java e nativo**.

---

## G

**`gdb`/`lldb`** — Depurador nativo. Exige `root` e `ptrace`.

---

## H

**`hardening`** — ⚠ Nenhuma proteção **impede**; todas **encarecem**.

---

## I

**`Intent`** — Mensagem entre componentes. ⚠ É o **canal** por onde o dado externo chega.

**`IPC`** — Comunicação entre processos. ⚠ Tudo passa pelo `Binder`.

---

## J

**`jadx`** — Descompilador. ⚠ Conveniência — **não é a verdade**.

**`JNI`** — *Java Native Interface*. ⚠ **Traduz**, não valida — e é aí que a falha aparece.

**`JNI_OnLoad`** — Função chamada ao carregar a `.so`. ⚠ Onde mora `RegisterNatives` e, muitas vezes, a proteção.

**`JDWP`** — Protocolo de depuração Java. ⚠ Exige app **depurável**.

---

## K

**`KeyStore`** — Armazenamento de chave por hardware. ⚠ Impede a **extração**, não o **uso**.

---

## M

**`multidex`** — Vários DEX. ⚠ Existe porque **um** arquivo tem limite.

**`Manifest`** — ver `AndroidManifest.xml`.

**`METHOD_**` — não é deste curso; pertence ao curso de Pesquisa em Windows.

---

## N

**`native`** — Método implementado em `.so`. ⚠ Encontrado pela convenção de nome.

---

## O

**Ofuscação** — Renomear, cifrar, achatar fluxo. ⚠ **Renomeia, não esconde** — as APIs do sistema mantêm o nome.

---

## P

**`PendingIntent`** — Ação delegada. ⚠ Sem **`FLAG_IMMUTABLE`**, outro app **preenche** o `Intent` — **autoridade emprestada**.

**Permissão** — Autoriza **API protegida**. ⚠ **Não é sistema de arquivo** — o dado é protegido por `uid`.

**`ptrace`** — Chamada de depuração. ⚠ Um app que a usa **denuncia a proteção**.

---

## R

**`Receiver`** — Componente que **escuta**. ⚠ Registrado no manifesto é **superfície permanente** — acorda o app.

**`RegisterNatives`** — Registro explícito de método nativo. ⚠ O nome **não segue** a convenção; o mapa está na tabela.

**`run-as`** — Executa como o app. ⚠ Instrumento **sem `root`** — exige app **depurável**.

---

## S

**`SELinux`** — Controle de acesso obrigatório. ⚠ **Nega mesmo com `root`**.

**`SharedPreferences`** — Arquivo XML de preferências. ⚠ **Legível** — e credencial em claro é achado.

**`smali`** — Representação textual do bytecode. ⚠ **A verdade** quando o `jadx` falha.

**`SQLite`** — Banco padrão. ⚠ E os arquivos `-wal`/`-journal` guardam **o que foi apagado**.

**`<so>`** — Biblioteca nativa. ⚠ Onde o código sensível mora — e é **legível**.

---

## T

**`taskAffinity`** — Agrupamento de tarefas. ⚠ Mal configurado com `launchMode` → *task hijacking*.

**`targetSdk`** — Versão alvo. ⚠ Muda o **comportamento** de várias APIs — inclusive de armazenamento.

---

## U

**`uid`** — Identidade do **aplicativo**. ⚠ O sandbox do Android **é** o sandbox do `uid`.

---

## V

**`vdex` / `odex` / `oat`** — Artefatos da compilação do ART. ⚠ O que roda está lá, não no APK.

---

## Termos que NÃO são deste curso

| Termo | Curso correto |
|---|---|
| `OBJECT_HEADER`, `IOCTL`, `PPL`, `ETW`, `hive` | Windows Internals / Pesquisa em Windows |
| `kmalloc`, `KASAN`, `cap_effective`, `io_uring` | Linux Internals |
| `Mach-O`, `Keychain`, `entitlements`, `Data Protection` | **iOS Security Research** (Curso 2) |
| Autorização de API, sessão, TLS pinning, deep link | **Mobile App Security** (Curso 3) |
| ROP, heap grooming, shellcode | Exploit Development |
| `Sigma`, WAF, detecção | Detecção e Evasão |

⚠ **A regra da trilha:** conceito compartilhado aparece **breve** onde não pertence, e é **aprofundado** onde pertence. ⚠ `Keychain` e `entitlements` são do Curso 2; **anti-tampering** e **TLS** são do Curso 3.

---

*Glossário original do curso. As definições assumem o contexto do material.*
