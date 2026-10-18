# Módulo 8 — Rede do Ponto de Vista do Kernel

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** módulos 1 a 7; curso de **Redes** (pré-requisito duro)

---

## Objetivos

1. Ler `/proc/net` como fonte de verdade sobre socket, conexão e rota.
2. Relacionar `fd` do processo com socket do kernel — o elo que faltava.
3. Entender namespace de rede e por que `iptables` é **por namespace**.
4. Auditar `nft`/`iptables` e reconhecer regra permissiva.
5. Detectar serviço escutando sem justificativa e conexão de saída anômala.

---

## ⚠ Antes de começar

⚠ **Este módulo é aprofundamento do curso de Redes, com o recorte do **kernel**.** Lá você viu
protocolo e pacote; **aqui você vê o estado interno**. A diferença é o que permite responder "**quem**
está escutando e **a que processo** pertence" — e não só "que porta está aberta".

⚠ **E é o último módulo que fecha o ciclo do módulo 2.** Lá o `fd` era um número; **aqui ele vira
conexão**. `/proc/<pid>/fd/N → socket:[12345678]`, e esse número aparece em `/proc/net/tcp`.

⚠ **Conduta:** você audita a **sua** VM. `tcpdump` na sua interface, `nft` no seu namespace. Nada
aponta para fora.

---

## 8.1 `/proc/net` — o estado da rede, pelo kernel

⚠ **`/proc/net` é onde o kernel publica o estado.** E ele é **por namespace** — o que significa que
o mesmo arquivo mostra coisas diferentes dentro de um contêiner.

```bash
mkdir -p ~/lab/mod08 && cd ~/lab/mod08

echo "═══ os arquivos de /proc/net ═══"
for f in tcp tcp6 udp udp6 unix raw route arp dev netstat \
         ip_tables_names nf_conntrack snmp tcp_mem sockstat; do
    [ -e "/proc/net/$f" ] && printf '  %-22s %s linhas\n' "$f" "$(wc -l < "/proc/net/$f" 2>/dev/null)"
done

echo
echo "═══ 1. /proc/net/tcp — o formato ═══"
head -3 /proc/net/tcp

echo
cat <<'EXPL'
  As colunas de /proc/net/tcp:

    sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt
    uid timeout inode
    │   │             │             │  │        │        │  │        │
    │   │             │             │  │        │        │  │        └─ inode do socket ⚠
    │   │             │             │  │        │        │  └─ direito de reenvio
    │   │             │             │  │        │        └─ timer
    │   │             │             │  │        └─ fila de recebimento
    │   │             │             │  └─ fila de envio
    │   │             │             └─ ESTADO (01=ESTAB, 0A=LISTEN...)
    │   │             └─ endereço remoto (hex, little-endian)
    │   └─ endereço local (hex, little-endian)
    └─ slot

  ⚠ ENDEREÇO EM HEX e INVERTIDO:
     0100007F:0016  →  127.0.0.1:22
     │        │
     │        └─ porta em hex (0x16 = 22)
     └─ 7F000001 invertido = 0100007F  → 127.0.0.1
EXPL

echo
echo "═══ 2. os estados ═══"
cat <<'EXPL'
  01 = ESTABLISHED     conexão ativa
  02 = SYN_SENT        tentando conectar
  03 = SYN_RECV        recebendo conexão
  04 = FIN_WAIT1       fechando
  05 = FIN_WAIT2       fechando
  06 = TIME_WAIT       espera após fechar
  07 = CLOSE           fechado
  08 = CLOSE_WAIT      ⚠ o outro fechou, este não fechou (vazamento!)
  09 = LAST_ACK
  0A = LISTEN          ⚠ escutando
  0B = CLOSING
  0C = NEW_SYN_RECV
EXPL
```

⚠ **A linha `inode` é o elo com o módulo 7.** Ela é o número que aparece em
`/proc/<pid>/fd/N → socket:[INODE]`. **É assim que você descobre qual processo tem qual conexão** —
sem `ss`, sem `lsof`, só com o kernel.

