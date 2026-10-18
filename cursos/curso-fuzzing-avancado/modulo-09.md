# Módulo 9 — Snapshot e Kernel

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Entender por que **executar do zero** é o gargalo de certos alvos.
2. Conhecer o **snapshot fuzzing** e o que ele resolve.
3. Reconhecer os alvos que a mutação **in-process** não alcança.
4. Medir o **custo de partida** — e o ganho do snapshot.
5. Saber quando o kernel é alvo, e por que é o mais caro.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O fuzzing in-process assume que o custo por execução é o custo do alvo.** **E há alvos em que ele
> não é** — **onde o custo é **levantar o ambiente**, e não processar a entrada.**

⚠ **E é o gargalo do módulo 4 visto de outro ângulo:** **exec/s não é só do harness** — **é também
do que o alvo **precisa que exista** antes de rodar.**

⚠ **A tese:**

> **Há alvos em que 99% do tempo é preparação.** **E o snapshot existe para eliminar a preparação** —
> **não o processamento.**

⚠ **A tabela do custo de partida, por tipo de alvo:**

| Alvo | Partida | ⚠ Processamento |
|---|---|---|
| Parser de arquivo | ⚠ ~0 | O parse |
| **Serviço complexo** | Segundos | ⚠ Milissegundos |
| ⚠ **Sistema operacional** | ⚠⚠ **Segundos a minutos** | ⚠⚠ **Milissegundos** |
| Hypervisor | ⚠⚠ Muito alto | Baixo |
| Firmware | Alto | Baixo |

⚠ **A última coluna é o desperdício.** **Se o processamento é de milissegundos e a partida de
segundos, você gasta 99,9% do orçamento em `boot`.**

---

## 9.1 O que o snapshot é

⚠ **O conceito: **congele o estado inicial, e restaure-o a cada execução.****

```
┌──────────────────────────────────────────────────────────────────────┐
│ SEM SNAPSHOT                                                          │
│   para cada entrada:                                                  │
│     · boot / inicializa / carrega     ⚠ SEGUNDOS                      │
│     · processa a entrada              ⚠ milissegundos                 │
│   ⚠ e o ciclo é de segundos                                           │
├──────────────────────────────────────────────────────────────────────┤
│ COM SNAPSHOT                                                          │
│   1. boot / inicializa / carrega      ⚠ UMA vez                       │
│   2. ⚠ SALVA o estado (a "foto")                                      │
│   para cada entrada:                                                  │
│     · ⚠ RESTAURA a foto               ⚠ milissegundos                 │
│     · processa a entrada              ⚠ milissegundos                 │
│   ✓ e o ciclo é de milissegundos                                      │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A tabela do ganho, em ordem de magnitude:**

| Alvo | Sem snapshot | ⚠ Com snapshot |
|---|---|---|
| Parser | 50.000 exec/s | ⚠ Nada a ganhar |
| Serviço | 100 exec/s | ⚠ **1.000 exec/s** |
| ⚠ **Kernel** | ⚠ **5 exec/s** | ⚠ **500 exec/s** |

⚠ **A primeira linha é a honestidade do módulo.** **No parser, o snapshot não muda nada** — **e
adicionar a complexidade é puro custo.**

⚠ **E a tabela das ferramentas:**

| Ferramenta | Alvo | ⚠ Complexidade |
|---|---|---|
| **`QEMU` + `AFL`** | Kernel, firmware | Alta |
| ⚠ **Nyx** | Kernel, hypervisor | ⚠⚠ Muito alta |
| `kkAFL` | Kernel Linux | Alta |
| **`snapshot` em userspace** | Serviço | Média |

⚠ **A regra escrita:**

> **O snapshot só compensa quando a partida domina.** **Você mede: partida × processamento.** **Se a
> partida é 1% do ciclo, o snapshot adiciona complexidade sem ganho.**

```bash
mkdir -p ~/fuzz-lab/mod09 && cd ~/fuzz-lab/mod09

