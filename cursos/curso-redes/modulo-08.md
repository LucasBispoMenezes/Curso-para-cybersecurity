# Módulo 8 — `traceroute` e o Mapeamento de Caminho

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Explicar como o TTL faz o `traceroute` funcionar, mecanismo por mecanismo.
2. Comparar `traceroute` sobre ICMP, UDP e TCP, e saber quando cada um serve.
3. Ler a saída e distinguir latência real de problema de caminho.
4. Reconhecer o que o `traceroute` **esconde** — e não tirar conclusão errada.
5. Usar `mtr` para diagnóstico contínuo e `paris-traceroute` para caminho estável.

---

## ⚠ Ética

`traceroute` é uma ferramenta de diagnóstico que **gera tráfego em cada salto do caminho**.
Usar contra um destino de terceiro é geralmente aceito; usar em **varredura sistemática de
faixas** para mapear a infraestrutura de alguém é reconhecimento, e é o tipo de atividade que
exige autorização.

⚠ **A regra do curso:** `traceroute` no laboratório e contra destinos públicos de forma
pontual (como um resolvedor DNS público) para aprender a ler a saída. Nunca varredura de faixa
para mapear quem é quem.

---

## 8.1 O mecanismo: TTL como sonda

O `traceroute` não tem acesso a nenhuma informação privilegiada. Ele usa uma **propriedade do
IP** de forma engenhosa.

### O TTL, relembrado

Todo pacote IP tem um campo TTL. Cada roteador no caminho **subtrai 1**. Se chega a 0, o
roteador **descarta o pacote** e manda de volta um ICMP `Time Exceeded` (tipo 11).

### A ideia do traceroute

```
Sonda 1: TTL=1
   → primeiro roteador subtrai 1 → vira 0
   → primeiro roteador descarta e responde "Time Exceeded"
   → eu sei quem é o salto 1!

Sonda 2: TTL=2
   → primeiro roteador subtrai → 1, repassa
   → segundo roteador subtrai → 0, descarta e responde
   → eu sei quem é o salto 2!

Sonda 3: TTL=3
   → ... e assim por diante, até chegar no destino
```

**Cada sonda revela um salto.** E o tempo entre o envio e a resposta do ICMP é a latência
aproximada daquele trecho.

```
traceroute          Sonda 1 (TTL=1) ───▶ [R1] ──ICMP time exceeded──▶ eu
                    Sonda 2 (TTL=2) ───▶ [R1] ──▶ [R2] ──ICMP──▶ eu
                    Sonda 3 (TTL=3) ───▶ [R1] ──▶ [R2] ──▶ [R3] ──ICMP──▶ eu
                                                                        ...
                    Sonda N: chega no destino
```

### Três sabores de sonda

O `traceroute` original (Van Jacobson) usa **UDP para porta alta**. Isso explora outro
comportamento: se a porta estiver fechada no destino, ele responde `Port Unreachable` (ICMP
tipo 3, subtipo 3) — que é o sinal de "cheguei".

| Variante | Sonda | Sinal de chegada | Quando usar |
|---|---|---|---|
| **UDP** (padrão do Linux) | UDP porta 33434+ | ICMP port unreachable | Padrão |
| **ICMP** (`-I`) | ICMP echo request | ICMP echo reply | Quando UDP é bloqueado — **precisa de root** |
| **TCP** (`-T`) | TCP SYN para porta específica | SYN-ACK ou RST | **Atravessa firewall que só permite 80/443** |
| **TCP com handshake** (`-T -p 443`) | SYN + ACK | Conexão estabelecida | Testar caminho real de uma porta |

⚠ **TCP traceroute é o que funciona em rede corporativa.** Firewall de borda costuma bloquear
UDP e ICMP, mas **precisa** deixar passar 443. Então:

```bash
sudo traceroute -T -p 443 10.10.10.10        # tracejando o mesmo caminho do HTTPS real
sudo traceroute -T -p 80 10.10.10.10
```

Se o UDP traceroute mostra `* * *` e o TCP na 443 mostra o caminho, você tem sua resposta:
**o caminho existe, o que está bloqueado é o UDP.**

---

## 8.2 Lendo a saída

```
$ traceroute -n 10.10.10.10
traceroute to 10.10.10.10 (10.10.10.10), 30 hops max, 60 byte packets
 1  10.10.10.1      0.312 ms  0.287 ms  0.265 ms
 2  192.168.1.1     2.145 ms  2.098 ms  2.201 ms
 3  * * *
 4  * * *
 5  10.10.10.10     14.523 ms  14.601 ms  14.489 ms
```

### Cada parte da linha

