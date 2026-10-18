# Módulo 5 — Corpus, Semente e Dicionário

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Entender por que o corpus é o que decide o resultado de uma campanha.
2. Construir corpus de semente eficaz, com critério e não por acumulação.
3. Escrever dicionário que ajuda o fuzzer a atravessar validação.
4. Medir cobertura e usar o número para decidir.
5. Fazer curadoria de corpus: o que manter e o que descartar.

---

## ⚠ Conduta

Alvo próprio. Corpus construído por você, a partir do seu alvo.

---

## 5.1 Por que o corpus é o que decide

Um fuzzer coverage-guided funciona assim: ele muta as entradas que **conhece**, e mantém as que
**aumentam cobertura**. Isso significa:

> **O fuzzer só encontra o que está a poucas mutações de distância do que você deu a ele.**

⚠ **A consequência é brutal e contra-intuitiva.** Você pode ter o melhor harness e o melhor
sanitizer, e não achar nada — **porque a semente nunca chegou perto do caminho do bug**.

### O experimento mental

```
ALVO: parser com 4 verificações em sequência

  magic == "FMT1"     →  versao <= 3     →  num_itens < 1000     →  BUG

SEMELE "AAAA":
  ├─ magic falha  →  para aqui
  └─ o fuzzer precisa descobrir "FMT1" por tentativa aleatória
     → 4 bytes, 2^32 combinações, ~impossível

SEMELE com "FMT1" no início:
  ├─ magic passa
  ├─ precisa descobrir versao <= 3 e num_itens < 1000
  └─ o fuzzer chega ao bug em minutos
```

⚠ **É por isso que o corpus não é "detalhe".** Ele é a diferença entre achar e não achar.

---

## 5.2 As quatro fontes de semente

| Fonte | O que dá | Esforço |
|---|---|---|
| **Arquivo real** do formato | Entrada válida e representativa | Baixo — é o melhor |
| **Documentação do formato** | Constrói entrada mínima válida | Médio |
| **Saída do próprio alvo** | Entrada que o alvo escreve | Baixo, quando existe |
| **Síntese a partir da spec** | Entrada que exercita cada campo | Alto, e preciso |

⚠ **A primeira linha é a mais subestimada.** Se o formato é PDF, comece com **PDFs reais**. Se é
XML, **XMLs reais**. O fuzzer mutando entrada real chega muito mais longe que mutando `"AAAA"`.

⚠ **Mas cuidado com o real:** arquivo de produção pode conter **dado sensível**. Em contexto real,
sanitize, ou use arquivo de teste público. Se você fuzzar um formato e o corpus vazar, você acabou
de vazar dado — e o módulo de ética dos outros cursos se aplica aqui também.

### Construa a semente para o seu parser

```bash
cd ~/fuzz-lab
mkdir -p corpus/parser

# Semente 1: mínima válida (o ponto de partida)
python3 - <<'PY'
import struct
# magic(4) versao(2) num_itens(2) tamanho(4) + itens
cab = b"FMT1" + struct.pack("<HHI", 1, 0, 0)
open("corpus/parser/s1-minima", "wb").write(cab)
print("s1-minima:", len(cab), "bytes")
PY

# Semente 2: com itens
python3 - <<'PY'
import struct
cab = b"FMT1" + struct.pack("<HHI", 1, 3, 24)
corpo = b"A" * 24
open("corpus/parser/s2-itens", "wb").write(cab + corpo)
print("s2-itens:", len(cab + corpo), "bytes")
PY

# Semente 3: com versão diferente (exercita outro caminho)
python3 - <<'PY'
import struct
cab = b"FMT1" + struct.pack("<HHI", 3, 1, 8)
open("corpus/parser/s3-versao3", "wb").write(cab + b"B" * 8)
print("s3-versao3:", len(cab + b"B" * 8), "bytes")
PY

# Semente 4: num_itens alto mas dentro do razoável (aproxima do bug)
python3 - <<'PY'
import struct
cab = b"FMT1" + struct.pack("<HHI", 1, 8, 64)
open("corpus/parser/s4-limite", "wb").write(cab + b"C" * 64)
print("s4-limite:", len(cab + b"C" * 64), "bytes")
PY

ls -la corpus/parser/
```

