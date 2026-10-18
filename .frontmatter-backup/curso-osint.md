---
title: OSINT Global: Investigacao em Fonte Aberta Atraves de Fronteiras
nivel: basico
tags: [osint, investigacao, fonte-aberta, jurisdicao, due-diligence, verificacao]
---# OSINT Global: Investigação em Fonte Aberta Através de Fronteiras

**Ementa do curso · 36 horas · 12 módulos · PT-BR com termos técnicos em inglês**

---

## Sobre o que é este curso

Os cursos de OSINT disponíveis na internet têm um problema estrutural: **assumem um país.**
Ensinam a consultar o registro civil americano, o cadastro de empresas do Reino Unido, o sistema
judicial dos EUA — e param aí.

Este curso parte da premissa oposta: **o método é global, e as diferenças nacionais são parte do
conteúdo.**

A pergunta que organiza tudo:

> **Dado um identificador — telefone, domínio, empresa, pessoa, imagem — como eu descubro
> informação sobre ele, quando ele pode estar em qualquer jurisdição?**

Você vai aprender a **reconhecer a jurisdição a partir do próprio identificador** (`+55` é Brasil,
`.de` é Alemanha, NIF espanhol não é o mesmo que NIF português), e a escolher a fonte certa para
cada país — sem ter decorado 200 registros nacionais.

⚠ **O curso não é uma lista de sites.** Lista de fonte envelhece em seis meses. O que não envelhece
é **o método de derivar a fonte** a partir da estrutura do dado. É isso que o curso ensina.

**Material original.** Referências abertas ao final.

---

## Público-alvo

- Investigadores, jornalistas e pesquisadores que trabalham com dado internacional.
- Profissionais de due diligence, compliance, KYC e investigação corporativa.
- Analistas de fraude e de segurança que lidam com atores fora do Brasil.
- Profissionais de direitos humanos documentando violação em qualquer país.
- Qualquer pessoa que precise **verificar** informação que cruza fronteira.

**Não é** para quem quer "achar pessoas" por curiosidade. E não é um curso de hacking: OSINT é
**fonte aberta** — nada aqui envolve acesso a sistema, engenharia social, ou aquisição de base
vazada.

---

## Pré-requisitos

| Área | Nível exigido |
|---|---|
| Inglês | **Leitura obrigatória** — a maior parte da fonte primária é em inglês |
| Navegador e planilha | Uso confortável |
| Rede | Modelo TCP/IP, DNS, HTTP — ou o curso de redes deste material |
| Base numérica | Telefone e codificação: E.164, códigos de país, coordenadas |
| Linux (opcional) | Para os módulos 9 e 11, que usam linha de comando |

**Recomendado:** o curso de redes deste material antes dos Módulos 9 e 11.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Reconhecer a jurisdição e o tipo de um identificador pela própria estrutura dele.
2. Aplicar o **ciclo de investigação OSINT** a um alvo em qualquer país.
3. Trabalhar número de telefone globalmente: validação, operadora, tipo, portabilidade por país.
4. Investigar domínio e infraestrutura independente do TLD, e cruzar com transparência de
   certificado.
5. Investigar empresa em qualquer jurisdição, sabendo **derivar** o registro nacional correto.
6. Fazer due diligence corporativa com estrutura de propriedade e controle.
7. Verificar pessoa com método legal e ético, respeitando as diferenças de registro civil por país.
8. Fazer geolocalização por imagem, satélite, sombra e metadado — o método completo.
9. Usar a superfície de busca de forma avançada (operador, dork, arquivo morto).
10. Automatizar coleta sem violar termo de uso nem lei.
11. Aplicar o enquadramento legal: LGPD, GDPR, e o que muda por jurisdição.
12. Documentar investigação com cadeia de custódia, para uso jornalístico ou probatório.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | Fundamentos e o ciclo de investigação | Método, vocabulário, e o que "fonte aberta" significa de fato | 2 |
| 2 | O identificador e a jurisdição | Derivar a fonte da estrutura do dado — o módulo que organiza tudo | 3 |
| 3 | Busca avançada e superfície oculta | Operadores, dorking, arquivo morto, índice, fragmento | 3 |
| 4 | Pessoa: identidade e registro | Método por país, e o que não é lícito fazer | 3 |
| 5 | Telefone global | E.164, validação, operadora, portabilidade por jurisdição | 3 |
| 6 | Empresa e due diligence internacional | Registro por país, estrutura de propriedade, controle | 4 |
| 7 | Domínio, infraestrutura e certificado | Independente de TLD; pivô por certificado e por ASN | 3 |
| 8 | Imagem, vídeo e geolocalização | Metadado, sombra, satélite, verificação | 4 |
| 9 | Ferramentas e linha de comando | `whois`, `dig`, `exiftool`, `curl`, e automação responsável | 3 |
| 10 | Ética, legalidade e limites globais | LGPD, GDPR, e por que a mesma consulta é legal num país e não em outro | 3 |
| 11 | Documentação e cadeia de custódia | Relatório, prova, reprodutibilidade | 3 |
| 12 | Projeto: investigação completa internacional | Um caso que atravessa três jurisdições | 3 |

