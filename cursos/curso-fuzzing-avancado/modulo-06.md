# Módulo 6 — Fuzzing Estrutural

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Entender por que a **mutação de bytes** não alcança entrada estruturada.
2. Conhecer as **duas abordagens**: gramática e invariante.
3. Escrever um **gerador por gramática** — e medir o ganho.
4. Reconhecer o **custo** de cada abordagem.
5. Escolher entre mutação, gramática e invariante — com critério.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **A mutação de bytes não sabe o que é um campo.** **Ela troca um byte e quebra o formato** — **e o
> parser rejeita antes de qualquer coisa interessante.**

⚠ **E é o limite do corpus de fronteira.** **O corpus leva o fuzzer **até** o parser** — **mas a
mutação a partir dele **destrói** o formato** — **e a maioria das entradas geradas é inválida.**

⚠ **A tese:**

> **A entrada estruturada exige geração estruturada.** **Ou você ensina o formato ao fuzzer, ou ele
> nunca o respeita.**

⚠ **A tabela das três abordagens:**

| Abordagem | O que faz | ⚠ Alcança |
|---|---|---|
| **Mutação de bytes** | Troca bytes | ⚠ Só o que sobrevive à mutação |
| ⚠ **Por gramática** | ⚠ **Gera entrada válida** | ⚠ **Todo o parser** |
| ⚠ **Por invariante** | ⚠ **Verifica uma propriedade** | ⚠ **A lógica** |

⚠ **A segunda linha é o ganho de cobertura; a terceira, o ganho de oráculo.** **E as duas são do
módulo 7 — mas a segunda é este.**

---

## 6.1 Por que a mutação não basta

⚠ **O problema, em números concretos.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ O FORMATO                                                             │
│   count(2 bytes) + total(4 bytes) + dados(count * 4 bytes)            │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ A MUTAÇÃO DE BYTES                                                    │
│                                                                      │
│   · troca um byte de `count`  → ⚠ pode estourar a fronteira ✓ ÚTIL     │
│   · troca um byte de `total`  → ⚠ o alvo recalcula e ignora            │
│   · ⚠ troca um byte dos DADOS → ⚠ não muda nada                       │
│   · ⚠ insere/remove um byte   → ⚠ DESALINHA tudo depois               │
│                                                                      │
│   ✓ 1 em 4 mutações é útil.                                            │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A última linha é a taxa real.** **A maioria das mutações ou não muda nada, ou destrói o
formato** — **e o fuzzer gasta o orçamento gerando entrada rejeitada.**

⚠ **E a tabela do que acontece, por tipo de mutação:**

| Mutação | ⚠ Efeito |
|---|---|
| Trocar byte de um campo | ⚠ Depende do campo |
| ⚠ **Inserir byte** | ⚠ **Desalinha o formato** |
| ⚠ **Remover byte** | ⚠ **Idem** |
| Trocar bloco | Pode preservar |
| ⚠ **Splice entre sementes** | ⚠ **Pode produzir lixo** |

⚠ **A linha do splice merece a nota.** **O `splice` — cruzar duas sementes — é uma das mutações mais
eficazes do AFL++** — **e em formato com **campo de tamanho**, ela produz entrada inconsistente**
**porque o tamanho de uma não bate com os dados da outra.**

⚠ **A regra escrita:**

> **O formato é um contrato, e a mutação o viola.** **Quando o parser rejeita na primeira validação,
> o orçamento da campanha foi gasto sem exercitar nada.**

