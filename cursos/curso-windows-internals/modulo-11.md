# Módulo 11 — Driver e `IOCTL`: O Contrato, o Método de Buffer, e a Validação

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 11 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 10
**Próximo:** Módulo 12 — `ETW`

---

## O que este módulo entrega

Ao final, você vai entender **como um driver expõe função ao userspace**, **o que cada método de buffer promete**, e **onde a validação falta**. É o módulo que fecha o curso e abre o próximo: o curso de Pesquisa em Windows começa exatamente aqui — na triagem de alvo e no contrato do `IOCTL`.

---

## 11.1 O driver como objeto e como serviço

⚠ **Um driver no Windows é duas coisas:**

| Face | O que é |
|---|---|
| **Objeto** | `\Device\<nome>` no namespace, com `SecurityDescriptor` |
| **Serviço** | ⚠ Entrada no registro `SYSTEM\...\Services\<nome>` |

⚠ **As duas faces definem quem alcança o driver:**

```
   Registro:        HKLM\SYSTEM\CurrentControlSet\Services\MeuDrv
                       └── ImagePath, Start, Type
                            │
                            ▼
   Objeto:          \Device\MeuDrv       ⚠ ACL decide quem abre
                       └── \GLOBAL??\MeuDrv  (symlink, opcional)
                            │
                            ▼
   Userspace:       CreateFile("\\\\.\\MeuDrv")  ──► HANDLE
                       │
                       ▼
                    DeviceIoControl(h, IOCTL_XXX, ...)   ⚠ A porta
```

⚠ **O `SecurityDescriptor` do objeto `\Device` é a primeira barreira.** Se ele permite acesso a `Everyone`, o driver está exposto — e é por isso que auditória de driver começa na ACL do dispositivo, não no código.

```powershell
# Os servicos e drivers do tipo kernel
Get-CimInstance Win32_SystemDriver | Select-Object Name, State, PathName, StartMode |
  Where-Object { $_.State -eq 'Running' } | Format-Table -AutoSize

# ⚠ E a ACL de um device, se voce tiver acesso ao objeto
#    (WinObj mostra o namespace \Device e o SD de cada um)
```

---

## 11.2 O `IOCTL`: um código, três informações

⚠ **O `IOCTL` é um número de 32 bits, e ele **codifica** o contrato:**

```c
// O macro que monta o codigo
#define CTL_CODE(DeviceType, Function, Method, Access) \
    ( ((DeviceType) << 16) | ((Access) << 14) | ((Function) << 2) | (Method) )

// Campos:
//   DeviceType  ⚠ 0x8000+ e' "custom" (para terceiros)
//   Access      ⚠ FILE_READ_ACCESS / FILE_WRITE_ACCESS / FILE_ANY_ACCESS
//   Function    ⚠ o numero da funcao do driver
//   Method      ⚠ ⚠ O METODO DE BUFFER — o campo de seguranca
```

⚠ **Os quatro métodos de buffer, e o que cada um implica:**

| Método | Como o buffer chega | ⚠ Quem valida o tamanho |
|---|---|---|
| **`METHOD_BUFFERED`** | ⚠ **Copiado** pelo gerenciador | O gerenciador, parcialmente — ⚠ **o driver ainda precisa checar** |
| **`METHOD_IN_DIRECT`** | Ponteiro + MDL para leitura | ⚠ **O driver** |
| **`METHOD_OUT_DIRECT`** | Ponteiro + MDL para escrita | ⚠ **O driver** |
| **`METHOD_NEITHER`** | ⚠ ⚠ **Ponteiro DIRETO do userspace** | ⚠ ⚠ **O driver, e VALIDANDO o ponteiro** |

⚠ **A tabela é o coração do módulo, e a última linha é a que importa:**

⚠ **`METHOD_BUFFERED`** copia o buffer para o kernel. Isso protege contra mudança do dado no meio (TOCTOU) — mas ⚠ **não protege contra tamanho**: o driver recebe `InputBufferLength` e `OutputBufferLength` **do userspace**, e precisa validar.

