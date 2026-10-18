# Avaliações — Linux Internals, Kernel e Escalonamento de Privilégios

**Banco de questões por módulo · resposta comentada**

---

## Como usar

Cada módulo tem três blocos: **conceito** (verifica se o mecanismo ficou claro), **leitura de código** (verifica se você reconhece o padrão) e **mão na massa** (verifica se você produz). A resposta comentada explica o *porquê*, não só o *o quê* — se você acertou por sorte, o comentário vai mostrar.

⚠ **As questões de leitura de código não têm a resposta completa de propósito.** Elas apontam onde olhar. A resposta é o que você escreve depois de abrir o arquivo.

---

## Módulo 1 — O kernel como superfície

**1.1 (conceito)** Por que a fronteira entre userspace e kernel é uma questão de **hardware**, e não de convenção?

> **Resposta:** Porque o processador x86-64 tem anéis de privilégio implementados em hardware. A instrução `syscall` é a única porta controlada; instruções privilegiadas (`mov %cr0`, `in`/`out`) geram exceção em ring 3, e acesso a endereço de kernel gera falha de página. Se fosse convenção, um programa malicioso simplesmente ignoraria.

**1.2 (conceito)** Quais são as quatro etapas de uma travessia de syscall, e qual classe de bug corresponde a cada uma?

> **Resposta:** busca do objeto (`fget` — UAF), cópia (`copy_from_user` — race/TOCTOU), validação (overflow), uso (UAF/double-free). ⚠ A pergunta do curso está na terceira: o kernel validou **depois** de copiar, ou antes? O dado mudou no meio?

**1.3 (leitura de código)** O código abaixo tem um bug. Qual, e qual é a correção?

```c
struct req *r = (struct req *)arg;
if (r->len > MAX)
    return -EINVAL;
memcpy(dest, r->buf, r->len);
```

> **Resposta:** TOCTOU. `r->len` é lido **duas vezes** do userspace — uma na validação, outra no `memcpy` — e outra thread pode alterá-lo entre as duas. A correção é copiar **uma vez** para um buffer do kernel, validar **o buffer do kernel** e usar **o buffer do kernel**. O dado do userspace nunca é lido duas vezes. É o padrão que você vai encontrar em todo diff de patch deste curso.

**1.4 (mão na massa)** Compile o `raw.c` com `-nostdlib` e rode sob `strace`. Explique por que a syscall que aparece é a mesma do programa com libc.

> **Resposta:** porque a libc não faz nada de especial: ela organiza os registradores e emite a instrução `syscall`. `printf`, `malloc` e `fopen` são conveniência construída no userspace — a porta para o kernel é uma só.

---

## Módulo 2 — Ler o kernel

**2.1 (conceito)** Qual é a diferença entre `vmlinux`, `bzImage` e `System.map`, e para que serve cada um?

> **Resposta:** `vmlinux` é o ELF **não comprimido**, com símbolo e DWARF — é o que o `gdb` e o `pahole` leem. `bzImage` é o kernel comprimido para dar boot — é o que o QEMU usa. `System.map` é o mapa endereço→nome em texto. ⚠ Você **dá boot com `bzImage` e depura com `vmlinux`** — são o mesmo kernel em dois formatos, mas só o primeiro tem as informações que o depurador precisa.

**2.2 (conceito)** Por que `nokaslr` é obrigatório no laboratório?

> **Resposta:** com KASLR ligado, os endereços do kernel mudam a cada boot, e o `vmlinux` deixa de corresponder à memória. Sem `nokaslr`, o `break start_kernel` não acerta e você não navega estrutura. ⚠ E a lição inversa vale para o módulo 4: quando o alvo tem KASLR ligado, vazar um endereço é passo separado da exploração.

**2.3 (leitura de código)** Um `oops` reporta `unable to handle page fault for address: 00000000000000d8`. O que isso sugere, e por quê?

