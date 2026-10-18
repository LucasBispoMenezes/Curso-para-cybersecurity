# Avaliações — Pesquisa de Segurança em Windows: Do Mapa ao Achado

**Banco de questões por módulo · resposta comentada**

---

## Como usar

Três blocos por módulo: **conceito** (o mecanismo ficou claro), **leitura de código** (você reconhece o padrão) e **mão na massa** (você produz). A resposta comentada explica o *porquê*.

⚠ **A diferença deste banco:** quase toda resposta aponta para **a linha** ou para **a taxa** — porque o critério do curso é *causa em uma frase, primitiva explícita, taxa com N*.

---

## Módulo 1 — Triagem de alvo

**1.1 (conceito)** Qual a competência mais subestimada da pesquisa?

> **Resposta:** **descartar rápido**. ⚠ Quem estuda tudo não estuda nada — e o pesquisador que testa 40 drivers sem critério acha apenas o que qualquer scanner acharia.

**1.2 (conceito)** Por que a triagem vem antes do `IOCTL`?

> **Resposta:** porque **toda a triagem é leitura estática** — registro, assinatura, imports, ACL, métodos. ⚠ Nada executa. Escolher antes de executar é o que reduz tempo **e** risco.

**1.3 (conceito)** Qual o único item que classifica o risco sem ler código?

> **Resposta:** os **2 bits baixos** do `IOCTL`. ⚠ `xx11` é `METHOD_NEITHER` — candidato automático, extraído por cálculo.

**1.4 (conceito)** Por que "privilégio exigido" é a linha que separa escalação de bug?

> **Resposta:** porque um bug em driver que **só o `SYSTEM`** alcança é bug — e **não é escalação**. ⚠ A ACL do device define se o achado tem valor de escalação.

**1.5 (conceito)** Por que um driver `WDF` recente tende a ser descartado?

> **Resposta:** porque o **framework faz validação de contrato por você** — inclusive de método de buffer. ⚠ Ele tem menos chance de falhar no que o módulo 2 ensina. E é a fonte do **falso positivo mais comum** do módulo 10.

**1.6 (leitura de código)** Um driver tem CVE público já corrigido. Descartar?

> **Resposta:** **não** — é **mudança de objetivo**. ⚠ Um driver já corrigido é ponto de partida para `variant hunting` (módulo 10), não para análise do zero.

**1.7 (mão na massa)** Preencha a ficha de triagem para três drivers.

> **Resposta:** o campo `RAZÃO` é obrigatório. ⚠ "vale" sem critério é palpite — e o critério vem dos pesos do 1.3.

---

## Módulo 2 — O contrato do `IOCTL`

**2.1 (conceito)** Enuncie a tese do curso em uma frase.

> **Resposta:** *o driver declara o método, declara o tamanho, e não valida o que o userspace mandou.* ⚠ O resto é consequência.

**2.2 (conceito)** Descreva os quatro campos do código de `IOCTL` e o que cada um diz.

> **Resposta:** `DeviceType` (16 bits — `0x8000+` é terceiro), `Access` (2 bits), `Function` (12 bits) e **`Method`** (2 bits). ⚠ O número **anuncia o contrato** — é o que torna a triagem possível.

**2.3 (conceito)** `METHOD_BUFFERED` é seguro?

> **Resposta:** **não.** Ele **copia** (protege contra TOCTOU) e ⚠ **não valida tamanho** — o `InputBufferLength` vem do userspace. ⚠ Validar **depois** de ler um campo que pode não existir é a falha típica.

**2.4 (conceito)** O que `METHOD_NEITHER` significa na prática?

> **Resposta:** o gerenciador **não copia e não valida** — `Type3InputBuffer` é **ponteiro cru**. ⚠ Exige `ProbeForRead`/`Write`, `__try/__except` e cópia única.

**2.5 (conceito)** `ProbeForRead` sozinho resolve?

> **Resposta:** **não** — ele valida **no momento da chamada**, e o ponteiro pode ser desmapeado depois. ⚠ A sondagem **e** a cópia ficam **dentro** do `__try`.

**2.6 (leitura de código)** O que ocorre se `InputBufferLength` não for conferido em `BUFFERED`?

> **Resposta:** o driver lê campos que **podem não existir** no buffer — o resto é lixo. ⚠ E se ele usar esse campo como tamanho, o resultado é overflow.

**2.7 (mão na massa)** Preencha o formato do 2.7 para o seu alvo.

