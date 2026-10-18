# Módulo 6 — `tcpdump` na Prática

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Dominar as opções de `tcpdump` que importam, e saber o que cada uma muda na saída.
2. Escrever filtros BPF precisos — inclusive os que a maioria não sabe montar.
3. Capturar seletivamente com rotação, limite e filtro de tempo.
4. Ler captura de incidente: varredura, conexão recusada, beacon.
5. Saber quando **não** usar `tcpdump` e partir para outra ferramenta.

---

## ⚠ Ética

Este módulo ensina a capturar. É o módulo com maior risco de uso indevido.

⚠ **Capturar tráfego que não é seu é crime, mesmo sem ler o conteúdo.** O simples ato de pôr
uma interface em modo promíscuo numa rede de terceiro é acesso indevido. No Brasil: art. 154-A
do Código Penal. Some a isso a Lei 9.296/96 se o tráfego contiver comunicação, e a LGPD se
contiver dado pessoal — que ele vai conter.

**A regra do curso, sem exceção:** captura em `10.10.10.0/24`, criada por você. Em engajamento
real, captura apenas com autorização escrita, escopo definido, e política de descarte dos dados.

⚠ **Captura contém dado sensível.** Um `.pcap` de 10 minutos de rede corporativa pode conter
credenciais, cookies de sessão, nomes, e conteúdo de e-mail. Trate o arquivo como você trataria
um banco de dados vazado: cifrado, com retenção definida, destruído ao final.

---

## 6.1 As opções que você realmente usa

`tcpdump` tem centenas de opções. Estas são as que decidem se a captura serve ou não.

### Seleção de interface e formato

```bash
sudo tcpdump -i eth0                 # interface específica
sudo tcpdump -i any                  # todas as interfaces ← cuidado, trabalho dobrado
sudo tcpdump -i eth0 -c 100          # para depois de 100 pacotes
sudo tcpdump -i eth0 -s 0            # snaplen 0 = captura o pacote INTEIRO
sudo tcpdump -i eth0 -s 96           # só os primeiros 96 bytes (headers)
```

⚠ **`-s 0` versus o default.** O `tcpdump` moderno usa snaplen 262144 por padrão, o que na
prática significa pacote inteiro. Mas em versões antigas e em alguns contextos, o default
trunca em 68 bytes — e você perde o payload **sem perceber**. **Sempre passe `-s 0`
explicitamente** quando o payload importa. Uma captura truncada só se revela quando você precisa
do dado, e aí é tarde.

### Saída: o que você vê na tela

```bash
-n                  # não resolve nomes (IP numérico)  ← sempre use
-nn                 # não resolve nomes nem portas     ← use ainda mais
-e                  # mostra o header Ethernet
-X                  # hexdump (link layer em diante)
-XX                 # hexdump incluindo o header Ethernet
-A                  # mostra o payload como ASCII
-v / -vv / -vvv     # mais detalhe (checksum, TTL, opções)
-t                  # sem timestamp
-tttt               # timestamp completo com data
-S                  # números de sequência ABSOLUTOS
-q                  # menos verboso (bom para volume)
```

**A regra de ouro da legibilidade:** `-nn` sempre. Sem ele, o `tcpdump` tenta resolver DNS
reverso **de cada IP**, e cada resolução é uma consulta de rede — numa captura de volume isso
destrói o desempenho e polui a saída com nomes aleatórios de DNS reverso.

### Saída: escrever e ler arquivo

```bash
sudo tcpdump -i eth0 -w cap.pcap 'tcp port 80'     # escreve
sudo tcpdump -r cap.pcap -nn                        # lê
tcpdump -r cap.pcap -nn -w filtrado.pcap 'host 10.10.10.10'  # filtra um pcap
tcpdump -r cap.pcap -nn -c 20                       # lê os primeiros 20
tcpdump -r cap.pcap -nn -A 'tcp port 80'            # lê com payload ASCII
```

N N **Captura em arquivo não é enriquecida retroativamente.** Se você capturou com `-s 96`, o
`.pcap` só tem 96 bytes por pacote — e não há como recuperar o payload depois. **Decida o
snaplen antes de capturar.**

### Rotação: captura longa sem encher o disco

