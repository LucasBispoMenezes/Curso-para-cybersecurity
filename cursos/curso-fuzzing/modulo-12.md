# Módulo 12 — Do Achado ao Reporte

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 11

---

## Objetivos

1. Escrever patch que corrige a **causa**, não o sintoma.
2. Escrever teste de regressão que **falha antes** e **passa depois**.
3. Aplicar hardening relacionado ao bug encontrado.
4. Escrever reporte que é aceito, com divulgação responsável.
5. Usar fuzzing *structure-aware* onde o fuzzer genérico não alcança.

---

## ⚠ Conduta e escopo

Alvo próprio. Se você reportar para projeto de código aberto, o procedimento de **divulgação
responsável** deste módulo se aplica — e ele é parte do conteúdo, não apêndice.

---

## 12.1 O patch — causa, não sintoma

⚠ **O erro mais comum em patch de vulnerabilidade é corrigir onde o programa morreu.**

```c
/* ⚠ PATCH ERRADO — corrige o sintoma (a linha do memcpy) */
for (int i = 0; i < c->num_itens; i++) {
    if (i * 8 + 8 > 64) break;              /* ← resolve ESTA entrada */
    memcpy(dest + i * 8, buf + sizeof(Cabecalho) + i * 8, 8);
}
```

⚠ **Por que está errado:** o `64` está **escrito na mão**. Se o `dest` mudar de tamanho, o patch
quebra. E o bug de origem — a **origem** sem verificação — continua ali.

```c
/* ✓ PATCH CERTO — corrige a causa (antes do laço) */
size_t disponivel = len - sizeof(Cabecalho);

/* verificação contra o limite da ORIGEM e do DESTINO */
if ((size_t)c->num_itens * 8 > disponivel)          return -1;
if ((size_t)c->num_itens * 8 > sizeof_dest)         return -1;

for (int i = 0; i < c->num_itens; i++) {
    memcpy(dest + i * 8, buf + sizeof(Cabecalho) + i * 8, 8);
}
```

⚠ **Três coisas fazem o patch certo ser certo:**

| Elemento | Por quê |
|---|---|
| **Verificação antes do laço** | Falha rápido, e o laço não roda com valor inválido |
| **Checa a origem E o destino** | Duas superfícies distintas — a entrada e o buffer |
| **`sizeof` em vez de literal** | Sobrevive à mudança de tamanho do buffer |

⚠ **E o cast `(size_t)` é obrigatório** — sem ele, a multiplicação em tipo menor pode estourar, e
você **reintroduz** o bug do módulo 3, classe 4. **É o erro mais comum em patch de segurança.**

---

## 12.2 O teste de regressão

⚠ **O teste que impede o bug de voltar.** E ele tem um requisito específico.

```
TESTE VÁLIDO                          TESTE INVÁLIDO
┌────────────────────────────┐       ┌────────────────────────────┐
│ roda no código COM bug     │       │ roda só no código corrigido│
│ → FALHA (esperado)         │       │ → passa                    │
│                            │       │                            │
│ roda no código corrigido   │       │ ⚠ não prova nada           │
│ → PASSA                    │       │                            │
└────────────────────────────┘       └────────────────────────────┘
```

