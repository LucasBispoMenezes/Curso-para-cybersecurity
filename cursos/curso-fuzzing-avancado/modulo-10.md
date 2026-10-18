# Módulo 10 — Triagem e o Que Não É Bug

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 9

---

## ⚠ Este é o módulo que decide se o relatório é crível

⚠ **A afirmação que organiza tudo:**

> **O fuzzer não acha bugs; ele acha **crashes**.** **E a maioria dos crashes não é bug** — **é
> timeout, é OOM, é bug do harness, ou é o mesmo bug repetido.**

⚠ **E é o módulo 1 cobrado:** **"sem triagem, 200 crashes e nenhum bug".** **Agora você faz a
triagem.**

⚠ **A tese:**

> **A triagem é o trabalho real.** **Duplicar é o primeiro passo** — **e a pergunta seguinte é: é do
> alvo, ou do harness?**

⚠ **A tabela do que chega na pasta `crashes/`:**

| O que | ⚠ É bug? |
|---|---|
| Segfault reproduzível e único | ⚠ **Provavelmente** |
| ⚠ **O mesmo segfault, 180 vezes** | ⚠ **Um bug** |
| Timeout | ⚠ Frequentemente não |
| OOM | ⚠ Depende |
| ⚠ **Assert do harness** | ⚠⚠ **Bug do harness** |
| Rejeição de entrada inválida | ✓ **Comportamento correto** |

---

## 10.1 Duplicar

⚠ **O primeiro passo: **saber quantos bugs distintos você tem.****

| Método | Como | ⚠ Precisão |
|---|---|---|
| **Contagem bruta** | Quantos arquivos | ⚠ Inútil |
| **Por hash da entrada** | Bytes idênticos | ⚠ Só o trivial |
| ⚠ **Por traço de pilha** | ⚠ **A função onde crashou** | ⚠ **O padrão** |
| **Por cobertura do crash** | O caminho | Alta |

⚠ **A tabela dos números típicos:**

| Estágio | Quantidade |
|---|---|
| Crashes brutos | ⚠ **200** |
| Após dedup por entrada | ⚠ 60 |
| ⚠ Após dedup por **traço** | ⚠⚠ **3 a 8** |
| Após triagem | ⚠ **1 a 3** |

⚠ **A linha 3 é o efeito da deduplicação por traço.** **200 crashes viram 3 a 8 bugs distintos** —
**porque a mutação gera centenas de entradas que chegam ao mesmo lugar.**

⚠ **E a razão é estrutural:** **um bug num `memcpy` é alcançado por **qualquer** entrada que chegue
até ele** — **e o fuzzer encontra milhares.**

⚠ **A regra escrita:**

> **Crash não é bug; traço é.** **Você agrupa pelo lugar onde quebrou** — **e o número cai de
> centenas para unidades.**

