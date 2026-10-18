# Módulo 4 — A Normalização e o Elo Fraco

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 3 · HTTP Smuggling (módulo 10)

---

## ⚠ Este é o módulo central do curso

⚠ **A afirmação que organiza tudo:**

> **A regra está certa. A normalização é que discorda.** **E nenhuma assinatura corrige isso** —
> **porque o problema não está na regra, está entre a regra e o que ela olha.**

⚠ **E é o que o módulo 10 do HTTP Smuggling estabeleceu, agora medido.** **Lá você viu a assimetria;
aqui você vai ver **por que** ela é inevitável — e o que sobra para o detector fazer.**

⚠ **A tese:**

> **O detector vê uma **transformação** da entrada, e o backend vê **outra**.** **A regra descreve o
> ataque na forma que ela vê** — **e o ataque acontece em outra forma.**

⚠ **A tabela das transformações, e onde cada uma vive:**

| # | Transformação | Onde acontece | ⚠ Invisível para |
|---|---|---|---|
| 1 | **Decodificação de URL** | ⚠ Quase todo produto | — |
| 2 | ⚠ **Decodificação repetida** | ⚠ **Backend** | ⚠ **O detector** |
| 3 | **Unicode / normalização** | Frameworks | — |
| 4 | **Case folding** | ⚠ Varia | ⚠ Quem compara sem `(?i)` |
| 5 | ⚠ **Remoção de delimitador** | WAF, sanitizador | ⚠ **O efeito da remoção** |
| 6 | **Trim de espaço** | Varia | — |

⚠ **A linha 2 é o elo central.** **O detector decodifica uma vez; o backend, duas** — **e a regra que
casa `%3C` não casa `%253C`.**

⚠ **A linha 5 é a segunda mais importante, e a mais elegante.** **A sanitização **remove** o
delimitador** — **e a remoção é, ela mesma, uma transformação.** **O aninhamento (`<scr<script>ipt>`)
explora exatamente isso:** **o sanitizador remove o interno, e o externo se remonta.**

---

## 4.1 A ordem importa

⚠ **Normalização não é um passo; é uma **sequência** — e a ordem muda o resultado.**

| Ordem | Efeito |
|---|---|
| Decodificar → comparar | ✓ Correto, se for a mesma do backend |
| Comparar → decodificar | ⚠ **A regra vê a forma crua** |
| ⚠ **Remover → decodificar** | ⚠⚠ **O aninhamento funciona** |
| ⚠ **Decodificar → remover → decodificar** | ⚠ **O ataque em duas rodadas** |

⚠ **A terceira linha é o aninhamento.** **Remover antes de decodificar deixa o payload cru passar
por uma rodada** — **e a decodificação seguinte o completa.**

⚠ **E a quarta linha é a versão moderna.** **Alguns produtos fazem **múltiplas rodadas** de
decodificação — **e cada rodada é uma oportunidade de o atacante programar a remontagem.**

⚠ **A tabela do que o detector deve comparar:**

| Se o backend faz | O detector deve | ⚠ Risco |
|---|---|---|
| 1 decodificação | Comparar após 1 | ✓ Alinhado |
| ⚠ 2 decodificações | ⚠ **Comparar após 2** | ⚠ Se não souber, erra |
| Remoção de delimitador | ⚠ **Simular a remoção** | ⚠ Difícil |
| Ordem específica | **A mesma ordem** | ⚠ Precisa saber qual |

⚠ **A linha 2 é a que exige o módulo 2.** **Você só sabe quantas decodificações o backend faz se
**testou** — **e é por isso que o inventário é pré-requisito.**

⚠ **A regra escrita:**

> **Detecção por assinatura exige que o detector **imite a transformação do backend**.** **E imitar
> exige conhecê-la.** **Sem isso, a regra compara uma forma que o ataque não usa.**

