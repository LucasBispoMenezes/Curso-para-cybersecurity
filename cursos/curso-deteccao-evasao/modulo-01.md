# Módulo 1 — O Jogo

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** Pesquisa em Segurança (módulos 5 e 6) · Parser Differentials (módulo 3)

---

## Objetivos

1. Entender por que **detecção é uma decisão**, não uma descoberta.
2. Situar o **detector** e o **atacante** no mesmo fluxo de bytes — e no que cada um vê.
3. Reconhecer as **três posturas** de defesa e o custo de cada.
4. Montar o laboratório de detecção.
5. Escolher o **primeiro ataque a detectar** — com critério.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o curso:**

> **O detector e o atacante olham para os mesmos bytes.** **A diferença é o que cada um consegue
> ver daquele lado do parser.**

⚠ **E a consequência prática, e ela é dura:**

| | O atacante vê | O detector vê |
|---|---|---|
| A entrada | ⚠ **O original** | ⚠ **O normalizado** |
| O contexto | ⚠ **O dele** | ⚠ **O do produto** |
| O erro | ⚠ **Nada** | ⚠ **O log** |
| O tempo | ⚠ **Ele escolhe** | ⚠ **Ele não escolhe** |
| ⚠ **O feedback** | ⚠ **Imediato** | ⚠ **Atrasado, e ruidoso** |

⚠ **A última linha é a assimetria estrutural.** **O atacante sabe na hora se passou; o detector
descobre horas depois, e com 200 alertas falsos no meio.**

⚠ **A tese:**

> **Detecção é decidir o que vale a pena ver, sabendo que ver custa.** **E o custo é o falso
> positivo** — **porque um alerta que ninguém olha não é detecção.**

⚠ **E é o que os cursos anteriores mostraram por outro ângulo:** **o `WAFFLED` achou 120+ exploits
contra 5 WAFs.** **Aqueles produtos tinham regras.** **E as regras não bastaram.**

---

## 1.1 As três posturas

⚠ **Toda defesa adota uma das três. E cada uma tem um custo diferente.**

| Postura | O que faz | ⚠ Custo | Exemplo |
|---|---|---|---|
| **Prevenir** | Impede a ação | ⚠ Quebra o legítimo | WAF que rejeita |
| **Detectar** | Registra e alerta | ⚠ **Falso positivo** | IDS, SIEM |
| **Responder** | Age após o alerta | ⚠ **Tempo de exposição** | SOAR, playbook |

⚠ **A tabela das trocas, e ela é o orçamento do curso:**

| Postura | Falso positivo | Falso negativo |
|---|---|---|
| **Prevenir agressivo** | ⚠⚠ **Alto** | Baixo |
| **Detectar amplo** | ⚠ **Alto** | Baixo |
| **Detectar estreito** | Baixo | ⚠ **Alto** |
| ⚠ **Equilibrado** | **Orçado** | **Declarado** |

⚠ **A linha do "equilibrado" é a única sustentável, e é a que o curso ensina.** **Não existe regra
sem falso positivo** — **existe regra cujo falso positivo você **conhece** e **orçou****.

⚠ **E é a mesma lição do módulo 3 do Parser Differentials:** **o critério explícito é o que separa
o trabalho do chute.** **Lá era "é bug?"; aqui é "quanto custa?".**

⚠ **A regra escrita:**

> **Toda regra erra.** **A pergunta não é "esta regra é boa?"** — **é "quantas vezes ela erra, e
> alguém está disposto a olhar?".**

