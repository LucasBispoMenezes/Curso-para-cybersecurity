# Módulo 2 — Ambiente e Sanitizers

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Compilar alvo instrumentado com ASan, UBSan, TSan e LSan, e saber quando usar cada um.
2. **Ler** o relatório do ASan: o que cada campo significa.
3. Reconhecer o que a instrumentação muda no comportamento do programa.
4. Entender por que o `-O1` é o ponto doce do fuzzing.
5. Medir o custo de cada sanitizer para decidir o que usar em campanha longa.

---

## ⚠ Conduta

Todo alvo é seu, compilado por você, rodando local. Nada muda do módulo 1.

---

## 2.1 Por que sanitizer, e por que ele muda tudo

Um transbordo silencioso (módulo 1) pode passar meses sem ser notado. O **sanitizer** transforma
comportamento indefinido em **falha ruidosa e diagnosticada**.

```
SEM SANITIZER                          COM ASAN
┌──────────────────────────┐          ┌──────────────────────────┐
│ strcpy passa do limite   │          │ ASan intercepta cada     │
│ corrompe variável vizinha│          │ acesso à memória         │
│ programa segue           │          │ vê: fora do bloco alocado│
│ ninguém descobre         │          │ ABORTA com relatório     │
└──────────────────────────┘          └──────────────────────────┘
     "funciona"                            "heap-buffer-overflow
                                            na linha 23"
```

⚠ **A consequência para fuzzing é direta:** sem sanitizer, o fuzzer só acha o que **crasha**. Com
sanitizer, ele acha o que **corrompe**. São conjuntos muito diferentes — e o segundo é bem maior.

⚠ **E o inverso também vale, e é o erro comum:** o sanitizer **não** acha tudo. Ele acha o que
**ele sabe detectar**. Um bug lógico (autenticação furada) não é detectável por sanitizer. Fuzzing
com sanitizer acha **corrupção de memória** — não substitui análise de lógica.

---

## 2.2 Os quatro sanitizers do curso

| Sanitizer | Flag | O que detecta | Custo | Quando usar |
|---|---|---|---|---|
| **ASan** | `-fsanitize=address` | Heap/stack overflow, use-after-free, double-free | ~2× lento, 3× memória | **Sempre.** Padrão do curso |
| **UBSan** | `-fsanitize=undefined` | Integer overflow, shift inválido, alinhamento, `null` | Baixo | **Sempre, junto com ASan** |
| **TSan** | `-fsanitize=thread` | Race condition | Alto | Só quando o alvo é multithread |
| **LSan** | Incluído no ASan | Vazamento de memória | Baixo | Padrão; útil em alvo de longa duração |
| **MSan** | `-fsanitize=memory` | Uso de memória não inicializada | Alto | Requer instrumentação total; avançado |

⚠ **TSan e ASan são mutuamente exclusivos** — não dá para compilar com os dois. Escolha: ASan para
corrupção, TSan para concorrência.

⚠ **UBSan é o mais subestimado da lista.** Ele pega integer overflow — que **não** é detectado por
ASan, e que é classe de bug frequente e explorável. **Ligue os dois juntos:**

```bash
CFLAGS="-g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer"
```

### Por que `-O1` e não `-O0` ou `-O2`

| Otimização | Efeito no fuzzing |
|---|---|
| `-O0` | Fiel ao fonte, mas **lento** e pode esconder bugs de otimização |
| **`-O1`** | **Ponto doce:** rápido, instrumentação funciona, bugs ainda visíveis |
| `-O2` | Mais rápido, mas pode **otimizar o bug para longe** — ou **criar** um |
| `-O3` | Ainda mais agressivo |

⚠ **O `-O2` pode eliminar o bug.** Um `if` que o compilador prova ser sempre verdadeiro some, e a
corrupção junto. **Isso não é o compilador "consertando" o bug** — é o compilador tirando proveito
de comportamento indefinido, que o C permite. Módulo 3 aprofunda.

⚠ **`-fno-omit-frame-pointer` é obrigatório** para o `gdb` conseguir andar pela pilha depois. Sem
ele, o backtrace do módulo 11 fica inútil.

---

## 2.3 Lendo o relatório do ASan

O relatório é a **peça mais importante** do curso. Ele diz tipo, local e contexto.

```bash
cd ~/fuzz-lab

# Compile o parser com ASan + UBSan
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o alvos/parser-asan alvos/parser.c

# Rode com a entrada que dispara o bug
./alvos/parser-asan corpus/bug1.bin
```

Saída típica — **leia campo por campo:**

