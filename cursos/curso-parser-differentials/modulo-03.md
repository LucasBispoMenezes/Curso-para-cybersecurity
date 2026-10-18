# Módulo 3 — Divergência Legítima vs. Bug

**Carga:** 3 horas (1h teoria · 2h lab)
**Pre-requisitos:** Módulos 1 e 2 · Pesquisa em Segurança (módulo 7 do curso de Pesquisa)

---

## ⚠ Este é o módulo central do curso

⚠ **A afirmação que organiza tudo:**

> **Achar que duas implementações discordam é fácil.** **Saber se isso é um BUG é o trabalho** — **e
> é o que separa o pesquisador do gerador de falsos positivos.**

⚠ **E o custo de não saber, e ele é alto:**

| Sem o critério | Com o critério |
|---|---|
| ⚠ Lista de 40 "achados" | ⚠ **3 achados reais** |
| Nenhum mantenedor responde | O mantenedor confirma |
| Credibilidade queimada | ⚠ **Crédito** |
| ⚠ **Falso positivo é pior que zero** | **Zero é neutro** |

⚠ **A tese:**

> **Divergência é observação. Bug é conclusão** — **e a conclusão exige um critério explícito, não
> uma impressão.**

⚠ **E é literalmente o que o `HTTP Garden` faz:** ele **não reporta toda discordância** — reporta
**discordância sobre o framing.** **O filtro é o que torna o trabalho crível.**

---

## 3.1 As três categorias

⚠ **Toda discordância cai em uma de três. E só a terceira vale.**

| # | Categoria | Definição | Vale? |
|---|---|---|---|
| 1 | **Legítima** | A spec permite as duas | ⚠ **NÃO** |
| 2 | **Ambiguidade da spec** | A spec não decide | ⚠ **NÃO** — é bug da spec |
| 3 | ⚠ **Viola a spec** | Uma implementação está errada | ⚠⚠ **SIM** |

⚠ **A categoria 2 merece cuidado, porque ela é a armadilha.** **"A spec não decide"** parece um
achado — **e não é.** **É um bug **da especificação** — e o destino é o dono do formato, não o
mantenedor.**

⚠ **E a categoria 3 tem um subtipo que é o mais valioso do curso:**

| Subtipo da categoria 3 | Por que vale |
|---|---|
| **Uma viola a spec** | Direto |
| ⚠ **As duas violam** | ⚠ **Melhor: dois erros** |
| ⚠ **Discordância de FRAMING** | ⚠⚠ **O mais valioso** |

⚠ **A linha do framing é o critério prático do curso.** **Quando a discordância é **sobre onde a
mensagem termina**, você não precisa julgar qual está certa** — **porque a consequência é
objetiva:** **os bytes que sobram viram a próxima mensagem.**

⚠ **A regra escrita:**

> **Quando a discordância é sobre framing, não pergunte "quem erra".** **Pergunte "o que sobra"** —
> **e o que sobra é o bug.**

```bash
mkdir -p ~/parser-lab/mod03 && cd ~/parser-lab/mod03

echo "═══ 1. as três categorias ═══"
echo
cat > categorias.md <<'EOF'
# As três categorias

| # | Categoria | Definição | Vale? | Destino do achado |
|---|---|---|---|---|
| 1 | LEGÍTIMA | a spec permite as duas | ⚠ NÃO | — |
| 2 | AMBIGUIDADE | a spec não decide | ⚠ NÃO | ⚠ o dono da SPEC |
| 3 | ⚠ VIOLA A SPEC | uma está errada | ⚠⚠ SIM | o mantenedor |

## Os subtipos da categoria 3
| Subtipo | Por que vale |
|---|---|
| uma viola a spec | direto |
| ⚠ AS DUAS violam | dois erros — melhor |
| ⚠⚠ DISCORDÂNCIA DE FRAMING | o mais valioso |

## ⚠ a categoria 2 é a armadilha
"a spec não decide" PARECE um achado — e não é.
é bug DA especificação, e o destino é o dono do formato.
⚠ não o mantenedor da implementação.

## ⚠ A REGRA DO FRAMING
quando a discordância é sobre ONDE A MENSAGEM TERMINA,
não pergunte "quem erra".
pergunte "o que SOBRA".
✓ e o que sobra é o bug.
EOF

cat categorias.md

echo
echo "═══ 2. a pergunta que classifica ═══"
echo
cat <<'EXPL'
  ── APLIQUE NESTA ORDEM. para em qualquer SIM. ──

     Q1: a spec DECIDE este caso?
         │
         ├─ NÃO  → ⚠ categoria 2 (ambiguidade)
         │          → o achado vai ao DONO DA SPEC
         │
         └─ SIM  → Q2

     Q2: as DUAS seguem a spec?
         │
         ├─ SIM  → ⚠ categoria 1 (legítima)
         │          → nada a reportar
         │
         └─ NÃO  → Q3

     Q3: quais violam?
         │
         ├─ uma   → ⚠ categoria 3 — reporte ao mantenedor DELA
         │
         └─ as duas → ⚠⚠ categoria 3 dupla — reporte aos DOIS

  ⚠ e o TESTE de framing, transversal:
     a discordância é sobre ONDE A MENSAGEM TERMINA?
     ├─ SIM → ⚠⚠ prioridade máxima
     └─ NÃO → vale, mas com impacto menor
EXPL
```

