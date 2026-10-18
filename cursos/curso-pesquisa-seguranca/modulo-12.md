# Módulo 12 — Projeto: Uma Pesquisa Completa

**Carga:** 3 horas
**Pré-requisitos:** Módulos 1 a 11

---

## O objetivo do módulo

**Um entregável:** uma pesquisa completa, do alvo ao achado, com **método**, **evidência**,
**limitação declarada** e **caderno**.

⚠ **E o entregável não é o achado. É o percurso.** **Uma pesquisa que não achou nada — mas
documentou o que eliminou — é um projeto válido.** **O que não é válido é o percurso sem registro.**

| Resultado | É projeto válido? |
|---|---|
| Achou e documentou | ✓✓ Sim |
| Falsificou a hipótese e documentou | ✓✓ **Sim** — é resultado (módulo 1) |
| Teste inconclusivo, e você sabe por quê | ✓ Sim — e aponta o que reformular |
| Não achou nada e não registrou | ⚠ **Não** |
| Achou e não documentou | ⚠ **Não** |

⚠ **A segunda linha é a que o curso insiste em valorizar.** **Eliminar uma possibilidade é
progresso** — **e num projeto de 3 horas, é o resultado mais provável.**

---

## ⚠ Nota de conduta

| Você faz | Você **não** faz |
|---|---|
| Lê código publicado | Testa instância de terceiro |
| Reimplementa no seu lab | Envia entrada a serviço alheio |
| Reporta ao mantenedor | Publica sem coordenação |
| Usa alvo próprio, CTF ou autorizado | Amplia o escopo |

⚠ **E a regra que o módulo 10 fixou, uma vez mais:** **ler é sempre legítimo; testar exige
autorização escrita.** **O projeto cabe inteiro na leitura** — **e é isso que o torna viável sem
nenhum contrato.**

---

## 12.1 O que você vai produzir

```
projeto-pesquisa/
├── 00-alvo.md               o alvo, escolhido por critério (módulo 2)
├── 01-metodo.md             as sete perguntas (módulo 1)
├── 02-insumos.md            patch, CVE, paper (módulos 3–5)
├── 03-hipotese.md           com critério de falsificação (módulo 6)
├── 04-busca.md              a escada de níveis (módulo 7)
├── 05-caderno/              as fichas (módulo 8)
├── 06-parada.md             o critério de parada (módulo 9)
├── 07-achado.md             o achado, no template (módulo 11)
├── 08-relatorio.md          O ENTREGÁVEL
└── 09-declaracao.md         conduta (módulo 10)
```

⚠ **A ordem é a ordem do curso.** **E `00-alvo.md` vem primeiro** — **porque sem alvo, nada se
faz.**

---

## 12.2 As fases

### Fase 1 — Alvo e método (30 min)

**Produza `00-alvo.md`:**

```markdown
# O alvo

## 1. Identificação
| Item | Valor |
|---|---|
| Alvo | |
| Versão | |
| Fonte | |
| Linguagem | |
| **Autorização** | leitura de código publicado |

## 2. Avaliação (módulo 2, escala 1–5)
| Eixo | Nota | Justificativa |
|---|---|---|
| Superfície | | |
| Acessibilidade | | |
| Maturidade | | |
| Competição | | |
| **Produtividade** | | (sup × aces) / (mat × comp) |

## 3. Região produtiva (módulo 2)
[ ] parser differential
[ ] confusão de camada
[ ] lógica / invariante
[ ] código novo
[ ] o que eu conheço por dentro

## 4. Superfície
| Componente | Entrada | Superfície |
|---|---|---|

## 5. Fronteiras de confiança
| # | Ponto | Suposição | Verificado? |
|---|---|---|---|

## 6. O limite deste alvo
⚠ o que está FORA — e por quê:

## 7. Limitações da minha avaliação
⚠ mínimo 3
```

**Produza `01-metodo.md`:**

