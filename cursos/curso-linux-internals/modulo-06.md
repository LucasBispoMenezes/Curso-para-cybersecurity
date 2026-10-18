# Módulo 6 — `netfilter` e `nftables`: O Parser de Regra Como Superfície

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 6 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 7 — Namespace e `cgroup`

---

## O que este módulo entrega

Ao final, você vai entender **por que o `nftables` concentrou tantos CVE de escalação recentes** — e a resposta não é "tem bug", é estrutural: é uma **linguagem** que o userspace escreve e o kernel interpreta. Você vai saber enumerar esse tipo de superfície, que é diferente de tudo que os módulos 1 a 5 trataram.

---

## 6.1 O que mudou de `iptables` para `nftables`

| | `iptables` | `nftables` |
|---|---|---|
| Regra | ⚠ Uma regra = um `ioctl` (via `setsockopt`) | ⚠ **Uma linguagem** compilada em bytecode |
| Transporte | `setsockopt` clássico | **`netlink`** |
| Estado | Tabela por protocolo | **VM de bytecode no kernel** |
| Superfície | Tamanho fixo por regra | ⚠ **Parser + compilador + interpretador** |

⚠ **A mudança de fundo:** `nftables` não recebe parâmetro — recebe **programa**. O userspace compila uma expressão em **bytecode** e o kernel executa. E onde há linguagem, há **três superfícies**:

1. **O parser** — quem lê a expressão e a valida.
2. **O compilador** — quem transforma a expressão em bytecode.
3. ⚠ **A máquina virtual** — quem executa o bytecode, com seu próprio modelo de memória e registradores.

⚠ **É o mesmo trio de qualquer linguagem:** parser, compilador, runtime. A diferença é que aqui o runtime roda em **ring 0**, e o bytecode veio de um processo que pode ser hostil.

---

## 6.2 A superfície em três camadas

```
   userspace                                 kernel
   ─────────                                 ──────

   nft add rule ip filter input tcp dport 22 accept
        │
        ▼
   libnftables: compila a expressao
        │
        ▼
   bytecode ──── netlink (NFNL_SUBSYS_NFTABLES) ────►  nf_tables_api.c
                                                         │
                                                         ├─ ► ⚠ PARSER
                                                         │     valida tipo, tamanho,
                                                         │     relacao entre campos
                                                         │
                                                         ├─ ► ⚠ OBJETOS
                                                         │     table, chain, rule,
                                                         │     set, element, expr
                                                         │     (cada um com refcount)
                                                         │
                                                         ▼
                                                       nft_do_chain()
                                                         │
                                                         └─ ► ⚠ VM
                                                               registradores,
                                                               pilha, load/store
```

⚠ **Cada uma das três camadas tem classe de bug própria:**

| Camada | Classe de bug | Por quê |
|---|---|---|
| **Parser** | Validação incompleta de tipo/tamanho | O dado vem em `netlink attribute`, serializado |
| **Objetos** | ⚠ **UAF e refcount** | São dezenas de tipos, cada um com contagem |
| **VM** | ⚠ **Out-of-bounds em registrador/pilha** | O bytecode manipula estado interno do kernel |

---

## 6.3 `netlink attribute`: a serialização que ninguém valida

`nftables` fala por `netlink`, e `netlink` transmite dados em **atributos** — pares tipo/comprimento/valor:

```
   ┌──────────┬──────────┬─────────────────────┐
   │ nla_len  │ nla_type │  payload ...        │
   │ (2 bytes)│ (1+1)    │  (nla_len - 4)      │
   └──────────┴──────────┴─────────────────────┘
        ⚠ o comprimento é DECLARADO pelo remetente
```

⚠ **E aí está o ponto:** o campo `nla_len` **vem do userspace**. Se o kernel confia nele sem conferir contra o buffer real, alguém declarou que o atributo tem 4 KB e mandou 40 bytes — e o kernel lê além.

```c
// Padrao classico — leitura guiada por comprimento declarado
static int nft_alguma_coisa(const struct nlattr *attr, ...) {
    // ⚠ se nla_len nao e validado contra o tamanho do buffer...
    const void *dados = nla_data(attr);
    u32 tam = nla_len(attr);          // ⚠ valor do ATACANTE
    memcpy(destino, dados, tam);      // ...copia alem do que existe
}
```

