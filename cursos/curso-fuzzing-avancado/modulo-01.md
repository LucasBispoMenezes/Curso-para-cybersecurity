# Módulo 1 — O Que o Fuzzing É, e o Que Não É

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** C para Pesquisa · Parser Differentials

---

## Objetivos

1. Entender o **modelo** do fuzzing — e onde ele é simples.
2. Reconhecer o **gargalo**: ele não está no fuzzer.
3. Saber as **cinco partes** de uma campanha, e o peso de cada uma.
4. Montar o laboratório.
5. Escolher o **primeiro alvo** — com critério.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o curso:**

> **O fuzzer é a parte fácil.** **Você instala o AFL++, dá `afl-fuzz -i in -o out ./alvo`, e ele
> roda.** **O que ele **não** faz é saber onde olhar.**

⚠ **E o resultado típico de quem só instala o fuzzer:**

```
┌──────────────────────────────────────────────────────────────────────┐
│   instala o AFL++  →  roda 24h  →  ⚠ "não achou nada"                 │
│                                                                      │
│   ⚠ e a conclusão errada: "o código é seguro"                         │
│   ✓ a conclusão certa:     "a mutação não chegou onde importa"        │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A segunda linha é o que o curso corrige.** **Um fuzzer sem corpus bom muta bytes que o parser
rejeita na primeira linha** — **e nunca entra no código.**

⚠ **A tese:**

> **Fuzzing é escolher onde olhar, e construir a entrada que chega lá.** **O fuzzer executa; você
> decide.**

⚠ **A tabela das cinco partes, e o peso real de cada uma:**

| # | Parte | O que é | ⚠ Peso |
|---|---|---|---|
| 1 | **Escolher o alvo** | Onde vale a pena | ⚠ **Alto** |
| 2 | **O harness** | O ponto de entrada | ⚠⚠ **Muito alto** |
| 3 | **O corpus** | As sementes | ⚠⚠ **Muito alto** |
| 4 | **O oráculo** | O que é um bug | ⚠⚠ **Muito alto** |
| 5 | ⚠ **A triagem** | O que **não** é bug | ⚠⚠⚠ **O maior** |

⚠ **A linha 5 é a que ninguém considera.** **Uma campanha que gera 200 crashes inúteis custa mais
que uma que gera 3 reais** — **porque o tempo de triagem é o recurso escasso** (módulo 11).

---

## 1.1 O modelo

⚠ **O fuzzing, em cinco elementos. E ele é simples.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. O ALVO          o código que você executa                         │
│ 2. O HARNESS       o ponto de entrada — como o fuzzer o chama         │
│ 3. O CORPUS        as entradas iniciais                               │
│ 4. A MUTAÇÃO       como o fuzzer gera novas entradas                  │
│ 5. O ORÁCULO       como ele decide que achou algo                     │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A tabela do que já vem pronto e do que é seu:**

| Elemento | Vem pronto? |
|---|---|
| O alvo | ⚠ **Você escolhe** |
| O harness | ⚠⚠ **Você escreve** |
| O corpus | ⚠⚠ **Você constrói** |
| A mutação | ✓ **O fuzzer faz** |
| O oráculo | ⚠⚠ **Você define** |

⚠ **A quarta linha é a única que o fuzzer resolve.** **Três dos cinco elementos são seus** — **e é a
razão de este ser um curso, e não uma instalação.**

⚠ **E a tabela do que acontece quando um elemento falha:**

| Elemento falho | Sintoma |
|---|---|
| Alvo errado | ⚠ **Nada, para sempre** |
| Harness ruim | ⚠ Baixa cobertura, falso crash |
| ⚠ **Corpus ruim** | ⚠ **O fuzzer não passa do parser** |
| ⚠ **Oráculo fraco** | ⚠ **Só acha o que crasha** |
| Sem triagem | ⚠ **200 crashes, nenhum bug** |

⚠ **A linha do corpus é a mais comum e a mais silenciosa.** **O fuzzer **roda**, a cobertura
**cresce um pouco**, e nada aparece** — **porque a mutação nunca produziu uma entrada válida o
bastante.**

⚠ **A regra escrita:**

> **Um fuzzer sem corpus é um gerador de entradas inválidas.** **E o parser rejeita na primeira
> validação** — **antes de qualquer código que importe.**

```bash
mkdir -p ~/fuzz-lab/mod01 && cd ~/fuzz-lab/mod01

