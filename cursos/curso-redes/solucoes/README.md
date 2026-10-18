# Soluções de referência

Código de referência dos labs dos dez módulos. **Leia o módulo primeiro.** Estas soluções existem
para destravar, não para substituir o lab.

⚠ **Aviso honesto:** estes scripts foram escritos com cuidado, mas **não foram executados contra
um laboratório real** no momento em que o material foi produzido. Foram revisados linha por linha
para sintaxe, quoting e `set -euo pipefail`, mas podem conter erro de integração com uma versão
específica de ferramenta. Se algo falhar, **suspeite do script antes de suspeitar de você** — e
corrija. A seção de erros comuns de cada módulo ajuda a distinguir os dois casos.

---

## Convenções

- Todos os scripts começam com `set -euo pipefail`.
- Progresso vai para **stderr**; resultado para **stdout**.
- Nenhum script aponta para fora de `10.10.10.0/24`.
- Os scripts são gravados em `scratch/solucoes/` para você copiar ao seu laboratório.

---

## Módulo 1 — `triage.sh`

Script de triagem de disponibilidade com erro controlado. Ver o Módulo 1, seção de lab.

```bash
#!/usr/bin/env bash
#
# triage.sh — triagem de disponibilidade de hosts
# Uso: ./triage.sh -f hosts.txt [-o vivos.txt] [-t 2]
#
set -euo pipefail

ARQUIVO=""
SAIDA=""
TIMEOUT=2
VIVOS=0
MORTOS=0
LOG="triage-$(date +%Y%m%d-%H%M%S).log"

log()   { printf '[%s] %-5s %s\n' "$(date '+%H:%M:%S')" "$1" "$2" >&2; }
falha() { printf '%s\n' "$*" >> "${LOG}"; }

uso() {
    cat >&2 <<'EOF'
Uso: triage.sh -f <arquivo-de-hosts> [-o <saida>] [-t <timeout>]

  -f  arquivo com um host por linha (obrigatório)
  -o  arquivo de saída com os hosts vivos (padrão: stdout)
  -t  timeout em segundos por host (padrão: 2)

Códigos de saída: 0 = achou vivos, 1 = nenhum vivo, 2 = uso incorreto, 3 = erro de dependência
EOF
}

dependencia() {
    local f
    for f in "$@"; do
        if ! command -v "${f}" >/dev/null 2>&1; then
            log ERRO "dependência ausente: ${f}"
            exit 3
        fi
    done
}

testar_host() {
    local host="$1"
    if timeout "${TIMEOUT}" ping -c 1 -W "${TIMEOUT}" "${host}" >/dev/null 2>&1; then
        printf '%s\tvivo\n' "${host}"
        return 0
    fi
    return 1
}

main() {
    local opt
    while getopts ":f:o:t:h" opt; do
        case "${opt}" in
            f) ARQUIVO="${OPTARG}" ;;
            o) SAIDA="${OPTARG}" ;;
            t) TIMEOUT="${OPTARG}" ;;
            h) uso; exit 0 ;;
            :) log ERRO "-${OPTARG} exige um valor"; uso; exit 2 ;;
            \?) log ERRO "opção inválida: -${OPTARG}"; uso; exit 2 ;;
        esac
    done
    shift $((OPTIND - 1))

    [[ -n "${ARQUIVO}" ]] || { log ERRO "-f é obrigatório"; uso; exit 2; }
    [[ -r "${ARQUIVO}" ]] || { log ERRO "não consigo ler: ${ARQUIVO}"; exit 3; }

    dependencia ping timeout

    log INFO "iniciando triagem de ${ARQUIVO}"

    while IFS= read -r linha; do
        # ignora vazias e comentários
        [[ -z "${linha// /}" ]] && continue
        [[ "${linha}" == \#* ]] && continue

        if testar_host "${linha}"; then
            VIVOS=$((VIVOS + 1))
        else
            MORTOS=$((MORTOS + 1))
            falha "${linha} — sem resposta em ${TIMEOUT}s"
        fi
    done < <(if [[ -n "${SAIDA}" ]]; then :; fi; cat "${ARQUIVO}") \
         > "${SAIDA:-/dev/stdout}"

    log INFO "vivos=${VIVOS} mortos=${MORTOS} log=${LOG}"

    if (( VIVOS > 0 )); then
        return 0
    fi
    return 1
}

main "$@"
exit $?
```

