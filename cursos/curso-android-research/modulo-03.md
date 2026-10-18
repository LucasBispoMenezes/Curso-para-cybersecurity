# Módulo 3 — Componentes: `Activity`, `Service`, `Receiver`, `Provider`

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 3 de 11 · 4 horas
**Pré-requisitos:** Módulos 1 e 2
**Próximo:** Módulo 4 — Permissões, IPC e `JNI`

---

## O que este módulo entrega

Ao final, você vai entender **a superfície de ataque do Android por excelência**: os componentes. Você vai saber **quem pode invocar cada um**, com que dado, e **onde a autorização falta** — e vai saber testar isso sem precisar de código no app alvo.

---

## 3.1 O componente é uma porta

⚠ **A diferença estrutural em relação a uma aplicação web, e ela é o coração do módulo:**

```
   APP WEB                          APP ANDROID
   ───────                          ───────────

   o atacante manda HTTP            ⚠ OUTRO APP invoca o componente
   ⚠ passa pelo servidor              sem passar por tela nenhuma
     (que valida)

   superficie: rotas                ⚠ superficie: COMPONENTES
   descoberta: por enumeracao       ⚠ descoberta: pelo MANIFESTO
```

⚠ **A frase que organiza o módulo:**

> **Todo componente `exported="true"` é uma porta com um contrato — e o contrato diz
> quem pode entrar e o que pode trazer.**

⚠ **E a assimetria que torna isso explorável:** ⚠ a tela do app mostra **um** caminho. ⚠ O componente aceita **qualquer app** que o invoque — **sem passar pela tela**, e com o dado que ele quiser.

⚠ **É a mesma tese do módulo 4 do curso de Web Apps:** ⚠ *a interface esconde, o backend não verifica*. ⚠ Aqui: **a tela não mostra, e o componente aceita.**

---

## 3.2 `Activity`: a tela que pode ser aberta por outro

⚠ **O caso mais simples e o mais comum:**

```xml
<activity android:name=".PerfilActivity"
          android:exported="true" />        ⚠ qualquer app abre
```

⚠ **O que outro app pode fazer, e em uma linha de código:**

```java
// ⚠ Um app QUALQUER, no mesmo aparelho
Intent i = new Intent();
i.setClassName("com.exemplo.app",           // ⚠ o pacote do alvo
               "com.exemplo.app.PerfilActivity");
i.putExtra("usuario_id", "999");            // ⚠ dado escolhido por NOS
startActivity(i);
```

⚠ **A pergunta de segurança, e ela é a do módulo:** ⚠ a `Activity` **usa** o `usuario_id` que recebeu? ⚠ Ela verifica se o **chamador** tem direito? ⚠ Ou ela presume que só o próprio app a abre?

⚠ **As quatro falhas típicas de `Activity` exportada:**

| Falha | ⚠ O que acontece |
|---|---|
| Confia no `extra` recebido | ⚠ Mostra dado de outro usuário |
| Executa ação com o `extra` | ⚠ Ação em nome de outro |
| ⚠ **`taskAffinity` + `launchMode`** | ⚠ Empilha a tela no app alvo — *task hijacking* |
| Sem validação de `Intent` | ⚠ `Intent` malformado derruba ou confunde |

⚠ **A terceira é a mais específica do Android, e a mais interessante:** ⚠ com `launchMode` e `taskAffinity` mal configurados, outro app consegue **inserir a própria tela na pilha do app alvo** — e o usuário vê a tela falsa **dentro** do app legítimo.

---

## 3.3 `Service`: o componente que executa

⚠ **Mais perigoso que a `Activity`, porque não depende de o usuário ver nada:**

| Tipo | ⚠ Quem invoca, e como |
|---|---|
| **`started`** | ⚠ `startService` — outro app pode iniciar |
| **`bound`** | ⚠ `bindService` — outro app pode se **conectar** |
| **`foreground`** | Exige notificação visível |
| ⚠ **`AIDL` (`bound`)** | ⚠ ⚠ **Interface exposta** — o caso mais grave |

⚠ **A linha do `AIDL` é a que merece atenção:** ⚠ um serviço `bound` com interface `AIDL` expõe **métodos** a quem se conecta. ⚠ Se o serviço não verifica o `uid` do chamador, **outro app chama a operação privilegiada** — e não há tela no caminho.

```java
// ⚠ O lado do SERVICO: como se verifica quem chamou
public IBinder onBind(Intent intent) {
    // ⚠ a checagem que falta na maioria
    int uid = Binder.getCallingUid();
    if (uid != Process.myUid()) {
        // ⚠ so aceita do proprio app
        return null;
    }
    return new MeuBinder();
}
```

