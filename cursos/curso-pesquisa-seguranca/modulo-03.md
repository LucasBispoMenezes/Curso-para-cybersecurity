# Módulo 3 — Ler um Patch

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 e 2 · curso de C para Segurança (módulo 6)

---

## Objetivos

1. Ler um patch e inferir o **invariante violado** — não só "o que mudou".
2. Distinguir **correção de causa raiz** de **correção de sintoma**.
3. Reconstruir o bug a partir do **diff**, sem PoC.
4. Aplicar o método em **fonte** (diff de código) e em **binário** (patch diffing).
5. Encontrar o **irmão do padrão** — a ponte para o achado original.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O patch é a documentação mais honesta de um bug.** A descrição do CVE pode ser vaga; o
> **patch mostra exatamente o que estava errado** — porque **o desenvolvedor teve que corrigir**.

⚠ **E é por isso que ele é a fonte mais produtiva para um primeiro achado:**

| Fonte | O que dá | Precisão |
|---|---|---|
| Descrição do CVE | Resumo, às vezes vago | Média |
| Writeup de terceiro | A interpretação de alguém | Média |
| **O patch** | ⚠ **O código exato que mudou** | **Máxima** |
| O código antes do patch | **O bug** | Máxima |

⚠ **A tese:** **ler o diff é reconstruir o raciocínio do desenvolvedor.** **Ele viu um problema, e a
correção diz QUAL problema** — **e frequentemente diz mais que o advisory.**

⚠ **E é o que o `EnBinDiff` quantifica:** identificando patches **"data-only"** (que mudam só dado, não
código), ele **reduziu o falso negativo de 11% para 1,63%** e **achou 20 1-days em binários reais.**
**A leitura do patch é método, não sorte.**

---

## 3.1 Os três níveis de leitura

⚠ **Um patch se lê em três níveis, e a maioria para no primeiro.**

```
NÍVEL 1 — O QUE MUDOU
  "adicionou uma verificação de tamanho"
      ⚠ é o que todo mundo vê. serve para pouco.

NÍVEL 2 — POR QUE ISSO CORRIGE
  "a verificação impede que `len` exceda o buffer,
   porque antes o valor era usado direto no memcpy"
      ✓ é o que quem lê bem vê. já dá o bug.

NÍVEL 3 — QUAL INVARIANTE FOI VIOLADO
  "o invariante é `len <= sizeof(dst)`, e o código
   NÃO o garantia em nenhum ponto antes do uso"
      ⚠⚠ é o que o pesquisador vê — e é o que PERMITE achar o irmão.
```

⚠ **A diferença entre o nível 2 e o 3 é operacional.** **O nível 2 te dá ESTE bug.** **O nível 3 te
dá o PADRÃO** — e o padrão é o que você procura em outros lugares.

⚠ **A fórmula da invariante:**

> **Um invariante é uma afirmação que DEVE valer em um ponto do programa, e que o código garante
> (ou não).**

| Invariante | Onde ele deve valer |
|---|---|
| `len <= máx` | Antes de alocar, de copiar, de indexar |
| `ptr != NULL` | Antes de desreferenciar |
| `índice < tamanho` | Antes de acessar |
| **estado é consistente** | Antes de qualquer transição |
| **dado é do tipo certo** | Antes de interpretar |

⚠ **A linha do estado é a que não aparece em fuzzing** — e é a mais produtiva hoje. **O código
garante que o objeto está consistente em todo ponto?** **Se não, há bug.**

⚠ **E a linha do tipo é a confusão de camada** (módulo 2, região 2): **o dado diz que é A, e o
código o interpreta como B.** **Garantir o tipo é um invariante.**

