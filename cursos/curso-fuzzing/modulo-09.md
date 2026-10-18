# Módulo 9 — Triagem: de 500 Crashes a 4 Bugs

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Entender por que 500 crashes **não** são 500 bugs.
2. Deduplicar por causa raiz, não por assinatura superficial.
3. Classificar severidade com critério defensável.
4. Reconhecer crash que dá controle de execução, sem armar exploit.
5. Produzir relatório de triagem que um mantenedor consegue usar.

---

## ⚠ Conduta e escopo

Alvos próprios. Se você triagem crash de projeto real, o módulo 12 governa o reporte.

⚠ **Este módulo é onde o curso se aproxima da linha de exploração**, e vale ser explícito sobre o
que você vai fazer:

| Você faz | Você **não** faz |
|---|---|
| Dizer se o crash dá controle de execução | Calcular offset |
| Explicar por que o endereço é controlado | Construir payload |
| Classificar severidade | Armar exploit |
| Escrever PoC que **reproduz** | PoC que **explora** |

⚠ **Saber distinguir "crash de DoS" de "crash com potencial de controle" é o que faz seu reporte
ser priorizado** — e é isso que você aprende. O passo seguinte é específico de alvo e não está
aqui.

---

## 9.1 Por que 500 crashes não são 500 bugs

⚠ **O achado que muda como você trabalha:**

```
CAMPANHA DE 10 HORAS
    │
    ▼
500 arquivos em findings/*/crashes/
    │
    ▼  ⚠ a maioria é o MESMO bug, com entrada diferente
    │
    ▼
┌────────────────────────────────────────────┐
│  4 bugs distintos                          │
│  · 2 heap-buffer-overflow (mesma função)   │
│  · 1 use-after-free                        │
│  · 1 integer overflow → heap overflow      │
└────────────────────────────────────────────┘
```

⚠ **Um único bug pode gerar centenas de crashes.** O fuzzer muta a entrada de formas diferentes, e
cada mutação que atinge o mesmo `memcpy` produz um arquivo. Sem triagem, você reporta 500 vezes o
mesmo problema — e o mantenedor descarta tudo.

⚠ **A consequência prática:** o valor do pesquisador **não é achar crashes** (o fuzzer faz isso). É
**reduzir 500 a 4**. É isso que o módulo ensina.

---

## 9.2 Deduplicação — por que a assinatura superficial engana

### O que **não** funciona

| Critério | Por que falha |
|---|---|
| Nome do arquivo | O fuzzer gera nome aleatório |
| Hash do arquivo | Entradas diferentes produzem o mesmo bug |
| Tamanho | Mesmo bug com entradas de tamanhos diferentes |
| Sinal (`SIGSEGV`) | Centenas de bugs dão `SIGSEGV` |
| Endereço exato | **O endereço muda** (ASLR, heap diferente) |

⚠ **O último é o erro mais comum.** Duas execuções do **mesmo** bug produzem endereços diferentes.
Deduplicar por endereço literal dá 500 grupos de 1.

### O que funciona

| Critério | Força | Como obter |
|---|---|---|
| **Tipo do ASan + linha (`#0`)** | **Boa** | `#0 arquivo:linha` do relatório |
| **Cadeia de chamadas completa** | **Muito boa** | Todos os `#N` |
| **Top frame normalizado** | Boa | `#0` + `#1`, sem endereço |
| Função culpada | Média | Nome da função em `#0` |
| Tipo de erro + função | Média | `heap-buffer-overflow` + `parse` |

⚠ **A prática recomendada: agrupe pela pilha normalizada.** Remova endereços, mantenha
`função + arquivo:linha`. Dois crashes com a mesma pilha normalizada são o mesmo bug, com alta
probabilidade.

