# Módulo 5 — O Corpus de Fronteira

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4 · Parser Differentials (módulo 5)

---

## Objetivos

1. Entender por que o **corpus é o maior ganho** depois do oráculo.
2. Construir o **corpus de fronteira por campo** — o do Parser Differentials, agora como semente.
3. Reconhecer o que torna uma semente **boa**.
4. **Medir** o efeito do corpus na cobertura.
5. Manter o **mapa** — o que cada semente testa.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O corpus é o mapa que você dá ao fuzzer.** **Sem ele, o fuzzer procura a fronteira no escuro** —
> **e a fronteira é uma coordenada exata num espaço enorme.**

⚠ **E é literalmente o achado do módulo 4:** **uma comparação é uma porta fechada** — **e o corpus é
a chave.**

⚠ **A tese:**

> **Um corpus de fronteira não é "mais sementes" — é **as sementes certas**.** **Seis arquivos bem
> escolhidos valem mais que dez mil aleatórios** — **e o módulo 4 mediu isso.**

⚠ **A tabela do que uma semente **faz**:**

| A semente faz | ⚠ Por quê |
|---|---|
| **Entra no parser** | ⚠ **Passa a validação inicial** |
| Alcança um ramo novo | Cobertura |
| **Vence uma barreira** | ⚠ **A porta se abre** |
| Dá base para mutação | O fuzzer muta **a partir dela** |

⚠ **A terceira linha é o valor principal.** **Uma semente com `count = 1025` faz o fuzzer **começar**
depois da barreira** — **e ele muta dentro do ramo, em vez de tentar chegar nele.**

---

## 5.1 Os valores de fronteira

⚠ **A tabela, herdada do Parser Differentials — com o uso trocado.**

| Valor | Por quê | ⚠ Uso aqui |
|---|---|---|
| **0** | Vazio | Semente |
| **1** | Mínimo | Semente |
| **limite − 1** | A fronteira | Semente |
| **limite** | O limite exato | ⚠ **Off-by-one** |
| ⚠ **limite + 1** | ⚠ **A violação** | ⚠ **O ramo de erro** |
| **máximo do tipo** | Overflow | Semente |
| Máximo + 1 | Se possível | Truncamento |

⚠ **A tabela do que cada valor **exercita**, no alvo do curso:**

| Valor de `count` | O que o alvo faz | ⚠ Ramo |
|---|---|---|
| 0 | `total = 0` | Caminho normal |
| 1 | `total = 4` | Normal |
| 1024 | `total = 4096 > 64` → `-3` | ⚠ **Fronteira 2** |
| ⚠ **1025** | ⚠ `> MAX_ITENS` → `-2` | ⚠ **Fronteira 1** |
| 65535 | `-2` | Fronteira 1 |

⚠ **A linha do 1024 é a que quase todos erram.** **Com `count = 1024`, o alvo **passa** a primeira
verificação** — **e cai na segunda**, **porque `1024 × 4 > 64`.** **É a interação entre as duas
fronteiras**, **e é onde o bug mora.**

⚠ **A regra escrita:**

> **Cada fronteira é um campo, e cada campo é um caso.** **Mas o valor mais interessante é onde duas
> fronteiras se cruzam** — **porque é onde a ordem das verificações importa.**

