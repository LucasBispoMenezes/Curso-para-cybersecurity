# Módulo 11 — Projeto Final: Análise Completa

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 11 de 11 · 2 horas
**Pré-requisitos:** Módulos 1 a 10
**Próximo:** —

---

## O que este módulo entrega

É o fecho. Você recebe **um app com comportamento não anunciado** e conduz a análise inteira — do pacote ao runtime, do privilégio ao dado. Não há conteúdo novo: há **aplicação do método**, com a coluna que este curso exige desde o primeiro módulo: **em que nível cada achado foi obtido**.

---

## 11.1 O que este módulo cobra

⚠ **A correspondência — cada item vem de um módulo:**

| Item | ⚠ Vem do módulo |
|---|---|
| Modelo de segurança aplicado ao app | 1 |
| Inventário do pacote, `Mach-O` e `plist` | 2 |
| Runtime, classes, seletores e entrada | 3 |
| `Entitlements` e privilégio declarado | 4 |
| `Container`, `Keychain` e superfície de URL | 5 |
| Leitura estática com hipóteses | 6 |
| Confirmação dinâmica | 7 |
| Instrumentação e evidência | 8 |
| Proteções e o que elas conseguem | 9 |
| ⚠ **Nível de cada achado** | **10** |
| ⚠ **Relatório, com caminho reproduzível** | **11** |

⚠ **O critério:** *o inventário está completo? as hipóteses foram confirmadas ou descartadas com razão? cada dado tem a **classe de proteção**? cada achado tem o **nível**? a proteção foi avaliada pelo que **consegue**?*

---

## 11.2 A entrega

⚠ **O relatório é o produto, e ele tem duas seções que o curso de Android não tinha:**

```markdown
# Relatorio de Analise — <app> <versao>

## 1. Resumo
⚠ Uma frase por achado, com ALCANCE, NIVEL e CONDICAO.

## 2. Alvo
- bundle id, versao, hash do IPA, TeamIdentifier
- ⚠ minOS · architectures · cryptid
- ⚠ entitlements (a lista, e os de gravidade)
- ambiente: modelo, iOS, nivel (A / B / B+jailbreak)

## 3. Superficie
- URL schemes registrados, e o que abrem
- classes e seletores relevantes (⚠ o app se denuncia)
- pontos de entrada: openURL, userActivity, NSUserDefaults, rede

## 4. Achados
Para cada um:
  4.x — <nome>
    - Superficie   (classe, plist, Keychain, URL)
    - ⚠ CAMINHO     o comando, do inicio ao efeito
    - Efeito       ⚠ o que aconteceu, observado
    - ⚠ NIVEL       A | B | B+jailbreak
    - ⚠ VALE NO APARELHO?  sim | precisa B | SO' B RESPONDE
    - Causa raiz   ⚠ UMA FRASE, com classe:seletor

## 5. Armazenamento
- o mapa, com ⚠ PROTECAO (Data Protection / classe de Keychain)
- ⚠ o que vai para BACKUP
- ⚠ o que sai do aparelho

## 6. Privilegio
- os entitlements, ⚠ usados e NAO usados
- ⚠ o que excede o que a interface sugere

## 7. Protecoes
- cada uma, ⚠ o que TENTA impedir e o que CONSEGUE
- ⚠ HA ATTESTATION?  (a unica protecao estrutural)

## 8. ⚠ LIMITACOES
- o que exigiu nivel B
- ⚠ o que SO' B responde
- ⚠ o que e' especifico desta VERSAO

## 9. Correcao recomendada
- por achado, e ⚠ o que ela NAO resolve
```

⚠ **A seção 8 é obrigatória, e ela tem **três** itens específicos deste curso:** ⚠ o que exigiu Nível B, ⚠ o que **só** B responderia, e ⚠ o que é **específico da versão** do iOS ou do app.

