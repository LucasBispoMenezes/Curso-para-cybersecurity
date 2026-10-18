# Módulo 10 — Minimização e Reprodução

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 9

---

## Objetivos

1. Entender por que a entrada mínima é indispensável para o reporte.
2. Minimizar com `afl-tmin` e com o `-minimize_crash` do libFuzzer.
3. Minimizar **preservando a propriedade** (mesmo bug, não "algum crash").
4. Provar que o crash é determinístico, com evidência.
5. Escrever o caso mínimo para o mantenedor.

---

## ⚠ Conduta

Alvo próprio. Se o crash vem de projeto real, o módulo 12 governa o reporte.

---

## 10.1 Por que a entrada mínima importa

⚠ **Um crash de 400 KB é quase inútil para o mantenedor.** Um crash de 28 bytes é um presente.

| Entrada grande | Entrada mínima |
|---|---|
| Mantenedor não sabe **qual campo** causa | Você dá o campo exato |
| Depurador fica ilegível | Um passo no `gdb` |
| Verificar a correção é trabalhoso | Trivial |
| Pode ter **vários** bugs misturados | Um bug, provável |
| Não vira teste de regressão | **Vira teste de regressão** |

⚠ **A última linha é a razão decisiva.** A entrada mínima é o que se torna **caso de teste
permanente** no projeto. É o que impede o bug de voltar — e é o que o módulo 12 formaliza como
regressão.

⚠ **E há um efeito secundário valioso:** o processo de minimização **frequentemente revela o bug**.
Ao remover bytes e ver o crash persistir, você descobre qual campo importa, e caminha direto para a
causa raiz do módulo 11.

---

## 10.2 As ferramentas

| Ferramenta | Quando usar | Preserva o quê |
|---|---|---|
| **`afl-tmin`** | Entrada do AFL++ | **O caminho/crash específico** |
| **`-minimize_crash=1`** (libFuzzer) | Entrada do libFuzzer | O crash |
| `afl-tmin -e` | Entrada do AFL++ | Só **executa**, não crasha |
| `creduce` / `cvise` | Redução de **código-fonte** | O bug |
| Redução manual | Quando automático estagna | Você decide |

### `afl-tmin`

```bash
cd ~/fuzz-lab

# Minimizar preservando o crash
afl-tmin -i triagem/crashes/id-0000 -o triagem/min-0000 -- \
    ./alvos/parser_asan_triagem @@

echo "antes:  $(stat -c%s triagem/crashes/id-0000) bytes"
echo "depois: $(stat -c%s triagem/min-0000) bytes"
```

⚠ **O `afl-tmin` roda o binário centenas de vezes.** Para entrada de 400 KB, pode levar minutos.
É normal — e o resultado compensa.

⚠ **A opção `-e` é para casos diferentes:** com ela, o `afl-tmin` preserva a **execução** (não o
crash). Útil quando você quer minimizar a entrada que **chega** ao código, não a que o quebra.

### `-minimize_crash` do libFuzzer

```bash
# Minimizar uma entrada do libFuzzer
./harnesses/parser_fuzz -minimize_crash=1 triagem/crashes/id-0000 \
    -exact_artifact_path=triagem/min-libfuzzer.bin 2>&1 | tail -10
```

⚠ **A diferença entre as duas:** o libFuzzer reduz **por número de bytes**, o `afl-tmin` reduz
**por cobertura*. Na prática, teste as duas e fique com a menor.

---

## 10.3 Preservar a **mesma propriedade**

⚠ **O erro mais comum de minimização: reduzir até "algum crash", não o seu.**

```
ENTRADA ORIGINAL
    │
    ├── reduz demais → agora crasha em OUTRO bug
    │                  ⚠ você acha que minimizou, mas trocou de bug
    │
    └── reduz corretamente → mesmo bug, mesma linha, entrada menor
```

**O teste obrigatório depois de minimizar:**

