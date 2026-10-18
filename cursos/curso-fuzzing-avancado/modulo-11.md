# Módulo 11 — O Rendimento

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 10

---

## Objetivos

1. Entender por que **horas de campanha** é a métrica errada.
2. Medir o **rendimento** — o que cada hora produziu.
3. Reconhecer os **quatro eixos** de investimento e o retorno de cada.
4. Saber **quando parar** uma campanha.
5. Reportar o rendimento — não o esforço.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **"Rodei 72 horas" não é resultado.** **É custo.** **O resultado é o que sobrou depois da
> triagem** — **e é isso que se mede.**

⚠ **E é a mesma lição do Detecção e Evasão, com outro nome:** **lá, CPU é alugável e julgamento não;
aqui, horas de fuzzer são baratas e triagem não.**

⚠ **A tese:**

> **O rendimento é bugs triados por hora de analista.** **E quase sempre ele é dominado pela
> triagem, não pela campanha.**

⚠ **A tabela das três métricas, e o que cada uma engana:**

| Métrica | ⚠ Engana? |
|---|---|
| Horas de campanha | ⚠ **Sim — é custo** |
| Crashes brutos | ⚠ **Sim — é ruído** |
| ⚠ **Bugs triados / hora** | ⚠ **Não — é resultado** |

---

## 11.1 A conta

⚠ **O rendimento, decomposto. E ele é uma fração com o custo de analista no denominador.**

| Componente | O que é |
|---|---|
| **Numerador** | ⚠ **Bugs triados** |
| ⚠ **Denominador** | ⚠ **Horas de ANALISTA** |
| Não entra | ⚠ Horas de CPU |

⚠ **E a tabela do que consome as horas de analista:**

| Etapa | ⚠ Horas típicas |
|---|---|
| Escolher o alvo | 2 |
| Escrever o harness | ⚠ **8** |
| 📖 Construir o corpus | 4 |
| Rodar a campanha | ⚠ **0 — é automático** |
| ⚠ **Triar** | ⚠⚠ **16** |
| Minimizar e reportar | 6 |

⚠ **A linha 4 é o argumento do módulo.** **A campanha custa **zero horas de analista** — **e é a
única coisa que a maioria mede.**

⚠ **E a linha 5 é o gargalo:** **triar consome mais que todo o resto junto.**

⚠ **A regra escrita:**

> **A campanha é gratuita; o julgamento não.** **Por isso o rendimento se mede em bugs por hora de
> analista** — **e todo investimento que reduz triagem vale mais que qualquer ganho de velocidade.**

```bash
mkdir -p ~/fuzz-lab/mod11 && cd ~/fuzz-lab/mod11

echo "═══ 1. a conta ═══"
echo
cat > rendimento.md <<'EOF'
# A conta do rendimento

## A fração
| Componente | O que é |
|---|---|
| numerador | ⚠ BUGS TRIADOS |
| ⚠ denominador | ⚠ HORAS DE ANALISTA |
| não entra | ⚠ horas de CPU |

## O que consome as horas
| Etapa | Horas típicas |
|---|---|
| escolher o alvo | 2 |
| escrever o harness | ⚠ 8 |
| construir o corpus | 4 |
| RODAR a campanha | ⚠ **0 — é automático** |
| ⚠ TRIAR | ⚠⚠ **16** |
| minimizar e reportar | 6 |

## ⚠ a linha 4 é o argumento
a campanha custa ZERO horas de analista —
e é a ÚNICA coisa que a maioria mede.

## ⚠ e a linha 5 é o gargalo
triar consome mais que todo o resto JUNTO.

## ⚠ A REGRA
a campanha é GRATUITA; o julgamento NÃO.
por isso o rendimento se mede em bugs por hora de ANALISTA —
e todo investimento que reduz TRIAGEM
vale mais que qualquer ganho de VELOCIDADE.
EOF

cat rendimento.md

echo
echo "═══ 2. as três métricas ═══"
echo
cat <<'EXPL'
  ── O QUE A MAIORIA REPORTA ──
     "rodei 72 horas, 15 milhões de execuções, 340 crashes"
     ⚠ e nenhuma dessas três diz se valeu a pena.

  ── O QUE DIZ ──
     "2 bugs triados, 40 horas de analista"
     ✓ e o rendimento é 0,05 bug/hora.

  ── E A CONTA QUE DECIDE SE VALE ──
     ⚠ se o rendimento é 0,05 e você tem 10 h/semana,
        são 0,5 bug/semana.
     ✓ e aí a pergunta é: quanto vale um bug por quinzena?
EXPL
```

