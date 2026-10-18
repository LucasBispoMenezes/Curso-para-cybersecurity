# Módulo 4 — Permissões, IPC e `JNI`

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 4 de 11 · 4 horas
**Pré-requisitos:** Módulos 1 a 3
**Próximo:** Módulo 5 — Engenharia reversa estática

---

## O que este módulo entrega

Ao final, você vai entender **o mecanismo que decide acesso entre apps** — `Binder`, `uid` do chamador, permissão — e como ele **falha**. Você vai saber testar `IPC` com rigor, e vai reconhecer a fronteira `JNI` onde o código sai do mundo gerenciado.

---

## 4.1 `Binder`: por onde tudo passa

⚠ **Todo `IPC` do Android passa pelo `Binder` — e ele **carrega o `uid` do chamador**:**

```
   APP CHAMADOR (uid 10123)
        │
        │  ⚠ transacao Binder
        ▼
   ┌──────────────────────────────────────────────┐
   │  O Binder KERNEL REGISTRA quem chamou          │
   │                                               │
   │    Binder.getCallingUid()  ⚠ = 10123          │
   │    Binder.getCallingPid()  ⚠ = 4521           │
   └──────────────────────────────────────────────┘
        │
        ▼
   SERVIDOR recebe — ⚠ PODE saber quem chamou
```

⚠ **A informação que decide tudo:** ⚠ o `Binder` **não esconde o chamador**. ⚠ `Binder.getCallingUid()` devolve o `uid` **real** de quem fez a transação — e **não pode ser forjado pelo app**.

⚠ **Mas a informação existe e quase ninguém a lê.** ⚠ A falha não é de mecanismo — é de **código que não pergunta**, e é a mesma de todo o curso: a informação está disponível, e o autor presume.

```java
// ⚠ A pergunta que o servidor precisa fazer, em uma linha
public IBinder onBind(Intent i) {
    // ⚠ quem esta chamando?
    int uid = Binder.getCallingUid();
    int pid = Binder.getCallingPid();
    // ⚠ e a partir daqui: autorizar, ou recusar
    return autorizado(uid) ? new MeuBinder() : null;
}
```

⚠ **E há as variantes que confundem, e que valem distinguir:**

| Função | ⚠ O que devolve |
|---|---|
| `Binder.getCallingUid()` | ⚠ **Quem chamou** — o dado correto |
| `Process.myUid()` | ⚠ **Eu** — não diz nada sobre o chamador |
| `getApplicationInfo().uid` | Idem — é o **meu** |
| ⚠ `getCallingPackage()` | ⚠ Só em `Activity` — e **pode ser nulo** |

⚠ **A quarta linha é a pegadinha:** ⚠ `getCallingPackage()` devolve nulo quando a chamada **não** vem por `startActivityForResult`. ⚠ E há código que **trata nulo como "confiável"** — o que é exatamente o inverso.

```java
// ⚠ VULNERAVEL — nulo interpretado como seguro
String pkg = getCallingPackage();
if (pkg == null || pkg.equals(MEU_PACOTE)) {
    // ⚠ nulo entra aqui — e nulo significa "nao sei quem chamou"
    executaOperacaoPrivilegiada();
}
```

⚠ **A correção é sempre a mesma forma:** ⚠ `null` significa **desconhecido**, e desconhecido **não é autorizado**. ⚠ É a lição do módulo 3 do curso de Web Apps aplicada a `IPC`: ⚠ *ausência de informação não é ausência de risco* — e o default tem de ser **negar**.

---

## 4.2 Permissão: os quatro pontos de checagem

⚠ **A permissão é verificada em **quatro** lugares, e confundi-los é o erro mais comum:**

| # | Onde | ⚠ O que ele decide |
|---|---|---|
| 1 | **`system_server`** | ⚠ Se o **app** pode chamar a API |
| 2 | **Manifesto do componente** | ⚠ Se o **chamador** tem a permissão exigida |
| 3 | ⚠ **`Context.checkPermission`** | ⚠ Checagem **em código**, em runtime |
| 4 | ⚠ **`SELinux`** | ⚠ Independente de permissão — módulo 1 |

⚠ **A distinção entre 1 e 2 é o que o módulo instala:**

