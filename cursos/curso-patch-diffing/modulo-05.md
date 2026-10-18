# Módulo 5 — Sinal e Ruído

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4

---

## ⚠ Este é o módulo central do curso

⚠ **A afirmação que organiza tudo:**

> **Um patch de segurança toca três funções. O diff mostra quatrocentas. Saber quais três é o
> trabalho — e é a habilidade que separa quem acha de quem desiste.**

⚠ **E o número não é exagero.** **Um binário recompilado tem diferenças em centenas de funções** —
**por endereço, registrador, otimização, inline, ordem.** **E a correção de segurança é uma
delas.**

⚠ **A tese:**

> **Sinal é mudança de CONTROLE DE FLUXO. Ruído é mudança de FORMA.** **E o critério é objetivo —
> não depende de intuição.**

⚠ **E é literalmente o que o material profissional diz:** *"compiler/build differences can create
enormous noise"* — **e o resto do trabalho é separar.**

---

## 5.1 O critério

⚠ **O critério, em uma frase, e ele é operacional:**

```
SINAL                                  RUÍDO
┌────────────────────────────────┐    ┌────────────────────────────────┐
│ muda O QUE o código FAZ        │    │ muda COMO o código faz         │
│ · um branch novo               │    │ · endereço diferente           │
│ · uma comparação diferente     │    │ · registrador diferente        │
│ · uma chamada nova             │    │ · instruções reordenadas       │
│ · uma constante nova           │    │ · inline / desinlined          │
│ · um tipo diferente            │    │ · força de otimização          │
└────────────────────────────────┘    └────────────────────────────────┘
        ⚠ PERGUNTA: o fluxo mudou?          ✓ mesmo fluxo, outra forma
```

⚠ **A pergunta que resolve, e ela é uma só:**

> **"Se eu executar os dois com a mesma entrada, o resultado PODE diferir?"**

⚠ **Se a resposta é "não, é o mesmo comportamento"** — **é ruído.** **Se é "sim, pode diferir"** —
**é sinal.**

⚠ **E isso é verificável.** **Você não precisa julgar por impressão:** **você pergunta se o
comportamento pode mudar.** **É o mesmo critério do fuzzing diferencial** (Pesquisa, módulo 7):
**a diferença de COMPORTAMENTO é o sinal.**

⚠ **A tabela de classificação, com exemplo de cada:**

| Diferença | Fluxo mudou? | Classificação |
|---|---|---|
| `mov eax, 1` → `xor eax, eax; inc eax` | não | ⚠ **Ruído** |
| `jmp 0x401234` → `jmp 0x401240` | não | ⚠ Ruído |
| `cmp eax, 64` → `cmp eax, 63` | ✓ **sim** | ⚠ **SINAL** |
| `mov esi, edi` → `mov esi, ebx` | depende | ⚠ Verificar |
| instruções em ordem diferente | não | ⚠ Ruído |
| um `jle` novo | ✓ **sim** | ⚠ **SINAL** |
| `call valida` novo | ✓ **sim** | ⚠ **SINAL** |
| `mov eax, 0x400` novo | ✓ **sim** | ⚠ **SINAL** |

⚠ **A linha 4 é a única que exige verificação.** **Trocar o registrador de origem** pode ser
**ruído** (o compilador escolheu outro) **ou sinal** (agora vem de outro dado). **Você verifica
rastreando de onde o valor vem.**

