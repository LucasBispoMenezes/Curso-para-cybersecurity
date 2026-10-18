# Módulo 2 — O Protocolo e as Camadas

**Carga:** 3 horas (1h30 teoria · 1h30 lab)
**Pré-requisitos:** Módulo 1 · Parser Differentials (módulo 6)

---

## Objetivos

1. Conhecer o **modelo de conexão** do HTTP/1.1 e por que a **persistência** é o pré-requisito.
2. Identificar **o que cada camada faz** com a mensagem — as cinco operações.
3. Saber onde cada camada pode **divergir** — o mapa.
4. Reconhecer as **condições de existência** do smuggling.
5. Medir a **regra de framing** de uma camada real, com o lab.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O smuggling precisa de uma conexão persistente.** **Se cada requisição abre e fecha a conexão,
> não há estado a deslocar** — **e não há ataque.**

⚠ **E é por isso que ele é um problema moderno.** **O HTTP/1.0 fechava a conexão a cada pedido.**
**O `keep-alive` — que virou o padrão — é o que cria o estado** — **e o estado é o que se
dessincroniza.**

⚠ **A tese:**

> **A persistência é o pré-requisito; a divergência é a causa; o deslocamento é o efeito.** **Falta
> um dos três e não há smuggling.**

⚠ **A tabela das três condições:**

| # | Condição | Sem ela |
|---|---|---|
| 1 | **Conexão persistente** | ⚠ Não há estado |
| 2 | **Duas camadas que discordam** | ⚠ Não há divergência |
| 3 | **A camada A repassa o original** | ⚠ A normalização mata o ataque |

⚠ **A condição 3 é a mais sutil, e a do WAF do curso anterior.** **Um proxy que **normaliza antes de
repassar** elimina a divergência** — **porque o backend recebe o que o proxy entendeu.** **É a razão
de muitos proxies serem imunes.**

---

## 2.1 O modelo de conexão

⚠ **HTTP/1.1 e a conexão persistente. E é aqui que o estado nasce.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ HTTP/1.0 (o modelo antigo)                                           │
│                                                                      │
│   cliente ──[ requisição ]──► servidor ──[ resposta ]──► fechou       │
│   cliente ──[ requisição ]──► servidor ──[ resposta ]──► fechou       │
│                                                                      │
│   ⚠ cada conexão é INDEPENDENTE. nada persiste.                       │
├──────────────────────────────────────────────────────────────────────┤
│ HTTP/1.1 com keep-alive (o modelo atual)                             │
│                                                                      │
│   cliente ──[ req 1 ]──► servidor ──[ resp 1 ]──►                     │
│            ──[ req 2 ]──► servidor ──[ resp 2 ]──►  ⚠ MESMA conexão   │
│            ──[ req 3 ]──► servidor ──[ resp 3 ]──►                    │
│                                                                      │
│   ⚠ o servidor precisa saber ONDE CADA REQUISIÇÃO TERMINA.            │
│   ⚠ e é exatamente aí que ele pode errar.                             │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A última linha é a origem de tudo.** **Numa conexão persistente, o servidor lê bytes de um
stream** — **e precisa decidir o limite sozinho.** **Se ele erra o limite, o que sobra é lido como a
próxima requisição.**

⚠ **E a tabela do que o `Connection` faz:**

| Valor | Efeito | ⚠ Smuggling? |
|---|---|---|
| `keep-alive` (padrão H1.1) | ⚠ A conexão fica | ⚠ **SIM** |
| `close` | Fecha após a resposta | ⚠ **Não** |
| ausente | ⚠ **Persiste** (H1.1) | ⚠ SIM |

⚠ **A terceira linha é a que pega.** **Em HTTP/1.1, a ausência do header significa persistir** —
**porque o padrão mudou.** **Quem implementa o H1.0 assume o contrário.**

⚠ **A regra escrita:**

> **O smuggling mora no stream.** **Num protocolo onde o limite da mensagem é inferido — e não
> declarado — o limite é uma aposta.**

