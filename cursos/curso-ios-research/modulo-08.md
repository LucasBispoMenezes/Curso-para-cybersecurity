# Módulo 8 — Depuração e Instrumentação

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 8 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 7
**Próximo:** Módulo 9 — Integridade, `jailbreak` e proteções

---

## O que este módulo entrega

Ao final, você vai saber **instrumentar um app iOS** — com `lldb` e `Frida` — e **o que cada um alcança** em cada nível de laboratório. Você vai entender por que o runtime de Objective-C torna a instrumentação tão eficaz, e vai saber **declarar o que a instrumentação prova e o que ela não prova**.

---

## 8.1 As ferramentas, e o que cada uma exig

⚠ **Antes de escrever um hook, escolher a ferramenta — e no iOS a escolha depende do **nível**:

| Ferramenta | ⚠ Nível | ⚠ Alcança | ⚠ Exige |
|---|---|---|---|
| ⚠ **`lldb` (Xcode)** | ⚠ **A e B** | ⚠ Java? não — **nativo e ObjC** | ⚠ App **depurável** |
| ⚠ **`Frida`** | ⚠ ⚠ **B** | ⚠ ⚠ **Nativo E ObjC** | ⚠ ⚠ **`jailbreak`** |
| **`lldb` via `debugserver`** | B | Nativo, com símbolo | ⚠ `jailbreak` ou perfil |
| ⚠ **`cycript` / `objection`** | B | ⚠ Runtime ObjC | ⚠ `jailbreak` |
| **Instrumentos (Xcode)** | A e B | Perfil de tempo, memória | App depurável |

⚠ **A distinção que este módulo instala, e ela é específica do iOS:** ⚠ **o `lldb` funciona no Nível A** — porque Xcode anexa ao app **depurável** no simulador. ⚠ **O `Frida` exige `jailbreak`** — no simulador, ele até pode rodar, mas ⚠ é o simulador, e o módulo 10 explica o limite.

⚠ **A frase que organiza o módulo:**

> **Instrumentar é trocar "eu acho que o app faz isso" por "eu vi o argumento que ele recebeu".**

⚠ **E a vantagem do iOS sobre o Android:** ⚠ em Objective-C, **toda mensagem é indireção** (módulo 3) — e portanto **toda** ela é substituível. ⚠ Não é preciso procurar função de hook: ⚠ **o ponto de substituição é o mecanismo normal do runtime**.

---

## 8.2 `method swizzling`: o mecanismo que torna tudo possível

⚠ **A operação central, e ela é nativa do runtime — não é um hack:**

```objectivec
// ⚠ Trocar a implementacao de um metodo, em runtime
Method original = class_getInstanceMethod([Alvo class], @selector(verificar:));
Method novo      = class_getInstanceMethod([MeuHook class], @selector(verificarHook:));
method_exchangeImplementations(original, novo);

// ⚠ A partir daqui, TODA chamada a `verificar:` cai no hook
//    ⚠ inclusive as internas do app
```

⚠ **A consequência, e ela é o que o curso explora:** ⚠ a indireção acontece **em toda mensagem** — então o hook **não precisa saber onde o método é chamado**. ⚠ Ele intercepta **onde for**.

⚠ **As três coisas que o hook permite, e cada uma muda a natureza da análise:**

| O que se faz | ⚠ O que isso prova |
|---|---|
| ⚠ **Observar** | ⚠ Que o dado **chega naquele formato** |
| ⚠ **Alterar o retorno** | ⚠ Que a validação é **a única barreira** |
| ⚠ **Não chamar o original** | ⚠ Que o método é **necessário** |

⚠ **A segunda é a que rende:** ⚠ forçar `verificar:` a devolver `true` e o app **aceitar o que recusava** prova que **a validação estava ali** — e o módulo 8 do curso de Android já avisou do cuidado: ⚠ isso **não** prova que outro app alcança o mesmo.