```bash
echo "═══ 3. conversão: hex → decimal, e decodificação do endereço ═══"
cat > decodifica-socket.py <<'PY'
#!/usr/bin/env python3
"""decodifica-socket.py — lê /proc/net/tcp e traduz para portas legíveis."""
import struct, socket, sys
from collections import Counter

ESTADOS = {
    "01":"ESTABLISHED","02":"SYN_SENT","03":"SYN_RECV","04":"FIN_WAIT1",
    "05":"FIN_WAIT2","06":"TIME_WAIT","07":"CLOSE","08":"CLOSE_WAIT",
    "09":"LAST_ACK","0A":"LISTEN","0B":"CLOSING","0C":"NEW_SYN_RECV",
}

def ip_hex(h):
    """converte o hex little-endian do kernel em IP"""
    return socket.inet_ntoa(struct.pack("<I", int(h, 16)))

def ip6_hex(h):
    return str(__import__("ipaddress").IPv6Address(int.from_bytes(
        bytes.fromhex(h)[::-1] if len(h) == 32 else b"\x00"*16, "big")))

def porta_hex(h):
    return int(h, 16)

def le(arquivo, v6=False):
    linhas = []
    try:
        with open(arquivo) as f:
            next(f, None)
            for l in f:
                p = l.split()
                if len(p) < 10:
                    continue
                la, lp = p[1].split(":")
                ra, rp = p[2].split(":")
                try:
                    lip = ip6_hex(la) if v6 else ip_hex(la)
                    rip = ip6_hex(ra) if v6 else ip_hex(ra)
                except Exception:
                    continue
                linhas.append({
                    "proto": arquivo.rsplit("/",1)[-1].upper(),
                    "local": f"{lip}:{porta_hex(lp)}",
                    "remoto": f"{rip}:{porta_hex(rp)}",
                    "estado": ESTADOS.get(p[3].upper(), p[3]),
                    "uid": p[7],
                    "inode": p[9],
                })
    except FileNotFoundError:
        pass
    return linhas

todos = []
for a in ["/proc/net/tcp","/proc/net/tcp6","/proc/net/udp","/proc/net/udp6"]:
    todos += le(a, v6="6" in a)

print(f"{'PROTO':<6} {'ESTADO':<14} {'LOCAL':<26} {'REMOTO':<26} {'UID':<6} INODE")
print("-"*100)
for s in sorted(todos, key=lambda x: (x["estado"] != "LISTEN", x["local"])):
    print(f"{s['proto']:<6} {s['estado']:<14} {s['local']:<26} {s['remoto']:<26} {s['uid']:<6} {s['inode']}")

print()
print("── resumo por estado ──")
for e, n in Counter(s["estado"] for s in todos).most_common():
    print(f"  {e:<16} {n}")
print()
print("── LISTEN (superfície) ──")
for s in todos:
    if s["estado"] == "LISTEN":
        print(f"  {s['proto']:<5} {s['local']:<28} uid={s['uid']}")
PY
chmod +x decodifica-socket.py
python3 decodifica-socket.py
```

⚠ **Note que o script traduz o endereço. Sem isso, você lê `0100007F:0016` e não sabe que é
`127.0.0.1:22`.** **Auditoria de rede em `/proc` exige decodificação** — e é por isso que a
ferramenta existe.

⚠ **E a linha `uid` do socket é informação de auditoria.** Ela diz **qual usuário criou o socket** —
independente de quem mantém o processo hoje. Um socket `LISTEN` com `uid=0` é serviço de `root`.

**Produza `proc-net.md`:**

| Protocolo | Estado | Local | Remoto | `uid` | Inode |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |

**Responda:**

1. **Quantos sockets em `LISTEN`?** Qual o `uid` de cada?
2. Quantos em `ESTABLISHED`? **Para onde apontam?**
3. Algum em `CLOSE_WAIT`? **O que isso indica?**
4. **Por que o endereço aparece invertido no `/proc/net/tcp`?**

⚠ **A resposta 3 é achado de código.** `CLOSE_WAIT` significa que **o outro lado fechou e o
programa não fechou** — vazamento de descritor. Muitos em `CLOSE_WAIT` é **bug de aplicação**, e
é o tipo de achado que só aparece olhando o kernel.

---

## 8.2 O elo: `fd` do processo → socket do kernel

⚠ **Agora você fecha o ciclo.** `/proc/<pid>/fd/N` diz `socket:[INODE]`, e o `INODE` aparece em
`/proc/net/tcp`. **É assim que se responde "qual processo tem esta conexão"** — sem ferramenta.

```bash
echo "═══ 1. um socket com dono conhecido ═══"
# abre uma conexão de teste
( exec 5<>/dev/tcp/127.0.0.1/22 2>/dev/null && sleep 2 ) &
sleep 0.5

echo "  nosso shell tem fds:"
ls -la /proc/self/fd/ 2>/dev/null | grep socket | sed 's/^/    /'

echo
echo "═══ 2. o inode do socket ═══"
for fd in /proc/self/fd/*; do
    [ -e "$fd" ] || continue
    alvo=$(readlink "$fd" 2>/dev/null)
    case "$alvo" in
        socket:*) printf '  fd %-4s → %s\n' "$(basename "$fd")" "$alvo" ;;
    esac
done

echo
echo "═══ 3. e o mesmo inode em /proc/net/tcp ═══"
inode=$(for fd in /proc/self/fd/*; do
    [ -e "$fd" ] || continue
    readlink "$fd" 2>/dev/null | grep -oE '[0-9]+'
done | head -1)

[ -n "$inode" ] && {
    echo "  procurando inode ${inode}:"
    awk -v i="$inode" '$10 == i {print "    " $0}' /proc/net/tcp
    echo
    echo "  ⚠ achou: é a MESMA conexão vista dos dois lados"
}

wait 2>/dev/null
```

### O script que faz a correlação completa

