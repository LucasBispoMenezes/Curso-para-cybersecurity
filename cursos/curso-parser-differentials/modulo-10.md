# Módulo 10 — Projeto: da Divergência ao Reporte

**Carga:** 2 horas
**Pré-requisitos:** Módulos 1 a 9

---

## O objetivo do módulo

**Um entregável:** um percurso completo de parser differential — **da carta de divergência ao
reporte**, com evidência e declaração de conduta.

⚠ **E o entregável não é o bypass.** É o **percurso**: **a carta, o corpus, a medição, a
classificação, e o destino.**

| Resultado | É projeto válido? |
|---|---|
| Achou uma discordância de categoria 3 | ✓✓ **Sim** |
| Achou só categoria 1 e 2 | ✓ Sim — **e você declara** |
| Achou uma divergência temporal | ✓ Sim |
| Achou a divergência entre camadas | ✓✓✓ **Exemplar** |
| Nada documentado | ⚠ **Não** |

⚠ **A segunda linha é a que a maioria trata como fracasso — e não é.** **Uma triagem que conclui "não
há violação de spec neste par" é resultado** — **e informa a escolha do próximo alvo.**

---

## ⚠ Nota de conduta

| Você faz | Você **não** faz |
|---|---|
| N implementações **no seu lab** | ⚠ Payload a **WAF de terceiro** |
| Compara processos **locais** | ⚠ Compara serviços em produção |
| **Mede** a discordância | ⚠ **Exaure o recurso** |
| **Reporta** ao mantenedor | Publica antes da correção |
| Escreve o **harness** | ⚠ **Escreve o bypass** |

⚠ **As duas linhas específicas deste curso:**
**o WAF** — mandar payload a um é acesso não autorizado, e o teste diferencial exige **N payloads**,
não um.
**a cadência** — contar **mensagens** é pesquisa; manter **conexões abertas** é exaustão, e é crime.

---

## 10.1 O que você vai produzir

```
projeto-parser-differentials/
├── 00-alvo.md             o par escolhido, com critério
├── 01-carta.md            a carta de divergência (módulo 2)
├── 02-lab.md              as N implementações, isoladas (módulo 4)
├── 03-corpus.md           o corpus de fronteira (módulo 5)
├── 04-harness.md          o harness, e o que ele NÃO faz
├── 05-medicao.md          as discordâncias medidas
├── 06-classificacao.md    a cascata aplicada (módulo 3)
├── 07-relatorio.md        O ENTREGÁVEL
├── 08-destinatarios.md    a quem reportar, em separado
└── 09-declaracao.md       conduta
```

⚠ **A ordem é a ordem do curso** — **e `01-carta.md` vem antes de qualquer execução.**

---

## 10.2 As fases

### Fase 1 — Alvo e carta (30 min)

**Produza `00-alvo.md`:**

```markdown
# O alvo

## 1. O par
| Item | Valor |
|---|---|
| Formato / protocolo | |
| Spec (URL / versão) | |
| Impl. A | |
| Impl. B | |
| (cadeia?) | proxy / WAF / servidor |

## 2. Por que este par
| Critério | Avaliação |
|---|---|
| formato com spec curta | |
| duas impl. maduras | |
| ⚠ propósitos diferentes? | |
| linguagens diferentes? | |
| fácil de subir | |

## 3. O que eu NÃO vou fazer
- [ ] não aponto para serviço de terceiro
- [ ] não testo WAF de produção
- [ ] não exaure recurso
- [ ] não construo o bypass
- [ ] não publico antes de reportar
```

**Produza `01-carta.md`:**

```markdown
# Carta de divergência (módulo 2)

## Do formato
| Item | Valor |
|---|---|
| Formato | |
| Spec | |
| Aderência esperada | |

## Os pontos
| # | O ponto | Tipo (1–7) | O que A faz | O que B faz | ⚠ Impacto | Prioridade |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |

## Os pontos de força fraca na spec
| # | Palavra / silêncio | Onde (seção) |
|---|---|---|
| 1 | | |
| 2 | | |

## A hipótese principal
| Campo | Valor |
|---|---|
| Afirmação | |
| Observação | |
| **Falsificação** | |

## ⚠ O que eu NÃO vou testar, e por quê
| Ponto | Por quê |
|---|---|
| | sem impacto |
| | `MUST` — todos seguem |
```

