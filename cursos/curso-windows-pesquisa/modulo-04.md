# Módulo 4 — UAF de Objeto: O `refcount`, o Tipo, e a Janela

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 4 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 a 3
**Próximo:** Módulo 5 — Corrida no kernel

---

## O que este módulo entrega

Ao final, você vai saber **encontrar, medir e avaliar UAF de objeto** — a classe mais valiosa do curso. Você vai entender por que ela vale mais que a corrupção do módulo 3 (o tipo é conhecido), e vai aplicar ao Windows o raciocínio de refcount do curso de Linux Internals.

---

## 4.1 Por que o objeto vale mais que o bloco

⚠ **A comparação direta, e ela explica a ordem dos módulos:**

| Corrupção de pool (módulo 3) | ⚠ UAF de objeto (este) |
|---|---|
| O vizinho é **desconhecido** | ⚠ O tipo é **conhecido** |
| O offset é incerto | ⚠ O layout está documentado **no símbolo** |
| ⚠ A primitiva depende de sorte | ⚠ ⚠ **A primitiva é planejada** |
| Precisa de spray cego | ⚠ **Aloca o objeto certo** |

⚠ **A frase que resume:** em pool cru, você torce para o vizinho ser útil. ⚠ Em objeto, você **sabe** o que vai reocupar o bloco — porque a **cache de tipo** garante que objetos do mesmo tipo têm o mesmo layout.

⚠ **E é a ligação com o módulo 5 do Windows Internals:** as caches de tipo (`ObjectTypes`, `filp` equivalente, pool com tag) agrupam **objetos do mesmo tipo**. ⚠ Um objeto liberado volta para a lista da cache, e **o próximo do mesmo tipo** ocupa aquele endereço.

---

## 4.2 O ciclo de vida, no Windows

⚠ **O objeto morre quando `PointerCount` chega a zero** — e o módulo 3 do Windows Internals apresentou a estrutura. Aqui, o que importa é **quem decrementa**:

```c
// ⚠ As funcoes que voce vai ver em todo CVE de driver
ObReferenceObject(o)      / ObDereferenceObject(o)     // PointerCount
ObReferenceObjectByHandle / ObDereferenceObject        // idem
ObOpenObjectByPointer     / ObCloseHandle              // HandleCount
IoGetDeviceObjectPointer  / ObDereferenceObject        // ⚠ par
```

⚠ **Os três padrões de bug, e eles são os mesmos do Linux:**

| Padrão | ⚠ O que acontece |
|---|---|
| `ObDereferenceObject` **a mais** | ⚠ Objeto liberado em uso — **UAF** |
| `ObReferenceObject` **a menos** | Objeto nunca liberado — vazamento |
| ⚠ **Referência não pega antes de uso assíncrono** | ⚠ ⚠ **UAF** — o padrão dominante |

⚠ **O terceiro é o que mais aparece, e a razão é arquitetural:** o driver guarda um ponteiro em uma estrutura, e usa **depois** — em outro contexto, em uma thread de trabalho, em um `DPC`. ⚠ Entre guardar e usar, o outro lado **fechou o handle**, e o objeto morreu.

⚠ **O paralelo com o módulo 4 do curso de Linux Internals é exato:** lá era `fput` a mais ou a menos; aqui é `ObDereferenceObject`. ⚠ **A classe é a mesma, e a disciplina de medição também.**

---

## 4.3 Onde o UAF aparece

⚠ **As quatro formas, e cada uma tem um lugar típico:**

### A — Caminho de erro

```c
// ⚠ VULNERAVEL — o caminho de erro libera duas vezes, ou nao libera
NTSTATUS DrvAlgumaCoisa(PDEVICE_OBJECT dev) {
    POBJ o = Obter();
    if (!o) return STATUS_UNSUCCESSFUL;

    if (falhou(etapa1)) {
        ObDereferenceObject(o);
        return STATUS_UNSUCCESSFUL;      // ok
    }
    if (falhou(etapa2)) {
        // ⚠ esqueceu o ObDereferenceObject(o)  -> vazamento
        return STATUS_UNSUCCESSFUL;
    }
    ObDereferenceObject(o);
    return STATUS_SUCCESS;
}
```

⚠ **É o padrão dominante em CVE de kernel — e vale para os dois sistemas.** ⚠ No Linux, é `put_*` esquecido no `goto err`; aqui, é `ObDereferenceObject` esquecido no `if`. ⚠ **O mesmo bug, com outro nome.**

### B — Uso assíncrono sem referência

⚠ **O padrão mais explorável, e o que este módulo persegue:**

