# Módulo 2 — Escolher o Alvo

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Escolher alvo por **critério explícito**, e justificar a escolha.
2. Entender por que **alvo maduro é pouco produtivo** — e por que todos escolhem ele.
3. Avaliar **superfície, maturidade e histórico** de um alvo.
4. Reconhecer onde **ainda dá para fazer trabalho original**.
5. Registrar o perfil do alvo no caderno.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O alvo escolhe o resultado. Um alvo maduro e muito auditado dá pouco, não porque você é ruim —
> mas porque não sobrou nada.**

⚠ **E é o erro que a maioria comete:** **escolher o alvo mais famoso.** O navegador, o kernel do
Linux, o `nginx`, o `OpenSSL` — **são os mais auditados do mundo.** **Você está competindo com
centenas de pesquisadores com anos de vantagem.**

⚠ **A tabela do que cada tipo de alvo dá:**

| Tipo de alvo | Auditores | O que sobra | Produtivo? |
|---|---|---|---|
| **Navegador, kernel** | Centenas, por anos | Quase nada | ⚠ **Não para começar** |
| **Biblioteca famosa** | Muitos | Pouco | ⚠ Difícil |
| **Projeto de nicho** | Poucos | **Bastante** | ✓ **Sim** |
| **Formato próprio de uma empresa** | Quase ninguém | **Muito** | ✓✓ **Muito** |
| **Protocolo novo / implementação nova** | Poucos | **Muito** | ✓✓ **Sim** |
| ⚠ **O que você conhece por dentro** | Você | **O que ninguém tem** | ✓✓✓ **O melhor** |

⚠ **A última linha é a chave.** **O alvo mais produtivo é aquele que você conhece por dentro** — a
ferramenta da sua empresa, o formato que você mantém, o serviço que você opera. **Você tem o
histórico, o código, e a intuição de onde ele é frágil** — **e ninguém mais tem isso.**

⚠ **E é o que o `HTTP Garden` mostrou em escala:** **mais de 100 bugs de parsing em servidores
populares.** **Não em um servidor famoso — no CONJUNTO.** **A superfície estava espalhada, e ninguém
tinha olhado os menos famosos.**

---

## 2.1 A fórmula do alvo

⚠ **Quatro eixos. E eles se multiplicam — não se somam.**

$$
\text{produtividade} \approx \frac{\text{superfície} \times \text{acessibilidade}}{\text{maturidade} \times \text{competição}}
$$

| Eixo | Pergunta | Alto é bom? |
|---|---|---|
| **Superfície** | Quanto código processa dado **não confiável**? | ✓ **Sim** |
| **Acessibilidade** | Você consegue **ler** o código e **testar** legalmente? | ✓ **Sim** |
| **Maturidade** | Quanto ele já foi **auditado e corrigido**? | ⚠ **Não** |
| **Competição** | Quantos outros pesquisadores já estão nele? | ⚠ **Não** |

⚠ **A linha da superfície merece a explicação.** **O que processa dado não confiável é onde o bug
importa** — porque **alguém controla a entrada**. Um parser de formato próprio, um decodificador de
protocolo, um validador de documento: **todos processam entrada hostil**.

⚠ **E a competição é o eixo que a maioria esquece.** **Um alvo muito popular tem MUITOS
pesquisadores.** **Se você é iniciante em pesquisa, você está numa fila.** **Escolher um alvo com
pouca competição é escolher onde a sua vantagem relativa é maior** — mesmo que o alvo seja menos
glamouroso.

⚠ **A regra escrita:**

> **Escolha o alvo pela sua vantagem relativa, não pelo prestígio.** **Um bug em projeto de nicho que
> você achou vale infinitamente mais que a tentativa frustrada no navegador.**

