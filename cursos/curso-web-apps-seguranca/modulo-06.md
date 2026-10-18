# Módulo 6 — Segurança do Navegador e Camada Cliente

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 6 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 a 5
**Próximo:** Módulo 7 — SSRF, uploads e integrações externas

---

## O que este módulo entrega

Ao final, você vai saber **identificar o contexto de interpretação** de um dado — e por isso saber qual codificação corrige cada falha. Você vai entender XSS como **problema de contexto**, não como "injeção de script", e as três defesas do navegador (CSRF, CORS, CSP) pelo que cada uma realmente faz. É o módulo que fecha a fronteira 6 do módulo 1 (interno → cliente).

---

## 6.1 O navegador como interpretador

⚠ **O módulo 5 disse que injeção é dado e instrução no mesmo canal. Aqui o canal é o **documento**, e o interpretador é o **navegador**.**

⚠ **E o navegador tem uma característica que o SQL não tem: ele interpreta o **mesmo texto de formas diferentes**, dependendo de **onde** o texto está.

```
   "  <  s  c  r  i  p  t  >  ..."  <- este texto

   em <div>.......</div>        -> ⚠ executado como HTML
   em <a href="....">           -> interpretado como URL
   em <img src="....">          -> interpretado como URL
   em <script> var x = "...."   -> interpretado como JS
   em <style>.......</style>    -> interpretado como CSS
   em um header HTTP            -> ⚠ nem chega ao parser HTML
```

⚠ **A frase que organiza o módulo:**

> **XSS não é "injetar `<script>`". É fazer com que o dado seja interpretado como CÓDIGO no
> contexto em que ele foi colocado — e o contexto decide o que conta como código.**

---

## 6.2 Os três XSS — e por que a divisão engana

⚠ **A divisão clássica é por **onde o dado entra**; a útil é por **onde ele é interpretado**:**

| Tipo | Onde entra | ⚠ Onde é interpretado | ⚠ O bug está em |
|---|---|---|---|
| **Refletido** | Query/param | ⚠ Na **resposta** | A página que ecoa |
| **Armazenado** | Banco | ⚠ Na **resposta de outro** | O eco + a persistência |
| **DOM-based** | Query/`location`/`postMessage` | ⚠ **No JS do cliente** | ⚠ O JS que lê e escreve |
| ⚠ **Blind** | Banco | ⚠ Na resposta de um **admin** | O mesmo — sem você ver |

⚠ **O item que a divisão clássica esconde: o DOM-based não passa pelo servidor.** O servidor pode estar **perfeitamente correto** — nada dele ecoa o dado — e o bug estar no JavaScript:

```javascript
// ⚠ VULNERAVEL — DOM-based puro: o servidor NAO participa
const nome = new URLSearchParams(location.search).get("nome");
document.getElementById("saudacao").innerHTML = `Ola, ${nome}`;
//                                               ^^^^^^^^^
// ⚠ innerHTML INTERPRETA. O servidor nunca viu este dado.
```

⚠ **A consequência para o teste:** procurar XSS só nas respostas do servidor **não acha** esta classe. ⚠ É preciso **ler o JavaScript** — e é por isso que o módulo 2 pôs o código como a quarta fonte.

---

## 6.3 Contexto de saída: a tabela que decide tudo

⚠ **Esta tabela é o coração do módulo. Nela está a diferença entre corrigir e achar que corrigiu:**

| Contexto | Como o dado é interpretado | ⚠ Codificação correta |
|---|---|---|
| **Corpo HTML** | HTML | Escapar `& < > " '` |
| **Atributo** (`value="..."`) | HTML | Escapar `& "` e `'`; aspas **sempre** |
| **URL** (`href="..."`) | URI | Validar **esquema**; `encodeURIComponent` |
| **`<script>` inline** | ⚠ **JS** | ⚠ **Nunca** inserir dado aqui — use dado + `textContent` |
| **CSS** (`style="..."`) | CSS | Validar cor/valor |
| **`<script src="...">`** | URL de script | ⚠ **Allowlist** de origem |
| **JSON embutido na página** | JS | Escapar `<` e `/` |

⚠ **A terceira linha é a que mais escapa, e a razão é intuitiva:** o atacante não precisa quebrar o HTML — ele muda o **esquema** da URL.

```html
<!-- ⚠ VULNERAVEL — o dado vai para dentro de href -->
<a href="{{ link }}">clique</a>

<!-- o atacante manda:  link = javascript:alert(document.cookie) -->
<!-- ⚠ o HTML esta VALIDO. Nao ha tag quebrada. Nao ha "<". -->
<a href="javascript:alert(document.cookie)">clique</a>
```

