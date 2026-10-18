# Módulo 5 — Engenharia Reversa Estática: Ler o Código sem Executar

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 5 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 6 — Análise dinâmica

---

## O que este módulo entrega

Ao final, você vai saber **ler o código de um app Android** sem executá-lo — e, mais importante, **saber quando o descompilador está errado**. Você vai reconstruir a lógica a partir do DEX, seguir o dado do ponto de entrada até o ponto de uso, e reconhecer o que a ofuscação consegue e não consegue esconder.

---

## 5.1 As duas leituras

⚠ **A escolha que define o módulo, e cada uma serve a um propósito:**

| | `jadx` (Java) | ⚠ smali (bytecode) |
|---|---|---|
| O que dá | Lógica legível | ⚠ **Fidelidade ao executado** |
| Quando usar | Entender o fluxo | ⚠ Quando o Java falha |
| Tipagem | ⚠ Pode inventar | ⚠ Exata |
| Controle de fluxo | ⚠ Pode reorganizar | ⚠ Fiel |
| Exceção | ⚠ Agrupa, às vezes errado | Precisa |
| ⚠ Ofuscação | ⚠ Confunde o descompilador | ⚠ **Sempre legível** |

⚠ **A frase que organiza o módulo:**

> **O descompilador é conveniência; o bytecode é a verdade.** Quando os dois discordam, o smali decide.

⚠ **E a consequência prática:** ⚠ um método que o `jadx` mostra como **vazio** pode **não estar vazio** — pode ter código que o descompilador não reconstruiu. ⚠ É o primeiro lugar onde você olha quando a análise estática "não faz sentido".

```bash
# As duas leituras, lado a lado
jadx -d app_jadx app.apk
apktool d app.apk -o app_smali

# ⚠ o mesmo metodo, nas duas
grep -rn "class Validador" app_jadx/sources/
cat app_smali/smali/com/exemplo/app/Validador.smali
```

---

## 5.2 Anatomia do smali

⚠ **O que você precisa saber ler, e nada mais:**

```smali
.method public verificar(Ljava/lang/String;)Z
    .locals 3                          # ⚠ registradores locais

    const-string v0, "PREMIUM"          # v0 = "PREMIUM"
    invoke-virtual {p1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    #              ⚠ p1 = parametro 1  (p0 = this)
    move-result v1                      # v1 = resultado da chamada

    if-eqz v1, :cond_falso              # ⚠ se v1 == 0, vai para o falso

    const/4 v2, 0x1                     # v2 = 1  (true)
    return v2

    :cond_falso
    const/4 v2, 0x0                     # v2 = 0  (false)
    return v2
.end method
```

⚠ **Cinco conceitos, e você lê qualquer smali com eles:**

| Conceito | ⚠ O que significa |
|---|---|
| **`.locals`** | Número de registradores locais |
| ⚠ **`v0`, `v1` …** | Registradores locais |
| ⚠ **`p0`, `p1` …** | ⚠ **Parâmetros** — `p0` é `this` em método de instância |
| **`invoke-*`** | Chamada — `virtual`, `static`, `direct`, `interface` |
| ⚠ **`move-result`** | ⚠ Pega o retorno da **última** chamada |

⚠ **A terceira linha é a que mais confunde no começo:** ⚠ em método **de instância**, `p0` é o `this`, e o primeiro parâmetro é `p1`. ⚠ Em método **estático**, o primeiro parâmetro é `p0`. ⚠ Contar errado desloca **toda** a leitura.

⚠ **E os desvios, que são o que você segue para entender o fluxo:**

| Instrução | ⚠ Significa |
|---|---|
| `if-eqz` / `if-nez` | ⚠ Igual/≠ a **zero** |
| `if-eq` / `if-ne` | ⚠ Igual/≠ entre **dois** valores |
| `if-lt` / `if-ge` … | Comparação numérica |
| **`goto`** | Salto incondicional |
| ⚠ **`:cond_XX`** | ⚠ **Rótulo de destino** |

⚠ **A leitura de segurança está nos desvios:** ⚠ a validação aparece como **um `if` que pula para o caminho de erro** — e o que importa é **para onde** ele pula. ⚠ Uma correção de bug é, quase sempre, **um `if` que passou a existir**.

---

## 5.3 Rastrear o dado

⚠ **O método central do módulo: seguir um valor do ponto de entrada até o ponto de uso.**

```
   PONTO DE ENTRADA                    PONTO DE USO
   ────────────────                    ────────────

   getIntent().getStringExtra("x") ──► ⚠ o que faz com isso?

   ⚠ no meio: quantas verificacoes existem?
     - checa null?
     - checa formato?
     - compara com allowlist?
     - ⚠ ou vai direto para o uso?
```

⚠ **Os quatro pontos de entrada que importam neste curso:**

| Entrada | ⚠ De onde vem o dado |
|---|---|
| `getIntent().get*Extra()` | ⚠ Outro app (módulo 3) |
| `getStringExtra` em `Service` | Idem |
| ⚠ **Método `AIDL`** | ⚠ Outro app, por `Binder` |
| ⚠ **Parâmetro de `JNI`** | ⚠ Código nativo (módulo 7) |
| `Binder.getCallingUid()` | ⚠ O sistema — **é a informação, não o risco** |