⚠ **As três métricas são o instrumento.** **E a tradução é direta:** **"rodei 72 horas" é custo;
"2 bugs, 40 horas de analista" é resultado.**

⚠ **E a conta final é a que decide:** **o rendimento se traduz em bugs por semana de analista** —
**e é o número que justifica ou não o investimento.**

**Produza `rendimento.md`:**

| Métrica | Engana? |
|---|---|
| Horas de campanha | |
| Crashes brutos | |
| Bugs triados/hora | |

**Responda:**

1. **Por que as horas de campanha são custo e não resultado?
2. **O que consome zero horas de analista?
3. **Qual etapa é o gargalo?
4. **O que o rendimento mede, exatamente?

---

## 11.2 Os quatro eixos

⚠ **Onde investir. E o retorno é medido, não suposto.**

| Eixo | Investimento | ⚠ Retorno |
|---|---|---|
| **Mais CPU** | Núcleos | ⚠ **Marginal** |
| ⚠ **Melhor corpus** | 4 h de analista | ⚠ **Alto** |
| ⚠ **Melhor oráculo** | 8 h | ⚠⚠ **O maior** |
| ⚠ **Triagem automática** | 6 h | ⚠ **Alto** |

⚠ **A linha 4 é a que o curso não detalhou e que vale muito.** **Você já escreveu os scripts de
dedup, triagem e minimização** — **e eles são o investimento de maior retorno por hora**, **porque
atacam o gargalo diretamente.**

⚠ **E a tabela do retorno, em ordem:**

| Eixo | Ganho esperado | ⚠ Horas |
|---|---|---|
| Oráculo | ⚠⚠ **10× mais bugs** | 8 |
| Triagem automática | ⚠ **5× mais rápido de triar** | 6 |
| Corpus | ⚠ 3× de cobertura | 4 |
| CPU | ⚠ 1,2× de crashes | ⚠ **0 de analista** |

⚠ **A última linha é a tentação, e ela é honesta:** **CPU é grátis em horas de analista** — **e por
isso parece o melhor investimento.** **Mas ela multiplica os crashes, e não os bugs** — **e o
gargalo está depois.**

⚠ **A regra escrita:**

> **Investir antes do gargalo amplifica o gargalo.** **Mais CPU produz mais crashes** — **e mais
> triagem.** **Antes de adicionar um núcleo, pergunte o que vai triar.**

