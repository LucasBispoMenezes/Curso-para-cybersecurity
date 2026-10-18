# Módulo 10 — Mitigação: `CFG`, `ACG`, `ASLR`, `DEP`, `PPL` — e o Limite de Cada Uma

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 10 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 9
**Próximo:** Módulo 11 — Driver e `IOCTL`

---

## O que este módulo entrega

Ao final, você vai saber **o que cada mitigação do Windows limita de fato**, **o que ela não limita**, e **como verificar se está ativa**. É o módulo que evita tanto o exagero ("é impossível explorar") quanto o desprezo ("mitigação não serve para nada") — e o que o curso de Pesquisa em Windows assume ao escolher alvo.

---

## 10.1 A tabela que resume tudo

⚠ **Cinco mitigações, e a coluna da direita é o que importa:**

| Mitigação | O que limita | ⚠ O que NÃO limita |
|---|---|---|
| **ASLR** | Endereço imprevisível | ⚠ **Vazamento de endereço derruba** |
| **DEP** | Executar dado | ⚠ **ROP** contorna |
| **`CFG`** | Chamada indireta para alvo não válido | ⚠ Alvo válido escolhido pelo atacante |
| **`ACG`** | Página executável dinâmica | ⚠ **JIT e `VirtualProtect` legítimos** |
| **`PPL`** | ⚠ **Acesso ao processo, até de `SYSTEM`** | ⚠ Código já dentro, e bug de kernel |

⚠ **A leitura que o módulo inteiro instala:** nenhuma dessas é uma barreira única. Cada uma **encarece** um caminho específico, e a exploração moderna **combina** o que cada uma deixa aberto.

---

## 10.2 ASLR: aleatoriedade, e o que a derruba

⚠ **No Windows, o ASLR é por **binário**, e depende de flags no `PE`:**

| Flag | Efeito |
|---|---|
| `DYNAMIC_BASE` | ⚠ Habilita relocação da imagem |
| `HIGH_ENTROPY_VA` | ⚠ Entropia maior (**64-bit**) |
| `FORCE_RELOCATE_IMAGES` | Rebase obrigatório |

⚠ **E há a pegadinha estrutural:** ASLR só funciona se o binário **pode** ser relocado — ou seja, se tem **`.reloc`** (módulo 6, seção 1). Um `.exe` sem `.reloc` **não pode** ser reordenado, e o loader o coloca no `ImageBase`.

```powershell
# Verificar as flags de um binario
dumpbin /headers C:\Windows\System32\notepad.exe | Select-String 'dynamic base|high entropy|relocations'

# Comparar com um binario legado
dumpbin /headers C:\Windows\System32\calc.exe | Select-String 'dynamic base'

# ⚠ E para o sistema, no geral
Get-ProcessMitigation -System | Select-Object -ExpandProperty ASLR
```

⚠ **O que derruba o ASLR, e é a razão de "vazamento de endereço" ser passo separado:**

| Vetor | O que vaza |
|---|---|
| **`GetModuleHandle`/`GetProcAddress`** | ⚠ Não vaza — o endereço é calculado em runtime |
| ⚠ **Leitura de memória** | Base de módulo, ponteiro, `EPROCESS` |
| ⚠ **`EnumProcessModules`** | Base de módulos — **sem privilégio algum** |
| ⚠ **Informação de exceção / `minidump`** | Endereços no dump |
| ⚠ **Bug de kernel com leitura** | Tudo |

⚠ **O terceiro item é o mais desprezado:** `EnumProcessModules` **não exige privilégio** e informa a base de todos os módulos do processo. Contra um alvo que **não** ligou `HIGH_ENTROPY_VA`, isso já reduz muito a incerteza.

```c
// A prova: vazar a base sem privilegio nenhum
#include <windows.h>
#include <psapi.h>
#include <stdio.h>
#pragma comment(lib, "psapi.lib")

int main(void) {
    HMODULE mods[1024];
    DWORD needed;
    HANDLE h = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, GetCurrentProcessId());
    if (EnumProcessModules(h, mods, sizeof(mods), &needed)) {
        printf("ntdll   base: %p\n", mods[0]);
        printf("kernel32 base: %p\n", mods[1]);
    }
    return 0;
}
```

