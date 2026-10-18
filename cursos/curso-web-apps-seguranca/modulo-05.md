# Módulo 5 — Injeções no Servidor

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 5 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 6 — Segurança do navegador

---

## O que este módulo entrega

Ao final, você vai entender **injeção como um fenômeno único**, e não como uma lista de sintaxes — e vai saber distinguir **causa-raiz, sintoma e impacto**, que é o que permite corrigir em vez de remendar. É o módulo que fecha a fronteira 3 do módulo 1 (aplicação → banco) e prepara o método do módulo 11.

---

## 5.1 Injeção é um problema só

⚠ **A definição que unifica tudo:**

> **Injeção acontece quando o dado do usuário e a instrução do programa ocupam O MESMO CANAL, e o
> interpretador não consegue mais separar um do outro.**

```
   CORRETO — dois canais                    VULNERAVEL — um canal
   ┌────────────────────────┐               ┌────────────────────────┐
   │ INSTRUCAO:             │               │ TEXTO:                 │
   │   SELECT * FROM u      │               │   "SELECT * FROM u     │
   │   WHERE nome = ?       │               │    WHERE nome = '"     │
   │        ▲               │               │        + nome + "'"    │
   │ CANAL 1 (codigo)       │               │                        │
   │                        │               │ ⚠ o dado e o codigo    │
   │ DADO: "ana"            │               │   no MESMO canal       │
   │   CANAL 2 (parametro)  │               │                        │
   └────────────────────────┘               └────────────────────────┘

   ⚠ O interpretador SABE onde                  ⚠ O interpretador tem
     termina o codigo                            que ADVINHAR
```

⚠ **A consequência, e ela é o argumento mais forte para a correção estrutural:** *escapar* o dado é uma tentativa de fazer o interpretador adivinhar certo. **Separar o canal** é não deixar dúvida. ⚠ Escapar é paliativo; parametrizar é estrutural.

⚠ **O mesmo fenômeno, em cinco interpretadores:** SQL, shell, caminho de arquivo, XML, template. A sintaxe muda; a causa não. ⚠ Todo o módulo é uma instância dessa tabela.

---

## 5.2 SQL injection

⚠ **A anatomia do item 4 da nossa régua: o raciocínio que produziu o bug.** Quase nunca é ignorância — é conveniência:

```python
# O caminho que leva ao bug, em tres passos honestos
# 1. "preciso buscar por nome"            -> funciona, parametrizado
# 2. "mas o usuario quer ordenar tambem"  -> ⚠ ORDER BY ? NAO funciona
# 3. "vou montar a string so nesse caso"  -> ⚠ o bug nasce aqui
```

⚠ **O passo 2 é o mais instrutivo, e é verdadeiro:** parâmetro de consulta **não serve para identificador nem para cláusula** — `ORDER BY`, nome de tabela, nome de coluna. ⚠ A saída correta **não** é concatenar: é **allowlist**.

```python
# ⚠ VULNERAVEL — "so nesse caso"
@app.get("/api/produtos")
def produtos():
    ordem = request.args.get("ordem", "nome")
    q = f"SELECT nome,preco FROM produtos ORDER BY {ordem}"   # ⚠ injecao
    return jsonify(db.execute(q).fetchall())

# ✅ CORRIGIDO — allowlist para o que NAO pode ser parametro
COLUNAS = {"nome", "preco", "estoque"}          # ⚠ so o que existe

@app.get("/api/produtos")
def produtos():
    ordem = request.args.get("ordem", "nome")
    if ordem not in COLUNAS:                    # ⚠ rejeita, nao escapa
        return jsonify({"erro": "ordem invalida"}), 400
    q = f"SELECT nome,preco FROM produtos ORDER BY {ordem}"
    return jsonify(db.execute(q).fetchall())
```

⚠ **A regra, dita de forma operacional:** *o que a sintaxe exige que seja **estrutura** (nome de coluna, direção, tabela) precisa vir de uma **lista fechada**; o que é **valor** precisa vir de **parâmetro**.* ⚠ Não existe terceira categoria — e "concatenar porque não dá para parametrizar" é a categoria que produz o bug.

