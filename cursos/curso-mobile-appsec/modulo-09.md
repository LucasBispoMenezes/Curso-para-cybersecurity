# Módulo 9 — Instrumentação Aplicada à Investigação

**Curso:** Mobile Application Security: Análise e Pesquisa de Vulnerabilidades
**Módulo:** 9 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 8
**Próximo:** Módulo 10 — Reprodução e causa-raiz

---

## O que este módulo entrega

Ao final, você vai saber **usar a instrumentação para medir**, não para demonstrar. É o módulo em que `Frida`, `lldb` e os hooks dos Cursos 1 e 2 deixam de ser a ferramenta principal e passam a ser **o instrumento de medição** — e onde você aprende a declarar **o que o hook prova e o que ele não prova**.

---

## 9.1 O deslocamento

⚠ **A mudança de papel da instrumentação, e ela é o módulo inteiro:**

| Cursos 1 e 2 | ⚠ Este curso |
|---|---|
| ⚠ **Instrumentar para ENTENDER** | ⚠ ⚠ **Instrumentar para MEDIR** |
| ⚠ "o dado chega aqui" | ⚠ ⚠ **"e sem o hook, um terceiro alcança?"** |
| ⚠ O hook é o resultado | ⚠ ⚠ **O hook é o controle** |

⚠ **A frase que organiza o módulo:**

> **O hook prova que o código PODE ser desviado. Ele não prova que um atacante pode.
> Quem prova o segundo é o caminho de fora.**

⚠ **E a razão é a do módulo 8 do Curso 1 e do módulo 8 do Curso 2, agora generalizada:** ⚠ quem usa o hook **já está dentro do processo** — ⚠ com `root`, `jailbreak` ou app depurável. ⚠ Outro atacante pode **não ter** esse acesso.

⚠ **A tabela que o relatório precisa, e ela é a régua do módulo:**

| O que o hook prova | ⚠ O que ele **não** prova |
|---|---|
| ⚠ **O dado chega naquele formato** | ⚠ Que a **rede** permite enviá-lo |
| ⚠ **A validação está naquele ponto** | ⚠ Que **outro app** alcança o ponto |
| ⚠ **Forçar muda o comportamento** | ⚠ Que existe **falha explorável** |
| ⚠ **O servidor aceitou** | ⚠ ⚠ **Por que ele aceitou** |

---

## 9.2 Os quatro usos legítimos

⚠ **Onde a instrumentação **serve** neste curso:**

| Uso | ⚠ Por quê |
|---|---|
| ⚠ **Observar o valor que chega** | ⚠ Confirma a hipótese do módulo 6 do Curso 1 |
| ⚠ **Ver a requisição montada** | ⚠ O que o app **manda**, e com que credencial |
| ⚠ **Bloquear uma validação local** | ⚠ ⚠ **Para medir o que ela impedia** |
| ⚠ **Medir o tempo e a ordem** | ⚠ Corrida e concorrência (módulo 7) |

⚠ **A terceira é a que o módulo cobra:** ⚠ bloquear uma validação local **não é o ataque** — ⚠ é o **controle experimental**. ⚠ Você desliga a validação do app **para ver o que o servidor faz** sem ela. ⚠ Se o servidor recusa, ⚠ **a defesa está lá**; ⚠ se aceita, ⚠ **o achado está no servidor**.

⚠ **É a mesma estrutura do módulo 8 do curso de LLM:** ⚠ a taxa **com controle** e **sem controle** — ⚠ e a diferença é o achado.

```javascript
// ⚠ O CONTROLE — desligar a validacao do app PARA MEDIR
Java.perform(function () {
    // ⚠ nao e' o ataque: e' o experimento
    var V = Java.use("com.exemplo.app.Validador");
    V.validar.implementation = function (x) {
        console.log("[controle] validar(" + x + ") -> forcando TRUE");
        return true;
    };
});
// ⚠ DEPOIS: a requisicao saiu? o servidor ACEITOU?
//    ⚠ SE SIM -> o servidor nao valida. O achado esta' la'.
//    ⚠ SE NAO -> o servidor valida. A defesa esta' la'.
```

⚠ **A linha do comentário é o que separa este uso do abuso:** ⚠ o hook **não** é para "fazer o app aceitar" — ⚠ é para **descobrir de quem é a decisão**.

---

## 9.3 Medir o que o app manda