---

## 10.3 DEP e `CFG`

⚠ **DEP** impede executar página que não tem permissão de execução. ⚠ **E é contornada por ROP** — que não executa dado novo, e sim **reutiliza** código existente. A resposta é `CFG`.

⚠ **`Control Flow Guard`** valida chamadas **indiretas**: antes de um `call rax`, o runtime confere se o destino é um **alvo válido** (início de função marcado). É o que limita o *call-oriented programming*.

```
   SEM CFG:                        COM CFG:
   call rax  ──► qualquer lugar    call rax  ──► só destinos na lista
                                                 de funcoes validas
```

⚠ **O que `CFG` **não** limita, e é a chave:**

| Limite | Por quê |
|---|---|
| ⚠ **Alvo válido escolhido pelo atacante** | Ele só precisa que exista uma função útil |
| ⚠ **Chamada direta** | `CFG` só olha indireta |
| ⚠ **Corrupção de dado, não de fluxo** | `CFG` não vê |
| ⚠ **Código compilado sem `/guard:cf`** | O módulo não tem a lista |

⚠ **A segunda linha é a menos considerada:** um salto **direto** para uma função legítima (uma função que faz `VirtualProtect`, ou que escreve em memória) tem alvo válido **por definição**. `CFG` garante que o destino é função; **não** garante que a chamada era pretendida.

```powershell
# CFG por processo
Get-ProcessMitigation -Name notepad.exe | Select-Object -ExpandProperty Cfg

# Os modulos com CFG habilitado
dumpbin /headers C:\Windows\System32\ntdll.dll | Select-String 'guard'
```

---

## 10.4 `ACG`: a mais restritiva

⚠ **`Arbitrary Code Guard`** impede criar página **executável** que não venha de imagem assinada. É a mais forte das mitigações de memória.

| O que `ACG` impede | ⚠ O que ele permite |
|---|---|
| `VirtualAlloc(PAGE_EXECUTE_*)` | ⚠ ⚠ **`VirtualProtect` legítimo** |
| Página executável gravável | ⚠ **`JIT` com política** |
| Modificação de imagem mapeada | `VirtualAlloc` **não executável** |
| ⚠ Injeção por código novo | ⚠ **Injeção em processo sem `ACG`** |

⚠ **A segunda linha explica por que `ACG` é difícil de manter ligado em produção:** navegador, runtime de `.NET`, `Java`, `V8` — todos geram código em runtime. Manter `ACG` exige política de JIT, e é por isso que ele aparece em **processos específicos** (`lsass`, navegador em modo restrito), e não no sistema todo.

⚠ **E a quarta linha, a mais importante para escalação:** `ACG` **não se propaga**. Se o alvo do seu processo tem `ACG` mas o processo **vizinho** não tem, o vizinho continua injetável — e é por isso que a mitização é **por processo**.

```powershell
# ACG em processos do sistema
Get-ProcessMitigation -System | Select-Object -ExpandProperty ACG
Get-ProcessMitigation -Name lsass.exe -ErrorAction SilentlyContinue

# Todos os processos com ACG
Get-Process | ForEach-Object {
  $m = Get-ProcessMitigation -Name $_.ProcessName -ErrorAction SilentlyContinue
  if ($m.ACG -and $m.ACG.Enable -eq 'ON') { $_.ProcessName }
} | Sort-Object -Unique
```

---

## 10.5 `PPL`: a proteção que ignora privilégio

⚠ **`Protected Process Light`** é diferente de todas as outras, e é a única que **recusa até `SYSTEM`**.

```
   SEM PPL:                      COM PPL:
   SYSTEM tem acesso total       ⚠ SYSTEM e recusado, a menos
   via SeDebugPrivilege              que o chamador tenha o
                                     nivel de ASSINATURA exigido
```

⚠ **Os níveis, e é a assinatura que decide:**

