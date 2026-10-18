# Módulo 1 — Modelagem de Ameaça para Privacidade

**Carga:** 2 horas (1h30 teoria · 30 min lab)
**Pré-requisitos:** Nenhum específico

---

## Objetivos

1. Distinguir **sigilo de conteúdo** de **anonimato de origem** — e saber que você raramente quer
   só um dos dois.
2. Nomear um adversário concreto e estimar o recurso dele.
3. Aplicar a tríade CIA ao problema de privacidade.
4. Reconhecer os cinco erros de modelagem que tornam a proteção inútil.
5. Produzir um modelo de ameaça escrito e verificável.

---

## ⚠ Conduta

Este módulo é puramente conceitual. Nenhuma técnica ofensiva, nenhum alvo. Todas as medições dos
módulos seguintes são **contra você mesmo**.

⚠ **Anonimato de rede é ferramenta de proteção de direitos.** Se o seu modelo de ameaça é "quero
que a investigação criminal não me encontre", este curso não é o material — e a modelagem de
ameaça que você faria não é o que está aqui.

---

## 1.1 A pergunta que ninguém faz

Todo material de privacidade começa com a ferramenta. Este curso começa com a pergunta:

> **De quem, exatamente, você está se protegendo?**

A resposta determina **tudo**: qual ferramenta, qual configuração, e — o mais importante — **o que
você não precisa fazer**.

⚠ **Sem essa pergunta, você faz duas coisas erradas ao mesmo tempo:**

| Erro | Consequência |
|---|---|
| **Proteção insuficiente** | Você usa Tor achando que resolve, e vaza por outra camada (Módulo 7) |
| **Proteção excessiva** | Você adota prática que atrapalha o trabalho e **abandona em uma semana** |

⚠ **A segunda linha é a que ninguém menciona.** Proteção que você não consegue manter é pior que
proteção parcial que você mantém — porque a abandonada não protege nada, e a parcial ao menos
cobre o que cobre.

**O objetivo do curso:** anonimato **suficiente para um adversário específico**, defensável, e que
você consegue manter.

---

## 1.2 Sigilo ≠ anonimato — a distinção que organiza o curso

São duas propriedades **independentes**, e confundi-las é a origem da maioria dos mal-entendidos.

| | **Sigilo de conteúdo** | **Anonimato de origem** |
|---|---|---|
| Protege | O **que** você disse | **Quem** disse |
| Pergunta | "Alguém consegue ler?" | "Alguém consegue saber que fui eu?" |
| Técnica | Cifra (TLS, PGP, Signal) | Roteamento em camadas (Tor), proxy, mixnet |
| Quebra se | Chave vaza, endpoint é comprometido | Circuito é correlacionado |
| Exemplo | E-mail cifrado | E-mail cifrado enviado por Tor |

### As quatro combinações, e o que cada uma significa

```
                        SIGILO SIM          SIGILO NÃO
                    ┌──────────────────┬──────────────────┐
                    │                  │                  │
    ANONIMATO SIM   │ Ambiente ideal   │ Tor para site    │
                    │ Signal, Tor      │ em HTTP puro     │
                    │ + HTTPS          │                  │
                    │                  │ ⚠ anônimo, mas   │
                    │                  │ todo mundo vê o  │
                    │                  │ que você disse   │
                    ├──────────────────┼──────────────────┤
                    │                  │                  │
    ANONIMATO NÃO   │ HTTPS ou VPN     │ Rede aberta      │
                    │ comum. O caso    │ Nada protegido   │
                    │ MAIS COMUM       │                  │
                    │                  │                  │
                    │ ⚠ o provedor vê  │                  │
                    │ a origem, o site │                  │
                    │ vê você          │                  │
                    └──────────────────┴──────────────────┘
```

⚠ **O caso "anonimato sim + sigilo não" merece atenção porque é contraintuitivo.** Tor até um site
HTTP puro **esconde quem você é**, mas **expõe o que você disse** — inclusive ao relay de saída.

⚠ **O caso "sigilo sim + anonimato não" é o mais comum** — e é onde a maioria das pessoas vive:
HTTPS normal. O site não lê o que você manda, mas sabe exatamente quem você é, de qual IP, com
qual conta, em qual horário.

### O que cada ferramenta realmente entrega

| Ferramenta | Sigilo de conteúdo | Anonimato de origem | Confiança em terceiro |
|---|---|---|---|
| **HTTPS** | Sim, contra o caminho | **Não** | Só no emissor do certificado |
| **VPN** | Sim, contra o caminho local | **Do provedor, não do destino** | **Total no provedor** |
| **Proxy** | Não (a menos que HTTPS) | Do destino, do proxy | Total no proxy |
| **Tor** | Não por si — depende de TLS | **Sim**, contra destino e caminho | Distribuída (3 relays) |
| **Tor + HTTPS** | Sim | Sim | Distribuída + emissor |
| **Signal** | Sim (E2E) | Não (o servidor sabe seu IP) | Mínima na mensagem |
| **Signal + Tor** | Sim | Sim | distribuída |

