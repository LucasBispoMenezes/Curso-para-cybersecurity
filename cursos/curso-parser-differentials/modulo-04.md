# Módulo 4 — O Lab de N Implementações

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Escolher as **N implementações** de um formato — com critério.
2. Subir cada uma **isolada, no seu lab** — sem alcançar terceiros.
3. **Normalizar a saída** para comparar — o passo que a maioria faz mal.
4. Testar o **mesmo dado** em todas — e registrar.
5. Montar a **matriz de resultados** — a base do harness do módulo 5.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O lab é a fronteira ética do curso.** **Se as N implementações não estão no seu ambiente, você
> não está pesquisando — está atacando.**

⚠ **E a razão de ele ser um módulo inteiro:** **subir N implementações é onde o iniciante desiste.**
**Build que falha, dependência que arrasta uma stack, porta que conflita** — **e o método morre
antes de começar.**

⚠ **A tese:**

> **O lab não é infraestrutura. É parte do método.** **Um lab que você sobe em dez minutos é um lab
> que você usa; um que leva dois dias não é.**

⚠ **E a regra, escrita, porque ela é o que separa a pesquisa do ataque:**

| Você faz | Você **não** faz |
|---|---|
| Baixa e compila as N | ⚠ Usa o serviço de alguém |
| Roda em **localhost** ou container isolado | ⚠ Aponta para terceiro |
| Compara processos **locais** | ⚠ Manda payload a produção |
| Testa instância **sua ou CTF** | ⚠ Testa instância alheia |

⚠ **A linha 2 merece a ênfase.** **Um container sem rede de saída** é a garantia técnica — **e não
depende de disciplina.** **Você configura a rede para `none` e o lab não pode alcançar ninguém.**

---

## 4.1 Escolhendo as N

⚠ **As N implementações. E o critério é o mesmo para as duas e para as dez.**

| Critério | Por quê |
|---|---|
| **Implementam o MESMO formato** | ⚠ Óbvio — e errado com frequência |
| **Maturas** | A divergência existe |
| **Linguagens diferentes** | ⚠ **Mais divergência** |
| **Idades diferentes** | Implementação antiga tolera mais |
| **Propósitos diferentes** | ⚠ **Mais divergência** |
| **Fáceis de subir** | Você vai iterar |

⚠ **A linha das linguagens diferentes é a mais econômica.** **Duas implementações em C** divergem
menos que **uma em C e uma em Go** — **porque a stdlib de cada linguagem já decidiu por elas.**

⚠ **E a linha dos propósitos diferentes é a que o módulo 2 explicou.** **Servidor, proxy, WAF,
cache** — **cada um quer uma coisa, e é aí que a divergência é estrutural.**

⚠ **A tabela das fontes, por formato:**

| Formato | Onde achar N implementações |
|---|---|
| **CSV** | stdlib do Python, do Go, do Rust, Node |
| **JSON** | `json` (Python), `encoding/json` (Go), `serde_json` (Rust), `JSON` (JS) |
| **URI** | `urllib`, `net/url`, `url` (Node), `curl` |
| **HTTP** | `h11`, `h2`, nginx, Apache, HAProxy |
| **base64** | `base64`, `openssl`, stdlib de cada linguagem |
| **Datas** | `datetime`, `time` (Go), `chrono` (Rust) |
| **XML** | `lxml`, `encoding/xml`, `libxml2` |

⚠ **A primeira linha é a do treino, e a mais subestimada.** **Quatro linguagens, quatro parsers de
CSV** — **e as divergências são reais.** **É onde você treina sem tocar em nada de risco.**

⚠ **A linha do HTTP é a do módulo 6.** **E ela exige subir servidores** — **por isso é depois.**

⚠ **A regra escrita:**

> **Você não precisa de N produtos comerciais.** **N stdlibs já bastam** — **e as divergências entre
> elas são reais, documentadas e inofensivas.**

