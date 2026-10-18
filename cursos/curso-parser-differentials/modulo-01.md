# Módulo 1 — Onde Duas Implementações Discordam

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** Pesquisa em Segurança (módulos 6 e 7) · Fuzzing

---

## Objetivos

1. Entender **por que** duas implementações da mesma spec discordam.
2. Reconhecer por que **a discordância É o bug** — e não um detalhe.
3. Ver o **rendimento medido** da técnica.
4. Montar o laboratório de N implementações.
5. Escolher **duas implementações** para o primeiro diferencial — com critério.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o curso:**

> **Uma especificação descreve o que é válido. Ela não descreve o que fazer com o que é
> inválido.** **E é exatamente aí que N implementadores decidem por conta própria.**

⚠ **E o exemplo, porque ele é o mais provado:**

```
RFC 7230, §3.5 — "Message Parsing Robustness"

⚠ a RFC DIZ que um servidor deve ser robusto.
   e NÃO DIZ o que fazer com um pedido ambíguo.

──────────────────────────────────────────────────────────────────────
IMPLEMENTAÇÃO A: lê o header ambíguo e escolhe UMA interpretação
IMPLEMENTAÇÃO B: lê o MESMO header e escolhe OUTRA
──────────────────────────────────────────────────────────────────────

⚠ as duas estão "dentro da RFC".
   e discordam sobre O QUE A MENSAGEM É.
```

⚠ **A tese:** **você não precisa achar um bug em nenhuma das duas.** **Basta achar que elas
**discordam** — porque então uma das duas está errada em relação à outra, **e a discordância é o
bug.**

⚠ **E a razão de isso ser um curso inteiro, e não um módulo:**

| O que o módulo 10 do Patch Diffing ensinou | O que este curso acrescenta |
|---|---|
| O padrão existe em N projetos | ⚠ **Onde a spec deixa em aberto — os pontos** |
| Procure a pergunta | ⚠ **Compare COMPORTAMENTO, não leitura** |
| Leia cada implementação | ⚠ **O harness que escala a N** |
| O irmão vira 0-day | ⚠ **O WAF e a camada, como casos** |

⚠ **E a evidência de que a área é produtiva, e ela é medida:**

| Trabalho | O que fez | Resultado | Ano |
|---|---|---|---|
| **HTTP Garden** | Fuzzing diferencial de fluxo HTTP | ⚠ **100+ bugs, 68 corrigidos, 39 exploráveis** | 2024 |
| **WAFFLED** | Divergência entre WAFs e servidores | ⚠ **120+ exploits contra 5 WAFs** | 2025 |
| **HTTP/1.1 Must Die** | O smuggler como ferramenta | Confirma o framing como alvo | 2025 |
| **USENIX "Parser Differentials"** | Formalização do campo | O campo como área | — |

⚠ **Os dois números — 100+ e 120+ — são o argumento.** **Não são bugs famosos; são bugs achados por
método** — **e ambos em servidores modernos, mantidos, testados.**

⚠ **A tese, reescrita:** **não é preciso ser o primeiro a achar o bug. É preciso ser o primeiro a
comparar duas implementações que ninguém comparou.**

---

## 1.1 Por que implementações discordam

⚠ **Cinco causas. E as cinco são estruturais, não descuido.**

| # | Causa | Exemplo |
|---|---|---|
| 1 | **A spec omite o caso** | O que fazer com dois `Content-Length`? |
| 2 | **A spec é ambígua** | "should" vs. "must" |
| 3 | **A spec mudou** | RFC antiga vs. nova |
| 4 | **A lib foi reusada** | Um parser HTTP em um cliente de e-mail |
| 5 | ⚠ **O atalho** | Tolerância "para funcionar com clientes quebrados" |

⚠ **A causa 5 é a mais comum e a mais perigosa.** **Implementações reais adicionam tolerância** —
**"aceito isso porque um cliente antigo manda assim"** — **e a tolerância de A não é a de B.**

⚠ **E a tolerância é a origem do smuggling.** **A implementação que "aceita mais" é a que deixa
bytes sobrando** — **e bytes sobrando viram a próxima requisição.**

⚠ **A tabela da causa → onde procurar:**

| Causa | Onde procurar |
|---|---|
| Omite | ⚠ **Os casos que a spec não trata** |
| Ambígua | Os `should` na spec |
| Mudou | A diferença entre RFCs |
| Reuso | Onde a lib é usada fora do contexto |
| ⚠ **Atalho** | ⚠ **O que a implementação "tolera"** |

