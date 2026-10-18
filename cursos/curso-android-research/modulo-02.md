# Módulo 2 — APK, DEX, ART e o `AndroidManifest`

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 2 de 11 · 3 horas
**Pré-requisitos:** Módulo 1
**Próximo:** Módulo 3 — Componentes

---

## O que este módulo entrega

Ao final, você vai saber **abrir um APK**, entender **o que há em cada parte**, e **ler o `AndroidManifest` a ponto de prever o comportamento do app** antes de executá-lo. É o módulo que transforma "instalei e testei" em "li e sei o que ele vai fazer".

---

## 2.1 O APK, parte por parte

⚠ **Um APK é um ZIP. E o conteúdo dele é o mapa do app:**

```
   app.apk (ZIP)
   ├── AndroidManifest.xml   ⚠ BINARIO — as "intencoes" do app
   ├── classes.dex           ⚠ O CODIGO — bytecode, nao Java
   ├── classes2.dex ...      ⚠ variantes (multidex)
   ├── resources.arsc        ⚠ tabela de recursos
   ├── res/                  ⚠ layouts, imagens, XML
   ├── lib/<abi>/            ⚠ ⚠ CODIGO NATIVO — .so por arquitetura
   ├── assets/               ⚠ arquivos arbitrarios, nao compilados
   ├── META-INF/             ⚠ assinatura (v1)
   └── ⚠ assinatura v2/v3 esta no proprio arquivo, nao aqui
```

⚠ **Três partes definem a análise, e cada uma tem um módulo:**

| Parte | ⚠ O que ela é | Módulo |
|---|---|---|
| **`AndroidManifest.xml`** | ⚠ **A intenção declarada** — componentes, permissão | 2 e 3 |
| **`classes.dex`** | ⚠ **O código** — bytecode, reversível | 5 |
| **`lib/<abi>/*.so`** | ⚠ **O código nativo** — onde o difícil mora | 7 |

⚠ **E uma armadilha de leitura:** o `AndroidManifest.xml` **dentro do APK é binário**. ⚠ Um `cat` não mostra XML — mostra bytes. ⚠ É por isso que a ferramenta existe, e é a razão de o primeiro comando de análise ser `apktool` ou `jadx`.

```bash
# O que ha dentro, sem extrair
unzip -l app.apk | head -30
unzip -l app.apk | grep -E '\.so$' | head
# ⚠ a lista de .so diz: o app tem codigo nativo?
# ⚠ e a pasta lib/ diz PARA QUAIS arquiteturas ele foi compilado
```

---

## 2.2 O DEX: por que não é Java

⚠ **A confusão que custa tempo, e vale desfazer de início:**

| Java | ⚠ Android |
|---|---|
| Compila para **`.class`** (JVM) | Compila para **`.dex`** (Dalvik/ART) |
| Uma classe por arquivo | ⚠ **Todas as classes, um arquivo** |
| ⚠ Registrador **por pilha** | ⚠ Registrador **por registrador** |
| `javap` para desmontar | ⚠ `baksmali`, `jadx`, `dexdump` |

⚠ **A segunda linha explica o `multidex`:** como há **um** arquivo, apps grandes estouram o limite — e o `classes2.dex` existe por isso. ⚠ Para a análise, significa que **o código está distribuído**, e a ferramenta precisa olhar **todos** os DEX.

⚠ **A terceira é a que muda o que você lê:** ⚠ o bytecode DEX trabalha com **registradores**, e não com pilha. ⚠ Um descompilador converte para Java legível, e **nem sempre acerta** — quando ele erra, você precisa ler o **smali**.

```bash
# Converter o APK em smali + recursos + manifesto legivel
apktool d app.apk -o app_smali
ls app_smali/
# ⚠ agora AndroidManifest.xml E' XML — o apktool decodificou

# E a versao legivel em Java, para leitura rapida
jadx -d app_jadx app.apk
ls app_jadx/sources/ | head
```

⚠ **A comparação que o módulo instala:** ⚠ `jadx` produz **Java legível** — ótimo para entender a lógica; ⚠ `apktool` produz **smali** — fiel ao bytecode original, e o que você usa quando o `jadx` **não consegue descompilar** (ofuscação, código gerado, fluxo exótico).

⚠ **E a regra prática:** ⚠ quando `jadx` falhar, **o smali é a verdade**. ⚠ O descompilador é conveniência; o bytecode é o que roda.

---

## 2.3 ART: onde o DEX vira código

⚠ **O runtime mudou, e isso muda a análise:**

| Modelo | ⚠ O que acontece |
|---|---|
| **Dalvik (antigo)** | Interpretava o DEX, com JIT |
| ⚠ **ART (atual)** | ⚠ **Compila** para código nativo, `oat` |
| **Instalação** | ⚠ Gera `.oat`/`.vdex` — o código compilado |
| **Perfil** | ⚠ Pode recompilar com o uso (JIT + AOT) |

