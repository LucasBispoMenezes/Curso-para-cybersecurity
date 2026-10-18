# Glossário — Windows Internals: O Objeto, o Handle e o Ring 0

**Termos do curso, definidos uma vez, em ordem alfabética**

---

## A

**`ACG` (*Arbitrary Code Guard*)** — Impede criar página **executável** que não venha de imagem assinada. ⚠ **`VirtualProtect` e JIT legítimos passam** — é por isso que aparece em processos específicos, não no sistema todo.

**`ActiveProcessLinks`** — Lista dupla que encadeia **todos** os processos. ⚠ Subtrair um processo dela o esconde (DKOM) — e é por isso que existe telemetria que não a usa.

**`ALPC`** — *Advanced Local Procedure Call*. ⚠ Base da comunicação local no Windows; sobre ela rodam `RPC` e `COM`. O cliente e o servidor se encontram em um objeto `Port`.

**`AMSI`** — *Antimalware Scan Interface*. ⚠ Inspeciona **conteúdo de linguagem** (PowerShell, .NET, macro), e **não** binário nativo.

**`ASLR`** — Aleatoriedade de endereço. ⚠ Depende de `.reloc` no `PE`; e `EnumProcessModules` **vaza a base sem privilégio**.

---

## C

**Callback de kernel** — Registro explícito (`PsSetCreateProcessNotifyRoutineEx`, `ObRegisterCallbacks`). ⚠ Não depende de emissão — é o kernel avisando —, mas cobre menos que `ETW`.

**`CFG` (*Control Flow Guard*)** — Valida chamadas **indiretas**: o destino tem de ser um alvo válido. ⚠ Não valida **intenção**, e não vê chamada direta.

**`COM`** — Modelo de objetos que roda **sobre** `RPC`.

---

## D

**`DACL`** — Lista de controle de acesso discricionário: **quem pode o quê**. ⚠ **Ausente = acesso TOTAL**; **vazia = nega tudo**. É a pegadinha central do modelo.

**DEP** — *Data Execution Prevention*. Impede executar dado. ⚠ Contornada por **ROP**, que reutiliza código existente.

**DKOM** — *Direct Kernel Object Manipulation*. Alterar estruturas do kernel direto. ⚠ Subtrair um processo de `ActiveProcessLinks` é o caso clássico.

**Driver Verifier** — Instrumento de verificação de driver. ⚠ O **`KASAN`** do Windows. O ***special pool*** coloca o bloco no fim da página, fazendo o overflow atingir página inválida.

---

## E

**`EPROCESS`** — Estrutura **executive** do processo: recursos, objeto, handles, token. ⚠ `Pcb` (`KPROCESS`) fica no **offset zero**.

**`ETHREAD`** — Estrutura **executive** da thread. ⚠ `Tcb` (`KTHREAD`) no offset zero.

**`ETW`** — *Event Tracing for Windows*. ⚠ **Instrumentação, não interceptação**: o código emite; o que não é emitido não é visto. Modelo *publish/subscribe* — sem session, o evento não chega a ninguém.

---

## G

**`GrantedAccess`** — O direito concedido **no handle**. ⚠ Pertence ao handle, não ao objeto — e fica **congelado** na abertura.

---

## H

**`HANDLE`** — ⚠ **Índice** na tabela **do processo**, não ponteiro. Vive na `_HANDLE_TABLE_ENTRY`, que guarda o ponteiro do objeto e o `GrantedAccess`.

**`hive`** — Arquivo do registro em disco, com assinatura `regf`, organizado em bins e **cells** referenciadas por offset.

---

## I

**`IFEO` (*Image File Execution Options*)** — Chave que redireciona execução via valor `Debugger`. ⚠ Não toca no binário alvo.

**Integridade (`IntegrityLevel`)** — Nível **hierárquico** de confiança, paralelo à DACL. ⚠ Ninguém escreve **para cima**, mesmo com permissão. Níveis: Low (sandbox), Medium (usuário), High (admin elevado), System, Protected.

**`IOCTL`** — Código de 32 bits que codifica **tipo, função, acesso e método de buffer**. ⚠ Os 2 bits baixos dizem o método — triagem em um passo.

---

## K

**`KPROCESS`** — Estrutura de **agendamento** do processo: prioridade, afinidade, lista de threads. ⚠ No offset zero de `EPROCESS`.

**`KTHREAD`** — Estrutura de **agendamento** da thread, incluindo **APC**. ⚠ No offset zero de `ETHREAD`.

---

## L

**Lookaside** — ⚠ **O `slab` do Windows**: cache de blocos do mesmo tamanho por tipo. Bloco liberado **não é zerado**.

---

## M

**Mandatory Integrity Control** — O mecanismo da **integridade**. É o que faz o download ganhar aviso e o UAC pedir elevação.

**`METHOD_*`** — Método de buffer do `IOCTL`. ⚠ **`BUFFERED`** copia (protege TOCTOU, não valida tamanho); **`NEITHER`** passa ponteiro **direto** e exige `ProbeForRead` + `__try/__except`.

---

## N

**`Nt*` / `Zw*`** — Prefixos de função. ⚠ **`Nt*` valida ponteiro e respeita `PreviousMode`** (chamador pode ser userspace); **`Zw*` não valida** (chamador é o kernel).