```markdown
# O método

## As sete perguntas aplicadas ao alvo
| # | Pergunta | Resposta |
|---|---|---|
| 1 | Qual é o invariante? | |
| 2 | Quem confia nele? | |
| 3 | Que suposição o código faz? | |
| 4 | (se houver patch) por que corrige? | |
| 5 | Existe irmão do padrão? | |
| 6 | Como eu falsifico isto? | |
| 7 | O que isso destrava? | |

## O que eu NÃO vou fazer
- [ ] não vou testar instância em produção
- [ ] não vou ampliar o escopo por "ser o mesmo padrão"
- [ ] não vou publicar sem coordenação
```

⚠ **A seção das sete perguntas é o coração do método.** **Ela é o que transforma "vou olhar o
código" em pesquisa.**

### Fase 2 — Insumos (40 min)

⚠ **Os três insumos, de fontes reais. Se não achar um, declare.**

**Produza `02-insumos.md`:**

```markdown
# Insumos

## 1. Patch (módulo 3)
| Item | Valor |
|---|---|
| Projeto / CVE | |
| Commit | |
| **Nível 1** — o que mudou | |
| **Nível 2** — por que corrige | |
| **Nível 3** — invariante violado | |
| **Padrão abstraído** (sem nomes) | |

## 2. CVE (módulo 4)
| Item | Valor |
|---|---|
| CVE | |
| CWE | |
| O padrão | |
| Vale investigar? | |

## 3. Paper (módulo 5)
| Item | Valor |
|---|---|
| Título | |
| **O padrão que ele prova** | |
| **Espaço em branco** | |
| Artefato público? | |

## 4. A convergência
⚠ os três apontam para o mesmo lugar?

| Insumo | O padrão que ele dá |
|---|---|
| Patch | |
| CVE | |
| Paper | |
| ⚠ **A convergência** | |

## 5. O que não consegui obter
[mínimo 1 item — e é legítimo]
```

⚠ **A seção da convergência é a mais valiosa.** **Quando patch, CVE e paper apontam para o mesmo
padrão, é sinal forte** — **porque três fontes independentes concordam.** **É a mesma lógica do
módulo 7 do curso de OSINT:** **independência de fonte é o que dá confiança.**

⚠ **E a seção 5 é obrigatória** — **declarar o insumo que você não conseguiu é parte do método.**

### Fase 3 — Hipótese e busca (40 min)

**Produza `03-hipotese.md`:**

```markdown
# A hipótese

## 1. O insumo que a gerou
[de onde veio]

## 2. A forma (módulo 6)
| Campo | Valor |
|---|---|
| **Invariante** | |
| **Afirmação** | |
| **Observação** | |
| **⚠ Critério de falsificação** | |

## 3. O teste que poderia decidir
| Pergunta | Resposta |
|---|---|
| A observação é obtível por leitura? | |
| Ela distingue confirmado de falsificado? | |

## 4. O limite de esforço (módulo 9, escrito ANTES)
| Recurso | Limite |
|---|---|
| Tempo | |
| Reformulações de teste | |
| O que fazer ao atingir | registrar como inconclusivo |

## 5. A hipótese, em uma frase
[⚠ sem jargão, para poder dizer em voz alta]
```

**Produza `04-busca.md`:**

```markdown
# A busca

## O padrão, em busca
"[abstraído, sem nomes]"

## Nível 1 — termo
| Termo | Ocorrências | Vale olhar? |
|---|---|---|

## Nível 2 — estrutural
| Expressão | Ocorrências | Filtra o quê |
|---|---|---|

## Nível 3/4 — semgrep / CodeQL
[se usou]
⚠ valeu o investimento? por quê?

## Nível 5 — diferencial
| Implementação A | Implementação B | O que comparar |
|---|---|---|

## Os candidatos
| # | Onde | Casa o padrão? |
|---|---|---|

## Os cinco falsos positivos (módulo 7)
| # | Candidato | Chamador valida? | Outra camada? | Alcançável? | Spec permite? | Código morto? | Veredito |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |

## A confirmação
| # | Candidato | Confirmado por leitura? | 1-day ou 0-day |
|---|---|---|---|
```

### Fase 4 — Caderno e parada (30 min)

**Produza `05-caderno/`** com **as fichas criadas no módulo 8** e **`INDEX.md`** atualizado.