```bash
cd ~/fuzz-lab
mkdir -p triagem/{crashes,grupos,scripts}

cat > triagem/scripts/dedupe.py <<'PY'
#!/usr/bin/env python3
"""
dedupe.py — agrupa crashes pela pilha normalizada do ASan.
Uso: python3 dedupe.py <binario> <diretorio-de-crashes> <saida>
"""
import subprocess, sys, os, re, hashlib, collections, json

BINARIO, ENTRADAS, SAIDA = sys.argv[1], sys.argv[2], sys.argv[3]

RE_ERRO  = re.compile(r'ERROR: AddressSanitizer: ([\w\-]+)')
RE_FRAME = re.compile(r'#(\d+)\s+0x[0-9a-f]+\s+in\s+(\S+)\s+(\S+)')

def analisa(entrada):
    """Roda o binário na entrada e extrai a assinatura do crash."""
    try:
        p = subprocess.run([BINARIO, entrada], capture_output=True,
                           timeout=15, text=True, errors="replace")
    except subprocess.TimeoutExpired:
        return {"erro": "timeout", "frames": [], "assinatura": "TIMEOUT"}

    saida = (p.stdout or "") + (p.stderr or "")

    m = RE_ERRO.search(saida)
    tipo = m.group(1) if m else ("SIGSEGV-nu" if p.returncode in (-11, 139) else None)

    frames = [(int(n), fn, loc) for n, fn, loc in RE_FRAME.findall(saida)]
    frames.sort()

    # normaliza: só função + local, sem endereço
    norm = [f"{fn}@{loc}" for _, fn, loc in frames[:5]]

    assinatura = f"{tipo or 'desconhecido'}|" + "|".join(norm[:3])
    return {
        "erro": tipo,
        "frames": norm,
        "assinatura": assinatura,
        "codigo": p.returncode,
    }

def main():
    if not os.path.isdir(ENTRADAS):
        sys.exit(f"diretório não existe: {ENTRADAS}")

    arquivos = sorted(
        os.path.join(ENTRADAS, f) for f in os.listdir(ENTRADAS)
        if os.path.isfile(os.path.join(ENTRADAS, f))
    )
    print(f"analisando {len(arquivos)} entradas…", file=sys.stderr)

    grupos = collections.defaultdict(list)
    detalhes = {}

    for i, arq in enumerate(arquivos, 1):
        if i % 25 == 0:
            print(f"  {i}/{len(arquivos)}", file=sys.stderr)
        r = analisa(arq)
        if r["erro"] is None:
            continue                       # não crashou
        grupos[r["assinatura"]].append(os.path.basename(arq))
        if r["assinatura"] not in detalhes:
            detalhes[r["assinatura"]] = r
        else:
            # memoriza a MENOR entrada de cada grupo (bom ponto de partida)
            antigo = detalhes[r["assinatura"]].get("_menor")
            tam = os.path.getsize(arq)
            if antigo is None or tam < antigo[1]:
                detalhes[r["assinatura"]]["_menor"] = (os.path.basename(arq), tam)

    print(f"\n{len(arquivos)} entradas → {len(grupos)} grupos distintos\n")
    resultado = []
    for i, (ass, membros) in enumerate(
            sorted(grupos.items(), key=lambda x: -len(x[1])), 1):
        d = detalhes[ass]
        menor = d.get("_menor", (membros[0], -1))
        print(f"── GRUPO {i:02d} ─────────────────────────────")
        print(f"   assinatura : {ass}")
        print(f"   tipo       : {d['erro']}")
        print(f"   frame #0   : {d['frames'][0] if d['frames'] else '?'}")
        print(f"   crashes    : {len(membros)}")
        print(f"   entrada menor : {menor[0]} ({menor[1]} bytes)")
        print()
        resultado.append({
            "grupo": i, "assinatura": ass, "tipo": d["erro"],
            "frames": d["frames"], "n_crashes": len(membros),
            "menor": menor[0], "membros": membros[:20],
        })

    with open(SAIDA, "w") as f:
        json.dump(resultado, f, indent=2, ensure_ascii=False)
    print(f"JSON salvo em {SAIDA}")

if __name__ == "__main__":
    main()
PY
chmod +x triagem/scripts/dedupe.py
```