```bash
cd ~/fuzz-lab
mkdir -p regressao && cd regressao

cat > test_bug01.sh <<'SCRIPT'
#!/usr/bin/env bash
# Regressão: heap-buffer-overflow em parse() com num_itens sem validação
set -uo pipefail

ENTRADA="${1:-entrada.bin}"
BIN_COM_BUG="${BIN_COM_BUG:-../causa-raiz/parser_debug}"
BIN_CORRIGIDO="${BIN_CORRIGIDO:-../causa-raiz/parser_fix}"

if [ ! -f "${ENTRADA}" ]; then
    echo "⚠ entrada não encontrada: ${ENTRADA}"; exit 2
fi

echo "═══ 1. O bug ainda existe no código antigo? ═══"
if "${BIN_COM_BUG}" "${ENTRADA}" >/dev/null 2>&1; then
    echo "  ⚠ NÃO falhou no código com bug — o teste não é válido"
    exit 1
fi
echo "  ✓ falha no código com bug (esperado)"

echo
echo "═══ 2. O código corrigido passa? ═══"
if "${BIN_CORRIGIDO}" "${ENTRADA}" >/dev/null 2>&1; then
    echo "  ✓ passa no código corrigido"
else
    echo "  ⚠ TAMBÉM falha no corrigido — a correção está incompleta"
    exit 1
fi

echo
echo "═══ 3. Entrada válida continua funcionando? ═══"
if "${BIN_CORRIGIDO}" ../corpus/parser/s1-minima >/dev/null 2>&1; then
    echo "  ✓ entrada válida aceita"
else
    echo "  ⚠ a correção quebrou o uso legítimo"
    exit 1
fi

echo
echo "✓ REGRESSÃO OK"
SCRIPT
chmod +x test_bug01.sh

cp ../causa-raiz/crash.bin entrada.bin
./test_bug01.sh entrada.bin
```

⚠ **O passo 1 é o que faz o teste ser regressão.** Você prova que a entrada **dispara** o bug no
código antigo. Sem isso, o teste só mostra que o código novo funciona — o que qualquer teste faria.

⚠ **E prepare para o CI:** o teste precisa rodar **automaticamente**.

```yaml
# .github/workflows/test.yml
name: testes
on: [push, pull_request]
jobs:
  regressao:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Instalar clang
        run: sudo apt-get update && sudo apt-get install -y clang
      - name: Compilar (com bug e corrigido)
        run: |
          clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
                -o parser_bug parser_lib.c parser_main.c
          clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
                -o parser_fix parser_lib_fix.c parser_main.c
      - name: Regressão
        run: ./regressao/test_bug01.sh regressao/entrada.bin
        env:
          BIN_COM_BUG: ./parser_bug
          BIN_CORRIGIDO: ./parser_fix
      - name: Fuzzing curto (assegura que não há regressão)
        run: |
          ./parser_fix ./fuzz/corpus -max_total_time=120 -rss_limit_mb=2048
```

⚠ **A etapa de fuzzing no CI é o complemento.** O teste de regressão garante que **aquele** bug não
voltou; o fuzzing garante que **nenhum** bug novo apareceu. **Os dois juntos.**

---

## 12.3 Hardening relacionado

⚠ **O bug é uma instância de uma classe.** Corrigir a instância é o mínimo; reduzir a classe é o
que project maduro faz.

| Hardening | O que reduz | Quando aplicar |
|---|---|---|
| **`-D_FORTIFY_SOURCE=2`** | Transbordo em funções conhecidas | **Sempre**, em build de produção |
| **`-fstack-protector-strong`** | Transbordo de stack | Build de produção |
| **`-fPIE -pie`** | Endereços fixos | Build de produção |
| **`-Wl,-z,relro,-z,now`** | Sobrescrita de GOT/PLT | Build de produção |
| **`-fsanitize=cfi`** | Type confusion | C++ com LTO |
| **`snprintf` / `strlcpy`** | `strcpy` sem limite | No código |
| **Revisar TODAS as cópias** | A classe toda | Na correção |

⚠ **A última linha é a mais importante e a menos feita.** Se você achou um `memcpy` sem verificação,
**procure os outros**:

```bash
cd ~/fuzz-lab

# Encontre todas as cópias sem limite no alvo
grep -nE '\b(strcpy|strcat|sprintf|memcpy|memmove|gets)\b' alvos/parser_lib.c

# Endereços de memória — em cada um, há verificação de limite antes?
grep -nB3 'memcpy' alvos/parser_lib.c
```

⚠ **A revisão frequentemente encontra irmãos do bug.** Um `memcpy` sem verificação raramente está
sozinho — quem escreveu aquele escreveu outros. **Reportar os irmãos junto é o que faz o patch ser
completo.**

```bash
# Flags de hardening recomendadas para o build
cat > hardening.mk <<'EOF'
# hardening de compilação — aplique no build de produção
CFLAGS += -D_FORTIFY_SOURCE=2 -fstack-protector-strong \
          -fPIE -fno-strict-aliasing -Wall -Wextra
LDFLAGS += -pie -Wl,-z,relro,-z,now
EOF
cat hardening.mk
```