echo "═══ 1. o que o snapshot é ═══"
echo
cat > snapshot.md <<'EOF'
# O que o snapshot é

## Sem snapshot
para CADA entrada:
  · boot/inicializa/carrega   ⚠ SEGUNDOS
  · processa a entrada        ⚠ milissegundos
⚠ o ciclo é de SEGUNDOS.

## Com snapshot
1. boot              ⚠ UMA vez
2. ⚠ SALVA o estado (a "foto")
para CADA entrada:
  · ⚠ RESTAURA a foto   ⚠ milissegundos
  · processa            ⚠ milissegundos
✓ o ciclo é de MILISSEGUNDOS.

## O ganho, por alvo
| Alvo | sem snapshot | com snapshot |
|---|---|---|
| parser | 50.000 exec/s | ⚠ NADA a ganhar |
| serviço | 100 exec/s | ⚠ 1.000 exec/s |
| ⚠ KERNEL | ⚠ 5 exec/s | ⚠ 500 exec/s |

## ⚠ a primeira linha é a honestidade do módulo
no parser, o snapshot NÃO MUDA NADA —
e adicionar a complexidade é PURO CUSTO.

## As ferramentas
| Ferramenta | Alvo | Complexidade |
|---|---|---|
| QEMU + AFL | kernel, firmware | ALTA |
| ⚠ Nyx | kernel, hypervisor | ⚠⚠ MUITO ALTA |
| kkAFL | kernel Linux | alta |
| snapshot em userspace | serviço | média |

## ⚠ A REGRA
o snapshot só compensa quando a PARTIDA DOMINA.
você mede: partida × processamento.
⚠ se a partida é 1% do ciclo, o snapshot adiciona
   complexidade SEM GANHO.
EOF

cat snapshot.md

echo
echo "═══ 2. medindo o custo de partida ═══"
echo
cat > mede-partida.py <<'PY'
#!/usr/bin/env python3
"""
mede-partida.py — a partida domina o ciclo?

⚠ DIDÁTICO. mede o custo de partida e o de processamento.
"""
import time, subprocess, os, struct, sys

ENTRADA = "/tmp/custo.bin"


def mede_binario(caminho: str, n: int = 30) -> float:
    if not os.path.exists(caminho):
        return -1.0
    with open(ENTRADA, "wb") as f:
        f.write(struct.pack("<H", 4) + struct.pack("<I", 16) + b"A" * 16)
    t0 = time.time()
    for _ in range(n):
        subprocess.run([caminho, ENTRADA], capture_output=True)
    return (time.time() - t0) / n