```bash
mkdir -p ~/parser-lab/mod04 && cd ~/parser-lab/mod04

echo "═══ 1. escolhendo as N ═══"
echo
cat > escolha-n.md <<'EOF'
# Escolha das N implementações

## Critérios
| Critério | Peso | Por quê |
|---|---|---|
| implementam o MESMO formato | absoluto | óbvio — e errado com frequência |
| maturas | alto | a divergência existe |
| ⚠ linguagens DIFERENTES | alto | mais divergência |
| idades diferentes | médio | a antiga tolera mais |
| ⚠ propósitos DIFERENTES | alto | divergência estrutural |
| fáceis de subir | médio | você vai iterar |

## Fontes por formato
| Formato | N implementações |
|---|---|
| CSV | stdlib Python, Go, Rust, Node |
| JSON | json / encoding-json / serde_json / JSON |
| URI | urllib / net-url / curl |
| base64 | coreutils / openssl / stdlib |
| datas | datetime / time / chrono |
| HTTP | h11 / h2 / nginx / apache / haproxy |

## As três escolhidas
| # | Implementação | Linguagem | Propósito | Como subir |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## ⚠ o limite de rede
| Item | Valor |
|---|---|
| roda em | localhost / container |
| rede de saída | ⚠ **NENHUMA** |
| aponta para terceiro? | ⚠ **NÃO** |
EOF

cat escolha-n.md

echo
echo "═══ 2. as quatro linguagens, na sua máquina ═══"
echo
for t in python3 go rustc node; do
    printf '  %-10s ' "$t:"
    command -v "$t" >/dev/null 2>&1 && "$t" --version 2>/dev/null | head -1 || echo "⚠ ausente"
done
echo
echo "  ⚠ com duas delas, você já tem um diferencial."
echo "     com quatro, você tem um CORPUS de comportamento."
```

⚠ **A contagem de linguagens disponíveis é o passo prático.** **E a nota final é a lição econômica:**
**duas linguagens já bastam.** **Você não precisa de quatro para começar.**

⚠ **E o limite de rede no fim da ficha é a garantia.** **Você **declara** que não há saída — e ela
não depende da sua disciplina.**

**Produza `escolha-n.md`:**

| # | Implementação | Linguagem | Propósito |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. **Por que linguagens diferentes divergem mais?**
2. **Por que propósitos diferentes divergem estruturalmente?**
3. **Quantas linguagens você tem** disponíveis?
4. **Como você garante que o lab não alcança terceiros?**

---

## 4.2 Subindo isolado

⚠ **Três formas de subir, por ordem de isolamento. E a terceira é a que você usa no HTTP.**

| # | Forma | Isolamento | Quando |
|---|---|---|---|
| 1 | **Função em processo** | ⚠ Nenhum — mas local | Formato de dado |
| 2 | **Processo, sem rede** | ✓ Bom | Parser em binário |
| 3 | **Container sem saída** | ✓✓ **Máximo** | ⚠ **Servidor, WAF** |

⚠ **A forma 1 é o que os módulos 1 a 3 usaram.** **Você roda o parser como função e compara a
saída** — **e para formato de dado isso é suficiente e seguro.**

⚠ **A forma 3 é a que o módulo 6 vai exigir.** **Um servidor HTTP precisa de rede — e você o põe num
container com `--network none`** — **e ele só é alcançável pelo seu próprio namespace.**

⚠ **E o teste de isolamento é obrigatório, e é um comando:**

> **Do lab, você **tenta** alcançar um serviço externo.** **E a tentativa FALHA.** **Se ela
> funcionar, o isolamento não está feito.**

⚠ **A tabela do que fazer se o isolamento não funciona:**

| Falha | Causa | Correção |
|---|---|---|
| Alcança a internet | `--network none` ausente | ⚠ **Adicione** |
| Alcança o host | rede bridge | Use `none` |
| Alcança outro container | mesma rede | Namespace separado |

⚠ **A regra escrita:**

> **O isolamento não é uma promessa que você faz a si mesmo; é uma **propriedade** que você
> verifica.** **E o teste é um `curl` que **falha**.**