⚠ **E há a variante que dispensa sintaxe nenhuma:**

```python
# ⚠ Injeção SEM aspas e SEM sintaxe estranha — o caso mais didatico
# 1. a aplicacao tem um campo "filtro" que aceita JSON do cliente
filtro = request.get_json().get("filtro", {})
# 2. e o ORM aceita o dicionario direto
Usuario.objects.filter(**filtro)
# 3. ⚠ o cliente manda {"papel__ne": "admin"} ou {"nome__regex": "^a"}
#    -> ⚠ consegue filtrar por campo que nao deveria existir na tela
```

⚠ **Este é o `NoSQL injection` na prática, e o `ORM injection` também.** O dado não virou comando — ele virou **operador**. ⚠ Mesma causa (o dado influencia a estrutura), mesma correção (**allowlist de chave**, não de valor).

```python
# ✅ CORRIGIDO — allowlist de CHAVE, antes do ORM
CAMPOS_FILTRAVEIS = {"nome", "categoria"}

@app.get("/api/buscar")
def buscar():
    filtro = request.get_json() or {}
    limpo = {k: v for k, v in filtro.items() if k in CAMPOS_FILTRAVEIS}
    return jsonify(list(Produto.objects.filter(**limpo).values()))
```

---

## 5.3 Command injection

⚠ **Aqui o interpretador é o **shell**, e o sintoma é o impacto — execução de código.

```python
# ⚠ VULNERAVEL
@app.post("/api/ping")
def ping():
    host = request.form.get("host")
    saida = subprocess.check_output(f"ping -c 1 {host}", shell=True)
    #                                       ^^^^^^^^^^ ^^^^^^^^^^
    # ⚠ shell=True com dado interpolado = execucao arbitraria
    return jsonify({"saida": saida.decode()})
```

⚠ **O detalhe que faz a diferença entre "vulnerável" e "seguro" não é escapar — é `shell=False`:**

```python
# ✅ CORRIGIDO — a lista substitui o shell
import shlex
@app.post("/api/ping")
def ping():
    host = request.form.get("host", "")
    # ⚠ 1. allowlist do FORMATO (o que pode ser um host)
    if not re.fullmatch(r"[a-zA-Z0-9.\-]{1,253}", host):
        return jsonify({"erro": "host invalido"}), 400
    # ⚠ 2. shell=False + LISTA: o argumento nao e' interpretado
    saida = subprocess.check_output(["ping", "-c", "1", host], shell=False)
    return jsonify({"saida": saida.decode()})
```

⚠ **Três camadas independentes, e cada uma sozinha bastaria:**

| Camada | O que faz |
|---|---|
| `shell=False` + lista | ⚠ O argumento **nunca** é interpretado pelo shell |
| Allowlist de formato | Reduz o que pode entrar |
| `--` antes do argumento | ⚠ Impede que o dado vire **opção** |

⚠ **A terceira é a mais esquecida:** em muitas ferramentas, um argumento começando com `-` vira **opção**, e não valor. ⚠ É a **argument injection** — e ela sobrevive ao `shell=False`. Exemplo clássico: uma ferramenta de download com `-o` que permite escrever em arquivo arbitrário.

```bash
# ⚠ A diferenca, na pratica
ping -c 1 8.8.8.8                              # correto
ping -c 1 8.8.8.8; cat /etc/passwd             # shell=True -> executa o segundo
ping -c 1 -- 8.8.8.8                           # ⚠ "--" encerra as opcoes
ping -c 1 -- "-o/tmp/x 8.8.8.8"                # ⚠ se nao houver "--", vira opcao
```

---

## 5.4 Path traversal e inclusão de arquivo

⚠ **O interpretador é o **sistema de arquivos**, e a gramática dele tem `..`.

```python
# ⚠ VULNERAVEL — o nome do arquivo vem do cliente
@app.get("/download")
def download():
    nome = request.args.get("arquivo")
    return send_file(os.path.join("/var/dados", nome))
    # ⚠ "arquivo=../../etc/passwd" -> sai do diretorio
```

⚠ **E a correção ingênua, que **não** funciona:**

