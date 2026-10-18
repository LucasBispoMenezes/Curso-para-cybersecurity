# Módulo 9 — Silent Patch

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 8 · Pesquisa em Segurança (módulo 4)

---

## Objetivos

1. Entender por que o **silent patch** é o achado de maior rendimento.
2. Caçar silent patch **sistematicamente**, com método.
3. Distinguir **silent patch** de **refactor que parace**.
4. Usar os **indicadores** que sobrevivem à ausência do CVE.
5. Registrar o achado — e saber a quem reportar.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Há um CVE para cada N patches de segurança.** **Os outros N-1 estão sem aviso — e sem caçador.**

⚠ **E é o que o material do `TORCH` diz explicitamente sobre o diff de patch:**

> *"Also finds **silently patched** bugs that never got an advisory."*

⚠ **A razão de existirem, e ela é estrutural:**

| Por que um patch fica silencioso | Frequência |
|---|---|
| O fornecedor não considerou vulnerabilidade | ⚠ Comum |
| Foi corrigido "de passagem", num refactor | ⚠ Muito comum |
| O bug foi achado internamente e não divulgado | Comum |
| A correção veio antes de alguém reportar | Comum |
| O fornecedor não quis gerar CVE | Menos comum |
| ⚠ **Ninguém nunca olhou** | ⚠ **O motivo do seu trabalho** |

⚠ **A tese:** **o silent patch é um 1-day que ninguém catalogou** — **e por isso não tem fila de
caçadores.** **Você está sozinho na frente dele.**

⚠ **E o rendimento é medido.** **O `EnBinDiff`, analisando binários reais, encontrou 20 1-days** —
**e parte deles era de patches que não tinham recebido atenção suficiente.** **O caminho existe.**

---

## 9.1 Por que ele rende mais

⚠ **A economia do achado, comparando os dois caminhos.**

| | CVE conhecido | Silent patch |
|---|---|---|
| Quem está procurando | ⚠ Muitos | ⚠ **Você** |
| A descrição existe? | ✓ | ✗ |
| A classe está dada? | ✓ (CWE) | ⚠ Você deduz |
| A janela é curta? | ✓ | ⚠ Não — ninguém sabe |
| O crédito é certo? | ⚠ Talvez não | ✓✓ **Sim** |
| ⚠ **Competição** | **Alta** | ⚠ **Nula** |

⚠ **A última linha é o que decide.** **Um CVE famoso tem centenas de pessoas lendo o mesmo patch no
mesmo dia.** **Um silent patch tem **zero** — porque ninguém sabe que existe.**

⚠ **E a tabela de quando o silent patch é encontrado:**

| Quando | Como |
|---|---|
| No diff de release | ⚠ **Comparar N-1 com N** |
| Em commit de refactor | Ler commits "inocentes" |
| Em mudança de tipo | ⚠ **Sutil** |
| Em comentário "TODO" removido | Ler os comentários que sumiram |
| ⚠ **Nunca** | ⚠ **O caso mais comum** |

⚠ **A última linha é a razão do trabalho.** **A maioria dos silent patches **nunca foi
encontrada** — **e não há lista.** **Você não está seguindo ninguém; você está abrindo.**

⚠ **A regra escrita:**

> **Com CVE, você compete. Sem CVE, você abre.** **E abrir é o que um pesquisador faz.**

⚠ **E é o mesmo raciocínio do módulo 2 do curso de Pesquisa:** **escolher o alvo pela vantagem
relativa.** **Aqui, a vantagem é **não ter concorrência** — e o custo é **não ter o mapa.**

