# Módulo 7 — O Perfil do Atacante

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Sair do "atacante imaginário" e chegar ao **perfil com hipótese**.
2. Usar o **ATT&CK** como vocabulário — e não como catálogo.
3. Construir o perfil **a partir do ataque que você reproduziu**.
4. Reconhecer o que o perfil **não** consegue prever.
5. Escrever a **hipótese de detecção** — com critério de falsificação.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **"O atacante" não existe.** **Existe o atacante **que faz a sua cadeia**, com as ferramentas que
> ele tem, contra o seu alvo.** **E é esse que você modela.**

⚠ **E o erro comum, e ele é caro:** **o time escreve regras contra um atacante **imaginário** —
sofisticado, paciente, APT** — **e não detecta o que de fato acontece, que é automatizado, rápido e
raro.**

⚠ **A tese:**

> **O perfil não é sobre quem ataca; é sobre o que **esta** cadeia permite observar.** **E você só
> consegue modelar o que reproduziu.**

⚠ **A tabela do atacante imaginário × o real:**

| | Imaginário | ⚠ O que você mediu |
|---|---|---|
| Sofisticação | Alta | ⚠ **A do seu lab** |
| Persistência | Meses | ⚠ **O tempo do seu teste** |
| Ferramenta | Custom | ⚠ **A que você usou** |
| Objetivo | Exfiltração | ⚠ **O do seu cenário** |
| ⚠ **Rastro** | "Furtivo" | ⚠⚠ **O que os SEUS logs viram** |

⚠ **A última linha é o que o curso defende.** **O perfil só vale se o rastro for **observado**, não
suposto** — **e você só observa o que reproduziu.**

---

## 7.1 O ATT&CK como vocabulário

⚠ **O que o ATT&CK é, e o que ele não é.**

| É | **Não é** |
|---|---|
| ⚠ **Um vocabulário comum** | ⚠ Uma lista de regras |
| Um mapa de comportamentos | ⚠ Uma ferramenta |
| Um índice de técnicas | ⚠ **Uma checklist a cobrir** |

⚠ **A terceira linha da direita é o erro mais comum.** **Times tratam o ATT&CK como cobertura a
atingir** — **e escrevem regras para técnicas que não se aplicam à sua arquitetura.** **É trabalho
sem retorno.**

⚠ **A tabela do uso certo:**

| Uso | Serve? |
|---|---|
| Nomear a técnica do seu ataque | ✓ **Sim — o vocabulário** |
| ⚠ Ligar a técnica ao **seu** log | ✓ **Sim — a ponte** |
| ⚠ Cobrir todas as técnicas | ⚠ **Não — é inviável** |
| Priorizar por **impacto no SEU sistema** | ✓ Sim |
| ⚠ Copiar regras de outro time | ⚠ **Não — o log dele não é o seu** |

⚠ **A linha da ponte é o uso real.** **A técnica nomeia o comportamento; o log diz se você pode
vê-lo** — **e é a pergunta do módulo 2.**

⚠ **A linha da cópia merece a nota porque é a prática mais difundida.** **Regras compartilhadas
assumem um ambiente** — **e o seu tem outros logs, outro volume, outro tráfego legítimo.** **A
regra emprestada tem a taxa de FP do ambiente de origem.**

⚠ **A regra escrita:**

> **O ATT&CK dá o nome; o seu log dá a viabilidade.** **Uma técnica que você não pode observar não
> é uma lacuna de detecção — é uma lacuna de instrumentação.**

