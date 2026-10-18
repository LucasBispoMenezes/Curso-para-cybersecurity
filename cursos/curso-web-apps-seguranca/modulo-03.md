# Módulo 3 — Autenticação, Sessões e Identidade

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 3 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 e 2
**Próximo:** Módulo 4 — Autorização e controle de acesso

---

## O que este módulo entrega

Ao final, você vai entender **o ciclo de vida completo de uma sessão** e saber avaliar cada etapa dele. Você vai ver que a maioria das falhas de autenticação **não é senha fraca** — é **estado mal gerenciado**: sessão que não morre, token que não roda, cookie que qualquer um fixa. É a base do módulo 4, porque **autorização sem identidade confiável não existe**.

---

## 3.1 O ciclo de vida: cinco momentos

⚠ **Toda sessão tem cinco momentos, e cada um é uma pergunta de segurança:**

```
   1. CRIAÇÃO      ── o identificador e previsivel?
        │              ⚠ pode ser FORCADO de fora?
        ▼
   2. ENTREGA      ── como chega ao cliente?
        │              ⚠ cookie, header, URL, localStorage?
        ▼
   3. USO          ── como o servidor reconhece?
        │              ⚠ o cookie e a UNICA prova?
        ▼
   4. ROTACAO      ── o ID muda ao elevar privilegio?
        │              ⚠ login, MFA, troca de papel, troca de senha
        ▼
   5. DESTRUICAO   ── logout realmente invalida?
                       ⚠ expiracao, invalidez global, "sair de todos"
```

⚠ **A leitura que organiza o módulo:** os cinco momentos são independentes, e **uma falha em qualquer um basta**. Mas as duas que mais produzem bug são a **1** (identificador forjável) e a **4** (nenhuma rotação).

---

## 3.2 Criação: o identificador

⚠ **A pergunta:** o identificador de sessão é **imprevisível**?

| Fonte | ⚠ Qualidade |
|---|---|
| `secrets.token_hex` / `random_bytes` (CSPRNG) | ✅ correto |
| `Math.random()` / `rand()` | ⚠ **previsível** — semente fraca |
| Contador sequencial | ⚠ **trivial** |
| Dado derivado (hash de nome+tempo) | ⚠ **adivinhável** |
| `uuid4()` | ✅ correto |
| `uuid1()` | ⚠ **contém tempo e MAC** |

⚠ **O ponto que conecta ao curso de Criptografia Aplicada:** *"Ninguém quebra AES. Quebram a aleatoriedade."* ⚠ Aqui é a mesma frase: ninguém quebra a sessão — quebram o **gerador** dela. E o teste é o mesmo: **a sequência é imprevisível depois de ver as anteriores?**

```python
# ⚠ O teste que voce pode fazer: analisar a sequencia de IDs emitidos
import re, collections
ids = [l for l in open("sessoes.txt").read().split("\n") if l]

# 1. tamanho e alfabeto
print("tamanhos:", collections.Counter(len(i) for i in ids))
print("caracteres:", set("".join(ids)) if ids else "")

# 2. ⚠ ha padrao? IDs consecutivos se parecem?
for a, b in zip(ids, ids[1:]):
    print(a, "->", b)
```

⚠ **O alfabeto e o tamanho importam, mas o padrão importa mais.** Um ID de 32 caracteres hex que **incrementa** é pior que um de 16 que é aleatório — porque o número de tentativas deixa de ser astronômico e passa a ser **um**.

---

## 3.3 Entrega: onde o identificador vive

⚠ **Cada lugar tem um custo, e o curso precisa que você saiba escolher:**

| Onde | ⚠ XSS rouba? | ⚠ CSRF vulnerável? | Persiste? |
|---|---|---|---|
| **Cookie `HttpOnly` + `Secure` + `SameSite`** | ❌ não | ⚠ depende do `SameSite` | Sim |
| Cookie **sem** `HttpOnly` | ⚠ **sim** | Sim | Sim |
| `localStorage` / `sessionStorage` | ⚠ **sim, sempre** | ❌ não | Sim/não |
| Header `Authorization` | ❌ não | ❌ não | Só se o JS guardar |
| **URL** (`?sid=...`) | ⚠ sim, e vaza em log, referer, histórico | ⚠ **sim, trivialmente** | Não |