⚠ **A semente 4 é a mais importante.** Ela **aproxima do bug** (num_itens = 8 → escreve 64 bytes
no `dest` de 64) sem disparar. O fuzzer só precisa empurrar `num_itens` para cima. **Colocar a
semente perto do bug é a técnica mais eficaz de todo o módulo.**

---

## 5.3 Dicionário — atravessar validação

O dicionário diz ao fuzzer **que strings são interessantes**. É como você resolve o problema do
`magic`.

```bash
cat > corpus/parser.dict <<'EOF'
# dicionário para o parser FMT1
# formato: nome="valor"   (o valor pode ter escapes)

magic="FMT1"
magic_alt="FMT2"
versao1="\x01\x00"
versao3="\x03\x00"
itens_zero="\x00\x00"
itens_um="\x01\x00"
itens_max="\xff\xff"
tam_grande="\x00\x00\x01\x00"
prefixo="MAGIC"
EOF

cat corpus/parser.dict
```

### Sintaxe do dicionário

| Forma | Significado |
|---|---|
| `nome="valor"` | Token nomeado |
| `"texto"` | Token sem nome |
| `"\x00\x01"` | Bytes em hex |
| `"\n"` | Escape |

⚠ **O dicionário do AFL++ e do libFuzzer têm o mesmo formato básico**, então serve nos dois.

```bash
# libFuzzer usa -dict=
./harnesses/parser_fuzz corpus/parser -dict=corpus/parser.dict -max_total_time=30

# AFL++ usa -x
afl-fuzz -i corpus/parser -o findings -x corpus/parser.dict -- ./alvos/parser @@
```

⚠ **O dicionário não é opcional quando o alvo tem validação de string.** Sem ele, o fuzzer gasta
a campanha inteira tentando adivinhar `FMT1` — 4 bytes que ele **não** descobre por mutação
aleatória em tempo útil.

### Quando o dicionário não resolve

| Situação | Dicionário resolve? | O que resolve |
|---|---|---|
| `magic` de 4 bytes | **Sim** | `-dict` |
| Campo string fixo | Sim | `-dict` |
| **Checksum** | **Não** | Grammar-based (módulo 12) |
| **Tamanho que precisa bater** | **Não** | Grammar-based, ou harness que corrige |
| **Criptografia** | **Não** | Nada — é intratável por fuzzing |
| **Compressão** | Não | Grammar, ou desconstruir |
| **Validação semântica complexa** | Não | Simbólica (módulo 12) |

⚠ **Esta tabela é o mapa do que você vai encontrar.** O dicionário resolve o caso fácil; os casos
difíceis são o **motivo** pelo qual o módulo 12 existe.

### Contornando checksum — o macete legítimo

⚠ **Se o formato tem checksum, o fuzzer nunca passa da verificação.** A solução comum e correta é
**corrigir o checksum no harness** — assim o fuzzer chega ao código depois da verificação:

```c
/* no harness: recalcula o campo de checksum antes de chamar o alvo */
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    if (size < 16) return 0;

    uint8_t *copia = malloc(size);
    if (!copia) return 0;
    memcpy(copia, data, size);

    /* recalcula o checksum nos últimos 4 bytes */
    uint32_t soma = 0;
    for (size_t i = 0; i < size - 4; i++) soma += copia[i];
    memcpy(copia + size - 4, &soma, 4);       /* ← ajusta antes de chamar */

    processar(copia, size);
    free(copia);
    return 0;
}
```