Cada módulo: teoria → **caso comentado** → lab → avaliação. ~55% prática.

---

## ⚠ Ética, legalidade e o que este curso NÃO é

OSINT vive numa linha que precisa ser dita com precisão, porque "fonte aberta" não significa
"qualquer coisa é permitida".

### O que é OSINT de verdade

| É OSINT | **Não é OSINT** |
|---|---|
| Consultar registro público | Acessar sistema sem autorização |
| Ler site, documento, publicação | Adquirir base vazada |
| Comparar dado de fontes abertas | Engenharia social com o alvo |
| Assistir vídeo público e geolocalizar | Instalar software no dispositivo de alguém |
| Ler declaração financeira pública | Subornar quem tem acesso |
| Documentar o que qualquer pessoa pode ver | Fazer login em conta que não é sua |

⚠ **A fronteira não é "é público?" — é "qualquer pessoa pode obter isso sem violar nada?"** Base
vazada é público na prática e não é OSINT. É dado obtido ilicitamente, e manuseá-lo tem
consequência legal própria.

### O que muda por jurisdição

⚠ **Este é o ponto que quase nenhum curso trata, e é o mais importante de um curso global.**

| Jurisdição | O que muda |
|---|---|
| **UE / GDPR** | Dado pessoal tem proteção ampla; "interesse legítimo" precisa ser justificado |
| **Brasil / LGPD** | Similar ao GDPR; base legal obrigatória; ANPD fiscaliza |
| **EUA** | Proteção setorial e por estado; muito registro é público por padrão |
| **Reino Unido** | UK GDPR + regime próprio; Companies House é notavelmente aberto |
| **Regimes restritivos** | Dado que protege cidadão local pode ser crime obter |

⚠ **A mesma consulta pode ser legal num país e não em outro** — e o que determina não é onde o
dado está, é onde **você** está e onde **o alvo** está. O Módulo 10 trata isso em profundidade.

### Os limites deste curso

⚠ **Nada aqui ensina:**
- Acesso a dado vazado ou a base de credencial
- Engenharia social, pretexting, ou abordagem direta ao alvo
- Vigilância, monitoramento contínuo de pessoa, ou perseguição (stalking)
- Identificação de pessoa sob risco — fonte, vítima, ativista sob perseguição
- Contornar autenticação, rate limit, ou termo de uso de forma deliberada

⚠ **E uma nota sobre OSINT e segurança pessoal:** em muitos casos, o maior risco de um curso de
OSINT é a pessoa aplicar em si mesma as técnicas que aprendeu. Fazer a própria "pegada digital" é
o exercício do Módulo 4 — e é **a favor** de você.

---

## O laboratório

Diferente dos outros cursos deste material, o lab de OSINT é **a internet real** — é o único jeito
de aprender. Mas com três regras:

| Regra | Por quê |
|---|---|
| **Sujeito principal: identidade fictícia** | Os labs 4 a 8 usam um alvo construído para o curso |
| **Alvo público: empresa e domínio, não pessoa** | Empresa e domínio são sujeitos legítimos de due diligence |
| **A própria pegada digital é alvo permitido** | E é o exercício de maior valor prático |