echo "═══ 1. o modelo ═══"
echo
cat > modelo.md <<'EOF'
# O modelo do fuzzing

## Os cinco elementos
| # | Elemento | Vem pronto? |
|---|---|---|
| 1 | o ALVO | ⚠ VOCÊ escolhe |
| 2 | o HARNESS | ⚠⚠ VOCÊ escreve |
| 3 | o CORPUS | ⚠⚠ VOCÊ constrói |
| 4 | a MUTAÇÃO | ✓ o fuzzer faz |
| 5 | o ORÁCULO | ⚠⚠ VOCÊ define |

## ⚠ três dos cinco são seus
a mutação é a única que o fuzzer resolve.
✓ e é a razão de este ser um CURSO, e não uma instalação.

## O que acontece quando um falha
| Elemento falho | Sintoma |
|---|---|
| alvo errado | ⚠ NADA, para sempre |
| harness ruim | ⚠ baixa cobertura, falso crash |
| ⚠ corpus ruim | ⚠ o fuzzer NÃO PASSA DO PARSER |
| ⚠ oráculo fraco | ⚠ só acha o que CRASHA |
| sem triagem | ⚠ 200 crashes, NENHUM bug |

## ⚠ a linha mais silenciosa
o CORPUS.
o fuzzer RODA, a cobertura cresce UM POUCO, e nada aparece —
porque a mutação nunca produziu uma entrada VÁLIDA o bastante.

## ⚠ A REGRA
um fuzzer sem corpus é um gerador de entradas INVÁLIDAS.
e o parser rejeita na PRIMEIRA validação —
antes de qualquer código que IMPORTE.
EOF

cat modelo.md
```

⚠ **A tabela do que "vem pronto" é o argumento do curso.** **E a linha do corpus explica o fracasso
silencioso** — **o fuzzer roda, a cobertura sobe, e nada aparece.**

⚠ **E note:** **"cobertura subindo" não é o mesmo que "chegando ao código que importa".** **O módulo
4 trata disso.**

**Produza `modelo.md`:**

| Elemento | Vem pronto? |
|---|---|
| Harness | |
| Mutação | |
| Corpus | |

**Responda:**

1. **Qual elemento o fuzzer resolve?** E os outros?
2. **Por que o corpus ruim é silencioso?
3. **O que a cobertura subindo não garante?
4. **Qual elemento tem o maior peso?** (Dica: não está na lista dos cinco.)

---

## 1.2 O gargalo

⚠ **O gargalo não é a velocidade do fuzzer. É a **escolha** e a **triagem**.**

| Recurso | Custo |
|---|---|
| CPU do fuzzer | ⚠ **Barato — alugável** |
| ⚠ **Escrever o harness** | ⚠ **Horas de analista** |
| ⚠ **Construir o corpus** | ⚠ **Horas** |
| ⚠ **Triar os crashes** | ⚠⚠ **Dias** |
| ⚠ **Confirmar que é bug** | ⚠⚠ **Dias** |

⚠ **A tabela é o orçamento do curso, e é a mesma lição do Detecção e Evasão:** **CPU é barato;
tempo de analista não é.**

⚠ **E a consequência prática, e ela é contraintuitiva:**

> **Rodar 10 fuzzers em paralelo acha 10× mais crashes** — **e 10× mais trabalho de triagem.** **E
> não acha 10× mais bugs.**

⚠ **A tabela do rendimento por eixo de esforço:**

| Você investe em | Rendimento |
|---|---|
| ⚠ Mais CPU | ⚠ **Marginal** |
| ⚠ **Melhor corpus** | ⚠⚠ **Alto** |
| ⚠ **Melhor oráculo** | ⚠⚠⚠ **O maior** |
| Melhor harness | Alto |
| ⚠ **Triagem automática** | ⚠ Alto |

⚠ **A linha do oráculo é o maior ganho disponível.** **Um fuzzer por crash acha segfaults.** **Um
fuzzer por **diferencial** acha bug de lógica** — **e é o que o `Oss-Fuzz` e o `1dFuzz` fazem.**

⚠ **A regra escrita:**

> **CPU é alugável; julgamento não.** **Antes de adicionar um núcleo, pergunte o que vai **triar** o
> que ele produzir.**

```bash
cd ~/fuzz-lab/mod01

