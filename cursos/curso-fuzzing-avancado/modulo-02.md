# Módulo 2 — Escolher o Alvo

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Reconhecer o que torna um alvo **fértil** — e o que o torna estéril.
2. Usar as três fontes de sinal: **histórico, código e instrumentação**.
3. Mapear a **superfície de entrada** de um alvo.
4. Distinguir **parsing** de **lógica** — e o que cada fuzzer alcança.
5. Escrever o **plano de campanha** — antes de rodar.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **A maioria do código não tem bug alcançável por fuzzing.** **E escolher um alvo estéril não é
> falha do fuzzer — é falha da escolha.**

⚠ **E o custo da escolha errada é o pior possível:** **você descobre em 48 horas** — **depois de
escrever o harness e o corpus.**

⚠ **A tese:**

> **Escolha o alvo onde três sinais coincidem:** **já teve bugs, tem código complexo, e você sabe
> como alcançá-lo.**

⚠ **A tabela dos três sinais:**

| Sinal | O que indica | ⚠ Onde se lê |
|---|---|---|
| **Histórico** | ⚠ **A área é fértil** | CVEs, commits de fix |
| **Complexidade** | Há onde errar | Contagem, ciclos |
| ⚠ **Alcançabilidade** | ⚠ **Você chega lá** | O harness |

⚠ **A terceira linha é a que você controla.** **As duas primeiras são propriedades do alvo; a
terceira é o seu trabalho** — **e é o módulo 3.**

---

## 2.1 O que torna um alvo fértil

⚠ **Cinco características. E elas são observáveis antes de escrever qualquer código.**

| # | Característica | ⚠ Por quê |
|---|---|---|
| 1 | **Entrada estruturada** | ⚠ **Há fronteiras** |
| 2 | **Já teve bugs** | ⚠ **A área é fértil** |
| 3 | **Complexidade alta** | Onde errar |
| 4 | **Código antigo, sem fuzzing** | ⚠ **Ninguém olhou** |
| 5 | **Sem sanitizer no CI** | ⚠ **Bugs acumulados** |

⚠ **A quarta e a quinta linhas juntas descrevem a maior parte do código aberto.** **E é o que o
`Oss-Fuzz` explora:** **milhares de bugs em código que "todo mundo usa"** — **porque ninguém o
fuzzou.**

⚠ **E a tabela do que torna um alvo **estéril:**

| Característica | ⚠ Por quê |
|---|---|
| Entrada trivial | Superfície mínima |
| ⚠ **Já muito fuzzado** | ⚠ **Os fáceis já saíram** |
| Código bem revisado | Pouco a achar |
| Sem sanitizer no CI **e** já fuzzado | ⚠ **Nada sobrou** |
| ⚠ **Harness impossível** | ⚠ **Você não chega lá** |

⚠ **A linha do "já muito fuzzado" é a que exige o critério do módulo 8.** **Um alvo exaustivamente
fuzzado por crash ainda pode ter bugs de **lógica** — **porque o oráculo foi fraco.** **É aí que o
`1dFuzz` e o diferencial entram.**

⚠ **A regra escrita:**

> **Um alvo estéril por crash pode ser fértil por diferencial.** **A pergunta não é "os bugs
> acabaram?" — é "com que oráculo?".**

