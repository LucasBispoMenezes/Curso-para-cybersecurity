# Módulo 5 — `io_uring`: A Superfície Nova Que Quase Ninguém Enumera

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 5 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 6 — `netfilter` e `nftables`

---

## O que este módulo entrega

Ao final, você vai entender **por que `io_uring` concentra o maior número de CVE de escalação dos últimos anos**, como enumerar a superfície dela e **o que faz o modelo de memória compartilhada ser diferente de tudo que veio antes**. É a superfície que separa quem acompanha o estado da arte de quem ainda estuda `dirtycow`.

---

## 5.1 O que é, e por que existe

`io_uring` (Linux 5.1+) é uma interface de I/O assíncrono. A ideia central:

```
   userspace                                    kernel
   ─────────                                    ──────

   ┌─────────────┐  SQ (submission queue)  ┌──────────────┐
   │  app escreve│ ──────────────────────► │ io_uring     │
   │  uma SQE    │                         │ _enter()     │
   └─────────────┘                         │              │
                                           │  executa     │
   ┌─────────────┐  CQ (completion queue)  │  a operacao  │
   │ app le a CQE│ ◄────────────────────── │              │
   └─────────────┘                         └──────────────┘

   ⚠ As duas filas ficam em MEMORIA COMPARTILHADA
     entre userspace e kernel (mmap).
```

⚠ **A diferença que define tudo:** nas syscalls clássicas, o dado atravessa a fronteira via `copy_from_user`, e o kernel **copia** — o userspace não pode mudar o dado depois. Em `io_uring`, **o kernel lê as SQEs direto da memória do usuário**, sem cópia.

⚠ **Consequência 1 — desempenho:** sem cópia e sem troca de contexto por operação, `io_uring` é muito mais rápido que `read`/`write` em série.

⚠ **Consequência 2 — superfície:** o modelo de memória compartilhada reintroduz, em larga escala, **exatamente o problema que o módulo 1 mostrou**: o kernel confia em estrutura que o usuário controla, **e pode mudar no meio do uso**. TOCTOU deixa de ser caso raro e vira arquitetura.

---

## 5.2 Anatomia: `SQE`, `CQE` e o que dá para pedir

```c
// Simplificado — a estrutura de uma submissao
struct io_uring_sqe {
    __u8  opcode;      // ⚠ QUAL operacao (dezenas de valores)
    __u8  flags;
    __u16 ioprio;
    __s32 fd;
    __u64 off;
    __u64 addr;        // ⚠ ponteiro para DADO DO USUARIO
    __u32 len;
    __u64 user_data;
    union { /* parametros especificos por opcode */ };
};
```

⚠ **Duas coisas nessa estrutura são a fonte do problema:**

**1. `opcode` é polimórfico.** Uma syscall, dezenas de operações — `IORING_OP_READ`, `_WRITE`, `_SENDMSG`, `_SPLICE`, `_OPENAT`, `_STATX`, `_TIMEOUT`... Cada uma tem **seu próprio parser** e suas próprias suposições sobre o `union` de parâmetros. A superfície real não é `io_uring_setup`; são **as operações**.

**2. `addr` aponta para memória do usuário** — e o kernel a lê **sem cópia**, em momento diferente do que a submeteu.

```bash
# A lista completa de opcodes desta maquina
grep -o 'IORING_OP_[A-Z_]*' /usr/include/linux/io_uring.h | sort -u | wc -l
grep -o 'IORING_OP_[A-Z_]*' /usr/include/linux/io_uring.h | sort -u | head -30
```

⚠ **Enumere você mesmo, e tire a conclusão:** cada opcode é uma syscall disfarçada, dentro de uma syscall. É a razão de a área ser produtiva.

---

## 5.3 As três classes de bug

### Classe A — Validação de `addr` e `len`

O kernel recebe `addr` do usuário e lê sem `copy_from_user`. Se a validação de faixa está errada, o resultado é leitura/escrita em endereço arbitrário.

```c
// Padrao vulneravel (esqueleto)
int io_alguma_op(struct io_kiocb *req, struct io_uring_sqe *sqe) {
    void __user *arg = u64_to_user_ptr(sqe->addr);
    u32 len = sqe->len;

    // ⚠ se 'len' e 'addr' nao sao validados juntos...
    if (len > MAX)          // verifica um
        return -EINVAL;     // ⚠ e nada garante que arg continua o mesmo

    // ...acesso direto, sem copy
    return processar(arg, len);
}
```

