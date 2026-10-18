# Módulo 4 — Handle: A Tabela, o Direito, e o Que Ela Autoriza

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 4 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 3
**Próximo:** Módulo 5 — Memória

---

## O que este módulo entrega

Ao final, você vai entender **como um processo alcança um objeto**, **o que o valor do `HANDLE` realmente é**, e por que **um handle herdado ou duplicado é uma via de escalação**. É o módulo que transforma `HANDLE` de número mágico em estrutura — e o que o módulo 6 (registro) e o módulo 9 (token) assumem.

---

## 4.1 `HANDLE` não é ponteiro — é índice

⚠ **A distinção que organiza o módulo:**

| | Ponteiro | `HANDLE` |
|---|---|---|
| O que é | ⚠ Endereço na memória | ⚠ **Índice** em uma tabela **por processo** |
| Vale em outro processo? | Sim, se mapeado | ⚠ **Não** — a tabela é do processo |
| Reutilizado? | Não enquanto válido | ⚠ **Sim** — e é aí que mora o bug |
| O que carrega | Localização | ⚠ **Direito de acesso** |

```c
// O valor do handle e um indice, com multiplicidade
// 0x4   -> indice 0x1, na tabela do processo
// 0x8   -> indice 0x2
// 0xC   -> indice 0x3     ⚠ multiplos de 4, e o bit baixo e flag
//
// ⚠ Consequencia: cada processo tem o PROPRIO numero,
//    apontando para um objeto DIFERENTE.
```

⚠ **Consequência imediata e prática:** você **não pode** abrir um handle em um processo e usá-lo em outro. O que viaja entre processos é o **objeto** (via `DuplicateHandle`), não o número.

---

## 4.2 A tabela de handles

```
   EPROCESS
     └── ObjectTable  ──►  HANDLE_TABLE
                              │
                              ├── TableCode ►  ┌──────┬──────┬──────┐
                              │                 │ idx0 │ idx1 │ idx2 │ ...
                              │                 └──────┴──────┴──────┘
                              │                    │
                              │                    ▼
                              │            _HANDLE_TABLE_ENTRY
                              │            ┌──────────────────────┐
                              │            │ ObjectPointer  ──────┼──► objeto
                              │            │ GrantedAccess  ⚠     │    + OBJECT_HEADER
                              │            │ (bits)               │      | atributos
                              │            └──────────────────────┘
```

⚠ **A `_HANDLE_TABLE_ENTRY` carrega três informações, e a segunda é o coração do módulo:**

| Campo | O que é |
|---|---|
| `ObjectPointer` | ⚠ Para o objeto (com bits baixos usados como flag) |
| **`GrantedAccess`** | ⚠ **O DIREITO concedido naquele handle** |
| bits de atributo | `Inherit`, `ProtectFromClose`, auditoria |

⚠ **`GrantedAccess` é a informação que quase ninguém considera:** o direito **não pertence ao objeto** — pertence ao **handle**. E ele é verificado **no momento da abertura**, contra o `SecurityDescriptor`. Depois, é **congelado**.

⚠ **Isso significa:** se o `SecurityDescriptor` do objeto mudar depois, **os handles já abertos não são reavaliados**. Um objeto que passou a ser restrito continua alcançável pelos handles antigos. É uma característica de desenho — e origem de confusão em investigação.

```windbg
# A tabela de um processo
dt nt!_EPROCESS <ENDERECO> ObjectTable
dt nt!_HANDLE_TABLE -a | head -30
dt nt!_HANDLE_TABLE_ENTRY -a | head -20

# Handles concretos
!handle 0 0 <PID>            # resumo
!handle 0 f <PID>            # ⚠ com o GrantedAccess de cada um
!handle <HANDLE> f <PID>     # um so, detalhado
```

---

## 4.3 As máscaras de acesso