```bash
mkdir -p ~/fuzz-lab/mod02 && cd ~/fuzz-lab/mod02

echo "═══ 1. o que torna um alvo fértil ═══"
echo
cat > fertil.md <<'EOF'
# O que torna um alvo fértil

## As cinco características
| # | Característica | Por quê |
|---|---|---|
| 1 | entrada ESTRUTURADA | ⚠ há FRONTEIRAS |
| 2 | já teve BUGS | ⚠ a área é FÉRTIL |
| 3 | COMPLEXIDADE alta | onde errar |
| 4 | código ANTIGO, sem fuzzing | ⚠ NINGUÉM OLHOU |
| 5 | sem sanitizer no CI | ⚠ bugs ACUMULADOS |

## O que torna ESTÉRIL
| Característica | Por quê |
|---|---|
| entrada trivial | superfície mínima |
| ⚠ JÁ MUITO FUZZADO | ⚠ os fáceis já saíram |
| código bem revisado | pouco a achar |
| ⚠ HARNESS impossível | ⚠ você NÃO CHEGA LÁ |

## ⚠ a linha do "já muito fuzzado"
um alvo exaustivo por CRASH ainda pode ter bugs de LÓGICA —
porque o ORÁCULO foi fraco.
✓ é aí que o 1dFuzz e o diferencial entram.

## ⚠ A REGRA
um alvo estéril por CRASH pode ser fértil por DIFERENCIAL.
a pergunta não é "os bugs acabaram?" —
é "COM QUE ORÁCULO?".
EOF

cat fertil.md

echo
echo "═══ 2. as três fontes de sinal ═══"
echo
cat <<'EXPL'
  ── 1. HISTÓRICO ──
     · CVEs anteriores no componente
     · ⚠ commits com "fix bound", "overflow", "check"
     · o CHANGELOG
     ✓ e a lição do Patch Diffing:
        ⚠ o patch é a documentação do bug.

  ── 2. CÓDIGO ──
     · onde há parsing
     · onde há aritmética com dado externo
     · ⚠ onde há memcpy, malloc, índices
     · complexidade ciclomática

  ── 3. INSTRUMENTAÇÃO ──
     · ⚠ RODAR o fuzzer por pouco tempo
     · e olhar a COBERTURA
     ✓ se ela não cresce, o harness ou o corpus estão errados
       — não o alvo.

  ⚠ e a terceira é a mais barata de todas:
     uma hora de fuzz diz mais que um dia de leitura.
EXPL
```

⚠ **As três fontes são o instrumento do módulo.** **E a terceira é a mais econômica:** **uma hora de
fuzz responde o que a leitura leva um dia para sugerir.**

⚠ **E a nota do histórico é a lição do Patch Diffing:** **onde já houve bug, há mais** — **porque a
mesma equipe, no mesmo estilo, erra parecido.**

**Produza `fertil.md`:**

| Característica | Por quê |
|---|---|
| Entrada estruturada | |
| Já teve bugs | |
| Harness impossível | |

**Responda:**

1. **Quais características são observáveis antes de codar?
2. **Por que "já muito fuzzado" não significa estéril?
3. **Qual das três fontes é a mais barata?** Por quê?
4. **O que a cobertura que não cresce indica?

---

## 2.2 A superfície de entrada

⚠ **O mapa do alvo: **por onde a entrada chega, e quantas fronteiras há.**

| Elemento | O que mapear |
|---|---|
| **Os pontos de entrada** | Quantos? |
| ⚠ **Os campos** | ⚠ **Quantos, e de que tipo** |
| ⚠ **As fronteiras** | ⚠ **O limite de cada campo** |
| Os caminhos | Quantos ramos entre a entrada e o uso |
| ⚠ **O tamanho** | ⚠ **Mínimo e máximo** |

⚠ **A tabela dos campos, e é ela que vira o corpus** (módulo 5):

| Campo | Tipo | ⚠ Fronteira |
|---|---|---|
| `count` | `uint16_t` | ⚠ **1024** |
| `total` | `uint32_t` | ⚠ **64 (o tamanho do destino)** |
| dados | bytes | ⚠ **O tamanho declarado** |

⚠ **A tabela é o **mapa de fronteiras** — **e é o pré-requisito do corpus.** **Sem ela, você não sabe
o que testar; e sem testar a fronteira, o fuzzer muta no escuro.**

⚠ **E é a mesma tabela do módulo 5 do Parser Differentials.** **A diferença é o uso:** **lá, ela
media a divergência; aqui, ela **guia** a mutação.**

⚠ **A regra escrita:**

> **O mapa de fronteiras é o corpus em potencial.** **Cada campo com limite é um caso; cada limite é
> um arquivo.** **E o mapa é o que o fuzzer não consegue construir sozinho.**