```bash
mkdir -p ~/smuggle-lab/mod02 && cd ~/smuggle-lab/mod02

echo "═══ 1. o modelo de conexão ═══"
echo
cat > conexao.md <<'EOF'
# O modelo de conexão

## Os dois modelos
| Modelo | Conexão | Estado |
|---|---|---|
| HTTP/1.0 | fecha a cada pedido | ⚠ nenhum |
| HTTP/1.1 + keep-alive | ⚠ PERSISTE | ⚠ **o que se dessincroniza** |

## O que o Connection faz
| Valor | Efeito | Smuggling? |
|---|---|---|
| `keep-alive` (padrão H1.1) | a conexão fica | ⚠ SIM |
| `close` | fecha após a resposta | não |
| ⚠ ausente | ⚠ **PERSISTE em H1.1** | ⚠ SIM |

## ⚠ e é aí que o estado nasce
numa conexão persistente, o servidor lê um STREAM
e precisa decidir o LIMITE sozinho.
se ele erra o limite, o que sobra vira a PRÓXIMA requisição.

## As TRÊS condições de existência
| # | Condição | Sem ela |
|---|---|---|
| 1 | conexão PERSISTENTE | não há estado |
| 2 | duas camadas que DISCORDAM | não há divergência |
| 3 | ⚠ A repassa o ORIGINAL | a normalização mata o ataque |

## ⚠ A REGRA
o smuggling mora no STREAM.
onde o limite é INFERIDO e não declarado,
o limite é uma APOSTA.
EOF

cat conexao.md
```

⚠ **A tabela do `Connection` é o detalhe que decide.** **E a linha "ausente" é a armadilha:** **em
H1.1 a ausência significa persistir** — **e muita implementação antiga assume o contrário.**

⚠ **E a condição 3 fecha o mapa:** **a camada que normaliza antes de repassar elimina a
divergência** — **e é a defesa mais eficaz.**

**Produza `conexao.md`:**

| Valor | Efeito | Smuggling? |
|---|---|---|
| `keep-alive` | | |
| `close` | | |
| Ausente | | |

**Responda:**

1. **Por que a persistência é o pré-requisito?**
2. **O que o valor ausente significa** em H1.1?
3. **Cite as três condições de existência.**
4. **Qual condição é a defesa mais eficaz?**

---

## 2.2 O que cada camada faz

⚠ **Cinco operações. E cada uma é uma oportunidade de divergir.**

| # | Operação | O que a camada faz | ⚠ Onde diverge |
|---|---|---|---|
| 1 | **Parse** | Lê a requisição | ⚠ **A regra de framing** |
| 2 | **Normalize** | Reescreve o valor | ⚠ **Antes ou depois de comparar** |
| 3 | **Decide** | Autoriza ou não | O critério |
| 4 | **Reencode** | Gera a saída | ⚠ **Muda a forma** |
| 5 | **Forward** | Repassa | ⚠ **O original ou o normalizado** |

⚠ **A operação 5 é a mais importante do curso, e a do módulo anterior.** **A camada que repassa o
**original** mantém a divergência; a que repassa o **normalizado** a elimina.**

⚠ **A tabela do comportamento, por tipo de camada:**

| Camada | Parse | Forward | ⚠ Vulnerável? |
|---|---|---|---|
| **Proxy reverso** | Sim | ⚠ **Original** | ⚠ **Sim** |
| **WAF** | Sim | ⚠ **Original** | ⚠ **Sim** |
| **CDN** | Sim | ⚠ Original | ⚠ Sim |
| **Load balancer** | Sim | Às vezes reencoda | Depende |
| **Cache** | Sim | Serve do armazenado | ⚠ Outro efeito |
| ⚠ **Proxy que normaliza** | Sim | ⚠ **Normalizado** | ⚠ **Não** |

⚠ **A última linha é a defesa.** **Um proxy que reconstrói a requisição a partir do que ele
entendeu elimina o smuggling** — **porque o backend nunca vê os bytes originais.**

⚠ **E é por isso que alguns produtos são imunes e outros não** — **não é a idade, é a arquitetura.**

⚠ **A regra escrita:**

> **A pergunta não é "esta camada é segura?".** **É: "o que ela entrega à próxima?"** **Se entrega
> os bytes originais, ela mantém a divergência viva.**