⚠ **A pergunta cascata é o instrumento.** **E ela para na primeira resposta — o que torna a
classificação rápida.**

⚠ **E a Q3 com "as duas violam" é o caso mais valioso.** **Duas implementações erradas, ambas
reportáveis** — **e o crédito é dobrado.**

**Produza `categorias.md`:**

| # | Categoria | Vale? | Destino |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. **Por que a categoria 2 é a armadilha?**
2. **A quem vai o achado da categoria 2?**
3. **Por que a categoria 3 com as duas violando é melhor?**
4. **Qual é o critério prático do curso?** Por quê?

---

## 3.2 As cinco perguntas de verificação

⚠ **Antes de classificar, cinco perguntas. Cada uma elimina uma família de falsos positivos.**

| # | Pergunta | Elimina |
|---|---|---|
| 1 | **A spec decide?** | ⚠ Categoria 2 |
| 2 | **O desvio é alcançável?** | ⚠ Caminho morto |
| 3 | **Outra camada normaliza?** | ⚠ Divergência que não chega |
| 4 | **O desvio tem impacto?** | ⚠ Curiosidade |
| 5 | ⚠ **O desvio PODE ser explorado?** | ⚠ **Teórico** |

⚠ **A pergunta 3 é a que o Patch Diffing já treinou** — **e aqui ela é mais forte.** **A divergência
entre A e B só importa se **A realmente entrega o dado a B** — **e se ninguém no meio corrige.**

⚠ **A pergunta 5 é a mais dura — e a mais necessária.** **"Pode ser explorado" não significa "eu sei
explorar".** **Significa:** **existe um caminho em que a discordância produz um efeito observável
no alvo?** **É o critério do módulo 7 do Pesquisa.**

⚠ **A tabela do que cada resposta NÃO significa:**

| Você respondeu | Não significa |
|---|---|
| "a spec não decide" | que é bug |
| "é alcançável" | que tem impacto |
| "tem impacto" | que é explorável |
| "é explorável" | que você deve explorar ⚠ |

⚠ **A última linha é a nota de conduta do curso.** **Classificar como explorável é uma conclusão
técnica** — **e não uma autorização.** **Você reporta; o mantenedor decide.**

⚠ **E é a mesma linha do módulo 8 do Patch Diffing:** **você descreve o impacto, e declara o que não
verificou.**

⚠ **A regra escrita:**

> **A verificação é uma cascata, e cada pergunta elimina.** **Passar nas cinco não faz o achado
> bom** — **só o tira da lista dos ruins.**

