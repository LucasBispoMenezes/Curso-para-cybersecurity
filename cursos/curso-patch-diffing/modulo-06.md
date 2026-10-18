# Módulo 6 — As Ferramentas

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Conhecer as **quatro ferramentas** e o que cada uma resolve.
2. Usar `BinDiff`, `Ghidriff` e `DiffRays` — com **julgamento**, não como caixa-preta.
3. Automatizar o **passo mecânico** sem perder o entendimento.
4. Reconhecer quando a **ferramenta mente** — e o que fazer.
5. Montar o **pipeline** que você usa no dia a dia.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **A ferramenta resolve o passo MECÂNICO — importar, analisar, casar funções, listar diferenças.**
> **Ela não resolve o passo de JULGAMENTO** — e é o julgamento que o módulo 5 treinou.

⚠ **E a tentação é o inverso:** **ver a lista de 400 funções que a ferramenta deu e achar que o
trabalho acabou.** **Acabou o trabalho mecânico; começa o seu.**

⚠ **A tese:**

> **Ferramenta sem critério produz lista.** **Critério sem ferramenta produz lentidão.**
> **Você precisa dos dois — e na ordem certa.**

⚠ **E a ordem é a do curso:** **manual primeiro (módulos 3–5), ferramenta depois.** **Quem inverte
não sabe julgar a saída.**

---

## 6.1 As quatro ferramentas

| Ferramenta | O que ela faz | O que ela **não** faz | Quando usar |
|---|---|---|---|
| **Ghidra + Version Tracking** | analisa, casa, mostra lado a lado | ⚠ julgar o que importa | **Base de tudo** |
| **BinDiff** | diff estrutural, pontua similaridade | ⚠ explicar a diferença | Windows, volume |
| **Ghidriff** | Ghidra automatizado, por CLI | ⚠ separar sinal de ruído | ⚠ **Lotes** |
| **DiffRays** | baixa o par **e** diffa, por CVE | ⚠ interpretar | ⚠ **Só tem o CVE** |
| **Diaphora** | diff no IDA | ⚠ idem | Quem tem IDA |

⚠ **A coluna "não faz" é a que importa.** **Todas as quatro param no mesmo ponto:** **elas dão a
lista.** **Quais das N importam é o módulo 5, e é seu.**

⚠ **A tabela do que cada uma economiza:**

| Ferramenta | Economiza | Custo |
|---|---|---|
| Ghidra | ⚠ **A descompilação** | Horas de instalação/aprendizado |
| BinDiff | O casamento de funções | Licença/instalação |
| Ghidriff | Os cliques no Ghidra | Menos controle |
| DiffRays | ⚠ **O download e a coleta** | ⚠ **Menos contexto** |

⚠ **A linha do `DiffRays` merece a nota.** **Ele economiza o passo mais chato** — **achar e baixar
os dois binários certos** — **e é confiável justamente porque usa os **oficiais**.** **Mas ele
também tira o contexto:** **você não viu de onde veio, nem conferiu a proveniência.** **Confira
depois.**

⚠ **E o `Ghidriff` resolve o volume.** **Diffar 20 CVEs à mão é inviável; por CLI, não.** **Mas
cada saída ainda exige o julgamento** — **e em lote, o risco de aceitar ruído como sinal é maior.**

```bash
mkdir -p ~/patch-lab/mod06 && cd ~/patch-lab/mod06

echo "═══ 1. as quatro ferramentas ═══"
echo
cat > ferramentas.md <<'EOF'
# As quatro ferramentas

| Ferramenta | Faz | NÃO faz | Quando |
|---|---|---|---|
| **Ghidra VT** | analisa, casa, mostra | julgar | base de tudo |
| **BinDiff** | diff estrutural | explicar | Windows, volume |
| **Ghidriff** | Ghidra por CLI | separar sinal | lotes |
| **DiffRays** | baixa o par | interpretar | só tem o CVE |
| **Diaphora** | diff no IDA | julgar | quem tem IDA |

## O que cada uma economiza
| Ferramenta | Economiza | Custo |
|---|---|---|
| Ghidra | a descompilação | instalação/aprendizado |
| BinDiff | o casamento | licença |
| Ghidriff | os cliques | menos controle |
| DiffRays | ⚠ o download | ⚠ menos contexto |

## ⚠ TODAS param no mesmo ponto
elas dão a LISTA.
quais das N importam é o módulo 5 — e é SEU.
EOF

cat ferramentas.md
```

**Produza `ferramentas.md`:**

