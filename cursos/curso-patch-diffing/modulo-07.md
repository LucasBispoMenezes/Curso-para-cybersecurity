# Módulo 7 — Localizar o Código do Patch

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Entender o que **"localizar o código do patch"** significa — e por que não é a linha exata.
2. Aplicar o critério de **localização** — patch + referências.
3. Conhecer o `PLocator` e o `1dFuzz`, e o que cada um resolve.
4. Localizar **manualmente**, sem ferramenta — o critério antes da automatização.
5. Medir a **precisão** da localização — e saber o suficiente para reproduzir.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **"Localizar o código do patch" não é achar a linha que mudou. É achar o LUGAR onde o
> comportamento mudou** — **o suficiente para reproduzir.**

⚠ **E a distinção importa porque a expectativa errada paralisa.** **Você nunca vai ter a linha
exata no binário** — **não há linha.** **Há um endereço, um bloco, e uma função.**

| Nível de localização | Você tem | Suficiente para? |
|---|---|---|
| Arquivo | ⚠ Só com fonte | Navegar |
| **Função** | ✓ Endereço e nome | ⚠ **Reproduzir** |
| Bloco básico | ✓ Endereço | Refinar |
| Instrução | ✓ Endereço exato | ⚠ **Só se tiver o fonte** |

⚠ **A tese:** **a localização é o objetivo, e a função é o nível que basta.** **A linha exata é um
luxo que só existe com fonte** — **e não é necessária para reproduzir.**

⚠ **E é por isso que o `PLocator` fala em "localizar o código do patch":** **ele busca **a função**
entre um conjunto, dado o patch e duas referências.** **É o problema de localização, resolvido.**

---

## 7.1 O que significa localizar

⚠ **O problema, formalizado — e a razão de ele ser um problema.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ VOCÊ TEM                                                             │
│   · o patch (o diff de fonte, publicado)                             │
│   · dois binários: N-1 e N                                           │
│   · ⚠ e um diff de binário com 400 funções alteradas                  │
│                                                                      │
│ VOCÊ QUER                                                           │
│   · ⚠ EM QUAL das 400 está a correção                                │
│                                                                      │
│ O PROBLEMA                                                          │
│   · o patch é em FONTE, e você está no BINÁRIO                       │
│   · ⚠ a correspondência não é direta — o compilador transformou tudo │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **E a solução do `PLocator`, e ela é elegante:** **ele usa o patch de fonte para gerar uma
**assinatura** do código do patch** — **e busca essa assinatura nas funções do binário.** **Com
duas funções de referência** (a antes e a depois), ele **reduz a ambiguidade.**

⚠ **A tabela do que cada insumo dá:**

| Insumo | O que dá | Sem ele |
|---|---|---|
| **O patch de fonte** | ⚠ **a assinatura** | Você não sabe o que procurar |
| **As duas referências** | desambiguação | Pode casar em vários lugares |
| **O binário N-1** | o alvo da busca | — |
| **O binário N** | confirmação | — |

⚠ **A linha do patch de fonte é a que muda o problema.** **Sem ele, você tem o problema do módulo
5** — **400 funções e um critério.** **Com ele, você tem uma assinatura** — **e a busca fica muito
mais dirigida.**

⚠ **E a tabela de quando você tem cada coisa:**

| Situação | Você tem o patch? | Técnica |
|---|---|---|
| **CVE com patch publicado** | ✓ | ⚠ **`PLocator` / assinatura** |
| **Silent patch** | ⚠ **Não** | Módulo 9 — busca por forma |
| **Só o binário** | ⚠ Não | Módulo 5 — triagem |
| **Fonte e binário** | ✓✓ | Os dois, cruzados |

⚠ **A última linha é o ideal, e é onde você calibra.** **Com fonte **e** binário, você **sabe** onde
está a correção no fonte** — **e pode medir se a sua localização no binário acerta.** **É o exercício
do par de treino.**

