# Módulo 10 — `scapy`, Firewall e Diagnóstico

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 9

---

## Objetivos

1. Gerar, enviar e ler pacotes com `scapy`, entendendo cada campo que você constrói.
2. Entender o modelo de firewall do Linux e escrever regras de `nftables` com critério.
3. Diagnosticar problema de rede com método, não com tentativa e erro.
4. Reconhecer quando o problema **não** é de rede.
5. Consolidar o curso num método de investigação repetível.

---

## ⚠ Ética — a última vez, e a mais importante

`scapy` dá a você controle total sobre cada campo de cada pacote. Isso significa que **tudo o que
vinha sendo apenas "observação" nos módulos anteriores agora pode ser "falsificação"**.

⚠ **Falsificar pacote é onde a linha legal é mais nítida e menos perdoável.** Enviar um pacote
com IP de origem falso, um ARP reply não solicitado, um RST forjado, ou um DNS reply inventado
contra rede que não é sua **não é "estudar redes"** — é ataque, com tipificação específica
(Código Penal art. 154-A e correlatos).

**A regra do curso, e ela não tem exceção:** todo pacote que você gerar neste módulo sai da sua
máquina para `10.10.10.0/24`, criada por você. Se você adaptar qualquer exercício para outra
rede, a única coisa que torna isso legal é **autorização escrita com escopo definido**. Não a
intenção. Não "só para demonstrar".

---

## 10.1 `scapy` — construir pacote em Python

`scapy` é uma biblioteca que permite montar pacote camada por camada e enviá-lo ou analisá-lo.

### O princípio: camadas empilhadas com `/`

```python
from scapy.all import *

pkt = Ether() / IP(dst="10.10.10.10") / TCP(dport=80, flags="S") / b"dado"

# Ver a estrutura
pkt.show()

# Ver como bytes
bytes(pkt)

# Enviar
sendp(pkt, iface="eth0")       # camada 2 (com Ethernet)
send(pkt)                       # camada 3 (kernel escolhe o enlace)
```

**O operador `/` significa "encapsule"**. `IP() / TCP()` monta um pacote TCP dentro de um IP.
É a tradução literal do encapsulamento do Módulo 1.

### Os comandos que você vai usar

| Função | O que faz |
|---|---|
| `sr1(pkt)` | Envia e recebe **um** pacote de resposta |
| `sr(pkt)` | Envia e recebe — devolve (respondidos, não respondidos) |
| `send(pkt)` | Só envia (camada 3) |
| `sendp(pkt)` | Só envia (camada 2) |
| `sniff(iface=, filter=, count=)` | Captura |
| `rdpcap("x.pcap")` | Lê um `.pcap` |
| `wrpcap("x.pcap", pkts)` | Escreve um `.pcap` |
| `pkt[IP].ttl` | Acessa um campo |
| `pkt.summary()` | Uma linha por pacote |

### Construindo um SYN e lendo a resposta

```python
#!/usr/bin/env python3
"""syn-probe.py — sonda uma porta e interpreta a resposta. Laboratório apenas."""
from scapy.all import IP, TCP, sr1, conf
import sys

conf.verb = 0

def sonda(host, porta, timeout=2):
    resposta = sr1(IP(dst=host) / TCP(dport=porta, flags="S"),
                   timeout=timeout)

    if resposta is None:
        return "SEM RESPOSTA", None

    if resposta.haslayer(TCP):
        flags = resposta[TCP].flags
        if flags == 0x12:      # SYN + ACK
            return "ABERTA", resposta
        elif flags & 0x04:     # RST
            return "FECHADA", resposta
    elif resposta.haslayer(ICMP):
        tipo = resposta[ICMP].type
        codigo = resposta[ICMP].code
        if tipo == 3 and codigo in (1, 10, 13):
            return f"FILTRADA (ICMP {tipo}/{codigo})", resposta

    return "DESCONHECIDO", resposta

alvo = sys.argv[1] if len(sys.argv) > 1 else "10.10.10.10"
for porta in [22, 80, 443, 8080, 9999]:
    estado, resp = sonda(alvo, porta)
    origem = f"{resp[IP].src}" if resp and resp.haslayer(IP) else "-"
    print(f"porta {porta:>5}  {estado:<28} resposta de {origem}")
```

**O que isso ensina que os módulos anteriores não ensinaram:** a **diferença entre os três
estados** — aberta, fechada, filtrada — e como cada um se manifesta:

