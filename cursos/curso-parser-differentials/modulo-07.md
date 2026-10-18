# Módulo 7 — Discordância Entre Camadas

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Entender por que a discordância **entre camadas** supera a divergência entre produtos.
2. Identificar as **camadas** numa arquitetura real.
3. Montar **N servidores + um proxy** no lab.
4. Aplicar o método do `HTTP Garden` — comparar a relação, não os parsers.
5. Medir onde a cadeia **desvia** — e o que isso significa.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Um parser sozinho não tem bug. Um parser atrás de outro tem.** **A discordância entre camadas é
> o caso geral** — **e é o mais rendoso, porque as camadas nunca foram testadas como par.**

⚠ **E a diferença de método, que é o ponto:**

| Método | O que testa | Resultado |
|---|---|---|
| Fuzzing comum | ⚠ **Um** parser | O que ele erra sozinho |
| Diferencial entre produtos | Dois parsers do **mesmo tipo** | Divergência |
| ⚠ **Diferencial entre camadas** | ⚠ **A cadeia inteira** | ⚠ **O desvio** |

⚠ **A tese:** **o `HTTP Garden` não fuzzou um servidor; ele fuzzou a **relação entre N servidores** —
e achou 100+ bugs.** **É a diferença de método que faz o rendimento.**

⚠ **E o número, e ele é medido:**

| Trabalho | O que comparou | Achados |
|---|---|---|
| **HTTP Garden** | ⚠ **N implementações, entre si** | **100+ bugs · 68 corrigidos · 39 exploráveis** |
| **WAFFLED** | ⚠ **WAF ↔ servidor** | **120+ exploits · 5 WAFs** |

⚠ **Os dois são o mesmo método em contextos diferentes.** **O `HTTP Garden` compara pares de
servidores; o `WAFFLED` compara o filtro com o alvo.** **Em ambos, a pergunta é: "o que A entrega a
B, e o que B entende?"**

⚠ **E a razão de o rendimento ser maior:** **as camadas são desenvolvidas, testadas e mantidas em
**separado**.** **A relação entre elas é território de ninguém.**

---

## 7.1 O que é uma camada

⚠ **Camada, definido: qualquer componente que **lê e reescreve** a mensagem entre a origem e o
destino.**

| Camada | O que faz | ⚠ Por que diverge |
|---|---|---|
| **Proxy** | encaminha | ⚠ Repassa o que não entende |
| **WAF** | filtra | ⚠ Rígido onde compara |
| **Load balancer** | distribui | ⚠ Reencoda |
| **Cache** | armazena | ⚠ Normaliza para a chave |
| **CDN** | acelera | ⚠ Idem |
| **Cliente** | envia | ⚠ Manda o "normal" |
| **Servidor** | processa | ⚠ Tolerante |

⚠ **A coluna da direita é o mapa do módulo 2.** **Cada camada **quer** uma coisa — e o que ela quer
determina como ela parsa.**

⚠ **A tabela dos pares, por rendimento:**

| Par | Vem de | ⚠ Por que rende |
|---|---|---|
| Proxy ↔ servidor | Mesmo tipo de produto | ⚠ **Repasse ambíguo** |
| WAF ↔ servidor | Propósitos opostos | ⚠ **Filtro x processa** |
| Cache ↔ origem | Propósitos opostos | ⚠ **Chave x conteúdo** |
| CDN ↔ origem | Idem | ⚠ Idem |
| Cliente ↔ servidor | Idades diferentes | ⚠ **Antigo x novo** |

⚠ **A última linha é a mais subestimada.** **Um cliente antigo fala com um servidor novo** — **e cada
um tolera coisas diferentes.** **É a origem histórica de quase toda ambiguidade do HTTP.**

⚠ **A regra escrita:**

> **Onde há duas camadas, há uma relação não testada.** **E onde a relação não foi testada, a
> divergência sobrevive** — **mesmo que cada camada, isolada, esteja correta.**