> **Resposta:** desreferência de ponteiro `NULL`. O endereço é um deslocamento pequeno — é `ponteiro->campo`, com `ponteiro` nulo e `campo` a 216 bytes (`0xd8`) do início da estrutura. ⚠ Contraste com `0x4141414141414141`, que significa dado controlado — e é a diferença entre um crash e uma **primitiva**.

**2.4 (mão na massa)** Pegue um `oops` de um CVE público de kernel e converta o `RIP` em linha de código, usando `info line`.

> **Resposta:** o fluxo é `gdb vmlinux -ex 'info line *(funcao+0x2f)'` para achar a linha, e depois `disassemble /s` para ver a instrução. ⚠ O que vale é o parágrafo de causa raiz que você escreve **antes** de consultar o writeup — se você acertou a classe do bug, aprendeu a ler kernel.

---

## Módulo 3 — Heap do kernel

**3.1 (conceito)** Você pediu 40 bytes com `kmalloc`. Quantos bytes você ocupa, e por quê?

> **Resposta:** 64. O slab agrupa objetos de **tamanho fixo** em cache, e 40 bytes caem na `kmalloc-64`. ⚠ Isso importa para exploit: para reocupar um objeto liberado, você precisa alocar no **mesmo tamanho de cache** — não no mesmo tamanho de dado.

**3.2 (conceito)** Enumere as quatro falhas da vida de um buffer, e diga qual é a mais explorável.

> **Resposta:** (A) overflow de cálculo — `kmalloc(user_len * 4)` com wrap; (B) overflow de cópia — `memcpy` maior que o alocado; (C) double-free; (D) use-after-free. ⚠ **A D é a rainha**: não depende de cálculo errado, o atacante controla o que entra (via `heap spray`) e a janela é ampla.

**3.3 (conceito)** O que `__GFP_ZERO` ausente produz, e por que isso é uma falha de segurança?

> **Resposta:** vazamento de memória. A estrutura nova contém os **bytes do objeto anterior** — que outro componente liberou. Se aquilo for copiado para o userspace, você leu memória do kernel. É a classe do `CVE-2018-9568` e de dezenas de outros.

**3.4 (leitura de código)** Que cache o código abaixo usa? Descreva o bug.

```c
void bug(struct ctx *c) {
    kfree(c->buf);
    if (erro) return -EINVAL;
    kfree(c->buf);
}
```

> **Resposta:** double-free. `c->buf` não é zerado após o primeiro `kfree`, e o caminho de erro libera de novo. ⚠ A correção universal é `kfree(c->buf); c->buf = NULL;` — e o mesmo vale para qualquer `put_*`.

**3.5 (mão na massa)** Escreva um módulo que aloca 40 bytes, libera e **escreve** no ponteiro liberado. Rode com KASAN e leia o relatório. O relatório apontou o *use* ou a *liberação*?

> **Resposta:** aponta o **use** — `BUG: KASAN: use-after-free in <sua função>`. ⚠ E a diferença importa: o relatório mostra *onde o acesso ilegal aconteceu*, e a seção `Freed by` mostra *onde a liberação aconteceu*. As duas são necessárias para entender o bug, e quem só lê a primeira perde o mecanismo.

---

## Módulo 4 — UAF, race e refcount

**4.1 (conceito)** Defina **janela** e explique por que ela é a métrica central do módulo.

> **Resposta:** janela é o intervalo entre o objeto deixar de ser válido e o último uso dele. Medir a janela é estimar a **probabilidade** de acertá-la — e é isso que separa um crash aleatório de um achado reproduzível.

**4.2 (conceito)** Ordene do mais fácil ao mais difícil de explorar: double-free, UAF com race, UAF simples, refcount errado.

> **Resposta:** refcount errado (a janela pode ser **permanente**) → double-free (é lógica, determinístico) → UAF simples (precisa reocupar o objeto) → UAF com race (precisa **vencer** a corrida). ⚠ O refcount errado é o mais fácil justamente porque a janela pode nunca fechar.

