# Módulo 5 — Corrida no Kernel: Detectar a Janela e Reproduzir de Forma Confiável

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 5 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 6 — Confusão de tipo em objeto

---

## O que este módulo entrega

Ao final, você vai saber **transformar uma corrida de sorte em resultado confiável**. Uma corrida que reproduz 1% não é achado — é rumor. Você vai aprender a **alargar a janela**, controlar o escalonador e **medir a taxa**, com as técnicas do curso de Linux Internals adaptadas ao modelo de concorrência do Windows.

---

## 5.1 Onde a corrida vive no Windows

⚠ **Diferente do Linux, o Windows tem contextos de execução com regras próprias:**

| Contexto | ⚠ Pode bloquear? | Onde a corrida aparece |
|---|---|---|
| **Thread de `IRP`** (`PASSIVE_LEVEL`) | ✅ Sim | Caminho normal de `IOCTL` |
| **Worker de `IoQueueWorkItem`** | ✅ Sim | ⚠ Uso adiado — módulo 4 |
| **`DPC`** (`DISPATCH_LEVEL`) | ⚠ **Não** | ⚠ Corrida com conclusão de IRP |
| **`Timer`** | ⚠ Não | ⚠ Estado compartilhado |
| **`APC`** | Contexto da thread | ⚠ Executa em ponto arbitrário |
| ⚠ **`IoCancelIrp`** | — | ⚠ ⚠ **A corrida clássica** |

⚠ **A linha do `DPC` é a que muda tudo:** em `DISPATCH_LEVEL` o driver **não pode** esperar, não pode dormir e não pode pegar a maior parte dos locks. ⚠ Um driver que tenta sincronizar corretamente e não consegue tende a **desistir** — e a desistência é o bug.

⚠ **E a razão de o cancelamento de `IRP` ser a corrida clássica:** cancelar enquanto concluir exige coordenar dois contextos, e a janela é **entre o cancelamento marcar o IRP e a conclusão liberar o contexto**.

---

## 5.2 Os quatro padrões de corrida

### A — `TOCTOU` de estado

⚠ **Ler, decidir, agir — sem que o intervalo seja atômico.** É o mesmo padrão do módulo 10 do curso de Web Apps:

```c
// ⚠ VULNERAVEL — ler, decidir, usar
if (ctx->tamanho <= MAX) {              // 1. le e decide
    // ⚠ outra thread muda ctx->tamanho aqui
    RtlCopyMemory(dest, ctx->dados, ctx->tamanho);   // 2. usa
}
```

⚠ **A correção é a mesma de lá: pôr a condição **dentro** da operação, ou travar o intervalo.** ⚠ Um lock cobre as duas linhas; um `if` não cobre nada.

### B — `refcount` sob corrida

⚠ **Duas threads decrementam o mesmo contador.** ⚠ Se o decremento e a checagem de zero **não** são atômicos, o objeto morre duas vezes — ou morre cedo.

```c
// ⚠ VULNERAVEL
if (o->PointerCount == 1) {        // 1. decide que e' o ultimo
    // ⚠ a outra thread decrementa aqui
    ExFreePool(o);                  // 2. libera — e o outro tambem libera
}
```

⚠ **A correção é `InterlockedDecrement`** e a checagem do valor **retornado** — não do campo lido antes.

### C — Cancelamento de `IRP`

⚠ **A mais específica do Windows, e a que produz UAF determinístico:**

```
   thread A (cancelamento)        thread B (conclusao)
   ───────────────────────        ────────────────────

   1. IoCancelIrp(irp)            3. IoCompleteRequest(irp)
      ⚠ marca como cancelado          ⚠ libera o contexto
        │                                  │
        └── 2. ⚠ entre 1 e 3, o contexto 
               pode ser tocado dos dois lados
```

