# Módulo 6 — Falso Positivo e o Orçamento

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 5

---

## ⚠ Este é o módulo que decide se a regra sobrevive

⚠ **A afirmação que organiza tudo:**

> **Uma regra que alerta em tudo não é uma regra.** **É um filtro que o analista vai desligar na
> terceira semana.**

⚠ **E é o fracasso mais comum da área** — **e ele não parece fracasso: parece diligência.**

⚠ **A tese:**

> **Você não elimina o falso positivo; você o **mede** e o **orça**.** **E o orçamento é em minutos
> de analista, não em número de alertas.**

⚠ **A tabela do que muda quando você mede:**

| Sem medir | Medindo |
|---|---|
| "a regra parece boa" | ⚠ **Taxa conhecida** |
| Alerta esquecido | ⚠ **Alerta triado** |
| Confiança cega | ⚠ **Confiança calibrada** |
| ⚠ **A regra é desligada** | ✓ **A regra é ajustada** |

---

## 6.1 As quatro métricas

⚠ **Toda regra tem quatro números. E os quatro se medem.**

| Métrica | Fórmula | ⚠ O que responde |
|---|---|---|
| **Detecção** | ataques pegos / ataques totais | A regra serve? |
| **FP** | alertas legítimos / tráfego legítimo | ⚠ **Quanto custa** |
| **Precisão** | TP / (TP + FP) | ⚠ **A proporção útil** |
| **Custo** | minutos × alertas | ⚠ **O que o time gasta** |

⚠ **A precisão é a métrica que o analista sente.** **Uma regra com 99% de detecção e 1% de precisão
produz **99 alertas falsos para cada verdadeiro**** — **e é insuportável, mesmo sendo "boa".**

⚠ **A tabela da precisão em números:**

| Precisão | Alertas por TP | ⚠ Experiência |
|---|---|---|
| 50% | 1 falso por TP | ✓ Suportável |
| 10% | 9 falsos | ⚠ Difícil |
| ⚠ **1%** | ⚠ **99 falsos** | ⚠⚠ **Insustentável** |
| 0,1% | 999 falsos | ⚠ **A regra é desligada** |

⚠ **A linha do 1% é a zona onde a maioria das regras de segurança nasce.** **E é a razão de a área
ter fama de ruidosa:** **as regras são escritas sem essa conta.**

⚠ **A regra escrita:**

> **A precisão é o número que o analista vive.** **E ela cai rápido: 99% de detecção com 1% de
> precisão é uma máquina de produzir fadiga.**

```bash
mkdir -p ~/detect-lab/mod06 && cd ~/detect-lab/mod06

echo "═══ 1. as quatro métricas ═══"
echo
cat > metricas.md <<'EOF'
# As quatro métricas

| Métrica | Fórmula | Responde |
|---|---|---|
| DETECÇÃO | ataques pegos / ataques totais | a regra SERVE? |
| FP | alertas legítimos / tráfego legítimo | ⚠ quanto CUSTA |
| ⚠ PRECISÃO | TP / (TP + FP) | ⚠ a proporção ÚTIL |
| CUSTO | minutos × alertas | ⚠ o que o time GASTA |

## A precisão, em números
| Precisão | Alertas por TP | Experiência |
|---|---|---|
| 50% | 1 falso por TP | ✓ suportável |
| 10% | 9 falsos | ⚠ difícil |
| ⚠ 1% | ⚠ 99 falsos | ⚠⚠ INSUSTENTÁVEL |
| 0,1% | 999 falsos | ⚠ a regra é DESLIGADA |

## ⚠ a linha do 1%
é a zona onde a maioria das regras de segurança NASCE.
✓ e é a razão de a área ter fama de RUIDOSA:
   as regras são escritas sem essa CONTA.

## ⚠ A REGRA
a precisão é o número que o ANALISTA vive.
e ela cai rápido:
99% de detecção com 1% de precisão
é uma máquina de produzir FADIGA.
EOF

cat metricas.md
```

⚠ **A tabela da precisão é o instrumento.** **E ela traduz "porcentagem" em **experiência do
analista**" — **que é o que decide se a regra vive.**

