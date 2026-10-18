# Módulo 11 — Análise de Código, Causa-Raiz e Correção

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 11 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 10
**Próximo:** Módulo 12 — Projeto final

---

## O que este módulo entrega

Ao final, você vai saber **fechar o ciclo**: partir de uma requisição suspeita, **rastrear até a linha**, corrigir a **causa** e provar a correção com um **teste que falha antes e passa depois**. É a competência que transforma os dez módulos anteriores em trabalho — e o que o projeto final vai cobrar inteiro.

---

## 11.1 O ciclo, em sete passos

```
   1. SINTOMA      ->  o que a resposta mostrou
        │
        ▼
   2. RASTREIO     ->  ⚠ da entrada ate o ponto vulneravel
        │
        ▼
   3. CAUSA        ->  ⚠ uma frase, e uma linha
        │
        ▼
   4. CLASSE       ->  qual das classes dos modulos 3-10
        │
        ▼
   5. CORRECAO     ->  ⚠ estrutural, nao paliativa
        │
        ▼
   6. REGRESSAO    ->  ⚠ falha antes, passa depois
        │
        ▼
   7. EFEITO       ->  ⚠ o que a correcao NAO resolveu
```

⚠ **O passo 3 é o critério de qualidade do módulo** — e o do relatório final: **se a causa não cabe em uma frase, você não entendeu o bug.** ⚠ "Falta de sanitização" não é causa. *"O parâmetro `ordem` entra em `ORDER BY` por interpolação de string, na linha 42"* é.

⚠ **O passo 7 é o que separa correção de ilusão.** Toda correção tem um limite, e **nomear o limite** é parte do trabalho — é o item 8 da nossa régua de profundidade. ⚠ Um relatório que diz "corrigido" sem dizer o que ficou de fora é um relatório incompleto.

---

## 11.2 Rastrear: da entrada ao ponto vulnerável

⚠ **O que se segue é o **fluxo do dado**, e não a estrutura do código.** A pergunta é sempre a mesma: *onde este valor entra, e por onde ele passa até ser usado?*

```
   PONTO DE ENTRADA                   PONTO VULNERAVEL
   ────────────────                   ────────────────

   request.args["ordem"]         ──►  f"ORDER BY {ordem}"
   request.get_json()["papel"]   ──►  UPDATE ... SET papel
   request.files["arquivo"]      ──►  os.path.join(BASE, nome)
   request.headers["X-Fwd-Host"] ──►  composicao de URL

   ⚠ Cada um e' um "source".
     O outro lado e' um "sink".
     ⚠ O BUG esta no CAMINHO entre os dois.
```

⚠ **Os seis **sinks** que importam, e cada um tem um módulo dono:**

| `sink` | ⚠ Módulo |
|---|---|
| Consulta SQL / query de ORM | 5 |
| Execução de comando | 5 |
| Caminho de arquivo | 5 e 7 |
| Escrita em HTML (template) | 6 |
| Requisição de saída | 7 |
| Decisão de acesso | 3, 4, 8 e 9 |

⚠ **A regra prática:** encontre o `sink`, depois **suba** o caminho até o `source`. ⚠ Subir é mais fácil que descer — e é o que garante que você achou **todos** os caminhos, e não só o primeiro.

⚠ **E a pergunta que revela a omissão:** *existe algum caminho entre este `source` e este `sink` que **não passe** pela validação?* ⚠ Em código com validação centralizada, a resposta costuma ser **sim** — porque a validação está na camada de cima, e algum consumidor chama a camada de baixo direto.

---

## 11.3 Revisão orientada por hipótese

⚠ **Ler o código inteiro não escala. O que escala é ler com uma pergunta.**

| Hipótese | ⚠ O que procurar |
|---|---|
| "A posse não é conferida em todas as rotas" | Rotas que buscam por ID |
| "A autorização está no frontend" | ⚠ O que o JS esconde, e a rota correspondente |
| "Algum campo é gravado sem allowlist" | `**kwargs`, `setattr`, `update()` com dict |
| "A ordem do fluxo não é verificada" | Estado lido e gravado em handlers diferentes |
| "A operação não é atômica" | Ler → decidir → gravar em linhas separadas |
| "A validação está em outro lugar" | ⚠ Quem chama a função interna **direto** |

⚠ **A última linha é a mais produtiva, e a mais fácil de perder.** Uma função `_buscar(id)` que **não valida** é segura **se** todo chamador valida antes — e o bug aparece no chamador que **esqueceu**. ⚠ A pergunta certa é sempre: *quem são **todos** os chamadores?*

