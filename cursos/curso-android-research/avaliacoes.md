# Avaliações — Android Security Research: Internals e Engenharia Reversa

**Banco de questões por módulo · resposta comentada**

---

## Como usar

Três blocos por módulo: **conceito**, **leitura de código** e **mão na massa**. A resposta comentada explica o *porquê*.

⚠ **O critério deste curso:** achado com **caminho reproduzível**, causa raiz **com arquivo e linha**, e a coluna **como obtive**.

---

## Módulo 1 — Arquitetura e modelo de segurança

**1.1 (conceito)** No Android, o que corresponde ao "usuário" do Linux desktop?

> **Resposta:** o **aplicativo**. ⚠ Cada app instalado recebe um **`uid`** próprio, e todos os seus processos rodam com ele. É o **sandbox do `uid`**, com o mecanismo do kernel.

**1.2 (conceito)** O que a permissão do Android **não** faz?

> **Resposta:** não é sistema de arquivo. ⚠ Ela autoriza **chamar API protegida** (câmera, contato); o dado do app é protegido por **`uid`** — e a permissão não muda isso.

**1.3 (conceito)** O que a assinatura garante, e o que ela não garante?

> **Resposta:** garante **identidade de publicação** e impede substituição por app de assinatura diferente. ⚠ Não garante **qualidade** nem que o app seja legítimo.

**1.4 (conceito)** ⚠ Por que `root` não basta para ler um arquivo de app?

> **Resposta:** porque o **`SELinux`** é uma segunda camada. ⚠ Um processo com `uid 0` em domínio errado continua **negado** — e `avc: denied` no `dmesg` diz qual domínio negou.

**1.5 (leitura de código)** Um app não conseguiu ler arquivo, e outro não conseguiu usar a câmera. Quem decidiu cada um?

> **Resposta:** o **kernel** (`uid`/`SELinux`) no primeiro; o **`system_server`** (permissão) no segundo. ⚠ Saber qual camada decidiu é o que orienta a correção.

**1.6 (mão na massa)** Por que `sharedUserId` é informação de segurança?

> **Resposta:** porque **dois apps dividem o `uid`** — e, portanto, **se leem**. ⚠ É ampliação de superfície, e aparece no `dumpsys package` como `sharedUser`.

---

## Módulo 2 — APK, DEX, ART e o `AndroidManifest`

**2.1 (conceito)** Por que o `AndroidManifest` dentro do APK precisa de ferramenta?

> **Resposta:** porque ele é **binário** — o `cat` mostra bytes. ⚠ O `apktool`/`jadx` decodifica, e é o primeiro comando da análise.

**2.2 (conceito)** ⚠ Em que DEX difere de `.class`?

> **Resposta:** **um arquivo para todas as classes** (daí o `multidex`) e **registradores** em vez de pilha. ⚠ É por isso que o descompilador **nem sempre acerta**.

**2.3 (conceito)** O que `jadx` e smali entregam, e qual é a verdade?

> **Resposta:** `jadx` dá **Java legível**; o smali é **fiel ao bytecode**. ⚠ Quando discordam, **o smali decide**.

**2.4 (conceito)** ⚠ Cite os cinco atributos que decidem a análise.

> **Resposta:** `exported`, `permission`, **`debuggable`**, **`allowBackup`** e `networkSecurityConfig`.

**2.5 (leitura de código)** `android:allowBackup` está **ausente**. O que isso significa?

> **Resposta:** ⚠ **`true`** — o default. ⚠ O dado do app **sai por `adb backup`**, sem `root` e sem falha nenhuma. Ausente ≠ `false`.

**2.6 (mão na massa)** Por que o módulo 2 é pré-requisito de todo o resto?

> **Resposta:** porque **o comportamento é previsível a partir do manifesto** — e prever antes de executar é o que evita a tentativa sem método.

---

## Módulo 3 — Componentes

**3.1 (conceito)** O que `exported="true"` significa na prática?

> **Resposta:** **qualquer app do aparelho** pode invocar o componente, **sem passar pela tela**, com o dado que quiser. ⚠ A tela não é a superfície; o componente é.

**3.2 (conceito)** Por que o `ContentProvider` é o mais crítico dos quatro?

> **Resposta:** porque ele **existe para compartilhar dado** — e o desenho é o de expor.

**3.3 (conceito)** ⚠ Quais as cinco perguntas de análise de um `Provider`?

> **Resposta:** é exportado? exige permissão? valida a **URI**? usa **consulta parametrizada**? valida a **projeção**?

**3.4 (conceito)** Como aparece SQL injection em `Provider`?

> **Resposta:** quando a consulta é montada com **seleção ou projeção vindas do chamador**. ⚠ A "entrada" vem de **outro app**, não de um formulário — e a correção é a do curso de Web Apps: **parametrizar**, com **allowlist** de coluna.

