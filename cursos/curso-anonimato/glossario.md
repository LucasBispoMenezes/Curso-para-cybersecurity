# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Adversário | Adversary | M1 | Quem você quer evitar. Nomeado por nível A1–A6, com recurso estimado. |
| Advogado do diabo | Red team / contrarian analysis | M1 | Técnica de reduzir confiança excessiva: procure o que **refutaria** a hipótese. |
| Anonymity set | Anonymity set | M9 | Conjunto de quem você se parece. Cada traço único o reduz. |
| Anonimato de origem | Origin anonymity | M1 | **Quem** falou. Diferente de sigilo, que protege **o que** foi dito. |
| ASN | Autonomous System Number | M2 | Organização dona do bloco de IP. Vê-se por consulta pública de ASN. |
| `ATYP` | Address type | M3 | Campo do SOCKS5: `01` IPv4, `03` **domínio** (o proxy resolve), `04` IPv6. |
| Ataque de confirmação | Confirmation attack | M9 | Versão ativa da correlação: injeta ou bloqueia em um ponto e observa o outro. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Bridge (ponte) | Bridge | M10 | Relay Tor **não listado** no consenso. Escape do bloqueio por lista. |
| `BadExit` | BadExit flag | M5 | Flag que marca relay de saída suspeito. Reputação comunitária. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Canal de vazamento | Leak channel | M7 | Uma das oito vias pelas quais identidade escapa. |
| Canvas fingerprint | Canvas fingerprint | M8 | Hash do resultado da renderização em `<canvas>`. Determinístico por máquina. |
| Célula | Cell | M6 | Unidade de transporte do Tor. **514 bytes fixos** depois do handshake. |
| Circuit isolation | Circuit isolation | M6 / M8 | Circuito separado por contexto. Impede correlacionar dois destinos do mesmo usuário. |
| Comportamento | Behavior | M2 | A camada que nenhuma ferramenta corrige: horário, estilo, ritmo, metadado. |
| Consenso | Consensus | M5 | Lista assinada de relays, publicada pelas autoridades de diretório. |
| Correlação de fluxo | Flow correlation | M9 | Comparar volume e tempo em **dois** pontos para ligar origem e destino. |
| Compartimentação | Compartmentalization | M7 / M11 | Separar identidades por atividade. **Disciplina, não ferramenta.** |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Descriptor | Descriptor | M6 | Registro publicado pelo serviço oculto, assinado, sem revelar seu IP. |
| DPI | Deep Packet Inspection | M10 | Inspeção de conteúdo para reconhecer protocolo. Igual em corporação e em censura. |
| DNS vazando | DNS leak | M3 | Resolução feita **localmente** antes do proxy. Irreversível. |
| DNSPort | DNSPort | M7 | Diretiva do Tor para resolver DNS **por dentro** do circuito. Solução completa. |
| DoH | DNS over HTTPS | M2 | Cifra a consulta DNS. **Transfere** a confiança ao operador do resolvedor. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Entropia (de fingerprint) | Entropy | M8 | Quantos outros se parecem com você. 18 bits ≈ 1 em 262.000. |
| Extensão de circuito | Circuit extension | M5 | `EXTEND` cifrado em camadas. A guarda **não lê** para onde você estende. |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Fingerprinting | Fingerprinting | M8 | Identificar navegador pelas características dele. Atravessa o Tor. |
| Flag de relay | Relay flag | M5 | `Guard`, `Exit`, `Fast`, `Stable`, `Running`, `Valid`, `BadExit`. |

## G

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Guarda | Guard (entry guard) | M5 | Primeiro salto. **Estável por meses**, por projeto. Conhece seu IP, não o destino. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Introduction Point | Introduction Point (IP) | M6 | Relay que recebe o convite do cliente para o serviço. Não é o serviço. |
| IPv6 leak | IPv6 leak | M4 / M7 | Tráfego IPv6 pelo caminho nativo, fora do túnel. Silencioso. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Mixnet | Mixnet | M9 | Rede que **acumula e embaralha** pacotes de vários usuários. Latência alta, resistência forte. |
| Modelo de ameaça | Threat model | M1 | Adversário nomeado + o que se protege + o que **não** precisa proteger. |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Nível de adversário | Adversary tier | M1 | A1 oportunista · A2 rastreador · A3 provedor · A4 operador local · A5 escala · A6 alcance físico. |

