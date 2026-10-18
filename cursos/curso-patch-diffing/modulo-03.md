# Módulo 3 — Diff de Fonte

**Carga:** 3 horas (1h teoria · 2h lab)
**Pre-requisitos:** Módulos 1 e 2 · Pesquisa em Segurança (módulo 3)

---

## Objetivos

1. Ler um diff de fonte **sistematicamente** — e não linha a linha.
2. Aplicar os **três níveis** (Pesquisa, módulo 3) ao diff real.
3. Reconhecer as **cinco formas** de um patch de segurança.
4. Encontrar o patch **quando ele está escondido** no meio do diff.
5. Registrar o invariante e o **padrão** — para a variante (módulo 10).

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Um commit de correção de segurança é pequeno e cirúrgico.** **Se o diff tem 3.000 linhas, a
> correção de segurança tem 5** — **e o resto é outra coisa.**

⚠ **E é isso que a maioria erra.** **Eles leem o diff linearmente** — **de cima para baixo** — **e
gastam o tempo no que não é o patch.** **O patch é sempre um bloco pequeno, e é sempre reconhecível
por forma.**

⚠ **A tese:** **você não lê o diff inteiro — você o **varre** procurando a forma da correção.** **E a
forma tem cinco padrões conhecidos.**

⚠ **A tabela do que um commit de segurança costuma conter:**

| Tipo de commit | Tamanho da correção | Resto |
|---|---|---|
| **Patch de CVE** | ⚠ **5–20 linhas** | Docs, testes, refactor |
| Release de versão | varia | Changelog, versão |
| **Silent patch** | ⚠ **2–10 linhas** | Nem está marcado |
| Backport para distro | ⚠ **O patch, isolado** | ✓ Ideal para começar |

⚠ **A última linha é a mais útil.** **As distribuições fazem *backport*: pegam só a correção de
segurança e a aplicam na versão antiga** — **isolada do resto.** **É o diff mais limpo que existe**,
e é a razão de o tracker da distro ser ótimo material.

---

## 3.1 As cinco formas do patch

⚠ **Todo patch de segurança tem uma destas cinco formas. Reconhecer é metade do trabalho.**

| # | Forma | Como reconhecer | Exemplo |
|---|---|---|---|
| 1 | **Guarda acrescentada** | um `if` novo antes do uso | `if (n > max) return -1;` |
| 2 | **Guarda movida** | o mesmo `if`, **antes** do uso | mover a checagem para cima |
| 3 | **Condição corrigida** | `>` → `>=`, `&&` → `\|\|` | off-by-one |
| 4 | **Tipo alargado** | `uint16_t` → `size_t` | o valor não cabe |
| 5 | **Validação acrescentada** | chamada nova a função de validar | `if (!valido(x)) return` |

⚠ **A forma 2 é a mais sutil de reconhecer.** **O diff mostra o `if` em outro lugar** — **e sem
atenção, você acha que ele não mudou.** **Mas mover a verificação para ANTES do uso é uma correção
de segurança** — **porque a janela estava aberta.**

⚠ **A tabela da forma → o invariante:**

| Forma | O invariante que ela garante |
|---|---|
| 1 — guarda | `x <= máx` antes do uso |
| 2 — guarda movida | **o mesmo, mas na ORDEM certa** |
| 3 — condição | o limite exato (`>=` em vez de `>`) |
| 4 — tipo | o tipo comporta o valor |
| 5 — validação | o dado é válido antes de processar |

⚠ **O reconhecimento por forma é o que faz a varredura rápida.** **Você não lê tudo:** você
**procura `if`s novos, comparações alteradas, e mudanças de tipo.** **É onde o patch está — sempre.**

⚠ **E é o módulo 5 do curso de C, em forma de diff:** **verificação antes, cobertura de origem e
destino, ordem correta.** **O patch bem feito segue as cinco regras** — **e o patch mal feito as
viola**, o que é o módulo 9.

