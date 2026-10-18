# Módulo 7 — Namespace e `cgroup`: Por Que o Contêiner Não É Fronteira

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 7 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 8 — `cred`, capability e `seccomp`

---

## O que este módulo entrega

Ao final, você vai saber **o que cada namespace isola de verdade**, **o que o `cgroup` faz e não faz**, e **onde o contêiner cede** — não por configuração errada, mas por **limite do mecanismo**. É o módulo que separa "contêiner é isolamento" de "contêiner é conveniência".

---

## 7.1 A afirmação que organiza o módulo

⚠ **Namespace não é uma fronteira de segurança. É um mecanismo de visibilidade.**

Namespace faz um processo **ver** um subconjunto do sistema. Ele não faz o processo **ser incapaz** de alcançar o resto. A confusão entre "não vejo" e "não posso" é a fonte da maioria das falhas de isolamento de contêiner.

| O que as pessoas dizem | O que o namespace realmente faz |
|---|---|
| "o contêiner tem seu próprio PID" | ⚠ Os PIDs **de fora** continuam alcançáveis pelo kernel |
| "o contêiner tem sua rede" | ⚠ Só a visão: `netns` não impede syscall de socket |
| "o contêiner tem seu filesystem" | ⚠ `mount ns` sem `user ns` não barra nada |
| "o contêiner tem sua identidade" | ⚠ `user ns` mapeia, mas **não** remove capability lá dentro |

⚠ **E a consequência prática:** um contêiner rodando como root **é root de verdade** no `user namespace` dele. Se o kernel tem um bug de escalação (módulos 4, 5, 6), o processo **já está** em posição de explorá-lo sem precisar de falha de configuração.

---

## 7.2 Os oito namespaces

| Namespace | Isola | Flag | ⚠ O que NÃO isola |
|---|---|---|---|
| **`mnt`** | Pontos de montagem | `CLONE_NEWNS` | Acesso a block device, mount propagado |
| **`pid`** | Árvore de processos | `CLONE_NEWPID` | ⚠ Visão via `/proc/<pid externo>` se alcançável |
| **`net`** | Interfaces, rotas, `iptables` | `CLONE_NEWNET` | ⚠ Syscalls de socket em geral |
| **`ipc`** | Filas, semáforos, shm | `CLONE_NEWIPC` | — |
| **`uts`** | Hostname, domínio | `CLONE_NEWUTS` | — |
| **`user`** | ⚠ Mapeamento de UID/GID e **capability** | `CLONE_NEWUSER` | ⚠ **Não remove poder — redistribui** |
| **`cgroup`** | Visão da hierarquia | `CLONE_NEWCGROUP` | — |
| **`time`** | Relógios (`CLOCK_*`) | `CLONE_NEWTIME` | — |

⚠ **O `user` namespace é o mais mal-entendido, e o mais importante deste curso.**

A ideia dele: dentro do namespace, um processo pode ser **UID 0** — root — enquanto fora é UID 1000. Parece isolamento perfeito. **E não é:**

```
   FORA (host)                     DENTRO (user ns)
   ───────────                     ────────────────

   uid 1000  ────── mapeia ─────►  uid 0
                                   ⚠ COM AS CAPABILITIES DE ROOT
                                     do namespace

   O processo ganha: cap_sys_admin, cap_net_admin,
   cap_dac_override, etc. — TODAS as capabilities
   efetivas DENTRO do namespace.
```

⚠ **E aqui está o ponto:** o processo **ganha um conjunto inteiro de poderes** que ele não tinha antes. Não importa que sejam "do namespace" — se houver um bug de kernel em qualquer subsistema alcançável de dentro dele (`nftables`, `io_uring`, `mount`, `overlayfs`), **a capability efetiva já está lá**.

⚠ **É por isso que `unshare -Ur` virou o passo um de quase todo exploit local dos últimos anos.** Ele não é o exploit; é o **habilitador**.

```bash
# Sem privilegio, ganhe root em um user namespace
unshare -Ur -- bash -c 'id; capsh --print | head -5'
# uid=0(root) gid=0(root)
# ⚠ E com um conjunto de capabilities que voce nao tinha
```

---

## 7.3 `cgroup`: o que ele controla

⚠ **`cgroup` não é isolamento. É contabilização.**

| O que faz | O que não faz |
|---|---|
| Limita CPU, memória, I/O | ⚠ Não impede syscall |
| Conta e mede consumo | ⚠ Não esconde nada |
| Congela um grupo | ⚠ Não barra acesso a arquivo |
| Fornece hierarquia | ⚠ Não é fronteira entre grupos |

