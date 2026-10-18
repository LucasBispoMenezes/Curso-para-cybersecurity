# Módulo 12 — Projeto Final: O Achado Completo

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 12 de 12 · 2 horas
**Pré-requisitos:** Módulos 1 a 11
**Próximo:** —

---

## O que este módulo entrega

É o fecho. Você recebe **um alvo com defeitos não anunciados** e conduz a investigação inteira — do desenho do contrato ao reporte com primitiva, taxa e divulgação. Não há conteúdo novo: há **aplicação do método**.

---

## 12.1 O que este módulo cobra

⚠ **A correspondência — cada item da entrega vem de um módulo:**

| Item da entrega | ⚠ Vem do módulo |
|---|---|
| Triagem do alvo, com razão | 1 |
| O contrato: `IOCTL`, método, alcance | 2 |
| Corrupção de pool, se houver | 3 |
| UAF e `refcount` | 4 |
| Corrida, com a taxa medida | 5 |
| Confusão de tipo, se houver | 6 |
| Perfil de `BYOVD`, se aplicável | 7 |
| Avaliação da mitigação | 8 |
| Cobertura de telemetria | 9 |
| Variantes, se houver | 10 |
| **Reporte com primitiva, taxa e limitações** | **11** |

⚠ **O critério:** *o contrato está preenchido? a primitiva está explícita? a taxa tem N? as limitações estão declaradas?*

---

## 12.2 A entrega

⚠ **O reporte é o produto, e ele agrega tudo:**

```markdown
# Relatorio de Pesquisa — <alvo>

## 1. Resumo
⚠ Uma frase por achado, com a PRIMITIVA e o PRE-REQUISITO.

## 2. Alvo e escopo
- driver, versao, hash, assinatura, fabricante
- ⚠ WDF ou WDM
- build do Windows, config do Verifier
- ⚠ O QUE NAO FOI ANALISADO (obrigatorio)

## 3. Superficie
- a tabela de IOCTL: codigo, metodo, acesso
- a ACL do device, e o privilegio exigido
- ⚠ o inventario completo, com o status de cada linha

## 4. Achados
Para cada um:
  4.x — <nome>
    - Classe          (qual dos modulos 3 a 6)
    - Contrato        ⚠ o que deveria existir
    - Causa raiz      ⚠ UMA FRASE, com a linha
    - Trigger         o minimo que dispara
    - ⚠ TAXA           N, condicao, e se alargou
    - ⚠ PRIMITIVA      o que PERMITE
    - Impacto         medido, sem exagero
    - Correcao        o que falta no contrato

## 5. Mitigacao
- a tabela do modulo 8, por processo
- ⚠ o caminho que sobra

## 6. Telemetria
- a cobertura medida (modulo 9)
- ⚠ os buracos

## 7. ⚠ LIMITACOES
- o que nao foi testado
- o que nao e' auditavel
- ferramenta nova fora de escopo

## 8. Divulgacao
- canal, prazo, e a lista (se houve variante)
```

⚠ **A seção 7 é a mesma do curso de LLM, e existe pelo mesmo motivo:** ⚠ sem ela, o achado é desmentível. ⚠ E o item "ferramenta nova fora de escopo" é o que o módulo 9 mostrou: a cobertura **não se propaga**.

---

## 12.3 O alvo do projeto

⚠ **Ele tem defeitos **não anunciados**, cobrindo os módulos 2 a 6.** Encontrá-los é o exercício.

⚠ **A dica de método, e ela é o curso inteiro:** ⚠ **preencha o contrato antes de testar.** Para cada `IOCTL` — método, tamanho esperado, o que deveria ser validado — e só depois compare com o que o código faz. ⚠ O omisso aparece contra o esperado.

⚠ **O que esperar, sem dizer onde:**

| Superfície | ⚠ O que procurar |
|---|---|
| Um `IOCTL` | ⚠ `NEITHER` sem `Probe` |
| Um `IOCTL` | ⚠ Tamanho conferido **depois** do uso |
| Pool | ⚠ Overflow sem checagem de relação entre campos |
| Objeto | ⚠ Ponteiro guardado sem referência |
| Estado global | ⚠ Sem lock — e com janela |
| Cópia | ⚠ Validar o buffer do usuário, não a cópia |

