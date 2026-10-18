# Módulo 12 — Projeto Final: Investigação Completa

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 12 de 12 · 2 horas
**Pré-requisitos:** Módulos 1 a 11
**Próximo:** —

---

## O que este módulo entrega

É o fecho. Você recebe **uma aplicação maior, com defeitos não anunciados**, e faz o ciclo inteiro — do mapeamento ao relatório. Não há conteúdo novo: há **aplicação do método**. Se os onze módulos funcionaram, este é executável sozinho.

---

## 12.1 O que este módulo cobra

⚠ **A tabela de correspondência — cada item da entrega vem de um módulo:**

| Item da entrega | ⚠ Vem do módulo |
|---|---|
| Mapeamento da superfície | 1 e 2 |
| Registro de hipótese e evidência | 2 |
| Avaliação de sessão e identidade | 3 |
| Matriz de autorização | 4 e 8 |
| Injeção com causa identificada | 5 |
| Falha de cliente com contexto correto | 6 |
| Destino e capacidade de saída | 7 |
| Contrato e esquema | 9 |
| Falha de lógica ou concorrência | 10 |
| Causa, correção e regressão | 11 |

⚠ **E o critério de avaliação, o mesmo dos outros cursos da trilha:** *a causa-raiz cabe em uma frase? a correção é estrutural? o teste falha antes e passa depois?*

---

## 12.2 A entrega

⚠ **O relatório é o produto.** A estrutura, e o motivo de cada seção:

```markdown
# Relatório de Investigação — <aplicação>

## 1. Resumo
⚠ Uma frase por achado. Quem lê só isto precisa saber
  o que é, e quão grave.

## 2. Escopo e método
- o que foi testado, e o que NÃO foi (⚠ lacuna declarada)
- ferramentas usadas, e o que cada uma cobriu
- ⚠ o que foi descartado, e por quê

## 3. Superfície
- a tabela de endpoints, do módulo 8
- ⚠ o inventário, com o status de cada linha

## 4. Achados
Para cada achado, os sete passos do módulo 11:
  4.1 — <nome do achado>
    - Classe         (qual módulo)
    - Sintoma        (o que a resposta mostrou)
    - Causa-raiz     ⚠ UMA FRASE, com a linha
    - Impacto        ⚠ MEDIDO, não presumido
    - PoC            ⚠ controlada: a REQUISIÇÃO mínima
    - Correção       estrutural + ⚠ o que ela não resolve
    - Regressão      o teste, e a saída ANTES e DEPOIS

## 5. Priorização
⚠ Ordenado por impacto real, com o critério declarado.

## 6. Anexos
- saída dos testes
- ⚠ o registro de hipótese descartada
```

⚠ **A seção 2 é a que ninguém faz, e a que mais qualifica o trabalho.** Declarar o que **não** foi testado protege o relatório e é honestidade técnica. ⚠ *"Não testei fila assíncrona"* é informação; o silêncio sobre ela é lacuna escondida.

⚠ **A seção 4 é o coração.** E o item **PoC** tem uma regra: **a requisição mínima que demonstra o achado** — não a cadeia completa. ⚠ É a mesma linha dos cursos de kernel: reporta-se a **primitiva**, não a arma.

---

## 12.3 Prova de conceito controlada

⚠ **O que "controlada" significa, e é operacional:**

| ✅ Controlada | ⚠ Não controlada |
|---|---|
| A requisição mínima | O script que explora tudo |
| Dado fictício do lab | Dado real de alguém |
| No ambiente autorizado | Em produção ou de terceiro |
| ⚠ Demonstra **o que se alcança** | ⚠ Executa **a consequência** |
| Reproduzível por outra pessoa | Depende do seu ambiente |

⚠ **A quarta linha é a decisão difícil, e ela é sua:** demonstrar que se **alcança** a credencial é prova suficiente. Exfiltrar a credencial inteira, armazená-la ou usá-la **não é** prova — é dano. ⚠ O relatório que respeita isso é o que se pode entregar.

⚠ **E a quinta é o que faz o achado ser aceito:** o outro lado precisa **reproduzir**. Sem a requisição mínima e sem o setup declarado, o achado vira afirmação.

---

