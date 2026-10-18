# Módulo 6 — Framing

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 5

---

## ⚠ Este é o módulo onde o bug mora

⚠ **A afirmação que organiza tudo:**

> **Framing é a resposta à pergunta "onde a mensagem termina".** **E é a única discordância cujo
> efeito é objetivo:** **os bytes que sobram viram a próxima mensagem.**

⚠ **E é por isso que ele é o núcleo do curso.** **As outras discordâncias exigem que você julgue se
importam.** **Esta não:** **se dois parsers discordam sobre o limite, um deles vai ver uma segunda
mensagem onde o outro não vê.**

⚠ **A consequência, escrita:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ A MESMA SEQUÊNCIA DE BYTES                                           │
│                                                                      │
│   POST / HTTP/1.1\r\n                                                │
│   Host: alvo\r\n                                                     │
│   Content-Length: 6\r\n                                              │
│   Transfer-Encoding: chunked\r\n                                     │
│   \r\n                                                               │
│   0\r\n                                                              │
│   \r\n                                                               │
│   GET /admin HTTP/1.1\r\n                                            │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ A: o TE vence → ignora o CL → UMA mensagem (a sequência toda)         │
│ B: o CL vence → usa 6 bytes → ⚠ sobram os bytes do GET                │
└──────────────────────────────────────────────────────────────────────┘

⚠ B vê DUAS mensagens onde A vê UMA.
   e os bytes que sobram são do ATACANTE.
```

⚠ **A tese:** **você não precisa saber qual parser está certo.** **A discordância sobre o limite já
produz um efeito que o atacante controla.**

⚠ **E é literalmente o que o `HTTP Garden` mediu:** ele **não reportou toda discordância** —
reportou **discordância sobre o framing.** **É o filtro que torna o trabalho crível.**

⚠ **A distinção que este módulo estabelece:**

| Discordância | Efeito |
|---|---|
| Sobre o **valor** | ⚠ Local — raramente importa |
| Sobre o **erro** | ⚠ Cosmético |
| ⚠ **Sobre o LIMITE** | ⚠⚠ **Produz bytes que sobram** |
| ⚠ **Sobre o que conta** | ⚠⚠ **Produz uma segunda mensagem** |

---

## 6.1 O que é framing

⚠ **Framing, definido: **a regra que diz onde a mensagem começa e onde termina.****

| Formato | O que define o fim |
|---|---|
| **HTTP/1.1** | ⚠ `Content-Length` ou `Transfer-Encoding` |
| **HTTP/2** | O frame, com tamanho explícito |
| **Multipart** | O boundary |
| **Chunked** | O chunk de tamanho 0 |
| **WebSocket** | O opcode e o tamanho |
| **Mensagens de log** | A quebra de linha |
| **CSV** | ⚠ A quebra de linha — ou a aspa |

⚠ **A linha do CSV é a ponte com os módulos anteriores.** **Uma aspa não fechada muda onde a linha
termina** — **e um campo se torna vários.** **É framing, no nível do arquivo.**

⚠ **E a linha do WebSocket é o mesmo problema, outro contexto.** **Uma mensagem pode vir fragmentada,
e quem decide o fim é o opcode.** **Dois parsers podem discordar sobre o fragmento.**

⚠ **A tabela do que cada mecanismo de framing habilita:**

| Mecanismo | O que faz | ⚠ Como é abusado |
|---|---|---|
| `Content-Length` | Conta bytes | ⚠ Número mentiroso |
| `Transfer-Encoding` | Envia em blocos | ⚠ Precedência ambígua |
| **Os dois juntos** | ⚠ **Ambos definem** | ⚠⚠ **Smuggling** |
| Boundary | Separa partes | Boundary não encontrado |
| Chunk 0 | Termina | Chunk negativo |
| Opcode | Separa mensagens | Fragmento ambíguo |

⚠ **A linha "os dois juntos" é o centro.** **A spec diz o que fazer — e as implementações antigas não
seguem.** **É onde a discordância vive.**

⚠ **E a resolução da spec moderna:** **`Transfer-Encoding` vence.** **Mas:** **implementações
antigas usam o `Content-Length`** — **e proxies que falam com ambas repassam.** **É a divergência.**

⚠ **A regra escrita:**

> **Framing não é uma convenção; é o que decide quantas mensagens existem numa sequência de
> bytes.** **E "quantas" é a diferença entre uma requisição e duas.**

```bash
mkdir -p ~/parser-lab/mod06 && cd ~/parser-lab/mod06