```c
// Direitos GENERICOS — a kernel32 TRADUZ antes de chamar o kernel
#define GENERIC_READ     0x80000000
#define GENERIC_WRITE    0x40000000
#define GENERIC_EXECUTE  0x20000000
#define GENERIC_ALL      0x10000000

// ⚠ E o kernel NAO os entende — o tipo tem um GenericMapping
//    que traduz para direitos ESPECIFICOS do tipo

// Direitos de objeto (valem para quase todo tipo)
#define SYNCHRONIZE                0x00100000
#define READ_CONTROL               0x00020000    // ler o SD
#define WRITE_DAC                  0x00040000    // ⚠ mudar a DACL
#define WRITE_OWNER                0x00080000    // ⚠ mudar o dono

// Especificos de tipo (exemplos)
// File:    FILE_READ_DATA, FILE_WRITE_DATA, FILE_APPEND_DATA, FILE_DELETE_CHILD
// Process: PROCESS_TERMINATE, PROCESS_VM_READ, PROCESS_VM_WRITE,
//          PROCESS_CREATE_THREAD, PROCESS_DUP_HANDLE, PROCESS_QUERY_INFORMATION
// Key:     KEY_READ, KEY_WRITE, KEY_SET_VALUE, KEY_CREATE_SUB_KEY
```

⚠ **Três direitos merecem atenção especial, e por razão de segurança:**

| Direito | O que permite | Por que importa |
|---|---|---|
| **`PROCESS_VM_READ`** | ⚠ Ler a memória do alvo | Vazamento de segredo |
| **`PROCESS_VM_WRITE`** | ⚠ **Escrever** na memória do alvo | ⚠ Injeção |
| **`PROCESS_CREATE_THREAD`** | Criar thread no alvo | ⚠ Execução remota de código |
| **`PROCESS_DUP_HANDLE`** | ⚠ **Duplicar handles do alvo** | ⚠ Handles privilegiados |
| **`WRITE_DAC`** | ⚠ Mudar a permissão do objeto | ⚠ Escalação direta |
| **`WRITE_OWNER`** | ⚠ Tornar-se dono (dono sempre pode mudar DACL) | ⚠ Escalação direta |

⚠ **`PROCESS_DUP_HANDLE` é o menos conhecido e um dos mais úteis para escalação:** com ele, você **copia para si um handle que o processo alvo tem** — inclusive um handle que você não conseguiria abrir sozinho. Se o alvo privilegiado tem um handle para o token de `SYSTEM`, duplicar resolve o problema de acesso.

```powershell
# Quem tem processo aberto, e com que acesso
Get-Process -Id $PID | Select-Object HandleCount
# ⚠ Para ver quem abriu handle de quem, use handle.exe (Sysinternals)
```

---

## 4.4 Herança, duplicação e o problema de handle

⚠ **Handle é transferível de três formas, e as três são via de escalação:**

| Mecanismo | Como funciona | Risco |
|---|---|---|
| **`bInheritHandles`** | ⚠ Filho herda handles marcados como herdáveis | ⚠ **Handle vazado** para processo menos privilegiado |
| **`DuplicateHandle`** | Copia handle para outro processo | ⚠ Precisa de `PROCESS_DUP_HANDLE` |
| **`NtQuerySystemInformation`** | Lista handles do sistema | Só leitura, mas informa alvo |

⚠ **O primeiro é o clássico, e aparece na prática:** um processo privilegiado cria um handle para **token de `SYSTEM`**, um objeto de serviço ou uma seção de memória — e cria um processo filho **com herança ligada**. O filho, mesmo com menos privilégio, recebe o handle.

```
   Servico (SYSTEM)                       Processo filho (usuario)
   ────────────────                       ────────────────────────

   OpenProcessToken(SYSTEM)  ──► handle
                                    │
                                    │ ⚠ CreateProcess(bInheritHandles = TRUE)
                                    ▼
                              handle herdado, com direito completo
                                    │
                                    ▼
                              ImpersonateLoggedOnUser() ou
                              use direto do objeto
                                    │
                                    ▼
                              ⚠ ESCALACAO, sem explorar bug nenhum
```