```bash
cd ~/parser-lab/mod04

echo "═══ 3. subindo isolado ═══"
echo
cat > isola.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "═══════════ ISOLAMENTO DO LAB ═══════════"
echo

echo "── 1. AS IMPLEMENTAÇÕES RODAM LOCAL? ──"
echo "   (forma 1 — função em processo)"
cat <<'EXPL'
   ✓ é o caso de formato de dado (CSV, JSON, base64, data)
   ⚠ o "parser" é uma FUNÇÃO — não precisa de rede
   ✓ e comparar a saída já é o diferencial
EXPL
echo

echo "── 2. CONTAINER SEM SAÍDA (forma 3) ──"
if command -v docker >/dev/null 2>&1; then
    echo "  ✓ docker presente"
    echo
    echo "  ── o comando que ISOLA ──"
    cat <<'EXPL'
     docker run --rm --network none -v "$PWD:/lab" -w /lab <imagem> <comando>

     ⚠ --network none  = NENHUMA rede
        nem internet, nem host, nem outros containers
EXPL
else
    echo "  ⚠ docker ausente — use a forma 1 ou 2"
fi
echo

echo "── 3. ⚠ O TESTE DE ISOLAMENTO ──"
echo "   o teste é uma tentativa que FALHA:"
echo
cat <<'EXPL'
     # de dentro do lab, tenta alcançar um serviço externo
     curl -s --max-time 5 https://example.com && echo "⚠⚠ ALCANÇOU — SEM ISOLAMENTO" \
                                               || echo "✓ não alcançou — isolado"

     ⚠ e se funcionar, o isolamento NÃO está feito.
        é uma propriedade que se VERIFICA, não se promete.
EXPL
echo

echo "── 4. A REGRA ──"
cat <<'EXPL'
   ✓ as N implementações são SUAS
   ✓ rodam em localhost ou container sem rede
   ⚠ e o achado vai ao MANTENEDOR — não ao serviço de ninguém

   · o teste diferencial manda N payloads, não um
   · e um WAF que processa o payload JÁ FOI ACESSADO
EXPL
SCRIPT

chmod +x isola.sh
./isola.sh
```

⚠ **O teste de isolamento é o item do módulo.** **E ele é um comando que falha** — **porque o
isolamento é uma propriedade verificável, não uma intenção.**

⚠ **E a forma 1 é a honesta para começar.** **Para formato de dado, não há rede envolvida** — **e
comparar a saída é o diferencial.** **O container só é necessário quando o alvo é um serviço.**

**Produza `isolamento.md`:**

| Forma | Isolamento | Quando usar |
|---|---|---|
| 1 — função | | |
| 2 — processo | | |
| 3 — container | | |

**Responda:**

1. **Qual forma você usa agora?** Por quê?
2. **Qual forma o módulo 6 vai exigir?**
3. **Qual o teste de isolamento?** Qual o resultado no seu?
4. **Por que o isolamento se verifica?**

---

## 4.3 Normalizando a saída

⚠ **O passo que a maioria faz mal: comparar saídas que não são comparáveis.**

| Problema | Exemplo | Solução |
|---|---|---|
| **Formato diferente** | um imprime JSON, outro texto | ⚠ **Normalizar** |
| **Ordem diferente** | chaves em ordem distinta | Ordenar |
| **Ruído** | timestamps, caminhos, PIDs | ⚠ **Mascarar** |
| **Nível de detalhe** | um dá erro, outro dá erro + linha | ⚠ **Reduzir ao essencial** |
| **Encoding** | um em UTF-8, outro em latin-1 | Normalizar |

⚠ **A linha do ruído é a que gera falsos positivos.** **Se o parser imprime o caminho do arquivo,
duas execuções diferem** — **e você conclui "discordância".** **Você mascara o que não é
comportamento.**

⚠ **A tabela do que normalizar, e o que NÃO:**

| Normalizar | **Não** normalizar |
|---|---|
| Caminhos | ⚠ **O resultado** |
| Timestamps | ⚠ **O erro ou sucesso** |
| PIDs, endereços | ⚠ **O valor produzido** |
| Ordem de chaves | ⚠ **O limite aplicado** |
| Caixa de mensagem de erro | ⚠ **A contagem** |

