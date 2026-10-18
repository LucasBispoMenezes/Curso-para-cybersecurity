# Módulo 8 — Registro de Pesquisa

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Entender por que o **registro é o produto**, não a burocracia.
2. Manter um caderno **reprodutível por outra pessoa**.
3. Registrar **evidência** de forma que sobreviva.
4. Ligar investigações — o **grafo** e não a lista.
5. Reconhecer os **quatro erros** que tornam um registro inútil.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Se você não consegue reconstruir o seu próprio raciocínio três meses depois, o registro
> falhou.** E se outra pessoa não consegue, ele não serve para nada.

⚠ **A diferença é de propósito:**

| Registro para você | Registro para outro |
|---|---|
| Lembrar o que fez | ⚠ **Reproduzir o que você fez** |
| Anotações soltas | **Hipótese, teste, evidência, conclusão** |
| ⚠ "cheguei à conclusão X" | **"com Y, observei Z, logo X"** |
| Basta a lembrança | ⚠ **Basta o documento** |

⚠ **A tese:** **pesquisa é acumulativa, e o que acumula é o REGISTRO.** **Sem ele, cada investigação
começa do zero** — **porque você esqueceu o que já tinha eliminado.**

⚠ **É a mesma razão do `HTTP Garden` valer mais que 100 writeups soltos.** O paper **registra o
método** — e o método é **reutilizável**; os bugs, não.

---

## 8.1 O caderno — estrutura por investigação

⚠ **A ficha tem dez seções, e o módulo 1 já as apresentou. Aqui, a **disciplina de preencher**
e o que cada uma garante.**

| Seção | Garante | ⚠ Se faltar |
|---|---|---|
| **ID e título** | Você acha depois | Navegação |
| **Pergunta** | O que você buscava | ⚠ Você não sabe o que respondeu |
| **De onde veio** | Rastreabilidade | ⚠ Não reproduz a fonte |
| **Invariante** | O que deveria valer | ⚠ Vira opinião |
| **Hipótese** | A afirmação testável | ⚠ Vira expectativa |
| **Critério de falsificação** | ⚠ O que derruba | ⚠⚠ **Confirma por teimosia** |
| **Teste** | Como você fez | ⚠ Não reproduz |
| **Evidência** | ⚠ Comando + saída | ⚠⚠ **Vira alegação** |
| **Conclusão** | Os três valores | ⚠ Vira "achei/não achei" |
| **Sobras** | ⚠ A próxima pergunta | ⚠⚠ **Não acumula** |

⚠ **As três linhas com duplo aviso são as que decidem se o registro serve.** **Sem critério, não há
método. Sem evidência, não há prova. Sem sobras, não há acúmulo.**

⚠ **E o "sem evidência" é o mais comum.** **Você anota "o código não valida" e não anota QUAL linha,
QUAL arquivo, QUAL versão.** **Três meses depois, a anotação diz o que você achou — e não permite
que você confira.**

⚠ **A regra da evidência, e ela é simples:**

> **Comando e saída, literais, com data e versão.** Não "eu vi". **O comando que você rodou e o que
> ele respondeu.**