```bash
mkdir -p ~/patch-lab/mod07 && cd ~/patch-lab/mod07

echo "═══ 1. o que significa localizar ═══"
echo
cat > localizar.md <<'EOF'
# O que significa localizar o código do patch

## Os níveis de localização
| Nível | Você tem | Suficiente para |
|---|---|---|
| arquivo | só com fonte | navegar |
| **função** | endereço + nome | ⚠ **REPRODUZIR** |
| bloco básico | endereço | refinar |
| instrução | endereço exato | só com fonte |

⚠ a FUNÇÃO é o nível que basta. a linha exata é luxo.

## Os quatro insumos
| Insumo | Dá | Sem ele |
|---|---|---|
| patch de fonte | ⚠ a ASSINATURA | não sabe o que procurar |
| duas referências | desambiguação | pode casar em vários lugares |
| binário N-1 | o alvo da busca | — |
| binário N | confirmação | — |

## Quando você tem cada coisa
| Situação | Tem o patch? | Técnica |
|---|---|---|
| CVE com patch publicado | ✓ | ⚠ `PLocator` / assinatura |
| silent patch | ⚠ não | módulo 9 |
| só o binário | ⚠ não | módulo 5 (triagem) |
| fonte E binário | ✓✓ | cruzar os dois ✓ CALIBRA |

## ⚠ O ideal: fonte e binário
com os dois, você SABE onde está no fonte
e pode MEDIR se a localização no binário acerta.
✓ é o exercício do par de treino.
EOF

cat localizar.md

echo
echo "═══ 2. o PLocator, e o que ele resolve ═══"
echo
cat <<'EXPL'
  ── O PROBLEMA ──
     você tem o patch (FONTE) e o binário.
     ⚠ a correspondência não é direta: o compilador transformou tudo.

  ── A SOLUÇÃO (PLocator) ──
     1. gera uma ASSINATURA do código do patch, a partir do fonte
     2. busca essa assinatura nas funções do BINÁRIO
     3. ⚠ usa DUAS funções de referência para desambiguar
     4. → diz em qual função o patch está

  ── POR QUE É ELEGANTE ──
     · não compara dois binários — compara PATCH com BINÁRIO
     · ⚠ e o patch diz O QUE procurar, o que reduz muito o espaço
     · a assinatura resolve o problema de "como o compilador transformou"

  ── E O 1dFUZZ, QUE RESOLVE OUTRA PARTE ──
     ⚠ ele vai além: depois de localizar, DIRIGE o fuzzer até lá
     · usa a "trailing call sequence" (TCS) do patch
     · mede a DISTÂNCIA de chamada até o alvo
     ✓ 2,26× mais achados, 43% menos tempo

     ✓ juntos: PLocator localiza, 1dFuzz reproduz.
EXPL
```

⚠ **A diferença entre os dois é a que organiza o módulo.** **O `PLocator` **localiza** — diz onde.
O `1dFuzz` **reproduz** — vai até lá e confirma.** **E os dois são complementares:** **localizar
sem reproduzir deixa a hipótese aberta; reproduzir sem localizar é força bruta.**

⚠ **E a elegância do `PLocator` merece a nota:** **ele não compara dois binários.** **Ele compara o
**patch de fonte** com o **binário** — **e o patch diz o que procurar.** **É uma busca dirigida, não
uma comparação exaustiva.**

**Produza `plocator.md`:**

| Item | PLocator | 1dFuzz |
|---|---|---|
| O que resolve | | |
| Insumo | | |
| Saída | | |

**Responda:**

1. **O que o `PLocator` compara?** Por que é mais dirigido?
2. **Para que servem as duas referências?**
3. **O que o `1dFuzz` faz depois de localizar?**
4. **Por que os dois são complementares?**

---

## 7.2 Localização manual — o critério

⚠ **O critério antes da ferramenta. Você pode localizar sem `PLocator` — e é o que treina o
julgamento.**