⚠ **A regra escrita:**

> **A divergência não nasce de um erro. Nasce de uma decisão.** **E onde há decisão não
> especificada, há pelo menos duas.**

⚠ **E é o mesmo princípio do módulo 5 do curso de Pesquisa — o "design" as escolhas.** **A spec é um
conjunto de escolhas explícitas** — **e as implícitas são o que ninguém combinou.**

```bash
mkdir -p ~/parser-lab/mod01 && cd ~/parser-lab/mod01

echo "═══ 1. por que discordam ═══"
echo
cat > discordam.md <<'EOF'
# Por que duas implementações discordam

## As cinco causas
| # | Causa | Exemplo | Onde procurar |
|---|---|---|---|
| 1 | a spec OMITE o caso | dois Content-Length | os casos não tratados |
| 2 | a spec é AMBÍGUA | "should" vs. "must" | os `should` na spec |
| 3 | a spec MUDOU | RFC antiga vs. nova | a diferença entre RFCs |
| 4 | a lib foi REUSADA | parser HTTP em e-mail | onde a lib sai do contexto |
| 5 | ⚠ **O ATALHO** | tolerância "para funcionar" | ⚠ o que ela TOLERA |

## ⚠ a causa 5 é a origem do smuggling
implementações reais adicionam tolerância.
"aceito isso porque um cliente antigo manda assim"
⚠ e a tolerância de A não é a de B.

e a que ACEITA MAIS é a que deixa bytes sobrando.
✓ bytes sobrando viram a PRÓXIMA requisição.

## ⚠ A REGRA
a divergência não nasce de um erro. nasce de uma DECISÃO.
e onde há decisão não especificada, há pelo menos duas.
EOF

cat discordam.md

echo
echo "═══ 2. o que a RFC realmente diz ═══"
echo
cat <<'EXPL'
  ── RFC 9110 / 9112 (as atuais) ──
     · 9110 = semântica do HTTP
     · 9112 = HTTP/1.1, e a SINTAXE

  ── E A SEÇÃO QUE IMPORTA ──
     RFC 9112 §6.3 — parsing de mensagem
     ⚠ e ela RECONHECE que a ambiguidade existe:

        "Se uma mensagem recebida tem AMBOS os campos
         Content-Length e Transfer-Encoding..."

     ⚠ e aí ela DIZ O QUE FAZER — com "must".
        mas as implementações ANTIGAS não seguem.
        ✓ e é aqui que a discordância vive.

  ── E A SEÇÃO HISTÓRICA ──
     RFC 7230 §3.5 — "Message Parsing Robustness"
     ⚠ ela PEDE robustez, e NÃO diz o que fazer
        com cada caso ambíguo.
     ✓ é literalmente a spec deixando em aberto.
EXPL

echo
echo "  ⚠ veja com os próprios olhos:"
echo "     as RFCs estão em https://www.rfc-editor.org/"
echo "     · RFC 9112 §6.3  → o parsing"
echo "     · RFC 7230 §3.5  → a robustez (histórica)"
```

⚠ **A ponte com a spec é o que torna o curso sólido.** **Você não está procurando "bugs estranhos"
— está procurando **os pontos onde a spec reconhece a ambiguidade e não a resolve.****

⚠ **E é verificável:** **você lê a RFC e sabe onde procurar.** **Não é adivinhação.**

⚠ **A regra escrita:**

> **Leia `must` na spec como o que ambos farão. Leia `should` como o que eles farão diferente.**

**Produza `discordam.md`:**

| Causa | Onde procurar | No seu alvo |
|---|---|---|
| Omite | | |
| Ambígua | | |
| Atalho | | |

**Responda:**

1. **Qual causa é a mais perigosa?** Por quê?
2. **Por que a que "aceita mais" é a perigosa?**
3. **O que a RFC 7230 §3.5 pede** que a torna origem do problema?
4. **A divergência nasce de erro ou de decisão?**

---

## 1.2 Por que a discordância É o bug

