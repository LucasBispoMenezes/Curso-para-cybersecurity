# iOS Security Research: Internals e Engenharia Reversa

**Curso · 34 horas · 11 módulos · Nível: avançado**

---

## Sobre este curso

Este é o **Curso 2** da trilha de Mobile Security — e é **horizontal**: trata exclusivamente da plataforma iOS.

A afirmação que organiza tudo:

> **iOS não é opaco — é FECHADO. E fechado não significa ilegível.**

⚠ **A distinção importa:** "fechado" é não instalar app de fora da loja; ⚠ **"ilegível" seria não poder ler** — e o `IPA` é um ZIP, o binário é `Mach-O`, e o app **roda e pode ser observado**.

⚠ **A pergunta que percorre os onze módulos:**

> **Onde este app confia em dado que não devia — e quem valida?**

⚠ **É a mesma pergunta dos outros cursos da trilha.** Aqui, as fronteiras são **entre o app e o sistema**, **entre o app e o `container`**, e **entre o app e o `Keychain`**.

---

## Posição na trilha de Mobile Security

```
   Linux para Segurança ─┐
   C para Pesquisa ──────┤
   Assembly e RE ────────┘
            │
            ├──► Android Security Research ──┐
            │                                  ├──► CURSO 3
            └──► ⚠ ESTE CURSO (iOS)  ────────┘    (transversal)
```

⚠ **Os Cursos 1 e 2 são independentes entre si** — cada um trata uma plataforma. ⚠ **O Curso 3 depende dos dois.**

⚠ **Como este curso trata o que é compartilhado com o Curso 1:**

| Conceito | ⚠ Onde é aprofundado |
|---|---|
| `Code signing` e **`entitlements`** | ⚠ **Aqui** (módulo 4) |
| **`Keychain` e `Data Protection`** | ⚠ **Aqui** (módulo 5) |
| Armazenamento e `container` | ⚠ Aqui **e** no Curso 1 (módulo 9) |
| `IPC` entre componentes | ⚠ **Curso 1** — aqui é reduzido ao URL scheme |
| **Simulador × dispositivo** | ⚠ **Aqui** (módulo 10) — é uma questão de plataforma |
| TLS, sessão, anti-tampering | ⚠ **Curso 3** — aqui é breve |

---

## Pré-requisitos

| Pré-requisito | Por quê |
|---|---|
| **Linux para Segurança** | processo, arquivo, permissão |
| **C para Pesquisa** | memória, ponteiro, estrutura |
| **Assembly e RE** | disassembly, `Mach-O` não é `ELF` nem `PE` |
| **Redes** *(ajuda)* | HTTP, TLS — módulos 7 e 8 |
| **Android Security Research** *(ajuda)* | o curso irmão; o paralelo ajuda, o modelo é outro |

⚠ **Sem os três primeiros, você trava no módulo 2.**

---

## Estrutura

| # | Módulo | Horas | O que entrega |
|---|---|---|---|
| 1 | [Arquitetura e modelo de segurança](modulo-01.md) | 3 | os três pilares, `SEP`, `PAC`, `attestation` |
| 2 | [`IPA`, `Mach-O` e `Info.plist`](modulo-02.md) | 3 | abrir o pacote; fat binary; `cryptid` |
| 3 | [Objective-C, Swift e o runtime](modulo-03.md) | 4 | mensagem, seletor, metadados, `@objc` |
| 4 | [`Code signing` e `entitlements`](modulo-04.md) | 4 | ⚠ **o privilégio declarado e assinado** |
| 5 | [`Sandbox`, `container` e `Keychain`](modulo-05.md) | 3 | ⚠ **`Data Protection` por arquivo** |
| 6 | [Análise estática de binário](modulo-06.md) | 3 | strings, símbolos, desmontagem, rastreio |
| 7 | [Análise dinâmica](modulo-07.md) | 3 | Console, container, tráfego |
| 8 | [Depuração e instrumentação](modulo-08.md) | 3 | `lldb`, `Frida`, swizzling |
| 9 | [Integridade e proteções](modulo-09.md) | 3 | `jailbreak`, `PT_DENY_ATTACH`, **`attestation`** |
| 10 | [Simulador × dispositivo](modulo-10.md) | 3 | ⚠ ⚠ **o que o simulador falseia** |
| 11 | [Projeto final](modulo-11.md) | 2 | análise completa, com **nível** por achado |

**Ordem de leitura:** linear, e ela é **de fora para dentro** — pacote, binário, runtime, privilégio, dado. ⚠ **Code signing (4) e sandbox (5) vêm ANTES da análise dinâmica** porque **decidem o que é possível fazer** — e é a diferença estrutural em relação ao curso de Android.

---

## O laboratório

⚠ **A exigência que este curso declara de início:** ⚠ **há dois níveis, e eles não cobrem as mesmas coisas.**

| | NÍVEL A — simulador | NÍVEL B — dispositivo |
|---|---|---|
| Requer | Mac + Xcode | ⚠ aparelho + perfil próprio |
| ✅ dá | pacote, `Mach-O`, `plist`, estática, **`lldb`** | ⚠ tudo do A |
| ⚠ não dá | `SEP`, `Keychain` real, `Data Protection`, `PAC`, `attestation` | — |

⚠ **Os módulos 1 a 6 rodam inteiramente no Nível A.** ⚠ Os módulos 7 a 10 têm parte que **exige B** — e cada um diz **qual**.

```bash
xcode-select --install
brew install binutils llvm ipsw jtool2
mkdir -p ~/ios-lab && cd ~/ios-lab
python3 -m venv .venv && source .venv/bin/activate
pip install frida-tools objection
xcrun devicectl list devices          # ⚠ Nível B, quando houver aparelho
```

⚠ **Três regras:** o alvo é **o app do laboratório, no seu aparelho**; cada módulo traz **o app daquele módulo**; e **os labs não foram testados em ambiente isolado** — valide antes de publicar.

⚠ **A coluna `VALE NO APARELHO?` existe em todo relatório:** sim, precisa B, ou **só B responde**. ⚠ A terceira é **resultado**, não lacuna.

---

## Conexões com os outros cursos

| Curso | Ligação |
|---|---|
| **Linux para Segurança** | Pré-requisito |
| **C para Pesquisa** | Pré-requisito |
| **Assembly e RE** | Pré-requisito: disassembly |
| **Redes** | Ajuda: HTTP, TLS |
| **Android Security Research** | Curso irmão — independente, modelo diferente |
| **Mobile App Security** | ⚠ **Continuação**: aqui se lê; lá se investiga |

---

## Arquivos do curso

```
curso-ios-research/
├── README.md          ← este arquivo
├── 00-ementa.md       ← ementa completa
├── modulo-01.md ... modulo-11.md
├── avaliacoes.md      ← banco de questões
├── glossario.md       ← termos do curso
└── referencias.md     ← documentação e material aberto
```

---

*Material didático original. Todo alvo é aplicativo escrito pelo aluno, instalado em aparelho próprio.
Nenhum material que ensine atacar aplicação de terceiro.*
