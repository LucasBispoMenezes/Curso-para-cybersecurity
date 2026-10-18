---
title: "Android Security Research: Internals e Engenharia Reversa"
nivel: avancado
tags: [android, apk, dex, art, frida, ipc, sandbox, jni]
---
# Android Security Research: Internals e Engenharia Reversa

**Ementa do curso · 34 horas · 11 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **App** | Instala e usa | ⚠ **Sabe o que ele faz, e onde** |
| **APK** | É um arquivo | Sabe o que há dentro, seção por seção |
| **Código** | É Java compilado | Lê o **DEX** e o bytecode que ele contém |
| **Componente** | Sabe que existe `Activity` | Sabe **quem pode invocar**, e com que dado |
| **Permissão** | É um aviso na loja | ⚠ **É controle de acesso, com `uid` e grupo** |
| **IPC** | Implícita | ⚠ **Superfície de ataque com autorização** |
| **Nativo** | "é mais rápido" | Lê `.so`, entende `JNI`, e instrumenta |
| **Depurador** | `logcat` | ⚠ **`Frida`, `JDWP`, `gdb` — e o que cada um alcança** |
| **Armazenamento** | "o app guarda" | ⚠ **Onde, com que permissão, e quem lê** |
| **Proteção** | "tem anti-root" | Sabe o que ela **não** impede |
| **Mentalidade** | "o app é uma caixa" | **"o app é um pacote que eu desmonto"** |

**Pré-requisito duro:** curso de **Linux para Segurança** (processo, arquivo, permissão, `uid`) · curso de **C para Pesquisa de Segurança** (memória, ponteiro, estrutura) · curso de **Assembly e RE** (leitura de disassembly, `PE`/ELF, comparação de binário).
**Ajuda muito:** curso de **Redes** (HTTP, TLS — os módulos 9 e 11) e curso de **Windows Internals** (o paralelo de estrutura de objeto).

⚠ **Sem os três primeiros, você trava no módulo 4.** Este curso lê binário e lê memória — e não repete o que eles ensinam.

---

## Por que este curso existe

⚠ **A afirmação que organiza o curso:**

> **Um aplicativo Android não é uma caixa. É um PACOTE — e o pacote é legível antes de ser executado.**

⚠ **E a assimetria que torna isso útil:** o desenvolvedor compila e **assina**; quem analisa **desmonta e lê**. ⚠ Tudo que está no APK é **legível**, e tudo que o app **faz em execução** é **observável** — desde que você saiba onde olhar.

⚠ **A pergunta que percorre os onze módulos:**

> **Onde este app confia em dado que não devia — e quem valida?**

⚠ **É a mesma pergunta do `Linux Internals`** (o kernel confiando no userspace), do `Windows Internals` (o objeto confiando no handle) e do **Web Apps** (a aplicação confiando no cliente). ⚠ Aqui, as fronteiras são **entre componentes**, **entre processos** e **entre o app e o sistema**.

⚠ **E a razão de ele vir antes do curso transversal:** ⚠ este curso ensina a **ler** um app Android. ⚠ O `Mobile Application Security` (Curso 3) usa essa leitura para **investigar vulnerabilidade**. ⚠ Um não substitui o outro, e a ordem importa.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Explicar a **arquitetura** do Android e onde cada camada guarda estado.
2. Descrever o **modelo de segurança** — `uid`, sandbox, permissão e assinatura — e o que cada um garante.
3. **Desmontar um APK** e navegar DEX, recursos, certificado e bibliotecas nativas.
4. Ler o **`AndroidManifest`** e prever o comportamento do app a partir dele.
5. Reconhecer **componentes exportados** e a **autorização** de cada um.
6. **Instrumentar** um app com `Frida`, interceptor e hook.
7. **Depurar** com `JDWP` e `gdb`, e entender o que cada ferramenta alcança.
8. Analisar **biblioteca nativa** — `.so`, `JNI`, símbolo e chamada.
9. Mapear **onde o app armazena dado**, e quem consegue ler.
10. Reconhecer **mecanismo de proteção** e o que ele **não** impede.
11. **Produzir um relatório de análise** de um app, reproduzível.

---

## O laboratório

⚠ **Uma exigência de hardware, declarada de início:** ⚠ **emulador serve para a maior parte dos módulos, e não para todos.** ⚠ Os módulos 7, 8 e 10 exigem **dispositivo físico** (ou emulador com `root` e imagem `userdebug`) — e a razão técnica é explicada no módulo correspondente.

