# Módulo 6 — AFL++ na Prática

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Instrumentar alvo com `afl-clang-fast` e medir a cobertura da instrumentação.
2. Escolher entre os modos de compilação e saber o custo de cada um.
3. Rodar campanha paralela e entender o que cada instância faz.
4. Usar *persistent mode* e medir o ganho de velocidade.
5. Ler o painel do `afl-fuzz` e diagnosticar campanha improdutiva.

---

## ⚠ Conduta

Alvo próprio, compilado por você, rodando em `localhost`. Nada de fuzzer contra alvo que não é seu —
fuzzing contra terceiro consome recurso dele, e isso é negação de serviço.

---

## 6.1 Instrumentação — como o fuzzer "vê" o caminho

O AFL++ precisa saber **que caminho a entrada percorreu**. Ele descobre isso injetando código em
cada bloco básico durante a compilação.

```
SEM INSTRUMENTAÇÃO              COM INSTRUMENTAÇÃO
┌────────────────────┐         ┌────────────────────┐
│ if (magic ok) {    │         │ if (magic ok) {    │
│   ...              │         │   __afl_area[ID]++;│ ← marca que passou
│ }                  │         │   ...              │
└────────────────────┘         │ }                  │
   fuzzer é cego                └────────────────────┘
   → mutação aleatória pura       fuzzer vê o caminho
                                  → mutação guiada
```

⚠ **Sem instrumentação, o AFL++ cai para mutação aleatória** — e você perde a razão de usar
coverage-guided fuzzing. Existe modo para alvo binário-só (QEMU), mas ele é mais lento e menos
preciso. **Com fonte, sempre instrumente.**

### Os modos de compilação

| Wrapper | Modo | Velocidade | Quando usar |
|---|---|---|---|
| **`afl-clang-fast`** | LLVM, PCGUARD | **Rápido** | **Padrão do curso** |
| `afl-clang-lto` | LTO, instrumentação em link | Mais rápido ainda | Projeto com LTO viável |
| `afl-clang-fast++` | Idem, para C++ | — | Alvo em C++ |
| `afl-gcc-fast` | GCC plugin | Médio | Quando não há clang |
| `afl-clang` / `afl-gcc` | Assembley-level (legado) | Lento | Compatibilidade |
| `afl-fuzz -Q` | QEMU, sem fonte | Muito lento | Só binário |

```bash
cd ~/fuzz-lab

# 1. Instrumente o alvo (com ASan + UBSan, como no módulo 2)
AFL_USE_ASAN=1 AFL_USE_UBSAN=1 \
afl-clang-fast -g -O1 -fno-omit-frame-pointer \
    -o alvos/parser_afl alvos/parser_lib.c harnesses/parser_main.c

# 2. Confirme que a instrumentação está presente
afl-showmap -o /dev/null -- ./alvos/parser_afl corpus/valido.bin
# Deve imprimir algo como: ++ Captured N tuples
```

⚠ **Note que o AFL++ quer um `main`, não um `LLVMFuzzerTestOneInput`.** Você precisa de um wrapper
que leia o arquivo e chame a função:

```bash
cat > harnesses/parser_main.c <<'EOF'
/* wrapper para AFL++: lê arquivo e chama o alvo */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stddef.h>

int parse(const uint8_t *buf, size_t len, char **saida);

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    FILE *f = fopen(argv[1], "rb");
    if (!f) return 3;
    fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET);
    if (n <= 0 || n > 65536) { fclose(f); return 0; }

    uint8_t *buf = malloc((size_t)n);
    if (!buf) { fclose(f); return 3; }
    if (fread(buf, 1, (size_t)n, f) != (size_t)n) { fclose(f); free(buf); return 3; }
    fclose(f);

    char *saida = NULL;
    (void)parse(buf, size, &saida);
    free(saida);
    free(buf);
    return 0;
}
EOF
```

⚠ **Melhor ainda: use o `afl_driver`**, que permite reaproveitar o mesmo harness do libFuzzer:

```bash
# O AFL++ traz um driver que aceita LLVMFuzzerTestOneInput
AFL_USE_ASAN=1 afl-clang-fast -g -O1 -fno-omit-frame-pointer \
    -o alvos/parser_afl_libfuzzer \
    alvos/parser_lib.c harnesses/parser_harness.c \
    "$(afl-clang-fast -print-file-name=afl_driver.o)" 2>/dev/null || \
    echo "afl_driver não encontrado — use o wrapper acima"
```

⚠ **Reaproveitar o harness é a prática certa.** Documentação do AFL++ confirma que harnesses
`LLVMFuzzerTestOneInput` funcionam com AFL++ — é o mesmo arquivo, dois fuzzers. **Escreva o harness
uma vez, use nos dois.**

---

## 6.2 A campanha

```bash
cd ~/fuzz-lab

# Prepare o corpus de entrada
mkdir -p corpus/afl-in && cp corpus/parser/* corpus/afl-in/ 2>/dev/null
ls corpus/afl-in/

# ⚠ O AFL++ exige que TODAS as sementes sejam diferentes — remova duplicatas
afl-cmin -i corpus/afl-in -o corpus/afl-cmin -- ./alvos/parser_afl @@
ls corpus/afl-cmin/
```

⚠ **O `afl-cmin` é obrigatório antes de campanha longa.** Ele roda todas as sementes, vê quais
depositam **caminhos distintos**, e mantém só essas. Redução típica: 50–80% das sementes, sem
perda de cobertura.

### Rodar

```bash
# Sessão curta, para ver o comportamento
timeout 120 afl-fuzz -i corpus/afl-cmin -o findings \
    -x corpus/parser.dict \
    -- ./alvos/parser_afl @@
```

⚠ **Se aparecer aviso sobre `core_pattern`,** o sistema está capturando crash antes do AFL++. Siga
a instrução do próprio aviso — geralmente é `sudo sh -c 'echo core >/proc/sys/kernel/core_pattern'`.
Em VM de laboratório, é seguro. **Em máquina de trabalho, não faça isso sem entender.**

### O painel, campo por campo

```
          american fuzzy lop ++4.x
┌─ process timing ─────────────────┬─ overall results ────────────┐
│        run time : 0 days, 0 hrs, │  cycles done : 4             │
│    last new find : 0 days, 0 hrs │  corpus count : 27           │
│  last uniq crash : none seen yet │  saved crashes : 0           │
│   last uniq hang : none seen yet │  saved hangs   : 0           │
├─ cycle progress ─────────────────┼─ map coverage ───────────────┤
│  now processing : 12 (44.4%)     │    map density : 2.31%       │
├─ stage progress ─────────────────┼─ findability ────────────────┤
│  now trying : havoc              │  favored items : 8 (29.6%)   │
│ stage execs : 1.2k/12k (10.0%)   │                              │
├─ executions ─────────────────────┼─ stability ──────────────────┤
│        exec speed : 850/sec      │  stability : 100.00%         │
├─ item geometry ──────────────────┴──────────────────────────────┤
│  coverage : 4.61%                                                │
│  bitmap  : 2.31%                                                 │
└──────────────────────────────────────────────────────────────────┘
```

| Campo | Significa | O que fazer com ele |
|---|---|---|
| **`run time`** | Tempo total | — |
| **`last new find`** | Última entrada nova | Muito tempo = estagnou |
| **`corpus count`** | Entradas no corpus | Cresce = explorando |
| **`saved crashes`** | **Crashes únicos** | O que você quer |
| **`cycles done`** | Quantas vezes varreu o corpus | 0 = ainda na primeira volta |
| **`map coverage` / `coverage`** | **Cobertura** | Baixo e estagnado = problema |
| **`exec speed`** | **Execuções/segundo** | **A métrica que você otimiza** |
| **`stability`** | Reprodutibilidade da cobertura | **< 100% = estado residual** |
| `favored items` | Entradas que valem mais | — |

⚠ **`stability` é o campo mais diagnóstico e o menos olhado.** Se for `< 100%`, o **mesmo arquivo
produz cobertura diferente entre execuções** — sinal clássico de estado residual (módulo 4, erro
nº 3) ou de aleatoriedade no alvo. **Se `stability` < 95%, seu fuzzing está degradado** e você
precisa consertar o harness antes de continuar.

⚠ **`exec speed` baixo é o outro diagnóstico.** Com fork server, 1.000–5.000 exec/s é esperado.
Abaixo de 500, o alvo é lento ou o harness tem I/O por chamada.