```bash
mkdir -p ~/pesquisa-lab/mod08 && cd ~/pesquisa-lab/mod08

echo "═══ 1. a estrutura, e o que cada seção evita ═══"
echo
cat > estrutura-registro.md <<'EOF'
# A estrutura do registro

## Por investigação
| Seção | Evita |
|---|---|
| ID e título | perder a investigação |
| Pergunta | não saber o que se buscou |
| De onde veio | não reproduzir a fonte |
| Invariante | virar opinião |
| Hipótese | virar expectativa |
| **Critério de falsificação** | ⚠ confirmar por teimosia |
| Teste | não reproduzir |
| **Evidência (comando + saída)** | ⚠ virar alegação |
| Conclusão (3 valores) | virar "achei/não achei" |
| **Sobras** | ⚠ não acumular |

## A regra da evidência
⚠ comando LITERAL + saída LITERAL + data + versão
   não "eu vi que não valida"
   ✓ "grep -n 'if (len' parser.c → 0 ocorrências, commit abc123"

## Os três valores de conclusão
| Valor | Significa |
|---|---|
| confirmou | a hipótese valeu |
| falsificou | a hipótese caiu — ⚠ é resultado |
| inconclusivo | ⚠ o TESTE falhou |
EOF

cat estrutura-registro.md

echo
echo "═══ 2. os quatro erros que tornam o registro inútil ═══"
echo
cat <<'EXPL'
  ┌───────────────────────────────────────────────────────────────────┐
  │ ERRO 1: EVIDÊNCIA SEM COMANDO                                      │
  ├───────────────────────────────────────────────────────────────────┤
  │ ✗ "verifiquei e não tem validação"                                 │
  │ ✓ "grep -n 'len >' parser.c → 0 ocorrências (commit abc123)"       │
  │ ⚠ sem o comando, ninguém confere — nem você                        │
  └───────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ ERRO 2: CONCLUSÃO SEM CRITÉRIO                                     │
  ├───────────────────────────────────────────────────────────────────┤
  │ ✗ "concluí que tem bug"                                            │
  │ ✓ "a hipótese previa X; observei X; o critério era Y e não ocorreu"│
  │ ⚠ sem critério, não há como saber se a conclusão segue dos dados   │
  └───────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ ERRO 3: FONTE SEM REFERÊNCIA                                       │
  ├───────────────────────────────────────────────────────────────────┤
  │ ✗ "vi num patch do projeto"                                        │
  │ ✓ "commit a1b2c3d, arquivo parser.c:40, projeto X v1.2.3"          │
  │ ⚠ sem referência, a fonte não é verificável                        │
  └───────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ ERRO 4: SEM "SOBRAS"                                               │
  ├───────────────────────────────────────────────────────────────────┤
  │ ✗ a investigação termina e você segue para outra aleatória          │
  │ ✓ "isso destrava: o irmão no parser de formato B"                   │
  │ ⚠ sem sobras, cada investigação é isolada — e não acumula          │
  └───────────────────────────────────────────────────────────────────┘
EXPL
```

⚠ **O erro 4 é o que mata o acúmulo.** **Sem "sobras", você tem N investigações independentes** — e
**não um programa de pesquisa.** **E é a diferença que o módulo 1 apontou:** **o operador tem
achados; o pesquisador tem achados e uma teoria.**

⚠ **E o erro 1 é o mais fácil de corrigir:** **copiar o comando junto com o resultado.** **Custa
dez segundos, e é a diferença entre prova e alegação.**

**Produza `estrutura.md`:**

| Erro | Como evitar |
|---|---|
| Evidência sem comando | |
| Conclusão sem critério | |
| Fonte sem referência | |
| Sem sobras | |

**Responda:**

1. **Qual erro é o mais comum** no seu registro atual?
2. **Qual mata o acúmulo?** Por quê?
3. **O que "evidência" exige?** Escreva a regra.
4. **Por que o critério de falsificação** está na lista?

---

## 8.2 Reprodutibilidade

⚠ **O teste do registro: **outra pessoa consegue refazer o que você fez?****

| Elemento | O que garante | ⚠ Se faltar |
|---|---|---|
| **Versão exata** | Você sabe `v1.2.3` e não "recente" | ⚠ Não reproduz |
| **Commit** | O código exato | ⚠ O fonte mudou |
| **Comando literal** | Reprodução | ⚠ Vira narrativa |
| **Entrada** | O caso testado | ⚠ Não sabe o que testou |
| **Ambiente** | Linguagem, SO, dependência | ⚠ Comportamento difere |
| **Data** | ⚠ **Quando** você viu | ⚠ O mundo mudou desde então |

⚠ **A linha da data merece destaque.** **Um achado de 2025 pode ter sido corrigido em 2026** — e
**o registro sem data não diz se o achado ainda vale.** **É por isso que a data vai em cada
investigação, e não só no topo do caderno.**

⚠ **E a linha do ambiente é a que mais gera confusão.** **Um comportamento observado na sua glibc
2.36 pode não ocorrer na 2.31** — e **o registro precisa dizer qual.** **É o módulo 6 do curso de
Exploit, aplicado ao registro.**

⚠ **A tabela do teste de reprodutibilidade:**

| Pergunta | Sim/Não |
|---|---|
| Dá para clonar a versão exata? | |
| Dá para rodar o comando literal? | |
| Dá para saber qual entrada foi usada? | |
| Dá para saber o ambiente? | |
| Dá para saber quando? | |

⚠ **Se qualquer uma é "não", o registro não é reprodutível** — e **a correção é sempre a mesma:
acrescentar o dado que falta.**