```bash
mkdir -p ~/patch-lab/mod09 && cd ~/patch-lab/mod09

echo "═══ 1. a economia do silent patch ═══"
echo
cat > economia.md <<'EOF'
# Por que o silent patch rende mais

## Comparação
| Aspecto | CVE conhecido | Silent patch |
|---|---|---|
| quem procura | muitos | ⚠ você |
| a descrição existe? | ✓ | ✗ |
| a classe está dada? | ✓ CWE | ⚠ você deduz |
| a janela é curta? | ✓ | ⚠ não |
| o crédito é certo? | talvez não | ✓✓ sim |
| ⚠ **competição** | **alta** | ⚠ **nula** |

## Por que existem
| Motivo | Frequência |
|---|---|
| não considerou vulnerabilidade | comum |
| corrigido de passagem | muito comum |
| achado internamente | comum |
| antes de alguém reportar | comum |
| não quis gerar CVE | menos comum |
| ⚠ **ninguém nunca olhou** | ⚠ **o motivo do trabalho** |

## Quando é encontrado
| Quando | Como |
|---|---|
| no diff de release | comparar N-1 com N |
| em commit de refactor | ler commits "inocentes" |
| em mudança de tipo | ⚠ sutil |
| em comentário removido | ler o que sumiu |
| ⚠ **nunca** | ⚠ o caso mais comum |

## ⚠ A REGRA
com CVE, você COMPETE. sem CVE, você ABRE.
✓ e abrir é o que um pesquisador faz.
EOF

cat economia.md

echo
echo "═══ 2. e o custo ═══"
echo
cat <<'EXPL'
  ── o que você PERDE sem o CVE ──
     ✗ a descrição não te diz onde olhar
     ✗ o CWE não te dá a classe
     ✗ ⚠ você não sabe se o que achou É de segurança
     ✗ e não há lista de "o que procurar"

  ── e é por isso que os módulos 3 e 5 viraram o método ──
     · a VARREDURA por forma (módulo 3)   → substitui a descrição
     · a TRIAGEM por fluxo (módulo 5)     → substitui o CWE
     · e a CONFIRMAÇÃO (módulo 8)         → diz se É de segurança

  ✓ sem CVE, o método é o que você tem.
     ⚠ e é por isso que o curso insiste no método, e não na ferramenta.
EXPL
```

⚠ **O custo é a ausência de mapa** — **e é o método dos módulos 3, 5 e 8 que o substitui.** **Sem o
CVE, a **varredura por forma** diz o que procurar; a **triagem por fluxo** diz o que importa; e a
**confirmação** diz se é de segurança.**

⚠ **É por isso que o silent patch é o módulo 9, e não o 1.** **Ele exige todo o método anterior** —
**e é o teste de que você o tem.**

**Produza `economia.md`:**

| Aspecto | CVE | Silent patch |
|---|---|---|
| Competição | | |
| Descrição | | |
| Crédito | | |

**Responda:**

1. **Por que o silent patch rende mais?**
2. **O que você perde sem o CVE?** Cite quatro.
3. **O que substitui a descrição?** E o CWE?
4. **Por que ele é o módulo 9** e não o 1?

---

## 9.2 A caça sistemática

⚠ **O método. E ele é o módulo 3 (filtros) aplicado **sem** o CVE como guia.**

| # | Passo | O que fazer |
|---|---|---|
| 1 | **Escolha o alvo** | Release frequente, projeto aberto |
| 2 | **Pegue duas versões** | ⚠ **Consecutivas** |
| 3 | **Filtre os commits** | Módulo 3, §3.3 — por mensagem e tamanho |
| 4 | **⚠ Descarte os que têm CVE** | O que sobra é o candidato |
| 5 | **Aplique a varredura** | Módulo 3, §3.1 — as cinco formas |
| 6 | **Triagem por fluxo** | Módulo 5 |
| 7 | **Confirme** | Módulo 8 |

⚠ **O passo 4 é o que define o silent patch.** **Se o commit tem CVE, é 1-day catalogado.** **O
silent patch é o que **não** tem — **e corrige algo de segurança.**

⚠ **E o passo 5 é onde o julgamento entra.** **Você aplica as cinco formas** — **e decide se o que
achou é de segurança.** **A decisão exige o critério:**

| É de segurança se... | Não é se... |
|---|---|
| Muda o que o código **aceita** | Só reorganiza |
| Adiciona **limite** ou **validação** | Só renomeia |
| Muda **tipo** para caber mais | Só comenta |
| **Corrige uma condição** | Só formata |
| ⚠ **Impede um estado inválido** | Só otimiza |

⚠ **A primeira linha é o critério mais direto.** **"O código passou a ACEITAR menos"** é a
assinatura de um patch de segurança — **mesmo sem CVE, mesmo sem descrição.**

⚠ **A tabela do que os commits "inocentes" costumam ser:**

