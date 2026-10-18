# Módulo 8 — Anti-Tampering e Mecanismos de Integridade

**Curso:** Mobile Application Security: Análise e Pesquisa de Vulnerabilidades
**Módulo:** 8 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 7
**Próximo:** Módulo 9 — Instrumentação aplicada à investigação

---

## O que este módulo entrega

Ao final, você vai saber **avaliar a defesa do app** pelo que ela **consegue** — não pelo que promete. Você já viu as proteções nos Cursos 1 e 2; aqui, a pergunta muda: ⚠ **esta proteção muda o que o atacante alcança?** É o módulo que fecha o arco começado no módulo 1, e que dá ao relatório a sua seção mais delicada.

---

## 8.1 A pergunta, e ela não é a dos Cursos 1 e 2

⚠ **A diferença de abordagem, e ela é o módulo inteiro:**

| Cursos 1 e 2 | ⚠ Este curso |
|---|---|
| ⚠ **O que a proteção FAZ?** | ⚠ ⚠ **O que ela MUDA?** |
| ⚠ Como contornar | ⚠ ⚠ **Se vale a pena contornar** |
| ⚠ A técnica | ⚠ ⚠ **O custo relativo** |

⚠ **A frase que organiza o módulo:**

> **A pergunta não é se a proteção resiste. É se, sem ela, o atacante conseguiria algo
> que ele não consegue com ela.**

⚠ **E a resposta, na maioria dos casos, é: ⚠ nada.** ⚠ Porque a proteção do app atua sobre **o app** — ⚠ e o achado real está no **servidor** (módulo 4).

⚠ **A distinção que o relatório precisa fazer, e ela é a conclusão do curso:**

```
   ⚠ PROTEÇÃO QUE MUDA O ALCANCE:
     - attestation           ⚠ o SERVIDOR recusa
     - integridade verificada NO SERVIDOR

   ⚠ PROTECAO QUE NAO MUDA NADA:
     - deteccao de root      ⚠ o atacante ja' tem o app
     - ofuscacao             ⚠ encarece a leitura
     - anti-debug            ⚠ encarece a analise
     - verificacao de assinatura LOCAL
```

---

## 8.2 As categorias, e o que cada uma alcança

⚠ **O inventário, com o veredito de cada família:**

| Categoria | ⚠ O que muda |
|---|---|
| ⚠ **Detecção de ambiente** (root/jailbreak) | ⚠ Nada — o atacante **já controla** o app |
| ⚠ **Anti-debug** | ⚠ Encarece a **análise** |
| ⚠ **Verificação de assinatura local** | ⚠ Encarece a **modificação** |
| ⚠ **Verificação de integridade local** | ⚠ Idem |
| **Ofuscação** | ⚠ Encarece a **leitura** |
| ⚠ ⚠ **`Attestation`** | ⚠ ⚠ **Impede — no SERVIDOR** |
| ⚠ ⚠ **Integridade verificada no servidor** | ⚠ ⚠ **Impede o uso** |
| ✅ **Detecção no servidor** | ✅ Detecta o que passou |

⚠ **As duas linhas do fim são as que **mudam** — e as duas estão **fora do app**. ⚠ É a tese que os Cursos 1 e 2 também chegaram, ⚠ e aqui ela vira **critério de avaliação**.

⚠ **A última linha merece a nota, e ela conecta ao curso de Detecção e Evasão:** ⚠ não impedir não significa não servir. ⚠ Detecção **no servidor** — anomalia de comportamento, taxa de requisição, padrão impossível — ⚠ **encontra** o atacante mesmo depois de ele passar. ⚠ É a diferença entre **prevenção** e **detecção**, e o relatório deve avaliar **as duas**.

---

## 8.3 O teste: a proteção muda o alcance?

⚠ **O método, e ele é comparativo — não absoluto:**

```
   ⚠ PARA CADA PROTECAO:

   1. SEM a protecao:  o atacante ALCANCA o que?
        │              ⚠ rode o achado com a protecao neutralizada
        ▼
   2. COM a protecao:  ⚠ o atacante continua alcancando?
        │              ⚠ rode o MESMO achado, sem neutralizar
        ▼
   3. ⚠ COMPARE:        a diferenca e' o que a protecao vale
```

⚠ **A comparação é o que distingue este módulo do Curso 1 e do Curso 2:** ⚠ lá, o objetivo era **contornar e seguir**. ⚠ Aqui, o objetivo é **medir a diferença** — e muitas vezes ela é **zero**.

⚠ **O resultado, em três possibilidades:**

