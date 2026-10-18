# Módulo 8 — `cred`, Capability e `seccomp`: Privilégio do Lado do Kernel

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 8 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 9 — `keyring`

---

## O que este módulo entrega

Ao final, você vai saber **onde o privilégio vive na estrutura do kernel** — a `cred` —, **o que cada capability autoriza de fato** (e não o que o nome sugere), e **o que o `seccomp` realmente bloqueia**. É o módulo que explica por que "root" é uma palavra imprecisa em Linux.

---

## 8.1 `struct cred`: onde o privilégio mora

```c
// Simplificado — a estrutura que define "quem voce e"
struct cred {
    atomic_long_t usage;      // ⚠ refcount (modulo 4)
    kuid_t  uid, gid;         // real
    kuid_t  suid, sgid;       // saved — o que permite voltar
    kuid_t  euid, egid;       // ⚠ EFETIVO — e o que decide o acesso
    kuid_t  fsuid, fsgid;     // ⚠ usado no acesso a arquivo
    unsigned cap_inheritable;
    unsigned cap_permitted;   // ⚠ o teto do que voce pode ter efetivo
    unsigned cap_effective;   // ⚠ O QUE VALE AGORA
    unsigned cap_bset;        // bounding set — o teto absoluto
    unsigned cap_ambient;     // ⚠ herdado por exec sem setuid
    struct key *session_keyring;
    struct user_struct *user;
    struct group_info *group_info;
};
```

⚠ **Três campos decidem tudo, e a maioria das pessoas só conhece um:**

| Campo | Pergunta que responde |
|---|---|
| `euid` | Sou root **para efeito de UID**? |
| `cap_effective` | ⚠ **O que eu POSSO fazer agora?** |
| `cap_bset` | ⚠ **O teto do que dá para ganhar** |

⚠ **Um processo pode ser `uid=0` e não poder nada** — se o `cap_effective` está vazio. E pode ser `uid=1000` e poder muito, se as capabilities estão lá. **A capability é o privilégio real; o UID é rótulo.**

```bash
# Ver tudo isso na pratica
id
grep -E 'Uid|Gid|Cap' /proc/self/status
capsh --print
```

⚠ **E é por isso que o objetivo de um exploit raramente é "virar root".** É **escrever na `cred`** — trocar os campos. É mais direto: `commit_creds(prepare_kernel_cred(NULL))` é a expressão canônica dos writeups de escalação, e o que ela faz é **substituir a estrutura de credencial inteira**.

---

## 8.2 As capabilities que importam

⚠ **Ler nome de capability é armadilha.** O que o nome sugere e o que ela autoriza divergem.

| Capability | O que o nome sugere | ⚠ O que ela realmente dá |
|---|---|---|
| **`CAP_SYS_ADMIN`** | "administração" | ⚠ **Quase tudo**: mount, namespace, cgroup, `bpf`, `perf`, device, `pivot_root` |
| **`CAP_SYS_PTRACE`** | "depurar" | ⚠ Ler e escrever **memória de qualquer processo** |
| **`CAP_NET_ADMIN`** | "rede" | Config de interface, firewall, rota, `tc` |
| **`CAP_NET_RAW`** | "pacote cru" | Socket cru — ARP spoof, sniff |
| **`CAP_DAC_OVERRIDE`** | "contornar permissão" | ⚠ Ler/escrever **qualquer arquivo**, ignorando `rwx` |
| **`CAP_DAC_READ_SEARCH`** | "buscar" | ⚠ Ler qualquer arquivo, e **ignorar diretório sem `x`** |
| **`CAP_SETUID`** | "mudar uid" | ⚠ Mudar UID — **para qualquer um**, inclusive 0 |
| **`CAP_SETFCAP`** | "definir cap" | ⚠ Escrever `security.capability` em binário → **persistência** |
| **`CAP_BPF`** | "carregar bpf" | ⚠ Desde 5.8+, separado; ainda superfície larga |
| **`CAP_PERFMON`** | "medir" | `perf_event_open` — e vazamento de endereço |

⚠ **`CAP_SYS_ADMIN` é a "nova root", e é a origem da maioria das falhas de contêiner.** O padrão se repete: alguém adiciona `cap_sys_admin` para "resolver o problema", e entrega mount, namespace e `bpf` de uma vez.

⚠ **`CAP_SETFCAP` merece atenção especial no contexto de escalação:** um processo com essa capability escreve `security.capability` em um binário **seu**. Depois, executa esse binário e **tem as capabilities no processo** — de forma **persistente**, porque o atributo está no arquivo. É a técnica conhecida como *file capabilities como persistência*.

```bash
# O padrao, em tres linhas (nao um exploit)
# 1. com CAP_SETFCAP, em um arquivo seu:
setcap cap_setuid+ep /tmp/meu_binario
# 2. execute
/tmp/meu_binario
# 3. ⚠ dentro dele, setuid(0) funciona — e sobrevive ao reboot
```

