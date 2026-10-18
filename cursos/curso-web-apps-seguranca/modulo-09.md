# Módulo 9 — GraphQL, Serialização e Contratos de API

**Curso:** Segurança de Aplicações Web e API
**Módulo:** 9 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 8
**Próximo:** Módulo 10 — Lógica de negócio e concorrência

---

## O que este módulo entrega

Ao final, você vai entender **dois assuntos que quebram o modelo REST**: **GraphQL**, onde o cliente monta a consulta — e por isso o modelo de autorização precisa mudar de lugar —, e **contrato**, onde o que a API **documenta** e o que ela **faz** divergem. E vai entender **desserialização** como a mesma injeção do módulo 5, em outro canal.

---

## 9.1 GraphQL: o cliente monta a consulta

⚠ **A inversão estrutural, e ela é a origem de todas as falhas do GraphQL:**

```
   REST                                    GRAPHQL
   ────                                    ───────

   O SERVIDOR define os endpoints          ⚠ O CLIENTE define a consulta
   /api/pedido/91                          {
   (a resposta e' fixa)                       pedido(id:91) {
                                                id item valor
   ⚠ autorizacao: POR ENDPOINT                   dono { nome email senhaHash }
                                              }
                                            }
                                            ⚠ autorizacao: POR CAMPO
```

⚠ **A consequência:** em REST, autorizar `GET /api/pedido/91` resolve **tudo** que aquele endpoint devolve. ⚠ Em GraphQL, **cada campo da consulta** é uma decisão — e o **resolver** é quem precisa decidir, porque é ele que executa.

⚠ **A frase que organiza a seção:**

> **GraphQL move a autorização do endpoint para o campo — e a maioria das implementações
> mantém a autorização no endpoint.**

⚠ **É exatamente o bug: o autor protege a **query**, e o **resolver de campo** não checa nada.**

---

## 9.2 As falhas, uma a uma

### Autorização por campo ausente

```python
# ⚠ VULNERAVEL — o resolver nao checa quem pergunta
@strawberry.field
def dono(self, info) -> Usuario:
    return self.dono_do_pedido        # ⚠ devolve o dono, sem checar posse
```

```python
# ✅ CORRIGIDO — a decisao vive NO RESOLVER, com o contexto
@strawberry.field
def dono(self, info) -> Usuario | None:
    eu = info.context["usuario"]              # ⚠ a identidade do contexto
    if not eu: return None
    if self.dono_id != eu["id"] and eu["papel"] != "admin":
        return None                            # ⚠ nega o CAMPO, nao a query
    return self.dono_do_pedido
```

⚠ **A regra:** *cada resolver que devolve dado sensível checa o contexto.* ⚠ Não existe lugar central — é o oposto do módulo 4 (que pedia **prefixo**) e a mesma lição do módulo 5: **a validação tem de estar onde o dado é usado.**

### Introspecção e descoberta

⚠ **A introspecção é um recurso legítimo** — é o que permite a ferramenta montar a documentação. ⚠ E é **o inventário completo do esquema**, entregue a quem perguntar.

```bash
# ⚠ O esquema INTEIRO, em uma requisicao
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name fields { name } } } }"}' \
  http://127.0.0.1:5000/graphql | python3 -m json.tool | head -40

# ⚠ e o atalho: campos que a interface NAO mostra
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ __type(name:\"Usuario\"){ fields { name } } }"}' \
  http://127.0.0.1:5000/graphql
```

⚠ **A segunda é o que importa:** a introspecção revela campos que existem no esquema e **não aparecem em tela nenhuma** — `senhaHash`, `tokenReset`, `papel`, `interno`. ⚠ É a fonte de descoberta do GraphQL, o equivalente do `OPTIONS` no módulo 8.

⚠ **A defesa:** desligar introspecção em produção **não é segurança** — o esquema vaza por erro de validação, por sugestão de campo, por ferramenta do próprio cliente. ⚠ A defesa real é **autorização por campo**; a introspecção desligada é apenas atrito.

### Profundidade, custo e ciclos

⚠ **Aqui o `OWASP API4` reaparece, com forma própria:**

```graphql
# ⚠ CONSULTA PROFUNDA — custo multiplicativo
{ usuario { amigos { amigos { amigos { amigos { nome } } } } } }

# ⚠ CICLO — se o esquema permitir
{ pedido { dono { pedidos { dono { pedidos { id } } } } } }

# ⚠ ALIAS — o mesmo campo mil vezes, em uma requisicao
{ a1: caro a2: caro a3: caro /* ... mil vezes ... */ }
```