⚠ **Isso é prática estabelecida e documentada no OSS-Fuzz.** Mas tem uma consequência que você
**precisa** declarar no reporte: **o bug encontrado pode não ser alcançável com entrada real**,
porque você contornou a verificação. Se o checksum em produção impede a entrada malformada, o bug
é menos grave. **Declarar isso é diferença entre reporte honesto e reporte inflado** — e o módulo 12
volta nisso.

---

## 5.4 Medindo cobertura

⚠ **Sem medir, você não sabe se o corpus está funcionando.**

```bash
# libFuzzer mostra cobertura na saída (cov: e ft:)
./harnesses/parser_fuzz corpus/parser -dict=corpus/parser.dict \
    -max_total_time=60 -print_final_stats=1 2>&1 | tail -20

# Para cobertura detalhada com clang, use a opção de cobertura
clang -g -O1 -fsanitize=fuzzer,address -fprofile-instr-generate \
      -fcoverage-mapping -o harnesses/parser_cov \
      alvos/parser_lib.c harnesses/parser_harness.c

./harnesses/parser_cov corpus/parser -max_total_time=30 -runs=10000

# Gere o relatório (precisa de llvm-profdata e llvm-cov)
llvm-profdata merge -sparse default.profraw -o cov.profdata
llvm-cov report ./harnesses/parser_cov -instr-profile=cov.profdata \
    alvos/parser_lib.c
```

⚠ **Se `llvm-profdata` não estiver instalado:** `sudo apt install -y llvm` (o pacote traz os
utilitários). Sem ele, você fica só com o `cov:` da saída do libFuzzer — que **já é suficiente**
para a maioria das decisões.

### A tabela de decisão por cobertura

| Situação | Diagnóstico | Ação |
|---|---|---|
| Cobertura sobe rápido e estagna em 30% | Corpus não alcança partes do alvo | Adicionar sementes que exercitem essas partes |
| Cobertura não sobe desde o início | Harness, ou semente inválida | Testar o harness com semente válida à mão |
| Cobertura sobe a 90%+ e nenhum crash | Corpus bom; bug é difícil, ou não existe | Grammar-based, ou aceitar |
| Cobertura oscila entre execuções | Estado residual | Reinicializar no harness |

⚠ **"Estagnou em X%" é informação, não fracasso.** Se o corpus tem cobertura de 30% e não sobe,
você **sabe** que 70% do alvo não está sendo tocado. **Isso é diagnóstico** — e é o que separa
campanha com método de campanha às cegas.

---

## 5.5 Curadoria — o que manter e o que descartar

Depois de uma campanha, o corpus cresce e fica inútil.

| Corpus com | Problema | Solução |
|---|---|---|
| 10.000 entradas | Cada uma é testada por ciclo | **Minimizar** com `-merge` |
| Entradas redundantes | Mesma cobertura | Merge por cobertura |
| Entradas gigantes | Lentidão | Limitar tamanho, minimizar |
| Entradas que só o ASan passa | Falso positivo | Filtrar |

```bash
# libFuzzer: reduzir o corpus mantendo a cobertura
mkdir -p corpus/parser-merged
./harnesses/parser_fuzz -merge=1 corpus/parser-merged corpus/parser 2>&1 | tail -5

echo "=== antes ==="; ls corpus/parser      | wc -l
echo "=== depois ==="; ls corpus/parser-merged | wc -l
```

⚠ **O `-merge=1` é obrigatório em campanha longa.** Ele reduz o corpus mantendo **a mesma
cobertura** — e menos entradas significa mais execuções por segundo, que significa mais chance de
achar.

```bash
# Ainda menor: use os arquivos de cobertura dos próprios achados
./harnesses/parser_fuzz corpus/parser-merged -max_total_time=120 -runs=100000
```

⚠ **A ordem importa:** merge **depois** de cada campanha longa, não antes. Você quer as entradas
novas durante a campanha, e a redução no fim.

---

## 5.6 LAB — Corpus que acha o bug

**Duração:** 120 min

### Passo 1 — Prove o efeito do corpus (45 min)

