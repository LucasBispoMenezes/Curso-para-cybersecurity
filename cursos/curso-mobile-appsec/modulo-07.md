# Módulo 7 — Validação de Entrada e Lógica de Negócio

**Curso:** Mobile Application Security: Análise e Pesquisa de Vulnerabilidades
**Módulo:** 7 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 a 6
**Próximo:** Módulo 8 — Anti-tampering e integridade

---

## O que este módulo entrega

Ao final, você vai saber encontrar as falhas que **sobrevivem no servidor** — não porque o app é frágil, mas porque **a regra está no lugar errado**. É o módulo que aplica o módulo 5 e o módulo 10 do curso de Web Apps ao mobile, onde a assimetria é maior: **o app valida muito, e o servidor confia**.

---

## 7.1 A assimetria

⚠ **A observação que organiza o módulo:**

> **O app valida mais que o servidor. Ele valida por UX — para não mandar dado ruim e
> dar erro bonito na tela. E o servidor confunde isso com defesa.**

⚠ **A consequência é estrutural, e vale escrever:**

| Onde a validação está | ⚠ O que ela alcança |
|---|---|
| ⚠ **No app** | ⚠ O usuário **legítimo** — que não digita errado |
| ⚠ **No servidor** | ⚠ ⚠ **Qualquer requisição** — inclusive a forjada |

⚠ **É a mesma frase do módulo 4 do curso de Web Apps**, com uma diferença de grau: ⚠ no mobile, o app **valida mais** — porque a UX exige. ⚠ E essa validação abundante **esconde** a ausência no servidor.

⚠ **A frase para o relatório:** ⚠ *"o app valida; isso **não** é defesa — é conveniência"*.

---

## 7.2 As classes que sobrevivem

⚠ **Seis classes, e cada uma tem um teste próprio:**

| # | Classe | ⚠ Onde mora |
|---|---|---|
| 1 | ⚠ **Validação só no app** | ⚠ Formato, faixa, campo obrigatório |
| 2 | ⚠ **Valor de negócio do cliente** | ⚠ Preço, desconto, quantidade |
| 3 | ⚠ **Ordem de etapas** | ⚠ Pular, repetir, refazer |
| 4 | ⚠ **Limite e quantidade** | ⚠ Negativo, acima do estoque, somar |
| 5 | ⚠ **Concorrência** | ⚠ A mesma operação em paralelo |
| 6 | ⚠ **Estado afirmado pelo app** | ⚠ "já paguei", "já validei" |

⚠ **As classes 1 e 2 já foram tratadas no módulo 4** — aqui elas se aprofundam. ⚠ E as classes 3 a 6 são **as mesmas do módulo 10 do curso de Web Apps**, com uma diferença: ⚠ **no mobile, a corrida é mais fácil** — ⚠ porque o app já faz requisições em paralelo naturalmente ⚠ e porque o `HTTP/2` do cliente **reenvia** automaticamente.

⚠ **E há uma classe que o mobile acrescenta, e ela é a mais interessante:**

| # | Classe | ⚠ Mecanismo |
|---|---|---|
| 7 | ⚠ ⚠ **Divergência de regra** | ⚠ O app e o servidor **calculam diferente** |

⚠ **A sétima merece a explicação:** ⚠ o app tem uma cópia da regra de negócio — ⚠ arredondamento, taxa, regra de desconto. ⚠ Quando as duas versões **divergem**, ⚠ a diferença é explorável ⚠ **e nenhum dos dois está "errado" isoladamente**.

---

## 7.3 Ordem de etapas

⚠ **A classe 3, e ela é a mesma do módulo 10 do curso de Web Apps:**

```
   FLUXO PREVISTO                    ⚠ O QUE O SERVIDOR ACEITA
   ──────────────                    ──────────────────────────

   1. carrinho                       1. carrinho
   2. ⚠ validar estoque               2. ⚠ PULAR — chamar a finalizacao direto
   3. pagar                           3. pagar -> vende o que nao tem
   4. confirmar                       4. confirmar
```

