---
title: "Enumeracao Esoterica: A Superficie que a Ferramenta Nao Ve"
nivel: avancado
tags: [enumeracao, dns, certificado, superficie, reconhecimento, ct-logs]
---title: Enumeracao Esoterica: A Superficie que a Ferramenta Nao Ve
nivel: avancado
tags: [enumeracao, dns, certificado, superficie, reconhecimento, ct-logs]
---# Enumeração Esotérica: A Superfície que a Ferramenta Não Vê

**Ementa do curso · 26 horas · 9 módulos · PT-BR com termos técnicos em inglês**


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