**4.3 (conceito)** O que `userfaultfd` permite, e por que isso muda a natureza de uma exploração de race?

> **Resposta:** permite ao processo do usuário **controlar uma falha de página** — o kernel tenta ler o endereço, a página não está mapeada, e o seu handler decide quando resolvê-la. ⚠ Isso transforma uma corrida de nanossegundos em um **ponto de parada determinístico**: a janela deixa de ser sorte e passa a ser projeto.

**4.4 (leitura de código)** Um relatório de KASAN mostra `Allocated by: kmalloc_trace+0x...`. Por que essa seção é a mais útil?

> **Resposta:** porque ela diz **em qual cache** o objeto nasceu. Se a resposta é `kmalloc-96`, você sabe que precisa alocar 96 bytes para reocupar. Sem isso, você tenta no escuro — e a taxa de reprodução despenca.

**4.5 (mão na massa)** Rode seu trigger 200 vezes e conte os hits. O que cada faixa de taxa significa?

> **Resposta:** 200/200 = determinístico, pronto para reportar. 50–199 = race real, alargue a janela. 1–49 = janela estreita, documente a taxa. 0 = **reveja a hipótese** ou a versão ou a config. ⚠ Uma taxa baixa não invalida o achado — mas muda como você o reporta.

---

## Módulo 5 — `io_uring`

**5.1 (conceito)** Qual é a diferença fundamental entre a travessia de `io_uring` e a de uma syscall clássica, em termos de segurança?

> **Resposta:** a syscall clássica **copia** o dado via `copy_from_user`, e depois da cópia o userspace não pode mais alterar o que o kernel tem. `io_uring` **não copia** — o kernel lê a SQE direto da memória compartilhada. ⚠ TOCTOU deixa de ser caso raro e vira arquitetura.

**5.2 (conceito)** Por que a superfície real de `io_uring` não é `io_uring_setup`, e sim os opcodes?

> **Resposta:** porque `io_uring_setup` é uma porta para **dezenas de operações**, cada uma com seu próprio parser e suas próprias suposições sobre o `union` de parâmetros. A superfície são as **operações** — `IORING_OP_READ`, `_SPLICE`, `_TIMEOUT`, `_SENDMSG` — não a syscall de entrada.

**5.3 (conceito)** Descreva as três classes de bug de `io_uring`.

> **Resposta:** (A) validação de `addr`/`len` — o kernel lê sem `copy_from_user`; (B) ciclo de vida do `io_kiocb` — cancelamento concorrente, erro depois de enfileirar; (C) estado compartilhado via `mmap` — o usuário controla os índices da fila que o kernel lê. ⚠ A classe C significa que **o `userfaultfd` não é necessário aqui** — você já controla a memória.

**5.4 (mão na massa)** Enumere as operações de `io_uring` do seu kernel e preencha a tabela do módulo com a coluna "suspeita" e justificativa.

> **Resposta:** a coluna que vale é a da direita. ⚠ Enumeração boa não é listar opcode — é **a hipótese, com critério**. É o mesmo princípio do curso de Enumeração Esotérica, aplicado ao kernel.

---

## Módulo 6 — `netfilter` e `nftables`

**6.1 (conceito)** Por que `nftables` tem uma superfície maior que `iptables`?

> **Resposta:** porque `iptables` recebe **parâmetro** (uma regra por `ioctl`), e `nftables` recebe **programa** — o userspace compila a expressão em bytecode. Onde há linguagem, há **três superfícies**: parser, compilador e **VM em ring 0**.

**6.2 (conceito)** O que é um `netlink attribute`, e qual a regra de validação que ele exige?

> **Resposta:** um par tipo/comprimento/valor, onde o **comprimento é declarado pelo remetente**. A regra é: o comprimento declarado foi conferido contra o comprimento **real**? É o equivalente de `copy_from_user` no mundo dos atributos.