⚠ **A regra que você vai aplicar em toda auditoria de `io_uring`:** *`addr`/`len` foram validados **no mesmo instante** em que são usados?* Se não, é candidato.

### Classe B — Ciclo de vida da requisição (`io_kiocb`)

A requisição é um objeto de kernel que **vive além** da syscall. Ela é enfileirada, executada possivelmente por outro contexto (worker, softirq), e completada depois.

| Padrão | O bug |
|---|---|
| Cancelamento concorrente | ⚠ UAF — a requisição é liberada enquanto executa |
| Erro depois de enfileirar | ⚠ Double-free da requisição |
| `io_uring_cancel` | ⚠ Corrida com a conclusão |
| Timeout + conclusão | ⚠ Duas conclusões da mesma requisição |

⚠ **Isso é o módulo 4 aplicado:** objeto com ciclo de vida longo, cancelamento de outro contexto, e refcount. A técnica de exploração é a mesma — muda só a estrutura.

### Classe C — Estado compartilhado entre `mmap` e kernel

As filas ficam em memória mapeada pelo **próprio usuário**. O kernel lê cabeçalho de fila (`*_head`, `*_tail`) dessa memória.

⚠ **O atacante pode:** mapear a página, e **alterar os índices a qualquer momento**, inclusive durante o processamento. Um `tail` que muda no meio faz o kernel ler uma SQE que ele não validou. É a definição de race com memória compartilhada — e a razão de o `userfaultfd` do módulo 4 não ser necessário aqui: **você já controla a memória que o kernel lê**.

---

## 5.4 Como enumerar a superfície

Metodologia, em quatro passos — aplicável a qualquer subsistema novo:

```bash
# 1. Onde esta o codigo
ls -la ~/linternals-lab/kernel/io_uring/
# io_uring.c  (⚠ historicamente gigante: foi dividido a partir de 5.19)
wc -l ~/linternals-lab/kernel/io_uring/*.c

# 2. Os pontos de entrada — o que vem do usuario
grep -rn 'copy_from_user\|u64_to_user_ptr\|unsafe_get_user' \
     ~/linternals-lab/kernel/io_uring/ | wc -l

# 3. As operacoes — cada uma e uma superficie
grep -rn 'static int io_.*_prep\|static int io_.*_issue\|IORING_OP_' \
     ~/linternals-lab/kernel/io_uring/ | head -40

# 4. Os pontos de vida e morte do objeto
grep -rn 'io_kiocb\|kfree\|kmem_cache\|refcount' \
     ~/linternals-lab/kernel/io_uring/*.c | wc -l
```

⚠ **A tabela que você produz ao final:**

| Operação | Arquivo | Entrada validada? | Objeto com refcount? | Suspeita |
|---|---|---|---|---|
| `IORING_OP_READ` | rw.c | sim | não | baixa |
| `IORING_OP_SPLICE` | splice.c | ⚠ parcial | sim | **média** |
| `IORING_OP_TIMEOUT` | timeout.c | ? | ⚠ sim | **média** |
| `IORING_OP_SENDMSG` | net.c | ? | ⚠ sim | **média** |

⚠ **Enumeração boa não é "listar opcode". É a coluna da direita — a hipótese, com critério.** É o mesmo princípio do curso de Enumeração Esotérica, aplicado ao kernel.

---

## 5.5 Por que esta área é produtiva — e a evidência

| Ano | O que aconteceu |
|---|---|
| 2021 | Primeiros CVE de escalação em `io_uring` |
| 2022 | ⚠ Diversos CVE de UAF com ganho de root |
| 2023–2024 | ⚠ **Concentração**: `io_uring` entra no topo dos subsistemas com mais CVE de `privesc` |
| 2025–2026 | ⚠ Superfície continua, com foco em cancelamento e ciclo de vida |

⚠ **Repare no padrão, e não no número:** a superfície é **nova** (2019), **complexa** (dezenas de opcodes com parsers próprios), **concorrente** (workers, cancelamento) e **com memória compartilhada**. Cada um desses quatro atributos, sozinho, já produz bug. Os quatro juntos produzem uma área.

