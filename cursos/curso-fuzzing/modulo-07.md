# Módulo 7 — libFuzzer e Integração Contínua

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Rodar libFuzzer com as opções que importam, e ler a saída.
2. Estruturar um projeto para fuzzing contínuo.
3. Entender como o OSS-Fuzz funciona e o que é preciso para entrar.
4. Configurar fuzzing no CI, com limite de tempo e tratamento de falha.
5. Escolher entre libFuzzer e AFL++ com critério.

---

## ⚠ Conduta

Alvo próprio. Se você for contribuir com fuzzing para projeto de código aberto, o alvo passa a ser
**consentido** — e o módulo 12 trata do reporte adequado.

---

## 7.1 libFuzzer — o fuzzer in-process

O libFuzzer roda **dentro do processo** do alvo. Sem `fork`, sem `exec`, sem I/O — só a chamada da
função.

```
AFL++ (fork server)                libFuzzer (in-process)
┌──────────────────────┐          ┌──────────────────────┐
│ processo pai        │          │ UM processo          │
│   fork() → filho    │          │ while (1) {          │
│     executa entrada  │          │   pega entrada       │
│     exit             │          │   chama o alvo       │
│   repete             │          │ }                    │
└──────────────────────┘          └──────────────────────┘
   ~2.000 – 20.000 exec/s            100.000 – 500.000 exec/s
```

⚠ **A diferença prática:** com libFuzzer você acha em **horas** o que com AFL++ leva **dias**. Não
por ser melhor fuzzer — por não gastar tempo criando processo.

⚠ **O custo:** se o alvo **morre**, o fuzzer morre também. libFuzzer não sobrevive a `exit()`,
a `abort()` fora do sanitizer, nem a estado global persistente. **É por isso que o harness precisa
ser limpo** (módulo 4).

### As opções que importam

```bash
cd ~/fuzz-lab

# Sessão padrão
./harnesses/parser_fuzz corpus/parser -dict=corpus/parser.dict

#  ── Tempo e volume ──────────────────────────────────────────
-max_total_time=300          # roda 5 minutos e para
-runs=1000000                # roda N execuções e para
-timeout=10                  # timeout por execução (segundos)

#  ── Controle de entrada ─────────────────────────────────────
-max_len=4096                # tamanho máximo de entrada
-dict=arquivo.dict           # dicionário
-seed=12345                  # reprodutibilidade

#  ── Desempenho ──────────────────────────────────────────────
-jobs=N -workers=M           # paralelismo (N processos, M workers)
-fork=N                      # roda em modo fork (mais lento, mais isolado)
-rss_limit_mb=2048           # limite de memória
-malloc_limit_mb=512         # limite de alocação

#  ── Reprocessar e analisar ───────────────────────────────────
-runs=1  arquivo-de-crash    # reproduzir uma entrada específica
-minimize_crash=1 arquivo    # minimiza um crash
-merge=1 dir-novo dir-antigo # reduzir corpus
```

⚠ **`-fork=N` merece um comentário.** Ele roda em processo separado, e é **mais lento** — mas
sobrevive a `exit()` e a vazamento acumulado. **Use quando o alvo tem estado que você não consegue
limpar.** Você troca velocidade por robustez.

### Reproduzir um crash

```bash
# libFuzzer deixa o arquivo do crash no diretório
ls crash-*

# Reproduzir
./harnesses/parser_fuzz crash-abc123

# Com verificação de que o crash é real (não flaky)
for i in 1 2 3 4 5; do
    ./harnesses/parser_fuzz crash-abc123 >/dev/null 2>&1
    echo "execução ${i}: código $?"
done
```

⚠ **O teste de cinco execuções é obrigatório.** Se o crash **não** acontecer nas cinco, ele é
**flaky** — provavelmente estado residual, ou dependência de tempo/memória. **Um crash que não
reproduz sempre não é reportável.**

---

## 7.2 Estrutura de projeto para fuzzing contínuo

⚠ **Fuzzing de verdade não é sessão única.** É processo que roda continuamente. A estrutura importa.