```bash
# Novo arquivo a cada 100 MB, mantendo os 10 mais recentes
sudo tcpdump -i eth0 -s 0 -w cap-%Y%m%d-%H%M%S.pcap \
     -G 3600 -C 100 -W 10 -Z user 'not port 22'
```

| Opção | Efeito |
|---|---|
| `-C 100` | Novo arquivo a cada 100 MB |
| `-G 3600` | Novo arquivo a cada 3600 segundos |
| `-W 10` | Mantém no máximo 10 arquivos, descartando o mais antigo |
| `-Z user` | Baixa privilégio após abrir a interface ← **importante** |
| `%Y%m%d-%H%M%S` | Padrão de nome com data e hora |

⚠ **`-W` é o que impede o disco de encher.** Sem ele, uma captura esquecida num servidor de
produção enche a partição, derruba o serviço, e vira incidente causado pela ferramenta de
diagnóstico. `-Z` é o que impede que um bug do `tcpdump` signifique comprometimento com root.

### Sinais e controle

```bash
# Em execução, pressione:
#   Ctrl-C   — encerra e mostra estatísticas
#   Ctrl-\   — encerra sem estatísticas (útil com -w)
```

---

## 6.2 Filtros BPF: a habilidade central

Filtro BPF é compilado no kernel e aplicado **antes** de o pacote chegar ao `tcpdump`. Isso
significa **um filtro bem escrito reduz uso de CPU, disco e ruído**. Um filtro ruim
(`tcpdump` sem filtro em link de 1 Gbps) descarta a maioria dos pacotes por falta de buffer, e
você não percebe.

### Primitivas por camada

```bash
# Por host
host 10.10.10.10
src host 10.10.10.10
dst host 10.10.10.10
src net 10.10.10.0/24

# Por porta
port 80
portrange 8000-8100
src port 53
dst portrange 32768-60999

# Por protocolo
tcp
udp
icmp
arp
ip
ip6
icmp6
```

### Operadores

| Operador | Uso |
|---|---|
| `and` / `&&` | Ambos |
| `or` / `\|\|` | Qualquer |
| `not` / `!` | Negação |
| `( ... )` | Agrupamento — **escape o parêntese no shell** |

```bash
# HTTP ou HTTPS, mas não SSH e não DNS
sudo tcpdump -nn '(tcp port 80 or tcp port 443) and not port 22 and not port 53'

# Tráfego para fora da rede local
sudo tcpdump -nn 'not net 10.10.10.0/24'

# ARP entre dois hosts
sudo tcpdump -nn -e 'arp and host 10.10.10.10'
```

⚠ **Parênteses no shell precisam de escape ou aspas.** `tcpdump -nn (tcp or udp)` dá erro de
sintaxe do bash. Use `tcpdump -nn '(tcp or udp)'`. É o erro mais comum de quem está começando
com filtro.

### Flags TCP — a sintaxe da máscara

Aqui está a parte que muita gente não domina. Para filtrar por flag TCP, você acessa o byte de
flags do header TCP com deslocamento e máscara:

```bash
# Sintaxe: tcp[tcpflags] & <flag> != 0
sudo tcpdump -nn 'tcp[tcpflags] & tcp-syn != 0'                # SYN
sudo tcpdump -nn 'tcp[tcpflags] & tcp-rst != 0'                # RST
sudo tcpdump -nn 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn' # SYN sem ACK (só abertura)
sudo tcpdump -nn 'tcp[tcpflags] & tcp-fin != 0'                # FIN
sudo tcpdump -nn 'tcp[tcpflags] == 0x02'                       # somente SYN, byte exato
```

| Nome da flag | Valor |
|---|---|
| `tcp-fin` | `0x01` |
| `tcp-syn` | `0x02` |
| `tcp-rst` | `0x04` |
| `tcp-push` | `0x08` |
| `tcp-ack` | `0x10` |
| `tcp-urg` | `0x20` |
| `tcp-ece` | `0x40` |
| `tcp-cwr` | `0x80` |

**O filtro `(tcp-syn|tcp-ack) == tcp-syn` é ouro para análise:** ele pega **só os SYN sem ACK**,
ou seja, **só as tentativas de abertura**. É assim que você conta varredura, ou clientes
tentando conectar a um serviço morto.

```bash
# Apenas as tentativas de conexão para a porta 22, de toda a rede
sudo tcpdump -nn -c 100 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn and dst port 22'
```