⚠ **O teste, e ele é direto:** ⚠ chame **a etapa final** sem passar pelas anteriores. ⚠ Se o servidor a aceita, ⚠ ele **confia no app** para manter a ordem — ⚠ e o app pode ser alterado.

⚠ **E a variante mobile-específica é a **repetição**: ⚠ o app impede aplicar o mesmo cupom duas vezes — ⚠ na **tela**. ⚠ E o servidor?

```bash
# ── ⚠ PULAR ETAPA ─────────────────────────────────────────
#    ⚠ chame a etapa final SEM a anterior
T=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | \
    python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

echo "══ o fluxo completo seria: carrinho -> comprar"
echo "══ ⚠ e se eu chamar SO' a compra?"
curl -s -X POST -H "Authorization: Bearer $T" \
     -d "produto=servidor&preco=1" http://127.0.0.1:5000/comprar
#    ⚠ concluiu sem carrinho? = a ordem nao e' verificada
```

```bash
# ── ⚠ REPETIR ETAPA ───────────────────────────────────────
for i in 1 2 3; do
  curl -s -X POST -H "Authorization: Bearer $T" \
       -d "produto=mouse&preco=50&cupom=LAB10" http://127.0.0.1:5000/comprar
  echo
done
#    ⚠ o desconto foi aplicado 3 vezes?
```

---

## 7.4 Limites e concorrência

⚠ **A classe 4, e a tabela de valores que se testa:**

| Campo | ⚠ O que se testa |
|---|---|
| Valor monetário | ⚠ Negativo, zero, enorme, fracionário |
| Quantidade | ⚠ Zero, negativo, acima do estoque |
| Percentual | ⚠ Acima de 100 |
| ⚠ **Soma de itens** | ⚠ ⚠ Linha negativa compensando |
| Data | Passado, futuro, formato ambíguo |

⚠ **A quinta linha é a mesma do módulo 10 do curso de Web Apps:** ⚠ cada linha do carrinho é válida, ⚠ e **a soma não é**.

⚠ **E a classe 5 é a que o mobile facilita, e vale explicar:**

```
   ⚠ O APP JA' FAZ REQUISICOES EM PARALELO
      - sincronizacao, telemetria, upload
      - e o usuario pode tocar duas vezes

   ⚠ E o HTTP/2 REENVIA automaticamente
      - em erro de rede, a requisicao sai DE NOVO

   ⚠ Resultado: a operacao nao-atomica
      dispara DUAS VEZES sem atacante nenhum
```

⚠ **A segunda linha é a observação mais útil do módulo:** ⚠ **o `HTTP/2` reenvia requisições** em falha — ⚠ então uma operação **não idempotente** pode executar **duas vezes** por acidente. ⚠ Isso significa que o achado **não precisa** de atacante: ⚠ é **bug** que aparece em produção.

⚠ **O teste, e ele é o do módulo 10 do curso de Web Apps:**

```bash
# ── ⚠ A MESMA REQUISICAO EM PARALELO ──────────────────────
T=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | \
    python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

seq 1 10 | xargs -P 10 -I{} curl -s -X POST -H "Authorization: Bearer $T" \
  -d "produto=mouse&preco=50" http://127.0.0.1:5000/comprar -o /dev/null

# ⚠ depois, verifique o estado: quantas passaram?
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/perfil
```

⚠ **A correção é a mesma:** ⚠ **condição dentro da escrita** — `UPDATE ... WHERE saldo >= ?` —, ⚠ ou **chave de idempotência**. ⚠ E no mobile há uma terceira, que o curso de Web Apps não tinha: ⚠ **o cliente manda um `Idempotency-Key`** ⚠ e o servidor **deduplica**.

---

## 7.5 Divergência de regra

⚠ **A classe que o mobile acrescenta, e a mais interessante do módulo:**