⚠ **`METHOD_NEITHER` é o perigo.** O gerenciador **não copia e não valida** — passa o ponteiro do userspace direto. O driver é obrigado a chamar `ProbeForRead`/`ProbeForWrite` e a **capturar a exceção** com `__try/__except`. ⚠ Se o driver desreferencia o ponteiro sem validar, o resultado é o equivalente Windows de um `copy_from_user` ausente: **o kernel lê ou escreve em endereço que o atacante escolhe**.

```c
// O padrao VULNERAVEL — METHOD_NEITHER sem validacao
NTSTATUS drv_ioctl(PDEVICE_OBJECT dev, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    PVOID p = s->Parameters.DeviceIoControl.Type3InputBuffer;

    // ⚠ NENHUM ProbeForRead, NENHUM __try/__except
    ULONG v = *(ULONG *)p;            // le direto — o usuario escolhe o endereco
    *(ULONG *)((PUCHAR)p + 4) = v;    // escreve direto

    IoCompleteRequest(irp, IO_NO_INCREMENT);
    return STATUS_SUCCESS;
}
```

⚠ **E o padrão correto, para contraste:**

```c
// O padrao CORRETO
NTSTATUS drv_ioctl(PDEVICE_OBJECT dev, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    PVOID p = s->Parameters.DeviceIoControl.Type3InputBuffer;
    ULONG inLen = s->Parameters.DeviceIoControl.InputBufferLength;

    // ⚠ 1. confere o TAMANHO ANTES de tudo
    if (inLen < sizeof(MINHA_ESTRUTURA)) {
        irp->IoStatus.Status = STATUS_INVALID_PARAMETER;
        IoCompleteRequest(irp, IO_NO_INCREMENT);
        return STATUS_INVALID_PARAMETER;
    }

    MINHA_ESTRUTURA copia;

    // ⚠ 2. sondagem + captura de excecao
    __try {
        ProbeForRead(p, sizeof(copia), 1);
        RtlCopyMemory(&copia, p, sizeof(copia));   // copia UMA VEZ
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        irp->IoStatus.Status = STATUS_ACCESS_VIOLATION;
        IoCompleteRequest(irp, IO_NO_INCREMENT);
        return STATUS_ACCESS_VIOLATION;
    }

    // ⚠ 3. valida o BUFFER DO KERNEL, nao o do usuario
    if (copia.tamanho > MAX) { /* ... */ }

    // ⚠ 4. usa o buffer do KERNEL
    return processar(&copia);
}
```

⚠ **Os quatro passos são exatamente os do curso de Linux Internals, módulo 1:** **copia, valida o buffer do kernel, usa o buffer do kernel.** A regra é universal — só o nome das funções muda.

---

## 11.3 A tabela de comparação

⚠ **Ela fecha os dois cursos, e vale escrever com cuidado:**

| Linux Internals | Windows Internals |
|---|---|
| `copy_from_user` | ⚠ `METHOD_BUFFERED` (copiado) |
| ⚠ Desreferenciar ponteiro direto | ⚠ ⚠ **`METHOD_NEITHER`** |
| `access_ok()` / `ProbeForRead` | ⚠ **`ProbeForRead` / `ProbeForWrite`** |
| Tratar falha de página | ⚠ **`__try` / `__except`** |
| ⚠ TOCTOU — validar depois de copiar | ⚠ Mesmo bug, mesmo padrão |
| Validar o buffer do kernel | ⚠ Validar a **cópia do kernel** |
| `ioctl` com `arg` | ⚠ `IOCTL` com método **no próprio código** |

⚠ **A última linha é a diferença estrutural.** No Linux, o método de transferência é uma convenção **documentada** — o código de ioctl sabe o que esperar. No Windows, o método está **codificado no número do `IOCTL`** — ou seja, **o próprio número anuncia o contrato**.