⚠ **E a linha `VALE NO APARELHO?` é a assinatura do curso** — a conclusão do módulo 10: ⚠ *"só B responde"* é **resultado**, não lacuna escondida.

---

## 11.3 O app do projeto

⚠ **Ele tem comportamento **não anunciado**, cobrindo os módulos 2 a 9.** Encontrá-lo é o exercício.

⚠ **A dica de método, e ela é o curso inteiro:** ⚠ **inventarie antes de executar** — `plist`, `entitlements`, URLs, classes, seletores. ⚠ Depois **leia** o código. ⚠ Só então **execute**.

⚠ **O que esperar, sem dizer onde:**

| Superfície | ⚠ O que procurar |
|---|---|
| `Info.plist` | ⚠ URL scheme registrado; `NSAllowsArbitraryLoads` |
| `Entitlements` | ⚠ `get-task-allow`; grupo de `Keychain` amplo; App Group |
| Código | ⚠ `openURL` sem verificar **origem** |
| Código | ⚠ `NSUserDefaults` decidindo autorização |
| Container | ⚠ Token ou flag em `Library/Preferences` |
| `Keychain` | ⚠ ⚠ Item **sem `ThisDeviceOnly`** — vai no backup |
| `Data Protection` | ⚠ ⚠ Classe fraca, ou ausente |
| Runtime | ⚠ Classe de proteção, pelo nome |
| ⚠ Proteção | ⚠ Local, portanto observável |

⚠ **A tabela é o mapa — não a lista.** ⚠ Parte pode não existir: ⚠ **notar que não existe** também é trabalho.

---

## 11.4 Como conduzir

⚠ **A sequência, e ela é a do curso:**

```
   1. INVENTARIAR  ->  pacote, plist, entitlements, URLs (2 a 4)
        │              ⚠ SEM executar
        ▼
   2. LER          ->  estatica: classes, seletores, hipoteses (6)
        │
        ▼
   3. OBSERVAR     ->  Console, container, trafego (7)   ⚠ nao invasivo
        │
        ▼
   4. CONFIRMAR    ->  URL scheme, com dado controlado (5 e 7)
        │
        ▼
   5. INSTRUMENTAR ->  lldb / Frida, para o que nao e' alcancavel (8)
        │              ⚠ registrar CONTORNO e Nivel
        ▼
   6. PROTECAO     ->  o que ela CONSEGUE (9)
        │
        ▼
   7. NIVEL        ->  ⚠ cada achado: vale no aparelho? (10)
        │
        ▼
   8. REPORTAR     ->  ⚠ com nivel e condicao
```

⚠ **O passo 1 antes do 2 é o que economiza tempo** — e o 7 é o que **qualifica** o relatório. ⚠ Sem ele, o relatório mistura achado **de estrutura** (que vale) com achado **de hardware** (que não foi medido).

⚠ **E o passo 8 exige a coluna de nível em **todos** os achados:** ⚠ um relatório que não diz **onde** obteve o achado não permite ao outro lado **priorizar** — porque não sabe se ele vale em aparelho comum.

---

## 11.5 Critérios de avaliação

| ✅ Qualifica | ⚠ Não qualifica |
|---|---|
| Inventário completo, sem executar | "testei e vi que dá" |
| ⚠ **Caminho reproduzível** | descrição narrativa |
| ⚠ **Nível declarado** por achado | achado sem condição |
| Causa raiz **com classe:seletor** | "falta validação" |
| ⚠ **Efeito observado**, não presumido | "deve permitir" |
| ⚠ **"Só B responde" declarado** | silêncio sobre o não medido |
| Proteção avaliada pelo que **consegue** | "tem anti-jailbreak, logo é seguro" |
| ⚠ **Entitlement não usado declarado** | — |

⚠ **A sexta linha é a que distingue este relatório:** ⚠ em iOS, **parte dos achados não tem resposta** no simulador. ⚠ Declarar isso é **resultado** — e é o que o módulo 10 existe para ensinar.