| Estado | Resposta | Conclusão |
|---|---|---|
| **Aberta** | SYN-ACK | Há serviço escutando |
| **Fechada** | RST | Chevou no host, nada escutando |
| **Filtrada** | Nada, ou ICMP 3/13 | Algo descartou — firewall |
| **Filtrada (reject)** | RST do roteador, ou ICMP 3/1 | Firewall recusou ativamente |

⚠ **Isto é uma sonda de 5 portas na sua máquina de laboratório.** Não transforme isso num
varredor de faixa. A diferença entre "eu medi uma porta" e "eu varri uma rede" é a diferença
entre diagnóstico e reconhecimento hostil.

### Lendo um `.pcap` com `scapy`

```python
from scapy.all import rdpcap, IP, TCP, DNS
from collections import Counter

pkts = rdpcap("cap.pcap")

# Top conversas
conversas = Counter()
for p in pkts:
    if p.haslayer(IP):
        conversas[(p[IP].src, p[IP].dst)] += 1

for (src, dst), n in conversas.most_common(10):
    print(f"{src:>16} -> {dst:<16} {n} pacotes")

# Top portas de destino
portas = Counter(p[TCP].dport for p in pkts if p.haslayer(TCP))
print(portas.most_common(10))

# Nomes DNS consultados
nomes = [p[DNS].qd.qname.decode() for p in pkts
         if p.haslayer(DNS) and p[DNS].qr == 0 and p[DNS].qd]
print(Counter(nomes).most_common(10))
```

**Vantagem sobre o `tshark`:** você programa a análise. Agregações complexas, correlação entre
protocolos, e lógica de detecção própria.

---

## 10.2 Firewall no Linux: o modelo

Antes de escrever regra, é preciso entender **onde** ela é aplicada. Confundir os pontos é a
razão pela qual a maioria das regras de firewall não funciona como esperado.

### Os cinco hooks do `netfilter`

```
              ┌─────────────────────────────────────────┐
   pacote     │               KERNEL                    │
   entra  ───▶│  PREROUTING ──┬──▶ FORWARD ──┬──▶ POSTROUTING ──▶ sai
              │      │        │             │        │
              │      ▼        │             │        │
              │   roteamento  │             │        │
              │      │        │             │        │
              │      ▼        │             │        │
              │   INPUT       │             │        │
              │      │        │             │        │
              │      ▼        │             │        │
              │  processo     │             │        │
              │  local        │             │        │
              │      │        │             │        │
              │      ▼        │             │        │
              │   OUTPUT ─────┴─────────────┘        │
              └─────────────────────────────────────────┘
```

| Hook | Quando aplica | Uso típico |
|---|---|---|
| **PREROUTING** | Antes de decidir a rota | DNAT, redirecionamento, marcar |
| **INPUT** | Pacote destinado a **esta máquina** | Firewall de host |
| **FORWARD** | Pacote que **atravessa** esta máquina | Firewall de roteador |
| **OUTPUT** | Pacote gerado **por esta máquina** | Restringir saída |
| **POSTROUTING** | Depois de decidir a rota | SNAT, masquerade |

⚠ **O erro número um de firewall:** bloquear tráfego **entre outros hosts** na chain `INPUT`.
`INPUT` só vê pacote destinado à própria máquina. Para bloquear tráfego que atravessa, é
**`FORWARD`**. Essa confusão explica a maior parte de "minha regra não funciona".

### Ordem das regras: primeira que casa, decide

Diferente de roteamento (onde vence o prefixo mais longo), **no firewall a primeira regra que
casa vence** e o processamento da chain para.

```
chain input {
    tcp dport 22 accept        ← se casar, aceita e PÁRA
    tcp dport 22 drop          ← nunca será alcançada
}
```

### Política padrão vs. regra explícita

```bash
# Política do chain: o que acontece se nenhuma regra casar
sudo nft add chain inet filter input '{ type filter hook input priority 0; policy drop; }'
```

⚠ **Política `drop` é o padrão correto**, mas cuidado: **se você aplicar política `drop` sem
regra de `accept` para a sessão SSH ativa, você se tranca para fora do servidor.** Sempre:

1. Adicione a regra de `accept` para o seu acesso **primeiro**.
2. Confirme que funciona (abra uma segunda sessão).
3. Só então aplique a política `drop`.

Isso vale para `iptables`, `nftables`, ufw, firewall de cloud — todos.