⚠ **A mitigação que o Windows oferece é o `CancelRoutine` e o `CancelSafe` do `WDF`.** ⚠ Um driver que registra `CancelRoutine` corretamente e usa a lista de IRPs pendentes **sobrevive**; um que não registra tem a corrida.

### D — Estado global sem lock

⚠ **O mais simples de achar e o mais comum em driver de fabricante:** uma variável global que duas threads de `IOCTL` escrevem. ⚠ `static PVOID buffer;` sem lock é **a** definição do problema.

---

## 5.3 Alargar a janela

⚠ **A parte prática do módulo. Sem isso, a taxa é baixa e o achado não se sustenta:**

| Técnica | ⚠ O que faz |
|---|---|
| **Muitas threads** | Aumenta a chance de intercalar no ponto certo |
| ⚠ **`SetThreadAffinityMask`** | Prende as threads ao mesmo núcleo |
| **Prioridade alta** | ⚠ Aumenta a preempção no meio |
| ⚠ **Operação custosa em paralelo** | Faz o alvo demorar **onde interessa** |
| **Repetir N vezes** | ⚠ Não alarga a janela — mede a taxa |
| ⚠ **`Sleep` invertido** | Fecha o handle **durante** o uso, não depois |

⚠ **A quinta linha merece destaque, porque é onde as pessoas se enganam:** repetir mil vezes uma janela de 1% dá ~10 acertos — e **não muda o achado**. ⚠ O que muda é **alargar a janela**, e as quatro primeiras linhas fazem isso.

⚠ **A sexta é a que se aplica ao módulo 4:** no lab, o UAF foi determinístico porque o `ExFreePool` estava **na mesma função**. ⚠ Numa corrida real, o `CloseHandle` acontece **em outra thread**, e o timing é todo o problema.

```c
// alargar.c — as tecnicas, em codigo
#include <windows.h>
#include <process.h>

volatile LONG pronta = 0;

unsigned __stdcall alvo(void *p) {
    HANDLE h = *(HANDLE *)p;
    DWORD ret;
    // ⚠ operacao que demora: pressiona o driver no ponto de uso
    DeviceIoControl(h, IOCTL_USA_DEMAIS, NULL, 0, NULL, 0, &ret, NULL);
    return 0;
}

unsigned __stdcall fecha(void *p) {
    HANDLE h = *(HANDLE *)p;
    while (!pronta) Sleep(0);        // ⚠ espera o sinal
    CloseHandle(h);                  // ⚠ fecha DURANTE o uso
    return 0;
}

int main(void) {
    HANDLE h = CreateFileW(L"\\\\.\\Meudrv", GENERIC_READ|GENERIC_WRITE,
                           0, NULL, OPEN_EXISTING, 0, NULL);

    // ⚠ afinidade: forcar as duas no MESMO nucleo aumenta a intercalacao
    SetThreadAffinityMask(GetCurrentThread(), 1);

    HANDLE t1 = (HANDLE)_beginthreadex(NULL,0,alvo,&h,0,NULL);
    HANDLE t2 = (HANDLE)_beginthreadex(NULL,0,fecha,&h,0,NULL);

    Sleep(1);
    InterlockedExchange(&pronta, 1);   // ⚠ dispara o fechamento
    pronta = 1;

    WaitForSingleObject(t1, 5000);
    WaitForSingleObject(t2, 5000);
    return 0;
}
```

⚠ **A linha `SetThreadAffinityMask` é contraintuitiva e eficaz:** colocar as duas threads no **mesmo** núcleo **aumenta** a intercalação, porque força preempção entre elas. ⚠ Rodando em núcleos separados, elas simplesmente **não competem** pelo mesmo recurso de escalonamento.

---

## 5.4 Medir a taxa

⚠ **A disciplina é a do módulo 4 do curso de Linux Internals, com o instrumento do Windows:**

