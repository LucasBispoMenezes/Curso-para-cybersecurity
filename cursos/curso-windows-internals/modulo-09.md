# Módulo 9 — Token, SID e Integridade: Privilégio Como Estrutura

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 9 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 8
**Próximo:** Módulo 10 — Mitigação

---

## O que este módulo entrega

Ao final, você vai saber **ler um token campo por campo**, entender **por que "root" é uma palavra imprecisa no Windows**, e **prever o que um token autoriza** sem executar nada. É o módulo mais diretamente ligado a segurança, e o que o curso de Pesquisa em Windows e o módulo de `Impersonation` assumem.

---

## 9.1 O token é a credencial

⚠ **A estrutura que corresponde à `cred` do Linux** (curso de Linux Internals, módulo 8):

```c
struct _TOKEN {
    TOKEN_SOURCE Source;
    LUID TokenId;
    LUID AuthenticationId;       // ⚠ o LogonSession
    // ...
    SID_AND_ATTRIBUTES *User;    // ⚠ O SID DO USUARIO
    SID_AND_ATTRIBUTES *Groups;  // ⚠ os grupos
    ULONG GroupCount;
    // ...
    ULONG IntegrityLevelIndex;   // ⚠ a integridade
    // ...
    SID_AND_ATTRIBUTES *Privileges;  // ⚠ os privilegios
    ULONG PrivilegeCount;
    TOKEN_TYPE TokenType;        // ⚠ Primary ou Impersonation
    SECURITY_IMPERSONATION_LEVEL ImpersonationLevel;  // ⚠ modulo 8
    // ...
    ULONG TokenFlags;            // ⚠ incluindo "elevado"
};
```

⚠ **A comparação direta com o Linux, e ela vale escrever:**

| Linux (`struct cred`) | Windows (`_TOKEN`) |
|---|---|
| `uid`, `euid` | ⚠ **`User`** (SID) |
| `group_info` | ⚠ **`Groups`** |
| `cap_effective` | ⚠ **`Privileges`** |
| `cap_bset` | *não existe equivalente direto* |
| — | ⚠ **`IntegrityLevel`** |
| — | ⚠ **`TokenType`** + `ImpersonationLevel` |

⚠ **Duas estruturas que não existem no Linux, e são a razão de o modelo do Windows ser diferente:**

⚠ **`IntegrityLevel`** — um nível de confiança **hierárquico** que atravessa o modelo de acesso.

⚠ **`TokenType`** — primário ou de impersonação. É o mecanismo que o módulo 8 mostrou — e é por isso que um bug de serviço é escalação.

---

## 9.2 `SID`: identidade não é nome

⚠ **O `SID` é a identidade real.** Nome de usuário é rótulo.

```
   S-1-5-21-<dominio>-<sub1>-<sub2>-<sub3>-<RID>
   │  │  │  └──────── identificar o dominio ────────┘
   │  │  └── authority (5 = NT)
   │  └── revision
   └── "S"

   RIDs que voce precisa reconhecer de memoria:
     ⚠ 500  Administrator (o de verdade — nome pode variar)
     ⚠ 501  Guest
     ⚠ 502  krbtgt
       512  Domain Admins
      1000+ usuarios comuns
```

⚠ **Os SIDs **bem conhecidos** (`S-1-5-*`) são os que decidem acesso na prática:**

| SID | Quem é |
|---|---|
| `S-1-5-18` | ⚠ **SYSTEM** |
| `S-1-5-19` | `LOCAL SERVICE` |
| `S-1-5-20` | `NETWORK SERVICE` |
| `S-1-5-32-544` | ⚠ **Administrators** |
| `S-1-5-32-545` | Users |
| `S-1-5-11` | Authenticated Users |
| `S-1-5-7` | Anonymous |
| `S-1-5-21-...-500` | ⚠ **Administrator real** — o RID, não o nome |

⚠ **A lição de auditoria:** comparar **nome** é falha de segurança. Um atacante renomeia o `Administrator` ou cria usuário com nome parecido — o **SID** não muda. Toda verificação séria usa SID.