```bash
mkdir -p ~/detect-lab/mod01 && cd ~/detect-lab/mod01

echo "═══ 1. as três posturas ═══"
echo
cat > posturas.md <<'EOF'
# As três posturas

| Postura | O que faz | Custo | Exemplo |
|---|---|---|---|
| PREVENIR | impede a ação | quebra o legítimo | WAF que rejeita |
| DETECTAR | registra e alerta | ⚠ FALSO POSITIVO | IDS, SIEM |
| RESPONDER | age após o alerta | ⚠ tempo de exposição | SOAR |

## As trocas
| Postura | Falso positivo | Falso negativo |
|---|---|---|
| prevenir agressivo | ⚠⚠ ALTO | baixo |
| detectar amplo | ⚠ alto | baixo |
| detectar estreito | baixo | ⚠ ALTO |
| ⚠ EQUILIBRADO | orçado | declarado |

## ⚠ a assimetria estrutural
| | o ATACANTE vê | o DETECTOR vê |
|---|---|---|
| a entrada | o ORIGINAL | o NORMALIZADO |
| o contexto | o dele | o do PRODUTO |
| o erro | nada | o LOG |
| o tempo | ELE escolhe | ele NÃO escolhe |
| ⚠ o feedback | ⚠ IMEDIATO | ⚠ ATRASADO e ruidoso |

## ⚠ A REGRA
toda regra erra.
a pergunta não é "esta regra é boa?" —
é "quantas vezes ela erra, e alguém está disposto a OLHAR?".
EOF

cat posturas.md
```

⚠ **A tabela das trocas é o orçamento.** **E a linha do "equilibrado" é a única honesta** —
**porque as outras três escondem o custo em vez de declará-lo.**

⚠ **E a assimetria do feedback é o que torna o jogo desigual:** **o atacante itera em segundos; o
detector descobre em horas.**

**Produza `posturas.md`:**

| Postura | Custo | Exemplo |
|---|---|---|
| Prevenir | | |
| Detectar | | |
| Responder | | |

**Responda:**

1. **Qual é a postura sustentável?** Por que as outras escondem o custo?
2. **Por que o falso positivo é o custo central?
3. **O que a assimetria do feedback muda?
4. **Como isso se liga ao critério do Parser Differentials?

---

## 1.2 O que cada um vê

⚠ **O fluxo de bytes, e onde cada um está. E é o mesmo desenho do curso anterior.**

```
┌──────────────────────────────────────────────────────────────────────┐
│   ATACANTE ──── bytes ────► CAMADA A ────► CAMADA B ────► DADOS       │
│                                  │                            │       │
│                             ⚠ O DETECTOR                     │       │
│                               vive AQUI                      │       │
│                                  │                            │       │
│                             e vê o que                e o que         │
│                             a camada viu              o backend viu   │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ ⚠ E A DISCORDÂNCIA ENTRE OS DOIS É A SUPERFÍCIE DE DETECÇÃO           │
│                                                                      │
│   · o atacante explora o que A entrega e B entende diferente          │
│   · o detector, se estiver em A, vê a forma NORMALIZADA               │
│   · ⚠ e se o backend processa outra, o detector NUNCA VIU o que       │
│     de fato aconteceu                                                │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A última linha é a tese do curso inteiro.** **O detector vive numa camada** — **e a discordância
entre camadas é, para ele, **um ponto cego**.**

⚠ **A tabela do que cada posição do detector vê:**

| Onde o detector está | O que ele vê | ⚠ Ponto cego |
|---|---|---|
| **Antes** do WAF | ⚠ **O original** | Não sabe o que o WAF decidiu |
| **No** WAF | O normalizado **dele** | ⚠ **O que o backend vê** |
| **Depois** do WAF | O que o WAF deixou passar | ⚠ O que ele removeu |
| ⚠ **No backend** | ⚠ **O que EXECUTOU** | ⚠ O caminho até lá |

⚠ **A linha do "no backend" é a mais valiosa e a mais cara.** **É a única que vê o que de fato
aconteceu** — **e é a única que exige instrumentar o sistema em produção.**

⚠ **E a linha do "no WAF" é onde a maioria está** — **e é exatamente onde o ponto cego tem o
tamanho do diferencial de parsers.**

⚠ **A regra escrita:**

> **O detector vê a forma da sua camada — não a do backend.** **E é por isso que a evasão existe: o
> atacante escolhe um byte que a sua forma não mostra.**

```bash
cd ~/detect-lab/mod01