```bash
# ⚠ Ferramenta de leitura, nao de achado — encontre os caminhos
grep -rn "request\.\(args\|form\|json\|headers\|files\)" --include="*.py" . | wc -l
grep -rn "execute\|raw\|format\|%s\|f\"\|+ " --include="*.py" . | grep -i "select\|update\|insert" | head

# E os chamadores de uma funcao suspeita
grep -rn "_buscar(" --include="*.py" .
```

⚠ **O segundo comando acha **concatenação em consulta** — o sintoma do módulo 5. ⚠ Mas note: ele acha **candidato**, não bug. É o passo 1 da relação com ferramenta (módulo 2): a ferramenta informa, **o código confirma**.

---

## 11.4 A correção estrutural

⚠ **O critério, e ele é retirado dos dez módulos anteriores:**

| Paliativa | ⚠ Estrutural |
|---|---|
| Escapar o caractere perigoso | Separar o canal (parametrizar) |
| Bloquear a string `../` | Resolver e conferir a base |
| Bloquear `127.0.0.1` | Validar o IP resolvido |
| Esconder o botão | ⚠ Conferir no servidor |
| Checar o papel no handler | ⚠ Checar no **prefixo da rota** |
| Conferir o saldo e depois debitar | ⚠ **Conferir dentro da escrita** |
| Listar o que é **proibido** | ⚠ Listar o que é **permitido** |

⚠ **O critério em uma pergunta:**

> **A correção torna a omissão IMPOSSÍVEL, ou apenas menos provável?**

⚠ **Ela é a mesma pergunta em todo o curso** — do `WHERE dono_id = ?` do módulo 4 ao `WHERE saldo >= ?` do módulo 10. ⚠ Correção estrutural é a que **não depende de alguém lembrar**.

⚠ **E a segunda pergunta, do passo 7:** *o que ela **não** resolve?*

| Correção | ⚠ O que fica de fora |
|---|---|
| Parametrizar uma consulta | Outras consultas no mesmo arquivo |
| CSP com nonce | XSS servido de `'self'` |
| Validar o destino do SSRF | Serviço que a rede ainda alcança |
| Rate limit por identidade | ⚠ Requisição **autenticada** legítima abusada |
| Corrigir a versão atual | ⚠ **A versão antiga da API** |

⚠ **A última é a do módulo 8, e é a que mais se esquece:** corrigir `v2` e deixar `v1` viva é corrigir o sintoma em uma rota.

---

## 11.5 O teste de regressão

⚠ **O instrumento que prova que a correção funciona — e que ela continue funcionando.**

```python
# tests/test_regressao.py — o padrao do curso
import pytest, requests

BASE = "http://127.0.0.1:5000"

@pytest.fixture
def sessao_bruno():
    s = requests.Session()
    s.post(f"{BASE}/login", data={"nome":"bruno"})
    return s

def test_idor_pedido_alheio(sessao_bruno):
    """⚠ FALHA no codigo antigo (200), PASSA no novo (404).
       A hipotese: pedido 91 pertence a ana."""
    r = sessao_bruno.get(f"{BASE}/api/pedidos/91")
    assert r.status_code == 404, (
        f"⚠ vazamento: {r.status_code} — o pedido de outro usuario foi devolvido")
    assert "servidor" not in r.text

def test_mass_assignment_papel(sessao_bruno):
    """⚠ FALHA no antigo, PASSA no novo — papel nao pode ser gravado."""
    sessao_bruno.put(f"{BASE}/api/usuario/2", json={"papel":"admin"})
    r = sessao_bruno.get(f"{BASE}/api/usuario/2")
    assert r.json()[0]["papel"] == "usuario"

def test_transferencia_atomica(sessao_bruno):
    """⚠ Roda em PARALELO — a corrida do modulo 10."""
    import concurrent.futures as cf
    def tenta(_):
        return requests.post(f"{BASE}/api/transferir",
                             data={"valor":100,"para":2},
                             cookies=sessao_bruno.cookies).status_code
    with cf.ThreadPoolExecutor(10) as ex:
        codigos = list(ex.map(tenta, range(10)))
    assert codigos.count(200) <= 10
    # ⚠ a assercao REAL: o saldo nao pode ficar inconsistente
    s = sessao_bruno.get(f"{BASE}/api/saldo").json()["saldo"]
    assert s >= 0
```

⚠ **Três regras do teste, e as três importam:**

⚠ **1. O teste tem de falhar no código antigo.** Um teste que passa nos dois lados não prova nada. ⚠ **Rode-o contra o código vulnerável antes** — e registre o resultado no relatório.

⚠ **2. O teste verifica o **efeito**, não a implementação.** *"O pedido alheio retorna 404"* é efeito; *"a função `checar_posse` foi chamada"* é implementação. ⚠ O segundo quebra quando você refatora, e não prova segurança.

