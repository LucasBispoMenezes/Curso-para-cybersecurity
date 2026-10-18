# Módulo 6 — `PE`, `PEB` e `TEB`: O Que o Processo Sabe de Si Mesmo

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 6 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 5
**Próximo:** Módulo 7 — Registro

---

## O que este módulo entrega

Ao final, você vai saber **ler um binário `PE`** — o formato, as seções, os imports — e **navegar `PEB` e `TEB`**, as estruturas onde o processo guarda o que sabe de si. Você vai entender por que essas três coisas são alvo constante de manipulação, e **o que a manipulação consegue esconder**.

---

## 6.1 `PE`: o formato do binário

⚠ **O `PE` (*Portable Executable*) é o formato de `.exe`, `.dll`, `.sys`** — todos. Três conceitos governam a leitura:

```
   DOS HEADER
   └── e_lfanew  ──►  NT HEADERS
                        ├── FILE HEADER       (machine, secoes, timestamp)
                        └── OPTIONAL HEADER   (entry point, ImageBase, subsystem)
                             │
                             ▼
                        SECTION TABLE  ──►  .text  .data  .rdata  .rsrc
                        DATA DIRECTORIES ──►  import, export, reloc, debug, TLS
```

⚠ **Quatro peças explicam 90% da análise:**

| Peça | O que diz |
|---|---|
| **`AddressOfEntryPoint`** | ⚠ Onde a execução começa — e é o que um packer costuma mover |
| **ImageBase** | ⚠ Endereço preferido — com ASLR, o real difere |
| **Import table** | ⚠ Que funções de que DLLs o binário usa |
| **Sections** | ⚠ Nomes, tamanhos e permissões de cada região |

⚠ **A leitura de segurança está na tabela de imports.** As funções importadas dizem o que o binário sabe fazer:

| Import | O que revela |
|---|---|
| `VirtualAllocEx` + `WriteProcessMemory` | ⚠ **Injeção** em outro processo |
| `CreateRemoteThread` | ⚠ Execução em outro processo |
| `SetWindowsHookEx` | Interceptação |
| `NtUnmapViewOfSection` | ⚠ Desmapeamento — usado em *process hollowing* |
| `AdjustTokenPrivileges` | ⚠ Manipulação de privilégio |
| `CryptEncrypt` | Cifra — pode ser legítimo ou C2 |

```powershell
# Analise estatica com ferramentas do SDK
dumpbin /headers C:\Windows\System32\notepad.exe
dumpbin /imports C:\Windows\System32\notepad.exe
dumpbin /exports C:\Windows\System32\ntdll.dll | Select-String 'NtCreate'

# E a versao do loader
dumpbin /headers C:\Windows\System32\notepad.exe | Select-String 'subsystem|entry'
```

⚠ **A seção `.reloc` merece nota:** ela permite que o binário funcione em endereço diferente do preferido — é o **ASLR** em ação. Um binário **sem** `.reloc` não pode ser relocado, e o loader é obrigado a carregá-lo no `ImageBase` — o que **reduz** a aleatoriedade.

---

## 6.2 `PEB`: o que o processo sabe de si

⚠ **O `PEB` (*Process Environment Block*) fica em ring 3** — na memória do processo, legível sem privilégio.

```c
struct _PEB {
    BYTE InheritedAddressSpace;
    BYTE ReadImageFileExecOptions;
    BYTE BeingDebugged;              // ⚠ o "estou sendo depurado?"
    // ...
    PVOID ImageBaseAddress;          // ⚠ base do executavel
    PPEB_LDR_DATA Ldr;               // ⚠ O LOADER
    PRTL_USER_PROCESS_PARAMETERS ProcessParameters;  // ⚠ linha de comando!
    PVOID ProcessHeap;               // ⚠ o heap padrao
    // ...
    PPEB_LDR_DATA ...

};
```

⚠ **Quatro campos definem a superfície, e cada um é usado por um tipo de técnica:**

| Campo | O que revela | Uso ofensivo |
|---|---|---|
| **`BeingDebugged`** | ⚠ Se há depurador | Anti-análise: o binário muda de comportamento |
| **`Ldr`** | ⚠ Lista dos módulos carregados | ⚠ **Esconder uma DLL** da enumeração |
| **`ProcessParameters`** | ⚠ Linha de comando, diretório, caminho | Manipular o que o processo "acha" que foi chamado |
| **`ImageBaseAddress`** | Base do `.exe` | ⚠ *Process hollowing*: trocar o conteúdo e deixar a estrutura |

⚠ **O `Ldr` é o mais importante, e vale entender o mecanismo.** A lista de módulos é uma **lista ligada dupla** (`InLoadOrderModuleList`, `InMemoryOrderModuleList`, `InInitializationOrderModuleList`). ⚠ **Desvincular uma entrada esconde o módulo de tudo que lê essa lista** — inclusive de ferramentas de enumeração que usam a API documentada.