```bash
mkdir -p ~/fuzz-lab/mod05 && cd ~/fuzz-lab/mod05

echo "═══ 1. os valores de fronteira ═══"
echo
cat > fronteira.md <<'EOF'
# Os valores de fronteira

| Valor | Por quê | Uso aqui |
|---|---|---|
| 0 | vazio | semente |
| 1 | mínimo | semente |
| limite − 1 | a fronteira | semente |
| limite | o limite exato | ⚠ OFF-BY-ONE |
| ⚠ limite + 1 | ⚠ a violação | ⚠ O RAMO DE ERRO |
| máximo do tipo | overflow | semente |
| máximo + 1 | se possível | truncamento |

## O que cada valor EXERCITA (no alvo do curso)
| count | o alvo faz | ramo |
|---|---|---|
| 0 | total = 0 | normal |
| 1 | total = 4 | normal |
| ⚠ 1024 | total = 4096 > 64 → -3 | ⚠ FRONTEIRA 2 |
| ⚠ 1025 | > MAX_ITENS → -2 | ⚠ FRONTEIRA 1 |
| 65535 | -2 | fronteira 1 |

## ⚠ a linha do 1024
com count = 1024, o alvo PASSA a primeira verificação —
e cai na SEGUNDA, porque 1024 × 4 > 64.
✓ é a INTERAÇÃO entre as duas fronteiras,
   e é onde o bug mora.

## ⚠ A REGRA
cada fronteira é um campo, e cada campo é um caso.
mas o valor mais interessante é onde DUAS FRONTEIRAS SE CRUZAM —
porque é onde a ORDEM das verificações importa.
EOF

cat fronteira.md

echo
echo "═══ 2. o gerador, por campo ═══"
echo
cat > gera-corpus.py <<'PY'
#!/usr/bin/env python3
"""
gera-corpus.py — gera o corpus de FRONTEIRA para o alvo do curso.

⚠ DIDÁTICO. gera as SEMENTES — o fuzzer faz o resto.
"""
import struct, os, sys

SAIDA = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/fuzz-lab/corpus/fronteira")

# ── as fronteiras do alvo ──
MAX_ITENS = 1024       # ⚠ fronteira 1
DST_SIZE  = 64         # ⚠ fronteira 2
TIPO_MAX  = 0xFFFF     # count é uint16_t

VALORES_COUNT = [0, 1, 2, 15, 16, 17, MAX_ITENS - 1, MAX_ITENS,
                 MAX_ITENS + 1, 2048, TIPO_MAX]

# ── os tamanhos de payload, para a fronteira de size ──
TAMANHOS = [0, 5, 6, 7, 63, 64, 65, 70]


def escreve(nome: str, count: int, total: int, tam_dados: int, tam_total: int):
    """monta um arquivo: count(2) + total(4) + dados"""
    corpo = struct.pack("<H", count) + struct.pack("<I", total)
    corpo += b"A" * tam_dados
    if tam_total > len(corpo):
        corpo += b"\x00" * (tam_total - len(corpo))
    corpo = corpo[:tam_total]
    with open(os.path.join(SAIDA, nome), "wb") as f:
        f.write(corpo)
    return len(corpo)


def main():
    os.makedirs(SAIDA, exist_ok=True)
    print("═══ GERANDO O CORPUS DE FRONTEIRA ═══")
    print()
    print(f"  saída: {SAIDA}")
    print()
    print(f"  {'arquivo':<28} {'count':>6} {'bytes':>7}  o que testa")
    print("  " + "-"*72)

    mapa = []

    # ── count: as fronteiras ──
    for v in VALORES_COUNT:
        nome = f"count_{v}"
        n = escreve(nome, v, 0, 8, 6 + 8)
        if v > MAX_ITENS:
            nota = "⚠ RAMO DE ERRO (-2)"
        elif v == MAX_ITENS:
            nota = "⚠ passa a 1ª, cai na 2ª"
        else:
            nota = "caminho normal"
        print(f"  {nome:<28} {v:>6} {n:>7}  {nota}")
        mapa.append((nome, f"count = {v}", nota))

    # ── size: a fronteira do tamanho ──
    for t in TAMANHOS:
        nome = f"size_{t}"
        n = escreve(nome, 1, 4, max(0, t - 6), t)
        nota = "⚠ menor que o cabeçalho" if t < 6 else "cabeçalho completo"
        print(f"  {nome:<28} {'—':>6} {n:>7}  {nota}")
        mapa.append((nome, f"size = {t}", nota))

    # ── a interação: count alto com size justo ──
    nome = "interacao_count_justo"
    n = escreve(nome, MAX_ITENS, 0, 64, 6 + 64)
    print(f"  {nome:<28} {MAX_ITENS:>6} {n:>7}  ⚠ fronteiras CRUZADAS")
    mapa.append((nome, f"count={MAX_ITENS} + size=70", "⚠ cruzamento"))

    print()
    print(f"  ✓ {len(mapa)} sementes geradas")
    print()
    print("  ⚠ e note: NÃO são aleatórias. cada uma testa um PONTO.")
    print("     ✓ e o MAPA diz qual.")

    # ── escreve o mapa ──
    with open(os.path.join(SAIDA, "MAPA.md"), "w") as f:
        f.write("# Mapa do corpus\n\n")
        f.write("| Semente | Testa | O que exercita |\n|---|---|---|\n")
        for nome, o, nota in mapa:
            f.write(f"| `{nome}` | {o} | {nota} |\n")
    print(f"  ✓ MAPA.md escrito")


if __name__ == "__main__":
    main()
PY

chmod +x gera-corpus.py
python3 gera-corpus.py
```