def main():
    print("═══ A PARTIDA DOMINA? ═══")
    print()
    print("  ⚠ mede o tempo por EXECUÇÃO de um processo completo")
    print("     (é a partida + o processamento, juntos)")
    print()

    alvos = [
        ("parser (ASan)", os.path.expanduser("~/fuzz-lab/alvos/parser_asan")),
        ("/bin/true",     "/bin/true"),
        ("/bin/ls",       "/bin/ls"),
    ]

    print(f"  {'alvo':<20} {'ms/exec':<12} {'exec/s':<12} veredito")
    print("  " + "-"*56)

    for nome, caminho in alvos:
        t = mede_binario(caminho)
        if t < 0:
            print(f"  {nome:<20} {'—':<12} {'—':<12} ⚠ não encontrado")
            continue
        ms = t * 1000
        ex = 1 / t if t > 0 else 0
        v = "⚠ PARTIDA DOMINA" if ms > 5 else "✓ processamento domina"
        print(f"  {nome:<20} {ms:<12.2f} {ex:<12.0f} {v}")

    print()
    print("  ═══ A INTERPRETAÇÃO ═══")
    print("  · se o tempo por execução é ~1 ms  → ✓ in-process basta")
    print("  · ⚠ se é dezenas de ms            → ⚠ a PARTIDA domina")
    print("  · ⚠ se é SEGUNDOS                 → ⚠⚠ snapshot é necessário")
    print()
    print("  ✓ e note: um binário que faz quase nada pesa ~1ms.")
    print("     ⚠ é todo o custo de criar e destruir o processo.")
    print()
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-partida.py
python3 mede-partida.py
```

⚠ **O medidor de partida é o instrumento.** **E a linha do `/bin/true` é a mais explicativa:** **um
binário que faz **nada** pesa cerca de 1 ms** — **e esse é todo o custo de criar e destruir o
processo.**

⚠ **E é a razão do in-process valer:** **no parser, 50.000 exec/s só é possível porque o processo
**não é recriado**.**

**Produza `partida.md`:**

| Alvo | ms/exec | Veredito |
|---|---|---|
| Parser (ASan) | | |
| `/bin/true` | | |

**Responda:**

1. **O que o `/bin/true` revela?** Por que ele pesa 1 ms?
2. **O custo de partida domina no parser?
3. **Quando o snapshot compensaria?
4. **Por que o in-process existe?

---

## 9.2 Os alvos que a mutação não alcança

⚠ **Os alvos deste módulo, e o que cada um exige.**

| Alvo | Por que a mutação não alcança | ⚠ Exige |
|---|---|---|
| **Serviço com estado** | ⚠ Precisa de sessão | Sessão pré-construída |
| **Kernel** | ⚠ Precisa de boot | QEMU + snapshot |
| **Hypervisor** | ⚠ Idem, mais caro | Nyx |
| **Firmware** | ⚠ Precisa de emulação | QEMU |
| Bootloader | Idem | QEMU |
| ⚠ **Drivers** | ⚠ Precisa do barramento | Emulação ou harness |

⚠ **A tabela do que "alcançar" significa em cada caso:**

| Alvo | "Alcançar" é |
|---|---|
| Parser | ⚠ **Chamar a função** |
| Serviço | ⚠ Login, sessão, estado |
| ⚠ **Kernel** | ⚠ **Uma syscall com argumentos válidos** |
| Firmware | Um caminho de execução no emulador |

⚠ **A linha do serviço é a mais comum e a mais subestimada.** **Um serviço que exige autenticação
para chegar ao código vulnerável** — **e o fuzzer **não sabe fazer login**.

⚠ **A mitigação é a **semente de sessão**: **você constrói o estado uma vez, e o harness o
restaura** — **que é o snapshot, em escala menor.**

⚠ **A regra escrita:**

> **"Alcançar" é diferente por alvo.** **Num parser é chamar a função; num serviço é chegar
> autenticado; no kernel é uma syscall com argumentos que o kernel não rejeita de imediato.**

```bash
cd ~/fuzz-lab/mod09

echo "═══ 3. os alvos que a mutação não alcança ═══"
echo
cat > alvos.md <<'EOF'
# Os alvos que a mutação não alcança

| Alvo | Por que | Exige |
|---|---|---|
| serviço com ESTADO | ⚠ precisa de sessão | sessão pré-construída |
| KERNEL | ⚠ precisa de boot | QEMU + snapshot |
| HYPERVISOR | ⚠ idem, mais caro | Nyx |
| FIRMWARE | ⚠ precisa de emulação | QEMU |
| bootloader | idem | QEMU |
| ⚠ DRIVERS | ⚠ precisa do barramento | emulação ou harness |

## O que "ALCANÇAR" significa, por alvo
| Alvo | "alcançar" é |
|---|---|
| parser | ⚠ CHAMAR a função |
| serviço | ⚠ login, sessão, estado |
| ⚠ KERNEL | ⚠ uma SYSCALL com argumentos válidos |
| firmware | um caminho de execução no emulador |

## ⚠ a linha do serviço é a mais comum
um serviço que exige AUTENTICAÇÃO para chegar ao código
vulnerável — e o fuzzer NÃO SABE fazer login.