echo "═══ 1. o que é framing ═══"
echo
cat > framing.md <<'EOF'
# O que é framing

## Definição
⚠ a regra que diz ONDE a mensagem começa e termina.

## O que define o fim, por formato
| Formato | O fim é definido por |
|---|---|
| HTTP/1.1 | ⚠ Content-Length ou Transfer-Encoding |
| HTTP/2 | o frame (tamanho explícito) |
| Multipart | o boundary |
| Chunked | o chunk de tamanho 0 |
| WebSocket | opcode + tamanho |
| CSV | ⚠ a quebra de linha — ou a aspa |

## Como o framing é abusado
| Mecanismo | Abuso |
|---|---|
| Content-Length | número mentiroso |
| Transfer-Encoding | precedência ambígua |
| ⚠ OS DOIS juntos | ⚠⚠ SMUGGLING |
| Boundary | boundary não encontrado |
| Chunked | chunk negativo |

## ⚠ a resolução da spec (e a divergência)
a spec moderna diz: Transfer-Encoding VENCE.
⚠ mas implementações antigas usam o Content-Length.
e proxies que falam com ambas repassam.
✓ é a divergência.

## ⚠ A REGRA
framing não é convenção.
é o que decide QUANTAS mensagens existem numa sequência de bytes.
e "quantas" é a diferença entre UMA requisição e DUAS.
EOF

cat framing.md

echo
echo "═══ 2. os três casos de divergência de framing ═══"
echo
cat <<'EXPL'
  ── CASO 1: O CL E O TE JUNTOS (o clássico) ──
     Content-Length: 6
     Transfer-Encoding: chunked

     · A: TE vence → lê em chunks → termina no chunk 0
     · B: CL vence → lê 6 bytes → ⚠ os outros viram a próxima

     ⚠ é o CASO CLÁSSICO (RFC 7230 §3.3.3)
        e a spec DIZ o que fazer — mas nem todos seguem.

  ── CASO 2: O CL DUPLICADO ──
     Content-Length: 6
     Content-Length: 10

     · A: usa o PRIMEIRO (6)
     · B: usa o ÚLTIMO (10)
     · C: ⚠ REJEITA

     ⚠ é SILÊNCIO (tipo 1) — a spec antiga não decidia.
        e a atual decidiu: rejeitar.

  ── CASO 3: O CL COM ESPAÇO OU SINAL ──
     Content-Length: 6      ← normal
     Content-Length:  6     ← com espaço
     Content-Length: +6     ← com sinal
     Content-Length: 0x6    ← em hex?

     · A: aceita " 6"
     · B: rejeita " 6"
     ⚠ e a spec diz "DEVE ser digit" — mas "digit" inclui "+"?

  ✓ cada um é uma divergência de ONDE A MENSAGEM TERMINA.
EXPL
```

⚠ **Os três casos são o currículo do módulo.** **E note que o caso 1 é o **mais conhecido e o menos
resolvido**:** **a spec diz o que fazer, e a divergência persiste porque implementações antigas não
seguem.**

⚠ **E o caso 2 é o que a spec **mudou** para resolver.** **Antes: silêncio. Agora: rejeitar.** **Mas
os servidores em produção são de antes.**

⚠ **A regra escrita:**

> **A spec resolve; as implementações antigas não sabem.** **E é entre a spec de hoje e as
> implementações de ontem que a discordância vive.**

**Produza `framing.md`:**

| Formato | O fim é definido por |
|---|---|
| HTTP/1.1 | |
| Multipart | |
| CSV | |

**Responda:**

1. **O que framing decide?**
2. **Por que "quantas" é a diferença crítica?**
3. **Qual caso é o clássico?** A spec o resolve?
4. **Por que a spec resolver não basta?**

---

## 6.2 Os três níveis, no framing

⚠ **O método dos três níveis (módulo 3 do curso de Patch Diffing) aplicado ao framing.**

| Nível | Pergunta | Exemplo (caso 1) |
|---|---|---|
| **1** | O que discorda? | Onde a mensagem termina |
| **2** | Por que isso importa? | ⚠ **Sobram bytes** |
| **3** | **Qual é o invariante violado?** | ⚠ **"Uma leitura consome tudo"** |

⚠ **O nível 3 é o invariante de framing, e ele vale para qualquer formato:**

> **A leitura de uma mensagem consome exatamente os bytes dela.** **Nada sobra, nada falta.**

⚠ **E é o que o caso 1 viola.** **A implementação que usa o `Content-Length` consome 6 bytes** — **e
os outros ficam.** **O invariante de que "tudo foi consumido" quebrou.**

⚠ **A aplicação a outros formatos:**

| Formato | O invariante de framing |
|---|---|
| HTTP | A leitura consome o corpo inteiro, e nada mais |
| CSV | Cada linha é um registro — e o mesmo número em todas |
| Multipart | As partes cobrem o corpo inteiro |
| Log | Cada linha é uma entrada |
| **WebSocket** | Cada frame é uma mensagem |

⚠ **A linha do CSV é a que você já testou no módulo 4.** **"As aspas soltas" muda onde a linha
termina** — **e um registro se torna dois.** **É o mesmo invariante, num formato inofensivo.**

⚠ **A regra escrita:**

> **Procure o invariante "tudo foi consumido" — ele é o que o ataque viola.** **E ele existe em
> qualquer formato com framing, não só no HTTP.**

```bash
cd ~/parser-lab/mod06

