# Módulo 7 — Variante e Sibling Bug

**Carga:** 3 horas (1h teoria · 2h lab)
**Pre-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Entender por que **a variante é o caminho mais curto para o achado original**.
2. Reconhecer os **cinco tipos de variante** e onde cada um vive.
3. Transformar padrão em **busca sistemática** — com `grep`, com AST, com CodeQL.
4. Usar **fuzzing diferencial dirigido** como o `1dFuzz` faz.
5. Confirmar a variante **sem sair do escopo** — e saber quando é 0-day.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Você não precisa ser mais inteligente que o desenvolvedor. Precisa procurar onde ele não
> procurou.**

⚠ **E a razão de isso funcionar é estrutural:** **um patch corrige UM lugar.** **O padrão que
causou o bug não sabe onde está** — ele **existe em todo lugar onde o mesmo raciocínio foi
aplicado.** **O desenvolvedor corrigiu o que o relatório descreveu, e seguiu em frente.**

⚠ **A evidência, e ela é quantitativa:**

| Trabalho | O que fez | Resultado |
|---|---|---|
| **EnBinDiff** (2023) | diff de binário, foco em patch | ⚠ **20 1-days reais** |
| **HTTP Garden** (2024) | fuzzing diferencial de HTTP | ⚠ **100+ bugs, 39 exploráveis** |
| **1dFuzz** (2023) | fuzzing dirigido pela posição do patch | 2,26× mais, 43% menos tempo |

⚠ **A primeira linha é a que importa para este módulo.** **O `EnBinDiff` não achou 20 bugs em 20
projetos** — **ele achou o PADRÃO uma vez, e procurou em N lugares.** **A variante é o método.**

⚠ **A tese:**

> **1-day é o bug que alguém já corrigiu. Variante é o mesmo padrão onde ninguém corrigiu ainda.**
> **A distância entre os dois é o trabalho de BUSCA — e ela é pequena.**

---

## 7.1 Os cinco tipos de variante

⚠ **A mesma classificação do módulo 3, agora com o método de busca de cada uma.**

| # | Tipo | Onde vive | Como buscar | Valor |
|---|---|---|---|---|
| 1 | **Mesmo arquivo** | função vizinha | ler as 3 antes e 3 depois | Bom |
| 2 | **Por caminho** | versão rápida × lenta | comparar caminhos irmãos | ⚠ **Alto** |
| 3 | **Por formato** | mesmo parser, outro formato | `grep` pela validação ausente | Alto |
| 4 | **Por ecossistema** | **outro projeto, mesmo protocolo** | ⚠ fuzzing diferencial | ⚠⚠ **Máximo** |
| 5 | **Por especificação** | toda implementação do RFC | ⚠ comparar com o padrão | ⚠⚠ **Máximo** |

⚠ **As linhas 4 e 5 são as que dão 0-day.** **E é a diferença de escala:** **a variante no mesmo
arquivo dá um achado; a variante por ecossistema dá uma CLASSE.** **O `HTTP Garden` fez a 4 e a 5
ao mesmo tempo** — **porque o HTTP é o mesmo protocolo em 100 servidores diferentes.**

⚠ **A linha 2 é a mais subestimada.** **Muitos parsers têm caminho rápido e caminho lento** —
**otimização, ou suporte a duas versões do formato.** **O patch corrigiu um e não o outro.**
**E o caminho não corrigido é frequentemente o MENOS usado** — **que nunca foi testado.**

⚠ **A tabela do que cada tipo exige:**

| Tipo | Exige | Ferramenta |
|---|---|---|
| Mesmo arquivo | leitura | seus olhos |
| Por caminho | leitura do fluxo | seus olhos |
| Por formato | `grep` estruturado | `grep`, `semgrep` |
| Por ecossistema | **comparação de implementações** | ⚠ fuzzing diferencial |
| Por especificação | **o RFC + N implementações** | ⚠ fuzzing diferencial |

⚠ **A coluna da ferramenta conta a história:** **os dois primeiros tipos você faz com leitura** —
**e é onde começar.** **Os dois últimos exigem ferramenta** — **e é onde o achado é maior.**

