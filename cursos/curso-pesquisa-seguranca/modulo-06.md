# Módulo 6 — Hipótese Falsificável

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Distinguir **expectativa**, **pergunta** e **hipótese falsificável**.
2. Escrever o **critério de falsificação** — o que derruba a hipótese.
3. Reconhecer as **cinco hipóteses ruins**, e como reformular cada uma.
4. Transformar um padrão (módulos 3–5) em **hipótese testável**.
5. Testar **sem sair do escopo autorizado** — a regra de ouro do módulo.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Uma hipótese sem critério de falsificação não é hipótese — é expectativa.** E expectativa não se
> testa: **ela se confirma por teimosia.**

⚠ **E é a diferença mais prática do curso inteiro:**

| | Expectativa | Hipótese |
|---|---|---|
| **Forma** | "deve ter bug aqui" | "se X, então Y" |
| **Derrubável?** | ⚠ Não | ✓ Sim, por observação |
| **Quando falha** | Você insiste | **Você registra e segue** |
| **O que produz** | Frustração | ⚠ **Conhecimento** |

⚠ **A tese:** **o valor da hipótese está no que ela EXCLUI.** **Uma hipótese que nunca pode ser
derrubada é inútil** — porque **mesmo se confirmada, você não aprendeu nada que pudesse ser
diferente.**

⚠ **E o `1dFuzz` é o exemplo de método com critério:** ele **localiza a posição do patch** e **guia
o fuzzer até lá** — e o **critério de sucesso é objetivo:** **chegou ao PoC, ou não chegou.** **Sem
ambiguidade.**

---

## 6.1 A forma da hipótese

⚠ **A estrutura, em quatro campos. Sem os quatro, não é hipótese.**

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. O INVARIANTE                                                   │
│    "o campo `len` deve ser <= sizeof(buf) neste ponto"             │
├──────────────────────────────────────────────────────────────────┤
│ 2. A AFIRMAÇÃO                                                    │
│    "o código NÃO garante esse invariante"                          │
├──────────────────────────────────────────────────────────────────┤
│ 3. A OBSERVAÇÃO                                                   │
│    "se eu passar len > sizeof(buf), ele copia além"                │
├──────────────────────────────────────────────────────────────────┤
│ 4. ⚠ CRITÉRIO DE FALSIFICAÇÃO                                      │
│    "a hipótese morre se, com len > sizeof(buf), ele recusar        │
│     antes de copiar"                                               │
└──────────────────────────────────────────────────────────────────┘
```

⚠ **O campo 4 é o que faz a diferença.** **Note que ele é uma AFIRMAÇÃO NEGATIVA** — **"morre se
ele recusar"**. **É isso que torna a hipótese testável:** **existe uma observação concreta que a
derruba.**

⚠ **E a razão de o campo 4 vir antes do teste:** **se você não sabe o que te derruba, você não sabe
o que está olhando.** **O critério define a observação**, e **a observação define o teste.**

⚠ **A tabela do que cada campo evita:**

| Campo | Evita |
|---|---|
| 1 — invariante | ⚠ Testar sem saber o que deveria valer |
| 2 — afirmação | ⚠ "Vou ver se tem bug" |
| 3 — observação | ⚠ Não saber o que olhar |
| **4 — critério** | ⚠⚠ **Confirmar por teimosia** |

⚠ **A linha 4 é a que a maioria pula.** **E é exatamente a que o `How to Read a Paper` exige de um
paper** — **um método sem critério de sucesso não é método.**

```bash
mkdir -p ~/pesquisa-lab/mod06 && cd ~/pesquisa-lab/mod06