```bash
mkdir -p ~/fuzz-lab/mod10 && cd ~/fuzz-lab/mod10

echo "═══ 1. duplicar ═══"
echo
cat > dedup.md <<'EOF'
# Duplicar

| Método | Como | Precisão |
|---|---|---|
| contagem bruta | quantos arquivos | ⚠ INÚTIL |
| por HASH da entrada | bytes idênticos | ⚠ só o trivial |
| ⚠ por TRAÇO de pilha | ⚠ a função onde crashou | ⚠ O PADRÃO |
| por cobertura do crash | o caminho | alta |

## Os números típicos
| Estágio | Quantidade |
|---|---|
| crashes BRUTOS | ⚠ 200 |
| após dedup por ENTRADA | ⚠ 60 |
| ⚠ após dedup por TRAÇO | ⚠⚠ 3 a 8 |
| após TRIAGEM | ⚠ 1 a 3 |

## ⚠ a linha 3 é o efeito da deduplicação por traço
200 crashes viram 3 a 8 bugs DISTINTOS —
porque a mutação gera CENTENAS de entradas
que chegam ao MESMO lugar.

## ⚠ e a razão é estrutural
um bug num memcpy é alcançado por QUALQUER entrada
que chegue até ele — e o fuzzer encontra MILHARES.

## ⚠ A REGRA
crash NÃO é bug; TRAÇO é.
você agrupa pelo LUGAR onde quebrou —
e o número cai de centenas para UNIDADES.
EOF

cat dedup.md

echo
echo "═══ 2. o deduplicador ═══"
echo
cat > dedup.py <<'PY'
#!/usr/bin/env python3
"""
dedup.py — agrupa os crashes por TRAÇO, e conta quantos bugs DISTINTOS há.

⚠ DIDÁTICO. trabalha nos SEUS crashes.
"""
import os, sys, re, hashlib
from collections import defaultdict

CRASHES = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/fuzz-lab/crashes")


def assinatura(arquivo: str) -> str:
    """
    ⚠ a ASSINATURA do crash: o traço, sem os endereços.

    numa implementação real, isso vem do SANITIZER —
    e a assinatura é a sequência de funções + a linha.
    """
    try:
        txt = open(arquivo, errors="replace").read()[:8192]
    except Exception:
        return "ilegivel"

    # ── o padrão do ASan ──
    m = re.findall(r"#\d+\s+0x[0-9a-f]+\s+in\s+(\w+)\s+([^\s:]+):(\d+)", txt)
    if m:
        # ⚠ tira os endereços — só o NOME e a LINHA importam
        return " | ".join(f"{nome}@{arq}:{linha}" for nome, arq, linha in m[:6])

    # ── o fallback: o tipo de erro ──
    for tipo in ("heap-buffer-overflow", "stack-buffer-overflow", "use-after-free",
                 "SEGV", "global-buffer-overflow", "heap-use-after-free",
                 "null-dereference", "timeout", "OOM"):
        if tipo.lower() in txt.lower():
            return tipo
    return "desconhecido"


def main():
    if not os.path.isdir(CRASHES):
        print(f"  ⚠ a pasta não existe: {CRASHES}")
        print("     ✓ aponte para onde o fuzzer guardou os crashes.")
        return

    arquivos = [os.path.join(CRASHES, f) for f in os.listdir(CRASHES)]
    arquivos = [f for f in arquivos if os.path.isfile(f)]

    print("═══ DEDUPLICAÇÃO POR TRAÇO ═══")
    print()
    print(f"  pasta   : {CRASHES}")
    print(f"  arquivos: {len(arquivos)}")
    print()

    if not arquivos:
        print("  ⚠ nenhum arquivo. rode o fuzzer até gerar crashes.")
        return

    grupos = defaultdict(list)
    for f in arquivos:
        grupos[assinatura(f)].append(f)

    print(f"  ⚠ GRUPOS DISTINTOS: {len(grupos)}")
    print()
    print(f"  {'#':<4} {'ocorrências':<13} assinatura")
    print("  " + "-"*72)
    for i, (sig, fs) in enumerate(sorted(grupos.items(), key=lambda x: -len(x[1])), 1):
        print(f"  {i:<4} {len(fs):<13} {sig[:58]}")

    print()
    print("  ═══ A LEITURA ═══")
    print(f"  · {len(arquivos)} arquivos")
    print(f"  · ⚠ {len(grupos)} bugs DISTINTOS (por traço)")
    print()
    print("  ✓ e o próximo passo é TRIAR cada grupo:")
    print("     · é do ALVO ou do HARNESS?")
    print("     · é exploitável?")
    print("     · qual o reproducer MÍNIMO?")


if __name__ == "__main__":
    main()
PY

chmod +x dedup.py
echo "  ── pronto ──"
echo "     python3 ~/fuzz-lab/mod10/dedup.py ~/fuzz-lab/crashes"
```

⚠ **O deduplicador é o instrumento.** **E a assinatura por traço é o critério** — **porque dois
crashes no mesmo lugar são o mesmo bug.**

⚠ **E a nota do "tira os endereços" é importante:** **endereços mudam entre execuções** — **e
agrupar por eles daria um grupo por crash.**

**Produza `dedup.md`:**

| Método | Precisão |
|---|---|
| Contagem bruta | |
| Por traço | |
| Por hash da entrada | |

**Responda:**

1. **Por que a contagem bruta é inútil?
2. **O que a dedup por traço faz?** Quantos sobram?
3. **Por que a dedup ignora endereços?
4. **Qual o próximo passo depois de duplicar?

---

## 10.2 O que não é bug

⚠ **A tabela dos falsos achados, e como reconhecer cada um.**