```bash
cd ~/parser-lab/mod03

echo "═══ 3. as cinco perguntas ═══"
echo
cat > verificacao.md <<'EOF'
# As cinco perguntas

| # | Pergunta | Elimina | Como responder |
|---|---|---|---|
| 1 | a spec decide? | categoria 2 | leia a spec |
| 2 | o desvio é ALCANÇÁVEL? | caminho morto | siga o dado |
| 3 | outra camada NORMALIZA? | divergência que não chega | identifique as camadas |
| 4 | o desvio tem IMPACTO? | curiosidade | pergunte "e daí?" |
| 5 | ⚠ PODE ser explorado? | teórico | o critério do módulo 7 do Pesquisa |

## ⚠ o que cada resposta NÃO significa
| Você respondeu | Não significa |
|---|---|
| "a spec não decide" | que é bug |
| "é alcançável" | que tem impacto |
| "tem impacto" | que é explorável |
| "é explorável" | ⚠ que você deva explorar |

## ⚠ o impacto, por tipo de discordância
| Discordância | Impacto típico |
|---|---|
| sobre normalização | ⚠ bypass de filtro |
| sobre duplicatas | ⚠ smuggling, bypass |
| sobre o limite do campo | DoS, overflow |
| sobre o encoding | bypass de assinatura |
| ⚠ sobre FRAMING | ⚠⚠ smuggling, desync |

## ⚠ A REGRA
a verificação é uma CASCATA, e cada pergunta elimina.
passar nas cinco não faz o achado bom —
só o tira da lista dos ruins.
EOF

cat verificacao.md

echo
echo "═══ 4. o falso positivo clássico ═══"
echo
cat <<'EXPL'
  ── OS TRÊS FALSOS POSITIVOS QUE VOCÊ VAI COMETER ──

  FP 1: "A e B discordam sobre 'abc' vs. 'ABC'"
        ⚠ e a spec DIZ que a comparação é case-sensitive
        → categoria 1. não é bug.

  FP 2: "A não valida o campo, e B valida"
        ⚠ e outra camada valida ANTES de chegar em A
        → pergunta 3. não há divergência OBSERVÁVEL.

  FP 3: "A aceita 2GB de entrada, e B não"
        ⚠ e o limite de A nunca é alcançável, porque
           o socket corta em 1MB
        → pergunta 2. caminho morto.

  ✓ cada um é eliminado por UMA pergunta.
     e cada pergunta existe porque alguém já a ignorou.
EXPL
```

⚠ **Os três falsos positivos são os reais.** **E cada um é eliminado por uma pergunta da cascata.**
**É o mesmo desenho do módulo 7 do Pesquisa** — **e por isso o critério não se inventa: ele já
existe.**

⚠ **E o FP 2 é o mais importante aqui.** **A divergência entre A e B só importa se **A entrega o
dado a B** — **e se ninguém no meio normaliza.** **Sem isso, a divergência é teórica.**

**Produza `verificacao.md`:**

| # | Pergunta | Elimina | Sua resposta |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

**Responda:**

1. **Qual pergunta é a mais dura?** Por quê?
2. **O que "é explorável" NÃO significa?**
3. **Qual falso positivo é o mais importante aqui?** Por quê?
4. **Por que o critério já existe** e não se inventa?

---

## 3.3 A consequência objetiva

⚠ **O conceito que resolve a classificação difícil: quando a discordância tem **consequência
objetiva**, você não precisa julgar qual está certa.**

| Discordância | Consequência objetiva? |
|---|---|
| Sobre `1.234` | ⚠ Não — ambas defensáveis |
| Sobre case | Não — a spec decide |
| ⚠ **Sobre onde a mensagem termina** | ⚠⚠ **SIM — sobram bytes** |
| ⚠ **Sobre o que é "a mesma requisição"** | ⚠⚠ **SIM — o cache serve ao errado** |
| ⚠ **Sobre o que é "filtrado"** | ⚠⚠ **SIM — o payload passa** |

⚠ **A linha do framing é a que organiza.** **"Os bytes que sobram"** é uma consequência
**observável** — **não uma opinião** — **e é o que faz o smuggling possível.**

⚠ **E a linha do cache é a mais elegante.** **Se duas implementações discordam sobre o que é "a
mesma chave", elas **legitimamente** podem discordar** — **e a consequência é que o cache serve a
resposta de uma requisição a outra.** **A discordância não é um erro de código; é um erro de
**modelo**.**

⚠ **A tabela da consequência → o que ela habilita:**

| Consequência | O que habilita | Onde |
|---|---|---|
| ⚠ **Sobram bytes** | **Smuggling, desync** | Proxy ↔ servidor |
| ⚠ **O filtro vê diferente** | **Bypass** | WAF ↔ servidor |
| ⚠ **A chave é diferente** | **Cache poisoning** | Cache ↔ origem |
| O valor é diferente | ⚠ Nada, se local | Diversos |
| O erro é diferente | ⚠ Nada, se só mensagem | Diversos |

⚠ **A última linha é o filtro dos fracos.** **Implementações que discordam só sobre a **mensagem de
erro** não têm bug** — **e a maioria dos candidatos cai aqui.**

⚠ **A regra escrita, e é a do módulo:**

> **Procure a consequência objetiva.** **Se a discordância produz bytes, chaves ou decisões
> diferentes, ela é bug** — **mesmo que você não consiga dizer qual implementação está errada.**