⚠ **A correção para URL não é escapar — é **validar o esquema**:**

```python
# ✅ CORRIGIDO — allowlist de ESQUEMA para dado que vai em atributo de URL
from urllib.parse import urlparse
ESQUEMAS_OK = {"http", "https"}

def link_seguro(bruto):
    p = urlparse(bruto)
    if p.scheme.lower() not in ESQUEMAS_OK:      # ⚠ rejeita javascript:, data:, vbscript:
        return "/"                                # fallback seguro
    return bruto
```

⚠ **A quarta linha (`<script>` inline) tem a regra mais dura:** *não existe codificação segura para dado dentro de JavaScript inline.* ⚠ Escape de JS é notoriamente quebrável (contextos de regex, de string, de template literal, de comentário). A resposta correta é **não colocar dado ali** — passar por `data-*`, por JSON, ou por chamada de API.

---

## 6.4 Também no cliente: template e framework

⚠ **A mesma distinção de canal do módulo 5, agora no frontend:**

| Padrão | ⚠ Interpreta? | Uso correto |
|---|---|---|
| `element.textContent = dado` | ❌ | ✅ Sempre que for texto |
| `element.innerHTML = dado` | ⚠ **sim** | ❌ Nunca com dado de usuário |
| `document.write(dado)` | ⚠ **sim** | ❌ Nunca |
| `eval` / `new Function` | ⚠ **sim** | ❌ Nunca |
| `React.createElement(...)` | ❌ | ✅ — o React escapa por padrão |
| ⚠ `dangerouslySetInnerHTML` | ⚠ **sim** | Só com HTML sanitizado |
| ⚠ `v-html` (Vue) | ⚠ **sim** | Mesmo caso |
| jQuery `.html()` | ⚠ **sim** | Use `.text()` |

⚠ **A lição dos frameworks:** eles **reduzem** a superfície porque escapam por padrão — e **reintroduzem** o problema quando você usa a escotilha. ⚠ O nome `dangerouslySetInnerHTML` é literal, e a pergunta é sempre: **este HTML foi sanitizado por uma biblioteca, ou veio do usuário?**

---

## 6.5 CSRF: quando o navegador age sozinho

⚠ **CSRF não é injeção — é **autoridade emprestada**:**

```
   VITIMA logada em banco.com            SITE MALICIOSO
   ┌──────────────────────┐              ┌──────────────────────┐
   │ cookie de sessao     │              │ <img src=            │
   │ VALIDO               │  ◄────────── │  "banco.com/         │
   └──────────────────────┘   ⚠ o navegador      transferir?      │
                              ENVIA o cookie     valor=1000&       │
                              automaticamente    para=atacante">  │
                                               └──────────────────────┘
   ⚠ O atacante nao ve a resposta. Ele so precisa
     que a REQUISICAO aconteca com o cookie junto.
```

⚠ **Três condições para CSRF existir, e a ausência de qualquer uma o mata:**

| Condição | ⚠ Como removê-la |
|---|---|
| Ação **com efeito** | — (não removível) |
| Autoridade **implícita** (cookie) | ⚠ `SameSite` — ou header em vez de cookie |
| Parâmetros **previsíveis** | ⚠ Token anti-CSRF |

⚠ **A defesa que o autor de aplicação iniciante quase sempre esquece:** o CSRF **não** é resolvido por validar se o usuário está logado — ele **está**. É resolvido por exigir **algo que o navegador não envia sozinho**.

⚠ **As três defesas, em ordem de robustez:**

| Defesa | ⚠ Força | Limite |
|---|---|---|
| ⚠ **`SameSite=Lax`/`Strict`** | Alta | ⚠ `Lax` permite `GET` de topo |
| ⚠ **Token anti-CSRF** | Alta | Só se for **único por sessão** e **conferido** |
| ⚠ **Origem/`Referer`** | Média | ⚠ Pode faltar; e depende de config |
| Duplo cookie | Média | Vulnerável a subdomínio |
| ⚠ **Exigir reautenticação** | Altíssima | Atrito |

⚠ **E a regra de operação:** **`GET` não muda estado.** ⚠ Se a aplicação aceita `GET /excluir?id=5`, nenhuma das três primeiras defesas resolve — porque `SameSite=Lax` **envia** o cookie em navegação de topo `GET`. É a armadilha do 3.3, na forma de CSRF.