```bash
cat > quem-escuta.py <<'PY'
#!/usr/bin/env python3
"""quem-escuta.py — relaciona socket em LISTEN com o processo dono."""
import os, struct, socket, glob, sys

def ip_hex(h):
    try:    return socket.inet_ntoa(struct.pack("<I", int(h, 16)))
    except Exception: return h

def sockets_listen():
    out = {}
    for arq, v6 in [("/proc/net/tcp", False), ("/proc/net/tcp6", True),
                    ("/proc/net/udp", False), ("/proc/net/udp6", True)]:
        try:
            with open(arq) as f:
                next(f, None)
                for l in f:
                    p = l.split()
                    if len(p) < 10: continue
                    if p[3].upper() != "0A" and "udp" not in arq: continue
                    if "udp" in arq and p[3].upper() not in ("07","01"): continue
                    la, lp = p[1].split(":")
                    porta = int(lp, 16)
                    out[p[9]] = {
                        "proto": os.path.basename(arq).upper(),
                        "ip": ip_hex(la) if not v6 else "v6",
                        "porta": porta,
                        "uid": p[7],
                    }
        except FileNotFoundError:
            pass
    return out

def processos_por_inode():
    mapa = {}
    for pid in os.listdir("/proc"):
        if not pid.isdigit(): continue
        for fdl in glob.glob(f"/proc/{pid}/fd/*"):
            try:
                alvo = os.readlink(fdl)
            except OSError:
                continue
            if alvo.startswith("socket:["):
                ino = alvo[8:-1]
                try:
                    with open(f"/proc/{pid}/comm") as c:
                        nome = c.read().strip()
                except OSError:
                    nome = "?"
                try:
                    with open(f"/proc/{pid}/cmdline","rb") as c:
                        cmd = c.read().replace(b"\x00", b" ").decode(errors="replace").strip()
                except OSError:
                    cmd = ""
                mapa.setdefault(ino, []).append((pid, nome, cmd))
    return mapa

sock = sockets_listen()
proc = processos_por_inode()

print(f"{'PROTO':<6} {'ENDEREÇO':<24} {'UID':<6} {'PID':<8} {'PROCESSO':<18} COMANDO")
print("-"*112)
for ino, s in sorted(sock.items(), key=lambda x: x[1]["porta"]):
    donos = proc.get(ino, [])
    end = f"{s['ip']}:{s['porta']}"
    if donos:
        for pid, nome, cmd in donos:
            print(f"{s['proto']:<6} {end:<24} {s['uid']:<6} {pid:<8} {nome:<18} {cmd[:40]}")
    else:
        print(f"{s['proto']:<6} {end:<24} {s['uid']:<6} {'—':<8} {'—':<18} ⚠ sem processo visível")

print()
print(f"sockets em escuta : {len(sock)}")
print(f"processos mapeados: {len(proc)}")
print()
print("⚠ 'sem processo visível' pode ser:")
print("   · socket do KERNEL (NFS, conntrack) — normal")
print("   · processo de OUTRO namespace — o módulo 6")
print("   · processo de outro usuário — requer privilégio para ver o fd")
PY
chmod +x quem-escuta.py
sudo python3 quem-escuta.py
```

⚠ **A linha "sem processo visível" é achado de auditoria.** Ela significa uma de três coisas, e
**duas são normais.** A terceira — **processo de outro namespace** — é o que o módulo 6 preparou
você para reconhecer.

⚠ **E a linha do `cmdline` completa o quadro.** O `comm` dá o nome do programa; o `cmdline` dá **os
argumentos** — e é onde aparece a **porta, o arquivo de configuração e o usuário** que o serviço
usa. **Argumento é informação de auditoria.**

**Produza `quem-escuta.md`:**

| Proto | Endereço | `uid` | PID | Processo | Achado |
|---|---|---|---|---|---|
| | | | | | |

**Responda:**

1. **Quantos sockets em escuta têm processo identificado?**
2. Algum **sem processo visível**? **Qual das três causas?**
3. Algum `LISTEN` com `uid=0`? **É justificável?**
4. **Por que o `cmdline` é mais informativo que o `comm`?**

---

## 8.3 Namespace de rede — e por que `iptables` é por namespace

⚠ **A regra que resolve metade da confusão sobre firewall:**

> **`iptables`/`nft` é **por namespace de rede**. Regra num namespace **não** vale em outro.**

⚠ **A consequência:** um contêiner tem **a própria tabela** — e o `iptables` do host **não o
alcança**. É por isso que o Docker **insere regras no host** para o tráfego que passa por ele.