⚠ **O argumento, e ele é o coração do curso.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ A SITUAÇÃO                                                           │
│                                                                      │
│   · A recebe bytes B e produz resultado RA                            │
│   · B recebe os MESMOS bytes B e produz resultado RB                  │
│   · ⚠ RA ≠ RB                                                          │
│                                                                      │
│ AS TRÊS POSSIBILIDADES                                               │
│                                                                      │
│   1. A viola a spec           → ⚠ BUG NO A                            │
│   2. B viola a spec           → ⚠ BUG NO B                            │
│   3. a spec não decide        → ⚠ BUG NA SPEC                         │
│                                                                      │
│ ⚠ NAS TRÊS, HÁ UM BUG.                                               │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **É o que o divide: não importa **qual** das duas está errada** — **a discordância prova que
**pelo menos uma** está.** **E na prática, quem manda o dado é A e quem o recebe é B** — **e é aí
que a discordância vira exploração.**

⚠ **A tabela do que a discordância habilita, por contexto:**

| Contexto | Onde a discordância mora | O que habilita |
|---|---|---|
| **Proxy ↔ servidor** | o framing | ⚠ **Request smuggling** |
| **WAF ↔ servidor** | o que é "normalizado" | ⚠ **Bypass do WAF** |
| **Filtro ↔ destino** | o que é "filtrado" | Sanitização incompleta |
| **Cliente ↔ servidor** | o que é "a resposta" | Desync |
| **Cache ↔ origem** | o que é "a mesma chave" | ⚠ **Cache poisoning** |

⚠ **A primeira e a segunda linhas são os dois grandes casos do curso** — **e ambos os trabalhos
citados os exploram:** **o `HTTP Garden` compara **camadas** (linha 2), e o `WAFFLED` compara
**WAF ↔ servidor** (linha 2).**

⚠ **E a quinta linha é o caso que mais cresce** — **porque o cache é uma implementação a mais**, **e
ele é a que decide o que é "a mesma requisição".**

⚠ **A regra escrita:**

> **Não pergunte "qual das duas está errada". Pergunte "o que acontece entre as duas".** **A
> discordância é o bug, e o que ela habilita é o que importa.**

```bash
cd ~/parser-lab/mod01

echo "═══ 3. por que a discordância É o bug ═══"
echo
cat > e-o-bug.md <<'EOF'
# Por que a discordância É o bug

## As três possibilidades
| # | Situação | Conclusão |
|---|---|---|
| 1 | A viola a spec | ⚠ bug no A |
| 2 | B viola a spec | ⚠ bug no B |
| 3 | a spec não decide | ⚠ bug na spec |

⚠ nas TRÊS há um bug. a discordância PROVA que pelo menos uma erra.

## O que a discordância habilita
| Contexto | Onde mora | O que habilita |
|---|---|---|
| proxy ↔ servidor | o framing | ⚠ request smuggling |
| WAF ↔ servidor | o que é normalizado | ⚠ bypass do WAF |
| filtro ↔ destino | o que é filtrado | sanitização incompleta |
| cliente ↔ servidor | o que é a resposta | desync |
| cache ↔ origem | o que é a mesma chave | ⚠ cache poisoning |

## ⚠ os dois grandes casos
· HTTP Garden → compara CAMADAS
· WAFFLED     → compara WAF ↔ SERVIDOR

## ⚠ A REGRA
não pergunte "qual das duas erra".
pergunte "o que acontece ENTRE as duas".
EOF

cat e-o-bug.md

echo
echo "═══ 4. o modelo mental: o dado atravessa duas implementações ═══"
echo
cat <<'EXPL'
  ┌──────────┐            ┌──────────┐            ┌──────────┐
  │ CLIENTE  │  ────────► │ PROXY /  │  ────────► │ SERVIDOR │
  │          │   bytes    │ WAF      │   bytes    │          │
  └──────────┘            └──────────┘            └──────────┘
       ▲                        ▲                      ▲
       │                        │                      │
   interpreta A             interpreta B          interpreta C
       │                        │                      │
       └────────────────────────┴──────────────────────┘
                                │
              ⚠ se A, B e C não concordam sobre ONDE
                 A MENSAGEM TERMINA, os bytes que sobram
                 para um são a PRÓXIMA mensagem para outro.

  ✓ e é isso que o curso procura: a discordância de INTERPRETAÇÃO
     entre implementações que veem os MESMOS bytes.
EXPL
```

⚠ **O modelo de três implementações é o instrumento do curso.** **E ele mostra que a pergunta não é
"o parser está certo?"** — **é "os parsers concordam?"**