```bash
mkdir -p ~/detect-lab/mod07 && cd ~/detect-lab/mod07

echo "═══ 1. o ATT&CK como vocabulário ═══"
echo
cat > attack.md <<'EOF'
# O ATT&CK como vocabulário

| É | NÃO é |
|---|---|
| ⚠ um VOCABULÁRIO comum | uma lista de REGRAS |
| um mapa de comportamentos | uma ferramenta |
| um índice de técnicas | ⚠ uma CHECKLIST a cobrir |

## O uso certo
| Uso | Serve? |
|---|---|
| nomear a técnica do seu ataque | ✓ SIM — o vocabulário |
| ⚠ ligar a técnica ao SEU log | ✓ SIM — a PONTE |
| ⚠ cobrir TODAS as técnicas | ⚠ NÃO — inviável |
| priorizar por impacto no SEU sistema | ✓ sim |
| ⚠ copiar regras de outro time | ⚠ NÃO — o log dele não é o seu |

## ⚠ a linha da PONTE é o uso real
a técnica NOMEIA o comportamento.
o log diz se você pode VÊ-LO.
✓ e é a pergunta do módulo 2.

## ⚠ a linha da cópia
regras compartilhadas assumem um AMBIENTE.
e o seu tem outros logs, outro volume, outro tráfego legítimo.
⚠ a regra emprestada tem a taxa de FP do ambiente DE ORIGEM.

## ⚠ A REGRA
o ATT&CK dá o NOME; o seu log dá a VIABILIDADE.
uma técnica que você não pode observar não é
lacuna de DETECÇÃO — é lacuna de INSTRUMENTAÇÃO.
EOF

cat attack.md
```

⚠ **A tabela do uso certo é o instrumento.** **E a distinção final é a mais útil:** **lacuna de
detecção × lacuna de instrumentação** — **porque a segunda se resolve com log, não com regra.**

⚠ **E a nota da regra emprestada é prática:** **o log do outro não é o seu, e a taxa de FP dele
também não.**

**Produza `attack.md`:**

| Uso | Serve? |
|---|---|
| Nomear a técnica | |
| Cobrir todas | |
| Copiar de outro time | |

**Responda:**

1. **Qual é o uso real** do ATT&CK?
2. **Por que cobrir todas as técnicas é trabalho sem retorno?
3. **Por que a regra emprestada tem a taxa de FP do outro?
4. **Qual a diferença entre lacuna de detecção e de instrumentação?

---

## 7.2 Do ataque ao perfil

⚠ **O instrumento: o perfil se constrói do **ataque que você reproduziu** — **não de um catálogo.**

| Campo | De onde vem |
|---|---|
| **A técnica** | Do ATT&CK — o vocabulário |
| **A variante** | ⚠ **Do seu lab** |
| **O rastro** | ⚠ **Do log que você observou** |
| ⚠ **O que ficou invisível** | ⚠ **Do inventário** (módulo 2) |
| **A hipótese de detecção** | Da síntese |

⚠ **A linha do rastro é o que distingue o perfil útil do decorativo.** **"O atacante usa T1190"** não
ajuda; **"T1190, na variante CL.TE, deixa um path estranho no log do backend, e **nada** no log do
frontend"** — **isso é perfil.**

⚠ **E a tabela do que o perfil revela:**

| Item | Para que serve |
|---|---|
| A técnica | Comunicar |
| A variante | ⚠ **Reproduzir** |
| O rastro | ⚠ **Escrever a regra** |
| ⚠ O invisível | ⚠ **Saber o que falta** |
| A hipótese | ⚠ **O que testar** |

⚠ **A regra escrita:**

> **O perfil é descritivo e específico.** **Ele descreve **esta** cadeia, **nesta** variante, com
> **este** rastro.** **O que ele não faz é prever o atacante que você não reproduziu.**