| Ataque | ⚠ O que explora |
|---|---|
| **Profundidade** | Ausência de limite de nível |
| **Largura / alias** | ⚠ Ausência de limite de complexidade |
| **Ciclo** | Esquema que se referencia |
| **Batching** | ⚠ Uma requisição, N consultas — burla rate limit |

⚠ **O último é o que mais engana o rate limiting do módulo 8:** o GraphQL aceita um **array** de consultas em um só `POST`. ⚠ Limitar "requisição por segundo" não limita **consulta** por segundo — e a força bruta passa em bloco.

⚠ **A defesa é **custo****, não contagem: atribuir peso a cada campo, somar antes de executar, e recusar acima do teto. ⚠ É a diferença entre contar pedidos e medir trabalho.

---

## 9.3 Desserialização: a mesma injeção, outro canal

⚠ **A ponte com o módulo 5:** dado do usuário e instrução no **mesmo canal** — aqui, o canal é a **estrutura serializada**.

```
   MODULO 5                            MODULO 9
   ────────                            ────────

   "SELECT ... WHERE nome = ' " + dado   pickle.loads(dado)
                                          ⚠ a estrutura do dado
   ⚠ o dado vira SINTAXE                   CONTROLA o objeto criado

   ✅ parametrizar                       ✅ NAO desserializar dado
                                            de usuario — usar formato
                                            de DADOS (JSON) com esquema
```

⚠ **A diferença de gravidade, e ela é grande:** injeção de SQL executa **SQL**. Desserialização insegura executa **código** — construtor, `__reduce__`, gadget chain. ⚠ É execução remota de código, e é por isso que o tratamento completo pertence ao curso de **Exploit Development**; aqui o que interessa é **reconhecer e recusar o formato**.

| Formato | ⚠ Risco ao desserializar dado de usuário |
|---|---|
| **JSON** | ⚠ Baixo — é dado; valide **esquema** |
| **XML** | ⚠ Entidade externa (módulo 7) |
| **YAML** | ⚠ Tag de objeto — constrói objeto |
| ⚠ **`pickle` (Python)** | ⚠ ⚠ **Execução de código** |
| ⚠ **Java serializado** | ⚠ ⚠ Gadget chain |
| ⚠ **`.NET BinaryFormatter`** | ⚠ ⚠ O mesmo |
| ⚠ **PHP `unserialize`** | ⚠ ⚠ O mesmo |
| Protobuf / Avro | Baixo — esquema explícito |

⚠ **A regra, dita de forma operacional:** *formato de **dado** (JSON, protobuf) é aceitável, com validação de esquema; formato que **constrói objeto** (pickle, Java, `BinaryFormatter`, `unserialize`) **nunca** aceita dado de usuário.* ⚠ Não existe "sanitizar" aqui — a única postura é **não usar**.

⚠ **E a validação de esquema é a segunda metade:** JSON é seguro **como formato**, e não **como conteúdo**. ⚠ Um JSON com campo a mais é o mass assignment do módulo 4; um com tipo trocado é confusão de tipo. A validação é por **allowlist de campo e tipo** — a mesma regra de sempre.

---

## 9.4 Contrato: o documentado e o real

⚠ **O último assunto do módulo, e ele não é técnico — é de **disciplina**.**

```
   O QUE A API DIZ                   O QUE A API FAZ
   ───────────────                   ───────────────

   OpenAPI.yaml                      comportamento em runtime
   - GET /pedidos/{id}               ⚠ GET /pedidos/{id} tambem aceita
   - resposta: {id,item,valor}         ?dono_id=  e devolve outro usuario
                                     ⚠ a resposta inclui senhaHash
                                     ⚠ DELETE existe e nao esta na spec
```

⚠ **As quatro divergências, e cada uma é achado:**

| Divergência | ⚠ Como se testa |
|---|---|
| Documentado e **ausente** | A spec lista, e a rota dá 404 |
| ⚠ **Presente e não documentado** | Inventário do 8.3 — o achado |
| **Campo a menos/menos** | Comparar resposta com o schema |
| ⚠ **Comportamento diferente** | ⚠ Parâmetro extra que muda o resultado |

⚠ **A terceira é a mais fácil de automatizar, e a mais reveladora:** gerar o formato esperado a partir da `OpenAPI` e comparar com a resposta real. ⚠ Um campo a mais é exposição (módulo 4); um a menos é contrato quebrado.

⚠ **A quarta é a que a spec **não** mostra:** um parâmetro **não documentado** que a rota aceita. ⚠ É o mass assignment outra vez — e o teste é o do módulo 2: mandar **um campo que a documentação não menciona** e ver se ele muda algo.

⚠ **A lição do módulo:** *a documentação é uma **hipótese** sobre a API, não uma descrição dela.* ⚠ Testar contra a spec testa a spec; **testar contra o comportamento** é o que encontra o bug.