echo "═══ 2. o gargalo ═══"
echo
cat > gargalo.md <<'EOF'
# O gargalo

| Recurso | Custo |
|---|---|
| CPU do fuzzer | ⚠ BARATO — alugável |
| escrever o harness | ⚠ horas de analista |
| construir o corpus | ⚠ horas |
| ⚠ TRIAR os crashes | ⚠⚠ DIAS |
| ⚠ confirmar que é bug | ⚠⚠ DIAS |

## ⚠ a consequência contraintuitiva
rodar 10 fuzzers em paralelo acha 10× mais CRASHES —
e 10× mais trabalho de TRIAGEM.
⚠ e NÃO acha 10× mais BUGS.

## Rendimento por eixo
| Você investe em | Rendimento |
|---|---|
| ⚠ mais CPU | ⚠ MARGINAL |
| ⚠ melhor corpus | ⚠⚠ ALTO |
| ⚠⚠ melhor ORÁCULO | ⚠⚠⚠ O MAIOR |
| melhor harness | alto |
| ⚠ triagem automática | ⚠ alto |

## ⚠ a linha do oráculo
um fuzzer por CRASH acha segfaults.
um fuzzer por DIFERENCIAL acha bug de LÓGICA.
✓ é o que o Oss-Fuzz e o 1dFuzz fazem.

## ⚠ A REGRA
CPU é ALUGÁVEL; julgamento NÃO.
antes de adicionar um núcleo, pergunte
o que vai TRIAR o que ele produzir.
EOF

cat gargalo.md
```

⚠ **O gargalo é o instrumento econômico do curso.** **E ele reordena as prioridades:** **CPU por
último, oráculo primeiro.**

⚠ **E a comparação dos dois fuzzers é o argumento:** **um por crash acha segfault; um por diferencial
acha lógica** — **e a lógica é onde os bugs reais vivem.**

**Produza `gargalo.md`:**

| Você investe em | Rendimento |
|---|---|
| Mais CPU | |
| Melhor corpus | |
| Melhor oráculo | |

**Responda:**

1. **Por que mais CPU rende pouco?** O que ele multiplica junto?
2. **Qual é o maior ganho disponível?
3. **O que um fuzzer por crash acha que um por diferencial não acha?** E o inverso?
4. **Por que CPU é alugável e julgamento não?

---

## 1.3 O laboratório

⚠ **O lab do curso: **os alvos dos cursos anteriores, e as ferramentas de fuzzing.**

| Pasta | O que guarda |
|---|---|
| `alvos/` | ⚠ **O binário, compilado com sanitizer** |
| `harness/` | O ponto de entrada |
| `corpus/` | ⚠ **As sementes — de fronteira** |
| `crashes/` | Os achados |
| `triagem/` | ⚠ **Onde o trabalho acontece** |

⚠ **A pasta `alvos/` guarda o alvo **instrumentado**.** **E a nota é a mesma do curso de C:** **um
alvo sem sanitizer esconde a maioria dos bugs** — **porque eles não crasham; só corrompem.**

⚠ **A tabela do que compilar, e com o quê:**

| Alvo | Compilação |
|---|---|
| C, com AFL++ | ⚠ **`afl-clang-fast`** |
| C, com LibFuzzer | ⚠ **`-fsanitize=fuzzer,address`** |
| C, só ASan | `-fsanitize=address` |
| Rust | `cargo-fuzz` |

⚠ **A linha do `-fsanitize=fuzzer,address` é o padrão moderno.** **O LibFuzzer roda **in-process** —
**e é 10 a 100× mais rápido que o modo por processo.**

⚠ **A regra escrita:**

> **O alvo se compila **com** instrumentação.** **Sem sanitizer, o fuzzer acha o que crasha; com
> sanitizer, acha o que está errado.**

```bash
cd ~/fuzz-lab

