# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos nove módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — O que é APT e por que é diferente

**1. Definição operacional e "alvo selecionado"**

Três propriedades necessárias: persistência intencional, recursos e sofisticação, e alvo
selecionado. "Alvo selecionado" muda a defesa porque **fechar a via de entrada não resolve** — o
ator procura outra até achar. Contra oportunista, bloqueio funciona; contra selecionado, você
trabalha com **detecção e encurtamento de tempo de residência**.

**2. Cinco eixos**

Objetivo · alvo · escala de tempo · interesse em ser visto · durabilidade do IOC. Consequências:
crime se resolve em horas com recuperação; APT se resolve em meses **com caça**, e o fim do
incidente pode não ter sintoma nenhum.

**3. "APT" como marketing**

Virou rótulo de produto: qualquer coisa persistente passou a ser "APT". Isso inutiliza o termo
para priorização — você não consegue distinguir ator com recurso de crime persistente, e a defesa
aloca esforço errado.

**4. "Encurtar a estadia"**

Você não impede a entrada de ator com recurso e alvo definido; ele tem tempo e múltiplas vias.
O que você controla é **quanto tempo ele fica** — e é isso que determina o dano.

**5. Sem sintoma**

O dano é **perda de informação**, não indisponibilidade. Nada foi cifrado, nada caiu, nada mudou
visivelmente. Você descobre por caça, por terceiro, ou meses depois.

**6. A pergunta da primeira hora**

"Qual é a nossa retenção de log, e o que eu consigo consultar dos últimos doze meses?" A resposta
frequentemente revela a maior lacuna: retenção de 30–90 dias, quando o ator pode estar há meses.

**7. "Retroativo"**

Um ator residente há meses deixou rastro no log dos meses. Sem consulta retroativa, você só
consegue detectar o que acontecer **depois** de você aprender a procurar — e o ator continua
invisível no histórico.

**8. Comportamento e motivação**

Coleta documento/e-mail → espionagem · cifra e cobra → dinheiro · deface/publica → hacktivismo ·
destrói sem coletar → sabotagem · **fica silencioso após obter acesso** → posicionamento.

**9. O ator que não faz nada**

Não há comportamento a detectar — só a **presença**. É o caso mais sofisticado porque derrota
toda detecção baseada em evento. Só inventário diferencial e revisão de acesso encontram.

**10. Três erros de atribuição**

Por ferramenta (ferramenta vaza, é vendida, é plantada) · por IOC (oscila entre campanhas do mesmo
ator) · com certeza absoluta (nenhuma atribuição técnica é absoluta).

**11. Frase correta**

"Com **confiança moderada**, avaliamos sobreposição com [grupo] com base em [evidência 1] e
[evidência 2]. **Não é possível concluir** [X] a partir do dado disponível, que é consistente com
múltiplos atores que compartilham [Y]."

**12. "Usa PowerShell"**

É universal — todo ambiente Windows usa. Especificidade útil: "PowerShell com `-enc` cujo base64
decodificado contém `IEX` e URL, com processo pai `winword.exe`" — três critérios que juntos
descrevem **este** ator.

---

## Módulo 2 — Ciclo de inteligência e fontes

**1. Dado, informação, inteligência**

Dado: observação bruta. Informação: dado com contexto. Inteligência: informação com **relevância
declarada e implicação**. **Teste:** se o produto não muda nenhuma decisão, não era inteligência.

**2. Sete etapas**

Direção → coleta → processamento → análise → produção → disseminação → feedback. Quebra mais na
**direção** (inexistente → coleta-se o que é fácil) e na **análise** (salto para conclusão).

**3. Direção**

Sem pergunta do consumidor, você acumula IOC e não responde nada. A pergunta precisa vir de quem
decide, não do analista. E responder "qual ator é mais provável para nós" exige **conhecer o que
você é**: setor, dado, geografia, relação, posição.

