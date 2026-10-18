# Módulo 4 — Cobertura e o Guia

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Entender **cobertura** como **mecanismo**, não como métrica de exibição.
2. Reconhecer os **três tipos** de cobertura e o que cada um guia.
3. Ler a **saída do fuzzer** e saber o que ela está dizendo.
4. Diagnostizar **cobertura que satura** — e o que fazer.
5. Usar a cobertura como **oráculo de diagnóstico** do próprio harness.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Cobertura não é uma nota; é um mecanismo.** **O fuzzer usa a cobertura para decidir qual entrada
> guardar** — **e é isso que faz a mutação convergir.**

⚠ **E o mal-entendido mais comum:** **exibir a cobertura como progresso.** **Uma campanha com 80% de
cobertura pode não ter chegado a nenhum código que importa** — **e uma com 20% pode ter achado o
bug.**

⚠ **A tese:**

> **A pergunta não é "quanta cobertura eu tenho?"** — **é "a cobertura está **crescendo**, e para
> onde?".**

⚠ **A tabela dos três tipos:**

| Tipo | O que mede | ⚠ Guia bem? |
|---|---|---|
| **Blocos** | Ramos visitados | ✓ O padrão |
| **Arestas** | Transições | ✓ Melhor |
| ⚠ **Caminhos** | Sequências | ⚠ Explosão combinatória |
| **Comparações** | ⚠ Valores que faltam | ⚠ **O mais dirigido** |

⚠ **A última linha é o achado do módulo.** **Um fuzzer que só sabe "visitei este bloco" não sabe o
que falta.** **Um que sabe "esta comparação exige o valor 0x400" sabe exatamente o que gerar.**

---

## 4.1 O que a cobertura guia

⚠ **O mecanismo, em três passos.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. O fuzzer executa uma entrada                                       │
│ 2. ⚠ Ele REGISTRA quais blocos foram visitados                        │
│ 3. ⚠ Se a entrada visitou um bloco NOVO → ela é GUARDADA              │
│    (entra no corpus, e vira base para novas mutações)                 │
└──────────────────────────────────────────────────────────────────────┘

⚠ sem o passo 3, a mutação é ALEATÓRIA.
   ✓ e é ele que faz a campanha CONVERGIR.
```

⚠ **A linha do passo 3 é o que a cobertura **faz**.** **Ela não é uma medida — é um **critério de
seleção**.** **O fuzzer guarda quem explora.**

⚠ **E a tabela do que o fuzzer guarda e do que ele descarta:**

| Entrada | Bloco novo? | ⚠ O fuzzer |
|---|---|---|
| Visitou bloco novo | ✓ | ⚠ **Guarda** |
| Visitou só blocos conhecidos | ✗ | Descarta |
| Crashou | — | ⚠ **Guarda o crash** |
| Demorou demais | — | ⚠ Marca como timeout |

⚠ **A segunda linha é a chave da seleção.** **A maioria das mutações é descartada** — **e é o que
mantém o corpus pequeno e útil.**

⚠ **A regra escrita:**

> **O corpus **cresce** com a cobertura.** **E é por isso que cobertura que não cresce é um
> diagnóstico:** **significa que o fuzzer não está encontrando nada novo** — **e o problema pode
> estar no corpus, no harness, ou no alvo.**

```bash
mkdir -p ~/fuzz-lab/mod04 && cd ~/fuzz-lab/mod04

echo "═══ 1. o que a cobertura guia ═══"
echo
cat > guia.md <<'EOF'
# O que a cobertura guia

## O mecanismo, em 3 passos
1. o fuzzer executa uma entrada
2. ⚠ ele REGISTRA quais blocos foram visitados
3. ⚠ se a entrada visitou um bloco NOVO → ela é GUARDADA

## ⚠ sem o passo 3, a mutação é ALEATÓRIA
✓ e é ele que faz a campanha CONVERGIR.

## O que o fuzzer guarda
| Entrada | Bloco novo? | O fuzzer |
|---|---|---|
| visitou bloco novo | ✓ | ⚠ GUARDA |
| só blocos conhecidos | ✗ | DESCARTA |
| crashou | — | ⚠ guarda o crash |
| demorou demais | — | ⚠ marca timeout |