```bash
mkdir -p ~/pesquisa-lab/mod02 && cd ~/pesquisa-lab/mod02

echo "═══ 1. a fórmula, avaliada ═══"
echo
python3 - <<'PY'
print("  ═══ AVALIANDO CINCO ALVOS ═══")
print()
print("  escala: 1 = baixo, 5 = alto")
print()

alvos = [
    # nome, superficie, acessibilidade, maturidade, competicao
    ("Linux kernel (netfilter)",      5, 5, 5, 5),
    ("Chromium (renderer)",           5, 4, 5, 5),
    ("Biblioteca de imagem famosa",   5, 5, 4, 4),
    ("Projeto de nicho (parser thex)", 4, 5, 2, 1),
    ("Seu serviço interno",           4, 5, 1, 1),
    ("Formato próprio de uma empresa", 4, 3, 1, 1),
]

print(f"  {'alvo':<32} {'sup':<5} {'aces':<6} {'mat':<5} {'comp':<5} {'prod.':<8}")
print("  " + "-"*76)
for nome, sup, ace, mat, comp in alvos:
    prod = (sup * ace) / (mat * comp)
    marca = "⚠⚠" if prod < 0.5 else ("✓✓" if prod > 2 else "✓")
    print(f"  {nome:<32} {sup:<5} {ace:<6} {mat:<5} {comp:<5} {prod:>6.2f} {marca}")

print()
print("  ⚠ note: o kernel tem superfície 5 e acessibilidade 5 —")
print("     e produtividade BAIXA, porque maturidade E competição são 5.")
print()
print("  ✓ e o seu serviço interno tem produtividade ALTA")
print("     porque ninguém mais olhou.")
print()
print("═══ POR QUE ISSO SURPREENDE ═══")
print()
print("  o instinto diz: 'kernel é onde está o bug interessante'.")
print("  ⚠ e é — mas é onde CENTENAS de pessoas estão olhando há ANOS.")
print()
print("  o pesquisador pergunta: 'onde eu tenho VANTAGEM?'")
print("  ✓ e a vantagem está em: nicho, código novo, código SEU")
PY
```

⚠ **A tabela inverte o instinto.** **O kernel tem superfície máxima e acessibilidade máxima** — e
**produtividade baixa**, porque **maturidade e competição também são máximas**. **A divisão é o que
importa.**

⚠ **E a última linha é a mais útil:** **o seu serviço interno tem produtividade alta porque ninguém
mais olhou.** **E é o único alvo onde você tem acesso total** — código, histórico, comportamento em
produção.

**Produza `formula.md`:**

| Alvo | Superfície | Acessibilidade | Maturidade | Competição | Produtividade |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |

**Responda:**

1. **Por que o kernel é pouco produtivo** para quem está começando?
2. **Qual eixo a maioria esquece?** Por que ele importa?
3. **Qual alvo dá mais vantagem relativa?** Por quê?
4. **O que a fórmula faz que a intuição não faz?**

---

## 2.2 Superfície — onde o bug importa

⚠ **Superfície é "quanto código processa dado que você controla".** E ela tem **gradação**.

| Nível | O que é | Exemplo |
|---|---|---|
| **5** | Parser de protocolo de rede | `HTTP`, `DNS`, `TLS` |
| **5** | Parser de formato de arquivo | imagem, PDF, arquivo compactado |
| **4** | Validador de entrada de aplicação | schema, sanitizador |
| **4** | Deserializador | `pickle`, `YAML`, `protobuf` |
| **3** | Processador de dado interno | transformação, agregação |
| **2** | Lógica de negócio | cálculo, regra |
| **1** | Configuração estática | leitura de config |

⚠ **A gradação importa porque diz ONDE LER.** **Com superfície 5, o bug está no caminho da
entrada** — no parsing, no tamanho, no limite. **Com superfície 2, está na lógica** — no invariante
de negócio.

⚠ **E há a assimetria de esforço:**

| Superfície | Custo de achar | Custo de explorar |
|---|---|---|
| 5 (parser) | Médio — há padrão | ⚠ Alto — precisa de primitiva |
| 2 (lógica) | **Alto** — precisa entender o domínio | **Baixo** — o impacto já é o bug |

⚠ **A linha da lógica é a que surpreende.** **Um bug de lógica é mais difícil de ACHAR** (exige
entender o domínio) **e mais fácil de EXPLORAR** (o impacto é direto — você fez o que não devia).
**É o inverso do bug de memória.**

⚠ **E é a razão de o curso insistir em "entender o domínio":** **para bug de lógica, você precisa
saber o que o sistema DEVERIA fazer** — e isso não está no código necessariamente.

