---
title: "HTTP Smuggling e Confusao de Camada: O Framing Como Ataque"
nivel: especialista
tags: [http, smuggling, framing, desync, http-2, proxy]
---# HTTP Smuggling e Confusão de Camada: O Framing Como Ataque

**Ementa do curso · 32 horas · 11 módulos · PT-BR com termos técnicos em inglês**


## Por que este curso existe

⚠ **A afirmação que organiza o curso:**

> **O request smuggling não é um bug. É uma consequência** — **e a consequência da discordância
> sobre onde a mensagem termina.** **Você não injeta nada; você explora a divergência de dois
> parsers sobre os MESMOS bytes.**

⚠ **E por que ele merece um curso inteiro, e não um módulo:**

| O que o Parser Differentials ensinou | O que este curso acrescenta |
|---|---|
| O invariante de framing | ⚠ **As 10 variantes concretas** |
| A discordância entre camadas | ⚠ **Como ela VIRA um desync** |
| O que sobra é o bug | ⚠ **Como usar os bytes que sobram** |
| A carta de divergência | ⚠ **A variante, sistematicamente** |
| HTTP/1.1 | ⚠ **H2, H3, e a conversão** |

⚠ **A tese:** **o smuggling é o exploit do framing.** **E como o framing está em todo lugar, as
variantes são muitas** — **e as novas aparecem todo ano.**

⚠ **E a evidência de que a área está ativa, e ela é datada:**

| Trabalho | O que fez | Ano |
|---|---|---|
| **HTTP Desync Attacks** (PortSwigger) | ⚠ **O renascimento do smuggling** | 2019 |
| **HTTP/2: The Sequel is Always Worse** | ⚠ **H2→H1, o descenso** | 2021 |
| **Browser-Powered Desync Attacks** | O cliente como vetor | 2022 |
| **HTTP/1.1 Must Die: The Smuggler's Guide** | ⚠ **Consolidação, novas variantes** | ⚠ **2025** |
| **Pingora / proxy CVEs** | ⚠ **Novas variantes em produtos novos** | 2024–25 |
| **Client-Side Desync** | O navegador no meio | 2022+ |

⚠ **A última linha do `HTTP/1.1 Must Die` é a que situa o curso:** **em 2025, o tema continua
rendendo** — **porque a spec é de 1999 e as implementações continuam a interpretar diferente.**

⚠ **E o número que organiza o curso:** o PortSwigger Research **documentou dezenas de variantes
distintas** — **e cada uma é uma combinação diferente de onde a divergência está.** **Não é um bug;
é uma família.**


## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Formalizar o **desync** como consequência da discordância de framing.
2. Reconhecer as **10 variantes** principais e o mecanismo de cada.
3. Subir uma **cadeia de proxy + backend** no lab.
4. **Medir** o desync — contando requisições, não afirmando.
5. Aplicar a variante de **H2 → H1** (o descenso).
6. Reconhecer **client-side desync** e por que ele muda o alvo.
7. Distinguir **smuggling** de **desync** de **cache poisoning**.
8. Construir o **harness de desync** — o do módulo 5, adaptado.
9. Caçar a variante **sistematicamente** — o padrão, aplicado.
10. Reportar ao mantenedor **com evidência e sem expor terceiros**.


## O laboratório

```bash
sudo apt update
sudo apt install -y nginx haproxy python3 python3-pip git curl docker.io
pip3 install requests h11 h2 pwntools
```

| Ferramenta | Papel | Licença |
|---|---|---|
| **Nginx / HAProxy** | As camadas front-end | Livre |
| **Python `http.server`** | O backend | Livre |
| **`h11` / `h2`** | Parsers, para escrever o harness | Livre |
| **`smuggler`** | A ferramenta de detecção | Livre |
| **Burp Suite Community** | Interceptar e manual | Gratuito |
| ⚠ **Nenhum CDN, nenhum WAF** | — | ⚠ **Proibido neste curso** |

⚠ **O curso **não** usa nenhum serviço público de teste.** **Você sobe as camadas no seu lab** — **e
o desync é medido entre processos locais.**

```bash
mkdir -p ~/smuggle-lab/{frontends,backends,harness,evidencia,caderno} && cd ~/smuggle-lab
```

⚠ **`frontends/` guarda as configs dos proxies.** **`backends/` guarda os servidores.** **E o
isolamento é o do curso anterior:** **tudo em 127.0.0.1, e o teste de saída que FALHA.**


## Como este curso se conecta

| Curso | Ligação |
|---|---|
| **Parser Differentials** | ⚠ **Pré-requisito direto** — módulos 5, 6 e 7 |
| **Fuzzing** | O harness |
| **Patch Diffing** | Ver o patch que corrigiu o smuggling |
| **Detecção e Evasão** | O outro lado — como o detector vê |
| **Pesquisa em Segurança** | O critério e o reporte |

⚠ **Este curso é o módulo 6 do Parser Differentials levado ao osso.** **E ele alimenta o de Detecção
e Evasão** — **porque o defensor precisa reconhecer o que o atacante mede.**


*Material didático original, de propósito defensivo e de pesquisa. Duas camadas ou mais, sempre no
laboratório próprio, ou com autorização escrita. Nenhum payload é enviado a serviço de terceiro. O
achado é reportado ao mantenedor — nunca usado contra sistema alheio. Request smuggling contra
infraestrutura de terceiro é crime (art. 154-A e 266).*