**4. PIR bom e ruim**

Ruim: "qual a ameaça de APT?" — não testável, não respondível, sem prazo. Bom: "qual ator tem maior
probabilidade de ter nosso setor como alvo nos próximos 12 meses, e qual técnica ele usa
primeiro?" — específica, respondível, com consumidor e prazo.

**5. Pirâmide da Dor**

Custo crescente para o atacante mudar: hash → IP → domínio → artefato → ferramenta → TTP.
Consequência: aloque 70% em comportamento e 30% em indicador. Indicador dura dias; TTP dura anos.

**6. IOC é inútil?**

Não — tem **vida útil curta e uso específico**: triagem, varredura histórica, bloqueio temporário.
O erro é tratá-lo como defesa durável. Use, e saiba quando expira.

**7. Diamond Model**

Adversário · capacidade · infraestrutura · vítima. Relações: adversário↔capacidade,
adversário↔infraestrutura, vítima↔adversário, vítima↔capacidade.

**8. Relação que orienta a defesa**

**Vítima ← adversário**: "por que ele me quer". Entender isso diz **o que** ele vai buscar, e
permite priorizar o controle certo — em vez de proteger tudo igualmente.

**9. Quatro fontes e limitações**

Advisory de governo: genérico, atrasado, pode ser político · vendor: interesse comercial, pode
inflar · comunidade: sem revisão, erro se propaga · plataforma de amostra: amostra sem contexto de
campanha.

**10. Telemetria própria**

É a única fonte que responde "isso aconteceu **comigo**?", e é o que menos recebe investimento —
times gastam em feed e não em log próprio.

**11. Cinco marcações TLP**

RED (destinatário nomeado) · AMBER+STRICT (só a organização) · AMBER (organização e quem precisa
agir) · GREEN (comunidade/setor) · CLEAR (público). Erro mais custoso: marcar tudo como RED →
ninguém compartilha, a defesa coletiva não acontece, e você não recebe.

**12. RED por padrão**

Prejudica **você**: ao não compartilhar, você fica fora do fluxo de ISAC e de parceiro — e perde
exatamente a inteligência que reduziria seu tempo de detecção.

**13. Nome de vítima**

**Não pode ser CLEAR** (nem GREEN, se identificar a vítima). Publicar expõe quem foi atacado, não
o atacante. Isso é dano a terceiro, e frequentemente violação contratual e de LGPD.

---

## Módulo 3 — ATT&CK aplicada e modelo de ameaça

**1. Pergunta certa**

Não "quantas técnicas eu cubro", e sim "as técnicas que **este** ator usa contra **meu** setor, eu
cubro?". 600 de 800 é vaidade; 40 de 60 relevantes é trabalho.

**2. Três erros**

Por ferramenta (Mimikatz faz 15 coisas; importa **qual**) · por API (API é genérica; a técnica é o
**uso**) · mapear tudo (80 técnicas perde função; nenhuma ação decorre).

**3. Quatro passos**

Descrever o comportamento em linguagem própria → procurar na ATT&CK pela descrição → confirmar na
página → anotar evidência e fonte.

**4. Regra do "e o quê?"**

Se a técnica não muda decisão, é genérica demais. "Usa PowerShell" não muda nada. "PowerShell com
`-enc` para executar em memória, pai `winword.exe`" muda — três critérios de detecção.

**5. Sub-técnica vs. pai**

Use a sub-técnica **quando souber o específico** — é ela que dá o critério de detecção. Mapear
`T1059` quando você observou PowerShell é **perder informação que você tinha**.

**6. Três camadas**

Camada 1 (o ator faz) · camada 2 (tenho telemetria) · camada 3 (tenho regra **testada**). A
diferença 2→3 é a ilusão mais comum: **ter o log não é ter a detecção**.

**7. "Tenho dado, não uso"**