```bash
mkdir -p ~/pesquisa-lab/mod03 && cd ~/pesquisa-lab/mod03

echo "═══ 1. os três níveis, num patch real (didático) ═══"
echo
cat > exemplo.diff <<'EOF'
--- a/parser.c
+++ b/parser.c
@@ -40,7 +40,11 @@ static int parse_item(const uint8_t *buf, size_t len) {
     uint16_t count;
     uint32_t total;
 
     memcpy(&count, buf, sizeof(count));
-    total = count * ITEM_SIZE;
+    if (count > MAX_ITEMS)
+        return -ERR_RANGE;
+    total = count * ITEM_SIZE;
+    if (total > len - HEADER_SIZE)
+        return -ERR_SHORT;
     if (len < HEADER_SIZE + total)
         return -ERR_SHORT;
     ...
EOF

cat exemplo.diff

echo
echo "═══ os três níveis ═══"
echo
cat <<'EXPL'
  ── NÍVEL 1: O QUE MUDOU ──
     adicionou duas verificações antes do cálculo:
       if (count > MAX_ITEMS) return -ERR_RANGE;
       if (total > len - HEADER_SIZE) return -ERR_SHORT;
     e trocou a ordem: a verificação de `len` agora vem DEPOIS.

  ── NÍVEL 2: POR QUE ISSO CORRIGE ──
     ⚠ a linha acrescentada `if (count > MAX_ITEMS)` limita `count`
        ANTES de `total = count * ITEM_SIZE`.
     ✓ isso impede o ESTOURO da multiplicação:
        count é uint16 (máx 65535), ITEM_SIZE é constante.
        65535 * ITEM_SIZE pode passar de 2^32 se ITEM_SIZE for grande.
     ✓ e a segunda verificação garante que `total` CABE no buffer restante,
        porque `len < HEADER_SIZE + total` pode dar a volta se
        HEADER_SIZE + total estourar.

  ── NÍVEL 3: O INVARIANTE VIOLADO ──
     ⚠ O INVARIANTE É: "`total` (e `count`) são valores que CABEM,
        e o corpo cabe no buffer que resta."
     e o código NÃO o garantia em NENHUM ponto antes do uso.

     ✓ o padrão, abstraído:
        "campo lido da entrada usada em ARITMÉTICA antes de validação de faixa"

     ⚠⚠ E É ISSO que você procura em outros lugares.
        não a linha — o PADRÃO.
EXPL
```

⚠ **A linha final é a lição do módulo.** **Você sai do patch com um PADRÃO** — **"campo lido da
entrada usada em aritmética antes de validação de faixa"** — e **o padrão é reutilizável**.

⚠ **E note que a correção tem DUAS partes, e as duas importam:**
1. **Limitar a faixa ANTES da multiplicação** — porque o resultado pode estourar.
2. **Verificar a soma** — porque `HEADER_SIZE + total` também pode estourar.

**É exatamente o módulo 9 do curso de C** — a verificação **antes**, e **as duas superfícies**.

**Produza `tres-niveis.md`:**

| Nível | O que dá | Reutilizável? |
|---|---|---|
| 1 — o que mudou | | |
| 2 — por que corrige | | |
| 3 — invariante | | |

**Responda:**

1. **Qual nível a maioria para?** Por que ele serve para pouco?
2. **Qual a diferença operacional** entre o nível 2 e o 3?
3. **Qual o padrão** que este patch revela?
4. **Por que a correção tem duas partes?**

---

## 3.2 Causa raiz versus sintoma

⚠ **A distinção que decide se o patch é completo — e frequentemente ele não é.**

| | Correção de SINTOMA | Correção de CAUSA RAIZ |
|---|---|---|
| **O que faz** | Impede o caso específico reportado | Elimina a possibilidade do padrão |
| **Onde** | No ponto do crash | Na fronteira, ou no tipo |
| **Sobrevive a variante?** | ⚠ **Não** | ✓ Sim |
| **Exemplo** | `if (len == 1024) return erro;` | `if (len > máx) return erro;` |

⚠ **O `PLocator` e o `EnBinDiff` existem por causa disso:** **identificar a correção e julgar se ela
é de raiz** é o passo que **revela se há mais bug ali**.

⚠ **A tabela das correções incompletas mais comuns:**

