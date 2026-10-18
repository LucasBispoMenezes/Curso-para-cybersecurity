# Módulo 10 — Lógica de Negócio, Concorrência e Comportamento Emergente

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 10 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 a 9
**Próximo:** Módulo 11 — Análise de código e causa-raiz

---

## O que este módulo entrega

Ao final, você vai saber encontrar as falhas que **nenhuma ferramenta acha e nenhuma lista nomeia bem**: as que existem porque o autor **não previu aquele fluxo**. Você vai entender concorrência como falha de **atomicidade**, e o comportamento que **emerge** da interação entre camadas. É o módulo onde o `HTTP Smuggling` e os `Parser Differentials` aparecem como **aprofundamento**, não como repetição.

---

## 10.1 A classe que não tem assinatura

⚠ **Por que nenhuma ferramenta automática acha e nenhum scanner cataloga:**

| Falha comum | Esta classe |
|---|---|
| Tem padrão reconhecível | ⚠ **Só faz sentido no negócio** |
| Produz erro ou resposta anômala | ⚠ Produz **`200` normal** |
| Existe em qualquer aplicação | ⚠ Existe **naquela** aplicação |
| Corrigível por biblioteca | ⚠ Corrigível por **regra de negócio** |

⚠ **A frase que organiza o módulo:**

> **Falha de lógica é a aplicação fazendo o que foi programada para fazer — em uma sequência que o
> autor não imaginou.**

⚠ **A consequência para o método:** você não procura um **padrão** no código. Você procura um **fluxo** que o código permite e o negócio não. ⚠ É por isso que este módulo depende do módulo 2 inteiro — e de entender o produto.

---

## 10.2 Os quatro grupos

### Grupo 1 — Sequência e estado

⚠ **A aplicação presume uma **ordem**, e não verifica em que ponto o fluxo está.**

```
   FLUXO PREVISTO                    FLUXO QUE A APLICACAO PERMITE
   ──────────────                    ─────────────────────────────

   1. carrinho                       1. carrinho
   2. ⚠ validar estoque              2. PULAR a validacao de estoque
   3. pagar                          3. pagar  -> ⚠ vende o que nao tem
   4. confirmar                      4. confirmar

   ⚠ A aplicacao confia na ORDEM das etapas,
     e nao verifica o ESTADO de cada uma
```

| Falha | ⚠ O que se abusa |
|---|---|
| Etapa pulada | Chamar a etapa final direto |
| Etapa repetida | ⚠ Aplicar o mesmo cupom duas vezes |
| Estado não revalidado | ⚠ Preço lido no passo 1, cobrado com o do passo 3 |
| Voltar no fluxo | Refazer a etapa com outro parâmetro |

⚠ **O terceiro é o mais recorrente:** o valor é lido **quando o usuário adiciona**, e usado **quando ele paga**. ⚠ Entre os dois, o usuário pode **alterar o preço** — porque o preço veio do cliente na etapa 1 e não é reconferido na etapa 3. É o defeito "estado no cliente sem assinatura" do módulo 1.

### Grupo 2 — Limite e quantidade

⚠ **A aplicação valida o **tipo** e não o **limite**.**

```python
# ⚠ VULNERAVEL — valida que e' inteiro, nao que e' plausivel
@app.post("/api/transferir")
def transferir():
    valor = int(request.form.get("valor"))     # ⚠ -100 passa
    if valor <= 0: return jsonify({"erro":"invalido"}), 400   # ok...
    # ⚠ mas e se o saldo for conferido DEPOIS?
```

| Campos que importam | ⚠ O que se testa |
|---|---|
| Valor monetário | Negativo, zero, enorme, fracionário |
| Quantidade | Zero, negativo, acima do estoque |
| Percentual de desconto | ⚠ Acima de 100 |
| Data | ⚠ Passado, futuro, formato ambíguo |
| ⚠ **Soma de itens** | ⚠ Linha negativa compensando positiva |

⚠ **O último é o mais elegante:** cada linha do carrinho é válida, e **a soma** não é. ⚠ Uma linha com valor negativo anula o total — e nenhuma validação por linha pega isso.

### Grupo 3 — Concorrência

⚠ **Esta é a classe com o método mais claro, e a que mais rende.**