| Resultado | ⚠ O que significa |
|---|---|
| ⚠ **Igual** | ⚠ A proteção **não muda o alcance** — achado segue válido |
| ⚠ **Diferente** | ⚠ A proteção **reduz** — o achado tem **condição** |
| ⚠ ⚠ **Impede** | ⚠ ⚠ **O achado não existe** — e o relatório diz isso |

⚠ **A terceira linha é a mais importante para a honestidade do relatório:** ⚠ se a proteção **impede** — e só `attestation` impede —, ⚠ o achado **cai**. ⚠ Reportar um achado que a proteção neutraliza é o erro que queima credibilidade.

---

## 8.4 As três perguntas do veredito

⚠ **O instrumento, e ele cabe em três linhas:**

```
   ┌──────────────────────────────────────────────────────────┐
   │  1. ⚠ A PROTECAO ESTA NO APP, OU NO SERVIDOR?             │
   │        app -> encarece    servidor -> pode impedir        │
   │                                                           │
   │  2. ⚠ O ATACANTE JA' CONTROLA O APP?                      │
   │        sim -> a protecao do app NAO o limita              │
   │                                                           │
   │  3. ⚠ SEM ELA, O ALCANCE SERIA DIFERENTE?                 │
   │        nao -> a protecao nao muda o achado                │
   └──────────────────────────────────────────────────────────┘
```

⚠ **A segunda é a que resolve a maioria:** ⚠ se o atacante **manipula o app** — ⚠ e é o **dono do aparelho** (módulo 1) — ⚠ então a proteção que vive **no app** não o limita **em nada**. ⚠ Ele simplesmente **remove** a verificação.

⚠ **A exceção, e ela é a única:** ⚠ `attestation` ⚠ **não está no app** ⚠ — a resposta vem do **`SEP`** e é validada **pelo servidor**. ⚠ Aí, "controlar o app" **não basta**: ⚠ o atacante precisaria de **aparelho não comprometido**.

⚠ **A pergunta 3 é a que qualifica cada achado do relatório:**

| Achado | Sem proteção | Com proteção | ⚠ Veredito |
|---|---|---|---|
| Preço do cliente | ⚠ compra por 1 | ⚠ compra por 1 | ⚠ **inalterado** |
| `Deep link` com id | ⚠ abre dado de outro | ⚠ abre dado de outro | ⚠ **inalterado** |
| Token em `.plist` | ⚠ lê o token | ⚠ lê o token | ⚠ **inalterado** |
| Requisição forjada | ⚠ aceita | ⚠ aceita | ⚠ **inalterado** |

⚠ **A tabela é o resultado esperado, e ela é quase monótona:** ⚠ a proteção do app **não muda** o alcance dos achados que este curso procura. ⚠ E dizer isso **com evidência** é o trabalho do módulo.

---

## 8.5 Detecção: o que a proteção **faz** servir

⚠ **A parte construtiva do módulo, e a que o relatório precisa incluir:**

| O que se pode detectar | ⚠ Onde |
|---|---|
| ⚠ **Requisição impossível** | ⚠ Servidor — o app real não faz isso |
| ⚠ **Sequência impossível** | ⚠ Servidor — ordem de etapas |
| ⚠ **Taxa anômala** | ⚠ Servidor — rate, concorrência |
| ⚠ **Dispositivo inconsistente** | ⚠ `attestation`, `DeviceCheck` |
| ⚠ **Cliente não reconhecido** | ⚠ Atestação, versão mínima |
| **Múltiplas contas por aparelho** | Ler do `SEP`/`DeviceCheck` |

⚠ **A primeira é a mais prática, e a mais subutilizada:** ⚠ o app **real** nunca manda `preco=1`. ⚠ Então ⚠ **a requisição é detectável** — ⚠ e a correção pode ser **detectar e bloquear**, além de recalcular.

⚠ **É a mesma estrutura do módulo 10 do curso de LLM e do módulo 9 do curso de Detecção e Evasão:** ⚠ onde não se **impede**, ⚠ **mede-se** e **detecta-se**. ⚠ E o custo tem dois lados — ⚠ falso negativo e falso positivo — ⚠ como em todo filtro.

⚠ **E o `DeviceCheck`/`App Attest` é a via formal:** ⚠ ele permite ao servidor saber **se aquele aparelho já foi visto**, ⚠ **sem** guardar identificador permanente. ⚠ É o que permite detectar ⚠ **múltiplas contas no mesmo aparelho**, ⚠ e é a única coisa do módulo que **o atacante com app modificado não contorna**.

---

## 8.6 O relatório da proteção

⚠ **O formato, e ele fecha o arco do curso:**