| Mensagem do commit | Pode ser segurança? |
|---|---|
| `fix bounds check` | ⚠ **Provavelmente sim** |
| `add validation` | ⚠ **Sim** |
| `refactor parser` | ⚠ **Verificar** |
| `improve error handling` | ⚠ **Verificar** |
| `code cleanup` | ⚠ **Verificar** |
| `bump version` | Não |
| `update README` | Não |
| `fix typo` | ⚠ **Pode esconder** |

⚠ **A linha do `fix typo` é a mais surpreendente.** **Um "typo" em uma comparação** — `>` escrito
como `>=` — **é off-by-one, e o commit diz "typo".** **Você lê o diff, e não a mensagem.**

⚠ **A regra escrita:**

> **A mensagem do commit não é evidência.** **O diff é.** **E "typo" numa comparação é um limite
> que mudou.**

```bash
cd ~/patch-lab/mod09

echo "═══ 3. a caça sistemática ═══"
echo
cat > caca.md <<'EOF'
# A caça sistemática

## Os sete passos
| # | Passo | Ferramenta |
|---|---|---|
| 1 | escolha o alvo | módulo 2 |
| 2 | pegue duas versões CONSECUTIVAS | módulo 2 |
| 3 | filtre os commits | módulo 3 §3.3 |
| 4 | ⚠ DESCARTE os que têm CVE | — |
| 5 | aplique a varredura | módulo 3 §3.1 |
| 6 | triagem por fluxo | módulo 5 |
| 7 | confirme | módulo 8 |

## ⚠ O passo 4 é o que define
se o commit tem CVE → 1-day catalogado
se NÃO tem, e corrige segurança → ⚠ SILENT PATCH

## O critério: é de segurança?
| É de segurança se... | Não é se... |
|---|---|
| muda o que o código ACEITA | só reorganiza |
| adiciona LIMITE ou VALIDAÇÃO | só renomeia |
| muda TIPO para caber mais | só comenta |
| corrige uma CONDIÇÃO | só formata |
| impede um ESTADO INVÁLIDO | só otimiza |

## ⚠ as mensagens "inocentes"
| Mensagem | Pode ser segurança? |
|---|---|
| `fix bounds check` | ⚠ sim |
| `add validation` | ⚠ sim |
| `refactor parser` | ⚠ verificar |
| `improve error handling` | ⚠ verificar |
| `code cleanup` | ⚠ verificar |
| `fix typo` | ⚠ **PODE ESCONDER** |
| `bump version` | não |
| `update README` | não |

## ⚠ A REGRA
a mensagem do commit NÃO é evidência.
o DIFF é.
✓ e "typo" numa comparação é um limite que mudou.
EOF

cat caca.md

echo
echo "═══ 4. o script da caça ═══"
echo
cat > caca-silent.sh <<'SCRIPT'
#!/usr/bin/env bash
# caca-silent.sh — caça silent patch numa faixa de versões
set -uo pipefail

REPO="${1:?uso: caca-silent.sh <repo> <tag-A> <tag-B>}"
A="${2:?informe a tag inicial}"
B="${3:?informe a tag final}"
cd "$REPO" || exit 2

RANGE="${A}..${B}"

echo "═══════════ CAÇA A SILENT PATCH ═══════════"
echo "  repo : $(basename "$PWD")"
echo "  range: $RANGE"
echo

total=$(git log --oneline "$RANGE" 2>/dev/null | wc -l)
com_cve=$(git log --oneline "$RANGE" 2>/dev/null | grep -icE 'CVE-[0-9]{4}-[0-9]+')
printf '  commits no range      : %s\n' "$total"
printf '  commits com CVE       : %s\n' "$com_cve"
printf '  ⚠ candidatos a silent : ~%s\n' "$((total - com_cve))"
echo

echo "── PASSO 1: commits PEQUENOS, sem CVE ──"
git log "$RANGE" --format='%h %s' --shortstat 2>/dev/null | \
    grep -viE 'CVE-[0-9]{4}-[0-9]+' | \
    awk '/^[0-9a-f]+ / {c=$0; next} /file/ {
        split($0,a," "); files=a[1];
        if (files+0 <= 2) print "  " c
    }' | head -20
echo "  (fim)"
echo

echo "── PASSO 2: mensagens que sugerem segurança ──"
git log --oneline "$RANGE" 2>/dev/null | \
    grep -viE 'CVE-' | \
    grep -iE '\b(fix|bound|check|valid|guard|limit|clamp|range|sanitize|overflow|verify|ensure)\b' | \
    head -15 | sed 's/^/  ⚠ /'
echo "  (fim)"
echo

echo "── PASSO 3: commits que mexem em COMPARAÇÕES ──"
⚠ cat <<'EXPL'
  ⚠ este passo exige ler o diff. para os candidatos acima:

     git show <hash> | grep -E '^[-+].*[<>]=?'

  ✓ e "typo" numa comparação é um limite que mudou.
EXPL
echo

echo "── PASSO 4: o que sobra ──"
cat <<'EXPL'
  ⚠ para cada candidato:
     1. git show <hash>
     2. aplique a VARREDURA (módulo 3 §3.1) — as cinco formas
     3. aplique o CRITÉRIO do §9.2:
        "o código passou a ACEITAR menos?"
     4. ✓ se sim → SILENT PATCH CANDIDATO
     5. confirme (módulo 8)

  ⚠ e descarte:
     · bump de versão, README, testes de formatação
     · refactor que só move código
     · otimização sem mudança de aceitação
EXPL
SCRIPT

chmod +x caca-silent.sh

echo "  ⚠ rode num repositório que você clonou:"
echo "     ./caca-silent.sh ~/patch-lab/alvos/<projeto> v1.2.3 v1.2.4"
echo
echo "═══ 5. e o sinal que sobrevive à ausência do CVE ═══"
cat <<'EXPL'
  ── os indicadores que você usa SEM descrição ──

     1. ⚠ A FORMA DO PATCH (módulo 3)
        · um `if` novo, um `cmp` alterado, um tipo maior
        ✓ a forma é a mesma com ou sem CVE

     2. ⚠ A MUDANÇA DE FLUXO (módulo 5)
        · branch novo, chamada nova, constante nova
        ✓ idem

     3. ⚠ O CRITÉRIO DE ACEITAÇÃO
        · "o código passou a ACEITAR menos?"
        ✓ é o que distingue segurança de refactor

     4. ⚠ A CONFIRMAÇÃO (módulo 8)
        · N-1 processa o que N processa?
        ✓ é o que prova que É de segurança

  ✓ e nenhum deles depende do CVE.
     é por isso que o método vem antes.
EXPL
```