⚠ **E é a razão de o `HTTP Garden` comparar **N servidores** em vez de fuzzer um só.** **Um sozinho
não revela nada; a **discordância** revela.**

**Produza `e-o-bug.md`:**

| Contexto | O que habilita |
|---|---|
| Proxy ↔ servidor | |
| WAF ↔ servidor | |
| Cache ↔ origem | |

**Responda:**

1. **Quais são as três possibilidades?** Por que todas contêm bug?
2. **Onde a discordância vira exploração?**
3. **Por que o `HTTP Garden` compara N** em vez de fuzzer um?
4. **Qual contexto cresce mais?** Por quê?

---

## 1.3 O rendimento medido

⚠ **Os dois números, e o que cada um prova.**

| Trabalho | Números | O que prova |
|---|---|---|
| **HTTP Garden** | 100+ bugs · 68 corrigidos · 39 exploráveis | **A técnica escala** |
| **WAFFLED** | 120+ exploits · 5 WAFs | ⚠ **Funciona contra defesa** |

⚠ **O número "39 exploráveis" é o mais informativo.** **100 bugs de parsing seriam curiosidade** —
**39 exploráveis significa que a discordância tem consequência.** **É o que distingue o
trabalho de uma lista de excentricidades.**

⚠ **E o `WAFFLED` prova o caso mais valioso:** **contra WAFs.** **Um WAF é uma implementação a mais**
— **e ele discorda do servidor que protege.** **120 exploits contra 5 produtos comerciais.**

⚠ **A tabela do que a área produziu, por alvo:**

| Alvo | Trabalho | Achados |
|---|---|---|
| **N servidores** | HTTP Garden | 100+ bugs |
| **5 WAFs** | WAFFLED | 120+ exploits |
| Proxy + servidor | HTTP/1.1 Must Die | Framing |
| Caches | Pesquisa recente | ⚠ Cache poisoning |

⚠ **A primeira linha é a mais importante metodologicamente.** **O `HTTP Garden` não fuzzou um
servidor; ele fuzzou a **relação entre N servidores**.**** **É a diferença de método que faz o
rendimento.**

⚠ **E é o que o módulo 5 constrói:** **o harness que compara N, não o que testa um.**

⚠ **A regra escrita:**

> **Testar um parser acha o que ele erra sozinho. Comparar N parsers acha o que eles erram **entre
> si** — e é onde o rendimento está.**

