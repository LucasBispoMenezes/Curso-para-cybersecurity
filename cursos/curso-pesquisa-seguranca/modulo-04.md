# Módulo 4 — Ler um CVE

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Ler um CVE e **reconstruir o bug** mesmo **sem PoC público**.
2. Distinguir o que o advisory **diz**, o que ele **implica**, e o que ele **omite**.
3. Usar a **vulnerability note** como fonte: do relatório ao commit, o caminho completo.
4. Reconhecer **descrição vaga** e o que fazer com ela.
5. Triar um CVE por **relevância ao seu alvo**, e não por severidade genérica.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O advisory é escrito para quem vai ATUALIZAR, não para quem vai ENTENDER.** Ele diz o que fazer,
> não por que. **A sua leitura é o que extrai o "por que".**

⚠ **E é por isso que a ordem importa.** **O patch é mais preciso que o advisory** — porque **o
desenvolvedor teve que corrigir de verdade**, e a descrição pode ter sido escrita **antes** de
entender o problema completamente.

| Ordem | Fonte | Precisão |
|---|---|---|
| 1 | **O commit de correção** | ⚠⚠ Máxima |
| 2 | **A vulnerability note** (VU#, GHSA) | Alta — alguém analisou |
| 3 | **O advisory do fornecedor** | Média — frequentemente derivado |
| 4 | **A entrada do NVD** | Baixa-média — às vezes só copia |
| 5 | **A pontuação CVSS** | ⚠⚠ **A menos útil de todas** |

⚠ **A linha 5 é a mais importante de entender.** **CVSS mede IMPACTO, não facilidade de pesquisa.**
**Um CVE com CVSS 9.8 pode ser irrelevante para você** — porque **exige uma condição que o seu alvo
não tem**. **E um CVE com CVSS 5.0 pode ser o mais interessante** — porque **o padrão dele existe em
dez outros lugares.**

⚠ **A regra escrita:**

> **Triagem por CVSS é triagem por impacto. Pesquisa exige triagem por PADRÃO.** **Você procura o
> padrão que se repete, não o CVE mais grave.**

---

## 4.1 O que o advisory diz — e o que ele omite

⚠ **A estrutura de um advisory, e o que cada parte realmente entrega.**

| Campo | O que diz | O que omite |
|---|---|---|
| **Título** | O componente, às vezes o tipo | ⚠ A causa |
| **Descrição** | Um resumo | ⚠ O caminho exato |
| **Versões afetadas** | O range | Às vezes o N-1 exato |
| **CVSS** | Impacto estimado | ⚠ **Nada sobre o padrão** |
| **CWE** | A **classe** | ⚠ **A melhor pista que existe** |
| **Referências** | Links | ⚠ Nem sempre o commit |
| **Crédito** | Quem reportou | ⚠ O método |

⚠ **A linha do CWE é a joia escondida.** **O CWE é a CLASSE do bug** — e **a classe é o padrão.**
**Se o CWE é `CWE-190` (integer overflow), você já sabe que a busca é por aritmética não verificada.**
**É o nível 3 do módulo anterior, entregue de graça.**

⚠ **E a linha do crédito é frequentemente ignorada.** **O nome do pesquisador** frequentemente tem
**um writeup ou uma talk** — e **escrever sobre o mesmo bug é o que a comunidade faz.** **Saber quem
reportou abre a porta do material que explica o MÉTODO.**

⚠ **A tabela do que fazer com uma descrição vaga:**

| O que a descrição diz | O que você faz |
|---|---|
| "memory corruption in `parse_x`" | Vá ao CWE → à classe → ao patch |
| "improper input validation" | ⚠ Genérico — ignore e vá ao commit |
| "buffer overflow" | Procure o **tipo** de overflow (stack? heap? off-by-one?) |
| "use-after-free" | Vá ao ciclo de vida do objeto (curso de C, módulo 3) |
| "integer overflow leading to..." | ⚠ O "leading to" é o impacto; a causa é a Aritmética |
| Nada útil | ⚠ Procure o **commit** — ele sempre fala mais |

⚠ **A linha do "leading to" é didática.** **`integer overflow leading to buffer overflow`** — a
**causa é a aritmética**, e o **overflow de buffer é o efeito.** **Você procura a aritmética** — e
**é isso que o padrão abstraído do módulo 3 captura.**

```bash
mkdir -p ~/pesquisa-lab/mod04 && cd ~/pesquisa-lab/mod04

echo "═══ 1. a anatomia de um advisory ═══"
echo
cat > anatomia.md <<'EOF'
# Anatomia de um advisory — o que cada campo entrega

| Campo | O que pergunta | Onde procurar |
|---|---|---|
| Título | que componente? | o nome do módulo/função |
| Descrição | o que ele diz? | ⚠ e o que ele OMITE |
| Versões afetadas | o range | ⚠ qual é o N-1 exato |
| **CWE** | ⚠ **qual classe?** | **o padrão — a melhor pista** |
| CVSS | ⚠ impacto, não padrão | triagem por outro critério |
| Referências | tem commit? | ⚠ nem todo advisory linka |
| **Crédito** | quem reportou? | **tem writeup? talk?** |

## As cinco perguntas de leitura
1. Qual é a **classe** (CWE)?
2. Qual é a **causa**, e qual é o **efeito**?
3. O commit está **linkado**? Se não, onde achá-lo?
4. Quem **reportou**, e ele escreveu sobre isso?
5. ⚠ **Este padrão existe em outros lugares?**
EOF

cat anatomia.md

echo
echo "═══ 2. do CWE ao padrão ═══"
echo
python3 - <<'PY'
print("  ═══ CWE → O QUE PROCURAR ═══")
print()
print(f"  {'CWE':<14} {'classe':<30} {'o padrão a procurar':<40}")
print("  " + "-"*86)
cwes = [
    ("CWE-119", "buffer overflow", "cópia sem limite"),
    ("CWE-120", "buffer copy sem limite", "memcpy/strcpy com n da entrada"),
    ("CWE-125", "out-of-bounds read", "índice calculado sem faixa"),
    ("CWE-787", "out-of-bounds write", "escrita com offset da entrada"),
    ("CWE-190", "integer overflow", "⚠ aritmética ANTES de validar"),
    ("CWE-191", "integer underflow", "subtração que dá negativo"),
    ("CWE-416", "use-after-free", "free sem anular o ponteiro"),
    ("CWE-415", "double free", "dois caminhos liberam o mesmo"),
    ("CWE-476", "NULL deref", "retorno não checado"),
    ("CWE-22", "path traversal", "caminho concatenado sem normalizar"),
    ("CWE-79", "XSS", "saída sem encoding"),
    ("CWE-89", "SQL injection", "query concatenada"),
    ("CWE-444", "⚠ HTTP request smuggling", "⚠ dois parsers discordam"),
    ("CWE-436", "⚠ interpretation conflict", "⚠ confusão de camada"),
    ("CWE-863", "authorization bypass", "⚠ invariante de autorização"),
    ("CWE-362", "race condition", "⚠ estado entre verificação e uso"),
]
for c, classe, padrao in cwes:
    marca = "⚠" if "⚠" in padrao else " "
    print(f"  {c:<14} {classe:<30} {padrao:<40}{marca}")

print()
print("  ⚠ os quatro últimos são os mais produtivos HOJE:")
print("     CWE-444, CWE-436, CWE-863, CWE-362")
print("     ✓ porque não aparecem em fuzzing — exigem ENTENDER o sistema.")
print()
print("  ⚠ e note: CWE-190 (integer overflow) aparece em quase todo")
print("     advisory moderno, porque é a CAUSA por trás de muitos efeitos.")
PY
```

⚠ **A tabela do CWE ao padrão é o instrumento.** **O CWE dá a CLASSE**, e **a classe dá a busca.**
**É o nível 3 do módulo anterior, entregue pelo próprio advisory.**

⚠ **E as quatro linhas marcadas são as mais produtivas em 2026:** **CWE-444 (smuggling), CWE-436
(interpretation conflict), CWE-863 (authz), CWE-362 (race).** **Todas são de LÓGICA ou de CAMADA**
— e **é exatamente onde o `HTTP Garden` e o `HTTP/1.1 Must Die` encontraram superfície.**

**Produza `cwe.md`:**

| CWE | Classe | Padrão a procurar |
|---|---|---|
| CWE-190 | | |
| CWE-416 | | |
| CWE-444 | | |
| CWE-863 | | |

**Responda:**

1. **Qual campo do advisory dá a classe** do bug?
2. **Por que o CVSS é o menos útil** para pesquisa?
3. **Por que o crédito importa?**
4. **Quais CWEs são os mais produtivos hoje?** Por quê?

---

## 4.2 Reconstruir sem PoC

⚠ **O exercício central do módulo: do advisory ao bug, sem PoC.**

⚠ **A sequência:**

```
1. ADVISORY        → componente, versão, CWE
2. VERSÕES         → o range afetado, e o N-1 exato
3. COMMIT          → o diff (módulo 3)
4. INVARIANTE      → o que devia valer (módulo 3, nível 3)
5. CAMINHO         → a entrada controlada, e por onde ela passa
6. PRIMITIVA       → o que o bug permite
7. ⚠ E SEM PoC — a sua reconstrução vem da LEITURA
```

⚠ **A etapa 7 é a que dá valor.** **Se houver PoC público, você não precisa reconstruir** — pode
ler o PoC. **Mas reconstruir sozinho é o que treina o reflexo** — e **reconstruir o que NÃO tem PoC
é o que o prepara para o bug que ainda não existe.**

⚠ **E a tabela de "quando não há PoC":**

| Situação | O que fazer |
|---|---|
| Advisory sem PoC, com commit | **Ler o diff** (módulo 3) |
| Advisory sem commit | ⚠ Procurar o commit por outro caminho |
| Advisory vago, sem nada | ⚠ **Triar por CWE e procurar variação** |
| Só o CVE, sem detalhe | ⚠ Última prioridade — **mas o CWE ainda vale** |
| **Silent patch** (sem CVE) | ⚠⚠ **O mais valioso** — ninguém sabe que existe |

⚠ **A última linha é a mais interessante.** **Um "silent patch" é uma correção que não gerou
advisory** — porque **o fornecedor não considerou vulnerabilidade, ou não quis divulgar.** **E é o
que o material do `TORCH` chama de um dos caminhos de maior rendimento:** *"also finds silently
patched bugs that never got an advisory."*

⚠ **Como achar um silent patch:** **comparar versões consecutivas** e **procurar commits de
correção sem CVE.** **É o módulo 3 aplicado sem o CVE como guia** — mais difícil, e **por isso mais
valioso.**

```bash
cd ~/pesquisa-lab/mod04

echo "═══ 3. a reconstrução, passo a passo ═══"
echo
cat > reconstrucao-cve.md <<'EOF'
# Reconstrução de CVE — [CVE-XXXX-YYYY]

## 1. O advisory
| Campo | Valor |
|---|---|
| CVE | |
| Componente | |
| Versões afetadas | |
| **CWE** | |
| CVSS | |
| Referências | |
| Crédito | |

## 2. O que ele diz — e o que omite
| Disse | Omitiu |
|---|---|
| | |

## 3. O commit
| Item | Valor |
|---|---|
| Linkado no advisory? | |
| URL do commit | |
| Arquivos tocados | |

## 4. O invariante (do diff)
[o que DEVE valer, e não era garantido]

## 5. O caminho até a falha
1. [quem controla a entrada?]
2. [o que o código assume?]
3. [como a suposição falha?]
4. [consequência]

## 6. A primitiva
| Tipo | Sim/Não/Não sei |
|---|---|
| overflow (stack/heap) | |
| OOB read | |
| use-after-free | |
| DoS | |
| lógica / autorização | |
| confusão de camada | |

## 7. Sem PoC — o que eu reconstruí da leitura
[⚠ o que você CONCLUIU, e em que se baseou]

## 8. O que eu não consegui determinar
[mínimo 2]

## 9. O padrão, abstraído
"[em uma frase, sem nomes]"

## 10. Candidatos a irmão
| # | Onde | Tipo de irmão |
|---|---|---|
| 1 | | |
EOF

cat reconstrucao-cve.md

echo
echo "═══ 4. silent patch — o mais valioso ═══"
echo
cat <<'EXPL'
  ── O QUE É ──
     uma correção de segurança que NÃO gerou CVE nem advisory.
     · o fornecedor não considerou vulnerabilidade
     · ou corrigiu de passagem
     · ou não quis divulgar

  ── POR QUE VALE MAIS ──
     ⚠ há um CVE para cada N patch de segurança.
        os outros N-1 estão sem aviso — e sem caçador.

  ── COMO ACHAR ──
     1. escolha um projeto com releases frequentes
     2. pegue duas versões consecutivas (N-1 e N)
     3. git log --oneline vN-1..vN
     4. ⚠ procure commits com:
          fix, bound, check, validate, overflow, sanitize,
          guard, limit, clamp, range
        E SEM CVE no título
     5. leia o diff (módulo 3)

  ── EXEMPLO DE BUSCA ──
     git log --oneline v1.2.3..v1.2.4 | grep -iE 'fix|bound|check|valid|guard'
     ⚠ e descarte os commits que JÁ têm CVE

  ✓ é o mesmo método do módulo 3 — sem o CVE como guia.
     mais difícil, e por isso MAIS VALIOSO.
EXPL
```

⚠ **A seção do silent patch é a mais acionável do módulo.** **A busca é mecânica** — `git log` com
termos de correção, **descartando os que têm CVE.** **O que sobra são os sem aviso.**

⚠ **E é o mesmo raciocínio do `EnBinDiff`:** ele achou **20 1-days em binários reais** — e **parte
deles era de patches que não tinham recebido atenção suficiente.**

**Produza `reconstrucao.md`:**

| Item | Valor |
|---|---|
| CVE | |
| CWE | |
| Invariante | |
| Primitiva | |
| Padrão | |

**Responda:**

1. **O advisory linkava o commit?** Se não, como você achou?
2. **Qual a causa, e qual o efeito?**
3. **Qual a primitiva?** Ou você não determinou?
4. **O que você não conseguiu saber?**
5. **O padrão abstraído — escreva.**

---

## 4.3 Triagem — o CVE que importa para você

⚠ **Você não vai olhar todos os CVE. Precisa de critério — e o critério não é o CVSS.**

| Critério | Por que importa |
|---|---|
| **O padrão se repete?** | ⚠ **O mais importante** — vale mais que o impacto |
| **Tem commit público?** | Sem commit, a leitura é difícil |
| **O componente processa entrada?** | Superfície (módulo 2) |
| **A classe é lógica/camada?** | ⚠ Mais produtiva hoje |
| **O crédito tem writeup?** | Material de método |
| **É silent patch?** | ⚠⚠ Mais valioso |
| CVSS | ⚠ **O último da lista** |

⚠ **A primeira linha é a que redefine a triagem.** **Você não procura "o CVE mais grave" — procura
"o padrão que aparece em mais lugares".** **Um CVE de impacto médio cujo padrão existe em dez
projetos vale mais que um crítico e isolado.**

⚠ **E a tabela de triagem prática:**

| CVE | Padrão se repete? | Vale? |
|---|---|---|
| Integer overflow em parser de formato comum | ⚠ **Sim, muito** | ✓✓ **Sim** |
| Use-after-free numa função específica | Pouco | ✓ Talvez |
| Buffer overflow com condição exótica | Não | ⚠ **Não** |
| Authz bypass por estado inconsistente | ⚠ **Sim — lógica** | ✓✓ **Sim** |
| Smuggling por parsing divergente | ⚠ **Sim — camada** | ✓✓✓ **Sim** |
| Crash só com build específico | Não | **Não** |

⚠ **A penúltima linha é a mais valiosa da tabela.** **O parser differential é o que o `HTTP Garden`
achou 100 vezes** — porque **a condição se repete em todo servidor HTTP.** **O padrão não é do
projeto; é do PROTOCOLO.**

⚠ **É a razão de o CWE-444 e o CWE-436 serem os mais produtivos:** **o padrão deles está na
ESPECIFICAÇÃO**, e **toda implementação pode errá-lo de forma independente.**

```bash
cd ~/pesquisa-lab/mod04

echo "═══ 5. triagem por padrão ═══"
echo
python3 - <<'PY'
print("  ═══ TRIAGEM: PADRÃO, NÃO CVSS ═══")
print()
print(f"  {'CVE (exemplo)':<20} {'CVSS':<6} {'classe':<22} {'padrão?':<10} {'vale?'}")
print("  " + "-"*76)

casos = [
    ("CVE-A", 9.8, "buffer overflow exótico",    "não", "⚠ NÃO"),
    ("CVE-B", 6.5, "integer overflow em parser", "SIM", "✓✓ SIM"),
    ("CVE-C", 5.3, "authz por estado",           "SIM", "✓✓ SIM"),
    ("CVE-D", 7.5, "smuggling (CWE-444)",        "SIM", "✓✓✓ SIM"),
    ("CVE-E", 8.1, "UAF em função só",           "pouco", "✓ talvez"),
    ("CVE-F", 4.0, "silent patch",               "?", "✓✓✓ INVESTIGAR"),
]
for c, cvss, classe, padrao, vale in casos:
    print(f"  {c:<20} {cvss:<6} {classe:<22} {padrao:<10} {vale}")
print()
print("  ⚠ note o CVE-A: CVSS 9.8 e vale NÃO — porque o padrão é exótico.")
print("     e o CVE-D: CVSS 7.5 e vale MUITO — porque o padrão está no protocolo.")
print()
print("  ✓ é isso que 'triar por padrão e não por impacto' significa.")
print()
print("═══ A FILA DE TRABALHO ═══")
print()
print("  ordem sugerida:")
print("    1. silent patch do MEU alvo          ← o mais valioso")
print("    2. CVE de lógica/camada (444, 436, 863, 362)")
print("    3. CVE de parser com padrão repetido")
print("    4. CVE do componente que EU uso")
print("    5. ⚠ o resto — por último, se sobrar tempo")
PY
```

⚠ **A comparação CVE-A vs. CVE-D é o argumento.** **CVSS 9.8 que não se repete vale menos que CVSS
7.5 que está na especificação.** **O padrão é o critério.**

⚠ **E a fila de trabalho é o instrumento.** **Silent patch primeiro** — porque **ninguém procurou**.
**Depois lógica e camada** — porque **não aparecem em fuzzing**.

**Produza `triagem.md`:**

| CVE | CVSS | Classe | Padrão se repete? | Vale? |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Responda:**

1. **Por que o CVSS é o último critério?**
2. **Qual critério é o mais importante?**
3. **Por que o smuggling é o mais valioso** da tabela?
4. **O que a fila de trabalho prioriza primeiro?** Por quê?

---

## 4.4 LAB — Três CVE, do advisory ao padrão

**Duração:** 120 min

### Passo 1 — Escolha e documente três (40 min)

⚠ **Escolha três CVE. E escolha com critério do módulo — não os mais famosos.**

```bash
cd ~/pesquisa-lab/mod04

echo "═══ ONDE ENCONTRAR OS CVE ═══"
echo
cat <<'EXPL'
  ── 1. GitHub Advisory Database ──
     https://github.com/advisories
     ✓ filtro por linguagem, por ecossistema, por severidade
     ✓ e CADA um linka o commit da correção

  ── 2. NVD ──
     https://nvd.nist.gov/vuln/search
     ✓ filtro por CWE (!) e por produto
     ⚠ menos detalhe que o GitHub

  ── 3. Security tracker do fornecedor ──
     · Debian:   https://security-tracker.debian.org/
     · Red Hat:  https://access.redhat.com/security/cve/
     · Ubuntu:   https://ubuntu.com/security/CVEs

  ── 4. oss-security (a lista de divulgação) ──
     https://www.openwall.com/lists/oss-security/
     ✓ frequentemente com a análise mais completa

  ⚠ ESCOLHA três, com critério:
     · um de PARSER (classe 5 do curso de C)
     · um de LÓGICA ou CAMADA (mais produtivo)
     · um com CWE interessante (190, 416, 444, 436, 863, 362)
EXPL

cat > caderno/04-tres-cve.md <<'EOF'
# Três CVEs — do advisory ao padrão

## CVE 1 — [parser]
| Campo | Valor |
|---|---|
| CVE | |
| Componente | |
| CWE | |
| CVSS | |
| Commit | |
| Invariante violado | |
| Primitiva | |
| Padrão abstraído | |
| Irmão? | |

## CVE 2 — [lógica ou camada]
| Campo | Valor |
|---|---|
| CVE | |
| Componente | |
| CWE | |
| CVSS | |
| Commit | |
| Invariante violado | |
| Primitiva | |
| Padrão abstraído | |
| Irmão? | |

## CVE 3 — [CWE interessante]
| Campo | Valor |
|---|---|
| CVE | |
| Componente | |
| CWE | |
| CVSS | |
| Commit | |
| Invariante violado | |
| Primitiva | |
| Padrão abstraído | |
| Irmão? | |

## Comparação
| CVE | Padrão se repete? | Vale investigar? |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
EOF

cat caderno/04-tres-cve.md
```

Produza `tres-cve.md`:

| CVE | CWE | Invariante | Padrão | Vale? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Responda:**

1. **Qual dos três tem o padrão mais repetível?**
2. **Algum era de lógica ou camada?** Qual o CWE?
3. **Qual você escolheria para investigar?** Por quê?
4. **Algum linkava o commit?** Se não, como achou?

### Passo 2 — Reconstrua um sem PoC (50 min)

⚠ **Escolha um que **não tenha PoC público** — e reconstrua por leitura.**

```bash
cd ~/pesquisa-lab/mod04

echo "═══ reconstruindo sem PoC ═══"
echo
cat <<'EXPL'
  ── como saber se há PoC público ──
     · procure no exploit-db:  https://www.exploit-db.com/
     · procure no GitHub por "CVE-XXXX-YYYY poc"
     · procure no advisory: campo "exploit" ou "PoC"
     ⚠ se houver, você pode ler — mas o EXERCÍCIO é reconstruir sozinho

  ── o material que você TEM ──
     1. o advisory (componente, versão, CWE)
     2. o commit (o diff)
     3. as versões N-1 e N

  ── o que você PRODUZ ──
     1. o invariante violado
     2. o caminho até a falha
     3. a primitiva
     4. ⚠ e a sua CONCLUSÃO sem ver PoC
EXPL

cat > caderno/04-reconstrucao-1.md <<'EOF'
# Reconstrução sem PoC — [CVE]

## O que eu tinha
| Fonte | Disponível? |
|---|---|
| Advisory | |
| Commit | |
| Versão N-1 | |
| Versão N | |
| PoC público | ⚠ **não olhei / não existe** |

## O invariante violado
[o que DEVE valer]

## O caminho até a falha
1. entrado por:
2. o código assume:
3. a suposição falha quando:
4. consequência:

## A primitiva
[o que o bug permite]

## Como eu confirmaria (sem explorar)
⚠ o que eu poderia OBSERVAR que confirma a minha reconstrução:
· ler o código e ver que a validação não existe
· comparar com a versão corrigida
· ⚠ NÃO: rodar um exploit contra sistema de terceiro

## O que eu não consegui determinar
[mínimo 2 itens]

## O padrão, abstraído
"[sem nomes]"
EOF

cat caderno/04-reconstrucao-1.md
```

Produza `reconstrucao-sem-poc.md`:

| Item | Sua conclusão |
|---|---|
| Invariante | |
| Caminho | |
| Primitiva | |
| Não determinei | |

**Responda:**

1. **Havia PoC público?** Você olhou?
2. **A sua reconstrução** bate com o diff? Confirme relendo.
3. **O que você não conseguiu determinar?** É legítimo.
4. **O padrão abstraído** — escreva.

### Passo 3 — O silent patch (30 min)

⚠ **A busca mais valiosa: correção sem CVE.**

```bash
cd ~/pesquisa-lab/mod04

echo "═══ caçando um silent patch ═══"
echo
cat > caca-silent-patch.sh <<'SCRIPT'
#!/usr/bin/env bash
# caca-silent-patch.sh — procura correções de segurança SEM CVE
set -uo pipefail

REPO="${1:?uso: caca-silent-patch.sh <caminho-do-repo-clonado>}"
cd "$REPO" || exit 2

echo "═══════════ SILENT PATCHES ═══════════"
echo "  repo: $(basename "$PWD")"
echo

echo "── 1. as tags (duas versões consecutivas) ──"
git tag --sort=-creatordate 2>/dev/null | head -8 | sed 's/^/  /'
echo

echo "── 2. commits com termos de correção ──"
echo "  ⚠ e SEM CVE no título"
echo
git log --oneline -200 2>/dev/null | \
    grep -iE 'fix|bound|check|valid|guard|limit|clamp|range|sanitize|overflow' | \
    grep -viE 'CVE-[0-9]{4}-[0-9]+' | head -20 | sed 's/^/  /'
echo "  (fim)"
echo

echo "── 3. quantos COM CVE (para comparar) ──"
n=$(git log --oneline -500 2>/dev/null | grep -icE 'CVE-[0-9]{4}-[0-9]+')
echo "  commits com CVE: $n"
echo

echo "── 4. o que fazer com o resultado ──"
cat <<'EXPL'
  ⚠ para cada commit candidato:
     1. git show <hash>          → veja o diff
     2. aplique os TRÊS NÍVEIS   → o que mudou / por que / padrão
     3. classifique:
        · correção de segurança sem aviso?  ✓ SILENT PATCH
        · refatoração que só PARECE?        · descarte
     4. ⚠ se for silent patch, ele NÃO tem caçador.
        é o candidato mais valioso do curso.
EXPL
SCRIPT

chmod +x caca-silent-patch.sh
echo "  ⚠ rode em um repositório que você clonou:"
echo "     ./caca-silent-patch.sh ~/pesquisa-lab/alvos/<projeto>"
echo
echo "  ⚠ e se preferir navegar pela interface do GitHub:"
echo "     <repo>/commits/main  → procure os mesmos termos"
```

Produza `silent-patch.md`:

| Item | Valor |
|---|---|
| Repo | |
| Commits candidatos | |
| Algum é correção de segurança? | |
| Padrão abstraído | |

**Responda:**

1. **Quantos commits** com termos de correção **sem CVE**?
2. **Algum é correção de segurança?** Como você decidiu?
3. **Quantos commits COM CVE** no mesmo período? O que a proporção diz?
4. **O padrão do silent patch** — escreva.

### Critérios de aceitação

- `cwe.md` com os **quatro** CWEs e o padrão de cada.
- Você explicou **por que o CVSS é o menos útil** para pesquisa.
- Você explicou **por que o CWE é a melhor pista**.
- `reconstrucao.md` com os **dez** campos preenchidos.
- Você reconstruiu **sem PoC** — e declarou o que **não** determinou.
- Você explicou o que é **silent patch** e por que vale mais.
- `triagem.md` com **pelo menos três** CVE triados por padrão.
- Você comparou um CVE de **CVSS alto e padrão exótico** com um de **CVSS médio e padrão no
  protocolo**.
- `tres-cve.md` com os três CVE documentados.
- Pelo menos **um** dos três é de **lógica ou camada**.
- Você identificou **qual você escolheria** para investigar.
- `silent-patch.md` com a busca executada.
- Você explicou **por que silent patch não tem caçador**.
- ⚠ **Nenhum teste contra sistema de terceiro.** Só leitura.

---

## Avaliação

1. **Por que o advisory é escrito para quem vai atualizar?**
2. **Qual a fonte mais precisa?** Por quê?
3. **Por que o CVSS é o menos útil** para pesquisa?
4. **Qual campo do advisory dá a classe?** Por que importa?
5. **Por que o crédito importa?**
6. **Cite os três passos** da leitura de advisory.
7. **O que fazer com "improper input validation"?**
8. **O que fazer com "integer overflow leading to..."?**
9. **Cite a sequência de reconstrução** sem PoC.
10. **Por que reconstruir sem PoC tem valor**, se há PoC disponível?
11. **O que é um silent patch?**
12. **Por que o silent patch vale mais?**
13. **Como achar um silent patch?** Descreva a busca.
14. **Por que a proporção de commits com CVE importa?**
15. **Qual é o critério de triagem mais importante?**
16. **Por que um CVE de CVSS 9.8 pode não valer** e um de 7.5 valer muito?
17. **Por que o CWE-444 é dos mais produtivos?**
18. **Por que o padrão do smuggling está na especificação**, e não no projeto?
19. **Quais CWEs evitar**, e por quê?
20. **O que é legítimo não conseguir determinar?**

---

**Próximo:** [Módulo 5 — Ler um paper](modulo-05.md)