## 12.4 A aplicação do projeto

⚠ **Ela vem com defeitos **não anunciados** — um de cada módulo 3 a 10, no mínimo.** Não há lista: encontrá-los **é** o projeto.

⚠ **O que a aplicação tem, e o que você precisa notar:**

| Onde | ⚠ O que esperar |
|---|---|
| Sessão | Um dos cinco momentos falho (módulo 3) |
| Autorização | Uma rota sem posse, **e** uma sem papel |
| Consulta | Uma interpolação, em ponto não óbvio |
| Cliente | Um contexto de saída errado |
| Servidor | Um destino validado pela **string** |
| API | ⚠ Uma **versão antiga** ainda respondendo |
| GraphQL ou contrato | ⚠ Um campo protegido no endpoint, não no resolver |
| Fluxo | Uma etapa pulável **e** uma operação não atômica |

⚠ **A sétima linha pode não existir** se a aplicação não tiver GraphQL — e **notar que ela não existe** também é trabalho: a seção 2 do relatório registra isso.

⚠ **A sexta é a que mais rende, e a mais fácil de esquecer:** procure as versões **antes** de concluir que cobriu a API.

---

## 12.5 Como conduzir

⚠ **A sequência, e ela é a do curso inteiro:**

```
   1. MAPEAR       ->  superficie completa, ANTES de testar
        │              ⚠ modulos 1 e 2
        ▼
   2. HIPOTESES    ->  ficha por linha da superficie
        │              ⚠ modulo 2
        ▼
   3. TESTAR       ->  uma variavel de cada vez
        │              ⚠ "qualquer coisa que pareca interessante
        │                 NAO e' metodo"
        ▼
   4. RastreAR     ->  da resposta ao codigo
        │              ⚠ modulo 11
        ▼
   5. CORRIGIR     ->  estrutural
        │
        ▼
   6. PROVAR       ->  teste que falha antes, passa depois
        │
        ▼
   7. ESCREVER     ->  ⚠ o relatorio E' a entrega
```

⚠ **O passo 1 antes do 3 é o que separa projeto de tentativa.** ⚠ Quem testa antes de mapear acha o que estava procurando; quem mapeia primeiro acha o que **está lá**.

⚠ **E o passo 2 é o que torna o trabalho auditável:** a ficha de hipótese, por linha da superfície. ⚠ No fim, a tabela de hipótese descartada é a prova de que você foi além do achado.

---

## 12.6 Critérios de avaliação

⚠ **O que qualifica o trabalho, e o que não qualifica:**

| ✅ Qualifica | ⚠ Não qualifica |
|---|---|
| Causa-raiz em uma frase, com a linha | "falta de validação" |
| Impacto **medido** | "crítico" sem número |
| Requisição mínima reproduzível | Narrativa do que você fez |
| Correção estrutural | Filtro de string |
| ⚠ **Limite da correção declarado** | "corrigido" |
| Teste que **falha antes** | Teste que passa nos dois |
| ⚠ Lacuna declarada | Silêncio sobre o não testado |
| Priorização com critério | Lista em ordem alfabética |

⚠ **A quinta linha é a que mais distingue.** Um relatório que diz *"corrigido"* e não diz o que ficou de fora é **incompleto** — porque toda correção tem limite, e o módulo 11 obriga a nomeá-lo.

⚠ **E a sétima é a que dá credibilidade:** declarar o que não se testou não enfraquece o relatório — **fortalece**, porque mostra que você sabe o que sabe.

---

## Laboratório 12 — A aplicação e o relatório

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

⚠ **A aplicação do projeto tem defeitos não anunciados. O código abaixo é a base — os defeitos estão nele, e descobri-los é o exercício.**

```bash
mkdir -p ~/web-lab/m12 && cd ~/web-lab/m12
python3 -m venv .venv && source .venv/bin/activate
pip install flask pytest requests
```

