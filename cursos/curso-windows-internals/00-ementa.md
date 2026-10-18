---
title: "Windows Internals: O Objeto, o Handle e o Ring 0"
nivel: avancado
tags: [windows, internals, eprocess, handle, pool, registro, alpc, etw]
---
# Windows Internals: O Objeto, o Handle e o Ring 0

**Ementa do curso · 36 horas · 12 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Processo** | Vê no Gerenciador de Tarefas | Lê `EPROCESS` e o `_KPROCESS`, campo por campo |
| **Handle** | Não pensa nisso | Entende a tabela, o `ObjectHeader` e o que ela permite |
| **Objeto** | "é um jeito de dizer arquivo" | Sabe `type`, `refcount`, `SecurityDescriptor` |
| **Memória** | Sabe que existe heap | Distingue pool, `VAD`, `PagedPool` e `NonPagedPool` |
| **Registro** | Usa `regedit` | Lê `hive`, transação e `SYSTEM` sem a API |
| **IPC** | Não conhece | Reconhece `ALPC`, `RPC` e o que cada um expõe |
| **Token** | "é o usuário logado" | Sabe `SID`, integridade, `privilege` e ausência |
| **Telemetria** | Não sabe o que é | Escreve provider `ETW` e segue `callback` |
| **Mentalidade** | "windows é fechado" | **"o objeto tem tipo, e o tipo tem operação"** |

**Pré-requisito duro:** curso de **Linux Internals, Kernel e Escalonamento de Privilégios** (o método: syscall, cópia, objeto, privilégio) · curso de **C para Pesquisa de Segurança** (ponteiro, estrutura, memória).
**Ajuda muito:** curso de **Assembly e RE** (leitura de `PE` e de disassembly) e curso de **Redes** (RPC e `SMB`).

⚠ **Sem os dois primeiros, o curso fica decorativo.** Eles dão o **método**; aqui ele é aplicado a outro kernel.

---

## Por que este curso existe

⚠ **O método é o mesmo do kernel Linux — e a implementação é outra.** Quem entendeu o curso anterior
tem a **pergunta**; este curso dá o **mapa**. E o mapa do Windows é radicalmente diferente: aqui não
há syscall direta e número de chamada — há **objeto**, **handle** e **tipo**, com uma camada
`Win32` por cima que esconde tudo.

⚠ **A tese do curso:**

> **No Windows, privilégio não é binário — é um TOKEN.** E quase toda falha de segurança é uma
> pergunta de **integridade, SID ou acesso a objeto** respondida de forma incorreta em algum ponto.

⚠ **E o motivo de ele existir na trilha:** os 19 cursos têm Linux, rede, web e kernel genericamente —
e **nenhum módulo abre o `EPROCESS`**. Windows é o maior buraco do material, e é o sistema em que a
maior parte das empresas que você vai testar roda.

| O que você faz hoje | O que este curso acrescenta |
|---|---|
| `whoami /priv` | ⚠ **Onde o privilégio está no token, e como ele é herdado** |
| `tasklist` | ⚠ **A estrutura, o `EPROCESS`, e o que ele contém** |
| `reg query` | ⚠ **O `hive` no disco, e a chave que não aparece na API** |
| "é driver de terceiro" | ⚠ **O `IOCTL`, o buffer e a validação de método** |
| "o EDR bloqueou" | ⚠ **O `ETW`, o callback e onde a telemetria não chega** |

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Descrever o **caminho de uma chamada `Win32`** até o kernel — `ntdll`, `syscall`, `SSDT` — e onde ele difere do modelo Linux.
2. Ler `EPROCESS`, `ETHREAD`, `PEB` e `TEB` no `WinDbg`, com símbolo de kernel.
3. Explicar o **modelo de objeto**: tipo, `ObjectHeader`, `refcount`, `SecurityDescriptor`.
4. Distinguir **handle** de ponteiro, e entender o que a tabela de handle permite e o que ela não permite.
5. Navegar o **pool** do kernel, e reconhecer corrupção e uso depois da liberação.
6. Ler **registro** no nível do `hive` e reconhecer persistência que a API não mostra.
7. Entender **`ALPC` e `RPC`** como superfície, e o que a exposição por endpoint significa.
8. Ler o **token** — SID, integridade, `privilege` — e prever o que ele autoriza.
9. Reconhecer **mecanismos de mitigação**: `CFG`, `ACG`, `ASLR`, `DEP`, `PPL` — e o que cada um limita.
10. Escrever um **driver mínimo** com `WDK`, e entender o contrato do `IOCTL`.
11. Usar **`ETW`** como fonte de telemetria, e escrever um provider próprio.
12. **Mapear a superfície** do sistema Windows sob teste e produzir o relatório.

