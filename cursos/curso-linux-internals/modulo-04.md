# Módulo 4 — UAF, Race e Refcount: A Janela, e Como Ela Se Mede

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 4 de 11 · 4 horas
**Pré-requisitos:** Módulos 1 a 3
**Próximo:** Módulo 5 — `io_uring`

---

## O que este módulo entrega

Ao final, você vai saber **reconhecer os três bugs de concorrência** do kernel, **medir a janela** de cada um e **reproduzir de forma confiável** — que é a diferença entre um crash aleatório e um achado. É o módulo mais longo do curso, e o mais reutilizado: os módulos 5, 6 e 11 assumem tudo daqui.

---

## 4.1 O que "janela" significa

⚠ **A definição que governa o módulo:**

> **Janela é o intervalo de tempo entre o objeto deixar de ser válido e o último uso dele.**
> Todo bug de concorrência é uma janela que alguém deixou aberta — e **medir** a janela é
> estimar a probabilidade de acertá-la.

| Bug | Janela | Como acertar |
|---|---|---|
| **Double-free** | Zero — é lógica | Determinístico |
| **UAF** | Da liberação ao último uso | ⚠ Precisa **reocupar** o objeto |
| **UAF com race** | Da liberação, com corrida | ⚠ Precisa **vencer a corrida** |
| **Refcount errado** | ⚠ Ampla — pode ser **permanente** | Só alocar |

⚠ **A escada é essa:** o bug de refcount é o mais fácil de explorar (a janela pode não fechar) e o race puro é o mais difícil. Vale lembrar quando você estiver escolhendo alvo.

---

## 4.2 Use-after-free: a anatomia completa

O bug, em três atos:

```c
// ATO 1 — o objeto existe, e alguem tem ponteiro para ele
struct ctx {
    struct file *f;
    void (*op)(struct ctx *);     // ⚠ ponteiro de funcao, no objeto
};
ctx->op = minha_operacao;

// ATO 2 — o objeto e liberado, mas o ponteiro CONTINUA alcancavel
kfree(ctx);                        // ctx->op agora e memoria livre
// (ou: fput(ctx->f) sem limpar o ponteiro, ou put_task_struct no lugar errado)

// ATO 3 — alguem usa o ponteiro obsoleto
ctx->op(ctx);                      // ⚠ le o ponteiro de funcao do objeto RECICLADO
```

⚠ **O que faz este bug valer muito:** o objeto contém **ponteiro de função**. Se você reocupar o bloco com dado controlado, o `call` vai para **onde você mandar**. Primitiva de controle de fluxo em ring 0 — é root, sem precisar de outra falha.

⚠ **Nem todo UAF é assim.** A escala de valor:

| O objeto reciclado contém | Você ganha |
|---|---|
| Contador, flag | Lógica errada — impacto baixo |
| Ponteiro para dado | ⚠ **Leitura controlada** |
| Tamanho | ⚠ **Overflow** |
| **Ponteiro de função** | ⚠⚠ **Controle de fluxo** |
| Estrutura inteira conhecida (`cred`) | ⚠⚠ **Root direto** |

---

## 4.3 Reference counting: como um objeto morre

Quase todo objeto de kernel tem contador. A regra é simples e a violação é o bug:

```
   get  ->  f_count++
   put  ->  f_count--
                  │
                  └─► chegou a 0? -> libera
                                    │
                                    ⚠ se alguem ainda tem ponteiro: UAF
```

```c
// As funcoes que voce vai ver em todo CVE de kernel
get_file(f)      / fput(f)         // struct file
get_task_struct(t)/ put_task_struct(t)  // task_struct
get_cred(c)      / put_cred(c)     // struct cred
sock_hold(sk)    / sock_put(sk)    // struct sock
kobject_get(k)   / kobject_put(k)  // qualquer kobject
```

⚠ **Os três padrões de bug de refcount:**

| Padrão | O que acontece |
|---|---|
| **`put` a mais** | ⚠ Contador chega a 0 cedo — objeto liberado em uso |
| **`get` a menos** | ⚠ Contador nunca chega a 0 — vazamento (e às vezes UAF depois) |
| **`get`/`put` em caminho de erro** | ⚠ O caminho que "não deveria acontecer" esquece o `put` |

```c
// O caso real mais comum — o caminho de erro
int entregar(struct obj *o) {
    struct resource *r = obter();
    if (!r) {
        put_obj(o);          // ⚠ alguem apagou este put
        return -ENOMEM;
    }
    if (falhou(r)) {
        put_res(r);
        put_obj(o);          // ⚠ ou este
        return -EIO;
    }
    put_res(r);
    return 0;                // ⚠ e aqui o objeto continua vivo com ref a mais
}
```

