# Módulo 2 — Processo e Thread: `EPROCESS`, `ETHREAD`, `KPROCESS`, `KTHREAD`

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 2 de 12 · 3 horas
**Pré-requisitos:** Módulo 1
**Próximo:** Módulo 3 — O modelo de objeto

---

## O que este módulo entrega

Ao final, você vai saber **ler as quatro estruturas que definem um processo no Windows**, **entender por que são quatro e não uma**, e **navegar tudo isso no `WinDbg`**. É o módulo que transforma o Gerenciador de Tarefas em mapa — e o que os módulos 4, 5 e 12 assumem.

---

## 2.1 Por que quatro estruturas

⚠ **No Linux há uma `task_struct`.** No Windows há quatro, e a razão é **separação entre execução e recurso**:

```
   ┌──────────────────────────────────────────────────────┐
   │  EPROCESS      ← Executive Process                    │
   │  "o processo": recursos, objeto, handles, memória     │
   │     │                                                 │
   │     ├── Pcb  ► KPROCESS   ← Kernel Process            │
   │     │          agendamento: prioridade, afinidade,     │
   │     │          lista de threads, tempo de CPU          │
   │     │                                                 │
   │     └── ThreadListHead ► ETHREAD ...                  │
   └──────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────┐
   │  ETHREAD       ← Executive Thread                     │
   │  "a thread": objeto, contexto, estado de espera       │
   │     │                                                 │
   │     └── Tcb  ► KTHREAD    ← Kernel Thread             │
   │                agendamento: prioridade, quantum,       │
   │                APC, contexto de CPU                    │
   └──────────────────────────────────────────────────────┘
```

⚠ **A regra que organiza a leitura:**

| Estrutura | Nível | Contém |
|---|---|---|
| **`KPROCESS` / `KTHREAD`** | ⚠ **Kernel (dispatcher)** | O que o **agendador** precisa — prioridade, quantum, lista |
| **`EPROCESS` / `ETHREAD`** | ⚠ **Executive** | O que o **objeto e o recurso** precisam — handle, token, memória |

⚠ **E a divisão explica por que `Pcb` e `Tcb` ficam no **começo** de `EPROCESS` e `ETHREAD`:** as listas ligadas do agendador apontam para `KPROCESS`, e o `EPROCESS` começa com ele **no offset zero** para que o kernel possa converter entre os dois **sem calcular** — um cast de ponteiro basta.

```c
// O que permite a conversao instantanea
typedef struct _EPROCESS {
    KPROCESS Pcb;              // ⚠ OFFSET ZERO
    // ... resto da estrutura executive ...
} EPROCESS;

// e a macro que o kernel usa
#define CONTAINING_RECORD(addr, type, field)  /* ... */
#define PsGetProcessId(p)  ((p)->UniqueProcessId)
```

⚠ **Consequência para análise:** um ponteiro para `KPROCESS` **é** um ponteiro para `EPROCESS`. E um endereço de `KTHREAD` **é** um endereço de `ETHREAD`. Quem não sabe disso perde tempo procurando conversão que não existe.

---

## 2.2 `EPROCESS` — o que importa

```c
// Campos que voce vai usar (nomes podem variar por build)
struct _EPROCESS {
    KPROCESS Pcb;                    // offset 0
    EX_PUSH_LOCK ProcessLock;
    LIST_ENTRY ActiveProcessLinks;   // ⚠ encadeia TODOS os processos
    ULONG UniqueProcessId;           // ⚠ o PID
    ULONG ActiveThreads;
    HANDLE_TABLE *ObjectTable;       // ⚠ a tabela de handles (modulo 4)
    // ...
    PEB *Peb;                        // ⚠ what o processo sabe de si
    LIST_ENTRY ThreadListHead;       // ⚠ as threads
    EX_FAST_REF Token;               // ⚠ o TOKEN (modulo 9)
    // ...
    PPROTECTION Protection;          // ⚠ integridade (modulo 9)
    // ...
    IMAGE_INFO *ImageFileName;       // caminho do executavel
};
```

⚠ **Três campos definem tudo que este curso trata:**

| Campo | Importância |
|---|---|
| **`ActiveProcessLinks`** | ⚠ Encadeia **todos** os processos — a lista que o kernel percorre |
| **`ObjectTable`** | ⚠ A tabela de handles — módulo 4 |
| **`Token`** | ⚠ A credencial — módulo 9 |

⚠ **`ActiveProcessLinks` merece o destaque.** É uma lista dupla, e o kernel a percorre para **enumerar processos**. Consequência dupla: (a) é a estrutura que a ferramenta de enumeração lê; (b) ⚠ **subtrair um processo dela o esconde de todo mundo** — a técnica conhecida como *DKOM*, e a razão de existir telemetria que **não** usa essa lista.

