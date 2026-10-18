# Módulo 4 — TCP a Fundo

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Ler um header TCP completo, campo por campo, em hexadecimal.
2. Explicar o controle de fluxo por janela e o que acontece quando ela fecha.
3. Entender retransmissão: timeout, ACK duplicado, fast retransmit.
4. Reconhecer congestion control na captura e distinguir de perda por rede ruim.
5. Navegar a máquina de estados do TCP e usar isso em diagnóstico.
6. Diagnosticar black hole de MTU com captura.

---

## ⚠ Ética

Este módulo gera tráfego sintético entre máquinas suas. O laboratório é `10.10.10.0/24`, isolado.

⚠ **Uma nota sobre ferramenta de teste de carga:** `hping3`, `tcpreplay` e similares conseguem
gerar volume que derruba serviço. Isso é negação de serviço, e é crime (Código Penal, art. 266)
fora de um engajamento autorizado. Usaremos apenas tráfego de laboratório controlado.

---

## 4.1 O header TCP

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
┌───────────────────────────────┬───────────────────────────────┐
│       Porta de origem (16)    │    Porta de destino (16)      │
├───────────────────────────────┴───────────────────────────────┤
│                 Número de sequência (32)                      │
├───────────────────────────────────────────────────────────────┤
│                 Número de confirmação (32)                    │
├───────┬───────┬───────────────────────────────────────────────┤
│ Data  │Reserv │   Flags (9 bits)   │      Janela (16)         │
│Offset │  (3)  │                    │                          │
├───────┴───────┴────────────────────┴──────────────────────────┤
│            Checksum (16)          │   Urgent Pointer (16)     │
├───────────────────────────────────────────────────────────────┤
│                 Opções (variável, 0–40 bytes)                 │
└───────────────────────────────────────────────────────────────┘
```

| Campo | Bits | O que é |
|---|---|---|
| **Porta origem / destino** | 16 cada | Identificam o serviço e a conexão |
| **Número de sequência** | 32 | Posição do primeiro byte deste segmento no fluxo |
| **Número de confirmação** | 32 | Próximo byte que espero receber |
| **Data Offset** | 4 | Tamanho do header em palavras de 4 bytes. `5` = 20 bytes |
| **Flags** | 9 | SYN, ACK, FIN, RST, PSH, URG, ECE, CWR, NS |
| **Janela** | 16 | Quantos bytes aceito **sem ACK** a partir do próximo esperado |
| **Checksum** | 16 | Verifica header + payload + pseudo-header |
| **Urgent Pointer** | 16 | Raramente usado |
| **Opções** | var | MSS, SACK, timestamps, window scale |

### Flags: semântica completa

| Flag | Nome | Significado |
|---|---|---|
| `SYN` | Synchronize | Abre conexão, sincroniza números de sequência |
| `ACK` | Acknowledge | `ack` é válido |
| `FIN` | Finish | Não vou mandar mais nada (fechamento educado) |
| `RST` | Reset | Aborta imediatamente. "Acabou, não estou ouvindo" |
| `PSH` | Push | Entrega o dado à aplicação imediatamente, sem bufferizar |
| `URG` | Urgent | Dado urgente no ponteiro — praticamente obsoleto |
| `ECE` | ECN Echo | Congestionamento explícito |
| `CWR` | Congestion Window Reduced | Reduzi a janela por ECN |
| `NS` | Nonce Sum | Experimental, raramente visto |

**Combinações que você vai ver na captura:**

| Notação tcpdump | Significado |
|---|---|
| `[S]` | SYN — abrindo |
| `[S.]` | SYN + ACK — aceitando |
| `[.]` | ACK puro — confirmação |
| `[P.]` | PSH + ACK — dado |
| `[F.]` | FIN + ACK — fechando |
| `[R]` | RST — abortou |
| `[R.]` | RST + ACK |
| `[FP.]` | FIN + PSH + ACK |

⚠ **`[R]` (RST) é o flag que você investiga primeiro em incidente.** Ele significa "conexão
encerrada abruptamente", e as causas são bem distintas: porta fechada (o kernel responde RST),
firewall rejeitando, aplicação derrubando a conexão, ou um dispositivo intermediário. **A
direção e o contexto do RST dizem qual.**

### RST: os três cenários clássicos

```bash
sudo tcpdump -nn 'tcp[tcpflags] & tcp-rst != 0'
```

**Cenário 1 — porta fechada:**
```
10.10.10.20.53142 > 10.10.10.10.9999: Flags [S], seq ...
10.10.10.10.9999 > 10.10.10.20.53142: Flags [R.], seq 0, ack 1, win 0, length 0
```
O destino responde RST imediatamente. **Nada está escutando nessa porta.** Cheguei no host,
a porta está fechada.

**Cenário 2 — firewall rejeita:**
```
10.10.10.20.53142 > 10.10.10.10.22: Flags [S], seq ...
10.10.10.30 > 10.10.10.20.53142: Flags [R], seq ..., length 0
```
O RST vem de um **IP que não é o destino** (`.30`), ou traz TTL diferente do normal. Firewall
com `reject` em vez de `drop`. **Isso revela a existência do firewall.**

**Cenário 3 — conexão derrubada no meio:**
```
10.10.10.20.53142 > 10.10.10.10.80: Flags [P.], seq 1001:1200, ack 5001
10.10.10.10.80 > 10.10.10.20.53142: Flags [R], seq 5001, length 0
```
Depois de dados fluindo. A aplicação no servidor morreu, ou o serviço reiniciou. **Conexões
ativas caíram.**

N O T A Um firewall configurado com `drop` não gera RST nenhum — o SYN simplesmente desaparece
e o cliente fica tentando até dar timeout. `drop` esconde a existência do firewall; `reject` a
anuncia. Saber qual está em uso é informação de reconhecimento.

---

## 4.2 Controle de fluxo: a janela

O TCP não manda tudo de uma vez. O receptor anuncia **quanto aceita** — a **janela** — e o
emissor respeita.

```
Emissor                                    Receptor
   │                                            │
   │ ──── 1000 bytes (seq 1–1000) ───────────▶  │
   │                                            │
   │ ◀──── ACK 1001, win 65535 ──────────────   │
   │                                            │
   │  "recebi até 1000, espero 1001,            │
   │   e aceito mais 65535 bytes sem ACK"       │
