# Módulo 10 — eBPF: O Verifier Como Superfície, e o Que Ele Garante

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 10 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 11 — Método e reporte

---

## O que este módulo entrega

Ao final, você vai entender **o único componente do kernel cujo trabalho é provar que um programa é seguro** — e portanto o único cuja falha é *uma prova que não provou*. Você vai saber o que o verifier garante, onde a garantia cede, e por que um único erro nele pode liberar **escrita em memória arbitrária em ring 0**.

---

## 10.1 O problema que o eBPF resolve, e o que ele cria

⚠ **A ideia:** permitir que o userspace envie **código** para rodar no kernel — com segurança garantida **antes** de executar.

```
   userspace                                   kernel
   ─────────                                   ──────

   clang -target bpf    ->  bytecode eBPF
        │
        ▼
   bpf(BPF_PROG_LOAD)
        │
        ▼
   ┌─────────────────────────────┐
   │   ⚠  O VERIFIER              │
   │                              │
   │  prova, por ANALISE          │
   │  ESTATICA, que o programa:   │
   │    - nao le memoria invalida  │
   │    - nao escreve fora do      │
   │      permitido                │
   │    - termina (nao tem loop     │
   │      infinito)                │
   │    - usa so helpers permitidos │
   │    - nao vaza ponteiro para    │
   │      o userspace              │
   └──────────────┬──────────────┘
                  │ aprovado
                  ▼
   ┌─────────────────────────────┐
   │  JIT  ->  codigo nativo      │
   │  ⚠ roda em ring 0            │
   └─────────────────────────────┘
```

⚠ **E aqui está a diferença de classe em relação a tudo que veio antes:**

| Subsistema | Como o kernel se protege |
|---|---|
| `nftables` | ⚠ Valida **dado** — o parser |
| `io_uring` | ⚠ Valida **parâmetro** |
| `keyring` | ⚠ Valida **permissão** |
| **eBPF** | ⚠⚠ **Valida o PRÓPRIO CÓDIGO, por análise estática** |

⚠ **Consequência direta:** o verifier não é mais uma validação entre outras. **Ele é o único mecanismo de segurança entre bytecode hostil e ring 0.** Se ele aprova um programa malicioso, **não há segunda barreira** — o código roda JIT, nativo, com os privilégios do kernel.

⚠ **É por isso que um bug no verifier vale tanto.** Não é UAF de objeto — é **uma classe inteira invalidada**.

---

## 10.2 O que o verifier analisa

```
   PARA CADA INSTRUCAO, o verifier mantem:
   ┌───────────────────────────────────────────────┐
   │  estado de cada REGISTRADOR:                  │
   │     tipo   ->  scalar | ptr_to_map | ptr_to_  │
   │                stack | ptr_to_ctx | ...        │
   │     range  ->  ⚠ valor minimo e maximo         │
   │     id     ->  qual objeto aquele ponteiro      │
   │                veio                            │
   │                                                │
   │  estado da PILHA:                             │
   │     offset, tamanho, tipo de cada slot         │
   └───────────────────────────────────────────────┘
```

⚠ **E a técnica é a **interpretação abstrata**: o verifier simula a execução, com valores **abstratos** em vez de concretos. Quando ele chega no fim sem achado, ele **provou** que qualquer execução é segura.

⚠ **A garantia, portanto, depende de três coisas, e cada uma é uma superfície:**

| Dependência | Se falhar |
|---|---|
| **A modelagem dos tipos** | ⚠ O verifier acha que é uma coisa, e é outra |
| **O cálculo de faixa** | ⚠ O verifier acha que o valor é pequeno, e não é |
| **O caminho de exploração** | ⚠ O verifier não visita o caminho que o JIT executa |

⚠ **O terceiro item é o mais sutil, e o mais fértil.** O verifier analisa o **grafo de fluxo** — e se ele **podar** um caminho por achar que é inalcançável, mas o JIT **executa** aquele caminho, o programa roda **sem verificação**. A divergência entre o que é verificado e o que é executado é a fonte de bug mais interessante da área.

---

## 10.3 As classes de bug

### Classe A — Registrador sem tipo (`uninitialized`)

```c
// O padrao: um caminho que nao inicializa o registrador
// ⚠ se o verifier achar que ELE foi inicializado, o valor e lixo
if (cond)  r1 = mapa;      // caminho 1 inicializa
// ⚠ caminho 2 nao inicializa, mas o verifier "lembra" do estado do caminho 1
r1->valor = 1;             // escrita em ponteiro NAO validado
```

