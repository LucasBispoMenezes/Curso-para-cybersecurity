# Módulo 11 — Projeto: Do CVE ao Achado

**Carga:** 2 horas
**Pré-requisitos:** Módulos 1 a 10

---

## O objetivo do módulo

**Um entregável:** um percurso completo de patch diffing — **do par de binários ao achado
verificado**, com caderno e declaração de conduta.

⚠ **E o entregável não é o exploit.** É o **percurso**: **o par verificado, a triagem, a
localização, o reproducer, o padrão.**

| Resultado | É projeto válido? |
|---|---|
| Reproduziu o 1-day | ✓✓ **Sim** |
| Localizou o código e não reproduziu | ✓ Sim — hipótese aberta |
| Triagem não achou nada de segurança | ⚠ **Sim** — e você declara |
| Achou a variante por ecossistema | ✓✓✓ **Exemplar** |
| Nada documentado | ⚠ **Não** |

⚠ **A terceira linha é a que a maioria trata como fracasso — e não é.** **Uma triagem que conclui
"o release não tem correção de segurança" é resultado** — **e informa a escolha do próximo alvo.**

---

## ⚠ Nota de conduta

| Você faz | Você **não** faz |
|---|---|
| Diff de **binário público** | Diff de binário de cliente sem autorização |
| Reprodução no **seu lab** ou CTF publicado | Reprodução em sistema de terceiro |
| **Reporta** ao mantenedor | Publica antes da correção |
| Descreve o impacto | ⚠ **Constrói exploit** |
| Lê o código de N implementações | ⚠ **Testa a instância de N** |

⚠ **E a linha, uma vez mais:** **ler é sempre legítimo; testar exige autorização escrita.**
**Reproduzir é confirmar a diferença; explorar é obter controle.** **O projeto cabe inteiro no
primeiro lado.**

---

## 11.1 O que você vai produzir

```
projeto-patch-diffing/
├── 00-alvo.md             o par escolhido, com critério
├── 01-proveniencia.md     os quatro testes (módulo 2)
├── 02-diff.md             o diff, e o que ele mostra
├── 03-triagem.md          sinal vs. ruído (módulo 5)
├── 04-localizacao.md      a assinatura e a busca (módulo 7)
├── 05-reproducer.md       a reprodução (módulo 8)
├── 06-padrao.md           o padrão, sem nomes
├── 07-variante.md         o ecossistema (módulo 10)
├── 08-relatorio.md        O ENTREGÁVEL
└── 09-declaracao.md       conduta
```

⚠ **A ordem é a ordem do curso** — **e `00-alvo.md` vem primeiro.**

---

## 11.2 As fases

### Fase 1 — Alvo e proveniência (25 min)

**Produza `00-alvo.md`:**

```markdown
# O alvo

## 1. Identificação
| Item | Valor |
|---|---|
| Projeto | |
| CVE (se houver) | |
| CWE | |
| Versão N-1 | |
| Versão N | |
| Fonte dos binários | ⚠ **oficial, não recompilado** |

## 2. Por que este par
| Critério | Avaliação |
|---|---|
| Patch pequeno | |
| Binário de tamanho médio | |
| Fonte também disponível? | |
| Componente claro no CVE? | |
| Não é kernel/navegador | |

## 3. O que eu NÃO vou fazer
- [ ] não recompilar o fonte para diffar
- [ ] não testar instância de terceiro
- [ ] não construir exploit
- [ ] não publicar antes da correção
```

**Produza `01-proveniencia.md`:**

```markdown
# Proveniência (módulo 2)

## Os quatro testes
| # | Teste | N-1 | N | Resultado |
|---|---|---|---|---|
| 1 | arquitetura | | | |
| 2 | compilador | | | |
| 3 | build | | | |
| 4 | determinismo | | | |

## O par
| Item | N-1 | N |
|---|---|---|
| SHA-256 | | |
| URL de origem | | |
| Data do download | | |
| Símbolos? | | |

## Veredito
[ ] par diffável
[ ] par com ruído — filtrar
[ ] ⚠ par inválido

## Se não for determinístico
| Item | Valor |
|---|---|
| O meu compilador é? | |
| Conclusão | ⚠ usar os binários OFICIAIS |
```

⚠ **A coluna "oficial, não recompilado" é a regra do módulo 2.** **E é o que torna o diff
comparável.**

### Fase 2 — Diff e triagem (35 min)

**Produza `02-diff.md`:**

```markdown
# O diff

## 1. Como obtive
| Item | Valor |
|---|---|
| Ferramenta | Ghidra / Ghidriff / objdump |
| Símbolos disponíveis? | |
| Correlators rodados | |

## 2. As métricas
| Item | Valor |
|---|---|
| Funções que mudaram | |
| Linhas de diferença | |

## 3. Os atalhos usados
| # | Atalho | Resultado |
|---|---|---|
| 1 | constante nova | |
| 2 | chamada nova | |
| 3 | tamanho | |
| 4 | componente do CVE | |

## 4. O que o diff mostra, em uma frase
[o invariante que mudou — ainda sem nomes]
```