```bash
mkdir -p ~/pesquisa-lab/mod07 && cd ~/pesquisa-lab/mod07

echo "═══ 1. os cinco tipos, com o método ═══"
echo
python3 - <<'PY'
print("  ═══ OS CINCO TIPOS DE VARIANTE ═══")
print()
tipos = [
    ("1. MESMO ARQUIVO",
     "ler as 3 funções antes e 3 depois da corrigida",
     "seus olhos",
     "bom"),
    ("2. POR CAMINHO",
     "existe caminho rápido e lento? um valida, o outro não?",
     "⚠ ler o FLUXO, não a função",
     "ALTO"),
    ("3. POR FORMATO",
     "o mesmo parser, outro formato — a validação foi esquecida",
     "grep / semgrep / CodeQL",
     "alto"),
    ("4. POR ECOSSISTEMA",
     "OUTRO projeto implementa o mesmo protocolo/formato",
     "⚠ fuzzing diferencial",
     "MÁXIMO"),
    ("5. POR ESPECIFICAÇÃO",
     "o RFC diz como validar — N implementações erram igual",
     "⚠ RFC + N implementações",
     "MÁXIMO"),
]
for nome, metodo, ferramenta, valor in tipos:
    print(f"  ── {nome} ──")
    print(f"     método    : {metodo}")
    print(f"     ferramenta: {ferramenta}")
    print(f"     valor     : {valor}")
    print()

print("═══ POR QUE OS DOIS ÚLTIMOS DÃO 0-DAY ═══")
print()
print("  ── 1-day ──")
print("     o bug estava no projeto A. alguém corrigiu. você achou a variante")
print("     no projeto A que não foi corrigida.")
print("     ⚠ isso ainda é 1-day — o projeto sabe que o padrão existe.")
print()
print("  ── 0-day ──")
print("     o bug está no projeto B, que implementa o mesmo protocolo")
print("     e NUNCA recebeu patch nenhum — porque ninguém reportou nele.")
print("     ⚠⚠ ninguém sabe. nem o projeto B.")
print()
print("  ✓ é a diferença entre 'achei o que faltou corrigir'")
print("     e 'achei o que ninguém sabia'.")
PY
```

⚠ **A distinção 1-day vs. 0-day é a mais importante do módulo.** **Variant no mesmo projeto ainda é
1-day** — porque **o projeto sabe que o padrão existe** (corrigiu em um lugar). **Variant no projeto
B é 0-day** — porque **o projeto B nunca soube.**

⚠ **E é por isso que os tipos 4 e 5 valem mais:** **a superfície é N projetos**, e **cada um erra
independente.**

**Produza `cinco-tipos.md`:**

| Tipo | Onde vive | Método | Valor |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

**Responda:**

1. **Qual a diferença entre 1-day e 0-day**, neste contexto?
2. **Por que os tipos 4 e 5 dão 0-day?**
3. **Por que o tipo 2 é subestimado?**
4. **Quais tipos você faz com leitura** e quais exigem ferramenta?

---

## 7.2 Padrão em busca

⚠ **A ponte entre o padrão abstraído (módulo 3) e a busca sistemática.**

⚠ **A escada da busca, do mais simples ao mais poderoso:**

| Nível | Técnica | Alcança |
|---|---|---|
| **1** | `grep` por termo | Onde o nome aparece |
| **2** | `grep` estrutural (padrão de uso) | Onde o PADRÃO de uso aparece |
| **3** | **AST / `semgrep`** | Onde a ESTRUTURA casa |
| **4** | **CodeQL** | Onde a RELAÇÃO entre dados casa |
| **5** | **Fuzzing diferencial** | Onde o COMPORTAMENTO difere |

⚠ **A subida de nível é o que dá o achado.** **`grep` por `memcpy` acha 500 ocorrências.** **CodeQL
por "comprimento vem de dado não confiável e não foi validado" acha 3.** **A diferença é o
trabalho de leitura.**

⚠ **E a tabela do que cada nível custa:**

| Nível | Custo de escrever | Falso positivo | Quando vale |
|---|---|---|---|
| 1 — `grep` | ⚠ minutos | **altíssimo** | sempre, como primeiro olhar |
| 2 — `grep` estrutural | minutos | alto | sempre |
| 3 — `semgrep` | ⚠ horas | médio | projeto grande |
| 4 — CodeQL | ⚠⚠ dias | baixo | **quando vale a pena** |
| 5 — fuzzing diferencial | dias | médio | ⚠ **0-day por ecossistema** |

