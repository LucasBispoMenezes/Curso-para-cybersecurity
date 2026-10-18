# Módulo 1 — O Kernel Como Superfície: Syscall, Cópia, e Onde a Confiança Muda de Lado

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 1 de 11 · 3 horas
**Pré-requisitos:** Nenhum além do curso de Linux para Segurança e de C para Pesquisa
**Próximo:** Módulo 2 — Ler o kernel

---

## O que este módulo entrega

Ao final, você vai saber **descrever o caminho completo de uma syscall** — da instrução no userspace até o retorno — e **apontar o instante exato** em que o kernel para de desconfiar do dado. Toda escalação de privilégio deste curso mora nesse instante. Quem não sabe localizá-lo lê CVE sem entender o bug.

---

## 1.1 O modelo de dois mundos

O processador x86-64 tem **quatro anéis** de privilégio (ring 0 a ring 3). O Linux usa dois:

| Anel | Quem roda | O que pode |
|---|---|---|
| **Ring 3** (userspace) | Seu processo, a libc, o navegador | Não acessa memória do kernel, não executa instrução privilegiada |
| **Ring 0** (kernel) | O núcleo, os drivers, os módulos | **Tudo**. Memória, dispositivo, interrupção, página |

⚠ **A separação é de hardware, não de software.** Não é uma convenção que o programa respeita: é o processador recusando. `mov %cr0` em ring 3 gera exceção. `in`/`out` em ring 3 gera exceção. Acessar endereço de kernel em ring 3 gera falha de página.

⚠ **E é por isso que a superfície de ataque é a fronteira, não o interior.** O processo malicioso nunca "entra" no kernel. Ele **pede**, através de uma porta que o kernel é obrigado a atender: a **syscall**.

---

## 1.2 Anatomia de uma syscall

Do `write()` no seu código até a resposta:

```
   userspace                                          kernel
   ─────────                                          ──────

   write(fd, buf, n)                    glibc: wrapper
        │
        ▼
   glibc:
     eax = __NR_write (1)               ← número da syscall
     edi = fd
     rsi = buf
     edx = n
        │
        ▼
   syscall                             ─────────►  entrada ring 0
        │                                            │
        │                                     entry_SYSCALL_64
        │                                            │
        │                                     switch por eax
        │                                            │
        │                                     __x64_sys_write
        │                                            │
        │                                     fget(fd)  ← valida!
        │                                            │
        │                                     copy_from_user  ← COPIA
        │                                            │
        │                                     vfs_write
        │                                            │
        │                                     retorno em rax
        │                                            │
        ▼                                            ▼
   sysret                              ◄────────  volta ring 3
```

⚠ **Quatro coisas acontecem nessa travessia, e cada uma é uma classe de bug:**

| Etapa | O que o kernel faz | Se ela falhar |
|---|---|---|
| **Busca do objeto** | `fget(fd)` — o `fd` é índice na tabela de arquivo aberto | **UAF** — o objeto sai da tabela no meio |
| **Cópia** | `copy_from_user` — traz os bytes do userspace | **Race** — o dado muda entre validar e usar (TOCTOU) |
| **Validação** | Checa tamanho, formato, faixa | **Overflow** — o tamanho não cabe |
| **Uso** | Escreve, lê, libera | **UAF / double-free** |

⚠ **A pergunta do curso inteiro está na terceira coluna:** *o kernel validou — mas ele validou **depois** de copiar, ou **antes**? E o dado mudou no meio?*

---

## 1.3 `copy_from_user` e a armadilha do TOCTOU

O kernel **não** pode simplesmente ler o ponteiro do userspace. Três motivos:

1. O endereço pode nem existir naquele processo.
2. Pode existir, mas não ser legível — e o kernel daria falha de página em ring 0, o que é grave.
3. ⚠ **O endereço pode ser alterado por outra thread entre a validação e o uso.**

O caso 3 é a fonte de metade dos bugs reais. Veja a sequência:

```c
// Padrão ERRADO — clássico TOCTOU de kernel
struct req *r = (struct req *)arg;     // arg vem do userspace

if (r->len > MAX)                       // valida lendo do userspace
    return -EINVAL;

// ← outra thread muda r->len para 0xFFFFFFFF aqui

memcpy(dest, r->buf, r->len);           // usa, e estoura
```

⚠ **A correção é a ordem:** copie **uma vez** para um buffer do kernel, valide **o buffer do kernel**, use **o buffer do kernel**. O dado do userspace nunca é lido duas vezes.

```c
// Padrão CORRETO
struct req tmp;

if (copy_from_user(&tmp, arg, sizeof(tmp)))
    return -EFAULT;

if (tmp.len > MAX)                      // valida o buffer do KERNEL
    return -EINVAL;

memcpy(dest, tmp.buf, tmp.len);         // usa o buffer do KERNEL
```

⚠ **Essa é a regra que você vai reconhecer em todo CVE deste curso.** Quando ler o diff de um patch de kernel, procure **se a mudança é a ordem entre validar e usar**. Na maioria das vezes, é.

---

## 1.4 Syscall number, `syscall table` e superfície real

Cada arquitetura tem sua tabela. No x86-64, `__NR_write` é 1, `__NR_openat` é 257, `__NR_io_uring_setup` é 425.

⚠ **O tamanho da superfície é o que importa, e ele é maior do que parece:**

```bash
# Quantas syscalls esta máquina expõe?
grep -c '^[0-9]' /usr/include/x86_64-linux-gnu/asm/unistd_64.h

# A tabela viva do kernel rodando
sudo cat /proc/kallsyms | grep -c '__x64_sys_'
```

