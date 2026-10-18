# Módulo 3 — ATT&CK Aplicada e Modelo de Ameaça

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Navegar a ATT&CK como ferramenta de trabalho, não como enciclopédia.
2. Mapear TTP observado com critério e evitar o mapeamento por ferramenta.
3. Construir cobertura de detecção no ATT&CK Navigator.
4. Calibrar modelo de ameaça para uma organização específica.
5. Priorizar técnica por **probabilidade × impacto × detectabilidade**.

---

## ⚠ Conduta

ATT&CK é taxonomia pública e defensiva. Nada aqui orienta execução de técnica. Todo mapeamento é
**descrição de comportamento já observado**, documentado em fonte pública.

---

## 3.1 ATT&CK como ferramenta, não como enciclopédia

A ATT&CK tem centenas de técnicas. Ninguém as decora, e tentar é o caminho mais rápido para não
usar a ferramenta para nada.

**O que a ATT&CK é, na prática:**

| É | Não é |
|---|---|
| Vocabulário comum entre times e organizações | Lista de checklist |
| Base para priorizar detecção | Catálogo de tudo que existe |
| Mapa de cobertura com lacuna visível | Prova de que você está coberto |
| Ponte entre inteligência e engenharia de detecção | Relatório em si |

⚠ **A pergunta certa não é "quantas técnicas eu cubro".** É **"as técnica que *este* ator usa
contra *meu* setor, eu cubro?"**. 600 técnicas cobertas de 800 é vaidade; 40 de 60 relevantes é
trabalho.

### As três entradas da ATT&CK

```
attack.mitre.org
├── TACTICS      → o "porquê" (13 táticas, ordem da invasão)
├── TECHNIQUES   → o "como" (o que o adversário faz)
├── GROUPS       → o "quem" (atores, com aliases e técnicas atribuídas)
├── SOFTWARE     → o "com o quê" (ferramenta, malware)
└── CAMPAIGNS    → o "quando e contra quem" (agrupamento por atividade)
```

**O caminho de trabalho mais útil:** `GROUPS` → escolha o ator relevante → veja a lista de
técnicas dele → **essa** é a sua lista de prioridade de detecção. É concreto, é curto, e é
acionável.

---

## 3.2 Mapeamento: os erros e a forma correta

### Os três erros

| Erro | Exemplo | Por que é erro |
|---|---|---|
| **Mapear por ferramenta** | "Usa Mimikatz → T1003" | Mimikatz faz 15 coisas; o que importa é **qual** |
| **Mapear por import/API** | "Importa `CreateService` → T1543" | API genérica; a técnica é o **uso** |
| **Mapear tudo** | 80 técnicas num relatório | Perde função; nenhuma ação decorre |

### A forma correta, em quatro passos

1. **Descreva o comportamento** em linguagem própria: *"o ator copiou um binário para
   `ADMIN$` de um servidor remoto e criou serviço para executá-lo"*.
2. **Procure na ATT&CK pela descrição**, não pelo código.
3. **Confirme na página** da técnica: ela descreve este comportamento?
4. **Anote a evidência exata** e **a fonte**.

⚠ **A regra do "e o quê?":** se a técnica mapeada não muda nenhuma decisão sua, provavelmente você
mapeou genérico demais. *"Usa PowerShell"* não muda nada. *"Usa PowerShell com `-enc` para
executar payload em memória, com parent `winword.exe`"* muda — porque ali há três critérios de
detecção.

### Sub-técnica versus técnica pai

| Use | Quando |
|---|---|
| **Técnica pai** (`T1059 Command and Scripting Interpreter`) | Você sabe que é execução de script, não qual |
| **Sub-técnica** (`T1059.001 PowerShell`) | Você sabe o interpretador específico |

⚠ **Prefira a sub-técnica quando souber.** É ela que dá o critério de detecção. Mapear `T1059`
quando você observou PowerShell é perder informação que você **tinha**.

---

