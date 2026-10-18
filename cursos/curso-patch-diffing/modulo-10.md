# Módulo 10 — Variante por Ecossistema

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 9 · Pesquisa em Segurança (módulo 7)

---

## Objetivos

1. Entender por que **a variante por ecossistema transforma 1-day em 0-day**.
2. Reconhecer **onde** o mesmo padrão vive em N implementações.
3. Aplicar o método: **padrão → assinatura → busca em N projetos**.
4. Usar **fuzzing diferencial** como a técnica que escala.
5. Reportar a **cada mantenedor** — e por que isso multiplica o crédito.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O patch corrigiu UM projeto. O padrão não sabe de projetos.** **Ele existe em todo lugar onde o
> mesmo raciocínio foi aplicado** — **e cada projeto erra independente.**

⚠ **E é a razão de o achado mudar de natureza:**

| Variante onde | Projeto sabe que existe? | Nome |
|---|---|---|
| Mesmo arquivo | ✓ Sim | ⚠ **1-day** |
| Mesmo projeto | ✓ Sim | ⚠ 1-day |
| ⚠ **Outro projeto** | ⚠ **NÃO** | ⚠⚠ **0-day** |

⚠ **A tese:** **1-day é "o que faltou corrigir". 0-day é "o que ninguém sabia".** **A distância
entre os dois é o escopo da busca** — **e ela é o trabalho do módulo.**

⚠ **E o número que prova que funciona:** **o `HTTP Garden` fez isso em escala** — **fuzzing
diferencial de fluxo HTTP contra N servidores** — **e achou mais de 100 bugs de parsing, 68
corrigidos, 39 exploráveis.** **Não em um servidor: no conjunto.**

---

## 10.1 Por que ele vira 0-day

⚠ **A mecânica, e ela é estrutural.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ PROJETO A                                                            │
│   · implementa o formato F                                            │
│   · tinha o bug P                                                     │
│   · ⚠ recebeu o PATCH — e o mantenedor SABE que P existe              │
├──────────────────────────────────────────────────────────────────────┤
│ PROJETO B                                                            │
│   · implementa o MESMO formato F                                      │
│   · ⚠ tem o MESMO bug P                                               │
│   · ⚠ e NUNCA recebeu patch nenhum — porque ninguém reportou nele      │
├──────────────────────────────────────────────────────────────────────┤
│ ⚠ A CONCLUSÃO                                                        │
│   · no A, você acha um 1-day (a variante que faltou)                  │
│   · no B, você acha um 0-DAY — e o mantenedor do B não sabia          │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A razão de B ter o mesmo bug é o PADRÃO.** **Não é plágio nem cópia** — **é que a mesma
pergunta ("o campo cabe?") foi respondida de forma incompleta em dois lugares independentes.**
**É o que o `EnBinDiff` encontrou em 20 casos.**

⚠ **E o formato é o que liga os dois:** **um protocolo, um formato de arquivo, uma API, uma
especificação.** **Onde há especificação, há N implementações** — **e cada uma pode errá-la
independente.**

⚠ **A tabela dos ecossistemas onde isso é produtivo:**

| Ecossistema | N implementações | Por que rende |
|---|---|---|
| **Protocolo de rede** | Muitas | ⚠ **Cada stack é independente** |
| **Formato de arquivo** | Muitas | Cada parser é independente |
| **Biblioteca de parsing** | Muitas | Cada linguagem tem a sua |
| **Implementação de cripto** | Muitas | Cada uma reimplementa |
| **Runtime / VM** | Poucas | Mas complexas |
| **Compilador** | Muitas | Cada um lê a mesma spec |

⚠ **A primeira linha é a mais produtiva, e a mais provada.** **O `HTTP Garden` a usou.** **E o
`HTTP/1.1 Must Die` (2025) continua na mesma linha** — **porque o HTTP é implementado em centenas
de lugares.**

⚠ **A regra escrita:**

> **Onde há especificação, há N implementações.** **E o padrão que você achou numa delas é uma
> pergunta que você faz às outras.**

