# Glossário — Segurança de Aplicações com LLM

**Termos do curso, definidos uma vez, em ordem alfabética**

---

## A

**Agente** — Modelo chamado em loop, com o próprio resultado realimentado. ⚠ Cria **iteração**, **realimentação** e **persistência**.

**Allowlist (de destino)** — Lista de destinos permitidos para requisição de saída. ⚠ A defesa de SSRF que **mais resolve**, porque é de rede e não de código.

**Ação (validação de)** — ⚠ A única defesa que **não lê texto**: pergunta *"esta ação deve acontecer?"*. **Não tem bypass por texto** — nenhuma das oito famílias a contorna.

---

## B

**Backdoor por gatilho** — Comportamento normal, e anômalo sob frase específica. ⚠ Estável, persistente e indistinguível sem conhecer o corpus.

**Bypass** — Contornar a defesa em volta do modelo. ⚠ Aqui é **medido** (taxa), não demonstrado.

---

## C

**Canal (F5)** — ⚠ A família mais importante: a instrução entra por conteúdo, ferramenta, memória, metadado ou outro parser. **Não derrota o filtro — passa por fora dele.**

**Classificador (guardrail)** — Um segundo modelo julga o primeiro. ⚠ **Defesa que herda a própria fraqueza** — F6 a derrota.

**Conjunto limpo** — Prompts legítimos usados para medir **falso positivo**. ⚠ Sem ele, um guardrail que bloqueia tudo parece perfeito.

**Contexto (janela)** — O que entra no prompt. ⚠ Quatro vias de saída: resposta, ferramenta, log e memória.

**Controle (medição)** — ⚠ Rodada **sem ataque**. Sem ele, o número não atribui causa.

**`CONTINUA POSSÍVEL`** — ⚠ **A coluna que só este curso tem.** O que o atacante ainda alcança com todas as defesas aplicadas.

---

## D

**Delimitador** — Marca textual de seção (`<doc>`). ⚠ Funciona **enquanto o texto não o contém**; quebrável por falso fechamento.

**Direta (injection)** — O atacante **digita** o prompt. ⚠ A menos interessante: a vítima é ele mesmo.

---

## E

**Envenenamento por eco** — Trecho que o modelo gerou a partir de conteúdo hostil passa a valer como **fala do assistente** nos turnos seguintes.

**Envenenamento de guardrail (F6)** — ⚠ Atacar a defesa: instruir o **classificador** a aprovar. A família mais elegante.

**Exfiltração** — Dado do contexto saindo por onde não devia. ⚠ Quatro vias, e filtrar a resposta cobre uma.

**Extra­ção por estrutura** — ⚠ Pedir uma **tarefa** cujo resultado contém o dado, em vez de pedir o dado. A restrição é sobre **intenção**.

---

## F

**Falso positivo** — Legítimo bloqueado. ⚠ O erro que **desliga a defesa** em produção.

**Família** — ⚠ **Mecanismo**, não acervo. Quem entende gera payload; quem tem lista só repete.

**Fronteira 7** — Aplicação → modelo.

**Fronteira 8** — ⚠ **Modelo → aplicação.** A que ninguém trata como fronteira — e é a que produz tool abuse.

---

## G

**Guardrail** — Defesa em volta do modelo. ⚠ Todo guardrail é **filtro de forma**, e forma é livre.

---

## I

**Indireta (injection)** — ⚠ O atacante **publica conteúdo**; a vítima carrega. O **coração do curso**.

**Instrução** — Texto que o modelo obedece. ⚠ Indistinguível de dado, do ponto de vista dele.

---

## J

**Jailbreak** — Convencer o modelo a dizer/ fazer o que a política dele proíbe. ⚠ É **demonstração**; o curso mede **alcance**.

---

## L

**LLM (como componente)** — Não é a aplicação: é um componente que recebe texto e devolve **texto que pode conter instrução**.

---

## M

**Medição** — Responde *"com que frequência, contra qual alvo, a que custo"*. ⚠ Exige controle, N e critério binário.

