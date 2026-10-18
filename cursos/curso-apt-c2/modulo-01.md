# Módulo 1 — O que é APT e por que é diferente

**Carga:** 2 horas (1h30 teoria · 30 min lab)
**Pré-requisitos:** Curso de malware (ou equivalente)

---

## Objetivos

1. Dar definição **operacional** de APT, e distinguir de rótulo de marketing.
2. Comparar APT com crime organizado e hacktivismo em eixos concretos.
3. Explicar por que a escala de tempo muda a defesa.
4. Reconhecer motivação de ator a partir de comportamento, não de comunicado.
5. Mapear atores reais a partir de fonte pública.

---

## ⚠ Conduta

Este módulo estuda atores que existem e operam. Ele **não** fornece vetor de ataque, não avalia
vulnerabilidade de alvo, e não orienta interação. Toda fonte é pública e toda consulta é passiva.

---

## 1.1 "APT" virou palavra de marketing — vamos desfazer isso

Desde ~2013, "APT" é usado para vender produto. Qualquer coisa persistente virou "APT". Isso
inutiliza o termo para trabalho real.

**Definição operacional — três propriedades, todas necessárias:**

| Propriedade | O que significa na prática |
|---|---|
| **Persistência intencional** | O ator **planeja** ficar. Não é "porque não foi detectado"; é projeto |
| **Recursos e sofisticação** | Tempo, ferramenta própria, desenvolvimento, infraestrutura, pessoal |
| **Alvo selecionado** | Escolhe quem atacar. Não é oportunista — é direcionado |

⚠ **A terceira é a que mais se perde na conversa.** Ransomware ataca quem tem a porta aberta. APT
ataca **quem ele quer**. Isso muda tudo: significa que **fechar a porta aberta não resolve**,
porque o ator vai procurar outra via até achar.

**E a consequência que você precisa ter na cabeça:** defesa contra APT é **detecção e tempo de
residência**, não bloqueio. Você não impede a entrada; você **encurta a estadia**.

---

## 1.2 Comparativo por eixo

| Eixo | Crime organizado | Hacktivismo | APT |
|---|---|---|---|
| **Objetivo** | Dinheiro | Visibilidade / ideologia | Informação, influência, posição |
| **Alvo** | Oportunista, em escala | Alvo simbólico | Selecionado, com paciência |
| **Escala de tempo** | Horas a dias | Horas a dias | **Meses a anos** |
| **Interesse em ser visto** | Não (exceto a extorsão) | **Sim** | **Não, nunca** |
| **Reuso de ferramenta** | Alta — ferramenta vira commodity | Alta, pública | **Baixa** — ferramenta própria, descartada |
| **IOC durável?** | Sim, algum tempo | Sim | **Não** — muda por campanha e por vítima |
| **O que você tem no fim** | Recuperação, perícia | Recuperação | **Nada foi cifrado** — talvez nada tenha mudado |
| **Como você descobre** | Barulho | Anúncio | **Caça, ou terceiro avisando** |
| **Resposta** | Horas | Horas | **Semanas a meses — e começa pela caça** |

⚠ **A linha "nada foi cifrado" é o que confunde muita gente.** Um incidente de APT pode não ter
sintoma nenhum: nenhum arquivo cifrado, nenhum serviço fora, nenhum alerta. **O dano é a perda de
informação — que você talvez descubra meses depois.**

⚠ **A linha "como você descobre" é a mais dura.** APT é descoberto por **caça proativa**,
**inteligência de terceiro** (parceiro, governo, fornecedor), ou pela própria remoção de uma
ferramenta que o ator deixou — frequentemente quando ele já decidiu que o alvo não vale mais.

---

## 1.3 Escala de tempo: por que isso muda a defesa

```
CRIME:      ──ENTRA────────IMPACTO──▶ fim
              horas

APT:        ──ENTRA──reconhecimento──lateral──persistência──coleta──sai──▶ continua
              semanas        meses             anos
              └─────────────── tempo de residência ───────────────┘
```