```bash
echo "═══ 1. o firewall do host ═══"
sudo nft list ruleset 2>/dev/null | head -30 || \
    sudo iptables -L -n -v 2>/dev/null | head -30 || \
    echo "  (nenhuma ferramenta — instale nftables ou iptables)"

echo
echo "═══ 2. o firewall DENTRO de um namespace novo ═══"
echo "  dentro de um namespace de rede, NÃO há as regras do host:"
echo
sudo unshare --net --fork sh -c '
    echo "    interfaces: $(ip -o link show 2>/dev/null | wc -l)"
    echo "    regras iptables:"
    iptables -L -n 2>/dev/null | head -4 | sed "s/^/      /" || echo "      (vazio — namespace novo)"
    echo
    echo "    ⚠ namespace de rede novo tem tabela PRÓPRIA e vazia"
'

echo
echo "═══ 3. a implicação para contêiner ═══"
cat <<'EXPL'
  Contêiner com network=bridge:
    · tem namespace de rede PRÓPRIO
    · tem tabela iptables PRÓPRIA (geralmente vazia ou mínima)
    · o host insere regras de NAT para dar saída
    · ⚠ a política de firewall do HOST não se aplica dentro

  Contêiner com network=host:
    · ⚠ compartilha o namespace de rede do host
    · ⚠ vê TODAS as interfaces, inclusive as internas
    · ⚠ pode abrir porta direto no host
    · ⚠ é uma das quatro configurações que anulam (módulo 6)

  ⚠ auditar firewall de contêiner exige ENTRAR no namespace dele
EXPL

echo
echo "═══ 4. auditando o firewall de um processo ═══"
for pid in $(pgrep -f 'dockerd|containerd' 2>/dev/null | head -1); do
    [ -z "$pid" ] && continue
    echo "  processo ${pid} (contêiner runtime)"
    nsenter --target "$pid" --net iptables -L -n 2>/dev/null | head -10 | sed 's/^/    /' || \
        echo "    (requer privilégio)"
done
echo "  (fim)"
```

⚠ **A seção 4 é a técnica de auditoria de firewall de contêiner.** Você **entra** no namespace de
rede do processo e **lê a tabela dele** — porque a do host não vale lá.

⚠ **E é por isso que "o firewall bloqueia" pode ser falso num contêiner.** O host tem regra; o
contêiner **não está sujeito a ela**. **O tráfego que sai do contêiner passa pelo host** — e é ali
que o host pode bloquear, com regra de `FORWARD`. **Mas o contêiner pode abrir porta própria**
dentro do próprio namespace.

### A auditoria de `nft`/`iptables`

```bash
echo "═══ 5. as regras que importam para auditoria ═══"
echo

echo "  ── política padrão ──"
sudo iptables -L -n 2>/dev/null | grep -E '^Chain' | sed 's/^/    /'

echo
echo "  ⚠ política ACCEPT na INPUT é achado de postura"
echo "     significa: tudo entra, a menos que regra específica negue"

echo
echo "  ── regras ACCEPT amplas ──"
sudo iptables -S 2>/dev/null | grep -E '\-j ACCEPT' | head -15 | sed 's/^/    /'

echo
echo "  ── regras de LOG (auditoria) ──"
sudo iptables -S 2>/dev/null | grep -E '\-j LOG' | head -5 | sed 's/^/    /'
[ -z "$(sudo iptables -S 2>/dev/null | grep -E '\-j LOG')" ] && \
    echo "    ⚠ nenhuma regra de LOG — tráfego bloqueado não é registrado"

echo
echo "  ── regras por interface ──"
sudo iptables -S 2>/dev/null | grep -E '\-i |\-o ' | head -10 | sed 's/^/    /'
```

⚠ **A ausência de regra de `LOG` é achado de detecção.** Uma regra que bloqueia **sem registrar**
não deixa evidência — e no módulo 9 você vai ver que **detecção é parte do controle**.

⚠ **E a política padrão `ACCEPT` é o achado de postura mais comum.** O padrão correto é
**`DROP` na INPUT** com regras explícitas de `ACCEPT` para o necessário. **O inverso — `ACCEPT` com
regras de `DROP` — erra por omissão, que é o erro perigoso.**

**Produza `firewall.md`:**

| Item | Valor | Seguro? | Correção |
|---|---|---|---|
| Política `INPUT` | | | |
| Política `FORWARD` | | | |
| Regras `ACCEPT` amplas | | | |
| Regras `LOG` | | | |
| Firewall dentro do contêiner | | | |

**Responda:**

1. **Qual a política padrão da `INPUT`?** É o valor seguro?
2. Existe regra de `LOG`? **Por que a ausência é achado?**
3. Por que "o firewall bloqueia" pode ser **falso** num contêiner?
4. **Como você audita o firewall de um contêiner?**

---

## 8.4 Conexão de saída — o achado que ninguém olha

⚠ **Auditoria de rede foca em `LISTEN`. E o achado grave frequentemente está na **saída**.**