⚠ **O script da caça é o instrumento.** **E ele mostra a proporção:** **para cada commit com CVE,
há **N** sem** — **e é aí que o silent patch está.**

⚠ **E a seção 5 é o resumo do curso:** **os quatro indicadores que funcionam sem CVE.** **Forma,
fluxo, critério de aceitação, confirmação** — **e nenhum depende de descrição.**

**Produza `caca.md`:**

| Passo | O que faz | Resultado |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |

**Responda:**

1. **Qual passo define o silent patch?** Por quê?
2. **Qual o critério de "é de segurança"?**
3. **Por que `fix typo` pode esconder?**
4. **Cite os quatro indicadores** que sobrevivem sem CVE.

---

## 9.3 Refactor que parece

⚠ **A parte difícil: distinguir segurança de refactor. E há quatro critérios.**

| # | Critério | Segurança | Refactor |
|---|---|---|---|
| 1 | **Aceitação** | ⚠ **Aceita menos** | Aceita o mesmo |
| 2 | **Fluxo** | ⚠ **Branch novo** | Mesmo fluxo |
| 3 | **Comportamento** | ⚠ **Difere com alguma entrada** | Idêntico |
| 4 | **Direção** | ⚠ **Restringe** | Reorganiza |

⚠ **O critério 1 é o mais direto e o mais fácil de aplicar.** **"O código passou a recusar algo que
antes aceitava?"** — **se sim, é segurança.**

⚠ **E o critério 4 é o que fecha.** **Refactor **reorganiza**; segurança **restringe**.** **Um
refactor pode mover a validação; uma correção pode **acrescentar** uma.**

⚠ **A tabela dos casos ambíguos, e como resolver:**

