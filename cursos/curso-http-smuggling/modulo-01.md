# Módulo 1 — O Desync Como Consequência

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** Parser Differentials (módulos 5 e 6)

---

## Objetivos

1. Entender o **desync** como consequência, e não como bug.
2. Distinguir **smuggling**, **desync** e **cache poisoning**.
3. Saber o que o smuggling **dá** ao atacante — e o que ele não dá.
4. Montar o laboratório de camadas.
5. Escolher o **primeiro par** de camadas — com critério.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o curso:**

> **O atacante não injeta nada. Ele escreve bytes que dois parsers leem de forma diferente** — **e
> a discordância entre os dois é o ataque.**

⚠ **E a razão de isso valer um curso inteiro:** **não há um bug a corrigir num lugar.** **Há uma
relação a corrigir em dois** — **e cada combinação de camadas é um caso.**

⚠ **A tese:**

> **O smuggling é o exploit do framing.** **E como o framing está em todo lugar — proxy, WAF, CDN,
> cache, servidor, cliente — as variantes são muitas.**

⚠ **A distinção que este módulo estabelece, e ela é obrigatória:**

| Classe | O que é | O atacante consegue |
|---|---|---|
| **Smuggling** (clássico) | ⚠ Um pedido **escondido** no outro | ⚠ **Bypass de controle** |
| **Desync** | ⚠ O estado dos parsers **divergir** | ⚠ Idem, e mais amplo |
| **Cache poisoning** | ⚠ A resposta de um servida a outro | ⚠ **Envenenar** |
| **Client-side desync** | ⚠ O **navegador** como camada | ⚠ Afeta a vítima |

⚠ **A linha do desync é a mais importante, e a mais moderna.** **"Smuggling" sugere esconder um
pedido; "desync" é mais preciso:** **os dois parsers ficam com estados diferentes** — **e a
requisição **seguinte**, de outra pessoa, é processada com o deslocamento.**

⚠ **E é aí que o ataque fica perigoso:** **a vítima não é você; é quem vier depois.**

---

## 1.1 O modelo

⚠ **O modelo de três atores, e ele é o esqueleto do curso.**

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ATACANTE  ──── sequência de bytes ────►  CAMADA A                   │
│                                              │                       │
│                                              │ repassa                │
│                                              ▼                       │
│                                          CAMADA B                     │
│                                                                      │
│   ⚠ A e B leem os MESMOS bytes.                                       │
│   ⚠ e discordam sobre QUANTAS MENSAGENS existem neles.                │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ O QUE ACONTECE COM OS BYTES QUE SOBRAM                               │
│                                                                      │
│   · A consumiu N bytes → repassa N                                    │
│   · B esperava M bytes → e M > N                                      │
│   → ⚠ B lê os N e espera mais                                         │
│   → ⚠ e o "mais" vem da requisição SEGUINTE                           │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A última linha é o desync, e é o que muda tudo.** **O atacante não precisa que a resposta dele
revele nada.** **Ele só precisa **deixar o parser B num estado deslocado** — **e a próxima
requisição, de qualquer pessoa, é interpretada com o deslocamento.**

⚠ **E a tabela dos efeitos do deslocamento:**

| Deslocamento | O que o atacante ganha |
|---|---|
| Os bytes extras entram no corpo da próxima | ⚠ **Spoofing de parâmetro** |
| A próxima requisição é **prefixada** | ⚠ **Bypass de autenticação** |
| A próxima resposta é a dele | ⚠ **Vazamento** |
| A requisição dele fica **na fila** para outro | ⚠ **Confusão de sessão** |

⚠ **A linha do bypass de autenticação é a mais direta.** **Se o parser B espera mais corpo, ele
consome o começo da próxima requisição como corpo** — **e o que sobra vira uma requisição truncada
que pode não ter os headers de autenticação.**

⚠ **A regra escrita:**

> **Você não ataca um servidor. Você desalinha dois** — **e a vítima é quem vier depois.**

