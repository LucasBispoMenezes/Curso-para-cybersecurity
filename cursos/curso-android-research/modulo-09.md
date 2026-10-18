# Módulo 9 — Armazenamento, Sandbox e o Que Vaza

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 9 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 8
**Próximo:** Módulo 10 — Mecanismos de proteção e anti-análise

---

## O que este módulo entrega

Ao final, você vai saber **mapear onde um app Android guarda dado** — e, para cada lugar, **quem consegue ler**. Você vai testar o sandbox **de verdade**, e vai reconhecer as **quatro saídas de dado** que não dependem de `root` nem de falha no app.

---

## 9.1 As seis superfícies de armazenamento

⚠ **A tabela que o módulo inteiro preenche, e cada linha é um lugar a inspecionar:**

| # | Onde | ⚠ Protegido por | ⚠ Quem lê |
|---|---|---|---|
| 1 | **`/data/data/<pkg>/`** | ⚠ `uid` + `SELinux` | Só o app (e `root`) |
| 2 | **`SharedPreferences`** | ⚠ Idem — é arquivo dentro de 1 | ⚠ Só o app |
| 3 | **Banco `SQLite`** | ⚠ Idem | ⚠ Só o app |
| 4 | **`/sdcard/` (externo)** | ⚠ ⚠ **Nada** — em versões antigas | ⚠ ⚠ **Qualquer app** |
| 5 | **`MediaStore` / `SAF`** | Permissão do sistema | ⚠ Depende do escopo |
| 6 | ⚠ **Backup (`allowBackup`)** | ⚠ ⚠ **Uma flag** | ⚠ ⚠ **`adb`** |
| 7 | **KeyStore** | Hardware, por app | ⚠ ⚠ Reduz a **extração**, não o uso |

⚠ **A quarta linha é a que mudou, e é a que engana:** ⚠ desde o **scoped storage**, o app não escreve mais livremente no `/sdcard`. ⚠ Mas dado **antigo** pode estar lá — e o `Manifest` pode declarar `requestLegacyExternalStorage`.

⚠ **A sexta é a mais subestimada, e a mais fácil de testar:** ⚠ `allowBackup` **ausente** significa `true` (módulo 2) — e com ele ligado, **o dado do app sai por `adb backup`**, sem `root`, sem falha nenhuma.

⚠ **A sétima merece a distinção que o relatório precisa fazer:** ⚠ o `KeyStore` **não impede o uso** da chave pelo app — ele impede a **extração** dela. ⚠ Quem tem o app rodando **usa** a chave; quem tem o arquivo **não tem** a chave. ⚠ É a diferença entre **vazamento** e **uso indevido**.

---

## 9.2 O sandbox, testado

⚠ **Antes de qualquer conclusão, a prova direta:**

```bash
# ── 1. O QUE VOCE, como shell, consegue ler ─────────────────
adb shell id                                  # ⚠ uid 2000 (shell)
adb shell ls /data/data/com.exemplo.app/ 2>&1 | head -3
#    ⚠ esperado: Permission denied

adb shell ls /sdcard/ 2>&1 | head -5
#    ⚠ esperado: o conteudo aparece — ⚠ armazenamento externo

# ── 2. O QUE O PROPRIO APP CONSEGUE ─────────────────────────
adb shell run-as com.exemplo.app ls -la /data/data/com.exemplo.app/
#    ⚠ `run-as` assume o uid do app — so funciona em app DEPURAVEL
```

⚠ **A segunda consulta é o instrumento central do módulo:** ⚠ `run-as` **assume o `uid` do app** — e é assim que você lê o dado **sem `root`**, quando o app é depurável. ⚠ É o que torna este módulo executável em aparelho comum.

⚠ **E a razão de o app do lab ser depurável:** ⚠ `debuggable="true"` habilita `run-as` **e** `JDWP` (módulo 8). ⚠ Em app de produção, `run-as` falha — e aí o caminho é `root` ou `backup`.

```bash
# ── 3. O INVENTARIO — todos os arquivos que o app criou ────
adb shell run-as com.exemplo.app find /data/data/com.exemplo.app/ -type f

# ⚠ e o conteudo de cada tipo
adb shell run-as com.exemplo.app cat /data/data/com.exemplo.app/shared_prefs/*.xml
adb shell run-as com.exemplo.app ls -la /data/data/com.exemplo.app/databases/
```

⚠ **A primeira consulta é o mapa completo:** ⚠ `find` lista **tudo** que o app escreveu — e é assim que você descobre **onde** ele guardou, sem ler uma linha de código. ⚠ É o passo que o `strace` do módulo 6 antecipou.