| Ferramenta | Faz | Não faz | Quando usar |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Onde todas as ferramentas param?** Por quê?
2. **O que o `DiffRays` economiza?** E o que ele tira?
3. **Por que `Ghidriff` é útil** mas exige cuidado?
4. **Qual a ordem certa:** manual antes ou depois? Por quê?

---

## 6.2 `BinDiff` e `Ghidriff`

⚠ **As duas ferramentas de volume. E as duas têm o mesmo limite.**

### BinDiff

⚠ **O `BinDiff` pontua a similaridade de cada par de funções** — **e é isso que ele dá: um número.**

| Coluna | O que diz |
|---|---|
| **Similarity** | 1.0 = idêntica |
| **Confidence** | ⚠ Confiança do **casamento** |
| Basic blocks | Quantos blocos |
| Instructions | ⚠ **Mudança aqui é sinal** |

⚠ **A leitura crítica:** **similaridade alta com mudança de contagem de instruções** é
**exatamente o candidato** — **a função quase igual, com algo acrescentado.** **É a forma 1 do
módulo 3, em forma de número.**

⚠ **E a coluna `Confidence` é a que você confere.** **Se o casamento tem confiança baixa, o diff
dele é falso** — **e você está comparando funções diferentes.** **É o "avaliar" do módulo 4, §4.1.**

### Ghidriff

⚠ **O `Ghidriff` é o Ghidra por linha de comando.** **Ele faz o diff e gera um relatório** — **e é
o que torna o volume possível.**

```bash
ghidriff binario-A binario-B -o ./saida
```

⚠ **O relatório dele tem as funções que mudaram** — **e a mesma lista de 400.** **Ele economiza os
cliques, não o julgamento.**

⚠ **A tabela do que fazer com o relatório:**

| Etapa | Ferramenta | Você |
|---|---|---|
| 1 | Ghidriff gera | — |
| 2 | — | ⚠ **Filtrar por branch/constante** (módulo 5) |
| 3 | — | ⚠ **Ler os candidatos** |
| 4 | — | ⚠ **Confirmar comportamento** |

⚠ **As etapas 2 a 4 são suas.** **A ferramenta fez a 1.**

⚠ **E o risco do lote:** **quando você diffa 20 CVEs, a tentação é aceitar o topo da lista como
resposta.** **E o topo pode ser ruído de build** — **porque a pontuação do `BinDiff` mede
similaridade, não significância de segurança.**

⚠ **A regra escrita:**

> **A ferramenta ordena por SIMILARIDADE.** **Você reordena por MUDANÇA DE FLUXO.** **As duas
> ordens são diferentes** — e é a segunda que importa.

```bash
cd ~/patch-lab/mod06

echo "═══ 2. BinDiff e Ghidriff ═══"
echo
cat <<'EXPL'
  ── BINDIFF — as colunas que importam ──
     ┌─────────────┬──────────────────────────────────────────────┐
     │ Similarity  │ 1.0 = idêntica                               │
     │ Confidence  │ ⚠ confiança do CASAMENTO (baixa = diff falso) │
     │ Basic blocks│ quantidade                                   │
     │ Instructions│ ⚠ MUDANÇA aqui é SINAL                        │
     └─────────────┴──────────────────────────────────────────────┘

     ⚠ O CANDIDATO:
        similaridade ALTA  +  contagem de instruções DIFERENTE
        = a função quase igual, COM algo acrescentado
        ✓ é a forma 1 (módulo 3) em forma de número

  ── GHIDRIFF — o Ghidra por CLI ──
     ghidriff binario-A binario-B -o ./saida
     ✓ gera o relatório das funções que mudaram
     ⚠ e a MESMA lista de 400
     ✓ economiza os cliques, não o julgamento

  ── ⚠ O RISCO DO LOTE ──
     diffar 20 CVEs → a tentação de aceitar o TOPO da lista
     ⚠ e o topo pode ser ruído de build
        porque a pontuação mede SIMILARIDADE, não significância

  ✓ REGRA: a ferramenta ordena por similaridade.
     você reordena por MUDANÇA DE FLUXO.
     ⚠ as duas ordens são diferentes.
EXPL

echo
echo "═══ 3. instalando (se você quiser) ═══"
echo
cat > instala-ferramentas.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "═══ FERRAMENTAS DE DIFF ═══"
echo

echo "── 1. Ghidra (base) ──"
if command -v ghidra >/dev/null 2>&1 || ls -d /opt/ghidra* 2>/dev/null >/dev/null; then
    echo "  ✓ presente"
else
    cat <<'EXPL'
  ⚠ instale:
     1. sudo apt install -y openjdk-17-jdk
     2. baixe o Ghidra de https://ghidra-sre.org/
     3. descompacte em /opt/ghidra
     4. /opt/ghidra/ghidraRun
EXPL
fi
echo

echo "── 2. Ghidriff ──"
cat <<'EXPL'
  pip3 install ghidriff
  ⚠ requer o Ghidra instalado e configurado
EXPL
echo

echo "── 3. DiffRays ──"
cat <<'EXPL'
  git clone https://github.com/pwnfuzz/diffrays
  cd diffrays && pip3 install -r requirements.txt
  ⚠ o modo AutoDiff baixa os binários por CVE
EXPL
echo

echo "── 4. BinDiff ──"
cat <<'EXPL'
  ⚠ precisa de IDA ou do plugin do Ghidra
  · https://github.com/google/bindiff
  alternativas livres: Diaphora (IDA), ghidriff (Ghidra)
EXPL
echo

echo "── 5. ALTERNATIVAS SEM INSTALAR NADA ──"
cat <<'EXPL'
  ⚠ e você pode fazer MUITO com o que já tem:

     · objdump + diff        → o método do módulo 4
     · a triagem.py          → ordena por mudança de fluxo
     · o Ghidra headless     → análise em lote

  ✓ não ter BinDiff não impede o trabalho.
     o critério do módulo 5 é o que importa.
EXPL
SCRIPT

chmod +x instala-ferramentas.sh
bash instala-ferramentas.sh 2>&1 | head -35
```