⚠ **A linha `-fno-strict-aliasing` merece comentário.** Aliasing estrito é uma das fontes de
comportamento indefinido que o módulo 3 mencionou — e desligar é prática comum em código que faz
manipulação de memória crua.

---

## 12.4 O reporte

⚠ **O documento que decide se seu achado é corrigido.**

### Estrutura

```markdown
# [TIPO] em [função] ([componente]) — permite [consequência]

## Resumo
(2–3 frases: o que é, onde, e o que permite.)

## Impacto
- Tipo: heap-buffer-overflow (escrita)
- Vetor: arquivo malformado aberto pelo usuário
- Consequência: corrupção de heap; potencial de execução de código
- Severidade: ALTA

## Causa raiz
(Do módulo 11, no formato exato.)

## Reprodução
1. `./build.sh`
2. `./parser_asan entrada.bin`
3. Resultado esperado: `ERROR: AddressSanitizer: heap-buffer-overflow` em `parse()`

Anexos: `entrada.bin` (28 bytes), `relatorio-asan.txt`, `SHA256SUMS`

## Ambiente
- Versão/commit: `abc1234`
- clang 17.0.0, Linux x86-64
- ASan + UBSan, -O1

## Correção sugerida
```c
[o patch]
```

## O que NÃO foi testado
⚠ Obrigatório.
- Não testei explorabilidade além de confirmar que o endereço não é controlado.
- Não cobri os caminhos X, Y.
- O crash exige ASan? [sim/não]

## Divulgação
Solicito prazo de [90] dias antes de publicação, conforme prática comum.
```

### O que faz um reporte ser aceito

| Elemento | Peso | Por quê |
|---|---|---|
| **Reprodução em um comando** | **Alto** | Mantenedor precisa ver o bug em 30 s |
| **Causa raiz correta** | **Alto** | É o que ele precisa para corrigir |
| **Patch sugerido** | Médio | Acelera, mesmo se ele reescrever |
| **Impacto realista** | **Alto** | Inflar destrói credibilidade |
| **Anexos completos** | Alto | Sem entrada, não há bug |
| **Declaração do que não foi testado** | **Alto** | Prova honestidade |

⚠ **"Reprodução em um comando" é o que mais importa.** Se o mantenedor precisa ler cinco parágrafos
para entender onde clicar, a correção atrasa. **Um `./build.sh && ./parser_asan entrada.bin` resolve.**

### O que faz um reporte ser **rejeitado**

| Erro | Consequência |
|---|---|
| **Severidade inflada** | Credibilidade destruída no primeiro e-mail |
| **Causa raiz errada** | Ele corrige no lugar errado, e o bug volta |
| **Sem entrada anexada** | Irreproduzível |
| **"Crash só com ASan" não declarado** | Pode não ser bug em produção |
| **Reivindicar exploração não demonstrada** | Desonesto, e verificável |
| **Publicar antes do patch** | Quebra a confiança, e pode ser ilegal em alguns contextos |

⚠ **A quinta linha merece ênfase.** Dizer "permite execução de código" sem **ter demonstrado** é o
erro que mais destrói reputação de pesquisador. **O correto:** *"é escrita fora do limite em
região de heap; endereço não controlado pela entrada nesta configuração; o potencial de controle
não foi avaliado"*. **Preciso, verificável, e honesto.**

### Divulgação responsável

| Etapa | Prazo típico |
|---|---|
| Reportar em canal privado | dia 0 |
| Confirmação do recebimento | 0–7 dias |
| Correção pelo mantenedor | **até 90 dias** |
| Publicação do achado | após o patch, ou 90 dias |

⚠ **O canal privado importa.** Para projeto no GitHub, use **security advisory** ou o e-mail de
segurança — **não** abra uma issue pública. Issue pública = divulgação imediata = todos os usuários
expostos antes do patch.