```
   ⚠ O APP CALCULA                ⚠ O SERVIDOR CALCULA
   ─────────────                  ────────────────────

   desconto = 10%                   desconto = 10%
   ⚠ arredonda para BAIXO            ⚠ arredonda para CIMA

   ⚠ o usuario ve 1 valor             o servidor cobra OUTRO

   ⚠ Se o app ENVIA o valor que calculou,
     a divergencia e' exploravel — ⚠ e nenhum dos dois esta "errado".
```

⚠ **A exploração, e ela é sutil:** ⚠ o app calcula o **preço final** (com desconto, taxa, arredondamento) e **envia pronto**. ⚠ O servidor **aceita**. ⚠ ⚠ O atacante **calcula com outra regra** — ⚠ e a diferença é o lucro.

⚠ **A investigação tem três passos:**

| Passo | ⚠ O que se faz |
|---|---|
| 1 | ⚠ Localizar a **regra** no app (desconto, taxa, arredondamento) |
| 2 | ⚠ Alterar o valor **calculado** e enviar |
| 3 | ⚠ ⚠ Ver se o servidor **recalcula**, ou **aceita** |

⚠ **A segunda classe de achado é a mais valiosa, e vale nomeá-la:** ⚠ se o app **calcula e envia**, ⚠ o servidor **não tem** como conferir sem recalcular. ⚠ A correção é sempre: ⚠ **o servidor calcula; o cliente manda só a intenção** (`produto_id`, `quantidade`, `cupom`).

⚠ **E o detalhe que torna o achado frequente:** ⚠ a regra é **duplicada** — ⚠ uma vez no app (para mostrar), ⚠ uma vez no servidor (para cobrar). ⚠ E as duas **divergem** com o tempo. ⚠ É a mesma lição do módulo 9 do curso de Web Apps, sobre contrato: ⚠ **duas versões da mesma verdade divergem**.

---

## 7.6 O instrumento

⚠ **A tabela do módulo, e ela cobre as sete classes:**

| # | Classe | ⚠ Teste | ⚠ Veredito |
|---|---|---|---|
| 1 | Validação só no app | ⚠ Enviar o que o app nunca enviaria | ⚠ Servidor recusou? |
| 2 | Valor do cliente | ⚠ Alterar preço/desconto | ⚠ Recalculou? |
| 3 | Ordem de etapas | ⚠ Chamar a etapa final direto | ⚠ Exige o estado anterior? |
| 4 | Limite | ⚠ Negativo, acima, fracionário | ⚠ Valida a faixa? |
| 5 | ⚠ Concorrência | ⚠ N requisições em paralelo | ⚠ Quantas passaram? |
| 6 | Estado afirmado | ⚠ Enviar "já paguei" | ⚠ Verifica na fonte? |
| 7 | ⚠ **Divergência de regra** | ⚠ Recalcular com outra regra | ⚠ Recalcula no servidor? |

⚠ **A linha 5 tem um número, não um veredito:** ⚠ **quantas passaram**. ⚠ É a taxa do módulo 5 do curso de Linux Internals aplicada a lógica de negócio: ⚠ **10 em 10** não é o mesmo achado que **2 em 10**.

⚠ **E a coluna `Veredito` tem três valores, não dois:** ⚠ `recusa`, `aceita` e ⚠ **`aceita-e-ignora`**. ⚠ O terceiro é o mais traiçoeiro: ⚠ o servidor **não recusa** o campo estranho, ⚠ e também **não o usa** — ⚠ o que significa que ele **ignora em silêncio**, e o achado pode estar em outro lugar.

---

## 7.7 O relatório da lógica

⚠ **O formato:**

