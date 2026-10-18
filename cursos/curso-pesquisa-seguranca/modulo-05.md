# Módulo 5 — Ler um Paper

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Aplicar o **método dos três passos** de leitura de paper.
2. Avaliar **método, resultado, limitação e replicabilidade**.
3. Extrair o que o paper te **permite fazer**, e não só o que ele diz.
4. Reconhecer **contribuição real** de **contribuição inflada**.
5. Usar paper como **fonte de padrão** — a mesma função que o CVE tem.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Paper não é para aprender a técnica. É para descobrir o PADRÃO que alguém já provou que existe.**

⚠ **E a diferença é prática.** **Você não lê o `HTTP Garden` para aprender a fazer fuzzing
diferencial de HTTP** — você lê para saber que **o padrão existe, que é comum, e que renderia 100
bugs em servidores populares.** **Isso muda a sua fila de trabalho.**

⚠ **E é o que fecha o ciclo com os módulos 3 e 4:**

| Fonte | O que dá | Granularidade |
|---|---|---|
| **Patch** | **O bug exato** | Uma linha |
| **CVE** | **A classe** | Um bug |
| **Paper** | ⚠ **O padrão numa população** | **Uma classe inteira** |

⚠ **O paper é a fonte de maior alcance.** **Um CVE te dá um bug. Um paper te dá "este padrão existe
em 100 sistemas, e eu testei em 40".** **É a diferença entre caçar um animal e saber onde a manada
está.**

---

## 5.1 O método dos três passos

⚠ **O `How to Read a Paper` (S. Keshav) propõe três passos. Eles funcionam, e o curso adota.**

| Passo | Tempo | O que você faz | O que você decide |
|---|---|---|---|
| **1 — Passagem** | 5–10 min | Título, abstract, intro, seções, conclusão, referências | **Vale a leitura completa?** |
| **2 — Leitura** | ~1 h | Figuras, método, resultado | **Entendi? Consigo explicar?** |
| **3 — Estudo** | Várias h | Reimplementar, reproduzir, criticar | **Confio? Uso?** |

⚠ **A maioria faz o passo 1 e para.** **E é o passo 3 que produz valor** — porque **é onde você
verifica se o método funciona no SEU contexto.**

⚠ **E a decisão do passo 1 é a mais econômica.** **A maioria dos papers não merece o passo 2** — e
**reconhecer isso em 10 minutos é uma habilidade.** **É a mesma economia do módulo 4 (triar por
padrão), aplicada a leitura.**

⚠ **A tabela dos sinais de "vale o passo 2":**

| Sinal | Vale? |
|---|---|
| O método é **reprodutível** com o que eu tenho? | ✓ Sim |
| O padrão **se aplica ao meu alvo**? | ✓✓ Sim |
| Os dados são **públicos** (toolkit, dataset)? | ✓ Sim |
| É **survey** (revisão de área)? | ✓ Sim, para mapa |
| É um **ataque que depende de condição exótica**? | ⚠ Provavelmente não |
| É **resultado sem método descrito**? | ⚠ **Não** |
| É **10 páginas de formalismo sem o bug**? | ⚠ Depende |

⚠ **A linha do "dados públicos" é a mais prática.** **O `HTTP Garden` publicou o toolkit** — e por
isso você **pode verificar** e **aplicar**. **Um paper sem o artefato é mais difícil de usar** —
**mas o padrão ainda vale.**

⚠ **E a linha do survey merece nota.** **Um survey não traz bug — traz MAPA.** **E mapa é o que o
módulo 2 pedia:** **onde está a superfície.** **Um bom survey economiza semanas de tentativa.**

