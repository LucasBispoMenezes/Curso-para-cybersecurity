# Módulo 9 — Atribuição, Produto e Exercício

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Aplicar método de atribuição, com escala de confiança explícita.
2. Reconhecer os vieses que corrompem análise de atribuição.
3. Produzir dois produtos do mesmo achado: um técnico e um para gestão.
4. Conduzir um exercício de mesa baseado em cenário de APT.
5. Encerrar o ciclo: transformar análise em decisão de negócio.

---

## ⚠ Escopo e responsabilidade

Atribuição tem **consequência real**. Em contexto corporativo, uma atribuição errada leva a
decisão errada de investimento. Em contexto geopolítico, tem peso diplomático e legal.

⚠ **Este módulo não ensina a evadir atribuição.** Não há seção sobre como esconder rastro, sobre
infraestrutura que dificulta correlação, nem sobre plantar falso indicador. Tudo aqui é método de
**quem analisa**, não de quem opera.

⚠ **Nada aqui autoriza ação contra infraestrutura identificada.** Atribuir é entender; não é agir.
Qualquer resposta é decisão de organização, com o jurídico, e frequentemente com autoridade externa.

---

## 9.1 O que atribuição é, e o que ela não é

| Atribuição **é** | Atribuição **não é** |
|---|---|
| Avaliação de probabilidade, com confiança declarada | Certeza |
| Correlação de múltiplas evidências independentes | Conclusão de uma evidência só |
| Produto com limite explícito | Sentença |
| Base para decisão de defesa | Base para ação ofensiva |
| Muda com nova informação | Estática |

⚠ **A frase que resume:** atribuição é **hipótese com grau de confiança** — e ela muda quando
aparece dado novo. Quem trata atribuição como fato encerrado está fazendo fé, não análise.

---

## 9.2 A escala de confiança

Use uma escala declarada. Qualquer escala funciona, desde que seja **usada consistentemente**.

| Nível | Significado operacional | O que o consumidor pode fazer |
|---|---|---|
| **Alta** | Múltiplas evidências **independentes** convergem; explicação alternativa é implausível | Decidir com base nela |
| **Moderada** | Evidência consistente com a hipótese; existe explicação alternativa crível | Usar como **uma** entrada, buscar confirmação |
| **Baixa** | Pouca evidência, ou evidência com explicação alternativa igualmente provável | Não decidir; é ponto de partida de investigação |
| **Desconhecida** | Não há base | Dizer "não sei" |

⚠ **"Baixa" não é fracasso — é honestidade.** Um analista que declara confiança baixa é mais útil
que um que força "alta" sem base, porque o consumidor sabe o que fazer com cada um.

⚠ **A palavra "independentes" na definição de alta é o critério mais importante e o mais violado.**
Cinco indicadores extraídos do **mesmo** relatório de terceiro **não são** cinco evidências
independentes — são **uma**. Independência significa: fontes diferentes, métodos diferentes, que
poderiam discordar.

| Parece independente | É independente? |
|---|---|
| Mesmo IOC em três feeds de ameaça | ✗ — todos beberam da mesma origem |
| TTP próprio + infraestrutura + código | ✓ — três métodos distintos |
| Três relatórios do mesmo fornecedor | ✗ — mesma análise |
| Telemetria própria + relatório de terceiro + código | ✓ |

---

## 9.3 Os vieses que corrompem atribuição

Este é o conteúdo mais importante do módulo, e vem da análise de inteligência clássica (Heuer).

| Viés | Como aparece | Antídoto |
|---|---|---|
| **Viés de confirmação** | Você procura evidência do que já acredita | Procure **ativamente** o que refutaria |
| **Ancoragem** | A primeira hipótese contamina tudo | Liste 3 hipóteses antes de analisar |
| **Atribuição por ferramenta** | "Usa Mimikatz → é grupo X" | Ferramenta vaza, é vendida, é plantada |
| **Viés de disponibilidade** | O ator que você mais leu parece o mais provável | Baseie em dado do seu ambiente |
| **Falso consenso** | "Todos concordam" — mas todos leram a mesma fonte | Verifique independência |
| **Necessidade de fechar** | Pressão para concluir | Declare confiança baixa quando for o caso |