> **Resposta:** a linha `O QUE FAZ` precisa citar **a instrução** que dereferencia sem validação — não "não valida". ⚠ É o critério de causa-raiz do curso.

---

## Módulo 3 — Corrupção de pool

**3.1 (conceito)** Um overflow de pool corrompe "a memória"?

> **Resposta:** **não** — corrompe **o vizinho**, ou o header dele. ⚠ O impacto depende do **que estava ali**.

**3.2 (conceito)** O que `pool spray` faz, e por que ele é metade do trabalho?

> **Resposta:** enche o pool com objetos de **tamanho e conteúdo controlados**, para que o overflow atinja **o objeto do atacante**. ⚠ Sem isso, o vizinho é sorte.

**3.3 (conceito)** Por que `Named Pipe` e chave de registro são veículos preferidos?

> **Resposta:** porque o **nome** é string controlada, e ela cai **dentro do pool**, em offset previsível. ⚠ É o `msg_msg` do Windows.

**3.4 (conceito)** Qual a classe mais explorável, e o mecanismo?

> **Resposta:** **corrupção de `LIST_ENTRY`**. ⚠ A operação de remoção escreve em dois endereços escolhidos (`Blink->Flink` e `Flink->Blink`).

**3.5 (conceito)** Por que o `Driver Verifier` é obrigatório?

> **Resposta:** sem *special pool*, o overflow corrompe o vizinho e o bugcheck aparece **longe do culpado**. ⚠ Com ele, o bloco fica no **fim da página** e o primeiro byte além atinge página inválida — **o bugcheck é na cena**.

**3.6 (leitura de código)** O que a `tag` de pool informa?

> **Resposta:** **quem alocou** o bloco atingido — e é isso que **planeja o spray**. ⚠ Tag conhecida = você sabe o que corromper.

**3.7 (mão na massa)** A taxa ficou em 30%. O que fazer?

> **Resposta:** **corrupção dependente de layout** — ajuste o spray. ⚠ Repetir mais vezes **mede**, não alarga.

---

## Módulo 4 — UAF de objeto

**4.1 (conceito)** Por que UAF de objeto vale mais que corrupção de pool?

> **Resposta:** porque o **tipo é conhecido** — o layout está no símbolo. ⚠ A primitiva é **planejada**, não sorteada.

**4.2 (conceito)** Quando o objeto morre, e qual é o par de funções?

> **Resposta:** quando `PointerCount` chega a zero. ⚠ `ObReferenceObject` / `ObDereferenceObject`.

**4.3 (conceito)** Qual o padrão dominante de bug de refcount neste curso?

> **Resposta:** ⚠ **a referência não pega antes do uso assíncrono** — o driver guarda o ponteiro, e usa depois, quando o handle já fechou.

**4.4 (conceito)** Como esse bug se chama no curso de Linux Internals?

> **Resposta:** *`kfree` sem `ptr = NULL`* / `put_*` esquecido no `goto err`. ⚠ **É o mesmo bug, com outro nome.**

**4.5 (conceito)** Quais as três seções do relatório de `Verifier`, e o que cada uma dá?

> **Resposta:** a **classe** (use-after-free), `Freed by` (**quem liberou**) e `Allocated by` (**em qual tipo foi alocado**). ⚠ A terceira **planeja o spray**.

**4.6 (leitura de código)** O driver guarda `p`, libera `p`, e não zera. Qual o achado?

> **Resposta:** UAF determinístico — e o par está **na mesma função**. ⚠ A correção são **duas** linhas: pegar referência e zerar após liberar.

**4.7 (mão na massa)** A taxa foi 0%. O que isso significa?

> **Resposta:** ⚠ **a hipótese sobre a janela está errada** — não que "não é bug". ⚠ A corrida pode estar em outro caminho, outro contexto, ou depender de saturação.

---

## Módulo 5 — Corrida no kernel

**5.1 (conceito)** Por que o `DPC` é o contexto crítico?

> **Resposta:** porque em `DISPATCH_LEVEL` o driver **não pode bloquear**. ⚠ Ele não pode esperar nem pegar a maior parte dos locks — e tende a **desistir** de sincronizar. A desistência é o bug.

**5.2 (conceito)** Quais os quatro padrões de corrida?

> **Resposta:** TOCTOU de estado, refcount sob corrida, **cancelamento de `IRP`** e estado global sem lock.

**5.3 (conceito)** Por que o cancelamento de `IRP` é a corrida clássica?