```bash
mkdir -p ~/patch-lab/mod10 && cd ~/patch-lab/mod10

echo "═══ 1. por que vira 0-day ═══"
echo
cat > 0day.md <<'EOF'
# Por que vira 0-day

## A mecânica
| Projeto | Tem o padrão? | Recebeu patch? | Sabe que existe? | Nome |
|---|---|---|---|---|
| A | ✓ | ✓ | ✓ | 1-day |
| B | ✓ | ⚠ **não** | ⚠ **não** | ⚠⚠ **0-day** |

⚠ B tem o mesmo bug porque o PADRÃO é o mesmo —
   não porque copiou. dois lugares responderam
   a mesma pergunta de forma incompleta.

## O que liga os dois
| Elemento | O que é |
|---|---|
| o formato | arquivo, protocolo, API |
| a especificação | RFC, doc, padrão |
| ⚠ **o padrão** | **a pergunta mal respondida** |

## Onde é produtivo
| Ecossistema | N impl. | Por que rende |
|---|---|---|
| protocolo de rede | muitas | ⚠ cada stack é independente |
| formato de arquivo | muitas | cada parser é independente |
| lib de parsing | muitas | cada linguagem tem a sua |
| implementação de cripto | muitas | cada uma reimplementa |
| compilador | muitas | leem a mesma spec |

## ⚠ A REGRA
onde há especificação, há N implementações.
e o padrão achado numa delas é uma PERGUNTA
que você faz às outras.
EOF

cat 0day.md
```

**Produza `0day.md`:**

| Projeto | Tem o padrão? | Recebeu patch? | Nome |
|---|---|---|---|
| A | | | |
| B | | | |

**Responda:**

1. **Por que B tem o mesmo bug** sem ter copiado?
2. **O que liga os dois projetos?**
3. **Qual ecossistema é o mais produtivo?** Por quê?
4. **Por que o 0-day vale mais** que o 1-day?

---

## 10.2 O método

⚠ **Do padrão à busca em N projetos. Quatro passos, e o segundo é o que exige abstração.**

| # | Passo | O que fazer |
|---|---|---|
| 1 | **Abstraia o padrão** | ⚠ **Sem nomes de variável** (módulo 3, nível 3) |
| 2 | **Traduza para a pergunta** | ⚠ **A pergunta que a outra implementação também faria** |
| 3 | **Liste as implementações** | Quem mais implementa o mesmo? |
| 4 | **Verifique por leitura** | ⚠ **Ler o código de cada uma** |

⚠ **O passo 2 é o mais importante, e o mais abstrato.** **Você não procura a mesma linha** — **você
procura a mesma PERGUNTA.**

| Padrão (do patch) | A pergunta que gera |
|---|---|
| campo usado em aritmética sem faixa | "esta implementação valida a faixa?" |
| verificação depois do uso | "esta valida ANTES?" |
| tipo pequeno para o valor | "o tipo desta cabe no valor real?" |
| confia no campo de tamanho | "esta confere o tamanho declarado?" |
| parsing divergente entre camadas | "as duas camadas desta concordam?" |

⚠ **A linha do parsing divergente é a mais valiosa, e a do `HTTP Garden`.** **"As duas camadas
desta concordam sobre onde a mensagem termina?"** — **e é uma pergunta que se faz a **todo** servidor
HTTP.** **É o que o fuzzing diferencial automatiza.**

⚠ **E o passo 4 é o que separa hipótese de achado.** **Você **lê** o código de cada implementação.**
**Não supõe que tem o bug porque o padrão é comum** — **você verifica.** **É o falso positivo do
módulo 7 do Pesquisa.**

⚠ **A regra escrita:**

> **O padrão vira PERGUNTA. A pergunta vira uma lista de implementações. E a lista vira leitura** —
> **uma por uma, porque o padrão comum não garante o bug presente.**

