# Módulo 8 — WAFs e o Caso WAFFLED

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Entender por que o **WAF** é o par de maior rendimento.
2. Reconhecer a **assimetria estrutural** — rígido na comparação, frouxo no repasse.
3. Montar um **WAF didático** no lab e compará-lo com o servidor.
4. Aplicar o método do `WAFFLED` — 120+ exploits, conceito por conceito.
5. Classificar e reportar — **a cada dono, em separado**.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O WAF é uma implementação a mais — e ele discorda do servidor que protege.** **A discordância não
> é um bug; é a natureza do arranjo.**

⚠ **E a assimetria, que é a razão de ele render:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ O WAF E O SERVIDOR VEEM A MESMA REQUISIÇÃO                           │
│                                                                      │
│   WAF                                 SERVIDOR                       │
│   ├─ COMPARA contra assinatura        ├─ PROCESSA o pedido           │
│   ├─ ⚠ RÍGIDO: casa exatamente         ├─ ⚠ FROUXO: aceita variações │
│   ├─ remove/normaliza p/ comparar     ├─ normaliza p/ PROCESSAR      │
│   └─ se passa, REPASSA                └─ executa                     │
│                                                                      │
│   ⚠ AS DUAS NORMALIZAÇÕES NÃO SÃO A MESMA                            │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A tese:** **o WAF normaliza para **comparar**; o servidor normaliza para **processar**.** **E
essas duas normalizações divergem** — **e o payload que o WAF não reconhece chega ao servidor na
forma que ele reconhece.**

⚠ **E o número, e ele é medido:** **o `WAFFLED` achou 120+ exploits contra 5 WAFs.** **Não em uma
versão antiga; em produtos comerciais, mantidos.**

⚠ **A distinção que este módulo estabelece:**

| Discordância | O que o atacante ganha |
|---|---|
| Sobre **o valor** | ⚠ Nada |
| Sobre **a normalização** | ⚠⚠ **Bypass do filtro** |
| ⚠ Sobre **o que conta como "o mesmo"** | ⚠⚠ **Bypass e cache** |

---

## 8.1 A assimetria estrutural

⚠ **Por que o WAF e o servidor **sempre** divergem — e não por descuido.**

| Dimensão | WAF | Servidor |
|---|---|---|
| **Objetivo** | ⚠ **Rejeitar o ruim** | ⚠ **Aceitar o bom** |
| Padrão de decisão | ⚠ **Lista negra** | ⚠ **Lista branca implícita** |
| Normalização | Para **comparar** | Para **processar** |
| Encoding | ⚠ **Decodifica para checar** | ⚠ **Decodifica para usar** |
| Caso ambíguo | ⚠ **Escolhe bloquear** | ⚠ **Escolhe tolerar** |
| O que faz com o resto | **Repassa** | **Executa** |

⚠ **A linha da lista negra/branca é a mais profunda.** **O WAF pergunta "isto está na lista do
proibido?"; o servidor pergunta "isto é uma requisição válida?"** — **e as duas perguntas têm
respostas diferentes para o mesmo payload.**

⚠ **E a linha do encoding é a que gera a maioria dos bypasses.** **O WAF decodifica `%41` para
`A` **para comparar com a assinatura**; o servidor decodifica **para usar o valor**.** **Se o
servidor decodifica **duas vezes** e o WAF **uma**, o payload passa.**

⚠ **A tabela dos pontos de divergência, por camada do WAF:**

| Componente do WAF | O que faz | ⚠ Onde diverge |
|---|---|---|
| **Parser** | lê a requisição | ⚠ Igual ao módulo 6 |
| **Normalizador** | decodifica | ⚠ **Uma ou duas vezes** |
| **Motor de regras** | compara | ⚠ Assinatura rígida |
| **Logger** | registra | — |
| **Repassador** | envia ao servidor | ⚠ **Repassa o original** |

⚠ **A última linha é a chave.** **O WAF **repassa o original** — não o normalizado.** **É o que torna
o bypass possível:** **ele compara uma forma e entrega outra.**

⚠ **E é o que o módulo 2 previu estruturalmente.** **Camadas com propósitos diferentes divergem** —
**e a divergência do WAF não é um bug que se corrige; é a arquitetura.**

⚠ **A regra escrita:**

> **O WAF compara a forma normalizada e entrega a original.** **E é exatamente entre as duas que o
> bypass vive.**