### Filtros por tamanho

```bash
greater 1000                  # pacotes maiores que 1000 bytes
less 100                      # menores que 100
ip[2:2] > 1000                # campo "tamanho total" do IP (offset 2, 2 bytes)
tcp[13] & 0x02 != 0           # flag SYN por offset numérico direto
```

**Por que `ip[2:2]` em vez de `greater`?** `greater` conta o tamanho do quadro (incluindo
Ethernet), `ip[2:2] > 1000` lê o campo do header IP. A diferença de 14 bytes importa quando você
está caçando pacote grande para problema de MTU.

⚠ **Filtro por offset é o que resolve o caso difícil.** Exemplo real: você precisa capturar só
pacotes com payload (não ACK vazio) numa porta, porque o volume é enorme.

```bash
# tcp[2:2] é a porta destino; 13 é o byte de flags; 12 é data offset
# Filtrar pacotes com dado real (data offset > 5, ou seja, header maior que o mínimo não conta
# — o jeito certo é pelo tamanho do payload)
sudo tcpdump -nn 'tcp port 443 and ip[2:2] > 60'
```

### Filtros por conteúdo

```bash
# Payload contendo uma string
sudo tcpdump -nn -A 'tcp port 80 and tcp[((tcp[12] & 0xf0) >> 2):4] = 0x47455420'  # "GET "

# Com tshark é muito mais legível (Módulo 7):
tshark -r cap.pcap -Y 'http.request.method == "GET"'
```

N N **Cálculo de offset para payload TCP é feio e propenso a erro**, porque você precisa ler o
data offset do próprio header para saber onde o payload começa: `tcp[12] & 0xf0 >> 2` dá o
tamanho do header em bytes. Entenda a fórmula, mas **use `tshark` para isso na prática** — é o
tema do Módulo 7.

### Filtros compostos úteis do dia a dia

```bash
# Tudo menos SSH e DNS (reduz ruído em captura longa)
sudo tcpdump -nn 'not port 22 and not port 53'

# Só tráfego de saída para a internet
sudo tcpdump -nn 'not net 10.0.0.0/8 and not net 172.16.0.0/12 and not net 192.168.0.0/16'

# Só tentativas de conexão (SYN, sem ACK) — para achar varredura
sudo tcpdump -nn 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn'

# Só RST — para achar conexões recusadas
sudo tcpdump -nn 'tcp[tcpflags] & tcp-rst != 0'

# DNS que não é do resolvedor esperado (possível C2)
sudo tcpdump -nn 'udp port 53 and not host 10.10.10.1'

# ICMP que não é echo (mensagens de erro do caminho)
sudo tcpdump -nn 'icmp and not icmp[icmptype] == 8 and not icmp[icmptype] == 0'

# Tráfego entre dois hosts, qualquer porta
sudo tcpdump -nn 'host 10.10.10.10 and host 10.10.10.20'

# Tráfego de um host para um destino específico, com payload
sudo tcpdump -nn -A 'host 10.10.10.20 and port 8080 and greater 200'
```

---

## 6.3 Limites que você precisa conhecer

`tcpdump` não é infinito. Saber onde ele falha evita conclusões erradas.

| Limite | Efeito | Como contornar |
|---|---|---|
| **Buffer padrão pequeno** | Perde pacotes em link rápido, **sem avisar por padrão** | `-B 32768` (KB) ou `--buffer-size` |
| **Drop silencioso** | Você analisa uma captura com furos | Cheque a estatística final (`Ctrl-C`) |
| **CPU alta com filtro ruim** | Perde pacote antes de filtrar | Filtro BPF específico reduz carga |
| **Sem reassembly de TCP** | Cada segmento é um pacote separado | Use `tshark -z follow,tcp` |
| **Sem dissecção de aplicação** | Você vê bytes, não HTTP | Use `tshark` (Módulo 7) |
| **Um processo por arquivo** | Sem paralelismo | `dumpcap` ou `tshark` capturando |
| **`-i any` duplica** | Vê pacote de entrada e saída | Filtrar por `inbound`/`outbound` ou usar interface específica |

**As estatísticas finais são obrigatórias de ler:**