⚠ **O gerador é o instrumento.** **E ele gera **as sementes certas** — não muitas.** **E cada uma
tem uma razão.**

⚠ **E a semente `interacao_count_justo` é a mais interessante:** **as duas fronteiras cruzadas** —
**e é onde a ordem das verificações decide o comportamento.**

**Produza `fronteira.md`:**

| count | O alvo faz | Ramo |
|---|---|---|
| 1024 | | |
| 1025 | | |
| 0 | | |

**Responda:**

1. **O que `count = 1024` exercita?** Por que é o valor mais interessante?
2. **O que `count = 1025` exercita?
3. **Por que a interação entre fronteiras importa?
4. **Quantas sementes o gerador produziu?

---

## 5.2 O que torna uma semente boa

⚠ **Quatro critérios. E eles são observáveis depois de rodar o fuzzer.**

| # | Critério | ⚠ Como saber |
|---|---|---|
| 1 | **Entra no parser** | A cobertura sobe |
| 2 | **Alcança ramo novo** | "NEW" aparece |
| 3 | **É válida o suficiente** | Não é rejeitada na 1ª linha |
| 4 | ⚠ **É pequena** | ⚠ **O fuzzer muta melhor** |

⚠ **A linha 3 é a mais contraintuitiva, e a mais importante.** **Uma semente **válida demais** e uma
**inválida** são igualmente ruins:** **a válida não exercita o erro; a inválida não passa.** **A
semente boa é a **válida até certo ponto** — **o suficiente para chegar na fronteira.**

⚠ **E a tabela do que cada tipo de semente faz:**

| Semente | ⚠ Efeito |
|---|---|
| Vazia | ⚠ Rejeitada na 1ª checagem |
| Truncada | Rejeitada |
| ⚠ **Válida até a fronteira** | ✓ **Exercita o ramo** |
| Válida e grande | ✓ Funciona, mas lenta |
| ⚠ **Muito grande** | ⚠ O fuzzer gasta mutando o tamanho |

⚠ **A linha 5 é o custo do tamanho.** **Uma semente de 1 MB faz o fuzzer gastar a maioria das
mutações em bytes irrelevantes** — **e o sinal se perde no ruído.**

⚠ **A regra escrita:**

> **A semente boa é a menor que ainda chega ao ramo.** **Ela minimiza o que o fuzzer tem de mutar, e
> maximiza o que ele tem de explorar.**