⚠ **E a defesa é a mesma que no módulo 2:** a lista **não é a única fonte**. Ferramentas de resposta a incidente comparam a lista do `PEB` com a lista de **regiões de memória mapeadas** — se há código executável em uma região que não corresponde a módulo na lista, algo está escondido.

```windbg
# O PEB, de dentro e de fora
kd> !peb                          # ⚠ a versao do depurador
dt nt!_PEB -a | head -40
dt nt!_PEB_LDR_DATA -a
dt nt!_LDR_DATA_TABLE_ENTRY -a | head -30

# A lista de modulos
!peb
* ⚠ percorra InLoadOrderModuleList a mao e compare com as regioes:
!vad <ENDERECO_DO_EPROCESS>
```

---

## 6.3 `TEB`: o que a thread sabe de si

```c
struct _TEB {
    NT_TIB NtTib;                    // ⚠ inclui StackBase, StackLimit, SEH
    PVOID EnvironmentPointer;
    CLIENT_ID ClientId;              // ⚠ PID e TID
    PVOID ActiveRpcHandle;
    PVOID ThreadLocalStoragePointer; // ⚠ TLS
    // ...
    PVOID LastErrorValue;           // ⚠ GetLastError le DAQUI
    // ...
};
```

⚠ **Dois campos merecem destaque:**

⚠ **`NtTib`** — a estrutura que contém `StackBase`, `StackLimit`, `ExceptionList` (a cadeia de `SEH`) e `FiberData`. Como o `PTEB` é alcançável pelo registrador de segmento (`gs:[0x30]` em x64), **a cadeia de exceção e a pilha são alcançáveis sem nenhuma API** — é por isso que o mecanismo de `SEH` é alvo clássico de exploração.

⚠ **`LastErrorValue`** — o campo que `GetLastError` lê. ⚠ Ele é **por thread**, não por processo. É a razão de `GetLastError` retornar valor diferente em threads diferentes, e a razão de a leitura estar no `TEB`.

```windbg
kd> !teb                          # ⚠ a versao do depurador
dt nt!_TEB -a | head -40
dt nt!_NT_TIB -a
dt nt!_TEB <ENDERECO> LastErrorValue

# ⚠ O acesso direto pelo registrador, sem API
# em x86-64: gs:[0x30] aponta para o TEB
```

---

## 6.4 O loader, em sequência

⚠ **O que acontece entre o `CreateProcess` e o `main`** — e é aqui que a manipulação pode intervir:

```
   1. kernel cria o processo, com a secao da imagem mapeada
        │
   2. cria a thread inicial
        │
   3. ⚠ LdrInitializeThunk         (ntdll)
        │   - cria o PEB, o heap, o TEB
        │   - preenche ProcessParameters
        │
   4. ⚠ LdrpInitializeProcess
        │   - mapeia ntdll, kernel32 ...
        │   - resolve imports
        │   - aplica relocations
        │
   5. roda os TLS callbacks        ⚠ ANTES do entry point
        │
   6. chama AddressOfEntryPoint
        │
   7. CRT init, depois o main
```

⚠ **Dois pontos onde a manipulação acontece:**

⚠ **Passo 5 — TLS callbacks rodam ANTES do entry point.** Um binário pode fazer trabalho no callback de TLS e ter um entry point **inofensivo**. Ferramenta que só olha o `AddressOfEntryPoint` **não vê nada**.

⚠ **Passo 4 — a resolução de import é interceptável.** Um binário pode resolver imports por conta própria (`LoadLibrary` + `GetProcAddress`) em vez de declarar na tabela — o que deixa a **import table limpa**, e a `dumpbin /imports` vazia de qualquer coisa suspeita.

```windbg
# Os callbacks de TLS e a ordem real de inicializacao
!peb
dt nt!_PEB_LDR_DATA <ENDERECO> -a
# ⚠ e a comparacao com a tabela de imports ESTATICA do arquivo
```

---

## 6.5 O heap do processo

⚠ **`PEB->ProcessHeap` é o heap padrão** — o do `malloc`/`HeapAlloc`. Ele é gerido no userspace, com estruturas próprias.

| Conceito | Onde |
|---|---|
| `PEB->ProcessHeap` | ⚠ O heap padrão |
| `HeapCreate` | Heaps adicionais |
| Segmentos e blocos | Estruturas internas |
| ⚠ `RtlAllocateHeap` | A rotina de alocação |

⚠ **O heap do **usuário** é alvo de exploração clássica** — overflow, UAF e corrupção de metadados. A diferença em relação ao pool é de **alcance**: corromper o heap afeta **o processo**; corromper o pool afeta **o sistema**.

⚠ **E a lição estrutural:** o mesmo padrão de bug existe nas duas camadas, com **impacto diferente**. É o que o módulo 5 mostrou na tabela, e o que o curso de Pesquisa em Windows assume ao escolher alvo: **quem quer impacto de sistema vai para o pool, não para o heap**.

---

## 6.6 Detecção: as duas fontes que se contradizem

⚠ **O método que fecha o módulo, e que se aplica a qualquer ocultação:**

