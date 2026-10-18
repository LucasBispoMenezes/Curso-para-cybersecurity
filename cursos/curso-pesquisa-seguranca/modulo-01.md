# Módulo 1 — O Que Separa Operador de Pesquisador

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** um curso deste material concluído

---

## Objetivos

1. Distinguir **operar** de **pesquisar**, e reconhecer a postura de cada um.
2. Entender por que **a pergunta** é o instrumento, e não a ferramenta.
3. Reconhecer as **três posturas** que bloqueiam a pesquisa.
4. Montar o **caderno** — o entregável que percorre o curso.
5. Aplicar as **sete perguntas** a um caso concreto.

---

## ⚠ Antes de começar

⚠ **A distinção não é hierárquica.** **Operador não é "pesquisador inferior"** — é **outra função**.
Um pentester excelente **executa um roteiro melhor que ninguém**, e isso é **uma habilidade real**.

⚠ **O que muda é o insumo:**

| | Operador | Pesquisador |
|---|---|---|
| **Insumo** | Um **escopo** | Uma **pergunta** |
| **Critério de sucesso** | Cobriu o escopo | **Respondeu a pergunta** |
| **Quando termina** | Acabou o prazo | **Quando a hipótese morreu ou se confirmou** |
| **O que produz** | Relatório de conformidade | **Conhecimento, que sobrevive** |
| **Falha** | Não cobriu | **Hipótese falsificada (que é resultado)** |

⚠ **A linha do "falha" é a mais importante.** **Para o operador, não achar é falha.** **Para o
pesquisador, uma hipótese falsificada é RESULTADO** — porque **elimina uma possibilidade, e a
próxima tentativa é informada.**

⚠ **E é aí que a maioria trava:** **você não foi treinado para valorizar a hipótese falsificada.**
**Foi treinado para "achar".** **Mudar isso é o primeiro passo do curso.**

---

## 1.1 O que se acumula

⚠ **A diferença prática entre os dois é o que sobra depois.**

```
OPERADOR                                   PESQUISADOR
┌──────────────────────────────────┐      ┌──────────────────────────────────┐
│ 20 alvos testados                │      │ 20 alvos testados                │
│ 3 achados                        │      │ 3 achados                        │
│ ⚠ e a técnica fica               │      │ + POR QUE os outros 17 não       │
│                                  │      │   tinham: um PADRÃO               │
│                                  │      │ + o que o padrão deixa prever     │
│                                  │      │ + as perguntas que sobraram       │
└──────────────────────────────────┘      └──────────────────────────────────┘
```

⚠ **A diferença não é o resultado — é o que o resultado deixou.** **O operador tem 3 achados. O
pesquisador tem 3 achados E uma teoria sobre onde mais procurar.**

⚠ **E é isso que o `1dFuzz` e o `EnBinDiff` fazem, em escala:** eles não acham **um** bug — eles
**sistematizam a busca**, e o resultado é **20 1-days** em vez de um. **A diferença é método, não
talento.**

⚠ **E é o que o `HTTP Garden` mostrou:** fuzzing diferencial de fluxo HTTP achou **mais de 100 bugs
de parsing** — 68 corrigidos, **39 exploráveis**. **Não é "achou um bug": é "achou uma CLASSE".**

