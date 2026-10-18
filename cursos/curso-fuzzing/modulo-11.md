# Módulo 11 — Causa Raiz no Depurador

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 10, e **curso de assembly**

---

## Objetivos

1. Reconstruir a causa raiz a partir do crash, com método.
2. Usar `gdb` de forma dirigida — não por tentativa.
3. Distinguir o **sintoma** (onde crashou) da **causa** (a verificação ausente).
4. Explicar o bug em uma frase que o mantenedor entende.
5. Provar a causa: teste que confirma e teste que descarta.

---

## ⚠ Pré-requisito real

⚠ **Este módulo exige leitura de assembly.** O `gdb` mostra instruções, registradores e memória
crua. Se você não lê `mov`, `cmp`, `jne`, e não sabe o que é `rbp`/`rsp`, **faça o curso de assembly
deste material antes**. Sem isso, o módulo vira decoreba de comando de `gdb`.

⚠ **Símbolos de debug são obrigatórios.** Compilou sem `-g`? Sem nomes de variável, sem números de
linha, sem tipo. O módulo não funciona.

---

## 11.1 Sintoma, causa, e a distância entre eles

⚠ **O conceito central do módulo.**

```
ENTRADA MALFORMADA
       │
       ▼
┌──────────────────────────────────┐
│ linha 32:  sem verificação       │  ← CAUSA
│            de limite              │     (o que falta no código)
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ linha 34:  memcpy escreve demais │  ← SINTOMA imediato
└──────────────┬───────────────────┘     (o que o ASan aponta)
               │
               ▼
┌──────────────────────────────────┐
│ linha 52:  usa dado corrompido   │  ← CRASH
└──────────────────────────────────┘     (onde o programa morre)
```

⚠ **As três linhas são diferentes, e cada uma tem um nome.** O relatório do ASan aponta o
**sintoma** (34). O programa morre no **crash** (52). A **causa** está em 32 — a ausência de
verificação.

⚠ **Confundir sintoma com causa é o erro que faz o patch ser errado.** Corrigir a linha 34 (o
`memcpy`) não resolve — o próximo `memcpy` tem o mesmo problema. **Corrigir a 32 resolve.**

**O teste que separa as duas:**

| Hipótese | Como testar |
|---|---|
| A causa é a linha 34 | Corrigir 34 → o bug desaparece? |
| **A causa é a linha 32** | Corrigir 32 → o bug desaparece e **o resto do código também fica seguro**? |

⚠ **A segunda pergunta é a decisiva.** Correção de causa **elimina a classe**; correção de sintoma
elimina **a instância**.

---

## 11.2 `gdb` dirigido — o método em seis passos

⚠ **Não navegue por tentativa. Siga os seis passos.**

```bash
cd ~/fuzz-lab
mkdir -p causa-raiz && cd causa-raiz

# Recompile com -g -O0 para o gdb ser fiel ao fonte
clang -g -O0 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o parser_debug ../alvos/parser_lib.c ../harnesses/parser_main.c

# Copie o crash mínimo do módulo 10
cp ../triagem/min-afl crash.bin 2>/dev/null || cp ../repro-bug01/entrada.bin crash.bin
ls -la crash.bin
```

⚠ **Note o `-O0`.** Para **entender** o bug, `-O0` é melhor: o código segue o fonte, e as variáveis
têm valor real. Para **confirmar** que o bug existe em produção, você usa `-O1`/`-O2` depois.

### Passo 1 — O crash

```bash
gdb -q -batch \
    -ex 'set pagination off' \
    -ex 'run crash.bin' \
    -ex 'bt' \
    -ex 'info registers rip rsp rbp rdi rsi rdx' \
    --args ./parser_debug crash.bin 2>&1 | head -40
```

⚠ **Saída esperada:** o `bt` (backtrace) mostra **onde**. Se o `bt` mostrou só `??` ou endereços,
você compilou sem `-g` — volte e recompile.

**Produza a tabela:**

| Campo | Valor |
|---|---|
| Sinal | |
| `rip` (endereço da falha) | |
| Frame `#0` (função:linha) | |
| Frame `#1` | |
| Frame `#2` | |

⚠ **Registre o `rip`.** Ele diz **em qual instrução** a falha aconteceu — e isso é mais preciso que
o número de linha.

### Passo 2 — O estado das variáveis

⚠ **O passo que o ASan não dá.** Ele diz onde; o `gdb` diz **com que valores**.

