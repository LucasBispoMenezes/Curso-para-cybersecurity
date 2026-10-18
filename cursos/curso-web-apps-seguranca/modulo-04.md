# Módulo 4 — Autorização e Controle de Acesso

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 4 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 a 3
**Próximo:** Módulo 5 — Injeções no servidor

---

## O que este módulo entrega

Ao final, você vai saber **testar autorização de forma sistemática**, em três dimensões — objeto, função e propriedade — e reconhecer **as quatro formas** pelas quais uma aplicação deixa alguém fazer o que não devia. É o módulo que cobre o item nº 1 do `OWASP Top 10` e do `OWASP API Top 10`, e o que mais rende em teste real.

---

## 4.1 Por que este é o bug número um

⚠ **A razão é estrutural, e não tem a ver com descuido:**

```
   AUTENTICACAO                        AUTORIZACAO
   ────────────                        ────────────

   UM middleware                       UMA checagem POR ROTA,
   UM decorator                        POR OBJETO,
   UM lugar                            POR CAMPO

   ⚠ falha = 401 em tudo               ⚠ falha = 200 em UMA rota
     (visivel, obvia)                    (invisivel, especifica)
```

⚠ **Código distribuído erra por **omissão**.** E a omissão tem uma propriedade cruel: **o caminho feliz passa**. A aplicação funciona perfeitamente para quem a usa como previsto — o bug só aparece para quem usa **como não foi previsto**.

⚠ **A frase que organiza o módulo:**

> **Toda rota que recebe um identificador é uma pergunta de autorização — e a pergunta não é
> "quem é você?", é "este objeto é seu, e você pode fazer esta operação com ele?"**

---

## 4.2 As três dimensões

⚠ **Autorização quebrada não é uma coisa só. São três, e o teste de cada uma é diferente:**

| Dimensão | A pergunta | ⚠ Nome |
|---|---|---|
| **Objeto** | Este registro é meu? | ⚠ **IDOR** / **BOLA** |
| **Função** | Eu posso chamar esta operação? | ⚠ **BFLA** |
| **Propriedade** | Eu posso ler/escrever **este campo**? | ⚠ **BOPLA** / mass assignment |

⚠ **A ordem de teste é essa, e importa:** objeto primeiro (mais fácil de achar e mais comum), função depois, propriedade por último (exige entender o modelo de dado).

---

## 4.3 IDOR / BOLA — autorização por objeto

⚠ **O mecanismo, em três linhas:**

```python
# ⚠ VULNERAVEL — o objeto vem do cliente, e so ele
@app.get("/api/pedido/<int:pedido_id>")
def pedido(pedido_id):
    eu = sessao_atual()
    return jsonify(db.execute(
        "SELECT * FROM pedidos WHERE id = ?", (pedido_id,)).fetchall())
    #                            ^^^^^^^^^^
    # ⚠ nenhuma checagem de "este pedido pertence a mim"
```

```python
# ✅ CORRIGIDO — o dono entra na CONSULTA, nao na verificacao
@app.get("/api/pedido/<int:pedido_id>")
def pedido(pedido_id):
    eu = sessao_atual()
    linhas = db.execute(
        "SELECT * FROM pedidos WHERE id = ? AND dono_id = ?",
        (pedido_id, eu["id"])).fetchall()
    #  ^^^^^^^^^^^^^^^^^^^^^^ a posse e parte da busca
    if not linhas:
        return jsonify({"erro": "nao encontrado"}), 404   # ⚠ 404, nao 403
    return jsonify(linhas)
```

⚠ **Três detalhes da correção que quase todo mundo erra:**

⚠ **Primeiro: a posse entra na consulta, não em um `if` depois.** Verificar depois significa que o objeto **já foi buscado** — e qualquer caminho que use o objeto sem passar pela verificação é vulnerável. ⚠ Colocar o dono no `WHERE` faz a omissão **impossível**, porque não existe consulta sem dono.

⚠ **Segundo: a resposta é `404`, não `403`.** Um `403` confirma que o objeto **existe** — e isso é enumeração. O `404` diz "não achei", e não revela nada.

⚠ **Terceiro: o identificador não precisa ser sequencial para o bug existir.** UUIDs apenas **encarecem** o ataque; eles não substituem a checagem. ⚠ Um UUID vaza em e-mail, em link compartilhado, em log, em `Referer` — e o bug continua lá.