```bash
mkdir -p ~/pesquisa-lab/{alvos,papers,cve,caderno} && cd ~/pesquisa-lab

echo "═══ 1. o que se acumula ═══"
echo
cat > caderno/00-metodo.md <<'EOF'
# O que se acumula

## O que sobra depois de N alvos
| Alvo | Achado? | Por que (não) | O que isso sugere |
|---|---|---|---|
| | | | |

## A pergunta que o operador não faz
"achei ou não achei"

## A pergunta que o pesquisador faz
"por que ESTE tinha, e os outros 17 não? — o que isso me diz sobre onde procurar?"

## A diferença em uma frase
⚠ o operador tem achados. o pesquisador tem achados E uma teoria.
EOF

cat caderno/00-metodo.md

echo
echo "═══ 2. as três posturas que bloqueiam ═══"
echo
cat <<'EXPL'
  ┌────────────────────────────────────────────────────────────────┐
  │ POSTURA 1: "VOU TESTAR COISAS"                                  │
  ├────────────────────────────────────────────────────────────────┤
  │ · sem pergunta → sem critério de parada                        │
  │ · testa o que a ferramenta oferece                             │
  │ · ⚠ resultado: cobertura alta, insight zero                     │
  │ ✓ correção: formular a pergunta ANTES de abrir o terminal       │
  └────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────┐
  │ POSTURA 2: "PRECISO ACHAR UM BUG"                               │
  ├────────────────────────────────────────────────────────────────┤
  │ · o achado vira o objetivo → você força o que não existe        │
  │ · ⚠ resultado: relatório inflado, falso positivo                 │
  │ ✓ correção: o objetivo é RESPONDER, e "não tem" é resposta      │
  └────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────┐
  │ POSTURA 3: "A FERRAMENTA NÃO ACHOU, ENTÃO NÃO TEM"              │
  ├────────────────────────────────────────────────────────────────┤
  │ · confunde ausência de achado da ferramenta com ausência de bug │
  │ · ⚠ resultado: você replica o que todo mundo já sabe             │
  │ ✓ correção: a ferramenta cobre o CONHECIDO — o diferencial       │
  │            está onde ela não olha                               │
  └────────────────────────────────────────────────────────────────┘

  ⚠ a postura 3 é a mais perigosa, porque PARECE rigorosa.
     "rodei tudo e não achou" soa como método — e é o oposto.
EXPL
```

⚠ **A postura 3 é a que conecta com o curso de Enumeração.** **"A ferramenta não achou" não é
evidência de ausência** — é evidência de que **a ferramenta não cobre aquilo**. **É o mesmo raciocínio
do Enumeração Esotérica:** a ferramenta padrão **opera sobre a entrada que você deu**.

⚠ **E é a razão de o curso insistir em leitura.** **Você lê patch, CVE e paper porque a ferramenta
não lê por você** — e é ali que está o que ela não cobre.

**Produza `00-metodo.md`:**

| Postura | Sintoma | Correção |
|---|---|---|
| "vou testar coisas" | | |
| "preciso achar um bug" | | |
| "a ferramenta não achou" | | |

**Responda:**

1. **Qual a diferença** entre operador e pesquisador em uma frase?
2. **Por que a hipótese falsificada é resultado** e não falha?
3. **Qual postura é a mais perigosa?** Por quê?
4. **O que se acumula** que o operador não tem?

---

## 1.2 A pergunta como instrumento

⚠ **A pergunta de pesquisa tem três propriedades. Sem as três, ela não serve.**

| Propriedade | O que significa | Exemplo ruim | Exemplo bom |
|---|---|---|---|
| **Específica** | Delimita o escopo | "esta biblioteca é segura?" | "o parser de `Content-Length` valida o limite?" |
| **Falsificável** | Existe observação que a derruba | "tem bug aqui?" | "se eu passar N>máx, ele recusa?" |
| **Informada** | Vem de algo que você leu | "vou olhar tudo" | "o patch anterior sugere que a validação é frágil" |

⚠ **A linha "informada" é a que separa pesquisa de chute.** **Você não formula a pergunta do nada**
— **ela vem do que você leu:** um patch, um CVE, um paper, um comentário no código.

⚠ **E a linha "falsificável" é a que separa pesquisa de opinião.** **"Esta biblioteca é segura"** não
é falsificável de forma prática. **"Se eu passar N>máx, ele recusa"** é — **você passa N e vê.**

⚠ **A tabela dos tipos de pergunta, e o que cada uma produz:**

| Tipo | Exemplo | Produz |
|---|---|---|
| **Validação** | "a entrada é validada em todos os limites?" | Bug de tamanho |
| **Invariante** | "o objeto pode ficar inconsistente?" | Bug de estado |
| **Confiança** | "quem confia neste campo, e ele é confiável?" | Bug de fronteira |
| **Consistência** | "os dois lados interpretam igual?" | ⚠ **Parser differential** |
| **Cobertura** | "o tratamento cobre todos os casos?" | Bug de omissão |