```bash
gdb -q -batch \
    -ex 'set pagination off' \
    -ex 'break parser_lib.c:34' \
    -ex 'run crash.bin' \
    -ex 'print c->num_itens' \
    -ex 'print c->tamanho' \
    -ex 'print len' \
    -ex 'print i' \
    -ex 'print dest' \
    -ex 'print sizeof(dest)' \
    --args ./parser_debug crash.bin 2>&1 | tail -25
```

⚠ **Ajuste o número da linha** para a linha real do seu `memcpy`. Para descobrir:

```bash
grep -n 'memcpy' ../alvos/parser_lib.c
```

**Produza:**

| Variável | Valor no crash | Deveria ser | Diferença |
|---|---|---|---|
| `num_itens` | | | |
| `len` | | | |
| `i` | | | |
| `dest` | | | |
| Bytes escritos | | | |
| Tamanho do bloco | | | |

⚠ **A tabela acima é a causa raiz em números.** `num_itens = 8` mas `len` permite apenas 6 → **é
aqui que o bug mora**, e não na linha do `memcpy`.

### Passo 3 — A instrução da falha

```bash
gdb -q -batch \
    -ex 'set pagination off' \
    -ex 'run crash.bin' \
    -ex 'x/12i $rip-24' \
    -ex 'info registers rip' \
    --args ./parser_debug crash.bin 2>&1 | tail -20
```

⚠ **Aqui o curso de assembly paga.** Você lê as instruções ao redor do `rip` e identifica qual
**acesso de memória** falhou. Com ASan, ele insere checagens **antes** do acesso — então o `rip`
cai dentro do código do ASan, e não do seu. **Por isso você precisa do passo 4.**

### Passo 4 — Pelo ASan, sem ambiguidade

⚠ **O truque que economiza tempo:** o ASan já diz **exatamente** o que aconteceu. Use o `gdb` para
o que o ASan **não** diz.

```bash
# O ASan aponta a linha — use-a diretamente
./parser_debug crash.bin 2>&1 | grep -E '#0 |#1 |allocated by|is located' 

# E use o gdb para inspecionar variável NAQUELA linha
LINHA=$(./parser_debug crash.bin 2>&1 | grep -oP '#0 .*?:\K\d+' | head -1)
echo "linha do bug: ${LINHA}"

gdb -q -batch \
    -ex 'set pagination off' \
    -ex "break parser_lib.c:${LINHA}" \
    -ex 'run crash.bin' \
    -ex 'print num_itens' \
    -ex 'print len' \
    --args ./parser_debug crash.bin 2>&1 | tail -12
```

⚠ **A divisão de trabalho entre as ferramentas:**

| Ferramenta | O que ela dá de melhor |
|---|---|
| **ASan** | Tipo exato, linha, tamanho do acesso, quem alocou |
| **gdb** | Valores das **variáveis** naquele momento |
| **Disassembly** | Como chegou ali |

⚠ **Nenhuma das três dá tudo.** Você combina as três — e é por isso que o módulo começa pelos
módulos 1 a 4 (com assembly) e pelo módulo 2 (sanitizer).

### Passo 5 — Rastrear ao ponto de decisão

⚠ **A pergunta que acha a causa:**

> **Qual verificação, se existisse, teria impedido esta entrada de chegar aqui?**

```bash
# Volte até antes da alocação, e veja o que foi verificado
gdb -q -batch \
    -ex 'set pagination off' \
    -ex 'break parser_lib.c:20' \
    -ex 'run crash.bin' \
    -ex 'print num_itens' \
    -ex 'print len' \
    -ex 'print (num_itens * 8)' \
    -ex 'print (len - 12)' \
    --args ./parser_debug crash.bin 2>&1 | tail -15
```

⚠ **A comparação `num_itens * 8` vs. `len - 12` é a causa raiz em uma linha.** Se o primeiro é
maior que o segundo, o loop vai além do buffer. **A verificação ausente é exatamente essa
comparação.**

**Aquela verificação, escrita:**

```c
/* a verificação que falta */
size_t disponivel = len - sizeof(Cabecalho);
if ((size_t)c->num_itens * 8 > disponivel) return -1;
```

⚠ **Note `(size_t)`.** Sem o cast, a multiplicação em 16 bits pode estourar — e você reintroduz o
bug do módulo 3, classe 4.

### Passo 6 — Provar a causa