```bash
cd ~/patch-lab/mod10

echo "═══ 2. os quatro passos ═══"
echo
cat > metodo.md <<'EOF'
# O método: do padrão à busca

## Os quatro passos
| # | Passo | O que exige |
|---|---|---|
| 1 | abstraia o padrão | ⚠ SEM nomes |
| 2 | traduza para PERGUNTA | ⚠ abstração |
| 3 | liste as implementações | reconhecimento |
| 4 | verifique por leitura | ⚠ trabalho |

## Padrão → pergunta
| Padrão (do patch) | A pergunta |
|---|---|
| campo em aritmética sem faixa | "esta valida a faixa?" |
| verificação depois do uso | "esta valida ANTES?" |
| tipo pequeno para o valor | "o tipo cabe no valor real?" |
| confia no campo de tamanho | "esta confere o declarado?" |
| ⚠ parsing divergente | ⚠ "as duas camadas concordam?" |

## ⚠ por que o passo 2 é o mais importante
você NÃO procura a mesma linha.
procura a mesma PERGUNTA.
✓ e a pergunta é o que atravessa linguagens,
   estruturas e estilos diferentes.

## ⚠ e o passo 4 é o que separa hipótese de achado
você LÊ o código de cada implementação.
ⓘ "o padrão é comum" não significa "esta tem o bug".
✓ é o falso positivo do módulo 7 do curso de Pesquisa.
EOF

cat metodo.md

echo
echo "═══ 3. o exemplo: do par de treino ao ecossistema ═══"
echo
cat <<'EXPL'
  ── O PADRÃO (do módulo 3) ──
     "campo lido da entrada usado em aritmética
      antes de validação de faixa"

  ── A PERGUNTA (passo 2) ──
     ⚠ "esta implementação valida a FAIXA do campo
        ANTES de usá-lo numa conta que define tamanho?"

  ── AS IMPLEMENTAÇÕES (passo 3) ──
     · todo parser que lê um campo de contagem/tamanho do dado
     · ⚠ em TODA linguagem — e não só em C
     · formatos com cabeçalho: imagens, arquivos comprimidos,
       formatos de rede, serialização

  ── A LEITURA (passo 4) ──
     ⚠ para cada uma: a validação existe? vem antes?
     ✓ e o critério é o mesmo: "aceita menos" se você der o valor grande

  ⚠ e há uma forma mais rápida: FUZZING DIFERENCIAL
     em vez de ler N implementações, mande a MESMA entrada
     para duas delas e compare o comportamento.
     ✓ é o que o HTTP Garden fez — 100+ bugs.
EXPL
```

⚠ **O exemplo conecta tudo.** **O padrão do par de treino (uma linha de `memcpy`) vira uma pergunta
que se faz a **todo parser com campo de tamanho**.** **E o passo 3 é onde você percebe que o
escopo é grande** — **e é o que justifica o fuzzing diferencial.**

⚠ **E a nota final é a ponte com o módulo seguinte do curso de Pesquisa:** **a leitura de N
implementações é o trabalho manual; o fuzzing diferencial é a versão que escala.** **Os dois usam a
mesma pergunta.**

**Produza `metodo.md`:**

| Passo | O que fazer | No seu caso |
|---|---|---|
| 1 — padrão | | |
| 2 — pergunta | | |
| 3 — implementações | | |
| 4 — leitura | | |

**Responda:**

1. **Qual passo exige abstração?** Por que é o mais importante?
2. **O que você procura** — a linha, ou a pergunta?
3. **Quantas implementações** o seu padrão alcança?
4. **Por que a leitura é obrigatória** mesmo com padrão comum?

---

## 10.3 Fuzzing diferencial como ferramenta

⚠ **A técnica que escala a variante por ecossistema. E ela é o módulo 7 do curso de Pesquisa.**

| Técnica | O que faz | Escala |
|---|---|---|
| **Leitura de N projetos** | lê cada um | ⚠ Baixa |
| **`grep` de N projetos** | busca o termo | Média |
| ⚠ **Fuzzing diferencial** | ⚠ **compara COMPORTAMENTO** | ⚠ **Alta** |

⚠ **A razão de o diferencial escalar:** **ele não exige entender cada implementação.** **Ele dá a
mesma entrada às duas e vê onde discordam** — **e a discordância é o sinal.**

