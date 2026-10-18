# Módulo 7 — Registro: `hive`, Transação, e Persistência Que a API Não Mostra

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 7 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 6
**Próximo:** Módulo 8 — `ALPC` e `RPC`

---

## O que este módulo entrega

Ao final, você vai entender **o registro como estrutura de kernel** — não como `regedit`. Você vai saber ler o `hive` no disco, entender **transação** e `TxR`, e reconhecer **persistência que a API documentada não revela**. É o módulo mais diretamente aplicável a resposta a incidente.

---

## 7.1 O registro é um objeto — e isso muda tudo

⚠ **A chave do registro é um objeto do gerenciador** (módulo 3), com tipo `Key`, `SecurityDescriptor` e handle. Não é um banco de dados à parte.

| O que você vê | O que existe |
|---|---|
| `HKLM\Software\...` | ⚠ **Symlink** para `\Registry\Machine\Software\...` |
| Uma "chave" | Um objeto `Key` no namespace `\Registry` |
| Um "valor" | ⚠ **Não é objeto** — é campo da chave |
| `HKEY_LOCAL_MACHINE` | ⚠ Constante de **API**, não um caminho do kernel |

⚠ **A tradução é a mesma de `C:\` para `\Device\HarddiskVolume2`** (módulo 3, seção 6). As `HKEY_*` são **atalhos do userspace**: as raízes reais são `\Registry\Machine`, `\Registry\User`, e as sessões.

```
   HKLM\SAM
      │
      ▼  (resolucao pelo gerenciador de objetos)
   \Registry\Machine\SAM
      │
      ▼
   objeto Key, com hive, cell e SecurityDescriptor
```

```windbg
!object \Registry
!object \Registry\Machine | head -20
dt nt!_CM_KEY_BODY -a | head -25
dt nt!_CM_KEY_NODE -a | head -25
```

---

## 7.2 O `hive`: o arquivo no disco

⚠ **O `hive` é o armazenamento do registro em disco.** Cada hive é **um arquivo**, e ele tem estrutura própria:

```
   HIVE (arquivo no disco)
   ├── BASE BLOCK          ⚠ assinatura "regf", versao, sequencia
   ├── HIVE BINS           blocos de 4 KB (cluster do hive)
   │     └── CELLS         ⚠ a unidade real de armazenamento
   │           ├── CELL DE DADOS      (valor)
   │           └── CELL DE CHAVE      (CM_KEY_NODE)
   │                 └── lista de subchaves e valores
   └── ⚠ O ARQUIVO INTEIRO E UM CONJUNTO DE OFFSETS
           tudo se referencia por OFFSET a partir do inicio do hive
```

⚠ **O `hive` no disco não guarda valores negativos, nem "vazios":** o que existe é uma **árvore de células** referenciadas por offset. Compreender isso é o que permite ler registro **sem a API** — e é o que ferramentas de análise forense fazem.

| Onde fica | Hive |
|---|---|
| `C:\Windows\System32\config\SYSTEM` | ⚠ Serviços, drivers, persistência |
| `...\SOFTWARE` | Configuração de software |
| `...\SAM` | ⚠ Contas locais |
| `...\SECURITY` | Política de segurança |
| `...\DEFAULT` | Perfil padrão |
| `C:\Users\<u>\NTUSER.DAT` | ⚠ Por usuário |

⚠ **Dois detalhes forenses que importam:**

⚠ **`SYSTEM` é o hive da persistência.** Serviços (`CurrentControlSet\Services`) e drivers vivem nele — e um serviço criado no registro **executa como `SYSTEM`** no próximo boot.

⚠ **`LastWriteTime`** de uma chave é um campo do `CM_KEY_NODE` — e ele **sobrevive**, mesmo quando o valor é apagado. É a base da análise de linha do tempo.

```powershell
# Os hives carregados
reg query HKLM\SYSTEM\CurrentControlSet\Control\hivelist

# E o caminho fisico de cada um
# ⚠ o hive em uso fica bloqueado, mas o arquivo pode ser copiado
```

---

## 7.3 Transação: o registro tem atomicidade

⚠ **O registro suporta transação** — `RegCreateKeyTransacted`, `RegDeleteKeyTransacted`. Isso significa que operações podem ser **atômicas** e **desfeitas**.

```
   Transacao KTM (Kernel Transaction Manager)
   ├── Enlist       ⚠ a chave entra na transacao
   ├── Commit       aplica tudo
   └── Rollback     ⚠ desfaz tudo

   ⚠ E o mecanismo por tras: TxR (Transactional Registry)
      um log ao lado do hive
