# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| ACK duplicado | Duplicate ACK | M4 | Mesmo `ack` repetido. Três disparam fast retransmit. Sinal de head-of-line blocking. |
| ALPN | ALPN (Application-Layer Protocol Negotiation) | M9 | Extensão TLS que negocia o protocolo de aplicação (`h2`, `http/1.1`) no handshake. |
| ARP | ARP (Address Resolution Protocol) | M2 | Resolve IP → MAC na mesma LAN. **Sem autenticação** — base de ataque em camada 2. |
| Autenticidade | Authenticity | M9 | Garantia de que o servidor é quem diz ser. Sustentada pelo certificado. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Beacon | Beacon | M5 | Chamada periódica do host comprometido ao C2. Detectável por regularidade. |
| Black hole de MTU | MTU black hole | M4 | Conexão trava em pacote grande porque o ICMP de correção de MTU está bloqueado. |
| BPF | BPF (Berkeley Packet Filter) | M6 | Linguagem de filtro aplicada no kernel. Sintaxe do `tcpdump` com `-f`. |
| Broadcast | Broadcast | M2 | Envio a todos da LAN (`ff:ff:ff:ff:ff:ff`). Não existe em IPv6. |
| Buffer bloat | Bufferbloat | M4 | Latência alta sem perda, causada por buffer grande escondendo congestionamento. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Capture filter | Capture filter | M7 | Filtro BPF aplicado **antes** de gravar. Irreversível. |
| Certificate pinning | Certificate pinning | M9 | Cliente fixa a chave esperada em vez de confiar em qualquer CA. Derrota interceptação. |
| CIDR | CIDR | M1 | Notação `IP/prefixo`. Os N primeiros bits são a parte de rede. |
| Conntrack | Connection tracking | M10 | Rastreamento de conexões no kernel. Base de `ct state established`. |
| Cipher suite | Cipher suite | M9 | Conjunto de algoritmos negociados no handshake TLS. |
| `CLOSE-WAIT` | CLOSE-WAIT | M4 | O peer fechou e a aplicação não chamou `close()`. **Bug de aplicação.** |
| Congestion control | Congestion control | M4 | Adaptação do TCP à capacidade da rede (CUBIC, BBR, Reno). |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| DAI | Dynamic ARP Inspection | M2 | Switch valida ARP contra a tabela de DHCP snooping. Defesa contra envenenamento. |
| Data Offset | Data Offset | M4 | Campo TCP que indica o tamanho do header em palavras de 4 bytes. |
| Display filter | Display filter | M7 | Filtro aplicado **depois** de ler. Reversível. Sintaxe Wireshark, opção `-Y`. |
| DNSSEC | DNSSEC | M5 | Assinatura criptográfica das respostas DNS. Garante **autenticidade**, não sigilo. |
| DoH / DoT | DNS over HTTPS / TLS | M5 | Cifra a consulta DNS. Garante **confidencialidade**, não autenticidade. |
| Domínio de broadcast | Broadcast domain | M2 | Conjunto de máquinas que recebem um broadcast. Limite de segurança da LAN. |
| `drop` | drop | M10 | Descartar sem responder. Silencioso — esconde o firewall. |
| DGA | Domain Generation Algorithm | M5 | Algoritmo que gera domínios de C2. Reconhecível por TTL baixo e entropia alta. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| ECH | Encrypted Client Hello | M9 | Cifra o SNI. Resposta ao fato de que o SNI é visível em TLS 1.3. |
| Encapsulamento | Encapsulation | M1 | Cada camada embrulha o dado da de cima com seu header. |
| EtherType | EtherType | M2 | Campo de 2 bytes que diz o que vem dentro do quadro. `0x0800` IPv4, `0x0806` ARP. |
| Exfiltração | Exfiltration | M5 | Saída de dado por canal disfarçado (DNS, ICMP, HTTP). |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Fast retransmit | Fast retransmit | M4 | Retransmissão disparada por três ACK duplicados, sem esperar RTO. |
| FCS | FCS (Frame Check Sequence) | M2 | CRC-32 do quadro. **Removido pela placa** — não aparece no tcpdump. |
| Flag TCP | TCP flag | M4 | SYN, ACK, FIN, RST, PSH, URG, ECE, CWR, NS. |
| Fragmentação | Fragmentation | M3 | Divisão de pacote grande. IPv6 só fragmenta na origem. |
| FIN | FIN | M4 | Fechamento educado. Consome um número de sequência. |

