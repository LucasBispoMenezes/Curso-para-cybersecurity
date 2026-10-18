---
title: "iOS Security Research: Internals e Engenharia Reversa"
nivel: avancado
tags: [ios, mach-o, entitlements, keychain, lldb, frida, sandbox, swift]
---
# iOS Security Research: Internals e Engenharia Reversa

**Ementa do curso · 34 horas · 11 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **App** | Instala e usa | ⚠ **Sabe o que ele faz, e por onde** |
| **IPA** | É um arquivo | Sabe o que há dentro, e o que **não** está |
| **Binário** | "é compilado" | ⚠ Lê **Mach-O**, fat binary e símbolo |
| **Runtime** | Não pensa nisso | ⚠ Reconhece **Objective-C** e **Swift** no binário |
| **Assinatura** | É exigência da loja | ⚠ ⚠ **Entitlements são privilégio** |
| **Sandbox** | "o app é isolado" | Sabe o que o container **contém** e quem lê |
| **Keychain** | "guarda senha" | ⚠ Sabe a **classe de proteção**, e o que ela garante |
| **Depurador** | — | ⚠ **`lldb`, `Frida` — e onde cada um alcança** |
| **Integridade** | "tem proteção" | Sabe o que ela **não** impede |
| **Limite** | "simulador serve" | ⚠ ⚠ **Sabe o que só o dispositivo faz** |
| **Mentalidade** | "iOS é fechado" | **"fechado não é opaco"** |

**Pré-requisito duro:** curso de **Linux para Segurança** (processo, arquivo, permissão) · curso de **C para Pesquisa de Segurança** (memória, ponteiro, estrutura) · curso de **Assembly e RE** (leitura de disassembly, comparação de binário).
**Ajuda muito:** curso de **Redes** (HTTP, TLS, certificado — os módulos 8 e 9) e curso de **Android Security Research** (o curso irmão; o paralelo ajuda, e o modelo é outro).

⚠ **Sem os três primeiros, você trava no módulo 2.** Este curso lê binário — e **Mach-O** não é `ELF`, nem `PE`.

---

## Por que este curso existe

⚠ **A afirmação que organiza o curso:**

> **iOS não é opaco — é FECHADO. E fechado não significa ilegível.**

⚠ **A distinção importa, e é o que o curso inteiro demonstra:**

| "Fechado" | ⚠ "Ilegível" |
|---|---|
| Não se instala app de fora da loja | ⚠ O `IPA` **é** um ZIP, com binário **legível** |
| Não se roda processo próprio | ⚠ O app **roda**, e pode ser **observado** |
| Não há `root` | ⚠ Há **jailbreak**, e há **instrumentação em dispositivo próprio** |
| ⚠ Assinatura obrigatória | ⚠ ⚠ **E ela carrega `entitlements`** — privilégio declarado |

⚠ **A pergunta que percorre os onze módulos:**

> **Onde este app confia em dado que não devia — e quem valida?**

⚠ **É a mesma pergunta do `Linux Internals`**, do **`Windows Internals`**, do **Web Apps** e do **`Android Security Research`** — o curso irmão deste. ⚠ Aqui, as fronteiras são **entre o app e o sistema**, **entre o app e o `container`**, e **entre o app e o `Keychain`**.

⚠ **E a razão de este curso ser separado do Android, e não um capítulo dele:** ⚠ **o modelo de segurança é outro.** ⚠ No Android, o `uid` e o `SELinux` decidem; aqui, decidem o **`sandbox` por perfil**, os **`entitlements`** e a **`Data Protection`**. ⚠ Quem vem do módulo 1 do curso de Android precisa **desaprender** uma parte — e é por isso que este curso tem um módulo inteiro sobre o modelo, e não uma nota.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Explicar a **arquitetura** do iOS e onde cada camada decide acesso.
2. Descrever o **modelo de segurança** — assinatura, `entitlement`, `sandbox`, `container`.
3. **Desmontar um `IPA`** e navegar `Mach-O`, fat binary, recursos e `Frameworks`.
4. **Ler o `Info.plist`** e prever o comportamento do app a partir dele.
5. Reconhecer **Objective-C e Swift** no binário, e navegar o runtime.
6. Entender **`code signing`** e ler **`entitlements`** como privilégio.
7. Mapear o **`container`** e o **`Keychain`**, com a classe de proteção.
8. **Depurar** com `lldb` e **instrumentar** com `Frida`.
9. ⚠ **Distinguir o que se faz em simulador do que exige dispositivo.**
10. Reconhecer **mecanismo de integridade** e o que ele **não** impede.
11. **Produzir um relatório de análise** reproduzível, com a condição de obtenção.

---

## O laboratório

⚠ **A exigência que este curso declara de início, e que o Android não tem:** ⚠ **há dois níveis de laboratório, e eles não cobrem as mesmas coisas.**

```
   NÍVEL A — SIMULADOR                NÍVEL B — DISPOSITIVO
   (qualquer Mac, Xcode)              (aparelho + perfil proprio)

   ✅ pacote, Mach-O, plist           ✅ ⚠ tudo do nivel A
   ✅ estatico, sem excecao           ✅ ⚠ runtime REAL (arm64)
   ✅ app proprio DEPURAVEL           ✅ Keychain real, Secure Enclave
   ⚠ execucao em x86_64/arm64         ✅ ⚠ observacao sem jailbreak
     do HOST, nao do aparelho           (com perfil de dev)
   ❌ Keychain real                   ✅ ⚠ jailbreak: instrumentacao ampla
   ❌ Secure Enclave
   ❌ codigo macho arm64 nativo
```