⚠ **E a demonstração completa exige as duas variáveis do módulo 2:** trocar o **objeto** (aparece o dado do outro) **mantendo a identidade**, e trocar a **identidade** (o dado volta a ser o seu). Uma sozinha não prova posse.

---

## 4.4 BFLA — autorização por função

⚠ **Aqui o atacante não busca outro objeto — busca uma função que não é dele.**

```
   USUARIO COMUM                    ADMINISTRADOR
   ─────────────                    ─────────────

   a interface mostra:              a interface mostra:
     /api/perfil                      /api/admin/usuarios
     /api/pedidos                     /api/admin/usuarios/<id>/papel
                                      /api/admin/logs

   ⚠ o frontend NAO mostra            ⚠ o backend DEVERIA recusar
     as rotas de admin                  a chamada de quem nao e' admin
```

⚠ **A falha aparece de três formas, e a terceira é a mais comum:**

| Forma | O que acontece |
|---|---|
| Rota sem checagem | ⚠ Qualquer autenticado chama |
| Checagem só no **frontend** | ⚠ A rota está lá, o botão não |
| ⚠ **Verbo errado** | `GET /admin` está protegido, mas `POST`/`PUT`/`DELETE` **não** |
| Papel verificado por **string do cliente** | ⚠ `{"papel":"admin"}` no corpo |

⚠ **A terceira é a que mais escapa**, e a razão é compreensível: o autor protege a rota que ele **pensou**, e o framework registra **todos** os métodos. É o teste do módulo 2 na variável **método**.

```bash
# O teste de VERBO — a mesma rota, todos os metodos
R=/api/admin/usuarios
for M in GET POST PUT PATCH DELETE; do
  printf "%-7s " "$M"
  curl -s -o /dev/null -w "%{http_code}\n" -X $M \
       -b cookies-usuario.txt "http://127.0.0.1:5000$R"
done
# ⚠ se um deles retorna 2xx, o controle por funcao esta quebrado
```

⚠ **A defesa estrutural é a mesma do 4.3:** um **middleware por papel**, aplicado a um **prefixo de rota inteiro** — `/api/admin/*` — em vez de uma checagem por handler. ⚠ De novo: o que protege é a **impossibilidade de esquecer**, não a disciplina de lembrar.

```python
# ✅ CORRIGIDO — protecao por PREFIXO, nao por handler
@app.before_request
def guarda_admin():
    if request.path.startswith("/api/admin"):
        eu = sessao_atual()
        if not eu:              return jsonify({"erro":"sem sessao"}), 401
        if eu["papel"] != "admin": return jsonify({"erro":"negado"}), 403
```

---

## 4.5 Propriedade e mass assignment

⚠ **A dimensão mais sutil: o atacante não busca outro objeto nem outra função — ele busca **outro campo**.**

```python
# ⚠ VULNERAVEL — o corpo inteiro vira o objeto
@app.put("/api/perfil")
def atualizar():
    eu = sessao_atual()
    dados = request.get_json()          # {"nome":"bruno", "papel":"admin"}
    for k, v in dados.items():
        db.execute(f"UPDATE usuarios SET {k}=? WHERE id=?", (v, eu["id"]))
    #                              ^^^^
    # ⚠ QUALQUER campo — inclusive "papel" e "saldo"
    return jsonify({"ok": True})
```

⚠ **O **mass assignment** é isso: a aplicação aceita o objeto inteiro e grava tudo que veio.** O formulário tinha três campos; o **endpoint** aceita dezessete.

⚠ **A correção é a **allowlist explícita** — e ela revela a regra geral:**

```python
# ✅ CORRIGIDO — lista de campos PERMITIDOS, nao lista de proibidos
CAMPOS_PERMITIDOS = {"nome", "bio", "avatar"}

@app.put("/api/perfil")
def atualizar():
    eu = sessao_atual()
    dados = request.get_json()
    limpos = {k: v for k, v in dados.items() if k in CAMPOS_PERMITIDOS}
    # ⚠ "papel" e "saldo" nao estao na lista -> nunca sao gravados
    for k, v in limpos.items():
        db.execute(f"UPDATE usuarios SET {k}=? WHERE id=?", (v, eu["id"]))
    return jsonify({"ok": True})
```

