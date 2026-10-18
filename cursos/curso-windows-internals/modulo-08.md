# Módulo 8 — `ALPC` e `RPC`: IPC Como Superfície, e Endpoint Exposto

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 8 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 7
**Próximo:** Módulo 9 — Token, SID e integridade

---

## O que este módulo entrega

Ao final, você vai entender **como processos conversam no Windows**, **o que um endpoint exposto significa em termos de privilégio**, e **por que uma parte grande dos CVE de escalação do Windows mora em serviço privilegiado que aceita conexão**. É o módulo que liga o kernel ao serviço.

---

## 8.1 Três mecanismos, três perfis

| Mecanismo | Nível | Usado por |
|---|---|---|
| **`LPC` / `ALPC`** | ⚠ **Nativo** | Serviços, `csrss`, `smss`, subsistemas |
| **`RPC`** | ⚠ **Sobre ALPC ou TCP** | Quase todo serviço moderno |
| **`COM` / DCOM** | Sobre RPC | Automação, objetos distribuídos |

⚠ **A cadeia de dependência importa:**

```
   COM  ──►  RPC  ──►  ALPC  ──►  objeto do gerenciador de objetos
                                   (Port, seção, handle)
```

⚠ **`ALPC` (*Advanced Local Procedure Call*) é a base.** Quando você chama uma função em um serviço na mesma máquina, a chamada vira mensagem `ALPC`. Entender `ALPC` é entender **onde o privilégio cruza a fronteira do processo** — que é a fronteira que uma escalação local explora.

---

## 8.2 `ALPC`: a porta e a mensagem

⚠ **A comunicação se faz por um objeto `Port`** — e ele é objeto do gerenciador (módulo 3), com **`SecurityDescriptor`**.

```
   CLIENTE                                SERVIDOR
   ───────                                ────────

   NtConnectPort(                        NtCreatePort(
     "\\RPC Control\\MeuEndpoint",  ──►    "\\RPC Control\\...")
     ...)                                        │
        │                                        ▼
        │                                  NtListenPort
        ▼                                        │
   mensagem  ─────────────────────────►   NtReplyWaitReceivePort
   (ALPC_MESSAGE)                              │
                                               ▼
                                          processa
```

⚠ **Quatro coisas definem a superfície, e as quatro aparecem em bug real:**

| Elemento | O que decide |
|---|---|
| **Nome do port** | ⚠ Quem consegue **encontrar** o endpoint |
| **`SecurityDescriptor`** | ⚠ Quem consegue **conectar** |
| **Formato da mensagem** | ⚠ ⚠ **O PARSER** — onde os bug moram |
| **Token do cliente** | ⚠ ⚠ **O que o cliente pode pedir ao servidor** |

⚠ **O último é o coração do módulo.** Todo serviço privilegiado tem que responder a uma pergunta: **"quem está do outro lado, e o que ele pode fazer?"** E a resposta errada é a escalação.

---

## 8.3 Impersonation: o mecanismo perigoso

⚠ **`Impersonation` é o que permite ao servidor agir como o cliente** — e é o mecanismo que transforma um bug de serviço em escalação.

| Nível | O que o servidor pode |
|---|---|
| **`SecurityAnonymous`** | ⚠ Nada — o servidor não sabe quem é o cliente |
| **`SecurityIdentification`** | Sabe quem é, **não pode agir como ele** |
| **`SecurityImpersonation`** | ⚠ ⚠ **Pode agir como o cliente, localmente** |
| **`SecurityDelegation`** | ⚠ ⚠ Pode agir **remotamente** — em nome do cliente |

⚠ **A inversão que confunde:** quem **pede** o nível é o **cliente**, e quem **decide** é o **servidor**. Mas o risco é do **servidor**:

```
   Servidor como SYSTEM  ◄── cliente conecta
        │
        ├── cliente diz: "impersone-me em SecurityImpersonation"
        │
        ├── servidor faz: ImpersonateSecurityContext()
        │       │
        │       ▼
        │   ⚠ agora o servidor roda COMO O CLIENTE
        │
        └── se o servidor NÃO checar quem é o cliente
                antes de fazer algo privilegiado
                │
                ▼
            ⚠ ⚠ ESCALACAO: o cliente faz o servidor
                executar ação com privilégio que o
                cliente não tem
```