```bash
mkdir -p ~/patch-lab/mod03 && cd ~/patch-lab/mod03

echo "═══ 1. as cinco formas ═══"
echo
cat > cinco-formas.md <<'EOF'
# As cinco formas do patch

## Forma 1 — GUARDA ACRESCENTADA
```
+ if (n > sizeof(dst)) return -ERR;
  memcpy(dst, src, n);
```
| O que garante | `n <= sizeof(dst)` antes do uso |

## Forma 2 — GUARDA MOVIDA
```
- memcpy(dst, src, n);
- if (n > sizeof(dst)) return -ERR;   ← ⚠ tarde demais
+ if (n > sizeof(dst)) return -ERR;   ← ✓ antes
+ memcpy(dst, src, n);
```
| O que garante | o mesmo, mas na ORDEM certa |

## Forma 3 — CONDIÇÃO CORRIGIDA
```
- if (n > sizeof(dst) - 1)
+ if (n >= sizeof(dst))
```
| O que garante | o limite exato (off-by-one) |

## Forma 4 — TIPO ALARGADO
```
- uint16_t total;
+ size_t   total;
```
| O que garante | o tipo comporta o valor |

## Forma 5 — VALIDAÇÃO ACRESCENTADA
```
+ if (!valida_cabecalho(buf, len)) return -ERR;
  processa(buf, len);