⚠ **A linha do CodeQL é decisão.** **Ele exige aprender a linguagem de consulta** — e **isso é
investimento.** **Vale quando o padrão é específico e o projeto é grande.** **Não vale para uma
busca única.**

⚠ **E a linha do fuzzing diferencial é a única que compara COMPORTAMENTO.** **As outras comparam
código** — e por isso **não alcançam o tipo 4 (ecossistema) com eficiência.** **O `HTTP Garden` usou
comparação de comportamento** — **e achou 100 bugs.**

```bash
cd ~/pesquisa-lab/mod07

echo "═══ 2. a escada da busca ═══"
echo
cat <<'EXPL'
  ── NÍVEL 1: grep por termo ──
     grep -rn 'memcpy' --include='*.c' .
     ⚠ 500 ocorrências. altíssimo falso positivo.
     ✓ mas rápido, e às vezes acha o óbvio.

  ── NÍVEL 2: grep estrutural ──
     # cópia com comprimento vindo de variável "de fora"
     grep -rnE 'memcpy\s*\([^,]+,[^,]+,\s*(len|size|count|n_?\w*)' --include='*.c' .
     ⚠ 40 ocorrências. ainda alto — mas a forma já filtra.

  ── NÍVEL 3: semgrep (AST) ──
     semgrep --lang c -e 'memcpy($DST, $SRC, $LEN)' .
     ✓ casa pela ESTRUTURA, não pelo texto
     ✓ e permite condição: "se $LEN não tem checagem antes"

  ── NÍVEL 4: CodeQL ──
     ⚠ descreve o FLUXO:
        from FieldRead f, Memcpy m
        where f.flowsTo(m.getLength()) and not validated(f)
        select m
     ✓ acha 3 de 500. é o que vale.

  ── NÍVEL 5: fuzzing diferencial ──
     ⚠ compara COMPORTAMENTO de duas implementações
     · manda a MESMA entrada para A e para B
     · ⚠ se a resposta difere: há discrepância
     ✓ é o que achou 100 bugs no HTTP Garden
EXPL

echo
echo "═══ 3. o padrão como consulta ═══"
echo
cat > padrao-em-busca.md <<'EOF'
# Padrão em busca

## O padrão (do módulo 3)
"[abstraído, sem nomes de variável]"

## Nível 1 — termo
| Termo | Ocorrências | Vale olhar? |
|---|---|---|
| | | |

## Nível 2 — estrutural
| Expressão | Ocorrências | Filtra o quê |
|---|---|---|
| | | |

## Nível 3 — AST (semgrep)
```
[regra semgrep, se usar]
```

## Nível 4 — CodeQL
```
[consulta, se usar]
```
⚠ vale o investimento? (projeto grande? padrão específico?)

## Nível 5 — fuzzing diferencial
| Implementação A | Implementação B | Entrada | Diferença observada |
|---|---|---|---|
| | | | |

## Resultado
| Nível usado | Candidatos | Confirmados | Vira achado? |
|---|---|---|---|
| | | | |
EOF

cat padrao-em-busca.md
```

⚠ **A escada é o instrumento.** **E a decisão de subir é econômica:** **`grep` primeiro sempre** —
**porque é barato.** **CodeQL só quando o padrão é específico e o projeto é grande.**

⚠ **E o nível 5 merece destaque:** **é o único que compara COMPORTAMENTO.** **As outras comparam
código** — **e por isso não alcançam o projeto B**, que **está escrito de outra forma mas se comporta
igual.** **É a razão de o `HTTP Garden` ter funcionado em escala.**

**Produza `busca.md`:**

| Nível | Técnica | Candidatos | Falso positivo |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

**Responda:**

1. **Qual nível você usou?** Quantos candidatos?
2. **Quantos falsos positivos?**
3. **Valeu subir de nível?** Por quê?
4. **Qual nível alcança o projeto B?** Por quê?

---

## 7.3 Fuzzing diferencial dirigido

⚠ **A técnica do `1dFuzz`, e a razão de ela conectar com o curso de Fuzzing.**

⚠ **A ideia:** **o patch deixa um rastro.** **O `1dFuzz` identificou o que ele chama de
"trailing call sequence" (TCS)** — **a sequência de chamadas que segue a correção.** **E usou isso
para LOCALIZAR onde o bug está** — **e dirigir o fuzzer até lá.**