⚠ **A instrumentação mais útil do curso, e ela responde a pergunta do módulo 4:**

```javascript
// ⚠ VER A REQUISICAO que o app monta — antes de sair
if (ObjC.available) {
    var R = ObjC.classes.NSMutableURLRequest;
    if (R) {
        Interceptor.attach(R["- setHTTPBody:"].implementation, {
            onEnter: function (a) {
                var b = new ObjC.Object(a[2]);
                console.log("[body] " + b.toString());
            }
        });
        Interceptor.attach(R["- setValue:forHTTPHeaderField:"].implementation, {
            onEnter: function (a) {
                console.log("[header] " + new ObjC.Object(a[2]).toString()
                            + " = " + new ObjC.Object(a[3]).toString());
            }
        });
    }
}
```

⚠ **O que isso dá, e é diferente do proxy:** ⚠ o proxy mostra o que **sai**; ⚠ o hook mostra o que o app **montou** — ⚠ **antes** de qualquer coisa. ⚠ A diferença importa quando há **pinning** (o proxy não vê) ou quando a requisição **falha** antes de sair.

⚠ **E a segunda utilidade é a que o módulo persegue:** ⚠ ver **com qual credencial** a requisição sai. ⚠ Ela carrega o token **da vítima**? ⚠ Ou o app manda uma identidade **do corpo** (o padrão 1 do módulo 4)?

| O que se observa | ⚠ O achado |
|---|---|
| ⚠ **O token vai no header** | ✅ Correto |
| ⚠ **A identidade vai no corpo** | ⚠ ⚠ Padrão 1 |
| ⚠ **O papel vai em header próprio** | ⚠ ⚠ Padrão 3 |
| ⚠ **Uma chave fixa vai junto** | ⚠ ⚠ Segredo embutido (módulo 3) |

⚠ **A quarta linha é a que aparece e surpreende:** ⚠ a requisição traz uma **chave de API fixa** — ⚠ igual para todos os usuários. ⚠ É o segredo do módulo 3 na forma ativa, ⚠ e ela só é visível **vendo a requisição**.

---

## 9.4 Medir concorrência

⚠ **A instrumentação que o proxy não consegue, e ela é a do módulo 7:**

```javascript
// ⚠ MEDIR a corrida — quantas realmente executam em paralelo
Java.perform(function () {
    var C = Java.use("com.exemplo.app.api.Compra");
    var n = 0;
    C.enviar.implementation = function (dados) {
        n++;
        var meu = n;
        console.log("[req " + meu + "] iniciou em " + Date.now());
        var r = this.enviar(dados);
        console.log("[req " + meu + "] terminou em " + Date.now());
        return r;
    };
});
```

⚠ **O que se mede, e por que o hook ajuda:** ⚠ o proxy mostra as requisições **como chegaram ao servidor**. ⚠ O hook mostra **como o app as disparou** — ⚠ e a **sobreposição** é o que importa. ⚠ Duas requisições que **coincidem no tempo** são a corrida.

⚠ **E a medição da transferência (módulo 7) usa o mesmo instrumento:**

```bash
# ⚠ a contagem e' o achado: quantas passaram de quantas
echo "10 requisicoes, saldo inicial 500, valor 100"
seq 1 10 | xargs -P 10 -I{} curl -s -X POST \
  -H "Authorization: Bearer $T" -d "valor=100" \
  http://127.0.0.1:5000/transferir -o /dev/null
#    ⚠ 5 deveriam passar. Quantas passaram?
#    ⚠ E o saldo ficou negativo?
```

⚠ **A escolha do instrumento importa, e vale dizer:** ⚠ para corrida no **servidor**, `curl` em paralelo basta — ⚠ e é **mais honesto**, porque vem de fora. ⚠ O hook serve quando o problema é **como o app dispara**.

---

## 9.5 O que registrar, e por que

⚠ **O registro da instrumentação, e ele tem uma linha que os Cursos 1 e 2 não tinham:**

| Item | ⚠ Por quê |
|---|---|
| ⚠ **O script** | Reproduzível |
| ⚠ **Classe e seletor / função** | Onde o hook foi posto |
| ⚠ **O valor observado** | **A evidência** |
| ⚠ **Se foi CONTROLE ou observação** | ⚠ ⚠ **Muda o que o achado vale** |
| ⚠ **O que se fez depois** | A requisição saiu? o servidor respondeu? |
| ⚠ **Saída bruta** | Não o resumo |

