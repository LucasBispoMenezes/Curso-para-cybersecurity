# Módulo 11 — Projeto Final: Análise Completa de um App

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 11 de 11 · 2 horas
**Pré-requisitos:** Módulos 1 a 10
**Próximo:** —

---

## O que este módulo entrega

É o fecho. Você recebe **um app com o comportamento não anunciado** e conduz a análise inteira — do manifesto ao nativo, do estático ao dinâmico, do dado guardado à proteção. Não há conteúdo novo: há **aplicação do método acrescido do que a metodologia de investigação exige**.

---

## 11.1 O que este módulo cobra

⚠ **A correspondência — cada item da entrega vem de um módulo:**

| Item | ⚠ Vem do módulo |
|---|---|
| Modelo de segurança aplicado ao app | 1 |
| Inventário do pacote e do manifesto | 2 |
| Componentes, exportação e contrato | 3 |
| Autorização, `IPC` e `PendingIntent` | 4 |
| Leitura estática, com hipóteses | 5 |
| Confirmação dinâmica | 6 |
| Análise do nativo | 7 |
| Instrumentação e evidência | 8 |
| Mapa de armazenamento, com **como foi lido** | 9 |
| Proteções e o que elas conseguem | 10 |
| ⚠ **Relatório, com o caminho reproduzível** | **11** |

⚠ **O critério:** *o inventário está completo? as hipóteses foram confirmadas ou descartadas com razão? cada dado tem o "como li"? a proteção foi avaliada pelo que **consegue**?*

---

## 11.2 A entrega

⚠ **O relatório é o produto, e ele agrega os dez módulos:**

```markdown
# Relatorio de Analise — <app> <versao>

## 1. Resumo
⚠ Uma frase por achado, com o ALCANCE e a CONDICAO de obtencao.

## 2. Alvo
- pacote, versao, hash do APK, emissor do certificado
- ⚠ minSdk / targetSdk — muda o comportamento
- ⚠ debuggable / allowBackup / networkSecurityConfig
- aparelho, versao do Android, root (sim/nao)

## 3. Superficie
- todos os componentes, com exported / permission
- ⚠ os alcancaveis DE FORA, com o que aceitam
- as permissoes declaradas vs as efetivamente usadas

## 4. Achados
Para cada um:
  4.x — <nome>
    - Superficie   (componente, arquivo, storage)
    - ⚠ CAMINHO     o comando, do inicio ao efeito
    - Identidade   ⚠ quem invoca / quem le
    - Efeito       ⚠ o que aconteceu, observado
    - ⚠ COMO OBTIVE  de fora | run-as | root | backup | hook
    - Causa raiz   ⚠ UMA FRASE, com o arquivo:linha

## 5. Armazenamento
- o mapa, com a coluna "quem le" e "como li"
- ⚠ o que sai SEM root e SEM run-as

## 6. Nativo
- as .so, a ponte JNI, e o defeito encontrado

## 7. Protecoes
- o que existe, ⚠ o que TENTA impedir, e ⚠ o que CONSEGUE

## 8. ⚠ LIMITACOES
- o que nao foi analisado
- ⚠ o que so' foi possivel com root/run-as
- ⚠ o que e' especifico desta versao

## 9. Correcao recomendada
- por achado, e ⚠ o que ela NAO resolve
```

⚠ **A seção 8 é obrigatória, e ela é a mesma dos cursos de LLM e de Pesquisa em Windows.** ⚠ Em análise de app, ela tem **três** itens específicos: ⚠ o que exigiu `root`, o que exigiu app depurável, e o que é **específico da versão** analisada.

⚠ **E a linha `COMO OBTIVE` é o que qualifica o achado inteiro** — a conclusão do módulo 9: ⚠ lido por `backup` é **real**; lido por `root` é **condicionado**.

---

## 11.3 O app do projeto

⚠ **Ele tem comportamento **não anunciado**, cobrindo os módulos 2 a 10.** Encontrá-lo é o exercício.

⚠ **A dica de método:** ⚠ **enumere antes de executar**. Manifesto → componentes → exportação → permissões → código → nativo → dado. ⚠ O comportamento não anunciado aparece **contra o esperado**.

⚠ **O que esperar, sem dizer onde:**

| Superfície | ⚠ O que procurar |
|---|---|
| Manifesto | ⚠ `allowBackup` ausente; atributo de risco |
| Componente | ⚠ `exported` sem validação de quem invoca |
| `Intent` | ⚠ Extra usado sem verificação |
| `PendingIntent` | ⚠ Sem `FLAG_IMMUTABLE` |
| Provider | ⚠ Projeção ou URI não validada |
| Código | ⚠ Rastreio incompleto do dado |
| Nativo | ⚠ Tamanho vindo do lado Java, sem conferência |
| Storage | ⚠ Credencial em claro, ou decisão local |
| ⚠ Proteção | ⚠ Local, portanto observável |