```
   ESTADO INICIAL: saldo = 100

   THREAD A                          THREAD B
   ────────                          ────────
   1. le saldo (100)
                                     2. le saldo (100)     ⚠ leu o mesmo
   3. se 100 >= 80: ok
                                     4. se 100 >= 80: ok   ⚠ tambem ok
   5. grava 20
                                     6. grava 20           ⚠ sobrescreve

   ⚠ RESULTADO: duas transferencias de 80, saldo final 20
     ⚠ a aplicacao "validou" as DUAS
```

⚠ **A causa é sempre a mesma: **ler, decidir, gravar** sem que o intervalo seja atômico.**

```python
# ⚠ VULNERAVEL — o padrao classico (read-modify-write)
saldo = buscar_saldo(uid)
if saldo >= valor:
    gravar_saldo(uid, saldo - valor)     # ⚠ outra thread entrou no meio

# ✅ CORRIGIDO (1) — operacao atomica no banco
cursor.execute("UPDATE contas SET saldo = saldo - ? "
               "WHERE id = ? AND saldo >= ?", (valor, uid, valor))
if cursor.rowcount == 0:
    return jsonify({"erro":"saldo insuficiente"}), 400
#  ⚠ a CONDICAO e' parte da escrita, no mesmo comando

# ✅ CORRIGIDO (2) — bloqueio explicito
cursor.execute("SELECT saldo FROM contas WHERE id=? FOR UPDATE", (uid,))
#  ⚠ a linha fica travada ate o commit
```

⚠ **A primeira correção é a preferida, e a razão é a mesma dos módulos anteriores:** ela faz a omissão **impossível**. ⚠ Não existe "conferi o saldo" separado de "debitei" — as duas coisas são **um comando**. É o `WHERE dono_id = ?` do módulo 4, em outra forma.

⚠ **E a segunda conecta ao `Linux Internals`:** `FOR UPDATE` é um lock, e lock mal usado produz **deadlock**. ⚠ A ordem de aquisição importa: dois fluxos que travam A depois B, e B depois A, travam para sempre.

⚠ **O instrumento de teste, e ele é o do módulo 2 na variável que quase ninguém usa:**

```bash
# ⚠ A MESMA requisicao, em PARALELO — a quinta variavel do modulo 2
seq 1 20 | xargs -P 20 -I{} curl -s -b cookie.txt \
  -X POST -d "valor=80&para=outro" http://127.0.0.1:5000/api/transferir

# ⚠ depois leia o saldo: quantas passaram?
```

⚠ **Se mais de uma transferência com valor igual ao saldo passar, há corrida.** ⚠ E o teste é **sempre** o mesmo: repetir N vezes em paralelo, e contar. É a mesma disciplina de reprodutibilidade do módulo 4 do curso de Linux Internals.

### Grupo 4 — Emergente: quando as camadas discordam

⚠ **O comportamento que **não está em nenhuma camada isolada** — está na interação.**

| Fenômeno | ⚠ Onde ele nasce |
|---|---|
| **Cache poisoning** | ⚠ Header do cliente influenciando a chave |
| **Cache deception** | ⚠ Caminho que o cache acha estático e a app acha dinâmico |
| ⚠ **Confusão entre parsers** | ⚠ Duas camadas leem os mesmos bytes diferente |
| **Normalização divergente** | ⚠ O proxy normaliza, o backend não |
| **Encoding diferente** | ⚠ Um decodifica `%2e`, o outro não |

⚠ **O cache é o caso mais instrutivo, e ele reproduz o módulo 1 inteiro:**

```http
GET /perfil HTTP/1.1
Host: app.exemplo.com
X-Forwarded-Host: atacante.exemplo.com     ⚠ o cache usa isto na chave?
X-Forwarded-Scheme: http                    ⚠ ou isto?
```

⚠ **Se o proxy usa o header do **cliente** para compor a chave de cache, o atacante envenena a entrada** — e todo visitante seguinte recebe a resposta do atacante. ⚠ É a fronteira 2 do módulo 1, com impacto em **todos** os usuários.

⚠ **O `cache deception` é o irmão:** o atacante acessa `GET /perfil/dados.css` — a extensão faz o cache tratar como estático, e a aplicação ignorar a extensão e devolver o perfil. ⚠ **A divergência de interpretação entre cache e aplicação** é o bug.

⚠ **E aqui entra o aprofundamento — sem repetir os cursos:**