⚠ **A linha do `localStorage` resume o conflito:** ele **imuniza contra CSRF** (o navegador não o envia sozinho) e **entrega tudo ao XSS**. ⚠ Não existe escolha gratuita — existe **compensação**, e quem entende os dois ataques escolhe com critério.

⚠ **As três flags do cookie, e o que cada uma faz:**

```python
# ⚠ A configuracao correta, e o que cada flag impede
resp.set_cookie(
    "sessao", sid,
    httponly=True,        # ⚠ JS nao le      -> mitiga XSS
    secure=True,          # ⚠ so em HTTPS    -> impede captura em claro
    samesite="Lax",       # ⚠ cross-site     -> mitiga CSRF
    max_age=3600,         # ⚠ expiracao
    path="/",
)
```

⚠ **`SameSite` merece a comparação:**

| Valor | Envia em navegação cross-site? | ⚠ CSRF |
|---|---|---|
| `Strict` | ❌ nunca | ✅ bloqueia — e quebra o link vindo de fora |
| `Lax` (padrão moderno) | ⚠ **Sim, em `GET` de topo** | ⚠ Mitiga, **não elimina** |
| `None` | ⚠ Sempre | ⚠ **Exige `Secure`, e reabre CSRF** |

⚠ **A linha do `Lax` é onde a maioria se engana:** ele **permite** o envio em navegação de topo `GET`. Uma operação sensível que aceite `GET` **continua vulnerável** — é o caso clássico do "link que exclui a conta".

---

## 3.4 Rotação: quando o privilegio sobe

⚠ **A falha de desenho mais comum e mais grave deste módulo:**

```
   ANTES DO LOGIN              DEPOIS DO LOGIN
   ┌───────────────┐           ┌───────────────┐
   │ sid = abc123  │  ──────►  │ sid = abc123  │  ⚠ MESMO ID
   │ sem identidade│           │ = usuario ana │
   └───────────────┘           └───────────────┘
        ▲
        │  ⚠ O ATACANTE CONHECE abc123
        │     desde antes do login
        └── fixacao de sessao
```

⚠ **A **fixação de sessão** funciona assim:** o atacante obtém um ID **sem se autenticar**, convence a vítima a usá-lo (link, `Set-Cookie` forçado via subdomínio, XSS), a vítima faz login — e o ID **continua o mesmo**. Agora o atacante tem uma sessão autenticada.

⚠ **A correção é uma linha, e ela é estrutural:**

```python
@app.post("/login")
def login():
    # ... valida credencial ...
    # ⚠ 1. INVALIDA o ID antigo, seja qual for
    sid_antigo = request.cookies.get("sessao")
    if sid_antigo:
        SESSOES.pop(sid_antigo, None)

    # ⚠ 2. EMITE um ID NOVO
    sid_novo = secrets.token_hex(16)
    SESSOES[sid_novo] = {"id": u[0], "papel": u[1]}
    resp.set_cookie("sessao", sid_novo, httponly=True, samesite="Lax")
```

⚠ **Rotação não é só no login.** Todo evento que **muda o nível de confiança** exige rotação:

| Evento | ⚠ Rotaciona? |
|---|---|
| Login | ⚠ **obrigatório** |
| Conclusão de MFA | ⚠ **obrigatório** — senão o 2º fator é decorativo |
| Troca de senha | ⚠ **obrigatório** |
| Elevação de papel | Recomendado |
| Troca de e-mail | Recomendado |

⚠ **O segundo item é o mais interessante:** se o app cria a sessão no login **antes** do MFA, e não rotaciona depois, quem **já tem** o ID (fixação, ou uma sessão parcial roubada) **passa pelo MFA sem fazer MFA**. É a razão de o padrão moderno ser **sessão parcial** — um ID que só serve para o passo do segundo fator.