echo "═══ 3. o laboratório ═══"
echo
cat > monta-lab.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "═══ LABORATÓRIO DE FUZZING ═══"
echo

cd ~/fuzz-lab 2>/dev/null || { mkdir -p ~/fuzz-lab && cd ~/fuzz-lab; }
for d in alvos harness corpus crashes triagem caderno; do
    mkdir -p "$d"; printf '  ✓ %s/\n' "$d"
done
echo

cat > alvos/README.md <<'EOF'
# Alvos

## ⚠ REGRAS
   · o alvo é SEU, ou um projeto aberto compilado por você
   · ⚠ compilado COM INSTRUMENTAÇÃO
   · roda LOCALMENTE — nunca pela rede
   · registre: origem, versão, flags

## Como compilar (C)
   · AFL++:      afl-clang-fast -o alvo alvo.c
   · LibFuzzer:  clang -fsanitize=fuzzer,address -o alvo alvo.c
   · ASan só:    clang -fsanitize=address -g -o alvo alvo.c

## ⚠ sem sanitizer, você acha o que CRASHA.
## com sanitizer, você acha o que está ERRADO.
EOF

cat > harness/README.md <<'EOF'
# Harness

## ⚠ É AQUI QUE A MAIORIA FALHA

   o harness é o PONTO DE ENTRADA que o fuzzer chama.
   e um harness ruim produz:
     · baixa cobertura
     · falso crash (bug do harness, não do alvo)
     · ⚠ ou nada

## Convenção
   LLVMFuzzerTestOneInput(const uint8_t *data, size_t size)

## ⚠ o que o harness NUNCA faz
   · não valida a entrada antes de passar
   · não chama só a função "segura"
   · não reinicia estado caro se puder evitar
EOF

cat > corpus/README.md <<'EOF'
# Corpus

## ⚠ NÃO é aleatório
é de FRONTEIRA — um caso por CAMPO (módulo 5).

## Estrutura
   corpus/<alvo>/<campo>/

## Valores, por campo
| Valor | Por quê |
|---|---|
| 0 | vazio |
| 1 | mínimo |
| limite − 1 | fronteira |
| limite | o limite |
| ⚠ limite + 1 | ⚠ OFF-BY-ONE |
| máximo do tipo | ⚠ OVERFLOW |

## ⚠ e o MAPA
   corpus/<alvo>/MAPA.md diz qual arquivo testa qual campo.
EOF

cat > triagem/README.md <<'EOF'
# Triagem

## ⚠ AQUI ESTÁ O TRABALHO

## Por crash
| Campo | Valor |
|---|---|
| único? | (deduplicado?) |
| é do ALVO ou do HARNESS? | |
| é exploitável? | |
| é o MESMO bug de outro? | |
| ⚠ reproducer mínimo | |

## O que NÃO é bug
| Tipo | Por quê |
|---|---|
| timeout | ⚠ alto FP |
| OOM controlado | config |
| ⚠ assert do harness | bug do harness |
| entrada inválida rejeitada | ✓ é o certo |
EOF

echo "  ✓ READMEs criados"
echo

