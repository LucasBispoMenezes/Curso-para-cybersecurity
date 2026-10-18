# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Advisory** | Security advisory | M1 | O aviso. ⚠ Diz o que fazer, não por quê. |
| **Assinatura (do patch)** | Patch signature | M7 | As operações que o patch acrescenta, traduzidas para o binário. |
| **Atalho** | — | M4 | Os cinco caminhos para achar a função sem ler as 400. |
| **`AutoDiff`** | AutoDiff | M6 | Modo do DiffRays: dado o CVE, baixa e diffa. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **BinDiff** | BinDiff | M6 | Diff estrutural, pontua similaridade. |
| **Build ID** | Build ID | M2 | Hash do build. ⚠ Diferente entre versões é esperado. |
| **Backport** | Backport | M3 | A correção isolada, aplicada na versão antiga. ⚠ O material mais limpo. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Confidence** | Confidence | M6 | ⚠ Confiança do **casamento**. Baixa = diff falso. |
| **Correlator** | Correlator | M4 | Casa funções entre versões. ⚠ Rode vários. |
| **CWE** | Common Weakness Enumeration | M1 | A classe. ⚠ A melhor pista de um advisory. |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Determinismo** | Reproducible build | M2 | ⚠ Dois builds do mesmo fonte são iguais? |
| **`DiffRays`** | DiffRays | M6 | Baixa o par oficial por CVE. |
| **Diaphora** | Diaphora | M6 | Diff no IDA. |
| **`1dFuzz`** | 1dFuzz | M7 | Fuzzing dirigido pela posição do patch. |
| **1-day** | 1-day | M10 | Bug que o **projeto já sabe** que existe. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **`EnBinDiff`** | EnBinDiff | M1 | ⚠ 20 1-days, falso negativo 11% → 1,63%. |
| **Estrutura de fluxo** | Control flow | M5 | ⚠ **O que define sinal.** |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Falso sinal** | False signal | M5 | ⚠ Quatro: registrador, inline, constante deslocada, função nova não chamada. |
| **Forma (do patch)** | Patch shape | M3 | ⚠ **As cinco:** guarda, guarda movida, condição, tipo, validação. |
| **Fronteira** | Boundary | M8 | ⚠ O limite, o limite + 1, o máximo do tipo. |

## G

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Ghidra** | Ghidra | M4 | SRE livre. Version Tracking para diff. |
| **Ghidriff** | Ghidriff | M6 | Ghidra por linha de comando. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Iterar (correlators)** | — | M4 | ⚠ Rodar, avaliar, rodar mais. Parte do método. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Localizar** | Localize | M7 | ⚠ Achar o **lugar** — a função basta. Não a linha. |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **N-1** | N-1 | M2 | A versão **imediatamente anterior**. ⚠ Menor distância, menor ruído. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Padrão** | Pattern | M10 | ⚠ **A pergunta**, sem nomes. O que atravessa projetos. |
| **Patch diffing** | Patch diffing | M1 | Diff de binário. Cenário 2. |
| **`PLocator`** | PLocator | M7 | Localiza o código do patch: patch + 2 referências. |
| **Proveniência** | Build provenance | M2 | ⚠ Mesmo fornecedor, mesmo compilador. **Sem ela, ruído.** |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Refactor** | Refactor | M9 | ⚠ **Reorganiza.** Segurança **restringe**. |
| **Reproducer** | Reproducer | M8 | ⚠ Quatro partes: alvo, entrada, **critério**, ambiente. |
| **Reproduzir** | Reproduce | M8 | ⚠ Confirmar a diferença. **Não é explorar.** |
| **Ruído** | Noise | M5 | ⚠ Mudança de **forma**. Mesmo comportamento. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Sinal** | Signal | M5 | ⚠ Mudança de **controle de fluxo**. Comportamento pode diferir. |
| **Silent patch** | Silent patch | M9 | ⚠ Correção **sem CVE**. **Sem concorrência.** |
| **Similaridade** | Similarity | M6 | ⚠ A ferramenta ordena por ela; **você ordena por fluxo**. |
| **Símbolos** | Symbols | M4 | ⚠ Transformam um diff difícil em fácil. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Triagem** | Triage | M5 | ⚠ Das 400 às 3. Quatro filtros. |
| **Tradução** | — | M7 | Do patch (fonte) para o binário. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Variante** | Variant | M10 | ⚠ O mesmo padrão em outro **projeto**. Vira 0-day. |
| **Version Tracking** | Version Tracking | M4 | A ferramenta do Ghidra para diff. |

## 0

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **0-day** | 0-day | M10 | ⚠ Bug que **ninguém sabia**. Variante por ecossistema. |

---

## As cinco formas do patch — consulta rápida

| # | Forma | Como reconhecer | Invariante |
|---|---|---|---|
| 1 | **Guarda acrescentada** | `+ if` novo | `x <= máx` antes do uso |
| 2 | **Guarda movida** | `if` em dois lugares | o mesmo, na **ordem certa** |
| 3 | **Condição corrigida** | `>` → `>=` | o limite exato |
| 4 | **Tipo alargado** | `uint16_t` → `size_t` | o tipo comporta o valor |
| 5 | **Validação acrescentada** | chamada nova | o dado é válido antes |

⚠ **A forma 2 é a mais sutil** — e **parece refactor**.

---

## Sinal vs. ruído — consulta rápida