⚠ **A regra geral do módulo:** em qualquer parser de dado serializado, a primeira pergunta é **"o comprimento declarado foi conferido contra o comprimento real?"**. É o equivalente de `copy_from_user` no mundo dos atributos.

---

## 6.4 Os CVE que definiram a área

| CVE | Camada | O que era |
|---|---|---|
| **CVE-2022-32250** | Objetos | ⚠ UAF em `nft_set` — `NFT_MSG_NEWSET` com expressão de estado |
| **CVE-2023-0179** | VM | ⚠ Out-of-bounds em registrador por bytecode forjado |
| **CVE-2023-32233** | Objetos | ⚠ UAF em `nft_chain` — `NFT_MSG_DELSETELEM` com tratamento de erro |
| **CVE-2023-35001** | VM | ⚠ Out-of-bounds em `nft_byteorder` |
| **CVE-2024-1086** | Objetos | ⚠ **UAF em `nft_verdict`** — tratado de parada duplo, e o mais explorado do grupo |
| **CVE-2024-26809** | Objetos | Double-free no caminho de erro |

⚠ **Leia a coluna do meio, e não a da esquerda.** Três são **objetos** (UAF, refcount, double-free — o módulo 4 puro) e dois são **VM** (bytecode que acessa estado além do limite). É a mesma divisão do 6.2.

⚠ **E o padrão de exploração é sempre o mesmo:** UAF em um objeto do `nftables` → reocupar com `msg_msg` ou `pipe_buffer` (módulo 3) → primitiva. O `CVE-2024-1086` virou exploit público amplamente copiado justamente porque a cadeia é limpa.

---

## 6.5 Por que o `nftables` é tão produtivo

Cinco atributos, e cada um produz bug sozinho:

| Atributo | O que produz |
|---|---|
| **Linguagem, não parâmetro** | ⚠ Parser + compilador + VM = três superfícies |
| **Dezenas de tipos de objeto** | ⚠ Cada um com refcount próprio — e com caminho de erro próprio |
| **Caminho de erro extenso** | ⚠ O padrão do módulo 4: `put` esquecido no `goto err` |
| **Serialização em `netlink`** | ⚠ Comprimento declarado pelo remetente |
| **Disponível para usuário comum** | ⚠ Diferente de muitas syscalls, **não exige privilégio** |

⚠ **O último item é o mais importante, e o menos lembrado.** Um usuário sem privilégio nenhum pode abrir socket `netlink` e falar `nf_tables`. Ou seja: **a superfície é alcançável a partir de qualquer processo**. Isso é o que transforma um bug em escalação de privilégio local — e o que faz a área valer.

```bash
# Sem privilegio nenhum, voce pode?
id
unshare -n -r -- bash -c 'nft list ruleset 2>&1 | head -3'   # em namespace de rede
# ⚠ Em namespace de usuario + rede, nf_tables fica acessivel a usuario comum
```

---

## 6.6 Enumerar um parser — o método

Reutilizável em `netlink`, em `io_uring`, em qualquer coisa que aceite dado estruturado:

```
   1. MAPEAR    →  quais mensagens/opcodes existem?
   2. SEGUIR    →  onde cada uma entra no kernel?
   3. VALIDAR   →  o comprimento e o tipo sao conferidos ANTES do uso?
   4. OBJETO    →  que estrutura nasce, e com que refcount?
   5. ERRO      →  ⚠ o caminho de erro libera tudo que alocou?
   6. ALCANCE   →  quem pode enviar essa mensagem, e com que privilegio?
```