```bash
mkdir -p ~/smuggle-lab/mod01 && cd ~/smuggle-lab/mod01

echo "═══ 1. o modelo ═══"
echo
cat > modelo.md <<'EOF'
# O modelo

## Os três atores
| Ator | Papel |
|---|---|
| o ATACANTE | escreve a sequência de bytes |
| a CAMADA A | lê e repassa |
| a CAMADA B | lê e processa |

## O que acontece
1. A e B leem os MESMOS bytes
2. ⚠ discordam sobre QUANTAS mensagens existem
3. A repassa o que ele consumiu
4. B espera mais → ⚠ e o "mais" vem da requisição SEGUINTE

## As quatro classes (não confundir)
| Classe | O que é | O atacante consegue |
|---|---|---|
| SMUGGLING (clássico) | um pedido escondido no outro | bypass de controle |
| ⚠ DESYNC | o estado dos parsers DIVERGE | idem, e mais amplo |
| CACHE POISONING | a resposta de um servida a outro | envenenar |
| CLIENT-SIDE DESYNC | o NAVEGADOR como camada | afeta a vítima |

## Os efeitos do deslocamento
| Deslocamento | O ganho |
|---|---|
| bytes extras no corpo da próxima | spoofing de parâmetro |
| a próxima é PREFIXADA | ⚠ BYPASS de autenticação |
| a próxima resposta é a dele | vazamento |
| a requisição dele fica na fila | ⚠ confusão de sessão |

## ⚠ A REGRA
você não ataca um servidor. você DESALINHA DOIS.
✓ e a vítima é quem vier depois.
EOF

cat modelo.md

echo
echo "═══ 2. smuggling vs. desync — a distinção ═══"
echo
cat <<'EXPL'
  ── SMUGGLING (o termo de 2005) ──
     · "esconder uma requisição dentro de outra"
     · o atacante envia UM payload
     · e o proxy não vê o pedido escondido
     ✓ mas o termo sugere que o ataque ACABA ali.

  ── DESYNC (o termo moderno, 2019+) ──
     · "os dois parsers ficam com ESTADOS diferentes"
     · ⚠ o estado deslocado PERSISTE
     · e a próxima requisição (de OUTRA pessoa) é afetada
     ✓ é mais preciso, e mais perigoso.

  ── POR QUE A DIFERENÇA IMPORTA ──
     · smuggling: o efeito é no PRÓPRIO pedido
     · ⚠ desync: o efeito é no pedido SEGUINTE
     ✓ e é isso que torna a vítima uma terceira pessoa.

  ── E A TERCEIRA CLASSE ──
     ⚠ CACHE POISONING por desync:
        a resposta do pedido envenenado é ARMAZENADA
        e servida a todos que pedirem a mesma chave.
     ✓ o alcance é muito maior.
EXPL
```

⚠ **A distinção é o que o curso defende.** **O termo antigo esconde o mecanismo; o moderno o
revela.** **E a diferença prática é a vítima:** **no smuggling, o efeito é no seu pedido; no desync,
no de quem vem depois.**

⚠ **E a terceira classe é a de maior alcance.** **Se o cache armazena a resposta envenenada, o
ataque atinge todos** — **não só quem vem depois na fila.**

**Produza `modelo.md`:**

| Classe | O que é | Vítima |
|---|---|---|
| Smuggling | | |
| Desync | | |
| Cache poisoning | | |

**Responda:**

1. **Qual a diferença central entre smuggling e desync?**
2. **Por que "desync" é mais preciso?**
3. **Quem é a vítima no desync?**
4. **O que o cache poisoning amplia?**

---

## 1.2 O que o smuggling dá

⚠ **O que o atacante consegue. E os cinco são concretos.**

| # | Efeito | Como |
|---|---|---|
| 1 | **Bypass de autenticação** | ⚠ A requisição prefixada não tem os headers |
| 2 | **Acesso a endpoint interno** | O pedido escondido não passa pelo filtro |
| 3 | **Vazamento de requisição alheia** | ⚠ A resposta seguinte é a dele |
| 4 | **Spoofing de usuário** | O cookie da vítima vai no pedido dele |
| 5 | **Envenenamento de cache** | ⚠ A resposta ruim é armazenada |

⚠ **A linha 1 é a mais valiosa, e a mais sutil.** **O atacante não rouba credencial** — **ele faz a
requisição **cair fora** do caminho autenticado.** **O prefixo de uma requisição legítima vira o
começo de outra** — **e o que sobra não tem os headers.**

⚠ **E a linha 4 é a que assusta os defensores.** **Se a requisição do atacante fica na fila para ser
atendida com o **próximo** corpo, ela pode receber o **cookie da vítima** anexado — **porque o
backend a associa à conexão da vítima.**