echo "═══ 2. o que cada um vê ═══"
echo
cat > quem-ve.md <<'EOF'
# O que cada um vê

## Onde o detector está
| Posição | O que vê | Ponto cego |
|---|---|---|
| ANTES do WAF | o original | não sabe o que o WAF decidiu |
| NO WAF | o normalizado DELE | ⚠ o que o BACKEND vê |
| DEPOIS do WAF | o que ele deixou passar | o que ele REMOVEU |
| ⚠ NO BACKEND | ⚠ o que EXECUTOU | o caminho até lá |

## ⚠ a linha valiosa e cara
o detector NO BACKEND é o único que vê o que DE FATO aconteceu.
e é o único que exige instrumentar o sistema em PRODUÇÃO.

## ⚠ e a linha onde a maioria está
NO WAF.
e é exatamente onde o ponto cego tem o tamanho
do DIFERENCIAL DE PARSERS.

## ⚠ A REGRA
o detector vê a forma da SUA camada —
não a do BACKEND.
✓ e é por isso que a EVASÃO existe:
   o atacante escolhe um byte que a sua forma NÃO MOSTRA.
EOF

cat quem-ve.md

echo
echo "═══ 3. e a assimetria, medida ═══"
echo
cat <<'EXPL'
  ── O ATACANTE ITERA ──
     · manda o payload
     · ⚠ vê a resposta em SEGUNDOS
     · ajusta
     · repete
     ✓ ciclo de segundos.

  ── O DETECTOR ITERA ──
     · escreve a regra
     · espera o tráfego
     · ⚠ recebe 200 falsos positivos
     · triagem
     · ajusta
     ✓ ciclo de HORAS ou DIAS.

  ── E O QUE ISSO SIGNIFICA ──
     ⚠ o atacante tem mais iterações no mesmo tempo.
     ✓ e é por isso que a detecção precisa ser
        MEDIDA, e não ajustada por impressão.
EXPL
```

⚠ **A assimetria de iteração é o argumento para medir.** **Se o atacante itera mais rápido, o
detector não pode se dar ao luxo de ajustar por intuição** — **ele precisa de número.**

⚠ **E é a razão do módulo 6 existir:** **medir o próprio falso positivo é o que compensa a
assimetria.**

**Produza `quem-ve.md`:**

| Posição | O que vê | Ponto cego |
|---|---|---|
| No WAF | | |
| No backend | | |

**Responda:**

1. **Onde a maioria dos detectores está?** Por que é o pior lugar?
2. **Qual é o ponto cego** de cada posição?
3. **Por que a assimetria de iteração importa?
4. **O que compensa a assimetria?

---

## 1.3 O laboratório

⚠ **O lab do curso: **o atacante do curso anterior, e o sensor próprio.**

| Pasta | O que guarda |
|---|---|
| `regras/` | As assinaturas — Sigma, Suricata, ou regex |
| `ataque/` | ⚠ **O atacante simulado** — o do lab anterior |
| `telemetria/` | As configs de log |
| `medicoes/` | ⚠ **A taxa de acerto e de FP** |
| `caderno/` | O módulo 3 do Pesquisa |

⚠ **A pasta `ataque/` é a que liga os cursos.** **Você não escreve um atacante novo** — **você reusa
o do Parser Differentials** — **e é por isso que ter feito o ofensivo é pré-requisito.**

⚠ **E a tabela do que o lab precisa ter:**

| Requisito | Por quê |
|---|---|
| **O atacante, no seu lab** | ⚠ Para gerar o tráfego |
| **Tráfego normal** | ⚠ **Para medir o FP** |
| **O sensor** | Suricata, Zeek, ou um script |
| ⚠ **O corpus de tráfego** | ⚠ **É o que torna a medição possível** |

⚠ **A terceira linha é a que quase todos esquecem.** **Medir o falso positivo exige tráfego
**legítimo** — **e ninguém tem tráfego legítimo no lab.**

⚠ **A tabela de onde obter tráfego legítimo:**

| Fonte | Serve? |
|---|---|
| Você navegando | ⚠ Pouco volume |
| ⚠ **Um crawler no seu site** | ✓ Bom |
| Tráfego sintético normal | ✓ **Controlado** |
| ⚠ Tráfego de produção | ⚠ **Não é seu** |
| Captura pública (PCAP) | ✓ Anonimizada |

⚠ **A linha do PCAP público é a mais prática.** **Existem capturas rotuladas e anonimizadas** —
**e elas dão volume sem tocar em tráfego de ninguém.**

⚠ **A regra escrita:**

> **Sem tráfego legítimo, você não mede falso positivo** — **e sem medir, você não tem taxa.** **O
> tráfego é parte do laboratório, não um detalhe.**

```bash
cd ~/detect-lab