```bash
cd ~/fuzz-lab/mod11

echo "═══ 3. os quatro eixos ═══"
echo
cat > eixos.md <<'EOF'
# Os quatro eixos

| Eixo | Investimento | Retorno |
|---|---|---|
| mais CPU | núcleos | ⚠ MARGINAL |
| ⚠ melhor corpus | 4 h | ⚠ ALTO |
| ⚠⚠ melhor ORÁCULO | 8 h | ⚠⚠ O MAIOR |
| ⚠ triagem AUTOMÁTICA | 6 h | ⚠ ALTO |

## O retorno, em ordem
| Eixo | Ganho | Horas |
|---|---|---|
| ⚠ ORÁCULO | ⚠⚠ 10× mais bugs | 8 |
| ⚠ triagem automática | ⚠ 5× mais rápido | 6 |
| corpus | ⚠ 3× de cobertura | 4 |
| CPU | ⚠ 1,2× de crashes | ⚠ **0 de analista** |

## ⚠ a última linha é a tentação
CPU é GRÁTIS em horas de analista —
e por isso PARECE o melhor investimento.
⚠ mas ela multiplica os CRASHES, e não os BUGS —
e o gargalo está DEPOIS.

## ⚠ A REGRA
investir ANTES do gargalo AMPLIFICA o gargalo.
mais CPU produz mais crashes — e mais TRIAGEM.
antes de adicionar um núcleo,
pergunte O QUE VAI TRIAR.
EOF

cat eixos.md

echo
echo "═══ 4. a calculadora de rendimento ═══"
echo
cat > rendimento.py <<'PY'
#!/usr/bin/env python3
"""
rendimento.py — calcula o RENDIMENTO de uma campanha.

⚠ DIDÁTICO. números do SEU cenário.
"""


def calcula(nome: str, bugs: int, horas_analista: float):
    rend = bugs / horas_analista if horas_analista else 0
    return nome, bugs, horas_analista, rend


def main():
    print("═══ RENDIMENTO DAS CAMPANHAS ═══")
    print()
    print("  ⚠ o que importa: bugs TRIADOS por hora de ANALISTA")
    print()

    cenarios = [
        # (nome, bugs triados, horas de analista)
        ("sem oráculo forte",   1,  40),
        ("com oráculo forte",   6,  46),
        ("com triagem auto",    6,  22),
        ("com corpus melhor",   9,  24),
        ("só mais CPU",         1,  60),
    ]

    print(f"  {'cenário':<24} {'bugs':<7} {'horas':<8} {'rendimento':<12} veredito")
    print("  " + "-"*72)

    for nome, bugs, horas in cenarios:
        _, b, h, r = calcula(nome, bugs, horas)
        if r >= 0.25:
            v = "✓ EXCELENTE"
        elif r >= 0.10:
            v = "✓ bom"
        elif r >= 0.03:
            v = "· aceitável"
        else:
            v = "⚠⚠ NÃO VALE"
        marca = "⚠ " if "CPU" in nome else "  "
        print(f"  {marca}{nome:<22} {b:<7} {h:<8} {r:<12.3f} {v}")

    print()
    print("  ═══ O QUE OS NÚMEROS MOSTRAM ═══")
    print("  · o ORÁCULO forte multiplica por 6 o rendimento")
    print("  · ⚠ a TRIAGEM automática quase o dobra de novo")
    print("  · ⚠ 'só mais CPU' mantém 1 bug e sobe as horas")
    print()
    print("  ✓ e a ordem de investimento sai dos números:")
    print("     1. ORÁCULO   2. TRIAGEM   3. CORPUS   4. CPU")
    print()
    print("  ⚠ e o veredito é aritmético — como no curso anterior.")


if __name__ == "__main__":
    main()
PY

chmod +x rendimento.py
python3 rendimento.py
```

⚠ **A calculadora é o instrumento.** **E o veredito é aritmético** — **como no Detecção e Evasão:**
**um rendimento abaixo de 0,03 é uma campanha que não se justifica.**

⚠ **E a linha "só mais CPU" é a mais educativa:** **mantém 1 bug e sobe as horas** — **porque
multiplicou a triagem sem multiplicar os achados.**

**Produza `eixos.md`:**

| Eixo | Retorno | Horas |
|---|---|---|
| Oráculo | | |
| CPU | | |
| Triagem automática | | |

**Responda:**

1. **Qual eixo tem o maior retorno?** Por quê?
2. **Por que CPU parece o melhor e não é?
3. **O que a linha "só mais CPU" mostra?
4. **Qual a ordem de investimento?

---

## 11.3 Quando parar

⚠ **A decisão de encerrar. E ela tem quatro critérios.**

| # | Critério | ⚠ Sinal |
|---|---|---|
| 1 | **Rendimento caiu** | ⚠ `cov` estável + sem crashes novos |
| 2 | **Orçamento de triagem estourou** | ⚠ Mais crashes que horas |
| 3 | **O alvo está saturado** | ⚠ "NEW" não aparece há horas |
| 4 | ⚠ **O bug foi achado** | ⚠ **Encerre e documente** |