⚠ **A seção final é a mais útil na prática.** **Não ter `BinDiff` não impede nada.** **O `objdump`
+ `diff` + a triagem do módulo 5 fazem o trabalho** — **e ensinam mais.**

⚠ **E a regra da ordenação é o que o módulo entrega:** **a ferramenta ordena por similaridade;
você reordena por mudança de fluxo.** **É a diferença entre "a função mudou mais" e "a função mudou
de FORMA que importa".**

**Produza `bindiff.md`:**

| Coluna | O que diz | Como usar |
|---|---|---|
| Similarity | | |
| Confidence | | |
| Instructions | | |

**Responda:**

1. **Qual combinação de colunas indica o candidato?** Por quê?
2. **O que `Confidence` baixa significa?** O que fazer?
3. **O que a ferramenta ordena?** O que você ordena?
4. **O que fazer sem `BinDiff` instalado?**

---

## 6.3 `DiffRays` — o `AutoDiff`

⚠ **A ferramenta que resolve o passo mais chato: achar e baixar o par.**

```
DiffRays AutoDiff
        │
        ├── 1. você dá o CVE
        ├── 2. ele identifica o componente afetado
        ├── 3. ele baixa os DOIS binários OFICIAIS   ← ⚠ o passo chato
        ├── 4. ele roda o diff
        └── 5. ele gera o banco de resultados
```

⚠ **O passo 3 é o que ele economiza — e é o mais tedioso.** **Achar a versão N-1 exata, do
fornecedor certo, e baixar.** **É o módulo 2 inteiro, automatizado.**

⚠ **E a razão de ser confiável:** **ele baixa os binários **oficiais**, do mesmo pipeline.** **Não
recompila** — **e é por isso que a proveniência dele é boa por construção.**

⚠ **Mas o que ele **não** dá:**

| O que o AutoDiff não dá | Por quê |
|---|---|
| ⚠ A proveniência verificada | Ele não te mostra o que baixou |
| ⚠ Os símbolos | Talvez não os baixe |
| ⚠ O julgamento | Ele dá a lista |
| ⚠ A confirmação comportamental | Você faz |

⚠ **A tabela do que conferir depois de usar:**

| # | Conferir | Por quê |
|---|---|---|
| 1 | **O que ele baixou** | Você precisa saber |
| 2 | **A proveniência** | O módulo 2 |
| 3 | **Se há símbolos melhores** | Muda a dificuldade |
| 4 | ⚠ **A lista ordenada pelo seu critério** | Não pela dele |

⚠ **A regra escrita:**

> **O `AutoDiff` resolve a COLETA. O julgamento continua sendo o módulo 5.** **E você confere o que
> ele baixou** — **porque um par mal escolhido automaticamente ainda é um par mal escolhido.**