```

⚠ **Por que isso importa para segurança:** durante a transação, o estado **não aplicado** existe em algum lugar. Uma chave criada em transação não confirmada **não está** no hive principal, mas **está** no log. ⚠ Ferramenta que só lê o hive principal **não vê** — e é uma forma de persistência/ocultação.

```windbg
dt nt!_CM_TRANS -a | head -25
dt nt!_CM_KCB_UOW -a | head -25
!object \RegTransactionManager | head -20
```

---

## 7.4 Persistência: as chaves que importam

⚠ **A tabela que todo analista precisa ter, e o que cada chave permite:**

| Chave | O que faz |
|---|---|
| `...\Services\<nome>` | ⚠ **Serviço** — executa como `SYSTEM` no boot |
| `...\Image File Execution Options` | ⚠ **Debugger** de um executável — executa antes dele |
| `...\Winlogon\Shell` / `Userinit` | ⚠ Executa no logon |
| `...\Run`, `RunOnce` | Executa no logon (**evidência para usuário**) |
| `...\Explorer\Browser Helper Objects` | Injeção no Explorer |
| `...\AppInit_DLLs` | ⚠ Injeção em **todo** processo com `user32` |
| `...\Print\Monitors` | Executado pelo spooler — ⚠ como `SYSTEM` |
| `...\Winlogon\Notify` (legado) | Notificação de logon |
| `...\Session Manager\BootExecute` | Nativo, antes de tudo |
| `...\Corporate\Certificates` | Certificado adicionado |
| `...\CurrentVersion\Policies\Shell` | Política aplicada |

⚠ **Três merecem destaque por serem menos conhecidas e muito eficazes:**

⚠ **`Image File Execution Options`** — a chave `Debugger` faz **outro programa** rodar no lugar do alvo. Não é hook e não é arquivo no disco do alvo: é uma **chave**, e ela redireciona execução. Consequência: o binário legítimo continua íntegro.

⚠ **`AppInit_DLLs`** — carrega DLL em **todo** processo que carrega `user32`. É persistência de escopo **amplo**, e o Windows moderno passou a exigir assinatura + `LoadAppInit_DLLs=1`.

⚠ **`Print\Monitors`** — o spooler roda como `SYSTEM`, e o monitor é carregado por ele. É o vetor do `PrintNightmare`, e a razão de a correlação entre *chave de registro* e *serviço privilegiado* ser um método.

```powershell
# Auditoria das chaves de persistencia mais comuns
$k = @(
 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\BootExecute',
 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon',
 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options',
 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Browser Helper Objects',
 'HKLM:\SYSTEM\CurrentControlSet\Control\Print\Monitors'
)
foreach ($p in $k) {
  if (Test-Path $p) { "── $p"; Get-ItemProperty "$p\*" -ErrorAction SilentlyContinue |
    Select-Object PSChildName, Debugger, DLLName, Shell, Userinit }
}
```

---

## 7.5 O que a API não mostra

⚠ **Três situações em que a leitura pela API é **insuficiente**:

| Situação | Por que a API falha |
|---|---|
| **Hive de outro usuário** | ⚠ Não está carregado — `HKU` não o alcança |
| **Hive de sistema offline** | Não carregado — só o arquivo existe |
| **Chave com ACL restritiva** | `reg query` falha, mas o dado está lá |
| ⚠ **Transação não confirmada** | O estado está no **log**, não no hive |

⚠ **O primeiro é o mais comum em investigação:** o `NTUSER.DAT` de um usuário que não fez logon existe no disco, e **não está** em `HKU`. Para lê-lo, é preciso **carregar** o hive — `reg load` — e a leitura exige privilégio.

```powershell
# Carregar o hive de outro usuario, para analise
reg load HKU\Analise C:\Users\outro\NTUSER.DAT
reg query "HKU\Analise\Software\Microsoft\Windows\CurrentVersion\Run"
reg unload HKU\Analise
```

⚠ **Isso é procedimento **forense padrão**, e explica por que "não há nada no registro" costuma significar "não olhei o hive certo".

---

## 7.6 Registro como superfície de ataque

⚠ **Quatro classes de problema, e todas são estruturais:**

| Classe | Mecanismo |
|---|---|
| **Permissão de chave** | ⚠ `WRITE_DAC`/`WRITE_OWNER` em chave de serviço = escalação |
| **Symlink e redirecionamento** | Chave com ACL frouxa redirecionada para um hive controlado |
| **Path não cotado** | ⚠ Serviço com caminho sem aspas e espaço → caminho alternativo |
| **Substituição de hive** | Hive carregado de local não confiável |

⚠ **A terceira é a mais famosa e a mais simples:** um serviço com `ImagePath` contendo espaço e **sem aspas** faz o Windows procurar em caminhos alternativos. É o padrão *Unquoted Service Path* — e é **configuração**, não bug.

⚠ **A primeira é a classe que este curso trata:** quem tem `WRITE_DAC` em uma chave que um serviço privilegiado lê de forma insegura **altera o comportamento do serviço**. É o módulo 4 (handle) encontrando o módulo 7.

```powershell
# Checar ACL de chaves sensiveis
$acl = Get-Acl HKLM:\SYSTEM\CurrentControlSet\Services
$acl.Access | Format-Table IdentityReference, RegistryRights, AccessControlType