---

## 8.3 `Frida` no iOS: o essencial

⚠ **O mesmo `Frida` do Android, com diferenças concretas:**

```javascript
// hook_ios.js — o padrao, com as diferencas do iOS
if (ObjC.available) {                     // ⚠ iOS usa o runtime ObjC
    var Alvo = ObjC.classes.MeuValidador; // ⚠ acesso por nome de classe

    // ⚠ 1. interceptar um METODO
    var orig = Alvo["- verificar:"];
    Interceptor.attach(orig.implementation, {
        onEnter: function (args) {
            // ⚠ args[0]=self, args[1]=_cmd, args[2]=parametro
            var p = new ObjC.Object(args[2]).toString();
            console.log("[hook] verificar(" + p + ")");
        },
        onLeave: function (retval) {
            console.log("[hook] retorno = " + retval);
        }
    });

    // ⚠ 2. PROCURAR metodos por padrao
    for (var cls in ObjC.classes) {
        if (/Keychain|Token|Crypto/.test(cls)) {
            console.log("[cls] " + cls);
        }
    }

    // ⚠ 3. hook em FUNCAO C PURA (nao passa pelo runtime)
    var f = Module.findExportByName(null, "CC_SHA256");
    if (f) Interceptor.attach(f, {
        onEnter: function (a) { console.log("[C] CC_SHA256 chamada"); }
    });
}
```

⚠ **As três diferenças em relação ao Android, e cada uma importa:**

| Android | ⚠ iOS |
|---|---|
| `Java.perform` | ⚠ **`ObjC.available`** / `ObjC.classes` |
| Nome de método Java | ⚠ **`"- verificar:"`** — com `-` e `:` |
| ⚠ Nativo é exceção | ⚠ ⚠ **Nativo é comum** — `Interceptor` no endereço |

⚠ **A segunda é a que confunde no começo:** ⚠ o seletor **inclui os dois-pontos** de cada parâmetro. ⚠ `verificar:` (um parâmetro) ≠ `verificar` (zero). ⚠ Errar isso faz o hook **não instalar**, sem mensagem de erro óbvia.

⚠ **E a terceira é a boa notícia:** ⚠ como o iOS é ObjC/Swift em boa parte, ⚠ muitos pontos de interesse **estão no runtime** — e o `Interceptor` cobre o resto.

```bash
# ── Subir o Frida no dispositivo (⚠ exige jailbreak) ───────
#    ⚠ via repositório de pacotes do jailbreak, ou `frida-server`
frida-ps -U | grep -i exemplo
frida -U -f com.exemplo.app -l hook_ios.js --no-pause
```

---

## 8.4 Descobrir o que instrumentar

⚠ **Com centenas de classes, o problema é **escolher**. Três abordagens:**

| Abordagem | ⚠ Como |
|---|---|
| ⚠ **Listar por padrão** | ⚠ Buscar classe cujo nome casa com o interesse |
| ⚠ **Listar por método** | ⚠ Buscar seletor que recebe dado externo |
| ⚠ **Seguir o dado** | ⚠ Hook no ponto de entrada, e seguir |

```javascript
// descoberta.js — o inventario em runtime
if (ObjC.available) {
    // ⚠ 1. classes que interessam
    var alvos = ["Keychain","Token","Auth","Valid","Crypto","URL","Network"];
    for (var cls in ObjC.classes) {
        alvos.forEach(function (p) {
            if (cls.indexOf(p) >= 0) {
                console.log("[classe] " + cls);
                // ⚠ e os metodos dela
                var ms = ObjC.classes[cls].$ownMethods || [];
                ms.forEach(function (m) {
                    if (/verif|valid|check|open|handle|url/i.test(m))
                        console.log("    → " + m);
                });
            }
        });
    }

    // ⚠ 2. o ponto de entrada — TODA invocacao externa passa aqui
    var App = ObjC.classes.AppDelegate;
    if (App) {
        var h = App["- application:openURL:options:"];
        if (h) Interceptor.attach(h.implementation, {
            onEnter: function (a) {
                var url = new ObjC.Object(a[2]).toString();
                var opt = new ObjC.Object(a[3]);
                // ⚠ a ORIGEM — o que quase nunca e' verificado (modulo 5)
                console.log("[open] url=" + url);
                console.log("[open] origem=" + opt.objectForKey_(
                    "UIApplicationOpenURLOptionsSourceApplicationKey"));
            }
        });
    }
}
```