⚠ **E não é o número que importa — é o número de ARGUMENTOS e o de ESTRUTURAS que eles aceitam.** `io_uring_setup` é uma syscall; ela dá acesso a **dezenas de operações**, cada uma com seu parser. É por isso que o módulo 5 é um módulo inteiro.

| Superfície | Onde dói |
|---|---|
| Syscall clássica | Estável, muito auditada, poucos bugs novos |
| **`io_uring`** | ⚠ Nova, complexa, pouca auditoria — **módulo 5** |
| **`netlink` / `nftables`** | ⚠ Parser de regra — **módulo 6** |
| **`eBPF`** | ⚠ Verifier como superfície — **módulo 10** |
| **`cgroup` / namespace** | ⚠ Fronteira que não é — **módulo 7** |
| `keyring` | ⚠ Segredo no kernel — **módulo 9** |

---

## 1.5 `syscall` direta: sem libc

Para ver o que a libc esconde, escreva o `write` você mesmo:

```c
// nodo-nolibc.c — escreve "ok\n" no stdout sem usar libc
#include <unistd.h>
#include <sys/syscall.h>

int main(void) {
    const char msg[] = "ok\n";
    // write(1, msg, 3) direto pela instrução syscall
    long ret = syscall(SYS_write, 1, msg, 3);
    return ret < 0 ? 1 : 0;
}
```

Compile com `-nostdlib` e um `_start` próprio, e você verá: **entre o seu processo e o kernel há exatamente uma instrução.** Tudo o mais — `printf`, `malloc`, `fopen` — é conveniência construída no userspace.

⚠ **Consequência prática:** quando você audita um binário suspeito, a pergunta "o que ele faz?" é quase sempre respondida por **quais syscalls ele chama**. `strace` mostra isso; é o primeiro comando do módulo 2.

---

## 1.6 Onde a confiança muda de lado, formalmente

⚠ **A definição que o curso usa:**

> **A fronteira de confiança do kernel é a instrução `syscall` — e depois dela, todo dado do
> userspace é HOSTIL até prova em contrário.**

Isso significa que o kernel **nunca** pode:

- desreferenciar ponteiro do userspace sem `copy_from_user`;
- confiar em tamanho, contador ou índice sem verificação de faixa;
- usar dado lido do userspace **duas vezes** (TOCTOU);
- manter ponteiro para memória de userspace além da syscall;
- supor que o dado é o mesmo que validou.

⚠ **E o jeito de testar se o autor sabia disso: procure o padrão acima no código-fonte do driver.** Cada violação é um bug candidato.

---

## Laboratório 1 — Ler a travessia

**Objetivo:** observar uma syscall por dentro, e ver a cópia acontecer.

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```bash
mkdir -p ~/linternals-lab/m01 && cd ~/linternals-lab/m01

# 1. Ver as syscalls do hello world
cat > hello.c <<'EOF'
#include <unistd.h>
int main(void){ write(1, "hello\n", 6); return 0; }
EOF
gcc -o hello hello.c
strace -c ./hello            # resumo por syscall
strace -e trace=write ./hello  # so o write, com argumentos

# 2. Uma syscall pelo numero, sem libc
cat > raw.c <<'EOF'
#include <sys/syscall.h>
static long my_write(int fd, const char *b, unsigned long n){
    long r;
    __asm__ volatile("syscall" : "=a"(r)
        : "a"(SYS_write), "D"(fd), "S"(b), "d"(n)
        : "rcx","r11","memory");
    return r;
}
static void my_exit(int c){
    __asm__ volatile("syscall" :: "a"(SYS_exit), "D"(c) : "rcx","r11","memory");
    __builtin_unreachable();
}
void _start(void){ my_write(1, "raw\n", 4); my_exit(0); }
EOF
gcc -nostdlib -static -o raw raw.c
./raw                        # imprime "raw" sem libc nenhuma

# 3. Ver a tabela de syscalls
grep -E '__NR_(write|openat|io_uring_setup|bpf)\b' \
     /usr/include/x86_64-linux-gnu/asm/unistd_64.h
```

**O que observar:** no passo 2, o `strace` mostra `write(1,"raw\n",4) = 4` — a **mesma** syscall que o `hello` fez. A libc não faz mágica; ela organiza registrador.

**Exercício:** rode `strace -f` sobre um programa com threads e ache a syscall `clone`. Explique por que a criação de thread é uma syscall e a criação de corrotina não.

---

## Resumo

- O processador mantém ring 3 e ring 0 **em hardware**; a fronteira é a instrução `syscall`.
- Toda syscall passa por **busca do objeto → cópia → validação → uso**.
- ⚠ **`copy_from_user` copia — validar e usar o *buffer do kernel* é o que evita TOCTOU.**
- O kernel não pode desreferenciar ponteiro de userspace, confiar em tamanho, nem ler duas vezes.
- A superfície real não é o número de syscalls, e sim o de **estruturas e parsers** que elas aceitam.
- A superfície moderna — `io_uring`, `netfilter`, `eBPF`, `cgroup` — é onde os CVE de hoje moram.

---

## O que o próximo módulo entrega

Você sabe **o que** atravessa a fronteira. O módulo 2 ensina a **ver o outro lado**: compilar o kernel com símbolos, abrir `vmlinux` no `gdb` e navegar `struct` sem a fonte do alvo — a habilidade que os dez módulos seguintes assumem.
