# Módulo 11 — Projeto: Do Desync ao Reporte

**Carga:** 2 horas
**Pré-requisitos:** Módulos 1 a 10

---

## O objetivo do módulo

**Um entregável:** um percurso completo de request smuggling — **da carta de variantes ao reporte**,
com evidência e declaração de conduta.

⚠ **E o entregável não é o exploit.** É o **percurso**: **a carta, o lab, a varredura, a medida, a
classificação e o destino.**

| Resultado | É projeto válido? |
|---|---|
| Achou um desync e mediu | ✓✓ **Sim** |
| Varreu tudo e não achou | ✓ Sim — **e você declara** |
| Achou um indeterminado | ✓ Sim — **e você o perseguiu** |
| Achou o H2→H1 | ✓✓✓ **Exemplar** |
| Achou o envenenamento de cache | ✓✓✓ **Exemplar** |
| Nada documentado | ⚠ **Não** |

⚠ **A segunda linha é a que a maioria trata como fracasso — e não é.** **Uma varredura completa que
conclui "esta cadeia não divergiu nas faixas testadas" é resultado** — **e informa a escolha do
próximo alvo.**

---

## ⚠ Nota de conduta

| Você faz | Você **não** faz |
|---|---|
| N camadas **no seu lab** | ⚠ Camadas de terceiro |
| Mede o desync **em 127.0.0.1** | ⚠ Mede em produção alheia |
| **Reporta** ao mantenedor | Publica antes da correção |
| Descreve o impacto | ⚠ **Executa o acesso** |
| Lê a config | ⚠ Testa CDN, WAF ou proxy alheio |

⚠ **As três linhas específicas deste curso:**
**o payload** — um smuggler funcional contra terceiro é crime **consumado**; não há "acesso
indevido sem intenção".
**a cadência** — contar mensagens é pesquisa; manter conexões é exaustão.
**a página do client-side** — apontá-la para fora, ou induzir alguém a abri-la, é **CSRF** — crime
autônomo.

---

## 11.1 O que você vai produzir

```
projeto-smuggling/
├── 00-alvo.md             a cadeia escolhida, com critério
├── 01-carta.md            a carta de variantes (módulo 9)
├── 02-lab.md              as camadas, isoladas (módulo 5)
├── 03-descarte.md         o que não se aplica, e por quê
├── 04-varredura.md        a varredura por prioridade
├── 05-medicao.md          as quatro saídas, por variante
├── 06-classificacao.md    a cascata aplicada
├── 07-relatorio.md        O ENTREGÁVEL
├── 08-destinatarios.md    a quem reportar, em separado
├── 09-defesa.md           a recomendação (módulo 10)
└── 10-declaracao.md       conduta
```

⚠ **A ordem é a ordem do curso** — **e `01-carta.md` vem antes de qualquer execução.**

---

## 11.2 As fases

### Fase 1 — Alvo e carta (30 min)

**Produza `00-alvo.md`:**

```markdown
# O alvo

## 1. A cadeia
| Camada | Produto | Versão | ⚠ O que ENTREGA |
|---|---|---|---|
| | | | |
| | | | |

## 2. Por que esta cadeia
| Critério | Avaliação |
|---|---|
| duas camadas que podem discordar | |
| config legível | |
| ⚠ backend que LOGA | |
| roda em container/127.0.0.1 | |
| ⚠ não é CDN nem serviço de terceiro | |

## 3. O que eu NÃO vou fazer
- [ ] não aponto para CDN, WAF ou host de terceiro
- [ ] não testo em produção
- [ ] não uso o desync para ACESSAR nada
- [ ] não induzo outra pessoa a abrir página
- [ ] não publico antes de reportar
```

**Produza `01-carta.md`:**

```markdown
# Carta de variantes (módulo 9)

## As dez variantes
| # | Variante | Exige | ⚠ A cadeia tem? | Prioridade |
|---|---|---|---|---|
| 1 | espaço no valor | nada | | 1 |
| 2 | espaço antes do : | nada | | 2 |
| 3 | CL.TE | dois headers | | 3 |
| 4 | TE.CL | dois headers | | 4 |
| 5 | TE.TE | parser tolerante | | 5 |
| 6 | CL.CL | não rejeitar | | 6 |
| 7 | obs-fold | parser antigo | | 7 |
| 8 | CL.0 | endpoint que não lê | | 8 |
| 9 | H2 → H1 | conversão | | 9 |
| 10 | client-side | navegador | | 10 |

## A hipótese principal
| Campo | Valor |
|---|---|
| Afirmação | |
| Observação | |
| ⚠ Falsificação | |

## ⚠ O que eu NÃO vou testar, e por quê
| Variante | Por quê |
|---|---|
| | a cadeia não tem a condição |
| | exige infraestrutura que não tenho |
| | ⚠ fora do escopo autorizado |
```