```
projeto/
├── src/
│   ├── parser.c
│   └── parser.h
├── fuzz/
│   ├── parser_fuzzer.c          ← harness (LLVMFuzzerTestOneInput)
│   ├── CMakeLists.txt           ← build do fuzzer
│   └── corpus/
│       ├── seed1
│       └── seed2
├── tests/
├── CMakeLists.txt
└── .github/workflows/fuzz.yml   ← CI
```

### O `CMakeLists` do fuzzer

```cmake
# fuzz/CMakeLists.txt
add_executable(parser_fuzzer
    parser_fuzzer.c
    ../src/parser.c
)
target_compile_options(parser_fuzzer PRIVATE
    -g -O1
    -fsanitize=fuzzer,address,undefined
    -fno-omit-frame-pointer
)
target_link_options(parser_fuzzer PRIVATE
    -fsanitize=fuzzer,address,undefined
)
```

⚠ **A regra do build:** **o fuzzer e o alvo precisam das MESMAS flags de sanitizer.** Se o alvo é
compilado sem ASan e o fuzzer com, você tem link inconsistente — e detecção parcial.

### O `fuzz.yml` do CI

```yaml
name: fuzzing
on:
  push: { branches: [ main ] }
  pull_request:
  schedule:
    - cron: '0 3 * * *'        # toda madrugada

jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Instalar clang
        run: sudo apt-get update && sudo apt-get install -y clang llvm

      - name: Build do fuzzer
        run: |
          clang -g -O1 -fsanitize=fuzzer,address,undefined \
                -fno-omit-frame-pointer \
                -o parser_fuzzer \
                fuzz/parser_fuzzer.c src/parser.c

      - name: Fuzzing (5 minutos)
        run: |
          mkdir -p corpus-novo
          ./parser_fuzzer fuzz/corpus corpus-novo \
              -max_total_time=300 \
              -rss_limit_mb=2048 \
              -print_final_stats=1

      - name: Guardar corpus
        uses: actions/upload-artifact@v4
        with:
          name: corpus
          path: corpus-novo

      - name: Falhar se achou crash
        run: |
          if ls crash-* 2>/dev/null; then
              echo "⚠ CRASH ENCONTRADO"
              ls -la crash-*
              exit 1
          fi
          echo "✓ nenhum crash"
```

⚠ **A última etapa é a que dá valor ao CI.** Sem o `exit 1`, o CI passa mesmo com crash — e o
fuzzer vira decoração. **Fuzzing no CI só serve se falhar quando acha.**

⚠ **E note o `schedule` com cron.** Fuzzing contínuo é **acumulativo**: cada madrugada adiciona
corpus, e o corpus é o ativo (módulo 5). Um projeto que fuzza há um ano tem corpus que encontra bug
em minutos, porque já sabe os caminhos.

---

## 7.3 OSS-Fuzz — o que é preciso para entrar

⚠ **OSS-Fuzz** é o serviço do Google que roda fuzzing contínuo para projeto de código aberto, de
graça. Ter projeto lá significa: **fuzzing 24/7 em infraestrutura do Google, e bugs reportados
automaticamente**.

| Requisito | Detalhe |
|---|---|
| **Projeto de código aberto** | Licença OSI, código público |
| **Alvo fuzzável** | Pelo menos uma função com entrada controlável |
| **Harness** | `LLVMFuzzerTestOneInput` |
| **`build.sh`** | Script que compila o fuzzer na imagem deles |
| **`project.yaml`** | Metadado: contato, idioma, sanitizers |
| **Corpus inicial** (opcional) | Acelera muito |

### A estrutura do `build.sh`

```bash
#!/bin/bash -eu
# build.sh para OSS-Fuzz
#
# Variáveis fornecidas pelo ambiente:
#   $SRC  — diretório do código-fonte
#   $OUT  — onde colocar os fuzzers compilados
#   $CC, $CXX, $CFLAGS, $CXXFLAGS, $LIB_FUZZING_ENGINE

cd "$SRC/projeto"

# 1. compila as dependências
./configure --disable-shared
make clean
make -j"$(nproc)"

# 2. compila os fuzzers — $LIB_FUZZING_ENGINE traz o libFuzzer
for fuzzer in "$SRC"/projeto/fuzz/*_fuzzer.c; do
    nome=$(basename "${fuzzer}" _fuzzer.c)
    $CC $CFLAGS -I. \
        "${fuzzer}" \
        .libs/libprojeto.a \
        $LIB_FUZZING_ENGINE \
        -o "$OUT/${nome}_fuzzer"
done

# 3. opcional: empacotar o corpus inicial
zip -j "$OUT/parser_fuzzer_seed_corpus.zip" fuzz/corpus/*
```

