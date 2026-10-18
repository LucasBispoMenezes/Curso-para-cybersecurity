# Módulo 2 — Ler o Kernel: `vmlinux`, `gdb`, `struct`, e o Mapa do Ring 0

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 2 de 11 · 3 horas
**Pré-requisitos:** Módulo 1
**Próximo:** Módulo 3 — Heap do kernel

---

## O que este módulo entrega

Ao final, você vai saber **abrir o kernel no depurador com símbolo**, **navegar uma `struct` que você nunca viu** e **converter um endereço de `oops` em linha de código**. Sem isso, os dez módulos seguintes são leitura de blog: você entende o que os outros acham, e não acha nada.

---

## 2.1 Por que kernel de distribuição não serve

O kernel que roda na sua máquina está **sem símbolo**. Você pode olhar `/proc/kallsyms`, mas encontra uma lista de endereços com nome de função — e **nenhuma estrutura**:

```bash
# O que voce tem no kernel da distro
head -3 /proc/kallsyms
# ffffffff81000000 T startup_64
# ffffffff81000070 T secondary_startup_64
# ...

# E o que voce NAO tem
pahole -C task_struct /boot/vmlinuz-$(uname -r) 2>&1 | head -3
# pahole: /boot/vmlinuz-6.8.0: no debugging information found
```

⚠ **Sem debug info você não navega `struct`.** E no kernel, quase todo bug é uma estrutura com campo fora de faixa, ponteiro obsoleto ou contador errado. Ler sem estrutura é ler sem mapa.

⚠ **A solução é compilar o kernel você mesmo** (o lab do módulo anterior já montou isso):

```bash
cd ~/linternals-lab/kernel
ls -la vmlinux                     # ELF com simbolo, o que o gdb le

# E o DWARF, que o pahole le
pahole -C task_struct vmlinux | head -40
```

---

## 2.2 `vmlinux`, `bzImage`, `System.map` — o que é o quê

Três arquivos, e a confusão entre eles custa horas:

| Arquivo | O que é | Para que serve |
|---|---|---|
| `vmlinux` | ELF **não comprimido**, com símbolo e DWARF | ⚠ **Depurador e `pahole`** |
| `arch/x86/boot/bzImage` | Kernel **comprimido**, para dar boot | ⚠ **O QEMU** |
| `System.map` | Mapa endereço→nome, em texto | Conferência rápida, sem depurador |

⚠ **Você dá boot com `bzImage` e depura com `vmlinux`.** São o mesmo kernel em dois formatos — mas só o primeiro tem as informações que o `gdb` precisa.

```bash
# Ligar gdb ao kernel do QEMU (o -s -S do lab)
cd ~/linternals-lab
gdb kernel/vmlinux \
    -ex 'target remote :1234' \
    -ex 'break start_kernel' \
    -ex 'continue'
```

⚠ **`nokaslr` importa aqui.** Com KASLR ligado, os endereços mudam a cada boot e o `vmlinux` não bate com a memória. No lab, desligue — e anote a lição para quando for o contrário (módulo 4).

---

## 2.3 Navegar `struct` sem a fonte

O fluxo que você vai repetir em todo CVE:

```gdb
(gdb) p current                      # o task_struct do processo atual
(gdb) p current->comm               # nome
(gdb) p current->pid
(gdb) p current->cred               # a credencial — modulo 8
(gdb) p *(struct cred *)current->cred
(gdb) p current->files              # a tabela de arquivos abertos
(gdb) p current->files->fdt
```

⚠ **`current` é a chave.** No kernel, `current` é uma macro que resolve o `task_struct` do contexto atual — e é o ponto de partida de quase toda investigação.

E a ferramenta que substitui a leitura de header:

```bash
# O layout completo de uma struct, com offset de cada campo
pahole -C cred ~/linternals-lab/kernel/vmlinux

# Uma struct dentro de outra
pahole -C file ~/linternals-lab/kernel/vmlinux

# Procura por nome de campo (onde esta o campo 'f_count'?)
pahole ~/linternals-lab/kernel/vmlinux 2>/dev/null | grep -B5 'f_count'
```

⚠ **`pahole` é o `nm`+`readelf` do desenvolvedor de kernel.** Ele lê o DWARF e imprime a estrutura **como o compilador a montou** — com padding, alinhamento e ordem reais, que não são a ordem do header.

---

## 2.4 Do `oops` à linha de código

Um crash de kernel imprime endereços. Transformá-los em código é uma habilidade mecânica:

```
BUG: unable to handle page fault for address: 00000000000000d8
RIP: 0010:minhas_funcao+0x2f/0x100
Call Trace:
 <TASK>
 outro_ponto+0x41/0x80
```

Três passos:

```bash
# 1. Onde esta o simbolo? (endereco -> funcao+offset)
gdb kernel/vmlinux -ex 'info line *(minhas_funcao+0x2f)' -ex quit

# 2. A instrucao exata, com fonte se voce tiver o codigo
gdb kernel/vmlinux -ex 'disassemble /s minhas_funcao' -ex quit | grep -A12 '<+0x2f>'

# 3. A linha, no fonte
sed -n '120,140p' algum_arquivo.c
```

⚠ **E a leitura que vale mais que o número:** o endereço `0x00000000000000d8` é um **deslocamento pequeno**. Isso significa **desreferência de ponteiro `NULL`** — alguém leu `algum_ponteiro->campo`, e `algum_ponteiro` era nulo. É o padrão mais comum de bug de kernel.