```bash
cd ~/pesquisa-lab/mod08

echo "═══ 3. o cabeçalho de reprodutibilidade ═══"
echo
cat <<'EXPL'
  ── todo registro começa com este bloco ──

     data          : 2026-10-18
     alvo          : <projeto> v1.2.3
     commit        : a1b2c3d4e5f6
     linguagem     : C (gcc 13.2)
     ambiente      : linux x86-64, glibc 2.36
     fonte da pergunta : commit fix-xyz / CVE / paper

  ⚠ e é ISSO que faz o teste de reprodutibilidade passar.
     não é burocracia — é o que permite que VOCÊ confira depois.
EXPL

cat > cabecalho-reprodutivel.md <<'EOF'
# Cabeçalho padrão — todo registro começa assim

```
data              : 
alvo              : 
versão            : 
commit            : 
linguagem/runtime : 
ambiente          : 
fonte da pergunta : 
```

## Teste de reprodutibilidade
| Pergunta | Resposta |
|---|---|
| Dá para clonar a versão exata? | |
| Dá para rodar o comando literal? | |
| Dá para saber a entrada usada? | |
| Dá para saber o ambiente? | |
| Dá para saber quando? | |

⚠ se qualquer "não" → o registro NÃO é reprodutível.
EOF

cat cabecalho-reprodutivel.md

echo
echo "═══ 4. por que a data importa ═══"
echo
cat <<'EXPL'
  ⚠ um achado de 2025 pode ter sido corrigido em 2026.

  ── o registro sem data diz: ──
     "o parser não valida `len`"
     ⚠ e você não sabe se isso AINDA vale

  ── o registro com data diz: ──
     "em 2026-03, na v1.2.3 (commit abc), o parser não validava `len`"
     ✓ e você sabe EXATAMENTE o que verificou, e quando

  ⚠ e a consequência prática: se o alvo lançou a v1.3 em 2026-06,
     a sua observação é sobre a versão anterior — e pode estar obsoleta.

  ✓ é a mesma razão do "confirmado por" no curso de Linux:
     o selo é o comando E a data, não a intenção.
EXPL
```

⚠ **A comparação com o curso de Linux não é decorativa.** **"Confirmado por" lá é o comando que
prova o estado do sistema** — **e aqui é o comando que prova a observação.** **A mesma disciplina,
aplicada a pesquisa.**

**Produza `reprodutibilidade.md`:**

| Elemento | Presente? | O que garante |
|---|---|---|
| Versão | | |
| Commit | | |
| Comando | | |
| Entrada | | |
| Ambiente | | |
| Data | | |

**Responda:**

1. **O seu registro passa** nos cinco testes?
2. **Qual elemento falta?** Corrija.
3. **Por que a data importa** em cada investigação?
4. **O que o ambiente permite** saber que a versão não permite?

---

## 8.3 Ligar as investigações

⚠ **O caderno não é uma lista — é um **grafo**.** **E é a ligação que faz acumular.**

```
INV-003 (patch)           INV-005 (paper)
     │                          │
     │ padrão abstraído         │ padrão provado
     ▼                          ▼
INV-007 ────────┬───────► INV-009
(busca irmão)   │         (variante por ecossistema)
                │              │
                │              ▼
                │         INV-011
                │         (hipótese nova)
                ▼
             INV-008
          (hipótese confirmada)
```

⚠ **A estrutura do grafo, e os três tipos de ligação:**

| Ligação | Significa | Como registrar |
|---|---|---|
| **deriva de** | Esta investigação nasceu daquela | ⚠ Na seção "de onde veio" |
| **destrava** | Esta abriu aquela pergunta | ⚠ Na seção "sobras" |
| **contradiz** | Esta refutou aquela | ⚠ **A mais valiosa** |

⚠ **A linha da contradição é a mais valiosa.** **Quando uma investigação refuta a anterior, você
aprendeu algo sobre o SISTEMA** — **e não só sobre o caso.** **E é o que evita repetir a mesma
hipótese errada sob outro nome.**

⚠ **A tabela do que cada tipo de ligação produz:**

| Ligação | Produz |
|---|---|
| deriva de | Rastreabilidade — você sabe por que está ali |
| destrava | ⚠ **O backlog** — a fila do que fazer |
| contradiz | ⚠ **Correção de rumo** — para de insistir |