```
┌──────────────────────────────────────────────────────────────────────┐
│  FUZZING CEGO (o comum)                                              │
│    · o fuzzer explora o espaço de entrada                            │
│    · ⚠ ele não sabe ONDE o bug está                                   │
│    · chega lá por acaso, ou por sorte com o corpus                    │
├──────────────────────────────────────────────────────────────────────┤
│  FUZZING DIRIGIDO (1dFuzz)                                           │
│    · ⚠ o patch diz ONDE o bug estava                                  │
│    · a posição do patch vira o ALVO                                   │
│    · o fuzzer é guiado até o alvo pela distância de chamada           │
│    ✓ 2,26× mais achados, 43% menos tempo                              │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A diferença é a mesma do módulo 1:** **o fuzzer cego tem cobertura, o dirigido tem ALVO.**
**E fuzzar sem alvo é método sem hipótese** — **exatamente o que o módulo 6 chama de hipótese ruim
nº 3.**

⚠ **E a conexão com o curso de Fuzzing é direta:** **o harness que você escreveu lá é o que o
fuzzing dirigido usa** — **e o que muda é o critério de sucesso.** **Em vez de "achou um crash", o
critério é "chegou à função X e causou Y".**

⚠ **A tabela da ferramenta, e o que cada uma faz:**

| Ferramenta | O que compara | Alcança |
|---|---|---|
| `AFL++` com dicionário | entrada × cobertura | o óbvio |
| `libFuzzer` com corpus | entrada × cobertura | o óbvio |
| **Diferencial** (duas impl.) | ⚠ **comportamento A × B** | ⚠ **discrepância** |
| **Dirigido** (`1dFuzz`) | entrada × **distância até o patch** | ⚠ **o bug do patch** |
| **Gramática** | entrada × **estrutura válida** | estados profundos |

⚠ **A linha do diferencial é a que o `HTTP Garden` usou.** **Ele não fuzzou um servidor — ele
fuzzou a DISCORDÂNCIA entre dois.** **E é por isso que a técnica escala:** **você não precisa
entender cada servidor; precisa ver onde dois discordam.**

⚠ **E a linha da gramática é o que o curso de Fuzzing cobriu** — **fuzzar com estrutura válida
alcança estados que o fuzzing por byte não alcança.**

```bash
cd ~/pesquisa-lab/mod07

echo "═══ 4. fuzzing diferencial — o mecanismo ═══"
echo
python3 - <<'PY'
print("  ═══ FUZZING DIFERENCIAL ═══")
print()
print("  ── o princípio ──")
print("     manda a MESMA entrada para DUAS implementações")
print("     ⚠ se o COMPORTAMENTO difere, há discrepância")
print()
print("  ── por que funciona em escala ──")
print("     · você não precisa entender cada implementação")
print("     · a discrepância é o SINAL — e ela é objetiva")
print("     · e implementações independentes erram INDEPENDENTE")
print("       → a chance de duas errarem igual é baixa")
print()
print("  ── a aplicação ao HTTP (o caso do HTTP Garden) ──")
print("     · dois servidores recebem o MESMO fluxo de bytes")
print("     · onde eles discordam sobre o LIMITE da requisição")
print("       → é o desync / smuggling")
print("     ✓ 100+ bugs, 68 corrigidos, 39 exploráveis")
print()
print("  ── o que a discrepância NÃO é ──")
print("     ⚠ discrepância não é bug por si")
print("     · pode ser implementação legítima diferente")
print("     · ⚠ pode ser documentado na especificação")
print("     ✓ discrepância é CANDIDATO — e você verifica")
print()
print("  ── e o mesmo vale para fuzzing dirigido ──")
print("     a posição do patch vira o alvo")
print("     ⚠ e você mede a DISTÂNCIA até ele")
print("     ✓ não é 'fuzzar e ver'; é 'fuzzar com destino'")
PY

echo
echo "═══ 5. discrepância vs. bug ═══"
echo
cat <<'EXPL'
  ┌────────────────────────────┬──────────────────────────────────────┐
  │ DISCREPÂNCIA               │ quer dizer                             │
  ├────────────────────────────┼──────────────────────────────────────┤
  │ implementação diferente,   │ ✓ pode ser legítimo                    │
  │ mas ambas seguras          │                                        │
  │ e a especificação prevê    │ ✓ se ambos seguem o RFC, não é bug      │
  │ uma aceita, a outra recusa │ ⚠ **candidato** — depende do contexto   │
  │ e o resultado AFETA o       │ ⚠⚠ **É BUG**                            │
  │ limite da mensagem          │                                        │
  └────────────────────────────┴──────────────────────────────────────┘

  ⚠ a terceira linha é a que importa no smuggling:
     quando a discrepância é sobre ONDE A MENSAGEM TERMINA,
     um dos dois vai ler o resto como OUTRA requisição.

  ✓ e é por isso que o critério do HTTP Garden funcionou:
     ele não procurava 'diferença' — procurava diferença DE FRAMING.