```bash
mkdir -p ~/parser-lab/mod08 && cd ~/parser-lab/mod08

echo "═══ 1. a assimetria estrutural ═══"
echo
cat > assimetria.md <<'EOF'
# A assimetria estrutural

| Dimensão | WAF | SERVIDOR |
|---|---|---|
| objetivo | ⚠ REJEITAR o ruim | ⚠ ACEITAR o bom |
| decisão | lista NEGRA | lista BRANCA implícita |
| normaliza | para COMPARAR | para PROCESSAR |
| encoding | decodifica p/ CHECAR | decodifica p/ USAR |
| caso ambíguo | ⚠ escolhe BLOQUEAR | ⚠ escolhe TOLERAR |
| o resto | REPASSA | EXECUTA |

## Os componentes do WAF
| Componente | Faz | ⚠ Onde diverge |
|---|---|---|
| parser | lê a requisição | igual ao módulo 6 |
| normalizador | decodifica | ⚠ UMA ou DUAS vezes |
| motor de regras | compara | assinatura rígida |
| repassador | envia ao servidor | ⚠ **repassa o ORIGINAL** |

## ⚠ a linha que explica tudo
o WAF COMPARA a forma normalizada
e ENTREGA a original.
✓ é exatamente entre as duas que o bypass vive.

## ⚠ e não é um bug que se corrige
camadas com propósitos diferentes divergem.
✓ é a ARQUITETURA, não o descuido.
EOF

cat assimetria.md

echo
echo "═══ 2. os cinco pontos de divergência ═══"
echo
cat <<'EXPL'
  ── OS CINCO, POR RENDIMENTO ──

  1. ⚠ DECODIFICAÇÃO DUPLA
     WAF decodifica %2541 UMA vez → "%41" → não casa a assinatura
     SERVIDOR decodifica DUAS vezes → "A" → executa
     ✓ o clássico.

  2. ⚠ CASE
     WAF compara "<script" case-sensitive
     SERVIDOR aceita "<SCRIPT"
     ✓ a assinatura não casa.

  3. ⚠ ESPAÇO / BRANCO
     WAF compara "union select"
     SERVIDOR aceita "union/**/select" ou "union%09select"
     ✓ o comentário que o WAF não normaliza.

  4. ⚠ ORDEM DE NORMALIZAÇÃO
     WAF remove o header ANTES de checar
     SERVIDOR checa ANTES de remover
     ✓ o que um vê, o outro não.

  5. ⚠ PARÂMETRO DUPLICADO
     WAF checa o PRIMEIRO "?id=1&id=<payload>"
     SERVIDOR usa o ÚLTIMO
     ✓ HTTP Parameter Pollution.

  ── ⚠ TODOS OS CINCO SÃO DIDÁTICOS ──
     e nenhum deve ser testado contra um WAF de terceiro.
     ✓ o lab do módulo usa um WAF DIDÁTICO.
EXPL
```

⚠ **Os cinco pontos são o currículo do módulo.** **E note que todos são **normalização**, não
parsing** — **é a diferença em relação ao módulo 6.**

⚠ **E a nota final é a linha ética.** **O `WAFFLED` testou produtos — com autorização e escopo.**
**Você testa um WAF didático** — **e o conceito é o mesmo.**

**Produza `assimetria.md`:**

| Dimensão | WAF | Servidor |
|---|---|---|
| Objetivo | | |
| Normalização | | |
| O resto | | |

**Responda:**

1. **Por que a divergência do WAF não é um bug?**
2. **Qual componente diverge mais?** Por quê?
3. **Cite três dos cinco pontos.**
4. **O que os cinco têm em comum?**

---

## 8.2 O WAF didático

⚠ **O lab do módulo: um WAF que filtra **por assinatura**, e um servidor que **normaliza**.**

| Componente | O que faz | ⚠ A divergência |
|---|---|---|
| **WAF didático** | compara contra assinatura | ⚠ Normaliza **uma** vez |
| **Servidor didático** | processa o parâmetro | ⚠ Normaliza **duas** vezes |
| **Cliente** | manda o payload | — |

⚠ **A regra do laboratório, escrita:** **você escreve as **duas** implementações** — **e controla a
divergência.** **Não usa produto real, nem serviço.**

⚠ **E a razão de o WAF didático bastar:** **o método não depende do produto.** **O `WAFFLED`
comparou produtos comerciais; você compara o **conceito** — normalização dupla, case, ordem.** **E o
conceito é transferível.**

⚠ **A tabela do que o WAF didático implementa:**

| Regra | O que faz | ⚠ O furo |
|---|---|---|
| Assinatura `<script` | bloqueia se presente | ⚠ Case e encoding |
| Assinatura `union select` | bloqueia | ⚠ Comentários e whitespace |
| Uma decodificação | decodifica `%xx` | ⚠ **Dupla não** |
| Checa o 1º parâmetro | pega o primeiro | ⚠ HPP |
| Remove o header | antes de checar | ⚠ Ordem |

⚠ **E o servidor didático faz o **oposto** em cada uma.** **É o par divergente** — **e é o que você
compara.**

⚠ **A regra escrita:**

> **Você constrói a divergência, e a mede.** **Não procura um bypass num produto — demonstra o
> **mecanismo** do bypass entre duas implementações suas.**