---

## 3.5 Destruição: a sessão que não morre

⚠ **O teste mais simples e o mais revelador do módulo:**

```bash
# 1. Autentique e guarde o cookie
curl -s -c c.txt -X POST -d "nome=ana&senha=..." http://127.0.0.1:5000/login

# 2. ⚠ Faca logout
curl -s -b c.txt -X POST http://127.0.0.1:5000/logout

# 3. ⚠ Use o MESMO cookie de novo
curl -s -b c.txt http://127.0.0.1:5000/api/perfil
#    SE RETORNAR O PERFIL -> a sessao nao morreu no servidor
```

⚠ **O resultado esperado é `401`. O resultado comum é `200`** — porque o logout apagou **o cookie do cliente**, e o servidor **nunca soube**.

⚠ **As quatro falhas de destruição:**

| Falha | O que acontece |
|---|---|
| Logout só limpa o cookie | ⚠ O ID continua válido no servidor |
| Sessão sem expiração | ⚠ Vale para sempre, e o roubo é permanente |
| Expiração só no cliente | ⚠ O servidor não confere o prazo |
| Sem "sair de todos" | ⚠ Trocar a senha não derruba a sessão roubada |

⚠ **A quarta é a mais grave em impacto real.** Se uma senha vaza e o dono troca, espera-se que o invasor **saia**. Se as sessões antigas continuam válidas, a troca de senha **não resolveu nada** — e é por isso que o padrão correto inclui invalidar **todas** as sessões do usuário na troca de senha.

⚠ **E o ponto do **timestamp de senha**:** o servidor guarda quando a senha mudou, e **rejeita qualquer sessão anterior àquele instante**. É uma linha, e resolve a classe inteira.

---

## 3.6 Recuperação de conta: o caminho alternativo

⚠ **A função mais esquecida é a mais atacada — porque é o **bypass** de tudo.**

| Mecanismo | ⚠ A falha típica |
|---|---|
| **Token por e-mail** | ⚠ Previsível, sem expiração, reutilizável |
| **Pergunta secreta** | ⚠ Resposta pública e pesquisável |
| **Link com hash** | ⚠ Hash fraco, ou e-mail antigo ainda válido |
| **Código numérico** | ⚠ **Sem rate limiting** — 6 dígitos são um milhão, e força-se |
| **Troca sem provar posse do canal** | ⚠ Basta conhecer o endereço |
| Recuperação que **revela** se a conta existe | ⚠ Enumeração de usuário |

⚠ **Os dois últimos merecem destaque:**

⚠ **Sem rate limiting em código numérico, a segurança é ilusória.** Um código de 6 dígitos parece forte — até você perceber que dá para tentar mil por minuto. ⚠ E se o servidor **não invalidar** o código após N tentativas, ele é apenas demorado.

⚠ **Enumeração de usuário** é a falha que **precede** todas as outras: se a tela de login ou de recuperação responde diferente para e-mail existente e inexistente, você acabou de ganhar a lista de contas. ⚠ E o teste é de **comparação** — é o método do módulo 2.

```bash
# O teste de enumeracao — comparacao pura
for u in ana bruno carla naoexiste; do
  printf "%-12s " "$u"
  curl -s -o /dev/null -w "status=%{http_code} tamanho=%{size_download}\n" \
       -X POST -d "nome=$u" http://127.0.0.1:5000/recuperar
done
# ⚠ se status E tamanho diferem -> enumera
```

---

## 3.7 Autenticação não é autorização

⚠ **A confusão que o módulo 4 explora, e que precisa ser feita agora:**