---

## 6.6 CORS: o que ele é, e o que ele não é

⚠ **O mal-entendido mais comum do módulo:**

> **CORS não é uma defesa da sua aplicação. É uma escotilha que a sua aplicação abre** para
> permitir que **outra origem** leia as respostas dela.

⚠ **A distinção estrutural:** a *same-origin policy* já **impede** que `outro.site` leia a resposta da sua API. O CORS não "protege" — ele **relaxa** essa proteção, para o caso legítimo (frontend em outro domínio).

⚠ **E a configuração errada é uma das poucas que produz vulnerabilidade sozinha:**

```python
# ⚠ VULNERAVEL — reflete QUALQUER origem E permite credencial
@app.after_request
def cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    resp.headers["Access-Control-Allow-Credentials"] = "true"   # ⚠ ⚠
    return resp
```

⚠ **A combinação das duas linhas é o bug:** refletir a origem **anula** a proteção (qualquer site vira "permitido"), e permitir credencial faz o navegador **enviar o cookie**. ⚠ Resultado: qualquer site lê a sua API **autenticado como a vítima** — um CSRF de **leitura**, que é pior que o de escrita, porque exfiltra.

⚠ **A correção é uma allowlist de origem, e a distinção que quase ninguém faz:**

| Configuração | ⚠ Veredito |
|---|---|
| `Allow-Origin: *` sem credencial | ✅ ok — não envia cookie |
| `Allow-Origin: *` **com** credencial | ⚠ O navegador **recusa** — e é falha de desenho |
| Origem **refletida** com credencial | ⚠ ⚠ **Vulnerabilidade** |
| Allowlist explícita com credencial | ✅ correto |
| ⚠ Allowlist **por sufixo** (`endsWith`) | ⚠ Vulnerável — `malicioso.exemplo.com` passa |

```python
# ✅ CORRIGIDO — allowlist EXATA, e sem reflexo
ORIGENS_OK = {"https://app.exemplo.com", "https://admin.exemplo.com"}

@app.after_request
def cors(resp):
    o = request.headers.get("Origin")
    if o in ORIGENS_OK:                       # ⚠ comparação EXATA
        resp.headers["Access-Control-Allow-Origin"] = o
        resp.headers["Access-Control-Allow-Credentials"] = "true"
    return resp
```

⚠ **A última linha da tabela merece atenção:** `origin.endswith("exemplo.com")` aceita `malicioso.exemplo.com` **e** `exemplo.com.atacante.net`. ⚠ É o mesmo erro de raciocínio do 5.4 — validar por **forma** em vez de por **conjunto fechado**.

---

## 6.7 CSP: a defesa em camadas, honesta

⚠ **`Content-Security-Policy` é um header que diz ao navegador **o que ele pode carregar e executar**.**

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-abc123';      ⚠ nonce por resposta
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';
```

⚠ **O que a CSP resolve, e o que ela não resolve:**

| ✅ Resolve | ⚠ Não resolve |
|---|---|
| Execução de script inline injetado | ⚠ XSS que use origem permitida |
| Carregamento de recurso externo | ⚠ Dado exfiltrado por **formulário** |
| `eval` e `Function` (sem `unsafe-eval`) | ⚠ Injeção **fora** do navegador |
| Clickjacking (`frame-ancestors`) | ⚠ HTML injection sem script |

⚠ **A primeira linha da direita é a lição:** se a política permite `'self'` e existe **qualquer** endpoint que sirva conteúdo do usuário, um `script-src 'self'` **não** impede — porque o script vem da sua própria origem. ⚠ É a razão de CSP ser **mitigação**, e não correção.

⚠ **E a armadilha da CSP "que funciona":**

| Diretiva | ⚠ Sensação | ⚠ Realidade |
|---|---|---|
| `unsafe-inline` | "tenho CSP" | ⚠ Não protege contra inline |
| `unsafe-eval` | "tenho CSP" | Reabre `eval` |
| `*` em `script-src` | "tenho CSP" | ⚠ Não protege de nada |
| Só `default-src` | "tenho CSP" | ⚠ Fallback, fácil de esquecer diretiva |
| Sem `report-uri` | "tenho CSP" | ⚠ Não se sabe o que ela bloqueia |

⚠ **A regra de veredito:** uma CSP que contém `unsafe-inline` **não é defesa** contra XSS — é declaração de intenção. ⚠ E o relatório do módulo 12 precisa dizer isso com essas palavras.

---

## 6.8 Clickjacking e WebSocket

⚠ **Clickjacking** — a página da vítima é embutida em um `iframe` transparente, e o clique vai para ela.

```http
# Defesas — em ordem
Content-Security-Policy: frame-ancestors 'none';      ⚠ moderna e correta
X-Frame-Options: DENY                                  legada, mas vale
```

⚠ **A distinção que importa:** `frame-ancestors` é **mais específico** (permite allowlist de origem) e **convive** com CSP; `X-Frame-Options` é binário e não tem allowlist. ⚠ Os dois juntos cobrem navegador antigo.

⚠ **WebSocket** — o handshake é HTTP, e **depois** o canal é livre:

| Aspecto | ⚠ Ponto de atenção |
|---|---|
| Handshake | ⚠ ❌ **o navegador NÃO aplica same-origin** |
| Origem | ⚠ O servidor **precisa** conferir o header `Origin` |
| Autenticação | ⚠ O cookie vai no handshake — CSRF é possível |
| Mensagens | ⚠ Dado do servidor no cliente: XSS de novo |
| Subprotocolo | Formato próprio — **parser próprio** |

⚠ **A primeira linha é contraintuitiva e por isso o ponto existe:** diferente de `fetch`, o WebSocket **não** é bloqueado pelo navegador para outra origem. ⚠ **Quem decide é o servidor**, conferindo `Origin` no handshake — e a maioria não confere.

---

## Laboratório 6 — Contexto e defesa

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

```bash
mkdir -p ~/web-lab/m06 && cd ~/web-lab/m06
python3 -m venv .venv && source .venv/bin/activate
pip install flask
```

```python
# app.py — XSS nos quatro contextos, + CSRF, + CORS aberto
from flask import Flask, request, jsonify, make_response, render_template_string
import secrets