echo "═══ VERIFICANDO ═══"
for t in afl-fuzz afl-clang-fast clang gcc gdb; do
    printf '  %-16s ' "$t:"
    command -v "$t" >/dev/null 2>&1 && echo "✓" || echo "⚠ ausente"
done
echo
printf '  %-16s ' "ASan:"
echo 'int main(){int*p=0;return *p;}' > /tmp/t.c 2>/dev/null
clang -fsanitize=address -o /tmp/t /tmp/t.c 2>/dev/null && echo "✓ disponível" || echo "⚠ ausente"
rm -f /tmp/t.c /tmp/t 2>/dev/null
echo

echo "── ⚠ O LIMITE ──"
cat <<'EXPL'
   ✓ o alvo é o SEU binário, local
   ✓ o fuzzer roda no SEU processo
   ⚠ NUNCA fuzzar serviço de terceiro pela rede
   ⚠ o fuzzing manda MILHARES de entradas/s —
      contra terceiro, é indistinguível de ataque (154-A, 266)
EXPL
echo
find . -maxdepth 2 -type d | sort | sed 's/^/  /'
SCRIPT

chmod +x monta-lab.sh
./monta-lab.sh
```

⚠ **Os READMEs são o instrumento.** **E o de `harness/` estabelece a regra mais importante:**
**não validar antes de passar** — **porque validar no harness é validar **antes** do alvo, e o
caminho nunca é exercitado.**

⚠ **E o de `triagem/` lista o que **não** é bug** — **que é o módulo 10, antecipado.**

**Produza `laboratorio.md`:**

| Pasta | O que guarda | Por quê |
|---|---|---|
| `alvos/` | | |
| `harness/` | | |
| `triagem/` | | |

**Responda:**

1. **Por que o alvo se compila com sanitizer?
2. **O que o harness NUNCA faz?** Por quê?
3. **O que o README de `triagem/` lista?
4. **O que o lab garante** sobre terceiros?

---

## 1.4 O primeiro alvo

⚠ **A escolha do alvo. E o critério é o do gargalo: **onde vale a pena olhar**.**

| Critério | Por quê |
|---|---|
| **Tem entrada estruturada** | ⚠ **Há fronteiras a testar** |
| **Você tem o fonte** | ⚠ **Para entender o crash** |
| **É pequeno** | Você itera |
| **Já teve bugs** | ⚠ **A área é fértil** |
| **Tem o harness fácil** | ⚠ **O harness é caro** |
| ⚠ **Não é serviço de rede** | ⚠ **O limite do curso** |

⚠ **A primeira linha é a mais importante.** **Um alvo com entrada estruturada (um parser) tem
**fronteiras** — **e fronteiras são onde os bugs moram.** **Um alvo que só recebe um inteiro tem uma
superfície minúscula.**

⚠ **E a tabela dos alvos, por rendimento:**

| Alvo | Superfície | Harness | ⚠ Rendimento |
|---|---|---|---|
| **Parser de formato** | ⚠⚠ **Alta** | Fácil | ⚠⚠ **Alto** |
| **Decodificador** | Alta | Fácil | Alto |
| Deserializador | Alta | Médio | Alto |
| Servidor de rede | Alta | ⚠ Caro | ⚠ **Não neste curso** |
| Função aritmética | ⚠ Baixa | Trivial | Baixo |
| Kernel | ⚠⚠ Muito alta | ⚠⚠ Caro | Módulo 9 |

⚠ **A linha do servidor de rede é a que o curso exclui.** **E a exclusão não é técnica — é de
escopo:** **fuzzar rede significa mandar entradas a um socket, e um socket pode ser remoto.**

⚠ **E a nota do kernel é honesta:** **superfície enorme, harness caríssimo** — **e é o módulo 9.**

⚠ **A regra escrita:**

> **Escolha um alvo cuja fronteira você consegue descrever.** **Se você não sabe quais são os campos,
> não sabe onde estão os limites** — **e o corpus de fronteira fica impossível.**

```bash
cd ~/fuzz-lab/mod01