```python
# ⚠ NAO RESOLVE — filtro de ".." e' derrotavel
nome = nome.replace("..", "")     # "....//" -> "../" ⚠
nome = nome.replace("../", "")    # "..%2f"  -> ⚠ se decodificado depois
```

⚠ **A razão de a denylist falhar aqui é a mesma do módulo 4:** existem **infinitas** codificações de `..` — `%2e%2e`, `..%2f`, `....//`, sobreposição dupla, barra invertida, UTF-8 exótico, e o comportamento do **sistema de arquivos** por baixo.

⚠ **A correção estrutural é **canônica e conferida**:**

```python
# ✅ CORRIGIDO — resolve o caminho e confere se ficou DENTRO da base
BASE = os.path.realpath("/var/dados")

@app.get("/download")
def download():
    nome = request.args.get("arquivo", "")
    # ⚠ 1. rejeita separador no nome — o nome e' um NOME, nao um caminho
    if "/" in nome or "\\" in nome or nome in ("", ".", ".."):
        return jsonify({"erro": "nome invalido"}), 400

    alvo = os.path.realpath(os.path.join(BASE, nome))
    # ⚠ 2. a checagem decisiva: o resultado esta DENTRO da base?
    if not alvo.startswith(BASE + os.sep):
        return jsonify({"erro": "fora da base"}), 400

    return send_file(alvo)
```

⚠ **O `os.path.realpath` é o que faz a diferença:** ele resolve `..`, **symlink** e caminho relativo, e devolve o caminho **real**. ⚠ E a checagem precisa acontecer **depois** da resolução — verificar a string antes de resolver é exatamente o erro que a denylist comete.

⚠ **A variante de inclusão de arquivo (LFI/RFI)** é o mesmo bug com outro impacto: em vez de baixar o arquivo, a aplicação o **executa** ou o **interpreta** — `include`, template, plugin, `require`. ⚠ E o impacto escala: um LFI que lê `/etc/passwd` é grave; um LFI que lê a **chave de sessão** do servidor é a conta de todo mundo.

---

## 5.5 Causa-raiz, sintoma e impacto

⚠ **A distinção que o módulo existe para instalar, e que o módulo 11 vai exigir:**

| Nível | O que é | Exemplo do 5.2 |
|---|---|---|
| **Sintoma** | ⚠ O que a resposta **mostra** | O erro de SQL na tela |
| **Causa-raiz** | ⚠ A **linha** que produz | `f"...ORDER BY {ordem}"` |
| **Impacto** | ⚠ O que **se pode fazer** | Ler a tabela inteira, ou contornar login |

⚠ **A razão de a distinção ser prática, e não acadêmica:**

```
   Se voce corrige o SINTOMA:       Se voce corrige a CAUSA:
   ──────────────────────────       ──────────────────────
   - esconde a mensagem de erro     - remove a concatenacao
   - bloqueia a string "UNION"      - o dado vira parametro

   ⚠ o ataque muda de forma         ⚠ o ataque deixa de existir
     e continua
```

⚠ **A denylist é sempre correção de sintoma.** Bloquear `UNION`, `SELECT`, `<script>`, `../` — tudo isso é reagir à **forma** de um ataque, e a forma é livre. ⚠ É a mesma falha de raciocínio do módulo 4: presumir que você conhece todos os ataques.

⚠ **E o impacto precisa ser **medido**, não presumido.** "SQL injection" não é impacto; o impacto é *"o banco permite `UNION SELECT` com 4 colunas, e a tabela de usuários tem `senha_hash` na coluna 3"*. ⚠ Isso é o que o relatório do módulo 12 vai pedir.

---

## 5.6 Validação: onde ela entra

⚠ **A pergunta comum — "não basta validar a entrada?" — tem resposta em duas partes:**

| Camada | Papel | ⚠ O que ela **não** resolve |
|---|---|---|
| **Validação de formato** | Rejeita o que não faz sentido | ⚠ Não impede injeção válida em formato |
| **Parametrização** | ⚠ **Separa dado de instrução** | A causa |
| **Codificação de saída** | Protege o **destino** | ⚠ Cada destino tem a sua |
| **Menor privilégio** | ⚠ Limita o **dano** | Não impede o bug |

