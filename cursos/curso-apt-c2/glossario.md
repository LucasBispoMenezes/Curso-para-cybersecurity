# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Adversário | Adversary | M2 | Vértice do Diamond Model: quem executa a intrusão. Sempre com confiança declarada. |
| **ANT** | APT | M1 | Atores avançados e persistentes: persistência intencional, recursos, alvo selecionado. |
| Ancoragem | Anchoring | M9 | Viés: a primeira hipótese contamina toda a análise seguinte. Antídoto: listar 3 hipóteses antes. |
| Antecipação | Anticipation | M6 | Finalidade do mapeamento: identificar o próximo domínio **antes** do uso. |
| Atribuição | Attribution | M9 | Avaliação de probabilidade com confiança declarada. **Não é certeza.** |
| Ausência como sinal | Detection of absence | M7 | Detectar o que **não** aconteceu — heartbeat perdido, log ausente, processo que deveria rodar. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Beacon | Beacon | M5 | Chamada periódica do implant ao C2. Assinatura: periodicidade + volume pequeno e constante. |
| Baseline | Baseline | M7 | O que é normal no seu ambiente. Pré-requisito para detectar desvio e para inventário diferencial. |
| BGP | BGP | M6 | Protocolo de roteamento entre ASNs. Contexto de infraestrutura. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Caça a ameaça | Threat hunting | M8 | Busca proativa guiada por hipótese. Resultado negativo documentado **também é achado**. |
| Camada de C2 | C2 tier | M4 | Nível da arquitetura: implant, entrada, C2 primário, painel. |
| Capacidade | Capability | M2 | Vértice do Diamond Model: ferramenta, exploit, técnica. |
| Certificado | Certificate | M6 | Credencial pública de TLS. Fonte de correlação por SAN, emissor e data. |
| Confiança | Confidence | M9 | Grau declarado da avaliação: alta, moderada, baixa, desconhecida. **Obrigatório em produto.** |
| Correlação | Correlation | M6 | Ligar infraestrutura, código e TTP a um mesmo conjunto de atividade. |
| CT (Certificate Transparency) | Certificate Transparency | M6 | Log público obrigatório de certificados emitidos. Fonte passiva de correlação. |
| CV (coeficiente de variação) | Coefficient of variation | M5 | Desvio padrão ÷ média. Normaliza a dispersão do intervalo. CV < 0.15 indica automação. |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Dado / informação / inteligência | Data / information / intelligence | M2 | Bruto → com contexto → com **relevância e implicação**. Se não muda decisão, não é inteligência. |
| Diamond Model | Diamond Model | M2 | Estrutura de análise: adversário, capacidade, infraestrutura, vítima. |
| Direção | Direction | M2 | Primeira etapa do ciclo: a pergunta do consumidor. A mais negligenciada e a mais decisiva. |
| Domínio | Domain | M6 | Nome de recurso. Analisável por criação, registrador, NS, padrão de nome. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Evidência independente | Independent evidence | M9 | Fonte, método e capacidade de discordar distintos. Três feeds do mesmo IOC = **uma** evidência. |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Falso consenso | False consensus | M9 | Viés: "todos concordam" — mas todos leram a mesma fonte. |
| Fallback | Fallback | M4 | Lista de destino alternativo no implante. Faz do bloqueio de um destino uma ação incompleta. |
| Fingerprint (de certificado) | Certificate fingerprint | M6 | Identificador estável do certificado. Bom pivô de correlação e IOC durável. |
| Fonte aberta | OSINT | M2 | Dado público. Base de toda análise deste curso; **consulta passiva**, nunca interação. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Hipótese concorrente | Competing hypothesis | M9 | Técnica que mais reduz viés: escrever explicitamente as alternativas antes de concluir. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Implant | Implant | M4 | Camada 0: o artefato no host. **É onde o defensor realmente trabalha.** |
| Inventário diferencial | Differential inventory | M7/M8 | Comparação periódica do que existe. A **novidade** é o sinal. Pega presença silenciosa. |
| IOC | Indicator of Compromise | M2 | Hash, IP, domínio, nome. Vida útil curta — a Pirâmide da Dor explica por quê. |
| ISAC | ISAC | M2 | Centro de compartilhamento do setor. Exige **reciprocidade**: você tem de contribuir. |