```

### O que a janela realmente significa

`win N` = "a partir do próximo byte que espero, aceito **N bytes** antes de precisar de nova
confirmação". É uma **promessa de capacidade de recepção**.

**Janela zero é o diagnóstico mais direto que existe:**

```
10.10.10.20.53142 > 10.10.10.10.80: Flags [.], ack 5001, win 0, length 0
```

**O receptor está dizendo: "estou cheio, não me manda nada".** O emissor para e começa a sondar
periodicamente (zero window probe). Isso significa que **a aplicação do receptor não está
consumindo os dados** — está travada, ou o disco está lento, ou o buffer não é lido.

⚠ **"Conexão travou" com janela zero não é problema de rede.** É problema de aplicação no lado
receptor. Você acabou de poupar horas de investigação de rede olhando um campo.

### Window scale: por que a janela real é maior que o campo

O campo tem 16 bits → máximo 65535 bytes. Insuficiente para links modernos. A solução é o
**window scale** (negociado no handshake, na opção `wscale`):

```
Janela real = win × 2^wscale
```

Com `wscale=7`: `65535 × 128 = ~8 MB`. É por isso que você vê `win 501` e a janela real ser
`501 × 128 = 64128`. **O multiplicador vem do handshake — sempre confira a opção `wscale` antes
de interpretar `win`.**

```bash
# Ver wscale negociado
tshark -r cap.pcap -Y 'tcp.options.wscale' -T fields -e ip.src -e tcp.options.wscale.shift
```

N N **`tcpdump` mostra o `win` já multiplicado?** Não. O tcpdump mostra o valor **bruto** do
campo. O Wireshark, quando faz reassembly de fluxo, mostra o valor efetivo e marca se aplicou
o scale. **Esta é uma divergência clássica entre as duas ferramentas** e causa confusão em
análise. Sempre saiba qual você está olhando.

---

## 4.3 Retransmissão: quando o pacote não chega

TCP garante entrega **reagindo à perda**. Há dois mecanismos.

### Retransmissão por timeout (RTO)

Se o emissor não recebe ACK dentro do tempo estimado, retransmite.

```
10.10.10.20.53142 > 10.10.10.10.80: Flags [P.], seq 1001:2000, length 999
10.10.10.20.53142 > 10.10.10.10.80: Flags [P.], seq 1001:2000, length 999   ← RTO
10.10.10.20.53142 > 10.10.10.10.80: Flags [P.], seq 1001:2000, length 999   ← RTO de novo
```

**Mesmo `seq`, mesmo `length`, tempos crescentes.** O intervalo dobra a cada tentativa
(exponential backoff). É o sintoma de rede com perda alta, ou de rota assimétrica.

### Fast retransmit e ACK duplicado

Mais eficiente: se o emissor recebe três ACKs com o mesmo número (o receptor pedindo o que
falta), ele retransmite sem esperar timeout.

```
10.10.10.10.80 > 10.10.10.20.53142: Flags [.], seq 5001:6000, ack 1001
10.10.10.10.80 > 10.10.10.20.53142: Flags [.], seq 6001:7000, ack 1001   ┐
10.10.10.10.80 > 10.10.10.20.53142: Flags [.], seq 7001:8000, ack 1001   │ duplicados
10.10.10.10.80 > 10.10.10.20.53142: Flags [.], seq 8001:9000, ack 1001   ┘
10.10.10.20.53142 > 10.10.10.10.80: Flags [P.], seq 1001:2000, length 999   ← retransmite
```

**Isso conta uma história clara:** o segmento com `seq 1001:2000` se perdeu. Os segmentos
seguintes chegaram (5001, 6001, 7001, 8001) mas **fora de ordem** — o receptor não pode entregá-los
à aplicação, porque falta o 1001. Então ele reenvia o mesmo `ack 1001` várias vezes.

⚠ **ACK duplicado é informação valiosa:** o receptor recebeu o 5001–9000 mas está segurando
tudo no buffer. Isso é **head-of-line blocking** — um pacote perdido bloqueia tudo que vem
depois. É a razão pela qual o TCP se comporta mal em rede com perda, e a razão pela qual QUIC
existe.

### SACK: o receptor diz exatamente o que chegou

A opção **SACK** (Selective ACK) permite ao receptor informar os blocos recebidos:

```
TCP option SACK: left edge=5001, right edge=9001
```

Agora o emissor sabe: **"chegou 5001–9000, e o que falta é 1001–5000"**. Ele retransmite só o
que falta, em vez de reenviar tudo depois do buraco.

```bash
tshark -r cap.pcap -Y 'tcp.options.sack' -T fields -e frame.number -e tcp.options.sack_le -e tcp.options.sack_re
```

### Tabela de diagnóstico de retransmissão

| Sintoma na captura | Significa | Ação |
|---|---|---|
| Mesmo seq várias vezes, intervalo crescente | RTO — perda com backoff | Verificar perda no caminho |
| ACKs duplicados do mesmo ack | Segmento perdido, dados fora de ordem | Normal em rede com perda; verificar taxa |
| Retransmissão após 3 ACK dup | Fast retransmit | Comportamento correto do TCP |
| Muitos ACK duplicados sem retransmissão | Receptor com problema, ou rota assimétrica | Investigar app do receptor |
| `win 0` | Receptor não consome | **Não é rede.** É aplicação |
| RST do destino | Porta fechada | Nada escutando |
| RST de IP intermediário | Firewall rejeitando | Política de firewall |

---

## 4.4 Congestion control: distinguir de perda

O TCP também se adapta à capacidade da rede. Há várias implementações — CUBIC (padrão no Linux
moderno), BBR, Reno — e a diferença importa em análise.

### O que você observa

**Slow start:** a janela cresce exponencialmente no início. Numa captura, você vê o volume de
dado por ACK aumentando rapidamente nos primeiros milissegundos.

**Congestion avoidance:** depois do limiar, cresce linearmente.

**Queda por perda:** janela despenca. No CUBIC, a queda é menos agressiva que no Reno clássico.

⚠ **Como distinguir congestionamento de perda aleatória:**

| Observação | Interpretação |
|---|---|
| Perda + queda de janela, tráfego retomando suave | Congestionamento na rede |
| Perda em um único fluxo, outros fluxos OK | Problema específico daquele caminho |
| Perda em todos os fluxos do mesmo host | Problema de rede local ou interface saturada |
| Latência alta **sem** perda | Buffer bloating — buffer grande escondendo congestionamento |
| Perda esporádica de 1–2% com latência normal | Pode ser normal em rede longa |

```bash
# Estatísticas de retransmissão e congestão
ss -ti                       # TCP detalhado por conexão
ss -s                        # resumo