⚠ **E a nota do 1% explica a fama da área:** **as regras nascem ali — e ninguém faz a conta.**

**Produza `metricas.md`:**

| Precisão | Alertas por TP |
|---|---|
| 50% | |
| 10% | |
| 1% | |

**Responda:**

1. **Qual métrica o analista sente?
2. **Por que 99% de detecção pode ser inútil?
3. **Onde a maioria das regras nasce?** Por quê?
4. **Por que a precisão cai rápido?

---

## 6.2 Medindo o FP

⚠ **Medir o FP exige **tráfego legítimo** — **e é o que o módulo 2 estabeleceu como requisito.**

| Passo | O que fazer |
|---|---|
| 1 | ⚠ **Rodar a regra sobre tráfego legítimo** |
| 2 | Contar os alertas |
| 3 | **Triar**: quais são legítimos? |
| 4 | Calcular a precisão |
| 5 | ⚠ **Ajustar, e medir de novo** |

⚠ **O passo 3 é o trabalho, e é o que ninguém faz.** **"O alerta disparou" não diz se é falso** —
**dizer se é falso é a triagem** — **e ela consome o tempo do analista.**

⚠ **A tabela do que a triagem faz, tipicamente:**

| Resultado | Frequência típica | ⚠ O que fazer |
|---|---|---|
| Falso positivo puro | ⚠ **A maioria** | Ajustar a regra |
| Verdadeiro positivo | Raro | Investigar |
| ⚠ **Indeterminado** | Comum | ⚠ **Registrar — e é o que consome** |

⚠ **A linha do indeterminado é a mais honesta.** **Muitos alertas não se resolvem com o dado
disponível** — **e o tempo gasto neles é o custo real da regra.**

⚠ **E a tabela do que ajustar, por causa de FP:**

| Causa do FP | Ajuste |
|---|---|
| Regex muito ampla | ⚠ **Ancorar, exigir contexto** |
| Falta a exceção | ⚠ **Lista de exclusão — e ela cresce** |
| ⚠ O legítimo é parecido | ⚠ **Mudar de família** (módulo 3) |
| Janela grande demais | Reduzir |

⚠ **A linha da lista de exclusão merece a nota porque é uma armadilha.** **Cada exclusão reduz o FP
e potencialmente aumenta o FN** — **e a lista cresce até a regra virar uma colcha de retalhos que
ninguém entende.**

⚠ **A regra escrita:**

> **A lista de exclusão é dívida.** **Ela reduz o ruído hoje e cobra em manutenção amanhã.** **Se ela
> cresce a cada semana, a regra está na família errada.**

```bash
cd ~/detect-lab/mod06

echo "═══ 2. medindo o FP ═══"
echo
cat > medindo-fp.md <<'EOF'
# Medindo o FP

## Os cinco passos
| # | O que fazer |
|---|---|
| 1 | ⚠ rodar a regra sobre tráfego LEGÍTIMO |
| 2 | contar os alertas |
| 3 | ⚠ TRIAR: quais são legítimos? |
| 4 | calcular a precisão |
| 5 | ajustar, e medir de NOVO |

## O que a triagem revela
| Resultado | Frequência | O que fazer |
|---|---|---|
| falso positivo puro | ⚠ A MAIORIA | ajustar a regra |
| verdadeiro positivo | raro | investigar |
| ⚠ INDETERMINADO | comum | ⚠ registrar — é o que CONSOME |

## ⚠ a linha do indeterminado
muitos alertas NÃO se resolvem com o dado disponível.
✓ e o tempo gasto neles é o CUSTO REAL da regra.

## O que ajustar, por causa de FP
| Causa | Ajuste |
|---|---|
| regex muito ampla | ⚠ ancorar, exigir contexto |
| falta a exceção | ⚠ lista de exclusão — E ELA CRESCE |
| ⚠ o legítimo é parecido | ⚠ MUDAR DE FAMÍLIA |
| janela grande demais | reduzir |

## ⚠ a armadilha da lista de exclusão
cada exclusão reduz o FP e pode AUMENTAR o FN.
e a lista cresce até a regra virar uma COLCHA DE RETALHOS
que ninguém entende.

## ⚠ A REGRA
a lista de exclusão é DÍVIDA.
reduz o ruído HOJE e cobra em MANUTENÇÃO amanhã.
✓ se ela cresce a cada semana, a regra está na FAMÍLIA ERRADA.
EOF

cat medindo-fp.md
```