```bash
cd ~/patch-lab/mod06

echo "═══ 4. o AutoDiff, e o que conferir ═══"
echo
cat > autodiff.md <<'EOF'
# DiffRays AutoDiff

## O que ele automatiza
| Passo | Automatizado? |
|---|---|
| 1. você dá o CVE | ✓ seu |
| 2. identifica o componente | ✓ dele |
| 3. baixa os DOIS binários OFICIAIS | ⚠✓ O PASSO CHATO |
| 4. roda o diff | ✓ dele |
| 5. gera o resultado | ✓ dele |

## Por que é confiável
⚠ baixa os binários OFICIAIS do mesmo pipeline.
   NÃO recompila.
   ✓ a proveniência é boa por construção.

## ⚠ O que ele NÃO dá
| Item | Por quê |
|---|---|
| proveniência verificada | não te mostra o que baixou |
| símbolos melhores | talvez não baixe |
| julgamento | dá a LISTA |
| confirmação comportamental | você faz |

## ⚠ O que conferir depois
| # | Conferir | Como |
|---|---|---|
| 1 | o que ele baixou | ls / file / readelf |
| 2 | a proveniência | o módulo 2 |
| 3 | símbolos melhores | procurar o pacote -dbg |
| 4 | reordenar por FLUXO | a triagem (módulo 5) |
EOF

cat autodiff.md

echo
echo "═══ 5. o pipeline que você vai usar ═══"
echo
cat <<'EXPL'
  ┌────────────────────────────────────────────────────────────────┐
  │ 1. COLETA                                                      │
  │    · você acha o par           → módulo 2                     │
  │    · ou o DiffRays AutoDiff    → automático                   │
  │    ✓ e CONFERE o que veio                                      │
  ├────────────────────────────────────────────────────────────────┤
  │ 2. PROVENIÊNCIA                                                │
  │    · os quatro testes          → módulo 2                     │
  │    ⚠ se falhar, MUDE DE PAR                                     │
  ├────────────────────────────────────────────────────────────────┤
  │ 3. DIFF                                                        │
  │    · Ghidra VT / Ghidriff / BinDiff                            │
  │    ✓ e você ITERA os correlators                               │
  ├────────────────────────────────────────────────────────────────┤
  │ 4. TRIAGEM            ⚠ O TRABALHO                              │
  │    · por tamanho, branch, constante → módulo 5                │
  │    · ⚠ ordem por MUDANÇA DE FLUXO, não por similaridade        │
  ├────────────────────────────────────────────────────────────────┤
  │ 5. LEITURA                                                     │
  │    · os três níveis            → módulo 3                     │
  │    · ⚠ e o PADRÃO, sem nomes                                    │
  ├────────────────────────────────────────────────────────────────┤
  │ 6. CONFIRMAÇÃO                                                 │
  │    · comportamental, no SEU alvo → módulo 4                   │
  ├────────────────────────────────────────────────────────────────┤
  │ 7. VARIANTE                                                    │
  │    · o irmão                   → módulo 10                    │
  └────────────────────────────────────────────────────────────────┘

  ⚠ os passos 4, 5, 6 e 7 são seus. as ferramentas fazem 1 e 3.
EXPL
```

⚠ **O pipeline é o entregável do módulo.** **E ele mostra a proporção:** **a ferramenta faz 2 dos 7
passos.** **Os outros 5 são julgamento.**

⚠ **E a nota do passo 4 é a mais importante:** **a ordem por mudança de fluxo, não por
similaridade.** **É o que o módulo 5 estabeleceu, e é onde as ferramentas não chegam.**

**Produza `autodiff.md`:**

| O que o AutoDiff faz | O que conferir depois |
|---|---|
| | |
| | |

**Responda:**

1. **Qual passo ele automatiza?** Por que é o mais chato?
2. **Por que ele é confiável?**
3. **O que conferir depois?** Cite quatro.
4. **Quantos passos do pipeline são seus?** Quantos são da ferramenta?

---

## 6.4 Quando a ferramenta mente

⚠ **Três formas de a ferramenta produzir resultado errado. E as três dão o mesmo sintoma: você
persegue a função errada.**

| # | Erro | Sintoma | Como detectar |
|---|---|---|---|
| 1 | **Casamento errado** | ⚠ Diff de funções diferentes | `Confidence` baixa |
| 2 | **Função não casada** | Aparece como "removida + adicionada" | ⚠ **Ela existe nos dois lados** |
| 3 | **Ruído ordenado primeiro** | ⚠ A lista começa com build | Contagem de instruções |