⚠ **É o padrão mais explorado de serviço do Windows.** Não é bug de kernel — é **lógica de autorização**. E a defesa é exatamente uma pergunta: **"o que eu concedo a este cliente, dado quem ele é?"**

⚠ **E o erro comum é o espelho disso:** o serviço verifica o nível de impersonação **na conexão** e não verifica **a cada operação**. Entre conectar e operar, o cliente pode... esperar. Ou pior: o serviço faz a operação privilegiada **antes** de impersonar, usando o próprio token.

```c
// O padrao vulneravel, em esqueleto
// ⚠ o servidor NAO checa se o cliente tem direito a operacao
void atende(ALPC_PORT *p, MSG *m) {
    HANDLE hTok;
    // impersone o cliente
    NtOpenThreadToken(GetCurrentThread(), TOKEN_ALL_ACCESS, TRUE, &hTok);

    switch (m->op) {
        case OP_LER_ARQUIVO_QUALQUER:
            // ⚠ NAO checa se o cliente pode ler
            // faz a operacao COMO O CLIENTE (certo) ou como SYSTEM (errado)
            break;
    }
}
```

---

## 8.4 `RPC`: o que roda por cima

⚠ **Protocolo de chamada remota**, usado por praticamente todo serviço moderno. Dois tipos:

| Tipo | Como especificar interface | Uso |
|---|---|---|
| **`ncalrpc`** | ⚠ Local, sobre `ALPC` | Serviço local |
| **`ncacn_np`** | Pipe nomeado | Serviço local, acessível |
| **`ncacn_ip_tcp`** | ⚠ Rede | Serviço remoto |
| **`ncacn_http`** | Sobre HTTP | ⚠ Atravessa firewall |

⚠ **Três peças definem a superfície de um `RPC`:**

| Peça | O que é |
|---|---|
| **Endpoint** | ⚠ O nome/como alcançar |
| **Interface UUID** | ⚠ **Qual conjunto de funções** está exposto |
| **Binding** | ⚠ O protocolo e o nível de autenticação |

⚠ **A enumeração de endpoint `RPC` é reconhecimento padrão de alvo Windows**, e a informação que mais importa é **o nível de autenticação exigido** — um endpoint que aceita conexão sem autenticação, em serviço privilegiado, é candidato.

```powershell
# Os endpoints RPC registrados nesta maquina
# ⚠ existe ferramenta dedicada (RpcView, rpcping); a enumeracao e reconhecimento padrao

# O servico RPC e seus processos hospedeiros
Get-Service RpcSs
Get-Process svchost | Where-Object { $_.Modules.FileName -match 'rpcrt4' } |
  Select-Object Id, ProcessName
```

⚠ **O ponto que liga este módulo ao anterior:** todo `RPC` local acaba passando pelo port `ALPC`, e **o `SecurityDescriptor` do port é a decisão de acesso real**. Um endpoint documentado como "restrito" pode ser alcançável **se o port permitir**.

---

## 8.5 O padrão dos CVE de serviço

⚠ **A estrutura se repete, e reconhecê-la é meio caminho:**

```
   1. ⚠ SERVICO PRIVILEGIADO com endpoint alcancavel
   2. ⚠ MENSAGEM com formato que o servico NAVALIDA
        (comprimento, tipo, relacao entre campos)
   3. ⚠ CONSEQUENCIA: escrita em memoria do servico, ou
        operacao com token do servico
   4. ⚠ Primitiva: o cliente escolhe o caminho
```

| Classe | O que o cliente controla |
|---|---|
| **Validação de tamanho** | `memcpy` guiado por campo do cliente |
| **Confusão de tipo** | O serviço lê o campo como outro tipo |
| **`Impersonation` mal checada** | O serviço age como quem não devia |
| **Caminho de arquivo** | Serviço como `SYSTEM` grava onde o cliente escolhe |
| ⚠ **Operação de serviço** | O cliente pede ao serviço o que não pode fazer |

⚠ **A última linha é a mais elegante e a menos explorada:** não há corrupção nenhuma. O serviço **faz o que foi pedido**, e o que foi pedido era privilegiado. É a mesma classe do `release_agent` do Linux (curso de Linux Internals, módulo 7) — **desenho, não bug**.

---

## 8.6 Superfície por privilégio

⚠ **A tabela que o reconhecimento de alvo produz:**