⚠ **Nenhum lab usa pessoa real como alvo.** Você investiga: (a) uma identidade fictícia que o
curso fornece, (b) dados que você mesmo criou, (c) a sua própria pegada, (d) empresas e domínios
públicos.

---

## Fontes por jurisdição — como o curso trata

⚠ **O curso NÃO traz "a lista dos 200 registros nacionais".** Ele ensina **como derivar** o
registro a partir do identificador, e dá **casos trabalhados** de jurisdições-chave.

**As jurisdições trabalhadas em detalhe** (por serem as mais consultadas e as mais bem
documentadas):

| Região | Por que está no curso |
|---|---|
| **Brasil** | Ponto de partida; CNPJ, CPF, E.164 +55 |
| **UE** (Alemanha, França, Espanha, Portugal, Holanda) | GDPR, registro centralizado, VAT |
| **Reino Unido** | Companies House — o registro mais aberto do mundo |
| **EUA** | Registro estadual, SEC, e a fragmentação que confunde |
| **Offshore** (Panamá, Delaware, Luxemburgo, Caribe) | Estrutura de propriedade e opacidade |
| **Ásia** (Japão, Coreia, Singapura, Hong Kong) | Registro e transliteração de nome |

⚠ **A tabela não é decorável, e não precisa ser.** O Módulo 2 te dá o método para chegar em
**qualquer** jurisdição, e os módulos 5 a 7 aplicam em casos reais.

---

## Ambiente

```bash
sudo apt update
sudo apt install -y whois dnsutils exiftool curl jq \
                    python3 python3-pip imagemagick \
                    ffmpeg sqlite3
pip3 install phonenumbers requests dnspython
```

| Ferramenta | Papel no curso |
|---|---|
| `phonenumbers` | Validação e tipo de número global (Google libphonenumber) |
| `whois` / `dig` | Domínio e ASN |
| `exiftool` | Metadado de imagem e documento |
| `curl` / `jq` | Consulta a API pública |
| `ffmpeg` | Extração de quadro de vídeo (Módulo 8) |

⚠ **Tudo é consulta pública.** Nenhuma ferramenta do curso faz acesso não autorizado.

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (12) | 50% | Método aplicado, com fonte citada |
| Dossiê de empresa internacional (Módulo 6) | 20% | Due diligence com estrutura de propriedade |
| Enquadramento legal (Módulo 10) | 10% | Saber quando **não** fazer |
| Projeto final (Módulo 12) | 20% | Investigação completa, documentada |

**Rubrica central:** você não entrega "encontrei". Você entrega **o achado**, **a fonte**, **o
método**, e **o que não foi possível confirmar**. Confiança declarada é obrigatória — como em todo
este material.

---

## Referências abertas

- **OSINT Framework** — https://osintframework.com/
- **Bellingcat** — https://www.bellingcat.com/ — guias e investigações de referência
- **Berkeley Protocol on Digital Open Source Investigations** (ONU) — **o padrão metodológico**
- **First Draft / Information Futures Lab** — verificação
- **Google Advanced Search** e operadores documentados
- **Wayback Machine** — https://web.archive.org/
- **Internet Archive Scholar**, **Common Crawl**
- **OpenCorporates** — https://opencorporates.com/
- **OpenSanctions** — https://www.opensanctions.org/
- **GLEIF** — identificador legal de entidade (LEI)
- **Open Ownership** — https://www.openownership.org/ — estrutura de propriedade
- **crt.sh** — transparência de certificado
- **Google libphonenumber** — regras de telefone por país
- **RFC 3966** (tel URI) · **E.164** (UIT)
- **GDELT**, **ACLED** — evento global
- **Copernicus / Sentinel**, **USGS EarthExplorer** — satélite aberto
- **SunCalc**, **ShadowCalculator** — geometria solar para geolocalização
- **LGPD** (Lei 13.709/2018) · **GDPR** (Regulamento UE 2016/679)
- **ISO 27037** — preservação de evidência digital

---

*Material didático original, de propósito investigativo e defensivo. Nenhum trecho reproduzido de
obra comercial protegida, e nenhum material que ensine acesso não autorizado, engenharia social,
ou violação de privacidade.*