**3.5 (leitura de código)** Um `Service` bound com `AIDL` não chama `Binder.getCallingUid()`. Qual o achado?

> **Resposta:** o serviço **não sabe quem chamou**, e serve a qualquer app. ⚠ A correção é uma linha — e é o módulo 4.

**3.6 (mão na massa)** ⚠ Por que `adb shell am` **não** prova acesso entre apps?

> **Resposta:** porque ele roda com o `uid` do **shell**. ⚠ Prova **alcançabilidade**, não **acesso de outro app**. O teste honesto usa um **app como chamador**.

---

## Módulo 4 — Permissões, IPC e JNI

**4.1 (conceito)** O `Binder` esconde o chamador?

> **Resposta:** **não**. ⚠ `Binder.getCallingUid()` devolve o `uid` real, e não é forjável pelo app. A falha é **de código que não pergunta**.

**4.2 (conceito)** Qual a diferença entre permissão do **app** e do **componente**?

> **Resposta:** `uses-permission` autoriza o app a **usar a API**; `android:permission` **no componente** exige a permissão **do chamador**. ⚠ Confundir os dois é o erro mais comum.

**4.3 (conceito)** ⚠ O que acontece se o código trata `getCallingPackage() == null` como confiável?

> **Resposta:** nulo significa **"não sei quem chamou"** — e ele entra no caminho privilegiado. ⚠ O default correto é **negar**.

**4.4 (conceito)** Explique o `PendingIntent` sem `FLAG_IMMUTABLE`.

> **Resposta:** outro app **executa** o `PendingIntent` **preenchendo** o `Intent` interno — com o `uid` do app que o criou. ⚠ É **autoridade emprestada**, a mesma classe do `Impersonation` do curso de Windows Internals.

**4.5 (leitura de código)** Um método `native` recebe `jbyteArray` e faz `memcpy` sem conferir o tamanho. Qual a classe?

> **Resposta:** a do módulo 2 do Windows Internals e a do 5 do Web Apps: **o tamanho vem de fora, e ninguém confere**. ⚠ A fronteira é nova; a falha não.

**4.6 (mão na massa)** Quais os três cenários que o relatório precisa cobrir?

> **Resposta:** chamador **sem** permissão, chamador **com** permissão, e chamador com **dado malformado**. ⚠ O segundo evita o **falso positivo** — é a régua do curso de Web Apps.

---

## Módulo 5 — Engenharia reversa estática

**5.1 (conceito)** Qual a diferença entre `jadx` e smali, e quando usar cada um?

> **Resposta:** `jadx` para entender o fluxo; **smali** quando o descompilador falha. ⚠ O bytecode é o que roda.

**5.2 (conceito)** O que são `p0` e `p1` no smali?

> **Resposta:** parâmetros. ⚠ Em método **de instância**, `p0` é o `this` e o primeiro parâmetro é `p1`; em **estático**, o primeiro parâmetro é `p0`. Contar errado desloca toda a leitura.

**5.3 (conceito)** ⚠ Como a validação aparece no smali?

> **Resposta:** como **um `if` que pula** para o caminho de erro. ⚠ E a **ausência** dela é igualmente visível — não há `if` entre o `move-result` e o uso.

**5.4 (conceito)** Por que começar pelas chamadas de API, e não pela entrada?

> **Resposta:** porque **subir é mais fácil que descer**. ⚠ Você começa pelo **efeito** e sobe até a entrada — a mesma inversão do curso de Pesquisa em Windows.

**5.5 (leitura de código)** Um app tem tudo renomeado (`a`, `b`, `c`). A análise está perdida?

> **Resposta:** **não**. ⚠ As **APIs do sistema mantêm o nome** — `getStringExtra`, `execSQL`, `loadLibrary`. Por elas se navega.

**5.6 (mão na massa)** O que a estática **não** vê?

> **Resposta:** código gerado em runtime, o que o ART compilou, e o valor **calculado**. ⚠ Ela produz **hipótese**, não conclusão.

---

## Módulo 6 — Análise dinâmica

**6.1 (conceito)** Por que começar a observação **por fora**?

> **Resposta:** porque `logcat`, tráfego e arquivo são **não invasivos**, não exigem `root`, e produzem **evidência**.

**6.2 (conceito)** ⚠ Quais três informações o `logcat` entrega?

> **Resposta:** o que o app **escreve** (log com dado sensível = achado), o que o `ActivityManager` registra, e ⚠ **`avc: denied`** — a negação do `SELinux`.

**6.3 (conceito)** Como se vê o tráfego de um app com pinning?

> **Resposta:** não se vê o **conteúdo** — mas **o destino aparece**, porque `connect` e `/proc/net/tcp` estão **abaixo** da cifra. ⚠ Para o conteúdo, é preciso hook (módulo 8).

