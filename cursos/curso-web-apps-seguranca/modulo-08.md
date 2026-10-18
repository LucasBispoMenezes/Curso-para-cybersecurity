# Módulo 8 — Fundamentos de Segurança de APIs

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 8 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 a 7
**Próximo:** Módulo 9 — GraphQL, serialização e contratos

---

## O que este módulo entrega

Ao final, você vai saber **tratar uma API como um contrato** e cobri-la **sistematicamente** — com a matriz de endpoints, identidades e permissões. Você vai entender por que API é onde a autorização quebra mais, e onde o **inventário** (o que existe, o que é obsoleto) é parte do achado. É o módulo alinhado ao `OWASP API Security Top 10`.

---

## 8.1 Por que API é diferente de aplicação web

⚠ **Não é a mesma coisa com outro nome. Quatro diferenças estruturais:**

| Aspecto | Aplicação web | ⚠ API |
|---|---|---|
| Interface | HTML renderizado | ⚠ **JSON** — sem tela que esconda campo |
| Rota | Listada no HTML | ⚠ **Descoberta por outra via** |
| Método | `GET`/`POST` quase só | ⚠ **`PUT`, `PATCH`, `DELETE`** com semântica |
| Consumidor | Pessoa | ⚠ **Outra aplicação** — inclusive app móvel |
| Versão | Implícita | ⚠ **Explícita e múltipla, ao mesmo tempo** |
| ⚠ Autorização | Por página | ⚠ **Por endpoint, por objeto, por campo** |

⚠ **A primeira linha é a que muda tudo:** na aplicação web, o **frontend filtra** — a tela mostra três campos, o formulário envia três. ⚠ Na API, **não há tela**: o cliente vê o JSON inteiro, e a aplicação não tem onde esconder.

⚠ **A última linha é a razão do módulo:** API multiplica o número de decisões de autorização. Cada endpoint é uma pergunta, e cada pergunta é uma chance de omissão.

---

## 8.2 Descoberta: o inventário como achado

⚠ **A rota da API não está no HTML. Ela está em:**

| Fonte | ⚠ O que revela |
|---|---|
| **OpenAPI / Swagger** | ⚠ O contrato — e às vezes o **`try it out`** |
| **JavaScript do frontend** | ⚠ As chamadas reais, inclusive as não documentadas |
| **App móvel** | ⚠ A API **completa** — o app precisa de tudo |
| **`OPTIONS`** | ⚠ Métodos permitidos, sem autenticação |
| **Erro 404 / 405** | ⚠ Rota existe, método não |
| **Cabeçalho de versão** | ⚠ A **outra versão** existe |
| **Trilha de auditoria / log** | Nomes de endpoint antigos |

⚠ **O terceiro item é o mais desprezado e o mais produtivo.** Um app móvel **não tem como esconder** — ele precisa dos endpoints, dos parâmetros e das versões. ⚠ Engenharia reversa do app entrega o mapa, e é reconhecimento padrão.

⚠ **E o `OPTIONS` é o teste mais barato que existe:**

```bash
# ⚠ Metodos permitidos, muitas vezes SEM autenticacao
curl -s -i -X OPTIONS http://127.0.0.1:5000/api/pedidos | grep -i allow
# Allow: GET, HEAD, OPTIONS, PUT, DELETE   <- ⚠ os tres ultimos importam
```

⚠ **E a linha do erro 404 vs 405:** um `405 Method Not Allowed` **confirma que a rota existe**. ⚠ A comparação do módulo 2 — dois pedidos, uma variável — transforma isso em descoberta.

---

## 8.3 Versionamento: a superfície esquecida

⚠ **Aqui está o achado que quase ninguém procura:**

```
   /api/v1/pedidos/91   ⚠ versao ANTIGA — sem a correcao
   /api/v2/pedidos/91   ✅ versao atual — com autorizacao
   /api/v3/pedidos/91   ✅
   /api/internal/...    ⚠ nao documentado
   /api/beta/...        ⚠ nao documentado
   /legacy/...          ⚠ nao documentado
```