## O

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `obfs4` | obfs4 | M10 | Pluggable transport que transforma o tráfego em tráfego sem assinatura. |
| Onion routing | Onion routing | M5 | Cifra em camadas, uma por salto. Cada relay abre só a sua. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `onion` (v3) | v3 onion service | M6 | Serviço oculto com endereço de 56 caracteres, derivado de chave Ed25519. |
| Pluggable transport | Pluggable transport | M10 | Camada que ofusca o tráfego Tor. Resolve **disponibilidade**, não anonimato. |
| Pseudonimato | Pseudonymity | M3 | Identidade consistente sob outro nome. **Não** é anonimato. |
| Proxy | Proxy | M3 | Intermediário. **Transfere** confiança, não elimina observação. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Relay | Relay | M5 | Nó da rede Tor: guarda, meio ou saída. |
| `remote_dns` | Remote DNS | M3 | Resolver o nome **no proxy** em vez de localmente. `ATYP=03` no SOCKS5. |
| Rendez-vous point | Rendezvous point | M6 | Ponto onde os circuitos de cliente e serviço se encontram. |
| Resistência a correlação | Correlation resistance | M9 | Tornar caro ligar origem e destino por observação. Parcial no Tor, forte na mixnet. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Saída (exit) | Exit relay | M5 | Último salto. Vê o destino; **vê o conteúdo em claro** se não houver TLS. |
| Sigilo de conteúdo | Content confidentiality | M1 | **O que** foi dito. Diferente de anonimato, **independente** dele. |
| SNI | Server Name Indication | M2 | Nome do site no ClientHello. Visível em claro; irrelevante sob Tor. |
| SOCKS5 | SOCKS5 (RFC 1928) | M3 | Proxy de transporte com suporte a domínio (`ATYP=03`) e UDP. |
| `snowflake` | Snowflake | M10 | Ponte que usa navegador voluntário. Conjunto efêmero e enorme. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Tails | Tails | M11 | Sistema **amnésico** que roteia tudo por Tor. Resolve rastro em disco, não comportamento. |
| Timezone como contraditor | Timezone contradiction | M8 | Timezone local com circuito estrangeiro é inconsistência — sinal de Tor. Por isso UTC. |
| Tor Browser | Tor Browser | M8 | Firefox reconstruído para **baixa entropia**. Sacrifica função por indistinguibilidade. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Vazamento | Leak | M7 | Saída de identidade fora do circuito. Oito canais. |
| VPN | VPN | M4 | Túnel de camada 3. **Redirecionamento de confiança**, total e único. |

## W

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `WebRTC` | WebRTC | M7 | Descoberta de IP para P2P. **Revela o IP real mesmo atrás de Tor.** Vazamento crítico. |
| Whonix | Whonix | M11 | Gateway Tor + VM isolada. Cobertura de sistema por **arquitetura**. |

---

## As seis camadas — consulta rápida

| # | Camada | O que vaza | Como corrigir |
|---|---|---|---|
| ① | Rede | IP, ASN, MAC, Wi-Fi | Tor, VPN |
| ② | Nome | Consulta DNS | `ATYP=03`, `DNSPort` |
| ③ | Aplicação (rede) | SNI, ALPN | Tor (cifra tudo até a saída) |
| ④ | Aplicação (conteúdo) | UA, cookie, referer | Tor Browser (padronização) |
| ⑤ | Sessão | Conta, login | **Compartimentação** — não tem software |
| ⑥ | Comportamento | Horário, estilo, metadado | **Disciplina** — mitigação parcial |

---

## A matriz de decisão — consulta rápida

| Ferramenta | A1 | A2 | A3 | A4 | A5 | A6 |
|---|---|---|---|---|---|---|
| HTTPS | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| VPN | ✓ | ✓ | ✗ | ✓ | ~ | ✗ |
| DNS cifrado | ✓ | ✗ | ~ | ✓ | ~ | ✗ |
| Proxy | ✓ | ✗ | ✗ | ~ | ✗ | ✗ |
| Tor | ✓ | ✓ | ✓ | ✓ | ~ | ~ |
| Tor Browser | ✓ | ✓ | ✓ | ✓ | ~ | ~ |
| Mixnet | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| **Disciplina** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Compartimentação** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Dispositivo limpo** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

⚠ **As três últimas linhas não são ferramentas de rede.** São as únicas que protegem contra A6.

---

## Ordem de frequência das quebras

| # | Causa | Prevenível |
|---|---|---|
| 1 | Conta/identidade cruzada | **Sim** — disciplina |
| 2 | Chave/senha mal guardada | **Sim** — higiene |
| 3 | Dispositivo comprometido | Parcialmente |
| 4 | Fingerprint de browser | **Sim** — Tor Browser |
| 5 | DNS / `WebRTC` | **Sim** — configuração |
| 6 | Correlação de fluxo | Parcialmente |
| 7 | Quebra de criptografia | **Não acontece** |

⚠ As linhas 1 e 2 causam a **maioria** dos danos reais. A linha 7 é a que a mídia discute, e é a
menos relevante.

---

## Os cinco pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **Anonimato é uma cadeia, e vale o elo mais fraco.** |
| 2 | **VPN transfere confiança; Tor distribui.** Não são a mesma coisa. |
| 3 | **A maior parte das quebras não é de protocolo** — é de identidade, higiene e comportamento. |
| 4 | **Pluggable transport resolve disponibilidade, não anonimato.** |
| 5 | **Existem problemas sem solução**, e a resposta correta é dizer isso. |

---

*Material didático original, de propósito defensivo e de proteção de privacidade.*