```
AVALIACAO DE PROTECAO — <app>
──────────────────────────────────────────────────────────
| # | Protecao | ⚠ Onde vive | ⚠ O que TENTA | ⚠ O que CONSEGUE |
|---|----------|-------------|---------------|------------------|
| 1 | deteccao de root | app | ambiente | ⚠ nada — ele ja' tem o app |
| 2 | anti-debug | app | analise | ⚠ encarece |
| 3 | assinatura local | app | modificacao | ⚠ encarece |
| 4 | attestation | ⚠ SERVIDOR | uso | ⚠ ⚠ IMPEDE |
                    │
⚠ HA ATTESTATION? sim | nao   ← a unica que muda o alcance
                    │
⚠ DETECCAO NO SERVIDOR:
   - requisicao impossivel?     sim | nao
   - sequencia impossivel?      sim | nao
   - taxa anomala?              sim | nao
                    │
⚠ VEREDITO: a protecao MUDA o que o atacante alcanca? sim | nao
   e a prova: <os achados do relatorio, antes e depois>
──────────────────────────────────────────────────────────
```

⚠ **A linha `VEREDITO` é a conclusão do curso, e ela precisa de **prova**:** ⚠ os achados dos módulos 2 a 7 **continuam válidos** com a proteção ativa? ⚠ Se sim, o veredito é **"não muda"** — ⚠ e isso é um resultado, não uma lacuna.

⚠ **E a sub-linha `e a prova` é o que distingue este relatório de uma opinião:** ⚠ ele mostra **o mesmo achado**, **com** e **sem** a proteção. ⚠ É a mesma disciplina do módulo 5 do curso de LLM — a taxa **com controle**.

---

## 8.7 O limite do curso, escrito com clareza

⚠ **Delimitação, e ela é importante neste módulo:**

| Este curso | ⚠ O que **não** está aqui |
|---|---|
| **Avaliar** o que a proteção consegue | ⚠ Burlar proteção de app de terceiro |
| **Medir** com e sem | ⚠ Escrever ofuscação ou packing |
| Recomendar detecção no servidor | ⚠ Contornar `attestation` |
| Relatar o veredito | ⚠ Publicar a técnica de contorno |

⚠ **A razão é a mesma dos três cursos anteriores:** ⚠ o alvo é o **seu** app, e o entregável é a **avaliação**. ⚠ O contorno aparece **para medir** — ⚠ nunca como objetivo.

⚠ **E a frase que fecha o módulo, e abre o 9:** ⚠ *"a proteção do app encarece a análise; o que protege é a verificação no servidor"*. ⚠ O módulo 9 trata de **como medir isso com rigor**.

---

## Laboratório 8 — Medir a diferença

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Exige o servidor do módulo 1 e os apps dos Cursos 1 e 2.**

```bash
mkdir -p ~/mobile-lab/m08 && cd ~/mobile-lab/m08
```

```bash
# ── 1. O INVENTARIO DAS PROTECOES ─────────────────────────
# ANDROID:
grep -rniE 'isRooted|RootBeer|SafetyNet|PlayIntegrity|'\
'isDebuggerConnected|ptrace|signature|checkSum|frida' \
  ../m05/app_jadx/sources/ 2>/dev/null | head -15

strings -n 5 ../m05/app_jadx/../alvo/app.apk 2>/dev/null | \
  grep -iE 'jailbreak|frida|root|integrity' | head

# iOS:
strings -n 5 ~/ios-lab/m02/ipa/Payload/*.app/MeuApp 2>/dev/null | \
  grep -iE 'jailbreak|cydia|frida|ptrace|SecCode' | sort -u

# ⚠ e o que muda o jogo:
strings -n 6 ~/ios-lab/m02/ipa/Payload/*.app/MeuApp 2>/dev/null | \
  grep -iE 'DCAppAttest|attestKey|DeviceCheck|SafetyNet' | sort -u
```

```bash
# ── 2. ⚠ O TESTE COMPARATIVO — com e sem ──────────────────
cat <<'EOF'
══ O METODO DO MODULO:

Passo A — SEM a protecao (neutralizada):
   ⚠ rode UM achado do relatorio (ex.: o deep link com id=1)
   ⚠ registre o resultado

Passo B — COM a protecao:
   ⚠ rode o MESMO achado, sem neutralizar nada
   ⚠ registre o resultado

Passo C — COMPARE:
   ⚠ a diferenca e' o que a protecao vale
   ⚠ se for zero -> "nao muda o alcance"
EOF

echo "══ A — com deteccao neutralizada"
cat > neutralizar.js <<'EOF'
if (ObjC.available) {
    var File = ObjC.classes.NSFileManager;
    // ⚠ neutraliza a deteccao, so' para MEDIR a diferenca
    if (File) Interceptor.attach(File["- fileExistsAtPath:"].implementation, {
        onEnter: function (a) {
            var p = new ObjC.Object(a[2]).toString();
            if (/cydia|bash|ssh|apt/i.test(p)) this.bloquear = true;
        },
        onLeave: function (r) { if (this.bloquear) r.replace(ptr(0)); }
    });
    console.log("[*] deteccao neutralizada para comparacao");
}
EOF
# frida -U -f com.exemplo.app -l neutralizar.js --no-pause
```