```bash
cd ~/fuzz-lab/mod05

echo "═══ 3. o que torna uma semente boa ═══"
echo
cat > semente-boa.md <<'EOF'
# O que torna uma semente boa

| # | Critério | Como saber |
|---|---|---|
| 1 | ENTRA no parser | a cobertura sobe |
| 2 | alcança RAMO NOVO | "NEW" aparece |
| 3 | é VÁLIDA o suficiente | não é rejeitada na 1ª linha |
| 4 | ⚠ é PEQUENA | ⚠ o fuzzer muta melhor |

## ⚠ a linha 3 é a mais contraintuitiva
uma semente VÁLIDA DEMAIS e uma INVÁLIDA são
igualmente RUINS:
· a válida não exercita o ERRO
· a inválida não PASSA
✓ a semente boa é válida ATÉ CERTEZA PONTO —
   o suficiente para chegar na FRONTEIRA.

## O que cada tipo faz
| Semente | Efeito |
|---|---|
| vazia | ⚠ rejeitada na 1ª checagem |
| truncada | rejeitada |
| ⚠ VÁLIDA ATÉ A FRONTEIRA | ✓ EXERCITA o ramo |
| válida e grande | ✓ funciona, mas lenta |
| ⚠ MUITO grande | ⚠ o fuzzer gasta mutando o TAMANHO |

## ⚠ a linha 5 é o custo do tamanho
uma semente de 1 MB faz o fuzzer gastar a MAIORIA
das mutações em bytes IRRELEVANTES.
✓ e o sinal se perde no RUÍDO.

## ⚠ A REGRA
a semente boa é a MENOR que ainda chega ao ramo.
ela minimiza o que o fuzzer tem de MUTAR,
e maximiza o que ele tem de EXPLORAR.
EOF

cat semente-boa.md

echo
echo "═══ 4. medindo o efeito do corpus ═══"
echo
cat > mede-corpus.sh <<'SCRIPT'
#!/usr/bin/env bash
# mede-corpus.sh — compara a cobertura de dois corpus
set -uo pipefail

FUZZER="${1:?uso: mede-corpus.sh <fuzzer> <corpus-A> <corpus-B>}"
A="${2:?informe o corpus A}"
B="${3:?informe o corpus B}"
SEG="${4:-40}"

roda() {
    local corpus="$1" nome="$2"
    echo "  ── $nome ──"
    timeout $((SEG + 5)) "$FUZZER" "$corpus" -max_total_time="$SEG" 2>&1 | \
        grep -E 'NEW|cov:' | tail -4 | sed 's/^/     /'
    echo
}

echo "═══════════ EFEITO DO CORPUS ═══════════"
echo "  tempo por corpus: ${SEG}s"
echo
roda "$A" "A: $A"
roda "$B" "B: $B"

echo "  ═══ COMO LER ═══"
echo "  · a cobertura FINAL de cada"
echo "  · ⚠ e QUANDO o último 'NEW' apareceu"
echo "  ✓ o corpus de fronteira deve chegar mais longe, e mais RÁPIDO."
SCRIPT

chmod +x mede-corpus.sh
echo "  ── pronto ──"
echo "     bash ~/fuzz-lab/mod05/mede-corpus.sh ~/fuzz-lab/alvos/fuzz_minimo \\"
echo "          /tmp/corpus-vazio ~/fuzz-lab/corpus/fronteira 40"
```

⚠ **O medidor de corpus é o instrumento.** **E ele compara a cobertura **e** o tempo** — **porque o
corpus bom chega mais longe **e mais rápido**.**

⚠ **E a nota da semente "válida até a fronteira" é o critério fino:** **o corpus precisa exercitar o
ramo, não o caminho feliz.**

**Produza `semente-boa.md`:**

| Tipo de semente | Efeito |
|---|---|
| Válida demais | |
| Inválida | |
| Válida até a fronteira | |
| Muito grande | |

**Responda:**

1. **Por que a semente válida demais é ruim?
2. **O que a semente boa tem de específico?
3. **O que uma semente de 1 MB custa?
4. **Qual critério é o mais contraintuitivo?

---

## 5.3 O mapa

⚠ **O instrumento de manutenção: **o mapa diz qual semente testa qual ponto.****

| Semente | Testa | O que exercita |
|---|---|---|
| `count_1024` | `count = 1024` | Passa a 1ª, cai na 2ª |
| ⚠ `count_1025` | ⚠ `count = 1025` | ⚠ **Ramo de erro (-2)** |
| `size_5` | `size = 5` | ⚠ Menor que o cabeçalho |
| ⚠ `interacao_count_justo` | ⚠ As duas | ⚠ **Cruzamento** |