# Veja o campo cwnd e rtt numa conexão ativa
ss -ti dst 10.10.10.10 | grep -E 'cwnd|rtt|retrans'
```

`ss -ti` é a ferramenta que mostra o estado interno do TCP **sem captura**. Numa investigação,
use as duas coisas: `ss` para ver a intenção, captura para ver o que aconteceu no fio.

---

## 4.5 A máquina de estados — e por que ela é diagnóstico

Uma conexão TCP não é "aberta ou fechada". Ela atravessa estados, e o estado **é** a informação.

```
                              ┌─────────┐
                              │ CLOSED  │
                              └────┬────┘
                    app abre  ┌────┴────┐ app escuta
                              ▼         ▼
                         ┌────────┐  ┌────────┐
                         │  SYN-  │  │ LISTEN │
                         │  SENT  │  └───┬────┘
                         └───┬────┘      │ recebe SYN
              recebe SYN-ACK │           ▼
                             │      ┌──────────┐
                             │      │ SYN-RCVD │
                             │      └────┬─────┘
                             ▼           │ recebe ACK
                        ┌─────────────────▼──┐
                        │   ESTABLISHED      │ ◀── os dados fluem aqui
                        └──────────┬─────────┘
              app fecha  ┌────────┼────────┐ peer fecha
                         ▼                 ▼
                  ┌───────────┐     ┌───────────┐
                  │ FIN-WAIT-1│     │ CLOSE-WAIT│
                  └─────┬─────┘     └─────┬─────┘
                        ▼                 │ app fecha
                  ┌───────────┐           ▼
                  │ FIN-WAIT-2│     ┌───────────┐
                  └─────┬─────┘     │ LAST-ACK  │
                        │ FIN       └─────┬─────┘
                        ▼                 │
                  ┌───────────┐           │
                  │ TIME-WAIT │◀──────────┘
                  └─────┬─────┘
                        │ 2×MSL expira
                        ▼
                    ┌────────┐
                    │ CLOSED │
                    └────────┘
