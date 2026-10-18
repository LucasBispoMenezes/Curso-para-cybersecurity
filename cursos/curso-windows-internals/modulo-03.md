# Módulo 3 — O Modelo de Objeto: Tipo, `ObjectHeader`, `refcount`, `SecurityDescriptor`

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 3 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 e 2
**Próximo:** Módulo 4 — Handle

---

## O que este módulo entrega

Ao final, você vai entender **a ideia central do Windows**: tudo que o processo pode tocar é um **objeto** com **tipo**, **referência** e **controle de acesso**. Você vai saber ler o `ObjectHeader`, entender por que o tipo decide as operações, e **onde o controle de acesso é realmente aplicado**. É o alicerce do módulo 4 e do módulo 9.

---

## 3.1 A ideia: um só modelo para tudo

⚠ **No Windows, arquivo, processo, thread, chave de registro, evento, mutex, seção, token e chave** são todos **objetos** do mesmo gerenciador.

```
   ┌──────────────────────────────────────────────────────┐
   │  OBJECT MANAGER                                       │
   │  (namespace \BaseNamedObjects, \Device, \Registry...)  │
   │                                                        │
   │  Todo objeto tem:                                     │
   │    • um TIPO         (File, Process, Key, Event, ...) │
   │    • um NOME         (opcional)                       │
   │    • um HEADER       (refcount, quota, atributos)     │
   │    • um SECURITY     (quem pode o que)                │
   │    • um HANDLE       (por processo — modulo 4)        │
   └──────────────────────────────────────────────────────┘
```

⚠ **A vantagem do desenho:** uma única implementação de acesso, referência e ciclo de vida serve para tudo. Auditoria de segurança passa a ser uma pergunta só — **"este objeto, com este tipo, permite esta operação para este token?"** — em vez de uma pergunta por subsistema.

⚠ **E o custo:** um modelo genérico é **mais abstrato**, e a abstração esconde onde cada verificação realmente acontece. É isso que este módulo desfaz.

---

## 3.2 `ObjectHeader`: a estrutura que existe antes do conteúdo

```c
struct _OBJECT_HEADER {
    LONG_PTR PointerCount;      // ⚠ o refcount (modulo 4)
    LONG_PTR HandleCount;       // ⚠ quantos handles apontam para cá
    POBJECT_TYPE Type;          // ⚠ O TIPO — decide as operacoes
    BYTE TraceFlags;
    // ...
    QUAD Body;                  // ⚠ o objeto em si comeca aqui
};
```

⚠ **A leitura fundamental:** o `OBJECT_HEADER` **antecede** o corpo do objeto na memória. O ponteiro que você tem aponta para o **corpo**, e o header está **antes** — em offset negativo.

```
   ┌────────────────────────┬───────────────────────────┐
   │   OBJECT_HEADER        │    CORPO DO OBJETO        │
   │   PointerCount         │    (FILE_OBJECT,          │
   │   HandleCount          │     EPROCESS, KEY, ...)   │
   │   Type  ← ⚠ o tipo     │                           │
   └────────────────────────┴───────────────────────────┘
              ▲                          ▲
              │                          │
        &corpo - sizeof(header)     ⚠ o ponteiro que
                                      voce recebe
```

⚠ **Consequência para análise:** `ObHeaderFromObject()` é a função que faz essa conta. E entender isso explica por que **corromper o header** é um objetivo de exploit: um `PointerCount` inflado mantém o objeto vivo; um `Type` trocado faz o kernel **interpretar o objeto como outro tipo** — é a **confusão de tipo**, que o curso de Pesquisa em Windows trata no módulo 6.

```windbg
kd> dt nt!_OBJECT_HEADER -a | head -25
kd> dt nt!_OBJECT_TYPE -a | head -40
kd> !object <ENDERECO>
kd> !handle 0 7 <PID>                    # modo resumido, na build alvo
```

---

## 3.3 O tipo decide tudo

⚠ **O `OBJECT_TYPE` é onde mora a semântica do objeto.** Ele contém ponteiros para as funções que o gerenciador chama:

```c
struct _OBJECT_TYPE {
    LIST_ENTRY TypeList;
    UNICODE_STRING Name;              // ⚠ "File", "Process", "Key"...
    // ...
    POBJECT_TYPE_INITIALIZER TypeInfo;
    // ...
};

// E o TypeInfo contem:
struct _OBJECT_TYPE_INITIALIZER {
    // ...
    POPEN_METHOD   OpenProcedure;     // ⚠ ao criar handle
    PCLOSE_METHOD  CloseProcedure;    // ⚠ ao fechar o ultimo handle
    PDELETE_METHOD DeleteProcedure;   // ⚠ ao destruir
    PPARSE_METHOD  ParseProcedure;    // ⚠ ao navegar em namespace
    PSECURITY_METHOD SecurityProcedure;  // ⚠ CONTROLE DE ACESSO
    // ...
    ACCESS_MASK    ValidAccessMask;   // ⚠ o que faz sentido para este tipo
    // ...
    GENERIC_MAPPING GenericMapping;   // ⚠ GENERIC_* -> especifico
};
```

⚠ **Quatro ponteiros que explicam comportamento que "não faz sentido":**

| Procedimento | Quando roda | Exemplo |
|---|---|---|
| **`ParseProcedure`** | ⚠ Ao navegar no namespace | `\Device\HarddiskVolume1\...` |
| **`SecurityProcedure`** | ⚠ A CADA verificação de acesso | Chave depreciada do registro |
| **`OpenProcedure`** | Ao criar handle | Método de um objeto de driver |
| **`DeleteProcedure`** | Ao destruir | Libera recurso associado |

⚠ **O `ParseProcedure` é a origem de comportamento surpreendente e de vulnerabilidade.** No Windows, o namespace é **navegável**: o objeto decide como interpretar o que vem depois dele no caminho. Isso significa que **um driver pode registrar um objeto cujo `ParseProcedure` interpreta string** — e é exatamente aí que bugs de análise de caminho aparecem.

```windbg
# Ver os tipos registrados
!object \ObjectTypes
dt nt!_OBJECT_TYPE <ENDERECO_DE_FILE> Name TypeInfo
```

---

## 3.4 `SecurityDescriptor`: onde o acesso é decidido

⚠ **Cada objeto carrega um descritor de segurança**, e cada tentativa de acesso é verificada contra ele.

```
   SECURITY_DESCRIPTOR
   ├── Owner (SID)              ⚠ quem sempre pode mudar a permissao
   ├── Group (SID)
   ├── DACL  ► ACCESS_CONTROL_LIST
   │           ├── ACE 1: Allow / Deny, SID, mascara de acesso
   │           ├── ACE 2: Allow / Deny, SID, mascara
   │           └── ...
   └── SACL  ► ACEs de AUDITORIA (o que e registrado no log)
```

⚠ **A DACL decide; a SACL audita.** Confundir as duas é o erro mais comum.

⚠ **E a regra de avaliação tem uma pegadinha que aparece em quase todo bug de permissão:**

| Estado da DACL | Resultado |
|---|---|
| **Sem DACL (`NULL`)** | ⚠⚠ **ACESSO TOTAL** — não é "nega tudo" |
| DACL vazia | ⚠ **NEGA TUDO** — não é "libera tudo" |
| ACE de **Deny** primeiro | ⚠ Deny **vence** — a ordem importa |
| Sem ACE que case | ⚠ **NEGADO** por padrão |

⚠ **A primeira linha é a pegadinha mais famosa do modelo de segurança do Windows.** Um `SecurityDescriptor` sem DACL **não** significa "ninguém acessa" — significa "todos acessam". Programador que define `NULL` pensando em restringir acabou de abrir o objeto.

```powershell
# Ler o descritor de seguranca de um objeto
$acl = Get-Acl C:\Windows\System32\config\SAM
$acl.Access | Format-Table IdentityReference, FileSystemRights, AccessControlType

# E de um objeto do registro
$acl = Get-Acl HKLM:\SAM\SAM
$acl.Access | Format-Table IdentityReference, RegistryRights, AccessControlType

# Objetos de kernel, com ferramenta dedicada
# ⚠ winobj.exe (Sysinternals) mostra o namespace e o SD de cada objeto
```