```bash
echo "═══ conexões de SAÍDA (ESTABLISHED) ═══"
python3 decodifica-socket.py 2>/dev/null | awk '
    /ESTABLISHED/ {print}
' | head -20

echo
echo "═══ o que olhar numa conexão de saída ═══"
cat <<'EXPL'
  1. DESTINO INESPERADO
       serviço que não deveria falar com a internet
       → ex.: servidor de banco conectando em IP estrangeiro

  2. PORTA DE SAÍDA INCOMUM
       :4444, :8080, :1337, :31337   ← convenção de C2
       ⚠ mas atacante usa :443 também

  3. SERVIÇO SEM MOTIVO PARA SAIR
       um serviço de arquivo não precisa de saída HTTP

  4. CONEXÃO PERSISTENTE PARA UM SÓ DESTINO
       ⚠ beacon de C2: conexão mantida ou refeita em intervalo

  5. DNS PARA RESOLVEDOR ESTRANHO
       ⚠ exfiltração por DNS
EXPL

echo
echo "═══ analisando destinos ═══"
python3 - <<'PY'
import struct, socket
from collections import Counter

def ip_hex(h):
    try: return socket.inet_ntoa(struct.pack("<I", int(h,16)))
    except Exception: return h

destinos = Counter()
remotas = []
for arq in ["/proc/net/tcp", "/proc/net/tcp6"]:
    try:
        with open(arq) as f:
            next(f, None)
            for l in f:
                p = l.split()
                if len(p) < 10: continue
                if p[3].upper() != "01": continue     # só ESTABLISHED
                ra, rp = p[2].split(":")
                if not arq.endswith("6"):
                    rip = ip_hex(ra)
                else:
                    rip = "v6"
                porta = int(rp, 16)
                destinos[f"{rip}:{porta}"] += 1
                remotas.append((rip, porta, p[7], p[9]))
    except FileNotFoundError:
        pass

print(f"  conexões de saída ativas: {len(remotas)}")
print()
print("  ── por destino ──")
for d, n in destinos.most_common(15):
    marca = ""
    if any(d.endswith(f":{x}") for x in (4444, 1337, 31337, 6667)):
        marca = "  ⚠ porta de C2 conhecida"
    print(f"    {d:<28} {n}x{marca}")
print()
print("  ── portas de saída ──")
for porta, n in Counter(p for _, p, _, _ in remotas).most_common(10):
    marca = ""
    if porta in (4444, 1337, 31337, 6667, 8888):
        marca = "  ⚠"
    elif porta in (80, 443):
        marca = ""
    else:
        marca = "  · incomum"
    print(f"    :{porta:<6} {n}x{marca}")
PY
```

⚠ **A linha de porta `:4444`, `:1337`, `:31337` é convenção de C2** — e verificar isso é
verificação de rotina. **Mas a ausência dela não significa nada:** atacante competente usa `:443`.

⚠ **O achado real não é a porta — é o **destino que não faz sentido**.** Um serviço de banco de
dados que não deveria falar com a internet, conectando em IP estrangeiro, **é achado
independentemente da porta.**

⚠ **E é o tipo de achado que exige **conhecer o ambiente**.** Nenhum scanner sabe que "este serviço
não deveria sair" — isso é **contexto**, e é o que separa auditor de ferramenta.

```bash
echo "═══ o método de auditoria de saída ═══"
cat <<'EXPL'
  1. INVENTÁRIO
       liste toda conexão de saída com processo dono (quem-escuta.py adaptado)

  2. BASELINE
       rode em dois momentos e compare — o que muda?

  3. ESCOLTA (allowlist)
       para cada serviço: a quem ele LEGITIMAMENTE fala?
       ⚠ tudo fora da lista é candidato

  4. RESOLUÇÃO
       para onde o nome resolve? é CDN? é nuvem? é estranho?
       ⚠ DNS reverso do destino pode surpreender

  5. INTERVALO
       a conexão se repete em intervalo regular?  ← ⚠ beacon
       (requer observação ao longo do tempo)

  ⚠ o passo 3 é o que exige conhecimento do cliente
  ⚠ o passo 5 é o que exige tempo, e é onde o C2 aparece
EXPL

echo
echo "═══ resolvedor DNS — o caminho de exfiltração ═══"
cat /etc/resolv.conf 2>/dev/null | grep -vE '^#' | sed 's/^/  /'
echo
echo "  servidores que resolvem:"
ss -uapn 2>/dev/null | grep ':53' | head -5 | sed 's/^/    /'
echo
echo "  ⚠ um resolvedor interno inesperado pode ser interceptação"
```

⚠ **A última verificação é rápida e reveladora.** Se o `/etc/resolv.conf` aponta para um resolvedor
**que você não reconhece**, uma de duas coisas: configuração de rede do ambiente, ou
**interceptação**. **É achado de configuração**, e vale reportar.

**Produza `saida.md`:**

| Destino | Porta | `uid` | Inode | Legítimo? | Observação |
|---|---|---|---|---|---|
| | | | | | |

**Responda:**

1. **Quantas conexões de saída ativas?** Alguma porta incomum?
2. **Alguma que não faz sentido** para o serviço? Por quê?
3. Qual é o **resolvedor DNS**? É o esperado?
4. **Por que o achado de saída exige conhecer o ambiente?**

---

## 8.5 LAB — Auditoria de rede

**Duração:** 120 min

### Passo 1 — Estado completo (35 min)

