# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.
A coluna "onde" aponta o módulo em que o termo é usado pela primeira vez.

---

## A

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Achado | Finding | M6 | Comportamento observado que merece investigação. Não é sinônimo de vulnerabilidade comprovada. |
| Ambiente isolado | Sandbox / isolated environment | M1 | Container ou rede sem rota para sistemas de terceiros, onde os labs rodam. |
| Array associativo | Associative array | M1 | Array bash indexado por chave textual (`declare -A`), não por número. |
| Atomicidade de escrita | Write atomicity | M3 | Garantia de que uma operação de escrita acontece por inteiro ou não acontece. `>>` não tem essa garantia entre processos. |

## B

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Backoff | Backoff | M4 | Espera crescente entre tentativas. Reduz carga no alvo e melhora taxa de sucesso. |
| Baseline | Baseline | M6 | Comportamento padrão do alvo, medido com um caminho que não existe. Sem ele, não há como saber o que é anormal. |
| Bloqueio cooperativo | Cooperative locking | M3 | Mecanismo (`flock`) em que só há proteção se todos os escritores o usarem. |
| Brute force de subdomínio | Subdomain brute force | M5 | Testar nomes candidatos contra um domínio para descobrir hosts. Só é lícito no escopo autorizado. |

## C

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Cadeia de resolução | Resolution chain | M5 | Sequência de CNAMEs até o A record final. Pode revelar infraestrutura além do IP. |
| Código de saída | Exit code | M1 | Inteiro de 0 a 255 retornado por um processo. `0` = sucesso. Base de toda composição de scripts. |
| Concorrência | Concurrency | M3 | Execução de múltiplas tarefas que progridem simultaneamente, com ou sem paralelismo real. |
| Corrida de escrita | Race condition / write race | M3 | Bug causado por dois processos escrevendo no mesmo recurso sem coordenação. |
| Curinga | Wildcard | M2 | Caractere que casa com qualquer coisa (`.`, `*`, `?`). Fonte comum de casamento excessivo em regex. |

## D

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Deduplicação | Deduplication | M2 | Remoção de registros repetidos. Em bash, `awk '!v[$0]++'` ou `sort -u`. |
| Descritor de arquivo | File descriptor | M1 | Handle numérico para recurso de I/O. `0` stdin, `1` stdout, `2` stderr; outros livres para uso. |
| Descoberta de conteúdo | Content discovery | M6 | Encontrar caminhos existentes que não estão linkados (via wordlist). |

## E

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Engajamento | Engagement | M1 | Contrato de teste de intrusão, com escopo, janela e regras definidas. |
| Enumeração | Enumeration | M5 | Listagem sistemática de recursos existentes: hosts, subdomínios, portas, serviços. |
| Escopo | Scope | M1 | Conjunto de ativos autorizados. Testar fora dele é crime, ainda que sem intenção. |
| Estágio de pipeline | Pipeline stage | M5 | Script independente com responsabilidade única, que lê de stdin e escreve em stdout. |

## F

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Fingerprinting | Fingerprinting | M5 | Identificação de tecnologia a partir de sinais indiretos (cabeçalhos, título, corpo). |
| Fork bomb | Fork bomb | M3 | Processo que se multiplica até esgotar recursos. `xargs -P 0` é uma versão comportada disso. |
| Fuzzing | Fuzzing | M6 | Envio massivo de entradas para descobrir comportamento inesperado. Requer autorização explícita. |

## G

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Grupo de processos | Process group | M3 | Conjunto de processos relacionados. `--timeout` do `parallel` mata o grupo inteiro. |

## I

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| I/O-bound | I/O-bound | M3 | Tarefa limitada por espera (rede, disco), não por CPU. É onde paralelismo dá ganho quase linear. |

## J

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| JSON Lines | JSON Lines (JSONL) | M5 | Formato com um objeto JSON completo por linha. Ideal para paralelismo + `jq -c`. |

## L

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Lab | Lab | M1 | Exercício prático com alvo descartável local. |
| Limite de concorrência | Concurrency limit | M3 | Número máximo de processos ou conexões simultâneas. Deve vir da regra de engajamento. |
| Log estruturado | Structured logging | M1 | Log em formato parseável (chave=valor ou JSON), em vez de texto livre. |