| Correção incompleta | O que sobra |
|---|---|
| Verificar **um** caminho, não o outro | A mesma falha pelo outro caminho |
| Verificar **depois** do uso | A janela continua aberta |
| Verificar o **resultado**, não a operação | O estouro já aconteceu |
| Corrigir a **função A** e esquecer o **sítio de chamada** | O chamador continua passando dado ruim |
| Corrigir **cópia** do código e não a **original** | O bug vive no original |

⚠ **A primeira linha é a mais frequente.** **O desenvolvedor corrige o caminho que o relatório
descreveu** — e **esquece que a mesma validação faltava no caminho ao lado.** **É onde nasce o
sibling bug** (módulo 7).

⚠ **E a terceira é a armadilha técnica:** **`if (a + b < a)` para detectar estouro é UB** — **a
operação já aconteceu**. **A verificação tem que ser `if (b > SIZE_MAX - a)`.** **É o módulo 5 do
curso de C, e ele reaparece aqui.**

```bash
cd ~/pesquisa-lab/mod03

echo "═══ 2. sintoma vs. causa raiz ═══"
echo
cat <<'EXPL'
  ── PATCH DE SINTOMA (⚠ incompleto) ──
     - if (len < HEADER + total) return -ERR;
     + if (len == 0x400 || len < HEADER + total) return -ERR;
                    ▲
                    └─ ⚠ o valor do PoC, só ele

     ⚠ sobrevive a variante? NÃO.
        "len == 0x400" bloqueia um caso. "len == 0x401" continua.

  ── PATCH DE CAUSA RAIZ (✓ completo) ──
     + if (total > len - HEADER) return -ERR;   ← verifica a CONDIÇÃO
     ⚠ sobrevive? SIM — qualquer valor que estoure é recusado.

  ── PATCH DE RAIZ NO TIPO (✓✓ o melhor) ──
     - uint16_t total;
     + size_t total;              ← o tipo não estoura para o caso real
     + if (count > MAX_ITEMS) return -ERR;

     ✓✓ elimina a CLASSE, não o caso.

  ── E A CORREÇÃO QUE NÃO FUNCIONA ──
     - total = count * ITEM_SIZE;
     + total = count * ITEM_SIZE;
     + if (total < count * ITEM_SIZE) return -ERR;   ← ⚠ já estourou!
     ⚠ isso é UB (curso de C, módulo 5) e não detecta nada.
     ✓ o correto é verificar ANTES:
        if (ITEM_SIZE && count > SIZE_MAX / ITEM_SIZE) return -ERR;
EXPL

echo
echo "═══ 3. avaliando a completude de um patch ═══"
echo
cat > ficha-patch.md <<'EOF'
# Ficha de leitura de patch

## Identificação
| Item | Valor |
|---|---|
| Projeto | |
| CVE / advisory | |
| Commit | |
| Arquivos tocados | |
| Data | |

## Nível 1 — o que mudou
```
[diff literal ou resumo]
```

## Nível 2 — por que isso corrige
[o mecanismo: o que a mudança impede]

## Nível 3 — o invariante violado
[afirmação que DEVE valer, e não era garantida]

## O padrão, abstraído
⚠ em uma frase, sem nomes de variável:
"[o padrão que este patch corrige]"

## Avaliação da completude
| Pergunta | Resposta |
|---|---|
| Corrige o sintoma ou a raiz? | |
| Verifica antes ou depois do uso? | |
| Cobre todos os caminhos? | |
| Sobrevive a variante? | |

## O que sobra (candidatos a irmão)
| # | Onde pode haver o mesmo padrão | Por que | Como confirmar |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
EOF

cat ficha-patch.md
```

⚠ **A ficha é o instrumento.** **A seção "o padrão, abstraído"** é a mais importante: **ela tira os
nomes** e deixa **só a forma** — e é **a forma que você vai procurar em outro lugar.**

⚠ **E a seção "avaliação da completude" é o julgamento.** **Você não aceita o patch como completo
porque existe** — **você avalia se ele fecha a porta ou só o caso.**

**Produza `completude.md`:**

| Pergunta | Sua avaliação |
|---|---|
| Sintoma ou raiz? | |
| Antes ou depois do uso? | |
| Cobre todos os caminhos? | |
| Sobrevive a variante? | |

