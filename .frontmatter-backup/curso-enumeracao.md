---
title: Enumeracao Esoterica: A Superficie que a Ferramenta Nao Ve
nivel: avancado
tags: [enumeracao, dns, certificado, superficie, reconhecimento, ct-logs]
---# Enumeração Esotérica: A Superfície que a Ferramenta Não Vê

**Ementa do curso · 26 horas · 9 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Enumeração** | Roda `nmap` e `gobuster` | Escolhe o método pela **pergunta**, não pela ferramenta |
| **DNS** | Sabe que existe `A` e `CNAME` | Usa `TXT`, `MX`, `NS`, `SOA`, `AXFR` e zona esquecida |
| **Certificado** | Não sabe o que é SAN | Encontra host que **não existe no DNS** |
| **Documento** | Lê o que está na página | Acha o que **foi removido** e o que **nunca foi linkado** |
| **Rede** | Enumera o que está no escopo | Acha o **vizinho de bloco** que o cliente esqueceu |
| **Entregável** | Lista de portas | **Mapa de superfície** com evidência e prioridade |

**Pré-requisito duro:** o curso de **redes** deste material (DNS, TCP/IP, TLS, `tcpdump`) e
**OSINT Global** (módulo 7, domínio e certificado). Sem esses dois, metade dos labs não fecha.

---

## Por que este curso existe

⚠ **A enumeração que a maioria faz é rasa.** Ela responde "quais portas estão abertas neste IP" —
e para. O que ela **não** responde:

| Pergunta | Método convencional | Este curso |
|---|---|---|
| Que hosts esta organização tem? | Varredura de faixa | **Certificado + CT logs** |
| Que domínio ela esqueceu? | Brute force de nome | **`TXT`, `MX`, zona, histórico** |
| Que serviço roda atrás do CDN? | — | **PTR, bloco adjacente, ASN** |
| Que arquivo ela publicou e removeu? | — | **Arquivo morto + CDX** |
| Que credencial vazou no repositório? | — | **Histórico de commit** |
| Que ambiente de terceiro ela usa? | — | **Registro de serviço, bucket, painel** |

⚠ **A tese do curso:**

> **Enumeração boa não é "rodar ferramenta". É saber que perguntas fazer, e por onde uma pergunta
> leva à outra.**

⚠ **E o nome "esotérica" é preciso:** são as fontes que **ninguém enumera** porque a ferramenta
padrão não as cobre. Não é segredo — é **método**, e é o que separa quem encontra superfície de
quem confirma a que já era óbvia.

---

## O que "esotérica" quer dizer aqui

⚠ **Precisão sobre o termo, porque ele tem duas leituras e só uma é este curso:**

| **Este curso é** | **Não é** |
|---|---|
| Fontes incomuns, **públicas** e **legais** | Técnica de invasão |
| Método que a ferramenta padrão não cobre | Contorno de controle de acesso |
| Enumeração de **superfície** autorizada | Reconhecimento contra alvo de terceiro |
| Correlação de dado aberto | Aquisição de dado vazado |

⚠ **A regra que vale o curso inteiro:** **você enumera o que é seu, ou o que você foi autorizado a
enumerar por escrito.**

| Alvo permitido | Alvo **não** permitido |
|---|---|
| **Domínio seu** | Domínio de terceiro |
| **Programa de bug bounty com escopo público declarado** | Fora do escopo declarado |
| **Cliente com contrato de teste assinado** | Qualquer coisa sem contrato |
| **Serviço que você mantém** | Serviço que você usa |

⚠ **Enumeração é reconhecimento.** Feita sem autorização, é a fase que precede ataque — e a lei
não faz distinção entre "só enumerei" e "atacei" em todos os casos. No Brasil, art. 154-A e
correlatos. **A autorização escrita é o que separa auditoria de crime.**