---

## 8.3 Como a `cred` muda: a sequência legítima

Entender o caminho legítimo é o que permite reconhecer o ilegítimo:

```
   exec de binario com setuid root
        │
        ▼
   euid: 1000 ──► 0        (o kernel troca)
   cap_effective: 0        (⚠ setuid NAO da capabilities por padrao)
        │
        ▼
   exec de binario com security.capability
        │
        ▼
   euid: 1000              (fica igual)
   cap_effective: ⚠ o valor do xattr
```

| Caminho | O que muda | Persiste? |
|---|---|---|
| `setuid` binário | `euid`, `suid` | Só o UID |
| `security.capability` | `cap_effective`, `cap_permitted` | ⚠ **Sim — está no arquivo** |
| `capsh --inh` | Herdável | Depende |
| ⚠ **`commit_creds()`** | **A `cred` inteira** | ⚠ **Sim, no processo** |
| ⚠ **`user namespace`** | Redistribui tudo | Só dentro do ns |

⚠ **A última linha é a do módulo 7, e aqui ela fica completa:** o `user namespace` não escreve na `cred` do host — ele **troca a `cred` do processo** por uma que dá root dentro do namespace. É exatamente um `commit_creds` legítimo, e é por isso que o `unshare -Ur` é tão poderoso.

```bash
# A prova: a cred muda, e o processo e o mesmo
unshare -Ur -- bash -c '
  echo "euid dentro: $(id -u)"
  cat /proc/self/uid_map
  grep CapEff /proc/self/status
'
```

---

## 8.4 `seccomp`: o filtro, e o que ele não filtra

`seccomp` instala um filtro **BPF** que o kernel consulta **antes** de executar a syscall. A decisão é uma de quatro:

| Retorno | Efeito |
|---|---|
| `SECCOMP_RET_ALLOW` | Executa |
| `SECCOMP_RET_ERRNO` | Falha com errno |
| `SECCOMP_RET_KILL` | Mata o processo |
| `SECCOMP_RET_TRACE` | Entrega ao `ptrace` — ⚠ **o que o Docker usa** |

⚠ **E aqui está o ponto que quase todo material erra: `seccomp` filtra SYSCALL, não OPERAÇÃO.**

```
   seccomp decide:
     io_uring_setup()  ──► ALLOW? ──► ⚠ sim, e DEPOIS disso
                                       o processo faz qualquer
                                       das dezenas de operacoes
                                       do modulo 5
```

⚠ **Consequência:** um perfil que bloqueia `io_uring_setup` é eficaz. Um perfil que **permite** `io_uring_setup` e tenta bloquear `read`/`write` é **inútil** — porque `IORING_OP_READ` e `_WRITE` não passam por `seccomp`.

O mesmo padrão vale para:

| Syscall permitida | O que ela destrava além dela |
|---|---|
| `io_uring_setup` | ⚠ Todas as operações de `io_uring` |
| `socket` + `sendmsg` | `netlink` → ⚠ `nftables` |
| `bpf` | Carregar programa eBPF |
| `openat` | ⚠ Ler qualquer arquivo que o DAC permita |
| `unshare` / `clone` | ⚠ `user namespace` → capabilities |
| `keyctl` | ⚠ Módulo 9 |

```bash
# O perfil de seccomp do processo atual
grep Seccomp /proc/self/status
# Seccomp: 0 = desabilitado, 1 = strict, 2 = filter

# Detalhe do filtro (precisa de CAP_SYS_ADMIN)
cat /proc/self/status | grep Seccomp_filters

# Em container
docker run --rm alpine sh -c 'grep Seccomp /proc/self/status'
```

⚠ **A lição de auditoria:** ao avaliar um perfil `seccomp`, a pergunta **não** é "quantas syscalls ele bloqueia". É:

> **Das syscalls que ele PERMITE, alguma delas é uma porta para um subsistema inteiro?**

---

## 8.5 Ler `cred` no depurador

```bash
# Na VM, com o kernel compilado do modulo 2
gdb kernel/vmlinux -ex 'target remote :1234'

(gdb) p current->cred
(gdb) p *(struct cred *)current->cred
(gdb) p ((struct cred *)current->cred)->euid
(gdb) p ((struct cred *)current->cred)->cap_effective
(gdb) p ((struct cred *)current->cred)->cap_bset
(gdb) p ((struct cred *)current->cred)->usage.counter     # ⚠ o refcount

# Offsets exatos, para quando voce nao tem o simbolo
pahole -C cred kernel/vmlinux
pahole -C cred kernel/vmlinux | grep -E 'euid|cap_effective|usage'

# E o simbolo que aparece em todo writeup
(gdb) info address commit_creds
(gdb) info address prepare_kernel_cred
```