```powershell
# Traduzir SID <-> nome
whoami /user
whoami /groups
whoami /priv

# Os SIDs dos grupos, no token atual
(New-Object System.Security.Principal.WindowsIdentity([System.Security.Principal.WindowsIdentity]::GetCurrent().Token)).Groups |
  Select-Object -ExpandProperty Value
```

---

## 9.3 Integridade: o nível que atravessa

⚠ **O `IntegrityLevel` é uma proteção que funciona em paralelo à DACL** — e é o que impede escrita de baixo para cima.

| Nível | Valor | Quem |
|---|---|---|
| **Untrusted** | 0 | Processos de baixa confiança (AppContainer) |
| **Low** | ⚠ **0x1000** | ⚠ **Navegador, sandbox** |
| **Medium** | **0x2000** | ⚠ **Usuário comum** — o padrão |
| **High** | ⚠ **0x3000** | ⚠ **Administrador elevado** |
| **System** | **0x4000** | Serviços, `SYSTEM` |
| **Protected** | ⚠ **0x5000** | `PPL` — módulo 8 do curso de Pesquisa |

⚠ **A regra é assimétrica:**

```
   ESCRITA:  ⚠ nível >= nível do objeto    (ninguem escreve PARA CIMA)
   LEITURA:  nível >= nível do objeto      (com restricoes)
   EXECUCAO: ⚠ o nivel do objeto manda
```

⚠ **É a chamada *Mandatory Integrity Control* — e ela é o mecanismo por trás de conceitos familiares:**

| O que você conhece | O que é por baixo |
|---|---|
| "Baixar arquivo do navegador dá aviso" | ⚠ Objeto marcado **Low** |
| "UAC pede elevação" | ⚠ Token **Medium → High** |
| "Sandbox do Chrome" | ⚠ Integridade **Low** |
| "Escrita protegida no Visual Studio" | Integridade no diretório |

⚠ **A consequência para escalação:** um processo **Medium** não consegue escrever em objeto **High** — nem com a DACL permitindo. ⚠ Isso significa que a integridade é uma **segunda camada independente**, e que um bug da camada de integridade é tão grave quanto um de DACL.

⚠ **E é por isso que o `IL` aparece em CVE:** um objeto cujo nível de integridade é calculado **errado** (para baixo) passa a ser alterável por processo de menor privilégio.

---

## 9.4 Privilégios: o que o token pode

⚠ **Privilégio é separado de SID e de integridade.** Um `Administrator` **sem** o privilégio `SeDebugPrivilege` não pode depurar `SYSTEM` — mesmo sendo administrador.

| Privilégio | O que permite |
|---|---|
| **`SeDebugPrivilege`** | ⚠ ⚠ **Abrir QUALQUER processo com qualquer acesso** |
| **`SeImpersonatePrivilege`** | ⚠ ⚠ **Impersonar qualquer token** — base de várias técnicas |
| **`SeAssignPrimaryTokenPrivilege`** | Trocar o token de um processo |
| **`SeTcbPrivilege`** | ⚠ Agir como parte do sistema operacional |
| **`SeBackupPrivilege`** | ⚠ Ler **contornando a DACL** |
| **`SeRestorePrivilege`** | ⚠ Escrever contornando a DACL |
| **`SeTakeOwnershipPrivilege`** | ⚠ Tomar posse de **qualquer objeto** |
| **`SeLoadDriverPrivilege`** | ⚠ ⚠ **Carregar driver** — ring 0 |
| **`SeManageVolumePrivilege`** | Acesso direto ao volume |

⚠ **Os quatro primeiros são a fonte da maior parte das escalações de serviço:**

```
   Servico com SeImpersonatePrivilege  (IIS, MSSQL, servico de tarefa)
        │
        ├── o atacante faz o servico impersonar um token ESCOLHIDO
        │
        ▼
   ⚠ token de SYSTEM  ->  escalacao
```

⚠ **`SeDebugPrivilege` merece a distinção mais importante:** ele **contorna a DACL**. Com ele, `OpenProcess(PROCESS_ALL_ACCESS)` funciona em processo de `SYSTEM` — mesmo que a DACL negue. É o **CVE de design** que faz de todo processo com esse privilégio um alvo.

