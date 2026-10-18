# Módulo 4 — Diff de Binário, Manual

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 3 · curso de Assembly e RE

---

## Objetivos

1. Carregar um par no **Ghidra** e casar as funções.
2. Rodar os **correlators** e avaliar o resultado — sem confiar cegamente.
3. Ler o **descompilado** dos dois lados e comparar.
4. Achar a função do patch **sem** saber qual é — só pela forma.
5. Registrar o achado com evidência reproduzível.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O Ghidra não acha o patch. Ele mostra 400 funções que mudaram. Achar a que importa é o seu
> trabalho** — e é o módulo 5.

⚠ **E a razão de fazer manual primeiro:** **se você automatizar antes de entender, você não
consegue julgar a saída.** **O `DiffRays` te dá as funções que mudaram** — **e sem o critério do
módulo 5, você não sabe quais das 400 importam.**

⚠ **A tese:**

> **O processo manual é lento de propósito.** Ele treina o olho que o módulo 5 formaliza — **a
> distinção entre mudança de fluxo (sinal) e mudança de forma (ruído).**

⚠ **A tabela do que cada passo do Ghidra faz:**

| Passo | O que acontece | O que você faz |
|---|---|---|
| **Importar** | carrega os dois binários | — |
| **Auto-analysis** | descompila, identifica funções | aguardar |
| **Version Tracking** | cria a sessão | — |
| **Correlators** | **casa funções entre versões** | ⚠ rodar vários |
| **Avaliar** | mostra o que casou e o que não | ⚠ **julgar** |
| **Ler o diff** | o descompilado lado a lado | ⚠ **o trabalho** |

⚠ **A linha "julgar" é a que a ferramenta não faz.** **Um correlator pode casar funções erradas** —
**e um par mal casado produz um diff falso.** **Você confere.**

⚠ **E a linha "rodar vários" merece nota:** **cada correlator casa por um critério** (estrutura,
string, símbolo, chamada). **Rodar todos melhora a cobertura** — **e é o que o material
profissional recomenda:** *"run more correlators, go back to step 4"*, iterativamente.

---

## 4.1 O fluxo no Ghidra

⚠ **O processo, passo a passo. E ele é o mesmo com `BinDiff` ou `Ghidriff`.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. CRIAR PROJETO                                                     │
│    File → New Project → Non-Shared                                   │
├──────────────────────────────────────────────────────────────────────┤
│ 2. IMPORTAR OS DOIS BINÁRIOS                                         │
│    File → Import File    (N-1 e N)                                   │
│    ⚠ aceite a análise automática                                      │
├──────────────────────────────────────────────────────────────────────┤
│ 3. CRIAR A SESSÃO DE VERSION TRACKING                                │
│    Tools → Version Tracking → Create Session                         │
│    · source     : N-1  (vulnerável)                                  │
│    · destination: N    (corrigida)                                   │
├──────────────────────────────────────────────────────────────────────┤
│ 4. RODAR OS CORRELATORS                                              │
│    ⚠ rode TODOS — cada um casa por um critério diferente              │
│    · Symbol Name / Exact Match                                       │
│    · Function Comparison (structure)                                 │
│    · Data / String References                                        │
│    · Call Graph Matching                                             │
├──────────────────────────────────────────────────────────────────────┤
│ 5. AVALIAR E ITERAR                                                  │
│    · veja o que casou                                                 │
│    · ⚠ descarte par que parece errado                                 │
│    · rode mais correlators                                            │
│    · VOLTE ao passo 5 enquanto melhorar                               │
├──────────────────────────────────────────────────────────────────────┤
│ 6. FILTRAR: SÓ AS FUNÇÕES QUE MUDARAM                                │
│    ⚠ aqui começam as 400 — e é o módulo 5 que reduz a 3              │
├──────────────────────────────────────────────────────────────────────┤
│ 7. LER O DESCOMPILADO LADO A LADO                                    │
│    ⚠ e aqui você acha a função do patch                               │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **O passo 4 é o que mais gente faz mal.** **Rodar um correlator só** deixa funções sem casar —
**e uma função sem casar aparece como "removida e adicionada"**, o que gera **ruído falso.**

⚠ **E o passo 5 é iterativo, e é o que o material profissional descreve:** *"Evaluate matches, run
more correlators, go back to step 4"*. **A iteração é parte do método** — **não um passo
opcional.**