| Este módulo toca | ⚠ Onde está o tratamento completo |
|---|---|
| Confusão entre parsers HTTP | ⚠ **`Parser Differentials`** — as N implementações |
| Desync entre proxy e backend | ⚠ **`HTTP Smuggling`** — as 10 variantes de framing |
| Medição de desync | ⚠ **`HTTP Smuggling`** — o harness e a medição |

⚠ **A relação é deliberada:** aqui o assunto aparece como **uma classe entre outras**, com o objetivo de **reconhecer** e **saber onde aprofundar**. ⚠ Quem quiser as dez variantes, o harness e a medição vai para o curso específico — e é assim que os dois materiais não se repetem.

---

## 10.3 Como se procura esta classe

⚠ **O método não é técnico, é de **negócio**.** Cinco passos:

```
   1. ENTENDER   ->  o que este fluxo existe para FAZER?
        │             (qual e' o objetivo legitimo)
        ▼
   2. DESENHAR   ->  o caminho FELIZ, passo a passo
        │
        ▼
   3. PERGUNTAR  ->  ⚠ o que a aplicacao presume em cada passo?
        │             - que a etapa anterior aconteceu?
        │             - que o valor nao mudou?
        │             - que so um pedido vem por vez?
        │             - que o cliente e' uma tela?
        ▼
   4. QUEBRAR    ->  viole UMA presuncao de cada vez
        │
        ▼
   5. MEDIR      ->  ⚠ o efeito e' observavel? e' repetivel?
```

⚠ **O passo 3 é o que o módulo treina, e as quatro perguntas dele cobrem os quatro grupos:** ordem (grupo 1), limite (2), paralelismo (3) e interface (4). ⚠ Um cliente **não é** uma tela — ele manda o que quiser, na ordem que quiser, quantas vezes quiser, em paralelo.

⚠ **A pergunta do grupo 4 é a que fecha:** *onde duas camadas **interpretam** o mesmo dado de forma diferente?* ⚠ É a fronteira do módulo 1, e é o que liga este módulo aos dois cursos de aprofundamento.

---

## 10.4 Por que isto é o topo do curso

⚠ **A hierarquia, e ela explica a ordem dos módulos:**

| Nível | Classe | ⚠ Como se acha |
|---|---|---|
| 1 | Injeção, XSS, IDOR | Padrão no código |
| 2 | Autorização por campo | ⚠ Matriz (módulo 8) |
| 3 | Lógica de negócio | ⚠ **Entender o produto** |
| 4 | Concorrência | ⚠ **Repetir em paralelo** |
| 5 | Emergente | ⚠ **Comparar camadas** |

⚠ **Sobe-se por ela, e cada nível exige mais contexto e menos ferramenta.** ⚠ Os níveis 3 a 5 **não aparecem em scanner nenhum**, e é por isso que são o que separa quem roda ferramenta de quem entende o sistema.

⚠ **E a razão de o módulo vir depois do 9, e não antes:** encontrá-los exige que você já saiba **onde procurar** (módulos 1-2), **o que é indevido** (3-4), **como o dado chega** (5-7) e **o que existe** (8-9). ⚠ Sem isso, você não tem contexto suficiente para notar que um `200` está errado.

---

## Laboratório 10 — Quebrar o fluxo

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

```bash
mkdir -p ~/web-lab/m10 && cd ~/web-lab/m10
python3 -m venv .venv && source .venv/bin/activate
pip install flask
```

