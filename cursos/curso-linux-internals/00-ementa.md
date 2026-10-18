---
title: "Linux Internals, Kernel e Escalonamento de Privilégios: O Sistema Que Confia em Quem Não Devia"
nivel: avancado
tags: [linux, kernel, escalonamento, io_uring, nftables, uaf, namespace, ebpf]
---
# Linux Internals, Kernel e Escalonamento de Privilégios

**Ementa do curso · 34 horas · 11 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Syscall** | Chama `read` e `write` | Sabe onde o kernel copia, confia e valida |
| **Kernel** | "é um programa grande" | Lê `vmlinux` no `gdb`, com símbolo e estrutura |
| **Buffer** | Sabe o que é `kmalloc` | Prevê o UAF pela contagem de referência |
| **Superfície** | Enumera porta e serviço | Enumera `io_uring`, `nftables`, `keyring`, `eBPF` |
| **Privilégio** | Sabe `sudo` | Entende `cred`, capability, `seccomp` e namespace |
| **Contêiner** | Sabe `docker run` | Sabe **por que** ele não é fronteira, e onde cede |
| **Falha** | "deu kernel panic" | **Reproduz o CVE** e escreve o reporte |
| **Mentalidade** | "é bug de kernel, é raro" | **"onde o kernel confia no userspace?"** |

**Pré-requisito duro:** curso de **Linux para Segurança** (permissão, `/proc`, namespace, capability) · curso de **C para Pesquisa de Segurança** (memória, UB, ponteiro, `/proc`).
**Ajuda muito:** curso de **Assembly e RE** (leitura de disassembly do kernel) e curso de **Exploit Development** (primitiva).

⚠ **Sem os dois primeiros, você trava no módulo 2.** Este curso **usa** os dois — e não repete o que eles ensinam.

---

## Por que este curso existe

⚠ **O curso de Linux para Segurança ensinou que a escalação quase sempre é MÁ CONFIGURAÇÃO.** Binário `setuid` de terceiro, `sudo NOPASSWD`, capability `cap_sys_admin` larga, serviço rodando como `root`, contêiner com socket do Docker montado. Isso é metade do problema — **e é a metade que não é bug**.

⚠ **Este curso é a outra metade.** O kernel como **superfície de ataque**: código que roda em ring 0, que confia em dado vindo do userspace, e cuja falha **não é configuração** — é bug.

| Achado real | O que é | Este curso |
|---|---|---|
| Binário `setuid` de terceiro | Má configuração | curso de Linux para Segurança |
| `sudo` com `NOPASSWD` amplo | Má configuração | curso de Linux para Segurança |
| CVE no `nf_tables` | ⚠ **Bug de kernel** | **este curso** |
| UAF em `struct file` | ⚠ **Bug de kernel** | **este curso** |
| Fuga de `cgroup` | ⚠ **Bug de kernel** | **este curso** |
| Falha no verifier do `eBPF` | ⚠ **Bug de kernel** | **este curso** |

⚠ **A tese do curso:**

> **Escalação de privilégio é sempre a mesma pergunta:** **onde o kernel confia em dado que veio do
> userspace — e quem valida?** A syscall copia o dado. A pergunta é **o que o kernel faz depois**.

⚠ **E o motivo de ele existir agora, e não em 2016:** quase todo material de escalação de privilégio
em Linux **para no `dirtycow`**. O `dirtycow` é de 2016 — e a superfície que mais cresceu desde então
é **`io_uring`**, **`nftables`**, **`eBPF`** e **`cgroup v2`**. É lá que os CVE de hoje moram, e é
onde os cursos não chegam.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Descrever o **caminho de uma syscall** — entrada, cópia, validação, retorno — e apontar onde a confiança muda de lado.
2. Ler o **kernel com símbolo** no `gdb`, sobre `vmlinux`, e navegar `struct` sem fonte do alvo.
3. Reconhecer **UAF, doble-free, race e out-of-bounds** no heap do kernel, e explicar a janela em cada um.
4. Enumerar a **superfície moderna** — `io_uring`, `nftables`, `keyring`, `eBPF`, `cgroup` — e o ponto de entrada de cada uma.
5. Entender **namespace e `cgroup`** como mecanismo de kernel, e prever onde a fronteira cede.
6. Ler `cred`, `token`, **capability** e `seccomp` do lado do kernel, não da configuração.
7. Explicar o **verifier do eBPF** e o que ele garante — e o que ele não garante.
8. **Reproduzir um CVE** de escalação em laboratório próprio, com o kernel compilado por você.
9. **Detectar** escalação em curso com `auditd`, LSM e `eBPF`.
10. **Escrever o reporte**: a cadeia da falha, a primitiva, o impacto e a correção.

