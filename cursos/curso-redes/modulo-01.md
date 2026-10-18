# Módulo 1 — Fundamentos e o Modelo de Camadas

**Carga:** 3 horas (1h30 teoria · 1h30 lab)
**Pré-requisitos:** Linux básico, conforto com hexadecimal

---

## Objetivos

1. Explicar o que cada camada de rede existe para resolver — não o que ela é, mas o problema que ela ataca.
2. Descrever o caminho completo de um dado, do `connect()` da aplicação até o fio.
3. Ler e escrever endereços IPv4 em notação decimal, binária e CIDR.
4. Entender encapsulamento: por que um pacote contém outro pacote dentro.
5. Usar as ferramentas de inspeção de interface para responder "o que está acontecendo aqui?".

---

## ⚠ Antes de começar

Este módulo é puramente local. Tudo o que você vai inspecionar são as interfaces da sua própria
máquina. Nenhuma captura de tráfego de terceiro. A regra do curso: **só captura em `10.10.10.0/24`,
criada por você.**

---

## 1.1 O problema que a rede resolve

Duas aplicações em máquinas diferentes precisam conversar. Parece simples, mas exige resolver
cinco problemas distintos, e **cada um deles é uma camada**:

| Problema | Pergunta | Camada que resolve |
|---|---|---|
| Como representar o dado? | Que formato, que encoding? | Aplicação |
| Como levar dado de forma confiável? | Perdi algo? Chegou em ordem? | Transporte (TCP) |
| Como chegar em outra rede? | Qual o caminho entre redes? | Rede (IP) |
| Como chegar em outra máquina **na mesma rede**? | Qual a placa física? | Enlace (Ethernet) |
| Como transformar dado em sinal? | Que tensão, que luz? | Física |

**A sacada central:** essas camadas não são burocracia. Elas existem porque cada problema tem
soluções diferentes, e misturá-los num sistema só produziria um monstro impossível de manter.
Quando você troca Ethernet por Wi-Fi, a camada de rede acima não muda. Quando troca IPv4 por
IPv6, o TCP em cima não precisa saber — quase.

### O modelo OSI e o modelo real

Você já viu OSI com sete camadas. É um modelo útil para **pensar**, e um modelo ruim para
**programar**. A internet roda no modelo TCP/IP, com quatro:

| OSI (7 camadas) | TCP/IP (4 camadas) | Exemplo real |
|---|---|---|
| Aplicação + Apresentação + Sessão | **Aplicação** | HTTP, DNS, TLS, SSH |
| Transporte | **Transporte** | TCP, UDP, QUIC |
| Rede | **Rede** | IPv4, IPv6, ICMP |
| Enlace + Física | **Enlace** | Ethernet, Wi-Fi, ARP |

**Por que isso importa na prática:** quando alguém fala "problema de camada 7", está dizendo
"o pacote chegou, o TCP funcionou, e a aplicação respondeu errado". Quando fala "camada 3", o
pacote não chegou ao destino ou não voltou. Essa linguagem é usada em todo lugar — em war rooms,
em tickets, em post-mortem — e você precisa dela para se comunicar.

**Distinguir "chegou mas respondeu errado" de "não chegou" é o primeiro diagnóstico que você
faz**, e é a razão prática pela qual as camadas existem no seu vocabulário.

---

## 1.2 Endereçamento: a parte que trava todo mundo

Endereços IP aparecem em três notações. Você precisa das três.

### Decimal pontuado

```
192.168.1.10
```

Quatro números de 0 a 255, separados por ponto. **Cada número é um byte.** Um endereço IPv4
tem 32 bits = 4 bytes.

### Binário — é aqui que você enxerga a estrutura

```
192  .  168  .   1   .  10
11000000.10101000.00000001.00001010
```

Traduzindo um deles: `192 = 128 + 64 = 11000000`. `168 = 128 + 32 + 8 = 10101000`.

⚠ **Se você não consegue fazer essa conversão de cabeça, pratique agora.** Todo o resto do curso
depende disso: máscaras, CIDR, roteamento, `nftables`, e leitura de header em hexadecimal só
fazem sentido se binário for natural para você.

### CIDR — a notação que você vai usar todo dia

```
192.168.1.10/24
```

O `/24` diz: **os primeiros 24 bits são a parte de rede; os 8 restantes são a parte de host.**

```
11000000.10101000.00000001. | 00001010
└──────── rede (24 bits) ──┘  └ host ┘
```

### Tabela de máscaras que você precisa saber de cor