⚠ **Note o `frames[:5]` e o `frames[:3]` na assinatura.** Usar a pilha **inteira** pode ser
excessivamente específico (caminhos diferentes para o mesmo bug); usar só o `#0` pode ser
excessivamente genérico (função grande com dois bugs). **Top-3 é o ponto doce** — e você ajusta
conforme o resultado.

---

## 9.3 Classificação de severidade

⚠ **A decisão que determina se seu reporte é priorizado.** E ela tem critério, não intuição.

### A árvore de decisão

```
O CRASH ACONTECE SEM ASAN?                    ─── Não ──▶ severidade reduzida
        │                                      (bug pode não ser real em produção)
       Sim
        │
        ▼
O ENDEREÇO VIOLADO É CONTROLADO PELA ENTRADA? ─── Sim ──▶ ALTA / CRÍTICA
        │                                       (potencial de controle)
       Não
        │
        ▼
É ESCRITA OU LEITURA?                        ── Escrita ──▶ ALTA
        │                                      (corrupção)
      Leitura
        │
        ▼
QUANTOS BYTES FORA?                          ── Poucos ──▶ MÉDIA
        │                                       (menos controle)
      Muitos
        │
        ▼
A ENTRADA É ALCANÇÁVEL EM PRODUÇÃO?          ─── Não ──▶ BAIXA
        │                                      (precisa de checksum válido, etc.)
       Sim
        │
        ▼
                                              MÉDIA / ALTA
```

### A tabela de severidade

| Classe | Escrita? | Potencial | Severidade típica |
|---|---|---|---|
| **heap-use-after-free** | Ambos | **Controle** | **Crítica** |
| **double-free** | Sim | Corrompe alocador | **Crítica** |
| **heap-buffer-overflow (escrita)** | Sim | **Controle** | **Alta** |
| **stack-buffer-overflow (escrita)** | Sim | **Controle** (ret) | **Alta** |
| **type confusion** | Ambos | **Controle** (vtable) | **Crítica** |
| **heap-buffer-overflow (leitura)** | Não | Info leak / DoS | Média |
| **global-buffer-overflow** | Ambos | Varia | Média-alta |
| **integer overflow** | — | **Via de acesso** | Média (isolado) · **Alta** (com overflow) |
| **stack exhaustion** | Não | DoS | Baixa |
| **memory leak** | Não | DoS (esgotamento) | Baixa |
| **timeout / hang** | Não | DoS | Baixa |

⚠ **A linha "o endereço é controlado pela entrada" é o critério que mais muda a classificação.**
Um `SIGSEGV` em `0x4141414141414141` (o `AAAA` da entrada) significa que a entrada controlou o
ponteiro — potencial de controle **alto**. Um `SIGSEGV` em `0x0000000000000008` significa
desreferência de ponteiro nulo com offset — **controle baixo**.

```bash
# Determine se o endereço do crash é controlado pela entrada
# Procure no relatório:
grep -oE 'on address 0x[0-9a-f]+|SEGV on unknown address 0x[0-9a-f]+' relatorio.txt

# E compare com os bytes da entrada
python3 - <<'PY'
# Endereço do crash: 0x4141414141414141
# Entrada contém "AAAA"? Então o atacante controlou o ponteiro.
import re, sys
end = 0x4141414141414141
b = end.to_bytes(8, "little")
print("bytes que produziriam este endereço:", b)
PY
```

⚠ **Este é o limite do que este curso ensina sobre exploração, e ele é o limite certo.** Você
determina **se** há controle, e **por que** — o que é necessário para classificar severidade. Não
constrói o payload.

---

## 9.4 O relatório de triagem

O entregável do módulo — e o que vai virar reporte no módulo 12.

