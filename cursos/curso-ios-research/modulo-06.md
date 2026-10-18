# Módulo 6 — Análise Estática de Binário

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 6 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 5
**Próximo:** Módulo 7 — Análise dinâmica

---

## O que este módulo entrega

Ao final, você vai saber **ler um binário iOS** sem executá-lo — reconstruir a lógica a partir da desmontagem, seguir o dado do ponto de entrada até o uso, e **saber o que a análise estática não alcança**. É o módulo que transforma o mapa do módulo 2 em entendimento do código.

---

## 6.1 As ferramentas, e o que cada uma dá

⚠ **Cinco ferramentas, e cada uma responde uma pergunta:**

| Ferramenta | ⚠ O que ela dá |
|---|---|
| **`otool`** | Cabeçalho, `load commands`, seções, desmontagem |
| **`nm`** | ⚠ Símbolos — nome e endereço |
| **`strings`** | ⚠ ⚠ **Literal** — a mais rápida |
| **`jtool2`/`ipsw`** | ⚠ Análise e extração, com decifração |
| ⚠ **Ghidra / Hopper** | ⚠ ⚠ **Decompilação** — pseudo-código |

⚠ **A ordem de uso, e ela importa:** ⚠ `strings` **primeiro** (é a mais rápida e a que mais rende), ⚠ depois `nm` (símbolos), ⚠ depois desmontagem **localizada** (só o que interessa). ⚠ Ler o binário inteiro não escala.

⚠ **A frase que organiza o módulo:**

> **Você não lê o binário inteiro. Você lê o que uma pergunta aponta.**

⚠ **E a razão de o `strings` vir primeiro:** ⚠ URL, mensagem de erro, formato, nome de classe e **nome de proteção** são **literais** — e são lidos em segundos. ⚠ É a mesma técnica do módulo 7 do curso de Android, e a mesma do módulo 12 do Windows Internals.

---

## 6.2 `strings`: o mapa em trinta segundos

⚠ **O que procurar, e o que cada categoria revela:**

| Categoria | ⚠ O que revela |
|---|---|
| **URL** | ⚠ ⚠ Endereço da API, e o esquema |
| ⚠ **SQL** | ⚠ ⚠ **Consultas — e como são montadas** |
| **Mensagem de erro** | ⚠ O que o autor considerou possível |
| **Formato** | `%s`, `%@` — como o dado é composto |
| ⚠ **Nome de proteção** | ⚠ ⚠ `jailbreak`, `frida`, `ptrace` |
| **Chave de `.plist`** | ⚠ ⚠ **Onde o dado é guardado** |
| **Caminho** | ⚠ `/Documents`, `/Library` |

⚠ **As duas do meio merecem a atenção, porque são as que rendem achado:**

⚠ **Mensagem de erro** é subestimada: ⚠ ela é escrita **para o caso que o autor previu**. ⚠ Um app que trata `invalid_token` e `expired_session` **tem** esses conceitos no código — e é por isso que ela é achado de análise.

⚠ **E o nome de proteção é o atalho do módulo 9:** ⚠ `grep -i 'jailbreak\|frida\|ptrace'` acha **o mecanismo** sem ler uma instrução — e é o mesmo movimento do módulo 3, seção 2.

```bash
# O mapa rapido
BIN=MeuApp

echo "══ endpoints"
strings -n 8 "$BIN" | grep -oE 'https?://[^"<> ]+' | sort -u | head -20

echo "══ SQL"
strings -n 6 "$BIN" | grep -iE 'SELECT|INSERT|UPDATE|DELETE|FROM ' | head -15

echo "══ chaves de plist / keychain"
strings -n 6 "$BIN" | grep -iE 'kSec|NSUserDefaults|\.plist|Keychain' | sort -u | head -20

echo "══ ⚠ protecao"
strings -n 5 "$BIN" | grep -iE 'jailbreak|cydia|frida|substrate|ptrace|debugger|tamper' | sort -u

echo "══ mensagens de erro"
strings -n 8 "$BIN" | grep -iE 'invalid|failed|error|denied|expired|unauth' | head -20
```

⚠ **As cinco consultas são o começo de toda análise**, e produzem em **um minuto** o que a desmontagem levaria horas para levantar.

---

## 6.3 Símbolos e desmontagem

⚠ **O que `nm` dá, e o que ele **não** dá:**

| ✅ `nm` lista | ⚠ `nm` não dá |
|---|---|
| Nome e endereço | ⚠ ⚠ **O que a função FAZ** |
| Global, local, `undefined` | Ordem de execução |
| ⚠ **Símbolos de `objc`** | ⚠ Símbolo **strippado** |
| ⚠ **Mangled de Swift** | ⚠ Corpo da função |