echo "═══ 3. o invariante de framing ═══"
echo
cat > invariante.md <<'EOF'
# O invariante de framing

## A frase
⚠ "a leitura de uma mensagem consome EXATAMENTE os bytes dela."
   nada sobra, nada falta.

## Por formato
| Formato | O invariante |
|---|---|
| HTTP | a leitura consome o corpo inteiro, e nada mais |
| CSV | cada linha é um registro — o mesmo número em todas |
| Multipart | as partes cobrem o corpo inteiro |
| Log | cada linha é uma entrada |
| WebSocket | cada frame é uma mensagem |

## Os três níveis (módulo 3 do Patch Diffing)
| Nível | Pergunta | Exemplo |
|---|---|---|
| 1 | o que discorda? | onde a mensagem termina |
| 2 | por que importa? | ⚠ sobram bytes |
| 3 | ⚠ o INVARIANTE | "uma leitura consome tudo" |

## ⚠ e ele existe em QUALQUER formato com framing
· no CSV: aspas soltas mudam onde a linha termina
  → um registro vira DOIS
· no multipart: boundary ambíguo → partes sobram
· no log: quebra de linha inesperada → duas entradas

✓ o instrumento é o mesmo, e o risco é que muda.
EOF

cat invariante.md

echo
echo "═══ 4. a consequência: o que sobra ═══"
echo
cat <<'EXPL'
  ┌──────────────────────────────────────────────────────────────┐
  │ A SEQUÊNCIA COMPLETA                                         │
  │                                                              │
  │   [ requisição do atacante ] [ requisição escondida ]        │
  │         └─ o proxy vê UMA ─┘                                 │
  │                                                              │
  ├──────────────────────────────────────────────────────────────┤
  │ O PROXY REPASSA                                              │
  │                                                              │
  │   ⚠ ele conta os bytes com UMA regra e repassa               │
  ├──────────────────────────────────────────────────────────────┤
  │ O SERVIDOR RECEBE                                            │
  │                                                              │
  │   ⚠ e conta com OUTRA regra                                  │
  │   → os bytes que sobraram são a PRÓXIMA requisição           │
  │   → e essa requisição NÃO passou pelo proxy                  │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ⚠ é o SMUGGLING:
     · o atacante esconde uma requisição dentro de outra
     · o proxy não a vê
     · e o servidor a executa
     ✓ o efeito é BYPASS de controle de acesso.