```bash
# 1. As mensagens do nf_tables
grep -o 'NFT_MSG_[A-Z_]*' /usr/include/linux/netfilter/nf_tables.h | sort -u

# 2. Onde cada uma e tratada
grep -n 'NFT_MSG_' ~/linternals-lab/kernel/net/netfilter/nf_tables_api.c | head -30

# 3. Os pontos que validam comprimento
grep -n 'nla_len\|nla_validate\|nla_data\|nla_get_u' \
     ~/linternals-lab/kernel/net/netfilter/nf_tables_api.c | wc -l

# 4. Os objetos, e o refcount de cada
grep -n 'nft_.*_destroy\|kfree\|refcount' \
     ~/linternals-lab/kernel/net/netfilter/nf_tables_api.c | head -30

# 5. Os caminhos de erro
grep -n 'goto err\|err_unset\|err_release' \
     ~/linternals-lab/kernel/net/netfilter/nf_tables_api.c | wc -l
```

⚠ **O passo 5 é onde os CVE moram.** Um arquivo com 300 `goto err` tem 300 oportunidades de esquecer um `put`. Não é descuido de um autor — é o custo estrutural de um parser grande em C.

---

## Laboratório 6 — Ler o parser

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```bash
cd ~/linternals-lab/m06
K=~/linternals-lab/kernel

# 1. Tamanho da superficie
wc -l $K/net/netfilter/nf_tables_api.c
ls $K/net/netfilter/nft_*.c | wc -l      # uma por EXPRESSAO

# 2. As expressoes — cada arquivo e uma superficie
ls $K/net/netfilter/nft_*.c | sed 's|.*/nft_||;s|\.c||' | tr '\n' ' '
echo

# 3. Escolha duas expressoes e leia o 'init' e o 'destroy'
for E in byteorder verdict; do
  echo "=== nft_$E ==="
  grep -n 'static int nft_.*_init\|static void nft_.*_destroy\|nla_len\|nla_data' \
       $K/net/netfilter/nft_$E.c
done

# 4. Suba uma VM com namespace proprio e crie regras legitimas
unshare -n -r -- bash -c '
  nft add table ip t
  nft add chain ip t c "{ type filter hook input priority 0; }"
  nft add rule ip t c tcp dport 22 accept
  nft list ruleset
'

# 5. Observe no kernel o que a regra virou
unshare -n -r -- bash -c 'nft --debug=netlink add rule ip t c tcp dport 22 accept' 2>&1 | head -20
```

**O que observar:** no passo 5, o `--debug=netlink` mostra a expressão **já compilada em bytecode**. Aquilo é o que o kernel recebe — e é o que a VM (camada 3 do 6.2) executa. Repare que o que você escreveu como `tcp dport 22 accept` virou uma sequência de operações com registrador.

**Exercício 1:** compare `nft_byteorder.c` e `nft_verdict.c`. Um foi alvo de out-of-bounds na VM, o outro de UAF em objeto. Explique, por leitura, em que parte do código cada classe apareceria.

**Exercício 2:** conte os `goto err` e os `kfree` em `nf_tables_api.c`. A razão entre eles é o que dá a estimativa de risco de refcount. Escreva o número e o que ele sugere.

**Exercício 3 (o que vale):** escolha **uma** mensagem `NFT_MSG_*` e siga o caminho dela no kernel: quem pode enviar, o que valida, que objeto cria, e o que libera no caminho de erro. Produza a tabela de seis linhas do 6.6, preenchida. É exatamente o exercício que a pesquisa faz.

---

## Resumo

- ⚠ **`nftables` recebe programa, não parâmetro** — o userspace compila expressão em bytecode.
- Onde há linguagem, há **três superfícies**: parser, compilador e **VM em ring 0**.
- ⚠ **`netlink attribute` declara o próprio comprimento** — validar contra o real é o `copy_from_user` desta área.
- Os CVE se dividem em **objetos** (UAF, refcount, double-free) e **VM** (out-of-bounds em registrador).
- ⚠ **A superfície é alcançável sem privilégio** — em namespace de usuário e rede, qualquer processo fala `nf_tables`.
- O método de enumeração tem seis passos: **mapear, seguir, validar, objeto, erro, alcance** — e o passo **erro** é onde os CVE moram.

---

## O que o próximo módulo entrega

Você sabe ler parser e objeto. O módulo 7 muda de eixo: **namespace e `cgroup`** — o mecanismo que todo mundo trata como fronteira de segurança, e que não é. Você vai entender por que o contêiner contém, e onde ele deixa de conter.