```bash
cd ~/detect-lab/mod07

echo "═══ 2. do ataque ao perfil ═══"
echo
cat > perfil.md <<'EOF'
# Do ataque ao perfil

| Campo | De onde vem |
|---|---|
| a TÉCNICA | do ATT&CK — o vocabulário |
| a VARIANTE | ⚠ do SEU lab |
| o RASTRO | ⚠ do log que você OBSERVOU |
| ⚠ o que ficou INVISÍVEL | ⚠ do inventário (módulo 2) |
| a HIPÓTESE | da síntese |

## O que o perfil revela
| Item | Para que serve |
|---|---|
| a técnica | COMUNICAR |
| a variante | ⚠ REPRODUZIR |
| o rastro | ⚠ escrever a REGRA |
| ⚠ o invisível | ⚠ saber o que FALTA |
| a hipótese | ⚠ o que TESTAR |

## ⚠ o que distingue o perfil ÚTIL do decorativo
"o atacante usa T1190" NÃO AJUDA.
"T1190, na variante CL.TE, deixa um PATH ESTRANHO
 no log do BACKEND, e NADA no log do frontend" —
✓ ISSO é perfil.

## ⚠ A REGRA
o perfil é DESCRITIVO e ESPECÍFICO.
ele descreve ESTA cadeia, NESTA variante, com ESTE rastro.
⚠ e ele NÃO prevê o atacante que você não reproduziu.
EOF

cat perfil.md
```

⚠ **O perfil descritivo é o instrumento.** **E a comparação das duas frases é o argumento:** **uma
comunica, a outra permite escrever a regra.**

⚠ **E a nota final limita a ambição:** **o perfil não prevê; ele descreve.** **Prever é o que a
anomalia tenta fazer** — **e ela custa o que o módulo 6 mediu.**

**Produza `perfil.md`:**

| Campo | De onde vem |
|---|---|
| Variante | |
| Rastro | |
| Invisível | |

**Responda:**

1. **O que distingue o perfil útil do decorativo?
2. **Para que serve cada campo do perfil?
3. **O que o perfil NÃO faz?
4. **Quem tenta prever o que o perfil não prevê?

---

## 7.3 A hipótese de detecção

⚠ **A hipótese é o entregável do módulo, e ela tem a forma do módulo 6 do Pesquisa.**

| Campo | Valor |
|---|---|
| **A técnica** | T____ — o nome |
| **O comportamento** | O que o atacante faz |
| **O rastro** | ⚠ **Onde isso aparece** |
| **A regra** | O que casar |
| ⚠ **A falsificação** | ⚠ **O que a derruba** |
| ⚠ **O FP esperado** | Do módulo 6 |
| ⚠ **O que ela não pega** | Do módulo 4 |

⚠ **A linha da falsificação é a que transforma a hipótese em algo testável.** **"A regra vai pegar"**
não é hipótese. **"A regra casa quando X aparece e não casa quando X está ofuscado por Y"** é.

⚠ **E a tabela do que a hipótese precisa responder:**

| Pergunta | Por quê |
|---|---|
| O que o atacante faz? | A técnica |
| ⚠ **Onde isso aparece?** | ⚠ **A viabilidade** |
| **O que casar?** | A regra |
| ⚠ **O que a derruba?** | ⚠ **O escopo** |
| ⚠ **Quanto custa?** | ⚠ **O orçamento** |

⚠ **A regra escrita:**

> **A hipótese de detecção é uma frase que pode estar errada** — **e que diz como saber.** **Sem a
> falsificação, ela é uma expectativa; com ela, é engenharia.**

```bash
cd ~/detect-lab/mod07

echo "═══ 3. a hipótese de detecção ═══"
echo
cat > hipotese.md <<'EOF'
# A hipótese de detecção

| Campo | Valor |
|---|---|
| a TÉCNICA | T____ — o nome |
| o COMPORTAMENTO | o que o atacante faz |
| o RASTRO | ⚠ ONDE isso aparece |
| a REGRA | o que casar |
| ⚠ a FALSIFICAÇÃO | ⚠ o que a DERRUBA |
| ⚠ o FP esperado | do módulo 6 |
| ⚠ o que ela NÃO pega | do módulo 4 |

## O que a hipótese precisa responder
| Pergunta | Por quê |
|---|---|
| o que o atacante FAZ? | a técnica |
| ⚠ ONDE isso aparece? | ⚠ a VIABILIDADE |
| o que CASAR? | a regra |
| ⚠ o que a DERRUBA? | ⚠ o ESCOPO |
| ⚠ quanto CUSTA? | ⚠ o ORÇAMENTO |

## ⚠ A REGRA
a hipótese é uma FRASE QUE PODE ESTAR ERRADA —
e que diz COMO SABER.
sem a falsificação, ela é EXPECTATIVA.
com ela, é ENGENHARIA.
EOF

cat hipotese.md
```

