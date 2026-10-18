---
title: "Redes para Profissionais de Seguranca: do Cabo ao Pacote"
nivel: basico
tags: [redes, tcp-ip, tcpdump, pacote, dns, tls]
---title: Redes para Profissionais de Seguranca: do Cabo ao Pacote
nivel: basico
tags: [redes, tcp-ip, tcpdump, pacote, dns, tls]
---# Redes para Profissionais de Segurança: do Cabo ao Pacote

**Ementa do curso · 30 horas · 10 módulos · PT-BR com termos técnicos em inglês**


## Público-alvo

- Profissionais de segurança que sabem usar ferramenta mas não entendem o que ela mostra.
- Desenvolvedores cujo software "às vezes não conecta" e que nunca olharam um pacote.
- Analistas de SOC que veem alertas de rede e querem entender o que está por baixo.
- Estudantes de redes que querem ir além de "decoreba de camadas OSI".

**Não é** para quem nunca usou um terminal. Também não é um curso de certificação — o foco é
entender o mecanismo, não passar numa prova.


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


## Convenções

- **Hexdump sempre anotado.** Toda captura vem acompanhada da leitura campo a campo.
- `N O T A` marca o detalhe que costuma morder.
- `⚠` marca limite legal ou de segurança.
- Blocos `bash` são para digitar; os que começam com `$` mostram comando e saída esperada.


*Material didático original. Nenhum trecho reproduzido de obra comercial protegida.*