| # | O que | ⚠ Como reconhecer |
|---|---|---|
| 1 | **Bug do harness** | ⚠ **O traço começa no harness** |
| 2 | **Timeout** | Não é crash |
| 3 | **OOM do harness** | Alocou sem liberar |
| 4 | ⚠ **Assert do alvo** | ⚠ **O alvo decidiu recusar** |
| 5 | **Rejeição correta** | ✓ É o comportamento |
| 6 | ⚠ **Bug já conhecido** | ⚠ **Está no changelog** |

⚠ **A linha 1 é a mais comum, e a mais fácil de reconhecer.** **Se o traço começa **no harness**, o
bug é seu** — **e é o erro do módulo 3 aparecendo.**

⚠ **A linha 4 é a mais sutil.** **Um `assert` que dispara pode ser bug do alvo** — **ou pode ser a
verificação funcionando.** **Você lê o código para saber qual.**

⚠ **E a tabela do que fazer com cada:**

| O que | Ação |
|---|---|
| Bug do harness | ⚠ **Corrija o harness** |
| Timeout | ⚠ Analise a proporção (módulo 7) |
| OOM do harness | Corrija |
| ⚠ **Assert** | ⚠ **Leia o código** |
| Rejeição correta | ✓ Descarte |
| Bug conhecido | ⚠ Descarte, ou verifique se ainda existe |

⚠ **A última linha merece a nota.** **Um bug que já foi corrigido na versão nova do alvo** — **mas
que você reproduz na antiga** — **é um achado se a versão antiga ainda está em uso**, **e não é se
não está.**

⚠ **A regra escrita:**

> **Antes de chamar de bug, três perguntas:** **o traço é do alvo?** **o alvo decidiu fazer isso?**
> **já foi corrigido?** **E as três se respondem lendo, não supondo.**

