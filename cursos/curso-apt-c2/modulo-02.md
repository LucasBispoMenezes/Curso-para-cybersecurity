# Módulo 2 — Ciclo de Inteligência e Fontes

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Descrever o ciclo de inteligência e onde cada etapa falha na prática.
2. Distinguir dado, informação e inteligência.
3. Classificar fontes por confiabilidade e por custo.
4. Usar a Pirâmide da Dor para decidir **o que vale coletar**.
5. Aplicar o Diamond Model para estruturar uma análise.
6. Marcar produto com TLP corretamente.

---

## ⚠ Conduta

Fontes deste módulo são públicas. Toda consulta é leitura. Nada aqui orienta aquisição de dado
privado, compra de acesso, nem interação com adversário.

---

## 2.1 Dado, informação, inteligência — a distinção que organiza tudo

| Nível | O que é | Exemplo |
|---|---|---|
| **Dado** | Observação bruta, sem contexto | `203.0.113.7` apareceu no log |
| **Informação** | Dado com contexto | `203.0.113.7` fez 400 conexões em 10 min para a porta 443 |
| **Inteligência** | Informação com **relevância e implicação** | Isso é consistente com beacon de [família]; **nossa** rede teve 3 hosts com este perfil; a implicação é [X]; a ação recomendada é [Y] |

⚠ **A maioria dos times para no nível 2 e chama de inteligência.** Uma lista de IP "maliciosos"
não é inteligência — é informação sem relevância declarada. Inteligência **responde uma pergunta
que alguém fez**, e diz **o que fazer com a resposta**.

**O teste:** se o produto não muda nenhuma decisão, não era inteligência. Era dado com enfeite.

---

## 2.2 O ciclo, e onde ele quebra

```
   ┌───────────────────────────────────────────────────────────┐
   │                                                           │
   ▼                                                           │
1. DIREÇÃO       →  2. COLETA   →  3. PROCESSAMENTO  →  4. ANÁLISE
   (o que eu        (buscar o        (normalizar,          (dar sentido,
    preciso saber?)  dado)            deduplicar)           testar hipótese)
   │                                                           │
   │              7. FEEDBACK   ←  6. DISSEMINAÇÃO  ←  5. PRODUÇÃO
   │              (funcionou?)      (entregar a quem    (escrever o
   └───────────────────────────────  decide)             produto)
```

### Onde cada etapa quebra na prática

| Etapa | Como falha | Sintoma |
|---|---|---|
| **1. Direção** | Não existe — coleta-se o que é fácil | Você acumula IOC e não responde pergunta nenhuma |
| **2. Coleta** | Só fonte gratuita e pública | Você sabe o que todo mundo sabe; zero vantagem |
| **2. Coleta** | Só fonte que você comprou | Ponto cego no que é público |
| **3. Processamento** | Nada é deduplicado | Ruído; analista ignora o produto |
| **4. Análise** | Salto direto para conclusão | Viés de confirmação; atribuição errada |
| **5. Produção** | Escreve para si mesmo | O consumidor não entende, não usa |
| **6. Disseminação** | Marca tudo como TLP:RED | Ninguém pode compartilhar; a defesa coletiva não acontece |
| **7. Feedback** | Não existe | Você repete o erro por anos |

⚠ **A etapa 1 (Direção) é a mais negligenciada e a mais decisiva.** Sem pergunta, não há
inteligência. E a pergunta precisa ser **do consumidor**, não do analista.

**Perguntas de direção que funcionam:**

| Consumidor | Pergunta de direção |
|---|---|
| CISO | "Qual ator tem maior probabilidade e maior impacto para nós nos próximos 12 meses?" |
| SOC | "Que técnica devo priorizar para detecção, dado nosso setor?" |
| Resposta a incidente | "Este artefato conecta com alguma campanha conhecida?" |
| Arquitetura | "Que controle reduz o tempo de residência contra o ator mais provável?" |
| Jurídico / gestão | "Temos obrigação de notificar neste cenário?" |

