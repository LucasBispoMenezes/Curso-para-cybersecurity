# Módulo 9 — Quando Desistir

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Reconhecer **critério de parada** — e por que é método, não desistência.
2. Distinguir **alvo esgotado** de **hipótese errada** de **teste ruim**.
3. Extrair o **que a falha ensinou** antes de sair.
4. Saber **quando trocar de alvo** e quando insistir.
5. Reconhecer o **custo afundado** e o que ele faz com o julgamento.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Desistir sem critério é dispersão. Insistir sem critério é teimosia. O método é ter o critério
> ANTES de precisar dele.**

⚠ **E é a mesma estrutura do módulo 6:** **a hipótese tem critério de falsificação** — e a
**investigação tem critério de parada.** **Sem os dois, você decide por cansaço ou por apego.**

⚠ **As três razões de parada, e elas são diferentes:**

| Razão | O que significa | O que fazer |
|---|---|---|
| **Hipótese falsificada** | O teste decidiu, e caiu | ⚠ **Registrar e seguir** — é resultado |
| **Teste inconclusivo** | O teste não decidiu | ⚠ **Reformular o TESTE** |
| **Alvo esgotado** | Não há mais superfície acessível | ⚠ **Trocar de alvo** |

⚠ **A confusão entre as três é o que faz a pesquisa travar.** **Você acha que o alvo acabou quando
na verdade você fez o teste errado** — e **troca de alvo prematuramente.** **Ou acha que o teste
foi ruim quando a hipótese estava errada** — e **insiste na mesma hipótese.**

⚠ **A tese:** **o critério de parada é escrito junto com a hipótese** — **antes de você ter
investido tempo** — **porque depois, o custo afundado contamina o julgamento.**

---

## 9.1 Os três tipos de parada

⚠ **E é a distinção que decide o próximo passo.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ FALSIFICOU                                                           │
│    o teste decidiu, e a hipótese caiu                                 │
│    ⚠ ISSO É RESULTADO (módulo 1)                                       │
│    ✓ você eliminou uma possibilidade                                  │
│    → registrar, e ir para a próxima do backlog                        │
├──────────────────────────────────────────────────────────────────────┤
│ INCONCLUSIVO                                                         │
│    o teste NÃO decidiu                                                │
│    ⚠ O TESTE falhou, não a hipótese (módulo 1)                         │
│    ✓ você aprendeu que o teste foi mal desenhado                      │
│    → reformular o TESTE, e rodar de novo                              │
├──────────────────────────────────────────────────────────────────────┤
│ ALVO ESGOTADO                                                        │
│    a superfície acessível acabou                                      │
│    ⚠ não é sobre a hipótese — é sobre o ALVO                           │
│    → trocar de alvo (módulo 2)                                        │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A primeira linha é a que o curso insiste em valorizar.** **Falsificar é RESULTADO** — **e é o
que mais acontece.** **Um pesquisador que só registra confirmações tem um registro enviesado** —
**porque esconde o que ele eliminou.**

⚠ **E a segunda linha é a que salva tempo.** **"Não decidi" significa que o método foi ruim** —
**e reformular o teste é mais barato que trocar de alvo.** **É a diferença entre "o parser é
seguro" e "não consegui testar o parser".**

⚠ **A terceira é a mais difícil, e o módulo 2 é o que dá o critério.** **Um alvo maduro esgota
rápido** — **e reconhecer isso cedo é o que evita meses de trabalho estéril.**

