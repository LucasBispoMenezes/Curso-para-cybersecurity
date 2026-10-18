---
title: title: "Anonimato e Privacidade na Internet: Tor, Proxies e o que Realmente Protege"
nivel: basico
tags: [anonimato, tor, vpn, opsec, fingerprint, tráfego]
---


# Anonimato e Privacidade na Internet: Tor, Proxies e o que Realmente Protege

**Ementa do curso · 34 horas · 12 módulos · PT-BR com termos técnicos em inglês**

---

## Sobre o que é este curso — leia primeiro

Este é um curso sobre **como o anonimato de rede funciona por dentro**, e sobre **o que ele
realmente protege e o que não protege**. Não é um curso de "como desaparecer". É um curso de
engenharia de privacidade — e a engenharia é a parte difícil.

O tema tem duas audiências legítimas e o material serve às duas:

| Audiência | Por que precisa |
|---|---|
| **Quem protege** | Jornalista, ativista, pesquisador, advogado, fonte sob risco, defensor de direitos humanos, profissional de segurança |
| **Quem defende** | Analista que precisa entender ofuscação de origem, distinguir Tor legítimo de tráfego malicioso, e não quebrar privacidade de usuário legítimo ao bloquear |

⚠ **A linha, e ela é explícita ao longe do curso:**

| Este curso ensina | Este curso **não** ensina |
|---|---|
| Como Tor funciona: circuito, célula, guarda, diretório | Como identificar usuário de Tor para prejudicá-lo |
| Como proxies propagam e vazam identidade | Como construir proxy para interceptar terceiro |
| Propagação de identidade: onde o anonimato quebra | Como comprar identidade falsa para fraude |
| Detecção de vazamento em cliente Tor, browser, DNS | Como operar serviço oculto ilegal |
| Análise de metadado e correlação de fluxo | Como executar correlação de fluxo contra alvo |
| Modelagem de ameaça por adversário | Como evadir investigação criminal legítima |

⚠ **Sobre "evadir aplicação da lei":** anonimato de rede é uma **ferramenta de proteção de
direitos**, não uma técnica de impunidade. O mesmo Tor que protege uma fonte jornalística protege
uma vítima de perseguição doméstica — e essas são as razões pelas quais ele existe. Este curso não
orienta evasão de investigação, ocultação de crime, nem operação de serviço ilegal. Se isso é o que
você procura, este não é o material.

⚠ **Nota sobre uso prático:** as técnicas deste curso são legais no Brasil e na maioria das
jurisdições. Usar Tor, VPN ou proxy é legal. O que é crime é o ato que você pratica através deles —
e essa distinção importa, porque criminalizar a ferramenta é o que coloca jornalista e ativista em
risco.

---

## Visão geral

A maioria do material sobre anonimato na internet repete três conselhos: "use Tor", "use VPN",
"use DNS cifrado". Nenhum deles explica **o que cada um protege, de quem, e onde a proteção
quebra**.

Este curso vai na direção oposta: cada capítulo pergunta *"contra qual adversário isto protege, e
onde a proteção falha?"*. Você vai construir circuitos, ler células Tor, ver seu próprio tráfego
vazando identidade, e aprender a detectar vazamento antes que alguém detecte por você.

O fio condutor: **anonimato é uma cadeia, e a cadeia vale o elo mais fraco.** Um circuito Tor
perfeito protegido por um browser que vaza `WebRTC` e um DNS que sai em claro não é anonimato — é
sensação de anonimato, que é pior que nada porque muda comportamento.

**Material original.** Referências abertas ao final.

---

## Público-alvo

- Jornalistas, pesquisadores e ativistas que lidam com fonte sob risco.
- Advogados e defensores de direitos humanos.
- Profissionais de segurança que precisam entender ofuscação de origem.
- Analistas de rede que lidam com tráfego Tor em ambiente corporativo.
- Qualquer pessoa que queira entender **de verdade** o que VPN e Tor fazem.
- Curiosos técnicos que já usaram Tor e nunca souberam como funciona.

**Não é** para quem nunca usou terminal. E não é um curso de "dicas": é engenharia.

---

## Pré-requisitos

| Área | Nível exigido |
|---|---|
| Linux | Terminal, `ss`, `tcpdump` básico, edição de arquivo |
| Rede | Modelo TCP/IP, DNS, TLS — **ou o curso de redes deste material** |
| Criptografia | Noção de chave pública, simétrica e hash |
| Sistema | Processos, sockets, variável de ambiente |