```bash
cd ~/fuzz-lab/mod02

echo "═══ 3. a superfície de entrada ═══"
echo
cat > superficie.md <<'EOF'
# A superfície de entrada

## O que mapear
| Elemento | O que mapear |
|---|---|
| os pontos de ENTRADA | quantos? |
| ⚠ os CAMPOS | quantos, e de que tipo |
| ⚠ as FRONTEIRAS | o limite de cada campo |
| os CAMINHOS | quantos ramos até o uso |
| ⚠ o TAMANHO | mínimo e máximo |

## O mapa de fronteiras
| # | Campo | Tipo | ⚠ Fronteira |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## ⚠ e é ele que vira o CORPUS (módulo 5)
cada campo com limite é um caso.
cada limite é um arquivo.
✓ e é o que o fuzzer NÃO consegue construir sozinho.

## ⚠ a mesma tabela do Parser Differentials
lá, ela media a DIVERGÊNCIA.
aqui, ela GUIA a mutação.
EOF

cat superficie.md

echo
echo "═══ 4. parsing × lógica ═══"
echo
cat <<'EXPL'
  ── DUAS FAMÍLIAS DE BUG, E O FUZZER ALCANÇA UMA MELHOR ──

  ── BUG DE PARSING / MEMÓRIA ──
     · overflow, use-after-free, null deref
     · ⚠ o oráculo é o SANITIZER
     ✓ e o fuzzer acha TRIVIALMENTE
     ⚠ mas está SATURADO na maioria do código maduro

  ── BUG DE LÓGICA ──
     · verificação ausente num caminho
     · ⚠ ordem errada
     · confusão de tipo
     ✓ e o oráculo NÃO pode ser o crash
     ⚠ porque o código NÃO CRASHA — ele faz a coisa errada

  ── E É AÍ QUE ENTRA O DIFERENCIAL ──
     ⚠ o bug de lógica só aparece quando você compara
        com o que DEVERIA acontecer.
     ✓ o diferencial e o invariante são os oráculos dele.
EXPL
```

⚠ **A distinção parsing × lógica é o argumento do curso.** **E ela explica por que um alvo "já
fuzzado" ainda rende:** **o crash achou tudo o que crasha; a lógica ficou.**

⚠ **E a ponte com o módulo 7 é direta:** **o bug de lógica exige um oráculo que não é o
sanitizer** — **e é o diferencial do curso anterior.**

**Produza `parsing-logica.md`:**

| Família | Oráculo | ⚠ Saturação |
|---|---|---|
| Parsing / memória | | |
| Lógica | | |

**Responda:**

1. **Qual família o sanitizer pega?
2. **Por que o bug de lógica não crasha?
3. **Qual oráculo o bug de lógica exige?
4. **Por que um alvo já fuzzado ainda rende?

---

## 2.3 O plano de campanha

⚠ **O instrumento do módulo: **o plano, escrito **antes** de rodar.**

| Campo | Valor |
|---|---|
| **O alvo** | E o critério |
| ⚠ **A superfície** | O mapa de fronteiras |
| **O harness** | Como a entrada chega |
| **O corpus** | ⚠ **O que as sementes cobrem** |
| ⚠ **O oráculo** | ⚠ **O que conta como bug** |
| **O tempo** | ⚠ **O orçamento** |
| ⚠ **A triagem** | ⚠ **Quem vai triar** |

⚠ **A linha da triagem é a que ninguém escreve e a que decide o sucesso.** **Se você não sabe quem
vai olhar os crashes, não sabe quantos pode gerar** — **e é o módulo 11.**

⚠ **E a tabela dos dois planos, comparados:**

| | Plano fraco | ⚠ Plano forte |
|---|---|---|
| Alvo | "achei interessante" | ⚠ **3 sinais** |
| Corpus | o que veio | ⚠ **fronteiras** |
| Oráculo | crash | ⚠ **crash + diferencial** |
| Tempo | "até achar" | ⚠ **orçamento** |
| ⚠ Triagem | ⚠ **"depois eu vejo"** | ⚠ **"eu, 2h/dia"** |

⚠ **A regra escrita:**

> **O plano cabe numa página, e ele é escrito antes.** **Se você não sabe o que vai triar, a
> campanha vai gerar mais do que você pode olhar** — **e o resultado é a pasta `crashes/` com 200
> arquivos e nenhuma conclusão.**

```bash
cd ~/fuzz-lab/mod02

echo "═══ 5. o plano de campanha ═══"
echo
cat > plano.md <<'EOF'
# O plano de campanha

## 1. O alvo
| Item | Valor |
|---|---|
| O que é | |
| De onde veio | |
| ⚠ Histórico de bugs | |
| ⚠ Complexidade | |

## 2. A superfície
| # | Campo | Tipo | Fronteira |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 3. O harness
| Item | Valor |
|---|---|
| Como a entrada chega | |
| ⚠ O que NÃO faço no harness | |

## 4. O corpus
| Item | Valor |
|---|---|
| quantas sementes | |
| ⚠ o que cada uma cobre | |
| ⚠ o mapa | |

## 5. ⚠ O ORÁCULO
| # | Oráculo | O que ele pega |
|---|---|---|
| 1 | sanitizer | bugs de MEMÓRIA |
| 2 | | |
| 3 | | |

## 6. O tempo
| Item | Valor |
|---|---|
| duração | |
| ⚠ o que espero em N horas | |

## 7. ⚠ A TRIAGEM
| Item | Valor |
|---|---|
| quem tria | |
| horas/dia | |
| ⚠ quantos crashes consigo triar | |

## 8. A hipótese
| Campo | Valor |
|---|---|
| Afirmação | |
| ⚠ Falsificação | |

## 9. ⚠ O que eu NÃO vou fazer
- [ ] não fuzzar nada pela rede
- [ ] não apontar para terceiro
- [ ] ⚠ não acumular crashes sem triar
EOF

cat plano.md
```