⚠ **O erro 2 é o mais confuso.** **A ferramenta diz "função removida na N e adicionada"** — **e
você conclui "o patch removeu a validação".** **Mas a função existe nos dois lados** — **só não
casou.** **É o "avaliar" do módulo 4 que evita isso.**

⚠ **E o erro 3 é o que o módulo 5 corrige.** **A ferramenta ordena por similaridade, e a função mais
"similar-diferente" costuma ser** — **um ruído de build.** **Você reordena por mudança de fluxo.**

⚠ **A tabela de detecção, por sintoma:**

| Você vê | Significa | Verificação |
|---|---|---|
| Função "removida e adicionada" | ⚠ Pode não ter sido removida | Ela existe nos dois lados? |
| Confiança baixa | Casamento suspeito | Compare o propósito |
| Topo da lista é função grande | ⚠ Provavelmente ruído | Contagem de instruções |
| Muitas funções com `Similarity` 1.0 | ✓ Bom sinal | Elas não mudaram |

⚠ **A linha do "função grande no topo" é a mais prática.** **Uma função de 500 linhas que "mudou"
é quase sempre ruído** — **porque builds diferentes alteram funções grandes de forma difusa.**
**A função do patch é pequena e médica.**

⚠ **A regra escrita:**

> **Desconfie do topo da lista.** **A função do patch é pequena, cirúrgica, e frequentemente está
> no meio.** **O topo é o que mudou mais — e "mais" quase sempre significa ruído.**

```bash
cd ~/patch-lab/mod06

echo "═══ 6. os três erros, e a detecção ═══"
echo
cat > quando-mente.md <<'EOF'
# Quando a ferramenta mente

## Erro 1 — CASAMENTO ERRADO
| Item | Valor |
|---|---|
| Sintoma | diff de funções diferentes |
| Detecção | `Confidence` baixa |
| Ação | ⚠ descartar o par, ou recasar à mão |

## Erro 2 — FUNÇÃO NÃO CASADA
| Item | Valor |
|---|---|
| Sintoma | "removida + adicionada" |
| ⚠ Risco | você conclui "o patch removeu a validação" |
| Detecção | **ela existe NOS DOIS lados?** |
| Ação | casar de novo, com mais correlators |

## Erro 3 — RUÍDO ORDENADO PRIMEIRO
| Item | Valor |
|---|---|
| Sintoma | o topo da lista é função GRANDE |
| Detecção | contagem de instruções |
| Ação | ⚠ **reordenar por MUDANÇA DE FLUXO** (módulo 5) |

## A tabela de detecção
| Você vê | Significa | Verificação |
|---|---|---|
| removida + adicionada | ⚠ pode não ter sido | existe nos dois lados? |
| Confiança baixa | casamento suspeito | compare o propósito |
| topo = função grande | ⚠ ruído | contagem de instruções |
| Similarity 1.0 em muitas | ✓ bom | não mudaram |

## ⚠ A REGRA
desconfie do TOPO da lista.
a função do patch é pequena, cirúrgica, e frequentemente no MEIO.
o topo é o que mudou MAIS — e "mais" quase sempre é ruído.
EOF

cat quando-mente.md

echo
echo "═══ 7. o teste: a sua ferramenta mente? ═══"
echo
cat <<'EXPL'
  ── como descobrir, com o par de treino ──
     você SABE qual é a função do patch (é o `parse_item`).
     ⚠ então:

     1. rodou o diff (ferramenta ou objdump)
     2. a função do patch ficou no TOPO?
        · SIM  → ✓ a ferramenta acertou a ordem
        · NÃO  → ⚠ e é normal: ela ordena por similaridade
     3. ⚠ e aí você reordena pelo critério do módulo 5

  ✓ é por isso que o par de treino vale: você CONHECE a resposta,
     e pode medir se a ferramenta acerta.
EXPL

cd ~/patch-lab/alvos/treino 2>/dev/null && {
    echo
    echo "  ── medindo, no par de treino ──"
    objdump -d -M intel verso_antigo > /tmp/CA.asm 2>/dev/null
    objdump -d -M intel verso_novo   > /tmp/CB.asm 2>/dev/null
    echo
    echo "     ── por SIMILARIDADE (o que a ferramenta dá) ──"
    diff <(grep -cE '^\s+[0-9a-f]+:' /tmp/CA.asm) <(grep -cE '^\s+[0-9a-f]+:' /tmp/CB.asm) >/dev/null
    python3 ~/patch-lab/mod05/triagem.py /tmp/CA.asm /tmp/CB.asm 2>/dev/null | head -12

    echo
    echo "     ⚠ e a função do patch (`parse_item`) ficou no topo?"
    echo "        ✓ se sim, a ordenação por fluxo acertou"
    echo "        · se não, você reordena — e é o seu trabalho"
}
```