⚠ **A última linha é a armadilha:** ⚠ um binário **strippado** não tem símbolos — e aí **sobra a desmontagem** e os **metadados de `objc`** (módulo 3), que **não são strippados**.

⚠ **A desmontagem, e como lê-la, é a mesma disciplina do curso de `Assembly e RE`:** ⚠ você **não** lê tudo; você lê a função que a pergunta aponta.

```bash
# ⚠ Os simbolos
nm -a "$BIN" 2>/dev/null | grep -vE '^\s+U ' | head -30
nm -u "$BIN" 2>/dev/null | head -20        # ⚠ undefined — o que ele IMPORTA

# ⚠ A desmontagem de UM metodo, por nome
otool -tV "$BIN" | grep -A40 '_$s9MeuApp9Validador7verificar'
#    ⚠ ou pelo metaclass, se for objc:
otool -oV "$BIN" | grep -B2 -A2 'verificar'
```

```bash
# ⚠ A comparacao entre chamada DIRETA e MENSAGEM (modulo 3)
otool -tV "$BIN" | grep -E 'bl\s+.*objc_msgSend' | head -10
#    ⚠ cada um e' uma mensagem — e e' INSTRUMENTAVEL

otool -tV "$BIN" | grep -E '^\s+bl\s+0x' | head -10
#    ⚠ chamada direta — nao passa pelo runtime
```

⚠ **A segunda e a terceira consultas são a distinção do módulo 3, medida:** ⚠ `objc_msgSend` é **indireção** (instrumentável); ⚠ `bl 0x...` é **chamada direta** (só por `Interceptor`). ⚠ Saber **quantas de cada** diz o que o módulo 8 consegue fazer.

---

## 6.4 Decifrar: quando a estática não basta

⚠ **O obstáculo do módulo 2, agora resolvido:**

```
   BINARIO DA LOJA: cryptid = 1
        │
        ├─ ⚠ o __TEXT esta CIFRADO no disco
        │    ⚠ strings e metadados podem sair ilegiveis
        │
        ▼
   ⚠ DECIFRAR exige EXECUTAR o app
        │   e capturar o __TEXT ja' decifrado em memoria
        ▼
   ⚠ DEPOIS: analise estatica normal
```

⚠ **A consequência prática, e ela é importante:** ⚠ para app **da loja**, a análise estática **pura não funciona** — é preciso **decifrar primeiro**, e isso exige **dispositivo** (Nível B) ou um dump público. ⚠ É o módulo 9 que trata a decifração em si.

⚠ **E a distinção que o relatório precisa fazer:** ⚠ analisar um app **próprio** (não cifrado) e um app **da loja** são **trabalhos diferentes** — e o segundo começa com um passo a mais.

| Alvo | ⚠ `cryptid` | Análise estática |
|---|---|---|
| ⚠ **App próprio, build de dev** | `0` | ✅ Direta |
| **App da loja** | ⚠ `1` | ⚠ Só após **decifrar** |
| Simulador | `0` | ⚠ Mas é **outra arquitetura** |

⚠ **A terceira linha é a do módulo 10:** ⚠ o simulador não é cifrado — e é **outra arquitetura**. ⚠ Analisá-lo é fácil **e** não é o aparelho.

```bash
# ⚠ O teste de cifra, antes de qualquer coisa
otool -l "$BIN" | grep -A4 LC_ENCRYPTION_INFO
#    ⚠ ARCHITECTURE (o aparelho)   cryptid = ?
#    ⚠ ARCHITECTURE (o simulador)  cryptid = 0

# ⚠ E o teste direto: as strings sao legiveis?
strings -n 8 "$BIN" | grep -cE 'https?://|SELECT|error'
#    ⚠ se for ~0, o binario esta cifrado
```

---

## 6.5 Rastrear o dado

⚠ **O método, e ele é o mesmo do curso de Android aplicado a `objc_msgSend`:**

```
   PONTO DE ENTRADA                    PONTO DE USO
   ────────────────                    ────────────

   ⚠ openURL:options:                  ⚠ o que faz com o parametro?
   ⚠ userActivity                       - usa direto?
   ⚠ NSUserDefaults (dado local)         - valida formato?
   ⚠ resposta de rede                    - compara com allowlist?
                                         - verifica autorizacao?
```

⚠ **Os quatro pontos de entrada do iOS, e o que cada um traz:**

| Entrada | ⚠ De onde vem o dado |
|---|---|
| ⚠ **`openURL:options:`** | ⚠ ⚠ **Outro app**, por URL |
| **`continueUserActivity`** | ⚠ Sistema — busca, `Handoff` |
| ⚠ **`NSUserDefaults`** | ⚠ ⚠ **Disco — pode ter sido alterado** |
| **Resposta de rede** | ⚠ Servidor — Curso 3 |