⚠ **A tabela da triagem é o instrumento.** **E a linha do indeterminado é o custo escondido** —
**porque ele não aparece na conta de FP, mas consome o mesmo tempo.**

⚠ **E a nota da lista de exclusão é a mais prática:** **ela é a dívida técnica da detecção.**

**Produza `medindo-fp.md`:**

| Resultado da triagem | O que fazer |
|---|---|
| Falso positivo | |
| Indeterminado | |
| Verdadeiro positivo | |

**Responda:**

1. **Por que o indeterminado é o custo escondido?
2. **O que fazer com regex muito ampla?
3. **Por que a lista de exclusão é dívida?
4. **O que significa quando ela cresce toda semana?

---

## 6.3 O orçamento

⚠ **O conceito central do módulo: **o time tem um orçamento de minutos.** **E a regra gasta dele.**

| Recurso | Valor |
|---|---|
| **Analistas** | N |
| **Horas por dia** | H |
| ⚠ **Orçamento de triagem** | ⚠ **N × H × 60 minutos** |
| ⚠ **Custo por alerta** | ⚠ **5 a 20 minutos** |

⚠ **A tabela da conta, com números:**

| Cenário | Alertas/dia | Min/alerta | ⚠ Horas/dia |
|---|---|---|---|
| Regra estreita | 5 | 10 | ✓ 0,8 h |
| ⚠ **Regra típica** | ⚠ **500** | 10 | ⚠⚠ **83 h** |
| Regra ruidosa | 5.000 | 5 | ⚠ **416 h** |

⚠ **A linha do meio é o problema real.** **500 alertas por dia com 10 minutos cada consomem mais que
um analista inteiro** — **e é por isso que os alertas são ignorados.**

⚠ **E a tabela do que fazer com o orçamento:**

| Situação | Ação |
|---|---|
| Dentro do orçamento | ✓ Manter |
| ⚠ **Acima** | ⚠ **Ajustar a regra, ou desligar** |
| Muito acima | ⚠ **Mudar de família** |
| ⚠ **Sem medida** | ⚠⚠ **Você não sabe se está acima** |

⚠ **A última linha é o argumento do módulo inteiro.** **Sem a conta, o time não sabe que está
falido** — **e descobre quando o analista sai.**

⚠ **A regra escrita:**

> **O orçamento é em minutos, e ele acaba.** **Uma regra que consome mais do que o time tem não é
> uma regra: é uma dívida que será paga em silêncio, quando ninguém estiver olhando.**