⚠ **3. O teste da correção **negativa** importa tanto quanto o da positiva.** Não basta que o legítimo funcione — é preciso que o indevido **falhe**. ⚠ E é aí que a maioria dos consertos quebra a aplicação: bloqueia os dois.

```bash
# O ciclo do teste
pytest tests/ -v
# ⚠ antes da correcao: FALHA (o bug existe)
# ⚠ depois: PASSA
```

---

## 11.6 Log, erro e configuração

⚠ **Três assuntos que não são falha de código, e produzem achado:**

| Assunto | ⚠ A falha |
|---|---|
| **Erro detalhado ao cliente** | ⚠ Revela caminho, versão, consulta |
| **Log que não registra o evento de segurança** | ⚠ Login falho, mudança de papel, exclusão |
| **Log que registra demais** | ⚠ Senha, token, cartão no log |
| **`debug=True` em produção** | ⚠ Console interativo exposto |
| **Segredo no repositório** | ⚠ Chave, `SECRET_KEY`, credencial |
| **Mensagem de erro que **enumera**** | ⚠ Módulo 3 — usuário existe? |
| **Stack trace no JSON** | ⚠ Mapa da aplicação |

⚠ **A segunda linha é a que o relatório precisa tratar, e é a mais ignorada:** sem log do evento de segurança, **um ataque bem-sucedido não deixa rastro**. ⚠ É o `OWASP A09`, e conecta este curso ao de **Detecção e Evasão** — a pergunta de lá é *quanto custa detectar*; aqui é *o que existe para detectar*.

⚠ **E a terceira é o espelho:** logar a senha ou o token cria um segundo vazamento, dentro de casa. ⚠ Um `token_reset` em log é a conta tomada — o módulo 4 outra vez.

---

## 11.7 Ferramenta: o veredito do curso

⚠ **Recapitulando a posição, agora formalizada:**

| Etapa | ⚠ Quem faz |
|---|---|
| Enumerar rotas, parâmetros, versões | ⚠ **Ferramenta** — é volume, e ela não cansa |
| Encontrar padrão conhecido | Ferramenta |
| ⚠ **Decidir o que é achado** | ⚠ **Você** — exige contexto |
| ⚠ **Achar a causa no código** | ⚠ **Você** |
| ⚠ **Corrigir e provar** | ⚠ **Você** |

⚠ **Os três últimos não se automatizam, e a razão é a mesma em todo o curso:** exigem **contexto de negócio** e **acesso ao código**. ⚠ Um relatório sem causa, sem correção e sem teste é uma lista de alertas — e o módulo 12 pede o oposto.

⚠ **E o uso honesto da ferramenta no relatório:** diga o que ela achou, diga o que você achou que ela **não** achou, e diga o que ela reportou e você **descartou**. ⚠ A terceira é a que prova método.

---

## Laboratório 11 — O ciclo completo, em um achado

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

```bash
mkdir -p ~/web-lab/m11 && cd ~/web-lab/m11
python3 -m venv .venv && source .venv/bin/activate
pip install flask pytest requests
cp ~/web-lab/m10/app.py .            # ⚠ reaproveite o app do modulo 10
mkdir -p tests
```

```bash
# ── PASSO 1: SINTOMA ────────────────────────────────────────
python app.py &
curl -s -c u1.txt -X POST -d "uid=1" http://127.0.0.1:5000/login
curl -s -b u1.txt -X POST -d "prod=2&qtd=10&preco=1" http://127.0.0.1:5000/api/carrinho
curl -s -b u1.txt -X POST http://127.0.0.1:5000/api/comprar
# ⚠ sintoma: comprou o servidor por 10, e o estoque dele (1) ficou negativo

# ── PASSO 2: RASTREIO — do source ao sink ───────────────────
grep -n "preco" app.py
# ⚠ siga:
#    request.form.get("preco")   <- SOURCE (no carrinho)
#    INSERT INTO carrinho        <- armazena o preco do CLIENTE
#    SELECT preco_unit           <- ⚠ lido de volta na compra
#    total += qtd * pu           <- SINK (o valor cobrado)
```

```bash
# ── PASSO 3: CAUSA, em uma frase ────────────────────────────
cat > CAUSA.md <<'EOF'
O preco unitario e' gravado a partir do que o CLIENTE envia
(`/api/carrinho`) e usado como base de cobranca na compra, sem
reconferencia contra a tabela `produtos` — e o estoque nao e'
conferido no mesmo comando que o debita.
EOF

# ── PASSO 4: CLASSE ─────────────────────────────────────────
# ⚠ Grupo 1 do modulo 10 (sequencia/estado): o valor lido numa
#   etapa e' usado em outra, sem revalidacao de estado.
```