## ⚠ a mitigação é a SEMENTE DE SESSÃO
você constrói o estado UMA vez,
e o harness o RESTAURA.
✓ que é o SNAPSHOT, em escala MENOR.

## ⚠ A REGRA
"alcançar" é DIFERENTE por alvo.
num parser é CHAMAR a função.
num serviço é chegar AUTENTICADO.
no kernel é uma syscall com argumentos que o
kernel não rejeita DE IMEDIATO.
EOF

cat alvos.md
```

⚠ **A tabela do "alcançar" é o instrumento.** **E a linha do serviço é a mais aplicável:** **a
maioria dos alvos de rede exige estado** — **e o fuzzer não sabe construí-lo.**

⚠ **E a nota da semente de sessão é a ponte com o módulo 8:** **o estado pré-construído **é** fuzzing
dirigido** — **por seed de estado.**

**Produza `alvos.md`:**

| Alvo | "Alcançar" é |
|---|---|
| Parser | |
| Serviço | |
| Kernel | |

**Responda:**

1. **O que "alcançar" significa em cada alvo?
2. **Por que o serviço é o caso mais comum?
3. **O que a semente de sessão faz?
4. **Por que ela é o snapshot em escala menor?

---

## 9.3 O kernel, e por que é o mais caro

⚠ **O kernel é o alvo de maior superfície e maior custo. E as duas coisas juntas o definem.**

| Dimensão | Kernel |
|---|---|
| Superfície | ⚠⚠ **Enorme** |
| Custo de partida | ⚠⚠ **Segundos** |
| Custo por syscall | ⚠ Milissegundos |
| ⚠ **Precisa de privilégio** | ⚠⚠ **Sim** |
| Reprodutibilidade | ⚠ Difícil |

⚠ **A linha do privilégio é a que define o laboratório.** **Fuzzar o kernel exige subir o kernel
**no seu lab**, com QEMU** — **e nunca tocar no host.**

⚠ **E a tabela do que o kernel exige, e o custo de cada:**

| Requisito | Custo |
|---|---|
| Image do kernel compilada | ⚠ Alta |
| `QEMU` configurado | Média |
| ⚠ **Rootfs com o trigger** | ⚠ Alta |
| Snapshot com `Nyx`/`kkAFL` | ⚠⚠ **Muito alta** |
| ⚠ Isolamento do host | ⚠⚠ **Obrigatório** |

⚠ **A última linha não é opcional.** **Um kernel que fica sem resposta pode travar a máquina** —
**e o isolamento é o que impede o host de cair junto.**

⚠ **A regra escrita:**

> **O kernel é o alvo onde o laboratório é mais caro que o fuzzing.** **Você gasta dias montando o
> ambiente** — **e o QEMU com snapshot é o que evita gastar dias por execução.**

```bash
cd ~/fuzz-lab/mod09

echo "═══ 4. o kernel ═══"
echo
cat > kernel.md <<'EOF'
# O kernel

| Dimensão | Valor |
|---|---|
| superfície | ⚠⚠ ENORME |
| custo de partida | ⚠⚠ SEGUNDOS |
| custo por syscall | ⚠ milissegundos |
| ⚠ precisa de PRIVILÉGIO | ⚠⚠ SIM |
| reprodutibilidade | ⚠ DIFÍCIL |

## O que ele exige
| Requisito | Custo |
|---|---|
| image do kernel compilada | ⚠ ALTA |
| QEMU configurado | média |
| ⚠ rootfs com o TRIGGER | ⚠ alta |
| snapshot com Nyx/kkAFL | ⚠⚠ MUITO ALTA |
| ⚠ ISOLAMENTO do host | ⚠⚠ OBRIGATÓRIO |

## ⚠ e a última linha não é opcional
um kernel que fica sem resposta pode TRAVAR a máquina —
e o isolamento é o que impede o HOST de cair junto.