### A técnica que mais reduz viés: a hipótese concorrente

⚠ **Antes de concluir, escreva a hipótese alternativa.** Literalmente:

```
HIPÓTESE A:  A atividade é do grupo X.
HIPÓTESE B:  A atividade é de outro grupo que compartilha ferramenta com X.
HIPÓTESE C:  A atividade é de um imitador (falso indicador plantado).
HIPÓTESE D:  A atividade é de pentest autorizado que não fomos informados.
HIPÓTESE E:  A atividade é erro de configuração que imita TTP.

Para cada uma: que evidência a apoiaria? Que evidência a refutaria?
```

⚠ **A hipótese C (imitador) e a D (pentest não avisado) são as mais ignoradas e as que mais
causam erro.** Ferramenta de ataque é pública; qualquer um pode usar o TTP de um grupo conhecido.
E "pentest contratado por outra área e não comunicado" é uma causa real de incidente falso.

---

## 9.4 Dois produtos, um achado

O mesmo conteúdo, escrito duas vezes, para dois consumidores. **Não é o mesmo documento
encurtado** — é documento diferente.

### Produto técnico

```markdown
TLP:AMBER

# [Achado] — Análise Técnica
Data: 2026-10-18   Analista: <nome>   Confiança: moderada

## 1. Sumário
2–4 frases: o que foi observado, o que significa, o que fazer.

## 2. Observação
O que foi observado, com timestamp e host.

## 3. Evidência
| Evidência | Fonte | Independência | Sustenta o quê |

## 4. Avaliação
Hipótese principal, hipóteses concorrentes, e por que foram descartadas
(ou não). Confiança e raciocínio.

## 5. TTP (ATT&CK)
Técnica, ID, e o comportamento exato que a sustenta.

## 6. Indicadores
| Tipo | Valor | Vida útil estimada |

## 7. Implicação
O que isso muda, tecnicamente.

## 8. Ação recomendada
| Ação | Responsável | Prazo |

## 9. O que não se pode concluir
```

### Produto para gestão

```markdown
TLP:AMBER

# [Título em linguagem de negócio]
Data: 2026-10-18

## O que aconteceu
Duas frases, sem sigla, sem nome de ferramenta.

## Por que importa para nós
Em termos de: dado, operação, cliente, obrigação legal, reputação.
Escolha o que se aplica.

## O que estamos fazendo
Três linhas, no máximo.

## O que precisamos decidir
| Decisão | Quem decide | Prazo | Custo das opções |

## O que acontece se não decidirmos
Uma frase, consequência concreta.
```

⚠ **O teste do produto para gestão:** um diretor que nunca ouviu "ATT&CK" consegue tomar a decisão
com o que está na página? Se a resposta depende de saber o que é TTP, você escreveu para o
consumidor errado.

⚠ **A seção "o que precisamos decidir" é o que faz o produto útil.** Um relatório que descreve sem
pedir decisão é informativo e inútil. **Toda análise leva a uma decisão, ou a nenhuma.**

---

## 9.5 O exercício de mesa (tabletop)

O formato de treino mais eficaz para cenário de APT, e o mais barato.

### Estrutura

| Elemento | Descrição |
|---|---|
| **Duração** | 2 a 3 horas |
| **Participantes** | Técnico, gestão, jurídico, comunicação, negócio afetado |
| **Facilitador** | Conduz o cenário, **não** participa da decisão |
| **Injeções** | Informação nova revelada em intervalos — muda o cenário |
| **Entregável** | Lista de **lacunas de processo**, não de tecnologia |

⚠ **O valor do tabletop é descobrir lacuna de **processo**, não de ferramenta.** Você descobre:
quem decide, quem comunica, com que autoridade, em quanto tempo, por qual canal.

### As injeções, e o que cada uma testa