```
=================================================================           ← início
==12345==ERROR: AddressSanitizer: heap-buffer-overflow on address          ← TIPO + ENDEREÇO
0x6020000000f1 at pc 0x0000004a1b2c bp 0x7ffd... sp 0x7ffd...
WRITE of size 8 at 0x6020000000f1 thread T0                               ← O QUE fez: escrita, 8 bytes
    #0 0x4a1b2b in parse /home/.../parser.c:23:9                          ← ONDE: arquivo:linha:coluna
    #1 0x4a1d3e in main  /home/.../parser.c:47:15                         ← CADEIA de chamadas
    #2 0x7f... in __libc_start_main

0x6020000000f1 is located 0 bytes to the right of 64-byte region           ← O ALVO: onde era legal
[0x6020000000b0,0x6020000000f0) allocated by thread T0 here:               ← QUEM ALOCOU
    #0 0x... in malloc
    #1 0x4a18f0 in parse /home/.../parser.c:20:18                         ← a linha do malloc
```

### A tabela do que cada parte diz

| Campo | Significado | O que você faz com isso |
|---|---|---|
| **Tipo** | `heap-buffer-overflow`, `stack-buffer-overflow`, `heap-use-after-free`, `double-free`, `SEGV` | **Determina a severidade** |
| **Endereço** | Onde a violação ocorreu | — |
| **`WRITE` / `READ`** | Acesso de escrita ou leitura | **Escrita é mais grave** |
| **`of size N`** | Quantos bytes | Escrita grande = mais grave |
| **`#0 ... parser.c:23`** | **A linha que causou** | Onde investigar |
| **Cadeia `#1`, `#2`** | Como chegou ali | Contexto de entrada |
| **`N bytes to the right of M-byte region`** | Quanto passou, e do que | Diz se é 1 byte ou mil |
| **`allocated by ... parser.c:20`** | Onde o bloco nasceu | **A origem**, não o sintoma |

⚠ **A leitura mais importante é comparar `#0` com `allocated by`.** `#0` é onde o acesso ilegal
aconteceu; `allocated by` é onde o bloco foi criado. **O bug real está entre os dois** — tipicamente
na ausência de verificação de limite logo antes do `memcpy`.

⚠ **`0 bytes to the right` significa que passou imediatamente o final.** Se fosse
`100 bytes to the right`, seria um transbordo maior. **Isso é informação de severidade.**

### Os tipos de erro que você vai ver

| Erro do ASan | Classe | Severidade típica |
|---|---|---|
| `heap-buffer-overflow` | Escrita/leitura além do bloco | **Alta** — escrita costuma dar controle |
| `stack-buffer-overflow` | Igual, na pilha | **Alta** |
| `global-buffer-overflow` | Igual, em global | Média-alta |
| `heap-use-after-free` | Usa memória já liberada | **Crítica** — clássica de exploração |
| `double-free` | Libera duas vezes | Alta — corrompe estrutura do alocador |
| `SEGV on unknown address` | Endereço absurdo | Alta — indica ponteiro corrompido |
| `memcpy-param-overlap` | `memcpy` com sobreposição | Média |
| `alloc-dealloc-mismatch` | `malloc` + `delete` | Baixa-média |

⚠ **`heap-use-after-free` é a classe mais perigosa da tabela**, e a razão é específica: com o
alocador, você pode **reocupar o espaço liberado com dado controlado** e depois o programa usa
o que estava lá. Isso dá controle com frequência.

---

## 2.4 UBSan: a segunda rede

```bash
cat > alvos/intoverflow.c <<'EOF'
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>

int main(int argc, char **argv) {
    if (argc < 2) return 2;

    uint32_t n = (uint32_t)strtoul(argv[1], NULL, 10);
    /* ⚠ BUG: overflow no cálculo do tamanho da alocação */
    uint32_t total = n * 8;

    printf("n=%u  total=n*8=%u\n", n, total);
    if (total < n) {
        printf("⚠ OVERFLOW: total ficou MENOR que n\n");
    }

    char *buf = malloc(total);
    if (!buf) { printf("malloc falhou\n"); return 3; }
    /* ⚠ escreve n*8 bytes num buffer de (`total`) bytes — que sofreu overflow */
    for (uint32_t i = 0; i < n; i++) buf[i] = 'A';
    printf("escreveu %u bytes\n", n);

    free(buf);
    return 0;
}
EOF

clang -g -O1 -fsanitize=undefined -fno-omit-frame-pointer \
      -o alvos/intoverflow alvos/intoverflow.c

echo "=== valor seguro ==="
./alvos/intoverflow 100
echo
echo "=== valor que causa overflow de uint32 ==="
./alvos/intoverflow 536870912      # 536870912 * 8 = 2^32 → dá 0
```

⚠ **Note que usei `-fsanitize=undefined` sozinho aqui.** Esse é o ponto: **ASan não pegaria
integer overflow** — não é acesso fora de limite, é aritmética. UBSan pega.

**Saída:**