```bash
cd ~/parser-lab/mod08

echo "═══ 3. o WAF didático ═══"
echo
cat > waf_didatico.py <<'PY'
#!/usr/bin/env python3
"""
waf_didatico.py — um WAF que filtra por ASSINATURA.

⚠ DIDÁTICO e LOCAL. ele demonstra o MECANISMO da divergência.
   nunca aponte isto para um serviço que não seja seu.
"""
import socket, sys, threading
from urllib.parse import unquote

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 9001
BACKEND = ("127.0.0.1", int(sys.argv[2]) if len(sys.argv) > 2 else 9000)

# ─── as regras (a lista NEGRA) ───
ASSINATURAS = [
    b"<script",
    b"union select",
    b"../",
    b"etc/passwd",
]


def normaliza_uma_vez(s: str) -> str:
    """⚠ o WAF decodifica UMA vez — para COMPARAR."""
    return unquote(s)


def bloqueado(texto: str) -> str:
    """retorna o nome da assinatura que casou, ou vazio"""
    n = normaliza_uma_vez(texto).lower()
    for a in ASSINATURAS:
        if a.decode() in n:
            return a.decode()
    return ""


def atende(cli):
    try:
        dados = b""
        while b"\r\n\r\n" not in dados:
            b = cli.recv(1)
            if not b: break
            dados += b
        if not dados:
            cli.close(); return

        # ─── o WAF COMPARA (uma decodificação) ───
        texto = dados.decode(errors="replace")
        assinatura = bloqueado(texto)

        if assinatura:
            print(f"  [waf]  ⚠ BLOQUEADO por '{assinatura}'", flush=True)
            cli.sendall(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 9\r\n\r\nBLOQUEADO")
            cli.close(); return

        # ─── e REPASSA O ORIGINAL (não o normalizado) ───
        print(f"  [waf]  ✓ passou — repassando o ORIGINAL", flush=True)
        with socket.create_connection(BACKEND, timeout=3) as be:
            be.sendall(dados)
            be.settimeout(3)
            try:
                while True:
                    d = be.recv(4096)
                    if not d: break
                    cli.sendall(d)
            except socket.timeout:
                pass
        cli.close()
    except Exception:
        try: cli.close()
        except Exception: pass


def main():
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(5)
    print(f"═══ WAF DIDÁTICO em {HOST}:{PORT} → {BACKEND} ═══")
    print(f"  assinaturas: {[a.decode() for a in ASSINATURAS]}")
    print("  ⚠ normaliza UMA vez, e repassa o ORIGINAL")
    print("  ⚠ local, didático. nunca aponte para terceiro.")
    print()
    while True:
        cli, _ = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x waf_didatico.py

echo "  ⚠ o WAF está pronto. ele normaliza UMA vez."
echo
echo "═══ 4. o servidor didático (o par divergente) ═══"
cat > servidor_didatico.py <<'PY'
#!/usr/bin/env python3
"""
servidor_didatico.py — o servidor de trás.

⚠ ele decodifica DUAS vezes — para PROCESSAR.
   ✓ e é a divergência com o WAF.
"""
import socket, sys, threading
from urllib.parse import unquote

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 9000


def processa(caminho: str) -> str:
    """
    ⚠ o SERVIDOR decodifica DUAS vezes — para USAR o valor.
    é o comportamento real de muitos servidores e frameworks.
    """
    uma = unquote(caminho)
    duas = unquote(uma)
    if "<script" in duas.lower():
        return "⚠ EXECUTOU (payload chegou decodificado)"
    if "etc/passwd" in duas:
        return "⚠ LEU ARQUIVO (payload chegou)"
    return f"OK (path normalizado: {duas[:40]})"


def atende(cli):
    try:
        dados = b""
        while b"\r\n\r\n" not in dados:
            b = cli.recv(1)
            if not b: break
            dados += b
        primeira = dados.split(b"\r\n")[0].decode(errors="replace")
        partes = primeira.split(" ")
        caminho = partes[1] if len(partes) > 1 else "/"

        resultado = processa(caminho)
        marca = "⚠" if "EXECUTOU" in resultado or "LEU" in resultado else " "
        print(f"  [servidor] {marca} {caminho[:50]}  →  {resultado[:60]}", flush=True)

        corpo = resultado.encode()
        cli.sendall(
            b"HTTP/1.1 200 OK\r\n"
            b"Content-Type: text/plain\r\n"
            b"Content-Length: " + str(len(corpo)).encode() + b"\r\n\r\n" + corpo
        )
        cli.close()
    except Exception:
        try: cli.close()
        except Exception: pass


def main():
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(5)
    print(f"═══ SERVIDOR DIDÁTICO em {HOST}:{PORT} ═══")
    print("  ⚠ decodifica DUAS vezes — para PROCESSAR")
    print("  ⚠ local, didático.")
    print()
    while True:
        cli, _ = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x servidor_didatico.py

echo "  ⚠ os dois prontos. e as duas normalizações são DIFERENTES."
ls -1 *.py | sed 's/^/     /'
```