⚠ **Consequência prática importante para pesquisa:** ao enumerar os `IOCTL` de um driver, você **classifica cada um pelo método** sem ler uma linha de código. Todo `METHOD_NEITHER` é candidato automático — é triagem em um passo.

```powershell
# Listar os IOCTL de um driver conhecido, a partir do binario
# ⚠ os codigos aparecem como constantes no .sys; ferramenta de RE ajuda
dumpbin /disasm C:\Windows\System32\drivers\meudrv.sys | Select-String 'CtlCode'

# ⚠ E a classificacao por metodo, nos 2 bits baixos:
#   xx00 = METHOD_BUFFERED
#   xx01 = METHOD_IN_DIRECT
#   xx10 = METHOD_OUT_DIRECT
#   xx11 = METHOD_NEITHER      <-- candidato
```

---

## 11.4 O contrato completo

⚠ **Todo driver tem quatro rotinas, e cada uma é uma porta:**

```c
NTSTATUS DriverEntry(PDRIVER_OBJECT drv, PUNICODE_STRING reg) {
    drv->DriverUnload              = DrvUnload;
    drv->MajorFunction[IRP_MJ_CREATE]            = DrvCreate;   // ⚠ CreateFile
    drv->MajorFunction[IRP_MJ_CLOSE]             = DrvClose;
    drv->MajorFunction[IRP_MJ_DEVICE_CONTROL]    = DrvIoctl;    // ⚠ DeviceIoControl
    drv->MajorFunction[IRP_MJ_READ]              = DrvRead;
    drv->MajorFunction[IRP_MJ_WRITE]             = DrvWrite;
    // ...
    return STATUS_SUCCESS;
}
```

| Rotina | Acionada por | ⚠ Superfície |
|---|---|---|
| `IRP_MJ_CREATE` | `CreateFile` | ⚠ O que acontece ao **abrir** o device |
| `IRP_MJ_DEVICE_CONTROL` | `DeviceIoControl` | ⚠ ⚠ **O parser** — onde os bug moram |
| `IRP_MJ_READ` / `WRITE` | `ReadFile` / `WriteFile` | ⚠ Outros caminhos de dado |
| `IRP_MJ_CLOSE` | `CloseHandle` | Ciclo de vida — ⚠ refcount |

⚠ **A auditoria de um driver, em quatro perguntas:**

```
   1. QUEM     > a ACL do \Device permite quem?
   2. O QUE    > quais IOCTL existem, e com que METODO?
   3. VALIDA   > cada IOCTL checa InputBufferLength antes de usar?
   4. VIDA     > o que e' liberado no IRP_MJ_CLOSE, e com que refcount?
```

⚠ **A pergunta 3 é a que o curso de Pesquisa em Windows transforma em método.** E note: **a pergunta é de leitura de código, não de execução.** Você pode triar alvo **sem rodar nada** — o que reduz risco e aumenta a taxa de achado.

---

## 11.5 Um driver de teste, e o contrato em ação

⚠ **O lab do módulo — e o padrão que o curso de Pesquisa em Windows estende:**

