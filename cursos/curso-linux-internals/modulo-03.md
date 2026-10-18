# Módulo 3 — Heap do Kernel: `slab`, `kmalloc`, e a Vida de um Buffer

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 3 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 e 2
**Próximo:** Módulo 4 — UAF, race e refcount

---

## O que este módulo entrega

Ao final, você vai entender **onde o kernel guarda seus objetos**, **quem decide o tamanho**, e **o que acontece exatamente** quando um buffer é liberado e outro ocupa o lugar. UAF, double-free, overflow de heap e corrupção de pool são todos consequência do que este módulo explica — sem ele, você decora nomes de CVE sem entender o mecanismo.

---

## 3.1 Por que o kernel não usa `malloc`

O `malloc` do userspace não existe em ring 0. Três motivos:

1. **Não há processo para gerenciar o heap** — o alocador é por processo, e o kernel não é um processo.
2. **Não pode dormir sempre** — há contexto onde dormir é ilegal (interrupção, `spinlock`).
3. ⚠ **Precisa ser rápido e previsível** — milhares de alocações por segundo, em caminho crítico.

O kernel tem **duas famílias** de alocador:

| Alocador | Serve | Característica |
|---|---|---|
| **`kmalloc`/`kfree`** | Alocação pequena, contígua **virtual e física** | Rápido, tamanho fixo por cache |
| **`vmalloc`/`vfree`** | Alocação grande, contígua só **virtual** | Pode dormir, mais lento |
| **`kmem_cache_*`** | Objeto de **tipo fixo**, muito alocado | ⚠ **O caso importante** |

⚠ **`vmalloc` não dá `kmalloc` grande.** A diferença não é tamanho — é **contiguidade física**. Dispositivo precisa de físico contíguo; estrutura grande, não.

---

## 3.2 O slab allocator em um parágrafo

⚠ **A ideia:** em vez de gerenciar bytes, o kernel gerencia **objetos de tamanho fixo**, agrupados em `slab`, dentro de `cache`.

```
   kmalloc-64          (cache de objetos de 64 bytes)
   ┌──────────────────────────────────────────┐
   │  slab (uma pagina, ou varias)            │
   │  ┌────┬────┬────┬────┬────┬────┬────┐   │
   │  │obj │obj │obj │obj │ ⚪ │obj │obj │   │
   │  └────┴────┴────┴────┴────┴────┴────┘   │
   │                        ↑                 │
   │                   liberado (free list)   │
   └──────────────────────────────────────────┘
```

⚠ **Três consequências que definem todo exploit de heap de kernel:**

1. **O tamanho é arredondado para a cache.** Pedir 40 bytes → cache `kmalloc-64` → ⚠ você **ocupa 64**.
2. **Objeto liberado volta para a free list e é reutilizado.** ⚠ **É isso que faz UAF ser explorável**: o dado do atacante entra no lugar do objeto liberado.
3. **Caches de tipo fixo agrupam objetos iguais.** ⚠ É o que permite o **`heap spray`** — inundar a cache com objetos do mesmo tipo e controlar o que reocupa o buraco.

---

## 3.3 Ver o heap rodando

```bash
# As caches do sistema
sudo cat /proc/slabinfo | head -20
sudo cat /proc/slabinfo | sort -k3 -nr | head -15    # as maiores

# Uma cache especifica, em detalhe
sudo cat /proc/slabinfo | grep -E '^kmalloc-64'
# nome   ativos  total  objsize  objperslab  pagesperslab
# kmalloc-64  1234  1408   64        64          1

# Com o slab_debug ligado (boot param)
# slab_debug            -> poisoned objects, redzone, verificacao
# Este e o KASAN do slab, junto com KASAN no boot
```

⚠ **A leitura que importa:** `ativos` vs `total`. Se `ativos` está longe de `total`, a cache tem muitos objetos livres — **é onde você consegue reocupar rápido**.

```bash
# As caches de tipo fixo (as mais interessantes para exploit)
sudo cat /proc/slabinfo | awk '/^[a-z]/ && $1 !~ /^(kmalloc|dma|dentry|inode)/ {print $1, $2, $3}' | head -30
```