```bash
mkdir -p ~/detect-lab/mod04 && cd ~/detect-lab/mod04

echo "═══ 1. a ordem importa ═══"
echo
cat > ordem.md <<'EOF'
# A ordem importa

| Ordem | Efeito |
|---|---|
| decodificar → comparar | ✓ correto, SE for a mesma do backend |
| comparar → decodificar | ⚠ a regra vê a forma CRUA |
| ⚠ REMOVER → decodificar | ⚠⚠ o ANINHAMENTO funciona |
| ⚠ decodificar → remover → decodificar | ⚠ o ataque em DUAS rodadas |

## O que o detector deve comparar
| Se o backend faz | O detector deve | Risco |
|---|---|---|
| 1 decodificação | comparar após 1 | ✓ alinhado |
| ⚠ 2 decodificações | ⚠ comparar após 2 | ⚠ se não souber, erra |
| remoção de delimitador | simular a remoção | difícil |
| ordem específica | a MESMA ordem | precisa saber |

## ⚠ a linha que exige o módulo 2
você só sabe QUANTAS decodificações o backend faz se TESTOU.
✓ é por isso que o inventário é PRÉ-REQUISITO.

## ⚠ A REGRA
detecção por assinatura exige que o detector
IMITE a transformação do backend.
e imitar exige CONHECÊ-LA.
sem isso, a regra compara uma forma que o ataque NÃO USA.
EOF

cat ordem.md

echo
echo "═══ 2. o aninhamento, passo a passo ═══"
echo
cat <<'EXPL'
  ── O PAYLOAD ──
     <scr<script>ipt>alert(1)</scr</script>ipt>

  ── O QUE O SANITIZADOR FAZ ──
     ⚠ ele PROCURA "<script>" e REMOVE.

     passo 1: encontra "<script>" no MEIO
              → remove
     passo 2: o que sobra é:
              <script>alert(1)</script>
     ⚠⚠ E É EXATAMENTE O PAYLOAD PERIGOSO.

  ── POR QUE FUNCIONA ──
     · a remoção NÃO é idempotente
     · ⚠ remover UMA vez CRIA o padrão na próxima leitura
     · e a leitura seguinte é a do NAVEGADOR — ou a do backend

  ── E A LIÇÃO ──
     ⚠ a defesa (remover) é o VETOR.
     não é um bug da regra; é a natureza de remover.

  ✓ e por isso "sanitizar" é mais difícil que "rejeitar".
     rejeitar não cria padrão nenhum.
EXPL
```

⚠ **O aninhamento é o exemplo mais elegante do curso.** **E a lição final é a mais profunda:** **a
defesa que **remove** é o vetor** — **porque a remoção cria o padrão que ela mesma procura.**

⚠ **E é a razão de "rejeitar" ser superior a "sanitizar".** **Rejeitar não cria padrão.**

**Produza `ordem.md`:**

| Ordem | Efeito |
|---|---|
| Remover → decodificar | |
| Comparar → decodificar | |
| Decodificar → comparar | |

**Responda:**

1. **Por que a ordem muda o resultado?
2. **Como o aninhamento explora a remoção?
3. **Por que "rejeitar" é superior a "sanitizar"?
4. **O que o detector precisa saber** para comparar a forma certa?

---

## 4.2 O que sobra para o detector

⚠ **Se a normalização é inevitável, o que o detector **pode** fazer? Três coisas.**

| # | Estratégia | O que faz | ⚠ Custo |
|---|---|---|---|
| 1 | **Normalizar igual** | Imita a transformação do backend | ⚠ Exige conhecer |
| 2 | ⚠ **Detectar a anomalia de forma** | Não compara o padrão; compara a **forma inválida** | ✓ **Robusto** |
| 3 | ⚠ **Detectar a ação** | Não olha a forma | ✓✓ **O mais robusto** |

⚠ **A estratégia 2 é a mais subestimada, e a mais elegante.** **Você não compara com o payload
conhecido** — **compara com o que é **sintaticamente válido**.** **Um header com espaço antes dos
dois pontos é **inválido** — **e é sinal, independentemente do payload.**

⚠ **E é o que o módulo 10 do HTTP Smuggling já mostrava:**

| Sinal | Falso positivo |
|---|---|
| ⚠ **Dois `Content-Length`** | ⚠ **Nenhum — é inválido** |
| ⚠ **`TE` + `CL`** | ⚠ **Nenhum** |
| Espaço antes do `:` | Baixo |
| ⚠ **Path com CR/LF** | ⚠ Nenhum |

⚠ **A tabela dos quatro sinais é o instrumento do módulo.** **Nenhum deles compara com um payload —
todos comparam com a **gramática**.** **E é por isso que eles não têm falso positivo:** **uma
mensagem sintaticamente inválida **é** inválida, ponto.**

⚠ **A estratégia 3 é a mais robusta de todas** — **e a mais cara.** **Ela exige o módulo 2 e o 5.**
**Mas ela é imune à evasão por definição:** **a forma muda o tempo todo; a ação, não.**