echo "═══ 4. o primeiro alvo ═══"
echo
cat > escolha-alvo.md <<'EOF'
# Escolha do primeiro alvo

## Critérios
| Critério | Peso | Por quê |
|---|---|---|
| ⚠ entrada ESTRUTURADA | muito alto | há fronteiras a testar |
| tem o FONTE | alto | para entender o crash |
| é PEQUENO | alto | você itera |
| já teve bugs | alto | a área é fértil |
| harness FÁCIL | alto | ⚠ o harness é caro |
| ⚠ NÃO é serviço de rede | absoluto | ⚠ o limite do curso |

## Alvos, por rendimento
| Alvo | Superfície | Harness | Rendimento |
|---|---|---|---|
| parser de formato | ⚠⚠ alta | fácil | ⚠⚠ ALTO |
| decodificador | alta | fácil | alto |
| deserializador | alta | médio | alto |
| ⚠ servidor de rede | alta | ⚠ CARO | ⚠ NÃO neste curso |
| função aritmética | ⚠ baixa | trivial | baixo |
| kernel | ⚠⚠ muito alta | ⚠⚠ caro | módulo 9 |

## O alvo escolhido
| Item | Valor |
|---|---|
| O que é | |
| De onde veio | |
| ⚠ Os CAMPOS da entrada | |
| ⚠ As FRONTEIRAS | |
| Como compilar | |
| Por que este | |

## ⚠ As fronteiras que eu vou testar
| # | Campo | Limite |
|---|---|---|
| 1 | | |
| 2 | | |

## ⚠ O que eu NÃO vou fuzzar
| Alvo | Por quê |
|---|---|
| | é serviço de rede |
EOF

cat escolha-alvo.md
```

⚠ **A seção das fronteiras é o entregável do módulo.** **E ela é o pré-requisito do corpus:** **sem
saber os campos, não há fronteiras** — **e sem fronteiras, o corpus é aleatório.**

⚠ **E a nota do parser de formato é a recomendação:** **a superfície é alta e o harness é fácil** —
**o melhor rendimento por hora investida.**

**Produza `primeiro-alvo.md`:**

| Item | Valor |
|---|---|
| Alvo | |
| Campos | |
| Fronteiras | |
| Harness | |

**Responda:**

1. **Qual alvo você escolheu?** Ele tem entrada estruturada?
2. **Quais são os campos?** Quais as fronteiras de cada?
3. **Por que não um servidor de rede?
4. **Você consegue descrever a fronteira?** Se não, qual o problema?

---

## 1.5 LAB — Monte o laboratório

**Duração:** 60 min

### Passo 1 — A estrutura e as ferramentas (25 min)

```bash
cd ~/fuzz-lab
bash ~/fuzz-lab/mod01/monta-lab.sh 2>&1 | head -40
```

**Produza `estrutura.md`:**

| Pasta | O que guarda | Por quê |
|---|---|---|
| `alvos/` | | |
| `harness/` | | |
| `corpus/` | | |
| `triagem/` | | |

**Responda:**

1. **Quais ferramentas faltam?** Instale.
2. **O O ASan está disponível?** Confirme.
3. **O que o README de `alvos/` exige?
4. **O que o lab garante** sobre terceiros?

### Passo 2 — Compile o alvo com sanitizer (35 min)

⚠ **O alvo do curso de C, ou um parser seu. Compilado com instrumentação.**

```bash
cd ~/fuzz-lab/alvos

echo "═══ COMPILANDO O ALVO ═══"
echo
cat <<'EXPL'
  ── O ALVO DESTE CURSO ──
     um parser simples, com fronteiras CLARAS.
     ⚠ é o mesmo tipo do curso de Parser Differentials.

  ── E AS TRÊS COMPILAÇÕES ──
     1. ASan só          → para depurar
     2. LibFuzzer + ASan → o padrão moderno
     3. AFL++            → cobertura persistente
EXPL