app = Flask(__name__)
MSG = []      # "banco de dados" em memoria
SESSOES = {"tok-ana": {"nome":"ana","papel":"admin"}}

PAGINA = """
<!doctype html><html><body>
<h1>Contextos</h1>

<!-- ⚠ 1. corpo HTML -->
<div id="corpo">{{ corpo | safe }}</div>

<!-- ⚠ 2. atributo -->
<a id="link" href="{{ link | safe }}">link</a>

<!-- ⚠ 3. URL em img -->
<img id="img" src="{{ src | safe }}">

<!-- ⚠ 4. dentro de <script> -->
<script>
  var nome = "{{ js | safe }}";
  document.title = nome;
</script>

<h2>Mural</h2>
<div id="mural">{% for m in mural %}<div>{{ m | safe }}</div>{% endfor %}</div>
<form method="post" action="/mural">
  <input name="msg" placeholder="mensagem">
  <button>postar</button>
</form>
</body></html>
"""

@app.get("/")
def index():
    return render_template_string(PAGINA,
        corpo=request.args.get("corpo", ""),
        link=request.args.get("link", "/"),
        src=request.args.get("src", ""),
        js=request.args.get("js", ""),
        mural=MSG)

@app.post("/mural")
def postar():
    MSG.append(request.form.get("msg", ""))     # ⚠ armazenado sem tratamento
    return make_response("", 302, {"Location": "/"})

# ── CSRF: acao com efeito, sem token, sem SameSite ────────────
@app.post("/excluir")
def excluir():
    if request.cookies.get("sessao") not in SESSOES:
        return jsonify({"erro":"sem sessao"}), 401
    return jsonify({"ok": True, "msg": "conta excluida"})    # ⚠ efeito!

@app.get("/excluir-get")
def excluir_get():
    # ⚠ efeito em GET — pior ainda
    if request.cookies.get("sessao") not in SESSOES:
        return jsonify({"erro":"sem sessao"}), 401
    return jsonify({"ok": True, "msg": "conta excluida via GET"})

# ── CORS refletido com credencial ──────────────────────────────
@app.get("/api/dados")
def dados():
    if request.cookies.get("sessao") not in SESSOES:
        return jsonify({"erro":"sem sessao"}), 401
    return jsonify({"segredo": "anotacoes da ana", "saldo": 9000})

@app.after_request
def cors(resp):
    o = request.headers.get("Origin")
    if o:
        resp.headers["Access-Control-Allow-Origin"] = o          # ⚠ reflete
        resp.headers["Access-Control-Allow-Credentials"] = "true"  # ⚠ + credencial
    return resp

@app.post("/login")
def login():
    r = make_response(jsonify({"ok": True}))
    r.set_cookie("sessao", "tok-ana")     # ⚠ sem HttpOnly, sem SameSite
    return r

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
```

```bash
python app.py