| Métrica de defesa | Contra crime | Contra APT |
|---|---|---|
| MTTD (tempo até detectar) | Horas | **Meses é o que se relatava; dias é o objetivo** |
| Tempo de residência | Horas | **Meses** |
| Objetivo do controle | Impedir | **Encurtar** |
| Ferramenta principal | Prevenção | **Caça e correlação** |
| Frequência de revisão | Contínua | Contínua **e retroativa** — caçar no dado histórico |

⚠ **"Retroativa" é a palavra que quase ninguém usa e é a mais importante.** Se você descobre uma
técnica hoje, você precisa **voltar no seu dado histórico** e procurar. Um ator que está lá há
oito meses deixou rastro nos logs dos últimos oito meses — se você tem retenção.

**A pergunta que você faz na primeira hora de qualquer suspeita de APT:**

> "Qual é a nossa retenção de log, e o que eu consigo consultar dos últimos **doze meses**?"

⚠ Se a resposta for "90 dias", essa é a primeira lacuna a resolver — antes de comprar qualquer
ferramenta.

---

## 1.4 Motivação: como reconhecer sem ler comunicado

Você não descobre motivação pelo que o ator diz. Descobre pelo que ele **coleta** e por quanto
tempo **fica**.

| Comportamento observado | Motivação provável |
|---|---|
| Coleta documento, e-mail, propriedade intelectual | **Espionagem** — informação |
| Prefere ficar quieto, evita dano, tempo longo | Espionagem |
| Alvo em setor de infraestrutura crítica, militar, diplomático | **Estatal** |
| Paga hospedagem barata, reusa infraestrutura | Menor recurso |
| Compra infraestrutura com cuidado, limpa rastro | **Maior recurso** |
| Cifra e cobra | Dinheiro (não é APT pela definição) |
| Deface, publica, busca imprensa | Hacktivismo |
| Coleta dado pessoal de alvo específico em massa | Vigilância / influência |
| Destrói e não coleta | **Sabotagem** — categoria própria |
| Fica **totalmente silencioso** após obter acesso | Acesso posicionado: quer **poder de retorno**, não dado |

⚠ **A última linha é a mais sofisticada e a mais difícil de detectar.** Um ator que entra, deixa
um acesso, e **não faz mais nada**, está se posicionando para o momento em que precisar. Não há
comportamento para detectar — só a persistência. É por isso que **caça a persistência** (Módulo 8)
é obrigatória mesmo sem qualquer outro indício.

---

## 1.5 Atribuição: o que se pode e o que não se pode dizer

Atribuição é Módulo 9 em profundidade, mas vale o alerta desde aqui.

⚠ **Os três erros de atribuição que aparecem em relatório amador:**

| Erro | Por que é erro |
|---|---|
| **Atribuir por ferramenta** | Ferramenta vaza entre grupos, é reusada, é vendida, é plantada |
| **Atribuir por IOC** | IOC é o que mais muda; oscila entre campanhas do mesmo ator |
| **Atribuir com certeza absoluta** | Nenhuma atribuição técnica é absoluta — sempre é grau de confiança |

**A forma correta:**

> "Com **confiança moderada**, avaliamos que esta atividade apresenta sobreposição com o conjunto
> de TTP de [grupo], com base em [evidência 1], [evidência 2]. **Não é possível concluir** sobre

 [atribuição estatal] a partir do dado disponível. Os indicadores são consistentes com múltiplos
atores que compartilham [o que é compartilhado]."

⚠ **Escrever assim não é fraqueza — é competência.** Atribuir com confiança alta sem evidência
correlacionada é o erro que destrói a credibilidade de um time de inteligência. E em contexto
geopolítico, atribuição errada tem consequência real.

---

## 1.6 LAB — Mapear um ator real a partir de fonte pública

**Duração:** 30 min
**Objetivo:** sair do abstrato e trabalhar com dado real, citando fonte.

⚠ **Tudo aqui é leitura de página pública.** Nenhuma consulta a domínio de ator, nenhuma conexão,
nenhum scan.

### Passo 1 — Escolha um ator

Use **uma** destas fontes, todas gratuitas:

- **MITRE ATT&CK → Groups** — https://attack.mitre.org/groups/
- **CISA Advisories** — https://www.cisa.gov/news-events/cybersecurity-advisories
- **Google TAG**, **Microsoft Threat Intelligence**, **ESET Research** — relatórios públicos
- **The DFIR Report** — casos com TTP