```markdown
# Triagem de Crashes — [alvo] [data]

## 1. Resumo
| Métrica | Valor |
|---|---|
| Entradas processadas | 500 |
| Grupos distintos (bugs) | 4 |
| Ratio | 125:1 |
| Tempo de campanha | |
| Tempo de triagem | |

## 2. Bugs identificados

### BUG-01 — heap-buffer-overflow em parse() [ALTA]
| Campo | Valor |
|---|---|
| Tipo | AddressSanitizer: heap-buffer-overflow |
| Frame #0 | parse /src/parser.c:23 |
| Alocado em | parse /src/parser.c:20 |
| Escrita/Leitura | WRITE of size 8 |
| Bytes fora | 0 bytes à direita de bloco de 64 |
| Endereço controlado? | Não |
| Entrada: com ASan / sem ASan | crash / crash |
| Alcance em produção | Sim — entrada de arquivo |
| Crashes no grupo | 312 |
| Entrada mínima | min-bug01.bin (28 bytes) |
| Severidade | **ALTA** |
| Justificativa | Escrita fora do limite, alcançável, corrompe heap |

### BUG-02 — ...
...

## 3. Próximos passos
| Bug | Ação | Responsável |
|---|---|---|

## 4. O que NÃO foi triado
⚠ Obrigatório:
- Crashes que só ocorrem com ASan (declarar quantos)
- Timeouts não investigados
- Vazamentos (não tratados como crash)
- Caminhos não cobertos pela campanha
```

⚠ **A seção 4 é obrigatória e é o que separa triagem de triagem honesta.** "500 entradas → 4 bugs"
sem dizer o que ficou de fora é relatório incompleto.

---

## 9.5 LAB — Triagem de 500 crashes

**Duração:** 150 min

### Passo 1 — Gere crashes em volume (35 min)

⚠ **Você precisa de muitos crashes para triar.** Vamos gerar com o parser do módulo 1.

```bash
cd ~/fuzz-lab

# Compile o parser com ASan
clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
    -o alvos/parser_asan_triagem alvos/parser_lib.c harnesses/parser_main.c

# ⚠ Para gerar MUITOS crashes, use um alvo mais permissivo:
# remova a validação de magic temporariamente para o fuzzer chegar mais rápido
sed 's/if (memcmp(c->magic, "FMT1", 4) != 0) return -1;//' \
    alvos/parser_lib.c > alvos/parser_sem_magic.c

clang -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
    -o alvos/parser_asan_rapido alvos/parser_sem_magic.c harnesses/parser_main.c

# Campanha que gera muitos crashes
mkdir -p findings-triagem
timeout 180 afl-fuzz -i corpus/afl-final -o findings-triagem \
    -x corpus/parser.dict -- ./alvos/parser_asan_rapido @@ >/dev/null 2>&1

find findings-triagem -path '*crashes*' -name 'id:*' 2>/dev/null | wc -l
```

⚠ **Se você não chegou perto de 500 crashes em 3 minutos,** rode mais tempo ou use um alvo mais
frágil. **O lab funciona a partir de ~50 crashes** — o ponto é o método de triagem, não o número.

**Alternativa se o AFL++ não gerar volume suficiente** — gere as entradas sinteticamente:

```bash
mkdir -p triagem/crashes && cd ~/fuzz-lab

python3 - <<'PY'
import struct, os, random
os.makedirs("triagem/crashes", exist_ok=True)
random.seed(7)

n = 0
# variações que atingem os DOIS bugs por caminhos diferentes
for itens in range(1, 400):
    for extra in [0, 1, 8, 100]:
        cab = b"FMT1" + struct.pack("<HHI", 1, itens, itens*8+extra)
        corpo = bytes(random.choice(b"ABCXYZ") for _ in range(min(itens*8+extra, 8000)))
        open(f"triagem/crashes/id-{n:04d}", "wb").write(cab + corpo)
        n += 1

# e algumas com versão diferente, para caminho distinto
for itens in range(5, 60):
    cab = b"FMT1" + struct.pack("<HHI", 3, itens, 99999)   # ⚠ versao 3
    open(f"triagem/crashes/id-v3-{n:04d}", "wb").write(cab + b"Q"*200)
    n += 1

print(f"{n} entradas geradas em triagem/crashes/")
PY
ls triagem/crashes | wc -l
```

