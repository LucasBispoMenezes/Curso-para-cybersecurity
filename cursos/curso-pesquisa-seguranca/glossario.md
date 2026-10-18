# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Advisory** | Security advisory | M4 | Aviso de segurança de um fornecedor. ⚠ Escrito para quem vai **atualizar**. |
| **Advisory (formato)** | — | M11 | O relatório de uma página. **Omite o caminho de exploração de propósito.** |
| **Alvo** | Target | M2 | O objeto da pesquisa. **Escolhido por vantagem relativa.** |
| **Artefato** | Artifact | M5 | Código, dataset ou toolkit de um paper. **O que permite o passo 3.** |
| **AST (análise)** | Abstract Syntax Tree | M7 | Busca pela **estrutura** do código, não pelo texto. `semgrep`. |
| **Até N×** | — | M5 | ⚠ O **melhor caso**, não a média. Ler a tabela. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Backlog** | Backlog | M8 | As perguntas abertas. **A fila do que fazer.** |
| **BinDiff** | BinDiff | M3 | Ferramenta de diff de binário. |
| **Binário (diff)** | Binary diffing | M3 | Comparar dois binários. ⚠ **A proveniência do build importa.** |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Caderno** | Lab notebook | M8 | O registro. **O produto da pesquisa.** |
| **Classe** | Class | M4 | O tipo do bug. ⚠ **É o padrão.** |
| **CodeQL** | CodeQL | M7 | Análise de **fluxo de dados**. Nível 4 da escada. |
| **Conferência** | — | M5 | USENIX Security, NDSS, IEEE S&P, CCS. |
| **Confusão de camada** | Layer confusion | M2 | A camada de cima decide algo que a de baixo re-lê. |
| **Contribuição** | Contribution | M5 | O que o paper realmente entrega. ⚠ Nem sempre o que ele diz. |
| **Convergência** | Convergence | M12 | Quando três insumos apontam o mesmo padrão. |
| **Custo afundado** | Sunk cost | M9 | ⚠ O tempo gasto **não** deve influenciar a decisão. |
| **Critério de falsificação** | Falsification criterion | M6 | ⚠ O que derruba a hipótese. **Sem ele, é expectativa.** |
| **Critério de parada** | Stopping criterion | M9 | Quando parar. **Escrito ANTES.** |
| **CWE** | Common Weakness Enumeration | M4 | A **classe** do bug. ⚠ **A melhor pista de um advisory.** |
| **CVSS** | Common Vulnerability Scoring System | M4 | ⚠ Mede **impacto**, não padrão. **O último critério.** |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Deriva de** | — | M8 | Ligação: esta investigação nasceu daquela. |
| **Destrava** | — | M8 | Ligação: esta abriu aquela pergunta. |
| **DiffRays** | DiffRays | M3 | Ferramenta que baixa e diffa por CVE. **Automatiza o passo que trava.** |
| **Discrepância** | Discrepancy | M7 | ⚠ Dois comportamentos diferentes. **É candidato, não bug.** |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **EnBinDiff** | EnBinDiff | M4/M7 | Achou 20 1-days. Falso negativo de 11% → 1,63%. |
| **Escada de busca** | — | M7 | Os cinco níveis: termo, estrutural, AST, CodeQL, diferencial. |
| **Espaço em branco** | White space | M5 | ⚠ **O que o paper não testou.** O mais valioso. |
| **Evidência** | Evidence | M8 | ⚠ **Comando e saída, literais, com data e versão.** |
| **Expectativa** | Expectation | M6 | ⚠ Não é hipótese. **Não se falsifica.** |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Falsificou** | Falsified | M6/M9 | A hipótese caiu. ⚠ **É resultado.** |
| **Falso positivo** | False positive | M7 | ⚠ Os cinco: chamador, outra camada, inalcançável, spec, código morto. |
| **FSOP / fuzzing diferencial** | Differential fuzzing | M7 | Comparar o **comportamento** de duas implementações. |
| **Fuzzing dirigido** | Directed fuzzing | M7 | O patch define o **alvo** do fuzzer. `1dFuzz`. |