```bash
mkdir -p ~/parser-lab/mod07 && cd ~/parser-lab/mod07

echo "═══ 1. o que é uma camada ═══"
echo
cat > camadas.md <<'EOF'
# O que é uma camada

## Definição
⚠ qualquer componente que LÊ e REESCREVE a mensagem
   entre a origem e o destino.

## As camadas e o que cada uma quer
| Camada | Faz | ⚠ Por que diverge |
|---|---|---|
| PROXY | encaminha | repassa o que não entende |
| WAF | filtra | rígido onde COMPARA |
| LOAD BALANCER | distribui | reencoda |
| CACHE | armazena | normaliza para a CHAVE |
| CDN | acelera | idem |
| CLIENTE | envia | manda o "normal" |
| SERVIDOR | processa | ⚠ TOLERANTE |

## Os pares, por rendimento
| Par | Vem de | Por que rende |
|---|---|---|
| proxy ↔ servidor | mesmo tipo | ⚠ repasse ambíguo |
| WAF ↔ servidor | propósitos opostos | ⚠ filtro × processa |
| cache ↔ origem | propósitos opostos | ⚠ chave × conteúdo |
| cliente ↔ servidor | idades diferentes | ⚠ antigo × novo |

## ⚠ A REGRA
onde há duas camadas, há uma RELAÇÃO NÃO TESTADA.
e onde a relação não foi testada, a divergência sobrevive —
✓ mesmo que cada camada, ISOLADA, esteja correta.
EOF

cat camadas.md

echo
echo "═══ 2. o método do HTTP Garden ═══"
echo
cat <<'EXPL'
  ── O QUE ELE FEZ ──

     1. subiu N servidores HTTP, cada um com a SUA implementação
     2. escreveu um harness que manda a MESMA requisição a todos
     3. ⚠ e comparou as RESPOSTAS

  ── O QUE ISSO MUDA ──
     · fuzzing comum: "este servidor crasha?"
     · HTTP Garden:    ⚠ "estes N discordam?"

  ── E O NÚMERO ──
     · 100+ bugs
     · 68 corrigidos
     · ⚠ 39 EXPLORÁVEIS

  ── A LIÇÃO ──
     ⚠ não é o fuzzer que faz o trabalho. é a COMPARAÇÃO.
     ✓ e ele compara a RELAÇÃO, não os parsers.

  ── E A LIGAÇÃO COM O CURSO ──
     ✓ é EXATAMENTE o harness do módulo 5 —
       com N implementações em vez de 2.
EXPL
```

⚠ **O método do `HTTP Garden` é o harness do módulo 5 aplicado a servidores.** **Não há técnica
nova** — **há escopo.**

⚠ **E a lição econômica é a do curso:** **não é o fuzzer que faz o trabalho; é a comparação.** **Você
já construiu o instrumento — o que muda aqui é o alvo.**

**Produza `camadas.md`:**

| Camada | Faz | Por que diverge |
|---|---|---|
| Proxy | | |
| WAF | | |
| Cache | | |

**Responda:**

1. **O que define uma camada?**
2. **Qual par rende mais?** Por quê?
3. **O que o `HTTP Garden` mudou** em relação ao fuzzing comum?
4. **Qual instrumento do curso ele é?**

---

## 7.2 Montando a cadeia no lab

⚠ **O lab do módulo: **N servidores + um proxy**, todos locais, em container sem rede.**

| Componente | Como | ⚠ Isolamento |
|---|---|---|
| **2+ servidores** | nginx, apache, `python -m http.server` | Container |
| **1 proxy** | nginx como proxy reverso | Container |
| **O harness** | O do módulo 5 | — |
| ⚠ **Sem saída** | `--network none` | ⚠ **Obrigatório** |

⚠ **A tabela do que usar, por facilidade:**

| Componente | Mais fácil | Mais realista |
|---|---|---|
| Servidor | `python3 -m http.server` | nginx |
| Servidor 2 | `h11` em script | apache |
| Proxy | `h11` em script | nginx / haproxy |
| WAF | Script didático | ⚠ **Não use produto real** |