| CIDR | Máscara | Nº de endereços | Hosts utilizáveis | É a rede de... |
|---|---|---|---|---|
| `/8` | `255.0.0.0` | 16.777.216 | 16.777.214 | Classe A, faixas enormes |
| `/16` | `255.255.0.0` | 65.536 | 65.534 | Classe B, campus |
| `/24` | `255.255.255.0` | 256 | 254 | Classe C, escritório — **o mais comum** |
| `/25` | `255.255.255.128` | 128 | 126 | Metade de um /24 |
| `/26` | `255.255.255.192` | 64 | 62 | |
| `/27` | `255.255.255.224` | 32 | 30 | |
| `/28` | `255.255.255.240` | 16 | 14 | |
| `/29` | `255.255.255.248` | 8 | 6 | |
| `/30` | `255.255.255.252` | 4 | 2 | Link ponto a ponto entre roteadores |
| `/31` | `255.255.255.254` | 2 | 2 | RFC 3021, link ponto a ponto |
| `/32` | `255.255.255.255` | 1 | 1 | Um host só |

**Por que 2 a menos?** Em cada rede, o **primeiro** endereço é a própria rede e o **último** é o
broadcast. Eles não são atribuíveis.

```
Rede 10.10.10.0/24
  10.10.10.0    ← endereço de rede (não atribuível)
  10.10.10.1    ← primeiro host utilizável
  10.10.10.254  ← último host utilizável
  10.10.10.255  ← broadcast (não atribuível)
```

### Faixas privadas — você vai ver essas em todo lugar

| Faixa | CIDR | Onde aparece |
|---|---|---|
| `10.0.0.0` – `10.255.255.255` | `10.0.0.0/8` | Redes corporativas, cloud |
| `172.16.0.0` – `172.31.255.255` | `172.16.0.0/12` | Docker, VMs, corporativo |
| `192.168.0.0` – `192.168.255.255` | `192.168.0.0/16` | Casa, escritório pequeno |
| `169.254.0.0` – `169.254.169.254` | `169.254.0.0/16` | Link-local — **e metadados de cloud** |
| `127.0.0.0` – `127.255.255.255` | `127.0.0.0/8` | Loopback |

⚠ **`169.254.169.254` merece atenção especial.** É o endereço de metadados em AWS, GCP e Azure.
Um atacante que consegue forçar uma requisição do servidor para esse IP pode obter credenciais
de instância. Você vai ver esse IP em relatórios de incidente, e saber o que ele é evita um
diagnóstico errado.

---

## 1.3 Encapsulamento: bonecas russas

Dado que sai de uma aplicação atravessa camadas, e **cada camada embrulha o dado da anterior**:

```
Mensagem HTTP                          ← o que a aplicação quer dizer
    │
    ▼ embrulhado com header TCP
[TCP | HTTP]                           ← agora é um segmento
    │
    ▼ embrulhado com header IP
[IP | TCP | HTTP]                      ← agora é um pacote
    │
    ▼ embrulhado com header Ethernet, e com trailer
[Ethernet | IP | TCP | HTTP | FCS]     ← agora é um quadro
    │
    ▼ convertido em sinal
1010101110010... no cabo               ← agora é física
```

Na recepção, o processo é o inverso: cada camada **desembrulha** e entrega o conteúdo à camada
acima. Ethernet tira o endereço MAC e entrega o pacote IP; IP tira o endereço e entrega o
segmento TCP; TCP cuida de ordem e confiabilidade e entrega os bytes à aplicação.

### Por que isso é a chave de tudo

**Cada camada só precisa entender a sua parte e confiar no resto.** O roteador no meio do
caminho lê o header IP — e não precisa nem saber que existe um HTTP ali dentro. Essa é a
propriedade que faz a internet funcionar em escala.

E é também a razão pela qual um ataque de rede consegue existir: **se você consegue modificar
uma camada, as camadas acima acreditam no que recebem.** ARP (Módulo 2) e DNS (Módulo 5) são
os dois casos clássicos.

### Onde isso aparece na captura

Quando você captura com `tcpdump -X`, o hexdump mostra exatamente isso: os primeiros 14 bytes
são Ethernet, os próximos 20 são IP, os próximos 20 são TCP, e depois vem o dado.

```
14 bytes      20 bytes      20 bytes      resto
┌──────────┬────────────┬────────────┬──────────────┐
│ Ethernet │    IPv4    │    TCP     │  payload     │
└──────────┴────────────┴────────────┴──────────────┘
```

**Saber que esses offsets são fixos (para o caso simples) é o que te permite ler qualquer
captura.** O Módulo 2 faz isso linha por linha.

---

## 1.4 Do `connect()` ao fio