**Responda:**

1. **O patch que você leu é de sintoma ou de raiz?**
2. **Qual correção incompleta é a mais frequente?**
3. **Por que `if (a + b < a)` não detecta nada?**
4. **Qual o padrão, abstraído**, do seu patch?

---

## 3.3 Quando não há fonte — patch diffing

⚠ **Muitas vezes você tem só os binários.** E o método é o mesmo — **muda a ferramenta.**

| | Com fonte | Sem fonte |
|---|---|---|
| **O que você compara** | o diff do git | **dois binários** |
| **O que você vê** | a linha que mudou | ⚠ **o que a ferramenta conseguiu casar** |
| **Ruído** | baixo | ⚠ **alto (compilador, build)** |
| **Ferramenta** | `git diff`, `diff` | **Ghidra + BinDiff**, `Ghidriff`, `DiffRays` |

⚠ **O ruído é o problema.** **Compiladores diferentes, flags diferentes, e ordem de linkagem**
produzem **diferenças que não são de segurança**. **A frase de um curso profissional sobre o tema é
direta:** *"Compiler/build differences can create enormous noise, so exact build provenance matters."*

⚠ **Por isso a **proveniência do build** importa.** **Você quer os dois binários do MESMO
fornecedor, com o MESMO compilador, diferindo só no patch.** **Se você comparar builds diferentes, o
diff é inútil.**

⚠ **E o `DiffRays` resolve o passo que mais trava:** ele tem **modo automático** que, **dado o CVE**,
**identifica o componente, baixa os dois binários**, e roda o diff. **É o passo que o iniciante
trava — e ele agora é automatizado.**

⚠ **A tabela das ferramentas:**

| Ferramenta | Licença | Modo | Melhor para |
|---|---|---|---|
| **Ghidra + Version Tracking** | Livre | Manual | Aprender o processo |
| **Ghidriff** | Livre | Semi | Ghidra automatizado |
| **BinDiff** | Gratuito (Google) | Manual | Windows, largo uso |
| **DiffRays** | Livre | ⚠ **Automático** | Baixar e diffar por CVE |
| **Diaphora** | Livre (IDA) | Manual | IDA |
| **PLocator** | Pesquisa | Localiza o patch | Quando há patch e referência |

⚠ **E a recomendação é a mesma do curso:** **comece pelo livre** (`Ghidra`), **e automatize depois**.
**Sem entender o processo manual, a saída da ferramenta não te diz nada.**

```bash
cd ~/pesquisa-lab/mod03

echo "═══ 4. o fluxo do patch diffing ═══"
echo
cat <<'EXPL'
  ┌──────────────────────────────────────────────────────────────────┐
  │ 1. IDENTIFICAR A VERSÃO VULNERÁVEL E A CORRIGIDA                 │
  │    ⚠ mesma proveniência: mesmo fornecedor, mesmo compilador      │
  │    · versão N-1  (vulnerável)                                    │
  │    · versão N    (corrigida)                                     │
  ├──────────────────────────────────────────────────────────────────┤
  │ 2. CARREGAR AS DUAS                                            │
  │    · Ghidra → Version Tracking                                  │
  │    · ou DiffRays (automático, por CVE)                          │
  ├──────────────────────────────────────────────────────────────────┤
  │ 3. CORRELACIONAR                                                │
  │    · casar funções entre as duas versões                        │
  │    · ⚠ rodar mais de um correlator, e reavaliar                  │
  ├──────────────────────────────────────────────────────────────────┤
  │ 4. FILTRAR O RUÍDO                                              │
  │    · descartar função que mudou só por build                    │
  │    · ⚠ procurar mudança de LÓGICA, não de forma                  │
  ├──────────────────────────────────────────────────────────────────┤
  │ 5. LER A FUNÇÃO QUE MUDOU                                       │
  │    · descompilar antes e depois                                 │
  │    · ⚠ e aplicar os TRÊS NÍVEIS (o que mudou / por que / padrão) │
  ├──────────────────────────────────────────────────────────────────┤
  │ 6. RECONSTRUIR O BUG                                            │
  │    · o que a versão ANTIGA permite                              │
  │    · e o que a nova recusa                                      │
  └──────────────────────────────────────────────────────────────────┘

  ⚠ o passo 4 é o que separa leitura de ruído.
     um diff com 400 função mudada tem 3 relevantes — e achar as 3 é o trabalho.
EXPL

echo
echo "═══ 5. o que sobra no diff: sinal vs. ruído ═══"
echo
cat <<'EXPL'
  ── SINAL (mudança de segurança, provavelmente) ──
     · um `if` acrescentado
     · uma comparação com limite
     · uma verificação de tipo
     · uma mudança de tipo (uint16 → size_t)
     · um retorno de erro novo
     · uma chamada de validação acrescentada
     · ordem de operações trocada (validação ANTES)

  ── RUÍDO (mudança de build) ──
     · endereço diferente
     · registrador diferente
     · otimização diferente
     · função inline/desinlined
     · ordem de seções
     · strings movidas
     · ⚠ e a maior parte do diff costuma ser isto

  ✓ e a heurística: mudança de CONTROLE DE FLUXO é sinal.
     mudança de FORMA (mesmo fluxo, instruções diferentes) é ruído.
EXPL
```