```powershell
# taxa.ps1 — roda N vezes e conta
param([int]$N = 200)
$hits = 0; $bugchecks = @()
1..$N | ForEach-Object {
    # ⚠ roda o trigger em um processo separado, com timeout
    $p = Start-Process .\trigger.exe -PassThru -WindowStyle Hidden
    $p | Wait-Process -Timeout 5 -ErrorAction SilentlyContinue
    # ⚠ leia o bugcheck
    $bc = (Get-WinEvent -FilterHashtable @{LogName='System'; Id=1001} `
                        -MaxEvents 1 -ErrorAction SilentlyContinue).Message
    if ($bc -match 'BUGCHECK|0x') { $hits++; $bugchecks += $bc.Substring(0,80) }
}
"hits: $hits / $N  ($([math]::Round(100*$hits/$N,1))%)"
$bugchecks | Group-Object | Sort-Object Count -Descending | Select-Object -First 5
```

| Taxa | ⚠ Leitura | Ação |
|---|---|---|
| **100%** | ✅ Determinístico | Reporte |
| **50–99%** | ⚠ Corrida real | Documente; já é reprodutível |
| **5–49%** | ⚠ Janela estreita | ⚠ **Alargue** (5.3) antes de reportar |
| **1–4%** | ⚠ Muito estreita | Documente a taxa **e** as técnicas |
| **0%** | ❌ | ⚠ **A hipótese está errada** — reveja onde a janela está |

⚠ **A última linha vale repetir:** zero acertos **não** significa "não é bug". ⚠ Significa que a corrida é **em outro lugar** — outro caminho de código, outro contexto, ou depende de saturação que você não reproduziu.

---

## 5.5 O relatório da corrida

⚠ **A corrida exige mais campos que os outros achados, porque a taxa é o achado:**

```
ACHADO — CORRIDA NO KERNEL
──────────────────────────────────────────────────────────
Classificacao:  A TOCTOU | B refcount | C cancel | D estado global
Local:          funcao, e as DUAS linhas que compoem o intervalo
                    │
Par de threads: ⚠ quem faz o que, e em que contexto (IRP/DPC/APC)
Tecnicas de alargamento aplicadas:
                    │
TAXA:           X / N   (⚠ sem delay / com delay / com afinidade)
VERIFIER:       flag usada (special pool, pool tracking)
                    │
PRIMITIVA:      o que o uso apos o intervalo permite
──────────────────────────────────────────────────────────
```

⚠ **A linha `Par de threads` é o que a corrida exige e os outros achados não:** não basta dizer *"há uma corrida"* — é preciso dizer **quem compite com quem**. ⚠ É o equivalente ao `Vitima` do curso de LLM: a linha que dá sentido ao resto.

⚠ **E a `TAXA` tem três números, não um:** sem delay, com delay e com afinidade. ⚠ A diferença entre eles **demonstra que você alargou a janela** — e não apenas que rodou mais vezes.

---

## 5.6 A linha do curso, outra vez

⚠ **A delimitação vale aqui de forma específica:**

| Este curso | ⚠ O que não está aqui |
|---|---|
| Detectar a janela | ⚠ Exploração com `kCFG` bypass |
| **Alargar** até ser medível | Cadeia completa até `SYSTEM` |
| Medir a taxa | Publicar trigger contra alvo de terceiro |
| Relatar com a primitiva | — |

⚠ **O alvo é o seu driver, com `Driver Verifier`, na sua VM.** ⚠ O lab deste módulo quebra a VM **várias vezes** — e é por isso que o snapshot é obrigatório, não recomendado.

---

## Laboratório 5 — Da sorte à medida

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **Snapshot limpo. `Driver Verifier` ligado. Este lab quebra a VM repetidamente.**

```c
// drv_race.c — driver com TOCTOU de estado PROPOSITAL
#include <ntddk.h>

#define TAG_BUF 'feRb'
#define IOCTL_SET  CTL_CODE(0x8000, 0x830, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_GET  CTL_CODE(0x8000, 0x831, METHOD_BUFFERED, FILE_ANY_ACCESS)