⚠ **A tabela é o mapa do que está lá — não a lista.** ⚠ Parte pode não existir no alvo: ⚠ **notar que não existe** também é trabalho, e vai na seção 2.

---

## 12.4 Como conduzir

⚠ **A sequência:**

```
   1. TRIAR       ->  vale? (modulo 1) — ⚠ decida RAPIDO
        │
        ▼
   2. CONTRATO    ->  ⚠ preencha ANTES de executar
        │
        ▼
   3. HIPOTESES   ->  uma ficha por IOCTL
        │
        ▼
   4. CONFIRMAR   ->  ⚠ leitura/desmontagem, NAO execucao
        │
        ▼
   5. REPRODUZIR  ->  so o que sobreviveu ao passo 4
        │              ⚠ com Verifier e snapshot
        ▼
   6. MEDIR       ->  taxa, N, condicao
        │
        ▼
   7. REPORTAR    ->  ⚠ primitiva + limitacoes
```

⚠ **O passo 4 antes do 5 é o que economiza tempo — e o que reduz risco.** ⚠ Você executa **só** o que a leitura confirmou, em vez de rodar trigger contra tudo que parecia suspeito. ⚠ É a razão de os módulos 1 e 2 virem antes dos módulos 3 a 6: **a triagem é leitura; a exploração é a minoria do trabalho.**

⚠ **E o passo 7 é o que se entrega.** ⚠ Um achado sem reporte é um achado que não existe para quem precisa corrigir.

---

## 12.5 Critérios de avaliação

| ✅ Qualifica | ⚠ Não qualifica |
|---|---|
| Contrato preenchido, com o omisso | "achei coisa suspeita" |
| Causa raiz em **uma frase**, com a linha | "falta validação" |
| ⚠ **Primitiva explícita** | "dá bugcheck" |
| Taxa com N e condição | "reproduz" |
| ⚠ **Limitações declaradas** | silêncio sobre o não testado |
| Impacto **medido** | "crítico" sem número |
| Correção = o que falta no **contrato** | "sanitizar a entrada" |
| Divulgação com plano | — |

⚠ **A terceira linha é a que distingue este curso:** ⚠ **bugcheck não é achado; primitiva é.** ⚠ Quem confunde os dois reporta crashes, e o outro lado não consegue priorizá-los.

⚠ **A quinta linha repete a do curso de LLM, e vale pelo mesmo motivo:** ⚠ declarar o que não se testou **fortalece** o reporte, porque mostra que você sabe o que sabe.

---

## Laboratório 12 — A investigação completa

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **Snapshot limpo. `Driver Verifier` ligado. Este lab quebra a VM.**