⚠ **A linha 4 é a que ninguém executa.** **Achou o bug, e a campanha continua** — **porque parar
parece desperdício.** **E é o contrário:** **continuar gera crashes que você não vai triar** —
**e eles enterram o achado.**

⚠ **E a tabela do que fazer em cada caso:**

| Situação | Ação |
|---|---|
| Rendimento caiu | ⚠ **Mudar de eixo** (corpus, oráculo) |
| Triagem estourou | ⚠ **Parar até triar o que tem** |
| Saturado | Trocar de alvo |
| ⚠ **Achou o bug** | ⚠ **Encerrar e documentar** |

⚠ **A linha 2 é a mais prática.** **Quando a pasta `crashes/` cresce mais rápido que você tria, a
campanha está produzindo dívida** — **e a dívida precisa ser paga antes de continuar.**

⚠ **A regra escrita:**

> **Uma campanha que continua depois do achado não é diligência; é ruído.** **Ela enterra o bug num
> monte de crashes que ninguém vai olhar** — **e o relatório fica pior, não melhor.**

```bash
cd ~/fuzz-lab/mod11

echo "═══ 5. quando parar ═══"
echo
cat > parar.md <<'EOF'
# Quando parar

| # | Critério | Sinal |
|---|---|---|
| 1 | RENDIMENTO caiu | `cov` estável + sem crashes novos |
| 2 | ORÇAMENTO de triagem estourou | mais crashes que horas |
| 3 | o alvo SATUROU | "NEW" não aparece há horas |
| 4 | ⚠ ACHOU o bug | ⚠ ENCERRE e documente |

## ⚠ a linha 4 é a que ninguém executa
achou o bug, e a campanha CONTINUA —
porque parar PARECE desperdício.
✓ e é o contrário:
   continuar gera crashes que você NÃO VAI TRIAR,
   e eles ENTERRAM o achado.

## O que fazer em cada caso
| Situação | Ação |
|---|---|
| rendimento caiu | ⚠ MUDAR DE EIXO (corpus, oráculo) |
| triagem estourou | ⚠ PARAR até triar o que tem |
| saturado | trocar de alvo |
| ⚠ ACHOU o bug | ⚠ ENCERRAR e documentar |

## ⚠ a linha 2 é a mais prática
quando a pasta crashes/ cresce mais rápido que você tria,
a campanha está produzindo DÍVIDA —
e a dívida precisa ser paga ANTES de continuar.

## ⚠ A REGRA
uma campanha que continua DEPOIS do achado
não é diligência; é RUÍDO.
ela enterra o bug num monte de crashes que NINGUÉM VAI OLHAR —
e o relatório fica PIOR, não melhor.
EOF

cat parar.md
```

⚠ **A tabela de quando parar é o instrumento.** **E a linha 4 é a mais contraintuitiva** — **e a
mais importante.**

⚠ **E a nota da dívida de triagem fecha o curso:** **uma campanha que produz mais do que você tria
está acumulando passivo** — **e passivo enterra achado.**

**Produza `parar.md`:**

| Situação | Ação |
|---|---|
| Rendimento caiu | |
| Triagem estourou | |
| Achou o bug | |

**Responda:**

1. **Por que continuar depois do achado é ruim?
2. **O que fazer quando a triagem estoura?
3. **O que significa "rendimento caiu"?** O que fazer?
4. **Por que o relatório fica pior com mais crashes?

---

## 11.4 LAB — Meça o rendimento

**Duração:** 75 min

### Passo 1 — Meça a sua campanha (40 min)

⚠ **As horas de analista, contadas — não estimadas.**

