# Módulo 1 — Do `Win32` ao Kernel: `ntdll`, `syscall`, `SSDT`, e Onde o `Win32` Mente

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 1 de 12 · 3 horas
**Pré-requisitos:** Nenhum além do curso de Linux Internals e de C para Pesquisa
**Próximo:** Módulo 2 — Processo e thread

---

## O que este módulo entrega

Ao final, você vai saber **descrever o caminho completo de uma chamada `Win32`** até o kernel, **identificar onde o `Win32` esconde o que realmente acontece**, e **usar essa distinção** para analisar comportamento de binário. É a fundação dos onze módulos seguintes: sem saber que `CreateFile` é conveniência e `NtCreateFile` é a verdade, você analisa a camada errada.

---

## 1.1 A arquitetura em cinco camadas

```
   ┌─────────────────────────────────────────────────────────┐
   │  APLICAÇÃO          seu.exe                             │
   ├─────────────────────────────────────────────────────────┤
   │  WIN32 API          kernel32.dll, advapi32.dll, user32  │  ⚠ conveniência
   ├─────────────────────────────────────────────────────────┤
   │  NTDLL              ntdll.dll                           │  ⚠ A FRONTEIRA REAL
   ├─────────────────────────────────────────────────────────┤
   │  ⚙ instrução syscall / sysenter                          │  ← ring 3 → ring 0
   ├─────────────────────────────────────────────────────────┤
   │  KERNEL             ntoskrnl.exe, win32k.sys, drivers   │
   └─────────────────────────────────────────────────────────┘
```

⚠ **A confusão estrutural que este módulo desfaz:** `kernel32.dll` **não é o kernel**. Ele roda em **ring 3**, no processo, com o mesmo privilégio do seu código. É uma biblioteca de conveniência que traduz chamadas.

| Função | Onde roda | O que é |
|---|---|---|
| `CreateFileW` | ring 3 (`kernel32`) | ⚠ Monta `OBJECT_ATTRIBUTES`, chama `NtCreateFile` |
| `ReadFile` | ring 3 (`kernel32`) | Chama `NtReadFile`, trata borda |
| `NtCreateFile` | ⚠ **`ntdll`, ring 3** | Prepara registradores, emite `syscall` |
| `NtCreateFile` (**kernel**) | ⚠ **ring 0** | A implementação de verdade |

⚠ **O mesmo nome aparece duas vezes, em dois lados.** `NtCreateFile` existe em `ntdll.dll` (stub) e em `ntoskrnl.exe` (implementação). Confundir os dois é o erro mais comum de quem começa.

---

## 1.2 A travessia, passo a passo

```
   userspace                                        kernel
   ─────────                                        ──────

   CreateFileW("C:\\a.txt", ...)         kernel32.dll
        │
        ▼
   monta OBJECT_ATTRIBUTES, UNICODE_STRING
   valida string, resolve caminho relativo
        │
        ▼
   NtCreateFile(...)                     ntdll.dll   ← ⚠ STUB
        │
        ├─ eax = 0x55   (numero do servico, nao um syscall number!)
        ├─ r10 = espaco do usuario
        └─ ⚠ instrucao "syscall"
        │
        ▼
   ┌────────────────────────────────────────────────┐
   │  KiSystemCall64                                 │
   │    1. troca a pilha para a do kernel            │
   │    2. salva o contexto (trap frame)             │
   │    3. ⚠ le eax e INDEXA a SSDT                  │
   │    4. chama NtCreateFile do kernel              │
   └────────────────────────────────────────────────┘
        │
        ▼
   objeto, parser, acesso, retorno em rax
        │
        ▼
   sysret ────────────► volta ao stub, que retorna
                        a kernel32, que retorna ao app
```

⚠ **A diferença estrutural em relação ao Linux, e ela é grande:**

| Linux | Windows |
|---|---|
| `eax` = número fixo por arquitetura | ⚠ `eax` = **índice na SSDT**, que é **por versão** |
| Tabela conhecida e estável | ⚠ O índice **muda entre builds** |
| `syscall` com número documentado | ⚠ O número **não é contrato público** |

⚠ **Consequência:** no Windows, você não chama "syscall 0x55" e conta com isso. O número é **interno da build**. É por isso que chamada direta de syscall em Windows (`direct syscall`) é técnica de evasão, e não técnica de programação — a técnica funciona porque **pula a `ntdll`**, e não porque o número seja estável.

---

## 1.3 A SSDT: a tabela que decide tudo

A **System Service Descriptor Table** mapeia índice → função do kernel. Existem quatro, e a pegadinha é que só uma é a que você imagina:

| Tabela | .exe | O que serve |
|---|---|---|
| **`KeServiceDescriptorTable`** | `ntoskrnl.exe` | ⚠ Syscalls `Nt*` / `Zw*` |
| `KeServiceDescriptorTableShadow` | `ntoskrnl.exe` | ⚠ **Inclui também as de `win32k`** |
| `W32pServiceTable` (dentro da shadow) | `win32k.sys` | ⚠ Chamadas de GUI: `NtUser*`, `NtGdi*` |
| — | — | — |

