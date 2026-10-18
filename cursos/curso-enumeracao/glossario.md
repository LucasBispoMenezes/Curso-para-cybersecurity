# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Achado de postura | Posture finding | M7 | Falha de configuração, não de vulnerabilidade. `DMARC p=none`, ausência de `CAA`. |
| Arquivo morto | Web archive | M4 | Cópia de conteúdo que existiu e foi removido. Wayback e CDX API. |
| ASN | Autonomous System Number | M5 | Número que identifica quem possui um bloco de IP. A chave da adjacência. |
| Assinatura de take-over | Takeover signature | M6 | Texto literal que o serviço devolve quando o recurso não existe (`NoSuchBucket`). É a prova. |
| Ativo órfão | Orphaned asset | M7 | Ativo no DNS/certificado do cliente cujo recurso de destino não pertence a ninguém. **Achado crítico.** |
| `AXFR` | Zone transfer | M2 | Transferência de zona DNS. Se aberta, entrega a lista completa de nomes. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Bloco adjacente | Adjacent block | M5 | O bloco de IP vizinho ao do alvo. Investigação de fato — **não se varre**. |
| Bucket | Bucket | M6 | Contêiner de armazenamento em nuvem. Nome **global** — logo, reivindicável se livre. |
| Bug bounty | Bug bounty | M8 | Programa de recompensa por falha. O escopo declarado **é** a autorização. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `CAA` | Certification Authority Authorization | M2 | Registro DNS que restringe quem pode emitir certificado. **Ausência é achado de postura.** |
| Cadeia de perguntas | Question chain | M1 | Cada resposta gera a próxima pergunta. É o que torna a enumeração exploratória. |
| `CNAME` | Canonical Name | M2 | Apelido DNS. **Revela o terceiro** — e é a fonte da cadeia. |
| CDX API | CDX API | M4 | Interface do Wayback que devolve o **índice** de capturas, com status e data. |
| Certificado | Certificate | M3 | Credencial TLS. Público e registrado em log obrigatório (CT). |
| CT log | Certificate Transparency log | M3 | Log público obrigatório de todo certificado emitido. **A melhor fonte de host.** |
| Confirmatória (enumeração) | Confirmatory enumeration | M1 | Responde pergunta que você já sabia formular. Confirma o óbvio. |
| Consulta | Query | M8 | Uma pergunta a fonte pública. Não precisa autorização. |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Declaração de conduta | Conduct declaration | M8 | Lista de **o que você não fez**. Fecha o relatório e o torna defensável. |
| Deduplicação | Deduplication | M7 | Reduzir o mesmo ativo a uma entrada. Normaliza caixa, ponto, curinga, IP. |
| `Disallow` | Disallow | M4 | Diretiva do `robots.txt`. **Declara onde não olhar** — e é onde está o interessante. |
| `DMARC` | DMARC | M2 | Política de e-mail. `p=none` significa **domínio sujeito a spoofing**. |
| DNS reverso | Reverse DNS (`PTR`) | M5 | Nome do host a partir do IP. Revela arquitetura de nuvem. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Enumeração | Enumeration | M1 | Mapear superfície. **Precisa de consentimento** do dono. |
| Exploratória (enumeração) | Exploratory enumeration | M1 | Responde "o que eu não sei que existe?". É a do curso. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Host fora do DNS | Out-of-band host | M3 | Nome no CT log que **não** resolve. Histórico, interno, ou take-over. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `info_type` | info_type | M5 | Campo do PeeringDB: `NSP`, `Content`, `Cable/DSL/ISP`. Contexto de infraestrutura. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Linha do tempo | Timeline | M4 | Sequência de mudança de status de URL no arquivo morto. 200 → 404 é remoção. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Mapa de superfície | Attack surface map | M7 / M9 | O entregável: inventário, achado priorizado, candidato, limitação. |
| `MX` | Mail Exchange | M2 | Registro de correio. Revela provedor de e-mail próprio ou terceirizado. |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `NS` | Name Server | M2 | Servidor de zona. Revela provedor de DNS. Evidência **média** de posse. |
| Nome global | Global namespace | M6 | Só existe um bucket com aquele nome no mundo. É por isso que take-over funciona. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| PeeringDB | PeeringDB | M5 | Base pública e voluntária de peering. Revela onde o AS troca tráfego. |
| Ponto cego estrutural | Structural blind spot | M1 | A ferramenta opera sobre a entrada que você deu. **Ela não gera a entrada.** |
| Posse | Ownership | M7 | De quem é o ativo. Prova-se por **registro**, não por proximidade. |
| `PTR` | Pointer record | M5 | Ver "DNS reverso". |
| Priorização | Prioritization | M7 | `exposição × alcance × facilidade`. Heurística, com ajuste declarado. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Registro de escopo | Scope record | M1 | Documento com autorização, escopo, limites e o que não se fará. |
| `robots.txt` | Robots Exclusion Protocol | M4 | RFC 9309. **Convenção**, não lei — mas declaração de vontade do operador. |
| `429` | Too Many Requests | M8 | **Instrução**, não erro. Ignorar é insistir, e insistir é abuso. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| SAN | Subject Alternative Name | M3 | Lista de nomes que o certificado cobre. **É a lista de host da organização.** |
| `security.txt` | security.txt | M4 | Contato de segurança declarado. Achado **positivo** — indica maturidade. |
| `SOA` | Start of Authority | M2 | Autoridade da zona. Traz **e-mail do responsável técnico** e serial. |
| `SPF` | SPF | M2 | Política de remetente de e-mail. `-all` rígido, `~all` brando, `?all` nenhum. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Take-over de subdomínio | Subdomain takeover | M6 | `CNAME` aponta para recurso livre. Quem reivindica controla o subdomínio. |
| Termo de uso | Terms of service | M8 | **Contrato** — vincula. Violar tem consequência civil. |
| Teste de proporcionalidade | Proportionality test | M8 | Seis etapas, aplicadas antes de cada etapa da enumeração. |
| `TXT` | Text record | M2 | Campo livre. **A fonte mais subestimada** — revela serviço de terceiro. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Varredura | Scan | M8 | Pacote enviado a host de terceiro. **Precisa de autorização específica.** |
| Volume | Volume | M8 | **Define o ato.** 1 consulta é consulta; 10.000 é uso de recurso de terceiro. |