### Erros comuns neste script

| Sintoma | Causa | Conserto |
|---|---|---|
| Sempre retorna 0 | `main "$@"` engole o código | `main "$@"; exit $?` |
| Nada na saída | `>` redireciona dentro do loop | Redirecione o loop inteiro, como acima |
| Contador sempre 0 | `while read` em pipe (subshell) | Use `< <(...)` ou `< arquivo` |
| Aborta no primeiro host morto | `set -e` com comando que retorna 1 | Uso dentro de `if` |

---

## Módulo 2 — Handshake TCP: extração de campos

```bash
#!/usr/bin/env bash
#
# handshake.sh — extrai o three-way handshake de uma captura
# Uso: ./handshake.sh <captura.pcap> [porta]
#
set -euo pipefail

CAP="${1:?uso: handshake.sh <captura.pcap> [porta]}"
PORTA="${2:-}"

dep() { command -v tshark >/dev/null 2>&1 || { echo "erro: tshark ausente" >&2; exit 3; }; }
dep

FILTRO='tcp.flags.syn == 1 || tcp.flags.fin == 1 || tcp.flags.reset == 1'
[[ -n "${PORTA}" ]] && FILTRO="(${FILTRO}) && tcp.port == ${PORTA}"

printf 'frame\thorário\tsrc\t\t\t\tdst\t\t\t\tflags\tseq\t\tack\t\twin\tmss\tts_val\n'
printf -- '-----\t-------\t---\t\t\t\t---\t\t\t\t-----\t---\t\t---\t\t---\t---\t------\n'

tshark -r "${CAP}" -Y "${FILTRO}" -T fields \
    -e frame.number \
    -e frame.time_relative \
    -e ip.src \
    -e tcp.srcport \
    -e ip.dst \
    -e tcp.dstport \
    -e tcp.flags.str \
    -e tcp.seq_raw \
    -e tcp.ack_raw \
    -e tcp.window_size_value \
    -e tcp.options.mss_val \
    -e tcp.options.timestamp.tsval \
  | while IFS=$'\t' read -r n t src sp dst dp flags seq ack win mss ts; do
        printf '%s\t%s\t%s:%-6s\t%s:%-6s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
            "${n:-?}" "${t:-?}" "${src:-?}" "${sp:-?}" "${dst:-?}" "${dp:-?}" \
            "${flags:-?}" "${seq:-?}" "${ack:-?}" "${win:-?}" "${mss:--}" "${ts:--}"
    done
```

### Erros comuns

| Sintoma | Causa | Conserto |
|---|---|---|
| Campos vazios | Nome de campo errado para sua versão | `tshark -G fields \| grep -i mss` |
| Só SYN aparece | Servidor não estava escutando | Suba o serviço antes de capturar |
| seq gigantes | Números absolutos | É o esperado com `_raw`; ou use `tcp.seq` para relativo |
| CSV quebrado | Flag `str` contém vírgula | Use tabulação, como acima |

---

## Módulo 3 — Subnetting: verificador