⚠ **A tabela é o mapa — não a lista.** ⚠ Parte pode não existir no seu app: ⚠ **notar que não existe** também é trabalho.

---

## 11.4 Como conduzir

⚠ **A sequência, e ela é a do curso inteiro:**

```
   1. INVENTARIAR  ->  pacote, manifesto, componentes (modulos 2 e 3)
        │              ⚠ SEM executar
        ▼
   2. LER          ->  estatica, com hipoteses (5)
        │
        ▼
   3. OBSERVAR     ->  logcat, strace, rede (6)   ⚠ NAO invasivo
        │
        ▼
   4. CONFIRMAR    ->  chamador real, com dado controlado (3 e 4)
        │
        ▼
   5. INSTRUMENTAR ->  Frida, para o que nao e' alcancavel (8)
        │              ⚠ registrar se houve CONTORNO
        ▼
   6. NATIVO       ->  a .so, se houver (7)
        │
        ▼
   7. DADO         ->  mapa, com "como li" (9)
        │
        ▼
   8. PROTECAO     ->  o que ela CONSEGUE (10)
        │
        ▼
   9. REPORTAR     ->  ⚠ com a condicao de obtencao
```

⚠ **O passo 1 antes do 2 é o que economiza tempo** — e o 3 antes do 5 é o que evita instrumentar sem necessidade. ⚠ A instrumentação é o **último** recurso, não o primeiro: ela exige `root`, deixa rastro, e o contorno **pode alterar o comportamento** que você está tentando observar.

⚠ **E o passo 9 exige a coluna de condição:** ⚠ um relatório que não diz **como** obteve o dado é um relatório que o outro lado **não consegue priorizar** — porque não sabe se o achado vale em aparelho comum ou só em aparelho comprometido.

---

## 11.5 Critérios de avaliação

| ✅ Qualifica | ⚠ Não qualifica |
|---|---|
| Inventário completo, sem executar | "testei e vi que dá" |
| ⚠ **Caminho reproduzível** | descrição narrativa |
| ⚠ **Como obtenho o dado** | achado sem condição |
| Causa raiz **com arquivo:linha** | "falta validação" |
| ⚠ **Efeito observado**, não presumido | "deve permitir" |
| Hipótese **descartada com razão** | silêncio sobre o que não deu |
| ⚠ **Limitações declaradas** | — |
| Proteção avaliada pelo que **consegue** | "tem anti-root, logo é seguro" |

⚠ **A terceira linha é a que distingue este relatório:** ⚠ achado sem a condição de obtenção produz **prioridade errada** — e é o erro que faz o outro lado tratar como crítico o que só vale em aparelho com `root`.

⚠ **E a última é a que o módulo 10 cobra:** ⚠ "tem proteção" **não é análise**. ⚠ A pergunta é **o que a proteção consegue** — e a resposta, quase sempre, é **encarecer**.

---

## Laboratório 11 — A análise completa

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Aparelho próprio. `root` opcional — e registre se usou.**

```bash
mkdir -p ~/android-lab/m11 && cd ~/android-lab/m11
cp ../m03/alvo/app-release.apk alvo.apk
sha256sum alvo.apk > alvo.sha256       # ⚠ o hash vai no relatorio
adb install -r alvo.apk
```

```bash
# ── 1. INVENTARIO (modulos 2 e 3) — ⚠ SEM EXECUTAR ─────────
apktool d alvo.apk -o smali
jadx -d jadx alvo.apk

cat > inventario.md <<'EOF'
# Inventario — <app>
## Alvo
- pacote: · versao: · hash: · emissor:
- minSdk/targetSdk: · debuggable: · allowBackup: · nsc:
## Componentes
| Componente | Tipo | exported | permission | O que aceita |
|-----------|------|----------|-----------|--------------|
## Permissoes
| Declarada | ⚠ Usada no codigo? | Onde |
|-----------|-------------------|------|
EOF

# ⚠ preencha ANTES de executar qualquer coisa
```

```bash
# ── 2. ESTATICA (modulo 5) — hipoteses ─────────────────────
grep -rn 'getIntent\|Extra(' jadx/sources/ | head -20 > _entradas.txt
grep -rn 'rawQuery\|execSQL' jadx/sources/ | head > _sql.txt
grep -rn 'loadLibrary\|native ' jadx/sources/ | head > _nat.txt
grep -rn 'PendingIntent' jadx/sources/ | head > _pi.txt

cat > hipoteses.md <<'EOF'
# Hipotese
Superficie:
Fonte do dado:
Uso:
⚠ Verificacao no caminho: ha | nao  (arquivo:linha)
Falsificacao:
EOF
# ⚠ uma ficha por hipotese, preenchida
```