Escolha preferencialmente um grupo que:
- tenha atividade de **espionagem** (não só financeira);
- tenha **aliases** documentados (mostra que a atribuição é compartilhada e contestada);
- tenha relatório público com **detalhe técnico**.

### Passo 2 — Preencha a ficha

Produza `ator.md`:

| Campo | Conteúdo | **Fonte (URL)** |
|---|---|---|
| Nome principal | | |
| Aliases (e quem usa cada um) | | |
| Atribuição declarada, e **por quem** | | |
| Nível de confiança declarado na fonte | | |
| Motivação provável | | |
| Primeira atividade conhecida | | |
| Período de atividade | | |
| Alvos conhecidos (setor, região) | | |
| Técnicas ATT&CK: acesso inicial | | |
| Técnicas: persistência | | |
| Técnicas: movimento lateral | | |
| Técnicas: C2 | | |
| Técnicas: coleta / exfiltração | | |
| Ferramenta própria conhecida | | |
| **O que é específico deste ator** | | **A coluna que importa** |

⚠ **A última linha é o ponto do lab.** "O que é **específico**" significa: o que este ator faz que
a maioria não faz. É essa especificidade que serve para detecção. Se a resposta for "usa
PowerShell", você não achou nada — PowerShell é universal.

**Exemplos de especificidade real:**

| Específico | Genérico |
|---|---|
| "Usa um serviço de webmail específico como C2" | "Usa HTTPS" |
| "Prefere manipular o sistema de arquivos diretamente, sem API" | "Coleta arquivos" |
| "Usa um binário legítimo de um fabricante específico para movimento lateral" | "Usa PSExec" |
| "Mantém beacon com jitter alto e janela de horário restrita" | "Faz beacon" |

### Passo 3 — Responda por escrito

1. **Qual técnica deste ator você não teria como detectar hoje**, e por quê? (Pense em telemetria
   que você provavelmente não tem.)
2. Das técnicas mapeadas, **qual você priorizaria** para detecção? Justifique por posição na
   cadeia e por durabilidade.
3. A fonte declara atribuição estatal? **Com que confiança?** Você concorda que o dado
   apresentado sustenta essa confiança? Por quê?
4. **Que parte da atividade deste ator é invisível para quem só olha alerta de EDR?**

### Critérios de aceitação

- `ator.md` com a tabela completa e **URL em cada linha factual**.
- Você preencheu a coluna "o que é específico" com algo **realmente específico** — não "usa
  HTTPS" ou "usa PowerShell".
- A resposta 3 distingue **o que a fonte afirmou** de **o que o dado sustenta**.
- A resposta 4 nomeia um tipo de telemetria ou de visão que falta.
- Nenhuma consulta a domínio, IP ou infraestrutura do ator analisado.
- Você citou a fonte de cada afirmação.

---

## Avaliação

1. Dê a definição operacional de APT. Por que a propriedade "alvo selecionado" muda a defesa?
2. Compare crime organizado e APT em cinco eixos. Qual a consequência prática de cada diferença?
3. Por que "APT" virou termo de marketing e por que isso atrapalha?
4. Explique por que defesa contra APT é "encurtar a estadia" e não "impedir a entrada".
5. Por que um incidente de APT pode não ter sintoma nenhum?
6. Qual pergunta você faz na primeira hora de uma suspeita de APT? Por que a resposta
   provavelmente revela a maior lacuna?
7. Por que "retroativo" é a palavra-chave da caça contra APT?
8. Cite quatro comportamentos e a motivação que cada um sugere.
9. Por que um ator que entra e **não faz nada** é o caso mais sofisticado e mais difícil?
10. Cite os três erros de atribuição mais comuns e explique cada um.
11. Escreva uma frase de atribuição **correta** — com confiança declarada e com o que não se pode
    concluir.
12. Por que "usa PowerShell" não é especificidade útil para detecção? Dê um exemplo de
    especificidade que **é** útil.

---

**Próximo:** [Módulo 2 — Ciclo de inteligência e fontes](modulo-02.md)
