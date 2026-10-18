# Módulo 6 — Confusão de Tipo em Objeto: O Compartilhamento de Tipo Como Causa

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 6 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 5
**Próximo:** Módulo 7 — `BYOVD`

---

## O que este módulo entrega

Ao final, você vai entender **a classe que transforma um bug irrelevante em primitiva planejada** — e por que ela tem uma causa específica no Windows: o **compartilhamento de tipo**. Você vai reconhecer as quatro formas, e saber **onde olhar** no código do driver.

---

## 6.1 Por que o tipo é a chave

⚠ **A frase que organiza o módulo:**

> **No Windows, o tipo do objeto é o que decide o que aqueles bytes SIGNIFICAM. Trocar o tipo é
> dizer ao kernel que a mesma memória passou a ser outra coisa.**

⚠ **E a razão de isso ser possível:** o `OBJECT_HEADER` (módulo 3 do Windows Internals) guarda um **ponteiro para o tipo** — e o kernel **confia nele**. ⚠ Se o tipo é alterado, ou se o código usa um ponteiro obsoleto cujo bloco foi reocupado por **outro tipo**, a interpretação muda **sem que nada seja sobrescrito**.

```
   ⚠ SEM SOBRESCREVER NADA:

   mesmo endereco
        │
        ├─► interpretado como TIPO A  (o que o codigo espera)
        │      struct A { ptr_para_dado; tamanho; }
        │
        └─► interpretado como TIPO B  (o que esta la)
               struct B { controle; ptr_para_funcao; }
        ⚠ o "tamanho" lido e', na verdade, um PONTEIRO
```

⚠ **A leitura que faz a classe valer:** o mesmo `UAF` do módulo 4 que daria bugcheck passa a dar **controle de fluxo**, só porque o bloco foi reocupado com um objeto de tipo diferente. ⚠ O bug não mudou — **mudou o que estava no lugar**.

---

## 6.2 As quatro formas

### A — Reocupação com tipo diferente (a mais comum)

⚠ **É o UAF do módulo 4, com **escolha de tipo** no spray:**

```
   1. objeto do TIPO A e' liberado (o bug)
   2. ⚠ o spray aloca objeto do TIPO B no MESMO endereco
   3. o codigo continua tratando como TIPO A
        │
        ▼
   ⚠ le campos do A nos offsets do B
```

⚠ **E a razão de `Named Pipe` e chave de registro serem veículos ideais:** o **nome** é string que você controla, e ela cai **em offsets previsíveis** dentro do objeto. ⚠ Você escolhe os bytes que vão ser interpretados como ponteiro.

### B — `OBJECT_HEADER` corrompido

⚠ **Escrever no header muda o **tipo declarado** do objeto:**

```
   ┌─────────────────────┬────────────────────────┐
   │ OBJECT_HEADER       │  CORPO                 │
   │ PointerCount        │                        │
   │ ⚠ Type ◄────────────┼── o que o kernel LE     │
   │ ...                 │                        │
   └─────────────────────┴────────────────────────┘
```

⚠ **A consequência é direta:** o kernel chama `ParseProcedure`, `SecurityProcedure` e as operações **do tipo novo** — em um corpo do tipo antigo. ⚠ É a primitiva mais completa da classe, e a mais difícil: exige escrever no header, que fica **antes** do corpo.

### C — Compartilhamento de tipo (`TypeInfo` compartilhado)

⚠ **A causa **estrutural**, e a mais interessante deste curso.**

⚠ **No Windows, drivers podem **criar** seus próprios tipos de objeto. E há um detalhe:** o `TypeInfo` — a estrutura que contém os procedimentos — pode ser **compartilhado** entre objetos.

```c
// Ao criar um tipo de objeto proprio:
OBJECT_TYPE_INITIALIZER init;
init.SecurityProcedure = MeuSecurity;      // ⚠ se compartilhado...
init.ParseProcedure    = MeuParse;
// ... e criar:
ObCreateObjectType(&nome, &init, NULL, &tipo);

// ⚠ Se o driver cria DOIS tipos com o MESMO TypeInfo,
//   os procedimentos são os mesmos — e um objeto de um tipo
//   passa a ser tratado com a semantica do outro.
```