| Injeção | Testa |
|---|---|
| "O EDR alerta em um host. É falso positivo?" | Triagem; quem decide escalar |
| "É positivo, e o host é do financeiro." | Priorização; comunicação |
| "Aparece persistência em mais 3 hosts." | Escopo; autoridade de contenção |
| "O cliente A pergunta se o dado dele vazou." | Contrato; comunicação externa |
| "O jurídico pergunta se há obrigação de notificar." | Processo legal |
| "A imprensa ligou." | Porta-voz; o que se pode dizer |
| "O ator está ativo agora, cifrando." | Decisão sob pressão |
| "Descobrimos que o acesso começou 7 meses atrás." | Retenção; retroatividade |
| "O backup mais recente é de 40 dias e nunca foi testado." | Resiliência (Módulo 11 do curso de malware) |

⚠ **A injeção "a imprensa ligou" é a que mais revela lacuna em organização média.** Quase sempre
a resposta é "ninguém sabe quem fala com a imprensa" — e isso é uma decisão que precisa ser
tomada **antes** do incidente.

---

## 9.6 LAB — Atribuir, produzir e conduzir exercício

**Duração:** 120 min

### Passo 1 — Atribuição com hipóteses concorrentes (30 min)

Use o caso do Módulo 6 ou um caso real de relatório público.

⚠ **Leitura de relatório. Nenhuma consulta a infraestrutura.**

Produza `atribuicao.md`:

**A. Liste pelo menos quatro hipóteses concorrentes:**

| # | Hipótese | Que evidência a apoiaria | Que evidência a refutaria | Status |
|---|---|---|---|---|
| A | É o grupo X | | | |
| B | Grupo que compartilha ferramenta com X | | | |
| C | Imitador / falso indicador plantado | | | |
| D | Pentest autorizado não comunicado | | | |
| E | Erro de configuração que imita TTP | | | |

**B. Tabela de evidência com independência:**

| Evidência | Fonte | Método | **Independente?** | Sustenta |
|---|---|---|---|---|
| | | | | |

**C. Avaliação:**

```
Hipótese mais provável:
Confiança: [alta / moderada / baixa / desconhecida]
Raciocínio (por que esta e não as outras):
Hipóteses descartadas, e por quê:
Hipóteses NÃO descartadas (e por quê não dá para descartar):
```

**Responda:**

1. Quantas das suas evidências são **realmente independentes**? Como você verificou?
2. Qual das cinco hipóteses você **não consegue** descartar com o dado que tem?
3. Sua confiança é alta, moderada ou baixa? **Justifique por que não é o nível acima.**
4. Se aparece nova informação que aponta para outro grupo, **sua avaliação muda como?** O que
   isso diz sobre o produto?

⚠ **A resposta 3 é o ponto.** Você precisa justificar **por que não é mais confiante** — não só
por que é.

### Passo 2 — Escreva os dois produtos (40 min)

Do **mesmo** achado, produza:

**`produto-tecnico.md`** — com as nove seções do modelo 9.4.
**`produto-gestao.md`** — com as cinco seções, **no máximo uma página**.

⚠ **Depois de escrever os dois, faça o teste:**

```bash
# Contagem de siglas não explicadas no produto de gestão
grep -oE '\b[A-Z]{2,}[0-9]*\b' produto-gestao.md | sort -u

# Se aparecer ATT&CK, TTP, EDR, SIEM, IOC, C2, T1566... sem explicação,
# o produto está escrito para o consumidor errado.
```

**Responda:**

1. Que informação do produto técnico **não** entrou no de gestão? Por quê?
2. Que informação **só** existe no de gestão? Por quê?
3. Qual dos dois você levaria a uma reunião de diretoria? O que você adaptaria?
4. **O produto de gestão pede alguma decisão?** Se não, reescreva-o para pedir.

### Passo 3 — Desenhe o exercício (30 min)

Produza `tabletop.md` com o desenho completo, para o cenário do curso:

| Turno | Injeção | Informação nova | Pergunta ao grupo | Decisão esperada | **Lacuna que testa** |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| ... | | | | | |

**Depois, o plano de facilitação:**