---

## 9.3 `SharedPreferences`: o vazamento mais comum

⚠ **O formato é XML simples, e é legível:**

```bash
adb shell run-as com.exemplo.app cat \
    /data/data/com.exemplo.app/shared_prefs/prefs.xml
```

```xml
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="usuario">ana@exemplo.com</string>
    <string name="token">eyJhbGciOiJIUzI1NiIs...</string>   ⚠ em CLARO
    <boolean name="premium" value="true" />
    <int name="saldo" value="1500" />
</map>
```

⚠ **Três achados possíveis neste arquivo, e cada um tem gravidade diferente:**

| Achado | ⚠ Gravidade |
|---|---|
| Dado não sensível (preferência, flag) | — |
| ⚠ **Dado pessoal** (e-mail, nome) | Média |
| ⚠ ⚠ **Credencial em claro** (token, chave) | ⚠ Alta |
| ⚠ **Dado de autorização** (papel, `premium`, `saldo`) | ⚠ ⚠ Alta |

⚠ **A quarta é a mais interessante para análise:** ⚠ `premium: true` guardado no app significa que **o app decide com base em dado local**. ⚠ A pergunta é: **o servidor confirma?** ⚠ Se não confirmar, alterar o arquivo **altera o comportamento** — e é o módulo 10 do curso de Web Apps (lógica de negócio) no aparelho.

⚠ **E o caminho de teste é direto:**

```bash
# ⚠ Altere o dado LOCAL e observe — o servidor confirma?
adb shell run-as com.exemplo.app \
    sh -c 'sed -i "s/premium\" value=\"false/premium\" value=\"true/" \
    /data/data/com.exemplo.app/shared_prefs/prefs.xml'
#    ⚠ `sed` dentro do run-as — o arquivo e' do app
#    ⚠ Se o app passar a se comportar como premium -> falta confirmacao
```

⚠ **A alteração só é possível com `run-as` (app depurável) ou `root`** — e é por isso que ela **não é** um ataque viável contra app de produção. ⚠ **O que ela prova** é outra coisa: que a **decisão é local**, e que o servidor não a confirma. ⚠ Essa distinção é a mesma do módulo 8 (hook não é vulnerabilidade) e precisa ir ao relatório.

---

## 9.4 `SQLite`: o banco que fica

⚠ **O padrão do Android é o `SQLite`, e ele tem três achados clássicos:**

```bash
adb shell run-as com.exemplo.app ls -la /data/data/com.exemplo.app/databases/
adb pull /data/data/com.exemplo.app/databases/app.db 2>/dev/null || \
  adb shell run-as com.exemplo.app cat /data/data/com.exemplo.app/databases/app.db > app.db

# ⚠ e a leitura
sqlite3 app.db ".tables"
sqlite3 app.db "SELECT * FROM usuarios LIMIT 5;"
```

| Achado | ⚠ Por quê |
|---|---|
| ⚠ **Credencial na tabela** | Token, senha em claro |
| ⚠ **Dado de outro usuário** | Cache que devia ser só local |
| **Banco não cifrado** | ⚠ Sem `SQLCipher` |
| ⚠ **`-journal` / `-wal` residual** | ⚠ ⚠ Dado que foi **apagado** |
| **Caminho em `/sdcard`** | ⚠ Legível por todos (versões antigas) |

⚠ **A quarta linha é a que quase sempre escapa:** ⚠ o SQLite mantém **arquivos auxiliares** (`-wal`, `-journal`), e eles **contêm dado antigo** — inclusive o que o app **apagou**. ⚠ É o mesmo raciocínio do `hive` do registro no curso de Windows Internals: **o disco guarda o que a API diz que não existe**.

```bash
# ⚠ O dado que "nao existe mais"
adb shell run-as com.exemplo.app ls -la /data/data/com.exemplo.app/databases/
#    ⚠ procure .db-wal e .db-journal
strings app.db-wal 2>/dev/null | grep -iE 'token|senha|@' | head
```

---

## 9.5 As quatro saídas que não dependem de nada

⚠ **A parte do módulo que produz achado em **qualquer** app, sem `root` e sem falha:**

| # | Saída | ⚠ Como se testa |
|---|---|---|
| 1 | ⚠ **`allowBackup`** | ⚠ `adb backup` — o dado sai |
| 2 | ⚠ **Dado em log** | ⚠ `logcat` (módulo 6) |
| 3 | ⚠ **Dado em `/sdcard`** | ⚠ `adb shell ls` |
| 4 | ⚠ **Dado em `MediaStore`/`URI`** | Provider exportado (módulo 3) |