## G

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Ghidra** | Ghidra | M3 | SRE livre. **Version Tracking** para diff. |
| **Grafo** | Graph | M8 | O caderno não é lista — é **grafo** de ligações. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **HTTP Garden** | HTTP Garden | M2/M4 | Achou 100+ bugs de parsing por fuzzing diferencial. |
| **Hipótese** | Hypothesis | M6 | ⚠ Afirmação **falsificável**, com observação e critério. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Inconclusivo** | Inconclusive | M6/M9 | ⚠ **O TESTE falhou**, não a hipótese. |
| **Insumo** | Input | M6 | De onde a hipótese vem: patch, CVE, paper, leitura. |
| **Invariante** | Invariant | M3 | Afirmação que **DEVE** valer num ponto do programa. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Leitura** | Reading | M10 | ⚠ **Sempre legítima.** Material publicado. |
| **Limitação declarada** | Stated limitation | M5 | O que os autores admitem. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Maturidade** | Maturity | M2 | Quanto o alvo já foi auditado. ⚠ **Alto é ruim.** |
| **Método (três passos)** | Three-pass approach | M5 | Keshav. Passagem, leitura, estudo. |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Nota técnica** | Technical note | M11 | O registro **completo**. Não omite nada. |
| **NVD** | National Vulnerability Database | M4 | Base de CVE. ⚠ Menos detalhe que o GitHub. |