```bash
cd ~/lab/mod08

cat > audita-rede.sh <<'SCRIPT'
#!/usr/bin/env bash
# audita-rede.sh — auditoria de rede pelo kernel
set -uo pipefail

SAIDA="${1:-rede.txt}"

{
    echo "═══════════ AUDITORIA DE REDE ═══════════"
    echo "host: $(hostname)   data: $(date -Is)"
    echo

    echo "── 1. INTERFACES ──"
    ip -brief addr 2>/dev/null | sed 's/^/  /'
    echo

    echo "── 2. ROTAS ──"
    ip route 2>/dev/null | sed 's/^/  /'
    echo

    echo "── 3. SOCKETS EM ESCUTA (com processo) ──"
    python3 quem-escuta.py 2>/dev/null | sed 's/^/  /'
    echo

    echo "── 4. CONEXÕES ESTABELECIDAS ──"
    python3 decodifica-socket.py 2>/dev/null | \
        awk '/ESTABLISHED/ {print "  " $0}'
    echo

    echo "── 5. SOCKETS EM CLOSE_WAIT ──"
    python3 decodifica-socket.py 2>/dev/null | awk '/CLOSE_WAIT/ {print "  ⚠ " $0}'
    echo

    echo "── 6. SOCKETS UNIX (IPC local) ──"
    wc -l < /proc/net/unix 2>/dev/null | xargs echo "  total:"
    grep -E 'docker|containerd|systemd|dbus' /proc/net/unix 2>/dev/null | \
        head -8 | awk '{print "  " $NF}'
    echo

    echo "── 7. FIREWALL ──"
    if command -v nft >/dev/null; then
        nft list ruleset 2>/dev/null | head -25 | sed 's/^/  /'
    elif command -v iptables >/dev/null; then
        iptables -S 2>/dev/null | head -20 | sed 's/^/  /'
    else
        echo "  ⚠ nenhuma ferramenta de firewall"
    fi
    echo

    echo "── 8. POLÍTICA PADRÃO ──"
    if command -v iptables >/dev/null; then
        iptables -L -n 2>/dev/null | grep -E '^Chain' | sed 's/^/  /'
    fi
    echo

    echo "── 9. CONNTRACK (conexões rastreadas) ──"
    if [ -r /proc/net/nf_conntrack ]; then
        wc -l < /proc/net/nf_conntrack | xargs echo "  entradas:"
        head -5 /proc/net/nf_conntrack | sed 's/^/  /'
    else
        echo "  (requer privilégio ou módulo não carregado)"
    fi
    echo

    echo "── 10. RESOLVEDOR DNS ──"
    grep -vE '^#|^$' /etc/resolv.conf 2>/dev/null | sed 's/^/  /'
    echo

    echo "── 11. NAMESPACE DE REDE ──"
    for pid in 1 $$; do
        printf '  pid %-6s %s\n' "$pid" "$(readlink /proc/${pid}/ns/net 2>/dev/null)"
    done
    echo "  ⚠ inode diferente = namespace diferente"
    echo

    echo "── 12. PARÂMETROS DE REDE RELEVANTES ──"
    for k in net.ipv4.ip_forward net.ipv4.conf.all.accept_redirects \
             net.ipv4.conf.all.accept_source_route net.ipv4.conf.all.rp_filter \
             net.ipv4.tcp_syncookies net.ipv6.conf.all.accept_ra; do
        printf '  %-46s = %s\n' "$k" "$(sysctl -n "$k" 2>/dev/null)"
    done

} > "$SAIDA" 2>&1

echo "salvo em ${SAIDA} ($(wc -l < "$SAIDA") linhas)"
SCRIPT

chmod +x audita-rede.sh
sudo ./audita-rede.sh rede.txt
head -80 rede.txt
```

Produza `auditoria-rede.md`:

| Seção | Achado | Quantidade | Risco |
|---|---|---|---|
| 3 — escuta | | | |
| 4 — estabelecida | | | |
| 5 — `CLOSE_WAIT` | | | |
| 6 — unix socket | | | |
| 7 — firewall | | | |
| 8 — política padrão | | | |
| 10 — resolvador | | | |
| 12 — `sysctl` | | | |

**Responda:**

1. **Quantos sockets em escuta?** Quantos têm `uid=0`?
2. **Quantas conexões de saída?** Alguma suspeita?
3. **Qual a política padrão do firewall?** É o valor seguro?
4. Qual `sysctl` está **fora** do recomendado?

⚠ **A resposta 4 tem valores esperados:**

| `sysctl` | Valor seguro |
|---|---|
| `net.ipv4.ip_forward` | `0` (1 se for roteador/contêiner host) |
| `accept_redirects` | `0` |
| `accept_source_route` | `0` |
| `rp_filter` | `1` ou `2` |
| `tcp_syncookies` | `1` |
| `accept_ra` (v6) | `0` se não usar RA |

### Passo 2 — Correlação com processo (35 min)

⚠ **A correlação é o entregável técnico.**