⚠ **A última linha merece a distinção, porque ela é a que a análise procura:** ⚠ `getCallingUid()` é o **dado correto**. ⚠ O achado não é a chamada existir — é o **código que faz a operação sem antes consultá-la**.

⚠ **O método de rastreio, em três passos:**

```bash
# 1. Onde o dado entra
grep -rn 'getIntent\|getStringExtra\|getParcelableExtra\|getIntExtra' \
     app_jadx/sources/ | head -20

# 2. ⚠ Onde ele e' usado — siga a variavel
#    (⚠ manualmente no jadx, ou por grep do nome da variavel)
grep -rn 'usuarioId\|user_id' app_jadx/sources/ | head -30

# 3. O que existe ENTRE a entrada e o uso
#    ⚠ esse intervalo e' o achado — ou a ausencia dele
```

⚠ **O passo 3 é o que a análise entrega.** ⚠ *"O dado entra aqui, é usado ali, e no caminho não há verificação nenhuma"* — essa é a frase de causa raiz. ⚠ É a mesma fórmula do módulo 11 do curso de Web Apps.

---

## 5.4 Ofuscação: o que ela esconde

⚠ **A tabela honesta, e ela é o que o módulo precisa entregar:**

| Técnica | ✅ Esconde | ⚠ **Não** esconde |
|---|---|---|
| **Renomear** (`a`, `b`, `c`) | Nomes | ⚠ **Fluxo e chamada de API** |
| **Remover log** | Mensagem | ⚠ Lógica |
| **Ofuscar string** | ⚠ Texto literal | ⚠ **Onde a string é usada** |
| **Cifrar string** | Idem | ⚠ A chamada de decifra |
| ⚠ **Ofuscar fluxo** | ⚠ Legibilidade | ⚠ **Comportamento** |
| **Packing / carregador** | ⚠ O DEX original | ⚠ O carregador **executa** |
| ⚠ **Nativo** | ⚠ O que está no `.so` | ⚠ **Que o `.so` existe** |

⚠ **A segunda linha é a que salva a análise:** ⚠ mesmo com tudo renomeado, **as chamadas de API do Android mantêm o nome** — `getStringExtra`, `execSQL`, `loadLibrary`, `getCallingUid`. ⚠ É por elas que você navega.

⚠ **E a última linha é a que liga ao módulo 7:** ⚠ mover a lógica para o nativo **não a esconde** — apenas **muda onde você olha**. ⚠ O `.so` está no APK, e é legível.

⚠ **A regra prática de leitura, e ela é o que economiza tempo:**

```
   1. NAO leia o codigo todo
   2. ⚠ COMECE pelas chamadas de API conhecidas
        (o que o app FAZ no sistema)
   3. ⚠ SUBA do uso para a entrada
   4. ⚠ PERGUNTE: o que ha ENTRE os dois?
```

⚠ **O passo 2 é a inversão que faz a análise escalar:** ⚠ em vez de ler da entrada para a saída, você **começa pelo efeito** — e sobe. ⚠ É a mesma inversão do módulo 11 do curso de Windows Internals: **subir é mais fácil que descer**.

---

## 5.5 O que a estática não vê

⚠ **A delimitação, e ela prepara o módulo 6:**

| ✅ A estática vê | ⚠ A estática **não** vê |
|---|---|
| O que o código **pretende** | ⚠ O que ele **faz em execução** |
| Caminho **declarado** | ⚠ Caminho **tomado** |
| ⚠ Constante **no pacote** | ⚠ Valor **calculado em runtime** |
| Classe e método | ⚠ ⚠ **Código gerado em runtime** |
| Configuração do manifesto | ⚠ Configuração **alterada** em runtime |
| ⚠ **O que está no APK** | ⚠ **O que o ART compilou** (módulo 2) |

⚠ **A quarta linha é a que mais surpreende:** ⚠ código carregado **depois** da instalação — de `assets`, de rede, de `DexClassLoader` — **não está no DEX** que você leu. ⚠ É a razão de a análise estática **sozinha** nunca bastar.

⚠ **E a última é a do módulo 2:** ⚠ o ART compila, e otimiza. ⚠ O que roda é uma **tradução** do DEX — e é por isso que o módulo 6 existe.

⚠ **A conclusão do módulo, escrita para o relatório:** ⚠ a análise estática produz **hipótese**, não conclusão. ⚠ Ela diz *"o código não valida o `extra`"* — e a conclusão é *"outro app consegue enviar o valor e o app aceita"*, que só o módulo 6 confirma.

---

## Laboratório 5 — Ler o código

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Este lab é inteiramente estático.**

```bash
mkdir -p ~/android-lab/m05 && cd ~/android-lab/m05
cp ../m02/app.apk .
jadx -d app_jadx app.apk
apktool d app.apk -o app_smali
```

