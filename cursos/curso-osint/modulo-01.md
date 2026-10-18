# Módulo 1 — Fundamentos e o Ciclo de Investigação

**Carga:** 2 horas (1h30 teoria · 30 min lab)
**Pré-requisitos:** Nenhum específico

---

## Objetivos

1. Definir OSINT com precisão — e distinguir do que se vende como OSINT e não é.
2. Distinguir **dado**, **informação** e **achado verificado**.
3. Aplicar o ciclo de investigação em seis fases.
4. Reconhecer os quatro erros que arruínam uma investigação.
5. Entender por que "global" muda o método, e não só a lista de sites.

---

## ⚠ Conduta

Este módulo é conceitual. Nenhuma consulta. O lab é sobre **método**, e o alvo é abstrato.

⚠ **A fronteira que vale o curso inteiro:** a pergunta não é *"é público?"*, e sim **"qualquer
pessoa obtém isso sem violar nada?"**. Uma base vazada é "pública" na prática, e não é OSINT — é
dado obtido ilicitamente, com consequência legal própria.

---

## 1.1 O que OSINT é, de verdade

**OSINT** (Open-Source Intelligence) é inteligência produzida a partir de **fonte aberta** —
informação disponível a qualquer pessoa, obtida **sem** acesso não autorizado, sem engano e sem
violação.

A sigla tem três palavras e todas importam:

| Palavra | O que ela exige |
|---|---|
| **Open** | Qualquer pessoa pode obter. Não é "eu consigo" — é "qualquer um consegue, legalmente" |
| **Source** | Há uma origem identificável, e você a cita |
| **Intelligence** | Não é dado bruto. É análise com **relevância e implicação** |

⚠ **A definição por exclusão é a mais útil**, porque é onde a maioria erra:

| Vem de... | É OSINT? |
|---|---|
| Registro público de empresa | **Sim** |
| Site, publicação, documento oficial | **Sim** |
| Imagem pública com metadado | **Sim** |
| Declaração financeira arquivada | **Sim** |
| **Base de dado vazada** | **Não** — obtida ilicitamente |
| **Conta de terceiro acessada** | **Não** — acesso não autorizado |
| **Informação obtida por engano** | **Não** — é engenharia social |
| **Dado comprado de intermediário opaco** | **Não** até você provar a origem legal |

⚠ **A quarta linha negativa é a mais comum na prática profissional.** "Data broker" vende pacote
de dado pessoal. Você não sabe a origem. Se a origem for vazamento, você **manuseou dado obtido
ilicitamente** — e isso é problema seu, não do vendedor.

**A pergunta que resolve:** *"se eu tivesse que explicar num tribunal como obtive isto, minha
resposta seria boa?"* Se a resposta é "comprei de um site", ela não é boa.

---

## 1.2 Dado, informação, achado

Retomando a distinção do curso de APT, aplicada a OSINT:

| Nível | Exemplo | O que falta |
|---|---|---|
| **Dado** | `+55 11 9xxxx-xxxx` aparece numa lista | Contexto |
| **Informação** | É um celular brasileiro, operadora X, ativo | Verificação |
| **Achado** | Este número está ligado a esta entidade, **por esta fonte**, **nesta data**, com **esta confiança** | — |

⚠ **A diferença entre informação e achado é a palavra "verificado".** Um número encontrado num
site **não é** o número daquela pessoa. É **um número que um site associa** àquela pessoa — e sites
erram, reciclam dado, ou inventam.

⚠ **A confiança é obrigatória.** Como em todo este material: **alta**, **moderada**, **baixa**,
**desconhecida**. Sem confiança declarada, o achado não é acionável — e em contexto legal ou
jornalístico, é indesculpável.

---

## 1.3 O ciclo de investigação — seis fases

Adaptado do **Berkeley Protocol on Digital Open Source Investigations** (ONU), que é o padrão
metodológico da área.

```
1. DEFINIÇÃO      →  O que eu quero saber? Qual a pergunta?
2. PLANEJAMENTO   →  Que fonte responde? Qual a jurisdição? O que é lícito?
3. COLETA         →  Obter o dado, com registro de fonte e data
4. VERIFICAÇÃO    →  Corroborar por fonte independente
5. ANÁLISE        →  Ligar os pontos; declarar confiança
6. DOCUMENTAÇÃO   →  Registro reprodutível, com cadeia de custódia
```