⚠ **O padrão é universal:** uma correção de autorização é aplicada na versão **atual**, e a versão **anterior** continua respondendo — porque algum cliente ainda a usa. ⚠ **A vulnerabilidade corrigida continua viva, em outra rota.**

⚠ **Os dois testes, e o segundo é o que rende:**

```bash
# 1. ⚠ O mesmo objeto, em TODAS as versoes
for v in v1 v2 v3; do
  printf "%-4s " "$v"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -b cookie-de-bruno.txt "http://127.0.0.1:5000/api/$v/pedidos/91"
done

# 2. ⚠ As versoes NAO documentadas — os nomes que todo mundo usa
for p in internal beta legacy admin test dev staging old; do
  printf "%-9s " "$p"
  curl -s -o /dev/null -w "%{http_code}\n" \
       "http://127.0.0.1:5000/api/$p/pedidos/91"
done
# ⚠ um 200/401 (e nao 404) confirma que a rota existe
```

⚠ **O segundo é o **inventário não oficial** — e é o que o `OWASP API Top 10` chama de gestão inadequada de inventário.** A regra: **um `401` é mais informativo que um `404`** — o primeiro diz "existe, e você não entrou". ⚠ Compare o **status**, não o corpo.

---

## 8.4 A matriz: identidade × endpoint × dado

⚠ **O instrumento deste módulo, e ele é o que transforma teste em cobertura:**

| Endpoint | anônimo | usuário comum | admin | ⚠ Observação |
|---|---|---|---|---|
| `GET /api/perfil` | 401 | 200 (próprio) | 200 | ok |
| `GET /api/pedidos/{id}` | 401 | ⚠ **200 (de outro)** | 200 | **BOLA** |
| `PUT /api/pedidos/{id}` | 401 | ⚠ **200** | 200 | **BOLA** |
| `POST /api/admin/usuarios` | 401 | ⚠ **201** | 201 | **BFLA** |
| `GET /api/usuario/{id}` | 401 | 200 + `hash` | 200 + `hash` | **exposição** |
| `OPTIONS /api/pedidos` | ⚠ **200** | 200 | 200 | métodos vazados |
| `GET /api/v1/pedidos/{id}` | 401 | ⚠ **200 (de outro)** | 200 | **versão antiga** |

⚠ **A matriz se lê por coluna, e a coluna do meio é a que importa:** *para o usuário comum, o que retorna `2xx` que **não deveria**?* ⚠ É assim que se acha autorização quebrada **sistematicamente**, em vez de por sorte.

⚠ **E a matriz tem uma segunda dimensão, que o módulo 4 já introduziu:** para cada célula, **qual campo** veio. ⚠ Um `200` com campo a menos é `200` igual — e o campo é o achado.

⚠ **A regra de cobertura:** um endpoint não testado é **lacuna declarada**, não "ok". ⚠ O relatório do módulo 12 precisa ter a coluna de observação preenchida para **todos** os endpoints — inclusive os que passaram.

---

## 8.5 Rate limiting e consumo de recurso

⚠ **`OWASP API4` — recurso irrestrito. E a distinção que importa:**

| Recurso | ⚠ O ataque |
|---|---|
| **Requisição por segundo** | Força bruta de credencial, de código |
| **Tamanho de resposta** | ⚠ Paginação sem limite — dump do banco |
| **Profundidade de consulta** | ⚠ Módulo 9 (GraphQL) |
| **Custo de computação** | ⚠ Regex catastrófica, hash caro |
| ⚠ **Operação de negócio** | ⚠ Módulo 10 — cupom, reembolso, tentativa |
| Upload sem limite | ⚠ Disco cheio |

⚠ **O segundo é o mais simples e o mais comum:**

```bash
# ⚠ Paginacao sem limite: quantos registros voce consegue de uma vez?
for n in 10 100 10000 1000000; do
  printf "limit=%-9s " "$n"
  curl -s "http://127.0.0.1:5000/api/pedidos?limit=$n" | \
    python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null
done
```