**Recomendado:** fazer o curso de redes deste material antes. Este curso constrói pesadamente
sobre análise de captura, DNS, TLS e `tcpdump`.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Fazer modelagem de ameaça: identificar **de quem** você está se protegendo, e com que recurso.
2. Explicar a diferença entre **sigilo de conteúdo** e **anonimato de origem** — e por que
   raramente você quer só um dos dois.
3. Descrever o funcionamento de um proxy (HTTP, SOCKS4, SOCKS5) e onde ele vaza identidade.
4. Explicar a arquitetura do Tor por dentro: circuito, célula, relay, guarda, diretório.
5. Ler, em captura própria, o handshake de um circuito Tor e identificar seus componentes.
6. Construir um serviço oculto **próprio**, local, e explicar o rendes-vous.
7. Enumerar os **canais de vazamento** de um cliente (DNS, WebRTC, timezone, fingerprint) e
   testá-los um por um.
8. Executar fingerprinting de navegador contra você mesmo, com método, e interpretar o resultado.
9. Explicar correlação de fluxo e ataque de confirmação, e por que Tor resiste.
10. Analisar tráfego Tor em ambiente próprio e distinguir uso legítimo de indício de compromisso.
11. Escolher a ferramenta certa para cada adversário: VPN, Tor, proxy, mistura de rede.
12. Medir a sua própria superfície de exposição antes e depois, com evidência.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | Modelagem de ameaça para privacidade | De quem você se protege; sigilo ≠ anonimato | 2 |
| 2 | Como a identidade vaza | Camadas de identificação: IP, DNS, TLS, browser, comportamento | 3 |
| 3 | Proxies: HTTP, SOCKS4, SOCKS5 | Como redirecionam, o que encaminham, onde vazam | 3 |
| 4 | VPN: o que ela é e o que ela não é | Túnel, confiança no provedor, mitos comuns | 3 |
| 5 | Tor por dentro I: diretório e circuito | Consenso, guarda, extensão de circuito, célula | 4 |
| 6 | Tor por dentro II: célula, stream, rendes-vous | Anatomia da célula, serviço oculto, v3 onion | 4 |
| 7 | Anatomia do vazamento | DNS, WebRTC, IPv6, timezone, fonte, metadado | 4 |
| 8 | Fingerprinting e superfície de browser | Por que Tor Browser é o que é; medição própria | 3 |
| 9 | Resistência a correlação | Correlação de fluxo, ataque de confirmação, mixnet | 3 |
| 10 | Tor em ambiente corporativo | Detectar, entender, e **não** bloquear errado | 3 |
| 11 | Ferramenta certa para cada adversário | Comparativo por modelo de ameaça | 2 |
| 12 | Projeto: sua superfície de exposição | Medir antes e depois, com evidência | 3 |

Cada módulo: teoria → demonstração em laboratório próprio → análise → avaliação. ~55% prática.

---

## ⚠ Ética, legalidade e conduta — vale para o curso inteiro

### O que é legal, e é o que este curso faz

| Prática | Situação |
|---|---|
| Usar Tor, VPN, proxy | **Legal** no Brasil e na maioria das jurisdições |
| Rodar um relay Tor | Legal; **não** é crime intermediar tráfego de terceiro |
| Rodar serviço oculto próprio, para estudo | Legal |
| Estudar fingerprinting **contra você mesmo** | Legal e recomendado |
| Analisar tráfego Tor **em rede própria** | Legal |
| Proteger fonte, identidade ou comunicação sob risco | Legal, e frequentemente um dever profissional |

### O que este curso não faz, e por quê

| Prática | Por que não está aqui |
|---|---|
| Identificar quem é usuário de Tor | É desanonimização — a antítese do que o Tor existe para fazer |
| Correlação de fluxo contra terceiro | Técnica de vigilância; exige autoridade legal |
| Construir proxy de interceptação para terceiro | É interceptação — crime (Lei 9.296/96) |
| Operar serviço oculto ilegal | É crime, e o material não orienta |
| Adquirir identidade falsa para fraude | É crime |
| Evadir investigação criminal legítima | Não é anonimato; é obstrução |

⚠ **Nada neste curso roda contra terceiro.** Todos os laboratórios usam **circuitos próprios**,
**serviço oculto próprio**, e **rede própria**. Você é o sujeito e o objeto de toda medição.

⚠ **Cuidado real com o laboratório:** rodar cliente Tor e serviço oculto na sua rede é legal e
seguro. **Mas se você rodar um relay de saída** (exit relay), o tráfego de terceiros passa pela sua
máquina — com implicação legal em algumas jurisdições, e com responsabilidade prática. O Módulo 10
discute isso em detalhe. Para o curso, **relay de saída não é necessário**.

### Proteção de dado de terceiro