EXPL
```

⚠ **A cadeia proxy → servidor é o que torna o framing crítico.** **O atacante não precisa de um
parser quebrado** — **precisa de **dois** que discordem, e de um caminho que os ligue.**

⚠ **E é a razão de o módulo 7 vir depois.** **A discordância entre camadas é a condição necessária;
o framing é o que ela produz.**

**Produza `invariante.md`:**

| Formato | O invariante |
|---|---|
| HTTP | |
| CSV | |
| WebSocket | |

**Responda:**

1. **Qual é o invariante de framing?**
2. **O que ele viola no caso 1?**
3. **Por que ele vale em qualquer formato?**
4. **O que o atacante precisa** para explorar a discordância?

---

## 6.3 Medindo a discordância de framing

⚠ **A medição é objetiva: você conta as mensagens que cada parser vê.**

| Métrica | O que mede |
|---|---|
| **N de mensagens** | ⚠ **Quantas cada parser extrai** |
| **Bytes consumidos** | ⚠ **Quanto cada um leu** |
| **Bytes restantes** | ⚠ **O que sobrou — e é o bug** |
| A segunda mensagem | ⚠ **O que o atacante controla** |

⚠ **A linha dos bytes restantes é o instrumento.** **Se sobrou algo, alguém vai ler.** **E se o
parser seguinte é o servidor, ele executa.**

⚠ **A tabela do que medir, por caso:**

| Caso | O que medir | ⚠ O sinal |
|---|---|---|
| TE + CL | mensagens e bytes | ⚠ > 1 mensagem = bug |
| CL duplicado | mensagens | Usou 6 ou 10? |
| CL com espaço | aceitou? | ⚠ Discordância de parsing |
| Chunk malformado | consumiu tudo? | Sobrou? |

⚠ **E a medição se faz **no seu lab**, com os parsers do módulo 4.** **É o que o módulo 5
construiu** — **e aqui ele é aplicado ao framing.**

⚠ **A regra escrita:**

> **Framing se mede contando mensagens.** **"Quantas mensagens cada parser extraiu da mesma
> sequência?"** **Se a resposta difere, há discordância de framing — e ela é bug.**

```bash
cd ~/parser-lab/mod06

echo "═══ 5. medindo: quantas mensagens? ═══"
echo
cat > mede-framing.py <<'PY'
#!/usr/bin/env python3
"""
mede-framing.py — conta quantas MENSAGENS cada parser extrai
de uma sequência de bytes.

⚠ parsers LOCAIS, didáticos. nenhum serviço de terceiro.
"""
import struct

def parser_a(dados: bytes):
    """
    A — 'o Content-Length vence'.
    lê o CL, consome CL bytes, considera o resto como a PRÓXIMA mensagem.
    """
    mensagens = []
    resto = dados
    while resto:
        fim = resto.find(b"\r\n\r\n")
        if fim < 0:
            break
        cabecalho = resto[:fim].decode(errors="replace")
        cl = None
        for linha in cabecalho.split("\r\n"):
            if linha.lower().startswith("content-length:"):
                try: cl = int(linha.split(":", 1)[1].strip())
                except ValueError: cl = None
        if cl is None:
            break
        corpo = resto[fim+4:fim+4+cl]
        mensagens.append(cabecalho.split("\r\n")[0] + f"  [corpo={len(corpo)}B]")
        resto = resto[fim+4+cl:]
    return mensagens

def parser_b(dados: bytes):
    """
    B — 'o Transfer-Encoding vence'.
    se há TE, lê em chunks até o chunk 0.
    """
    mensagens = []
    resto = dados
    while resto:
        fim = resto.find(b"\r\n\r\n")
        if fim < 0:
            break
        cabecalho = resto[:fim].decode(errors="replace")
        tem_te = any(l.lower().startswith("transfer-encoding:") for l in cabecalho.split("\r\n"))
        resto_corpo = resto[fim+4:]
        if tem_te:
            # lê chunks até o chunk 0
            pos, total = 0, 0
            while pos < len(resto_corpo):
                nl = resto_corpo.find(b"\r\n", pos)
                if nl < 0: break
                try: tam = int(resto_corpo[pos:nl].split(b";")[0], 16)
                except ValueError: break
                pos = nl + 2
                if tam == 0:
                    pos += 2
                    break
                pos += tam + 2
                total += tam
            mensagens.append(cabecalho.split("\r\n")[0] + f"  [chunks={total}B]")
            resto = resto_corpo[pos:]
        else:
            break
    return mensagens

def main():
    # ⚠ a sequência do caso clássico
    seq = (
        b"POST / HTTP/1.1\r\n"
        b"Host: alvo\r\n"
        b"Content-Length: 6\r\n"
        b"Transfer-Encoding: chunked\r\n"
        b"\r\n"
        b"0\r\n"
        b"\r\n"
        b"GET /admin HTTP/1.1\r\n"
        b"Host: alvo\r\n"
        b"\r\n"
    )

    print("═══ MEDINDO FRAMING ═══")
    print()
    print(f"  a sequência tem {len(seq)} bytes")
    print()

    for nome, fn in [("A (CL vence)", parser_a), ("B (TE vence)", parser_b)]:
        msgs = fn(seq)
        print(f"  ── {nome} ──")
        print(f"     mensagens: {len(msgs)}")
        for i, m in enumerate(msgs, 1):
            print(f"       {i}. {m}")
        print()

    print("  ═══ A DISCORDÂNCIA ═══")
    print()
    print("  ⚠ os dois leram a MESMA sequência.")
    print("     · se A extrai 2 e B extrai 1 → ⚠ DISCORDÂNCIA DE FRAMING")
    print("     · e a 2ª mensagem do A é o que o ATACANTE controla")
    print()
    print("  ✓ no lab, isto é didático.")
    print("     ⚠ contra um sistema real, é SMUGGLING — e é crime.")