⚠ **A carta vem antes de qualquer execução** — **e a pergunta "o que eu não vou testar" é
obrigatória.** **Sem ela, a varredura não tem fim.**

### Fase 2 — Lab e descarte (25 min)

**Produza `02-lab.md`:**

```markdown
# O lab (módulos 5 e 6)

## As camadas
| Camada | Produto | Versão | Porta | Config |
|---|---|---|---|---|
| frontend | | | 127.0.0.1:____ | |
| backend | | | 127.0.0.1:____ | |

## O isolamento
| Item | Valor |
|---|---|
| escuta em | 127.0.0.1 |
| rede de saída | ⚠ NENHUMA |
| teste que falha | [ ] feito — resultado: ____ |
| ⚠ terceiros | **NENHUM** |

## A instrumentação
| Camada | O que loga |
|---|---|
| frontend | |
| backend | ⚠ path, headers, corpo, CONTAGEM |

## As condições (módulo 2)
| # | Condição | Resultado |
|---|---|---|
| 1 | conexão persistente | |
| 2 | camadas que discordam | |
| 3 | ⚠ A repassa o original | |
```

**Produza `03-descarte.md`:**

```markdown
# O que não se aplica

| # | Variante | Por quê não se aplica |
|---|---|---|
| | | |

## E o que eu NÃO SEI se aplica
| Variante | Como descobrir |
|---|---|
| H2 → H1 | ⚠ ler a config: `http2` na frente? |
| CL.0 | ⚠ ver se o endpoint responde antes de ler |
```

### Fase 3 — Varredura e medida (35 min)

**Produza `04-varredura.md`:**

```markdown
# A varredura (módulo 9)

## Por prioridade
| Prio | Variante | Testada | Saída | ⚠ Desync? |
|---|---|---|---|---|
| 1 | espaço no valor | | | |
| 1 | espaço antes do : | | | |
| 2 | CL.TE | | | |
| 2 | TE.CL | | | |
| 3 | TE.TE | | | |
| 3 | CL.CL | | | |
| 3 | obs-fold | | | |

## ⚠ Os indeterminados, e o que fiz
| Variante | Primeira saída | Reconfirmei? | Resultado |
|---|---|---|---|
| | | | |

## O veredito da faixa 1–3
| Item | Valor |
|---|---|
| variantes testadas | |
| ⚠ desync | |
| rejeitadas | |
| indeterminadas | |
| sem efeito | |
```

**Produza `05-medicao.md`:**

```markdown
# A medida (módulo 5)

## As três medidas, por variante
| Variante | Contagem | ⚠ Marca apareceu | Resposta | ⚠ SAÍDA |
|---|---|---|---|---|
| | | | | |

## ⚠ A prova literal
```
[a string que eu escrevi no pedido escondido]
```

## O log do backend
```
[cole]
```

## O log do frontend
```
[cole]
```
```

⚠ **A marca é a prova mais forte** — **porque é a string que você escreveu aparecendo onde não
devia.** **E ela não depende de interpretação.**

### Fase 4 — Classificação e relatório (20 min)

**Produza `06-classificacao.md`:**

```markdown
# A classificação (Parser Differentials, módulo 3)

## A cascata
| # | Caso | Q1 spec decide? | Q2 as duas seguem? | ⚠ Categoria |
|---|---|---|---|---|
| 1 | | | | |

## As três perguntas críticas (framing)
| # | Sobram bytes? | Viram mensagem? | ⚠ Caminho entre as camadas? |
|---|---|---|---|
| 1 | | | |

## O invariante violado
| Item | Valor |
|---|---|
| o invariante | |
| como foi violado | |

## ⚠ Os falsos positivos que eu quase reportei
| # | Falso positivo | O que o eliminou |
|---|---|---|
| 1 | | |
```

**Produza `07-relatorio.md`** com as **doze** seções:

```markdown
# Relatório — request smuggling

## 1. Identificação
| Item | Valor |
|---|---|
| a cadeia | |
| as versões | |
| a variante | |

## 2. O isolamento
| Item | Valor |
|---|---|
| endereços | 127.0.0.1 |
| ⚠ terceiros | **NENHUM** |
| teste que falha | |

## 3. A carta e o descarte
| Item | Valor |
|---|---|
| variantes testadas | |
| variantes descartadas | |
| por quê | |

## 4. O payload (bytes literais)
```
[hex ou repr]
```

## 5. A medida
| Variante | Contagem | Marca | Resposta | Saída |
|---|---|---|---|---|
| | | | | |

## 6. A evidência literal
```
[frontend]
```
```
[backend]
```

## 7. A reprodutibilidade
| Item | Valor |
|---|---|
| reproduz sempre? | |
| quantas tentativas | |
| ⚠ se não — por quê | ⚠ o desync depende da ordem |

## 8. O invariante violado
| Item | Valor |
|---|---|
| o invariante | |
| como foi violado | |

## 9. ⚠ O que isso prova, e o que NÃO prova
**Prova:**
- as duas camadas discordam neste caso
- a discordância é sobre o LIMITE

**NÃO prova:**
- que é explorável
- que existe em produção
- que outra camada não rejeita
- qual é o impacto real

## 10. ⚠ O que eu NÃO fiz
- [ ] não apontei para CDN, WAF ou host de terceiro
- [ ] não testei em produção
- [ ] não usei o desync para ACESSAR nada
- [ ] não induzi outra pessoa a abrir página
- [ ] não construí um exploit funcional
- [ ] não calculei severidade

## 11. O que os mantenedores confirmam
| # | Dono | Item |
|---|---|---|
| 1 | o frontend | a regra de framing é intencional? |
| 2 | o backend | ele confia no CL recebido? |

## 12. O que NÃO foi verificado
⚠ mínimo 3
```

### Fase 5 — Destinatários, defesa e conduta (10 min)

**Produza `08-destinatarios.md`:**

```markdown
# Destinatários

## Os achados e seus donos
| # | Achado | Destinatário | ⚠ Não mencionar |
|---|---|---|---|
| 1 | | | |

## Por destinatário, o que NÃO dizer
| Destinatário | O que NÃO dizer |
|---|---|
| o frontend | ⚠ o comportamento do backend |
| o backend | ⚠ o comportamento do frontend |
| o cache | ⚠ o que o backend faz |

## O timing
| Item | Valor |
|---|---|
| prazo | ⚠ o do mais lento |
| publicar antes? | ⚠ **NÃO** |
| crédito | a todos que confirmarem |
```

**Produza `09-defesa.md`** — a recomendação do módulo 10, adaptada ao seu achado.

**Produza `10-declaracao.md`:**

```markdown
# Declaração de conduta

## O laboratório
| Item | Valor |
|---|---|
| as camadas | ⚠ produtos MEUS, em 127.0.0.1 |
| rede de saída | ⚠ **NENHUMA** |
| teste de isolamento | feito — o `curl` FALHOU |
| ⚠ terceiros | **NENHUM** |

## Declaro que
- [ ] não enviei payload a nenhum host que não seja meu
- [ ] não testei CDN, WAF, proxy ou cache de terceiro
- [ ] não usei o desync para ACESSAR nada
- [ ] não induzi nenhuma pessoa a abrir página
- [ ] não mantive conexões abertas para exaurir
- [ ] não construí um exploit funcional
- [ ] não publiquei nada antes de reportar
- [ ] declarei o que NÃO verifiquei
- [ ] reporto a cada dono, sem mencionar os outros

## E declaro que ENTENDO que
- [ ] request smuggling contra infraestrutura de terceiro
      é crime consumado — não há "sem intenção"
- [ ] o payload É a execução
- [ ] a página do client-side, apontada para fora,
      é CSRF — crime autônomo
- [ ] medir a divergência e explorá-la são coisas diferentes

Data: ____
```

---

## 11.3 A rubrica

| # | Item | Peso |
|---|---|---|
| 1 | **Carta de variantes** com prioridade e descarte | 15% |
| 2 | **Lab isolado**, com verificação | 10% |
| 3 | **Instrumentação** do backend (contagem e log) | 10% |
| 4 | **Varredura por prioridade** | 10% |
| 5 | **As quatro saídas** corretamente atribuídas | 15% |
| 6 | ⚠ **A marca como prova literal** | 15% |
| 7 | **Reprodutibilidade declarada** | 5% |
| 8 | **Destinatários separados** | 5% |
| 9 | **Recomendação de defesa** | 5% |
| 10 | **Declaração de conduta** | 5% |
| 11 | **"Não fiz"** (5+ itens) | 5% |

**Penalidades automáticas:**

- Apontou para host de terceiro: **projeto zerado**.
- Testou CDN, WAF ou serviço público: **projeto zerado**.
- Usou o desync para acessar algo: **projeto zerado**.
- Induziu outra pessoa a abrir a página: **projeto zerado**.
- Construiu exploit funcional: **projeto zerado**.
- Varredura sem carta: −25%.
- Sem a marca como prova: −20%.
- Sem declarar reprodutibilidade: −10%.
- "Não fiz" ausente: −10%.
- Indeterminado tratado como "não funciona": −15%.

---

## 11.4 Roteiro

| Bloco | Duração | O que fazer |
|---|---|---|
| 1 | 30 min | Alvo e carta |
| 2 | 25 min | Lab e descarte |
| 3 | 35 min | Varredura e medida |
| 4 | 20 min | Classificação e relatório |
| 5 | 10 min | Destinatários, defesa e conduta |