⚠ **Se você trabalha com fonte ou pessoa sob risco, o dado que você manuseia é a vida de alguém.**
Metadado que você guarda, log que você mantém, captura que você faz — tudo isso é superfície. A
regra: colete o mínimo, retenha o mínimo, destrua no prazo. E sob a LGPD, isso não é boa prática —
é obrigação.

---

## O laboratório

Todo laboratório é **local e próprio**:

```
┌────────────────────────────────────────────────────────────────────┐
│                    SUA MÁQUINA / VM ISOLADA                        │
│                                                                    │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐  │
│  │ cliente      │   │ observador   │   │ serviço oculto        │  │
│  │ Tor + curl   │◀──│ tcpdump +    │   │ (seu, local, didático)│  │
│  │ browser      │   │ tshark       │   │                       │  │
│  └──────────────┘   └──────────────┘   └───────────────────────┘  │
│                                                                    │
│  faixa: 10.13.13.0/24   (quarta faixa do material — separada)     │
└────────────────────────────────────────────────────────────────────┘
```

⚠ **Você vai se conectar à rede Tor real no Módulo 5 em diante** — porque é a única forma de
estudar o Tor de verdade. Isso é uso legítimo e legal. Os laboratórios de serviço oculto são
**locais**, no seu próprio `onion service` de estudo.

---

## Ambiente

```bash
sudo apt update
sudo apt install -y tor torbrowser-launcher python3 python3-pip \
                    tcpdump tshark curl netcat-openbsd socat \
                    proxychains4 nyx obfs4proxy
pip3 install stem requests
```

| Ferramenta | Papel no curso |
|---|---|
| `tor` | O cliente Tor — objeto de estudo |
| `nyx` | Monitor de circuito Tor em terminal |
| `stem` | Biblioteca Python para controlar Tor (Módulos 5, 6, 12) |
| `tcpdump` / `tshark` | Análise de captura do tráfego Tor |
| `proxychains4` | Encadear proxy, para demonstrar vazamento (Módulo 3) |
| `socat` | Criar proxy simples, para entender o mecanismo |
| `curl` | Cliente para testar proxy e circuito |
| **Tor Browser** | O cliente correto — Módulo 8 |

⚠ **Use o Tor Browser para navegar de verdade; use `curl` para estudar.** O `curl` através de Tor
não tem as proteções de fingerprint do Tor Browser — e confundir os dois é o erro prático mais
comum do tema.

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (12) | 50% | Medição própria, com evidência |
| Relatório de vazamento (Módulo 7) | 20% | O que vaza, por qual canal, com prova |
| Análise de circuito (Módulos 5 e 6) | 15% | Leitura de captura e de consenso |
| Projeto final (Módulo 12) | 15% | Superfície de exposição medida antes e depois |

**Rubrica central:** você não entrega "usei Tor". Você entrega **a captura**, **a medição** e **o
que ela revela** — inclusive o que continua exposto depois.

---

## Referências abertas

- **Especificação do Tor** — https://spec.torproject.org/
- **Tor Protocol Specification** — https://spec.torproject.org/tor-spec/
- **Tor Rendezvous Specification (v3 onion)** — https://spec.torproject.org/rend-spec/
- **Tor Project, documentação e blog** — https://community.torproject.org/
- **"Tor: The Second-Generation Onion Router"** — Dingledine, Mathewson, Syverson (USENIX 2004)
- **"Users Get Routed"** — Murdoch & Danezis — correlação de fluxo
- **RFC 1928** (SOCKS5) · **RFC 1929** (SOCKS5 auth)
- **RFC 7230–7235** (HTTP/1.1) · **RFC 9110–9114** (HTTP, atualizados)
- **RFC 8484** (DoH)
- **"The Panopticlick Study"** — Eckersley (fingerprinting)
- **Cover Your Tracks** (EFF) — https://coveryourtracks.eff.org/
- **Tor Browser Design Document** — https://2019.www.torproject.org/projects/torbrowser/design/
- **OONI** — https://ooni.org/ — medição de censura e bloqueio
- **Security in-a-box** (Front Line Defenders / Tactical Tech)
- **Surveillance Self-Defense** (EFF) — https://ssd.eff.org/
- **NIST SP 800-77** (IPsec VPN) · **RFC 7296** (IKEv2)
- **WireGuard whitepaper**
- **"This is not a game: anonymity is not a crime"** — material de conscientização

---

*Material didático original, de propósito defensivo e de proteção de privacidade. Nenhum trecho
reproduzido de obra comercial protegida, e nenhum material que ensine desanonimização de terceiro
ou evasão de investigação legítima.*