```bash
# ── PASSO 5: CORRECAO ───────────────────────────────────────
# ⚠ 1. nao guarde preco do cliente: guarde SO o produto e a qtd
# ⚠ 2. na compra, leia o preco da TABELA produtos
# ⚠ 3. confira o estoque NO MESMO comando que o debita

# ── PASSO 6: REGRESSAO ──────────────────────────────────────
cat > tests/test_m11.py <<'PY'
import requests
BASE = "http://127.0.0.1:5000"

def test_preco_nao_vem_do_cliente():
    """⚠ FALHA no antigo (total=10), PASSA no novo (total=9000/ou recusa)."""
    s = requests.Session()
    s.post(f"{BASE}/login", data={"uid":"1"})
    s.post(f"{BASE}/api/carrinho", data={"prod":"2","qtd":"1","preco":"1"})
    r = s.post(f"{BASE}/api/comprar")
    # ⚠ o total cobrado tem de bater com a TABELA, nao com o enviado
    assert r.json().get("total") == 900, f"⚠ cobrou {r.json().get('total')}"

def test_estoque_nao_fica_negativo():
    """⚠ FALHA no antigo (estoque -9), PASSA no novo."""
    import sqlite3
    s = requests.Session()
    s.post(f"{BASE}/login", data={"uid":"1"})
    s.post(f"{BASE}/api/carrinho", data={"prod":"2","qtd":"10","preco":"1"})
    s.post(f"{BASE}/api/comprar")
    c = sqlite3.connect("lab.db")
    e = c.execute("SELECT estoque FROM produtos WHERE id=2").fetchone()[0]
    assert e >= 0, f"⚠ estoque negativo: {e}"
PY
pytest tests/ -v
# ⚠ ANTES da correcao: as duas FALHAM
# ⚠ DEPOIS: as duas PASSAM
```

```
# ── PASSO 7: O QUE A CORRECAO NAO RESOLVE ───────────────────
cat >> CAUSA.md <<'EOF'

LIMITES DESTA CORRECAO:
- outras rotas que aceitem preco do cliente continuam vulneraveis
  (⚠ procure por todo uso de request.*preco*)
- a CORRIDA do modulo 10 (duas compras em paralelo) e' outro bug,
  e exige a condicao DENTRO do UPDATE
- nao resolve o cupom sem limite de uso, que e' o grupo 2
EOF
```

**O que observar:** no passo 6, os **dois** testes falham antes e passam depois. ⚠ Se um deles passar **antes**, ele não está testando o bug — e é preciso reescrevê-lo. E no passo 7, o limite nomeado é a diferença entre um relatório honesto e um "corrigido" que engana.

**Exercício 1:** faça o ciclo dos **sete passos** para **um** achado de outro módulo (o IDOR do 4, o SSRF do 7, ou a corrida do 10). ⚠ O passo 3 precisa caber em **uma frase**, com **a linha**.

**Exercício 2:** escreva **três** testes de regressão para esse achado, sendo **um** deles o da **correção negativa** (o indevido tem de falhar). ⚠ Rode contra o código vulnerável e registre a saída.

**Exercício 3 (o que vale):** escolha um achado, corrija, e escreva o **limite da correção** com pelo menos **duas** entradas no formato do passo 7. ⚠ Depois releia e verifique: alguma das entradas é, na verdade, **outro achado** a ser reportado separadamente? Essa distinção é o que o módulo 12 cobra.

---

## Resumo

- ⚠ **O ciclo tem sete passos**, e o **3** é o critério: *se a causa não cabe em uma frase, você não entendeu o bug.*
- ⚠ **Rastreie do `sink` para o `source`** (subir é mais fácil) e confira **todos** os caminhos.
- ⚠ **A pergunta que revela a omissão:** existe caminho do `source` ao `sink` que não passe pela validação?
- **Revisão orientada por hipótese** escala; leitura linear, não.
- ⚠ **O critério da correção estrutural:** ela torna a omissão **impossível** ou só menos provável?
- ⚠ **Toda correção tem limite** — nomeá-lo é parte do trabalho, e é o que separa relatório de "corrigido".
- ⚠ **O teste tem de falhar no código antigo**, verificar o **efeito** (não a implementação), e cobrir a **correção negativa**.
- ⚠ **Erro detalhado e log são achados** — e o log que registra token cria um segundo vazamento.
- ⚠ **Ferramenta enumera; decidir, achar a causa, corrigir e provar** são seus.

---

## O que o próximo módulo entrega

Você tem o ciclo. O módulo 12 fecha o curso com **uma aplicação maior, com defeitos não anunciados** — e a entrega é o relatório: causa-raiz, impacto demonstrado, prova de conceito controlada, correção e regressão.
