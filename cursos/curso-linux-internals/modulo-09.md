# Módulo 9 — `keyring`: Onde o Segredo Vive no Kernel

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 9 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 4 e o Módulo 8
**Próximo:** Módulo 10 — eBPF e o verifier

---

## O que este módulo entrega

Ao final, você vai saber **o que o kernel guarda como segredo**, **quem pode ler**, e **por que o `keyring` aparece em CVE de escalação com uma frequência que surpreende**. É o módulo que fecha o ciclo de "onde mora o privilégio" — o 8 mostrou a credencial, este mostra a **chave**.

---

## 9.1 Por que o kernel tem um porta-chaves

Aplicações precisam de segredo: chave de sessão, credencial de rede, token de autenticação. Três opções ruins:

| Onde guardar | Problema |
|---|---|
| No processo | Qualquer coisa com `ptrace` lê (módulo 8: `CAP_SYS_PTRACE`) |
| Em arquivo | Fica no disco, e o `DAC` decide — mas vaza em backup, core dump, `/proc/pid/environ` |
| ⚠ **No kernel** | ⚠ **Foi a escolha do Linux** — e o kernel passa a ser alvo de quem quer o segredo |

⚠ **A ideia:** o kernel guarda a chave em um objeto próprio, e **controla o acesso** — por UID, por grupo, por `keyring` compartilhado, por permissão explícita. Em tese, mais seguro que arquivo.

⚠ **E a consequência:** um subsistema a mais, com parser próprio, objetos com refcount, controle de acesso, e **alcançável por usuário sem privilégio**. Todas as características que os módulos 4, 5 e 6 mostraram produzir CVE.

---

## 9.2 A estrutura: `key`, `keyring` e a hierarquia

```
   task_struct
      │
      └──► cred (modulo 8)
             │
             ├──► session_keyring   ← ⚠ a chave de sessao, a mais usada
             │
             └──► process_keyring
                  
   thread_group
      └──► thread_keyring

   user_struct
      └──► user_keyring           ← ⚠ compartilhado por TODOS os
                                      processos do mesmo UID
   ┌──────────────────────────────────────────────────────┐
   │  keyring = uma chave cujo payload e uma LISTA        │
   │            de outras chaves                          │
   │                                                       │
   │  key {                                                │
   │    serial, type, permissions, uid, gid               │
   │    payload  ← ⚠ o segredo, ou a lista                │
   │    usage    ← ⚠ refcount (modulo 4)                  │
   │  }                                                    │
   └──────────────────────────────────────────────────────┘
```

⚠ **Três coisas dessa estrutura definem toda a superfície:**

1. **`keyring` é uma `key` que contém `key`s** — recursão, e recursão sempre produz bug de ciclo e de profundidade.
2. **Existem `keyring`s compartilhados** — `user_keyring` é por UID; `session_keyring` é herdado.
3. **Cada `key` tem `permissions`** — ⚠ um bitmask que decide quem lê, escreve, busca e **vincula**.

⚠ **O último item é o mais interessante, e é onde os bugs de permissão moram.** Uma `key` sem privilégio de *search* não é encontrada, mas **continua existindo**; sem *read*, você não lê o payload, mas pode **vincular** a chave a um keyring seu. Cada combinação dessas é uma pergunta de segurança, e cada uma tem código que a responde.

---

## 9.3 Os tipos de chave, e o que cada um carrega

| Tipo | Payload | Origem |
|---|---|---|
| **`user`** | ⚠ Bytes arbitrários | `add_key("user", ...)` — **o mais usado** |
| **`logon`** | Bytes, **sem leitura** | Kernel — ⚠ *nem o dono lê* |
| **`big_key`** | ⚠ Grande — em arquivo tmpfs | Kernel, acima de um limite |
| **`keyring`** | Lista de chaves | `add_key("keyring", ...)` |
| **`asymmetric`** | Chave pública/privada | Verificação de assinatura |
| **`trusted`** | Selado por TPM | Precisa de TPM |
| **`encrypted`** | Cifrado com chave-mestra do usuário | ⚠ Interessante: **o kernel cifra com chave que vem do userspace** |

⚠ **Dois tipos merecem atenção especial:**

⚠ **`big_key`** — quando o payload passa de um limite, o kernel guarda o conteúdo **em um arquivo em `tmpfs`**, e a `key` guarda o **caminho**. Isso significa que o segredo, em algum momento, **existe no filesystem** — e a pergunta passa a ser *quem alcança aquele `tmpfs`*. Foi a origem de mais de um CVE.