⚠ **E a razão de quase nenhum curso cobrir isso:** a maioria dos cursos de escalação de privilégio foi escrita antes de 2020, quando `dirtycow` era o exemplo canônico. O material envelheceu — e é onde você tem vantagem.

---

## Laboratório 5 — Enumerar `io_uring`

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```bash
cd ~/linternals-lab/m05

# 1. O cabecalho, e a lista de operacoes
grep -o 'IORING_OP_[A-Z_]*' /usr/include/linux/io_uring.h | sort -u | wc -l
grep -o 'IORING_OP_[A-Z_]*' /usr/include/linux/io_uring.h | sort -u

# 2. Um programa minimo que abre um io_uring
cat > ur.c <<'EOF'
#include <linux/io_uring.h>
#include <sys/syscall.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <errno.h>

int main(void) {
    struct io_uring_params p;
    memset(&p, 0, sizeof(p));
    int fd = syscall(SYS_io_uring_setup, 8, &p);
    if (fd < 0) { perror("io_uring_setup"); return 1; }
    printf("io_uring ativo: fd=%d, SQ entries=%u, CQ entries=%u\n",
           fd, p.sq_entries, p.cq_entries);
    printf("features: 0x%08x\n", p.features);
    printf("offsets: sq_off.head=%u tail=%u ring=%u array=%u\n",
           p.sq_off.head, p.sq_off.tail, p.sq_off.ring_entries, p.sq_off.array);
    close(fd);
    return 0;
}
EOF
gcc -o ur ur.c && ./ur

# 3. Veja a syscall do lado de dentro
strace -e trace=io_uring_setup,io_uring_enter,io_uring_register ./ur

# 4. As paginas mapeadas (as filas em memoria compartilhada)
#    No strace, observe o mmap com IORING_OFF_SQ_RING e IORING_OFF_SQES
#    ⚠ E a essas paginas que o usuario e o kernel acessam ao mesmo tempo
```

**O que observar:** no passo 2, os `offsets` das filas. Eles **não** são ponteiros — são deslocamentos dentro do bloco que você mapeia. Você calcula o endereço da fila você mesmo, e o kernel usa o mesmo cálculo. É a memória compartilhada que a classe C explora.

**Exercício 1:** modifique o programa para submeter uma operação — um `IORING_OP_NOP`, o mais simples. Depois uma `IORING_OP_READ` de um arquivo seu. Observe como `addr`, `len` e `off` são preenchidos.

**Exercício 2:** na versão do kernel que você compilou, conte as linhas de `io_uring/` e o número de chamadas a `copy_from_user` e a `u64_to_user_ptr`. Escreva uma frase explicando por que o segundo número é o que importa para a superfície.

**Exercício 3 (o que vale):** escolha **uma** operação de `io_uring` do seu kernel e responda, por leitura de código: (a) onde os parâmetros entram, (b) se são copiados ou acessados direto, (c) se há um objeto com contador de referência envolvido. Escreva a coluna "suspeita" da tabela do 5.4 — com justificativa.

---

## Resumo

- ⚠ **`io_uring` troca cópia por memória compartilhada** — o kernel lê SQE direto da memória do usuário.
- Uma syscall, **dezenas de opcodes**, cada um com parser próprio: a superfície real são as **operações**.
- As três classes: **validação de `addr`/`len`**, **ciclo de vida do `io_kiocb`**, e **estado compartilhado via `mmap`**.
- ⚠ **O usuário controla a memória que o kernel lê** — race deixa de precisar de `userfaultfd`.
- A área é produtiva por **quatro atributos somados**: nova, complexa, concorrente e com memória compartilhada.
- ⚠ **Ela é ausente da maioria dos cursos porque eles foram escritos antes de 2020.**

---

## O que o próximo módulo entrega

Você sabe enumerar um subsistema novo. O módulo 6 aplica o mesmo método ao **`netfilter` e ao `nftables`** — onde a superfície não é memória compartilhada, e sim o **parser de uma linguagem**: a regra que o usuário escreve, e a estrutura que o kernel monta a partir dela.