```bash
mkdir -p ~/pesquisa-lab/mod05 && cd ~/pesquisa-lab/mod05

echo "═══ 1. os três passos, e o que cada um decide ═══"
echo
cat > tres-passos.md <<'EOF'
# Os três passos

## Passo 1 — PASSAGEM (5–10 min)
| Leia | O que procura |
|---|---|
| Título | a área |
| Abstract | a afirmação |
| Introdução | o problema, e as contribuições listadas |
| Títulos das seções | a estrutura |
| Conclusão | a conclusão DITA |
| Referências | com quem ele dialoga |

**Decisão:** vale o passo 2?

## Passo 2 — LEITURA (~1 h)
| Leia | O que procura |
|---|---|
| Figuras e tabelas | ⚠ **o resultado real** |
| Método | como ele fez |
| Ameaças à validade | ⚠ **a limitação declarada** |
| Trabalho relacionado | o que ele NÃO cobre |

**Decisão:** consigo explicar o método a alguém?

## Passo 3 — ESTUDO (várias horas)
| Faça | O que produz |
|---|---|
| Reimplementar parte do método | você entendeu? |
| Aplicar ao SEU alvo | funciona fora do paper? |
| Procurar o que ele não testou | ⚠ **o espaço em branco** |
| Criticar | o resultado sustenta a afirmação? |

**Decisão:** confio? uso?
EOF

cat tres-passos.md

echo
echo "═══ 2. os cinco campos da ficha (e o que cada um decide) ═══"
echo
cat <<'EXPL'
  ┌──────────────────────────────────────────────────────────────────┐
  │ MÉTODO                                                            │
  │   o que ele fez, em passos?                                       │
  │   ⚠ é reprodutível com o que eu tenho?                            │
  ├──────────────────────────────────────────────────────────────────┤
  │ RESULTADO                                                         │
  │   o número real (figura/tabela), não o do abstract                │
  │   ⚠ a afirmação do abstract bate com a tabela?                    │
  ├──────────────────────────────────────────────────────────────────┤
  │ LIMITAÇÃO DECLARADA                                               │
  │   ⚠ o que os AUTORES admitem                                      │
  │   ✓ procurar em "Threats to Validity" / "Limitations"             │
  ├──────────────────────────────────────────────────────────────────┤
  │ LIMITAÇÃO NÃO DECLARADA                                           │
  │   ⚠ o que eles NÃO admitem — e você percebe                      │
  │   · amostra enviesada?                                            │
  │   · generalização indevida?                                       │
  │   · dependência de premissa não testada?                          │
  ├──────────────────────────────────────────────────────────────────┤
  │ REPLICABILIDADE                                                   │
  │   tem artefato público? dataset? toolkit?                         │
  │   ⚠ se sim, ele passa do passo 2 para o passo 3                   │
  └──────────────────────────────────────────────────────────────────┘
EXPL
```

⚠ **A distinção entre limitação **declarada** e **não declarada** é o que separa leitura de
confiança.** **Os autores escrevem as limitações deles** — e **você procura o que eles não viram.**

⚠ **É o mesmo raciocínio do módulo 3:** **você não aceita a correção do patch como completa** —
**você avalia se ela fecha a porta.** **Aqui, você não aceita a conclusão do paper como geral** —
**você avalia se ela se sustenta fora do contexto dele.**

**Produza `tres-passos-esquema.md`:**

| Passo | Decisão | Tempo |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

**Responda:**

1. **Qual passo produz valor?** Por que a maioria para no primeiro?
2. **O que o passo 1 decide?** Por que é econômico?
3. **Diferencie limitação declarada de não declarada.**
4. **Por que um survey vale a leitura** sem trazer bug?

---

## 5.2 Ficha de leitura

⚠ **A ficha de paper. É o instrumento do módulo — e ela tem dez campos, não cinco.**