```bash
cd ~/pesquisa-lab/mod02

echo "═══ 2. mapeando a superfície ═══"
echo
cat > mapa-superficie.md <<'EOF'
# Mapa de superfície do alvo

## O caminho da entrada
⚠ desenhe: de onde vem o dado não confiável, e por onde ele passa.

```
[ fonte ] → [ transporte ] → [ parsing ] → [ validação ] → [ uso ]
   │            │               │              │             │
   │            │               │              │             │
   ▼            ▼               ▼              ▼             ▼
```

## Pontos de entrada (superfície alta)
| # | Componente | Que dado entra | Formato/Protocolo | Onde ler |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

## Fronteiras de confiança
⚠ onde o código ASSUME que o dado é confiável

| # | Ponto | O que ele assume | Verificado? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## Superfície estimada
| Componente | Nota (1–5) | Por quê |
|---|---|---|
| | | |
EOF

cat mapa-superficie.md

echo
echo "═══ como identificar os pontos de alta superfície ═══"
echo
cat <<'EXPL'
  ── procure por estas palavras no código ──
     parse, decode, read, recv, accept, load, import,
     deserialize, unmarshal, handle, process

  ── e por estas operações ──
     alocação com tamanho vindo da entrada
     cópia com comprimento vindo da entrada
     índice calculado a partir da entrada
     laço limitado por valor da entrada

  ⚠ e a pergunta que identifica fronteira:
     "aqui, o que o código ASSUME sobre este dado?"
     · assume que cabe?
     · assume que é válido?
     · assume que é do tipo certo?
     · assume que veio de onde diz?
EXPL
```

⚠ **O mapa de superfície é o primeiro produto do módulo.** **Você desenha o caminho da entrada e
marca as fronteiras de confiança** — porque **é nas fronteiras que o bug mora**.

⚠ **E a lista de palavras é o instrumento de leitura.** **`parse`, `decode`, `read`, `recv`** — cada
ocorrência é **um ponto onde o dado entra**. **Você não precisa de ferramenta: precisa de `grep` e
atenção.**

**Produza `superficie.md`:**

| Componente | Superfície (1–5) | Que dado entra |
|---|---|---|
| | | |
| | | |

**Responda:**

1. **Quantos pontos de entrada** você achou?
2. **Quantas fronteiras de confiança?** Quais?
3. **Qual componente tem superfície máxima?**
4. **Por que bug de lógica é mais difícil de achar** e mais fácil de explorar?

---

## 2.3 Maturidade e histórico

⚠ **A maturidade é o eixo que decide se vale a pena.** E ela **se mede**.

| Indicador | O que significa | Como verificar |
|---|---|---|
| **Histórico de CVE** | Muitos CVE recentes = ainda achando | NVD, GitHub advisories |
| **Fuzzer aplicado** | Já passou por fuzzing em massa | `oss-fuzz`, CI com fuzzing |
| **Auditoria pública** | Pesquisa publicada sobre ele | Papers, talks |
| **Idade + trabalho** | Muitos anos + muitos commits | `git log` |
| **Testes** | Cobertura alta = muita gente olhou | CI, cobertura |
| **Linguagem** | ⚠ **C/C++ é mais frágil que Rust/Go** | Óbvio |

⚠ **A linha do fuzzer é a mais direta.** **Se o projeto está no `oss-fuzz`, ele já foi fuzado
milhões de vezes** — e **o que sobra é o que o fuzzer não alcança**. **Isso não significa que é
seguro: significa que o bug fácil já saiu.**

⚠ **E a linha da linguagem é a que a maioria ignora.** **Projeto em Rust é MUITO menos produtivo para
bug de memória** — porque **a linguagem impede a classe**. **Mas continua frágil em lógica e em
parsing.** **A linguagem muda QUAL bug você procura, não se há bug.**

⚠ **A tabela do que sobra depois de cada filtro:**

| Já passou por | O que sobra |
|---|---|
| Nada | Tudo |
| Fuzzing | Bug que o fuzzer não alcança (estado, protocolo, lógica) |
| Auditoria | Bug sutil, e o que a auditoria não cobriu |
| Anos de CVE | ⚠ **Bug de lógica, confusão de camada, invariante** |
| Fuzzing + auditoria + anos | Muito pouco — **mude de alvo** |

