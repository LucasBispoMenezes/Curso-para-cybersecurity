# Módulo 8 — Caça a Ameaça com Hipótese

**Carga:** 3 horas (45 min teoria · 2h15 lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Distinguir caça a ameaça de monitoramento e de investigação.
2. Formular hipótese a partir de inteligência, não de palpite.
3. Executar caça com método, e **documentar o resultado negativo**.
4. Entender por que caça é o único método que encontra o ator que não faz nada.
5. Construir uma consulta reutilizável e um artefato que sobrevive à caça.

---

## ⚠ Escopo

A caça deste módulo roda contra **telemetria própria** ou **dado de laboratório**. Não há consulta
a infraestrutura de terceiro, não há interação com adversário, e não há varredura.

⚠ **A pergunta central da caça é sobre o seu ambiente:** *"este comportamento aconteceu **comigo**?"*.
Nada aqui serve para descobrir o que um terceiro tem.

---

## 8.1 Caça não é monitoramento

A distinção que define a prática:

| | Monitoramento | Investigação | **Caça** |
|---|---|---|---|
| Gatilho | Alerta | Incidente | **Hipótese** |
| Direção | Reativa | Reativa | **Proativa** |
| Pergunta | "Disparou?" | "O que aconteceu?" | **"Isso pode ter acontecido aqui?"** |
| Resultado esperado | Alerta tratado | Incidente contido | **Cobertura nova, ou confirmação de ausência** |
| Se não achar nada | Nada acontece | Caso encerrado | **Achado: você provou ausência** |

⚠ **A última linha é o que separa caça de um exercício inútil.** Uma caça que termina em "nada
encontrado" **não é uma caça fracassada**. Ela provou que um comportamento não ocorreu no período
— e essa é informação de valor, **se documentada**.

⚠ **E é por isso que "caça" que só reporta o que achou é caça malfeita.** Sem registro do negativo,
você não sabe o que já foi coberto, e vai refazer a mesma consulta em três meses.

---

## 8.2 De onde vem a hipótese

Hipótese não é palpite. Ela é **declaração testável** derivada de uma fonte.

| Fonte da hipótese | Exemplo de hipótese |
|---|---|
| **Inteligência de ator** | "Se o grupo X tem nosso setor como alvo, ele usa técnica T em hosts Windows" |
| **Relatório de caso de terceiro** | "O caso Y descreve persistência por WMI; verifico se tenho WMI nova" |
| **Nova detecção** | "Escrevi regra para T; consulto o histórico com ela" |
| **Modelo de ameaça** | "Meu fornecedor é caminho para meu cliente; busco acesso a pipeline em vez de dado" |
| **Anomalia interna** | "Um host faz tráfego de saída sem justificativa; verifico se há mais" |
| **Lacuna de cobertura** | "Não tenho visibilidade de T; busco o efeito de T no que eu **tenho**" |

⚠ **A última linha é a saída mais valiosa para quem tem telemetria limitada.** Você pode não ter o
log da técnica — mas a técnica **costuma deixar efeito** em algum log que você tem. Persistência
por WMI deixa rastro em processo e em arquivo; você busca o efeito, não o mecanismo.

### A estrutura de uma hipótese

```
HIPÓTESE: [afirmação testável sobre o MEU ambiente]
ORIGEM:   [de onde veio — fonte ou lacuna]
JUSTIFICATIVA: [por que é plausível para mim]
DADOS:    [que telemetria eu preciso]
CONSULTA: [o que eu vou rodar]
RESULTADO ESPERADO SE VERDADEIRA: [o que eu veria]
RESULTADO ESPERADO SE FALSA:      [o que eu veria — e é isto que documenta o negativo]
```

⚠ **Exemplo de hipótese ruim:** *"verificar se temos APT"*. Não é testável, não tem dado, não tem
critério.

⚠ **Exemplo de hipótese boa:** *"Dado que o ator do Módulo 1 usa WMI para persistência, e que 40%
dos nossos endpoints têm `Sysmon` com evento de processo, verifico se houve criação de
`__EventFilter` ou `CommandLineEventConsumer` nos últimos 90 dias. Se verdadeira, veria evento de
processo com `wmic` e caminho de consumidor. Se falsa, veria zero ocorrências não explicadas por
administração."*

---

## 8.3 A caça que encontra o que não aconteceu

O caso do Módulo 1: o ator que entra, deixa persistência, **e não faz mais nada**. Não há
comportamento. Como caçar isso?

| Abordagem | Como funciona |
|---|---|
| **Inventário diferencial** | O que existe hoje que não existia há N dias? |
| **Baseline de conectividade** | Que hosts conversaram com destinos que nunca apareceram? |
| **Revisão de acesso privilegiado** | Conta nova, permissão nova, chave nova |
| **Revisão de pipeline** | Se você é fornecedor: o que mudou no seu processo de entrega? |
| **Revisão de configuração** | O que mudou em regra de firewall, GPO, exclusão de AV? |

⚠ **A caça que encontra presença silenciosa é caça de inventário, não de evento.** Você não
procura comportamento — procura **mudança**. É a mesma técnica do Módulo 7, aplicada como caça.

⚠ **E é a caça mais importante contra APT**, porque é a única que pega o caso mais sofisticado.
Um ator que se posiciona e espera **só** é encontrado por inventário, revisão de acesso, e
correlação de configuração.

---

## 8.4 O ciclo de caça

```
1. HIPÓTESE      →  declaração testável (8.2)
2. PREPARAÇÃO    →  os dados existem? janela? campos?
3. CONSULTA      →  rodar; começar amplo, estreitar por iteração
4. TRIAGEM       →  separar candidato de ruído legítimo
5. ANÁLISE       →  o candidato é achado? qual a explicação?
6. AÇÃO          →  achado: escalar. negativo: registrar.
7. ARTEFATO      →  virar detecção, ou virar item de baseline permanentemente
```

⚠ **A etapa 7 é o que faz a caça valer a pena no longo prazo.** Sem ela, a caça é um exercício
único: você gasta 6 horas, não acha nada, e em seis meses refaz a mesma consulta do zero.

**O que a etapa 7 produz:**

| Se o resultado foi... | O artefato é... |
|---|---|
| Achado | Regra de detecção (Módulo 7) + IOC + escalação |
| Negativo, mas o dado existe | **Consulta salva + agendamento** (vira monitoramento) |
| Negativo, e o dado **não** existe | **Solicitação de telemetria** com justificativa e custo |
| Candidato legítimo recorrente | **Item de baseline** — agora está documentado |

⚠ **A terceira linha é a mais valiosa das quatro.** Uma caça que falha por falta de dado produziu
**o argumento de negócio para obter aquele dado**. Esse é o resultado mais acionável que existe — e
o menos explorado, porque "não consegui caçar" costuma virar encolher de ombros.

---

## 8.5 Documentar o negativo

O artefato que a maioria não produz, e o que dá valor cumulativo ao programa de caça.

```markdown
# Registro de Caça

## Identificação
HIP-2026-014
Data: 2026-10-18        Analista: <nome>
Tempo gasto: 4h

## Hipótese
[declaração testável]

## Origem
[ator / relatório / lacuna de cobertura / anomalia]

## Dados usados
| Fonte | Campos | Janela | Retenção disponível |
|---|---|---|---|
| | | 90 dias | 90 dias (limite atingido) |

## Consulta executada
```sql
<consulta, para poder ser repetida>
```

## Resultado
- Total de eventos: 12.480
- Candidatos após filtro: 37
- Explicação para os 37: 35 por [motivo legítimo], 2 em investigação
- **Achado: nenhum**

## O que este negativo significa
Provado: nos últimos 90 dias, no conjunto de hosts com [telemetria], não houve
[comportamento] não explicado por atividade legítima.

**NÃO provado:**
- Fora dos 90 dias (retenção não permite ir além)
- Em hosts sem [telemetria] — são N hosts, cobertura de X%
- Se o comportamento tem variante que não casa a consulta

## Artefato gerado
- [ ] Regra de detecção (não aplicável — negativo)
- [x] Consulta salva em `queries/hip-2026-014.sql`
- [x] Agendamento: rodar mensalmente
- [ ] Solicitação de telemetria
```

⚠ **A seção "NÃO provado" é obrigatória e é o coração do registro.** Ela impede que o negativo se
transforme em falsa segurança. *"Caçamos e não achamos"* vira *"estamos limpos"* — e não é o mesmo.

---

## 8.6 LAB — Executar uma caça completa

**Duração:** 135 min

⚠ **Você vai caçar contra dado de laboratório ou telemetria própria.** O lab inclui um gerador de
telemetria sintética para quem não tem SIEM.

### Passo 1 — Formule a hipótese (20 min)

Use o ator do Módulo 1 e a cobertura do Módulo 3. Produza `hipotese.md`:

```markdown
## HIP-<seu>-001

HIPÓTESE:
ORIGEM:
JUSTIFICATIVA (por que é plausível PARA MIM):
DADOS NECESSÁRIOS:
CONSULTA PREVISTA:
RESULTADO SE VERDADEIRA:
RESULTADO SE FALSA:
JANELA:
```

⚠ **A justificativa precisa ser sobre **você**.** "O ator existe" não justifica. "O ator tem meu
setor como alvo e usa a técnica T, e eu tenho a telemetria X" justifica.

### Passo 2 — Gere a telemetria de laboratório (25 min)

Se você não tem SIEM, gere dado sintético que contenha o comportamento:

```bash
mkdir -p ~/apt-lab/lab8 && cd ~/apt-lab/lab8

cat > gera-telemetria.py <<'PY'
"""gera telemetria sintética — parte normal, parte com o comportamento da hipótese"""
import json, random, time
from datetime import datetime, timedelta

random.seed(42)
agora = datetime(2026, 10, 18, 12, 0, 0)
eventos = []

hosts_normal = [f"WS-{i:03d}" for i in range(1, 21)]
contas_normal = ["ana.silva", "bruno.costa", "carla.dias", "daniel.rocha"]

# 1. Tráfego normal: logon, processo comum
for h in hosts_normal:
    for d in range(90):
        t = agora - timedelta(days=d, hours=random.randint(0, 12))
        eventos.append({
            "ts": t.isoformat(), "host": h, "tipo": "logon",
            "conta": random.choice(contas_normal), "resultado": "sucesso"
        })
        if random.random() < 0.7:
            eventos.append({
                "ts": t.isoformat(), "host": h, "tipo": "processo",
                "processo": random.choice(["explorer.exe", "chrome.exe",
                                           "outlook.exe", "excel.exe"]),
                "pai": "explorer.exe"
            })

# 2. Administração legítima: 2 hosts, 1 conta, horário comercial
for d in range(90):
    if random.random() < 0.3:
        t = agora - timedelta(days=d, hours=random.randint(9, 17))
        eventos.append({
            "ts": t.isoformat(), "host": random.choice(["SRV-01", "SRV-02"]),
            "tipo": "processo", "processo": "wmic.exe",
            "pai": "cmd.exe", "conta": "svc-adm", "linha":
            "wmic /node:SRV-01 process list brief"
        })

# 3. O COMPORTAMENTO DA HIPÓTESE: poucos eventos, fora do padrão
#    WMI com consumidor persistente, em horário atípico, conta incomum
for d in [12, 11, 9]:
    t = agora - timedelta(days=d, hours=3, minutes=random.randint(0, 50))
    eventos.append({
        "ts": t.isoformat(), "host": "WS-017", "tipo": "processo",
        "processo": "wmic.exe", "pai": "svchost.exe",
        "conta": "svc-adm",
        "linha": "wmic /namespace:\\\\root\\subscription PATH __EventFilter"
    })
    eventos.append({
        "ts": t.isoformat(), "host": "WS-017", "tipo": "processo",
        "processo": "wmic.exe", "pai": "svchost.exe", "conta": "svc-adm",
        "linha": "wmic /namespace:\\\\root\\subscription PATH "
                 "CommandLineEventConsumer"
    })

# 4. Ruído: mais eventos com wmic legítimo (para a caça ter trabalho)
for d in range(90):
    if random.random() < 0.15:
        t = agora - timedelta(days=d, hours=random.randint(8, 18))
        eventos.append({
            "ts": t.isoformat(), "host": random.choice(hosts_normal + ["SRV-01"]),
            "tipo": "processo", "processo": "wmic.exe", "pai": "explorer.exe",
            "conta": random.choice(contas_normal),
            "linha": "wmic logicaldisk get size,freespace"
        })

eventos.sort(key=lambda e: e["ts"])
with open("telemetria.jsonl", "w") as f:
    for e in eventos:
        f.write(json.dumps(e) + "\n")

print(f"gerados {len(eventos)} eventos em telemetria.jsonl")
PY

python3 gera-telemetria.py
wc -l telemetria.jsonl
```

### Passo 3 — Execute a caça (40 min)

⚠ **Comece amplo, estreite por iteração.** Não comece com o filtro perfeito.

**Iteração 1 — amplo:**

```bash
# Todos os eventos de wmic
jq -c 'select(.processo == "wmic.exe")' telemetria.jsonl | wc -l
```

**Iteração 2 — estreite por origem incomum:**

```bash
# wmic cujo pai NÃO é um shell interativo (indicador de criação programática)
jq -c 'select(.processo=="wmic.exe" and (.pai != "cmd.exe" and .pai != "explorer.exe"))' \
   telemetria.jsonl | head -20
```

**Iteração 3 — estreite por namespace de persistência:**

```bash
# wmic referenciando o namespace de subscription — indicador forte
jq -c 'select(.linha? // "" | test("subscription|__EventFilter|EventConsumer"))' \
   telemetria.jsonl
```

**Iteração 4 — estreite por horário:**

```bash
jq -r 'select(.processo=="wmic.exe") | [.ts, .host, .pai, (.linha // "-")] | @tsv' \
   telemetria.jsonl | while IFS=$'\t' read -r ts host pai linha; do
    hora=$(echo "$ts" | cut -c12-13)
    if [ "$hora" -lt 6 ] || [ "$hora" -ge 20 ]; then
        echo "FORA DO HORÁRIO  $ts  $host  pai=$pai  $linha"
    fi
done
```

**Produza `iteracoes.md`:**

| Iteração | Filtro aplicado | Total de eventos | Candidatos | O que eliminou |
|---|---|---|---|---|
| 1 | todos wmic | | | — |
| 2 | pai incomum | | | |
| 3 | namespace subscription | | | |
| 4 | horário atípico | | | |

**Responda:**

1. Em qual iteração o número de candidatos **caiu de forma decisiva**? Por quê?
2. Quantos candidatos sobraram? **Todos são o comportamento procurado, ou há ruído legítimo?**
3. **Qual critério sozinho teria produzido mais falso positivo?** Mostre com o número.
4. Qual **combinação de dois critérios** isola o comportamento com menos ruído?
5. O evento da hipótese aparece? Em qual host, e em qual data?

### Passo 4 — Triagem e análise (25 min)

Para cada candidato, produza a explicação:

| Candidato | Host | Data | Explicação | Legítimo? | Evidência |
|---|---|---|---|---|---|
| | | | | | |

⚠ **"Legítimo" exige justificativa, não intuição.** Para o evento do `svc-adm` às 03h em host de
usuário, a pergunta é: **essa conta deveria estar logada nesse host, nesse horário?**

**Responda:**

1. Você tem **achado**? Se sim, qual e com que evidência?
2. Se o achado for positivo, **qual o próximo passo**? (Não é "conter" — é o que?)
3. Se o achado for positivo, o que **falta** para confirmar que é malicioso e não erro de
   configuração?

⚠ **A resposta 2 é importante:** achado de caça **não autoriza contenção automática**. Você
encontrou um candidato; confirmar é investigação, e conter sem confirmar pode destruir evidência.

### Passo 5 — Documente e gere o artefato (25 min)

Produza `registro-caca.md` seguindo **exatamente** o modelo da seção 8.5, com:

- Todas as seções.
- A consulta **reproduzível** (salve em `queries/`).
- **A seção "NÃO provado"** preenchida com pelo menos **três** itens.
- O artefato gerado marcado.

**Produza também o artefato:**

| Se o resultado foi... | Produza |
|---|---|
| Achado | Regra YARA/Sigma + solicitação de escalação |
| Negativo com dado disponível | **Consulta salva + agendamento mensal** |
| Negativo sem dado | **Solicitação de telemetria** com custo e justificativa |

⚠ **Se você não teve achado (o mais provável, porque o dado é sintético e o ruído foi construído
assim), você produz a consulta salva.** Caça que termina em "nada encontrado, fim" foi caça que
não gerou artefato — e é o erro mais comum da prática.

### Critérios de aceitação

- `hipotese.md` com as sete seções e justificativa **sobre o seu ambiente**.
- `iteracoes.md` mostrando o estreitamento por etapa, com **números**.
- Você identificou em qual iteração os candidatos caíram de forma decisiva.
- Você nomeou o critério que **sozinho** geraria mais falso positivo.
- Tabela de triagem com explicação por candidato.
- Você respondeu o que fazer **antes** de conter um achado.
- `registro-caca.md` com a seção **"NÃO provado"** e no mínimo três itens.
- Você gerou um **artefato** ao final, mesmo com resultado negativo.
- A consulta está salva e é reproduzível.

---

## Avaliação

1. Diferencie caça de monitoramento e de investigação.
2. Por que uma caça que termina em "nada encontrado" não é fracassada?
3. O que é preciso documentar para que o negativo tenha valor?
4. Cite cinco fontes de hipótese.
5. Por que a hipótese "verificar se temos APT" é ruim? Reescreva-a.
6. Como caçar uma técnica quando você **não tem** a telemetria dela? Dê um exemplo.
7. Explique por que a caça que encontra presença silenciosa é caça de inventário.
8. Descreva as sete etapas do ciclo de caça.
9. Por que a etapa 7 é o que faz a caça valer no longo prazo?
10. Uma caça falhou por falta de dado. Qual é o artefato mais valioso que ela produz?
11. Por que a seção "NÃO provado" é obrigatória? Que transformação ela impede?
12. Um achado de caça autoriza contenção automática? Por quê?
13. Por que começar a consulta ampla e estreitar por iteração é melhor que começar com o filtro
    perfeito?

---

**Próximo:** [Módulo 9 — Atribuição, produto e exercício](modulo-09.md)