```bash
cd ~/pesquisa-lab/mod05

cat > ficha-paper.md <<'EOF'
# Ficha de paper

## 1. Identificação
| Campo | Valor |
|---|---|
| Título | |
| Autores | |
| Ano / veículo | |
| URL | |
| Tipo | pesquisa / survey / nota técnica |
| Código / artefato | |

## 2. Passo 1 — passagem
| Item | Resposta |
|---|---|
| A afirmação (abstract) | |
| As contribuições declaradas | |
| Vale o passo 2? | |

## 3. Passo 2 — método
| Item | Resposta |
|---|---|
| O que ele fez, em passos | |
| Dados / alvo usados | |
| Ferramenta | |
| Reprodutível com o que eu tenho? | |

## 4. Passo 2 — resultado
| Item | Valor |
|---|---|
| Número real (da figura/tabela) | |
| Número do abstract | |
| ⚠ Bate? | |
| Base de comparação | |

## 5. Limitação declarada
[o que os autores admitem — citar a seção]

## 6. Limitação NÃO declarada
⚠ o que EU percebo e eles não viram

## 7. Replicabilidade
| Item | Valor |
|---|---|
| Artefato público? | |
| Dataset? | |
| Toolkit? | |
| ⚠ Dá para o passo 3? | |

## 8. O PADRÃO que este paper prova que existe
⚠ em uma frase, sem nomes técnicos:
"[o padrão]"

## 9. O que ele NÃO testou
⚠ o espaço em branco — onde você pode ir

## 10. Aplicação ao meu alvo
| Item | Resposta |
|---|---|
| O padrão existe no meu alvo? | |
| Como eu verificaria? | |
| Vale virar investigação? | |
EOF

cat ficha-paper.md

echo
echo "═══ 3. o padrão, no paper ═══"
echo
cat <<'EXPL'
  ⚠ a pergunta central que o paper responde NÃO é "como fazer".
     é: "ESTE PADRÃO existe, e eu PROVEI que é comum."

  ── exemplos de padrão que um paper pode provar ──
     · "implementações do mesmo protocolo discordam em X"
       → HTTP Garden: 100+ bugs, 39 exploráveis
       ✓ o padrão é a DISCORDÂNCIA, e ela é comum por definição

     · "correções frequentemente são incompletas"
       → 1dFuzz: patch tem uma "trailing call sequence" identificável
       ✓ o padrão é a CORREÇÃO PARCIAL

     · "o mesmo bug existe em N projetos"
       → EnBinDiff: 20 1-days em binários reais
       ✓ o padrão é a REPETIÇÃO do erro

  ── a diferença de um CVE ──
     o CVE te dá UM bug.
     ⚠ o paper te dá a POPULAÇÃO onde o padrão vive.
     ✓ é a diferença entre saber que existe um leão,
        e saber onde está a manada.
EXPL
```

⚠ **O campo 8 é o mais importante da ficha.** **"O padrão que este paper prova que existe"** — **é
a mesma abstração do módulo 3 (nível 3), aplicada a uma população.**

⚠ **E o campo 9 é o que produz o achado.** **"O que ele não testou"** é **o espaço em branco** — e
**é onde você vai.** **O `HTTP Garden` testou HTTP/1.1** — e **o próprio paper declara que o HTTP/2
ficou para trabalho futuro.** **Ou seja: um paper de 2024 aponta para onde o de 2026 vai.**

**Produza `ficha.md`:**

| Campo | Valor |
|---|---|
| Padrão provado | |
| Não testou | |
| Replicável? | |
| Aplica ao meu alvo? | |

**Responda:**

1. **Qual o padrão** que o paper prova?
2. **O que ele não testou?** É o espaço em branco?
3. **O artefato é público?** Você pode fazer o passo 3?
4. **O resultado da tabela bate** com o do abstract?

---

## 5.3 Contribuição real versus inflada

⚠ **Nem todo paper contribui o que ele diz. E reconhecer isso é parte da leitura.**

| Sinal de contribuição REAL | Sinal de inflada |
|---|---|
| O método é descrito o suficiente para replicar | ⚠ "nós propomos uma abordagem..." |
| Os dados são públicos | Só agregado, sem o cru |
| A limitação está declarada e é honesta | Nenhuma limitação |
| O resultado é comparado com baseline | Sem comparação |
| O artefato existe | "disponível sob pedido" |
| Outros citam o método | ⚠ Só o próprio grupo cita |

⚠ **A linha do "disponível sob pedido" é o sinal mais direto.** **Se o artefato não é público, o
passo 3 fica difícil** — e **você não consegue verificar.** **Isso não invalida o paper, mas limita
o que você pode fazer com ele.**

