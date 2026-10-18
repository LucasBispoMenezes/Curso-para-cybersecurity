# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Alcance** | Reach | M8 | ⚠ **Quantas pessoas** o ataque atinge. O cache multiplica. |
| **Atacante** | Attacker | M1 | ⚠ Quem **escreve a sequência de bytes**. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Backend** | Backend | M1 | A camada que **processa**. ⚠ É o **instrumento de medida**. |
| **Buffer de leitura** | Read buffer | M9* | ⚠ Um lê 4 KB, o outro o que vier. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Cadência** | Cadence | M7 | ⚠ **Quando** os pedaços chegam. O `fetch` em stream permite controlá-la. |
| **Cadeia** | Chain | M2 | ⚠ **N** camadas entre o cliente e o backend. |
| **Cache** | Cache | M8 | ⚠ A camada de **maior alcance**. |
| **Cache deception** | Cache deception | M8 | ⚠ Armazenar a resposta **privada** de alguém. |
| **Cache poisoning** | Cache poisoning | M8 | ⚠⚠ Armazenar a resposta **do atacante**, para todos. |
| **Chave do cache** | Cache key | M8 | ⚠ O que o cache usa para decidir "é a mesma requisição". |
| **Chunk** | Chunk | M3 | ⚠ Bloco do `Transfer-Encoding: chunked`. O fim é o chunk 0. |
| **CL.CL** | CL.CL | M3 | Dois `Content-Length`, valores diferentes. |
| **CL.0** | CL.0 | M3 | ⚠ Um header, e o **backend o ignora**. |
| **CL.TE** | CL.TE | M3 | ⚠ O frontend usa CL; o backend, TE. |
| **Cliente** | Client | M2 | Quem **manda** a requisição. |
| **Client-side desync** | Client-side desync | M7 | ⚠ O **navegador da vítima** como camada. |
| **Condições de existência** | — | M2 | ⚠ **As três:** persistência, discordância, repasse do original. |
| **Content-Length** | `Content-Length` | M3 | ⚠ Conta bytes. Um número mentiroso é entrada. |
| **Contagem** | Count | M5 | ⚠ **A medida do desync.** Quantas requisições cada camada viu. |
| **Conversão** | Conversion | M6 | ⚠ A ponte **H2 → H1**. Onde o descenso nasce. |
| **CSRF** | Cross-Site Request Forgery | M7 | ⚠ O que induzir outra pessoa a abrir a página configura. |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Descenso** | Downgrade | M6 | ⚠ **H2 → H1.** A variante moderna. |
| **Desync** | Desync | M1 | ⚠ Os dois parsers ficam com **estados diferentes**. |
| **Desync de cache** | Cache desync | M8 | ⚠ Envenenamento **pela discordância de framing**. |
| **Detector** | Detector | M10 | A regra que **rejeita** a ambiguidade. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Espaço** | Whitespace | M4 | ⚠ **A variante mais simples.** Um byte. |
| **Extensão de chunk** | Chunk extension | M4 | `5;ext` — ⚠ e o espaço antes do `;`. |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Framing** | Framing | M1 | ⚠ **Onde a mensagem termina.** O núcleo do curso. |
| **Frontend** | Frontend | M1 | A camada que **lê e repassa**. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **H2.CL** | H2.CL | M6 | ⚠ O cliente H2 mente no `content-length`. |
| **H2.TE** | H2.TE | M6 | ⚠ O cliente H2 manda o `transfer-encoding` **proibido**. |
| **HTTP/1.1 Must Die** | — | M1 | ⚠ O guia de 2025. Consolidação e variantes novas. |
| **HTTP Garden** | HTTP Garden | M1 | Comparou **N servidores** entre si: 100+ bugs. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Indeterminado** | Inconclusive | M5 | ⚠ Saída **sem resposta**. Reconferir — não é "não funciona". |
| **Invariante de framing** | — | M8 | ⚠ "A leitura consome exatamente os bytes da mensagem." |

## K

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Keep-alive** | Keep-alive | M2 | ⚠ A persistência. **O pré-requisito do desync.** |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Marca** | Marker | M5 | ⚠ **A prova literal.** A string que você escreveu, aparecendo onde não devia. |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Navalha de chegada** | Race condition | M1 | ⚠ A ordem em que as requisições chegam. O desync depende dela. |
| **Navegador** | Browser | M7 | ⚠ A camada que **normaliza, reescreve e decide**. |

