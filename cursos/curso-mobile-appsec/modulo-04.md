# Módulo 4 — Comunicação com APIs e o Que o Servidor Confia

**Curso:** Mobile Application Security: Análise e Pesquisa de Vulnerabilidades
**Módulo:** 4 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 a 3
**Próximo:** Módulo 5 — Validação de TLS e `pinning`

---

## O que este módulo entrega

Este é **o núcleo do curso**. Ao final, você vai saber **medir o que o servidor confia no app** — e por que essa é a pergunta que decide o impacto de quase todo achado mobile. Você vai aprender a interceptar, alterar e **medir a resposta do servidor**, e vai reconhecer os cinco padrões de confiança indevida.

---

## 4.1 A pergunta central

⚠ **A afirmação que organiza o módulo, e ela resume o curso:**

> **O app é do cliente. Toda decisão de segurança que vive nele pode ser alterada.
> O achado não é "o app decide" — é "o servidor aceita".**

⚠ **E a distinção é prática, não acadêmica:**

| O app decide | ⚠ O servidor | ⚠ Veredito |
|---|---|---|
| Preço, papel, permissão | ⚠ **Reconfirma** | ✅ Correto — o app é conveniência |
| Preço, papel, permissão | ⚠ ⚠ **Aceita** | ⚠ ⚠ **Achado** |
| Valida formato | ⚠ **Repete** | ✅ Correto |
| Valida formato | ⚠ Confia | ⚠ Achado |
| ⚠ **Decide se mostra** | ⚠ **Entrega assim mesmo** | ⚠ ⚠ **Achado crítico** |

⚠ **A última linha é a mais comum em mobile, e a mais mal compreendida:** ⚠ o app esconde o botão, ⚠ e o **endpoint continua respondendo**. ⚠ É *"o frontend esconde, o backend não verifica"* — o módulo 4 do curso de Web Apps, com o app no lugar do frontend.

---

## 4.2 Interceptar: o instrumento

⚠ **A base de tudo neste módulo é ver e alterar a requisição:**

```
   APP ──► ⚠ PROXY ──► API
             │
             ├─ ⚠ VER     (o que o app manda)
             ├─ ⚠ ALTERAR (o que o servidor aceita)
             └─ ⚠ REPETIR (o que acontece se eu mandar de novo)
```

⚠ **As três operações, e cada uma responde uma pergunta diferente:**

| Operação | ⚠ Pergunta que responde |
|---|---|
| **Ver** | ⚠ Quais campos o app manda, e quais o servidor devolve |
| ⚠ **Alterar** | ⚠ ⚠ **O que o servidor reconfirma?** |
| ⚠ **Repetir** | ⚠ A operação é **idempotente**? Há rate limiting? |
| ⚠ **Remover** | ⚠ O servidor **exige** o campo? |

⚠ **A quarta é a mais produtiva e a menos usada:** ⚠ **remover** um campo e ver se o servidor reclama ⚠ diz **de quem** é a decisão. ⚠ Se o servidor aceita sem o campo, ⚠ ele **não dependia dele** — e o app é que o mandava por hábito.

```bash
# ── O PROXY — e as duas barreiras do mobile ───────────────
#    ⚠ barreira 1: o app precisa ACEITAR a CA (Curso 2, modulo 7)
#    ⚠ barreira 2: se ha PINNING, nada aparece (modulo 5)
mitmproxy -p 8080 --set confdir=~/.mitmproxy

# ANDROID — a CA, e o network security config
adb shell settings put global http_proxy 127.0.0.1:8080 2>/dev/null
#    ⚠ emulador: 10.0.2.2 ; aparelho USB: adb reverse tcp:8080 tcp:8080
adb reverse tcp:8080 tcp:8080

# iOS — o simulador usa a rede do host
#    ⚠ e a CA precisa ser CONFIADA em Settings
```

⚠ **A segunda barreira é a que o módulo 5 resolve:** ⚠ com **pinning**, o proxy **não vê nada** — e a resposta não é "o app é seguro", é ⚠ **"o pinning cobre esta conexão"**. ⚠ O que ele **não** cobre é achado.

---

## 4.3 Os cinco padrões de confiança indevida

⚠ **O catálogo do módulo, e cada um é um achado com caminho próprio:**

### Padrão 1 — Identidade no corpo

⚠ **O servidor aceita "quem eu sou" da requisição, não do token.**

