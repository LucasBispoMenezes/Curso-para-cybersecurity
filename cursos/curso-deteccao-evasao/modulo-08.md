# Módulo 8 — O Ciclo Purple

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Entender **por que uma regra apodrece** — e o que a mantém viva.
2. Conhecer as **cinco fases** do ciclo.
3. Rodar o ciclo **completo**, no lab.
4. **Medir o ganho** de cada volta.
5. Saber quando **parar** — e quando a regra deve ser aposentada.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Uma regra escrita uma vez é uma regra que expira.** **Não porque está errada — porque o
> ambiente muda, e ela mede o ambiente de ontem.**

⚠ **E as três coisas que mudam, sempre:**

| O que muda | ⚠ Efeito na regra |
|---|---|
| **O tráfego legítimo** | ⚠ **O FP muda** |
| **O produto** (versão nova) | ⚠ A forma muda |
| ⚠ **O adversário** | ⚠ **A evasão muda** |

⚠ **A tese:**

> **O ciclo não é uma cerimônia; é a manutenção.** **E ele é o único mecanismo que mantém a taxa
> conhecida** — **porque sem medir de novo, você tem a taxa de antes.**

⚠ **A tabela do que o ciclo entrega, por volta:**

| Volta | O que se ganha |
|---|---|
| 1ª | A regra existe, com taxa medida |
| 2ª | ⚠ **Uma evasão é coberta** |
| 3ª | ⚠ **O FP é reduzido** |
| ⚠ 4ª | ⚠ **Uma nova família, ou uma regra aposentada** |

---

## 8.1 As cinco fases

⚠ **O ciclo, e ele é o mesmo do módulo 10 do HTTP Smuggling — medido.**

| # | Fase | O que faz |
|---|---|---|
| 1 | **Reproduzir o ataque** | ⚠ O do lab, com a variante |
| 2 | **Medir a detecção** | O que a regra atual pega |
| 3 | ⚠ **Evasar** | ⚠ **O atacante muda uma coisa** |
| 4 | **Medir de novo** | ⚠ **A regra pegou?** |
| 5 | **Ajustar ou aposentar** | ⚠ **E registrar as duas taxas** |

⚠ **A fase 3 é a que define o ciclo.** **Ela não é "tentar mais forte"** — **é mudar **uma**
variável, e ver o que muda.** **É o método controlado do Patch Diffing, aplicado à regra.**

⚠ **E a fase 5 tem duas saídas, e a segunda é legítima.** **Ajustar a regra — ou **aposentá-la**,
quando o custo passou do orçamento.** **Aposentar é resultado, não fracasso.**

⚠ **A tabela do que registrar, por volta:**

| Campo | Por quê |
|---|---|
| A evasão testada | ⚠ **O experimento** |
| A regra antes | A taxa |
| ⚠ **A regra depois** | ⚠ **O ganho** |
| ⚠ **O FP depois** | ⚠ **O custo do ganho** |
| O veredito | Manter, ajustar, ou aposentar |

⚠ **A regra escrita:**

> **Cada ganho de detecção tem um custo de FP.** **E o ciclo existe para que você saiba os dois.**
> **Um ajuste que dobra a detecção e quadruplica o FP não é um ganho — é uma troca.**