⚠ **O `$LIB_FUZZING_ENGINE` é o ponto.** Ele resolve para o libFuzzer (ou outro engine) na imagem
do OSS-Fuzz. Você **não** linka libFuzzer diretamente.

### O `project.yaml`

```yaml
homepage: "https://exemplo.org/projeto"
language: c
primary_contact: "voce@exemplo.org"
auto_ccs:
  - "outro@exemplo.org"
sanitizers:
  - address
  - undefined
  - memory        # opcional, mais lento
architectures:
  - x86_64
main_repo: "https://github.com/exemplo/projeto.git"
```

⚠ **`primary_contact` é obrigatório** e é para quem os bugs são reportados. Se você colocar um
endereço que não lê, bugs ficam sem resposta — e o projeto pode ser removido por inatividade.

⚠ **O `auto_ccs` é importante na prática:** é ele que garante que mais de uma pessoa recebe o
relatório. Projeto com um contato só, pessoa que sai da equipe, perde o fuzzing.

---

## 7.4 libFuzzer versus AFL++ — critério de escolha

⚠ **A pergunta "qual é melhor" está mal formulada.** A pergunta certa é **"qual se encaixa no meu
caso"**.

| Dimensão | libFuzzer | AFL++ |
|---|---|---|
| **Velocidade** | **Muito alta** (in-process) | Alta (fork server) |
| **Robustez** | Morre se o alvo morre | **Sobrevive** |
| **Alvo com `exit()`** | Problema | OK |
| **Alvo com estado global** | Problema | OK (cada fork é limpo) |
| **Alvo binário-só** | Não | **Sim** (QEMU) |
| **Alvo com muitas threads** | Possível | OK |
| **Paralelismo** | `-jobs`/`-workers` | **Melhor** (sync de corpus) |
| **Integração CI** | **Simples** | Mais passos |
| **Corpus compartilhado** | **`-merge` funciona bem** | Sync entre instâncias |
| **Curva de aprendizado** | **Baixa** | Média |

### A regra prática

| Se o alvo... | Use |
|---|---|
| É biblioteca, sem estado global, rápido | **libFuzzer** |
| Tem `exit()` ou estado global sujo | **AFL++** |
| É binário sem fonte | **AFL++ com QEMU** |
| Vai para OSS-Fuzz | **libFuzzer** (o padrão de lá) |
| Precisa de paralelismo máximo | **AFL++** |
| Você quer resultado em horas | **libFuzzer** |

⚠ **E a resposta mais comum na prática:** **use os dois.** O harness é o mesmo arquivo
(`LLVMFuzzerTestOneInput`); o corpus é compartilhado (mesmo formato de diretório); e o
AFL++ pode consumir harness de libFuzzer. **Rodar os dois no mesmo alvo é o que projeto maduro faz.**

---

## 7.5 LAB — Alvo pronto para fuzzing contínuo

**Duração:** 120 min

### Passo 1 — Estruture o projeto (30 min)

```bash
cd ~/fuzz-lab
mkdir -p projeto/{src,fuzz/corpus,tests,.github/workflows}

# Copie o alvo refatorado
cp alvos/parser_lib.c projeto/src/parser.c
cp harnesses/parser_harness.c projeto/fuzz/parser_fuzzer.c
cp corpus/parser/* projeto/fuzz/corpus/ 2>/dev/null

tree projeto/ 2>/dev/null || find projeto -type f | sort
```

Produza `estrutura.md` com a árvore e a justificativa de cada diretório.

**Responda:**

1. Por que o harness fica em `fuzz/` e não em `src/`?
2. Por que o corpus vai para o repositório (versionado)?
3. O que você **não** versiona, e por quê?