| # | Passo | O que faz |
|---|---|---|
| 1 | **Leia o patch** | Extrai a **assinatura**: que operações o patch acrescenta |
| 2 | **Traduza para o binário** | `if (x > C)` → `cmp` + branch; `memcpy` → `call` |
| 3 | **Procure a assinatura** | ⚠ **Nas funções que mudaram** (módulo 5) |
| 4 | **Desambigue** | Se há várias, use o **componente do CVE** |
| 5 | **Confirme** | ⚠ **Comportamental** (módulo 4) |

⚠ **O passo 2 é o que exige o curso de Assembly.** **Você traduz o patch de fonte para o que ele
**deve parecer** no binário:**

| No patch (fonte) | No binário (x86-64) |
|---|---|
| `if (x > 0x400) return -2;` | `cmp x, 0x400` + `jg/jle` + `mov eax, 0xfffffffe; ret` |
| `if (!valida(b, n)) return;` | `call valida` + `test eax, eax` + `je` |
| `c.total = (uint32_t)c.count * 4;` | `movzx eax, word [..]` + `shl eax, 2` |
| `memcpy(d, s, n);` | `mov edx, n` + `mov rsi, s` + `mov rdi, d` + `call memcpy` |

⚠ **A tabela da tradução é o instrumento.** **E note o `return -2`:** **a constante negativa
aparece como `0xfffffffe`** — **e uma constante nova no binário é um dos sinais mais fortes** (módulo
4, §4.2).

⚠ **A linha do `shl eax, 2` merece atenção.** **Multiplicar por 4 é `shl eax, 2`** — **e a
assinatura do patch é essa sequência.** **Você procura `shl` onde antes não tinha.**

⚠ **A regra escrita:**

> **Você não procura "o bug". Você procura a ASSINATURA do patch** — **a operação nova, a constante
> nova, a chamada nova.** **E a assinatura é derivada do patch de fonte.**

```bash
cd ~/patch-lab/mod07

echo "═══ 3. a tabela de tradução ═══"
echo
cat > traducao.md <<'EOF'
# Do patch (fonte) para o binário

## As traduções que você usa
| No patch (fonte) | No binário (x86-64) |
|---|---|
| `if (x > C) return -N;` | `cmp x, C` + `jg` + `mov eax, -N` + `ret` |
| `if (!valida(b, n)) return;` | `call valida` + `test eax,eax` + `je` |
| `x * 4` | `shl eax, 2` |
| `x * 8` | `shl eax, 3` |
| `memcpy(d, s, n);` | `mov edx/rsi/rdi` + `call memcpy` |
| `x >= y` | `cmp x, y` + `jge` |
| `x <= y` | `cmp x, y` + `jle` |
| `return -2;` | `mov eax, 0xfffffffe` + epílogo |
| `(uint16_t)x` | `movzx` |
| `if (p == NULL)` | `test p, p` + `je` |

## ⚠ O sinal da assinatura
| Assinatura | Procure por |
|---|---|
| comparação nova | `cmp` com constante que não existia |
| branch novo | `jXX` que não existia |
| chamada nova | `call` a função que não era chamada ali |
| **constante nova** | ⚠ **`mov eax, 0x...` que só aparece em N** |
| shift novo | `shl`/`shr` onde antes não tinha |

## O critério de localização
1. leia o patch → extraia a ASSINATURA
2. traduza para o binário
3. procure nas funções que mudaram (módulo 5)
4. desambigue com o componente do CVE
5. ⚠ CONFIRME por comportamento
EOF

cat traducao.md

echo
echo "═══ 4. localizando no par de treino ═══"
echo
echo "  ── a assinatura do patch do par de treino ──"
echo
cat <<'EXPL'
  ── O PATCH (fonte) ──
     + if (c.count > MAX_ITEMS) return -2;
       c.total = (uint32_t)c.count * 4;
     + if (c.total > sizeof(dst)) return -3;
       memcpy(dst, buf + sizeof(c), c.total);

  ── A ASSINATURA, traduzida ──
     1. ⚠ uma COMPARAÇÃO nova:  `cmp` com 0x400 (MAX_ITEMS = 1024)
     2. ⚠ um BRANCH novo:       `jle`/`jg` que não existia
     3. ⚠ uma CONSTANTE nova:   0x400  e  0xfffffffe (o return -2)
     4. ⚠ uma SEGUNDA comparação: `cmp` com 0x40 (sizeof(dst) = 64)
     5. e o `shl` da multiplicação (já existia)

  ── ONDE PROCURAR ──
     ⚠ nas funções que MUDARAM (módulo 5)
     e a assinatura diz QUAL: a que tem uma comparação nova

  ✓ e você confirma: a função que tem um `cmp` novo é o candidato.
EXPL

cd ~/patch-lab/alvos/treino 2>/dev/null && {
    echo
    echo "  ── procurando a assinatura no pares real ──"
    objdump -d -M intel verso_antigo > /tmp/LA.asm 2>/dev/null
    objdump -d -M intel verso_novo   > /tmp/LB.asm 2>/dev/null

    echo "     ── constantes novas (as que só aparecem em N) ──"
    ca=$(grep -oE '0x[0-9a-f]{2,}' /tmp/LA.asm | sort -u)
    cb=$(grep -oE '0x[0-9a-f]{2,}' /tmp/LB.asm | sort -u)
    comm -13 <(echo "$ca") <(echo "$cb") | head -8 | sed 's/^/        ⚠ /'

    echo
    echo "     ── comparações novas ──"
    na=$(grep -cE '\bcmp\b' /tmp/LA.asm)
    nb=$(grep -cE '\bcmp\b' /tmp/LB.asm)
    printf '        cmp em A: %s   cmp em B: %s   diferença: %s\n' "$na" "$nb" "$((nb-na))"

    echo
    echo "     ── branches novos ──"
    ba=$(grep -cE '\bj[a-z]+\b' /tmp/LA.asm)
    bb=$(grep -cE '\bj[a-z]+\b' /tmp/LB.asm)
    printf '        branches em A: %s   em B: %s   diferença: %s\n' "$ba" "$bb" "$((bb-ba))"
    echo
    echo "  ✓ a assinatura está nas constantes e nos branches novos."
    echo "     ⚠ e a função que os contém é o CANDIDATO."
}
```