⚠ **A linha da consistência é a mais produtiva hoje.** **"Os dois lados interpretam igual?"** é a
pergunta que o **`HTTP Garden`** fez em escala — e achou **100 bugs**. **É a pergunta dos cursos 3, 6
e 7 desta grade.**

⚠ **E ela é a mesma pergunta da "enumeração esotérica":** **"por que isso leva àquilo?"** — a pergunta
que **ninguém faz porque a ferramenta não faz.**

**Produza `01-perguntas.md`:**

| Tipo | Exemplo de pergunta | O que produz |
|---|---|---|
| Validação | | |
| Invariante | | |
| Consistência | | |
| Cobertura | | |

**Responda:**

1. **Quais as três propriedades** de uma pergunta de pesquisa?
2. **Por que "tem bug aqui?" é pergunta ruim?**
3. **Qual tipo é o mais produtivo hoje?** Por quê?
4. **De onde vem** uma pergunta informada?

---

## 1.3 As sete perguntas

⚠ **O instrumento que percorre o curso inteiro.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. QUAL É O INVARIANTE?                                              │
│    o que DEVE valer aqui, e o código garante?                        │
├──────────────────────────────────────────────────────────────────────┤
│ 2. QUEM CONFIA NESSE INVARIANTE?                                     │
│    quem quebra se ele falhar? (é o impacto)                          │
├──────────────────────────────────────────────────────────────────────┤
│ 3. QUE SUPOSIÇÃO O CÓDIGO FAZ?                                       │
│    ⚠ é onde o bug mora — toda suposição é um ponto de falha          │
├──────────────────────────────────────────────────────────────────────┤
│ 4. O QUE O PATCH MUDOU — E POR QUE ISSO CORRIGE?                     │
│    não "o que mudou", mas POR QUE aquilo resolve                     │
├──────────────────────────────────────────────────────────────────────┤
│ 5. EXISTE IRMÃO DESSE PADRÃO?                                        │
│    ⚠ A PERGUNTA DO ACHADO ORIGINAL                                    │
├──────────────────────────────────────────────────────────────────────┤
│ 6. COMO EU FALSIFICO ISTO?                                           │
│    existe observação que derruba? se não, reformule                  │
├──────────────────────────────────────────────────────────────────────┤
│ 7. O QUE ISSO DESTRAVA?                                              │
│    a pergunta seguinte — e é o que acumula                           │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A pergunta 3 é a mais subestimada.** **Bug não é "código errado" — é "suposição que não vale".**
O código **assume** que `len <= máx`, que o ponteiro não é nulo, que o dado veio de onde diz. **Cada
suposição é um ponto de falha** — e **enumerar as suposições é enumerar os bugs possíveis.**

⚠ **A pergunta 5 é a ponte para o achado original.** **Você acha o padrão uma vez** (num CVE, num
patch) **e procura o mesmo padrão em outros lugares** — **onde ninguém procurou.** **É o módulo 7, e
é o que o `1dFuzz` automatiza parcialmente.**

⚠ **E a pergunta 7 é a que faz acumular.** **"O que isso destrava"** é a mesma estrutura da
**enumeração esotérica**: **cada resposta gera a próxima pergunta.** **Sem ela, cada achado é
isolado.**