> **Resposta:** porque exige coordenar dois contextos, e a janela está **entre o cancelamento marcar o `IRP` e a conclusão liberar o contexto**. ⚠ A mitigação é `CancelRoutine` / `CancelSafe`.

**5.4 (conceito)** Repetir mil vezes alarga a janela?

> **Resposta:** **não** — **mede** a taxa. ⚠ Alargar é outra coisa: mais threads, afinidade, operação custosa, fechar durante o uso.

**5.5 (conceito)** Por que afirmar as threads no **mesmo** núcleo ajuda?

> **Resposta:** porque força **preempção** entre elas. ⚠ Em núcleos separados, elas não competem pelo mesmo recurso de escalonamento.

**5.6 (leitura de código)** Qual a correção do TOCTOU de estado?

> **Resposta:** a mesma do módulo 10 do curso de Web Apps: **pôr a condição dentro da operação**, ou travar o intervalo. ⚠ Um `if` não cobre nada.

**5.7 (mão na massa)** Por que a taxa tem **três** números?

> **Resposta:** sem delay, com delay e com afinidade. ⚠ A **diferença** entre eles prova que você **alargou** a janela — e não apenas rodou mais vezes.

---

## Módulo 6 — Confusão de tipo

**6.1 (conceito)** O que o tipo decide?

> **Resposta:** **o que aqueles bytes SIGNIFICAM**. ⚠ Trocar o tipo muda a interpretação **sem sobrescrever nada**.

**6.2 (conceito)** Quais as quatro formas?

> **Resposta:** reocupação com tipo diferente, `OBJECT_HEADER` corrompido, **`TypeInfo` compartilhado** e confusão por `union`.

**6.3 (conceito)** Qual é a específica do Windows, e o que ela produz?

> **Resposta:** **`TypeInfo` compartilhado** — dois tipos do mesmo driver com o mesmo `TypeInfo`. ⚠ Produz **bypass de autorização**, não corrupção.

**6.4 (conceito)** Como se detecta `TypeInfo` compartilhado?

> **Resposta:** comparando os endereços de `TypeInfo` de dois tipos do mesmo driver no WinDbg. ⚠ Se forem **iguais**, está compartilhado.

**6.5 (conceito)** Por que o `Driver Verifier` não detecta confusão de tipo?

> **Resposta:** porque *special pool* detecta **corrupção**, não **semântica**. ⚠ Na confusão, nada é corrompido — o código faz outra coisa e **não dá bugcheck**.

**6.6 (leitura de código)** Nada é sobrescrito e nada quebra. Como se reporta?

> **Resposta:** como **demonstração de comportamento**: *o que deveria acontecer* e *o que aconteceu*. ⚠ É a linha `SEM CORREÇÃO?` do formato — e a razão de este módulo exigir mais texto.

**6.7 (mão na massa)** Onde a confusão apareceu no lab?

> **Resposta:** no campo `tamanho` do `TIPO_A`, lido do offset do **ponteiro** do `TIPO_B` (`0xDEADBEEF`). ⚠ Nada foi sobrescrito: o **tipo** mudou.

---

## Módulo 7 — `BYOVD`

**7.1 (conceito)** O que a assinatura garante?

> **Resposta:** **procedência** — que veio de emissor identificado e não foi modificado. ⚠ **Não** garante que o código seja seguro, nem que o contrato seja válido.

**7.2 (conceito)** Por que `BYOVD` é mais fácil que escrever driver malicioso?

> **Resposta:** porque assinar um driver próprio é **difícil**, e usar um driver assinado **que já é vulnerável** é fácil. ⚠ O Windows carrega driver assinado de **qualquer** fabricante.

**7.3 (conceito)** Por que ele contorna `PPL`?

> **Resposta:** porque `PPL` é verificação de **acesso**, e `BYOVD` chega em **ring 0** — onde a verificação não existe. ⚠ É o módulo 8 em uma linha.

**7.4 (conceito)** Por que fabricante extinto é o pior caso?

> **Resposta:** porque o driver continua **assinado**, continua **carregando**, e **ninguém vai corrigir**. ⚠ O bug é permanente.

**7.5 (conceito)** Qual defesa estrutural existe, e qual é reativa?

> **Resposta:** estrutural — **`HVCI`**, que restringe o que roda em ring 0. Reativa — a **blocklist**, que cobre só o que já se conhece.

**7.6 (conceito)** `Driver Verifier` é defesa?