⚠ **A procura pela assinatura é o que localiza.** **Constantes novas, branches novos, chamadas
novas** — **cada uma é um pedaço da assinatura do patch.**

⚠ **E é muito mais dirigido que o módulo 5.** **Lá você tinha 400 funções e um critério.** **Aqui
você tem a assinatura** — **e procura por ela.** **É a diferença que o `PLocator` explora em
escala.**

**Produza `traducao.md`:**

| No patch (fonte) | No binário |
|---|---|
| `if (x > C)` | |
| `x * 4` | |
| `return -2` | |
| `memcpy` | |

**Responda:**

1. **Como `return -2` aparece** no binário?
2. **Como a multiplicação por 4** aparece?
3. **Qual sinal da assinatura é o mais forte?** Por quê?
4. **Quantas constantes novas** o par de treino tem?

---

## 7.3 Medindo a precisão

⚠ **A localização tem precisão. E você a mede — porque tem a resposta.**

| Situação | Você sabe a resposta? | Pode medir? |
|---|---|---|
| **Par de treino** | ✓ Sim | ✓✓ **Sim** |
| **CVE com fonte** | ✓ Sim (no fonte) | ✓ Sim |
| **Silent patch** | ⚠ Não | ⚠ Não — é o módulo 9 |
| **Binário comercial sem fonte** | ⚠ Não | ⚠ Parcial |

⚠ **A tabela da precisão, com o que medir:**

| Métrica | O que significa |
|---|---|
| **Posição na lista** | A função do patch estava em qual posição? |
| **Cobertura** | Você achou a função certa? |
| **Falso positivo** | Quantas você achou que eram e não eram? |
| **Suficiente** | Você consegue reproduzir com o que localizou? |

⚠ **A linha da cobertura é a mais importante.** **Se você localizou a função **e confirmou o
comportamento**, a localização foi bem-sucedida** — **mesmo que a posição na lista fosse 30.**