```bash
cd ~/lab/mod08

echo "═══ correlacionando socket → processo → serviço ═══"
echo

cat > correlaciona.py <<'PY'
#!/usr/bin/env python3
"""correlaciona.py — socket ↔ processo ↔ unit systemd."""
import os, glob, subprocess, struct, socket

def ip_hex(h):
    try: return socket.inet_ntoa(struct.pack("<I", int(h,16)))
    except Exception: return h

# sockets em escuta
escuta = {}
for arq in ["/proc/net/tcp","/proc/net/tcp6","/proc/net/udp"]:
    try:
        with open(arq) as f:
            next(f, None)
            for l in f:
                p = l.split()
                if len(p) < 10: continue
                if p[3].upper() not in ("0A","07","01"): continue
                la, lp = p[1].split(":")
                escuta[p[9]] = {
                    "proto": os.path.basename(arq).upper(),
                    "ip": ip_hex(la),
                    "porta": int(lp, 16),
                    "uid": p[7],
                }
    except FileNotFoundError: pass

# inode → (pid, cmdline)
por_inode = {}
for pid in os.listdir("/proc"):
    if not pid.isdigit(): continue
    for fdl in glob.glob(f"/proc/{pid}/fd/*"):
        try: alvo = os.readlink(fdl)
        except OSError: continue
        if not alvo.startswith("socket:["): continue
        ino = alvo[8:-1]
        try:
            cmd = open(f"/proc/{pid}/cmdline","rb").read().replace(b"\x00",b" ").decode(errors="replace").strip()
        except OSError:
            cmd = ""
        por_inode.setdefault(ino, (pid, cmd[:60]))

def unit_do_pid(pid):
    try:
        out = subprocess.run(["systemctl","status",pid],
                             capture_output=True, text=True, timeout=3).stdout
        for l in out.splitlines():
            if "Loaded:" in l or ".service" in l:
                return l.strip()[:50]
    except Exception:
        pass
    return ""

print(f"{'PROTO':<5} {'ENDEREÇO':<22} {'UID':<5} {'PID':<8} {'PROCESSO/CMD':<50}")
print("-"*100)
for ino, s in sorted(escuta.items(), key=lambda x: x[1]["porta"]):
    dono = por_inode.get(ino)
    end = f"{s['ip']}:{s['porta']}"
    if dono:
        print(f"{s['proto']:<5} {end:<22} {s['uid']:<5} {dono[0]:<8} {dono[1]:<50}")
    else:
        print(f"{s['proto']:<5} {end:<22} {s['uid']:<5} {'?':<8} {'⚠ sem processo (kernel ou outro ns)'}")

print()
print("── portas em 0.0.0.0 (todas as interfaces) ──")
for ino, s in escuta.items():
    if s["ip"] == "0.0.0.0":
        dono = por_inode.get(ino, ("?","?"))
        print(f"  ⚠ {s['proto']:<5} :{s['porta']:<6} uid={s['uid']:<5} {dono[1]}")
PY
chmod +x correlaciona.py
sudo python3 correlaciona.py
```

Produza `correlacao-rede.md`:

| Porta | Proto | Processo | `uid` | Unit | Justificativa |
|---|---|---|---|---|---|
| | | | | | |

**Responda:**

1. **Toda porta em escuta tem processo identificado?**
2. Alguma porta **sem justificativa**? Qual?
3. Qual porta escuta em **`0.0.0.0`** sem precisar?
4. **Qual serviço você questionaria** primeiro?

### Passo 3 — A regra de auditoria contra a de detecção (50 min)

⚠ **Agora você escreve as duas: a de firewall e a de log.**