⚠ **E 90 dias é convenção, não lei.** Projetos grandes (Google, Microsoft) têm prazos próprios. O
Project Zero usa **90 dias + 14 de cortesia**. Verifique a política do projeto alvo.

---

## 12.5 Quando o fuzzer não alcança — *structure-aware*

⚠ **O último recurso, e o que resolve os casos difíceis.**

| Barreira | Fuzzing puro resolve? | O que resolve |
|---|---|---|
| `magic` de string | Com dicionário | `-dict` |
| Campo com tamanho que precisa bater | **Não** | Harness corrige, ou grammar |
| Checksum | **Não** | Harness corrige |
| Formato profundamente aninhado | Mal | **Grammar-based** |
| Validação semântica complexa | **Não** | *Structure-aware* |
| Criptografia | **Não** | Nada — intratável |
| Compressão | Não | Desconstruir, ou grammar |

### O harness que corrige o campo

```c
/* structure-aware: o harness mantém o campo de tamanho consistente */
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    if (size < 16) return 0;
    if (size > 65536) return 0;

    uint8_t *copia = malloc(size);
    if (!copia) return 0;
    memcpy(copia, data, size);

    /* ⚠ o campo `tamanho` do cabeçalho (offset 8, 4 bytes) é SEMPRE
       recalculado a partir do real — assim o fuzzer muta o resto */
    uint32_t corpo = (uint32_t)(size - 12);
    memcpy(copia + 8, &corpo, 4);

    processar(copia, size);
    free(copia);
    return 0;
}
```

⚠ **Isso é prática estabelecida e documentada no OSS-Fuzz.** E tem a consequência que o módulo 5 já
mencionou: **o bug pode não ser alcançável com entrada real**, porque você contornou a verificação.
**Declarar isso é obrigatório.**

### Grammar-based com `libprotobuf-mutator`

```bash
# Se você quiser se aprofundar em grammar-based
echo "Referência: https://github.com/google/libprotobuf-mutator"
echo "Exemplo em Chromium: testing/libfuzzer/libprotobuf-mutator.md"
echo "ASN.1/DER: https://github.com/google/libprotobuf-mutator-asn1"
```

⚠ **Não há lab de `libprotobuf-mutator` neste curso** — ele exige modelar o formato em protobuf, o
que é trabalho de projeto, não de módulo. **O que o curso entrega é: você sabe quando precisa dele,
e sabe que existe.** Aplicar é trabalho de pesquisa (etapa 4 da trilha).

### Combinação com execução simbólica

⚠ **A ponte existe e está documentada:** o KLEE tem `ktest-gen`, que converte o corpus do AFL em
arquivos `.ktest` para explorar simbolicamente. O fluxo:

```
FUZZING achou caminho A, mas não atravessa a validação V
        │
        ▼
converte o corpus para .ktest (ktest-gen)
        │
        ▼
EXECUÇÃO SIMBÓLICA resolve V e mostra o input que passa
        │
        ▼
alimenta o fuzzer com a entrada nova
        │
        ▼
fuzzer agora atravessa V e explora o que há depois
```

⚠ **Isso é o estado da arte, e é área de pesquisa aberta** — o problema de escalar simbólica em
código real não está resolvido. **Saber que a ponte existe é o que separa quem lê sobre fuzzing de
quem entende o limite dele.**

---

## 12.6 LAB — Patch, regressão e reporte

**Duração:** 120 min

### Passo 1 — Escreva e prove o patch (35 min)