⚠ **A linha do WAF merece a nota.** **O curso usa um WAF **didático** — um script que filtra por
assinatura.** **Produtos reais exigem licença e config complexa**, **e o método funciona igual com
um script.** **O `WAFFLED` comparou produtos; você compara o conceito.**

⚠ **E a nota do isolamento é obrigatória.** **Um lab com saída de rede é um lab que pode alcançar
terceiros por acidente** — **e o teste do módulo 4 existe para isso.**

⚠ **A regra escrita:**

> **A cadeia é o alvo.** **Você não precisa de produtos reais** — **precisa de duas implementações
> que **discordem**, e de um caminho entre elas.**

```bash
cd ~/parser-lab/mod07

echo "═══ 3. a cadeia no lab ═══"
echo
cat > cadeia.md <<'EOF'
# A cadeia no lab

## O desenho
```
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │ CLIENTE │ ─────► │ CAMADA  │ ─────► │ SERVIDOR│
   │ (script)│        │ (proxy) │        │ (nginx) │
   └─────────┘        └─────────┘        └─────────┘
        ⚠ tudo em localhost / container sem rede
```

## Os componentes
| Componente | Versão fácil | Versão realista |
|---|---|---|
| servidor 1 | python3 -m http.server | nginx |
| servidor 2 | script com h11 | apache |
| proxy | script com h11 | nginx / haproxy |
| ⚠ WAF | script didático | ⚠ NÃO use produto real |

## ⚠ o isolamento (módulo 4)
| Item | Valor |
|---|---|
| rodam em | localhost / container |
| rede de saída | ⚠ NENHUMA |
| teste | curl que FALHA |

## Por que o WAF didático basta
o método funciona igual com um script.
⚠ o WAFFLED comparou PRODUTOS; você compara o CONCEITO.

## ⚠ A REGRA
a CADEIA é o alvo.
você precisa de duas implementações que DISCORDEM
e de um caminho entre elas.
EOF

cat cadeia.md

echo
echo "═══ 4. um proxy didático, em trinta linhas ═══"
echo
cat > proxy_didatico.py <<'PY'
#!/usr/bin/env python3
"""
proxy_didatico.py — um proxy que lê com UMA regra e repassa.

⚠ o ponto do módulo: ele lê com a regra do CL,
   e o servidor de trás lê com a do TE.
   → os bytes que sobram viram a PRÓXIMA requisição.

⚠ DIDÁTICO e LOCAL. nenhum serviço externo.
"""
import socket, sys, threading

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8001
BACKEND = ("127.0.0.1", int(sys.argv[2]) if len(sys.argv) > 2 else 8000)

def le_cabecalho(sock):
    dados = b""
    while b"\r\n\r\n" not in dados:
        b = sock.recv(1)
        if not b: return None, b""
        dados += b
    return dados, dados

def parse_cl(cabecalho: bytes):
    """⚠ a regra do PROXY: o Content-Length vence."""
    texto = cabecalho.decode(errors="replace")
    for linha in texto.split("\r\n")[1:]:
        if linha.lower().startswith("content-length:"):
            try: return int(linha.split(":", 1)[1].strip())
            except ValueError: return 0
    return 0

def atende(cli):
    try:
        cab, _ = le_cabecalho(cli)
        if cab is None:
            cli.close(); return
        n = parse_cl(cab)
        corpo = b""
        while len(corpo) < n:
            b = cli.recv(n - len(corpo))
            if not b: break
            corpo += b

        # ⚠ o proxy VÊ uma requisição — e repassa cabeçalho + n bytes
        print(f"  [proxy] 1 requisição, CL={n}, corpo={len(corpo)}B", flush=True)

        with socket.create_connection(BACKEND, timeout=3) as be:
            be.sendall(cab + corpo)
            be.settimeout(3)
            try:
                while True:
                    d = be.recv(4096)
                    if not d: break
                    cli.sendall(d)
            except socket.timeout:
                pass
        cli.close()
    except Exception as e:
        print(f"  [proxy] erro: {type(e).__name__}", flush=True)
        try: cli.close()
        except Exception: pass

def main():
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(5)
    print(f"═══ PROXY DIDÁTICO em {HOST}:{PORT} → {BACKEND} ═══")
    print("  ⚠ regra adotada: Content-Length vence")
    print("  ⚠ local, didático. nenhum serviço externo.")
    print()
    while True:
        cli, addr = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()

if __name__ == "__main__":
    main()
PY

chmod +x proxy_didatico.py

echo "  ⚠ o proxy está pronto. ele lê com a regra do CL."
echo
echo "═══ 5. um servidor didático com a regra oposta ═══"
cat <<'EXPL'
  ── o servidor de trás lê com a regra do TE ──
     ✓ e é aí que a discordância aparece.

  ── COMO USAR ──
     1. suba um servidor de verdade atrás (python3 -m http.server 8000)
     2. rode o proxy:  python3 proxy_didatico.py 8001 8000
     3. ⚠ e mande a sequência do TE+CL pelo proxy
     4. veja quantas requisições o proxy CONTA

  ── E O QUE ISSO PROVA ──
     · o proxy conta 1
     · ⚠ e o servidor pode ver 2
     · ✓ é a discordância entre camadas
EXPL
```

