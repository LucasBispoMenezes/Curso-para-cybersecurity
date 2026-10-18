# Módulo 9 — TLS, HTTP/2 e Interceptação

**Carga:** 3 horas (1h15 teoria · 1h45 lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Ler um handshake TLS 1.3 numa captura, mensagem por mensagem.
2. Explicar **exatamente** o que um observador de rede vê e não vê com TLS 1.3.
3. Entender o papel do SNI, do certificado e do ALPN.
4. Explicar o modelo de confiança que sustenta um proxy de interceptação — e o que ele custa.
5. Demonstrar, no próprio laboratório, um proxy que lê depois do TLS.
6. Reconhecer o que sobra de visível mesmo com tráfego cifrado.

---

## ⚠ Ética — este é o módulo com a linha mais fina do curso

Interceptação de TLS é uma técnica com uso legítimo e uso criminoso, e a diferença é **toda**
de contexto.

**Legítimo:**
- Interceptar TLS em endpoint **próprio**, com certificado próprio, para depurar sua própria
  aplicação.
- Inspeção corporativa **com aviso aos usuários**, política escrita, e base legal — é o modelo
  de proxy de inspeção em empresa.
- Analisar captura que contém TLS, sem decifrar: você vê metadados, e isso é permitido.

**Crime, sem meio-termo:**
- Interceptar TLS de terceiro sem consentimento nem base legal. (Brasil: Lei 9.296/96 para
  interceptação de comunicação; art. 154-A do Código Penal.)
- Instalar CA raiz na máquina de alguém sem autorização.
- Usar proxy de interceptação para capturar credenciais de quem não sabe que está sendo
  observado.

⚠ **A regra inegociável do lab:** você gera o certificado, você é o cliente, você é o servidor.
Tudo em `10.10.10.0/24`. **Nenhuma técnica deste módulo deve ser usada contra máquina que não é
sua, mesmo "só para testar".**

⚠ **Trabalhe numa VM descartável.** Instalar uma CA raiz na sua máquina principal é um risco que
você não precisa correr, e remover depois é chato.

---

## 9.1 O que TLS resolve

TLS (RFC 8446 para a versão 1.3) resolve **três** problemas, e vale separá-los porque cada um
tem consequência distinta para quem observa a rede:

| Propriedade | O que garante | O que um observador vê |
|---|---|---|
| **Confidencialidade** | Ninguém lê o conteúdo | Metadados, não o payload |
| **Integridade** | Ninguém altera sem detecção | Só é possível perceber pelo comportamento |
| **Autenticidade** | O servidor é quem diz ser | O certificado é público e visível |

⚠ **A terceira é a que importa para este módulo.** O certificado é **público por design** — o
TLS precisa dele para autenticar. Isso significa que, **mesmo sem quebrar nada**, um observador
de rede vê qual domínio está sendo acessado.

---

## 9.2 O handshake TLS 1.3

TLS 1.3 reduziu o handshake para **um RTT** (ou zero em retomada). A estrutura é:

```
CLIENTE                                                          SERVIDOR

   │  ── ClientHello ─────────────────────────────────────────▶  │
   │     · versões suportadas (1.3, 1.2)                          │
   │     · grupos de chave (X25519, P-256)                        │
   │     · *******SNI = exemplo.lab*******                        │  ← VISÍVEL
   │     · ALPN = h2, http/1.1                                    │  ← VISÍVEL
   │     · key_share (chave pública efêmera)                      │
   │                                                              │
   │  ◀──────────────────────────── ServerHello ────────────────  │
   │     · versão escolhida (1.3)                                 │
   │     · cipher suite                                           │
   │     · key_share do servidor                                  │
   │                                                              │
   │  ◀────────────── {EncryptedExtensions} ───────────────────   │  ← CIFRADO
   │  ◀────────────── {Certificate} ───────────────────────────   │  ← CIFRADO em 1.3!
   │  ◀────────────── {CertificateVerify} ─────────────────────   │  ← CIFRADO
   │  ◀────────────── {Finished} ──────────────────────────────   │  ← CIFRADO
   │                                                              │
   │  ── {Finished} ───────────────────────────────────────────▶  │
   │                                                              │
   │  ═══════ canal cifrado estabelecido ═══════                  │
   │                                                              │
   │  ── {Application Data: GET / HTTP/2} ────────────────────▶   │
```

### ⚠ A mudança que quase ninguém percebe no TLS 1.3

**No TLS 1.2, o certificado ia em claro.** Um observador de rede podia ler o certificado e
extrair o nome do domínio.

**No TLS 1.3, o certificado vai CIFRADO.** O que sobra em claro é:

| Visível em claro | Onde |
|---|---|
| **SNI** — o nome do domínio | ClientHello |
| **ALPN** — o protocolo (h2, http/1.1) | ClientHello |
| Versão do TLS | ClientHello |
| Cipher suites oferecidos | ClientHello |
| Tamanho e timing dos pacotes | Toda a conexão |
| IP de destino | Camada 3, sempre visível |

**Consequência prática e importante:** o SNI continua visível, então o domínio ainda é
observável. Por isso existe **ECH (Encrypted Client Hello)** — que cifra o SNI também — e é por
isso que ele é tema ativo.

⚠ **Isso muda o que você pode concluir numa captura.** Em TLS 1.3 você **não vê** o certificado
em claro, **não vê** o nome alternativo, e não vê validade. Você vê o SNI. E o SNI **não é
verificado** por nada — o cliente pode colocar qualquer coisa ali. Um malware pode pôr
`www.google.com` no SNI e conectar a um IP que não é do Google. **SNI é indício, não prova.**

### Lendo a captura

```bash
# Capture o handshake
sudo tcpdump -i eth0 -nn -s 0 -w tls.pcap 'tcp port 8443' &
sleep 1
curl -sk https://10.10.10.10:8443/ > /dev/null
sleep 1
```

```bash
# Versão do TLS negociada
tshark -r tls.pcap -Y 'tls.handshake.type == 2' -T fields \
  -e tls.handshake.version -e tls.handshake.ciphersuite

# SNI anunciados — você vê os domínios mesmo sem decifrar
tshark -r tls.pcap -Y 'tls.handshake.extensions_server_name' -T fields \
  -e ip.dst -e tls.handshake.extensions_server_name

# ALPN — que protocolo de aplicação
tshark -r tls.pcap -Y 'tls.handshake.extensions_alpn_str' -T fields \
  -e tls.handshake.extensions_alpn_str

# Confirme: o certificado aparece em claro?
tshark -r tls.pcap -Y 'tls.handshake.type == 11' | wc -l
# Em TLS 1.3: 0 mensagens de Certificate em claro (a mensagem existe, mas cifrada)
```

### Certificado à mão (o caminho educativo)

```bash
# Extraia o certificado do servidor
openssl s_client -connect 10.10.10.10:8443 -servername exemplo.lab </dev/null 2>/dev/null \
  | openssl x509 -noout -text | head -40

# Só o essencial
openssl s_client -connect 10.10.10.10:8443 -servername exemplo.lab </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

**Vale fazer isso uma vez.** Você vê a cadeia, o emissor, as datas, os nomes alternativos. É a
informação que, no TLS 1.2, um observador veria de graça — e que no 1.3 exige quebrar a cifra.

---

## 9.3 HTTP/2 sobre TLS

Todo tráfego web moderno é HTTP/2 (ou HTTP/3) sobre TLS. Isso muda o que você vê.

### O que HTTP/2 mudou

| HTTP/1.1 | HTTP/2 |
|---|---|
| Uma requisição por conexão (ou com pipelining problemático) | **Multiplexação** — várias requisições na mesma conexão |
| Texto legível | **Binário**, em frames |
| Cabeçalhos em texto | Cabeçalhos comprimidos com **HPACK** |
| Cabeçalho `Host` | Pseudo-cabeçalho `:authority` |

⚠ **Consequências para análise:**

1. **Multiplexação** significa que você não consegue mais correlacionar "uma conexão = uma
   requisição". Uma única conexão TLS transporta dezenas de requisições intercaladas.
2. **HPACK** comprime cabeçalhos usando um dicionário dinâmico. Sem o estado da conexão, você
   não consegue decodificar. Um `.pcap` isolado não basta.
3. **Binário** significa que grep no payload não funciona.

Por isso, quando você decifra TLS no Wireshark, precisa configurar a **chave de sessão** — não
basta ter o `.pcap`.

### ALPN: como você sabe que é h2

```bash
tshark -r tls.pcap -Y 'tls.handshake.extensions_alpn_str' -T fields \
  -e tls.handshake.extensions_alpn_str | sort -u
# h2
# http/1.1
```

### Decifrando com a chave de sessão (para análise própria)

Quando você controla o cliente, pode exportar a chave e decifrar a captura:

```bash
# Chrome/Firefox: exportar as chaves para um arquivo
export SSLKEYLOGFILE=~/tls-keys.log

# No Wireshark: Preferences → Protocols → TLS → (Pre)-Master-Secret log filename
# No tshark:
tshark -r tls.pcap -o tls.keylog_file:~/tls-keys.log -Y 'http2' -T fields \
  -e http2.headers.method -e http2.headers.path -e http2.headers.authority
```

⚠ **`SSLKEYLOGFILE` só funciona em cliente que você controla.** É a ferramenta correta para
depurar sua aplicação. Não existe técnica legítima de "decifrar captura de terceiro" — é
exatamente esse o propósito do TLS.

---

## 9.4 O que sobrevive sem decifrar — e é muito

Este é o conteúdo mais útil deste módulo para trabalho real. Mesmo com TLS 1.3, **você vê muita
coisa**, e é o suficiente para muito diagnóstico.

| Visível | Como você observa | Para que serve |
|---|---|---|
| **SNI** | `tls.handshake.extensions_server_name` | Qual domínio — inventário de destinos |
| **IP de destino** | `ip.dst` | Onde realmente conectou |
| **Tamanho dos pacotes** | `frame.len` | Perfil de tráfego: download, upload, beacon |
| **Timing** | `frame.time_epoch` | Periodicidade, beacon, latência |
| **Duração** | primeira e última timestamp | Conexões curtas vs. longas |
| **Volume por conexão** | `tshark -z conv,tcp` | Quanto dado saiu |
| **ALPN** | opção de extensão | h2, http/1.1 |
| **Certificado** | `tls.handshake.type == 11` | **Só em TLS 1.2** |
| **Padrão de retransmissão** | `tcp.analysis.*` | Qualidade do caminho |
| **RST e FIN** | `tcp.flags` | Comportamento de conexão |

⚠ **A combinação disso identifica aplicação.** Sem decifrar nada:

- Conexão curta, 100 bytes de upload, 200 de download, a cada 60s → **beacon de C2**.
- Conexão longa, 50 MB de download → **streaming ou atualização**.
- Muitos SNIs diferentes, cada um com poucos kB → **navegação normal**.
- Um único SNI desconhecido, tráfego constante → **suspeito**.
- SNI `www.google.com` com IP que não é do Google → **alto indício de C2 com disfarce**.

```bash
# Perfil de cada conexão TLS: duração, volume, SNI
tshark -r tls.pcap -q -z conv,tcp

# SNI + IP real — a discrepância é o achado
tshark -r tls.pcap -Y 'tls.handshake.extensions_server_name' -T fields \
  -e ip.dst -e tls.handshake.extensions_server_name | sort -u

# Tamanho médio de pacote por conversa (upload pesado vs. download)
tshark -r tls.pcap -T fields -e tcp.stream -e frame.len | \
  awk '{s[$1]+=$2; n[$1]++} END {for (k in s) printf "stream %s: %d pacotes, média %.0f bytes\n", k, n[k], s[k]/n[k]}' | sort
```

---

## 9.5 Interceptação: o modelo de confiança

Agora a parte que exige cuidado. **Como um proxy consegue ler tráfego TLS?**

Ele **não quebra a criptografia**. Ele explora o modelo de confiança do TLS de forma legítima —
desde que tenha autorização para estar no meio.

### O fluxo de um proxy de interceptação

```
                    ┌──────────────────────────┐
CLIENTE             │      PROXY               │          SERVIDOR
                    │                          │
   │  ── ClientHello ──▶│                      │
   │  (SNI: banco.lab)  │  vê o SNI            │
   │                    │  ── ClientHello ──▶  │
   │                    │  ◀── cert do banco ──│
   │                    │  valida (é legítimo) │
   │                    │                      │
   │                    │  gera cert PRÓPRIO   │
   │                    │  para banco.lab,     │
   │                    │  assinado pela CA    │
   │                    │  RAIZ DO PROXY       │
   │  ◀── cert (CA proxy)│                     │
   │  valida: a CA do    │                     │
   │  proxy está no meu  │                     │
   │  trust store ✓      │                     │
   │                    │                      │
   │  ═══ TLS com o proxy ═══      ═══ TLS com o servidor ═══
   │                    │                      │
   │  ── GET /saldo ───▶│  decifra, LÊ, reencifra ──▶│
   │  ◀── resposta ─────│  ◀────── resposta ─────────│
```

**Três observações centrais:**

1. **O TLS não foi quebrado.** Há duas conexões TLS independentes. O proxy tem uma com o cliente
   e outra com o servidor. Ele é um *man-in-the-middle* **autorizado**.

2. **Só funciona porque a CA do proxy está no trust store do cliente.** O cliente valida o
   certificado; se a CA do proxy não estiver instalada, a validação falha e o cliente aborta.
   **Isso é a defesa funcionando.**

3. **A confiança foi transferida.** O cliente não está mais confiando na CA que emitiu o
   certificado do banco — está confiando na CA do proxy. **A garantia de ponta a ponta foi
   perdida**, e é substituída por "eu confio em quem opera o proxy".

### ⚠ O que isso custa — e por que é uma decisão, não um detalhe

| Custo | Consequência |
|---|---|
| Fim do **end-to-end** | Quem opera o proxy pode ler tudo: senhas, tokens, conteúdo |
| **Certificate pinning** quebra | Apps que fixam o certificado deixam de funcionar |
| **Superfície de ataque nova** | O proxy decifra dado sensível; ele vira alvo de valor |
| **Log e retenção de dado pessoal** | Cabe à LGPD: base legal, minimização, prazo |
| **CA raiz vale por tudo** | Se a CA do proxy vazar, qualquer certificado pode ser forjado |

⚠ **`certificate pinning` é a defesa certa do lado cliente.** Um app que fixa a chave pública
esperada **não** aceita o certificado do proxy, mesmo que a CA esteja no trust store. É por isso
que muitos apps de banco não funcionam atrás de proxy de inspeção — e isso não é bug, é
segurança funcionando.

---

## 9.6 LAB — Interceptação no seu próprio laboratório

**Duração:** 105 min
**Objetivo:** montar servidor TLS, capturar o handshake, inspecionar o que é visível, e
demonstrar interceptação com proxy — tudo com certificado que você mesmo gera.

⚠ **Use uma VM descartável.** Você vai instalar uma CA raiz nesta máquina.

### Parte A — Servidor TLS próprio (20 min)

```bash
mkdir -p ~/redes-lab/lab9 && cd ~/redes-lab/lab9

# 1. CA raiz do laboratório
openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
  -keyout lab-ca.key -out lab-ca.crt \
  -subj "/CN=CA do Laboratorio Redes" \
  -addext "basicConstraints=critical,CA:TRUE"

# 2. Certificado do servidor, assinado pela CA do lab
openssl req -newkey rsa:2048 -nodes \
  -keyout servidor.key -out servidor.csr \
  -subj "/CN=exemplo.lab"

openssl x509 -req -in servidor.csr -CA lab-ca.crt -CAkey lab-ca.key \
  -CAcreateserial -out servidor.crt -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:exemplo.lab,DNS:www.exemplo.lab\nbasicConstraints=CA:FALSE")

# 3. Servidor HTTPS na 8443
python3 - <<'EOF' &
import http.server, ssl, socketserver
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type","text/plain")
        self.end_headers()
        self.wfile.write(b"RESPOSTA-SEGRETA-DO-LAB")
    def log_message(self,*a): pass
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain("servidor.crt","servidor.key")
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", 8443), H) as s:
    s.socket = ctx.wrap_socket(s.socket, server_side=True)
    s.serve_forever()
EOF
sleep 1
```

### Parte B — Handshake e o que é visível (30 min)

```bash
sudo tcpdump -i eth0 -nn -s 0 -w tls-lab.pcap 'tcp port 8443' &
sleep 1

curl -sk --http1.1 https://10.10.10.10:8443/ > /dev/null
curl -sk --http2    https://10.10.10.10:8443/ > /dev/null 2>&1 || true
sleep 2
```

```bash
# Versão negociada
tshark -r tls-lab.pcap -Y 'tls.handshake.type == 2' -T fields \
  -e ip.dst -e tls.handshake.version -e tls.handshake.ciphersuite

# SNI — visível
tshark -r tls-lab.pcap -Y 'tls.handshake.extensions_server_name' -T fields \
  -e tls.handshake.extensions_server_name

# ALPN
tshark -r tls-lab.pcap -Y 'tls.handshake.extensions_alpn_str' -T fields \
  -e tls.handshake.extensions_alpn_str

# Certificado em claro? (TLS 1.3 → não)
tshark -r tls-lab.pcap -Y 'tls.handshake.type == 11' -T fields -e tls.handshake.certificate | head
```

**Produza `visivel.md`:**

| Informação | Visível? | Onde você a encontrou |
|---|---|---|
| Versão do TLS | | |
| Cipher suite | | |
| **SNI (domínio)** | | |
| ALPN (protocolo) | | |
| Certificado completo | | |
| Nome no certificado | | |
| Payload (`RESPOSTA-SEGRETA-DO-LAB`) | | |

**Responda:**

1. **O payload apareceu em algum lugar da captura?** Prove com `grep` no arquivo.
2. Que versão do TLS foi negociada? Ela é 1.3?
3. O certificado apareceu em claro? Como você confirmou?
4. **Que informação um atacante com acesso à rede ainda consegue obter**, mesmo sem decifrar?
5. Se o SNI pode ser qualquer coisa, que conclusão você **não pode** tirar dele?

### Parte C — Interceptação com proxy (40 min)

```bash
# 1. CA de interceptação (a que ficaria no trust store do cliente)
openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
  -keyout proxy-ca.key -out proxy-ca.crt \
  -subj "/CN=CA de Interceptacao do Lab"

# 2. Gere um certificado para exemplo.lab assinado por essa CA
openssl req -newkey rsa:2048 -nodes -keyout proxy-servidor.key -out proxy-servidor.csr \
  -subj "/CN=exemplo.lab"
openssl x509 -req -in proxy-servidor.csr -CA proxy-ca.crt -CAkey proxy-ca.key \
  -CAcreateserial -out proxy-servidor.crt -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:exemplo.lab,DNS:www.exemplo.lab\n")

# 3. Servidor "falso" na porta 9443, usando o cert do proxy
python3 - <<'EOF' &
import http.server, ssl
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type","text/plain")
        self.end_headers()
        self.wfile.write(b"RESPOSTA-FALSA-VISTA-PELO-PROXY")
    def log_message(self,*a): pass
srv = http.server.HTTPServer(("0.0.0.0", 9443), H)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain("proxy-servidor.crt", "proxy-servidor.key")
srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
srv.serve_forever()
EOF
sleep 1

echo "=== 1. SEM confiar na CA do proxy (deve FALHAR) ==="
curl -s --cacert lab-ca.crt https://127.0.0.1:9443/ ; echo "code=$?"

echo "=== 2. Confiando na CA do proxy (deve FUNCIONAR) ==="
curl -s --cacert proxy-ca.crt https://exemplo.lab:9443/ --resolve exemplo.lab:9443:127.0.0.1
echo
```

⚠ **Este é o ponto do laboratório.** O mesmo servidor, o mesmo cliente: a única coisa que mudou
foi **qual CA o cliente confia**. É toda a diferença entre interceptação legítima e ataque.

**Produza `interceptacao.md`:**

| Cenário | Cliente confia em | Resultado | Por quê |
|---|---|---|---|
| Servidor real do lab | `lab-ca.crt` | | |
| Servidor do proxy | `proxy-ca.crt` | | |
| Servidor do proxy | `lab-ca.crt` | | |

**Responda:**

1. No cenário 2, **o cliente sabia que estava falando com o proxy?** Por quê?
2. No cenário 3, qual foi o erro exato? Capture com `-v` e cole a mensagem.
3. Por que `certificate pinning` derrotaria o cenário 2 mesmo com a CA instalada?
4. **Quem está no meio, no cenário 2 que funcionou?** Descreva as duas conexões TLS.
5. Que proteção, do lado cliente, detectaria a interceptação **sem** depender do trust store?

```bash
# Dica: compare a impressão digital do certificado
openssl s_client -connect 10.10.10.10:8443 -servername exemplo.lab </dev/null 2>/dev/null \
  | openssl x509 -noout -fingerprint -sha256
openssl s_client -connect 127.0.0.1:9443 -servername exemplo.lab </dev/null 2>/dev/null \
  | openssl x509 -noout -fingerprint -sha256
```

### Parte D — Perfil sem decifrar (15 min)

Volte ao `tls-lab.pcap` e extraia **sem decifrar nada**:

```bash
# Inventário de destinos e SNI
tshark -r tls-lab.pcap -Y 'tls.handshake.extensions_server_name' -T fields \
  -e ip.dst -e tls.handshake.extensions_server_name | sort -u

# Perfil por conversa
tshark -r tls-lab.pcap -q -z conv,tcp

# Distribuição de tamanho de pacote
tshark -r tls-lab.pcap -T fields -e frame.len | sort -n | uniq -c | tail -20
```

**Escreva `perfil.md`:** com **zero** decifração, descreva o que aconteceu nesta captura como se
fosse um relatório de triagem. Quantas conexões, para onde, quanto dado, por quanto tempo, que
protocolo. **Que conclusão sobre a aplicação você consegue chegar sem ler o conteúdo?**

### Limpeza (obrigatória)

```bash
# Mate os servidores
pkill -f "8443" 2>/dev/null || true
pkill -f "9443" 2>/dev/null || true

# Remova a CA de qualquer trust store onde você a tenha instalado
# (se você seguiu o lab, não instalou em nenhuma — confirme)
rm -f proxy-ca.srl lab-ca.srl

# Se você ESTIVER numa VM descartável, destrua a VM
```

### Critérios de aceitação

- `visivel.md` com a tabela preenchida, **incluindo a prova de que o payload não aparece**.
- Você confirmou a versão do TLS negociada (1.3).
- Você comprovou que o certificado **não** aparece em claro em TLS 1.3.
- `interceptacao.md` com os três cenários e a mensagem de erro exata do cenário 3 capturada.
- Você explicou por que o cenário 2 funciona — **as duas conexões TLS**, não "quebrou a cifra".
- Você identificou uma defesa do lado cliente que não depende do trust store.
- `perfil.md` descreve a captura **sem decifração**, com o que é conclusível e o que não é.
- **Nenhuma CA instalada na máquina principal.** Confirme no relatório.

---

## Avaliação

1. Cite as três propriedades que o TLS garante e diga qual delas faz o certificado ser público.
2. Descreva o handshake TLS 1.3 nas mensagens principais. Quantos RTTs?
3. **O que muda entre TLS 1.2 e TLS 1.3 no que um observador consegue ver?** Seja específico.
4. O que é SNI e por que ele continua visível em TLS 1.3? O que é ECH?
5. Por que o SNI **não** é prova de qual serviço está sendo usado? Dê um cenário de abuso.
6. O que a multiplexação de HTTP/2 faz com a correspondência "uma conexão = uma requisição"?
7. Por que HPACK impede que você decodifique cabeçalhos de um `.pcap` isolado?
8. Descreva o fluxo de um proxy de interceptação TLS. **Quantas conexões TLS existem?**
9. O que exatamente determina se o proxy funciona ou é rejeitado? Explique o papel do trust store.
10. O que é `certificate pinning` e por que ele derrota a interceptação?
11. Liste cinco informações que você extrai de uma captura TLS **sem decifrar nada**, e o que
    cada uma revela.
12. Um relatório diz: "o host acessou `www.google.com` — confirmado pelo SNI". Que ressalva
    você faz?
13. Por que `SSLKEYLOGFILE` só é legítimo em cliente que você controla?
14. Que obrigações a LGPD impõe sobre um proxy corporativo de inspeção?

---

**Próximo:** [Módulo 10 — `scapy`, firewall e diagnóstico](modulo-10.md)