⚠ **E a regra que liga este módulo ao 3:** o rate limiting tem de ser por **identidade** e por **alvo**, não por IP. ⚠ Rate limit por IP **não** impede força bruta distribuída — e o `X-Forwarded-For` do módulo 1 é justamente o que a burla.

⚠ **A quinta linha é a que quase ninguém considera, e é a mais valiosa em impacto de negócio:** não é DoS, é **abuso de fluxo**. Um cupom que pode ser aplicado mil vezes, um reembolso que pode ser repetido, uma transferência que pode ser disparada em paralelo. ⚠ É o módulo 10 — e o `OWASP API6`.

---

## 8.6 Autorização em API: as três, de novo

⚠ **O módulo 4 se repete aqui com outro nome, e as listas do `OWASP` o confirmam:**

| `OWASP API` | Dimensão | ⚠ Teste |
|---|---|---|
| **API1 — BOLA** | Objeto | Trocar o ID, manter a identidade |
| **API3 — BOPLA** | ⚠ **Propriedade** | ⚠ Mandar campo que a tela não mostra |
| **API5 — BFLA** | Função | Todos os verbos, como usuário comum |
| API8 — Misconfig | — | Header, erro, CORS, método |
| API9 — Inventário | — | Versões e rotas não documentadas |
| API10 — Terceiro | ⚠ Fronteira 5 | Módulo 7 |

⚠ **`API3` merece a diferença em relação a `API1`:** BOLA é **ler objeto alheio**; BOPLA é **ler ou escrever atributo que não devia**. ⚠ E o BOPLA aparece **tanto na resposta quanto na requisição** — o mesmo endpoint pode vazar `senha_hash` na saída e aceitar `papel` na entrada. É o módulo 4, seções 5 e 6.

⚠ **A frase que resume a API:** *em aplicação web, a tela limita o que o usuário tenta. Em API, **nada** limita — o cliente decide o que mandar, e a única coisa entre ele e o dado é a **checagem do endpoint**.* ⚠ Por isso a taxa de falha é maior.

---

## 8.7 Ferramenta e o limite dela

⚠ **API é onde a ferramenta automática **rende mais** — e ainda assim, não o suficiente.**

| O que ela acha bem | ⚠ O que ela não acha |
|---|---|
| Rotas não documentadas | ⚠ Qual resposta é **indevida** |
| Métodos abertos (`OPTIONS`) | ⚠ Se o objeto é de outro usuário |
| Falta de header de segurança | ⚠ Qual campo é privilegiado |
| Versões expostas | ⚠ Abuso de fluxo de negócio |
| ⚠ Esquema de OpenAPI | ⚠ A **omissão** de checagem |

⚠ **A razão é a mesma do módulo 4:** autorização exige **contexto de negócio**. ⚠ A ferramenta sabe que a rota existe; ela não sabe que o pedido 91 é da ana. A matriz é o instrumento — e ela é **sua**.

---

## Laboratório 8 — A matriz completa

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

```bash
mkdir -p ~/web-lab/m08 && cd ~/web-lab/m08
python3 -m venv .venv && source .venv/bin/activate
pip install flask
```