⚠ **O par didático é o instrumento.** **O WAF decodifica uma vez; o servidor, duas** — **e a
divergência é exatamente a do `WAFFLED`.**

⚠ **E a razão de escrever as duas implementações:** **você controla a variável.** **Não procura o
furo de um produto; demonstra o mecanismo** — **e o mecanismo é o mesmo em qualquer WAF que
normalize diferente do backend.**

**Produza `par-didatico.md`:**

| Componente | Normaliza | Objetivo |
|---|---|---|
| WAF | | |
| Servidor | | |

**Responda:**

1. **Quantas vezes cada um decodifica?**
2. **Por que a divergência é essa?**
3. **Por que escrever as duas implementações** é melhor que usar um produto?
4. **O que o mecanismo tem de transferível?**

---

## 8.3 Medindo a divergência

⚠ **A medição: **o WAF bloqueia, e o servidor processa — o mesmo payload.**

| Medição | Como | ⚠ Sinal |
|---|---|---|
| **Veredito do WAF** | Log do WAF | Bloqueado ou não |
| **Veredito do servidor** | Log do servidor | ⚠ Executou? |
| ⚠ **Divergência** | WAF passou **e** servidor executou | ⚠⚠ **Bypass** |
| Falso positivo | WAF bloqueou pedido legítimo | ⚠ Outro bug |

⚠ **A linha da divergência é a definição de bypass, medida:** **o WAF disse "ok" e o servidor
executou.** **Não há interpretação — os dois logs estão lá.**

⚠ **E a tabela dos quatro resultados possíveis:**

| WAF | Servidor | Significa |
|---|---|---|
| Bloqueou | Não executou | ✓ Funcionou |
| Bloqueou | Executou | ⚠ Impossível (não chegou) |
| **Passou** | Não executou | ✓ Funcionou |
| ⚠ **Passou** | ⚠ **Executou** | ⚠⚠ **BYPASS** |

⚠ **A linha 2 é impossível, e a razão é estrutural:** **o que o WAF bloqueia não chega ao
servidor.** **É o que torna o bypass específico: ele só existe se o WAF **não reconhecer** o
payload.**

⚠ **E o falso positivo merece a nota.** **Um WAF que bloqueia demais tem outro tipo de bug** — **e é
o mesmo mecanismo ao contrário:** **a assinatura do WAF é mais larga que o que o servidor
considera perigoso.**

⚠ **A regra escrita:**

> **Bypass é medido: WAF passou, servidor executou.** **E a evidência são dois logs, não uma
> impressão.**

```bash
cd ~/parser-lab/mod08

echo "═══ 5. medindo a divergência ═══"
echo
cat > mede-bypass.md <<'EOF'
# Medindo a divergência

## As quatro combinações
| WAF | Servidor | Significa |
|---|---|---|
| bloqueou | não executou | ✓ funcionou |
| bloqueou | executou | ⚠ impossível — não chegou |
| passou | não executou | ✓ funcionou |
| ⚠ passou | ⚠ executou | ⚠⚠ **BYPASS** |

## Os dois logs
| Log | O que mostra |
|---|---|
| do WAF | "BLOQUEADO por X" ou "passou" |
| do servidor | ⚠ o path que ELE normalizou, e o resultado |

## ⚠ o que é evidência
· o payload literal (bytes)
· o veredito do WAF
· ⚠ o veredito do SERVIDOR
· e a diferença entre os dois

✓ dois logs, não uma impressão.

## ⚠ e o falso positivo (o inverso)
| WAF | Servidor | Significa |
|---|---|---|
| ⚠ bloqueou | não executou, e era LEGÍTIMO | ⚠ falso positivo |

✓ é o mesmo mecanismo ao contrário:
   a assinatura do WAF é mais LARGA que o perigoso real.
EOF

cat mede-bypass.md

echo
echo "═══ 6. o cliente, e os cinco pontos ═══"
echo
cat > cliente_payloads.py <<'PY'
#!/usr/bin/env python3
"""
cliente_payloads.py — manda os CINCO padrões ao WAF e vê o que passa.

⚠ DIDÁTICO e LOCAL (127.0.0.1). nunca aponte para terceiro.
"""
import socket, sys

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9001

# ─── os cinco pontos de divergência (didáticos) ───
CASOS = [
    ("1 — direto (deve ser bloqueado)", b"/x?q=<script>alert(1)</script>"),
    ("2 — codificado UMA vez",           b"/x?q=%3Cscript%3Ealert(1)"),
    ("3 — codificado DUAS vezes",        b"/x?q=%253Cscript%253Ealert(1)"),
    ("4 — case trocado",                 b"/x?q=<SCRIPT>alert(1)"),
    ("5 — parâmetro duplicado",          b"/x?id=1&id=%253Cscript%253E"),
]


def manda(caminho: bytes):
    req = (
        b"GET " + caminho + b" HTTP/1.1\r\n"
        b"Host: localhost\r\n"
        b"\r\n"
    )
    try:
        with socket.create_connection((HOST, PORT), timeout=5) as s:
            s.sendall(req)
            s.settimeout(3)
            r = b""
            try:
                while True:
                    d = s.recv(4096)
                    if not d: break
                    r += d
            except socket.timeout:
                pass
        corpo = r.split(b"\r\n\r\n", 1)[1] if b"\r\n\r\n" in r else r
        estado = r.split(b"\r\n")[0].decode(errors="replace") if r else "(sem resposta)"
        return estado, corpo.decode(errors="replace")[:60]
    except Exception as e:
        return f"({type(e).__name__})", ""


def main():
    print("═══ PAYLOADS DIDÁTICOS ═══")
    print()
    print("  ⚠ alvo: 127.0.0.1 — LOCAL. nunca aponte para terceiro.")
    print()
    print(f"  {'caso':<32} {'WAF':<20} {'SERVIDOR':<44} bypass?")
    print("  " + "-"*108)
    for nome, caminho in CASOS:
        estado, corpo = manda(caminho)
        bloqueado = "403" in estado
        executou = "EXECUTOU" in corpo or "LEU" in corpo
        waf = "⚠ bloqueou" if bloqueado else "✓ passou"
        srv = corpo[:42]
        bypass = "⚠⚠ SIM" if (not bloqueado and executou) else "não"
        print(f"  {nome:<32} {waf:<20} {srv:<44} {bypass}")
    print()
    print("  ═══ COMO LER ═══")
    print("  · 'passou' + 'EXECUTOU' → ⚠⚠ o bypass, MEDIDO")
    print("  · 'bloqueou'             → ✓ o WAF funcionou")
    print("  ⚠ e o caso 3 é o clássico: DUAS codificações.")


if __name__ == "__main__":
    main()
PY

chmod +x cliente_payloads.py

echo "  ⚠ o cliente está pronto. ele manda os CINCO pontos."
echo
echo "  ── PARA RODAR (três terminais) ──"
cat <<'EXPL'
     # terminal 1 — o servidor (decodifica 2x)
     python3 servidor_didatico.py 9000

     # terminal 2 — o WAF (decodifica 1x)
     python3 waf_didatico.py 9001 9000

     # terminal 3 — o cliente
     python3 cliente_payloads.py 9001
EXPL
```