⚠ **A quarta linha é a do módulo:** ⚠ um hook de **observação** não altera nada, e o achado vale como está. ⚠ Um hook de **controle** altera o comportamento — ⚠ e o achado **precisa dizer** que a validação foi desligada **para medir**.

⚠ **E a quinta é o que fecha o ciclo com o módulo 4:** ⚠ o valor observado **não é** o achado. ⚠ O achado é ⚠ **o que o servidor respondeu** depois. ⚠ É a mesma disciplina do módulo 8 do curso de LLM: ⚠ o hook dá o dado; ⚠ a taxa é o resultado.

⚠ **O formato do registro:**

```
REGISTRO DE INSTRUMENTACAO — <achado>
──────────────────────────────────────────────────────────
SCRIPT:      <caminho ou colagem>
HOOK:        <classe/seletor | funcao/endereco>
TIPO:        ⚠ observacao | CONTROLE (alterou o comportamento)
                    │
OBSERVADO:   o valor bruto
FEITO DEPOIS: a requisicao disparada
RESPOSTA:    ⚠ o que o SERVIDOR devolveu
                    │
NIVEL:       ⚠ app depuravel | root | jailbreak
──────────────────────────────────────────────────────────
```

---

## 9.6 O limite, escrito com clareza

⚠ **Delimitação do módulo, e ela é a do curso inteiro:**

| Este curso | ⚠ O que **não** está aqui |
|---|---|
| Instrumentar **o próprio** app | ⚠ Instrumentar app de terceiro |
| Neutralizar validação **para medir** | ⚠ Neutralizar para **usar** |
| Medir a corrida | ⚠ Escrever o exploit da corrida |
| Registrar o nível | ⚠ Esconder o nível |

⚠ **A frase para o relatório:** ⚠ *"obtive o valor com `Frida`, em aparelho com `jailbreak`, **para confirmar** que o app monta a requisição com a identidade no corpo; a exploração não depende disso"*. ⚠ Essa forma é honesta: ⚠ diz o que foi feito, ⚠ **e diz por que o achado não depende do instrumento**.

⚠ **E há um achado que **depende** do instrumento, e o relatório precisa admitir:** ⚠ se a única forma de observar o comportamento é com `root`, ⚠ então o achado **exige `root`** — ⚠ e é **condicionado**. ⚠ É a coluna *"como li"* do Curso 1 e do Curso 2, na terceira forma.

---

## Laboratório 9 — Instrumentar para medir

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Exige o servidor do módulo 1.**

```bash
mkdir -p ~/mobile-lab/m09 && cd ~/mobile-lab/m09
curl -s -o /dev/null -w "servidor: %{http_code}\n" http://127.0.0.1:5000/ || \
  (cd ../m01 && python api/servidor.py &)
```

```javascript
// ver_requisicao.js — ⚠ OBSERVACAO (nao altera nada)
if (ObjC.available) {
    console.log("[*] observando requisicoes (iOS)");
    var U = ObjC.classes.NSMutableURLRequest;
    if (U) {
        Interceptor.attach(U["- setHTTPBody:"].implementation, {
            onEnter: function (a) {
                console.log("[body] " + new ObjC.Object(a[2]).toString());
            }
        });
        if (U["- setValue:forHTTPHeaderField:"]) {
            Interceptor.attach(U["- setValue:forHTTPHeaderField:"].implementation, {
                onEnter: function (a) {
                    console.log("[header] " + new ObjC.Object(a[2]).toString()
                                + ": " + new ObjC.Object(a[3]).toString());
                }
            });
        }
    }
}
```

```javascript
// controle_validacao.js — ⚠ CONTROLE (altera, e REGISTRA que alterou)
console.log("⚠ CONTROLE: desligando a validacao local PARA MEDIR");
if (ObjC.available) {
    try {
        var V = ObjC.classes.MeuValidador;
        if (V && V["- validar:"]) {
            V["- validar:"].implementation = ObjC.implement(V["- validar:"], function () {
                // ⚠ forcando o caminho "valido"
                return true;
            });
            console.log("[controle] validar: -> true");
        }
    } catch (e) { console.log("[!] " + e); }
}
// ⚠ DEPOIS: a requisicao saiu? o SERVIDOR aceitou?
```