```bash
cd ~/detect-lab/mod06

echo "═══ 3. o orçamento ═══"
echo
cat > orcamento.md <<'EOF'
# O orçamento

| Recurso | Valor |
|---|---|
| analistas | N |
| horas por dia | H |
| ⚠ ORÇAMENTO DE TRIAGEM | ⚠ N × H × 60 minutos |
| ⚠ custo por alerta | ⚠ 5 a 20 minutos |

## A conta, em números
| Cenário | Alertas/dia | Min/alerta | Horas/dia |
|---|---|---|---|
| regra estreita | 5 | 10 | ✓ 0,8 h |
| ⚠ regra TÍPICA | ⚠ 500 | 10 | ⚠⚠ 83 h |
| regra ruidosa | 5.000 | 5 | ⚠ 416 h |

## ⚠ a linha do meio é o problema real
500 alertas/dia com 10 min cada consomem
MAIS QUE UM ANALISTA INTEIRO.
✓ é por isso que os alertas são IGNORADOS.

## O que fazer com o orçamento
| Situação | Ação |
|---|---|
| dentro | ✓ manter |
| ⚠ ACIMA | ⚠ ajustar, ou DESLIGAR |
| muito acima | ⚠ MUDAR DE FAMÍLIA |
| ⚠ SEM MEDIDA | ⚠⚠ você não sabe se está acima |

## ⚠ A REGRA
o orçamento é em MINUTOS, e ele ACABA.
uma regra que consome mais do que o time tem
não é uma regra: é uma dívida que será paga em SILÊNCIO.
EOF

cat orcamento.md

echo
echo "═══ 4. a calculadora ═══"
echo
cat > orcamento.py <<'PY'
#!/usr/bin/env python3
"""
orcamento.py — calcula o orçamento de triagem de uma regra.

⚠ DIDÁTICO. números do SEU cenário.
"""
import sys


def calcula(alertas_dia: float, min_por_alerta: float,
            analistas: float, horas_por_analista: float):
    orcamento_min = analistas * horas_por_analista * 60
    gasto_min = alertas_dia * min_por_alerta
    uso = gasto_min / orcamento_min if orcamento_min else float("inf")
    return orcamento_min, gasto_min, uso


def main():
    print("═══ ORÇAMENTO DE TRIAGEM ═══")
    print()

    cenarios = [
        ("regra estreita",      5,    10, 1, 6),
        ("regra típica",      500,    10, 1, 6),
        ("regra ruidosa",    5000,     5, 1, 6),
        ("time de 3",         500,    10, 3, 6),
    ]

    print(f"  {'cenário':<18} {'alertas':<9} {'orç. (h)':<10} {'gasto (h)':<11} {'uso':<8} veredito")
    print("  " + "-"*76)

    for nome, a, m, n, h in cenarios:
        orc, gasto, uso = calcula(a, m, n, h)
        if uso <= 0.5:
            v = "✓ ok"
        elif uso <= 1.0:
            v = "⚠ no limite"
        else:
            v = "⚠⚠ ACIMA — a regra será ignorada"
        print(f"  {nome:<18} {a:<9} {orc/60:<10.1f} {gasto/60:<11.1f} {uso:<8.2f} {v}")

    print()
    print("  ═══ COMO USAR ═══")
    print("  · meça os SEUS números: quantos alertas/dia esta regra gera?")
    print("  · estime o custo de triagem — quem triou esta semana sabe")
    print("  ⚠ e compare com o orçamento REAL do time")
    print()
    print("  ⚠ o veredito não é moral. é aritmético.")
    print("     uma regra acima do orçamento NÃO SERÁ TRIADA.")


if __name__ == "__main__":
    main()
PY

chmod +x orcamento.py
python3 orcamento.py
```

⚠ **A calculadora é o instrumento do módulo.** **E o veredito dela é aritmético** — **não moral:**
**uma regra acima do orçamento simplesmente não será triada.**

⚠ **E a linha do "time de 3" mostra a solução econômica:** **mais analistas, ou menos alertas.**

**Produza `orcamento.md`:**

| Cenário | Alertas/dia | Horas/dia | Uso |
|---|---|---|---|
| Estreita | | | |
| Típica | | | |
| Ruidosa | | | |

**Responda:**

1. **O que a linha "regra típica" mostra?
2. **Por que o veredito é aritmético?
3. **O que fazer quando a regra está acima do orçamento?
4. **Por que "sem medida" é o pior caso?

---

## 6.4 LAB — O orçamento da sua regra

**Duração:** 120 min

### Passo 1 — Meça o FP da sua regra (50 min)

⚠ **O tráfego legítimo, e a contagem.**