```bash
cd ~/smuggle-lab/mod02

echo "═══ 2. o que cada camada faz ═══"
echo
cat > camadas.md <<'EOF'
# O que cada camada faz

## As cinco operações
| # | Operação | O que faz | ⚠ Onde diverge |
|---|---|---|---|
| 1 | PARSE | lê a requisição | a regra de framing |
| 2 | NORMALIZE | reescreve o valor | antes ou depois de comparar |
| 3 | DECIDE | autoriza ou não | o critério |
| 4 | REENCODE | gera a saída | muda a forma |
| 5 | ⚠ FORWARD | repassa | ⚠ **o ORIGINAL ou o NORMALIZADO** |

## Por tipo de camada
| Camada | Parse | Forward | Vulnerável? |
|---|---|---|---|
| proxy reverso | sim | original | ⚠ SIM |
| WAF | sim | original | ⚠ SIM |
| CDN | sim | original | sim |
| load balancer | sim | às vezes reencoda | depende |
| cache | sim | serve do armazenado | ⚠ outro efeito |
| ⚠ proxy que NORMALIZA | sim | ⚠ NORMALIZADO | ⚠ **NÃO** |

## ⚠ a operação que decide
a 5 (FORWARD).
a camada que repassa o ORIGINAL mantém a divergência.
a que repassa o NORMALIZADO a ELIMINA.
✓ é a defesa mais eficaz.

## ⚠ A REGRA
não pergunte "esta camada é segura?".
pergunte "o que ela ENTREGA à próxima?".
EOF

cat camadas.md

echo
echo "═══ 3. o mapa das divergências ═══"
echo
cat <<'EXPL'
  ── ONDE CADA CAMADA PODE DIVERGIR ──

     ┌────────────────────────────────────────────────────────────┐
     │ PARSE                                                      │
     │  · CL vs. TE            → módulo 3                         │
     │  · CL duplicado          → módulo 3                        │
     │  · TE ofuscado           → módulo 4                        │
     │  · espaços no header     → módulo 4                        │
     │  · chunk malformado      → módulo 4                        │
     │  · ⚠ H2 → H1 (conversão)  → MÓDULO 6                       │
     ├────────────────────────────────────────────────────────────┤
     │ NORMALIZE                                                  │
     │  · ordem (antes/depois)  → módulo 4                        │
     │  · case do header        → módulo 4                        │
     │  · obs-fold (continuação) → módulo 4                       │
     ├────────────────────────────────────────────────────────────┤
     │ FORWARD                                                    │
     │  · original × normalizado → o que decide a imunidade       │
     │  · reencode              → pode CRIAR a divergência        │
     ├────────────────────────────────────────────────────────────┤
     │ CACHE                                                      │
     │  · a chave               → módulo 8                        │
     └────────────────────────────────────────────────────────────┘

  ✓ o mapa é a trilha do curso.
     e cada módulo ataca uma linha dele.
EXPL
```

⚠ **O mapa é a trilha.** **Cada módulo do curso corresponde a uma linha do mapa** — **e é por isso
que a ordem importa.**

⚠ **E a linha do `REENCODE` é a mais contraintuitiva.** **Uma camada pode **criar** a divergência
onde não havia** — **reconstruindo a requisição de uma forma que a próxima lê diferente.** **É o
mecanismo do `H2 → H1`.**

**Produza `mapa.md`:**

| Operação | Onde diverge | Módulo |
|---|---|---|
| Parse | | |
| Normalize | | |
| Forward | | |
| Cache | | |

**Responda:**

1. **Qual operação decide a imunidade?** Por quê?
2. **O que um proxy que normaliza faz?**
3. **Qual linha do mapa é a contraintuitiva?** Por quê?
4. **Por que a idade não explica a imunidade?**

---

## 2.3 As condições de existência

⚠ **O teste de três perguntas: **existe smuggling aqui?****

| # | Pergunta | Se NÃO |
|---|---|---|
| 1 | **Há conexão persistente?** | ⚠ Não existe |
| 2 | **Há duas camadas que discordam?** | ⚠ Não existe |
| 3 | **A camada A repassa o original?** | ⚠ Não existe |