| SINAL (fluxo mudou) | RUÍDO (só forma) |
|---|---|
| branch novo | endereço diferente |
| comparação diferente | registrador diferente |
| chamada nova | forma de zerar |
| **constante nova** | instruções reordenadas |
| tipo diferente | inline / desinlined |
| ordem de operações | strings movidas |

⚠ **A pergunta única:** **"o comportamento PODE diferir?"**

---

## Os quatro filtros da triagem — consulta rápida

| # | Filtro | Reduz de → para | Custo |
|---|---|---|---|
| 1 | **tamanho** | 400 → 60 | segundos |
| 2 | branch novo | 60 → 15 | minutos |
| 3 | chamada/constante | 15 → 5 | minutos |
| 4 | leitura | 5 → **resposta** | horas |

⚠ **A proporção típica é 1:100** — e você nunca lê as 400.

---

## Os quatro falsos sinais — consulta rápida

| # | Falso sinal | Como verificar |
|---|---|---|
| 1 | registrador trocado | rastrear de onde o valor vem |
| 2 | função inlined | procurar o código em outro lugar |
| 3 | constante deslocada | o valor é o mesmo? |
| 4 | **função nova** | ⚠ **ela É CHAMADA?** |

---

## Os quatro testes de proveniência — consulta rápida

| # | Teste | Como | ⚠ Se falhar |
|---|---|---|---|
| 1 | arquitetura | `readelf -h` | pare |
| 2 | compilador | `strings \| grep GCC` | ruído garantido |
| 3 | build | Build ID, tamanho | ruído alto |
| 4 | **determinismo** | ⚠ **2 builds e `cmp`** | ⚠ **use o binário oficial** |

⚠ **A regra:** se qualquer um falha, **mude de par** — não é "mais trabalho", é diff inútil.

---

## As três técnicas de localização — consulta rápida

| Técnica | Depende do patch? | Robusta à otimização? | Quando |
|---|---|---|---|
| **A — assinatura** | ✓ sim | ⚠ não | CVE com patch |
| **B — fluxo** | ⚠ não | ✓ sim | ⚠ **silent patch** |
| **C — componente** | parcial | ✓ | CVE com componente claro |

⚠ **A combinação ideal:** **A dirige, C restringe, B confirma.**

---

## Reproduzir vs. explorar — consulta rápida

| Reproduzir (✓) | Explorar (⚠) |
|---|---|
| confirma a **diferença** | obtém **controle** |
| o **seu** alvo | sistema em uso |
| evidência para o relatório | arma |
| **requerido** | ⚠ **não é este curso** |

⚠ **A linha:** *"reproduzir é confirmar a diferença; explorar é obter controle."*

---

## Os quatro critérios: segurança ou refactor — consulta rápida

| # | Critério | Segurança | Refactor |
|---|---|---|---|
| 1 | **aceitação** | ⚠ aceita menos | aceita o mesmo |
| 2 | fluxo | ⚠ branch novo | mesmo fluxo |
| 3 | comportamento | ⚠ difere | idêntico |
| 4 | direção | ⚠ restringe | reorganiza |

⚠ **Quando a dúvida persiste:** **o COMPORTAMENTO é o árbitro.**

---

## Os quatro passos da variante — consulta rápida

| # | Passo | O que exige |
|---|---|---|
| 1 | abstraia o padrão | ⚠ sem nomes |
| 2 | **traduza para pergunta** | ⚠ abstração |
| 3 | liste as implementações | reconhecimento |
| 4 | verifique por leitura | ⚠ trabalho |

⚠ **Você não procura a mesma LINHA — procura a mesma PERGUNTA.**

---

## As quatro partes do reproducer — consulta rápida

| # | Parte | O que é |
|---|---|---|
| 1 | **alvo** | ⚠ qual binário, versão, **hash** |
| 2 | entrada | o que causa a diferença |
| 3 | **critério** | ⚠ como se sabe que reproduziu |
| 4 | ambiente | onde rodou |

⚠ **A parte 3 é a que a maioria esquece.**

---

## Os sete pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **O patch deixa rastro** — e o rastro é localizável. |
| 2 | **A proveniência decide o diff** — sem ela, 400 funções e nenhuma resposta. |
| 3 | **Sinal é mudança de CONTROLE DE FLUXO.** |
| 4 | **A ferramenta ordena por similaridade; você por fluxo.** |
| 5 | **Reproduzir é confirmar; explorar é obter controle.** |
| 6 | **O silent patch não tem concorrência.** |
| 7 | **Onde há especificação, há N implementações.** |

---

## Onde parar — a linha do curso

| Faz | **Não** faz |
|---|---|
| Diff de **binário público** | Binário de cliente sem autorização |
| Reprodução no **seu lab** ou CTF | Reprodução em sistema de terceiro |
| **Reporta** ao mantenedor | Publica antes da correção |
| **Descreve** o impacto | ⚠ **Constrói exploit** |
| Lê N implementações | ⚠ **Testa a instância de N** |

⚠ **Art. 154-A e 266.** **Exploit funcional contra alvo real é crime consumado** — a execução já é
o acesso. **E a linha temporal:** **analisar no dia da divulgação é defesa; usar o 1-day antes da
correção é o crime.**

---

*Material didático original, de propósito defensivo e de pesquisa. Diff de binário público, e
reprodução apenas em alvo próprio, CTF publicado, ou com autorização escrita. O achado é reportado
ao mantenedor — nunca usado contra sistema de terceiro.*