```bash
mkdir -p ~/fuzz-lab/mod06 && cd ~/fuzz-lab/mod06

echo "═══ 1. por que a mutação não basta ═══"
echo
cat > mutacao.md <<'EOF'
# Por que a mutação não basta

## O formato
count(2) + total(4) + dados(count * 4)

## A mutação de bytes
| Mutação | Efeito |
|---|---|
| troca byte de `count` | ⚠ pode estourar a fronteira ✓ ÚTIL |
| troca byte de `total` | ⚠ o alvo RECALCULA e ignora |
| ⚠ troca byte dos DADOS | ⚠ não muda NADA |
| ⚠ insere/remove um byte | ⚠ DESALINHA tudo depois |

## ⚠ a taxa real
1 em 4 mutações é útil.
✓ a maioria ou não muda nada, ou DESTRÓI o formato.

## O que cada mutação faz
| Mutação | Efeito |
|---|---|
| trocar byte de um campo | depende do campo |
| ⚠ INSERIR byte | ⚠ desalinha o formato |
| ⚠ REMOVER byte | ⚠ idem |
| trocar bloco | pode preservar |
| ⚠ SPLICE entre sementes | ⚠ pode produzir LIXO |

## ⚠ a linha do splice
o splice é uma das mutações mais EFICAZES do AFL++ —
e em formato com CAMPO DE TAMANHO ela produz
entrada INCONSISTENTE:
o tamanho de uma não bate com os dados da outra.

## ⚠ A REGRA
o formato é um CONTRATO, e a mutação o VIOLA.
quando o parser rejeita na primeira validação,
o orçamento da campanha foi gasto SEM EXERCITAR NADA.
EOF

cat mutacao.md

echo
echo "═══ 2. as duas abordagens estrutural ═══"
echo
cat <<'EXPL'
  ── A) POR GRAMÁTICA ──
     você descreve o FORMATO, e o fuzzer GERA entradas válidas.
     · "count é um uint16, de 0 a 1024"
     · "o corpo tem count * 4 bytes"
     ✓ e toda entrada gerada PASSA a validação.

     ⚠ custo: você escreve a gramática.
     ✓ ganho: a cobertura sobe muito.

  ── B) POR INVARIANTE ──
     você afirma uma PROPRIEDADE e verifica se ela vale.
     · "o parser não lê além de size bytes"
     · "o retorno é consistente com a entrada"
     ✓ e a violação é o achado.

     ⚠ custo: você escreve o verificador.
     ✓ ganho: pega LÓGICA, não só memória.

  ── E AS DUAS SÃO COMPLEMENTARES ──
     ⚠ a gramática GERA; o invariante JULGA.
     ✓ e juntos: entrada válida + oráculo forte.
EXPL
```

⚠ **As duas abordagens são o mapa do módulo.** **E a distinção é a mesma do módulo 2:** **gramática
resolve a **alcançabilidade**; invariante resolve o **oráculo**.**

⚠ **E a nota da complementaridade é o desenho:** **geração sem oráculo forte só acha crash; oráculo
forte sem geração não alcança o código.**

**Produza `mutacao.md`:**

| Mutação | Efeito |
|---|---|
| Inserir byte | |
| Trocar byte de dados | |
| Splice | |

**Responda:**

1. **Por que a maioria das mutações é inútil?
2. **O que o splice faz num formato com campo de tamanho?
3. **O que a gramática resolve?** E o invariante?
4. **Por que as duas são complementares?

---

## 6.2 O gerador por gramática

⚠ **O instrumento do módulo: **um gerador que produz entrada **válida** — e a varia na fronteira.**

| Componente | O que faz |
|---|---|
| **A gramática** | Descreve os campos |
| ⚠ **O gerador** | Produz a entrada |
| ⚠ **A variação** | Muda **um** campo, dentro da gramática |
| **O limite** | Quando parar |

⚠ **A tabela dos tipos de gramática, por esforço:**

| Tipo | Como | ⚠ Custo |
|---|---|---|
| **Estrutural simples** | Python que monta o formato | ✓ Baixo |
| **Gerador com escolhas** | Aleatoriedade guiada | Médio |
| ⚠ **Gramática formal** | `Nautilus`, `Grammarinator` | ⚠ Alto |
| **Mutador ciente** | Só muta o que faz sentido | Médio |

⚠ **A linha 1 é a recomendação, e ela é surpreendentemente simples.** **Um script em Python que
monta o formato e varia **um** campo** — **não é uma gramática formal, e resolve a maioria dos
casos.**

⚠ **E a tabela do que o gerador varia:**

| O que variar | Como |
|---|---|
| Um campo | ⚠ **Os valores de fronteira (módulo 5)** |
| Combinação de campos | ⚠ **Cruzamento de fronteiras** |
| Tamanho do corpo | Consistente com o campo |
| ⚠ **Nunca** | ⚠ **Insira byte aleatório** |

⚠ **A regra escrita:**

> **O gerador não precisa ser elegante.** **Ele precisa produzir entrada que **passe** na
> validação** — **e variar o campo que importa.** **Vinte linhas de Python fazem isso.**