⚠ **O passo 2 é o mais produtivo deste curso:** ⚠ **toda** invocação externa passa por `openURL` — e o hook mostra **a URL e a origem**. ⚠ Se o app **não lê** a origem, você acabou de confirmar o achado do módulo 5 — **em runtime**.

---

## 8.5 `lldb`: o que ele dá que o `Frida` não

⚠ **A comparação, e ela é prática:**

| ✅ `lldb` | ⚠ `Frida` |
|---|---|
| ⚠ **Funciona no Nível A** | ⚠ Exige `jailbreak` |
| Breakpoint com pilha completa | ⚠ Hook contínuo |
| ⚠ **Ver variável e registrador** | ⚠ Ver argumento |
| Modificar **parando** | ⚠ Automatizar |
| ⚠ **Símbolos do binário** | ⚠ Nome de método |

⚠ **A primeira linha é a razão de o `lldb` existir neste curso:** ⚠ em app **depurável** e no simulador, ele **funciona sem `jailbreak`** — e é o instrumento do Nível A. ⚠ Ele para o processo e mostra **o estado completo** — o que um hook não faz.

```bash
# ── lldb no simulador (⚠ nivel A) ─────────────────────────
xcrun simctl launch --console-pty booted com.exemplo.app &
PID=$(xcrun simctl spawn booted launchctl list | grep exemplo | awk '{print $1}')

lldb -p "$PID" 2>/dev/null <<'LLDB'
# ⚠ breakpoint por nome de metodo ObjC
br set -n '-[MeuValidador verificar:]'
# ⚠ breakpoint por endereco, quando nao ha simbolo
br set -a 0x100004a20
continue
# ⚠ ao parar:
# po $x0          ⚠ o self
# po $x2          ⚠ o parametro  (⚠ ABI do arm64: x0..x7)
# bt              ⚠ pilha
register read
LLDB
```

⚠ **As três consultas ao parar são o que o `lldb` entrega:** ⚠ os **registradores** — e na ABI `arm64`, os argumentos estão em `x0`–`x7`. ⚠ É a mesma leitura do curso de `Assembly e RE`, com a ABI específica.

⚠ **E o detalhe que o iOS exige:** ⚠ o `lldb` só anexa a app **depurável** — `get-task-allow` (módulo 4). ⚠ **Sem esse entitlement, o `ptrace` é negado** e a depuração não acontece. ⚠ É a razão de o atributo estar na lista de achados.

---

## 8.6 O que a instrumentação prova — e o que não

⚠ **A tabela honesta, e ela é a conclusão deste módulo:**

| O que o hook prova | ⚠ O que ele **não** prova |
|---|---|
| ⚠ **Que o dado chega naquele formato** | ⚠ Que um **terceiro** consegue enviá-lo |
| ⚠ **Que a validação está naquele ponto** | ⚠ Que a validação é **ineficaz** |
| ⚠ **Que forçar o retorno muda o comportamento** | ⚠ Que existe **falha explorável** |
| Que o código **executa** aquele caminho | ⚠ Que o caminho é **alcançável de fora** |
| ⚠ **Que a origem não é verificada** | ⚠ ⚠ **Que qualquer app pode invocar** |