if __name__ == "__main__":
    main()
PY

chmod +x mede-framing.py
python3 mede-framing.py
```

⚠ **A medição é o instrumento.** **E o resultado é o argumento:** **os dois leram a mesma sequência,
e veem números diferentes de mensagens.**

⚠ **E a última linha é a conduta.** **No lab, é didático.** **Contra um sistema real, é smuggling —
e é crime.** **A técnica e o destino são a mesma coisa que muda.**

**Produza `medicao.md`:**

| Parser | Mensagens | Bytes consumidos |
|---|---|---|
| A (CL) | | |
| B (TE) | | |

**Responda:**

1. **Quantas mensagens cada parser viu?**
2. **Qual é o sinal de discordância de framing?**
3. **O que o A vê que o B não vê?** Quem controla?
4. **Por que isso é didático no lab** e crime fora dele?

---

## 6.4 O que sobra é o bug

⚠ **A conclusão do módulo, e ela é o critério do curso inteiro.**

| Situação | Há bug? |
|---|---|
| Os dois consomem tudo | ⚠ Não |
| Os dois deixam os mesmos bytes | ⚠ Não |
| ⚠ **Um consome, o outro deixa** | ⚠⚠ **SIM** |
| ⚠ **Sobram bytes que viram mensagem** | ⚠⚠ **SIM — e é o pior** |

⚠ **A distinção entre as duas últimas linhas é a gravidade.** **Sobrar bytes é um erro; sobrar bytes
que o próximo parser **interpreta como mensagem** é o smuggling.** **É a diferença entre um bug e
uma vulnerabilidade.**

⚠ **E a tabela do que fazer com o achado:**

| Você achou | Ação |
|---|---|
| Discordância de framing | ⚠ **Reporte** |
| Com bytes sobrantes | Reporte com prioridade |
| Com segunda mensagem executada | ⚠ **Prioridade máxima** |
| Sem caminho entre as camadas | Reporte; impacto menor |
| Só na sua construção | ⚠ **Verifique se é alcançável** |

⚠ **A última linha é a cascata do módulo 3.** **Uma discordância de framing só é ataque se existe um
caminho em que A entrega o dado a B** — **e se ninguém no meio rejeita.** **É a pergunta 3.**

⚠ **A regra escrita:**

> **Framing dá a consequência; o caminho dá a gravidade.** **Sem caminho, é um bug. Com caminho, é
> uma vulnerabilidade.**

```bash
cd ~/parser-lab/mod06

echo "═══ 6. o que sobra é o bug ═══"
echo
cat > sobra.md <<'EOF'
# O que sobra é o bug

## A tabela
| Situação | Há bug? | Gravidade |
|---|---|---|
| os dois consomem tudo | ⚠ não | — |
| os dois deixam os mesmos bytes | ⚠ não | — |
| ⚠ um consome, o outro deixa | ⚠⚠ SIM | alta |
| ⚠ os que sobram VIRAM mensagem | ⚠⚠ SIM | ⚠ máxima |

## A distinção
· sobrar bytes         → é um ERRO
· sobrar bytes que o próximo parser LÊ como mensagem
                       → ⚠ é o SMUGGLING

✓ diferença entre um bug e uma vulnerabilidade.

## O que fazer com o achado
| Você achou | Ação |
|---|---|
| discordância de framing | reporte |
| com bytes sobrantes | reporte, prioridade alta |
| com 2ª mensagem executada | ⚠ prioridade máxima |
| sem caminho entre as camadas | reporte, impacto menor |
| só na sua construção | ⚠ VERIFIQUE se é alcançável |

## ⚠ A REGRA
framing dá a CONSEQUÊNCIA.
o caminho dá a GRAVIDADE.
✓ sem caminho, é um bug. com caminho, é uma vulnerabilidade.
EOF

cat sobra.md