⚠ **Uma hipótese só é causa quando você a testa dos dois lados.**

```bash
cat > prova_causa.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

entrada="${1:-crash.bin}"
bin="${2:-./parser_debug}"

echo "═══ 1. O crash acontece? ═══"
if "${bin}" "${entrada}" >/dev/null 2>&1; then
    echo "  não crashou — a premissa está errada"
    exit 1
fi
echo "  ✓ crasha (esperado)"

echo
echo "═══ 2. A verificação proposta resolve? ═══"
# Aplique a correção e recompile
cp ../alvos/parser_lib.c ../alvos/parser_lib_fix.c
python3 - <<'PY'
p = "../alvos/parser_lib_fix.c"
s = open(p).read()
# Insere a verificação de limite antes do loop
alvo = "    for (int i = 0; i < c->num_itens; i++) {"
guarda = ("    if ((size_t)c->num_itens * 8 > (size_t)(len - sizeof(Cabecalho)))\n"
          "        return -1;\n\n")
if alvo in s and "num_itens * 8 >" not in s:
    s = s.replace(alvo, guarda + alvo, 1)
    open(p, "w").write(s)
    print("verificação inserida")
else:
    print("⚠ não foi possível inserir — verifique o alvo")
PY

clang -g -O0 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o parser_fix ../alvos/parser_lib_fix.c ../harnesses/parser_main.c 2>&1 | tail -3

if ./parser_fix "${entrada}" >/dev/null 2>&1; then
    echo "  ✓ a correção RESOLVE o crash"
else
    echo "  ⚠ a correção NÃO resolve — a hipótese está errada"
fi

echo
echo "═══ 3. A correção quebra o caso válido? ═══"
if ./parser_fix ../corpus/parser/s1-minima >/dev/null 2>&1; then
    echo "  ✓ entrada válida continua funcionando"
else
    echo "  ⚠ a correção QUEBROU entrada válida"
fi

echo
echo "═══ 4. A entrada mínima é a única que crasha? ═══"
for n in 6 7 8 9 12; do
    python3 - "$n" > /tmp/t.bin <<'PY'
import struct, sys
n = int(sys.argv[1])
sys.stdout.buffer.write(b"FMT1" + struct.pack("<HHI", 1, n, n*8) + b"X"*(n*8))
PY
    ./parser_debug /tmp/t.bin >/dev/null 2>&1 \
      && echo "  num_itens=${n}: ok" \
      || echo "  num_itens=${n}: CRASHA"
done
SCRIPT
chmod +x prova_causa.sh
./prova_causa.sh crash.bin ./parser_debug
```

⚠ **Os quatro testes são a prova completa:**
1. **Confirma** que o crash existe.
2. **Confirma** que a correção resolve.
3. **Descarta** que a correção quebrou o uso legítimo.
4. **Confirma** o limite exato — mostrando onde começa.

⚠ **O teste 4 é o mais valioso**, porque ele dá o **limite numérico** — e é isso que o mantenedor
precisa para entender a severidade.

---

## 11.3 Escrever a causa raiz em uma frase

⚠ **O entregável mais importante do módulo.** O mantenedor lê isto primeiro.

### O formato

```
CAUSA RAIZ:
Em [função] ([arquivo:linha]), o valor [variável] é usado para
[operação] sem verificação contra [limite]. Com entrada [descrição],
[variável] assume [valor], e a operação escreve [N] bytes em um buffer
de [M] bytes, corrompendo [o quê].

A verificação ausente é:
    [código da verificação]
```

### Exemplo completo

```
CAUSA RAIZ:
Em parse() (parser_lib.c:32), o campo num_itens do cabeçalho — controlado
inteiramente pela entrada — é usado como contador de laço sem verificação
contra o espaço disponível no buffer de entrada. Com um arquivo cujo
cabeçalho declara num_itens = 8 e cujo corpo tem apenas 64 bytes, o laço
executa 8 iterações escrevendo 8 bytes cada (64 bytes) em um buffer de
entrada de 64 bytes — mas a partir da iteração 8, o memcpy lê de
buf + 12 + i*8, que está além do fim do buffer alocado.

A verificação ausente é:
    if ((size_t)c->num_itens * 8 > (size_t)(len - sizeof(Cabecalho)))
        return -1;
```

