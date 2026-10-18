# Módulo 12 — Projeto: Do Fuzz ao Reporte

**Carga:** 2 horas
**Pré-requisitos:** Módulos 1 a 11

---

## O objetivo do módulo

**Um entregável:** uma campanha completa — **do alvo escolhido por critério ao crash triado e
reportado**, com reproducer, taxa e rendimento.

⚠ **E o entregável não é o crash.** É o **percurso**: **o alvo, o harness, o corpus, o oráculo, a
triagem e o rendimento.**

| Resultado | É projeto válido? |
|---|---|
| Achou um bug e o reportou | ✓✓ **Sim** |
| Achou e **triou corretamente** | ✓✓✓ **Exemplar** |
| Rodou e **não achou** — com o diagnóstico | ✓ **Sim** |
| ⚠ **200 crashes, nenhum triado** | ⚠ **Não** |
| "Rodei 72 horas" | ⚠ **Não** |

⚠ **A terceira linha é a que a maioria trata como fracasso — e não é.** **Uma campanha com
diagnóstico — "o alvo saturou por causa do corpus, e o harness filtrava" — é resultado.**

---

## ⚠ Nota de conduta

| Você faz | Você **não** faz |
|---|---|
| Fuzza **seu** código, ou aberto, no lab | ⚠ Fuzza serviço de terceiro |
| Roda N cores **na sua máquina** | ⚠ Roda contra alvo remoto |
| **Reporta** com reproducer | ⚠ Publica antes da correção |
| Minimiza a entrada | ⚠ Abre issue com entrada de 4 KB |
| Mede o rendimento | ⚠ Reporta horas como resultado |

⚠ **A linha específica deste curso:** **o fuzzer manda **milhares** de entradas por segundo.** **Contra
terceiro, isso é indistinguível de ataque — e o volume é, por si, uma interrupção.**

---

## 12.1 O que você vai produzir

```
projeto-fuzzing/
├── 00-alvo.md             o alvo, por critério
├── 01-harness.md          o ponto de entrada
├── 02-corpus.md           as sementes, e o mapa
├── 03-oraculo.md          o que conta como bug
├── 04-campanha.md         a execução, e o diagnóstico
├── 05-dedup.md            os grupos distintos
├── 06-triagem.md          o que é e o que não é bug
├── 07-reproducer.md       a entrada mínima
├── 08-rendimento.md       a conta
├── 09-relatorio.md        O ENTREGÁVEL
└── 10-declaracao.md       conduta
```

⚠ **A ordem é a ordem do curso** — **e `06-triagem.md` é o item de maior peso.**

---

## 12.2 As fases

### Fase 1 — Alvo, harness e corpus (30 min)

**Produza `00-alvo.md`:**

```markdown
# O alvo

## 1. Identificação
| Item | Valor |
|---|---|
| o que é | |
| de onde veio | |
| versão | |
| licença | |

## 2. Por que este alvo
| Critério | Avaliação |
|---|---|
| entrada ESTRUTURADA | |
| já teve bugs | |
| complexidade | |
| harness possível | |
| ⚠ NÃO é serviço de rede | |

## 3. A superfície
| # | Campo | Tipo | Fronteira |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 4. O que eu NÃO vou fazer
- [ ] não fuzzar nada pela rede
- [ ] não apontar para terceiro
- [ ] não reportar sem reproducer mínimo
- [ ] não publicar antes da correção
```

**Produza `01-harness.md`:**

```markdown
# O harness

## 1. A função fuzzada
| Item | Valor |
|---|---|
| função | |
| ⚠ é a mais PROFUNDA que aceita bytes? | |

## 2. O harness
```c
[cole]
```

## 3. ⚠ O que ele NÃO faz
| Item | Confirma? |
|---|---|
| não valida antes de passar | [ ] |
| não filtra o inválido | [ ] |
| não aborta em erro esperado | [ ] |

## 4. A performance
| Item | Valor |
|---|---|
| exec/s | |
| inicializa onde | fora do caminho quente |

## 5. Os falsos crashes
| Item | Valor |
|---|---|
| o harness aborta em erro? | |
| quantos falsos ele geraria | |
```

**Produza `02-corpus.md`:**