```bash
mkdir -p ~/detect-lab/mod08 && cd ~/detect-lab/mod08

echo "═══ 1. as cinco fases ═══"
echo
cat > ciclo.md <<'EOF'
# As cinco fases

| # | Fase | O que faz |
|---|---|---|
| 1 | REPRODUZIR o ataque | o do lab, com a variante |
| 2 | MEDIR a detecção | o que a regra atual pega |
| 3 | ⚠ EVASAR | ⚠ o atacante muda UMA coisa |
| 4 | MEDIR de novo | ⚠ a regra pegou? |
| 5 | AJUSTAR ou APOSENTAR | ⚠ e registrar as DUAS taxas |

## ⚠ a fase 3 define o ciclo
não é "tentar mais forte".
é mudar UMA variável, e ver o que muda.
✓ é o método CONTROLADO do Patch Diffing,
   aplicado à REGRA.

## ⚠ e a fase 5 tem DUAS saídas
ajustar a regra —
ou ⚠ APOSENTAR, quando o custo passou do orçamento.
✓ aposentar é RESULTADO, não fracasso.

## O que registrar, por volta
| Campo | Por quê |
|---|---|
| a evasão testada | ⚠ o EXPERIMENTO |
| a regra antes | a taxa |
| ⚠ a regra depois | ⚠ o GANHO |
| ⚠ o FP depois | ⚠ o CUSTO do ganho |
| o veredito | manter, ajustar ou aposentar |

## ⚠ A REGRA
cada ganho de detecção tem um CUSTO de FP.
e o ciclo existe para que você saiba OS DOIS.
⚠ um ajuste que DOBRA a detecção e QUADRUPLICA o FP
   não é um ganho — é uma TROCA.
EOF

cat ciclo.md

echo
echo "═══ 2. por que a regra apodrece ═══"
echo
cat <<'EXPL'
  ── AS TRÊS MUDANÇAS ──

     1. O TRÁFEGO LEGÍTIMO MUDA
        · um cliente novo
        · um recurso novo
        · ⚠ e o FP de ontem não é o de hoje

     2. O PRODUTO MUDA
        · versão nova
        · ⚠ a forma que ele aceita muda
        · e a normalização muda com ela (módulo 4)

     3. ⚠ O ADVERSÁRIO MUDA
        · uma evasão nova
        · ⚠ e a assinatura vira um retrato antigo

  ── E NENHUMA DAS TRÊS AVISA ──
     ⚠ a regra continua "funcionando".
     ela só passou a medir outro ambiente.
     ✓ e sem medir de novo, você não sabe.
EXPL
```

⚠ **As três mudanças são o argumento do ciclo.** **E a nota final é a mais importante:** **nenhuma
delas avisa** — **a regra continua parecendo boa.**

⚠ **E a distinção "troca, não ganho" é o critério da fase 5.**

**Produza `ciclo.md`:**

| # | Fase | O que faz |
|---|---|---|
| 1 | | |
| 3 | | |
| 5 | | |

**Responda:**

1. **Qual fase define o ciclo?** Por que ela é controlada?
2. **Quais são as duas saídas da fase 5?
3. **Cite as três mudanças** que apodrecem a regra.
4. **Por que nenhuma avisa?

---

## 8.2 O experimento controlado

⚠ **A evasão **é** o experimento. E ele muda **uma** coisa.**

| Volta | O que mudar | O que medir |
|---|---|---|
| 1 | ⚠ **A codificação** | Casa? |
| 2 | **O case** | Casa? |
| 3 | ⚠ **O aninhamento** | Casa? |
| 4 | ⚠ **A ordem dos headers** | Casa? |
| 5 | **O delimitador** | Casa? |

⚠ **A tabela é a mesma do módulo 4, agora em **sequência** — **uma por volta.** **E cada volta mede
o ganho e o custo.**

⚠ **A tabela do que a primeira volta tipicamente revela:**

| Regra | Volta 1: encoding | ⚠ Veredito |
|---|---|---|
| Regex literal | ⚠ **Não casa** | ⚠ Ajustar |
| Com uma decodificação | Casa 1× | Ganho |
| ⚠ **Alinhada (módulo 4)** | Casa 1× e 2× | ⚠ **Melhor ganho** |

⚠ **A terceira linha é o resultado do módulo 4.** **A regra alinhada casa as duas codificações** —
**porque ela imita a transformação.**

⚠ **E o custo do ganho aparece no FP.** **Uma regra que decodifica mais casa mais ataques e também
mais tráfego legítimo** — **e é o que o módulo 6 mede.**

⚠ **A regra escrita:**

> **Toda volta troca FN por FP.** **E o ciclo serve para que a troca seja **escolhida**, não
> descoberta em produção.**