```bash
# ── 3. OBSERVACAO (modulo 6) — nao invasivo ────────────────
adb logcat -c
adb shell am start -n com.exemplo.app/.MainActivity; sleep 2
adb logcat -d | grep -iE 'exemplo' > _log.txt
adb logcat -d | grep -iE 'token|senha|cpf|secret' > _log_sensivel.txt

PID=$(adb shell pidof com.exemplo.app)
adb shell su -c "strace -f -e trace=openat,connect -p $PID" 2>&1 \
  | grep -vE 'ENOENT|/system/|/apex/' > _strace.txt 2>/dev/null &
sleep 5; kill %1 2>/dev/null
```

```bash
# ── 4. CONFIRMACAO (modulos 3 e 4) — chamador real ─────────
#    ⚠ use o app `chamador` do m04, nao o adb
adb shell am start -n com.exemplo.chamador/.AtacarActivity
adb shell am start -n com.exemplo.chamador/.AtacarService
sleep 2
adb logcat -d | tail -30 > _confirmacao.txt
# ⚠ o efeito ocorreu? registre
```

```bash
# ── 5. DADO (modulo 9) — com "COMO LI" ─────────────────────
adb shell run-as com.exemplo.app find /data/data/com.exemplo.app/ -type f \
  2>/dev/null > _storage.txt
cat _storage.txt

# ⚠ e o backup, se aplicavel
adb backup -f bkp.ab -noapk com.exemplo.app 2>/dev/null
ls -la bkp.ab        # ⚠ tamanho > 1KB = o dado saiu
```

```bash
# ── 6. PROTECAO (modulo 10) ────────────────────────────────
grep -rn '/su\|magisk\|frida\|ptrace\|GET_SIGNATURES' jadx/sources/ > _prot.txt
for f in $(find . -name '*.so'); do
  strings -n 4 "$f" | grep -iE 'frida|magisk|ptrace|tamper' >> _prot.txt 2>/dev/null
done
cat _prot.txt
```

```markdown
# relatorio.md — a estrutura do 11.2 COMPLETA
⚠ inclua a secao 8 (LIMITACOES) com os tres itens do modulo
```

**O que observar:** no passo 5, o `find` com `run-as` produz **o mapa completo** do que o app guarda — e é o passo de maior rendimento do laboratório. ⚠ E no passo 3, o `_log_sensivel.txt`: se ele **não estiver vazio**, você tem achado que vale **em aparelho comum**, sem `root` e sem nada.

**Exercício 1:** complete o inventário do passo 1 **antes** de rodar qualquer coisa — e compare depois. ⚠ O que você previu e não aconteceu é tão informativo quanto o contrário.

**Exercício 2:** para cada achado, preencha a linha **`COMO OBTIVE`**. ⚠ Depois classifique: **real** (funciona em aparelho comum) ou **condicionado** (exige `root`/`run-as`/hook).

**Exercício 3 (o que vale):** escreva o **relatório completo** no formato do 11.2, com a seção de limitações e a coluna de condição em **todos** os achados. ⚠ Depois releia e corte todo adjetivo. O que sobra é o que se entrega.

---

## Resumo

- ⚠ **O módulo não tem conteúdo novo** — é aplicação, com comportamento **não anunciado**.
- ⚠ **Inventarie antes de executar** — o não anunciado aparece **contra o esperado**.
- ⚠ **A instrumentação é o último recurso**, não o primeiro: exige `root`, deixa rastro e o contorno pode alterar o que se observa.
- ⚠ **A linha `COMO OBTIVE` qualifica o achado** — real ou condicionado.
- ⚠ **A seção de limitações tem três itens específicos:** o que exigiu `root`, o que exigiu app depurável, e o que é **daquela versão**.
- ⚠ **Achado sem condição de obtenção produz prioridade errada.**
- ⚠ **"Tem proteção" não é análise** — a pergunta é **o que ela consegue**.

---

## Fim do curso

Você atravessou onze módulos e uma afirmação só, que voltou em cada camada:

> **Um aplicativo Android não é uma caixa — é um pacote legível, e um processo observável.**

No módulo 1 ela virou o modelo de `uid`. No 2, o mapa do pacote. Nos módulos 3 e 4, as portas e a autorização. No 5, a leitura e a hipótese. No 6, a confirmação. No 7, o nativo. No 8, a evidência. No 9, o dado. No 10, a tentativa de esconder — e por que ela **encarece** em vez de impedir.

⚠ **E o Curso 3 (`Mobile Application Security`) parte exatamente daqui.** ⚠ Este curso ensinou **a ler** um app. ⚠ Lá, a leitura vira **investigação**: autenticação, sessão, armazenamento inseguro, TLS, `deep link`, `WebView`, anti-tampering — e o ciclo completo de **reprodução, causa-raiz, impacto, correção e regressão**.