**Produza `03-triagem.md`:**

```markdown
# Triagem sinal vs. ruído (módulo 5)

## O critério aplicado
⚠ **"o comportamento PODE diferir?"**

## Os quatro filtros
| # | Filtro | Entrada | Saída |
|---|---|---|---|
| 1 | tamanho | | |
| 2 | branch | | |
| 3 | chamada/constante | | |
| 4 | leitura | | |

## A classificação
| # | Função | Diferença | Classificação | Razão |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Os falsos sinais
| # | Falso sinal | Como descartei |
|---|---|---|
| 1 | | |

## A proporção
| Métrica | Valor |
|---|---|
| funções que mudaram | |
| **sinal** | |
| **ruído** | |
```

### Fase 3 — Localização e reproducer (35 min)

**Produza `04-localizacao.md`:**

```markdown
# Localização (módulo 7)

## A assinatura
| # | Elemento (do patch) | Tradução para o binário |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

## A busca
| Técnica | Usada? | Resultado |
|---|---|---|
| A — assinatura | | |
| B — mudança de fluxo | | |
| C — componente | | |

## A localização
| Item | Valor |
|---|---|
| Função | |
| Posição na lista | |
| Precisão (módulo 7, §7.3) | |

## A confirmação
| Item | Valor |
|---|---|
| O N-1 permite o que o N recusa? | |
| ⚠ Em qual alvo? | o meu |
```

**Produza `05-reproducer.md`:**

```markdown
# Reproducer (módulo 8)

## As quatro partes
| Parte | Valor |
|---|---|
| Alvo (com hash) | |
| Entrada | |
| **Critério** | |
| Ambiente | |

## O teste de fronteira
| Valor | N-1 | N | Difere? |
|---|---|---|---|
| limite | | | |
| limite + 1 | | | |
| máximo do tipo | | | |

## A evidência
```
o comando literal
```
```
a saída literal
```

## Determinismo
| Item | Valor |
|---|---|
| reproduz sempre? | |

## ⚠ O que eu NÃO fiz
- [ ] não construí exploit
- [ ] não testei instância de terceiro
- [ ] não confirmei contra produção
- [ ] não calculei a severidade
```

### Fase 4 — Padrão e variante (25 min)

**Produza `06-padrao.md`:**

```markdown
# O padrão

## Abstraído, sem nomes
"[o padrão]"

## A pergunta que ele gera
"esta implementação ________________________________?"

## O invariante
[o que DEVE valer]

## Onde mais procurar
| # | Onde | Por que |
|---|---|---|
| 1 | | |
| 2 | | |
```

**Produza `07-variante.md`:**

```markdown
# Variante por ecossistema (módulo 10)

## O que liga as implementações
| Item | Valor |
|---|---|
| Formato / protocolo | |
| Especificação | |

## As implementações
| # | Projeto | Lê o mesmo? | Valida? | Veredito |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |

## A verificação
⚠ os cinco falsos positivos, por candidato

## A classificação
| # | Projeto | 1-day ou 0-day |
|---|---|---|
| 1 | | |

## O plano de reporte
| Projeto | Reportar? | Canal |
|---|---|---|
| | | |
| A (já corrigiu) | ⚠ **NÃO** | — |

## ⚠ E SE NÃO HOUVER VARIANTE
| Item | Valor |
|---|---|
| Tentei e não achei | |
| O que isso significa | |
| Próximo alvo | |
```

⚠ **A última seção é obrigatória, e é o módulo 6 do Pesquisa.** **Não achar a variante é resultado**
— **e você declara o que tentou e o que concluiu.**

### Fase 5 — O relatório (20 min)

**Produza `08-relatorio.md`** com as **dez** seções do módulo 8, adaptadas ao percurso completo.

### Fase 6 — Declaração (10 min)

**Produza `09-declaracao.md`** com as seis seções.

---

## 11.3 A rubrica

| # | Item | Peso |
|---|---|---|
| 1 | **Par escolhido por critério**, com fonte oficial | 10% |
| 2 | **Os quatro testes de proveniência** | 10% |
| 3 | Diff obtido, com as **métricas** | 10% |
| 4 | **Triagem** com o critério e a proporção | 15% |
| 5 | **Localização** com a assinatura e a precisão | 15% |
| 6 | **Reproducer** com critério e evidência literal | 15% |
| 7 | **Padrão abstraído sem nomes** | 10% |
| 8 | **Variante** investigada — ou declarada | 5% |
| 9 | **"O que não fiz"** (4+ itens) | 5% |
| 10 | **Declaração de conduta** | 5% |

**Penalidades automáticas:**

- **Recompilei o fonte para diffar**: −20%.
- Par sem verificação de proveniência: −15%.
- **Triagem sem o critério de fluxo**: −20%.
- Reproducer sem critério declarado: −15%.
- **Teste contra terceiro**: **projeto zerado**.
- Construir exploit: **projeto zerado**.
- "Não fiz" ausente: −10%.

---

## 11.4 Roteiro