⚠ **Resista à tentação de pular a carta.** **Sem ela, a varredura não tem ordem nem fim.**

---

## 11.5 Critérios de aceitação

- `00-alvo.md` com a cadeia e o critério, e o que **não** fazer.
- `01-carta.md` com as **dez** variantes e a prioridade.
- Você preencheu a coluna **"a cadeia tem?"**.
- A hipótese tem **critério de falsificação**.
- Você listou **o que não vai testar, e por quê**.
- `02-lab.md` com as camadas, o isolamento e **o teste que falha**.
- O **backend loga** path, headers, corpo e **contagem**.
- As **três condições** do módulo 2 verificadas.
- `03-descarte.md` com **o que não se aplica** e o que você **não sabe**.
- `04-varredura.md` com a varredura **por prioridade**.
- Você tratou **os indeterminados** antes de seguir.
- `05-medicao.md` com as **três medidas** por variante.
- Você usou **a marca** como prova literal.
- `06-classificacao.md` com a **cascata** aplicada.
- Você aplicou **as três perguntas críticas** do framing.
- Você citou **os falsos positivos** que quase reportou.
- `07-relatorio.md` com as **doze** seções.
- Você declarou **a reprodutibilidade**.
- Você escreveu **o que prova e o que não prova**.
- Seção "não fiz" com **seis itens** mínimos.
- `08-destinatarios.md` com **o que não mencionar** a cada um.
- `09-defesa.md` com a recomendação **por destinatário**.
- `10-declaracao.md` com **todas** as caixas.
- ⚠ **Nenhum serviço de terceiro.** Nenhum exploit construído.

---

## Avaliação final

1. **Por que o entregável é o percurso**, e não o desync?
2. **Por que "varri e não achei" é resultado válido?**
3. **Por que a carta vem antes da varredura?**
4. **O que a coluna "a cadeia tem?" filtra?**
5. **Por que listar o que não se aplica?
6. **O que a varredura por prioridade ordena?**
7. **Por que começar pelo que custa um byte?**
8. **Cite as quatro saídas** e a ação de cada.
9. **O que fazer com o indeterminado?** Por quê?
10. **Qual é a medida mais forte?** Por quê?
11. **O que a marca prova** que a contagem não prova?
12. **Por que declarar a reprodutibilidade?**
13. **Cite as três condições** do módulo 2.
14. **O que o backend precisa logar?** Por quê?
15. **Cite as três perguntas críticas** do framing.
16. **O que a cascata classifica?**
17. **Quantos destinatários** tem um achado entre camadas?
18. **O que não mencionar** a cada um? Por quê?
19. **Qual é a recomendação de defesa mais eficaz?** Por quê?
20. **O que separa este curso dos anteriores**, em relação ao dano?

---

## Encerramento do curso

Você começou com "dois parsers discordam sobre onde a mensagem termina", e terminou com um percurso
completo: carta, lab, varredura, medida, classificação e reporte.

O que você aprendeu não foi um payload — **e não foi uma variante.** Foi **o método** que transforma
uma divergência em achado reportável.

| # | O que fica |
|---|---|
| 1 | **O smuggling é a consequência da discordância sobre o limite.** |
| 2 | **Três condições** — persistência, discordância, repasse do original. |
| 3 | **A contagem é a medida**; a marca é a prova. |
| 4 | **Quatro saídas**, e três delas não são "funcionou". |
| 5 | **O H2 é seguro; a ponte não é.** |
| 6 | **O cache multiplica** o alcance de qualquer divergência. |
| 7 | **A defesa ideal normaliza antes de repassar.** |

⚠ **E a linha deste curso, que é mais estreita que a dos anteriores:**

> **Um smuggler funcional contra terceiro é crime consumado.** **Não há "acesso indevido sem
> intenção"** — **o payload é a execução.** **E é por isso que todo o curso roda em 127.0.0.1.**

⚠ **E a ponte para o próximo curso da trilha:**

| Curso | O que ele faz com este método |
|---|---|
| **Fuzzing Avançado** | O espaço de variantes, com guia |
| **Detecção e Evasão** | O módulo 10, do lado do detector |
| **Patch Diffing** | O patch que corrigiu um smuggling |

**O que você aprendeu aqui não muda de curso para curso.** **O que muda é o alvo.**

Referências para continuar: **HTTP Desync Attacks (PortSwigger, 2019)** · **HTTP/2: The Sequel is
Always Worse (2021)** · **Browser-Powered Desync Attacks (2022)** · **HTTP/1.1 Must Die: The
Smuggler's Guide (2025)** · **Client-Side Desync** · **RFC 9112 §6.3** · **RFC 7230 §3.3.3** ·
**RFC 9113** · **`smuggler`** · **HTTP Garden** · **PortSwigger Research**