```bash
#!/usr/bin/env bash
#
# subnet.sh — calcula rede, broadcast e hosts de um CIDR
# Uso: ./subnet.sh 10.10.10.200/26
#
set -euo pipefail

CIDR="${1:?uso: subnet.sh <ip>/<prefixo>}"

python3 - "$CIDR" <<'PY'
import ipaddress, sys
try:
    rede = ipaddress.ip_network(sys.argv[1], strict=False)
except ValueError as e:
    sys.exit(f"erro: {e}")

hosts = list(rede.hosts())
print(f"CIDR:        {rede}")
print(f"Máscara:     {rede.netmask}")
print(f"Rede:        {rede.network_address}")
print(f"Broadcast:   {rede.broadcast_address}")
print(f"Endereços:   {rede.num_addresses}")
if hosts:
    print(f"1º host:     {hosts[0]}")
    print(f"Último host: {hosts[-1]}")
    print(f"Hosts util.: {len(hosts)}")
else:
    print("Sem hosts utilizáveis (RFC 3021 / rede de /32)")
PY
```

### Teste que você deve fazer sempre

```bash
# O verificador contra os seus cálculos manuais
for c in 10.10.10.77/24 10.10.10.200/26 10.10.10.200/27 192.168.5.130/25 172.16.4.9/30; do
    ./subnet.sh "$c" | head -2
done
```

---

## Módulo 4 — Retransmissão: contador por conversa

```bash
#!/usr/bin/env bash
#
# retrans.sh — relatório de retransmissão, ACK duplicado e janela zero
# Uso: ./retrans.sh <captura.pcap>
#
set -euo pipefail

CAP="${1:?uso: retrans.sh <captura.pcap>}"
command -v tshark >/dev/null 2>&1 || { echo "erro: tshark ausente" >&2; exit 3; }

contar() {
    local filtro="$1"
    tshark -r "${CAP}" -Y "${filtro}" 2>/dev/null | wc -l
}

total=$(tshark -r "${CAP}" 2>/dev/null | wc -l)

printf '%-32s %s\n' "Métrica" "Valor"
printf '%-32s %s\n' "--------------------------------" "-----"
printf '%-32s %s\n' "Pacotes totais"                "${total}"
printf '%-32s %s\n' "Retransmissões"               "$(contar 'tcp.analysis.retransmission')"
printf '%-32s %s\n' "Fast retransmit"              "$(contar 'tcp.analysis.fast_retransmission')"
printf '%-32s %s\n' "ACKs duplicados"              "$(contar 'tcp.analysis.duplicate_ack')"
printf '%-32s %s\n' "Out-of-order"                 "$(contar 'tcp.analysis.out_of_order')"
printf '%-32s %s\n' "Janela zero"                  "$(contar 'tcp.window_size == 0')"
printf '%-32s %s\n' "RST"                          "$(contar 'tcp.flags.reset == 1')"
printf '%-32s %s\n' "SACK presentes"               "$(contar 'tcp.options.sack')"

echo
echo "=== Conversas (top 10 por pacotes) ==="
tshark -r "${CAP}" -q -z conv,tcp 2>/dev/null | head -15

echo
echo "=== Drop de captura ==="
tshark -r "${CAP}" 2>&1 >/dev/null | grep -i drop || echo "sem informação de drop"
```

---

## Módulo 5 — DNS: entropia e perfil

```bash
#!/usr/bin/env bash
#
# dns-perfil.sh — perfil de consultas DNS, com entropia dos nomes
# Uso: ./dns-perfil.sh <captura.pcap>
#
set -euo pipefail

CAP="${1:?uso: dns-perfil.sh <captura.pcap>}"
command -v tshark >/dev/null 2>&1 || { echo "erro: tshark ausente" >&2; exit 3; }

tshark -r "${CAP}" -Y 'dns.flags.response == 0' -T fields -e dns.qry.name 2>/dev/null \
  | grep -v '^$' \
  | python3 -c '
import sys, math, collections

nomes = [l.strip() for l in sys.stdin if l.strip()]
if not nomes:
    sys.exit("nenhuma consulta DNS encontrada na captura")

def entropia(s):
    if not s:
        return 0.0
    c = collections.Counter(s)
    return -sum((n/len(s)) * math.log2(n/len(s)) for n in c.values())

print(f"{len(nomes)} consultas\n")

# Domínio base (últimos dois rótulos) com contagem
base = collections.Counter(".".join(n.split(".")[-2:]) for n in nomes)
print("=== Domínios consultados ===")
for dom, n in base.most_common(15):
    print(f"{n:>6}  {dom}")

print()
print("=== 15 nomes mais longos, com entropia ===")
print(f"{'chars':>6} {'entropia':>9}  nome")
for n in sorted(nomes, key=len, reverse=True)[:15]:
    print(f"{len(n):>6} {entropia(n):>9.2f}  {n[:80]}")

media = sum(len(n) for n in nomes) / len(nomes)
suspeitos = [n for n in nomes if len(n) > 45 or entropia(n) > 3.8]
print()
print(f"Comprimento médio: {media:.1f}")
print(f"Candidatos a túnel (nome longo OU entropia alta): {len(suspeitos)}")
print()
print("Lembre-se: CDN legítimo gera nomes longos e de alta entropia.")
print("Combine com domínio desconhecido, volume anômalo e periodicidade.")
'
```