⚠ **A regra que fecha a seção, e vale para o curso inteiro:**

> **Allowlist, nunca denylist.** ⚠ A denylist falha por **campo novo** — alguém adiciona uma coluna
> six meses depois, esquece de bloqueá-la, e o endpoint já a aceita.
> A allowlist falha por **omissão visível** — o campo novo simplesmente não funciona, e alguém nota.

⚠ **É a mesma lógica do `parse` do curso de Linux Internals:** valide **o que é permitido**, e trate o resto como hostil. A denylist presume que você conhece todos os ataques; a allowlist presume que você **não** conhece.

---

## 4.6 Exposição excessiva de dado

⚠ **A falha que não é de acesso, mas de **quantidade**.** O atacante tem direito ao objeto — e a resposta entrega **mais do que a operação precisa**.

```python
# ⚠ VULNERAVEL — devolve a LINHA inteira
@app.get("/api/usuario/<int:uid>")
def usuario(uid):
    if uid != sessao_atual()["id"]:
        return jsonify({"erro":"negado"}), 403
    return jsonify(db.execute("SELECT * FROM usuarios WHERE id=?", (uid,)).fetchall())
    # ⚠ inclui senha_hash, token_reset, campos internos...
```

⚠ **O `SELECT *` é o problema**, e ele aparece em **toda** camada:

| Camada | Falha |
|---|---|
| **SQL** | ⚠ `SELECT *` traz coluna interna |
| **Serializador** | ⚠ O objeto ORM inteiro vira JSON |
| **Log** | ⚠ O corpo inteiro vai para o log, com senha |
| **API externa** | ⚠ A resposta do terceiro é repassada crua |

⚠ **A correção é a **seleção explícita**, do banco até o JSON:** liste as colunas no `SELECT`, e **construa o dicionário de resposta campo a campo**. ⚠ Parece redundante, e é exatamente por isso que protege: as duas listas são independentes, e um campo novo no banco **não** aparece na resposta por acidente.

⚠ **E há o efeito colateral de segurança real:** uma exposição de dado é frequentemente o **primeiro passo** de outro ataque. Um `token_reset` vazado em um JSON é a conta tomada — pela rota de recuperação do módulo 3.

---

## 4.7 Escalada: horizontal e vertical

⚠ **Os dois nomes, e eles não são intercambiáveis:**

```
   HORIZONTAL                         VERTICAL
   ──────────                         ────────

   usuario A  ──►  usuario B          usuario  ──►  admin
   (mesmo papel,                     (papel dif.)
    outro dono)

   ⚠ IDOR / BOLA                      ⚠ BFLA / mass assignment
```

⚠ **A distinção importa porque a defesa é diferente:** horizontal se resolve com **posse na consulta**; vertical, com **papel no prefixo**. E há o caso misto, mais grave: escalar horizontalmente **para chegar** a um objeto admin e depois verticalmente.

⚠ **E a tabela que o relatório final exige:**

| # | Rota | Minha identidade | Objeto/função pedido | Resultado | ⚠ Classe |
|---|---|---|---|---|---|
| 1 | `GET /api/pedido/91` | bruno | pedido de ana | 200 + dado | **IDOR** |
| 2 | `POST /api/admin/usuarios` | bruno | função admin | 201 | **BFLA** |
| 3 | `PUT /api/perfil` | bruno | `{"papel":"admin"}` | 200 + papel alterado | **mass assignment** |
| 4 | `GET /api/usuario/2` | bruno | próprio | 200 + `senha_hash` | **exposição** |

⚠ **A coluna da direita é o que transforma quatro achados em um relatório.** Cada linha tem **classe**, e a classe determina a **correção** — que é o que o módulo 11 vai pedir.

---

## 4.8 Ferramenta: por que a automática falha aqui

⚠ **Autorização quebrada é o item nº 1 das listas, e a que menos se acha automaticamente.** A razão:

| O que a ferramenta precisa saber | ⚠ O que ela não sabe |
|---|---|
| Que o objeto 91 pertence a ana | ⚠ Não há marcador no dado |
| Que bruno não é admin | ⚠ Precisaria de segunda conta |
| Que `papel` é campo privilegiado | ⚠ Depende do modelo de negócio |
| Que a operação `PUT` era indevida | ⚠ Sem o contrato esperado |

