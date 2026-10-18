# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Ambiguidade** | Ambiguity | M2 | ⚠ Uma entrada que **admite duas leituras**. O caso mais produtivo. |
| **Assimetria** | Asymmetry | M8 | ⚠ WAF rígido na comparação, frouxo no repasse. |
| **Automação** | — | M5 | ⚠ **Para na detecção.** O julgamento não se codifica. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Bypass** | Bypass | M8 | ⚠ WAF passou **e** servidor executou. Medido, não afirmado. |
| **Boundary** | Boundary | M6 | O delimitador de partes no multipart. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Cadência** | Cadence / Pacing | M9 | ⚠ **Quando** os pedaços chegam. Divergência de **tempo**. |
| **Camada** | Layer | M7 | ⚠ Qualquer componente que **lê e reescreve** a mensagem. |
| **Carta de divergência** | Divergence map | M2 | ⚠ Os pontos onde a spec deixa em aberto. **Vem antes do teste.** |
| **Categoria** | Category | M3 | ⚠ **As três:** legítima, ambiguidade, viola a spec. |
| **Chunked** | Chunked transfer | M6 | ⚠ `Transfer-Encoding: chunked`. O fim é o chunk 0. |
| **Consequência objetiva** | Objective consequence | M3 | ⚠ Sobram bytes? Serve o errado? **Resolve a dúvida sem culpado.** |
| **Content-Length** | `Content-Length` | M6 | Conta bytes. ⚠ Um número mentiroso é entrada. |
| **Corpus** | Corpus | M5 | ⚠ **De fronteira**, um caso por ponto. Não é aleatório. |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Desvio** | Divergence | M7 | ⚠ O ponto onde a **cadeia discorda de si mesma**. |
| **Divergência legítima** | Legitimate divergence | M3 | ⚠ Categoria 1. A spec permite as duas. **Não é bug.** |
| **Dupla decodificação** | Double decoding | M8 | ⚠ O cluster de bypass **mais comum**. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Especificação** | Specification | M2 | ⚠ Não é um programa: é **frases com força diferente**. |
| **Extensão** | Extension | M2 | ⚠ Tipo 7: a spec permite `X-`. O que um ignora, o outro processa. |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Falso positivo** | False positive | M3 | ⚠ Divergência que **não** é bug. Eliminado pelas cinco perguntas. |
| **Framing** | Framing | M6 | ⚠ **Onde a mensagem termina.** Onde o bug mora. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Harness diferencial** | Differential harness | M5 | ⚠ Mesma entrada, N saídas, comparação. **Não é fuzzer.** |
| **`HTTP Garden`** | HTTP Garden | M7 | ⚠ Comparou **N servidores** entre si: 100+ bugs. |
| **HPP** | HTTP Parameter Pollution | M8 | ⚠ Parâmetro duplicado: o WAF vê um, o servidor usa outro. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Implementação** | Implementation | M1 | Um dos N que respondem à mesma spec. |
| **Implementação-definido** | Implementation-defined | M2 | ⚠ A spec **dizendo** que não decide. Ouro. |
| **Intervalo de divergência** | Divergence window | M9 | ⚠ O achado **não é um valor** — é o intervalo de cadências. |
| **Invariante de framing** | — | M6 | ⚠ "A leitura consome **exatamente** os bytes da mensagem." |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Lista negra / branca** | Blacklist / Whitelist | M8 | ⚠ O WAF pergunta "isto é proibido?"; o servidor, "isto é válido?". |
| **Leitura por força** | — | M2 | ⚠ `grep` por `should` / `may` / `silent`. O mapa da divergência. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Matriz de comportamento** | Behavior matrix | M4 | ⚠ Entradas × implementações. A discordância é **por linha**. |
| **`MUST` / `SHOULD` / `MAY`** | — | M2 | ⚠ Obrigatório, recomendado, opcional. **A força da frase.** |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Normalização** | Normalization | M8 | ⚠ Para **comparar** (WAF) vs. para **processar** (servidor). |
| **Normalizador** | Normalizer | M5 | ⚠ Remove o que o **ambiente** introduz. Preserva o que o parser produz. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Parser differential** | Parser differential | M1 | ⚠ A discordância **É** o bug. |
| **Propósito** | Purpose | M2 | ⚠ O que a implementação **quer**. Explica a divergência. |
| **Ponto de divergência** | Divergence point | M2 | ⚠ Onde a spec deixa em aberto. É a unidade da carta. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Repassador** | Forwarder | M8 | ⚠ O componente do WAF que **repassa o original**. Explica o bypass. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Silêncio** | Silence | M2 | ⚠ Tipo 1: a spec **não trata**. Origem principal. |
| **Smuggling** | Request smuggling | M6 | ⚠ Bytes que sobram **viram a próxima mensagem**. |
| **Slowloris** | Slowloris | M9 | ⚠ **Outra linha.** Exaustão, não divergência. Crime contra terceiro. |
| **Sniffing de camada** | — | M7 | Medir o que cada camada da cadeia viu. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Três níveis** | Three levels | M6 | ⚠ O que discorda · por que importa · **o invariante**. |
| **Timeout** | Timeout | M9 | ⚠ ⚠ A spec **não especifica**. Origem da divergência temporal. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **`WAFFLED`** | WAFFLED | M8 | ⚠ 120+ exploits contra 5 WAFs. |
| **WAF** | Web Application Firewall | M8 | ⚠ Uma implementação **a mais** — e discorda do backend. |