EXPL
```

⚠ **A última linha é o critério.** **O `HTTP Garden` não procurava "diferença"** — **procurava
diferença de FRAMING.** **É a hipótese do módulo 6:** **específica, com critério.** **"Dois
implementações diferem" é vago; "diferem sobre onde a mensagem termina" é falsificável.**

⚠ **E é a lição que fecha o ciclo:** **a técnica do fuzzing diferencial só funciona com a hipótese
certa** — e é o módulo 6 que a formula.

**Produza `fuzzing-diferencial.md`:**

| Item | Valor |
|---|---|
| O que comparar | |
| A discrepância que importa | |
| Por que é candidato | |
| Critério de bug | |

**Responda:**

1. **Por que o diferencial funciona em escala?**
2. **Discrepância é bug?** Ou candidato?
3. **Qual discrepância importa** no smuggling?
4. **Como o `1dFuzz` evita o fuzzing cego?**

---

## 7.4 Confirmar a variante

⚠ **Encontrar é hipótese. Confirmar é trabalho — e o trabalho é o mesmo dos módulos 3 e 6.**

| Passo | O que fazer | Critério |
|---|---|---|
| 1 | **Ler** o candidato | A validação está ausente? |
| 2 | Verificar se a **entrada é alcançável** | O caminho é atingível em runtime? |
| 3 | Verificar se **outra camada** não valida | Há defesa em profundidade? |
| 4 | Verificar a **especificação** | O RFC exige? Então é bug |
| 5 | ⚠ **Registrar** como hipótese aberta ou confirmada | |

⚠ **O passo 3 é o que mais gera falso positivo.** **O candidato não valida — mas o chamador
valida.** **Você achou uma ausência de validação que não é alcançável com dado ruim**, porque
**alguém acima já filtrou.**

⚠ **A tabela dos falsos positivos mais comuns:**

| Falso positivo | Como detectar |
|---|---|
| O chamador valida | Ler o sítio de chamada |
| Outra camada valida | Entender a arquitetura |
| O caminho não é alcançável | Ver se alguma entrada chega lá |
| A especificação permite | Ler o RFC |
| É código morto | Ver se está compilado |

⚠ **A linha do código morto é a mais chata.** **O candidato está no fonte mas não no binário** —
**porque está atrás de um `#ifdef`, ou nunca é chamado.** **E você gastou tempo nele.** **Só se
descobre lendo o sítio de chamada.**

⚠ **E a linha da especificação é a que transforma candidato em bug.** **Se o RFC diz "o servidor DEVE
recusar", e a implementação aceita — é bug, sem discussão.** **É por isso que o tipo 5 (por
especificação) é o mais forte:** **ele tem o critério embutido.**

