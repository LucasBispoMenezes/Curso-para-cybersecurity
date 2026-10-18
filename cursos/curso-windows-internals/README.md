# Windows Internals: O Objeto, o Handle e o Ring 0

**Curso · 36 horas · 12 módulos · Nível: avançado**

---

## Sobre este curso

Este curso é o **mapa do Windows** do ponto de vista de quem pesquisa segurança.

A pergunta que organiza tudo:

> **No Windows, privilégio não é binário — é um TOKEN.** E quase toda falha de segurança é uma
> pergunta de **integridade, SID ou acesso a objeto** respondida de forma incorreta em algum ponto.

⚠ **Por que ele existe na trilha:** os 19 cursos originais têm Linux, rede, web e kernel genericamente — e **nenhum módulo abria o `EPROCESS`**. Windows é o maior buraco do material, e é o sistema em que a maior parte das empresas que você vai testar roda.

⚠ **E o método é o mesmo do `Linux Internals`** — a fronteira, a cópia, o objeto, o privilégio. O que muda é o mapa: aqui não há syscall direta, há **objeto**, **handle** e **tipo**, com uma camada `Win32` por cima que esconde tudo.

---

## Pré-requisitos

| Pré-requisito | Por quê |
|---|---|
| **Linux Internals** | ⚠ O método: syscall, objeto, privilégio, refcount |
| **C para Pesquisa de Segurança** | memória, ponteiro, estrutura |
| **Assembly e RE** *(ajuda)* | `PE`, `IDA`, disassembly |
| **Redes** *(ajuda)* | `RPC`, `SMB` |

⚠ **Sem os dois primeiros, o curso fica decorativo.** Eles dão o **método**; aqui ele é aplicado a outro kernel.

---

## Estrutura

| # | Módulo | Horas | O que entrega |
|---|---|---|---|
| 1 | [Do `Win32` ao kernel](modulo-01.md) | 3 | `ntdll`, `syscall`, `SSDT`, e onde o `Win32` mente |
| 2 | [Processo e thread](modulo-02.md) | 3 | `EPROCESS`, `ETHREAD`, `KPROCESS`, `KTHREAD` |
| 3 | [O modelo de objeto](modulo-03.md) | 3 | tipo, `ObjectHeader`, `refcount`, `SecurityDescriptor` |
| 4 | [Handle](modulo-04.md) | 3 | a tabela, o `GrantedAccess`, e o que ela autoriza |
| 5 | [Memória](modulo-05.md) | 3 | `VAD`, pool `Paged`/`NonPaged`, corrupção |
| 6 | [`PE`, `PEB` e `TEB`](modulo-06.md) | 3 | o que o processo sabe de si mesmo |
| 7 | [Registro](modulo-07.md) | 3 | `hive`, transação, persistência que a API não mostra |
| 8 | [`ALPC` e `RPC`](modulo-08.md) | 3 | IPC como superfície, endpoint exposto |
| 9 | [Token, SID e integridade](modulo-09.md) | 3 | privilégio como estrutura |
| 10 | [Mitigação](modulo-10.md) | 3 | `CFG`, `ACG`, `ASLR`, `DEP`, `PPL` — e o limite |
| 11 | [Driver e `IOCTL`](modulo-11.md) | 3 | o contrato, o método de buffer, a validação |
| 12 | [`ETW`](modulo-12.md) | 3 | telemetria como fonte, e provider próprio |

**Ordem de leitura:** linear. Os módulos 3 e 4 são a base dos módulos 7, 9 e 11.

---

## O laboratório

⚠ **Duas exigências que valem para todo o curso:**

⚠ **`WinDbg` com símbolo de kernel.** Sem `srv*` apontado para o servidor de símbolos, você vê `fffff880` e nome ausente — e o curso inteiro é sobre ler estrutura.

⚠ **VM separada, com snapshot limpo.** O curso **quebra** a VM de propósito: instala driver sem assinatura, envia `IOCTL` malformado e provoca `bugcheck`. Debug de kernel por rede (`net:port=50000`) para o `WinDbg` ficar **de fora**.

```powershell
bcdedit /set debug on
bcdedit /set testsigning on
bcdedit /set dbgsettings net hostip:<IP> port:50000 key:1.2.3.4
```

⚠ **O alvo é a sua VM, e o driver é o seu.** Nenhum lab aponta para sistema de terceiro.

⚠ **Os labs não foram testados em VM.** Valide cada um no seu ambiente antes de publicar ou usar em aula.

---

## Conexões com os outros cursos da trilha

| Curso | Ligação |
|---|---|
| **Linux Internals** | Pré-requisito direto: o método |
| **C para Pesquisa de Segurança** | Pré-requisito direto |
| **Assembly e RE** | Ajuda: `PE`, disassembly |
| **Pesquisa de Segurança em Windows** | ⚠ **Continuação**: aqui é o mapa; lá é a caça |
| **Redes** | Ligação: `RPC`, `SMB` como superfície |
| **APT e C2** | Ligação: persistência, `bring your own`, telemetria |
| **Detecção e Evasão** | Ligação: `ETW`, `AMSI`, callback |

---

## Arquivos do curso

```
curso-windows-internals/
├── README.md          ← este arquivo
├── 00-ementa.md       ← ementa completa
├── modulo-01.md ... modulo-12.md
├── avaliacoes.md      ← banco de questões
└── glossario.md       ← termos do curso
```

---

*Material didático original. Todo lab roda em VM própria do aluno, com driver escrito por ele.
Nenhum material que ensine atacar sistema de terceiro.*