⚠ **E a linha da citação merece a explicação.** **Um método que ninguém replicou em cinco anos pode
ser bom e ignorado — ou pode não funcionar fora do contexto do autor.** **O tempo diz qual.**

⚠ **A tabela do que fazer com cada tipo:**

| Tipo | O que usar |
|---|---|
| **Contribuição real + artefato** | ⚠ **Passo 3: reimplemente e aplique** |
| Contribuição real, sem artefato | Passo 2: o padrão vale, o método exige trabalho |
| Survey | **Mapa** — use para escolher alvo |
| Contribuição inflada | ⚠ O **padrão** pode ainda valer; ignore a reivindicação |
| Sem método, só resultado | ⚠ Difícil — trate como pista |

⚠ **A terceira linha merece atenção especial.** **Survey não traz bug — traz mapa.** **E mapa é o
que decide o alvo.** **Um bom survey de uma área te diz onde a superfície está e onde ninguém
olhou** — **e isso economiza semanas do módulo 2.**

```bash
cd ~/pesquisa-lab/mod05

echo "═══ 4. avaliando contribuição ═══"
echo
python3 - <<'PY'
print("  ═══ CONTRIBUIÇÃO: O QUE VERIFICAR ═══")
print()
checklist = [
    ("o método é descrito em passos?",            "sem isso, passo 3 é impossível"),
    ("o dado cru é público?",                     "sem isso, você não pode verificar"),
    ("a limitação está declarada?",               "⚠ a ausência é sinal"),
    ("há comparação com baseline?",               "sem isso, o número não significa nada"),
    ("o artefato existe?",                        "✓ o que permite o passo 3"),
    ("terceiros citam e replicam?",               "o tempo é o juiz"),
    ("a afirmação do abstract bate com a tabela?", "⚠ checar SEMPRE"),
]
print(f"  {'item':<46} {'por quê':<42}")
print("  " + "-"*88)
for item, pq in checklist:
    print(f"  {item:<46} {pq:<42}")

print()
print("  ⚠ o item 7 é o mais rápido de checar e o mais revelador.")
print("     o abstract diz 'até 2,26× mais'; a tabela mostra a média.")
print("     ⚠ os dois podem ser verdade — e a diferença importa.")
print()
print("═══ O QUE ANDA JUNTO MAS NÃO É A MESMA COISA ═══")
print()
print("  ┌───────────────────────┬────────────────────────────────────────┐")
print("  │ afirmado              │ significa                              │")
print("  ├───────────────────────┼────────────────────────────────────────┤")
print("  │ 'até N×'              │ ⚠ o MELHOR caso, não a média            │")
print("  │ 'encontramos N bugs'  │ ⚠ em QUE amostra? qual base?            │")
print("  │ '100% de detecção'    │ ⚠ em qual dataset? qual ground truth?   │")
print("  │ 'state-of-the-art'    │ ⚠ comparado a QUEM, e com que dado?     │")
print("  │ 'não requer…'         │ ⚠ verificar a premissa                  │")
print("  └───────────────────────┴────────────────────────────────────────┘")
PY
```

⚠ **A tabela final é o instrumento de leitura crítica.** **"Até N×"** significa **o melhor caso** —
e **o `1dFuzz` diz "até 2,26× mais com 43% menos tempo".** **Os dois números são reais** — **e a
média provavelmente é menor.** **Ler a tabela, não o abstract.**

⚠ **E "state-of-the-art" merece desconfiança sistemática.** **Comparado a quem, com que dado, em
que configuração?** **Um método pode ser SOTA num dataset e pior em outro.**

**Produza `contribuicao.md`:**

| Sinal | Presente? | O que permite |
|---|---|---|
| Método descrito | | |
| Dado público | | |
| Limitação declarada | | |
| Baseline | | |
| Artefato | | |

**Responda:**

1. **O paper tem artefato público?** Você pode fazer o passo 3?
2. **A afirmação do abstract bate** com a tabela?
3. **Havia limitação declarada?** Onde?
4. **O que "até N×" esconde?**