⚠ **A tabela é o mapa, e ele serve para três coisas:**

| Para que serve | ⚠ Por quê |
|---|---|
| **Reproduzir** | Você sabe o que a semente testa |
| ⚠ **Manter** | ⚠ **Quando o alvo muda, você sabe o que quebrou** |
| ⚠ **Declarar cobertura** | ⚠ **O relatório diz o que foi testado** |

⚠ **A segunda linha é a que o mapa salva em meses.** **O alvo muda, uma semente deixa de ser válida,
e o fuzzer para de chegar ao ramo** — **e sem o mapa, você não sabe qual.**

⚠ **E é o mesmo princípio do `MAPA.md` do Parser Differentials.** **Lá, o mapa ligava o caso ao ponto
de divergência; aqui, liga a semente ao ramo.**

⚠ **A regra escrita:**

> **O corpus sem mapa é lixo que funciona.** **Ele roda, mas você não sabe o que ele cobre** — **e
> não consegue nem declará-lo, nem mantê-lo.**

```bash
cd ~/fuzz-lab/mod05

echo "═══ 5. o mapa ═══"
echo
cat > mapa.md <<'EOF'
# O mapa do corpus

| Semente | Testa | O que exercita |
|---|---|---|
| `count_1024` | count = 1024 | passa a 1ª, cai na 2ª |
| ⚠ `count_1025` | ⚠ count = 1025 | ⚠ RAMO DE ERRO (-2) |
| `size_5` | size = 5 | ⚠ menor que o cabeçalho |
| ⚠ `interacao_count_justo` | ⚠ as duas | ⚠ CRUZAMENTO |

## Para que ele serve
| Serve para | Por quê |
|---|---|
| REPRODUZIR | você sabe o que a semente testa |
| ⚠ MANTER | ⚠ quando o alvo muda, você sabe o que QUEBROU |
| ⚠ DECLARAR cobertura | ⚠ o relatório diz o que foi TESTADO |

## ⚠ a segunda linha é a que o mapa salva em MESES
o alvo muda, uma semente deixa de ser válida,
e o fuzzer PARA de chegar ao ramo.
⚠ e sem o mapa, você não sabe QUAL.

## ⚠ e é o mesmo princípio do Parser Differentials
lá, o mapa ligava o CASO ao PONTO de divergência.
aqui, liga a SEMENTE ao RAMO.

## ⚠ A REGRA
o corpus sem mapa é LIXO QUE FUNCIONA.
ele roda, mas você não sabe o que ele COBRE —
e não consegue nem DECLARÁ-LO, nem MANTÊ-LO.
EOF

cat mapa.md

echo
echo "  ── e o mapa gerado para o seu corpus ──"
cat ~/fuzz-lab/corpus/fronteira/MAPA.md 2>/dev/null | head -20 | sed 's/^/     /'
```

⚠ **O mapa é o entregável de manutenção.** **E ele responde à pergunta que o relatório faz:** **"o
que o corpus cobre?"**

⚠ **E a nota do "lixo que funciona" é o alerta:** **um corpus sem mapa roda indefinidamente e não se
mantém.**

**Produza `mapa.md`:**

| Semente | O que exercita |
|---|---|
| `count_1025` | |
| `size_5` | |
| `interacao_count_justo` | |

**Responda:**

1. **O que o mapa liga?
2. **Para que ele serve?** Cite três.
3. **O que acontece sem ele quando o alvo muda?
4. **Como ele se compara** ao mapa do Parser Differentials?

---

## 5.4 LAB — O corpus de fronteira

**Duração:** 120 min

### Passo 1 — Gere o corpus do seu alvo (50 min)

⚠ **Um caso por campo, por fronteira, e o mapa.**

