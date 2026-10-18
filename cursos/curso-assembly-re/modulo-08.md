# Módulo 8 — Patch Diffing e Automação

**Carga:** 2 horas (30 min teoria · 1h30 lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Explicar o que é patch diffing e por que ele acelera a análise.
2. Comparar duas versões de um binário por métricas de código, não só por texto.
3. Isolar a função que mudou e analisá-la com o método do Módulo 6.
4. Automatizar a comparação de funções com script.
5. Reconhecer as limitações do patch diffing em binário otimizado.

---

## ⚠ Ética e escopo

Patch diffing é a técnica central de pesquisa de vulnerabilidade: você compara a versão antes e
depois de um patch e descobre **o que foi consertado** — e portanto **o que estava vulnerável**.

Isso é extremamente poderoso, e é uma área onde a linha é fina:

- **Legítimo:** pesquisador de segurança analisando software para reportar falha ao fornecedor;
  auditor verificando se um patch foi realmente aplicado; entender uma correção divulgada.
- **Limite:** usar o diff para construir exploit antes de o fornecedor corrigir, ou contra
  sistema que não é seu.
- **Não legítimo:** usar o diff para atacar terceiros.

⚠ **A regra prática:** se você usar patch diffing para encontrar uma falha e explorá-la, ela
precisa ser no seu sistema, ou com autorização escrita, ou reportada ao fornecedor de forma
responsável. Descobrir a falha é pesquisa. Usá-la sem autorização é crime.

O lab deste módulo usa código próprio, escrito para o curso. Sem ambiguidade.

---

## 8.1 O que é patch diffing

Software recebe atualizações. Cada atualização corrige coisas — inclusive falhas de segurança.
A ideia do patch diffing:

> Se você comparar a versão antiga com a nova e isolar exatamente o que mudou,
> e a correção conserta uma vulnerabilidade, então você encontrou a vulnerabilidade.

É por isso que fornecedores às vezes atrasam detalhes de correção crítica: enquanto o binário
não circula, ninguém consegue fazer o diff e derivar o exploit.

### Por que a técnica funciona

Um binário grande tem talvez 50.000 funções. Uma atualização altera umas 200. **Ninguém vai ler
50.000 funções.** Mas comparando com a versão anterior, você reduz o espaço de análise a 200 — e
dessas, talvez 5 sejam realmente interessantes.

Isso muda a escala do trabalho de impossível para viável.

---

## 8.2 Comparando dois binários: ordem de ataque

### Passo 1 — O que mudou no macro

```bash
# Tamanho e hash
ls -l v1 v2
sha256sum v1 v2

# Strings novas — o atalho mais barato que existe
strings -n 6 v1 | sort -u > s1.txt
strings -n 6 v2 | sort -u > s2.txt
diff s1.txt s2.txt | head -60
```

Novas strings frequentemente **nomeiam a funcionalidade adicionada**. Se você vê uma string
`"validating buffer length"` que não existia na v1, você tem um alvo.

### Passo 2 — Símbolos e imports

```bash
nm --defined-only v1 | grep ' T ' | awk '{print $3}' | sort > f1.txt
nm --defined-only v2 | grep ' T ' | awk '{print $3}' | sort > f2.txt
diff f1.txt f2.txt
```

**Funções novas e funções removidas**, diretamente. Se o binário é *stripped*, você pula este
passo — e é aí que a técnica fica trabalhosa.

### Passo 3 — Tamanho por função

```bash
for v in v1 v2; do
    nm --defined-only "$v" | grep ' T ' | while read -r addr type name; do
        echo "$name"
    done | sort -u > "nomes-$v.txt"
done
```

Depois, para cada função comum, compare os bytes gerados:

```bash
#!/usr/bin/env bash
#
# funcsizes.sh — tamanho de cada função, para comparar entre versões
#
BIN="${1:?uso: funcsizes.sh <binario>}"
OUT="${2:-sizes.txt}"

nm --defined-only "${BIN}" | grep ' T ' | awk '{print $1, $3}' | sort -k1,1 > /tmp/syms.txt

: > "${OUT}"
while read -r addr name; do
    next=$(awk -v a="${addr}" '$1 > a {print $1; exit}' /tmp/syms.txt)
    if [[ -n "${next}" ]]; then
        size=$(( 16#${next} - 16#${addr} ))
        printf '%s\t%d\n' "${name}" "${size}"
    fi
done < /tmp/syms.txt >> "${OUT}"

sort -k2,2nr "${OUT}"
```

```bash
./funcsizes.sh v1 s1-sizes.txt
./funcsizes.sh v2 s2-sizes.txt
join -j 1 <(sort s1-sizes.txt) <(sort s2-sizes.txt) \
  | awk '$2 != $3 {print $1, "antes=" $2, "depois=" $3, "delta=" $3-$2}' \
  | sort -k4,4nr
```

**Uma função que mudou de tamanho é uma função que mudou.** Este é o filtro mais eficaz para
binário sem símbolos também — porque você não precisa do nome, só do endereço.

### Passo 4 — Hash de função

Mais preciso que tamanho: calcule o hash do corpo de cada função e compare.

```bash
#!/usr/bin/env bash
#
# funchash.sh — hash do corpo de cada função
# Uso: ./funchash.sh <binario> <saida.tsv>
#
BIN="${1:?uso: funchash.sh <binario> <saida.tsv>}"
OUT="${2:?informe saída}"

nm --defined-only "${BIN}" | grep ' T ' | awk '{print $1, $3}' | sort -k1,1 > /tmp/fh-syms.txt

: > "${OUT}"
while read -r addr name; do
    next=$(awk -v a="${addr}" '$1 > a {print $1; exit}' /tmp/fh-syms.txt)

    if [[ -n "${next}" ]]; then
        inicio=$(( 16#${addr} ))
        tamanho=$(( 16#${next} - inicio ))
        hash=$(dd if="${BIN}" bs=1 skip="${inicio}" count="${tamanho}" 2>/dev/null \
               | sha256sum | cut -c1-16)
        printf '%s\t%s\t%d\t%s\n' "${name}" "${addr}" "${tamanho}" "${hash}"
    fi
done < /tmp/fh-syms.txt >> "${OUT}"

echo "gerado ${OUT}" >&2
```

```bash
./funchash.sh v1 h1.tsv
./funchash.sh v2 h2.tsv

join -j 1 <(sort -k1,1 h1.tsv) <(sort -k1,1 h2.tsv) \
  | awk -F'\t' '$4 != $7 {print $1, "MUDOU"}'
```

N N **Problema:** `skip` em `dd` é por byte, o arquivo é um ELF, e o `addr` é um endereço
**virtual** — não o offset no arquivo. Para binário simples isso funciona razoavelmente, mas o
método correto usa a tabela de seções para converter endereço virtual em offset. Uma versão
precisa:

```bash
# Descubra o offset de .text e o endereço virtual de .text
readelf -S binario | grep -A1 '\.text'
# Address e Offset vêm aí; a diferença é o "load bias"
```

Melhor ainda: deixe o `objdump` fazer o trabalho, e compare o **texto do disassembly** por
função, depois de normalizar endereços.

### Passo 5 — Diff de disassembly normalizado

Abordagem mais robusta e a que você vai usar na prática:

```bash
#!/usr/bin/env bash
#
# normaliza.sh — disassembly normalizado por função
# Uso: ./normaliza.sh <binario> <saida>
#
BIN="${1:?uso: normaliza.sh <binario> <saida>}"
OUT="${2:?informe saída}"

objdump -d -M intel --no-show-raw-insn "${BIN}" \
  | awk '
    /^[0-9a-f]+ <.+>:/ {
        if (fn != "") print ""
        fn = $0
        print fn
        next
    }
    /^ *[0-9a-f]+:/ {
        # remove endereço; mantém mnemônico e operandos
        sub(/^ *[0-9a-f]+:\t/, "")
        # normaliza endereços absolutos no operando (PIE)
        gsub(/0x[0-9a-f]{6,}/, "ADDR")
        gsub(/[0-9a-f]+ </, "ADDR <")
        print
    }
  ' > "${OUT}"

echo "gerado ${OUT}" >&2
```

Depois compare função a função:

```bash
normaliza.sh v1 n1.txt
normaliza.sh v2 n2.txt
diff -u n1.txt n2.txt | head -100
```

A normalização é essencial: sem ela, o diff aponta diferença em tudo, porque cada endereço mudou.

---

## 8.3 Análise da função que mudou

Agora você tem uma função e sabe que ela mudou. Aplique o Módulo 6:

1. Disassembly da versão antiga e da nova, lado a lado.
2. Identifique o **delta real**: normalmente são poucas instruções.
3. Entenda o que a instrução nova faz.
4. Pergunte: **que tipo de entrada a versão antiga aceitava e a nova rejeita?**

Exemplo de delta típico de correção de falha:

```asm
; v1 — sem verificação de limite
    mov  rax, QWORD PTR [rdi+0x8]     ; pega o tamanho do usuário
    mov  rcx, QWORD PTR [rdi+0x10]    ; pega o buffer
    mov  BYTE PTR [rcx+rax], 0        ; escreve NO FINAL DO BUFFER ← aqui
    ret
```

```asm
; v2 — com verificação
    mov  rax, QWORD PTR [rdi+0x8]
    cmp  rax, 0x100                   ; NOVO: limite máximo
    ja   .erro                        ; NOVO: rejeita se maior
    mov  rcx, QWORD PTR [rdi+0x10]
    mov  BYTE PTR [rcx+rax], 0
    ret
.erro:
    mov  eax, -1
    ret
```

**Isso é a essência do patch diffing.** Duas linhas de delta, e você acabou de localizar a
vulnerabilidade, entender o tipo (buffer overflow), e saber como era explorada (tamanho > 0x100).

---

## 8.4 Limitações — leia antes de confiar

Patch diffing é poderoso e **falha de formas específicas**:

| Limitação | Consequência |
|---|---|
| **Otimizações** | Recompilação com compilador diferente muda tudo, mesmo sem mudança de código |
| **Inlining** | Uma função que mudou pode não existir mais; a lógica migrou para o chamador |
| **Reordenação** | O compilador reordena funções; diff por endereço quebra |
| **Binário stripped** | Você não tem nomes; correlacionar funções vira problema de heurística |
| **Mudança em biblioteca** | O delta pode ser só uma versão nova de dependência, não do programa |
| **Build não-determinístico** | Seções de metadata, timestamps, BuildID mudam sempre |

**Moral:** o delta que você encontra é **suspeito**, não **prova**. Você precisa ler a função
e entender o que ela faz. Diff aponta; análise decide.

### A boa notícia

Fornecedores de software de sistema geralmente compilam com a mesma toolchain entre versões
menores. Nesse caso, patches são pequenos e localizados — e o diff funciona muito bem. É assim
que muitas vulnerabilidades públicas são descobertas.

---

## 8.5 LAB — Patch diff de duas versões

**Duração:** 90 min
**Objetivo:** comparar duas versões de um programa, isolar a função que mudou e reconstruir a
correção.

### Passo 1 — As duas versões

```bash
mkdir -p ~/re-lab/lab8 && cd ~/re-lab/lab8

cat > v1.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

struct pacote {
    unsigned int  tamanho;
    char          dados[256];
    unsigned int  flags;
};

/* Converte um pacote recebido em string terminada em NUL.
   Esta é a função que vai mudar entre versões. */
int monta_pacote(struct pacote *p, const char *entrada) {
    unsigned int n = strlen(entrada);

    p->tamanho = n;
    memcpy(p->dados, entrada, n);
    p->dados[n] = '\0';
    p->flags = 0;

    return (int)p->tamanho;
}

int processa(const char *entrada) {
    struct pacote p;
    memset(&p, 0, sizeof(p));

    int n = monta_pacote(&p, entrada);
    printf("tamanho=%d dados=%s\n", n, p.dados);

    return n;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "uso: %s <texto>\n", argv[0]);
        return 2;
    }
    return processa(argv[1]) > 0 ? 0 : 1;
}
EOF

cat > v2.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

struct pacote {
    unsigned int  tamanho;
    char          dados[256];
    unsigned int  flags;
};

/* VERSÃO CORRIGIDA: verifica limite antes de copiar */
int monta_pacote(struct pacote *p, const char *entrada) {
    unsigned int n = strlen(entrada);

    if (n >= sizeof(p->dados)) {
        fprintf(stderr, "erro: entrada excede o limite (%u)\n", n);
        return -1;
    }

    p->tamanho = n;
    memcpy(p->dados, entrada, n);
    p->dados[n] = '\0';
    p->flags = 0;

    return (int)p->tamanho;
}

int processa(const char *entrada) {
    struct pacote p;
    memset(&p, 0, sizeof(p));

    int n = monta_pacote(&p, entrada);
    if (n < 0)
        return -1;

    printf("tamanho=%d dados=%s\n", n, p.dados);
    return n;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "uso: %s <texto>\n", argv[0]);
        return 2;
    }
    return processa(argv[1]) > 0 ? 0 : 1;
}
EOF

gcc -O1 -o v1 v1.c
gcc -O1 -o v2 v2.c
cp v1 v1-strip && strip v1-strip
cp v2 v2-strip && strip v2-strip
```

⚠ Para o diff funcionar bem, **o resto do programa precisa ser idêntico entre versões.** Aqui
é: só `monta_pacote` e `processa` mudaram. É o cenário ideal do patch diffing.

### Passo 2 — Diff macro

```bash
ls -l v1 v2
sha256sum v1 v2

strings -n 6 v1 | sort -u > s1.txt
strings -n 6 v2 | sort -u > s2.txt
diff s1.txt s2.txt
```

Responda: **qual string nova aparece na v2?** Ela revela algo sobre a correção?

### Passo 3 — Diff por tamanho de função

```bash
nm --defined-only v1 | grep ' T ' | awk '{print $1, $3}' | sort -k1,1 > syms1.txt
nm --defined-only v2 | grep ' T ' | awk '{print $1, $3}' | sort -k1,1 > syms2.txt

# Tamanho de cada função
for v in 1 2; do
  : > "sizes$v.txt"
  while read -r addr name; do
    next=$(awk -v a="$addr" '$1 > a {print $1; exit}' "syms$v.txt")
    [[ -n "$next" ]] && printf '%s\t%d\n' "$name" $((16#$next - 16#$addr)) >> "sizes$v.txt"
  done < "syms$v.txt"
done

join -j 1 <(sort sizes1.txt) <(sort sizes2.txt) \
  | awk '$2 != $3 {print $1, "antes=" $2, "depois=" $3, "delta=" $3-$2}'
```

Você deve ver **duas** funções mudando: `monta_pacote` e `processa`. Exatamente as duas que
mudaram no código. Isso valida o método.

### Passo 4 — Diff de disassembly normalizado

```bash
# Normalize manualmente (sem a função pronta, para você ver o processo)
objdump -d -M intel --no-show-raw-insn v1 \
  | sed -E 's/^ *[0-9a-f]+:\t//; s/0x[0-9a-f]{6,}/ADDR/g' > n1.txt
objdump -d -M intel --no-show-raw-insn v2 \
  | sed -E 's/^ *[0-9a-f]+:\t//; s/0x[0-9a-f]{6,}/ADDR/g' > n2.txt

diff -u n1.txt n2.txt | grep -A 20 'monta_pacote'
```

### Passo 5 — Isolar o delta e reconstruir a correção

Este é o entregável principal. Produza `analise-patch.md` com:

1. **O delta exato:** as instruções que existem na v2 e não na v1, dentro de `monta_pacote`.
2. **O que a v2 verifica:** qual valor é comparado, com qual limite.
3. **O que a v1 fazia de errado:** explique em termos de C — que entrada causava o quê.
4. **O tipo de falha:** dê o nome técnico e explique o impacto.
5. **Prova por entrada:** encontre uma entrada que se comporta diferente entre as duas versões.

Para o item 5:

```bash
# Entrada curta: comportamento igual
./v1 curto; echo "v1=$?"
./v2 curto; echo "v2=$?"

# Entrada longa: comportamento diferente
LONGO=$(python3 -c "print('A'*300)")
./v1 "$LONGO"; echo "v1=$?"
./v2 "$LONGO"; echo "v2=$?"
```

⚠ **Nada aqui é explorado** — a única "exploração" é mostrar que a v2 rejeita o que a v1 aceitava.
Isso é análise, não ataque, e o alvo é seu.

### Passo 6 — Repita com binário stripped

```bash
diff -u <(objdump -d -M intel --no-show-raw-insn v1-strip | sed -E 's/^ *[0-9a-f]+:\t//; s/0x[0-9a-f]{6,}/ADDR/g') \
        <(objdump -d -M intel --no-show-raw-insn v2-strip | sed -E 's/^ *[0-9a-f]+:\t//; s/0x[0-9a-f]{6,}/ADDR/g') \
  | head -60
```

Responda:

- Sem símbolos, você consegue localizar a função que mudou?
- O que o diff mostra agora que atrapalha? (Dica: endereços, reordenação.)
- Como você correlacionaria as funções sem os nomes? Descreva a heurística que usaria.

### Passo 7 — Automatize

Escreva `patchdiff.sh` que recebe dois binários e produz um relatório:

```
Uso: ./patchdiff.sh <binario-v1> <binario-v2> [-o relatorio.md]

Saída:
- Tamanhos e hashes dos dois arquivos
- Strings novas e removidas
- Funções novas, removidas e alteradas (por tamanho)
- Funções alteradas (por hash do corpo)
- Diff normalizado das funções alteradas
```

O script deve funcionar com binário *stripped* (caindo para comparação por endereço em vez de
nome) e produzir Markdown, não texto solto. Requisitos: `set -euo pipefail`, `getopts`,
código de saída `0` se achou diferenças e `1` se não achou, e `shellcheck` limpo.

### Critérios de aceitação

- Você identificou as **duas** funções que mudaram, por dois métodos independentes.
- Você isolou o delta exato de `monta_pacote` e o explicou instrução por instrução.
- Você nomeou o tipo de falha corrigida.
- Você provou a diferença de comportamento com uma entrada concreta.
- Você comparou o cenário com símbolos e sem símbolos, e explicou a diferença de dificuldade.
- `patchdiff.sh` funciona com binário stripped e produz Markdown.
- Você listou ao menos três limitações do patch diffing que você **observou** no lab.

---

## Projeto final

Escolha um:

**A) Análise completa de binário desconhecido.** Pegue um programa seu (ou um utilitário do
sistema, cujo código-fonte você pode consultar depois para conferir). Produza um relatório de
análise reversa completo: triagem, reconstrução das três funções mais interessantes, reconstrução
das estruturas de dados usadas, e um diagrama de fluxo de `main`. Valide suas reconstruções
comparando com o assembly gerado a partir do código-fonte real.