⚠ **A medição no par de treino é o instrumento.** **Você **conhece** a resposta** — **então pode
medir se a ferramenta acerta a ordem.** **E se ela não acertar, você sabe que a reordenação é
obrigatória.**

⚠ **É o mesmo princípio do módulo 5 do curso de Criptografia:** **você quebra a sua própria chave
para entender o mecanismo.** **Aqui, você diffa o seu próprio par para entender a ferramenta.**

**Produza `detecta-erro.md`:**

| Erro | Sintoma | Como detectar |
|---|---|---|
| Casamento errado | | |
| Função não casada | | |
| Ruído no topo | | |

**Responda:**

1. **Qual erro é o mais confuso?** Por quê?
2. **O que "removida e adicionada"** pode significar?
3. **Como você detecta ruído no topo?**
4. **A ferramenta acertou a ordem** no par de treino?

---

## 6.5 LAB — Pipeline completo com ferramenta

**Duração:** 120 min

### Passo 1 — Monte o pipeline (40 min)

```bash
cd ~/patch-lab/mod06

echo "═══ MONTANDO O PIPELINE ═══"
echo
cat > pipeline.sh <<'SCRIPT'
#!/usr/bin/env bash
# pipeline.sh — o fluxo completo, do CVE ao candidato
set -uo pipefail

A="${1:?uso: pipeline.sh <binario-N-1> <binario-N>}"
B="${2:?informe o binário N}"

echo "═══════════ PIPELINE DE PATCH DIFFING ═══════════"
echo

# ─── PASSO 1: existência ───
echo "── 1. COLETA ──"
for f in "$A" "$B"; do
    [ -f "$f" ] || { echo "  ⚠ ${f} não existe"; exit 2; }
    printf '  %-40s %s bytes\n' "$(basename "$f")" "$(stat -c %s "$f")"
done
echo

# ─── PASSO 2: proveniência ───
echo "── 2. PROVENIÊNCIA (módulo 2) ──"
ma=$(readelf -hW "$A" 2>/dev/null | grep Machine | sed 's/.*: *//')
mb=$(readelf -hW "$B" 2>/dev/null | grep Machine | sed 's/.*: *//')
[ "$ma" = "$mb" ] && echo "  ✓ arquitetura igual" || echo "  ⚠⚠ ARQUITETURA DIFERE — pare"

cca=$(strings "$A" 2>/dev/null | grep -oE 'GCC: \([^)]*\) [0-9.]+' | head -1)
ccb=$(strings "$B" 2>/dev/null | grep -oE 'GCC: \([^)]*\) [0-9.]+' | head -1)
if [ -n "$cca" ] && [ "$cca" = "$ccb" ]; then
    echo "  ✓ mesmo compilador"
else
    echo "  ·  compilador: ${cca:-?} vs ${ccb:-?}  (⚠ verificar)"
fi

sa=$(nm -D "$A" 2>/dev/null | wc -l); sb=$(nm -D "$B" 2>/dev/null | wc -l)
printf '  símbolos: %s vs %s\n' "$sa" "$sb"
echo

# ─── PASSO 3: dump ───
echo "── 3. DUMP ──"
objdump -d -M intel "$A" > /tmp/pipe_A.asm 2>/dev/null
objdump -d -M intel "$B" > /tmp/pipe_B.asm 2>/dev/null
printf '  A: %s linhas\n  B: %s linhas\n' "$(wc -l < /tmp/pipe_A.asm)" "$(wc -l < /tmp/pipe_B.asm)"
echo

# ─── PASSO 4: triagem ───
echo "── 4. TRIAGEM (módulo 5) ──"
if [ -f ~/patch-lab/mod05/triagem.py ]; then
    python3 ~/patch-lab/mod05/triagem.py /tmp/pipe_A.asm /tmp/pipe_B.asm 2>/dev/null | head -25
else
    echo "  ⚠ a triagem.py não existe — rode o módulo 5"
    echo
    echo "  ── triagem mínima, por contagem ──"
    for f in $(grep -oE '<[A-Za-z_][\w.]*>:?' /tmp/pipe_A.asm | tr -d '<>:?' | sort -u); do
        na=$(awk "/<$f>:/,/^$/" /tmp/pipe_A.asm 2>/dev/null | wc -l)
        nb=$(awk "/<$f>:/,/^$/" /tmp/pipe_B.asm 2>/dev/null | wc -l)
        [ "$na" != "$nb" ] && printf '  ⚠ %-28s %s → %s\n' "$f" "$na" "$nb"
    done
fi
echo

# ─── PASSO 5: os próximos passos ───
echo "── 5. O QUE FALTA (e é seu) ──"
cat <<'EXPL'
  · LER os candidatos do topo (módulo 3, três níveis)
  · ⚠ CONFIRMAR por comportamento (módulo 4)
  · abreviar o PADRÃO, sem nomes
  · procurar o IRMÃO (módulo 10)
EXPL
SCRIPT

chmod +x pipeline.sh

cd ~/patch-lab/alvos/treino 2>/dev/null && {
    echo
    bash ~/patch-lab/mod06/pipeline.sh verso_antigo verso_novo 2>&1 | head -45
} || echo "  ⚠ rode o módulo 2"
```