⚠ **A última linha é a mais econômica.** **Um registro com uma "contradiz" bem documentada
economiza semanas** — **porque você para de tentar o que já falhou.**

```bash
cd ~/pesquisa-lab/mod08

echo "═══ 5. o grafo de investigações ═══"
echo
cat > grafo.md <<'EOF'
# Grafo de investigações

## Ligação 1 — deriva de
| Investigação | Deriva de | Por quê |
|---|---|---|
| | | |

## Ligação 2 — destrava (o backlog)
| Investigação | Destravou | Estado |
|---|---|---|
| | | aberta |
| | | aberta |
| | | aberta |

## Ligação 3 — contradiz
| Investigação | Contradiz | O que aprendi sobre o SISTEMA |
|---|---|---|
| | | |

## O backlog, priorizado
| # | Investigação | Origem | Próximo passo | Prioridade |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
EOF

cat grafo.md

echo
echo "═══ 6. o índice do caderno ═══"
echo
cat <<'EXPL'
  ── o caderno precisa de um índice — e ele é o que você abre primeiro ──

     # Caderno — índice

     | ID      | título                    | estado      | destrava  |
     |---------|---------------------------|-------------|-----------|
     | INV-001 | sete perguntas             | aberta      | —         |
     | INV-002 | escolha do alvo            | fechada     | INV-003   |
     | INV-003 | leitura de patch           | confirmada  | INV-007   |
     | INV-007 | busca pelo irmão           | aberta      | INV-009   |

  ⚠ a coluna "destrava" é o que liga tudo.
     ✓ e a coluna "estado" é o que você atualiza — não reescreve as fichas.
EXPL
```

⚠ **O índice é o instrumento de navegação.** **E a coluna "destrava" é o grafo em forma de
tabela** — **o que você abre quando quer saber onde continuar.**

⚠ **E a disciplina do estado é o que evita reescrever.** **Você não edita a ficha de uma investigação
falsificada** — **você muda o estado dela e registra a nova.** **A história fica preservada, e é
isso que permite ver o raciocínio.**

**Produza `grafo-caderno.md`:**

| Ligação | Quantas | O que produziu |
|---|---|---|
| deriva de | | |
| destrava | | |
| contradiz | | |

**Responda:**

1. **Quantas ligações** o seu caderno tem?
2. **Qual é a mais valiosa?** Por quê?
3. **O backlog está priorizado?**
4. **Você reescreveu alguma ficha**, ou mudou o estado?

---

## 8.4 LAB — Consolide o caderno

**Duração:** 75 min

### Passo 1 — Audite o que existe (25 min)

⚠ **Você já tem INV-001 a INV-007. Veja o que falta.**

```bash
cd ~/pesquisa-lab/mod08

cat > audita-caderno.sh <<'SCRIPT'
#!/usr/bin/env bash
# audita-caderno.sh — verifica a completude do caderno
set -uo pipefail
cd ~/pesquisa-lab/caderno || exit 2

echo "═══════════ AUDITORIA DO CADERNO ═══════════"
echo

echo "── 1. FICHAS EXISTENTES ──"
ls -1 INV-*.md 2>/dev/null | sed 's/^/  /' || echo "  (nenhuma)"
echo

echo "── 2. COMPLETUDE POR FICHA ──"
printf '  %-22s %-8s %-9s %-9s %-9s %-8s\n' "FICHA" "estado" "pergunta" "critério" "evidência" "sobras"
printf '  %-22s %-8s %-9s %-9s %-9s %-8s\n' "─────" "──────" "────────" "────────" "─────────" "──────"

for f in INV-*.md; do
    [ -f "$f" ] || continue
    estado=$(grep -iE '^\*\*Estado' "$f" 2>/dev/null | head -1 | sed 's/.*: *//' | cut -c1-7)
    [ -z "$estado" ] && estado="?"
    pergunta=$(grep -icE 'pergunta|hipótese|hipotese' "$f" 2>/dev/null)
    criterio=$(grep -icE 'falsifica' "$f" 2>/dev/null)
    eviden=$(grep -icE 'evidência|evidencia|```' "$f" 2>/dev/null)
    sobras=$(grep -icE 'destrava|sobra|próxim' "$f" 2>/dev/null)
    mark() { [ "$1" -gt 0 ] && echo "✓" || echo "⚠"; }
    printf '  %-22s %-8s %-9s %-9s %-9s %-8s\n' "$f" "$estado" \
        "$(mark "$pergunta")" "$(mark "$criterio")" "$(mark "$eviden")" "$(mark "$sobras")"