⚠ **E a conexão com o curso de Fuzzing é direta:** **o harness que você escreveu lá é o que o
diferencial usa** — **e o que muda é que você roda **dois** em vez de um, e compara.**

⚠ **A tabela do que montar:**

| Item | O que é |
|---|---|
| **As N implementações** | baixadas, compiladas, no seu lab |
| **O harness** | manda a mesma entrada às N |
| **O comparador** | ⚠ **detecta onde diferem** |
| **O corpus** | ⚠ **fronteiras** (módulo 8) |

⚠ **O corpus merece a nota.** **Não é entrada aleatória** — **é a **fronteira** do campo que o
padrão indica.** **É o módulo 8 aplicado ao diferencial:** **o limite, o limite + 1, o máximo do
tipo.**

⚠ **A regra escrita:**

> **O diferencial não entende a especificação — ele detecta a discordância.** **E discordância sobre
> o FRAMING (onde a mensagem termina) é bug de segurança** — **não uma implementação diferente
> legítima.**

⚠ **E é o critério do `HTTP Garden`, e ele é preciso:** **não procurava "diferença" — procurava
diferença **de framing**.** **É a hipótese do módulo 6 do Pesquisa: específica, com critério.**

```bash
cd ~/patch-lab/mod10

echo "═══ 4. fuzzing diferencial ═══"
echo
cat > diferencial.md <<'EOF'
# Fuzzing diferencial

## As três técnicas
| Técnica | O que faz | Escala |
|---|---|---|
| leitura de N projetos | lê cada um | ⚠ baixa |
| grep de N projetos | busca o termo | média |
| ⚠ FUZZING DIFERENCIAL | compara COMPORTAMENTO | ⚠ alta |

## Por que escala
⚠ não exige entender cada implementação.
   dá a MESMA entrada às duas e vê onde discordam.
✓ a discordância é o sinal.

## O que montar
| Item | O que é |
|---|---|
| as N implementações | no seu lab |
| o harness | manda a mesma entrada |
| o comparador | ⚠ detecta a diferença |
| o corpus | ⚠ FRONTEIRAS (módulo 8) |

## ⚠ o corpus
não é aleatório — é a FRONTEIRA do campo.
✓ o limite, o limite + 1, o máximo do tipo.

## ⚠ o critério (o do HTTP Garden)
não procura "diferença" — procura diferença DE FRAMING.
· onde a mensagem TERMINA
✓ porque discordar sobre o limite é bug;
   discordar sobre outra coisa pode ser legítimo.

## A ligação com os outros cursos
· Fuzzing: o harness que você escreveu lá
· Pesquisa (módulo 7): o critério da discrepância
EOF

cat diferencial.md

echo
echo "═══ 5. o harness diferencial, em esqueleto ═══"
echo
cat > harness-diferencial.py <<'PY'
#!/usr/bin/env python3
"""
harness-diferencial.py — manda a MESMA entrada a N implementações
e reporta onde o comportamento difere.

⚠ as implementações são SUAS (baixadas/compiladas no seu lab).
   nenhuma aponta para serviço de terceiro.
"""
import subprocess, sys, os, hashlib

IMPLS = [
    # (nome, comando)  ⚠ ajuste aos SEUS binários
    ("impl-A", ["./implA"]),
    ("impl-B", ["./implB"]),
]

CORPUS = [
    # ⚠ FRONTEIRAS — não entradas aleatórias (módulo 8)
    b"\x00" * 4,
    b"\x01" * 4,
    b"\xff" * 4,
    b"\x00\x04" + b"A" * 8,
    b"\x01\x00" + b"A" * 8,
    b"\xff\xff" + b"A" * 8,
]

def roda(cmd, entrada):
    try:
        p = subprocess.run(cmd, input=entrada, capture_output=True, timeout=5)
        return (p.returncode, hashlib.sha256(p.stdout).hexdigest()[:12])
    except Exception as e:
        return ("ERR", type(e).__name__)

print("═══ HARNESS DIFERENCIAL ═══")
print()
print(f"  implementações : {len(IMPLS)}")
print(f"  corpus         : {len(CORPUS)} entradas de FRONTEIRA")
print()
print(f"  {'#':<4} {'entrada':<20} " + " ".join(f"{n:<16}" for n, _ in IMPLS) + " diferem?")
print("  " + "-"*(4 + 20 + 16*len(IMPLS) + 12))

achados = 0
for i, ent in enumerate(CORPUS):
    resultados = []
    for nome, cmd in IMPLS:
        r = roda(cmd, ent)
        resultados.append(r)
    diferem = len(set(resultados)) > 1
    achados += diferem
    cols = " ".join(f"{str(r):<16}" for r in resultados)
    marca = "⚠ SIM" if diferem else "não"
    print(f"  {i:<4} {ent.hex()[:18]:<20} {cols} {marca}")

print()
print(f"  ⚠ entradas com comportamento DIFERENTE: {achados}/{len(CORPUS)}")
print()
print("═══ COMO LER O RESULTADO ═══")
print()
print("  ⚠ discrepância NÃO é bug por si (Pesquisa, módulo 7):")
print("     · pode ser implementação legítima diferente")
print("     · pode ser documentado na especificação")
print("     ⚠ e É BUG se for discordância sobre ONDE A MENSAGEM TERMINA")
print()
print("  ✓ e cada discrepância vira uma HIPÓTESE:")
print("     · as duas aceitam a mesma entrada")
print("     · e discordam sobre o resultado")
print("     → uma das duas viola a especificação")
print()
print("  ⚠ as implementações são SUAS. nenhum serviço de terceiro.")
PY

chmod +x harness-diferencial.py
echo "  (o harness está pronto — ajuste IMPLS ao SEU par)"
```