## 3.3 Cobertura com o ATT&CK Navigator

O Navigator é uma ferramenta web que gera uma matriz colorida. É o melhor artefato visual de
cobertura que existe.

**Três camadas para uma análise honesta:**

```
Camada 1: "O que o ator faz"        → técnicas atribuídas ao grupo (ATT&CK)
Camada 2: "O que eu consigo ver"    → telemetria disponível
Camada 3: "O que eu detecto"        → regra escrita E testada
```

⚠ **A diferença entre camada 2 e 3 é onde mora a ilusão mais comum.** Ter o log **não é** ter a
detecção. Muitos times têm o dado e nunca olharam.

```
Camada 2 alta + Camada 3 baixa  =  "temos o dado, não usamos"     ← corrigível barato
Camada 2 baixa                  =  "não temos como saber"          ← exige investimento
Camada 1 alta + Camada 3 alta   =  cobertura real                  ← o objetivo
```

**Como usar na prática:**

1. Baixe a camada do grupo relevante (Navigator → "Open Existing Layer" ou ATT&CK → grupo → export).
2. Crie uma camada vazia para "detecção ativa".
3. Pinte **apenas** o que tem regra escrita e **testada**.
4. A área colorida da camada 1 que ficou **sem cor** na camada 3 é a sua lacuna.

⚠ **O entregável mais útil que existe em defesa:** uma matriz com a lacuna **visível**. Ela
transforma "estamos expostos" em "temos 14 técnicas sem cobertura, das quais 6 exigem telemetria
que não temos".

---

## 3.4 Modelo de ameaça calibrado

Modelo de ameaça genérico não serve. O seu precisa responder: **quem me quer, e por quê?**

### Os cinco insumos

| Insumo | Pergunta | Onde buscar |
|---|---|---|
| **Setor** | Meu setor é alvo de quem? | Relatório de vendor por setor; advisory de CERT |
| **Dado** | O que eu tenho que alguém quer? | Interno — inventário de dado |
| **Geografia** | Minha região tem ator regional? | Relatório de CERT nacional, TAG, vendor |
| **Relação** | Sou fornecedor de quem? | Interno — cadeia de cliente e parceiro |
| **Posição** | Sou alvo final, ou caminho para outro? | Interno + análise de campanha |

⚠ **"Posição" é a mais ignorada e a mais importante para fornecedor.** Um fornecedor de software
para governo não é necessariamente o alvo final — **ele é o caminho para o cliente dele**. Isso
muda o controle prioritário: o que protege não é o dado dele, é o **pipeline de entrega**.

### A matriz de priorização

Não existe "todas as técnicas igualmente importantes". Priorize por três eixos:

```
PRIORIDADE = PROBABILIDADE × IMPACTO × (1 / DETECTABILIDADE)
```

| Eixo | Como estimar |
|---|---|
| **Probabilidade** | O ator relevante usa esta técnica? (ATT&CK → grupo) |
| **Impacto** | Se a técnica funcionar contra mim, o que perco? |
| **Detectabilidade** | Quão fácil é **eu** detectar, com o que **eu** tenho? |

⚠ **A inversão da detectabilidade é contraintuitiva e é o ponto:** as técnicas que você **detecta
mal** sobem na prioridade, **não** descem. É tentador priorizar o que é fácil detectar (você
consegue mostrar resultado rápido) — mas isso deixa sem cobertura exatamente o que o ator usa
porque sabe que é difícil ver.

**A pergunta de priorização que funciona:**

> "Se eu tivesse que apostar qual técnica deste ator me pegaria, e eu não tenho detecção para
> ela — qual é?"

A resposta é a sua próxima tarefa.

---

## 3.5 Da técnica à detecção

Uma tabela que vale mais que teoria: a técnica, o que ela exige em telemetria, e a dificuldade.