## G

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| GOT | GOT (Global Offset Table) | — | Não usado neste curso (ver curso de assembly). |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Handshake TCP | TCP handshake | M2 | SYN → SYN-ACK → ACK. Três pacotes antes de qualquer dado. |
| Head-of-line blocking | Head-of-line blocking | M4 | Um segmento perdido bloqueia todos os posteriores. Motivou o QUIC. |
| Hook | Hook | M10 | Ponto de interceptação do `netfilter`: PREROUTING, INPUT, FORWARD, OUTPUT, POSTROUTING. |
| Hop Limit | Hop Limit | M3 | Nome do TTL em IPv6. Mesmo conceito. |
| HPACK | HPACK | M9 | Compressão de cabeçalho HTTP/2 com dicionário dinâmico. Impede decodificação de `.pcap` isolado. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| ICMP | ICMP | M3 | Mensagens de erro e diagnóstico da camada 3. Tipos 3 e 11 são os mais úteis. |
| IHL | IHL (Internet Header Length) | M3 | Tamanho do header IPv4 em palavras de 4 bytes. `5` = 20 bytes. |
| Interceptação | Interception | M9 | Ver/alterar tráfego no meio do caminho. Legítima com autorização; crime sem ela. |
| IPv6 | IPv6 | M3 | Header fixo de 40 B, sem checksum, sem broadcast, NDP no lugar de ARP. |

## J

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Jitter | Jitter | M5/M8 | Variação de latência ou de intervalo. Alto prejudica VoIP e videochamada. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Longest prefix match | Longest prefix match | M3 | Vence a rota mais específica. Modelo oposto ao do firewall. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| MAC | MAC address | M2 | Endereço de 6 bytes da placa. Usado no encaminhamento em camada 2. |
| MSS | MSS (Maximum Segment Size) | M2 | Tamanho máximo de payload TCP. 1460 em Ethernet com MTU 1500. |
| MTU | MTU (Maximum Transmission Unit) | M2 | Tamanho máximo do payload de enlace. 1500 em Ethernet padrão. |
| `mtr` | mtr (My Traceroute) | M8 | Traceroute contínuo com estatística por salto. Obrigatório para problema intermitente. |
| Multiplexação | Multiplexing | M9 | Várias requisições numa conexão (HTTP/2). Quebra "uma conexão = uma requisição". |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| NDP | NDP (Neighbor Discovery Protocol) | M3 | Substituto do ARP em IPv6. Roda sobre ICMPv6 em multicast. |
| `netfilter` | netfilter | M10 | Framework de firewall do Linux. `nftables` é a interface atual. |
| `nftables` | nftables | M10 | Sintaxe atual de firewall do Linux, substitui `iptables`. |
| NXDOMAIN | NXDOMAIN | M5 | RCODE 3: o nome não existe. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Padding | — | M1 | Não se aplica a headers de rede; aparece em struct (ver curso de assembly). |
| Payload | Payload | M1 | O dado transportado, depois dos headers. |
| PMTUD | Path MTU Discovery | M4 | Descoberta da MTU do caminho, via ICMP 3/4. Bloquear ICMP quebra isso. |
| Porta efêmera | Ephemeral port | M2 | Porta temporária escolhida pelo cliente. Faixa típica: 32768–60999. |
| Prologue | — | — | Não se aplica (ver curso de assembly). |
| Proxy de interceptação | Interception proxy | M9 | Termina TLS com o cliente e origina TLS com o servidor. Exige CA no trust store. |