### Onde cada fase quebra

| Fase | Como falha | Sintoma |
|---|---|---|
| **1. Definição** | Pergunta vaga ("quero saber tudo sobre X") | Coleta infinita, sem conclusão |
| **2. Planejamento** | Não checar jurisdição | Você fez algo que é ilegal onde você está |
| **3. Coleta** | Não registrar **quando** e **onde** | Achado não reprodutível, não defensável |
| **4. Verificação** | **Corroborar com a mesma fonte** | Falso consenso: três sites que copiaram um do outro |
| **5. Análise** | Salto para conclusão | Viés de confirmação |
| **6. Documentação** | Não registrar o que **não** achou | Você refaz o trabalho |

⚠ **A fase 4 é onde mais gente erra.** Três sites com o mesmo número de telefone **não são três
fontes** — são **uma**, se todos copiaram do mesmo lugar. Independência significa: origem
diferente, método diferente, e capacidade de discordar.

⚠ **A fase 6 é o que separa investigação de curiosidade.** Sem registro de fonte, data e método,
o achado não serve para nada que exija defesa: não serve para jornal, não serve para tribunal, e
não serve para você mesmo em seis meses.

---

## 1.4 Os quatro erros que arruínam uma investigação

| Erro | Como aparece | Como evitar |
|---|---|---|
| **Viés de confirmação** | Você procura o que já acredita | Procure **ativamente** o que refuta |
| **Falso consenso** | "Está em três sites" | Verifique **independência** da fonte |
| **Ancoragem** | A primeira informação contamina tudo | Liste hipóteses alternativas **antes** |
| **Conclusão prematura** | Acha o que queria e para | **Declare a confiança** e o que falta |

⚠ **O erro mais perigoso em OSINT é a confiança que vem do volume.** Encontrar a mesma informação
em muitos lugares **parece** corroboração e frequentemente é **repetição da mesma origem**. É o
equivalente de OSINT do "falso consenso" do Módulo 9 do curso de APT.

**O teste de independência, em três perguntas:**

1. As fontes **poderiam discordar** entre si? (Se todas copiam a mesma, não.)
2. Cada uma tem **método próprio** de obtenção?
3. Alguma delas cita **a outra** como origem?

⚠ Se a resposta 3 for "sim", você tem **uma** fonte com três endereços.

---

## 1.5 Por que "global" muda o método

Aqui está a tese do curso, e ela merece ser explícita.

Um curso de OSINT nacional ensina: *"o telefone se consulta no site X, a empresa no site Y"*.

Um curso global **não pode fazer isso** — porque a mesma pergunta tem resposta diferente em cada
país, e o número de países é 195.

**A solução é inverter:**

| Abordagem | Exemplo |
|---|---|
| **Nacional** | "Consulte o registro de empresas no site do governo" |
| **Global** | "**Derive** o registro pela estrutura: o identificador é `CNPJ`, logo é Brasil, logo o registro é a Receita Federal; se fosse `VAT DE`, seria Alemanha, e o registro seria o Handelsregister" |

⚠ **A segunda abordagem é mais difícil de ensinar e muito mais útil.** Ela sobrevive à mudança de
site, de governo e de país.

**O que o Módulo 2 constrói:** o hábito de olhar o identificador **antes** de procurar, porque o
identificador **já diz** onde procurar.

| Identificador | Ele já diz |
|---|---|
| `+55 11 ...` | Brasil, região 11 (São Paulo), celular |
| `.de` | Alemanha; registro de domínio é o DENIC |
| `DE 123456789` | ALEMANHA; é VAT, e o registro é o Handelsregister |
| `NIF B12345678` | ESPANHA; é empresa |
| `Companies House 12345678` | REINO UNIDO; 8 dígitos é o padrão de lá |
| `IBM` + `LEI` | Entidade legal globalmente identificada |

⚠ **O último item é o mais poderoso e o menos conhecido.** O **LEI** (Legal Entity Identifier,
ISO 17442) é um identificador **global** de entidade legal — 20 caracteres, mantido pelo GLEIF, e
**gratuito de consultar**. Se você tem o LEI, você tem a entidade, em qualquer país, sem precisar
saber qual é o registro nacional.