```
intoverflow.c:11:25: runtime error: unsigned integer overflow: 536870912 * 8
  cannot be represented in type 'uint32_t'
```

⚠ **E aqui está o bug clássico explorável:** `total` vira um número pequeno, o `malloc` aloca
pouco, e o loop escreve muito. É o **integer overflow que leva a heap overflow**. ASan pegaria o
segundo; UBSan pega o **primeiro** — onde a correção deve acontecer.

---

## 2.5 O que a instrumentação muda

⚠ **Nenhum sanitizer é transparente.** Você precisa saber o que ele altera.

| Aspecto | Efeito |
|---|---|
| **Velocidade** | ASan ~2× mais lento; TSan muito mais |
| **Memória** | ASan usa ~3× mais (shadow memory) |
| **Layout da heap** | ASan adiciona redzone e muda o alocador — **a exploração muda** |
| **Falha vs. silêncio** | Bug silencioso passa a abortar |
| **Dependência de lib** | Exige binário inteiro instrumentado, ou interceptação |
| **Falso negativo** | Redzone não pega acesso *dentro* do bloco, nem off-by-one em alguns casos |

⚠ **A linha do layout da heap é a que mais confunde quem vem de fora.** Com ASan, `malloc` devolve
blocos maiores, com redzone. Isso significa que **o comportamento do alvo instrumentado é diferente
do alvo de produção**. Consequência dupla:

1. **Bom:** você acha bugs que em produção seriam silenciosos.
2. **Ruim:** o fuzzer explora um layout que não existe em produção, e alguns bugs **só existem
   com ASan**.

⚠ **A regra prática:** fuzz com ASan (para achar), e **reproduza sem ASan** (para confirmar que o
bug é real). Um crash que só acontece com sanitizer merece investigação antes de virar reporte.

---

## 2.6 LAB — Instrumentar e medir

**Duração:** 120 min

### Passo 1 — Compile o parser em quatro configurações (25 min)

```bash
cd ~/fuzz-lab

# 1. Sem instrumentação (referência)
gcc -g -O1 -o alvos/parser-plain alvos/parser.c

# 2. Só ASan
clang -g -O1 -fsanitize=address -fno-omit-frame-pointer -o alvos/parser-asan alvos/parser.c

# 3. ASan + UBSan  ← a configuração do curso
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o alvos/parser-asan-ubsan alvos/parser.c

# 4. Com canário e hardening de stack
clang -g -O1 -fsanitize=address,undefined -fstack-protector-all \
      -D_FORTIFY_SOURCE=2 -fno-omit-frame-pointer -o alvos/parser-hardened alvos/parser.c
```

### Passo 2 — Compare o comportamento (30 min)

```bash
for bin in parser-plain parser-asan parser-asan-ubsan; do
    echo "══════ ${bin} ══════"
    ./alvos/${bin} corpus/bug1.bin 2>&1 | head -8
    echo "   código de saída: $?"
    echo
done
```

Produza `comparacao-sanitizers.md`:

| Binário | Entrada válida funciona? | `bug1.bin` — o que acontece | Código de saída | Detectou? |
|---|---|---|---|---|
| `parser-plain` | | | | |
| `parser-asan` | | | | |
| `parser-asan-ubsan` | | | | |
| `parser-hardened` | | | | |

**Responda:**

1. **Qual binário detectou o bug?** Qual passou em silêncio ou corrompeu?
2. O `parser-plain` crashou com `bug1.bin`? Se não, o que ele fez?
3. O `parser-hardened` mudou algo em relação ao `asan-ubsan`? Como?
4. **Por que `-fstack-protector-all` não teria ajudado** neste bug específico? (Dica: onde está o
   buffer corrompido — stack ou heap?)

⚠ **A resposta 4 é o ponto.** O canário protege a **stack**. O bug do parser é de **heap**. É por
isso que ASan é mais eficaz que canário para fuzzing: **ele cobre as duas superfícies, e a heap é
a mais frequente em parser.**

### Passo 3 — Meça o custo (35 min)

⚠ **A medição que decide o que você usa em campanha longa.**

```bash
cat > alvos/bench.sh <<'SCRIPT'
#!/usr/bin/env bash
# Mede o tempo de N execuções de cada binário
set -uo pipefail
N="${N:-500}"

for bin in parser-plain parser-asan parser-asan-ubsan; do
    [ -x "alvos/${bin}" ] || continue
    inicio=$(date +%s.%N)
    for i in $(seq 1 "${N}"); do
        ./alvos/${bin} corpus/valido.bin >/dev/null 2>&1
    done
    fim=$(date +%s.%N)
    printf '%-20s %s execuções em %.2fs  (%.0f exec/s)\n' \
        "${bin}" "${N}" "$(echo "${fim} - ${inicio}" | bc)" \
        "$(echo "${N} / (${fim} - ${inicio})" | bc)"
done
SCRIPT
chmod +x alvos/bench.sh
N=500 ./alvos/bench.sh
```

