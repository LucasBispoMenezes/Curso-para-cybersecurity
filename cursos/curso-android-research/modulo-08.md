# Módulo 8 — Depuração e Instrumentação

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 8 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 7
**Próximo:** Módulo 9 — Armazenamento, sandbox e o que vaza

---

## O que este módulo entrega

Ao final, você vai saber **instrumentar um app em execução** — com `Frida`, `JDWP` e `gdb` — e **o que cada ferramenta alcança**. Você vai saber **hookar** um método, **observar** argumento e retorno, e **contornar** a proteção que impede a observação. É o módulo mais prático do curso.

---

## 8.1 As três ferramentas, e o que cada uma alcança

⚠ **Antes de escrever um hook, escolher a ferramenta:**

| Ferramenta | ⚠ Alcance | ⚠ Exige | ⚠ Não alcança |
|---|---|---|---|
| **`JDWP`** | ⚠ **Java/DEX** | ⚠ `debuggable=true` | ⚠ Nativo |
| ⚠ **`Frida`** | ⚠ ⚠ **Java E nativo** | ⚠ `frida-server` ou `root` | ⚠ Kernel |
| **`gdb`/`lldb`** | ⚠ **Nativo** | `root` + `ptrace` | ⚠ Java |
| `strace` | ⚠ Syscall | `root` | ⚠ Lógica |
| **Log** | O que o app **escreve** | — | ⚠ O que ele **não** escreve |

⚠ **A segunda linha é a razão de o `Frida` dominar a pesquisa:** ⚠ ele é a **única** ferramenta que atravessa **Java e nativo** com a mesma linguagem de script. ⚠ E é a razão de ele ser, também, **o alvo das proteções** (módulo 10).

⚠ **A frase que organiza o módulo:**

> **Instrumentar é trocar "eu acho que o app faz isso" por "eu vi o argumento que ele recebeu".**

⚠ **E a diferença em relação ao módulo 6:** ⚠ lá você **observava de fora**; aqui você **entra no processo** e vê **os valores** — o que é a **evidência definitiva** da hipótese do módulo 5.

---

## 8.2 `Frida`: o essencial

⚠ **Três conceitos, e você instrumenta qualquer app:**

```
   1. ATTACH    ->  ⚠ entrar no processo
   2. HOOK      ->  ⚠ interceptar um metodo/funcao
   3. OBSERVAR  ->  ⚠ argumento, retorno, e MODIFICAR
```

```javascript
// hook_basico.js — o padrao que se repete
Java.perform(function () {
    // ⚠ 1. localizar a classe
    var Alvo = Java.use("com.exemplo.app.MeuFragment");

    // ⚠ 2. interceptar o metodo
    Alvo.verificar.implementation = function (id) {
        // ⚠ 3. ver o que o app RECEBEU
        console.log("[hook] verificar() chamado com id = " + id);

        // ⚠ 4. chamar o original — ou NAO chamar
        var r = this.verificar(id);

        // ⚠ 5. ver o que o app RETORNOU
        console.log("[hook] retorno = " + r);

        // ⚠ 6. e, se for o caso, MODIFICAR
        // return true;   // ⚠ forcar a validacao a passar
        return r;
    };
});
```

⚠ **O passo 6 é o que muda a natureza da análise:** ⚠ com o hook, você não apenas **observa** — você **força o caminho** e prova que a validação é **a única barreira**. ⚠ Se forçar o retorno para `true` faz o app aceitar o que recusava, **a validação era o único obstáculo** — e isso é o achado.

⚠ **A distinção que o relatório precisa fazer:**

| O que o hook prova | ⚠ O que ele **não** prova |
|---|---|
| Que a validação estava no ponto X | ⚠ Que um atacante real chega lá |
| Que o dado chega **naquele formato** | ⚠ Que o caminho é alcançável de fora |
| ⚠ Que **forçar** o retorno muda o comportamento | ⚠ Que existe uma falha explorável |

⚠ **A última linha é a mais importante do módulo:** ⚠ **hook é prova de análise, não prova de vulnerabilidade**. ⚠ Forçar um retorno com `Frida` **exige já estar dentro do processo** — não é algo que outro app consegue fazer. ⚠ Confundir os dois é o erro que faz o relatório afirmar demais.