⚠ **A última linha é a decisão difícil.** **Reconhecer quando um alvo "já foi" é parte do método** —
e é o **módulo 9** que formaliza.

```bash
cd ~/pesquisa-lab/mod02

echo "═══ 3. avaliando maturidade ═══"
echo
cat > avalia-maturidade.sh <<'SCRIPT'
#!/usr/bin/env bash
# avalia-maturidade.sh — coleta os indicadores de um alvo público
set -uo pipefail

REPO="${1:?uso: avalia-maturidade.sh <owner/repo>}"

echo "═══════════ MATURIDADE: ${REPO} ═══════════"
echo

echo "── 1. IDADE E ATIVIDADE ──"
echo "  ⚠ use a página do repositório, ou a API:"
echo "     curl -s https://api.github.com/repos/${REPO} | jq '{created_at, updated_at, pushed_at, stargazers_count, open_issues_count}'"
echo

echo "── 2. HISTÓRICO DE SEGURANÇA ──"
echo "  ⚠ procure por:"
echo "     · GitHub Advisories:  https://github.com/${REPO}/security/advisories"
echo "     · NVD:                https://nvd.nist.gov/vuln/search?query=$(basename "$REPO")"
echo

echo "── 3. FUZZING ──"
echo "  ⚠ verifique se está no oss-fuzz:"
echo "     https://github.com/google/oss-fuzz/tree/master/projects"
echo

echo "── 4. TESTES ──"
echo "  ⚠ verifique:"
echo "     · pasta de testes"
echo "     · CI com cobertura"
echo "     · sanitisers no CI (-fsanitize)"
echo

echo "── 5. LINGUAGEM ──"
echo "  ⚠ C/C++ = mais frágil em memória"
echo "     Rust/Go = menos frágil em memória, igual em lógica"
echo

echo "── 6. FICHA DE AVALIAÇÃO ──"
cat <<'EOF'
| Indicador | Valor | Produtivo? |
|---|---|---|
| CVE nos últimos 2 anos | | |
| Está no oss-fuzz | | |
| Auditoria pública | | |
| Testes com sanitizer | | |
| Linguagem | | |
| **Veredito** | | |
EOF
SCRIPT

chmod +x avalia-maturidade.sh
cat > ficha-maturidade.md <<'EOF'
# Ficha de maturidade do alvo

| Indicador | Valor | Fonte | Produtivo? |
|---|---|---|---|
| Idade | | | |
| Commits recentes | | | |
| CVE (últimos 2 anos) | | | |
| Está no oss-fuzz | | | |
| Auditoria pública | | | |
| Testes + sanitizer | | | |
| Linguagem | | | |
| **Veredito** | | | |

## O que sobra depois do que ele já passou
[ ] Bug de memória
[ ] Bug de lógica
[ ] Bug de parsing
[ ] Bug de invariante
[ ] Confusão de camada
EOF
cat ficha-maturidade.md
```

⚠ **A ficha é o instrumento.** **Ela transforma "acho que é difícil" em "tem 47 CVE em dois anos, está
no oss-fuzz, e tem sanitizer no CI"** — **e daí a decisão é informada.**

⚠ **E a última seção é a que decide a estratégia:** **o que sobra depois do que ele já passou**.
**Se ele passou por fuzzing, o bug não é de memória — é de estado.** **Isso define onde você lê.**

**Produza `maturidade.md`:**

| Indicador | Valor | Produtivo? |
|---|---|---|
| CVE recentes | | |
| `oss-fuzz` | | |
| Auditoria | | |
| Linguagem | | |
| **Veredito** | | |

**Responda:**

1. **Quantos CVE** o alvo tem nos últimos dois anos?
2. **Ele está no `oss-fuzz`?** O que isso significa?
3. **O que sobra** depois do que ele já passou?
4. **A linguagem muda qual bug você procura?** Como?

---

## 2.4 Onde ainda dá trabalho original

⚠ **As cinco regiões onde a literatura recente mostra que ainda há superfície.**