⚠ **E é a resposta ao §3.1:** **a categoria 3 inclui a discordância **sem culpado identificado** —
**desde que a consequência seja objetiva.**

```bash
cd ~/parser-lab/mod03

echo "═══ 5. a consequência objetiva ═══"
echo
cat > consequencia.md <<'EOF'
# A consequência objetiva

## Quando há consequência
| Discordância sobre | Consequência | Habilita | Onde |
|---|---|---|---|
| ⚠ onde a mensagem TERMINA | sobram bytes | smuggling, desync | proxy ↔ servidor |
| ⚠ o que o FILTRO vê | o filtro falha | bypass | WAF ↔ servidor |
| ⚠ o que é "a mesma CHAVE" | serve ao errado | cache poisoning | cache ↔ origem |
| o encoding | assinatura não casa | bypass | filtro |

## Quando NÃO há
| Discordância sobre | Por quê não |
|---|---|
| 1.234 (número) | ambas defensáveis, sem efeito |
| case | a spec decide |
| a mensagem de erro | ⚠ não muda o efeito |
| o formato da resposta | idem |

⚠ a última linha de cima (mensagem de erro) é onde
   caem a maioria dos candidatos fracos.

## ⚠ A REGRA
procure a CONSEQUÊNCIA OBJETIVA.
se a discordância produz bytes, chaves ou decisões diferentes,
ela é BUG — mesmo sem culpado identificado.

✓ é a resposta à pergunta "quem erra?": às vezes NINGUÉM precisa errar
   para a discordância ser perigosa.
EOF

cat consequencia.md

echo
echo "═══ 6. o exercício: classifique três casos ═══"
echo
cat <<'EXPL'
  ── CASO 1 ──
     A: "1.234" → 1234      (ponto = milhar)
     B: "1.234" → 1.234     (ponto = decimal)
     spec: não decide (convenção de locale)
     → ⚠ categoria 2. vai ao dono da spec. NÃO é bug de implementação.

  ── CASO 2 ──
     A: lê "X-Foo: bar" e IGNORA
     B: lê "X-Foo: bar" e PROCESSA como instrução
     spec: "implementações PODEM definir campos X-"
     → ⚠ depende: se a spec do PROTOCOLO não define X-Foo,
        e B o trata como comando → ⚠ CONSEQUÊNCIA OBJETIVA
        → categoria 3. é bug.

  ── CASO 3 ──
     A: compara header case-INsensitive
     B: compara header case-Sensitive
     spec: "MUST be case-insensitive"
     → ⚠ categoria 1 para A (segue), categoria 3 para B (viola)
     → reporte ao mantenedor de B.

  ✓ e a cascata resolve os três SEM rodar nada.
     a confirmação comportamental só vem depois.
EXPL
```

⚠ **Os três casos exercitam as três categorias.** **E a cascata resolve todos — sem rodar nada.**
**É o valor do método: você filtra antes de gastar tempo.**

⚠ **E o caso 2 é o mais próximo do `WAFFLED`.** **Um campo que uma implementação ignora e a outra
processa** — **e a spec permite a extensão.** **É a divergência entre o **filtro** e o **alvo**.**

**Produza `classificacao.md`:**

| # | Caso | Categoria | Destino |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. **Qual caso é categoria 2?** O que isso significa?
2. **Qual caso é o do `WAFFLED`?** Por quê?
3. **Qual caso tem culpado identificado?**
4. **Por que a categoria 3 não exige culpado?**

---

## 3.4 LAB — Classifique com critério

**Duração:** 120 min

### Passo 1 — Produza discordâncias (45 min)

⚠ **Use as duas implementações do módulo 2, ou duas do seu lab.**