⚠ **A coluna "confiança em terceiro" é a que decide o resto.** VPN concentra **toda** a confiança
em **uma** entidade. Tor a distribui em três relays que não se coordenam — e essa diferença é o
assunto do Módulo 4 e 9.

---

## 1.3 Adversário: nomear, estimar, e ser realista

"Adversário" sem adjetivo não serve. Você precisa nomear e estimar recurso.

### A escala de recurso

| Nível | Capacidade | Exemplo |
|---|---|---|
| **A1 — Oportunista** | Script pronto, sem alvo | Spam, scam, dados vazados em massa |
| **A2 — Rastreador comercial** | Correlação entre site, cookies, fingerprint | Publicidade, analytics, data broker |
| **A3 — Provedor de serviço** | Vê sua conta, IP, metadado de uso | ISP, VPN, e-mail, rede social |
| **A4 — Operador de rede local** | Vê todo tráfego não cifrado da rede | Administrador de rede corporativa, escola, hotel, cibercafé |
| **A5 — Vigilância de rede em escala** | Observa a rede nacional; correlação de fluxo | Operadora, autoridade estatal |
| **A6 — Adversário com alcance físico** | Compromete dispositivo, compra fonte humana | APT estatal, crime organizado |

⚠ **A distinção entre A3 e A5 é a que mais importa neste curso.**

| | A3 — Provedor | A5 — Vigilância de rede |
|---|---|---|
| Vê | A sua conta e o seu uso | O **padrão** do tráfego |
| Contra VPN | Vence (é o provedor) | Perde (não vê o conteúdo) |
| Contra Tor | Perde (não vê o destino) | **Empata** (vê o padrão, não o conteúdo) |
| Como se protege | Escolha do provedor, Tor | Tor + **resistência a correlação** (Módulo 9) |

**A regra que decorre:** contra A5, o que vaza **não é o conteúdo** — é o **padrão temporal**. E
isso muda a decisão: você não precisa de mais cifra, precisa de mais indistinguibilidade.

### Perguntas de modelagem que funcionam

| Pergunta | Por que importa |
|---|---|
| **O que eu quero proteger?** | O dado, a comunicação, ou **o ato** de comunicar? |
| **De quem?** | Nomeie o nível A1–A6 |
| **O que o adversário ganha se descobrir?** | Dano de reputação, físico, legal |
| **O que acontece se eu falhar?** | Consequência, para calibrar |
| **O que eu **não** preciso proteger?** | **Reduz escopo — e a maioria ignora** |
| **O adversário tem alcance físico?** | Se sim, software não resolve (Módulo 9) |

⚠ **A penúltima linha é a que economiza mais esforço.** Se você é pesquisador publicando dado
público, seu adversário não precisa de metadata de origem. Se você tem uma fonte, o **ato da
comunicação** é o segredo — não só o conteúdo.

---

## 1.4 Os cinco erros de modelagem

| Erro | Como aparece | Correção |
|---|---|---|
| **Adversário vago** | "quero privacidade" | Nomeie A1–A6 e o ganho dele |
| **Confundir sigilo com anonimato** | "uso VPN, logo estou anônimo" | Separe as duas propriedades (§1.2) |
| **Proteção excessiva** | Exige que ninguém fale com você por e-mail | Calibre — proteção não sustentável é abandonada |
| **Ignorar alcance físico** | "uso Tor, estou seguro" com celular comprometido | Alcance físico derrota software |
| **Não medir** | "acho que está protegido" | **Meça** (Módulo 7 e 12) |

⚠ **O erro "não medir" é o que faz este curso existir.** Você não sabe o que está exposto por
introspecção; sabe por **observação** do seu próprio tráfego. É o que você vai fazer do Módulo 3
em diante.

---

## 1.5 A tríade CIA aplicada a privacidade

A tríade clássica de segurança tem um correspondente exato em privacidade de comunicação.

| Propriedade | Em segurança clássica | Em privacidade | O que a quebra |
|---|---|---|---|
| **Confidencialidade** | Só quem deve, lê | Sigilo de conteúdo | Chave vaza, endpoint comprometido |
| **Integridade** | Só quem deve, altera | Autenticidade da identidade | Impersonação, MITM |
| **Disponibilidade** | Acesso quando se precisa | **Acesso ao serviço** | Censura, bloqueio de rede |

⚠ **A terceira linha é a mais relevante para jornalista e ativista, e a menos discutida.**
Disponibilidade em privacidade significa: **você consegue alcançar a rede Tor?** Em muitos países,
o Tor é bloqueado — e aí a questão deixa de ser anonimato e passa a ser **acesso**.