---

## 6.3 Campanha paralela

⚠ **Fuzzing em um núcleo é desperdício.** O AFL++ tem dois modelos de paralelismo.

```
MODELO 1 — MASTER/SECONDARY (tradicional)
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ master   │   │ -S sec1  │   │ -S sec2  │   │ -S sec3  │
│ (-M)     │   │ havoc    │   │ havoc    │   │ splice   │
│ determin.│   │ aleatório│   │ aleatório│   │ aleatório│
└────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
     └──────────────┴──────────────┴──────────────┘
                    compartilham o corpus
                     (sync em findings/)

MODELO 2 — MAIN/SECONDARY (AFL++ 4.x, preferido)
┌──────────┐   ┌──────────┐   ┌──────────┐
│ -M main  │   │ -S s1    │   │ -S s2    │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     └──────────────┴──────────────┘
        -M cuida da sincronização automaticamente
```

```bash
# Terminal 1 — instância principal
afl-fuzz -i corpus/afl-cmin -o findings -M main \
    -x corpus/parser.dict -- ./alvos/parser_afl @@

# Terminal 2..N — instâncias secundárias (uma por núcleo)
afl-fuzz -i corpus/afl-cmin -o findings -S s1 \
    -x corpus/parser.dict -- ./alvos/parser_afl @@
afl-fuzz -i corpus/afl-cmin -o findings -S s2 \
    -x corpus/parser.dict -- ./alvos/parser_afl @@
afl-fuzz -i corpus/afl-cmin -o findings -S s3 \
    -x corpus/parser.dict -- ./alvos/parser_afl @@
```

⚠ **Todas as instâncias usam o MESMO `-o findings`.** É assim que elas compartilham corpus. Se cada
uma usar um diretório diferente, você tem quatro campanhas isoladas — que é pior que uma campanha
paralela, porque nenhuma aproveita a descoberta das outras.

⚠ **Quantas instâncias?** Uma por núcleo físico disponível. Mais que isso, elas competem por CPU e
não ganham. `nproc` diz quantas você pode usar.

---

## 6.4 Persistent mode — o maior ganho de velocidade

⚠ **Este é o recurso que muda a ordem de grandeza.**

```
MODO NORMAL (fork server)          PERSISTENT MODE
┌─────────────────────┐           ┌─────────────────────┐
│ for cada entrada:   │           │ processo fica vivo  │
│   fork()            │           │ for i in 1..1000:   │
│   executa           │           │   lê entrada        │
│   exit              │           │   executa           │
└─────────────────────┘           │   reseta estado     │
    ~2.000 exec/s                 └─────────────────────┘
                                       ~50.000+ exec/s
```

```c
/* harness com persistent mode */
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

int parse(const uint8_t *buf, size_t len, char **saida);

/* buffer do AFL++ — deve ser estático */
__AFL_FUZZ_INIT();

int main(void) {
#ifdef __AFL_HAVE_MANUAL_CONTROL
    __AFL_INIT();
#endif

    unsigned char *buf = __AFL_FUZZ_TESTCASE_BUF;

    /* ⚠ o processo NÃO morre entre as entradas */
    while (__AFL_LOOP(10000)) {
        size_t len = __AFL_FUZZ_TESTCASE_LEN;

        if (len < 12 || len > 65536) continue;

        /* ⚠ REINICIALIZA o estado a cada iteração — isto é obrigatório */
        char *saida = NULL;
        (void)parse(buf, len, &saida);
        free(saida);
    }
    return 0;
}
```

### As quatro regras do persistent mode

| Regra | Por quê |
|---|---|
| **Estado reinicializado a cada iteração** | Sem isso, entrada N depende de N-1 → crashes irreais |
| **Nada de `exit()` no laço** | Mata o processo e perde o ganho |
| **`__AFL_LOOP(N)` com N razoável** | 1.000–10.000; muito alto = mais chance de vazamento acumular |
| **Vazamento zero por iteração** | Com 10.000 iterações, 1 byte vazado = 10 KB por processo |