⚠ **O experimento central do módulo.**

```bash
cd ~/fuzz-lab

# CASO A: corpus ruim (semente trivial)
mkdir -p corpus/ruim && echo "AAAA" > corpus/ruim/s1

# CASO B: corpus bom (as 4 sementes construídas acima)
ls corpus/parser/

echo "══════ CASO A — corpus ruim ══════"
timeout 90 ./harnesses/parser_fuzz corpus/ruim -max_total_time=60 \
    -print_final_stats=1 2>&1 | grep -E 'INITED|cov:|new_units|exec/s' | tail -6

echo
echo "══════ CASO B — corpus bom ══════"
timeout 90 ./harnesses/parser_fuzz corpus/parser -dict=corpus/parser.dict \
    -max_total_time=60 -print_final_stats=1 2>&1 | grep -E 'INITED|cov:|new_units|exec/s' | tail -6
```

Produza `efeito-corpus.md`:

| Métrica | Caso A (ruim) | Caso B (bom) | Fator |
|---|---|---|---|
| Cobertura inicial | | | |
| Cobertura final | | | |
| `new_units_added` | | | |
| **Achou crash?** | | | |
| Tempo até o achado | | | |

**Responda:**

1. **Em quanto a cobertura final diferiu?** Qual dos dois chegou ao bug?
2. Quantas entradas novas cada um adicionou? O que isso diz sobre a exploração?
3. **Se o caso A não achou em 60 s, ele acharia em 60 horas?** Justifique com a estrutura do alvo.
4. Qual a **técnica mais eficaz** que você aplicou: as quatro sementes, ou o dicionário?

⚠ **A resposta 3 é o argumento do módulo.** Com semente `"AAAA"`, o fuzzer precisa descobrir `FMT1`
— e isso **não acontece por mutação em tempo útil**. Rodar mais tempo **não resolve** o problema
que o corpus resolve em segundos.

### Passo 2 — Isole o efeito do dicionário (30 min)

```bash
echo "═══ corpus bom, SEM dicionário ═══"
timeout 60 ./harnesses/parser_fuzz corpus/parser -max_total_time=45 \
    -print_final_stats=1 2>&1 | grep -E 'cov:|new_units' | tail -4

echo
echo "═══ corpus bom, COM dicionário ═══"
timeout 60 ./harnesses/parser_fuzz corpus/parser -dict=corpus/parser.dict \
    -max_total_time=45 -print_final_stats=1 2>&1 | grep -E 'cov:|new_units' | tail -4
```

Produza `efeito-dicionario.md`:

| Configuração | Cobertura | Novas entradas | Achou? | Por quê |
|---|---|---|---|---|
| Sem dicionário | | | | |
| Com dicionário | | | | |

**Responda:**

1. O dicionário **mudou** algo? Quanto?
2. Se a semente já tinha `FMT1`, o dicionário era redundante? **Teste removendo o `magic` da
   semente e deixando só no dicionário.**
3. **Em que situação o dicionário é indispensável**, mesmo com boa semente?

⚠ **A resposta 3 é o critério de decisão:** o dicionário é indispensável quando o token **não está
em nenhuma semente** e **não é descobrível por mutação** (strings longas, valores específicos).

### Passo 3 — Construa semente "perto do bug" (25 min)

⚠ **A técnica mais eficaz do módulo.**

```bash
mkdir -p corpus/proximo-bug

# num_itens próximo do limite que causa o transbordo
# dest = 64 bytes, cada item = 8 bytes → o bug começa em 8 itens
python3 - <<'PY'
import struct
for n in [6, 7, 8, 9, 12, 16]:
    cab = b"FMT1" + struct.pack("<HHI", 1, n, n*8)
    open(f"corpus/proximo-bug/s{n:02d}", "wb").write(cab + b"X" * (n*8))
    print(f"s{n:02d}: num_itens={n}")
PY

echo
echo "═══ campanha com sementes próximas do bug ═══"
timeout 60 ./harnesses/parser_fuzz corpus/proximo-bug -dict=corpus/parser.dict \
    -max_total_time=30 -print_final_stats=1 2>&1 | \
    grep -E 'INITED|cov:|new_units|ERROR|SUMMARY' | tail -8
```