⚠ **A coluna da direita é a regra:** **você normaliza a APRESENTAÇÃO e preserva o
COMPORTAMENTO.** **Se a normalização apaga o resultado, ela destrói o diferencial.**

⚠ **E o critério de normalização, escrito:**

> **Normalize tudo que o **ambiente** introduz. Preserve tudo que o **parser** produz.** **Se você não
> sabe de qual lado está, não normalize.**

⚠ **A regra escrita:**

> **Uma normalização agressiva demais esconde a discordância; uma de menos, inventa.** **O ponto é
> onde só o ambiente é removido.**

```bash
cd ~/parser-lab/mod04

echo "═══ 4. normalizando a saída ═══"
echo
cat > normaliza.md <<'EOF'
# Normalizar a saída

## O que normalizar, e o que NÃO
| Normalizar (é do AMBIENTE) | ⚠ NÃO normalizar (é do PARSER) |
|---|---|
| caminhos de arquivo | o resultado |
| timestamps | o erro ou sucesso |
| PIDs, endereços | o valor produzido |
| ordem de chaves | o limite aplicado |
| caixa de mensagem de erro | a contagem / o tamanho |

## O critério
normalize o que o AMBIENTE introduz.
preserve o que o PARSER produz.
⚠ se você não sabe de qual lado está, NÃO normalize.

## O script
```python
import re
def normaliza(s):
    s = re.sub(r'/[\w/.-]+', '<PATH>', s)      # caminhos
    s = re.sub(r'\d{4}-\d{2}-\d{2}T[\d:]+', '<TS>', s)  # timestamps
    s = re.sub(r'\b\d{3,6}\b', '<NUM?>', s)    # ⚠ CUIDADO: pode ser resultado!
    return s.strip()
```
⚠ a terceira linha é PERIGOSA — ela pode apagar o resultado.
  ✓ só use mascaramento numérico se souber que ali não há dado.

## ⚠ as duas falhas
| Normalização demais | Normalização de menos |
|---|---|
| ⚠ ESCONDE a discordância | ⚠ INVENTA discordância |
EOF

cat normaliza.md

echo
echo "═══ 5. a matriz de resultados ═══"
echo
cat <<'EXPL'
  ── a estrutura que o harness do módulo 5 vai automatizar ──

     ┌────────────┬──────────────┬──────────────┬──────────────┐
     │ ENTRADA    │ IMPL A       │ IMPL B       │ IMPL C       │
     ├────────────┼──────────────┼──────────────┼──────────────┤
     │ e1         │ r1a          │ r1b          │ r1c          │
     │ e2         │ r2a          │ r2b          │ r2c          │
     │ e3         │ r3a          │ r3b          │ r3c          │
     └────────────┴──────────────┴──────────────┴──────────────┘
                       │              │              │
                       └──────────────┴──────────────┘
                                      │
                            ⚠ discordância na LINHA

  ✓ cada linha onde as colunas não são todas iguais = candidato
     ⚠ e o módulo 3 diz quais desses candidatos são bug.
EXPL
```

⚠ **A matriz é o instrumento.** **A discordância é **por linha** — e cada linha discordante é um
candidato.** **É o que o harness do módulo 5 automatiza.**

⚠ **E a nota do mascaramento numérico é o alerta.** **Mascarar números para remover PIDs pode
apagar o **resultado** — e você perde a discordância.** **Normalize com o alvo em mente.**

**Produza `normalizacao.md`:**

| Normalizar | Não normalizar |
|---|---|
| | |
| | |
| | |

**Responda:**

1. **Qual é o critério de normalização?**
2. **O que acontece com normalização demais?** E de menos?
3. **Por que o mascaramento numérico é perigoso?**
4. **Onde a discordância aparece na matriz?**

---

## 4.4 LAB — O lab de N implementações

**Duração:** 120 min

### Passo 1 — Suba as N (50 min)