```bash
cd ~/fuzz-lab/mod11

echo "═══ MEDINDO O SEU RENDIMENTO ═══"
echo
cat <<'EXPL'
  ── CONTE AS HORAS, ETAPA POR ETAPA ──
     (⚠ e seja honesto: a triagem leva mais do que parece)

     1. escolher o alvo        ____ h
     2. escrever o harness     ____ h
     3. construir o corpus     ____ h
     4. rodar a campanha       ⚠ 0 h (é automático)
     5. TRIAR                  ____ h
     6. minimizar e reportar   ____ h
     ─────────────────────────────
     ⚠ TOTAL de ANALISTA       ____ h

  ── E O NUMERADOR ──
     bugs TRIADOS: ____

  ── O RENDIMENTO ──
     ⚠ bugs / horas = ____
EXPL

cat > evidencia/tempo.md 2>/dev/null || mkdir -p evidencia

cat > evidencia/tempo.md <<'EOF'
# O tempo gasto

| Etapa | Horas |
|---|---|
| escolher o alvo | |
| escrever o harness | |
| construir o corpus | |
| rodar a campanha | ⚠ 0 |
| TRIAR | |
| minimizar e reportar | |
| **TOTAL** | |

## O rendimento
| Item | Valor |
|---|---|
| bugs triados | |
| ⚠ total de analista | |
| ⚠ RENDIMENTO | |

## Onde o tempo foi
| Etapa | % do total |
|---|---|
| harness | |
| ⚠ TRIAGEM | |
| resto | |
EOF

echo "  ⚠ o registro do tempo está pronto"
echo
echo "═══ E A CALCULADORA, COM OS SEUS NÚMEROS ═══"
python3 rendimento.py 2>&1 | head -20
```

⚠ **O registro de tempo é o instrumento.** **E a contagem honesta é o requisito:** **a triagem leva
mais do que parece** — **e é ela que domina.**

⚠ **E a comparação com a calculadora é direta:** **o seu rendimento está no mesmo patamar?** **E o
que o melhoraria?**

**Produza `tempo-medido.md`:**

| Etapa | Horas |
|---|---|
| Harness | |
| Triagem | |
| Total | |
| **Rendimento** | |

**Responda:**

1. **Quantas horas você gastou?** Onde foi a maioria?
2. **Qual o rendimento?** Está acima de 0,03?
3. **A triagem dominou?** Como esperado?
4. **O que o melhoraria?

### Passo 2 — Escolha o próximo investimento (35 min)

Produza `caderno/PD-011.md`:

```markdown
# PD-011 — o rendimento

**Data:** ____

## 1. A campanha
| Item | Valor |
|---|---|
| alvo | |
| horas de CPU | |
| ⚠ horas de ANALISTA | |
| bugs triados | |

## 2. O tempo, por etapa
| Etapa | Horas | % |
|---|---|---|
| escolher o alvo | | |
| harness | | |
| corpus | | |
| rodar | ⚠ 0 | |
| ⚠ TRIAR | | |
| reportar | | |

## 3. ⚠ O rendimento
| Item | Valor |
|---|---|
| bugs / horas de analista | |
| veredito | excelente / bom / aceitável / não vale |

## 4. Os quatro eixos
| Eixo | Já investi? | ⚠ Retorno esperado |
|---|---|---|
| mais CPU | | ⚠ marginal |
| corpus | | alto |
| ⚠ oráculo | | ⚠⚠ o maior |
| ⚠ triagem automática | | alto |

## 5. ⚠ O próximo investimento
| Item | Valor |
|---|---|
| qual eixo | |
| horas | |
| ⚠ ganho esperado | |
| por quê | |

## 6. Quando parar
| Critério | Presente? |
|---|---|
| rendimento caiu | |
| triagem estourou | |
| alvo saturado | |
| ⚠ achou o bug | |

## 7. ⚠ O que eu NÃO vou fazer
- [ ] não vou adicionar CPU antes de resolver a triagem
- [ ] não vou continuar depois do achado
- [ ] não vou reportar horas em vez de resultado

## 8. O que NÃO foi verificado
⚠ mínimo 3
```

Produza `relatorio-rendimento.md`:

```markdown
# Relatório — o rendimento

## 1. A campanha
| Item | Valor |
|---|---|
| alvo | |
| horas de CPU | |
| ⚠ horas de analista | |
| bugs triados | |

## 2. A decomposição do tempo
| Etapa | Horas |
|---|---|
| | |

## 3. ⚠ O rendimento
| Item | Valor |
|---|---|
| bugs / hora de analista | |
| veredito | |

## 4. A evidência
```
a saída da campanha
```

## 5. O próximo investimento
| Eixo | Ganho esperado | Horas |
|---|---|---|
| | | |

## 6. ⚠ O que o rendimento NÃO diz
| Item | Por quê |
|---|---|
| a QUALIDADE do bug | ⚠ um bug crítico vale mais |
| o valor para o produto | contexto |
| ⚠ se outro alvo renderia mais | não foi testado |

## 7. ⚠ O que eu NÃO fiz
- [ ] não reportei horas de CPU como resultado
- [ ] não continuei a campanha depois do achado
- [ ] não fuzzei pela rede

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O próximo passo
| # | Ação | Prioridade |
```

**Produza `relatorio-rendimento.md`:**

| Item | Valor |
|---|---|
| Rendimento | |
| Veredito | |
| Próximo investimento | |
| O que não diz | |

**Responda:**

1. **Qual o seu rendimento?** Que veredito ele recebe?
2. **Qual o próximo investimento?** Por quê?
3. **O que o rendimento NÃO diz?** (Dica: a qualidade.)
4. **Você reportaria horas como resultado?

### Critérios de aceitação

- `rendimento.md` com a **fração** e a exclusão das horas de CPU.
- Você explicou **por que a campanha custa zero horas de analista**.
- Você explicou **qual etapa é o gargalo**.
- Você traduziu as **três métricas** em "custo" ou "resultado".
- `eixos.md` com os **quatro** eixos e o retorno de cada.
- Você explicou **qual é o maior retorno** (o oráculo).
- Você explicou **por que CPU parece o melhor e não é**.
- `rendimento.py` rodado, com os cinco cenários.
- Você explicou **o que a linha "só mais CPU" mostra**.
- Você escreveu **a ordem de investimento**.
- `parar.md` com os **quatro** critérios.
- Você explicou **por que continuar depois do achado é ruim**.
- Você explicou **o que é dívida de triagem**.
- As **horas de analista contadas**, etapa por etapa.
- Você calculou **o seu rendimento** e deu o veredito.
- Você identificou **a etapa que dominou**.
- Você escolheu **o próximo investimento** com justificativa.
- Você explicou **o que o rendimento NÃO diz**.
- `caderno/PD-011.md` com as **oito** seções.
- `relatorio-rendimento.md` com as **nove** seções.
- ⚠ **Nenhum relatório que use horas de CPU como resultado.**

---

## Avaliação

1. **Por que "rodei 72 horas" não é resultado?
2. **O que o rendimento mede?** Qual a fração?
3. **Por que as horas de CPU não entram no denominador?
4. **Qual etapa custa zero horas de analista?
5. **Qual etapa é o gargalo?
6. **Cite as três métricas** e o que cada uma engana.
7. **Cite os quatro eixos de investimento.
8. **Qual tem o maior retorno?** Por quê?
9. **Por que CPU parece o melhor investimento?
10. **O que mais CPU multiplica junto?
11. **Qual a ordem de investimento?** Por quê?
12. **Cite os quatro critérios de parada.
13. **Por que continuar depois do achado é ruim?
14. **O que a campanha produz quando cresce mais que a triagem?
15. **O que é dívida de triagem?
16. **O que fazer quando a triagem estoura?
17. **O que fazer quando o rendimento cai?
18. **O que o rendimento NÃO diz?
19. **Por que um bug crítico vale mais que dez menores?
20. **O que reportar em vez de horas?

---

**Próximo:** [Módulo 12 — Projeto: do fuzz ao reporte](modulo-12.md)