echo "═══ 4. o laboratório ═══"
echo
cat > monta-lab.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "═══ LABORATÓRIO DE DETECÇÃO ═══"
echo

cd ~/detect-lab 2>/dev/null || { mkdir -p ~/detect-lab && cd ~/detect-lab; }
for d in regras ataque telemetria medicoes caderno; do
    mkdir -p "$d"; printf '  ✓ %s/\n' "$d"
done
echo

cat > regras/README.md <<'EOF'
# Regras

## Convenção
   regras/<tipo>-<nome>.<ext>
   ex.: sigma-web-shell.yml
        suricata-smuggling.rules
        regex-evasao.txt

## ⚠ o que registrar por regra
| Campo | Valor |
|---|---|
| o que ela detecta | |
| o TTP (ATT&CK) | |
| ⚠ taxa de detecção | |
| ⚠ taxa de FALSO POSITIVO | |
| o que ela NÃO pega | |
EOF

cat > ataque/README.md <<'EOF'
# Ataque

⚠ O ATACANTE É O DO CURSO ANTERIOR.
   · Parser Differentials (módulo 5)
   · HTTP Smuggling (módulos 3, 6, 8)

✓ e ele roda em 127.0.0.1 — SEMPRE.

## O que guardar aqui
| Item | Valor |
|---|---|
| o payload | |
| a variante | |
| ⚠ o TTP | |
| como reproduzir | |
EOF

cat > telemetria/README.md <<'EOF'
# Telemetria

## As três fontes
| Fonte | O que dá | Custo |
|---|---|---|
| access log | path, status | baixo |
| log de aplicação | o que executou | ⚠ alto |
| tráfego (PCAP) | tudo | ⚠⚠ muito alto |

## ⚠ e o que falta
| O que eu queria ver | Está logado? |
|---|---|
| o payload ORIGINAL | |
| a forma NORMALIZADA | |
| o que o backend EXECUTOU | |
EOF

cat > medicoes/README.md <<'EOF'
# Medições

## ⚠ o que toda regra precisa
| Métrica | Fórmula |
|---|---|
| detecção | ataques pegos / ataques totais |
| FALSO POSITIVO | alertas legítimos / tráfego legítimo |
| precisão | TP / (TP + FP) |
| ⚠ custo por alerta | minutos de triagem |

## ⚠ sem o tráfego legítimo, NÃO HÁ FP
e sem o FP, a regra não sobrevive.
EOF

echo "  ✓ READMEs criados"
echo

echo "═══ VERIFICANDO ═══"
for t in suricata zeek python3 docker; do
    printf '  %-12s ' "$t:"
    command -v "$t" >/dev/null 2>&1 && echo "✓" || echo "⚠ ausente"
done
echo
python3 - <<'PY'
mods = ["requests", "yaml", "scapy"]
for m in mods:
    try:
        __import__(m); print(f"  {m:<12} ✓")
    except ImportError:
        print(f"  {m:<12} ⚠ (pip3 install {m})")