```bash
mkdir -p ~/pesquisa-lab/mod09 && cd ~/pesquisa-lab/mod09

echo "═══ 1. os três tipos, e a confusão entre eles ═══"
echo
cat <<'EXPL'
  ── O ERRO 1: confundir INCONCLUSIVO com FALSIFICADO ──
     "testei e não deu nada → a hipótese é falsa"
     ⚠ NÃO. "não deu nada" pode significar que o teste foi ruim.
     ✓ a pergunta: o teste PODERIA ter decidido?
        · se sim, e decidiu — falsificou
        · se não poderia, — inconclusivo (e o teste é o problema)

  ── O ERRO 2: confundir FALSIFICADO com ALVO ESGOTADO ──
     "essa hipótese caiu → vou trocar de alvo"
     ⚠ NÃO. uma hipótese falsificada não diz nada sobre o alvo.
     ✓ e você tem um BACKLOG (módulo 8) com as próximas.

  ── O ERRO 3: confundir ALVO ESGOTADO com TEIMOSIA ──
     "vou insistir mais um pouco"
     ⚠ se o alvo é maduro (módulo 2), insistir é caro.
     ✓ o critério está no §9.3.

  ✓ os três erros levam a: trocar cedo demais, ou tarde demais.
     e o critério escrito ANTES é o que evita os dois.
EXPL

echo
echo "═══ 2. o critério de parada, escrito antes ═══"
echo
cat > criterio-parada.md <<'EOF'
# Critério de parada

⚠ escrito JUNTO com a hipótese, antes de investir tempo.

## Para esta investigação
| Campo | Valor |
|---|---|
| Hipótese | |
| **Critério de falsificação** | |
| **Quando eu paro?** | |

## O teste PODERIA decidir?
| Pergunta | Resposta |
|---|---|
| A observação é obtível? | |
| Ela distingue confirmado de falsificado? | |
| ⚠ Se não distingue, o teste é RUIM — reformular | |

## Limite de esforço
| Recurso | Limite |
|---|---|
| Tempo | |
| Tentativas de teste | |
| ⚠ O que fazer ao atingir | registrar como inconclusivo |

## O que eu NÃO vou fazer
- [ ] não vou ampliar o escopo autorizado
- [ ] não vou testar contra terceiro
- [ ] não vou confirmar por teimosia
EOF

cat criterio-parada.md

echo
echo "═══ 3. o custo afundado ═══"
echo
cat <<'EXPL'
  ⚠ CUSTO AFUNDADO: o tempo que você já gastou NÃO deve influenciar a decisão.

  ── o que acontece sem perceber ──
     · "já investi 3 semanas, não vou parar agora"
     · ⚠ e a decisão passa a ser sobre o PASSADO, não sobre o sistema
     · o resultado: você insiste em hipótese que já morreu

  ── o antídoto ──
     · o critério escrito ANTES (este módulo)
     · a pergunta: "se eu começasse HOJE, investiria aqui?"
     · ⚠ e se a resposta é não, a decisão está tomada

  ⚠ é o mesmo raciocínio do exploit dev (módulo 3):
     quando o exploit falha, você verifica o OFFSET — não "tenta mais".
     ✓ e a decisão é sobre o dado, não sobre o esforço.
EXPL
```

⚠ **A pergunta do antídoto — "se eu começasse hoje, investiria aqui?"** — **é o instrumento mais
direto contra o custo afundado.** **Ela zera o passado** — e **deixa só o mérito da decisão.**

⚠ **E a comparação com o exploit dev é precisa.** **Lá, você não "tenta mais" — você verifica o
offset.** **Aqui, você não "insiste mais" — você verifica se a hipótese ainda está viva.** **A
mesma disciplina: decidir sobre o dado, não sobre a vontade.**

**Produza `parada.md`:**

| Razão | O que significa | Próximo passo |
|---|---|---|
| Falsificou | | |
| Inconclusivo | | |
| Alvo esgotado | | |

**Responda:**

1. **Diferencie falsificado de inconclusivo.** Por que a confusão custa tempo?
2. **Por que falsificar é resultado?**
3. **Cite o antídoto do custo afundado.**
4. **Por que o critério é escrito ANTES?**

---

## 9.2. O que a falha ensina

⚠ **Toda investigação que termina — bem ou mal — deixa algo. E o registro (módulo 8) é onde isso
vive.**

| O que aconteceu | O que aprendeu | ⚠ Onde registrar |
|---|---|---|
| Falsificou a hipótese | O invariante É garantido ali | Seção "conclusão" |
| Teste inconclusivo | ⚠ **O teste foi mal desenhado** | Seção "conclusão" + o teste |
| Alvo esgotado | ⚠ **Que tipo de alvo não rende** | O perfil (módulo 2) |
| Achou falso positivo | ⚠ **Qual dos cinco** (módulo 7) | O falso positivo |
| Nada no nível 1 e 2 | O padrão precisa de CodeQL | A busca (módulo 7) |

⚠ **A linha 3 é a mais valiosa a longo prazo.** **Um alvo esgotado te ensina sobre ALVOS** — **e
melhora a sua escolha seguinte.** **É o que o módulo 2 pediu:** **escolher por critério** — **e o
critério se calibra com a experiência de esgotamento.**