---

## As três categorias — consulta rápida

| # | Categoria | Definição | Vale? | Destino |
|---|---|---|---|---|
| 1 | **Legítima** | A spec permite as duas | ⚠ NÃO | — |
| 2 | **Ambiguidade** | A spec não decide | ⚠ NÃO | ⚠ O dono da spec |
| 3 | ⚠ **Viola a spec** | Uma (ou as duas) está errada | ⚠⚠ **SIM** | O mantenedor |

⚠ **A pergunta cascata:** Q1 a spec decide? → Q2 as duas seguem? → Q3 quais violam?

---

## As cinco perguntas de verificação — consulta rápida

| # | Pergunta | Elimina |
|---|---|---|
| 1 | A spec decide? | ⚠ Categoria 2 |
| 2 | O desvio é **alcançável**? | Caminho morto |
| 3 | Outra **camada normaliza**? | Divergência que não chega |
| 4 | O desvio tem **impacto**? | Curiosidade |
| 5 | Pode ser **explorado**? | Teórico |

⚠ **O que cada resposta NÃO significa:** "é explorável" **não autoriza nada** — você reporta.

---

## Os sete tipos de ponto — consulta rápida

| # | Tipo | Onde procurar |
|---|---|---|
| 1 | **Silêncio** | os casos não mencionados |
| 2 | **`SHOULD`** | grep `should` |
| 3 | **`MAY`** | grep `may` |
| 4 | **Ambiguidade lexical** | gramáticas alternativas |
| 5 | **Ausência de limite** | campos sem máximo |
| 6 | ⚠ **Ordem não especificada** | onde o "quando" falta |
| 7 | ⚠ **Extensão** | onde permite `X-` |

⚠ **`MUST` é onde testar não rende.** `SHOULD`, `MAY` e o silêncio são onde o rendimento está.

---

## As cinco partes do harness — consulta rápida

| # | Parte | Exige | Se faltar |
|---|---|---|---|
| 1 | implementações | builds locais | nada a comparar |
| 2 | ⚠ **corpus** | a carta | fuzzing cego |
| 3 | executor | timeout + isolamento | travamento |
| 4 | normalizador | o critério | falsos positivos |
| 5 | comparador | agrupamento | leitura manual |

⚠ **As quatro garantias:** não trava · não derruba · não inunda · **não mente**.

---

## Framing — consulta rápida

| Formato | O fim é definido por |
|---|---|
| HTTP/1.1 | ⚠ `Content-Length` **ou** `Transfer-Encoding` |
| HTTP/2 | o frame (tamanho explícito) |
| Multipart | o boundary |
| Chunked | o chunk de tamanho 0 |
| WebSocket | opcode + tamanho |
| CSV | ⚠ a quebra de linha — ou a aspa |

⚠ **O invariante:** "a leitura consome **exatamente** os bytes da mensagem."
⚠ **O sinal:** sobram bytes? **Viram mensagem?** Há caminho entre as camadas?

---

## A assimetria do WAF — consulta rápida