echo
echo "═══ 7. a cascata, aplicada ao framing ═══"
cat <<'EXPL'
  Q1: a spec DECIDE este caso?
      · TE + CL  → SIM (a spec moderna: TE vence)
      · CL duplo → SIM (rejeitar)
      ⚠ mas as implementações antigas não seguem
      → categoria 3 (viola a spec)

  Q2: as DUAS seguem a spec?
      · se uma segue e a outra não → categoria 3
      · se nenhuma segue            → categoria 3 dupla
      ⚠ raro as duas seguirem e ainda discordarem

  Q3: quais violam?
      ⚠ e é aqui que o trabalho começa

  E as cinco perguntas:
      · ALCANÇÁVEL? existe caminho A→B?        ⚠ CRÍTICO
      · CAMADA normaliza? há proxy no meio?     ⚠ CRÍTICO
      · IMPACTO? sobra bytes? viram mensagem?   ⚠ CRÍTICO
      · PODE ser explorado? você descreve, não executa.

  ✓ e as três críticas são as que definem se é ataque ou curiosidade.
EXPL
```

⚠ **A cascata aplicada ao framing é o fechamento do módulo.** **E note que as três perguntas
críticas são todas sobre o caminho** — **não sobre o bug.**

⚠ **E a nota final é a conduta:** **você descreve o impacto, não o executa.** **A última pergunta
classifica; não autoriza.**

**Produza `sobra.md`:**

| Situação | Há bug? | Gravidade |
|---|---|---|
| Um consome, outro deixa | | |
| Sobram bytes que viram mensagem | | |

**Responda:**

1. **Qual a diferença entre "sobrar bytes" e "sobrar bytes que viram mensagem"?
2. **O que dá a gravidade?**
3. **Quais três perguntas são críticas** no framing?
4. **O que a última pergunta autoriza?** (Nada.)

---

## 6.5 LAB — Framing no seu lab

**Duração:** 150 min

### Passo 1 — Suba dois parsers HTTP (50 min)

⚠ **Dois parsers HTTP **locais**. E o mais prático: as libs do Python.**

```bash
cd ~/parser-lab/mod06

echo "═══ SUBINDO DOIS PARSERS HTTP ═══"
echo
cat <<'EXPL'
  ── AS DUAS MAIS FÁCEIS ──
     · `h11`  — HTTP/1.1, estrito
     · `h2`   — HTTP/2

     pip3 install h11 h2

  ⚠ e as duas discordam sobre casos de framing.
     ✓ é o exercício.

  ── E SE VOCÊ QUISER SERVIDORES DE VERDADE (módulo 7) ──
     · nginx, apache, haproxy, em CONTAINER SEM REDE
     ⚠ mas isso é o módulo seguinte.
EXPL

pip3 install --quiet h11 h2 2>&1 | tail -1

cat > p_h11.py <<'PY'
#!/usr/bin/env python3
"""impl A — parser h11: lê uma requisição e diz o que sobra"""
import sys, h11
dados = sys.stdin.buffer.read()
try:
    conn = h11.Connection(h11.SERVER)
    conn.receive_data(dados)
    msgs = 0
    while True:
        ev = conn.next_event()
        if ev is h11.NEED_DATA or ev is h11.PAUSED:
            break
        if isinstance(ev, h11.Request):
            msgs += 1
        if isinstance(ev, h11.EndOfMessage):
            pass
    sobra = conn.trailing_data[0]
    print(f"msgs={msgs} sobra={len(sobra)}B")
    if sobra:
        print(f"SOBRA_HEX={sobra[:40].hex()}")
except Exception as e:
    print(f"ERRO={type(e).__name__}")
PY

chmod +x p_h11.py

echo "  ── testando com o caso clássico ──"
printf 'POST / HTTP/1.1\r\nHost: a\r\nContent-Length: 6\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\nGET /admin HTTP/1.1\r\nHost: a\r\n\r\n' > /tmp/tecl.bin
echo "     h11: $(python3 p_h11.py < /tmp/tecl.bin 2>&1 | head -1)"
echo
echo "  ⚠ o h11 é ESTRITO — ele provavelmente REJEITA o TE+CL."
echo "     ✓ e a rejeição também é comportamento, e conta na comparação."
```

⚠ **A escolha do `h11` é a mais prática.** **Ele é estrito** — **e a estritidade dele é o
comportamento que você compara.** **Rejeitar é uma resposta.**

⚠ **E a nota final é importante:** **o parser que rejeita **também** discorda do que aceita.** **A
comparação é entre comportamentos, não entre "aceita e rejeita".**

**Produza `parsers-http.md`:**

| Parser | Versão | Comportamento no TE+CL |
|---|---|---|
| `h11` | | |
| | | |

**Responda:**

1. **O `h11` aceitou ou rejeitou** o TE+CL?
2. **Por que a rejeição também é comportamento?**
3. **Qual o segundo parser?** Ele difere?
4. **Quanto sobrou** em cada?

### Passo 2 — Meça o framing nos casos (55 min)

⚠ **Os três casos do §6.1, medidos.**

```bash
cd ~/parser-lab/mod06