```bash
# A hierarquia v2
mount | grep cgroup2
cat /sys/fs/cgroup/cgroup.controllers

# Seu grupo
cat /proc/self/cgroup

# Limites do grupo atual
cat /sys/fs/cgroup/$(cat /proc/self/cgroup | cut -d: -f3)/memory.max 2>/dev/null
```

⚠ **Os pontos de escape de `cgroup` são interessantes, e o padrão se repete:**

| Vetor | O que explora |
|---|---|
| **`release_agent`** | ⚠ O helper roda **fora** do namespace, como root do host |
| **`notify_on_release`** | ⚠ Notifica e dispara caminho fora |
| **`devices` controller** | ⚠ Permissão de dispositivo, mal configurada |
| **`cgroup.procs` escrevível** | ⚠ Move um processo para outro grupo |

⚠ **O `release_agent` é o caso didático:** o cgroup precisa executar um programa quando o grupo esvazia, e esse programa roda **no contexto do host**. Se o processo dentro do contêiner pode escrever no `release_agent` ou no diretório apontado, ele executa código **fora**. Não é bug de kernel — é **desenho do mecanismo**.

---

## 7.4 Onde o contêiner cede — as quatro famílias

| Família | Mecanismo | Exemplo |
|---|---|---|
| **Arquivo de fora exposto** | `/proc`, `/sys`, `docker.sock`, device | ⚠ Socket do Docker montado → root no host |
| **Capability em excesso** | `CAP_SYS_ADMIN` no contêiner | ⚠ `CAP_SYS_ADMIN` permite `mount` — e `mount` é superfície enorme |
| **Namespace incompleto** | Só `mnt` sem `user` | ⚠ Sem mapeamento, é root do host de verdade |
| ⚠ **Bug de kernel** | `nftables`, `io_uring`, `overlayfs` | O **módulo 4, 5 e 6** — a partir de dentro |

⚠ **A quarta família é a deste curso, e a menos entendida.** As três primeiras são configuração — o curso de Linux para Segurança cobre. A quarta é: **o contêiner dá ao processo um ambiente onde ele pode exercer uma primitiva de kernel sem precisar de mais nada.**

```
   Antes (sem namespace):
     processo sem privilegio  ──► ⚠ precisa vencer TODAS as barreiras
                                  para chegar a uma superficie de kernel

   Depois (com user ns):
     unshare -Ur  ──► root no ns ──► ⚠ ja tem capability efetiva
                                        ea superficie esta ao alcance
```

---

## 7.5 `overlayfs` e o caso do mount

`CAP_SYS_ADMIN` dentro de um `user namespace` permite montar. E `mount` é uma das maiores superfícies do kernel — `overlayfs`, `FUSE`, `shiftfs`, `squashfs`, cada um com parser próprio.

⚠ **O `CVE-2021-3493` (Ubuntu OverlayFS) é o caso canônico:** o `overlayfs` não aplicava corretamente os `xattrs` de capability ao copiar arquivo entre camadas. Resultado: um processo em `user namespace` criava um binário com `security.capability` e ele **sobrevivia à cópia**, virando binário com capability **no host**.

```bash
# O padrao, em pseudocodigo — nao um exploit
# 1. unshare -Ur   -> root no namespace
# 2. mount overlay -> camada inferior + superior, ambas suas
# 3. cria arquivo na superior com xattr de capability
# 4. o kernel copia (copy-up) e NAO preserva a regra
# 5. ⚠ o arquivo aparece no host COM a capability
```

⚠ **Note a estrutura do bug:** não é UAF, não é overflow, não é race. É **semântica de permissão errada em uma operação legítima**. A classe existe, é comum, e é a que mais aparece em `overlayfs` e `FUSE`.

---

## 7.6 Enumerar a fronteira

O método que você aplica quando encontra um contêiner alvo:

```
   1. IDENTIDADE  →  quem sou dentro? (uid, gid, capabilities efetivas)
   2. NAMESPACES  →  quais existem, e contra o que? (/proc/self/ns)
   3. MONTAGENS   →  o que esta montado, e e do host? (/proc/self/mountinfo)
   4. CGroups     →  onde estou, e o que e escrevivel?
   5. EXPOSICAO   →  socket, device, /proc do host alcancavel?
   6. SUPERFICIE  →  ⚠ qual subsistema do kernel esta ao meu alcance?
```