```python
# app.py — API com v1 vulneravel, v2 corrigida, e rotas nao documentadas
from flask import Flask, request, jsonify, make_response
import sqlite3, secrets

app = Flask(__name__)
SESSOES = {}

def db():
    c = sqlite3.connect("lab.db")
    c.executescript("""
      DROP TABLE IF EXISTS usuarios; DROP TABLE IF EXISTS pedidos;
      CREATE TABLE usuarios (id INT, nome TEXT, papel TEXT, senha_hash TEXT, token_reset TEXT);
      CREATE TABLE pedidos  (id INT, dono_id INT, item TEXT, valor INT);
    """)
    c.executemany("INSERT INTO usuarios VALUES (?,?,?,?,?)", [
        (1,"ana","admin","hash_ana","tok_ana"),
        (2,"bruno","usuario","hash_bruno","tok_bruno"),
        (3,"carla","usuario","hash_carla","tok_carla")])
    c.executemany("INSERT INTO pedidos VALUES (?,?,?,?)", [
        (10,2,"mouse",50),(11,2,"teclado",120),(91,1,"servidor",9000),(92,3,"monitor",800)])
    c.commit(); return c

def eu():
    return SESSOES.get(request.cookies.get("sessao"))

@app.post("/login")
def login():
    c = db(); u = c.execute("SELECT id,papel FROM usuarios WHERE nome=?",
                            (request.form.get("nome"),)).fetchone()
    if not u: return jsonify({"erro":"nao existe"}), 401
    sid = secrets.token_hex(8); SESSOES[sid] = {"id":u["id"],"papel":u["papel"]}
    r = make_response(jsonify({"ok":True})); r.set_cookie("sessao", sid); return r

# ══ v1 — SEM checagem de posse (a versao "antiga") ═══════════
@app.get("/api/v1/pedidos/<int:pid>")
def v1_pedido(pid):
    if not eu(): return jsonify({"erro":"sem sessao"}), 401
    return jsonify([dict(r) for r in db().execute(
        "SELECT * FROM pedidos WHERE id=?", (pid,)).fetchall()])   # ⚠ IDOR

# ══ v2 — COM posse na consulta (a versao "corrigida") ════════
@app.get("/api/v2/pedidos/<int:pid>")
def v2_pedido(pid):
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    linhas = [dict(r) for r in db().execute(
        "SELECT id,item,valor FROM pedidos WHERE id=? AND dono_id=?",
        (pid, e["id"])).fetchall()]                                 # ✅ posse no WHERE
    if not linhas: return jsonify({"erro":"nao encontrado"}), 404
    return jsonify(linhas)

# ══ Rotas SEM documentacao ═══════════════════════════════════
@app.route("/api/pedidos", methods=["GET","POST","PUT","DELETE","OPTIONS"])
def pedidos_colecao():
    e = eu()
    if request.method == "OPTIONS":
        # ⚠ responde ANTES de autenticar
        return make_response("", 200, {"Allow":"GET,POST,PUT,DELETE,OPTIONS"})
    if not e: return jsonify({"erro":"sem sessao"}), 401
    if request.method == "GET":
        lim = request.args.get("limit", 10)            # ⚠ sem limite maximo
        return jsonify([dict(r) for r in db().execute(
            f"SELECT * FROM pedidos LIMIT {lim}").fetchall()])
    if request.method == "DELETE":                      # ⚠ sem checar dono nem papel
        db().execute("DELETE FROM pedidos WHERE id=?", (request.args.get("id"),))
        db().commit(); return jsonify({"ok":True})
    return jsonify({"ok":True})

@app.get("/api/internal/usuarios")                     # ⚠ nao documentada
def internal_usuarios():
    if not eu(): return jsonify({"erro":"sem sessao"}), 401
    return jsonify([dict(r) for r in db().execute("SELECT * FROM usuarios").fetchall()])

@app.put("/api/usuario/<int:uid>")
def usuario_put(uid):
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    if uid != e["id"]: return jsonify({"erro":"negado"}), 403
    for k, v in (request.get_json() or {}).items():    # ⚠ mass assignment
        db().execute(f"UPDATE usuarios SET {k}=? WHERE id=?", (v, uid))
    db().commit()
    return jsonify([dict(r) for r in db().execute(
        "SELECT * FROM usuarios WHERE id=?", (uid,)).fetchall()])   # ⚠ exposicao

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
```