⚠ **A consequência:** o scanner testa o que **parece** vulnerável — `id=1` sequencial, rota com nome `admin` — e **não testa o que importa**. ⚠ **Autorização exige contexto de negócio**, e contexto de negócio não se automatiza.

⚠ **O uso correto, uma vez mais:** a ferramenta **enumera rotas e parâmetros** (útil, e cansativo de fazer à mão). A decisão de quem pode o quê é **sua** — e a matriz do 4.7 é o instrumento.

---

## Laboratório 4 — A matriz de autorização

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

```bash
mkdir -p ~/web-lab/m04 && cd ~/web-lab/m04
python3 -m venv .venv && source .venv/bin/activate
pip install flask
```

```python
# app.py — multiusuario, com as QUATRO falhas do modulo
from flask import Flask, request, jsonify, make_response
import sqlite3, secrets

app = Flask(__name__)
SESSOES = {}

def db():
    c = sqlite3.connect("lab.db"); c.row_factory = sqlite3.Row
    c.executescript("""
      DROP TABLE IF EXISTS usuarios; DROP TABLE IF EXISTS pedidos;
      CREATE TABLE usuarios (id INT, nome TEXT, papel TEXT, senha_hash TEXT);
      CREATE TABLE pedidos  (id INT, dono_id INT, item TEXT, valor INT);
    """)
    c.executemany("INSERT INTO usuarios VALUES (?,?,?,?)", [
        (1,"ana","admin","hash_ana"), (2,"bruno","usuario","hash_bruno"),
        (3,"carla","usuario","hash_carla")])
    c.executemany("INSERT INTO pedidos VALUES (?,?,?,?)", [
        (10,2,"mouse",50), (11,2,"teclado",120), (91,1,"servidor",9000)])
    c.commit(); return c

def eu():
    return SESSOES.get(request.cookies.get("sessao"))

@app.post("/login")
def login():
    c = db(); u = c.execute("SELECT id,papel FROM usuarios WHERE nome=?",
                            (request.form.get("nome"),)).fetchone()
    if not u: return jsonify({"erro":"nao existe"}), 401
    sid = secrets.token_hex(8); SESSOES[sid] = {"id":u["id"],"papel":u["papel"]}
    r = make_response(jsonify({"ok":True})); r.set_cookie("sessao", sid)
    return r

# ── FALHA 1: IDOR — o objeto vem do cliente, sem posse ────────────
@app.get("/api/pedido/<int:pid>")
def pedido(pid):
    if not eu(): return jsonify({"erro":"sem sessao"}), 401
    return jsonify([dict(r) for r in db().execute(
        "SELECT * FROM pedidos WHERE id=?", (pid,)).fetchall()])

# ── FALHA 2: BFLA — so o GET esta "protegido" mentalmente ─────────
@app.route("/api/admin/usuarios", methods=["GET","POST","PUT","DELETE"])
def admin_usuarios():
    if not eu(): return jsonify({"erro":"sem sessao"}), 401
    if request.method == "GET" and eu()["papel"] != "admin":
        return jsonify({"erro":"negado"}), 403
    # ⚠ POST/PUT/DELETE nao checam papel nenhum
    return jsonify([dict(r) for r in db().execute("SELECT * FROM usuarios").fetchall()])

# ── FALHA 3: mass assignment ──────────────────────────────────────
@app.put("/api/perfil")
def atualizar():
    if not eu(): return jsonify({"erro":"sem sessao"}), 401
    c = db()
    for k, v in (request.get_json() or {}).items():
        if k == "id": continue
        c.execute(f"UPDATE usuarios SET {k}=? WHERE id=?", (v, eu()["id"]))
    c.commit()
    return jsonify({"ok":True})

# ── FALHA 4: exposicao — SELECT * na resposta ─────────────────────
@app.get("/api/usuario/<int:uid>")
def usuario(uid):
    if not eu(): return jsonify({"erro":"sem sessao"}), 401
    if uid != eu()["id"]: return jsonify({"erro":"negado"}), 403
    return jsonify([dict(r) for r in db().execute(
        "SELECT * FROM usuarios WHERE id=?", (uid,)).fetchall()])

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
```