⚠ **O cliente mede os cinco pontos de uma vez.** **E o resultado esperado é o caso 3: `%253C`** —
**duas codificações.** **O WAF decodifica uma e vê `%3C`, que não casa `<script`** — **e o servidor
decodifica duas e vê `<script`.** **É o bypass, medido.**

⚠ **E o caso 5 é o mais moderno.** **Parâmetro duplicado** — **o WAF checa o primeiro, o servidor usa
o último.** **É a divergência de **qual** dado importa.**

**Produza `medicao.md`:**

| Caso | WAF | Servidor | Bypass? |
|---|---|---|---|
| Direto | | | |
| Uma codificação | | | |
| Duas codificações | | | |
| Case | | | |

**Responda:**

1. **Quantos casos passaram pelo WAF?**
2. **Qual deu bypass?** Por quê?
3. **O caso direto foi bloqueado?** (Deve ser — é o controle.)
4. **A evidência são dois logs?** Onde?

---

## 8.4 Reportar a cada um

⚠ **A consequência administrativa: o mesmo achado, **dois donos**.**

| Dono | O que ele corrige | ⚠ O que não é dele |
|---|---|---|
| **O WAF** | A normalização e o repasse | ⚠ O backend |
| **O servidor** | A normalização dupla | ⚠ O WAF |
| A especificação | Se ela permite a ambiguidade | — |

⚠ **A regra do módulo 10 do Patch Diffing vale aqui inteira:** **reporte a cada um, e não mencione
o outro ao outro.**

⚠ **A tabela do que vai em cada relatório:**

| Seção | Para o WAF | Para o servidor |
|---|---|---|
| A entrada | ✓ | ✓ |
| O veredito do WAF | ✓ | ⚠ **sem detalhes** |
| O veredito do servidor | ⚠ **sem detalhes** | ✓ |
| ⚠ Que o outro diverge | ⚠ **NÃO** | ⚠ **NÃO** |
| A correção sugerida | No WAF | No servidor |

⚠ **A linha 4 é a mais importante, e a mais tentadora de violar.** **É útil dizer ao WAF "o backend
decodifica duas vezes" — e não é o seu papel.** **Você reporta o comportamento dele** — **e deixa
que ele investigue.**

⚠ **E a razão é prática:** **mencionar o outro expõe um sistema de terceiro sobre o qual você não
tem autoridade** — **e frequentemente antes de ele estar corrigido.**

⚠ **A regra escrita:**

> **N achados, N relatórios, N prazos.** **E cada um sabe do seu — nunca do outro.**