⚠ **E a última é a do módulo 4:** ⚠ um `entitlement` **não usado** é **privilégio latente** — existe, está assinado, e qualquer comprometimento do app **pode usá-lo**. ⚠ Ele é achado, mesmo sem uso.

---

## Laboratório 11 — A análise completa

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Nível A obrigatório. Nível B onde houver dispositivo.**

```bash
mkdir -p ~/ios-lab/m11 && cd ~/ios-lab/m11
cp ../m02/MeuApp.ipa alvo.ipa
shasum -a 256 alvo.ipa > alvo.sha256       # ⚠ o hash vai no relatorio
unzip -o alvo.ipa -d ipa >/dev/null
APP=$(find ipa/Payload -maxdepth 1 -name '*.app' | head -1)
BIN=$(find "$APP" -maxdepth 1 -type f -perm +111 | head -1)
```

```bash
# ── 1. INVENTARIO (modulos 2 a 4) — ⚠ SEM EXECUTAR ────────
cat > inventario.md <<'EOF'
# Inventario — <app>
## Alvo
- bundle id: · versao: · hash: · TeamIdentifier:
- minOS: · architectures: · cryptid:
## Superficie de entrada
| URL scheme | O que abre | ⚠ Parametros |
|-----------|-----------|--------------|
## ⚠ Entitlements
| Entitlement | O que concede | ⚠ Gravidade |
|-------------|---------------|-------------|
## Atributos do plist
| Chave | Valor | ⚠ Consequencia |
|-------|-------|----------------|
EOF

plutil -p "$APP/Info.plist" | head -60
codesign -d --entitlements - "$APP" 2>&1 | head -25
lipo -info "$BIN" 2>/dev/null; otool -l "$BIN" | grep -A4 LC_ENCRYPTION_INFO
```

```bash
# ── 2. LEITURA ESTATICA (modulo 6) ────────────────────────
{
echo "══ endpoints";  strings -n 8 "$BIN" | grep -oE 'https?://[^"<> ]+' | sort -u
echo "══ chaves";     strings -n 5 "$BIN" | grep -iE 'kSec|NSUserDefaults' | sort -u | head -20
echo "══ protecao";   strings -n 5 "$BIN" | grep -iE 'jailbreak|frida|ptrace|SecCode' | sort -u
echo "══ classes";    otool -oV "$BIN" 2>/dev/null | grep -oE 'name 0x[0-9a-f]+ [^ ]+' | head -30
} | tee _leitura.txt

cat > hipoteses.md <<'EOF'
# Hipotese
Superficie:
Fonte do dado:
Uso (classe:seletor):
⚠ Verificacao no caminho: sim | nao
Falsificacao:
EOF
```

```bash
# ── 3. OBSERVAR (modulo 7) — ⚠ nao invasivo ───────────────
xcrun simctl install booted "$APP" 2>/dev/null
touch /tmp/marca_m11
xcrun simctl spawn booted log stream --level debug \
  --predicate 'process == "MeuApp"' > _console.txt 2>/dev/null &
sleep 3
xcrun simctl launch booted com.exemplo.app 2>/dev/null
xcrun simctl openurl booted "meuapp://perfil?id=1"
sleep 3; kill %1 2>/dev/null

grep -iE 'token|senha|secret|@' _console.txt | head    # ⚠ achado sem jailbreak

CT=$(xcrun simctl get_app_container booted com.exemplo.app data 2>/dev/null)
find "$CT" -type f -newer /tmp/marca_m11 2>/dev/null | head > _tocados.txt
find "$CT/Library/Preferences" -name '*.plist' -exec plutil -p {} \; 2>/dev/null
```

```bash
# ── 4. CONFIRMAR (modulos 5 e 7) ──────────────────────────
for id in 1 2 999; do
  echo "── id=$id"
  xcrun simctl openurl booted "meuapp://perfil?id=$id" 2>/dev/null
  sleep 1
done
tail -30 _console.txt
#    ⚠ o app mostrou dado de outro? verificou origem?
```