| Dimensão | WAF | Servidor |
|---|---|---|
| Objetivo | ⚠ Rejeitar o ruim | ⚠ Aceitar o bom |
| Decisão | Lista negra | Lista branca implícita |
| Normaliza | Para **comparar** | Para **processar** |
| Caso ambíguo | ⚠ Bloquear | ⚠ Tolerar |
| O resto | ⚠ **Repassa o ORIGINAL** | Executa |

⚠ **A linha que explica tudo:** o WAF compara a forma normalizada e **entrega a original**.

---

## Os cinco pontos do WAF — consulta rápida

| # | Ponto | Mecanismo |
|---|---|---|
| 1 | ⚠ **Dupla decodificação** | WAF 1×, servidor 2× |
| 2 | ⚠ **Case** | WAF case-sensitive, servidor não |
| 3 | ⚠ **Espaço / branco** | Comentário que o WAF não normaliza |
| 4 | ⚠ **Ordem de normalização** | Um remove antes, o outro depois |
| 5 | ⚠ **Parâmetro duplicado** | WAF vê o 1º, servidor usa o último |

⚠ **Os cinco são normalização**, não parsing — é o que distingue do módulo 6.

---

## As quatro combinações de veredito — consulta rápida

| WAF | Servidor | Significa |
|---|---|---|
| Bloqueou | Não executou | ✓ Funcionou |
| Bloqueou | Executou | ⚠ Impossível — não chegou |
| Passou | Não executou | ✓ Funcionou |
| ⚠ **Passou** | ⚠ **Executou** | ⚠⚠ **BYPASS** |

⚠ **A evidência são dois logs**, não uma impressão.

---

## As quatro classes do tempo — consulta rápida

| Classe | Pergunta | Onde mora |
|---|---|---|
| **Framing** | Onde termina? | Espaço |
| ⚠ **Cadência** | **Quando** chegam? | Tempo |
| Timing side-channel | O que o tempo de execução revela? | CPU |
| DoS por lentidão | Quanto recurso consumo? | ⚠ Recurso |

⚠ **O sinal prático:** contar **mensagens** é pesquisa; contar **conexões abertas** é exaustão — pare.

---

## As cinco razões do tempo — consulta rápida

| # | Mecanismo | Onde diverge |
|---|---|---|
| 1 | Timeout de cabeçalho | ⚠ Valores diferentes |
| 2 | Timeout de corpo | Diferentes |
| 3 | Timeout de inatividade | Diferentes |
| 4 | ⚠ **Buffer de leitura** | Um lê 4 KB, outro o que vier |
| 5 | ⚠ **Leitura incremental** | Um espera o fim, outro processa já |

⚠ **O achado é o INTERVALO** — entre os dois timeouts.

---

## Os sete pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **A spec deixa espaços em aberto** — e é onde a divergência nasce. |
| 2 | **Divergência é observação; bug é conclusão.** |
| 3 | **A consequência objetiva resolve a dúvida:** sobram bytes? |
| 4 | **Framing é o caso cujo efeito não se discute.** |
| 5 | **A ferramenta detecta; você julga.** |
| 6 | **A divergência é estrutural** — existe em produtos maduros. |
| 7 | **O tempo também é entrada**, quando a implementação o usa para decidir. |

---

## Onde parar — a linha do curso

| Faz | **Não** faz |
|---|---|
| N implementações **no seu lab** | ⚠ Payload a **WAF de terceiro** |
| Compara processos **locais** | ⚠ Compara serviços em produção |
| **Mede** a discordância | ⚠ **Exaure o recurso** |
| **Reporta** ao mantenedor | Publica antes da correção |
| Escreve o **harness** | ⚠ **Escreve o bypass** |

⚠ **As duas linhas específicas:**
**o WAF** — o teste diferencial exige **N payloads**, não um. E um WAF que processa já foi acessado.
**a cadência** — contar mensagens é pesquisa; manter conexões é crime.

⚠ **Art. 154-A e 266.** **A intenção não muda o enquadramento.**

---

*Material didático original, de propósito defensivo e de pesquisa. Comparação entre implementações
no laboratório próprio, ou com autorização escrita. Nenhum payload é enviado a serviço de terceiro.
O achado é reportado ao mantenedor — nunca usado contra sistema alheio.*