```bash
cd ~/parser-lab/mod01

echo "═══ 5. o rendimento, e o que ele mede ═══"
echo
cat > rendimento.md <<'EOF'
# O rendimento medido

## Os dois trabalhos
| Trabalho | Números | Prova |
|---|---|---|
| HTTP Garden | 100+ bugs · 68 corrigidos · 39 exploráveis | a técnica escala |
| WAFFLED | 120+ exploits · 5 WAFs | ⚠ funciona contra defesa |

## ⚠ e o número mais informativo: 39 exploráveis
100 bugs de parsing seriam curiosidade.
39 exploráveis significa CONSEQUÊNCIA.
✓ distingue o trabalho de uma lista de excentricidades.

## Por alvo
| Alvo | Trabalho | Achados |
|---|---|---|
| N servidores | HTTP Garden | 100+ |
| 5 WAFs | WAFFLED | 120+ |
| proxy + servidor | HTTP/1.1 Must Die | framing |
| caches | pesquisa recente | cache poisoning |

## ⚠ o método é a diferença
testar UM parser acha o que ele erra SOZINHO.
comparar N parsers acha o que eles erram ENTRE SI.
✓ é onde o rendimento está.

## ⚠ e o custo
· subir N implementações no SEU lab
· escrever o harness (módulo 5)
· corpus de FRONTEIRA por campo
· ⚠ e tempo de CPU — não de força bruta
EOF

cat rendimento.md

echo
echo "═══ 6. o laboratório ═══"
echo
cat > monta-lab.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "═══ LABORATÓRIO DE PARSER DIFFERENTIALS ═══"
echo

cd ~/parser-lab 2>/dev/null || { mkdir -p ~/parser-lab && cd ~/parser-lab; }

for d in impls corpus harness caderno; do
    mkdir -p "$d"
    printf '  ✓ %s/\n' "$d"
done
echo

cat > impls/README.md <<'EOF'
# Implementações

## Convenção
   impls/<nome>/<versao>/

## ⚠ REGRAS
   · baixadas e compiladas por VOCÊ
   · NENHUMA aponta para serviço de terceiro
   · rodam em localhost, ou em container isolado
   · registre a VERSÃO e a origem de cada uma

## O que guardar por implementação
| Campo | Valor |
|---|---|
| nome / versão | |
| origem (URL) | |
| como compilar | |
| como subir | |
| porta local | |
EOF

cat > corpus/README.md <<'EOF'
# Corpus

## ⚠ NÃO é aleatório
o corpus é de FRONTEIRA — por CAMPO e por PONTO DE DIVERGÊNCIA.

## Estrutura
   corpus/<formato>/<ponto>.bin

## O que incluir por ponto
| Valor | Por quê |
|---|---|
| o caso normal | controle |
| o vazio | caso de borda |
| o dobro do limite | faixa |
| ⚠ o limite exato | off-by-one |
| ⚠ o limite + 1 | fronteira |
| o máximo do tipo | overflow |
| ⚠ o AMBÍGUO | ← o que importa aqui |
EOF

cat > harness/README.md <<'EOF'
# Harness

## O que ele faz
1. lê o corpus
2. manda a MESMA entrada a TODAS as implementações
3. normaliza a saída
4. ⚠ reporta onde discordam

## ⚠ o que ele NÃO faz
não diz qual está certa.
não julga se é bug.

✓ ele dá as DISCORDÂNCIAS. o critério é o módulo 3.
EOF

cat > caderno/README.md <<'EOF'
# Caderno — módulo 3 do curso de Pesquisa

## Por investigação
- ID e título
- a pergunta
- ⚠ o PONTO DE DIVERGÊNCIA e por que a spec não decide
- a hipótese
- ⚠ o critério de falsificação
- o teste (o corpus)
- a evidência (a discordância literal)
- ⚠ a classificação (bug / legítima / spec)
- conclusão
EOF

echo "  ✓ READMEs criados"
echo

echo "═══ VERIFICANDO AS FERRAMENTAS ═══"
echo
for t in gcc g++ python3 go rustc node; do
    printf '  %-10s ' "$t:"
    command -v "$t" >/dev/null 2>&1 && "$t" --version 2>/dev/null | head -1 || echo "⚠ ausente"
done
printf '  %-10s ' "curl:"
command -v curl >/dev/null 2>&1 && echo "✓" || echo "⚠ ausente"
echo

echo "── PYTHON ──"
pip3 install --quiet requests pwntools 2>&1 | tail -1
for m in requests pwn; do
    printf '  %-12s ' "$m:"
    python3 -c "import $m" 2>/dev/null && echo "✓" || echo "⚠"
done
echo

echo "── ⚠ O QUE O CURSO NÃO USA ──"
cat <<'EXPL'
  · NENHUM serviço de terceiro
  · NENHUM WAF de produção
  · NENHUMA instância que não seja sua

  ✓ você baixa as implementações, sobe no seu lab,
     e a comparação é entre processos LOCAIS.
EXPL

echo
echo "═══ A ESTRUTURA ═══"
find . -maxdepth 2 -type d | sort | sed 's/^/  /'
SCRIPT

chmod +x monta-lab.sh
./monta-lab.sh
```

⚠ **O README de `corpus/` é o que distingue este curso do fuzzing genérico.** **O corpus não é
aleatório** — **é de fronteira por **ponto de divergência**.** **É o que faz o diferencial
render.**

⚠ **E o README do harness delimita o escopo:** **ele dá as **discordâncias**; o critério é o módulo
3.** **É a mesma divisão do Patch Diffing: a ferramenta lista, você julga.**

**Produza `laboratorio.md`:**

| Pasta | O que guarda | Regra |
|---|---|---|
| `impls/` | | |
| `corpus/` | | |
| `harness/` | | |
| `caderno/` | | |

**Responda:**

1. **O que o corpus tem de diferente** de um corpus de fuzzing?
2. **O que o harness NÃO faz?**
3. **Quais ferramentas faltam** no seu sistema?
4. **Por que a comparação é local?** O que isso garante?

---

## 1.4 As duas primeiras implementações

⚠ **A escolha do primeiro par define o aprendizado. E o critério é diferente do Patch Diffing.**