```bash
cd ~/parser-lab/mod03

echo "═══ PRODUZINDO DISCORDÂNCIAS ═══"
echo
cat <<'EXPL'
  ── com duas implementações no seu lab ──

     1. monte um corpus MÍNIMO (8 a 12 entradas)
        ⚠ de FRONTEIRA, por ponto da carta (módulo 2)
     2. rode as duas em cada entrada
     3. registre onde discordam
     4. ⚠ NÃO classifique ainda — só colete
EXPL

mkdir -p ~/parser-lab/corpus/treino && cd ~/parser-lab/corpus/treino

cat > num.txt <<'EOF'
1234
1.234
1,234
1.234,56
1,234.56
0
-0
99999999999999999999
.5
5.
EOF

echo "  ── o corpus mínimo ──"
cat -n num.txt | sed 's/^/     /'
echo

cd ~/parser-lab/impls/treino 2>/dev/null || cd ~/parser-lab/mod03

cat > compara.sh <<'SCRIPT'
#!/usr/bin/env bash
# compara.sh — roda DUAS implementações no mesmo corpus
set -uo pipefail
A="${1:?uso: compara.sh <impl-A> <corpus> <impl-B>}"
CORPUS="${2:?informe o corpus}"
B="${3:?informe a impl B}"

echo "═══════════ COMPARAÇÃO ═══════════"
printf '  %-24s %-20s %-20s %s\n' "entrada" "A" "B" "discordam?"
printf '  %-24s %-20s %-20s %s\n' "───────" "─" "─" "──────────"

while IFS= read -r linha; do
    [ -z "$linha" ] && continue
    ra=$(echo "$linha" | python3 "$A" 2>/dev/null | cut -f2)
    rb=$(echo "$linha" | python3 "$B" 2>/dev/null | cut -f2)
    if [ "$ra" != "$rb" ]; then
        printf '  %-24s %-20s %-20s ⚠ SIM\n' "$linha" "$ra" "$rb"
    else
        printf '  %-24s %-20s %-20s não\n' "$linha" "$ra" "$rb"
    fi
done < "$CORPUS"
SCRIPT

chmod +x compara.sh

if [ -f impl_a.py ] && [ -f impl_b.py ]; then
    ./compara.sh impl_a.py ~/parser-lab/corpus/treino/num.txt impl_b.py 2>&1 | head -18
else
    echo "  ⚠ as implementações do módulo 2 não estão aqui — recrie-as ou use as suas"
fi
```

Produza `discordancias.md`:

| Entrada | A | B | Discordam? |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

**Responda:**

1. **Quantas entradas discordam?** Quantas concordam?
2. **Quais entradas são de fronteira?**
3. **Alguma discordância é sobre framing?** (aqui, "onde o número termina")
4. **Você classificou antes de coletar?** Não deveria.

### Passo 2 — Classifique com a cascata (45 min)

⚠ **Agora sim. Cinco perguntas por discordância.**

```bash
cd ~/parser-lab/mod03

echo "═══ CLASSIFICANDO ═══"
echo
cat <<'EXPL'
  ── para CADA discordância, responda em ordem ──

     Q1: a spec DECIDE este caso?
         → NÃO  = categoria 2 (ambiguidade) — FIM
         → SIM  = Q2

     Q2: as DUAS seguem a spec?
         → SIM  = categoria 1 (legítima) — FIM
         → NÃO  = Q3

     Q3: quais violam?
         → uma    = categoria 3
         → as duas = categoria 3 dupla

     E o teste transversal:
     ⚠ a discordância é sobre ONDE A COISA TERMINA?
        → o número? o campo? a mensagem?
        → ⚠ SIM = prioridade máxima
EXPL

cat > caderno/PD-003.md <<'EOF'
# PD-003 — classificação de discordâncias

**Data:** ____

## 1. O par e a spec
| Item | Valor |
|---|---|
| Formato | |
| Spec (URL / versão) | |
| Impl. A | |
| Impl. B | |

## 2. As discordâncias coletadas
| # | Entrada | A | B | Discordam? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

## 3. A classificação
| # | Entrada | Q1 spec decide? | Q2 as duas seguem? | Categoria | Destino |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## 4. A consequência objetiva
| # | Discordância sobre | Consequência | Habilita |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 5. As cinco perguntas (só para as candidatas)
| # | Caso | Alcançável? | Camada normaliza? | Impacto? | Pode ser explorado? |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |

## 6. O veredito
| # | Candidato | É bug? | Vai a quem |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 7. O que NÃO foi verificado
⚠ mínimo 3:
-
-
-

## 8. O que isso destrava
| # | Próxima pergunta | Prioridade |
|---|---|---|
EOF

cat caderno/PD-003.md | head -30
```

Produza `classificado.md`:

| # | Entrada | Q1 | Q2 | Categoria | É bug? |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

**Responda:**

1. **Quantas discordâncias são categoria 1?** E 2? E 3?
2. **Alguma tem consequência objetiva?**
3. **Qual vai ao dono da spec?** Por quê?
4. **Qual é bug de implementação?**

### Passo 3 — O relatório de triagem (30 min)