⚠ **A tabela do que cada correlator casa:**

| Correlator | Casa por | Bom para |
|---|---|---|
| **Symbol Name / Exact Match** | nome do símbolo | ⚠ **Binário COM símbolos** |
| **Exact Function Bytes** | bytes idênticos | Funções não tocadas |
| **Function Comparison** | estrutura de fluxo | ⚠ **O principal** |
| **Data / String References** | strings usadas | Funções com string |
| **Call Graph** | quem chama quem | Funções relacionadas |

⚠ **A linha do "binário com símbolos" é o que muda tudo.** **Se o binário tem símbolos**, o
casamento é quase perfeito — **e o diff fica trivial.** **Se está *stripped*, você depende dos
outros correlators** — **e o ruído sobe.**

⚠ **É a razão de o material profissional recomendar baixar os **símbolos** também** — quando o
fornecedor publica (a Microsoft publica para o Windows). **Símbolos transformam um diff difícil em
um diff fácil.**

```bash
mkdir -p ~/patch-lab/mod04 && cd ~/patch-lab/mod04

echo "═══ 1. você tem símbolos? ═══"
echo
cat > checa-simbolos.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail
BIN="${1:?uso: checa-simbolos.sh <binario>}"

echo "═══════════ SÍMBOLOS EM $(basename "$BIN") ═══════════"
echo

n_sym=$(nm "$BIN" 2>/dev/null | wc -l)
n_dyn=$(nm -D "$BIN" 2>/dev/null | wc -l)

printf '  símbolos estáticos : %s\n' "$n_sym"
printf '  símbolos dinâmicos : %s\n' "$n_dyn"
echo

if [ "$n_sym" -gt 50 ]; then
    echo "  ✓✓ binário COM símbolos — o casamento será fácil"
    echo
    echo "  ── amostra ──"
    nm "$BIN" 2>/dev/null | head -8 | sed 's/^/     /'
elif [ "$n_sym" -gt 0 ]; then
    echo "  ✓ símbolos parciais (típico de binário com strip parcial)"
    nm "$BIN" 2>/dev/null | head -5 | sed 's/^/     /'
else
    echo "  ⚠ binário STRIPPED — sem símbolos de função"
    echo "     → você depende dos correlators de estrutura e string"
    echo
    echo "  ── o que ainda funciona ──"
    echo "     · Function Comparison (estrutura de fluxo)"
    echo "     · Data / String References"
    echo "     · Call Graph Matching"
    echo "  ⚠ e o ruído será maior — o módulo 5 é essencial aqui"
fi
echo

echo "── SEÇÕES (o que o binário expõe) ──"
readelf -SW "$BIN" 2>/dev/null | grep -E '\.symtab|\.debug|\.strtab|\.rodata|\.text' | sed 's/^/  /'
echo

echo "── O QUE PROCURAR QUANDO O FORNECEDOR PUBLICA SÍMBOLOS ──"
cat <<'EXPL'
  · Microsoft:  símbolos públicos por build (symchk, symbol server)
  · Linux:      pacote -dbg / -dbgsym (ddeb)
  · projetos:   release com .debug ou .pdb

  ✓ símbolos transformam um diff difícil em um diff fácil.
  ⚠ e sem eles, os correlators de estrutura carregam o peso.
EXPL
SCRIPT

chmod +x checa-simbolos.sh

# testa nos binários de treino
A=~/patch-lab/alvos/treino/verso_antigo
B=~/patch-lab/alvos/treino/verso_novo
[ -f "$A" ] && ./checa-simbolos.sh "$A" | head -25 || echo "  ⚠ rode o módulo 2 primeiro"
```

⚠ **A checagem de símbolos é o primeiro passo — porque ela decide a dificuldade.** **Binário com
símbolos: o diff é trivial.** **Stripped: você depende dos correlators de estrutura.**

⚠ **E a seção final é a ponte prática:** **o fornecedor frequentemente **publica** os símbolos** —
**e baixá-los transforma o trabalho.** **É uma das recomendações que economiza mais tempo.**

**Produza `simbolos.md`:**

| Item | Valor | Implicação |
|---|---|---|
| Símbolos estáticos | | |
| Símbolos dinâmicos | | |
| Está stripped? | | |
| Correlators que funcionam | | |

**Responda:**