⚠ **E a tabela do que fazer com a precisão:**

| Resultado | Ação |
|---|---|
| Achou em 1º lugar | ✓ Ótimo — e foi sorte ou símbolos |
| Achou em 2–10º | ✓ **Normal e suficiente** |
| Achou em 10–50º | · Aceitável — mas revise o filtro |
| ⚠ **Não achou** | ⚠ **Revise a assinatura** — o patch faz outra coisa |
| Achou e não confirmou | · A hipótese fica **aberta** |

⚠ **A linha do "não achou" é a mais informativa.** **Se a assinatura que você derivou não localiza
nada, uma de duas:** **você traduziu errado** — **ou o compilador otimizou de forma que a assinatura
desapareceu.** **As duas são resultado.**

⚠ **E a segunda é real:** **com `-O2`, o compilador pode eliminar a comparação** — **se ele provar
que é sempre verdadeira.** **É o módulo 5 do curso de C, e reaparece aqui.**

⚠ **A regra escrita:**

> **Localizar é hipótese.** **A confirmação é comportamental.** **E se a localização falha, isso
> também diz algo sobre o binário.**

```bash
cd ~/patch-lab/mod07

echo "═══ 5. medindo a precisão ═══"
echo
cat > precisao.md <<'EOF'
# Medindo a precisão da localização

## O que medir
| Métrica | Valor |
|---|---|
| Posição na lista | |
| Cobertura (achou a função certa?) | |
| Falsos positivos | |
| Suficiente para reproduzir? | |

## O que cada resultado significa
| Resultado | Ação |
|---|---|
| achou em 1º | ✓ ótimo |
| achou em 2–10º | ✓ NORMAL e suficiente |
| achou em 10–50º | · aceitável — revise o filtro |
| ⚠ NÃO achou | ⚠ revise a ASSINATURA |
| achou e não confirmou | · hipótese em ABERTO |

## ⚠ E se a assinatura desapareceu?
| Causa | O que fazer |
|---|---|
| você traduziu errado | revise a tabela (§7.2) |
| o compilador OTIMIZOU | ⚠ pode ter eliminado a comparação |
| o patch faz outra coisa | ⚠ releia o patch |

⚠ com -O2, o compilador pode eliminar uma comparação
   se provar que é sempre verdadeira.
✓ é o módulo 5 do curso de C, e reaparece aqui.

## O critério
locALIZAR é hipótese. CONFIRMAR é comportamental.
⚠ e falhar também diz algo sobre o binário.
EOF

cat precisao.md

echo
echo "═══ 6. e se o compilador eliminou a verificação? ═══"
echo
cat > demo-elimina.c <<'EOF'
/*
 * ⚠ DEMONSTRAÇÃO: o compilador pode ELIMINAR a verificação.
 *   É o módulo 5 do curso de C, no contexto do patch diffing.
 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>

#define MAX_ITEMS 1024

/* ⚠ versão com a verificação */
int com_verificacao(uint16_t count) {
    if (count > MAX_ITEMS) return -2;   /* ⚠ o compilador SABE que isso
                                           nunca é verdade — count é uint16,
                                           e 65535 > 1024 é possível... */
    return (int)count;
}

/* ⚠ e o caso em que ele PODE eliminar: */
int elimina(void) {
    uint8_t count = 200;                /* ⚠ C é uint8: máximo 255 */
    if (count > MAX_ITEMS) return -2;   /* ✓ o compilador PROVA que é falso */
    return (int)count;                  /* e REMOVE a verificação */
}

int main(void) {
    printf("%d %d\n", com_verificacao(5), elimina());
    return 0;
}
EOF

gcc -O2 -o /tmp/elim /tmp/demo-elimina.c 2>/dev/null
if [ -f /tmp/elim ]; then
    echo "  ── as duas funções, com -O2 ──"
    objdump -d -M intel /tmp/elim 2>/dev/null | \
        awk '/<com_verificacao>:/,/^$/' | head -12 | sed 's/^/     /'
    echo
    echo "  ── e a segunda ──"
    objdump -d -M intel /tmp/elim 2>/dev/null | \
        awk '/<elimina>:/,/^$/' | head -10 | sed 's/^/     /'
    echo
    echo "  ⚠ compare: uma tem o `cmp`, a outra NÃO."
    echo "     ✓ o compilador eliminou a verificação que ele provou inútil."
    echo
    echo "  ⚠ E É POR ISSO que a assinatura pode desaparecer:"
    echo "     se o tipo tornasse a verificação inútil, ela não está no binário."
    echo "     ✓ e aí a localização por assinatura FALHA — e isso é resultado."
fi
```