⚠ **A tabela do que cada efeito exige:**

| Efeito | Exige | Dificuldade |
|---|---|---|
| Bypass de auth | ⚠ Um caminho não autenticado | Média |
| Endpoint interno | Um filtro na frente | Média |
| Vazamento | ⚠ Tráfego concorrente | Alta |
| Spoofing | Idem | Alta |
| Cache poisoning | ⚠ Um cache | Média-alta |

⚠ **A regra escrita:**

> **O smuggling não dá execução. Dá posição.** **E posição, num sistema com camadas, é o que
> permite tudo o mais.**

```bash
cd ~/smuggle-lab/mod01

echo "═══ 3. o que o smuggling dá ═══"
echo
cat > efeitos.md <<'EOF'
# O que o smuggling dá

## Os cinco efeitos
| # | Efeito | Como |
|---|---|---|
| 1 | BYPASS DE AUTENTICAÇÃO | a requisição prefixada não tem os headers |
| 2 | ACESSO A ENDPOINT INTERNO | o pedido escondido não passa pelo filtro |
| 3 | VAZAMENTO | a resposta seguinte é a dele |
| 4 | SPOOFING DE USUÁRIO | o cookie da vítima no pedido dele |
| 5 | ENVENENAMENTO DE CACHE | a resposta ruim é armazenada |

## O que cada um exige
| Efeito | Exige | Dificuldade |
|---|---|---|
| bypass de auth | um caminho NÃO autenticado | média |
| endpoint interno | um filtro na frente | média |
| vazamento | ⚠ tráfego CONCORRENTE | alta |
| spoofing | idem | alta |
| cache poisoning | um cache | média-alta |

## ⚠ o efeito mais valioso
o BYPASS DE AUTENTICAÇÃO.
o atacante não rouba credencial —
⚠ ele faz a requisição CAIR FORA do caminho autenticado.
✓ o prefixo de uma requisição vira o começo de outra
   e o que sobra não tem os headers.

## ⚠ A REGRA
o smuggling não dá EXECUÇÃO. dá POSIÇÃO.
e posição, num sistema com camadas, é o que permite tudo o mais.
EOF

cat efeitos.md

echo
echo "═══ 4. o que ele NÃO dá ═══"
echo
cat <<'EXPL'
  ── PARA NÃO SUPERESTIMAR ──

     ✗ não executa código
     ✗ não dá RCE direto
     ✗ não funciona se as duas camadas concordam
     ⚠ não é determinístico em tráfego real (há corrida)
     ⚠ e não é "só um payload" — há timing envolvido

  ── E A CONDIÇÃO NECESSÁRIA ──
     ⚠ DUAS CAMADAS QUE DISCORDAM.
     se o cliente fala direto com o servidor, não há smuggling.
     ✓ é por isso que ele existe onde existe:
        CDN, WAF, proxy reverso, load balancer, cache.

  ── E O TIMING ──
     ⚠ o desync depende da ORDEM em que as requisições chegam.
     e num sistema ocupado, a ordem é imprevisível.
     ✓ é por isso que o ataque é feito com o servidor CALMO
        e com uma requisição de "limpeza" para confirmar.
EXPL
```

⚠ **A seção do que ele não dá é o contrapeso.** **O smuggling não é RCE** — **é posição.** **E
confundir os dois leva a relatórios exagerados.**

⚠ **E a nota do timing é honesta:** **o desync depende da ordem de chegada** — **e em produção a
ordem é imprevisível.** **É por isso que os pesquisadores testam com o servidor calmo** — **e
confirmam com uma requisição de limpeza.**

**Produza `efeitos.md`:**

| # | Efeito | Exige |
|---|---|---|
| 1 | | |
| 2 | | |
| 5 | | |

**Responda:**

1. **Qual efeito é o mais valioso?** Por quê?
2. **Por que o bypass não é "roubar credencial"?
3. **O que o smuggling NÃO dá?** Cite três.
4. **Por que o timing importa?**

---

## 1.3 O laboratório

⚠ **O lab do curso: **camadas no seu ambiente, em 127.0.0.1.** **E o isolamento é do Parser
Differentials.**

| Pasta | O que guarda |
|---|---|
| `frontends/` | As configs de proxy — nginx, haproxy |
| `backends/` | Os servidores — os que medem o desync |
| `harness/` | O medidor |
| `evidencia/` | Os logs literais |
| `caderno/` | O módulo 3 do Pesquisa |

