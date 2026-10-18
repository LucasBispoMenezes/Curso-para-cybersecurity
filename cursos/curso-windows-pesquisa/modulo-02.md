# Módulo 2 — O Contrato do `IOCTL`: Código, `METHOD_*`, e Onde a Validação Falta

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 2 de 12 · 4 horas
**Pré-requisitos:** Módulo 1
**Próximo:** Módulo 3 — Corrupção de pool

---

## O que este módulo entrega

Este é **o módulo central do curso**. Ao final, você vai saber **ler o contrato de um driver** — o que ele promete, o que ele realmente faz, e onde a diferença é explorável. A tese dos onze módulos está aqui: **no Windows, o bug de kernel quase sempre está no contrato, e não na lógica.**

---

## 2.1 A tese

⚠ **A afirmação que organiza o curso inteiro:**

> **O driver declara o MÉTODO de buffer, declara o TAMANHO, e não valida o que o userspace
> mandou. O resto é consequência.**

⚠ **E a razão de ela valer mais no Windows que no Linux:**

| Linux | Windows |
|---|---|
| `copy_from_user` é **explícito** no código | ⚠ O método é **declarado no número** do `IOCTL` |
| O autor sabe que precisa validar | ⚠ O autor **presume** que o framework validou |
| Sem framework intermediário | ⚠ `WDF` faz parte, e **não tudo** |

⚠ **A segunda linha é o mecanismo do erro.** O autor de driver Windows escreve `DeviceIoControl`, vê que o sistema "tratou" o buffer, e conclui que a validação é problema do sistema. ⚠ Não é.

---

## 2.2 O código, por dentro

⚠ **O `IOCTL` é um número de 32 bits que **carrega o contrato**:**

```
   31        16 15  14 13        2 1  0
   ┌────────────┬──────┬───────────┬────┐
   │ DeviceType │Access│  Function │Meth│
   └────────────┴──────┴───────────┴────┘
        │          │         │        │
        │          │         │        └─ ⚠ MÉTODO DE BUFFER (2 bits)
        │          │         └────────── número da função (12 bits)
        │          └──────────────────── acesso requerido (2 bits)
        └─────────────────────────────── tipo de dispositivo (16 bits)
```

```c
#define CTL_CODE(DeviceType, Function, Method, Access) \
    (((DeviceType) << 16) | ((Access) << 14) | ((Function) << 2) | (Method))
```

⚠ **A leitura de segurança, e ela é o que torna a triagem possível:** ⚠ **o próprio número anuncia o risco.** Não é preciso ler o código para saber que um `IOCTL` é `METHOD_NEITHER` — basta olhar os dois bits.

⚠ **E o `DeviceType` também informa:** valores `0x8000` para cima são **de terceiro** (a faixa é reservada para isso). ⚠ Um `IOCTL` com `DeviceType` alto diz "este driver é de fabricante, não do Windows".

---

## 2.3 Os quatro métodos, e o que cada um promete

⚠ **A tabela que **é** o módulo:**

| Método | O que o sistema faz | ⚠ O que o driver **ainda** precisa fazer |
|---|---|---|
| **`METHOD_BUFFERED`** | ⚠ Copia entrada e saída para `SystemBuffer` | ⚠ **Conferir `InputBufferLength`** |
| **`METHOD_IN_DIRECT`** | Cria `MDL` para leitura | ⚠ Conferir tamanho **e** mapear |
| **`METHOD_OUT_DIRECT`** | Cria `MDL` para escrita | ⚠ Conferir tamanho **e** mapear |
| **`METHOD_NEITHER`** | ⚠ ⚠ **Nada** | ⚠ ⚠ `ProbeForRead`/`Write` + `__try/__except` + cópia |

⚠ **A coluna do meio é o que o autor **acha** que acontece. A da direita é o que ele precisa **fazer**.**

⚠ **`METHOD_BUFFERED` é o mais seguro — e não é seguro.** O `SystemBuffer` é uma **cópia** (protege contra TOCTOU), mas o **tamanho** vem do userspace:

```c
// ⚠ VULNERAVEL — METHOD_BUFFERED com tamanho nao conferido
NTSTATUS DrvIoctl(PDEVICE_OBJECT dev, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    ULONG inLen = s->Parameters.DeviceIoControl.InputBufferLength;

    // ⚠ NENHUMA checagem de inLen
    MY_REQ *r = (MY_REQ *)irp->AssociatedIrp.SystemBuffer;
    //  ⚠ se inLen < sizeof(MY_REQ), o resto e' lixo do buffer

    if (r->tamanho > 16) return STATUS_INVALID_PARAMETER;
    RtlCopyMemory(pool_pequeno, r->dados, r->tamanho * sizeof(ULONG));
    //                                     ^^^^^^^^^^
    // ⚠ tamanho validado contra 16, mas dados[] pode ter sido cortado
    ...
}
```