```python
# app.py — a aplicacao do projeto. Ha defeitos. Encontre-os.
from flask import Flask, request, jsonify, make_response, render_template_string
import sqlite3, secrets, time

app = Flask(__name__)
SESSOES = {}
BASE_ARQ = "arquivos"

def db():
    c = sqlite3.connect("proj.db", timeout=5)
    c.executescript("""
      DROP TABLE IF EXISTS usuarios; DROP TABLE IF EXISTS notas;
      DROP TABLE IF EXISTS contas;   DROP TABLE IF EXISTS arquivos;
      CREATE TABLE usuarios (id INT, nome TEXT, papel TEXT, senha_hash TEXT,
                             token_reset TEXT, bio TEXT);
      CREATE TABLE notas    (id INT, dono_id INT, titulo TEXT, corpo TEXT);
      CREATE TABLE contas   (uid INT, saldo INT);
      CREATE TABLE arquivos (id INT, dono_id INT, nome TEXT, conteudo TEXT);
    """)
    c.executemany("INSERT INTO usuarios VALUES (?,?,?,?,?,?)", [
        (1,"ana","admin","h_ana","t_ana","bio da ana"),
        (2,"bruno","usuario","h_bruno","t_bruno","bio do bruno"),
        (3,"carla","usuario","h_carla","t_carla","bio da carla")])
    c.executemany("INSERT INTO notas VALUES (?,?,?,?)", [
        (1,2,"lista","comprar mouse"),(2,2,"ideias","projeto"),
        (99,1,"⚠ interno","notas da administracao")])
    c.executemany("INSERT INTO contas VALUES (?,?)", [(1,1000),(2,500)])
    c.executemany("INSERT INTO arquivos VALUES (?,?,?,?)", [
        (1,2,"publico.txt","conteudo publico")])
    c.commit(); return c

def eu(): return SESSOES.get(request.cookies.get("sessao"))

@app.post("/login")
def login():
    c = db()
    u = c.execute("SELECT id,papel FROM usuarios WHERE nome=?",
                  (request.form.get("nome"),)).fetchone()
    if not u: return jsonify({"erro":"usuario nao existe"}), 401
    sid = secrets.token_hex(8); SESSOES[sid] = {"id":u[0],"papel":u[1]}
    r = make_response(jsonify({"ok":True}))
    r.set_cookie("sessao", sid)         # ⚠ flags?
    return r

@app.post("/logout")
def logout():
    r = make_response(jsonify({"ok":True}))
    r.delete_cookie("sessao")           # ⚠ e no servidor?
    return r

# ── notas ────────────────────────────────────────────────────
@app.get("/api/nota/<int:nid>")
def nota(nid):
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    return jsonify([dict(r) for r in db().execute(
        "SELECT id,titulo,corpo FROM notas WHERE id=?", (nid,)).fetchall()])

@app.get("/api/notas")
def notas():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    q = request.args.get("q","")
    if q:
        # ⚠ busca
        return jsonify([dict(r) for r in db().execute(
            f"SELECT id,titulo,corpo FROM notas WHERE titulo LIKE '%{q}%'").fetchall()])
    return jsonify([dict(r) for r in db().execute(
        "SELECT id,titulo,corpo FROM notas WHERE dono_id=?", (e["id"],)).fetchall()])

# ── perfil ───────────────────────────────────────────────────
@app.put("/api/perfil")
def perfil_put():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    for k, v in (request.get_json() or {}).items():
        db().execute(f"UPDATE usuarios SET {k}=? WHERE id=?", (v, e["id"]))
    db().commit()
    return jsonify({"ok":True})

@app.put("/api/perfil/<int:uid>")
def perfil_put_uid(uid):
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    if e["papel"] != "admin":
        return jsonify({"erro":"negado"}), 403
    for k, v in (request.get_json() or {}).items():
        db().execute(f"UPDATE usuarios SET {k}=? WHERE id=?", (v, uid))
    db().commit(); return jsonify({"ok":True})

# ── pagina com eco ───────────────────────────────────────────
PAG = """<!doctype html><html><body>
<h1>Ola, {{ nome | safe }}</h1>
<p><a href="{{ volta | safe }}">voltar</a></p>
</body></html>"""

@app.get("/ola")
def ola():
    return render_template_string(PAG,
        nome=request.args.get("nome",""),
        volta=request.args.get("volta","/"))

# ── arquivos ─────────────────────────────────────────────────
@app.get("/arquivo/<int:aid>")
def arquivo(aid):
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    return jsonify([dict(r) for r in db().execute(
        "SELECT id,nome,conteudo FROM arquivos WHERE id=?", (aid,)).fetchall()])

# ── transferencia ────────────────────────────────────────────
@app.post("/api/transferir")
def transferir():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    v = int(request.form.get("valor","0")); para = int(request.form.get("para","2"))
    c = db()
    saldo = c.execute("SELECT saldo FROM contas WHERE uid=?", (e["id"],)).fetchone()[0]
    if saldo < v: return jsonify({"erro":"saldo"}), 400
    time.sleep(0.03)
    c.execute("UPDATE contas SET saldo = saldo - ? WHERE uid=?", (v, e["id"]))
    c.execute("UPDATE contas SET saldo = saldo + ? WHERE uid=?", (v, para))
    c.commit(); return jsonify({"ok":True})

# ── versoes da API ───────────────────────────────────────────
@app.get("/api/v1/notas")
def v1_notas():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    return jsonify([dict(r) for r in db().execute("SELECT * FROM notas").fetchall()])

@app.get("/api/v2/notas")
def v2_notas():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    return jsonify([dict(r) for r in db().execute(
        "SELECT id,titulo FROM notas WHERE dono_id=?", (e["id"],)).fetchall()])

if __name__ == "__main__":
    import os; os.makedirs(BASE_ARQ, exist_ok=True)
    app.run(host="127.0.0.1", port=5000, threaded=True)
```