**6.4 (conceito)** O que `strace` entrega que as outras ferramentas não?

> **Resposta:** o que o app **pede ao kernel** — `openat` revela **onde ele guarda dado**, ⚠ e `ptrace` **denuncia a proteção**.

**6.5 (leitura de código)** A hipótese não se confirmou. Quais as duas causas possíveis?

> **Resposta:** **hipótese errada** ou **proteção existe**. ⚠ Confundi-las produz **falso negativo** — é a mesma disciplina da taxa zero do curso de Linux Internals.

**6.6 (mão na massa)** Quais as três partes da evidência?

> **Resposta:** requisição (o comando), identidade (quem invoca), e efeito **observado**. ⚠ Sem os três, é impressão.

---

## Módulo 7 — Bibliotecas nativas

**7.1 (conceito)** Por que o nativo é onde o código sensível mora?

> **Resposta:** desempenho, **proteção** (ofuscação de DEX é contornável; o `.so` não é DEX) e reuso. ⚠ Mover para o nativo **muda a ferramenta**, não esconde.

**7.2 (conceito)** Qual o caminho do Java até o símbolo nativo?

> **Resposta:** `loadLibrary` → método `native` → **convenção de nome** (`Java_<pacote>_<classe>_<metodo>`) → `nm -D`.

**7.3 (conceito)** ⚠ O símbolo `Java_*` não aparece. O que aconteceu?

> **Resposta:** o app usa **`RegisterNatives`**, registrado em `JNI_OnLoad`. ⚠ O mapa está na tabela de métodos, **com as assinaturas**.

**7.4 (conceito)** O que a fronteira `JNI` **faz** — e o que ela **não** faz?

> **Resposta:** ela **traduz** entre os mundos. ⚠ **Não valida** — e é aí que a falha aparece: tamanho, ponteiro, tipo.

**7.5 (leitura de código)** Onde a validação precisa vir?

> **Resposta:** ⚠ **antes** da cópia. Depois do `memcpy`, o dano já aconteceu — é o módulo 1 do curso de Linux Internals.

**7.6 (mão na massa)** Por que `strings` rende antes da desmontagem?

> **Resposta:** porque URL, algoritmo, mensagem de erro e **nome de proteção** são literais. ⚠ Um `.so` com `frida`/`magisk` nas strings **denuncia a proteção** sem ler instrução.

---

## Módulo 8 — Depuração e instrumentação

**8.1 (conceito)** Qual ferramenta atravessa Java **e** nativo?

> **Resposta:** ⚠ **`Frida`** — e é por isso que ele domina a pesquisa e é o alvo das proteções.

**8.2 (conceito)** O que `JDWP` exige que o `Frida` não exige?

> **Resposta:** ⚠ `android:debuggable="true"`. ⚠ Em troca, o `JDWP` **não exige `root`** — é a ferramenta de app próprio.

**8.3 (conceito)** ⚠ O que forçar um retorno com hook **prova**, e o que **não** prova?

> **Resposta:** prova que a validação estava **naquele ponto** e era **o único obstáculo**. ⚠ **Não** prova que outro app alcança o mesmo — o hook já está **dentro** do processo.

**8.4 (conceito)** Por que a seção "o que isso não prova" é obrigatória?

> **Resposta:** porque **hook é prova de análise, não de vulnerabilidade**. ⚠ Sem ela, o relatório afirma demais.

**8.5 (leitura de código)** Por que o contorno de detecção pode quebrar o app?

> **Resposta:** porque alterar `File.exists` afeta **arquivos legítimos** que casaram com o padrão. ⚠ O contorno precisa ser **cirúrgico** — e refeito a cada versão.

**8.6 (mão na massa)** Explique o custo assimétrico.

> **Resposta:** o autor **paga uma vez**; quem analisa **paga a cada versão**. ⚠ É a tese do módulo 10, em uma frase.

---

## Módulo 9 — Armazenamento

**9.1 (conceito)** Quais as sete superfícies de armazenamento?

> **Resposta:** interno, `SharedPreferences`, `SQLite`, externo, `MediaStore`/`SAF`, **backup** e `KeyStore`.

**9.2 (conceito)** ⚠ O que `KeyStore` **não** impede?

> **Resposta:** o **uso** da chave pelo app. ⚠ Ele impede a **extração** — quem tem o app rodando usa a chave; quem tem o arquivo, não.

**9.3 (conceito)** Sem `root` e sem app depurável, o que ainda sai?

> **Resposta:** ⚠ **backup**, **log**, **`/sdcard`** e **provider**. ⚠ São as quatro saídas de maior alcance.

**9.4 (conceito)** Por que `-wal` e `-journal` importam?