⚠ **E `SeLoadDriverPrivilege` é a via limpa para ring 0:** carregar um driver assinado e vulnerável (`BYOVD`) — o que o curso de Pesquisa em Windows trata no módulo 7.

```powershell
# Os privilegios do seu token
whoami /priv

# ⚠ Compare: usuario comum, administrador, SYSTEM
#    O que muda, e o que cada linha permite?
```

---

## 9.5 Tipo e elevação

⚠ **Três atributos que decidem o comportamento do token:**

| Atributo | O que significa |
|---|---|
| **`TokenType`** | **Primary** (do processo) ou **Impersonation** (do módulo 8) |
| **`TokenFlags` + `TokenElevation`** | ⚠ O token é **elevado**? |
| **`TokenElevationType`** | ⚠ **`Full`**, `Limited`, ou `Default` |
| **Token vinculado** | ⚠ Com o UAC, o processo tem **dois** tokens |

⚠ **O último item é fundamental e quase sempre ignorado:** com o **UAC**, um administrador tem **dois tokens** — um **filtrado** (Medium, sem privilégios administrativos) e um **completo** (High, com todos). O processo comum roda com o filtrado.

```
   TOKEN LIMITADO (Medium)          TOKEN COMPLETO (High)
   ┌──────────────────────┐         ┌──────────────────────┐
   │ SID: Administrators   │         │ SID: Administrators   │
   │ ⚠ DENY_ONLY atributo  │         │ ⚠ ENABLED             │
   │ Integridade: Medium   │         │ Integridade: High     │
   └──────────────────────┘         └──────────────────────┘
            │                                  │
            └──────── ligados (LinkedToken) ───┘
```

⚠ **A prova de que o SID presente no token não basta:** o token filtrado **contém** o SID de `Administrators`, mas ele está **deny-only** — o grupo aparece e **nega**, em vez de permitir. Quem verifica acesso olhando "o SID está presente?" conclui errado.

⚠ **Isso é o mesmo erro de padrão que o módulo 4 mostrou com handle e que o Linux Internals mostrou com `cap_effective`:** **o que está na estrutura não é o que está em vigor.** A pergunta certa é sempre "está **habilitado**?", e não "está **presente**?".

```powershell
# Ver os dois tokens
whoami /all
[System.Security.Principal.WindowsIdentity]::GetCurrent().Groups |
  Format-Table Value, Type

# O token vinculado
# ⚠ com UAC ligado, um administrador comum tem LinkedToken
```

---

## 9.6 Onde a verificação acontece

⚠ **O fluxo completo de uma decisão de acesso**, e cada etapa é uma oportunidade de erro:

```
   OpenProcess(PROCESS_ALL_ACCESS, pid)
        │
        ├─1. O handle ja existe na tabela do processo?   (modulo 4)
        │      ⚠ reaproveitamento
        │
        ├─2. Privilegio especial cobre?  (SeDebug)       (9.4)
        │      ⚠ CONTORNA a DACL
        │
        ├─3. Compara o TOKEN com a DACL do objeto        (3.4)
        │      ⚠ SID presente? habilitado? deny vence?
        │
        ├─4. INTEGRIDADE permite?                        (9.3)
        │      ⚠ camada SEPARADA
        │
        ├─5. O tipo tem SecurityProcedure proprio?       (3.3)
        │      ⚠ verificacao ADICIONAL
        │
        └─6. ⚠ PPL recusa, mesmo com tudo permitido      (modulo 10)
```

⚠ **A leitura das seis etapas é o exercício central do módulo:** para qualquer "acesso negado" que você investigar, **qual etapa negou**? A resposta muda completamente o que você faz a seguir.

| Etapa que negou | O que significa |
|---|---|
| 2 | ⚠ Falta privilégio — não é problema de DACL |
| 3 | DACL ou SID desabilitado |
| 4 | ⚠ Integridade — a DACL permite |
| 5 | Tipo do objeto tem regra própria |
| 6 | ⚠ `PPL` — nem `SYSTEM` sem assinatura passa |