PY
echo

echo "── ⚠ O LIMITE ──"
cat <<'EXPL'
   ✓ o atacante é SIMULADO, no seu lab
   ✓ a regra roda no SEU sensor
   ⚠ NENHUM SIEM, WAF ou sensor de terceiro
   ⚠ evasão usada contra alvo real é CRIME (154-A, 266)
EXPL
echo
find . -maxdepth 2 -type d | sort | sed 's/^/  /'
SCRIPT

chmod +x monta-lab.sh
./monta-lab.sh
```

⚠ **O README de `ataque/` é o que liga os cursos** — **e ele repete o limite:** **sempre 127.0.0.1.**

⚠ **E o README de `medicoes/` estabelece as quatro métricas.** **Sem elas, não há taxa** — **e sem
taxa, a regra é opinião.**

**Produza `laboratorio.md`:**

| Pasta | O que guarda | Por quê |
|---|---|---|
| `regras/` | | |
| `ataque/` | | |
| `medicoes/` | | |

**Responda:**

1. **De onde vem o atacante?** Por que isso é pré-requisito?
2. **O que cada README exige?
3. **Quais ferramentas faltam?
4. **O que o lab garante** sobre terceiros?

---

## 1.4 O primeiro alvo

⚠ **A escolha do primeiro ataque a detectar. E o critério é diferente dos cursos ofensivos.**

| Critério | Por quê |
|---|---|
| **Você sabe reproduzir** | ⚠ **Sem ataque, não há detecção a medir** |
| **O ataque deixa rastro** | ⚠ **Em algum log que você tem** |
| **O rastro é distinguível** | Nem tudo é |
| **O tráfego legítimo é fácil** | ⚠ **Para medir o FP** |
| ⚠ **Não é HTTP/2, ainda** | A conversão complica |
| ⚠ **Não é client-side, ainda** | Sem tráfego de navegador real |

⚠ **A primeira linha é a que inverte o raciocínio ofensivo.** **Você não escolhe pelo impacto; você
escolhe pela **rastreabilidade**.**

⚠ **E a tabela do que deixa rastro, por ataque:**

| Ataque (do curso anterior) | Rastro | ⚠ Onde |
|---|---|---|
| **CL.TE** | ⚠ **Path estranho no backend** | Log do backend |
| **TE.CL** | Idem | Log do backend |
| **CL.CL** | ⚠ **Dois `CL`** | Access log |
| **Espaço no header** | ⚠ **Forma inválida** | Access log |
| **H2 → H1** | ⚠ **Header criado na conversão** | Log do backend |
| ⚠ **Client-side** | ⚠ **Sem rastro no servidor** | ⚠ Difícil |

⚠ **A última linha é a mais honesta, e a mais interessante.** **O client-side desync produz
requisições que **parecem legítimas** — **porque vêm do navegador da vítima.** **É o ataque mais
difícil de detectar do curso anterior** — **e por isso é o último aqui.**

⚠ **E a regra, escrita:**

> **Você detecta o que consegue distinguir do normal.** **E "distinguir do normal" exige saber como é
> o normal** — **que é o tráfego legítimo do lab.**

```bash
cd ~/detect-lab/mod01

echo "═══ 5. o primeiro alvo ═══"
echo
cat > escolha-alvo.md <<'EOF'
# Escolha do primeiro alvo

## Critérios
| Critério | Peso | Por quê |
|---|---|---|
| ⚠ eu SABEI reproduzir | muito alto | sem ataque, não há detecção a medir |
| deixa RASTRO | muito alto | em algum log que eu tenho |
| o rastro é DISTINGUÍVEL | alto | nem tudo é |
| tráfego legítimo é fácil | alto | ⚠ para medir o FP |
| NÃO é HTTP/2, ainda | médio | a conversão complica |
| ⚠ NÃO é client-side, ainda | alto | sem tráfego de navegador real |