## ⚠ a segunda linha é a chave
a MAIORIA das mutações é descartada.
✓ e é o que mantém o corpus pequeno e ÚTIL.

## ⚠ A REGRA
o corpus CRESCE com a cobertura.
e é por isso que cobertura que NÃO CRESCE é um DIAGNÓSTICO:
significa que o fuzzer não está achando nada NOVO —
e o problema pode estar no CORPUS, no HARNESS ou no ALVO.
EOF

cat guia.md

echo
echo "═══ 2. os três tipos, e o mais dirigido ═══"
echo
cat <<'EXPL'
  ── 1. COBERTURA DE BLOCOS ──
     "este bloco foi visitado?"
     ✓ o padrão. simples e eficaz.
     ⚠ mas não distingue "passei aqui uma vez" de "passei mil vezes".

  ── 2. COBERTURA DE ARESTAS ──
     "esta TRANSIÇÃO aconteceu?"
     ✓ melhor: distingue caminhos que compartilham blocos.
     ✓ é o padrão do AFL++ e do LibFuzzer.

  ── 3. ⚠ COBERTURA DE COMPARAÇÕES ──
     "esta comparação exige o valor X, e eu ainda não o gerei"
     ⚠ **O MAIS DIRIGIDO.**
     ✓ e é o que o 1dFuzz e as técnicas guiadas usam.

  ── POR QUE O 3 É DIFERENTE ──
     com blocos, o fuzzer sabe que EXISTE um ramo não visitado.
     ⚠ mas não sabe O QUE precisa gerar para entrar nele.
     ✓ com comparações, ele SABE.
EXPL
```

⚠ **Os três tipos são o instrumento.** **E a distinção do último é o que separa o fuzzer**
**convergente** do **aleatório.**

⚠ **E a nota do "sabe o que gerar" é a ponte com o módulo 8:** **o `1dFuzz` usa exatamente essa
informação** — **só que a obtém da posição do patch.**

**Produza `guia.md`:**

| Passo | O que faz |
|---|---|
| 1 | |
| 3 | |

**Responda:**

1. **Qual passo faz a campanha convergir?
2. **O que o fuzzer guarda?** E o que descarta?
3. **Cite os três tipos** e o que cada um guia.
4. **Por que o terceiro é o mais dirigido?

---

## 4.2 Lendo a saída

⚠ **A saída do fuzzer diz coisas. E a maioria dos campos é ignorada.**

| Campo | O que significa |
|---|---|
| **exec/s** | ⚠ **A velocidade — e ela é do harness** |
| **cov** | Blocos ou arestas alcançados |
| **ft** | Features — o que o fuzzer conta |
| ⚠ **"NEW"** | ⚠ **Cobertura NOVA — o sinal de progresso** |
| **cycles** | Rondas completas sobre o corpus |
| ⚠ **"no new"** | ⚠ **Saturação** |

⚠ **A linha do "NEW" é o que se observa.** **Ela aparece quando a campanha está progredindo** — **e
**para** quando saturou.**

⚠ **A tabela do que a saída revela, por padrão:**

| Você vê | ⚠ Significa |
|---|---|
| "NEW" frequente | ✓ A campanha progride |
| ⚠ **"NEW" para em segundos** | ⚠ **O corpus não entra** |
| **exec/s baixo** | ⚠ **O harness é lento** |
| Crashes em cascata | ⚠ Triagem |
| ⚠ **cov baixa e estável** | ⚠ Harness filtrou, ou alvo estéril |

⚠ **A terceira linha é a mais comum.** **exec/s baixo é quase sempre **o harness** — **não a
máquina.**

⚠ **A regra escrita:**

> **A saída do fuzzer é um diagnóstico, e ela aponta para o elemento errado.** **"NEW" parando aponta
> o corpus; exec/s baixo aponta o harness; cov estável aponta o alvo.**

```bash
cd ~/fuzz-lab/mod04

echo "═══ 3. lendo a saída ═══"
echo
cat > lendo.md <<'EOF'
# Lendo a saída