```
   AUTENTICACAO                    AUTORIZACAO
   ────────────                    ────────────

   "quem e voce?"                  "voce pode fazer ISSO
                                     com ISSO?"

   produz: IDENTIDADE              produz: DECISAO
   (o token, a sessao)             (o acesso, ou o 403)

   ⚠ falha dela = nao sei quem     ⚠ falha dela = sei quem
     e' -> nego tudo                 e' -> e deixo fazer
                                       o que nao devia
```

⚠ **A frase que fecha o módulo, e abre o próximo:**

> **Autenticação é um problema resolvido — na maioria das aplicações, ela funciona.**
> **Autorização é onde a aplicação erra — porque cada rota precisa decidir, e alguém esquece uma.**

⚠ **E a razão estrutural é simples:** autenticação é **centralizada** (um middleware, um decorator) e autorização é **distribuída** (uma checagem por rota, por objeto, por campo). ⚠ **Código distribuído erra por omissão** — e a omissão não aparece no teste do caminho feliz. É o módulo 4.

---

## Laboratório 3 — Investigar o ciclo de vida

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

```bash
mkdir -p ~/web-lab/m03 && cd ~/web-lab/m03
python3 -m venv .venv && source .venv/bin/activate
pip install flask requests
```

```python
# app.py — aplicacao COM as falhas de sessao de proposito
from flask import Flask, request, jsonify, make_response
import sqlite3, random, time

app = Flask(__name__)
SESSOES = {}
USUARIOS = {"ana": "senha123", "bruno": "senha456"}
PAPEIS   = {"ana": "admin", "bruno": "usuario"}
CODIGOS  = {}   # recuperacao de conta

def uid_aleatorio():
    # ⚠ FALHA 1: gerador previsivel
    random.seed(int(time.time()))
    return "".join(random.choice("0123456789abcdef") for _ in range(8))

@app.post("/login")
def login():
    nome = request.form.get("nome"); senha = request.form.get("senha")
    if USUARIOS.get(nome) != senha:
        # ⚠ FALHA 6: mensagens diferentes -> enumera usuario
        msg = "usuario nao existe" if nome not in USUARIOS else "senha incorreta"
        return jsonify({"erro": msg}), 401

    # ⚠ FALHA 2: NAO rotaciona o ID existente
    sid = request.cookies.get("sessao") or uid_aleatorio()
    SESSOES[sid] = {"nome": nome, "papel": PAPEIS[nome], "desde": time.time()}

    r = make_response(jsonify({"ok": True, "sid": sid}))
    # ⚠ FALHA 3: sem Secure, sem SameSite
    r.set_cookie("sessao", sid, httponly=True)
    return r

@app.post("/logout")
def logout():
    # ⚠ FALHA 4: so apaga o cookie — o servidor NAO sabe
    r = make_response(jsonify({"ok": True}))
    r.delete_cookie("sessao")
    return r

@app.get("/api/perfil")
def perfil():
    eu = SESSOES.get(request.cookies.get("sessao"))
    if not eu: return jsonify({"erro": "sem sessao"}), 401
    # ⚠ FALHA 5: sem checagem de expiracao no servidor
    return jsonify(eu)

@app.post("/recuperar")
def recuperar():
    nome = request.form.get("nome")
    if nome not in USUARIOS:
        return jsonify({"erro": "usuario nao existe"}), 404
    cod = str(random.randint(100000, 999999))
    CODIGOS[nome] = cod
    # ⚠ FALHA 7: sem rate limiting, sem invalidar apos N tentativas
    return jsonify({"ok": True, "codigo_debug": cod})   # so para o lab

@app.post("/trocar-senha")
def trocar():
    eu = SESSOES.get(request.cookies.get("sessao"))
    if not eu: return jsonify({"erro": "sem sessao"}), 401
    USUARIOS[eu["nome"]] = request.form.get("nova")
    # ⚠ FALHA 8: NAO invalida as outras sessoes do usuario
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
```

