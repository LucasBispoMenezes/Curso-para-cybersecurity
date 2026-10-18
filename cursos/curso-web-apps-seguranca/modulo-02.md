# Módulo 2 — Metodologia de Investigação e Instrumentação

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 2 de 12 · 3 horas
**Pré-requisitos:** Módulo 1
**Próximo:** Módulo 3 — Autenticação, sessões e identidade

---

## O que este módulo entrega

Ao final, você vai saber **transformar exploração em investigação**: interceptar, repetir, comparar e documentar. E, mais importante, saber **separar o que você observou do que você concluiu** — a disciplina que separa um achado de um palpite. É o método que os dez módulos seguintes assumem.

---

## 2.1 Observação, hipótese, evidência

⚠ **A distinção que organiza o curso inteiro:**

| Termo | O que é | ⚠ Como se falsifica |
|---|---|---|
| **Observação** | ⚠ O que a resposta **fez** | Repetindo — se não repete, não é observação |
| **Hipótese** | ⚠ O que você **acha** que explica | Com um teste que a derrube |
| **Evidência** | ⚠ O que **prova** que a hipótese é verdadeira | ⚠ Com o registro do dado, não da conclusão |

⚠ **O erro que este módulo existe para impedir:** confundir os três. "O app é vulnerável a IDOR" **não é observação** — é conclusão. A observação é: *"com o cookie da ana, `GET /api/perfil?user_id=2` retornou o perfil do bruno, com status 200 e o campo `nome: bruno`"*.

```
   RUIM:  "achei um IDOR"                    <- conclusao sem evidencia
   BOM:   "A requisicao X, com a credencial Y,
           retornou o dado Z, que pertence a W" <- reproduzivel

   ⚠ A diferenca e que o segundo pode ser
     conferido por outra pessoa
```

⚠ **A regra prática:** se você não consegue escrever a observação em **uma frase com requisição, credencial e resposta**, você não observou — você inferiu.

---

## 2.2 Instrumentação: as quatro fontes

⚠ **Toda análise de web usa quatro fontes, e elas respondem perguntas diferentes:**

| Fonte | O que mostra | ⚠ O que ela **não** mostra |
|---|---|---|
| **DevTools (Network)** | O que o **navegador** enviou e recebeu | O que o proxy reescreveu |
| **Proxy de interceptação** | ⚠ **Tudo**, e permite editar | O que o servidor faz por dentro |
| **Log do servidor** | O que chegou ao backend | O que a infraestrutura fez antes |
| **Código-fonte** | ⚠ **A causa** | O que o dado real produz |

⚠ **A terceira e a quarta são as que a maioria ignora** — e são as que transformam sintoma em causa. O log mostra **o que o backend recebeu**, que pode ser diferente do que o cliente enviou (fronteira 2). O código mostra **por que**.

⚠ **A ordem de uso, e ela importa:**

```
   1. DevTools   ->  entender o fluxo previsto
   2. Proxy      ->  ⚠ repetir e MODIFICAR
   3. Log        ->  confirmar o que o backend viu
   4. Codigo     ->  ⚠ achar a CAUSA
```

⚠ **Pular do passo 2 para a conclusão é o erro comum.** O passo 3 confirma que a modificação **chegou**; o 4 explica **por que funcionou**. Sem o 4, você tem um achado que não sabe corrigir.

---

## 2.3 O método de comparação

⚠ **A técnica central deste módulo, e a mais reutilizada:** **comparar duas requisições que diferem em uma coisa só.**

```
   A/B testing de requisicao:

   BASELINE (o comportamento previsto)      VARIANTE (uma coisa muda)
   ┌───────────────────────────────┐        ┌───────────────────────────────┐
   │ GET /api/perfil?user_id=2     │        │ GET /api/perfil?user_id=1     │
   │ Cookie: sessao=ana            │        │ Cookie: sessao=ana            │  ⚠ so o ID muda
   └───────────────┬───────────────┘        └───────────────┬───────────────┘
                   ▼                                        ▼
             200, perfil da ana                       ⚠ 200, perfil do admin
                                                           │
                                             a DIFERENCA e a evidencia
```

⚠ **As quatro variáveis que se testam, uma de cada vez:**

| Variável | O que se aprende |
|---|---|
| **Identidade** | ⚠ Trocar o **token**, mantendo o pedido — o que muda? |
| **Objeto** | ⚠ Trocar o **ID**, mantendo o token — o que muda? |
| **Método** | Trocar `GET` por `POST`/`PUT`/`DELETE` |
| **Camada** | Trocar o header que o proxy injeta (fronteira 2) |

⚠ **A segunda linha é a que encontra autorização quebrada**, e a primeira é a que **prova** que o objeto não pertence a quem pediu. ⚠ **As duas juntas são a demonstração completa de IDOR** — uma sozinha não basta.

⚠ **E há a quinta variável, que quase ninguém testa:** **a ordem**. Repetir a mesma requisição duas vezes, ou enviar duas em paralelo, revela estado e concorrência — é o módulo 10.