```
   thread do IOCTL              worker / DPC
   ───────────────              ────────────

   1. pega ponteiro p
   2. guarda em ctx->ptr
   3. enfileira trabalho  ─────► 
                                4. ⚠ usa ctx->ptr   <- objeto pode ter morrido
       (⚠ entre 3 e 4, o handle foi fechado
        e PointerCount chegou a zero)
```

⚠ **A correção é uma linha — e é a que falta em todo CVE desta classe:** pegar a **referência** antes de guardar o ponteiro. ⚠ `ObReferenceObject` no passo 2, `ObDereferenceObject` no fim do worker.

### C — Cancelamento e corrida

⚠ **O cancelamento de IRP tem janela própria**, e é a base do módulo 5. ⚠ `IoCancelIrp` concorrente com a conclusão produz a mesma classe.

### D — Confusão de tipo por liberação

⚠ **Não é UAF — é o irmão dele**, e é a ponte para o módulo 6: um objeto do **tipo A** é liberado, e um do **tipo B** ocupa o lugar, e o código continua tratando como A.

---

## 4.4 Encontrar o UAF

⚠ **O método, e ele **não executa nada**:**

```
   1. ENCONTRE    ->  onde o driver pega ponteiro de objeto
   2. ⚠ PAREIE     ->  cada ObReference tem o ObDereference?
   3. SIGA       ->  o ponteiro e' guardado? sobrevive a funcao?
   4. ⚠ PERGUNTE   ->  alguem pode fechar o handle nesse intervalo?
   5. MARQUE     ->  candidato, com a janela estimada
```

⚠ **O passo 2 é mecânico, e é o que rende:** conte as referências e as dereferências em cada caminho. ⚠ Ouvir "tem um vazamento aqui" com o par na mão é o que muda a conversa.

```powershell
# 1. As funcoes de referencia, no binario
dumpbin /imports meudrv.sys | Select-String 'ObReference|ObDereference|ObOpenObject|IoGetDevice'

# 2. ⚠ No WinDbg, sobre o driver carregado, siga a funcao
#    kd> u meudrv!DrvAlgumaCoisa L120
#    ⚠ conte os "call ObReferenceObject" e "call ObDereferenceObject"
#    ⚠ a diferenca e' o achado
```

⚠ **O passo 4 é o que exige pensar no **tempo**, não no código.** ⚠ A janela existe se **outra thread** pode agir entre guardar e usar. ⚠ Sem isso, o padrão não é bug — é só código feio.

---

## 4.5 Medir a janela

⚠ **O instrumento é o `Driver Verifier`, e ele tem uma flag própria para isso:**

```powershell
# ⚠ As flags que importam para UAF de objeto
verifier /standard /driver meudrv.sys
#   - special pool: ⚠ o objeto liberado fica em pagina propria
#     -> o uso depois da liberacao ATINGE pagina invalida
#   - pool tracking: registra quem alocou e quem liberou
```

⚠ **E a leitura do relatório, com as três perguntas de sempre:**

```
   BUGCHECK:        qual classe (use-after-free)
   ⚠ "Freed by":     a PILHA da liberacao — quem soltou o objeto
   ⚠ "Allocated by": a PILHA da alocacao — QUAL TIPO e' o objeto
```

⚠ **A segunda pilha é a que planeja a reocupação.** ⚠ Se o objeto é um `FILE_OBJECT`, você sabe onde alocar; se é uma estrutura do próprio driver, você sabe o layout.

⚠ **E a janela precisa ser **medida**, não estimada:**

```c
// deleta_em_paralelo.c — o teste de janela
// ⚠ 1. thread A: abre o handle e dispara o IOCTL que guarda o ponteiro
// ⚠ 2. thread B: fecha o handle IMEDIATAMENTE
// ⚠ 3. conte quantas vezes o bugcheck aparece
for (int i = 0; i < N; i++) {
    HANDLE h = CreateFileW(L"\\\\.\\Meudrv", ...);
    // dispara em thread
    DeviceIoControl(h, IOCTL_GUARDA_PONTEIRO, ...);
    // ⚠ fecha imediatamente — a corrida
    CloseHandle(h);
}
```

| Taxa em N | ⚠ Leitura |
|---|---|
| 100/100 | ✅ Determinístico — o driver não pega referência |
| 10–99 | ⚠ Janela real — ajuste o timing |
| 1–9 | ⚠ Estreita — documente, e considere o módulo 5 |
| 0 | ⚠ Reveja: a janela é **outra**, ou não existe |