| # | Região | Evidência | Por que sobra |
|---|---|---|---|
| 1 | **Parser differential** | `HTTP Garden`: 100+ bugs | ⚠ **Dois parsers, mesmo dado** |
| 2 | **Confusão de camada** | `HTTP/2` desync, `Pingora` (2 CVE) | A camada de cima confia na de baixo |
| 3 | **Bug de lógica e invariante** | Não tem fuzzer que pegue | Exige **entender o domínio** |
| 4 | **Código novo / implementação nova** | Menos auditado por definição | Ninguém olhou ainda |
| 5 | ⚠ **O que você conhece por dentro** | Só você tem acesso | **Vantagem absoluta** |

⚠ **A linha 1 é a mais reprodutível.** **"Dois parsers, mesmo dado, resultados diferentes"** é uma
**pergunta que você pode fazer contra qualquer sistema com mais de um componente** — e o
**`HTTP Garden` mostrou que funciona em escala**.

⚠ **E a linha 2 fecha com ela.** **Confusão de camada é o caso geral do parser differential** —
**quando a camada de cima DECIDE algo que a de baixo interpreta diferente.** **O `HTTP/2` downgrade é
o exemplo mais conhecido**, e **o `Pingora` teve duas CVEs por isso em 2025 e 2026**.

⚠ **A linha 3 é a que a indústria mais subestima.** **Bug de lógica não aparece em fuzzing** —
porque **a entrada é válida, e a SAÍDA é que está errada**. **Só se acha entendendo o que o sistema
deveria fazer.** **É onde o conhecimento de domínio (a linha 5) dá vantagem máxima.**

⚠ **A linha 4 é a mais acessível para quem está começando.** **Uma biblioteca de 2024 com 500
commits e sem auditoria** tem **mais bug que o `OpenSSL`** — e **ninguém está olhando.** **Você não
precisa ser melhor; precisa chegar primeiro.**

```bash
cd ~/pesquisa-lab/mod02

echo "═══ 4. as cinco regiões produtivas ═══"
echo
cat <<'EXPL'
  ┌───────────────────────────────────────────────────────────────────┐
  │ 1. PARSER DIFFERENTIAL                                            │
  ├───────────────────────────────────────────────────────────────────┤
  │ pergunta: "dois componentes interpretam ESTE dado igual?"         │
  │ ⚠ onde: qualquer sistema com proxy, WAF, gateway, CDN             │
  │ evidência: HTTP Garden — 100+ bugs, 39 exploráveis                │
  │ ✓ a mais REPRODUTÍVEL: a técnica se aplica a qualquer stack       │
  └───────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ 2. CONFUSÃO DE CAMADA                                             │
  ├───────────────────────────────────────────────────────────────────┤
  │ pergunta: "a camada de cima decide algo que a de baixo re-lê?"    │
  │ ⚠ onde: tradução de protocolo (H2→H1), normalização, encoding     │
  │ evidência: HTTP/2 desync, Pingora CVE-2025-4366 e CVE-2026-2833   │
  │ ✓ é o caso GERAL do parser differential                           │
  └───────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ 3. LÓGICA E INVARIANTE                                           │
  ├───────────────────────────────────────────────────────────────────┤
  │ pergunta: "o sistema pode chegar a um estado que não deveria?"    │
  │ ⚠ onde: autorização, troca de estado, sequência de operações      │
  │ evidência: ⚠ NENHUM fuzzer pega — a entrada é válida              │
  │ ✓ onde o conhecimento de DOMÍNIO dá vantagem máxima               │
  └───────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ 4. CÓDIGO NOVO                                                    │
  ├───────────────────────────────────────────────────────────────────┤
  │ pergunta: "isto foi auditado alguma vez?"                         │
  │ ⚠ onde: bibliotecas de 2024+, produtos novos, forks               │
  │ ✓ nenhum auditor passou ainda — você chega PRIMEIRO               │
  └───────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ 5. O QUE VOCÊ CONHECE POR DENTRO                                  │
  ├───────────────────────────────────────────────────────────────────┤
  │ pergunta: "o que eu sei deste sistema que ninguém mais sabe?"     │
  │ ⚠ onde: a ferramenta da sua empresa, o serviço que você opera     │
  │ ✓ vantagem ABSOLUTA — você tem código, histórico e intuição       │
  └───────────────────────────────────────────────────────────────────┘
EXPL

echo
echo "═══ 5. escolhendo: o alvo do curso ═══"
echo
cat > caderno/02-alvo.md <<'EOF'
# INV-002 — escolha do alvo

**Data:** ____

## Candidatos
| # | Alvo | Sup. | Aces. | Mat. | Comp. | Prod. | Autorização |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |

## Escolhido
| Item | Valor |
|---|---|
| Alvo | |
| Por quê | |
| Base de autorização | alvo próprio | CTF público | contrato |
| Região produtiva (1–5) | |
| O que sobra depois do que ele já passou | |

## A primeira pergunta
[⚠ específica, falsificável, informada]

## Critério de falsificação
[o que derruba]

## O que eu NÃO vou fazer
- [ ] não vou testar contra instância em produção
- [ ] não vou ampliar o escopo sem autorização
- [ ] não vou publicar sem coordenação
EOF

cat caderno/02-alvo.md
```