```
ACHADO — LOGICA DE NEGOCIO
──────────────────────────────────────────────────────────
CLASSE:        1 a 7
ENDPOINT:      metodo + rota
                    │
BASELINE:      o fluxo previsto, e o resultado
⚠ VARIANTE:     a alteracao (uma so')
⚠ VEREDITO:     recusa | aceita | aceita-e-ignora
                    │
⚠ IMPACTO MEDIDO: o que se obteve (valor, quantidade, acesso)
PRE-REQUISITO: ⚠ app instalado | sessao propria | nada
                    │
CAUSA RAIZ:    ⚠ UMA FRASE — onde a regra deveria estar
CORRECAO:      ⚠ o servidor calcula / a condicao entra na escrita
               ⚠ o que ela NAO resolve
──────────────────────────────────────────────────────────
```

⚠ **A linha `IMPACTO MEDIDO` precisa ser **um número**: ⚠ "comprou por 1 em vez de 9000"; ⚠ "aplicou o cupom 3 vezes"; ⚠ "4 de 10 transferências passaram". ⚠ Sem o número, o achado não é priorizável.

⚠ **E a `CAUSA RAIZ` precisa dizer **onde a regra deveria estar** — não "falta validação". ⚠ O formato que o curso cobra: ⚠ *"a decisão de preço está no cliente; o servidor deveria consultar a tabela `produtos` na linha X"*.

---

## Laboratório 7 — Quebrar a lógica

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Exige o servidor do módulo 1.**

```bash
mkdir -p ~/mobile-lab/m07 && cd ~/mobile-lab/m07
curl -s -o /dev/null -w "servidor: %{http_code}\n" http://127.0.0.1:5000/ || \
  (cd ../m01 && python api/servidor.py &)

T=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | \
    python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
echo "T=$T"
```

```bash
# ── 1. CLASSE 4 — LIMITES ─────────────────────────────────
for v in -100 0 1 999999 3.7; do
  printf "preco=%-8s " "$v"
  curl -s -X POST -H "Authorization: Bearer $T" \
       -d "produto=mouse&preco=$v" http://127.0.0.1:5000/comprar | head -c 80
  echo
done
```

```bash
# ── 2. CLASSE 3 — ORDEM ───────────────────────────────────
echo "══ ⚠ a etapa final, sem a anterior"
curl -s -X POST -H "Authorization: Bearer $T" \
     -d "produto=servidor&preco=1" http://127.0.0.1:5000/comprar
```

```bash
# ── 3. CLASSE 6 — ESTADO AFIRMADO ─────────────────────────
echo "══ ⚠ sem ter pago"
curl -s -X POST -H "Authorization: Bearer $T" \
     -d "pagamento_confirmado=true" http://127.0.0.1:5000/finalizar
echo
echo "══ ⚠ e se eu omitir?"
curl -s -X POST -H "Authorization: Bearer $T" \
     -d "" http://127.0.0.1:5000/finalizar
```

```bash
# ── 4. ⚠ CLASSE 5 — CONCORRENCIA (com numero) ─────────────
#    ⚠ o servidor do lab nao tem saldo — adicione
cat >> ../m01/api/servidor.py <<'EOF'

SALDOS = {2: 500}
@app.post("/transferir")
def transferir():
    e = eu()
    if not e: return jsonify({"erro":"sem sessao"}), 401
    v = int(request.form.get("valor","0"))
    # ⚠ DEFEITO: read-modify-write sem atomicidade
    saldo = SALDOS.get(e["id"], 0)
    if saldo < v: return jsonify({"erro":"saldo"}), 400
    import time; time.sleep(0.03)      # ⚠ aumento a janela
    SALDOS[e["id"]] = saldo - v
    return jsonify({"ok": True, "saldo": SALDOS[e["id"]]})
EOF
# ⚠ reinicie o servidor, e entao:
echo "══ 10 requisicoes de 100, saldo inicial 500"
seq 1 10 | xargs -P 10 -I{} curl -s -X POST -H "Authorization: Bearer $T" \
  -d "valor=100" http://127.0.0.1:5000/transferir -o /dev/null
curl -s -X POST -H "Authorization: Bearer $T" -d "valor=0" \
     http://127.0.0.1:5000/transferir
#    ⚠ quantas passaram? o saldo ficou NEGATIVO?
```