## O que deixa rastro, por ataque
| Ataque | Rastro | Onde |
|---|---|---|
| CL.TE | path estranho | log do backend |
| CL.CL | dois CL | access log |
| espaço no header | forma inválida | access log |
| H2 → H1 | header criado | log do backend |
| ⚠ client-side | ⚠ SEM rastro no servidor | ⚠ difícil |

## O escolhido
| Item | Valor |
|---|---|
| O ataque | |
| A variante | |
| ⚠ Deixa rastro em | |
| O tráfego legítimo será | |
| Por que este | |

## ⚠ O que eu NÃO vou detectar ainda
| Ataque | Por quê |
|---|---|
| | |
EOF

cat escolha-alvo.md
```

⚠ **A ficha inverte o raciocínio ofensivo.** **E a última seção — o que você não vai detectar — é
obrigatória:** **declarar o escopo é o que torna a taxa interpretável.**

⚠ **E a nota do client-side é a ponte para o módulo 9:** **o ataque mais difícil de detectar é o que
deixa menos rastro** — **e a evasão é justamente isso.**

**Produza `primeiro-alvo.md`:**

| Item | Valor |
|---|---|
| Ataque | |
| Rastro em | |
| Tráfego legítimo | |
| Não vou detectar | |

**Responda:**

1. **Qual ataque você escolheu?** Por quê ele deixa rastro?
2. **Por que a rastreabilidade é o critério, e não o impacto?
3. **Por que o client-side fica para depois?
4. **O que você não vai detectar?

---

## 1.5 LAB — Monte o laboratório

**Duração:** 60 min

### Passo 1 — A estrutura (25 min)

```bash
cd ~/detect-lab
bash ~/detect-lab/mod01/monta-lab.sh 2>&1 | head -40
```

**Produza `estrutura.md`:**

| Pasta | O que guarda | Por quê |
|---|---|---|
| `regras/` | | |
| `ataque/` | | |
| `telemetria/` | | |
| `medicoes/` | | |

**Responda:**

1. **Quais pastas existem?** O que cada README exige?
2. **Quais ferramentas faltam?**
3. **O que o README de `ataque/` repete?** Por quê?
4. **O que o de `medicoes/` estabelece?**

### Passo 2 — Ligue o atacante e o sensor (35 min)

⚠ **O atacante do curso anterior, e um sensor mínimo que lê o log.**

```bash
cd ~/detect-lab

echo "═══ LIGANDO O ATAQUE AO SENSOR ═══"
echo
cat <<'EXPL'
  ── O QUE REUSAR ──

     ataque:  ~/smuggle-lab/          (HTTP Smuggling)
              ~/parser-lab/           (Parser Differentials)

     ⚠ e o backend que LOGA é o sensor primitivo.
        ele já registra path, headers, corpo e CONTAGEM.

  ── E O PRIMEIRO SENSOR É UM SCRIPT ──
     você não precisa de SIEM para começar:
     · lê o log do backend
     · aplica a regra
     · ⚠ e MEDE
EXPL

mkdir -p ~/detect-lab/telemetria

cat > telemetria/sensor_minimo.py <<'PY'
#!/usr/bin/env python3
"""
sensor_minimo.py — o sensor do lab: lê um log e aplica regras.

⚠ DIDÁTICO e LOCAL. lê o SEU log. nenhum SIEM de terceiro.
"""
import sys, os, re, json
from collections import Counter

LOG = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/smuggle-lab/evidencia/backend-cl.log")