**6.3 (conceito)** Por que o `nftables` é alcançável por usuário sem privilégio, e por que isso importa?

> **Resposta:** em namespace de usuário + rede, qualquer processo fala `nf_tables` por socket `netlink`. ⚠ Isso é o que transforma um bug em **escalação de privilégio local** — e o que faz a área valer.

**6.4 (mão na massa)** Escolha uma mensagem `NFT_MSG_*` e produza a tabela de seis passos: mapear, seguir, validar, objeto, erro, alcance.

> **Resposta:** o passo que importa é o **erro**. Um arquivo com 300 `goto err` tem 300 oportunidades de esquecer um `put` — é onde os CVE moram, e não é descuido de autor, é custo estrutural de um parser grande em C.

---

## Módulo 7 — Namespace e `cgroup`

**7.1 (conceito)** Explique por que "namespace é visibilidade, não fronteira".

> **Resposta:** namespace faz o processo **ver** um subconjunto do sistema, e não o torna **incapaz** de alcançar o resto. A confusão entre "não vejo" e "não posso" é a fonte da maioria das falhas de isolamento de contêiner.

**7.2 (conceito)** O que `user namespace` realmente faz com o privilégio?

> **Resposta:** **redistribui**, não remove. O processo ganha um conjunto inteiro de capabilities **efetivas** dentro do namespace — `cap_sys_admin`, `cap_net_admin`, `cap_dac_override`. ⚠ Se houver bug de kernel em qualquer subsistema alcançável de dentro, a capability já está lá.

**7.3 (conceito)** Por que `unshare -Ur` é chamado de habilitador, e não de exploit?

> **Resposta:** porque ele não explora bug nenhum — ele coloca o processo **em posição** de explorar. É o passo um de quase todo exploit local moderno, não a cadeia.

**7.4 (conceito)** `cgroup` isola? Justifique.

> **Resposta:** não — **contabiliza**. Limita e mede consumo, mas não impede syscall nem esconde nada. ⚠ E `release_agent` pode executar **fora** do namespace — não é bug de kernel, é desenho do mecanismo.

**7.5 (mão na massa)** Rode `unshare -Ur` e liste o que você alcança do host. Preencha a tabela de seis passos do reconhecimento de fronteira.

> **Resposta:** o passo que fecha é a pergunta final: ⚠ **qual subsistema vulnerável está ao meu alcance?** Se você é root em `user ns` e o kernel é vulnerável em `nftables` ou `io_uring`, você tem uma cadeia — e não precisou de falha de configuração nenhuma.

---

## Módulo 8 — `cred`, capability e `seccomp`

**8.1 (conceito)** Qual campo da `struct cred` decide o que você **pode fazer agora**, e por que ele não é o `euid`?

> **Resposta:** `cap_effective`. O `euid` responde "sou root para efeito de UID"; a capability responde "o que eu posso agora". ⚠ Um processo pode ser `uid=0` com `cap_effective` vazio, e pode ser `uid=1000` com capabilities — **a capability é o privilégio real, o UID é rótulo**.

**8.2 (conceito)** `setuid` concede capability? Explique.

> **Resposta:** não. `setuid` troca `euid`/`suid` e **não** popula `cap_effective` por padrão. É a distinção que a maioria erra — e é por isso que um binário `setuid root` pode ser root de UID e não poder `mount`.

**8.3 (conceito)** Por que `CAP_SETFCAP` é especialmente perigoso?

> **Resposta:** porque ele escreve `security.capability` em um binário **seu** — e o atributo **persiste no arquivo**. Depois, executar esse binário dá as capabilities ao processo, de forma permanente. É *file capabilities como persistência*.

**8.4 (conceito)** Seccomp filtra syscall ou operação? Dê um exemplo que mostre a diferença.