⚠ **A hipótese é a ponte entre o módulo 4 (a evasão) e o módulo 6 (o custo).** **E ela declara os
dois:** **o que a derruba e quanto ela custa.**

⚠ **E a exigência da falsificação é a mesma do módulo 6 do Pesquisa** — **porque sem ela, o perfil
vira torcida.**

**Produza `hipotese.md`:**

| Campo | Valor |
|---|---|
| Técnica | |
| Rastro | |
| Falsificação | |

**Responda:**

1. **Por que a falsificação transforma a hipótese em engenharia?
2. **O que a hipótese precisa responder?
3. **Por que o FP e o "não pega" entram na hipótese?
4. **O que a hipótese não é?

---

## 7.4 LAB — O perfil e a hipótese

**Duração:** 120 min

### Passo 1 — Construa o perfil (50 min)

⚠ **Do ataque que você reproduziu — nos módulos 1 a 4.**

```bash
cd ~/detect-lab/mod07

echo "═══ CONSTRUINDO O PERFIL ═══"
echo
cat <<'EXPL'
  ── O PERFIL VEM DO QUE VOCÊ FEZ ──

     1. o ataque:  o do módulo 1
     2. a variante: a que você reproduziu
     3. o rastro:  ⚠ O QUE VOCÊ OBSERVOU no log
     4. o invisível: ⚠ do inventário (módulo 2)
     5. a técnica: ⚠ o nome no ATT&CK

  ── E O PASSO 5 É O ÚNICO QUE VEM DE FORA ──
     consulte o ATT&CK e encontre a técnica que
     descreve o comportamento.
     ⚠ e se não encontrar, a técnica não existe —
        e o perfil fica sem o nome. não invente.
EXPL

cat > caderno/PD-007.md <<'EOF'
# PD-007 — o perfil do atacante

**Data:** ____

## 1. A cadeia que eu reproduzi
| Item | Valor |
|---|---|
| ataque | |
| variante | |
| onde roda | 127.0.0.1 |

## 2. A técnica (ATT&CK)
| Item | Valor |
|---|---|
| ID | T____ |
| Nome | |
| ⚠ Encontrei no ATT&CK? | |
| Se não, o que descreve | |

## 3. O rastro observado
| Item | Valor |
|---|---|
| em qual log | |
| o que aparece | |
| ⚠ é distinguível do normal? | |
| como confirmei | |

## 4. ⚠ O que ficou INVISÍVEL
| Item | Por quê |
|---|---|
| | |

## 5. A hipótese de detecção
| Campo | Valor |
|---|---|
| técnica | |
| comportamento | |
| rastro | |
| regra | |
| ⚠ FALSIFICAÇÃO | |
| ⚠ FP esperado | |
| ⚠ o que NÃO pega | |

## 6. ⚠ O que este perfil NÃO prevê
| Item | Por quê |
|---|---|
| | |

## 7. O isolamento
| Item | Valor |
|---|---|
| tudo em | 127.0.0.1 |
| ⚠ terceiros | NENHUM |

## 8. O que NÃO foi verificado
⚠ mínimo 3
EOF

echo "  ⚠ a ficha PD-007 criada"
head -14 caderno/PD-007.md
```

⚠ **A seção 2 é a única que vem de fora** — **e a nota é explícita:** **se a técnica não existe no
ATT&CK, você não inventa.** **O perfil fica sem o nome, e isso é honesto.**

⚠ **E a seção 6 é o contrapeso:** **o que o perfil não prevê** — **porque o perfil descreve, não
prevê.**