⚠ **A regra escrita:**

> **Não compare com o payload conhecido — compare com a gramática.** **A forma do ataque muda; a
> invalidez, não.** **E é a única assinatura que não envelhece.**

```bash
cd ~/detect-lab/mod04

echo "═══ 3. o que sobra para o detector ═══"
echo
cat > estrategias.md <<'EOF'
# O que sobra para o detector

| # | Estratégia | O que faz | Custo |
|---|---|---|---|
| 1 | NORMALIZAR IGUAL | imita a transformação do backend | ⚠ exige conhecer |
| 2 | ⚠ DETECTAR A FORMA INVÁLIDA | não compara o padrão; compara a GRAMÁTICA | ✓ ROBUSTO |
| 3 | ⚠ DETECTAR A AÇÃO | não olha a forma | ✓✓ O MAIS ROBUSTO |

## ⚠ a estratégia 2 é a mais subestimada
você NÃO compara com o payload conhecido.
compara com o que é SINTATICAMENTE VÁLIDO.
✓ um header com espaço antes do ":" é INVÁLIDO —
   e é sinal, INDEPENDENTEMENTE do payload.

## Os quatro sinais sem falso positivo
| Sinal | FP |
|---|---|
| ⚠ DOIS Content-Length | ⚠ NENHUM |
| ⚠ TE + CL | ⚠ nenhum |
| espaço antes do ":" | baixo |
| ⚠ path com CR/LF | ⚠ nenhum |

## ⚠ por que eles não têm FP
nenhum deles compara com um PAYLOAD — todos comparam com a GRAMÁTICA.
✓ uma mensagem sintaticamente INVÁLIDA é inválida, PONTO.

## ⚠ a estratégia 3
a mais robusta, e a mais CARA.
exige o módulo 2 e o 5.
✓ mas é imune à evasão POR DEFINIÇÃO:
   a forma muda o tempo todo; a AÇÃO, não.

## ⚠ A REGRA
não compare com o payload conhecido — compare com a GRAMÁTICA.
a forma do ataque muda; a INVALIDEZ, não.
✓ é a única assinatura que NÃO ENVELHECE.
EOF

cat estrategias.md
```

⚠ **A estratégia 2 é o achado do módulo.** **E ela explica por que os quatro sinais do módulo 10
anterior não têm FP:** **eles não comparam com payload; comparam com a gramática.**

⚠ **E é uma mudança de mentalidade:** **a assinatura que **não envelhece** não é a que lista
ataques** — **é a que reconhece o inválido.**

**Produza `estrategias.md`:**

| # | Estratégia | Custo |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

**Responda:**

1. **Qual estratégia não tem FP?** Por quê?
2. **O que ela compara, se não é o payload?
3. **Qual é a mais robusta?** Por que é cara?
4. **Por que os quatro sinais do curso anterior não têm FP?

---

## 4.3 Medindo a evasão

⚠ **O instrumento: **a mesma regra, testada contra a evasão.** **E o resultado é a taxa de FN.**

| # | Forma do payload | Casa a assinatura? |
|---|---|---|
| 1 | `<script>` | ⚠ **Se a regra for literal** |
| 2 | `%3Cscript%3E` | ⚠ Se a regra decodifica uma vez |
| 3 | ⚠ `%253Cscript%253E` | ⚠⚠ **Não, se ela decodifica uma vez** |
| 4 | ⚠ `<scr<script>ipt>` | ⚠⚠ **Não — o aninhamento** |
| 5 | `<SCRIPT>` | ⚠ **Não, sem `(?i)`** |

⚠ **A tabela é o teste, e ela é pequena.** **Cinco formas, uma regra, e a taxa de FN aparece** —
**sem precisar de fuzzer.**

⚠ **E a tabela do que cada evasão explora:**

| Evasão | Explora | ⚠ A correção |
|---|---|---|
| Encoding | A ordem das decodificações | ⚠ **Impossível alinhar** |
| ⚠ **Aninhamento** | ⚠ **A remoção cria o padrão** | ⚠ **Só rejeitar resolve** |
| Case | A falta de `(?i)` | ✓ **Trivial** |
| Espaço | A forma do header | ✓ Comparar com a gramática |

