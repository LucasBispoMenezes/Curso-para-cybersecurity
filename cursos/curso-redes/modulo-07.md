# Módulo 7 — Análise com `tshark`

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Dissecar protocolos com `tshark` em vez de ler bytes.
2. Escrever display filters do Wireshark com fluência.
3. Extrair campos específicos em formato tabular para análise posterior.
4. Usar seguimento de fluxo TCP para reconstruir uma conversa.
5. Produzir estatísticas agregadas de uma captura.

---

## ⚠ Ética

Todas as capturas deste módulo são as suas, de `10.10.10.0/24`. O `tshark` tem um poder que
merece destaque:

⚠ **`-z follow,tcp,ascii` reconstrói a conversa legível.** Se a captura contém uma sessão HTTP
com credenciais, você vai **ler as credenciais**. Isso não é hipotético — é a operação normal da
ferramenta. Trate o `.pcap` e o resultado dessa extração como material sensível: cifre, defina
retenção, e destrua ao final do engajamento. Em muitos contratos, essa é uma obrigação
contratual e não só uma boa prática.

---

## 7.1 `tshark` versus `tcpdump`

| | `tcpdump` | `tshark` |
|---|---|---|
| Foco | Captura e filtro BPF | Dissecção de protocolo |
| Saída | Linha resumida por pacote | Árvore de campos do protocolo |
| Filtro | BPF (kernel, pré-captura) | Display filter (pós-dissecção) |
| Reassembly | Não | Sim |
| Estatística | Não | Sim (`-z`) |
| Payload | Hexdump cru | Decodificado por protocolo |
| Velocidade | Muito rápido | Mais lento (disseca tudo) |

**Uso combinado:** capture com `tcpdump` (rápido, filtro preciso), analise com `tshark`.

### Filtro de captura versus display filter

Esta é a confusão mais comum, e vale fixar:

| | Capture filter (`-f`) | Display filter (`-Y`) |
|---|---|---|
| Quando aplica | Antes de capturar | Depois de ler/dissecar |
| Sintaxe | BPF (`tcp port 80`) | Sintaxe Wireshark (`tcp.port == 80`) |
| Pode desfazer? | **Não** | Sim — o pacote está no arquivo |
| Velocidade | Rápido (kernel) | Mais lento (dissecção) |

```bash
# Capture tudo da porta 80, depois mostre só os GET
sudo tshark -i eth0 -f 'tcp port 80' -Y 'http.request.method == "GET"'

# Lendo um arquivo já capturado
tshark -r cap.pcap -Y 'tcp.flags.reset == 1'
```

⚠ **Capture filter muito restritivo é irreversível.** Se você usou `-f 'tcp port 80'` e precisava
também do DNS, o `.pcap` não tem o DNS. **Em captura de incidente, capture mais largo e filtre
depois** — errar para o lado do excesso é reversível; errar para o lado da restrição, não.

---

## 7.2 Os comandos que você vai usar

```bash
# Ler e resumir
tshark -r cap.pcap

# Filtrar
tshark -r cap.pcap -Y 'tcp.port == 8080'

# Só campos, em tabulação
tshark -r cap.pcap -T fields -e ip.src -e ip.dst -e tcp.dstport

# Com cabeçalho
tshark -r cap.pcap -T fields -E header=y -E separator=, \
       -e frame.number -e ip.src -e ip.dst -e tcp.dstport

# Com separador diferente
tshark -r cap.pcap -T fields -E separator='|' -e ip.src -e tcp.dstport

# Exportar para JSON (para processar com jq)
tshark -r cap.pcap -T json | jq '.[0]._source.layers.ip'

# Contar pacotes por protocolo
tshark -r cap.pcap -T fields -e frame.protocols | \
  tr ':' '\n' | sort | uniq -c | sort -rn | head

# Estatísticas prontas
tshark -r cap.pcap -q -z io,stat,1
tshark -r cap.pcap -q -z conv,tcp
tshark -r cap.pcap -q -z endpoints,ip
tshark -r cap.pcap -q -z expert
```

### `-z` — as estatísticas que economizam horas