⚠ **A demonstração é a ponte com o curso de C.** **O compilador **remove** a verificação que ele
prova ser sempre falsa.** **E aí a assinatura desaparece** — **e a localização por constante nova
falha.**

⚠ **E é por isso que o `PLocator` usa **duas referências**: `** porque a assinatura sozinha pode não
bastar.** **As referências dão o contexto da função — e o contexto sobrevive à otimização.**

⚠ **A regra escrita:** **se a localização por assinatura falha, suspeite da otimização** — **e mude
para o critério do módulo 5 (mudança de fluxo).** **Um dos dois funciona.**

**Produza `eliminacao.md`:**

| Função | Tem `cmp`? | Por quê |
|---|---|---|
| `com_verificacao` | | |
| `elimina` | | |

**Responda:**

1. **Qual das duas manteve o `cmp`?** Por quê?
2. **O que acontece com a assinatura** quando o compilador elimina?
3. **Como o `PLocator` contorna** isso? (Dica: as referências.)
4. **O que fazer se a localização por assinatura falha?**

---

## 7.4 LAB — Localização medida

**Duração:** 120 min

### Passo 1 — Localize no par de treino (40 min)

⚠ **Você **sabe** a resposta: é o `parse_item`. Meça se a sua localização acerta.**

```bash
cd ~/patch-lab/alvos/treino 2>/dev/null || cd ~/patch-lab/mod07

echo "═══ LOCALIZANDO ═══"
echo
cat <<'EXPL'
  ── ANTES DE OLHAR A RESPOSTA ──

     1. extraia a assinatura do patch (módulo 7.2)
     2. traduza para o binário
     3. procure nas funções que mudaram
     4. ⚠ ANOTE em que posição a sua localização colocou o candidato
     5. SÓ ENTÃO confira se é o `parse_item`
EXPL

cd ~/patch-lab/alvos/treino 2>/dev/null && {
    echo
    echo "  ── 1. as funções e a contagem ──"
    for f in $(grep -oE '<[A-Za-z_][\w.]*>:?' /tmp/LA.asm 2>/dev/null | tr -d '<>:?' | sort -u); do
        na=$(awk "/<$f>:/,/^$/" /tmp/LA.asm 2>/dev/null | wc -l)
        nb=$(awk "/<$f>:/,/^$/" /tmp/LB.asm 2>/dev/null | wc -l)
        ca=$(awk "/<$f>:/,/^$/" /tmp/LA.asm 2>/dev/null | grep -cE '\bcmp\b')
        cb=$(awk "/<$f>:/,/^$/" /tmp/LB.asm 2>/dev/null | grep -cE '\bcmp\b')
        [ "$na" != "$nb" ] || [ "$ca" != "$cb" ] && \
            printf '     %-24s linhas %s→%s   cmp %s→%s  %s\n' "$f" "$na" "$nb" "$ca" "$cb" \
                "$([ "$ca" != "$cb" ] && echo '⚠ CANDIDATO' || echo '·')"
    done

    echo
    echo "  ── 2. a assinatura: constantes novas ──"
    comm -13 <(grep -oE '0x[0-9a-f]{2,}' /tmp/LA.asm | sort -u) \
             <(grep -oE '0x[0-9a-f]{2,}' /tmp/LB.asm | sort -u) | head -6 | sed 's/^/     ⚠ /'

    echo
    echo "  ── 3. ⚠ ONDE ESTÁ A ASSINATURA? ──"
    echo "     procure a função que contém as constantes novas"
    for f in parse_item main; do
        n=$(awk "/<$f>:/,/^$/" /tmp/LB.asm 2>/dev/null | grep -cE '0x400|0xffffff')
        [ "$n" -gt 0 ] && printf '     ⚠ %s contém %s constante(s) da assinatura\n' "$f" "$n"
    done
} || echo "  ⚠ rode o módulo 2"
```

Produza `localizacao.md`:

| Item | Valor |
|---|---|
| Assinatura | |
| Posição na minha lista | |
| Função correta | |
| Acertou? | |

**Responda:**

1. **Qual assinatura você extraiu?**
2. **Em que posição** a sua localização colocou o candidato?
3. **Acertou?** Era o `parse_item`?
4. **Se não**, o que a sua lista colocou em primeiro? Era ruído?

### Passo 2 — Compare as técnicas de localização (45 min)

⚠ **Três formas de localizar. Compare no mesmo par.**

```bash
cd ~/patch-lab/mod07