---

## 5.4 O que fazer com um paper

⚠ **Quatro usos, e o curso usa todos.**

| Uso | O que você faz | Quando |
|---|---|---|
| **Mapa** | escolher alvo (módulo 2) | Survey, ou paper de área |
| **Padrão** | saber que o padrão existe e é comum | ⚠ **O mais comum** |
| **Método** | reimplementar (passo 3) | Com artefato |
| **Espaço em branco** | ir onde o paper não foi | ⚠ **O mais valioso** |

⚠ **A linha do espaço em branco é a que produz achado.** **Todo paper declara o que não fez** — e
**isso é um convite.** **O `HTTP Garden` testou HTTP/1.1 e declarou que HTTP/2 ficou para depois.**
**O `WAFFLED` declarou o mesmo.** **E o `HTTP/1.1 Must Die` (2025) foi lá.**

⚠ **E a linha do padrão fecha com o módulo 3.** **O papel do paper na sua pesquisa é o mesmo do
patch:** **abstrair o padrão** — só que **numa escala maior**.

⚠ **A sequência completa, do paper ao achado:**

```
1. leia o paper (passo 1 e 2)
2. ⚠ abstraia o padrão que ele provou
3. veja o que ele NÃO testou (espaço em branco)
4. aplique ao SEU alvo (módulo 2)
5. verifique por leitura (módulos 3 e 6)
6. ⚠ e o que você achar, ele não achou
```

```bash
cd ~/pesquisa-lab/mod05

echo "═══ 5. do paper ao achado ═══"
echo
cat > do-paper-ao-achado.md <<'EOF'
# Do paper ao achado

## O paper
| Campo | Valor |
|---|---|
| Título | |
| O padrão que ele prova | |
| O que ele NÃO testou | |
| Artefato público? | |

## Aplicação ao meu alvo
| Pergunta | Resposta |
|---|---|
| O padrão existe no meu alvo? | |
| Em que componente? | |
| Como eu verificaria por leitura? | |
| ⚠ Isso é o espaço em branco do paper? | |

## A investigação
| Item | Valor |
|---|---|
| ID no caderno | |
| Hipótese | |
| Critério de falsificação | |

## O que EU poderia achar que ele não achou
[⚠ a contribuição possível]
EOF

cat do-paper-ao-achado.md

echo
echo "═══ 6. os papers que o curso usa ═══"
cat <<'EXPL'
  ┌──────────────────────────┬──────────────────────────────────────────┐
  │ paper                    │ o padrão que ele prova                   │
  ├──────────────────────────┼──────────────────────────────────────────┤
  │ HTTP Garden (2024)       │ implementações do mesmo protocolo        │
  │                          │ DISCORDAM — 100+ bugs, 39 exploráveis    │
  │                          │ ⚠ não testou HTTP/2                      │
  ├──────────────────────────┼──────────────────────────────────────────┤
  │ 1dFuzz (2023)            │ patch tem "trailing call sequence"       │
  │                          │ identificável → fuzzing dirigido funciona│
  │                          │ ✓ 2,26× mais, 43% menos tempo            │
  ├──────────────────────────┼──────────────────────────────────────────┤
  │ PLocator (2025)          │ o código do patch é LOCALIZÁVEL          │
  │                          │ a partir do patch + funções de referência│
  ├──────────────────────────┼──────────────────────────────────────────┤
  │ EnBinDiff (2023)         │ padrão se REPETE entre projetos          │
  │                          │ ✓ 20 1-days reais, falso negativo 11→1,6%│
  ├──────────────────────────┼──────────────────────────────────────────┤
  │ WAFFLED (2025)           │ parsing discrepante BURLA WAF            │
  │                          │ ⚠ não testou HTTP/2                      │
  ├──────────────────────────┼──────────────────────────────────────────┤
  │ HTTP Request Sync (2025) │ discrepância é mitigável por SINCRONIZAR │
  │                          │ ✓ defesa — e mostra o que ainda sobra    │
  └──────────────────────────┴──────────────────────────────────────────┘

  ⚠ note: DOIS papers declaram "não testamos HTTP/2".
     ✓ isso é o espaço em branco — e é onde o Kettle foi em 2025.
EXPL
```

