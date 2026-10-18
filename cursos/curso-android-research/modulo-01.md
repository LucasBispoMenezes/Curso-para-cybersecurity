# Módulo 1 — Arquitetura Android e Modelo de Segurança

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 1 de 11 · 3 horas
**Pré-requisitos:** Linux para Segurança · C para Pesquisa · Assembly e RE
**Próximo:** Módulo 2 — APK, DEX, ART e o `AndroidManifest`

---

## O que este módulo entrega

Ao final, você vai saber **desenhar o Android em camadas** e apontar **onde cada uma guarda estado e decide acesso**. Você vai entender por que o modelo de segurança do Android é **de `uid`**, e não de permissão de usuário — e vai usar isso como base para tudo o que os dez módulos seguintes leem.

---

## 1.1 As camadas, e o que cada uma decide

```
   ┌────────────────────────────────────────────────────────┐
   │  APLICATIVOS          seu app, os do sistema           │
   ├────────────────────────────────────────────────────────┤
   │  FRAMEWORK JAVA       ActivityManager, PackageManager, │
   │  (system_server)      ⚠ quem DECIDE autorizacao         │
   ├────────────────────────────────────────────────────────┤
   │  BIBLIOTECAS NATIVAS  libc (bionic), libart, media     │
   ├────────────────────────────────────────────────────────┤
   │  ART / RUNTIME        ⚠ executa o DEX                   │
   ├────────────────────────────────────────────────────────┤
   │  KERNEL LINUX         ⚠ uid, sandbox, SELinux, Binder   │
   └────────────────────────────────────────────────────────┘
```

⚠ **A leitura que organiza o curso:** a decisão de acesso **não está no app**, e **não está só no kernel**. ⚠ Ela está dividida entre o `system_server` (que consulta permissão e componente) e o **kernel** (que aplica `uid` e `SELinux`).

⚠ **E a consequência para a análise:** quando você observa um comportamento, precisa saber **qual camada o produziu** — porque a correção é em camadas diferentes.

| Comportamento | ⚠ Camada que decidiu |
|---|---|
| "o app não conseguiu ler o arquivo" | ⚠ **Kernel** — `uid` ou `SELinux` |
| "o app não conseguiu usar a câmera" | ⚠ **`system_server`** — permissão |
| "o componente não foi iniciado" | ⚠ `system_server` — `exported` |
| ⚠ "o app foi morto ao abrir" | ⚠ Runtime — verificação de integridade |

---

## 1.2 O modelo de `uid`

⚠ **A diferença fundamental em relação ao Linux desktop, e ela é o alicerce do curso:**

```
   LINUX DESKTOP                   ANDROID
   ─────────────                   ───────

   uid = pessoa                     ⚠ uid = APLICATIVO
   um usuario, muitos processos     um uid, um app

   /home/usuario                    /data/data/<pacote>
   ⚠ permissao do usuario           ⚠ permissao do APP
```

⚠ **Cada aplicativo instalado recebe um `uid` próprio** — e todos os processos daquele app rodam com ele. ⚠ Isso significa que o **sandbox do Android é o sandbox do `uid`**, e que ele **reaproveita o mecanismo do kernel**.

⚠ **O que decorre disso, e é o que a análise explora:**

| Fato | ⚠ Consequência |
|---|---|
| Cada app tem um `uid` | ⚠ Nenhum app lê o dado de outro |
| O `uid` vem na instalação | ⚠ Reinstalar pode mudar o `uid` |
| ⚠ Apps podem **compartilhar** `uid` | ⚠ `sharedUserId` — um lê o outro |
| ⚠ O `uid` está no arquivo em disco | ⚠ É leitura de `ls -n`, não de API |
| ⚠ `root` e `system` são `uid` especiais | ⚠ `0` e `1000` — o objetivo de escalação |

```bash
# O uid de cada app, no aparelho
adb shell ls -ln /data/data | head -20
# ⚠ a terceira coluna e' o uid — e cada app tem o seu

# Quem sou eu, neste shell
adb shell id
# ⚠ `shell` tem uid proprio (2000) — e nao le' /data/data de ninguem
```

⚠ **A última linha é a que você vai usar em todo lab:** ⚠ o shell `adb` **não é root**, e **não lê** o diretório de nenhum app. ⚠ Isso não é obstáculo — é o **estado real** do aparelho, e é o que torna a análise honesta.

---

## 1.3 Permissão: o que ela é, e o que ela não é

⚠ **A confusão mais comum, e o módulo desfaz:**

| O que a permissão faz | ⚠ O que ela **não** faz |
|---|---|
| Autoriza **uso de API protegida** | ⚠ Não autoriza leitura de arquivo de outro app |
| É verificada **no `system_server`** | ⚠ Não é `chmod` |
| Pode ser **do app ou do componente** | ⚠ Não é verificada em todo caminho |
| ⚠ É declarada no **manifesto** | ⚠ Declarar não é o mesmo que usar |

⚠ **A primeira linha é a chave:** a permissão autoriza **chamar uma API protegida** — câmera, contato, localização. ⚠ Ela **não** é um sistema de arquivo. ⚠ O dado do app é protegido por **`uid`**, e a permissão não muda isso.