⚠ **Caches nomeadas — `filp`, `cred_jar`, `key_jar`, `pid`, `signal_cache`, `sock_inode_cache`** — são o alvo preferido, porque **o tipo é conhecido**. Alocar na `cred_jar` é alocar uma credencial; se você controla o conteúdo, você controla a credencial. O módulo 8 usa isso.

---

## 3.4 `kmalloc`: flags que decidem o comportamento

```c
void *kmalloc(size_t size, gfp_t flags);
void *kzalloc(size_t size, gfp_t flags);   // zerado
void *kcalloc(size_t n, size_t size, gfp_t flags);  // array, com overflow check
```

| Flag | O que faz | Onde importa |
|---|---|---|
| `GFP_KERNEL` | Pode dormir; uso geral | Contexto de processo |
| `GFP_ATOMIC` | **Não pode dormir** | Interrupção, `spinlock` |
| `GFP_NOWAIT` | Não espera memória | Caminho crítico |
| `__GFP_ZERO` | Zera | ⚠ **Ausência é bug de leak** |
| `__GFP_ACCOUNT` | Contabiliza no `cgroup` | ⚠ Isolamento |

⚠ **`GFP_ATOMIC` em contexto que pode dormir, ou `GFP_KERNEL` em interrupção, é bug.** Não necessariamente de segurança — mas de estabilidade, e o `oops` resultante costuma ser confundível com bug de memória.

⚠ **`__GFP_ZERO` ausente é o que produz "memory disclosure".** A estrutura nova contém **os bytes do objeto anterior**, que outro componente liberou. Se aquilo for copiado para o userspace, você leu memória do kernel. É a mesma classe do `CVE-2018-9568` e de dezenas de outros.

---

## 3.5 A vida de um buffer — e as quatro falhas

Sequência, com as falhas marcadas:

```
   1. kmalloc(64, GFP_KERNEL)
        │
        ├─► ⚠ FALHA A: tamanho calculado com overflow
        │      kmalloc(user_len * 4, ...)  ->  wrap -> buffer pequeno
        │
        ▼
   2. uso: memcpy(dest, src, len)
        │
        ├─► ⚠ FALHA B: copia mais que o alocado
        │      len > 64  ->  escreve no objeto VIZINHO
        │
        ▼
   3. kfree(ptr)
        │
        ├─► ⚠ FALHA C: double-free
        │      kfree(ptr) chamado duas vezes  ->  free list corrompida
        │
        ▼
   4. o ponteiro continua valido no codigo
        │
        └─► ⚠ FALHA D: use-after-free
               outro kmalloc(64) recebe o mesmo endereco
               ->  o atacante escreve no objeto "liberado"  ->  controle
```

⚠ **A FALHA D é a rainha, e é o módulo 4 inteiro.** Ela é a mais explorável porque:
- **não precisa de overflow** — não depende de cálculo errado;
- **o atacante controla o que entra** — basta alocar na cache certa;
- **a janela é ampla** — o objeto liberado fica na free list até alguém reocupar.

```c
// A forma canonica do bug — leia agora, reconheca sempre
void bug(struct ctx *c) {
    kfree(c->buf);            // libera
    // ... caminho de erro ...
    kfree(c->buf);            // ⚠ double-free: nao zerou c->buf

    // ou:
    pr_info("%s\n", c->buf);  // ⚠ use-after-free: leu o que ja foi liberado

    // ou em outra thread, sem lock:
    memcpy(c->buf, data, n);  // ⚠ escreve no objeto reciclado
}
```

⚠ **A correção universal é sempre a mesma:** zerar o ponteiro após `kfree`, e **proteger com lock** o trecho entre ler e usar.

---

## 3.6 `heap spray` no kernel

⚠ **A técnica que transforma um UAF em controle.** Não é exploit — é o **passo** de exploit:

```c
// Pseudocodigo do raciocinio, nao um exploit
// 1. O objeto alvo e liberado (o bug)
// 2. Aloque N objetos do MESMO tipo/tamanho, com conteudo CONTROLADO
//    -> um deles cai no endereco do objeto liberado
// 3. Use o ponteiro obsoleto  ->  ele agora aponta para o SEU dado
```