```markdown
## Participantes e papéis
| Papel | Quem | Precisa estar? |
|---|---|---|

## Regras
- Ninguém sai do papel
- Facilitador não decide
- Toda decisão é registrada com quem decidiu

## Materiais necessários
- Plano de resposta a incidente atualizado?
- Lista de contatos de emergência?
- Canal alternativo de comunicação definido?
- Apólice de seguro, à mão?

## Critérios de sucesso do exercício
(mede PROCESSO, não tecnologia)
- [ ] Ficou claro quem decide sobre contenção?
- [ ] Ficou claro quem comunica externamente?
- [ ] Caminho de decisão sobre resgate está definido?
- [ ] Canal alternativo foi usado de verdade?
- [ ] Registro das decisões foi feito?
```

⚠ **Os "materiais necessários" são as perguntas cujo "não" é o resultado do exercício.** Se o
plano de resposta não existe ou está desatualizado, o tabletop acabou de descobrir isso — e isso
é o valor dele.

### Passo 4 — Conduza (se puder) ou simule (20 min)

Se você tiver com quem conduzir, conduza os turnos 1 e 2 e registre.

Se não, percorra **você mesmo** cada injeção, respondendo:

| Injeção | O que eu faria | Com que autoridade | Em quanto tempo | **O que eu não sei responder** |
|---|---|---|---|---|
| | | | | |

⚠ **A última coluna é o entregável.** Cada "não sei responder" é uma lacuna real de processo — e a
lista dela é o resultado do exercício.

### Critérios de aceitação

- `atribuicao.md` com **quatro ou mais** hipóteses concorrentes e a tabela de independência.
- Você verificou a independência das evidências e explicou como.
- Você **justificou por que não é mais confiante**, não só por que é.
- Você nomeou uma hipótese que **não consegue descartar** com o dado disponível.
- `produto-tecnico.md` com as nove seções.
- `produto-gestao.md` com **no máximo uma página** e sem sigla não explicada.
- O produto de gestão **pede uma decisão**.
- `tabletop.md` com pelo menos **seis** injeções e a lacuna que cada uma testa.
- Sua lista de "o que eu não sei responder" tem no mínimo três itens.
- Nenhuma consulta a infraestrutura de ator.

---

## Avaliação

1. Diferencie "atribuição é" e "atribuição não é" em quatro pares.
2. Explique a escala de confiança e o que o consumidor faz com cada nível.
3. **Por que a palavra "independentes" é o critério mais violado?** Dê um exemplo de três
   evidências que **parecem** independentes e não são.
4. Cite cinco vieses de atribuição e o antídoto de cada um.
5. Qual é a técnica que mais reduz viés? Descreva-a com um exemplo.
6. Por que as hipóteses "imitador" e "pentest não comunicado" são as mais ignoradas?
7. Por que os dois produtos são documentos **diferentes** e não o mesmo encurtado?
8. Qual é o teste do produto para gestão? O que ele precisa conter para passar?
9. Por que "o que precisamos decidir" é a seção que faz o produto ser útil?
10. Qual é o valor de um exercício de mesa — lacuna de processo ou de tecnologia? Justifique.
11. Qual injeção mais revela lacuna em organização média? Por quê?
12. Por que declarar confiança **baixa** é mais útil que forçar alta?

---

## Encerramento do curso

Você começou distinguindo APT de crime organizado e termina escrevendo produto de inteligência com
confiança declarada e conduzindo um exercício de resposta.

O que você aprendeu não é "coisas sobre atores". É **um método** — direção, coleta, análise com
hipótese concorrente, detecção de comportamento, e declaração honesta do que não se pode concluir.
Um método que funciona quando o ator muda, quando a ferramenta muda, e quando o cenário geopolítico
muda.

E a última coisa, que vale para toda a prática: **contra ator avançado, você não ganha por
bloqueio — você ganha por tempo.** Detecção mais cedo na cadeia, retenção de log que permite olhar
para trás, inventário que revela o que mudou, e um processo de decisão que funciona sob pressão.

Referências para continuar: **MITRE ATT&CK** e **Navigator** · **CISA advisories** ·
**The DFIR Report** · **MISP / OpenCTI** · **Pyramid of Pain** (Bianco) · **Diamond Model** ·
**"Intelligence-Driven Incident Response"** · **TLP (FIRST)**