⚠ **Note o comentário sobre versão 3.** Gerar entradas por **caminho diferente** é o que faz a
triagem ter mais de um grupo — e é o que testa o deduplicador de verdade.

### Passo 2 — Deduplique (45 min)

```bash
python3 triagem/scripts/dedupe.py \
    ./alvos/parser_asan_triagem triagem/crashes triagem/grupos.json 2>&1 | tail -40
```

Produza `dedupe.md`:

| Métrica | Valor |
|---|---|
| Entradas analisadas | |
| Grupos distintos | |
| **Ratio** | |
| Grupo maior (nº de membros) | |
| Grupo menor | |
| Tempo de execução | |

**Responda:**

1. **Quantos grupos distintos?** O ratio bate com o esperado (~100:1)?
2. Qual grupo tem **mais membros**? O que isso indica?
3. **Os grupos têm assinaturas realmente diferentes**, ou o deduplicador juntou coisas distintas?
4. Você consegue pensar em **dois bugs diferentes que produziriam a mesma assinatura**? Isso seria
   um falso-merge. Como você detectaria?

⚠ **A resposta 4 é a limitação honesta do método.** Deduplicação por pilha é **heurística**. Dois
bugs em funções diferentes podem ter `#0` e `#1` iguais se o caminho for parecido. **O único teste
que confirma fusão errada é ler o código** — e é por isso que a triagem tem etapa manual.

### Passo 3 — Classifique por severidade (45 min)

```bash
# Para cada grupo, colete as informações de severidade
python3 - <<'PY'
import json
grupos = json.load(open("triagem/grupos.json"))
print(f"{len(grupos)} grupos\n")
for g in grupos:
    print(f"GRUPO {g['grupo']:02d}  {g['tipo']:<28} crashes={g['n_crashes']:<4} "
          f"menor={g['menor']}")
    for f in g["frames"][:3]:
        print(f"    {f}")
    print()
PY
```

⚠ **Agora a parte que exige julgamento.** Para **cada** grupo, determine:

```bash
# Escolha um representante de cada grupo e rode com o relatório completo
mkdir -p triagem/relatorios
python3 - <<'PY'
import json, subprocess, os
grupos = json.load(open("triagem/grupos.json"))
os.makedirs("triagem/relatorios", exist_ok=True)
for g in grupos:
    rep = g["menor"]
    caminho = f"triagem/crashes/{rep}"
    if not os.path.exists(caminho):
        continue
    p = subprocess.run(["./alvos/parser_asan_triagem", caminho],
                       capture_output=True, text=True, errors="replace", timeout=15)
    saida = (p.stdout or "") + (p.stderr or "")
    open(f"triagem/relatorios/grupo-{g['grupo']:02d}.txt", "w").write(saida)
    # resumo
    for l in saida.splitlines():
        if "ERROR: AddressSanitizer" in l or " of size " in l:
            print(f"grupo {g['grupo']:02d}: {l.strip()}")
PY
```

**Para cada grupo, preencha a ficha de severidade:**

| Grupo | Tipo | Escrita? | Bytes fora | Endereço controlado? | Sem ASan crasha? | Alcance | Severidade |
|---|---|---|---|---|---|---|---|
| 01 | | | | | | | |
| 02 | | | | | | | |
| ... | | | | | | | |

⚠ **A coluna "sem ASan crasha?" é obrigatória.** Rode o mesmo representante com o binário **sem**
sanitizer:

```bash
# Compile sem ASan
gcc -g -O1 -o alvos/parser_plain_triagem alvos/parser_lib.c harnesses/parser_main.c

# Teste cada representante
python3 - <<'PY'
import json, subprocess, os
grupos = json.load(open("triagem/grupos.json"))
for g in grupos:
    rep = f"triagem/crashes/{g['menor']}"
    if not os.path.exists(rep): continue
    p = subprocess.run(["./alvos/parser_plain_triagem", rep],
                       capture_output=True, timeout=10)
    print(f"grupo {g['grupo']:02d}: sem ASan → código {p.returncode} "
          f"({'CRASHA' if p.returncode != 0 else 'passa — bug só com ASan'})")
PY
```

⚠ **Se um grupo só crasha com ASan, a severidade cai** — porque o bug pode não se manifestar em
produção. **Isso não significa que não seja bug** (é comportamento indefinido, e indefinido pode
mudar), mas significa que o **reporte precisa declarar**.

**Responda:**

1. **Quantos grupos crasham sem ASan?** Quantos só com?
2. Qual grupo tem a **maior severidade**? Justifique com a árvore do §9.3.
3. Algum grupo tem **endereço controlado** pela entrada? Como você verificou?
4. **Qual bug você reportaria primeiro**, e por quê?

⚠ **A resposta 3 é onde você toca o limite do módulo.** Se o endereço for `0x4141414141414141` e a
entrada contiver `AAAA`, há controle. **Você declara isso no reporte como indicador de severidade —
e não vai além.**

### Passo 4 — O relatório (25 min)

Produza `relatorio-triagem.md` com as **quatro** seções do §9.4.

Requisitos:

| Seção | Mínimo |
|---|---|
| 1 — Resumo | Ratio calculado |
| 2 — Bugs | **Ficha completa por grupo** |
| 3 — Próximos passos | Um por grupo |
| **4 — O que NÃO foi triado** | **4 itens** |

⚠ **A seção 4 precisa nomear:** quantos crashes só ocorrem com ASan, timeouts não investigados,
vazamentos não tratados, e caminhos não cobertos pela campanha.

### Critérios de aceitação

- Crashes gerados (por AFL++ ou sinteticamente) — **mínimo 50**.
- `dedupe.md` com o ratio calculado e a resposta sobre **falso-merge** com o teste para detectá-lo.
- Ficha de severidade **preenchida para cada grupo**, com a coluna "sem ASan crasha?" **medida**.
- Você aplicou a **árvore de decisão** do §9.3, não intuição.
- Se houver endereço controlado, você **identificou** e justificou — sem ir além.
- `relatorio-triagem.md` com as quatro seções e **quatro itens** na seção "não triado".
- Você respondeu qual bug reportaria primeiro e por quê.

---

## Avaliação

1. Por que 500 crashes não são 500 bugs? O que o ratio indica?
2. Cite cinco critérios de deduplicação que **não** funcionam, com o motivo de cada um.
3. Por que deduplicar por endereço literal é o erro mais comum?
4. **Qual é o critério que funciona?** Por que a pilha normalizada?
5. Por que usar a pilha **inteira** pode ser ruim? E só o `#0`?
6. Explique a limitação da deduplicação por pilha. Como você detecta um falso-merge?
7. Descreva a árvore de decisão de severidade em cinco níveis.
8. Por que "o endereço é controlado pela entrada" é o critério que mais muda a classificação?
9. Dê um exemplo de endereço controlado e um de endereço **não** controlado, com o que cada um
   significa.
10. Qual a diferença de severidade entre UAF e **vazamento de memória**? Por quê?
11. Por que testar "crasha sem ASan?" é obrigatório? O que você declara se a resposta for não?
12. Por que a seção "o que não foi triado" é obrigatória num relatório de triagem?
13. Onde exatamente está a linha entre classificar severidade e construir exploit?

---

**Próximo:** [Módulo 10 — Minimização e reprodução](modulo-10.md)
