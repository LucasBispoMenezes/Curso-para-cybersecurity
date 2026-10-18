# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Ação** | Action | M3 | ⚠ **O que o sistema faz** — e é **invariante** sob evasão. |
| **Alerta** | Alert | M6 | ⚠ **O custo** da regra. Some no orçamento. |
| **Aninhamento** | Nesting | M4 | ⚠ O delimitador **dentro de si mesmo**. A evasão mais antiga. |
| **Anomalia** | Anomaly | M3 | ⚠ **A distribuição.** Pega o imprevisto; e o FP é alto. |
| **ATT&CK** | MITRE ATT&CK | M7 | ⚠ **Vocabulário** — não checklist. |
| **Automação** | — | M10 | ⚠ **Para na detecção.** O julgamento não se codifica. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Backend** | Backend | M5 | ⚠ **Onde a ação acontece.** Instrumentar aqui vê o efeito. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Camada** | Layer | M10 | ⚠ **O detector é uma a mais** — e divergência a mais. |
| **Cardinalidade** | Cardinality | M3 | ⚠ Valores **distintos**. Pega enumeração que o volume não pega. |
| **Ciclo purple** | Purple cycle | M8 | ⚠ **Atacar → medir → evadir → medir → ajustar.** |
| **Comportamento** | Behavior | M3 | ⚠ **A ação**, não a forma. Sobrevive à evasão. |
| **Contramedida** | Countermeasure | M9 | ⚠ **Toda tem custo** — exceto o `(?i)`. |
| **Correlação** | Correlation | M10 | ⚠ Ligar dois logs. **A única forma de ver o framing.** |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Detecção** | Detection | M6 | ⚠ **Ataques pegos / ataques totais.** |
| **Detecção por gramática** | — | M4 | ⚠ **Comparar com o válido** — e não com o payload. **Sem FP.** |
| **Dívida (lista de exclusão)** | — | M6 | ⚠ A exclusão reduz o FP hoje e cobra em manutenção. |
| **Dual-use** | Dual-use | M1 | ⚠ **A evasão serve para medir e para atacar.** |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Efeito** | Effect | M5 | ⚠ **O log mais forte.** Não muda com a evasão. |
| **Evasão** | Evasion | M9 | ⚠ **Explorar a discordância** entre o que a regra vê e o alvo processa. |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Falso negativo** | False negative | M1 | ⚠ O ataque que passou. |
| **Falso positivo** | False positive | M6 | ⚠ **O custo central.** Medido, não estimado. |
| **Família (de evasão)** | — | M9 | ⚠ **Sete:** encoding, case, aninhamento, delimitador, fragmentação, ambiguidade, volume. |
| **Família (de detecção)** | — | M3 | ⚠ **Três:** assinatura, comportamento, anomalia. |
| **Forma** | Form | M3 | ⚠ **O que a assinatura compara** — e o que a evasão muda. |
| **Forma original** | — | M5 | ⚠ **Os bytes como chegaram.** Sem ela, a evasão é invisível. |
| **Framing** | Framing | M9 | ⚠ **Onde a mensagem termina.** A família 6. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Hipótese de detecção** | — | M7 | ⚠ **Uma frase que pode estar errada** — e diz como saber. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Indeterminado** | Inconclusive | M6 | ⚠ Alerta que **não se resolve** com o dado. O custo escondido. |
| **Instrumentação** | Instrumentation | M2 | ⚠ **Lacuna de instrumentação** ≠ lacuna de detecção. |
| **Inventário** | Inventory | M2 | ⚠ Preenchido **por teste**, não por suposição. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Lacuna** | Gap | M9 | ⚠ O que a regra **não** pega. **Declarada.** |
| **Log de aplicação** | App log | M2 | ⚠ Nasce para **depurar** — não para detectar. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Moedas (as três)** | — | M5 | ⚠ **Volume, latência, privacidade.** |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Normalização** | Normalization | M4 | ⚠ **O elo fraco.** A ordem muda o resultado. |

## O

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Orçamento de triagem** | — | M6 | ⚠ **N × H × 60 minutos.** Em minutos, não em alertas. |
| **Origem do alerta** | — | M4 | ⚠ O sinal **sem falso positivo** vem da gramática. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Platô** | Plateau | M8 | ⚠ **Δ = 0 por 2+ voltas.** A regra chegou ao limite. |
| **Precisão** | Precision | M6 | ⚠ **TP / (TP+FP).** O número que o analista vive. |
| **Ponto de observação** | Observation point | M2 | ⚠ **Cinco:** rede, access log, app log, SO, endpoint. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Rate limit** | Rate limit | M9 | ⚠ A contramedida da família 7 — **e atinge o legítimo**. |
| **Regra emprestada** | — | M7 | ⚠ Carrega o FP do ambiente de origem. |
| **Rejeitar** | Reject | M4 | ⚠ **Superior a sanitizar** — porque não cria padrão. |
| **Retenção** | Retention | M2 | ⚠ Por quanto tempo o dado fica. **Dimensão da superfície.** |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Sanitizar** | Sanitize | M4 | ⚠ **A defesa que remove é o vetor.** |
| **Sigma** | Sigma | M2 | Formato portável de regra. |
| **Superfície de detecção** | — | M2 | ⚠ **Existência, retenção, acesso.** As três dimensões. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Telemetria** | Telemetry | M5 | ⚠ O dado que existe — e o que falta. |
| **Troca** | Trade | M8 | ⚠ Dobra a detecção e quadruplica o FP: **não é ganho**. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Volume (família 7)** | — | M9 | ⚠ **O ataque ao time.** O mais eficaz e o menos técnico. |