⚠ **A linha do case é a mais humilhante e a mais fácil de corrigir.** **E é o primeiro teste que você
deve rodar em qualquer regra** — **porque custa um segundo e pega um erro real.**

⚠ **A regra escrita:**

> **Toda regra tem uma taxa de FN sob evasão.** **Você não a elimina; você a **mede** — e declara.**
> **Uma regra que pega o trivial e não pega a evasão ainda vale** — **desde que você saiba disso.**

```bash
cd ~/detect-lab/mod04

echo "═══ 4. medindo a evasão ═══"
echo
cat > evasao.md <<'EOF'
# Medindo a evasão

| # | Forma | Casa a assinatura? |
|---|---|---|
| 1 | `<script>` | ⚠ se a regra for LITERAL |
| 2 | `%3Cscript%3E` | ⚠ se a regra decodifica UMA vez |
| 3 | ⚠ `%253Cscript%253E` | ⚠⚠ NÃO, se ela decodifica uma vez |
| 4 | ⚠ `<scr<script>ipt>` | ⚠⚠ NÃO — o aninhamento |
| 5 | `<SCRIPT>` | ⚠ NÃO, sem (?i) |

## O que cada evasão explora
| Evasão | Explora | A correção |
|---|---|---|
| encoding | a ordem das decodificações | ⚠ IMPOSSÍVEL alinhar |
| ⚠ aninhamento | ⚠ a remoção CRIA o padrão | ⚠ só REJEITAR resolve |
| case | a falta de (?i) | ✓ TRIVIAL |
| espaço | a forma do header | ✓ comparar com a GRAMÁTICA |

## ⚠ a linha mais humilhante
o CASE.
e é o PRIMEIRO teste que você deve rodar em qualquer regra —
porque custa UM SEGUNDO e pega um erro REAL.

## ⚠ A REGRA
toda regra tem uma taxa de FN sob evasão.
você não a ELIMINA; você a MEDE — e DECLARA.
✓ uma regra que pega o trivial e não pega a evasão
   AINDA VALE — desde que você saiba disso.
EOF

cat evasao.md

echo
echo "═══ 5. o medidor de evasão ═══"
echo
cat > mede-evasao.py <<'PY'
#!/usr/bin/env python3
"""
mede-evasao.py — mede a taxa de FN de uma regra sob evasão.

⚠ DIDÁTICO. testa a REGRA contra as FORMAS — não contra terceiros.
"""
import re

# ─── a regra a testar ───
REGRA = re.compile(r"<script", re.I)          # ⚠ sem normalização

# ─── a regra "corrigida" — compara com a gramática, não com o payload ───
REGRA_FORMA = re.compile(r"[\r\n]|:\s+[^ ]|^\s+\S", re.M)

FORMAS = [
    ("1. literal",           "<script>alert(1)</script>"),
    ("2. URL uma vez",       "%3Cscript%3Ealert(1)"),
    ("3. URL duas vezes",    "%253Cscript%253Ealert(1)"),
    ("4. aninhamento",       "<scr<script>ipt>alert(1)</scr</script>ipt>"),
    ("5. case",              "<SCRIPT>alert(1)</SCRIPT>"),
    ("6. com espaço",        "< script>alert(1)"),
    ("7. header inválido",   "Content-Length : 6"),
    ("8. path com CR",       "GET /admin\rX: y HTTP/1.1"),
]


def main():
    print("═══ MEDINDO A EVASÃO ═══")
    print()
    print("  ⚠ a regra: compara com o PAYLOAD `<script>`")
    print()
    print(f"  {'#':<22} {'casa a regra?':<16} {'a regra de FORMA pega?'}")
    print("  " + "-"*66)

    pegos, pegos_forma = 0, 0
    for nome, payload in FORMAS:
        a = bool(REGRA.search(payload))
        b = bool(REGRA_FORMA.search(payload))
        pegos += a
        pegos_forma += b
        print(f"  {nome:<22} {'✓ SIM' if a else '⚠ NÃO':<16} {'✓ SIM' if b else '· não'}")

    n = len(FORMAS)
    print()
    print("  ═══ A TAXA ═══")
    print(f"  regra por PAYLOAD : {pegos}/{n}  ⚠ taxa de FN = {(n-pegos)/n:.0%}")
    print(f"  regra por GRAMÁTICA: {pegos_forma}/{n}")
    print()
    print("  ⚠ a segunda pega os casos 7 e 8 SEM saber de payload nenhum.")
    print("     ✓ porque ela compara com o que é SINTATICAMENTE VÁLIDO.")
    print()
    print("  ⚠ e a primeira falha nas formas 3, 4, 5, 6.")
    print("     ✓ 5 e 6 são triviais de corrigir. 3 e 4, não.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-evasao.py
python3 mede-evasao.py
```