1. **O seu binário tem símbolos?** O que isso muda?
2. **Quais correlators funcionam** sem símbolos?
3. **O que o fornecedor publica** que ajuda?
4. **Por que rodar vários correlators?**

---

## 4.2 Lendo o descompilado

⚠ **O Ghidra mostra o **pseudocódigo** dos dois lados. E é isso que você compara.**

⚠ **A vantagem sobre o assembly:** **o descompilado é legível** — **e a diferença de segurança
aparece como um `if` novo**, **igual ao diff de fonte.**

⚠ **A tabela do que comparar, em ordem:**

| # | O que comparar | Por que |
|---|---|---|
| 1 | **Contagem de instruções** | ⚠ Função maior = algo foi acrescentado |
| 2 | **Chamadas de função** | Uma chamada nova = validação nova |
| 3 | **Comparações** | `>` vs. `>=` |
| 4 | **Tipos** | `short` → `int` |
| 5 | **Ramificações** | `if` novo |
| 6 | **Constantes** | Um `1024` novo = limite novo |

⚠ **A linha 6 é a mais reveladora e a mais fácil.** **Uma constante que aparece só na versão
corrigida é quase sempre o limite** — `MAX_ITEMS`, `sizeof`, um número específico. **É o sinal mais
direto.**

⚠ **E a linha 2 é a que confirma.** **Uma chamada a função nova — `valida_*`, `check_*`,
`assert` — é validação acrescentada.** **É a forma 5 do módulo 3, no binário.**

⚠ **A tabela do que cada sinal parece, no descompilado:**

| Sinal | Aparência |
|---|---|
| Guarda acrescentada | `if (x > 0x400) { return; }` **novo** |
| Guarda movida | o mesmo `if` em **outro ponto** |
| Condição | `if (x > 0x40)` → `if (x > 0x3f)` |
| Tipo | variável declarada com tipo maior |
| Validação | `uVar = valida_cabecalho(...)` **novo** |

⚠ **E a leitura exige uma coisa que o curso de Assembly e RE cobriu:** **saber o que o descompilado
está dizendo.** **Um `if` no pseudocódigo pode vir de uma comparação em assembly** — **e você
precisa reconhecer a equivalência.**

⚠ **A tabela dos conceitos que você usa:**

| No descompilado | No assembly |
|---|---|
| `if (a > b)` | `cmp a, b` + `jle` |
| `memcpy(d, s, n)` | chamada + argumentos em registrador/pilha |
| `uVar1 = f()` | `call f` + `mov eax` |
| `return -2;` | `mov eax, 0xfffffffe` + epílogo |

⚠ **A regra escrita:**

> **O Ghidra traduz, mas não interpreta.** **Ele mostra o que o código faz, não se está certo.**
> **A leitura de segurança é sua** — e é o módulo 3 (os três níveis) aplicado ao pseudocódigo.

```bash
cd ~/patch-lab/mod04

echo "═══ 2. lendo o descompilado — os seis sinais ═══"
echo
cat > seis-sinais.md <<'EOF'
# Os seis sinais no descompilado

## 1. CONTAGEM DE INSTRUÇÕES
| N-1 | N | Diferença |
|---|---|---|
| | | ⚠ função maior = algo foi acrescentado |

## 2. CHAMADAS DE FUNÇÃO
| N-1 chama | N chama | Nova? |
|---|---|---|
| | | ⚠ validação nova (forma 5) |

## 3. COMPARAÇÕES
| N-1 | N | Mudou? |
|---|---|---|
| `if (x > 0x40)` | `if (x > 0x3f)` | ⚠ forma 3 |

## 4. TIPOS
| N-1 | N |
|---|---|
| `short x;` | `int x;` | ⚠ forma 4 |

## 5. RAMIFICAÇÕES
| N-1 | N |
|---|---|
| (sem ramificação) | `if (...) { return; }` | ⚠ forma 1 |

## 6. CONSTANTES ⚠ o sinal mais direto
| N-1 | N |
|---|---|
| (nenhuma) | `0x400` | ⚠ **um limite novo** |

## A tabela do que cada um indica
| Sinal | Indica |
|---|---|
| instruções a mais | algo foi acrescentado |
| chamada nova | validação |
| comparação alterada | off-by-one |
| tipo maior | valor não cabia |
| ramificação nova | guarda |
| **constante nova** | ⚠ **o limite** |
EOF

cat seis-sinais.md

echo
echo "═══ 3. os conceitos que você usa ═══"
echo
cat <<'EXPL'
  ┌────────────────────────┬──────────────────────────────────────────┐
  │ NO DESCOMPILADO        │ NO ASSEMBLY                              │
  ├────────────────────────┼──────────────────────────────────────────┤
  │ if (a > b)             │ cmp a, b  +  jle/jg                      │
  │ memcpy(d, s, n)        │ args em registrador (x64) ou pilha (x86) │
  │ uVar1 = f()            │ call f  +  mov eax, ...                  │
  │ return -2;             │ mov eax, 0xfffffffe  +  epílogo          │
  │ (uVar >> 3) & 7        │ deslocamento e máscara                   │
  │ local_58[16]           │ array na pilha, offset -0x58             │
  └────────────────────────┴──────────────────────────────────────────┘

  ⚠ o Ghidra TRADUZ, não INTERPRETA.
     ele mostra o que o código faz — não se está certo.
     ✓ a leitura de segurança é SUA (módulo 3, os três níveis)

  ── e os nomes ruins são normais ──
     uVar1, iVar2, local_58, FUN_00401234
     ⚠ é o preço de não ter símbolos — e você trabalha assim mesmo
EXPL
```

