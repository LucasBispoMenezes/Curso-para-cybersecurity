# Glossário — Linux Internals, Kernel e Escalonamento de Privilégios

**Termos do curso, definidos uma vez, em ordem alfabética**

---

## A

**`ALPC`** — não é deste curso; pertence ao Windows Internals. Mencionado apenas na tabela de conexões.

**Anel (ring)** — Nível de privilégio do processador. x86-64 tem quatro; o Linux usa **ring 0** (kernel) e **ring 3** (userspace). A separação é de **hardware**.

**ARMA** — no curso, as três ferramentas que alargam uma janela de corrida: muitas threads, `userfaultfd` e `FUSE`/`overlayfs`.

---

## B

**`big_key`** — Tipo de chave do `keyring`. Acima de um limite, o payload é guardado em **arquivo `tmpfs`**, e a chave guarda o caminho. Cria risco de o segredo tocar o filesystem.

**`bzImage`** — Kernel **comprimido**, usado para dar boot. Você depura com `vmlinux`, não com ele.

---

## C

**Capability** — Poder granular de um processo, separado do UID. Vive em `cap_effective` (o que vale agora) e `cap_bset` (o teto). ⚠ **`CAP_SYS_ADMIN`** equivale a quase root; **`CAP_DAC_OVERRIDE`** ignora permissão de arquivo; **`CAP_SETFCAP`** escreve `security.capability` e dá **persistência**.

**`cgroup`** — Mecanismo que **contabiliza e limita** recursos (CPU, memória, I/O). **Não isola.** ⚠ `release_agent` pode executar **fora** do namespace.

**`commit_creds`** — Função do kernel que **substitui a credencial inteira**. É o objetivo canônico de um exploit de escalação, ao lado de `prepare_kernel_cred`.

**`copy_from_user`** — Função que copia dado do userspace para o kernel. A regra do curso: copie **uma vez**, valide **o buffer do kernel**, use **o buffer do kernel**.

**`cred`** — `struct cred`: onde o privilégio mora. Campos que importam: `euid`, `cap_effective`, `cap_bset`, `usage` (refcount).

**CVE-2024-1086** — UAF em `nft_verdict`. Um dos mais explorados da área de `nftables`, por ter cadeia de exploração limpa.

---

## D

**Direct map** — Faixa `ffff8880...` onde o kernel mapeia **toda a RAM** linearmente. Uma primitiva de acesso relativo pode escalar para qualquer posição de memória física.

**Double-free** — Liberar o mesmo objeto duas vezes. Corrompe a free list. Determinístico — a janela é zero.

**Dirty Pipe (CVE-2022-0847)** — Flag `PIPE_BUF_FLAG_CAN_MERGE` herdada por reciclagem de `pipe_buffer`, permitindo escrever no page cache de arquivo. Exemplo dos padrões do módulo 3 e 4 na mesma falha.

---

## E

**eBPF** — Subsistema que permite ao userspace enviar **código** ao kernel, validado antes de executar e depois JIT. Ver **verifier**.

**`EPROCESS`** — estrutura do Windows, não deste curso.

**`ETHREAD`** — estrutura do Windows, não deste curso.

---

## F

**`filp`** — Cache de objeto `struct file`. Alvo por ter tipo conhecido.

**`fput` / `get_file`** — Libera e adquire referência a `struct file`.

**Falsificação** — Campo obrigatório da ficha de hipótese. Se a hipótese não pode morrer, é crença.

---

## G

**`gfp_t`** — Flags de alocação. `GFP_KERNEL` pode dormir; `GFP_ATOMIC` não pode. ⚠ `__GFP_ZERO` ausente produz **vazamento de memória**.

**`glossário`** — este arquivo.

---

## H

**`heap spray`** — Alocar N objetos do mesmo tipo/tamanho com conteúdo controlado, para reocupar o endereço de um objeto liberado. Passo de exploit, não exploit.

**`hive`** — estrutura de registro do Windows, não deste curso.

---

## I

**`io_kiocb`** — Objeto de requisição do `io_uring`. Tem ciclo de vida **além** da syscall, com cancelamento concorrente — fonte da classe B.

**`io_uring`** — Interface de I/O assíncrono cujas filas ficam em **memória compartilhada**. Uma syscall, dezenas de opcodes. Concentra muitos CVE de escalação desde 2021.

**`INVALIDATE` (keyctl)** — Marca a chave como morta **sem liberar** imediatamente. A assimetria com `REVOKE` produz UAF.

---

## J

**Janela** — Intervalo entre o objeto deixar de ser válido e o último uso dele. Medir a janela é estimar a probabilidade de acertar o bug.

**JIT (eBPF)** — Tradutor de bytecode eBPF para código nativo. ⚠ A segunda semântica — a divergência com o verifier é a classe D.

---

## K

**KASAN** — Kernel Address Sanitizer. Transforma acesso inválido em **relatório explícito**. Sem ele, um UAF pode passar em silêncio.

**`keyring`** — Mecanismo que guarda segredo no kernel. Um `keyring` é uma `key` que contém `key`s. Existem keyrings **compartilhados por UID**.

**`KEYCTL_LINK`** — Vincula uma chave a um keyring seu. Pode **estender a própria permissão**.

**`kmalloc` / `kfree`** — Alocador de objeto pequeno, com contiguidade **física**. O tamanho é arredondado para a cache.

**`kmem_cache`** — Cache de objetos de **tipo fixo**. É onde o tipo é conhecido — e por isso o alvo preferido.

---