**Responda:**

1. **Em quanto tempo o crash apareceu?** Compare com os casos anteriores.
2. Que `num_itens` aparece na entrada que crashou? (Você vê no dump do libFuzzer.)
3. **Por que "colocar a semente perto do bug" é mais eficaz que aumentar o tempo de campanha?**
4. Isso é "trapaça"? Justifique.

⚠ **A resposta 4 é uma questão real de prática.** Colocar a semente perto do bug **é legítimo** —
você está usando conhecimento do **formato**, não do **bug**. Usar conhecimento do **bug específico**
para construir a entrada seria diferente. **A distinção: você pode conhecer o formato; você
reporta o bug que o fuzzer achou.**

### Passo 4 — Curadoria (20 min)

```bash
# Depois de todas as campanhas, veja quanto corpus acumulou
echo "corpus/parser:        $(ls corpus/parser | wc -l) arquivos"
echo "corpus/proximo-bug:   $(ls corpus/proximo-bug | wc -l) arquivos"
find . -path './corpus/*' -type f | wc -l

# Merge
mkdir -p corpus/merged
./harnesses/parser_fuzz -merge=1 corpus/merged corpus/parser corpus/proximo-bug 2>&1 | tail -3
echo "corpus/merged:        $(ls corpus/merged | wc -l) arquivos"
```

Produza `curadoria.md`:

| Corpus | Antes | Depois do merge | Redução |
|---|---|---|---|
| `parser/` + `proximo-bug/` | | | |
| | | | |

**Responda:**

1. **Quanto o merge reduziu?** A cobertura se manteve?
2. Por que menos entradas significa mais execuções/segundo? Mostre com número.
3. **Quando** você faz o merge — antes ou depois da campanha? Por quê?
4. O que aconteceria se você fizesse o merge **durante** a campanha?

### Critérios de aceitação

- `efeito-corpus.md` com os dois casos medidos e a resposta sobre **por que mais tempo não resolve**.
- Você demonstrou que o dicionário tem efeito **mensurável** (ou explicou por que não teve).
- `corpus/proximo-bug/` com 6 sementes, e o tempo até o crash medido.
- Você respondeu se "semente perto do bug" é trapaça, **com a distinção formato vs. bug**.
- `curadoria.md` com o merge feito e a redução medida.
- Você explicou por que o merge é feito **depois**, não durante.
- `corpus/parser.dict` escrito com pelo menos 8 tokens.

---

## Avaliação

1. Em uma frase, por que o corpus decide o resultado da campanha?
2. Explique o experimento mental do parser com quatro verificações. Por que `"AAAA"` é inútil?
3. Cite as quatro fontes de semente, com o esforço de cada uma.
4. Por que arquivo real é a melhor semente? Que cuidado você precisa ter com ele?
5. O que é dicionário, e como ele resolve o problema do `magic`?
6. Cite cinco situações em que o dicionário **não** resolve. O que resolve cada uma?
7. Como você contorna um checksum, e o que **precisa** declarar no reporte por causa disso?
8. Por que "colocar a semente perto do bug" é a técnica mais eficaz? Isso é trapaça?
9. Explique a diferença entre conhecer o **formato** e conhecer o **bug**.
10. Interprete: "a cobertura estagnou em 30%". O que você sabe e o que você faz?
11. Por que a cobertura que oscila entre execuções indica estado residual?
12. O que o `-merge=1` faz, e por que ele **aumenta** a chance de achar bug?
13. Por que o merge é feito depois da campanha e não durante?

---

**Próximo:** [Módulo 6 — AFL++ na prática](modulo-06.md)