⚠ **É a razão de existir a regra de não herdar handle de serviço** — e de o `CreateProcessAsUser` de serviço moderno usar `PROC_THREAD_ATTRIBUTE_HANDLE_LIST` com a lista **explícita**.

⚠ **E note o que este bug tem em comum com o módulo 7 do Linux:** **não é bug de kernel**. É **desenho** — o mecanismo de herança faz o que promete, e a falha está em quem o usa. A classe é a mesma: semântica de permissão.

---

## 4.5 Handles que você não deveria ter

⚠ **A auditoria que este módulo permite fazer, e o que procurar:**

```
   1. Handles de processo  ->  alguem pode injetar em quem?
   2. Handles de token     ->  quem pode virar quem?
   3. Handles de secao     ->  quem compartilha memoria com quem?
   4. Handles de driver    ->  quem pode enviar IOCTL?
   5. Heranca aberta       ->  a criacao de processo herda tudo?
```

```powershell
# Ferramentas de auditoria de handle
# handle.exe (Sysinternals) — por processo e por objeto
handle.exe -p notepad
handle.exe -a -u usuario      # ⚠ handles de um usuario

# Para processo e token especificos
handle.exe -a -p lsass
```

⚠ **O caso didático é o `lsass.exe`:** ele roda como `SYSTEM` e guarda credencial. Quem tem `PROCESS_VM_READ` nele **lê segredo**; quem tem `PROCESS_CREATE_THREAD` **injeta**. É por isso que existe o `PPL` (*Protected Process Light*) — módulo 8 —, cujo trabalho é **recusar até handles legítimos** de quem não tem assinatura específica.

---

## 4.6 Correlação com o Linux

⚠ **A tabela que fecha os dois cursos, e vale escrever:**

| Linux | Windows |
|---|---|
| `fd` — índice na tabela do processo | `HANDLE` — índice na tabela do processo |
| `struct file` — o objeto | `_HANDLE_TABLE_ENTRY` — aponta o objeto |
| ⚠ Direito **verificado a cada operação** | ⚠ **`GrantedAccess` congelado na abertura** |
| `fget(fd)` a cada uso | Handle reusado — ⚠ **o mesmo problema de reciclagem** |
| `dup()` | `DuplicateHandle()` |
| Herança de `FD_CLOEXEC` | Herança de `bInheritHandles` |

⚠ **A segunda linha é a diferença mais profunda.** No Linux, o direito é reavaliado a cada `read`/`write`; no Windows, é decidido na abertura e **congelado no handle**. Isso significa que **revogar permissão não afeta handle aberto** — e é uma característica de segurança por um lado (previsível) e um risco por outro (a revogação não é imediata).

⚠ **A última linha é a mesma classe de bug nos dois sistemas:** handle é índice, índice é reutilizado, e usar handle obsoleto alcança **outro objeto**. É a versão Windows do UAF que o curso de Linux Internals tratou.

---

## Laboratório 4 — Ler a tabela

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```powershell
cd C:\lab; mkdir m04; cd m04

# 1. Os handles do processo atual
Get-Process -Id $PID | Select-Object Id, ProcessName, HandleCount
(Get-Process -Id $PID).Handles | Select-Object -First 10 Handle, Type, Name

# 2. Com ferramenta dedicada
handle.exe -p $PID | Select-Object -First 25
#    ⚠ observe a coluna de acesso (Granted)
```