## L

**`logon`** — Tipo de chave **não legível nem pelo dono**. Decisão de desenho que protege o segredo do kernel.

**`LOLBin`** — não é deste curso; pertence ao curso de Malware.

---

## M

**`msg_msg`** — Objeto de fila de mensagem do kernel. Veículo clássico de `heap spray`, porque o conteúdo é controlado pelo usuário.

**`mnt namespace`** — Isola pontos de montagem. Sem `user ns`, não barra nada.

---

## N

**`netlink`** — Transporte de mensagem kernel↔userspace. `nftables` fala por ele. O dado vem em **atributos** com comprimento declarado pelo remetente.

**`nftables`** — Firewall que recebe **programa**, não parâmetro. Superfície em três camadas: parser, objetos e **VM em ring 0**.

**`nokaslr`** — Parâmetro de boot que desliga o KASLR. Obrigatório no laboratório, para o `vmlinux` corresponder à memória.

---

## O

**`oops`** — Relatório de falha do kernel. ⚠ Endereço pequeno (`0x...d8`) = ponteiro `NULL`; endereço `0x41414141...` = **dado controlado**, ou seja, primitiva.

**`overlayfs`** — Sistema de arquivos em camadas. CVE-2021-3493 é o caso canônico de **semântica de permissão errada**.

---

## P

**`pahole`** — Ferramenta que lê o DWARF e imprime o **layout real** de uma `struct` — com padding e ordem do compilador, não do header.

**`PEB` / `TEB`** — estruturas do Windows, não deste curso.

**`pipe_buffer`** — Objeto de pipe. Veículo clássico de `heap spray`, e o do Dirty Pipe.

**Primitiva** — O que o bug permite: leitura arbitrária, escrita arbitrária, controle de fluxo. **A primitiva decide tudo.**

---

## R

**Race** — Duas execuções concorrentes sobre o mesmo estado. No kernel, ampliada por `userfaultfd` e `FUSE`.

**Refcount** — Contador de referência. Três padrões de bug: `put` a mais, `get` a menos, e o **caminho de erro** esquecido.

**`release_agent`** — Mecanismo de `cgroup` que executa um programa quando o grupo esvazia — **fora** do namespace, como root do host.

**Reprodutibilidade** — A taxa de sucesso de um trigger em N execuções. É parte do achado, não detalhe.

**Ring** — ver **Anel**.

---

## S

**`seccomp`** — Filtro BPF consultado **antes** de executar a syscall. ⚠ Filtra **syscall**, não **operação**: permitir `io_uring_setup` abre um subsistema.

**`slab`** — Agrupamento de objetos de tamanho fixo dentro de uma cache. Objeto liberado volta à free list e é reciclado — é o mecanismo que torna UAF explorável.

**`SYSCALL` (instrução)** — A única porta do userspace para o kernel. A fronteira de confiança é aí.

---

## T

**TOCTOU** — *Time-of-check to time-of-use*. Validar em um instante e usar em outro, com o dado mudando no meio. O padrão de bug que você mais vai encontrar em diff de patch.

**`tmpfs`** — onde o `big_key` guarda payload grande. O segredo toca o filesystem.

---

## U

**UAF (use-after-free)** — Usar um objeto depois de liberado. A classe mais explorável, porque não depende de cálculo errado e a janela é ampla.

**`unshare -Ur`** — Cria `user namespace` e mapeia seu UID para root dentro dele. ⚠ **Habilitador**, não exploit: coloca o processo em posição, com capabilities efetivas.

**`user namespace`** — ⚠ **Redistribui** privilégio, não remove. O processo ganha um conjunto de capabilities efetivas dentro do namespace.

**`userfaultfd`** — Permite ao usuário controlar uma falha de página, transformando uma corrida em **ponto de parada determinístico**.

---

## V

**`verifier`** — Componente do eBPF que **prova, por análise estática, que o programa é seguro**. ⚠ É o **único** mecanismo de segurança entre bytecode hostil e ring 0. A garantia depende de modelagem de tipo, cálculo de faixa e cobertura de caminho.

**`vmlinux`** — ELF não comprimido, com símbolo e DWARF. É o que o `gdb` e o `pahole` leem.

**`vmalloc`** — Alocação contígua só em **virtual**. Não é "kmalloc grande": é contiguidade de outro tipo.

**`vmemmap`** — Faixa onde ficam as `struct page`, uma por página física.

---

## W

**`WDK`** — Windows Driver Kit. Não deste curso; pertence ao Windows Internals.

---

## Y

**YAML** — Formato do frontmatter das ementas do curso. Campos usados: `title`, `nivel`, `tags`.

---

## Termos que NÃO são deste curso

Aparecem em conversa, mas pertencem a outro material da trilha:

| Termo | Curso correto |
|---|---|
| `EPROCESS`, `ALPC`, `PEB`, `hive`, `ETW` | Windows Internals |
| `LOLBin`, `YARA`, packing | Análise de Malware |
| Parser differential, framing, desync | Parser Differentials / HTTP Smuggling |
| `ROP`, `ASLR`, `heap grooming` de userspace | Exploit Development |
| `Sigma`, `WAF`, taxa de falso negativo | Detecção e Evasão |

⚠ **A distinção importa:** cada curso da trilha define seus termos uma vez, e não repete. Se um termo aparece em dois glossários, um dos dois está fora de escopo.

---

*Glossário original do curso. As definições assumem o contexto do material — quando um termo tem uso diferente em outro subsistema, vale a definição daqui.*