⚠ **A ordem importa, porque as três são eliminatórias.** **E você pode testar as três **antes** de
procurar a variante** — **o que economiza tempo.**

⚠ **A tabela do que fazer com cada "não":**

| Resposta | Ação |
|---|---|
| Sem persistência | ⚠ Encerre — não há o que testar |
| Sem divergência | Mude de alvo, ou procure outra variante |
| A normaliza | ⚠ Encerre — a divergência não chega |
| ⚠ **As três sim** | ⚠ **Procure a variante** |

⚠ **A segunda linha é a mais comum de errar.** **"Não achei divergência ainda" não é o mesmo que
"não há divergência".** **Você muda a **variante**, não o alvo.**

⚠ **E a última linha é a autorização para investigar** — **e não para atacar.** **As três condições
existem **no seu lab**, com camadas **suas**.**

⚠ **A regra escrita:**

> **Três perguntas eliminatórias.** **E as três se testam no lab, com as suas camadas** — **antes
> de qualquer coisa.**

```bash
cd ~/smuggle-lab/mod02

echo "═══ 4. as três condições ═══"
echo
cat > condicoes.md <<'EOF'
# As três condições de existência

| # | Pergunta | Se NÃO |
|---|---|---|
| 1 | há conexão PERSISTENTE? | não existe |
| 2 | há duas camadas que DISCORDAM? | não existe |
| 3 | a camada A repassa o ORIGINAL? | não existe |

## O que fazer com cada "não"
| Resposta | Ação |
|---|---|
| sem persistência | encerre |
| ⚠ sem divergência | ⚠ MUDE A VARIANTE, não o alvo |
| A normaliza | encerre |
| ⚠ as três SIM | ⚠ procure a variante |

## ⚠ o erro mais comum
"não achei divergência ainda" NÃO é o mesmo que
"não há divergência".
✓ você muda a VARIANTE — não o alvo.

## ⚠ e a autorização
as três condições existem NO SEU LAB, com camadas SUAS.
✓ e a autorização é para INVESTIGAR — não para atacar.

## ⚠ A REGRA
três perguntas ELIMINATÓRIAS.
e as três se testam no lab, ANTES de qualquer coisa.
EOF

cat condicoes.md

echo
echo "═══ 5. medindo a regra de framing de uma camada REAL ═══"
echo
cat <<'EXPL'
  ── COMO DESCOBRIR A REGRA DO SEU PROXY ──

     1. mande um payload com TE + CL ao proxy
     2. ⚠ veja o que ele REPASSA ao backend
     3. e o log do backend diz o que ele VIU

     ── os três resultados possíveis ──
        · o backend viu 1 requisição  → o proxy usou o CL
        · o backend viu 2 requisições → o proxy usou o TE
        · o proxy REJEITOU (400)      → ele detectou a ambiguidade ✓

  ── ⚠ E O TERCEIRO RESULTADO É O MELHOR ──
     um proxy que rejeita a ambiguidade é IMUNE.
     ✓ e é isso que a especificação moderna recomenda.
EXPL

cat > /tmp/mede-regra.md <<'EOF'
# Medir a regra de framing de uma camada

## O método
| # | Passo | O que fazer |
|---|---|---|
| 1 | manda o payload ambíguo | pelo frontend |
| 2 | ⚠ lê o log do backend | quantas requisições ele viu? |
| 3 | classifica | CL, TE, ou rejeição |

## Os resultados
| Backend viu | O frontend usa | Veredito |
|---|---|---|
| 1 requisição | o Content-Length | ⚠ divergente |
| 2 requisições | o Transfer-Encoding | ⚠ divergente |
| nada (400) | ⚠ **rejeitou** | ✓ **imune** |

## ⚠ e o terceiro resultado
um proxy que rejeita a ambiguidade é IMUNE.
✓ e é o que a especificação moderna recomenda.
EOF

cat /tmp/mede-regra.md
```

⚠ **O terceiro resultado é a defesa.** **E ele é o alvo do módulo 10 — a detecção.** **Um proxy que
rejeita a ambiguidade não tem o bug.**

⚠ **E a nota do "mude a variante, não o alvo" é a disciplina.** **A maioria desiste cedo demais** —
**quando testou uma variante, e não todas.**