```python
# app.py — compra com os QUATRO grupos de falha
from flask import Flask, request, jsonify, make_response
import sqlite3, secrets, time, threading

app = Flask(__name__)
SESSOES = {}
LOCK = threading.Lock()

def db():
    c = sqlite3.connect("lab.db", timeout=5)
    c.executescript("""
      DROP TABLE IF EXISTS contas; DROP TABLE IF EXISTS carrinho;
      DROP TABLE IF EXISTS produtos; DROP TABLE IF EXISTS cupons;
      CREATE TABLE contas   (uid INT, saldo INT);
      CREATE TABLE produtos (id INT, nome TEXT, preco INT, estoque INT);
      CREATE TABLE carrinho (uid INT, prod INT, qtd INT, preco_unit INT);
      CREATE TABLE cupons   (cod TEXT, desconto INT, usos INT);
    """)
    c.executemany("INSERT INTO contas VALUES (?,?)", [(1,1000),(2,100)])
    c.executemany("INSERT INTO produtos VALUES (?,?,?,?)",
                  [(1,"mouse",50,10),(2,"servidor",900,1)])
    c.execute("INSERT INTO cupons VALUES ('LAB10',100,0)")
    c.commit(); return c

def eu(): return SESSOES.get(request.cookies.get("sessao"))

@app.post("/login")
def login():
    uid = int(request.form.get("uid","1"))
    sid = secrets.token_hex(8); SESSOES[sid] = uid
    r = make_response(jsonify({"ok":True})); r.set_cookie("sessao", sid); return r

# ══ GRUPO 1: sequencia e estado ═════════════════════════════
@app.post("/api/carrinho")
def add_carrinho():
    e = eu(); c = db()
    # ⚠ o PRECO vem do cliente, e nao e' reconferido na compra
    c.execute("INSERT INTO carrinho VALUES (?,?,?,?)",
              (e, request.form.get("prod"), request.form.get("qtd"),
               request.form.get("preco")))     # ⚠ preco do cliente
    c.commit(); return jsonify({"ok":True})

@app.post("/api/comprar")
def comprar():
    e = eu(); c = db()
    itens = c.execute("SELECT prod,qtd,preco_unit FROM carrinho WHERE uid=?", (e,)).fetchall()
    if not itens: return jsonify({"erro":"vazio"}), 400
    total = 0
    for prod, qtd, pu in itens:
        total += qtd * pu                      # ⚠ usa o preco do carrinho
        # ⚠ SEM conferir estoque aqui
        c.execute("UPDATE produtos SET estoque = estoque - ? WHERE id=?", (qtd, prod))
    conta = c.execute("SELECT saldo FROM contas WHERE uid=?", (e,)).fetchone()
    if conta[0] < total: return jsonify({"erro":"saldo"}), 400
    c.execute("UPDATE contas SET saldo = saldo - ? WHERE uid=?", (total, e))
    c.execute("DELETE FROM carrinho WHERE uid=?", (e,))
    c.commit()
    return jsonify({"ok":True, "total":total})

# ══ GRUPO 2: limite ═════════════════════════════════════════
@app.post("/api/cupom")
def cupom():
    e = eu()
    total = int(request.form.get("total","0"))
    cod = request.form.get("cod")
    c = db(); r = c.execute("SELECT desconto,usos FROM cupons WHERE cod=?", (cod,)).fetchone()
    if not r: return jsonify({"erro":"cupom"}), 404
    # ⚠ nao checa usos, e nao limita o desconto ao total
    c.execute("UPDATE cupons SET usos = usos + 1 WHERE cod=?", (cod,))
    c.commit()
    return jsonify({"ok":True, "total_final": total - r[0]})   # ⚠ pode ficar negativo

# ══ GRUPO 3: concorrencia ═══════════════════════════════════
@app.post("/api/transferir")
def transferir():
    e = eu()
    valor = int(request.form.get("valor","0"))
    destino = int(request.form.get("para","2"))
    c = db()
    saldo = c.execute("SELECT saldo FROM contas WHERE uid=?", (e,)).fetchone()[0]
    if saldo < valor:
        return jsonify({"erro":"saldo insuficiente"}), 400
    # ⚠ read-modify-write, SEM atomicidade
    time.sleep(0.05)                                  # janela visivel
    c.execute("UPDATE contas SET saldo = saldo - ? WHERE uid=?", (valor, e))
    c.execute("UPDATE contas SET saldo = saldo + ? WHERE uid=?", (valor, destino))
    c.commit()
    return jsonify({"ok":True, "saldo_antes":saldo})

# ══ GRUPO 4: emergente — o header do cliente afeta o que se devolve
@app.get("/api/saldo")
def saldo():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    c = db()
    # ⚠ o backend confia em X-Forwarded-Host para compor a URL de callback
    host = request.headers.get("X-Forwarded-Host", request.host)
    s = c.execute("SELECT saldo FROM contas WHERE uid=?", (e,)).fetchone()[0]
    return jsonify({"saldo": s, "origem": f"http://{host}/api/saldo",
                    "cache_key_sugerida": request.headers.get("X-Cache-Key","-")})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, threaded=True)
```