```bash
cd ~/detect-lab/mod08

echo "═══ 3. o experimento controlado ═══"
echo
cat > experimento.md <<'EOF'
# O experimento controlado

| Volta | O que mudar | O que medir |
|---|---|---|
| 1 | ⚠ A CODIFICAÇÃO | casa? |
| 2 | o CASE | casa? |
| 3 | ⚠ o ANINHAMENTO | casa? |
| 4 | ⚠ a ORDEM dos headers | casa? |
| 5 | o DELIMITADOR | casa? |

## O que a 1ª volta revela
| Regra | encoding 1× | veredito |
|---|---|---|
| regex LITERAL | ⚠ não casa | ⚠ ajustar |
| com UMA decodificação | casa | ganho |
| ⚠ ALINHADA (módulo 4) | ⚠ casa 1× E 2× | ⚠ MELHOR ganho |

## ⚠ o custo do ganho
uma regra que decodifica MAIS casa mais ATAQUES —
e também mais TRÁFEGO LEGÍTIMO.
✓ é o que o módulo 6 mede.

## ⚠ A REGRA
toda volta TROCA FN por FP.
e o ciclo serve para que a troca seja ESCOLHIDA —
não descoberta em PRODUÇÃO.
EOF

cat experimento.md
```

⚠ **O experimento controlado é o instrumento.** **E a nota da troca é o critério:** **o ciclo não
elimina o trade-off; ele o torna consciente.**

⚠ **E a linha "alinhada" é o resultado concreto do módulo 4** — **com o custo que o módulo 6
mede.**

**Produza `experimento.md`:**

| Volta | O que mudar |
|---|---|
| 1 | |
| 3 | |
| 5 | |

**Responda:**

1. **Por que a evasão é um experimento controlado?
2. **O que a primeira volta revela** sobre a regra literal?
3. **Por que a regra alinhada é o melhor ganho?
4. **Qual o custo do ganho?** Onde ele aparece?

---

## 8.3 Quando aposentar

⚠ **A fase 5 tem a saída que ninguém usa: **aposentar a regra.**

| Situação | Veredito |
|---|---|
| Detecta muito, FP baixo | ✓ Manter e monitorar |
| Detecta muito, FP alto | ⚠ **Ajustar, ou trocar de família** |
| ⚠ **Detecta pouco, FP alto** | ⚠⚠ **APOSENTAR** |
| Não detecta, FP zero | ⚠ Inútil — mas barata |

⚠ **A terceira linha é a decisão que ninguém toma.** **Uma regra que quase não pega e enche o
orçamento está **consumindo** o tempo que outra usaria** — **e mantê-la é o custo de oportunidade
puro.**

⚠ **A tabela da aposentadoria, e o que fazer com o registro:**

| Item | Por quê |
|---|---|
| **A regra aposentada** | ⚠ **Para não reescrevê-la** |
| ⚠ **A taxa que ela tinha** | ⚠ **Para comparar depois** |
| O motivo | Custo, ou ineficiência |
| ⚠ **O que ela deixou de pegar** | ⚠ **A lacuna declarada** |

⚠ **A última linha é o que liga ao módulo 7.** **Aposentar uma regra cria uma **lacuna** — **e ela
entra no inventário de lacunas, junto com as de instrumentação.**

⚠ **A regra escrita:**

> **Aposentar é uma decisão de engenharia.** **E ela exige o mesmo rigor que escrever:** **o motivo,
> a taxa, e a lacuna que ela deixa.**

```bash
cd ~/detect-lab/mod08

echo "═══ 4. quando aposentar ═══"
echo
cat > aposentar.md <<'EOF'
# Quando aposentar

| Situação | Veredito |
|---|---|
| detecta muito, FP baixo | ✓ manter e monitorar |
| detecta muito, FP alto | ⚠ ajustar, ou TROCAR DE FAMÍLIA |
| ⚠ detecta pouco, FP alto | ⚠⚠ APOSENTAR |
| não detecta, FP zero | ⚠ inútil — mas BARATA |

## ⚠ a terceira linha é a decisão que ninguém toma
uma regra que quase não pega e enche o orçamento
está CONSUMINDO o tempo que outra usaria.
✓ mantê-la é CUSTO DE OPORTUNIDADE PURO.

## O registro da aposentadoria
| Item | Por quê |
|---|---|
| a regra aposentada | ⚠ para NÃO REESCREVÊ-LA |
| ⚠ a taxa que ela tinha | ⚠ para COMPARAR depois |
| o motivo | custo, ou ineficiência |
| ⚠ o que ela deixou de pegar | ⚠ a LACUNA declarada |

## ⚠ a última linha liga ao módulo 7
aposentar cria uma LACUNA —
e ela entra no inventário, junto com as de INSTRUMENTAÇÃO.

## ⚠ A REGRA
aposentar é uma decisão de ENGENHARIA.
exige o mesmo rigor que escrever:
o MOTIVO, a TAXA, e a LACUNA que ela deixa.
EOF

cat aposentar.md
```