**Produza `condicoes.md`:**

| # | Pergunta | Resposta no seu par |
|---|---|---|
| 1 | Persistente? | |
| 2 | Discordam? | |
| 3 | Repassa o original? | |

**Responda:**

1. **As três condições estão satisfeitas?**
2. **O que fazer se não achou divergência?**
3. **Quais são os três resultados possíveis** ao medir a regra?
4. **Qual é a defesa?** Por quê?

---

## 2.4 LAB — Meça a regra das suas camadas

**Duração:** 90 min

### Passo 1 — Confirme a persistência (25 min)

```bash
cd ~/smuggle-lab

echo "═══ CONFIRMANDO A PERSISTÊNCIA ═══"
echo
cat > harness/confirma-persistencia.py <<'PY'
#!/usr/bin/env python3
"""
confirma-persistencia.py — a condição 1.

⚠ manda DUAS requisições na MESMA conexão e vê se o backend
   as conta como duas. se sim, há persistência.

⚠ LOCAL (127.0.0.1).
"""
import socket, sys, os

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
LOG = os.path.expanduser("~/smuggle-lab/evidencia/backend.log")


def conta_no_log():
    try:
        with open(LOG) as f:
            return f.read().count("═══ requisição #")
    except FileNotFoundError:
        return 0


def main():
    print("═══ CONFIRMANDO A PERSISTÊNCIA ═══")
    print()
    print(f"  alvo: {HOST}:{PORT}  ⚠ LOCAL")
    print()

    antes = conta_no_log()
    print(f"  requisições antes : {antes}")
    print()

    # ⚠ DUAS requisições na MESMA conexão
    try:
        with socket.create_connection((HOST, PORT), timeout=5) as s:
            for i in (1, 2):
                s.sendall(
                    f"GET /persist-test-{i} HTTP/1.1\r\n"
                    f"Host: localhost\r\n"
                    f"Connection: keep-alive\r\n\r\n".encode()
                )
                s.settimeout(2)
                try: s.recv(4096)
                except socket.timeout: pass
        print("  ✓ duas requisições enviadas na MESMA conexão")
    except Exception as e:
        print(f"  ⚠ {type(e).__name__}")

    depois = conta_no_log()
    print(f"  requisições depois: {depois}")
    print()
    print(f"  ⚠ diferença: {depois - antes}")
    print()

    if depois - antes >= 2:
        print("  ✓✓ HÁ PERSISTÊNCIA — a condição 1 está satisfeita")
        print("     → o estado pode se dessincronizar")
    else:
        print("  ⚠ não há persistência — ou o proxy usa Connection: close")
        print("     → sem persistência, NÃO existe smuggling")


if __name__ == "__main__":
    main()
PY

chmod +x harness/confirma-persistencia.py

echo "  ── o script está pronto ──"
echo
echo "  ── para rodar (com o lab do módulo 1 no ar) ──"
echo "     python3 ~/smuggle-lab/harness/confirma-persistencia.py 8081"
```

Produza `persistencia.md`:

| Item | Valor |
|---|---|
| Requisições antes | |
| Requisições depois | |
| Diferença | |
| **Persiste?** | |

**Responda:**

1. **A condição 1 está satisfeita?**
2. **O que aconteceria sem persistência?**
3. **Como o proxy poderia desabilitá-la?**
4. **Por que a persistência é o pré-requisito?**

### Passo 2 — Meça a regra de framing (40 min)

⚠ **O payload ambíguo pelo frontend, e o log do backend.**