| Nível | Quem pode abrir |
|---|---|
| `PsProtectedSignerNone` | Ninguém é protegido |
| `PsProtectedSignerAntimalware` | ⚠ **Antimalware assinado** |
| `PsProtectedSignerLsa` | `lsass` — ⚠ **Windows** |
| `PsProtectedSignerWinTcb` | Componentes críticos |
| `PsProtectedSignerWinSystem` | ⚠ **O máximo** |

⚠ **O efeito:** o processo protegido **recusa `PROCESS_VM_READ`, `PROCESS_CREATE_THREAD` e afins**, mesmo para `SYSTEM`. É a razão de `lsass` ser difícil de ler — e a razão de o `mimikatz` clássico (leitura de `lsass`) ter perdido espaço para técnicas que **não** dependem disso.

⚠ **O que `PPL` **não** resolve, e é o ponto do módulo:**

| Limite | Por quê |
|---|---|
| ⚠ **Código que rode DENTRO do processo** | Não há verificação de acesso a si mesmo |
| ⚠ **Bug de kernel** | `PPL` é verificação de acesso, não isolamento |
| ⚠ **Driver assinado vulnerável** | ⚠ `BYOVD` roda em ring 0 e **contorna** |
| ⚠ **Versão sem proteção** | Depende do build e da configuração |

⚠ **A terceira linha é o estado da arte, e a ponte para o curso de Pesquisa em Windows:** se você não pode abrir `lsass` por acesso negado, você **não precisa** de acesso a `lsass` — você precisa de **ring 0**, e para isso existe `SeLoadDriverPrivilege` e o driver assinado e vulnerável.

```powershell
# Quais processos sao protegidos
Get-Process | ForEach-Object {
  try {
    $p = $_.Id
    $prot = (Get-CimInstance Win32_Process -Filter "ProcessId=$p" -ErrorAction SilentlyContinue)
    if ($_.ProcessName -match 'lsass|MsMpEng|services|csrss') { "$($_.ProcessName) (PID $p)" }
  } catch {}
} | Sort-Object -Unique
```

---

## 10.6 Verificar o estado, e ler o cenário

⚠ **O comando que resume o estado de mitigação de um processo — e a análise que ele permite:**

```powershell
# O perfil completo de um processo
Get-ProcessMitigation -Name notepad.exe

# E do sistema (padrao, herdado por processos que nao especificam)
Get-ProcessMitigation -System
```

| Campo | O que diz |
|---|---|
| `DEP.Enable` | Execução de dado bloqueada |
| `ASLR.ForceRelocateImages` | ⚠ Rebase obrigatório |
| `ASLR.HighEntropy` | ⚠ Entropia de 64-bit |
| `Cfg.Enable` | Chamada indireta validada |
| `ACG.Enable` | ⚠ Código dinâmico bloqueado |
| `StrictHandle` | ⚠ Handle inválido derruba processo |
| `BlockNonMicrosoftBinaries` | Assinatura exigida |
| `ChildProcess` | ⚠ Herança controlada |

⚠ **A leitura que interessa para escolher alvo:** o processo tem `ACG`? tem `BlockNonMicrosoftBinaries`? ⚠ **O processo mais fraco do sistema é o caminho** — e a mitigação é **por processo**, então o atacante procura o que não a tem.

⚠ **E a lição geral do módulo, que fecha o raciocínio:**

> **Mitigação não torna impossível. Ela define o PREÇO de cada caminho — e a exploração
> moderna paga o caminho mais barato.**

⚠ **Note que essa frase é a mesma tese do curso de Detecção e Evasão**, aplicada ao outro lado: lá, a pergunta era **quanto custa detectar**; aqui, **quanto custa contornar**. É o mesmo raciocínio de custo — e é o que liga os dois cursos.

---

