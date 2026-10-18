# Módulo 5 — Memória: `VAD`, Pool `Paged`/`NonPaged`, e Corrupção

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 5 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 6 — `PE`, `PEB` e `TEB`

---

## O que este módulo entrega

Ao final, você vai entender **onde o dado vive** — na memória virtual do processo, descrita por `VAD`, e no **pool do kernel**, do lado de dentro. Você vai saber reconhecer as classes de corrupção de pool e entender **por que elas são o bug de driver mais comum**. É o módulo que prepara o curso de Pesquisa em Windows.

---

## 5.1 Dois espaços, duas histórias

⚠ **A memória do processo** é gerida por **seções e `VAD`** — o kernel descreve o que o processo pode tocar.

⚠ **A memória do kernel** é gerida por **pool** — o kernel aloca para si mesmo.

| | Memória do processo | Pool do kernel |
|---|---|---|
| Quem vê | Só o processo (por padrão) | ⚠ **Todo o kernel** |
| Estrutura de controle | `VAD` (árvore balanceada) | Listas de pool |
| Alocação | `VirtualAlloc`, seções | `ExAllocatePool*` |
| ⚠ Corromper | Afeta o processo | ⚠ **Afeta o sistema** |

⚠ **A assimetria é o ponto:** um overflow na memória do processo estoura dentro do próprio processo. Um overflow **no pool** estoura **no kernel**, e o alvo seguinte pode ser qualquer estrutura — inclusive uma credencial.

---

## 5.2 `VAD`: o mapa da memória do processo

⚠ **VAD = Virtual Address Descriptor.** Cada região da memória virtual tem um, e o kernel os mantém em uma **árvore balanceada** (não uma lista) para busca rápida.

```c
struct _MMVAD_SHORT {
    RTL_BALANCING_NODE VadNode;    // ⚠ a arvore
    ULONG StartingVpn;             // ⚠ pagina inicial
    ULONG EndingVpn;               // ⚠ pagina final
    ULONG Protection;              // ⚠ PAGE_READWRITE, PAGE_EXECUTE_READ...
    // ...
};
```

⚠ **O campo `Protection` é o que define o que a região permite** — e ele é o alvo de uma classe de ataque conhecida: alterar o `VAD` de uma região para torná-la **executável** quando não era. É a versão Windows do `mprotect` forçado.

```windbg
# A arvore de VADs de um processo
kd> !vad <ENDERECO_DO_EPROCESS>

# Detalhe de uma regiao
kd> !vad <ENDERECO> 1
dt nt!_MMVAD -a | head -30

# Endereco virtual -> estrutura
kd> !pte <ENDERECO_VIRTUAL>          # ⚠ a traducao
kd> !vtop 0 <ENDERECO_VIRTUAL>       # ⚠ o endereco fisico
```

⚠ **`!pte` e `!vtop` são as ferramentas que traduzem endereço virtual em físico.** Elas importam porque o pool vive em endereço **virtual do kernel**, e para ler um objeto concreto você precisa chegar ao físico.

---

## 5.3 Pool: onde o kernel aloca

⚠ **Duas famílias, e a distinção não é de tamanho:**

| Pool | Pode paginar? | Onde roda |
|---|---|---|
| **`PagedPool`** | ⚠ Sim — pode ir para o disco | Contexto que pode esperar |
| **`NonPagedPool`** | ❌ **Nunca** | ⚠ Interrupção, `DISPATCH_LEVEL` |

```c
// As alocacoes do kernel
ExAllocatePool2(POOL_FLAG_PAGED,   size, tag);
ExAllocatePool2(POOL_FLAG_NON_PAGED, size, tag);
ExAllocatePool2(POOL_FLAG_NON_PAGED_EXECUTABLE, size, tag);  // ⚠ raro e perigoso
ExFreePool(obj);
```

⚠ **A leitura das flags é a mesma do `kmalloc` no Linux:** `POOL_FLAG_NON_PAGED` em contexto que pode esperar é desperdício; **`POOLED` em contexto que não pode esperar é bug de estabilidade** — a página pode sair da memória e o kernel falha em `DISPATCH_LEVEL`.

⚠ **O `tag` é um número de 4 bytes** que identifica o alocador. Ele aparece no `!poolused` e no `!poolfind`, e é a assinatura de quem alocou.

```windbg
# Uso do pool por tag
!poolused 2          # ⚠ por utilizacao (nao paginado)
!poolused 4          # paginado

# Encontrar um objeto pelo tag
!poolfind <TAG>

# Detalhe de um bloco
!pool <ENDERECO>
dt nt!_POOL_HEADER -a | head -20
```

⚠ **A leitura que importa:** o `_POOL_HEADER` antecede o bloco, como o `OBJECT_HEADER` do módulo 3 antecede o objeto. E é ele que carrega, em build com verificação, os padrões de **redzone** e **poison** — o `Driver Verifier` (módulo 7 do curso de Pesquisa) os preenche.