echo "═══ MEDINDO OS TRÊS CASOS ═══"
echo

mkdir -p /tmp/framing-casos

# caso 1 — TE + CL
printf 'POST / HTTP/1.1\r\nHost: a\r\nContent-Length: 6\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\nGET /admin HTTP/1.1\r\nHost: a\r\n\r\n' > /tmp/framing-casos/1-te-cl.bin

# caso 2 — CL duplicado
printf 'POST / HTTP/1.1\r\nHost: a\r\nContent-Length: 6\r\nContent-Length: 10\r\n\r\nAAAAAA' > /tmp/framing-casos/2-cl-duplo.bin

# caso 3 — CL com espaço
printf 'POST / HTTP/1.1\r\nHost: a\r\nContent-Length:  6\r\n\r\nAAAAAA' > /tmp/framing-casos/3-cl-espaco.bin

# caso 4 — controle (normal)
printf 'POST / HTTP/1.1\r\nHost: a\r\nContent-Length: 6\r\n\r\nAAAAAA' > /tmp/framing-casos/4-normal.bin

for f in /tmp/framing-casos/*.bin; do
    printf '  ── %-22s ──\n' "$(basename "$f")"
    printf '     h11: %s\n' "$(python3 p_h11.py < "$f" 2>&1 | head -1)"
    printf '     bytes: %s\n' "$(stat -c %s "$f")"
    echo
done

echo "═══ O QUE MEDIR ═══"
cat <<'EXPL'
  ── por caso ──
     · o parser ACEITOU ou REJEITOU?
     · quantas mensagens ele extraiu?
     · ⚠ quantos bytes SOBRARAM?

  ── e a comparação ──
     ⚠ rode os DOIS parsers (h11 e o segundo)
     e compare as três colunas

  ✓ onde as três diferirem, há discordância de framing.
EXPL

cat > caderno/PD-006.md <<'EOF'
# PD-006 — framing

**Data:** ____

## 1. Os parsers
| # | Parser | Versão | Estrito? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 2. Os casos
| # | Caso | O que testa |
|---|---|---|
| 1 | TE + CL | o clássico |
| 2 | CL duplicado | silêncio (tipo 1) |
| 3 | CL com espaço | ambiguidade lexical |
| 4 | normal | controle |

## 3. A medição
| # | Caso | Parser A | Parser B | Discordam? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |

## 4. O invariante (módulo 6.2)
| Item | Valor |
|---|---|
| "a leitura consome exatamente os bytes da mensagem" | |

## 5. Quanto sobrou
| # | Caso | Parser A sobrou | Parser B sobrou |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 6. As três perguntas críticas (módulo 6.4)
| # | Caso | Alcançável? | Camada? | Soberam bytes viram msg? |
|---|---|---|---|---|
| 1 | | | | |

## 7. A classificação (módulo 3)
| # | Caso | Categoria | Destino |
|---|---|---|---|
| 1 | | | |

## 8. ⚠ A conduta
| Item | Valor |
|---|---|
| testei contra terceiro? | ⚠ NÃO |
| testei no meu lab? | ✓ |
| construí exploit? | ⚠ NÃO |

## 9. O que NÃO foi verificado
⚠ mínimo 3
EOF

cat caderno/PD-006.md | head -30
```

⚠ **O caso 4 (controle) é obrigatório.** **Sem ele, você não sabe se os parsers funcionam** — **e uma
discordância em tudo pode ser um erro do seu harness, não dos parsers.**

⚠ **E as três perguntas críticas do módulo aparecem na ficha.** **É onde o achado didático se
distingue do achado de segurança.**

**Produza `medicao-framing.md`:**

| Caso | Parser A | Parser B | Discordam? |
|---|---|---|---|
| TE+CL | | | |
| CL duplo | | | |
| normal | | | |

**Responda:**

1. **Em quais casos os parsers discordam?**
2. **Quanto sobrou** em cada um?
3. **O caso de controle concordou?**
4. **Algum caso tem as três condições críticas?**

### Passo 3 — Classifique e documente (45 min)

Produza `relatorio-framing.md`:

```markdown
# Relatório de framing

## 1. O lab
| Item | Valor |
|---|---|
| Parsers | |
| Versões | |
| Isolamento | |
| ⚠ Terceiros? | NENHUM |

## 2. Os quatro casos
| # | Caso | Entrada (hex, curta) |
|---|---|---|
| 1 | TE + CL | |
| 2 | CL duplo | |
| 3 | CL com espaço | |
| 4 | normal | |

## 3. A medição
| # | Caso | A: msgs / sobra | B: msgs / sobra | Discordam? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |

## 4. A evidência
```
comando literal
```
```
saída literal
```

## 5. O invariante
| Item | Valor |
|---|---|
| O invariante de framing | |
| Qual caso o viola | |

## 6. As três perguntas críticas
| # | Caso | Alcançável? | Camada? | Bytes → mensagem? |
|---|---|---|---|---|
| 1 | | | | |

## 7. A classificação (módulo 3)
| # | Caso | Q1 spec | Q2 ambas seguem | Categoria | Destino |
|---|---|---|---|---|---|
| 1 | | | | | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não testei contra sistema de terceiro
- [ ] não construí exploit de smuggling
- [ ] não enviei payload a nenhum serviço
- [ ] não verifiquei a explorabilidade em produção

## 9. O que o mantenedor precisa confirmar
| # | Item |
|---|---|
| 1 | o caminho A→B existe em produção? |
| 2 | há outra camada que rejeita? |

## 10. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `relatorio-framing.md`:**

| Item | Valor |
|---|---|
| Parsers | |
| Casos com discordância | |
| Categoria | |
| **O que não fiz** | |

**Responda:**

1. **Quantos casos discordam?** Qual categoria?
2. **Algum tem bytes que viram mensagem?**
3. **O que o mantenedor precisa confirmar?**
4. **Quantas caixas do "não fiz" estão marcadas?**

### Critérios de aceitação

- `framing.md` com a definição e os **seis** formatos que o usam.
- Você explicou **por que "quantas mensagens" é a diferença crítica**.
- `framing.md` com os **três** casos de divergência.
- Você explicou **por que a spec resolver não basta**.
- `invariante.md` com a frase do invariante e a tabela por formato.
- Você explicou **o que ele viola** no caso clássico.
- Os **três níveis** aplicados ao framing.
- `mede-framing.py` rodado, com o número de mensagens de cada parser.
- Você explicou **o que o A vê que o B não vê**.
- `sobra.md` com a tabela de gravidade.
- Você explicou **a diferença entre "sobrar bytes" e "sobrar bytes que viram mensagem"**.
- Você explicou **o que dá a gravidade**.
- **Dois parsers HTTP** rodando no seu lab.
- Os **quatro** casos testados, incluindo o **controle**.
- Você explicou **por que a rejeição também é comportamento**.
- `caderno/PD-006.md` com as **nove** seções.
- `relatorio-framing.md` com as **dez** seções.
- **Todas as caixas** do "não fiz" marcadas.
- ⚠ **Nenhum serviço de terceiro.** Nenhum exploit de smuggling.

---

## Avaliação

1. **O que é framing?**
2. **Cite cinco formatos** e o que define o fim em cada.
3. **Por que "quantas mensagens" é a diferença crítica?**
4. **Cite os três casos de divergência de framing.**
5. **Qual é o clássico?** A spec o resolve?
6. **Por que a spec resolver não basta?**
7. **Qual é o invariante de framing?**
8. **O que ele viola no caso clássico?**
9. **Por que ele vale em qualquer formato?**
10. **Cite o invariante no CSV** e no WebSocket.
11. **O que o atacante precisa** para explorar a discordância?
12. **Como se mede discordância de framing?** Cite as métricas.
13. **O que a medição conta?**
14. **Qual é o sinal de discordância?**
15. **O que a implementação A vê que a B não vê?**
16. **Quem controla os bytes que sobram?**
17. **Qual a diferença entre "sobrar bytes" e "sobrar bytes que viram mensagem"?**
18. **O que dá a gravidade de um achado de framing?**
19. **Quais três perguntas são críticas** no framing?
20. **O que a pergunta "pode ser explorado" autoriza?** (Nada.)

---

**Próximo:** [Módulo 7 — Discordância entre camadas](modulo-07.md)