⚠ **A linha `Binder.getCallingUid()` é a correção, e o módulo 4 a aprofunda.** ⚠ Sem ela, o serviço **não sabe quem chamou** — e serve a qualquer app.

⚠ **E a variante sem `AIDL` também é perigosa:** ⚠ um `Service` `started` que lê o `extra` do `Intent` e **faz algo** com ele (baixa um arquivo, escreve no banco) executa **com o `uid` do app alvo**, a pedido de outro app.

---

## 3.4 `BroadcastReceiver`: o componente que escuta

⚠ **A inversão: aqui o app **recebe**, e a pergunta é **quem pode enviar**.**

| Registro | ⚠ Quem pode alcançar |
|---|---|
| **No manifesto** | ⚠ Qualquer app, **mesmo se o app não estiver rodando** |
| **Em runtime** | ⚠ Só quem está rodando, e depende da flag |
| ⚠ **`exported="true"`** | ⚠ ⚠ Qualquer app envia |
| Com `permission` | ⚠ Só quem **tem** aquela permissão |
| ⚠ **`LocalBroadcastManager`** | ⚠ Só o próprio app — **não é IPC** |

⚠ **A primeira linha é a mais subestimada:** ⚠ um `Receiver` no manifesto é **ativado pelo sistema** mesmo com o app fechado. ⚠ Isso significa que ele é **superfície permanente** — e que enviar um `Intent` para ele pode **acordar o app** e disparar código.

```xml
<!-- ⚠ VULNERAVEL — receiver exportado sem checagem -->
<receiver android:name=".ComandoReceiver" android:exported="true">
    <intent-filter>
        <action android:name="com.exemplo.app.ACAO_INTERNA" />
    </intent-filter>
</receiver>
```

```java
// ⚠ o receiver faz o que a acao disser, sem verificar quem enviou
public void onReceive(Context c, Intent i) {
    String acao = i.getStringExtra("comando");   // ⚠ dado de OUTRO APP
    executa(acao);                                // ⚠ executa no uid do alvo
}
```

⚠ **A correção é uma de três, e a escolha importa:**

| Correção | ⚠ Quando serve |
|---|---|
| `android:exported="false"` | ⚠ Se só o app envia |
| `android:permission="..."` | ⚠ Se outro app **legítimo** envia |
| ⚠ **Validar o `sender` e a ação** | ⚠ Quando exportado por desenho |

⚠ **A terceira é a que quase nunca aparece**, e é a única que serve quando o `Receiver` **precisa** ser exportado — por integração com o sistema, por exemplo. ⚠ E é onde está o bug: **exportado de propósito, sem validação nenhuma**.

---

## 3.5 `ContentProvider`: o componente que expõe dado

⚠ **O mais crítico dos quatro, e a razão é direta: ele **existe para compartilhar dado**.**

```
   OUTRO APP
      │  ContentResolver.query(uri, ...)
      ▼
   ┌─────────────────────────────────────────────┐
   │  ContentProvider do app alvo                 │
   │                                              │
   │  ⚠ 1. exportado?          -> senao, acabou   │
   │  ⚠ 2. permission?         -> quem precisa ter│
   │  ⚠ 3. uri validada?       -> qual caminho?   │
   │  ⚠ 4. SQL parametrizado?  -> ⚠ ou injecao    │
   │  ⚠ 5. projecao validada?  -> ⚠ ou vazamento  │
   └─────────────────────────────────────────────┘
```

⚠ **As cinco perguntas são o método de análise do provider, e cada uma é um achado possível:**

| # | Pergunta | ⚠ O que falta produz |
|---|---|---|
| 1 | É exportado? | Acesso de qualquer app |
| 2 | Exige `permission`? | Acesso sem permissão |
| 3 | ⚠ Valida o **caminho** da URI? | ⚠ Path traversal no dado |
| 4 | ⚠ Usa **consulta parametrizada**? | ⚠ **SQL injection**, via outro app |
| 5 | ⚠ Valida a **projeção**? | ⚠ Lê **coluna** que não devia |

⚠ **A quarta é a mais surpreendente para quem vem de web:** ⚠ um `ContentProvider` roda **`query()`** no SQLite, e se ele monta a consulta com **o argumento que veio do outro app**, isso é **SQL injection** — igual ao módulo 5 do curso de Web Apps, mas a "entrada" vem de **outro app**, não de um formulário.

⚠ **E a quinta é a que vaza sem chamar atenção:** ⚠ mesmo com a URI validada, se a **projeção** (as colunas pedidas) não é validada, o outro app **pede a coluna que não devia** — e recebe.