```bash
cd ~/fuzz-lab/mod06

echo "═══ 3. o gerador por gramática ═══"
echo
cat > gerador_gramatica.py <<'PY'
#!/usr/bin/env python3
"""
gerador_gramatica.py — gera entrada VÁLIDA e varia na fronteira.

⚠ DIDÁTICO. um "gerador com escolhas" — o mais simples que funciona.
"""
import struct, random, sys, os

# ── A GRAMÁTICA ──
MAX_ITENS = 1024
DST_SIZE  = 64
TAM_DADOS = 4096


def gera_valido() -> bytes:
    """⚠ uma entrada que PASSA na validação"""
    count = random.choice([0, 1, 2, 8, 15, 16])
    total = count * 4
    corpo = struct.pack("<H", count) + struct.pack("<I", total)
    corpo += bytes(random.getrandbits(8) for _ in range(total))
    return corpo


def gera_fronteira() -> bytes:
    """⚠ varia UM campo até a fronteira — e um pouco além"""
    count = random.choice([
        MAX_ITENS - 1, MAX_ITENS, MAX_ITENS + 1,
        0xFFFF, 0x8000, 0x7FFF,
    ])
    total = count * 4
    corpo = struct.pack("<H", count) + struct.pack("<I", total & 0xFFFFFFFF)
    corpo += bytes(random.getrandbits(8) for _ in range(min(total, TAM_DADOS)))
    return corpo


def gera_inconsistente() -> bytes:
    """⚠ o campo MENTE: total não bate com os dados"""
    count = random.choice([1, 2, 4, 16])
    total = random.choice([0, 4, 64, 4096, 0xFFFFFFFF])
    corpo = struct.pack("<H", count) + struct.pack("<I", total)
    corpo += bytes(random.getrandbits(8) for _ in range(random.choice([0, 4, 64])))
    return corpo


GERADORES = [
    ("valido",         gera_valido,          70),
    ("fronteira",      gera_fronteira,       25),
    ("inconsistente",  gera_inconsistente,    5),
]


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    saida = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/fuzz-lab/corpus/gerado")
    os.makedirs(saida, exist_ok=True)

    print("═══ GERADOR POR GRAMÁTICA ═══")
    print()
    print(f"  gerando {n} entradas em {saida}")
    print()

    nomes = [g[0] for g in GERADORES]
    pesos = [g[2] for g in GERADORES]
    contagem = {nome: 0 for nome in nomes}

    for i in range(n):
        escolha = random.choices(GERADORES, weights=pesos, k=1)[0]
        nome, fn, _ = escolha
        dados = fn()
        with open(os.path.join(saida, f"{nome}_{i:05d}"), "wb") as f:
            f.write(dados)
        contagem[nome] += 1

    print("  ── distribuição ──")
    for nome, c in contagem.items():
        pct = c / n * 100
        marca = "⚠" if nome == "inconsistente" else " "
        print(f"     {marca} {nome:<16} {c:>5}  ({pct:.0f}%)")

    print()
    print("  ═══ POR QUE OS PESOS ═══")
    print("  · 70% VÁLIDO         → o parser chega ao fundo")
    print("  · 25% FRONTEIRA      → ⚠ os limites e além")
    print("  ·  5% INCONSISTENTE  → ⚠ ⚠ o campo mente")
    print()
    print("  ⚠ e note: NADA de byte aleatório no meio da estrutura.")
    print("     ✓ é isso que faz a maioria das entradas PASSAAR.")


if __name__ == "__main__":
    main()
PY

chmod +x gerador_gramatica.py
python3 gerador_gramatica.py 200
```

⚠ **O gerador é o instrumento.** **E os pesos são a decisão de projeto:** **70% válido, 25% na
fronteira, 5% inconsistente.**

⚠ **E a nota do "nada de byte aleatório no meio" é o que distingue o estrutural:** **a variação
respeita o formato, e a entrada **passa** na validação.**

**Produza `gerador.md`:**

| Gerador | Peso | O que produz |
|---|---|---|
| Válido | | |
| Fronteira | | |
| Inconsistente | | |

**Responda:**

1. **Por que os pesos são assim?
2. **O que o gerador "inconsistente" produz?** Por que é útil?
3. **O que o gerador **não** faz** de propósito?
4. **Por que vinte linhas de Python bastam?