| Campo | O que significa |
|---|---|
| exec/s | ⚠ a VELOCIDADE — e ela é do HARNESS |
| cov | blocos ou arestas alcançados |
| ft | features — o que o fuzzer conta |
| ⚠ "NEW" | ⚠ cobertura NOVA — o SINAL de progresso |
| cycles | rondas sobre o corpus |
| ⚠ "no new" | ⚠ SATURAÇÃO |

## O que a saída revela
| Você vê | Significa |
|---|---|
| "NEW" frequente | ✓ a campanha progride |
| ⚠ "NEW" para em SEGUNDOS | ⚠ o CORPUS não entra |
| exec/s baixo | ⚠ o HARNESS é lento |
| crashes em cascata | ⚠ TRIAGEM |
| ⚠ cov baixa e estável | ⚠ harness filtrou, ou alvo estéril |

## ⚠ a linha mais comum
exec/s baixo é quase sempre O HARNESS —
não a máquina.

## ⚠ A REGRA
a saída é um DIAGNÓSTICO, e ela aponta para o elemento ERRADO.
· "NEW" parando    → o CORPUS
· exec/s baixo     → o HARNESS
· cov estável      → o ALVO
EOF

cat lendo.md

echo
echo "═══ 4. o diagnóstico automático ═══"
echo
cat > diagnostica.py <<'PY'
#!/usr/bin/env python3
"""
diagnostica.py — lê a saída do fuzzer e diagnostica o ELEMENTO errado.

⚠ DIDÁTICO. analisa uma saída de campanha.
"""
import re, sys

# ── a saída de exemplo (cole a sua) ──
SAIDA_EXEMPLO = """
INFO: Seed: 1234567
INFO: Loaded 1 modules
INFO: -max_len is not provided; libFuzzer will not generate inputs larger than 4096 bytes
INFO: A corpus is not provided, starting from an empty corpus
#2      INITED cov: 12 ft: 13 corp: 1/1b exec/s: 0 rss: 24Mb
#100    NEW    cov: 18 ft: 19 corp: 2/2b lim: 4 exec/s: 50000 rss: 25Mb
#200    NEW    cov: 22 ft: 24 corp: 3/8b lim: 4 exec/s: 50000 rss: 25Mb
#500    NEW    cov: 31 ft: 35 corp: 5/16b lim: 6 exec/s: 50000 rss: 26Mb
#10000  DONE   cov: 31 ft: 35 corp: 5/16b lim: 6 exec/s: 50000 rss: 26Mb
"""


def main():
    texto = sys.argv[1] if len(sys.argv) > 1 else SAIDA_EXEMPLO
    try:
        texto = open(texto).read()
    except (FileNotFoundError, IsADirectoryError):
        pass

    print("═══ DIAGNÓSTICO DA CAMPANHA ═══")
    print()

    # ── extrai a série de cobertura ──
    eventos = re.findall(r"#(\d+)\s+(NEW|DONE|pulse)?\s*cov: (\d+)", texto)
    if not eventos:
        print("  ⚠ não consegui parsear a cobertura.")
        print("     ✓ cole a saída do seu fuzzer num arquivo e passe o caminho.")
        return

    novos = [int(e[0]) for e in eventos if e[1] == "NEW"]
    covs = [int(e[2]) for e in eventos]

    print(f"  eventos com 'NEW' : {len(novos)}")
    print(f"  cobertura inicial : {covs[0]}")
    print(f"  ⚠ cobertura final : {covs[-1]}")
    print()

    if novos:
        print(f"  o último 'NEW' veio na execução #{novos[-1]}")
        print()

    # ── o diagnóstico ──
    print("  ═══ DIAGNÓSTICO ═══")
    if len(novos) < 3:
        print("  ⚠ POUCOS 'NEW' → o CORPUS não está entrando no parser")
        print("     ✓ construa o corpus de FRONTEIRA (módulo 5)")
    elif novos and novos[-1] < 1000:
        print("  ⚠ 'NEW' parou CEDO → cobertura saturou rápido")
        print("     · o corpus é pequeno demais, ou")
        print("     · o harness FILTRA a entrada (módulo 3)")
    else:
        print("  ✓ a campanha progrediu — a cobertura seguiu crescendo")

    # ── exec/s ──
    ex = re.findall(r"exec/s: (\d+)", texto)
    if ex:
        ultimo = int(ex[-1])
        print()
        print(f"  exec/s: {ultimo}")
        if ultimo < 1000:
            print("  ⚠ exec/s BAIXO → o HARNESS é lento")
            print("     ✓ inicializa fora do caminho quente (módulo 3)")
        elif ultimo < 20000:
            print("  · exec/s médio — verifique se há inicialização no laço")
        else:
            print("  ✓ exec/s bom — in-process, com sanitizer")

    print()
    print("  ⚠ o diagnóstico aponta o ELEMENTO, não o culpado.")
    print("     ✓ a correção é o módulo correspondente.")