⚠ **A carta vem antes de qualquer execução.** **E a pergunta „o que eu NÃO vou testar“ é
obrigatória** — **porque é o filtro que distingue pesquisa de varredura.**

### Fase 2 — Lab e corpus (30 min)

**Produza `02-lab.md`:**

```markdown
# O lab (módulo 4)

## As implementações
| # | Nome | Linguagem | Propósito | Porta |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

## O isolamento
| Item | Valor |
|---|---|
| rodam em | 127.0.0.1 / container |
| rede de saída | ⚠ NENHUMA |
| apontam p/ terceiro? | ⚠ NÃO |
| teste de isolamento | [ ] feito — resultado: ____ |

## A verificação automática
```
o comando que procura URL externa:
grep -rnE 'https?://' *.py | grep -viE 'localhost|127\.0\.0\.1'
```
```
a saída: ____
```
```

**Produza `03-corpus.md`:**

```markdown
# Corpus de fronteira (módulo 5)

## Um caso por ponto
| # | Caso | Ponto (carta) | Tipo | Arquivo |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Os casos de controle
| # | Caso | Por que é controle |
|---|---|---|
| 1 | | todos devem concordar |

## Os valores de fronteira
| Ponto | limite-1 | limite | limite+1 |
|---|---|---|---|
| | | | |

## O caso ambíguo
| Item | Valor |
|---|---|
| A entrada | |
| As duas leituras | |
| Por que ambas são defensáveis | |

## ⚠ O mapa
| Caso | Ponto | Seção da spec |
|---|---|---|
| | | |
```

### Fase 3 — Medição e classificação (35 min)

**Produza `04-harness.md`:**

```markdown
# O harness (módulo 5)

## As quatro garantias
| Garantia | Como implementei |
|---|---|
| não trava | |
| não derruba | |
| não inunda | |
| não mente | |

## O normalizador
| O que normalizo | O que NÃO normalizo |
|---|---|
| | |

## ⚠ O que o harness NÃO faz
| Item | Onde fica |
|---|---|
| classificar | ⚠ módulo 3 |
| julgar se é bug | ⚠ módulo 3 |
| reportar | este projeto |
```

**Produza `05-medicao.md`:**

```markdown
# A medição

## O resultado bruto
| # | Entrada | Impl A | Impl B | Discordam? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## A proporção
| Métrica | Valor |
|---|---|
| entradas | |
| discordâncias | |
| proporção | |

## A evidência literal
```
o comando
```
```
a saída
```
```

**Produza `06-classificacao.md`:**

```markdown
# A classificação (módulo 3)

## A cascata, por discordância
| # | Entrada | Q1 spec decide? | Q2 as duas seguem? | Q3 quais violam? | Categoria |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## As cinco perguntas (só para categoria 3)
| # | Alcançável? | Camada normaliza? | Impacto? | ⚠ Pode ser explorado? |
|---|---|---|---|---|
| 1 | | | | |

## A consequência objetiva
| # | Discordância sobre | Consequência | Habilita |
|---|---|---|---|
| 1 | | | |

## As três críticas (framing, módulo 6.4)
| # | Sobram bytes? | Viram mensagem? | Caminho entre camadas? |
|---|---|---|---|
| 1 | | | |

## ⚠ Os falsos positivos que eu quase reportei
| # | Falso positivo | Qual pergunta o eliminou |
|---|---|---|
| 1 | | |
| 2 | | |
```

### Fase 4 — O relatório (15 min)

**Produza `07-relatorio.md`** com as **dez** seções:

```markdown
# Relatório — parser differential

## 1. Identificação
| Item | Valor |
|---|---|
| Formato / componente | |
| Versões | |
| Spec e seção | |

## 2. O par e o isolamento
| Item | Impl A | Impl B |
|---|---|---|
| versão | | |
| origem | | |
| ⚠ local? | | |

## 3. A carta e o corpus
| Item | Valor |
|---|---|
| pontos na carta | |
| casos no corpus | |
| caso de controle | |

## 4. A medição
| Item | Valor |
|---|---|
| entradas | |
| discordâncias | |

## 5. A classificação
| # | Discordância | Categoria | Consequência |
|---|---|---|---|
| 1 | | | |

## 6. A evidência literal
```
comando
```
```
saída
```

## 7. ⚠ O que isso prova, e o que NÃO prova
**Prova:**
- as implementações discordam no caso X
- a discordância é sobre Y

**NÃO prova:**
- que é explorável
- o impacto real
- que existe em produção
- que outra camada não rejeita

## 8. ⚠ O que eu NÃO fiz
- [ ] não apontei para terceiro
- [ ] não testei WAF de produção
- [ ] não exaurei recurso
- [ ] não construí o bypass
- [ ] não calculei severidade

## 9. O que o mantenedor precisa confirmar
| # | Item |
|---|---|
| 1 | o arranjo existe em produção? |
| 2 | outra camada rejeita? |

## 10. O padrão, para o ecossistema
"[sem nomes — a pergunta]"
```