⚠ **Note que a frase nomeia: função, linha, variável, operação, valor, limite, e a consequência.**
Isso é o que o mantenedor precisa — e é o que faz a diferença entre um reporte corrigido na hora e
um reporte que gera cinco e-mails de ida e volta.

---

## 11.4 Quando a causa raiz não é óbvia

⚠ **Nem todo crash tem causa raiz em uma linha.**

| Situação | Como abordar |
|---|---|
| **Crash em biblioteca** | A causa pode estar no **chamador** — verifique o `allocated by` |
| **UAF com múltiplos donos** | Mapeie **quem** liberou e **quem** usou — o bug é no contrato |
| **Corrupção tardia** | Use `watchpoint` no `gdb` para pegar **quando** o dado mudou |
| **Bug em código sem símbolo** | Combine ASan + disassembly + `strace` |
| **Heisenbug** (some no debug) | `-O0` pode esconder — teste em `-O1`/`-O2` |
| **Flaky** | `valgrind`, `-fsanitize=memory`, ou instrumentação adicional |

### `watchpoint` — a ferramenta para corrupção tardia

```bash
gdb -q -batch \
    -ex 'set pagination off' \
    -ex 'break main' \
    -ex 'run crash.bin' \
    -ex 'watch dest[64]' \
    -ex 'continue' \
    -ex 'bt' \
    --args ./parser_debug crash.bin 2>&1 | tail -20
```

⚠ **O `watch` dispara quando o valor muda.** Para corrupção que acontece em outro lugar, é a
ferramenta que responde "**quando** isso mudou" — pergunta que nem ASan nem backtrace respondem.

---

## 11.5 LAB — Causa raiz completa

**Duração:** 120 min

### Passo 1 — Rastreie até a causa (45 min)

```bash
cd ~/fuzz-lab/causa-raiz

# 1. Crash
gdb -q -batch -ex 'set pagination off' -ex 'run crash.bin' -ex 'bt' \
    --args ./parser_debug crash.bin 2>&1 | head -20 > passo1.txt

# 2. Variáveis na linha do bug
LINHA=$(./parser_debug crash.bin 2>&1 | grep -oP '#0 .*?:\K\d+' | head -1)
echo "linha: ${LINHA}"

gdb -q -batch -ex 'set pagination off' \
    -ex "break parser_lib.c:${LINHA}" \
    -ex 'run crash.bin' \
    -ex 'info locals' \
    -ex 'info args' \
    --args ./parser_debug crash.bin 2>&1 | tail -20 > passo2.txt

# 3. Valores antes da alocação
gdb -q -batch -ex 'set pagination off' \
    -ex 'break parser_lib.c:16' \
    -ex 'run crash.bin' \
    -ex 'print *c' \
    -ex 'print len' \
    --args ./parser_debug crash.bin 2>&1 | tail -15 > passo3.txt

cat passo1.txt; echo "───"; cat passo2.txt; echo "───"; cat passo3.txt
```

⚠ **Ajuste o número da linha do passo 3** para a linha onde o cabeçalho é lido. Descubra com
`grep -n 'Cabecalho\|memcmp' ../alvos/parser_lib.c`.

Produza a ficha da causa:

| Elemento | Valor |
|---|---|
| Função | |
| Linha do sintoma | |
| Linha da causa | |
| Variável culpada | |
| Valor no crash | |
| Limite que faltou verificar | |
| **Diferença (valor − limite)** | |

**Responda:**

1. **O sintoma e a causa estão na mesma linha?** Se não, quantas linhas separam?
2. Que **variável** tem valor fora do razoável? Qual deveria ser?
3. A comparação `num_itens × 8` vs. `len − 12` fecha? Mostre os números.
4. **Qual verificação, se existisse, teria impedido o crash?** Escreva o código.

### Passo 2 — Prove a causa (40 min)

```bash
cd ~/fuzz-lab/causa-raiz
chmod +x prova_causa.sh
./prova_causa.sh crash.bin ./parser_debug 2>&1 | tee prova.txt
```

Produza `prova-causa.md`:

| Teste | Resultado | O que prova |
|---|---|---|
| 1. Crash existe | | |
| 2. Correção resolve | | |
| 3. Entrada válida funciona | | |
| **4. Limite numérico** | | |

**Responda:**

1. O teste 2 **resolveu**? Se não, sua hipótese está errada — e você precisa revisar.
2. O teste 3 manteve o uso legítimo? Se quebrou, a correção foi **restritiva demais**.
3. **Em qual `num_itens` o crash começa?** Esse número é a informação.
4. A correção **elimina a classe** ou só a instância? Justifique.