> **Resposta:** porque contêm **dado que o app apagou**. ⚠ O disco guarda o que a API diz que não existe — como o `hive` do curso de Windows Internals.

**9.5 (leitura de código)** `premium: true` em `SharedPreferences`. Qual a pergunta?

> **Resposta:** **o servidor confirma?** ⚠ Se não, alterar o arquivo muda o comportamento — é o módulo 10 do curso de Web Apps no aparelho.

**9.6 (mão na massa)** ⚠ Por que a coluna "como li" decide a gravidade?

> **Resposta:** porque lido por **`root`** é **condicionado** a aparelho comprometido; lido por **backup** ou **`/sdcard`** é **real**. ⚠ Em aparelho com `root`, **todo** dado é legível — e isso não é achado do app.

---

## Módulo 10 — Proteção e anti-análise

**10.1 (conceito)** Enuncie a tese.

> **Resposta:** **nenhuma proteção impede; todas encarecem** — e o custo é **assimétrico**.

**10.2 (conceito)** Por que a proteção não impede a análise?

> **Resposta:** porque ela **mora no aparelho**, e quem analisa **controla o aparelho**. ⚠ Toda verificação passa por código **observável**.

**10.3 (conceito)** ⚠ Qual a diferença entre **detecção** e **verificação**?

> **Resposta:** detecção pergunta *"o ambiente é hostil?"* e **contorna-se**; verificação compara com **um valor que está no app** e **patcha-se**.

**10.4 (conceito)** Por que string cifrada não protege?

> **Resposta:** porque a **chave precisa estar no app** para funcionar. ⚠ Ela é **recuperável** — é questão de tempo, não de possibilidade. E o hook vê a string em claro no retorno.

**10.5 (leitura de código)** O que um `DexClassLoader` em execução significa?

> **Resposta:** que o app **carrega DEX que não está no APK**. ⚠ A análise estática do módulo 5 **não cobriu o app inteiro**.

**10.6 (conceito)** Qual é a única defesa **real** no app?

> **Resposta:** a que **remove o dado** — `allowBackup="false"`, escopo correto de armazenamento. ⚠ Reduzir superfície ganha de esconder.

**10.7 (mão na massa)** O que impede o abuso de API?

> **Resposta:** ⚠ **a verificação no servidor** — não a proteção do app. ⚠ Porque o app **precisa funcionar** no aparelho do atacante. É a conclusão que abre o Curso 3.

---

## Módulo 11 — Projeto final

**11.1 (conceito)** Por que inventariar **antes** de executar?

> **Resposta:** porque o comportamento não anunciado aparece **contra o esperado**. ⚠ Quem executa primeiro acha o que estava procurando.

**11.2 (conceito)** Por que a instrumentação é o **último** recurso?

> **Resposta:** porque exige `root`, deixa rastro, e o **contorno pode alterar** o comportamento observado.

**11.3 (conceito)** Quais os três itens específicos da seção de limitações deste curso?

> **Resposta:** o que exigiu **`root`**, o que exigiu **app depurável**, e o que é **específico da versão**.

**11.4 (conceito)** ⚠ O que um achado **sem** a condição de obtenção produz?

> **Resposta:** **prioridade errada** — tratar como crítico o que só vale em aparelho comprometido.

**11.5 (leitura de código)** Um relatório diz "o app tem anti-root, logo é seguro". O que ele erra?

> **Resposta:** confunde **ter proteção** com **análise**. ⚠ A pergunta é **o que ela consegue** — e a resposta é **encarecer**.

---

## Avaliação final

Sem consultar, você deve saber:

1. Explicar o modelo de `uid` e por que `root` não basta (`SELinux`).
2. Abrir um APK e listar os cinco atributos que decidem a análise.
3. Dizer por que `allowBackup` ausente é `true`, e o que isso permite.
4. Descrever as quatro portas (`Activity`, `Service`, `Receiver`, `Provider`) e o contrato de cada uma.
5. Enunciar as cinco perguntas de análise de um `Provider`.
6. Explicar `Binder.getCallingUid()` e a diferença entre permissão do app e do componente.
7. Explicar o `PendingIntent` sem `FLAG_IMMUTABLE` como autoridade emprestada.
8. Ler smali — `.locals`, `p0`, `invoke`, `move-result` — e achar um `if` de validação.
9. Confirmar uma hipótese com **observação não invasiva** antes de instrumentar.
10. Encontrar o símbolo nativo, ou reconhecer `RegisterNatives`.
11. Instrumentar com `Frida` e declarar **o que o hook não prova**.
12. Mapear o armazenamento com a coluna **como li**.
13. Dizer o que cada proteção **consegue**, e por que o abuso se impede no servidor.

⚠ **Se os treze itens fecham, o curso cumpriu o objetivo.** Os itens 6, 12 e 13 são os que a prática cobra primeiro.