```bash
cd ~/fuzz-lab/mod10

echo "═══ 3. o que não é bug ═══"
echo
cat > nao-e-bug.md <<'EOF'
# O que não é bug

| # | O que | Como reconhecer |
|---|---|---|
| 1 | BUG DO HARNESS | ⚠ o traço COMEÇA no harness |
| 2 | timeout | não é crash |
| 3 | OOM do harness | alocou sem liberar |
| 4 | ⚠ ASSERT do alvo | ⚠ o alvo DECIDIU recusar |
| 5 | rejeição correta | ✓ é o comportamento |
| 6 | ⚠ bug JÁ CONHECIDO | ⚠ está no changelog |

## ⚠ a linha 1 é a mais comum
se o traço COMEÇA NO HARNESS, o bug é SEU —
✓ e é o erro do módulo 3 aparecendo.

## ⚠ a linha 4 é a mais sutil
um assert que dispara pode ser bug do alvo —
ou pode ser a VERIFICAÇÃO FUNCIONANDO.
✓ você LÊ o código para saber qual.

## O que fazer com cada
| O que | Ação |
|---|---|
| bug do harness | ⚠ CORRIJA o harness |
| timeout | ⚠ analise a PROPORÇÃO (módulo 7) |
| OOM do harness | corrija |
| ⚠ ASSERT | ⚠ LEIA o código |
| rejeição correta | ✓ descarte |
| bug conhecido | ⚠ descarte, ou verifique se AINDA existe |

## ⚠ a última linha merece nota
um bug corrigido na versão NOVA, mas reproduzido na ANTIGA —
é achado SE a antiga ainda está em uso,
e NÃO é se não está.

## ⚠ A REGRA
antes de chamar de bug, TRÊS PERGUNTAS:
1. o traço é do ALVO?
2. o alvo DECIDIU fazer isso?
3. já foi CORRIGIDO?
✓ e as três se respondem LENDO, não supondo.
EOF

cat nao-e-bug.md

echo
echo "═══ 4. o triador ═══"
echo
cat > tria.py <<'PY'
#!/usr/bin/env python3
"""
tria.py — classifica um crash: do alvo, do harness, ou não é bug.

⚠ DIDÁTICO. lê o crash e aplica as TRÊS PERGUNTAS.
"""
import os, sys, re

ARQ = sys.argv[1] if len(sys.argv) > 1 else None

# ── as funções do HARNESS (o bug é seu se o traço começa aqui) ──
FUNCOES_HARNESS = ["LLVMFuzzerTestOneInput", "main", "fuzz_target"]

# ── as funções do ALVO ──
FUNCOES_ALVO = ["parse", "parse_verifica", "copia_dados", "valida_faixa", "valida_destino"]


def analisa(txt: str):
    """aplica as três perguntas"""
    perguntas = []

    # ── Q1: o traço é do ALVO? ──
    m = re.findall(r"in\s+(\w+)\s", txt)
    primeira = m[0] if m else ""
    if primeira in FUNCOES_HARNESS:
        q1 = ("⚠ NÃO", "o traço COMEÇA no harness — o bug é SEU")
    elif qualquer := [f for f in FUNCOES_ALVO if f in txt]:
        q1 = ("✓ SIM", f"o traço passa por: {', '.join(qualquer[:3])}")
    else:
        q1 = ("?", "não identifiquei as funções — leia o traço")
    perguntas.append(("Q1: o traço é do ALVO?", q1))

    # ── Q2: o alvo decidiu fazer isso? ──
    if "abort" in txt.lower() or "assert" in txt.lower():
        q2 = ("⚠ TALVEZ", "há um abort/assert — o alvo pode ter DECIDIDO recusar")
    else:
        q2 = ("✓ NÃO", "não vi assert — o alvo não decidiu nada: ele quebrou")
    perguntas.append(("Q2: o alvo DECIDIU isso?", q2))

    # ── Q3: o tipo de erro ──
    tipos = {
        "heap-buffer-overflow":  "⚠ ESCREVE OU LÊ FORA DO HEAP",
        "stack-buffer-overflow": "⚠ LÊ/ESCREVE FORA DA PILHA",
        "use-after-free":        "⚠ USA MEMÓRIA LIBERADA",
        "SEGV":                  "⚠ SEGFAULT",
        "timeout":               "⚠ TIMEOUT — não é crash",
        "out-of-memory":         "⚠ OOM — verifique o harness",
    }
    achado = "desconhecido"
    for k, v in tipos.items():
        if k.lower() in txt.lower():
            achado = v
            break
    perguntas.append(("Q3: o tipo", (achado, "")))

    return perguntas


def main():
    print("═══ TRIAGEM ═══")
    print()
    if not ARQ or not os.path.exists(ARQ):
        print("  uso: tria.py <arquivo-de-crash>")
        print()
        print("  ✓ aponte para UM arquivo da pasta crashes/, ou para a")
        print("     saída do sanitizer salva em arquivo.")
        return

    txt = open(ARQ, errors="replace").read()

    print(f"  arquivo: {os.path.basename(ARQ)}")
    print(f"  tamanho: {len(txt)} bytes")
    print()

    for pergunta, (resp, nota) in analisa(txt):
        print(f"  {pergunta}")
        print(f"     → {resp}")
        if nota:
            print(f"       {nota}")
        print()

    print("  ═══ O VEREDITO ═══")
    print("  ⚠ a decisão é SUA — o script só organiza as perguntas.")
    print("     · traço no alvo + sem assert + memória → ⚠ BUG provável")
    print("     · traço no harness                     → ⚠ corrija o harness")
    print("     · timeout                              → ⚠ analise a proporção")


if __name__ == "__main__":
    main()
PY

chmod +x tria.py
echo "  ── pronto ──"
echo "     python3 ~/fuzz-lab/mod10/tria.py <arquivo-de-crash>"
```

⚠ **O triador é o instrumento.** **E ele organiza as três perguntas** — **sem decidir por você.**

⚠ **E a nota final é deliberada:** **o script não dá o veredito.** **A decisão de chamar de bug exige
ler o código** — **e é o que o módulo defende.**

**Produza `nao-e-bug.md`:**

| O que | Ação |
|---|---|
| Bug do harness | |
| Assert do alvo | |
| Rejeição correta | |

**Responda:**

1. **Qual falso achado é o mais comum?** Como reconhecer?
2. **Por que o `assert` é sutil?
3. **Quando um bug já corrigido é achado?
4. **O que o triador NÃO faz?** Por quê?

---

## 10.3 O reproducer mínimo

⚠ **O reproducer é o que torna o achado reportável. E ele precisa ser **mínimo**.**

| Etapa | O que fazer |
|---|---|
| 1 | **Confirmar** que reproduz |
| 2 | ⚠ **Reduzir** a entrada |
| 3 | **Confirmar de novo** |
| 4 | **Capturar** a saída |
| 5 | ⚠ **Verificar a versão** |