```
   PERMISSAO DO APP                 PERMISSAO DO COMPONENTE
   ────────────────                 ───────────────────────

   uses-permission                  android:permission="..."
        │                                 │
        ▼                                 ▼
   ⚠ "eu POSSO usar a API"          ⚠ "quem me chama PRECISA ter"

   ⚠ NAO protege o componente        ⚠ protege o componente
```

⚠ **A confusão é frequente e cara:** ⚠ declarar `uses-permission` **não** protege nada do app — apenas autoriza o app a **usar** a API. ⚠ O que protege um componente é `android:permission` **no componente**, que exige a permissão **do chamador**.

⚠ **E a terceira linha é a que aparece em código real:** ⚠ um app que usa `checkPermission` **em runtime** para decidir algo, e o faz **depois** de já ter feito a operação — ou com o `uid` errado (o próprio, em vez do chamador).

---

## 4.3 As falhas típicas de autorização

⚠ **A tabela que o relatório exige, e cada linha é um achado:**

| Falha | ⚠ Mecanismo |
|---|---|
| **Confiar no `extra`** | O dado vem de app, sem verificação |
| ⚠ **Não checar `CallingUid`** | ⚠ O serviço serve a qualquer app |
| ⚠ **`null` tratado como confiável** | ⚠ O inverso do correto |
| **Permissão só no app** | ⚠ Protege a API, não o componente |
| ⚠ **`exported` implícito** | ⚠ `intent-filter` torna exportado por padrão |
| **`grantUriPermissions` sem limite** | ⚠ Concede acesso à URI alheia |
| ⚠ **`PendingIntent` sem flag** | ⚠ ⚠ Outro app **preenche** o `Intent` |
| **`Binder` em app de sistema** | ⚠ Uma falha vale para todos os apps |

⚠ **A sétima merece o destaque, e é a mais elegante do módulo:**

```
   ⚠ PendingIntent SEM FLAG:
      o app A cria um PendingIntent para uma acao do sistema,
      e um app B o executa — ⚠ PREENCHENDO o Intent interno.
      O sistema executa com o UID DO APP A.

   ⚠ Resultado: app B faz o app A executar o que B quiser.
```

⚠ **A correção é a flag de imutabilidade:** ⚠ `FLAG_IMMUTABLE` impede que quem executa **preencha** o `Intent`. ⚠ Sem ela, o `PendingIntent` é um **poder emprestado de se preencher** — e é a mesma classe do `Impersonation` do módulo 8 do curso de Windows Internals: **autoridade emprestada**.

⚠ **E a quinta linha é a armadilha estática:** ⚠ no Android moderno, um componente com `<intent-filter>` **sem** `android:exported` explícito **não compila** — mas em apps antigos, ou em código gerado, ela aparece. ⚠ É por isso que a análise **confirma** o valor em vez de presumir.

---

## 4.4 Onde o `JNI` entra

⚠ **`JNI` (*Java Native Interface*) é a fronteira entre código gerenciado e nativo:**

```
   CAMADA JAVA                      CAMADA NATIVA
   ───────────                      ────────────

   class Minha {                     extern "C" JNIEXPORT jstring
     native String nativo();         JNICALL Java_com_exemplo_Minha_nativo
   }                                  (JNIEnv *env, jobject thiz)
                                          │
   ⚠ System.loadLibrary("minha")          ▼
                                      ⚠ codigo C/C++, em .so
```

⚠ **Três consequências para a análise, e as três importam:**

⚠ **1 — A assinatura é convencional, não implícita.** ⚠ O nome da função nativa é **derivado** do pacote e da classe. ⚠ Isso significa que você **encontra** a função nativa a partir do Java — e é o que liga o módulo 5 (DEX) ao módulo 7 (`lib/*.so`).

⚠ **2 — A fronteira tem contrato próprio.** ⚠ Passar dado entre Java e nativo exige **converter** — string, array, objeto. ⚠ E cada conversão é um ponto onde o dado pode ser **mal tratado**:

```c
// ⚠ VULNERAVEL — tamanho e ponteiro sem conferencia
JNIEXPORT void JNICALL Java_com_exemplo_Minha_copia
    (JNIEnv *env, jobject thiz, jbyteArray dados) {
    jsize n = (*env)->GetArrayLength(env, dados);
    jbyte *p = (*env)->GetByteArrayElements(env, dados, NULL);
    // ⚠ nenhuma conferencia de n contra o buffer de destino
    memcpy(destino, p, n);
    (*env)->ReleaseByteArrayElements(env, dados, p, JNI_ABORT);
}
```