```bash
# Dentro do alvo — o reconhecimento da própria fronteira
id; capsh --print 2>/dev/null | head -20
ls -l /proc/self/ns/
cat /proc/self/status | grep -E 'Cap|Uid|Gid'
cat /proc/self/mountinfo | head -20
ls -la /var/run/docker.sock 2>/dev/null
ls /dev/ | head -20
cat /sys/fs/cgroup/cgroup.controllers 2>/dev/null

# ⚠ E a pergunta que fecha o passo 6:
# uname -r; e qual a versao do kernel? ha CVE conhecido nessa faixa?
```

⚠ **A pergunta final é a que transforma reconhecimento em achado:** se você é root em `user ns` e o kernel é vulnerável em `nftables` ou `io_uring`, você tem uma cadeia. **Você não precisa de falha de configuração nenhuma.**

---

## Laboratório 7 — Medir a fronteira

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```bash
cd ~/linternals-lab/m07

# 1. Sem namespace: o que voce pode?
id
capsh --print | head -10
ls /proc/self/ns/

# 2. Com user namespace: o que voce GANHA?
unshare -Ur -- bash -c '
  echo "--- dentro ---"
  id
  capsh --print | grep -E "Current|Bounding" | head -4
  ls -l /proc/self/ns/
'

# 3. O mapeamento de UID — a prova de que e o mesmo processo
unshare -Ur -- bash -c '
  cat /proc/self/uid_map
  echo "fora: $(cat /proc/self/status | grep ^Uid)"
'

# 4. O que muda no mount
unshare -Urm -- bash -c '
  echo "--- montagens visiveis ---"
  cat /proc/self/mountinfo | wc -l
  mount -t tmpfs tmpfs /mnt 2>&1 && echo "mount OK ⚠ CAP_SYS_ADMIN funciona"
'

# 5. Com namespace de rede + user: nftables acessivel?
unshare -Urn -- bash -c 'nft list ruleset 2>&1 | head -3; echo "rc=$?"'

# 6. Compare antes e depois
echo "--- fora ---"; capsh --print | grep Current
```

**O que observar:** no passo 2, as capabilities. Você era um usuário comum; agora tem `cap_sys_admin`, `cap_net_admin`, `cap_dac_override` entre outras — **efetivas**, dentro do namespace. No passo 4, o `mount` funciona. No passo 5, o `nftables` responde.

**Exercício 1:** escreva a diferença entre **capability efetiva** e **capability no bounding set**. Depois explique por que um processo em `user namespace` não pode ganhar uma capability que **não** está no bounding set dele.

**Exercício 2:** rode `unshare -Ur` e de dentro liste o que você consegue alcançar do host: `/proc/1/root`, `/sys`, `/dev`, socket de Docker (se existir). Produza a tabela do 7.6 preenchida para a sua máquina.

**Exercício 3 (o que vale):** com sua versão de kernel em mãos, identifique **um** CVE de escalação que exija apenas capability **dentro** de `user namespace` — sem falha de configuração. Escreva: o subsistema, a classe (objeto/VM/parser/semântica), e por que o `unshare` é suficiente como habilitador. É o raciocínio que sustenta a família 4 do 7.4.

---

## Resumo

- ⚠ **Namespace é visibilidade, não fronteira** — "não vejo" não é "não posso".
- ⚠ **`user namespace` não remove poder — redistribui**: o processo ganha um conjunto inteiro de capabilities **efetivas**.
- **`unshare -Ur` é o habilitador** de quase todo exploit local moderno, não o exploit.
- ⚠ **`cgroup` contabiliza, não isola** — e `release_agent` executa **fora** do namespace.
- As quatro famílias de escape: **arquivo exposto, capability em excesso, namespace incompleto e bug de kernel** — a última é deste curso.
- `overlayfs` e `mount` mostram a classe de **semântica de permissão errada** — nem UAF, nem overflow.
- O reconhecimento da fronteira tem seis passos, e termina na pergunta certa: **qual subsistema vulnerável está ao meu alcance?**

---

## O que o próximo módulo entrega

Você entende a fronteira. O módulo 8 desce ao que o contêiner entrega ao processo e o que o processo pode acumular: **`cred`, capability e `seccomp`** do lado do kernel — a estrutura da credencial, o que cada capability autoriza de verdade, e o que o filtro `seccomp` impede e o que ele deixa passar.