---

## Módulo 6 — Filtros BPF: testador

```bash
#!/usr/bin/env bash
#
# bpf-test.sh — valida um filtro BPF e mostra o que ele captura
# Uso: ./bpf-test.sh <captura.pcap> "<filtro bpf>"
#
set -euo pipefail

CAP="${1:?uso: bpf-test.sh <captura.pcap> \"<filtro>\"}"
FILTRO="${2:?informe o filtro BPF}"

printf 'Filtro: %s\n\n' "${FILTRO}"

# Valida a sintaxe
if ! tcpdump -r "${CAP}" -nn -c 1 "${FILTRO}" >/dev/null 2>&1; then
    echo "ERRO: sintaxe de filtro inválida" >&2
    exit 2
fi

total=$(tcpdump -r "${CAP}" -nn 2>/dev/null | wc -l)
casados=$(tcpdump -r "${CAP}" -nn "${FILTRO}" 2>/dev/null | wc -l)

printf 'Total na captura: %s\n' "${total}"
printf 'Casados:          %s\n' "${casados}"
if (( total > 0 )); then
    printf 'Proporção:        %s%%\n' "$(( casados * 100 / total ))"
fi

echo
echo "=== Primeiros 10 casados ==="
tcpdump -r "${CAP}" -nn "${FILTRO}" 2>/dev/null | head -10
```

### Filtros de referência que você deve saber de cor

```bash
'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn'                     # só abertura
'tcp[tcpflags] & tcp-rst != 0'                                     # RST
'udp port 53 and not host 10.10.10.1'                              # DNS fora do resolvedor
'ip[2:2] > 1400'                                                    # pacote grande (MTU)
'icmp and not icmp[icmptype] == 8 and not icmp[icmptype] == 0'     # só ICMP de erro
'not net 10.10.10.0/24'                                             # tráfego externo
'host 10.10.10.20 and tcp port 8080 and greater 200'               # com payload
```

---

## Módulo 7 — `tshark`: extração em TSV