| Técnica | Telemetria mínima | Dificuldade | Por quê |
|---|---|---|---|
| T1059.001 PowerShell | Linha de comando + script block | Média | Script block log precisa estar **ligado** |
| T1003.001 LSASS Memory | Acesso a processo (`Sysmon` 10 / EDR) | Baixa | Sinal limpo; pouco legítimo |
| T1053.005 Scheduled Task | Criação de tarefa + linha de comando | Baixa | Caminho conhecido |
| T1547.001 Registry Run | Escrita em chave de registro | Baixa | Caminho conhecido |
| T1021.002 SMB/Admin Shares | Acesso a share, serviço criado | Média | Exige visão do host destino |
| T1021.006 WinRM | Sessão remota, processo pai | Média | Exige log de WinRM |
| T1071.001 Web Protocol | Proxy/DNS/perfil de tráfego | **Alta** | Exige baseline; C2 em 443 é normal |
| T1095 Non-App Layer | Captura de rede | **Alta** | Exige visão de rede profunda |
| T1567.002 Web Service Exfil | Proxy, volume por destino | Média | Exige baseline de volume |
| T1497 Sandbox Evasion | Comportamento **ausente** | **Altíssima** | Você detecta o que **não** aconteceu |
| T1070 Indicator Removal | Log limpo, arquivo removido | Média | Se o log foi limpo, onde está o registro? |
| T1027 Obfuscation | Conteúdo de script, memória | Alta | Exige decodificação |

⚠ **Duas linhas merecem destaque:**

**T1497 (Sandbox/VM Evasion)** é a mais difícil porque o sinal é uma **ausência**. É o mesmo
problema do Módulo 8 do curso de malware: "não observei" não é "não aconteceu".

**T1070 (Indicator Removal)** tem um problema elegante: se a técnica limpa o log, **o log não
mostra a limpeza**. Você só detecta por **ausência de log esperado**, ou por log externo (SIEM
que recebeu antes da limpeza). Isso faz de **retenção central de log** um controle de detecção,
não só de conformidade.

---

## 3.6 LAB — Cobertura e priorização

**Duração:** 120 min

### Passo 1 — Escolha o ator e o alvo (15 min)

Use o ator do Módulo 1 e o cenário do Módulo 2. Se não fez, escolha agora:

| Elemento | Seu |
|---|---|
| Ator | |
| Setor da organização | |
| O que ela tem | |

### Passo 2 — Mapeie as técnicas do ator (30 min)

Produza `ttps.md` com as **15 a 25** técnicas mais relevantes do ator (não todas):

| ID | Nome | Tática | O ator usa? (fonte) | Probabilidade | Impacto em mim | Detectabilidade | **Prioridade** |
|---|---|---|---|---|---|---|---|
| T1566 | Phishing | Initial Access | | alta | | baixa | |
| ... | | | | | | | |

**Use uma escala simples (alta/média/baixa)** e calcule a prioridade conforme a fórmula da seção
3.4. Ordene pelo resultado.

**Responda:**

1. Quais três técnicas ficaram no topo? **Isso bate com sua intuição de "o que é perigoso"?**
   Onde divergiu?
2. Qual técnica tem **detectabilidade baixa** e subiu por causa disso?
3. Você mapeou alguma técnica **genérica demais**? Reescreva-a com o "e o quê?".

### Passo 3 — Construa as três camadas (45 min)

Se você puder acessar o Navigator, monte as camadas. Se não, faça a matriz em texto:

```
TÉCNICA              | ATOR USA | TENHO TELEMETRIA | TENHO REGRA | TESTADA
---------------------|----------|------------------|-------------|--------
T1059.001 PowerShell |    ✓     |        ✓         |      ✗      |   ✗
T1003.001 LSASS      |    ✓     |        ✓         |      ✓      |   ✓
T1071.001 Web C2     |    ✓     |        ✗         |      ✗      |   ✗
...
```

Produza `cobertura.md` com a matriz completa.

**Calcule:**