⚠ **A consequência para o laboratório, e ela é concreta:** ⚠ o código **compilado** fica no aparelho, fora do APK. ⚠ Isso significa que **o que roda não é exatamente o que está no pacote** — e é por isso que a análise estática **e** a dinâmica são complementares, não alternativas.

⚠ **E é a razão de o módulo 8 (instrumentação) existir:** ⚠ hook em runtime alcança o código **como ele está compilado**, com as otimizações aplicadas. ⚠ Ler o DEX mostra a **intenção**; observar a execução mostra o **fato**.

```bash
# Os artefatos de compilacao, no aparelho
adb shell pm path com.exemplo.app
adb shell ls -la /data/app/*/com.exemplo.app*/oat/*/ 2>/dev/null | head
# ⚠ .odex / .vdex / .art — o codigo compilado
```

---

## 2.4 O `AndroidManifest`: a intenção declarada

⚠ **É o documento mais importante da análise estática. Tudo que o app declara está aqui:**

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.exemplo.app">

    <!-- ⚠ O app quer ser instalavel em qual versao -->
    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />

    <!-- ⚠ PERMISSOES declaradas -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

    <!-- ⚠ O BACKUP do app — o que sai dele -->
    <application
        android:allowBackup="true"
        android:debuggable="false"
        android:networkSecurityConfig="@xml/network_security_config"
        android:usesCleartextTraffic="false">

        <!-- ⚠⚠ COMPONENTES — cada um e' uma porta -->
        <activity android:name=".MainActivity"
                  android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service android:name=".SyncService"
                 android:exported="false" />

        <receiver android:name=".BootReceiver"
                  android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

        <!-- ⚠⚠ O provider — o que mais expoe dado -->
        <provider android:name=".DadosProvider"
                  android:authorities="com.exemplo.app.dados"
                  android:exported="true"
                  android:grantUriPermissions="true" />
    </application>
</manifest>
```

⚠ **Cinco atributos decidem a análise, e vale decorá-los:**

| Atributo | ⚠ O que decide |
|---|---|
| **`android:exported`** | ⚠ ⚠ **Quem pode invocar** — a porta mais importante |
| `android:permission` | ⚠ Que permissão **o chamador** precisa ter |
| ⚠ **`android:debuggable`** | ⚠ Se o app aceita depurador — módulo 8 |
| ⚠ **`android:allowBackup`** | ⚠ Se o dado sai por `adb backup` — módulo 9 |
| **`android:networkSecurityConfig`** | ⚠ A política de TLS — Curso 3 |

⚠ **A primeira linha é a que abre o curso:** ⚠ `exported="true"` significa que **qualquer app do aparelho pode invocar aquele componente**, com o dado que quiser. ⚠ É a fronteira "componente ↔ componente" do módulo 1, e é o módulo 3 inteiro.

⚠ **A terceira é a que dá acesso à análise dinâmica:** ⚠ `debuggable="true"` permite `JDWP` — e por isso os apps **de produção** o deixam `false`. ⚠ No lab, o seu app é `true` de propósito.

---

## 2.5 Ler o manifesto como um mapa

⚠ **O método, em quatro passos, e ele **não executa o app**:**

```
   1. EXTRAIA    ->  apktool d (manifesto legivel)
   2. INVENTARIE ->  ⚠ TODOS os componentes e sua exportacao
   3. CRUZE      ->  ⚠ permissao do app vs permissao do componente
   4. PREVEJA    ->  ⚠ o que da' para alcancar de fora
```

⚠ **O passo 3 é o que quase ninguém faz, e o que produz achado:** ⚠ uma permissão declarada **pelo app** não é a mesma coisa que a permissão exigida **do chamador**. ⚠ Um componente exportado **sem** `android:permission` é alcançável por qualquer app — inclusive por um app sem permissão nenhuma.

⚠ **E o passo 4 é a previsão que o laboratório vai confirmar.** ⚠ Você escreve, **antes de testar**, a lista dos componentes alcançáveis de fora e o dado que cada um aceita.

```bash
# O inventario, direto do manifesto
grep -E '<(activity|service|receiver|provider)|android:exported|android:permission' \
     app_smali/AndroidManifest.xml

# ⚠ e a versao "so os exportados"
grep -B2 'android:exported="true"' app_smali/AndroidManifest.xml
```

⚠ **A segunda consulta é o começo de todo trabalho de análise de app Android.** ⚠ Cada linha que ela devolve é uma **porta** — e o módulo 3 ensina a testar cada uma.

---

## Laboratório 2 — Abrir o pacote

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Este lab é inteiramente estático — nenhum app é executado.**

```bash
mkdir -p ~/android-lab/m02 && cd ~/android-lab/m02