```bash
#!/usr/bin/env bash
#
# extrai.sh — extrai campos de uma captura em TSV, pronto para planilha
# Uso: ./extrai.sh <captura.pcap> <perfil>
# Perfis: http | dns | tls | tcp | conversas
#
set -euo pipefail

CAP="${1:?uso: extrai.sh <captura.pcap> <perfil>}"
PERFIL="${2:?perfis: http dns tls tcp conversas}"

command -v tshark >/dev/null 2>&1 || { echo "erro: tshark ausente" >&2; exit 3; }

# Sempre tabulação: campo com vírgula quebra CSV
E=(-T fields -E header=y -E separator=$'\t' -E quote=d)

case "${PERFIL}" in
    http)
        tshark -r "${CAP}" -Y 'http.request or http.response' "${E[@]}" \
            -e frame.number -e frame.time_relative -e ip.src -e ip.dst \
            -e http.request.method -e http.request.uri -e http.host \
            -e http.user_agent -e http.response.code -e http.content_length
        ;;
    dns)
        tshark -r "${CAP}" -Y 'dns' "${E[@]}" \
            -e frame.number -e frame.time_relative -e ip.src \
            -e dns.flags.response -e dns.qry.name -e dns.qry.type \
            -e dns.flags.rcode -e dns.a
        ;;
    tls)
        tshark -r "${CAP}" -Y 'tls.handshake' "${E[@]}" \
            -e frame.number -e ip.src -e ip.dst \
            -e tls.handshake.type -e tls.handshake.version \
            -e tls.handshake.extensions_server_name \
            -e tls.handshake.extensions_alpn_str
        ;;
    tcp)
        tshark -r "${CAP}" -Y 'tcp' "${E[@]}" \
            -e frame.number -e frame.time_relative -e ip.src -e tcp.srcport \
            -e ip.dst -e tcp.dstport -e tcp.flags -e tcp.seq_raw -e tcp.ack_raw \
            -e tcp.window_size_value -e tcp.len
        ;;
    conversas)
        tshark -r "${CAP}" -q -z conv,tcp
        ;;
    *)
        echo "erro: perfil desconhecido: ${PERFIL}" >&2
        exit 2
        ;;
esac
```

---

## Módulo 8 — `mtr` e interpretação de caminho

```bash
#!/usr/bin/env bash
#
# caminho.sh — compara UDP/ICMP/TCP e mede perda real
# Uso: ./caminho.sh <alvo> [contagem]
#
set -euo pipefail

ALVO="${1:?uso: caminho.sh <alvo> [contagem]}"
N="${2:-100}"

command -v mtr >/dev/null 2>&1 || { echo "erro: mtr ausente" >&2; exit 3; }

echo "=== UDP (não requer root) ==="
mtr -n -r -c "${N}" -w "${ALVO}" 2>/dev/null || true

echo
echo "=== TCP/443 (atravessa firewall que bloqueia UDP/ICMP) ==="
sudo mtr -T -P 443 -n -r -c "${N}" -w "${ALVO}" 2>/dev/null || echo "requer sudo"

echo
echo "=== ICMP ==="
sudo mtr -I -n -r -c "${N}" -w "${ALVO}" 2>/dev/null || echo "requer sudo"

echo
echo "=== Perda no destino final (a que importa) ==="
ping -c "${N}" -q "${ALVO}" 2>/dev/null | tail -3 || echo "sem resposta ICMP"

echo
echo "LEMBRETE: perda em salto intermediário que desaparece no destino"
echo "          NÃO é perda real. Só conta se persistir até o último salto."
```

---

## Módulo 9 — Análise TLS sem decifrar

```bash
#!/usr/bin/env bash
#
# tls-perfil.sh — o que você consegue extrair de TLS 1.3 sem decifrar
# Uso: ./tls-perfil.sh <captura.pcap>
#
set -euo pipefail

CAP="${1:?uso: tls-perfil.sh <captura.pcap>}"
command -v tshark >/dev/null 2>&1 || { echo "erro: tshark ausente" >&2; exit 3; }

echo "=== Versões TLS negociadas ==="
tshark -r "${CAP}" -Y 'tls.handshake.type == 2' -T fields \
    -e tls.handshake.version 2>/dev/null | sort | uniq -c

echo
echo "=== SNI anunciados por IP de destino ==="
printf '%-18s %s\n' "IP DESTINO" "SNI"
tshark -r "${CAP}" -Y 'tls.handshake.extensions_server_name' -T fields \
    -e ip.dst -e tls.handshake.extensions_server_name 2>/dev/null \
  | sort -u | awk -F'\t' '{printf "%-18s %s\n", $1, $2}'

echo
echo "=== ALPN (protocolo de aplicação) ==="
tshark -r "${CAP}" -Y 'tls.handshake.extensions_alpn_str' -T fields \
    -e tls.handshake.extensions_alpn_str 2>/dev/null | sort | uniq -c

echo
echo "=== Certificado aparece em claro? (esperado: 0 linhas em TLS 1.3) ==="
n=$(tshark -r "${CAP}" -Y 'tls.handshake.type == 11 && tls.handshake.certificate' \
      -T fields -e tls.handshake.certificate 2>/dev/null | grep -c . || true)
echo "mensagens de Certificate em claro: ${n}"
if (( n == 0 )); then
    echo "→ Confirma TLS 1.3: o certificado vai cifrado. Só o SNI é visível."
else
    echo "→ Provável TLS 1.2 ou anterior: o certificado é legível."
fi

echo
echo "=== Perfil por conversa (duração e volume) ==="
tshark -r "${CAP}" -q -z conv,tcp 2>/dev/null | head -15

echo
echo "=== Heurística: SNI que não combina com o IP ==="
echo "Compare cada SNI com o IP de destino e o certificado (se visível)."
echo "SNI é autodeclarado e NÃO é verificado por nada."
```