⚠ **Quando você lê um diff de patch com vários `put_*` em caminho de erro, suspeite de refcount.** É o padrão mais frequente em CVE de kernel dos últimos anos.

---

## 4.4 Race e TOCTOU no kernel

O módulo 1 mostrou o `copy_from_user` duas vezes. Aqui está o caso geral: **validar em um lugar, usar em outro, sem lock**.

```c
// Padrao vulneravel
static long meu_ioctl(struct file *f, unsigned int cmd, unsigned long arg) {
    struct req r;
    if (copy_from_user(&r, (void *)arg, sizeof(r)))
        return -EFAULT;

    if (r.len > MAX)                 // valida
        return -EINVAL;

    // ⚠ outra thread escreve no objeto compartilhado aqui
    return processar(compartilhado, r.len);   // usa len de outra fonte
}
```

⚠ **As três armas do atacante para alargar a janela:**

| Arma | O que faz |
|---|---|
| **Muitas threads** | Aumenta a chance de intercalar no ponto certo |
| **`userfaultfd`** | ⚠ **Para a thread do kernel no meio** — a arma mais forte |
| **`FUSE` / `overlayfs`** | ⚠ Faz o kernel **esperar I/O** no ponto exato |
| `sched_setaffinity` | Segura as threads no mesmo núcleo |

⚠ **`userfaultfd` merece o destaque.** Ele permite ao processo do usuário **controlar uma falha de página**: o kernel tenta ler o endereço, a página não está mapeada, e o seu handler decide quando resolvê-la. Isso transforma uma corrida de nanossegundos em um **ponto de parada determinístico** — a janela deixa de ser sorte e passa a ser projeto.

```c
// Raciocinio (nao um exploit)
// 1. A struct de entrada fica em memoria com userfaultfd armado
// 2. O kernel valida o campo -> passa
// 3. O kernel tenta ler o proximo campo -> a pagina falha -> SEU handler roda
// 4. Voce muda o campo ja validado
// 5. Voce libera a pagina -> o kernel continua e usa o valor NOVO
```

⚠ **Isso é técnica de pesquisa, e é o que a maioria dos writeups modernos usa.** Entender a mecânica é o objetivo aqui; montar a cadeia final é o Exploit Development.

---

## 4.5 Medir: KASAN, slab_debug e a reprodutibilidade

Sem instrumentação, um UAF pode **não dar nada** em 99% das execuções — e você conclui, errado, que não é bug.

```bash
# Kernel com KASAN (o lab do modulo 1 ja compilou assim)
# Boot params uteis:
#   kasan_multi_shot      -> reporta TODOS os acessos invalidos, nao so o primeiro
#   slab_debug            -> redzone, poisoning, verificacao de free list
#   slub_debug=FZPU       -> F=free list, Z=zero, P=poison, U=user tracking
#   panic_on_warn=1       -> transforma aviso em panic (util para fuzzing)

# Durante a investigacao
dmesg | tail -60                     # o relatorio do KASAN
dmesg | grep -A25 'BUG: KASAN'
dmesg | grep -i 'use-after-free'
```

⚠ **O relatório do KASAN responde as três perguntas que importam:**

```
BUG: KASAN: use-after-free in meu_handler+0x8c/0x120
Read of size 8 at addr ffff88810a2b3000 by task exp/1234
  ← QUEM usou, e o que acessou

Freed by task exp/1230:
  fput+0x...  
  ← ⚠ QUEM LIBEROU, e a PILHA DA LIBERACAO

Allocated by task exp/1228:
  kmalloc_trace+0x...
  ← ⚠ QUEM ALOCou — e a CACHE fica clara
```

⚠ **A terceira seção é a mais útil:** ela diz **em qual cache** o objeto nasceu. Se a resposta é `kmalloc-96`, você sabe que precisa alocar 96 bytes para reocupar. Sem isso, você tenta no escuro.

E a **reprodutibilidade** — a métrica que separa achado de rumor:

```bash
# Rode N vezes e conte
for i in $(seq 1 200); do
  ./meu_trigger >/dev/null 2>&1
  dmesg | tail -5 | grep -q 'KASAN' && echo "hit em $i"
done | tee resultado.txt
wc -l resultado.txt
```

| Taxa em 200 execuções | Leitura |
|---|---|
| 200/200 | ✅ Determinístico — pronto para reportar |
| 10–50 | ⚠ Race real — precisa alargar a janela |
| 1–5 | ⚠ Muito apertado — use `userfaultfd` ou mais threads |
| 0 | ❌ Ou não é bug, ou a janela é outra — **reveja a hipótese** |

---

## 4.6 O exercício-guia: `CVE-2022-0847` (Dirty Pipe)

⚠ **Não é para reproduzir o exploit — é para ler o bug.**