## W

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **WAFFLED** | WAFFLED | M10 | ⚠ **120+ exploits contra 5 WAFs.** O argumento empírico. |
| **WAF** | Web Application Firewall | M10 | ⚠ **Compara o que entendeu e entrega o que recebeu.** |

---

*Onde — M4 refere-se ao módulo 4 deste curso, salvo indicação.*

---

## As três posturas — consulta rápida

| Postura | Custo | Exemplo |
|---|---|---|
| **Prevenir** | Quebra o legítimo | Rejeitar |
| **Detectar** | ⚠ **Falso positivo** | IDS, SIEM |
| **Responder** | Tempo de exposição | SOAR |

⚠ **A pergunta não é "esta regra é boa?"** — é **"quantas vezes ela erra, e alguém vai olhar?"**

---

## As três famílias de detecção — consulta rápida

| Família | Pergunta | ⚠ Falha quando |
|---|---|---|
| **Assinatura** | "Casa com o padrão?" | ⚠ A evasão muda a forma |
| **Comportamento** | "Faz o que não deveria?" | ⚠ O legítimo também faz |
| **Anomalia** | "É diferente do normal?" | ⚠ O normal varia |

⚠ **A assinatura envelhece; a ação não.** **Por grammar > por payload.**

---

## As sete famílias de evasão — consulta rápida

| # | Família | Ataca | Defesa |
|---|---|---|---|
| 1 | **Encoding** | A regra | Alinhar a decodificação |
| 2 | **Case** | A regra | ✓ `(?i)` |
| 3 | ⚠ **Aninhamento** | A sanitização | ⚠ Só rejeitar |
| 4 | **Delimitador** | O parser | ✓ Comparar com a gramática |
| 5 | **Fragmentação** | O transporte | Reinstrumentar |
| 6 | ⚠ **Ambiguidade** | O framing | Correlacionar logs |
| 7 | ⚠ **Volume** | ⚠ **O time** | Orçamento + rate limit |

⚠ **A família 7 não esconde o ataque** — ela enche o detector até a regra ser desligada.

---

## As quatro métricas — consulta rápida

| Métrica | Fórmula | Responde |
|---|---|---|
| Detecção | pegos / totais | A regra serve? |
| FP | alertas / legítimos | Quanto custa |
| **Precisão** | TP / (TP+FP) | ⚠ A proporção útil |
| Custo | min × alertas | O que o time gasta |

| Precisão | Alertas por TP |
|---|---|
| 50% | 1 falso |
| 10% | 9 falsos |
| ⚠ **1%** | ⚠ **99 falsos** |
| 0,1% | 999 falsos |

⚠ **A maioria das regras nasce em 1%.**

---

## O orçamento — consulta rápida

| Item | Valor |
|---|---|
| Orçamento | N analistas × H horas × 60 min |
| Custo por alerta | 5 a 20 minutos |
| Veredito | ⚠ **Aritmético, não moral** |

⚠ **Uma regra acima do orçamento não será triada** — mesmo que esteja perfeita.

---

## O ciclo purple — consulta rápida

| # | Fase |
|---|---|
| 1 | Reproduzir o ataque |
| 2 | Medir a detecção |
| 3 | ⚠ **Evasar — mudar UMA coisa** |
| 4 | Medir de novo |
| 5 | Ajustar, ou **aposentar** |

⚠ **Δ = 0 por 2+ voltas → não ajuste mais. Mude de família.**

---

## O que nenhuma regra pega — consulta rápida

| Lacuna | Contramedida |
|---|---|
| Forma válida | Detecção por comportamento |
| ⚠ Aninhamento | Rejeitar a forma |
| Framing | Instrumentar o backend |
| Ataque lento | Série temporal |
| Distribuído | Correlação entre origens |

⚠ **A do aninhamento não tem solução por regra.**

---

## Os sete pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **Toda regra erra** — a pergunta é quanto custa. |
| 2 | **A precisão é o número que o analista vive.** |
| 3 | **A assinatura envelhece; a gramática não.** |
| 4 | **A defesa que remove é o vetor.** |
| 5 | **O log nasce para depurar; a detecção quer a forma suja.** |
| 6 | **O orçamento é em minutos, e ele acaba.** |
| 7 | **Quando o problema é a camada, a solução é outra camada.** |

---

## Onde parar — a linha do curso

| Faz | **Não** faz |
|---|---|
| Regra no **seu** sensor | ⚠ Testar WAF de terceiro |
| Ataque **simulado** no lab | ⚠ Ataque contra alvo real |
| Evasão **para testar** | ⚠ Evasão para atacar |
| Tráfego legítimo **do lab** | ⚠ Tráfego de produção alheia |
| **Reporta** a falha | ⚠ Publica o bypass |

⚠ **A linha específica:** **você escreve evasão, e ela é dual-use.**
**A diferença entre medir e atacar não está na técnica — está no destino, e na declaração.**

⚠ **Art. 154-A e 266.**

---

*Material didático original, de propósito defensivo e de pesquisa. O atacante é simulado no
laboratório próprio, e a regra roda no sensor próprio. Nenhum teste contra SIEM, WAF ou serviço de
terceiro. A falha de detecção é reportada ao mantenedor — nunca publicada antes da correção. Evasão
usada contra sistema alheio é crime (art. 154-A e 266).*