⚠ **A primeira linha é a que engana:** um e-mail validado por regex ainda pode conter `'` — se a regex permite `o'brien@ex.com`. ⚠ **Validação reduz superfície; ela não separa canais.**

⚠ **A última linha é a defesa em profundidade que quase ninguém aplica.** Se a conta do banco usada pela aplicação **não tem** `DROP` nem leitura de outras tabelas, a SQLi continua sendo bug — e para de ser catástrofe. ⚠ É o mesmo princípio do curso de Linux Internals: o processo que não precisa de `cap_sys_admin` não deve tê-la.

---

## Laboratório 5 — Da requisição à causa

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

```bash
mkdir -p ~/web-lab/m05 && cd ~/web-lab/m05
python3 -m venv .venv && source .venv/bin/activate
pip install flask
```

```python
# app.py — as quatro injecoes, em versao vulneravel
from flask import Flask, request, jsonify, send_file
import sqlite3, subprocess, os, re

app = Flask(__name__)
BASE = os.path.realpath("arquivos")

def db():
    c = sqlite3.connect("lab.db")
    c.executescript("""
      DROP TABLE IF EXISTS produtos; DROP TABLE IF EXISTS usuarios;
      CREATE TABLE produtos (id INT, nome TEXT, preco INT, estoque INT, interno TEXT);
      CREATE TABLE usuarios (id INT, nome TEXT, papel TEXT, senha_hash TEXT);
    """)
    c.executemany("INSERT INTO produtos VALUES (?,?,?,?,?)", [
        (1,"mouse",50,10,"custo_25"), (2,"teclado",120,5,"custo_60"),
        (3,"monitor",800,2,"custo_400")])
    c.executemany("INSERT INTO usuarios VALUES (?,?,?,?)", [
        (1,"ana","admin","hash_ana"), (2,"bruno","usuario","hash_bruno")])
    c.commit(); return c

# ── 1. SQLi — concatenacao de identificador ───────────────────────
@app.get("/api/produtos")
def produtos():
    ordem = request.args.get("ordem", "nome")
    q = f"SELECT nome,preco,estoque FROM produtos ORDER BY {ordem}"   # ⚠
    try:
        return jsonify([tuple(r) for r in db().execute(q).fetchall()])
    except Exception as e:
        return jsonify({"erro": str(e)}), 500      # ⚠ vaza o erro

# ── 2. ORM/NoSQL-like — o dado vira OPERADOR ──────────────────────
@app.get("/api/buscar")
def buscar():
    filtro = request.args.to_dict()                # {"nome":"mouse"}
    if not filtro: return jsonify({"erro":"sem filtro"}), 400
    cond = " AND ".join(f"{k} = '{v}'" for k, v in filtro.items())   # ⚠ chave E valor
    try:
        return jsonify([tuple(r) for r in db().execute(
            f"SELECT nome,preco,interno FROM produtos WHERE {cond}").fetchall()])
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# ── 3. Command injection ──────────────────────────────────────────
@app.post("/api/ping")
def ping():
    host = request.form.get("host", "")
    try:
        saida = subprocess.check_output(f"echo pinging {host}", shell=True,
                                        stderr=subprocess.STDOUT, timeout=3)
        return jsonify({"saida": saida.decode()})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# ── 4. Path traversal ─────────────────────────────────────────────
@app.get("/download")
def download():
    nome = request.args.get("arquivo", "")
    # ⚠ "correcao" ingenua: denylist de ".."
    nome = nome.replace("..", "")
    alvo = os.path.join(BASE, nome)
    if not os.path.exists(alvo):
        return jsonify({"erro":"nao existe", "tentou": alvo}), 404
    return send_file(alvo)

if __name__ == "__main__":
    os.makedirs(BASE, exist_ok=True)
    open(os.path.join(BASE,"publico.txt"),"w").write("conteudo publico\n")
    app.run(host="127.0.0.1", port=5000)
```