⚠ **A tabela dos conceitos é a ponte com o curso de Assembly.** **O descompilado é legível, mas o
significado de segurança exige entender o que ele representa.**

⚠ **E a nota dos nomes ruins merece atenção.** **`uVar1`, `local_58`, `FUN_00401234`** — **é o que
você tem sem símbolos.** **Trabalhar assim é normal** — **e a idade do binário não muda as formas
do patch.**

**Produza `descompilado.md`:**

| Sinal | N-1 | N | Mudou? |
|---|---|---|---|
| Instruções | | | |
| Chamadas | | | |
| Comparações | | | |
| Constantes | | | |

**Responda:**

1. **Qual dos seis sinais é o mais direto?** Por quê?
2. **Uma chamada nova indica o quê?**
3. **O que o Ghidra faz, e o que ele não faz?**
4. **Por que os nomes ruins não impedem** a análise?

---

## 4.3 Achar a função, sem saber qual é

⚠ **O exercício central do módulo: você tem 400 funções alteradas, e a do patch é uma.**

⚠ **E há um caminho para achar sem ler as 400.** **A tabela dos atalhos, em ordem de eficiência:**

| # | Atalho | O que faz |
|---|---|---|
| 1 | **Procurar constantes novas** | ⚠ A constante do limite está lá |
| 2 | **Procurar chamadas novas** | A validação é uma chamada |
| 3 | **Filtrar por tamanho** | ⚠ **Função que cresceu pouco** |
| 4 | **Cruzar com o CVE** | O componente está no advisory |
| 5 | **Comparar o número de `if`** | ⚠ **Uma função com um `if` a mais** |

⚠ **A linha 5 é a mais eficiente, e a menos usada.** **Você conta os `if` nos dois lados** — **e a
função do patch tem exatamente um a mais.** **É a forma 1 do módulo 3, em forma de contagem.**

⚠ **E a linha 3 é a que o material profissional recomenda implicitamente.** **Um patch de segurança
altera **poucas** funções, e **pouco**.** **Filtrar por "mudou pouco" elimina quase tudo.**

⚠ **A tabela do que cada atalho descarta:**

| Atalho | Fica com | Descarta |
|---|---|---|
| Constantes novas | 2–5 funções | 395 |
| Chamadas novas | 3–8 funções | 392 |
| Tamanho | 10–30 funções | 370 |
| Componente do CVE | 1 arquivo | o resto |
| ⚠ **`if` a mais** | ⚠ **1–3 funções** | **397** |

⚠ **E é o mesmo raciocínio do módulo 3 (os filtros de commit).** **A correção é pequena e
cirúrgica** — **e "pequeno e cirúrgico" é filtrável.**

⚠ **A regra escrita:**

> **O patch está onde o código mudou POCO, e onde um `if` apareceu.** **Filtre por isso — e as 400
> viram 3.**