⚠ **`encrypted`** — o payload é cifrado com uma chave derivada da **chave-mestra do usuário**, e essa chave-mestra vem do userspace. O kernel não gera: **ele aceita**. Se um processo em `user namespace` consegue registrar uma chave-mestra no escopo errado, ele passa a decifrar o que não devia. É o módulo 7 encontrando o módulo 8.

```bash
# Ver os tipos disponiveis nesta maquina
cat /proc/keys 2>/dev/null | head
ls /proc/key-users 2>/dev/null
grep -r 'key_type' /usr/include/linux/keyctl.h 2>/dev/null | head

# Os tipos registrados, no kernel rodando
sudo cat /proc/kallsyms | grep -E 'key_type_(user|logon|big_key|encrypted|trusted)' | head
```

---

## 9.4 A interface: `keyctl` e o que ela expõe

```c
// As operacoes do subsistema — cada uma e um ponto de entrada
keyctl(KEYCTL_GET_KEYRING_ID, ...)
keyctl(KEYCTL_JOIN_SESSION_KEYRING, ...)   // ⚠ cria/entra em keyring de sessao
keyctl(KEYCTL_UPDATE, ...)
keyctl(KEYCTL_READ, ...)
keyctl(KEYCTL_SEARCH, ...)                 // ⚠ busca por tipo e descricao
keyctl(KEYCTL_LINK, ...)                   // ⚠ VINCULA a chave a um keyring SEU
keyctl(KEYCTL_UNLINK, ...)
keyctl(KEYCTL_CHOWN, ...)
keyctl(KEYCTL_SETPERM, ...)
keyctl(KEYCTL_INVALIDATE, ...)             // ⚠ invalida (nao libera)
keyctl(KEYCTL_REVOKE, ...)
```

⚠ **Duas operações aparecem em quase todo CVE do subsistema:**

⚠ **`KEYCTL_LINK`** — vincular uma chave a **um keyring seu**. Se a busca encontra uma chave que você não deveria alcançar, e você pode vinculá-la, você acabou de **estender a própria permissão** — porque agora a chave está onde você a alcança. É o padrão do *keyring permission escalation*.

⚠ **`KEYCTL_INVALIDATE` vs `KEYCTL_REVOKE`** — invalidação **não libera** o objeto imediatamente, e revogação não remove dos keyrings. Essa assimetria entre *marcar como morto* e *liberar de fato* é uma fonte clássica de **UAF** — é o módulo 4 puro, em uma estrutura de ciclo de vida incomum.

```c
// O raciocinio do bug de ciclo de vida (nao um exploit)
// 1. a chave existe, e alguem tem o serial
// 2. revoke/invalidate marca como morta MAS o objeto segue vivo
// 3. ⚠ o codigo de leitura usa o objeto sem reconferir o estado
// 4. liberacao acontece, e o passo 3 continua ocorrendo  ->  UAF
```

---

## 9.5 Os CVE, e o padrão

| CVE (família) | Classe | O que era |
|---|---|---|
| UAF em `keyctl` | ⚠ Objetos | Objeto liberado durante operação concorrente |
| Corrida em `add_key` | ⚠ Objetos | Chave visível antes de estar completa |
| `big_key` e o `tmpfs` | ⚠ Semântica | O caminho do arquivo alcançável além do previsto |
| `encrypted` e escopo de chave-mestra | ⚠ Permissão | Chave-mestra registrada no escopo errado |
| Permissão de `LINK` | ⚠ Permissão | Vincular sem ter o direito de vínculo |

⚠ **Leia a coluna da classe, e veja o que ela diz:** das cinco, **duas são objeto (módulo 4)**, **duas são permissão/semântica (módulo 7)** e **uma é vazamento por caminho de arquivo (módulo 3)**. Nenhuma classe nova.

⚠ **É a lição do módulo inteiro:** o `keyring` **não produz bug novo** — ele é um lugar novo onde as **mesmas classes** aparecem. Quem entendeu 3, 4 e 7 lê o `keyring` como lê `nftables`.

---

## 9.6 O que o kernel faz de certo, e o que ficou de fora

Vale o contraste, porque ele explica o desenho:

| Decisão do subsistema | Efeito |
|---|---|
| Chave do tipo `logon` **não é legível nem pelo dono** | ⚠ Bom: o segredo do kernel não vaza para o userspace |
| `permissions` em **bitmask explícito** | Bom: nega por padrão |
| `user_keyring` **por UID** | ⚠ Risco: todos os processos do mesmo UID compartilham |
| Payload grande vai para **`tmpfs`** | ⚠ Risco: o segredo toca o filesystem |
| Chave-mestra **vem do userspace** | ⚠ Risco: o kernel aceita o que não pode verificar |
| `INVALIDATE` **não libera** | ⚠ Risco: janela de ciclo de vida |