⚠ **A verificação em si é `SeAccessCheck`**, e ela é chamada **pelo `SecurityProcedure` do tipo**. Duas consequências:

1. ⚠ **Um tipo sem `SecurityProcedure` não faz verificação adicional** — o gerenciador faz a genérica.
2. ⚠ **Um `SecurityProcedure` mal escrito pode liberar mais do que devia** — é uma classe de CVE real em driver.

---

## 3.5 Referência: como um objeto morre

⚠ **Dois contadores no header, e eles medem coisas diferentes:**

| Contador | O que mede | Aumenta quando |
|---|---|---|
| **`PointerCount`** | ⚠ Referências internas do kernel | Qualquer componente pega o objeto |
| **`HandleCount`** | ⚠ Handles abertos | `OpenProcess`, `CreateFile` e afins |

⚠ **O objeto só é liberado quando `PointerCount` chega a zero** — e a redução de cada um tem função própria:

```
   ObReferenceObject / ObDereferenceObject   →  PointerCount
   → quando chega a 0: DeleteProcedure roda
```

⚠ **E é aqui que o módulo 4 do curso de Linux reaparece:** **`PointerCount` é um refcount**, e os mesmos três padrões de bug valem.

| Padrão | Consequência no Windows |
|---|---|
| `ObDereferenceObject` a mais | ⚠ Objeto liberado em uso — **UAF** |
| `ObReferenceObject` a menos | Objeto nunca liberado — vazamento |
| ⚠ Referência não pega antes de uso assíncrono | ⚠ **UAF** — o padrão mais comum em driver |

⚠ **O terceiro item é o clássico:** o driver recebe o objeto, guarda em uma estrutura, e usa **depois**, sem ter pego referência. Entre guardar e usar, o outro lado fechou o handle e o objeto morreu.

```windbg
# Ver os contadores
kd> dt nt!_OBJECT_HEADER <ENDERECO_DO_HEADER> PointerCount HandleCount Type

# E o objeto por tras do handle
!handle <HANDLE> f <PID>
!object <ENDERECO>
```

---

## 3.6 O namespace de objetos

⚠ **Todo objeto nomeado vive em um namespace hierárquico**, com raízes conhecidas:

| Caminho | O que contém |
|---|---|
| `\Device` | ⚠ Dispositivos e drivers |
| `\BaseNamedObjects` | Objetos por sessão (`Event`, `Mutant`, `Section`) |
| `\Sessions\<n>\BaseNamedObjects` | Objetos por sessão de usuário |
| `\Registry` | ⚠ A chave é um OBJETO — e o registro também |
| `\KnownDlls` | Seções mapeadas das DLLs do sistema |
| `\GLOBAL??` | ⚠ A ponte entre nome `\\.\` e `\Device` |

⚠ **A linha do `\GLOBAL??` explica algo que confunde todo mundo:** quando você abre `\\.\C:` ou `C:\`, o caminho é resolvido por **symlinks de objeto** até chegar em `\Device\HarddiskVolume2`. O caminho familiar é uma **conveniência do namespace**, não uma verdade do kernel.

```
   C:\a.txt
      │
      ▼  (resolucao pelo gerenciador de objetos)
   \GLOBAL??\C:  ──symlink──►  \Device\HarddiskVolume2
                                       │
                                       ▼  ParseProcedure do device
                                FILE_OBJECT para o arquivo
```

⚠ **E é por isso que `ParseProcedure` é superfície:** ele recebe **string do usuário** e decide o que significa. Análise de caminho em `ParseProcedure` é uma classe de CVE que o curso de Pesquisa em Windows trata.

```windbg
# Explorar o namespace
!object \ObjectTypes
!object \Device | head -20
!object \BaseNamedObjects
!object \GLOBAL??
```

---

## Laboratório 3 — Ler o objeto

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```
# ── WinDbg kernel mode, VM com simbolo ──────────────────────