⚠ **A quarta regra é a que quebra campanha longa.** Um alvo com vazamento de 100 bytes por chamada,
em 10.000 iterações, vaza 1 MB por processo. Com 8 processos e campanha de horas, você esgota a
memória. **É por isso que o LSan existe** — e o módulo 9 trata vazamento como classe de achado.

```bash
# Compile com persistent mode
AFL_USE_ASAN=1 AFL_USE_UBSAN=1 \
afl-clang-fast -g -O1 -fno-omit-frame-pointer -D__AFL_FUZZ_INIT \
    -o alvos/parser_afl_persist alvos/parser_lib.c harnesses/parser_persist.c

# Meça a diferença
timeout 60 afl-fuzz -i corpus/afl-cmin -o findings-persist -- \
    ./alvos/parser_afl_persist
```

⚠ **Compare `exec speed` entre as duas versões.** O ganho típico é **10× a 50×**. Se não houver
ganho, o persistent mode não está ativo — verifique se o `__AFL_LOOP` está no código e se o binário
foi compilado com o wrapper do AFL++.

---

## 6.5 Diagnóstico de campanha improdutiva

A tabela que resolve 90% dos casos.

| Sintoma no painel | Causa | Correção |
|---|---|---|
| `exec speed` < 500 | Harness com I/O, ou alvo lento | Persistent mode; refatorar alvo |
| `stability` < 95% | Estado residual, aleatoriedade | Reinicializar no harness |
| `coverage` não sobe | Corpus ruim, ou harness | Módulo 5 |
| `saved crashes: 0` após horas, cobertura alta | Corpus está **bom**; bug difícil | Ver abaixo |
| `cycles done: 0` há muito tempo | Alvo lento, corpus grande | `afl-cmin` |
| Sempre `none seen yet` em `last new find` | Estagnou | Reduzir corpus, aumentar paralelismo |
| `map density` muito alta (> 70%) | Colisão de bitmap | Recompilar com `AFL_MAP_SIZE` maior |

⚠ **A linha "cobertura alta, zero crash" é a mais importante de interpretar.** Ela significa uma
de três coisas:

1. **O alvo realmente não tem bug alcançável** por mutação. É resultado legítimo.
2. **O bug está atrás de uma validação** que o fuzzer não atravessa (checksum, tamanho que precisa
   bater, criptografia). É o módulo 12.
3. **O caminho do bug não está instrumentado** — parcialmente instrumentado, ou biblioteca externa
   não instrumentada.

⚠ **A distinção se faz assim:**

```bash
# O caminho do bug está sendo alcançado?
# 1. Coloque um ponto de marcação no código antes do bug
# 2. Veja se o fuzzer chega lá

# Com AFL++ você pode verificar cobertura por região
afl-showmap -i corpus/afl-cmin -o /dev/null -- ./alvos/parser_afl @@ 2>&1 | tail -3

# E comparar com a cobertura da semente que você sabe que chega perto do bug
afl-showmap -o /tmp/mapa-proximo-bug -- ./alvos/parser_afl corpus/proximo-bug/s08
afl-showmap -o /tmp/mapa-ruim -- ./alvos/parser_afl corpus/ruim/s1
diff <(sort /tmp/mapa-proximo-bug) <(sort /tmp/mapa-ruim) | wc -l
```

⚠ **A contagem de diferenças é o número de caminhos que a semente boa alcança e a ruim não.**
Se ela for **zero**, o problema é o corpus. Se for grande e mesmo assim não há crash, o problema é
mais profundo — e é o que o módulo 12 enfrenta.

---

## 6.6 LAB — Campanha completa, do `cmin` ao crash

**Duração:** 150 min

### Passo 1 — Instrumente e valide (30 min)

```bash
cd ~/fuzz-lab

# Wrapper (se você não tiver o afl_driver)
cat > harnesses/parser_main.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stddef.h>
int parse(const uint8_t *buf, size_t len, char **saida);
int main(int argc, char **argv) {
    if (argc < 2) return 2;
    FILE *f = fopen(argv[1], "rb");
    if (!f) return 3;
    fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET);
    if (n < 12 || n > 65536) { fclose(f); return 0; }
    uint8_t *b = malloc((size_t)n);
    if (!b) { fclose(f); return 3; }
    if (fread(b, 1, (size_t)n, f) != (size_t)n) { fclose(f); free(b); return 3; }
    fclose(f);
    char *s = NULL; (void)parse(b, (size_t)n, &s); free(s); free(b);
    return 0;
}
EOF

AFL_USE_ASAN=1 AFL_USE_UBSAN=1 \
afl-clang-fast -g -O1 -fno-omit-frame-pointer \
    -o alvos/parser_afl alvos/parser_lib.c harnesses/parser_main.c

afl-showmap -o /dev/null -- ./alvos/parser_afl corpus/parser/s1-minima
```