```bash
cd ~/pesquisa-lab/mod07

echo "═══ 6. confirmando sem explorar ═══"
echo
cat > confirma-variante.md <<'EOF'
# Confirmação de variante

## O candidato
| Campo | Valor |
|---|---|
| Projeto | |
| Arquivo:linha | |
| Padrão encontrado por | |
| Como cheguei | |

## Verificação por leitura (módulo 6)
| Item | Resposta |
|---|---|
| A validação existe? | |
| Vem antes ou depois do uso? | |
| Cobre todos os caminhos? | |

## Os cinco falsos positivos
| # | Possível falso positivo | Verifiquei? | Resultado |
|---|---|---|---|
| 1 | o chamador valida | | |
| 2 | outra camada valida | | |
| 3 | caminho inalcançável | | |
| 4 | a especificação permite | | |
| 5 | código morto | | |

## A especificação
| Item | Valor |
|---|---|
| Documento (RFC/spec) | |
| O que ele EXIGE | |
| A implementação cumpre? | |

## Veredito
[ ] confirmado — é o mesmo padrão, alcançável, e não validado em outro lugar
[ ] falso positivo — qual dos cinco
[ ] ✗ hipótese falsificada — o que isso ensina

## Classificação
[ ] 1-day (o projeto já corrigiu em outro lugar)
[ ] ⚠ 0-day (o projeto nunca soube)
[ ] não classificável ainda

## O que isso destrava
[próxima pergunta]
EOF

cat confirma-variante.md

echo
echo "═══ 7. a decisão: 1-day ou 0-day ═══"
echo
cat <<'EXPL'
  ┌──────────────────────────────────────────────────────────────────┐
  │ É 1-DAY SE:                                                       │
  │   · o MESMO projeto corrigiu o padrão em outro lugar             │
  │   · existe CVE do padrão neste projeto                           │
  │   · o mantenedor conhece o padrão                                 │
  │   ✓ você achou o que faltou corrigir                              │
  │   ✓ e o valor é: a correção estava INCOMPLETA                     │
  ├──────────────────────────────────────────────────────────────────┤
  │ É 0-DAY SE:                                                       │
  │   · o projeto NUNCA corrigiu nada parecido                        │
  │   · não há CVE                                              │
  │   · e o padrão é o MESMO de outro projeto                         │
  │   ✓✓ você achou o que ninguém sabia                               │
  │   ✓✓ e o responsável é o mantenedor deste projeto                 │
  └──────────────────────────────────────────────────────────────────┘

  ⚠ e a terceira condição do 0-day é a que conecta com o tipo 4:
     "o padrão é o MESMO de outro projeto".
     ✓ é aí que o módulo 3 vira achado original.
EXPL
```

⚠ **A tabela é o critério de classificação.** **E a terceira condição do 0-day é a que faz o ciclo
fechar:** **"o padrão é o mesmo de outro projeto"** — **e é o módulo 3 (abstrair o padrão) somado ao
tipo 4 (ecossistema).**

⚠ **E a nota do 1-day merece destaque.** **"A correção estava incompleta"** é **um achado de valor
próprio** — **porque significa que o padrão persiste onde o mantenedor ACHOU que tinha resolvido.**
**É o `EnBinDiff` reduzindo falso negativo de 11% para 1,63%:** **achar o que a correção não pegou.**

**Produza `confirmacao-variante.md`:**

| Item | Valor |
|---|---|
| Candidato | |
| Falso positivo? | |
| Veredito | |
| 1-day ou 0-day | |

**Responda:**

1. **Qual dos cinco falsos positivos** é o mais comum?
2. **Qual transforma candidato em bug?** Por quê?
3. **O seu candidato é 1-day ou 0-day?**
4. **Por que "correção incompleta" é um achado** de valor próprio?

---

## 7.5 LAB — Do padrão ao irmão

**Duração:** 120 min

### Passo 1 — Escolha o padrão e busque (40 min)

⚠ **Use o padrão do módulo 3 (patch) ou do módulo 4 (CVE).**

```bash
cd ~/pesquisa-lab/mod07

echo "═══ PASSANDO O PADRÃO ADIANTE ═══"
echo
cat <<'EXPL'
  ⚠ você já tem o padrão abstraído. agora:
     · um projeto para buscar (módulo 2)
     · a escada de níveis (módulo 7 §7.2)
     · e a hipótese (módulo 6)

  ── o procedimento ──
     1. pegue o padrão do caderno/03-patch.md
     2. aplique o nível 1 (grep por termo)
     3. suba para o nível 2 (grep estrutural)
     4. ⚠ e só depois pense em semgrep/CodeQL
     5. para cada candidato, aplique os CINCO falsos positivos
EXPL

cat > caderno/07-busca-irmao.md <<'EOF'
# INV-007 — busca pelo irmão

**Data:** ____

## 1. O padrão
"[do módulo 3, sem nomes]"

## 2. Nível 1 — termo
```bash
grep -rn '<termo>' --include='*.c' .
```
| Termo | Ocorrências | Vale? |
|---|---|---|
| | | |

## 3. Nível 2 — estrutural
```bash
grep -rnE '<padrão de uso>' --include='*.c' .
```
| Expressão | Ocorrências | Filtra |
|---|---|---|
| | | |

## 4. Candidatos
| # | Arquivo:linha | Trecho | Padrão casa? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## 5. Verificação dos cinco falsos positivos
| # | Candidato | Chamador valida? | Outra camada? | Alcançável? | Spec permite? | Código morto? | Veredito |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |

## 6. Classificação
| # | 1-day ou 0-day | Por quê |
|---|---|---|
| 1 | | |

## 7. O que isso destrava
[a próxima pergunta]
EOF

cat caderno/07-busca-irmao.md
```