```bash
# O fluxo, na pratica
adb push frida-server /data/local/tmp/     # ⚠ aparelho com root
adb shell "su -c '/data/local/tmp/frida-server &'"
frida-ps -U | grep exemplo                  # ⚠ o processo esta lá?
frida -U -f com.exemplo.app -l hook_basico.js --no-pause
```

---

## 8.3 `JDWP`: quando o app é depurável

⚠ **A ferramenta mais simples, e ela depende de um atributo:**

```xml
<application android:debuggable="true">   ⚠ só assim o JDWP funciona
```

⚠ **O que o `JDWP` permite, e por que ele é menos usado que o `Frida`:**

| ✅ Permite | ⚠ Não permite |
|---|---|
| Breakpoint em método Java | ⚠ Hook em nativo |
| Ver pilha e variáveis | ⚠ Instrumentar sem parar |
| Modificar valor **parando** | ⚠ Automatizar em escala |
| ⚠ Trabalhar **sem** `frida-server` | ⚠ App de produção |

⚠ **A quarta linha é onde ele ainda serve:** ⚠ ele **não exige `root`** — basta o app ser depurável. ⚠ Isso o torna a ferramenta de **app próprio em desenvolvimento**, e o padrão do lab quando o aparelho não tem `root`.

⚠ **E a linha do "app de produção" é a que fecha o módulo 10:** ⚠ app de produção tem `debuggable=false` — e é por isso que o `Frida` existe, e é por isso que a proteção **ataca o `Frida`**.

```bash
# ⚠ Detectar se o app e' depuravel
adb shell dumpsys package com.exemplo.app | grep -i debug
adb jdwp                       # ⚠ lista os PIDs depuraveis

# Conectar
adb forward tcp:8700 jdwp:<PID>
jdb -attach localhost:8700
```

---

## 8.4 O que a instrumentação confirma

⚠ **A tabela que liga este módulo aos anteriores:**

| Hipótese (módulo 5) | ⚠ O hook que confirma |
|---|---|
| "o `extra` não é validado" | ⚠ Hook no método que o consome |
| "a URL vem do `Intent`" | Hook em `URL`/`OkHttp` → **ver o destino** |
| "o provider monta SQL" | ⚠ Hook no `rawQuery` → **ver a string** |
| ⚠ "a `.so` valida o tamanho" | ⚠ Hook em `GetArrayLength` |
| ⚠ "há detecção de `root`" | ⚠ Hook em `File.exists("/su")` |
| "o TLS é pinado" | Hook no `TrustManager` |

⚠ **A quarta linha é a que só o `Frida` faz:** ⚠ ele hooka **função nativa** — e é assim que você vê **o tamanho que chegou** à fronteira `JNI`, em valor.

```javascript
// ⚠ Hook no ponto de falha do nativo (modulo 7)
var GetArrayLength = Module.findExportByName(null, "GetArrayLength");
// ⚠ na pratica, o app tem "System.loadLibrary" -> hook na .so:
var f = Module.findExportByName("libX.so", "Java_com_exemplo_app_Minha_decifra");
if (f) {
    Interceptor.attach(f, {
        onEnter: function (args) {
            this.entrada = args[2];      // ⚠ o jbyteArray
            console.log("[nat] funcao chamada, entrada = " + this.entrada);
        },
        onLeave: function (ret) {
            console.log("[nat] retorno = " + ret);
        }
    });
}
```

⚠ **A segunda linha é a que rende:** ⚠ interceptar `File.exists` ou `Runtime.exec` mostra **a proteção trabalhando** — e é o atalho para o módulo 10. ⚠ Você vê **qual arquivo** o app procura, e **qual comando** ele tenta.

---

## 8.5 Contornar a proteção

⚠ **A interação com o módulo 10, e ela é inevitável:** ⚠ o app tenta detectar a instrumentação, e você precisa **contornar para continuar observando**.

| Detecção | ⚠ O contorno |
|---|---|
| `frida-server` na lista de processos | ⚠ Renomear o binário |
| Porta `27042` aberta | ⚠ Rodar em outra porta |
| ⚠ `ptrace` em si mesmo | ⚠ Impedir a chamada |
| Busca por `/su`, `magisk` | ⚠ Hook em `File.exists` → `false` |
| Verificação de assinatura | ⚠ Hook no `PackageManager` |
| ⚠ Verificação de integridade do DEX | ⚠ Hook em hash/`checkSum` |