⚠ **A pergunta "qual ator é mais provável para nós" exige que você saiba o que você é.** Setor,
geografia, relação com fornecedor, dado que você tem, posição na cadeia de alguém. **Inteligência
começa com autoconhecimento.**

---

## 2.3 A Pirâmide da Dor

Modelo de David Bianco: **o custo para o atacante muda conforme o tipo de indicador**, de baixo
(no topo) para alto (na base).

```
        ▲  CUSTO BAIXO PARA O ATACANTE MUDAR
        │
    ┌───┴───┐
    │ Hash  │        ← muda com 1 byte; inútil sozinho
    ├───────┤
    │ IP    │        ← muda por campanha
    ├───────┤
    │Domínio│        ← muda com custo moderado
    ├───────┤
    │Artefato│       ← ferramenta: custo de reescrever
    ├───────┤
    │Ferramenta│     ← conjunto de ferramenta: custo alto
    ├───────┤
    │  TTP   │       ← comportamento: custo ALTÍSSIMO — não muda fácil
    └────────┘
        │
        ▼  CUSTO ALTO PARA O ATACANTE MUDAR
```

### A decisão prática que decorre disso

| Se você tem... | Você consegue... | Dura quanto |
|---|---|---|
| Só hash | Bloquear aquela amostra | Até a próxima compilação |
| Hash + IP + domínio | Bloquear a campanha atual | Até o ator trocar infraestrutura |
| **TTP** | **Detectar o ator em qualquer campanha** | **Anos** |

⚠ **A consequência operacional:** se o seu produto de inteligência é uma lista de hash e IP, ele
tem vida útil de dias. **A parte durável é a de comportamento.** Por isso a coluna "específico"
do Módulo 1 importa mais que a lista de IOC.

⚠ **Isso não significa "abandone o IOC".** Significa: **saiba a validade.** Um IOC dura dias; uma
detecção de TTP dura anos. Aloque esforço proporcionalmente.

---

## 2.4 O Diamond Model

Estrutura para analisar uma intrusão em quatro vértices, com duas características entre eles.

```
                    ADVERSÁRIO
                        ▲
                       ╱ ╲
              capacidade╱   ╲   infraestrutura
                     ╱       ╲
                    ╱         ╲
                   ╱           ╲
            VÍTIMA ◀───────────▶ CAPACIDADE
                    ╲  vítima   ╱
                     ╲ relação ╱
                      ╲       ╱
                       ╲     ╱
                        ▼   ▼
                    INFRAESTRUTURA
```

| Vértice | Pergunta |
|---|---|
| **Adversário** | Quem? (com confiança declarada) |
| **Capacidade** | Com o quê? (ferramenta, exploit, técnica) |
| **Infraestrutura** | Por onde? (domínio, IP, hospedagem, canal) |
| **Vítima** | Contra quem? (setor, região, o que ela tem) |

⚠ **O valor do Diamond Model não é preencher os quatro — é usar as relações.** 

| Relação | O que ela responde |
|---|---|
| Adversário ← capacidade | "O que este ator sabe fazer" |
| Adversário ← infraestrutura | "Como ele opera; o que é padrão dele" |
| Vítima ← adversário | **"Por que ele quis esta vítima"** |
| Vítima ← capacidade | "Que ferramenta ele usa contra **este** tipo de alvo" |

⚠ **A relação "vítima ← adversário" é a que orienta a sua defesa.** Se você entende **por que**
seu setor é alvo, você entende **o que** ele vai querer, e pode priorizar o controle certo. Essa
pergunta não se responde com IOC; responde-se com contexto de negócio.

---

## 2.5 Fontes: confiabilidade, custo e limitação