| Alvo | Cache | Como controlar o conteúdo |
|---|---|---|
| Credencial | `cred_jar` | ⚠ Difícil sem primitiva |
| Arquivo aberto | `filp` | `open()` de caminho próprio |
| Socket | `sock_inode_cache` | `socket()` |
| Chave | `key_jar` | `add_key()` |
| Mensagem | `kmalloc-N` | ⚠ `msg_msg` — **o favorito** |
| Pipe buffer | `kmalloc-N` | `pipe()` + `write()` |

⚠ **`msg_msg` é o cavalo de Troia do heap de kernel.** Você aloca um `msg_msg` de tamanho arbitrário com `msgsnd()`, e **o conteúdo é seu** — outra técnica clássica de exploit de kernel. O `pipe_buffer` tem função semelhante e ganhou o nome de *Dirty Pipe* em 2022.

⚠ **E é aqui que a fronteira fica clara:** este módulo ensina **por que** o spray funciona e **qual cache** olhar. **Como** montar a cadeia que vira root é o curso de Exploit Development — e, na prática, o que você aprende é a mecânica do heap, não uma receita.

---

## Laboratório 3 — Ver o heap

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```bash
cd ~/linternals-lab/m03

# 1. As caches, e o que esta cheio
sudo cat /proc/slabinfo | head -1              # cabecalho
sudo cat /proc/slabinfo | grep '^kmalloc-64'
sudo cat /proc/slabinfo | sort -k2 -nr | head -10

# 2. Caches de tipo fixo — os alvos
sudo cat /proc/slabinfo | grep -E '^(cred_jar|filp|key_jar|pid|signal_cache)'

# 3. Um modulo de kernel seu, que aloca e libera
cat > slabtest.c <<'EOF'
#include <linux/module.h>
#include <linux/slab.h>

static char *p;

static int __init slab_init(void) {
    p = kmalloc(40, GFP_KERNEL);          // 40 -> cache kmalloc-64
    pr_info("slabtest: alocado em %px\n", p);
    memset(p, 0x41, 40);
    kfree(p);
    pr_info("slabtest: liberado. ponteiro ainda em %px\n", p);
    return 0;
}
static void __exit slab_exit(void) { }
module_init(slab_init);
module_exit(slab_exit);
MODULE_LICENSE("GPL");
EOF

cat > Makefile <<'EOF'
obj-m += slabtest.o
KDIR := $(HOME)/linternals-lab/kernel
all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules
clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean
EOF

make
# Rode na VM: copie slabtest.ko, e
# insmod slabtest.ko && dmesg | tail -5

# 4. Veja onde o objeto caiu, e o que ocupa o lugar depois
#    (na VM, com KASAN e slab_debug: o uso depois do free vira relatorio)
```

**O que observar:** o endereço impresso no passo 3 é do tipo `ffff8880...` — está no **direct map**, como o módulo 2 mapeou. E o ponteiro continua válido **depois** do `kfree`: nada o invalida. É essa a janela.

**Exercício:** escreva um módulo que aloca 40 bytes, libera, e **escreve** no ponteiro liberado. Rode com `KASAN` ligado e leia o relatório. Depois responda: o relatório apontou o *use* ou a *liberação*? Por quê a diferença importa para quem vai explorar.

---

## Resumo

- O kernel não tem `malloc`; tem **`kmalloc` (físico contíguo)** e **`vmalloc` (só virtual)**.
- ⚠ **O slab agrupa objetos de tamanho fixo em cache** — pedir 40 bytes ocupa a cache `kmalloc-64`.
- **Objeto liberado volta para a free list e é reciclado** — é o mecanismo que torna UAF explorável.
- ⚠ **`GFP_ATOMIC` vs `GFP_KERNEL` é semântica de dormir**; `__GFP_ZERO` ausente produz vazamento de memória.
- As quatro falhas: **overflow de cálculo, overflow de cópia, double-free, use-after-free** — a última é a mais explorável.
- ⚠ **`heap spray`** é o passo que troca um objeto liberado por dado controlado; `msg_msg` e `pipe_buffer` são os veículos clássicos.
- Caches de **tipo fixo** (`cred_jar`, `filp`, `key_jar`) são os alvos preferidos porque o tipo é conhecido.

---

## O que o próximo módulo entrega

Você entende o palco. O módulo 4 entra nos **três bugs que o ocupam** — UAF, race e refcount — e ensina a **medir a janela** de cada um, com `KASAN`, `slab_debug` e reprodução determinística.