⚠ **O plano é o entregável.** **E a seção 7 é a que distingue o plano profissional do amador:**
**quantos crashes você consegue triar** — **porque é esse o número que limita a campanha.**

⚠ **E a nota dos 200 arquivos é o fracasso concreto:** **a pasta cheia e nenhuma conclusão.**

**Produza `plano.md`:**

| Item | Valor |
|---|---|
| Alvo | |
| Oráculo | |
| Triagem | |
| Orçamento | |

**Responda:**

1. **Quais oráculos você tem?** Só o sanitizer?
2. **Quem vai triar?** Quantos crashes cabem na sua semana?
3. **O plano cabe numa página?
4. **O que você não vai fazer?

---

## 2.4 LAB — Avalie um alvo

**Duração:** 120 min

### Passo 1 — Colete os três sinais (50 min)

⚠ **Histórico, código e instrumentação.**

```bash
cd ~/fuzz-lab/mod02

echo "═══ COLETANDO OS TRÊS SINAIS ═══"
echo
cat <<'EXPL'
  ── 1. HISTÓRICO ──
     (se o alvo tem repositório)

     git log --oneline | grep -iE 'fix|bound|overflow|check|valid|limit'
     git log --oneline | grep -iE 'CVE-[0-9]{4}'

     ⚠ e o que você procura não é o bug —
        é o PADRÃO. onde já houve, há mais.

  ── 2. CÓDIGO ──
     grep -n 'memcpy\|malloc\|strcpy\|\[.*\]' alvo.c
     ⚠ e conte os ramos por função

  ── 3. INSTRUMENTAÇÃO ──
     ⚠ rode o fuzzer por 10 MINUTOS e olhe a cobertura.
     ✓ se ela não cresce, o problema é o HARNESS ou o CORPUS.
EXPL

cat > avalia-alvo.sh <<'SCRIPT'
#!/usr/bin/env bash
# avalia-alvo.sh — coleta os três sinais de um alvo
set -uo pipefail

ALVO="${1:?uso: avalia-alvo.sh <arquivo-fonte.c>}"

echo "═══════════ AVALIAÇÃO DE ALVO ═══════════"
echo "  fonte: $ALVO"
echo

echo "── SINAL 2: CÓDIGO ──"
printf '  linhas          : %s\n' "$(wc -l < "$ALVO" 2>/dev/null)"
printf '  funções         : %s\n' "$(grep -cE '^\w+.*\(' "$ALVO" 2>/dev/null)"
printf '  ⚠ memcpy         : %s\n' "$(grep -c 'memcpy' "$ALVO" 2>/dev/null)"
printf '  ⚠ malloc/free    : %s\n' "$(grep -cE 'malloc|free' "$ALVO" 2>/dev/null)"
printf '  ⚠ índices [ ]    : %s\n' "$(grep -cE '\[[^]]*\]' "$ALVO" 2>/dev/null)"
printf '  ramos (if/while) : %s\n' "$(grep -cE '\b(if|while|for)\b' "$ALVO" 2>/dev/null)"
printf '  ⚠ validações     : %s\n' "$(grep -cE '\breturn -[0-9]|> *[A-Z_]+|>= *[A-Z_]+' "$ALVO" 2>/dev/null)"
echo

echo "── AS FRONTEIRAS DECLARADAS ──"
grep -nE '#define +[A-Z_]+' "$ALVO" 2>/dev/null | sed 's/^/  /'
echo

echo "── AS VERIFICAÇÕES NO CÓDIGO ──"
grep -nE 'if *\(.*(>|>=|<|<=)' "$ALVO" 2>/dev/null | sed 's/^/  /'
echo

echo "── SINAL 3: O QUE O HARness PRECISA ──"
grep -nE 'memcpy|malloc|read|fread' "$ALVO" 2>/dev/null | sed 's/^/  ⚠ /'
echo

echo "═══ O VEREDITO ═══"
cat <<'EXPL'
  · muitas FRONTEIRAS declaradas  → ✓ alvo fértil
  · muitas operações de memória   → ✓ superfície alta
  · ⚠ validações em ORDEM errada   → ⚠ bug provável
  · sem sanitizer no histórico    → ⚠ bugs acumulados
EXPL
SCRIPT

chmod +x avalia-alvo.sh
echo "  ── pronto ──"
echo "     bash ~/fuzz-lab/mod02/avalia-alvo.sh ~/fuzz-lab/alvos/parser_alvo.c"
echo
bash ~/fuzz-lab/mod02/avalia-alvo.sh ~/fuzz-lab/alvos/parser_alvo.c 2>&1 | head -35
```