---

## 9.5 O que muda no método

⚠ **Recapitulando o módulo 2, com o que GraphQL e contrato acrescentam:**

| Do módulo 2 | ⚠ Aplicado a GraphQL |
|---|---|
| Levantar rotas | ⚠ **Introspecção** — o esquema inteiro |
| `OPTIONS` | Query `__schema` e `__type` |
| Variável: objeto | ⚠ Variável: **campo** dentro da query |
| Variável: identidade | ⚠ Trocar o **contexto** e repetir a mesma query |
| Comparar contrato | ⚠ **Comparar schema com resposta** |
| Rate limiting | ⚠ **Custo por consulta**, não por requisição |

⚠ **A segunda linha do objeto é a diferença operacional:** em REST, você muda o **ID**; em GraphQL, você **acrescenta um campo** à consulta. ⚠ E a resposta traz os dois — porque o servidor não sabe que você não deveria pedir aquele campo. É o BOPLA do módulo 8, na forma de GraphQL.

---

## Laboratório 9 — Esquema, campo e contrato

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

```bash
mkdir -p ~/web-lab/m09 && cd ~/web-lab/m09
python3 -m venv .venv && source .venv/bin/activate
pip install flask
```

⚠ **Para o lab não exigir dependência exótica, o GraphQL é simulado com um endpoint que aceita a query como texto** — o mecanismo é o mesmo, e é o que interessa.

```python
# app.py — GraphQL simulado: autorizacao no ENDPOINT, nao no CAMPO
from flask import Flask, request, jsonify, make_response
import re, secrets, json

app = Flask(__name__)
SESSOES = {}
USUARIOS = {
  1: {"id":1,"nome":"ana","papel":"admin","email":"ana@x","senhaHash":"hash_ana","tokenReset":"tok_ana"},
  2: {"id":2,"nome":"bruno","papel":"usuario","email":"bruno@x","senhaHash":"hash_bruno","tokenReset":"tok_bruno"},
  3: {"id":3,"nome":"carla","papel":"usuario","email":"carla@x","senhaHash":"hash_carla","tokenReset":"tok_carla"},
}
PEDIDOS = {10:{"id":10,"dono":2,"item":"mouse","valor":50},
           91:{"id":91,"dono":1,"item":"servidor","valor":9000},
           92:{"id":92,"dono":3,"item":"monitor","valor":800}}

def eu(): return SESSOES.get(request.cookies.get("sessao"))

@app.post("/login")
def login():
    nome = request.form.get("nome")
    for uid, u in USUARIOS.items():
        if u["nome"] == nome:
            sid = secrets.token_hex(8); SESSOES[sid] = uid
            r = make_response(jsonify({"ok":True})); r.set_cookie("sessao", sid); return r
    return jsonify({"erro":"nao existe"}), 401

# ── Introspeccao ────────────────────────────────────────────
@app.post("/graphql")
def graphql():
    q = (request.get_json() or {}).get("query", "")

    # ⚠ introspeccao SEM autenticacao
    if "__schema" in q or "__type" in q:
        return jsonify({"data":{"__schema":{"types":[
            {"name":"Usuario","fields":[{"name":f} for f in USUARIOS[1].keys()]},
            {"name":"Pedido","fields":[{"name":"id"},{"name":"dono"},
                                       {"name":"item"},{"name":"valor"}]}]}}})

    if not eu(): return jsonify({"errors":[{"message":"sem sessao"}]}), 401

    # ── pedido(id:N) { campos } ────────────────────────────
    m = re.search(r"pedido\s*\(\s*id\s*:\s*(\d+)\s*\)\s*\{([^}]*)\}", q)
    if m:
        pid = int(m.group(1)); campos = m.group(2).replace("\n"," ").split()
        p = PEDIDOS.get(pid)
        if not p: return jsonify({"data":{"pedido":None}})
        # ⚠ AUTORIZACAO NO ENDPOINT apenas: checa se esta logado...
        #    ⚠ e NAO checa posse do pedido, NEM autorizacao por CAMPO
        out = {}
        for c in campos:
            if c == "dono":
                d = USUARIOS.get(p["dono"], {})
                # ⚠ devolve o dono inteiro, com senhaHash e tokenReset
                out["dono"] = d
            elif c in ("id","item","valor"):
                out[c] = p[c]
        return jsonify({"data":{"pedido": out}})

    return jsonify({"errors":[{"message":"query nao suportada no lab"}]}), 400

# ── REST para comparar contrato ─────────────────────────────
@app.get("/api/pedidos/<int:pid>")
def rest_pedido(pid):
    if not eu(): return jsonify({"erro":"sem sessao"}), 401
    p = PEDIDOS.get(pid)
    if not p: return jsonify({"erro":"nao encontrado"}), 404
    # ⚠ parametro NAO documentado: dono_id
    filtro = request.args.get("dono_id")
    if filtro and str(p["dono"]) != filtro:
        return jsonify({"erro":"nao encontrado"}), 404
    return jsonify(p)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
```