⚠ **A tabela do que a redução alcança:**

| Entrada | Tamanho | ⚠ Serve? |
|---|---|---|
| A original do fuzzer | ⚠ 4 KB | ⚠ Difícil de analisar |
| Truncada | 200 B | Melhor |
| ⚠ **Mínima** | ⚠ **20 B** | ⚠⚠ **Reportável** |

⚠ **A redução não é estética.** **Uma entrada de 20 bytes mostra **qual campo** causa o bug** — **e
uma de 4 KB esconde o mecanismo no ruído.**

⚠ **E a tabela do que reduzir, e o que **não**:**

| Reduzir | ⚠ **Não** reduzir |
|---|---|
| Bytes irrelevantes | ⚠ **O campo que causa o bug** |
| Padding | ⚠ O tamanho que o dispara |
| Campos que o alvo ignora | O valor da fronteira |
| ⚠ **Até parar de reproduzir** | ⚠ **Além disso** |

⚠ **E a tabela do que fazer com a saída:**

| Capturar | Por quê |
|---|---|
| O comando | ⚠ **Para reproduzir** |
| A saída do sanitizer | ⚠ **A evidência** |
| A versão do alvo | ⚠ **Para saber se ainda existe** |
| O ambiente | Compilador, flags |

⚠ **A regra escrita:**

> **O reproducer é o achado.** **Um crash sem reproducer mínimo é uma anedota** — **e o mantenedor
> não consegue nem confirmar nem corrigir.**

```bash
cd ~/fuzz-lab/mod10

echo "═══ 5. o reproducer mínimo ═══"
echo
cat > reproducer.md <<'EOF'
# O reproducer mínimo

## As etapas
| # | O que fazer |
|---|---|
| 1 | CONFIRMAR que reproduz |
| 2 | ⚠ REDUZIR a entrada |
| 3 | CONFIRMAR de novo |
| 4 | CAPTURAR a saída |
| 5 | ⚠ VERIFICAR a versão |

## O que a redução alcança
| Entrada | Tamanho | Serve? |
|---|---|---|
| original do fuzzer | ⚠ 4 KB | ⚠ difícil analisar |
| truncada | 200 B | melhor |
| ⚠ MÍNIMA | ⚠ 20 B | ⚠⚠ REPORTÁVEL |

## ⚠ a redução NÃO é estética
uma entrada de 20 bytes mostra QUAL CAMPO causa o bug.
uma de 4 KB esconde o mecanismo no RUÍDO.

## O que reduzir × o que NÃO
| Reduzir | ⚠ NÃO reduzir |
|---|---|
| bytes irrelevantes | ⚠ o CAMPO que causa |
| padding | ⚠ o TAMANHO que dispara |
| campos ignorados | o VALOR de fronteira |
| ⚠ até parar de reproduzir | ⚠ além disso |

## O que capturar
| Capturar | Por quê |
|---|---|
| o COMANDO | ⚠ para reproduzir |
| a saída do sanitizer | ⚠ a EVIDÊNCIA |
| a VERSÃO do alvo | ⚠ se ainda existe |
| o ambiente | compilador, flags |

## ⚠ A REGRA
o reproducer É o achado.
um crash sem reproducer mínimo é uma ANEDOTA —
e o mantenedor não consegue nem CONFIRMAR nem CORRIGIR.
EOF

cat reproducer.md

echo
echo "═══ 6. o minimizador ═══"
echo
cat > minimiza.py <<'PY'
#!/usr/bin/env python3
"""
minimiza.py — reduz a entrada ao mínimo que AINDA reproduz.

⚠ DIDÁTICO. trabalha no SEU alvo, localmente.
"""
import os, sys, subprocess, struct

ALVO = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/fuzz-lab/alvos/parser_asan")
ARQ = sys.argv[2] if len(sys.argv) > 2 else None
TMP = "/tmp/min.bin"


def reproduz(dados: bytes) -> bool:
    """⚠ a entrada AINDA causa o crash?"""
    with open(TMP, "wb") as f:
        f.write(dados)
    try:
        p = subprocess.run([ALVO, TMP], capture_output=True, timeout=5)
        # ⚠ o ASan devolve código != 0 e escreve no stderr
        return p.returncode != 0 and (b"ERROR" in p.stderr or b"SUMMARY" in p.stderr)
    except subprocess.TimeoutExpired:
        return False
    except Exception:
        return False


def minimiza(dados: bytes) -> bytes:
    """redução gulosa: tenta encurtar, e mantém se ainda reproduz"""
    atual = dados

    # ── 1. acha o menor PREFIXO que ainda reproduz ──
    for n in range(1, len(atual) + 1):
        if reproduz(atual[:n]):
            atual = atual[:n]
            break

    # ── 2. zera bytes, um a um ──
    for i in range(len(atual)):
        tentativa = bytearray(atual)
        tentativa[i] = 0
        if reproduz(bytes(tentativa)):
            atual = bytes(tentativa)

    # ── 3. remove bytes, um a um ──
    i = len(atual) - 1
    while i >= 0:
        tentativa = atual[:i] + atual[i+1:]
        if tentativa and reproduz(tentativa):
            atual = tentativa
        i -= 1

    return atual


def main():
    print("═══ MINIMIZANDO ═══")
    print()
    if not ARQ or not os.path.exists(ARQ):
        print("  uso: minimiza.py <alvo> <arquivo-de-crash>")
        return

    original = open(ARQ, "rb").read()
    print(f"  original: {len(original)} bytes")
    print(f"  reproduz : {'✓ sim' if reproduz(original) else '⚠ NÃO — o arquivo não reproduz'}")
    print()

    if not reproduz(original):
        return

    minimo = minimiza(original)
    print(f"  ⚠ MÍNIMO: {len(minimo)} bytes")
    print(f"  redução : {100 * (1 - len(minimo) / len(original)):.0f}%")
    print()
    print(f"  entrada mínima (hex):")
    print(f"     {minimo.hex()}")
    print()

    saida = ARQ + ".min"
    with open(saida, "wb") as f:
        f.write(minimo)
    print(f"  ✓ salvo em {saida}")
    print()
    print("  ⚠ e o reproducer É o achado — o hex acima é a evidência.")


if __name__ == "__main__":
    main()
PY

chmod +x minimiza.py
echo "  ── pronto ──"
echo "     python3 ~/fuzz-lab/mod10/minimiza.py ~/fuzz-lab/alvos/parser_asan <crash>"
```