### Fase 5 — Destinatários e conduta (10 min)

**Produza `08-destinatarios.md`:**

```markdown
# Destinatários

## Os achados e seus donos
| # | Achado | Categoria | Destinatário | ⚠ Não mencionar |
|---|---|---|---|---|
| 1 | | | | |

## Por achado, o que NÃO mencionar
| Destinatário | O que NÃO dizer |
|---|---|
| o proxy | ⚠ o comportamento do servidor |
| o servidor | ⚠ o comportamento do proxy |
| o WAF | ⚠ o backend |

## A spec como destinatário
| Situação | Reportar à spec? |
|---|---|
| a spec omite um caso | ⚠ sim |
| a spec é ambígua | ⚠ sim |
| a spec decide, e um viola | não |

## O timing
| Item | Valor |
|---|---|
| prazo | o do mais lento |
| ⚠ publicar antes? | NÃO |
| crédito | a todos que confirmarem |
```

**Produza `09-declaracao.md`:**

```markdown
# Declaração de conduta

## O laboratório
| Item | Valor |
|---|---|
| as implementações | baixadas e compiladas por mim |
| onde rodam | 127.0.0.1 / container isolado |
| rede de saída | NENHUMA |
| teste de isolamento | feito — o `curl` FALHOU |

## Declaro que
- [ ] não enviei payload a nenhum serviço de terceiro
- [ ] não testei WAF ou CDN de produção
- [ ] não mantive conexões abertas para exaurir
- [ ] não construí o bypass nem o exploit
- [ ] não usei credencial encontrada
- [ ] não publiquei nada antes de reportar
- [ ] declarei o que NÃO verifiquei
- [ ] reporto a cada dono, sem mencionar os outros

## E declaro que ENTENDO que
- [ ] um payload a um WAF de terceiro é acesso não autorizado
- [ ] a cadência lenta contra terceiro é exaustão — e crime
- [ ] medir a divergência e explorá-la são coisas diferentes

Data: ____
```

---

## 10.3 A rubrica

| # | Item | Peso |
|---|---|---|
| 1 | **Carta de divergência** com pontos e prioridades | 15% |
| 2 | **Lab isolado**, com verificação automática | 10% |
| 3 | **Corpus de fronteira**, um caso por ponto | 10% |
| 4 | **Harness** com as quatro garantias | 10% |
| 5 | **Medição** com a proporção | 10% |
| 6 | ⚠ **Classificação pela cascata** | 20% |
| 7 | **Evidência literal** | 10% |
| 8 | **Destinatários separados** | 5% |
| 9 | **O que não fiz** (4+ itens) | 5% |
| 10 | **Declaração de conduta** | 5% |

**Penalidades automáticas:**

- Apontou para serviço de terceiro: **projeto zerado**.
- Testou WAF de produção: **projeto zerado**.
- Exauriu recurso: **projeto zerado**.
- Construiu o bypass: **projeto zerado**.
- Corpus aleatório, sem carta: −25%.
- Classificação sem a cascata: −20%.
- Sem evidência literal: −15%.
- "Não fiz" ausente: −10%.

---

## 10.4 Roteiro

| Bloco | Duração | O que fazer |
|---|---|---|
| 1 | 30 min | Alvo e carta |
| 2 | 30 min | Lab e corpus |
| 3 | 35 min | Medição e classificação |
| 4 | 15 min | Relatório |
| 5 | 10 min | Destinatários e declaração |

⚠ **Resista à tentação de pular a carta.** **Sem ela, o corpus é aleatório — e o método vira
fuzzing.**

---

## 10.5 Critérios de aceitação