| Critério | Por quê |
|---|---|
| **Formato simples** | ⚠ **Poucos pontos de divergência** |
| **Duas implementações maduras** | A divergência existe |
| **Fáceis de subir** | Você não perde tempo em build |
| **Spec pública** | ⚠ **Você confere quem está certo** |
| **Sem dependências** | Não arrasta uma stack inteira |
| ⚠ **Não é o HTTP, ainda** | ⚠ **HTTP é o módulo 6** |

⚠ **A última linha é contraintuitiva e importante.** **O HTTP é o alvo mais famoso — e o mais
complexo.** **Você começa por um formato **simples** com spec clara**, **e o módulo 6 leva ao
HTTP.**

⚠ **A tabela dos formatos de treino, por dificuldade:**

| Formato | Pontos de divergência | Serve para |
|---|---|---|
| **CSV** | Aspas, escapes, quebra de linha | ✓ **Começar** |
| **URL / query string** | Codificação, `+` vs. `%20` | ✓ Começar |
| **JSON** | Números grandes, duplicatas | ✓ Bom |
| **Base64** | Padding, caracteres inválidos | ✓ Bom |
| **Datas / ISO 8601** | Fuso, ambíguo, truncado | ✓ Ótimo |
| **Multipart** | Boundary, CRLF | Média |
| **HTTP/1.1** | ⚠ **Framing, TE/CL** | ⚠ **Só no módulo 6** |
| **XML** | Entidades, encoding | Alta |

⚠ **A linha do CSV é a mais subestimada.** **A RFC 4180 é curta, e as implementações discordam
sobre aspas, escapes e quebra de linha em campo** — **e é uma discordância de **framing** em
miniatura.** **É o melhor primeiro exercício.**

⚠ **A linha das datas é a mais elegante.** **Uma data "ambígua"** — `01/02/2025` — **é interpretada
como janeiro ou fevereiro** **por implementações diferentes.** **A discordância é clara, verificável
e inofensiva.** **É o caso de treino perfeito.**

⚠ **A regra escrita:**

> **Você procura a discordância num formato cuja spec você consegue ler inteira.** **O HTTP tem
> 200 páginas; a RFC 4180 tem 3.** **Comece pelas 3.**

```bash
cd ~/parser-lab/mod01

echo "═══ 7. as duas primeiras implementações ═══"
echo
cat > escolha-par.md <<'EOF'
# Escolha do primeiro par

## Critérios
| Critério | Peso | Por quê |
|---|---|---|
| formato simples | alto | poucos pontos de divergência |
| duas impl. maduras | alto | a divergência existe |
| fáceis de subir | médio | não perder tempo em build |
| spec pública | ⚠ alto | conferir quem está certo |
| sem dependências | médio | não arrastar uma stack |
| ⚠ NÃO o HTTP, ainda | alto | HTTP é o módulo 6 |

## Candidatos
| # | Formato | Impl. A | Impl. B | Spec | Escolha? |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## O escolhido
| Item | Valor |
|---|---|
| Formato | |
| Spec (URL) | |
| Impl. A | |
| Impl. B | |
| Por que este | |

## Os pontos de divergência que eu SUSPEITO
| # | Ponto | Por que a spec não decide |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
EOF

cat escolha-par.md

echo
echo "═══ 8. o caso de treino perfeito: a data ambígua ═══"
echo
cat <<'EXPL'
  ── "01/02/2025" ──
     ⚠ é janeiro (formato US) ou fevereiro (formato BR)?

  ── E O MESMO VALE PARA ──
     · números: "1.234" → mil duzentos e trinta e quatro? ou 1,234?
     · booleanos: "1", "yes", "on", "true" → todos verdadeiro?
     · vazio: "" → nulo? vazio? erro?
     · grande: 99999999999999999999 → número? string? erro?

  ── POR QUE É O CASO PERFEITO ──
     ✓ a discordância é CLARA
     ✓ é VERIFICÁVEL (você vê a saída)
     ✓ é INOFENSIVA (não explora nada)
     ✓ a spec (ISO 8601) tem resposta — e muitos não seguem

  ⚠ é o framing em miniatura: "até onde vai o campo?"
EXPL

# demonstra o princípio com Python vs. a biblioteca do sistema
echo
echo "  ── uma demonstração com o que está na sua máquina ──"
python3 - <<'PY'
import locale, datetime
casos = ["01/02/2025", "2025-01-02", "1.234", "1,234"]
print("     ⚠ o MESMO texto, interpretado por duas rotinas:")
print()
for c in casos:
    print(f"     {c!r}")
PY

echo "     ⚠ a discordância aparece quando você tem DUAS implementações."
echo "        e é isso que o módulo 4 monta."
```