⚠ **E a última linha é o que a análise procura:** ⚠ declarar uma permissão no manifesto **não** significa que o app a usa, e **usar** uma API não significa que a permissão foi declarada — pode ser que ela venha **por outro caminho**.

⚠ **As três categorias que importam para análise:**

| Categoria | ⚠ O que muda |
|---|---|
| **Normal** | Concedida na instalação, sem aviso |
| **Perigosa** (`dangerous`) | ⚠ Exige aprovação — e pode ser **negada** |
| **Assinatura** (`signature`) | ⚠ Só outro app do **mesmo assinante** |
| **Especial** | ⚠ Fluxo próprio — exige ação no sistema |

⚠ **A quarta é a que mais aparece em pesquisa:** permissões especiais (acessibilidade, administrador de dispositivo, sobreposição de tela) **não** seguem o fluxo comum, e é por isso que elas são **objetivo de análise** — o caminho até elas é diferente.

---

## 1.4 Assinatura: identidade do app

⚠ **A assinatura no Android tem um papel que surpreende quem vem do desktop:**

| O que a assinatura garante | ⚠ O que ela **não** garante |
|---|---|
| Identidade **do publicador** | ⚠ Que o código seja seguro |
| ⚠ **Impede troca de app por outro** | ⚠ Que o app seja legítimo |
| ⚠ Permite `signature` permission | ⚠ Que ele venha da loja |
| Permite atualizar sem reinstalar | ⚠ Que ele seja bem escrito |

⚠ **A segunda linha é a diferença em relação ao `Windows Internals`:** ⚠ aqui, a assinatura é **identidade de publicação** — o sistema **impede** que um app substitua outro com assinatura diferente. ⚠ É controle de **integridade de origem**, não de qualidade.

⚠ **E a terceira linha é a que a análise usa:** ⚠ permissões de `signature` só são concedidas entre apps **do mesmo assinante** — e é por isso que, ao analisar um app, você **verifica o certificado**: ele diz **o que mais aquele publicador pode alcançar**.

```bash
# O certificado de um app — o primeiro comando de toda analise
apksigner verify --print-certs app.apk
# ⚠ anote: emissor, validade, e o SHA-256 do certificado
# ⚠ dois apps do MESMO emissor podem ter permissao `signature` um do outro
```

---

## 1.5 SELinux: a camada que quase ninguém olha

⚠ **Acima do `uid`, o Android tem **MAC** — controle de acesso obrigatório:**

```
   DECISAO DE ACESSO A ARQUIVO:

   /data/data/com.app.exemplo/arquivo
        │
        ├─ 1. uid do processo == dono do arquivo?   (DAC)
        │        ⚠ se nao, NEGA — e acabou
        │
        └─ 2. ⚠ SELINUX permite o dominio acessar esse tipo?
                 ⚠ se nao, NEGA — mesmo com uid correto
```

⚠ **A consequência, dita sem rodeio:** ⚠ **ser `root` não basta.** ⚠ Um processo com `uid 0` mas em **domínio `SELinux` errado** continua sendo **negado** — e é isso que **contém** o dano de uma escalação.

⚠ **A leitura que o módulo instala:** quando um acesso falha **mesmo com `root`**, a resposta está no `SELinux` — e o log diz qual regra negou.

```bash
# O modo do SELinux
adb shell getenforce
# ⚠ Enforcing | Permissive

# O contexto de um arquivo e de um processo
adb shell ls -Z /data/data/ | head
adb shell ps -Z | head

# ⚠ A negacao — a linha que explica o acesso que falhou
adb shell dmesg | grep -i avc | tail -20
# ⚠ "avc: denied { read } for ... scontext=... tcontext=..."
```

⚠ **A última consulta é o que resolve a dúvida mais comum no lab:** ⚠ "eu sou root e não consigo ler" → o `avc: denied` responde **por qual domínio** e **em qual tipo**.

---

## 1.6 Onde a confiança muda de lado

⚠ **A tabela que fecha a teoria do módulo, e que será usada nos dez seguintes:**

| Fronteira | ⚠ O que o app presume | Módulo |
|---|---|---|
| **Componente ↔ componente** | "só eu inicio isso" | ⚠ 3 e 4 |
| **App ↔ app** | "ninguém lê meu dado" | ⚠ 9 |
| **App ↔ sistema** | "a permissão me protege" | ⚠ 4 |
| **App ↔ nativo** | "o `.so` é meu" | ⚠ 7 |
| **App ↔ servidor** | "a resposta é confiável" | Curso 3 |
| ⚠ **Análise ↔ proteção** | "não dá para me instrumentar" | ⚠ 10 |

⚠ **A última linha é a que dá sentido ao curso:** ⚠ o app pode tentar **impedir a análise** — detecção de `root`, verificação de assinatura, ofuscação. ⚠ Nenhuma delas **impede**; todas **encarecem**. ⚠ É a tese do módulo 10, e a mesma dos cursos anteriores.

---