⚠ **E o requisito do backend, que quase ninguém percebe:** **ele precisa **logar o que recebeu** —
o path, os headers, e o corpo.** **Sem isso, você não vê o desync** — **porque o efeito é o que o
backend **viu**.**

⚠ **A tabela do que o backend precisa ter:**

| Item | Por quê |
|---|---|
| **Log do path** | ⚠ É onde o pedido escondido aparece |
| **Log dos headers** | Para ver o que sobrou |
| **Log do corpo** | Para ver o deslocamento |
| **Contador de requisições** | ⚠ **A medida do desync** |
| Resposta distinta por path | Para confirmar |

⚠ **A regra escrita:**

> **O backend é o instrumento de medida.** **Um backend que não loga é um lab que não mede** — **e
> você fica afirmando sem ver.**

```bash
cd ~/smuggle-lab

echo "═══ 5. o laboratório ═══"
echo
cat > monta-lab.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "═══ LABORATÓRIO DE SMUGGLING ═══"
echo

cd ~/smuggle-lab 2>/dev/null || { mkdir -p ~/smuggle-lab && cd ~/smuggle-lab; }
for d in frontends backends harness evidencia caderno; do
    mkdir -p "$d"; printf '  ✓ %s/\n' "$d"
done
echo

cat > frontends/README.md <<'EOF'
# Frontends

## Convenção
   frontends/<proxy>-<caso>.conf

## ⚠ REGRAS
   · escuta em 127.0.0.1
   · ⚠ NENHUMA saída para a internet
   · o backend é 127.0.0.1:<porta>

## O que registrar
| Campo | Valor |
|---|---|
| proxy e versão | |
| porta de escuta | |
| backend | |
| ⚠ regra de framing | (CL vence? TE vence?) |
EOF

cat > backends/README.md <<'EOF'
# Backends

## O backend é o INSTRUMENTO DE MEDIDA.

## ⚠ ele PRECISA logar
| Item | Por quê |
|---|---|
| o PATH | ⚠ onde o pedido escondido aparece |
| os HEADERS | o que sobrou |
| o CORPO | o deslocamento |
| ⚠ o CONTADOR | a medida do desync |

## ⚠ sem log, o lab não mede
você fica AFIRMANDO sem ver.
EOF

cat > harness/README.md <<'EOF'
# Harness

## O que ele faz
1. manda a sequência ao frontend
2. manda uma requisição de LIMPEZA depois
3. ⚠ lê o log do backend
4. compara: o que o atacante mandou × o que o backend viu

## ⚠ ele NÃO conclui
ele dá a CONTAGEM e o LOG.
✓ a classificação é o seu trabalho (Parser Differentials, módulo 3).
EOF

cat > evidencia/README.md <<'EOF'
# Evidência

## ⚠ LITERAL
   · o comando
   · a saída
   · o log do backend
   · a contagem de cada camada

## ⚠ e o isolamento
   · tudo em 127.0.0.1
   · teste de saída que FALHA
EOF

echo "  ✓ READMEs criados"
echo

echo "═══ VERIFICANDO ═══"
printf '  %-12s ' "nginx:";  (nginx -v 2>&1 | head -1) || echo "⚠ ausente"
printf '  %-12s ' "haproxy:"; (haproxy -v 2>&1 | head -1) || echo "⚠ ausente"
printf '  %-12s ' "python3:"; python3 --version 2>/dev/null || echo "⚠"
printf '  %-12s ' "docker:"; (docker --version 2>/dev/null) || echo "⚠ (opcional)"
echo
pip3 install --quiet requests h11 h2 2>&1 | tail -1
for m in requests h11 h2; do
    printf '  %-12s ' "$m:"; python3 -c "import $m" 2>/dev/null && echo "✓" || echo "⚠"
done
echo

echo "── ⚠ O LIMITE ──"
cat <<'EXPL'
   ✓ você sobe as camadas no SEU lab
   ✓ mede o desync entre processos SEUS
   ⚠ NENHUM CDN, WAF, proxy ou host de terceiro
   ⚠ um smuggler contra terceiro é CRIME (154-A, 266)
EXPL
echo
find . -maxdepth 2 -type d | sort | sed 's/^/  /'
SCRIPT

chmod +x monta-lab.sh
./monta-lab.sh
```