⚠ **Escolha um formato de dado e suba **quatro** parsers: nas linguagens que você tem.**

```bash
cd ~/parser-lab/mod04

echo "═══ SUBINDO AS N ═══"
echo
cat <<'EXPL'
  ── O EXERCÍCIO: QUATRO PARSERS DE CSV, QUATRO LINGUAGENS ──

     1. Python  (csv)
     2. Go      (encoding/csv)
     3. Rust    (csv)
     4. Node    (o parser que você escrever)

     ⚠ o campo de teste: o que acontece com
        · aspas soltas
        · CRLF vs LF
        · espaço após a vírgula
        · campo vazio
EXPL

mkdir -p ~/parser-lab/impls/csv && cd ~/parser-lab/impls/csv

# Python — a stdlib
cat > p_csv.py <<'PY'
#!/usr/bin/env python3
"""impl Python — csv da stdlib"""
import sys, csv, io
dados = sys.stdin.read()
try:
    for linha in csv.reader(io.StringIO(dados)):
        print(repr(linha))
except Exception as e:
    print(f"ERRO:{type(e).__name__}:{e}")
PY

# um parser manual — o "impl B"
cat > p_manual.py <<'PY'
#!/usr/bin/env python3
"""impl B — parser manual: split por vírgula, respeitando aspas simples"""
import sys
dados = sys.stdin.read().replace("\r\n", "\n").rstrip("\n")
if not dados:
    print("VAZIO"); sys.exit(0)
for linha in dados.split("\n"):
    campos, atual, aspas = [], "", False
    for ch in linha:
        if ch == '"':
            aspas = not aspas
        elif ch == "," and not aspas:
            campos.append(atual); atual = ""
        else:
            atual += ch
    campos.append(atual)
    print(repr(campos))
PY

chmod +x *.py

echo "  ── o corpus de fronteira ──"
mkdir -p ~/parser-lab/corpus/csv
cat > ~/parser-lab/corpus/csv/casos.txt <<'EOF'
a,b,c
"a","b","c"
"a,b",c
a, b, c
a,,c
"a""b",c
"aspas soltas,b
a,b,
EOF

cat -n ~/parser-lab/corpus/csv/casos.txt | sed 's/^/     /'
echo

echo "═══ A MATRIZ ═══"
printf '  %-34s %-26s %s\n' "entrada" "stdlib" "manual"
printf '  %-34s %-26s %s\n' "───────" "──────" "──────"
while IFS= read -r linha; do
    [ -z "$linha" ] && continue
    ra=$(printf '%s\n' "$linha" | python3 p_csv.py 2>/dev/null | head -1 | cut -c1-24)
    rb=$(printf '%s\n' "$linha" | python3 p_manual.py 2>/dev/null | head -1 | cut -c1-24)
    d=$([ "$ra" != "$rb" ] && echo "⚠" || echo " ")
    printf '  %-34s %-26s %s %s\n' "$(printf '%s' "$linha" | cut -c1-32)" "$ra" "$rb" "$d"
done < ~/parser-lab/corpus/csv/casos.txt

echo
echo "  ⚠ as linhas com ⚠ são as DISCORDÂNCIAS."
echo "     e o módulo 3 diz quais são bug."
```

⚠ **O exercício com o CSV é o ideal.** **Duas implementações em Python, com comportamentos
diferentes** — **e a discordância aparece na matriz.** **É o lab completo em vinte linhas.**

⚠ **E a discordância que aparece mais é a das **aspas soltas**** — **`"aspas soltas,b`**.** **A
stdlib trata como caso especial; o manual, não.** **É a divergência.**

**Produza `matriz.md`:**

| Entrada | Stdlib | Manual | Discordam? |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantas entradas discordam?**
2. **Qual comportamento é o mais divergente?**
3. **As duas seguem a RFC 4180?** Confira.
4. **Qual discordância é sobre framing** — "onde o campo termina"?

### Passo 2 — Isole e verifique (35 min)

⚠ **A garantia técnica do lab.**