static struct {
    ULONG tamanho;        // ⚠ escrito sem lock
    PVOID dados;
} g = {0, NULL};

NTSTATUS DrvCreate(PDEVICE_OBJECT d, PIRP irp) {
    irp->IoStatus.Status = STATUS_SUCCESS; irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT); return STATUS_SUCCESS;
}

NTSTATUS DrvIoctl(PDEVICE_OBJECT d, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    NTSTATUS st = STATUS_SUCCESS;
    ULONG code = s->Parameters.DeviceIoControl.IoControlCode;

    if (code == IOCTL_SET) {
        ULONG inLen = s->Parameters.DeviceIoControl.InputBufferLength;
        if (inLen < sizeof(ULONG)) { st = STATUS_INVALID_PARAMETER; goto fim; }
        ULONG n = *(ULONG *)irp->AssociatedIrp.SystemBuffer;
        if (n > 0x1000) { st = STATUS_INVALID_PARAMETER; goto fim; }

        if (g.dados) { ExFreePool(g.dados); g.dados = NULL; }
        g.dados = ExAllocatePool2(POOL_FLAG_NON_PAGED, n, TAG_BUF);
        if (g.dados) {
            // ⚠ janela: tamanho e dados nao sao atualizados juntos
            g.tamanho = n;
            RtlFillMemory(g.dados, n, 0x42);
        }

    } else if (code == IOCTL_GET) {
        // ⚠ VULNERAVEL: valida tamanho, e USA depois
        if (g.dados && g.tamanho <= 0x1000) {
            // ⚠ outra thread troca g.dados entre o teste e o uso
            RtlFillMemory(g.dados, g.tamanho, 0x55);
            DbgPrint("[m05] usou %lu bytes em %p\n", g.tamanho, g.dados);
        }
    } else st = STATUS_INVALID_DEVICE_REQUEST;

fim:
    irp->IoStatus.Status = st; irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT); return st;
}