⚠ **O proxy didático é o instrumento.** **Ele lê com a regra do `Content-Length`** — **e o servidor
atrás lê com a do `Transfer-Encoding`.** **A discordância é estrutural, e o proxy conta uma
requisição enquanto o servidor pode ver duas.**

⚠ **E a nota "DIDÁTICO e LOCAL" no cabeçalho do script é deliberada.** **O mesmo código, apontado
para um serviço de terceiro, é smuggling.** **A linha é o destino.**

**Produza `proxy.md`:**

| Item | Valor |
|---|---|
| Regra do proxy | |
| Regra do servidor | |
| Requisições contadas | |
| ⚠ Serviço externo? | |

**Responda:**

1. **Com qual regra o proxy lê?** E o servidor?
2. **Quantas requisições o proxy conta?** O servidor pode ver quantas?
3. **Por que o WAF didático basta?**
4. **O que o script garante** sobre terceiros?

---

## 7.3 Onde a cadeia desvia

⚠ **A medição do módulo: **em que ponto a cadeia deixa de concordar consigo mesma.****

| Medição | Como | ⚠ Sinal |
|---|---|---|
| **N de requisições** | Contador em cada camada | ⚠ Números diferentes |
| **Bytes no destino** | Comparar entrada e saída | ⚠ Byte que ninguém pôs |
| **O destino visto** | Logar o path | ⚠ Path que o atacante escolheu |
| **A resposta** | Comparar com o esperado | ⚠ Resposta não autorizada |

⚠ **A linha do "byte que ninguém pôs" é a mais reveladora.** **Se o destino recebe mais bytes do que
a origem mandou**, **alguém duplicou** — **e a duplicação é a discordância.**

⚠ **E a tabela do que cada desvio significa:**

| Você observou | Significa |
|---|---|
| Camada A contou 1, B contou 2 | ⚠ **Discordância de framing** |
| O destino recebeu path diferente | ⚠ **Normalização divergente** |
| O destino recebeu header que o cliente não mandou | ⚠ **Camada acrescentou** |
| O destino recebeu header que o filtro removeu | ⚠ **Ordem de normalização** |
| A resposta contém dado de outra requisição | ⚠⚠ **Cache poisoning** |

⚠ **A última linha é a mais grave.** **Se a resposta contém dado de outra requisição, a discordância
não é sobre o parsing — é sobre **identidade**.** **Duas requisições foram tratadas como uma.**

⚠ **A regra escrita:**

> **Você não procura o crash. Procura o ponto onde a cadeia discorda de si mesma** — **e a
> contagem de requisições e de bytes é o instrumento.**