Produza `pipeline-rodado.md`:

| Passo | Resultado |
|---|---|
| Coleta | |
| Proveniência | |
| Dump | |
| Triagem | |
| Próximo | |

**Responda:**

1. **O pipeline rodou de ponta a ponta?**
2. **A proveniência passou** nos testes?
3. **Quantos candidatos** a triagem deu?
4. **Quais passos restam** — e são seus?

### Passo 2 — Compare as ferramentas (45 min)

⚠ **Compare o resultado do pipeline com o que uma ferramenta automatizada daria.**

```bash
cd ~/patch-lab/mod06

echo "═══ COMPARANDO ABORDAGENS ═══"
echo
cat <<'EXPL'
  ── você tem três formas de chegar ao candidato ──

     A) OBJDUMP + triagem.py       (sem instalar nada)
     B) GHIDRA + Version Tracking  (manual, com descompilado)
     C) GHIDRIFF / BINDIFF         (automatizado)

  ⚠ e a pergunta: as três chegam ao MESMO candidato?

  ── o teste ──
     1. rode A (você já fez)
     2. rode B ou C, se tiver
     3. ⚠ compare o TOPO das listas
     4. e responda:
        · as listas coincidem?
        · se não, qual acertou?

  ✓ no par de treino, você SABE a resposta (`parse_item`).
     então pode medir qual abordagem acerta.
EXPL

cat > compara.md <<'EOF'
# Comparação de abordagens

## A — objdump + triagem.py
| Item | Valor |
|---|---|
| Instalação necessária | nenhuma |
| Candidato no topo | |
| Acertou? | |

## B — Ghidra manual
| Item | Valor |
|---|---|
| Instalação necessária | Ghidra + Java |
| Candidato no topo | |
| Acertou? | |
| ⚠ Vantagem | o DESCOMPILADO é legível |
| ⚠ Custo | horas de cliques |

## C — Ghidriff / BinDiff
| Item | Valor |
|---|---|
| Instalação necessária | Ghidra + pip |
| Candidato no topo | |
| Acertou? | |
| ⚠ Vantagem | volume |
| ⚠ Risco | aceitar o topo sem julgar |

## O veredito
| Abordagem | Velocidade | Precisão | Ensinamento |
|---|---|---|---|
| A | | | |
| B | | | |
| C | | | |

## Qual eu vou usar
| Situação | Abordagem |
|---|---|
| par pequeno, aprendizado | |
| par real, com símbolos | |
| muitos CVEs | |
| sem instalar nada | |
EOF

cat compara.md

echo
echo "═══ E A LIÇÃO ═══"
cat <<'EXPL'
  ⚠ as três ferramentas chegam ao mesmo lugar — SE você aplicar o critério.
     sem o critério:
        A → lê 400 e desiste
        B → clica por horas e não conclui
        C → aceita o topo, que pode ser ruído

  ✓ o critério do módulo 5 é o que faz as três funcionarem.
  ⚠ a ferramenta não substitui o critério — ela acelera depois dele.
EXPL
```

⚠ **A comparação é o exercício.** **E a lição final é a do módulo inteiro:** **as três chegam ao
mesmo lugar **se você aplicar o critério**. Sem ele, as três falham** — **de formas diferentes.**

⚠ **E note que a abordagem A (sem instalar nada) é perfeitamente viável.** **É a razão de o curso
ter feito os módulos 3–5 antes deste.**

**Produza `comparacao.md`:**