⚠ **A tabela dos papers é o material do curso.** **E note o padrão na última linha:** **dois papers
declaram não ter testado HTTP/2** — e **o `HTTP/1.1 Must Die` (Kettle, 2025) ataca exatamente ali.**
**O espaço em branco é literal, e o campo 9 da ficha é o que o encontra.**

**Produza `paper-achado.md`:**

| Item | Valor |
|---|---|
| Padrão | |
| Espaço em branco | |
| Aplica ao meu alvo? | |
| Hipótese | |

**Responda:**

1. **Qual o padrão** do paper que você leu?
2. **O que ele não testou?** É espaço em branco?
3. **Isso aplica ao seu alvo** (módulo 2)?
4. **Que hipótese** isso gera? É falsificável?

---

## 5.5 LAB — Leia um paper de verdade

**Duração:** 120 min

### Passo 1 — Passo 1: a passagem (25 min)

⚠ **Cinco a dez minutos. Sério — cronometre.**

```bash
cd ~/pesquisa-lab/mod05

echo "═══ ONDE ENCONTRAR PAPERS ═══"
echo
cat <<'EXPL'
  ── 1. arXiv cs.CR (o mais acessível) ──
     https://arxiv.org/list/cs.CR/recent
     ✓ tudo livre, tudo recente
     ⚠ nem tudo passou por revisão — verifique

  ── 2. As quatro conferências principais ──
     · USENIX Security   https://www.usenix.org/conference/usenixsecurity
     · NDSS              https://www.ndss-symposium.org/
     · IEEE S&P          ("Oakland")
     · ACM CCS           https://www.sigsac.org/ccs.html
     ✓ revisão por pares — mais confiável
     ⚠ mas muitos ficam atrás de paywall (procure a versão do autor)

  ── 3. As notas técnicas de fornecedor ──
     · Project Zero blog
     · PortSwigger Research
     ✓ qualidade alta, e frequentemente mais útil que paper

  ── 4. Surveys ──
     procure por "survey" ou "systematic review" na sua área
     ✓ é o MAPA que o módulo 2 pedia

  ⚠ ESCOLHA um paper do seu tema (módulo 2).
     não leia aleatório — leia o que aplica ao SEU alvo.
EXPL

cat > ler-paper.sh <<'SCRIPT'
#!/usr/bin/env bash
# ler-paper.sh — cronometra o passo 1
set -uo pipefail

echo "═══ PASSO 1 — PASSAGEM (cronometrado) ═══"
echo
echo "  ⚠ 5 a 10 minutos. NÃO leia o paper inteiro."
echo
cat <<'EXPL'
  ── a ordem ──
     1. Título + Autores + Veículo            (30 s)
     2. Abstract                              (1 min)
     3. Introdução — e as CONTRIBUIÇÕES listadas (3 min)
     4. Títulos das seções + figuras          (2 min)
     5. Conclusão                             (1 min)
     6. Referências — com quem dialoga?       (1 min)

  ── as cinco perguntas do passo 1 ──
     a) Qual é a AFIRMAÇÃO?
     b) Quais são as CONTRIBUIÇÕES declaradas?
     c) Qual o MÉTODO, em uma frase?
     d) Tem ARTEFATO público?
     e) ⚠ VALE o passo 2?

  ── o sinal de "pare aqui" ──
     · não entendi o método E não tem artefato
     · é ataque com condição que o meu alvo não tem
     · é resultado sem método descrito
EXPL

echo
echo "  ⚠ agora cronometre você mesmo:"
echo "     date +%s  →  leia  →  date +%s"
SCRIPT

chmod +x ler-paper.sh
./ler-paper.sh
```

Produza `passo1.md`:

| Item | Resposta |
|---|---|
| Afirmação | |
| Contribuições | |
| Método (1 frase) | |
| Artefato? | |
| **Vale o passo 2?** | |
| Tempo gasto | |

**Responda:**

1. **Quanto tempo você gastou?** Ficou em 10 minutos?
2. **Qual a afirmação do paper** em uma frase?
3. **Tem artefato público?**
4. **Vale o passo 2?** Por quê?

### Passo 2 — Passo 2: a leitura (60 min)

⚠ **Agora leia de verdade. Foque em figura, método e limitação.**

```bash
cd ~/pesquisa-lab/mod05

echo "═══ PASSO 2 — LEITURA ═══"
echo
cat <<'EXPL'
  ── a ordem (⚠ diferente da ordem do texto) ──
     1. FIGURAS E TABELAS  ← ⚠ comece aqui
        · o resultado REAL está aqui
        · o abstract pode dizer "até N×"; a tabela diz a média

     2. MÉTODO
        · o que ele fez, em passos
        · é reprodutível com o que eu tenho?

     3. AMEAÇAS À VALIDADE / LIMITAÇÕES
        · ⚠ procure a seção — todo paper bom tem
        · é o que os autores ADMITEM

     4. TRABALHO RELACIONADO
        · o que este paper NÃO cobre (ele mesmo diz)

  ── o que você produz ──
     · o número REAL (da tabela, não do abstract)
     · o método em passos
     · a limitação declarada
     · ⚠ a limitação NÃO declarada (o que você percebe)
EXPL

cat > caderno/05-paper.md <<'EOF'
# INV-005 — leitura de paper

**Data:** ____

## 1. Identificação
| Campo | Valor |
|---|---|
| Título | |
| Autores | |
| Ano / veículo | |
| URL | |
| Tipo | |
| Artefato | |

## 2. Passo 1 — passagem
| Item | Resposta |
|---|---|
| Afirmação | |
| Contribuições declaradas | |
| Método (uma frase) | |
| Vale o passo 2? | |
| Tempo do passo 1 | |

## 3. Passo 2 — método
| Item | Resposta |
|---|---|
| O que ele fez, em passos | |
| Dados / alvos | |
| Ferramenta | |
| Reprodutível? | |

## 4. Passo 2 — resultado ⚠ DA TABELA
| Métrica | Valor (tabela) | Valor (abstract) | Bate? |
|---|---|---|---|
| | | | |

## 5. Limitação DECLARADA
[citando a seção]

## 6. Limitação NÃO DECLARADA
[o que eu percebo]

## 7. Replicabilidade
| Item | Valor |
|---|---|
| Artefato público? | |
| Dataset? | |
| Dá passo 3? | |

## 8. ⚠ O PADRÃO que este paper prova que existe
"[em uma frase, sem nomes técnicos]"

## 9. Espaço em branco — o que ele NÃO testou
[o convite]

## 10. Aplicação ao meu alvo
| Item | Resposta |
|---|---|
| O padrão existe lá? | |
| Como verificar por leitura? | |
| Vira investigação? | |
EOF

cat caderno/05-paper.md
```

Produza `passo2.md`:

| Campo | Valor (tabela) | Valor (abstract) | Bate? |
|---|---|---|---|
| Resultado | | | |

**Responda:**

1. **Você leu a figura antes do texto?** O número mudou de leitura?
2. **A limitação declarada** — qual é, e onde?
3. **A limitação não declarada** — qual é?
4. **Tem artefato?** Pode fazer o passo 3?

### Passo 3 — Passo 3: o padrão e a aplicação (35 min)

⚠ **O passo que a maioria não faz — e o que produz valor.**

