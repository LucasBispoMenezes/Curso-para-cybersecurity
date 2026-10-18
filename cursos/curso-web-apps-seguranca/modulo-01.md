# Módulo 1 — Arquitetura de Aplicações Web e Modelo de Confiança

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 1 de 12 · 3 horas
**Pré-requisitos:** curso de Redes · curso de Linux para Segurança
**Próximo:** Módulo 2 — Metodologia de investigação

---

## O que este módulo entrega

Ao final, você vai saber **desenhar uma aplicação web como um conjunto de fronteiras de confiança**, e não como uma caixa. Você vai identificar **onde um dado muda de mão** — e portanto onde ele pode ser forjado. Todo bug dos onze módulos seguintes mora em uma dessas fronteiras; este módulo é o que as nomeia.

---

## 1.1 A anatomia de uma requisição

⚠ **Antes de qualquer vulnerabilidade, o caminho.** Uma requisição atravessa mais componentes do que a maioria imagina:

```
   NAVEGADOR
      │  (1) o dado sai daqui como TEXTO que o usuario controla
      ▼
   DNS ──► resolve o nome
      │
      ▼
   ┌─────────────┐
   │ CDN / EDGE  │  (2) cache, WAF, terminação TLS
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │ LOAD        │  (3) escolhe o backend
   │ BALANCER    │
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │ REVERSE     │  (4) roteia, reescreve header, autentica
   │ PROXY       │
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │ APLICAÇÃO   │  (5) AQUI o dado vira decisao
   │ (backend)   │      - roteia
   └──────┬──────┘      - autentica
          │             - autoriza
          │             - valida
          ▼
   ┌─────────────┐
   │ BANCO /     │  (6) o dado vira consulta
   │ SERVICO     │
   └─────────────┘
```

⚠ **A leitura de segurança, e ela é a do módulo inteiro:** em **cada uma das seis etapas**, o dado pode ser **interpretado de forma diferente**. O que o navegador mandou como texto, o proxy pode reescrever; o que o proxy normalizou, a aplicação pode reinterpretar; o que a aplicação validou, o banco pode entender com outra sintaxe.

⚠ **É a mesma tese do `HTTP Smuggling` e do `Parser Differentials`, aplicada a cada salto.** E é a razão de o módulo 10 existir: quando duas camadas discordam sobre os mesmos bytes, quem decide é a de baixo.

---

## 1.2 As seis fronteiras de confiança

⚠ **A definição operacional que o curso usa:**

> **Fronteira de confiança é o ponto em que um dado passa de uma zona onde ele pode ser forjado
> para uma zona onde ele é *tratado como verdade*.**

Toda aplicação tem seis, e o desenho de segurança depende de marcá-las:

| # | Fronteira | Quem controla o dado antes | ⚠ O que a aplicação presume depois |
|---|---|---|---|
| 1 | **Cliente → servidor** | ⚠ **O usuário, integralmente** | "este valor é do usuário X" |
| 2 | **Proxy → aplicação** | A infraestrutura | "este header foi posto por nós" |
| 3 | **Aplicação → banco** | A aplicação | "esta string é dado, não comando" |
| 4 | **Aplicação → serviço externo** | ⚠ **Terceiro** | "a resposta é confiável" |
| 5 | **Serviço externo → aplicação** | ⚠ **Terceiro** | "esta URL é segura para buscar" |
| 6 | **Interno → cliente** | A aplicação | "este dado pode ser mostrado" |

⚠ **A fronteira 1 é a que produz a maioria dos bugs**, e por uma razão simples: **é a única em que o atacante controla 100% do dado, sem intermediário**. Todo o resto da aplicação existe para **tratar esse dado como hostil** — e é onde a disciplina falha.

⚠ **A fronteira 2 é a mais subestimada.** Headers como `X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto`, `X-Original-URL` são **adicionados pela infraestrutura** — mas chegam pelo cliente, e se o proxy não os **remover ou sobrescrever**, o cliente escolhe o valor. ⚠ Um `X-Forwarded-For` forjado burla rate limiting, log e, às vezes, autorização.

```http
# O ataque da fronteira 2, em uma linha
GET /admin HTTP/1.1
Host: app.exemplo.com
X-Forwarded-For: 127.0.0.1          ⚠ o proxy deixa passar
X-Original-URL: /admin              ⚠ se o backend confiar, ele reescreve a rota
```

---