## O

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Operador** | Operator | M1 | Executa **escopo**. Diferente de pesquisador. |
| **oss-fuzz** | oss-fuzz | M2 | Fuzzing contínuo do Google. ⚠ **Estar lá muda o que sobra.** |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Padrão** | Pattern | M3 | ⚠ **A forma, sem nomes.** O que você procura em outros lugares. |
| **Parser differential** | Parser differential | M2 | Dois parsers, mesmo dado, resultados diferentes. |
| **Pergunta** | Question | M1 | ⚠ **O instrumento.** Específica, falsificável, informada. |
| **PLocator** | PLocator | M3 | Localiza o código do patch a partir do patch + referências. |
| **Proveniência (build)** | Build provenance | M3 | ⚠ Mesmo fornecedor, mesmo compilador. **Sem isso, o diff é ruído.** |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Reflexo** | — | M1 | A habilidade treinada. **Ler patch, CVE e paper.** |
| **Região produtiva** | Productive region | M2 | Onde ainda dá trabalho original. **Cinco delas.** |
| **Relatório** | Report | M11 | 5–15 páginas. Método, resultado, limitação. |
| **Reprodutibilidade** | Reproducibility | M8 | ⚠ Outra pessoa consegue refazer? |
| **Ruído (diff)** | Noise | M3 | ⚠ Mudança de **forma**, não de fluxo. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **`security.txt`** | RFC 9116 | M10 | Canal de reporte declarado. |
| **Semgrep** | Semgrep | M7 | Busca por AST. Nível 3. |
| **Sete perguntas** | — | M1 | O instrumento que percorre o curso. |
| **Sibling bug** | Sibling bug | M7 | O mesmo padrão, em outro lugar do mesmo projeto. |
| **Silent patch** | Silent patch | M4 | ⚠ Correção **sem advisory**. **O mais valioso.** |
| **Sobras** | — | M8 | ⚠ A pergunta que o passo abriu. **O que acumula.** |
| **Superfície** | Attack surface | M2 | Quanto código processa **dado não confiável**. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Teste** | Test | M10 | ⚠ **Exige autorização escrita.** Não é leitura. |
| **Triagem** | Triage | M4 | ⚠ Por **padrão**, não por CVSS. |
| **1-day** | 1-day | M7 | O bug que o **projeto já sabe** que existe. |
| **0-day** | 0-day | M7 | ⚠ O bug que **ninguém sabia**. Variante por ecossistema. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Variante** | Variant | M7 | O mesmo padrão em outro lugar. **O caminho para o achado.** |
| **Variante analysis** | Variant analysis | M7 | Buscar o padrão corrigido em outros pontos. |
| **Vulnerability note** | Vulnerability note | M4 | Análise de terceiro (VU#, GHSA). **Precisão alta.** |

## W

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **WAFFLED** | WAFFLED | M2 | Burlar WAF por discrepância de parsing. |

---

## As sete perguntas do pesquisador — consulta rápida

| # | Pergunta |
|---|---|
| 1 | **Qual é o invariante?** |
| 2 | Quem confia nesse invariante? |
| 3 | Que suposição o código faz? |
| 4 | O que o patch mudou — e **por que** isso corrige? |
| 5 | **Existe irmão desse padrão?** |
| 6 | Como eu falsifico isto? |
| 7 | O que isso destrava? |

⚠ **A 3 é a mais subestimada** (bug = suposição que não vale). **A 5 é a que produz o achado.**

---

## A fórmula do alvo — consulta rápida

$$\text{produtividade} \approx \frac{\text{superfície} \times \text{acessibilidade}}{\text{maturidade} \times \text{competição}}$$

| Eixo | Alto é bom? |
|---|---|
| Superfície | ✓ Sim |
| Acessibilidade | ✓ Sim |
| Maturidade | ⚠ **Não** |
| Competição | ⚠ **Não** |

---

## As cinco regiões produtivas — consulta rápida

| # | Região | Por que sobra |
|---|---|---|
| 1 | **Parser differential** | Dois parsers, mesmo dado |
| 2 | **Confusão de camada** | A de cima decide o que a de baixo re-lê |
| 3 | **Lógica / invariante** | ⚠ Nenhum fuzzer pega |
| 4 | **Código novo** | Ninguém auditou |
| 5 | **O que você conhece** | Vantagem absoluta |

---

## Os três níveis de leitura de patch — consulta rápida

| Nível | O que dá | Reutilizável? |
|---|---|---|
| 1 — o que mudou | a mudança | ⚠ Não |
| 2 — por que corrige | o mecanismo | Dá este bug |
| **3 — invariante violado** | ⚠ **o PADRÃO** | ✓✓ **Sim — dá o achado** |

---

## Os cinco tipos de variante — consulta rápida

| # | Tipo | Método | Valor |
|---|---|---|---|
| 1 | Mesmo arquivo | ler funções vizinhas | Bom |
| 2 | Por caminho | comparar fast/slow, v1/v2 | Alto |
| 3 | Por formato | `grep` estrutural | Alto |
| 4 | **Por ecossistema** | fuzzing diferencial | ⚠⚠ Máximo (0-day) |
| 5 | **Por especificação** | RFC + N implementações | ⚠⚠ Máximo (0-day) |

---

## A escada de busca — consulta rápida

| Nível | Técnica | Falso positivo | Custo |
|---|---|---|---|
| 1 | `grep` por termo | ⚠ altíssimo | minutos |
| 2 | `grep` estrutural | alto | minutos |
| 3 | `semgrep` (AST) | médio | horas |
| 4 | CodeQL (fluxo) | baixo | ⚠ dias |
| 5 | **Fuzzing diferencial** | médio | dias |

⚠ **O nível 5 é o único que compara COMPORTAMENTO** — e é o que alcança o projeto B.

---

## Os cinco falsos positivos — consulta rápida

| # | Falso positivo | Como detectar |
|---|---|---|
| 1 | O chamador valida | Ler o sítio de chamada |
| 2 | Outra camada valida | Entender a arquitetura |
| 3 | Caminho inalcançável | Ver se alguma entrada chega |
| 4 | A especificação permite | Ler o RFC |
| 5 | Código morto | Ver se está compilado |

---

## Os três tipos de parada — consulta rápida

| Razão | O que significa | Próximo passo |
|---|---|---|
| **Falsificou** | O teste decidiu, e caiu | ⚠ Registrar — **é resultado** |
| **Inconclusivo** | O teste não decidiu | ⚠ **Reformular o TESTE** |
| **Alvo esgotado** | A superfície acabou | Trocar de alvo |

---

## Os quatro vícios de escrita — consulta rápida

| Vício | Consequência |
|---|---|
| **Inflar** | Perde credibilidade |
| **Vago** | Não é acionável |
| **Onisciente** | ⚠ Erro verificável |
| **Longo** | Ninguém lê |

---

## Os seis pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **O pesquisador tem uma PERGUNTA**, não uma tarefa. |
| 2 | **O alvo se escolhe por vantagem relativa**, não por prestígio. |
| 3 | **O patch é a documentação mais honesta** — e o nível 3 dá o padrão. |
| 4 | **Hipótese sem critério de falsificação é expectativa.** |
| 5 | **Falsificar é resultado.** |
| 6 | **Ler é sempre legítimo; testar exige autorização.** |

---

## Onde parar — a linha do curso

| Faz | **Não** faz |
|---|---|
| Lê código publicado | Testa instância de terceiro |
| Reimplementa no seu lab | Envia entrada a serviço alheio |
| **Reporta** o achado | **Testa** para confirmar |
| Alvo próprio, CTF, autorizado | Amplia o escopo "por ser o mesmo padrão" |

⚠ **Art. 154-A e 266 do Código Penal.** **Exploit funcional contra alvo real é crime consumado** —
a execução já é o acesso.

---

*Material didático original. Leitura de código publicado, patch e paper — material de estudo. Nenhum
teste contra sistema de terceiro sem autorização escrita.*