```c
// 3. Duplicar um handle entre processos
#include <windows.h>
#include <stdio.h>

int main(int argc, char **argv) {
    DWORD pid = (DWORD)atoi(argv[1]);
    HANDLE hProc = OpenProcess(PROCESS_DUP_HANDLE, FALSE, pid);
    if (!hProc) { printf("OpenProcess falhou: %lu\n", GetLastError()); return 1; }

    // ⚠ abre um handle proprio e duplica PARA o alvo
    HANDLE hFile = CreateFileW(L"C:\\lab\\m04\\alvo.txt",
                               GENERIC_READ, 0, NULL, OPEN_ALWAYS, 0, NULL);
    HANDLE hDup = NULL;
    if (DuplicateHandle(GetCurrentProcess(), hFile,
                        hProc, &hDup, 0, FALSE, DUPLICATE_SAME_ACCESS))
        printf("duplicado com sucesso\n");
    else
        printf("DuplicateHandle falhou: %lu\n", GetLastError());
    return 0;
}
```

```
# 4. No WinDbg, a tabela crua
dt nt!_EPROCESS <ENDERECO> ObjectTable
dt nt!_HANDLE_TABLE -a
!handle 0 f <PID>          # ⚠ todos os handles com GrantedAccess

# 5. A mascara de direito, legivel
#    escolha um handle e decodifique o GrantedAccess:
#      0x0012019f  ->  PROCESS_QUERY_INFORMATION |
#                      PROCESS_VM_READ | SYNCHRONIZE | ...
#    ⚠ use uma tabela de mascaras do SDK (winnt.h)
```

**O que observar:** no passo 5, que o `GrantedAccess` **não é** `GENERIC_READ` — é a tradução dele em direitos específicos. ⚠ E que dois handles para o **mesmo** arquivo podem ter `GrantedAccess` **diferente**, se foram abertos com pedidos diferentes.

**Exercício 1:** abra o mesmo arquivo três vezes — com `GENERIC_READ`, com `FILE_APPEND_DATA`, e com `SYNCHRONIZE`. No WinDbg, imprima o `GrantedAccess` dos três e decodifique cada máscara. ⚠ Escreva por que os três handles apontam para o mesmo objeto e ainda assim concedem coisas diferentes.

**Exercício 2:** escreva um programa que cria um processo filho com `bInheritHandles = TRUE`, tendo aberto antes um handle para um arquivo. No filho, liste os próprios handles e **encontre o handle herdado**. Depois repita com `FALSE` e escreva o que mudou.

**Exercício 3 (o que vale):** no `WinDbg`, encontre no `lsass.exe` um handle com `PROCESS_VM_READ` e outro com `PROCESS_CREATE_THREAD`. Liste **todos os processos** que têm handle para `lsass` e com que direito. ⚠ Escreva a tabela, e para cada linha responda: isso é esperado? É o exercício que o módulo 8 (*PPL*) assume — e o que a auditoria de sistema faz de verdade.

---

## Resumo

- ⚠ **`HANDLE` é índice, não ponteiro** — vive na tabela **do processo** e não vale em outro.
- A `_HANDLE_TABLE_ENTRY` carrega `ObjectPointer` e ⚠ **`GrantedAccess`** — o direito pertence ao **handle**, não ao objeto.
- ⚠ **`GrantedAccess` é congelado na abertura** — mudar o `SecurityDescriptor` depois **não** reavalia handles existentes.
- **`GENERIC_*` é traduzido** pelo `GenericMapping` do tipo — o kernel não entende `GENERIC_READ`.
- Direitos críticos: `PROCESS_VM_WRITE`, `PROCESS_CREATE_THREAD`, `PROCESS_DUP_HANDLE`, `WRITE_DAC`, `WRITE_OWNER`.
- ⚠ **`PROCESS_DUP_HANDLE` copia handle que você não conseguiria abrir** — é via de escalação.
- ⚠ **Herança de handle (`bInheritHandles`)** dá a processo menos privilegiado um handle privilegiado — e ⚠ **não é bug de kernel, é desenho**, igual ao módulo 7 do Linux.

---

## O que o próximo módulo entrega

Você sabe como o processo alcança um objeto. O módulo 5 abre **onde o dado vive**: `VAD`, pool `Paged` e `NonPaged`, e a memória do kernel — com as classes de corrupção que o curso de Pesquisa em Windows trata no módulo 3.