⚠ **O README do `backends/` é o mais importante do módulo.** **Ele diz que o backend é o
**instrumento** — **e que sem log, o lab não mede.**

⚠ **E a nota final é a linha do curso.** **A diferença em relação aos cursos anteriores é o
**alcance do dano**: um payload desync contra terceiro já é o crime.**

**Produza `laboratorio.md`:**

| Pasta | O que guarda | Por quê |
|---|---|---|
| `frontends/` | | |
| `backends/` | | |
| `harness/` | | |

**Responda:**

1. **O que o backend precisa logar?** Por quê?
2. **O que acontece sem log?**
3. **Quais ferramentas faltam** no seu sistema?
4. **O que o lab garante** sobre terceiros?

---

## 1.4 O primeiro par

⚠ **A escolha do primeiro par. E o critério é diferente do Parser Differentials.**

| Critério | Por quê |
|---|---|
| **Proxy + backend simples** | ⚠ Você controla os dois |
| **Config legível** | Você vê a regra de framing |
| **Backend que loga** | ⚠ **É o instrumento** |
| **Uma camada só** | Duas já bastam |
| ⚠ **Não é CDN** | Nada de terceiro |
| ⚠ **Não é HTTP/2, ainda** | H2 é o módulo 6 |

⚠ **A primeira linha é a mais prática.** **Um proxy reverso simples na frente de um backend simples
já é o cenário completo.** **Você não precisa de uma cadeia de cinco camadas.**

⚠ **E a tabela dos pares por dificuldade:**

| Par | Onde a divergência vem | Serve para |
|---|---|---|
| **nginx → python** | As regras de cada um | ✓ **Começar** |
| haproxy → python | Idem | ✓ Bom |
| **nginx → nginx** | Configurações | Médio |
| nginx → apache | Produtos diferentes | Bom |
| proxy → cache → backend | ⚠ Três camadas | Módulo 8 |
| ⚠ proxy → CDN → origem | ⚠ **Não faça** | — |

⚠ **A última linha precisa ser dita.** **É o cenário clássico dos artigos** — **e é o que você
**não** reproduz contra terceiro.** **Você reproduz o **mecanismo**, com duas camadas suas.**

⚠ **A regra escrita:**

> **Duas camadas suas bastam para o mecanismo.** **O que muda entre um lab e um ataque é o
> **destino**, não a técnica.**

```bash
cd ~/smuggle-lab/mod01

echo "═══ 6. o primeiro par ═══"
echo
cat > escolha-par.md <<'EOF'
# Escolha do primeiro par

## Critérios
| Critério | Peso | Por quê |
|---|---|---|
| proxy + backend simples | alto | você controla os dois |
| config legível | alto | ver a regra de framing |
| ⚠ backend que LOGA | muito alto | é o instrumento |
| uma camada só | alto | duas bastam |
| ⚠ NÃO é CDN | absoluto | nada de terceiro |
| ⚠ NÃO é HTTP/2, ainda | alto | H2 é o módulo 6 |

## Candidatos
| # | Frontend | Backend | Config visível? | Escolha? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

## O escolhido
| Item | Valor |
|---|---|
| Frontend | |
| Versão | |
| Porta | 127.0.0.1:____ |
| Backend | |
| Porta | 127.0.0.1:____ |
| ⚠ Regra de framing do frontend | |
| ⚠ Regra de framing do backend | |

## O que eu vou medir
| # | Medição | Como |
|---|---|---|
| 1 | contagem de requisições | log do backend |
| 2 | o path que o backend viu | log |
| 3 | o deslocamento | o corpo registrado |

## ⚠ O que eu NÃO vou fazer
- [ ] não vou apontar para CDN, WAF ou host de terceiro
- [ ] não vou usar dado de terceiro
- [ ] não vou testar em produção
- [ ] não vou publicar antes de reportar
EOF

cat escolha-par.md
```

⚠ **A ficha é o compromisso do lab.** **E a linha do `127.0.0.1` em cada porta é deliberada:** **ela
é o que você confirma antes de rodar qualquer coisa.**

⚠ **E a pergunta "regra de framing de cada um?" é a carta de divergência do Parser Differentials,
aplicada aqui.** **Você escreve o que espera — e mede se acertou.**

**Produza `primeiro-par.md`:**