```bash
cd ~/detect-lab/mod06

echo "═══ MEDINDO O FP ═══"
echo
cat <<'EXPL'
  ── O QUE VOCÊ PRECISA ──

     1. TRÁFEGO LEGÍTIMO
        · você navegando no seu lab
        · um crawler no seu site
        · ⚠ ou tráfego SINTÉTICO normal

     2. A REGRA (do módulo 3 ou 4)

     3. A CONTAGEM:
        · quantos alertas no legítimo?
        · ⚠ e quantos destes são REALMENTE falsos?
EXPL

cat > gera-legitimo.py <<'PY'
#!/usr/bin/env python3
"""
gera-legitimo.py — gera TRÁFEGO LEGÍTIMO para medir o FP.

⚠ DIDÁTICO e LOCAL. manda ao SEU lab.
"""
import socket, sys, time, random

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
N = int(sys.argv[2]) if len(sys.argv) > 2 else 50

# ⚠ paths que um cliente LEGÍTIMO pediria
PATHS = [
    "/", "/index.html", "/sobre", "/contato", "/api/v1/status",
    "/produtos", "/produtos?pagina=2", "/busca?q=teste",
    "/login", "/logout", "/perfil", "/perfil/editar",
    "/static/app.js", "/static/style.css", "/favicon.ico",
    "/api/v1/pedidos", "/api/v1/pedidos/1", "/api/v1/pedidos/2",
]

HEADERS = [
    "User-Agent: Mozilla/5.0",
    "Accept: text/html",
    "Accept-Language: pt-BR",
    "Referer: http://localhost/",
]


def main():
    print("═══ GERANDO TRÁFEGO LEGÍTIMO ═══")
    print()
    print(f"  alvo : {HOST}:{PORT}   ⚠ LOCAL")
    print(f"  reqs : {N}")
    print()

    ok = 0
    for i in range(N):
        path = random.choice(PATHS)
        h = random.choice(HEADERS)
        req = f"GET {path} HTTP/1.1\r\nHost: localhost\r\n{h}\r\n\r\n".encode()
        try:
            with socket.create_connection((HOST, PORT), timeout=3) as s:
                s.sendall(req)
                s.settimeout(1)
                try: s.recv(4096)
                except socket.timeout: pass
            ok += 1
        except Exception:
            pass
        if i % 10 == 0:
            print(f"     ... {i}/{N}")
        time.sleep(0.02)

    print()
    print(f"  ✓ enviadas: {ok}/{N}")
    print()
    print("  ═══ AGORA MEÇA ═══")
    print("  · rode a SUA regra sobre o log gerado por este tráfego")
    print("  · ⚠ e conte os alertas")
    print("  ✓ esses alertas são, por definição, FALSOS POSITIVOS.")


if __name__ == "__main__":
    main()
PY

chmod +x gera-legitimo.py

cat > mede-fp.py <<'PY'
#!/usr/bin/env python3
"""
mede-fp.py — mede a taxa de FALSO POSITIVO de uma regra.

⚠ DIDÁTICO. aplica a regra a um log de tráfego LEGÍTIMO.
"""
import sys, os, re

LOG = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/smuggle-lab/evidencia/backend-cl.log")

REGRAS = {
    "R1: forma inválida (gramática)": re.compile(
        r"(?i)^\w[^\r\n:]*\s+:|" r"(?i)content-length:.*\n(?:.*\n)*?content-length:|"
        r"(?i)transfer-encoding:.*\n(?:.*\n)*?content-length:|" r"PATH:.*[\r\n]|" r"^\t", re.M),
    "R2: TE e CL juntos": re.compile(
        r"(?i)transfer-encoding:.*\n(?:.*\n)*?content-length:", re.M),
    "R3: payload perigoso (alinhada)": re.compile(r"(?i)<script|union\s+select|\.\./", re.M),
}


def eventos(txt):
    return [e.strip() for e in txt.split("═══ requisição") if e.strip()]
    # (aceita também "conexão")


def main():
    try:
        txt = open(LOG, errors="replace").read()
    except FileNotFoundError:
        print(f"  ⚠ log não encontrado: {LOG}")
        return

    evs = [e.strip() for e in re.split(r"═══ (?:requisição|conexão)", txt) if e.strip()]
    print("═══ MEDINDO O FALSO POSITIVO ═══")
    print()
    print(f"  log    : {os.path.basename(LOG)}")
    print(f"  eventos: {len(evs)}")
    print()

    print(f"  {'regra':<34} {'alertas':<9} {'⚠ FP/evento':<12}")
    print("  " + "-"*58)
    for nome, rx in REGRAS.items():
        n = sum(1 for e in evs if rx.search(e))
        taxa = (n / len(evs)) if evs else 0
        print(f"  {nome:<34} {n:<9} {taxa:<12.1%}")

    print()
    print("  ═══ COMO LER ═══")
    print("  · este log é de tráfego NORMAL (gerado pelo gera-legitimo.py)")
    print("  ⚠ logo, todo alerta aqui é FALSO POSITIVO")
    print()
    print("  · FP/evento perto de 0%  → ✓ a regra é útil")
    print("  · FP/evento > 5%         → ⚠ ajustar")
    print("  ⚠ FP/evento > 20%        → ⚠⚠ a regra vai ser desligada")
    print()
    print("  ⚠ e a conta final: alertas/dia × minutos = o ORÇAMENTO.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-fp.py
echo "  ── os dois prontos ──"
echo "     1. python3 ~/detect-lab/mod06/gera-legitimo.py 8090 100"
echo "     2. python3 ~/detect-lab/mod06/mede-fp.py ~/smuggle-lab/evidencia/backend-cl.log"
```