```bash
cd ~/pesquisa-lab/mod05

echo "═══ PASSO 3 — ESTUDO E APLICAÇÃO ═══"
echo
cat <<'EXPL'
  ── o passo 3 tem três formas ──
     1. REIMPLEMENTAR
        · se há artefato: rode, entenda, adapte
        · ✓ é o que verifica se o método funciona
     2. APLICAR AO MEU ALVO
        · o padrão do paper existe no meu alvo? (módulo 2)
        · ⚠ é a aplicação que gera achado
     3. IR AO ESPAÇO EM BRANCO
        · o que o paper NÃO testou
        · ⚠⚠ é o mais valioso, e o que quase ninguém faz

  ── e você não precisa de artefato para o 2 e o 3 ──
     ✓ o PADRÃO é o que importa, e ele está no texto
EXPL

cat > caderno/05-aplicacao.md <<'EOF'
# Aplicação do paper ao meu alvo

## O paper
| Campo | Valor |
|---|---|
| ID | |
| O padrão provado | |
| Espaço em branco | |

## O meu alvo
| Campo | Valor |
|---|---|
| Alvo | |
| Componente relevante | |
| O padrão se aplica? | |

## A aplicação
| # | O que eu verificaria | Como | Hipótese |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## O espaço em branco — minha chance
| Item | Valor |
|---|---|
| O paper não testou: | |
| Eu PODERIA testar: | |
| ⚠ Autorização para testar: | |
| Isso é backlog de leitura, ou de teste? | |

## Vira investigação?
| Item | Valor |
|---|---|
| ID no caderno | |
| Próximo passo | |
EOF

cat caderno/05-aplicacao.md
```

Produza `passo3.md`:

| Item | Valor |
|---|---|
| Padrão | |
| Espaço em branco | |
| Aplica ao alvo? | |
| Vira investigação? | |

**Responda:**

1. **Você fez o passo 3?** Ou parou no 2?
2. **O padrão aplica** ao seu alvo (módulo 2)?
3. **Qual o espaço em branco** do paper?
4. **Isso vira investigação?** Com que hipótese?

### Critérios de aceitação

- `tres-passos-esquema.md` com os **três** passos e a decisão de cada.
- Você fez o **passo 1 cronometrado** — e declarou o tempo.
- `ficha.md` com o **padrão provado** e o **espaço em branco**.
- Você explicou **por que a maioria para no passo 1**.
- `contribuicao.md` com os **cinco** sinais verificados.
- Você comparou **o número do abstract com o da tabela**.
- Você explicou **o que "até N×" esconde**.
- Você distinguiu **limitação declarada** de **não declarada**.
- `paper-achado.md` com o padrão, o espaço em branco e a hipótese.
- Você explicou **por que um survey vale sem trazer bug**.
- Você **leu a figura antes do texto** e relatou a diferença.
- `passo3.md` com a aplicação ao **seu** alvo.
- Você identificou **o espaço em branco** do paper.
- Você explicou **por que o espaço em branco é o mais valioso**.
- ⚠ **Nenhum teste contra sistema de terceiro.** Aqui é leitura.

---

## Avaliação

1. **Por que paper não serve para aprender a técnica?**
2. **O que ele dá que um CVE não dá?**
3. **Cite os três passos** e o que cada um decide.
4. **Qual passo produz valor?** Por que a maioria para antes?
5. **O que o passo 1 decide?** Por que é econômico?
6. **O que você lê primeiro no passo 2?** Por quê?
7. **Cite os cinco campos da ficha** — e os cinco extras.
8. **Diferencie limitação declarada de não declarada.**
9. **Por que ler a tabela antes do abstract?**
10. **O que "até N×" esconde?**
11. **O que "state-of-the-art" esconde?**
12. **Por que "disponível sob pedido" limita** o que você pode fazer?
13. **O que o tempo diz** sobre um método que ninguém replicou?
14. **Por que um survey vale a leitura?**
15. **Qual é o campo mais importante da ficha?** Por quê?
16. **O que é espaço em branco?** Por que é o mais valioso?
17. **Por que o `HTTP Garden` foi o convite** para o `HTTP/1.1 Must Die`?
18. **Cite dois papers que declaram não testar HTTP/2.**
19. **O que o `1dFuzz` prova que existe?**
20. **O que o `EnBinDiff` prova que existe?**

---

**Próximo:** [Módulo 6 — Hipótese falsificável](modulo-06.md)