# ── 0. O alvo: compile o app de laboratorio ────────────────
# ⚠ O curso traz o esqueleto; o app e' SEU.
#    Alternativa: use um APK do SEU proprio projeto, ou
#    um app de exemplo que voce mesmo compila (Android Studio).
cp ~/android-lab/alvo/app.apk .
ls -la app.apk
```

```bash
# ── 1. O ZIP, por dentro ────────────────────────────────────
unzip -l app.apk | head -25
echo "── nativos:"
unzip -l app.apk | grep '\.so$'
echo "── assets:"
unzip -l app.apk | grep 'assets/' | head

# ⚠ responda: quantas arquiteturas? quantos DEX?
unzip -l app.apk | grep -c 'classes.*\.dex'
```

```bash
# ── 2. Abrir o pacote nas duas ferramentas ──────────────────
apktool d app.apk -o app_smali
jadx -d app_jadx app.apk

echo "── manifesto legivel:"
head -40 app_smali/AndroidManifest.xml

echo "── classes em Java:"
find app_jadx/sources -name '*.java' | head -15
```

```bash
# ── 3. ⚠ O INVENTARIO DE COMPONENTES ────────────────────────
echo "══ COMPONENTES E EXPORTACAO"
grep -E '<(activity|service|receiver|provider)' app_smali/AndroidManifest.xml

echo
echo "══ EXPORTADOS (⚠ as portas)"
grep -B1 'android:exported="true"' app_smali/AndroidManifest.xml

echo
echo "══ PERMISSOES DECLARADAS PELO APP"
grep 'uses-permission' app_smali/AndroidManifest.xml
```

```bash
# ── 4. ⚠ ATRIBUTOS QUE DECIDEM ─────────────────────────────
for a in debuggable allowBackup networkSecurityConfig usesCleartextTraffic; do
  printf "%-26s " "$a"
  grep -o "android:$a=\"[^\"]*\"" app_smali/AndroidManifest.xml || echo "(ausente)"
done
# ⚠ ausente NAO e' o mesmo que `false` — a ausencia tem default
#    ⚠ consulte o default de cada atributo
```

```bash
# ── 5. PREVEJA — antes de testar ───────────────────────────
cat > previsao.md <<'EOF'
# Previsao de superficie — <app>
## Componentes alcancaveis de fora
| Componente | Tipo | exported | permission | O que aceita |
|-----------|------|----------|-----------|--------------|
|           |      |          |           |              |
## Atributos de risco
| Atributo | Valor | ⚠ Consequencia |
|----------|-------|----------------|
|          |       |                |
EOF
# ⚠ preencha ANTES do modulo 3, e confirme la
```

**O que observar:** no passo 4, a diferença entre **ausente** e **`false`**. ⚠ `android:allowBackup` **ausente** significa `true` por padrão — e isso é uma saída de dado que ninguém declarou. ⚠ É a classe de achado mais comum de app Android, e ela está **no manifesto**, não no código.

**Exercício 1:** complete o inventário do passo 3 e a previsão do passo 5. ⚠ Para cada componente exportado, escreva **o que ele aceita** — deduzido só do manifesto e do código.

**Exercício 2:** escolha **um** componente exportado e siga o código dele no `jadx`. ⚠ Escreva, em duas linhas, **o que ele faz com o dado que recebe** — e se **valida** algo.

**Exercício 3 (o que vale):** compare as classes que o `jadx` descompilou com o smali do `apktool` em **uma** função. ⚠ Encontre um ponto onde o Java gerado **não é fiel** ao bytecode (tipagem, exceção, ordem) e escreva por quê. É o raciocínio que sustenta o módulo 5.

---

## Resumo

- ⚠ **Um APK é um ZIP**, e o conteúdo dele é o mapa: manifesto, DEX, recursos, `assets` e **`lib/`**.
- ⚠ **O manifesto dentro do APK é binário** — a ferramenta decodifica, e é o primeiro comando da análise.
- ⚠ **DEX não é Java**: um arquivo para todas as classes, **registradores** no lugar de pilha, `multidex` para apps grandes.
- ⚠ **`jadx` dá Java legível; o smali é a verdade** — quando o descompilador falha, o bytecode decide.
- ⚠ **ART compila** — o que roda no aparelho **não é exatamente** o do pacote. Análise estática e dinâmica são complementares.
- ⚠ **Cinco atributos decidem:** `exported`, `permission`, `debuggable`, `allowBackup` e `networkSecurityConfig`.
- ⚠ **Ausente ≠ `false`** — `allowBackup` ausente é `true`, e é saída de dado não declarada.
- ⚠ **Inventarie todos os exportados antes de executar** — cada um é uma porta.

---

## O que o próximo módulo entrega

Você sabe ler o pacote e prever a superfície. O módulo 3 abre **cada componente**: `Activity`, `Service`, `Receiver` e `Provider` — quem pode invocar, com que dado, e onde a autorização falta.
