# Módulo 3 — IP: Endereçamento, Roteamento e ICMP

**Carga:** 3 horas (1h15 teoria · 1h45 lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Ler um header IPv4 campo por campo, em hexadecimal.
2. Fazer subnetting corretamente, incluindo divisão em sub-redes menores.
3. Explicar roteamento: tabela de rotas, longest prefix match, gateway.
4. Entender TTL e por que ele existe.
5. Distinguir os tipos de ICMP e o que cada um significa em diagnóstico.
6. Ler um header IPv6 e explicar as diferenças que importam.

---

## ⚠ Ética

Este módulo usa `ping` e `traceroute` — ferramentas de diagnóstico. Usar `ping` em host de
terceiro é geralmente aceito; usar **varredura sistemática** não é. E existe uma diferença
técnica entre as duas:

- `ping 8.8.8.8` — uma consulta. Aceitável.
- `nmap -sn 8.8.8.0/24` — varredura de 254 hosts. **Não aceitável sem autorização.**

⚠ **A regra do curso:** você varre `10.10.10.0/24`, criada por você. Aprender que `nmap` existe
é diferente de usar `nmap` contra alvo que não é seu.

---

## 3.1 O header IPv4

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
┌───────┬───────┬───────────────┬─────────────────────────────────┐
│ Versão│  IHL  │      TOS      │          Tamanho total          │
├───────┴───────┼───────────────┼─────────────────────────────────┤
│         Identificação         │ Flags │    Fragment Offset      │
├───────────────┼───────────────┼─────────────────────────────────┤
│      TTL      │   Protocolo   │      Checksum do header         │
├───────────────┴───────────────┴─────────────────────────────────┤
│                     Endereço IP de origem (32 bits)             │
├─────────────────────────────────────────────────────────────────┤
│                     Endereço IP de destino (32 bits)            │
└─────────────────────────────────────────────────────────────────┘
```

**20 bytes no caso mínimo.** Vamos campo por campo, com o que importa para análise:

| Campo | Bits | O que faz | Por que te interessa |
|---|---|---|---|
| **Versão** | 4 | `4` para IPv4 | Primeiro nibble. Sempre `4` em captura IPv4 |
| **IHL** | 4 | Tamanho do header em **palavras de 4 bytes** | Se for `5` → 20 bytes. Se `6` → 24 (tem opções) |
| **TOS / DSCP** | 8 | Prioridade e tipo de serviço | Usado em QoS. `0x00` = padrão |
| **Tamanho total** | 16 | Tamanho do pacote em bytes | Máx 65535. Raro chegar perto |
| **Identificação** | 16 | Identificador de fragmento | **Todos os fragmentos do mesmo pacote têm o mesmo ID** |
| **Flags** | 3 | DF (don't fragment), MF (more fragments) | **DF=1 e MTU pequena = pacote descartado** |
| **Fragment Offset** | 13 | Posição do fragmento | Acima de 0 → é fragmento |
| **TTL** | 8 | Salto máximo | **Decresce a cada roteador. TTL 0 = descartado** |
| **Protocolo** | 8 | O que vem dentro | `6`=TCP, `17`=UDP, `1`=ICMP |
| **Checksum** | 16 | Verifica o header | Só do header, não do payload |
| **IP origem** | 32 | — | — |
| **IP destino** | 32 | — | — |

### Os três campos que você mais olha

**TTL** — cada roteador subtrai 1. Quando chega a 0, o roteador descarta e manda um ICMP
"time exceeded" de volta. Existe para impedir pacote girando eternamente numa rota com laço.

Você pode estimar quantos saltos um pacote percorreu: o TTL típico inicial é **64** (Linux),
**128** (Windows), **255** (alguns equipamentos de rede). Se você vê TTL 57, o pacote passou
por 7 roteadores.

⚠ **O TTL é mais útil do que parece em análise de incidente.** Diferenças de TTL entre pacotes
aparentemente iguais sugerem caminhos diferentes, ou origem falsificada (spoofing). Mas atenção:
o atacante escolhe o TTL, então TTL sozinho não prova nada — apenas levanta suspeita.

**IHL** — `5` significa 20 bytes (sem opções). Qualquer valor maior significa opções presentes,
e **aí os offsets mudam** — o header TCP não estará em offset 34 (14+20) do quadro, e sim mais
adiante. Este é o erro de leitura de hexdump mais comum.

**Flags de fragmentação** — `DF=1` (don't fragment) é o que causa o problema clássico de MTU:

```
Pacote grande, DF=1, MTU do caminho menor
    → roteador não pode fragmentar
    → roteador descarta e manda ICMP "fragmentation needed" com a MTU correta
    → se o ICMP for bloqueado por firewall, o emissor NUNCA descobre
    → conexão trava, sem erro claro
```

⚠ **Isso é o famoso "black hole de MTU"**, e explica por que VPN e túnel quebram em rede
corporativa. Você vai diagnosticar isso com captura no Módulo 4.

---

## 3.2 Subnetting sem decoreba

Subnetting não é magia. É aritmética binária, e você já tem a base do Módulo 1.

### O método de três passos

Para qualquer `A.B.C.D/P`:

1. **Quantos bits de host?** `32 - P`.
2. **Qual o tamanho do bloco?** `2^(bits de host)`.
3. **Em qual bloco o endereço cai?** Calcule o múltiplo.

**Exemplo: `10.10.10.200/26`**

```
Passo 1: 32 - 26 = 6 bits de host
Passo 2: 2^6 = 64 endereços por bloco
Passo 3: 200 / 64 = 3.125 → bloco 3 → começa em 3*64 = 192
         Rede:      10.10.10.192
         Primeiro:  10.10.10.193
         Último:    10.10.10.254
         Broadcast: 10.10.10.255
```

**Exemplo: `192.168.5.130/25`**

```
1: 32 - 25 = 7 bits → 128 endereços
2: 130 / 128 = 1.01 → bloco 1 → começa em 128
3: Rede 192.168.5.128 · Último host 192.168.5.254 · Broadcast 192.168.5.255
```

### Dividindo uma rede em sub-redes

Você tem `10.10.10.0/24` e precisa de quatro sub-redes iguais:

```
/24 → /26: você "toma emprestado" 2 bits (26 - 24 = 2)
  2^2 = 4 sub-redes
  Cada sub-rede: 2^6 = 64 endereços, 62 hosts utilizáveis

10.10.10.0/26    10.10.10.0    – 10.10.10.63     (broadcast .63)
10.10.10.64/26   10.10.10.64   – 10.10.10.127    (broadcast .127)
10.10.10.128/26  10.10.10.128  – 10.10.10.191    (broadcast .191)
10.10.10.192/26  10.10.10.192  – 10.10.10.255    (broadcast .255)
```

**A regra:** cada bit tomado emprestado **dobra** o número de sub-redes e **divide por dois** o
número de hosts.

### Tabela de consulta rápida

| Bits de host | Tamanho do bloco | Hosts utilizáveis |
|---|---|---|
| 1 | 2 | 0 (só em /31) |
| 2 | 4 | 2 |
| 3 | 8 | 6 |
| 4 | 16 | 14 |
| 5 | 32 | 30 |
| 6 | 64 | 62 |
| 7 | 128 | 126 |
| 8 | 256 | 254 |

### Checando com ferramentas

```bash
# Python
python3 -c "
import ipaddress
for c in ['10.10.10.0/24','10.10.10.0/26','192.168.5.130/25']:
    n = ipaddress.ip_network(c, strict=False)
    print(f'{c:20} {n.network_address} – {n.broadcast_address}  hosts={n.num_addresses-2}')
"

# ipcalc, se instalado
ipcalc 10.10.10.200/26

# iproute2, na própria interface
ip -4 addr show eth0
```

---

## 3.3 Roteamento: como o pacote escolhe o caminho

O kernel consulta a **tabela de rotas** para decidir para onde mandar. A regra é
**longest prefix match**: vence a rota mais específica (maior prefixo), não a primeira
encontrada.

```bash
ip route show
# default via 10.10.10.1 dev eth0 proto static metric 100
# 10.10.10.0/24 dev eth0 proto kernel scope link src 10.10.10.30
# 172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown
# 10.10.20.0/24 via 10.10.10.1 dev eth0 proto static metric 100
```

**Para `10.10.10.50`** → casa `10.10.10.0/24` (`/24`), direto pela `eth0`. Não passa pelo gateway.

**Para `10.10.20.50`** → casa `10.10.20.0/24` (`/24`), via gateway `10.10.10.1`.

**Para `8.8.8.8`** → não casa nenhuma específica → casa `default` (`/0`), via gateway.

**Para `10.10.10.5` e `10.10.99.5`:** se houvesse uma rota `/16` para `10.10.0.0` e uma `/24`
para `10.10.10.0`, o pacote para `10.10.10.5` usaria a `/24` — **prefixo mais longo vence**,
independente da ordem na tabela.

### O que a tabela diz em cada campo

| Campo | Significado |
|---|---|
| `default` | Rota `/0` — casa tudo que nada mais casou |
| `via X` | Gateway: endereço do próximo salto |
| `dev eth0` | Interface de saída |
| `proto kernel` | Criada automaticamente pelo kernel |
| `proto static` | Adicionada manualmente ou por config |
| `scope link` | Destino é alcançável diretamente, sem roteador |
| `src X` | IP de origem preferido para essa rota |
| `metric N` | Desempate quando há duas rotas do mesmo prefixo |

### Adicionando e removendo rotas

```bash
# Rota estática para uma sub-rede via gateway
sudo ip route add 10.10.30.0/24 via 10.10.10.1

# Verificar
ip route get 10.10.30.5     # ← o comando mais útil de roteamento no Linux
# 10.10.30.5 via 10.10.10.1 dev eth0 src 10.10.10.30 uid 1000

# Remover
sudo ip route del 10.10.30.0/24
```

N N **`ip route get <destino>` responde exatamente "por onde este pacote vai sair"**, contando
com a decisão de longest prefix match. É o comando que você usa quando alguém diz "não chega" e
você quer saber se é roteamento ou firewall. Decore.

### Tabelas de roteamento múltiplas

O Linux suporta policy routing — decidir rota por origem, marca, interface:

```bash
ip rule show
# 0:      from all lookup local
# 32766:  from all lookup main
# 32767:  from all lookup default

ip route show table all | head -20
```

Isso importa para entender ambientes com VPN, containers e múltiplas interfaces. Um pacote pode
sair pela `eth0` ou pela `tun0` dependendo da **regra**, antes mesmo da tabela.

---

## 3.4 ICMP — o protocolo de diagnóstico

ICMP (RFC 792) é o sistema de avisos e erros da camada de rede. Não carrega dado de aplicação;
carrega informação sobre o que aconteceu com os pacotes.

### Tipos que importam

| Tipo | Nome | Quando aparece |
|---|---|---|
| **0** | Echo Reply | Resposta ao `ping` |
| **3** | Destination Unreachable | Não foi possível entregar |
| **5** | Redirect | Rota melhor (raramente usado, frequentemente desabilitado) |
| **8** | Echo Request | O `ping` em si |
| **11** | Time Exceeded | TTL chegou a 0 — **base do traceroute** |
| **12** | Parameter Problem | Header malformado |

### Subtipos de tipo 3 — é aqui que o diagnóstico vive

| Código | Significado | O que você conclui |
|---|---|---|
| **0** | Network unreachable | Sem rota para essa rede |
| **1** | Host unreachable | Rede conhecida, host não |
| **2** | Protocol unreachable | Protocolo não suportado |
| **3** | **Port unreachable** | **Porta fechada — cheguei no host!** |
| **4** | Fragmentation needed (DF set) | **MTU do caminho é menor — o famoso black hole** |
| **9/10/13** | Administratively prohibited | Firewall bloqueou |

⚠ **Os subtipos 3 e 4 são os dois mais importantes em diagnóstico real:**

- **Port unreachable** diz que você **chegou no host** — o pacote atravessou toda a rede e o
  host respondeu. Se sua conexão falha, o problema não é roteamento.
- **Fragmentation needed** traz a MTU correta no campo. Se você vê isso na captura, achou o
  problema de MTU.

### Captura de um ping

```bash
sudo tcpdump -i eth0 -nn -v 'icmp'
```

```
14:30:01.123456 IP 10.10.10.20 > 10.10.10.10: ICMP echo request, id 1234, seq 1, length 64
14:30:01.124001 IP 10.10.10.10 > 10.10.10.20: ICMP echo reply, id 1234, seq 1, length 64
```

O `id` correlaciona request e reply — todos os pings do mesmo processo compartilham id. O `seq`
incrementa a cada pacote.

### Captura de um "unreachable"

```bash
ping -c 1 10.10.10.99    # host que não existe
sudo tcpdump -nn -v 'icmp'
```

```
IP 10.10.10.20 > 10.10.10.99: ICMP echo request
IP 10.10.10.30 > 10.10.10.20: ICMP 10.10.10.99 unreachable - host unreachable
```

**Leia com atenção:** a resposta vem do **`.30`**, não do `.99`. Foi um roteador intermediário
que respondeu "não sei chegar lá". Isso é a prova de que o problema é de roteamento, não de
host desligado — e é uma distinção que confunde muita gente.

### ICMP é frequentemente bloqueado — e isso importa

Firewalls costumam bloquear ICMP inteiro porque "é usado em ataque". Consequência:

- `ping` não funciona → você conclui erroneamente "host está fora".
- ICMP "fragmentation needed" bloqueado → **black hole de MTU**, conexão travando sem erro.
- `traceroute` mostra `* * *` → você não sabe se é bloqueio ou host inexistente.

**Regra prática:** ICMP bloqueado **não** significa host indisponível. Sempre confirme com outro
método (porta aberta, resposta TCP).

```bash
# Teste de disponibilidade sem ICMP
timeout 3 bash -c 'cat < /dev/tcp/10.10.10.10/22' && echo "SSH alcançável"
```

---

## 3.5 IPv6 — o que muda

IPv6 (RFC 8200) não é "IPv4 com mais bits". O header é diferente e algumas regras fundamentais
mudam.

### Header fixo de 40 bytes

```
┌───────────────┬───────────────────┬───────────────────────────────┐
│ Versão (4b)   │ Traffic Class (8b)│ Flow Label (20b)              │
├───────────────┼───────────────────┼───────────────────────────────┤
│ Payload Length (16b)              │ Next Header (8b) │ Hop Limit (8b)│
├───────────────┴───────────────────┴───────────────────────────────┤
│                    Endereço de origem (128 bits)                  │
├───────────────────────────────────────────────────────────────────┤
│                    Endereço de destino (128 bits)                 │
└───────────────────────────────────────────────────────────────────┘
```

### Diffs que importam

| IPv4 | IPv6 | Consequência |
|---|---|---|
| Header de 20 B, variável | Header fixo de 40 B | Mais simples de processar; opções em headers de extensão |
| TTL | **Hop Limit** | Mesmo conceito, nome novo |
| Protocolo | **Next Header** | Mesmo papel |
| Checksum no header | **Não tem** | Camadas de baixo já verificam. Menos trabalho por pacote |
| Fragmentação pelo roteador | **Só pela origem** | Roteador não fragmenta. PMTUD é obrigatório |
| ARP | **NDP (Neighbor Discovery)** | Usa ICMPv6, não um protocolo separado |
| Broadcast | **Não existe** | Só unicast e multicast |

### Endereço IPv6 e a notação

```
2001:0db8:0000:0000:0000:ff00:0042:8329
```

**Regras de abreviação (que você precisa para ler captura):**

1. Zeros à esquerda de cada grupo podem sumir: `0db8` → `db8`.
2. **Um** grupo de zeros consecutivos pode virar `::` — e só um.
3. O resultado acima: `2001:db8::ff00:42:8329`

### Prefixos que você vai encontrar

| Prefixo | Tipo | Onde |
|---|---|---|
| `::1/128` | Loopback | Equivalente ao `127.0.0.1` |
| `fe80::/10` | Link-local | **Toda interface tem uma — e é por ela que NDP funciona** |
| `fc00::/7` | Unique local | Equivalente a faixa privada |
| `2000::/3` | Global unicast | Internet |
| `ff00::/8` | Multicast | — |

⚠ **Um endereço `fe80::` aparece em toda interface IPv6, sempre.** Não confunda com endereço
roteável. E note que um pacote para um link-local precisa do escopo: `fe80::1%eth0`.

```bash
ip -6 addr show
ip -6 route show
ip -6 neigh show          # NDP, o "ARP" do IPv6
```

### NDP em uma frase

IPv6 não usa ARP. Usa **Neighbor Discovery Protocol**, que roda sobre ICMPv6, com mensagens
`Neighbor Solicitation` e `Neighbor Advertisement` — conceitualmente equivalentes a
request/reply, mas em multicast (não broadcast, que não existe).

**E o problema é o mesmo:** NDP também não tem autenticação por padrão. O ataque ARP poisoning
tem primo direto em IPv6: NDP spoofing. A defesa se chama **RA Guard** e **SEND**.

---

## 3.6 LAB — Subnetting, roteamento e ICMP

**Duração:** 105 min
**Objetivo:** dominar a aritmética de sub-rede e o diagnóstico com ICMP.

### Parte A — Subnetting à mão (30 min)

Preencha **sem calculadora**, depois confirme com Python:

| CIDR | Rede | Broadcast | 1º host | Último host | Nº hosts |
|---|---|---|---|---|---|
| `10.10.10.0/24` | | | | | |
| `10.10.10.0/26` | | | | | |
| `10.10.10.200/27` | | | | | |
| `192.168.100.50/22` | | | | | |
| `172.16.0.0/12` (só rede e máscara) | | | | | |
| `10.10.10.5/30` | | | | | |
| `10.10.10.5/31` | | | | | |

```bash
python3 - <<'EOF'
import ipaddress
for c in ["10.10.10.0/24","10.10.10.0/26","10.10.10.200/27",
          "192.168.100.50/22","172.16.0.0/12","10.10.10.5/30","10.10.10.5/31"]:
    n = ipaddress.ip_network(c, strict=False)
    hosts = list(n.hosts())
    if hosts:
        print(f"{c:20} rede={n.network_address:<15} bcast={n.broadcast_address:<15} "
              f"1º={hosts[0]:<15} ult={hosts[-1]:<15} n={len(hosts)}")
    else:
        print(f"{c:20} rede={n.network_address:<15} bcast={n.broadcast_address:<15} "
              f"sem hosts (RFC 3021)")
EOF
```

**Caso especial — `/31`:** pela RFC 3021, as duas pontas de um link ponto a ponto usam os dois
endereços, sem rede/broadcast reservados. É exatamente para isso que ele existe.

### Parte B — Divida a rede do laboratório (25 min)

Você tem `10.10.10.0/24`. Produza em `subredes.md` uma divisão que acomode:

| Segmento | Hosts necessários | CIDR proposto |
|---|---|---|
| Servidores | 20 | ? |
| Clientes | 50 | ? |
| Gerência | 5 | ? |
| Links ponto a ponto (2×) | 2 cada | ? |
| Reserva | — | o que sobrar |

Calcule **quanto endereço sobra** depois da divisão. Responda: **vale a pena dividir assim, ou
você usaria prefixos maiores?**

### Parte C — Roteamento observado (25 min)

```bash
ip route show
ip route get 10.10.10.10
ip route get 192.168.1.1     # provavelmente via default
ip route get 127.0.0.1
ip route get 224.0.0.1
```

Responda em `rotas.md`:

1. Para cada destino, qual interface e qual gateway (ou "direto")?
2. Por que `ip route get 10.10.10.10` diz `src 10.10.10.30`? De onde o kernel tirou esse valor?
3. Se você adicionar `ip route add 10.10.10.10/32 via 10.10.10.99`, para onde vai o tráfego
   para `10.10.10.10`? Por quê? (Longest prefix match.)
4. Remova a rota com `ip route del`. Confirme que voltou ao normal.

### Parte D — ICMP em captura (25 min)

```bash
# Terminal 1
sudo tcpdump -i eth0 -nn -v -XX 'icmp'

# Terminal 2 — quatro testes, um de cada vez
ping -c 2 10.10.10.10                       # alcançável
ping -c 2 10.10.10.99                       # provavelmente unreachable
ping -M do -s 1473 10.10.10.10              # MTU excedida
traceroute -n 10.10.10.10                   # observe TTL excedido
```

Produza `icmp.md` com, para cada teste:

- Que tipo e subtipo de ICMP apareceram?
- Quem respondeu — o destino ou um intermediário?
- O que o `length` mostrou?
- Se `traceroute` funcionou, quantos saltos? Qual TTL inicial?

⚠ **Se você não tem um alvo que responde ICMP, use `127.0.0.1` e a própria máquina.** O objetivo
é ler o ICMP, não o alvo.

### Critérios de aceitação

- A tabela de subnetting está preenchida à mão, com seus erros anotados.
- `subredes.md` tem a divisão completa com o espaço restante calculado.
- `rotas.md` responde as quatro perguntas, com a saída dos comandos anexada.
- `icmp.md` documenta os quatro testes com tipo, subtipo e a captura correspondente.
- Você identificou o caso `fragmentation needed` (subtipo 4) e explicou o que ele resolve.
- Você explicou por que a resposta do `unreachable` vem do roteador e não do destino.

---

## Avaliação

1. Desenhe o header IPv4 com os campos e tamanhos. Qual campo diz onde o header TCP começa?
2. Se o IHL é 6, quantos bytes tem o header IP? Onde começa o TCP nesse caso?
3. O que é TTL e por que existe? Um pacote chega com TTL 58 — quantos saltos ele percorreu?
4. Calcule: rede, broadcast e hosts de `10.10.10.200/27`. Mostre o raciocínio.
5. Você tem `10.10.20.0/23`. Quantos hosts utilizáveis? Como se escreve a máscara?
6. Explique longest prefix match com um exemplo que tenha três rotas candidatas.
7. O que `ip route get` responde que `ip route show` não responde?
8. Qual a diferença prática entre ICMP tipo 3 subtipo 1 e subtipo 3? O que você conclui de cada um?
9. Por que bloquear ICMP pode quebrar conexões TCP que não têm nada a ver com `ping`?
10. O que é "black hole de MTU" e como o ICMP tipo 3 subtipo 4 o previne?
11. Um `traceroute` mostra `* * *` em três saltos consecutivos e depois volta a responder. Que
    hipóteses você levanta?
12. Cite quatro diferenças do IPv6 em relação ao IPv4 que mudam diagnóstico.
13. Por que IPv6 não tem broadcast? O que substitui o ARP?

---

**Próximo:** [Módulo 4 — TCP a fundo](modulo-04.md)