```bash
mkdir -p ~/patch-lab/mod05 && cd ~/patch-lab/mod05

echo "═══ 1. o critério, em uma pergunta ═══"
echo
cat > criterio.md <<'EOF'
# O critério: o fluxo mudou?

## A pergunta única
> "Se eu executar os dois com a mesma entrada, o resultado PODE diferir?"

| Resposta | Classificação |
|---|---|
| "não, mesmo comportamento" | ⚠ RUÍDO |
| "sim, pode diferir" | ✓ SINAL |
| "não sei — preciso rastrear" | · VERIFICAR |

## SINAL — muda O QUE o código faz
| Diferença | Exemplo |
|---|---|
| branch novo | `jle` que não existia |
| comparação diferente | `cmp eax, 64` → `cmp eax, 63` |
| chamada nova | `call valida_cabecalho` |
| constante nova | `mov eax, 0x400` |
| tipo diferente | `movsx` → `movzx` (sinal!) |
| ordem de operações | validação movida para antes |

## RUÍDO — muda COMO o código faz
| Diferença | Exemplo |
|---|---|
| endereço | `jmp 0x401234` → `0x401240` |
| registrador | `mov esi, edi` → `mov esi, ebx` (⚠ verificar!) |
| forma de zerar | `mov eax, 0` → `xor eax, eax` |
| força de otimização | código inline / desinlined |
| ordem de instruções | independentes, reordenadas |
| strings movidas | `.rodata` em outro offset |

## ⚠ A conexão com o fuzzing diferencial
⚠ o fuzzing diferencial (Pesquisa, módulo 7) usa o MESMO critério:
   compara COMPORTAMENTO, e a diferença é o sinal.
✓ "mudança de comportamento" e "mudança de fluxo" são a mesma ideia.
EOF

cat criterio.md

echo
echo "═══ 2. os falsos sinais ═══"
echo
cat <<'EXPL'
  ⚠ quatro coisas PARECEM sinal e não são:

  ── FALSO SINAL 1: o registrador trocado ──
     mov esi, edi   →   mov esi, ebx
     ⚠ PODE ser ruído (o compilador escolheu outro)
     ⚠ e PODE ser sinal (o dado vem de outro lugar)
     ✓ verifique RASTREANDO de onde o valor vem

  ── FALSO SINAL 2: a função inlined ──
     a função X sumiu, e o código dela apareceu em Y
     ⚠ é ruído de otimização
     ✓ verifique se o CÓDIGO apareceu em outro lugar

  ── FALSO SINAL 3: a constante que se deslocou ──
     ⚠ uma constante pode mudar de VALOR se o build reorganizou
     ✓ verifique se o valor é o MESMO, só em outro offset

  ── FALSO SINAL 4: a função nova ──
     uma função aparece só em N
     ⚠ pode ser biblioteca estática nova
     ✓ verifique se ela É CHAMADA pelo código que mudou
        (se não é chamada, não importa)

  ✓ e o critério volta: "o comportamento PODE diferir?"
EXPL
```

⚠ **Os quatro falsos sinais são o que faz a maioria desperdiçar tempo.** **E o quarto é o mais
comum:** **uma função nova que ninguém chama** — **provavelmente biblioteca ou dead code.**

⚠ **A regra do falso sinal 4 merece destaque:**

> **Função nova só é sinal se ela É CHAMADA.** **Uma função adicionada e não chamada pelo código que
> mudou não altera comportamento.**

⚠ **E é a mesma regra do "código morto" do Pesquisa (módulo 7, falso positivo 5).** **O caminho
precisa ser alcançável** — **senão, não é bug.**

**Produza `falsos-sinais.md`:**

| Falso sinal | Por que parece | Como verificar |
|---|---|---|
| Registrador trocado | | |
| Função inlined | | |
| Constante deslocada | | |
| Função nova | | |

**Responda:**

1. **Qual falso sinal é o mais comum?** Por quê?
2. **Como distinguir registrador trocado** de mudança real?
3. **O que uma função nova precisa** para ser sinal?
4. **Qual o critério único** que resolve todos?

---

## 5.2 A triagem — das 400 às 3

⚠ **O processo, em quatro filtros, do mais barato ao mais caro.**

| # | Filtro | Reduz de → para | Custo |
|---|---|---|---|
| 1 | **Funções que mudaram o tamanho** | 400 → 60 | ⚠ Segundos |
| 2 | **Presença de branch novo** | 60 → 15 | ⚠ Minutos |
| 3 | **Chamada ou constante nova** | 15 → 5 | Minutos |
| 4 | **Confirmação por leitura** | 5 → **a resposta** | ⚠ Horas |