⚠ **O gerador de tráfego legítimo é o que torna a medição possível** — **e é o requisito do módulo
2, agora usado.**

⚠ **E a nota é a chave:** **neste log, **todo alerta é falso positivo** — **porque o tráfego é
legítimo por construção.**

**Produza `legitimo.md`:**

| Regra | Alertas | FP/evento |
|---|---|---|
| Gramática | | |
| TE + CL | | |
| Payload perigoso | | |

**Responda:**

1. **Qual regra tem zero FP?** Por quê?
2. **Qual tem mais?** Por quê?
3. **Por que todo alerta neste log é falso?
4. **Qual regra você ajustaria?

### Passo 2 — Calcule o orçamento (30 min)

⚠ **A conta, com os seus números.**

```bash
cd ~/detect-lab/mod06

echo "═══ O ORÇAMENTO DA SUA REGRA ═══"
echo
python3 orcamento.py

cat > caderno/PD-006.md <<'EOF'
# PD-006 — o falso positivo e o orçamento

**Data:** ____

## 1. A regra
| Item | Valor |
|---|---|
| id | |
| família | |
| o que detecta | |

## 2. As quatro métricas
| Métrica | Valor | Como medi |
|---|---|---|
| detecção | | ataque do módulo 1 |
| ⚠ FP | | tráfego legítimo |
| precisão | | TP / (TP+FP) |
| custo | | minutos × alertas |

## 3. A medição do FP
| Item | Valor |
|---|---|
| eventos legítimos | |
| alertas | |
| ⚠ FP/evento | |
| veredito | ok / ajustar / desligar |

## 4. O orçamento
| Item | Valor |
|---|---|
| alertas/dia (estimado) | |
| min por alerta | |
| ⚠ gasto/dia | |
| orçamento do time | |
| ⚠ USO | |

## 5. Os ajustes que fiz
| # | Ajuste | Efeito no FP | ⚠ Efeito no FN |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 6. ⚠ A lista de exclusão
| # | Exclusão | Por que | ⚠ Dívida? |
|---|---|---|---|
| 1 | | | |

## 7. O veredito
| Item | Valor |
|---|---|
| a regra sobrevive? | |
| por quê | |
| ⚠ o que ela deixa de pegar | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não rodei tráfego de outro sistema
- [ ] não guardei dado de terceiro
- [ ] não testei fora de 127.0.0.1

## 9. O que NÃO foi verificado
⚠ mínimo 3
EOF

echo "  ⚠ a ficha PD-006 criada"
```

⚠ **A ficha mede as quatro métricas de uma vez.** **E a seção 5 registra o trade-off:** **cada
ajuste que reduz o FP aumenta o FN.**

⚠ **E a seção 6 é o alerta da dívida:** **se a lista de exclusão cresce, a regra está na família
errada.**

**Produza `orcamento-medido.md`:**

| Métrica | Valor |
|---|---|
| FP/evento | |
| Precisão | |
| Uso do orçamento | |
| Sobrevive? | |

**Responda:**

1. **Qual a precisão da sua regra?** Ela sobrevive?
2. **Qual o uso do orçamento?
3. **Quais ajustes você fez?** O que cada um custou em FN?
4. **A lista de exclusão cresceu?