```bash
cd ~/parser-lab/mod07

echo "═══ 6. medindo o desvio ═══"
echo
cat > mede-desvio.md <<'EOF'
# Onde a cadeia desvia

## O que medir
| Medição | Como | ⚠ Sinal |
|---|---|---|
| N de requisições | contador por camada | ⚠ números diferentes |
| bytes no destino | comparar entrada × saída | ⚠ byte que ninguém pôs |
| o destino visto | logar o path | ⚠ path não pedido |
| a resposta | comparar com o esperado | ⚠ resposta não autorizada |

## O que cada desvio significa
| Você observou | Significa |
|---|---|
| A contou 1, B contou 2 | ⚠ discordância de framing |
| o destino viu path diferente | ⚠ normalização divergente |
| header que o cliente não mandou | ⚠ a camada acrescentou |
| header que o filtro removeu | ⚠ ordem de normalização |
| ⚠ resposta com dado de outra req | ⚠⚠ identidade — CACHE POISONING |

## ⚠ a última é a mais grave
a discordância não é sobre o parsing — é sobre IDENTIDADE.
duas requisições foram tratadas como UMA.

## ⚠ A REGRA
você não procura o crash.
procura o ponto onde a cadeia DISCORDA DE SI MESMA.
✓ a contagem de requisições e de bytes é o instrumento.
EOF

cat mede-desvio.md

echo
echo "═══ 7. o contador, por camada ═══"
cat > contador.md <<'EOF'
# O contador por camada

## O desenho da medição

```
   CLIENTE                PROXY                SERVIDOR
      │                     │                     │
      │  envia 1 req        │                     │
      ├────────────────────►│                     │
      │                     │  conta: 1           │
      │                     │                     │
      │                     │  repassa N bytes    │
      │                     ├────────────────────►│
      │                     │                     │  conta: ?
      │                     │                     │
      ⚠ se o servidor contar 2, a discordância apareceu
```

## Como instrumentar
| Camada | O que logar |
|---|---|
| cliente | o que ele mandou (bytes) |
| proxy | quantas requisições ele contou |
| servidor | ⚠ quantas ele contou, e o PATH de cada |

## ⚠ o critério
· proxy = 1 e servidor = 1  → ✓ concorda
· proxy = 1 e servidor = 2  → ⚠⚠ DISCORDÂNCIA
· e o PATH da 2ª é o que o ATACANTE escolheu

## ⚠ e o que fazer com isso
reporte a discordância ao mantenedor do PROXY
e ao do SERVIDOR — ⚠ sem mencionar um ao outro.
EOF

cat contador.md
```

⚠ **O contador por camada é o instrumento.** **E ele é simples: você conta requisições em cada
ponto** — **e a diferença é a discordância.**

⚠ **E a nota final é a do módulo 10 do Patch Diffing:** **reporte a cada um, sem mencionar o
outro.** **Aqui, a regra é a mesma — e o número de destinatários é o número de camadas.**

**Produza `desvio.md`:**

| Medição | A | B | Desvia? |
|---|---|---|---|
| N de requisições | | | |
| Bytes no destino | | | |
| Path visto | | | |

**Responda:**

1. **Quantas requisições cada camada contou?**
2. **O destino recebeu mais bytes do que a origem mandou?**
3. **Qual desvio apareceu?** O que significa?
4. **A quem reportar?** A quem **não** mencionar?

---

## 7.4 LAB — A cadeia completa

**Duração:** 120 min

### Passo 1 — Monte a cadeia (45 min)

⚠ **Um servidor + um proxy. Os dois locais.**