## 1.3 Estado: onde a aplicação guarda o que "sabe"

⚠ **HTTP é sem estado. Toda aplicação web existe para *reconstruir* estado** — e é aí que ela inventa lugares para guardar verdade.

| Onde | Persiste | ⚠ Controlado pelo cliente? |
|---|---|---|
| **URL / query** | Não | ⚠ **Sim, integralmente** |
| **Corpo** | Não | ⚠ **Sim** |
| **Header** | Não | ⚠ **Sim** |
| **Cookie** | Sim | ⚠ **Sim** — e é **lido de volta** |
| **Sessão no servidor** | Sim | ❌ Não — só o **identificador** |
| **JWT** | Sim | ⚠ **Sim — e é assinado, não cifrado** |

⚠ **A distinção que separa dois mundos:**

```
   ESTADO NO CLIENTE                ESTADO NO SERVIDOR
   ─────────────────                ──────────────────
   cookie com valor                 cookie com ID
   JWT com claims                   sessao em memoria/redis
   hidden field no form             -

   ⚠ o cliente PODE alterar         ⚠ o cliente so pode
     o conteudo                       escolher o ID

   Assinatura?                      ⚠ O ID e opaco: nao ha
   ⚠ So integridade, nao sigilo       o que forjar, so o que
                                       ADIVINHAR ou REUSAR
```

⚠ **A lição estrutural:** estado no cliente **só é seguro se for assinado *e* se a assinatura for validada**. E mesmo assinado, **JWT não é cifrado** — o payload é legível, e vazá-lo é vazar dado.

---

## 1.4 Os quatro defeitos de arquitetura

⚠ **Antes de qualquer exploit, quatro desenhos produzem falha.** Reconhecê-los é o que permite prever onde o bug vai estar:

| Defeito | O que é | ⚠ O bug que ele produz |
|---|---|---|
| **Autorização no cliente** | A interface esconde, o backend não verifica | ⚠ Módulo 4 — IDOR, BFLA |
| **Confiança na camada de cima** | O backend presume que o proxy filtrou | ⚠ Módulo 1 — header forjado |
| **Estado no cliente sem assinatura** | Preço, papel, ID no `hidden` | ⚠ Módulo 10 — lógica |
| **Dado de terceiro tratado como próprio** | Resposta de API externa usada direto | ⚠ Módulo 7 — SSRF, XXE |

⚠ **O primeiro é o mais comum, e o mais fácil de achar:** procure, no frontend, uma decisão de segurança — o botão que não aparece, a rota que o roteador bloqueia, o campo que a tela esconde. ⚠ **Cada uma dessas é uma hipótese de que o backend não verifica.** É o primeiro teste do módulo 4, e leva minutos.

---

## 1.5 O mesmo pedido, duas interpretações

⚠ **O exercício que fecha a teoria do módulo.** Duas formas de expressar a mesma coisa, com destinos diferentes:

```http
# Interpretacao 1 — o que o AUTOR da aplicacao imagina
GET /api/perfil?user_id=42 HTTP/1.1
Host: app.exemplo.com
Authorization: Bearer <token-do-usuario-42>
                          │
                          ▼
   o backend faz:  SELECT * FROM perfis WHERE id = 42
   ⚠ presume: "user_id veio do frontend, e o frontend
      so mostra o proprio perfil"

# Interpretacao 2 — o que REALMENTE acontece
GET /api/perfil?user_id=43 HTTP/1.1
Authorization: Bearer <token-do-usuario-42>
                          │
                          ▼
   o backend faz:  SELECT * FROM perfis WHERE id = 43
   ⚠ o token diz "quem sou eu", mas a consulta usa "o que eu pedi"
```

⚠ **A distância entre as duas é o bug.** E note: **não há nada de errado no SQL, nada de errado no token, nada de errado no filtro.** O defeito é **qual das duas fontes decide** — e é o módulo 4 inteiro.

⚠ **A regra que o módulo instala:** *para cada campo que o cliente envia, pergunte qual das duas coisas ele é — **dado** ou **identidade**.* ⚠ Se ele é usado para decidir **o que** devolver, é dado, e pode ser qualquer valor. Se decide **quem** devolve, precisa vir do token, nunca da requisição.

---

## Laboratório 1 — Desenhar os limites

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

**Objetivo:** levantar uma aplicação pequena e **desenhar** o caminho do dado e as fronteiras — antes de tentar qualquer coisa.

