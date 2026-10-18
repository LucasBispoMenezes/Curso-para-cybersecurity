# Android Security Research: Internals e Engenharia Reversa

**Curso · 34 horas · 11 módulos · Nível: avançado**

---

## Sobre este curso

Este é o **Curso 1** da trilha de Mobile Security — e é **horizontal**: trata exclusivamente da plataforma Android.

A afirmação que organiza tudo:

> **Um aplicativo Android não é uma caixa. É um PACOTE — e o pacote é legível antes de ser executado.**

⚠ **E a assimetria que torna isso útil:** o desenvolvedor compila e **assina**; quem analisa **desmonta e lê**. Tudo que está no APK é legível, e tudo que o app faz em execução é observável — desde que você saiba onde olhar.

⚠ **A pergunta que percorre os onze módulos:**

> **Onde este app confia em dado que não devia — e quem valida?**

⚠ **É a mesma pergunta do `Linux Internals`** (o kernel confiando no userspace), do `Windows Internals` (o objeto confiando no handle) e do **Web Apps** (a aplicação confiando no cliente). Aqui, as fronteiras são **entre componentes**, **entre processos** e **entre o app e o sistema**.

---

## Posição na trilha de Mobile Security

```
   Linux para Segurança ─┐
   C para Pesquisa ──────┤
   Assembly e RE ────────┘
            │
            ├──► ⚠ ESTE CURSO (Android)  ──┐
            │                               ├──► CURSO 3
            └──► iOS Security Research  ──┘    (transversal)
```

⚠ **Os Cursos 1 e 2 são independentes entre si** — cada um trata uma plataforma. ⚠ **O Curso 3 depende dos dois**, porque a metodologia de investigação atravessa as duas plataformas.

⚠ **Como este curso trata o que é compartilhado com o Curso 2:**

| Conceito | ⚠ Onde é aprofundado |
|---|---|
| Armazenamento e sandbox | ⚠ **Aqui** (módulo 9) **e** no Curso 2 (Keychain) |
| IPC | ⚠ **Aqui** (módulos 3 e 4) |
| Instrumentação | ⚠ **Aqui** (módulo 8) **e** no Curso 2 |
| Code signing | ⚠ **Curso 2** (entitlements) — aqui é breve |
| Anti-tampering | ⚠ **Curso 3** — aqui é o módulo 10 |
| TLS e API | ⚠ **Curso 3** — aqui é breve |

---

## Pré-requisitos

| Pré-requisito | Por quê |
|---|---|
| **Linux para Segurança** | `uid`, processo, arquivo, permissão — o sandbox é disso |
| **C para Pesquisa** | memória, ponteiro, estrutura — o módulo 7 depende |
| **Assembly e RE** | disassembly, `ELF`, comparação de binário |
| **Redes** *(ajuda)* | HTTP, TLS — módulos 6 e 9 |
| **Windows Internals** *(ajuda)* | o paralelo de modelo de objeto e identidade |

⚠ **Sem os três primeiros, você trava no módulo 4.**

---

## Estrutura

| # | Módulo | Horas | O que entrega |
|---|---|---|---|
| 1 | [Arquitetura e modelo de segurança](modulo-01.md) | 3 | `uid`, permissão, assinatura, `SELinux` |
| 2 | [APK, DEX, ART e o `AndroidManifest`](modulo-02.md) | 3 | abrir o pacote e prever comportamento |
| 3 | [Componentes](modulo-03.md) | 4 | `Activity`, `Service`, `Receiver`, `Provider` — as portas |
| 4 | [Permissões, `IPC` e `JNI`](modulo-04.md) | 4 | `Binder`, `CallingUid`, e a falha de autorização |
| 5 | [Engenharia reversa estática](modulo-05.md) | 3 | ler DEX e smali, rastrear o dado |
| 6 | [Análise dinâmica](modulo-06.md) | 3 | `logcat`, `strace`, rede — confirmar a hipótese |
| 7 | [Bibliotecas nativas](modulo-07.md) | 3 | `.so`, `JNI`, a fronteira onde o difícil mora |
| 8 | [Depuração e instrumentação](modulo-08.md) | 3 | `Frida`, `JDWP`, `gdb` — e a evidência |
| 9 | [Armazenamento e sandbox](modulo-09.md) | 3 | onde guarda, quem lê, e **como li** |
| 10 | [Proteção e anti-análise](modulo-10.md) | 3 | o que ela tenta impedir, e o que **consegue** |
| 11 | [Projeto final](modulo-11.md) | 2 | análise completa com relatório reproduzível |

**Ordem de leitura:** linear, e ela é **de fora para dentro** — pacote, código, nativo, dado. ⚠ O módulo 7 vem depois do 6 e do 8 porque exige as duas habilidades.

---

## O laboratório

⚠ **Uma exigência de hardware, declarada de início:** ⚠ **emulador serve para a maior parte, e não para todos os módulos.** ⚠ Os módulos 7, 8 e 10 exigem **aparelho físico** (ou emulador com `root` e imagem `userdebug`).

```bash
sudo apt install -y openjdk-17-jdk android-sdk-platform-tools \
                    python3 python3-pip apktool jadx
mkdir -p ~/android-lab && cd ~/android-lab
python3 -m venv .venv && source .venv/bin/activate
pip install frida-tools objection androguard
```

⚠ **Três regras:** o alvo é **o app do laboratório, no seu aparelho** (nenhum lab aponta para app de terceiro publicado); cada módulo traz **o app daquele módulo**; e **os labs não foram testados em ambiente isolado** — valide antes de publicar.

⚠ **Como cada dado foi obtido decide a gravidade:** `run-as` (app depurável), `backup` (**real**), `/sdcard` (**real**), log (**real**), `root` (**condicionado**). ⚠ A coluna existe em todo relatório do curso.

---

## Conexões com os outros cursos

| Curso | Ligação |
|---|---|
| **Linux para Segurança** | Pré-requisito: `uid`, permissão, processo |
| **C para Pesquisa** | Pré-requisito: memória, ponteiro, estrutura |
| **Assembly e RE** | Pré-requisito: disassembly, `ELF` |
| **Windows Internals** | Paralelo: objeto, identidade, contrato |
| **iOS Security Research** | Curso irmão — independente, mesma disciplina |
| **Mobile App Security** | ⚠ **Continuação**: aqui se lê; lá se investiga |

---

## Arquivos do curso

```
curso-android-research/
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