⚠ **A ordem importa porque o custo cresce.** **Filtrar por tamanho é instantâneo.** **Ler o
descompilado é lento.** **Você nunca lê as 400** — **você lê 5.**

⚠ **A tabela do que cada filtro procura:**

| Filtro | Sinal | Como |
|---|---|---|
| 1 — tamanho | função cresceu | contagem de instruções |
| 2 — branch | `if` a mais | contar ramificações |
| 3 — chamada/constante | validação ou limite | comparar |
| 4 — leitura | o comportamento difere | os dois lados |

⚠ **O filtro 1 é o mais barato e o mais eficaz.** **Função que **não** mudou de tamanho
provavelmente não mudou de comportamento** — **e sai da lista.** **É o mesmo raciocínio do filtro de
commit pequeno (módulo 3).**

⚠ **E o filtro 4 é o único que dá a resposta.** **A leitura confirma** — **e a confirmação é
comportamental** (módulo 4, §4.4).

⚠ **A regra escrita:**

> **Nunca leia o diff inteiro.** **Filtre por tamanho, por branch, por chamada — e leia cinco.**

```bash
cd ~/patch-lab/mod05

echo "═══ 3. a triagem em quatro filtros ═══"
echo
cat > triagem.md <<'EOF'
# Triagem: das 400 às 3

## Filtro 1 — TAMANHO
| Métrica | Valor |
|---|---|
| Funções que mudaram | |
| Após o filtro de tamanho | |
| Critério | função que mudou de tamanho |

⚠ função que NÃO mudou de tamanho provavelmente não mudou de comportamento.

## Filtro 2 — BRANCH NOVO
| Métrica | Valor |
|---|---|
| Entrada | |
| Após o filtro | |
| Critério | presença de ramificação nova |

## Filtro 3 — CHAMADA OU CONSTANTE NOVA
| Métrica | Valor |
|---|---|
| Entrada | |
| Após o filtro | |
| Critério | `call` nova ou constante nova |

## Filtro 4 — CONFIRMAÇÃO
| # | Função | O comportamento difere? | Confirmado? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## A proporção final
| Etapa | Quantidade |
|---|---|
| inicial | |
| f1 | |
| f2 | |
| f3 | |
| f4 (resposta) | |
EOF

cat triagem.md

echo
echo "═══ 4. o script da triagem ═══"
echo
cat > triagem.py <<'PY'
#!/usr/bin/env python3
"""
triagem.py — separa sinal de ruído num diff de binário.

⚠ usa a saída do objdump (módulo 4) ou o descompilado exportado.
   não substitui a leitura — ele ORDENA as funções por probabilidade.
"""
import re, sys, subprocess, os
from collections import defaultdict

def funcoes_de(arquivo):
    """extrai as funções de um dump do objdump"""
    fs = defaultdict(list)
    atual = None
    for linha in open(arquivo, errors="replace"):
        m = re.match(r'^[0-9a-f]+ <([A-Za-z_][\w.]*)>:', linha)
        if m:
            atual = m.group(1)
            continue
        if atual and re.match(r'^\s+[0-9a-f]+:', linha):
            fs[atual].append(linha.strip())
    return fs

def analisa(instr):
    """classifica o conjunto de instruções de uma função"""
    texto = "\n".join(instr)
    branches = len(re.findall(r'\bj[a-z]+\b', texto))
    calls    = len(re.findall(r'\bcall\b', texto))
    cmps     = len(re.findall(r'\bcmp\b', texto))
    consts   = set(re.findall(r'0x[0-9a-f]{2,}', texto))
    return {
        "n": len(instr),
        "branches": branches,
        "calls": calls,
        "cmps": cmps,
        "consts": consts,
    }

def main():
    if len(sys.argv) < 3:
        print("uso: triagem.py <dump-A> <dump-B>")
        sys.exit(2)

    A = funcoes_de(sys.argv[1])
    B = funcoes_de(sys.argv[2])

    print("═══ TRIAGEM: SINAL vs. RUÍDO ═══")
    print()
    print(f"  funções no A : {len(A)}")
    print(f"  funções no B : {len(B)}")
    print()

    comuns = sorted(set(A) & set(B))
    candidatos = []

    for f in comuns:
        a, b = analisa(A[f]), analisa(B[f])
        if a["n"] == b["n"] and a["branches"] == b["branches"] \
           and a["calls"] == b["calls"] and a["consts"] == b["consts"]:
            continue                        # idêntica em tudo o que importa

        # pontua o quanto é "sinal"
        score = 0
        razoes = []
        if b["branches"] != a["branches"]:
            score += 5; razoes.append(f"branches {a['branches']}→{b['branches']}")
        if b["calls"] != a["calls"]:
            score += 3; razoes.append(f"calls {a['calls']}→{b['calls']}")
        if b["cmps"] != a["cmps"]:
            score += 3; razoes.append(f"cmp {a['cmps']}→{b['cmps']}")
        novas = b["consts"] - a["consts"]
        if novas:
            score += 2; razoes.append(f"const nova {sorted(novas)[:2]}")
        if abs(b["n"] - a["n"]) > 0:
            score += 1; razoes.append(f"tam {a['n']}→{b['n']}")

        candidatos.append((score, f, razoes))

    candidatos.sort(reverse=True)

    print(f"  funções com diferença : {len(candidatos)}")
    print()
    print(f"  {'SINAL':>6}  {'função':<28} razões")
    print("  " + "-"*84)
    for score, f, razoes in candidatos[:25]:
        marca = "⚠⚠" if score >= 8 else ("⚠ " if score >= 4 else "· ")
        print(f"  {marca}{score:>4}  {f:<28} {'; '.join(razoes)[:44]}")

    print()
    print("── LEITURA ──")
    print("  ⚠⚠ score alto  → provável SINAL. leia primeiro.")
    print("  ⚠  score médio → verificar (pode ser registrador trocado)")
    print("  ·  score baixo → provável RUÍDO (só tamanho mudou)")
    print()
    print("  ✓ e o critério continua sendo um só:")
    print("     'o comportamento PODE diferir?'")
    print("  ⚠ este script ORDENA. a leitura CONFIRMA.")

if __name__ == "__main__":
    main()
PY

chmod +x triagem.py

# testa no par de treino
cd ~/patch-lab/alvos/treino 2>/dev/null && {
    objdump -d -M intel verso_antigo > /tmp/tA.asm 2>/dev/null
    objdump -d -M intel verso_novo   > /tmp/tB.asm 2>/dev/null
    echo
    python3 ~/patch-lab/mod05/triagem.py /tmp/tA.asm /tmp/tB.asm 2>&1 | head -30
} || echo "  ⚠ rode o módulo 2 para ter o par de treino"
```