**B) Ferramenta de análise.** Construa uma ferramenta que automatize parte do método do Módulo 6:
por exemplo, um script que recebe um binário e produz um relatório de triagem com imports
agrupados por categoria de risco, strings classificadas, detecção de empacotamento por entropia,
e uma lista das funções candidatas a análise prioritária. Documente as decisões de projeto —
não só o que faz, mas por que escolheu cada heurística.

**Critérios:** correção técnica, método explícito, validação das conclusões, e documentação que
outra pessoa consiga seguir.

---

## Avaliação

1. O que é patch diffing e por que ele reduz o espaço de análise? Explique com números.
2. Por que comparar o tamanho de funções é um filtro eficaz, mesmo em binário sem símbolos?
3. Por que o diff de disassembly precisa ser normalizado? O que acontece sem normalização?
4. Que sinais indicam que uma função foi modificada, além do tamanho?
5. No exemplo da correção com `cmp rax, 0x100`, o que você deduz sobre a falha original?
6. Por que o delta encontrado por diff é suspeito e não prova?
7. Liste quatro limitações de patch diffing e explique cada uma.
8. O que o inlining faz com o patch diffing?
9. Em binário sem símbolos, como você correlaciona funções entre versões? Descreva duas heurísticas.
10. Por que pacote de software costuma publicar só o binário corrigido e não os detalhes da
    correção, em casos de falha crítica?

---

## Encerramento do curso

Você começou sem saber o que era um registrador e agora consegue pegar um binário sem símbolos,
encontrar uma função, reconstruir a estrutura de dados que ela usa, escrever o C equivalente, e
validar que sua reconstrução está certa.

O que você aprendeu não foi decorar instruções. Foi um **método**: reconhecer, localizar,
delimitar, anotar, identificar padrões, reconstruir, validar. Um método que funciona em qualquer
binário, em qualquer arquitetura que você aprender depois.

A última coisa, e a que vale mais: **a técnica é neutra; o uso não é.** Você tem agora a
capacidade de olhar dentro de software que não é seu. Isso serve para proteger — encontrar falhas
e corrigir, entender malware para defender, verificar o que roda nas suas máquinas. E serve para
o contrário. O que decide é autorização, escopo e intenção, sempre documentados antes de começar.

Referências para continuar: **Intel SDM** · **System V ABI** · **GNU Binutils/GDB docs** ·
**Ghidra** · **"Reverse Engineering for Beginners", Dennis Yurichev** (livre) · **MITRE ATT&CK**