## J

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Jitter | Jitter | M5 | Variação aleatória do intervalo do beacon. **Não derrota detecção por estatística** — a média continua revelando. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Living-off-the-land | LOTL | M5 | Uso de binário legítimo do sistema para fim malicioso. Quebra detecção por hash. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| MTTD | Mean Time To Detect | M1 | Tempo médio até detecção. Contra APT, o objetivo é **dias**, não horas. |
| Modelo de ameaça | Threat model | M3 | Quem me quer e por quê. Insumos: setor, dado, geografia, relação, posição. |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Nível de confiança | Confidence level | M9 | Ver "Confiança". |
| Nameserver | Nameserver (NS) | M6 | Servidor de DNS da zona. Padrão recorrente revela o ator. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Padrão de nome | Naming pattern | M6 | Estrutura repetida no domínio. Achado mais durável para detecção antecipada. |
| Persistência intencional | Intentional persistence | M1 | Propriedade de APT: o ator **planeja** ficar. Não é ausência de detecção. |
| PIR | Priority Intelligence Requirement | M2 | Necessidade de inteligência priorizada. Precisa ser **respondível**, com consumidor e critério. |
| Pirâmide da Dor | Pyramid of Pain | M2 | Custo crescente para o ator mudar: hash → IP → domínio → artefato → ferramenta → TTP. |
| Pivô | Pivot | M6 | Ir de um indicador a outro pela correlação. Certificado (SAN) é o pivô mais produtivo. |
| Presença silenciosa | Silent presence | M1/M8 | Ator que entra, persiste e **não faz nada**. Só inventário diferencial encontra. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Redirector | Redirector | M4 | Camada 1: ponto de entrada descartável. O IP que você observa provavelmente é isto. |
| Retroatividade | Retro-hunting | M1/M7 | Consulta ao histórico com regra nova. Só existe se a **retenção de log** permitir. |
| RMM | RMM (Remote Monitoring and Management) | M4 | Ferramenta legítima de acesso remoto. Como C2, é o caso mais difícil de detectar. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| SAN | Subject Alternative Name | M6 | Nomes cobertos pelo certificado. Correlaciona vários domínios de uma vez. |
| Sigma | Sigma | M7 | Linguagem de regra de detecção portável, para evento. Comportamento, não artefato. |
| Sigma rule | Sigma rule | M7 | Regra de detecção sobre telemetria. Precisa de bloco de exceção para ser usável. |
| Simulador de tabela | Tabletop | M9 | Exercício de mesa com injeções. Descobre lacuna de **processo**, não de tecnologia. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Tática | Tactic | M3 | O "porquê" na ATT&CK. A ordem das táticas segue aproximadamente a linha do tempo da invasão. |
| Técnica | Technique | M3 | O "como" na ATT&CK. Use a **sub-técnica** quando souber o específico. |
| Tempo de residência | Dwell time | M1 | Da entrada até a detecção. Contra APT, medido em **meses**. |
| TLP | Traffic Light Protocol | M2 | Marcação de compartilhamento: RED, AMBER+STRICT, AMBER, GREEN, CLEAR. |
| TTP | TTP | M3 | Tática, técnica e procedimento. O que o ator **não troca** facilmente. Detecção durável. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Viés de confirmação | Confirmation bias | M9 | Procurar evidência do que já se acredita. Antídoto: buscar ativamente o que **refutaria**. |
| Vítima | Victim | M2 | Vértice do Diamond Model. A relação vítima↔adversário orienta melhor a defesa. |

---

## ATT&CK — consulta rápida por fase

| Fase da cadeia | Tática | O que detectar primeiro |
|---|---|---|
| ① Acesso | Initial Access | Credencial válida fora do padrão; exploit em borda |
| ② Estabelecimento | Persistence | Serviço, tarefa, conta nova; **RMM instalado** |
| ③ Descoberta | Discovery | Enumeração em série; **acesso a nome de backup** |
| ④ Privilégio | Privilege Escalation | **Acesso a lsass**; alteração de permissão |
| ⑤ Lateral | Lateral Movement | Serviço remoto; WMI; **padrão de logon hierárquico** |
| ⑥ Coleta/Exfil | Collection / Exfiltration | Destino novo; **assimetria de volume** |
| ⑦ Impacto | Impact | vssadmin; wevtutil cl; bcdedit |
| ⑧ Pós | Persistence | Backdoor; web shell; **conta de serviço nova** |

⚠ **Contra APT, as fases ①–③ são onde a detecção tem valor.** Detecção tardia não há fase ⑦ para
interromper.

---

## Pirâmide da Dor — consulta rápida

| Nível | Vida útil | Alocar |
|---|---|---|
| Hash | Dias | 10% |
| IP / Domínio | Semanas | 20% |
| Artefato / Ferramenta | Meses | — |
| **TTP** | **Anos** | **70%** |

---

## Fontes de dado — consulta rápida

| Fonte | Custo | Limitação principal |
|---|---|---|
| Advisory de CERT | Grátis | Genérico; atrasado; pode ser político |
| Vendor research | Grátis | Interesse comercial |
| Comunidade / OSINT | Grátis | Sem revisão |
| ISAC | Associação | Exige reciprocidade |
| **Sua telemetria** | Já paga | **Só cobre o que você instrumentou** |
| Transparência de certificado | Grátis | Só o que foi emitido |
| Relatório de IR de terceiro | Contexto | Só existe se alguém contou |

---

## As três regras que atravessam o curso

| Regra | Onde se aplica |
|---|---|
| **Consulta passiva, nunca interação** | Todo mapeamento de infraestrutura (M6) |
| **Confiança declarada e limite declarado** | Todo produto (M9) |
| **Regra de detecção testada, com falso positivo nomeado** | Toda detecção (M7) |
| **Análise de comportamento, não de indicador** | Toda priorização (M3) |

---

*Material didático original, de propósito defensivo e passivo.*