```bash
cd ~/smuggle-lab

echo "═══ MEDINDO A REGRA DE FRAMING ═══"
echo
cat > harness/mede-regra.py <<'PY'
#!/usr/bin/env python3
"""
mede-regra.py — a condição 2.

⚠ manda o payload ambíguo (TE+CL) pelo frontend e lê o LOG do backend
   para saber se ele viu 1 ou 2 requisições.

⚠ LOCAL (127.0.0.1). o backend é SEU.
"""
import socket, sys, os, time

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
LOG = os.path.expanduser("~/smuggle-lab/evidencia/backend.log")

# ⚠ o payload: TE + CL, com uma requisição "escondida" depois
PAYLOAD = (
    b"POST / HTTP/1.1\r\n"
    b"Host: localhost\r\n"
    b"Content-Length: 6\r\n"
    b"Transfer-Encoding: chunked\r\n"
    b"\r\n"
    b"0\r\n"
    b"\r\n"
    b"GET /escondido HTTP/1.1\r\n"
    b"Host: localhost\r\n"
    b"\r\n"
)


def conta():
    try:
        with open(LOG) as f:
            txt = f.read()
        return txt.count("═══ requisição #"), txt
    except FileNotFoundError:
        return 0, ""


def main():
    print("═══ MEDINDO A REGRA DE FRAMING ═══")
    print()
    print(f"  frontend: {HOST}:{PORT}   ⚠ LOCAL")
    print(f"  payload : {len(PAYLOAD)} bytes (TE+CL)")
    print()

    antes, _ = conta()
    print(f"  requisições antes : {antes}")

    try:
        with socket.create_connection((HOST, PORT), timeout=6) as s:
            s.sendall(PAYLOAD)
            s.settimeout(3)
            try:
                while True:
                    d = s.recv(4096)
                    if not d: break
            except socket.timeout:
                pass
        print("  ✓ payload enviado")
    except Exception as e:
        print(f"  ⚠ {type(e).__name__}")

    time.sleep(0.5)
    depois, txt = conta()
    n = depois - antes

    print(f"  requisições depois: {depois}")
    print(f"  ⚠ o backend viu     : {n} nova(s)")
    print()

    print("  ═══ O VEREDITO ═══")
    if n == 0:
        print("  ⚠ 0 → o frontend REJEITOU (400) ou não repassou")
        print("     ✓ se rejeitou por ambiguidade, ele é IMUNE")
    elif n == 1:
        print("  ⚠ 1 → o frontend usou o Content-Length")
        print("     e os bytes do GET /escondido ficaram no stream")
    elif n >= 2:
        print("  ⚠⚠ 2 ou mais → o frontend usou o Transfer-Encoding")
        print("     e o /escondido VIROU uma requisição")
        print("     ⚠⚠ É O DESYNC")
    print()

    if "/escondido" in txt:
        print("  ⚠⚠ ATENÇÃO: '/escondido' APARECE no log do backend.")
        print("     → o pedido escondido chegou. é o desync.")
    else:
        print("  · '/escondido' não apareceu no log.")

    print()
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x harness/mede-regra.py

echo "  ── o script está pronto ──"
echo "     python3 ~/smuggle-lab/harness/mede-regra.py 8081"
echo
echo "═══ O QUE REGISTRAR ═══"
cat > evidencia/regra-framing.md <<'EOF'
# A regra de framing das camadas

## O frontend
| Item | Valor |
|---|---|
| nome / versão | |
| porta | 127.0.0.1:____ |
| ⚠ o backend viu | ____ requisição(ões) |
| ⚠ a regra é | CL / TE / rejeitou |

## O backend
| Item | Valor |
|---|---|
| nome / versão | |
| porta | 127.0.0.1:____ |
| ⚠ a regra é | CL / TE |

## ⚠ A DIVERGÊNCIA
| Item | Valor |
|---|---|
| as duas regras coincidem? | |
| se não, há desync? | |

## As três condições
| # | Condição | Resultado |
|---|---|---|
| 1 | conexão persistente | |
| 2 | camadas que discordam | |
| 3 | repassa o original | |

## A evidência literal
```
o comando
```
```
o log do backend
```
EOF

cat evidencia/regra-framing.md
```

⚠ **O script é o instrumento, e ele é o do módulo 5 do Parser Differentials.** **A diferença é que
aqui o alvo é a **cadeia** — e a medida é o que o backend **viu**.

⚠ **E a nota do `/escondido` no log é a prova.** **Não é interpretação: a string que o atacante
escreveu apareceu no log do backend.**

**Produza `regra-framing.md`:**

| Camada | Regra |
|---|---|
| Frontend | |
| Backend | |
| Discordam? | |

**Responda:**

1. **Quantas requisições o backend viu?**
2. **O `/escondido` apareceu no log?**
3. **Qual a regra de cada camada?**
4. **As três condições estão satisfeitas?**