Produza `instrumentacao.md`:

| Teste | Resultado |
|---|---|
| `afl-showmap` capturou tuples? | |
| Quantos tuples (caminhos)? | |
| Cobertura muda entre sementes diferentes? | |
| Cobertura muda entre execuções da MESMA semente? | |

⚠ **A última linha testa a `stability`.** Rode o `showmap` três vezes com a mesma semente e compare
a contagem de tuples. **Contagem diferente = estado residual, e você precisa consertar antes de
fuzzar.**

### Passo 2 — `afl-cmin` e a primeira campanha (40 min)

```bash
mkdir -p corpus/afl-in && cp corpus/parser/* corpus/proximo-bug/* corpus/afl-in/ 2>/dev/null
echo "sementes: $(ls corpus/afl-in | wc -l)"

afl-cmin -i corpus/afl-in -o corpus/afl-final -- ./alvos/parser_afl @@
echo "depois do cmin: $(ls corpus/afl-final | wc -l)"

# Campanha curta — só para ver o painel
timeout 120 afl-fuzz -i corpus/afl-final -o findings \
    -x corpus/parser.dict -- ./alvos/parser_afl @@
```

Produza `campanha.md`:

| Métrica | Valor |
|---|---|
| Sementes antes do `cmin` | |
| Sementes depois do `cmin` | |
| Redução | |
| `exec speed` | |
| `coverage` final | |
| `stability` | |
| `saved crashes` | |

**Responda:**

1. **Quanto o `cmin` reduziu?** A cobertura ficou igual?
2. A `stability` ficou em 100%? Se não, o que está errado?
3. **Quantos crashes apareceram em 120 s?** Se zero, qual a causa provável (tabela §6.5)?
4. O `exec speed` está na faixa esperada para fork server (1.000–5.000)?

### Passo 3 — Persistent mode e a medição (40 min)

```bash
cat > harnesses/parser_persist.c <<'EOF'
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
int parse(const uint8_t *buf, size_t len, char **saida);

__AFL_FUZZ_INIT();

int main(void) {
#ifdef __AFL_HAVE_MANUAL_CONTROL
    __AFL_INIT();
#endif
    unsigned char *buf = __AFL_FUZZ_TESTCASE_BUF;
    while (__AFL_LOOP(10000)) {
        size_t len = __AFL_FUZZ_TESTCASE_LEN;
        if (len < 12 || len > 65536) continue;
        /* ⚠ estado é local — nada global a reinicializar aqui */
        char *s = NULL;
        (void)parse(buf, len, &s);
        free(s);          /* ⚠ sem vazamento por iteração */
    }
    return 0;
}
EOF

AFL_USE_ASAN=1 AFL_USE_UBSAN=1 \
afl-clang-fast -g -O1 -fno-omit-frame-pointer \
    -o alvos/parser_afl_persist alvos/parser_lib.c harnesses/parser_persist.c

echo "═══ MODO NORMAL ═══"
timeout 60 afl-fuzz -i corpus/afl-final -o /tmp/f1 -- ./alvos/parser_afl @@ 2>&1 | \
    grep -oE 'exec speed.*' | head -1

echo "═══ PERSISTENT MODE ═══"
timeout 60 afl-fuzz -i corpus/afl-final -o /tmp/f2 -- ./alvos/parser_afl_persist 2>&1 | \
    grep -oE 'exec speed.*' | head -1
```

Produza `persistent.md`:

| Modo | Exec/s | Fator | Crashes |
|---|---|---|---|
| Fork server | | 1× | |
| **Persistent** | | | |

**Responda:**