```bash
cd ~/parser-lab/mod07

echo "═══ MONTANDO A CADEIA ═══"
echo
cat <<'EXPL'
  ── O QUE SUBIR ──

     1. um SERVIDOR atrás
        · o mais fácil: python3 -m http.server 8000
        ⚠ ele serve arquivos — suficiente para ver o PATH

     2. um PROXY na frente
        · o proxy_didatico.py (regra do CL)
        · rodando na 8001, apontando para 8000

     3. o CLIENTE
        · um script que manda a sequência do TE+CL

  ── ⚠ E O ISOLAMENTO ──
     tudo em 127.0.0.1. nenhuma rede de saída.
     e o teste: um curl que FALHA (módulo 4).
EXPL

cat > cliente_teste.py <<'PY'
#!/usr/bin/env python3
"""
cliente_teste.py — manda UMA sequência ao proxy e mede o que acontece.

⚠ DIDÁTICO. aponta para 127.0.0.1, nunca para terceiro.
"""
import socket, sys

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8001

# ⚠ a sequência do caso clássico: TE + CL, com uma requisição "escondida"
SEQ = (
    b"POST / HTTP/1.1\r\n"
    b"Host: localhost\r\n"
    b"Content-Length: 6\r\n"
    b"Transfer-Encoding: chunked\r\n"
    b"\r\n"
    b"0\r\n"
    b"\r\n"
    b"GET /nao-autorizado HTTP/1.1\r\n"
    b"Host: localhost\r\n"
    b"\r\n"
)

def main():
    print("═══ CLIENTE DE TESTE ═══")
    print()
    print(f"  alvo      : {HOST}:{PORT}   ⚠ local")
    print(f"  sequência : {len(SEQ)} bytes")
    print()

    # ── o que o cliente MANDA ──
    header_end = SEQ.find(b"\r\n\r\n") + 4
    print("  ── o que o cliente manda ──")
    print(f"     1ª linha : {SEQ.split(b'\\r\\n')[0].decode()}")
    # conta o que o cliente CONSIDERA uma requisição
    print(f"     bytes    : {len(SEQ)}")
    print(f"     1ª requisição declarada: POST / (CL=6)")
    print(f"     ⚠ e o resto: GET /nao-autorizado")
    print()

    try:
        with socket.create_connection((HOST, PORT), timeout=5) as s:
            s.sendall(SEQ)
            s.settimeout(3)
            resp = b""
            try:
                while True:
                    d = s.recv(4096)
                    if not d: break
                    resp += d
            except socket.timeout:
                pass
        print("  ── o que voltou ──")
        if resp:
            print(f"     {resp[:120].decode(errors='replace')!r}")
        else:
            print("     (vazio — o timeout ocorreu)")
    except ConnectionRefusedError:
        print("  ⚠ o proxy não está rodando. suba-o primeiro:")
        print("     python3 proxy_didatico.py 8001 8000")
    except Exception as e:
        print(f"  ⚠ {type(e).__name__}")

    print()
    print("  ═══ O QUE OBSERVAR ═══")
    print("  · quantas requisições o PROXY logou?")
    print("  · ⚠ quantas o SERVIDOR logou?")
    print("  · e o PATH /nao-autorizado apareceu no servidor?")
    print()
    print("  ✓ se o proxy conta 1 e o servidor recebe o path escondido,")
    print("     a discordância entre camadas está DEMONSTRADA.")

if __name__ == "__main__":
    main()
PY

chmod +x cliente_teste.py

echo "  ── os três arquivos estão prontos ──"
ls -1 *.py | sed 's/^/     /'
echo
echo "  ── PARA RODAR (em três terminais, ou em background) ──"
cat <<'EXPL'
     # terminal 1 — o servidor
     python3 -m http.server 8000

     # terminal 2 — o proxy
     python3 proxy_didatico.py 8001 8000

     # terminal 3 — o cliente
     python3 cliente_teste.py 8001
EXPL
```

⚠ **O cliente de teste é o instrumento.** **Ele manda a sequência, e o proxy loga uma requisição** —
**e o servidor pode receber duas.** **A demonstração é a contagem.**

⚠ **E a nota "alvo: 127.0.0.1" no script é a garantia.** **O mesmo código apontado para fora é
smuggling** — **e o comentário registra isso.**

**Produza `cadeia-montada.md`:**

| Componente | Porta | Regra |
|---|---|---|
| Servidor | | |
| Proxy | | |
| Cliente | | |

**Responda:**

1. **Os três estão rodando?**
2. **Quantas requisições o proxy contou?**
3. **O servidor recebeu o path escondido?**
4. **O alvo é local?** Confirme.