---

## 6.3 O invariante

⚠ **A segunda abordagem estrutural: **o verificador que julga a execução.****

| Invariante | ⚠ O que detecta |
|---|---|
| **Não lê além de `size`** | ⚠ **Leitura fora da entrada** |
| **Retorno consistente** | Lógica |
| **Não escreve além do destino** | Overflow |
| ⚠ **Toda entrada produz uma decisão** | ⚠ **Caminho não tratado** |

⚠ **A tabela do que cada invariante exige:**

| Invariante | Exige |
|---|---|
| Não lê além de `size` | ⚠ **ASan, ou verificação manual** |
| Retorno consistente | Você sabe o que é "certo" |
| Não escreve além | ASan |
| ⚠ Toda entrada decide | ⚠ **Você enumerou os retornos** |

⚠ **A primeira linha é o que o ASan já faz** — **e é o oráculo mínimo do módulo 3.**

⚠ **A quarta é a que o curso acrescenta.** **"Toda entrada produz uma decisão"** significa: **não
existe entrada que deixe o parser num estado indefinido** — **e é uma propriedade que se verifica
com um `switch`.**

⚠ **E o exemplo concreto, e ele é o bug do alvo do curso:**

| Entrada | O que o alvo faz | ⚠ Invariante violado |
|---|---|---|
| `size = 6, count = 16` | `memcpy` de 64 **de uma entrada de 6** | ⚠ **Lê fora da entrada** |
| `size = 6, count = 0` | `memcpy` de 0 | ✓ Correto |

⚠ **A primeira linha é o bug real.** **E note que ele **não crasha** sem ASan** — **porque `memcpy`
de 64 bytes de um buffer de 6 lê memória adjacente válida** — **e o programa continua.**

⚠ **A regra escrita:**

> **O invariante captura o que o crash não captura.** **E o bug do alvo é exatamente isso:** **ele lê
> fora da entrada, produz um resultado, e não avisa ninguém.**

```bash
cd ~/fuzz-lab/mod06

echo "═══ 4. o invariante ═══"
echo
cat > invariante.md <<'EOF'
# O invariante

| Invariante | O que detecta |
|---|---|
| não lê além de `size` | ⚠ LEITURA fora da entrada |
| retorno consistente | lógica |
| não escreve além do destino | overflow |
| ⚠ toda entrada produz uma decisão | ⚠ caminho não tratado |

## O que cada um exige
| Invariante | Exige |
|---|---|
| não lê além de `size` | ⚠ ASan, ou verificação manual |
| retorno consistente | você sabe o que é "certo" |
| não escreve além | ASan |
| ⚠ toda entrada decide | ⚠ você ENUMEROU os retornos |

## ⚠ a primeira linha é o que o ASan já faz
✓ é o oráculo MÍNIMO do módulo 3.

## ⚠ a quarta é a que o curso acrescenta
"toda entrada produz uma DECISÃO":
não existe entrada que deixe o parser num estado INDEFINIDO.
✓ e é uma propriedade que se verifica com um switch.

## O bug do alvo do curso
| Entrada | O alvo faz | Violação |
|---|---|---|
| size=6, count=16 | memcpy de 64 de uma entrada de 6 | ⚠ LÊ FORA |
| size=6, count=0 | memcpy de 0 | ✓ correto |

## ⚠ e note: ele NÃO crasha sem ASan
porque memcpy de 64 bytes de um buffer de 6
lê memória ADJACENTE VÁLIDA —
e o programa CONTINUA.

## ⚠ A REGRA
o invariante captura o que o CRASH não captura.
e o bug do alvo é exatamente isso:
ele LÊ FORA DA ENTRADA, produz um resultado,
e não avisa NINGUÉM.
EOF

cat invariante.md

echo
echo "═══ 5. o harness com invariante ═══"
echo
cat > harness_invariante.c <<'EOF'
/*
 * ⚠ HARNESS COM INVARIANTE
 *
 *   verifica uma PROPRIEDADE além de deixar o ASan rodar.
 *   ✓ e o motivo do abort é o ACHADO.
 */
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

/* ⚠ a versão instrumentada — declara o que leu */
extern int parse_verifica(const uint8_t *data, size_t size,
                          size_t *bytes_lidos, int *retorno);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    size_t lidos = 0;
    int ret = 999;

    parse_verifica(data, size, &lidos, &ret);

    /* ⚠ INVARIANTE 1: nunca lê além do que recebeu */
    if (lidos > size) {
        fprintf(stderr, "INVARIANTE: leu %zu de %zu bytes\n", lidos, size);
        abort();
    }

    /* ⚠ INVARIANTE 2: toda entrada produz uma decisão conhecida */
    if (ret != 0 && ret != -1 && ret != -2 && ret != -3) {
        fprintf(stderr, "INVARIANTE: retorno desconhecido %d\n", ret);
        abort();
    }

    return 0;
}
EOF

echo "  ── o harness com invariante está escrito ──"
echo
echo "  ⚠ E NOTE OS DOIS INVARIANTES:"
cat <<'EXPL'
     1. lidos <= size
        ⚠ o parser NÃO PODE ler mais do que recebeu.
        ✓ e é o bug REAL do alvo do curso.

     2. o retorno pertence a um conjunto CONHECIDO
        ⚠ toda entrada produz uma decisão.
        ✓ e um retorno fora do conjunto é um caminho não tratado.

  ── POR QUE ISSO VALE MAIS QUE O CRASH ──
     ⚠ o bug do alvo NÃO crasha sem ASan.
     ✓ e o invariante 1 o pega SEM sanitizer nenhum.
EXPL
```