⚠ **A heurística final é o que economiza tempo.** **Mudança de controle de fluxo** (`if` novo,
comparação nova, retorno novo) é **sinal**. **Mudança de forma** (mesmo fluxo, instrução diferente)
é **ruído**.

⚠ **E é o mesmo raciocínio do `PLocator`:** ele **localiza o código do patch** a partir de **duas
funções de referência** — porque **a mudança de segurança é LOCALIZÁVEL**, e **o resto é ruído.**

**Produza `patch-diffing.md`:**

| Passo | O que fazer | O que dá errado |
|---|---|---|
| 1 — versões | | |
| 2 — carregar | | |
| 3 — correlacionar | | |
| 4 — filtrar ruído | | |
| 5 — ler a função | | |
| 6 — reconstruir | | |

**Responda:**

1. **Por que a proveniência do build importa?**
2. **Cite cinco itens de sinal** e cinco de ruído.
3. **Qual a heurística** para separar os dois?
4. **Qual ferramenta automatiza** o passo que trava?

---

## 3.4 O irmão do padrão

⚠ **A seção que transforma "acha 1-day" em "acha bug novo".**

⚠ **A ideia:** **o patch corrige UM lugar. O padrão existe em outros.** E é o que o material do
`TORCH` chama de **variant analysis** — *"the same flawed pattern often exists elsewhere the patch
did not touch"*.

⚠ **A sequência:**

```
1. leia o patch           → o invariante violado
2. abstraia o padrão      → sem nomes de variável
3. formule a BUSCA        → como o padrão aparece no código
4. procure em outros      → o mesmo projeto, e o ecossistema
5. CONFIRME               → leia, não suponha
6. ⚠ e é aqui que nasce o achado ORIGINAL
```

⚠ **A etapa 3 é a mais mecânica e a mais importante.** **Você transforma o padrão em busca:**

| Padrão | Como buscar |
|---|---|
| "campo usado em aritmética sem faixa" | `grep` por `*` e `+` com nome de campo |
| "validação depois do uso" | ler a ordem no fluxo |
| "um caminho valida, o outro não" | comparar caminhos irmãos |
| "tipo pequeno para valor real" | `grep` por `uint16_t`/`int` em tamanho |
| "confia no campo de tamanho" | `grep` por `len`/`size`/`count` no uso |

⚠ **A linha do "um caminho valida, o outro não" merece a explicação.** **Muitos parsers têm caminho
rápido e caminho lento** — ou **versão 1 e versão 2 do formato**. **Se o patch corrigiu um e não o
outro, o outro tem o bug.** **E frequentemente é o caminho menos usado — que ninguém testou.**

⚠ **E é a razão de a etapa 5 ser "confirme, não suponha".** **Encontrar o padrão é hipótese** —
**você precisa LER o outro lugar e verificar que ele também não valida.** **É o módulo 6.**