```bash
cd ~/patch-lab/mod04

echo "═══ 4. os atalhos para achar a função ═══"
echo
cat > atalhos.md <<'EOF'
# Atalhos para achar a função do patch

## Ordem de eficiência
| # | Atalho | Fica com | Como |
|---|---|---|---|
| 1 | ⚠ **`if` a mais** | 1–3 | contar `if` nos dois lados |
| 2 | **constante nova** | 2–5 | procurar 0x... só na versão N |
| 3 | **chamada nova** | 3–8 | comparar as chamadas |
| 4 | **tamanho** | 10–30 | função que cresceu pouco |
| 5 | **componente do CVE** | 1 arquivo | o advisory diz o componente |

## Por que o atalho 1 funciona
⚠ o patch de segurança acrescenta UM `if`.
   contar os `if` nos dois lados mostra qual função tem um a mais.
   ✓ é a forma 1 (módulo 3) em forma de CONTAGEM.

## Por que o atalho 4 funciona
⚠ a correção é pequena e cirúrgica.
   "mudou pouco" é filtrável — e elimina quase tudo.
   ✓ mesmo raciocínio do filtro de commit pequeno (módulo 3).

## O cruzamento com o módulo 5
| Sinal | É sinal? |
|---|---|
| `if` a mais | ✓✓ SIM |
| constante nova | ✓ SIM |
| chamada nova a validação | ✓ SIM |
| endereço diferente | ⚠ ruído |
| instruções reordenadas | ⚠ ruído |
EOF

cat atalhos.md

echo
echo "═══ 5. o método completo, em passos ═══"
echo
cat <<'EXPL'
  ── DEPOIS DE RODAR OS CORRELATORS ──

  PASSO A: descartar as funções NÃO CASADAS
     ⚠ se aparece como "removida E adicionada", pode ser
       casamento ruim — e não mudança real.
     ✓ confira se a função existe nos dois lados.

  PASSO B: filtrar por MUDANÇA DE FLUXO
     · um `if` novo?
     · uma chamada nova?
     · uma constante nova?
     ⚠ se não tem nenhum dos três, provavelmente é ruído.

  PASSO C: olhar a CONTAGEM
     · função ficou maior? quanto?
     ⚠ +5 instruções é sinal. +200 é recompilação.

  PASSO D: cruzar com o ADVISORY
     · o CVE diz o componente? então leia só ele primeiro.

  PASSO E: ⚠ confirmar lendo os DOIS lados
     · o N-1 permite o que o N recusa?
     · ✓ se sim, você achou.

  ── e o registro ──
     · nome da função (ou endereço, se sem símbolo)
     · o trecho dos dois lados
     · ⚠ o invariante
     · e o PADRÃO (para o módulo 10)
EXPL
```

⚠ **O método é a aplicação do módulo 5, antes do módulo 5.** **E ele é o mesmo em qualquer
ferramenta:** **filtrar por mudança de fluxo, e confirmar lendo os dois lados.**

⚠ **E o passo E é o que separa "achei uma diferença" de "achei a correção".** **A confirmação é
comportamental:** **o N-1 permite o que o N corrige.** **Sem isso, é só uma diferença de código.**

**Produza `atalhos.md`:**

| # | Atalho | Fica com | Funcionou no seu caso? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |

**Responda:**

1. **Qual atalho é o mais eficiente?** Por quê?
2. **Quantas funções o seu diff mostrou?** Quantas sobraram?
3. **Como você confirma** que achou a correção?
4. **O que "removida e adicionada"** pode significar?

---

## 4.4 LAB — Diff de binário, do zero

**Duração:** 150 min

### Passo 1 — Prepare o par e abra no Ghidra (40 min)