```markdown
# O corpus

## As sementes
| # | Semente | Testa | O que exercita |
|---|---|---|---|
| | | | |

## As interações
| Semente | Campos cruzados |
|---|---|
| | |

## O mapa
| Semente | Ramo |
|---|---|
| | |

## A medição do efeito
| Corpus | cov | último NEW |
|---|---|---|
| vazio | | |
| fronteira | | |
```

### Fase 2 — Oráculo e campanha (30 min)

**Produza `03-oraculo.md`:**

```markdown
# O oráculo

## Os oráculos em uso
| # | Oráculo | O que detecta |
|---|---|---|
| 1 | sanitizer | memória |
| 2 | | |
| 3 | | |

## Os invariantes
| Tipo | Invariante | O que pega |
|---|---|---|
| universal | lidos <= size | qualquer parser |
| universal | determinismo | estado escondido |
| ⚠ específico | | este formato |

## ⚠ O que o oráculo NÃO pega
| Item | Por quê |
|---|---|
| | |
```

**Produza `04-campanha.md`:**

```markdown
# A campanha

## A execução
| Item | Valor |
|---|---|
| fuzzer | |
| corpus | |
| tempo | |
| núcleos | |

## O diagnóstico
| Sintoma | Presente? | Elemento |
|---|---|---|
| "NEW" parou cedo | | corpus |
| exec/s baixo | | harness |
| cov estável | | alvo |

## ⚠ O que a campanha NÃO achou
| Item | Por quê |
|---|---|
| | |
```

### Fase 3 — Triagem e reproducer (35 min)

**Produza `05-dedup.md`:**

```markdown
# A deduplicação

## Os números
| Estágio | Quantidade |
|---|---|
| crashes brutos | |
| após dedup por traço | |
| ⚠ bugs distintos | |

## Os grupos
| # | Assinatura | Ocorrências |
|---|---|---|
| | | |
```

**Produza `06-triagem.md`:**

```markdown
# A triagem

## As três perguntas, por grupo
| # | traço do alvo? | o alvo decidiu? | corrigido? | ⚠ veredito |
|---|---|---|---|---|
| | | | | |

## ⚠ O que NÃO é bug
| # | O que | Por quê |
|---|---|---|
| 1 | | |
| 2 | | |

## O mecanismo do bug
| Item | Valor |
|---|---|
| o que o alvo faz | |
| o que DEVERIA fazer | |
| ⚠ onde está no código | |
```

**Produza `07-reproducer.md`:**

```markdown
# O reproducer

## A entrada
| Item | Valor |
|---|---|
| original | |
| ⚠ mínimo | |
| hex | |

## A reprodução
```
o comando
```
```
a saída literal
```

## A versão
| Item | Valor |
|---|---|
| versão testada | |
| ⚠ ainda existe na atual? | |

## O determinismo
| Item | Valor |
|---|---|
| reproduz sempre? | |
| taxa | |
```

### Fase 4 — Rendimento e relatório (15 min)

**Produza `08-rendimento.md`:**

```markdown
# O rendimento

## O tempo, por etapa
| Etapa | Horas |
|---|---|
| alvo | |
| harness | |
| corpus | |
| rodar | ⚠ 0 |
| TRIAR | |
| reportar | |
| **TOTAL** | |

## O rendimento
| Item | Valor |
|---|---|
| bugs triados | |
| horas de analista | |
| ⚠ bugs / hora | |
| veredito | |

## ⚠ O próximo investimento
| Eixo | Ganho esperado |
|---|---|
| | |
```

**Produza `09-relatorio.md`** com as **doze** seções:

```markdown
# Relatório — campanha de fuzzing

## 1. Identificação
| Item | Valor |
|---|---|
| alvo e versão | |
| o bug | |

## 2. O alvo e a superfície
| # | Campo | Fronteira |
|---|---|---|
| | | |

## 3. O harness
| Item | Valor |
|---|---|
| função fuzzada | |
| exec/s | |
| ⚠ o que ele NÃO faz | |

## 4. O corpus
| Item | Valor |
|---|---|
| sementes | |
| ⚠ o mapa | |

## 5. ⚠ O oráculo
| # | Oráculo | O que detectou |
|---|---|---|
| | | |

## 6. A campanha
| Item | Valor |
|---|---|
| tempo | |
| crashes brutos | |
| ⚠ grupos | |

## 7. O reproducer
```
o comando
```
```
a saída do sanitizer
```
```
a entrada mínima (hex)
```

## 8. ⚠ O que isso prova, e o que NÃO prova
**Prova:**
- que a entrada X causa o erro Y na versão Z

**NÃO prova:**
- que é EXPLORÁVEL
- a SEVERIDADE
- que afeta PRODUÇÃO
- que é o único bug

## 9. O rendimento
| Item | Valor |
|---|---|
| bugs triados | |
| horas de analista | |
| bugs / hora | |

## 10. ⚠ O que eu NÃO fiz
- [ ] não fuzzei nada pela rede
- [ ] não apontei para alvo de terceiro
- [ ] não reportei sem reproducer mínimo
- [ ] não publiquei antes da correção
- [ ] não usei o crash para explorar
- [ ] não calculei severidade

## 11. O que o mantenedor confirma
| # | Item |
|---|---|
| 1 | a versão afetada |
| 2 | ⚠ a severidade |

## 12. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `10-declaracao.md`:**

```markdown
# Declaração de conduta

## O laboratório
| Item | Valor |
|---|---|
| o alvo | ⚠ código meu, ou aberto, compilado por mim |
| onde rodou | a minha máquina |
| ⚠ rede | NENHUMA |
| a entrada | nunca enviada a terceiro |

## Declaro que
- [ ] não fuzzei nenhum serviço pela rede
- [ ] não apontei o fuzzer para alvo de terceiro
- [ ] não reportei sem reproducer mínimo
- [ ] não publiquei antes da correção
- [ ] não usei o crash para explorar nada
- [ ] não calculei severidade sem contexto
- [ ] declarei o que NÃO verifiquei

## E declaro que ENTENDO que
- [ ] o fuzzing manda MILHARES de entradas por segundo
- [ ] contra terceiro, isso é indistinguível de ataque
- [ ] o volume é, por si, uma interrupção
- [ ] achado reportado e achado explorado são coisas diferentes

