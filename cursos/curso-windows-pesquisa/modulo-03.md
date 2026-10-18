# Módulo 3 — Corrupção de Pool: Reconhecer, Medir e o Que Ela Permite

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 3 de 12 · 4 horas
**Pré-requisitos:** Módulos 1 e 2
**Próximo:** Módulo 4 — UAF de objeto

---

## O que este módulo entrega

Ao final, você vai saber **produzir corrupção de pool, reconhecê-la e medi-la** — e, o que importa mais, **dizer o que ela permite**. Um overflow que dá bugcheck não é achado; um overflow que dá **primitiva** é. É o módulo em que a falha de contrato do 2 se torna consequência.

---

## 3.1 O pool, revisitado com olhar de pesquisa

⚠ **O módulo 5 do Windows Internals mostrou o palco. Aqui, o que importa é o **layout**:**

```
   POOL DO KERNEL
   ┌──────────────────────────────────────────────────────┐
   │  POOL_HEADER  │  ⚠ o SEU bloco  │  POOL_HEADER  │ viz │
   │  (16 bytes)   │                 │  (16 bytes)   │     │
   └──────────────────────────────────────────────────────┘
          ▲                  ▲              ▲
          │                  │              │
          │                  │              └─ ⚠ o que um overflow
          │                  │                   atinge PRIMEIRO
          │                  └─ o que voce controla
          └─ ⚠ o que o Driver Verifier protege
```

⚠ **A leitura de pesquisa:** um overflow de pool **não corrompe "a memória"** — ele corrompe **o bloco vizinho**, ou o **header** dele. ⚠ E o que decide o impacto é **o que estava ali**.

⚠ **E a assimetria que faz a classe ser interessante:**

| O overflow atinge | ⚠ O que se ganha |
|---|---|
| O `_POOL_HEADER` do vizinho | ⚠ Bugcheck, ou **corrupção da lista de pool** |
| Os dados do vizinho | ⚠ ⚠ **Depende do tipo do vizinho** |
| Um ponteiro no vizinho | ⚠ ⚠ ⚠ **Leitura/escrita arbitrária** |
| Um tamanho no vizinho | ⚠ ⚠ **Overflow secundário** |
| ⚠ Nada (bloco no fim da página) | ⚠ Bugcheck imediato — **e é isso que se quer no lab** |

---

## 3.2 `pool spray`: escolher o vizinho

⚠ **O passo que transforma overflow em primitiva. Não é exploit — é configuração de cenário:**

```
   1. O driver aloca um bloco de tamanho T
   2. ⚠ ANTES do overflow, o atacante ENCHE o pool
      com objetos do MESMO tamanho T, de conteudo controlado
   3. A alocacao do driver cai entre eles
   4. O overflow atinge o OBJETO DO ATACANTE
```

⚠ **É o mesmo `heap spray` do curso de Linux Internals, com os veículos próprios do Windows:**

| Veículo | ⚠ Como se controla o conteúdo | Tamanho |
|---|---|---|
| **`Event`** | Nome e atributos | Pequeno e fixo |
| **`Semaphore`** | Idem | Pequeno |
| **`Section`** | `NtCreateSection` | Variável |
| ⚠ **`Named Pipe`** | ⚠ Nome e dados | ⚠ Flexível |
| ⚠ **`Registry key`** | Nome da chave | ⚠ Controlável |
| **`IOCTL` de outro driver** | Depende | Depende |
| ⚠ **`NtAllocateVirtualMemory` no kernel** | Via driver | Variável |

⚠ **A quarta e a quinta são as preferidas em pesquisa de Windows**, porque o **nome** do objeto é uma string que você escolhe — e ela cai **dentro do pool**, no offset que você quiser. ⚠ É o `msg_msg` do Windows.

⚠ **A pergunta que governa o spray:** *qual objeto tem tamanho previsível, conteúdo controlável e alocação que eu consigo forçar?* ⚠ A resposta varia por build, e é parte do trabalho.

---

## 3.3 As classes de corrupção

⚠ **Quatro, e cada uma tem um sinal diferente:**

### A — Overflow linear

⚠ **Escreve além do bloco, no vizinho.** ⚠ Sem `Verifier`, o efeito pode ser **silencioso** — o bugcheck aparece **depois**, em código inocente.

### B — Underflow / subflow

⚠ **Escreve **antes** do bloco, no `_POOL_HEADER`.** ⚠ Corrompe a **lista de pool**, e o efeito é um bugcheck em qualquer alocação posterior.

### C — Corrupção de lista (`LIST_ENTRY`)

⚠ **O mais explorável, e o mais clássico.** Um `LIST_ENTRY` corrompido faz a operação de remoção escrever **em endereço escolhido**:

```c
// O que acontece quando uma lista encadeada e' corrompida
// Em RemoveEntryList:
//   Blink->Flink = Flink;
//   Flink->Blink = Blink;
//   ⚠ se voce controla Blink e Flink, voce ESCREVE em
//     dois enderecos escolhidos
```

⚠ **A técnica é conhecida desde 2004** e continua aparecendo — porque a causa (ponteiro de lista em pool corrompível) continua existindo.

### D — Type confusion por vizinhança

⚠ **Não se corrompe nada — troca-se o **tipo** do objeto.**

```
   ⚠ bloco liberado da cache de TIPO A
        │
        ▼
   reocupado por objeto do TIPO B, com dados do atacante
        │
        ▼
   o codigo original usa o ponteiro como TIPO A
        │
        ▼
   ⚠ interpreta os bytes do TIPO B como estrutura do TIPO A
```

⚠ **É a ponte para o módulo 6**, e a razão de o `UAF` de objeto ser tão valioso: o tipo é a diferença entre um bugcheck e uma primitiva.

---

## 3.4 Medir: o `Driver Verifier` como instrumento

⚠ **Sem ele, você não mede — você adivinha.** ⚠ O módulo 5 do Windows Internals apresentou; aqui é o uso em pesquisa:

```powershell
# As flags que importam para este curso
verifier /standard /driver meudrv.sys

# ⚠ Special pool: coloca o bloco no FIM da pagina
#    -> o primeiro byte alem dele atinge pagina invalida
#    -> o bugcheck e' NO CULPADO, nao longe

# ⚠ Pool tracking: detecta VAZAMENTO e nos diz quem alocou
verifier /querysettings
verifier /query
```

⚠ **O `!analyze -v` responde as três perguntas que importam**, e elas são as mesmas do KASAN:

```
   BUGCHECK_CODE:       qual classe de corrupcao
   ⚠ a PILHA:            quem escreveu (com special pool)
   ⚠ o TAMANHO:          quantos bytes passaram do limite
   ⚠ a TAG de pool:      QUEM alocou o bloco atingido
```

⚠ **A tag é a informação que planeja o `spray`.** ⚠ Se o bloco atingido tem tag `NtFf`, é uma estrutura conhecida — e você sabe **o que** corromper; se tem tag do próprio driver, você sabe onde ele aloca.

```windbg
kd> !analyze -v
kd> !verifier 3 meudrv            # pool alocado por um driver
kd> !pool <ENDERECO>              # tamanho, tag, estado do bloco
kd> dt nt!_POOL_HEADER <ENDERECO>
kd> !poolfind <TAG>
```

⚠ **E a reprodutibilidade, com o mesmo rigor do curso de Linux Internals:**

```powershell
# Rode N vezes e conte — sem isso, nao ha taxa
1..100 | ForEach-Object {
  # ⚠ rode o trigger
  # ⚠ leia o bugcheck
} | Group-Object | Sort-Object Count -Descending
```

| Taxa em 100 | ⚠ Leitura |
|---|---|
| 100/100 | ✅ Determinístico — reporte |
| 10–99 | ⚠ Corrupção dependente de layout — ajuste o spray |
| 1–9 | ⚠ Janela estreita — documente a taxa |
| 0 | ❌ Ou não é bug, ou o bloco vizinho não é o que você pensa |

---

## 3.5 O que a corrupção permite

⚠ **A tabela que o relatório exige, e ela é o coração da avaliação:**

| O que se controla | ⚠ Primitiva resultante |
|---|---|
| Bytes no vizinho | ⚠ Nada, sem estrutura útil |
| Um ponteiro **em uso** | ⚠ ⚠ Leitura/escrita arbitrária |
| Um `LIST_ENTRY` | ⚠ ⚠ Escrita em endereço escolhido |
| O **tipo** do objeto | ⚠ ⚠ Confusão de tipo |
| Um **ponteiro de função** | ⚠ ⚠ ⚠ Controle de fluxo |
| Um **token** ou credencial | ⚠ ⚠ ⚠ Root direto |

⚠ **A frase que fecha a seção:** *um bugcheck não é achado; um achado é uma primitiva.* ⚠ E a primitiva só existe se o overflow atingir **algo útil** — e é por isso que o módulo 1 (escolher alvo) e o 3.2 (escolher vizinho) têm peso igual.

---

## 3.6 A linha deste curso

⚠ **Delimitação, escrita com clareza:**