echo "═══ TRÊS TÉCNICAS DE LOCALIZAÇÃO ═══"
echo
cat <<'EXPL'
  ── A) POR ASSINATURA (o PLocator, manual) ──
     · extraia a assinatura do patch
     · procure as constantes/branches/chamadas novas
     · ⚠ é DIRIGIDA — o patch diz o que procurar
     ✓ rápida quando o patch está publicado
     ⚠ falha se o compilador otimizou

  ── B) POR MUDANÇA DE FLUXO (o módulo 5) ──
     · filtre por branch novo, contagem de instruções
     · ⚠ NÃO depende do patch — funciona com silent patch
     ✓ robusta à otimização
     ⚠ menos dirigida

  ── C) POR COMPONENTE (do CVE) ──
     · o advisory diz o componente
     · ⚠ leia só as funções dele primeiro
     ✓ a mais rápida quando o componente é preciso
     ⚠ inútil sem CVE

  ── O IDEAL ──
     A + B + C: a assinatura dirige, o fluxo confirma,
     e o componente restringe.
EXPL

cat > tres-tecnicas.md <<'EOF'
# Três técnicas de localização

## A — POR ASSINATURA
| Item | Valor |
|---|---|
| Insume | o patch de fonte |
| Depende do patch? | ✓ sim |
| Robusta à otimização? | ⚠ não |
| Velocidade | ✓ alta |
| Use quando | CVE com patch publicado |

## B — POR MUDANÇA DE FLUXO
| Item | Valor |
|---|---|
| Insumo | os dois binários |
| Depende do patch? | ⚠ não |
| Robusta à otimização? | ✓ sim |
| Velocidade | · média |
| Use quando | ⚠ **silent patch**, ou assinatura falhou |

## C — POR COMPONENTE
| Item | Valor |
|---|---|
| Insumo | o advisory / CVE |
| Depende do patch? | parcial |
| Robusta? | ✓ |
| Velocidade | ✓✓ a mais alta |
| Use quando | ⚠ o CVE diz o componente |

## A combinação ideal
A (dirige) + C (restringe) + B (confirma)

## Qual usar
| Situação | Técnica |
|---|---|
| CVE com patch, componente claro | A + C |
| CVE vago | A + B |
| **silent patch** | ⚠ **B** |
| sem fonte nenhuma | B |
EOF

cat tres-tecnicas.md
```

Produza `tres-tecnicas.md`:

| Técnica | Depende do patch? | Robusta à otimização? | Quando usar |
|---|---|---|---|
| A — assinatura | | | |
| B — fluxo | | | |
| C — componente | | | |

**Responda:**

1. **Qual técnica é a mais rápida?** E a mais robusta?
2. **Qual funciona sem o patch?** Por quê?
3. **Por que a assinatura falha** com otimização?
4. **Qual combinação o curso recomenda?**

### Passo 3 — Registre e ligue (35 min)

Produza `caderno/PD-007.md`:

```markdown
# PD-007 — localização do código do patch