**`NTSTATUS`** — Código de retorno do kernel. ⚠ Carrega **mais informação** que o código `Win32` — vários `NTSTATUS` viram um só `ERROR_*`.

**`NT Kernel Logger`** — Session de telemetria do kernel. ⚠ A flag **`img`** registra carregamento de imagem — é a segunda fonte contra ocultação de módulo.

---

## O

**`OBJECT_HEADER`** — Cabeçalho que **antecede** o corpo do objeto, em offset negativo. Guarda `PointerCount`, `HandleCount` e o **tipo**.

**`OBJECT_TYPE`** — Define a semântica: `ParseProcedure`, `SecurityProcedure`, `OpenProcedure`, `DeleteProcedure`, `ValidAccessMask`, `GenericMapping`.

**`ObRegisterCallbacks`** — Callback que observa **e altera** abertura de handle. ⚠ É assim que um produto remove `PROCESS_VM_READ` do acesso concedido.

---

## P

**`PE` (*Portable Executable*)** — Formato de `.exe`, `.dll` e `.sys`. ⚠ Essencial: `AddressOfEntryPoint`, import table, `.reloc`, seções.

**`PEB`** — *Process Environment Block*, em **ring 3**. Guarda `BeingDebugged`, `Ldr`, `ProcessParameters`, `ImageBaseAddress`, `ProcessHeap`.

**`PointerCount` / `HandleCount`** — Contadores do header. ⚠ `PointerCount` conta referências internas, `HandleCount` conta handles; o objeto morre quando o **primeiro** chega a zero.

**Pool `Paged` / `NonPaged`** — ⚠ Não é tamanho, é **"pode paginar"**. Paginado em `DISPATCH_LEVEL` é bug de estabilidade.

**`PPL` (*Protected Process Light*)** — ⚠ A única mitigação que **recusa até `SYSTEM`**, exigindo nível de **assinatura**. Não resolve código dentro do processo nem bug de kernel — ⚠ e `BYOVD` a contorna.

**`PreviousMode`** — Campo que diz se a requisição veio de ring 3. ⚠ É ele que faz o kernel validar ponteiro.

---

## R

**`RPC`** — *Remote Procedure Call*. Expõe **interface** e **endpoint**; ⚠ o nível de autenticação exigido é a informação que mais importa.

---

## S

**`SecurityDescriptor`** — Dono, grupo, **DACL** e **SACL**.

**`SeDebugPrivilege`** — ⚠ **Contorna a DACL**: `OpenProcess(PROCESS_ALL_ACCESS)` funciona em processo de `SYSTEM`.

**`SeImpersonatePrivilege`** — Permite impersonar qualquer token. ⚠ Base de várias escalações de serviço.

**`SeLoadDriverPrivilege`** — ⚠ Via limpa para **ring 0** — a base do `BYOVD`.

**`SID`** — Identidade real. ⚠ `S-1-5-18` = SYSTEM, `S-1-5-32-544` = Administrators, `RID 500` = Administrator de verdade. Comparar **nome** é falha de segurança.

**SSDT** — Tabela de índice → função do kernel. ⚠ O número **muda entre builds** — não é contrato público.

---

## T

**`TEB`** — *Thread Environment Block*. Guarda `NtTib` (pilha, `SEH`) e `LastErrorValue` (**por thread**).

**TLS callback** — ⚠ Roda **ANTES** do entry point. Quem só olha `AddressOfEntryPoint` não vê.

**`TOKEN`** — A credencial: `User` (SID), `Groups`, `Privileges`, `IntegrityLevel`, `TokenType`, `ImpersonationLevel`. ⚠ Com UAC, o administrador tem **dois** tokens ligados.

**Transação (`KTM`/`TxR`)** — Atomicidade no registro. ⚠ O estado não aplicado fica no **log**, invisível para quem só lê o hive.

---

## U

**UAC** — Controle de conta de usuário. ⚠ Cria o **token filtrado**: contém `Administrators` como **deny-only**. Apresenta ≠ em vigor.

---

## V

**`VAD`** — *Virtual Address Descriptor*: descreve uma região da memória virtual. ⚠ Mantidos em **árvore balanceada**; o campo `Protection` define o que a região permite.

**`Win32` (camada)** — `kernel32`, `advapi32`, `user32`. ⚠ Roda em **ring 3** — não é o kernel. **`kernel32.dll` não é o kernel.**

---

## Termos que NÃO são deste curso

Aparecem em conversa, mas pertencem a outro material da trilha:

| Termo | Curso correto |
|---|---|
| `kmalloc`, `slab`, `KASAN`, `cap_effective` | Linux Internals |
| `LOLBin`, `YARA`, packing | Análise de Malware |
| Framing, desync, parser differential | Parser Differentials / HTTP Smuggling |
| ROP em userspace, heap grooming | Exploit Development |
| `Sigma`, WAF, taxa de falso negativo | Detecção e Evasão |
| `BYOVD`, `PPL` como alvo, `variant hunting`, corrupção de pool | **Pesquisa de Segurança em Windows** |

⚠ **A distinção importa:** este curso **desenha o mapa**; o de Pesquisa **caça no território**. `BYOVD` e `PPL` aparecem aqui como **conceito de mitigação** (módulo 10) — o método de exploração deles é o curso seguinte.

---

*Glossário original do curso. As definições assumem o contexto do material — quando um termo tem uso diferente em outro contexto, vale a definição daqui.*