⚠ **A última linha é a mais sutil, e a mais importante do módulo:** ⚠ **que o app não lê a origem** prova que ele **não verifica** — ⚠ mas se **qualquer app** pode invocá-lo depende do **registro do URL scheme** (módulo 2) e das **restrições do sistema**. ⚠ As duas coisas juntas é que produzem o achado.

⚠ **A frase para o relatório, e ela é a mesma do módulo 8 do curso de Android:** ⚠ **hook é prova de análise, não prova de vulnerabilidade.** ⚠ Quem afirma vulnerabilidade a partir de um hook **já está dentro do processo** — e outro app **não está**.

⚠ **A instrumentação, então, tem dois usos legítimos:** ⚠ **entender** (ver o dado, confirmar a hipótese) e ⚠ **medir** (forçar o caminho e ver o que muda). ⚠ Afirmar exploração exige **o caminho de fora** — e isso é o Curso 3.

---

## 8.7 O que registrar

⚠ **A evidência, e ela é a mesma estrutura dos cursos anteriores:**

| Item | ⚠ Por quê |
|---|---|
| ⚠ **Nível (A ou B)** | ⚠ Determina o que vale |
| ⚠ **Script** | ⚠ Reproduzível |
| ⚠ **Classe e seletor** | ⚠ Onde o hook foi posto |
| ⚠ **Valor observado** | ⚠ ⚠ **A evidência** |
| Versão do `Frida` / Xcode | ⚠ Comportamento muda |
| ⚠ **Se houve contorno** | ⚠ Muda a interpretação |
| ⚠ **Saída bruta** | ⚠ Não o resumo |

⚠ **A linha do contorno é a que o módulo 9 cobra:** ⚠ se você **desligou a detecção de `jailbreak`** para instrumentar, o comportamento que observou **vale sob aquela condição** — e o relatório diz isso.

---

## Laboratório 8 — Instrumentar

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Nível A com `lldb`; Nível B para o `Frida`.**

```bash
mkdir -p ~/ios-lab/m08 && cd ~/ios-lab/m08
xcrun simctl install booted ~/ios-lab/alvo/MeuApp.app
```

```javascript
// descoberta.js — o inventario em runtime
if (ObjC.available) {
    console.log("[*] classes de interesse:");
    var alvos = ["Keychain","Token","Auth","Valid","Crypto","Network","URL"];
    for (var cls in ObjC.classes) {
        alvos.forEach(function (p) {
            if (cls.indexOf(p) >= 0) console.log("  " + cls);
        });
    }

    // ⚠ o ponto de entrada externo
    var App = ObjC.classes.AppDelegate;
    if (App) {
        var h = App["- application:openURL:options:"];
        if (h) {
            Interceptor.attach(h.implementation, {
                onEnter: function (a) {
                    var url = new ObjC.Object(a[2]).toString();
                    console.log("[open] URL = " + url);
                    var opt = new ObjC.Object(a[3]);
                    var src = opt.objectForKey_(
                        "UIApplicationOpenURLOptionsSourceApplicationKey");
                    // ⚠ a ORIGEM — o app a usa? (modulo 5)
                    console.log("[open] origem = " + src);
                }
            });
            console.log("[*] hook em openURL instalado");
        } else console.log("[!] openURL nao encontrado");
    }
}
```

```bash
# ── NÍVEL B — Frida (⚠ exige jailbreak) ───────────────────
frida-ps -U | grep -i exemplo
frida -U -f com.exemplo.app -l descoberta.js --no-pause &
sleep 4

# ⚠ provoque a invocacao externa
xcrun simctl openurl booted "meuapp://perfil?id=1" 2>/dev/null || \
  echo "⚠ no aparelho: use o devicectl ou outro app com o URL scheme"

sleep 2
# ⚠ leia a saida: a URL chegou? a origem foi lida?
```