## Laboratório 10 — Medir a mitigação

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```powershell
cd C:\lab; mkdir m10; cd m10

# 1. O perfil de um processo do sistema
Get-ProcessMitigation -Name lsass.exe -ErrorAction SilentlyContinue
Get-ProcessMitigation -Name notepad.exe

# 2. O padrao do sistema
Get-ProcessMitigation -System | Format-List

# 3. Comparar com um executavel compilado por voce, sem mitigacoes
#    ⚠ compile sem /guard:cf e sem DYNAMICBASE
```

```powershell
# 4. Quais processos tem ACG ligado
Get-Process | ForEach-Object {
  $m = Get-ProcessMitigation -Name $_.ProcessName -ErrorAction SilentlyContinue
  if ($m -and $m.ACG -and $m.ACG.Enable -eq 'ON') { $_.ProcessName }
} | Sort-Object -Unique
```

```c
// 5. Vazar a base de um modulo sem privilegio (prova do 10.2)
#include <windows.h>
#include <psapi.h>
#include <stdio.h>
#pragma comment(lib, "psapi.lib")

int main(void) {
    HMODULE mods[1024]; DWORD n;
    HANDLE h = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, GetCurrentProcessId());
    if (EnumProcessModules(h, mods, sizeof(mods), &n))
        for (DWORD i = 0; i < n/sizeof(HMODULE) && i < 5; i++)
            printf("modulo %lu base: %p\n", i, mods[i]);
    return 0;
}
```

```
# 6. No WinDbg, as flags do processo
dt nt!_EPROCESS <ENDERECO> MitigationFlags
dt nt!_EPROCESS <ENDERECO> -a | Select-String 'Mitigation'

# 7. A protecao de processo, no kernel
dt nt!_PS_PROTECTION -a
#    ⚠ os bits: Type (PPL vs PP) e Signer (Antimalware, Lsa, WinTcb...)
```

**O que observar:** no passo 7, a proteção é **bits no `EPROCESS`** — não é um serviço, não é política externa. ⚠ É o kernel recusando o acesso, o que significa que **um bug de kernel que contorne essas flags invalida a proteção**.

**Exercício 1:** monte a tabela do 10.6 para três processos: um seu, um do sistema (`notepad`), e `lsass`. ⚠ Marque qual é o **mais fraco** dos três, e escreva por que ele seria o alvo na lógica do 10.6.

**Exercício 2:** compile um `.exe` com e sem `/DYNAMICBASE` e compare com `dumpbin /headers`. ⚠ Depois rode os dois e observe o endereço de carga em duas execuções. Escreva o que muda e por quê.

**Exercício 3 (o que vale):** escolha **uma** mitigação e demonstre, no seu lab, **o que ela não impede**. Por exemplo: com `CFG` ligado, chame uma função legítima por ponteiro corrompido — o alvo é válido, e `CFG` aprova. ⚠ Escreva o resultado: a mitigação funcionou como projetada, e ainda assim o fluxo foi desviado. É a distinção que o módulo inteiro instala.

---

## Resumo

- ⚠ **Cinco mitigações, cada uma encarecendo um caminho — nenhuma sendo barreira única.**
- **ASLR** depende de `.reloc`; ⚠ `EnumProcessModules` **vaza a base sem privilégio**.
- **DEP** é contornada por **ROP**; **`CFG`** valida chamada indireta, ⚠ mas **não a intenção**.
- **`ACG`** bloqueia código dinâmico, ⚠ mas **`VirtualProtect` e JIT legítimos passam** — e a mitigação é **por processo**.
- ⚠ **`PPL` recusa até `SYSTEM`** — a única que ignora privilégio; e ⚠ **não resolve código dentro nem bug de kernel**.
- ⚠ **`BYOVD` contorna `PPL`** — a ponte para o curso de Pesquisa em Windows.
- ⚠ **A mitigação define o PREÇO de cada caminho** — o mesmo raciocínio de custo do curso de Detecção e Evasão.

---

## O que o próximo módulo entrega

Você sabe o que cada mitigação limita. O módulo 11 abre o **driver e o `IOCTL`** — o contrato que o kernel expõe aos drivers, o método de buffer, e a validação que falta. É o módulo que prepara diretamente o curso de Pesquisa em Windows.
