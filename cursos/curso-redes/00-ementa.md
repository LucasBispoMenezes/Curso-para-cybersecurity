---
title: Redes para Profissionais de Seguranca: do Cabo ao Pacote
nivel: basico
tags: [redes, tcp-ip, tcpdump, pacote, dns, tls]
---# Redes para Profissionais de Segurança: do Cabo ao Pacote

**Ementa do curso · 30 horas · 10 módulos · PT-BR com termos técnicos em inglês**

---

## Visão geral

Este curso ensina redes **de dentro para fora**: você começa no sinal elétrico do cabo e termina
capturando, lendo e falsificando pacotes na sua própria rede de laboratório.

O fio condutor é uma pergunta: *o que realmente acontece entre o momento em que um programa
chama `connect()` e o momento em que o outro lado responde?* Cada módulo responde uma fatia
dessa pergunta — e cada fatia tem um lab onde você **observa o fenômeno**, não apenas lê sobre ele.

Toda a análise de pacotes usa **`tcpdump`** para capturar, **`traceroute`** para mapear caminho e
**`tshark`/`scapy` para dissecar e gerar tráfego**. Você vai ler hexadecimal e vai gostar.

**Material original.** Referências abertas ao final.

---

## Público-alvo

- Profissionais de segurança que sabem usar ferramenta mas não entendem o que ela mostra.
- Desenvolvedores cujo software "às vezes não conecta" e que nunca olharam um pacote.
- Analistas de SOC que veem alertas de rede e querem entender o que está por baixo.
- Estudantes de redes que querem ir além de "decoreba de camadas OSI".

**Não é** para quem nunca usou um terminal. Também não é um curso de certificação — o foco é
entender o mecanismo, não passar numa prova.

---

## Pré-requisitos

| Área | Nível exigido |
|---|---|
| Linux | Terminal, permissões, `sudo`, edição de arquivo |
| Base numérica | Binário e hexadecimal com conforto — os headers são hex |
| Programação | Básico de Python (para o Módulo 9) |
| Conceitos | Noção vaga de "IP" e "porta" basta; o curso constrói o resto |

Teste de nivelamento: você sabe dizer a diferença entre `192.168.0.1` e `10.0.0.1`? Se sim,
comece no Módulo 1 com calma. Se não, o Módulo 1 tem uma seção de endereçamento que resolve.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Explicar o que acontece na rede quando uma aplicação abre uma conexão TCP, camada por camada.
2. Ler um cabeçalho IPv4, IPv6, TCP, UDP e ICMP em hexadecimal, campo por campo.
3. Capturar e filtrar tráfego com `tcpdump`, incluindo filtros BPF não triviais.
4. Dissecar capturas com `tshark` e extrair campos específicos para análise.
5. Mapear caminho de rede com `traceroute` e interpretar o que ele revela e o que esconde.
6. Distinguir os tipos de Ethernet, e explicar o papel de ARP, VLAN e encapsulamento.
7. Explicar resolução de nomes de ponta a ponta, do `/etc/hosts` ao DNSSEC.
8. Reconhecer TLS 1.3 num capture e — **isso é importante** — saber exatamente o que um
   interceptador ainda consegue ver.
9. Interceptar tráfego em proxy sem quebrar TLS: entender o modelo de confiança que sustenta
   a interceptação legítima e a ilegítima.
10. Gerar e interpretar pacotes com `scapy`, incluindo o que um atacante faria numa rede local.
11. Explicar o modelo de firewall do Linux e escrever regras de `nftables`.
12. Diagnosticar problemas de rede com método, não com tentativa e erro.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | Fundamentos e o modelo de camadas | Endereçamento, encapsulamento, o que cada camada resolve | 3 |
| 2 | Ethernet, ARP e a rede local | Quadros, MAC, ARP, VLAN — e por que a LAN é um domínio de confiança | 3 |
| 3 | IP: endereçamento, roteamento e ICMP | IPv4, CIDR, IPv6, roteamento, o que o ICMP diz | 3 |
| 4 | TCP a fundo | Handshake, janela, retransmissão, congestion control, estados | 4 |
| 5 | UDP, DNS e o caminho do nome | UDP, resolução de nomes de ponta a ponta, DNSSEC | 3 |
| 6 | Captura com `tcpdump` | Filtros BPF, captura seletiva, análise de incidente | 3 |
| 7 | Análise com `tshark` | Dissecção, campos, estatísticas, automação | 3 |
| 8 | `traceroute` e o mapeamento de caminho | Como o TTL funciona, o que o traceroute revela | 2 |
| 9 | TLS, HTTP/2 e interceptação | TLS 1.3, SNI, proxy de interceptação, o que sobrevive | 3 |
| 10 | `scapy`, firewall e diagnóstico | Geração de pacote, `nftables`, método de troubleshooting | 3 |

Cada módulo: teoria → **captura comentada** → lab → avaliação. ~65% prática.

---

## O laboratório: três máquinas e um switch

Este curso assume um laboratório local. Nada nele precisa de internet durante os labs.