```java
// ⚠ VULNERAVEL — caminho montado com o argumento de fora
public Cursor query(Uri uri, String[] proj, String sel, String[] args, String ord) {
    // ⚠ `sel` vem do CHAMADOR
    return db.rawQuery("SELECT * FROM dados WHERE " + sel, args);
    //                            ^^^^ injecao, vinda de outro app
}
```

⚠ **A correção tem **duas** partes, e a segunda é a que a maioria esquece:**

```java
// ✅ CORRIGIDO
private static final Set<String> COLUNAS_OK =
    Set.of("_id", "nome", "criado_em");     // ⚠ allowlist de coluna

public Cursor query(Uri uri, String[] proj, String sel, String[] args, String ord) {
    // 1. ⚠ allowlist da PROJECAO
    if (proj != null) {
        for (String c : proj) {
            if (!COLUNAS_OK.contains(c)) throw new IllegalArgumentException();
        }
    }
    // 2. ⚠ consulta PARAMETRIZADA — `sel` nao entra na string
    return db.query("dados", proj, "dono = ?", new String[]{ uidAtual() }, null, null, null);
}
```

⚠ **A primeira parte é a mesma lição do módulo 4 do curso de Web Apps:** ⚠ **allowlist**, e não denylist. ⚠ A segunda é a mesma do módulo 5: ⚠ **separar o canal**, e não escapar.

⚠ **E note o `dono = ?`:** ⚠ o provider precisa filtrar **pelo `uid` de quem chama** — `Binder.getCallingUid()`. ⚠ Sem isso, o provider serve **o dado de todos** a quem perguntar.

---

## 3.6 O método de teste

⚠ **Como se testa um componente, sem escrever código no app alvo:**

```bash
# ── Activity: abrir diretamente, com dado escolhido ─────────
adb shell am start -n com.exemplo.app/.PerfilActivity \
         --es usuario_id "999"
# ⚠ --es passa STRING; --ei passa inteiro; --ez booleano

# ── Service: iniciar ────────────────────────────────────────
adb shell am startservice -n com.exemplo.app/.SyncService \
         --es url "http://127.0.0.1:8000/"

# ── Broadcast: enviar ───────────────────────────────────────
adb shell am broadcast -a com.exemplo.app.ACAO_INTERNA \
         --es comando "apagar_tudo"

# ── Provider: consultar ─────────────────────────────────────
adb shell content query --uri content://com.exemplo.app.dados/
adb shell content query --uri content://com.exemplo.app.dados/ \
         --projection "_id,nome,senha_hash"
# ⚠ a segunda consulta e' a que testa a allowlist de PROJECAO
```

⚠ **O `adb shell am` executa **com o `uid` do shell** — não com o de outro app. ⚠ Isso importa: ele testa **exportação**, e não testa **permissão entre apps**. ⚠ Para o segundo caso, o lab usa **dois apps** — e o módulo 4 explica a diferença.

⚠ **A distinção, escrita com clareza, porque ela engana:**

| Ferramenta | ⚠ O que ela prova |
|---|---|
| `adb shell am` | ⚠ Que o componente é **alcançável** |
| ⚠ **App próprio como chamador** | ⚠ Que ele é alcançável **por outro app**, com o `uid` dele |
| `content query` | ⚠ Que o provider responde — e **o que** ele devolve |

⚠ **A segunda linha é a que o curso insiste:** ⚠ o teste **honesto** é com um app de verdade, com o `uid` de app. ⚠ O `adb` é conveniência — e pode reportar sucesso onde um app real seria negado, ou o contrário.

---

## Laboratório 3 — Invocar os componentes

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Alvo: o app de laboratório, no seu aparelho. Snapshot recomendado.**

```bash
mkdir -p ~/android-lab/m03 && cd ~/android-lab/m03

# ── 0. Confirme a hipotese do modulo 2 ──────────────────────
#    ⚠ uso a previsao.md do m02, e compare com o que acontece AGORA
cat ../m02/previsao.md
```

```bash
# ── 1. O INVENTARIO, do aparelho ────────────────────────────
adb shell dumpsys package com.exemplo.app | \
  grep -A2 -E 'Activity|Service|Receiver|Provider' | head -50

# ⚠ e a lista "crua" de exportados
adb shell dumpsys package com.exemplo.app | grep -i exported | head -20
```

```bash
# ── 2. ACTIVITY ─────────────────────────────────────────────
#    ⚠ o caminho previsto: abrir pela tela
adb shell am start -n com.exemplo.app/.MainActivity
#    ⚠ o caminho NAO previsto: abrir a tela interna, com dado
adb shell am start -n com.exemplo.app/.PerfilActivity --es usuario_id "999"
#    ⚠ observe: mostrou dado de outro usuario? aceitou o extra?

# ⚠ e a variante: extra malformado
adb shell am start -n com.exemplo.app/.PerfilActivity --es usuario_id "%s%s%s"
```