- `00-alvo.md` com o par e o critério, e o que **não** fazer.
- `01-carta.md` com **pelo menos quatro** pontos e a prioridade.
- Você citou **os pontos de força fraca da spec** — com a seção.
- A hipótese tem **critério de falsificação**.
- Você listou **o que não vai testar, e por quê**.
- `02-lab.md` com **pelo menos duas** implementações locais.
- A **verificação automática** de URL externa rodou, com a saída.
- O **teste de isolamento** foi feito, com resultado.
- `03-corpus.md` com **um caso por ponto** e o **mapa**.
- Você identificou o **caso de controle** e explicou por que existe.
- Você incluiu os **valores de fronteira** (limite − 1, limite, limite + 1).
- Você identificou o **caso ambíguo** e as duas leituras.
- `04-harness.md` com as **quatro** garantias.
- Você explicou **o que o harness não faz**.
- `05-medicao.md` com a **proporção** e a **evidência literal**.
- `06-classificacao.md` com a **cascata** aplicada a cada discordância.
- Você aplicou as **cinco perguntas** à categoria 3.
- Você identificou **as três críticas** do framing.
- Você citou **pelo menos um** falso positivo que quase reportou.
- `07-relatorio.md` com as **dez** seções, incluindo **o que prova e o que não prova**.
- Seção "não fiz" com **cinco itens** mínimos.
- `08-destinatarios.md` com **o que não mencionar** a cada um.
- `09-declaracao.md` com **todas** as caixas.
- ⚠ **Nenhum serviço de terceiro.** Nenhum bypass construído.

---

## Avaliação final

1. **Por que o entregável é o percurso**, e não o bypass?
2. **Por que "não achou categoria 3" é resultado válido?**
3. **Por que a carta vem antes do corpus?**
4. **O que é um corpus de fronteira?** E o que ele não é?
5. **Por que o caso de controle é obrigatório?**
6. **O que é o caso ambíguo?** Por que ele importa?
7. **Cite os sete tipos de ponto** de divergência.
8. **Cite as quatro garantias** do harness.
9. **Qual é a garantia que evita falsos positivos?**
10. **O que o harness não faz?** Cite quatro coisas.
11. **Qual é o critério de normalização?**
12. **Cite as três categorias** e o destino de cada.
13. **Por que a categoria 2 é a armadilha?**
14. **Por que a categoria 3 não exige culpado?**
15. **O que é consequência objetiva?** Cite três exemplos.
16. **Quais três perguntas são críticas** no framing?
17. **Por que "pode ser explorado" não autoriza nada?**
18. **Quantos destinatários** um achado entre camadas tem?
19. **O que não mencionar** a cada um? Por quê?
20. **Quando a spec é destinatária?** Por quê?

---

## Encerramento do curso

Você começou com "duas implementações discordam", e terminou com um percurso completo: carta,
corpus, medição, classificação e reporte.

O que você aprendeu não foi uma ferramenta — **e não foi um bypass.** Foi **o critério** que
transforma uma diferença em achado.

| # | O que fica |
|---|---|
| 1 | **A spec deixa espaços em aberto** — e é onde a divergência nasce. |
| 2 | **Divergência é observação; bug é conclusão** — e exige critério. |
| 3 | **A consequência objetiva resolve a dúvida:** sobram bytes? |
| 4 | **Framing é o caso cujo efeito não se discute.** |
| 5 | **A ferramenta detecta; você julga.** A automação para na detecção. |
| 6 | **A divergência é estrutural** — existe em produtos maduros. |
| 7 | **O tempo também é entrada**, quando a implementação o usa para decidir. |

⚠ **E a ponte para o próximo curso. Este é o módulo 10 do Patch Diffing levado ao osso** — **e ele
alimenta dois dos que faltam:**

| Curso | O que ele faz com este método |
|---|---|
| **HTTP Smuggling e Camada** | O módulo 6, aprofundado — o framing como ataque |
| **Fuzzing Avançado** | O harness do módulo 5, com guia |
| **Detecção e Evasão** | O módulo 8, do lado do detector |
| **Side-Channel na Prática** | A cadência (módulo 9), como canal |

**O que você aprendeu aqui não muda de curso para curso.** **O que muda é o alvo.**

Referências para continuar: **HTTP Garden** · **WAFFLED** · **HTTP/1.1 Must Die: The Smuggler's
Guide (2025)** · **Bypassing WAFs: Parser Differentials (Sicuranext)** · **USENIX "Parser
Differentials"** · **RFC 9110 / 9112** · **RFC 7230 §3.5** · **`h11`** · **`h2`** · **`smuggler`** ·
**PortSwigger Research — HTTP/2**