**Produza `perfil-construido.md`:**

| Campo | Valor |
|---|---|
| Técnica | |
| Rastro | |
| Invisível | |
| Falsificação | |

**Responda:**

1. **Qual técnica você encontrou?** Ou não encontrou?
2. **O rastro é o que você observou** ou o que você supôs?
3. **O que ficou invisível?
4. **O que o perfil não prevê?**

### Passo 2 — Teste a hipótese (40 min)

⚠ **A hipótese se testa como qualquer outra: com o ataque que a falsifica.**

```bash
cd ~/detect-lab/mod07

echo "═══ TESTANDO A HIPÓTESE ═══"
echo
cat <<'EXPL'
  ── A HIPÓTESE DIZ DUAS COISAS ──

     1. a regra CASA quando o ataque aparece
        → ⚠ teste com o ataque

     2. e NÃO casa quando ele está ofuscado
        → ⚠ teste com a evasão do módulo 4

  ✓ e as duas são IGUAIS em importância.
     uma hipótese que só diz "pega" está incompleta.

  ── O REGISTRO ──
     · o que eu previ
     · ⚠ o que aconteceu
     · e a diferença
EXPL

cat > testa-hipotese.py <<'PY'
#!/usr/bin/env python3
"""
testa-hipotese.py — testa a hipótese nas DUAS direções.

⚠ DIDÁTICO e LOCAL.
"""
CASOS = [
    # (descrição, o ataque?, a evasão?, ⚠ previsto)
    ("ataque literal",           True,  False, "casa"),
    ("ataque com encoding 1×",   True,  True,  "⚠ talvez não"),
    ("ataque com encoding 2×",   True,  True,  "⚠ NÃO casa"),
    ("ataque com case trocado",  True,  True,  "⚠ depende do (?i)"),
    ("tráfego legítimo",         False, False, "⚠ NÃO casa"),
    ("legítimo parecido",        False, True,  "⚠ pode casar"),
]


def main():
    print("═══ TESTANDO A HIPÓTESE — AS DUAS DIREÇÕES ═══")
    print()
    print(f"  {'caso':<26} {'é ataque?':<12} {'previsto':<18}")
    print("  " + "-"*58)
    for desc, ataque, evasao, prev in CASOS:
        a = "sim" if ataque else "não"
        print(f"  {desc:<26} {a:<12} {prev:<18}")

    print()
    print("  ═══ O QUE A HIPÓTESE PRECISA DECLARAR ═══")
    print("  · ✅ casa no ataque literal")
    print("  · ⚠ NÃO casa quando ofuscado por X")
    print("  · ⚠ casa em legítimo parecido? (o FP)")
    print()
    print("  ⚠ e a segunda linha é a FALSIFICAÇÃO.")
    print("     sem ela, a hipótese só diz 'pega' — e não diz ATÉ ONDE.")


if __name__ == "__main__":
    main()
PY

chmod +x testa-hipotese.py
python3 testa-hipotese.py
```

⚠ **O teste nas duas direções é o instrumento.** **E a segunda é a que falta na maioria das
hipóteses:** **o que a derruba.**

⚠ **E a linha do "legítimo parecido" é o FP** — **que o módulo 6 mede.**

**Produza `hipotese-testada.md`:**

| Caso | Previsto | Observado |
|---|---|---|
| Ataque literal | | |
| Ofuscado | | |
| Legítimo parecido | | |

**Responda:**

1. **A hipótese previu as duas direções?
2. **O ataque literal casou?
3. **A evasão derrubou?** Qual?
4. **O legítimo parecido casou?** (Isso é o FP.)

### Passo 3 — Documente (30 min)

Produza `relatorio-perfil.md`:

```markdown
# Relatório — perfil e hipótese

## 1. A cadeia reproduzida
| Item | Valor |
|---|---|
| ataque e variante | |
| onde roda | 127.0.0.1 |

## 2. O perfil
| Campo | Valor |
|---|---|
| técnica (ATT&CK) | |
| ⚠ encontrada? | |
| rastro observado | |
| ⚠ invisível | |

## 3. A hipótese
| Campo | Valor |
|---|---|
| comportamento | |
| rastro | |
| regra | |
| ⚠ FALSIFICAÇÃO | |
| ⚠ FP esperado | |
| ⚠ o que não pega | |

## 4. O teste, nas duas direções
| Caso | Previsto | Observado | ✓/⚠ |
|---|---|---|---|
| ataque literal | | | |
| ofuscado | | | |
| legítimo parecido | | | |

## 5. ⚠ O que o perfil NÃO prevê
| Item | Por quê |
|---|---|
| | |

## 6. As lacunas
| Tipo | Item |
|---|---|
| ⚠ de DETECÇÃO | |
| ⚠ de INSTRUMENTAÇÃO | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não consultei dado de outro ambiente
- [ ] não copiei regra de outro time sem medir
- [ ] não testei fora de 127.0.0.1
- [ ] não publiquei nada

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O que isso destrava
| # | Próxima regra | Prioridade |
```

**Produza `relatorio-perfil.md`:**

| Item | Valor |
|---|---|
| Rastro | |
| Falsificação | |
| Lacuna de detecção | |
| Lacuna de instrumentação | |

**Responda:**

1. **Qual é a lacuna de detecção?** E a de instrumentação?
2. **A falsificação está declarada?
3. **O perfil descreve ou prevê?** Onde isso aparece no relatório?
4. **O que você não fez?**

### Critérios de aceitação

- `attack.md` com o que o ATT&CK é e **não é**.
- Você explicou **o uso real** (a ponte) e por que cobrir tudo é inviável.
- Você explicou **por que a regra emprestada carrega o FP do outro**.
- Você distinguiu **lacuna de detecção × lacuna de instrumentação**.
- `perfil.md` com os **cinco** campos e a origem de cada.
- Você explicou **o que distingue o perfil útil do decorativo**.
- Você explicou **o que o perfil NÃO faz**.
- `hipotese.md` com os **sete** campos.
- Você explicou **por que a falsificação a torna engenharia**.
- Você explicou **por que o FP e o "não pega" entram** na hipótese.
- `caderno/PD-007.md` com as **oito** seções.
- Você **consultou o ATT&CK** para a técnica — e não inventou.
- O **rastro** é o que você **observou**, não o suposto.
- A **hipótese testada nas duas direções**.
- Você identificou **a evasão que derruba** a regra.
- Você verificou **o legítimo parecido** (o FP).
- `relatorio-perfil.md` com as **nove** seções.
- Você listou **as duas lacunas**.
- ⚠ **Nenhum dado de outro ambiente.**

---

## Avaliação

1. **Por que "o atacante" não existe?
2. **O que o time escreve contra o atacante imaginário?
3. **O que o ATT&CK é?** E o que não é?
4. **Qual é o uso real dele?
5. **Por que cobrir todas as técnicas é inviável?
6. **Por que a regra emprestada tem o FP do ambiente de origem?
7. **Qual a diferença entre lacuna de detecção e de instrumentação?
8. **Cite os cinco campos** do perfil e a origem de cada.
9. **Por que o rastro é o campo que distingue o perfil útil?
10. **O que o perfil revela?** Cite cinco usos.
11. **O que o perfil NÃO faz?
12. **Quem tenta prever o que o perfil não prevê?
13. **Cite os sete campos** da hipótese.
14. **Por que a falsificação a transforma em engenharia?
15. **O que a hipótese precisa responder?** Cite cinco perguntas.
16. **Por que o FP entra na hipótese?
17. **O que testar quando a hipótese diz "pega"?
18. **Qual a segunda direção do teste?** Por que ela falta?
19. **O que fazer se a técnica não existe no ATT&CK?
20. **O que a hipótese não é?**

---

**Próximo:** [Módulo 8 — O ciclo purple](modulo-08.md)