echo "═══ 1. três exemplos, lado a lado ═══"
echo
python3 - <<'PY'
print("  ═══ EXPECTATIVA vs. PERGUNTA vs. HIPÓTESE ═══")
print()
casos = [
    ("EXPECTATIVA", "deve ter um bug de overflow no parser"),
    ("PERGUNTA",    "o parser valida o tamanho antes de copiar?"),
    ("HIPÓTESE",    "o parser NÃO valida `len` antes do memcpy, "
                    "porque a verificação existe só no caminho de erro"),
]
for tipo, texto in casos:
    print(f"  ── {tipo} ──")
    print(f"     {texto}")
    print()

print("═══ A HIPÓTESE, DESMEMBRADA ═══")
print()
print("  ┌────────────────────┬─────────────────────────────────────────────┐")
print("  │ INVARIANTE         │ `len <= sizeof(buf)` antes do memcpy        │")
print("  ├────────────────────┼─────────────────────────────────────────────┤")
print("  │ AFIRMAÇÃO          │ o código não garante isso nesse ponto       │")
print("  ├────────────────────┼─────────────────────────────────────────────┤")
print("  │ OBSERVAÇÃO         │ com len > sizeof(buf), ele copia além       │")
print("  ├────────────────────┼─────────────────────────────────────────────┤")
print("  │ FALSIFICAÇÃO       │ morre se ele recusar ANTES de copiar        │")
print("  └────────────────────┴─────────────────────────────────────────────┘")
print()
print("  ⚠ note a diferença entre a EXPECTATIVA e a HIPÓTESE:")
print("     · a expectativa diz que deve ter bug — e pronto")
print("     · a hipótese diz ONDE e POR QUÊ, e o que a derruba")
print()
print("  ✓ e é por isso que a hipótese é testável, e a expectativa não.")
PY

echo
echo "═══ 2. o critério de falsificação, na prática ═══"
echo
cat <<'EXPL'
  ── O CRITÉRIO É UMA AFIRMAÇÃO NEGATIVA ──
     "a hipótese MORRE se [observação]"

  ── exemplos ──
     HIPÓTESE: "o parser não valida `len` antes do memcpy"
     MORRE SE:  com len > sizeof(buf), ele recusa ANTES de copiar
     ✓ observável: passo o valor e vejo a resposta

     HIPÓTESE: "os dois parsers discordam sobre o fim da requisição"
     MORRE SE:  com a mesma requisição, os dois reportam o mesmo limite
     ✓ observável: mando a mesma entrada e comparo

     HIPÓTESE: "o sistema permite estado inconsistente via sequência X"
     MORRE SE:  ao executar X, o sistema recusa ou se mantém consistente
     ✓ observável: executo a sequência e leio o estado

  ── O SINAL DE HIPÓTESE RUIM ──
     ⚠ se você não consegue escrever "morre se", a hipótese precisa ser
        REFORMULADA — ela está vaga.

  ── e há o critério que NÃO SERVE ──
     · "morre se eu não achar nada"        ← ⚠ ausência não é observação
     · "morre se for difícil"              ← ⚠ dificuldade não é dado
     · "morre se eu desistir"              ← ⚠ não é sobre o sistema