| Caso | Parece | É? | Como decidir |
|---|---|---|---|
| Guarda movida para antes | refactor | ⚠ **Segurança** | A janela estava aberta |
| Tipo alargado | refactor | ⚠ **Segurança** | O valor não cabia |
| Validação extraída | refactor | ⚠ **Verificar** | A função nova valida o mesmo? |
| Função reescrita | refactor | ⚠ **Verificar** | Compare o comportamento |
| Loop reescrito | refactor | ⚠ **Verificar** | A condição mudou? |
| Log adicionado | — | ⚠ **Não é** | Só observa |

⚠ **A linha 1 é a mais surpreendente.** **Mover uma verificação para ANTES do uso **parece** um
refactor** — **e é uma correção de segurança** — **porque a janela estava aberta.** **É a forma 2 do
módulo 3, e ela é fácil de confundir.**

⚠ **E a linha 3 merece nota.** **Extrair a validação para uma função nova** pode ser **refactor**
(se a função faz o mesmo) **ou segurança** (se a função faz mais). **Você compara as duas.**

⚠ **A regra escrita:**

> **Quando a dúvida é refactor ou segurança, a resposta está no COMPORTAMENTO.** **Rode os dois com
> a mesma entrada** — **e a diferença decide.**

⚠ **É a mesma regra do módulo 5 e do módulo 8:** **o comportamento é o árbitro.** **Não a mensagem
do commit, não a aparência do diff.**

```bash
cd ~/patch-lab/mod09

echo "═══ 6. os quatro critérios ═══"
echo
cat > refactor.md <<'EOF'
# Refactor que parece — os quatro critérios

| # | Critério | Segurança | Refactor |
|---|---|---|---|
| 1 | ACEITAÇÃO | ⚠ aceita menos | aceita o mesmo |
| 2 | FLUXO | ⚠ branch novo | mesmo fluxo |
| 3 | COMPORTAMENTO | ⚠ difere com alguma entrada | idêntico |
| 4 | DIREÇÃO | ⚠ restringe | reorganiza |

## Os casos ambíguos
| Caso | Parece | É? | Como decidir |
|---|---|---|---|
| guarda movida para antes | refactor | ⚠ **SEGURANÇA** | a janela estava aberta |
| tipo alargado | refactor | ⚠ **SEGURANÇA** | o valor não cabia |
| validação extraída | refactor | ⚠ verificar | a função nova valida o mesmo? |
| função reescrita | refactor | ⚠ verificar | compare o comportamento |
| loop reescrito | refactor | ⚠ verificar | a condição mudou? |
| log adicionado | — | ✓ **não é** | só observa |

## ⚠ A REGRA
quando a dúvida é refactor ou segurança,
a resposta está no COMPORTAMENTO.
✓ rode os dois com a mesma entrada.
   a diferença decide.
EOF

cat refactor.md

echo
echo "═══ 7. o teste: comportamento como árbitro ═══"
echo

# demonstra com dois casos
cat > /tmp/caso1.c <<'EOF'
/* guarda movida para ANTES — parece refactor, é segurança */
#include <stdio.h>
#include <string.h>
int v1(const char *s, size_t n) {
    char b[16];
    memcpy(b, s, n);              /* ⚠ usa ANTES de validar */
    if (n > sizeof(b)) return -1; /* a validação estava aqui */
    return (int)n;
}
int main(int c, char **v){ if(c<2)return 2; printf("%d\n", v1(v[1], strlen(v[1]))); return 0; }
EOF

cat > /tmp/caso2.c <<'EOF'
/* guarda movida para antes — agora É segurança */
#include <stdio.h>
#include <string.h>
int v2(const char *s, size_t n) {
    char b[16];
    if (n > sizeof(b)) return -1; /* ✓ antes do uso */
    memcpy(b, s, n);
    return (int)n;
}
int main(int c, char **v){ if(c<2)return 2; printf("%d\n", v2(v[1], strlen(v[1]))); return 0; }
EOF

gcc -O0 -o /tmp/caso1 /tmp/caso1.c 2>/dev/null
gcc -O0 -o /tmp/caso2 /tmp/caso2.c 2>/dev/null

if [ -f /tmp/caso1 ] && [ -f /tmp/caso2 ]; then
    echo "  ── o mesmo caso, com a validação em duas ordens ──"
    echo
    echo "     ── entrada curta (3 bytes) ──"
    printf '     caso1: %s\n' "$(/tmp/caso1 abc 2>&1 | head -1)"
    printf '     caso2: %s\n' "$(/tmp/caso2 abc 2>&1 | head -1)"
    echo
    echo "     ── entrada longa (30 bytes) ──"
    printf '     caso1: %s\n' "$(/tmp/caso1 "$(python3 -c 'print("A"*30)')" 2>&1 | head -1)"
    printf '     caso2: %s\n' "$(/tmp/caso2 "$(python3 -c 'print("A"*30)')" 2>&1 | head -1)"
    echo
    echo "  ⚠ as duas versões têm a MESMA validação."
    echo "     a diferença é a ORDEM — e ela muda o COMPORTAMENTO."
    echo
    echo "  ✓ e é assim que você distingue refactor de segurança:"
    echo "     pela ENTRADA que faz o comportamento diferir."
fi
```