```bash
# ── 1. O inventario de chamadas — o que o app FAZ ───────────
echo "══ entrada de dado externo"
grep -rn 'getIntent\|Extra(' app_jadx/sources/ | grep -v '//' | head -20

echo
echo "══ operacoes sensiveis"
grep -rn 'execSQL\|rawQuery\|Runtime.getRuntime\|ProcessBuilder\|'\
'openFileOutput\|Cipher\|MessageDigest' app_jadx/sources/ | head -20

echo
echo "══ rede"
grep -rn 'HttpURLConnection\|OkHttp\|URL(' app_jadx/sources/ | head -15

echo
echo "══ nativo"
grep -rn 'loadLibrary\|native ' app_jadx/sources/ | head -15
```

```bash
# ── 2. ⚠ RASTREIE um dado — do extra ate o uso ─────────────
#    Escolha UM dos pontos de entrada do passo 1:
ENTRADA=$(grep -rln 'getStringExtra' app_jadx/sources/ | head -1)
echo "arquivo: $ENTRADA"
sed -n '1,80p' "$ENTRADA"
# ⚠ anote: o nome da variavel que recebeu o extra
# ⚠ depois procure TODOS os usos dela
#    grep -rn "<nome-da-variavel>" app_jadx/sources/
```

```bash
# ── 3. ⚠ A LECTURA EM SMALI — quando o Java falha ──────────
#    Escolha o metodo que contem a validacao (ou a ausencia dela)
CLS=$(basename "$ENTRADA" .java)
find app_smali -name "$CLS.smali"
# ⚠ leia o metodo:
SM=$(find app_smali -name "$CLS.smali" | head -1)
grep -n -A40 'invoke.*getStringExtra' "$SM" | head -60
#    ⚠ identifique: ha um `if` entre o `move-result` e o uso?
```

```bash
# ── 4. ⚠ COMPARE as duas leituras ──────────────────────────
#    Encontre um metodo onde o jadx e o smali DIVERGEM
diff <(sed -n '1,60p' "$ENTRADA") /dev/null >/dev/null 2>&1
#    ⚠ criterio pratico: procure um metodo que o jadx mostra
#      como vazio ou trivial, e confira no smali
grep -n -B2 -A8 '.method' "$SM" | grep -A8 'return-void' | head -30
```

```bash
# ── 5. O RELATORIO DA LEITURA ──────────────────────────────
cat > leitura.md <<'EOF'
# Leitura estatica — <app>
## Pontos de entrada de dado externo
| Arquivo/metodo | Fonte | ⚠ Verificacao no caminho? |
|----------------|-------|---------------------------|
|                |       |                           |
## Operacoes sensiveis
| Operacao | Onde | ⚠ Os argumentos vem de fora? |
|----------|------|------------------------------|
|          |      |                              |
## ⚠ HIPOTESES (a confirmar no modulo 6)
1.
2.
EOF
```

**O que observar:** no passo 3, **a ausência de um `if` entre o `move-result` e o uso**. ⚠ Em smali, a validação é **visível como instrução** — e a falta dela é **igualmente visível**. ⚠ É o que torna a análise estática conclusiva sobre *"há validação?"*, mesmo sem executar.

**Exercício 1:** complete o `leitura.md` com pelo menos **três** hipóteses. ⚠ Cada uma no formato: *"o dado X entra em Y e é usado em Z sem verificação"*.

**Exercício 2:** encontre **um** ponto onde o `jadx` e o smali **divergem** — um método que o Java mostra diferente do bytecode. ⚠ Escreva os dois trechos e a diferença. É o exercício que ensina quando confiar em cada ferramenta.

**Exercício 3 (o que vale):** pegue **uma** das hipóteses e escreva a **frase de causa raiz** — com o arquivo e a linha. ⚠ Formato: *"o `extra` `usuario_id` é lido em `X.java:42` e usado em `Y.java:88` sem verificação de posse"*. É exatamente o que o módulo 6 vai confirmar e o módulo 11 vai reportar.

---

## Resumo

- ⚠ **Duas leituras:** `jadx` para a lógica, **smali para a verdade** — quando discordam, o bytecode decide.
- ⚠ **Cinco conceitos leem qualquer smali:** `.locals`, `v*`, ⚠ **`p*` (com `p0` = `this`)**, `invoke-*` e `move-result`.
- ⚠ **O desvio é o que se lê:** a validação é **um `if` que pula** — e a sua ausência também é visível.
- ⚠ **Rastreie o dado da entrada ao uso, e olhe o intervalo** — o achado está **entre** os dois.
- ⚠ **Comece pelas chamadas de API conhecidas e SUBA** — subir é mais fácil que descer.
- ⚠ **Ofuscação renomeia, não esconde fluxo** — e as APIs do sistema mantêm o nome.
- ⚠ **Mover a lógica para o nativo não a esconde** — só muda onde você olha.
- ⚠ **A estática produz hipótese:** ela não vê código gerado em runtime, nem o que o ART compilou.

---

## O que o próximo módulo entrega

Você sabe ler o código. O módulo 6 **confirma na execução**: observação de comportamento, `logcat`, `strace` e o que o app realmente faz — inclusive o que a estática não viu.