EXPL
```

⚠ **A lista dos "critérios que não servem" é o instrumento de reformulação.** **"Morre se eu não
achar nada"** é o mais comum — e **não é critério**, porque **ausência de achado pode significar
que o teste foi ruim** (módulo 1, valor "inconclusivo").

⚠ **E é a diferença entre "falsificou" e "inconclusivo"** — que o módulo 1 introduziu. **Um critério
bom distingue os dois.**

**Produza `forma.md`:**

| Item | Sua hipótese |
|---|---|
| Invariante | |
| Afirmação | |
| Observação | |
| **Falsificação** | |

**Responda:**

1. **Diferencie expectativa, pergunta e hipótese.**
2. **Por que o critério é uma afirmação negativa?**
3. **Por que o critério vem antes do teste?**
4. **Cite três "critérios que não servem"** e por quê.

---

## 6.2 As cinco hipóteses ruins

⚠ **Os cinco padrões que parecem hipótese e não são. Reconhecer é metade do trabalho.**

| # | Ruim | Por que | Reformulação |
|---|---|---|---|
| 1 | **"Tem bug aqui"** | Sem invariante nem observação | Qual invariante, e o que o derruba? |
| 2 | **"Não é seguro"** | Não falsificável de forma prática | Qual operação, com qual entrada? |
| 3 | **"Se eu fuzzar, acho algo"** | ⚠ **É método, não hipótese** | O que o fuzzer procuraria, e o que o define? |
| 4 | **"A ferramenta não achou, então não tem"** | ⚠ Ausência não é observação | O que a ferramenta NÃO cobre? |
| 5 | **"Isto é claramente vulnerável"** | ⚠ É julgamento, não hipótese | Qual afirmação testável você está fazendo? |

⚠ **A linha 3 é a que mais aparece.** **"Vou fuzzar"** é **um método** — e **método sem alvo é
cobertura**, não pesquisa. **A `1dFuzz` faz fuzzing — mas com um ALVO definido pela posição do
patch**, e **um critério objetivo.** **É a diferença entre "vou fuzzar" e "o bug está na função X,
e vou dirigir o fuzzer até lá".**

⚠ **E a linha 4 é a mesma do módulo 1 (postura 3).** **"A ferramenta não achou"** confunde
**ausência de achado** com **ausência de bug**. **A ferramenta cobre o CONHECIDO** — **a hipótese
boa pergunta pelo que ela não cobre.**

⚠ **A tabela de reformulação, em exemplos:**

| Ruim | Reformulada |
|---|---|
| "O parser tem bug" | "O parser não valida `len` no caminho rápido, e valida no lento" |
| "A API não é segura" | "A API aceita `id` de outro usuário quando o token é válido" |
| "Vou fuzzar o protocolo" | "A gramática aceita entrada que o parser não trata, e o erro é distinguível" |
| "O WAF não achou, então passa" | "O WAF normaliza antes de inspecionar, e o servidor depois" |
| "Isto é vulnerável" | "Com o campo X em N, a validação é ignorada" |

⚠ **A linha 4 é a confusão de camada** (módulo 2, região 2) — **e é exatamente o padrão que o
`WAFFLED` explora**: **o WAF normaliza, o servidor interpreta diferente, e o dado passa.** **A
hipótese é testável:** **você manda a entrada e vê se o WAF bloqueia e o servidor aceita.**

```bash
cd ~/pesquisa-lab/mod06

echo "═══ 3. as cinco ruins, e a reformulação ═══"
echo
cat > cinco-ruins.md <<'EOF'
# As cinco hipóteses ruins

## Ruim 1 — "tem bug aqui"
| Campo | Valor |
|---|---|
| Por que é ruim | sem invariante nem observação |
| Reformular | |

## Ruim 2 — "não é seguro"
| Campo | Valor |
|---|---|
| Por que é ruim | não falsificável de forma prática |
| Reformular | |

## Ruim 3 — "se eu fuzzar, acho algo"
| Campo | Valor |
|---|---|
| Por que é ruim | ⚠ é MÉTODO, não hipótese |
| Reformular | |

## Ruim 4 — "a ferramenta não achou"
| Campo | Valor |
|---|---|
| Por que é ruim | ausência não é observação |
| Reformular | |

## Ruim 5 — "isto é claramente vulnerável"
| Campo | Valor |
|---|---|
| Por que é ruim | é julgamento, não hipótese |
| Reformular | |
EOF

cat cinco-ruins.md