# ── 1. Os QUATRO contextos — o que muda em cada um ──────────
#    corpo: quebra a tag
open "http://127.0.0.1:5000/?corpo=<img src=x onerror=alert(1)>"

#    atributo: fecha a aspa
open 'http://127.0.0.1:5000/?link=/%"onmouseover="alert(1)'

#    ⚠ URL: NAO precisa quebrar nada — so trocar o esquema
open 'http://127.0.0.1:5000/?link=javascript:alert(document.cookie)'

#    ⚠ <script>: o dado esta dentro de JS
open 'http://127.0.0.1:5000/?js=;alert(1);//'

# ── 2. Armazenado — o mural ─────────────────────────────────
curl -s -X POST -d 'msg=<script>fetch("/api/dados").then(r=>r.text()).then(console.log)</script>' \
     http://127.0.0.1:5000/mural
# ⚠ recarregue / e observe: o script executa para TODO visitante

# ── 3. CSRF — o navegador age sozinho ───────────────────────
#    Crie um arquivo local csrf.html e abra no navegador logado:
cat > csrf.html <<'EOF'
<!-- ⚠ pagina de outro site, simulada localmente -->
<form action="http://127.0.0.1:5000/excluir" method="POST" id="f"></form>
<script>document.getElementById("f").submit();</script>
<!-- ⚠ GET tambem funciona: -->
<img src="http://127.0.0.1:5000/excluir-get">
EOF
# ⚠ abra file://.../csrf.html com o cookie de sessao ativo

# ── 4. CORS — leitura cross-origin ──────────────────────────
curl -s -i -H "Origin: https://atacante.exemplo" \
     -H "Cookie: sessao=tok-ana" http://127.0.0.1:5000/api/dados | head -12
# ⚠ as duas linhas de acesso refletem a origem de atacante
```

**O que observar:** no passo 1, **o terceiro caso** é o mais instrutivo — `javascript:` não quebra HTML nenhum, e o atributo continua válido. ⚠ E o quarto mostra que dentro de `<script>` **não há codificação segura**: o dado está em contexto de JS, e a saída é não pôr dado ali.

**Exercício 1:** para cada um dos quatro contextos, escreva **a codificação correta** (a tabela do 6.3) e implemente. ⚠ Para o contexto 4, a resposta correta **não** é escapar — explique por quê em duas linhas.

**Exercício 2:** no passo 4, a origem do atacante foi aceita. ⚠ Escreva a **correção** com allowlist exata e demonstre que a origem de atacante deixa de receber o header. Depois explique por que `endswith` seria vulnerável.

**Exercício 3 (o que vale):** adicione uma **CSP** ao `/` com nonce, e demonstre: (a) o XSS armazenado do passo 2 **para de executar**; (b) ao adicionar `unsafe-inline`, ele **volta**. ⚠ Escreva o veredito em uma frase — o que isso diz sobre o valor de uma CSP que contém `unsafe-inline`.

---

## Resumo

- ⚠ **O mesmo texto é interpretado de formas diferentes conforme o contexto** — o contexto decide o que é código.
- ⚠ **DOM-based XSS não passa pelo servidor**: só ler o código acha.
- ⚠ **Em atributo de URL, o ataque é o *esquema*** (`javascript:`) — HTML válido, sem tag quebrada.
- ⚠ **Dentro de `<script>` não existe codificação segura** — a resposta é não inserir dado ali.
- ⚠ **Frameworks protegem por padrão e reintroduzem o problema na escotilha** (`dangerouslySetInnerHTML`, `v-html`).
- ⚠ **CSRF é autoridade emprestada**, não injeção — resolvido por token, `SameSite` ou reautenticação.
- ⚠ **`GET` que muda estado derruba as defesas de CSRF** — `SameSite=Lax` envia o cookie em navegação de topo.
- ⚠ **CORS não é defesa — é escotilha**: refletir origem **com credencial** é vulnerabilidade.
- ⚠ **CSP é mitigação, não correção** — e com `unsafe-inline` não é defesa.
- ⚠ **O WebSocket não aplica same-origin no handshake** — quem decide é o servidor, conferindo `Origin`.

---

## O que o próximo módulo entrega

Você cobriu o cliente. O módulo 7 trata das falhas em que **o servidor faz a requisição** — SSRF, upload e consumo de serviço externo — onde a pergunta é **para onde o servidor pode ir, e o que ele faz com a resposta**.
