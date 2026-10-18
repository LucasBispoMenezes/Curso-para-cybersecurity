# Módulo 1 — Modelagem de Ameaças Mobile

**Curso:** Mobile Application Security: Análise e Pesquisa de Vulnerabilidades
**Módulo:** 1 de 12 · 3 horas
**Pré-requisitos:** Cursos 1 e 2 · Web Apps e APIs
**Próximo:** Módulo 2 — Autenticação, sessão e identidade

---

## O que este módulo entrega

Ao final, você vai saber **construir um modelo de ameaça para um app mobile** — quem é o atacante, o que ele controla, e qual ativo está em jogo. É o módulo que impede a investigação de virar tentativa: sem modelo, você testa tudo e conclui pouco.

---

## 1.1 A diferença estrutural do mobile

⚠ **Por que um modelo de ameaça mobile não é o de uma aplicação web:**

```
   APLICAÇÃO WEB                    ⚠ APP MOBILE
   ─────────────                    ──────────

   o atacante controla:             o atacante controla:
     - o que ENVIA                    - o que envia
     - o navegador                    ⚠ ⚠ O APP INTEIRO
                                      ⚠ o ARMAZENAMENTO
                                      ⚠ a REDE
                                      ⚠ o AMBIENTE

   ⚠ o servidor desconfia do        ⚠ ⚠ o servidor PRECISA
     cliente                            desconfiar do app —
                                        porque ele e' do usuario
```

⚠ **A frase que organiza o módulo:**

> **O app é do usuário. Tudo que ele decide pode ser alterado por quem tem o aparelho.**

⚠ **E a consequência prática é grande:** ⚠ no web, o atacante manipula **requisições**. ⚠ No mobile, ele manipula o **cliente inteiro** — e isso amplia o que se pode fazer: ⚠ alterar uma decisão local, ler o armazenamento, interceptar a rede, e **mudar o código**.

⚠ **E o deslocamento que o curso inteiro faz:**

| Onde a análise web procura | ⚠ Onde a mobile procura |
|---|---|
| Validação da entrada | ⚠ **O que o servidor reconfirma** |
| Autorização no backend | ⚠ ⚠ **Se ela existe no backend** |
| Sanitização de saída | ⚠ O que o app **guarda** |
| Sessão | ⚠ **Onde a sessão vive** |

---

## 1.2 Os quatro atores

⚠ **Todo modelo de ameaça mobile tem quatro, e a distinção muda o impacto:**

| Ator | ⚠ O que ele controla | ⚠ Exemplo de ativo |
|---|---|---|
| ⚠ **Dono do aparelho** | ⚠ O app, o dado, o ambiente | Seus próprios dados |
| ⚠ **App malicioso** | ⚠ ⚠ **A interface entre apps** | ⚠ Dado de outro app |
| **Atacante de rede** | O tráfego no caminho | Credencial em trânsito |
| **Atacante de servidor** | A API | Todos os usuários |

⚠ **A segunda linha é a mais específica do mobile, e a mais subestimada:** ⚠ um app instalado **no mesmo aparelho** pode **invocar** o seu — por `Intent` no Android, por URL scheme no iOS. ⚠ É a fronteira que os Cursos 1 e 2 mapearam, e é onde metade dos achados deste curso mora.

⚠ **A primeira é a que o relatório precisa declarar:** ⚠ o **dono do aparelho** controla o app — e ⚠ isso **não é ataque**; é o **modelo de ameaça**. ⚠ Achados que exigem **o dono manipulando o próprio app** têm gravidade **diferente** de achados que exigem **outro app** ou **a rede**.

⚠ **A tabela de gravidade que o curso usa:**

| Quem precisa | ⚠ Gravidade |
|---|---|
| ⚠ **Atacante de rede** | ⚠ ⚠ **Alta** — não precisa de nada |
| ⚠ **App malicioso no mesmo aparelho** | ⚠ ⚠ Alta |
| ⚠ **Dono do aparelho (root/jailbreak)** | ⚠ Média — condicionado |
| ⚠ **Dono do aparelho, sem comprometer** | ⚠ ⚠ **Alta** — é o caso comum |
| Atacante de servidor | Depende |

---