## N

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Nível de paralelismo | Job count / parallelism level | M3 | Quantidade de tarefas simultâneas. Depende do tipo de trabalho e do alvo. |

## O

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Origem do dado | Data provenance | M5 | Registro de qual fonte produziu cada registro. Necessário para reportar achados com honestidade. |

## P

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Parser | Parser | M2 | Programa que extrai estrutura de texto. `awk`, `jq` e `sed` são parsers especializados. |
| Pipe | Pipe | M1 | Canal que liga stdout de um processo a stdin de outro (`\|`). |
| Pipeline | Pipeline | M2 | Sequência de estágios encadeados, onde a saída de um é entrada do próximo. |
| Porta filtrada | Filtered port | M4 | Porta onde o pacote é descartado sem resposta. Indistinguível de fechada `via /dev/tcp`. |
| Priorização | Prioritization | M5 | Ordenação de achados por relevância. Requer critério explícito — nunca é neutra. |

## R

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Reconhecimento | Reconnaissance | M5 | Fase de coleta de superfície de ataque. Passiva (só consulta) ou ativa (interage com alvo). |
| Regra de engajamento | Rules of engagement | M1 | Documento que define escopo, janela de horário, limites de volume e contatos de emergência. |
| Retomada | Resume | M3 | Recurso do `parallel --resume` que pula jobs já concluídos com sucesso. |
| Retry | Retry | M4 | Reexecução de operação falha. Só faz sentido em falha transitória (rede, 5xx). |

## S

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Severidade | Severity | M6 | Classificação de impacto e urgência de um achado. Inflar é erro profissional grave. |
| Shebang | Shebang | M1 | Primeira linha do script (`#!/usr/bin/env bash`) que define o interpretador. |
| Subshell | Subshell | M1 | Processo filho criado por `( ... )` ou pelo lado direito de um pipe. Variáveis não sobem ao pai. |
| Superfície de ataque | Attack surface | M5 | Conjunto de pontos por onde um sistema pode ser abordado. |

## T

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Template de relatório | Report template | M6 | Estrutura fixa de relatório, preenchida a partir dos dados coletados. |
| Timeout | Timeout | M4 | Limite de tempo para uma operação. `timeout` retorna código `124` quando dispara. |
| TSV | TSV (tab-separated values) | M2 | Formato tabular com tab como separador. Nativo para `awk` e `cut`. |

## V

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Validação | Validation | M2 | Verificação de que a entrada tem o formato esperado, antes de processá-la. |
| Varredura de portas | Port scan | M4 | Teste de quais portas de um host aceitam conexão. |
| Vulnerabilidade comprovada | Confirmed vulnerability | M6 | Achado cuja exploração foi demonstrada com impacto. Distinto de achado. |

## W

| Termo (PT) | Termo técnico (EN) | Onde | Definição |
|---|---|---|---|
| Wordlist | Wordlist | M5 | Lista de candidatos para brute force. Em fuzzing, define o alcance e o custo da operação. |

---

## Termos legais relevantes (Brasil)

| Termo | Onde | Definição |
|---|---|---|
| Art. 154-A, Código Penal | M1 | Invasão de dispositivo informático. Acessar sem autorização, ou sem autorização válida, é crime. |
| Art. 266, Código Penal | M3 | Interrupção ou perturbação de serviço telegráfico, telefônico, informático. Volume excessivo em varredura pode configurar isto. |
| LGPD (Lei 13.709/2018) | M1 | Dados pessoais encontrados durante um teste são dados alheios sob sua guarda. Minimização, sigilo e não retenção. |
| Marco Civil da Internet (Lei 12.965/2014) | M1 | Regime de responsabilidade e direitos no ambiente digital. Contexto para guarda de registros durante o engajamento. |

⚠ Nada aqui é orientação jurídica. Em engajamento real, o contrato e o jurídico do cliente
definem o que é permitido — e esses limites são absolutos.

---

*Material didático original.*