| `-z` | O que produz |
|---|---|
| `io,stat,1` | Bytes e pacotes por segundo |
| `io,stat,1,"tcp.port==8080"` | Idem, filtrado |
| `conv,tcp` | Lista de conversas TCP com bytes e duração |
| `endpoints,ip` | Tráfego por IP |
| `expert` | **Alertas de anomalia detectados pelo dissector** |
| `follow,tcp,ascii,N` | O fluxo N, em ASCII |

⚠ **`-z expert` é subestimado.** Ele reporta o que os dissectores notaram de errado: checksum
incorreto, retransmissão, conexão recusada, pacote malformado. Numa triagem inicial de captura
grande, é o primeiro comando a rodar.

```bash
tshark -r suspeito.pcap -q -z expert | head -40
```

---

## 7.3 Display filters: os que você precisa

### Estrutura

`protocolo.campo operador valor`

```bash
ip.src == 10.10.10.20
tcp.port == 443
http.request.method == "POST"
dns.qry.name contains "lab"
frame.len > 1000
tcp.flags.syn == 1 and tcp.flags.ack == 0
```

### Operadores

| Operador | Uso |
|---|---|
| `==` `!=` | Igualdade |
| `>` `<` `>=` `<=` | Comparação |
| `contains` | Substring |
| `matches` | Regex (PCRE) |
| `in {a, b, c}` | Conjunto |
| `&&` `\|\|` `!` | Lógicos |

### Os filtros que resolvem 90% dos casos

```bash
# Handshake TCP — apenas SYN
tshark -r cap.pcap -Y 'tcp.flags.syn == 1 && tcp.flags.ack == 0'

# RST
tshark -r cap.pcap -Y 'tcp.flags.reset == 1'

# Retransmissões
tshark -r cap.pcap -Y 'tcp.analysis.retransmission'

# ACK duplicado
tshark -r cap.pcap -Y 'tcp.analysis.duplicate_ack'

# Fast retransmit
tshark -r cap.pcap -Y 'tcp.analysis.fast_retransmission'

# Janela zero
tshark -r cap.pcap -Y 'tcp.window_size == 0'

# Tabela de sequência (dados reais)
tshark -r cap.pcap -Y 'tcp.len > 0'

# HTTP: requisições
tshark -r cap.pcap -Y 'http.request'

# HTTP: requisições POST (possível credencial)
tshark -r cap.pcap -Y 'http.request.method == "POST"'

# HTTP: respostas com erro
tshark -r cap.pcap -Y 'http.response.code >= 400'

# User-Agents distintos
tshark -r cap.pcap -Y 'http.user_agent' -T fields -e http.user_agent | sort -u

# DNS: consultas (não respostas)
tshark -r cap.pcap -Y 'dns.flags.response == 0'

# DNS: NXDOMAIN
tshark -r cap.pcap -Y 'dns.flags.rcode == 3'

# TLS: apenas handshake ClientHello
tshark -r cap.pcap -Y 'tls.handshake.type == 1'

# TLS: SNI anunciado (o nome do site!)
tshark -r cap.pcap -Y 'tls.handshake.extensions_server_name' \
       -T fields -e tls.handshake.extensions_server_name | sort -u

# ICMP só de erro
tshark -r cap.pcap -Y 'icmp.type == 3'

# Pacotes grandes (investigar MTU)
tshark -r cap.pcap -Y 'frame.len > 1400'

# ARP
tshark -r cap.pcap -Y 'arp'
```

N N **O filter `tcp.analysis.*` é o que torna o `tshark` indispensável.** Ele expõe a análise que
o TCPstack fez: retransmissão, duplicata, out-of-order, keep-alive, zero window. Você não precisa
deduzir olhando números de sequência — o dissector já marcou.

⚠ **`tcp.analysis.retransmission` tem sutileza:** o Wireshark marca como retransmissão o pacote
cujo conteúdo **já foi visto**. Se você capturou só um lado da conversa, ou perdeu pacote na
captura, ele vai marcar falso positivo. Sempre confira com o contexto.

---

## 7.4 Extração de campo em formato tabular