## O

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Obs-fold** | Obs-fold | M4 | ⚠ A **continuação de header** com tab. Deprecada, e ainda tolerada. |
| **Offuscação (de TE)** | Obfuscation | M3 | ⚠ `xchunked`, `chunked `, ou o espaço antes do `:`. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Persistência** | Persistence | M2 | ⚠ A conexão que fica. **Sem ela, não há estado a deslocar.** |
| **Pool** | Pool | M7 | ⚠ O conjunto de conexões reusadas. No client-side, é o "backend". |
| **Prioridade (da varredura)** | Priority | M9 | ⚠ Do **barato** ao caro. Começa pelo que custa um byte. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **README do lab** | — | M1 | ⚠ O que registra o que cada pasta guarda. |
| **Reencode** | Re-encode | M2 | ⚠ O que pode **eliminar** ou **criar** a divergência. |
| **Rejeitado** | Rejected | M5 | ⚠ Saída com **4xx**. ✓ **Imune — e é resultado.** |
| **Request smuggling** | Request smuggling | M1 | ⚠ Esconder um pedido no outro. O termo de 2005. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Saídas (as quatro)** | — | M5 | ⚠ Sem efeito, desync, rejeitado, **indeterminado**. |
| **SMUGGLER (ferramenta)** | `smuggler` | M9 | ⚠ Reporta candidatos por **timing** — o sinal mais frágil. |
| **Slowloris** | Slowloris | M7 | ⚠ **Outra linha.** Exaustão, não divergência. |
| **Streaming** | Streaming | M2 | Repassa cada pedaço assim que chega. |
| **Smuggling** | Smuggling | M1 | ⚠ O termo antigo. O moderno é **desync**. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **TE.CL** | TE.CL | M3 | ⚠ O frontend usa TE; o backend, CL. |
| **TE.TE** | TE.TE | M3 | ⚠ Os dois usam TE, e **um não reconhece** o header. |
| **Transfer-Encoding** | `Transfer-Encoding` | M3 | ⚠ Envia em blocos. **A spec moderna diz que vence.** |
| **TTL** | TTL | M8 | ⚠ Quanto o envenenamento dura. Pode ser horas. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Variante** | Variant | M3 | ⚠ O par **(forma, tolerância)**. |
| **Varredura** | Scan | M9 | ⚠ Do barato ao caro, **e para quando acha**. |

## X

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **`X-Forwarded-Host`** | `X-Forwarded-Host` | M8 | ⚠ **Não entra na chave; muda a resposta.** O clássico. |

---

*Onde — M9* refere-se ao **módulo 9 do curso de Parser Differentials**.*

---

## As três condições de existência — consulta rápida

| # | Condição | Se NÃO |
|---|---|---|
| 1 | Conexão **persistente** | ⚠ Não existe |
| 2 | **Duas camadas** que discordam | ⚠ Não existe |
| 3 | A camada A **repassa o original** | ⚠ Não existe |

⚠ **A pergunta única:** "o que esta camada **entrega** à próxima?"

---

## As cinco variantes de TE/CL — consulta rápida

| Variante | Onde está a discordância | O que o atacante explora |
|---|---|---|
| **CL.TE** | O frontend usa CL | O CL mente (menor) |
| **TE.CL** | O frontend usa TE | O CL mente, o chunk não |
| **TE.TE** | ⚠ Um não **reconhece** o TE | A ofuscação do header |
| **CL.CL** | Dois CL, valores opostos | ⚠ Rejeição vs. escolha |
| ⚠ **CL.0** | O backend **ignora** o corpo | ⚠ O fluxo de controle |

---

## As variantes de forma — consulta rápida

| Forma | Válido? | Quem tolera |
|---|---|---|
| `Content-Length: 6` | ✓ | Todos |
| ⚠ `Content-Length: 6 ` | ✗ | Muitos |
| ⚠ `Content-Length : 6` | ✗ | Alguns |
| `Content-Length:\t6` | ✗ | Muitos |
| ⚠ Obs-fold (`\t\r\n`) | ✗ | Parsers antigos |
| ⚠ `5 ;ext` (chunk) | ✗ | Alguns |

⚠ **Custo: um byte.** **Comece por aqui.**

---

## As quatro saídas do harness — consulta rápida

| Saída | Detecção | Ação |
|---|---|---|
| **Sem efeito** | 1 requisição, sem marca | Teste outra variante |
| ⚠ **Desync** | 2+, ou marca no log | ⚠ **Reproduza e documente** |
| **Rejeitado** | 4xx do frontend | ✓ **Imune — registre** |
| ⚠ **Indeterminado** | 0, sem resposta | ⚠ **Reconferir** |