⚠ **A tabela do veredito é o instrumento.** **E a linha "detecta pouco, FP alto" é a que ninguém
enfrenta** — **porque aposentar parece desistência.**

⚠ **E o registro da lacuna é o que evita o ciclo vicioso:** **reescrever a mesma regra seis meses
depois, com a mesma taxa.**

**Produza `aposentar.md`:**

| Situação | Veredito |
|---|---|
| Detecta muito, FP baixo | |
| Detecta pouco, FP alto | |

**Responda:**

1. **Qual situação exige aposentar?
2. **Por que ninguém toma essa decisão?
3. **O que registrar ao aposentar?** Cite quatro.
4. **Como a aposentadoria se liga ao módulo 7?

---

## 8.4 LAB — O ciclo completo

**Duração:** 150 min

### Passo 1 — Rode a primeira volta (50 min)

⚠ **O ciclo, com a regra do módulo 3 ou 4.**

```bash
cd ~/detect-lab/mod08

echo "═══ A PRIMEIRA VOLTA ═══"
echo
cat <<'EXPL'
  ── O PROCEDIMENTO ──

     FASE 1: reproduza o ataque (o do módulo 1)
     FASE 2: rode a regra e meça a DETECÇÃO
     FASE 3: ⚠ EVASE — mude UMA coisa
     FASE 4: rode a regra de novo
     FASE 5: ⚠ ajuste, ou aposente

  ── E REGISTRE AS DUAS TAXAS ──
     · antes do ajuste
     · depois do ajuste
     ✓ e o FP das duas
EXPL

cat > caderno/PD-008.md <<'EOF'
# PD-008 — o ciclo purple

**Data:** ____
**Volta:** ____

## 1. A regra
| Item | Valor |
|---|---|
| id | |
| família | |
| versão atual | |

## 2. FASE 1 — o ataque
| Item | Valor |
|---|---|
| variante | |
| como reproduzo | |

## 3. FASE 2 — a medição (ANTES)
| Métrica | Valor |
|---|---|
| ataques testados | |
| ⚠ pegos | |
| detecção | |
| FP (módulo 6) | |
| ⚠ precisão | |

## 4. ⚠ FASE 3 — a evasão
| Item | Valor |
|---|---|
| o que mudei | ⚠ UMA coisa |
| por quê | |

## 5. FASE 4 — a medição (DEPOIS da evasão)
| Métrica | Valor |
|---|---|
| ⚠ ainda pega? | |
| o que deixou de pegar | |

## 6. FASE 5 — o ajuste
| Item | Valor |
|---|---|
| ajuste feito | |
| ⚠ Δ detecção | |
| ⚠ Δ FP | |
| veredito | manter / ajustar / **aposentar** |

## 7. ⚠ O que o ajuste CUSTOU
| Item | Valor |
|---|---|
| a troca foi | ganho / troca |
| por quê | |

## 8. A lacuna
| Item | Valor |
|---|---|
| o que a regra NÃO pega | |
| é lacuna de | detecção / instrumentação |

## 9. ⚠ O que eu NÃO fiz
- [ ] não testei fora de 127.0.0.1
- [ ] não rodei tráfego de outro ambiente
- [ ] não publiquei nada

## 10. O que NÃO foi verificado
⚠ mínimo 3
EOF

echo "  ⚠ a ficha PD-008 criada"
head -12 caderno/PD-008.md
```

⚠ **A ficha registra as duas taxas — antes e depois.** **E a seção 7 é o critério:** **a troca foi
ganho ou troca?**