| Endereço do `oops` | O que sugere |
|---|---|
| `0x00000000000000nn` | ⚠ **Ponteiro `NULL`** + offset do campo |
| `0xffffffffdeadbeef` | Memória liberada (com `SLAB_POISON`) |
| `0xffff8880...` | Endereço válido de heap — **alvo depois da liberação** |
| `0x4141414141414141` | ⚠ **Dado controlado** — o bug é explorável |

⚠ **Essa última linha é a que você procura.** Quando o `oops` mostra o **seu** padrão, você não achou um crash — achou uma **primitiva**.

---

## 2.5 O mapa do ring 0

O espaço de endereço do kernel tem regiões fixas. Saber onde você está é saber o que pode:

| Faixa | O que é |
|---|---|
| `ffffffff80000000`+ | Texto do kernel — código, só leitura |
| `ffffffffa0000000`+ | Módulos carregados |
| `ffff888000000000`+ (`PAGE_OFFSET`) | **Direct map** — toda a RAM mapeada linearmente |
| `ffffc90000000000`+ | `vmalloc` — alocação não contígua |
| `ffffe80000000000`+ | **`vmemmap`** — as `struct page` |

```bash
# Ver o mapa real desta maquina
sudo cat /proc/vmallocinfo | head -20
sudo grep -E 'kernel text|direct map|vmalloc' /proc/meminfo 2>/dev/null

# Como o kernel enxerga a si mesmo, no gdb
(gdb) p/x (unsigned long)&_text
(gdb) p/x (unsigned long)phys_base
```

⚠ **O direct map é a peça que mais confunde.** Todo endereço físico de RAM tem um endereço virtual **correspondente** na faixa `ffff8880...`. Isso significa que uma primitiva de leitura/escrita relativa pode escalar para **qualquer** posição de memória física — é o que faz um bug pequeno valer muito.

---

## 2.6 `kallsyms`: o símbolo em runtime

`símbolo → endereço` e `endereço → símbolo` no kernel rodando:

```bash
# Funcao pelo nome
sudo grep -w 'commit_creds' /proc/kallsyms

# Endereco pelo simbolo, na VM (via gdb)
(gdb) info address commit_creds
(gdb) p commit_creds               # endereco da funcao
(gdb) p *(struct cred*)0xffff8880...  # a estrutura

# Escrever um simbolo que nao existe no kallsyms
sudo bash -c 'echo "0 $(grep -w commit_creds /proc/kallsyms | cut -d" " -f1)" > /sys/kernel/debug/tracing/...' 2>/dev/null
```

⚠ **`/proc/kallsyms` mostra `0000000000000000` para usuário comum** — proteção contra KASLR leak. Com `sudo`, mostra o endereço real. É por isso que o módulo 4 trata de **vazamento de endereço** como passo separado da exploração.

---

## Laboratório 2 — Abrir o kernel

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```bash
cd ~/linternals-lab
K=kernel/vmlinux

# 1. Sanidade: o vmlinux tem simbolo?
file $K
pahole -C task_struct $K | head -5

# 2. Sobe a VM com gdb pendurado
#    (terminais separados)
terminal1$ qemu-system-x86_64 -kernel kernel/arch/x86/boot/bzImage \
    -initrd initramfs.cpio.gz -append "console=ttyS0 nokaslr" \
    -nographic -s -S -m 2G
terminal2$ gdb $K -ex 'target remote :1234' \
                -ex 'break start_kernel' -ex continue

# 3. No gdb, quando parar:
(gdb) p current
(gdb) p current->comm
(gdb) p current->pid
(gdb) p *(struct cred *)current->cred

# 4. Layout de uma struct, com offset
pahole -C cred $K

# 5. Trace de uma syscall ate a funcao que a implementa
gdb $K -ex 'info address __x64_sys_write' -ex 'disassemble /m __x64_sys_write' -ex quit

# 6. Do oops ao codigo: simule a conversao
#    escolha uma funcao qualquer, e ache "funcao+0x20" na fonte
F=$(nm $K | awk '$2=="t" && $3!=""{print $3; exit}')
gdb $K -ex "info line *($F+0x20)" -ex quit
```

**O que observar:** no passo 4, o `pahole` mostra campos que **não estão na ordem do header** — o compilador reordenou, inseriu padding, alinhou. É por isso que adivinhar offset a olho falha.

**Exercício:** pegue um `oops` de um CVE público de kernel, qualquer um dos últimos anos. Converta o `RIP` em linha, e o endereço da falha em causa (tabela do 2.4). Escreva o parágrafo de causa raiz em cinco linhas, sem consultar o writeup — depois compare. Se acertou a classe do bug, você já sabe ler kernel.

---

## Resumo

- Kernel de distribuição **não tem debug info**; o `vmlinux` compilado por você tem símbolo e DWARF.
- ⚠ **`bzImage` dá boot, `vmlinux` depura** — e `nokaslr` faz os dois concordarem.
- `current` é o ponto de partida; `pahole` é a fonte de verdade do **layout real**.
- ⚠ **Um `oops` com endereço pequeno é `NULL` deref; com `0x41...` é dado controlado — é a diferença entre crash e primitiva.**
- O **direct map** (`ffff8880...`) mapeia toda a RAM; uma primitiva relativa pode escalar para memória física inteira.
- `/proc/kallsyms` só mostra endereço real com privilégio — é a razão de o vazamento ser um passo separado.

---

## O que o próximo módulo entrega

Você sabe ler o kernel. O módulo 3 abre o **heap do kernel**: `/proc/slabinfo`, `kmalloc`, as caches, os `flags` de alocação — e a vida de um buffer, da alocação à liberação, que é o cenário de todo UAF do curso.
