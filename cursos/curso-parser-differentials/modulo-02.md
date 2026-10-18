# Módulo 2 — Spec, Implementação, e o Espaço em Aberto

**Carga:** 3 horas (1h30 teoria · 1h30 lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Ler uma spec procurando **os pontos onde ela deixa em aberto**.
2. Reconhecer os **sete tipos** de espaço em aberto.
3. Construir a **carta de divergência** de um formato — antes de testar.
4. Usar os **níveis de conformidade** (`must` / `should` / `may`) como guia.
5. Prever onde a divergência estará, **sem rodar nada**.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **A spec não é um programa. É um conjunto de frases — e as frases têm força diferente.** **Saber
> ler a força é saber onde a divergência está.**

⚠ **O instrumento, e ele são três palavras:**

| Palavra | Força | O que acontece |
|---|---|---|
| **MUST** / **SHALL** | ⚠ **Obrigatório** | Todos fazem igual |
| **SHOULD** / **RECOMMENDED** | ⚠ **Recomendado** | ⚠ **Divergem** |
| **MAY** / **OPTIONAL** | ⚠ **Permitido** | ⚠ **Divergem muito** |
| ⚠ **silêncio** | **Nada** | ⚠⚠ **É onde mais diverge** |

⚠ **A tese:** **você não precisa ler a spec inteira.** **Você procura as palavras de força fraca e
os silêncios** — **e é onde a divergência está.**

⚠ **E a última linha é a mais importante.** **O silêncio é a origem principal.** **A spec que
**não diz nada** sobre um caso deixa cada implementador decidir** — **e a divergência nasce daí.**

⚠ **A regra, e ela é o método:**

> **`MUST` é onde testar não rende — todos seguem. `SHOULD`, `MAY` e o silêncio são onde o
> rendimento está.**

---

## 2.1 Os sete tipos de espaço em aberto

⚠ **Os sete, com o exemplo de cada. E os sete são reconhecíveis por leitura.**

| # | Tipo | O que é | Exemplo |
|---|---|---|---|
| 1 | **Silêncio** | a spec não trata | Dois headers iguais — qual vence? |
| 2 | **`SHOULD`** | recomendação vaga | "deve ser robusto" |
| 3 | **`MAY`** | opcional | "pode aceitar espaços" |
| 4 | **Ambiguidade lexical** | duas gramáticas válidas | `1.234` como número |
| 5 | **Ausência de limite** | não define tamanho | campo de tamanho variável |
| 6 | **Ordem não especificada** | quando aplicar | normalizar antes ou depois? |
| 7 | ⚠ **Extensão** | a spec permite estender | `X-` headers |

⚠ **O tipo 6 é o mais sutil e o mais produtivo.** **Se a spec não diz **quando** normalizar**, **uma
implementação normaliza antes de comparar e a outra depois** — **e a discordância é a
consequência.** **É a origem de muitos bypasses de WAF.**

⚠ **O tipo 7 é o mais subestimado.** **Toda spec que permite `X-` deixa um espaço livre** — **e o
que uma implementação ignora, a outra processa.** **É a razão de o `WAFFLED` funcionar.**

⚠ **A tabela do tipo → onde procurar:**

| Tipo | Onde procurar na spec |
|---|---|
| **Silêncio** | os casos que ela **não** menciona |
| `SHOULD` | grep por `should` |
| `MAY` | grep por `may` |
| Ambiguidade | ⚠ **as gramáticas alternativas** |
| Limite | ⚠ **os campos sem tamanho máximo** |
| Ordem | ⚠ **onde o "quando" não está dito** |
| Extensão | ⚠ **onde ela permite `X-`** |

⚠ **A regra escrita:**

> **Sete tipos, e cada um é localizável por leitura.** **Você constrói a carta antes de testar** —
> **e o teste confirma.**

```bash
mkdir -p ~/parser-lab/mod02 && cd ~/parser-lab/mod02

echo "═══ 1. os sete tipos ═══"
echo
cat > sete-tipos.md <<'EOF'
# Os sete tipos de espaço em aberto

| # | Tipo | O que é | Onde procurar |
|---|---|---|---|
| 1 | SILÊNCIO | a spec não trata | os casos NÃO mencionados |
| 2 | `SHOULD` | recomendação vaga | grep `should` |
| 3 | `MAY` | opcional | grep `may` |
| 4 | AMBIGUIDADE lexical | duas gramáticas válidas | gramáticas alternativas |
| 5 | AUSÊNCIA DE LIMITE | não define tamanho | campos sem máximo |
| 6 | ⚠ ORDEM não especificada | quando aplicar | onde o "quando" falta |
| 7 | ⚠ EXTENSÃO | permite estender | onde permite `X-` |

## ⚠ o tipo 6 é o mais sutil
se a spec não diz QUANDO normalizar,
uma normaliza antes de comparar, a outra depois.
✓ é a origem de muitos bypasses.

## ⚠ o tipo 7 é o mais subestimado
toda spec que permite `X-` deixa um espaço livre.
o que uma IGNORA, a outra PROCESSA.
✓ é a razão de o WAFFLED funcionar.

## A força das palavras
| Palavra | Força | Divergem? |
|---|---|---|
| MUST / SHALL | obrigatório | ⚠ não |
| SHOULD / RECOMMENDED | recomendado | ⚠ SIM |
| MAY / OPTIONAL | permitido | ⚠ SIM muito |
| ⚠ silêncio | nada | ⚠⚠ MUITO |
EOF

cat sete-tipos.md

echo
echo "═══ 2. lendo a spec por força ═══"
echo
cat <<'EXPL'
  ── o comando que você usa numa RFC ou num doc ──
     (salve a spec em texto primeiro)

     grep -n -i '\bshould\b'  spec.txt    ← tipo 2
     grep -n -i '\bmay\b'     spec.txt    ← tipo 3
     grep -n -i 'if present'  spec.txt    ← tipo 1 (o silêncio disfarçado)
     grep -n -i 'undefined'   spec.txt    ← tipo 1 declarado
     grep -n -i 'not specified' spec.txt  ← ⚠ tipo 1 EXPLÍCITO
     grep -n -i 'implementation' spec.txt ← quem decide?

  ⚠ "behavior is implementation-defined" é a spec
     DIZENDO que não decide. é ouro.

  ✓ e "if present" é o silêncio disfarçado:
     a spec diz o que fazer SE o campo vier —
     e NÃO diz o que fazer se vier MALFORMADO.
EXPL

echo
echo "  ── demonstrando a leitura, com um texto de spec ──"
cat > spec-exemplo.txt <<'EOF'
Exemplo de especificação (didática)

3.1. O campo de tamanho

   O campo de tamanho DEVE ser um inteiro decimal não negativo.
   O receptor DEVE rejeitar valores que excedam o limite.

3.2. Campos duplicados

   Se um campo aparece mais de uma vez, o receptor DEVE usar o
   primeiro valor. Implementações PODEM emitir um aviso.

3.3. Espaços em branco

   Espaços em branco ao redor do valor DEVEM ser ignorados.
   Um receptor PODE aceitar espaços internos. O comportamento
   para espaços em outros caracteres NÃO É DEFINIDO.

3.4. Extensões

   Implementações PODEM definir campos com o prefixo X-.
   O comportamento de campos desconhecidos não é especificado.

3.5. Normalização

   O receptor DEVE normalizar o valor antes de usar.
EOF

echo "     ── os pontos de divergência neste texto ──"
echo
printf '     %-42s %s\n' "TIPO" "LINHA"
printf '     %-42s %s\n' "────" "─────"
grep -n -i '\bshould\b\|\bmay\b\|PODE\|PODEM\|não é especificado\|NÃO É DEFINIDO\|não é definido' spec-exemplo.txt | \
    sed 's/^/     ⚠ /'
echo
echo "     ✓ conte: cada linha acima é um ponto de divergência."
echo "        e cada um é localizável SEM rodar nada."
```

⚠ **O comando de leitura é o instrumento.** **E a linha dos `PODE` / `PODEM` é a mais direta:** cada
`MAY` é um ponto onde duas implementações podem **legitimamente divergir**.

⚠ **E a seção 3.5 do exemplo é a armadilha do tipo 6.** **"Normalizar antes de usar"** — mas
**antes de usar o quê?** **Comparar? Exibir? Armazenar?** **O "quando" não está dito.**

⚠ **A regra escrita:**

> **O texto da spec é o mapa da divergência.** **Cada `MAY` é uma bifurcação; cada silêncio é um
> cruzamento sem placa.**

**Produza `sete-tipos.md`:**

| # | Tipo | Onde procurar | No seu formato |
|---|---|---|---|
| 1 | Silêncio | | |
| 2 | `SHOULD` | | |
| 3 | `MAY` | | |
| 6 | Ordem | | |
| 7 | Extensão | | |

**Responda:**

1. **Qual tipo é o mais sutil?** Por que é produtivo?
2. **Qual é o mais subestimado?**
3. **Por que "if present" é o silêncio disfarçado?**
4. **O que `implementation-defined` significa** para você?

---

## 2.2 A carta de divergência

⚠ **O instrumento do módulo: você constrói a **carta** antes de testar. E ela é a hipótese.**

| Etapa | O que fazer | Resultado |
|---|---|---|
| 1 | **Leia a spec** | Os pontos de força fraca |
| 2 | **Liste os pontos** | A carta |
| 3 | **Preveja o comportamento** | ⚠ **O que cada impl. fará** |
| 4 | **Ordene por suspeita** | ⚠ **O que testar primeiro** |

⚠ **A etapa 3 é a que a maioria pula — e é a que faz a diferença.** **Você **prevê** o que cada
implementação fará** — **e a previsão é uma **hipótese com critério de falsificação**.** **Se o teste
concordar, você entendeu; se discordar, você aprendeu algo novo.**

⚠ **A tabela do que a carta contém, por ponto:**

| Campo | Valor |
|---|---|
| **O ponto** | a linha da spec |
| **O tipo** | 1–7 |
| **O que A deve fazer** | a previsão |
| **O que B deve fazer** | a previsão |
| ⚠ **O impacto** | o que a divergência habilita |
| **Prioridade** | o que testar primeiro |

⚠ **A coluna do impacto é o que separa a carta útil da acadêmica.** **Uma divergência sem impacto é
curiosidade.** **É o mesmo critério do Patch Diffing:** **sinal é o que muda comportamento — e
aqui, impacto é o que muda **segurança**.**

⚠ **E a prioridade é econômica.** **Você não testa os 40 pontos.** **Testa os 5 com maior impacto** —
**e é o filtro antes do teste.**

⚠ **A regra escrita:**

> **A carta é a hipótese.** **Você a escreve antes de rodar** — **e ela diz onde procurar, e o que
> esperar.** **Testar sem carta é fuzzing; testar com carta é pesquisa.**

```bash
cd ~/parser-lab/mod02

echo "═══ 3. a carta de divergência ═══"
echo
cat > carta.md <<'EOF'
# Carta de divergência

## Do formato
| Item | Valor |
|---|---|
| Formato | |
| Spec (URL / versão) | |
| Aderência esperada | alta / média / baixa |

## Os pontos
| # | O ponto (linha da spec) | Tipo (1–7) | O que A faz | O que B faz | ⚠ Impacto | Prioridade |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |

## Os cinco que vou testar primeiro
| # | Ponto | Por que primeiro |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |

## A hipótese principal
| Campo | Valor |
|---|---|
| Afirmação | |
| Observação | |
| **Falsificação** | |

## ⚠ O que eu NÃO vou testar, e por quê
| Ponto | Por quê não |
|---|---|
| | sem impacto |
| | precisa de contexto que não tenho |
| | é `MUST` — todos seguem |
EOF

cat carta.md

echo
echo "═══ 4. o impacto, por tipo de ponto ═══"
echo
cat <<'EXPL'
  ┌──────────────────────┬───────────────────────────────────────────┐
  │ PONTO                │ O QUE A DIVERGÊNCIA HABILITA              │
  ├──────────────────────┼───────────────────────────────────────────┤
  │ duplicatas           │ ⚠ smuggling, bypass de filtro             │
  │ TE vs. CL            │ ⚠ request smuggling                       │
  │ espaços em branco    │ ⚠ bypass de WAF (evasão de assinatura)    │
  │ encoding             │ ⚠ bypass de filtro (%xx, unicode)         │
  │ ordem de normalização│ ⚠ bypass (o filtro vê um, o alvo outro)   │
  │ limite de campo      │ DoS, overflow                             │
  │ extensão (`X-`)      │ ⚠ o que um ignora, o outro processa       │
  │ case sensitivity     │ bypass de assinatura                      │
  └──────────────────────┴───────────────────────────────────────────┘

  ⚠ a coluna direita é o FILTRO.
     você testa primeiro o que tem impacto —
     e não o que é mais fácil de testar.
EXPL
```

⚠ **A tabela de impacto é o filtro.** **E note que quase tudo na coluna direita é bypass** — **porque
a divergência entre filtro e alvo é o caso de maior rendimento.**

⚠ **E a ordem de normalização é a mais elegante.** **O filtro normaliza **depois** de comparar; o
alvo, **antes**.** **A assinatura casa num lado e não no outro** — **e o payload passa.**

**Produza `carta.md`:**

| # | Ponto | Tipo | Impacto | Prioridade |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Responda:**

1. **Por que a carta vem antes do teste?**
2. **O que a coluna de impacto filtra?**
3. **Por que a ordem de normalização é produtiva?**
4. **Quais pontos você descartou?** Por quê?

---

## 2.3 Prever sem rodar

⚠ **O exercício central do módulo: **prever** o comportamento — e depois verificar.**

⚠ **A previsão se apoia em três coisas:**

| Apoio | O que dá |
|---|---|
| **A linguagem da implementação** | ⚠ O que a stdlib tende a fazer |
| **A idade da implementação** | ⚠ Implementação antiga tolera mais |
| **O propósito** | ⚠ Filter, proxy e servidor querem coisas diferentes |

⚠ **A coluna do propósito é a mais poderosa.** **E ela explica a divergência estruturalmente:**

| Implementação | Quer | ⚠ Consequência |
|---|---|---|
| **Servidor** | aceitar o cliente | ⚠ Tolerante |
| **Proxy** | encaminhar | ⚠ Repassa o que não entende |
| **WAF** | bloquear | ⚠ Rígido na comparação, frouxo no repasse |
| **Cache** | identificar | ⚠ Normaliza para a chave |
| **Cliente** | ser aceito | ⚠ Manda o "normal" |

⚠ **A linha do WAF é a que explica o `WAFFLED`.** **O WAF é **rígido** onde compara e **frouxo** onde
repasse** — **e o repasse é o que chega ao servidor.** **A divergência é estrutural, não um bug de
implementação.**

⚠ **E a linha do cache explica o cache poisoning.** **O cache normaliza para a **chave**; a origem
normaliza para **processar**.** **E as duas normalizações não são a mesma** — **então duas
requisições diferentes compartilham a chave.**

⚠ **A regra escrita:**

> **A divergência é estrutural.** **Implementações com propósitos diferentes divergem** — **e é por
> isso que ela existe em produtos maduros, testados e mantidos.**

⚠ **E é a resposta à pergunta "por que isso ainda existe em 2026".** **Porque não é descuido:** é
**propósito diferente** — **e propósito não se corrige com patch.**

```bash
cd ~/parser-lab/mod02

echo "═══ 5. prever pelo propósito ═══"
echo
cat > proposito.md <<'EOF'
# Prever pelo propósito

## A tabela
| Implementação | Quer | Consequência |
|---|---|---|
| SERVIDOR | aceitar o cliente | ⚠ tolerante |
| PROXY | encaminhar | ⚠ repassa o que não entende |
| WAF | bloquear | ⚠ rígido na comparação, frouxo no repasse |
| CACHE | identificar | ⚠ normaliza para a CHAVE |
| CLIENTE | ser aceito | ⚠ manda o "normal" |

## ⚠ o WAF (o caso WAFFLED)
o WAF é RÍGIDO onde compara e FROUXO onde repassa.
e o REPASSE é o que chega ao servidor.
✓ a divergência é estrutural, não um bug.

## ⚠ o cache (cache poisoning)
o cache normaliza para a CHAVE; a origem, para PROCESSAR.
⚠ e as duas normalizações não são a mesma.
→ duas requisições diferentes compartilham a chave.

## Os três apoios da previsão
| Apoio | O que dá |
|---|---|
| a linguagem | o que a stdlib tende a fazer |
| a idade | implementação antiga tolera mais |
| ⚠ o PROPÓSITO | o que ela QUER |

## ⚠ A REGRA
a divergência é ESTRUTURAL.
implementações com propósitos diferentes divergem.
✓ é por isso que ela existe em produtos maduros.
EOF

cat proposito.md

echo
echo "═══ 6. o exercício: preveja, depois teste ═══"
echo
cat <<'EXPL'
  ── escolha UM ponto da sua carta ──

     1. ⚠ PREVEJA:
        · o que a implementação A fará
        · o que a implementação B fará
        · e POR QUÊ (a linguagem, a idade, o propósito)

     2. ESCREVA a previsão, com o critério de falsificação:
        "prevejo que A retorna X e B retorna Y.
         ⚠ se ambas retornarem o mesmo, a hipótese é FALSIFICADA."

     3. TESTE com a entrada do ponto

     4. COMPARE:
        · acertou? → você entendeu o mecanismo
        · errou?   → ⚠ você aprendeu algo novo — registre

  ✓ e o passo 4 é o que o curso quer:
     prever e testar, e registrar os dois resultados.
EXPL
```

⚠ **O ciclo prever-testar-registrar é o método.** **E o erro é resultado** — **porque significa que o
mecanismo é outro.** **É o mesmo princípio do módulo 6 do Pesquisa: a hipótese falsificada ensina.**

⚠ **E é o que torna o curso diferente de fuzzing.** **O fuzzer não prevê; ele só encontra.** **Você
prevê, testa e entende** — **e é o que permite generalizar.**

**Produza `previsao.md`:**

| # | Ponto | Previsão A | Previsão B | Acertou? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

**Responda:**

1. **O que você previu?** E o teste confirmou?
2. **Por que o propósito explica a divergência?**
3. **O que o `WAFFLED` explora estruturalmente?**
4. **Por que a divergência existe em produtos maduros?**

---

## 2.4 LAB — A carta de um formato real

**Duração:** 90 min

### Passo 1 — Leia a spec e construa a carta (45 min)

⚠ **Escolha um formato com spec **curta**. A RFC 4180 (CSV) tem 3 páginas.**

```bash
cd ~/parser-lab/mod02

echo "═══ CONSTRUINDO A CARTA ═══"
echo
cat <<'EXPL'
  ── OPÇÕES DE SPEC CURTA ──
     · RFC 4180 — CSV                (⚠ a melhor para começar)
     · RFC 3986 — URI                (boa)
     · ISO 8601 — datas               (boa)
     · RFC 4648 — base64             (curta e clara)
     · JSON (RFC 8259)               (média, com boas brechas)

  ── O QUE FAZER ──
     1. baixe a spec em texto
        ex.: curl -s https://www.rfc-editor.org/rfc/rfc4180.txt > spec.txt
     2. ⚠ aplique a LEITURA POR FORÇA
     3. liste os pontos na carta
     4. preveja o comportamento
     5. ordene por impacto
EXPL

# demonstra a leitura numa spec curta real
echo
echo "  ── baixando a RFC 4180 (CSV) para demonstrar ──"
if curl -s --max-time 20 https://www.rfc-editor.org/rfc/rfc4180.txt -o /tmp/rfc4180.txt 2>/dev/null && [ -s /tmp/rfc4180.txt ]; then
    printf '     ✓ baixada: %s linhas\n' "$(wc -l < /tmp/rfc4180.txt)"
    echo
    echo "     ── os pontos de força fraca ──"
    grep -n -iE '\bshould\b|\bmay\b|\boptional\b|\bnot specified\b|\bimplementation\b' /tmp/rfc4180.txt | \
        head -15 | sed 's/^/     ⚠ /'
    echo
    echo "     ⚠ cada linha acima é um PONTO DE DIVERGÊNCIA da RFC 4180."
else
    echo "     ⚠ não foi possível baixar — use a spec que você tiver"
    echo "        (a leitura por força funciona em qualquer texto de spec)"
fi

echo
echo "═══ E A LEITURA, PASSO A PASSO ═══"
cat <<'EXPL'
  ── PARA A RFC 4180 (CSV), OS PONTOS CLÁSSICOS ──

     1. ASPAS DENTRO DE CAMPO COM ASPAS
        · "" é o escape — mas e se houver aspas soltas?
        ⚠ a spec NÃO diz. → tipo 1 (silêncio)

     2. CRLF vs. LF
        · a spec diz CRLF. e o LF sozinho?
        ⚠ muitos aceitam. → tipo 2 (`should`)

     3. QUEBRA DE LINHA DENTRO DE CAMPO
        · só permitida dentro de aspas — mas e se não?
        ⚠ undefined. → tipo 1

     4. LINHA FINAL SEM QUEBRA
        · a spec diz que DEVE ter. e se não tiver?
        ⚠ tolerado por muitos. → tipo 2

     5. ESPAÇOS APÓS A VÍRGULA
        · "a, b" → o campo é " b" ou "b"?
        ⚠ a spec não decide. → tipo 6

  ✓ e cada um desses é TESTÁVEL com duas implementações.
     ⚠ nenhum é exploit — mas todos são discordância.
EOF
```

⚠ **A RFC 4180 é o instrumento didático perfeito.** **Três páginas, e cinco pontos de divergência
clássicos** — **todos verificáveis e nenhum ofensivo.** **Você aprende o método inteiro sem
risco.**

⚠ **E o ponto 5 é o tipo 6 em forma pura.** **"a, b" — o campo tem o espaço ou não?** **A spec não
decide** — **e as implementações discordam.** **É a divergência.**

**Produza `carta-csv.md`:**

| # | Ponto | Tipo | Previsão A | Previsão B | Impacto |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

**Responda:**

1. **Quantos pontos você encontrou na spec?**
2. **Qual é o tipo predominante?** Por quê?
3. **Qual ponto você testaria primeiro?** Por quê?
4. **A leitura por força funcionou?** Quantos `may`/`should` você achou?

### Passo 2 — Confirme com as duas implementações (45 min)

⚠ **Agora o teste. E a regra é: a mesma entrada, duas implementações, e a comparação.**

```bash
cd ~/parser-lab/impls/treino 2>/dev/null || cd ~/parser-lab/mod02

echo "═══ CONFIRMANDO A CARTA ═══"
echo

# duas implementações de número, com discordância real
cat > impl_a.py <<'PY'
#!/usr/bin/env python3
"""impl A — normaliza vírgula como decimal (convenção BR)"""
import sys
for l in sys.stdin:
    s = l.strip()
    if not s: continue
    try:
        print(f"{s}\t{float(s.replace('.','').replace(',','.'))}")
    except ValueError:
        print(f"{s}\tINVALIDO")
PY

cat > impl_b.py <<'PY'
#!/usr/bin/env python3
"""impl B — ponto é decimal, vírgula é milhar (convenção US)"""
import sys
for l in sys.stdin:
    s = l.strip()
    if not s: continue
    try:
        print(f"{s}\t{float(s.replace(',',''))}")
    except ValueError:
        print(f"{s}\tINVALIDO")
PY

chmod +x impl_a.py impl_b.py

echo "  ── a discordância, por entrada ──"
printf '  %-14s %-20s %-20s %s\n' "entrada" "impl A (BR)" "impl B (US)" "discordam?"
printf '  %-14s %-20s %-20s %s\n' "───────" "───────────" "───────────" "──────────"
for v in "1234" "1.234" "1,234" "1.234,56" "1,234.56"; do
    a=$(echo "$v" | python3 impl_a.py 2>/dev/null | cut -f2)
    b=$(echo "$v" | python3 impl_b.py 2>/dev/null | cut -f2)
    d=$([ "$a" != "$b" ] && echo "⚠ SIM" || echo "não")
    printf '  %-14s %-20s %-20s %s\n' "$v" "$a" "$b" "$d"
done

echo
echo "═══ A CARTA CONFIRMADA ═══"
cat <<'EXPL'
  ⚠ as duas implementações estão "certas" —
     cada uma segue a convenção do seu locale.

  e para a entrada "1.234":
     · A diz  1234        (ponto = milhar)
     · B diz  1.234       (ponto = decimal)

  ✓ a SPEC não decide: a convenção é do locale.
     ⚠ e é exatamente o que o módulo 3 classifica:
        divergência LEGÍTIMA, ou BUG?
EXPL

cat > /tmp/carta-confirmada.md <<'EOF'
# Carta confirmada

## A previsão vs. o observado
| # | Ponto | Previsão | Observado | Acertou? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

## A evidência
| entrada | impl A | impl B | discordam? |
|---|---|---|---|
| | | | |

## ⚠ A primeira classificação (módulo 3 formaliza)
| Ponto | É bug? | Por quê |
|---|---|---|
| | | |
EOF
cat /tmp/carta-confirmada.md
```

⚠ **A observação final é a ponte para o módulo 3.** **As duas estão "certas"** — **cada uma segue a
convenção do seu locale.** **E é aí que a pergunta "é bug?" se torna difícil** — **e é o módulo
seguinte.**

⚠ **E demonstra que a previsão funciona:** **você previu pela convenção (o "propósito") e
acertou.** **É o método do §2.3 validado.**

**Produza `confirmacao.md`:**

| Entrada | A | B | Discordam? |
|---|---|---|---|
| | | | |

**Responda:**

1. **A previsão acertou?** Em quais pontos?
2. **Onde a previsão errou?** O que isso ensina?
3. **As duas estão certas?** A spec decide?
4. **Qual o próximo passo** — a classificação?

### Critérios de aceitação

- `sete-tipos.md` com os **sete** tipos e onde procurar cada.
- Você explicou **por que o tipo 6 é o mais sutil**.
- Você explicou **por que o tipo 7 é o mais subestimado**.
- Você aplicou a **leitura por força** — grep de `should`/`may`.
- Você explicou **o que `implementation-defined` significa** para você.
- Você explicou **por que "if present" é silêncio disfarçado**.
- `carta.md` com os **oito** campos por ponto.
- Você explicou **por que a carta vem antes do teste**.
- Você explicou **o que a coluna de impacto filtra**.
- `proposito.md` com a tabela das **cinco** implementações e o que cada uma quer.
- Você explicou **por que o WAF é rígido na comparação e frouxo no repasse**.
- Você explicou **por que a divergência existe em produtos maduros**.
- Você **previu** o comportamento de pelo menos um ponto — **com critério de falsificação**.
- `carta-csv.md` com **pelo menos três** pontos da RFC 4180.
- Você baixou (ou usou) uma spec real e a leu por força.
- As **duas implementações** rodaram e a discordância apareceu.
- Você explicou **por que as duas estão certas** no caso do número.
- ⚠ **Nenhum serviço de terceiro.**

---

## Avaliação

1. **Por que a spec não é um programa?**
2. **Cite a força das três palavras** e do silêncio.
3. **Este curso disse: `MUST` é onde testar não rende.** Por quê?
4. **Cite os sete tipos** de espaço em aberto.
5. **Qual é o mais sutil?** Por que é produtivo?
6. **Qual é o mais subestimado?**
7. **Dê um exemplo do tipo 6** que não seja do HTTP.
8. **Por que `implementation-defined` é ouro?**
9. **Por que "if present" é o silêncio disfarçado?**
10. **Cite os comandos** da leitura por força.
11. **O que a carta de divergência contém?** Cite os campos.
12. **Por que a carta vem antes do teste?**
13. **O que a coluna de impacto filtra?**
14. **Por que os cinco pontos de prioridade, e não os 40?**
15. **O que explica a divergência estruturalmente?**
16. **O que a implementação WAF quer?** E o que disso decorre?
17. **O que o cache quer?** Por que isso gera poisoning?
18. **Por que a divergência existe em produtos maduros e mantidos?**
19. **O que a previsão exige** para ser hipótese?
20. **Por que o erro de previsão é resultado?**

---

**Próximo:** [Módulo 3 — Divergência legítima vs. bug](modulo-03.md)
