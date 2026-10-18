# Módulo 3 — Armazenamento Inseguro de Dados

**Curso:** Mobile Application Security: Análise e Pesquisa de Vulnerabilidades
**Módulo:** 3 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 e 2
**Próximo:** Módulo 4 — APIs e o que o servidor confia

---

## O que este módulo entrega

Ao final, você vai saber **investigar o armazenamento de um app mobile** e responder a pergunta que qualifica tudo: ⚠ **o que este dado faz aqui?**. Os Cursos 1 e 2 ensinaram **onde** o app guarda; aqui, o trabalho é decidir **o que não deveria estar lá** — e medir **quem alcança**.

---

## 3.1 A pergunta que organiza o módulo

⚠ **Não é "o dado está protegido?". É:**

```
   ┌──────────────────────────────────────────────────────────┐
   │  PARA CADA DADO ENCONTRADO:                               │
   │                                                           │
   │  1. O QUE ele e'?          credencial | PII | estado       │
   │  2. ⚠ PRECISA estar aqui?   ou o servidor poderia ter?     │
   │  3. ⚠ QUEM le?              do app | outro app | backup    │
   │  4. ⚠ E SE FOR ALTERADO?    o app confia nesse dado?       │
   └──────────────────────────────────────────────────────────┘
```

⚠ **A segunda pergunta é a que rende, e a que os Cursos 1 e 2 não faziam:** ⚠ um cache local é legítimo; ⚠ **uma credencial permanente não é**. ⚠ O achado não é "tem token no disco" — é ⚠ **"tem token no disco, e ele não precisa estar ali"**.

⚠ **A frase que organiza o módulo:**

> **O achado de armazenamento não é onde o dado está. É o que ele faz ali, e quem
> consegue mudá-lo.**

⚠ **E a quarta pergunta conecta ao módulo 4:** ⚠ um dado local que o app **usa para decidir** é superfície de **lógica de negócio** — ⚠ e a pergunta é sempre **o servidor reconfirma?**

---

## 3.2 As categorias de dado

⚠ **A classificação, e cada uma tem gravidade diferente:**

| Categoria | ⚠ Exemplos | ⚠ Se vazar |
|---|---|---|
| ⚠ **Credencial de sessão** | token, refresh, cookie | ⚠ ⚠ **Conta tomada** |
| ⚠ **Credencial de terceiro** | senha salva, chave de API | ⚠ ⚠ Alta |
| ⚠ **Dado de autorização** | `premium`, `papel`, `saldo` | ⚠ ⚠ **Escalada** |
| **PII** | nome, e-mail, CPF, endereço | ⚠ Média — privacidade |
| ⚠ **Dado de outro usuário** | cache que devia ser só seu | ⚠ ⚠ Alta |
| **Estado de UI** | tema, aba aberta | — |
| ⚠ **Segredo de negócio** | preço de custo, margem | ⚠ Média |

⚠ **A terceira linha é a mais específica deste curso:** ⚠ o dado de autorização **não vaza** — ele **causa escalada**. ⚠ E o achado só está completo quando se sabe: ⚠ **o servidor confia nele?**

⚠ **A quarta merece uma nota que os Cursos 1 e 2 já deram, e que aqui vira achado:** ⚠ no iOS, `Documents/` é exposto ao **usuário** e vai ao **backup**; ⚠ no Android, `/sdcard` é legível por **outros apps**. ⚠ O que era "configuração" lá é **vazamento** aqui — porque a pergunta mudou.

---

## 3.3 Os quatro canais de saída

⚠ **O dado guardado sai por quatro caminhos, e cada um tem um leitor diferente:**

| # | Canal | ⚠ Quem alcança | ⚠ Exige |
|---|---|---|---|
| 1 | **Armazenamento interno** | ⚠ O app — e `root`/`run-as` | ⚠ App depurável ou `root` |
| 2 | ⚠ **Armazenamento externo/`Documents`** | ⚠ ⚠ **Usuário e outros apps** | ⚠ Nada |
| 3 | ⚠ **Backup** | ⚠ ⚠ **Quem tem o backup** | ⚠ Nada |
| 4 | ⚠ **Log** | ⚠ Qualquer app com leitura, ou `adb` | ⚠ Nada |
| 5 | **`WebView` / URL** | ⚠ Outro app | Módulo 6 |

⚠ **As linhas 2, 3 e 4 são as de maior alcance, e as que **não exigem `root`**:**