1. **Qual o fator de ganho?** Está na faixa de 10–50×?
2. Se o ganho foi pequeno, **por que** o persistent mode não ativou?
3. Em campanha de 24 h, quantas execuções cada modo faz? Mostre a conta.
4. **O persistent mode mudou a `stability`?** Se caiu, o que isso indica?

⚠ **A resposta 4 é importante.** No persistent mode, o estado acumula entre iterações **por
design**. Se a `stability` caiu, você tem estado global não reinicializado — e vai achar crashes que
não reproduzem.

### Passo 4 — Campanha paralela (40 min)

```bash
# ⚠ Em máquina com poucos núcleos, use 2 instâncias e reduza o tempo
NUCLEOS=$(( $(nproc) < 4 ? 2 : 4 ))
echo "usando ${NUCLEOS} instâncias"

# Principal
timeout 180 afl-fuzz -i corpus/afl-final -o findings-par -M main \
    -x corpus/parser.dict -- ./alvos/parser_afl_persist >/dev/null 2>&1 &

# Secundárias
for i in $(seq 1 $((NUCLEOS - 1))); do
    timeout 180 afl-fuzz -i corpus/afl-final -o findings-par -S "s${i}" \
        -x corpus/parser.dict -- ./alvos/parser_afl_persist >/dev/null 2>&1 &
done

wait
echo
echo "=== resultado ==="
find findings-par -name 'id:*' -path '*crashes*' 2>/dev/null | wc -l
afl-whatsup findings-par 2>/dev/null | head -20 || \
    for d in findings-par/*/; do echo "${d}: $(ls "${d}"/crashes 2>/dev/null | wc -l) crashes"; done
```

Produza `paralelo.md`:

| Instância | Exec/s | Corpus | Crashes | `cycles done` |
|---|---|---|---|---|
| `main` | | | | |
| `s1` | | | | |
| `s2` | | | | |
| **Total** | | | | |

**Responda:**

1. **As instâncias compartilharam corpus?** Como você sabe? (Dica: veja se `s1` tem entradas que
   vieram de `main`.)
2. A soma de exec/s é **igual** à de uma instância × N, ou menor? Por quê?
3. Os crashes encontrados aparecem em **todas** as instâncias ou só numa? Por quê?
4. **Se você tivesse usado diretórios diferentes** para cada instância, o que mudaria?

⚠ **A resposta 4 é o erro mais comum.** Com `-o` diferente por instância, você tem N campanhas
isoladas — e nenhuma aproveita o que as outras descobriram.

### Critérios de aceitação

- `instrumentacao.md` com o `showmap` rodado e a **`stability` testada** com três execuções.
- `campanha.md` com o `cmin` medido e a resposta sobre a causa dos zero crashes.
- `persistent.md` com o **fator de ganho** medido, e a explicação se foi pequeno.
- Você verificou a `stability` no persistent mode e explicou o que caiu significa.
- `paralelo.md` com as quatro instâncias medidas e a resposta sobre compartilhamento.
- Você explicou por que diretórios diferentes por instância é erro.
- Você identificou o campo do painel que é diagnóstico de estado residual.

---

## Avaliação

1. Como a instrumentação muda o funcionamento do fuzzer? O que acontece sem ela?
2. Cite os modos de compilação e a velocidade relativa de cada um.
3. Por que reaproveitar o harness `LLVMFuzzerTestOneInput` entre libFuzzer e AFL++ é a prática certa?
4. O que o `afl-cmin` faz, e por que ele é obrigatório antes de campanha longa?
5. **Qual campo do painel é diagnóstico de estado residual?** Como você interpreta?
6. Explique o modelo master/secondary e o main/secondary. Qual o AFL++ 4.x prefere?
7. Por que todas as instâncias paralelas usam o **mesmo** `-o`?
8. Quantas instâncias usar, e por quê?
9. Descreva o persistent mode e o ganho típico.
10. Cite as quatro regras do persistent mode. Qual quebra campanha longa?
11. Por que vazamento de 100 bytes por chamada é problema em persistent mode?
12. Interprete: "cobertura alta, zero crash após horas". Cite as três causas possíveis.
13. Como você distingue "o bug está atrás de validação" de "o corpus não alcança o caminho"?

---

**Próximo:** [Módulo 7 — libFuzzer e integração contínua](modulo-07.md)