if __name__ == "__main__":
    main()
PY

chmod +x diagnostica.py
python3 diagnostica.py
```

⚠ **O diagnóstico é o instrumento.** **E ele traduz números em elemento:** **poucos "NEW" aponta o
corpus; exec/s baixo aponta o harness.**

⚠ **E é a resposta prática ao módulo 1:** **o fuzzer "não achar nada" não é um veredito** — **é um
sintoma, e ele tem causa.**

**Produza `diagnostico.md`:**

| Sintoma | Elemento culpado |
|---|---|
| "NEW" para cedo | |
| exec/s baixo | |
| cov estável | |

**Responda:**

1. **O que "NEW" parando indica?
2. **O que exec/s baixo indica?** Por que quase sempre é o harness?
3. **O que cov baixa e estável indica?
4. **Qual diagnóstico o seu fuzzer deu?

---

## 4.3 Cobertura que satura

⚠ **Os quatro casos de saturação, e a correção de cada.**

| Causa | Sintoma | ⚠ Correção |
|---|---|---|
| **Corpus não entra** | "NEW" em segundos | ⚠ **Fronteira (módulo 5)** |
| **Harness filtra** | cov baixa | ⚠ **Remover o `if` (módulo 3)** |
| ⚠ **Comparação difícil** | Um ramo nunca visitado | ⚠ **Semente que o alcança** |
| Alvo estéril | cov estável, alta | ⚠ Trocar de alvo |

⚠ **A linha da "comparação difícil" é a mais técnica, e a mais comum.** **O código faz
`if (magic == 0xDEADBEEF)`** — **e a mutação aleatória **nunca** gera esse valor.** **É a chamada
"barreira de comparação", e é o que a cobertura de comparações resolve.**

⚠ **E a tabela do que fazer com uma barreira:**

| Barreira | O que fazer |
|---|---|
| Magic number | ⚠ **Semente com o valor** |
| Checksum | ⚠ Calcular e semear |
| ⚠ **Comparação de string** | ⚠ **Dicionário** |
| Comprimento exato | Semente com o tamanho |

⚠ **A linha do dicionário é a solução clássica do AFL++.** **Você dá ao fuzzer os tokens que ele não
descobriria** — **e ele os insere nas mutações.**

⚠ **A regra escrita:**

> **Uma comparação é uma porta fechada, e o fuzzer precisa da chave.** **Ou você dá a chave
> (dicionário, semente), ou o fuzzer a adivinha em anos.**

```bash
cd ~/fuzz-lab/mod04

echo "═══ 5. cobertura que satura ═══"
echo
cat > saturacao.md <<'EOF'
# Cobertura que satura

| Causa | Sintoma | Correção |
|---|---|---|
| CORPUS não entra | "NEW" em segundos | ⚠ FRONTEIRA (módulo 5) |
| HARNESS filtra | cov baixa | ⚠ remover o `if` (módulo 3) |
| ⚠ COMPARAÇÃO difícil | um ramo nunca visitado | ⚠ semente que o alcança |
| alvo estéril | cov estável, alta | ⚠ trocar de alvo |

## ⚠ a linha da comparação difícil
o código faz `if (magic == 0xDEADBEEF)` —
e a mutação aleatória NUNCA gera esse valor.
✓ é a "BARREIRA DE COMPARAÇÃO".