```bash
cd ~/patch-lab/mod04

echo "═══ PREPARANDO O PAR PARA O GHIDRA ═══"
echo
cat <<'EXPL'
  ── 1. confirme que o par está verificado (módulo 2) ──
     ~/patch-lab/alvos/CVE-TREINO-0001/
       ├── N-1/binario
       ├── N/binario
       └── NOTAS.md

  ── 2. abra o Ghidra ──
     /opt/ghidra/ghidraRun
     (ou o caminho da sua instalação)

  ── 3. o fluxo ──
     File → New Project → Non-Shared Project
     File → Import File  →  os DOIS binários
     ⚠ aceite a análise automática (pode demorar)

  ── 4. Version Tracking ──
     Tools → Version Tracking → Create Session
       source      : N-1
       destination : N
     ⚠ rode TODOS os correlators
     ⚠ e itere: avalie, rode mais, reavalie
EXPL

echo
echo "═══ E SE VOCÊ PREFERIR LINHA DE COMANDO ═══"
echo
cat <<'EXPL'
  ── o Ghidra tem modo headless ──
     /opt/ghidra/support/analyzeHeadless <projeto> <nome> -import <binario>

  ── e o Ghidriff faz o diff por linha de comando ──
     ghidriff <binario-A> <binario-B> -o ./saida
     ✓ gera um relatório do que mudou
     ⚠ mas ENTENDA o processo antes de confiar

  ── e uma alternativa sem Ghidra: comparar o objdump ──
     ⚠ serve para o par de treino (poucas funções):
     objdump -d -M intel verso_antigo > A.asm
     objdump -d -M intel verso_novo   > B.asm
     diff A.asm B.asm
     ✓ e você VÊ o sinal e o ruído com os próprios olhos
EXPL

# demonstração com objdump — o método mínimo
cd ~/patch-lab/alvos/treino 2>/dev/null || {
    echo "  ⚠ o par de treino não existe — rode o módulo 2"
    cd ~/patch-lab/mod04
}

if [ -f verso_antigo ] && [ -f verso_novo ]; then
    echo
    echo "═══ O DIFF DE ASSEMBLY, SEM GHIDRA ═══"
    objdump -d -M intel verso_antigo > /tmp/A.asm 2>/dev/null
    objdump -d -M intel verso_novo   > /tmp/B.asm 2>/dev/null

    echo "  ── as funções presentes ──"
    grep -oE '^[0-9a-f]+ <[a-z_]+>:' /tmp/A.asm | sed 's/^/     A: /' | head -8
    echo "     ..."
    grep -oE '^[0-9a-f]+ <[a-z_]+>:' /tmp/B.asm | sed 's/^/     B: /' | head -8
    echo

    echo "  ── o diff das funções ──"
    diff <(grep -oE '<[a-z_]+>:' /tmp/A.asm) <(grep -oE '<[a-z_]+>:' /tmp/B.asm) | sed 's/^/     /' || echo "     (mesmas funções)"
    echo

    echo "  ── a função que mudou ──"
    for f in $(grep -oE '<[a-z_]+>:' /tmp/A.asm | tr -d '<>:'); do
        n_a=$(awk "/<$f>:/,/^$/" /tmp/A.asm | wc -l)
        n_b=$(awk "/<$f>:/,/^$/" /tmp/B.asm | wc -l)
        [ "$n_a" != "$n_b" ] && printf '     %-20s A=%s  B=%s  ⚠ MUDOU\n' "$f" "$n_a" "$n_b"
    done
    echo
    echo "  ⚠ a função com contagem diferente é o candidato."
    echo "     e você CONFIRMA lendo os dois trechos."
fi
```

⚠ **O `objdump` + `diff` é o método mínimo, e ele funciona para pares pequenos.** **É o que você
usa quando o Ghidra não está à mão** — **e é o que faz você entender o que o Ghidra automatiza.**

⚠ **E a comparação de **contagem de instruções por função** é o atalho 4 do §4.3, na prática.**
**A função com contagem diferente é o candidato.**

**Produza `objdump.md`:**

| Função | Linhas A | Linhas B | Mudou? |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantas funções mudaram** de contagem?
2. **Qual é o candidato?**
3. **Você confirmou** lendo os dois trechos?
4. **O que o Ghidra automatiza** que o `objdump` não faz?

### Passo 2 — Leia e confirme (60 min)

⚠ **Agora, a leitura de segurança — os três níveis, no binário.**