⚠ **O medidor mostra a diferença entre as duas mentalidades.** **A regra por payload pega 3 de 8; a
por gramática pega os inválidos** — **sem saber de payload nenhum.**

⚠ **E a nota final é a honestidade do módulo:** **as formas 3 e 4 não se corrigem** — **você as
mede e declara.**

**Produza `evasao-medida.md`:**

| # | Forma | Casa? |
|---|---|---|
| 3 | URL duas vezes | |
| 4 | Aninhamento | |
| 5 | Case | |

**Responda:**

1. **Qual a taxa de FN** da regra por payload?
2. **Quais formas são corrigíveis?** Quais não?
3. **O que a regra por gramática pega** que a outra não?
4. **Por que você mede o FN** em vez de eliminá-lo?

---

## 4.4 LAB — A normalização medida

**Duração:** 150 min

### Passo 1 — Meça a transformação do backend (50 min)

⚠ **Você precisa saber quantas vezes o backend decodifica. E isso se mede.**

```bash
cd ~/detect-lab/mod04

echo "═══ MEDINDO A TRANSFORMAÇÃO DO BACKEND ═══"
echo
cat <<'EXPL'
  ── O MÉTODO ──

     1. mande um prefixo INOFENSIVO que se torne o padrão
        depois de N decodificações:
        · 1×:  %3Cscript%3E
        · 2×:  %253Cscript%253E
        · 3×:  %25253Cscript%25253E

     2. ⚠ veja o que o backend REGISTRA
     3. a forma que ele registra diz quantas vezes ele decodificou

  ── E É O MESMO MÉTODO DO MÓDULO 8 ANTERIOR ──
     lá você media a normalização do WAF e do backend.
     ✓ aqui você a usa para ALINHAR a regra.
EXPL

cat > mede-transformacao.py <<'PY'
#!/usr/bin/env python3
"""
mede-transformacao.py — quantas decodificações o backend faz?

⚠ DIDÁTICO e LOCAL. manda ao SEU backend.
"""
import socket, sys, os, time
from urllib.parse import quote

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
LOG = os.path.expanduser("~/smuggle-lab/evidencia/backend-cl.log")

MARCA = "XFORM"
CASOS = [
    ("0 codificações", MARCA),
    ("1 codificação", quote(MARCA)),
    ("2 codificações", quote(quote(MARCA))),
    ("3 codificações", quote(quote(quote(MARCA)))),
]


def manda(path: str):
    req = f"GET /{path} HTTP/1.1\r\nHost: l\r\n\r\n".encode()
    try:
        with socket.create_connection((HOST, PORT), timeout=4) as s:
            s.sendall(req)
            s.settimeout(2)
            try: s.recv(4096)
            except socket.timeout: pass
        return True
    except Exception as e:
        return False


def main():
    print("═══ QUANTAS DECODIFICAÇÕES O BACKEND FAZ? ═══")
    print()
    print(f"  backend: {HOST}:{PORT}   ⚠ LOCAL")
    print(f"  log    : {LOG}")
    print()

    try:
        antes = open(LOG, errors="replace").read()
    except FileNotFoundError:
        antes = ""

    for nome, path in CASOS:
        manda(path)
        time.sleep(0.25)
        print(f"  enviado: {nome:<18} → /{path[:40]}")

    time.sleep(0.5)
    try:
        depois = open(LOG, errors="replace").read()
    except FileNotFoundError:
        depois = ""

    novo = depois[len(antes):]
    print()
    print("  ── o que o backend registrou ──")
    import re
    for m in re.findall(r"PATH: (\S+)", novo):
        print(f"     {m}")

    print()
    print("  ═══ COMO LER ═══")
    print("  · se o backend registra a forma DECODIFICADA, ele decodifica")
    print("  · ⚠ e o NÚMERO de rodadas é a resposta")
    print("  ✓ é esse número que a sua regra precisa IMITAR.")
    print()
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-transformacao.py
echo "  ── pronto ──"
echo "     python3 ~/detect-lab/mod04/mede-transformacao.py 8090"
```