## O que fazer com uma barreira
| Barreira | O que fazer |
|---|---|
| MAGIC number | ⚠ semente com o valor |
| CHECKSUM | ⚠ calcular e semear |
| ⚠ comparação de STRING | ⚠ DICIONÁRIO |
| comprimento exato | semente com o tamanho |

## ⚠ o dicionário é a solução clássica
você dá ao fuzzer os TOKENS que ele não descobriria.
✓ e ele os insere nas mutações.

## ⚠ A REGRA
uma comparação é uma PORTA FECHADA, e o fuzzer precisa da CHAVE.
ou você dá a chave (dicionário, semente),
ou o fuzzer a adivinha em ANOS.
EOF

cat saturacao.md

echo
echo "═══ 6. o dicionário, e a semente que destrava ═══"
echo
cat > dicionario.txt <<'EOF'
"magic"
"0xDEADBEEF"
"header"
"count"
"total"
"\x00\x00"
"\xff\xff"
"\x04\x00"
EOF

echo "  ── um dicionário para o alvo do curso ──"
cat -n dicionario.txt | sed 's/^/     /'
echo
echo "  ⚠ e a semente que destrava o ramo:"
cat <<'EXPL'
     o alvo verifica:
        if (count > MAX_ITENS) return -2;   ← MAX_ITENS = 1024 = 0x400

     ⚠ a mutação aleatória raramente gera 0x0400 em dois bytes.
     ✓ então a semente precisa CONTER count = 0x0401 (1025):

        printf '\x01\x04\x00\x00\x00\x00AAAA' > corpus/fronteira/count_1025

     ✓ e com isso o fuzzer visita o ramo do return -2.
EXPL

mkdir -p ~/fuzz-lab/corpus/fronteira
python3 - <<'PY'
import struct, os
base = os.path.expanduser("~/fuzz-lab/corpus/fronteira")
for v in [0, 1, 1023, 1024, 1025, 65535]:
    with open(f"{base}/count_{v}", "wb") as f:
        f.write(struct.pack("<H", v) + b"\x00" * 4 + b"A" * 8)
    print(f"     ✓ count_{v}")
PY
echo
echo "  ⚠ e estas sementes SÃO o módulo 5, antecipado."
```

⚠ **O dicionário e a semente são o instrumento.** **E a semente com `count = 1025` é a prova
concreta:** **sem ela, o fuzzer pode levar anos para gerar `0x0401` em dois bytes.**

⚠ **E a nota final fecha o arco:** **a cobertura de comparações é o que o fuzzer **não** faz
sozinho** — **e é o que o módulo 5 resolve com o corpus.**

**Produza `barreira.md`:**

| Barreira | Solução |
|---|---|
| Magic number | |
| Comparação de string | |
| Comprimento exato | |

**Responda:**

1. **O que é uma barreira de comparação?
2. **Por que a mutação aleatória não a vence?
3. **O que o dicionário faz?
4. **Por que a semente com `count_1025` destrava o ramo?

---

## 4.4 LAB — A cobertura medida

**Duração:** 120 min

### Passo 1 — Rode com e sem corpus (50 min)

⚠ **O experimento: **o mesmo fuzzer, dois corpus, e a cobertura comparada.****

```bash
cd ~/fuzz-lab/mod04

echo "═══ COM E SEM CORPUS ═══"
echo
cat <<'EXPL'
  ── O EXPERIMENTO CONTROLADO ──

     A) corpus VAZIO (só um seed mínimo)
     B) corpus de FRONTEIRA (as 6 sementes do §4.3)

     ⚠ e a diferença de cobertura é o argumento do módulo 5.

  ── COMO MEDIR ──
     rode os dois por 60s, e compare:
        · cov final
        · ⚠ quando o último "NEW" apareceu
EXPL

mkdir -p /tmp/corpus-vazio && printf '\x01\x00\x00\x00\x00\x00AAAA' > /tmp/corpus-vazio/seed