done

echo
echo "── 3. O ÍNDICE ──"
if [ -f INDEX.md ]; then
    echo "  ✓ existe"
    head -12 INDEX.md | sed 's/^/  /'
else
    echo "  ⚠ NÃO existe — crie com o template abaixo"
fi
echo

echo "── 4. LIGAÇÕES ──"
printf '  fichas que citam outra ficha: '
grep -lE 'INV-00[0-9]' INV-*.md 2>/dev/null | wc -l
echo

echo "── 5. O VEREDICTO ──"
n=$(ls INV-*.md 2>/dev/null | wc -l)
sem_crit=$(for f in INV-*.md; do grep -qi 'falsifica' "$f" 2>/dev/null || echo x; done | wc -l)
echo "  fichas             : $n"
echo "  sem critério       : $sem_crit  ⚠"
[ "$sem_crit" -gt 0 ] && echo "  ⚠ corrigir: toda ficha precisa do critério de falsificação"
SCRIPT

chmod +x audita-caderno.sh
./audita-caderno.sh

echo
echo "═══ e o template do índice ═══"
cat > ~/pesquisa-lab/caderno/INDEX.md <<'EOF'
# Caderno — índice

| ID | título | estado | destrava | ligação |
|---|---|---|---|---|
| INV-001 | sete perguntas aplicadas | | | |
| INV-002 | escolha do alvo | | | |
| INV-003 | leitura de patch | | | |
| INV-004 | três CVEs | | | |
| INV-005 | leitura de paper | | | |
| INV-006 | hipótese falsificável | | | |
| INV-007 | busca pelo irmão | | | |

## Estados possíveis
| Estado | Significa |
|---|---|
| aberta | em andamento |
| confirmada | a hipótese valeu |
| falsificada | a hipótese caiu — ⚠ resultado |
| inconclusiva | o teste falhou |

## O backlog priorizado
| # | Investigação | Origem | Próximo passo | Prioridade |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
EOF

head -20 ~/pesquisa-lab/caderno/INDEX.md
```

Produza `auditoria-caderno.md`:

| Ficha | Estado | Critério? | Evidência? | Sobras? |
|---|---|---|---|---|
| | | | | |

**Responda:**

1. **Quantas fichas existem?**
2. **Quantas estão sem critério** de falsificação?
3. **Quantas têm evidência** com comando literal?
4. **O índice existe?** Você criou?

### Passo 2 — Corrija e ligue (30 min)

⚠ **Preencha o que falta e **crie as ligações**.**

```bash
cd ~/pesquisa-lab/mod08

echo "═══ CORRIGINDO E LIGANDO ═══"
echo
cat <<'EXPL'
  ── para cada ficha, verifique os QUATRO erros ──

     1. evidência tem COMANDO literal?
        ✗ "não valida"
        ✓ "grep -n 'if (len' parser.c → 0 ocorrências"

     2. conclusão tem CRITÉRIO declarado?
        ✗ "tem bug"
        ✓ "o critério era X; observei Y; logo Z"

     3. fonte tem REFERÊNCIA (commit, versão, URL)?
        ✗ "vi num patch"
        ✓ "commit a1b2c3d, v1.2.3, arquivo:linha"

     4. tem SOBRAS?
        ✗ nada
        ✓ "destrava: o parser do formato B"

  ── e crie as TRÊS ligações ──
     · no "de onde veio": cite a ficha de origem
     · nas "sobras": cite a ficha que ela destrava
     · e se contradiz: crie a ligação e escreva o que aprendeu
EXPL

cat > ~/pesquisa-lab/caderno/08-ligacoes.md <<'EOF'
# Ligações entre investigações

## Deriva de
| Ficha | Deriva de | Por quê |
|---|---|---|
| INV-003 | — | fonte inicial |
| INV-007 | INV-003 | o padrão abstraído |
| | | |

## Destrava (backlog)
| Ficha | Destrava | Estado do destino |
|---|---|---|
| INV-003 | INV-007 | |
| INV-007 | | |
| | | |

## Contradiz
| Ficha | Contradiz | O que aprendi sobre o SISTEMA |
|---|---|---|
| | | |