**Produza `06-parada.md`:**

```markdown
# Critério de parada — aplicado

## Para cada investigação
| ID | O teste poderia decidir? | Decisão | Aprendizado | Próximo passo |
|---|---|---|---|---|
| | | | | |

## O estado final
| Resultado | Quantidade |
|---|---|
| Confirmadas | |
| ⚠ **Falsificadas** | |
| Inconclusivas | |

## O que a falha ensinou
| Desfecho | O que melhora no meu método |
|---|---|
| Falsificou | |
| Inconclusivo | |
| Alvo esgotado | |
| Falso positivo | |

## A decisão de continuidade
[ ] continuar neste alvo — com que escopo
[ ] trocar de alvo — e o próximo é
[ ] pausar — e o que retomar
```

### Fase 5 — O relatório (40 min)

**Produza `08-relatorio.md`** — o entregável, com as **dez seções** do módulo 11.

⚠ **E o relatório tem uma seção obrigatória que a maioria pula: "o que eu NÃO verifiquei".**
**Ela é o que dá credibilidade ao resto.**

### Fase 6 — Declaração (20 min)

**Produza `09-declaracao.md`** com as **seis seções** do módulo 10.

---

## 12.3 A rubrica

| # | Item | Peso |
|---|---|---|
| 1 | **Alvo escolhido por critério**, com avaliação numérica | 10% |
| 2 | **As sete perguntas** aplicadas | 10% |
| 3 | **Os três insumos**, com o padrão abstraído | 15% |
| 4 | **Hipótese com critério de falsificação** | **15%** |
| 5 | **Busca nos níveis 1 e 2**, com falsos positivos verificados | 10% |
| 6 | **Caderno** com evidência literal e ligações | 10% |
| 7 | **Critério de parada aplicado** | 5% |
| 8 | **Achado no template** (módulo 11) | 10% |
| 9 | **"O que não verifiquei"** (3+ itens) | 5% |
| 10 | **Declaração de conduta** | 5% |
| 11 | **O que sobrou** — o backlog | 5% |

**Penalidades automáticas:**

- **Hipótese sem critério de falsificação**: −25% (é o item central).
- Alvo sem avaliação numérica: −10%.
- Evidência sem comando/código literal: −10%.
- **Teste contra terceiro**: **projeto zerado**.
- "Não verifiquei" ausente: −10%.
- Relatório sem o método explícito: −10%.
- Ausência da declaração de conduta: −10%.

---

## 12.4 Roteiro

| Bloco | Duração | O que fazer |
|---|---|---|
| 1 | 30 min | Alvo avaliado + as sete perguntas |
| 2 | 40 min | Os três insumos, e a convergência |
| 3 | 40 min | Hipótese com critério + busca |
| 4 | 30 min | Caderno e critério de parada |
| 5 | 40 min | O relatório |
| 6 | 20 min | A declaração de conduta |

⚠ **Resista à tentação de inverter a ordem.** **Formular a hipótese antes de buscar é o que evita
a busca sem destino** — **e é o erro que o módulo 6 chama de hipótese ruim nº 3.**

---

## 12.5 Critérios de aceitação

- `00-alvo.md` com a **avaliação numérica** dos quatro eixos e a produtividade calculada.
- Você identificou a **região produtiva** do alvo.
- Você escreveu o **limite do alvo** — o que está fora.
- `01-metodo.md` com as **sete** perguntas respondidas.
- `02-insumos.md` com os **três** insumos e o **padrão abstraído** de cada.
- Você identificou **a convergência** entre os insumos — ou declarou que não houve.
- Você declarou **um insumo que não conseguiu** obter.
- `03-hipotese.md` com **"morre se"** escrito.
- Você escreveu o **limite de esforço** antes de continuar.
- A hipótese pode ser dita **em voz alta**, sem jargão.
- `04-busca.md` com os **níveis 1 e 2** executados.
- Você verificou os **cinco falsos positivos** em pelo menos um candidato.
- `05-caderno/` com as fichas e o **`INDEX.md`** atualizado.
- Pelo menos uma investigação com estado **falsificada** — ou justificativa de por que não houve.
- `06-parada.md` com o **critério aplicado** e o que a falha ensinou.
- `08-relatorio.md` com as **dez** seções.
- Seção "o que não verifiquei" com **três itens** mínimos.
- **O backlog** com pelo menos **duas** perguntas abertas.
- `09-declaracao.md` com as **seis** seções e todas as caixas marcadas.
- ⚠ **Nenhum teste contra terceiro.** Todo o projeto é leitura.