```bash
python app.py
curl -s -c b.txt -X POST -d "nome=bruno" http://127.0.0.1:5000/login
curl -s -c a.txt -X POST -d "nome=ana"   http://127.0.0.1:5000/login

# ⚠ A partir daqui, o levantamento e' seu.
#    Comece pela superficie (modulo 8), NAO pelos testes.
for ep in /api/notas /api/v1/notas /api/v2/notas /ola /api/nota/99 /arquivo/1; do
  printf "%-18s " "$ep"
  curl -s -o /dev/null -w "%{http_code}\n" -b b.txt "http://127.0.0.1:5000$ep"
done
```

⚠ **Os defeitos estão lá. Não os liste aqui — o exercício é encontrá-los.** A dica de método: **mapeie tudo antes de testar**, e para cada rota escreva a ficha de hipótese. Os defeitos cobrem, no mínimo, sessão, autorização por objeto, autorização por função, injeção, contexto de saída, mass assignment, versão antiga e concorrência.

**Entrega:** o relatório do 12.2, completo, com **todos** os achados que você encontrou — os sete passos do módulo 11 para cada um, o teste de regressão de cada correção, a priorização, e a **lacuna declarada** do que você não testou.

---

## Resumo

- ⚠ **O módulo não tem conteúdo novo** — é aplicação do método. Se os onze funcionaram, é executável sozinho.
- ⚠ **O relatório É o produto**, e a **seção 2** (o que não foi testado) qualifica o trabalho.
- ⚠ **A PoC é a requisição mínima** — demonstrar o **alcance**, não executar a consequência.
- ⚠ **Os defeitos não são anunciados**: mapear **antes** de testar é o que separa projeto de tentativa.
- ⚠ **O critério** é o do curso: causa em uma frase, correção estrutural, teste que falha antes, **limite declarado**.
- ⚠ **Declarar a lacuna fortalece o relatório** — o silêncio sobre o não testado é o que o enfraquece.

---

## Fim do curso

Você atravessou doze módulos e uma pergunta só, repetida em cada camada:

> **Em que ponto este dado cruza uma fronteira — e quem valida depois de cruzar?**

No módulo 1, ela nomeou seis fronteiras. Nos módulos 3 a 9, apareceu no cookie, no objeto, na consulta, no contexto de saída, no destino da requisição e no campo do esquema. No 10, apareceu no fluxo que ninguém previu. No 11, virou causa-raiz e teste.

⚠ **E o próximo passo da trilha é o `Cadeia de Exploração Web`** — onde achados isolados se compõem: o SSRF que vira acesso a metadata, o XSS que vira bypass de CSRF, a IDOR que vira escalação. Aqui você aprendeu a achar e a corrigir; lá, a encadear.