⚠ **O método é o mesmo do módulo 8 anterior, com objetivo diferente.** **Lá você media para achar a
divergência; aqui, para **alinhar a regra**.**

⚠ **E a lição é a do módulo 2:** **você não supõe quantas decodificações o backend faz — você
mede.**

**Produza `transformacao.md`:**

| Caso | O backend registrou |
|---|---|
| 0 codificações | |
| 1 codificação | |
| 2 codificações | |

**Responda:**

1. **Quantas decodificações o backend faz?
2. **Como você sabe?** O log bastou?
3. **Sua regra imita esse número?
4. **O que aconteceria se ela imitasse um número errado?

### Passo 2 — Escreva a regra alinhada (50 min)

⚠ **A regra que compara com a **gramática** — e a que imita a transformação.**

```bash
cd ~/detect-lab/mod04

echo "═══ ESCREVENDO A REGRA ALINHADA ═══"
echo
cat > ~/detect-lab/regras/forma-invalida.yml <<'EOF'
# REGRA — POR FORMA INVÁLIDA (a estratégia 2)
# ⚠ NÃO compara com payload. compara com a GRAMÁTICA.
id: forma-invalida-001
titulo: mensagem sintaticamente inválida
family: assinatura (por gramática)
ttp: T1190

deteccao:
  logica: |
    ⚠ um header da mensagem está em forma inválida:
      · espaço antes dos dois pontos   "Content-Length : 6"
      · dois Content-Length
      · TE e CL na mesma mensagem
      · path com CR ou LF
      · obs-fold (linha começando com tab)
      · espaço no fim do valor         "Content-Length: 6 "

  regex: |
    (?i)^\w[^\r\n:]*\s+:
    | (?i)content-length:.*\n(?:.*\n)*?content-length:
    | (?i)transfer-encoding:.*\n(?:.*\n)*?content-length:
    | PATH:.*[\r\n]
    | ^\t

⚠ por que ela não tem falso positivo:
  ela NÃO pergunta "isto é o ataque?".
  pergunta "isto é SINTATICAMENTE VÁLIDO?".
  ✓ e uma mensagem inválida é inválida, PONTO.

⚠ limitacoes:
  - "não pega evasão por ENCODING (o payload é válido na forma)"
  - "não pega o aninhamento (a forma final é válida)"
  - "⚠ exige que o log preserve a forma ORIGINAL"
EOF

cat > ~/detect-lab/regras/alinhada.yml <<'EOF'
# REGRA — ALINHADA À TRANSFORMAÇÃO
# ⚠ imita o NÚMERO de decodificações do backend
id: alinhada-transformacao-001
titulo: payload perigoso, após N decodificações
family: assinatura (alinhada)
ttp: T1190

parametros:
  # ⚠ MEDIDO no lab, não suposto
  n_decodificacoes: 2

deteccao:
  logica: |
    decodificar o valor n_decodificacoes vezes
    e SÓ ENTÃO comparar com o padrão perigoso

⚠ e por que ela ainda falha:
  - "⚠ se o backend mudar o número, ela desalinha"
  - "⚠ se a transformação não for só URL-decoding, ela erra"
  - "⚠ e ela NÃO sobrevive ao aninhamento"

⚠ o que ela tem de bom:
  - "reduz o FN das evasões por ENCODING"
  ✓ e é o melhor que a assinatura consegue fazer
EOF

echo "  ── as duas escritas ──"
ls -1 ~/detect-lab/regras/*.yml | sed 's/^/     /'
echo
echo "  ⚠ e note: a primeira NÃO tem FP; a segunda reduz o FN."
echo "     ✓ as duas juntas é que cobrem."
```

⚠ **As duas regras são complementares.** **A por gramática tem zero FP e cobre o inválido; a
alinhada reduz o FN do encoding.**

⚠ **E a nota do parâmetro `n_decodificacoes: 2` é o que torna a regra auditável:** **o número está
no arquivo, com o comentário de que foi **medido**.**

**Produza `alinhada.md`:**

| Regra | Cobre | Limitação |
|---|---|---|
| Por gramática | | |
| Alinhada | | |

**Responda:**

1. **Por que a regra por gramática não tem FP?
2. **O que a alinhada reduz?
3. **Por que o `n_decodificacoes` está no arquivo?
4. **O que nenhuma das duas pega?

