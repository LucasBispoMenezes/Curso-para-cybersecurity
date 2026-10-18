# Módulo 4 — Harness: a Peça que Decide Tudo

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Escrever um harness `LLVMFuzzerTestOneInput` correto.
2. Adaptar alvo que lê de arquivo, de `stdin` e de argumento.
3. Lidar com estado global, alocação por chamada e vazamento acumulado.
4. Entender por que o harness errado faz o fuzzer "não achar nada".
5. Medir a velocidade de execução e diagnosticar harness lento.

---

## ⚠ Conduta

Alvo próprio, compilado por você. Nada de fuzzing contra terceiro.

---

## 4.1 O que é um harness, e por que ele é o gargalo

O **harness** é a função que o fuzzer chama para cada entrada. Ele conecta o fuzzer ao alvo.

```
┌──────────────┐        ┌──────────────────────┐        ┌──────────────┐
│  FUZZER      │        │  HARNESS             │        │  ALVO        │
│  (AFL/libFuzz)│──────▶│  recebe bytes brutos │──────▶│  parser,     │
│  gera entrada │──▶     │  prepara o estado    │        │  decodificador│
└──────────────┘   ◀────│  chama o alvo        │   ◀────│              │
                        │  limpa o estado      │        └──────────────┘
                        └──────────────────────┘
```

⚠ **A tese do módulo:** quando um fuzzer "não acha nada" em um alvo que tem bug, **a causa é o
harness em 8 de cada 10 casos.** Não é a ferramenta. Não é o alvo. É a ponte entre os dois.

### Os cinco erros de harness que matam a campanha

| # | Erro | Efeito | Sintoma |
|---|---|---|---|
| 1 | **Não chama o alvo** | Fuzzer exercita nada | 0 crashes, cobertura baixa |
| 2 | **Ignora parte da entrada** | Metade do parser não é alcançada | Cobertura estagnada |
| 3 | **Estado não reinicializado** | Entrada N depende de N-1 | Crash não reprodutível |
| 4 | **Vaza memória por chamada** | OOM em minutos | Fuzzer morre com "out of memory" |
| 5 | **Lento (I/O por chamada)** | Poucas execuções/seg | Campanha improdutiva |

⚠ **O erro 3 é o mais insidioso.** Se você não reinicializa, o fuzzer acha crash que **não
reproduz** ao rodar a entrada sozinha. Você perde horas investigando um bug que é do seu harness.

---

## 4.2 O harness canônico

```bash
cd ~/fuzz-lab
mkdir -p harnesses

cat > harnesses/parser_harness.c <<'EOF'
/*
 * harness para alvos/parser.c
 * Compile junto com o alvo, sem o main() dele.
 */
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>

/* a função do alvo, declarada ou incluída */
int parse(const uint8_t *buf, size_t len, char **saida);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    /* 1. GUARDA: entrada absurdamente pequena não exercita nada */
    if (size < 12) return 0;

    /* 2. LIMITE: evita entrada gigante que só consome tempo */
    if (size > 64 * 1024) return 0;

    char *saida = NULL;

    /* 3. CHAMA O ALVO — uma vez, com a entrada bruta */
    (void)parse(data, size, &saida);

    /* 4. LIBERA — ⚠ o alvo pode ter alocado */
    free(saida);

    /* 5. RETORNA SEMPRE 0 — o "valor de retorno" é ignorado;
          o que importa é o crash */
    return 0;
}
EOF
```

### As cinco regras, uma por uma

| Regra | Por quê |
|---|---|
| **Guarda de tamanho mínimo** | Entrada de 1 byte não chega ao código que importa |
| **Limite de tamanho máximo** | Sem isso, o fuzzer gera 1 MB e você perde tempo |
| **Chamar o alvo com o dado bruto** | Não transformar antes de chamar — deixe o alvo decidir |
| **Liberar o que o alvo alocou** | Senão, vaza por chamada |
| **`return 0` sempre** | Crash é sinalizado pelo **sinal**, não pelo retorno |

