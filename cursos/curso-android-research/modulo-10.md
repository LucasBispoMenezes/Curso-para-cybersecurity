# Módulo 10 — Mecanismos de Proteção e Anti-Análise

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 10 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 9
**Próximo:** Módulo 11 — Projeto final

---

## O que este módulo entrega

Ao final, você vai saber **reconhecer** as proteções de um app Android, **dizer o que cada uma tenta impedir**, e avaliar **o que ela consegue de fato**. É o módulo que fecha o arco do curso: você viu as falhas nos módulos 3 a 9, e aqui vê **o que o autor tentou fazer contra isso** — e por que a tentativa **encarece** em vez de impedir.

---

## 10.1 A tese, e ela é a de todo o curso

⚠ **A afirmação que organiza o módulo:**

> **Nenhuma proteção impede a análise. Todas encarecem — e o custo é assimétrico: o autor
> paga uma vez, e quem analisa paga a CADA VERSÃO.**

⚠ **E a razão da assimetria, dita sem rodeio:** ⚠ a proteção **mora no aparelho**, e quem analisa **controla o aparelho**. ⚠ Toda verificação que o app faz **passa por código que roda sob o controle de quem analisa** — e pode ser observada, alterada ou desviada.

⚠ **A única exceção parcial, e vale nomeá-la:** ⚠ verificação feita **fora** do app — no **servidor**, ou por **atestação de hardware** (`SafetyNet`/`Play Integrity`). ⚠ Isso **não** é análise impedida; é **confiança no ambiente** — e é o Curso 3 que trata disso.

---

## 10.2 As seis famílias de proteção

⚠ **A tabela que o módulo entrega, e cada linha é um achado de análise:**

| # | Família | ⚠ O que tenta impedir | ⚠ O que consegue |
|---|---|---|---|
| 1 | **Detecção de `root`** | Aparelho comprometido | ⚠ Nada — só atrasa |
| 2 | ⚠ **Detecção de instrumentação** | ⚠ `Frida`, depurador | ⚠ Nada — só atrasa |
| 3 | **Verificação de assinatura** | App modificado/recompilado | ⚠ Impede — até você patchá-la |
| 4 | **Verificação de integridade** | DEX/`.so` alterados | ⚠ Idem |
| 5 | ⚠ **Ofuscação** | ⚠ Leitura | ⚠ Nada — só encarece |
| 6 | ⚠ **Criptografia de string** | ⚠ Strings em claro | ⚠ A chave **está no app** |
| 7 | **Nativo** | Análise por `jadx` | ⚠ Muda a ferramenta |

⚠ **A diferença entre as três primeiras e as outras é a natureza:**

```
   DETECCAO (1, 2)          VERIFICACAO (3, 4)
   ───────────────          ──────────────────

   ⚠ "o ambiente e' hostil?"  ⚠ "eu fui alterado?"
      -> o app ESCOLHE        -> o app COMPARA
         reagir                  com um valor
                                ⚠ que esta NELE
```

⚠ **A distinção importa porque a correção é diferente:** ⚠ detecção se **contorna** (módulo 8); verificação se **patcha** — e patchá-la exige **entender onde o valor esperado está**.

⚠ **E a sexta linha é a mais instrutiva:** ⚠ strings cifradas no DEX protegidas por uma chave **que precisa estar no app** para funcionar. ⚠ A chave é **recuperável** — e recuperá-la é uma questão de tempo, não de possibilidade. ⚠ É o mesmo raciocínio do módulo 11 do curso de Linux Internals sobre segredo embutido.

---

## 10.3 Detecção de `root`

⚠ **O padrão que você vai encontrar, e o que ele revela:**