⚠ **É a mesma pergunta do Linux Internals, com mais camadas:** *por que este acesso falhou?* E a disciplina de não aceitar "negado" como resposta final.

---

## Laboratório 9 — Ler o token

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```powershell
cd C:\lab; mkdir m09; cd m09

# 1. O token do usuario comum
whoami /user
whoami /priv
whoami /groups | Select-Object -First 20

# 2. Compare os tres contextos
#    ⚠ usuario comum | administrador com UAC | SYSTEM
#    Anote o que muda em: Integridade, Privilegios, e atributo dos grupos
```

```powershell
# 3. A integridade, em codigo
$me = [System.Security.Principal.WindowsIdentity]::GetCurrent()
"Usuario : $($me.Name)"
"Token   : $($me.Token)"
"Elevado : $($me.Owner)"
$me.Groups | Where-Object { $_.Value -like 'S-1-16-*' } |
  Select-Object Value, Type
#    ⚠ S-1-16-8192  = Medium
#       S-1-16-12288 = High
#       S-1-16-16384 = System
#       S-1-16-4096  = Low
```

```
# 4. No WinDbg, o token cru
dt nt!_TOKEN -a | head -40
!token <ENDERECO_DO_TOKEN>
!token <ENDERECO> 1          # ⚠ com detalhe dos SIDs e privilegios
dt nt!_SID_AND_ATTRIBUTES -a

# 5. O token atual de um processo
dt nt!_EPROCESS <ENDERECO> Token
dt nt!_TOKEN <ENDERECO_DO_TOKEN> User Groups Privileges IntegrityLevelIndex
```

**O que observar:** no passo 3, o SID `S-1-16-*` é o de integridade — ele **não** é o SID do usuário, e **não** aparece em `whoami /user`. ⚠ É uma camada à parte, e quem só olha SID de usuário não a vê.

**Exercício 1:** compare `whoami /priv` em três contextos (usuário comum, administrador, `SYSTEM`) e monte a tabela dos privilégios presentes em cada um. ⚠ Depois marque os que **contornam a DACL** — e escreva o que cada um permite fazer sem precisar de permissão.

**Exercício 2:** como administrador com UAC ligado, descubra o token **vinculado** do seu processo e compare os dois: quais SIDs mudam de atributo de `DENY_ONLY` para habilitado? ⚠ Escreva a diferença em duas linhas.

**Exercício 3 (o que vale):** escolha um objeto cujo acesso **falhe** no seu lab (uma chave do registro restrita, um processo de outro usuário). No `WinDbg`, determine **qual das seis etapas do 9.6 negou** o acesso. ⚠ Escreva a etapa, e o que você faria para contornar **cada** uma. É o raciocínio que separa "deu acesso negado" de entender o modelo.

---

## Resumo

- ⚠ **O token é a credencial** — `User` (SID), `Groups`, `Privileges`, `IntegrityLevel`, `TokenType`.
- ⚠ **SID é a identidade real** — comparar **nome** é falha de segurança; `RID 500` é o Administrator de verdade.
- ⚠ **`IntegrityLevel` é uma camada separada da DACL**: ninguém escreve **para cima**, mesmo com permissão.
- **Privilégios são separados de SID**: ⚠ `SeDebugPrivilege` **contorna a DACL**; `SeLoadDriverPrivilege` é a via para ring 0.
- ⚠ **Com UAC, o administrador tem dois tokens**, e o limitado contém o SID de `Administrators` como **deny-only**.
- ⚠ **"Está presente" não é "está em vigor"** — a mesma lição do `cap_effective` no Linux.
- A decisão de acesso tem **seis etapas**, e saber **qual negou** é o que orienta o que fazer.

---

## O que o próximo módulo entrega

Você entende o token. O módulo 10 abre as **mitigações** — `CFG`, `ACG`, `ASLR`, `DEP`, `PPL` — e, para cada uma, **o que ela realmente limita** e o que ela deixa passar.