---

## 2.4 Inventário: o que documentar

⚠ **A diferença entre uma sessão de teste e um trabalho:** o registro.

```markdown
## Inventário de superfície
| # | Método | Rota | Parâmetros | Auth? | Papel exigido | Observação |
|---|--------|------|-----------|-------|---------------|------------|
| 1 | GET | /api/perfil | user_id | cookie | usuario | ⚠ não valida dono |
| 2 | GET | /api/admin | - | cookie | admin? | ⚠ confia em header |
| 3 | POST | /api/saldo | valor | cookie | usuario | ⚠ sem CSRF |

## Registro de teste
| # | Hipótese | Requisição | Resposta | Veredito |
|---|----------|-----------|----------|----------|
| 1 | "user_id não é validado contra o token" | GET ... user_id=1 c/ cookie ana | 200 + nome:admin | ✅ confirmado |

## Hipótese descartada
| # | Hipótese | Por que foi descartada |
|---|----------|------------------------|
| 1 | "SQLi no user_id" | o valor é convertido; `1 OR 1=1` retornou erro de tipo |
```

⚠ **A terceira tabela é a mais importante, e é a que ninguém faz.** Registrar **o que não funcionou** evita retestar, prova que o método foi aplicado, e — no relatório final — mostra que você testou além do que achou.

---

## 2.5 A ficha de hipótese

⚠ **O instrumento do curso, e ele se repete em todos os módulos.** Escreva **antes** de testar:

```
FICHA DE HIPOTESE
──────────────────────────────────────────────────────────
Superficie:      GET /api/perfil?user_id
Fronteira:       (1) cliente -> servidor
Presuncao:       "user_id veio do frontend, que so mostra o proprio perfil"
Teste:           trocar user_id, MANTER o cookie
Falsificacao:    se retornar 403 ou o proprio perfil, a hipotese morre
Evidencia se v.: 200 + dado de outro usuario, reprodutivel
──────────────────────────────────────────────────────────
```

⚠ **O campo `Falsificacao` é obrigatório, e é o que separa investigação de caça ao tesouro.** Uma hipótese que não pode morrer é crença — e produz falso positivo.

⚠ **O campo `Presuncao` é o mais difícil, e o mais útil.** Ele obriga você a dizer **qual raciocínio do autor** você está testando. ⚠ Depois que você nomeia a presunção uma vez, ela reaparece em dezenas de lugares — e é aí que você passa a achar bug em código que não conhece.

---

## 2.6 Ferramenta automática: o que ela dá e o que ela custa

⚠ **A posição do curso, e ela é específica:**

| O que a ferramenta faz bem | ⚠ O que ela não faz |
|---|---|
| Cobrir volume — rotas, parâmetros | ⚠ Entender **o que o dado significa** |
| Achar padrão conhecido | ⚠ Achar o que só faz sentido no negócio |
| ⚠ Não cansar | ⚠ Não saber **a causa** |
| Ser rápida | ⚠ Não produzir correção |
| Servir de segunda opinião | ⚠ Não saber quando está errada |

⚠ **A ferramenta lista candidato; você decide o que é achado.** Todo módulo deste curso tem uma seção dessas, porque a relação com ferramenta é uma competência — e o erro é a **confiança cega** ou o **desprezo total**.

⚠ **O uso correto, em três passos:**

```
   1. a ferramenta roda   ->  lista candidato
   2. voce LE o codigo    ->  confirma ou descarta
   3. voce escreve o teste ->  prova a correcao
```

⚠ **O passo 2 é o que a maioria pula** — e é o que explica por que scanners produzem relatórios longos e inúteis: sem o 2, o candidato vira achado sem causa; sem o 3, o achado vira reclamação sem correção.

---

## Laboratório 2 — Levantar e registrar

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

**Objetivo:** instrumentar, levantar a superfície e preencher o registro — **sem** ainda corrigir nada.

```bash
mkdir -p ~/web-lab/m02 && cd ~/web-lab/m02
python3 -m venv .venv && source .venv/bin/activate
pip install flask requests
```