⚠ **A demonstração é o instrumento.** **As duas versões têm a **mesma** validação — e a **ordem**
muda o comportamento.** **É a forma 2 do módulo 3, e ela parece refactor.**

⚠ **E a lição é o critério:** **você não julga pela aparência do diff.** **Você julga pela entrada
que faz o comportamento diferir.** **É o módulo 5 e o módulo 8 convergindo.**

**Produza `refactor.md`:**

| Caso | Parece | É? | Como decidir |
|---|---|---|---|
| Guarda movida | | | |
| Tipo alargado | | | |
| Log adicionado | | | |

**Responda:**

1. **Qual critério é o mais direto?**
2. **Por que "guarda movida" parece refactor?**
3. **Como você decide** um caso ambíguo?
4. **O comportamento diferiu** na demonstração? Com qual entrada?

---

## 9.4 LAB — Caça a silent patch

**Duração:** 120 min

### Passo 1 — Escolha e filtre (40 min)

```bash
cd ~/patch-lab/mod09

echo "═══ CAÇANDO ═══"
echo
cat <<'EXPL'
  ── ESCOLHA O ALVO ──
     · projeto aberto com releases frequentes
     · duas versões CONSECUTIVAS
     · ⚠ e o par já verificado (módulo 2)

  ── SE NÃO TIVER REPO CLONADO ──
     git clone <url> ~/patch-lab/alvos/<projeto>
     cd ~/patch-lab/alvos/<projeto>
     git log --oneline -30          → veja a frequência

  ── SE PREFERIR O PAR DE TREINO ──
     ⚠ ele não tem histórico — mas você pode CRIAR um
     · faça um commit com a v1
     · e outro com a v2 (o patch)
     ✓ e pratique a busca
EXPL

# cria um repo de treino com histórico
mkdir -p ~/patch-lab/alvos/silent-treino && cd ~/patch-lab/alvos/silent-treino

if [ ! -d .git ]; then
    git init -q 2>/dev/null
    git config user.email "lab@local" 2>/dev/null
    git config user.name "lab" 2>/dev/null

    # v1 — "vulnerável"
    cat > parser.c <<'EOF'
#include <string.h>
#include <stdint.h>
#include <stdio.h>
int parse(const uint8_t *b, size_t n) {
    char dst[64];
    uint16_t count;
    memcpy(&count, b, 2);
    memcpy(dst, b+2, count);        /* ⚠ sem validação */
    return (int)count;
}
int main(int c, char**v){ if(c<2)return 2; printf("%d\n", parse((uint8_t*)v[1], strlen(v[1]))); return 0; }
EOF
    git add parser.c && git commit -qm "initial commit" 2>/dev/null

    # commit "inocente" — que na verdade é o patch
    sed -i 's|    memcpy(dst, b+2, count);        /\* ⚠ sem validação \*/|    if (count > sizeof(dst)) return -1;   /* typo fix */\n    memcpy(dst, b+2, count);|' parser.c
    git add parser.c && git commit -qm "fix typo in parser" 2>/dev/null

    # e um commit REALMENTE inocente
    echo "// nota" >> parser.c
    git add parser.c && git commit -qm "update README" 2>/dev/null

    echo "  ✓ repo de treino criado, com um commit 'fix typo' que é o patch"
fi

echo
echo "═══ OS COMMITS ═══"
git log --oneline 2>/dev/null | sed 's/^/  /'
echo
echo "  ⚠ UM deles é o silent patch — e a mensagem não diz."
echo

echo "═══ FILTRANDO ═══"
cd ~/patch-lab/alvos/silent-treino
bash ~/patch-lab/mod09/caca-silent.sh . HEAD~2 HEAD 2>&1 | head -25
```