```bash
cd ~/parser-lab/mod04

echo "═══ VERIFICANDO O ISOLAMENTO ═══"
echo

echo "  ── 1. o lab depende de rede? ──"
if grep -rlE 'requests|urllib|http|socket' ~/parser-lab/impls/ 2>/dev/null | head -3 | grep -q .; then
    echo "     ⚠ ATENÇÃO: alguma implementação usa rede:"
    grep -rlE 'requests|urllib|http|socket' ~/parser-lab/impls/ 2>/dev/null | sed 's/^/       /'
    echo "     ✓ verifique que é LOCALHOST e não terceiro"
else
    echo "     ✓ nenhuma implementação usa rede"
fi
echo

echo "  ── 2. as implementações apontam para terceiro? ──"
if grep -rnE 'https?://(?!localhost|127\.0\.0\.1)' ~/parser-lab/impls/ 2>/dev/null | grep -v '^Binary' | head -5 | grep -q .; then
    echo "     ⚠ ATENÇÃO: há URL externa nas implementações:"
    grep -rnE 'https?://' ~/parser-lab/impls/ 2>/dev/null | grep -viE 'localhost|127\.0\.0\.1' | head -5 | sed 's/^/       /'
else
    echo "     ✓ nenhuma implementação aponta para terceiro"
fi
echo

echo "  ── 3. o teste de isolamento (uma tentativa que FALHA) ──"
cat <<'EXPL'
     ⚠ se você rodar o lab num container:

        docker run --rm --network none <imagem> \
          curl -s --max-time 3 http://example.com \
          && echo "⚠⚠ ALCANÇOU" || echo "✓ não alcançou"

     ✓ a segunda saída é a esperada.
EXPL
echo

echo "  ── 4. a declaração ──"
cat > ~/parser-lab/impls/DECLARACAO.md <<'EOF'
# Declaração de isolamento

## As implementações
| # | Nome | Origem (URL) | Versão |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## O isolamento
| Item | Valor |
|---|---|
| rodam em | localhost / container |
| rede de saída | [ ] nenhuma  [ ] só localhost |
| apontam para terceiro? | ⚠ **NÃO** |
| teste de isolamento | [ ] feito, [ ] resultado |

## O que eu NÃO faço
- [ ] não mando payload a serviço de terceiro
- [ ] não testo WAF de produção
- [ ] não comparo serviços alheios
- [ ] não publico antes de reportar
EOF

cat ~/parser-lab/impls/DECLARACAO.md
```

⚠ **A declaração é o entregável ético.** **E ela é verificável:** **o passo 2 procura URLs
externas** — **e se achar, o lab não está isolado.**

⚠ **E o teste que **falha** é a prova.** **É o mesmo princípio do módulo 2 do Patch Diffing: você
**mede**, não supõe.**

**Produza `declaracao.md`:**

| Item | Valor |
|---|---|
| Rodam em | |
| Rede de saída | |
| Apontam para terceiro? | |
| Teste de isolamento | |

**Responda:**

1. **Alguma implementação usa rede?** Confirme que é localhost.
2. **O teste de isolamento passou?**
3. **A declaração está preenchida?**
4. **O que a declaração garante** que uma promessa não garante?

### Passo 3 — Registre e prepare o harness (35 min)

⚠ **A matriz vira o insumo do módulo 5.**