```bash
python app.py
curl -s -c bruno.txt -X POST -d "nome=bruno" http://127.0.0.1:5000/login

# ── 1. INTROSPECCAO sem autenticacao ────────────────────────
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name fields { name } } } }"}' \
  http://127.0.0.1:5000/graphql | python3 -m json.tool
# ⚠ observe: senhaHash e tokenReset ESTAO no esquema

# ── 2. AUTORIZACAO POR CAMPO ────────────────────────────────
#    baseline: meu pedido, campo simples
curl -s -X POST -H "Content-Type: application/json" -b bruno.txt \
  -d '{"query":"{ pedido(id:10) { id item valor } }"}' http://127.0.0.1:5000/graphql

#    ⚠ variante 1: pedido de OUTRO (nao checa posse)
curl -s -X POST -H "Content-Type: application/json" -b bruno.txt \
  -d '{"query":"{ pedido(id:91) { id item valor } }"}' http://127.0.0.1:5000/graphql

#    ⚠ variante 2: ACRESCENTAR o campo "dono" (nao checa campo)
curl -s -X POST -H "Content-Type: application/json" -b bruno.txt \
  -d '{"query":"{ pedido(id:10) { id dono } }"}' http://127.0.0.1:5000/graphql
# ⚠ a resposta traz senhaHash e tokenReset

# ── 3. CONTRATO: o documentado e o real ─────────────────────
echo "--- documentado: {id,item,valor}"
curl -s -b bruno.txt http://127.0.0.1:5000/api/pedidos/10
echo; echo "--- ⚠ parametro NAO documentado: dono_id"
curl -s -b bruno.txt "http://127.0.0.1:5000/api/pedidos/91?dono_id=1"
curl -s -o /dev/null -w "sem o parametro: %{http_code}\n" -b bruno.txt \
     http://127.0.0.1:5000/api/pedidos/91
curl -s -o /dev/null -w "com dono_id=1:   %{http_code}\n" -b bruno.txt \
     "http://127.0.0.1:5000/api/pedidos/91?dono_id=1"
```

**O que observar:** no passo 2, **duas** falhas independentes — trocar o `id` (BOLA) e **acrescentar o campo** `dono` (BOPLA). ⚠ A segunda é a que só existe em GraphQL: em REST, o endpoint **decide** os campos; aqui, o cliente decide. E no passo 3, o `dono_id` **não está documentado** — e muda o resultado.

**Exercício 1:** monte a tabela **esquema × resposta** do passo 3: para cada campo do esquema, ele aparece na resposta? ⚠ Marque os que aparecem e **não deveriam**.

**Exercício 2:** escreva a **defesa de introspecção** e explique, em duas linhas, por que desligá-la **não** é a correção — e qual é.

**Exercício 3 (o que vale):** corrija a **autorização por campo** no resolver de `dono` (o 9.2), usando o contexto. ⚠ Depois prove, com os **três** comandos do passo 2, que: (a) o meu pedido continua funcionando, (b) o pedido de outro retorna `null`, (c) o campo `dono` não traz `senhaHash`. Escreva o teste de regressão.

---

## Resumo

- ⚠ **GraphQL inverte o modelo**: o **cliente** monta a consulta — a autorização migra do endpoint para o **campo**.
- ⚠ **O bug típico é manter a autorização no endpoint** e não checar no **resolver**.
- ⚠ **A introspecção entrega o esquema inteiro** — inclusive campos que a tela não mostra.
- ⚠ **Desligar introspecção não é correção** — a autorização por campo é.
- ⚠ **Profundidade, alias e batching** exploram ausência de **custo**; rate limiting por requisição não vê.
- ⚠ **Desserialização é a injeção do módulo 5, em outro canal** — mas executa **código**: o formato que constrói objeto **nunca** aceita dado de usuário.
- ⚠ **A documentação é hipótese, não descrição** — testar contra a spec testa a spec.
- ⚠ **Parâmetro não documentado que muda o resultado** é mass assignment, e a spec não o mostra.

---

## O que o próximo módulo entrega

Você cobriu o contrato. O módulo 10 trata das falhas que **nenhuma spec descreve**: lógica de negócio, concorrência e o comportamento que **emerge** da interação entre camadas — onde o `HTTP Smuggling` e os `Parser Differentials` aparecem como aprofundamento.