> **Resposta:** **não** — é **instrumento**. ⚠ Ele faz o bug aparecer, não impede que aconteça.

**7.7 (mão na massa)** Por que os sinais devem ser **correlacionados**?

> **Resposta:** porque nenhum sinal isolado é forte — um driver de hardware assinado em 2016 é comum. ⚠ O achado é a **correlação**: assinatura antiga **e** device aberto **e** operação sensível exposta.

---

## Módulo 8 — `PPL`, `ACG`, `CFG`

**8.1 (conceito)** Qual a pergunta que este módulo responde?

> **Resposta:** ⚠ **o que a mitigação NÃO impede, e qual caminho sobra** — não "ela funciona?".

**8.2 (conceito)** O que `PPL` recusa, e o que ela **não** recusa?

> **Resposta:** recusa `VM_READ`, `VM_WRITE`, `CREATE_THREAD` e `TERMINATE` — **até de `SYSTEM`**. ⚠ **Não** recusa `SYNCHRONIZE`, e **não revoga** handle já concedido.

**8.3 (conceito)** O que `ACG` não protege?

> **Resposta:** ⚠ ring 0 **e** o processo vizinho — ela **não se propaga**. E permite `VirtualProtect` e JIT legítimos.

**8.4 (conceito)** `CFG` valida o quê, e o que escapa?

> **Resposta:** valida que o **destino** é função listada. ⚠ Não valida a **intenção** — um salto **direto** para função legítima tem alvo válido.

**8.5 (conceito)** Por que mitigação **por processo** é o ponto crítico?

> **Resposta:** porque a frota com 80% de cobertura tem **20% de caminho** — e é isso que basta. ⚠ O alvo nunca é o processo mais protegido: `lsass` é o **objetivo**, e o caminho é o processo ao lado.

**8.6 (leitura de código)** Um relatório diz "o sistema está protegido". O que falta?

> **Resposta:** a **coluna `CAMINHO`** e a seção **do que sobra** (8.5). ⚠ Mitigação **encarece**, não **impede**.

**8.7 (mão na massa)** Por que a recomendação precisa de custo?

> **Resposta:** porque ligar `ACG` em processo que gera código em runtime **quebra o produto**, e `BlockNonMicrosoftBinaries` **quebra a operação**. ⚠ Recomendar sem medir custo é o que faz a recomendação ser ignorada.

---

## Módulo 9 — `ETW` e `AMSI` sob teste

**9.1 (conceito)** Qual a diferença entre verificar e medir?

> **Resposta:** verificar é **binário** (`logman query`); medir é **provocar, contar e verificar campo**. ⚠ A configuração diz "ligado"; a medição diz "chegou em 7 de 10".

**9.2 (conceito)** Por que verificar os **campos**, não só a presença?

> **Resposta:** porque um evento de criação de processo **sem `CommandLine`** chega — e não permite investigar.

**9.3 (conceito)** Qual evento costuma **não ter provider**?

> **Resposta:** o **`IOCTL` de driver**. ⚠ Um driver que não emite `ETW` não gera evento — e o módulo 7 explicou por que isso importa.

**9.4 (conceito)** Por que medir **sob carga**?

> **Resposta:** porque sessões têm **buffer**, e sob carga o evento **se perde**. ⚠ Quem ataca **produz ruído** — e é exatamente o cenário em que a perda acontece.

**9.5 (conceito)** `AMSI` é inspeção?

> **Resposta:** é **interface**. ⚠ Se o processo não carrega `amsi.dll`, não há inspeção — e o achado é *"estes processos processam script e não têm AMSI"*.

**9.6 (leitura de código)** O que a linha `SOB CARGA` qualifica?

> **Resposta:** o número. ⚠ Taxa medida em ambiente limpo **superestima** a cobertura — declará-la sem a ressalva é o erro que o curso de Detecção e Evasão combate.

**9.7 (mão na massa)** Por que a recomendação de telemetria precisa de custo?

> **Resposta:** buffer, latência e volume de log. ⚠ Sem o custo, a recomendação é ignorada.

---

## Módulo 10 — `Variant hunting`

**10.1 (conceito)** O que é uma variante?

> **Resposta:** o **mesmo defeito em outro lugar** — a **causa** se repete; o bug não. ⚠ O custo marginal da segunda ocorrência é fração da primeira.

**10.2 (conceito)** Quais as três partes de um padrão?

> **Resposta:** **condição**, **ação suspeita** e ⚠ **ausência**. ⚠ A terceira é a que exige saber *o que deveria existir*.