⚠ **A linha 4 é a mais frequente.** **Todo falso positivo é um diagnóstico do seu método de busca**
— **e anotar QUAL dos cinco ele era (chamador valida? outra camada? código morto?) calibra a
próxima busca.**

⚠ **A tabela do que cada aprendizado melhora:**

| Aprendizado | Melhora |
|---|---|
| "o invariante é garantido aqui" | A precisão da sua leitura |
| "o teste foi ruim" | ⚠ **O desenho de teste** |
| "este tipo de alvo não rende" | ⚠ **A escolha de alvo** |
| "era falso positivo do tipo X" | ⚠ **O filtro de busca** |
| "precisa de CodeQL" | A escada de busca |

⚠ **É o que o módulo 1 chamou de acúmulo.** **E note que três dos cinco aprendizados são sobre o
SEU MÉTODO** — **não sobre o sistema.** **É a metade invisível da pesquisa: você também está
aprendendo a pesquisar.**

```bash
cd ~/pesquisa-lab/mod09

echo "═══ 4. o que cada falha ensina ═══"
echo
cat > aprende-com-falha.md <<'EOF'
# O que a falha ensina

## Investigação
| Campo | Valor |
|---|---|
| ID | |
| Hipótese | |
| Resultado | |

## Se FALSIFICOU
| Item | Valor |
|---|---|
| O invariante É garantido | |
| Onde | |
| ⚠ O que isso melhora na minha leitura | |

## Se INCONCLUSIVO
| Item | Valor |
|---|---|
| Por que o teste não decidiu | |
| ⚠ O que reformular | |
| ⚠ O que isso me ensina sobre DESENHO DE TESTE | |

## Se o ALVO ESGOTOU
| Item | Valor |
|---|---|
| Quanto tempo até esgotar | |
| ⚠ Que indicador eu ignorei (módulo 2) | |
| ⚠ O que isso melhora na ESCOLHA DE ALVO | |

## Se era FALSO POSITIVO
| Qual dos cinco (módulo 7) | |
|---|---|
| ⚠ O que isso melhora no FILTRO | |

## A lição, em uma frase
[o que eu levo para a próxima]
EOF

cat aprende-com-falha.md
```

⚠ **O template tem uma seção por desfecho — e cada uma pergunta **o que isso melhora no seu
método**.** **E é a diferença entre registrar "não deu" e registrar "não deu, e eu sei por quê".**

⚠ **E a última seção é a que fecha:** **"o que eu levo para a próxima"** — **em uma frase.** **É o
que o módulo 8 chamava de sobras, aplicado à falha.**

**Produza `aprendizado.md`:**

| Desfecho | O que melhora no seu método |
|---|---|
| Falsificou | |
| Inconclusivo | |
| Alvo esgotado | |
| Falso positivo | |

**Responda:**

1. **Qual desfecho te ensina sobre ALVOS?**
2. **Qual ensina sobre DESENHO DE TESTE?**
3. **Qual ensina sobre FILTRO?**
4. **Por que três dos aprendizados são sobre você** e não sobre o sistema?

---

## 9.3 Quando trocar de alvo

⚠ **A decisão mais difícil do curso. E ela usa os números do módulo 2.**

| Indicador | Significa | Ação |
|---|---|---|
| **Maturidade 5 + competição 5** | Alvo esgotado por definição | ⚠ **Trocar** |
| `oss-fuzz` + auditoria + anos de CVE | Sobra pouco | ⚠ Considerar trocar |
| Dezenas de CVEs recentes | ⚠ **Ainda estão achando** | ✓ Ficar |
| Backlog vazio e nada aberto | Você cobriu o acessível | ⚠ Trocar ou aprofundar |
| ⚠ **Insistindo pela terceira vez** na mesma hipótese | Custo afundado | ⚠ **Parar** |

⚠ **A linha 3 é a que evita trocar cedo.** **Um alvo com dezenas de CVEs recentes está sendo
descoberto AGORA** — **e isso é sinal de que há superfície, não de que está esgotado.** **É a
diferença entre "muito auditado" e "muito quebrado".**

⚠ **E a linha 5 é o sinal de alarme.** **"Vou tentar de novo" pela terceira vez** é **custo
afundado se disfarçando de rigor.** **Se a hipótese não morreu e o teste decidiu duas vezes, o
problema é a hipótese.**