| Fonte | Custo | Confiabilidade | Limitação que você precisa conhecer |
|---|---|---|---|
| **Advisory de CERT/governo** | Grátis | **Alta** | Genérico; frequentemente atrasado; pode ser político |
| **Vendor research** (fabricante) | Grátis | Alta técnica | Interesse comercial; pode inflar ameaça |
| **Comunidade / OSINT** | Grátis | **Variável** | Sem revisão; erro se propaga rápido |
| **Plataforma de amostra** | Grátis / conta | Média | Amostra isolada sem contexto de campanha |
| **ISAC do setor** | Associado | **Alta** | Exige reciprocidade — você tem de contribuir |
| **Feed comercial** | Pago | Média-alta | Cobre o que o fornecedor vê |
| **Sua própria telemetria** | Já paga | **A mais alta** | Cobre **só** o que você tem instrumentado |
| **Relatório de IR de terceiro** | Contexto | Alta | Só existe se alguém foi atacado e contou |
| **Análise de infraestrutura própria** | Tempo | Alta | Passivo, mas requer método (Módulo 6) |

⚠ **A categoria "sua própria telemetria" é a mais subestimada.** Times gastam em feed e não
investem em **log próprio** — e é o único que responde "isso aconteceu **comigo**?".

⚠ **ISAC exige reciprocidade, e isso é uma decisão organizacional.** Compartilhar é o que faz a
defesa coletiva funcionar; não compartilhar é vantagem de curto prazo e desvantagem de longo.

---

## 2.6 TLP — marcação para poder compartilhar

**Traffic Light Protocol** (FIRST) define até onde um produto pode ir.

| Marca | Significa | Pode compartilhar com |
|---|---|---|
| **TLP:RED** | Não divulgar | Só quem está na reunião / destinatário nomeado |
| **TLP:AMBER+STRICT** | Restrito à organização | Só a sua organização |
| **TLP:AMBER** | Restrito, com apoio | Organização e clientes que precisam agir |
| **TLP:GREEN** | Comunidade | Setor, ISAC, parceiro — não público |
| **TLP:CLEAR** | Público | Qualquer um (era "WHITE") |

⚠ **O erro que mais custa:** marcar tudo como TLP:RED por padrão. Resultado: ninguém compartilha,
a defesa coletiva não acontece, e você **não recebe** o que os outros têm.

⚠ **O erro inverso também custa:** marcar TLP:CLEAR algo que expõe a vítima. **Se o produto contém
nome de vítima, setor identificável, ou IOC que permite localizar quem foi atacado, ele não é
CLEAR.** Publicar isso expõe quem foi atacado, não o atacante.

---

## 2.7 LAB — Construir uma necessidade de inteligência e um produto

**Duração:** 120 min

⚠ **Tudo leitura de fonte pública.** Nenhuma consulta a infraestrutura de ator.

### Passo 1 — Defina a organização e a necessidade (30 min)

Escolha um cenário (real ou fictício, mas **específico**):

| Cenário | Setor | O que tem |
|---|---|---|
| A | Hospital de médio porte | Prontuário, dado de saúde, PACS |
| B | Fornecedor de software para governo | Código-fonte, acesso a cliente público |
| C | Fintech em crescimento | Dado financeiro, integração com banco |
| D | Indústria com OT | Planta, SCADA, cadeia de fornecedor |
| E | Escritório de advocacia | Casos confidenciais, M&A |

Produza `direcao.md`:

```markdown
## Organização
Setor: ...
O que ela tem que alguém quereria: ...
Relação com terceiros: ...
Regulação aplicável: ...

## Necessidade de Inteligência (Priority Intelligence Requirement)
PIR-1: [pergunta específica, respondível]
PIR-2: ...
PIR-3: ...

Cada PIR com:
  - Por que importa: [que decisão ela informa]
  - Quem consume: [papel]
  - Como saberíamos que foi respondida: [critério]
  - Prazo: [quando precisa estar respondida]
```

⚠ **Um PIR bom é respondível.** "Qual a ameaça de APT?" não é. "Qual ator tem maior probabilidade
de ter como alvo o nosso setor nos próximos 12 meses, e qual técnica ele usa primeiro?" é.

### Passo 2 — Colete de fontes públicas (45 min)

Para **uma** das PIRs, colete de **três fontes de tipos diferentes** (uma governamental, uma de
fornecedor, uma da sua própria reflexão sobre telemetria hipotética).

Produza `coleta.md`:

| Fonte (tipo + URL) | Confiabilidade | O que ela diz | O que ela **não** diz | Viés provável |
|---|---|---|---|---|
| | | | | |