⚠ **A ficha de alvo é o entregável do módulo.** **Ela tem a coluna "autorização"** — e isso não é
formalidade: **é o que você vai conferir em cada passo seguinte.**

⚠ **E a seção "o que NÃO vou fazer" é obrigatória aqui.** **Ao escolher o alvo, você define o limite
dele** — porque **é mais fácil respeitar um limite que você escreveu antes de começar.**

**Produza `alvo-escolhido.md`:**

| Campo | Valor |
|---|---|
| Alvo | |
| Produtividade | |
| Região produtiva | |
| Base de autorização | |
| Primeira pergunta | |
| Critério de falsificação | |

**Responda:**

1. **Qual alvo você escolheu?** Com que critério?
2. **Ele está em qual das cinco regiões?**
3. **O que sobra** depois do que ele já passou?
4. **Qual a base de autorização?** Escreva.
5. **Qual a primeira pergunta?** É falsificável?

---

## 2.5 LAB — Perfil de alvo

**Duração:** 120 min

### Passo 1 — Três candidatos (40 min)

⚠ **Escolha três, avalie os quatro eixos, e decida com número.**

```bash
cd ~/pesquisa-lab/mod02

cat > avalia-candidatos.py <<'PY'
#!/usr/bin/env python3
"""avalia-candidatos.py — pontua candidatos e calcula a produtividade."""

print("═══ AVALIAÇÃO DE CANDIDATOS ═══")
print()
print("  ⚠ preencha com os SEUS três candidatos.")
print("     escala 1–5 em cada eixo.")
print()

# ⚠ EDITE AQUI com os seus candidatos
CANDIDATOS = [
    # nome, superficie, acessibilidade, maturidade, competicao, descricao
    ("[candidato 1]", 0, 0, 0, 0, ""),
    ("[candidato 2]", 0, 0, 0, 0, ""),
    ("[candidato 3]", 0, 0, 0, 0, ""),
]

print(f"  {'candidato':<28} {'sup':<5} {'aces':<6} {'mat':<5} {'comp':<5} {'produt.':<9}")
print("  " + "-"*66)
for nome, sup, ace, mat, comp, _ in CANDIDATOS:
    if mat == 0 or comp == 0:
        print(f"  {nome:<28} {'?':<5} {'?':<6} {'?':<5} {'?':<5} {'—':<9}")
        continue
    p = (sup * ace) / (mat * comp)
    print(f"  {nome:<28} {sup:<5} {ace:<6} {mat:<5} {comp:<5} {p:>7.2f}")

print()
print("═══ OS CRITÉRIOS, EXPLICADOS ═══")
print()
print("  ── SUPERFÍCIE (quanto dado não confiável ele processa?) ──")
print("     5 = parser de protocolo/formato de rede")
print("     4 = validador, deserializador")
print("     3 = processador de dado interno")
print("     2 = lógica de negócio")
print("     1 = configuração estática")
print()
print("  ── ACESSIBILIDADE (posso ler e testar legalmente?) ──")
print("     5 = código aberto + posso testar (meu, CTF, autorizado)")
print("     3 = código aberto, mas testar exige autorização")
print("     1 = fechado, sem autorização")
print()
print("  ── MATURIDADE (quanto já foi auditado?) ──")
print("     5 = anos de CVE, oss-fuzz, auditoria pública")
print("     3 = alguns CVE, testes com sanitizer")
print("     1 = novo, sem auditoria, sem fuzzing")
print()
print("  ── COMPETIÇÃO (quantos estão olhando?) ──")
print("     5 = navegador, kernel, biblioteca universal")
print("     3 = biblioteca conhecida")
print("     1 = nicho, código interno, projeto novo")
print()
print("  ⚠ e a produtividade é (sup × aces) / (mat × comp).")
print("     o MESMO alvo pode ser 5 em superfície E 5 em competição —")
print("     e aí a divisão o derruba.")
PY

python3 avalia-candidatos.py

echo
echo "═══ preencha a tabela ═══"
cat > caderno/02-candidatos.md <<'EOF'
# Candidatos avaliados

| # | Alvo | Sup. | Aces. | Mat. | Comp. | Prod. | Região (1–5) |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |

## Fontes usadas
| Candidato | Onde verifiquei CVE | Onde verifiquei fuzzing | Onde verifiquei testes |
|---|---|---|---|
| | | | |

## Decisão
| Item | Valor |
|---|---|
| Escolhido | |
| Critério decisivo | |
| O que me fez descartar os outros | |
EOF
cat caderno/02-candidatos.md
```