```bash
# ── 1. OBSERVACAO — o que o app MONTA ─────────────────────
# frida -U -f com.exemplo.app -l ver_requisicao.js --no-pause
# ⚠ provoque uma requisicao pelo app e leia:
#    [header] Authorization: Bearer ...
#    [body] {"usuario_id":2,...}   ⚠ ⚠ identidade no CORPO
```

```bash
# ── 2. ⚠ CONTROLE — desligar e ver quem decide ────────────
# frida -U -f com.exemplo.app -l controle_validacao.js --no-pause
# ⚠ provoque a acao que a validacao protegia
# ⚠ e observe: A REQUISICAO SAIU?
```

```bash
# ── 3. ⚠ E O SERVIDOR — a resposta que fecha o achado ─────
T=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | \
    python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

echo "══ ⚠ o que o app NUNCA mandaria — mas o servidor aceita?"
for bad in "usuario_id=1" "preco=1" "X-Papel=admin" "pagamento_confirmado=true"; do
  printf "%-28s " "$bad"
  curl -s -X POST -H "Authorization: Bearer $T" -d "$bad" \
       http://127.0.0.1:5000/perfil | head -c 60
  echo
done
```

```bash
# ── 4. ⚠ MEDIR A CONCORRENCIA — a contagem ────────────────
echo "══ 10 requisicoes em paralelo"
seq 1 10 | xargs -P 10 -I{} curl -s -X POST -H "Authorization: Bearer $T" \
  -d "valor=100" http://127.0.0.1:5000/transferir -o /dev/null 2>/dev/null

#    ⚠ e o estado final
curl -s -H "Authorization: Bearer $T" http://127.0.0.1:5000/perfil 2>/dev/null
#    ⚠ quantas passaram de 10? o saldo ficou negativo?
```

```bash
# ── 5. O REGISTRO ─────────────────────────────────────────
cat > instrumentacao.md <<'EOF'
# Instrumentacao — <achado>
| Script | Hook | TIPO | Observado | ⚠ Resposta do servidor | Nivel |
|--------|------|------|-----------|------------------------|-------|
## ⚠ O que cada hook PROVA — e o que NAO prova
## ⚠ Achados que DEPENDEM do instrumento (condicionados)
## ⚠ Achados INDEPENDENTES do instrumento (reais)
EOF
```

**O que observar:** no passo 1, a linha `[body]` revelando a **identidade no corpo** — ⚠ é o padrão 1 do módulo 4, confirmado **antes** da requisição sair. ⚠ E no passo 2, o controle: ⚠ a validação desligada **não muda nada** se o **servidor** já confia — ⚠ e é isso que localiza o achado.

**Exercício 1:** complete o `instrumentacao.md` com pelo menos **dois** hooks, um de observação e um de **controle**. ⚠ A coluna `TIPO` é obrigatória — ela muda o que o achado vale.

**Exercício 2:** para cada achado do seu relatório, classifique: ⚠ **depende** do instrumento (condicionado) ou **não depende** (real). ⚠ Os independentes são os que sobrevivem ao relatório.

**Exercício 3 (o que vale):** escreva o parágrafo do 9.6 para **um** dos seus achados, no formato: ⚠ *"obtive o valor com X, **para confirmar** Y; a exploração **não depende** disso porque Z"*. ⚠ Se ela **depender**, escreva isso com clareza. É o que o módulo 11 vai cobrar.

---

## Resumo

- ⚠ **Instrumentar aqui é MEDIR** — não é o resultado, é o **controle**.
- ⚠ **O hook prova que o código PODE ser desviado** — não que um atacante pode.
- ⚠ **Os quatro usos:** observar o valor, ver a requisição, **bloquear validação para medir**, e medir tempo.
- ⚠ **Bloquear validação local é CONTROLE experimental** — e revela de quem é a decisão.
- ⚠ **O hook mostra o que o app MONTA** — o proxy mostra o que **sai**; com pinning, só o hook.
- ⚠ **Ver a requisição revela o padrão 1, 3 e o segredo embutido.**
- ⚠ **Para corrida no servidor, `curl` em paralelo é mais honesto** — vem de fora.
- ⚠ **O registro precisa dizer se foi CONTROLE** — muda o que o achado vale.
- ⚠ **O achado não é o valor observado; é o que o SERVIDOR respondeu.**

---

## O que o próximo módulo entrega

Você sabe medir. O módulo 10 fecha o ciclo de investigação: **reprodução pelo caminho de fora, e a causa-raiz** — o que o módulo 11 vai corrigir.