```bash
cd ~/pesquisa-lab/mod03

echo "═══ 6. da invariante à busca ═══"
echo
cat > do-padrao-a-busca.md <<'EOF'
# Do padrão à busca

## O patch de origem
| Item | Valor |
|---|---|
| CVE / commit | |
| O invariante violado | |
| O padrão, abstraído (sem nomes) | |

## A busca
| # | Termo / expressão | Onde procurar | Por que este termo |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## Os comandos
```bash
# ⚠ ajuste ao seu projeto
grep -rEn '<termo>' --include='*.c' .
```

## Candidatos encontrados
| # | Arquivo:linha | O padrão está lá? | Confirmei? | Observação |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

## Veredito por candidato
| # | É o mesmo padrão? | Valida antes do uso? | Vira achado? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
EOF

cat do-padrao-a-busca.md

echo
echo "═══ 7. os cinco tipos de irmão ═══"
echo
cat <<'EXPL'
  ── 1. IRMÃO NO MESMO ARQUIVO ──
     a função ao lado faz a mesma coisa, sem a validação
     ⚠ o mais fácil de achar — e o mais provável de existir

  ── 2. IRMÃO POR CAMINHO (versão rápida / lenta) ──
     dois caminhos para o mesmo dado; um valida, o outro não
     ⚠ frequentemente o caminho MENOS usado — e nunca testado

  ── 3. IRMÃO POR FORMATO ──
     o mesmo parser, outro formato; a validação foi esquecida num
     ✓ muito comum em bibliotecas que suportam vários formatos

  ── 4. IRMÃO POR ECOSSISTEMA ──
     OUTRO PROJETO que implementa o mesmo formato/protocolo
     ⚠⚠ é aqui que o achado deixa de ser 1-day e vira 0-day
        ✓ é o que o HTTP Garden fez: 100+ bugs em VÁRIOS servidores

  ── 5. IRMÃO POR ESPECIFICAÇÃO ──
     o RFC/protocolo diz como validar; VÁRIAS implementações erram igual
     ✓ é a origem dos parser differentials (módulo 2, região 1)
EXPL
```

⚠ **A linha 4 é a que produz o achado original.** **Você achou o padrão no projeto A, e o projeto B
implementa o mesmo formato** — **e o projeto B não recebeu o patch.** **Isso não é 1-day: é 0-day.**

⚠ **E é exatamente o que o `HTTP Garden` fez.** **Fuzzing diferencial de fluxo HTTP** achou **100+
bugs em servidores populares** — **não em um, no conjunto.** **A superfície estava espalhada.**

**Produza `irmaos.md`:**

| Tipo | Onde procurar | Candidatos |
|---|---|---|
| Mesmo arquivo | | |
| Por caminho | | |
| Por formato | | |
| Por ecossistema | | |
| Por especificação | | |

**Responda:**

1. **Quantos candidatos** você encontrou?
2. **Qual tipo é o mais provável** de dar resultado?
3. **Qual é o mais valioso?** Por quê?
4. **Você confirmou** algum? Ou ainda é hipótese?

---

## 3.5 LAB — Leia um patch de verdade

**Duração:** 120 min

### Passo 1 — Escolha e leia (45 min)

⚠ **Escolha um patch real. Qualquer um que você consiga encontrar.**