cat > parser_alvo.c <<'EOF'
/*
 * ⚠ ALVO DE FUZZING — parser de cabeçalho de 2 campos.
 *   os campos têm FRONTEIRAS: é onde o fuzzer deve chegar.
 */
#include <stdint.h>
#include <string.h>
#include <stdlib.h>

#define MAX_ITENS 1024
#define DST_SIZE  64

/* ⚠ o ponto de entrada que o fuzzer chama */
int parse(const uint8_t *data, size_t size) {
    if (size < 6) return -1;

    uint16_t count;
    uint32_t total;
    memcpy(&count, data, 2);
    memcpy(&total, data + 2, 4);

    char dst[DST_SIZE];

    /* ⚠ FRONTEIRA 1: count não deve passar de MAX_ITENS */
    if (count > MAX_ITENS) return -2;

    /* ⚠ FRONTEIRA 2: total = count * 4, e deve caber em dst */
    total = (uint32_t)count * 4;
    if (total > DST_SIZE) return -3;

    memcpy(dst, data + 6, total);
    return (int)total;
}

/* ⚠ entrada por arquivo, para testar manualmente */
int main(int argc, char **argv) {
    if (argc < 2) return 2;
    FILE *f = fopen(argv[1], "rb");
    if (!f) return 2;
    uint8_t buf[8192];
    size_t n = fread(buf, 1, sizeof(buf), f);
    fclose(f);
    printf("%d\n", parse(buf, n));
    return 0;
}
EOF

echo "  ── 1. ASan só ──"
clang -fsanitize=address,undefined -g -o parser_asan parser_alvo.c 2>&1 | head -3
[ -f parser_asan ] && echo "     ✓ parser_asan" || echo "     ⚠ falhou"

echo "  ── 2. LibFuzzer + ASan ──"
cat > fuzz_parser.c <<'EOF'
#include <stdint.h>
#include <stddef.h>
int parse(const uint8_t *data, size_t size);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    parse(data, size);
    return 0;
}
EOF
clang -fsanitize=fuzzer,address -g -o fuzz_parser parser_alvo.c fuzz_parser.c 2>&1 | head -3
[ -f fuzz_parser ] && echo "     ✓ fuzz_parser (LibFuzzer)" || echo "     ⚠ LibFuzzer ausente"

echo "  ── 3. AFL++ ──"
if command -v afl-clang-fast >/dev/null 2>&1; then
    afl-clang-fast -o parser_afl parser_alvo.c 2>&1 | head -3
    [ -f parser_afl ] && echo "     ✓ parser_afl" || echo "     ⚠ falhou"
else
    echo "     ⚠ afl-clang-fast ausente"
fi
echo

echo "═══ E UMA DEMONSTRAÇÃO: O BUG ESTÁ LÁ? ═══"
cat <<'EXPL'
  ── o parser tem a verificação de count ──
     if (count > MAX_ITENS) return -2;
     if (total > DST_SIZE)   return -3;

  ⚠ e note: a verificação de count vem ANTES da multiplicação
     ✓ é o módulo 5 do curso de C.

  ── MAS HÁ UM CAMINHO NÃO COBERTO ──
     parse() lê data+6 SEM conferir se size >= 6 + total.
     ⚠ se size = 6 e total = 64, o memcpy lê FORA DA ENTRADA.

  ✓ e é EXATAMENTE o que o fuzzer vai achar —
     se o corpus contiver o campo e a fronteira certos.
EXPL