⚠ **O harness é o instrumento.** **E o corpus é a parte que importa:** **fronteiras, não aleatório.**
**É o módulo 8 aplicado ao diferencial.**

⚠ **E a leitura do resultado é o módulo 7 do Pesquisa:** **discrepância é candidato; discordância
sobre **framing** é bug.** **A distinção é o critério.**

**Produza `diferencial.md`:**

| Técnica | Escala | Por quê |
|---|---|---|
| Leitura | | |
| `grep` | | |
| Diferencial | | |

**Responda:**

1. **Por que o diferencial escala?**
2. **O que o corpus deve conter?** Por quê?
3. **Qual discrepância é bug?** E qual não é?
4. **O que o harness exige** das implementações? (Dica: o lab.)

---

## 10.4 Reportar a cada um

⚠ **A consequência administrativa do 0-day por ecossistema: **N achados, N responsáveis.****

| Situação | A quem reportar | O que esperar |
|---|---|---|
| Projeto A (já corrigiu) | ⚠ **Nada** — já está corrigido | — |
| Projeto B (tem o bug) | ⚠ **Ao mantenedor de B** | Crédito |
| Projeto C (tem o bug) | ⚠ **Ao mantenedor de C** | Crédito |
| Projeto D (tem o bug) | ⚠ **Ao mantenedor de D** | Crédito |
| ⚠ A especificação é ambígua | ⚠ **Ao dono da especificação** | — |

⚠ **A primeira linha é o que a maioria erra.** **Você não reporta ao projeto A** — **ele já
corrigiu.** **O achado está em B, C e D.**

⚠ **E a última linha é a mais interessante.** **Se a especificação é **ambígua**, o bug é da
especificação** — **e corrigir em B, C e D não resolve**: **o próximo implementador erra igual.**
**Você reporta ao dono do padrão** — **IETF, W3C, a empresa que mantém o formato.**

⚠ **A tabela do que fazer com N achados:**

| # | Ação | Por quê |
|---|---|---|
| 1 | **Reporte a cada um** | ⚠ Cada um é responsável pelo seu |
| 2 | **Não mencione os outros** | ⚠ Não exponha quem não corrigiu |
| 3 | Coordene prazos | Cada um tem o seu |
| 4 | ⚠ **Não publique antes** | Nenhum corrigiu |
| 5 | Crédito a todos | Cada um confirmou o seu |