```bash
cd ~/patch-lab/mod04

echo "═══ LENDO O BINÁRIO ═══"
echo
echo "  ── o trecho que mudou, nos dois lados ──"
echo "     ⚠ procure no objdump a função candidata"
echo
echo "  ── e compare ──"
echo "     · um `cmp` novo?"
echo "     · um `jXX` novo?
echo "     · uma chamada nova?"
echo "     · uma constante nova (mov eax, 0x...)?"
echo

cat > caderno/PD-004.md <<'EOF'
# PD-004 — diff de binário

**Data:** ____

## 1. O par
| Item | Valor |
|---|---|
| Projeto | |
| CVE | |
| N-1 | |
| N | |
| Símbolos? | |

## 2. O processo
| Passo | Ferramenta | Resultado |
|---|---|---|
| análise | | |
| correlators | | |
| funções alteradas | | |

## 3. A função candidata
| Item | Valor |
|---|---|
| Nome / endereço | |
| Por que é ela (atalho usado) | |
| Tamanho N-1 / N | |

## 4. O trecho, nos dois lados
**N-1:**
```
[o descompilado/assembly]
```

**N:**
```
[o descompilado/assembly]
```

## 5. Os três níveis
| Nível | Resposta |
|---|---|
| 1 — o que mudou | |
| 2 — por que corrige | |
| 3 — invariante | |
| **PADRÃO** | |

## 6. A confirmação
| Item | Valor |
|---|---|
| O N-1 permite o que o N recusa? | |
| Como eu verifiquei | |
| ⚠ Alvo | o meu (par de treino) |

## 7. Sinal e ruído (antecipando o módulo 5)
| Sinal encontrado | É sinal? |
|---|---|
| | |
| | |

## 8. O que isso destrava
[a próxima pergunta]
EOF

echo "  ⚠ a ficha PD-004 criada"
head -15 caderno/PD-004.md

echo
echo "═══ CONFIRMANDO: o N-1 permite o que o N recusa? ═══"
echo
echo "  ── no par de treino, o teste é direto ──"
cd ~/patch-lab/alvos/treino 2>/dev/null || cd ~/patch-lab/mod04

if [ -f verso_antigo ] && [ -f verso_novo ]; then
    echo
    echo "     ── entrada normal ──"
    printf '     N-1: %s\n' "$(./verso_antigo 4 2>/dev/null)"
    printf '     N  : %s\n' "$(./verso_novo 4 2>/dev/null)"

    echo
    echo "     ── entrada que o patch deve recusar ──"
    # ⚠ um count acima de MAX_ITEMS
    printf '     N-1: %s  (⚠ processa)\n' "$(./verso_antigo "$(python3 -c 'import sys;sys.stdout.buffer.write(b"\xff\xff"*8)')" 2>&1 | head -1)"
    printf '     N  : %s  (✓ recusa)\n' "$(./verso_novo "$(python3 -c 'import sys;sys.stdout.buffer.write(b"\xff\xff"*8)')" 2>&1 | head -1)"

    echo
    echo "  ✓ a diferença de comportamento CONFIRMA a correção."
    echo "     ⚠ e é o que separa 'achei uma diferença' de 'achei a correção'."
    echo "     ⚠ tudo no SEU alvo. nenhum sistema de terceiro."
fi
```

⚠ **A confirmação comportamental é o passo que fecha.** **O N-1 processa o que o N recusa** —
**e isso prova que você achou a correção, e não uma diferença qualquer.**

⚠ **E o teste é no **seu** alvo.** **O par de treino, compilado por você** — **e nenhum sistema de
terceiro.** **É a regra do curso:** **diff de binário público, reprodução no seu.**

**Produza `confirmacao.md`:**

| Item | N-1 | N |
|---|---|---|
| Entrada normal | | |
| Entrada que deve recusar | | |
| Comportamento difere? | | |

**Responda:**

1. **O N-1 permite** o que o N recusa?
2. **Como você confirmou?**
3. **Em qual alvo você testou?** Confirme que é seu.
4. **O que isso prova** que a leitura sozinha não prova?

### Passo 3 — Registre e ligue (50 min)

⚠ **O registro e a ligação com o módulo 5.**