```bash
cd ~/fuzz-lab
mkdir -p entrega && cd entrega

cp ../alvos/parser_lib.c parser_lib.c

# ⚠ Escreva o patch você mesmo, no arquivo.
# A correção é na CAUSA (antes do laço), não no memcpy.
python3 - <<'PY'
import re
p = "parser_lib.c"
s = open(p).read()

# Insere a verificação ANTES do laço, checando origem E destino
padrao = r'(\n\s*)(for \(int i = 0; i < c->num_itens; i\+\+\) \{)'
guarda = (r'\1/* correção: valida contra a ORIGEM e contra o DESTINO */\n'
          r'\1if ((size_t)c->num_itens * 8 > (size_t)(len - sizeof(Cabecalho)))\n'
          r'\1    return -1;\n'
          r'\1if ((size_t)c->num_itens * 8 > dest_sz)\n'
          r'\1    return -1;\n'
          r'\1\2')

if "num_itens * 8 >" not in s:
    # variável de tamanho do destino
    s = s.replace("char *dest = malloc(64);",
                  "const size_t dest_sz = 64;\n    char *dest = malloc(dest_sz);", 1)
    s2 = re.sub(padrao, guarda, s, count=1)
    if s2 != s:
        open(p, "w").write(s2)
        print("patch aplicado")
    else:
        print("⚠ padrão do laço não encontrado — ajuste manualmente")
else:
    print("patch já presente")
PY

grep -n -A3 'i < c->num_itens' parser_lib.c | head -12
```

**Compile e prove:**

```bash
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o parser_fix parser_lib.c ../harnesses/parser_main.c \
  && echo "✓ compilou"

ENTRADA=../causa-raiz/crash.bin

echo
echo "═══ 1. A entrada do bug agora passa? ═══"
if ./parser_fix "${ENTRADA}" >/dev/null 2>&1; then
    echo "  ✓ corrigido — não crasha mais"
else
    echo "  ⚠ AINDA CRASHA — o patch está incompleto"
    ./parser_fix "${ENTRADA}" 2>&1 | head -6
fi

echo
echo "═══ 2. Entrada válida continua funcionando? ═══"
./parser_fix ../corpus/parser/s1-minima >/dev/null 2>&1 \
  && echo "  ✓ aceita entrada válida" \
  || echo "  ⚠ QUEBROU o uso legítimo"

echo
echo "═══ 3. O fuzzer achou algo novo depois do patch? ═══"
mkdir -p /tmp/pos-fix
timeout 60 ./parser_fix ../corpus/afl-final -max_total_time=30 \
    -print_final_stats=1 2>&1 | grep -E 'stat::|ERROR' | tail -5 || \
    echo "  (o binário é um main, não um harness libFuzzer — use o astar fuzzer)"
```

⚠ **Se o passo 3 não rodar** (porque o `parser_fix` é um `main` e não harness libFuzzer), compile a
versão com harness:

```bash
clang -g -O1 -fsanitize=fuzzer,address,undefined -fno-omit-frame-pointer \
      -o parser_fix_fuzz parser_lib.c ../harnesses/parser_harness.c
timeout 60 ./parser_fix_fuzz ../corpus/afl-final -max_total_time=30 \
    -print_final_stats=1 2>&1 | grep -E 'stat::|ERROR' | tail -6
```

Produza `patch.md`:

| Teste | Resultado | O que prova |
|---|---|---|
| Compila | | |
| Bug resolvido | | |
| Uso legítimo preservado | | |
| Fuzzing pós-patch sem crash novo | | |

**Responda:**

1. Seu patch é na **causa** ou no **sintoma**? Onde exatamente está a linha inserida?
2. Ele checa a **origem** e o **destino**? Por que os dois?
3. Você usou cast `(size_t)`? **Teste removendo o cast** e veja se o comportament muda.
4. Rode o fuzzer 30 s pós-patch: **achou algo novo?** Isso é bom ou ruim?

⚠ **A resposta 4 é a que mais surpreende.** Se o fuzzer achar **outro** bug após o patch, isso é
**ótimo** — significa que seu patch resolveu uma instância e o alvo tem mais. É o sinal de que o
trabalho continua.

### Passo 2 — Revisão de irmãos (25 min)

⚠ **Procure os outros bugs da mesma classe no alvo.**

```bash
cd ~/fuzz-lab/entrega

echo "═══ Cópias sem limite no alvo ═══"
grep -nE '\b(strcpy|strcat|sprintf|memcpy|memmove|gets|alloca)\b' parser_lib.c

echo
echo "═══ Contexto de cada uma ═══"
grep -nB4 'memcpy\|strcpy' parser_lib.c | head -30
```

Produza `irmaos.md`:

| Linha | Função usada | Há verificação antes? | Mesma classe? | Já corrigida? |
|---|---|---|---|---|
| | | | | |