```bash
# ── 5. PROTECAO (modulo 9) ────────────────────────────────
{
strings -n 5 "$BIN" | grep -iE 'cydia|jailbreak|substrate|ptrace|'\
'PT_DENY_ATTACH|frida|SecCode' | sort -u
echo "══ ⚠ attestation?"
strings -n 6 "$BIN" | grep -iE 'DCAppAttest|attestKey|DeviceCheck' | sort -u
} | tee _protecoes.txt
```

```bash
# ── 6. ⚠ NIVEL — a coluna do modulo 10 ───────────────────
cat > nivel.md <<'EOF'
| # | Achado | ⚠ OBTIDO EM | ⚠ VALE NO APARELHO? |
|---|--------|-------------|----------------------|
## ⚠ PENDENTE DE NIVEL B
## ⚠ O QUE NAO SE PODE AFIRMAR com este nivel
EOF
```

```markdown
# relatorio.md — a estrutura do 11.2 COMPLETA
⚠ inclua a secao 8 (LIMITACOES) com os tres itens
```

**O que observar:** no passo 3, o `grep` no `_console.txt` — ⚠ se houver dado sensível, é achado que **vale em aparelho comum**. ⚠ E no passo 5, a busca por `DCAppAttest`: ⚠ se aparecer, o app tem a **única proteção estrutural** — e o relatório muda de tom.

**Exercício 1:** complete o inventário do passo 1 **antes** de rodar qualquer coisa — e compare depois. ⚠ O que você previu e não aconteceu é tão informativo quanto o contrário.

**Exercício 2:** para cada achado, preencha as colunas `OBTIDO EM` e `VALE NO APARELHO?`. ⚠ Use as **três** respostas: sim, precisa B, só B responde.

**Exercício 3 (o que vale):** escreva o **relatório completo** no formato do 11.2, com a seção de limitações e as **duas** colunas de nível em todos os achados. ⚠ Depois releia e corte todo adjetivo. O que sobra é o que se entrega.

---

## Resumo

- ⚠ **O módulo não tem conteúdo novo** — é aplicação, com comportamento **não anunciado**.
- ⚠ **Inventarie antes de executar** — o não anunciado aparece **contra o esperado**.
- ⚠ **O passo 7 (nível) qualifica o relatório** — sem ele, achado de estrutura e de hardware se misturam.
- ⚠ **`VALE NO APARELHO?` tem três respostas** — e *"só B responde"* é **resultado**.
- ⚠ **A seção de limitações tem três itens:** o que exigiu B, o que só B responde, e o que é **da versão**.
- ⚠ **Entitlement não usado é achado** — privilégio latente, assinado.
- ⚠ **"Tem proteção" não é análise** — a pergunta é **o que ela consegue**.

---

## Fim do curso

Você atravessou onze módulos e uma afirmação só, que voltou em cada camada:

> **iOS não é opaco — é fechado. E fechado não significa ilegível.**

No módulo 1 ela virou o modelo de três pilares. No 2, o mapa do pacote. Nos módulos 3 e 4, o runtime e o **privilégio declarado**. No 5, o dado e a proteção **por arquivo**. No 6, a leitura. No 7, a confirmação. No 8, a evidência. No 9, a tentativa de esconder — e a **única** proteção que impede. No 10, o que o simulador **falseia**.

⚠ **E o Curso 3 (`Mobile Application Security`) parte exatamente daqui — dos dois cursos.** ⚠ Este ensinou **a ler** um app iOS; o Curso 1 ensinou a ler um app Android. ⚠ Lá, a leitura vira **investigação**: autenticação, sessão, armazenamento inseguro, TLS, `deep link`, `WebView`, anti-tampering — e o ciclo completo de **reprodução, causa-raiz, impacto, correção e regressão**.