```bash
cd ~/parser-lab/mod08

echo "═══ 7. reportar a cada um ═══"
echo
cat > reportar.md <<'EOF'
# Reportar a cada um

## Os donos
| Dono | Corrige | ⚠ Não é dele |
|---|---|---|
| o WAF | a normalização e o repasse | o backend |
| o servidor | a normalização dupla | o WAF |
| a especificação | a ambiguidade | as implementações |

## O que vai em cada relatório
| Seção | WAF | Servidor |
|---|---|---|
| a entrada | ✓ | ✓ |
| o veredito do WAF | ✓ | ⚠ sem detalhes |
| o veredito do servidor | ⚠ sem detalhes | ✓ |
| ⚠ que o outro diverge | ⚠ NÃO | ⚠ NÃO |
| a correção | no WAF | no servidor |

## ⚠ por que não mencionar o outro
· expõe sistema de terceiro
· e frequentemente ANTES de estar corrigido
· ✓ você reporta o comportamento DELE

## ⚠ o timing
| Item | Valor |
|---|---|
| prazo | o do mais lento |
| publicar antes? | ⚠ NÃO |

## ⚠ a regra (módulo 10 do Patch Diffing)
N achados, N relatórios, N prazos.
e cada um sabe do SEU — nunca do outro.
EOF

cat reportar.md

echo
echo "  ⚠ e o modelinho de relatório, sem expor o outro:"
cat > modelo-relatorio.txt <<'EOF'
Assunto: Divergência de normalização entre o filtro e o backend

Resumo
  O filtro decodifica o componente de caminho UMA vez antes de
  comparar com as assinaturas. O valor repassado ao backend é o
  original, não o normalizado. Resultado observado: um payload
  com DUAS codificações não casa a assinatura e é repassado.

Ambiente
  Versão: ____
  Configuração: ____
  Reproduzido em: ambiente de laboratório local.

Reprodução
  1. requisição com o parâmetro codificado duas vezes
  2. o filtro registra "passou"
  3. o backend processa o valor decodificado

Evidência
  [o veredito do filtro, literal]
  [o payload, em bytes]

O que eu não verifiquei
  - o comportamento do backend (reportado separadamente)
  - o impacto em produção
  - a explorabilidade

Correção sugerida
  Normalizar de forma idêntica à do backend antes de comparar,
  ou repassar a forma normalizada.

Declaração
  Testado apenas em ambiente próprio. Nenhum sistema de terceiro.
EOF

cat modelo-relatorio.txt
```

⚠ **O modelo de relatório é o entregável.** **E note o que ele **não** faz:** **não menciona o
backend, não pede que o outro corrija, e declara o que não foi verificado.**

⚠ **E a linha "reportado separadamente" é a jogada correta.** **Você diz que existe outra parte** —
**e não diz qual.** **É honesto e não expõe.**

**Produza `reportar.md`:**

| Dono | O que corrige | O que NÃO mencionar |
|---|---|---|
| WAF | | |
| Servidor | | |

**Responda:**

1. **Quantos donos tem o achado?**
2. **O que não mencionar** a cada um?
3. **Por que não mencionar** o outro?
4. **Como o modelo declara** que há outra parte?

---

## 8.5 LAB — O WAF didático completo

**Duração:** 120 min

### Passo 1 — Suba e meça os cinco pontos (60 min)

```bash
cd ~/parser-lab/mod08

echo "═══ SUBINDO O LAB ═══"
echo
cat <<'EXPL'
  ── TRÊS TERMINAIS ──

     python3 servidor_didatico.py 9000      # o backend (2x)
     python3 waf_didatico.py 9001 9000      # o WAF (1x)
     python3 cliente_payloads.py 9001       # os cinco pontos

  ── ⚠ ANTES DE COMEÇAR ──
     · confirme: tudo em 127.0.0.1
     · e o teste de isolamento (módulo 4)
EXPL

# verifica que os scripts só apontam para localhost
echo "  ── verificação: os scripts apontam só para local? ──"
if grep -rnE 'https?://' *.py 2>/dev/null | grep -viE 'localhost|127\.0\.0\.1' | head -3 | grep -q .; then
    echo "     ⚠⚠ ATENÇÃO: há URL externa nos scripts:"
    grep -rnE 'https?://' *.py 2>/dev/null | grep -viE 'localhost|127\.0\.0\.1' | head -3 | sed 's/^/       /'
else
    echo "     ✓ nenhum script aponta para externo"
fi
echo

echo "═══ OS CINCO PONTOS, MEDIDOS ═══"
echo
cat > caderno/PD-008.md <<'EOF'
# PD-008 — divergência WAF ↔ servidor

**Data:** ____

## 1. O lab
| Componente | Implementação | Normaliza | Porta |
|---|---|---|---|
| WAF | waf_didatico.py | ⚠ 1x | 9001 |
| Servidor | servidor_didatico.py | ⚠ 2x | 9000 |

## 2. O isolamento
| Item | Valor |
|---|---|
| endereços | 127.0.0.1 |
| rede de saída | ⚠ NENHUMA |
| scripts apontam p/ externo? | ⚠ NÃO |

## 3. Os cinco pontos
| # | Caso | WAF | Servidor | ⚠ Bypass? |
|---|---|---|---|---|
| 1 | direto | | | |
| 2 | 1x codificado | | | |
| 3 | 2x codificado | | | |
| 4 | case | | | |
| 5 | param duplicado | | | |

## 4. A evidência literal
```
[waf]
[servidor]
```

## 5. O mecanismo (a assimetria, módulo 8.1)
| Item | Valor |
|---|---|
| normaliza p/ COMPARAR | |
| normaliza p/ PROCESSAR | |
| ⚠ onde está a divergência | |

## 6. As quatro combinações (módulo 8.3)
| WAF | Servidor | Significa | Ocorreu? |
|---|---|---|---|
| bloqueou | não executou | funcionou | |
| passou | não executou | funcionou | |
| ⚠ **passou** | ⚠ **executou** | ⚠⚠ BYPASS | |
| bloqueou | era legítimo | falso positivo | |

## 7. A classificação (módulo 3)
| # | Caso | Categoria | Destino |
|---|---|---|---|
| | | | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não apontei para WAF de terceiro
- [ ] não apontei para serviço nenhum fora de 127.0.0.1
- [ ] não testei produto comercial
- [ ] não publiquei nada

## 9. O que os mantenedores confirmam
| # | Dono | Item |
|---|---|---|
| 1 | o WAF | a normalização é assim em produção? |
| 2 | o servidor | a decodificação dupla é intencional? |
EOF

cat caderno/PD-008.md | head -30
```