NTSTATUS DriverEntry(PDRIVER_OBJECT drv, PUNICODE_STRING reg) {
    UNICODE_STRING nome, sym; PDEVICE_OBJECT dev;
    RtlInitUnicodeString(&nome, L"\\Device\\M05Drv");
    RtlInitUnicodeString(&sym,  L"\\DosDevices\\M05Drv");
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
// corre.c — duas threads competindo, e os parametros de alargamento
#include <windows.h>
#include <process.h>
#include <stdio.h>

#define IOCTL_SET CTL_CODE(0x8000, 0x830, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_GET CTL_CODE(0x8000, 0x831, METHOD_BUFFERED, FILE_ANY_ACCESS)

static HANDLE g_h;
static volatile LONG g_parar = 0;
static int g_delay = 0;

unsigned __stdcall setter(void *) {
    DWORD ret; ULONG n;
    while (!g_parar) {
        n = (rand() % 2) ? 0x800 : 0x20;      // ⚠ tamanho muda
        DeviceIoControl(g_h, IOCTL_SET, &n, sizeof(n), NULL, 0, &ret, NULL);
        if (g_delay) Sleep(g_delay);
    }
    return 0;
}

unsigned __stdcall getter(void *) {
    DWORD ret;
    while (!g_parar) {
        DeviceIoControl(g_h, IOCTL_GET, NULL, 0, NULL, 0, &ret, NULL);
    }
    return 0;
}

int main(int argc, char **argv) {
    int segundos = argc > 1 ? atoi(argv[1]) : 10;
    g_delay      = argc > 2 ? atoi(argv[2]) : 0;
    int afinidade = argc > 3 ? atoi(argv[3]) : 1;

    g_h = CreateFileW(L"\\\\.\\M05Drv", GENERIC_READ|GENERIC_WRITE,
                      0, NULL, OPEN_EXISTING, 0, NULL);
    if (g_h == INVALID_HANDLE_VALUE) { printf("CreateFile: %lu\n", GetLastError()); return 1; }

    HANDLE ts[8];
    for (int i = 0; i < 4; i++) {
        ts[i] = (HANDLE)_beginthreadex(NULL,0,setter,NULL,0,NULL);
        ts[i+4] = (HANDLE)_beginthreadex(NULL,0,getter,NULL,0,NULL);
        // ⚠ afinidade: mesma CPU aumenta a intercalacao
        if (afinidade) {
            SetThreadAffinityMask(ts[i], 1);
            SetThreadAffinityMask(ts[i+4], 1);
        }
    }

    printf("rodando %ds (delay=%d, afinidade=%d)...\n", segundos, g_delay, afinidade);
    Sleep(segundos * 1000);
    InterlockedExchange(&g_parar, 1);
    for (int i = 0; i < 8; i++) WaitForSingleObject(ts[i], 3000);
    CloseHandle(g_h);
    printf("fim — ⚠ leia o bugcheck\n");
    return 0;
}
```

```powershell
sc create M05Drv type= kernel binPath= C:\lab\m05\M05Drv.sys
verifier /standard /driver M05Drv.sys
# ⚠ reinicie; snapshot ANTES de rodar

# ⚠ A MEDICAO: tres configuracoes, mesma duracao
corre.exe 20 0 0     # sem alargamento
corre.exe 20 0 1     # com afinidade
corre.exe 20 5 1     # com delay + afinidade — ⚠ o alargamento real

# ⚠ leia o bugcheck de cada rodada
```

```
kd> !analyze -v
kd> !verifier 3 M05Drv
kd> !pool <ENDERECO>
```

**O que observar:** as três execuções produzem **taxas diferentes** — e é essa diferença que é o achado. ⚠ Sem alargamento, pode não dar nada; com delay e afinidade, o bugcheck aparece. ⚠ É a demonstração de que você **controla a janela**, em vez de torcer.

**Exercício 1:** rode as **três** configurações e monte a tabela de taxa. ⚠ Escreva, em duas linhas, qual técnica alargou mais, e por quê.

**Exercício 2:** corrija o driver com **um lock** (`KSPIN_LOCK` ou `EX_PUSH_LOCK`) cobrindo o intervalo entre validar e usar. ⚠ Rode a configuração mais agressiva e mostre que **a taxa vai a zero**.

**Exercício 3 (o que vale):** preencha o **formato do 5.5** completo, com o par de threads, as técnicas aplicadas, as três taxas e a primitiva. ⚠ A linha `Local` precisa citar **as duas linhas** que compõem o intervalo — não a função. É o critério de causa-raiz do curso.

---

## Resumo

- ⚠ **O Windows tem contextos com regras próprias** — e o `DPC` **não pode bloquear**, o que empurra o driver para a dessincronização.
- **Os quatro padrões:** TOCTOU de estado, refcount sob corrida, cancelamento de `IRP` e estado global sem lock.
- ⚠ **O cancelamento de `IRP` é a corrida clássica**, e o `CancelRoutine` é a mitigação que o framework oferece.
- ⚠ **Repetir mais vezes mede a taxa; NÃO alarga a janela** — alargar é outra coisa.
- ⚠ **Afirmar as threads no MESMO núcleo aumenta a intercalação** — contraintuitivo e eficaz.
- ⚠ **Taxa zero significa hipótese errada**, não "não é bug".
- ⚠ **A taxa tem três números**, e a **diferença** entre eles é a prova de que você alargou.
- ⚠ **A linha `Par de threads`** é o que a corrida exige: quem compite com quem, e em que contexto.

---

## O que o próximo módulo entrega

Você domina corrupção, UAF e corrida. O módulo 6 trata do que transforma tudo isso em primitiva planejada: **confusão de tipo em objeto** — quando o `OBJECT_HEADER` ou o layout são usados como um tipo que não são.