⚠ **O ponto que o curso insiste em deixar claro:** ⚠ **todo contorno tem contrapartida.** ⚠ Renomear o `frida-server` é fácil **e conhecido**; alterar o `File.exists` **pode quebrar o app legítimo**. ⚠ E há detecções que **não** são contornáveis de dentro — a de **kernel**, por exemplo.

⚠ **A leitura honesta, para o relatório:**

```
   ⚠ A PROTECAO NAO IMPEDE. ELA ENCARECE.

   custo para o autor  -> escrever e manter a deteccao
   custo para voce      -> descobrir, contornar, e ⚠ refazer a cada versao

   ⚠ E o custo dela e' ASSIMETRICO:
     - o app paga UMA vez
     - voce paga a CADA versao nova
```

⚠ **É a tese do módulo 10, e a mesma dos cursos anteriores:** ⚠ nenhuma proteção **impede** — todas **encarecem**. ⚠ E a assimetria é o que importa: ela paga uma vez, e você paga **toda vez que ele atualiza**.

---

## 8.6 O que registrar

⚠ **A evidência da instrumentação, e ela é a mais forte do curso:**

| Item | ⚠ Por quê |
|---|---|
| **Script** usado | ⚠ Reproduzível por outra pessoa |
| ⚠ **A classe e o método** | ⚠ Onde o hook foi posto |
| ⚠ **O valor observado** | ⚠ ⚠ **A evidência** — não a conclusão |
| Versão do `Frida` | ⚠ Comportamento muda |
| ⚠ **Se houve contorno** | ⚠ E qual — muda a interpretação |
| ⚠ **A saída bruta** | ⚠ Não o resumo |

⚠ **A última linha merece a insistência:** ⚠ a saída **bruta** do hook é a prova. ⚠ Um relatório que diz *"confirmei que o valor chega"* sem o log é **afirmação**; com o log, é **evidência**.

⚠ **E a quinta é a que qualifica tudo:** ⚠ se você **contornou** uma proteção, isso muda o que o achado significa. ⚠ Um comportamento observado **sem** contorno prova mais que o mesmo comportamento observado **depois** de desligar a verificação de `root`.

---

## Laboratório 8 — Instrumentar

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Aparelho com `root` (ou app depurável). Snapshot recomendado.**

```bash
mkdir -p ~/android-lab/m08 && cd ~/android-lab/m08
adb install -r ../m03/alvo/app-release.apk
```

```bash
# ── 1. FRIDA — subir no aparelho ───────────────────────────
#    ⚠ baixe o frida-server compativel com a ARQUITETURA do aparelho
ABI=$(adb shell getprop ro.product.cpu.abi | tr -d '\r')
echo "ABI: $ABI"
adb push frida-server /data/local/tmp/
adb shell "chmod 755 /data/local/tmp/frida-server"
adb shell "su -c '/data/local/tmp/frida-server &'" &
sleep 3
frida-ps -U | head

# ⚠ se falhar: o aparelho tem root? o binario e' da ABI certa?
adb shell su -c id
```

```javascript
// hook_app.js — observe o que o app recebe
Java.perform(function () {
    console.log("[*] instrumentando...");

    // ⚠ 1. as classes que consomem dado externo
    try {
        var Perfil = Java.use("com.exemplo.app.PerfilActivity");
        Perfil.onCreate.implementation = function (b) {
            var i = this.getIntent();
            var uid = i.getStringExtra("usuario_id");
            // ⚠ A EVIDENCIA: o valor que CHEGOU
            console.log("[hook] intent.usuario_id = " + uid);
            return this.onCreate(b);
        };
    } catch (e) { console.log("[!] Perfil: " + e); }

    // ⚠ 2. o servico que faz requisicao com dado de fora
    try {
        var Urlc = Java.use("java.net.URL");
        Urlc.$init.overload('java.lang.String').implementation = function (u) {
            console.log("[hook] URL criada -> " + u);   // ⚠ o destino
            return this.$init(u);
        };
    } catch (e) { console.log("[!] URL: " + e); }

    // ⚠ 3. deteccao de root (modulo 10)
    try {
        var File = Java.use("java.io.File");
        File.exists.implementation = function () {
            var p = this.getAbsolutePath();
            if (/su|magisk|superuser|frida/i.test(p)) {
                console.log("[hook] ⚠ deteccao de root: " + p + " -> false");
                return false;                    // ⚠ contorno
            }
            return this.exists();
        };
    } catch (e) { console.log("[!] File: " + e); }
});
```