```bash
# ── 3. ⚠ A PROVA — o achado continua valido? ──────────────
T=$(curl -s -X POST -d "usuario=bruno" http://127.0.0.1:5000/login | \
    python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

echo "══ o achado do modulo 4 (preco do cliente)"
curl -s -X POST -H "Authorization: Bearer $T" \
     -d "produto=servidor&preco=1" http://127.0.0.1:5000/comprar

echo; echo "══ ⚠ e agora, com a deteccao de root ATIVA?"
#    ⚠ a deteccao de root impede o atacante de mandar essa requisicao?
#    ⚠ NAO — ele nao precisa do app para isso
```

```bash
# ── 4. ⚠ A PROTECAO QUE MUDA: verificar o servidor ────────
#    ⚠ a unica coisa que muda o alcance e' o SERVidor verificar
cat > verificar.py <<'EOF'
# ⚠ o que o SERVIDOR pode recusar, e nenhuma protecao do app substitui:
#
#   1. requisicao impossivel   -> o app real nunca manda preco=1
#   2. sequencia impossivel    -> compra sem carrinho
#   3. taxa anomala            -> 100 compras por segundo
#   4. dispositivo nao atestado-> App Attest / DeviceCheck
#
# ⚠ e' ISTO que muda o que o atacante alcanca.
EOF
cat verificar.py
```

```bash
# ── 5. O RELATORIO ────────────────────────────────────────
cat > protecao.md <<'EOF'
# Protecao — <app>
| # | Protecao | ⚠ Onde vive | O que TENTA | ⚠ O que CONSEGUE |
|---|----------|-------------|-------------|------------------|
## ⚠ HA ATTESTATION?
## ⚠ DETECCAO NO SERVIDOR (requisicao, sequencia, taxa, dispositivo)
## ⚠ VEREDITO: a protecao MUDA o alcance?
### A prova — o mesmo achado, com e sem
## ⚠ Recomendacao
EOF
```

**O que observar:** no passo 3, o achado do módulo 4 **continua funcionando** com a detecção de `root` **ativa** — ⚠ porque o atacante **não precisa do app** para mandar aquela requisição. ⚠ É o veredito do módulo, e ele é **"não muda o alcance"** — ⚠ com prova.

**Exercício 1:** complete o `protecao.md` com todas as proteções encontradas, e a coluna **"o que consegue"** sem exagero. ⚠ Só `attestation` merece a palavra **"impede"**.

**Exercício 2:** faça o **teste comparativo** do passo 2 com um achado do relatório. ⚠ Registre os dois resultados — **com** e **sem** — e escreva a **diferença**.

**Exercício 3 (o que vale):** escreva a seção **"detecção no servidor"** com **quatro** itens concretos — ⚠ para **este** app, não em geral. ⚠ Cada item precisa dizer **qual requisição** seria impossível vinda do app real. É o que o módulo 11 vai cobrar como correção.

---

## Resumo

- ⚠ **A pergunta é o que a proteção MUDA** — não o que ela faz.
- ⚠ **Proteção no app encarece; proteção no servidor pode impedir.**
- ⚠ **Se o atacante já controla o app** (o dono do aparelho), ⚠ a proteção do app **não o limita**.
- ⚠ ⚠ **Só `attestation` e a verificação no servidor mudam o alcance.**
- ⚠ **O teste é comparativo:** o **mesmo** achado, **com** e **sem** a proteção.
- ⚠ **O veredito tem três resultados:** igual, diferente ou **impede** — e o terceiro **derruba o achado**.
- ⚠ **Detecção no servidor é a parte construtiva:** requisição impossível, sequência, taxa e dispositivo.
- ⚠ **`DeviceCheck`/`App Attest` detectam contas múltiplas** — e não se contorna com app modificado.
- ⚠ **A sub-linha "e a prova"** distingue o relatório de uma opinião.

---

## O que o próximo módulo entrega

Você sabe avaliar a defesa. O módulo 9 trata do **método de medição**: instrumentação aplicada à investigação — como medir com rigor, e o que o instrumento **prova e não prova**.