⚠ **A resposta 4 é a distinção do §11.1.** Uma correção que adiciona `if (num_itens > 1000)` resolve
**aquela** entrada. Uma que compara com `len` resolve **a classe** — porque vale para qualquer
entrada.

### Passo 3 — Escreva a causa raiz (25 min)

Produza `causa-raiz.md` seguindo **exatamente** o formato do §11.3:

```markdown
## CAUSA RAIZ
Em [função] ([arquivo:linha]), o valor [variável] é usado para [operação] sem
verificação contra [limite]. Com entrada [descrição], [variável] assume [valor],
e a operação escreve [N] bytes em um buffer de [M] bytes, corrompendo [o quê].

A verificação ausente é:
    [código]
```

**Depois:**

1. A frase **nomeia** todos os elementos? (função, linha, variável, operação, valor, limite)
2. Um mantenedor que nunca viu o código entenderia? **Teste:** dê a alguém e peça para explicar de
   volta.
3. **A correção proposta elimina a classe** ou a instância?
4. Você escreveria essa frase para um **gerente**, ou só para o mantenedor? O que mudaria?

⚠ **A resposta 4 é a preparação do módulo 12.** O reporte técnico e o resumo executivo são
documentos diferentes — e o módulo 12 formaliza os dois.

### Passo 4 — Confirme em `-O1` (10 min)

⚠ **O teste que confirma que o bug é real em produção.**

```bash
cd ~/fuzz-lab/causa-raiz

# Recompile com -O1 (otimização de produção)
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o parser_O1 ../alvos/parser_lib.c ../harnesses/parser_main.c

echo "═══ -O0 ═══"
./parser_debug crash.bin >/dev/null 2>&1; echo "código: $?"
echo "═══ -O1 ═══"
./parser_O1 crash.bin >/dev/null 2>&1; echo "código: $?"

# A assinatura mudou?
echo
echo "-O0:"; ./parser_debug crash.bin 2>&1 | grep -m1 '#0 '
echo "-O1:"; ./parser_O1    crash.bin 2>&1 | grep -m1 '#0 '
```

**Responda:**

1. O crash **persiste** em `-O1`? **Isso é o que confirma que é real.**
2. A assinatura mudou entre `-O0` e `-O1`? Se sim, o que isso indica?
3. Se **não** crashasse em `-O1`, o que você faria com o reporte?
4. Por que você usou `-O0` para **entender** e `-O1` para **confirmar**?

### Critérios de aceitação

- `passo1/2/3.txt` com a saída real do `gdb` — backtrace e variáveis.
- Ficha da causa com os **valores numéricos** reais.
- Você identificou **quantas linhas separam** sintoma e causa.
- `prova-causa.md` com os **quatro** testes e o **limite numérico** identificado.
- Você explicou se a correção elimina a **classe** ou a **instância**.
- `causa-raiz.md` no formato do §11.3, com **todos** os elementos nomeados.
- Você testou a clareza da frase com outra pessoa, ou explicou como testaria.
- Crash confirmado em **`-O1`**, com a assinatura comparada.

---

## Avaliação

1. Diferencie sintoma, causa e crash. Dê as três linhas do exemplo.
2. Por que corrigir o sintoma não resolve o bug? O que corrigir a causa faz de diferente?
3. Qual pergunta você faz para achar a causa? ("Qual verificação...")
4. Descreva os seis passos do método de `gdb` dirigido.
5. Por que o `rip` é mais preciso que o número de linha?
6. O que o ASan dá que o `gdb` não dá, e vice-versa?
7. Por que dividir o trabalho entre ASan, `gdb` e disassembly, em vez de usar só um?
8. **Quais são os quatro testes da prova de causa?** Por que o quarto é o mais valioso?
9. O que o teste "a correção quebra o caso válido?" descarta?
10. Por que a correção precisa de `(size_t)` no cast?
11. Quando a causa raiz **não** está em uma linha? Dê dois exemplos.
12. Para que serve `watchpoint`, e que pergunta ele responde que ninguém mais responde?
13. Por que `-O0` para entender e `-O1` para confirmar?
14. Se o crash não persiste em `-O1`, o que você faz com o reporte?

---

**Próximo:** [Módulo 12 — Do achado ao reporte](modulo-12.md)