```
| O que garante | o dado é válido antes de processar |

## A tabela
| # | Forma | Procure por |
|---|---|---|
| 1 | guarda | `+` com `if` novo |
| 2 | guarda movida | `if` que aparece em DOIS lugares (um removido) |
| 3 | condição | `>` vs. `>=`, `&&` vs. `\|\|` |
| 4 | tipo | `uint16_t`, `int`, `char` → tipo maior |
| 5 | validação | chamada de função nova |
EOF

cat cinco-formas.md

echo
echo "═══ 2. varrendo o diff — a ordem ═══"
echo
cat <<'EXPL'
  ── NÃO leia de cima para baixo. VARRA nesta ordem ──

     1. QUANTOS arquivos?  (se são 40, a correção está em 1)
     2. QUANTAS linhas `+` e `-`?  (se são 3000, o patch tem 5)
     3. ⚠ OS ARQUIVOS DO COMPONENTE — descarte docs, testes, changelog
     4. ⚠ PROCURE A FORMA:
        · `+ if`            → forma 1
        · `- if` + `+ if`   → forma 2
        · `- >` `+ >=`      → forma 3
        · `- uint16` `+ size`→ forma 4
        · `+ valida(`       → forma 5
     5. LEIA O CONTEXTO da linha que você achou
     6. ✓ ABSTRAIA O INVARIANTE

  ⚠ e descarte de propósito:
     · mudanças de versão, changelog, README
     · testes acrescentados (⚠ mas LEIA os testes: eles dizem o que o patch quer!)
     · refactor (formato diferente, mesmo fluxo)
     · formatação, espaços, comentários
EXPL

echo
echo "═══ 3. os testes do patch são pista ═══"
echo
cat <<'EXPL'
  ⚠ um patch de segurança frequentemente acrescenta um TESTE.
     e o teste diz o que ele quer impedir.

  ── exemplo ──
     + def test_rejeita_count_acima_do_maximo():
     +     assert parse(b"\xff\xff" + ...) == ERRO
     ✓ o teste DIZ: "count acima do máximo deve ser recusado"
     ⚠ e é o invariante, entregue de graça.

  ✓ então: NÃO descarte os testes. LEIA-OS.
     eles são a descrição mais precisa do que o patch faz.
EXPL
```

⚠ **A inversão é o instrumento.** **Não ler de cima para baixo; varrer procurando a forma.** **E
os **testes** são pista, não ruído** — **porque descrevem em linguagem clara o que o patch deve
impedir.**

⚠ **É o mesmo princípio do módulo 3 do Pesquisa:** **o diff mostra o código; os testes mostram a
intenção.** **E a intenção é o invariante.**

**Produza `formas.md`:**

| # | Forma | Como reconheci no seu diff |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |

**Responda:**

1. **Qual forma é a mais sutil?** Por quê?
2. **Por que não ler o diff de cima para baixo?**
3. **Por que os testes do patch são pista?**
4. **Qual forma o seu patch usa?**

---

## 3.2 Os três níveis, no diff real

⚠ **O módulo 3 do Pesquisa introduziu os três níveis. Aqui, você os aplica a um commit real.**

| Nível | Pergunta | O que produz |
|---|---|---|
| **1** | O que mudou? | A mudança |
| **2** | Por que isso corrige? | O mecanismo |
| **3** | Qual invariante foi violado? | ⚠ **O padrão** |

⚠ **E a diferença prática, num diff real:**

```
NÍVEL 1
  "adicionou `if (count > MAX_ITEMS)` e `if (total > sizeof(dst))`"

NÍVEL 2
  "a primeira limita `count` antes da multiplicação — impede o estouro
   de `total = count * 4`.
   a segunda garante que `total` cabe em `dst` antes do memcpy.
   ⚠ e a ORDEM importa: a faixa vem antes da multiplicação."

NÍVEL 3
  invariante: "count está na faixa, e total cabe no destino"
  ⚠ PADRÃO: "campo lido da entrada usado em aritmética antes de
     validação de faixa"
```

⚠ **A linha do nível 3 é a que destrava a variante.** **O padrão, sem nomes:** **"campo da entrada
usado em aritmética antes da validação de faixa"** — **e ele se procura em qualquer parser.**
**É o módulo 10.**

⚠ **A tabela dos três níveis, com o que cada um habilita:**

| Nível | Habilita |
|---|---|
| 1 | Nada — você sabe que mudou |
| 2 | **Entender este bug** |
| 3 | ⚠ **Encontrar o irmão** |

⚠ **A diferença entre "achar o 1-day" e "achar o 0-day" está no nível 3.** **O nível 2 te dá o bug
que já foi corrigido.** **O nível 3 te dá o padrão — que existe onde ninguém corrigiu.**

⚠ **E o registro do padrão é o que o caderno guarda.** **É o módulo 8 do Pesquisa aplicado:** **o
padrão abstraído é o insumo de todas as investigações seguintes.**

```bash
cd ~/patch-lab/mod03

echo "═══ 4. os três níveis, aplicados ═══"
echo
cat > tres-niveis-diff.md <<'EOF'
# Os três níveis, no diff

## O diff
```
[cole o diff — ⚠ só o trecho relevante]
```

## Nível 1 — o que mudou
| Item | Valor |
|---|---|
| Arquivos tocados | |
| Linhas `+` / `-` | |
| Forma do patch (1–5) | |
| O que foi adicionado | |

## Nível 2 — por que isso corrige
| Item | Valor |
|---|---|
| O mecanismo | |
| ⚠ A ordem importa? | |
| Cobre origem E destino? | |
| O que aconteceria sem a correção | |

## Nível 3 — o invariante violado
| Item | Valor |
|---|---|
| **O invariante** | |
| **O PADRÃO (sem nomes)** | |
| Onde mais procurar | |

## Os testes do patch
| Item | Valor |
|---|---|
| O patch acrescentou teste? | |
| O que o teste verifica | |
| ⚠ O que isso confirma | |

## A avaliação de completude (Pesquisa, módulo 3)
| Pergunta | Resposta |
|---|---|
| Sintoma ou raiz? | |
| Verifica antes ou depois? | |
| Cobre todos os caminhos? | |
| Sobrevive a variante? | |
EOF

cat tres-niveis-diff.md

echo
echo "═══ 5. avaliando a completude ═══"
echo
cat <<'EXPL'
  ── um patch corrige a RAIZ ou o SINTOMA? ──

     SINTOMA (⚠ incompleto):
        if (len == 0x400) return -ERR;    ← só o valor do PoC

     RAIZ (✓):
        if (len > MAX) return -ERR;       ← a condição

     RAIZ NO TIPO (✓✓):
        size_t total;                     ← o tipo não estoura
        + if (count > MAX_ITEMS) return -ERR;

  ── e as quatro perguntas de completude ──
     · corrige a condição ou o valor?
     · verifica ANTES do uso?
     · cobre TODOS os caminhos?
     · sobrevive a variante?

  ⚠ e a resposta "sobrevive a variante" é o que o módulo 10 testa.
     se o patch não sobrevive, o irmão existe — e é 1-day.
EXPL
```

⚠ **A avaliação de completude é o julgamento.** **Um patch de sintoma ainda deixa o bug vivo por
outro caminho** — **e é o que o módulo 10 vai procurar.** **Registrar isso é parte da leitura.**

**Produza `niveis.md`:**

| Nível | Sua resposta |
|---|---|
| 1 — o que mudou | |
| 2 — por que corrige | |
| 3 — invariante | |
| **Padrão** | |

**Responda:**

1. **O patch acrescentou teste?** O que ele verifica?
2. **O patch corrige raiz ou sintoma?** Por quê?
3. **A ordem importa?** Como você sabe?
4. **O padrão abstraído** — escreva sem nomes.

---

## 3.3 Encontrando o patch escondido

⚠ **Nem todo patch de segurança é um commit limpo. Há três casos que exigem busca.**

| Caso | O que acontece | Como resolver |
|---|---|---|
| **Release grande** | O patch está no meio de 200 commits | ⚠ Filtrar por forma |
| **Backport da distro** | O patch está isolado — ✓ melhor caso | Ler direto |
| **Squash de release** | Tudo num commit só | ⚠ Filtrar por arquivo e forma |
| **Silent patch** | ⚠ **Sem marcador nenhum** | Módulo 9 |
| **Patch múltiplo** | Um release corrige 5 CVE | ⚠ Separar por CVE |

⚠ **O caso da release grande é o mais comum em projeto aberto.** **Você tem `v1.2.3..v1.2.4` com
300 commits** — **e o de segurança é um.**

⚠ **A tabela dos filtros, em ordem:**

| Filtro | Comando | O que descarta |
|---|---|---|
| 1 — autor | `git log --author` | Mantenedor de segurança |
| 2 — mensagem | `git log --grep='CVE\|fix\|bound\|check'` | O resto |
| 3 — arquivo | `git log -- <arquivo-do-componente>` | Docs, testes |
| 4 — tamanho | `git log --stat \| grep -B2 '1 file'` | ⚠ **Commits pequenos** |
| 5 — forma | ler o diff com a varredura | Formato |

⚠ **O filtro 4 é o mais eficaz e o menos usado.** **Um commit de segurança altera **1 ou 2
arquivos** e **poucas linhas**.** **Filtrar por commits pequenos** elimina **90% do ruído** — **e o
patch sempre está entre eles.**

⚠ **E o filtro 1 é o mais preciso quando a organização tem.** **Projetos grandes têm uma equipe de
segurança** — **e o commit vem do e-mail dela.** **É o caminho mais direto.**

⚠ **A regra escrita:**

> **O patch está num commit pequeno, num arquivo do componente, com mensagem de correção — e
> frequentemente de um autor que você não vê nos outros.**

```bash
cd ~/patch-lab/mod03

echo "═══ 6. os filtros, em ordem ═══"
echo
cat > filtra-patch.sh <<'SCRIPT'
#!/usr/bin/env bash
# filtra-patch.sh — acha o commit de segurança numa release grande
set -uo pipefail

REPO="${1:?uso: filtra-patch.sh <pasta-do-repo> [tag-A] [tag-B]}"
A="${2:-}"
B="${3:-}"
cd "$REPO" || exit 2

RANGE=""
[ -n "$A" ] && [ -n "$B" ] && RANGE="${A}..${B}"

echo "═══════════ PROCURANDO O PATCH ═══════════"
echo "  repo: $(basename "$PWD")"
[ -n "$RANGE" ] && echo "  range: $RANGE"
echo

echo "── FILTRO 1: commits com marcador de segurança ──"
git log --oneline $RANGE 2>/dev/null | \
    grep -iE 'CVE-[0-9]{4}-[0-9]+|security|vuln' | head -10 | sed 's/^/  /'
echo "  (fim)"
echo

echo "── FILTRO 2: mensagem de correção ──"
git log --oneline $RANGE 2>/dev/null | \
    grep -iE '\b(fix|bound|check|valid|guard|limit|clamp|range|sanitize|overflow)\b' | \
    grep -viE 'CVE-' | head -15 | sed 's/^/  /'
echo "  (fim)"
echo

echo "── FILTRO 3: ⚠ commits PEQUENOS (o mais eficaz) ──"
git log $RANGE --format='%h %s' --shortstat 2>/dev/null | \
    awk '/^[0-9a-f]+ / {c=$0; next} /file/ {
        n=0
        for(i=1;i<=NF;i++) if($i ~ /insertion|deletion/) n++;
        split($0,a," ");
        files=a[1];
        if (files+0 <= 2) print "  " c "   [" $0 "]"
    }' | head -15
echo "  (fim)"
echo

echo "── FILTRO 4: um arquivo só ──"
git log $RANGE --format='%h %s' --name-only 2>/dev/null | \
    awk 'NF==1 && $1 ~ /^[0-9a-f]+$/ {c=$0; next} /\.(c|h|py|go|rs|js)$/ {f=$0; getline; if(NF==0||$0 ~ /^[0-9a-f]+ /) print "  " c " → " f}' | \
    sort -u | head -10
echo "  (fim)"
echo

echo "── FILTRO 5: autores ──"
git log $RANGE --format='%an' 2>/dev/null | sort | uniq -c | sort -rn | head -8 | sed 's/^/  /'
echo

echo "── O QUE FAZER COM O RESULTADO ──"
cat <<'EXPL'
  ⚠ para cada candidato do filtro 3:
     1. git show <hash>            → veja o diff
     2. aplique a VARREDURA (§3.1) → ache a forma
     3. aplique os TRÊS NÍVEIS     → o invariante
     4. classifique:
        · correção de segurança?    ✓ ACHOU
        · refactor que só parece?   · descarte
  ⚠ e o filtro 3 costuma ter 10 candidatos para 1 patch.
EXPL
SCRIPT

chmod +x filtra-patch.sh

echo "  ⚠ rode num repositório que você clonou:"
echo "     ./filtra-patch.sh ~/patch-lab/alvos/<projeto> v1.2.3 v1.2.4"
echo
echo "═══ 7. e o caso mais fácil: o backport da distro ═══"
cat <<'EXPL'
  ── o tracker da distro lista o CVE e o PATCH ISOLADO ──
     · Debian:  https://security-tracker.debian.org/tracker/CVE-XXXX-YYYY
     · Ubuntu:  https://ubuntu.com/security/CVE-XXXX-YYYY
     · Red Hat: https://access.redhat.com/security/cve/CVE-XXXX-YYYY

  ✓ o link mostra o commit OU o patch aplicado
  ✓ e frequentemente é o patch LIMPO, sem o resto do release

  ⚠ é por isso que o material profissional recomenda começar por aí:
     menos ruído, e o patch isolado.
EXPL
```

⚠ **O filtro 3 é o instrumento.** **Commits de 1–2 arquivos e poucas linhas** — **e o patch de
segurança está sempre entre eles.** **É o que reduz 300 commits a 10 candidatos.**

⚠ **E o tracker da distro é o atalho legítimo.** **O patch **isolado**, sem o resto do release** —
**o material mais limpo que existe.**

**Produza `filtros.md`:**

| Filtro | Comando | O que descarta |
|---|---|---|
| 1 — marcador | | |
| 2 — mensagem | | |
| 3 — tamanho | | |
| 4 — arquivo | | |
| 5 — autor | | |

**Responda:**

1. **Qual filtro é o mais eficaz?** Por quê?
2. **Quantos candidatos ele deu** no seu caso?
3. **O que o tracker da distro dá** que o repositório não dá?
4. **Por que começar pelo backport** é recomendado?

---

## 3.4 LAB — Leia um diff real

**Duração:** 120 min

### Passo 1 — Obtenha o diff (30 min)

⚠ **Use o par de treino do módulo 2, ou um CVE real.**

```bash
cd ~/patch-lab/mod03

echo "═══ OBTENDO O DIFF ═══"
echo
cat <<'EXPL'
  ── OPÇÃO A: o par de treino do módulo 2 ──
     diff -u ~/patch-lab/alvos/treino/versao_antiga.c \
             ~/patch-lab/alvos/treino/versao_nova.c
     ⚠ é um diff SINTÉTICO — não é de CVE real
     ✓ mas serve para treinar a varredura e os três níveis

  ── OPÇÃO B: um CVE real, com commit ──
     · GitHub Advisories → o commit
     · tracker da distro → o patch isolado
     git show <hash>
     ✓ e é o exercício de verdade

  ── OPÇÃO C: a release inteira ──
     git log v1.2.3..v1.2.4
     ⚠ e aí você usa o módulo 3.3 (filtros) para achar o patch
EXPL

# gera o diff do par de treino
ANT=~/patch-lab/alvos/treino/versao_antiga.c
NOV=~/patch-lab/alvos/treino/versao_nova.c

if [ -f "$ANT" ] && [ -f "$NOV" ]; then
    echo
    echo "═══ O DIFF DO PAR DE TREINO ═══"
    diff -u "$ANT" "$NOV" > diff-treino.patch
    cat diff-treino.patch | sed 's/^/  /'
    echo
    echo "  ── métricas ──"
    printf '  linhas + : %s\n' "$(grep -c '^+' diff-treino.patch)"
    printf '  linhas - : %s\n' "$(grep -c '^-' diff-treino.patch)"
    printf '  contexto : %s\n' "$(grep -c '^ ' diff-treino.patch)"
else
    echo "  ⚠ o par de treino não existe — rode o módulo 2 primeiro"
fi
```

Produza `diff-obtido.md`:

| Métrica | Valor |
|---|---|
| Arquivos | |
| Linhas `+` | |
| Linhas `-` | |
| Forma do patch | |

**Responda:**

1. **Quantas linhas o patch tem?** É pequeno ou grande?
2. **Qual forma** ele usa?
3. **Qual a fonte?** CVE real, ou o par de treino?
4. **Se for release inteira**, quantos candidatos os filtros deram?

### Passo 2 — A varredura, e os três níveis (55 min)

⚠ **Aplique o método completo.**

```bash
cd ~/patch-lab/mod03

echo "═══ A VARREDURA ═══"
echo
echo "  ── 1. quais arquivos mudaram? ──"
grep '^---' diff-treino.patch 2>/dev/null | sed 's/^/     /'
echo
echo "  ── 2. quantas linhas? ──"
wc -l < diff-treino.patch | xargs printf '     %s linhas\n'
echo
echo "  ── 3. PROCURANDO A FORMA ══"
echo
printf '     %-34s ' "forma 1 — guarda acrescentada:"
grep -cE '^\+.*\bif\s*\(' diff-treino.patch 2>/dev/null
printf '     %-34s ' "forma 2 — guarda movida:"
grep -cE '^-.*\bif\s*\(' diff-treino.patch 2>/dev/null
printf '     %-34s ' "forma 3 — condição:"
grep -cE '^\+.*[<>]=?' diff-treino.patch 2>/dev/null
printf '     %-34s ' "forma 4 — tipo:"
grep -cE '^\+.*\b(uint16_t|size_t|int64_t)\b' diff-treino.patch 2>/dev/null
printf '     %-34s ' "forma 5 — validação:"
grep -cE '^\+.*\b(valida|check|validate)\w*\s*\(' diff-treino.patch 2>/dev/null
echo
echo "  ── 4. as linhas `+` que importam ──"
grep '^+' diff-treino.patch 2>/dev/null | grep -v '^+++' | sed 's/^/     /'
echo
echo "═══ OS TRÊS NÍVEIS ═══"
echo
cat <<'EXPL'
  ── NÍVEL 1 ──
     quantas verificações foram acrescentadas? quais?

  ── NÍVEL 2 ──
     POR QUE cada uma corrige?
     ⚠ e a ORDEM importa? (a faixa antes da multiplicação?)

  ── NÍVEL 3 ──
     qual é o INVARIANTE?
     ⚠ e o PADRÃO, sem nomes de variável?
EXPL

cat > caderno/PD-003.md <<'EOF'
# PD-003 — leitura do diff

**Data:** ____

## 1. O diff
```
[cole aqui]
```

## 2. Métricas
| Item | Valor |
|---|---|
| Arquivos | |
| Linhas + / - | |
| Forma do patch | |

## 3. Nível 1 — o que mudou
[em uma frase]

## 4. Nível 2 — por que corrige
| Item | Valor |
|---|---|
| O mecanismo | |
| A ordem importa? | |
| Cobre origem e destino? | |

## 5. Nível 3 — invariante e padrão
| Item | Valor |
|---|---|
| **O invariante** | |
| **O PADRÃO (sem nomes)** | |

## 6. Os testes do patch
| Item | Valor |
|---|---|
| Acrescentou teste? | |
| O que ele verifica | |

## 7. Completude
| Pergunta | Resposta |
|---|---|
| Sintoma ou raiz? | |
| Antes ou depois do uso? | |
| Cobre todos os caminhos? | |
| Sobrevive a variante? | |

## 8. O que isso destrava
[o irmão a procurar — módulo 10]
EOF

echo "  ⚠ a ficha PD-003 criada — preencha com o SEU diff"
head -12 caderno/PD-003.md
```

Produza `niveis-lidos.md`:

| Nível | Sua resposta |
|---|---|
| 1 | |
| 2 | |
| 3 | |
| **Padrão** | |

**Responda:**

1. **Quantas linhas `+` com `if`?** É a forma 1?
2. **A ordem das verificações importa?** Como você sabe?
3. **O invariante** — escreva.
4. **O padrão sem nomes** — escreva.
5. **O patch sobrevive a variante?** Por quê?

### Passo 3 — O padrão e o irmão (35 min)

⚠ **A abstração do padrão é o que alimenta o módulo 10.**

```bash
cd ~/patch-lab/mod03

echo "═══ DO PADRÃO AO IRMÃO ═══"
echo
cat > padrao-para-busca.md <<'EOF'
# Do padrão à busca

## O padrão abstraído
"[SEM nomes de variável — a forma]"

## Os termos de busca
| # | Termo | Por que |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

## Os comandos
```bash
grep -rEn '<termo>' --include='*.c' .
```

## Candidatos no MESMO projeto
| # | Arquivo:linha | Casa o padrão? | Verificado? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## Candidatos em OUTRO projeto (ecossistema)
| # | Projeto | Implementa o mesmo? | Vale investigar? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## A hipótese (Pesquisa, módulo 6)
| Campo | Valor |
|---|---|
| Invariante | |
| Afirmação | |
| Observação | |
| **Falsificação** | |
EOF

cat padrao-para-busca.md

echo
echo "═══ EXEMPLO: o padrão do par de treino ═══"
cat <<'EXPL'
  ── o patch corrigiu ──
     if (c.count > MAX_ITEMS) return -2;
     c.total = (uint32_t)c.count * 4;
     if (c.total > sizeof(dst)) return -3;
     memcpy(dst, buf + sizeof(c), c.total);

  ── o PADRÃO, sem nomes ──
     "campo lido da entrada usado em aritmética antes de validação de faixa"

  ── a busca ──
     grep -rnE '(count|len|size|n)\s*\*' --include='*.c' .
     grep -rnE 'memcpy\s*\([^,]+,[^,]+,\s*\w*(total|count|len)' .

  ── o irmão, onde procurar ──
     · outro parser no MESMO arquivo
     · outro formato no MESMO projeto
     · ⚠ OUTRO PROJETO que lê o mesmo formato  ← 0-day

  ✓ e a hipótese:
     "outro parser do mesmo projeto usa um campo de tamanho
      sem validar a faixa antes da multiplicação"
EOF
```

⚠ **O padrão é o insumo.** **E ele vem **sem nomes** — porque o nome muda de projeto para projeto,
**e a forma não.**** **É o que permite a busca no ecossistema.**

⚠ **E a hipótese fecha o ciclo com o módulo 6 do Pesquisa:** **com critério de falsificação** —
**porque sem ele, não é hipótese.**

**Produza `padrao.md`:**

| Item | Valor |
|---|---|
| Padrão abstraído | |
| Termo 1 | |
| Termo 2 | |
| Candidatos no projeto | |
| Candidatos no ecossistema | |

**Responda:**

1. **O padrão está sem nomes?** Reescreva se não.
2. **Quantos candidatos no mesmo projeto?**
3. **Onde procurar o irmão no ecossistema?**
4. **A hipótese tem critério de falsificação?**

### Critérios de aceitação

- `formas.md` com as **cinco** formas e como reconhecer cada uma.
- Você identificou **qual forma o seu patch usa**.
- Você explicou **por que não ler o diff de cima para baixo**.
- Você explicou **por que os testes do patch são pista**.
- O diff obtido, com as **métricas** (arquivos, linhas, forma).
- `niveis.md` com os **três** níveis preenchidos.
- Você escreveu o **padrão abstraído sem nomes**.
- Você avaliou a **completude** — sintoma ou raiz.
- `filtros.md` com os **cinco** filtros e o comando de cada.
- Você explicou **qual filtro é o mais eficaz** (o de commits pequenos).
- Você explicou **o que o tracker da distro dá** de diferente.
- `caderno/PD-003.md` preenchida com o **seu** diff.
- `padrao.md` com o termo de busca e os candidatos.
- Você escreveu a **hipótese** com critério de falsificação.
- ⚠ **Nenhum alvo de terceiro.** Diff de repositório público, ou do par de treino.

---

## Avaliação

1. **Por que um commit de segurança é pequeno e cirúrgico?**
2. **O que um release grande contém** além do patch?
3. **Cite as cinco formas do patch.**
4. **Qual forma é a mais sutil?** Por quê?
5. **Como você reconhece a forma 2** num diff?
6. **Por que varrer e não ler de cima para baixo?**
7. **Por que os testes do patch são pista?**
8. **Cite os três níveis** e o que cada um produz.
9. **Qual nível habilita a variante?** Por quê?
10. **O que o padrão abstraído tem que o nome não tem?**
11. **Cite os cinco filtros de busca.**
12. **Qual é o mais eficaz?** Por que é o menos usado?
13. **Como o filtro de autor ajuda?**
14. **O que o tracker da distro dá** que o repositório não dá?
15. **Por que o backport é o material mais limpo?**
16. **O que avaliar em completude?** Cite quatro perguntas.
17. **Por que um patch de sintoma deixa o bug vivo?**
18. **O que o `PLocator` faz** com a localização?
19. **Por que o padrão precisa estar sem nomes?**
20. **O que a hipótese precisa ter** (Pesquisa, módulo 6)?

---

**Próximo:** [Módulo 4 — Diff de binário, manual](modulo-04.md)