Produza `candidatos.md`:

| # | Alvo | Produtividade | Região | Decisão |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Responda:**

1. **Qual candidato venceu** e por quê?
2. **Qual teve superfície alta mas produtividade baixa?**
3. **Em qual região produtiva** ele está?
4. **O que te fez descartar** os outros dois?

### Passo 2 — Mapeie a superfície (50 min)

⚠ **Agora, no alvo escolhido: desenhe o caminho da entrada.**

```bash
cd ~/pesquisa-lab/mod02

echo "═══ mapeando o caminho da entrada ═══"
echo
echo "  ── procure os pontos de entrada no código ──"
echo
cat <<'EXPL'
  ⚠ rode isto na pasta do alvo (se você clonou):

    grep -rEn '(parse|decode|unmarshal|deserialize|recv|accept|read_|load_)' \
        --include='*.c' --include='*.py' --include='*.go' --include='*.rs' \
        . | head -30

  ⚠ e procure as OPERAÇÕES perigosas:

    · alocação com tamanho da entrada:
      grep -rEn '(malloc|calloc|new)\s*\(\s*\w*(len|size|count|n_)' .

    · cópia com comprimento da entrada:
      grep -rEn '(memcpy|strncpy|copy_from_user)\s*\([^,]+,[^,]+,\s*\w*(len|size|n)' .

    · índice da entrada:
      grep -rEn '\[\s*\w*(idx|index|i|off|offset)' .

    · laço limitado pela entrada:
      grep -rEn 'for\s*\([^;]*;\s*[^;]*(len|size|count|n\b)' .
EXPL

cat > caderno/02-superficie.md <<'EOF'
# Mapa de superfície — [alvo]

## O caminho da entrada
```
[ fonte ] → [ transporte ] → [ parsing ] → [ validação ] → [ uso ]
```

## Pontos de entrada
| # | Componente | Que dado entra | Formato | Onde ler | Superfície |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## Fronteiras de confiança
⚠ onde o código ASSUME confiança

| # | Ponto | Suposição | Verificado? | Se falhar |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Operações perigosas encontradas
| # | Operação | Arquivo:linha | O tamanho vem de onde? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## Onde eu vou ler primeiro
| Ordem | Componente | Por quê |
|---|---|---|
| 1 | | |
| 2 | | |
EOF
cat caderno/02-superficie.md
```

Produza `superficie-mapeada.md`:

| # | Componente | Superfície | Onde ler |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

**Responda:**

1. **Quantos pontos de entrada?** E quantas fronteiras?
2. **Quantas operações perigosas** você achou?
3. **Qual a primeira fronteira** que você vai olhar? Por quê?
4. **Você conseguiu clonar e ler** o código? (Sem isso, mude de alvo.)