⚠ **A distinção `Nt*` vs `Zw*` importa, e é sutil:**

| Prefixo | De onde chama | Comportamento |
|---|---|---|
| **`Nt*`** | userspace, ou kernel tratando dado de userspace | ⚠ Valida ponteiro, respeita `PreviousMode` |
| **`Zw*`** | ⚠ **kernel** | Pula validação — o chamador é confiável, por definição |

⚠ **É a mesma lógica do `copy_from_user` do Linux**, com outro nome. `PreviousMode` é o campo que diz "a requisição veio de ring 3" — e é ele que faz o kernel validar ponteiro. Um driver que chama `Nt*` onde deveria chamar `Zw*` (ou o contrário) tem bug de segurança — e é exatamente essa a classe que aparece em CVE de driver.

```powershell
# Ver o numero de servico de uma funcao em ntdll
# (o padrao dos stubs e: mov eax, <numero>; syscall)
# Use o WinDbg:
#   u ntdll!NtCreateFile L8
#   ⚠ procure "mov eax,55h" ou similar
```

---

## 1.4 Onde o `Win32` mente — e por que isso importa

⚠ **Cinco pontos em que a camada `Win32` mostra uma realidade que não é a do kernel:**

| O que o `Win32` diz | O que o kernel faz |
|---|---|
| `DeleteFile` | ⚠ Marca para remoção — o arquivo fica até o último handle fechar |
| `CreateFile` com `GENERIC_READ` | ⚠ Abre com uma máscara de acesso maior, e o kernel valida **a dele** |
| `GetLastError` | Resultado **traduzido** de um `NTSTATUS` — ⚠ a informação original se perde |
| Erro `ACCESS_DENIED` | ⚠ Pode ser 6 `NTSTATUS` diferentes, com causas distintas |
| `CreateProcess` | ⚠ `NtCreateUserProcess` — uma syscall, com dezenas de parâmetros |

⚠ **O segundo item é o que mais confunde em análise:** `GENERIC_READ` não é um valor que o kernel entende. É uma **máscara** que a `kernel32` traduz para direitos específicos (`FILE_READ_DATA`, `FILE_READ_ATTRIBUTES`, `READ_CONTROL`, `SYNCHRONIZE`). ⚠ E essa tradução é **onde o comportamento surpreende**: pedir acesso "igual" em dois arquivos pode gerar requisitos diferentes.

```c
// O que a kernel32 faz por baixo (simplificado)
// CreateFileW(GENERIC_READ) vira:
//   NtCreateFile(..., DesiredAccess = FILE_GENERIC_READ, ...)
// onde FILE_GENERIC_READ = FILE_READ_DATA | FILE_READ_ATTRIBUTES |
//                         FILE_READ_EA | STANDARD_RIGHTS_READ |
//                         SYNCHRONIZE
```

---

## 1.5 Syscall direta: por que existe

⚠ **Chamar `NtCreateFile` do `ntdll` deixa rastro:** hooks de EDR são instalados **nos stubs** da `ntdll`, em ring 3. Se o seu código emite a instrução `syscall` sozinho, **o hook não roda**.

```asm
; Stub normal de ntdll (o que o EDR intercepta)
;   mov r10, rcx
;   mov eax, 55h          ← ⚠ numero da build
;   syscall
;   ret

; Syscall direta (o que pula a ntdll)
;   mov r10, rcx
;   mov eax, 55h          ← ⚠ mesmo numero, sem stub
;   syscall
;   ret
```

⚠ **Três problemas que tornam isso frágil, e é o ponto didático:**

1. **O número muda entre builds do Windows.** Um programa com números fixos quebra em atualização.
2. ⚠ **É detectável.** Nenhuma instrução `syscall` legítima vem de fora de `ntdll` — o endereço de retorno fica num módulo anômalo, e há telemetria de kernel (`ETW`, `KiSystemCall`) que olha isso.
3. ⚠ **O hook não é a única camada.** O kernel tem callbacks próprios de processo, thread, objeto, imagem — e esses rodam do lado de dentro, onde a syscall direta não ajuda.

⚠ **A lição estrutural:** a técnica existe porque **a observação em ring 3 é contornável**, e não porque ela funcione. Quem entende *onde a telemetria mora* entende o limite da técnica — é a ponte para o módulo 12.

---

## 1.6 Ler a travessia você mesmo

⚠ **O exercício que se repetirá em todo o curso:** não aceitar a camada de cima.

```powershell
# 1. Que modulos este processo carregou?
Get-Process notepad | Select-Object -ExpandProperty Modules |
  Select-Object ModuleName, FileName -First 20

# 2. As funcoes que a ntdll exporta
dumpbin /exports C:\Windows\System32\ntdll.dll | Select-String 'NtCreate'

# 3. O stub da NtCreateFile, com o numero da build
#    (precisa do WinDbg)
#    windbg -c "u ntdll!NtCreateFile L6; q" notepad.exe

# 4. Uma alternativa sem depurador: o padrao dos stubs
#    ⚠ todo stub Nt* comeca com mov r10,rcx; mov eax,<n>
```