⚠ **É o mesmo padrão do módulo 5 do curso de Web Apps e do módulo 2 do Windows Internals:** ⚠ **o tamanho vem de fora, e ninguém confere**. ⚠ A fronteira é nova; a falha não é.

⚠ **3 — O nativo escapa das proteções do runtime.** ⚠ Ofuscação de DEX, verificação de integridade em Java, hook de método — **nada disso alcança o `.so`**. ⚠ Por isso o módulo 7 existe, e por isso o código sensível **costuma estar lá**.

```bash
# Onde o app declara que usa nativo
grep -rn 'loadLibrary\|System.load' app_jadx/sources/ | head
# ⚠ cada loadLibrary aponta para um .so em lib/

# E o que existe em lib/
unzip -l app.apk | grep '\.so$'
```

⚠ **A primeira consulta é a ponte entre os módulos 5 e 7:** ⚠ ela diz **quais** bibliotecas o app carrega, e **onde** no código Java ele faz isso — que é onde você vai procurar a chamada nativa na desmontagem.

---

## 4.5 Testando `IPC` com rigor

⚠ **O instrumento do módulo, e ele exige **dois** apps — o alvo e o chamador:**

```
   ⚠ ESTRUTURA DO TESTE:

   app_alvo        ── expoe o componente
   app_chamador    ── invoca, com o UID DELE
                       │
                       ├─ 1. invoca o componente
                       ├─ 2. envia dado controlado
                       └─ 3. ⚠ observa: aceitou? validou?

   ⚠ E o TERCEIRO caso: app_chamador SEM permissao nenhuma
```

⚠ **Os três cenários que o relatório precisa cobrir:**

| Cenário | ⚠ O que ele prova |
|---|---|
| **Chamador sem permissão** | ⚠ Se `android:permission` funciona |
| **Chamador com a permissão** | ⚠ Se o **legítimo** ainda funciona |
| ⚠ **Chamador com dado malformado** | ⚠ Se há validação de **conteúdo** |

⚠ **A segunda linha é a que mais se esquece, e a que evita o falso positivo:** ⚠ provar que **o indevido falha** não basta — é preciso provar que **o legítimo continua funcionando**. ⚠ É a régua do módulo 11 do curso de Web Apps: **a correção negativa e a positiva**.

```java
// app_chamador — o mínimo para testar
Intent i = new Intent();
i.setClassName("com.exemplo.app", "com.exemplo.app.PerfilActivity");
i.putExtra("usuario_id", "999");
startActivity(i);

// e o serviço, com dado malformado
Intent s = new Intent();
s.setClassName("com.exemplo.app", "com.exemplo.app.SyncService");
s.putExtra("url", "http://127.0.0.1:8000/coletor");   // ⚠ destino nosso
startService(s);
```

⚠ **A segunda linha é a que demonstra o achado de serviço:** ⚠ o app alvo faz a requisição **para o endereço que outro app escolheu**, com o **`uid` dele**. ⚠ É `SSRF` com outro nome — e as defesas são as do módulo 7 do curso de Web Apps: ⚠ **validar destino**, e **restringir saída**.

---

## Laboratório 4 — Autorização, na prática

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Dois apps, no seu aparelho. Snapshot recomendado.**

```bash
mkdir -p ~/android-lab/m04 && cd ~/android-lab/m04

# ── 0. Os dois apps ────────────────────────────────────────
#    - `alvo`: o app do laboratorio, com os defeitos do modulo 3
#    - `chamador`: um app MINIMO que invoca os componentes
#    ⚠ os dois sao seus, e rodam no seu aparelho

adb install -r alvo/app-release.apk
adb install -r chamador/app-release.apk
adb shell pm list packages | grep -E 'alvo|chamador'
```

```bash
# ── 1. O UID de cada app ───────────────────────────────────
adb shell pm list packages -U | grep -E 'alvo|chamador'
# ⚠ anote os DOIS uids — eles vao aparecer nos logs
```

```bash
# ── 2. ⚠ O SERVIDOR DE COLETA — para provar o SSRF do servico ──
#    rode no SEU computador, e aponte o app para o SEU IP
python3 -m http.server 8000 --bind 0.0.0.0
# ⚠ no emulador, o host e' 10.0.2.2 ; em aparelho, o IP da sua maquina
adb reverse tcp:8000 tcp:8000    # ⚠ alternativa para emulador/dispositivo USB
```