```bash
sudo tcpdump -i eth0 -nn -c 1000 -w /dev/null 'tcp'
# Ao terminar (Ctrl-C), veja:
#   packets captured / received by filter / dropped by kernel
```

⚠ **`dropped by kernel` maior que zero significa que sua captura tem furos.** Você **não pode**
concluir "não houve X" a partir dela. Um analista que não lê esse número produz conclusões
erradas com confiança. Se o drop é alto:

```bash
# Aumente o buffer e reduza o escopo do filtro
sudo tcpdump -i eth0 -nn -s 0 -B 65536 -w cap.pcap \
     'host 10.10.10.20 and tcp port 8080'
```

---

## 6.4 Quando NÃO usar `tcpdump`

| Situação | Ferramenta certa |
|---|---|
| Análise de protocolo de aplicação | `tshark` (Módulo 7) |
| Reassembly de fluxo TCP | `tshark -z follow,tcp,ascii,N` |
| Estatística por conversa | `tshark -z conv,tcp` |
| Captura em link de 10 Gbps | `dumpcap` com buffer grande, ou captura por amostragem |
| Achar processo dono da conexão | `ss -tanp` |
| Ver estado do TCP sem capturar | `ss -ti` |
| Roteamento | `ip route get` |
| Firewall | `nft list ruleset` |
| Análise visual e interativa | Wireshark (GUI sobre o mesmo `.pcap`) |

**`tcpdump` é a ferramenta certa quando você precisa de: filtro preciso, saída scriptable, ou
captura de baixo overhead em servidor.** Para análise, entregue o `.pcap` ao `tshark` ou ao
Wireshark.

---

## 6.5 LAB — Análise de captura de incidente

**Duração:** 120 min
**Objetivo:** capturar, filtrar e interpretar três cenários de incidente.

### Cenário 1 — Varredura de portas (30 min)

```bash
mkdir -p ~/redes-lab/lab6 && cd ~/redes-lab/lab6

# No observador, capture apenas tentativas de conexão
sudo tcpdump -i eth0 -nn -s 0 \
     'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn' \
     -w varredura.pcap -c 500 &

# Do cliente, gere uma varredura CONTROLADA na sua rede de laboratório
for p in $(seq 1 100); do
    (timeout 0.3 bash -c "exec 3<>/dev/tcp/10.10.10.10/$p" 2>/dev/null) &
done
wait
sleep 2
```

⚠ **Isto é varredura no seu laboratório.** 100 portas, na máquina `10.10.10.10` que você criou.
Não aponte este comando para nenhum outro IP.

**Analise:**

```bash
# Contagem de SYN por porta de destino
tcpdump -r varredura.pcap -nn | \
  awk '{print $5}' | sed 's/:.*//' | \
  awk -F. '{print $NF}' | sort -n | uniq -c

# Quantas portas distintas foram sondadas?
tcpdump -r varredura.pcap -nn | grep -oP '> \S+\.\K\d+(?=:)' | sort -un | wc -l
```

**Produza `cenario-varredura.md`:**

| Pergunta | Resposta |
|---|---|
| Quantos SYN foram capturados, em quantos segundos? | |
| Quantas portas distintas? | |
| A varredura foi sequencial, aleatória ou paralelela? | |
| Quantos RST voltaram? O que isso significa? | |
| Qual filtro BPF você usaria para detectar isso em produção? | |
| Quantos pacotes foram descartados pelo kernel (`-c` final)? Isso invalida a análise? | |

### Cenário 2 — Conexão recusada versus filtrada (30 min)

```bash
sudo tcpdump -i eth0 -nn -S -s 0 -w recusa.pcap 'host 10.10.10.10 and port 9999' &

# No cliente:
timeout 1 bash -c 'exec 3<>/dev/tcp/10.10.10.10/9999' 2>&1 | head -1
timeout 2 bash -c 'exec 3<>/dev/tcp/10.10.10.10/9998' 2>&1 | head -1
sleep 1

tcpdump -r recusa.pcap -nn -S
```

Com o `nftables` do Módulo 3, compare os dois casos:

```bash
# Bloqueie a 9997 com drop (silencioso)
sudo nft add table inet recusa-lab
sudo nft add chain inet recusa-lab output '{ type filter hook output priority 0 ; }'
sudo nft add rule inet recusa-lab output tcp dport 9997 drop

timeout 2 bash -c 'exec 3<>/dev/tcp/10.10.10.10/9997' 2>&1 | head -1
```