```http
POST /perfil HTTP/1.1
Authorization: Bearer <token-do-bruno>
{"usuario_id": 1}          ⚠ ⚠ o servidor usa ESTE valor
```

⚠ **O teste:** ⚠ troque `usuario_id` para `1` (a ana) e veja se o servidor **obedece**. ⚠ Se obedecer, é `IDOR` — ⚠ e é a mesma classe do módulo 4 do curso de Web Apps.

### Padrão 2 — Valor de negócio no cliente

⚠ **O preço, o desconto, a quantidade — vêm do app.**

```http
POST /comprar
{"produto": "servidor", "preco": 1}     ⚠ ⚠ o cliente escolhe o preco
```

⚠ **O teste:** ⚠ mande `preco: 1` e veja o que o servidor cobra. ⚠ É o módulo 10 do curso de Web Apps (lógica de negócio) — e o servidor do laboratório **tem esse defeito de propósito**.

### Padrão 3 — Papel ou permissão na requisição

⚠ **O app manda o próprio papel — e o servidor confia.**

```http
GET /admin/usuarios HTTP/1.1
Authorization: Bearer <token-do-bruno>
X-Papel: admin                        ⚠ ⚠ header controlado pelo app
```

⚠ **O teste:** ⚠ troque para `admin` e veja se o servidor **autoriza**. ⚠ É `BFLA` — módulo 4 do curso de Web Apps.

### Padrão 4 — Validação só no app

⚠ **O app valida, e o servidor **não repete** a validação.**

```
   ⚠ O APP:      "o codigo tem 6 digitos"  -> valida antes de enviar
   ⚠ O SERVIDOR: aceita qualquer coisa
```

⚠ **O teste:** ⚠ mande um valor que o app **nunca** mandaria — ⚠ código com 1 dígito, campo vazio, valor negativo. ⚠ Se o servidor aceita, ⚠ a validação era **conveniência**, não defesa.

### Padrão 5 — Estado de autorização vindo do app

⚠ **O app informa que concluiu um passo — e o servidor acredita.**

```http
POST /finalizar-compra
{"pagamento_confirmado": true}       ⚠ ⚠ o APP afirma
```

⚠ **O teste:** ⚠ envie sem ter pago. ⚠ Se o servidor concluir, ⚠ a **confirmação de pagamento** está no cliente. ⚠ É o padrão mais grave da lista, e o mais frequente em app mal desenhado.

⚠ **O paralelo com o curso de LLM é direto:** ⚠ lá, a aplicação tratava a **saída do modelo** como confiável. ⚠ Aqui, o servidor trata a **afirmação do app** como confiável. ⚠ **A classe é a mesma:** ⚠ confiar em quem pode mentir.

---

## 4.4 O método de medição

⚠ **O instrumento, e ele tem três medidas — não uma:**

```
   PARA CADA PADRAO:

   1. BASELINE   ->  a requisicao LEGITIMA, e a resposta esperada
        │
   2. VARIANTE   ->  ⚠ UMA alteracao (e so' uma)
        │
   3. ⚠ VEREDITO  ->  o servidor RECONFIRMOU, ou ACEITOU?
        │
   ────────────────────────────────────────────────────────
   ⚠ MEDIDAS:
     - quantos campos o servidor aceita sem reclamar
     - ⚠ quantos ele VALIDA (e como recusa)
     - o que acontece ao REMOVER um campo obrigatorio
```

⚠ **O passo 2 é a disciplina do módulo 2 do curso de Web Apps:** ⚠ uma variável por vez. ⚠ Alterar duas coisas e ver o efeito **não atribui causa**.

⚠ **E a linha `como recusa` é a que qualifica o achado:** ⚠ um servidor que **recusa** com `400` está validando; ⚠ um que **aceita e ignora** o campo está **confiando** — ⚠ e a diferença muda a correção.

⚠ **O instrumento, em forma de tabela:**

| Campo | Enviado legítimo | ⚠ Alterado | ⚠ Resposta | ⚠ Veredito |
|---|---|---|---|---|
| `usuario_id` | 2 | `1` | ⚠ dado da ana | ⚠ **confia** |
| `preco` | 900 | `1` | ⚠ cobrou 1 | ⚠ **confia** |
| `X-Papel` | (ausente) | `admin` | ? | ? |
| `codigo` | `123456` | `1` | ? | ? |
| `pago` | `true` | `true` sem pagar | ? | ? |