⚠ **A verificação de URL é o passo ético do lab.** **E ele é automático:** **se algum script aponta
para fora, o lab não está isolado.**

⚠ **E a ficha registra as quatro combinações.** **É onde você vê se o bypass ocorreu** — **e o caso
direto (1) é o controle obrigatório.**

**Produza `cinco-pontos.md`:**

| # | Caso | WAF | Servidor | Bypass? |
|---|---|---|---|---|
| 1 | Direto | | | |
| 2 | 1x | | | |
| 3 | 2x | | | |
| 4 | Case | | | |
| 5 | Param duplo | | | |

**Responda:**

1. **O caso direto foi bloqueado?** (Deve ser.)
2. **Qual deu bypass?**
3. **O log do servidor confirma** que ele processou?
4. **A verificação de URL passou?**

### Passo 2 — Analise o mecanismo (35 min)

⚠ **Não basta o bypass; você explica **por quê**.**

```bash
cd ~/parser-lab/mod08

echo "═══ O MECANISMO ═══"
echo
cat <<'EXPL'
  ── PARA O CASO QUE DEU BYPASS, EXPLIQUE ──

     1. O QUE O WAF FEZ:
        · quantas decodificações
        · o que ele comparou
        · por que NÃO casou a assinatura

     2. O QUE O SERVIDOR FEZ:
        · quantas decodificações
        · o que ele processou
        · ⚠ e por que ELE aceitou

     3. A DIVERGÊNCIA:
        · ⚠ as duas normalizações não são a mesma
        · e o WAF repassa o ORIGINAL

     4. O INVARIANTE (módulo 6.2):
        · "o filtro vê o que o backend processa"
        ⚠ e é o que foi violado
EXPL

cat > mecanismo.md <<'EOF'
# O mecanismo

## O caso com bypass
| Item | Valor |
|---|---|
| A entrada (bytes) | |
| O que o WAF viu | |
| O que o servidor viu | |

## Passo a passo
| # | Etapa | WAF | Servidor |
|---|---|---|---|
| 1 | recebe | | |
| 2 | decodifica | ⚠ 1x | ⚠ 2x |
| 3 | compara / usa | | |
| 4 | decide | | |
| 5 | repassa / executa | ⚠ **repassa o ORIGINAL** | |

## O invariante violado
| Item | Valor |
|---|---|
| O invariante | "o filtro vê o que o backend processa" |
| ⚠ Como foi violado | |

## Por que isto NÃO é um bug de código
| Item | Valor |
|---|---|
| O WAF faz o que promete? | |
| O servidor faz o que promete? | |
| ⚠ Então onde está o problema | a RELAÇÃO entre os dois |

## A transferibilidade
| Item | Valor |
|---|---|
| Este mecanismo existe em produtos reais? | ⚠ sim (WAFFLED) |
| Por quê | a assimetria é estrutural |
EOF

cat mecanismo.md
```

⚠ **O mecanismo é o que transfere.** **O bypass num WAF didático não vale nada por si** — **vale
porque o mecanismo existe em produtos reais**, **e é o que o `WAFFLED` mediu em cinco deles.**

⚠ **E a linha "onde está o problema" é a conclusão do módulo:** **nenhuma das duas implementações
está errada.** **O problema é a **relação**.**