Data: ____
```

---

## 12.3 A rubrica

| # | Item | Peso |
|---|---|---|
| 1 | **Alvo** com critério e superfície | 10% |
| 2 | **Harness** correto, com exec/s | 15% |
| 3 | **Corpus** com mapa e interações | 10% |
| 4 | ⚠ **Oráculo** — além do crash | 15% |
| 5 | **Campanha** com diagnóstico | 10% |
| 6 | ⚠ **Triagem** — dedup e veredito | 20% |
| 7 | **Reproducer mínimo** | 10% |
| 8 | **Rendimento** calculado | 5% |
| 9 | **Relatório** com o que não prova | 5% |

**Penalidades automáticas:**

- Fuzzou serviço de terceiro: **projeto zerado**.
- Reportou sem reproducer mínimo: −30%.
- Crashes sem deduplicar: −25%.
- Sem o oráculo além do crash: −15%.
- Sem o rendimento: −10%.
- "Não fiz" ausente: −10%.
- Reportou horas de CPU como resultado: −10%.

---

## 12.4 Roteiro

| Bloco | Duração | O que fazer |
|---|---|---|
| 1 | 30 min | Alvo, harness e corpus |
| 2 | 30 min | Oráculo e campanha |
| 3 | 35 min | Triagem e reproducer |
| 4 | 15 min | Rendimento e relatório |

⚠ **Resista à tentação de rodar a campanha antes do corpus.** **O corpus é o que faz a campanha
chegar ao código** — **e sem ele as horas são gastas no parser.**

---

## 12.5 Critérios de aceitação

- `00-alvo.md` com o critério e a **superfície**, e o que não fazer.
- `01-harness.md` com o harness **que não valida**, e o **exec/s** medido.
- Você verificou **que não há falso crash** por `abort`.
- `02-corpus.md` com **um caso por ponto** e as **interações**.
- O **mapa** ligando semente a ramo.
- A **medição do efeito** do corpus (vazio × fronteira).
- `03-oraculo.md` com **pelo menos dois** oráculos além do crash.
- Você escreveu **um invariante específico** do formato.
- Você declarou **o que o oráculo não pega**.
- `04-campanha.md` com a execução e o **diagnóstico**.
- Você identificou **o elemento culpado** se a cobertura saturou.
- `05-dedup.md` com os números **brutos × grupos**.
- A **redução de ordem de magnitude** medida.
- `06-triagem.md` com **as três perguntas** por grupo.
- Você listou **o que não é bug**, com a razão.
- Você identificou **o mecanismo** do bug, no código.
- `07-reproducer.md` com a **entrada mínima em hex** e a **saída literal**.
- Você declarou **o determinismo**.
- `08-rendimento.md` com a conta e o veredito.
- `09-relatorio.md` com as **doze** seções.
- Você escreveu **o que prova e o que não prova**.
- `10-declaracao.md` com **todas** as caixas.
- ⚠ **Nenhum fuzz pela rede.** Nenhum reporte sem reproducer.

---

## Avaliação final

1. **Por que o entregável é o percurso, e não o crash?
2. **Por que "não achou, com diagnóstico" é resultado válido?
3. **Por que o corpus vem antes da campanha?
4. **O que o harness não pode fazer?
5. **Por que o exec/s importa?
6. **O que o mapa do corpus declara?
7. **O que as interações de fronteira exercitam?
8. **Por que o oráculo além do crash é obrigatório?
9. **O que o invariante específico acrescenta?
10. **O que o diagnóstico da campanha revela?
11. **Quantos crashes brutos viram quantos bugs?
12. **Por que a dedup é por traço?
13. **Quais são as três perguntas da triagem?
14. **O que não é bug?** Cite quatro.
15. **Por que o reproducer precisa ser mínimo?
16. **O que o reproducer prova?
17. **O que ele NÃO prova?
18. **Como se calcula o rendimento?** Em que unidade?
19. **Qual o próximo investimento?** Por quê?
20. **O que a declaração de conduta precisa deixar claro?**

---

## Encerramento do curso

Você começou com "o fuzzer é a parte fácil", e terminou com uma campanha completa: alvo, harness,
corpus, oráculo, triagem, reproducer e rendimento.

O que você aprendeu não foi rodar uma ferramenta — **e não foi achar um crash.** Foi **medir**, e
**triar**.

| # | O que fica |
|---|---|
| 1 | **O fuzzer é a parte fácil** — o trabalho é o corpus, o harness, o oráculo e a triagem. |
| 2 | **CPU é alugável; julgamento não.** |
| 3 | **A assinatura envelhece; a gramática não.** |
| 4 | **Crash não é bug; traço é.** |
| 5 | **O reproducer é o achado.** |
| 6 | **O rendimento é bugs por hora de analista** — não horas de CPU. |
| 7 | **Antes de adicionar um núcleo, pergunte o que vai triar.** |

⚠ **E a linha deste curso:**

> **O fuzzer manda milhares de entradas por segundo.** **Contra terceiro, isso é indistinguível de
> ataque** — **e o volume é, por si, uma interrupção.** **Todo o curso roda local.**

---

## Fechamento da trilha

Com este curso, **os sete estão completos.**

| # | Curso | Papel na trilha |
|---|---|---|
| 1 | **Pesquisa em Segurança** | O método e o critério |
| 2 | **Análise Diferencial de Patch** | Ler o rastro do bug |
| 3 | **Parser Differentials** | O critério de divergência |
| 4 | **HTTP Smuggling e Camada** | O framing como ataque |
| 5 | **Exploit Development** | A primitiva |
| 6 | **Detecção e Evasão** | O outro lado |
| 7 | ⚠ **Fuzzing Avançado** | ⚠ **A busca** |

⚠ **E o que costura os sete:** **o critério antes da ferramenta.** **O Parser Differentials deu o
critério da divergência; o Detecção e Evasão, o do custo; e este, o da triagem.**

**O que muda de curso para curso é o alvo.** **O método é o mesmo.**

Referências para continuar: **AFL++** · **LibFuzzer** · **`honggfuzz`** · **`1dFuzz` (ACM
3597926)** · **Nyx** · **`kkAFL`** · **Oss-Fuzz** · **"The Fuzzing Book"** · **Nautilus /
Grammarinator** · **ASan / MSan / UBSan** · **Google Project Zero**