⚠ **O harness com invariante é o instrumento.** **E o invariante 1 é exatamente o bug do alvo** —
**e ele o pega sem ASan.**

⚠ **E a nota do "não crasha sem ASan" é a lição:** **o invariante é o que encontra o que o crash não
vê** — **e é a razão do módulo 7.**

**Produza `invariante-harness.md`:**

| Invariante | O que pega |
|---|---|
| 1 | |
| 2 | |

**Responda:**

1. **O que o invariante 1 verifica?** Que bug ele pega?
2. **O que o invariante 2 verifica?
3. **Por que ele vale mais que o crash?
4. **Por que o bug do alvo não crasha sem ASan?

---

## 6.4 LAB — Gramática e invariante

**Duração:** 150 min

### Passo 1 — Gere com gramática e compare (60 min)

⚠ **O gerador estrutural contra a mutação, e a cobertura comparada.**

```bash
cd ~/fuzz-lab/mod06

echo "═══ GERANDO COM GRAMÁTICA ═══"
echo
python3 gerador_gramatica.py 300 ~/fuzz-lab/corpus/gerado 2>&1 | head -16
echo

echo "═══ E O CORPUS NO DISCO ═══"
printf '     ⚠ total: %s entradas\n' "$(ls -1 ~/fuzz-lab/corpus/gerado 2>/dev/null | wc -l)"
ls -1 ~/fuzz-lab/corpus/gerado 2>/dev/null | head -6 | sed 's/^/     /'
echo

echo "═══ O EXPERIMENTO COMPARATIVO ═══"
cat <<'EXPL'
  ── TRÊS CAMPANHAS, O MESMO TEMPO ──

     A) corpus de FRONTEIRA (6 sementes) → mutação pura
     B) corpus GERADO (300 válidas)      → mutação sobre válido
     ⚠ e compare:
        · cov final
        · exec/s
        · ⚠ e quantas entradas o parser REJEITA

  ── E A TERCEIRA MEDIDA É A CHAVE ──
     ⚠ se o parser rejeita quase tudo, o orçamento
        está sendo gasto SEM EXERCITAR NADA.
EXPL

bash ~/fuzz-lab/mod05/mede-corpus.sh ~/fuzz-lab/alvos/fuzz_minimo \
     ~/fuzz-lab/corpus/fronteira ~/fuzz-lab/corpus/gerado 45 2>&1 | head -30
```

⚠ **O experimento compara as duas abordagens.** **E a terceira medida — quantas entradas o parser
rejeita — é a que mostra o custo da mutação pura.**

⚠ **E a expectativa é clara:** **o corpus gerado faz o fuzzer começar de entradas válidas** — **e
cada mutação tem mais chance de ser útil.**

**Produza `gramatica-medida.md`:**

| Corpus | cov | exec/s |
|---|---|---|
| Fronteira | | |
| Gerado | | |