Produza `busca-irmao.md`:

| Nível | Expressão | Candidatos | Confirmados |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. **Quantos candidatos** no nível 1? E no nível 2?
2. **Subir de nível reduziu** o falso positivo?
3. **Quantos sobreviveram** aos cinco falsos positivos?
4. **Qual a classificação** do confirmado?

### Passo 2 — Tente o tipo 2 (por caminho) (40 min)

⚠ **A variante mais subestimada. **Procure caminhos irmãos** no código.**

```bash
cd ~/pesquisa-lab/mod07

echo "═══ VARIANTE POR CAMINHO ═══"
echo
cat <<'EXPL'
  ── o que procurar ──
     · caminho RÁPIDO × caminho LENTO
       (otimização: fast path e slow path)
     · versão 1 × versão 2 do formato
     · parser de FLUXO × parser de BUFFER
     · caminho COM autenticação × SEM

  ── como procurar ──
     1. ache a função corrigida
     2. ⚠ veja se existe uma função "irmã" com nome parecido:
        parse_x_fast / parse_x_slow
        parse_v1 / parse_v2
        read_from_fd / read_from_buf
     3. compare as duas:
        · uma tem a validação?
        · a outra tem?

  ── o comando ──
     grep -rn 'função_original\|_fast\|_slow\|_v1\|_v2\|_legacy' .
     ⚠ e leia o par.

  ⚠ POR QUE ESTE TIPO VALE:
     o caminho não corrigido é frequentemente o MENOS usado
     → menos teste, menos atenção, MENOS CHANCE DE ALGUÉM ACHAR
     ✓ e frequentemente é o caminho de COMPATIBILIDADE — que existe
        para dado antigo, e ninguém olha há anos.
EXPL

cat > caderno/07-variante-caminho.md <<'EOF'
# Variante por caminho

## A função corrigida
| Campo | Valor |
|---|---|
| Nome | |
| Tem validação? | |

## Caminhos irmãos procurados
| # | Nome | Existe? | Tem validação? | Veredito |
|---|---|---|---|---|
| 1 | _fast / _slow | | | |
| 2 | _v1 / _v2 | | | |
| 3 | de fd / de buffer | | | |
| 4 | com auth / sem | | | |
| 5 | _legacy | | | |

## O par mais interessante
| Item | Valor |
|---|---|
| Função A | |
| Função B | |
| A valida? | |
| B valida? | |
| ⚠ Diferença | |

## Verificação
| Item | Resposta |
|---|---|
| O caminho sem validação é ALCANÇÁVEL? | |
| Como um atacante chega nele? | |
| É 1-day ou 0-day? | |
EOF

cat caderno/07-variante-caminho.md
```

Produza `variante-caminho.md`:

| Par | A valida? | B valida? | Alcançável? |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Existem caminhos irmãos** no código?
2. **Algum não valida?** Qual?
3. **Ele é alcançável?** Como?
4. **Por que o caminho não corrigido é frequentemente o menos usado?**

### Passo 3 — O tipo 4, conceitualmente (40 min)

⚠ **O tipo que dá 0-day. Aqui você **planeja** — porque testar exige infraestrutura.**