---

## 5.4 As classes de corrupção

⚠ **Quatro, e são as mesmas do curso de Linux Internals — com outro nome:**

| Classe | O que é | Como aparece |
|---|---|---|
| **Overflow de pool** | Escrever além do bloco | ⚠ Bugcheck no `_POOL_HEADER` do vizinho |
| **UAF de pool** | Usar depois de `ExFreePool` | ⚠ O bloco reciclado tem dado de outro |
| **Double-free** | Liberar duas vezes | Lista de pool corrompida |
| **Excessivo (`lookaside`)** | ⚠ Cache de bloco por tipo | Reutilização rápida — como o slab |

```c
// O padrao canonico de overflow (leia agora, reconheca sempre)
void bug(PVOID userBuf, ULONG userLen) {
    ULONG tam = 64;
    PVOID p = ExAllocatePool2(POOL_FLAG_NON_PAGED, tam, 'gaTB');

    // ⚠ copia userLen, que o usuario CONTROL
    RtlCopyMemory(p, userBuf, userLen);   // se userLen > 64  ->  corrompe o vizinho
}
```

⚠ **A causa raiz quase sempre é a mesma:** o **método de buffer** do `IOCTL` diz que o driver valida o tamanho, e ele **não valida**. É exatamente o que o curso de Pesquisa em Windows trata como a tese central, no módulo 2.

---

## 5.5 `Lookaside`: o slab do Windows

⚠ **A mesma ideia do slab, com outro nome:** em vez de alocar e liberar toda vez, o driver mantém uma **lista de blocos do mesmo tamanho**.

```c
// Criar uma lookaside no DriverEntry
NPAGED_LOOKASIDE_LIST g_list;
ExInitializeNPagedLookasideList(&g_list, NULL, NULL, 0,
                                sizeof(MEU_OBJ), 'gaTB', 0);

// Alocar e liberar rapido
PVOID o = ExAllocateFromNPagedLookasideList(&g_list);
ExFreeToNPagedLookasideList(&g_list, o);
```

⚠ **Consequência de segurança:** um bloco liberado para a lookaside é **imediatamente reutilizável** — e o conteúdo **não é zerado**. É o mesmo mecanismo que o `__GFP_ZERO` ausente do Linux produz: **vazamento de dado de outro contexto**.

⚠ **E é a razão de a lookaside ser o veículo favorito de `pool spray`** em exploits de Windows: alocar blocos do tamanho certo, com conteúdo controlado, para reocupar um bloco liberado. É o `heap spray` do módulo 3 do curso de Linux, com o nome local.

```windbg
# Ver as lookaside ativas
!lookaside
dt nt!_NPAGED_LOOKASIDE_LIST -a

# E a memoria, com o Driver Verifier ligado
!verifier 0x80          # ⚠ estado do verifier
!verifier 3 <DRIVER>    # ⚠ pool alocado por um driver especifico
```

---

## 5.6 O `Driver Verifier` — o instrumento obrigatório

⚠ **Sem ele, um UAF de pool pode passar em silêncio.** É o `KASAN` do Windows:

```powershell
# A configuracao que este curso usa
verifier /standard /driver MeuDriver.sys

# Ver o estado
verifier /querysettings
verifier /query

# ⚠ Flags que importam para o estudo de memoria:
#   /standard          -> as verificacoes essenciais
#   Special pool       -> ⚠ coloca o bloco no FIM da pagina, para
#                          que overflow atinja pagina invalida
#   Pool tracking      -> ⚠ detecta VAZAMENTO
#   Deadlock detection -> detecta lock mal usado
```

⚠ **O *special pool* é a peça que faz overflow virar relatório explícito.** Sem ele, um overflow de 8 bytes corrompe o vizinho e o bugcheck aparece **longe dali**, em código inocente. Com special pool, o bloco fica encostado no fim da página, e o primeiro byte além **acessa página inválida** — o crash é **no culpado**.

```windbg
# Depois do bugcheck, o comando que aponta o culpado
!analyze -v
# ⚠ leia: BUGCHECK_CODE, e a secao com a PILHA de quem escreveu
!verifier 3 <DRIVER>
```

⚠ **O paralelo com o módulo 4 do curso de Linux é exato:** assim como o KASAN responde *em qual cache alocou, quem liberou, quem usou*, o `!analyze -v` responde *qual driver, qual bloco, em que endereço*. **O instrumento é diferente, o método é o mesmo.**

---

## 5.7 Correlação — a tabela que fecha os dois cursos

| Linux Internals | Windows Internals |
|---|---|
| `kmalloc` / `vmalloc` | `ExAllocatePool2` / pool flag |
| `slab` | ⚠ **Lookaside** |
| `GFP_KERNEL` / `GFP_ATOMIC` | ⚠ **Paged / NonPaged** |
| `__GFP_ZERO` | `POOL_ZERO_*` |
| `KASAN` | ⚠ **Driver Verifier** (+ special pool) |
| `msg_msg` / `pipe_buffer` | ⚠ **Lookaside e pool spray** |
| `SLAB_POISON` | padrões de verificação no `_POOL_HEADER` |
| `slab_debug` | `verifier /standard` |