**10.3 (conceito)** Por que o módulo 2 é pré-requisito deste?

> **Resposta:** porque **procurar uma ausência exige saber o que deveria estar ali**. ⚠ Sem o contrato, não há como procurar o que falta.

**10.4 (conceito)** Qual o âmbito mais produtivo, e por quê?

> **Resposta:** **mesmo fabricante, outro produto** — ⚠ e a razão é organizacional: o fabricante **corrige o que foi reportado**, não o **padrão**.

**10.5 (conceito)** Qual a armadilha de falso positivo mais comum?

> **Resposta:** ⚠ **`WDF`** — o framework faz o tratamento do buffer, e o driver **não chama `Probe`**. ⚠ A heurística o marca, e ele não é vulnerável.

**10.6 (leitura de código)** Por que reportar candidato não confirmado queima credibilidade?

> **Resposta:** porque o `Probe` pode estar em **função separada**, ou o `try/except` ter outra estrutura. ⚠ Reportar sem confirmar é o erro que faz o outro lado descartar o próximo reporte.

**10.7 (mão na massa)** Por que **um** contato por fabricante?

> **Resposta:** porque N reports avulsos fazem a equipe tratar cada um como **evento isolado** — e **não generalizar**, que é exatamente o que produziu as variantes.

---

## Módulo 11 — Método e reporte

**11.1 (conceito)** Qual o ciclo, e quais os dois passos que qualificam o trabalho?

> **Resposta:** alvo, contrato, **hipótese**, lab, trigger, taxa, **primitiva**, reporte. ⚠ Os dois que qualificam são a **hipótese falsificável** e a **primitiva** — os passos 3 e 7.

**11.2 (conceito)** Por que o campo `Falsificação` é obrigatório?

> **Resposta:** porque **hipótese que não pode morrer é crença** — e crença produz falso positivo, que é o que queima credibilidade.

**11.3 (conceito)** O que precisa estar registrado em todo resultado?

> **Resposta:** build do Windows, versão e **hash** do driver, config do `Verifier`, e ⚠ **se é `WDF` ou `WDM`**. ⚠ Esta última é a que mais engana.

**11.4 (conceito)** Qual a estrutura obrigatória do reporte?

> **Resposta:** resumo, alvo, pré-requisito, **causa raiz em uma frase**, reprodução com **taxa**, evidência com a **primitiva**, impacto **medido**, correção, ⚠ **limitações**, divulgação.

**11.5 (conceito)** O que se reporta — a primitiva ou a cadeia?

> **Resposta:** a **primitiva**, com o impacto demonstrado. ⚠ A cadeia até `SYSTEM` não é o que se entrega — é o que se reserva.

**11.6 (conceito)** O que fazer quando **não há** correção possível?

> **Resposta:** entregar **defesa em profundidade** — ACL, blocklist, `HVCI` — e declarar. ⚠ É a mesma estrutura do curso de LLM: sem correção, contenção e declaração.

**11.7 (mão na massa)** Por que a seção de limitações protege o reporte?

> **Resposta:** porque sem ela o achado é **desmentível** por quem conhece o assunto. ⚠ Declarar o que não se testou **fortalece** o reporte.

---

## Avaliação final — o que você deve saber fazer

Ao final do curso, sem consultar:

1. Triar um driver com a ficha, e justificar o veredito com um critério.
2. Classificar um `IOCTL` pelos **2 bits baixos**, sem executar nada.
3. Dizer o que cada método de buffer **promete** e o que o driver **ainda** precisa fazer.
4. Explicar por que `METHOD_BUFFERED` não protege contra tamanho.
5. Produzir corrupção de pool e **medir** a taxa com `Driver Verifier`.
6. Explicar por que UAF de objeto vale mais que corrupção de pool.
7. Enunciar o padrão dominante de bug de `refcount`, e seu nome no Linux.
8. Alargar uma janela de corrida e **provar** que alargou.
9. Explicar a confusão por `TypeInfo` compartilhado e como detectá-la.
10. Dizer o que a **assinatura** garante e o que **`PPL` não revoga**.
11. Medir cobertura de telemetria **sob carga**.
12. Abstrair um padrão de 3 partes e aplicá-lo a N binários.
13. Escrever um reporte com **causa em uma frase**, **primitiva** e **limitações**.

⚠ **Se os treze itens fecham, o curso cumpriu o objetivo.** Os itens 5, 8 e 13 são os que a prática cobra primeiro.