⚠ **A regra do limite máximo é subestimada.** Um fuzzer sem limite gera entrada de 10 MB, o parser
gasta 2 segundos processando, e você faz 0,5 execução/segundo em vez de 5.000. **O `if (size >
LIMITE) return 0;` multiplica a produtividade da campanha.**

⚠ **E a regra de "não transformar antes de chamar" é contraintuitiva.** Você **não** deve
pré-processar a entrada. Se o alvo espera `magic` de 4 bytes, **não** injete o magic no harness —
coloque no **corpus** (módulo 5). O harness passa bytes brutos; o fuzzer aprende o magic.

---

## 4.3 Adaptando cada tipo de alvo

Alvo não nasce com `LLVMFuzzerTestOneInput`. Você adapta.

### Alvo que lê de arquivo

```c
/* ANTES: lê de arquivo */
int main(int argc, char **argv) {
    FILE *f = fopen(argv[1], "rb");
    ...
}

/* DEPOIS: harness que escreve num arquivo temporário (⚠ último recurso) */
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    FILE *f = fopen("/tmp/fuzz-entrada", "wb");
    if (!f) return 0;
    fwrite(data, 1, size, f);
    fclose(f);

    /* chama o código que processa o arquivo */
    processar_arquivo("/tmp/fuzz-entrada");
    return 0;
}
```

⚠ **Escrever arquivo por chamada é o harness mais lento que existe.** Faça só quando não houver
alternativa. O correto é **refatorar o alvo** para aceitar buffer em memória.

### O refactor que vale a pena

```c
/* alvo original tinha: parse_de_arquivo(const char *caminho)  */
/* você separa a lógica:  */

int parse_de_buffer(const uint8_t *buf, size_t len, char **saida);   /* ← fuzzable, rápido */
int parse_de_arquivo(const char *caminho);                            /* ← wrapper fino */
```

⚠ **Este refactor é contribuição real ao projeto.** Todo alvo de código aberto que entra no
OSS-Fuzz passou por ele. **Fazer isso em projeto real é uma das formas mais diretas de contribuir
com segurança** — e é exatamente o tipo de trabalho que o curso prepara.

### Alvo que lê de `stdin`

```c
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    /* não leia de stdin no harness — injete a entrada diretamente */
    return processar_buffer(data, size);
}
```

⚠ **Nunca use `stdin` dentro do harness.** O fuzzer precisa controlar a entrada; `stdin` quebra
o modelo in-process.

### Alvo com estado global

```c
/* ⚠ ESTADO GLOBAL — precisa ser reinicializado a cada chamada */
static Contexto ctx;

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    /* 1. REINICIALIZA o estado global */
    memset(&ctx, 0, sizeof(ctx));
    ctx.inicializado = 0;                    /* ⚠ esquecer isto = crash irreal */

    /* 2. chama */
    processar(&ctx, data, size);

    /* 3. LIMPA o que o alvo alocou dentro do contexto */
    if (ctx.buffer) { free(ctx.buffer); ctx.buffer = NULL; }
    return 0;
}
```

⚠ **Se você esquecer o passo 1, o crash que você achar não vai reproduzir.** O teste é simples:
rode a entrada achada **sozinha** e veja se o crash acontece. Se não acontecer, seu harness tem
estado residual — e você perdeu a campanha.

---

## 4.4 Medindo o harness

⚠ **A métrica que diz se o harness vale.**

```bash
cat > harnesses/bench_harness.sh <<'SCRIPT'
#!/usr/bin/env bash
# Mede execuções/segundo do harness
set -uo pipefail
BIN="${1:?informe o binário com harness}"
N="${N:-2000}"

inicio=$(date +%s.%N)
for i in $(seq 1 "${N}"); do
    "${BIN}" corpus/valido.bin >/dev/null 2>&1 || true
done
fim=$(date +%s.%N)
dur=$(echo "${fim} - ${inicio}" | bc)
printf '%s: %s execuções em %.2fs → %.0f exec/s\n' \
    "$(basename "${BIN}")" "${N}" "${dur}" "$(echo "${N} / ${dur}" | bc)"
SCRIPT
chmod +x harnesses/bench_harness.sh
```