echo
echo "═══ 4. da hipótese ao teste ═══"
echo
cat <<'EXPL'
  ┌───────────────────────────────────────────────────────────────────┐
  │ HIPÓTESE                                                          │
  │   "o parser não valida `len` no caminho rápido"                    │
  ├───────────────────────────────────────────────────────────────────┤
  │ QUE OBSERVAÇÃO A DERRUBA?                                          │
  │   "se com len > máx ele recusar antes de copiar"                   │
  ├───────────────────────────────────────────────────────────────────┤
  │ ⚠ ESSA OBSERVAÇÃO É OBTENÍVEL COMO?                                │
  │   · A) por LEITURA — ler o código e ver a validação               │
  │   · B) por CÓDIGO PRÓPRIO — reimplementar e testar                │
  │   · C) por TESTE NO MEU ALVO — se for meu/CTF/autorizado          │
  │   ⚠ D) contra sistema de terceiro → NÃO                              │
  ├───────────────────────────────────────────────────────────────────┤
  │ SE A OBSERVAÇÃO NÃO É OBTENÍVEL:                                   │
  │   ⚠ a hipótese fica ABERTA — e isso é legítimo (módulo 9)          │
  └───────────────────────────────────────────────────────────────────┘

  ⚠ A opção A (leitura) é sempre disponível — e é a base do curso.
     B (código próprio) verifica o mecanismo.
     C (teste no alvo autorizado) confirma no sistema real.
     D não existe. Nem "só um testinho".
EXPL
```

⚠ **A ordem das opções é deliberada.** **A leitura é sempre disponível** — e **é o que o curso
inteiro treina**. **O código próprio verifica o mecanismo** — e **é o que os labs do curso usam**.
**O teste no alvo autorizado confirma** — **e só se o alvo for seu, CTF, ou autorizado.**

⚠ **E a opção D é explícita:** **não existe "só um testinho"** — porque **a técnica não distingue
intenção, e a lei também não.**

**Produza `reformulacao.md`:**

| Ruim | Por que | Reformulada |
|---|---|---|
| | | |
| | | |

**Responda:**

1. **Qual das cinco você já cometeu?** Seja honesto.
2. **Por que "vou fuzzar" é método e não hipótese?**
3. **Como o `WAFFLED` formula** a hipótese de camada?
4. **Qual observação derruba** cada uma das suas reformulações?

---

## 6.3 Da leitura à hipótese

⚠ **A ponte com os módulos 3, 4 e 5. Cada um dá um insumo, e o insumo vira hipótese.**

| Fonte | O que dá | A hipótese que nasce |
|---|---|---|
| **Patch** (módulo 3) | O invariante violado | ⚠ "O irmão também não garante esse invariante" |
| **CVE** (módulo 4) | A classe, e o padrão | "O padrão existe em outro componente" |
| **Paper** (módulo 5) | O padrão numa população | "O padrão se aplica ao meu alvo" |
| Leitura livre | Uma suposição do código | "A suposição falha com entrada X" |

⚠ **A primeira linha é a mais produtiva.** **O patch te dá o invariante** — e **a hipótese é
"existe outro ponto que também deveria garantir isso, e não garante".** **É o irmão do módulo 3,
transformado em hipótese testável.**

⚠ **E a tabela do que a hipótese herda da fonte:**

| Fonte | A hipótese já vem... | O que falta definir |
|---|---|---|
| Patch | com o **invariante pronto** | ⚠ Onde mais procurar, e como observ |
| CVE | com a **classe pronta** | Onde, no meu alvo |
| Paper | com o **padrão pronto** | Se aplica, e como testar |
| Leitura livre | com a **suposição** | ⚠ O invariante — este você deduz |

⚠ **A última linha é a mais difícil.** **Na leitura livre, você tem a suposição do código**
("assume que `len <= máx`") — **mas precisa FORMULAR o invariante.** **É a diferença entre notar
algo e saber o que deveria valer.**

⚠ **E é o que o módulo 1 (pergunta 1) pede:** **"qual é o invariante?"** — **a pergunta que
organiza tudo.**

```bash
cd ~/pesquisa-lab/mod06

echo "═══ 5. do insumo à hipótese ═══"
echo
cat > insumo-hipotese.md <<'EOF'
# Do insumo à hipótese

## O insumo (de onde veio)
| Campo | Valor |
|---|---|
| Fonte | patch / CVE / paper / leitura livre |
| Referência | |
| O invariante (se veio do patch) | |
| A classe (se veio do CVE) | |
| O padrão (se veio do paper) | |