### Passo 3 — A ficha de alvo (30 min)

Produza `perfil-alvo.md`:

```markdown
# Perfil de alvo — [nome]

## 1. Identificação
| Item | Valor |
|---|---|
| Nome | |
| Versão | |
| Fonte | |
| Linguagem | |
| Autorização | alvo próprio | CTF público | contrato |

## 2. Avaliação (1–5)
| Eixo | Nota | Justificativa |
|---|---|---|
| Superfície | | |
| Acessibilidade | | |
| Maturidade | | |
| Competição | | |
| **Produtividade** | | (sup × aces) / (mat × comp) |

## 3. Região produtiva
[ ] parser differential
[ ] confusão de camada
[ ] lógica / invariante
[ ] código novo
[ ] o que eu conheço por dentro

## 4. Histórico
| Indicador | Valor |
|---|---|
| CVE (últimos 2 anos) | |
| Está no oss-fuzz | |
| Auditoria pública | |
| Sanitizer no CI | |

## 5. O que sobra
[ ] bug de memória
[ ] bug de lógica
[ ] bug de parsing
[ ] confusão de camada

## 6. Superfície
| Componente | Entrada | Superfície |
|---|---|---|

## 7. A primeira pergunta
[específica, falsificável, informada]

## 8. Critério de falsificação
[o que derruba]

## 9. Limite deste alvo
⚠ o que está FORA do escopo autorizado:

## 10. Limitações da minha avaliação
⚠ mínimo 3:
- não medi a competição real (apenas estimei)
- não verifiquei auditoria não publicada
- não conferi o histórico completo de CVE
```

**Responda:**

1. **A produtividade calculada** surpreendeu?
2. **A região produtiva** está clara?
3. **Qual a primeira pergunta?** É falsificável?
4. **O limite do alvo está escrito?**
5. **Cite três limitações** da sua avaliação.

### Critérios de aceitação

- `formula.md` com os quatro eixos e a produtividade calculada.
- Você explicou **por que o kernel é pouco produtivo** para quem começa.
- `superficie.md` com **pelo menos três** pontos de entrada.
- Você identificou **pelo menos três** fronteiras de confiança.
- Você explicou **por que bug de lógica é difícil de achar e fácil de explorar**.
- `maturidade.md` com os indicadores **verificados**, não supostos.
- Você identificou **o que sobra** depois do que o alvo já passou.
- `candidatos.md` com **três** candidatos avaliados e a decisão justificada.
- `superficie-mapeada.md` com as operações perigosas encontradas por `grep`.
- `perfil-alvo.md` com as **dez** seções.
- Você escreveu o **limite do alvo** — o que está fora do escopo.
- Você listou **três limitações** da sua própria avaliação.
- ⚠ **Nenhum teste contra sistema de terceiro.** Só leitura.

---

## Avaliação

1. **Por que o alvo escolhe o resultado?**
2. **Por que alvo maduro é pouco produtivo?** E por que todos escolhem ele?
3. **Cite os quatro eixos** da fórmula do alvo.
4. **Por que os eixos se multiplicam** e não se somam?
5. **Qual eixo a maioria esquece?** Por que importa?
6. **Por que a vantagem relativa importa** mais que o prestígio?
7. **O que é superfície?** Dê os cinco níveis.
8. **Por que bug de lógica é mais difícil de achar** e mais fácil de explorar?
9. **Cite os seis indicadores de maturidade.**
10. **O que a presença no `oss-fuzz` significa?** E o que **não** significa?
11. **Como a linguagem muda** qual bug você procura?
12. **O que sobra** depois de fuzzing? E depois de auditoria?
13. **Cite as cinco regiões produtivas.**
14. **Qual é a mais reprodutível?** Por quê?
15. **O que é confusão de camada?** Cite um caso recente.
16. **Por que bug de lógica não aparece em fuzzing?**
17. **Por que código novo é acessível** para quem começa?
18. **Qual alvo dá vantagem absoluta?** Por quê?
19. **Por que escrever o limite** do alvo antes de começar?
20. **Quando o alvo "já foi"?** O que fazer?

---

**Próximo:** [Módulo 3 — Ler um patch](modulo-03.md)