| Item | Valor |
|---|---|
| Frontend | |
| Backend | |
| Regra do frontend | |
| Regra do backend | |
| O que medir | |

**Responda:**

1. **Por que duas camadas bastam?**
2. **Por que o backend precisa logar?**
3. **Por que não reproduzir o cenário com CDN?**
4. **Qual a regra de framing de cada camada** — na sua previsão?

---

## 1.5 LAB — Monte o laboratório

**Duração:** 60 min

### Passo 1 — A estrutura (25 min)

```bash
cd ~/smuggle-lab
bash ~/smuggle-lab/mod01/monta-lab.sh 2>&1 | head -40
```

Produza `estrutura.md`:

| Pasta | O que guarda | Por quê |
|---|---|---|
| `frontends/` | | |
| `backends/` | | |
| `harness/` | | |
| `evidencia/` | | |
| `caderno/` | | |

**Responda:**

1. **Quais pastas existem?** O que cada README delimita?
2. **Quais ferramentas faltam?**
3. **O que o README do `backends/` exige?** Por quê?
4. **O que o harness NÃO faz?**

### Passo 2 — Suba duas camadas (35 min)

⚠ **Um proxy e um backend que loga. Os dois em 127.0.0.1.**

```bash
cd ~/smuggle-lab/backends

echo "═══ SUBINDO O BACKEND QUE LOGA ═══"
echo
cat > backend_log.py <<'PY'
#!/usr/bin/env python3
"""
backend_log.py — o INSTRUMENTO DE MEDIDA.

⚠ ele loga TUDO o que recebe: path, headers, corpo, e CONTAGEM.
   sem isso, o lab não mede — você fica afirmando sem ver.

⚠ DIDÁTICO e LOCAL (127.0.0.1).
"""
import socket, sys, threading, os, re

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8080
LOG = os.path.expanduser("~/smuggle-lab/evidencia/backend.log")

_contador = 0
_lock = threading.Lock()


def le_requisicao(sock):
    """lê uma requisição e retorna (cabecalho, corpo, bytes_totais)"""
    dados = b""
    while b"\r\n\r\n" not in dados:
        b = sock.recv(1)
        if not b:
            return None, b"", len(dados)
        dados += b

    fim = dados.index(b"\r\n\r\n") + 4
    cabecalho = dados[:fim]

    # ── extrai o Content-Length, se houver ──
    cl = 0
    for linha in cabecalho.decode(errors="replace").split("\r\n"):
        if linha.lower().startswith("content-length:"):
            try: cl = int(linha.split(":", 1)[1].strip())
            except ValueError: cl = 0

    corpo = dados[fim:]
    while len(corpo) < cl:
        b = sock.recv(cl - len(corpo))
        if not b: break
        corpo += b

    return cabecalho, corpo, fim + len(corpo)


def atende(cli):
    global _contador
    try:
        while True:
            cabecalho, corpo, total = le_requisicao(cli)
            if cabecalho is None:
                break

            with _lock:
                _contador += 1
                n = _contador

            linhas = cabecalho.decode(errors="replace").split("\r\n")
            primeira = linhas[0] if linhas else "(vazia)"
            path = primeira.split(" ")[1] if len(primeira.split(" ")) > 1 else "/"

            # ── ⚠ O LOG — é a medida ──
            with open(LOG, "a") as f:
                f.write(f"\n═══ requisição #{n} ═══\n")
                f.write(f"PRIMEIRA_LINHA: {primeira}\n")
                f.write(f"PATH: {path}\n")
                f.write(f"HEADERS:\n")
                for l in linhas[1:]:
                    if l: f.write(f"  {l}\n")
                f.write(f"CORPO ({len(corpo)}B): {corpo[:120]!r}\n")
                f.write(f"TOTAL_CONSUMIDO: {total}B\n")

            print(f"  [backend #{n}] {primeira[:56]}", flush=True)
            print(f"      ⚠ path={path[:40]}  corpo={len(corpo)}B", flush=True)

            corpo_resp = f"OK #{n} path={path}".encode()
            cli.sendall(
                b"HTTP/1.1 200 OK\r\n"
                b"Content-Type: text/plain\r\n"
                b"Content-Length: " + str(len(corpo_resp)).encode() + b"\r\n"
                b"Connection: keep-alive\r\n\r\n" + corpo_resp
            )
    except Exception:
        pass
    finally:
        try: cli.close()
        except Exception: pass


def main():
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    open(LOG, "w").close()
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(5)
    print(f"═══ BACKEND em {HOST}:{PORT} ═══")
    print(f"  log: {LOG}")
    print("  ⚠ loga path, headers, corpo e CONTAGEM")
    print("  ⚠ local, didático.")
    print()
    while True:
        cli, _ = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x backend_log.py

echo "  ── o backend está pronto ──"
echo
echo "═══ E O FRONTEND — com a regra OPOSTA ═══"
echo
cat > ../frontends/proxy_te.py <<'PY'
#!/usr/bin/env python3
"""
proxy_te.py — um frontend que lê com a regra do Transfer-Encoding.

⚠ DIDÁTICO e LOCAL. frontend em 127.0.0.1 → backend em 127.0.0.1.
   NUNCA aponte isto para um serviço de terceiro.
"""
import socket, sys, threading

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8081
BACKEND = ("127.0.0.1", int(sys.argv[2]) if len(sys.argv) > 2 else 8080)


def le_cabecalho(sock):
    dados = b""
    while b"\r\n\r\n" not in dados:
        b = sock.recv(1)
        if not b: return None
        dados += b
    return dados


def tem_te(cabecalho: bytes) -> bool:
    return any(
        l.lower().startswith("transfer-encoding:")
        for l in cabecalho.decode(errors="replace").split("\r\n")
    )


def atende(cli):
    try:
        cab = le_cabecalho(cli)
        if cab is None:
            cli.close(); return

        resto = b""
        if tem_te(cab):
            # ⚠ a regra do TE: lê em chunks até o chunk 0
            buf = b""
            while True:
                linha = b""
                while not linha.endswith(b"\r\n"):
                    b = cli.recv(1)
                    if not b: break
                    linha += b
                if not linha: break
                try: tam = int(linha.strip().split(b";")[0], 16)
                except ValueError: break
                buf += linha
                if tam == 0:
                    buf += cli.recv(2)      # o \r\n final
                    break
                dados = b""
                while len(dados) < tam:
                    b = cli.recv(tam - len(dados))
                    if not b: break
                    dados += b
                buf += dados + b"\r\n"
            resto = buf

        print(f"  [frontend] TE={'sim' if tem_te(cab) else 'não'}  "
              f"consumiu {len(cab)+len(resto)}B", flush=True)

        with socket.create_connection(BACKEND, timeout=3) as be:
            be.sendall(cab + resto)
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
    print(f"═══ FRONTEND em {HOST}:{PORT} → {BACKEND} ═══")
    print("  ⚠ regra: Transfer-Encoding vence")
    print("  ⚠ local, didático. nunca aponte para terceiro.")
    print()
    while True:
        cli, _ = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x ../frontends/proxy_te.py

echo "  ── os dois prontos ──"
ls -1 backend_log.py ../frontends/proxy_te.py | sed 's/^/     /'
echo
echo "  ── PARA RODAR ──"
cat <<'EXPL'
     # terminal 1 — o backend (instrumento de medida)
     python3 ~/smuggle-lab/backends/backend_log.py 8080

     # terminal 2 — o frontend (regra do TE)
     python3 ~/smuggle-lab/frontends/proxy_te.py 8081 8080

     # e o log, que é a MEDIDA:
     tail -f ~/smuggle-lab/evidencia/backend.log
EXPL
```