```bash
python app.py

# ── O ciclo de vida, em cinco testes ───────────────────────

# 1. CRIACAO — o ID e previsivel?
#    ⚠ rode o login duas vezes em segundos diferentes e compare
curl -s -X POST -d "nome=bruno&senha=senha456" http://127.0.0.1:5000/login
curl -s -X POST -d "nome=bruno&senha=senha456" http://127.0.0.1:5000/login

# 2. FIXACAO — o ID sobrevive ao login?
curl -s -c fix.txt -X POST -d "nome=bruno&senha=senha456" http://127.0.0.1:5000/login
grep sessao fix.txt
curl -s -b fix.txt -X POST -d "nome=ana&senha=senha123" http://127.0.0.1:5000/login
grep -c sessao fix.txt   # ⚠ o cookie mudou?

# 3. DESTRUICAO — o logout invalida no servidor?
curl -s -b fix.txt -X POST http://127.0.0.1:5000/logout
curl -s -b fix.txt http://127.0.0.1:5000/api/perfil    # ⚠ 200 ou 401?

# 4. ENUMERACAO — as respostas diferem?
for u in ana naoexiste; do
  curl -s -X POST -d "nome=$u" http://127.0.0.1:5000/recuperar; echo
done

# 5. TROCA DE SENHA — derruba as outras sessoes?
curl -s -c s1.txt -X POST -d "nome=bruno&senha=senha456" http://127.0.0.1:5000/login
curl -s -c s2.txt -X POST -d "nome=bruno&senha=senha456" http://127.0.0.1:5000/login
curl -s -b s1.txt -X POST -d "nova=novaSenha" http://127.0.0.1:5000/trocar-senha
curl -s -b s2.txt http://127.0.0.1:5000/api/perfil    # ⚠ s2 sobreviveu?
```

**O que observar:** no teste 3, o `200` prova a falha 4 — e é a mesma demonstração do 3.5. No teste 5, a sessão `s2` **continua válida** depois da troca de senha. ⚠ E note: nenhuma dessas falhas é "senha fraca". Todas são **estado mal gerenciado**.

**Exercício 1:** preencha a tabela dos **cinco momentos** do 3.1 para esta aplicação, marcando cada um como correto ou falho, com a requisição que prova. ⚠ Use o formato do 2.4 — hipótese, requisição, resposta, veredito.

**Exercício 2:** conserte **a falha 1** (gerador previsível) com `secrets`, e escreva um script que **prove** que a nova sequência é imprevisível (⚠ dica: com semente aleatória de verdade, dois logins no mesmo segundo não se parecem).

**Exercício 3 (o que vale):** conserte as falhas **2, 3, 4 e 8** — rotação no login, flags do cookie, invalidação no logout e invalidação global na troca de senha. ⚠ Implemente o **timestamp de senha** (o servidor rejeita sessão anterior à troca) e escreva o **teste de regressão** que falha no código antigo e passa no novo. É o ciclo do módulo 11, feito pequeno.

---

## Resumo

- ⚠ **A sessão tem cinco momentos** — criação, entrega, uso, rotação e destruição — e **falhar em um basta**.
- ⚠ **A maioria das falhas não é senha fraca: é estado mal gerenciado.**
- ⚠ **Rotação é obrigatória ao subir o privilégio** — sem ela, o MFA é decorativo e a fixação funciona.
- ⚠ **`SameSite=Lax` mitiga, não elimina**: operação sensível em `GET` continua exposta.
- ⚠ **Logout que só apaga o cookie não invalida nada** — o teste é reusar o cookie.
- ⚠ **Troca de senha sem invalidar sessão não resolve o vazamento** — o `timestamp` de senha resolve por uma linha.
- **Recuperação de conta é o bypass mais esquecido** — e o código numérico sem rate limiting não é defesa.
- ⚠ **Autenticação é centralizada e funciona; autorização é distribuída e erra por omissão.**

---

## O que o próximo módulo entrega

Você sabe estabelecer **identidade**. O módulo 4 trata do que a aplicação faz com ela: **autorização** — por objeto, por função e por propriedade — e por que a omissão de uma checagem em *uma* rota é o bug mais comum da web.