```bash
python app.py

# ── Duas identidades, e a matriz ────────────────────────────
curl -s -c bruno.txt -X POST -d "nome=bruno" http://127.0.0.1:5000/login
curl -s -c ana.txt   -X POST -d "nome=ana"   http://127.0.0.1:5000/login

# 1. OBJETO — troque o ID, MANTENHA a identidade (modulo 2, var. objeto)
curl -s -b bruno.txt http://127.0.0.1:5000/api/pedido/10    # baseline: meu
curl -s -b bruno.txt http://127.0.0.1:5000/api/pedido/91    # ⚠ variante: da ana

# 2. IDENTIDADE — troque a credencial, MANTENHA o objeto
curl -s -b ana.txt   http://127.0.0.1:5000/api/pedido/91    # prova que e da ana

# 3. FUNCAO — todos os verbos, como usuario comum
for M in GET POST PUT PATCH DELETE; do
  printf "%-7s " "$M"
  curl -s -o /dev/null -w "%{http_code}\n" -X $M -b bruno.txt \
       http://127.0.0.1:5000/api/admin/usuarios
done

# 4. PROPRIEDADE — mande um campo que o formulario nao tem
curl -s -b bruno.txt -X PUT -H "Content-Type: application/json" \
     -d '{"nome":"bruno","papel":"admin"}' http://127.0.0.1:5000/api/perfil
curl -s -b bruno.txt http://127.0.0.1:5000/api/usuario/2    # ⚠ ainda sou usuario?

# 5. EXPOSICAO — o que a resposta traz
curl -s -b bruno.txt http://127.0.0.1:5000/api/usuario/2 | python3 -m json.tool
```

**O que observar:** nos passos 1 e 2, a **regra do módulo 2** — a demonstração de posse exige as **duas** variáveis. No passo 4, `papel` foi aceito: o formulário tinha três campos, o **endpoint** aceitou três mais quatorze. No passo 5, `senha_hash` está na resposta.

**Exercício 1:** monte a **matriz do 4.7** para esta aplicação, com pelo menos **quatro** linhas — uma por classe. ⚠ Cada linha precisa de rota, identidade, objeto/função e resultado. Sem isso, você tem achados, não relatório.

**Exercício 2:** corrija a **falha 1** movendo a posse para dentro do `WHERE`, e mude a resposta para `404`. ⚠ Depois rode de novo a variável **identidade** e explique por que a mudança de `403` para `404` importa.

**Exercício 3 (o que vale):** corrija as **quatro** falhas e escreva o **teste de regressão** de cada uma — um script que roda contra o código antigo (**falha**) e contra o novo (**passa**). ⚠ Implemente a proteção de admin por **prefixo** (middleware `before_request`), não por handler, e escreva por que a diferença importa.

---

## Resumo

- ⚠ **Autorização quebrada é o bug nº 1** porque é **distribuída**: uma checagem por rota, e a omissão passa no caminho feliz.
- As **três dimensões**: **objeto** (IDOR/BOLA), **função** (BFLA), **propriedade** (mass assignment/BOPLA).
- ⚠ **Coloque a posse dentro do `WHERE`** — assim a omissão é **impossível**, não apenas improvável.
- ⚠ **Responda `404`, não `403`** — o `403` confirma que o objeto existe, e isso é enumeração.
- ⚠ **UUID não corrige IDOR** — só encarece; o vazamento do identificador é questão de tempo.
- ⚠ **Teste todos os verbos**: o autor protege a rota que **pensou**, o framework registra todas.
- ⚠ **Allowlist, nunca denylist** — a denylist falha por **campo novo**, a allowlist por omissão visível.
- **`SELECT *` é exposição esperando acontecer** — selecione explicitamente, do banco ao JSON.
- ⚠ **Ferramenta não acha autorização quebrada** — falta contexto de negócio; a matriz é o instrumento.

---

## O que o próximo módulo entrega

Você sabe decidir **acesso**. O módulo 5 trata da falha em que a aplicação **faz o que não devia com o que recebeu**: injeção — SQL, comando, caminho — com a distinção entre **causa-raiz, sintoma e impacto** que o módulo 11 vai usar.