```bash
# 1. A entrada minimizada produz o MESMO erro?
echo "═══ ORIGINAL ═══"
./alvos/parser_asan_triagem triagem/crashes/id-0000 2>&1 | \
    grep -E 'ERROR: AddressSanitizer|#0 ' | head -2

echo
echo "═══ MINIMIZADA ═══"
./alvos/parser_asan_triagem triagem/min-0000 2>&1 | \
    grep -E 'ERROR: AddressSanitizer|#0 ' | head -2

echo
echo "═══ São iguais? ═══"
diff <(./alvos/parser_asan_triagem triagem/crashes/id-0000 2>&1 | grep -E 'ERROR|#0 ' | head -2) \
     <(./alvos/parser_asan_triagem triagem/min-0000    2>&1 | grep -E 'ERROR|#0 ' | head -2) \
  && echo "✓ mesmo bug preservado" || echo "⚠ BUG DIFERENTE — minimização trocou de bug"
```

⚠ **E o teste de múltiplas execuções:**

```bash
# O crash é determinístico?
for i in 1 2 3 4 5; do
    ./alvos/parser_asan_triagem triagem/min-0000 >/dev/null 2>&1
    echo "execução ${i}: código $?"
done
```

⚠ **Cinco execuções com o mesmo resultado é o mínimo aceitável.** Se variar, o crash é **flaky** —
e flaky pode ser:
- estado residual no harness (módulo 4)
- dependência de memória (alocação em endereço que às vezes é válido)
- dependência de tempo

⚠ **Crash flaky não é reportável.** O mantenedor não vai conseguir reproduzir, e o reporte é
descartado. **Investigar até virar determinístico, ou declarar como flaky e não reportar.**

---

## 10.4 Reprodução — o pacote que o mantenedor precisa

⚠ **O que você entrega não é "o arquivo". É um pacote reprodutível.**

```
repro-bug01/
├── entrada.bin              ← a entrada mínima
├── SHA256SUMS               ← hash da entrada
├── README.md                ← como reproduzir
├── relatorio-asan.txt       ← a saída completa do ASan
├── build.sh                 ← como compilar com o sanitizer
└── comando.txt              ← a linha exata
```

```bash
cd ~/fuzz-lab
mkdir -p repro-bug01
cp triagem/min-0000 repro-bug01/entrada.bin 2>/dev/null || \
    cp triagem/crashes/id-0000 repro-bug01/entrada.bin
cd repro-bug01

sha256sum entrada.bin > SHA256SUMS
./../alvos/parser_asan_triagem entrada.bin > relatorio-asan.txt 2>&1 || true

cat > comando.txt <<'EOF'
./parser_asan entrada.bin
EOF

cat > build.sh <<'EOF'
#!/usr/bin/env bash
# Compila o alvo com o sanitizer exato do reporte
set -euo pipefail
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o parser_asan parser_lib.c parser_main.c
echo "compilado: parser_asan"
EOF
chmod +x build.sh

cat > README.md <<'EOF'
# Reprodução — heap-buffer-overflow em parse()

## Como reproduzir
```bash
./build.sh
./parser_asan entrada.bin
```

## Resultado esperado
`ERROR: AddressSanitizer: heap-buffer-overflow` em `parse()`.

## Ambiente do reporte
- clang: (versão de `clang --version`)
- ASan + UBSan
- x86-64 Linux
- Commit: (o hash do código)

## Integridade
`sha256sum -c SHA256SUMS`

## Determinístico
Verificado em 5 execuções consecutivas, todas com o mesmo resultado.
EOF

ls -la
cat SHA256SUMS
```

⚠ **O `build.sh` e o `README.md` são o que fazem o mantenedor conseguir reproduzir.** Sem eles,
você entrega um arquivo e uma frase — e ele gasta uma hora descobrindo como compilar. **Isso
atrasa a correção, e é trabalho que você já fez.**

⚠ **A linha "Commit" é importante.** Se você reporta sobre uma versão, e o projeto mudou, o
mantenedor precisa saber sobre qual código o bug existe. Sempre inclua o hash do commit.

---

## 10.5 Quando a minimização estagna

⚠ **Nem sempre o automático chega ao mínimo.**