⚠ **O script **ordena**; ele não decide.** **E a nota final é a regra do curso:** **a ferramenta
ordena por probabilidade, e a leitura confirma.** **Nenhuma automatização substitui o critério.**

⚠ **E o `score` implementa o critério:** **branch vale mais (5)** — **porque é a mudança de fluxo
mais direta.** **Chamada e comparação valem 3.** **Constante vale 2.** **Tamanho vale 1** — porque
**sozinho é ruído.**

**Produza `triagem-rodada.md`:**

| Etapa | Quantidade | O que descartou |
|---|---|---|
| Inicial | | |
| Após tamanho | | |
| Após branch | | |
| Após chamada/constante | | |
| Confirmadas | | |

**Responda:**

1. **Quantas funções sobraram** em cada filtro?
2. **Qual filtro descartou mais?**
3. **O script ordenou corretamente?** A função do patch ficou no topo?
4. **Por que branch vale mais** que tamanho na pontuação?

---

## 5.3 O ruído, por origem

⚠ **Conhecer a origem do ruído permite prevê-lo — e às vezes evitá-lo.**

| Origem | Efeito | Evitável? |
|---|---|---|
| **Otimização diferente** | ⚠ **Enorme** | ✓ Mesmas flags |
| **Versão de compilador** | Grande | ✓ Mesmo compilador |
| **Ordem de link** | Endereços | ✓ Difícil |
| **Biblioteca estática** | Muitas funções | ✓ Difícil |
| **Build não determinístico** | ⚠ **Total** | ✓ Binário oficial |
| **ASLR/PIE** | Endereços base | ✓ Ignorar base |