```bash
# ── 3. SERVICE ──────────────────────────────────────────────
adb shell am startservice -n com.exemplo.app/.SyncService
adb shell am startservice -n com.exemplo.app/.SyncService \
         --es url "http://127.0.0.1:8000/coletor"
# ⚠ o app fez a requisicao? para o ENDERECO ESCOLHIDO POR NOS?

# ⚠ observe o log
adb logcat -d | grep -i -E 'syncservice|http' | tail -10
```

```bash
# ── 4. BROADCAST ────────────────────────────────────────────
adb shell am broadcast -a com.exemplo.app.ACAO_INTERNA
adb shell am broadcast -a com.exemplo.app.ACAO_INTERNA \
         --es comando "apagar_tudo"
# ⚠ o app obedeceu ao comando vindo de fora?

# ⚠ e observe se o app foi ACORDADO (estava fechado?)
adb shell dumpsys activity processes | grep com.exemplo.app
```

```bash
# ── 5. PROVIDER ─────────────────────────────────────────────
adb shell content query --uri content://com.exemplo.app.dados/
# ⚠ o esperado: devolve as linhas

adb shell content query --uri content://com.exemplo.app.dados/ \
         --projection "_id,nome,senha_hash"
# ⚠ a projecao nao autorizada devolveu algo?

# ⚠ e a URI com caminho alternativo
adb shell content query --uri content://com.exemplo.app.dados/../outro
adb shell content query --uri "content://com.exemplo.app.dados/1 OR 1=1"
```

```bash
# ── 6. ⚠ O TESTE HONESTO: um app como chamador ──────────────
#    Escreva um app MINIMO (Android Studio ou linha de comando)
#    que faca as mesmas chamadas do passo 2 a 5.
#    ⚠ ele roda com o UID DELE, nao com o do shell.
#    ⚠ compare: o resultado e' o mesmo?
```

**O que observar:** nos passos 2 a 5, cada componente respondeu **sem passar por tela nenhuma**. ⚠ E no passo 6, a comparação que qualifica tudo: o `adb` testa **alcançabilidade**; um app de verdade testa **alcançabilidade por outro app**. ⚠ A diferença entre os dois é o que separa "o componente é exportado" de "qualquer app consegue".

**Exercício 1:** para cada componente alcançado, escreva a linha do **formato de achado**: componente, `exported`, `permission`, o dado aceito, e **o que aconteceu**. ⚠ Todos os componentes entram na tabela — inclusive os que **não** responderam.

**Exercício 2:** corrija **um** dos defeitos com a correção certa do 3.5 (`exported=false`, ou `permission`, ou validação). ⚠ Recompile o app e mostre que a chamada **deixa de funcionar** — sem quebrar o funcionamento legítimo.

**Exercício 3 (o que vale):** escreva o app de chamador do passo 6 e prove, com **dois** componentes, que o resultado do app difere do resultado do `adb`. ⚠ Explique a diferença em duas linhas. ⚠ É o exercício que mostra por que a análise de componente exige chamador real.

---

## Resumo

- ⚠ **Todo componente `exported="true"` é uma porta com contrato** — quem entra, e o que traz.
- ⚠ **A tela não é a superfície: o componente é** — e ele é invocável **sem passar pela tela**.
- **`Activity`**: confiança no `extra`; ⚠ `taskAffinity` + `launchMode` produzem *task hijacking*.
- **`Service`**: ⚠ `bound` com `AIDL` expõe **métodos** — a correção é **`Binder.getCallingUid()`**.
- **`Receiver`**: ⚠ registrado no manifesto é **superfície permanente**, e acorda o app. Exportado por desenho **exige validação** — e é onde está o bug.
- **`Provider`**: ⚠ cinco perguntas — exportado, permissão, URI, **parametrização** e **projeção**.
- ⚠ **SQL injection em `ContentProvider`** é a mesma do curso de Web Apps: a entrada vem de **outro app**.
- ⚠ **O `Provider` precisa filtrar pelo `Binder.getCallingUid()`** — senão serve o dado de todos.
- ⚠ **`adb shell am` testa alcançabilidade; um app como chamador testa acesso real** — e a diferença é o achado.

---

## O que o próximo módulo entrega

Você sabe invocar componentes. O módulo 4 aprofunda **o que autoriza — e o que não autoriza**: permissões, `IPC` e `JNI`, incluindo o `Binder` que decide quem chamou.