| Categoria | Contagem |
|---|---|
| Técnicas do ator relevantes | |
| Com telemetria disponível | |
| Com regra escrita | |
| **Com regra testada** | |
| **Lacuna: sem telemetria** | |
| **Lacuna: tenho dado, não uso** | |

⚠ **A categoria "tenho dado, não uso" é o achado de maior valor/esforço.** É onde você melhora
cobertura **sem comprar nada** — só escrevendo a regra e testando.

### Passo 4 — Selecione a próxima tarefa (15 min)

Escolha **uma** técnica da lacuna e produza `proxima-tarefa.md`:

```markdown
## Técnica escolhida
ID e nome:
Por que esta: [probabilidade × impacto × detectabilidade]

## O que o ator faz, exatamente
Descrição do comportamento observado, com fonte.

## O que eu preciso para detectar
Telemetria: [tenho / não tenho — se não tenho, quanto custa ter]
Campos necessários:
Janela de tempo:

## Condição de detecção proposta
[descreva em texto, antes de escrever a regra]

## Falso positivo esperado
[quem legitimamente faz isso]

## Como vou testar
[como provocar o comportamento em laboratório]
```

⚠ **"Tenho dado, não uso" é o melhor alvo para esta tarefa.** Se a técnica exige telemetria que
você não tem, o custo da tarefa muda de "escrever regra" para "projeto de telemetria" — e isso é
decisão de orçamento, não de analista.

### Passo 5 — Justifique para a gestão (15 min)

Produza `justificativa.md` — **meia página**, para um gestor não técnico:

```
O que estamos cobrindo: [em linguagem de negócio]
O que não estamos cobrindo: [idem]
O maior risco não coberto: [em uma frase]
O que eu recomendo fazer primeiro: [com custo aproximado: tempo, dinheiro ou os dois]
O que acontece se não fizermos: [consequência concreta]
```

⚠ **Sem sigla não explicada, sem nome de ferramenta, sem ID de técnica.** Se você não consegue
traduzir em linguagem de negócio, você não entendeu a implicação — ou ela não é relevante o
bastante para priorizar.

### Critérios de aceitação

- `ttps.md` com 15–25 técnicas, prioridade calculada, e a lista ordenada.
- Você respondeu se a priorização **divergiu da intuição** e onde.
- `cobertura.md` com a matriz e as **contagens** preenchidas.
- Você identificou a categoria "tenho dado, não uso" e quantificou.
- `proxima-tarefa.md` com a condição de detecção descrita **em texto antes de virar regra**.
- Você nomeou o falso positivo esperado.
- `justificativa.md` **sem sigla não explicada** e sem nome de ferramenta.
- Todas as técnicas mapeadas com **nome e ID**, não só código.

---

## Avaliação

1. Por que "quantas técnicas eu cubro" é a pergunta errada? Qual é a certa?
2. Cite os três erros de mapeamento e explique cada um.
3. Descreva os quatro passos do mapeamento correto.
4. Explique a regra do "e o quê?". Dê um exemplo de mapeamento que falha e um que passa.
5. Quando usar a sub-técnica em vez da técnica pai? Por que preferir a sub-técnica quando souber?
6. Descreva as três camadas do Navigator. Qual a diferença entre camada 2 e 3?
7. O que significa "tenho o dado, não uso"? Por que essa é a lacuna de melhor custo-benefício?
8. Explique a fórmula de priorização. Por que a detectabilidade entra **invertida**?
9. Por que priorizar o que é fácil detectar é uma armadilha?
10. Qual é a pergunta de priorização que funciona na prática?
11. Por que T1497 (evasão de sandbox) é a técnica mais difícil de detectar?
12. **Por que T1070 (remoção de indicador) é um problema elegante?** O que detecta a limpeza de
    log, se o log foi limpo?
13. Por que retenção central de log é um controle de **detecção** e não só de conformidade?
14. O que deve conter uma justificativa para gestão — e o que **não** deve?

---

**Próximo:** [Módulo 4 — Arquitetura de C2 em camadas](modulo-04.md)