⚠ **A primeira linha é a que mais importa** — **e a única que você controla de verdade.** **`-O0`
vs. `-O2` gera diferença total** — **e o binário oficial é compilado com as flags **dele**.**
**Você não muda isso** — **mas você sabe que existe.**

⚠ **A tabela do que fazer com cada origem:**

| Origem | O que fazer |
|---|---|
| Otimização | ⚠ **Aceitar** — e filtrar por fluxo |
| Compilador | ⚠ **Aceitar** — e filtrar por fluxo |
| Link | Ignorar endereços |
| Biblioteca estática | Filtrar por **"é chamada?"** |
| Não determinístico | ⚠ **Usar binário oficial** |
| PIE | ⚠ **Ignorar a base** — comparar offsets |

⚠ **A linha do PIE merece a explicação.** **Com PIE, o binário tem endereços relativos** — **e a
base muda a cada execução.** **Mas o **offset** é o mesmo.** **Você compara **offsets**, não
endereços absolutos** — **senão, tudo "muda".**

⚠ **E é a razão de o Ghidra ter "Image Base"** — **e de você realinhar os dois binários na mesma
base** antes de comparar. **Sem isso, você compara endereço, não código.**

⚠ **A regra escrita:**

> **Antes de comparar, alinhe a base.** **Endereço diferente é ruído por definição** — **e você o
> elimina tirando a base da conta.**

```bash
cd ~/patch-lab/mod05

echo "═══ 5. o ruído, por origem ═══"
echo
cat > ruido.md <<'EOF'
# O ruído, por origem

## Evitável desde o início (módulo 2)
| Origem | Como evitar |
|---|---|
| Otimização | usar o binário OFICIAL (flags do fornecedor) |
| Compilador | usar o binário OFICIAL |
| Não determinístico | usar o binário OFICIAL |

## Inevitável — filtrar
| Origem | Como filtrar |
|---|---|
| Ordem de link | ignorar endereços |
| Biblioteca estática | filtrar por "é chamada?" |
| PIE / base | ⚠ comparar OFFSETS, não endereços |
| Inline / desinlined | procurar o código em outro lugar |

## ⚠ O PIE e a base
| Item | Valor |
|---|---|
| A tem PIE? | |
| B tem PIE? | |
| Base de A | |
| Base de B | |
| ⚠ Comparar offsets? | sim |

⚠ com PIE, o binário é carregado numa base aleatória.
   mas o OFFSET das funções é o mesmo.
   ✓ alinhe a base no Ghidra (Image Base) antes de comparar.

## A tabela
| Diferença | Origem provável | Ação |
|---|---|---|
| endereço | link / PIE | ignorar |
| registrador | compilador | ⚠ verificar |
| instruções a mais | ⚠ pode ser sinal | ⚠ ler |
| função sumiu | inline | procurar em outro lugar |
| função nova | biblioteca | ⚠ "é chamada?" |
EOF

cat ruido.md

echo
echo "═══ 6. medição: quanto ruído o SEU par tem? ═══"
echo

cd ~/patch-lab/alvos/treino 2>/dev/null && {
    echo "  ── diferenças no par de treino (–O0 nos dois) ──"
    diff <(objdump -d -M intel verso_antigo) <(objdump -d -M intel verso_novo) | \
        grep -c '^[<>]' | xargs printf '     linhas de diferença: %s\n'
    echo

    echo "  ── e no par com flags DIFERENTES (–O0 vs –O2) ──"
    diff <(objdump -d -M intel verso_antigo) <(objdump -d -M intel ~/patch-lab/mod02/b_O2 2>/dev/null) 2>/dev/null | \
        grep -c '^[<>]' | xargs printf '     linhas de diferença: %s\n'
    echo
    echo "  ⚠ a diferença de ORDEM DE GRANDEZA é o ponto:"
    echo "     · mesma proveniência → poucas linhas, e a de segurança está lá"
    echo "     · proveniência diferente → milhares, e você não sabe qual é"
} || echo "  ⚠ rode o módulo 2 primeiro"

echo
echo "═══ 7. a proporção que o curso cita ═══"
cat <<'EXPL'
  ── num diff de binário real, com proveniência OK ──
     funções que mudaram : 50 a 400
     ⚠ que são SINAL       : 1 a 5
     ⚠ que são RUÍDO       : o resto

  ✓ proporção típica: 1:100

  ⚠ e é por isso que ler o diff inteiro não escala.
     você FILTRA — e lê cinco.
EXPL
```