⚠ **Historicamente, a classe mais explorada.** O verifier roda com estado mesclado ao encontrar ramificações — e se a mesclagem **não** rebaixar um registrador tipado para "desconhecido", o caminho que não inicializou fica com um ponteiro aparentemente válido.

### Classe B — Fuga pela pilha (`stack canary` / `out-of-bounds`)

O `BPF_REG_10` é o frame pointer da pilha, e o verifier rastreia o que há em cada slot. ⚠ Se a contagem de `sp` é derivada de um valor que o verifier **não modela bem**, um `load`/`store` acessa além do frame.

⚠ **Um erro aqui é grave de forma específica:** uma leitura fora da pilha do eBPF alcança **a pilha do kernel** — o segredo de outro contexto. Uma escrita, **corrompe a pilha do kernel**.

### Classe C — Aritmética de ponteiro que escapa da faixa

```c
// O verifier limita o valor de um scalar — mas a conta pode escapar
r2 = *(u32 *)(r1 + 0);     // valor do usuario
r2 &= 0xff;                // ⚠ o verifier conclui: 0..255
r2 += 0xfffffff0;          // ⚠ e aqui?
// o verifier tem que perceber que agora o valor e grande
// se ele mantem "0..255" e trata o += como sempre valido  ->  ponteiro arbitrario
```

### Classe D — Divergência verifier × JIT

⚠ **A classe mais elegante:** o verifier interpreta a semântica de uma instrução de um jeito, e o JIT emite código **com semântica diferente**.

| Origem da divergência | Exemplo |
|---|---|
| Instrução com comportamento não previsto | Deslocamento, extensão de sinal |
| Otimização do JIT | Reordenação, eliminação |
| Arquitetura | ⚠ x86-64 divergindo de ARM64 |

⚠ **Se o verifier acredita que `r1` tem faixa pequena e o JIT executa uma extensão de sinal que aumenta o valor**, o resultado é acesso fora da faixa — **com o verifier tendo aprovado**. É um bug que não está em nenhum dos dois lados: está na **diferença** entre eles.

---

## 10.4 Por que a área é produtiva

| Atributo | Consequência |
|---|---|
| **Complexidade do verifier** | ⚠ Milhares de linhas de análise estática, casos de estado |
| **Superfície ampliada por `CAP_BPF`** | Usuário com a capability carrega programa próprio |
| **`unprivileged_bpf_disabled`** | ⚠ Desligado por padrão desde 5.16 — mas ligável |
| **JIT como segundo tradutor** | ⚠ Duas semânticas para a mesma instrução |
| **Evolução rápida do subsistema** | ⚠ Features novas = casos novos que o verifier não modela |

```bash
# O estado do eBPF nesta maquina
cat /proc/sys/kernel/unprivileged_bpf_disabled
# 0 = liberado, 1 = so CAP_BPF, 2 = desabilitado de vez

sysctl kernel.unprivileged_bpf_disabled

# Quem pode carregar
capsh --print | grep -o 'cap_bpf\|cap_sys_admin'

# Os helpers disponiveis, e o que cada um faz
bpftool feature probe 2>/dev/null | head -20 || echo "bpftool nao instalado"
```

⚠ **A leitura certa do parâmetro:** `unprivileged_bpf_disabled=2` **fecha** a superfície para usuário comum. Isso não é detalhe de configuração — é **a principal mitigação da área**, e o primeiro item de um relatório de endurecimento.

⚠ **Mas atenção ao que ele **não** fecha:** com `CAP_BPF` ou `CAP_SYS_ADMIN` — e o módulo 7 mostrou que você **ganha essas capabilities dentro de um `user namespace`** — a superfície volta. A pergunta do módulo 7 reaparece aqui: *qual subsistema vulnerável está ao meu alcance?*

---

## 10.5 EBPF como ferramenta: o outro lado

⚠ **O mesmo subsistema que é superfície é também a melhor ferramenta de detecção** — e este parágrafo liga este módulo ao 11.

| Uso | O que permite |
|---|---|
| `tracepoint` / `kprobe` | Ver chamada de função no kernel, sem patch |
| **LSM BPF** | ⚠ Política de segurança programável |
| `bpf_override_return` | Alterar retorno de função |
| `bcc` / `bpftrace` | Scripts prontos para observação |