```

### O que cada estado revela

```bash
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn
```

| Estado | O que significa | O que investigar |
|---|---|---|
| `ESTAB` | Funcionando | Tráfego normal |
| `SYN-SENT` (muitas) | Tentando conectar, sem resposta | **Firewall com `drop`, host morto, ou varredura** |
| `SYN-RECV` (muitas) | Recebendo SYN, não completando | **Possível SYN flood** |
| `TIME-WAIT` (muitas) | Fechou recentemente | Normal em servidor web; milhares pode indicar esgotamento de porta |
| `CLOSE-WAIT` (muitas) | **O peer fechou e a aplicação não fechou** | **Bug de aplicação — o servidor não está chamando `close()`** |
| `FIN-WAIT-2` (preso) | Peer não mandou FIN | Peer travado |
| `LISTEN` | Aguardando conexão | Normal |

⚠ **`CLOSE-WAIT` acumulando é um dos diagnósticos mais úteis que existem:** o servidor recebeu
o FIN do cliente, o kernel mudou o estado, e a aplicação nunca chamou `close()`. **A conexão
fica pendurada consumindo recurso.** É bug de código, não de rede — e você descobre isso com
`ss`, não com captura.

```bash
# Veja qual processo tem as conexões penduradas
sudo ss -tanp | grep CLOSE-WAIT | head
```

### TIME-WAIT e o problema de esgotamento de porta

Depois de fechar, quem fechou primeiro fica em `TIME-WAIT` por 2×MSL (60s no Linux). Motivo:
garantir que o ACK final chegou, e que pacotes atrasados não confundam uma conexão nova que use
a mesma quíntupla.

**Em servidor web com muitas conexões curtas, isso pode esgotar as portas efêmeras.** Sinal:

```bash
ss -tan state time-wait | wc -l        # se for ~28.000, é o teto
sysctl net.ipv4.ip_local_port_range
sysctl net.ipv4.tcp_tw_reuse
```

**`tcp_tw_reuse=1`** permite reaproveitar conexões em TIME-WAIT para conexões **de saída**
(com timestamps habilitados, o que torna seguro). **`tcp_tw_recycle` foi removido** — era
problemático com NAT, e você não deve usar nem mencionar como solução.

---

## 4.6 Black hole de MTU — o diagnóstico que separa profissional de amador

Este é o fenômeno clássico: **`ping` funciona, o site não abre, e não há erro nenhum.**

### O mecanismo

```
1. Cliente e servidor negociam MSS = 1460 (MTU 1500)
2. No caminho há um túnel com MTU 1400 (VPN, GRE, IPsec)
3. Pacote grande (1500) chega no túnel
4. Roteador precisa fragmentar, mas o pacote tem DF (don't fragment)
5. Roteador descarta e manda ICMP tipo 3 subtipo 4, com a MTU correta
6. SE ESSE ICMP FOR BLOQUEADO POR FIREWALL:
   → o cliente nunca descobre
   → retransmite o mesmo pacote grande
   → retransmite de novo
   → conexão trava
```

**Sintomas:**
- `ping` pequeno funciona (caberia).
- Handshake TCP completa (pacotes pequenos).
- POST/upload grande trava.
- Alguns sites abrem, outros não (depende do tamanho da resposta).
- SSH conecta mas trava ao rodar comando com saída grande.

### Diagnóstico

**Passo 1 — encontrar a MTU do caminho:**

```bash
# Sondagem binária
for s in 1472 1400 1300 1200; do
    if ping -M do -s $s -c 1 -W 2 10.10.10.10 >/dev/null 2>&1; then
        echo "$s: OK (MTU $((s+28)))"
    else
        echo "$s: falhou"
    fi
done
```

**Passo 2 — capturar e provar:**

```bash
sudo tcpdump -nn -v 'icmp[icmptype]==3 and icmp[icmpcode]==4'
```

Se você vê o ICMP tipo 3 subtipo 4, **o caminho está avisando a MTU correta**. Se você não vê,
e a conexão trava em pacote grande, você acabou de provar o black hole.

**Passo 3 — confirmar no TCP:**

```bash
sudo tcpdump -nn 'tcp port 8080 and greater 1400'
```

Você verá o mesmo pacote grande sendo retransmitido.

### Mitigações

| Mitigação | Onde se aplica |
|---|---|
| Permitir ICMP tipo 3 subtipo 4 no firewall | **A correção certa** — é diagnóstico necessário |
| MSS clamping no roteador | Reduz o MSS anunciado a um valor que cabe |
| Ajustar MTU da interface do túnel | Onde você controla a ponta |
| PMTUD no cliente | Já é o padrão; não ajuda se o ICMP está bloqueado |

N N **"Bloqueie todo ICMP" é uma recomendação ruins.** Ela quebra PMTUD, quebra diagnóstico, e
não impede ataque nenhum de verdade. A recomendação correta é bloquear ICMP **seletivamente**,
mantendo tipo 3 subtipo 4 e tipo 11 (usado por traceroute) liberados.

```bash
# nftables: permitir ICMP de diagnóstico, bloquear o resto
sudo nft add rule inet filter input icmp type { destination-unreachable, time-exceeded } accept
```

---

## 4.7 LAB — Encontrar e diagnosticar uma retransmissão

**Duração:** 150 min
**Objetivo:** provocar perda, retransmissão e janela zero — e diagnosticar cada uma pela captura.

### Parte A — Baseline: conexão saudável (20 min)

```bash
mkdir -p ~/redes-lab/lab4 && cd ~/redes-lab/lab4

# No alvo: servidor que envia 1 MB
python3 - <<'EOF' &
import http.server, socketserver, os
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        dados = b"X" * (1024 * 1024)
        self.send_response(200)
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", 8080), H) as s:
    s.serve_forever()
EOF
```

**No observador:**

```bash
sudo tcpdump -i eth0 -nn -S -w baseline.pcap 'tcp port 8080'
# Gere tráfego do cliente, espere terminar, Ctrl-C

tshark -r baseline.pcap -q -z io,stat,0.1
tshark -r baseline.pcap -Y 'tcp.analysis.retransmission' | wc -l    # deve ser 0 ou perto
```

Anote em `baseline.md`: duração, bytes transferidos, throughput, retransmissões.

### Parte B — Provocar perda (40 min)

Use o `tc` (traffic control) do Linux para simular rede ruim. **Só na sua interface de
laboratório.**

```bash
# 5% de perda na saída
sudo tc qdisc add dev eth0 root netem loss 5%

# Confirme
tc qdisc show dev eth0

# Gere tráfego novamente, capture
sudo tcpdump -i eth0 -nn -S -w com-perda.pcap 'tcp port 8080'
curl -o /dev/null -s http://10.10.10.10:8080/
```

Analise:

```bash
# Retransmissões
tshark -r com-perda.pcap -Y 'tcp.analysis.retransmission' | wc -l

# ACKs duplicados
tshark -r com-perda.pcap -Y 'tcp.analysis.duplicate_ack' | wc -l

# Fast retransmit especificamente
tshark -r com-perda.pcap -Y 'tcp.analysis.fast_retransmission' | wc -l

# Detecta o GNU/Linux respondendo com SACK
tshark -r com-perda.pcap -Y 'tcp.options.sack' | wc -l
```

**Responda em `perda.md`:**

1. Quantas retransmissões ocorreram? Que percentual do total de pacotes?
2. Houve fast retransmit (após ACK duplicado) ou só RTO? Como você distinguiu?
3. O SACK foi usado? O que isso permitiu em termos de eficiência?
4. Compare o throughput com o baseline. Qual a razão?

**Reverta o `tc` quando terminar:**

```bash
sudo tc qdisc del dev eth0 root
```

### Parte C — Janela zero (40 min)

Aqui você prova que `win 0` é problema de aplicação, não de rede.

```bash
# No alvo: servidor que envia muito e NÃO lê a resposta do cliente
python3 - <<'EOF' &
import socket, time
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("0.0.0.0", 8081)); s.listen(1)
c, a = s.accept()
# Envia rápido, sem esperar
for _ in range(2000):
    c.sendall(b"A" * 4096)