```windbg
# Enumerar processos pela lista do kernel
kd> !process 0 0                    # ⚠ usa ActiveProcessLinks
kd> !process 0 7                    # ⚠ mais detalhe, incluindo o EPROCESS
kd> dt nt!_EPROCESS
kd> dt nt!_EPROCESS ActiveProcessLinks
kd> dt nt!_EPROCESS -a             # offsets dos campos
```

⚠ **O terceiro comando é o mais importante do módulo.** `dt <tipo> -a` imprime **os offsets de cada campo da build atual**. Você não precisa memorizar offset: precisa saber perguntar.

---

## 2.3 `ETHREAD` — a unidade de execução

```c
struct _ETHREAD {
    KTHREAD Tcb;                     // offset 0 — o kernel thread
    LARGE_INTEGER CreateTime;
    // ...
    CLIENT_ID Cid;                   // ⚠ ProcessId + ThreadId
    // ...
    KSTART_ROUTINE *StartAddress;    // ⚠ onde a thread comeca
    // ...
    LIST_ENTRY ThreadListEntry;      // ⚠ o elo na ThreadListHead
    // ...
};
```

⚠ **A thread é a unidade que o agendador escala.** No Windows, diferente de alguns sistemas Unix antigos, **a thread é o que roda** — o processo é o contêiner de recursos.

| Conceito | Onde |
|---|---|
| Prioridade, quantum, afinidade | ⚠ `KTHREAD` |
| Contexto de CPU, trampolim | `KTHREAD` |
| ⚠ APC (Asynchronous Procedure Call) | `KTHREAD` |
| Identificador, tempo de criação | `ETHREAD` |
| Ponto de entrada | `ETHREAD` |

⚠ **APC merece nota, e o módulo 12 volta nela.** A chamada de procedimento assíncrono permite executar código **na thread alvo**, numa fila que o kernel drena em momento controlado. É o mecanismo de operações legítimas (I/O) e de **injeção** — e é por isso que telemetria de injeção observa `QueueUserAPC`.

```windbg
kd> dt nt!_ETHREAD
kd> !thread                            # a thread atual
kd> dt nt!_KTHREAD -a | head -30       # offsets
kd> !running                          # o que roda em cada CPU
```

---

## 2.4 Navegar do `_EPROCESS` ao detalhe

O fluxo que se repete em todo o curso:

```windbg
# 1. Um processo pelo nome
kd> !process 0 0 notepad.exe

# 2. Do endereco do EPROCESS, os detalhes
kd> !process ffff8880`12345678 7