⚠ **A linha 2 merece a explicação.** **Dizer ao B que "C e D também têm"** parece útil — **e é
divulgação de informação sobre sistemas de terceiros.** **Cada mantenedor precisa saber do **seu**,
e não dos outros.** **Você reporta em separado.**

⚠ **E a linha 4 é a que organiza o timing.** **Com N projetos, o prazo é o do mais lento** —
**porque publicar antes expõe quem não corrigiu.** **É a prática padrão da divulgação coordenada.**

⚠ **A regra escrita:**

> **N achados, N relatórios, N prazos.** **E você não publica até o último corrigir** — **ou até o
> prazo esgotar, avisando antes.**

```bash
cd ~/patch-lab/mod10

echo "═══ 6. reportar a cada um ═══"
echo
cat > reportar.md <<'EOF'
# Reportar a cada um

## A quem reportar
| Projeto | Tem o bug? | Reportar? |
|---|---|---|
| A (já corrigiu) | tinha | ⚠ **NÃO** |
| B | ✓ tem | ⚠ **SIM** |
| C | ✓ tem | ⚠ **SIM** |
| D | ✓ tem | ⚠ **SIM** |
| a especificação | ambígua? | ⚠ **ao dono do formato** |

## O que fazer com N achados
| # | Ação | Por quê |
|---|---|---|
| 1 | reporte a cada um | cada um é responsável pelo seu |
| 2 | ⚠ **NÃO mencione os outros** | não exponha quem não corrigiu |
| 3 | coordene prazos | cada um tem o seu |
| 4 | ⚠ não publique antes | nenhum corrigiu |
| 5 | crédito a todos | cada um confirmou |

## ⚠ por que não mencionar os outros
dizer ao B que "C e D também têm" parece útil —
e é divulgação de informação sobre sistemas de terceiros.
✓ cada mantenedor sabe do SEU. não dos outros.

## ⚠ e se a especificação é ambígua
o bug é da especificação.
corrigir em B, C e D não resolve: o próximo erra igual.
✓ reporte ao DONO do formato (IETF, W3C, a empresa).

## O timing
com N projetos, o prazo é o do MAIS LENTO.
e você publica avisando antes.
EOF

cat reportar.md
```

⚠ **A seção dos N relatórios é a consequência prática.** **E as duas regras são:** **não reporte a
quem já corrigiu** — **e não mencione os outros a cada um.**

⚠ **E a nota do dono da especificação é a mais profunda.** **Se o formato é ambíguo, o bug se
reproduz indefinidamente** — **e a correção que resolve de verdade é **na especificação**.**

**Produza `reportar.md`:**

| Projeto | Reportar? | Por quê |
|---|---|---|
| A (corrigiu) | | |
| B (tem) | | |
| Especificação | | |

**Responda:**

1. **Por que não reportar ao A?** Ele já corrigiu.
2. **Por que não mencionar os outros** a cada mantenedor?
3. **Quando o bug é da especificação?** O que fazer?
4. **Qual o prazo** com N projetos?

---

## 10.5 LAB — Variante por ecossistema

**Duração:** 75 min

### Passo 1 — Abstraia e liste (30 min)