---

## Módulo 10 — Sonda de porta com `scapy`

```python
#!/usr/bin/env python3
"""
sonda.py — classifica porta em aberta / fechada / filtrada usando scapy.
LABORATÓRIO APENAS. Use somente contra hosts na sua rede 10.10.10.0/24.

Uso: sudo python3 sonda.py 10.10.10.10 22 80 443 8080
"""
import sys
from scapy.all import IP, TCP, ICMP, sr1, conf

conf.verb = 0

TIMEOUT = 2


def classifica(host: str, porta: int) -> tuple[str, str]:
    """Retorna (estado, detalhe)."""
    pkt = IP(dst=host) / TCP(dport=porta, flags="S")
    resp = sr1(pkt, timeout=TIMEOUT)

    if resp is None:
        return "FILTRADA", "nenhuma resposta (drop, provável firewall)"

    if resp.haslayer(TCP):
        flags = resp[TCP].flags
        if flags == 0x12:          # SYN + ACK
            return "ABERTA", "SYN-ACK"
        if flags & 0x04:           # RST
            return "FECHADA", "RST (cheguei no host, nada escutando)"
        return "DESCONHECIDO", f"flags TCP = {flags!r}"

    if resp.haslayer(ICMP):
        t, c = resp[ICMP].type, resp[ICMP].code
        mapa = {
            (3, 1):  "host unreachable — problema de roteamento",
            (3, 3):  "port unreachable — chegou no host",
            (3, 10): "administratively prohibited — firewall",
            (3, 13): "administratively prohibited — firewall",
        }
        return "FILTRADA", f"ICMP {t}/{c} — {mapa.get((t, c), 'ver RFC 792')}"

    return "DESCONHECIDO", resp.summary()


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2

    host = sys.argv[1]
    portas = [int(p) for p in sys.argv[2:]]

    # Trava de segurança: só permite a faixa do laboratório
    if not host.startswith("10.10.10."):
        print("ERRO: este script só opera em 10.10.10.0/24 (rede de laboratório).",
              file=sys.stderr)
        return 3

    print(f"{'PORTA':>6}  {'ESTADO':<14} DETALHE")
    print(f"{'-'*6}  {'-'*14} {'-'*45}")

    for porta in portas:
        estado, detalhe = classifica(host, porta)
        print(f"{porta:>6}  {estado:<14} {detalhe}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
```

⚠ **Note a trava na faixa `10.10.10.`** — o script recusa qualquer outro destino. É uma
salvaguarda deliberada: mesmo que você copie o script para outro contexto, ele não vira
ferramenta de varredura de terceiro sem uma edição explícita.

---

## Coletor de evidência para diagnóstico