Você tem o log e nunca escreveu a regra. É a lacuna de **melhor custo-benefício** — resolve com
trabalho de analista, sem comprar nada.

**8. Fórmula e inversão**

Probabilidade × impacto × (1/detectabilidade). A inversão sobe a prioridade do que você detecta
**mal** — porque é exatamente o que o ator usa **sabendo** que é difícil ver.

**9. Armadilha do fácil**

Priorizar o fácil produz resultado visível rápido e deixa sem cobertura o que o ator usa
justamente por ser difícil. Você mostra progresso e continua exposto onde importa.

**10. Pergunta que funciona**

"Se eu tivesse que apostar qual técnica deste ator me pegaria, e eu não tenho detecção para ela —
qual é?" A resposta é a próxima tarefa.

**11. T1497 difícil**

Porque o sinal é uma **ausência**. Você detecta o que **não** aconteceu — e "não observei" não é
"não aconteceu".

**12. T1070 elegante**

Se a técnica limpa o log, **o log não mostra a limpeza**. Detecta-se por **ausência de log
esperado**, por heartbeat do agente, ou por log externo (SIEM que recebeu **antes** da limpeza).

**13. Retenção como detecção**

Retenção central é o que permite consulta retroativa e o que sobrevive à limpeza local. Sem ela,
você perde a capacidade de detectar **e** de provar — não é item só de conformidade.

**14. Justificativa para gestão**

Deve conter: o que cobrimos, o que não, o maior risco não coberto, recomendação com custo
aproximado, consequência de não fazer. **Não deve conter:** sigla não explicada, nome de
ferramenta, ID de técnica.

---

## Módulo 4 — Arquitetura de C2 em camadas

**1. Três razões**

Resiliência (derrubar um ponto não mata a operação) · separação de identidade (o operador se esconde)
· discrição por reputação (domínio reputado não é bloqueado). Consequência: bloqueio de um destino
não contém; o implante tem fallback.

**2. "Bloquear o domínio"**

Age na **camada 1**, a mais descartável. O implante tem lista de fallback; bloquear um destino só
faz tentar o próximo — e aí você ganha uma oportunidade de detecção, o que é o benefício real.

**3. Onde você trabalha**

Camada **0** — o implante no host. É onde está o artefato, a telemetria e a ação possível. Camadas
1–3 servem a atribuição e contexto, não a bloqueio.

**4. Quatro camadas**

Implant (o que você tem) · ponto de entrada/redirector (descartável) · C2 primário (onde o
operador lê) · painel/operador (interface humana).

**5. "Provavelmente não é o ator"**

O IP observado é intermediário, frequentemente VPS alugada dias antes e descartada depois. O C2
real está atrás, frequentemente em região e provedor distintos.

**6. Canal mais difícil**

**RMM legítimo** — indistinguível de uso legítimo. Empatado: serviço de nuvem reputado. A defesa do
primeiro é **inventário e allowlist**, não detecção de rede.

**7. RMM como C2**

O implante não precisa de backdoor próprio se o atacante instala RMM assinado. Defesa: saber quais
RMM existem na sua rede. **Se você não sabe, você não detecta.**

**8. Horário**

Revela o fuso e a rotina do operador. Confiança: **baixa a moderada** — o operador pode usar
infraestrutura em qualquer fuso, e pode automatizar. É contexto para atribuição, não prova.

**9. Fallback**

Obriga o implante a tentar o próximo destino — o que pode ser mais ruidoso e mais fácil de
detectar. A lista de fallback é, ironicamente, uma oportunidade para o defensor.

**10. `nm` necessário e insuficiente**

Só vê símbolos **dinâmicos**. Binário **estático** ou que resolva símbolo por `dlsym` escapa.
Complementa-se com observação de runtime em ambiente isolado. As duas juntas — não uma no lugar da
outra.

**11. De qual camada vem a detecção**

**Camada 0.** Você quase nunca detecta o C2; você detecta **o implant que fala com ele**. Perfil,
processo, persistência, comportamento do host.