## ⚠ A REGRA
o kernel é o alvo onde o LABORATÓRIO é mais caro que o FUZZING.
você gasta DIAS montando o ambiente —
e o QEMU com snapshot é o que evita
gastar dias POR EXECUÇÃO.
EOF

cat kernel.md

echo
echo "═══ 5. e o custo/benefício, honesto ═══"
echo
cat > custo-beneficio.md <<'EOF'
# O custo/benefício, honesto

| Alvo | Montar o lab | Ganho esperado |
|---|---|---|
| parser | ✓ minutos | ⚠ **alto** |
| serviço | horas | alto |
| ⚠ kernel | ⚠⚠ **dias** | ⚠ incerto |
| hypervisor | ⚠⚠ semanas | ⚠ incerto |
| firmware | ⚠ dias | incerto |

## ⚠ a primeira linha explica por que este curso começa no parser
o MELHOR custo/benefício é o alvo SIMPLES —
não o mais impressionante.

## ⚠ e o kernel não é "o nível avançado"
é um alvo DIFERENTE, com:
· superfície maior
· custo maior
· ⚠ e retorno MAIS INCERTO

✓ o avançado não é o mais difícil —
   é o que rende por hora investida.
EOF

cat custo-beneficio.md
```

⚠ **A tabela de custo/benefício é o contrapeso do módulo.** **E a nota é importante:** **o kernel não
é "o nível avançado"** — **é um alvo diferente, com retorno mais incerto.**

⚠ **E ela responde à pergunta implícita do curso:** **por que começar no parser?** **Porque é o
melhor rendimento por hora investida.**

**Produza `custo-beneficio.md`:**

| Alvo | Montar | Ganho |
|---|---|---|
| Parser | | |
| Serviço | | |
| Kernel | | |

**Responda:**

1. **Qual alvo tem o melhor custo/benefício?** Por quê?
2. **Por que o kernel tem retorno incerto?
3. **O que "avançado" significa neste curso?
4. **Por que o isolamento do host é obrigatório?

---

## 9.4 LAB — Meça o custo de partida

**Duração:** 120 min

### Passo 1 — Meça o ciclo dos seus alvos (50 min)

```bash
cd ~/fuzz-lab/mod09

echo "═══ MEDINDO O CICLO ═══"
echo
python3 mede-partida.py 2>&1 | head -20
echo

echo "═══ E O CICLO IN-PROCESS, PARA CONTRASTE ═══"
cat <<'EXPL'
  ── COMPARE TRÊS MODOS ──

     A) POR PROCESSO        → o fuzzer cria o processo a cada entrada
        ⚠ é o modo do /bin/true: ~1ms, e todo ele é PARTIDA

     B) IN-PROCESS          → o processo vive, o fuzzer chama a função
        ✓ é o modo do módulo 3: 50.000+ exec/s

     C) SNAPSHOT            → o estado é restaurado
        ⚠ só vale se a partida for MUITO maior que o processamento

  ── A CONTA ──
     ⚠ se partida >> processamento  → snapshot
     ✓ se partida ≈ 0              → in-process
     ⚠ se partida é 1%             → NÃO complique
EXPL

cd ~/fuzz-lab/alvos 2>/dev/null && {
    echo
    echo "  ── medindo o ciclo in-process ──"
    timeout 20 ./fuzz_minimo /tmp/corpus-vazio -max_total_time=15 2>&1 | \
        grep -E 'exec/s|DONE' | tail -3 | sed 's/^/     /'
} || echo "  ⚠ o alvo não existe"
```

⚠ **A comparação dos três modos é o instrumento.** **E a conta é o critério:** **a partida domina?**
**Se sim, snapshot; se não, in-process.**

⚠ **E a nota do "partida é 1%" é o alerta:** **não adicione complexidade quando o ganho é marginal.**

**Produza `ciclo.md`:**

| Modo | exec/s | Custo dominante |
|---|---|---|
| Por processo | | |
| In-process | | |

**Responda:**

1. **Quanto o ciclo in-process rende?** E o por processo?
2. **Qual domina em cada modo?
3. **O seu alvo precisa de snapshot?
4. **Quando NÃO complicar?

### Passo 2 — Desenhe o lab de snapshot (40 min)

⚠ **O desenho, mesmo que você não vá executá-lo.**

```bash
cd ~/fuzz-lab/mod09