| Trecho | Significado |
|---|---|
| `1` | Número do salto (o TTL usado) |
| `10.10.10.1` | Endereço do roteador que respondeu |
| `0.312 ms 0.287 ms 0.265 ms` | **Três sondas**, três medições |
| `* * *` | Nenhuma resposta em nenhuma das três |

N N **Três timings por salto não são redundância decorativa.** O `traceroute` manda três sondas
por TTL justamente porque **roteamento é instável e balanceamento de carga existe**. Variação
grande entre as três é informação, não ruído.

### O que `* * *` significa — e as quatro hipóteses

`* * *` **não** significa "não existe". Significa "neste salto, ninguém me respondeu".

| Hipótese | Como distinguir |
|---|---|
| **O roteador não responde ICMP** | Se saltos 3 e 4 são `*` e o 5 responde, o caminho **funciona** — os roteadores só não geram ICMP. Comum e normal. |
| **Firewall bloqueia ICMP de volta** | Se **todos** os saltos após um ponto são `*`, é bloqueio no caminho |
| **O salto descarta a sonda por política** | Rate limiting de ICMP; resolve-se com `-q` mais e `-w` maior |
| **Timeout curto demais** | Aumente com `-w 3` e tente de novo |

```bash
# Tenta mais vezes, com timeout maior e sem resolução de nome
traceroute -n -q 5 -w 3 10.10.10.10

# Tenta pelo caminho do TCP/443 (atravessa firewall)
sudo traceroute -T -p 443 -n 10.10.10.10
```

⚠ **A conclusão correta, quando você vê `* * *` no meio e resposta depois:** o caminho está
funcionando. Os roteadores marcados com `*` simplesmente **não geram ICMP** — política padrão em
muitas operadoras, por medo de abuso. Você não achou um problema; achou uma configuração.

**A conclusão errada**, e é muito comum: "há um problema no salto 3". Não há. O salto 3 só não
quis falar.

---

## 8.3 O que o traceroute mede — e o que ele engana

### A latência é do caminho de VOLTA

Aqui está o detalhe que quase ninguém sabe, e que muda a interpretação por completo:

**O tempo medido é o tempo do pacote ir até o salto N e do ICMP voltar até você.**

Ou seja: é a latência do **caminho de ida até o salto + o caminho de volta do salto até você.**
Se a rota de volta for diferente da rota de ida — e frequentemente é — o número não representa a
latência daquele trecho de ida.

**Consequência prática:** um salto com latência alta pode estar sofrendo com o caminho de volta
ruim, não com o trecho de ida. E um salto com latência aparentemente alta seguido de saltos com
latência baixa **não é problema nenhum** — veja a próxima seção.

### O mito do salto ruim

```
 4  10.0.0.5      150.234 ms  150.112 ms  150.401 ms
 5  10.0.0.6      12.011 ms   12.098 ms   12.201 ms
```

**Este é o padrão clássico do "salto ruim que não é ruim".** O salto 4 mostra 150 ms e o salto
5 mostra 12 ms. Como o 5 é mais distante e é mais rápido?

**Explicação:** roteadores dão **prioridade baixa** ao processamento de ICMP. Responder sonda de
traceroute é trabalho de baixa prioridade, feito quando a CPU do roteador não está ocupada com
encaminhamento de verdade. Se o roteador está sob carga, ele responde devagar — **mas o pacote
de dado passa por ele rápido**.

**A regra de ouro para diagnóstico de caminho:**

> A latência que importa é **a do destino final**. Latência alta em salto intermediário,
> seguida de latência baixa depois, não indica problema.

Para avaliar um salto intermediário, **compare a latência dele com a do destino**. Se o destino
tem 12 ms e o salto intermediário tem 150 ms, o salto intermediário não está adicionando nada.

```bash
# Comparação direta
for hop in 10.0.0.5 10.0.0.6 10.10.10.10; do
    printf '%-15s ' "$hop"
    ping -c 5 -q "$hop" 2>/dev/null | tail -1
done
```

### Latência assimétrica e rota assimétrica

A internet **não é simétrica**. O caminho A→B raramente é o mesmo de B→A. Consequências:

- `traceroute` de A para B mostra um caminho; de B para A, outro.
- Lentidão pode estar só na volta.
- O `traceroute` que você roda mostra ida + volta **daquele salto**, misturando os dois.

**Sempre faça `traceroute` nos dois sentidos** quando estiver depurando problema de latência.

### Balanceamento de carga: o mesmo salto, IPs diferentes

```
 5  10.0.0.10    12.001 ms
 5  10.0.0.11    12.102 ms
 5  10.0.0.12    11.998 ms
```