⚠ **O par é o instrumento.** **O frontend lê com a regra do `TE` — e o backend lê com a do `CL`** —
**e as duas discordam.** **A divergência está montada, e o log é a medida.**

⚠ **E a nota no cabeçalho de cada script é deliberada.** **O mesmo código apontado para fora é
smuggling** — **e o comentário registra o limite.**

**Produza `par-montado.md`:**

| Componente | Porta | Regra |
|---|---|---|
| Frontend | | |
| Backend | | |
| Log | | |

**Responda:**

1. **Qual a regra de cada camada?**
2. **O backend loga o quê?** Cite quatro itens.
3. **Onde está a medida do desync?**
4. **O par é local?** Confirme as duas portas.

### Passo 3 — Teste uma requisição normal (e o log) (20 min)

⚠ **Antes do ataque, o **normal** — é o controle.**

```bash
cd ~/smuggle-lab

echo "═══ O CONTROLE ═══"
echo
cat <<'EXPL'
  ── ANTES DE TESTAR A DIVERGÊNCIA, TESTE O NORMAL ──

     1. mande UMA requisição simples pelo frontend
     2. ⚠ veja se o backend LOGOU
     3. e anote o formato do log

  ── O COMANDO ──
     printf 'GET /teste HTTP/1.1\r\nHost: localhost\r\n\r\n' \
       | timeout 3 nc 127.0.0.1 8081

     (ou com python, se o nc não existir)

  ── ⚠ O QUE CONFIRMAR ──
     · o backend registrou "#1"?
     · o PATH está correto?
     · o log tem HEADERS, CORPO e TOTAL_CONSUMIDO?
     ✓ se sim, o instrumento funciona.
EXPL

cat > evidencia/controle.md <<'EOF'
# O controle

## ⚠ sem o controle, não há medida

| Item | Valor |
|---|---|
| comando | |
| o frontend logou? | |
| ⚠ o backend logou? | |
| contagem | |
| o PATH está correto? | |

## O formato do log
```
[cole o log literal]
```

## A conclusão
| Item | Valor |
|---|---|
| o instrumento funciona? | |
| o caminho está aberto? | |
| posso medir o desync? | |
EOF

cat evidencia/controle.md
```