---

## Avaliação final

1. **Por que o entregável não é o achado, mas o percurso?**
2. **Por que falsificar é projeto válido?**
3. **O que não é projeto válido?** Por quê?
4. **Por que o alvo vem primeiro?** E com qual critério?
5. **O que a avaliação numérica do alvo evita?**
6. **Por que as sete perguntas são o coração do método?**
7. **O que a convergência dos insumos indica?**
8. **Por que declarar o insumo que não conseguiu é parte do método?**
9. **Por que a hipótese vem antes da busca?**
10. **O que "morre se" garante?**
11. **Por que o limite de esforço é escrito antes?**
12. **O que a busca nos níveis 1 e 2 alcança** e o que ela não alcança?
13. **Por que verificar os cinco falsos positivos é obrigatório?**
14. **O que a evidência literal garante** que a narrativa não garante?
15. **Por que a data e o commit entram na evidência?**
16. **O que o critério de parada decide?**
17. **O que "inconclusivo" ensina sobre o seu método?**
18. **Por que a seção "não verifiquei" dá credibilidade?**
19. **O que o backlog representa** para a pesquisa seguinte?
20. **Por que o projeto inteiro cabe na leitura?**

---

## Encerramento do curso

Você começou com a diferença entre operador e pesquisador, e terminou com uma pesquisa completa,
com hipótese, evidência, limitação declarada e caderno.

O que você aprendeu não foi "como achar bug". Foi o **método** — e o método é o que **transforma
esforço em acúmulo** em vez de dispersão.

| # | O que fica |
|---|---|
| 1 | **O pesquisador tem uma PERGUNTA**, não uma tarefa. |
| 2 | **O alvo se escolhe por vantagem relativa**, não por prestígio. |
| 3 | **O patch é a documentação mais honesta** — e o nível 3 é o que dá o padrão. |
| 4 | **A hipótese sem critério de falsificação é expectativa.** |
| 5 | **A variante é o caminho mais curto** para o achado original. |
| 6 | **Registro é o produto.** Sem ele, cada investigação começa do zero. |
| 7 | **Falsificar é resultado.** |
| 8 | **Ler é sempre legítimo; testar exige autorização.** |
| 9 | **O relatório bom é curto, estruturado, e diz o que NÃO sabe.** |

⚠ **E a ponte para o próximo curso da trilha diferenciada.** Este é o **meta-curso** — e os que
vêm **aplicam este método a alvos específicos:**

| Curso | O que ele faz com este método |
|---|---|
| **Análise Diferencial de Patch** | O módulo 3 levado ao binário — `Ghidra`, `BinDiff`, `DiffRays` |
| **Parser Differentials** | O módulo 7, tipo 4 — a discordância entre implementações |
| **HTTP Smuggling e Camada** | O módulo 7, tipo 5 — a especificação como critério |
| **Fuzzing Avançado** | O módulo 6 — hipótese dirigindo o fuzzer, como o `1dFuzz` |
| **Detecção e Evasão** | O módulo 11 — escrever para defender |
| **Análise Diferencial de Patch** | E o módulo 9 — quando um alvo esgota |

**O que você aprendeu aqui não muda de curso para curso. O que muda é o alvo.**

Referências para continuar: **arXiv cs.CR** · **USENIX Security / NDSS / IEEE S&P / CCS** ·
**NVD e GitHub Advisories** · **Project Zero blog** · **PortSwigger Research** ·
**Patch Diffing In The Dark** · **"How to Read a Paper"** (Keshav) · **pwn.college** ·
**Cryptopals** · **Phrack**