⚠ **O bug aparece quando:** o driver cria dois tipos distintos, compartilha o `TypeInfo`, e a **validação de acesso** de um é a do outro. ⚠ É uma falha de **permissão** disfarçada de confusão de tipo.

⚠ **E a razão de ela ser difícil de ver:** o código parece **correto**. Os dois tipos existem, os objetos têm `SecurityDescriptor` — só que a **verificação** de um é a do outro.

### D — Confusão por `union` e por campo interpretado

⚠ **A mais localizada, e a que aparece em `IOCTL`:** o driver recebe um buffer, e interpreta o **mesmo offset** como tipo A ou tipo B, conforme um campo que **o userspace controla**.

```c
// ⚠ VULNERAVEL — o campo "tipo" vem do usuario
typedef struct { ULONG tipo; UCHAR dados[64]; } REQ;

switch (req->tipo) {
    case 1: ((TIPO_A *)req->dados)->campo_int = 1; break;
    case 2: ((TIPO_B *)req->dados)->ponteiro = ...; break;
    // ⚠ a mesma memoria, duas estruturas — e o usuario escolhe
}
```

⚠ **Esta forma é a mais fácil de achar na leitura do contrato (módulo 2)**, porque ela **aparece no handler do `IOCTL`**.

---

## 6.3 Onde olhar

⚠ **O método, e ele é **leitura de código**:**

```
   1. ⚠ PROCURE     ->  ObCreateObjectType no driver
   2. VERIFIQUE   ->  dois tipos compartilham o TypeInfo?
   3. ⚠ SIGA       ->  o driver guarda ponteiro de objeto em estrutura propria?
   4. PERGUNTE    ->  esse ponteiro pode apontar para OUTRO tipo?
   5. ⚠ LEIA       ->  os offsets usados batem com os do tipo esperado?
```

⚠ **O passo 4 é o coração:** o padrão típico é o driver guardar `PVOID` — **sem tipo** — em uma estrutura de contexto. ⚠ Um `PVOID` não carrega tipo, e nada impede que ele aponte para outra coisa.

```powershell
# 1. Os tipos criados pelo driver
#    ⚠ no WinDbg, sobre a VM:
#    kd> !object \ObjectTypes | Select-String meudrv
```

```
kd> !object \ObjectTypes
kd> dt nt!_OBJECT_TYPE <ENDERECO> Name TypeInfo
kd> dt nt!_OBJECT_TYPE_INITIALIZER -a
#    ⚠ compare os TypeInfo de dois tipos do MESMO driver
#      se os enderecos forem iguais -> ⚠ TypeInfo COMPARTILHADO
```

⚠ **A comparação dos `TypeInfo` é o teste do 6.2-C, e ela é **mecânica**.** ⚠ Dois tipos do mesmo driver com o **mesmo** endereço de `TypeInfo` é o sinal.

---

## 6.4 Medir

⚠ **A confusão de tipo é difícil de medir, e a razão é que ela **não dá bugcheck**.** ⚠ O código "funciona" — só faz outra coisa.

⚠ **Os três instrumentos, e o terceiro é o que decide:**

| Instrumento | ⚠ O que mostra |
|---|---|
| **`Driver Verifier` (special pool)** | ⚠ Detecta o UAF de base, não a confusão |
| **`!object` e `dt _OBJECT_TYPE`** | ⚠ O tipo declarado, e o `TypeInfo` |
| ⚠ **Observação de comportamento** | ⚠ **O que o código faz com o tipo errado** |

⚠ **A terceira é a que exige método:** você define **o que deveria acontecer** e prova que aconteceu outra coisa. ⚠ Não há relatório de bugcheck; há **demonstração de comportamento** — e é por isso que este módulo exige mais trabalho de escrita que os outros.

⚠ **A medição, então, tem a forma:**

```
   ⚠ PARA CADA CASO:
   1. o objeto de TIPO A deveria fazer X
   2. com o TIPO B no lugar, o que aconteceu foi Y
   3. ⚠ Y e' X? se nao, ha confusao
   4. N repeticoes   (⚠ a confusao pode ser estavel ou dependente de layout)
```

---