⚠ **A resposta 3 é importante:** você **não** versiona os crashes (são bug, resolvem-se), e **não**
versiona o corpus gerado pela campanha (é grande). Versione o **corpus de semente**.

### Passo 2 — Rode com as opções que importam (35 min)

```bash
cd ~/fuzz-lab/projeto

clang -g -O1 -fsanitize=fuzzer,address,undefined -fno-omit-frame-pointer \
      -o parser_fuzzer fuzz/parser_fuzzer.c src/parser.c

# Sessão com controle de tempo, memória e reprodutibilidade
./parser_fuzzer fuzz/corpus \
    -max_total_time=60 \
    -rss_limit_mb=2048 \
    -max_len=4096 \
    -seed=42 \
    -print_final_stats=1 2>&1 | tail -25
```

Produza `sessao.md`:

| Opção | Valor | Efeito observado |
|---|---|---|
| `-max_total_time` | 60 | |
| `-rss_limit_mb` | 2048 | |
| `-max_len` | 4096 | |
| `-seed` | 42 | |
| `-print_final_stats` | 1 | |

**Responda:**

1. **O `-seed=42` fez a execução ser reprodutível?** Rode duas vezes e compare.
2. O `-max_len=4096` limitou o tamanho? Como você verifica?
3. Se você omitisse `-rss_limit_mb`, o que poderia acontecer numa campanha longa?
4. **Qual opção você usaria para rodar 1 hora em 8 núcleos?** Escreva o comando.

⚠ **A resposta 1 é testável de verdade.** Com a mesma `-seed`, a sequência de entradas geradas deve
ser a mesma. Se não for, há fonte de aleatoriedade no alvo ou no harness — o que quebra
reprodutibilidade.

### Passo 3 — O workflow de CI (35 min)

```bash
cd ~/fuzz-lab/projeto

cat > .github/workflows/fuzz.yml <<'EOF'
name: fuzzing
on:
  push: { branches: [ main ] }
  pull_request:
  schedule:
    - cron: '0 3 * * *'

jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Instalar clang
        run: sudo apt-get update && sudo apt-get install -y clang llvm

      - name: Build
        run: |
          clang -g -O1 -fsanitize=fuzzer,address,undefined \
                -fno-omit-frame-pointer -o parser_fuzzer \
                fuzz/parser_fuzzer.c src/parser.c

      - name: Fuzzing
        run: |
          mkdir -p corpus-novo
          ./parser_fuzzer fuzz/corpus corpus-novo \
              -max_total_time=300 -rss_limit_mb=2048 -print_final_stats=1

      - name: Falhar se achou crash
        run: |
          if ls crash-* 2>/dev/null; then
              echo "⚠ CRASH ENCONTRADO"; ls -la crash-*; exit 1
          fi
          echo "✓ nenhum crash"
EOF

cat .github/workflows/fuzz.yml | head -10
echo "..."
```

⚠ **Não é possível rodar GitHub Actions localmente sem infraestrutura.** O que você pode fazer é
**simular** as três etapas do workflow localmente, exatamente como o CI faria:

```bash
cd ~/fuzz-lab/projeto

# Simule a etapa "Build"
clang -g -O1 -fsanitize=fuzzer,address,undefined -fno-omit-frame-pointer \
      -o parser_fuzzer fuzz/parser_fuzzer.c src/parser.c \
  && echo "✓ build OK"

# Simule a etapa "Fuzzing"
mkdir -p corpus-novo
./parser_fuzzer fuzz/corpus corpus-novo -max_total_time=20 -print_final_stats=1 \
    >/dev/null 2>&1 && echo "✓ fuzzing executou"

# Simule a etapa "Falhar se achou crash"
if ls crash-* 2>/dev/null; then
    echo "⚠ CRASH ENCONTRADO"; exit 1
else
    echo "✓ nenhum crash — CI passaria"
fi
```

Produza `ci.md`:

| Etapa do workflow | Comando local equivalente | Resultado |
|---|---|---|
| Build | | |
| Fuzzing | | |
| Falhar se achou crash | | |

**Responda:**

1. **Por que a última etapa é essencial?** O que acontece sem ela?
2. Por que o `schedule` com cron existe, se o CI já roda em cada push?
3. **Por que o corpus vai para `actions/upload-artifact`?** O que você faria com ele?
4. Se o fuzzer achasse um crash, o CI falharia — e o que você faria com o arquivo?