cd ~/fuzz-lab/alvos 2>/dev/null && {
    echo "  ── A) corpus vazio ──"
    timeout 65 ./fuzz_minimo /tmp/corpus-vazio -max_total_time=60 -print_final_stats=1 2>&1 | \
        grep -E 'NEW|cov:|DONE|stat::' | tail -6 | sed 's/^/     /'
    echo
    echo "  ── B) corpus de fronteira ──"
    timeout 65 ./fuzz_minimo ~/fuzz-lab/corpus/fronteira -max_total_time=60 -print_final_stats=1 2>&1 | \
        grep -E 'NEW|cov:|DONE|stat::' | tail -6 | sed 's/^/     /'
} || echo "  ⚠ o alvo não existe — rode o módulo 1"
```

⚠ **O experimento controlado é o instrumento.** **E a diferença de cobertura é o argumento:** **o
corpus de fronteira chega onde o vazio não chega.**

⚠ **E a nota do "quando o último NEW apareceu" é a medida mais fina:** **não basta a cobertura
final** — **importa **quando** ela parou de crescer.**

**Produza `com-sem-corpus.md`:**

| Corpus | Cobertura | Último NEW |
|---|---|---|
| Vazio | | |
| Fronteira | | |

**Responda:**

1. **A cobertura difere?** Quanto?
2. **Quando o último "NEW" apareceu** em cada?
3. **Qual dos dois saturou mais rápido?
4. **O que isso prova** sobre o módulo 5?

### Passo 2 — Destrave um ramo com uma semente (40 min)

⚠ **Uma barreira concreta, e a semente que a vence.**

```bash
cd ~/fuzz-lab/mod04

echo "═══ DESTRAVANDO UM RAMO ═══"
echo
cat <<'EXPL'
  ── O RAMO BLOQUEADO ──
     o alvo tem:
        if (count > MAX_ITENS) return -2;     ← 0x400 = 1024

     ⚠ para VISITAR o return -2, o fuzzer precisa de count > 1024.
     e gerar 0x0401 em dois bytes aleatórios é improvável.

  ── A SEMENTE QUE DESTRAVA ──
     count = 1025 = 0x0401, em little-endian: \x01\x04

     ✓ e é o que já está em corpus/fronteira/count_1025.

  ── COMO CONFIRMAR ──
     rode com a semente e veja se a cobertura SOBE
     exatamente quando o ramo é visitado.
EXPL

cd ~/fuzz-lab/alvos 2>/dev/null && {
    echo "  ── rodando com a semente que destrava ──"
    timeout 40 ./fuzz_minimo ~/fuzz-lab/corpus/fronteira -max_total_time=35 2>&1 | \
        grep -E 'NEW|cov:' | head -8 | sed 's/^/     /'
    echo
    echo "  ⚠ se a cobertura subiu já nos primeiros 'NEW', a semente entrou."
} || echo "  ⚠ o alvo não existe"
echo

cat > caderno/PD-004.md <<'EOF'
# PD-004 — a cobertura

**Data:** ____

## 1. A campanha
| Item | Valor |
|---|---|
| alvo | |
| harness | |
| ferramenta | |

## 2. Com e sem corpus
| Corpus | cov inicial | cov final | último NEW | exec/s |
|---|---|---|---|---|
| vazio | | | | |
| fronteira | | | | |

## 3. ⚠ O diagnóstico
| Sintoma | Presente? | Elemento |
|---|---|---|
| "NEW" parou cedo | | corpus |
| exec/s baixo | | harness |
| cov estável e alta | | alvo |

## 4. As barreiras encontradas
| # | Barreira | Valor exigido | Semente que destrava |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 5. O dicionário
| Token | Por quê |
|---|---|
| | |

## 6. ⚠ O que a cobertura NÃO diz
| Item | Por quê |
|---|---|
| se o bug está lá | ⚠ cobertura ≠ correção |
| se a entrada é válida | |
| quantos bugs restam | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro

## 8. O que NÃO foi verificado
⚠ mínimo 3
EOF