## W

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Wildcard | Wildcard DNS | M2 | `*.exemplo.com` responde para qualquer nome. **Destrói a contagem por existência.** |
| `whois` | WHOIS | M5 | Consulta de registro. Endereço, bloco, ASN, alocado em. |

---

## As quatro famílias de pergunta — consulta rápida

| Família | Perguntas | Fonte dominante |
|---|---|---|
| **Nome** | Que hosts existem? Que nome foi esquecido? O que foi removido? O que ninguém linka? | DNS e CT logs |
| **Rede** | O que está atrás da CDN? Que vizinho existe? | ASN e `PTR` |
| **Serviço** | Que ambiente ela usa? Que terceiro ela usa? | `TXT` e padrão de nome |
| **Identidade** | Que credencial vazou? Quem é o dono? | Repositório e registro |

---

## Padrões de `CNAME` — consulta rápida

| Padrão | Serviço | Reivindicável? |
|---|---|---|
| `*.herokudns.com` | Heroku | Sim, se livre |
| `*.cloudfront.net` | AWS CloudFront | Não |
| `*.s3.amazonaws.com` | AWS S3 | **Sim, se livre** |
| `*.azurewebsites.net` | Azure | Sim, se livre |
| `*.appspot.com` | Google App Engine | Sim |
| `*.github.io` | **GitHub Pages** | **Sim — trivial** |
| `*.netlify.app` | Netlify | Sim |
| `*.vercel.app` | Vercel | Sim |
| `*.pages.dev` | Cloudflare Pages | Sim |
| `*.myshopify.com` | Shopify | Sim |
| `*.zendesk.com` | Zendesk | Sim |
| `*.statuspage.io` | Statuspage | Sim |

---