⚠ **A tabela do que fazer em vez de insistir:**

| Em vez de | Faça |
|---|---|
| Rodar o mesmo teste de novo | ⚠ **Mude o TESTE** |
| Mudar a entrada esperando resultado diferente | ⚠ **Reformule a HIPÓTESE** |
| Trocar de alvo sem motivo | ⚠ Consulte o backlog |
| Ampliar o escopo | ⚠ **Não** — é o módulo 10 |

⚠ **A linha 4 é a tentação que o módulo 10 trata.** **Quando o alvo esgota, a vontade é "testar
aquele outro sistema"** — **que frequentemente está fora do escopo.** **É a razão de o módulo 10 vir
depois deste.**

```bash
cd ~/pesquisa-lab/mod09

echo "═══ 5. a decisão de trocar ═══"
echo
python3 - <<'PY'
print("  ═══ TROCAR DE ALVO? ═══")
print()
print("  ── os indicadores (do módulo 2) ──")
print()
print(f"  {'indicador':<42} {'sinal':<12} {'ação':<16}")
print("  " + "-"*72)
ind = [
    ("maturidade 5 + competição 5",        "esgotado",   "⚠ trocar"),
    ("oss-fuzz + auditoria + anos de CVE", "pouco sobra","considerar"),
    ("dezenas de CVE nos últimos 2 anos",  "⚠ ainda acham","✓ FICAR"),
    ("backlog vazio, nada aberto",         "cobri",      "trocar/aprofundar"),
    ("3ª tentativa na mesma hipótese",     "⚠ afundado", "⚠ PARAR"),
]
for n, s, a in ind:
    print(f"  {n:<42} {s:<12} {a:<16}")
print()
print("  ⚠ a linha 3 é a que evita trocar cedo:")
print("     'muito auditado' e 'muito quebrado' são coisas DIFERENTES.")
print("     se ainda acham bug lá, há superfície.")
print()
print("═══ O LIMITE DE ESFORÇO ═══")
print()
print("  ── escreva ANTES ──")
print("     · quantas semanas nesta investigação?          ____")
print("     · quantas reformulações de teste?              ____")
print("     · ⚠ o que fazer ao atingir: registrar como inconclusivo")
print()
print("  ── e o sinal de alarme ──")
print("     'vou tentar de novo' pela TERCEIRA vez")
print("     ⚠ não é rigor. é custo afundado.")
PY
```

⚠ **A linha 3 merece a explicação.** **"Muito auditado" significa que muita gente olhou** — **e
"muito quebrado" significa que ainda acham.** **Os dois podem ser verdade ao mesmo tempo** —
**porque a superfície é grande.** **É a diferença entre o `OpenSSL` (muito auditado, pouco bug
novo) e um parser de formato comum (muito usado, muita superfície).**

⚠ **E o limite de esforço é o instrumento.** **Escrito ANTES**, ele **decide por você** — **quando
você já não consegue decidir por causa do investimento.**

**Produza `trocar-alvo.md`:**

| Indicador | Presente? | Ação |
|---|---|---|
| Maturidade 5 + competição 5 | | |
| `oss-fuzz` + auditoria | | |
| CVEs recentes | | |
| Backlog vazio | | |
| 3ª tentativa na mesma hipótese | | |

**Responda:**

1. **Diferencie "muito auditado" de "muito quebrado".**
2. **Qual indicador é o sinal de alarme?** Por quê?
3. **O que fazer em vez de insistir?** Cite as quatro.
4. **O que a tentação de "testar aquele outro sistema"** pode significar? (Módulo 10.)

---

## 9.4 LAB — Revise e feche investigações

**Duração:** 75 min

### Passo 1 — Revise o caderno (25 min)

⚠ **Pegue as fichas do módulo 8 e **feche o que está aberto — ou justifique por que não.**