```bash
# ── 2. RODE o hook e provoque ──────────────────────────────
frida -U -f com.exemplo.app -l hook_app.js --no-pause &
sleep 3

# ⚠ provoque pelo CAMINHO NAO PREVISTO
adb shell am start -n com.exemplo.app/.PerfilActivity --es usuario_id "999"
sleep 2
# ⚠ leia a saida do frida: o valor 999 chegou?
```

```bash
# ── 3. ⚠ FORCE O CAMINHO — prova que a validacao e' a unica barreira ──
cat > forcar.js <<'EOF'
Java.perform(function () {
    try {
        var V = Java.use("com.exemplo.app.Validador");
        V.autorizado.overload('java.lang.String').implementation = function (u) {
            console.log("[hook] forcando autorizado(" + u + ") -> true");
            return true;                 // ⚠ ignora a logica original
        };
    } catch (e) { console.log("[!] " + e); }
});
EOF
frida -U -f com.exemplo.app -l forcar.js --no-pause
# ⚠ o app aceitou o que antes recusava?
#    ⚠ se sim: a validacao era o UNICO obstaculo
```

```bash
# ── 4. ⚠ HOOK NO NATIVO — a fronteira JNI (modulo 7) ──────
cat > nativo.js <<'EOF'
Java.perform(function () {
    // ⚠ encontre a .so carregada
    var mods = Process.enumerateModules();
    mods.forEach(function (m) {
        if (/libX|exemplo/.test(m.name)) console.log("[mod] " + m.name);
    });
});
EOF
frida -U -f com.exemplo.app -l nativo.js --no-pause
```

```bash
# ── 5. O REGISTRO ──────────────────────────────────────────
cat > evidencia-m08.md <<'EOF'
# Evidencia de instrumentacao — <app>
Frida: <versao> · Aparelho: <modelo> · Root: sim/nao
| Metodo hookado | ⚠ Valor observado | Contorno aplicado? |
|----------------|-------------------|--------------------|
## Saida bruta do hook
```
(cole aqui)
```
## ⚠ O que isso PROVA — e o que NAO prova
EOF
```

**O que observar:** no passo 3, **forçar o retorno** prova que a validação estava **naquele ponto** — e que era **o único obstáculo**. ⚠ Mas note o alerta do 8.2: isso **não** prova que outro app alcança o mesmo. ⚠ E no passo 4, o hook em `File.exists` mostra a **proteção trabalhando** — você vê **qual caminho** ela testa.

**Exercício 1:** preencha o `evidencia-m08.md` com a **saída bruta** de pelo menos dois hooks. ⚠ A seção "o que isso **não** prova" é obrigatória.

**Exercício 2:** escolha uma hipótese do `leitura.md` (módulo 5) e confirme com **hook**, mostrando **o valor** que chegou. ⚠ Depois verifique: o comportamento é alcançável **de fora** do processo, ou só **com o hook**? Escreva a diferença.

**Exercício 3 (o que vale):** implemente **um** contorno de detecção (passo 3 do script) e escreva, em duas linhas, **o custo assimétrico** do 8.5 — o que o autor paga uma vez, e o que você paga a cada versão. É o raciocínio que o módulo 10 formaliza.

---

## Resumo

- ⚠ **Três ferramentas:** `JDWP` (Java, exige `debuggable`), ⚠ **`Frida` (Java e nativo)**, `gdb` (nativo, exige `root`).
- ⚠ **`Frida` é a única que atravessa os dois mundos** — e por isso é o alvo das proteções.
- ⚠ **Instrumentar troca "eu acho" por "eu vi o argumento".**
- ⚠ **Forçar o retorno prova que a validação era a única barreira** — e **não** prova que é explorável de fora.
- ⚠ **Hook é prova de análise, não prova de vulnerabilidade.**
- ⚠ **A seção "o que não prova" é obrigatória** — é o que evita o relatório que afirma demais.
- ⚠ **Todo contorno tem contrapartida** — e pode quebrar o app legítimo.
- ⚠ **O custo é assimétrico:** o autor paga uma vez; você paga a cada versão.

---

## O que o próximo módulo entrega

Você sabe instrumentar. O módulo 9 mapeia **o que o app guarda**: armazenamento, sandbox e backup — e quem, afinal, consegue ler.