**Produza `mecanismo.md`:**

| Etapa | WAF | Servidor |
|---|---|---|
| Decodifica | | |
| Decisão | | |
| O resto | | |

**Responda:**

1. **Explique a divergência em duas frases.**
2. **Qual é o invariante violado?**
3. **Nenhuma das duas erra?** Então onde está o problema?
4. **Por que o mecanismo transfere** para produtos reais?

### Passo 3 — Reporte em separado (25 min)

Produza dois relatórios, **sem que um mencione o outro**:

**`relatorio-waf.md`:**

```markdown
# Relatório — filtro

## 1. Componente
| Item | Versão | Ambiente |
|---|---|---|

## 2. O comportamento observado
| Item | Valor |
|---|---|
| O filtro decodifica | ⚠ uma vez |
| Compara contra | assinatura |
| Repassa | ⚠ **o original** |

## 3. A reprodução
```
o payload (bytes)
```
```
o veredito do filtro (literal)
```

## 4. O invariante
"o filtro deve ver a mesma forma que o backend processa"

## 5. O que eu não verifiquei
- o comportamento do backend (outro relatório)
- o impacto em produção

## 6. Correção sugerida
Normalizar de forma idêntica à do backend, ou repassar a normalizada.

## 7. Declaração
Testado apenas em ambiente próprio. Nenhum sistema de terceiro.
```

**`relatorio-servidor.md`:**

```markdown
# Relatório — backend

## 1. Componente
| Item | Versão | Ambiente |
|---|---|---|

## 2. O comportamento observado
| Item | Valor |
|---|---|
| O backend decodifica | ⚠ **duas vezes** |
| Casos afetados | path, query |

## 3. A reprodução
```
o path codificado duas vezes
```
```
o resultado literal
```

## 4. O que eu não verifiquei
- o comportamento do filtro (outro relatório)
- o impacto em produção

## 5. Correção sugerida
Decodificar uma única vez, ou rejeitar o duplamente codificado.

## 6. Declaração
Testado apenas em ambiente próprio. Nenhum sistema de terceiro.
```

**Produza `relatorios.md`:**

| Item | Relatório WAF | Relatório Servidor |
|---|---|---|
| Menciona o outro? | | |
| A correção é | | |
| Declara limitações? | | |

**Responda:**

1. **Nenhum dos dois menciona o outro?** Confirme.
2. **A correção de cada um é diferente?**
3. **Os dois declaram o que não verificaram?**
4. **Por que reportar em separado?**

### Critérios de aceitação

- `assimetria.md` com a tabela das **seis** dimensões.
- Você explicou **qual componente do WAF diverge mais** (o repassador).
- Você explicou **por que a divergência não é um bug que se corrige**.
- Os **cinco pontos** de divergência, com o mecanismo de cada.
- `par-didatico.md` com as **duas** normalizações.
- Você explicou **por que escrever as duas implementações** é melhor.
- `mede-bypass.md` com as **quatro** combinações.
- Você explicou **qual combinação é impossível** e por quê.
- Você explicou **o que é falso positivo** em termos de assinatura.
- `cliente_payloads.py` rodando, com os **cinco** casos medidos.
- Você identificou **qual caso deu bypass**.
- O **caso direto** (controle) foi bloqueado.
- A **verificação de URL** confirmou que nada aponta para externo.
- `caderno/PD-008.md` com as **nove** seções.
- `mecanismo.md` explicando **a divergência passo a passo**.
- Você escreveu **o invariante violado**.
- Você explicou **por que nenhuma das duas erra**.
- **Dois relatórios separados**, sem que um mencione o outro.
- Os dois declaram **o que não foi verificado**.
- ⚠ **Nenhum WAF de terceiro.** Nenhum produto comercial testado.

---

## Avaliação

1. **Por que o WAF é uma implementação a mais?**
2. **Por que a discordância dele com o backend não é um bug?**
3. **Cite as seis dimensões da assimetria.**
4. **O que o WAF quer?** E o servidor?
5. **Por que a normalização do WAF e a do servidor divergem?**
6. **Qual componente do WAF explica tudo?** Por quê?
7. **Cite os cinco pontos de divergência.**
8. **Qual é o clássico?** Explique.
9. **O que o HTTP Parameter Pollution explora?**
10. **O que os cinco pontos têm em comum?**
11. **Por que o WAF didático basta** para o método?
12. **O que o `WAFFLED` mediu?** Cite os números.
13. **Cite as quatro combinações** de veredito.
14. **Qual é impossível?** Por quê?
15. **O que define bypass**, em termos de medição?
16. **Qual é a evidência do bypass?**
17. **O que é falso positivo** em termos de assinatura?
18. **Quantos donos tem o achado?** Quais?
19. **O que NÃO mencionar** a cada um? Por quê?
20. **Como declarar que há outra parte** sem expô-la?

---

**Próximo:** [Módulo 9 — Cadência de ataque](modulo-09.md)
