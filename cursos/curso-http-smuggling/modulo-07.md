# Módulo 7 — Client-Side Desync

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Entender por que o **navegador** é uma camada — e por que isso muda o alvo.
2. Reconhecer as **condições** do client-side desync.
3. Distinguir **server-side** de **client-side** desync.
4. Medir o desync **contra o seu próprio navegador**, no seu lab.
5. Saber por que este é o vetor **mais perigoso** para a vítima — e o mais restrito.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Até aqui, o atacante mandava o payload e a vítima era quem viesse depois.** **Aqui, a vítima
> **é o alvo** — e o payload roda **no navegador dela**, contra o servidor.**

⚠ **E a diferença é estrutural, não de grau:**

| | Server-side | Client-side |
|---|---|---|
| Quem manda o payload | ⚠ **O atacante** | ⚠ **O navegador da vítima** |
| Onde a vítima está | Depois, na fila | ⚠ **É o alvo** |
| Precisa de | Rede compartilhada | ⚠ **Só que ela visite uma página** |
| O atacante precisa de | Um payload | ⚠ **Uma página que ela abra** |
| ⚠ Alcance | N usuários na fila | ⚠⚠ **Qualquer usuário** |

⚠ **A tese:**

> **O client-side desync move o atacante para dentro da vítima.** **E a camada que ele usa é a que
> ele controla: o navegador dela.**

⚠ **E a razão de ele ser restrito, e por isso menos explorado:** **exige que o navegador fale com o
servidor de um jeito específico** — **e os navegadores têm regras.** **Mas onde as regras permitem,
o alcance é total.**

⚠ **A tabela das condições:**

| # | Condição | Por quê |
|---|---|---|
| 1 | **Conexão persistente** | Sem ela não há estado |
| 2 | ⚠ **O servidor discorda de si mesmo** | ⚠ **O frontend e o backend são o mesmo alvo** |
| 3 | **O navegador pode ser induzido** | ⚠ Uma página, ou um request controlado |
| 4 | ⚠ **Requisição controlável pelo atacante** | ⚠ **Corpo e headers parciais** |

⚠ **A condição 2 é a que muda o modelo.** **Aqui não há proxy e backend — há **um servidor com dois
parsers**:** **o do front-end (que lê o pedido do navegador) e o do back-end (que lê do pool).**
**É a mesma cadeia, dentro do mesmo produto.**

⚠ **A regra escrita:**

> **O client-side desync não precisa de duas empresas.** **Precisa de um servidor que leia a
> requisição de duas formas** — **e de um navegador que você consiga dirigir.**

---

## 7.1 Por que o navegador é uma camada

⚠ **O navegador não é um cliente passivo. Ele **normaliza, reescreve e decide** — e cada decisão é
uma oportunidade.**

| O navegador faz | ⚠ Onde diverge |
|---|---|
| **Normaliza a URL** | ⚠ O que ele codifica e o que não |
| **Adiciona headers** | `Origin`, `Referer`, `Sec-Fetch-*` |
| **Reescreve o corpo** | ⚠ **O que ele deixa passar** |
| **Decide a conexão** | ⚠ **Reuso, limites, ordem** |
| ⚠ **Aplica CORS** | ⚠ **O que a página pode ler** |

⚠ **A linha do corpo é a mais importante, e a que o pesquisador explora.** **Um `fetch()` com um
corpo que **contém caracteres específicos** — **e o navegador os transmite como estão.** **É a base
do client-side desync:** **você faz o **navegador da vítima** mandar um corpo que deixa o servidor
dessincronizado.**

⚠ **E a linha do CORS é o limite.** **A página maliciosa pode **mandar** a requisição, mas não
**ler** a resposta.** **E é o que torna o ataque possível e cego:** **o atacante não precisa ler — ele
precisa só desalinhar.**

⚠ **A tabela do que a página consegue e não consegue:**

| Ação | A página consegue? |
|---|---|
| Mandar uma requisição com corpo customizado | ✓ (com `no-cors`) |
| ⚠ Ler a resposta | ⚠ Não (CORS) |
| Mandar headers arbitrários | ⚠ Só os permitidos |
| ⚠ **Reusar a conexão** | ⚠ **O navegador decide** |
| Enviar requisição **parcial** | ⚠ Com `fetch` + stream |

⚠ **A linha do stream é a mais moderna.** **Um `fetch` com corpo em **stream** permite mandar
parte, esperar, e mandar o resto** — **e é exatamente o controle de **cadência** do módulo 9 do
Parser Differentials.** **As duas pontas se encontram aqui.**

⚠ **A regra escrita:**