```java
// ⚠ as quatro checagens classicas — todas no proprio app
boolean temRoot() {
    // 1. binarios conhecidos
    String[] paths = {"/system/bin/su", "/system/xbin/su",
                      "/sbin/su", "/system/app/Superuser.apk"};
    for (String p : paths) if (new File(p).exists()) return true;

    // 2. pacotes de gerenciador
    PackageManager pm = getPackageManager();
    try { pm.getPackageInfo("eu.chainfire.supersu", 0); return true; }
    catch (Exception ignored) {}

    // 3. execucao de `su`
    try { Runtime.getRuntime().exec("su"); return true; }
    catch (Exception ignored) {}

    // 4. propriedade de build
    return Build.TAGS != null && Build.TAGS.contains("test-keys");
}
```

⚠ **O que cada checagem revela, e como cada uma se contorna:**

| Checagem | ⚠ Contorno | ⚠ Custo que ela impõe |
|---|---|---|
| Arquivo existe | Hook em `File.exists` | ⚠ Baixo |
| Pacote instalado | Hook em `PackageManager` | ⚠ Baixo |
| `Runtime.exec("su")` | Hook em `Runtime.exec` | ⚠ Baixo |
| `Build.TAGS` | ⚠ Modificar propriedade | ⚠ Médio |

⚠ **A leitura de segurança, e ela é o que o relatório precisa dizer:** ⚠ **toda checagem é local, e portanto observável** (módulo 8). ⚠ O `hook_app.js` do módulo 8 já contornou a primeira — e o padrão se repete **para todas**.

⚠ **E a contrapartida honesta:** ⚠ o contorno **pode quebrar o app legítimo**. ⚠ Um `File.exists` que devolve `false` para `/su` pode devolver `false` para um arquivo legítimo que casou com o padrão. ⚠ É a razão de o contorno ser **cirúrgico** — e de ele precisar ser **refeito a cada versão**.

---

## 10.4 Verificação de assinatura e integridade

⚠ **A família que **realmente** impede — até ser patchada:**

```java
// ⚠ a verificacao tipica
private boolean assinaturaOk() {
    try {
        PackageInfo pi = getPackageManager().getPackageInfo(
            getPackageName(), PackageManager.GET_SIGNATURES);
        String atual = sha256(pi.signatures[0].toByteArray());
        // ⚠ o valor esperado esta NO APP
        return atual.equals("a1b2c3d4e5f6...");
    } catch (Exception e) { return false; }
}
```

⚠ **A estrutura do problema, e ela é sempre a mesma:**

```
   ⚠ O VALOR ESPERADO ESTA NO APP.

      significa que:
        1. ele e' LEGIVEL (jadx / smali / strings)
        2. a COMPARACAO e' observavel (hook)
        3. e o RESULTADO e' alteravel (hook)

   ⚠ Logo: a verificacao nao e' uma barreira —
        e' uma LINHA que voce altera.
```

⚠ **A consequência para o relatório, e ela é o que evita exagero:** ⚠ uma verificação de assinatura **não torna o app impossível de modificar** — torna **custoso**, e o custo é **maior** que a detecção de `root`. ⚠ O que ela consegue é **desencorajar** o atacante casual, e **elevar o tempo** de quem insiste.

⚠ **A variante que muda o jogo é a que roda no nativo (módulo 7):** ⚠ a mesma verificação em `.so` exige `gdb` ou `Frida` nativo — e **não** é observável pelo `jadx`. ⚠ É a razão de o código sensível migrar para o nativo, e é onde o módulo 7 se conecta.

```bash
# ⚠ Onde a verificacao esta
grep -rn 'getPackageInfo\|GET_SIGNATURES\|getSigningInfo\|'\
'sha256\|MessageDigest\|checkSum' ../m05/app_jadx/sources/ | head

# ⚠ e as strings da verificacao
strings ../m07/libs/lib/*/*.so 2>/dev/null | \
  grep -E '^[a-f0-9]{32,128}$' | head
#    ⚠ um hash hex solto no .so e' o valor esperado
```

---

## 10.5 Ofuscação e criptografia de string

⚠ **O que a ofuscação faz, e o que ela não faz:**

