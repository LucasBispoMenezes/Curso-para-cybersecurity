# Módulo 2 — Ethernet, ARP e a Rede Local

**Carga:** 3 horas (1h15 teoria · 1h45 lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Ler um quadro Ethernet campo por campo, incluindo MAC e EtherType.
2. Explicar o funcionamento de um switch e o que é o domínio de broadcast.
3. Entender ARP de ponta a ponta: request, reply, cache, e por que ele é o ponto fraco da LAN.
4. Explicar VLAN e por que ela é uma fronteira de confiança, não só de organização.
5. Ler um handshake TCP completo, em captura, campo por campo.

---

## ⚠ Ética

A LAN é um **domínio de confiança** — e este módulo explica por quê. Entender que ARP não tem
autenticação é o que permite defender a rede e o que permite atacá-la.

⚠ **A linha, e ela é clara:** todo lab aqui roda em `10.10.10.0/24`, criada por você. Falsificar
ARP, envenenar cache ou interceptar em rede que não é sua é crime, mesmo "para demonstrar" —
no Brasil, o art. 154-A do Código Penal cobre acesso indevido a dispositivo, e interceptar
comunicação é tratado pela Lei 9.296/96. Não existe versão inofensiva disso fora da sua rede.

---

## 2.1 O quadro Ethernet

A camada de enlace resolve um problema específico: **entregar um quadro entre duas placas na
mesma rede física.**

```
┌────────────────┬────────────────┬──────────────┬───────────────┬─────┐
│ MAC destino    │ MAC origem     │ EtherType    │ Payload       │ FCS │
│ 6 bytes        │ 6 bytes        │ 2 bytes      │ 46–1500 bytes │ 4B  │
└────────────────┴────────────────┴──────────────┴───────────────┴─────┘
 0               6               12             14              1514
```

| Campo | Tamanho | O que é |
|---|---|---|
| MAC destino | 6 B | Placa de destino. `ff:ff:ff:ff:ff:ff` = broadcast |
| MAC origem | 6 B | Placa de origem |
| EtherType | 2 B | O que vem dentro: `0x0800` IPv4, `0x0806` ARP, `0x86dd` IPv6, `0x8100` VLAN |
| Payload | 46–1500 B | O pacote encapsulado |
| FCS | 4 B | CRC-32 para detectar corrupção (**não aparece no tcpdump** — a placa remove antes) |

### Os valores de EtherType que você vai ver

| Valor | Significado |
|---|---|
| `0x0800` | IPv4 |
| `0x0806` | ARP |
| `0x86dd` | IPv6 |
| `0x8100` | VLAN tag (802.1Q) |
| `0x8847` | MPLS |
| `0x88cc` | LLDP (descoberta de vizinho) |

**Decore `0x0800` e `0x0806`.** São 90% do que aparece numa captura de LAN.

### MTU e fragmentação

O payload Ethernet máximo é 1500 bytes — a **MTU** (Maximum Transmission Unit). Um pacote IP
maior precisa ser fragmentado. É por isso que você vê `ping` com tamanhos específicos em
diagnóstico:

```bash
ping -M do -s 1472 10.10.10.10     # não fragmente
# 1472 + 20 (IP) + 8 (ICMP) = 1500 → cabe exatamente
```

⚠ **O problema de MTU é a causa número um de "funciona o ping mas não funciona o site".**
Pacote pequeno passa; pacote grande é descartado; o TCP não negocia corretamente. Você vai ver
isso no Módulo 4 e vai diagnosticar com captura, não com adivinhação.

---

## 2.2 O switch e o domínio de broadcast

Um switch é um dispositivo de camada 2. Ele aprende e encaminha com base em MAC.

**Como funciona:**

1. Quadro chega na porta 3 com MAC origem `AA:BB:CC:DD:EE:01`.
2. Switch anota: "MAC ...01 está na porta 3".
3. Olha o MAC destino. Se conhece a porta → encaminha só para lá.
4. Se **não** conhece → **flood**: manda para todas as portas, menos a de origem.
5. Se destino é `ff:ff:ff:ff:ff:ff` → flood, sempre.

**A tabela MAC** é essa memória. Você a inspeciona assim:

```bash
bridge fdb show              # tabela de encaminhamento (Linux)
ip neigh show                # ARP/NDP — camada 3, não confunda
```

### Broadcast, multicast e domínio de broadcast

| Tipo de endereço | MAC | Quem recebe |
|---|---|---|
| Unicast | Um MAC específico | Uma placa |
| Broadcast | `ff:ff:ff:ff:ff:ff` | Todas na mesma LAN |
| Multicast | `01:00:5e:...` (IPv4) | Quem se inscreveu no grupo |

**Domínio de broadcast** é o conjunto de máquinas que recebem um broadcast. Num switch puro, é
a LAN inteira. Isso importa por duas razões:

1. **Todo ARP request é broadcast.** Numa LAN de 500 máquinas, uma máquina falando ARP incomoda
   todas as outras 499.
2. **É um limite de segurança.** Quem está no mesmo domínio de broadcast vê o tráfego de todos
   (se a LAN usa hub, ou se o atacante consegue se posicionar).

⚠ **"Mesma LAN = mesma confiança" é uma suposição que a rede faz e que você não deve fazer.**
Numa rede corporativa, uma impressora comprometida e o servidor de banco de dados estão no mesmo
domínio de broadcast. O ARP não sabe distinguir um do outro.

---

## 2.3 ARP — a peça sem autenticação

**ARP** (Address Resolution Protocol, RFC 826) resolve: *"eu tenho um IP; qual o MAC
correspondente?"*

Sem ele, o kernel não pode montar o quadro Ethernet — porque o header de enlace precisa de MAC,
não de IP.

### O fluxo normal

```
Máquina A quer falar com 10.10.10.10, e não tem esse MAC no cache.

A → broadcast: "Quem tem 10.10.10.10? Diga para 10.10.10.20"
                (destino ff:ff:ff:ff:ff:ff, EtherType 0x0806)

Todas as máquinas da LAN recebem.
Só a que tem 10.10.10.10 responde:

alvo → A (unicast): "10.10.10.10 está em AA:BB:CC:DD:EE:10"

A guarda no cache ARP e monta o quadro.
```

**Captura típica:**

```
$ sudo tcpdump -i eth0 -nn -e 'arp'

14:22:01.334521 aa:bb:cc:dd:ee:20 > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42:
  Request who-has 10.10.10.10 tell 10.10.10.20, length 28

14:22:01.334812 aa:bb:cc:dd:ee:10 > aa:bb:cc:dd:ee:20, ethertype ARP (0x0806), length 42:
  Reply 10.10.10.10 is-at aa:bb:cc:dd:ee:10, length 28
```

Leia isso com atenção:

1. **`ff:ff:ff:ff:ff:ff` no destino** — é broadcast. Todos recebem.
2. **`Request who-has`** — a pergunta.
3. **`Reply ... is-at`** — a resposta, já em unicast.
4. **`length 28`** — tamanho do payload ARP (28 bytes, o header ARP sem padding).

### A estrutura do pacote ARP

```
┌─────────────────┬──────────────────────────────┐
│ Ethernet (14 B) │ ARP (28 B)                   │
└─────────────────┴──────────────────────────────┘

ARP:
  Hardware type   (2 B)   = 1 (Ethernet)
  Protocol type   (2 B)   = 0x0800 (IPv4)
  HW addr len     (1 B)   = 6
  Proto addr len  (1 B)   = 4
  Operação        (2 B)   = 1 request, 2 reply
  MAC origem      (6 B)
  IP origem       (4 B)
  MAC destino     (6 B)   = 00:00...00 no request
  IP destino      (4 B)
```

### ⚠ O problema estrutural: ARP não tem autenticação

**Qualquer máquina pode responder a qualquer ARP request, dizendo qualquer coisa.** Não há
verificação, assinatura, nem validação. Se outra máquina responder "10.10.10.1 está no MEU MAC",
o solicitante acredita — e passa a mandar tráfego para o atacante.

Isso não é bug do ARP. É a decisão de projeto de 1982, quando a rede era um laboratório de
universidade com uma dúzia de máquinas confiáveis.

**Consequência:** uma LAN é, por construção, um lugar onde os participantes podem se enganar
mutuamente. É por isso que:

- "Estou na rede interna, então estou seguro" é falso.
- Segmentação de rede existe e importa.
- VLAN é fronteira de segurança, não organização cosmética (próxima seção).
- Você deve usar `arpwatch` ou equivalente em rede crítica.

### Endurecendo ARP

| Defesa | O que faz |
|---|---|
| **Dynamic ARP Inspection (DAI)** | Switch valida ARP contra a tabela DHCP snooping |
| **Static ARP entries** | Mapeamento fixo para hosts críticos — não escala |
| **VLAN + segmentação** | Reduz o domínio onde o ataque funciona |
| **802.1X** | Impede dispositivo não autorizado de entrar na porta |
| **Monitoramento** | `arpwatch` avisa quando um IP troca de MAC |

```bash
# Entrada estática (útil para o gateway em máquina crítica)
sudo ip neigh add 10.10.10.1 lladdr aa:bb:cc:dd:ee:01 dev eth0 nud permanent
sudo ip neigh show
```

⚠ Em rede corporativa, `ip neigh` com centenas de entradas é normal. O que **não** é normal é o
mesmo IP mudando de MAC repetidamente — isso é sinal de ARP poisoning e você deve investigar.

---

## 2.4 VLAN — a fronteira que importa

**VLAN** (802.1Q) cria redes lógicas separadas dentro do mesmo switch físico.

```
Switch físico
├── VLAN 10  — Departamento Financeiro   10.10.10.0/24
├── VLAN 20  — Servidores                10.10.20.0/24
└── VLAN 30  — Visitantes                10.10.30.0/24
```

Um quadro com tag VLAN ganha 4 bytes extras após o MAC origem:

```
┌──────────┬──────────┬───────────┬──────────┬─────────────┬───────────┐
│ MAC dst  │ MAC src  │ 0x8100    │ TCI      │ EtherType   │ Payload   │
│ 6 B      │ 6 B      │ (2 B)     │ (2 B)    │ real (2 B)  │           │
└──────────┴──────────┴───────────┴──────────┴─────────────┴───────────┘
```

O **TCI** contém: prioridade (3 bits), DEI (1 bit), e **VLAN ID (12 bits)** — que é o número da
VLAN, de 1 a 4094.

### Por que VLAN é segurança e não organização

**Isolamento de broadcast:** máquinas em VLANs diferentes não veem o ARP uma das outras. Um
atacante na VLAN de visitantes não consegue falar ARP com o servidor de banco.

**Roteamento controlado:** tráfego entre VLANs precisa passar por um roteador ou firewall de
camada 3 — onde você aplica política.

⚠ **Mas VLAN não é uma fronteira absoluta.** Duas coisas podem furar:

1. **VLAN hopping** — alguns switches mal configurados aceitam quadros com tag dupla
   (Q-in-Q) ou permitem que a porta tronco seja explorada. Configuração errada de `native VLAN`
   é a causa clássica.
2. **Configuração equivocada** — uma porta de acesso configurada como tronco expõe todas as VLANs
   àquele dispositivo.

**A lição prática:** VLAN é uma camada de defesa, não a única. Segmentação de verdade combina
VLAN + firewall entre segmentos + autenticação de porta.

### Capturando tráfego com tag

```bash
sudo tcpdump -i eth0 -nn -e 'vlan'

# Filtrar por VLAN específica
sudo tcpdump -i eth0 -nn -e 'vlan 10'

# Ver a tag explicitamente
sudo tcpdump -i eth0 -XX -c 3 'vlan'
```

N N **Se você está numa porta de acesso (o caso normal de estação de trabalho), o switch
remove a tag antes de entregar o quadro.** Você não vê `vlan` na captura. Isso é esperado, e é a
razão pela qual "não vejo tag VLAN" não significa "não tem VLAN na rede".

---

## 2.5 O handshake TCP em captura — a leitura que você vai repetir mil vezes

Este é o exercício de leitura mais importante do curso. Vamos fazer devagar, porque você vai
usar exatamente este procedimento em todo incidente de rede da sua vida.

### O que acontece no fio

```
CLIENTE                                                      SERVIDOR
10.10.10.20:53142                                    10.10.10.10:80

     │  ── SYN  seq=1000 ─────────────────────────────────▶  │
     │                                                        │
     │  ◀────────────────────  SYN-ACK  seq=5000 ack=1001 ──  │
     │                                                        │
     │  ── ACK  seq=1001 ack=5001 ─────────────────────────▶  │
     │                                                        │
     │  ═══════ conexão estabelecida ═══════                  │
```

**Três pacotes, e só então o dado.** É o famoso *three-way handshake*.

- **SYN:** "quero abrir conexão, meu número de sequência inicial é X."
- **SYN-ACK:** "aceito, meu número inicial é Y, e confirmei o seu X."
- **ACK:** "confirmei seu Y. Podemos falar."

### Captura comentada

```bash
sudo tcpdump -i eth0 -nn -S 'tcp port 80 and host 10.10.10.10'
```

```
14:25:03.101234 IP 10.10.10.20.53142 > 10.10.10.10.80: Flags [S], seq 3735928559, win 64240, options [mss 1460,sackOK,TS val 1234 ecr 0,nop,wscale 7], length 0
14:25:03.102456 IP 10.10.10.10.80 > 10.10.10.20.53142: Flags [S.], seq 2712847316, ack 3735928560, win 65160, options [mss 1460,sackOK,TS val 5678 ecr 1234,nop,wscale 7], length 0
14:25:03.103001 IP 10.10.10.20.53142 > 10.10.10.10.80: Flags [.], ack 1, win 501, options [nop,nop,TS val 1235 ecr 5678], length 0
```

**Vamos ler lista por lista:**

| Campo | Valor (pacote 1) | O que significa |
|---|---|---|
| `IP` | — | Camada 3 |
| `10.10.10.20.53142` | IP + porta de origem | **Porta efêmera**, escolhida pelo cliente |
| `>` | — | Direção |
| `10.10.10.10.80` | IP + porta destino | O serviço |
| `Flags [S]` | SYN | Início de conexão |
| `seq 3735928559` | Número inicial | **Aleatório**, por segurança (evita injeção predizível) |
| `win 64240` | Janela | Quantos bytes o cliente aceita sem ACK |
| `options [mss 1460...]` | Opções | MSS, SACK, timestamps, window scale |
| `length 0` | Tamanho do payload | **Handshake não carrega dado** |

**No pacote 2 (`Flags [S.]`):**
- O **`.`** significa ACK. Então `S.` = SYN + ACK.
- `ack 3735928560` = seq do cliente (3735928559) **+ 1**. O SYN consome um número de sequência.

**No pacote 3 (`Flags [.]`):**
- Só ACK.
- Note `ack 1` — porque usei `-S` (sequência absoluta) no... na verdade, este pacote mostra
  `1` porque o tcpdump resolveu o ack relativo. **Isso é uma pegadinha clássica:** `-S` mostra
  números absolutos em todos os pacotes; sem `-S`, o tcpdump usa números relativos a partir do
  primeiro pacote de cada direção. Os dois são corretos, e você precisa saber qual está vendo.

N N **Sempre use `-S` quando estiver depurando.** Números relativos são bons para leitura humana
("o ACK 1 confirma o SYN"), absolutos são obrigatórios quando você precisa correlacionar pacotes
ou investigar números de sequência suspeitos. Quando o material mostrar `ack 1`, saiba que é
relativo.

### A porta efêmera

`53142` é uma porta efêmera — escolhida pelo kernel do cliente no momento da conexão. A faixa
típica no Linux:

```bash
cat /proc/sys/net/ipv4/ip_local_port_range
# 32768    60999
```

**Isso importa para análise:** uma conexão é identificada pela **quíntupla**
(proto, IP src, porta src, IP dst, porta dst). Por isso milhares de conexões ao mesmo servidor
na porta 80 são distinguíveis: cada uma tem uma porta de origem diferente.

⚠ **Sinal de alerta em análise:** milhares de conexões do mesmo IP com portas efêmeras
sequenciais e duração muito curta = varredura ou exfiltração. Você vai voltar nisso nos
Módulos 6 e 7.

---

## 2.6 LAB — Handshake capturado e explicado

**Duração:** 105 min
**Objetivo:** produzir a análise de handshake TCP mais completa que você já fez, campo por campo.

### Passo 1 — Servidor no alvo

```bash
mkdir -p ~/redes-lab/lab2 && cd ~/redes-lab/lab2

# Se estiver usando namespaces ou VMs, rode isto no "alvo"
python3 - <<'EOF' &
import http.server, socketserver
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", "2")
        self.end_headers()
        self.wfile.write(b"OK")
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", 8080), H) as s:
    s.serve_forever()
EOF
```

### Passo 2 — Captura no observador

```bash
sudo tcpdump -i eth0 -nn -S -XX -c 20 'tcp port 8080' -w lab2.pcap
```

Gere tráfego com `curl http://10.10.10.10:8080/` do cliente.

### Passo 3 — Leia o handshake

```bash
tshark -r lab2.pcap -Y 'tcp.flags.syn==1 or (tcp.flags.ack==1 and tcp.len==0)' \
       -T fields -e frame.number -e ip.src -e tcp.srcport -e tcp.flags -e tcp.seq -e tcp.ack
```

Ou com tcpdump:

```bash
tcpdump -r lab2.pcap -nn -S
```

**Produza `handshake.md` com, para cada um dos três pacotes do handshake:**

| Campo | Valor | Significado |
|---|---|---|
| IP origem:porta | | |
| IP destino:porta | | |
| Flags | | |
| seq absoluto | | |
| ack absoluto | | |
| window | | |
| MSS anunciado | | |
| Window scale | | |
| SACK permitido? | | |
| Timestamps | | |

### Passo 4 — Responda, por escrito

1. Qual o **MSS** anunciado por cada lado? Por que ele é 1460 e não 1500?
2. Qual a **janela** inicial de cada lado? O que ela promete?
3. Por que o `ack` do SYN-ACK é o `seq` do SYN **+ 1**?
4. Se você remover a opção `SACK` do lado do servidor (via `sysctl`), o que muda na conexão?
5. Qual seria a porta efêmera do cliente? Ela está na faixa do seu `/proc/sys/net/ipv4/ip_local_port_range`?

### Passo 5 — MTU: o teste que separa diagnóstico bom de ruim

```bash
# Do cliente, para o alvo — descobrir a MTU do caminho
ping -M do -s 1472 10.10.10.10     # deve passar
ping -M do -s 1473 10.10.10.10     # deve falhar com "Message too long"

# Captura enquanto testa
sudo tcpdump -i eth0 -nn -v 'icmp'
```

⚠ **`-M do` significa "don't fragment".** Se o pacote de 1473 bytes + headers excede a MTU,
o kernel recusa antes de enviar, em vez de fragmentar. É assim que você descobre a MTU real do
caminho.

Responda: **qual a MTU exata da sua rede de laboratório?** Prove com a captura.

### Passo 6 — ARP em ação

```bash
# Limpe o cache ARP e observe
sudo ip neigh flush dev eth0
sudo tcpdump -i eth0 -nn -e -c 4 'arp' &
sleep 1
ping -c 1 10.10.10.10
```

Documente em `arp.md`:

- O ARP request foi broadcast? Qual MAC destino?
- A resposta foi unicast ou broadcast?
- Quanto tempo o cache ARP durou? (`cat /proc/sys/net/ipv4/neigh/eth0/base_reachable_time_ms`)
- Se você falsificar uma resposta ARP (fazendo com que um IP aponte para o seu MAC), o kernel
  aceita? **Teste apenas no seu laboratório, e reverta depois.**

⚠ **Este último item é uma demonstração, não uma ferramenta.** O valor está em você **ver** que
o kernel acredita numa resposta não solicitada — é a prova de que você precisava para entender
por que VLAN e segmentação existem. Faça no laboratório, documente, e pare.

### Critérios de aceitação

- `handshake.md` tem os três pacotes com todos os campos preenchidos.
- Você explicou o `+1` do número de sequência.
- Você mediu a MTU com dois `ping -M do` e provou com captura.
- `arp.md` documenta o ciclo ARP completo com a captura anexada.
- Você explicou, com suas palavras, por que ARP sem autenticação é um problema de projeto e não
  um bug.
- Você não executou nada fora da rede `10.10.10.0/24`.

---

## Avaliação

1. Desenhe o quadro Ethernet com os campos e seus tamanhos. Por que o FCS não aparece no tcpdump?
2. O que é a MTU e por que 1472 é o tamanho máximo de payload do `ping` em Ethernet padrão?
3. Descreva o que um switch faz quando recebe um quadro para um MAC que ele não conhece.
4. O que é domínio de broadcast? Dê duas razões pelas quais ele importa — uma de desempenho e
   uma de segurança.
5. Explique ARP em quatro passos. Que endereço MAC aparece no request e por quê?
6. Por que "a LAN é um domínio de confiança" é uma afirmação perigosa? Cite três consequências.
7. O que é DAI e o que ela valida exatamente?
8. Descreva o handshake TCP em três pacotes, incluindo o que cada número de sequência significa.
9. Por que o SYN consome um número de sequência?
10. Uma captura mostra `ack 1`. Como você sabe se esse valor é absoluto ou relativo?
11. Por que VLAN é uma fronteira de segurança e não apenas organização? Cite dois cenários em
    que ela pode ser furada.
12. Você vê `ff:ff:ff:ff:ff:ff` como MAC destino. Quais são as duas possibilidades, e como
    você distingue na captura?

---

**Próximo:** [Módulo 3 — IP, roteamento e ICMP](modulo-03.md)