# ⚠ as regras — cada uma é uma assinatura
REGRAS = [
    ("R1: dois Content-Length", re.compile(r"(?i)^content-length:.*\ncontent-length:", re.M)),
    ("R2: TE e CL juntos", re.compile(r"(?i)transfer-encoding:.*\n(?:.*\n)*?content-length:", re.M)),
    ("R3: espaço antes do ':'", re.compile(r"(?i)^\w+ :", re.M)),
    ("R4: path com CR ou LF", re.compile(r"PATH:.*[\r\n].+")),
    ("R5: TE ofuscado", re.compile(r"(?i)transfer-encoding:\s*(?!chunked\s*$)\S+")),
]


def le_eventos(caminho: str):
    """quebra o log em eventos (um por requisição)"""
    try:
        txt = open(caminho, errors="replace").read()
    except FileNotFoundError:
        return []
    return [e.strip() for e in txt.split("═══ requisição") if e.strip()]


def avalia(evento: str):
    """retorna a lista de regras que dispararam"""
    return [nome for nome, rx in REGRAS if rx.search(evento)]


def main():
    eventos = le_eventos(LOG)
    print("═══ SENSOR MÍNIMO ═══")
    print()
    print(f"  log    : {LOG}")
    print(f"  eventos: {len(eventos)}")
    print(f"  regras : {len(REGRAS)}")
    print()

    contagem = Counter()
    alertas = []
    for i, ev in enumerate(eventos, 1):
        disparou = avalia(ev)
        for r in disparou:
            contagem[r] += 1
        if disparou:
            alertas.append((i, disparou))

    print(f"  ⚠ alertas: {len(alertas)} de {len(eventos)} eventos")
    print()
    if alertas:
        print("  ── os alertas ──")
        for i, regras in alertas[:10]:
            print(f"     evento #{i}: {', '.join(regras)}")
        if len(alertas) > 10:
            print(f"     ... e mais {len(alertas)-10}")
    print()
    print("  ── por regra ──")
    for nome, n in contagem.most_common():
        print(f"     {n:>4}×  {nome}")
    print()
    print("  ⚠ e o número que importa: quantos destes são FALSO POSITIVO?")
    print("     ⚠ sem o tráfego LEGÍTIMO, você não sabe.")


if __name__ == "__main__":
    main()
PY

chmod +x telemetria/sensor_minimo.py

echo "  ── o sensor está pronto ──"
echo "     python3 ~/detect-lab/telemetria/sensor_minimo.py ~/smuggle-lab/evidencia/backend-cl.log"
echo

cat > caderno/PD-001.md <<'EOF'
# PD-001 — o primeiro alvo

**Data:** ____

## 1. O ataque
| Item | Valor |
|---|---|
| A variante | |
| De onde veio (qual curso) | |
| ⚠ Reproduzo? | |

## 2. O rastro
| Item | Valor |
|---|---|
| Em qual log | |
| O que ele registra | |
| ⚠ É distinguível do normal? | |

## 3. A hipótese de detecção
| Campo | Valor |
|---|---|
| Afirmação | |
| Observação | |
| ⚠ Falsificação | |

## 4. O tráfego legítimo
| Item | Valor |
|---|---|
| De onde virá | |
| Volume | |
| ⚠ Já tenho? | |

## 5. O sensor
| Ferramenta | O que faz |
|---|---|
| sensor_minimo.py | lê o log, aplica regras |

## 6. O que eu NÃO vou detectar
| Ataque | Por quê |
|---|---|
| | |

## 7. O isolamento
| Item | Valor |
|---|---|
| tudo em | 127.0.0.1 |
| ⚠ terceiros | NENHUM |
EOF

echo "  ⚠ a ficha PD-001 criada"
head -12 caderno/PD-001.md
```

⚠ **O sensor mínimo é o instrumento do módulo.** **E ele é um script porque medir não exige SIEM** —
**exige log e regra.**

⚠ **E a nota final é a do módulo 6:** **o número que importa é quantos alertas são falso positivo** —
**e sem tráfego legítimo, você não sabe.**

**Produza `sensor.md`:**

| Item | Valor |
|---|---|
| Regras | |
| Eventos | |
| Alertas | |
| O que falta para medir FP | |

**Responda:**

1. **Quantas regras o sensor tem?** Quantos alertas ele deu?
2. **O que você não pode saber ainda?** Por quê?
3. **De onde virá o tráfego legítimo?
4. **Quem é o sensor?** (Dica: o backend que loga.)

### Passo 3 — Rode o ataque e veja o rastro (opcional, 20 min)

Produza `rastro.md`:

```markdown
# O rastro do primeiro ataque