⚠ **Quatro das seis são decisões de desenho que abrem superfície** — não descuido. É a lição geral do curso: em subsistema de kernel, **a superfície é consequência do desenho**, e auditar é perguntar *"o que este desenho obriga o kernel a confiar?"*

---

## Laboratório 9 — Ler o porta-chaves

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```bash
cd ~/linternals-lab/m09

# 1. Onde estao as chaves desta sessao
cat /proc/keys 2>/dev/null || echo "sem chaves visiveis"
cat /proc/key-users 2>/dev/null
keyctl show 2>/dev/null || echo "keyctl nao instalado"

# 2. Crie uma chave sua, e veja o serial
keyctl add user minha-chave "segredo-do-lab" @s
keyctl show
keyctl read $(keyctl search @s user minha-chave)
```

⚠ **Não teste o passo 3 na sua máquina de trabalho — só na VM.** O padrão é este:

```bash
# 3. ⚠ A PERMISSAO: negue leitura, e veja o que sobra
S=$(keyctl search @s user minha-chave)
keyctl setperm $S 0x00000000        # nenhuma permissao
keyctl read $S                      # esperado: Permission denied
keyctl show                         # ⚠ a chave CONTINUA visivel e vinculada

# 4. ⚠ LINK: vinculando sem ter o direito
keyctl add keyring meu-keyring @s
keyctl link $S @s 2>&1              # o que acontece com permissao zerada?
keyctl show

# 5. Invalide e observe o ciclo de vida
keyctl invalidate $S
keyctl show                         # ⚠ invalidada NAO e o mesmo que liberada

# 6. Compare com big_key
keyctl add big_key grande "$(head -c 10000 /dev/zero | tr '\0' 'A')" @s
keyctl show
# ⚠ procure o arquivo tmpfs que o kernel criou para o payload
```

```bash
# 7. No kernel, os simbolos e as estruturas
K=~/linternals-lab/kernel/vmlinux
gdb $K -ex 'info address keyctl_read_key' \
       -ex 'info address key_create_or_update' \
       -ex 'ptype struct key' -ex quit

pahole -C key $K | head -30
grep -n 'key_put\|key_get\|refcount\|usage' $K/../security/keys/key.c 2>/dev/null | head
```

**O que observar:** no passo 3, a diferença entre **existir**, **ser visível** e **ser lida** — três estados distintos, e cada um com um bit de permissão. No passo 6, procure onde o kernel guardou os 10 KB: **não está na `key`**, e o caminho para o arquivo é o vetor.

**Exercício 1:** decodifique o bitmask de `permissions` de uma chave sua. Quais são os bits, e o que cada um autoriza? Escreva a tabela, e explique por que *search* e *link* são direitos **separados**.

**Exercício 2:** rode `keyctl show` antes e depois de `invalidate()`. A chave sumiu do keyring? Ela ainda ocupa memória? O que você observou, e o que isso implica para a janela do módulo 4.

**Exercício 3 (o que vale):** escolha `big_key` e responda: (a) acima de quantos bytes o kernel muda para arquivo? (b) onde o arquivo fica? (c) um processo do mesmo UID alcança o arquivo? Justifique com a leitura do código em `security/keys/big_key.c`. É o exercício que mostra como uma decisão de desenho vira vazamento.

---

## Resumo

- ⚠ **O kernel guarda segredo por desenho** — chave de sessão, credencial de rede, chave-mestra.
- `keyring` é uma `key` que contém `key`s; existem keyrings **compartilhados por UID** e herdados pela sessão.
- ⚠ **Cada `key` tem bitmask de permissão** — *search*, *read* e *link* são direitos **separados**, e cada combinação é uma pergunta de segurança.
- ⚠ **`KEYCTL_LINK` é a operação que mais aparece**: vincular a um keyring seu **estende a própria permissão**.
- ⚠ **`INVALIDATE` não libera** — a assimetria entre marcar como morto e liberar produz UAF.
- **`big_key` escreve o payload em `tmpfs`**: o segredo toca o filesystem, e o caminho é o vetor.
- ⚠ **Nenhuma classe de bug nova** — o `keyring` é um lugar onde os módulos 3, 4 e 7 reaparecem.

---

## O que o próximo módulo entrega

Você conhece cinco subsistemas com as mesmas classes de bug. O módulo 10 trata do **verifier do eBPF** — o único componente do kernel cujo **trabalho é provar segurança**, e portanto o único cuja falha é *a prova que não provou*. Você vai entender o que ele garante, e onde a garantia cede.