```bash
# Um exemplo minimo de observacao
bpftrace -e 'tracepoint:syscalls:sys_enter_execve { printf("%s exec %s\n", comm, str(args->filename)); }'
```

⚠ **A assimetria que fecha o curso:** o **mesmo mecanismo** que pode ser a maior falha de segurança do kernel é a melhor ferramenta para **detectá-la**. Quem entende o verifier entende os dois lados — e é exatamente a posição que o módulo 11 e o relatório final exigem.

---

## Laboratório 10 — Ler o verifier

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```bash
cd ~/linternals-lab/m10
K=~/linternals-lab/kernel

# 1. O tamanho da superficie
wc -l $K/kernel/bpf/verifier.c
wc -l $K/kernel/bpf/*.c | tail -1

# 2. Os pontos de entrada
grep -n 'bpf_check\|do_check\|check_mem_access\|check_reg_arg' $K/kernel/bpf/verifier.c | head -20

# 3. As funcoes que MODELAM o tipo e a faixa
grep -n 'static.*reg_type\|static.*tnum\|mark_reg_unknown\|__mark_reg_known' \
     $K/kernel/bpf/verifier.c | head -20

# 4. O JIT — a segunda semantica
ls $K/arch/x86/net/bpf_jit*.c
grep -c 'EMIT\|emit_' $K/arch/x86/net/bpf_jit_comp.c
```

```bash
# 5. Estado do subsistema
cat /proc/sys/kernel/unprivileged_bpf_disabled
which bpftool bpftrace || sudo apt install -y linux-tools-common bpftrace

# 6. Um programa eBPF minimo, carregado por voce
sudo bpftool prog list | head -10
sudo bpftool feature probe kernel 2>/dev/null | grep -i 'unprivileged\|jit' | head

# 7. Observe um caminho legitimo de verificacao
#    Escreva um programa simples (C -> clang -target bpf), carregue com
#    sudo bpftool prog load meu.o /sys/fs/bpf/meu
#    ⚠ o verifier imprime a analise; leia os "processed N insns"
```

**O que observar:** no passo 1, o tamanho de `verifier.c`. Compare-o com o de um subsistema inteiro como `nf_tables_api.c` do módulo 6. O verifier **sozinho** é da mesma ordem — e isso é o argumento da área em um único número.

**Exercício 1:** escreva um programa eBPF inválido de propósito — por exemplo, um `store` além do frame da pilha — e carregue-o. Leia a mensagem do verifier. Depois escreva a mesma mensagem em português, explicando o que o verifier **acreditava** sobre o estado naquele ponto.

**Exercício 2:** compare `check_mem_access` com `check_reg_arg`. Um valida acesso a memória, o outro o uso do registrador. Escreva, para cada um, qual **classe** do 10.3 ele existe para prevenir — e qual delas **escaparia** de um erro no outro.

**Exercício 3 (o que vale):** escolha um CVE de eBPF publico de 2021 em diante. Classifique-o em A, B, C ou D do 10.3, e responda: a falha estava na **modelagem**, na **faixa**, ou na **divergência**? Escreva o parágrafo de causa raiz **sem consultar o writeup** e depois compare. É exatamente a análise que o módulo 11 formaliza.

---

## Resumo

- ⚠ **eBPF deixa o userspace enviar CÓDIGO ao kernel** — validado antes de executar, e depois JIT.
- ⚠ **O verifier é o ÚNICO mecanismo de segurança** entre bytecode hostil e ring 0 — se ele aprova, não há segunda barreira.
- A garantia depende de **modelagem de tipo, cálculo de faixa e cobertura de caminho** — e cada uma é uma superfície.
- As quatro classes: **registrador sem tipo, fuga pela pilha, aritmética fora da faixa** e ⚠ **divergência verifier × JIT**.
- ⚠ **`unprivileged_bpf_disabled=2` é a principal mitigação** — mas `CAP_BPF` a reabre, e o `user namespace` do módulo 7 concede capability.
- ⚠ **O mesmo mecanismo é a melhor ferramenta de detecção** — a assimetria que o módulo 11 explora.

---

## O que o próximo módulo entrega

Você tem o mapa, as classes e cinco subsistemas. O módulo 11 é o fecho: **como transformar tudo isso em achado** — escolher o alvo, montar a hipótese, medir a reprodução, escrever o reporte e divulgar. É o módulo que converte conhecimento em trabalho.