```
   ⚠ O QUE SAI SEM COMPROMETER NADA:

   ANDROID:
     - /sdcard/Android/data/<pkg>/     ⚠ legivel
     - adb backup (allowBackup)        ⚠ ⚠ sai inteiro
     - logcat                          ⚠ achado real

   iOS:
     - Documents/ (UIFileSharingEnabled) ⚠ usuario
     - o BACKUP (iCloud / iTunes)        ⚠ ⚠ sai inteiro
     - os_log                            ⚠ achado real
```

⚠ **É a mesma disciplina das duas colunas anteriores — *"como li"* no Curso 1 e *"nível A/B"* no Curso 2:** ⚠ o que sai **sem comprometer o aparelho** é achado **real**; ⚠ o que exige `root` é **condicionado**.

⚠ **E no iOS há um detalhe que decide:** ⚠ o item do `Keychain` **sem `ThisDeviceOnly`** ⚠ **vai no backup** — e portanto sai **sem `root`**. ⚠ É o canal 3, e é o que o módulo 5 do Curso 2 já identificou.

---

## 3.4 Dado local que decide: o achado que escala

⚠ **O padrão mais produtivo do módulo, e o que liga ao curso de Web Apps:**

```kotlin
// ANDROID — ⚠ o app decide com dado LOCAL
val prefs = getSharedPreferences("app", MODE_PRIVATE)
val premium = prefs.getBoolean("premium", false)
if (premium) {
    mostrarConteudoCompleto()        // ⚠ o SERVIDOR reconfirma?
}
```

```swift
// iOS — ⚠ o mesmo padrao
let premium = UserDefaults.standard.bool(forKey: "premium")
if premium { mostrarConteudoCompleto() }
```

⚠ **A investigação tem três passos, e o terceiro é o que decide:**

```
   1. LOCALIZE     ->  o app le' dado do armazenamento
        │
   2. ALTERE       ->  ⚠ mude o valor (run-as / jailbreak / o proprio app)
        │
   3. ⚠ VERIFIQUE   ->  ⚠ o SERVIDOR reconfirma, ou o app decidiu sozinho?
        │
        └─ ⚠ se o app decidiu sozinho: ESCALADA
```

⚠ **O passo 3 é o que separa achado de observação** — e exige o **servidor** (módulo 1). ⚠ Se o app mostra o conteúdo localmente mas o **servidor entrega** o dado, ⚠ o atacante **não consegue** o conteúdo real — só a **interface**. ⚠ A gravidade é **muito** diferente.

⚠ **A tabela de veredito, e ela é a do módulo 1 aplicada:**

| O app... | ⚠ O servidor... | ⚠ Achado |
|---|---|---|
| Mostra conteúdo local | ⚠ **Não entrega** o dado | ⚠ UI apenas — baixo |
| ⚠ Mostra, e o dado **vem do servidor** | ⚠ ⚠ **Confia no app** | ⚠ ⚠ **Escalada real** |
| Envia o dado local na requisição | ⚠ ⚠ **Usa** | ⚠ ⚠ **Escalada real** |
| Usa só para UI | — | Nada |

⚠ **A segunda linha é a que aparece, e o teste é direto:** ⚠ altere o flag, e **veja se o servidor entrega o que não deveria**. ⚠ Se entregar, ⚠ **a decisão de autorização está no cliente** — e é o mesmo achado do módulo 4 do curso de Web Apps.

---

## 3.5 Dado que não deveria existir

⚠ **Três achados que não dependem da proteção do arquivo, e sim do **conteúdo**:**

| Achado | ⚠ Por quê |
|---|---|
| ⚠ **Senha em claro** | ⚠ ⚠ Nunca deve estar no cliente |
| ⚠ **Chave de API de terceiro** | ⚠ ⚠ Ela é **compartilhada** por todos os usuários |
| ⚠ **Token de longa duração** | ⚠ Sem rotação, é credencial permanente |
| ⚠ **Dado de outro usuário** | ⚠ Cache que não é escopado |
| **Segredo de servidor embutido** | ⚠ ⚠ Chave de assinatura, `secret` de JWT |

⚠ **A segunda e a última são as específicas do mobile, e merecem a explicação:**

⚠ **Chave de API no app** — ⚠ se o app traz a chave de um serviço de terceiro (mapas, pagamento, push), ⚠ **todo** usuário a tem. ⚠ E extrair do app é trivial. ⚠ A correção **não** é ofuscar: ⚠ é **mover a chamada para o servidor**.

⚠ **`secret` de JWT no app** — ⚠ se o app assina o próprio token, ⚠ quem tem o app **assina o que quiser**. ⚠ É a falha de **confiar no cliente**, na forma mais direta.