⚠ **Mas o harness de verdade não roda como processo separado.** O `libFuzzer` roda **in-process** —
sem `fork`, sem `exec` — e é por isso que faz **20.000+ exec/s** onde o `afl-fuzz` com fork faz
1.000. **Esse é o motivo pelo qual o harness in-process é o padrão do OSS-Fuzz.**

### Os três níveis de velocidade

| Modo | Exec/s típico | Por quê |
|---|---|---|
| Processo por entrada (`afl-fuzz` clássico) | 500–2.000 | `fork` + `exec` por teste |
| Fork server | 5.000–20.000 | `fork` só, sem `exec` |
| **In-process (libFuzzer, AFL persistent)** | **50.000–500.000** | Sem `fork` nenhum |

⚠ **A diferença entre 1.000 e 100.000 exec/s é a diferença entre uma campanha de semanas e uma de
horas.** É por isso que o módulo 6 trata do *persistent mode* — é o maior ganho de produtividade
que existe em fuzzing.

---

## 4.5 Quando o harness não é o problema

⚠ **Honestidade:** nem sempre o harness é a causa.

| Se o fuzzer não acha e... | A causa provável é |
|---|---|
| Cobertura sobe e estagna em 20% | **Corpus** ruim (módulo 5) |
| Cobertura não sobe desde o início | **Harness** não chama o alvo |
| Atinge 100% de cobertura e não acha | O bug está em **outro caminho**, ou é **lógico** |
| Exec/s muito baixo | **Harness lento** |
| Crash que não reproduz | **Estado residual** no harness |
| Sem sinal de vida | Alvo **não tem bug** — ou você não o instrumentou |

⚠ **A última linha é a mais importante e a menos considerada.** Às vezes o alvo não tem bug. Fuzzing
não garante achado — e **saber dizer "não achei" com evidência** (cobertura alta, tempo suficiente,
corpus bom) é competência, não fracasso. O módulo 9 trata disso.

---

## 4.6 LAB — Harness para o seu alvo

**Duração:** 150 min

### Passo 1 — Refatore o alvo (40 min)

⚠ **O alvo do módulo 1 precisa ser refatorado para ser fuzzável.**

```bash
cd ~/fuzz-lab
mkdir -p alvos

cat > alvos/parser_lib.c <<'EOF'
/* parser refatorado — sem main, aceita buffer em memória */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct {
    uint8_t  magic[4];
    uint16_t versao;
    uint16_t num_itens;
    uint32_t tamanho;
} Cabecalho;

/* ⚠ bugs preservados de propósito, para o fuzzer achar */
int parse(const uint8_t *buf, size_t len, char **saida) {
    if (saida) *saida = NULL;
    if (len < sizeof(Cabecalho)) return -1;

    const Cabecalho *c = (const Cabecalho *)buf;
    if (memcmp(c->magic, "FMT1", 4) != 0) return -1;

    char *dest = malloc(64);
    if (!dest) return -1;

    /* ⚠ BUG 1: num_itens não validado contra len */
    /* ⚠ BUG 2: escreve além dos 64 bytes de dest */
    for (int i = 0; i < c->num_itens; i++) {
        memcpy(dest + i * 8, buf + sizeof(Cabecalho) + i * 8, 8);
    }
    if (saida) *saida = dest; else free(dest);
    return 0;
}
EOF
```

⚠ **Note que a assinatura mudou:** o alvo agora recebe buffer e tamanho. Isso é o refactor — e ele
é o que torna o alvo fuzzável em 100.000 exec/s.

**Produza `refactor.md`:**