Produza `caca-resultado.md`:

| Commit | Mensagem | Tamanho | Suspeito? |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantos commits o range tem?**
2. **Quantos têm CVE?** Portanto, quantos são candidatos?
3. **Qual commit é o silent patch?** Como você descobriu?
4. **A mensagem ajudou** ou atrapalhou?

### Passo 2 — Aplique o método (45 min)

⚠ **Para cada candidato: varredura, critério, confirmação.**

```bash
cd ~/patch-lab/alvos/silent-treino

echo "═══ APLICANDO O MÉTODO ═══"
echo
echo "  ── para cada candidato ──"
echo
for h in $(git log --format='%h %s' HEAD~2..HEAD 2>/dev/null | awk '{print $1}'); do
    msg=$(git log -1 --format='%s' "$h" 2>/dev/null)
    echo "  ── commit ${h}: \"${msg}\" ──"
    echo
    echo "     ── o diff ──"
    git show "$h" --stat 2>/dev/null | tail -3 | sed 's/^/       /'
    echo
    echo "     ── a varredura (módulo 3) ──"
    git show "$h" 2>/dev/null | grep -E '^\+' | grep -v '^+++' | \
        grep -E '\bif\b|>|<|=|\breturn\b' | head -6 | sed 's/^/       ⚠ /' || echo "       (nada)"
    echo
    echo "     ── o critério: o código passou a ACEITAR menos? ──"
    if git show "$h" 2>/dev/null | grep -qE '^\+.*\bif\s*\('; then
        echo "       ⚠ SIM — um `if` foi acrescentado"
        echo "       ✓ CANDIDATO A SILENT PATCH"
    else
        echo "       · não"
    fi
    echo
done

echo "═══ E A CONFIRMAÇÃO (módulo 8) ═══"
cat <<'EXPL'
  ⚠ com o código antes e depois do commit suspeito:

     git stash                                  # guarda o estado
     git checkout <hash>~1 -- parser.c          # versão ANTES
     gcc -o /tmp/antes parser.c
     git checkout <hash> -- parser.c            # versão DEPOIS
     gcc -o /tmp/depois parser.c
     git checkout HEAD -- parser.c              # volta

     ⚠ e teste com uma entrada que dispara:
        /tmp/antes  <entrada-longa>   → processa?
        /tmp/depois <entrada-longa>   → recusa?

  ✓ se o comportamento difere, o silent patch está CONFIRMADO.
     ⚠ e tudo no SEU clone.
EXPL

# executa a confirmação
if [ -f parser.c ]; then
    git show HEAD~1:parser.c > /tmp/antes.c 2>/dev/null
    git show HEAD:parser.c   > /tmp/depois.c 2>/dev/null
    gcc -O0 -o /tmp/antes /tmp/antes.c 2>/dev/null
    gcc -O0 -o /tmp/depois /tmp/depois.c 2>/dev/null

    if [ -f /tmp/antes ] && [ -f /tmp/depois ]; then
        echo
        echo "  ── confirmando ──"
        LONGA=$(python3 -c 'import sys;sys.stdout.buffer.write(b"\x50\x00"+b"A"*80)' 2>/dev/null)
        printf '     antes  : %s\n' "$(/tmp/antes  "$LONGA" 2>&1 | head -1)"
        printf '     depois : %s\n' "$(/tmp/depois "$LONGA" 2>&1 | head -1)"
        echo
        echo "  ⚠ o 'fix typo' era o SILENT PATCH."
    fi
fi
```

⚠ **A confirmação é o que transforma candidato em achado.** **O comportamento difere** — **e o
commit que dizia "fix typo" era a correção de segurança.**

⚠ **E é o argumento do curso inteiro:** **a mensagem do commit não é evidência; o diff é** — **e o
comportamento é o árbitro.**

**Produza `confirmacao.md`:**

| Commit | Tem `if` novo? | Comportamento difere? | É silent patch? |
|---|---|---|---|
| | | | |

**Responda:**

1. **Qual commit era o silent patch?** A mensagem dizia?
2. **O `if` foi acrescentado?** O critério funcionou?
3. **O comportamento diferiu?** Com qual entrada?
4. **Você testou no seu clone?** Confirme.