---

## O laboratório

```bash
sudo apt update
sudo apt install -y build-essential git qemu-system-x86 \
                    libncurses-dev flex bison libssl-dev libelf-dev \
                    dwarves bc cpio gdb pahole \
                    linux-source-6.8 linux-headers-$(uname -r) \
                    python3 python3-pip clang llvm bpftrace

mkdir -p ~/linternals-lab && cd ~/linternals-lab

# Kernel de laboratorio: compila com simbolo e debug info.
git clone --depth 1 -b v6.8 https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git kernel
cd kernel
make defconfig
scripts/config --enable DEBUG_INFO_DWARF5 \
               --enable GDB_SCRIPTS \
               --enable KASAN \
               --enable DEBUG_INFO_BTF \
               --disable DEBUG_INFO_NONE
make -j"$(nproc)"
ls -la vmlinux

# Imagem inicial para o QEMU.
cd ..
mkdir -p rootfs && cd rootfs
busybox --install -s 2>/dev/null || true
find . | cpio -o -H newc | gzip > ../initramfs.cpio.gz

# Sobe o kernel com gdb escutando na 1234.
cd ..
qemu-system-x86_64 -kernel kernel/arch/x86/boot/bzImage \
  -initrd initramfs.cpio.gz -append "console=ttyS0 nokaslr" \
  -nographic -s -S -m 2G
```

⚠ **Três decisões do laboratório, e todas importam:**

⚠ **O kernel é compilado por você**, com `DEBUG_INFO` e símbolos. Kernel de distribuição não tem debug info, e sem ela você não navega estrutura nem lê o `struct` no `gdb` — o curso inteiro depende disso.

⚠ **`KASAN` ligado.** Sem sanitizer de kernel, um UAF pode não dar panic nenhum e você conclui que "não é bug". Com ele, o uso depois da liberação vira **relatório**, não silêncio.

⚠ **`nokaslr` e `-s -S`.** O `gdb` precisa de endereço previsível e a VM precisa **esperar** o depurador. É o que faz o módulo 2 funcionar.

⚠ **O alvo é o kernel que você compilou, no QEMU do seu host.** Nenhum lab deste curso aponta para alvo de terceiro.

---

## Como este curso se conecta aos outros

| Curso | Ligação |
|---|---|
| **Linux para Segurança** | Pré-requisito: `/proc`, permissão, namespace, contêiner |
| **C para Pesquisa de Segurança** | Pré-requisito: memória, UB, ponteiro, sanitizer |
| **Assembly e RE** | Ajuda: leitura de disassembly e comparação de binário |
| **Exploit Development** | Consequência: o kernel dá a primitiva; este curso a encontra |
| **Windows Internals** | Paralelo: o mesmo método em outro kernel — o próximo da trilha |
| **Detecção e Evasão** | Ligação: LSM, `auditd`, `eBPF` como telemetria |
| **Patch Diffing** | Ligação: o CVE de kernel é diff de binário |

⚠ **Este curso fecha a lacuna de dois.** O `Exploit Development` assume Linux em nível de sistema e o `Exploit` assume primitiva — e **nenhum dos dois abre o kernel**. Aqui você abre.

---

## Módulos

| # | Módulo | Horas |
|---|---|---|
| 1 | O kernel como superfície: syscall, cópia, e onde a confiança muda de lado | 3 |
| 2 | Ler o kernel: `vmlinux`, `gdb`, `struct`, e o mapa do ring 0 | 3 |
| 3 | Heap do kernel: `slab`, `kmalloc`, e a vida de um buffer | 3 |
| 4 | UAF, race e refcount: a janela, e como ela se mede | 4 |
| 5 | `io_uring`: a superfície nova que quase ninguém enumera | 3 |
| 6 | `netfilter` e `nftables`: parser de regra como superfície | 3 |
| 7 | Namespace e `cgroup`: por que o contêiner não é fronteira | 3 |
| 8 | `cred`, capability e `seccomp`: privilégio do lado do kernel | 3 |
| 9 | `keyring` e segredo no kernel: onde a credencial vive | 3 |
| 10 | eBPF: o verifier como superfície, e o que ele garante | 3 |
| 11 | Método: do CVE ao laboratório reproduzível, e o reporte | 3 |

---

## Avaliação e encerramento

- `avaliacoes.md` — banco de questões por módulo, com resposta comentada.
- `glossario.md` — os termos do curso, definidos uma vez, em ordem.
- `README.md` — índice e ordem de leitura.

---

*Material didático original. Todos os CVEs, falhas e primitivas são demonstrados em kernel
compilado pelo próprio aluno, em VM isolada, sem alvo de terceiro. Nenhum material que ensine
atacar sistema alheio.*