```bash
cd ~/patch-lab/mod10

echo "═══ VARIANTE POR ECOSSISTEMA ═══"
echo
cat <<'EXPL'
  ── PARTE 1: o PADRÃO (do seu módulo 3) ──
     "[sem nomes]"

  ── PARTE 2: a PERGUNTA ──
     ⚠ "esta implementação [a pergunta]?"

  ── PARTE 3: as IMPLEMENTAÇÕES ──
     ⚠ liste pelo menos 4 que implementam o MESMO
        formato / protocolo / API

  ── PARTE 4: a LEITURA ──
     ⚠ para cada uma: ler e verificar
EOF

cat > caderno/PD-010.md <<'EOF'
# PD-010 — variante por ecossistema

**Data:** ____

## 1. O padrão (do módulo 3)
"[SEM nomes de variável]"

## 2. A pergunta
"esta implementação ______________________________________?"

## 3. O formato que liga
| Item | Valor |
|---|---|
| Formato / protocolo / API | |
| Especificação (RFC / doc) | |
| Ambígua? | |

## 4. As implementações
| # | Projeto | Linguagem | Lê o mesmo? | Valida? | CVE conhecido? |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |

## 5. A verificação (módulo 7 do Pesquisa — os cinco falsos positivos)
| # | Candidato | Chamador valida? | Outra camada? | Alcançável? | Spec permite? | Código morto? | Veredito |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |

## 6. A classificação
| # | Projeto | 1-day ou 0-day? | Por quê |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 7. A hipótese (módulo 6 do Pesquisa)
| Campo | Valor |
|---|---|
| Invariante | |
| Afirmação | |
| Observação | |
| **Falsificação** | |

## 8. O plano do teste diferencial
| Item | Valor |
|---|---|
| implementação A | |
| implementação B | |
| corpus (fronteiras) | |
| ⚠ autorização | implantações SUAS |
| o que a discrepância significaria | |

## 9. O reporte
| Projeto | Reportar? | Canal |
|---|---|---|
| | | |

## 10. O que NÃO foi verificado
⚠ mínimo 3
EOF

cat caderno/PD-010.md
```

Produza `abstracao.md`:

| Item | Valor |
|---|---|
| Padrão | |
| Pergunta | |
| Formato | |
| Implementações listadas | |

**Responda:**

1. **O padrão está sem nomes?**
2. **A pergunta é sobre o formato**, não sobre o código?
3. **Quantas implementações** você listou?
4. **A especificação é ambígua?** Como você sabe?

### Passo 2 — Verifique e classifique (30 min)

⚠ **A leitura de cada implementação. E a verificação dos cinco falsos positivos.**

```bash
cd ~/patch-lab/mod10

echo "═══ VERIFICANDO ═══"
echo
cat <<'EXPL'
  ── para cada implementação da sua lista ──

     1. ACHA o trecho que trata o campo
        ⚠ o mesmo ponto do padrão
     2. LÊ:
        · a validação existe?
        · vem ANTES?
        · cobre os dois lados (origem e destino)?
     3. ⚠ APLICA OS CINCO FALSOS POSITIVOS:
        · o chamador valida?
        · outra camada valida?
        · o caminho é alcançável?
        · a especificação permite?
        · é código morto?
     4. CLASSIFICA:
        · 1-day (o projeto sabe do padrão)
        · ⚠ 0-day (o projeto nunca soube)

  ⚠ e é a LEITURA que decide — não a semelhança com o padrão.
     "o padrão é comum" não significa "esta tem o bug".
EXPL

cat > verificacao.md <<'EOF'
# Verificação por implementação

## Implementação 1
| Item | Valor |
|---|---|
| Projeto | |
| Arquivo:linha | |
| Validação existe? | |
| Vem antes? | |
| Cobre os dois lados? | |

### Os cinco falsos positivos
| # | Falso positivo | Verificado? |
|---|---|---|
| 1 | o chamador valida | |
| 2 | outra camada | |
| 3 | inalcançável | |
| 4 | a spec permite | |
| 5 | código morto | |

**Veredito:** [ ] 0-day  [ ] 1-day  [ ] falso positivo

## Implementação 2
| Item | Valor |
|---|---|
| Projeto | |
| Arquivo:linha | |
| Validação existe? | |
| Vem antes? | |

**Veredito:** [ ] 0-day  [ ] 1-day  [ ] falso positivo

## Implementação 3
(mesma estrutura)

## Resumo
| # | Projeto | Veredito | Ação |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
EOF

cat verificacao.md
```

Produza `verificado.md`:

| # | Projeto | Valida? | Veredito |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. **Quantas você verificou** por leitura?
2. **Alguma tem o bug?** Com qual veredito?
3. **Algum falso positivo** apareceu? Qual dos cinco?
4. **Alguma é 0-day?** Por quê?