| Situação | O que fazer |
|---|---|
| `afl-tmin` para em 40 bytes e não desce | Redução manual: remova bytes um por um |
| Reduzir remove o crash | Aquele byte **importa** — é a informação |
| O crash precisa de cabeçalho completo | Minimize só o **corpo** |
| Precisa de dois campos relacionados | Minimize mantendo a relação |
| O bug exige tamanho específico | O tamanho **é** a informação |

### Redução manual guiada

```bash
cat > triagem/scripts/reduz_manual.py <<'PY'
#!/usr/bin/env python3
"""
reduz_manual.py — redução byte-a-byte guiada pelo próprio crash.
Remove bytes enquanto o crash persistir.
Uso: python3 reduz_manual.py <binario> <entrada> <saida>
"""
import subprocess, sys, os, shutil

BIN, ENTRADA, SAIDA = sys.argv[1], sys.argv[2], sys.argv[3]

def crasha(caminho):
    try:
        p = subprocess.run([BIN, caminho], capture_output=True, timeout=10)
        return p.returncode != 0
    except subprocess.TimeoutExpired:
        return True

if not crasha(ENTRADA):
    sys.exit("a entrada de partida não crasha — nada a reduzir")

dados = bytearray(open(ENTRADA, "rb").read())
tam_inicial = len(dados)
tmp = "/tmp/reduz-teste"

i = 0
while i < len(dados):
    tentativa = dados[:i] + dados[i+1:]
    open(tmp, "wb").write(tentativa)
    if crasha(tmp):
        dados = bytearray(tentativa)      # removido com sucesso
        # não avança i — o próximo byte agora está em posição i
    else:
        i += 1

open(SAIDA, "wb").write(bytes(dados))
print(f"{tam_inicial} → {len(dados)} bytes "
      f"({100 - len(dados)*100//tam_inicial}% de redução)")
print(f"salvo em {SAIDA}")
PY
chmod +x triagem/scripts/reduz_manual.py

python3 triagem/scripts/reduz_manual.py \
    ./alvos/parser_asan_triagem triagem/min-0000 triagem/min-0000-manual 2>/dev/null || \
python3 triagem/scripts/reduz_manual.py \
    ./alvos/parser_asan_triagem triagem/crashes/id-0000 triagem/min-manual
```

⚠ **A redução manual confirma o mesmo teste que o `afl-tmin`:** o byte só é removido se o crash
**persistir**. E o teste é o **código de saída** — não a mensagem. Isso é deliberado: o teste é mais
rápido, e o código de saída é suficiente para "ainda crasha".

⚠ **Mas atenção:** o teste por código de saída pode **trocar de bug** (qualquer crash serve). Depois
da redução manual, **rode o teste de mesma-assinatura** do §10.3.

---

## 10.6 LAB — Minimizar e empacotar

**Duração:** 120 min

### Passo 1 — Minimize um crash (40 min)

```bash
cd ~/fuzz-lab

# Escolha o grupo maior da triagem do módulo 9 (o que tem mais membros)
python3 - <<'PY'
import json
g = json.load(open("triagem/grupos.json"))
maior = max(g, key=lambda x: x["n_crashes"])
print("grupo maior:", maior["grupo"], "com", maior["n_crashes"], "crashes")
print("representante:", maior["menor"])
open("/tmp/rep.txt", "w").write(maior["menor"])
PY

REP=$(cat /tmp/rep.txt)
echo "usando: ${REP}"

# Minimize com afl-tmin
afl-tmin -i "triagem/crashes/${REP}" -o "triagem/min-afl" -- \
    ./alvos/parser_asan_triagem @@ 2>&1 | tail -5

echo "antes:  $(stat -c%s "triagem/crashes/${REP}") bytes"
echo "depois: $(stat -c%s triagem/min-afl) bytes"
```

Produza `minimizacao.md`:

| Métrica | Valor |
|---|---|
| Entrada original | |
| Tamanho original | |
| Tamanho após `afl-tmin` | |
| **Redução (%)** | |
| Tempo do `afl-tmin` | |

**Responda:**