```bash
cd ~/pesquisa-lab

echo "═══ 3. as sete perguntas, aplicadas ═══"
echo
cat > caderno/01-sete-perguntas.md <<'EOF'
# As sete perguntas — aplicadas a um caso

## O caso
⚠ escolha um trecho de código público que você leu esta semana.
   Qualquer coisa: um parser, um validador, um handler.

| Item | Valor |
|---|---|
| Projeto | |
| Arquivo / função | |
| O que ele faz | |

## As sete
| # | Pergunta | Resposta |
|---|---|---|
| 1 | Qual é o invariante? | |
| 2 | Quem confia nele? | |
| 3 | Que suposição o código faz? | |
| 4 | (se houver patch) por que isso corrige? | |
| 5 | Existe irmão desse padrão? | |
| 6 | Como eu falsifico isto? | |
| 7 | O que isso destrava? | |
EOF

cat caderno/01-sete-perguntas.md

echo
echo "═══ 4. um exemplo aplicado (para calibrar) ═══"
echo
cat <<'EXPL'
  ── o caso: um leitor de arquivo que confia no campo de tamanho do cabeçalho ──

  PERGUNTA 1 — invariante
     "o campo `tamanho` no cabeçalho descreve o corpo que segue"
     ⚠ o código GARANTE isso? Não — ele apenas usa o valor.

  PERGUNTA 2 — quem confia
     a função `ler_corpo()` aloca `tamanho` e copia `tamanho` bytes.
     ⚠ se o campo mentir, ela aloca errado e copia errado.
     impacto: leitura/escrita fora do buffer.

  PERGUNTA 3 — suposição
     ⚠ o código ASSUME que `tamanho <= bytes_restantes_no_arquivo`.
     e assume que `tamanho` não estoura `int` na multiplicação.
     ✓ duas suposições, dois vetores.

  PERGUNTA 4 — o patch (se houver)
     o patch adicionou:
        if (tamanho > restante) return ERRO;
        if (tamanho > TAM_MAX) return ERRO;
     ⚠ POR QUE corrige: elimina as DUAS suposições de uma vez.
     ✓ e a ordem importa: a faixa ANTES do cálculo (curso de C, módulo 9).

  PERGUNTA 5 — irmão do padrão
     "campo de tamanho usado sem validar contra o restante"
     ⚠ procure em OUTROS parsers do mesmo projeto:
        · outros formatos com campo de tamanho
        · outros pontos que leem do mesmo arquivo
        · e em OUTRO projeto, no mesmo ecossistema
     ✓ é aqui que nasce o achado original.

  PERGUNTA 6 — falsificação
     "se eu declarar tamanho > restante, o código recusa"
     ✓ observável: gero o arquivo, vejo a resposta.
     ⚠ se ele NÃO recusa, a hipótese morreu — e isso é resultado.

  PERGUNTA 7 — o que destrava
     · existem outros campos com a mesma suposição?
     · o validador roda ANTES ou DEPOIS do uso?
     · quem MAIS consome esse formato? (outro parser = outra chance)

  ⚠ note: eu não usei nenhuma ferramenta.
     usei LEITURA — e a pergunta certa.
EXPL
```

⚠ **O exemplo é o modelo.** **Nenhuma ferramenta foi usada** — **só leitura e as sete perguntas.** E
**a pergunta 5 é a que produziria o achado original:** **o mesmo padrão em outro parser** do mesmo
projeto, **onde ninguém corrigiu.**

⚠ **E note a pergunta 4:** **"por que isso corrige"** — e a resposta conecta com o **curso de C,
módulo 9**: a faixa **antes** do cálculo. **Ler patch exige ler o código em volta, e saber por que a
correção funciona.**

**Produza `02-caso.md`:**

| # | Pergunta | Sua resposta |
|---|---|---|
| 1 | Invariante | |
| 2 | Quem confia | |
| 3 | Suposição | |
| 4 | Por que o patch corrige | |
| 5 | Irmão do padrão | |
| 6 | Falsificação | |
| 7 | O que destrava | |

**Responda:**

1. **Qual pergunta produziu** o insight mais útil?
2. **Quantas suposições** você achou (pergunta 3)?
3. **A pergunta 5 deu resultado?** Qual candidato?
4. **Nenhuma ferramenta foi usada?** Confirme.

---

## 1.4 O caderno

⚠ **O entregável que percorre o curso. E ele é mais importante que os labs.**

| Seção | O que guarda | Por quê |
|---|---|---|
| **Perfil do alvo** | o que é, superfície, maturidade | Contexto |
| **Pergunta** | a pergunta, e de onde veio | Rastreabilidade |
| **Hipótese** | falsificável, com critério | Método |
| **Teste** | o que você fez, e com o quê | Reprodutibilidade |
| **Evidência** | comando e saída literal | ⚠ **Prova** |
| **Conclusão** | confirmou, falsificou, ou inconclusivo | Resultado |
| **Sobras** | perguntas que o passo abriu | ⚠ **O que acumula** |

⚠ **A seção "sobras" é a que ninguém faz, e é a mais valiosa.** **É onde você registra "isso abriu
aquilo"** — e é **o que faz o próximo passo ser informado pelo anterior**, em vez de começar do zero.