time.sleep(120)     # trava de propósito, não lê nada
c.close(); s.close()
EOF
```

**No cliente, com socket pequeno que não é lido:**

```bash
python3 - <<'EOF'
import socket, time
s = socket.socket()
s.connect(("10.10.10.10", 8081))
s.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4096)   # buffer minúsculo
time.sleep(20)                                            # não lê de propósito
s.close()
EOF
```

**Captura:**

```bash
sudo tcpdump -i eth0 -nn -S -w zerowin.pcap 'tcp port 8081'
```

**Confira:**

```bash
tshark -r zerowin.pcap -Y 'tcp.window_size == 0' -T fields -e frame.number -e ip.src -e tcp.window_size | head
```

**Responda em `janela.md`:**

1. Em que momento a janela foi para zero? Qual IP anunciou?
2. O cliente continuou mandando depois? Por que não?
3. Que pacotes de "zero window probe" aparecem? De quem?
4. **Por que isso não é problema de rede?** Explique em termos do que a aplicação está fazendo.

### Parte D — Black hole de MTU simulado (50 min)

```bash
# Reduz a MTU da interface para 1400 e BLOQUEIA o ICMP de correção
sudo ip link set eth0 mtu 1400

sudo nft add table inet mtu-lab
sudo nft add chain inet mtu-lab output '{ type filter hook output priority 0 ; }'
sudo nft add rule inet mtu-lab output icmp type destination-unreachable drop
```

Agora provoque: envie um pacote grande com `DF` setado.

```bash
ping -M do -s 1472 10.10.10.10         # vai falhar localmente (MTU da interface é 1400)
ping -M do -s 1350 10.10.10.10         # 1350 + 28 = 1378 → cabe
```

**Capture a tentativa e documente:**

```bash
sudo tcpdump -i any -nn -v 'icmp and greater 1300'
```

Responda em `mtu.md`:

1. Qual a MTU da interface? Qual o payload máximo de ICMP?
2. O `ping` de 1472 falhou com que mensagem?
3. Se você removesse a regra do `nftables`, o ICMP tipo 3 subtipo 4 chegaria?
4. **Por que o "bloqueie todo ICMP" é uma recomendação errada?** Responda com base no que você
   acabou de ver.

**Limpeza (obrigatória):**

```bash
sudo ip link set eth0 mtu 1500
sudo nft delete table inet mtu-lab
sudo tc qdisc del dev eth0 root 2>/dev/null || true
tc qdisc show dev eth0
```

### Critérios de aceitação

- `baseline.md`, `perda.md`, `janela.md` e `mtu.md` com as capturas anexadas e as perguntas
  respondidas.
- Você contou retransmissões **com `tshark`**, não a olho.
- Você distinguiu fast retransmit de RTO com evidência na captura.
- Você provou a janela zero com o número do frame onde ela aparece.
- Você explicou por que `win 0` aponta para a aplicação, não para a rede.
- Você restaurou MTU, `tc` e `nftables` ao estado original. **Confirme com os comandos de
  verificação.**
- Nenhum comando foi executado fora de `10.10.10.0/24`.

---

## Avaliação

1. Desenhe o header TCP. Qual campo diz onde começa o payload? Como você confirma no hexdump?
2. Uma captura mostra `Flags [R]` vindo de um IP diferente do destino. O que isso sugere?
3. Explique a diferença entre firewall com `drop` e com `reject` do ponto de vista de quem observa
   a captura.
4. O que `win 0` significa? Por que isso aponta para a aplicação do receptor?
5. O campo de janela tem 16 bits. Como um receptor anuncia uma janela de 8 MB?
6. `tcpdump` mostra `win 501` e o Wireshark mostra uma janela efetiva bem maior. Explique a
   divergência.
7. Descreva o fast retransmit. Quantos ACK duplicados disparam? O que o receptor está tentando
   dizer com eles?
8. O que é head-of-line blocking e o que o SACK resolve?
9. Diferencie retransmissão por RTO de retransmissão por fast retransmit na captura.
10. O que `CLOSE-WAIT` acumulando indica? Que componente está com problema?
11. Por que `TIME-WAIT` existe? Quando ele se torna um problema, e qual a solução correta?
12. Descreva o black hole de MTU em cinco passos. Por que `ping` funciona e a aplicação não?
13. Por que bloquear todo o ICMP causa falha em conexões TCP que não têm relação com `ping`?

---

**Próximo:** [Módulo 5 — UDP, DNS e o caminho do nome](modulo-05.md)