```bash
# ── ⚠ A BUSCA POR SEGREDOS EMBUTIDOS ──────────────────────
# ANDROID:
cd ~/android-lab/m05 2>/dev/null || cd ~/mobile-lab/m01
jadx -d app_jadx ../alvo/app.apk 2>/dev/null || true
grep -rniE 'api[_-]?key|secret|token|senha|password|AKIA|sk_live|'\
'-----BEGIN|firebase|google_api' app_jadx/sources/ 2>/dev/null | head -20

# iOS:
strings -n 8 ~/ios-lab/m02/ipa/Payload/*.app/MeuApp 2>/dev/null | \
  grep -iE 'api[_-]?key|secret|sk_live|AKIA|-----BEGIN' | head -20
```

⚠ **As duas consultas buscam **segredo no binário** — e essa é uma classe que **não aparece no armazenamento**, e sim no **código**. ⚠ É o mesmo movimento do módulo 7 do Curso 1 (strings no `.so`) e do módulo 6 do Curso 2 (strings no `Mach-O`).

⚠ **E a razão de isso ser achado de armazenamento, mesmo estando no código:** ⚠ o segredo embutido é **persistente** — ele **não muda**, e ⚠ **não há como rotacionar sem atualizar o app**.

---

## 3.6 O relatório do armazenamento

⚠ **O formato, e ele tem a coluna que o curso cobra:**

```
ACHADO — ARMAZENAMENTO
──────────────────────────────────────────────────────────
DADO:          o que e' (categoria da tabela do 3.2)
LOCAL:         caminho exato
PROTECAO:      classe | ThisDeviceOnly | EncryptedPrefs | ⚠ nenhuma
                    │
⚠ COM O MESMO PROBLEMA, MAS... precisa estar aqui?
               ⚠ se NAO -> mover para o servidor
                    │
LEITOR:        quem le' (⚠ e COM o que)
SAI EM:        ⚠ backup | externo | log | nao sai
ALTERAVEL:     ⚠ se sim, o servidor reconfirma?
                    │
CAMINHO:       o comando
PRE-REQUISITO: ⚠ nada | app depuravel | root | backup
──────────────────────────────────────────────────────────
```

⚠ **A linha `precisa estar aqui?` é a que distingue achado de inventário.** ⚠ Um app **tem** que guardar o token para funcionar; ⚠ ele **não tem** que guardar a senha. ⚠ Sem essa linha, o relatório lista o que existe — e não o que **é problema**.

⚠ **E a linha `ALTERAVEL` fecha o ciclo com o 3.4:** ⚠ se o dado é alterável ⚠ **e** o servidor reconfirma, não há achado; ⚠ se ⚠ **e** o servidor confia, ⚠ há **escalada**.

---

## Laboratório 3 — Mapear e classificar

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Exige o servidor do módulo 1.**

```bash
mkdir -p ~/mobile-lab/m03 && cd ~/mobile-lab/m03
```

```bash
# ── 1. O INVENTARIO — ANDROID ──────────────────────────────
adb shell run-as com.exemplo.app find /data/data/com.exemplo.app/ -type f \
  -exec ls -la {} \; 2>/dev/null | head -30

#    ⚠ e o conteudo dos que interessam
adb shell run-as com.exemplo.app cat \
  /data/data/com.exemplo.app/shared_prefs/*.xml 2>/dev/null

adb shell run-as com.exemplo.app ls \
  /data/data/com.exemplo.app/databases/ 2>/dev/null
```

```bash
# ── 2. O INVENTARIO — iOS ──────────────────────────────────
CT=$(xcrun simctl get_app_container booted com.exemplo.app data 2>/dev/null)
find "$CT" -type f 2>/dev/null | head -30
for f in "$CT/Library/Preferences/"*.plist; do
  [ -f "$f" ] && { echo "── $f"; plutil -p "$f"; }
done 2>/dev/null
```

```bash
# ── 3. ⚠ A BUSCA POR DADO SENSIVEL ─────────────────────────
for base in \
  "$(adb shell run-as com.exemplo.app echo /data/data/com.exemplo.app 2>/dev/null)" \
  "$CT"; do
  [ -z "$base" ] && continue
  echo "══ bases: $base"
  adb shell run-as com.exemplo.app grep -rliE \
    'token|senha|password|secret|api_key|cpf' /data/data/com.exemplo.app 2>/dev/null | head
done
grep -rilE 'token|senha|secret|api_key' "$CT" 2>/dev/null | head
```