## 6.5 O que a confusão permite

⚠ **A tabela, e ela é o topo da hierarquia do curso:**

| O que se confunde | ⚠ Primitiva |
|---|---|
| Dois tipos de **dado** | ⚠ Leitura com semântica errada |
| Tipo **com ponteiro** no offset lido | ⚠ ⚠ Leitura/escrita controlada |
| `TypeInfo` compartilhado | ⚠ ⚠ **Bypass de validação de acesso** |
| `OBJECT_HEADER.Type` corrompido | ⚠ ⚠ ⚠ **Operações do tipo novo** |
| Objeto com **ponteiro de função** | ⚠ ⚠ ⚠ **Controle de fluxo** |

⚠ **A terceira linha é a mais específica deste curso, e a mais subestimada:** confusão de tipo que produz **bypass de autorização** não é corrupção — é **permissão errada**. ⚠ É a mesma classe do módulo 7 do curso de Linux Internals (semântica de permissão), e a razão de a seção 6.2-C existir.

⚠ **E a razão de este módulo vir **depois** dos módulos 3, 4 e 5:** a confusão de tipo não produz corrupção por si. ⚠ Ela **aproveita** uma corrupção, um UAF ou uma corrida — e é o passo que transforma essas classes em **primitiva planejada**.

---

## 6.6 O relatório da confusão

⚠ **O formato, e ele tem uma seção que os outros não têm:**

```
ACHADO — CONFUSAO DE TIPO
──────────────────────────────────────────────────────────
CAUSA:      tipo_A | header | TypeInfo compartilhado | union
Local:      ⚠ a LINHA que trata o ponteiro, e a que o criou
                    │
⚡ SEM CORRUPCAO?  sim | nao   ← ⚠ a secao exclusiva
                    │
O QUE DEVERIA:  ...
O QUE ACONTECE: ...
                    │
PRIMITIVA:  ...
TAXA:       X / N  (⚠ a confusao pode ser estavel)
──────────────────────────────────────────────────────────
```

⚠ **A linha `SEM CORRUPÇÃO?` é o que distingue este achado dos anteriores.** ⚠ Se a resposta é **sim**, não há bugcheck para apresentar — o achado é uma **demonstração de comportamento**. ⚠ E é por isso que ele precisa de mais texto: sem o relatório dizendo *o que deveria acontecer*, o outro lado não vê o bug.

⚠ **É a mesma lição do módulo 10 do curso de Web Apps:** a falha que não produz erro é a que exige o relatório mais cuidadoso.

---

## Laboratório 6 — Provocar e observar

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **Snapshot. `Driver Verifier` ligado.**