⚠ **A tabela vazia é o estado inicial do exercício — e preenchê-la é o laboratório.** ⚠ Cada linha com `confia` é **um achado**; ⚠ cada linha com `valida` é **um comportamento correto** — e vai no relatório também.

---

## 4.5 O que a correção exige

⚠ **A estrutura da correção, e ela é sempre a mesma:**

| Padrão | ⚠ Correção |
|---|---|
| **Identidade no corpo** | ⚠ Ignorar o campo; usar o **token** |
| **Valor de negócio** | ⚠ Buscar no **banco**; o app manda **referência** |
| **Papel no header** | ⚠ Ler do **token**; nunca do cliente |
| **Validação só no app** | ⚠ **Repetir** a validação no servidor |
| ⚠ **Estado vindo do app** | ⚠ ⚠ **Verificar na fonte** — gateway, banco |

⚠ **A segunda linha merece a distinção:** ⚠ o app **pode** mandar `produto_id` e `quantidade` — ⚠ o que ele **não pode** é mandar `preco`. ⚠ O servidor consulta o preço pelo id. ⚠ É a diferença entre **referência** (aceitável) e **decisão** (não).

⚠ **E a quinta é a que mais se erra:** ⚠ `pagamento_confirmado: true` — ⚠ a correção **não** é validar o campo; ⚠ é **não aceitá-lo**. ⚠ O servidor **consulta** o gateway. ⚠ Validar a forma de uma afirmação não a torna verdadeira.

---

## 4.6 O relatório da API

⚠ **O formato, e ele tem a coluna que resume o curso:**

```
ACHADO — CONFIANCA NO APP
──────────────────────────────────────────────────────────
ENDPOINT:      metodo + rota
PADRAO:        1 identidade | 2 valor | 3 papel | 4 validacao | 5 estado
                    │
BASELINE:      a requisicao legitima, e a resposta
VARIANTE:      ⚠ a alteracao (uma so')
⚠ RESPOSTA:     o servidor reconfirmou, ou aceitou?
                    │
IMPACTO:       ⚠ medido — o que o atacante CONSEGUE
PRE-REQUISITO: ⚠ app instalado | outro app | rede | nada
CORRECAO:      ⚠ a fonte da verdade
               ⚠ o que ela NAO resolve
──────────────────────────────────────────────────────────
```

⚠ **A linha `IMPACTO` precisa ser **medida**, e a medida é concreta:** ⚠ "leu o pedido de outro usuário" é medido; ⚠ "escalada de privilégio" é rótulo. ⚠ O relatório diz **o que** se alcançou, com a evidência.

⚠ **E a `CORREÇÃO` com a sub-linha `o que não resolve`** ⚠ é a régua do módulo 11 do curso de Web Apps: ⚠ toda correção tem limite, e nomeá-lo é parte do trabalho.

---

## Laboratório 4 — Medir a confiança

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Exige o servidor do módulo 1.**

```bash
mkdir -p ~/mobile-lab/m04 && cd ~/mobile-lab/m04
curl -s -o /dev/null -w "servidor: %{http_code}\n" http://127.0.0.1:5000/ || \
  (cd ../m01 && python api/servidor.py &)
```

```bash
# ── 1. ⚠ PADRAO 1 — IDENTIDADE ────────────────────────────
T=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | \
    python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

echo "══ baseline: o MEU pedido"
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/pedido/10

echo; echo "══ ⚠ variante: o pedido da ana"
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/pedido/91
#    ⚠ retornou? = o servidor nao confere a posse
```

```bash
# ── 2. ⚠ PADRAO 2 — VALOR DE NEGOCIO ──────────────────────
echo "══ baseline: preco legitimo"
curl -s -X POST -H "Authorization: Bearer $T" \
     -d "produto=servidor&preco=9000" http://127.0.0.1:5000/comprar

echo; echo "══ ⚠ variante: preco do CLIENTE"
curl -s -X POST -H "Authorization: Bearer $T" \
     -d "produto=servidor&preco=1" http://127.0.0.1:5000/comprar
#    ⚠ cobrou 1? = o servidor nao consulta o preco
```

```bash
# ── 3. ⚠ PADRAO 3 — PAPEL ─────────────────────────────────
echo "══ baseline: sem header"
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/perfil

echo; echo "══ ⚠ variante: header de papel"
curl -s -H "Authorization: Bearer $T" -H "X-Papel: admin" \
     http://127.0.0.1:5000/perfil
#    ⚠ mudou algo? (o servidor do lab pode nao ter esse defeito)
```