> **Resposta:** **syscall**. Permitir `io_uring_setup` dá acesso a dezenas de operações (`IORING_OP_READ`, `_WRITE`) que **não passam pelo seccomp**. ⚠ A pergunta de auditoria não é quantas syscalls o filtro bloqueia, e sim **quais ele permite** — e se alguma delas é porta para um subsistema inteiro.

**8.5 (mão na massa)** Decodifique `CapEff` do seu shell com e sem `sudo`. Liste o que o `sudo` acrescenta.

> **Resposta:** o `sudo` concede o conjunto completo (`0x000001ffffffffff` conforme a versão). ⚠ Escreva uma frase para cada capability que você ganhou explicando o que ela permite — e note que `CAP_SYS_ADMIN` sozinho já responde por quase tudo que o `sudo` faz.

---

## Módulo 9 — `keyring`

**9.1 (conceito)** Por que o kernel tem um porta-chaves, e qual o risco que a decisão cria?

> **Resposta:** porque as alternativas (no processo, em arquivo) vazam por `ptrace`, backup, core dump ou `/proc/pid/environ`. Guardar no kernel cria um **subsistema a mais**, com parser, objetos com refcount, controle de acesso e alcançável sem privilégio — todas as características que produzem CVE.

**9.2 (conceito)** O que `KEYCTL_LINK` permite, e por que ele aparece tanto em CVE?

> **Resposta:** vincular uma chave a um keyring **seu**. Se a busca encontra uma chave que você não deveria alcançar, e você pode vinculá-la, você **estende a própria permissão** — porque agora a chave está onde você a alcança. É o padrão do *keyring permission escalation*.

**9.3 (conceito)** Qual a diferença entre `INVALIDATE` e `REVOKE`, e por que ela produz bug?

> **Resposta:** invalidação **não libera** o objeto imediatamente, e revogação não remove dos keyrings. ⚠ Essa assimetria entre *marcar como morto* e *liberar de fato* é fonte clássica de **UAF** — o módulo 4 puro, em uma estrutura de ciclo de vida incomum.

**9.4 (conceito)** Por que `big_key` é um risco?

> **Resposta:** acima de um limite, o kernel guarda o payload **em um arquivo em `tmpfs`**, e a `key` guarda o caminho. ⚠ O segredo, em algum momento, **existe no filesystem** — e a pergunta passa a ser quem alcança aquele `tmpfs`.

**9.5 (leitura de código)** Das cinco famílias de CVE do `keyring`, quantas são classe nova?

> **Resposta:** **nenhuma.** Duas são objeto (módulo 4), duas são permissão/semântica (módulo 7) e uma é vazamento por caminho de arquivo (módulo 3). ⚠ A lição: o `keyring` é um **lugar novo** onde as **mesmas classes** aparecem.

---

## Módulo 10 — eBPF e o verifier

**10.1 (conceito)** Por que um bug no verifier do eBPF vale mais que um UAF comum?

> **Resposta:** porque o verifier é o **único mecanismo de segurança** entre bytecode hostil e ring 0. Se ele aprova um programa malicioso, **não há segunda barreira** — o código roda JIT, nativo, com privilégios de kernel. Um UAF corrompe um objeto; um bug no verifier **invalida uma classe inteira**.

**10.2 (conceito)** De quais três coisas depende a garantia do verifier?

> **Resposta:** da **modelagem dos tipos**, do **cálculo de faixa** e da **cobertura de caminho**. Cada uma é uma superfície — e a terceira é a mais sutil: se o verifier poda um caminho por achar que é inalcançável e o JIT o executa, o programa roda **sem verificação**.

**10.3 (conceito)** O que é a classe D, e por que ela é "elegante"?

> **Resposta:** **divergência verifier × JIT**. O verifier interpreta a semântica de uma instrução de um jeito e o JIT emite código com semântica diferente. ⚠ O bug não está em nenhum dos dois lados — está na **diferença** entre eles.

**10.4 (conceito)** `unprivileged_bpf_disabled=2` fecha a superfície de vez?