```c
// drv_tipo.c — confusao de tipo por union, PROPOSITAL
#include <ntddk.h>

#define TAG_A 'ApoT'
#define TAG_B 'BpoT'
#define IOCTL_CRIA_A  CTL_CODE(0x8000, 0x840, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_CRIA_B  CTL_CODE(0x8000, 0x841, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_SOBRESC CTL_CODE(0x8000, 0x842, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_INTERPR CTL_CODE(0x8000, 0x843, METHOD_BUFFERED, FILE_ANY_ACCESS)

// ⚠ DUAS estruturas, MESMO tamanho, layouts diferentes
typedef struct { ULONG valor; ULONG tamanho; PVOID dados; } TIPO_A;
typedef struct { ULONG controle; PVOID ponteiro; ULONG id; } TIPO_B;

static PVOID g_obj = NULL;
static ULONG g_tipo = 0;

NTSTATUS DrvCreate(PDEVICE_OBJECT d, PIRP irp) {
    irp->IoStatus.Status = STATUS_SUCCESS; irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT); return STATUS_SUCCESS;
}

static VOID deref_PONTEIRO(TIPO_B *b) {
    // ⚠ o que o codigo faz com o que ele ACHA que e' um ponteiro
    DbgPrint("[m06] como TIPO_B: controle=0x%X ponteiro=%p\n",
             b->controle, b->ponteiro);
}

NTSTATUS DrvIoctl(PDEVICE_OBJECT d, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    NTSTATUS st = STATUS_SUCCESS;
    ULONG code = s->Parameters.DeviceIoControl.IoControlCode;

    if (code == IOCTL_CRIA_A) {
        if (g_obj) { ExFreePool(g_obj); g_obj = NULL; }
        g_obj = ExAllocatePool2(POOL_FLAG_NON_PAGED, sizeof(TIPO_A), TAG_A);
        if (g_obj) {
            ((TIPO_A *)g_obj)->valor   = 0x1111;
            ((TIPO_A *)g_obj)->tamanho = 0x40;
            ((TIPO_A *)g_obj)->dados   = NULL;
            g_tipo = 1;
            DbgPrint("[m06] TIPO_A em %p (sizeof=%zu)\n", g_obj, sizeof(TIPO_A));
        }

    } else if (code == IOCTL_CRIA_B) {
        // ⚠ libera o A e aloca um B no MESMO lugar
        if (g_obj) { ExFreePool(g_obj); g_obj = NULL; }
        g_obj = ExAllocatePool2(POOL_FLAG_NON_PAGED, sizeof(TIPO_B), TAG_B);
        if (g_obj) {
            // ⚠ controle e' escolhido pelo USERSPACE
            ULONG inLen = s->Parameters.DeviceIoControl.InputBufferLength;
            ULONG ctl = (inLen >= sizeof(ULONG))
                      ? *(ULONG *)irp->AssociatedIrp.SystemBuffer : 0x2222;
            ((TIPO_B *)g_obj)->controle  = ctl;
            ((TIPO_B *)g_obj)->ponteiro  = (PVOID)(ULONG_PTR)0xDEADBEEF;
            ((TIPO_B *)g_obj)->id        = 0x3333;
            g_tipo = 2;
            DbgPrint("[m06] TIPO_B em %p controle=0x%X\n", g_obj, ctl);
        }

    } else if (code == IOCTL_INTERPR) {
        // ⚠ VULNERAVEL: interpreta como TIPO_A mesmo quando e' TIPO_B
        if (g_obj) {
            TIPO_A *a = (TIPO_A *)g_obj;
            DbgPrint("[m06] ⚠ interpretado como A: valor=0x%X tamanho=0x%X dados=%p\n",
                     a->valor, a->tamanho, a->dados);
            // ⚠ aqui o "ponteiro" do B e lido como "tamanho" do A
            //   e o campo "dados" do A e' lido do offset do "id" do B
            deref_PONTEIRO((TIPO_B *)g_obj);
        }
    } else st = STATUS_INVALID_DEVICE_REQUEST;

    if (g_obj && code != IOCTL_CRIA_A && code != IOCTL_CRIA_B) { /* mantem */ }
fim:
    irp->IoStatus.Status = st; irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT);
    UNREFERENCED_PARAMETER(fim); UNREFERENCED_PARAMETER(d);
    return st;
}

NTSTATUS DriverEntry(PDRIVER_OBJECT drv, PUNICODE_STRING reg) {
    UNICODE_STRING nome, sym; PDEVICE_OBJECT dev;
    RtlInitUnicodeString(&nome, L"\\Device\\M06Drv");
    RtlInitUnicodeString(&sym,  L"\\DosDevices\\M06Drv");
    if (!NT_SUCCESS(IoCreateDevice(drv, 0, &nome, FILE_DEVICE_UNKNOWN,
                                   FILE_DEVICE_SECURE_OPEN, FALSE, &dev)))
        return STATUS_UNSUCCESSFUL;
    IoCreateSymbolicLink(&sym, &nome);
    drv->MajorFunction[IRP_MJ_CREATE]         = DrvCreate;
    drv->MajorFunction[IRP_MJ_DEVICE_CONTROL] = DrvIoctl;
    return STATUS_SUCCESS;
}
```