```bash
cd ~/fuzz-lab/mod05

echo "═══ GERANDO O CORPUS DO SEU ALVO ═══"
echo
cat <<'EXPL'
  ── O QUE FAZER ──

     1. liste os CAMPOS do seu alvo (módulo 2)
     2. ⚠ para cada campo, liste as FRONTEIRAS
     3. gere UMA semente por (campo, valor de fronteira)
     4. e escreva o MAPA

  ── OS VALORES, POR CAMPO ──
     0 · 1 · limite−1 · limite · ⚠ limite+1 · máximo

  ── E AS INTERAÇÕES ──
     ⚠ quando DUAS fronteiras se cruzam, gere uma semente
        com as duas no limite.
     ✓ é onde a ORDEM das verificações importa.
EXPL

python3 ~/fuzz-lab/mod05/gera-corpus.py ~/fuzz-lab/corpus/fronteira 2>&1 | tail -25

echo
echo "═══ E O CORPUS NO DISCO ═══"
ls -1 ~/fuzz-lab/corpus/fronteira/ 2>/dev/null | head -25 | sed 's/^/     /'
echo
printf '     ⚠ total: %s sementes\n' "$(ls -1 ~/fuzz-lab/corpus/fronteira/ 2>/dev/null | wc -l)"
```

**Produza `corpus-gerado.md`:**

| Campo | Fronteira | Semente |
|---|---|---|
| | | |
| | | |

**Responda:**

1. **Quantas sementes o gerador produziu?
2. **Cada uma tem uma razão?** Confira o `MAPA.md`.
3. **Você incluiu as interações?
4. **Os valores cobrem `limite + 1`?**

### Passo 2 — Meça o efeito (40 min)

⚠ **O corpus de fronteira contra o vazio — a cobertura comparada.**

```bash
cd ~/fuzz-lab/mod05

echo "═══ MEDINDO O EFEITO ═══"
echo
bash ~/fuzz-lab/mod05/mede-corpus.sh ~/fuzz-lab/alvos/fuzz_minimo \
     /tmp/corpus-vazio ~/fuzz-lab/corpus/fronteira 40 2>&1 | head -30

echo
echo "═══ E O QUE PROCURAR ═══"
cat <<'EXPL'
  ── NA SAÍDA DOS DOIS ──

     A) corpus vazio
        · cov final: ____
        · ⚠ último "NEW" na execução: ____

     B) corpus de fronteira
        · cov final: ____
        · ⚠ último "NEW" na execução: ____

  ── A INTERPRETAÇÃO ──
     ✓ se B alcança mais blocos, as sementes ENTRARAM.
     ✓ se B chega lá MAIS RÁPIDO, elas destravaram BARREIRAS.
     ⚠ se A = B, o corpus não entrou — revise o FORMATO.
EXPL

cat > caderno/PD-005.md <<'EOF'
# PD-005 — o corpus de fronteira

**Data:** ____

## 1. Os campos e as fronteiras
| # | Campo | Tipo | Fronteira |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## 2. As sementes
| # | Semente | Testa | O que exercita |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## 3. ⚠ As interações
| Semente | Campos cruzados | Por que importa |
|---|---|---|
| | | |

## 4. A medição do efeito
| Corpus | cov final | último NEW | exec/s |
|---|---|---|---|
| vazio | | | |
| fronteira | | | |

## 5. A interpretação
| Item | Valor |
|---|---|
| as sementes entraram? | |
| destravaram barreiras? | |
| ⚠ A = B? | se sim: revise o FORMATO |

## 6. ⚠ O que a semente NÃO garante
| Item | Por quê |
|---|---|
| que há bug no ramo | cobertura ≠ correção |
| que a mutação vai explorar | ela pode degradar a semente |

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro

## 8. O que NÃO foi verificado
⚠ mínimo 3
EOF

echo "  ⚠ a ficha PD-005 criada"
```

⚠ **A medição do efeito é o entregável.** **E a nota do "A = B" é o diagnóstico:** **se os dois
corpus dão a mesma cobertura, o formato da semente está errado** — **e o fuzzer não entrou no
parser.**

⚠ **E a seção 6 é o contrapeso:** **o corpus não garante que há bug no ramo** — **só que o fuzzer
chega lá.**

**Produza `efeito-medido.md`:**