⚠ **O minimizador é o instrumento.** **E a redução gulosa é o algoritmo** — **acha o menor prefixo,
zera bytes, remove bytes.**

⚠ **E a nota final é o critério:** **a entrada mínima em hex **é** a evidência** — **e é o que o
mantenedor consegue analisar.**

**Produza `reproducer.md`:**

| Etapa | O que fazer |
|---|---|
| 2 | |
| 4 | |
| 5 | |

**Responda:**

1. **Por que a redução não é estética?
2. **O que reduzir, e o que não?
3. **O que capturar além da entrada?
4. **Por que o reproducer **é** o achado?

---

## 10.4 LAB — A triagem

**Duração:** 120 min

### Passo 1 — Gere crashes e duplique (50 min)

⚠ **A campanha, e depois o agrupamento.**

```bash
cd ~/fuzz-lab/mod10

echo "═══ GERANDO CRASHES ═══"
echo
cat <<'EXPL'
  ── UMA CAMPANHA CURTA, SÓ PARA TER O QUE TRIAR ──

     ./alvos/fuzz_minimo ~/fuzz-lab/corpus/fronteira \
        -max_total_time=90 -artifact_prefix=~/fuzz-lab/crashes/

     ⚠ e o "-artifact_prefix" é o que MANDA os crashes
        para a sua pasta.
     ✓ sem ele, o LibFuzzer escreve no diretório atual.
EXPL

mkdir -p ~/fuzz-lab/crashes

cd ~/fuzz-lab/alvos 2>/dev/null && {
    echo "  ── rodando a campanha ──"
    timeout 100 ./fuzz_minimo ~/fuzz-lab/corpus/fronteira \
        -max_total_time=90 -artifact_prefix="$HOME/fuzz-lab/crashes/" 2>&1 | \
        grep -E 'ERROR|SUMMARY|crash|DONE|NEW' | tail -8 | sed 's/^/     /'
} || echo "  ⚠ o alvo não existe"
echo

echo "═══ E A DEDUPLICAÇÃO ═══"
python3 ~/fuzz-lab/mod10/dedup.py ~/fuzz-lab/crashes 2>&1 | head -25
```