```bash
#!/usr/bin/env bash
#
# coleta.sh — coleta evidência de rede em todas as camadas, SEM hipótese
# Uso: ./coleta.sh [alvo]
#
set -uo pipefail    # sem -e: queremos que a coleta continue mesmo se um teste falhar

ALVO="${1:-10.10.10.10}"
SAIDA="evidencia-$(date +%Y%m%d-%H%M%S)"
mkdir -p "${SAIDA}"

{
echo "=================== DATA ==================="
date -Is

echo "=================== INTERFACES ============="
ip -br addr

echo "=================== ROTAS =================="
ip route show

echo "=================== ROTA PARA O ALVO ======="
ip route get "${ALVO}" 2>&1

echo "=================== VIZINHOS (ARP/NDP) ====="
ip neigh show

echo "=================== RESOLV ================="
cat /etc/resolv.conf 2>/dev/null || echo "sem /etc/resolv.conf"

echo "=================== PING GATEWAY ==========="
GW=$(ip route | awk '/^default/{print $3; exit}')
if [[ -n "${GW}" ]]; then
    ping -c 3 -W 2 "${GW}" 2>&1
else
    echo "sem gateway padrão"
fi

echo "=================== PING ALVO =============="
ping -c 3 -W 2 "${ALVO}" 2>&1

echo "=================== MTU DAS INTERFACES ====="
ip link show | grep -E '^[0-9]+:|mtu'

echo "=================== TESTE DE MTU ==========="
for s in 1472 1400 1200; do
    if ping -M do -s "${s}" -c 1 -W 2 "${ALVO}" >/dev/null 2>&1; then
        echo "payload ${s} OK  → MTU do caminho >= $((s + 28))"
    else
        echo "payload ${s} FALHOU"
    fi
done

echo "=================== TESTE TCP 8080 ========="
if timeout 3 bash -c "cat < /dev/tcp/${ALVO}/8080" >/dev/null 2>&1; then
    echo "TCP 8080 alcançável"
else
    echo "TCP 8080 NÃO alcançável (fechada, filtrada, ou serviço morto)"
fi

echo "=================== SOCKETS ================"
ss -s

echo "=================== ESTADOS TCP ============"
ss -tan 2>/dev/null | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn

echo "=================== CLOSE-WAIT (bug de app?) ==="
ss -tan 2>/dev/null | grep -c CLOSE-WAIT || echo 0

echo "=================== TIME-WAIT =============="
ss -tan 2>/dev/null | grep -c TIME-WAIT || echo 0

echo "=================== FIREWALL ==============="
sudo nft list ruleset 2>/dev/null | head -50 || echo "nft indisponível ou sem permissão"

echo "=================== CONNTRACK =============="
cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null || echo "indisponível"
cat /proc/sys/net/netfilter/nf_conntrack_max   2>/dev/null || echo "indisponível"

echo "=================== ERROS DE INTERFACE ====="
ip -s link show | grep -A 3 -E '^[0-9]+:'

echo "=================== FIM ===================="
} 2>&1 | tee "${SAIDA}/coleta.txt"

echo
echo "Evidência salva em ${SAIDA}/coleta.txt"
echo
echo "PRÓXIMO PASSO: capture nos DOIS lados antes de formular hipótese."
```

---

## Sobre a qualidade destes scripts

O que foi verificado:

- Sintaxe bash, com `bash -n` mental e revisão de quoting em cada variável.
- `set -euo pipefail` em todos os scripts de produção.
- Separação consistente de stdout (resultado) e stderr (progresso).
- Uso de `local` em toda variável de função.
- `command -v` em vez de `which`.
- `< <(...)` ou `< arquivo` em vez de `| while` onde há atribuição.

O que **não** foi verificado:

- Execução real contra uma captura e um laboratório.
- Compatibilidade com versões específicas de `tshark` — **nomes de campos mudam entre versões
  maiores**. Se um campo não existe na sua, o `tshark` avisa e o script continua com valor vazio.
  Verifique com `tshark -G fields | grep <termo>`.

**Se um script falhar, suspeite dele primeiro.** O material didático é a fonte; o script é
ferramenta. Corrija o script e siga.