```bash
cd ~/parser-lab/mod04

echo "═══ REGISTRANDO A MATRIZ ═══"
echo
cat > tabela.py <<'PY'
#!/usr/bin/env python3
"""
tabela.py — produz a matriz de comportamento de N implementações.

⚠ usa as implementações LOCAIS. nenhuma rede, nenhum terceiro.
"""
import subprocess, sys, os

IMPLS = [
    # (nome, comando)
    ("stdlib",  ["python3", "p_csv.py"]),
    ("manual",  ["python3", "p_manual.py"]),
]

def roda(cmd, entrada):
    try:
        p = subprocess.run(cmd, input=entrada.encode(), capture_output=True, timeout=5)
        return p.stdout.decode(errors="replace").strip() or "<vazio>"
    except Exception as e:
        return f"<{type(e).__name__}>"

def main():
    corpus = sys.argv[1] if len(sys.argv) > 1 else "/dev/stdin"
    with open(corpus) as f:
        entradas = [l.rstrip("\n") for l in f if l.strip()]

    print("═══ MATRIZ DE COMPORTAMENTO ═══")
    print()
    print("  " + "-"*70)
    for ent in entradas:
        res = [(nome, roda(cmd, ent)) for nome, cmd in IMPLS]
        distintos = len(set(r for _, r in res))
        marca = "⚠ DISCORDAM" if distintos > 1 else "concordam"
        print(f"  entrada: {ent[:48]!r}")
        for nome, r in res:
            print(f"    {nome:<10} {r[:56]}")
        print(f"    → {marca}")
        print("  " + "-"*70)

    print()
    print("  ⚠ este é o insumo do harness (módulo 5).")
    print("     e o módulo 3 diz quais discordâncias são bug.")

if __name__ == "__main__":
    main()
PY

chmod +x tabela.py

cd ~/parser-lab/impls/csv
python3 ~/parser-lab/mod04/tabela.py ~/parser-lab/corpus/csv/casos.txt 2>&1 | head -40
```

Produza `matriz.md`:

| Entrada | Impl 1 | Impl 2 | Discordam? | Categoria (módulo 3) |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

**Responda:**

1. **Quantas linhas discordam?**
2. **Qual a categoria de cada uma?** Aplique a cascata.
3. **Alguma é sobre framing?**
4. **O que o módulo 5 vai acrescentar** a esta tabela?

### Critérios de aceitação

- `escolha-n.md` com as **três** implementações e o critério de cada.
- Você explicou **por que linguagens diferentes divergem mais**.
- Você explicou **por que propósitos diferentes divergem estruturalmente**.
- `isolamento.md` com as **três** formas e quando usar cada.
- Você explicou **qual forma o módulo 6 exige**.
- O **teste de isolamento** descrito, como um comando que **falha**.
- Você explicou **por que o isolamento se verifica**.
- `normalizacao.md` com o que normalizar e o que **não**.
- Você explicou **o critério de normalização**.
- Você explicou **o que acontece** com normalização demais e de menos.
- Você explicou **por que o mascaramento numérico é perigoso**.
- `~/parser-lab/impls/DECLARACAO.md` preenchida com **todas** as caixas.
- Você explicou **o que a declaração garante**.
- **Quatro** (ou pelo menos duas) implementações subidas e rodando.
- A **matriz** produzida com as duas implementações.
- Você identificou **pelo menos duas** discordâncias reais.
- Você classificou as discordâncias pela cascata do módulo 3.
- Você identificou **qual discordância é de framing**.
- ⚠ **Nenhum serviço de terceiro.** Nenhuma rede de saída.

---

## Avaliação

1. **Por que o lab é a fronteira ética do curso?**
2. **Por que subir N implementações é um módulo inteiro?**
3. **Cite os seis critérios** de escolha das N.
4. **Por que linguagens diferentes divergem mais?**
5. **Por que propósitos diferentes divergem estruturalmente?**
6. **Cite três fontes de N implementações** para um formato simples.
7. **Cite as três formas de subir**, por isolamento.
8. **Qual forma o módulo 6 exige?** Por quê?
9. **Qual é o teste de isolamento?** O que ele prova?
10. **Por que o isolamento se verifica** e não se promete?
11. **Cite cinco coisas a normalizar.**
12. **Cite cinco coisas a NÃO normalizar.**
13. **Qual é o critério de normalização?**
14. **O que acontece com normalização demais?**
15. **E com normalização de menos?**
16. **Por que o mascaramento numérico é perigoso?**
17. **O que a matriz de comportamento mostra?**
18. **Onde a discordância aparece na matriz?**
19. **O que a declaração de isolamento garante?**
20. **O que o harness do módulo 5 acrescenta** à matriz?

---

**Próximo:** [Módulo 5 — O harness diferencial](modulo-05.md)