```c
// observar.c
#include <windows.h>
#include <stdio.h>
#define IOCTL_CRIA_A  CTL_CODE(0x8000, 0x840, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_CRIA_B  CTL_CODE(0x8000, 0x841, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_INTERPR CTL_CODE(0x8000, 0x843, METHOD_BUFFERED, FILE_ANY_ACCESS)

int main(void) {
    HANDLE h = CreateFileW(L"\\\\.\\M06Drv", GENERIC_READ|GENERIC_WRITE,
                           0, NULL, OPEN_EXISTING, 0, NULL);
    if (h == INVALID_HANDLE_VALUE) { printf("CreateFile: %lu\n", GetLastError()); return 1; }
    DWORD ret; ULONG ctl;

    printf("── 1. cria TIPO_A e interpreta (deve sair coerente)\n");
    DeviceIoControl(h, IOCTL_CRIA_A, NULL, 0, NULL, 0, &ret, NULL);
    DeviceIoControl(h, IOCTL_INTERPR, NULL, 0, NULL, 0, &ret, NULL);

    printf("\n── 2. cria TIPO_B no MESMO lugar e interpreta como A\n");
    ctl = 0x41414141;                       // ⚠ escolhido por NOS
    DeviceIoControl(h, IOCTL_CRIA_B, &ctl, sizeof(ctl), NULL, 0, &ret, NULL);
    DeviceIoControl(h, IOCTL_INTERPR, NULL, 0, NULL, 0, &ret, NULL);
    // ⚠ "tamanho" do A agora e' o PONTEIRO do B (0xDEADBEEF)

    CloseHandle(h);
    printf("\n⚠ compare as duas saidas do DbgPrint\n");
    return 0;
}
```

```powershell
sc create M06Drv type= kernel binPath= C:\lab\m06\M06Drv.sys
verifier /standard /driver M06Drv.sys
sc start M06Drv
observar.exe
# ⚠ leia o DbgPrint das duas fases (DebugView ou WinDbg)
```

```
# ⚠ No WinDbg: o tipo declarado, e o TypeInfo
kd> !object \ObjectTypes | Select-String "M06"
kd> dt nt!_OBJECT_TYPE <ENDERECO> Name TypeInfo
dt nt!_OBJECT_TYPE_INITIALIZER -a
```

**O que observar:** na segunda fase, o `DbgPrint` mostra que o campo `tamanho` do `TIPO_A` contém **`0xDEADBEEF`** — que era o **ponteiro** do `TIPO_B`. ⚠ Nada foi sobrescrito: o **tipo** mudou. E **não há bugcheck** — o kernel não reclama.

**Exercício 1:** compare as duas saídas do `DbgPrint` e escreva, **offset por offset**, o que o código leu e o que aquilo realmente era. ⚠ É a tabela que prova a confusão.

**Exercício 2:** rode o mesmo com o `Driver Verifier` ligado. ⚠ Houve relatório? Explique, em duas linhas, por que **special pool não detecta confusão de tipo** — ele detecta corrupção, não semântica.

**Exercício 3 (o que vale):** preencha o **formato do 6.6** para este caso, com a linha `SEM CORRUPÇÃO?` respondida. ⚠ Depois escreva, em um parágrafo, **o que deveria acontecer** e **o que aconteceu** — porque, sem isso, não há achado demonstrável. É o exercício de redação que este módulo exige.

---

## Resumo

- ⚠ **O tipo decide o que os bytes SIGNIFICAM** — trocar o tipo muda a interpretação sem sobrescrever nada.
- ⚠ **Quatro formas**: reocupação com tipo diferente, `OBJECT_HEADER` corrompido, **`TypeInfo` compartilhado** e confusão por `union`.
- ⚠ **A terceira é a específica do Windows** e produz **bypass de autorização**, não corrupção.
- ⚠ **Dois tipos do mesmo driver com o MESMO `TypeInfo`** é o sinal — e a comparação no WinDbg é mecânica.
- ⚠ **A confusão frequentemente NÃO dá bugcheck** — o achado é demonstração de comportamento.
- ⚠ **A confusão aproveita** uma corrupção, um UAF ou uma corrida — é o passo que vira primitiva planejada.
- ⚠ **A linha `SEM CORRUPÇÃO?` do relatório** obriga a escrever *o que deveria acontecer* — sem isso não há achado.

---

## O que o próximo módulo entrega

Você domina as classes de bug do kernel do Windows. O módulo 7 muda de assunto: **`BYOVD`** — o driver assinado e vulnerável, o que a assinatura **não** garante, e por que ele é o caminho quando `PPL` recusa até `SYSTEM`.