**O mesmo número de salto com três IPs diferentes.** O roteador tem várias interfaces, OU há
balanceamento de carga que manda cada sonda por um caminho diferente.

Isso significa que **a lista de saltos que você vê pode não corresponder a nenhum caminho real
único**. Você está vendo um mosaico.

---

## 8.4 `mtr` — o traceroute que continua rodando

`mtr` (My Traceroute) combina `traceroute` e `ping`: ele roda continuamente e atualiza as
estatísticas de cada salto.

```bash
sudo mtr -n 10.10.10.10                    # modo interativo (TUI)
sudo mtr -n -r -c 100 10.10.10.10          # relatório depois de 100 ciclos
sudo mtr -n -r -c 100 -w 10.10.10.10       # modo "wide" (não corta colunas)
sudo mtr -T -P 443 -n -r -c 50 10.10.10.10 # TCP/443
```

```
Start: 2026-10-18T14:00:00+0000
HOST: cliente                   Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 10.10.10.1               0.0%   100    0.3   0.3   0.2   1.1   0.1
  2.|-- 192.168.1.1              0.0%   100    2.1   2.2   1.9   8.4   0.6
  3.|-- ???                    100.0%   100    0.0   0.0   0.0   0.0   0.0
  4.|-- 200.1.2.3               12.0%   100   14.5  14.8  13.9  42.1   4.2
  5.|-- 10.10.10.10              0.0%   100   15.0  15.1  14.6  20.3   0.8
```

### As colunas que importam

| Coluna | O que é | Como ler |
|---|---|---|
| `Loss%` | Perda de pacote naquele salto | **Atenção:** perda em salto intermediário que desaparece no destino **não é perda real** |
| `Snt` | Sondas enviadas | Base para a porcentagem |
| `Last` | Última medição | — |
| `Avg` | Média | A que você cita em relatório |
| `Best` / `Wrst` | Melhor e pior | Diferença grande = instabilidade |
| `StDev` | Desvio padrão | **Alto = jitter — o sintoma de rede ruim** |

⚠ **O mesmo mito do `traceroute` se aplica, com mais força.** Olhe o `Loss%` da linha 3: 100%.
E a linha 5 mostra 0%. **Se houvesse perda real no salto 3, o destino final teria perda também.**
O que aconteceu é que o salto 3 não responde sonda nenhuma (política), e o `mtr` conta isso como
100% de perda.

**A regra:** **perda só conta se persistir até o destino final.** Perda em salto intermediário
que desaparece depois é artefato de ICMP rate limiting, não problema de rede.

```bash
# O teste correto: perder pacote no destino?
sudo mtr -n -r -c 200 10.10.10.10 | tail -3
ping -c 200 -q 10.10.10.10 | tail -2
```

### Quando usar `mtr` em vez de `traceroute`

| Situação | Ferramenta |
|---|---|
| Ver o caminho uma vez | `traceroute` |
| Medir perda e jitter por salto | **`mtr`** |
| Diagnosticar problema intermitente | **`mtr`** rodando por minutos/horas |
| Comparar antes e depois de uma mudança | `mtr -r -c 100` salvo em arquivo, duas vezes |
| Apresentar para não-técnico | `mtr -r --report-wide` |

**Para problema intermitente, `mtr` é a resposta.** `traceroute` é uma foto; `mtr` é um filme.

---

## 8.5 O que o traceroute esconde

Ferramenta poderosa com pontos cegos. Conhecer os pontos cegos é o que separa quem usa de quem
**entende** o que está usando.

### 1. Ele mostra só um caminho, num momento

```
traceroute às 14:00 → caminho A
traceroute às 14:05 → caminho B (roteamento mudou)
```

ECMP, failover, mudança de política — tudo isso faz o caminho mudar. **Um `traceroute` é uma
amostra, não a topologia.**

### 2. Nada nos túneis

VPN, túneis GRE, MPLS, IPsec: dentro de um túnel, o `traceroute` mostra
**o túnel como um salto só**. Os 8 roteadores dentro dele são invisíveis.

```
 1  10.10.10.1        0.3 ms
 2  203.0.113.1      24.5 ms      ← o túnel inteiro aparece como um salto
 3  10.10.10.10      25.1 ms
```

### 3. Latência do caminho de volta, não da ida

Já discutido — mas é o erro de interpretação mais comum.

### 4. Só um protocolo

Se você traceja com UDP e o problema é com TCP, você mediu o caminho errado. Firewall trata
protocolo diferente de forma diferente.

### 5. Nada sobre a capacidade do link

`traceroute` mede latência, não banda. Um caminho com 10 ms e 1 Mbps é péssimo — e o
`traceroute` não vai dizer.