O caminho completo, que é a espinha dorsal do curso:

```
1. Aplicação chama connect("10.10.10.10", 80)
       ↓
2. Kernel consulta a tabela de rotas: para 10.10.10.10, qual interface?
       ↓
3. Kernel escolhe um IP de origem, monta o segmento TCP (porta src/dst, flags SYN)
       ↓
4. Kernel embrulha num pacote IP (IP src/dst, TTL, protocolo=6)
       ↓
5. Kernel precisa do MAC do destino (ou do gateway):
   → consulta a tabela ARP; se não tem, dispara um ARP request (Módulo 2)
       ↓
6. Kernel embrulha num quadro Ethernet (MAC src/dst, EtherType=0x0800)
       ↓
7. A placa converte em sinal e transmite
       ↓
8. Chega no switch, que encaminha pela porta certa (ou faz flood se não sabe)
       ↓
9. Se o destino está em outra rede, o quadro vai para o gateway, que
   desembrulha até o IP, decide o próximo salto, e re-encapsula (Módulo 3)
```

**Cada seta dessa é um módulo do curso.** Guarde esse diagrama: toda vez que um lab der errado,
volte a ele e pergunte em qual dos oito passos a coisa quebrou.

---

## 1.5 Ferramentas de inspeção de interface

Antes de capturar, você precisa saber como está a sua máquina.

```bash
ip addr show                    # interfaces e endereços
ip -br addr                     # versão resumida (melhor para o dia a dia)
ip route show                   # tabela de rotas
ip -6 route show                # rotas IPv6
ip link show                    # estado do link (UP/DOWN, MTU)
ip neigh show                   # tabela ARP/NDP (vizinhos conhecidos)
```

Exemplo de saída de `ip -br addr`:

```
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0             UP             10.10.10.30/24 fe80::a00:27ff:fe4e:66a1/64
docker0          DOWN           172.17.0.1/16
```

Leia cada linha como: **interface, estado, endereço IPv4, endereço IPv6.**

### As três perguntas que essas ferramentas respondem

| Pergunta | Comando | O que você olha |
|---|---|---|
| Qual meu IP nesta rede? | `ip -br addr` | Endereço com prefixo (`/24`) |
| Para onde vou se o destino for externo? | `ip route show` | Linha `default via` |
| Quem eu já conheço nesta rede? | `ip neigh show` | Tabela ARP populada |

```bash
ip route show
# default via 10.10.10.1 dev eth0 proto static
# 10.10.10.0/24 dev eth0 proto kernel scope link src 10.10.10.30
```

A primeira linha diz: **tudo que não é local vai para `10.10.10.1` pela `eth0`.**
A segunda diz: **a rede `10.10.10.0/24` é diretamente alcançável pela `eth0`.**

Esse é o roteamento em duas frases. O Módulo 3 aprofunda.

---

## 1.6 LAB — Do socket à captura

**Duração:** 90 min
**Objetivo:** observar, com as próprias mãos, um arquivo atravessar todas as camadas.

### Parte A — Mapa da própria máquina (20 min)

```bash
mkdir -p ~/redes-lab/lab1 && cd ~/redes-lab/lab1

# Suas interfaces
ip -br addr > interfaces.txt
ip route show > rotas.txt
ip neigh show > vizinhos.txt

cat interfaces.txt rotas.txt
```

Responda por escrito em `mapa.md`:

1. Quantas interfaces existem além do loopback? Qual está UP?
2. Qual o seu endereço IPv4 e o prefixo?
3. Qual o endereço de rede da sua faixa? Qual o broadcast?
4. Qual o gateway padrão? Ele está na mesma sub-rede que você?
5. Quantos vizinhos já estão na tabela ARP? Por que eles?

### Parte B — Conversão de endereço (20 min)

Sem calculadora, converta:

| Decimal | Binário |
|---|---|
| `10` | ? |
| `172` | ? |
| `192` | ? |
| `255` | ? |
| `224` | ? |

Depois, calcule a rede, o broadcast e o número de hosts utilizáveis:

| Endereço | Rede | Broadcast | Hosts |
|---|---|---|---|
| `10.10.10.77/24` | ? | ? | ? |
| `10.10.10.200/26` | ? | ? | ? |
| `192.168.5.130/25` | ? | ? | ? |
| `172.16.4.9/30` | ? | ? | ? |

Confirme com Python (o `ipaddress` é da biblioteca padrão):