```c
// drv_projeto.c — o alvo do projeto. HA DEFEITOS. Encontre-os.
#include <ntddk.h>

#define TAG_ALVO  'jboP'
#define TAG_CTX   'xtcP'

#define IOCTL_SET_TAM    CTL_CODE(0x8000, 0x850, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_DEREF      CTL_CODE(0x8000, 0x851, METHOD_NEITHER,  FILE_ANY_ACCESS)
#define IOCTL_COPIA      CTL_CODE(0x8000, 0x852, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_PEGA_OBJ   CTL_CODE(0x8000, 0x853, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_USA_OBJ    CTL_CODE(0x8000, 0x854, METHOD_BUFFERED, FILE_ANY_ACCESS)
#define IOCTL_COMPART    CTL_CODE(0x8000, 0x855, METHOD_BUFFERED, FILE_ANY_ACCESS)

typedef struct { ULONG n; ULONG tam; UCHAR dados[1]; } REQ;
typedef struct { ULONG id; PVOID ptr; ULONG pronto; } CTX;

static CTX g_ctx = {0};
static PVOID g_buf = NULL;
static ULONG g_bufTam = 0;

NTSTATUS DrvCreate(PDEVICE_OBJECT d, PIRP irp) {
    irp->IoStatus.Status = STATUS_SUCCESS; irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT); return STATUS_SUCCESS;
}

NTSTATUS DrvIoctl(PDEVICE_OBJECT dev, PIRP irp) {
    PIO_STACK_LOCATION s = IoGetCurrentIrpStackLocation(irp);
    NTSTATUS st = STATUS_SUCCESS;
    ULONG code = s->Parameters.DeviceIoControl.IoControlCode;

    switch (code) {

    case IOCTL_SET_TAM: {
        ULONG inLen = s->Parameters.DeviceIoControl.InputBufferLength;
        if (inLen < sizeof(ULONG)) { st = STATUS_INVALID_PARAMETER; break; }
        ULONG n = *(ULONG *)irp->AssociatedIrp.SystemBuffer;
        if (n > 0x1000) { st = STATUS_INVALID_PARAMETER; break; }
        if (g_buf) { ExFreePool(g_buf); g_buf = NULL; }
        g_buf = ExAllocatePool2(POOL_FLAG_NON_PAGED, n, TAG_ALVO);
        if (g_buf) { g_bufTam = n; RtlFillMemory(g_buf, n, 0x41);
                     DbgPrint("[proj] buffer %lu em %p\n", n, g_buf); }
        break;
    }

    case IOCTL_DEREF: {
        // (⚠ observe o que este handler faz com o ponteiro)
        PVOID p = s->Parameters.DeviceIoControl.Type3InputBuffer;
        ULONG v = *(ULONG *)p;
        DbgPrint("[proj] deref leu 0x%X de %p\n", v, p);
        break;
    }

    case IOCTL_COPIA: {
        ULONG inLen = s->Parameters.DeviceIoControl.InputBufferLength;
        REQ *r = (REQ *)irp->AssociatedIrp.SystemBuffer;
        if (inLen < sizeof(REQ)) { st = STATUS_INVALID_PARAMETER; break; }
        // (⚠ observe a relacao entre os dois campos)
        RtlCopyMemory(g_buf, r->dados, r->n * r->tam);
        DbgPrint("[proj] copiou %lu bytes\n", r->n * r->tam);
        break;
    }

    case IOCTL_PEGA_OBJ: {
        PVOID o = ExAllocatePool2(POOL_FLAG_NON_PAGED, 0x80, TAG_CTX);
        if (o) { g_ctx.ptr = o; g_ctx.pronto = 1;
                 DbgPrint("[proj] obj %p guardado\n", o);
                 ExFreePool(o); }      // (⚠ observe o que sobra apontando)
        break;
    }

    case IOCTL_USA_OBJ: {
        if (g_ctx.pronto) {
            DbgPrint("[proj] usa obj %p, id=%lu\n", g_ctx.ptr, g_ctx.id);
            g_ctx.id++;
            if (g_ctx.ptr) *(ULONG *)g_ctx.ptr = g_ctx.id;
        }
        break;
    }

    case IOCTL_COMPART: {
        // (⚠ observe como o tamanho e o buffer sao atualizados)
        if (g_buf && g_bufTam <= 0x1000) {
            RtlFillMemory(g_buf, g_bufTam, 0x55);
            DbgPrint("[proj] usou %lu bytes em %p\n", g_bufTam, g_buf);
        }
        break;
    }

    default: st = STATUS_INVALID_DEVICE_REQUEST;
    }

    irp->IoStatus.Status = st; irp->IoStatus.Information = 0;
    IoCompleteRequest(irp, IO_NO_INCREMENT);
    return st;
}

NTSTATUS DriverEntry(PDRIVER_OBJECT drv, PUNICODE_STRING reg) {
    UNICODE_STRING nome, sym; PDEVICE_OBJECT dev;
    RtlInitUnicodeString(&nome, L"\\Device\\ProjDrv");
    RtlInitUnicodeString(&sym,  L"\\DosDevices\\ProjDrv");
    if (!NT_SUCCESS(IoCreateDevice(drv, 0, &nome, FILE_DEVICE_UNKNOWN,
                                   FILE_DEVICE_SECURE_OPEN, FALSE, &dev)))
        return STATUS_UNSUCCESSFUL;
    IoCreateSymbolicLink(&sym, &nome);
    drv->MajorFunction[IRP_MJ_CREATE]         = DrvCreate;
    drv->MajorFunction[IRP_MJ_DEVICE_CONTROL] = DrvIoctl;
    DbgPrint("[proj] device criado\n");
    return STATUS_SUCCESS;
}
```

