---
title: "Anonimato e Privacidade na Internet: Tor, Proxies e o que Realmente Protege"
nivel: basico
tags: [anonimato, tor, vpn, opsec, fingerprint, trafego]
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


## Público-alvo

- Jornalistas, pesquisadores e ativistas que lidam com fonte sob risco.
- Advogados e defensores de direitos humanos.
- Profissionais de segurança que precisam entender ofuscação de origem.
- Analistas de rede que lidam com tráfego Tor em ambiente corporativo.
- Qualquer pessoa que queira entender **de verdade** o que VPN e Tor fazem.
- Curiosos técnicos que já usaram Tor e nunca souberam como funciona.

**Não é** para quem nunca usou terminal. E não é um curso de "dicas": é engenharia.


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