| Antes | Depois | Ganho |
|---|---|---|
| `main` lê arquivo | função aceita buffer | Sem I/O por chamada |
| — | `saida` opcional | Harness controla alocação |
| — | `len` explícito | Fuzzer controla tamanho |

### Passo 2 — Escreva o harness (40 min)

```bash
cat > harnesses/parser_harness.c <<'EOF'
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>

int parse(const uint8_t *buf, size_t len, char **saida);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    if (size < 12)     return 0;      /* pequeno demais p/ o cabeçalho */
    if (size > 65536)  return 0;      /* limite de tempo */

    char *saida = NULL;
    (void)parse(data, size, &saida);
    free(saida);                      /* o alvo pode ter alocado */
    return 0;
}
EOF

# Compile com libFuzzer + ASan + UBSan
clang -g -O1 -fsanitize=fuzzer,address,undefined -fno-omit-frame-pointer \
      -o harnesses/parser_fuzz \
      alvos/parser_lib.c harnesses/parser_harness.c
```

### Passo 3 — Rode e leia o diagnóstico do fuzzer (40 min)

```bash
mkdir -p corpus/parser && cp corpus/valido.bin corpus/parser/seed 2>/dev/null || true

# Sessão curta, para ver o comportamento
./harnesses/parser_fuzz corpus/parser -max_total_time=60 -print_final_stats=1
```

**A saída do libFuzzer tem campos que você precisa ler:**

```
INFO: Running with entropic power schedule (0x2, DF=100, seed=0)
INFO: Seed: 1234567890
INFO: Loaded 1 modules   (412 inline 8-bit counters): 412 [0x..., 0x...)
INFO: Loaded 1 PC tables (412 PCs): 412 [0x...,0x...)
INFO:        1 files found in corpus/parser
INFO: -max_len is not provided; libFuzzer will not generate inputs larger than 4096 bytes
INFO: seed corpus: files: 1 min: 28b max: 28b total: 28b rss: 32Mb
#2      INITED cov: 38 ft: 39 corp: 1/28b exec/s: 0 rss: 40Mb
#1024   NEW    cov: 52 ft: 60 corp: 3/94b exec/s: 1024 rss: 45Mb
...
#[fim]
stat::number_of_executed_units: 60000
stat::average_exec_per_sec:     1000
stat::new_units_added:          14
stat::slowest_unit_time_sec:    0
```

Produza `harness-diag.md`:

| Campo da saída | Valor no seu caso | O que significa |
|---|---|---|
| `Loaded 1 modules (N counters)` | | Pontos instrumentados |
| `seed corpus` | | Sementes iniciais |
| `INITED cov:` | | Cobertura inicial (borda) |
| `cov:` final | | Cobertura final |
| `corp:` final | | Tamanho do corpus |
| `exec/s` | | **Velocidade** |
| `new_units_added` | | Quantas entradas novas |

**Responda:**

1. Quantas execuções por segundo você obteve? **Bate com o esperado para in-process?**
2. A cobertura **subiu** durante a sessão? Se estagnou, em que valor?
3. O fuzzer achou algum crash em 60 segundos? Se sim, ótimo — se não, **por quê?**
4. **Se a cobertura não subiu nada desde `INITED`,** o que isso indica sobre o harness?

⚠ **A resposta 4 é o teste do módulo.** Cobertura que não sobe desde o início = o harness não está
alcançando o alvo. É o erro nº 1 da tabela do §4.1.

### Passo 4 — Compare harness bom vs. harness ruim (30 min)

⚠ **O experimento que prova a tese do módulo.**