Produza `relatorio-triagem.md`:

```markdown
# Triagem de discordâncias — relatório

## 1. O par e a spec
| Item | Valor |
|---|---|
| Formato | |
| Spec | |
| Impl. A / B | |
| Versões | |

## 2. O método
| Etapa | O que fiz |
|---|---|
| 1 | carta de divergência (módulo 2) |
| 2 | corpus de fronteira |
| 3 | comparação |
| 4 | classificação pela cascata |
| 5 | as cinco perguntas |

## 3. As discordâncias, por categoria
| Categoria | Quantas | Destino |
|---|---|---|
| 1 — legítima | | — |
| 2 — ambiguidade | | ⚠ o dono da spec |
| 3 — viola a spec | | o mantenedor |
| **total** | | |

## 4. ⚠ A consequência objetiva
| # | Discordância sobre | Consequência | Habilita |
|---|---|---|---|
| | | | |

## 5. As cinco perguntas, aplicadas
| # | Caso | 1 spec | 2 alcance | 3 camada | 4 impacto | 5 explorável |
|---|---|---|---|---|---|---|
| | | | | | | |

## 6. Os falsos positivos que eu quase reportei
| # | Falso positivo | Qual pergunta o eliminou |
|---|---|---|
| 1 | | |
| 2 | | |

## 7. O veredito
| # | Achado | Categoria | Destino | Prioridade |
|---|---|---|---|---|
| 1 | | | | |

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O que isso destrava
| # | Próxima pergunta | Prioridade |
```

**Produza `relatorio.md`:**

| Categoria | Quantas | Destino |
|---|---|---|
| Legítima | | |
| Ambiguidade | | |
| Viola a spec | | |

**Responda:**

1. **Quantas discordâncias você coletou?** Quantas sobreviveram?
2. **Qual pergunta eliminou mais?**
3. **Quais falsos positivos você quase reportou?**
4. **Qual o destino de cada achado?**

### Critérios de aceitação

- `categorias.md` com as **três** categorias e o destino de cada.
- Você explicou **por que a categoria 2 é a armadilha**.
- Você explicou **por que a categoria 3 sem culpado é válida**.
- A **pergunta cascata** em três níveis, com o teste de framing transversal.
- `verificacao.md` com as **cinco** perguntas e o que cada uma elimina.
- Você explicou **o que "é explorável" NÃO significa**.
- Você identificou os **três** falsos positivos clássicos.
- `consequencia.md` com a tabela de consequência → o que habilita.
- Você explicou **por que a discordância de mensagem de erro não é bug**.
- Você classifica o caso do número como **categoria 2** e explica por quê.
- Você classifica o caso do `X-` como **consequência objetiva**.
- `discordancias.md` com o corpus rodado nas **duas** implementações.
- Você **coletou antes de classificar**.
- `caderno/PD-003.md` com a cascata aplicada a **pelo menos três** casos.
- `relatorio-triagem.md` com as **nove** seções.
- Você identificou **pelo menos um** falso positivo que quase reportou.
- Você disse **a quem vai** cada achado.
- ⚠ **Nenhum serviço de terceiro.**

---

## Avaliação

1. **Por que achar a discordância é fácil e classificá-la é o trabalho?**
2. **Cite as três categorias.**
3. **Por que só a terceira vale?**
4. **Por que a categoria 2 é a armadilha?** A quem vai?
5. **Cite os três subtipos da categoria 3.**
6. **Qual é o critério prático do curso?** Por quê?
7. **Por que a discordância de framing não exige culpado?**
8. **Cite as cinco perguntas de verificação.**
9. **Qual pergunta é a mais dura?** Por quê?
10. **O que "pode ser explorado" NÃO significa?**
11. **O que a pergunta 3 elimina?** Dê um exemplo.
12. **Cite os três falsos positivos clássicos.**
13. **Qual é o mais importante para este curso?** Por quê?
14. **O que é consequência objetiva?**
15. **Cite quatro discordâncias com consequência e o que cada uma habilita.**
16. **Qual discordância NÃO é bug?** Dê dois exemplos.
17. **Por que a discordância sobre a mensagem de erro não é bug?**
18. **Por que a categoria 3 não exige culpado identificado?**
19. **O que o `HTTP Garden` filtrou** para tornar o trabalho crível?
20. **Por que passar nas cinco perguntas não faz o achado bom?**

---

**Próximo:** [Módulo 4 — O lab de N implementações](modulo-04.md)