echo "═══ O DESENHO DO LAB DE SNAPSHOT ═══"
echo
cat <<'EXPL'
  ── PARA UM ALVO DE SNAPSHOT, VOCÊ PRECISA ──

     1. a IMAGE do alvo (kernel compilado? serviço empacotado?)
     2. o EMULADOR (QEMU, com o snapshot)
     3. ⚠ o TRIGGER: como a entrada chega ao alvo
        · uma syscall? um arquivo? um socket LOCAL?
     4. ⚠ o ISOLAMENTO: o host não pode cair junto
     5. o ORÁCULO: crash? invariante? diferencial?

  ── E O PONTO 3 É O QUE TRAVA A MAIORIA ──
     ⚠ sem saber COMO a entrada chega, não há harness.
     ✓ e no kernel, é uma SYSCALL com argumentos específicos.
EXPL

cat > caderno/PD-009.md <<'EOF'
# PD-009 — snapshot e alvos caros

**Data:** ____

## 1. O alvo
| Item | Valor |
|---|---|
| o que é | |
| tipo | parser / serviço / kernel / firmware |
| ⚠ custo de PARTIDA | |
| ⚠ custo de PROCESSAMENTO | |

## 2. A conta
| Item | Valor |
|---|---|
| partida (ms) | |
| processamento (ms) | |
| ⚠ partida / ciclo | |
| veredito | in-process / snapshot / não complicar |

## 3. Os três modos
| Modo | exec/s |
|---|---|
| por processo | |
| in-process | |
| snapshot | |

## 4. ⚠ O que o snapshot EXIGE (se aplicável)
| # | Requisito | Tenho? |
|---|---|---|
| 1 | a image do alvo | |
| 2 | o emulador | |
| 3 | ⚠ o TRIGGER | |
| 4 | ⚠ o ISOLAMENTO | |
| 5 | o oráculo | |

## 5. "Alcançar" neste alvo é
| Item | Valor |
|---|---|
| para chegar ao código, preciso de | |

## 6. O veredito de custo/benefício
| Item | Valor |
|---|---|
| montar o lab custa | |
| ganho esperado | |
| ⚠ vale? | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei o kernel do host
- [ ] não rodei nada sem isolamento
- [ ] não apontei para terceiro

## 8. O que NÃO foi verificado
⚠ mínimo 3
EOF

echo "  ⚠ a ficha PD-009 criada"
head -14 caderno/PD-009.md
```

⚠ **A ficha pede o desenho, não a execução.** **E a seção 4 é a honesta:** **você lista o que o
snapshot exigiria** — **e marca o que você tem.**

⚠ **E a seção 6 fecha o módulo:** **vale?** **Porque montar um lab de kernel custa dias** — **e o
ganho é incerto.**

**Produza `desenho.md`:**

| # | Requisito | Tenho? |
|---|---|---|
| 1 | Image | |
| 3 | Trigger | |
| 4 | Isolamento | |

**Responda:**

1. **O snapshot compensaria no seu alvo?** Por quê?
2. **O que "alcançar" significa nele?
3. **Quais requisitos você não tem?
4. **O custo/benefício vale?

### Passo 3 — Documente (30 min)

Produza `relatorio-snapshot.md`:

```markdown
# Relatório — snapshot e alvos caros

## 1. O alvo e o custo
| Item | Valor |
|---|---|
| alvo | |
| partida | |
| processamento | |
| ⚠ razão | |