⚠ **A primeira é a mais elegante, e a mais frequente:**

```bash
# ⚠ O backup do app — sem root, sem app depuravel
adb backup -f backup.ab -noapk com.exemplo.app
#    ⚠ o aparelho pede confirmacao na tela; aceite

# ⚠ e o conteudo e' um formato proprio — o `abe` abre
#    (ferramenta de terceiro: android-backup-extractor)
java -jar abe.jar unpack backup.ab backup.tar
tar xf backup.tar
ls apps/com.exemplo.app/        # ⚠ a pasta data/ do app, inteira
```

⚠ **O que a consulta acima prova, e por que ela importa:** ⚠ com **`allowBackup` ligado**, o dado do app sai **por decisão de configuração**, sem `root` e sem explorar nada. ⚠ É a linha do módulo 2 — *`allowBackup` ausente é `true`* — transformada em demonstração.

⚠ **E a mitigação não é código:** ⚠ `android:allowBackup="false"`, ou `android:fullBackupContent` com exclusão explícita. ⚠ É **um atributo**, e é a razão de valer a pena procurar por ele **primeiro**.

⚠ **A terceira tem a mesma natureza:**

```bash
# ⚠ O que o app deixou no armazenamento EXTERNO
adb shell ls -la /sdcard/Android/data/com.exemplo.app/ 2>&1 | head
adb shell find /sdcard/ -iname '*exemplo*' 2>/dev/null | head
#    ⚠ em versoes antigas, /sdcard/ era leitura livre para todo app
```

---

## 9.6 O relatório do armazenamento

⚠ **O formato, e ele tem uma coluna que decide a gravidade:**

```
ANALISE DE ARMAZENAMENTO
──────────────────────────────────────────────────────────
| # | Caminho | O que contem | ⚠ QUEM LE | ⚠ Como foi lido |
|---|---------|--------------|-----------|-----------------|
| 1 | shared_prefs/prefs.xml | token | app + run-as | run-as cat |
| 2 | databases/app.db | pedidos | app | run-as + sqlite3 |
| 3 | app.db-wal | ⚠ token antigo | app | strings |
| 4 | /sdcard/... | cache | ⚠ QUALQUER APP | adb shell ls |
| 5 | backup (allowBackup) | ⚠ tudo | ⚠ ADB | adb backup |
                    │
⚠ COMO O DADO FOI LIDO: root | run-as | backup | log | provider
══════════════════════════════════════════════════════════
```

⚠ **A última linha é a que qualifica o achado inteiro** — e é a mesma distinção do módulo 8: ⚠ **como** você leu o dado determina **o que o achado significa**.

| Como foi lido | ⚠ O que o achado é |
|---|---|
| `run-as` (app depurável) | ⚠ O dado existe — e o app é depurável |
| ⚠ **`adb backup`** | ⚠ ⚠ **Achado real, sem condições** |
| ⚠ **`/sdcard`** | ⚠ ⚠ Achado real |
| ⚠ **Log** | ⚠ ⚠ Achado real |
| `root` | ⚠ Achado **condicionado** a aparelho comprometido |

⚠ **A quinta linha é a que protege o relatório de exagerar:** ⚠ em aparelho com `root`, **todo** dado de **todo** app é legível — e isso **não é achado do app**. ⚠ O que interessa é o que se lê **sem** `root`, ou **com `root` mas exigindo menos do que o próprio app exige**.

---

## Laboratório 9 — Mapear o armazenamento

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Aparelho comum (sem `root`) é suficiente para quase tudo.**

```bash
mkdir -p ~/android-lab/m09 && cd ~/android-lab/m09
adb install -r ../m03/alvo/app-release.apk
```

```bash
# ── 1. O MAPA — tudo que o app escreveu ────────────────────
adb shell run-as com.exemplo.app find /data/data/com.exemplo.app/ -type f \
  -exec ls -la {} \; 2>/dev/null

#    ⚠ se `run-as` falhar: o app e' depuravel?
adb shell dumpsys package com.exemplo.app | grep -i debuggable
```

```bash
# ── 2. SharedPreferences ───────────────────────────────────
adb shell run-as com.exemplo.app ls /data/data/com.exemplo.app/shared_prefs/
adb shell run-as com.exemplo.app cat \
    /data/data/com.exemplo.app/shared_prefs/*.xml
#    ⚠ ha credencial? dado de autorizacao?

# ⚠ teste do 9.3: o servidor CONFIRMA o dado local?
adb shell run-as com.exemplo.app \
   sh -c 'sed -i "s/>false</>true</" /data/data/com.exemplo.app/shared_prefs/*.xml' 2>/dev/null
#    ⚠ reinicie o app e observe: o comportamento mudou?
```