⚠ **A medição do §6 é o argumento quantitativo.** **Mesma proveniência: poucas linhas.** **Proveniência diferente: milhares.** **E a diferença de ordem de grandeza é o que justifica o módulo 2.**

⚠ **E a proporção 1:100 é o número que organiza o módulo.** **Ler 400 é inviável; ler 5 é o trabalho.**

**Produza `ruido-medido.md`:**

| Comparação | Linhas de diferença | O que conclui |
|---|---|---|
| Mesma proveniência | | |
| Proveniência diferente | | |

**Responda:**

1. **Qual a diferença de ordem de grandeza?**
2. **Qual origem de ruído é evitável?** Como?
3. **Por que comparar offsets** e não endereços?
4. **Qual a proporção típica** de sinal e ruído?

---

## 5.4 LAB — Triagem completa

**Duração:** 120 min

### Passo 1 — Gere e classifique (45 min)

⚠ **Use o par de treino, ou um par real.**

```bash
cd ~/patch-lab/mod05

echo "═══ GERANDO OS DUMPS ═══"
cd ~/patch-lab/alvos/treino 2>/dev/null && {
    objdump -d -M intel verso_antigo > /tmp/SA.asm 2>/dev/null
    objdump -d -M intel verso_novo   > /tmp/SB.asm 2>/dev/null
    echo "  ✓ dumps gerados"
    echo
    python3 ~/patch-lab/mod05/triagem.py /tmp/SA.asm /tmp/SB.asm > /tmp/triagem.txt 2>&1
    cat /tmp/triagem.txt | head -30
} || echo "  ⚠ rode o módulo 2 para ter o par de treino"

echo
echo "═══ CLASSIFICANDO MANUALMENTE ═══"
echo
cat <<'EXPL'
  ── para cada função que apareceu na triagem, aplique ──

     PERGUNTA: "o comportamento PODE diferir?"

     ├─ NÃO  → ⚠ RUÍDO
     │         · endereço, registrador, forma de zerar
     │         · instruções reordenadas
     │
     ├─ SIM  → ✓ SINAL
     │         · branch novo
     │         · comparação com valor diferente
     │         · chamada nova
     │         · constante nova
     │         · ordem de operações trocada
     │
     └─ NÃO SEI → · VERIFICAR
                 · rastrear de onde o valor vem
                 · checar se a função é CHAMADA

  ⚠ e registre cada classificação com a razão
EXPL

cat > caderno/PD-005.md <<'EOF'
# PD-005 — triagem sinal vs. ruído

**Data:** ____

## 1. O par
| Item | Valor |
|---|---|
| Proveniência OK? | |
| Funções que mudaram | |

## 2. Os quatro filtros
| Filtro | Entrada | Saída | O que descartou |
|---|---|---|---|
| 1 tamanho | | | |
| 2 branch | | | |
| 3 chamada/constante | | | |
| 4 leitura | | | |

## 3. A classificação
| # | Função | Diferença | Comportamento pode diferir? | Classificação | Razão |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

## 4. Os falsos sinais encontrados
| # | Falso sinal | Como identifiquei |
|---|---|---|
| 1 | | |
| 2 | | |

## 5. A proporção
| Métrica | Valor |
|---|---|
| funções que mudaram | |
| sinal | |
| ruído | |
| ⚠ proporção | |

## 6. O invariante e o padrão
| Item | Valor |
|---|---|
| invariante | |
| **PADRÃO (sem nomes)** | |

## 7. O que isso destrava
[a próxima pergunta]
EOF

echo "  ⚠ a ficha PD-005 criada"
head -12 caderno/PD-005.md
```