> **A página manda e não lê.** **E é o suficiente** — **porque o desync não precisa de leitura; ele
> precisa de desalinhamento.**

```bash
mkdir -p ~/smuggle-lab/mod07 && cd ~/smuggle-lab/mod07

echo "═══ 1. o navegador como camada ═══"
echo
cat > navegador.md <<'EOF'
# O navegador como camada

## O que ele faz (e onde diverge)
| O navegador faz | Onde diverge |
|---|---|
| normaliza a URL | o que ele codifica e o que não |
| adiciona headers | Origin, Referer, Sec-Fetch-* |
| reescreve o corpo | ⚠ o que ele deixa passar |
| decide a conexão | ⚠ reuso, limites, ordem |
| ⚠ aplica CORS | ⚠ o que a página pode LER |

## O que a página consegue
| Ação | Consegue? |
|---|---|
| mandar requisição com corpo customizado | ✓ (no-cors) |
| ⚠ LER a resposta | ⚠ NÃO (CORS) |
| mandar headers arbitrários | só os permitidos |
| ⚠ reusar a conexão | ⚠ o navegador decide |
| ⚠ enviar requisição PARCIAL | ⚠ com fetch + stream |

## ⚠ a linha do stream
um fetch com corpo em STREAM permite mandar parte,
esperar, e mandar o resto.
✓ é o controle de CADÊNCIA (Parser Differentials, módulo 9).
✓ as duas pontas se encontram aqui.

## ⚠ A REGRA
a página MANDA e não LÊ.
e é o suficiente —
porque o desync não precisa de LEITURA. precisa de DESALINHAMENTO.
EOF

cat navegador.md

echo
echo "═══ 2. server-side × client-side ═══"
echo
cat <<'EXPL'
  ┌──────────────────────┬───────────────────────┬───────────────────────┐
  │                      │ SERVER-SIDE           │ CLIENT-SIDE           │
  ├──────────────────────┼───────────────────────┼───────────────────────┤
  │ quem manda o payload │ o ATACANTE            │ ⚠ o NAVEGADOR da vítima│
  │ onde a vítima está   │ depois, na fila       │ ⚠ É o alvo            │
  │ precisa de           │ rede compartilhada    │ ⚠ só uma página aberta │
  │ o atacante precisa   │ um payload            │ ⚠ uma página           │
  │ ⚠ ALCANCE             │ N usuários na fila    │ ⚠⚠ QUALQUER usuário    │
  ├──────────────────────┼───────────────────────┼───────────────────────┤
  │ quem é o "frontend"  │ um proxy              │ ⚠ O PRÓPRIO servidor   │
  │ quem é o "backend"   │ outro servidor        │ ⚠ O POOL do mesmo      │
  │ o atacante lê?       │ às vezes              │ ⚠ NÃO (CORS)           │
  └──────────────────────┴───────────────────────┴───────────────────────┘

  ⚠ e a linha "quem é o frontend" é a que muda o modelo:
     não há duas empresas. há UM servidor com DOIS parsers.
     · o do front-end (lê do navegador)
     · o do pool     (lê a conexão reusada)
  ✓ é a mesma cadeia, dentro do mesmo produto.
EXPL
```

⚠ **A tabela comparativa é o instrumento.** **E a linha do frontend/backend é a que muda o modelo:**
**aqui, o "proxy" e o "backend" são o mesmo produto** — **e a discordância é **interna**.**

⚠ **E a linha do CORS é o limite honesto:** **o atacante não lê a resposta.** **E não precisa.**

**Produza `comparacao.md`:**

| | Server-side | Client-side |
|---|---|---|
| Quem manda | | |
| Alcance | | |
| O atacante lê? | | |

**Responda:**

1. **O que muda no modelo** de camadas?
2. **Por que o CORS não impede o ataque?**
3. **O que o stream permite?** Como se liga ao módulo 9 do Parser Differentials?
4. **Qual o alcance do client-side?**

---

## 7.2 As condições e o mecanismo