```
        ┌──────────────────────────────────────┐
        │   rede isolada 10.10.10.0/24         │
        │   (sem rota para a internet)         │
        └──────────────────────────────────────┘
             │            │             │
        ┌────▼───┐   ┌────▼───┐   ┌─────▼────┐
        │  alvo  │   │ cliente│   │ observador│
        │ .10    │   │  .20   │   │  .30      │
        └────────┘   └────────┘   └──────────┘
```

- **alvo** — servidor, escuta serviços (HTTP, HTTPS, SSH, DNS).
- **cliente** — quem gera o tráfego.
- **observador** — onde você captura (`tcpdump`).

⚠ **Isolamento é obrigatório.** Todos os labs usam a faixa `10.10.10.0/24` criada por você.
Capturar tráfego em rede que não é sua — mesmo com `tcpdump` passivo — é acesso indevido.
Veja a seção de ética abaixo.

---

## ⚠ Ética, legalidade e o que este curso NÃO ensina

Análise de tráfego é uma das atividades com maior potencial de violação de privacidade, e vale
ser claro sobre os limites desde a primeira página.

**Legítimo:**
- Capturar em rede própria.
- Capturar em rede do cliente com autorização escrita e escopo definido.
- Analisar captura fornecida a você por quem tinha direito sobre ela.
- Interceptar TLS em endpoint próprio, com certificado próprio.

**Não legítimo, e é crime:**
- Capturar tráfego em rede de terceiro, mesmo passivamente, mesmo sem ler nada.
- Interceptar TLS de usuário sem o consentimento dele e sem base legal.
- Falsificar ARP/DNS em rede que não é sua, mesmo "só para demonstrar".
- Acessar conteúdo de comunicação alheia (no Brasil, entre outros: art. 154-A do Código Penal
  para acesso indevido a dispositivo; a Lei 9.296/96 para interceptação de comunicações; e a
  LGPD para tratamento de dado pessoal obtido no caminho).

⚠ **Ponto que este curso não negocia:** todo lab roda em `10.10.10.0/24`, isolado, criado pelo
aluno. Se você adaptar um exercício para outra rede, a única coisa que torna isso legal é
**autorização escrita com escopo definido** — não a sua intenção.

Este curso **não** ensina a atacar rede alheia, a evadir detecção, nem a interceptar comunicação
de terceiros. Ensina a entender o que acontece no fio, com as próprias máquinas.

---

## Ferramentas usadas

```bash
sudo apt update
sudo apt install -y tcpdump tshark tshark traceroute mtr \
                    tcproute iproute2 iputils-ping dnsutils \
                    nftables netcat-openbsd curl openssl \
                    python3 python3-pip wireshark-common
pip3 install scapy
```

| Ferramenta | Papel no curso |
|---|---|
| `tcpdump` | Captura e filtragem BPF (Módulos 6, 10) |
| `tshark` | Dissecção e extração de campo (Módulo 7) |
| `traceroute` / `mtr` | Mapeamento de caminho (Módulo 8) |
| `scapy` | Geração e leitura de pacote em Python (Módulos 9, 10) |
| `dig` | Consultas DNS (Módulo 5) |
| `nftables` | Firewall (Módulo 10) |
| `openssl` | Inspeção de TLS (Módulo 9) |

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (10) | 55% | Capacidade de observar e explicar |
| Análise de captura (2, nos Módulos 7 e 9) | 20% | Leitura de tráfego real |
| Projeto final (diagnóstico de incidente) | 25% | Método aplicado |

**Rubrica central de todo lab:** você não entrega "funcionou". Você entrega **a captura** e
**a explicação** do que a captura mostra. Sem captura anexada, o lab não conta.

---

## Convenções

- **Hexdump sempre anotado.** Toda captura vem acompanhada da leitura campo a campo.
- `N O T A` marca o detalhe que costuma morder.
- `⚠` marca limite legal ou de segurança.
- Blocos `bash` são para digitar; os que começam com `$` mostram comando e saída esperada.

---

## Referências abertas

- **RFC 791** (IPv4) · **RFC 8200** (IPv6) · **RFC 9293** (TCP) · **RFC 768** (UDP)
- **RFC 792** (ICMP) · **RFC 1034/1035** (DNS) · **RFC 8446** (TLS 1.3)
- **RFC 826** (ARP) · **RFC 2131** (DHCP)
- **Wireshark Display Filter Reference** — https://www.wireshark.org/docs/dfref/
- **tcpdump / pcap-filter man page** — https://www.tcpdump.org/manpages/pcap-filter.7.html
- **BPF and tcpdump filters**, documentação do projeto
- **NIST SP 800-115** — *Technical Guide to Information Security Testing and Assessment*
- **MITRE ATT&CK** — técnicas de rede (T1046, T1040, T1557)
- **"Beej's Guide to Network Programming"** — livre
- **"Computer Networking: A Top-Down Approach"** — referência conceitual de mercado

---

*Material didático original. Nenhum trecho reproduzido de obra comercial protegida.*