⚠ **E há o risco prático, não só legal:** brute force de subdomínio contra resolvedor público
**é abuso de recurso de terceiro**. Volume alto é indisponibilidade, mesmo sem intenção.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Escolher o método de enumeração pela pergunta, não pela ferramenta.
2. Extrair host de certificado e CT logs, incluindo o que não está no DNS.
3. Usar `TXT`, `MX`, `NS`, `SOA` e detectar zona esquecida.
4. Recuperar conteúdo removido e nunca linkado por arquivo morto e CDX.
5. Enumerar bloco adjacente, PTR e vizinho de ASN.
6. Reconhecer exposição em serviço de terceiro (bucket, painel, repositório).
7. Correlacionar achados num mapa de superfície priorizado.
8. Provar posse de um ativo antes de reportá-lo.
9. Respeitar limite de volume e termo de uso durante a enumeração.
10. Documentar com evidência reproduzível.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | Método: a pergunta antes da ferramenta | Por que a enumeração rasa falha | 2 |
| 2 | DNS além do `A` | `TXT`, `MX`, `NS`, `SOA`, zona, wildcard | 3 |
| 3 | Certificado como fonte de host | SAN, CT logs, padrão de emissão | 3 |
| 4 | Superfície esquecida em documento e arquivo | `robots`, `sitemap`, CDX, metadado | 3 |
| 5 | Rede adjacente | ASN, bloco vizinho, PTR, BGP | 3 |
| 6 | Exposição em terceiro | Bucket, painel, repositório, CDN | 3 |
| 7 | Correlação: de achado a mapa | Deduplicar, priorizar, provar posse | 3 |
| 8 | Limites: volume, autorização, termo | O que a enumeração não pode fazer | 2 |
| 9 | Projeto: mapa de superfície autorizado | O entregável completo | 4 |

Cada módulo: teoria → **consulta comentada** → lab → avaliação. ~60% prática.

---

## O laboratório

⚠ **Diferente dos outros cursos deste material, este usa alvo real.** É o único jeito de aprender
enumeração. E por isso ele tem a regra mais restritiva do conjunto:

| Sujeito | Como |
|---|---|
| **1. Domínio seu** | Registre um domínio (ou use um que você tem) — o ideal |
| **2. Laboratório autossuficiente** | Torre de DNS + web no seu `docker-compose` |
| **3. Bug bounty com escopo público** | Só o que o programa declara no escopo |

⚠ **O curso usa o sujeito 1 e 2 nos labs, e o 3 apenas no projeto final, se você quiser.** Nenhum
exercício aponta para alvo de terceiro que não declarou escopo.

```bash
sudo apt update
sudo apt install -y dnsutils whois curl jq tshark \
                    python3 python3-pip golang-go git
pip3 install dnspython requests
# opcional
go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install github.com/projectdiscovery/httpx/cmd/httpx@latest
```

⚠ **Ferramenta é opcional neste curso.** O método importa mais que a ferramenta — e cada módulo
mostra como fazer o mesmo com `dig`, `curl` e `jq`, sem dependência.

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (9) | 55% | Consulta feita, evidência anexada, interpretação |
| Mapa de correlação (módulo 7) | 20% | De achado disperso a superfície priorizada |
| Prova de posse (módulo 7) | 10% | Saber a quem pertence |
| Projeto (módulo 9) | 15% | Entregável completo, com evidência |

**Rubrica central:** você não entrega "rodei o subfinder". Você entrega **o método**, **a
evidência** (consulta e resultado, com data), e **o que o achado significa**.

---

## Referências abertas

- **RFC 1034/1035** (DNS) · **RFC 7208** (SPF) · **RFC 6376** (DKIM) · **RFC 7489** (DMARC)
- **RFC 6962** (Certificate Transparency)
- **RFC 4033–4035** (DNSSEC) · **RFC 6891** (EDNS)
- **crt.sh** — https://crt.sh/
- **Wayback CDX API** — https://web.archive.org/cdx/search/cdx
- **OpenCorporates** — https://opencorporates.com/
- **PeeringDB** — https://www.peeringdb.com/
- **Team Cymru IP to ASN** — WHOIS `whois.cymru.com`
- **Robots Exclusion Protocol** (RFC 9309)
- **OWASP WSTG** — Information Gathering
- **ProjectDiscovery docs** — https://docs.projectdiscovery.io/
- **Bellingcat** — metodologia de investigação
- **Berkeley Protocol** — preservação de evidência

---

*Material didático original, de propósito defensivo e de auditoria autorizada. Enumeração apenas em
ativo próprio ou com autorização escrita. Nenhum material que ensine reconhecimento contra alvo de
terceiro.*