```bash
# ── NÍVEL A — lldb no simulador ───────────────────────────
xcrun simctl launch booted com.exemplo.app
PID=$(xcrun simctl spawn booted launchctl list 2>/dev/null | \
      grep -i exemplo | awk '{print $1}')
echo "pid: $PID"

lldb -p "$PID" 2>/dev/null <<'LLDB' | tee _lldb.txt
br set -n '-[AppDelegate application:openURL:options:]'
continue
LLDB
#    ⚠ na outra janela, dispare o openurl novamente
#    ⚠ e no lldb, ao parar:
#      po $x0     (self)
#      po $x2     (a URL — parametro 1)
#      po $x3     (as options)
#      bt
```

```bash
# ── O FORCE — a validacao e' a unica barreira? ────────────
cat > forcar.js <<'EOF'
if (ObjC.available) {
    var V = ObjC.classes.MeuValidador;
    if (V) {
        var m = V["- autorizado:"];
        if (m) {
            Interceptor.replace(m.implementation, new NativeCallback(function () {
                console.log("[hook] ⚠ forcando autorizado -> true");
                return 1;      // ⚠ YES
            }, 'bool', ['pointer','pointer']));
        }
    }
}
EOF
# ⚠ rode com o app e veja se ele ACEITA o que antes recusava
```

```bash
# ── O REGISTRO ────────────────────────────────────────────
cat > evidencia-m08.md <<'EOF'
# Evidencia de instrumentacao — <app>
Nivel: A | B · Xcode: · Frida:
| Classe / seletor | ⚠ Valor observado | Contorno aplicado? |
|------------------|-------------------|--------------------|
## Saida bruta
```
(cole aqui)
```
## ⚠ O que isso PROVA — e o que NAO prova
EOF
```

**O que observar:** no hook de `openURL`, o valor de **`origem`**. ⚠ Se ele chega **não nulo** e o app **não o usa**, você confirmou o achado do módulo 5 **em runtime** — ⚠ e se `Forcar.js` faz o app aceitar o que recusava, você provou que **a validação era o único obstáculo**.

**Exercício 1:** complete o `evidencia-m08.md` com a **saída bruta** de pelo menos **dois** hooks. ⚠ A seção "o que isso **não** prova" é obrigatória.

**Exercício 2:** liste as classes de interesse encontradas (passo 1 do `descoberta.js`) e **classifique** cada uma: entrada de dado, armazenamento, rede, ou proteção. ⚠ É o mapa do app em runtime.

**Exercício 3 (o que vale):** responda, com evidência: **o app verifica a origem da invocação?** ⚠ Depois escreva a diferença entre *"o app não lê a origem"* e *"qualquer app pode invocá-lo"* — e **o que falta** provar para afirmar a segunda. É a distinção que o Curso 3 vai cobrar.

---

## Resumo

- ⚠ **No iOS, toda mensagem ObjC é indireção** — e é por isso que a instrumentação é uniforme.
- ⚠ **`method swizzling` é o mecanismo nativo** — o ponto de substituição já existe.
- ⚠ **`lldb` funciona no Nível A**; ⚠ **`Frida` exige `jailbreak`**.
- ⚠ **O seletor inclui os dois-pontos** — `verificar:` ≠ `verificar`.
- ⚠ **`openURL` é o ponto de entrada de toda invocação externa** — e o hook mostra URL **e origem**.
- ⚠ **Forçar o retorno prova que a validação é a única barreira** — e **não** prova explorabilidade.
- ⚠ **O `lldb` só anexa app depurável** — `get-task-allow` é o entitlement que permite.
- ⚠ **Hook é prova de análise, não de vulnerabilidade** — outro app não está dentro do processo.
- ⚠ **A origem não lida não equivale a invocação por qualquer app** — as duas coisas é que produzem o achado.

---

## O que o próximo módulo entrega

Você sabe instrumentar. O módulo 9 fecha a parte técnica: **integridade, `jailbreak` e proteções** — o que elas tentam impedir, e por que **encarecem** em vez de impedir.