| Este curso | ⚠ O que não está aqui |
|---|---|
| Produzir a corrupção | ⚠ A cadeia completa até `SYSTEM` |
| **Medir** a taxa e a classe | Escrever o exploit final |
| **Identificar a primitiva** | Bypass de `kCFG`/`SMEP` em kernel |
| Relatório e correção | Publicar payload |

⚠ **A razão é o mesmo princípio dos outros cursos:** o que se **reporta** é a **primitiva**, com o impacto demonstrado. ⚠ A cadeia de escalação é decisão do profissional e de quem contrata o trabalho — não um capítulo de curso.

⚠ **E o alvo é sempre o seu driver, no `Driver Verifier` da sua VM.** Nenhum lab deste curso instala driver de terceiro para atacar — o módulo 7 trata de `BYOVD` como **fenômeno a reconhecer**, com alvo no lab.

---

## Laboratório 3 — Produzir e medir

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **`Driver Verifier` ligado. Snapshot limpo. Este lab QUEBRA a VM.**

```powershell
mkdir C:\lab\m03 -Force; cd C:\lab\m03
bcdedit /set testsigning on     # ⚠ reinicie depois
```

```c
// drv_overflow.c — driver de lab com overflow de pool PROPOSITAL
#include <ntddk.h>

#define TAG_ALVO  'alvO'
#define TAG_ESCR  'rscE'
#define IOCTL_OVERFLOW  CTL_CODE(0x8000, 0x810, METHOD_BUFFERED, FILE_ANY_ACCESS)

typedef struct { ULONG len; UCHAR dados[1]; } REQ;

static PVOID alvo = NULL;

NTSTATUS DrvCreate(PDEVICE_OBJECT d, PIRP irp) {
    irp->IoStatus.Status = STATUS_SUCCESS;
    irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT);
    return STATUS_SUCCESS;
}

NTSTATUS DrvIoctl(PDEVICE_OBJECT d, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    NTSTATUS st = STATUS_SUCCESS;

    if (s->Parameters.DeviceIoControl.IoControlCode == IOCTL_OVERFLOW) {
        ULONG inLen = s->Parameters.DeviceIoControl.InputBufferLength;
        REQ *r = (REQ *)irp->AssociatedIrp.SystemBuffer;

        // ⚠ VULNERAVEL DE PROPOSITO:
        //    confere inLen contra o tamanho MINIMO, mas nao contra r->len
        if (inLen < sizeof(REQ)) { st = STATUS_INVALID_PARAMETER; goto fim; }

        if (!alvo) {
            alvo = ExAllocatePool2(POOL_FLAG_NON_PAGED, 0x40, TAG_ALVO);
            DbgPrint("[m03] alvo em %p (0x40 bytes, tag alvO)\n", alvo);
        }

        // ⚠ r->len pode ser ate 0x400 — e o bloco tem 0x40
        RtlCopyMemory(alvo, r->dados, r->len);
        DbgPrint("[m03] escreveu %lu bytes em bloco de 0x40\n", r->len);
    } else {
        st = STATUS_INVALID_DEVICE_REQUEST;
    }

fim:
    irp->IoStatus.Status = st;
    irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT);
    return st;
}

NTSTATUS DriverEntry(PDRIVER_OBJECT drv, PUNICODE_STRING reg) {
    UNICODE_STRING nome, sym;
    PDEVICE_OBJECT dev;
    RtlInitUnicodeString(&nome, L"\\Device\\M03Drv");
    RtlInitUnicodeString(&sym,  L"\\DosDevices\\M03Drv");
    if (!NT_SUCCESS(IoCreateDevice(drv, 0, &nome, FILE_DEVICE_UNKNOWN,
                                   FILE_DEVICE_SECURE_OPEN, FALSE, &dev)))
        return STATUS_UNSUCCESSFUL;
    IoCreateSymbolicLink(&sym, &nome);
    drv->MajorFunction[IRP_MJ_CREATE]         = DrvCreate;
    drv->MajorFunction[IRP_MJ_DEVICE_CONTROL] = DrvIoctl;
    DbgPrint("[m03] device criado\n");
    return STATUS_SUCCESS;
}
```

