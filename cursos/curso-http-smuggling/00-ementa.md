# HTTP Smuggling e Confusão de Camada: O Framing Como Ataque

**Ementa do curso · 32 horas · 11 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Framing** | Sabe que existe | ⚠ **Conhece as 10 variantes** |
| **TE / CL** | O caso clássico | ⚠ **Todas as combinações abusáveis** |
| **Camadas** | Duas | ⚠ **A cadeia inteira, medida** |
| **HTTP/2** | Outro protocolo | ⚠ **A conversão H2→H1 como ataque** |
| **Variante** | procura na doc | ⚠ **Aplica o padrão a alvos novos** |
| **Ferramenta** | Não conhece | `smuggler`, harness próprio, Burp |
| **Resultado** | "há uma discordância" | ⚠ **O desync MEDIDO, com evidência** |

**Pré-requisito duro:** curso de **Parser Differentials** (módulos 5, 6 e 7) · curso de **Fuzzing**
(o harness) · **Framing** entendido como invariante.

⚠ **Sem o de Parser Differentials, você não tem o método.** **Sem o harness, você não mede.**

---

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

---

## ⚠ Nota de propósito e conduta

⚠ **Este é o curso com a linha mais estreita do material** — **porque o exploit aqui é real, imediato
e prejudicial.**

| Este curso faz | **Não** faz |
|---|---|
| Duas camadas **no seu lab** | ⚠ Camadas de terceiro |
| Mede o **desync** localmente | ⚠ Mede em produção alheia |
| **Reporta** ao mantenedor | Publica antes da correção |
| Lê a spec e o CVE | ⚠ Testa alvo que não é seu |
| Reproduz em **alvo seu ou CTF** | ⚠ Reproduz em serviço de ninguém |

⚠ **A regra que vale o curso inteiro:**

> **Você sobe Nginx, HAProxy e um backend no SEU lab, todos em 127.0.0.1.** **O desync é medido
> entre processos seus. E o achado vai ao mantenedor.**

⚠ **E a razão de a linha ser mais estreita que nos outros cursos:** **um smuggler funcional contra
infraestrutura de terceiro é crime consumado** — **não há "acesso indevido sem intenção".** **O
payload é a execução.**

⚠ **A tabela do que é lícito e o que não é, sem ambiguidade:**

| Ato | Lícito? |
|---|---|
| Subir nginx + backend no lab | ✓ |
| Medir o desync entre eles | ✓ |
| Ler o código do proxy | ✓ |
| ⚠ Mandar um payload desync a **qualquer host que não é seu** | ⚠ **CRIME** |
| ⚠ Testar CDN, WAF ou proxy de produção | ⚠ **CRIME** |
| ⚠ Usar o smuggling para **acessar** algo | ⚠ **CRIME** |
| Reportar ao mantenedor | ✓ |

⚠ **No Brasil:** art. 154-A (acesso indevido) e art. 266 (interrupção). **E o smuggling frequentemente
causa os dois:** **você acessa o que não devia (154-A) e desincroniza o serviço (266).**

---

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

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | O desync como consequência | O modelo, e o que ele é | 2 |
| 2 | O protocolo e as camadas | HTTP/1.1, proxies, e o que cada um faz | 3 |
| 3 | TE / CL — as combinações | ⚠ **O núcleo** | 4 |
| 4 | Outras variantes de H1 | Espaços, duplicatas, chunk | 3 |
| 5 | O lab e o harness de desync | Medir, não afirmar | 3 |
| 6 | ⚠ **HTTP/2 e o descenso** | H2→H1, a conversão | 4 |
| 7 | Client-side desync | O navegador no meio | 3 |
| 8 | Desync de cache | Quando o cache é a camada | 3 |
| 9 | Encontrar a variante | O padrão, sistematicamente | 3 |
| 10 | Detecção e defesa | ⚠ **Como o mantenedor vê** | 2 |
| 11 | Projeto: do desync ao reporte | O entregável | 2 |

Cada módulo: teoria → **variante comentada** → lab → avaliação. ~55% prática de medição.

---

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

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (11) | 45% | O desync medido, com evidência |
| **As variantes** (módulos 3 e 4) | 20% | Quantas você reproduziu |
| **O harness** (módulo 5) | 10% | Mede sem afirmar |
| O descenso H2 (módulo 6) | 10% | A variante mais moderna |
| Projeto (módulo 11) | 15% | Do desync ao reporte |

**Rubrica central:** você não entrega "há um smuggling aqui". Você entrega **a variante
identificada**, **o desync medido**, **a evidência literal** — e **a quem reportar**.

---

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

---

## Referências abertas

- **HTTP Desync Attacks: Request Smuggling Reborn** — PortSwigger, 2019
- **HTTP/2: The Sequel is Always Worse** — PortSwigger, 2021
- **Browser-Powered Desync Attacks** — PortSwigger, 2022
- **HTTP/1.1 Must Die: The Smuggler's Guide** — 2025
- **Client-Side Desync** — PortSwigger Research
- **RFC 9112 §6.3** — parsing de mensagem
- **RFC 7230 §3.3.3** — a precedência de TE/CL
- **`smuggler`** — https://github.com/defparam/smuggler
- **HTTP Garden** — https://github.com/narfindustries/http-garden
- **CVE-2024-38475, CVE-2025-... (Pingora)** — variantes em produtos novos

---

*Material didático original, de propósito defensivo e de pesquisa. Duas camadas ou mais, sempre no
laboratório próprio, ou com autorização escrita. Nenhum payload é enviado a serviço de terceiro. O
achado é reportado ao mantenedor — nunca usado contra sistema alheio. Request smuggling contra
infraestrutura de terceiro é crime (art. 154-A e 266).*