## O que eu herdo pronto
[o que a fonte já me deu — invariante? classe? padrão?]

## O que eu preciso definir
[⚠ o que falta — o onde, e o como observo]

## A hipótese
| Campo | Valor |
|---|---|
| Invariante | |
| Afirmação | |
| Observação | |
| **Falsificação** | |

## O teste, e o escopo
| Item | Valor |
|---|---|
| Como obtenho a observação? | leitura / código próprio / alvo autorizado |
| ⚠ Autorização | |
| O que eu NÃO vou fazer | |
EOF

cat insumo-hipotese.md

echo
echo "═══ 6. o teste, por tipo de observação ═══"
echo
cat <<'EXPL'
  ┌────────────────────┬──────────────────────────┬──────────────────────┐
  │ TIPO DE OBSERVAÇÃO │ COMO OBTER               │ QUANDO USAR          │
  ├────────────────────┼──────────────────────────┼──────────────────────┤
  │ LEITURA            │ ler o código, o patch,   │ ⚠ SEMPRE — base       │
  │                    │ o RFC, a especificação   │ do curso             │
  ├────────────────────┼──────────────────────────┼──────────────────────┤
  │ CÓDIGO PRÓPRIO     │ reimplementar o trecho,  │ verificar o MECANISMO│
  │                    │ montar caso de teste     │ em laboratório       │
  ├────────────────────┼──────────────────────────┼──────────────────────┤
  │ ALVO AUTORIZADO    │ alvo próprio, CTF, ou    │ confirmar no sistema │
  │                    │ contrato com escopo      │ real                 │
  ├────────────────────┼──────────────────────────┼──────────────────────┤
  │ ⚠ TERCEIRO          │ —                        │ ⚠ NÃO EXISTE          │
  └────────────────────┴──────────────────────────┴──────────────────────┘

  ⚠ a linha 3 exige DOCUMENTO. "é público, então pode" não é autorização.
  ⚠ e o escopo do CTF é o escopo do CTF: nem um host a mais.
EXPL
```

⚠ **A tabela dos tipos de observação é o instrumento de escopo.** **Ela responde "como eu
verifico"** — e **a resposta nunca é "testando no sistema de alguém".**

⚠ **E a linha do alvo autorizado tem a nota que importa:** **exige documento.** **"É público, então
pode"** é a racionalização mais comum — **e não é autorização.** **O escopo do programa é o
escopo** — **e um host a mais é fora dele.**

**Produza `insumo.md`:**

| Fonte | O que herdo | O que falta definir |
|---|---|---|
| Patch | | |
| CVE | | |
| Paper | | |
| Leitura livre | | |

**Responda:**

1. **Qual fonte dá o invariante pronto?**
2. **Qual é a mais difícil?** Por quê?
3. **Cite os três tipos de observação** e quando usar cada.
4. **O que a linha do terceiro diz?** Por quê?

---

## 6.4 LAB — Da leitura à hipótese testável

**Duração:** 120 min

### Passo 1 — Escolha o insumo (25 min)

⚠ **Use o que você já tem dos módulos 3, 4 e 5.**

```bash
cd ~/pesquisa-lab/mod06

echo "═══ O INSUMO PARA A HIPÓTESE ═══"
echo
cat <<'EXPL'
  ⚠ USE O QUE VOCÊ JÁ PRODUZIU:

  ── do módulo 3 (patch) ──
     arquivo: caderno/03-patch.md
     você já tem: O INVARIANTE violado, e o PADRÃO abstraído
     ⚠ a hipótese natural: "o irmão também não garante isso"

  ── do módulo 4 (CVE) ──
     arquivo: caderno/04-tres-cve.md
     você já tem: a CLASSE, e o padrão
     ⚠ a hipótese natural: "o mesmo padrão existe em outro componente"

  ── do módulo 5 (paper) ──
     arquivo: caderno/05-aplicacao.md
     você já tem: o PADRÃO provado numa população
     ⚠ a hipótese natural: "o padrão aplica ao meu alvo"

  ── ou da leitura livre ──
     você tem: uma SUPOSIÇÃO do código
     ⚠ a hipótese natural: "a suposição falha com entrada X"
     ⚠ e você precisa FORMULAR o invariante

  ⚠ ESCOLHA UM. e escreva a hipótese completa.