```bash
# ── 4. ⚠ O CANAL DE SAIDA — o que sai SEM root ────────────
echo "══ BACKUP — Android"
adb backup -f bkp.ab -noapk com.exemplo.app 2>/dev/null
ls -la bkp.ab 2>/dev/null    # ⚠ > 1KB = o dado saiu

echo "══ BACKUP — iOS (⚠ o container vai no backup do iTunes/iCloud)"
#    ⚠ o que decide: ThisDeviceOnly no Keychain, e NSURLIsExcludedFromBackupKey

echo "══ EXTERNO"
adb shell ls -la /sdcard/Android/data/com.exemplo.app/ 2>&1 | head

echo "══ LOG"
adb logcat -c; adb shell am start -n com.exemplo.app/.MainActivity; sleep 2
adb logcat -d | grep -iE 'token|senha|secret|cpf' | head
```

```bash
# ── 5. ⚠ O TESTE DO DADO QUE DECIDE ───────────────────────
#    ⚠ localize um flag de autorizacao no armazenamento
adb shell run-as com.exemplo.app cat \
  /data/data/com.exemplo.app/shared_prefs/*.xml 2>/dev/null | \
  grep -iE 'premium|papel|admin|role|ativo'

#    ⚠ e veja se o app o USA para decidir
#    (procure no jadx: getBoolean|getString do mesmo nome)
```

```bash
# ── 6. ⚠ SEGREDO EMBUTIDO no binario ─────────────────────
jadx -d app_jadx ~/android-lab/alvo/app.apk 2>/dev/null || true
grep -rniE 'api[_-]?key|secret|sk_live|AKIA|-----BEGIN' \
  app_jadx/sources/ 2>/dev/null | head -10

strings -n 8 ~/ios-lab/m02/ipa/Payload/*.app/MeuApp 2>/dev/null | \
  grep -iE 'api[_-]?key|secret|sk_live' | head -10
```

```bash
# ── 7. O RELATORIO ────────────────────────────────────────
cat > armazenamento.md <<'EOF'
# Armazenamento — <app>
| # | Dado | Categoria | Local | Prot. | ⚠ Precisa estar? | Leitor | Sai em |
|---|------|-----------|-------|-------|------------------|--------|--------|
## ⚠ O que sai SEM root, SEM run-as e SEM jailbreak
## ⚠ Dado local que o app USA para decidir — o servidor reconfirma?
## ⚠ Segredo embutido no binario
EOF
```

**O que observar:** no passo 4, o `bkp.ab` acima de 1 KB prova que o dado **saiu por configuração** — ⚠ e é o achado que vale **sem comprometer o aparelho**. ⚠ E no passo 5, o flag de autorização: ⚠ a pergunta que fecha o achado é **o servidor reconfirma?**, e a resposta exige o módulo 4.

**Exercício 1:** complete o `armazenamento.md` com todos os dados encontrados, e a coluna **"precisa estar?"** preenchida. ⚠ Essa coluna é o que separa inventário de achado.

**Exercício 2:** para **um** dado, marque o **canal de saída** e o **pre-requisito**. ⚠ Classifique em **real** (sai sem comprometer) ou **condicionado** (exige `root`/`run-as`/jailbreak).

**Exercício 3 (o que vale):** escolha o **dado local que o app usa para decidir** e investigue: ⚠ altere o valor, e veja **se o servidor entrega o que não deveria**. ⚠ Escreva o veredito pela tabela do 3.4 — e a **frase de causa raiz** em uma linha.

---

## Resumo

- ⚠ **A pergunta não é "está protegido?"** — é **o que este dado faz aqui, e quem o altera**.
- ⚠ **A categoria define a gravidade:** credencial, **dado de autorização**, PII e dado de terceiro.
- ⚠ **Dado de autorização não vaza — ele escala** — e o achado só fecha com **o servidor reconfirma?**
- ⚠ **Três canais não exigem `root`:** externo, **backup** e **log** — e são os achados **reais**.
- ⚠ **`ThisDeviceOnly` (iOS) decide se o item sai no backup** — o canal 3.
- ⚠ **Dado local que decide é o achado que escala** — e o teste tem três passos, o terceiro sendo o servidor.
- ⚠ **Segredo embutido no binário é achado de armazenamento** — é persistente e **não rotacionável**.
- ⚠ **Chave de API no app é de todos os usuários** — a correção é **mover para o servidor**, não ofuscar.
- ⚠ **A linha "precisa estar aqui?"** separa inventário de achado.

---

## O que o próximo módulo entrega

Você sabe o que o app guarda. O módulo 4 é **o núcleo do curso**: o que o servidor **confia** — e como medir isso.