⚠ **A terceira é a que o curso de Android cobriu como "decisão local", e aqui ela tem nome:** ⚠ `NSUserDefaults` é o `SharedPreferences` do iOS. ⚠ Um valor lido dali **não é confiável** — e se ele decide autorização, o achado é o mesmo: ⚠ **o servidor confirma?**

⚠ **A leitura, no binário:** ⚠ você procura as mensagens por nome. ⚠ `objc_msgSend` com seletor `stringForKey:` ou `objectForKey:` seguido de uso — é o **mesmo rastreio** do módulo 5 do curso de Android.

```bash
# ⚠ Os pontos de entrada, no binario
otool -oV "$BIN" | grep -iE 'openURL|continueUserActivity|handleOpen'
strings -n 5 "$BIN" | grep -iE 'stringForKey|objectForKey|boolForKey|'\
'dataForKey|integerForKey' | sort -u | head -15

# ⚠ as chaves de NSUserDefaults usadas
strings -n 5 "$BIN" | grep -E '^[a-z][a-zA-Z_]{3,}$' | sort -u | head -30
#    ⚠ nomes de chave costumam aparecer como literal
```

---

## 6.6 O que a estática não alcança

⚠ **A delimitação, e ela é a mesma dos cursos anteriores:**

| ✅ A estática vê | ⚠ A estática **não** vê |
|---|---|
| O que o código **pretende** | ⚠ O que ele **faz** |
| Caminho **declarado** | ⚠ Caminho **tomado** |
| ⚠ Constante **no binário** | ⚠ Valor **calculado** |
| Classe e método | ⚠ Código **carregado depois** |
| ⚠ **Se há proteção** | ⚠ ⚠ **Se ela é eficaz** |
| **Quais `entitlements`** | ⚠ ⚠ **O que o app faz com eles** |

⚠ **A quinta e a sexta linhas são específicas deste curso:** ⚠ você vê **que** há proteção (pelas strings, módulo 3) e **quais** privilégios (pelos `entitlements`, módulo 4) — ⚠ mas **não** vê a eficácia nem o uso. ⚠ Isso exige os módulos 7, 8 e 9.

⚠ **E a conclusão para o relatório:** ⚠ a análise estática produz **hipótese** — sempre. ⚠ Ela diz *"o código não valida a origem"*; ⚠ a conclusão — *"outro app consegue invocar e o app aceita"* — exige o módulo 7.

---

## Laboratório 6 — Ler o binário

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Este lab é inteiramente estático.**

```bash
mkdir -p ~/ios-lab/m06 && cd ~/ios-lab/m06
cp -r ../m02/ipa ipa 2>/dev/null || unzip -o ../m02/MeuApp.ipa -d ipa >/dev/null
APP=$(find ipa/Payload -maxdepth 1 -name '*.app' | head -1)
BIN=$(find "$APP" -maxdepth 1 -type f -perm +111 | head -1)
echo "binario: $BIN"
```

```bash
# ── 1. ⚠ O TESTE DE CIFRA, ANTES DE TUDO ─────────────────
otool -l "$BIN" | grep -A4 LC_ENCRYPTION_INFO
STR=$(strings -n 8 "$BIN" | grep -cE 'https?://|SELECT|error' || echo 0)
echo "strings legiveis: $STR"
[ "$STR" -lt 3 ] && echo "⚠ binario provavelmente CIFRADO — modulo 9" || true
```

```bash
# ── 2. O MAPA EM STRINGS ──────────────────────────────────
{
echo "══ endpoints"; strings -n 8 "$BIN" | grep -oE 'https?://[^"<> ]+' | sort -u
echo "══ sql";       strings -n 6 "$BIN" | grep -iE 'SELECT|INSERT|UPDATE|FROM ' | head -15
echo "══ chaves";    strings -n 6 "$BIN" | grep -iE 'kSec|NSUserDefaults|\.plist' | sort -u | head -20
echo "══ protecao";  strings -n 5 "$BIN" | grep -iE 'jailbreak|frida|ptrace|substrate' | sort -u
echo "══ erros";     strings -n 8 "$BIN" | grep -iE 'invalid|failed|denied|expired' | head -15
} | tee _strings.txt
```

```bash
# ── 3. SIMBOLOS ───────────────────────────────────────────
echo "══ definidos (amostra)"
nm -a "$BIN" 2>/dev/null | grep -vE '^\s+U ' | head -25
echo "══ importados (o que ele USA)"
nm -u "$BIN" 2>/dev/null | head -20
echo "══ objc"
nm -a "$BIN" 2>/dev/null | grep -iE 'OBJC_CLASS_\$_' | head -20
```