Esta é a habilidade que transforma uma captura numa planilha analisável.

### Campos úteis por protocolo

| Protocolo | Campos |
|---|---|
| IP | `ip.src`, `ip.dst`, `ip.ttl`, `ip.len`, `ip.id` |
| TCP | `tcp.srcport`, `tcp.dstport`, `tcp.flags`, `tcp.seq`, `tcp.ack`, `tcp.window_size`, `tcp.len` |
| UDP | `udp.srcport`, `udp.dstport`, `udp.length` |
| HTTP | `http.request.method`, `http.host`, `http.request.uri`, `http.user_agent`, `http.response.code`, `http.cookie` |
| DNS | `dns.qry.name`, `dns.qry.type`, `dns.a`, `dns.flags.rcode` |
| TLS | `tls.handshake.extensions_server_name`, `tls.handshake.version` |
| Frame | `frame.number`, `frame.time_epoch`, `frame.len` |

### Exemplos que resolvem problemas reais

```bash
# Todas as conversas com duração — achar conexão longa e suspeita
tshark -r cap.pcap -q -z conv,tcp | head -30

# Mapa de hosts que falaram com a internet
tshark -r cap.pcap -Y 'ip.dst not in {10.10.10.0/24}' \
  -T fields -e ip.src -e ip.dst -e tcp.dstport | sort -u | head -30

# Inventário de User-Agent — identifica malware que se passa por navegador
tshark -r cap.pcap -Y 'http.user_agent' \
  -T fields -e ip.src -e http.user_agent | sort -u

# Todos os nomes DNS consultados, com contagem
tshark -r cap.pcap -Y 'dns.flags.response == 0' \
  -T fields -e dns.qry.name | sort | uniq -c | sort -rn | head -20

# SNI de cada conexão TLS — você vê os sites mesmo sem TLS quebrado
tshark -r cap.pcap -Y 'tls.handshake.extensions_server_name' \
  -T fields -e ip.dst -e tls.handshake.extensions_server_name | sort -u

# Porta de destino mais frequentes
tshark -r cap.pcap -T fields -e tcp.dstport | sort -n | uniq -c | sort -rn | head -20

# TTL por origem — detecta origem falsificada
tshark -r cap.pcap -T fields -e ip.src -e ip.ttl | sort -u | head -20

# CSV pronto para planilha
tshark -r cap.pcap -T fields -E header=y -E separator=, \
  -e frame.time_epoch -e ip.src -e tcp.srcport -e ip.dst -e tcp.dstport \
  -e tcp.flags -e tcp.len > fluxo.csv
```

⚠ **`-T fields` com `-E separator=,` e campos que contêm vírgula produz CSV quebrado.** Use
tabulação (`-E separator=/t`) ou exporte em JSON e converta com `jq`. É um detalhe pequeno que
estraga a análise depois.

---

## 7.5 Seguimento de fluxo: a conversa reconstruída

O recurso mais poderoso do `tshark`. Ele pega todos os segmentos de uma conversa TCP, ordena por
número de sequência, e mostra o conteúdo como texto.

```bash
# Listar os fluxos
tshark -r cap.pcap -q -z follow,tcp,ascii,0

# Todos os fluxos, um por um
tshark -r cap.pcap -q -z conv,tcp

# Seguir um fluxo específico (índice vem do conv)
tshark -r cap.pcap -q -z follow,tcp,ascii,2

# Só o lado do servidor
tshark -r cap.pcap -q -z follow,tcp,raw,2
```

**Formato da saída:**

```
Follow: tcp,ascii
Filter: tcp.stream eq 2
Node 0: 10.10.10.20:53142
Node 1: 10.10.10.10:8080
===================================================================
GET / HTTP/1.1\r\n
Host: 10.10.10.10:8080\r\n
User-Agent: curl/8.5.0\r\n
\r\n
        <-- direção invertida
HTTP/1.1 200 OK\r\n
Content-Type: text/plain\r\n
Content-Length: 2\r\n
\r\n
OK
```