### Passo 3 — Registre e reporte (35 min)

Produza `caderno/PD-009.md`:

```markdown
# PD-009 — silent patch

**Data:** ____

## 1. O alvo e o range
| Item | Valor |
|---|---|
| Repo | |
| Tag A / tag B | |
| Commits no range | |
| Commits com CVE | |
| ⚠ **Candidatos a silent** | |

## 2. O filtro
| Filtro | Candidatos |
|---|---|
| commits pequenos, sem CVE | |
| mensagem de segurança | |
| comparações alteradas | |

## 3. A varredura (módulo 3)
| Commit | Forma (1–5) | O que mudou |
|---|---|---|
| | | |

## 4. O critério
| Commit | "aceita menos"? | Segurança? |
|---|---|---|
| | | |

## 5. A confirmação (módulo 8)
| Item | Antes | Depois |
|---|---|---|
| entrada | | |
| saída | | |
| ⚠ difere? | | |

## 6. A classificação
| Item | Valor |
|---|---|
| É silent patch? | |
| A mensagem dizia? | |
| ⚠ 1-day ou 0-day? | |

## 7. O invariante e o padrão
| Item | Valor |
|---|---|
| invariante | |
| **PADRÃO (sem nomes)** | |

## 8. O que fazer agora
| Destino | Canal |
|---|---|
| o mantenedor | security.txt / SECURITY.md |
| ⚠ publicar? | **NÃO** — divulgação coordenada |

## 9. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `registro-silent.md`:**

| Item | Valor |
|---|---|
| Commit | |
| Mensagem dizia | |
| É silent patch? | |
| Canal de reporte | |

**Responda:**

1. **O commit é silent patch?** Como você confirmou?
2. **A mensagem dizia a verdade?**
3. **Qual o canal de reporte?**
4. **Você vai publicar?** Por quê não?

### Critérios de aceitação

- `economia.md` com a comparação **CVE vs. silent patch**.
- Você explicou **por que ele rende mais**.
- Você explicou **o que substitui a descrição** e o CWE.
- `caca.md` com os **sete passos** da caça.
- Você identificou **qual passo define o silent patch**.
- Você aplicou o **critério de "é de segurança"**.
- Você explicou **por que `fix typo` pode esconder**.
- `caca-silent.sh` rodado num repositório.
- Você criou o **repo de treino** com o silent patch plantado.
- Você **encontrou o commit** que era o silent patch.
- `refactor.md` com os **quatro critérios**.
- Você explicou **por que "guarda movida" parece refactor**.
- A **demonstração** rodou e o comportamento diferiu.
- `confirmacao.md` mostrando **o antes e o depois**.
- Você confirmou que testou **no seu clone**.
- `caderno/PD-009.md` com as **nove** seções.
- Você escreveu o **padrão sem nomes**.
- Você respondeu **por que não publicar**.
- ⚠ **Nenhum alvo de terceiro.**

---

## Avaliação

1. **Por que existe um CVE para cada N patches?**
2. **Cite cinco motivos** de um patch ser silencioso.
3. **Por que o silent patch rende mais?** Cite a linha decisiva.
4. **O que você perde sem o CVE?** Cite quatro.
5. **O que substitui a descrição?** E o CWE?
6. **Cite os sete passos** da caça.
7. **Qual passo define o silent patch?** Por quê?
8. **Qual o critério de "é de segurança"?** Cite cinco sinais.
9. **Por que `fix typo` pode esconder?**
10. **Por que a mensagem do commit não é evidência?**
11. **Cite os quatro critérios** que distinguem segurança de refactor.
12. **Por que "guarda movida" parece refactor** e é segurança?
13. **Como decidir** um caso ambíguo?
14. **Cite três casos ambíguos** e como resolver cada.
15. **O que fazer quando a dúvida persiste?**
16. **Cite os quatro indicadores** que sobrevivem sem CVE.
17. **Por que o comportamento é o árbitro?**
18. **O que a demonstração mostrou** sobre ordem e comportamento?
19. **A quem reportar** um silent patch?
20. **Por que não publicar** sem coordenação?

---

**Próximo:** [Módulo 10 — Variante por ecossistema](modulo-10.md)