1. **Quantos por cento o `afl-tmin` reduziu?**
2. A entrada mínima tem **cabeçalho válido**? Ou o `afl-tmin` removeu o `magic`?
3. Se o `magic` foi removido, isso é problema? (Dica: o binário ainda crasha?)
4. Quantos bytes ficaram? Isso é razoável para um cabeçalho de 12 bytes + 1 item?

⚠ **A resposta 3 é uma sutileza real.** Se o `afl-tmin` remove o `magic` e o alvo ainda crasha, é
porque **o bug é antes da verificação de magic** — ou a verificação foi removida (você compilou com
o `parser_sem_magic.c`). **Isso muda a interpretação do bug**, e é por isso que você verifica.

### Passo 2 — Preserve a mesma propriedade (30 min)

```bash
cd ~/fuzz-lab

ass() {
    local f="$1"
    ./alvos/parser_asan_triagem "$f" 2>&1 | grep -E 'ERROR: AddressSanitizer|#0 ' | head -2
}

echo "═══ ORIGINAL ═══"
ass "triagem/crashes/${REP}"
echo
echo "═══ MINIMIZADA ═══"
ass triagem/min-afl
echo
echo "═══ MESMO BUG? ═══"
diff <(ass "triagem/crashes/${REP}") <(ass triagem/min-afl) >/dev/null \
  && echo "✓ mesmo bug preservado" \
  || echo "⚠ ASSINATURAS DIFEREM — verifique"
```

**Depois, teste o determinismo:**

```bash
echo "═══ DETERMINISMO (5 execuções) ═══"
for i in 1 2 3 4 5; do
    ./alvos/parser_asan_triagem triagem/min-afl >/dev/null 2>&1
    printf "execução %d: código %d\n" "$i" "$?"
done

echo
echo "═══ SEM ASAN (o crash é real?) ═══"
./alvos/parser_plain_triagem triagem/min-afl >/dev/null 2>&1
printf "código sem ASan: %d %s\n" "$?" \
    "$([ $? -ne 0 ] && echo '— CRASHA' || echo '— não crasha')"
```

Produza `propriedade.md`:

| Teste | Original | Minimizada | Preservado? |
|---|---|---|---|
| Tipo do erro | | | |
| Frame `#0` | | | |
| Determinístico (5×) | | | |
| Crash sem ASan | | | |

**Responda:**

1. As assinaturas **coincidem**? Se não, o `afl-tmin` trocou de bug — e você precisa refazer com
   `-e` ou com redução manual.
2. O crash é **determinístico**? As cinco execuções deram o mesmo código?
3. **O crash acontece sem ASan?** O que isso diz sobre a severidade?
4. Se o crash é flaky, **você reportaria?** Justifique.

⚠ **A resposta 4 é a regra prática do módulo.** Crash flaky não é reportável — o mantenedor não
consegue reproduzir, e o reporte é descartado. **Você declara como flaky, ou investiga até
determinizar.**

### Passo 3 — Monte o pacote de reprodução (35 min)

```bash
cd ~/fuzz-lab
rm -rf repro-bug01 && mkdir -p repro-bug01 && cd repro-bug01

cp ../triagem/min-afl entrada.bin
sha256sum entrada.bin > SHA256SUMS
cp ../alvos/parser_lib.c .
cp ../harnesses/parser_main.c .

cat > build.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
      -o parser_asan parser_lib.c parser_main.c
echo "compilado: ./parser_asan"
EOF
chmod +x build.sh

cat > comando.txt <<'EOF'
./parser_asan entrada.bin
EOF

./build.sh 2>&1 | tail -2
./parser_asan entrada.bin > relatorio-asan.txt 2>&1 || true

cat > README.md <<EOF
# Reprodução — $(basename "$(pwd)")

## Ambiente
- \`\$(clang --version | head -1)\`
- ASan + UBSan, \`-O1\`
- x86-64 Linux

## Reproduzir
\`\`\`bash
./build.sh
./parser_asan entrada.bin
\`\`\`

## Resultado esperado
$(grep -m1 'ERROR: AddressSanitizer' relatorio-asan.txt || echo "(veja relatorio-asan.txt)")

## Integridade
\`\`\`bash
sha256sum -c SHA256SUMS
\`\`\`

## Determinismo
Verificado em 5 execuções consecutivas.
EOF

echo "═══ PACOTE ═══"
ls -la
echo
echo "═══ HASH ═══"
cat SHA256SUMS
echo
echo "═══ PRIMEIRAS LINHAS DO RELATÓRIO ═══"
head -6 relatorio-asan.txt
```