⚠ **A última linha é importante:** zero acertos não significa "não é bug" — significa que **a sua hipótese sobre a janela está errada**. ⚠ A corrida pode depender de outro evento, de outro caminho, ou de saturação.

---

## 4.6 O que o UAF permite

⚠ **A tabela, e ela é a mesma do módulo 3 elevada pelo tipo conhecido:**

| O objeto é | ⚠ O que se ganha ao reocupar |
|---|---|
| `FILE_OBJECT` | ⚠ ⚠ Controle do campo de acesso |
| Estrutura do driver | ⚠ ⚠ Controle do que o driver lê |
| Com **ponteiro de função** | ⚠ ⚠ ⚠ Controle de fluxo |
| `_TOKEN` | ⚠ ⚠ ⚠ Root direto (módulo 9 do Windows Internals) |
| Com contador | ⚠ Lógica errada, e às vezes overflow |

⚠ **A vantagem sobre o módulo 3 é o **layout conhecido**:**
o código que usa o ponteiro obsoleto lê **campos em offsets fixos** — e você sabe quais. ⚠ Reocupar com um objeto de **nome controlado** (módulo 3, seção 2) permite escolher **exatamente** os bytes que caem naqueles offsets.

⚠ **E é aqui que a fronteira do curso fica visível:** identificar a primitiva é o trabalho deste curso. ⚠ **Montar a cadeia até `SYSTEM` é o curso de Exploit Development**, e a política de reporte é reportar a **primitiva**.

---

## Laboratório 4 — Medir a janela

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **`Driver Verifier` ligado. Snapshot. Este lab QUEBRA a VM.**

```c
// drv_uaf.c — driver de lab com UAF PROPOSITAL por referencia faltante
#include <ntddk.h>

#define TAG_OBJ 'jboU'
#define IOCTL_GUARDA   CTL_CODE(0x8000, 0x820, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_USA      CTL_CODE(0x8000, 0x821, METHOD_BUFFERED, FILE_ANY_ACCESS)

typedef struct { ULONG id; PVOID ptr; } CTX;
static CTX g_ctx = {0};

typedef struct { ULONG valor; } MEU_OBJ;

NTSTATUS DrvCreate(PDEVICE_OBJECT d, PIRP irp) {
    irp->IoStatus.Status = STATUS_SUCCESS; irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT); return STATUS_SUCCESS;
}

NTSTATUS DrvIoctl(PDEVICE_OBJECT d, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    NTSTATUS st = STATUS_SUCCESS;
    ULONG code = s->Parameters.DeviceIoControl.IoControlCode;

    if (code == IOCTL_GUARDA) {
        // ⚠ VULNERAVEL: guarda o ponteiro SEM pegar referencia
        PVOID o = ExAllocatePool2(POOL_FLAG_NON_PAGED, sizeof(MEU_OBJ), TAG_OBJ);
        if (!o) { st = STATUS_INSUFFICIENT_RESOURCES; goto fim; }
        ((MEU_OBJ *)o)->valor = 0xC0DE;
        g_ctx.ptr = o;

        // ⚠ e LIBERA na hora — o ponteiro fica obsoleto
        ExFreePool(o);
        DbgPrint("[m04] ponteiro obsoleto guardado: %p\n", o);

    } else if (code == IOCTL_USA) {
        // ⚠ usa o ponteiro obsoleto — o UAF propriamente dito
        if (g_ctx.ptr) {
            MEU_OBJ *o = (MEU_OBJ *)g_ctx.ptr;
            DbgPrint("[m04] ⚠ USE-AFTER-FREE: leu valor=0x%X de %p\n",
                     o->valor, o);
        }
    } else {
        st = STATUS_INVALID_DEVICE_REQUEST;
    }
fim:
    irp->IoStatus.Status = st; irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT); return st;
}

NTSTATUS DriverEntry(PDRIVER_OBJECT drv, PUNICODE_STRING reg) {
    UNICODE_STRING nome, sym; PDEVICE_OBJECT dev;
    RtlInitUnicodeString(&nome, L"\\Device\\M04Drv");
    RtlInitUnicodeString(&sym,  L"\\DosDevices\\M04Drv");
    if (!NT_SUCCESS(IoCreateDevice(drv, 0, &nome, FILE_DEVICE_UNKNOWN,
                                   FILE_DEVICE_SECURE_OPEN, FALSE, &dev)))
        return STATUS_UNSUCCESSFUL;
    IoCreateSymbolicLink(&sym, &nome);
    drv->MajorFunction[IRP_MJ_CREATE]         = DrvCreate;
    drv->MajorFunction[IRP_MJ_DEVICE_CONTROL] = DrvIoctl;
    return STATUS_SUCCESS;
}
```