```bash
# ── 3. ⚠ CHAMADOR SEM PERMISSAO — o cenario central ────────
#    ⚠ use o app `chamador`, NAO o adb shell
#    (o adb roda como `shell`, e nao prova acesso entre apps)

#    a) Activity com dado escolhido
adb shell am start -n com.exemplo.chamador/.AtacarActivity
adb logcat -d | grep -E 'alvo|PerfilActivity' | tail -10

#    b) Service apontando para o NOSSO servidor
adb shell am start -n com.exemplo.chamador/.AtacarService
# ⚠ veja o log do python3: a requisicao chegou?
```

```bash
# ── 4. O TESTE DO PendingIntent ────────────────────────────
#    ⚠ Se o app alvo usa PendingIntent sem FLAG_IMMUTABLE,
#      o chamador pode PREENCHER o Intent interno.
#    Procure no jadx:
grep -rn 'PendingIntent' ../m02/app_jadx/sources/ | head
grep -rn 'FLAG_IMMUTABLE\|FLAG_UPDATE_CURRENT' ../m02/app_jadx/sources/ | head
# ⚠ ausencia de FLAG_IMMUTABLE e' o achado
```

```bash
# ── 5. ⚠ A CORRECAO — e o teste dos dois lados ─────────────
#    Corrija UM defeito (Binder.getCallingUid, ou exported=false)
#    e recompile o alvo.
#    a) o chamador legítimo ainda funciona?
#    b) o chamador malicioso parou?
```

```bash
# ── 6. ⚠ E o JNI: a ponte para o modulo 7 ──────────────────
grep -rn 'native ' ../m02/app_jadx/sources/ | head
# ⚠ cada metodo `native` aponta para uma funcao no .so
#    ⚠ guarde os nomes: o modulo 7 os procura na desmontagem
```

**O que observar:** no passo 3b, o servidor **recebeu** a requisição do app alvo — com o **`uid` do alvo**, a pedido do **chamador**. ⚠ É o `SSRF` do módulo 7 do curso de Web Apps, com a entrada vindo de **outro app** em vez de um formulário. E no passo 5, os **dois** lados do teste: o legítimo funcionando, e o indevido falhando.

**Exercício 1:** para cada falha encontrada, preencha: componente, chamador, dado, **o que aconteceu**. ⚠ E marque, para cada uma, **qual das oito linhas do 4.3** se aplica.

**Exercício 2:** corrija **um** defeito e rode os **três cenários** do 4.5. ⚠ Escreva a tabela antes e depois. É a régua do curso: **o indevido falha, e o legítimo continua funcionando.**

**Exercício 3 (o que vale):** implemente o teste do `PendingIntent` (passo 4): prove que o chamador consegue **preencher** o `Intent` interno, e depois corrija com `FLAG_IMMUTABLE` e prove que **deixa de conseguir**. ⚠ Escreva, em duas linhas, por que isso é **autoridade emprestada** — e por que é a mesma classe do `Impersonation` que você viu no curso de Windows Internals.

---

## Resumo

- ⚠ **Todo `IPC` passa pelo `Binder`, e o `Binder` **não esconde o chamador**` — `getCallingUid()` devolve o `uid` real.
- ⚠ **A falha não é de mecanismo: é de código que não pergunta.**
- ⚠ **`getCallingPackage()` pode devolver `null`** — e tratá-lo como confiável é o inverso do correto.
- ⚠ **Permissão do app ≠ permissão do componente:** `uses-permission` autoriza a API; `android:permission` protege o componente.
- ⚠ **`PendingIntent` sem `FLAG_IMMUTABLE`** permite que outro app **preencha** o `Intent` — é autoridade emprestada.
- ⚠ **`exported` implícito por `intent-filter`** aparece em código antigo ou gerado — confirme, não presuma.
- ⚠ **`JNI` é a fronteira onde o runtime deixa de proteger** — e a mesma falha de sempre reaparece: tamanho vindo de fora, sem conferência.
- ⚠ **Os três cenários do teste:** sem permissão, **com** permissão, e com **dado malformado** — o segundo evita o falso positivo.

---

## O que o próximo módulo entrega

Você entende autorização e `IPC`. O módulo 5 abre **o código**: engenharia reversa estática de DEX — onde a intenção do autor fica visível, e onde a ofuscação tenta escondê-la.