# 1. O header e o tipo
dt nt!_OBJECT_HEADER -a | head -25
kd> !object \ObjectTypes

# 2. Escolha um tipo, e veja os procedimentos
dt nt!_OBJECT_TYPE <ENDERECO_DE_FILE> Name TypeInfo
dt nt!_OBJECT_TYPE_INITIALIZER -a

# 3. Um objeto concreto
!handle 0 0 <PID_DO_NOTEPAD>
!handle <HANDLE_DE_ARQUIVO> f <PID_DO_NOTEPAD>
dt nt!_OBJECT_HEADER <ENDERECO_DO_HEADER> PointerCount HandleCount Type

# 4. O namespace
!object \GLOBAL??
!object \Device | head -15

# 5. A resolucao de um caminho
!object \??\C:
#    ⚠ siga o symlink ate o \Device\...
```

```powershell
# ── Na VM, userspace ────────────────────────────────────────

# 6. O descritor de seguranca de objetos comuns
$acl = Get-Acl C:\Windows\System32\config\SAM
"Owner: $($acl.Owner)"
$acl.Access | Select-Object IdentityReference, FileSystemRights, AccessControlType |
  Format-Table -AutoSize

# 7. Compare com um objeto que voce criou
ni C:\lab\meu.txt -ItemType File -Force
$acl = Get-Acl C:\lab\meu.txt
"Owner: $($acl.Owner)"
$acl.Access | Format-Table IdentityReference, FileSystemRights, AccessControlType

# 8. ⚠ A pegadinha da DACL nula
#    Via API: SetSecurityInfo com DACL $null -> acesso TOTAL
#    Via C:  secDesc com Dacl = NULO
#    Demonstre em um arquivo do lab que o acesso passa a ser irrestrito
```

**O que observar:** no passo 5, o caminho familiar se revela uma cadeia de symlinks. No passo 3, o `PointerCount` e o `HandleCount` do mesmo objeto podem ser **diferentes** — e é essa diferença que importa no ciclo de vida.

**Exercício 1:** no `WinDbg`, imprima o `OBJECT_TYPE` de três tipos diferentes (`File`, `Process`, `Key`) e compare os `ValidAccessMask` e `GenericMapping`. ⚠ Explique por que `GENERIC_READ` significa coisas diferentes em cada tipo.

**Exercício 2:** abra o mesmo arquivo duas vezes em um programa, e observe o `PointerCount` e o `HandleCount` antes e depois de fechar um dos handles. ⚠ Escreva o que aconteceu e por que o objeto **não** foi destruído no primeiro fechamento.

**Exercício 3 (o que vale):** demonstre, em código, a diferença entre DACL **ausente** e DACL **vazia**. Crie dois arquivos do lab: um com DACL nula, outro com DACL vazia. Teste o acesso com um usuário sem privilégio. ⚠ Escreva a tabela do 3.4 com o resultado **observado**, não o que você achou que aconteceria. É a pegadinha que aparece em CVE real.

---

## Resumo

- ⚠ **Tudo no Windows é objeto** do mesmo gerenciador: tipo, nome, header, segurança, handle.
- O **`OBJECT_HEADER` antecede o corpo** — o ponteiro aponta para o corpo, e o header está em offset negativo.
- ⚠ **O tipo decide as operações**: `ParseProcedure`, `SecurityProcedure`, `OpenProcedure`, `DeleteProcedure`.
- **`ParseProcedure` recebe string do usuário** — é a fonte de bugs de análise de caminho.
- ⚠ **DACL ausente = acesso TOTAL**; DACL vazia = nega tudo. É a pegadinha central do modelo.
- **`PointerCount` e `HandleCount` medem coisas diferentes** — o objeto morre quando o primeiro chega a zero.
- ⚠ **Referência não pega antes de uso assíncrono é o padrão de UAF mais comum em driver.**

---

## O que o próximo módulo entrega

Você entende o objeto. O módulo 4 abre o que o **processo** tem para alcançá-lo: a **tabela de handles** — como o `HANDLE` se liga ao objeto, o que o campo de direito concede, e por que um handle vazado é um problema de segurança.