O `pipe_buffer` é alocado com `GFP_KERNEL_ACCOUNT` e **nunca zerado completamente**. O campo `flags` sobrevive à reciclagem do objeto. Um `splice` de página de arquivo para o pipe herda o flag `CAN_MERGE` de uma operação anterior em outra página, e o kernel passa a permitir **escrever na página do page cache** — que é o conteúdo do arquivo em memória.

```c
// O nucleo do bug, em tres linhas (leitura, nao exploit)
// em copy_page_to_iter_pipe / push_pipe:
buf->flags = 0;                     // ⚠ nao zera TUDO que importa
// ...
if (!(buf->flags & PIPE_BUF_FLAG_CAN_MERGE))   // flag herdada de outro pipe
    return 0;
// -> escreve na pagina do arquivo, sem abrir para escrita
```

**Por que ler este bug:** ele mostra os **dois padrões deste módulo na mesma falha** — objeto reciclado sem zerar (módulo 3, `__GFP_ZERO`) e estado herdado entre usos. E mostra que **a janela pode ser permanente**: o flag não volta, ele fica.

**Exercício:** localize o commit que corrigiu o Dirty Pipe (`git log --grep='pipe'` no kernel). Leia o diff e responda: a correção zera o campo, ou muda a condição? Por que a segunda seria incompleta?

---

## Laboratório 4 — Medir a janela

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```bash
cd ~/linternals-lab/m04

# 1. Kernel com KASAN e slab_debug
#    boot: kasan_multi_shot slab_debug=FPU panic_on_warn=1

# 2. Modulo com UAF proposital
cat > uaftest.c <<'EOF'
#include <linux/module.h>
#include <linux/slab.h>
#include <linux/kthread.h>
#include <linux/delay.h>

struct alvo { unsigned long dado; void (*op)(void); };
static struct alvo *g;

static void boa(void) { pr_info("uaftest: chamou op boa\n"); }

static int __init uaf_init(void) {
    g = kmalloc(sizeof(*g), GFP_KERNEL);
    g->dado = 0x4141414141414141UL;
    g->op = boa;
    pr_info("uaftest: objeto em %px, op=%px\n", g, g->op);
    kfree(g);                     // ⚠ libera e NAO zera g
    return 0;
}

static void __exit uaf_exit(void) { g->op(); }  // ⚠ use-after-free no unload
module_init(uaf_init); module_exit(uaf_exit);
MODULE_LICENSE("GPL");
EOF

cat > Makefile <<'EOF'
obj-m += uaftest.o
KDIR := $(HOME)/linternals-lab/kernel
all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules
clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean
EOF
make

# 3. Na VM: carregue, descarregue, e leia o relatorio
# insmod uaftest.ko
# rmmod uaftest            <-- o use-after-free acontece aqui
# dmesg | grep -A25 KASAN
```

**O que observar:** no relatório do KASAN, as três seções — `in`, `Freed by`, `Allocated by`. Confirme que a cache é `kmalloc-...` do tamanho da sua `struct`, e que a pilha de alocação aponta para o seu `__init`.

**Exercício 1:** reocupe o buraco. Escreva um segundo módulo (ou use `msg_msg` de userspace) que aloque o **mesmo tamanho** com conteúdo diferente, antes do `rmmod`. Rode de novo e veja se o KASAN acusa um alvo diferente.

**Exercício 2:** rode o `rmmod` 200 vezes em um loop, com o módulo recarregando, e conte quantas vezes o relatório aparece. Compare com o `panic_on_warn` ligado e desligado, e explique por que a contagem muda.

---

## Resumo

- ⚠ **Janela** = o intervalo entre o objeto deixar de ser válido e o último uso. Medir é estimar a chance.
- **UAF com ponteiro de função no objeto reciclado = controle de fluxo** — o valor mais alto da classe.
- ⚠ **Refcount violado é o bug mais explorável** — a janela pode ser permanente.
- Os três padrões de refcount: `put` a mais, `get` a menos, e o caminho de erro esquecido.
- ⚠ **`userfaultfd` transforma corrida em ponto de parada determinístico** — é o instrumento que a pesquisa moderna usa.
- O relatório do **KASAN** dá três coisas: quem usou, **quem liberou** e **em qual cache alocou** — a última é a que planeja a reocupação.
- **Reprodutibilidade é a métrica**: 200/200 é achado; 0/200 é hipótese a revisar.

---

## O que o próximo módulo entrega

Você domina a mecânica de heap, UAF, race e medição. O módulo 5 aplica tudo isso à **superfície mais nova do kernel** — `io_uring` — que concentra o maior número de CVE de escalação dos últimos anos, e que quase nenhum curso de privilégio enumera.