# ⚠ Procurar chaves em que usuario comum tem WRITE_DAC
#    (auditoria real, simplificada)
```

---

## Laboratório 7 — Ler o registro por baixo

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```powershell
cd C:\lab; mkdir m07; cd m07

# 1. Os hives carregados, e o arquivo de cada um
reg query HKLM\SYSTEM\CurrentControlSet\Control\hivelist

# 2. Ler um hive sem a API: copie e analise
copy C:\Windows\System32\config\SYSTEM C:\lab\m07\SYSTEM.copy
# ⚠ o hive em uso esta bloqueado para leitura direta

# 3. A assinatura e a versao, nos primeiros bytes
$b = [System.IO.File]::ReadAllBytes("C:\lab\m07\SYSTEM.copy")[0..11]
-join ($b | ForEach-Object { [char]$_ })
# ⚠ esperado: "regf"
```

```powershell
# 4. Carregar o hive de outro usuario, para analise
#    (⚠ só faça isso em VM/lab)
reg load HKU\LabAnalysis C:\Users\Public\NTUSER.DAT
reg query "HKU\LabAnalysis\Software\Microsoft\Windows\CurrentVersion\Run"
reg unload HKU\LabAnalysis

# 5. Auditoria das chaves de persistencia (script do 7.4)
```

```
# 6. No WinDbg, o registro como objeto
!object \Registry
!object \Registry\Machine | head -20
dt nt!_CM_KEY_BODY -a | head -25
dt nt!_CM_KEY_NODE -a | head -25
```

**O que observar:** no passo 3, a assinatura `regf`. ⚠ Ela é a prova de que o registro é **um arquivo com formato**, e não um banco opaco — e é o que permite análise forense sem sistema ligado.

**Exercício 1:** decodifique os primeiros bytes de um hive: assinatura, número de sequência, timestamp do `BASE BLOCK`. ⚠ Escreva o offset de cada campo, conforme a especificação pública do formato.

**Exercício 2:** liste todas as chaves do 7.4 na sua VM e escreva, para cada uma, **o que o Windows faz com ela** e **em que contexto de privilégio**. ⚠ Ordene por gravidade: qual delas dá execução como `SYSTEM` com menos ruído?

**Exercício 3 (o que vale):** encontre na sua VM um serviço cujo `ImagePath` contenha espaço e **não** esteja entre aspas. ⚠ Escreva o caminho alternativo que o Windows tentaria, e o que um usuário com permissão de escrita naquela pasta conseguiria. É o padrão *Unquoted Service Path*, e a demonstração de que **configuração é superfície**.

---

## Resumo

- ⚠ **A chave do registro é um `Key` objeto**, no namespace `\Registry` — as `HKEY_*` são atalhos do userspace.
- O **`hive` é um arquivo** com assinatura `regf`, organizado em bins e **cells** referenciadas por offset.
- ⚠ **`SYSTEM` é o hive da persistência** — serviços e drivers vivem nele, e executam como `SYSTEM`.
- **Transação (`KTM`/`TxR`)** mantém estado não aplicado no **log** — ⚠ invisível para quem só lê o hive principal.
- ⚠ **`Image File Execution Options` → `Debugger`** redireciona execução **sem tocar no binário**.
- ⚠ **Hive de outro usuário não está carregado** — `reg load` é procedimento forense padrão.
- **Registro é superfície**: `WRITE_DAC` em chave de serviço, symlink, path não cotado e substituição de hive.

---

## O que o próximo módulo entrega

Você sabe ler o registro por baixo. O módulo 8 abre **`ALPC` e `RPC`** — a comunicação entre processos no Windows, e o que ela expõe quando um endpoint privilegiado aceita conexão de quem não deveria.