**Responda:**

1. **Qual corpus deu mais cobertura?** Por quê?
2. **O exec/s difere?** O que isso indica?
3. **Quantas entradas o parser rejeita** em cada caso?
4. **Isso confirma o argumento do §6.1?

### Passo 2 — Escreva o harness com invariante (50 min)

⚠ **E ele pega o bug que o crash não pega.**

```bash
cd ~/fuzz-lab/mod06

echo "═══ O HARNESS COM INVARIANTE ═══"
echo
cat <<'EXPL'
  ── O DESAFIO ──

     você precisa que o ALVO INFORME o que leu.
     ⚠ opção 1: modifique o alvo (o mais fácil)
     ⚠ opção 2: instrumente por fora (mais difícil)

     ✓ e a opção 1 é legítima — é o SEU alvo.
EXPL

cd ~/fuzz-lab/mod06

cat > alvo_instrumentado.c <<'EOF'
/*
 * ⚠ O ALVO, INSTRUMENTADO PARA O INVARIANTE.
 *   ele DECLARA quantos bytes leu e qual o retorno.
 */
#include <stdint.h>
#include <string.h>
#include <stddef.h>

#define MAX_ITENS 1024
#define DST_SIZE  64

int parse_verifica(const uint8_t *data, size_t size,
                   size_t *bytes_lidos, int *retorno) {
    size_t lidos = 0;

    if (size < 6) { *bytes_lidos = lidos; *retorno = -1; return -1; }

    uint16_t count;
    uint32_t total;
    memcpy(&count, data, 2);       lidos += 2;
    memcpy(&total, data + 2, 4);   lidos += 4;

    char dst[DST_SIZE];

    if (count > MAX_ITENS) { *bytes_lidos = lidos; *retorno = -2; return -2; }

    total = (uint32_t)count * 4;
    if (total > DST_SIZE) { *bytes_lidos = lidos; *retorno = -3; return -3; }

    /* ⚠ AQUI ESTÁ O BUG: lê `total` bytes SEM conferir size */
    memcpy(dst, data + 6, total);
    lidos += total;                /* ⚠ declara o que LEU */

    *bytes_lidos = lidos;
    *retorno = (int)total;
    return (int)total;
}
EOF

echo "  ── compile o harness com invariante ──"
clang -fsanitize=fuzzer,address -g -o fuzz_invariante \
    alvo_instrumentado.c harness_invariante.c 2>&1 | head -4
[ -f fuzz_invariante ] && echo "     ✓ fuzz_invariante" || echo "     ⚠ falhou"
echo

echo "  ── PARA RODAR ──"
cat <<'EXPL'
     ./fuzz_invariante ~/fuzz-lab/corpus/fronteira -max_total_time=60

     ⚠ e o que você procura na saída:
        INVARIANTE: leu N de M bytes
     ✓ essa linha é o ACHADO —
       o parser leu mais do que recebeu.
EXPL
```

⚠ **O alvo instrumentado é o instrumento.** **E ele **declara** o que leu** — **que é o que o
invariante verifica.**

⚠ **E a nota da modificação é honesta:** **modificar o alvo é legítimo porque é o **seu** alvo** —
**e é o caminho mais simples.**

**Produza `invariante-rodado.md`:**

| Item | Valor |
|---|---|
| Invariante disparou? | |
| Bytes lidos / recebidos | |
| Sanitizer também? | |

**Responda:**

1. **O invariante disparou?** Com qual entrada?
2. **O ASan também pegou?** Qual dos dois foi mais claro?
3. **Qual a entrada que viola o invariante 1?
4. **Por que modificar o alvo é legítimo?

### Passo 3 — Documente (40 min)

Produza `caderno/PD-006.md`:

```markdown
# PD-006 — fuzzing estrutural

**Data:** ____

## 1. A gramática
| Campo | Tipo | Faixa |
|---|---|---|
| | | |

## 2. O gerador
| Gerador | Peso | O que produz |
|---|---|---|
| válido | 70% | |
| fronteira | 25% | |
| inconsistente | 5% | |

## 3. A comparação
| Corpus | cov | exec/s | ⚠ rejeitadas |
|---|---|---|---|
| fronteira | | | |
| gerado | | | |

## 4. Os invariantes
| # | Invariante | O que pega | Disparou? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## 5. ⚠ A evidência
```
INVARIANTE: leu N de M bytes
```

## 6. O bug encontrado
| Item | Valor |
|---|---|
| entrada | |
| o que o alvo faz | |
| ⚠ por que NÃO crasha sem ASan | |

## 7. ⚠ O que o invariante NÃO pega
| Item | Por quê |
|---|---|
| lógica de negócio | você não sabe a regra |
| ⚠ estado entre chamadas | o harness reinicia |

## 8. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro

## 9. O que NÃO foi verificado
⚠ mínimo 3
```

Produza `relatorio-estrutural.md`:

```markdown
# Relatório — fuzzing estrutural

## 1. A gramática do alvo
| Campo | Tipo | Fronteira |
|---|---|---|
| | | |

## 2. O gerador
```python
[cole o gerador]
```

## 3. A comparação de corpus
| Corpus | cov | rejeitadas |
|---|---|---|
| | | |

## 4. Os invariantes
| # | Invariante | O que detecta |
|---|---|---|
| | | |

## 5. ⚠ O achado
| Item | Valor |
|---|---|
| a entrada | |
| o invariante violado | |
| o que o alvo faz | |
| ⚠ crasha sem ASan? | |

## 6. ⚠ O que o invariante não pega
| Item | Por quê |
|---|---|
| | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei pela rede
- [ ] não apontei para terceiro
- [ ] não abri issue com o reproducer não minimizado

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O próximo passo
| # | Ação | Prioridade |
```

**Produza `relatorio-estrutural.md`:**

| Item | Valor |
|---|---|
| Gramática | |
| Comparação | |
| Achado | |
| O que não pega | |

**Responda:**

1. **A gramática está escrita?** Quantos campos?
2. **O gerador produziu válidas?** A cobertura subiu?
3. **Qual invariante disparou?** Com que entrada?
4. **O que o invariante NÃO pega?**

### Critérios de aceitação

- `mutacao.md` com a tabela de mutações e a taxa real.
- Você explicou **por que a maioria das mutações é inútil**.
- Você explicou **o que o splice faz** num formato com campo de tamanho.
- Você explicou **o que a gramática resolve** e o que o invariante resolve.
- Você explicou **por que as duas são complementares**.
- `gerador.md` com os **três** geradores e os pesos.
- Você explicou **o que o gerador inconsistente produz**.
- Você explicou **o que o gerador não faz de propósito**.
- O **gerador rodado**, com as entradas no disco.
- A **comparação de corpus** medida, com cobertura e rejeitadas.
- Você explicou **o que a taxa de rejeição revela**.
- `invariante.md` com os **quatro** invariantes.
- Você explicou **o que o invariante 1 pega** e por que é o bug do alvo.
- Você explicou **por que o bug não crasha sem ASan**.
- O **harness com invariante** escrito e compilado.
- O **invariante disparou**, com a evidência literal.
- Você explicou **o que o invariante NÃO pega**.
- `caderno/PD-006.md` com as **nove** seções.
- `relatorio-estrutural.md` com as **nove** seções.
- ⚠ **Nenhum fuzz pela rede.**

---

## Avaliação

1. **O que a mutação de bytes não sabe?
2. **Por que a mutação a partir do corpus de fronteira destrói o formato?
3. **Cite quatro mutações** e o efeito de cada.
4. **O que o splice faz num formato com campo de tamanho?
5. **Cite as duas abordagens estruturais.
6. **O que a gramática resolve?
7. **O que o invariante resolve?
8. **Por que as duas são complementares?
9. **Cite quatro tipos de gramática** e o custo de cada.
10. **O que o gerador simples precisa fazer?
11. **O que o gerador NÃO deve fazer?
12. **Por que os pesos 70/25/5?
13. **O que o gerador inconsistente produz?** Por que é útil?
14. **Cite quatro invariantes.
15. **O que "não lê além de size" detecta?
16. **O que "toda entrada decide" detecta?
17. **Qual invariante o ASan já faz?
18. **Qual é o bug do alvo do curso?** Por que não crasha?
19. **Por que modificar o alvo é legítimo?
20. **O que o invariante NÃO pega?

---

**Próximo:** [Módulo 7 — O oráculo](modulo-07.md)