⚠ **O mecanismo, em cinco passos. E o atacante controla só dois.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. A VÍTIMA ABRE A PÁGINA DO ATACANTE                                 │
│    ⚠ e o navegador dela fala com o ALVO                               │
├──────────────────────────────────────────────────────────────────────┤
│ 2. ⚠ A PÁGINA MANDA UMA REQUISIÇÃO "ENVENENADA"                       │
│    · um POST com um corpo que deixa o servidor desalinhado            │
│    · ⚠ o servidor responde ANTES de ler o corpo (CL.0, módulo 3)       │
├──────────────────────────────────────────────────────────────────────┤
│ 3. O SERVIDOR NÃO LÊ O CORPO                                          │
│    ⚠ e o corpo FICA NO SOCKET da conexão                              │
├──────────────────────────────────────────────────────────────────────┤
│ 4. ⚠ A MESMA CONEXÃO É REUSADA — PELO NAVEGADOR                        │
│    · a página faz uma segunda requisição                              │
│    · ⚠ o navegador REUSA a conexão (é o padrão)                        │
├──────────────────────────────────────────────────────────────────────┤
│ 5. A SEGUNDA REQUISIÇÃO SAI PREFIXADA                                 │
│    ⚠ com o corpo da primeira na frente                                │
│    → e o que sobra é uma requisição que ela NÃO autorizou             │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **O passo 2 é o que exige a condição do `CL.0`.** **O servidor precisa **responder antes de ler o
corpo** — **e é por isso que o módulo 3 é pré-requisito.** **É a mesma variante, com outro atacante.**

⚠ **E o passo 4 é o que o atacante não controla — e o que ele explora.** **O navegador reusa a
conexão por padrão** — **e é o **reuso** que faz o corpo sobrante ser lido como prefixo.**

⚠ **A tabela do que o atacante controla:**

| Passo | Controlado por |
|---|---|
| 1 — a vítima abrir a página | ⚠ **O atacante** (isca) |
| 2 — a requisição envenenada | ⚠ **O atacante** (o JS) |
| 3 — o servidor não ler | ⚠ **O servidor** |
| 4 — o reuso da conexão | ⚠ **O navegador** |
| 5 — o efeito | ⚠ **O servidor** |

⚠ **A linha 4 é a mais frágil e a mais interessante.** **O atacante **depende** de o navegador reusar
a conexão** — **e o navegador tem heurísticas.** **É por isso que o ataque é "às vezes" — e por isso
ele é real.**

⚠ **A regra escrita:**

> **O atacante controla a isca e a primeira requisição.** **O resto é o navegador e o servidor
> fazendo o que fazem por padrão** — **e é por isso que funciona.**

```bash
cd ~/smuggle-lab/mod07

echo "═══ 3. as condições ═══"
echo
cat > condicoes.md <<'EOF'
# As condições do client-side desync

| # | Condição | Quem provê |
|---|---|---|
| 1 | conexão PERSISTENTE | o navegador + o servidor |
| 2 | ⚠ o servidor discorda de SI MESMO | ⚠ o produto |
| 3 | o navegador pode ser induzido | ⚠ o ATACANTE (a isca) |
| 4 | ⚠ requisição controlável | ⚠ o ATACANTE (o JS) |
| 5 | o servidor RESPONDE ANTES de ler o corpo | ⚠ o produto |

## O mecanismo, passo a passo
| # | Passo | Controlado por |
|---|---|---|
| 1 | a vítima abre a página | ⚠ o atacante (isca) |
| 2 | a requisição envenenada | ⚠ o atacante (JS) |
| 3 | o servidor não lê o corpo | o servidor |
| 4 | ⚠ a conexão é REUSADA | ⚠ **O NAVEGADOR** |
| 5 | o efeito | o servidor |

## ⚠ a linha frágil
o passo 4 depende do navegador REUSAR a conexão.
e o navegador tem HEURÍSTICAS.
✓ por isso o ataque é "às vezes" — e por isso ele é REAL.

## ⚠ A REGRA
o atacante controla a ISCA e a 1ª requisição.
o resto é o navegador e o servidor fazendo o que fazem POR PADRÃO.
✓ e é por isso que funciona.
EOF

cat condicoes.md

echo
echo "═══ 4. a cadeia, dentro de UM produto ═══"
echo
cat <<'EXPL'
  ┌─────────────────────────────────────────────────────────────┐
  │ O NAVEGADOR DA VÍTIMA                                       │
  │   · abre a página do atacante                               │
  │   · ⚠ e manda o que o JS mandar                              │
  └──────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ O SERVIDOR ALVO — ⚠ UM SÓ PRODUTO                            │
  │                                                             │
  │   ┌───────────────────┐      ┌───────────────────┐          │
  │   │ PARSER DO FRONT   │      │ PARSER DO POOL    │          │
  │   │ lê do navegador   │      │ lê a conexão      │          │
  │   └─────────┬─────────┘      └─────────┬─────────┘          │
  │             │                          │                    │
  │             └──────────┬───────────────┘                    │
  │                        │                                    │
  │              ⚠ e os dois DISCORDAM sobre                    │
  │                 onde o corpo termina                        │
  └─────────────────────────────────────────────────────────────┘

  ✓ não há proxy. não há backend separado.
     ⚠ há um produto que lê a mesma conexão de duas formas.
EXPL
```