EXPL

cat > caderno/06-hipotese.md <<'EOF'
# INV-006 — hipótese falsificável

**Data:** ____

## 1. O insumo
| Campo | Valor |
|---|---|
| Fonte (módulo 3 / 4 / 5 / leitura) | |
| Referência | |
| O que eu herdo pronto | |

## 2. A hipótese
| Campo | Valor |
|---|---|
| **Invariante** | |
| **Afirmação** | |
| **Observação** | |
| **⚠ Critério de falsificação** | |

## 3. O teste
| Item | Valor |
|---|---|
| Tipo de observação | leitura / código próprio / alvo autorizado |
| Como | |
| ⚠ Autorização | |
| O que eu NÃO vou fazer | |

## 4. O resultado (preencher depois)
| Valor | Descrição |
|---|---|
| confirmou / falsificou / inconclusivo | |
| Evidência | |
| ⚠ Se inconclusivo: por que o TESTE falhou | |

## 5. O que isso destrava
[a próxima pergunta]
EOF

cat caderno/06-hipotese.md
```

Produza `hipotese-escrita.md`:

| Campo | Valor |
|---|---|
| Fonte | |
| Invariante | |
| Afirmação | |
| Observação | |
| **Falsificação** | |

**Responda:**

1. **De qual módulo veio** o seu insumo?
2. **O invariante veio pronto**, ou você deduziu?
3. **A hipótese tem os quatro campos?** Falta algum?
4. **Você consegue escrever "morre se"?** Se não, reformule.

### Passo 2 — O teste por leitura (50 min)

⚠ **A observação que você consegue obter sempre: leitura.**

```bash
cd ~/pesquisa-lab/mod06

echo "═══ O TESTE POR LEITURA ═══"
echo
cat <<'EXPL'
  ── como testar uma hipótese SEM executar ──
     a leitura responde:
       · a validação existe neste ponto?
       · ela vem ANTES ou DEPOIS do uso?
       · cobre TODOS os caminhos, ou só um?
       · o tipo do dado permite o valor que eu imagino?

  ── o método ──
     1. abra o arquivo e a função da hipótese
     2. trace o fluxo da entrada: de onde vem, por onde passa
     3. ⚠ marque TODO ponto onde o valor é usado
     4. em cada uso, pergunte: "o que ele assume?"
     5. verifique se algo GARANTE a suposição antes
     6. ⚠ se nada garante: a hipótese sobreviveu à leitura

  ── o que a leitura NÃO prova ──
     ⚠ que o caminho é ALCANÇÁVEL em runtime
     ⚠ que não há validação em OUTRA camada
     ⚠ que o efeito é o que você imagina
     ✓ e é por isso que a leitura não fecha a hipótese sozinha
EXPL

cat > caderno/06-teste-leitura.md <<'EOF'
# Teste por leitura

## A hipótese
[repetir]

## O que eu li
| Item | Valor |
|---|---|
| Arquivo / função | |
| Linhas relevantes | |

## O fluxo da entrada
1. entrada vem de:
2. passa por:
3. chega em:

## Os pontos de uso
| # | Linha | O que ele ASSUME | Algo garante? | Trecho |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

## Veredito da leitura
[ ] a validação NÃO existe → hipótese sobrevive
[ ] a validação EXISTE e cobre tudo → ⚠ hipótese FALSIFICADA
[ ] a validação existe mas só num caminho → hipótese sobrevive com ajuste