echo "  ⚠ e a seção 6 é importante: cobertura NÃO é correção."
```

⚠ **A seção 6 da ficha é o contrapeso do módulo.** **Cobertura alta não significa ausência de bug**
— **significa que o fuzzer passou por ali.** **E passar não é o mesmo que verificar.**

⚠ **E a nota do "cobertura ≠ correção" é o que evita o relatório exagerado:** **"90% de cobertura"
não é "90% testado".**

**Produza `destravado.md`:**

| Barreira | Valor | Semente |
|---|---|---|
| | | |

**Responda:**

1. **A semente destravou o ramo?** A cobertura subiu?
2. **Qual barreira você encontrou?
3. **O que o dicionário adicionaria?
4. **O que a cobertura NÃO diz?

### Passo 3 — Documente (30 min)

Produza `relatorio-cobertura.md`:

```markdown
# Relatório — cobertura

## 1. As campanhas
| Corpus | cov | último NEW | exec/s |
|---|---|---|---|
| vazio | | | |
| fronteira | | | |

## 2. A evidência
```
a saída literal dos dois
```

## 3. ⚠ O diagnóstico
| Sintoma | Elemento | Correção |
|---|---|---|
| | | |

## 4. As barreiras e as sementes
| # | Barreira | Semente |
|---|---|---|
| | | |

## 5. O dicionário
```
[o dicionário]
```

## 6. ⚠ O que a cobertura prova, e o que não prova
**Prova:**
- o fuzzer passou por estes blocos

**NÃO prova:**
- que não há bug
- que a entrada foi válida
- que o caminho é alcançável em produção

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O próximo passo
| # | Ação | Prioridade |
```

**Produza `relatorio-cobertura.md`:**

| Item | Valor |
|---|---|
| Cobertura | |
| Barreira | |
| O que não prova | |

**Responda:**

1. **O diagnóstico apontou qual elemento?
2. **Qual a barreira que você destravou?
3. **O relatório diz o que a cobertura não prova?
4. **Qual o próximo passo?

### Critérios de aceitação

- `guia.md` com os **três passos** do mecanismo.
- Você explicou **por que o passo 3 faz convergir**.
- Você explicou **o que o fuzzer guarda e o que descarta**.
- Você explicou **os três tipos** e por que o terceiro é o mais dirigido.
- `lendo.md` com os **seis** campos da saída.
- Você explicou **o que cada sintoma aponta**.
- Você explicou **por que exec/s baixo é quase sempre o harness**.
- `diagnostica.py` rodado, com o diagnóstico.
- `saturacao.md` com as **quatro** causas e a correção de cada.
- Você explicou **o que é uma barreira de comparação**.
- Você explicou **o que o dicionário faz**.
- O **experimento com e sem corpus** rodado, com a cobertura comparada.
- Você mediu **quando o último "NEW" apareceu** em cada.
- Você **destravou um ramo** com uma semente.
- Você explicou **por que `count_1025` destrava o ramo**.
- `caderno/PD-004.md` com as **oito** seções.
- Você explicou **o que a cobertura NÃO diz**.
- `relatorio-cobertura.md` com as **nove** seções.
- ⚠ **Nenhum fuzz pela rede.**

---

## Avaliação

1. **O que a cobertura é?** Mecanismo ou métrica?
2. **Cite os três passos** do mecanismo.
3. **Qual passo faz a campanha convergir?
4. **O que o fuzzer guarda?** E o que descarta?
5. **Cite os três tipos de cobertura.
6. **Qual guia melhor?** Por quê?
7. **Qual é o mais dirigido?** Por quê?
8. **Cite os seis campos** da saída do fuzzer.
9. **O que "NEW" significa?
10. **O que "NEW" parando em segundos indica?
11. **O que exec/s baixo indica?** Por que quase sempre é o harness?
12. **O que cov estável e alta indica?
13. **Cite as quatro causas de saturação.
14. **O que é uma barreira de comparação?
15. **Por que a mutação aleatória não a vence?
16. **Cite quatro barreiras e a solução de cada.
17. **O que o dicionário faz?
18. **Como uma semente destrava um ramo?
19. **Por que a cobertura não é correção?
20. **O que "90% de cobertura" não significa?

---

**Próximo:** [Módulo 5 — O corpus de fronteira](modulo-05.md)