⚠ **O avaliador é o instrumento.** **E ele conta o que importa:** **memcpy, malloc, índices,
validações** — **onde a superfície está.**

⚠ **E a nota final é a ligação com o módulo 5 do curso de C:** **validações em ordem errada são bug
provável** — **e a contagem as revela.**

**Produza `avaliacao.md`:**

| Sinal | Valor |
|---|---|
| Memcpy | |
| Índices | |
| Validações | |
| Fronteiras | |

**Responda:**

1. **Quantas fronteiras o alvo declara?
2. **Quantas validações há?** Alguma em ordem suspeita?
3. **O alvo é fértil?** Com qual sinal?
4. **O que o harness precisa cobrir?

### Passo 2 — Rode 10 minutos e meça a cobertura (40 min)

⚠ **O sinal mais barato: **uma hora de fuzz diz mais que um dia de leitura.****

```bash
cd ~/fuzz-lab/mod02

echo "═══ OS 10 MINUTOS ═══"
echo
cat <<'EXPL'
  ── COM O LIBFUZZER (se compilou) ──

     mkdir -p /tmp/corpus-vazio
     # ⚠ um seed só: um cabeçalho válido mínimo
     printf '\x01\x00\x00\x00\x00\x00AAAA' > /tmp/corpus-vazio/seed
     ./alvos/fuzz_parser /tmp/corpus-vazio -max_total_time=600 -print_final_stats=1

  ── E O QUE OBSERVAR ──
     · cov: quantos blocos ele alcançou?
     · ⚠ e a linha "NEW" — ela para de aparecer?
     ✓ se para em segundos, o corpus não entra no parser.
     ⚠ e não é o alvo: é o corpus.

  ── COM O AFL++ ──
     afl-fuzz -i /tmp/corpus-vazio -o /tmp/afl-out -- ./alvos/parser_afl @@
     ⚠ e olhe o campo "map coverage" da tela.
EXPL

cat > caderno/PD-002.md <<'EOF'
# PD-002 — avaliação do alvo

**Data:** ____

## 1. Os três sinais
| Sinal | Resultado |
|---|---|
| HISTÓRICO (CVEs, fixes) | |
| CÓDIGO (memcpy, índices, validações) | |
| ⚠ INSTRUMENTAÇÃO (cobertura) | |

## 2. A superfície
| # | Campo | Tipo | Fronteira |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 3. Os 10 minutos
| Métrica | Valor |
|---|---|
| execuções | |
| ⚠ cobertura | |
| ⚠ a cobertura saturou? | |
| em quanto tempo | |

## 4. ⚠ A interpretação
| Item | Valor |
|---|---|
| se saturou rápido | ⚠ o corpus não entra |
| se cresceu devagar | ✓ o harness está certo |
| o que ajustar | |

## 5. Parsing × lógica
| Item | Valor |
|---|---|
| o alvo tem bugs de MEMÓRIA? | |
| ⚠ tem bugs de LÓGICA? | |
| qual oráculo para cada | |

## 6. O veredito
| Item | Valor |
|---|---|
| o alvo é fértil? | |
| por quê | |
| ⚠ vale a pena o harness? | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei nada pela rede
- [ ] não apontei para terceiro
- [ ] não rodei mais de 10 min sem oráculo definido

## 8. O que NÃO foi verificado
EOF

echo "  ⚠ a ficha PD-002 criada"
```

⚠ **Os 10 minutos são o instrumento mais econômico do curso.** **E a leitura é direta:** **cobertura
que satura em segundos significa que o corpus não entra.**

⚠ **E a nota "não é o alvo, é o corpus" é a correção de mentalidade do módulo 1:** **o fuzzer não
falhou; o corpus não chegou.**