⚠ **Note que o mapeamento é quase um para um.** A lição do curso: os dois kernels têm os mesmos problemas, porque o **problema é de alocador dinâmico**, não de sistema operacional.

---

## Laboratório 5 — Ler a memória

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**
⚠ **Este lab quebra a VM.** Snapshot limpo obrigatório.

```
# ── WinDbg kernel mode ──────────────────────────────────────

# 1. O mapa de memoria de um processo
!vad <ENDERECO_DO_EPROCESS>
!vad <ENDERECO> 1

# 2. A traducao virtual -> fisico
!pte <ENDERECO_VIRTUAL>
!vtop 0 <ENDERECO_VIRTUAL>

# 3. O pool
!poolused 4
!poolfind <TAG>
!pool <ENDERECO>
dt nt!_POOL_HEADER -a | head -20
!lookaside

# 4. O verifier
!verifier 0x80
!verifier 3 <NOME_DO_DRIVER>
```

```c
// 5. Um driver com overflow de pool proposital
#include <ntddk.h>

#define TAG 'gaTB'

NTSTATUS DriverEntry(PDRIVER_OBJECT drv, PUNICODE_STRING reg) {
    ULONG tam = 64;
    PVOID p = ExAllocatePool2(POOL_FLAG_NON_PAGED, tam, TAG);
    if (!p) return STATUS_INSUFFICIENT_RESOURCES;

    DbgPrint("[lab] alocado em %p, tag %c%c%c%c\n", p,
             (TAG>>0)&0xff, (TAG>>8)&0xff, (TAG>>16)&0xff, (TAG>>24)&0xff);

    // ⚠ OVERFLOW: escreve 128 em um bloco de 64
    RtlFillMemory(p, tam * 2, 0x41);

    ExFreePool(p);
    drv->DriverUnload = NULL;
    return STATUS_SUCCESS;
}
```

```powershell
# 6. Compile o driver e ligue o verifier para ele
verifier /standard /driver overflow.sys
# ⚠ reinicie, instale o driver, e observe o bugcheck
#    Sem verifier: pode passar, ou dar bugcheck LONGE daqui
#    Com verifier: o crash aponta o bloco e a instrucao culpada
```

**O que observar:** no passo 2, `!vtop` mostra que o endereço virtual do pool corresponde a um endereço **físico**. ⚠ E que o endereço virtual está em faixa alta do kernel — não no espaço do seu processo.

**Exercício 1:** rode o driver do passo 5 **sem** `verifier` e depois **com**. Compare o `!analyze -v` dos dois casos. ⚠ Escreva: em qual dos dois o culpado aparece na pilha? Por quê o *special pool* faz essa diferença?

**Exercício 2:** no WinDbg, encontre um bloco de pool com `!poolfind <TAG>` e imprima o `_POOL_HEADER`. Localize o campo de tag e o tamanho. ⚠ Depois confirme com `!pool <ENDERECO>` que o tamanho bate.

**Exercício 3 (o que vale):** escreva um driver que aloca 64 bytes, libera, e **lê** o conteúdo depois de liberado. Rode com `verifier` e leia o relatório. ⚠ Depois responda: o relatório aponta *quem usou* ou *quem liberou*? Compare com o KASAN do curso de Linux Internals (módulo 4) e escreva a diferença de formato, se houver.

---

## Resumo

- ⚠ **Dois espaços**: a memória do processo (`VAD`) e o **pool do kernel** — e corromper o segundo afeta o sistema.
- **`VAD` é árvore balanceada**, e o campo `Protection` define o que a região permite.
- ⚠ **`Paged` vs `NonPaged` não é tamanho — é "pode paginar"**, e usar pool paginado em `DISPATCH_LEVEL` é bug de estabilidade.
- O **`tag`** identifica o alocador, e aparece em `!poolused` e `!poolfind`.
- ⚠ **Lookaside é o slab do Windows**, e bloco liberado **não é zerado** — a origem do vazamento de dado de outro contexto.
- ⚠ **`Driver Verifier` + special pool** é o instrumento obrigatório: transforma overflow silencioso em relatório que aponta o culpado.
- ⚠ **O mapeamento Linux ↔ Windows é quase um para um** — o problema é de alocador dinâmico, não de sistema.

---

## O que o próximo módulo entrega

Você entende onde o dado vive. O módulo 6 abre o que o **processo** carrega sobre si mesmo: **`PE`, `PEB` e `TEB`** — onde ficam o loader, a lista de módulos, os parâmetros de linha de comando e o heap do processo, e por que essas estruturas são alvo de manipulação.