### `nftables` — a sintaxe atual

```bash
# Estrutura básica
sudo nft add table inet filter
sudo nft add chain inet filter input  '{ type filter hook input priority 0; policy accept; }'
sudo nft add chain inet filter output '{ type filter hook output priority 0; policy accept; }'
sudo nft add chain inet filter forward '{ type filter hook forward priority 0; policy drop; }'

# Regras de entrada
sudo nft add rule inet filter input iif lo accept
sudo nft add rule inet filter input ct state established,related accept
sudo nft add rule inet filter input tcp dport 22 accept
sudo nft add rule inet filter input tcp dport { 80, 443 } accept
sudo nft add rule inet filter input icmp type { destination-unreachable, time-exceeded } accept
sudo nft add rule inet filter input icmp type echo-request limit rate 5/second accept
```

### ⚠ `conntrack` — o conceito que muda tudo

**`ct state established,related accept`** é a regra mais importante de qualquer firewall com
estado. Sem ela, o firewall bloquearia a **resposta** do tráfego que você permitiu sair.

```
1. Você gera SYN de saída para a porta 443     → permitido pela política de saída
2. A resposta SYN-ACK chega              → cadeia INPUT
3. Sem conntrack: a política de entrada bloqueia, porque a resposta
   não casa nenhuma regra de "porta 443 de entrada"
4. Com conntrack: o kernel sabe que este pacote pertence a uma conexão
   que ELE iniciou, e aceita como "established"
```

**Sem conntrack, seu firewall é inútil na prática.** E `related` cobre casos como ICMP de erro
associado a uma conexão estabelecida — inclusive o `fragmentation needed` do Módulo 3.

```bash
# Ver a tabela de conexões rastreadas
sudo conntrack -L | head -20
sudo conntrack -C                  # contagem
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max
```

### `drop` versus `reject` — a decisão de política

```bash
sudo nft add rule inet filter input tcp dport 23 drop       # silencioso
sudo nft add rule inet filter input tcp dport 23 reject     # responde ICMP/RST
```

| | `drop` | `reject` |
|---|---|---|
| O que o emissor vê | Nada, até dar timeout | Recusa imediata |
| Experiência do usuário | "Travou" | "Não foi possível conectar" |
| Diagnóstico | Difícil | Fácil |
| Informação ao atacante | Nenhuma | **Sua existência e que a porta está filtrada** |
| Recomendação | Borda exposta à internet | Rede interna, depuração |

⚠ **Isto é uma decisão de política, não uma preferência técnica.** `drop` na borda esconde a
existência do firewall; `reject` na rede interna torna o diagnóstico possível. Você vai
encontrar as duas em cliente real, e precisa saber ler as duas.

---

## 10.3 Método de diagnóstico

Nada aqui é novo — é a consolidação dos nove módulos anteriores num método.

### O método em sete passos

**Passo 1 — Defina o sintoma exato.** "Não funciona" não é sintoma. "GET para
`http://10.10.10.10:8080/api` retorna timeout após 30s, às 14h, em 3 de 5 tentativas" é sintoma.

**Passo 2 — Localize a camada.** Antes de investigar, pergunte **onde** está quebrando:

```bash
# Camada 2/1: o link está ativo?
ip -s link show eth0 | tail -3

# Camada 3: chego no gateway? E no destino?
ip route get 10.10.10.10
ping -c 3 10.10.10.1          # gateway
ping -c 3 10.10.10.10         # destino

# Camada 4: a porta abre?
timeout 3 bash -c 'cat < /dev/tcp/10.10.10.10/8080' && echo "TCP OK"

# Camada 7: a aplicação responde?
curl -v --max-time 10 http://10.10.10.10:8080/
```

**Se o TCP abre e o `curl` falha, o problema é camada 7.** Isso elimina 90% das hipóteses
inúteis em um comando.

**Passo 3 — Colete evidência antes de hipótese.** Capture, `ss`, contadores. **Não formule
teoria ainda.**

**Passo 4 — Compare com o que funciona.** Se X falha, teste Y que sabidamente funciona, pelo
mesmo caminho. Diferença entre os dois é a pista.

**Passo 5 — Siga o tráfego pelos dois lados.** Capture no cliente **e** no servidor. Onde o
pacote aparece e desaparece é o ponto do problema. **Este é o passo que resolve quase tudo, e o
que a maioria não faz.**