### 6. Nada dentro da sua própria rede

O primeiro salto é o gateway. Se o problema está **antes** dele — na sua LAN, no switch, na sua
interface — o `traceroute` não mostra, porque começa depois.

```bash
# A rede local se diagnostica assim:
ip -s link show eth0        # erros, drops na interface
ethtool eth0 | grep -E 'Speed|Duplex'
ss -s                       # resumo de sockets
```

### 7. Roteadores que não respondem não desaparecem

Um salto `* * *` **participou do caminho**. Ele encaminha o pacote — só não quer responder sonda.
Tratar `*` como "nada ali" é errado.

---

## 8.6 `paris-traceroute` e caminhos estáveis

Ferramenta de pesquisa que resolve dois problemas do `traceroute` clássico:

1. **Caminho inconsistente** — o clássico pode mostrar caminhos que não existem, por causa de
   balanceamento. O Paris-Traceroute usa parâmetros de fluxo fixos para forçar o mesmo caminho.
2. **Sem suporte a TCP com controle** — melhora no rastreio pelo caminho real de uma sessão TCP.

```bash
sudo apt install paris-traceroute
sudo paris-traceroute -n 10.10.10.10
```

Útil quando o `traceroute` mostra um mosaico sem sentido e você precisa de um caminho coerente.

---

## 8.7 LAB — Mapeando e interpretando caminhos

**Duração:** 75 min
**Objetivo:** comparar os três tipos de traceroute, provocar o "salto ruim que não é ruim", e
medir perda com `mtr`.

### Parte A — Os três sabores (25 min)

```bash
mkdir -p ~/redes-lab/lab8 && cd ~/redes-lab/lab8

# Rede do laboratório + um destino público pontual (uma consulta, não varredura)
TARGET_LAB=10.10.10.10
TARGET_PUB=1.1.1.1

# UDP (padrão)
traceroute -n -w 2 -q 3 "$TARGET_LAB"  > saida-udp.txt 2>&1
traceroute -n -w 2 -q 3 "$TARGET_PUB"  >> saida-udp.txt 2>&1

# ICMP
sudo traceroute -n -I -w 2 -q 3 "$TARGET_LAB" > saida-icmp.txt 2>&1
sudo traceroute -n -I -w 2 -q 3 "$TARGET_PUB" >> saida-icmp.txt 2>&1

# TCP para 443
sudo traceroute -n -T -p 443 -w 2 -q 3 "$TARGET_LAB" > saida-tcp443.txt 2>&1
sudo traceroute -n -T -p 443 -w 2 -q 3 "$TARGET_PUB" >> saida-tcp443.txt 2>&1

cat saida-udp.txt saida-icmp.txt saida-tcp443.txt
```

**Capture enquanto traceja:**

```bash
sudo tcpdump -i eth0 -nn -v 'icmp or (udp and greater 40)' -c 60 > captura-trace.txt 2>&1 &
# rode os traceroutes, depois Ctrl-C
```

**Produza `tres-sabores.md`:**

1. Os três métodos mostraram o **mesmo caminho**? Se diferiram, em qual salto?
2. Quantos `* * *` cada método produziu? Por quê?
3. No TCP/443, qual foi o "sinal de chegada" — SYN-ACK ou RST? O que isso indica sobre a porta?
4. **Nos pacotes capturados, qual o TTL de cada sonda?** Isso confirma o mecanismo?

```bash
# Verificar TTL das sondas na captura
grep -oP 'ttl \K\d+' captura-trace.txt | head -20
```

### Parte B — Reconhecer o "salto ruim que não é ruim" (20 min)

Este é o exercício de interpretação mais importante do módulo.

Receba **este traceroute** (produzido no seu laboratório ou copiado de caso didático) e analise:

```
traceroute para 10.10.10.100
 1  10.10.10.1        0.28 ms   0.31 ms   0.25 ms
 2  192.168.0.1       1.98 ms   2.10 ms   2.05 ms
 3  10.100.0.1      142.33 ms  98.12 ms 201.44 ms
 4  10.100.0.2       12.05 ms  11.98 ms  12.10 ms
 5  10.100.0.5       12.11 ms  12.20 ms  12.08 ms
 6  10.10.10.100     12.44 ms  12.31 ms  12.40 ms
```

**Produza `salto-ruim.md` respondendo:**

1. Qual salto parece ter problema? Por quê?
2. **Por que essa conclusão está errada?** Use os saltos seguintes como evidência.
3. O que causou os 142/98/201 ms do salto 3? Por que a variação foi grande?
4. Se você reportasse "problema no salto 3" ao cliente, que dano isso causaria?
5. Qual é a latência real do caminho? Como você determina?