⚠ **Note o que aconteceu:** o driver **validou** — e validou **depois** de ler um campo que **pode não existir** no buffer. ⚠ É o equivalente exato do módulo 1 do curso de Linux Internals: **a ordem entre copiar, validar e usar.**

---

## 2.4 `METHOD_NEITHER`, em detalhe

⚠ **O caso mais perigoso, e o mais comum em driver de terceiro:**

```c
// ⚠ VULNERAVEL — o ponteiro do userspace, direto
NTSTATUS DrvIoctl(PDEVICE_OBJECT dev, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    PVOID p = s->Parameters.DeviceIoControl.Type3InputBuffer;
    //  ⚠ p e' um endereco do USERSPACE, sem validacao nenhuma

    ULONG v = *(ULONG *)p;              // ⚠ le onde o usuario escolher
    *(ULONG *)((PUCHAR)p + 4) = v;      // ⚠ escreve onde o usuario escolher

    IoCompleteRequest(irp, IO_NO_INCREMENT);
    return STATUS_SUCCESS;
}
```

⚠ **O que `METHOD_NEITHER` significa, dito sem rodeio:** o gerenciador **não copia e não valida**. ⚠ O `Type3InputBuffer` é um **ponteiro cru** — e se o driver desreferencia sem `Probe`, o resultado é o equivalente Windows de um `copy_from_user` ausente.

⚠ **E a classe de bug gravíssima que vem disso:** o driver lê **em endereço de kernel** sem validar, ou escreve **em endereço de kernel** sem validar. ⚠ O userspace não pode passar um ponteiro de kernel por acidente — mas **pode** passar um valor que o driver interpreta como ponteiro, e é isso que se explora.

⚠ **O padrão correto, para contraste:**

```c
// ✅ CORRIGIDO — os quatro passos, na ordem certa
NTSTATUS DrvIoctl(PDEVICE_OBJECT dev, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    PVOID p = s->Parameters.DeviceIoControl.Type3InputBuffer;
    ULONG inLen = s->Parameters.DeviceIoControl.InputBufferLength;

    // 1. ⚠ TAMANHO primeiro — antes de qualquer leitura
    if (inLen < sizeof(MY_REQ)) {
        irp->IoStatus.Status = STATUS_INVALID_PARAMETER;
        IoCompleteRequest(irp, IO_NO_INCREMENT);
        return STATUS_INVALID_PARAMETER;
    }

    MY_REQ copia;

    // 2. ⚠ SONDAGEM e captura de excecao
    __try {
        ProbeForRead(p, sizeof(copia), 1);
        RtlCopyMemory(&copia, p, sizeof(copia));   // 3. copia UMA vez
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        irp->IoStatus.Status = STATUS_ACCESS_VIOLATION;
        IoCompleteRequest(irp, IO_NO_INCREMENT);
        return STATUS_ACCESS_VIOLATION;
    }

    // 4. ⚠ valida e usa o buffer do KERNEL
    if (copia.tamanho > 16) { /* recusa */ }
    return processar(&copia);
}
```

⚠ **Os quatro passos são os mesmos do curso de Linux Internals, com nomes diferentes:** conferir tamanho, sondar, copiar **uma vez**, validar e usar **a cópia**. ⚠ A regra é universal; muda o nome da função.

⚠ **E o detalhe que muita gente escapa:** `ProbeForRead` sozinho **não basta**. ⚠ Ele valida **no momento em que é chamado** — e o ponteiro pode ser desmapeado depois. Por isso a sondagem **e** a cópia ficam **dentro** do `__try`.

---

## 2.5 Onde a validação falta

⚠ **Os oito lugares, e cada um é um `IOCTL` a testar:**

| # | O que falta | ⚠ Consequência |
|---|---|---|
| 1 | Conferir `InputBufferLength` | Leitura de lixo / curta |
| 2 | Conferir `OutputBufferLength` | ⚠ Escrita além do buffer |
| 3 | `Probe` em `NEITHER` | ⚠ Leitura/escrita arbitrária |
| 4 | `__try/__except` em `NEITHER` | ⚠ Bugcheck controlável |
| 5 | Validar **índice** contra tamanho | Out-of-bounds em array |
| 6 | Validar **relação** entre campos | ⚠ `len * size` estoura |
| 7 | Zerar o buffer de saída | ⚠ Vazamento de pool |
| 8 | Validar após a cópia (não antes) | ⚠ TOCTOU |

