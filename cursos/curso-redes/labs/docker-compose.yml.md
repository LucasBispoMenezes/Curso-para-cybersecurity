# Laboratório — `docker-compose.yml`

Sobe as três máquinas do laboratório do curso numa rede isolada, **sem rota para a internet**.

```
       rede interna:  lab-net
       sub-rede:      10.10.10.0/24
       (internal: true → sem saída para a internet)

   ┌──────────────┬──────────────┬──────────────────┐
   │   alvo       │   cliente    │   observador     │
   │  10.10.10.10 │  10.10.10.20 │   10.10.10.30    │
   │  serviços    │  gera tráfego│   captura        │
   └──────────────┴──────────────┴──────────────────┘
```

---

## Uso

```bash
cd labs
docker compose up -d
docker compose ps

# verificar conectividade
docker compose exec observador ping -c 2 10.10.10.10

# entrar no observador para capturar
docker compose exec observador bash

# no observador:
#   tcpdump -i eth0 -nn -s 0 -w /capturas/teste.pcap
```

### Entrar em cada máquina

```bash
docker compose exec alvo bash
docker compose exec cliente bash
docker compose exec observador bash
```

### Derrubar e limpar

```bash
docker compose down
docker network prune -f          # remove a rede se ficar órfã
docker volume prune -f           # remove as capturas salvas
```

---

## Imagens e o que cada container tem

| Container | Imagem | O que roda | Pacotes instalados |
|---|---|---|---|
| alvo | `nicolaka/netshoot` | Serviços de teste | `tcpdump`, `tshark`, `scapy`, `nmap`, `curl`, `dig` |
| cliente | `nicolaka/netshoot` | Geração de tráfego | Idem |
| observador | `nicolaka/netshoot` | Captura e análise | Idem |

A imagem `netshoot` já traz as ferramentas de rede prontas, o que evita um `apt install` de
vários minutos a cada `up`.

⚠ **Todas as três máquinas podem capturar de sua própria interface.** Numa rede bridge do
Docker, o tráfego **entre** outros containers **não passa** pela interface de um terceiro — as
pontes encaminham na camada 2 sem replicar para as outras portas. Este é um comportamento
correto e esperado, e é o mesmo problema que você encontraria em switch físico.

**Como contornar**, em ordem de simplicidade:

1. **Capture no próprio cliente ou no próprio alvo** (mais simples). Você vê os dois lados da
   conexão se capturar na interface certa.
2. **Capture no observador durante tráfego que envolva o observador** — `ping` do observador para
   o alvo, por exemplo. Funciona direto.
3. **Use o observador como intermediário:** configure o cliente para ter o observador como
   gateway padrão, e o observador para rotear e fazer NAT para o alvo. Aí todo tráfego
   cliente→alvo passa pela interface dele.
4. **Use `ip netns` com bridge + espelhamento** — mais complexo, e o Módulo 1 discute.

Para os labs do curso, a **opção 1 resolve a maioria**, a **opção 2 é imediata**, e a **opção 3**
é a que ensina o conceito de span de porta. Todas as três aparecem nos módulos.

---

## `docker-compose.yml`

```yaml
services:

  # ---------------------------------------------------------------
  # ALVO — onde os serviços escutam
  # ---------------------------------------------------------------
  alvo:
    image: nicolaka/netshoot
    container_name: lab-alvo
    hostname: alvo
    command: >
      bash -c "
        ip addr add 10.10.10.10/24 dev eth0 2>/dev/null || true;
        ip link set eth0 up;
        echo 'alvo pronto em 10.10.10.10';
        mkdir -p /srv/web && echo 'raiz do laboratorio' > /srv/web/index.html;
        echo 'assistente' > /srv/web/admin.html;
        cd /srv/web && python3 -m http.server 8080 &
        python3 -m http.server 8000 >/dev/null 2>&1 &
        sleep 2;
        echo 'iniciando servicos de lab' > /tmp/README-LAB.txt;
        tail -f /dev/null
      "
    networks:
      lab-net:
        ipv4_address: 10.10.10.10
    cap_add:
      - NET_ADMIN
      - NET_RAW
    restart: unless-stopped

  # ---------------------------------------------------------------
  # CLIENTE — quem gera o tráfego
  # ---------------------------------------------------------------
  cliente:
    image: nicolaka/netshoot
    container_name: lab-cliente
    hostname: cliente
    command: >
      bash -c "
        ip addr add 10.10.10.20/24 dev eth0 2>/dev/null || true;
        ip link set eth0 up;
        ip route add default via 10.10.10.30 2>/dev/null || true;
        echo 'cliente pronto em 10.10.10.20';
        tail -f /dev/null
      "
    networks:
      lab-net:
        ipv4_address: 10.10.10.20
    cap_add:
      - NET_ADMIN
      - NET_RAW
    restart: unless-stopped

  # ---------------------------------------------------------------
  # OBSERVADOR — quem captura
  # ---------------------------------------------------------------
  observador:
    image: nicolaka/netshoot
    container_name: lab-observador
    hostname: observador
    command: >
      bash -c "
        ip addr add 10.10.10.30/24 dev eth0 2>/dev/null || true;
        ip link set eth0 up;
        sysctl -w net.ipv4.ip_forward=1 >/dev/null 2>&1 || true;
        iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE 2>/dev/null || true;
        echo 'observador pronto em 10.10.10.30';
        mkdir -p /capturas;
        tail -f /dev/null
      "
    networks:
      lab-net:
        ipv4_address: 10.10.10.30
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - capturas:/capturas
    restart: unless-stopped

networks:
  lab-net:
    driver: bridge
    internal: true          # ← SEM ROTA PARA A INTERNET
    ipam:
      config:
        - subnet: 10.10.10.0/24

volumes:
  capturas:
```