**É por isso que existe *pluggable transport*** (OBFS4, meek, Snowflake) — o assunto do Módulo 10.
O que ele resolve é **disponibilidade**, não anonimato.

| Se o seu adversário... | Então o seu problema é... |
|---|---|
| Lê tráfego local | Confidencialidade |
| Quer saber quem você é | Anonimato |
| **Bloqueia o acesso** | **Disponibilidade** |

⚠ **Confundir as três leva a escolher a ferramenta errada.** Uma ponte (`obfs4`) que resolve o
bloqueio **não** aumenta seu anonimato — ela te devolve acesso a uma rede que já te protegia.

---

## 1.6 LAB — Escreva o seu modelo de ameaça

**Duração:** 30 min

⚠ **Você é o sujeito deste exercício.** Não há terceiro, não há alvo, não há teste em sistema
alheio. Você escreve sobre a sua própria situação.

### Passo 1 — Responda as seis perguntas

Produza `modelo-ameaca.md`:

```markdown
## 1. O que eu quero proteger
[ ] O conteúdo de uma comunicação
[ ] A identidade de uma fonte
[ ] O ato de eu me comunicar (que eu falei com alguém)
[ ] A minha localização
[ ] A minha identidade ao acessar um serviço
[ ] Outro: ______

## 2. De quem
Nível (A1–A6): ____
Nome/descrição concreta:

## 3. O que o adversário ganha
Dano concreto se descobrir:

## 4. O que acontece se eu falhar
Consequência (reputação / físico / legal / profissional):

## 5. O que eu NÃO preciso proteger
(liste o que está fora do escopo — isto reduz o trabalho)

## 6. Adversário com alcance físico?
[ ] Sim  → software não resolve sozinho
[ ] Não
```

### Passo 2 — Mapeie o que cada ferramenta cobre

Preencha **para o seu modelo**, não em geral:

| Ferramenta | Cobre o meu item 1? | Contra o meu adversário? | Onde falha |
|---|---|---|---|
| HTTPS | | | |
| VPN | | | |
| Tor | | | |
| Tor Browser | | | |
| Cifra de ponta a ponta | | | |

⚠ **A coluna "onde falha" é o entregável.** Se você não sabe onde falha, você não modelou — você
escolheu uma ferramenta por fé. Os Módulos 7 a 9 vão responder as lacunas que você não souber
preencher agora.

### Passo 3 — Identifique a sua camada mais fraca

Das camadas do Módulo 2, marque:

| Camada | Está protegida hoje? | Como você sabe? |
|---|---|---|
| IP de origem | | |
| DNS | | |
| TLS (SNI) | | |
| Browser / fingerprint | | |
| Comportamento / horário | | |
| Metadado (assunto, contato) | | |

⚠ **"Como você sabe?" é obrigatório, e a resposta honesta provavelmente é "não sei".** Isso é o
ponto do exercício: você vai **medir** nos próximos módulos, e comparar com o que escreveu aqui.

### Passo 4 — Compare no final do curso

Guarde este arquivo. No Módulo 12, você vai refazê-lo **depois de medir** — e a diferença entre os
dois é o que o curso te deu. Se não houver diferença, você não mediu nada.

### Critérios de aceitação

- `modelo-ameaca.md` com as seis perguntas respondidas.
- Você **nomeou** o adversário com nível A1–A6 e descrição concreta — não "hackers".
- Você distinguiu, no item 1, conteúdo de **ato de comunicação** (são coisas diferentes).
- A tabela de ferramentas preenchida **para o seu modelo**, não em geral.
- A tabela de camadas tem a coluna "como você sabe" respondida honestamente.
- Você identificou **qual camada é a mais fraca no seu caso**.

---

## Avaliação

1. Por que "proteção excessiva" é um erro? Que consequência prática ela tem?
2. Diferencie sigilo de conteúdo e anonimato de origem, com um exemplo de cada combinação.
3. Por que "Tor até site HTTP puro" é anônimo mas não sigiloso? O que isso significa na prática?
4. Explique a diferença entre adversário A3 e A5. Qual ferramenta vence cada um?
5. Contra A5, o que vaza não é o conteúdo. O que é, e o que você faz a respeito?
6. Por que a pergunta "o que eu **não** preciso proteger" economiza esforço?
7. Cite os cinco erros de modelagem e a correção de cada um.
8. Aplique a tríade CIA a privacidade. Qual das três propriedades é a mais relevante para quem
   vive sob censura?
9. Por que pluggable transport resolve disponibilidade e **não** anonimato? Por que confundir os
   dois leva a escolher a ferramenta errada?
10. Por que "alcance físico" derrota software, e o que isso implica para o seu modelo?
11. Por que a coluna "como você sabe" é obrigatória na tabela de camadas?

---

**Próximo:** [Módulo 2 — Como a identidade vaza](modulo-02.md)