ls -1 parser_* fuzz_* 2>/dev/null | sed 's/^/     /'
```

⚠ **O alvo é o instrumento.** **E ele tem um bug **real** — a leitura fora da entrada** — **que o
fuzzer só acha se o corpus chegar até lá.**

⚠ **E a nota sobre a ordem das verificações é a do curso de C:** **a de faixa vem antes da
multiplicação.** **O que falta não é ordem; é a conferência de `size`.**

**Produza `alvo-compilado.md`:**

| Binário | Instrumentação | Existe? |
|---|---|---|
| `parser_asan` | | |
| `fuzz_parser` | | |
| `parser_afl` | | |

**Responda:**

1. **Quais binários você compilou?** Quais falharam?
2. **Qual o bug que o alvo tem?** Descreva.
3. **Por que o fuzzer só o acha** se o corpus chegar lá?
4. **O que falta no parser?** (Dica: não é a ordem.)

### Passo 3 — Rode o fuzzer e veja (opcional, 20 min)

Produza `primeiro-fuzz.md`:

```markdown
# O primeiro fuzz

## A campanha
| Item | Valor |
|---|---|
| ferramenta | |
| corpus inicial | |
| tempo | |

## O que aconteceu
| Métrica | Valor |
|---|---|
| execuções | |
| cobertura | |
| ⚠ crashes | |

## ⚠ A interpretação
| Item | Valor |
|---|---|
| achou? | |
| se não, o corpus chegou ao bug? | |
| ⚠ o que falta | |

## O que isso ensina
| Item | Valor |
|---|---|
| o fuzzer é a parte | |
| o trabalho é | |
```

**Produza `primeiro-fuzz.md`:**

| Métrica | Valor |
|---|---|
| Execuções | |
| Cobertura | |
| Crashes | |
| O que falta | |

**Responda:**

1. **O fuzzer achou o bug?** Em quanto tempo?
2. **Se não achou, o corpus chegou lá?** Como você sabe?
3. **O que isso confirma** sobre o gargalo?
4. **O que você faria diferente?

### Critérios de aceitação

- `modelo.md` com os **cinco** elementos e o que vem pronto.
- Você explicou **por que três dos cinco são seus**.
- Você explicou **o sintoma de cada elemento falho**.
- Você explicou **por que o corpus ruim é silencioso**.
- `gargalo.md` com a tabela de custo dos recursos.
- Você explicou **a consequência contraintuitiva** de mais CPU.
- Você explicou **qual é o maior ganho disponível** (o oráculo).
- Você explicou **por que CPU é alugável e julgamento não**.
- O laboratório montado com as **seis** pastas e os READMEs.
- Você explicou **por que o harness nunca valida antes de passar**.
- Você explicou **o que o README de `triagem/` lista**.
- `escolha-alvo.md` com o alvo, os **campos** e as **fronteiras**.
- Você consegue **descrever a fronteira** do seu alvo.
- Você explicou **por que não fuzzar serviço de rede**.
- O **alvo compilado** com sanitizer — pelo menos uma das três formas.
- Você identificou **o bug que o alvo tem**.
- Você explicou **por que o fuzzer só o acha com o corpus certo**.
- ⚠ **Nenhum alvo de rede ou de terceiro.**

---

## Avaliação

1. **O que o fuzzer é?** E o que ele não é?
2. **Cite os cinco elementos.** Quais vêm prontos?
3. **Quantos são seus?** Por que isso define o curso?
4. **O que acontece quando o corpus é ruim?
5. **Por que o corpus ruim é silencioso?
6. **O que acontece quando o oráculo é fraco?
7. **O que acontece sem triagem?
8. **Qual recurso é barato?** Qual é caro?
9. **Por que mais CPU rende pouco?
10. **O que mais CPU multiplica junto?
11. **Qual é o maior ganho disponível?** Por quê?
12. **O que um fuzzer por crash acha?** E um por diferencial?
13. **Por que CPU é alugável?
14. **Cite as seis pastas** do laboratório.
15. **Por que o alvo se compila com sanitizer?
16. **O que o harness NUNCA faz?** Por quê?
17. **O que o README de `triagem/` lista como "não é bug"?
18. **Qual é o critério de escolha do alvo?** O mais importante?
19. **Por que não fuzzar servidor de rede?** Qual o motivo real?
20. **O que você precisa saber antes de construir o corpus?

---

**Próximo:** [Módulo 2 — Escolher o alvo](modulo-02.md)