⚠ **A figura mostra o que muda no modelo:** **a discordância é **interna** ao produto** — **entre o
parser que lê do cliente e o que lê do pool de conexões.**

⚠ **E é a razão de a variante ser moderna.** **Um produto que responde antes de ler o corpo** — **por
performance** — **cria a divergência consigo mesmo.**

**Produza `mecanismo.md`:**

| # | Passo | Controlado por |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |

**Responda:**

1. **Quantos passos o atacante controla?
2. **Qual passo é o frágil?** Por quê?
3. **Quem são o "frontend" e o "backend"** aqui?
4. **Por que a divergência é interna?**

---

## 7.3 Medindo no seu lab

⚠ **A medição exige um navegador — e você tem um. E ele é **seu**.**

| Componente | O que é | ⚠ Isolamento |
|---|---|---|
| **O servidor alvo** | ⚠ **O seu**, com o `CL.0` | Container |
| **A página do atacante** | ⚠ **Sua**, servida de 127.0.0.1 | Local |
| **O navegador** | ⚠ **O seu**, com perfil descartável | ⚠ **Seu** |
| ⚠ **A vítima** | ⚠ **VOCÊ** | ⚠ **Nunca outra pessoa** |

⚠ **A última linha é a mais importante do módulo.** **Você é a vítima** — **porque o ataque exige
que o navegador **de alguém** seja induzido.** **E esse alguém é você, no seu lab.**

⚠ **E a tabela do que **não** fazer, e ela é absoluta:**

| Ato | Lícito? |
|---|---|
| Servir a página de 127.0.0.1 | ✓ |
| Abrir a página no **seu** navegador | ✓ |
| Medir o desync no **seu** servidor | ✓ |
| ⚠ Fazer a página apontar para **outro host** | ⚠ **CRIME** |
| ⚠ Induzir **outra pessoa** a abrir a página | ⚠ **CRIME** |
| ⚠ Usar o desync para **acessar** algo | ⚠ **CRIME** |

⚠ **A segunda linha é a que a lei chama de outra coisa.** **Uma página que induz o navegador de
terceiro a mandar requisição não autorizada é **CSRF** — e agrava o smuggling.** **É crime
autônomo, além do 154-A.**

⚠ **E a tabela do que a medição mostra:**

| Medição | Como | ⚠ Sinal |
|---|---|---|
| O corpo ficou no socket? | Log do servidor | O path da 2ª |
| A 2ª saiu prefixada? | ⚠ **O path no log** | ⚠ **Desync** |
| O navegador reusou? | ⚠ **A mesma conexão** | Necessário |
| O atacante leu algo? | ⚠ **Não pode (CORS)** | — |

⚠ **A regra escrita:**

> **Você é o atacante e a vítima.** **A página, o navegador e o servidor são seus** — **e o desync é
> medido entre eles.** **É a única forma lícita de estudar o client-side desync.**