```bash
# ── Ferramentas de base ─────────────────────────────────────
sudo apt update
sudo apt install -y openjdk-17-jdk android-sdk-platform-tools \
                    python3 python3-pip apktool jadx

# ── O lab ───────────────────────────────────────────────────
mkdir -p ~/android-lab && cd ~/android-lab
python3 -m venv .venv && source .venv/bin/activate
pip install frida-tools objection androguard

# ── Verificacao ─────────────────────────────────────────────
adb version
java -version
apktool --version
jadx --version
python3 -c "import androguard, frida; print('ok')"

# ── O alvo: app de laboratorio, escrito por voce ────────────
# ⚠ O curso traz as instrucoes; o app e' SEU, e roda no SEU aparelho
```

⚠ **Três regras do laboratório:**

⚠ **O alvo é o app do laboratório, no seu aparelho.** ⚠ Nenhum lab aponta para app de terceiro publicado — nem da loja, nem do seu cliente.

⚠ **Cada módulo traz o app daquele módulo.** São apps pequenos, escritos para ter o comportamento em discussão. No projeto final, o app é maior e **os defeitos não são anunciados**.

⚠ **Os labs não foram testados em ambiente isolado.** Valide cada um antes de publicar ou usar em aula.

---

## Como este curso se conecta aos outros

| Curso | Ligação |
|---|---|
| **Linux para Segurança** | Pré-requisito: `uid`, processo, arquivo, permissão |
| **C para Pesquisa** | Pré-requisito: memória, ponteiro, estrutura |
| **Assembly e RE** | Pré-requisito: disassembly, comparação de binário |
| **Redes** | Ajuda: HTTP, TLS, certificado |
| **Windows Internals** | Paralelo: modelo de objeto e de identidade |
| **iOS Security Research** | ⚠ Curso irmão — modelo diferente, mesma disciplina |
| **Mobile App Security** | ⚠ **Continuação**: aqui se lê; lá se investiga |

⚠ **A relação com o `iOS Security Research` é deliberada:** os dois são **horizontais** (uma plataforma cada) e **independentes entre si**. ⚠ Conceito compartilhado aparece **breve** em um e é **aprofundado** no outro — e a trilha declara onde cada um aprofunda.

---

## Módulos

| # | Módulo | Horas |
|---|---|---|
| 1 | Arquitetura Android e modelo de segurança | 3 |
| 2 | APK, DEX, ART e o `AndroidManifest` | 3 |
| 3 | Componentes: `Activity`, `Service`, `Receiver`, `Provider` | 4 |
| 4 | Permissões, IPC e `JNI` | 4 |
| 5 | Engenharia reversa estática | 3 |
| 6 | Análise dinâmica e observação de execução | 3 |
| 7 | Bibliotecas nativas: `.so`, `JNI` e análise | 3 |
| 8 | Depuração e instrumentação | 3 |
| 9 | Armazenamento, sandbox e o que vaza | 3 |
| 10 | Mecanismos de proteção e anti-análise | 3 |
| 11 | Projeto final: análise completa de um app | 2 |

**Ordem de leitura:** linear, e a ordem é **de fora para dentro** — pacote, código, nativo, dado. ⚠ O módulo 7 vem **depois** do 6 e do 8 porque exige as duas habilidades.

---

## Avaliação e encerramento

- `avaliacoes.md` — banco de questões por módulo, com resposta comentada.
- `glossario.md` — os termos do curso, definidos uma vez, em ordem.
- `referencias.md` — documentação oficial e material aberto que sustentam o curso.
- `README.md` — índice e ordem de leitura.

⚠ **A entrega do módulo 11 é o relatório de análise:** o que o app faz, por qual caminho, o que ele guarda, quem consegue ler, e o que a proteção dele **não** impede.

---

## Critérios de avaliação

| ✅ Qualifica | ⚠ Não qualifica |
|---|---|
| Achado com **caminho reproduzível** | "o app é inseguro" |
| Causa raiz em **uma frase** | "falta validação" |
| Evidência **do dado**, não da conclusão | captura de tela sem requisição |
| ⚠ **Ação contida** na demonstração | execução da consequência |
| Limitação declarada | silêncio sobre o não testado |

---

*Material didático original. Todo alvo é aplicativo escrito pelo aluno, instalado em aparelho próprio.
Nenhum material que ensine atacar aplicação de terceiro.*