```powershell
sc create M04Drv type= kernel binPath= C:\lab\m04\M04Drv.sys
verifier /standard /driver M04Drv.sys
# ⚠ reinicie
sc start M04Drv
```

```c
// janela.c — mede a janela com N repeticoes
#include <windows.h>
#include <stdio.h>
#define IOCTL_GUARDA CTL_CODE(0x8000, 0x820, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_USA    CTL_CODE(0x8000, 0x821, METHOD_BUFFERED, FILE_ANY_ACCESS)

int main(int argc, char **argv) {
    int N = argc > 1 ? atoi(argv[1]) : 50;
    int ate = argc > 2 ? atoi(argv[2]) : 0;   // ⚠ delay em us antes do "usa"

    HANDLE h = CreateFileW(L"\\\\.\\M04Drv", GENERIC_READ|GENERIC_WRITE,
                           0, NULL, OPEN_EXISTING, 0, NULL);
    if (h == INVALID_HANDLE_VALUE) { printf("CreateFile: %lu\n", GetLastError()); return 1; }

    DWORD ret;
    for (int i = 0; i < N; i++) {
        DeviceIoControl(h, IOCTL_GUARDA, NULL, 0, NULL, 0, &ret, NULL);
        if (ate) Sleep(ate);
        // ⚠ neste driver o UAF e' certo, mas o TESTE aqui mede o padrao:
        //    em um driver real, o "usa" acontece em outro thread/DPC
        DeviceIoControl(h, IOCTL_USA, NULL, 0, NULL, 0, &ret, NULL);
        printf(".");
    }
    printf("\n%d repeticoes\n", N);
    CloseHandle(h);
    return 0;
}
```

```
# Execute e leia
janela.exe 50
#    kd> !analyze -v
#    ⚠ leia as TRES secoes: a classe, "Freed by", "Allocated by"
#    kd> dt nt!_POOL_HEADER <ENDERECO>
#    kd> !verifier 3 M04Drv
```

**O que observar:** no relatório, a pilha `Freed by` aponta para o **seu** `ExFreePool` no `IOCTL_GUARDA` — e a `Allocated by`, para o `ExAllocatePool2` **logo acima**. ⚠ O par está na mesma função, e o bug é visível na leitura: **guardou, liberou, e não zerou.** É o módulo 3 do curso de Linux Internals — `kfree` sem `ptr = NULL` — com outro nome.

**Exercício 1:** corrija o driver com **duas** coisas: pegar referência com `ObReferenceObject`, e zerar o ponteiro após liberar. ⚠ Rode de novo e mostre que o bugcheck **desaparece**. Escreva as duas linhas que bastaram.

**Exercício 2:** no relatório do `!analyze -v`, identifique **as três** seções (classe, `Freed by`, `Allocated by`) e escreva, para cada uma, o que ela informa. ⚠ Depois responda: qual delas planeja o **spray** de reocupação?

**Exercício 3 (o que vale):** implemente um **`pool spray`** que reocupa o bloco liberado com um objeto de **nome controlado**, e prove com `!pool` que o endereço reutilizado é o mesmo. ⚠ Escreva a **tabela do 4.6** para o seu caso: o objeto é do tipo X, o layout tem tais campos, e a primitiva possível é Y. É o formato de achado do curso.

---

## Resumo

- ⚠ **UAF de objeto vale mais que corrupção de pool** porque o **tipo é conhecido** — o layout está no símbolo.
- ⚠ **O objeto morre quando `PointerCount` chega a zero** — e o par é `ObReferenceObject` / `ObDereferenceObject`.
- ⚠ **O padrão dominante é a referência não pega antes do uso assíncrono**, não o excesso de dereferência.
- ⚠ **É o mesmo bug do curso de Linux Internals**, com outro nome: `ObDereferenceObject` esquecido no `if`.
- **Os quatro lugares**: caminho de erro, uso assíncrono, cancelamento e confusão por liberação.
- ⚠ **O relatório aponta três coisas**: a classe, **quem liberou** e **em qual tipo foi alocado** — a última planeja o spray.
- ⚠ **Taxa zero não significa "não é bug"** — significa que a sua hipótese sobre **a janela** está errada.
- ⚠ **Identificar a primitiva é o trabalho deste curso**; a cadeia até `SYSTEM` é o `Exploit Development`.

---

## O que o próximo módulo entrega

Você mede a janela de um UAF determinístico. O módulo 5 trata da **corrida de verdade**: cancelamento, `DPC`, e como **alargar a janela** para tornar medível o que hoje é sorte.