**Produza `cobertura.md`:**

| Métrica | Valor |
|---|---|
| Execuções | |
| Cobertura | |
| Saturou? | |
| Em quanto tempo | |

**Responda:**

1. **A cobertura saturou rápido?** O que isso significa?
2. **Se saturou, o problema é o alvo ou o corpus?
3. **O harness está certo?
4. **Que oráculo o alvo pede?** (Dica: memória ou lógica.)

### Passo 3 — Escreva o plano (30 min)

Produza `relatorio-alvo.md`:

```markdown
# Relatório — escolha do alvo

## 1. O alvo
| Item | Valor |
|---|---|
| o que é | |
| de onde veio | |
| versão | |

## 2. Os três sinais
| Sinal | Resultado | ⚠ Interpretação |
|---|---|---|
| histórico | | |
| código | | |
| instrumentação | | |

## 3. A superfície
| # | Campo | Fronteira |
|---|---|---|
| | | |

## 4. Os 10 minutos
| Métrica | Valor |
|---|---|
| cobertura | |
| saturou? | |

## 5. O tipo de bug esperado
| Tipo | Oráculo necessário |
|---|---|
| memória | sanitizer |
| ⚠ lógica | ⚠ diferencial / invariante |

## 6. O plano de campanha
| Item | Valor |
|---|---|
| oráculo | |
| corpus | |
| ⚠ triagem (quem, quantas h) | |
| ⚠ orçamento de crashes | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro
- [ ] não acumulei crashes sem triar

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O próximo passo
| # | Ação | Prioridade |
```

**Produza `relatorio-alvo.md`:**

| Item | Valor |
|---|---|
| Alvo fértil? | |
| Oráculo | |
| Orçamento de crashes | |
| Triagem | |

**Responda:**

1. **O alvo é fértil?** Qual sinal decidiu?
2. **Que oráculo você vai usar?
3. **Quantos crashes você consegue triar** por semana?
4. **O que não foi verificado?**

### Critérios de aceitação

- `fertil.md` com as **cinco** características e as **cinco** de esterilidade.
- Você explicou **por que "já muito fuzzado" não é estéril**.
- Você explicou **por que o estéril por crash pode ser fértil por diferencial**.
- Você citou **as três fontes de sinal** e explicou a mais barata.
- `superficie.md` com o **mapa de fronteiras**.
- Você explicou **por que o mapa é o corpus em potencial**.
- Você explicou **a diferença de uso** do mapa em relação ao Parser Differentials.
- `parsing-logica.md` com as **duas** famílias e o oráculo de cada.
- Você explicou **por que o bug de lógica não crasha**.
- Você explicou **o que um alvo já fuzzado ainda tem**.
- `plano.md` com as **nove** seções.
- Você explicou **por que o orçamento de crashes limita a campanha**.
- Você escreveu **quem vai triar**.
- `avalia-alvo.sh` rodado, com os contadores.
- Os **10 minutos** de fuzz executados, com a cobertura medida.
- Você interpretou **se a cobertura saturou** e o que isso significa.
- `caderno/PD-002.md` com as **oito** seções.
- `relatorio-alvo.md` com as **nove** seções.
- ⚠ **Nenhum fuzz pela rede.**

---

## Avaliação

1. **Por que a maioria do código não tem bug alcançável?
2. **Cite as cinco características férteis.**
3. **Cite as cinco estéreis.**
4. **Por que "já muito fuzzado" não significa estéril?
5. **O que um alvo exaustivo por crash ainda tem?
6. **Quais são as três fontes de sinal?** Qual é a mais barata?
7. **O que o histórico de bugs indica?
8. **O que a instrumentação revela** que a leitura não?
9. **O que significa cobertura que satura rápido?
10. **O que a superfície de entrada mapeia?** Cite cinco elementos.
11. **O que é o mapa de fronteiras?** Para que serve?
12. **Por que ele é o corpus em potencial?
13. **Como o uso difere do Parser Differentials?
14. **Cite as duas famílias de bug.**
15. **Qual oráculo cada uma exige?
16. **Por que o bug de lógica não crasha?
17. **Por que o sanitizer satura na maioria do código maduro?
18. **Cite os campos do plano de campanha.
19. **Por que o orçamento de crashes limita a campanha?
20. **O que acontece sem plano de triagem?

---

**Próximo:** [Módulo 3 — O harness](modulo-03.md)