**12. Omissão como parte do entendimento**

Relatórios públicos omitem por segurança do autor, por política, ou por falta de dado. Saber que a
lacuna existe impede que você trate "não descrito" como "não existe".

---

## Módulo 5 — Protocolo de implant: análise defensiva

**1. Seis observáveis**

Destino (IP/SNI) · periodicidade · jitter · tamanho de requisição e de resposta · duração · horário
· volume.

**2. Cifra não impede detecção**

Nenhum dos observáveis depende de ler a mensagem. É **geometria de tráfego** — e geometria
sobrevive à cifra.

**3. Assinaturas**

Check-in: req 200–600 B, resp 50–200 B. Task: resp maior e variável. Transferência: req grande e
variável, resp pequena.

**4. Assinatura mais durável**

Req pequena + resp pequena + regular. Não depende de protocolo, de cifra, nem de versão de
ferramenta — é o formato do **check-in**.

**5. Silêncio de 5 dias e retomada**

Não é beacon defeituoso — é **operação por tarefa**, coordenada por humano. Isso muda a estimativa
de residência: o ator não precisa de canal contínuo.

**6. CV**

Desvio padrão sobre a média dos intervalos. Normaliza a dispersão — permite comparar beacons de
intervalos diferentes com um só limiar. Melhor que comparar intervalos individuais porque **jitter
esconde a periodicidade de cada intervalo, mas não da média**.

**7. CV < 0.15**

Nenhum humano faz requisições em intervalo quase constante. O desvio é mínimo porque não há
variação humana nem carga variável. Só automação produz isso.

**8. Janela de atividade**

Revela fuso e rotina do operador. Confiança **baixa a moderada** — infraestrutura pode estar em
qualquer lugar e o atacante pode automatizar a janela.

**9. Perfil isolado e o que fecha o caso**

Perfil isolado gera falso positivo porque **todo atualizador tem perfil de check-in**. Fecha o caso
a **combinação**: domínio desconhecido + ausência de outro tráfego no host + horário fora do
comercial + processo não assinado.

**10. Condição que mais reduz falso positivo**

**Ausência de outro tráfego no host.** É a mais ignorada. Host que faz beacon **e** navega: suspeito
moderado. Host que faz beacon e **nada mais**: comprometido.

**11. Beacon de intervalo longo**

É igualmente suspeito — a regularidade não depende da frequência. Escapa de limiares que exigem
"muitas conexões em 24h", o que é um **defeito de regra**, não evidência de benignidade.

**12. Exfiltração com CV baixo**

Pode ter intervalo regular sem ser beacon. Distingue-se por **assimetria**: upload ≫ download,
repetido. Beacon tem req e resp **pequenas**; exfiltração tem req **grande**.

---

## Módulo 6 — Infraestrutura por fonte aberta

**1. Três finalidades**

Correlação (ligar campanhas) · antecipação (identificar o próximo domínio antes do uso) ·
atribuição (contexto).

**2. Antecipação**

Se o ator usa um template de nome, um provedor de DNS e um CA, você **monitora o padrão** em
transparência de certificado e detecta o domínio **preparado e ainda não usado**. Defesa proativa
sem tocar em nada.

**3. "Testar se está no ar"**

É **contato**. Uma requisição ao domínio do adversário informa seu IP a ele. Você se anunciou — e
isso vale tanto para o profissional quanto para o estudante.

**4. Elementos do WHOIS**

Data de criação (registro novo é indício em campanha) · data de atualização (ator ativo) ·
registrador (recurso) · privacidade (hoje pouco discriminante) · nameserver (padrão do ator) ·
registrante em massa (correlação de bloco).

**5. Padrão de nome**

Durável — o template muda devagar, diferente do indicador. Enquanto o ator usa o mesmo template,
sua regra pega o **próximo** domínio.

**6. Registro recente**