**Passo 6 — Formule uma hipótese e teste-a.** Uma hipótese por vez. Se desligar o firewall
resolve, o firewall era o problema — e você tem evidência, não opinião.

**Passo 7 — Documente o sintoma, a causa e a prova.** Inclusive se não achou a causa; registre
o que você descartou.

### A tabela de erros clássicos

| Sintoma | Causas prováveis | Verificar |
|---|---|---|
| `ping` funciona, HTTP não | Porta bloqueada, serviço morto, camada 7 | `ss -tlnp` no servidor, firewall |
| `ping` não funciona, mas HTTP sim | ICMP bloqueado | Testar por TCP |
| Conexão trava em pacote grande | MTU / black hole | `ping -M do` (Módulo 4) |
| Timeout na conexão | Firewall `drop`, host morto, rota ausente | `ip route get`, captura nos dois lados |
| RST imediato | Porta fechada, ou firewall `reject` | Origem do RST |
| `Connection refused` | Nada escutando | `ss -tlnp` |
| Funciona por IP, não por nome | DNS | `dig`, `/etc/resolv.conf` |
| Funciona em casa, não na empresa | Proxy, firewall corporativo, DNS interno | Comparar caminhos |
| Lento, não falha | Perda, jitter, congestionamento | `mtr`, `ss -ti` |
| Cai depois de 5 minutos | NAT timeout, keep-alive | `conntrack -L` |
| Só o primeiro funciona | TIME-WAIT, esgotamento de porta | `ss -tan state time-wait` |
| Intermitente | Rota instável, ECMP, perda | `mtr` longo (Módulo 8) |

### Quando o problema NÃO é de rede

Igualmente importante. Três sinais:

| Sinal | O que provavelmente é |
|---|---|
| TCP completa, ACKs fluem, `win 0` aparece | Aplicação do receptor não consome |
| `CLOSE-WAIT` acumulando | Bug: a aplicação não chama `close()` |
| 200 OK com corpo errado | Camada 7, lógica de negócio |
| Latência interna ao `curl`, mas DNS rápido e TCP rápido | Aplicação lenta |

⚠ **O maior erro de diagnóstico de rede é investigar rede quando o problema é aplicação.** A
captura é o que prova a diferença: se o TCP funciona e a aplicação responde errado, **a rede fez
o trabalho dela**.

---

## 10.4 LAB — Projeto final: diagnóstico de incidente

**Duração:** 120 min
**Objetivo:** aplicar o método completo a um cenário montado por outra pessoa — ou por você,
cegamente.

### Passo 1 — Monte um cenário com problema (você escolhe um)

**Escolha um e monte sem anotar o que fez.** Depois, resolva como se fosse captura de terceiro:
colecione evidência, formule hipótese, teste.

**Cenário A — Black hole de MTU:**
```bash
sudo ip link set eth0 mtu 1400
sudo nft add table inet cen
sudo nft add chain inet cen output '{ type filter hook output priority 0; }'
sudo nft add rule inet cen output icmp type destination-unreachable drop
```

**Cenário B — Porta bloqueada com `drop`:**
```bash
sudo nft add table inet cen
sudo nft add chain inet cen input '{ type filter hook input priority 0; }'
sudo nft add rule inet cen input tcp dport 8080 drop
```

**Cenário C — Rota errada:**
```bash
sudo ip route add 10.10.10.10/32 via 10.10.10.99
```

**Cenário D — Serviço escutando no endereço errado:**
```bash
# Em vez de 0.0.0.0, escute só em 127.0.0.1
python3 -m http.server 8080 --bind 127.0.0.1 &
```

**Cenário E — MTU + DNS combinados:** aplique A e quebre o resolvador em `/etc/resolv.conf`.

⚠ **Aplique ao seu laboratório e reverte tudo no final.** Anote os comandos de reversão
**antes** de aplicar.

### Passo 2 — Investigue com método (você ou outra pessoa)

Se você puder, peça para alguém aplicar um cenário para você às cegas. Se não, espere 10 minutos
e esqueça qual foi.

Siga os sete passos e **documente cada um** num arquivo `diagnostico.md`:

```markdown
## Passo 1 — Sintoma
Descrição exata, incluindo comando e mensagem de erro.

## Passo 2 — Localização da camada
Saída dos testes de L2, L3, L4, L7. Qual passou, qual falhou.

## Passo 3 — Evidência coletada
Capturas, ss, contadores. SEM hipótese ainda.

## Passo 4 — Comparação
O que funciona vs. o que não funciona, pelo mesmo caminho.

## Passo 5 — Tráfego pelos dois lados
Captura no cliente E no servidor. Onde o pacote some?

## Passo 6 — Hipótese e teste
Hipótese: ...
Teste: ...
Resultado: ...

## Passo 7 — Conclusão
Causa raiz, prova, e o que foi descartado.
```

### Passo 3 — Colete a evidência em cada camada

```bash
# Script de coleta — rode ANTES de formular hipótese
cat > coleta.sh <<'EOF'
#!/usr/bin/env bash
set -uo pipefail
ALVO="${1:-10.10.10.10}"
SAIDA="evidencia-$(date +%H%M%S)"
mkdir -p "$SAIDA"

{
echo "=== DATA ==="; date -Is
echo "=== INTERFACES ==="; ip -br addr
echo "=== ROTAS ==="; ip route show
echo "=== ROTA PARA O ALVO ==="; ip route get "$ALVO"
echo "=== VIZINHOS ==="; ip neigh show
echo "=== RESOLV ==="; cat /etc/resolv.conf 2>/dev/null
echo "=== PING GATEWAY ==="; ping -c 2 -W 2 "$(ip route | awk '/default/{print $3; exit}')" 2>&1
echo "=== PING ALVO ==="; ping -c 2 -W 2 "$ALVO" 2>&1
echo "=== MTU ==="; ip link show | grep -E '^[0-9]+:|mtu'
echo "=== TESTE MTU ==="
for s in 1472 1400 1200; do
    if ping -M do -s $s -c 1 -W 2 "$ALVO" >/dev/null 2>&1; then
        echo "payload $s OK (MTU $((s+28)))"
    else
        echo "payload $s FALHOU"
    fi
done
echo "=== SOCKETS ==="; ss -s
echo "=== ESTADOS TCP ==="; ss -tan | awk 'NR>1{print $1}' | sort | uniq -c | sort -rn
echo "=== FIREWALL ==="; sudo nft list ruleset 2>/dev/null | head -40
echo "=== CONNTRACK COUNT ==="; cat /proc/sys/net/netfilter/nf_conntrack_count
echo "=== ERROS DE INTERFACE ==="; ip -s link show | grep -A2 -E '^[0-9]+:'
} | tee "$SAIDA/coleta.txt"

echo
echo "Evidência em $SAIDA/"
EOF
chmod +x coleta.sh

./coleta.sh 10.10.10.10
```

**Rode isso ANTES de qualquer hipótese.** É o passo 3 do método, e é o que separa diagnóstico de
chute.

### Passo 4 — Captura nos dois lados

```bash
# No observador/cliente
sudo tcpdump -i eth0 -nn -s 0 -w lado-cliente.pcap 'host 10.10.10.10' &
# No alvo (se puder)
sudo tcpdump -i eth0 -nn -s 0 -w lado-servidor.pcap 'host 10.10.10.20' &

sleep 1
curl -v --max-time 10 http://10.10.10.10:8080/ 2>&1 | tee curl-saida.txt
timeout 5 traceroute -n 10.10.10.10
sleep 2

# Compare os dois lados
tcpdump -r lado-cliente.pcap -nn | head -20
tcpdump -r lado-servidor.pcap -nn | head -20
```

**A pergunta central:** o pacote que saiu do cliente **chegou** no servidor? E a resposta voltou?
A diferença entre as duas capturas **é o diagnóstico**.

### Passo 5 — Prova da causa raiz

Uma vez com a hipótese, **prove**:

```bash
# Se a hipótese é "o firewall está bloqueando"
sudo nft list ruleset | grep -i -A3 -B3 8080

# Desabilite temporariamente e confirme que resolve
sudo nft flush ruleset
curl -s --max-time 5 http://10.10.10.10:8080/ >/dev/null && echo "RESOLVEU — firewall era a causa"
# RESTAURE as regras!
```

⚠ **`nft flush ruleset` derruba todo o firewall.** Em máquina de produção isso é incidente
grave. Em laboratório, tudo bem — **e restaure depois**. Sempre.

### Passo 6 — Reverta tudo

```bash
sudo ip link set eth0 mtu 1500
sudo nft flush ruleset
sudo nft delete table inet cen 2>/dev/null || true
sudo ip route del 10.10.10.10/32 2>/dev/null || true
pkill -f "http.server 8080" 2>/dev/null || true

# Confirme
ip link show eth0 | grep mtu
sudo nft list ruleset
ip route show
```