```bash
cd ~/smuggle-lab/mod07

echo "═══ 5. medindo no seu lab ═══"
echo
cat > medicao.md <<'EOF'
# Medindo o client-side no lab

## Os componentes (TODOS seus)
| Componente | O que é | Isolamento |
|---|---|---|
| o servidor alvo | O SEU, com o CL.0 | container |
| a página do atacante | SUA, de 127.0.0.1 | local |
| o navegador | O SEU, perfil descartável | seu |
| ⚠ a vítima | ⚠ **VOCÊ** | ⚠ nunca outra pessoa |

## ⚠ o que NÃO fazer
| Ato | Lícito? |
|---|---|
| servir a página de 127.0.0.1 | ✓ |
| abrir no SEU navegador | ✓ |
| medir no SEU servidor | ✓ |
| ⚠ a página apontar para OUTRO host | ⚠ **CRIME** |
| ⚠ induzir OUTRA pessoa | ⚠ **CRIME** |
| ⚠ usar o desync para ACESSAR algo | ⚠ **CRIME** |

## ⚠ e a segunda linha é crime autônomo
uma página que induz o navegador de TERCEIRO a mandar
requisição não autorizada é **CSRF** —
e agrava o smuggling.
✓ é crime ALÉM do 154-A.

## O que medir
| Medição | Como | Sinal |
|---|---|---|
| o corpo ficou no socket? | log do servidor | o path da 2ª |
| ⚠ a 2ª saiu PREFIXADA? | ⚠ o path no log | ⚠ DESYNC |
| o navegador reusou? | a mesma conexão | necessário |
| o atacante leu algo? | ⚠ não pode (CORS) | — |

## ⚠ A REGRA
você é o ATACANTE e a VÍTIMA.
a página, o navegador e o servidor são SEUS.
✓ e é a única forma LÍCITA de estudar isto.
EOF

cat medicao.md

echo
echo "═══ 6. a página, e o servidor que responde antes de ler ═══"
echo
cat > alvo-cl0.py <<'PY'
#!/usr/bin/env python3
"""
alvo-cl0.py — um servidor que RESPONDE ANTES DE LER O CORPO.

⚠ é o comportamento que cria a divergência INTERNA
   (módulo 3, variante CL.0).
⚠ DIDÁTICO e LOCAL (127.0.0.1). nunca aponte para terceiro.
"""
import socket, sys, threading, os

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8100
LOG = os.path.expanduser("~/smuggle-lab/evidencia/cl0.log")

_c, _lock = 0, threading.Lock()


def atende(cli):
    global _c
    try:
        while True:
            # ── lê SÓ o cabeçalho ──
            dados = b""
            while b"\r\n\r\n" not in dados:
                b = cli.recv(1)
                if not b: return
                dados += b
            fim = dados.index(b"\r\n\r\n") + 4
            cab = dados[:fim].decode(errors="replace")
            primeira = cab.split("\r\n")[0]
            path = primeira.split(" ")[1] if len(primeira.split(" ")) > 1 else "/"

            with _lock:
                _c += 1
                n = _c

            # ⚠ RESPONDE ANTES DE LER O CORPO — é o comportamento do CL.0
            with open(LOG, "a") as f:
                f.write(f"\n═══ requisição #{n} ═══\n")
                f.write(f"PRIMEIRA_LINHA: {primeira}\nPATH: {path}\n")
                f.write("⚠ RESPONDEU SEM LER O CORPO\n")

            print(f"  [alvo #{n}] {primeira[:50]}  path={path[:40]}", flush=True)
            print(f"      ⚠ respondeu SEM ler o corpo", flush=True)

            r = f"OK #{n} {path}".encode()
            cli.sendall(b"HTTP/1.1 200 OK\r\nContent-Length: "
                        + str(len(r)).encode()
                        + b"\r\nConnection: keep-alive\r\n\r\n" + r)
            # ⚠ e volta ao topo do loop: o próximo "\r\n\r\n" será
            #    encontrado DENTRO do corpo que não foi lido.
    except Exception:
        pass
    finally:
        try: cli.close()
        except Exception: pass


def main():
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    open(LOG, "w").close()
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(5)
    print(f"═══ ALVO CL.0 em {HOST}:{PORT} ═══")
    print(f"  log: {LOG}")
    print("  ⚠ responde ANTES de ler o corpo (é o comportamento explorado)")
    print("  ⚠ local, didático. nunca aponte para terceiro.")
    print()
    while True:
        cli, _ = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x alvo-cl0.py

cat > pagina-atacante.html <<'HTML'
<!DOCTYPE html>
<!--
  ⚠ LABORATÓRIO LOCAL.
     esta página só deve apontar para 127.0.0.1.
     ⚠ apontá-la para outro host, ou induzir outra pessoa
        a abri-la, é CRIME.
-->
<title>Lab — client-side desync (local)</title>
<h1>Lab: client-side desync</h1>
<pre id="out">aguardando...</pre>
<script>
const OUT = document.getElementById("out");
const log = (s) => { OUT.textContent += "\n" + s; };

// ⚠ O ALVO É LOCAL. trocar isto é sair do lab.
const ALVO = "http://127.0.0.1:8100";

async function ataca() {
  log("1. mandando a requisição com corpo 'envenenado'...");
  try {
    // ⚠ a 1ª: o servidor responde SEM ler o corpo.
    //    e o corpo FICA no socket da conexão.
    await fetch(ALVO + "/primeira", {
      method: "POST",
      mode: "no-cors",
      body: "X",
      headers: { "Content-Type": "text/plain" },
    });
  } catch (e) { log("   (a 1ª deu erro — normal em no-cors)"); }

  log("2. esperando...");
  await new Promise(r => setTimeout(r, 300));

  log("3. mandando a SEGUNDA na mesma conexão...");
  log("   ⚠ se o reuso ocorreu, ela sai PREFIXADA.");
  try {
    await fetch(ALVO + "/segunda", { mode: "no-cors" });
  } catch (e) { log("   (a 2ª deu erro — normal em no-cors)"); }

  log("");
  log("⚠ agora veja o LOG DO SERVIDOR:");
  log("   ~/smuggle-lab/evidencia/cl0.log");
  log("   · se a 2ª requisição tem um PATH estranho, houve desync");
  log("   · ⚠ e o PATH estranho é a prova literal");
}

ataca();
</script>
HTML

echo "  ── os dois prontos ──"
ls -1 alvo-cl0.py pagina-atacante.html | sed 's/^/     /'
echo
echo "  ── PARA RODAR ──"
cat <<'EXPL'
     # terminal 1 — o alvo
     python3 ~/smuggle-lab/mod07/alvo-cl0.py 8100

     # terminal 2 — o log
     tail -f ~/smuggle-lab/evidencia/cl0.log

     # terminal 3 — servir a página
     cd ~/smuggle-lab/mod07 && python3 -m http.server 8101 --bind 127.0.0.1

     # e ABRA NO SEU NAVEGADOR:
     #   http://127.0.0.1:8101/pagina-atacante.html
EXPL
```