```c
// 5. Chamar a syscall direto, para ver a fronteira
//    (⚠ o numero 0x55 e de ISSO build — vai falhar em outra)
#include <windows.h>
#include <stdio.h>

typedef NTSTATUS (NTAPI *NtQuerySystemTime_t)(PLARGE_INTEGER);

int main(void) {
    HMODULE ntdll = GetModuleHandleW(L"ntdll.dll");
    NtQuerySystemTime_t f = (NtQuerySystemTime_t)
        GetProcAddress(ntdll, "NtQuerySystemTime");   // ⚠ vem da ntdll
    LARGE_INTEGER t;
    NTSTATUS s = f(&t);
    printf("NTSTATUS=0x%08lx  (0 = sucesso)\n", s);
    return 0;
}
```

⚠ **Note o passo 5:** você chamou `Nt*` **direto da `ntdll`**, pulando a `kernel32`. Já é meio caminho — e é o que a maioria dos binários maliciosos faz, porque reduz a rastreabilidade na API de cima.

---

## Laboratório 1 — Ver as camadas

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```powershell
cd C:\lab
mkdir m01; cd m01

# 1. Confirmar que kernel32 roda em ring 3
#    Um erro de acesso em kernel32 NAO derruba o sistema.
#    ⚠ Se kernel32 estivesse em ring 0, seria bugcheck.

# 2. As camadas de um processo qualquer
Get-Process explorer | Select-Object -ExpandProperty Modules |
  Select-Object ModuleName -Unique | Select-String 'kernel32|ntdll|kernelbase|advapi32'

# 3. Compilar o programa do 1.6 (passo 5)
cl /nologo /W4 ntquery.c /link /out:ntquery.exe
.\ntquery.exe

# 4. Ver o resultado no formato NTSTATUS vs Win32
#    Compare: NTSTATUS 0xC0000034 = STATUS_OBJECT_NAME_NOT_FOUND
#             Win32    ERROR_FILE_NOT_FOUND (2)
```

```powershell
# 5. A traducao NTSTATUS -> Win32, com o RtlNtStatusToDosError
#    ⚠ E a perda de informacao: varios NTSTATUS viram um so Win32
#    Consulte a tabela:
#    C0000022 STATUS_ACCESS_DENIED          -> 5
#    C0000034 STATUS_OBJECT_NAME_NOT_FOUND  -> 2
#    C0000043 STATUS_OBJECT_NAME_COLLISION  -> 183
```

**O que observar:** no passo 4, o `NTSTATUS` carrega **mais informação** que o código `Win32`. ⚠ Quando um programa diz "acesso negado", o `NTSTATUS` real diz *por que* — e é por isso que um analista olha o `NTSTATUS`, não o `GetLastError`.

**Exercício 1:** liste cinco pares `Win32` → `Nt*` (por exemplo `CreateFile`/`NtCreateFile`) e escreva, para cada par, o que a camada `Win32` acrescenta ou esconde.

**Exercício 2:** abra `ntdll.dll` no `dumpbin` e conte quantos símbolos começam com `Nt` e quantos com `Zw`. ⚠ Depois explique por que a contagem é praticamente idêntica — e o que isso revela sobre a diferença entre os dois prefixos.

**Exercício 3 (o que vale):** escreva um programa que provoque `STATUS_ACCESS_DENIED` de **três formas diferentes** (arquivo sem permissão, processo de outro usuário, objeto com `SecurityDescriptor` restritivo). ⚠ As três podem retornar `ERROR_ACCESS_DENIED` na camada `Win32` — mostre que os `NTSTATUS` são idênticos mas as **causas** não. É o raciocínio que o módulo 9 (token) formaliza.

---

## Resumo

- A arquitetura tem **cinco camadas**: aplicação, `Win32` (ring 3), `ntdll` (ring 3), instrução `syscall`, kernel (ring 0).
- ⚠ **`kernel32.dll` não é o kernel** — roda em ring 3, com o privilégio do seu código.
- ⚠ **`eax` no Windows é índice na SSDT, não um syscall number estável** — muda entre builds.
- **`Nt*` valida ponteiro e respeita `PreviousMode`; `Zw*` não valida** — porque o chamador é o kernel.
- ⚠ **O `Win32` mente em cinco pontos**, e o mais importante é a tradução de `GENERIC_*` para direitos específicos.
- **Syscall direta existe porque os hooks de EDR vivem nos stubs de `ntdll`** — e é frágil por três razões, a terceira sendo que o kernel tem callbacks próprios.

---

## O que o próximo módulo entrega

Você sabe atravessar a fronteira. O módulo 2 abre o que existe do outro lado para um processo: **`EPROCESS`, `ETHREAD`, `KPROCESS` e `KTHREAD`** — as estruturas que definem o que um processo é, e onde o Windows difere estruturalmente do Linux.