## 1.3 O que o atacante controla, em cada camada

⚠ **O inventário do módulo, e cada linha é uma classe de teste:**

| Camada | ⚠ O que se controla | Módulo |
|---|---|---|
| ⚠ **O armazenamento** | ⚠ Ler, alterar, apagar | ⚠ 3 |
| ⚠ **A rede** | ⚠ Ver, alterar, bloquear | ⚠ 5 |
| ⚠ **A decisão local** | ⚠ ⚠ Alterar a flag, o papel, o saldo | ⚠ 4 |
| ⚠ **A invocação** | ⚠ ⚠ **Outro app chama o seu** | ⚠ 6 |
| ⚠ **O conteúdo** | ⚠ `WebView`, deep link, arquivo | ⚠ 6 |
| **O tempo** | Repetir, atrasar, paralelizar | ⚠ 7 |
| ⚠ **A integridade** | ⚠ Modificar o app | ⚠ 8 |

⚠ **A terceira linha é a que o curso cobra o tempo todo:** ⚠ o app guarda `premium: true` — ⚠ e o atacante **altera**. ⚠ A pergunta **não** é "o dado está protegido"; ⚠ é: ⚠ **o servidor reconfirma?**

⚠ **E a quarta é a que o Curso 1 aprofundou, e aqui é método:** ⚠ não basta o componente ser exportado; ⚠ é preciso demonstrar **o que acontece** quando um terceiro o invoca.

---

## 1.4 O modelo, em quatro perguntas

⚠ **O instrumento do módulo, e ele precede qualquer teste:**

```
   1. QUAL O ATIVO?      o que se quer proteger?
        │                 ⚠ dado, sessao, dinheiro, reputacao
        ▼
   2. CONTRA QUEM?       ⚠ qual dos quatro atores?
        │
        ▼
   3. POR QUAL CAMINHO?  ⚠ a superficie concreta
        │
        ▼
   4. ⚠ O QUE O SERVIDOR FAZ?
                          ⚠ ⚠ a pergunta que decide o IMPACTO
```

⚠ **A quarta é a que distingue este curso dos dois anteriores:** ⚠ nos Cursos 1 e 2, a análise terminava no app. ⚠ Aqui, o achado **só está completo** quando se sabe **o que o servidor faz** quando o app **mente**. ⚠ E é por isso que o laboratório exige **servidor próprio**.

⚠ **A dupla de perguntas que produz achado:**

| O app... | ⚠ E o servidor? | ⚠ Achado |
|---|---|---|
| Confia em flag local | ⚠ **Reconfirma** | ⚠ Nada — design correto |
| Confia em flag local | ⚠ ⚠ **Não reconfirma** | ⚠ ⚠ **Achado real** |
| Valida no app | ⚠ **Repete a validação** | ⚠ Nada |
| Valida no app | ⚠ **Confia no app** | ⚠ ⚠ **Achado real** |

⚠ **É a tabela do módulo 4 do curso de Web Apps** — *o frontend esconde, o backend não verifica* — ⚠ na versão mobile: ⚠ **o app valida, o servidor confia**.

---

## 1.5 A ficha de ameaça

⚠ **O instrumento, e ele acompanha cada investigação:**

```
┌────────────────────────────────────────────────────────────┐
│ FICHA DE AMEACA                                            │
├────────────────────────────────────────────────────────────┤
│ ATIVO:          o que se protege                           │
│ ATOR:           dono | app malicioso | rede | servidor     │
│ SUPERFICIE:     componente | armazenamento | rede | URL    │
│ PRE-REQUISITO:  ⚠ nada | app instalado | root | rede       │
│                                                        │
│ O APP FAZ:      ...                                        │
│ ⚠ O SERVIDOR:    reconfirma | NAO reconfirma | nao se sabe  │
│                                                        │
│ ⚠ CAMINHO:       o comando, do inicio ao efeito             │
│ IMPACTO:        ⚠ medido, nao presumido                     │
│ GRAVIDADE:      pela tabela do 1.2                         │
└────────────────────────────────────────────────────────────┘
```