```c
// spray.c — o vizinho controlado
#include <windows.h>
#include <stdio.h>

#define IOCTL_OVERFLOW CTL_CODE(0x8000, 0x810, METHOD_BUFFERED, FILE_ANY_ACCESS)

int main(int argc, char **argv) {
    ULONG tam = argc > 1 ? (ULONG)strtoul(argv[1], NULL, 0) : 0x200;

    // ⚠ 1. SPRAY: enche o pool com objetos de NOME controlado
    //    (⚠ cada handle segura um objeto do tamanho aproximado)
    HANDLE hs[500];
    for (int i = 0; i < 500; i++) {
        char nome[64];
        snprintf(nome, sizeof(nome), "spray_%04d_%s", i, "AAAAAAAAAAAAAAAA");
        hs[i] = CreateEventA(NULL, TRUE, FALSE, nome);
    }
    printf("spray: 500 objetos alocados\n");

    // ⚠ 2. TRIGGER: o overflow
    HANDLE h = CreateFileW(L"\\\\.\\M03Drv", GENERIC_READ|GENERIC_WRITE,
                           0, NULL, OPEN_EXISTING, 0, NULL);
    if (h == INVALID_HANDLE_VALUE) { printf("CreateFile: %lu\n", GetLastError()); return 1; }

    UCHAR buf[4096] = {0};
    *(ULONG *)buf = tam;
    for (ULONG i = 0; i < tam; i++) buf[4 + i] = 0x41;

    DWORD ret;
    DeviceIoControl(h, IOCTL_OVERFLOW, buf, 4 + tam, NULL, 0, &ret, NULL);
    printf("trigger: enviado len=%lu\n", tam);

    CloseHandle(h);
    for (int i = 0; i < 500; i++) if (hs[i]) CloseHandle(hs[i]);

    printf("⚠ segure a VM: sem Verifier, nada pode aparecer\n");
    return 0;
}
```

```bash
# Compile, instale e ligue o Verifier
sc create M03Drv type= kernel binPath= C:\lab\m03\M03Drv.sys
verifier /standard /driver M03Drv.sys
sc start M03Drv
```

```powershell
# ⚠ 3. Rode com VERIFIER desligado — e observe
spray.exe 0x200
#    ⚠ possivelmente: NADA acontece. É a lição.

# ⚠ 4. Ligue o verifier para o driver, reinicie, e rode de novo
verifier /querysettings
spray.exe 0x200
#    ⚠ agora: BUGCHECK, e o relatorio aponta o CULPADO
```

```
kd> !analyze -v
#    ⚠ leia: BUGCHECK_CODE, a PILHA (quem escreveu),
#      e o tamanho que passou do limite
kd> !pool <ENDERECO_DO_BLOCO_ATINGIDO>
kd> dt nt!_POOL_HEADER <ENDERECO>
kd> !verifier 3 M03Drv
```

**O que observar:** a diferença entre o passo 3 e o 4 é **o módulo inteiro**. ⚠ Sem `Verifier`, o overflow pode não produzir nada — e o pesquisador sem instrumento conclui, errado, que **não é bug**. Com special pool, o crime aparece **na cena**.

**Exercício 1:** rode o trigger com **quatro** tamanhos (`0x40`, `0x50`, `0x100`, `0x400`) e registre, para cada um, se houve bugcheck e onde. ⚠ Monte a tabela e explique a diferença entre os tamanhos **pequenos** e o que salta de página.

**Exercício 2:** implemente o **`pool spray`** antes do trigger e mostre, com `!pool`, que o bloco atingido tem **tag diferente** da do driver — ou seja, é um vizinho que você escolheu. ⚠ Escreva o que isso muda no impacto.

**Exercício 3 (o que vale):** preencha a **tabela do 3.5** para o seu caso: o que o overflow atingiu, e **qual primitiva** isso permite. ⚠ Se a resposta for "nenhuma", escreva **o que faltou** — o vizinho certo, ou o offset certo. É o critério de achado do curso: **bugcheck não é achado; primitiva é.**

---

## Resumo

- ⚠ **Um overflow de pool não corrompe "a memória"** — corrompe **o vizinho**, e o impacto depende **do que estava ali**.
- ⚠ **`pool spray` é o passo que transforma overflow em primitiva** — escolher o vizinho é metade do trabalho.
- **Os veículos do Windows** têm em comum o **nome controlável**, que cai dentro do pool (`Named Pipe`, chave de registro).
- ⚠ **Quatro classes**: overflow linear, underflow no header, **corrupção de lista** e confusão por vizinhança.
- ⚠ **`LIST_ENTRY` corrompido = escrita em endereço escolhido** — a técnica mais antiga e ainda viva.
- ⚠ **O `Driver Verifier` é o instrumento**: sem special pool, o crime acontece longe da cena.
- ⚠ **A tag de pool diz QUEM alocou** — é a informação que planeja o spray.
- ⚠ **Bugcheck não é achado; primitiva é.** Taxa medida, classe identificada, relatório escrito.

---

## O que o próximo módulo entrega

Você produz e mede corrupção. O módulo 4 trata do caso mais valioso: **UAF de objeto** — onde o vizinho que reocupa o bloco tem **tipo conhecido**, e a diferença entre bugcheck e primitiva deixa de ser sorte.