Produza `pacote.md`:

| Arquivo | Existe? | Conteúdo |
|---|---|---|
| `entrada.bin` | | |
| `SHA256SUMS` | | |
| `build.sh` | | |
| `comando.txt` | | |
| `RELATORIO-asan.txt` | | |
| `README.md` | | |

**Responda:**

1. O `build.sh` **funcionou**? O binário compilou?
2. O `sha256sum -c` confere?
3. **Se o mantenedor recebesse só este diretório**, ele reproduziria? O que faltaria?
4. Que informação você **ainda** precisa adicionar? (Dica: qual versão do código.)

### Passo 4 — Redução manual, quando o automático estagna (15 min)

```bash
cd ~/fuzz-lab

# Tente reduzir MAIS, além do afl-tmin
python3 triagem/scripts/reduz_manual.py \
    ./alvos/parser_asan_triagem triagem/min-afl triagem/min-manual

echo
echo "afl-tmin:      $(stat -c%s triagem/min-afl 2>/dev/null) bytes"
echo "manual extra:  $(stat -c%s triagem/min-manual 2>/dev/null) bytes"

# Verifique se preservou a propriedade
diff <(./alvos/parser_asan_triagem triagem/min-afl 2>&1 | grep -E 'ERROR|#0' | head -2) \
     <(./alvos/parser_asan_triagem triagem/min-manual 2>&1 | grep -E 'ERROR|#0' | head -2) \
  && echo "✓ mesma assinatura" || echo "⚠ assinatura diferente"
```

**Responda:**

1. A redução manual conseguiu ir **além**? Quanto?
2. Se você removesse mais bytes, o crash desaparecia? **O que isso revela** sobre o bug?
3. **O tamanho mínimo é informação.** Quantos bytes são necessários para o transbordo? Isso bate
   com o `dest` de 64 bytes?

⚠ **A resposta 3 fecha o módulo.** Saber quantos bytes são necessários **é entender o bug** — e é
exatamente o que o módulo 11 formaliza em causa raiz.

### Critérios de aceitação

- `afl-tmin` executado, com a redução **medida em porcentagem**.
- Você verificou se o `magic` foi removido, e explicou o que isso significa.
- `propriedade.md` com o teste de **mesma assinatura** feito (não só "crasha").
- Teste de **determinismo** com cinco execuções.
- Você testou se o crash acontece **sem ASan**, e interpretou.
- `repro-bug01/` com os **seis** arquivos e o `build.sh` funcionando.
- `sha256sum -c` confere.
- Você identificou **o que ainda faltaria** no pacote (a versão do código).
- Redução manual tentada **além** do `afl-tmin`, com o resultado comparado.

---

## Avaliação

1. Por que a entrada mínima importa? Cite quatro razões, incluindo a decisiva.
2. Por que o processo de minimização frequentemente **revela** o bug?
3. Compare `afl-tmin` e `-minimize_crash` do libFuzzer. Em que diferem?
4. Para que serve `afl-tmin -e`?
5. **Qual o erro mais comum de minimização?** Como você detecta?
6. Por que reduzir até "algum crash" é errado?
7. Descreva o teste de mesma-assinatura. Por que ele é obrigatório?
8. Por que cinco execuções são o mínimo? O que é um crash flaky?
9. Cite três causas de crash flaky, e o que fazer com cada uma.
10. Por que crash flaky **não é reportável**?
11. Cite os seis arquivos do pacote de reprodução. Por que o `build.sh` é essencial?
12. Por que a versão do código (commit) é obrigatória no reporte?
13. Em que caso a redução automática estagna, e o que você faz?
14. Por que a redução manual testa por **código de saída**, e qual o cuidado com isso?

---

**Próximo:** [Módulo 11 — Causa raiz no depurador](modulo-11.md)