**Data:** ____

## 1. O insumo
| Item | Valor |
|---|---|
| Patch disponível? | |
| CVE / componente | |
| Par (proveniência OK?) | |

## 2. A assinatura extraída
| # | Elemento | Tradução para o binário |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

## 3. A busca
| Técnica | Usada? | Resultado |
|---|---|---|
| A — assinatura | | |
| B — fluxo | | |
| C — componente | | |

## 4. A localização
| Item | Valor |
|---|---|
| Função localizada | |
| Posição na lista | |
| Nível (função / bloco / instrução) | |

## 5. A confirmação
| Item | Valor |
|---|---|
| Comportamento difere? | |
| Entrada usada | |
| ⚠ Alvo | o meu |

## 6. A precisão
| Métrica | Valor |
|---|---|
| cobertura (achou a certa?) | |
| falsos positivos | |
| suficiente para reproduzir? | |

## 7. O invariante e o padrão
| Item | Valor |
|---|---|
| invariante | |
| **PADRÃO (sem nomes)** | |

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O que isso destrava
[o irmão — módulo 10]
```

**Produza `registro-localizacao.md`:**

| Item | Valor |
|---|---|
| Técnica usada | |
| Função localizada | |
| Precisão | |
| Confirmado? | |

**Responda:**

1. **Qual técnica localizou?** Em que posição?
2. **A confirmação comportamental** passou?
3. **O padrão, sem nomes** — escreva.
4. **Cite três itens** do que não verificou.

### Critérios de aceitação

- `localizar.md` com os **quatro** níveis e o que basta para reproduzir.
- Você explicou **por que a função é o nível suficiente**.
- `plocator.md` comparando `PLocator` e `1dFuzz`.
- Você explicou **o que o `PLocator` compara** — e por que é mais dirigido.
- `traducao.md` com **pelo menos oito** traduções fonte → binário.
- Você explicou **como `return -2` aparece** no binário.
- Você aplicou o critério de localização **em cinco passos**.
- `precisao.md` com as **quatro** métricas.
- Você explicou **o que fazer se a assinatura desapareceu**.
- A **demonstração da eliminação** pelo compilador rodou.
- Você explicou **por que as duas referências do `PLocator` ajudam**.
- `localizacao.md` com a **posição medida** da sua localização.
- `tres-tecnicas.md` com as três técnicas comparadas.
- Você explicou **qual funciona sem o patch** (silent patch).
- Você combinou **A + C + B** no seu exercício.
- `caderno/PD-007.md` preenchida com as **nove** seções.
- Você citou **três itens** do que não verificou.
- ⚠ **Nenhum alvo de terceiro.**

---

## Avaliação

1. **O que significa "localizar o código do patch"?**
2. **Por que a função é o nível suficiente?** Quando a linha exata existe?
3. **Cite os quatro insumos** e o que cada um dá.
4. **O que o `PLocator` compara?** Por que é mais dirigido?
5. **Para que servem as duas referências?**
6. **O que o `1dFuzz` faz** depois de localizar?
7. **Por que os dois são complementares?**
8. **Cite os cinco passos** da localização manual.
9. **Como `if (x > C) return -2` aparece** no binário?
10. **Como `x * 4` aparece?**
11. **Qual sinal da assinatura é o mais forte?** Por quê?
12. **Qual é o risco de depender só da assinatura?**
13. **Cite as quatro métricas de precisão.**
14. **Qual resultado de posição é normal e suficiente?**
15. **O que fazer quando a localização falha?**
16. **Como o compilador pode eliminar a assinatura?** Dê o exemplo.
17. **Por que isso é o módulo 5 do curso de C?**
18. **Como contornar quando a assinatura desapareceu?**
19. **Cite as três técnicas de localização.**
20. **Qual funciona com silent patch?** Por quê?

---

**Próximo:** [Módulo 8 — Reproduzir o 1-day](modulo-08.md)