⚠ **A campanha e o agrupamento são o instrumento.** **E a comparação dos números é o argumento:**
**crashes brutos contra grupos distintos.**

⚠ **E a nota do `-artifact_prefix` é prática:** **sem ele, os crashes vão para o diretório atual** —
**e você perde o controle.**

**Produza `crashes.md`:**

| Item | Valor |
|---|---|
| Arquivos de crash | |
| Grupos distintos | |
| Redução | |

**Responda:**

1. **Quantos crashes a campanha gerou?
2. **Quantos grupos distintos?** Quantos sobraram?
3. **A redução foi de ordem de magnitude?
4. **Por que o traço agrupa corretamente?

### Passo 2 — Triá-los e minimizar (40 min)

⚠ **As três perguntas, e o reproducer.**

```bash
cd ~/fuzz-lab/mod10

echo "═══ AS TRÊS PERGUNTAS ═══"
echo
echo "  ── para cada GRUPO (não cada arquivo) ──"
echo
cat <<'EXPL'
     1. ⚠ o traço é do ALVO?
        · se começa no harness → bug SEU
        · se passa pelo alvo   → siga

     2. ⚠ o alvo DECIDIU isso?
        · assert/abort → leia o código
        · memória      → o alvo não decidiu: quebrou

     3. ⚠ já foi corrigido?
        · confira o changelog e a versão
        · e se a antiga ainda está em uso, é achado

  ── E DEPOIS ──
     · minimize a entrada
     · capture a saída
     ✓ e você tem um reproducer reportável.
EXPL

ls -1 ~/fuzz-lab/crashes 2>/dev/null | head -5 | sed 's/^/     /'
echo

echo "  ── e o triador, num deles ──"
PRIMEIRO=$(ls -1 ~/fuzz-lab/crashes 2>/dev/null | head -1)
if [ -n "$PRIMEIRO" ]; then
    python3 ~/fuzz-lab/mod10/tria.py ~/fuzz-lab/crashes/"$PRIMEIRO" 2>&1 | head -25
else
    echo "     ⚠ nenhum crash na pasta"
fi
echo

echo "  ── e a minimização ──"
if [ -n "$PRIMEIRO" ]; then
    python3 ~/fuzz-lab/mod10/minimiza.py ~/fuzz-lab/alvos/parser_asan \
        ~/fuzz-lab/crashes/"$PRIMEIRO" 2>&1 | head -16
fi
```

⚠ **A triagem e a minimização são o entregável.** **E o triador organiza as perguntas** — **sem
decidir.**

⚠ **E a minimização mostra o número:** **de quantos bytes para quantos** — **e é o que torna o
relatório analisável.**

**Produza `triagem.md`:**

| # | Grupo | Traço do alvo? | Decidiu? | É bug? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

**Responda:**

1. **O traço é do alvo?** Como você sabe?
2. **Algum é do harness?** Qual?
3. **Qual o tamanho mínimo da entrada?
4. **Algum é falso positivo?** Qual e por quê?

### Passo 3 — Documente a triagem (30 min)

Produza `caderno/PD-010.md`:

```markdown
# PD-010 — a triagem

**Data:** ____

## 1. A campanha
| Item | Valor |
|---|---|
| alvo | |
| corpus | |
| tempo | |
| ⚠ crashes brutos | |

## 2. A deduplicação
| Método | Resultado |
|---|---|
| arquivos | |
| ⚠ grupos por traço | |

## 3. Os grupos
| # | Assinatura | Ocorrências | É bug? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 4. As três perguntas, por grupo
| # | traço do alvo? | decidiu? | corrigido? | ⚠ veredito |
|---|---|---|---|---|
| 1 | | | | |

## 5. ⚠ O que NÃO é bug
| # | O que | Por quê |
|---|---|---|
| 1 | | |
| 2 | | |

## 6. O reproducer mínimo
| Item | Valor |
|---|---|
| original | |
| ⚠ mínimo | |
| hex | |
| saída capturada | |

## 7. O que o achado NÃO prova
| Item | Por quê |
|---|---|
| que é EXPLORÁVEL | ⚠ a primitiva é outra análise |
| que afeta PRODUÇÃO | contexto |
| ⚠ a SEVERIDADE | depende do uso |

## 8. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro
- [ ] não reportei sem reproducer mínimo
- [ ] não publiquei antes da correção

## 9. O que NÃO foi verificado
⚠ mínimo 3
```