### Passo 3 — Documente (40 min)

Produza `relatorio-orcamento.md`:

```markdown
# Relatório — a regra e o seu orçamento

## 1. A regra
| Item | Valor |
|---|---|
| id e família | |
| o que detecta | |
| onde roda | |

## 2. As quatro métricas
| Métrica | Valor | Método |
|---|---|---|
| detecção | | |
| FP | | |
| precisão | | |
| custo | | |

## 3. A medição
```
o comando que gerou o tráfego legítimo
```
```
o comando que mediu
```
```
a saída literal
```

## 4. O orçamento
| Item | Valor |
|---|---|
| alertas/dia | |
| min/alerta | |
| gasto/dia | |
| orçamento | |
| ⚠ uso | |

## 5. Os ajustes
| # | Ajuste | ΔFP | ⚠ ΔFN |
|---|---|---|---|
| | | | |

## 6. ⚠ O que a regra NÃO pega
| # | Evasão | Por quê |
|---|---|---|
| | | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não rodei tráfego de outro sistema
- [ ] não guardei dado de terceiro
- [ ] não testei fora de 127.0.0.1
- [ ] não publiquei nada

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O veredito
| Item | Valor |
|---|---|
| a regra entra em produção? | |
| ⚠ com que ressalva | |
```

**Produza `relatorio-orcamento.md`:**

| Item | Valor |
|---|---|
| Precisão | |
| Uso | |
| O que não pega | |
| Veredito | |

**Responda:**

1. **A regra entra em produção?** Com que ressalva?
2. **O que ela não pega está declarado?
3. **O custo está medido?
4. **O que você não fez?**

### Critérios de aceitação

- `metricas.md` com as **quatro** métricas e a tradução em experiência.
- Você explicou **por que 99% de detecção pode ser inútil**.
- Você explicou **onde a maioria das regras nasce**.
- `medindo-fp.md` com os **cinco** passos.
- Você explicou **por que o indeterminado é o custo escondido**.
- Você explicou **por que a lista de exclusão é dívida**.
- Você explicou **o que significa quando ela cresce toda semana**.
- `orcamento.md` com a conta e os **três** cenários.
- Você explicou **por que o veredito é aritmético**.
- `orcamento.py` rodado, com o uso calculado.
- O **tráfego legítimo gerado** para medir o FP.
- A **taxa de FP medida**, por regra.
- Você explicou **por que todo alerta no log legítimo é falso**.
- As **quatro métricas** calculadas.
- O **trade-off** dos ajustes registrado (ΔFP × ΔFN).
- Você verificou **se a lista de exclusão cresceu**.
- `caderno/PD-006.md` com as **nove** seções.
- `relatorio-orcamento.md` com as **nove** seções.
- Você declarou **o que a regra não pega**.
- ⚠ **Nenhum tráfego de terceiro.**

---

## Avaliação

1. **Por que uma regra que alerta em tudo não é uma regra?
2. **Por que esse fracasso não parece fracasso?
3. **Cite as quatro métricas** e o que cada uma responde.
4. **Qual o analista sente?** Por quê?
5. **Por que 99% de detecção pode ser inútil?
6. **Cite a tabela da precisão** em quatro níveis.
7. **Onde a maioria das regras nasce?
8. **O que é necessário para medir o FP?
9. **Cite os cinco passos da medição.
10. **Qual passo é o trabalho, e ninguém faz?
11. **Por que o indeterminado é o custo escondido?
12. **O que ajustar quando o FP vem de regex ampla?
13. **Por que a lista de exclusão é dívida?
14. **O que significa quando ela cresce toda semana?
15. **O que é o orçamento de triagem?** Como se calcula?
16. **Qual o custo típico por alerta?
17. **O que a linha "regra típica" mostra?
18. **Por que o veredito é aritmético** e não moral?
19. **O que fazer quando a regra está acima do orçamento?
20. **Por que "sem medida" é o pior caso?

---

**Próximo:** [Módulo 7 — O perfil do atacante](modulo-07.md)