```bash
# ── 3. SQLite ──────────────────────────────────────────────
adb shell run-as com.exemplo.app ls -la /data/data/com.exemplo.app/databases/

adb shell run-as com.exemplo.app cat /data/data/com.exemplo.app/databases/app.db > app.db
sqlite3 app.db ".tables"
sqlite3 app.db ".schema" | head -20
sqlite3 app.db "SELECT * FROM usuarios LIMIT 3;"

# ⚠ o dado que "foi apagado"
adb shell run-as com.exemplo.app ls -la /data/data/com.exemplo.app/databases/ | grep -E 'wal|journal'
strings app.db-wal 2>/dev/null | grep -iE 'token|senha|@' | head
```

```bash
# ── 4. ⚠ BACKUP — a saida que nao depende de nada ───────────
adb backup -f backup.ab -noapk com.exemplo.app
#    ⚠ aceite na tela do aparelho
ls -la backup.ab
#    ⚠ se o arquivo tiver tamanho > 1KB, o backup foi feito
#    ⚠ desempacote com o abe (android-backup-extractor)
#    java -jar abe.jar unpack backup.ab backup.tar && tar tf backup.tar
```

```bash
# ── 5. ARMazenamento EXTERNO ───────────────────────────────
adb shell ls -la /sdcard/Android/data/com.exemplo.app/ 2>&1 | head
adb shell find /sdcard/ -iname '*exemplo*' 2>/dev/null | head -10
#    ⚠ o que esta lá e' legivel pelo shell — e por qualquer app com permissao
```

```bash
# ── 6. O LOG — dado que nao deveria estar ali ──────────────
adb logcat -c; adb shell am start -n com.exemplo.app/.MainActivity; sleep 2
adb logcat -d | grep -iE 'token|senha|password|cpf|secret' | head
```

```bash
# ── 7. O RELATORIO ─────────────────────────────────────────
cat > armazenamento.md <<'EOF'
# Mapa de armazenamento — <app>
| # | Caminho | Conteudo | ⚠ QUEM LE | Como li |
|---|---------|----------|-----------|---------|
## ⚠ O que sai SEM root e SEM run-as
## ⚠ O dado de autorizacao e' confirmado pelo servidor?
EOF
```

**O que observar:** no passo 4, o `backup.ab` com **tamanho maior que o vazio** prova que o dado saiu — **sem `root` e sem `run-as`**. ⚠ É o achado que o relatório classifica como **real**, e não condicionado. ⚠ E no passo 3, o `-wal` pode conter dado que o app **já apagou**: o disco guarda o que a API diz que não existe.

**Exercício 1:** preencha o `armazenamento.md` completo, com a coluna **como li** em cada linha. ⚠ Depois classifique cada achado pelo 9.6: real, ou condicionado a `root`.

**Exercício 2:** teste o achado do 9.3 — altere o dado de autorização local e verifique se o **comportamento muda**. ⚠ Depois escreva, em duas linhas, o que isso prova e o que **não** prova.

**Exercício 3 (o que vale):** compare o `allowBackup` do seu app com o de **um app do sistema**. ⚠ Liste três apps do aparelho com `allowBackup` ligado e escreva, para cada um, **o que sairia** no backup. É o achado de maior alcance do módulo — e não exige nada além de `adb`.

---

## Resumo

- ⚠ **Sete superfícies**, e cada uma tem um leitor diferente: interno (`uid`), externo (nada), backup (**`adb`**) e `KeyStore` (uso, não extração).
- ⚠ **`run-as` assume o `uid` do app** — é o instrumento sem `root`, e exige app depurável.
- ⚠ **`SharedPreferences` é XML legível** — e `premium: true` guardado significa **decisão local**.
- ⚠ **`allowBackup` ausente é `true`** — e o dado sai por `adb backup`, sem `root`.
- ⚠ **O `-wal` do SQLite contém dado que o app apagou** — o disco guarda o que a API nega.
- ⚠ **Quatro saídas não dependem de nada:** backup, log, `/sdcard` e provider — e são as de maior alcance.
- ⚠ **A coluna "como li" decide a gravidade:** lido por `root` é condicionado; lido por backup é **real**.
- ⚠ **Em aparelho com `root`, todo dado é legível** — e isso não é achado do app.

---

## O que o próximo módulo entrega

Você sabe o que o app guarda. O módulo 10 fecha a parte técnica: **mecanismos de proteção e anti-análise** — o que eles tentam impedir, e por que **não impedem**.