⚠ **E a seção "conclusão" tem três valores, não dois:**

| Valor | Significa | É resultado? |
|---|---|---|
| **Confirmou** | a hipótese valeu | ✓ Sim |
| **Falsificou** | a hipótese caiu | ⚠ **Sim** — eliminou uma possibilidade |
| **Inconclusivo** | o teste não decidiu | ✓ Sim — **e diz que o teste foi mal desenhado** |

⚠ **O terceiro valor é o que a maioria evita — e ele é o mais informativo.** **"Não consegui decidir"
significa que o seu TESTE falhou, não que o alvo é seguro.** **Registrar isso é o que evita repetir o
método ruim.**

```bash
cd ~/pesquisa-lab

echo "═══ 5. o template do caderno ═══"
echo
cat > caderno/TEMPLATE.md <<'EOF'
# [ID] — [título curto da investigação]

**Data:** ____
**Alvo:** ____
**Estado:** aberta | confirmada | falsificada | inconclusiva

## 1. A pergunta
[a pergunta, específica e falsificável]

## 2. De onde ela veio
[que leitura gerou esta pergunta: qual patch, CVE, paper, ou trecho de código]

## 3. O invariante
[o que DEVE valer]

## 4. A hipótese
[afirmação testável]

## 5. Critério de falsificação
[⚠ o que eu vou observar que derruba a hipótese]

## 6. O teste
| Item | Valor |
|---|---|
| Como | |
| Ferramenta/leitura | |
| Entrada | |

## 7. Evidência
```
[comando ou trecho de código]

[saída literal]
```

## 8. Conclusão
[confirmou / falsificou / inconclusivo — e por quê]

## 9. O que isso destrava
[⚠ a pergunta seguinte]

## 10. Referências
[links do que sustentou a pergunta]
EOF

cat caderno/TEMPLATE.md

echo
echo "═══ 6. os três valores de conclusão ═══"
echo
cat <<'EXPL'
  ┌────────────────┬──────────────────────────────┬─────────────────────┐
  │ CONCLUSÃO      │ SIGNIFICA                     │ O QUE FAZER          │
  ├────────────────┼──────────────────────────────┼─────────────────────┤
  │ CONFIRMOU      │ a hipótese valeu             │ → escrever o achado  │
  │ FALSIFICOU     │ a hipótese caiu              │ → ⚠ é RESULTADO       │
  │                │                              │   registrar e seguir │
  │ INCONCLUSIVO   │ o TESTE não decidiu          │ → ⚠ o TESTE falhou    │
  │                │                              │   reformular o teste │
  └────────────────┴──────────────────────────────┴─────────────────────┘

  ⚠ o valor "inconclusivo" é o mais informativo — e o mais evitado.
     "não consegui decidir" NÃO significa "o alvo é seguro".
     significa "meu método foi mal desenhado" — e isso vale registrar.
EXPL
```

⚠ **O template é o instrumento do curso.** **Toda investigação entra com as dez seções** — e a
**seção 5 (critério de falsificação)** é **obrigatória**: sem ela, **não é hipótese**, é expectativa.

**Produza `03-caderno.md`:**

| Seção | O que você preencheu | Está reprodutível? |
|---|---|---|
| Pergunta | | |
| De onde veio | | |
| Invariante | | |
| Hipótese | | |
| Critério | | |
| Evidência | | |
| Sobras | | |

**Responda:**

1. **Qual seção é obrigatória** e por quê?
2. **O que "inconclusivo" significa** que é diferente de "falsificou"?
3. **Qual seção ninguém faz?** E por que é a mais valiosa?
4. **O caderno é reprodutível?** Teste: releia como estranho.

---

## 1.5 LAB — O caderno inicial

**Duração:** 60 min

### Passo 1 — Monte a estrutura (15 min)