```c
// drv-lab.c — um driver com DOIS IOCTL, um correto e um vulneravel
#include <ntddk.h>

#define DEV_NAME  L"\\Device\\LabDrv"
#define SYM_NAME  L"\\DosDevices\\LabDrv"

#define IOCTL_LAB_OK      CTL_CODE(0x8000, 0x800, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_LAB_NEITHER CTL_CODE(0x8000, 0x801, METHOD_NEITHER,  FILE_ANY_ACCESS)

typedef struct { ULONG tamanho; ULONG dados[16]; } LAB_REQ;

NTSTATUS DrvCreate(PDEVICE_OBJECT d, PIRP irp) {
    irp->IoStatus.Status = STATUS_SUCCESS;
    irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT);
    return STATUS_SUCCESS;
}

NTSTATUS DrvIoctl(PDEVICE_OBJECT d, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    NTSTATUS st = STATUS_SUCCESS;

    switch (s->Parameters.DeviceIoControl.IoControlCode) {

    case IOCTL_LAB_OK: {
        // ⚠ CORRETO: confere o tamanho e copia
        ULONG inLen = s->Parameters.DeviceIoControl.InputBufferLength;
        if (inLen < sizeof(LAB_REQ)) { st = STATUS_INVALID_PARAMETER; break; }
        LAB_REQ *r = (LAB_REQ *)irp->AssociatedIrp.SystemBuffer;
        if (r->tamanho > 16) { st = STATUS_INVALID_PARAMETER; break; }
        DbgPrint("[lab] OK: tamanho=%lu\n", r->tamanho);
        break;
    }

    case IOCTL_LAB_NEITHER: {
        // ⚠ VULNERAVEL DE PROPOSITO: sem Probe, sem __try
        PVOID p = s->Parameters.DeviceIoControl.Type3InputBuffer;
        ULONG v = *(ULONG *)p;                 // <-- o usuario escolhe o endereco
        DbgPrint("[lab] NEITHER: leu %lu de %p\n", v, p);
        break;
    }

    default: st = STATUS_INVALID_DEVICE_REQUEST;
    }

    irp->IoStatus.Status = st;
    irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT);
    return st;
}

NTSTATUS DriverEntry(PDRIVER_OBJECT drv, PUNICODE_STRING reg) {
    UNICODE_STRING nome, sym;
    PDEVICE_OBJECT dev;

    RtlInitUnicodeString(&nome, DEV_NAME);
    RtlInitUnicodeString(&sym, SYM_NAME);
    if (!NT_SUCCESS(IoCreateDevice(drv, 0, &nome, FILE_DEVICE_UNKNOWN,
                                   FILE_DEVICE_SECURE_OPEN, FALSE, &dev)))
        return STATUS_UNSUCCESSFUL;

    IoCreateSymbolicLink(&sym, &nome);
    drv->MajorFunction[IRP_MJ_CREATE]         = DrvCreate;
    drv->MajorFunction[IRP_MJ_DEVICE_CONTROL] = DrvIoctl;
    drv->DriverUnload = NULL;

    DbgPrint("[lab] device %wZ criado\n", &nome);
    return STATUS_SUCCESS;
}
```

⚠ **O driver tem os dois casos de propósito:** o `IOCTL_LAB_OK` valida; o `IOCTL_LAB_NEITHER` não. O lab compara os dois — e a diferença é o contrato.

---

## Laboratório 11 — Escrever e chamar o driver

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**
⚠ **Este lab instala um driver sem assinatura. Snapshot obrigatório.**

```powershell
cd C:\lab; mkdir m11; cd m11

# 1. Preparar a VM
bcdedit /set testsigning on
# ⚠ reinicie

# 2. Compilar o driver (WDK + Visual Studio)
#    mkdir drv && coloque drv-lab.c + um .vcxproj do tipo Driver/WDM
#    ⚠ ou use o EWDK com 'msbuild'

# 3. Instalar e verificar
sc create LabDrv type= kernel binPath= C:\lab\m11\LabDrv.sys
sc start LabDrv
sc query LabDrv
```