### Passo 2 — Meça o desvio (50 min)

⚠ **A medição do §7.3, com a cadeia rodando.**

```bash
cd ~/parser-lab/mod07

echo "═══ MEDINDO O DESVIO ═══"
echo
cat <<'EXPL'
  ── COM A CADEIA RODANDO, OBSERVE ──

     NO PROXY (terminal 2):
        [proxy] 1 requisição, CL=6, corpo=6B
        ⚠ o proxy conta UMA

     NO SERVIDOR (terminal 1), a linha do GET:
        "GET /nao-autorizado HTTP/1.1" 404 -
        ⚠ se esta linha aparecer, o servidor VIU a 2ª

  ── E É ISSO A DISCORDÂNCIA ──
     · o proxy contou 1
     · o servidor processou 2
     · ⚠ e a 2ª não passou por filtro nenhum

  ── O QUE REGISTRAR ──
     · a contagem de cada camada
     · o path que o servidor viu
     · ⚠ e a linha de log LITERAL (é a evidência)
EXPL

cat > caderno/PD-007.md <<'EOF'
# PD-007 — discordância entre camadas

**Data:** ____

## 1. A cadeia
| Camada | Implementação | Versão | Regra de framing |
|---|---|---|---|
| cliente | cliente_teste.py | didático | — |
| proxy | proxy_didatico.py | didático | ⚠ CL |
| servidor | | | ⚠ TE |

## 2. O isolamento
| Item | Valor |
|---|---|
| tudo em | 127.0.0.1 |
| rede de saída | ⚠ NENHUMA |
| teste que falha | [ ] feito |

## 3. A medição
| Camada | N de requisições | Paths vistos |
|---|---|---|
| cliente (mandou) | 1 | POST / |
| proxy (contou) | | |
| servidor (processou) | | |

## 4. A evidência literal
```
[proxy]
[servidor]
```

## 5. O desvio
| Item | Valor |
|---|---|
| Onde a cadeia discordou | |
| Quantas req. cada camada contou | |
| O path escondido apareceu? | |

## 6. As três perguntas críticas (módulo 6.4)
| # | Alcançável? | Camada normaliza? | Bytes → mensagem? |
|---|---|---|---|
| 1 | | | |

## 7. A classificação (módulo 3)
| Item | Valor |
|---|---|
| Q1 a spec decide? | |
| Q2 as duas seguem? | |
| Categoria | |
| Destino | proxi e servidor — ⚠ separadamente |

## 8. ⚠ O que eu NÃO fiz
- [ ] não apontei o proxy para nenhum serviço externo
- [ ] não usei nenhum host que não seja 127.0.0.1
- [ ] não construí exploit de smuggling
- [ ] não verifiquei o impacto em produção

## 9. O que o mantenedor precisa confirmar
| # | Item |
|---|---|
| 1 | a cadeia existe assim em produção? |
| 2 | há outra camada que rejeita? |
EOF

cat caderno/PD-007.md | head -32
```

⚠ **A contagem é a prova.** **Proxy conta 1, servidor processa 2** — **e a segunda não passou por
filtro.** **Não é preciso construir exploit: a discordância está medida.**

⚠ **E a linha do path escondido no log do servidor é a evidência.** **É literal, reproduzível, e não
depende de interpretação.**

**Produza `desvio-medido.md`:**

| Camada | Requisições | Paths |
|---|---|---|
| Cliente | | |
| Proxy | | |
| Servidor | | |

**Responda:**

1. **Quantas requisições cada camada contou?**
2. **O path escondido apareceu no servidor?**
3. **A evidência é literal?** Onde ela está?
4. **A quem reportar?** Quantos destinatários?

### Passo 3 — Documente (25 min)

Produza `relatorio-camadas.md`:

```markdown
# Relatório de discordância entre camadas

## 1. A cadeia
| Camada | Implementação | Versão | ⚠ Regra |
|---|---|---|---|
| cliente | | | |
| proxy | | | |
| servidor | | | |

## 2. O lab e o isolamento
| Item | Valor |
|---|---|
| Endereços | 127.0.0.1 |
| Rede de saída | ⚠ NENHUMA |
| Teste de isolamento | |

## 3. A entrada
| Item | Valor |
|---|---|
| Bytes | |
| O que o CL declara | |
| O que o TE declara | |
| ⚠ O que sobra | |

## 4. A medição
| Camada | Contou | Viu |
|---|---|---|
| cliente | | |
| proxy | | |
| servidor | | |

## 5. A evidência literal
```
comando
```
```
saída
```

## 6. O invariante violado
| Item | Valor |
|---|---|
| O invariante de framing (módulo 6.2) | |
| Como foi violado | |

## 7. A classificação
| Item | Valor |
|---|---|
| Categoria (módulo 3) | |
| Consequência objetiva | |
| Destinatários do reporte | |

## 8. ⚠ O que eu NÃO fiz
- [ ] apontei para terceiro
- [ ] construí exploit
- [ ] testei em produção
- [ ] calculei a severidade

## 9. O que o mantenedor confirma
| # | Item |
|---|---|
| 1 | a cadeia existe? |
| 2 | outra camada rejeita? |

## 10. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `relatorio-camadas.md`:**

| Item | Valor |
|---|---|
| Cadeia | |
| Contagem | |
| Categoria | |
| **O que não fiz** | |

**Responda:**

1. **A contagem está registrada?**
2. **A categoria é 3?** Por quê?
3. **Quantos destinatários** o reporte tem?
4. **O que não foi verificado?**

### Critérios de aceitação

- `camadas.md` com a definição e as **sete** camadas.
- Você explicou **o que cada camada quer** e por que isso diverge.
- Você comparou **fuzzing comum, diferencial de produto, e diferencial de camada**.
- Você explicou **o que o `HTTP Garden` mudou**.
- Você explicou **qual instrumento do curso ele é**.
- `cadeia.md` com o desenho das camadas.
- Você explicou **por que o WAF didático basta**.
- `proxy_didatico.py` com a regra declarada no cabeçalho.
- Você explicou **qual regra o proxy adota** e qual o servidor.
- `mede-desvio.md` com as **quatro** medições.
- Você explicou **o desvio mais grave** (identidade).
- O **contador por camada** instrumentado.
- A cadeia **montada e rodando** em 127.0.0.1.
- Você mediu **a contagem de requisições** em cada camada.
- Você verificou **se o path escondido apareceu** no servidor.
- `caderno/PD-007.md` com as **nove** seções.
- `relatorio-camadas.md` com as **dez** seções.
- Você identificou **quantos destinatários** o reporte tem.
- ⚠ **Nenhum serviço externo.** Tudo em 127.0.0.1.

---

## Avaliação

1. **Por que um parser sozinho não tem bug?**
2. **O que define uma camada?**
3. **Cite cinco camadas** e o que cada uma quer.
4. **Qual par rende mais?** Por quê?
5. **Por que as camadas nunca foram testadas como par?**
6. **O que o `HTTP Garden` comparou?**
7. **Cite os números dele.**
8. **O que ele mudou** em relação ao fuzzing comum?
9. **Qual instrumento do curso ele é?** O que muda?
10. **O que o `WAFFLED` comparou?**
11. **Por que o WAF didático basta** para o método?
12. **Cite quatro medições de desvio.**
13. **Qual é o sinal mais revelador?** Por quê?
14. **O que significa a camada A contar 1 e a B contar 2?**
15. **O que significa o destino receber path diferente?**
16. **Qual desvio é o mais grave?** Por quê?
17. **O que é cache poisoning**, em termos de discordância?
18. **Como você instrumenta a contagem por camada?**
19. **Quantos destinatários** tem o reporte? Por quê?
20. **O que o proxy didático garante** sobre terceiros?

---

**Próximo:** [Módulo 8 — WAFs e o caso WAFFLED](modulo-08.md)