```bash
cd ~/pesquisa-lab

cat > monta-lab.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "═══ MONTANDO O LABORATÓRIO DE PESQUISA ═══"
echo

for d in alvos papers cve caderno; do
    mkdir -p "$d"
    printf '  ✓ %s/\n' "$d"
done
echo

# README de cada pasta
cat > alvos/README.md <<'EOF'
# Alvos de estudo

⚠ Aqui vão CÓPIAS de código público que você ESTUDA.
   Clonar repositório público para LER é legítimo.

⚠ O que NÃO vai aqui:
   · código de cliente sem permissão
   · credencial
   · dado de terceiro

## Convenção de nome
   <projeto>-<versao>-<motivo>
   ex.: libyaml-0.2.5-estudo-parser
EOF

cat > papers/README.md <<'EOF'
# Papers

## Convenção
   <ano>-<conferencia>-<titulo-curto>
   ex.: 2024-arxiv-http-garden

## Ficha obrigatória (por paper)
| Campo | Valor |
|---|---|
| Método | |
| Resultado | |
| Limitação declarada | |
| Replicável? | |
EOF

cat > cve/README.md <<'EOF'
# Trilhas de CVE

## Convenção
   CVE-<ano>-<id>-<componente>

## O que registrar por CVE
| Campo | Valor |
|---|---|
| Componente | |
| Classe (curso de C) | |
| Patch disponível? | |
| PoC público? | |
| Invariante violado | |
| Irmão encontrado? | |
EOF

cat > caderno/README.md <<'EOF'
# Caderno de pesquisa — o entregável do curso

## Estrutura
- 00-metodo.md
- 01-sete-perguntas.md
- 02-caso.md
- TEMPLATE.md
- <ID>-<titulo>.md  ← uma ficha por investigação

## Regra
⚠ TODA investigação tem critério de falsificação.
   Sem ele, não é hipótese — é expectativa.
EOF

echo "  ✓ READMEs criados"
echo
echo "═══ A ESTRUTURA ═══"
find . -type f | sort | sed 's/^/  /'
SCRIPT

chmod +x monta-lab.sh
./monta-lab.sh
```

Produza `estrutura.md`:

| Pasta | O que guarda | O que **não** guarda |
|---|---|---|
| `alvos/` | | |
| `papers/` | | |
| `cve/` | | |
| `caderno/` | | |

**Responda:**

1. **Por que a estrutura tem quatro pastas?**
2. **O que não vai em `alvos/`?**
3. **O que `cve/` registra** que o NVD não registra?
4. **Por que `caderno/` é o entregável?**

### Passo 2 — Aplique as sete perguntas (30 min)

⚠ **Escolha um caso real. Qualquer trecho de código público que você já leu.**

```bash
cd ~/pesquisa-lab

echo "═══ as sete perguntas, sobre um caso seu ═══"
echo
cat <<'EXPL'
  ⚠ ESCOLHA — uma destas:

  A) um parser que você já usou (JSON, YAML, imagem, formato binário)
  B) uma função de validação que você já leu
  C) um handler de requisição que você conhece
  D) o trecho de um patch recente que você viu

  ⚠ e aplique as sete perguntas a ele.
     NÃO use ferramenta. SÓ leitura.
EXPL

cat > caderno/02-caso.md <<'EOF'
# O caso — sete perguntas aplicadas

## Escolha
| Item | Valor |
|---|---|
| Projeto | |
| Fonte (URL) | |
| Arquivo / função | |
| O que faz | |
| Por que escolhi | |

## As sete perguntas
| # | Pergunta | Resposta |
|---|---|---|
| 1 | Qual é o invariante? | |
| 2 | Quem confia nele? | |
| 3 | Que suposição o código faz? | |
| 4 | (se houver patch) por que corrige? | |
| 5 | Existe irmão desse padrão? | |
| 6 | Como eu falsifico isto? | |
| 7 | O que isso destrava? | |

## Suposições encontradas (pergunta 3)
| # | Suposição | Se falhar, o que acontece | Como testar |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## Candidatos a irmão (pergunta 5)
| # | Onde | Por que parece o mesmo padrão | O que confirmaria |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
EOF

cat caderno/02-caso.md
```

Produza `sete-perguntas.md`:

| # | Pergunta | Sua resposta |
|---|---|---|
| 1 | Invariante | |
| 2 | Quem confia | |
| 3 | Suposição | |
| 4 | Por que corrige | |
| 5 | Irmão | |
| 6 | Falsificação | |
| 7 | O que destrava | |

**Responda:**