⚠ **O alvo `CL.0` é o servidor que **responde sem ler o corpo**.** **E é aí que o corpo fica no
socket** — **e o desync é interno.**

⚠ **E a nota no HTML é a conduta:** **a página só aponta para 127.0.0.1.** **Apontá-la para fora é
crime** — **e induzir alguém a abri-la é CSRF, crime autônomo.**

**Produza `alvo-cl0.md`:**

| Componente | Onde | Alvo |
|---|---|---|
| Servidor | | |
| Página | | |
| Navegador | | |

**Responda:**

1. **O que o alvo faz de diferente?** Por que cria o desync?
2. **Onde o corpo fica?**
3. **Por que a página só aponta para local?**
4. **Quem é a vítima** neste lab?

---

## 7.4 LAB — O client-side no seu navegador

**Duração:** 120 min

### Passo 1 — Suba o alvo e a página (40 min)

```bash
cd ~/smuggle-lab/mod07

echo "═══ SUBINDO ═══"
echo
cat <<'EXPL'
  ── TRÊS TERMINAIS, TODOS EM 127.0.0.1 ──

     1. o alvo CL.0        → 127.0.0.1:8100
     2. o log              → ~/smuggle-lab/evidencia/cl0.log
     3. a página           → 127.0.0.1:8101

  ── ⚠ E A VERIFICAÇÃO DE ISOLAMENTO ──
     · a página aponta SÓ para 127.0.0.1
     · o alvo escuta SÓ em 127.0.0.1
     · e o navegador é SEU
EXPL

echo "  ── verificação: a página aponta para fora? ──"
if grep -nE 'https?://(?!127\.0\.0\.1|localhost)' pagina-atacante.html 2>/dev/null | grep -q .; then
    echo "     ⚠⚠ ATENÇÃO: há URL externa na página:"
    grep -nE 'https?://' pagina-atacante.html | grep -viE '127\.0\.0\.1|localhost' | sed 's/^/       /'
else
    echo "     ✓ a página aponta só para 127.0.0.1"
fi
echo

cat > evidencia/client-side.md <<'EOF'
# Evidência — client-side desync

## 1. Os componentes (TODOS locais)
| Componente | Endereço | ⚠ Terceiro? |
|---|---|---|
| alvo CL.0 | 127.0.0.1:8100 | **NÃO** |
| página | 127.0.0.1:8101 | **NÃO** |
| navegador | o meu | — |
| ⚠ a vítima | ⚠ **EU** | — |

## 2. O isolamento
| Item | Valor |
|---|---|
| a página aponta p/ fora? | ⚠ **NÃO** |
| o alvo escuta só em | 127.0.0.1 |
| induzi alguém? | ⚠ **NÃO** |

## 3. O que o alvo faz
| Item | Valor |
|---|---|
| responde antes de ler o corpo? | ✓ sim |
| a conexão é keep-alive? | ✓ sim |

## 4. A observação
| # | O que vi no log | Significa |
|---|---|---|
| 1 | | |
| 2 | | |

## 5. ⚠ A prova
| Item | Valor |
|---|---|
| o PATH da 2ª requisição | |
| ⚠ o path é o esperado? | |
| ⚠ houve prefixo? | |

## 6. O log literal
```
[cole o log]
```

## 7. ⚠ O que eu NÃO fiz
- [ ] a página não aponta para nenhum host externo
- [ ] não induzi nenhuma outra pessoa a abrir a página
- [ ] não usei o desync para acessar nada
- [ ] não publiquei nada

## 8. O que NÃO foi verificado
⚠ mínimo 3
EOF

cat evidencia/client-side.md
```

⚠ **A verificação automática da página é a garantia técnica.** **E ela é o equivalente ao teste de
saída do módulo 4 do Parser Differentials:** **uma propriedade que se verifica.**