⚠ **O que isso significa na prática:** ⚠ **os módulos 1 a 6 rodam inteiramente no Nível A.** ⚠ Os módulos **7 a 10 exigem o Nível B** para a parte dinâmica — e cada um **diz qual das duas** está sendo exercitada. ⚠ **Nenhum módulo promete, no simulador, o que só o aparelho faz.**

⚠ **E a razão de isso ser conteúdo, e não nota de rodapé:** ⚠ analisar um app iOS **sem saber o que o simulador falseia** produz **conclusão errada** — e é a mesma disciplina do módulo 9 do curso de Android (*como li* determina o que o achado significa).

```bash
# ── NÍVEL A — o que se instala em qualquer Mac ──────────────
#    Xcode (App Store) — traz o SDK, o lldb e o simulador
xcode-select --install
#    ⚠ ferramentas de analise
brew install binutils llvm ipsw jtool2
#    ⚠ o `otool`/`nm` do Xcode; o `jtool2` e' complementar

# ── O lab ───────────────────────────────────────────────────
mkdir -p ~/ios-lab && cd ~/ios-lab
python3 -m venv .venv && source .venv/bin/activate
pip install frida-tools objection

# ── NÍVEL B — quando houver aparelho ────────────────────────
#    ⚠ device com iOS compativel + Mac com Xcode
#    ⚠ perfil de desenvolvimento assinado com SEU Apple ID
#    ⚠ jailbreak: apenas em aparelho PROPRIO, e ciente do risco
xcrun devicectl list devices
```

⚠ **Três regras do laboratório:**

⚠ **O alvo é o app do laboratório, no seu aparelho.** ⚠ Nenhum lab aponta para app de terceiro baixado da loja — nem para app de cliente.

⚠ **Cada módulo traz o app daquele módulo.** São apps pequenos, escritos para ter o comportamento em discussão. No projeto final, o app é maior e **os comportamentos não são anunciados**.

⚠ **Os labs não foram testados em ambiente isolado.** Valide cada um antes de publicar ou usar em aula.

---

## Como este curso se conecta aos outros

| Curso | Ligação |
|---|---|
| **Linux para Segurança** | Pré-requisito: processo, arquivo, permissão |
| **C para Pesquisa** | Pré-requisito: memória, ponteiro, estrutura |
| **Assembly e RE** | Pré-requisito: disassembly, comparação de binário |
| **Redes** | Ajuda: HTTP, TLS, certificado |
| ⚠ **Android Security Research** | ⚠ **Curso irmão** — independente, modelo diferente |
| **Mobile App Security** | ⚠ **Continuação**: aqui se lê; lá se investiga |

⚠ **A relação com o `Android Security Research` é deliberada:** os dois são **horizontais** (uma plataforma cada) e **independentes entre si**. ⚠ O conceito compartilhado aparece **breve** em um e é **aprofundado** no outro — e cada curso declara onde aprofunda.

⚠ **Onde este curso aprofunda, e o Android não:** ⚠ **`code signing` e `entitlements`** (módulo 4) e **`Keychain` e `Data Protection`** (módulo 5). ⚠ Onde o Android aprofunda, e este trata breve: ⚠ **`IPC` entre componentes** (aqui é o módulo 5, em versão reduzida) e **armazenamento por `uid`**.

---

## Módulos

| # | Módulo | Horas |
|---|---|---|
| 1 | Arquitetura iOS e modelo de segurança | 3 |
| 2 | `IPA`, `Mach-O` e `Info.plist` | 3 |
| 3 | Objective-C, Swift e o runtime | 4 |
| 4 | `Code signing`, `entitlements` e assinatura | 4 |
| 5 | `Sandbox`, `container` e `Keychain` | 3 |
| 6 | Análise estática de binário | 3 |
| 7 | Análise dinâmica e observação | 3 |
| 8 | Depuração e instrumentação | 3 |
| 9 | Integridade, `jailbreak` e proteções | 3 |
| 10 | Simulador × dispositivo: o que muda | 3 |
| 11 | Projeto final: análise completa | 2 |

**Ordem de leitura:** linear, e ela é **de fora para dentro** — pacote, binário, runtime, privilégio, dado. ⚠ Code signing (4) e sandbox (5) vêm **antes** da análise dinâmica porque **decidem o que é possível fazer** — e é a diferença estrutural em relação ao curso de Android, onde a análise vinha antes.

---

## Avaliação e encerramento

- `avaliacoes.md` — banco de questões por módulo, com resposta comentada.
- `glossario.md` — os termos do curso, definidos uma vez, em ordem.
- `referencias.md` — documentação oficial e material aberto que sustentam o curso.
- `README.md` — índice e ordem de leitura.

⚠ **A entrega do módulo 11 é o relatório de análise:** o que o app faz, por qual caminho, o que ele guarda, quem consegue ler, o que os `entitlements` concedem — e ⚠ **em qual nível de laboratório cada achado foi obtido**.

---

## Critérios de avaliação

| ✅ Qualifica | ⚠ Não qualifica |
|---|---|
| Achado com **caminho reproduzível** | "o app é inseguro" |
| Causa raiz em **uma frase** | "falta validação" |
| ⚠ **Nível de lab declarado** por achado | achado sem condição de obtenção |
| Evidência **do dado**, não da conclusão | captura de tela sem requisição |
| ⚠ **Ação contida** na demonstração | execução da consequência |
| Limitação declarada | silêncio sobre o não testado |

---

*Material didático original. Todo alvo é aplicativo escrito pelo aluno, instalado em aparelho próprio.
Nenhum material que ensine atacar aplicação de terceiro.*