Produza `relatorio-triagem.md`:

```markdown
# Relatório — a triagem

## 1. A campanha e o resultado
| Item | Valor |
|---|---|
| crashes brutos | |
| ⚠ grupos distintos | |
| ⚠ bugs reais | |

## 2. A deduplicação
| Item | Valor |
|---|---|
| método | traço de pilha |
| grupos | |

## 3. Os grupos, triados
| # | Assinatura | Veredito | Razão |
|---|---|---|---|
| | | | |

## 4. ⚠ O que NÃO é bug
| O que | Por quê |
|---|---|
| | |

## 5. O reproducer
```
o comando
```
```
a saída do sanitizer
```
```
a entrada mínima (hex)
```

## 6. A versão
| Item | Valor |
|---|---|
| versão testada | |
| ⚠ ainda existe? | |

## 7. ⚠ O que isso prova, e o que não prova
**Prova:**
- que a entrada X causa o erro Y

**NÃO prova:**
- que é explorável
- a severidade
- que afeta produção

## 8. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro
- [ ] não reportei sem reproducer
- [ ] não publiquei antes da correção

## 9. O que NÃO foi verificado
⚠ mínimo 3

## 10. O que o mantenedor precisa confirmar
| # | Item |
|---|---|
| 1 | a versão afetada |
| 2 | ⚠ a severidade |
```

**Produza `relatorio-triagem.md`:**

| Item | Valor |
|---|---|
| Crashes brutos | |
| Grupos | |
| Bugs reais | |
| Reproducer | |

**Responda:**

1. **Quantos crashes brutos viraram quantos bugs?
2. **O que você descartou, e por quê?
3. **O reproducer mínimo está no relatório?
4. **O que o achado NÃO prova?

### Critérios de aceitação

- `dedup.md` com os **quatro** métodos e os números típicos.
- Você explicou **por que a contagem bruta é inútil**.
- Você explicou **por que a dedup ignora endereços**.
- `dedup.py` rodado sobre os seus crashes.
- Você mediu **a redução de brutos para grupos**.
- `nao-e-bug.md` com os **seis** falsos achados.
- Você explicou **qual é o mais comum** e como reconhecer.
- Você explicou **por que o `assert` é sutil**.
- Você explicou **quando um bug já corrigido é achado**.
- `tria.py` rodado num crash, com as **três perguntas**.
- Você explicou **por que o triador não dá o veredito**.
- `reproducer.md` com as **cinco** etapas.
- Você explicou **por que a redução não é estética**.
- Você explicou **o que reduzir e o que não**.
- `minimiza.py` rodado, com o **tamanho mínimo** e o hex.
- Você explicou **por que o reproducer é o achado**.
- `caderno/PD-010.md` com as **nove** seções.
- `relatorio-triagem.md` com as **dez** seções.
- Você declarou **o que o achado não prova**.
- ⚠ **Nenhum reporte sem reproducer.** Nenhum fuzz pela rede.

---

## Avaliação

1. **O que o fuzzer acha?** E o que ele não acha?
2. **Por que a maioria dos crashes não é bug?
3. **Cite quatro métodos de deduplicação** e a precisão de cada.
4. **Qual é o padrão?** Por quê?
5. **Cite os números típicos** de 200 crashes brutos.
6. **Por que a dedup ignora endereços?
7. **Cite seis coisas que não são bug.
8. **Qual é a mais comum?** Como reconhecer?
9. **Por que o `assert` é sutil?
10. **Quando um bug já corrigido é achado?
11. **Quais são as três perguntas** antes de chamar de bug?
12. **Como se respondem as três?
13. **Cite as cinco etapas do reproducer.
14. **O que a redução alcança?
15. **Por que ela não é estética?
16. **O que reduzir?** E o que não?
17. **O que capturar além da entrada?
18. **O que o reproducer mínimo permite ao mantenedor?
19. **O que um crash sem reproducer é?
20. **O que o achado não prova?** Cite três coisas.

---

**Próximo:** [Módulo 11 — O rendimento](modulo-11.md)