```bash
cd ~/pesquisa-lab/mod03

echo "═══ ONDE ENCONTRAR PATCHES ═══"
echo
cat <<'EXPL'
  ── 1. GitHub Advisories (o mais fácil) ──
     https://github.com/advisories
     · cada advisory tem o commit da correção
     · ✓ e frequentemente o diff já está linkado

  ── 2. Commit de correção direto ──
     procure no git log por:
       · "fix", "CVE", "security", "overflow", "bounds", "validate"
     git log --oneline --grep='CVE' | head -20
     git log --oneline --grep='overflow\|bounds\|validate' | head -20

  ── 3. Advisory do fornecedor ──
     · Microsoft Patch Tuesday
     · Red Hat / Debian security tracker
     · ✓ com frequência o commit está linkado

  ── 4. Um projeto que você usa ──
     ⚠ a melhor opção: você já conhece o contexto
     git log --oneline -50   (procure commits de correção)

  ⚠ ESCOLHA um patch cujo código você CONSIGA ler.
     não comece pelo kernel. comece por uma biblioteca pequena.
EXPL

cat > caderno/03-patch.md <<'EOF'
# INV-003 — leitura de patch

**Data:** ____

## Identificação
| Item | Valor |
|---|---|
| Projeto | |
| CVE / advisory | |
| Commit (URL) | |
| Arquivos tocados | |
| Linguagem | |

## O diff
```
[cole o diff aqui]
```

## Nível 1 — o que mudou
[em uma frase]

## Nível 2 — por que isso corrige
[o mecanismo]

## Nível 3 — o invariante violado
[o que DEVE valer, e não era garantido]

## O padrão, abstraído
⚠ SEM nomes de variável: "[o padrão]"

## Avaliação
| Pergunta | Resposta |
|---|---|
| Sintoma ou raiz? | |
| Verifica antes ou depois? | |
| Cobre todos os caminhos? | |
| Sobrevive a variante? | |

## Candidatos a irmão
| # | Onde | Tipo de irmão | Como confirmar |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## O que isso destrava
[a próxima pergunta]
EOF

echo "═══ a ficha criada ═══"
echo "  ⚠ preencha com o SEU patch"
cat caderno/03-patch.md | head -20
```

Produza `patch-lido.md`:

| Nível | Sua resposta |
|---|---|
| 1 — o que mudou | |
| 2 — por que corrige | |
| 3 — invariante | |
| Padrão abstraído | |

**Responda:**

1. **Qual projeto e qual CVE?**
2. **Quantos arquivos o patch toca?**
3. **O patch é de sintoma ou de raiz?**
4. **O padrão abstraído — escreva em uma frase.**
5. **O patch verifica antes ou depois** do uso?

### Passo 2 — A busca pelo irmão (50 min)

⚠ **Agora a parte que produz achado.**

```bash
cd ~/pesquisa-lab/mod03

echo "═══ BUSCANDO O IRMÃO ═══"
echo
cat <<'EXPL'
  ⚠ o padrão abstraído vira BUSCA.

  ── exemplo: o padrão é "campo de tamanho usado sem faixa" ──

  buscar o USO do campo:
    grep -rEn '\b(len|size|count|n_?\w*)\s*[*+]' --include='*.c' .

  buscar a ALOCAÇÃO com ele:
    grep -rEn '(malloc|calloc|realloc)\s*\([^)]*\b(len|size|count)' .

  buscar a CÓPIA com ele:
    grep -rEn '(memcpy|memmove|copy)\s*\([^,]+,[^,]+,\s*\w*(len|size|count)' .

  buscar a ORDEM (validação depois?):
    ⚠ isto não é grep — é LEITURA do fluxo.

  ── e o irmão mais fácil: MESMO ARQUIVO, função vizinha ──
    ⚠ leia as 3 funções antes e depois da que foi corrigida
    ✓ a chance de uma delas ter o mesmo padrão é alta
EXPL

cat > caderno/03-busca-irmao.md <<'EOF'
# Busca pelo irmão

## O padrão
"[padrão abstraído, sem nomes]"

## Os termos de busca
| # | Termo | Justificativa |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

## Resultado bruto
| # | Arquivo:linha | Trecho | Candidato? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## Verificação (⚠ LER, não supor)
| # | Candidato | Valida antes do uso? | É o mesmo padrão? | Vira achado? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

## Conclusão
[ ] irmão encontrado e confirmado
[ ] irmão encontrado, NÃO confirmado (hipótese aberta)
[ ] nenhum irmão no mesmo projeto — procurar no ECOSSISTEMA
EOF
cat caderno/03-busca-irmao.md
```

Produza `busca-irmao.md`:

| # | Candidato | É o mesmo padrão? | Confirmado? |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantos candidatos** a busca deu?
2. **Algum é o mesmo padrão?** Ou é falso positivo?
3. **Você leu o código** do candidato, ou só viu o `grep`?
4. **Se não achou no projeto**, onde mais procurar?