Produza `classificacao.md`:

| # | Função | Classificação | Razão |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

**Responda:**

1. **Quantas funções você classificou?**
2. **Quantas são sinal?** E ruído?
3. **Qual a proporção?**
4. **Você achou algum falso sinal?** Qual?

### Passo 2 — Confirme por comportamento (45 min)

⚠ **A classificação é hipótese. A confirmação é comportamental.**

```bash
cd ~/patch-lab/mod05

echo "═══ CONFIRMANDO ═══"
echo
cat <<'EXPL'
  ── a classificação diz "provável sinal".
     ⚠ a confirmação diz "o comportamento DIFERE".
     e é o que o módulo 4 fez.

  ── como confirmar ──
     1. identifique a ENTRADA que o patch deve recusar
     2. execute os DOIS com ela
     3. ⚠ se N-1 processa e N recusa → CONFIRMADO

  ── no par de treino ──
     entrada normal       → os dois processam
     ⚠ count acima de max → N-1 processa, N recusa
EXPL

cd ~/patch-lab/alvos/treino 2>/dev/null && {
    echo
    echo "  ── confirmando no par de treino ──"
    NORMAL="4"
    GRANDE=$(python3 -c 'import sys;sys.stdout.buffer.write(b"\xff\xff"+b"a"*8)' 2>/dev/null)

    printf '     normal : N-1=%s  N=%s\n' \
        "$(./verso_antigo "$NORMAL" 2>&1 | head -1)" \
        "$(./verso_novo   "$NORMAL" 2>&1 | head -1)"

    printf '     grande : N-1=%s  N=%s\n' \
        "$(./verso_antigo "$GRANDE" 2>&1 | head -1)" \
        "$(./verso_novo   "$GRANDE" 2>&1 | head -1)"

    echo
    echo "  ✓ se a segunda linha difere, a correção está CONFIRMADA"
    echo "     ⚠ e tudo no SEU alvo — nenhum sistema de terceiro"
}

echo
echo "═══ E A LIGAÇÃO COM O FUZZING ═══"
cat <<'EXPL'
  ── a mesma ideia do fuzzing diferencial (Pesquisa, módulo 7) ──
     · lá: você manda a MESMA entrada para DUAS implementações
     · aqui: você manda a MESMA entrada para DUAS versões
     ⚠ e a DIFERENÇA DE COMPORTAMENTO é o sinal

  ✓ é por isso que o critério do §5.1 é comportamental:
     "o resultado PODE diferir?" é exatamente a pergunta do fuzzer.

  ⚠ e o módulo 10 usa isso: se o padrão existe em OUTRO projeto,
     a mesma entrada deve fazê-lo diferir também.
EXPL
```

⚠ **A confirmação comportamental é o que fecha a triagem.** **Sem ela, você tem uma **diferença de
código**; com ela, você tem uma **correção identificada**.**

⚠ **E a ligação com o fuzzing é o que conecta os cursos.** **O `1dFuzz` (Pesquisa, módulo 7) faz
exatamente isso** — **só que automatizado:** **guia o fuzzer até a posição do patch** — **e o
critério é a diferença de comportamento.**

**Produza `confirmado.md`:**

| Entrada | N-1 | N | Difere? |
|---|---|---|---|
| Normal | | | |
| Que deve recusar | | | |

**Responda:**

1. **O comportamento difere?** Com qual entrada?
2. **Isso confirma** a classificação?
3. **Em qual alvo você testou?** Confirme que é seu.
4. **Qual a ligação com o fuzzing diferencial?**