### Passo 3 — Meça as duas (50 min)

Produza `caderno/PD-004.md`:

```markdown
# PD-004 — a normalização

**Data:** ____

## 1. A transformação medida
| Caso | O backend registrou |
|---|---|
| 0 codificações | |
| 1 codificação | |
| 2 codificações | |

⚠ n_decodificacoes = ____

## 2. As duas regras
| Regra | Estratégia | FP esperado |
|---|---|---|
| por gramática | ⚠ forma inválida | ⚠ NENHUM |
| alinhada | imita a transformação | baixo |

## 3. A medição da evasão
| # | Forma | Gramática pega? | Alinhada pega? |
|---|---|---|---|
| 1 | literal | | |
| 2 | URL 1× | | |
| 3 | URL 2× | | |
| 4 | aninhamento | | |
| 5 | case | | |
| 6 | espaço no header | | |

## 4. As taxas
| Regra | Detecção | ⚠ FN |
|---|---|---|
| gramática | | |
| alinhada | | |

## 5. ⚠ O que NENHUMA pega
| # | Evasão | Por quê |
|---|---|---|
| 1 | | |
| 2 | | |

## 6. A conclusão
| Item | Valor |
|---|---|
| as duas juntas cobrem | |
| e ainda resta | ⚠ |

## 7. ⚠ O que eu NÃO fiz
- [ ] não testei contra WAF de terceiro
- [ ] não publiquei bypass
- [ ] não usei a evasão contra alvo real

## 8. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `medicao.md`:**

| Regra | Detecção | FN |
|---|---|---|
| Gramática | | |
| Alinhada | | |

**Responda:**

1. **Quantas evasões cada regra pega?
2. **O que nenhuma pega?** Por quê?
3. **As duas juntas cobrem o quê?
4. **O que você não fez?**

### Critérios de aceitação

- `ordem.md` com as **quatro** ordens e o efeito de cada.
- Você explicou **por que a ordem muda o resultado**.
- `ordem.md` com o **aninhamento passo a passo**.
- Você explicou **por que a defesa que remove é o vetor**.
- Você explicou **por que "rejeitar" é superior a "sanitizar"**.
- `estrategias.md` com as **três** estratégias.
- Você explicou **por que a estratégia 2 não tem FP**.
- Você explicou **o que ela compara**, se não é o payload.
- Você explicou **por que os quatro sinais do curso anterior não têm FP**.
- `evasao.md` com as **cinco** formas e a correção de cada.
- Você explicou **por que o case é o primeiro teste**.
- Você explicou **por que o aninhamento só se resolve rejeitando**.
- `mede-evasao.py` rodado, com as **duas taxas** comparadas.
- Você explicou **as formas que não se corrigem**.
- A **transformação do backend medida**, com o número de decodificações.
- As **duas regras** escritas, uma por estratégia.
- A regra por gramática **sem FP**, e a alinhada com o número medido.
- Você explicou **o que nenhuma das duas pega**.
- `caderno/PD-004.md` com as **oito** seções.
- ⚠ **Nenhum WAF de terceiro.** Tudo em 127.0.0.1.

---

## Avaliação

1. **Por que a regra está certa e ainda falha?**
2. **Cite as seis transformações** e onde cada uma vive.
3. **Qual é o elo central?** Por quê?
4. **Cite as quatro ordens** e o efeito de cada.
5. **Por que a ordem remover → decodificar é perigosa?
6. **Como o aninhamento funciona?** Passo a passo.
7. **Por que a defesa que remove é o vetor?
8. **Por que "rejeitar" é superior a "sanitizar"?
9. **Cite as três estratégias** e o custo de cada.
10. **Qual não tem falso positivo?** Por quê?
11. **O que ela compara, se não é o payload?
12. **Por que os quatro sinais do curso anterior não têm FP?
13. **Cite as cinco formas de evasão e a correção de cada.
14. **Qual é corrigível trivialmente?** Por quê é o primeiro teste?
15. **Qual só se resolve rejeitando?
16. **Como se mede a transformação do backend?
17. **Por que o número de decodificações vai no arquivo da regra?
18. **O que a regra alinhada reduz?** E o que ela não pega?
19. **Por que a taxa de FN se mede e não se elimina?
20. **Qual é a única assinatura que não envelhece?

---

**Próximo:** [Módulo 5 — Telemetria e o que falta](modulo-05.md)