| Técnica | ✅ Dificulta | ⚠ **Não** impede |
|---|---|---|
| Renomear classe/método | Navegação | ⚠ Fluxo e chamada de API |
| **Remover `Log`** | ⚠ ⚠ **O log do módulo 6** | ⚠ Comportamento |
| ⚠ **Strings cifradas** | Leitura direta | ⚠ A **chamada de decifra** |
| **Fluxo "flattening"** | Legibilidade | ⚠ A execução |
| ⚠ **Packing / carregador** | ⚠ O DEX **original** | ⚠ O carregador **roda** |
| **Anti-`jadx`** | ⚠ O descompilador | ⚠ O smali |

⚠ **A terceira linha é a que mais aparece, e a que o curso já resolveu:** ⚠ strings cifradas exigem uma **função de decifra** — e é essa função que você **hooka** (módulo 8). ⚠ O script do lab intercepta a chamada e **vê a string em claro** no retorno.

```javascript
// ⚠ O contorno da string cifrada — o padrao
Java.perform(function () {
    var D = Java.use("com.exemplo.app.Decifrador");
    D.decifrar.overload('java.lang.String').implementation = function (s) {
        var r = this.decifrar(s);
        console.log("[dec] " + s + " -> " + r);   // ⚠ a string em CLARO
        return r;
    };
});
```

⚠ **A quinta linha do quadro é a que exige mais, e vale explicar:** ⚠ um app com **carregador** traz um DEX mínimo que **decifra o DEX real** e o carrega por `DexClassLoader`. ⚠ O DEX real **não está no APK** — está em `assets` ou em rede. ⚠ O contorno é **instrumentar o carregamento**: ⚠ hookar `DexClassLoader` e **salvar o DEX** que ele carrega.

```javascript
// ⚠ Capturar o DEX carregado em runtime
Java.perform(function () {
    var DCL = Java.use("dalvik.system.DexClassLoader");
    DCL.$init.overload('java.lang.String', 'java.lang.String',
                        'java.lang.String', 'java.lang.ClassLoader')
       .implementation = function (dexPath, opt, lib, parent) {
        console.log("[loader] DEX carregado de: " + dexPath);
        return this.$init(dexPath, opt, lib, parent);
    };
});
```

⚠ **A arquitetura é a mesma de todo o curso:** ⚠ a proteção **existe no runtime**, e é **no runtime** que ela se observa. ⚠ O módulo 2 já avisou: ⚠ **o que roda não é o que está no pacote** — e é aqui que isso se torna útil.

---

## 10.6 O que a proteção entrega, de fato

⚠ **A tabela honesta, e ela é o produto do módulo:**

| Objetivo do autor | ⚠ O que a proteção consegue |
|---|---|
| Impedir a leitura do código | ⚠ Nada — encarece |
| Impedir a execução em aparelho `root` | ⚠ Nada — o app **precisa rodar** |
| Impedir a modificação | ⚠ Atraso — até o patch |
| Impedir a cópia do dado | ⚠ Parcial — o backup (módulo 9) é defesa real |
| ⚠ **Impedir o abuso de API** | ⚠ **Só com verificação no SERVIDOR** |
| ⚠ **Dificultar o trabalho em escala** | ✅ **Isso ela consegue** |

⚠ **A quinta linha é a conclusão do curso, e ela liga ao Curso 3:** ⚠ **nenhuma proteção no app impede o abuso** — porque o app **precisa funcionar** no aparelho do atacante. ⚠ O que impede é o **servidor** que **não confia** no app.

⚠ **A sexta é o que a proteção **realmente** entrega:** ⚠ ela **eleva o custo** de analisar **em escala**. ⚠ Um app ofuscado custa horas a mais **por versão** — e é isso que desencoraja a análise **industrial**, não a análise **pontual**.