### Passo 3 — O relatório (30 min)

Produza `relatorio-triagem.md`:

```markdown
# Triagem sinal vs. ruído — relatório

## 1. O par e a proveniência
| Item | Valor |
|---|---|
| Projeto / CVE | |
| Proveniência OK? (módulo 2) | |
| Símbolos? | |

## 2. O processo
| # | Filtro | Entrada | Saída |
|---|---|---|---|
| 1 | tamanho | | |
| 2 | branch | | |
| 3 | chamada/constante | | |
| 4 | leitura | | |

## 3. O critério aplicado
⚠ **"o comportamento PODE diferir?"**

| # | Função | Diferença | Resposta | Classificação |
|---|---|---|---|---|
| | | | | |

## 4. Os falsos sinais
| # | Falso sinal | Como descartei |
|---|---|---|
| | | |

## 5. A confirmação
| Entrada | N-1 | N | Difere? |
|---|---|---|---|
| | | | |

## 6. A proporção
| Métrica | Valor |
|---|---|
| funções que mudaram | |
| **sinal** | |
| **ruído** | |
| proporção | |

## 7. O que isso me ensinou sobre PROVENIÊNCIA
[o módulo 2 na prática]

## 8. O que NÃO foi verificado
⚠ mínimo 3:
- 
- 
- 

## 9. O que isso destrava
| # | Pergunta | Prioridade |
|---|---|---|
```

**Responda:**

1. **Quantas funções eram sinal?** E quantas ruído?
2. **Qual filtro foi o mais eficaz** no seu caso?
3. **O que a proveniência ruim faria** com este diff?
4. **Cite três itens** do que não verificou.

### Critérios de aceitação

- `criterio.md` com a **pergunta única** e a tabela sinal/ruído.
- Você explicou **por que o critério é comportamental**.
- Você conectou o critério com o **fuzzing diferencial**.
- `falsos-sinais.md` com os **quatro** falsos sinais e como verificar cada.
- Você explicou **por que função nova precisa ser chamada** para ser sinal.
- `triagem.md` com os **quatro** filtros e a contagem de cada.
- Você explicou **por que o filtro de tamanho é o mais barato**.
- `triagem.py` rodado, com as funções **ordenadas** por score.
- Você explicou **por que branch vale mais** que tamanho na pontuação.
- `ruido-medido.md` com a **medição de linhas** nos dois casos.
- Você explicou **por que comparar offsets** e não endereços.
- `classificacao.md` com **pelo menos cinco** funções classificadas com razão.
- `confirmacao.md` mostrando que **o comportamento difere** com a entrada certa.
- Você confirmou que testou **no seu alvo**.
- `relatorio-triagem.md` com as **nove** seções.
- Você citou **três itens** do que não verificou.
- ⚠ **Nenhum alvo de terceiro.**

---

## Avaliação

1. **Qual é o critério único** de sinal vs. ruído?
2. **Como ele se conecta ao fuzzing diferencial?**
3. **Cite cinco itens de sinal** e cinco de ruído.
4. **Qual diferença exige verificação?** Por quê?
5. **Cite os quatro falsos sinais.**
6. **Qual é o mais comum?** Por quê?
7. **Quando uma função nova é sinal?** Quando não é?
8. **Cite os quatro filtros** da triagem, em ordem.
9. **Por que o filtro de tamanho é o mais barato?**
10. **Por que você nunca lê as 400?**
11. **Por que branch vale mais** que tamanho no score?
12. **Quais origens de ruído são evitáveis?** Como?
13. **Quais são inevitáveis?** O que fazer?
14. **Por que comparar offsets** e não endereços?
15. **O que o PIE muda** na comparação?
16. **Qual a proporção típica** de sinal e ruído?
17. **O que a medição de linhas demonstrou?**
18. **Como confirmar** uma classificação de sinal?
19. **Em qual alvo** você confirma?
20. **O que a ferramenta faz** e o que ela não faz?

---

**Próximo:** [Módulo 6 — As ferramentas](modulo-06.md)