# 3. Ler campos direto
kd> dt nt!_EPROCESS ffff8880`12345678 UniqueProcessId ActiveThreads
kd> dt nt!_EPROCESS ffff8880`12345678 Token
kd> dx -r1 ((nt!_EPROCESS*)0xffff8880`12345678)->Token

# 4. As threads do processo
kd> !thread ffff8880`12345678

# 5. E a volta: do KPROCESS ao EPROCESS
#    ⚠ sao o MESMO endereco — Pcb esta no offset 0
kd> dt nt!_EPROCESS ffff8880`12345678 Pcb
#    o endereco do Pcb e identico ao do EPROCESS
```

⚠ **A demonstração do passo 5 é a prova do 2.1.** Se você entender que `Pcb` está no offset zero, entende por que o kernel converte entre as estruturas com um simples cast.

---

## 2.5 O que muda de build para build

⚠ **Aviso estrutural deste curso:** os nomes e **a ordem dos campos mudam entre versões do Windows**, e a Microsoft não documenta a `EPROCESS` publicamente.

| O que muda | Como lidar |
|---|---|
| Ordem dos campos | ⚠ **Nunca hardcode offset** — use `dt -a` |
| Nomes | ⚠ Verifique no símbolo da build alvo |
| Campos novos | Aparecem entre versões; não presuma ausência |
| ⚠ **Estruturas internas** | Podem ser opacas por desenho |

⚠ **A consequência prática:** qualquer ferramenta que dependa de offset fixo **quebra na atualização seguinte**. Um driver que lê `EPROCESS` por offset hardcoded funciona hoje e para amanhã — e é essa a razão de existir bibliotecas de resolução dinâmica de offset.

```windbg
# Sempre confirme na build alvo, antes de escrever codigo
kd> .reload
kd> dt nt!_EPROCESS -a | head -40
kd> lm m nt                       # ⚠ a versao exata do ntoskrnl carregado
```

---

## 2.6 Símbolo: sem ele, nada disso funciona

⚠ **O requisito do curso inteiro.** Sem símbolo de kernel, você vê `fffff80012345678` e nada mais.

```windbg
# Configurar o servidor de simbolos da Microsoft (uma vez)
.sympath srv*C:\symbols*https://msdl.microsoft.com/download/symbols
.reload /f

# Verificar
lm m nt
!process 0 0
x nt!PsGetProcessId              # ⚠ se funciona, o simbolo esta ok
```

⚠ **E o modo kernel exige VM separada.** O alvo vai dar bugcheck — e você vai querer o `WinDbg` **de fora** para ler o estado. O lab do módulo usa conexão de rede:

```powershell
# Na VM alvo
bcdedit /set debug on
bcdedit /set testsigning on
bcdedit /dbgsettings net hostip:192.168.1.10 port:50000 key:1.2.3.4

# No host
windbg -k net:port=50000,key=1.2.3.4
```

---

## Laboratório 2 — Ler o processo

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

⚠ **Rode tudo em VM com snapshot limpo.** Este lab exige kernel debug, e o alvo vai travar pelo menos uma vez.

```powershell
# ── Na VM alvo ──────────────────────────────────────────────
bcdedit /set debug on
bcdedit /set testsigning on
bcdedit /dbgsettings net hostip:<SEU_IP> port:50000 key:1.2.3.4
bcdedit /enum {current}
# ⚠ reinicie depois de mudar

# Confirme que o debug esta ligado
bcdedit /dbgsettings
```

```
# ── No host, WinDbg kernel mode ─────────────────────────────
windbg -k net:port=50000,key:1.2.3.4

# 1. Simbolo (obrigatorio)
.sympath srv*C:\symbols*https://msdl.microsoft.com/download/symbols
.reload /f
lm m nt

# 2. As estruturas
dt nt!_EPROCESS -a | head -40
dt nt!_KPROCESS -a | head -20
dt nt!_ETHREAD  -a | head -30
dt nt!_KTHREAD  -a | head -30

# 3. Um processo, e o caminho completo
!process 0 0 notepad.exe
!process <ENDERECO> 7
dt nt!_EPROCESS <ENDERECO> UniqueProcessId ActiveThreads
dt nt!_EPROCESS <ENDERECO> Token

# 4. As threads
!thread <ENDERECO>

# 5. A prova do offset zero
dt nt!_EPROCESS <ENDERECO> Pcb
#    ⚠ compare: o endereco impresso e o MESMO do EPROCESS

# 6. A lista de processos
dt nt!_EPROCESS ActiveProcessLinks
#    ⚠ percorra a lista a mao:
#    dt nt!_LIST_ENTRY <ENDERECO_DO_CAMPO>
```

**O que observar:** no passo 5, a igualdade de endereços. No passo 6, `ActiveProcessLinks` é um `LIST_ENTRY` **embutido** no `EPROCESS` — não um ponteiro para fora. ⚠ Por isso percorrer a lista exige aritmética: do campo de volta para a estrutura, é o padrão `CONTAINING_RECORD`.

**Exercício 1:** escreva, a partir do `dt -a` da sua build, os offsets de `UniqueProcessId`, `Token` e `ObjectTable`. Compare com uma build diferente (outra VM, outra versão) e **mostre que não batem**. Escreva uma frase sobre o que isso implica para qualquer ferramenta que use offset fixo.

**Exercício 2:** percorra `ActiveProcessLinks` **à mão**, no WinDbg, por três processos. Para cada um, some o offset do campo ao endereço da estrutura, imprima o `LIST_ENTRY` seguinte, e subtraia o offset para chegar ao `EPROCESS` do próximo. ⚠ É exatamente o que o `!process` faz por você.

**Exercício 3 (o que vale):** no `WinDbg`, compare `KTHREAD` e `ETHREAD` e escreva a tabela do 2.1 com os campos **reais da sua build**: o que é agendamento e o que é recurso. Depois responda: por que APC está no `KTHREAD` e não no `ETHREAD`? É o raciocínio que o módulo 12 assume.

---

## Resumo

- ⚠ **São quatro estruturas, não uma**: `KPROCESS`/`KTHREAD` (agendamento) e `EPROCESS`/`ETHREAD` (recurso).
- ⚠ **`Pcb` e `Tcb` ficam no offset zero** — converter entre as estruturas é um cast de ponteiro.
- **`ActiveProcessLinks`** encadeia todos os processos, e ⚠ **subtrair um processo dela o esconde** (DKOM).
- **`ObjectTable`** (módulo 4) e **`Token`** (módulo 9) são os campos que decidem segurança.
- ⚠ **Nunca hardcode offset** — `dt <tipo> -a` responde na build alvo, e a ordem muda entre versões.
- **Símbolo de kernel é pré-requisito absoluto**, e kernel debug exige VM separada.

---

## O que o próximo módulo entrega

Você sabe ler processo e thread. O módulo 3 abre o que o Windows chama de **modelo de objeto**: o `ObjectHeader`, o tipo, o `SecurityDescriptor` e o contador de referência — o mecanismo que o módulo 4 (handles) e o módulo 9 (token) usam para decidir acesso.