```bash
# ── 4. ⚠ MENSAGEM vs CHAMADA DIRETA ───────────────────────
MSG=$(otool -tV "$BIN" 2>/dev/null | grep -c 'objc_msgSend' || echo 0)
DIR=$(otool -tV "$BIN" 2>/dev/null | grep -cE '^\s+bl\s+0x' || echo 0)
echo "objc_msgSend (⚠ instrumentavel): $MSG"
echo "bl direto    (⚠ so' por Interceptor): $DIR"
#    ⚠ a razao entre os dois diz o que o modulo 8 alcanca
```

```bash
# ── 5. ⚠ DESMONTAGEM LOCALIZADA — uma funcao ──────────────
#    ⚠ escolha a partir de uma pergunta (ex.: a validacao)
ALVO=$(otool -oV "$BIN" 2>/dev/null | grep -oE 'name 0x[0-9a-f]+ [^ ]*(verif|valid|auth)[^ ]*' | head -1 | awk '{print $NF}')
echo "alvo: $ALVO"
[ -n "$ALVO" ] && otool -tV "$BIN" | grep -A50 "$ALVO" | head -60

#    ⚠ PROCURE, na desmontagem:
#      - `cmp` / `cbz` / `cbnz`  ⚠ uma comparacao de validacao
#      - `objc_msgSend` com seletor de stringForKey  ⚠ dado local
#      - ⚠ a AUSENCIA de comparacao antes do uso
```

```bash
# ── 6. O RELATORIO ────────────────────────────────────────
cat > leitura.md <<'EOF'
# Leitura estatica — <app>
## Cifra: cryptid = ?  -> estatica direta | precisa decifrar
## Pontos de entrada
| Entrada | De onde vem | ⚠ Verificacao no caminho (arquivo/func) |
|---------|-------------|------------------------------------------|
## Dado local
| Chave (NSUserDefaults) | ⚠ Decide algo? | ⚠ O servidor confirma? |
|------------------------|----------------|-------------------------|
## Protecoes identificadas (previsao)
## ⚠ HIPOTESES (a confirmar no modulo 7)
EOF
```

**O que observar:** no passo 4, a **razão entre mensagem e chamada direta**. ⚠ Muitas mensagens = a instrumentação alcança quase tudo; ⚠ muitas chamadas diretas = parte do código **só** se observa por `Interceptor` (módulo 8). ⚠ E no passo 5, a busca pela **comparação** antes do uso: a ausência dela é o defeito, e é visível.

**Exercício 1:** complete o `leitura.md` com pelo menos **três** hipóteses, cada uma citando **a função e o trecho** onde o dado é usado sem verificação.

**Exercício 2:** no passo 2, escolha **um** endpoint e siga-o no binário: **onde ele é usado**, e **o que decide**. ⚠ Escreva se há **validação de certificado** (procure `pinning`, `SecTrustEvaluate`, `NSURLSessionDelegate`).

**Exercício 3 (o que vale):** pegue **uma** chave de `NSUserDefaults` do passo 5 e escreva a **frase de causa raiz**: *"o valor `X` é lido em `<função>` e usado em `<função>` sem verificação, e o servidor não reconfirma"*. ⚠ É o formato que o módulo 11 vai cobrar.

---

## Resumo

- ⚠ **`strings` primeiro** — URL, SQL, erro, chave de `plist` e **nome de proteção** saem em segundos.
- ⚠ **A ordem importa:** strings → símbolos → desmontagem **localizada**. Ler tudo não escala.
- ⚠ **Binário strippado** não tem símbolo — mas os **metadados de `objc`** sobrevivem.
- ⚠ **`objc_msgSend` é instrumentável; `bl 0x...` só por `Interceptor`** — a razão entre os dois diz o que o módulo 8 alcança.
- ⚠ **`cryptid = 1` bloqueia a estática** — app da loja exige **decifrar antes**, e isso é Nível B.
- ⚠ **Os quatro pontos de entrada do iOS:** `openURL`, `userActivity`, `NSUserDefaults` e rede.
- ⚠ **`NSUserDefaults` é o `SharedPreferences` do iOS** — dado local que **não é confiável**.
- ⚠ **A estática produz hipótese** — ela vê *que* há proteção, não *se ela é eficaz*.

---

## O que o próximo módulo entrega

Você sabe ler o binário. O módulo 7 **confirma na execução**: observação de comportamento, `Console`, tráfego e syscall — e o que a estática não viu.