⚠ **A sexta é a mais sutil, e a mais explorável:** dois campos, cada um plausível, cujo **produto ou soma** estoura. ⚠ É o módulo 5 do curso de Web Apps (o overflow de cálculo), em ring 0.

⚠ **A oitava é a que reaparece em todo CVE de driver moderno:** o driver valida o **ponteiro do userspace**, e o dado muda antes do uso. ⚠ A correção é sempre a mesma: **validar o buffer do kernel**, nunca o do usuário.

---

## 2.6 Como se lê o contrato

⚠ **O método, em cinco passos, e ele **não executa nada**:**

```
   1. EXTRAIA     ->  todos os codigos de IOCTL do driver
   2. CLASSIFIQUE  ->  por METHOD (2 bits baixos)
   3. LOCALIZE    ->  o handler de cada um (desmontagem)
   4. LEIA        ->  ha checagem de tamanho ANTES do uso?
   5. ⚠ MARQUE     ->  NEITHER sem Probe = candidato imediato
```

⚠ **O passo 3 é o único que exige desmontagem** — e é por isso que o curso de `Assembly e RE` é ajuda: você precisa ler x64 descompilado. ⚠ A ferramenta de decompilação ajuda, e **não substitui**: ela erra em estrutura de `IO_STACK_LOCATION`.

```powershell
# 1 e 2. Os codigos, do binario
dumpbin /disasm meudrv.sys | Select-String 'CtlCode|0x8' | Select-Object -First 40

# 3. Os handlers registrados
dumpbin /disasm meudrv.sys | Select-String 'DriverObject|MajorFunction' -Context 0,3

# ⚠ No WinDbg, sobre o driver CARREGADO na VM:
#   u meudrv!DrvIoctl L60
#   ⚠ procure: "cmp ... 0x0" com o InputBufferLength
#   ⚠ a ausencia dessa comparacao e' o achado
```

⚠ **A regra de leitura que acelera tudo:** procure as **comparações** com `InputBufferLength` e `OutputBufferLength`. ⚠ Cada `IOCTL` que **não** tem uma é candidato — e a busca é mecânica.

---

## 2.7 O que o relatório exige

⚠ **O formato do achado, e ele difere do curso de Linux Internals porque o contrato é explícito:**

```
ACHADO — CONTRATO DE IOCTL
──────────────────────────────────────────────────────────
Driver:       nome.sys vX.Y.Z
IOCTL:        0x80002004   func=N   METHOD_NEITHER
Device:       \Device\...   ACL alcanca: usuario comum
Pre-requisito: ⚠ nenhum privilegio / admin
                    │
O QUE DEVERIA:  conferir InputBufferLength, ProbeForRead,
                __try/__except, copia unica
O QUE FAZ:      dereferencia Type3InputBuffer direto
                    │
CONSEQUENCIA:   leitura/escrita em endereco escolhido
REPRODUCAO:     ⚠ taxa, com Driver Verifier
──────────────────────────────────────────────────────────
```

⚠ **A linha `Pre-requisito` é o que define a gravidade** — e ela vem do módulo 1. ⚠ Um `NEITHER` sem `Probe` num device que só o `SYSTEM` abre é **bug**; o mesmo em device aberto é **escalação**.

⚠ **E a linha `REPRODUÇÃO` exige o `Driver Verifier`** — é o instrumento do módulo 3 em diante. ⚠ Sem ele, um overflow corrompe o vizinho e o bugcheck aparece longe do culpado.

---

## Laboratório 2 — Ler o contrato

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **Snapshot obrigatório. Leitura estática primeiro, e execução só no passo 6.**

```powershell
mkdir C:\lab\m02 -Force; cd C:\lab\m02
$DRV = "C:\Windows\System32\drivers\meudrv.sys"   # ⚠ o alvo do modulo 1

# ── Leitura estatica ────────────────────────────────────────

# 1. Os codigos de IOCTL, das constantes no binario
dumpbin /disasm $DRV | Select-String '0x8[0-9a-fA-F]{7}' |
  Select-Object -First 60 | Out-File -Encoding utf8 codigos.txt
Get-Content codigos.txt | Select-Object -First 20

# 2. Classifique por metodo
#    ⚠ cole os valores em codigos.py (do modulo 1) e rode
python codigos.py
```

```bash
# 3. Os pontos de entrada, no WinDbg sobre a VM com o driver carregado
#    ⚠ kernel debug por rede, WinDbg DE FORA
```