### Passo 3 — Registre a evidência (25 min)

Produza `evidencia/evidencia-modulo2.md`:

```markdown
# Evidência — módulo 2

## 1. O lab
| Camada | Porta | Regra |
|---|---|---|
| frontend | | |
| backend | | |

## 2. O isolamento
| Item | Valor |
|---|---|
| endereços | 127.0.0.1 |
| rede de saída | ⚠ NENHUMA |
| teste que falha | [ ] feito |

## 3. A persistência (condição 1)
| Item | Valor |
|---|---|
| requisições antes | |
| requisições depois | |
| ⚠ persiste? | |

## 4. A divergência (condição 2)
| Item | Valor |
|---|---|
| o backend viu | |
| a regra do frontend | |
| a regra do backend | |
| ⚠ discordam? | |

## 5. O forward (condição 3)
| Item | Valor |
|---|---|
| o frontend repassa | original / normalizado |

## 6. A evidência literal
```
comando
```
```
[frontend]
```
```
[backend]
```

## 7. O veredito
| Item | Valor |
|---|---|
| existe smuggling neste par? | |
| por quê | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não apontei para CDN, WAF ou host de terceiro
- [ ] não testei em produção
- [ ] não usei dado de terceiro
- [ ] não construí exploit de desync

## 9. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `evidencia.md`:**

| # | Condição | Resultado |
|---|---|---|
| 1 | Persistente | |
| 2 | Discordam | |
| 3 | Repassa o original | |
| **Veredito** | | |

**Responda:**

1. **Existe smuggling neste par?** Por quê?
2. **A evidência é literal?** Onde está?
3. **Quantas caixas do "não fiz" estão marcadas?**
4. **O que não foi verificado?**

### Critérios de aceitação

- `conexao.md` com os **dois** modelos e a tabela do `Connection`.
- Você explicou **por que a persistência é o pré-requisito**.
- Você explicou **o que o valor ausente significa** em H1.1.
- As **três** condições de existência, com o que fazer em cada "não".
- Você explicou **qual condição é a defesa mais eficaz**.
- `camadas.md` com as **cinco** operações.
- Você explicou **qual operação decide a imunidade**.
- Você explicou **o que um proxy que normaliza faz**.
- Você explicou **por que a idade não explica a imunidade**.
- `mapa.md` com as **quatro** operações e os módulos correspondentes.
- A **persistência** medida, com a diferença registrada.
- A **regra de framing** de cada camada medida.
- Você identificou **qual regra cada camada usa** (CL, TE, ou rejeita).
- Você verificou **se o `/escondido` apareceu** no log.
- `evidencia/regra-framing.md` com as **três** condições.
- `evidencia/evidencia-modulo2.md` com as **nove** seções.
- Você respondeu **se existe smuggling** no par.
- **Todas as caixas** do "não fiz" marcadas.
- ⚠ **Nenhum serviço de terceiro.** Tudo em 127.0.0.1.

---

## Avaliação

1. **Por que a persistência é o pré-requisito?**
2. **O que mudou do HTTP/1.0 para o 1.1?**
3. **O que o `Connection: close` faz** com o smuggling?
4. **E o valor ausente** em H1.1?
5. **Cite as cinco operações** de uma camada.
6. **Qual delas decide a imunidade?** Por quê?
7. **O que um proxy que normaliza antes de repassar faz?**
8. **Por que a idade não explica a imunidade?**
9. **Cite três camadas vulneráveis** e por quê.
10. **Qual operação pode CRIAR a divergência?** Dê um exemplo.
11. **Cite as três condições de existência.**
12. **O que fazer se não houver persistência?**
13. **O que fazer se não achar divergência?**
14. **Por que "não achei" não é "não há"?**
15. **Como se mede a regra de framing** de uma camada?
16. **Cite os três resultados possíveis.**
17. **Qual deles é a defesa?**
18. **Onde está a prova do desync** no log?
19. **O que o reencode pode fazer** com a divergência?
20. **Qual é a linha sobre 127.0.0.1** neste curso?

---

**Próximo:** [Módulo 3 — TE / CL, as combinações](modulo-03.md)