⚠ **E a quarta merece o crédito que o curso dá:** ⚠ `allowBackup="false"` e o escopo correto de armazenamento **são** defesas reais — porque **removem o dado** da superfície, em vez de esconder o caminho. ⚠ É a mesma lição do módulo 8 do curso de LLM: **reduzir a superfície** ganha de **esconder**.

---

## Laboratório 10 — Mapear e contornar

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Aparelho com `root` e `Frida` (módulo 8).**

```bash
mkdir -p ~/android-lab/m10 && cd ~/android-lab/m10
adb install -r ../m03/alvo/app-release.apk
cp -r ../m05/app_jadx .   # ⚠ para a analise estatica
cp -r ../m07/libs .       # ⚠ para o nativo
```

```bash
# ── 1. O INVENTARIO DE PROTECOES — estatico ────────────────
echo "══ deteccao de root"
grep -rn '/su\|superuser\|magisk\|test-keys\|Build.TAGS' app_jadx/sources/ | head

echo "══ deteccao de instrumentacao"
grep -rn 'frida\|27042\|ptrace\|isDebuggerConnected\|'\
'Debug.isDebuggerConnected' app_jadx/sources/ | head

echo "══ verificacao de assinatura / integridade"
grep -rn 'GET_SIGNATURES\|getSigningInfo\|MessageDigest\|checkSum\|'\
'getPackageInfo' app_jadx/sources/ | head

echo "══ carregador / DEX dinamico"
grep -rn 'DexClassLoader\|PathClassLoader\|loadDex' app_jadx/sources/ | head

echo "══ no NATIVO"
for f in libs/lib/*/*.so; do
  echo "-- $f"
  strings -n 4 "$f" 2>/dev/null | \
    grep -iE 'frida|magisk|/su\b|ptrace|integrity|tamper|debug' | head -5
done
```

```javascript
// contornar.js — as tres protecoes do modulo
Java.perform(function () {
    // ⚠ 1. DETECCAO DE ROOT — as quatro checagens classicas
    var File = Java.use("java.io.File");
    File.exists.implementation = function () {
        var p = this.getAbsolutePath();
        if (/\/su\b|superuser|magisk/i.test(p)) {
            console.log("[root] " + p + " -> false");
            return false;
        }
        return this.exists();
    };

    var Runtime = Java.use("java.lang.Runtime");
    Runtime.exec.overload('java.lang.String').implementation = function (c) {
        if (/^su\b/.test(c)) {
            console.log("[root] exec('su') -> bloqueado");
            throw Java.use("java.io.IOException").$new("no su");
        }
        return this.exec(c);
    };

    // ⚠ 2. DETECCAO DE INSTRUMENTACAO
    var Debug = Java.use("android.os.Debug");
    Debug.isDebuggerConnected.implementation = function () {
        console.log("[dbg] isDebuggerConnected -> false");
        return false;
    };

    // ⚠ 3. VERIFICACAO DE ASSINATURA
    try {
        var PM = Java.use("android.content.pm.PackageManager");
        // ⚠ interceptar a comparacao exige ver a CLASSE do app
        var V = Java.use("com.exemplo.app.Integridade");
        V.assinaturaOk.implementation = function () {
            console.log("[sig] assinaturaOk -> true");
            return true;               // ⚠ ignora a comparacao
        };
    } catch (e) { console.log("[!] " + e); }

    // ⚠ 4. STRING CIFRADA — ver em claro
    try {
        var D = Java.use("com.exemplo.app.Decifrador");
        D.decifrar.overload('java.lang.String').implementation = function (s) {
            var r = this.decifrar(s);
            console.log("[dec] -> " + r);
            return r;
        };
    } catch (e) { console.log("[!] " + e); }
});
```