```
kd> lm m meudrv
kd> !drvobj meudrv 2                          # ⚠ os MajorFunction registrados
kd> dt nt!_DRIVER_OBJECT <ENDERECO> MajorFunction
kd> u meudrv!DrvIoctl L80                     # ⚠ o handler
#   ⚠ PROCURE: uma comparacao com InputBufferLength antes do uso
#     cmp dword ptr [rsp+...], 8    <- ⚠ se nao existir, e' candidato
```

```powershell
# 4. A ACL do device — o alcance
#    ⚠ WinObj: abra \Device\<nome> e leia o SecurityDescriptor
#    Anote: quem tem READ/WRITE — SYSTEM? Administrators? Users?
```

```powershell
# 5. ⚠ O cliente mínimo — só para o lab, contra o SEU driver
#    (compile e rode na VM; NÃO aponte para driver de terceiro)
```

```c
// cliente.c — o mínimo para observar o contrato em ação
#include <windows.h>
#include <stdio.h>

// ⚠ ajuste para os codigos do SEU driver de lab
#define IOCTL_TESTE_BUFFERED  CTL_CODE(0x8000, 0x800, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_TESTE_NEITHER   CTL_CODE(0x8000, 0x801, METHOD_NEITHER,  FILE_ANY_ACCESS)

int main(void) {
    HANDLE h = CreateFileW(L"\\\\.\\MeuDrv", GENERIC_READ|GENERIC_WRITE,
                           0, NULL, OPEN_EXISTING, 0, NULL);
    if (h == INVALID_HANDLE_VALUE) {
        printf("CreateFile: %lu  ⚠ a ACL permitiu?\n", GetLastError());
        return 1;
    }
    printf("⚠ handle obtido — o device e' alcancavel\n");

    DWORD ret = 0;
    ULONG valor = 0x41414141;

    // tamanho MINIMO: passou?
    DeviceIoControl(h, IOCTL_TESTE_BUFFERED, &valor, 1, NULL, 0, &ret, NULL);

    // ⚠ em METHOD_NEITHER, o INTEIRO vira "ponteiro"
    DeviceIoControl(h, IOCTL_TESTE_NEITHER, &valor, 0, NULL, 0, &ret, NULL);

    CloseHandle(h);
    return 0;
}
```

```
# 6. Com o Driver Verifier ligado, observe o efeito
verifier /standard /driver meudrv.sys
# ⚠ reinicie, rode o cliente, e leia:
!analyze -v
!verifier 3 meudrv
```

**O que observar:** no passo 3, a **comparação com `InputBufferLength`**. ⚠ A ausência dela é o achado — e ela é visível na desmontagem, **sem executar nada**. Todo o trabalho de decisão do módulo acontece antes do passo 6.

**Exercício 1:** para **cada** `IOCTL` do alvo, preencha a linha do 2.5 que ele viola — ou escreva "não viola". ⚠ A tabela completa é o entregável, e ela inclui os que estão corretos.

**Exercício 2:** escreva um driver de lab com **dois** `IOCTL` — um correto e um vulnerável — e compare a desmontagem dos dois handlers. ⚠ Mostre, na desmontagem, **a comparação que existe em um e falta no outro**.

**Exercício 3 (o que vale):** preencha o **formato do 2.7** para o achado do seu alvo. ⚠ A linha `O QUE FAZ` precisa citar **a instrução** que faz a dereferência sem validação — não "não valida". É o mesmo critério de causa-raiz do módulo 11 do curso de Linux Internals.

---

## Resumo

- ⚠ **A tese: o bug está no CONTRATO** — o driver declara o método, declara o tamanho, e não valida o que veio.
- ⚠ **O número do `IOCTL` carrega o contrato** — os 2 bits baixos dizem o método, e `DeviceType` alto diz "terceiro".
- ⚠ **`METHOD_BUFFERED` protege contra TOCTOU e NÃO contra tamanho.**
- ⚠ **`METHOD_NEITHER` não copia e não valida** — é ponteiro cru, e exige `Probe` + `__try` + cópia única.
- ⚠ **`ProbeForRead` sozinho não basta**: a sondagem e a cópia ficam **dentro** do `__try`.
- **Os oito lugares onde a validação falta** — e o 6 (relação entre campos) e o 8 (validar após copiar) são os que mais aparecem.
- ⚠ **A leitura é mecânica**: procure as comparações com `InputBufferLength`. O `IOCTL` que não tem uma é candidato.
- ⚠ **Preencher o contrato é leitura estática** — executar só depois, com `Driver Verifier` e snapshot.

---

## O que o próximo módulo entrega

Você sabe ler o contrato e achar onde ele falta. O módulo 3 trata do **efeito**: **corrupção de pool** — o que acontece depois, como medir, e o que ela permite.