---

## Por que `internal: true`

⚠ **Esta é a linha mais importante do arquivo.** Sem ela, os containers teriam NAT para a
internet e o laboratório deixaria de ser isolado.

| Com `internal: true` | Sem ela |
|---|---|
| Containers só falam entre si | Containers saem para a internet via NAT |
| Nenhum risco de tráfego escapar | Um script mal apontado gera tráfego real para fora |
| DNS externo não resolve | DNS externo resolve |
| **Laboratório fechado** | **Laboratório vazado** |

Com `internal: true`, qualquer `curl externo` falha — e isso é **desejado**. Se um lab exigir
uma consulta externa (nenhum exige, exceto o Módulo 8), use um destino público **pontual** da
própria máquina host, não de dentro do container.

---

## Serviços que você precisa subir por módulo

O `compose` sobe os containers, mas cada módulo pede serviços específicos. Suba sob demanda:

### Módulos 2–4 (HTTP simples)

```bash
docker compose exec alvo bash -c 'cd /srv/web && python3 -m http.server 8080 &'
```

### Módulo 4 (servidor que envia 1 MB e um que trava com janela zero)

```bash
docker compose exec alvo bash -c 'cat > /tmp/servico.py <<"EOF"
import http.server, socketserver
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        dados = b"X" * (1024*1024)
        self.send_response(200)
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", 8080), H) as s:
    s.serve_forever()
EOF
python3 /tmp/servico.py &'
```

### Módulo 5 (DNS local)

```bash
# O netshoot não traz dnsmasq; use o próprio Python como resolvedor de teste
docker compose exec alvo bash -c 'cat > /tmp/dns-lab.py <<"EOF"
import socket, struct
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(("0.0.0.0", 5353))
print("capturador DNS em 0.0.0.0:5353")
def qname(data, off):
    labels = []
    while data[off] != 0:
        n = data[off]
        labels.append(data[off+1:off+1+n].decode("latin1"))
        off += 1 + n
    return ".".join(labels), off + 1
while True:
    data, addr = s.recvfrom(4096)
    try:
        _, _, qd, _, _, _ = struct.unpack("!HHHHHH", data[:12])
        if qd > 0:
            nome, _ = qname(data, 12)
            print(f"consulta: {nome} ({len(nome)} chars) de {addr[0]}")
    except Exception as e:
        print("erro:", e)
EOF
python3 /tmp/dns-lab.py &'
```

### Módulo 9 (servidor HTTPS com certificado próprio)

```bash
# Gere os certificados NO HOST e copie para o container
mkdir -p certs && cd certs
openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
  -keyout lab-ca.key -out lab-ca.crt -subj "/CN=CA do Laboratorio" \
  -addext "basicConstraints=critical,CA:TRUE"
openssl req -newkey rsa:2048 -nodes -keyout servidor.key -out servidor.csr \
  -subj "/CN=exemplo.lab"
openssl x509 -req -in servidor.csr -CA lab-ca.crt -CAkey lab-ca.key \
  -CAcreateserial -out servidor.crt -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:exemplo.lab\n")
cd ..

# Monte no alvo (adicione um bind no compose, ou copie)
docker cp certs/. lab-alvo:/certs/

docker compose exec alvo bash -c 'cat > /tmp/https.py <<"EOF"
import http.server, ssl
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type","text/plain")
        self.end_headers()
        self.wfile.write(b"RESPOSTA-SEGRETA-DO-LAB")
    def log_message(self,*a): pass
srv = http.server.HTTPServer(("0.0.0.0", 8443), H)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain("/certs/servidor.crt", "/certs/servidor.key")
srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
srv.serve_forever()
EOF
python3 /tmp/https.py &'
```

---

## Acesso às capturas

As capturas ficam no volume `capturas`, montado em `/capturas` no observador.

```bash
# Copiar uma captura para o host
docker cp lab-observador:/capturas/teste.pcap ./teste.pcap

# Analisar no host com tshark (se tiver instalado)
tshark -r teste.pcap -Y 'tcp.flags.reset == 1'
```

---

## Se você não puder usar Docker

Alternativa com `ip netns` numa VM Linux — cobre os três papéis numa máquina só. O comando
completo está no `README.md` do curso, seção "Opção C".

**Alternativa mais simples:** três VMs em rede **host-only / interna** no VirtualBox ou VMware.
Não use NAT. O laboratório precisa ser fechado.

---

## Checklist antes de começar qualquer lab

- [ ] `docker compose ps` mostra os três containers `Up`
- [ ] `docker compose exec observador ping -c 1 10.10.10.10` responde
- [ ] `docker compose exec alvo curl -s http://10.10.10.20` (cliente sem servidor) **falha** —
      confirma que só existe o que você subiu
- [ ] Você **não** consegue `curl` para a internet de dentro de um container (prova do
      `internal: true`)
- [ ] O diretório de trabalho tem espaço para capturas

```bash
# O teste de isolamento — este DEVE falhar
docker compose exec cliente curl -s --max-time 5 https://example.com >/dev/null \
  && echo "⚠ VAZAMENTO: o laboratório tem saída para a internet!" \
  || echo "✓ isolado corretamente"
```

Se o teste acima **passar** (conseguir acessar), **pare e corrija antes de continuar**. Um
laboratório com saída para a internet é o cenário onde um script mal apontado gera tráfego real
contra terceiro.