```
   FONTE A: a lista do PEB        (o que o processo DIZ que carregou)
   FONTE B: as regioes de memoria (o que o kernel MAPEOU)

   ⚠ Compare:
     - modulo na lista A que nao esta em B  ->  inconsistencia
     - regiao executavel em B que nao esta em A  ->  ⚠ OCULTACAO
```

⚠ **É o mesmo princípio do curso de Detecção e Evasão:** a detecção boa não pergunta "há algo suspeito?", pergunta **"duas fontes independentes concordam?"**. Uma fonte só é falsificável; duas fontes que deveriam concordar e não concordam produzem achado.

```powershell
# Fonte A: o que os APIs dizem
Get-Process notepad | Select-Object -ExpandProperty Modules | Select-Object ModuleName

# Fonte B: o que esta mapeado
# ⚠ compare com a lista de regioes executaveis do processo
#    ferramentas de analise de memoria fazem isso; no lab, faca a mao
```

---

## Laboratório 6 — Ler o binário e o PEB

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```powershell
cd C:\lab; mkdir m06; cd m06

# 1. Analise estatica do PE
dumpbin /headers C:\Windows\System32\notepad.exe | Select-Object -First 40
dumpbin /imports C:\Windows\System32\notepad.exe | Select-Object -First 40
dumpbin /headers C:\Windows\System32\notepad.exe | Select-String 'reloc'

# 2. Compare um binario com e sem .reloc
#    ⚠ procure um .exe sem .reloc no sistema e explique o que isso implica
```

```c
// 3. Ler o PEB direto, sem API de alto nivel
#include <windows.h>
#include <winternl.h>
#include <stdio.h>

int main(void) {
    // ⚠ o TEB pelo registrador de segmento, o PEB pelo TEB
    PPEB peb = (PPEB)__readgsqword(0x60);

    printf("PEB em            %p\n", (void*)peb);
    printf("BeingDebugged     %d\n", peb->BeingDebugged);
    printf("ImageBaseAddress  %p\n", peb->ImageBaseAddress);
    printf("ProcessHeap       %p\n", peb->ProcessHeap);

    // ⚠ a linha de comando, direto do PEB
    PWSTR cmd = peb->ProcessParameters->CommandLine.Buffer;
    wprintf(L"CommandLine       %s\n", cmd);
    return 0;
}
```

```
# 4. No WinDbg, a lista de modulos pela mao
!peb
dt nt!_PEB <ENDERECO> Ldr
dt nt!_PEB_LDR_DATA <ENDERECO> -a
# ⚠ percorra InLoadOrderModuleList e anote o primeiro modulo
# ⚠ compare com !vad do processo: os enderecos batem?
```

**O que observar:** no passo 3, o `CommandLine` vem do `PEB`, **não do CRT**. ⚠ Isso significa que a "linha de comando" é um **dado na memória do processo**, e não uma verdade do kernel — o que abre a porta para manipulação.

**Exercício 1:** liste os imports de `notepad.exe` e **classifique cada um** em: legítimo, potencialmente perigoso, ou inócuo. Para os perigosos, escreva em que cenário eles seriam suspeitos.

**Exercício 2:** escreva um programa que altere o `PEB->BeingDebugged` para `0` e rode-o sob o `WinDbg`. ⚠ Depois explique: a alteração **esconde** você do depurador, ou ela apenas engana o programa que consulta o campo? Escreva a resposta em duas linhas.

**Exercício 3 (o que vale):** faça a comparação do 6.6 no `WinDbg`: liste os módulos pela lista do `PEB` e liste as regiões mapeadas via `!vad`. ⚠ Encontre **uma** inconsistência — mesmo que seja uma região legítima que não aparece como módulo (como o heap executável ou uma *JIT* de .NET). Escreva as duas listas e a conclusão. É o método de detecção que a ocultação de módulo exige.

---

## Resumo

- **`PE`** é o formato de `.exe`, `.dll` e `.sys`; o `AddressOfEntryPoint` e a **import table** são o essencial da análise.
- ⚠ **A import table diz o que o binário sabe fazer** — `VirtualAllocEx`, `WriteProcessMemory`, `CreateRemoteThread`.
- ⚠ **TLS callbacks rodam ANTES do entry point** — quem só olha o entry point não vê nada.
- **`PEB` fica em ring 3**: `BeingDebugged`, `Ldr`, `ProcessParameters`, `ImageBaseAddress`.
- ⚠ **A lista do `Ldr` é uma lista ligada — desvincular esconde o módulo** de toda enumeração que a usa.
- **`TEB`** guarda `NtTib` (pilha, `SEH`) e `LastErrorValue` (por **thread**).
- ⚠ **A detecção de ocultação compara duas fontes**: a lista do `PEB` contra as regiões realmente mapeadas.

---

## O que o próximo módulo entrega

Você sabe ler binário e processo. O módulo 7 abre o **registro** — que no Windows é **objeto** também — no nível do `hive`, da transação e da persistência que a API **não mostra**.