⚠ **O caso da data ambígua é o melhor treino.** **A discordância é clara, verificável e
inofensiva** — **e é o framing em miniatura.** **Você aprende o método sem o risco.**

⚠ **E a linha "até onde vai o campo?" é a ponte com o módulo 6.** **Datas, CSV e números discordam
sobre **onde o campo termina** — e o HTTP discorda sobre **onde a mensagem termina**.** **O
princípio é o mesmo.**

**Produza `primeiro-par.md`:**

| Item | Valor |
|---|---|
| Formato | |
| Spec | |
| Impl. A | |
| Impl. B | |
| Pontos suspeitos | |

**Responda:**

1. **Por que não começar pelo HTTP?**
2. **Quais três formatos são bons para treino?** Por quê?
3. **Por que o caso da data ambígua é o perfeito?**
4. **O que "até onde vai o campo?" tem a ver com framing?**

---

## 1.5 LAB — Monte o laboratório

**Duração:** 60 min

### Passo 1 — A estrutura (25 min)

```bash
cd ~/parser-lab

echo "═══ MONTANDO ═══"
bash ~/parser-lab/mod01/monta-lab.sh 2>&1 | head -40
```

Produza `estrutura.md`:

| Pasta | O que guarda | Regra |
|---|---|---|
| `impls/` | | |
| `corpus/` | | |
| `harness/` | | |
| `caderno/` | | |

**Responda:**

1. **A estrutura está criada?**
2. **Quais READMEs existem?** O que cada um delimita?
3. **Quais ferramentas faltam?**
4. **O que o laboratório garante** sobre terceiros?

### Passo 2 — Escolha e suba as duas implementações (35 min)

⚠ **Escolha um formato simples. Suba as **duas** no seu lab.**

```bash
cd ~/parser-lab/impls

echo "═══ SUBINDO AS DUAS ═══"
echo
cat <<'EXPL'
  ── PARA UM FORMATO SIMPLES, VOCÊ NÃO PRECISA DE SERVIDOR ──

     se o formato é CSV, JSON, base64, data:
     ⚠ o "parser" é uma FUNÇÃO, não um serviço.

     ✓ então: escreva DUAS implementações, em linguagens diferentes
        · uma em Python (a stdlib)
        · outra em C, Go, Rust, ou Node
     ✓ e compare as saídas.

  ── E ISSO JÁ É UM PARSER DIFFERENTIAL ──
     · a stdlib do Python vs. a do Go, para a MESMA entrada
     · ⚠ e as discordâncias são reais
EXPL

mkdir -p ~/parser-lab/impls/treino && cd ~/parser-lab/impls/treino

cat > parse_data.py <<'PY'
#!/usr/bin/env python3
"""impl A — a data, do jeito do Python"""
import sys, datetime
for linha in sys.stdin:
    s = linha.strip()
    if not s: continue
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            d = datetime.datetime.strptime(s, fmt)
            print(f"{s}\t{d.strftime('%Y-%m-%d')}\t{fmt}")
            break
        except ValueError:
            continue
    else:
        print(f"{s}\tINVALIDO\t-")
PY

cat > parse_num.py <<'PY'
#!/usr/bin/env python3
"""impl A — o número, do jeito do Python"""
import sys
for linha in sys.stdin:
    s = linha.strip()
    if not s: continue
    try:
        v = float(s.replace(",", "."))
        print(f"{s}\t{v}")
    except ValueError:
        print(f"{s}\tINVALIDO")
PY

cat > parse_num_bruto.py <<'PY'
#!/usr/bin/env python3
"""impl B — o número, SEM normalizar (a discordância)"""
import sys
for linha in sys.stdin:
    s = linha.strip()
    if not s: continue
    partes = s.split(".")
    if len(partes) > 1 and len(partes[1]) == 3 and "," not in s:
        # ⚠ interpreta 1.234 como MIL duzentos e trinta e quatro
        print(f"{s}\t{int(s.replace('.', ''))}\t(separador de milhar)")
    else:
        try:
            print(f"{s}\t{float(s)}\t(decimal)")
        except ValueError:
            print(f"{s}\tINVALIDO\t-")
PY

chmod +x *.py

echo "  ── as duas implementações de número ──"
echo
printf '  %-16s %-24s %s\n' "entrada" "impl A (python)" "impl B (milhar)"
printf '  %-16s %-24s %s\n' "───────" "────────────────" "──────────────"
for v in "1.234" "1,234" "1234" "12.34" "1.234,56"; do
    a=$(echo "$v" | python3 parse_num.py 2>/dev/null)
    b=$(echo "$v" | python3 parse_num_bruto.py 2>/dev/null)
    d=$([ "$(echo "$a" | cut -f2)" != "$(echo "$b" | cut -f2)" ] && echo "⚠ DISCORDAM" || echo "concordam")
    printf '  %-16s %-24s %-24s %s\n' "$v" "$(echo "$a" | cut -f2)" "$(echo "$b" | cut -f2)" "$d"
done
echo
echo "  ⚠ '1.234' é MIL duzentos e trinta e quatro, ou 1,234?"
echo "     ✓ a discordância é real — e a spec não decide."
```