### Critérios de aceitação

- `diagnostico.md` com os **sete passos** preenchidos, incluindo o que você descartou.
- `coleta.sh` rodado e a evidência salva **antes** de formular hipótese.
- Captura nos **dois lados** anexada, com a comparação explicada.
- Você provou a causa raiz com um teste que **confirma e um que descarta**.
- Você reverteu todo o ambiente e **confirmou com os comandos de verificação**.
- Você identificou pelo menos uma hipótese errada que teve que descartar.

---

## Projeto final do curso

Escolha um:

**A) Ferramenta de triagem de captura.** Um script Python (com `scapy` ou chamando `tshark`)
que recebe um `.pcap` e produz um relatório com: inventário de conversas, top portas e destinos,
SNIs anunciados, nomes DNS consultados com entropia calculada, conexões suspeitas por heurística
(beacon, SNI inconsistente, volume anômalo), e alertas de anomalia. Documente **cada heurística**
e por que ela indica algo — inclusive os falsos positivos que ela gera.

**B) Relatório de diagnóstico completo.** Pegue um problema real que você tenha (rede de casa,
rede da empresa, um serviço que falha) e aplique o método dos sete passos, ponta a ponta.
Documente tudo, inclusive o que deu errado na investigação. **O valor está na honestidade do
registro**, não na elegância da conclusão.

**C) Manual de diagnóstico da sua organização.** Documente o método aplicado ao seu ambiente:
quais comandos, quais ferramentas, quais são os erros recorrentes da sua rede específica, e um
checklist de coleta de evidência pronto para uso em war room. É o entregável mais útil na prática.

---

## Avaliação

1. O que o operador `/` faz no `scapy`? Como isso se relaciona com encapsulamento?
2. Como você distingue "porta fechada" de "porta filtrada" com `scapy`? Que resposta cada uma
   produz?
3. Descreva os cinco hooks do `netfilter` e o que cada um vê.
4. Se você quer bloquear tráfego entre dois **outros** hosts que atravessa sua máquina, em qual
   chain você põe a regra? Por que `INPUT` não serve?
5. Explique `ct state established,related accept`. O que acontece sem essa regra?
6. Por que a ordem das regras de firewall importa e é diferente da ordem de rotas?
7. Diferencie `drop` de `reject` em termos do que o emissor percebe. Quando cada um é a escolha
   certa?
8. Você vai aplicar política `drop` num servidor remoto. Qual o procedimento para não se trancar
   fora?
9. Descreva os sete passos do método. Por que o passo 3 proíbe hipótese?
10. Por que capturar **nos dois lados** resolve a maioria dos casos? O que a diferença entre as
    duas capturas revela?
11. Um incidente: TCP completa, ACKs fluem, `win 0` aparece. É problema de rede? Justifique.
12. Um serviço funciona por IP e não por nome. Quais são as três primeiras coisas a verificar?
13. Por que `nft flush ruleset` é perigoso em produção e o que você faz antes de rodá-lo?

---

## Encerramento do curso

Você começou sem saber o que era encapsulamento e termina lendo um handshake TLS campo por
campo, distinguindo `drop` de `reject` na captura, medindo MTU de caminho, e diagnosticando
perda com `mtr`.

O que você aprendeu não foi uma lista de comandos. Foi **um modelo mental** — que um pacote é
camadas embrulhadas, que cada camada confia na de baixo, e que **é exatamente essa confiança que
cria tanto a possibilidade de ataque quanto a possibilidade de defesa**.

A última coisa, e a mais importante: **você agora sabe olhar dentro do tráfego das pessoas.** Um
`.pcap` de dez minutos contém senhas, sessões, conversas, dados pessoais. Esse poder tem uso
legítimo — depurar, defender, auditar — e tem uso criminoso. O que separa um do outro é
**autorização escrita, escopo definido e política de descarte de dados**, sempre, antes de
capturar.

Referências para continuar:
**RFC 791** (IPv4) · **RFC 9293** (TCP) · **RFC 1034/1035** (DNS) · **RFC 8446** (TLS 1.3) ·
**Wireshark Display Filter Reference** · **pcap-filter man page** · **NIST SP 800-115** ·
**"Beej's Guide to Network Programming"** · **MITRE ATT&CK** (T1046, T1040, T1557)