> **Resposta:** não. Fecha para **usuário comum** — mas com `CAP_BPF` ou `CAP_SYS_ADMIN` a superfície volta. ⚠ E o módulo 7 mostrou que você ganha essas capabilities dentro de um `user namespace`. A pergunta reaparece: qual subsistema vulnerável está ao meu alcance?

**10.5 (mão na massa)** Escreva um programa eBPF inválido, carregue-o e leia a mensagem do verifier. Reescreva a mensagem em português.

> **Resposta:** a mensagem descreve **o que o verifier acreditava** sobre o estado naquele ponto. Traduzir isso é o exercício: você passa a ler o verifier como um interlocutor, e não como uma caixa preta.

---

## Módulo 11 — Método e reporte

**11.1 (conceito)** Por que o campo `Falsificação` da ficha de hipótese é obrigatório?

> **Resposta:** porque uma hipótese que não pode morrer não é hipótese — é crença. Escrever isso **antes** evita o viés de confirmação, que é o que produz falso positivo público.

**11.2 (conceito)** Por que a maturidade do alvo é um critério **invertido**?

> **Resposta:** porque subsistema **novo** acumula bug depois do primeiro `privesc` público. Foi assim com `io_uring` (2021+), com `nftables` (2022+) e com o `keyring`. Quanto menos auditado, mais produtivo.

**11.3 (conceito)** Que comando dá a evidência mais barata sobre a produtividade de uma área?

> **Resposta:** `git log --grep='use-after-free'`. ⚠ Se um subsistema tem 15 commits com essa descrição, ele tem a **classe** ali, e a chance de a décima sexta existir é alta. É evidência em um comando, sem ler uma linha de código.

**11.4 (conceito)** Por que uma taxa de reprodução baixa não invalida o achado?

> **Resposta:** porque ela é **informação**, não ruído. "Reproduz em 3% das execuções, com N threads e afinidade fixa" é um reporte honesto e útil. ⚠ "Reproduz sempre" quando reproduz 3% é o que queima a credibilidade na primeira tentativa do outro lado.

**11.5 (conceito)** O que se reporta: a primitiva ou a cadeia completa?

> **Resposta:** a **primitiva**, com o impacto demonstrado. ⚠ A cadeia de escalação completa é decisão sua e política, não técnica — e a prática corrente é reportar o suficiente para corrigir, sem expor mais que o necessário.

**11.6 (mão na massa)** Produza o reporte completo do 11.7 para **um** achado, mesmo que seja reprodução de CVE conhecido. Depois releia e corte todo adjetivo.

> **Resposta:** o que sobra depois do corte é o reporte. ⚠ E o critério de qualidade é um: **a causa raiz cabe em uma frase?** Se não cabe, você ainda não entendeu o bug.

---

## Avaliação final — o que você deve saber fazer

Ao final do curso, sem consultar:

1. Descrever as quatro etapas de uma syscall e a classe de bug de cada uma.
2. Compilar um kernel com símbolo, abrir no `gdb` e converter um `oops` em linha de código.
3. Explicar por que pedir 40 bytes ocupa 64, e por que isso importa para reocupar um objeto.
4. Medir a reprodutibilidade de um UAF e interpretar cada faixa de taxa.
5. Enumerar a superfície de um subsistema novo com os seis passos do módulo 6.6.
6. Explicar por que o contêiner não é fronteira, e usar `unshare -Ur` como habilitador.
7. Ler `cap_effective` e dizer o que ela autoriza — e o que `setuid` **não** concede.
8. Explicar por que o verifier do eBPF é o único mecanismo de segurança entre bytecode e ring 0.
9. Escrever uma hipótese **falsificável** e uma ficha que caiba em dez linhas.
10. Produzir um reporte cuja causa raiz caiba em uma frase.

⚠ **Se os dez itens fecham, o curso cumpriu o objetivo.** Se o item 9 ou o 10 não fecha, o resto não se converte em trabalho — e é por isso que o módulo 11 existe.