⚠ **Se `bc` não estiver instalado:** `sudo apt install -y bc`. Se preferir, o script funciona com
`awk` — mas o `bc` é mais direto.

Produza `custo.md`:

| Binário | Execuções | Tempo total | Exec/seg | Fator vs. plain |
|---|---|---|---|---|
| `parser-plain` | 500 | | | 1× |
| `parser-asan` | 500 | | | |
| `parser-asan-ubsan` | 500 | | | |

**Responda:**

1. **Qual o fator de desaceleração do ASan?** Bate com o esperado (~2×)?
2. Em uma campanha de **24 horas**, quantas execuções cada configuração faria?
3. **Vale a pena** rodar sem sanitizer para ganhar velocidade? Justifique com o resultado do passo 2.
4. **Se o ASan custa 2× e acha 10× mais bugs**, qual a razão custo-benefício? Mostre a conta.

⚠ **A resposta 3 é a decisão real de quem faz fuzzing.** A tentação é rodar sem sanitizer para ir
mais rápido. **O passo 2 mostra por que é erro:** o `parser-plain` não acha o bug. Velocidade sem
detecção é velocidade para lugar nenhum.

### Passo 4 — Leia um relatório do ASan campo por campo (30 min)

```bash
echo "=== RELATÓRIO COMPLETO ==="
./alvos/parser-asan-ubsan corpus/bug1.bin 2>&1 | tee relatorio-asan.txt
```

Produza `leitura-asan.md` — **preencha cada campo do relatório real:**

| Campo do relatório | Valor no seu caso | O que significa |
|---|---|---|
| Tipo do erro | | |
| `WRITE` ou `READ` | | |
| Tamanho do acesso | | |
| `#0` (arquivo:linha) | | |
| `#1` (chamador) | | |
| "N bytes to the right of M-byte region" | | |
| `allocated by` (arquivo:linha) | | |
| Endereço da violação | | |

**Responda:**

1. O bug é de **leitura** ou **escrita**? Qual a diferença de severidade?
2. Passou **0 bytes** do final, ou mais? O que isso diz sobre o tamanho do transbordo?
3. **Onde está o bug real: em `#0` ou em `allocated by`?** Justifique.
4. **Qual a correção mínima** que elimina este bug? Escreva o código.

⚠ **A resposta 3 é o exercício central do módulo.** `#0` é **onde o acesso ilegal aconteceu**.
O bug real é a **ausência de verificação anterior** — que fica clara quando você compara `#0` com
`allocated by`.

⚠ **A resposta 4 fecha o ciclo:** você escreve a verificação de limite e recompila, confirmando
que o ASan silencia. Fazer isso **uma vez** agora evita o erro de tratar o sintoma em vez da causa
no módulo 12.

### Critérios de aceitação

- Quatro binários compilados, com as flags corretas.
- `comparacao-sanitizers.md` com a tabela e a resposta sobre stack vs. heap **demonstrada**.
- `custo.md` com a medição real, e a razão custo-benefício **calculada**.
- Você concluiu que rodar sem sanitizer é erro, **com base no passo 2**.
- `leitura-asan.md` com todos os campos preenchidos do **relatório real**, não de exemplo.
- Você identificou onde está o bug real (`#0` vs. `allocated by`) e escreveu a correção.
- Confirmou que a correção **silencia o ASan** ao recompilar.
- `UBSan` demonstrado separadamente com `intoverflow.c`.

---

## Avaliação

1. Por que o sanitizer transforma corrupção silenciosa em falha diagnosticada?
2. Cite quatro sanitizers e o que cada um detecta. Quais são mutuamente exclusivos?
3. Por que UBSan é subestimado? Que classe de bug ele pega que o ASan não pega?
4. Por que `-O1` é o ponto doce, e não `-O0` ou `-O2`?
5. Para que serve `-fno-omit-frame-pointer` no contexto do curso?
6. Leia este campo: `WRITE of size 8 at 0x6020000000f1`. O que você sabe daí?
7. **Qual a diferença entre `#0` e `allocated by`?** Onde está o bug real?
8. O que "0 bytes to the right of 64-byte region" diz sobre a severidade?
9. Por que `heap-use-after-free` é a classe mais perigosa?
10. Explique como integer overflow **leva a** heap overflow, com o exemplo do `intoverflow.c`.
11. Por que o `-fsanitize` exige instrumentar o binário inteiro, e o que acontece se uma biblioteca
    não estiver instrumentada?
12. **Por que um crash que só acontece com ASan merece investigação?**
13. Por que rodar o fuzzer sem sanitizer é velocidade para lugar nenhum?

---

**Próximo:** [Módulo 3 — Anatomia de um bug](modulo-03.md)