Infraestrutura de ataque é efêmera por design: registra perto do uso, descarta depois. Domínio
criado há dias, em contexto de campanha, é indício forte.

**7. Transparência de certificado**

Log público obrigatório de todo certificado emitido. Torna o histórico de certificado uma fonte
gratuita, consultável e imutável — sem tocar no domínio do ator.

**8. Data de emissão**

Evento **registrado e público**, frequentemente **anterior** ao uso. Monitorar emissão por padrão
permite detectar infraestrutura **preparada** — antes do primeiro check-in.

**9. SAN**

Subject Alternative Name: os nomes cobertos pelo certificado. Um certificado com vários nomes do
mesmo operador revela **múltiplos domínios de uma vez** — o pivô mais produtivo.

**10. Certificado não prova mesmo operador**

CA gratuita (Let's Encrypt) e DNS barato estão acessíveis a qualquer um. Mesmo certificado indica
**consistência com**, não **prova de** — é correlação, não identidade.

**11. Bloquear por ASN**

Um ASN de nuvem grande hospeda milhares de legítimos; bloquear quebra sua operação. Correlacione
por ASN; **não bloqueie**, exceto bloco pequeno e dedicado, ainda assim com avaliação.

**12. Seção "não se pode concluir"**

É o que separa produto de adivinhação. Responde: que conclusão alguém poderia tirar daqui que o
dado **não** sustenta? Sem ela, o consumidor estende o achado além da evidência.

**13. Geografia**

"A geografia do provedor **não indica** a origem do operador. VPS é contratada pelo provedor mais
conveniente, e o operador pode estar em qualquer lugar do mundo."

---

## Módulo 7 — Detecção contra TTP de APT

**1. Comparação**

Hash: alcance uma amostra, vida útil dias. Domínio/IP: alcance uma campanha, vida útil semanas. TTP:
alcance o ator em qualquer campanha, vida útil **anos**, custo médio de escrever.

**2. O que o ator não troca**

Ele troca infraestrutura entre campanhas — e às vezes durante. O que ele **não** troca facilmente é
o **método**: como obtém acesso, como persiste, como se move.

**3. Proporção**

70% comportamento, 30% indicador. A maioria faz o inverso porque indicador é fácil, vem pronto em
feed, e produz resultado visível imediato.

**4. Melhor relação custo/benefício**

**Acesso a lsass.** Praticamente nada legítimo lê a memória de lsass; a telemetria existe em
qualquer EDR com monitor de processo; o falso positivo é quase zero.

**5. Acesso a nome de backup**

O ator precisa descobrir onde está o backup, e essa consulta é raríssima em usuário comum. Alto
valor, baixo falso positivo — e interrompe a fase que torna o ataque fatal.

**6. Deleção de log**

Se o log foi limpo, **o log não mostra a limpeza**. Detecta-se por ausência de evento esperado, por
heartbeat do agente, ou por log central que recebeu **antes**.

**7. Persistência silenciosa**

Não há evento. Resolve-se com **inventário diferencial** — comparação periódica do que existe, onde
**a novidade é o sinal**.

**8. Três blocos**

Seleção (os critérios, com **combinação**) · exceção (quem legitimamente faz) · declaração
(`falsepositives` nomeando quem dispara).

**9. Máscara de acesso**

`0x1010` e `0x1410` são as combinações necessárias para ler memória de processo. Sem ela, você
alerta em todo antivírus e ferramenta de segurança — e desliga a regra em uma semana.

**10. Sem exceção**

A regra alerta em atividade legítima e é desligada pela operação. **Você descobre por reclamação** —
o que é o pior momento. A pergunta é: "quem legitimamente faz isso, e o que o distingue?"

**11. Inventário diferencial**

Comparação periódica de serviço, cron, systemd, chave, porta, conta, preload. Pega o ator que só se
posiciona porque **a novidade é o sinal**, não o comportamento.

**12. Ponto de detecção**

É a métrica que determina a vantagem. Detectar em ① dá meses; em ③, semanas; em ⑤, dias; em ⑥, o
dado já saiu. Contra APT não há fase ⑦, então detecção tardia é detecção inútil.

**13. Retenção**

Sem consulta retroativa, você só detecta o que acontecer **depois** de aprender a procurar. Um ator
residente há 8 meses continua invisível no histórico se sua retenção é 30 dias.

**14. Toda regra nova merece**

Uma **consulta retroativa imediata**. Você acabou de aprender a detectar algo — procure no
histórico agora.

---

## Módulo 8 — Caça a ameaça com hipótese

**1. Diferenças**

Monitoramento: gatilho é alerta, reativo, pergunta "disparou?". Investigação: gatilho é incidente,
reativo, "o que aconteceu?". Caça: gatilho é **hipótese**, proativo, "isso pode ter acontecido
aqui?".

**2. Caça negativa**

Ela provou que um comportamento **não ocorreu** no período — informação de valor, se documentada.
Sem o registro, você refaz a mesma consulta em três meses.

**3. Documentar o negativo**

Hipótese, dados e janela, consulta reproduzível, resultado, **o que o negativo significa**, e
**o que NÃO foi provado** (fora da janela, hosts sem telemetria, variantes não cobertas).

**4. Cinco fontes**

Inteligência de ator · relatório de caso de terceiro · nova detecção · modelo de ameaça · anomalia
interna · lacuna de cobertura.

**5. Hipótese ruim**

"Verificar se temos APT" — não testável, sem dado, sem critério. Boa: "dado que o ator X usa WMI
para persistência, verifico criação de `__EventFilter` nos últimos 90 dias em hosts com Sysmon;
verdadeira se houver evento não explicado, falsa se zero não explicado."

**6. Sem telemetria**

Busque o **efeito** da técnica em log que você **tem**. WMI deixa rastro em processo e arquivo;
você não precisa do log de WMI para ver atividade relacionada.

**7. Presença silenciosa**

Não há comportamento — só **mudança**. Caça de inventário, não de evento: o que existe hoje que não
existia há N dias.

**8. Sete etapas**

Hipótese → preparação → consulta → triagem → análise → ação → artefato.

**9. Etapa 7**

Sem ela, a caça é exercício único: 6 horas, nada achado, e refazer do zero em seis meses. Com ela,
o resultado vira detecção, consulta agendada, ou solicitação de telemetria.

**10. Falha por falta de dado**

**Solicitação de telemetria** com justificativa e custo. É o resultado mais acionável que existe —
e o menos explorado, porque "não consegui caçar" vira encolher de ombros.

**11. "NÃO provado"**

Impede que "caçamos e não achamos" vire "estamos limpos". São coisas diferentes, e a diferença
determina a decisão seguinte.

**12. Contenção automática**

**Não.** Achado de caça é **candidato**, não conclusão. Confirmar é investigação, e conter sem
confirmar pode destruir evidência e interromper a observação de um ator ativo.

**13. Amplo e estreitar**

Você não sabe de antemão qual filtro isola. Começar amplo mostra o volume é dá a **base de
comparação** para saber se o filtro estreitou demais. O filtro "perfeito" de primeira é imaginação.

---

## Módulo 9 — Atribuição, produto e exercício

**1. Quatro pares**

É avaliação de probabilidade / não é certeza · é correlação de evidências independentes / não é
conclusão de uma · é produto com limite / não é sentença · muda com nova informação / não é
estática.

**2. Escala**

Alta: evidências **independentes** convergem, alternativa implausível → decidir com base. Moderada:
consistente, alternativa crível → usar como **uma** entrada. Baixa: pouca evidência → não decidir.
Desconhecida: dizer "não sei".

**3. Independência**

Mesmo IOC em três feeds = **uma** evidência (mesma origem). Três relatórios do mesmo fornecedor =
uma análise. Só é independente com fontes, métodos e capacidades de discordar distintos.

**4. Cinco vieses**

Confirmação → procurar o que refuta · ancoragem → listar 3 hipóteses antes · atribuição por
ferramenta → ferramenta vaza e é plantada · disponibilidade → basear no seu ambiente · falso
consenso → verificar independência.

**5. Técnica que mais reduz viés**

**Hipótese concorrente.** Escrever explicitamente: é o grupo X / é outro que compartilha ferramenta
/ é imitador / é pentest não comunicado / é erro de configuração. Para cada: o que apoiaria, o que
refutaria.

**6. Imitador e pentest**

Ferramenta de ataque é pública — qualquer um pode usar o TTP de um grupo conhecido, e indicador
plantado é técnica real de decepção. E "pentest contratado por outra área e não comunicado" é causa
real de incidente falso. Ambos produzem **evidência consistente e conclusão errada**.

**7. Produtos diferentes**

Consumidores diferentes, decisões diferentes. Técnico precisa de evidência, TTP, IOC, confiança.
Gestão precisa de dado, operação, obrigação legal, decisão, custo. **Não é encurtamento** — é
reescrita para outra pergunta.

**8. Teste**

Um diretor que nunca ouviu "ATT&CK" consegue **decidir** com a página? Se depende de saber o que é
TTP, está escrito para o consumidor errado.

**9. "O que precisamos decidir"**

Um relatório que descreve sem pedir decisão é informativo e inútil. **Toda análise leva a uma
decisão, ou a nenhuma.**

**10. Valor do tabletop**

**Processo**, não tecnologia. Descobre: quem decide, quem comunica, com que autoridade, em quanto
tempo, por qual canal. Ferramenta você compra; processo você treina.

**11. "A imprensa ligou"**

Revela que quase ninguém sabe quem é o porta-voz — decisão que precisa ser tomada **antes** do
incidente, e que nenhuma ferramenta resolve.

**12. Confiança baixa**

É honestidade com uso prático: o consumidor sabe o que fazer com cada nível. Forçar "alta" sem base
leva a decisão errada com aparência de fundamento — o pior desfecho possível.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Método explícito | 30% | O raciocínio está registrado, não só a conclusão |
| Confiança declarada | 25% | Cada avaliação tem grau de confiança e justificativa |
| Limitações | 25% | O que não se pode concluir está escrito |
| Fonte citada | 20% | Toda afirmação factual tem origem |

**Penalidades automáticas:**

- Afirmação factual sem fonte citada: −20%.
- Atribuição declarada sem confiança: −25%.
- Produto sem seção de limitações: −20%.
- **Qualquer interação com infraestrutura de ator** (conectar, resolver, varredura): **lab zerado**.
- Caça que não gerou artefato: −15%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| Direção | Sem pergunta | PIR respondível | PIR respondível, com consumidor e critério |
| Coleta | Uma fonte | Três tipos de fonte | Três tipos, com viés declarado e divergência explicada |
| Análise | Conclusão direta | Hipótese testada | **Hipóteses concorrentes** com refutação |
| Confiança | Não declara | Declara nível | Declara e **justifica por que não é o nível acima** |
| Limitações | Ausente | Lista o óbvio | Lista o que o dado **não** sustenta, com especificidade |
| Produto | Um só | Dois produtos | Dois produtos, cada um pedindo a decisão do seu consumidor |
| Detecção | Sem regra | Regra escrita | Regra testada, com falso positivo nomeado |

**O item de maior valor em todo o curso:** a **justificativa de por que a confiança não é mais
alta**. É o que distingue analista de inteligência de quem repete o que leu.

---

*Material didático original, de propósito defensivo e passivo. Nenhum trecho reproduzido de obra
comercial protegida, e nenhum material que ensine a operar infraestrutura de ataque.*