```bash
cd ~/pesquisa-lab/mod09

cat > revisa-investigacoes.sh <<'SCRIPT'
#!/usr/bin/env bash
# revisa-investigacoes.sh — aplica o critério de parada
set -uo pipefail
cd ~/pesquisa-lab/caderno || exit 2

echo "═══════════ REVISÃO DAS INVESTIGAÇÕES ═══════════"
echo

printf '  %-10s %-12s %-14s %s\n' "ID" "estado" "tem critério?" "ação"
printf '  %-10s %-12s %-14s %s\n' "──" "──────" "────────────" "────"

for f in INV-*.md; do
    [ -f "$f" ] || continue
    id="${f%.md}"
    estado=$(grep -iE 'estado' "$f" 2>/dev/null | head -1 | sed 's/.*: *//' | cut -c1-10)
    [ -z "$estado" ] && estado="?"
    crit="⚠ não"
    grep -qi 'falsifica' "$f" 2>/dev/null && crit="✓ sim"

    # decide a ação
    case "$estado" in
        confirmada) acao="→ escrever o achado" ;;
        falsificada) acao="→ ⚠ registrar o aprendizado" ;;
        inconclusiva) acao="→ reformular o TESTE" ;;
        aberta) acao="→ aplicar critério de parada" ;;
        *) acao="→ definir estado" ;;
    esac

    printf '  %-10s %-12s %-14s %s\n' "$id" "$estado" "$crit" "$acao"
done

echo
echo "── 1. SEM CRITÉRIO DE FALSIFICAÇÃO ──"
for f in INV-*.md; do
    grep -qi 'falsifica' "$f" 2>/dev/null || echo "  ⚠ $f"
done
echo "  (fim)"
echo

echo "── 2. ABERTAS HÁ MAIS DE UMA SEMANA ──"
for f in INV-*.md; do
    grep -qiE 'estado.*aberta' "$f" 2>/dev/null && echo "  ⚠ $f"
done
echo "  (fim)"
echo

echo "── 3. VEREDICTO ──"
total=$(ls INV-*.md 2>/dev/null | wc -l)
abertas=$(grep -l -iE 'estado.*aberta' INV-*.md 2>/dev/null | wc -l)
semcrit=$(for f in INV-*.md; do grep -qi 'falsifica' "$f" 2>/dev/null || echo x; done | wc -l)
echo "  fichas       : $total"
echo "  abertas      : $abertas"
echo "  sem critério : $semcrit  ⚠"
echo
echo "  ⚠ uma investigação aberta sem critério de parada"
echo "     não é pesquisa — é expectativa parada no tempo."
SCRIPT

chmod +x revisa-investigacoes.sh
./revisa-investigacoes.sh
```

Produza `revisao.md`:

| ID | Estado | Tem critério? | Ação |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantas investigações estão abertas?**
2. **Quantas não têm critério** de falsificação?
3. **Qual você vai fechar hoje?** Como?
4. **Qual está aberta há mais tempo?** O que fazer?

### Passo 2 — Aplique o critério de parada (30 min)

⚠ **Para cada investigação aberta, decida: falsificou, inconclusivo, ou continua.**

```bash
cd ~/pesquisa-lab/mod09

echo "═══ APLICANDO O CRITÉRIO ═══"
echo
cat <<'EXPL'
  ── para cada investigação aberta, pergunte ──

     1. O TESTE PODERIA ter decidido?
        · sim, e decidiu → FALSIFICOU (ou confirmou)
        · sim, mas eu não rodei → rode
        · ⚠ NÃO poderia → INCONCLUSIVO: o teste é o problema

     2. Se INCONCLUSIVO: o que reformular?
        · a observação não era obtível?
        · a observação não distinguia?
        · a entrada não era a certa?

     3. Se ainda aberta e viva: qual o LIMITE de esforço?
        ⚠ escreva agora, antes de continuar

     4. Se FALSIFICOU: o que eu aprendi?
        ⚠ seção "aprendizado" do §9.2
EXPL

cat > ~/pesquisa-lab/caderno/09-fechamento.md <<'EOF'
# Fechamento de investigações

## Para cada investigação aberta
| ID | O teste poderia decidir? | Decisão | Aprendizado | Próximo passo |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

## As que fecharam
| ID | Estado final | O que aprendi | Onde registrei |
|---|---|---|---|
| | | | |

## As que continuam — e o limite
| ID | Por que continua | Limite de esforço | O que fazer ao atingir |
|---|---|---|---|
| | | | |

## O que a revisão me ensinou sobre MEU MÉTODO
| Observação | Melhoria |
|---|---|
| | |
EOF

cat ~/pesquisa-lab/caderno/09-fechamento.md
```

Produza `fechamento.md`:

| ID | Decisão | Aprendizado | Próximo passo |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantas fecharam?** Com qual estado?
2. **Alguma ficou inconclusiva?** O que reformular?
3. **Qual continua?** Com que limite?
4. **O que a revisão ensinou** sobre o seu método?

### Passo 3 — O estado do alvo (20 min)

Produza `estado-alvo.md`:

```markdown
# Estado do alvo e decisão de continuidade

## O alvo (módulo 2)
| Campo | Valor |
|---|---|
| Alvo | |
| Versão | |
| Produtividade | |
| Região produtiva | |

## O que foi coberto
| Superfície | Investigada? | Resultado |
|---|---|---|
| | | |

## Os indicadores de esgotamento (módulo 9)
| Indicador | Presente? |
|---|---|
| Maturidade 5 + competição 5 | |
| oss-fuzz + auditoria + anos de CVE | |
| CVEs recentes (⚠ fica se sim) | |
| Backlog vazio | |
| 3ª tentativa na mesma hipótese | |

## A decisão
[ ] continuar neste alvo
[ ] aprofundar numa superfície específica
[ ] trocar de alvo — e o próximo é:
[ ] pausar (e o que retomar)

## Se continuar: o limite de esforço
| Recurso | Limite |
|---|---|
| Tempo | |
| Reformulações de teste | |
| ⚠ O que fazer ao atingir | |

## O que aprendi sobre ESCOLHER alvo
[módulo 2 e este — o critério se calibrou? como?]

## O que NÃO vou fazer
- [ ] não vou ampliar o escopo autorizado para "aquele outro sistema"
- [ ] não vou testar contra terceiro
- [ ] não vou confirmar por teimosia
```

**Responda:**

1. **Você continua** neste alvo, ou troca? Por quê?
2. **Qual indicador de esgotamento** está presente?
3. **Qual o limite de esforço** escrito?
4. **O critério de escolha de alvo** se calibrou? Como?
5. **O que você não vai fazer?**

### Critérios de aceitação

- `parada.md` com os **três** tipos e a distinção entre eles.
- Você explicou **por que a confusão entre eles custa tempo**.
- Você explicou **por que falsificar é resultado**.
- `criterio-parada.md` com o **limite de esforço** escrito.
- Você escreveu o critério **antes** de continuar.
- Você explicou o **custo afundado** e o antídoto.
- `aprendizado.md` com os **quatro** desfechos.
- Você identificou **qual desfecho ensina sobre o seu método**.
- Você explicou **por que três dos aprendizados são sobre você**.
- `trocar-alvo.md` com os **cinco** indicadores.
- Você distinguiu **"muito auditado"** de **"muito quebrado"**.
- Você identificou o **sinal de alarme** e o que fazer em vez de insistir.
- `revisa-investigacoes.sh` rodado, com o estado do caderno.
- `fechamento.md` com pelo menos **uma** investigação fechada.
- Você explicou **o que a revisão ensinou** sobre o seu método.
- `estado-alvo.md` com a **decisão de continuidade** e o limite.
- Você escreveu **o que não vai fazer** — inclusive não ampliar escopo.
- ⚠ **Nenhum teste contra sistema de terceiro.**

---

## Avaliação

1. **Por que desistir sem critério é dispersão** e insistir sem critério é teimosia?
2. **Onde o critério de parada deve ser escrito?** Por quê?
3. **Cite os três tipos de parada.**
4. **Diferencie falsificado de inconclusivo.**
5. **Por que falsificar é resultado?**
6. **O que "inconclusivo" diz sobre o teste?**
7. **O que "alvo esgotado" diz sobre o alvo?**
8. **Cite os três erros de confusão** entre os tipos.
9. **O que é custo afundado?** E o antídoto?
10. **Escreva a pergunta** que zera o passado.
11. **Por que ela funciona?**
12. **Que comparação com o exploit dev** ilustra a mesma disciplina?
13. **O que uma hipótese falsificada te ensina?**
14. **O que um teste inconclusivo te ensina?**
15. **O que um alvo esgotado te ensina?**
16. **O que um falso positivo te ensina?**
17. **Por que três desses aprendizados são sobre você?**
18. **Diferencie "muito auditado" de "muito quebrado".**
19. **Cite o sinal de alarme** e o que fazer em vez de insistir.
20. **Por que a tentação de "testar outro sistema"** é o módulo 10?

---

**Próximo:** [Módulo 10 — Escopo e ética na pesquisa](modulo-10.md)