```bash
cd ~/patch-lab/mod04

echo "═══ REGISTRANDO ═══"
echo
cat > registro-diff.md <<'EOF'
# Registro do diff de binário

## Proveniência (módulo 2)
| Item | N-1 | N |
|---|---|---|
| URL | | |
| Data | | |
| SHA-256 | | |
| Símbolos | | |

## Ferramenta e processo
| Item | Valor |
|---|---|
| Ferramenta | |
| Correlators rodados | |
| Funções casadas | |
| Funções alteradas | |

## O achado
| Item | Valor |
|---|---|
| Função | |
| Atalho usado (módulo 4.3) | |
| Invariante | |
| Padrão (sem nomes) | |

## A evidência
```
[comando + saída, ou o descompilado dos dois lados]
```

## Sinal vs. ruído — classificação
| Diferença | Sinal ou ruído? | Por quê |
|---|---|---|
| | | |
| | | |

## O que isso destrava
| # | Pergunta | Prioridade |
|---|---|---|
| 1 | | |
| 2 | | |
EOF

cat registro-diff.md

echo
echo "═══ ANTECIPANDO O MÓDULO 5 ═══"
echo
cat <<'EXPL'
  ── das funções que o diff mostrou, classifique ──

     ✓ SINAL (mudança de segurança)
        · um `if` a mais
        · uma comparação alterada
        · uma chamada nova a validação
        · uma constante nova
        · ⚠ uma mudança de tipo

     ⚠ RUÍDO (mudança de build)
        · endereço diferente
        · registrador diferente
        · instruções reordenadas
        · inline / desinlined
        · strings movidas

  ── e a contagem ──
     funções que mudaram    : ___
     ⚠ que são SINAL          : ___
     ⚠ que são RUÍDO          : ___

  ✓ é essa proporção que o módulo 5 formaliza.
     e é o que separa um diff útil de horas perdidas.
EXPL
```

⚠ **A classificação antecipada é o exercício que prepara o módulo 5.** **A proporção medida** —
**quantas das N funções são sinal** — **é a razão de o módulo 5 existir.**

⚠ **E o registro com **hash** é o mesmo do módulo 2.** **É o que torna o diff reproduzível** —
**e é o que o módulo 8 do Pesquisa exige.**

**Produza `registro.md`:**

| Item | Valor |
|---|---|
| Funções que mudaram | |
| Que são sinal | |
| Que são ruído | |
| Invariante | |
| Padrão | |

**Responda:**

1. **Quantas funções mudaram?** Quantas são sinal?
2. **Qual a proporção?** O que isso indica?
3. **Qual atalho você usou** para achar a função?
4. **O que a ligação com o módulo 5** estabelece?

### Critérios de aceitação

- `checa-simbolos.sh` rodado, com o **estado de símbolos** identificado.
- Você explicou **o que muda** quando o binário tem símbolos.
- Você explicou **por que rodar vários correlators**.
- `seis-sinais.md` com os **seis** sinais e a aparência de cada.
- Você identificou **qual sinal é o mais direto** (a constante nova).
- `descompilado.md` com a comparação dos quatro sinais.
- Você explicou **o que o Ghidra faz e o que não faz**.
- `atalhos.md` com os **cinco** atalhos, em ordem de eficiência.
- Você explicou **por que o atalho do `if` a mais funciona**.
- O método em cinco passos, e você o aplicou.
- **Você achou a função candidata** com um atalho explícito.
- `objdump.md` com a comparação de **contagem por função**.
- `confirmacao.md` mostrando que **o N-1 permite o que o N recusa**.
- Você confirmou que testou **no seu alvo** — não em terceiro.
- `caderno/PD-004.md` preenchida com o diff.
- Você escreveu o **padrão sem nomes**.
- `registro.md` com a **proporção sinal/ruído**.
- ⚠ **Nenhum alvo de terceiro.** Diff de binário público ou compilado por você.

---

## Avaliação

1. **O que o Ghidra acha, e o que ele não acha?**
2. **Por que fazer manual antes de automatizar?**
3. **Cite os sete passos do fluxo no Ghidra.**
4. **Por que rodar vários correlators?**
5. **Cite os cinco correlators** e o que cada um casa.
6. **O que muda quando o binário tem símbolos?**
7. **O que o fornecedor publica** que ajuda?
8. **Cite os seis sinais no descompilado.**
9. **Qual é o mais direto?** Por quê?
10. **Uma chamada nova indica o quê?**
11. **O que o Ghidra faz com o assembly**, e o que ele não faz?
12. **Cite cinco elementos do descompilado** e o equivalente em assembly.
13. **Por que nomes como `uVar1` não impedem** a análise?
14. **Cite os cinco atalhos** para achar a função, em ordem.
15. **Por que o atalho do `if` a mais é o mais eficiente?**
16. **Por que o atalho do tamanho funciona?**
17. **O que "removida e adicionada"** pode significar?
18. **Como você confirma** que achou a correção?
19. **Por que a confirmação é comportamental?**
20. **Qual a proporção esperada** de sinal e ruído num diff?

---

**Próximo:** [Módulo 5 — Sinal e ruído](modulo-05.md)