**Produza `cenario-recusa.md`:**

| Caso | O que aparece na captura | O que o cliente vê |
|---|---|---|
| Porta fechada (9999) | | |
| Porta bloqueada com `drop` (9997) | | |
| Porta bloqueada com `reject` | | |

**Limpeza:**

```bash
sudo nft delete table inet recusa-lab
```

**Responda:** qual a diferença de experiência para quem está atacando, entre `drop` e `reject`?
Qual é a vantagem defensiva de cada um?

### Cenário 3 — Beacon e filtro de produção (60 min)

Você precisa de um filtro que rode por horas sem encher o disco, mas que capture o que importa.

```bash
# Filtro de produção: tráfego externo, sem SSH/DNS interno, só pacotes com dado
sudo tcpdump -i eth0 -nn -s 0 -B 65536 \
     -w producao-%Y%m%d-%H%M.pcap -G 300 -C 50 -W 12 -Z "$(whoami)" \
     'not port 22 and not (udp port 53 and host 10.10.10.1) and not arp'
```

Deixe rodando 2 minutos gerando tráfego variado:

```bash
# Tráfego normal
curl -s http://10.10.10.10:8080/ > /dev/null
dig exemplo.lab > /dev/null

# Padrão de beacon: consulta ao MESMO nome em intervalo regular
python3 - <<'EOF'
import socket, time
for i in range(15):
    try:
        socket.gethostbyname(f"beacon-{i}.lab")
    except Exception:
        pass
    time.sleep(2)
EOF
```

**Analise o arquivo gerado:**

```bash
ls -la producao-*.pcap*
tcpdump -r producao-*.pcap -nn -c 20

# Verifique o drop
tcpdump -r producao-*.pcap -nn -c 1 2>&1 | tail -1
```

**Produza `cenario-producao.md`:**

1. Quantos arquivos foram criados? Por que (`-G 300` com 2 minutos de captura)?
2. Seu filtro descartou ARP. Isso perde informação? Em qual cenário isso importa?
3. **Escreva um filtro melhor** para um servidor web de produção que: ignore SSH, ignore backup
   entre servidores, mas capture toda saída externa e todo DNS fora do resolvedor interno.
4. Qual o `packet loss` reportado? Como você reduziria se fosse alto?

### Critérios de aceitação

- `cenario-varredura.md` com o filtro BPF de detecção escrito.
- `cenario-recusa.md` com a tabela dos três casos preenchida **com captura anexada**.
- Você distinguiu `drop` de `reject` **com evidência no `.pcap`**, não por conceito.
- `cenario-producao.md` com um filtro de produção justificado por escrito.
- Você leu e reportou o `packet loss` dos cenários.
- `nftables` limpo, arquivos de teste removidos, `tc` restaurado se usado.
- Nada capturado fora de `10.10.10.0/24`.

---

## Avaliação

1. Por que `-nn` é praticamente obrigatório? O que acontece sem ele numa captura de volume?
2. Qual a diferença entre `-s 0` e `-s 96`, e por que a escolha precisa ser feita **antes** de
   capturar?
3. O que `-W 10` faz com `-C 100`? Por que essa combinação é obrigatória em servidor?
4. O que `-Z` faz e por que ele importa para segurança do próprio `tcpdump`?
5. Escreva o filtro BPF para: "SYN sem ACK, para a porta 443, de qualquer host exceto
   10.10.10.10".
6. Explique `tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn`. Por que isso pega só tentativas de
   abertura?
7. Por que `ip[2:2] > 1000` e `greater 1000` não são equivalentes?
8. Como você captura só pacotes com payload TCP, e por que a fórmula envolve `tcp[12]`?
9. Você vê `dropped by kernel: 4321` no fim de uma captura. O que você **não pode** concluir?
10. Por que `tcpdump` não faz reassembly de TCP? Que ferramenta faz?
11. Cite três situações em que `tcpdump` é a ferramenta errada, e o que usar no lugar.
12. Um `.pcap` de produção contém cookies de sessão. Que cuidado você deve ter com esse arquivo?

---

**Próximo:** [Módulo 7 — Análise com `tshark`](modulo-07.md)
