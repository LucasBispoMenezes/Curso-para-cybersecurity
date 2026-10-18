# Redes para Profissionais de Segurança: do Cabo ao Pacote

Curso de 30 horas, dez módulos. Você começa no sinal do cabo e termina lendo TLS quebrado em
captura própria. Toda a análise usa `tcpdump`, `traceroute` e `tshark`.

**Material original.** Referências abertas na [ementa](00-ementa.md).

---

## Como usar

Este curso tem **dois trilhos**, e você alterna entre eles:

1. **Trilho conceitual** — o que cada camada resolve e por quê.
2. **Trilho de captura** — o que aquilo parece no fio, em hexadecimal.

Nenhum dos dois basta sozinho. Quem só lê teoria não sabe diagnosticar. Quem só olha captura
sabe que "tem muito ACK" e não sabe o que fazer com isso.

**Ritmo sugerido:** 3h por semana durante 10 semanas. Ou dois fins de semana intensivos, se você
já tem base de Linux.

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [Fundamentos e o modelo de camadas](modulo-01.md) | 3 | Uma conexão explicada camada por camada, do cabo ao socket |
| 2 | [Ethernet, ARP e a rede local](modulo-02.md) | 3 | Uma captura de handshake TCP lida campo a campo |
| 3 | [IP, roteamento e ICMP](modulo-03.md) | 3 | Um CIDR subnetado à mão e um `ping` explicado |
| 4 | [TCP a fundo](modulo-04.md) | 4 | Uma retransmissão encontrada e diagnosticada |
| 5 | [UDP, DNS e o caminho do nome](modulo-05.md) | 3 | A resolução de um nome decomposta em pacotes |
| 6 | [`tcpdump` na prática](modulo-06.md) | 3 | Uma captura de incidente com filtro BPF preciso |
| 7 | [Análise com `tshark`](modulo-07.md) | 3 | Campos extraídos de uma captura, em CSV |
| 8 | [`traceroute` e o caminho](modulo-08.md) | 2 | Um mapa de caminho com interpretação |
| 9 | [TLS, HTTP/2 e interceptação](modulo-09.md) | 3 | Um TLS 1.3 explicado e um proxy lendo depois do TLS |
| 10 | [`scapy`, firewall e diagnóstico](modulo-10.md) | 3 | Um incidente diagnosticado com método |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md) · [Solucoes](solucoes/README.md)

---

## Monte o laboratório antes do Módulo 2

Sem laboratório, o curso vira leitura. Leva dez minutos para montar.

⚠ **Todos os labs usam `10.10.10.0/24`, isolada, sem rota para a internet.** Não aponte nenhum
exercício para outra rede. Capturar tráfego em rede de terceiro é crime, mesmo passivamente.

### Opção A — Docker (recomendado, mais rápido)

```bash
cd labs
docker compose up -d
docker compose ps

# Entre no observador
docker compose exec observador bash

# Teste rápido: o observador vê o cliente?
docker compose exec observador ping -c 2 10.10.10.20
```

### Opção B — Três VMs numa rede interna

VirtualBox, VMware ou `libvirt` com três VMs numa rede **host-only / interna**:

| Máquina | IP | Papel |
|---|---|---|
| alvo | `10.10.10.10/24` | Servidor (nginx, sshd, dnsmasq) |
| cliente | `10.10.10.20/24` | Gera tráfego |
| observador | `10.10.10.30/24` | Captura |

Configure IP estático em cada uma. **Não use NAT** — o laboratório precisa ser fechado.

### Opção C — Uma máquina só, com namespaces de rede

Se você tem apenas uma VM Linux, dá para criar os três papéis com `ip netns`:

```bash
sudo ip netns add alvo
sudo ip netns add cliente
sudo ip netns add observador
sudo ip link add br-lab type bridge
sudo ip link set br-lab up

for ns in alvo cliente observador; do
    sudo ip link add "veth-$ns" type veth peer name "eth-$ns"
    sudo ip link set "veth-$ns" master br-lab
    sudo ip link set "veth-$ns" up
    sudo ip link set "eth-$ns" netns "$ns"
done

sudo ip netns exec alvo       ip addr add 10.10.10.10/24 dev eth-alvo
sudo ip netns exec cliente    ip addr add 10.10.10.20/24 dev eth-cliente
sudo ip netns exec observador ip addr add 10.10.10.30/24 dev eth-observador
sudo ip netns exec alvo       ip link set lo up
sudo ip netns exec alvo       ip link set eth-alvo up
sudo ip netns exec cliente    ip link set eth-cliente up
sudo ip netns exec observador ip link set eth-observador up
```

N N **Com bridge, o tráfego entre cliente e alvo normalmente não passa pela interface do
observador.** Para capturar, você precisa de uma das duas coisas: (a) span/mirror de porta no
switch virtual, ou (b) colocar o observador **como intermediário** (configurando rotas para que
o tráfego cliente→alvo passe por ele). O Módulo 2 explica isso em detalhe — é o mesmo problema
que um analista enfrenta em rede real, e vale entender antes de "achar que o tcpdump está
quebrado".

---

## Ambiente de software

```bash
sudo apt update
sudo apt install -y tcpdump tshark traceroute mtr \
                    iproute2 iputils-ping dnsutils \
                    nftables netcat-openbsd curl openssl \
                    python3 python3-pip
pip3 install scapy

# tshark pergunta se usuários não-root podem capturar — responda "No" para o curso
sudo dpkg-reconfigure wireshark-common 2>/dev/null || true
```

Verificação:

```bash
tcpdump --version      # 4.99+
tshark --version       # 4.0+
traceroute --version
python3 -c "import scapy; print(scapy.__version__)"
```

**Permissão de captura:** `tcpdump` e `tshark` precisam de `CAP_NET_RAW` ou root. Rode com
`sudo`. Se quiser evitar `sudo` a cada vez:

```bash
sudo setcap cap_net_raw,cap_net_admin=eip "$(which tcpdump)"
sudo setcap cap_net_raw,cap_net_admin=eip "$(which tshark)"
```

---

## Convenções

- Toda captura no material é seguida de **leitura campo a campo** do hexdump.
- `N O T A` marca o detalhe que morde.
- `⚠` marca limite legal ou de segurança.
- Os labs entregam **a captura**, não "deu certo".
- Nenhum lab depende de internet durante a execução.