```powershell
mkdir C:\lab\m12 -Force; cd C:\lab\m12
# Compile, instale e ligue o Verifier
sc create ProjDrv type= kernel binPath= C:\lab\m12\ProjDrv.sys
verifier /standard /driver ProjDrv.sys
# ⚠ reinicie
sc start ProjDrv
```

```powershell
# ⚠ A PARTIR DAQUI, E' SEU.
#    Comece pelo CONTRATO (modulo 2), NAO pelos testes:

# 1. Classifique cada IOCTL pelo metodo
$cts = @(0x80002000, 0x80002003, 0x80002004, 0x80002005,
         0x80002007, 0x80002008, 0x8000200B, 0x8000200C)
$cts | ForEach-Object {
  [PSCustomObject]@{
    Codigo = "0x{0:X8}" -f $_
    Funcao = ($_ -shr 2) -band 0xFFF
    Metodo = @('BUFFERED','IN_DIRECT','OUT_DIRECT','⚠ NEITHER')[$_ -band 3]
    Acesso = @('ANY','READ','WRITE','READ+WRITE')[($_ -shr 14) -band 3]
  }
} | Format-Table -AutoSize

# ⚠ O calculo acima e' ILUSTRATIVO — os codigos reais saem do binario.
#    Extraia-os com dumpbin e classifique com o script do modulo 1.

# 2. A ACL do device
# ⚠ WinObj: \Device\ProjDrv — quem tem READ/WRITE?

# 3. So entao: hipotese por IOCTL, confirmacao por leitura,
#    e reproducao do que sobreviveu.
```

**O que observar:** há **mais defeitos do que a tabela do 12.3 sugere** — e alguns exigem combinar dois `IOCTL`. ⚠ O `IOCTL_PEGA_OBJ` guarda um ponteiro e libera o bloco; o `IOCTL_USA_OBJ` escreve **no endereço obsoleto**. ⚠ O `IOCTL_COPIA` usa **dois campos** cujo produto pode estourar. ⚠ O `IOCTL_COMPART` valida o tamanho e **usa depois**. ⚠ E o `IOCTL_DEREF` é `NEITHER` sem `Probe`.

**Entrega:** o reporte do 12.2, completo, com **todos** os achados que você encontrou — a `PRIMITIVA` explícita, a `TAXA` com N, a seção de `LIMITAÇÕES`, a avaliação de mitigação (módulo 8) e a cobertura de telemetria (módulo 9).

---

## Resumo

- ⚠ **O módulo não tem conteúdo novo** — é aplicação, com defeitos **não anunciados**.
- ⚠ **Preencha o contrato ANTES de executar** — o omisso aparece contra o esperado.
- ⚠ **Confirme por leitura antes de reproduzir** — economiza tempo e reduz risco.
- ⚠ **Bugcheck não é achado; primitiva é.**
- ⚠ **A seção de limitações é obrigatória** — e "ferramenta nova fora de escopo" é o item que o módulo 9 exige.
- ⚠ **Notar o que NÃO existe também é trabalho** — e vai na seção de escopo.
- ⚠ **O reporte é a entrega** — achado sem reporte não existe para quem corrige.

---

## Fim do curso

Você atravessou doze módulos e uma afirmação só, que voltou em cada camada:

> **No Windows, o bug de kernel quase sempre está no CONTRATO — e o contrato é legível antes de
> executar qualquer coisa.**

No módulo 1 ela virou triagem. No 2, virou a tabela dos quatro métodos. Nos módulos 3 a 6, virou consequência: corrupção, UAF, corrida e confusão de tipo. No 7, apareceu no que a assinatura não garante. No 8, no que a mitigação não impede. No 9, no que a telemetria não vê. No 10, no que o fabricante não corrige. No 11, virou reporte.

⚠ **E o curso fecha a trilha de kernel do material:** o `Linux Internals` ensina que a falha está na fronteira de confiança; o `Windows Internals` desenha o mapa; **aqui você caça no território** — com o instrumento certo, o alvo certo e a taxa medida.

⚠ **O que fica não é uma lista de CVE.** É o hábito de ler o contrato antes de rodar o trigger — e a disciplina de reportar a **primitiva**, com a **taxa** e as **limitações**.