| Endpoint | Serviço | Privilégio | Autenticação |
|---|---|---|---|
| `\RPC Control\...` | `svchost` | Rede | ? |
| Serviço de terceiro | `SYSTEM` | ⚠ **SYSTEM** | ⚠ ? |
| `ncalrpc` de EDR | `SYSTEM` + `PPL` | ⚠ Máximo | ? |

⚠ **As duas colunas da direita são as que decidem se vale olhar.** Privilégio `SYSTEM` com autenticação frouxa é o alvo que interessa — e é o que o curso de Pesquisa em Windows trata com método.

```powershell
# Servicos que rodam como SYSTEM
Get-CimInstance Win32_Service | Where-Object { $_.StartName -eq 'LocalSystem' } |
  Select-Object Name, PathName, StartMode | Format-Table -AutoSize

# ⚠ A pergunta que segue: qual deles expoe endpoint?
```

---

## Laboratório 8 — Ver a comunicação

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```
# ── WinDbg kernel mode ──────────────────────────────────────

# 1. Os objetos de porta
!object \RPC Control | head -25
!object \BaseNamedObjects | Select-String -Pattern 'Port|ALPC'

# 2. Um port concreto, e o descritor de seguranca
dt nt!_ALPC_PORT -a | head -40
dt nt!_ALPC_PORT_ATTRIBUTES -a

# 3. O token do cliente
!token <ENDERECO_DO_TOKEN>
dt nt!_TOKEN -a | head -40
```

```powershell
# 4. Os servicos com privilegio, e o binario de cada um
Get-CimInstance Win32_Service |
  Where-Object { $_.StartName -eq 'LocalSystem' -and $_.State -eq 'Running' } |
  Select-Object Name, ProcessId, PathName | Format-Table -AutoSize

# 5. O host do RPC, e os modulos carregados
Get-Process svchost | Select-Object -First 3 -ExpandProperty Modules |
  Where-Object { $_.ModuleName -match 'rpcrt4|kernelbase|ntdll' } |
  Select-Object ModuleName, FileName -Unique
```

**O que observar:** no passo 1, os objetos de porta aparecem no **namespace de objetos**, como qualquer outro objeto. ⚠ Isso significa que eles têm `SecurityDescriptor`, e que a decisão de acesso é **a mesma** do módulo 3 — o que unifica a auditoria.

**Exercício 1:** no `WinDbg`, imprima o `SecurityDescriptor` de um `ALPC_PORT` e decodifique a DACL: quais SIDs podem conectar, e com que direitos? ⚠ Escreva a resposta em português corrente.

**Exercício 2:** liste os serviços que rodam como `LocalSystem` na sua VM e, para cada um, responda: ele expõe endpoint local? Qual? ⚠ É o reconhecimento que precede qualquer análise de serviço.

**Exercício 3 (o que vale):** no `WinDbg`, observe uma chamada `ALPC` completa — o cliente envia, o servidor recebe, e o token muda no processo servidor. Documente **o instante** em que o token do servidor é substituído pelo do cliente. ⚠ Esse instante é o coração do 8.3, e é o que a lógica de autorização do serviço precisa levar em conta.

---

## Resumo

- **`COM` → `RPC` → `ALPC` → objeto `Port`** — a cadeia que explica a comunicação local.
- ⚠ **O port `ALPC` é objeto com `SecurityDescriptor`** — a decisão de acesso é a do módulo 3.
- ⚠ **Quatro elementos definem a superfície**: nome, `SecurityDescriptor`, formato da mensagem e token do cliente.
- ⚠ **`Impersonation` é o mecanismo que transforma bug de serviço em escalação** — e quem decide o nível é o servidor.
- ⚠ **O erro comum não é o nível na conexão — é não verificar a cada operação.**
- **`RPC`** expõe interface e endpoint; ⚠ **o nível de autenticação exigido é a informação que mais importa**.
- ⚠ **A classe mais elegante não corrompe nada**: o serviço faz o que foi pedido, e o que foi pedido era privilegiado.

---

## O que o próximo módulo entrega

Você sabe como o privilégio cruza a fronteira do processo. O módulo 9 abre **o token** — a estrutura que define identidade, integridade e privilégio — e mostra por que quase todo bug de segurança no Windows é uma pergunta de token respondida de forma errada.