**Isso é a resposta global a um problema global** — e é o tipo de coisa que o curso ensina em vez
de uma lista de 200 sites.

---

## 1.6 LAB — Estrutura de investigação sobre alvo abstrato

**Duração:** 30 min

⚠ **Sem consulta. Sem alvo real.** Você constrói o **plano**, não o executa. O objetivo é fixar o
método antes de aplicá-lo.

### Passo 1 — Escolha um cenário

Um dos quatro:

| Cenário | O que você tem |
|---|---|
| **A** | Um número de telefone que começa com `+49` |
| **B** | Um domínio terminado em `.br`, registrado em 2019 |
| **C** | Uma empresa cujo identificador você não sabe, mas sabe o nome e o país |
| **D** | Uma foto de rua, sem legenda, com placa de carro visível |

### Passo 2 — Preencha a estrutura

Produza `plano.md`:

```markdown
## Cenário escolhido
[A/B/C/D]

## 1. Definição — a pergunta
O que eu quero saber, especificamente?

O que eu NÃO preciso saber? (reduz escopo)

## 2. Planejamento
### 2a. Que tipo de identificador eu tenho?
[o que é: telefone, domínio, nome, imagem]

### 2b. Que jurisdição isso sugere, e por quê?
(O identificador já diz algo? Qual?)

### 2c. Que classe de fonte responde?
Registro oficial? Base pública? Arquivo? Meta-dado?

### 2d. O que é lícito fazer, onde EU estou?
(Se você não sabe, é a resposta — e você vai estudar o Módulo 10)

## 3. Coleta — o que eu registraria
| Fonte | O que consulto | O que registro (data, URL, o que encontrei) |

## 4. Verificação — como eu corroboro
Que SEGUNDA fonte, INDEPENDENTE, eu usaria?
Por que ela é independente?

## 5. Análise
Que hipóteses alternativas existem? (liste 3)
Confiança esperada: alta / moderada / baixa

## 6. Documentação
O que eu registraría mesmo se NÃO achasse nada?
```

### Passo 3 — Responda por escrito

1. No seu cenário, **o identificador já diz alguma coisa**? O que?
2. Qual a sua **segunda fonte independente**? Por que ela é independente e não repetição?
3. **Qual fase do ciclo você acha que vai falhar no seu caso?**
4. Que informação você **decidiu não coletar**? Por quê?

⚠ **A resposta 4 é o entregável.** Reduzir escopo é habilidade, e a maioria não faz.

### Critérios de aceitação

- `plano.md` com as **seis** fases preenchidas.
- Você identificou o que o **identificador já diz** sobre a jurisdição.
- A segunda fonte é justificadamente **independente** (não cita a primeira).
- Você nomeou **três hipóteses alternativas** — não só a que você acha provável.
- Você declarou o que **não** vai coletar, e por quê.
- Você identificou a fase que provavelmente vai falhar no seu caso.
- Nenhuma consulta foi feita — o entregável é o plano.

---

## Avaliação

1. Defina OSINT em uma frase, com as três palavras da sigla e o que cada uma exige.
2. Por que a pergunta correta **não** é "é público?", e sim "qualquer pessoa obtém sem violar nada?"
3. Por que uma base de dado vazada **não é** OSINT, mesmo sendo acessível?
4. Por que o dado de um "data broker" pode ser problemático mesmo que você pague por ele?
5. Diferencie dado, informação e achado. O que transforma informação em achado?
6. Por que a confiança declarada é obrigatória? Dê um exemplo em que a omissão causa dano.
7. Descreva as seis fases do ciclo. Onde ele quebra com mais frequência?
8. Explique o falso consenso em OSINT. Como você detecta que três fontes são uma só?
9. Cite os quatro erros que arruínam uma investigação e o antídoto de cada um.
10. Por que um curso global **não pode** ser uma lista de sites? O que ele ensina em vez disso?
11. O que o identificador `DE 123456789` já diz, antes de qualquer consulta?
12. O que é LEI e por que ele é a resposta "global" a um problema global?
13. Por que registrar o que **não** foi encontrado é parte do método?

---

**Próximo:** [Módulo 2 — O identificador e a jurisdição](modulo-02.md)