**Responda:**

1. **Quantas cópias sem limite** existem no alvo?
2. Todas estão protegidas **depois** do seu patch? Se não, quais faltam?
3. Você **reportaria os irmãos** junto? Por quê?
4. **Por que um `memcpy` sem verificação raramente está sozinho?**

⚠ **A resposta 4 é o padrão real.** Quem escreveu uma cópia sem limite tende a escrever outras. **É
por isso que a revisão de irmãos é parte do patch, não trabalho extra.**

### Passo 3 — Teste de regressão (30 min)

```bash
cd ~/fuzz-lab/regressao

cat > test_bug01.sh <<'SCRIPT'
#!/usr/bin/env bash
# Regressão para heap-buffer-overflow em parse()
set -uo pipefail

ENTRADA="${1:-entrada.bin}"
BIN_BUG="${BIN_BUG:-../causa-raiz/parser_debug}"
BIN_FIX="${BIN_FIX:-../entrega/parser_fix}"

falhou() { echo "  ⚠ $1"; exit 1; }

echo "═══ 1. O bug existe no código ANTIGO? ═══"
"${BIN_BUG}" "${ENTRADA}" >/dev/null 2>&1 \
  && falhou "não falhou no código com bug — teste INVÁLIDO" \
  || echo "  ✓ falha no código com bug"

echo "═══ 2. O código CORRIGIDO passa? ═══"
"${BIN_FIX}" "${ENTRADA}" >/dev/null 2>&1 \
  && echo "  ✓ passa no corrigido" \
  || falhou "também falha no corrigido — correção incompleta"

echo "═══ 3. Entrada válida continua OK? ═══"
"${BIN_FIX}" ../corpus/parser/s1-minima >/dev/null 2>&1 \
  && echo "  ✓ entrada válida aceita" \
  || falhou "correção quebrou o uso legítimo"

echo
echo "✓ REGRESSÃO OK"
SCRIPT
chmod +x test_bug01.sh

[ -f entrada.bin ] || cp ../causa-raiz/crash.bin entrada.bin
./test_bug01.sh entrada.bin
```

Produza `regressao.md`:

| Teste do script | Resultado | O que prova |
|---|---|---|
| 1. Bug no código antigo | | |
| 2. Passa no corrigido | | |
| 3. Uso legítimo | | |

**Responda:**

1. **Por que o teste 1 é o que faz o script ser "regressão"?** O que ele prova que os outros não?
2. Se você removesse o teste 1, o script ainda teria valor? Qual?
3. Escreva a etapa do **CI** que roda este teste.
4. Por que o CI também precisa rodar **fuzzing curto**, além da regressão?

### Passo 4 — O reporte (30 min)

Produza `reporte.md` com as **oito** seções do §12.4.

Requisitos:

| Seção | Mínimo |
|---|---|
| Resumo | 2–3 frases |
| Impacto | Tipo, vetor, consequência, severidade |
| **Causa raiz** | Do módulo 11, no formato exato |
| **Reprodução** | Passo a passo, com o comando |
| Ambiente | Versão/commit, clang, flags |
| Correção sugerida | O patch |
| **O que NÃO foi testado** | **4 itens** |
| Divulgação | Prazo solicitado |

⚠ **A seção "O que NÃO foi testado" é obrigatória e precisa incluir:**

- se o crash exige ASan
- se o endereço é controlado pela entrada
- quais caminhos não foram cobertos
- se a exploração foi avaliada (e a resposta é: **não foi, e você declara**)

**Depois, faça o teste de aceitação:**

| Critério | Atendido? |
|---|---|
| Reprodução em **um comando**? | |
| Causa raiz **nomeia** função, linha, variável, limite? | |
| Impacto **realista** (sem inflar)? | |
| Entrada **anexada** com hash? | |
| Declara o que **não** foi testado? | |
| **Nenhuma reivindicação de exploração não demonstrada?** | |

⚠ **A última linha é a que mais importa.** Escreva o impacto assim:

> "Escrita fora do limite em região de heap, com tamanho controlado pela entrada.
> **O endereço de destino não é controlado pela entrada nesta configuração.** O
> potencial de execução de código **não foi avaliado** — avaliar exige análise
> específica deste alvo, fora do escopo deste reporte."

⚠ **Isso não enfraquece o reporte. Fortalece.** O mantenedor confia em quem declara limite — e
prioriza quem exagera por último.

### Critérios de aceitação

- Patch aplicado **na causa** (antes do laço), checando **origem e destino**.
- Cast `(size_t)` presente, e você testou a versão sem ele.
- Fuzzing pós-patch rodado: **achou algo novo?** A resposta está registrada.
- `irmaos.md` com a revisão das cópias sem limite do alvo.
- `test_bug01.sh` com os **três** testes, incluindo o teste 1 (bug no código antigo).
- `regressao.md` explicando por que o teste 1 é o que faz ser regressão.
- `reporte.md` com as oito seções e **quatro itens** em "não foi testado".
- **Nenhuma reivindicação de exploração não demonstrada** — declarado explicitamente.

---

## Avaliação

1. Por que corrigir o `memcpy` é patch errado? O que o patch certo faz de diferente?
2. Por que o patch precisa checar **origem e destino**?
3. Por que `sizeof` em vez de literal `64`?
4. Por que o cast `(size_t)` é obrigatório na verificação de tamanho?
5. O que faz um teste de regressão ser **válido**? O que ele precisa provar?
6. Por que o CI precisa de regressão **e** fuzzing curto? O que cada um cobre?
7. Cite quatro flags de hardening e o que cada uma reduz.
8. Por que revisar os "irmãos" do bug é parte do patch e não trabalho extra?
9. Cite cinco elementos que fazem um reporte ser **aceito**, em ordem de peso.
10. Cite quatro erros que fazem um reporte ser **rejeitado**.
11. **Por que reivindicar exploração não demonstrada destrói credibilidade?** O que escrever em vez?
12. Explique o procedimento de divulgação responsável em quatro etapas e prazos.
13. Por que issue pública é o canal errado?
14. Cite quatro barreiras que o fuzzing puro não atravessa. O que resolve cada uma?
15. O que você **precisa declarar** quando o harness corrige um checksum?
16. Descreva o fluxo de combinação entre fuzzing e execução simbólica.

---

## Encerramento do curso

Você começou sem saber por que um buffer transborda e termina com um achado reproduzível, com causa
raiz provada, patch na causa, regressão, e reporte que um mantenedor consegue usar.

O que você aprendeu não foi uma lista de comando de fuzzer. Foi **um método** — escrever harness que
alcança o código, construir corpus que chega perto do bug, triagem 500 crashes em 4 bugs, minimizar
preservando a propriedade, rastrear a causa até a linha que deveria ter a verificação.

E as coisas que o curso tentou te deixar, em ordem de importância:

| # | O que fica |
|---|---|
| 1 | **Quando o fuzzer não acha, o harness tem a culpa em 8 de 10 casos.** |
| 2 | **O corpus decide o resultado** — e colocar a semente perto do bug é a técnica mais eficaz. |
| 3 | **Sintoma não é causa.** Corrigir onde morreu não resolve. |
| 4 | **Um relatório de triagem sem "o que não foi triado" é incompleto.** |
| 5 | **A distinção entre "crash de DoS" e "crash com potencial de controle" é o que faz seu reporte valer.** |

⚠ **A nota final.** Você agora sabe encontrar falha e explicar por que ela importa. Isso serve para
corrigir software, reportar com honestidade, e tornar software melhor. **A skill que separa você da
ferramenta é saber por que ela falhou** — e é exatamente isso que você treinou doze vezes.

Referências para continuar: **Fuzzing101** · **AFL++ "Fuzzing in Depth"** ·
**libFuzzer documentation** · **OSS-Fuzz** · **libprotobuf-mutator** · **KLEE e `ktest-gen`** ·
**angr** · **Project Zero RCAs** · **OpenSecurityTraining2 `Vulns1001`/`Vulns1002`** ·
**pwn.college CSE 466**