⚠ **A resposta 3 é a mais importante.** **Um `grep` que casa não é um irmão.** **Irmão é o mesmo
PADRÃO, verificado por leitura** — e **é aí que o falso positivo se separa do achado.**

### Passo 3 — Reconstrua o bug (25 min)

Produza `reconstrucao.md`:

```markdown
# Reconstrução do bug

## A versão vulnerável
| Item | Valor |
|---|---|
| Versão | |
| O que ela PERMITE | |
| Por que isso é bug | |

## O caminho até a falha
1. [entrada controlada por quem?]
2. [qual suposição o código faz?]
3. [como a suposição falha?]
4. [qual é a consequência?]

## A primitiva (se houver)
| Item | Valor |
|---|---|
| Overflow de stack? | |
| Leitura/escrita arbitrária? | |
| DoS? | |
| Lógica? | |
| ⚠ Não sei ainda? | ✓ pode dizer isso |

## E a versão corrigida
| Item | Valor |
|---|---|
| O que ela recusa | |
| O caminho que ficou fechado | |
| O caminho que ficou ABERTO (se houver) | |

## O que eu NÃO consegui determinar
⚠ mínimo 2 — e é legítimo não conseguir
- 
- 
```

**Responda:**

1. **Qual a primitiva** do bug? Ou você ainda não sabe?
2. **Qual caminho ficou aberto?** (Se houver.)
3. **O que você não conseguiu determinar?** Escreva.
4. **O irmão é 1-day ou 0-day?** O que o torna um ou outro?

### Critérios de aceitação

- `tres-niveis.md` com os **três** níveis e a resposta sobre o que é reutilizável.
- Você aplicou os **três níveis** ao patch que escolheu.
- Você abstraiu **o padrão sem nomes de variável**.
- `completude.md` com as **quatro** perguntas respondidas.
- Você identificou se o patch é de **sintoma ou de raiz**.
- Você explicou por que **`if (a + b < a)` não detecta estouro**.
- `patch-diffing.md` com os **seis** passos e os itens de sinal/ruído.
- Você explicou **por que a proveniência do build importa**.
- `irmaos.md` com os **cinco** tipos de irmão.
- Você distinguiu **irmão por ecossistema** de **1-day**.
- `patch-lido.md` com os três níveis e o padrão abstraído.
- `busca-irmao.md` com pelo menos **três** termos de busca.
- Você **leu** os candidatos — não só rodou `grep`.
- `reconstrucao.md` com o caminho até a falha e o que **não** conseguiu determinar.
- ⚠ **Nenhum teste contra sistema de terceiro.** Só leitura.

---

## Avaliação

1. **Por que o patch é a documentação mais honesta de um bug?**
2. **Cite os três níveis de leitura** de um patch.
3. **Qual nível a maioria para?** O que ele não dá?
4. **Qual a diferença operacional** entre o nível 2 e o 3?
5. **O que é um invariante?** Dê três exemplos.
6. **Diferencie correção de sintoma de correção de causa raiz.**
7. **Cite três correções incompletas** e o que sobra em cada.
8. **Por que `if (a + b < a)` não detecta estouro?** Qual o correto?
9. **Por que a proveniência do build importa** no patch diffing?
10. **Cite cinco itens de sinal** num diff de binário.
11. **Cite cinco itens de ruído.**
12. **Qual a heurística** para separar sinal de ruído?
13. **O que o `DiffRays` automatiza?** Por que isso importa?
14. **O que o `PLocator` faz?**
15. **Por que o `EnBinDiff` reduziu o falso negativo?**
16. **Cite os cinco tipos de irmão.**
17. **Por que "irmão por ecossistema" dá 0-day** e não 1-day?
18. **Por que um `grep` que casa não é um irmão?**
19. **O que o `HTTP Garden` fez** que ilustra o irmão por ecossistema?
20. **Por que é legítimo não determinar** a primitiva de um bug?

---

**Próximo:** [Módulo 4 — Ler um CVE](modulo-04.md)