⚠ **O controle é obrigatório, e a razão é a mesma do Parser Differentials.** **Sem ele, você não
sabe se o desync que você vê é o ataque ou o seu lab quebrado.**

⚠ **E a nota do formato do log é o que permite comparar depois.** **Você registra o normal** —
**para reconhecer o anormal.**

**Produza `controle.md`:**

| Item | Valor |
|---|---|
| O backend logou? | |
| Contagem | |
| Path correto? | |
| Instrumento funciona? | |

**Responda:**

1. **O controle passou?**
2. **O log tem os quatro itens?**
3. **O instrumento funciona?**
4. **O que aconteceria sem o controle?**

### Critérios de aceitação

- `modelo.md` com os **três** atores e as **quatro** classes.
- Você explicou **a diferença central entre smuggling e desync**.
- Você explicou **por que a vítima é uma terceira pessoa**.
- `efeitos.md` com os **cinco** efeitos e o que cada um exige.
- Você explicou **por que o bypass não é "roubar credencial"**.
- Você citou **três coisas que o smuggling não dá**.
- Você explicou **por que o timing importa**.
- O laboratório montado com as **cinco** pastas e os READMEs.
- Você explicou **o que o README do `backends/` exige**.
- Você explicou **o que acontece sem log**.
- `primeiro-par.md` com o par e as **duas regras de framing** previstas.
- Você explicou **por que duas camadas bastam**.
- Você explicou **por que não reproduzir o cenário com CDN**.
- **Duas camadas subindo**, ambas em 127.0.0.1.
- O **backend loga** path, headers, corpo e contagem.
- O **controle** rodou, com o log literal registrado.
- Você confirmou que o **instrumento funciona**.
- ⚠ **Nenhum serviço de terceiro.** Nenhum CDN, WAF ou proxy alheio.

---

## Avaliação

1. **O que o atacante injeta no smuggling?**
2. **O que é o desync**, e por que o termo é mais preciso?
3. **Qual a diferença de vítima** entre smuggling e desync?
4. **Cite as quatro classes** e o que cada uma dá.
5. **O que o cache poisoning amplia?**
6. **Cite os cinco efeitos** do smuggling.
7. **Qual é o mais valioso?** Por quê?
8. **Por que o bypass não é "roubar credencial"?**
9. **O que o smuggling NÃO dá?** Cite três.
10. **Por que o timing importa?** Como os pesquisadores lidam?
11. **O que o backend precisa logar?** Por quê?
12. **O que acontece sem log?**
13. **Cite as cinco pastas** do laboratório e o que cada uma guarda.
14. **Por que duas camadas bastam?**
15. **Por que não reproduzir com CDN?**
16. **Qual o critério de escolha do primeiro par?**
17. **Por que o backend é o instrumento?**
18. **O que é o controle**, e por que é obrigatório?
19. **O que muda entre um lab e um ataque?**
20. **Qual é a regra sobre 127.0.0.1** neste curso?

---

**Próximo:** [Módulo 2 — O protocolo e as camadas](modulo-02.md)