### Passo 3 — Reporte e registre (15 min)

Produza `plano-reporte.md`:

```markdown
# Plano de reporte

## Os achados
| # | Projeto | Veredito | Severidade estimada |
|---|---|---|---|
| 1 | | | |

## A quem reportar
| # | Projeto | Canal | Reportar? |
|---|---|---|---|
| 1 | | | |
| — | A (já corrigiu) | — | ⚠ **NÃO** |
| — | a especificação (se ambígua) | | |

## O timing
| Item | Valor |
|---|---|
| Prazos | |
| ⚠ Publicar antes? | **NÃO** |
| Crédito | a todos que confirmarem |

## O que cada relatório contém
| Seção | Presente? |
|---|---|
| componente e versão | |
| o ponto (arquivo:linha) | |
| o invariante | |
| o reproducer ou a evidência de leitura | |
| ⚠ o que não foi verificado | |
| a correção sugerida | |

## O que NÃO fazer
- [ ] não mencionar os outros projetos a cada mantenedor
- [ ] não reportar ao que já corrigiu
- [ ] não publicar antes do último prazo
- [ ] não testar contra instância de terceiro
```

**Produza `plano-reporte.md`:**

| Item | Valor |
|---|---|
| Achados | |
| Reportar a | |
| Prazo | |
| Publicar antes? | |

**Responda:**

1. **Quantos achados você tem?**
2. **A quem reportar?** E a quem **não**?
3. **Por que não publicar antes?**
4. **O que não mencionar** a cada mantenedor?

### Critérios de aceitação

- `0day.md` com a distinção **1-day vs. 0-day** por ecossistema.
- Você explicou **por que B tem o mesmo bug** sem ter copiado.
- Você identificou **o ecossistema mais produtivo**.
- `metodo.md` com os **quatro** passos.
- Você escreveu a **pergunta** derivada do padrão.
- Você explicou **por que se procura a pergunta** e não a linha.
- `diferencial.md` com as **três** técnicas e a escala de cada.
- Você explicou **o que o corpus deve conter**.
- Você explicou **qual discrepância é bug** e qual não é.
- `harness-diferencial.py` com o **corpus de fronteira** montado.
- `caderno/PD-010.md` com as **dez** seções.
- Você listou **pelo menos quatro** implementações.
- Você **verificou por leitura** pelo menos três.
- Você aplicou os **cinco falsos positivos** a um candidato.
- `verificado.md` com os **vereditos**.
- `reportar.md` com a resposta sobre **a quem reportar**.
- Você explicou **por que não mencionar os outros**.
- `plano-reporte.md` com o **timing** e o que não fazer.
- ⚠ **Nenhuma implementação de terceiro testada.** Apenas leitura e lab próprio.

---

## Avaliação

1. **Por que a variante por ecossistema vira 0-day?**
2. **Por que o projeto B tem o mesmo bug** sem ter copiado?
3. **O que liga os dois projetos?**
4. **Cite cinco ecossistemas** e por que rendem.
5. **Qual é o mais produtivo?** Por quê?
6. **Cite os quatro passos** do método.
7. **Qual exige abstração?** Por que é o mais importante?
8. **O que você procura** — a linha, ou a pergunta?
9. **Dê três exemplos** de padrão → pergunta.
10. **Por que a leitura é obrigatória** mesmo com padrão comum?
11. **Cite as três técnicas** de busca e a escala de cada.
12. **Por que o diferencial escala?**
13. **O que o corpus deve conter?** Por quê?
14. **Qual discrepância é bug?** E qual não é?
15. **O que o harness exige** das implementações?
16. **A quem reportar** quando o projeto já corrigiu?
17. **Por que não mencionar os outros** a cada mantenedor?
18. **Quando o bug é da especificação?** O que fazer?
19. **Qual o prazo** com N projetos? Por quê?
20. **O que o `HTTP Garden` provou** sobre essa técnica?

---

**Próximo:** [Módulo 11 — Projeto: do CVE ao achado](modulo-11.md)