## O grafo, em texto
```
INV-00  →  INV-00  →  INV-00
              │
              └────►  INV-00
```

## O backlog priorizado
| # | Investigação | Origem | Próximo passo | Prioridade |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
EOF

cat ~/pesquisa-lab/caderno/08-ligacoes.md
```

Produza `ligacoes.md`:

| Ficha | Deriva de | Destrava |
|---|---|---|
| | | |

**Responda:**

1. **Quantas ligações você criou?**
2. **Alguma investigação contradiz** outra? O que aprendeu?
3. **O backlog está priorizado?**
4. **Qual é a próxima investigação?**

### Passo 3 — O registro final (20 min)

Produza `registro-final.md`:

```markdown
# Registro de pesquisa — estado atual

## 1. O alvo (módulo 2)
| Campo | Valor |
|---|---|
| Alvo | |
| Versão | |
| Produtividade | |
| Região produtiva | |
| Autorização | |

## 2. O método (módulo 1)
| Item | Valor |
|---|---|
| As sete perguntas — aplicadas? | |
| Caderno — quantas fichas? | |
| Com critério de falsificação? | |

## 3. Os insumos (módulos 3–5)
| Fonte | Referência | O que deu |
|---|---|---|
| Patch | | |
| CVE | | |
| Paper | | |

## 4. A hipótese atual (módulo 6)
| Campo | Valor |
|---|---|
| Invariante | |
| Afirmação | |
| **Falsificação** | |
| Estado | |

## 5. A busca (módulo 7)
| Nível | Usado? | Candidatos |
|---|---|---|
| 1 — termo | | |
| 2 — estrutural | | |
| 3 — AST | | |
| 4 — CodeQL | | |
| 5 — diferencial | | |

## 6. O resultado até aqui
| Item | Valor |
|---|---|
| Confirmados | |
| Falsificados | |
| Inconclusivos | |

## 7. O que sobrou
⚠ o backlog, priorizado:

| # | Investigação | Prioridade |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

## 8. Limitações do meu registro
⚠ mínimo 3:
- 
- 
- 
```

**Responda:**

1. **Quantas fichas** e quantas ligações?
2. **A hipótese atual** — qual é o estado dela?
3. **O backlog tem quantos itens?**
4. **Cite três limitações** do seu registro.

### Critérios de aceitação

- `estrutura.md` com os **quatro** erros e como evitar cada um.
- Você identificou **qual erro mata o acúmulo**.
- Você escreveu a **regra da evidência**.
- `reprodutibilidade.md` com os **seis** elementos verificados.
- Você rodou os **cinco** testes de reprodutibilidade.
- Você explicou **por que a data importa** em cada investigação.
- `grafo-caderno.md` com as **três** ligações.
- Você explicou **por que a contradição é a mais valiosa**.
- `audita-caderno.sh` rodado, com a incompletude identificada.
- `INDEX.md` criado, com a coluna **"destrava"**.
- Você corrigiu as fichas com **evidência literal**.
- `ligacoes.md` com as ligações criadas.
- `registro-final.md` com as **oito** seções.
- Você listou **três limitações** do seu registro.
- ⚠ **Nenhum teste contra sistema de terceiro.**

---

## Avaliação

1. **Por que o registro é o produto** e não a burocracia?
2. **Qual a diferença** entre registro para você e para outro?
3. **Cite as dez seções** da ficha e o que cada uma garante.
4. **Quais três são as que decidem** se o registro serve?
5. **Escreva a regra da evidência.**
6. **Cite os quatro erros** que tornam o registro inútil.
7. **Qual mata o acúmulo?** Por quê?
8. **Qual é o mais fácil de corrigir?** Como?
9. **Cite os seis elementos** de reprodutibilidade.
10. **Por que a data importa** em cada investigação?
11. **Por que o ambiente precisa ser registrado?**
12. **O que o registro sem data não permite** saber?
13. **Cite os três tipos de ligação.**
14. **Qual é a mais valiosa?** Por quê?
15. **O que a contradição evita?**
16. **Por que o caderno é um grafo** e não uma lista?
17. **O que a coluna "destrava"** representa?
18. **Por que não se reescreve** a ficha de uma investigação falsificada?
19. **Por que a disciplina é a mesma** do "confirmado por" do curso de Linux?
20. **O que o registro permite** três meses depois?

---

**Próximo:** [Módulo 9 — Quando desistir](modulo-09.md)
