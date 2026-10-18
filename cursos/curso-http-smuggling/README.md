# Request Smuggling e Confusão de Camada

Curso de 32 horas, onze módulos. **O framing como ataque.**

---

## A linha de progressão

| | Módulo 1 | Módulo 11 |
|---|---|---|
| **Framing** | sabe que existe | ⚠ **as 10 variantes** |
| **TE / CL** | o clássico | ⚠ **todas as combinações** |
| **HTTP/2** | outro protocolo | ⚠ **a conversão como ataque** |
| **Resultado** | "há discordância" | ⚠ **o desync MEDIDO** |

**Pré-requisito duro:** **Parser Differentials** (módulos 5, 6, 7) + **Fuzzing** (o harness).

---

## A tese

⚠ **O request smuggling não é um bug. É uma consequência** — **a consequência da discordância sobre
onde a mensagem termina.**

⚠ **E a evidência de que a área está viva:**

| Trabalho | Ano |
|---|---|
| **HTTP Desync Attacks** (PortSwigger) | 2019 |
| **HTTP/2: The Sequel is Always Worse** | 2021 |
| **Browser-Powered Desync Attacks** | 2022 |
| ⚠ **HTTP/1.1 Must Die: The Smuggler's Guide** | ⚠ **2025** |
| Pingora / proxy CVEs | 2024–25 |

**Em 2025 o tema continua rendendo** — porque a spec é de 1999 e as implementações continuam a
interpretar diferente.

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [O desync como consequência](modulo-01.md) | 2 | O modelo |
| 2 | [O protocolo e as camadas](modulo-02.md) | 3 | Quem faz o quê |
| 3 | [**TE / CL — as combinações**](modulo-03.md) | 4 | ⚠ **O núcleo** |
| 4 | [Outras variantes de H1](modulo-04.md) | 3 | Espaços, duplicatas, chunk |
| 5 | [O lab e o harness de desync](modulo-05.md) | 3 | **Medir, não afirmar** |
| 6 | [**HTTP/2 e o descenso**](modulo-06.md) | 4 | ⚠ **A variante moderna** |
| 7 | [Client-side desync](modulo-07.md) | 3 | O navegador no meio |
| 8 | [Desync de cache](modulo-08.md) | 3 | O cache como camada |
| 9 | [Encontrar a variante](modulo-09.md) | 3 | O padrão, sistemático |
| 10 | [Detecção e defesa](modulo-10.md) | 2 | Como o mantenedor vê |
| 11 | [Projeto](modulo-11.md) | 2 | Do desync ao reporte |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## O mecanismo, em uma figura

```
┌──────────────────────────────────────────────────────────────────────┐
│ A SEQUÊNCIA QUE O ATACANTE MANDA                                    │
│                                                                      │
│   POST / HTTP/1.1\r\n                                                │
│   Content-Length: 6\r\n                                              │
│   Transfer-Encoding: chunked\r\n                                     │
│   \r\n                                                               │
│   0\r\n                                                              │
│   \r\n                                                               │
│   GET /admin HTTP/1.1\r\n          ← ⚠ o atacante escreve isto        │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ O PROXY (CL vence): conta 6 bytes → "sobrou lixo, descarto"          │
│                                                                      │
│   ⚠ ele VÊ uma requisição: POST /                                   │
├──────────────────────────────────────────────────────────────────────┤
│ O BACKEND (TE vence): lê chunked até o 0 → termina no \r\n\r\n       │
│                                                                      │
│   ⚠ ele VÊ DUAS: POST / e GET /admin                                 │
│   e a segunda NÃO passou pelo proxy.                                 │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **Os mesmos bytes. Duas contagens. E é isso o smuggling.**

---

## As famílias de variante

| Família | Onde a divergência está | Módulo |
|---|---|---|
| **TE / CL** | Precedência entre os dois headers | 3 |
| **CL.CL** | Dois `Content-Length`, valores diferentes | 3 |
| **TE.TE** | Dois `Transfer-Encoding`, um ofuscado | 4 |
| **Espaços / obs-fold** | O header malformado | 4 |
| **Chunk malformado** | O tamanho do chunk | 4 |
| ⚠ **H2 → H1** | ⚠ **A conversão no proxy** | 6 |
| **CRLF em header** | O que o servidor aceita no nome | 4 |
| **Client-side** | ⚠ **O navegador como camada** | 7 |
| **Cache** | ⚠ **A chave do cache** | 8 |

⚠ **Cada família é uma forma diferente de discordar sobre o LIMITE.** **A variante é o caso
concreto.**

---

## ⚠ Nota de propósito

| Você faz | Você **não** faz |
|---|---|
| Duas camadas **no seu lab** | ⚠ Camadas de terceiro |
| Mede o desync **localmente** | ⚠ Mede em produção alheia |
| **Reporta** ao mantenedor | Publica antes da correção |
| Lê a spec e o CVE | ⚠ Testa alvo que não é seu |
| Reproduz em **alvo seu ou CTF** | ⚠ Reproduz em serviço de ninguém |

⚠ **A linha aqui é mais estreita que nos outros cursos.**
**Um smuggler funcional contra terceiro é crime consumado** — não há "acesso indevido sem intenção".
**O payload é a execução.**

⚠ **E o smuggling frequentemente causa dois crimes:** **você acessa o que não devia (154-A) e
desincroniza o serviço (266).**

---

## O laboratório

```bash
sudo apt install -y nginx haproxy python3 python3-pip git curl docker.io
pip3 install requests h11 h2 pwntools
mkdir -p ~/smuggle-lab/{frontends,backends,harness,evidencia,caderno}
```

⚠ **`frontends/` = os proxies. `backends/` = os servidores.** **Tudo em 127.0.0.1** — **e o teste de
saída que FALHA.**

---

## Como isso conecta

| Curso | Ligação |
|---|---|
| **Parser Differentials** | ⚠ Pré-requisito — módulos 5, 6 e 7 |
| **Fuzzing** | O harness |
| **Patch Diffing** | O patch que corrigiu um smuggling |
| **Detecção e Evasão** | O detector do outro lado |

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **O modelo** | 1 semana | 1–2 |
| **TE/CL e variantes** | 2 semanas | 3–4 |
| **O lab e o harness** | 1 semana | 5 |
| **H2 e client-side** | 2 semanas | 6–7 |
| **Cache, variante, reporte** | 2 semanas | 8–11 |

⚠ **Estimativa a 10 h/semana.** O **módulo 6** costuma levar mais: **o descenso exige entender H2 de
verdade** — **e é a variante mais moderna.**