**Responda:**

1. As três fontes concordam? **Onde divergem, e por quê?**
2. Qual das três tem interesse comercial em inflar a ameaça?
3. Qual informação você **não conseguiu** de fonte pública — e por que ela exigiria telemetria
   própria?

### Passo 3 — Use a Pirâmide da Dor (20 min)

Para a PIR escolhida, classifique o que você tem:

| Indicador que você coletou | Nível na Pirâmide | Vida útil estimada | Vale virar detecção? |
|---|---|---|---|
| | | | |

**Responda:**

1. Qual percentual do que você coletou tem vida útil de **dias**?
2. Qual parte é **durável** e merece virar detecção (Módulo 7)?
3. **Se você tivesse que jogar fora 80% do que coletou**, o que você manteria? Justifique.

### Passo 4 — Aplique o Diamond Model (15 min)

Produza `diamond.md` com os quatro vértices e **as relações**, para o cenário e o ator:

| Vértice | Conteúdo | Fonte |
|---|---|---|
| Adversário | | |
| Capacidade | | |
| Infraestrutura | | |
| Vítima | | |

| Relação | O que ela revela | **Implicação para a defesa** |
|---|---|---|
| Adversário ← capacidade | | |
| Vítima ← adversário | | |
| Vítima ← capacidade | | |

⚠ **A coluna "implicação para a defesa" é o entregável.** Preencher os vértices é fácil;
transformar relação em decisão de controle é o trabalho.

### Passo 5 — Marque e escreva o produto (10 min)

Produza `produto.md` — **uma página**, para o consumidor técnico:

```markdown
TLP:CLEAR          (ou a marca que você justificar)

# [Título que responde a PIR]
Data: 2026-10-18    Analista: <nome>    Confiança: [alta/moderada/baixa]

## 1. Pergunta respondida
## 2. O que sabemos
   (com fonte de cada afirmação)
## 3. O que avaliamos
   (com o nível de confiança e o raciocínio)
## 4. O que NÃO podemos concluir
## 5. Implicação para nós
## 6. Ação recomendada
## 7. Fontes
```

**Justifique a marcação TLP escolhida** — e considere: a vítima é identificável nesta página? O
IOC permite localizar quem foi atacado?

### Critérios de aceitação

- `direcao.md` com ao menos três PIRs, cada um **respondível** e com critério de resposta.
- `coleta.md` com três tipos de fonte, viés declarado, e a divergência explicada.
- Você classificou o que coletou na Pirâmide da Dor e nomeou o que é **durável**.
- `diamond.md` com as relações e a **implicação defensiva** de cada uma.
- `produto.md` com as sete seções e **confiança declarada**.
- Você justificou a marcação TLP, considerando a identificabilidade da vítima.
- Nenhuma consulta a infraestrutura de ator.

---

## Avaliação

1. Diferencie dado, informação e inteligência. Qual é o teste prático de "é inteligência"?
2. Descreva as sete etapas do ciclo. Onde ele quebra com mais frequência?
3. Por que "Direção" é a etapa mais negligenciada? O que acontece sem ela?
4. Escreva um PIR bom e um ruim. O que distingue os dois?
5. Explique a Pirâmide da Dor. Qual a consequência prática sobre onde alocar esforço?
6. Um IOC tem vida útil de dias. Isso significa que ele é inútil? Justifique.
7. Descreva os quatro vértices do Diamond Model e as relações entre eles.
8. **Qual relação do Diamond Model orienta melhor a defesa, e por quê?**
9. Cite quatro fontes e a limitação específica de cada uma.
10. Por que "sua própria telemetria" é a fonte mais subestimada?
11. Explique as cinco marcações TLP. Qual o erro mais custoso e por quê?
12. Por que marcar tudo como TLP:RED prejudica a sua própria defesa?
13. Um produto contém nome de empresa vítima. Qual TLP **não** pode ser?

---

**Próximo:** [Módulo 3 — ATT&CK aplicada e modelo de ameaça](modulo-03.md)