**Memória** — Superfície de estado do agente. ⚠ Persiste entre sessões, e cruza identidade se não for por **procedência**.

---

## N

**N** — Número de repetições. ⚠ Sem N não há taxa.

**Normalização** — ⚠ `NFC` vs. `NFD`, caracteres invisíveis. Se o filtro normaliza e o modelo não (ou o contrário), a comparação falha — é **parser differential** aplicado a texto.

---

## O

**Olhar (onde a defesa olha)** — ⚠ A pergunta que define tudo: entrada, conteúdo, prompt, saída ou **ação**.

**Oráculo** — Inferir o dado por perguntas de resposta binária. ⚠ Um bit por pergunta.

---

## P

**Persistência** — O que o agente grava **sobrevive** à sessão. ⚠ Transforma um injection em **estado**.

**Procedência** — ⚠ Quem escreveu, quando, a partir de qual conteúdo, com que autoridade. Sem ela, a memória é **canal anônimo**.

**Prompt injection** — Instrução entregue como dado. ⚠ Não é bug a corrigir — é propriedade do desenho.

---

## R

**RAG** — O sistema busca **pelo** usuário, e o **modelo** vê os resultados. ⚠ O controle de acesso é decisão de projeto: indexação, **busca** ou saída.

**Recusa** — ⚠ **Taxa, não propriedade.** O modelo pode recusar hoje e obedecer amanhã, mesma versão, outra seed.

---

## S

**SSRF (no LLM)** — ⚠ A ferramenta com destino escolhido por texto. O atacante não alcança o serviço — convence o componente que alcança.

**Superfície inauditável** — Corpus de pré-treino, dados de ajuste, hospedagem do provedor. ⚠ Não se audita — **declara-se**.

---

## T

**Temperatura** — ⚠ `0` para **comparar**; e ela **subestima** o risco de produção.

**Token** — Unidade que o modelo recebe. ⚠ Em nenhum ponto há marca de "instrução" versus "dado".

**Tool abuse** — O modelo como **proxy de requisição** com a credencial da aplicação. Quatro formas: destino, argumento de autorização, encadeamento e confusão.

---

## U

**`userfaultfd`** — não é deste curso; pertence ao Linux Internals.

---

## V

**Vetor (de conteúdo hostil)** — Onde o atacante publica: documento, página, e-mail, issue, metadado, resultado de ferramenta, memória.

**Vítima** — ⚠ **Quem carrega o conteúdo**, e com que privilégio. A linha que dá gravidade ao achado.

---

## W

**Webhook** — não é deste curso; pertence ao Web Apps e APIs.

---

## Termos que NÃO são deste curso

| Termo | Curso correto |
|---|---|
| `bind`, parametrização, IDOR, SSRF clássico | **Web Apps e APIs** |
| Framing, desync, `TE`/`CL` | HTTP Smuggling |
| Parser differential, corpus de fronteira | Parser Differentials |
| Taxa de falso negativo, `Sigma`, WAF | **Detecção e Evasão** (mas a aritmética é a mesma do módulo 10) |
| Envenenamento de dado de treino **do lado de quem produz o modelo** | engenharia de ML, não este curso |
| `kmalloc`, `EPROCESS`, `PEB` | Linux Internals / Windows Internals |
| Composição de achados em aplicação web | **Cadeia de Exploração Web** (futuro) |

⚠ **A relação com `Detecção e Evasão` é a mais produtiva do curso:** lá se mede **falso negativo** de uma detecção; aqui, **bypass** de um filtro. ⚠ **É a mesma aritmética de custo**, com dois erros em cada lado — e o falso positivo é o que desliga a defesa nos dois casos.

⚠ **E a diferença de fundo em relação a todos os outros cursos:** aqui a coluna "corrigido" muitas vezes fica **vazia**. O que se entrega é **taxa, contenção e declaração**.

---

*Glossário original do curso. As definições assumem o contexto do material — quando um termo tem uso diferente em outro contexto, vale a definição daqui.*