⚠ **Isto é a conversa inteira, legível.** Se houver `Authorization: Basic`, você lê o
`base64` e decodifica em um comando. Se houver `Cookie`, você tem o token de sessão. **É o
recurso mais útil do módulo e o mais perigoso em mãos erradas.** Use com autorização, e trate o
resultado como dado sensível.

```bash
# Extrair todas as credenciais Basic (só no seu laboratório!)
tshark -r cap.pcap -Y 'http.authorization' \
  -T fields -e ip.src -e http.authorization | while IFS=$'\t' read -r ip auth; do
    echo "$ip -> $(echo "$auth" | awk '{print $2}' | base64 -d 2>/dev/null)"
done
```

⚠ **Não rode o bloco acima contra captura que você não tem autorização para analisar.** O
comando em si é trivial; o contexto é o que define se é auditoria ou crime.

---

## 7.6 LAB — Análise de uma captura de aplicação

**Duração:** 120 min
**Objetivo:** produzir um relatório de análise a partir de uma captura, com campos extraídos.

### Passo 1 — Gere uma captura rica

```bash
mkdir -p ~/redes-lab/lab7 && cd ~/redes-lab/lab7

# Servidor com rotas que geram comportamentos diferentes
python3 - <<'EOF' &
import http.server, socketserver, json, time

class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            corpo = b"raiz"
            self.send_response(200)
        elif self.path == "/lento":
            time.sleep(3)
            corpo = b"devagar"
            self.send_response(200)
        elif self.path == "/erro":
            corpo = b"falhou"
            self.send_response(500)
        elif self.path == "/nao-existe":
            corpo = b"nada"
            self.send_response(404)
        else:
            corpo = b"?"
            self.send_response(200)
        self.send_header("Content-Length", str(len(corpo)))
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(corpo)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        self.rfile.read(n)
        self.send_response(201)
        self.send_header("Content-Length", "2")
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, *a): pass

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", 8080), H) as s:
    s.serve_forever()
EOF
sleep 1
```

**Capture no observador:**

```bash
sudo tcpdump -i eth0 -nn -s 0 -w app.pcap 'host 10.10.10.10 and (tcp port 8080 or udp port 53)' &
```

**Gere o tráfego do cliente:**

```bash
for u in / /lento /erro /nao-existe /; do
    curl -s -o /dev/null -w "%{http_code} $u\n" "http://10.10.10.10:8080$u"
done
curl -s -X POST -d "campo=valor" http://10.10.10.10:8080/enviar -o /dev/null
dig exemplo.lab > /dev/null
dig naoexiste.lab > /dev/null
sleep 2
```

### Passo 2 — Triagem com `-z expert`

```bash
tshark -r app.pcap -q -z expert
tshark -r app.pcap -q -z conv,tcp
tshark -r app.pcap -q -z io,stat,1
```

**Produza `triagem.md`:**

| Métrica | Valor |
|---|---|
| Total de pacotes | |
| Total de conversas TCP | |
| Duração da captura | |
| Alertas do `expert` | |
| A conexão `/lento` aparece como? Por quê? | |

### Passo 3 — Extração de campo

Produza um CSV de fluxo HTTP:

```bash
tshark -r app.pcap -Y 'http.request' -T fields -E header=y -E separator=$'\t' \
  -e frame.number -e ip.src -e http.host -e http.request.method -e http.request.uri \
  -e http.user_agent > requisicoes.tsv

column -t -s$'\t' requisicoes.tsv
```

E um CSV de resposta:

```bash
tshark -r app.pcap -Y 'http.response' -T fields -E header=y -E separator=$'\t' \
  -e frame.number -e ip.src -e http.response.code -e http.content_length \
  -e http.response.phrase > respostas.tsv

column -t -s$'\t' respostas.tsv
```

**Responda em `extracao.md`:**

1. Quantas requisições e quantas respostas? Por que os números podem diferir?
2. Quais códigos de status aparecem, e quantas vezes cada um?
3. Qual requisição demorou mais? Como você mediu isso com `tshark`?