## O que a leitura NÃO provou
[⚠ mínimo 2]

## Próximo teste (se necessário)
[código próprio? alvo autorizado?]
EOF

cat caderno/06-teste-leitura.md
```

Produza `teste-leitura.md`:

| # | Ponto de uso | Assume | Algo garante? |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantos pontos de uso** você encontrou?
2. **Algum deles tem validação antes?** Qual?
3. **A hipótese sobreviveu** à leitura, ou foi falsificada?
4. **O que a leitura não provou?** Escreva.

⚠ **A resposta 3 é o resultado — e pode ser "falsificada".** **Se você achou a validação e ela cobre
tudo, a hipótese morreu** — **e isso é resultado.** **Registre e vá para a próxima.**

### Passo 3 — Confirme com código próprio (45 min)

⚠ **Se a hipótese sobreviveu: **verifique o mecanismo** com código seu.**

```bash
cd ~/pesquisa-lab/mod06

echo "═══ O TESTE COM CÓDIGO PRÓPRIO ═══"
echo
cat <<'EXPL'
  ⚠ a regra: você reimplementa o TRECHO MÍNIMO, não o sistema todo.

  ── o que verificar ──
     · o mecanismo da falha acontece mesmo?
     · a suposição falha com o valor que você imaginou?
     · o efeito é o que você previu?

  ── o que NÃO fazer ──
     ⚠ não copiar código de terceiro e rodar como se fosse seu
     ⚠ não testar contra a instância em produção do projeto
     ✓ reimplementar o trecho, com a mesma lógica, no seu lab

  ── e o registro ──
     · o código que você escreveu (ou o link do clone)
     · o que ele mostra
     · ⚠ se mostra a falha, ou se mostra que a falha NÃO acontece
EXPL

cat > verifica-mecanismo.c <<'EOF'
/*
 * ⚠ VERIFICAÇÃO DE MECANISMO — reimplementação mínima.
 *   NÃO é o código de terceiro. É o SEU trecho, com a mesma lógica,
 *   para verificar se a suposição falha como você imaginou.
 *
 *   ⚠ rode no SEU laboratório. não aponta para nada externo.
 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdlib.h>

/* ⚠ reimplementa o trecho da hipótese */
static int parse_item(const uint8_t *buf, size_t len) {
    uint16_t count;
    uint32_t total;
    char     dst[64];

    /* o trecho que lê o campo — como no código original */
    memcpy(&count, buf, sizeof(count));
    printf("[verifica] count = %u\n", count);

    /* ⚠ o trecho SUSPEITO: aritmética antes da validação */
    total = (uint32_t)count * 4;
    printf("[verifica] total = %u  (o código original faz esta conta)\n", total);

    /* ⚠ a suposição: `total` cabe em dst.  O código garante? */
    if (total >= sizeof(dst)) {
        printf("[verifica] ✓ o código RECUSA antes de copiar\n");
        printf("[verifica]   → a hipótese MORRE aqui (para este caso)\n");
        return -1;
    }

    memcpy(dst, buf + 2, total);
    printf("[verifica] ⚠ copiou %u bytes em um buffer de %zu\n", total, sizeof(dst));
    return 0;
}

int main(void) {
    printf("═══ VERIFICAÇÃO DE MECANISMO ═══\n\n");

    printf("── caso 1: count pequeno ──\n");
    uint8_t b1[128] = {0};
    uint16_t c1 = 4;
    memcpy(b1, &c1, 2);
    parse_item(b1, sizeof(b1));
    printf("\n");

    printf("── caso 2: count que excede o buffer ──\n");
    uint8_t b2[4096] = {0};
    uint16_t c2 = 100;      /* 100 * 4 = 400 > 64 */
    memcpy(b2, &c2, 2);
    parse_item(b2, sizeof(b2));
    printf("\n");

    printf("═══ O QUE ISSO MOSTRA ═══\n");
    printf("  ⚠ esta versão TEM a validação (`if (total >= sizeof(dst))`).\n");
    printf("     ela recusa — e a hipótese MORRE para este código.\n\n");
    printf("  ✓ mas note: se você REMOVER o `if`, o memcpy estoura.\n");
    printf("     é isso que o código ORIGINAL (antes do patch) fazia.\n\n");
    printf("  ⚠ e é por isso que a verificação de mecanismo vale:\n");
    printf("     ela mostra O QUE a validação impede — e o que sobra sem ela.\n");

    return 0;
}
EOF