⚠ **O diferencial com duas funções já é um parser differential.** **Você não precisa de servidor nem
de protocolo** — **e as discordâncias são reais.** **É o começo mínimo, e é honesto.**

⚠ **E o caso `1.234` é o instrumento:** **duas leituras, ambas defensáveis, e a spec (a convenção
local) não decide.** **É a discordância.**

**Produza `impls.md`:**

| Implementação | Linguagem | O que interpreta |
|---|---|---|
| A | | |
| B | | |

**Responda:**

1. **As duas rodaram?**
2. **Em quais entradas elas discordam?**
3. **Qual está certa?** A spec decide?
4. **Isso já é um parser differential?** Por quê?

### Critérios de aceitação

- `discordam.md` com as **cinco** causas e onde procurar cada.
- Você explicou **por que a que "aceita mais" é perigosa**.
- Você leu (ou localizou) a **RFC 9112 §6.3** e a **RFC 7230 §3.5**.
- Você explicou **por que `should` e `must` importam**.
- `e-o-bug.md` com as **três** possibilidades.
- Você explicou **por que a discordância proíbe que ambas estejam certas**.
- `e-o-bug.md` com os **cinco** contextos e o que cada um habilita.
- Você explicou **por que o `HTTP Garden` compara N** em vez de fuzzer um.
- `rendimento.md` com os **dois** trabalhos e os números.
- Você explicou **por que "39 exploráveis" é o número mais informativo**.
- O laboratório montado com as **quatro** pastas e os READMEs.
- Você explicou **o que o corpus tem de diferente**.
- `primeiro-par.md` com o par escolhido e o critério.
- Você explicou **por que não começar pelo HTTP**.
- Você explicou **por que a data ambígua é o caso perfeito**.
- **Duas implementações rodando** e a discordância demonstrada.
- `caderno/PD-001.md` criado com a **pergunta** e o **critério de falsificação**.
- ⚠ **Nenhum serviço de terceiro.** Comparação entre processos locais.

---

## Avaliação

1. **Por que duas implementações da mesma spec discordam?**
2. **Cite as cinco causas.** Qual é a mais perigosa?
3. **Por que a implementação que "aceita mais" é a perigosa?**
4. **O que a RFC 7230 §3.5 pede** que a torna origem do problema?
5. **Qual a diferença entre `must` e `should`** na spec?
6. **Cite as três possibilidades** diante de uma discordância.
7. **Por que a discordância proíbe que as duas estejam certas?**
8. **Cite cinco contextos** e o que cada divergência habilita.
9. **O que é framing?** Por que é o caso central?
10. **Por que a discordância é o bug**, e não o erro de uma?
11. **O que o `HTTP Garden` mediu?** Cite os números.
12. **O que o `WAFFLED` mediu?**
13. **Por que "39 exploráveis"** é o mais informativo?
14. **Por que o `HTTP Garden` compara N** em vez de fuzzer um?
15. **Qual é a diferença de método** que faz o rendimento?
16. **Cite cinco formatos** bons para treino.
17. **Por que não começar pelo HTTP?**
18. **Por que a data ambígua é o caso perfeito?**
19. **O que "até onde vai o campo?"** tem a ver com framing?
20. **O que o laboratório garante** sobre terceiros?

---

**Próximo:** [Módulo 2 — Spec, implementação, e o espaço em aberto](modulo-02.md)