```bash
mkdir -p ~/web-lab/m01 && cd ~/web-lab/m01
python3 -m venv .venv && source .venv/bin/activate
pip install flask
```

```python
# app.py — uma aplicacao MINIMA, com as quatro decisoes visiveis
from flask import Flask, request, jsonify
import sqlite3, os

app = Flask(__name__)

def db():
    c = sqlite3.connect("lab.db")
    c.execute("CREATE TABLE IF NOT EXISTS perfis "
              "(id INT, nome TEXT, papel TEXT, saldo INT)")
    c.execute("DELETE FROM perfis")
    c.executemany("INSERT INTO perfis VALUES (?,?,?,?)", [
        (1, "ana",   "admin",  1000),
        (2, "bruno", "usuario",  500),
        (3, "carla", "usuario",  750),
    ])
    c.commit()
    return c

@app.route("/api/perfil")
def perfil():
    uid = request.args.get("user_id")          # ⚠ FRONTEIRA 1: o cliente escolhe
    conn = db()
    # ⚠ FRONTEIRA 3: o valor entra na consulta
    linhas = conn.execute(
        f"SELECT id,nome,papel,saldo FROM perfis WHERE id = {uid}"
    ).fetchall()
    return jsonify(linhas)

@app.route("/api/admin")
def admin():
    # ⚠ FRONTEIRA 2: o backend confia no header do proxy
    fwd = request.headers.get("X-Forwarded-For", "")
    if not fwd.startswith("127."):
        return jsonify({"erro": "negado"}), 403
    conn = db()
    return jsonify(conn.execute("SELECT * FROM perfis").fetchall())

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
```

```bash
python app.py

# Teste 1 — o caminho previsto
curl -s "http://127.0.0.1:5000/api/perfil?user_id=2"

# Teste 2 — o caminho NAO previsto (⚠ a fronteira 1)
curl -s "http://127.0.0.1:5000/api/perfil?user_id=1"

# Teste 3 — ⚠ a fronteira 2, header forjado
curl -s "http://127.0.0.1:5000/api/admin"
curl -s -H "X-Forwarded-For: 127.0.0.1" "http://127.0.0.1:5000/api/admin"
```

**O que observar:** o teste 3 **funciona** — e não há proxy nenhum na arquitetura. ⚠ A aplicação presumiu que existe uma infraestrutura que a protege, e a infraestrutura **não existe**. É a fronteira 2 no estado mais puro: o backend confiou em um header que o cliente escreveu.

**Exercício 1:** desenhe o diagrama do 1.1 para **esta** aplicação e marque as seis fronteiras. ⚠ Para cada uma, escreva: quem controla o dado antes, e o que a aplicação presume depois.

**Exercício 2:** liste **todos** os campos que o cliente pode enviar a esta aplicação (query, header, corpo, cookie). Para cada um, classifique em **dado** ou **identidade**, pela regra do 1.5. ⚠ Os que você classificar como identidade e que venham do cliente são bug imediato.

**Exercício 3 (o que vale):** escolha um defeito da tabela do 1.4 e descreva, **sem executar nada**, o bug que ele produz nesta aplicação. Depois execute e confirme. ⚠ A diferença entre o que você previu e o que aconteceu é o que o curso treina.

---

## Resumo

- Uma requisição atravessa **seis componentes**, e **cada um pode interpretar o dado de forma diferente**.
- ⚠ **Fronteira de confiança** = onde o dado passa de forjável para *tratado como verdade*; toda aplicação tem **seis**.
- ⚠ **A fronteira 1 (cliente → servidor) é a origem da maioria dos bugs** — é a única em que o atacante controla 100% do dado.
- ⚠ **A fronteira 2 (proxy → aplicação) é a mais subestimada**: header de infraestrutura chega pelo cliente.
- **Estado no cliente** só é seguro se for assinado **e** validado — e **JWT é assinado, não cifrado**.
- Os **quatro defeitos de arquitetura** preveem onde o bug está: autorização no cliente, confiança na camada de cima, estado sem assinatura, terceiro como próprio.
- ⚠ **Para cada campo do cliente, pergunte: é *dado* ou é *identidade*?** Se decide **quem**, tem de vir do token.

---

## O que o próximo módulo entrega

Você sabe desenhar as fronteiras. O módulo 2 ensina **o método**: interceptar, repetir, comparar, e separar observação de hipótese — a disciplina que transforma "testei coisas" em **achado reproduzível**.