⚠ **E a ficha declara que a vítima é você** — **porque é a condição de licitude do módulo.**

**Produza `lab-montado.md`:**

| Componente | Endereço | Terceiro? |
|---|---|---|
| Alvo | | |
| Página | | |
| Vítima | | |

**Responda:**

1. **A verificação da página passou?**
2. **O alvo responde antes de ler?** Confirme na config.
3. **Quem é a vítima?**
4. **O que você não fez?**

### Passo 2 — Abra no navegador e observe (50 min)

⚠ **Você é a vítima. E o log do servidor é a medida.**

```bash
cd ~/smuggle-lab/mod07

echo "═══ A OBSERVAÇÃO ═══"
echo
cat <<'EXPL'
  ── O QUE FAZER ──

     1. ⚠ abra o SEU navegador
     2. acesse:  http://127.0.0.1:8101/pagina-atacante.html
     3. e OLHE O LOG:  tail -f ~/smuggle-lab/evidencia/cl0.log

  ── O QUE OBSERVAR ──
     · quantas requisições o alvo registrou?
     · ⚠ os PATHS estão certos?
     · ⚠ ou o 2º path tem LIXO na frente?

  ── ⚠ E O SINAL DO DESYNC ──
     o alvo respondeu sem ler o corpo "X".
     e o corpo ficou no socket.
     → a 2ª requisição saiu PREFIXADA com esse corpo.
     ⚠ o PATH registrado terá o prefixo, ou virá errado.

  ── ⚠ SE NÃO ACONTECEU ──
     o navegador pode NÃO ter reusado a conexão.
     ✓ tente: menos delay entre as duas; ou uma 3ª requisição.
     ⚠ e é HONESTO registrar "não reproduzi" — o reuso é heurístico.
EXPL

cat > caderno/PD-007.md <<'EOF'
# PD-007 — client-side desync

**Data:** ____

## 1. Os componentes
| Componente | Endereço |
|---|---|
| alvo CL.0 | 127.0.0.1:8100 |
| página | 127.0.0.1:8101 |
| navegador | o meu |

## 2. As condições
| # | Condição | Resultado |
|---|---|---|
| 1 | conexão persistente | |
| 2 | ⚠ o servidor discorda de si mesmo | |
| 3 | o navegador pode ser induzido | ✓ (é o meu) |
| 4 | requisição controlável | ✓ (o fetch) |
| 5 | o servidor responde antes de ler | ✓ |

## 3. O que o alvo registrou
| # | Requisição | PATH | ⚠ Esperado? |
|---|---|---|---|
| 1 | primeira | /primeira | |
| 2 | segunda | /segunda | |
| 3 | ? | ? | |

## 4. ⚠ O desync
| Item | Valor |
|---|---|
| a 2ª saiu prefixada? | |
| o path tem lixo? | |
| ⚠ reproduzi? | sim / **não** |
| se não, por quê (o reuso) | |

## 5. A evidência literal
```
[o log do alvo]
```

## 6. Os três níveis
| Nível | Resposta |
|---|---|
| 1 — o que discorda | |
| 2 — por que importa | |
| 3 — o invariante | |

## 7. A classificação
| Item | Valor |
|---|---|
| categoria | |
| quem corrige | o produto (o parser do pool) |

## 8. ⚠ O que eu NÃO fiz
- [ ] a página não apontou para fora
- [ ] não induzi outra pessoa
- [ ] não usei o desync para acessar nada
- [ ] não publiquei

## 9. O que NÃO foi verificado
⚠ mínimo 3
EOF

cat caderno/PD-007.md | head -30
```

⚠ **A honestidade sobre o reuso é o item mais importante.** **Se não reproduziu, você registra
"não"** — **porque o reuso da conexão é **heurístico** — **e um relatório que diz "sempre funciona"
é falso.**

⚠ **E a terceira linha da tabela — "?"** — é deliberada:** **o desync pode produzir uma requisição
**a mais**, com um path que ninguém pediu.**

**Produza `observacao.md`:**

| # | Requisição | Path | Esperado? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

**Responda:**

1. **O alvo registrou quantas requisições?
2. **A 2ª saiu prefixada?** Com lixo?
3. **Você reproduziu?** Se não, o que fazer?
4. **Qual o invariante violado?**

### Passo 3 — Documente (30 min)

Produza `relatorio-client-side.md`:

```markdown
# Relatório — client-side desync

## 1. Os componentes
| Componente | Endereço | Versão | ⚠ Terceiro? |
|---|---|---|---|
| alvo | | | **NÃO** |
| página | 127.0.0.1:____ | — | **NÃO** |
| navegador | | | — |

## 2. O isolamento
| Item | Valor |
|---|---|
| a página aponta p/ fora? | **NÃO** |
| a vítima | ⚠ **eu mesmo** |
| induzi alguém? | **NÃO** |

## 3. O que o alvo faz
| Item | Valor |
|---|---|
| responde antes de ler o corpo | ✓ |
| conexão | keep-alive |

## 4. A página (literal)
```
[as linhas que fazem o fetch]
```

## 5. O log do alvo (literal — a prova)
```
[cole]
```

## 6. A medida
| # | Requisição | PATH | ⚠ Prefixada? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 7. ⚠ A reprodutibilidade
| Item | Valor |
|---|---|
| reproduzi? | sim / **não** |
| quantas tentativas | |
| se não — por quê | ⚠ o reuso do navegador é heurístico |

## 8. Os três níveis
| Nível | Resposta |
|---|---|
| 1 — o que discorda | |
| 2 — por que importa | |
| 3 — o invariante | |

## 9. A classificação e o destino
| Item | Valor |
|---|---|
| categoria | |
| ⚠ destinatário | o produto (o parser do pool) |

## 10. ⚠ O que eu NÃO fiz
- [ ] a página não apontou para host externo
- [ ] não induzi outra pessoa a abrir a página
- [ ] não usei o desync para acessar nada
- [ ] não publiquei
- [ ] não calculei severidade

## 11. O que NÃO foi verificado
⚠ mínimo 3

## 12. O que o mantenedor confirma
| # | Item |
|---|---|
| 1 | o front responde antes de ler o corpo? |
| 2 | o pool reusa a conexão com o corpo pendente? |
```

**Produza `relatorio-client-side.md`:**

| Item | Valor |
|---|---|
| Reproduziu? | |
| Prefixo? | |
| Invariante | |
| Destinatário | |

**Responda:**

1. **O log literal está no relatório?**
2. **Você declarou a reprodutibilidade?**
3. **Quem é o destinatário?** Por quê um só?
4. **O "não fiz" está completo?**

### Critérios de aceitação

- `navegador.md` com as **cinco** coisas que o navegador faz e onde cada uma diverge.
- Você explicou **o que a página consegue e não consegue**.
- Você explicou **por que o CORS não impede** o ataque.
- Você explicou **o que o stream permite** e como se liga ao módulo 9 do Parser Differentials.
- `comparacao.md` com as **duas** classes comparadas.
- Você explicou **o que muda no modelo** de camadas.
- Você explicou **quem são o frontend e o backend** aqui.
- `condicoes.md` com as **cinco** condições e quem provê cada.
- Você explicou **qual passo é o frágil** e por quê.
- `mecanismo.md` com os **cinco** passos e quem controla cada.
- `medicao.md` com o que **não** fazer — e a declaração de que é crime autônomo.
- O **alvo `CL.0`** subindo, em 127.0.0.1.
- A **página** apontando **só** para 127.0.0.1, com a verificação rodada.
- Você abriu a página **no seu navegador**.
- O **log do alvo** observado, com os paths registrados.
- Você declarou **honestamente se reproduziu**.
- `caderno/PD-007.md` com as **nove** seções.
- Você aplicou os **três níveis**.
- `relatorio-client-side.md` com as **doze** seções.
- Você identificou **o destinatário único**.
- ⚠ **Nenhuma outra pessoa envolvida.** Nenhum host externo.

---

## Avaliação

1. **O que muda no modelo** entre server-side e client-side?
2. **Quem manda o payload** no client-side?
3. **Quem é a vítima?**
4. **Qual o alcance?** E a restrição?
5. **Cite cinco coisas que o navegador faz.**
6. **O que a página consegue?** E o que não?
7. **Por que o CORS não impede** o ataque?
8. **O que o `fetch` com stream permite?**
9. **Como isso se liga ao módulo 9** do Parser Differentials?
10. **Cite as cinco condições** do client-side.
11. **Quem provê cada uma?**
12. **Por que a condição 2 muda o modelo?**
13. **Quem são o "frontend" e o "backend"** aqui?
14. **Cite os cinco passos** do mecanismo.
15. **Qual passo o atacante não controla?** Por quê?
16. **Por que o ataque é "às vezes"?
17. **Por que a página só pode apontar para local?**
18. **O que induzir outra pessoa configura?**
19. **O que o log do alvo revela?**
20. **Por que declarar "não reproduzi" é obrigatório?**

---

**Próximo:** [Módulo 8 — Desync de cache](modulo-08.md)