## Assinaturas de take-over — consulta rápida

| Serviço | Assinatura literal |
|---|---|
| AWS S3 | `NoSuchBucket` |
| Heroku | `No such app` |
| GitHub Pages | `There isn't a GitHub Pages site here` |
| Azure | `404 Web Site not found` |
| Shopify | `this shop is currently unavailable` |
| Zendesk | `Help Center Closed` |
| Netlify | `Not Found - Request ID` |
| Vercel | `NOT_FOUND` |
| Readme/Cargo | `Project not found` |

⚠ **Sem assinatura específica, não há prova.** `404` genérico **não** é diagnóstico.

---

## Força da evidência de posse — consulta rápida

| Evidência | Força |
|---|---|
| Registro de domínio (WHOIS) | **Forte** |
| Registro de empresa (LEI, CNPJ) | **Forte** |
| Bloco de IP no nome da organização | **Forte** |
| Certificado emitido pela organização | Média |
| Compartilha o mesmo `NS` | Média |
| Compartilha o mesmo `MX` | Média |
| **Está no mesmo ASN** | **Fraca** |
| **Nome parecido** | **Fraca** |

---

## A matriz de priorização — consulta rápida

| Achado | Exposição | Facilidade | Nível |
|---|---|---|---|
| Take-over de subdomínio | Controle | **Trivial** | **Crítica** |
| Bucket livre | Dado | Trivial | **Crítica** |
| Credencial em repositório público | **Tudo** | Média | **Crítica** |
| `.env` acessível | Credencial | Média | Alta |
| Painel com cadastro aberto | Acesso | Média | Alta |
| Zona aberta (`AXFR`) | Mapa completo | Fácil | **Alta** |
| Bucket público | Dado | Média | Alta |
| `admin.` exposto | Superfície | Média | Média |
| `DMARC p=none` | Spoofing | Fácil | Média |
| Ausência de `CAA` | Emissão indevida | Difícil | Média |
| Painel de terceiro existente | Informação | Fácil | Baixa |
| Nome no CT sem DNS | Histórico | Difícil | Baixa |

⚠ **Zona aberta é impacto indireto e alto** — entrega o mapa inteiro, multiplicando o risco do resto.

---

## O teste de proporcionalidade — consulta rápida

| # | Etapa | Pergunta |
|---|---|---|
| 1 | **Autorização** | Está coberto por autorização escrita? (se não, **PARE**) |
| 2 | Necessidade | Responde à minha pergunta? |
| 3 | **Volume** | Estou dentro do ritmo razoável? |
| 4 | Impacto | Se for mal interpretado, causo dano? |
| 5 | Proporção | O benefício justifica o risco? |
| 6 | Registro | Estou registrando com data e método? |

⚠ **A etapa 3 é a mais esquecida** — você raramente decide atacar; você decide aumentar o
paralelismo. É o mesmo ato, com nome diferente.

---

## Os cinco pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **Enumeração boa é exploratória** — descobre o que ninguém mapeou. |
| 2 | **O ativo mais perigoso é o que a organização esqueceu que tinha.** |
| 3 | **Certificado é a melhor fonte de host** — público por obrigação regulatória. |
| 4 | **Verificar existência é enumeração; acessar conteúdo é aquisição.** |
| 5 | **O volume define o ato** — a autorização escrita separa auditoria de crime. |

---

## O que o curso não ensina — explícito

| Não ensina | Por quê |
|---|---|
| Reivindicar recurso livre | É apoderar-se de coisa alheia |
| Baixar conteúdo de bucket ou repositório | É aquisição, não enumeração |
| Usar credencial encontrada | É acesso indevido |
| Contornar autenticação ou rate limit | É abuso |
| Enumerar ativo de terceiro sem autorização | É reconhecimento não autorizado |

⚠ **A enumeração para no diagnóstico. O passo de explorar não está neste curso** — e é ele que
separa auditoria de ataque.

---

*Material didático original, de propósito defensivo e de auditoria autorizada. Enumeração apenas em
ativo próprio ou com autorização escrita.*