```bash
# ── 5. ⚠ CLASSE 7 — DIVERGENCIA DE REGRA ──────────────────
#    ⚠ localize no app como o desconto e' calculado
grep -rniE 'desconto|discount|arredond|round|taxa|juros' \
  ../m05/app_jadx/sources/ 2>/dev/null | head -10

#    ⚠ e envie um valor CALCULADO por outra regra
curl -s -X POST -H "Authorization: Bearer $T" \
     -d "produto=mouse&preco=44.9" http://127.0.0.1:5000/comprar
#    ⚠ aceitou? o servidor RECALCULA, ou confia?
```

```bash
# ── 6. ⚠ CLASSE 1 — VALIDACAO ─────────────────────────────
for p in "usuario=" "usuario=bruno'--" "usuario=$(python3 -c 'print("A"*5000)')"; do
  printf "%-20s " "${p:0:18}"
  curl -s -X POST -d "$p" http://127.0.0.1:5000/login | head -c 60
  echo
done
```

```bash
# ── 7. A TABELA ───────────────────────────────────────────
cat > logica.md <<'EOF'
# Logica de negocio — <app>
| # | Classe | Teste | ⚠ Veredito | ⚠ Impacto MEDIDO |
|---|--------|-------|------------|------------------|
## ⚠ Concorrencia: quantas de quantas passaram
## Causa raiz por achado (uma frase, com o lugar certo da regra)
## Correcao proposta — e o que ela NAO resolve
EOF
```

**O que observar:** no passo 4, **quantas das 10 passaram** — e se o saldo ficou **negativo**. ⚠ É a medida do módulo 5 do curso de Linux Internals aplicada a lógica: ⚠ a taxa é o achado, não a existência. ⚠ E no passo 5, a divergência de regra: ⚠ o servidor **recalcula** ou **aceita**?

**Exercício 1:** complete a tabela do 7.6 com as sete classes. ⚠ A coluna `impacto medido` precisa de **número** — e a classe 5 precisa da **taxa**.

**Exercício 2:** corrija a **classe 5** com **condição dentro da escrita** (`UPDATE ... WHERE saldo >= ?`). ⚠ Rode os 10 em paralelo de novo e mostre que **nenhuma** passa além do saldo.

**Exercício 3 (o que vale):** corrija a **classe 6** (estado afirmado) e a **classe 7** (divergência). ⚠ Para a 6, o servidor **consulta o gateway**; ⚠ para a 7, o servidor **recalcula**. ⚠ Escreva, em duas linhas, por que **validar** o campo enviado **não** corrige nenhuma das duas.

---

## Resumo

- ⚠ **O app valida mais que o servidor** — e isso **esconde** a ausência de defesa.
- ⚠ **Validação no app é conveniência, não defesa** — alcança o usuário legítimo, não a requisição forjada.
- **Sete classes**, e as quatro últimas são as do módulo 10 do curso de Web Apps.
- ⚠ **No mobile, a corrida é mais fácil** — o app já paraleliza, e o `HTTP/2` **reenvia**.
- ⚠ **A concorrência tem TAXA, não veredito** — quantas passaram de quantas.
- ⚠ **A divergência de regra é a classe que o mobile acrescenta** — e nenhum dos dois lados está "errado".
- ⚠ **Se o app calcula e envia, o servidor não confere sem recalcular** — a correção é o servidor calcular.
- ⚠ **`aceita-e-ignora` é o veredito mais traiçoeiro** — o servidor não recusa, e não usa.
- ⚠ **Toda correção precisa vir com o que ela não resolve.**

---

## O que o próximo módulo entrega

Você sabe quebrar a lógica. O módulo 8 avalia **a defesa**: anti-tampering e integridade — o que eles tentam impedir, e o que conseguem.