```bash
python app.py

# ── 1. SQLi: a fronteira 3 do modulo 1 ──────────────────────
curl -s "http://127.0.0.1:5000/api/produtos?ordem=nome"
curl -s "http://127.0.0.1:5000/api/produtos?ordem=preco"       # valido
curl -s "http://127.0.0.1:5000/api/produtos?ordem=(SELECT+1)"  # ⚠ erro = pista
# ⚠ a mensagem de erro revela a CAUSA — anote a linha que ela aponta

# ── 2. O dado como OPERADOR ─────────────────────────────────
curl -s "http://127.0.0.1:5000/api/buscar?nome=mouse"
curl -s "http://127.0.0.1:5000/api/buscar?nome=mouse&interno=custo_25"   # ⚠ campo interno

# ── 3. Command injection ────────────────────────────────────
curl -s -X POST -d "host=8.8.8.8" http://127.0.0.1:5000/api/ping
curl -s -X POST -d "host=8.8.8.8; id" http://127.0.0.1:5000/api/ping     # ⚠

# ── 4. Path traversal, contra a "correcao" ingenua ──────────
curl -s "http://127.0.0.1:5000/download?arquivo=publico.txt"
curl -s "http://127.0.0.1:5000/download?arquivo=../../etc/passwd"
curl -s "http://127.0.0.1:5000/download?arquivo=....//....//etc/passwd"  # ⚠ denylist burlada
```

**O que observar:** no passo 4, o terceiro comando **passa pela denylist** — `....//` vira `../` depois do `replace`. ⚠ É a demonstração de que **corrigir o sintoma não corrige a causa**: o filtro existia, e o ataque mudou de forma.

**Exercício 1:** para cada uma das quatro falhas, escreva a **tríade do 5.5**: sintoma (o que a resposta mostra), causa-raiz (a linha exata), impacto (o que se pode fazer). ⚠ Sem essa tríade, você tem quatro alertas, não quatro achados.

**Exercício 2:** corrija a **falha 1** com allowlist de coluna, e explique em duas linhas por que `ORDER BY ?` (parametrizado) **não** resolve.

**Exercício 3 (o que vale):** corrija as **quatro**, e para cada uma escreva o **teste de regressão**. ⚠ Na falha 4, implemente `realpath` + conferência de base, e prove que as **três** variações do passo 4 (a simples, a com `..`, e a com `....//`) falham no código novo. É a diferença entre denylist e correção estrutural, demonstrada.

⚠ **Atenção:** este é o módulo mais sensível do curso. Rode **tudo** em `127.0.0.1`, com dados fictícios, e nunca aponte os comandos para alvo que não seja seu. Os comandos de injeção aqui são **sobre o seu próprio processo local**, para provar o mecanismo.

---

## Resumo

- ⚠ **Injeção é um problema só**: dado e instrução no **mesmo canal**; o interpretador passa a adivinhar.
- ⚠ **Parametrizar separa canais; escapar só ensina o interpretador a adivinhar** — estrutural vs. paliativo.
- ⚠ **O que a sintaxe exige como *estrutura*** (coluna, tabela, `ORDER BY`) vem de **allowlist**; o que é *valor* vem de **parâmetro**. Não há terceira categoria.
- ⚠ **Injeção sem sintaxe**: no ORM/NoSQL, o dado vira **operador** — a correção é allowlist de **chave**.
- ⚠ **`shell=False` + lista** é o que resolve comando; ⚠ **`--`** impede argument injection, que sobrevive ao `shell=False`.
- ⚠ **`..` tem infinitas codificações** — denylist falha; use **`realpath` + conferência de base**, depois de resolver.
- ⚠ **Sintoma, causa-raiz e impacto são três níveis** — corrigir o sintoma move o ataque, não o elimina.
- ⚠ **Validação reduz superfície, não separa canais**; **menor privilégio** limita o dano, e é a defesa esquecida.

---

## O que o próximo módulo entrega

Você fechou o lado do servidor. O módulo 6 atravessa para o **navegador** — XSS, CSRF, CORS, CSP — onde a mesma pergunta reaparece com outro nome: ***em que contexto** este dado será interpretado?*