```bash
# ── 2. RODE — antes e depois do contorno ───────────────────
echo "══ ANTES"
frida -U -f com.exemplo.app -l /dev/null --no-pause 2>/dev/null || \
  adb shell am start -n com.exemplo.app/.MainActivity
sleep 2
adb logcat -d | grep -iE 'root|debug|integrity|bloque' | tail -5

echo "══ COM contorno"
adb shell am force-stop com.exemplo.app
frida -U -f com.exemplo.app -l contornar.js --no-pause &
sleep 4
adb logcat -d | grep -iE 'root|debug|integrity' | tail -10
# ⚠ o app mudou de comportamento?
```

```bash
# ── 3. ⚠ CARREGADOR — capturar o DEX dinamico ──────────────
cat > loader.js <<'EOF'
Java.perform(function () {
    var DCL = Java.use("dalvik.system.DexClassLoader");
    var ctor = DCL.$init;
    ctor.overload('java.lang.String','java.lang.String',
                  'java.lang.String','java.lang.ClassLoader')
        .implementation = function (p, o, l, par) {
        console.log("[loader] ⚠ DEX em: " + p);
        return ctor.call(this, p, o, l, par);
    };
});
EOF
frida -U -f com.exemplo.app -l loader.js --no-pause &
sleep 4
# ⚠ se aparecer caminho de DEX, o app carrega codigo DINAMICO
#    ⚠ e esse DEX nao esta no APK — o modulo 5 nao o viu
```

```bash
# ── 4. O RELATORIO ─────────────────────────────────────────
cat > protecoes.md <<'EOF'
# Protecoes encontradas — <app>
| # | Protecao | Onde | ⚠ O que tenta impedir | ⚠ O que consegue |
|---|----------|------|-----------------------|------------------|
## Contornos aplicados
| Protecao | Contorno | ⚠ Quebrou algo legitimo? |
|----------|----------|--------------------------|
## ⚠ O que NAO consegui contornar, e por que
EOF
```

**O que observar:** no passo 2, a diferença **antes e depois** do contorno. ⚠ E no passo 3, a linha `[loader] DEX em: ...` — se aparecer, o app **carrega código que não está no APK**, e a análise estática do módulo 5 **não cobriu o app inteiro**. ⚠ É o achado que liga este módulo ao 5.

**Exercício 1:** complete o `protecoes.md` com todas as proteções encontradas e **o que cada uma consegue**. ⚠ A terceira coluna precisa dizer **o que ela tenta impedir** — não "tem proteção".

**Exercício 2:** para cada contorno aplicado, responda: **ele quebrou algo legítimo?** ⚠ Se sim, refaça-o de forma cirúrgica. É o custo do 10.3, na prática.

**Exercício 3 (o que vale):** escreva o **parágrafo de conclusão** do módulo: para este app, **a proteção muda o que o atacante consegue?** ⚠ Use a tabela do 10.6 como referência, e responda a pergunta que fecha o curso: *o que impede o abuso é a proteção do app, ou a verificação no servidor?*

---

## Resumo

- ⚠ **Nenhuma proteção impede a análise; todas encarecem** — e o custo é **assimétrico**.
- ⚠ **A proteção mora no aparelho, e quem analisa controla o aparelho** — por isso toda verificação passa por código observável.
- **Sete famílias:** `root`, instrumentação, assinatura, integridade, ofuscação, string cifrada e nativo.
- ⚠ **Detecção se contorna; verificação se patcha** — e patchá-la exige achar **o valor esperado, que está no app**.
- ⚠ **String cifrada protegida por chave que precisa estar no app** — a chave é recuperável; é questão de tempo.
- ⚠ **Carregador (`DexClassLoader`) traz código que não está no APK** — e a análise estática não o viu.
- ⚠ **A única defesa real no app é a que REMOVE o dado** — `allowBackup="false"`, escopo correto.
- ⚠ **O abuso se impede no SERVIDOR, não no app** — a conclusão que abre o Curso 3.

---

## O que o próximo módulo entrega

Você tem todo o ferramental. O módulo 11 fecha o curso: **a análise completa de um app**, com relatório reproduzível — e a entrega tem a coluna que qualifica tudo: **como cada dado foi obtido**.