1. **Quantas suposições** você achou?
2. **Qual suposição é a mais provável** de falhar?
3. **Você achou candidato a irmão?** Qual?
4. **Nenhuma ferramenta foi usada?** Confirme.
5. **Qual pergunta foi a mais difícil** de responder?

### Passo 3 — A primeira ficha (15 min)

⚠ **Agora, transforme o caso numa ficha de investigação.**

```bash
cd ~/pesquisa-lab

cat > caderno/INV-001.md <<'EOF'
# INV-001 — [título do seu caso]

**Data:** ____
**Alvo:** ____
**Estado:** aberta

## 1. A pergunta
[escreva a pergunta específica e falsificável — não "vou ver se tem bug"]

## 2. De onde ela veio
[o que você leu que gerou esta pergunta]

## 3. O invariante
[o que DEVE valer]

## 4. A hipótese
[afirmação testável]

## 5. Critério de falsificação
[⚠ O QUE VOCÊ VAI OBSERVAR QUE DERRUBA A HIPÓTESE]

## 6. O teste
[como você vai testar — leitura? código próprio? alvo seu?]

## 7. Evidência
(ainda não — você preenche ao testar)

## 8. Conclusão
(ainda não)

## 9. O que isso destrava
[as perguntas que já apareceram]

## 10. Referências
[a fonte do caso]
EOF

echo "═══ a ficha criada ═══"
cat caderno/INV-001.md
echo
echo "  ⚠ a seção 5 é a mais importante — e a que a maioria pula."
echo "     sem critério de falsificação, não é hipótese."
```

**Produza `inv-001.md`:**

| Campo | Valor |
|---|---|
| Pergunta | |
| Invariante | |
| Hipótese | |
| **Critério de falsificação** | |

**Responda:**

1. **A pergunta é específica?** Reformule se não.
2. **A hipótese é falsificável?** Qual observação a derruba?
3. **O critério está escrito?** (Sem ele, não conta.)
4. **O que já apareceu** na seção 9?

### Critérios de aceitação

- `00-metodo.md` com as **três** posturas, e a explicação de por que a falsificada é resultado.
- Você explicou **o que se acumula** que o operador não tem.
- `01-perguntas.md` com os **quatro** tipos de pergunta.
- Você formulou uma pergunta **específica, falsificável e informada**.
- `02-caso.md` com as **sete** perguntas respondidas.
- Você identificou **pelo menos duas suposições** no código.
- Você identificou **pelo menos um candidato a irmão**.
- **Nenhuma ferramenta foi usada** — você fez por leitura.
- O laboratório montado com as **quatro** pastas e os READMEs.
- `sete-perguntas.md` com as sete respostas.
- Você identificou **qual pergunta foi a mais difícil**.
- `INV-001.md` com o **critério de falsificação** escrito.
- Você explicou **por que "inconclusivo" é diferente de "falsificou"**.

---

## Avaliação

1. **Diferencie operador de pesquisador** em função, insumo e resultado.
2. **Por que a hipótese falsificada é resultado** e não falha?
3. **O que se acumula** que o operador não tem?
4. **Cite as três posturas** que bloqueiam a pesquisa.
5. **Por que a postura 3 é a mais perigosa?**
6. **Quais as três propriedades** de uma pergunta de pesquisa?
7. **Por que "esta biblioteca é segura"** é pergunta ruim?
8. **De onde vem** uma pergunta informada?
9. **Cite os cinco tipos de pergunta** e o que cada um produz.
10. **Qual tipo é o mais produtivo hoje?** Por quê?
11. **Cite as sete perguntas** do pesquisador.
12. **Qual é a mais subestimada?** Por quê?
13. **Por que "bug é suposição que não vale"?**
14. **Qual pergunta produz o achado original?**
15. **Por que "o que isso destrava"** faz acumular?
16. **Cite as dez seções** do caderno.
17. **Qual seção é obrigatória?** Por quê?
18. **Diferencie confirmou, falsificou e inconclusivo.**
19. **Por que "inconclusivo" aponta para o teste** e não para o alvo?
20. **Relacione este módulo com o curso de Enumeração Esotérica.**

---

**Próximo:** [Módulo 2 — Escolher o alvo](modulo-02.md)