⚠ **A resposta 3 é o que torna o CI acumulativo.** O corpus gerado por cada execução é a memória do
fuzzing. Sem persistir, cada execução começa do zero — e você perde a vantagem de fuzzing contínuo.

### Passo 4 — Compare libFuzzer e AFL++ no mesmo harness (20 min)

```bash
cd ~/fuzz-lab/projeto

echo "═══ libFuzzer ═══"
timeout 60 ./parser_fuzzer fuzz/corpus -max_total_time=30 -print_final_stats=1 2>&1 | \
    grep -E 'exec/s|stat::average_exec_per_sec|stat::new_units' | tail -3

echo
echo "═══ AFL++ (mesmo harness, via afl_driver) ═══"
cd ~/fuzz-lab
AFL_USE_ASAN=1 afl-clang-fast -g -O1 -fno-omit-frame-pointer \
    -o alvos/parser_afl_driver \
    alvos/parser_lib.c harnesses/parser_harness.c \
    "$(afl-clang-fast -print-file-name=afl_driver.o)" 2>/dev/null && {
    timeout 60 afl-fuzz -i corpus/afl-final -o /tmp/f3 -- \
        ./alvos/parser_afl_driver 2>&1 | grep -oE 'exec speed.*' | head -1
} || echo "afl_driver indisponível — use o wrapper do módulo 6"
```

Produza `comparacao-fuzzers.md`:

| Fuzzer | Exec/s | Cobertura | Crashes | Robustez a crash |
|---|---|---|---|---|
| libFuzzer | | | | Morre |
| AFL++ | | | | Sobrevive |

**Responda:**

1. **Qual foi mais rápido?** Por quantas vezes?
2. O mesmo harness funcionou nos dois? **O que isso indica sobre a prática certa?**
3. Em qual cenário você escolheria o AFL++ **apesar da velocidade menor**?
4. **Se você pudesse rodar os dois em paralelo**, qual a vantagem?

### Critérios de aceitação

- Projeto estruturado em `src/`, `fuzz/`, `tests/`, `.github/workflows/`.
- `estrutura.md` com a justificativa de cada diretório, incluindo o que **não** versionar.
- `sessao.md` com as opções testadas, e a **reprodutibilidade do `-seed` verificada** rodando duas vezes.
- `.github/workflows/fuzz.yml` com as quatro etapas, **incluindo falhar-se-achar-crash**.
- `ci.md` com as três etapas **simuladas localmente** e o resultado real.
- Você explicou por que a etapa de falha é essencial.
- `comparacao-fuzzers.md` com os dois fuzzers medidos no **mesmo harness**.
- Você respondeu em qual cenário escolheria o AFL++ apesar da velocidade.

---

## Avaliação

1. Explique a diferença arquitetural entre libFuzzer e AFL++ no que diz respeito a processo.
2. Por que o libFuzzer é mais rápido? Qual o custo dessa velocidade?
3. Cite cinco opções do libFuzzer e o efeito de cada uma.
4. Para que serve `-fork=N`, e quando você precisa dele?
5. Por que testar um crash **cinco vezes** é obrigatório? O que é um crash flaky?
6. Por que o fuzzer e o alvo precisam das **mesmas** flags de sanitizer?
7. O que o `$LIB_FUZZING_ENGINE` faz no `build.sh` do OSS-Fuzz?
8. Por que o `primary_contact` do OSS-Fuzz é crítico na prática?
9. Cite os requisitos para entrar no OSS-Fuzz.
10. **Por que a etapa "falhar se achou crash" é o que dá valor ao CI?**
11. Por que o `schedule` com cron existe, se o push já dispara?
12. Por que persistir o corpus entre execuções de CI é o que torna o fuzzing acumulativo?
13. Compare libFuzzer e AFL++ em cinco dimensões. Quando escolher cada um?
14. Por que rodar os **dois** no mesmo alvo é a prática de projeto maduro?

---

**Próximo:** [Módulo 8 — Fuzzing de protocolo e estado](modulo-08.md)
