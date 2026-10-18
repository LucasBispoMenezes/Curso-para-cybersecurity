# Módulo 3 — Proxies: HTTP, SOCKS4, SOCKS5

**Carga:** 3 horas (1h15 teoria · 1h45 lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Explicar o mecanismo de um proxy e o que ele **não** protege.
2. Distinguir proxy HTTP, SOCKS4 e SOCKS5, e saber o que cada um encaminha.
3. Medir o **vazamento de DNS** que ocorre quando `remote_dns` está ausente.
4. Demonstrar, na sua própria captura, o que o proxy vê e o que o destino vê.
5. Entender por que proxy **não é anonimato** — é redirecionamento.

---

## ⚠ Conduta

Você vai criar **um proxy seu**, local, e medir o seu próprio tráfego através dele. Nada contra
terceiro. Nenhum proxy de terceiro será usado para interceptar ninguém.

⚠ **A linha específica deste módulo:** entender proxy é entender onde a identidade vaza. Usar proxy
para **interceptar comunicação de terceiro** é crime (Lei 9.296/96) e não está neste curso. Você
configura o proxy, você é o cliente, você é o observador.

---

## 3.1 O que um proxy é — e o que ele não é

Um proxy é um **intermediário**: o cliente fala com o proxy, e o proxy fala com o destino.

```
SEM PROXY                          COM PROXY
┌────────┐          ┌────────┐     ┌────────┐     ┌───────┐     ┌────────┐
│ você   │─────────▶│ destino│     │ você   │────▶│ proxy │────▶│ destino│
└────────┘          └────────┘     └────────┘     └───────┘     └────────┘
   o destino vê                  o destino vê                o proxy vê
   o SEU IP                      o IP DO PROXY               o SEU IP
                                                              e o destino
```

### O que o proxy resolve

| Problema | Proxy resolve? |
|---|---|
| O destino não deve saber meu IP | **Sim** — ele vê o IP do proxy |
| Meu provedor não deve ver o destino | **Só se o proxy for cifrado** (HTTPS/SOCKS sobre TLS) |
| Meu provedor não deve ver o conteúdo | **Não** — só com TLS fim a fim |
| Não quero ser rastreável | **Não** — o proxy te conhece e pode registrar |

⚠ **A última linha é o ponto inteiro.** Um proxy **transfere a confiança**, não a elimina. Você
deixa de confiar em quem te observava e passa a confiar **inteiramente** em uma entidade que agora
vê **tudo**: sua origem, seu destino, e o conteúdo se não houver TLS.

⚠ **Por isso um proxy sozinho não é anonimato — é pseudonimato com um ponto único de confiança.**
O Tor resolve isso distribuindo em três saltos que não se coordenam. O proxy concentra em um.

---

## 3.2 Os três tipos

### Proxy HTTP (CONNECT)

Proxy de aplicação: entende HTTP. Para HTTPS, usa o método `CONNECT`, que abre um túnel TCP cego.

```
1. Cliente → Proxy:  CONNECT exemplo.tld:443 HTTP/1.1
                     Host: exemplo.tld:443
2. Proxy → Cliente:  HTTP/1.1 200 Connection established
3. ─────────────── túnel TCP cego a partir daqui ───────────────
4. Cliente ↔ Destino: handshake TLS normal, o proxy só repassa bytes
```

| Aspecto | Comportamento |
|---|---|
| Entende HTTP? | Sim — vê método, URL, cabeçalho em HTTP puro |
| Vê HTTPS? | **Não** — só o nome (do `CONNECT`) e o tamanho |
| Resolve DNS? | **Sim o proxy**, quando você manda o nome |
| Autenticação | HTTP Basic (`Proxy-Authorization`) |
| Encaminha UDP? | **Não** |

⚠ **No `CONNECT`, o proxy vê o nome do destino** — porque você o envia no pedido. Ele não vê o
conteúdo (TLS), mas vê **com quem** você falou e **quanto** trocou. Isso é o que um administrador
corporativo vê no proxy da empresa.

### SOCKS4

Proxy de transporte, mais simples que o HTTP. Só TCP, sem IPv6, sem autenticação no protocolo.

```
Cliente → SOCKS4:  VN=4, CD=1, DSTPORT, DSTIP (só IPv4!), USERID
SOCKS4 → Cliente:  VN=0, CD=90 (granted) | 91 (rejected)
```

⚠ **SOCKS4 só aceita IPv4 e só conecta a IP** — o que significa que **o cliente resolve o nome
localmente** antes de pedir. Isso é o **vazamento de DNS** (§3.4), e é a razão pela qual SOCKS4 é
considerado obsoleto para privacidade.

### SOCKS5 — o que você vai usar

RFC 1928. Mais capaz, e tem uma extensão que importa muito: **`remote_dns`**.

```
1. Handshake
   Cliente → SOCKS5: 05 01 00          (versão 5, 1 método: sem auth)
   Servidor → SOCKS5: 05 00            (aceito)

2. Autenticação (opcional, RFC 1929)
   Cliente → SOCKS5: 01 <user> <pass>

3. Pedido
   Cliente → SOCKS5: 05 01 00 03 <len> <nome> <porta>
                     └  └  └  └  └ ATYP=03 significa DOMÍNIO
                     │  │  │  └─ reservado
                     │  │  └─── comando: 01=CONNECT
                     │  └────── reservado
                     └───────── versão

4. Resposta
   Servidor → SOCKS5: 05 00 00 01 <ip> <porta>
```

| `ATYP` | Significado |
|---|---|
| `01` | IPv4 |
| `03` | **Domínio** — o proxy resolve |
| `04` | IPv6 |

⚠ **O `ATYP=03` é a diferença entre SOCKS4 e SOCKS5 para privacidade.** Enviando o **domínio** em
vez do IP, o proxy faz a resolução de nome — e **o nome nunca vaza localmente**. É isso que faz o
Tor (que usa SOCKS5 na porta 9050) não vazar DNS.

| | SOCKS4 | SOCKS5 |
|---|---|---|
| IPv4 | Sim | Sim |
| IPv6 | **Não** | Sim |
| Nome de domínio | **Não** — cliente resolve | **Sim** — `ATYP=03` |
| UDP | Não | Sim (`UDP ASSOCIATE`) |
| Autenticação | Só `USERID` | Método negociável (RFC 1929) |

---

## 3.3 O que o proxy vê e o que o destino vê

A tabela que resume o módulo:

| | Vê a origem | Vê o destino | Vê o conteúdo | Vê o nome |
|---|---|---|---|---|
| **Destino** | IP **do proxy** | — | Se TLS, não | — |
| **Proxy** | Seu IP | Sim | **Sim, sem TLS** | Sim |
| **Operador de rede local** | Seu IP | **IP do proxy** | Não (TLS) | Não, com HTTPS |
| **Operador de rede, sem TLS** | Seu IP | Endereço do proxy | **Sim, tudo** | Sim |

⚠ **A segunda coluna da linha "Proxy" é onde um proxy de privacidade falha.** Ele vê o seu IP e o
seu destino em conjunto — **e essa correlação é exatamente o que o anonimato tenta evitar**.
Um proxy honesto apaga; um desonesto ou comprometido entrega.

---

## 3.4 O vazamento de DNS — a demonstração central

Este é o lab, e é o achado que mais surpreende quem começa.

**O mecanismo:**

```
COM remote_dns (SOCKS5 ATYP=03)     SEM remote_dns (o padrão de muita ferramenta)
┌──────┐  nome  ┌───────┐  nome  ┌────────┐   ┌──────┐     ┌───────┐        ┌────────┐
│ você │───────▶│ proxy │───────▶│ destino│   │ você │────▶│  DNS  │ nome!  │ destino│
└──────┘        └───────┘        └────────┘   └──┬───┘     │ local │        └────────┘
  o nome sai pelo túnel                         │         └───────┘
  ninguém local vê                      resolve aqui!          ▲
                                                                │
                                        ┌───────────────────────┘
                                        │  o resolvedor LOCAL viu o nome
                                        │  ANTES de o proxy entrar em ação
                                        ▼
                                    ⚠ VAZAMENTO
```

⚠ **O vazamento acontece antes de o proxy entrar em ação.** O cliente precisa do IP para pedir a
conexão, então pergunta ao resolvedor local — e **o nome já vazou**. Quando o proxy recebe o
pedido, é tarde.

| Ferramenta | Resolve local? | Vaza? |
|---|---|---|
| `curl --socks5-hostname` | **Não** — manda o nome | **Não** |
| `curl --socks5` | **Sim** | **Sim** |
| `proxychains4` (padrão) | Depende da config | Frequentemente **sim** |
| Tor (`9050`) | Não | **Não** |

⚠ **`--socks5` e `--socks5-hostname` são flag diferente no `curl`, e a diferença é o módulo
inteiro.** É literalmente o vazamento em uma letra.

---

## 3.5 LAB A — Monte um proxy seu e meça o vazamento

**Duração:** 70 min

⚠ **Tudo local. O proxy é seu, o cliente é você, o observador é você.**

### Passo 1 — Um proxy SOCKS5 local (20 min)

Vamos usar o `tor` como proxy SOCKS5 — ele é o proxy SOCKS5 mais disponível, e serve para a
demonstração sem que você precise escrever um.

```bash
mkdir -p ~/anon-lab/lab3 && cd ~/anon-lab/lab3

# Inicia o Tor (só o daemon; o cliente SOCKS5 fica em 127.0.0.1:9050)
sudo systemctl start tor 2>/dev/null || tor --SocksPort 9050 &
sleep 5

# Confirme que o SOCKS5 está no ar
ss -tlnp 2>/dev/null | grep 9050
```

⚠ **O `tor` aqui está sendo usado como proxy SOCKS5 local.** Se você não quiser usar Tor por
qualquer motivo, pode usar `ssh -D`:

```bash
# Alternativa: SOCKS5 via túnel SSH (create um proxy local por túnel)
# ssh -D 9050 -N -f usuario@host-que-voce-controla
```

### Passo 2 — Meça o vazamento de DNS (30 min)

**O experimento que importa.** Duas formas de usar o mesmo proxy, e uma vaza.

```bash
# Terminal 1 — capture TODO o DNS que sai da sua máquina
sudo tcpdump -i any -nn -s 0 -w vazamento-dns.pcap 'udp port 53 or tcp port 53' &
TPID=$!
sleep 1

# ── TESTE 1: SOCKS5 resolvendo LOCALMENTE (deve vazar) ──
echo "=== TESTE 1: --socks5 (resolução local) ==="
curl -s --socks5 127.0.0.1:9050 -o /dev/null -w '%{http_code}\n' https://check.torproject.org/ || echo "falhou"
sleep 2

# ── TESTE 2: SOCKS5 resolvendo NO PROXY (não deve vazar) ──
echo "=== TESTE 2: --socks5-hostname (resolução no proxy) ==="
curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null -w '%{http_code}\n' https://check.torproject.org/ || echo "falhou"
sleep 2

kill $TPID 2>/dev/null

# ── ANÁLISE ──
echo
echo "=== Nomes DNS que saíram da sua máquina em claro ==="
tshark -r vazamento-dns.pcap -Y 'dns.flags.response == 0' \
       -T fields -e dns.qry.name 2>/dev/null | sort | uniq -c | sort -rn
```

Produza `vazamento.md`:

| Teste | Flag usada | Nome vazou localmente? | Quantas consultas locais |
|---|---|---|---|
| 1 | `--socks5` | | |
| 2 | `--socks5-hostname` | | |

**Responda:**

1. No teste 1, o nome `check.torproject.org` apareceu na sua captura local? **Quantas vezes?**
2. No teste 2, apareceu? **Por quê não?**
3. **Em qual momento do fluxo o vazamento aconteceu** — antes ou depois do proxy?
4. Se você estivesse usando só `--socks5` achando que estava anônimo, **quem teria visto seu
   destino?**

⚠ **A resposta 3 é o ponto do lab.** O vazamento é **anterior** ao proxy. Nenhuma configuração
posterior o corrige — porque o dano já ocorreu.

### Passo 3 — O que o proxy vê (20 min)

> **Nota de método:** usar o Tor para isso só permite ver o que ele decidir mostrar. Para ver o que
> um proxy vê, vamos capturar **o lado do proxy** — que, no seu laboratório, também é você.

```bash
# Capture o tráfego na interface de loopback, onde o proxy está
sudo tcpdump -i lo -nn -s 0 -w proxy-lado.pcap 'tcp port 9050' &
TPID=$!
sleep 1
curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null https://example.com
sleep 2
kill $TPID 2>/dev/null

# O handshake SOCKS5 no fio
tcpdump -r proxy-lado.pcap -nn -X -c 4 | head -40
```

**Documente o handshake SOCKS5:**

| Offset | Bytes | Campo | Valor |
|---|---|---|---|
| início | `05 01 00` | versão + métodos | |
| resposta | `05 00` | método escolhido | |
| pedido | `05 01 00 03` | versão/cmd/rsv/**ATYP=domínio** | |
| | | comprimento do nome | |
| | | nome do domínio | |
| | | porta | |

**Responda:** o `ATYP` observado foi `01` (IPv4) ou `03` (domínio)? **Isso confirma qual teste você
rodou?**

---

## 3.6 LAB B — O que o destino vê

**Duração:** 35 min

⚠ **Você vai acessar um serviço público que reporta o que **ele** vê** — o que é uso normal e
legítimo de um serviço de diagnóstico. Não há terceiro sendo investigado.

### Passo 1 — Direto, sem proxy

```bash
echo "=== SEM PROXY ==="
curl -s https://httpbin.org/ip
curl -s https://httpbin.org/headers | head -15
```

### Passo 2 — Pelo proxy

```bash
echo
echo "=== PELO PROXY SOCKS5 ==="
curl -s --socks5-hostname 127.0.0.1:9050 https://httpbin.org/ip
curl -s --socks5-hostname 127.0.0.1:9050 https://httpbin.org/headers | head -15
```

### Passo 3 — Compare

Produza `destino-ve.md`:

| O que o destino vê | Sem proxy | Com proxy | Muda? |
|---|---|---|---|
| IP de origem | | | |
| ASN / tipo de conexão | | | |
| User-Agent | | | |
| Accept-Language | | | |
| Outros cabeçalhos | | | |

**Responda:**

1. O IP de origem mudou? **Isso é o anonimato que o proxy fornece — e é só isso.**
2. O `User-Agent` mudou? **Por que não?**
3. O `Accept-Language` mudou? **O que ele revela sobre você?**
4. **O que o proxy NÃO protegeu?** Liste pelo menos três coisas.

⚠ **A resposta 4 é o resumo do módulo:** o proxy trocou o IP e **nada mais**. Todas as outras
camadas do Módulo 2 continuam iguais.

### Critérios de aceitação

- Um proxy SOCKS5 local funcionando (`ss` mostra a porta 9050).
- `vazamento.md` com contagem **real** de consultas DNS vazadas em cada teste.
- Você explicou que o vazamento é **anterior** ao proxy.
- Você identificou o `ATYP` no handshake e o relacionou ao teste que o produziu.
- `destino-ve.md` com a comparação antes/depois e **três** coisas que o proxy não protegeu.
- Você não usou proxy de terceiro, nem capturou tráfego de terceiro.

---

## Avaliação

1. Explique em uma frase por que um proxy **transfere** confiança em vez de eliminá-la.
2. Por que "proxy sozinho não é anonimato"? O que o Tor faz de diferente?
3. Como o proxy HTTP lida com HTTPS? O que ele vê e o que não vê?
4. Por que SOCKS4 é obsoleto para privacidade? Cite duas razões.
5. Explique `ATYP=03` no SOCKS5 e por que ele é a diferença essencial em relação ao SOCKS4.
6. Desenhe o fluxo do vazamento de DNS. **Em que momento ele acontece, e por que é irreversível?**
7. Qual a diferença entre `curl --socks5` e `curl --socks5-hostname`? O que cada um faz com o nome?
8. Por que `proxychains4` frequentemente vaza DNS por padrão?
9. Por que o Tor usa SOCKS5 e não SOCKS4 na porta 9050?
10. Depois de usar um proxy, o seu `User-Agent` e `Accept-Language` mudaram? Por que não?
11. Um proxy honesto não registra. Explique por que isso **não** é uma garantia técnica.
12. Se você quer anonimato real, o que precisa ser acrescentado a um proxy? Cite três coisas.

---

**Próximo:** [Módulo 4 — VPN: o que é e o que não é](modulo-04.md)