**Confirme com medição direta:**

```bash
for h in 10.10.10.1 10.100.0.1 10.10.10.100; do
    printf '%-15s ' "$h"
    ping -c 10 -q "$h" 2>/dev/null | tail -1 || echo "sem resposta ICMP"
done
```

### Parte C — `mtr` e perda real (30 min)

```bash
# Relatório com 200 ciclos
sudo mtr -n -r -c 200 -w 10.10.10.10 > mtr-200.txt 2>&1
cat mtr-200.txt

# Mesmo destino, TCP/443, para comparar caminho
sudo mtr -T -P 443 -n -r -c 100 -w 10.10.10.10 > mtr-tcp.txt 2>&1
cat mtr-tcp.txt
```

**Produza `mtr.md`:**

| Salto | Loss% | Avg | StDev | Perda persiste até o destino? | Interpretação |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| ... | | | | | |

**Responda:**

1. Há perda em algum salto? **Ela persiste até o destino final?**
2. Qual salto tem o maior `StDev`? O que jitter alto significa para VoIP ou videochamada?
3. Compare o caminho UDP/ICMP com o caminho TCP/443. Diferem?
4. **Duas medições separadas de 5 minutos mostram caminhos diferentes?** Se sim, o que isso
   diz sobre a estabilidade do roteamento?

```bash
sudo mtr -n -r -c 100 -w 10.10.10.10 > mtr-1.txt
sleep 300
sudo mtr -n -r -c 100 -w 10.10.10.10 > mtr-2.txt
diff <(awk '{print $2}' mtr-1.txt) <(awk '{print $2}' mtr-2.txt) && echo "caminho estável"
```

### Parte D — Os pontos cegos (opcional, 15 min)

Teste o que o `traceroute` **não** mostra:

```bash
# 1. Estabeleça uma conexão com o laboratório e traceje o MESMO destino
curl -s --max-time 30 http://10.10.10.10:8080/ > /dev/null &
sudo traceroute -T -p 8080 -n 10.10.10.10
# O traceroute percorreu o caminho da sessão real? Como você saberia?

# 2. Meça capacidade, não latência
time curl -s -o /dev/null http://10.10.10.10:8080/
# Compare com a latência do traceroute. Latência baixa, banda baixa?

# 3. Olhe o erro da própria interface
ip -s link show eth0 | tail -5
```

**Escreva `pontos-cegos.md`** com três coisas que o `traceroute` **não** conseguiu responder
neste laboratório, e qual ferramenta você usaria no lugar.

### Critérios de aceitação

- `tres-sabores.md` com os três métodos comparados e o TTL das sondas confirmado na captura.
- `salto-ruim.md` com a conclusão errada **refutada** usando os saltos seguintes como evidência.
- `mtr.md` com a coluna "perda persiste até o destino?" preenchida para cada salto.
- Você comparou dois `mtr` separados e concluiu sobre estabilidade do caminho.
- `pontos-cegos.md` com pelo menos três limitações do `traceroute` **observadas por você**.
- Nenhum `traceroute` em varredura de faixa. Apenas destinos pontuais.

---

## Avaliação

1. Explique o mecanismo do `traceroute` usando TTL. Por que a sonda precisa ser descartada por
   um roteador intermediário?
2. Qual o "sinal de chegada" no traceroute UDP? E no ICMP? E no TCP com porta fechada?
3. Por que `traceroute -T -p 443` costuma funcionar em rede onde o UDP falha?
4. Um salto mostra `* * *` e o salto seguinte responde. O caminho tem problema? Justifique.
5. Por que o tempo medido pelo `traceroute` inclui o caminho de volta? Como isso pode enganar?
6. Um salto tem 150 ms e o seguinte tem 12 ms. Explique por que isso **não** indica problema.
7. O que é o "mito do salto ruim"? Qual a regra correta para avaliar latência de salto
   intermediário?
8. `mtr` mostra 100% de perda no salto 3 e 0% no destino. O que aconteceu?
9. Qual a diferença entre `traceroute` e `mtr`? Para problema intermitente, qual usar?
10. Cite quatro coisas que o `traceroute` **não** consegue mostrar.
11. Por que um `traceroute` visto às 14:00 pode diferir de um visto às 14:05, e o que isso
    significa para conclusões de topologia?
12. Um salto aparece três vezes com IPs diferentes. O que isso indica?
13. O que é `StDev` alto em `mtr` e que tipo de aplicação sofre mais com isso?

---

**Próximo:** [Módulo 9 — TLS, HTTP/2 e interceptação](modulo-09.md)