echo "  ⚠ compile e rode no SEU laboratório:"
echo "     gcc -g -O0 -o verifica-mecanismo verifica-mecanismo.c && ./verifica-mecanismo"
echo
echo "  ⚠ e note o comentário no código:"
echo "     ele mostra a versão COM validação. a hipótese é sobre a SEM."
echo "     → remova o `if` e veja o mecanismo acontecer"
echo "     → é a diferença entre ler e verificar"
```

Produza `teste-codigo.md`:

| Item | Valor |
|---|---|
| Trecho reimplementado | |
| Mecanismo confirmado? | |
| Hipótese sobreviveu? | |
| O que a verificação mostrou | |

**Responda:**

1. **Você reimplementou** o trecho, ou testou contra terceiro?
2. **O mecanismo se confirmou?**
3. **O que a verificação mostrou** que a leitura não mostrava?
4. **A hipótese sobreviveu** aos dois testes?

### Critérios de aceitação

- `forma.md` com os **quatro** campos e a resposta sobre o critério negativo.
- Você distinguie **expectativa, pergunta e hipótese**.
- `cinco-ruins.md` com as **cinco** e a reformulação de cada.
- Você reformulou **pelo menos três** hipóteses ruins.
- Você explicou **por que "vou fuzzar" é método e não hipótese**.
- Você explicou **por que "a ferramenta não achou" não é observação**.
- `insumo.md` com as **quatro** fontes e o que cada uma dá pronto.
- Você identificou **qual fonte dá o invariante pronto**.
- `hipotese-escrita.md` com **"morre se"** escrito.
- Você conseguiu escrever o **critério de falsificação**.
- `teste-leitura.md` com os **pontos de uso** e o que cada um assume.
- Você declarou **o que a leitura não provou**.
- `verifica-mecanismo.c` compilado e rodando **no seu laboratório**.
- Você explicou **a diferença entre ler e verificar** o mecanismo.
- `teste-codigo.md` com o resultado dos **dois** testes.
- ⚠ **Nenhum teste contra sistema de terceiro.**

---

## Avaliação

1. **Diferencie expectativa, pergunta e hipótese.**
2. **Por que uma hipótese sem critério não é hipótese?**
3. **O valor da hipótese está no que ela...?** Complete e explique.
4. **Cite os quatro campos** da forma da hipótese.
5. **Por que o critério é uma afirmação negativa?**
6. **Por que o critério vem antes do teste?**
7. **Cite as cinco hipóteses ruins.**
8. **Por que "vou fuzzar" é método e não hipótese?**
9. **Como o `1dFuzz` evita isso?**
10. **Por que "a ferramenta não achou" não é observação?**
11. **Reformule "isto é vulnerável".**
12. **Cite os quatro insumos** e o que cada um dá pronto.
13. **Qual insumo dá o invariante pronto?** Qual exige que você deduza?
14. **Cite os três tipos de observação.**
15. **O que a linha do terceiro diz?** Por quê?
16. **Como testar uma hipótese por leitura?** Descreva os seis passos.
17. **O que a leitura NÃO prova?** Cite três.
18. **O que significa a hipótese "morrer"?** É resultado?
19. **O que a verificação de mecanismo acrescenta** à leitura?
20. **Por que "inconclusivo" aponta para o teste, e não para o alvo?**

---

**Próximo:** [Módulo 7 — Variante e sibling bug](modulo-07.md)