## Q

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Quíntupla | 5-tuple | M2 | (protocolo, IP src, porta src, IP dst, porta dst). Identifica uma conexão. |
| QUIC | QUIC | M5 | Protocolo sobre UDP. Trafega em 443/UDP. Base do HTTP/3. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `reject` | reject | M10 | Recusa ativa (RST ou ICMP). Revela a existência do firewall. |
| Retransmissão | Retransmission | M4 | Reenvio por RTO ou por fast retransmit. |
| RST | RST | M4 | Aborto de conexão. Porta fechada, firewall rejeitando, ou app derrubou. |
| RTO | RTO (Retransmission Timeout) | M4 | Timer que dispara retransmissão. Backoff exponencial. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| SACK | SACK (Selective ACK) | M4 | Receptor informa os blocos recebidos. Evita retransmitir o que chegou. |
| `scapy` | Scapy | M10 | Biblioteca Python para gerar, enviar e analisar pacotes. |
| Segmento | Segment | M1 | Unidade da camada de transporte (TCP). |
| Shebang | — | — | Não se aplica (ver curso de bash). |
| SNI | SNI (Server Name Indication) | M9 | Nome do domínio no ClientHello. **Visível mesmo em TLS 1.3** e não verificado. |
| `ss` | ss (socket statistics) | M4 | Mostra sockets e estado do TCP sem capturar. `-ti` mostra cwnd e RTT. |
| Stack | — | — | Não se aplica a este curso (ver curso de assembly). |
| Subnetting | Subnetting | M3 | Divisão de uma faixa em sub-redes menores. |
| Switch | Switch | M2 | Dispositivo de camada 2. Aprende MACs e encaminha pela porta certa. |
| SYN flood | SYN flood | M4 | Muitos SYN sem completar. Aparece como acúmulo de `SYN-RECV`. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| TIME-WAIT | TIME-WAIT | M4 | Estado de 2×MSL após fechar. Existe para garantir ACK final e evitar confusão. |
| TLS 1.3 | TLS 1.3 | M9 | Handshake de 1 RTT, certificado cifrado, SNI ainda visível. |
| `traceroute` | traceroute | M8 | Mapeia caminho usando TTL decrescente. Mede ida + volta. |
| Trust store | Trust store | M9 | Conjunto de CAs que o cliente confia. Determina se interceptação funciona. |
| `tshark` | tshark | M7 | Versão CLI do Wireshark. Dissecção, filtro de exibição, estatística. |
| TTL | TTL (Time To Live) | M3 | Salto máximo. Decresce 1 por roteador. Base do traceroute. |
| Túnel DNS | DNS tunneling | M5 | Dado codificado em nome de subdomínio. Canal de exfiltração. |

## U

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| UDP | UDP | M5 | Header de 8 bytes. Sem handshake, sem retransmissão, sem ordem. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| VLAN | VLAN (802.1Q) | M2 | Rede lógica dentro do switch físico. Fronteira de segurança, não de organização. |
| VLAN hopping | VLAN hopping | M2 | Fuga de VLAN via Q-in-Q ou configuração errada de `native VLAN`. |

## W

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Window scale | Window scale | M4 | Multiplicador da janela, negociado no handshake. `janela real = win × 2^wscale`. |

---

## Modelo de camadas — consulta rápida

| TCP/IP | OSI | Bancada | Ofensor comum |
|---|---|---|---|
| Aplicação | 7/6/5 | HTTP, DNS, TLS, SSH | Credencial exposta, lógica de negócio |
| Transporte | 4 | TCP, UDP, QUIC | Porta aberta, RST, `win 0` |
| Rede | 3 | IPv4, IPv6, ICMP | Rota ausente, firewall, MTU |
| Enlace | 2/1 | Ethernet, ARP, Wi-Fi | ARP spoofing, VLAN hop |

## Offsets padrão — consulta rápida

Caso comum, cabeçalhos sem opções, em captura Ethernet:

| Campo | Offset | Tamanho |
|---|---|---|
| Ethernet — MAC destino | 0 | 6 |
| Ethernet — MAC origem | 6 | 6 |
| Ethernet — EtherType | 12 | 2 |
| IP — Versão/IHL | 14 | 1 |
| IP — Tamanho total | 16 | 2 |
| IP — TTL | 22 | 1 |
| IP — Protocolo | 23 | 1 |
| IP — IP origem | 26 | 4 |
| IP — IP destino | 30 | 4 |
| TCP — Porta origem | 34 | 2 |
| TCP — Porta destino | 36 | 2 |
| TCP — Sequência | 38 | 4 |
| TCP — Confirmação | 42 | 4 |
| TCP — Data Offset / Flags | 46 | 2 |
| TCP — Janela | 48 | 2 |
| TCP — Checksum | 50 | 2 |
| **Payload** (HTTP) | **54** | — |
| UDP — Porta origem | 34 | 2 |
| UDP — Porta destino | 36 | 2 |
| **Payload** (DNS) | **42** | — |

⚠ **Estes offsets só valem sem opções.** IHL > 5 no IP, ou Data Offset > 5 no TCP, ou tag VLAN
entre Ethernet e IP — qualquer um deles desloca tudo. **Sempre confirme o IHL antes de ler.**

## Portas — consulta rápida

| Porta | Protocolo | Observação |
|---|---|---|
| 22 | TCP | SSH |
| 53 | TCP/UDP | DNS — **TCP também**, para resposta grande |
| 67/68 | UDP | DHCP |
| 80 | TCP | HTTP |
| 123 | UDP | NTP |
| 161/162 | UDP | SNMP |
| 443 | TCP | HTTPS |
| **443** | **UDP** | **QUIC / HTTP/3 — não é HTTP comum** |
| 500/4500 | UDP | IPsec (IKE) |
| 8000-8099 | TCP | Comumente aplicação de teste |

---

*Material didático original.*