⚠ **`commit_creds` e `prepare_kernel_cred` são a razão de o KASLR importar.** Se você sabe o endereço delas, a escalação vira duas chamadas. É por isso que **vazamento de endereço** é um passo de exploit separado — e por isso `/proc/kallsyms` mostra zeros para usuário comum (módulo 2).

⚠ **Desde a 5.10+ há mitigação adicional:** o kernel passou a validar que `commit_creds` é chamado de contexto legítimo em algumas configurações, e o `CONFIG_DEBUG_CREDENTIALS` ajuda. Mas o padrão clássico continua no material porque **continua sendo o alvo** — e porque o mecanismo é o que se aprende.

---

## Laboratório 8 — Ler a credencial

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```bash
cd ~/linternals-lab/m08

# 1. A credencial atual, por inteiro
id; capsh --print
grep -E 'Uid|Gid|Cap' /proc/self/status

# 2. Comparar contextos
echo "=== shell normal ==="; capsh --print | grep -E 'Current|Bounding'
echo "=== em user ns ==="; unshare -Ur -- capsh --print | grep -E 'Current|Bounding'
echo "=== com setuid ==="; sudo capsh --print | grep -E 'Current|Bounding'
```

```c
// 3. Ver a cred do proprio processo, via /proc
//    (leitura de UID real, efetivo e salvo)
cat > creds.c <<'EOF'
#include <stdio.h>
#include <unistd.h>
int main(void){
    printf("ruid=%d euid=%d suid=%d\n", getuid(), geteuid(), getresuid(NULL,NULL,NULL));
    return 0;
}
EOF
gcc -o creds creds.c && ./creds

// 4. e a mudanca de euid: sem setuid nao funciona
//    ./creds como usuario comum mostra euid != 0
//    sudo chown root:root creds && sudo chmod u+s creds && ./creds
//    ⚠ agora euid=0 — mas capsh --print mostra cap_effective VAZIO
```

```bash
# 5. No gdb, sobre a VM do modulo 2
K=~/linternals-lab/kernel/vmlinux
gdb $K -ex 'target remote :1234' \
       -ex 'p *(struct cred *)current->cred' \
       -ex 'p ((struct cred *)current->cred)->cap_effective' \
       -ex 'p ((struct cred *)current->cred)->usage.counter' \
       -ex quit

# 6. Os offsets, sem simbolo
pahole -C cred $K | grep -E 'usage|euid|cap_effective|cap_bset'

# 7. O valor do cap_effective em hex explica tudo
# 0x000001ffffffffff = todas as capabilities
# 0x0000000000000000 = nenhuma
```

**O que observar:** no passo 4, a prova de que `setuid` **não** dá capability — `euid=0` e `cap_effective=0`. É a distinção central do módulo. No passo 5, o `usage.counter` é o refcount que o módulo 4 ensinou a olhar.

**Exercício 1:** decodifique `CapEff` do seu shell, e do shell com `sudo`. Liste **quais capabilities** o `sudo` acrescenta, e escreva uma frase para cada uma explicando em que ela te torna perigoso.

**Exercício 2:** escreva, em C, um programa que imprima `cap_effective` em hexadecimal lendo `/proc/self/status`. Depois rode-o com `setcap cap_setuid+ep` e explique o que mudou e por que **persiste**.

**Exercício 3 (o que vale):** pegue o decálogo de syscalls que um perfil `seccomp` de contêiner **permite** (o padrão do Docker está documentado). Escolha as três que mais ampliam a superfície, e escreva para cada uma qual subsistema dos módulos 5, 6 ou 9 ela destrava. É o exercício que mostra por que "tem seccomp" não é sinônimo de "está contido".

---

## Resumo

- ⚠ **O privilégio mora na `struct cred`**, não no UID — `cap_effective` é o que vale agora, `cap_bset` é o teto.
- `commit_creds()` **troca a credencial inteira** — é o objetivo canônico de um exploit de escalação.
- ⚠ **`CAP_SYS_ADMIN` é a nova root**; `CAP_DAC_OVERRIDE` lê qualquer arquivo; `CAP_SETFCAP` dá **persistência no arquivo**.
- **`setuid` não concede capability** — é a distinção que a maioria erra.
- ⚠ **`seccomp` filtra SYSCALL, não OPERAÇÃO** — permitir `io_uring_setup`, `socket` ou `unshare` abre um subsistema inteiro.
- A pergunta de auditoria não é quantas syscalls o filtro bloqueia, e sim **quais ele permite**.

---

## O que o próximo módulo entrega

Você sabe onde o privilégio vive. O módulo 9 abre onde o **segredo** vive dentro do kernel: o `keyring` — o subsistema que guarda chave, o que ele expõe, e por que ele aparece em CVE de escalação com uma frequência que surpreende.