⚠ **A linha `O SERVIDOR` com valor `não se sabe` é resultado legítimo** — e é a mais frequente no início. ⚠ Mas ela é **provisória**: ⚠ o módulo 4 existe para transformá-la em resposta.

⚠ **E a `PRE-REQUISITO` é obrigatória desde o primeiro módulo:** ⚠ é a mesma disciplina da coluna *"como li"* do Curso 1 e do *"nível A/B"* do Curso 2 — ⚠ **o que o achado exige** determina **o que ele vale**.

---

## 1.6 O que este curso não é

⚠ **Delimitação honesta:**

| Não é | ⚠ Por quê |
|---|---|
| Repetição dos Cursos 1 e 2 | ⚠ Eles são **pré-requisito**, não alternativa |
| Curso de exploração de kernel | ⚠ Existe `Exploit Development` |
| Caça a bug em app de terceiro | ⚠ O alvo é o app do laboratório |
| Curso de ferramenta | ⚠ A ferramenta **mede**; o método é seu |
| "Como burlar anti-tampering" | ⚠ O módulo 8 avalia o que ele **consegue** |

⚠ **A quinta linha merece a explicação:** ⚠ o módulo 8 **não** ensina a contornar proteção de app alheio. ⚠ Ele ensina a **avaliar** se a proteção do **seu** app faz diferença — ⚠ e a resposta, no Curso 1 e no Curso 2, foi: **encarece, não impede**.

---

## Laboratório 1 — Construir o modelo

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

**Objetivo:** montar o **ambiente completo** — app Android, app iOS e **servidor próprio** — e produzir a **ficha de ameaça** para cada superfície. ⚠ Nenhum teste ainda.

```bash
mkdir -p ~/mobile-lab/m01 && cd ~/mobile-lab/m01

# ── 1. O SERVIDOR DO LABORATORIO — ⚠ o terceiro elemento ───
mkdir -p api && cat > api/servidor.py <<'EOF'
from flask import Flask, request, jsonify
import secrets, sqlite3, os

app = Flask(__name__)
TOKENS = {}          # token -> usuario

def db():
    c = sqlite3.connect("lab.db"); c.row_factory = sqlite3.Row
    c.executescript("""
      DROP TABLE IF EXISTS usuarios; DROP TABLE IF EXISTS pedidos;
      CREATE TABLE usuarios (id INT, nome TEXT, papel TEXT, saldo INT);
      CREATE TABLE pedidos  (id INT, dono INT, item TEXT, valor INT);
    """)
    c.executemany("INSERT INTO usuarios VALUES (?,?,?,?)",
      [(1,"ana","admin",10000),(2,"bruno","usuario",500),(3,"carla","usuario",750)])
    c.executemany("INSERT INTO pedidos VALUES (?,?,?,?)",
      [(10,2,"mouse",50),(91,1,"servidor",9000)])
    c.commit(); return c

@app.post("/login")
def login():
    u = request.form.get("usuario")
    row = db().execute("SELECT id,papel FROM usuarios WHERE nome=?", (u,)).fetchone()
    if not row: return jsonify({"erro":"nao existe"}), 401
    t = secrets.token_hex(16); TOKENS[t] = {"id":row["id"], "papel":row["papel"]}
    return jsonify({"token": t, "papel": row["papel"]})

def eu():
    t = request.headers.get("Authorization","").replace("Bearer ","")
    return TOKENS.get(t)

@app.get("/perfil")
def perfil():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    return jsonify(dict(db().execute("SELECT * FROM usuarios WHERE id=?", (e["id"],)).fetchone()))

@app.get("/pedido/<int:pid>")
def pedido(pid):
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    # ⚠ DEFEITO: nao confere a posse
    return jsonify([dict(r) for r in db().execute("SELECT * FROM pedidos WHERE id=?", (pid,))])

@app.post("/comprar")
def comprar():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    # ⚠ DEFEITO: confia no preco que o APP manda
    pid = request.form.get("produto"); preco = int(request.form.get("preco","0"))
    return jsonify({"ok":True, "cobrado": preco})

@app.post("/logout")
def logout():
    # ⚠ DEFEITO: nao invalida o token
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
EOF
python api/servidor.py &
sleep 2
curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login
```