```bash
# HARNESS RUIM 1: não chama o alvo
cat > harnesses/ruim1.c <<'EOF'
#include <stdint.h>
#include <stddef.h>
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    (void)data; (void)size;
    return 0;                     /* ⚠ não faz NADA */
}
EOF

# HARNESS RUIM 2: guarda de tamanho que exclui tudo
cat > harnesses/ruim2.c <<'EOF'
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
int parse(const uint8_t *buf, size_t len, char **saida);
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    if (size < 100000) return 0;  /* ⚠ nunca passa */
    char *s = NULL; (void)parse(data, size, &s); free(s);
    return 0;
}
EOF

clang -g -O1 -fsanitize=fuzzer,address -o harnesses/ruim1 alvos/parser_lib.c harnesses/ruim1.c
clang -g -O1 -fsanitize=fuzzer,address -o harnesses/ruim2 alvos/parser_lib.c harnesses/ruim2.c

for h in parser_fuzz ruim1 ruim2; do
    echo "══════ ${h} ══════"
    timeout 30 ./harnesses/${h} corpus/parser -max_total_time=20 \
      -print_final_stats=1 2>&1 | grep -E 'INITED|cov:|exec/s|new_units' | head -5
    echo
done
```

Produza `comparacao-harness.md`:

| Harness | Cobertura inicial | Cobertura final | Exec/s | Crasha? | Diagnóstico |
|---|---|---|---|---|---|
| `parser_fuzz` (bom) | | | | | |
| `ruim1` (não chama) | | | | | |
| `ruim2` (guarda impossível) | | | | | |

**Responda:**

1. O `ruim1` mostrou cobertura? **Por que não?**
2. O `ruim2` teve cobertura **igual** ao bom ou diferente? O que a diferença diz?
3. **Como você diagnostica "harness que não chama o alvo" olhando só a saída do fuzzer?**
4. Qual dos dois harness ruins é **mais perigoso** — o que não faz nada, ou o que exclui entradas?
   Por quê?

⚠ **A resposta 4 é sutil:** o `ruim1` é óbvio (cobertura zero). O `ruim2` **parece** funcionar
(compila, roda, tem cobertura), mas exclui o caminho do bug. **O harness que "parece funcionar" é o
que custa dias** — porque você não desconfia dele.

### Critérios de aceitação

- `alvos/parser_lib.c` refatorado, com os dois bugs preservados.
- `harnesses/parser_harness.c` com as cinco regras (guarda, limite, chamada, free, return).
- Harness compilando com `-fsanitize=fuzzer,address,undefined`.
- `harness-diag.md` com os campos da **saída real** e a velocidade medida.
- Você identificou se a cobertura subiu, e explicou o que significa se não subiu.
- `comparacao-harness.md` com os três harnesses medidos.
- Você explicou por que o harness "que parece funcionar" é mais perigoso que o obviamente quebrado.
- `refactor.md` explicando a mudança de assinatura e o ganho dela.

---

## Avaliação

1. O que é um harness, e por que ele é o gargalo na maioria dos casos?
2. Cite os cinco erros de harness e o sintoma de cada um.
3. Por que o erro de "estado não reinicializado" é o mais insidioso? Como você o detecta?
4. Por que o harness **não** deve pré-processar a entrada? Onde o `magic` deve ficar?
5. Por que a guarda de tamanho **máximo** multiplica a produtividade?
6. Por que escrever arquivo por chamada é o harness mais lento?
7. Explique o refactor que separa `parse_de_buffer` de `parse_de_arquivo`. Por que ele é
   contribuição real ao projeto?
8. Compare os três níveis de velocidade (processo, fork server, in-process) e explique a diferença.
9. Um fuzzer roda 60 s e a cobertura não sobe desde `INITED`. Qual a causa provável?
10. Um crash achado **não reproduz** quando rodado sozinho. Qual a causa provável?
11. Um alvo atinge 100% de cobertura e nenhum crash. Cite três explicações possíveis.
12. Por que "não achei nada" pode ser resultado legítimo? O que sustenta essa afirmação?
13. Por que o harness que "parece funcionar" custa mais dias que o obviamente quebrado?

---

**Próximo:** [Módulo 5 — Corpus, semente e dicionário](modulo-05.md)