```python
# app.py — a aplicacao do modulo 1, com mais rotas para inventariar
from flask import Flask, request, jsonify, make_response
import sqlite3, secrets

app = Flask(__name__)
SESSOES = {}    # ⚠ estado no SERVIDOR — o cookie carrega so o ID

def db():
    c = sqlite3.connect("lab.db")
    c.execute("CREATE TABLE IF NOT EXISTS usuarios "
              "(id INT, nome TEXT, papel TEXT, sessao TEXT)")
    c.execute("DELETE FROM usuarios")
    c.executemany("INSERT INTO usuarios VALUES (?,?,?,?)", [
        (1, "ana",   "admin",   None),
        (2, "bruno", "usuario", None),
        (3, "carla", "usuario", None),
    ])
    c.commit()
    return c

def quem_sou():
    sid = request.cookies.get("sessao")
    return SESSOES.get(sid)          # ⚠ None se o ID nao existe

@app.post("/login")
def login():
    nome = request.form.get("nome")
    conn = db()
    u = conn.execute("SELECT id,papel FROM usuarios WHERE nome=?", (nome,)).fetchone()
    if not u:
        return jsonify({"erro": "sem usuario"}), 401
    sid = secrets.token_hex(8)
    SESSOES[sid] = {"id": u[0], "papel": u[1]}
    r = make_response(jsonify({"ok": True}))
    r.set_cookie("sessao", sid, httponly=True)
    return r

@app.get("/api/perfil")
def perfil():
    eu = quem_sou()
    if not eu: return jsonify({"erro": "sem sessao"}), 401
    uid = request.args.get("user_id", eu["id"])     # ⚠ fr. 1
    conn = db()
    return jsonify(conn.execute(
        "SELECT id,nome,papel FROM usuarios WHERE id=?", (uid,)).fetchall())

@app.get("/api/admin")
def admin():
    if request.headers.get("X-Forwarded-For","").startswith("127."):   # ⚠ fr. 2
        return jsonify(db().execute("SELECT * FROM usuarios").fetchall())
    return jsonify({"erro": "negado"}), 403

@app.get("/api/export")
def export():
    eu = quem_sou()
    fmt = request.args.get("fmt", "json")           # ⚠ valor entra em decisao
    dados = db().execute("SELECT * FROM usuarios").fetchall()
    return jsonify({"formato": fmt, "dados": dados})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
```

```bash
python app.py

# 1. Levantar as rotas
for r in /api/perfil /api/admin /api/export; do
  echo "--- $r"; curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:5000$r"
done

# 2. Autenticar (⚠ o metodo correto: guardar o cookie)
curl -s -c cookies.txt -X POST -d "nome=bruno" http://127.0.0.1:5000/login
cat cookies.txt

# 3. Baseline vs variante — a comparacao do 2.3
curl -s -b cookies.txt "http://127.0.0.1:5000/api/perfil"        # baseline
curl -s -b cookies.txt "http://127.0.0.1:5000/api/perfil?user_id=1"  # ⚠ variavel: objeto
```

```bash
# 4. O log do servidor — o que o backend VIU (fronteira 2)
curl -s -H "X-Forwarded-For: 127.0.0.1" http://127.0.0.1:5000/api/admin
# ⚠ confirme no terminal onde o flask roda: a requisicao chegou com o header?

# 5. Compare o cookie com o estado do servidor
#    ⚠ o valor do cookie NAO contem dado — so um identificador
python3 - <<'EOF'
import re
c = open("cookies.txt").read()
print("cookie:", re.findall(r'sessao\s+(\S+)', c))
EOF
```

**O que observar:** no passo 3, a variante retorna o perfil de **outro usuário** com o cookie de bruno — e **sem erro nenhum**. ⚠ E note o passo 5: o cookie não contém dado, só um ID opaco. Isso muda o que você pode forjar: aqui, você não altera o conteúdo; você **escolhe outro objeto**.

**Exercício 1:** preencha o **inventário de superfície** (a primeira tabela do 2.4) com **todas** as rotas, parâmetros e o papel exigido de cada uma. ⚠ Se você não consegue decidir o papel exigido, isso já é um achado.

**Exercício 2:** para cada rota, escreva uma **ficha de hipótese** (2.5) com os cinco campos. ⚠ O campo `Presunção` é obrigatório — qual raciocínio do autor você está testando?

**Exercício 3 (o que vale):** execute **uma** das fichas completas: baseline, variante, e o registro do veredito com requisição, credencial e resposta em **uma frase**. ⚠ Depois preencha também a **tabela de hipótese descartada** — teste uma coisa que você acha que **não** vai funcionar, e registre por quê. A disciplina de registrar o negativo é o que o relatório final vai exigir.

---

## Resumo

- ⚠ **Observação, hipótese e evidência são coisas distintas** — "achei um IDOR" é conclusão, não observação.
- A observação, para ser válida, precisa caber em **uma frase com requisição, credencial e resposta**.
- **As quatro fontes** (DevTools, proxy, log, código) respondem perguntas diferentes — e o **código** é o que dá a causa.
- ⚠ **A ordem importa:** entender o previsto → repetir e modificar → confirmar o que o backend viu → achar a causa.
- ⚠ **O método é comparar duas requisições que diferem em UMA coisa** — identidade, objeto, método ou camada.
- ⚠ **Demonstrar IDOR exige as duas variáveis juntas** (identidade **e** objeto); uma sozinha não prova nada.
- ⚠ **A tabela de hipótese descartada é a que ninguém faz** — e é a que prova método no relatório.
- ⚠ **A ferramenta lista candidato; o código confirma; o teste prova a correção** — pular o passo 2 produz relatório longo e inútil.

---

## O que o próximo módulo entrega

Você tem o método. O módulo 3 aplica ao primeiro alvo real: **autenticação e sessão** — o ciclo de vida, a rotação, a invalidação, e por que a maioria das falhas de sessão não é "senha fraca", e sim **estado mal gerenciado**.