```bash
# ── 2. O APP ANDROID (do Curso 1) ───────────────────────────
#    ⚠ o app de laboratorio do curso-android-research
adb devices
adb install -r ~/android-lab/alvo/app-release.apk 2>/dev/null || \
  echo "⚠ compile o app do laboratorio (Curso 1)"

# ── 3. O APP iOS (do Curso 2) ───────────────────────────────
#    ⚠ ou o app do laboratorio do curso-ios-research
xcrun simctl list devices booted 2>/dev/null | head -3 || \
  echo "⚠ Nivel A do Curso 2 (Mac + Xcode)"
```

```bash
# ── 4. ⚠ ENUMERE AS SUPERFICIES — sem testar ───────────────
cat <<'EOF'
══╸ Superficies a enumerar (⚠ ANTES de qualquer teste)

 ANDROID (Curso 1):
   1. componentes exportados       -> adb shell dumpsys package
   2. armazenamento                -> run-as, find
   3. URL schemes / deep links     -> AndroidManifest

 iOS (Curso 2):
   4. URL schemes                  -> Info.plist
   5. armazenamento / Keychain     -> container, Keychain
   6. entitlements                 -> codesign -d

 SERVIDOR (este curso):
   7. ⚠ endpoints do app           -> o codigo do app (strings)
   8. ⚠ o que cada endpoint assume -> leitura do servidor
   9. ⚠ o que ele NAO confere      -> o achado candidato
EOF
```

```bash
# ── 5. A FICHA DE AMEACA por superficie ────────────────────
cat > ameaca.md <<'EOF'
# Modelo de ameaca — <app>

## Ativos
| # | Ativo | Onde vive | ⚠ Impacto se vazar/alterar |
|---|-------|-----------|----------------------------|

## Superficies
| # | Superficie | Ator | ⚠ Pre-requisito | Modulo | ⚠ O servidor reconfirma? |
|---|-----------|------|-----------------|--------|--------------------------|
| 1 | | | | | |
| 2 | | | | | |

## ⚠ Priorizacao
Criterio: (⚠ pela tabela do 1.2 — quem precisa de menos, primeiro)

## ⚠ Fora de escopo (declarado)
EOF
```

**O que observar:** no passo 5, a coluna **`O servidor reconfirma?`** — e é normal começar cheia de **`não se sabe`**. ⚠ O curso inteiro existe para transformar isso em resposta — e o módulo 4 é onde a maior parte se resolve.

**Exercício 1:** complete os **ativos** e as **superfícies** do `ameaca.md` para os dois apps. ⚠ A coluna `pre-requisito` usa as cinco linhas do 1.2 — e define a **gravidade**.

**Exercício 2:** para **três** superfícies, escreva a **ficha do 1.5** completa. ⚠ Onde a coluna do servidor for "não se sabe", escreva **o que** responderia.

**Exercício 3 (o que vale):** leia o `servidor.py` e **identifique os três defeitos propositais** — sem testar nada. ⚠ Para cada um, escreva: **o que ele não confere**, e **o que o app poderia mandar** para explorar. ⚠ É o exercício que mostra por que ler o servidor é parte da análise mobile.

---

## Resumo

- ⚠ **O app é do usuário** — tudo que ele decide pode ser alterado.
- ⚠ **No mobile, o cliente inteiro é controlável** — não só a requisição.
- **Quatro atores:** dono, **app malicioso**, rede e servidor. ⚠ A **gravidade** depende de **qual**.
- ⚠ **O app malicioso no mesmo aparelho** é a fronteira específica do mobile — metade dos achados.
- ⚠ **A pergunta que decide o impacto é o que o SERVIDOR faz** quando o app mente.
- ⚠ **O servidor do laboratório é obrigatório** — sem ele, metade dos achados não é medível.
- ⚠ **A ficha de ameaça precede qualquer teste** — e a linha `pre-requisito` define o que o achado vale.
- ⚠ **"Não se sabe" é resposta provisória legítima** — o módulo 4 existe para resolvê-la.

---

## O que o próximo módulo entrega

Você tem o modelo. O módulo 2 abre **o primeiro ativo**: autenticação, sessão e identidade — onde elas vivem, o que as invalida, e o que sobrevive ao logout.