⚠ **"Não funcionou" e "não sei" são coisas diferentes.**

---

## As três medidas — consulta rápida

| Medida | O que é | Força |
|---|---|---|
| **Contagem** | Quantas o backend viu | Média |
| ⚠ **Marca** | A string apareceu? | ⚠ **A mais forte** |
| **Resposta** | 200 ou 400? | Distingue imune |

⚠ **A marca é a prova** porque é **literal**.

---

## O descenso H2 → H1 — consulta rápida

| O cliente H2 manda | ⚠ O proxy escreve em H1 |
|---|---|
| `content-length: 0` + corpo no frame | `CL: 0` + corpo no socket |
| `transfer-encoding: chunked` | `Transfer-Encoding: chunked` |
| Nome com `\r\n` | ⚠ **Duas linhas de header** |
| `:path` com `\r\n` | ⚠ Linha de requisição injetada |

⚠ **O H2 é seguro por construção; a ponte não é.**

---

## Server-side × client-side — consulta rápida

| | Server-side | Client-side |
|---|---|---|
| Quem manda o payload | O **atacante** | ⚠ O **navegador da vítima** |
| Onde a vítima está | Depois, na fila | ⚠ **É o alvo** |
| Alcance | N usuários na fila | ⚠⚠ **Qualquer usuário** |
| O atacante lê? | Às vezes | ⚠ **Não (CORS)** |
| Precisa de | Rede compartilhada | ⚠ Só uma página aberta |

---

## As quatro defesas — consulta rápida

| # | Defesa | Resolve | Custo |
|---|---|---|---|
| 1 | **Rejeitar** a ambiguidade | ⚠ **ELIMINA** | Quebra clientes |
| 2 | ⚠ **Normalizar antes de repassar** | ⚠ **ELIMINA** | Performance |
| 3 | Fechar a conexão | Reduz | Performance |
| 4 | Separar o pool | Reduz o alcance | Recursos |

⚠ **A recomendação principal:** **normalizar antes de repassar** — a única que **elimina** sem
depender de a spec ser seguida.

---

## Os sinais de detecção — consulta rápida

| Sinal | Onde | Falso positivo |
|---|---|---|
| ⚠ **Dois `Content-Length`** | Access log | ⚠ **Nenhum** |
| ⚠ **`TE` + `CL`** | Access log | ⚠ **Nenhum** |
| `TE` com valor estranho | Access log | Baixo |
| Path com CR/LF | Log do backend | Nenhum |
| ⚠ Lentidão | Log do frontend | ⚠ **Alto — ruído** |

⚠ **Instale as duas primeiras.** **E monitorar não é defender.**

---

## Os sete pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **O smuggling é a consequência da discordância sobre o limite.** |
| 2 | **Três condições** — persistência, discordância, repasse do original. |
| 3 | **A contagem é a medida; a marca é a prova.** |
| 4 | **Quatro saídas**, e três delas não são "funcionou". |
| 5 | **O H2 é seguro; a ponte não é.** |
| 6 | **O cache multiplica** o alcance de qualquer divergência. |
| 7 | **A defesa ideal normaliza antes de repassar.** |

---

## Onde parar — a linha do curso

| Faz | **Não** faz |
|---|---|
| N camadas **no seu lab** | ⚠ Camadas de terceiro |
| Mede o desync **em 127.0.0.1** | ⚠ Mede em produção alheia |
| **Reporta** ao mantenedor | Publica antes da correção |
| **Descreve** o impacto | ⚠ **Executa o acesso** |
| Lê a config | ⚠ Testa CDN, WAF ou proxy alheio |

⚠ **As três linhas específicas:**
**o payload** — um smuggler contra terceiro é **crime consumado**; não há "sem intenção".
**a cadência** — contar mensagens é pesquisa; manter conexões é exaustão.
**a página do client-side** — apontá-la para fora, ou induzir alguém a abri-la, é **CSRF** — crime
autônomo.

⚠ **Art. 154-A e 266.** **E o smuggling frequentemente causa os dois:** **você acessa o que não
devia e desincroniza o serviço.**

---

*Material didático original, de propósito defensivo e de pesquisa. Duas camadas ou mais, sempre no
laboratório próprio, ou com autorização escrita. Nenhum payload é enviado a serviço de terceiro. O
achado é reportado ao mantenedor — nunca usado contra sistema alheio. Request smuggling contra
infraestrutura de terceiro é crime (art. 154-A e 266).*