## 2. A conta
| Modo | exec/s | ganho |
|---|---|---|
| por processo | | |
| in-process | | |
| ⚠ snapshot | | |

## 3. A evidência
```
a medição literal
```

## 4. ⚠ A decisão
| Item | Valor |
|---|---|
| in-process basta? | |
| ⚠ snapshot compensa? | |
| por quê | |

## 5. O que o snapshot exigiria
| # | Requisito | Custo |
|---|---|---|
| | | |

## 6. ⚠ O que o snapshot NÃO resolve
| Item | Por quê |
|---|---|
| o ORÁCULO | ⚠ a partida não é o sinal |
| o CORPUS | ⚠ o formato continua desconhecido |
| ⚠ a TRIGEM | ⚠ como a entrada chega |

## 7. ⚠ O que eu NÃO fiz
- [ ] não fuzzei o kernel do host
- [ ] não rodei nada sem isolamento
- [ ] não apontei para terceiro

## 8. O que NÃO foi verificado
⚠ mínimo 3

## 9. O próximo passo
| # | Ação | Prioridade |
```

**Produza `relatorio-snapshot.md`:**

| Item | Valor |
|---|---|
| Razão partida/ciclo | |
| Snapshot compensa? | |
| O que não resolve | |
| Isolamento | |

**Responda:**

1. **Qual a razão partida/ciclo?
2. **O snapshot compensa?** Com que número?
3. **O que ele NÃO resolve?** (Dica: três coisas.)
4. **Você desenharia o isolamento?** Como?

### Critérios de aceitação

- `snapshot.md` com o conceito e a tabela de ganho.
- Você explicou **por que o parser não ganha nada** com snapshot.
- Você explicou **quando ele compensa**.
- `mede-partida.py` rodado, com os tempos medidos.
- Você explicou **o que o `/bin/true` revela** sobre o custo de partida.
- Você explicou **por que o in-process existe**.
- `alvos.md` com os **seis** alvos e o que cada um exige.
- Você explicou **o que "alcançar" significa** em três alvos diferentes.
- Você explicou **por que a semente de sessão** é o snapshot em escala menor.
- `kernel.md` com os **cinco** requisitos e o custo de cada.
- Você explicou **por que o isolamento do host é obrigatório**.
- `custo-beneficio.md` com a tabela.
- Você explicou **por que "avançado" não é "o mais difícil"**.
- Os **três modos** comparados, com exec/s medido.
- Você calculou **a razão partida/ciclo** do seu alvo.
- Você deu **o veredito** sobre snapshot.
- Você listou **o que o snapshot NÃO resolve**.
- `caderno/PD-009.md` com as **oito** seções.
- `relatorio-snapshot.md` com as **nove** seções.
- ⚠ **Nenhum fuzz do kernel do host.** Nenhum teste sem isolamento.

---

## Avaliação

1. **O que o fuzzing in-process assume?
2. **Em que alvos ele não vale?** Por quê?
3. **O que o snapshot é?** Descreva os dois ciclos.
4. **Em que alvo ele não muda nada?** Por quê?
5. **Qual o ganho no kernel?** Cite os números.
6. **Cite quatro ferramentas** e o alvo de cada.
7. **Como se mede se o snapshot compensa?
8. **O que o `/bin/true` revela?
9. **Cite três alvos que a mutação não alcança.
10. **O que "alcançar" significa num parser?
11. **Num serviço?** No kernel?
12. **Por que o serviço é o caso mais comum?
13. **O que é a semente de sessão?
14. **Por que ela é o snapshot em escala menor?
15. **Cite cinco requisitos do lab de kernel.
16. **Por que o isolamento é obrigatório?
17. **Qual alvo tem o melhor custo/benefício?** Por quê?
18. **Por que o kernel tem retorno incerto?
19. **O que "avançado" significa** neste curso?
20. **O que o snapshot NÃO resolve?** Cite três coisas.

---

**Próximo:** [Módulo 10 — Triagem](modulo-10.md)