| Bloco | Duração | O que fazer |
|---|---|---|
| 1 | 25 min | Alvo escolhido + proveniência |
| 2 | 35 min | Diff e triagem |
| 3 | 35 min | Localização e reproducer |
| 4 | 25 min | Padrão e variante |
| 5 | 20 min | Relatório |
| 6 | 10 min | Declaração de conduta |

⚠ **Resista à tentação de pular a triagem.** **É o item de maior peso e o que o curso inteiro
treinou.**

---

## 11.5 Critérios de aceitação

- `00-alvo.md` com o critério e a **fonte oficial** declarada.
- `01-proveniencia.md` com os **quatro** testes e os **hashes**.
- Você declarou se o par é **diffável, com ruído, ou inválido**.
- `02-diff.md` com as **métricas** e os atalhos usados.
- `03-triagem.md` com o **critério** e a **proporção sinal/ruído**.
- Você classificou **pelo menos três** funções com razão.
- Você identificou **pelo menos um** falso sinal.
- `04-localizacao.md` com a **assinatura** e a **precisão medida**.
- Você usou **pelo menos duas** das três técnicas de localização.
- `05-reproducer.md` com as **quatro** partes, incluindo o **critério**.
- O teste de **fronteira** rodou, com o ponto de virada identificado.
- A evidência tem **comando e saída literais** e os **hashes**.
- `06-padrao.md` com o padrão **sem nomes** e a **pergunta**.
- `07-variante.md` com **pelo menos três** implementações listadas.
- Você declarou **se achou ou não** a variante.
- `08-relatorio.md` com as **dez** seções.
- Seção "não fiz" com **quatro itens** mínimos.
- `09-declaracao.md` preenchida, com todas as caixas.
- ⚠ **Nenhum alvo de terceiro.** Nenhum exploit.

---

## Avaliação final

1. **Por que o entregável é o percurso**, e não o achado?
2. **Por que "não achou nada de segurança" é resultado válido?**
3. **Por que a fonte dos binários precisa ser oficial?**
4. **O que os quatro testes de proveniência decidem?**
5. **Por que não recompilar o fonte?**
6. **O que as métricas do diff dizem?**
7. **Qual o critério de sinal vs. ruído?**
8. **Por que a triagem tem o maior peso?**
9. **Qual proporção sinal/ruído você mediu?**
10. **O que é um falso sinal?** Deu algum?
11. **O que é a assinatura do patch?**
12. **Cite as três técnicas de localização.**
13. **Qual a precisão que basta?** Por quê?
14. **Cite as quatro partes do reproducer.**
15. **Qual a maioria esquece?** Por quê?
16. **O que o teste de fronteira procura?**
17. **Por que o padrão precisa estar sem nomes?**
18. **O que a pergunta derivada do padrão permite?**
19. **O que declarar quando não há variante?**
20. **Qual a linha entre reproduzir e explorar?**

---

## Encerramento do curso

Você começou com "o patch é a documentação mais honesta", e terminou com um percurso completo: par
verificado, triagem, localização, reproducer, padrão e variante.

O que você aprendeu não foi uma ferramenta. Foi **o método** — **e o critério que faz o método
funcionar.**

| # | O que fica |
|---|---|
| 1 | **O patch deixa rastro** — e o rastro é localizável. |
| 2 | **A proveniência decide o diff** — sem ela, 400 funções e nenhuma resposta. |
| 3 | **Sinal é mudança de CONTROLE DE FLUXO.** Ruído é mudança de forma. |
| 4 | **A ferramenta ordena por similaridade; você ordena por fluxo.** |
| 5 | **Reproduzir é confirmar a diferença; explorar é obter controle.** |
| 6 | **O silent patch não tem concorrência** — e é onde você abre. |
| 7 | **Onde há especificação, há N implementações** — e a variante vira 0-day. |

⚠ **E a ponte para o próximo curso da trilha.** Este é o **módulo 3 do curso de Pesquisa levado ao
osso** — e ele alimenta **dois** dos que faltam:

| Curso | O que ele faz com este método |
|---|---|
| **Parser Differentials** | O módulo 10, tipo 4 — a discordância entre implementações |
| **HTTP Smuggling e Camada** | O módulo 10, tipo 5 — a especificação como critério |
| **Fuzzing Avançado** | O `1dFuzz` — fuzzing dirigido pela posição do patch |
| **Detecção e Evasão** | O módulo 8 — escrever reproducer para defender |

**O que você aprendeu aqui não muda de curso para curso.** **O que muda é o alvo e a ferramenta.**

Referências para continuar: **Patch Diffing In The Dark** · **DiffRays** · **Ghidriff** ·
**BinDiff** · **Diaphora** · **PLocator** (arxiv 2501.17413) · **EnBinDiff** (IEEE TQ 2023) ·
**1dFuzz** (ACM 3597926) · **Orange Cyberdefense: Introduction to Binary Diffing** ·
**Packetlabs: 7 Free Tools for Binary Diffing** · **Microsoft Patch Tuesday** ·
**snapshot.debian.org** · **Project Zero**