```bash
python3 - <<'EOF'
import ipaddress
for cidr in ["10.10.10.77/24", "10.10.10.200/26", "192.168.5.130/25", "172.16.4.9/30"]:
    n = ipaddress.ip_network(cidr, strict=False)
    print(f"{cidr:22} rede={n.network_address}  broadcast={n.broadcast_address}  "
          f"hosts={n.num_addresses - 2}")
EOF
```

⚠ **Anote onde você errou.** O erro de subnetting é o que mais aparece em lab de firewall no
Módulo 10. Descobrir agora, sozinho, é muito melhor.

### Parte C — Captura de um arquivo atravessando as camadas (50 min)

Aqui está o coração do lab. Vamos ler hexadecimal de verdade.

**Terminal 1 — capture:**

```bash
sudo tcpdump -i lo -X -c 5 'tcp port 9000'
```

**Terminal 2 — gere tráfego:**

```bash
# Servidor simples que devolve o que recebe
python3 - <<'EOF' &
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("127.0.0.1", 9000))
s.listen(1)
c, a = s.accept()
c.sendall(b"OI-LAB1-REDES")
c.close()
s.close()
EOF
sleep 1

# Cliente
python3 -c "
import socket
c = socket.socket()
c.connect(('127.0.0.1', 9000))
print('recebido:', c.recv(64).decode())
"
```

**Agora a parte que importa.** Você vai pegar a saída do `tcpdump -X` e **anotar byte a byte**.

Use `-XX` para incluir o header Ethernet também:

```bash
sudo tcpdump -i lo -XX -c 3 'tcp port 9000'
```

Pegue o pacote que contém o payload `OI-LAB1-REDES` (procure o hex `4f 49 2d 4c 41 42 31`) e
produza, em `leitura-hex.md`:

```
Offset  Bytes                    Campo
------  -----------------------  ----------------------------------
0x0000  ...                      [Ethernet] MAC destino
0x0006  ...                      [Ethernet] MAC origem
0x000c  ...                      [Ethernet] EtherType — é 0x0800 (IPv4)?
0x000e  ...                      [IP] versão e IHL (primeiro nibble é 4?)
0x000f  ...                      [IP] TOS
0x0010  ...                      [IP] tamanho total
...                              ...
```

**Em loopback, os offsets podem variar** — o Linux usa um tipo de link diferente (`EN10MB` é
Ethernet, loopback é `NULL`/`LOOP`). Compare com uma captura real de Ethernet na Parte D e
**explique a diferença**. Isso não é pegadinha; é exatamente o tipo de coisa que confunde
analista iniciante olhando uma captura de túnel.

### Parte D — Captura em rede de verdade (opcional, se tiver laboratório montado)

Se você já montou o laboratório do README:

```bash
# No observador
sudo tcpdump -i eth0 -XX -c 3 'host 10.10.10.20'
# No cliente
ping -c 2 10.10.10.30
```

Refaça a leitura de hexdump. Agora você deve ver Ethernet de verdade: `0x0800` para IPv4,
`0x0806` para ARP. **Anote os MACs envolvidos** — eles voltam no Módulo 2.

### Critérios de aceitação

- `mapa.md` responde as cinco perguntas com os comandos usados.
- A tabela de conversão está preenchida à mão, e você anotou onde errou.
- Os quatro cálculos de subnet confere com o Python.
- `leitura-hex.md` tem **no mínimo 10 campos** identificados no hexdump, com offset e valor.
- Você explicou por que o loopback difere de Ethernet no header de enlace.
- Você identificou o payload `OI-LAB1-REDES` no hexdump, byte a byte.

---

## Avaliação

1. Cite os cinco problemas que a comunicação em rede precisa resolver e a camada que ataca cada um.
2. Por que "problema de camada 7" e "problema de camada 3" levam a diagnósticos completamente
   diferentes? Dê um exemplo prático de cada.
3. Converta `10.10.10.200/26`: rede, broadcast, primeiro e último host.
4. Por que cada rede perde dois endereços? Em que caso isso não vale?
5. Explique encapsulamento em uma frase. Por que um roteador não precisa entender HTTP?
6. Qual o offset, em bytes, do header IP dentro de um quadro Ethernet? E do header TCP dentro
   de um pacote IPv4 sem opções? Por que esses números são fixos?
7. O que é `169.254.169.254` e por que ele aparece em relatórios de incidente de cloud?
8. Descreva os oito passos do `connect()` ao fio. Em qual deles o ARP entra e por quê?
9. O que a linha `default via 10.10.10.1 dev eth0` significa? O que acontece se ela não existir?
10. Por que o encapsulamento é também a razão pela qual exfiltração por rede é possível?

---

**Próximo:** [Módulo 2 — Ethernet, ARP e a rede local](modulo-02.md)