⚠ **E a seção 8 fecha o ciclo:** **toda regra deixa uma lacuna** — **e ela se classifica.**

**Produza `volta1.md`:**

| Métrica | Antes | Depois |
|---|---|---|
| Detecção | | |
| FP | | |
| Veredito | | |

**Responda:**

1. **A evasão derrubou a regra?
2. **O ajuste foi ganho ou troca?** Por quê?
3. **Qual a lacuna que ficou?
4. **O veredito é manter, ajustar ou aposentar?

### Passo 2 — Rode a segunda volta (55 min)

⚠ **E desta vez, mude **outra** coisa.**

```bash
cd ~/detect-lab/mod08

echo "═══ A SEGUNDA VOLTA ═══"
echo
cat <<'EXPL'
  ── O QUE MUDA NA SEGUNDA VOLTA ──

     volta 1: evasão por CODIFICAÇÃO
     volta 2: evasão por CASE     ← ⚠ outro eixo
     volta 3: ANINHAMENTO
     volta 4: ORDEM dos headers

  ⚠ e cada volta mede o GANHO MARGINAL.
     · a segunda volta rende menos que a primeira?
     ✓ então você está perto do limite.
     · ⚠ e rende ZERO três voltas seguidas?
     ✓ a regra chegou ao máximo — ou é a família errada.
EXPL

cat > volta.py <<'PY'
#!/usr/bin/env python3
"""
volta.py — registra uma volta do ciclo e calcula o GANHO MARGINAL.

⚠ DIDÁTICO. números do SEU experimento.
"""
VOLTAS = [
    # (volta, detecção antes, detecção depois, FP depois, veredito)
    (1, 0.60, 0.85, 0.02, "ajustar"),
    (2, 0.85, 0.90, 0.03, "ajustar"),
    (3, 0.90, 0.90, 0.03, "⚠ platô"),
    (4, 0.90, 0.90, 0.03, "⚠ platô"),
]


def main():
    print("═══ O CICLO, VOLTA A VOLTA ═══")
    print()
    print(f"  {'volta':<7} {'antes':<8} {'depois':<8} {'Δ':<8} {'FP':<8} {'veredito'}")
    print("  " + "-"*56)

    platô = 0
    for v, a, d, fp, ver in VOLTAS:
        delta = d - a
        if delta < 0.01:
            platô += 1
        else:
            platô = 0
        marca = "⚠ " if delta < 0.01 else "  "
        print(f"  {v:<7} {a:<8.0%} {d:<8.0%} {marca}{delta:<6.0%} {fp:<8.0%} {ver}")

    print()
    print("  ═══ COMO LER ═══")
    print("  · o Δ cai a cada volta → ✓ você está perto do limite")
    print("  · ⚠ Δ = 0 por 2+ voltas → a regra CHEGOU ao máximo")
    print("  · ⚠ e o FP NÃO caiu junto → o ganho não valeu")
    print()
    print("  ⚠ se o Δ é zero e o FP não cai,")
    print("     a resposta NÃO é ajustar mais — é MUDAR DE FAMÍLIA.")
    print("     ✓ ou APOSENTAR, se nem a outra família render.")


if __name__ == "__main__":
    main()
PY

chmod +x volta.py
python3 volta.py
```

⚠ **O ganho marginal é o instrumento.** **E ele diz quando parar:** **quando Δ cai a zero, ajustar
mais é trabalho sem retorno.**

⚠ **E a saída é a do módulo 3:** **mudar de família** — **porque o limite não é da regra, é da
abordagem.**

**Produza `volta2.md`:**

| Volta | Δ | FP | Veredito |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. **O ganho caiu a cada volta?
2. **Em qual volta veio o platô?
3. **O FP caiu junto?** Se não, o ganho valeu?
4. **Se o Δ é zero, o que fazer?** (Dica: não é ajustar mais.)

### Passo 3 — Documente o ciclo (45 min)

Produza `relatorio-ciclo.md`:

```markdown
# Relatório — o ciclo purple

## 1. A regra e a sua história
| Volta | Detecção | FP | Ajuste | Δ |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## 2. As evasões testadas
| Volta | Eixo da evasão | Derrubou? |
|---|---|---|
| | | |

## 3. ⚠ O ganho marginal
| Volta | Δ detecção | Δ FP | ⚠ ganho ou troca |
|---|---|---|---|
| | | | |

## 4. O platô
| Item | Valor |
|---|---|
| veio na volta | |
| por quê | |
| ⚠ o que fazer | |

## 5. O veredito final
| Item | Valor |
|---|---|
| manter / ajustar / aposentar | |
| por quê | |

## 6. ⚠ A lacuna declarada
| Item | Valor |
|---|---|
| o que a regra NÃO pega | |
| é lacuna de | detecção / instrumentação |
| ⚠ quem cobre | |

## 7. As regras aposentadas
| Regra | Taxa que tinha | Motivo | ⚠ Lacuna deixada |
|---|---|---|---|
| | | | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não testei fora de 127.0.0.1
- [ ] não rodei tráfego de outro ambiente
- [ ] não copiei regra sem medir
- [ ] não publiquei nada

## 9. O que NÃO foi verificado
⚠ mínimo 3

## 10. O que isso destrava
| # | Próxima volta | Prioridade |
```

**Produza `relatorio-ciclo.md`:**

| Item | Valor |
|---|---|
| Platô na volta | |
| Veredito | |
| Lacuna | |
| Regras aposentadas | |

**Responda:**

1. **Em qual volta veio o platô?** O que isso significa?
2. **Qual o veredito final?** Manter, ajustar ou aposentar?
3. **A lacuna está classificada?
4. **Alguma regra foi aposentada?** Com que registro?

### Critérios de aceitação

- `ciclo.md` com as **cinco** fases e as **duas** saídas da fase 5.
- Você explicou **por que a fase 3 é controlada**.
- Você explicou **por que aposentar é resultado**.
- Você citou **as três mudanças** que apodrecem a regra.
- Você explicou **por que nenhuma avisa**.
- `experimento.md` com as **cinco** voltas e o eixo de cada.
- Você explicou **o que a primeira volta revela**.
- Você explicou **o custo do ganho** e onde ele aparece.
- `aposentar.md` com os **quatro** vereditos.
- Você explicou **por que ninguém aposenta**.
- Você citou **os quatro** itens do registro de aposentadoria.
- A **primeira volta** rodada, com as **duas** taxas.
- Você identificou **se o ajuste foi ganho ou troca**.
- A **segunda volta** rodada, com **outro eixo**.
- Você mediu **o ganho marginal** e identificou **o platô**.
- `caderno/PD-008.md` com as **dez** seções.
- `relatorio-ciclo.md` com as **dez** seções.
- Você classificou **a lacuna** (detecção ou instrumentação).
- ⚠ **Nenhum tráfego de outro ambiente.**

---

## Avaliação

1. **Por que uma regra escrita uma vez expira?
2. **Cite as três coisas que mudam.**
3. **Por que nenhuma das três avisa?
4. **Cite as cinco fases** do ciclo.
5. **Qual fase define o ciclo?** Por que ela é controlada?
6. **Quais são as duas saídas da fase 5?
7. **Por que aposentar é resultado e não fracasso?
8. **O que registrar por volta?** Cite cinco campos.
9. **Por que "dobrar a detecção" pode não ser ganho?
10. **Cite as cinco voltas** e o eixo de cada.
11. **O que a primeira volta revela** sobre a regra literal?
12. **Por que a regra alinhada é o melhor ganho?
13. **Onde aparece o custo do ganho?
14. **Cite os quatro vereditos possíveis.
15. **Qual situação exige aposentar?** Por que ninguém decide?
16. **O que registrar ao aposentar?** Cite quatro itens.
17. **Como a aposentadoria se liga ao módulo 7?
18. **O que o ganho marginal diz?** Quando parar?
19. **Se o Δ é zero e o FP não cai, o que fazer?
20. **O que o ciclo não elimina?** O que ele torna?

---

**Próximo:** [Módulo 9 — Evasão: as famílias](modulo-09.md)