```bash
# ── 4. ⚠ PADRAO 4 — VALIDACAO ─────────────────────────────
echo "══ ⚠ mande o que o APP nunca mandaria"
curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | head -c 100
echo
curl -s -X POST -d "usuario=" http://127.0.0.1:5000/login
echo
curl -s -X POST -d "usuario=bruno'--" http://127.0.0.1:5000/login
#    ⚠ o servidor validou a entrada, ou repassou?
```

```bash
# ── 5. ⚠ PADRAO 5 — ESTADO ────────────────────────────────
#    (⚠ adicione o endpoint ao servidor do lab)
cat >> ../m01/api/servidor.py <<'EOF'

@app.post("/finalizar")
def finalizar():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    # ⚠ DEFEITO: o servidor acredita no que o APP afirma
    pago = request.form.get("pagamento_confirmado") == "true"
    if pago: return jsonify({"ok": True, "compra": "concluida"})
    return jsonify({"erro": "nao pago"}), 400
EOF
# ⚠ reinicie e teste:
curl -s -X POST -H "Authorization: Bearer $T" \
     -d "pagamento_confirmado=true" http://127.0.0.1:5000/finalizar
#    ⚠ concluiu sem pagar? = o estado veio do CLIENTE
```

```bash
# ── 6. ⚠ REMOVA UM CAMPO — de quem e' a decisao? ──────────
for f in "usuario=" "usuario=bruno&extra=1" "usuario=bruno&papel=admin"; do
  printf "%-32s " "$f"
  curl -s -X POST -d "$f" http://127.0.0.1:5000/login | head -c 60
  echo
done
#    ⚠ o servidor reclamou dos campos extras? ignorou?
```

```bash
# ── 7. A TABELA DO 4.4 ────────────────────────────────────
cat > confianca.md <<'EOF'
# O que o servidor confia — <app>
| Campo | Legitimo | ⚠ Alterado | Resposta | ⚠ Veredito |
|-------|----------|-----------|----------|------------|
| usuario_id | 2 | 1 | | |
| preco | 9000 | 1 | | |
| X-Papel | (ausente) | admin | | |
| codigo | 123456 | 1 | | |
| pagamento_confirmado | false | true | | |
## ⚠ Achados — causa raiz em uma frase
## ⚠ Correcao proposta, por achado, e o que ela NAO resolve
EOF
```

**O que observar:** cada linha da tabela com **`confia`** é um achado — ⚠ e cada linha com **`valida`** também vai no relatório, porque ⚠ **mostra que o servidor faz a coisa certa em algum lugar**. ⚠ A comparação entre as duas é o que dá credibilidade ao relatório.

**Exercício 1:** preencha a tabela do 4.4 completa, com o **veredito** de cada linha. ⚠ Para cada `confia`, escreva a **causa raiz** em uma frase.

**Exercício 2:** corrija **dois** padrões no servidor — a identidade e o valor de negócio. ⚠ Rode os **dois** lados: a variante **para de funcionar**, e o uso legítimo **continua**.

**Exercício 3 (o que vale):** para o **padrão 5**, escreva a correção **completa**: ⚠ o servidor **consulta** o gateway. ⚠ Depois responda: por que **validar** o campo `pagamento_confirmado` **não** corrige nada? ⚠ É a diferença entre validar a forma de uma afirmação e verificar o fato.

---

## Resumo

- ⚠ **O app é do cliente** — toda decisão de segurança que vive nele pode ser alterada.
- ⚠ **O achado não é "o app decide" — é "o servidor aceita".**
- ⚠ **Interceptar dá três perguntas:** ver, **alterar** e **repetir** — e ⚠ **remover** é a mais esquecida.
- **Cinco padrões:** identidade, valor de negócio, papel, validação e **estado**.
- ⚠ **O padrão 5 é o mais grave** — o app **afirma**, e o servidor **acredita**.
- ⚠ **Validar a forma de uma afirmação não a torna verdadeira** — o servidor precisa **verificar o fato**.
- ⚠ **Referência é aceitável; decisão não:** o app manda `produto_id`, não `preco`.
- ⚠ **Uma variável por vez** — senão o resultado não atribui causa.
- ⚠ **A correção precisa vir com o que ela NÃO resolve** — a régua do curso de Web Apps.

---

## O que o próximo módulo entrega

Você sabe medir confiança. O módulo 5 trata do que **protege o caminho**: validação de TLS e `pinning` — o que eles cobrem, e o que passa por fora.