| Abordagem | Velocidade | Precisão | Quando usar |
|---|---|---|---|
| A — `objdump` | | | |
| B — Ghidra manual | | | |
| C — automatizado | | | |

**Responda:**

1. **As três chegaram ao mesmo candidato?**
2. **Qual foi a mais rápida?** E a mais precisa?
3. **O que falha sem o critério?** Cite as três.
4. **Qual você vai usar no dia a dia?**

### Passo 3 — O relatório (35 min)

Produza `relatorio-ferramentas.md`:

```markdown
# Ferramentas — relatório

## 1. O que eu testei
| Abordagem | Instalada? | Rodou? |
|---|---|---|
| objdump + triagem | ✓ (nativo) | |
| Ghidra manual | | |
| Ghidriff | | |
| DiffRays | | |

## 2. O pipeline completo
| # | Passo | Ferramenta | Resultado |
|---|---|---|---|
| 1 | coleta | | |
| 2 | proveniência | | |
| 3 | diff | | |
| 4 | triagem | | |
| 5 | leitura | | |
| 6 | confirmação | | |
| 7 | variante | | |

## 3. Os três erros de ferramenta
| # | Erro | Aconteceu? | Como detectei |
|---|---|---|---|
| 1 | casamento errado | | |
| 2 | função não casada | | |
| 3 | ruído no topo | | |

## 4. Diferença de similaridade vs. fluxo
| Ordem | Topo da lista | É o patch? |
|---|---|---|
| por similaridade | | |
| por mudança de fluxo | | |

## 5. O candidato
| Item | Valor |
|---|---|
| Função | |
| Invariante | |
| **PADRÃO (sem nomes)** | |

## 6. O que NÃO foi verificado
⚠ mínimo 3:
-
-
-

## 7. O que isso destrava
| # | Pergunta | Prioridade |
|---|---|---|
```

**Responda:**

1. **Quantas abordagens você testou?**
2. **A ordem por fluxo acertou** onde a por similaridade não?
3. **Qual erro de ferramenta apareceu?**
4. **Quantos passos do pipeline são seus?** Quantos são da ferramenta?

### Critérios de aceitação

- `ferramentas.md` com as **quatro** ferramentas e a coluna "não faz".
- Você explicou **onde todas param**.
- Você explicou **o que o `DiffRays` tira** além do que dá.
- Você explicou **por que manual antes de automatizado**.
- `bindiff.md` com as **três** colunas e o candidato que elas indicam.
- Você explicou **o que `Confidence` baixa significa**.
- Você explicou **por que a ferramenta ordena por similaridade** e você por fluxo.
- `autodiff.md` com os **quatro** itens a conferir depois.
- Você explicou **por que o `AutoDiff` é confiável**.
- `detecta-erro.md` com os **três** erros e a detecção de cada.
- Você explicou **o que "removida e adicionada"** pode significar.
- `pipeline.sh` rodando de ponta a ponta.
- `comparacao.md` com as **três** abordagens comparadas.
- Você explicou **o que falha sem o critério** — nas três abordagens.
- `relatorio-ferramentas.md` com as **sete** seções.
- Você escreveu o **padrão sem nomes**.
- Você citou **três itens** do que não verificou.
- ⚠ **Nenhum alvo de terceiro.**

---

## Avaliação

1. **Onde todas as ferramentas param?** Por que?
2. **Cite as quatro ferramentas** e o que cada uma economiza.
3. **O que o `DiffRays` economiza?** E o que ele tira?
4. **Por que o `DiffRays` é confiável** por construção?
5. **O que conferir depois de usar o `AutoDiff`?** Cite quatro.
6. **Qual combinação do BinDiff indica o candidato?** Por quê?
7. **O que `Confidence` baixa significa?**
8. **O que a ferramenta ordena?** O que você ordena?
9. **Por que o risco do lote é maior?**
10. **Cite os três erros de ferramenta.**
11. **Qual é o mais confuso?** Por quê?
12. **O que "removida e adicionada"** pode significar?
13. **Como detectar ruído no topo?**
14. **Por que desconfiar do topo da lista?**
15. **Cite os sete passos do pipeline.**
16. **Quantos são da ferramenta?** Quantos são seus?
17. **O que a comparação das três abordagens mostrou?**
18. **O que falha sem o critério?** Cite as três formas.
19. **Por que a abordagem sem instalar nada é viável?**
20. **O que você vai usar no dia a dia?**

---

**Próximo:** [Módulo 7 — Localizar o código do patch](modulo-07.md)