## Laboratório 1 — Ler o modelo no aparelho

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

**Objetivo:** observar o modelo de segurança **no aparelho**, sem escrever código — `uid`, permissão, `SELinux` e assinatura.

```bash
mkdir -p ~/android-lab/m01 && cd ~/android-lab/m01

# ── 1. Conecte o aparelho (ou emulador) ─────────────────────
adb devices
adb shell getprop ro.build.version.release    # versao do Android
adb shell getprop ro.product.cpu.abi          # arquitetura
adb shell getprop ro.debuggable               # ⚠ 1 = imagem debug

# ── 2. O modelo de uid ──────────────────────────────────────
adb shell id
adb shell ls -ln /data/data | head -15
# ⚠ anote: quais uids aparecem, e qual e' o do `shell`

# ⚠ a prova: o shell NAO le o dado de ninguem
adb shell ls /data/data/com.android.settings/ 2>&1 | head -3
# ⚠ esperado: Permission denied
```

```bash
# ── 3. Qual app tem qual uid ────────────────────────────────
adb shell pm list packages -U | head -20
# ⚠ a opcao -U mostra o uid de cada pacote

adb shell dumpsys package com.android.settings | grep -E 'userId|sharedUser'
# ⚠ `sharedUser` e' o caso em que DOIS apps dividem o uid
```

```bash
# ── 4. Permissao, na pratica ────────────────────────────────
adb shell pm list permissions -g -d | head -30
adb shell dumpsys package com.android.settings | grep -A3 'requested permissions'
# ⚠ declaradas vs concedidas — sao coisas diferentes

# ⚠ uma permissao PERIGOSA concedida
adb shell dumpsys package com.android.settings | grep -B1 -A1 'granted=true'
```

```bash
# ── 5. SELinux — a camada que nega mesmo com root ───────────
adb shell getenforce
adb shell ls -Z /data/data | head -5
adb shell ps -Z | grep -E 'u0_|system' | head -5

# ⚠ provoque uma negacao e leia o avc
adb shell dmesg 2>/dev/null | grep -i avc | tail -10
#    se nao houver, rode com root e tente ler algo restrito:
#    adb shell su -c 'cat /data/misc/keystore/*' 2>&1 | head -3
```

```bash
# ── 6. Assinatura ───────────────────────────────────────────
#    ⚠ pegue um APK do sistema e verifique
adb shell pm path com.android.settings
#       -> /system/priv-app/Settings/Settings.apk
adb pull /system/priv-app/Settings/Settings.apk ./settings.apk
apksigner verify --print-certs ./settings.apk

# ⚠ e compare com OUTRO app do sistema — o emissor e' o mesmo?
adb shell pm path com.android.shell
adb pull /system/priv-app/Shell/Shell.apk ./shell.apk
apksigner verify --print-certs ./shell.apk
# ⚠ emissor igual -> um pode ter permissao `signature` do outro
```

**O que observar:** no passo 6, o **emissor** do certificado. ⚠ Dois apps com o mesmo emissor podem ter permissões que nenhum outro app do aparelho tem — e é isso que torna o certificado **informação de segurança**, não burocracia.

**Exercício 1:** monte a **tabela do 1.1** para o seu aparelho: para cada comportamento observado (o app não leu arquivo, não usou câmera, não iniciou componente), escreva **qual camada decidiu**. ⚠ Use o `avc: denied` do `dmesg` quando o acesso falhar com `root`.

**Exercício 2:** liste **todos** os `uid` presentes em `/data/data` e identifique **quais pacotes compartilham** o mesmo `uid`. ⚠ Escreva, em duas linhas, o que `sharedUserId` significa para a análise de segurança — e por que ele **amplia** a superfície.

**Exercício 3 (o que vale):** escolha **uma** permissão **especial** (acessibilidade, administrador de dispositivo, sobreposição) e escreva: **qual é o fluxo** para concedê-la, **por que** ele não é o fluxo comum, e **o que** um app faz com ela que nenhuma outra permissão permite. ⚠ É o raciocínio que o módulo 4 formaliza.

---

## Resumo

- ⚠ **A decisão de acesso está dividida** entre o `system_server` (permissão, componente) e o **kernel** (`uid`, `SELinux`).
- ⚠ **Cada app tem um `uid`** — e o sandbox do Android **é** o sandbox do `uid`, com o mecanismo do Linux.
- ⚠ **Permissão não é sistema de arquivo:** ela autoriza **API protegida**, e o dado é protegido por `uid`.
- ⚠ **Declarar permissão e usar a API são coisas diferentes** — e o descompasso é achado.
- ⚠ **A assinatura é identidade de publicação**, não garantia de qualidade — e habilita permissão de `signature`.
- ⚠ **SELinux nega mesmo com `root`** — e `avc: denied` responde qual domínio negou.
- ⚠ **Nenhuma proteção impede a análise; todas encarecem.**

---

## O que o próximo módulo entrega

Você entende o modelo. O módulo 2 abre **o pacote**: APK, DEX, ART e o `AndroidManifest` — e ensina a prever o comportamento do app **antes de ele rodar**.