```bash
# Tempo de resposta por requisição
tshark -r app.pcap -Y 'http.request' -T fields \
  -e frame.number -e http.request.uri -e frame.time_epoch | \
python3 -c "
import sys
linhas = [l.strip().split('\t') for l in sys.stdin if l.strip()]
print('requisições em ordem, com timestamp:')
for n, uri, t in linhas:
    print(f'  frame {n:>4}  {uri:<15} {t}')
"
```

### Passo 4 — Seguimento de fluxo

```bash
# Identifique os fluxos
tshark -r app.pcap -q -z conv,tcp

# Siga cada um
for i in 0 1 2 3 4 5; do
    echo "=== stream $i ==="
    tshark -r app.pcap -q -z follow,tcp,ascii,$i 2>/dev/null | head -20
done
```

Produza `fluxos.md` com, para cada fluxo:

| Stream | Cliente | Servidor | Conteúdo (resumo) | Duração |
|---|---|---|---|---|
| 0 | | | | |
| 1 | | | | |

**Responda:** qual fluxo corresponde à requisição `/lento`? Como você confirmou?

### Passo 5 — Análise de DNS

```bash
tshark -r app.pcap -Y 'dns.flags.response == 0' -T fields \
  -e frame.number -e ip.src -e dns.qry.name -e dns.qry.type

tshark -r app.pcap -Y 'dns.flags.rcode == 3' -T fields \
  -e dns.qry.name -e dns.flags.rcode
```

**Responda em `dns.md`:**

1. Quais nomes foram consultados? Qual retornou NXDOMAIN?
2. Como você distinguiria no `tshark` uma consulta de uma resposta?
3. Que campo você usaria para achar TTL baixo ou zero?

### Passo 6 — Relatório final

Consolide tudo em `analise-app.md`, com estas seções:

1. **Resumo** — o que a captura contém, em três frases.
2. **Inventário** — hosts, conversas, protocolos, volume.
3. **Linha do tempo** — as requisições em ordem, com timestamp e status.
4. **Anomalias** — o que chamou atenção e por quê. **Inclua pelo menos uma coisa que você não
   esperava.**
5. **Limitações** — o que a captura **não** permite concluir.
6. **Anexos** — os TSVs gerados.

### Critérios de aceitação

- `triagem.md` com as cinco métricas preenchidas com valores reais.
- `requisicoes.tsv` e `respostas.tsv` gerados e legíveis com `column`.
- `extracao.md` respondendo as três perguntas **com os comandos usados**.
- `fluxos.md` com os fluxos identificados e o `/lento` localizado.
- `dns.md` com o NXDOMAIN encontrado.
- `analise-app.md` com a seção **Limitações** preenchida de forma honesta — o que a captura não
  prova.
- Você usou `-T fields` em pelo menos três análises diferentes.
- Nenhuma captura fora de `10.10.10.0/24`.

---

## Avaliação

1. Qual a diferença entre `-f` (capture filter) e `-Y` (display filter)? Qual deles é reversível
   e por quê isso importa em incidente?
2. Por que, em captura de incidente, é melhor capturar largo e filtrar depois?
3. Escreva o display filter para: "SYN sem ACK, para a porta 443, de 10.10.10.20".
4. Como você acha todas as retransmissões de uma captura? Por que esse filtro pode dar falso
   positivo se você capturou só um lado?
5. Por que `-z expert` é subestimado? Que tipo de coisa ele reporta?
6. Você precisa listar todos os sites visitados sem quebrar TLS. Qual campo do `tshark` você usa?
7. Por que `-E separator=,` pode produzir CSV quebrado? Como evitar?
8. O que `-z follow,tcp,ascii,N` faz? Por que esse comando exige cuidado especial em engajamento?
9. Como você mede o tempo de resposta de uma requisição HTTP com `tshark`?
10. Uma captura mostra 200 requisições e 180 respostas. Liste três razões possíveis.
11. Por que o `tshark` é mais lento que o `tcpdump` na mesma captura?
12. Você recebe um `.pcap` de 5 GB. Qual o primeiro comando a rodar, e por quê?

---

**Próximo:** [Módulo 8 — `traceroute` e o mapeamento de caminho](modulo-08.md)