| Corpus | cov final | Último NEW |
|---|---|---|
| Vazio | | |
| Fronteira | | |

**Responda:**

1. **A cobertura difere?** Quanto?
2. **Qual chegou mais rápido?
3. **A = B?** Se sim, o que revisar?
4. **O que o corpus não garante?

### Passo 3 — Documente (30 min)

Produza `relatorio-corpus.md`:

```markdown
# Relatório — o corpus

## 1. O alvo e os campos
| # | Campo | Tipo | Fronteira |
|---|---|---|---|
| | | | |

## 2. As sementes (o mapa)
| Semente | Testa | O que exercita |
|---|---|---|
| | | |

## 3. As interações
| Semente | Por que |
|---|---|
| | |

## 4. A evidência
```
a saída dos dois corpus
```

## 5. O efeito medido
| Corpus | cov | último NEW |
|---|---|---|
| | | |

## 6. ⚠ O que o corpus prova, e o que não prova
**Prova:**
- que as sementes entram no parser
- que alcançam estes ramos

**NÃO prova:**
- que há bug
- que a mutação respeita o formato
- que os ramos são alcançáveis em produção

## 7. A manutenção
| Item | Valor |
|---|---|
| se o alvo mudar, o que revisar | |
| ⚠ o mapa está atualizado? | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro

## 9. O que NÃO foi verificado
⚠ mínimo 3

## 10. O próximo passo
| # | Ação | Prioridade |
```

**Produza `relatorio-corpus.md`:**

| Item | Valor |
|---|---|
| Sementes | |
| Efeito | |
| Interação | |
| O que não prova | |

**Responda:**

1. **Quantas sementes, e quantas interações?
2. **O efeito foi medido?
3. **O mapa está no relatório?
4. **O que o corpus não prova?**

### Critérios de aceitação

- `fronteira.md` com os **sete** valores e o que cada um testa.
- Você explicou **o que `count = 1024` exercita** e por que é o mais interessante.
- Você explicou **por que o cruzamento de fronteiras importa**.
- `gera-corpus.py` rodado, com as sementes no disco.
- O **`MAPA.md`** gerado, ligando semente a ramo.
- `semente-boa.md` com os **quatro** critérios.
- Você explicou **por que a semente válida demais é ruim**.
- Você explicou **o custo de uma semente grande**.
- `mede-corpus.sh` rodado, com os **dois** corpus comparados.
- Você mediu **a cobertura e o último "NEW"** de cada.
- Você interpretou **se as sementes entraram**.
- `mapa.md` com **os três** usos do mapa.
- Você explicou **o que acontece sem o mapa** quando o alvo muda.
- `caderno/PD-005.md` com as **oito** seções.
- Você explicou **o que o corpus NÃO garante**.
- `relatorio-corpus.md` com as **dez** seções.
- Você declarou **o que o corpus prova e o que não prova**.
- ⚠ **Nenhum fuzz pela rede.**

---

## Avaliação

1. **O que o corpus é, em relação ao fuzzer?
2. **Por que o corpus é o maior ganho depois do oráculo?
3. **Cite os sete valores de fronteira.
4. **O que `count = 1024` exercita?** Por que é especial?
5. **O que `limite + 1` exercita?
6. **Por que o cruzamento de fronteiras importa?
7. **Cite os quatro critérios de uma semente boa.
8. **Por que a semente válida demais é ruim?
9. **Por que a inválida é ruim?
10. **O que é a semente "válida até a fronteira"?
11. **O que uma semente de 1 MB custa?
12. **O que o mapa liga?
13. **Para que o mapa serve?** Cite três usos.
14. **O que acontece sem o mapa** quando o alvo muda?
15. **Como se mede o efeito do corpus?
16. **O que significa "A = B" na medição?
17. **O que o corpus NÃO garante?
18. **Por que o corpus não garante que há bug?
19. **Como o mapa se compara** ao do Parser Differentials?
20. **O que o corpus declara**, no relatório?

---

**Próximo:** [Módulo 6 — Fuzzing estrutural](modulo-06.md)