```bash
python app.py
curl -s -c u1.txt -X POST -d "uid=1" http://127.0.0.1:5000/login
curl -s -c u2.txt -X POST -d "uid=2" http://127.0.0.1:5000/login

# ── GRUPO 1: preco do cliente, estoque nao conferido ────────
curl -s -b u1.txt -X POST -d "prod=2&qtd=10&preco=1" http://127.0.0.1:5000/api/carrinho
curl -s -b u1.txt -X POST http://127.0.0.1:5000/api/comprar
# ⚠ servidor (900) comprado por 10, e estoque (1) ficou negativo?

# ── GRUPO 2: cupom sem limite ───────────────────────────────
for i in 1 2 3; do
  curl -s -b u1.txt -X POST -d "total=50&cod=LAB10" http://127.0.0.1:5000/api/cupom; echo
done
# ⚠ total_final ficou negativo?

# ── GRUPO 3: CONCORRENCIA — a mesma requisicao em paralelo ──
curl -s -b u1.txt http://127.0.0.1:5000/api/saldo
seq 1 10 | xargs -P 10 -I{} curl -s -b u1.txt \
  -X POST -d "valor=100&para=2" http://127.0.0.1:5000/api/transferir -o /dev/null
curl -s -b u1.txt http://127.0.0.1:5000/api/saldo
# ⚠ conte quantos "ok" e leia o saldo final
#    salmon inicial 1000, 10 transferencias de 100 = deveria sobrar 0
#    ⚠ se sobrar mais, houve corrida

# ── GRUPO 4: o header do cliente muda a resposta ────────────
curl -s -b u1.txt http://127.0.0.1:5000/api/saldo
curl -s -b u1.txt -H "X-Forwarded-Host: atacante.exemplo" http://127.0.0.1:5000/api/saldo
```

**O que observar:** no grupo 3, **a contagem é o achado**. ⚠ O `time.sleep(0.05)` existe para tornar a janela visível no lab — sem ele, a corrida existe e é mais difícil de reproduzir. É a lição do módulo 4 do Linux Internals: **medir a janela é o que transforma bug em achado**.

**Exercício 1:** para cada um dos **quatro** grupos, escreva a **presunção** violada (o passo 3 do 10.3). ⚠ Depois diga qual **teste** a expôs, no formato do módulo 2.

**Exercício 2:** conserte o **grupo 3** das **duas** formas do 10.2 (condição na escrita, e `FOR UPDATE`). ⚠ Rode os 10 pedidos em paralelo com cada correção e **conte** os que passam. Escreva a diferença.

**Exercício 3 (o que vale):** conserte o **grupo 1** (preço reconferido do servidor na compra, estoque conferido no mesmo comando) e o **grupo 2** (limite de uso e desconto limitado ao total). ⚠ Para o grupo 1, explique em duas linhas por que **reconferir o preço na compra** não basta se o **carrinho** ainda guarda o preço do cliente — e qual é a correção completa.

---

## Resumo

- ⚠ **Falha de lógica é a aplicação fazendo o que foi programada** — em uma sequência não imaginada.
- ⚠ **Ela não tem assinatura**: produz `200` normal, só faz sentido no negócio, e não se corrige por biblioteca.
- **Grupo 1 — sequência**: a aplicação confia na **ordem** e não verifica o **estado**.
- **Grupo 2 — limite**: valida o **tipo** e não a **plausibilidade**; ⚠ a **soma** pode ser inválida com linhas válidas.
- ⚠ **Grupo 3 — concorrência**: `ler → decidir → gravar` sem atomicidade; a correção é **pôr a condição dentro da escrita**.
- ⚠ **A quinta variável do módulo 2 é o paralelismo** — repetir N vezes ao mesmo tempo e **contar**.
- **Grupo 4 — emergente**: o comportamento nasce da **interação** entre camadas, não de uma delas.
- ⚠ **Cache poisoning é o módulo 1 com impacto em todos**: header do cliente entrando na chave.
- ⚠ **Confusão entre parsers é aprofundamento** — `Parser Differentials` (as N implementações) e `HTTP Smuggling` (as 10 variantes e a medição).
- ⚠ **A hierarquia de dificuldade:** padrão no código → matriz → entender o produto → paralelismo → comparar camadas.

---

## O que o próximo módulo entrega

Você achou o que o negócio não previu. O módulo 11 fecha o ciclo: **partir da requisição suspeita, rastrear até a linha, corrigir e provar com o teste** — a competência que o projeto final do módulo 12 vai cobrar inteira.