```c
// 4. O cliente: chama os dois IOCTL
#include <windows.h>
#include <stdio.h>

#define IOCTL_LAB_OK      CTL_CODE(0x8000, 0x800, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_LAB_NEITHER CTL_CODE(0x8000, 0x801, METHOD_NEITHER,  FILE_ANY_ACCESS)

typedef struct { ULONG tamanho; ULONG dados[16]; } LAB_REQ;

int main(void) {
    HANDLE h = CreateFileW(L"\\\\.\\LabDrv", GENERIC_READ|GENERIC_WRITE,
                           0, NULL, OPEN_EXISTING, 0, NULL);
    if (h == INVALID_HANDLE_VALUE) { printf("CreateFile: %lu\n", GetLastError()); return 1; }

    LAB_REQ r = { .tamanho = 4 };
    DWORD ret = 0;

    // ⚠ caminho CORRETO
    if (DeviceIoControl(h, IOCTL_LAB_OK, &r, sizeof(r), NULL, 0, &ret, NULL))
        printf("[ok] valido passou\n");

    // ⚠ caminho com tamanho invalido — deve ser RECUSADO
    r.tamanho = 9999;
    if (!DeviceIoControl(h, IOCTL_LAB_OK, &r, sizeof(r), NULL, 0, &ret, NULL))
        printf("[ok] invalido recusado: %lu\n", GetLastError());

    // ⚠ caminho VULNERAVEL — ponteiro escolhido por voce
    ULONG valor = 0x41414141;
    DeviceIoControl(h, IOCTL_LAB_NEITHER, &valor, 0, NULL, 0, &ret, NULL);

    CloseHandle(h);
    return 0;
}
```

```
# 5. Verificar no kernel
#    ⚠ o DbgPrint aparece no DebugView ou no WinDbg
#    dt nt!_DEVICE_OBJECT <ENDERECO>
#    !object \Device\LabDrv
#    dt nt!_OBJECT_HEADER <ENDERECO> PointerCount HandleCount

# 6. A ACL do device — quem pode abrir?
!object \Device\LabDrv
dt nt!_DEVICE_OBJECT <ENDERECO> -a | Select-String 'Security'
```

**O que observar:** no passo 4, `IOCTL_LAB_OK` com `tamanho = 9999` é **recusado pelo driver** — porque ele valida. E o `IOCTL_LAB_NEITHER` **aceita qualquer ponteiro** — porque não valida. ⚠ É a diferença entre contrato cumprido e contrato ausente.

**Exercício 1:** modifique o `IOCTL_LAB_OK` para **remover** a checagem de tamanho. Chame com `tamanho = 9999` e observe o que acontece no `DbgPrint` e no kernel. ⚠ Depois devolva a checagem e escreva, em duas linhas, o que ela evitou.

**Exercício 2:** adicione um terceiro `IOCTL` com `METHOD_BUFFERED` que copia `InputBufferLength` bytes para um buffer de **64 bytes fixos**. Chame com `InputBufferLength = 512`. ⚠ Com o `Driver Verifier` ligado, leia o relatório. Sem ele, o que acontece?

**Exercício 3 (o que vale):** escreva a **tabela de auditoria** do 11.4 para o seu driver: quem pode abrir, quais `IOCTL` existem, qual valida tamanho, e o que acontece no `IRP_MJ_CLOSE`. ⚠ Depois refaça a mesma tabela para **um driver do sistema** — escolha um `.sys` simples e faça a análise **estática** (`dumpbin`/desmontagem), sem executar nada. É exatamente a triagem que o curso de Pesquisa em Windows formaliza.

---

## Resumo

- ⚠ **O driver é objeto `\Device` com ACL + serviço no registro** — as duas faces decidem quem alcança.
- ⚠ **O método de buffer está codificado NO `IOCTL`** — você classifica o risco sem ler código.
- **`METHOD_BUFFERED`** copia (protege contra TOCTOU) mas ⚠ **não valida tamanho**; **`METHOD_NEITHER`** ⚠ passa o ponteiro **direto**.
- ⚠ **`ProbeForRead` + `__try/__except` + cópia única** são obrigatórios em `NEITHER`.
- ⚠ **Os quatro passos são os do Linux:** copia, valida o buffer do kernel, usa o buffer do kernel.
- A auditoria tem quatro perguntas: **quem, o que, valida, vida** — e a terceira é de **leitura de código**.
- ⚠ **Triagem se faz sem executar**: `METHOD_NEITHER` é candidato automático.

---

## O que o próximo módulo entrega

Você sabe onde o contrato pode faltar. O módulo 12 fecha o curso com **`ETW`** — a telemetria do Windows: onde ela nasce, o que ela entrega, e onde ela **não chega**. É o módulo que transforma o mapa em observação.