---

## O laboratório

```powershell
# VM: Windows 11 (Evaluation) ou Windows Server 2022, com snapshot limpo.
# Requisitos: virtualizacao aninhada ligada se for usar kernel debug.

# Ferramentas base
winget install Microsoft.WinDbg
winget install Microsoft.VisualStudio.2022.Community --override "--wait --quiet --add Microsoft.VisualStudio.Workload.NativeDesktop --includeRecommended"
winget install --id Git.Git
winget install Python.Python.3.12
winget install Sysinternals.Sysinternals

# Verificacao
cd C:\
mkdir lab && cd lab
python --version
"C:\Program Files (x86)\Windows Kits\10\Debuggers\x64\windbg.exe" -version
```

⚠ **Três decisões do laboratório:**

⚠ **`WinDbg` com símbolo de kernel** é obrigatório. Sem `srv*` apontado para o servidor de símbolo da Microsoft, você vê `fffff880` e nome de função ausente — e o curso inteiro é sobre ler estrutura.

⚠ **Snapshot limpo antes de cada lab.** Este curso **quebra** a VM de propósito: instala driver de teste sem assinatura, roda `IOCTL` malformado e provoca bugcheck. Sem snapshot, você reinstala o Windows.

⚠ **Driver de teste com assinatura de modo de test ligado** (`bcdedit /set testsigning on`) — dentro da sua VM. O driver é o seu, e o alvo é a sua máquina virtual.

⚠ **O alvo é a sua VM, e o driver é o seu.** Nenhum lab aponta para sistema de terceiro.

---

## Como este curso se conecta aos outros

| Curso | Ligação |
|---|---|
| **Linux Internals** | Pré-requisito: o método — syscall, objeto, privilégio |
| **C para Pesquisa de Segurança** | Pré-requisito: memória, ponteiro, estrutura |
| **Assembly e RE** | Ajuda: `PE`, `IDA`, disassembly |
| **Pesquisa de Segurança em Windows** | Continuação: este curso é o mapa; aquele é a caça |
| **Redes** | Ligação: `RPC`, `SMB`, `SMB` como superfície |
| **APT e C2** | Ligação: persistência, `bring your own` e telemetria |
| **Detecção e Evasão** | Ligação: `ETW`, `AMSI`, `callback` |

⚠ **Este curso é pré-requisito do `Pesquisa de Segurança em Windows`.** Lá você aplica o mapa; aqui você o desenha.

---

## Módulos

| # | Módulo | Horas |
|---|---|---|
| 1 | Do `Win32` ao kernel: `ntdll`, `syscall`, `SSDT`, e onde o `Win32` mente | 3 |
| 2 | Processo e thread: `EPROCESS`, `ETHREAD`, `KPROCESS`, `KTHREAD` | 3 |
| 3 | O modelo de objeto: tipo, `ObjectHeader`, `refcount`, `SecurityDescriptor` | 3 |
| 4 | Handle: a tabela, o direito, e o que ela autoriza | 3 |
| 5 | Memória: `VAD`, pool `Paged`/`NonPaged`, e corrupção | 3 |
| 6 | `PE`, `PEB` e `TEB`: o que o processo sabe de si mesmo | 3 |
| 7 | Registro: `hive`, transação, e persistência que a API não mostra | 3 |
| 8 | `ALPC` e `RPC`: IPC como superfície, e endpoint exposto | 3 |
| 9 | Token, SID e integridade: privilégio como estrutura | 3 |
| 10 | Mitigação: `CFG`, `ACG`, `ASLR`, `DEP`, `PPL` — e o limite de cada uma | 3 |
| 11 | Driver e `IOCTL`: o contrato, o método de buffer, e a validação | 3 |
| 12 | `ETW`: telemetria como fonte, e provider próprio | 3 |

---

## Avaliação e encerramento

- `avaliacoes.md` — banco de questões por módulo, com resposta comentada.
- `glossario.md` — os termos do curso, definidos uma vez, em ordem.
- `README.md` — índice e ordem de leitura.

---

*Material didático original. Todo lab roda em VM própria do aluno, com driver escrito por ele.
Nenhum material que ensine atacar sistema de terceiro.*