```bash
cd ~/pesquisa-lab/mod07

echo "═══ VARIANTE POR ECOSSISTEMA ═══"
echo
cat <<'EXPL'
  ⚠ este tipo exige COMPARAR IMPLEMENTAÇÕES — e isso pode ser:

  ── A) LEITURA COMPARADA (você faz agora) ──
     · pegue a especificação (RFC, formato) do seu alvo
     · ⚠ encontre N implementações independentes
     · leia o trecho de cada uma que trata o MESMO ponto
     · compare: quem valida? quem não?

     ✓ isso é o tipo 5 (por especificação), e dá resultado SEM teste

  ── B) FUZZING DIFERENCIAL (planejar) ──
     · requer montar as duas implementações
     · e um harness que manda a MESMA entrada para as duas
     · ⚠ e é o que o curso de Fuzzing te deu
     ✓ o HTTP Garden fez isso em escala

  ── o que você produz AGORA ──
     · a lista de implementações independentes
     · o ponto exato que você vai comparar
     · a hipótese (módulo 6)
     · ⚠ e o PLANO para o teste, se for fazer
EXPL

cat > caderno/07-variante-ecossistema.md <<'EOF'
# Variante por ecossistema

## O padrão
"[o mesmo do módulo 3]"

## A especificação
| Item | Valor |
|---|---|
| Documento (RFC/spec/formato) | |
| O trecho relevante | |
| O que ele EXIGE | |

## As implementações independentes
| # | Projeto | Linguagem | Trata o mesmo ponto? | Valida? | CVE conhecido? |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |

## Leitura comparada
| Aspecto | A | B | C | Diferença |
|---|---|---|---|---|
| valida antes? | | | | |
| limite | | | | |
| erro distinguível? | | | | |

## A hipótese (módulo 6)
| Campo | Valor |
|---|---|
| Invariante | |
| Afirmação | |
| Observação | |
| Falsificação | |

## O plano do teste diferencial
| Item | Valor |
|---|---|
| Implementação A | |
| Implementação B | |
| Entrada | |
| ⚠ O que a discrepância significaria | |
| ⚠ Autorização para testar | |

## Veredito
[ ] discrepância encontrada por LEITURA
[ ] discrepância provável — requer teste
[ ] sem discrepância aparente
EOF

cat caderno/07-variante-ecossistema.md
```

Produza `variante-ecossistema.md`:

| # | Implementação | Valida? | Diferença |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. **Quantas implementações independentes** você listou?
2. **A leitura comparada achou discrepância?**
3. **A especificação exige algo** que alguma não faz?
4. **Se há discrepância, ela é candidata a 0-day?** Por quê?
5. **Qual a autorização** para o teste, se for fazer?

### Critérios de aceitação

- `cinco-tipos.md` com os **cinco** tipos, método e valor de cada.
- Você distinguiu **1-day** de **0-day** neste contexto.
- Você explicou **por que os tipos 4 e 5 dão 0-day**.
- `busca.md` com os **cinco níveis** da escada.
- Você rodou **pelo menos** os níveis **1 e 2**.
- Você explicou **por que o nível 5 alcança o projeto B**.
- `fuzzing-diferencial.md` com o critério de discrepância relevante.
- Você explicou **por que discrepância é candidato e não bug**.
- Você explicou **como o `1dFuzz` evita o fuzzing cego**.
- `busca-irmao.md` com os candidatos e os **cinco** falsos positivos verificados.
- Você aplicou os **cinco** falsos positivos a um candidato.
- `variante-caminho.md` com **pelo menos** um par de caminhos comparado.
- Você explicou **por que o caminho não corrigido é o menos usado**.
- `variante-ecossistema.md` com **pelo menos três** implementações listadas.
- Você fez a **leitura comparada** do mesmo ponto em N implementações.
- Você explicou **por que a especificação transforma candidato em bug**.
- ⚠ **Nenhum teste contra sistema de terceiro** — aqui é leitura e planejamento.

---

## Avaliação

1. **Por que você não precisa ser mais inteligente que o desenvolvedor?**
2. **Por que a variante é o caminho mais curto** para o achado original?
3. **Qual a diferença entre 1-day e 0-day** neste contexto?
4. **Cite os cinco tipos de variante.e**
5. **Quais dão 0-day?** Por quê?
6. **Por que o tipo 2 é subestimado?**
7. **Por que o caminho não corrigido é o menos usado?**
8. **Cite os cinco níveis** da escada de busca.
9. **Qual nível é barato e qual exige investimento?**
10. **Por que `grep` por `memcpy` tem falso positivo altíssimo?**
11. **O que o CodeQL alcança** que o `grep` não alcança?
12. **Qual nível alcança o projeto B?** Por quê?
13. **O que o `1dFuzz` usa do patch** para dirigir o fuzzer?
14. **Por que fuzzing cego não tem hipótese?**
15. **Como funciona o fuzzing diferencial?**
16. **Discrepância é bug?** O que é?
17. **Qual discrepância importa no smuggling?** Por quê?
18. **Cite os cinco falsos positivos** de uma variante.
19. **Qual transforma candidato em bug?** Por quê?
20. **Por que "correção incompleta" é um achado** de valor próprio?

---

**Próximo:** [Módulo 8 — Registro de pesquisa](modulo-08.md)