```bash
python app.py

curl -s -c anon.txt -o /dev/null http://127.0.0.1:5000/
curl -s -c bruno.txt -X POST -d "nome=bruno" http://127.0.0.1:5000/login
curl -s -c ana.txt   -X POST -d "nome=ana"   http://127.0.0.1:5000/login

# ── 1. DESCOBERTA — OPTIONS antes de tudo ───────────────────
curl -s -i -X OPTIONS http://127.0.0.1:5000/api/pedidos | grep -i allow

# ── 2. VERSIONAMENTO — o mesmo objeto em todas as versoes ───
for v in v1 v2; do
  printf "%-4s " "$v"
  curl -s -o /dev/null -w "%{http_code}\n" -b bruno.txt \
       "http://127.0.0.1:5000/api/$v/pedidos/91"
done
# ⚠ v1 deve retornar 200 (pedido da ana), v2 deve retornar 404

# ── 3. INVENTARIO NAO OFICIAL ───────────────────────────────
for p in internal admin beta legacy; do
  printf "%-9s " "$p"
  curl -s -o /dev/null -w "%{http_code}\n" -b bruno.txt \
       "http://127.0.0.1:5000/api/$p/usuarios"
done

# ── 4. RATE LIMIT / PAGINACAO ───────────────────────────────
for n in 10 1000 100000; do
  printf "limit=%-7s " "$n"
  curl -s -b bruno.txt "http://127.0.0.1:5000/api/pedidos?limit=$n" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d),'registros', 'hash' in str(d))" 2>/dev/null
done

# ── 5. A MATRIZ — identidade x endpoint ─────────────────────
echo "endpoint                         anon  bruno  ana"
for ep in "/api/pedidos" "/api/v1/pedidos/91" "/api/v2/pedidos/91" \
          "/api/internal/usuarios" "/api/usuario/2"; do
  printf "%-32s " "$ep"
  for c in anon bruno ana; do
    printf "%-6s " "$(curl -s -o /dev/null -w '%{http_code}' -b $c.txt "http://127.0.0.1:5000$ep")"
  done; echo
done
```

**O que observar:** no passo 2, **a mesma vulnerabilidade corrigida em `v2` continua viva em `v1`** — e é o achado mais valioso do módulo, porque ninguém procura. No passo 4, o `limit` sem teto traz o banco inteiro com `hash` junto. No passo 5, a matriz pronta é o **entregável**.

**Exercício 1:** preencha a **matriz completa** (8.4) com **todos** os endpoints, incluindo os que passaram. ⚠ A coluna de observação deve ter texto para cada linha — "ok" é resposta aceitável, vazio não.

**Exercício 2:** no passo 3, identifique **quais** rotas não documentadas existem e o que cada uma expõe. ⚠ Depois escreva, para cada, o **remédio**: remover, proteger ou documentar.

**Exercício 3 (o que vale):** corrija **(a)** o `limit` sem teto, **(b)** o `DELETE` sem checagem, **(c)** a exposição do `SELECT *` e **(d)** o mass assignment do `PUT`. ⚠ Depois volte o passo 4 e 5 e mostre a matriz antes e depois. Escreva o **teste de regressão** do `limit` e do `DELETE`.

---

## Resumo

- ⚠ **API não é aplicação web com outro nome**: sem tela, **nada esconde** campo — o cliente vê o JSON.
- ⚠ **A rota se descobre por outras vias**: OpenAPI, **JavaScript**, **app móvel**, `OPTIONS`, erro 404 vs 405.
- ⚠ **`OPTIONS` responde sem autenticar** — o teste mais barato que existe.
- ⚠ **Versionamento é a superfície esquecida**: a correção aplicada em `v2` deixa a falha viva em `v1`.
- ⚠ **`401` é mais informativo que `404`** — o primeiro confirma que a rota existe.
- ⚠ **A matriz identidade × endpoint × dado** é o instrumento: leia por coluna, e a do **usuário comum** é a que importa.
- ⚠ **Endpoint não testado é lacuna declarada**, não "ok".
- ⚠ **Paginação sem teto** é o vazamento mais simples e mais comum.
- ⚠ **Rate limit por IP não impede força bruta** — e `X-Forwarded-For` o burla.
- ⚠ **Ferramenta acha rota; não acha resposta indevida** — falta contexto de negócio.

---

## O que o próximo módulo entrega

Você cobriu a API REST. O módulo 9 trata de dois assuntos que quebram o modelo: **GraphQL** — onde o cliente monta a consulta — e **contratos**, onde o documentado e o real divergem.