```bash
cd ~/lab/mod08

echo "═══ 1. regra de firewall: política padrão segura ═══"
cat <<'EXPL'
  O CORRETO (nega por padrão, permite por exceção):

    # interface de loopback: tudo
    nft add rule inet filter input iif lo accept

    # conexões estabelecidas: aceitar (é resposta)
    nft add rule inet filter input ct state established,related accept

    # SSH: só da rede de gestão
    nft add rule inet filter input tcp dport 22 ip saddr 10.0.0.0/8 accept

    # ICMP mínimo
    nft add rule inet filter input ip protocol icmp icmp type echo-request accept

    # ⚠ tudo o mais: DROP, e REGISTRA
    nft add rule inet filter input log prefix "IN-DROP: " drop

  ⚠ a última linha é a diferença entre bloquear e DETECTAR.
EXPL

echo
echo "═══ 2. o mesmo em iptables ═══"
cat <<'EXPL'
    iptables -P INPUT DROP
    iptables -P FORWARD DROP
    iptables -P OUTPUT ACCEPT        # ⚠ saída: aceite ou lista?
    iptables -A INPUT -i lo -j ACCEPT
    iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    iptables -A INPUT -p tcp --dport 22 -s 10.0.0.0/8 -j ACCEPT
    iptables -A INPUT -j LOG --log-prefix "IN-DROP: " --log-level 4
    iptables -A INPUT -j DROP

  ⚠ OUTPUT ACCEPT é o padrão e é o mais comum.
     Tempo real: listar destinos legítimos e negar o resto.
EXPL

echo
echo "═══ 3. a regra de DETECÇÃO — o que registrar ═══"
cat <<'EXPL'
  O que vale registrar (alto sinal):
    · conexão de ENTRADA negada          → tentativa de acesso
    · conexão de SAÍDA para destino novo → ⚠ exfiltração
    · porta incomum em LISTEN            → ⚠ backdoor
    · mudança em hora de baixo movimento → ⚠ anomalia

  O que NÃO vale (ruído):
    · todo pacote aceito                 → volume absurdo
    · scan de porta comum                → constante na internet

  ⚠ log em excesso é igual a log nenhum: ninguém lê.
EXPL

echo
echo "═══ 4. testando uma regra de log ═══"
echo "  ⚠ demonstração na VM — usa um namespace de rede isolado"
echo

sudo unshare --net --fork sh -c '
    ip link set lo up 2>/dev/null
    # política padrão DROP no namespace
    iptables -P INPUT DROP 2>/dev/null
    iptables -P OUTPUT DROP 2>/dev/null
    iptables -A INPUT -i lo -j ACCEPT 2>/dev/null
    iptables -A OUTPUT -o lo -j ACCEPT 2>/dev/null

    echo "    política do namespace:"
    iptables -L -n 2>/dev/null | grep Chain | sed "s/^/      /"
    echo
    echo "    ⚠ este namespace tem firewall PRÓPRIO,"
    echo "       independente do host — é o módulo 6 na prática"
' 2>/dev/null || echo "  (requer privilégio)"
```

⚠ **A seção 3 é a lição mais útil do módulo.** **Log em excesso é igual a log nenhum.** A regra
correta registra **o que muda o risco**, não tudo. **E isso é o que o módulo 9 vai formalizar.**

⚠ **E a seção 4 demonstra o namespace na prática:** o firewall que você escreveu **vale só ali
dentro**. **É a razão pela qual contêiner precisa da própria política.**

**Produza `regras.md`:**

| Regra | Tipo | O que faz | Justificativa |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Qual a política padrão** que você recomenda? Por quê?
2. **Por que `OUTPUT ACCEPT` é o mais comum e o mais arriscado?**
3. Qual regra de `LOG` você colocaria? **E qual você não colocaria?**
4. **Por que log em excesso é igual a log nenhum?**

### Critérios de aceitação

- `decodifica-socket.py` rodando, com os **quatro** arquivos de `/proc/net` lidos.
- Você explicou o **formato** de `/proc/net/tcp` e a **inversão** do endereço.
- `quem-escuta.py` relacionando socket com **processo** e **`cmdline`**.
- Você identificou socket **sem processo visível** e as **três causas** possíveis.
- `firewall.md` com política padrão, regras de `LOG` e a implicação de namespace.
- Você demonstrou que **namespace de rede tem firewall próprio**.
- `saida.md` com as conexões de saída e a análise de destino.
- Você explicou **por que o achado de saída exige conhecer o ambiente**.
- `auditoria-rede.md` com os **oito** blocos e os `sysctl` conferidos.
- `correlacao-rede.md` com **porta → processo → unit** preenchido.
- Você escreveu a regra de **firewall** e a de **detecção**, e explicou a diferença.
- Você explicou por que **log em excesso é igual a log nenhum**.

---

## Avaliação

1. O que `/proc/net/tcp` contém, e por que ele é **por namespace**?
2. **Por que o endereço aparece invertido?** Converta `0100007F:0016`.
3. O que a coluna `inode` relaciona? Como isso fecha o ciclo do módulo 7?
4. O que `uid` de um socket significa, e por que é informação de auditoria?
5. O que `CLOSE_WAIT` indica? Por que muitos é achado?
6. **Como você descobre qual processo tem qual conexão?** Descreva o método.
7. O que "socket sem processo visível" pode significar? Cite as três causas.
8. **Por que `iptables` é por namespace?** Qual a consequência para contêiner?
9. Por que "o firewall bloqueia" pode ser **falso** num contêiner?
10. **Como você audita o firewall de um contêiner?**
11. Por que a política padrão `ACCEPT` na `INPUT` é achado?
12. **Por que a ausência de regra de `LOG` é achado de detecção?**
13. Cite cinco coisas a olhar numa conexão de saída.
14. **Por que porta `:4444` não é prova**, e o que é?
15. Descreva os cinco passos da auditoria de saída.
16. Qual passo exige **conhecer o cliente**, e qual exige **tempo**?
17. Quais valores seguros de `ip_forward`, `accept_redirects` e `rp_filter`?
18. **Por que `OUTPUT ACCEPT` é o padrão arriscado?**
19. O que vale registrar num `LOG` de firewall, e o que **não** vale?
20. **Por que log em excesso é igual a log nenhum?**

---

**Próximo:** [Módulo 9 — Log, `auditd` e detecção](modulo-09.md)