## O ataque
| Item | Valor |
|---|---|
| variante | |
| comando | |

## O que o sensor viu
| # | Regra que disparou | O evento |
|---|---|---|
| | | |

## ⚠ E o que o sensor NÃO viu
| Item | Por quê |
|---|---|
| | |

## A primeira taxa (provisória)
| Métrica | Valor |
|---|---|
| ataques | |
| ⚠ pegou | |
| ⚠ taxa de detecção | |

## ⚠ O que falta
| Item | Valor |
|---|---|
| o tráfego legítimo | |
| a taxa de FP | |
| a precisão | |
```

**Produza `rastro.md`:**

| Item | Valor |
|---|---|
| Regra que disparou | |
| Taxa de detecção | |
| O que falta | |

**Responda:**

1. **Alguma regra disparou?** Qual?
2. **A taxa de detecção é quanto?** É provisória por quê?
3. **O que o sensor não viu?
4. **O que falta para a taxa ser real?

### Critérios de aceitação

- `posturas.md` com as **três** posturas e o custo de cada.
- Você explicou **qual é a sustentável** e por quê.
- Você explicou **por que o falso positivo é o custo central**.
- Você explicou **o que a assimetria de feedback muda**.
- `quem-ve.md` com as **quatro** posições do detector.
- Você explicou **o ponto cego de cada**.
- Você explicou **por que o ponto cego tem o tamanho do diferencial de parsers**.
- O laboratório montado com as **cinco** pastas e os READMEs.
- Você explicou **de onde vem o atacante** e por que é pré-requisito.
- Você explicou **o que o README de `medicoes/` estabelece**.
- `escolha-alvo.md` com o ataque escolhido e o **rastro**.
- Você explicou **por que a rastreabilidade** é o critério.
- Você declarou **o que não vai detectar**.
- O **sensor mínimo** rodando sobre o log do lab anterior.
- Você mediu **quantos alertas** ele deu.
- Você explicou **o que falta para medir o falso positivo**.
- `caderno/PD-001.md` com a **hipótese** e o **critério de falsificação**.
- Você registrou **a taxa provisória** e por que ela é provisória.
- ⚠ **Nenhum SIEM, WAF ou sensor de terceiro.**

---

## Avaliação

1. **O que o detector vê que o atacante não vê?** E o inverso?
2. **Qual é a assimetria estrutural?** Por que ela importa?
3. **Cite as três posturas** e o custo de cada.
4. **Qual é a sustentável?** Por quê?
5. **Por que toda regra erra?**
6. **O que a linha "equilibrado" declara** que as outras escondem?
7. **Cite as quatro posições** do detector.
8. **Qual vê o que de fato aconteceu?** E por que é cara?
9. **Onde a maioria está?** Por que é o pior lugar?
10. **Qual é o tamanho do ponto cego** no WAF?
11. **Por que a evasão existe**, em termos de forma?
12. **Como o atacante itera?** E o detector?
13. **O que compensa a assimetria?
14. **Cite as cinco pastas** e o que cada uma guarda.
15. **De onde vem o atacante?** Por que é pré-requisito?
16. **Por que o tráfego legítimo é parte do lab?
17. **De onde obtê-lo?** Cite três fontes.
18. **Qual é o critério de escolha do primeiro alvo?**
19. **Por que não começar pelo client-side?
20. **O que significa "detectar o que se distingue do normal"?

---

**Próximo:** [Módulo 2 — A superfície de detecção](modulo-02.md)
