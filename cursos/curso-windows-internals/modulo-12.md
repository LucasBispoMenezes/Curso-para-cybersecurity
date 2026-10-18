# Módulo 12 — `ETW`: Telemetria Como Fonte, e Provider Próprio

**Curso:** Windows Internals: O Objeto, o Handle e o Ring 0
**Módulo:** 12 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 11
**Próximo:** —

---

## O que este módulo entrega

Ao final, você vai saber **onde a telemetria do Windows nasce**, **o que `ETW` entrega e o que ela perde**, e **como escrever um provider próprio**. É o módulo que fecha o curso transformando o mapa em observação — e o que prepara o curso de Pesquisa em Windows, onde a medição de detecção é parte do método.

---

## 12.1 As camadas de telemetria

⚠ **O Windows produz evento em várias camadas, e elas **não** cobrem as mesmas coisas:**

| Camada | O que observa | ⚠ Onde não chega |
|---|---|---|
| **`ETW`** | ⚠ **Quase tudo, no kernel e no userspace** | ⚠ Se o provider não emite |
| **`Audit`** | Objeto, logon, política | ⚠ Precisa estar **ligado** e configurado |
| **`Sysmon`** | ⚠ Processo, rede, imagem, driver | ⚠ É driver de terceiro |
| **`AMSI`** | ⚠ **Conteúdo** de script e .NET | ⚠ Não vê binário nativo |
| **Callback de kernel** | ⚠ Processo, thread, imagem, objeto | ⚠ Precisa driver próprio |

⚠ **A leitura que o módulo instala:** **nenhuma camada cobre tudo**, e a cobertura **depende de configuração**. É o mesmo raciocínio de custo do curso de Detecção e Evasão — e a razão de a pergunta certa ser *"o que esta camada **não** vê?"*.

---

## 12.2 `ETW`: o mecanismo

⚠ **Três papéis, e a separação é o que faz o mecanismo funcionar:**

```
   PROVIDER                        CONSUMIDOR
   (emite evento)                  (recebe evento)
        │                               ▲
        │                               │
        └──────► SESSION  ◄─────────────┘
                 (intermediaria)
                    │
                    ├── Session em BUFFER  (tempo real)
                    ├── Session para ARQUIVO (.etl)
                    └── Session para KERNEL  (NT Kernel Logger)
```

⚠ **O modelo é *publish/subscribe*, e as três consequências:**

| Consequência | Efeito |
|---|---|
| ⚠ **Provider emite só o que quer** | O que ele não emite, ninguém vê |
| ⚠ **Session é independente** | Sem session, o evento **se perde** |
| ⚠ **Kernel provider é separado** | Os eventos de kernel têm seu próprio caminho |

⚠ **A primeira linha é a mais importante, e a mais mal-entendida:** `ETW` não é interceptação. É **instrumentação** — o código emite explicitamente. Um driver que **não** chama `EtwWrite` não gera evento, por mais suspeito que seja.

```powershell
# As sessions ativas
logman query -ets

# Os providers registrados
logman query providers | Select-Object -First 30
logman query providers | Measure-Object         # ⚠ quantos existem

# Detalhe de um provider
logman query providers Microsoft-Windows-Kernel-Process
```

⚠ **A última saída é a que mais informa:** ela mostra os **GUIDs** e as **keywords** do provider — ou seja, **o que ele permite ligar**. É a lista do que é observável.

---

## 12.3 O `NT Kernel Logger`: a telemetria do kernel

⚠ **É a session mais importante, e a mais antiga.** Ela liga os providers de kernel:

```powershell
# Ligar a session de kernel, com as flags do que se quer
# ⚠ deixe como esta no lab — e leia o que cada flag cobre
logman start "NT Kernel Logger" -p "Windows Kernel Trace" `
  (process,thread,img,file,reg,net) -o kernel.etl -ets

# Ver o que esta ligado
logman query "NT Kernel Logger" -ets

# Parar
logman stop "NT Kernel Logger" -ets
```

| Flag | O que captura |
|---|---|
| **`process`** | ⚠ Criação e término de processo |
| **`thread`** | Criação e término de thread |
| **`img`** | ⚠ **Carregamento de imagem** — módulos |
| **`file`** | I/O de arquivo |
| **`reg`** | ⚠ Acesso ao registro |
| **`net`** | Atividade de rede |
| `disk` / `diskio` | I/O de disco |
| ⚠ **`drv`** | Driver carregado |

⚠ **A flag `img` é a que fecha o módulo 6:** ela registra **carregamento de imagem** — e é a **segunda fonte** que o 6.6 exige. Comparar a lista do `PEB` com os eventos de `img` revela **injeção** — porque código injetado não passa por `LoadImage`.

⚠ **E a flag `process` tem a mesma qualidade:** o evento de criação traz **o caminho da imagem e a linha de comando reais**, do kernel — e não do `PEB`, que é manipulável (módulo 6).

```powershell
# A analise: ler um .etl e comparar as fontes
# ⚠ tracerpt converte o .etl em texto/XML
tracerpt kernel.etl -o kernel.xml -of XML
Select-String -Path kernel.xml -Pattern 'Image/Load' | Select-Object -First 10
```

---

## 12.4 `AMSI`: a camada de conteúdo

⚠ **`Antimalware Scan Interface`** — o que os produtos de segurança usam para **inspecionar conteúdo** antes de executar.

| O que `AMSI` vê | ⚠ O que não vê |
|---|---|
| ⚠ PowerShell, WMI, VBScript, JScript | ⚠ **Binário nativo** |
| ⚠ Conteúdo de assembly .NET | ⚠ O que passa por outro caminho |
| `Office` macro | `Lua`, `Python` não integrados |
| ⚠ **O texto do script** | — |

⚠ **A segunda linha é a lição:** `AMSI` inspeciona **conteúdo de linguagem**, e não de binário. Todo o discurso de "burlar AMSI" só faz sentido porque a superfície dele é **texto** — e a razão de existir de técnicas de ofuscação em script.

⚠ **A visão arquitetural que o curso quer:** `AMSI` é uma **interface**, não um motor. Ela entrega o conteúdo para o produto decidir. Isso significa que (a) o que o produto faz com o conteúdo é política do produto, e (b) **um provider pode ser registrado** — e é exatamente aí que a superfície de ataque aparece em estudo acadêmico.

```powershell
# AMSI esta presente?
Get-ChildItem C:\Windows\System32\amsi.dll -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.Modules.ModuleName -contains 'amsi.dll' } |
  Select-Object -Unique ProcessName -First 10
```

---

## 12.5 Callbacks de kernel

⚠ **A camada que **não** depende de provider emitir.** O kernel oferece registro explícito:

| Callback | O que avisa |
|---|---|
| **`PsSetCreateProcessNotifyRoutineEx`** | ⚠ Criação de processo |
| **`PsSetCreateThreadNotifyRoutine`** | Criação de thread |
| **`PsSetLoadImageNotifyRoutine`** | ⚠ Carregamento de imagem |
| **`ObRegisterCallbacks`** | ⚠ **Abertura de handle** — módulo 4 |
| `CmRegisterCallbackEx` | Acesso ao registro |
| `IoRegisterFsRegistrationChange` | ⚠ Montagem de filesystem |

⚠ **O `ObRegisterCallbacks` é o mais interessante, e o que fecha o módulo 4:** ele permite **observar e alterar** a abertura de handle. É assim que um produto pode, por exemplo, **remover `PROCESS_VM_READ`** do acesso concedido a um processo protegido. ⚠ E é por isso que "ler `lsass`" é hoje um caminho que exige contornar **três** camadas, não uma.

⚠ **A lição estrutural do módulo:** existem **duas famílias** de telemetria — a que **depende de quem escreve o código** (provider `ETW`) e a que **o kernel oferece** (callback). ⚠ A segunda é mais confiável **para o que ela cobre**, e cobre **menos**.

```
   PROVIDER (ETW)                    CALLBACK (kernel)
   ──────────────                    ─────────────────
   o codigo DECIDE emitir            ⚠ o kernel AVISA sempre
   cobertura AMPLA                   cobertura ESTREITA
   ⚠ pode ser silenciado             ⚠ nao pode (sem ring 0)
```

---

## 12.6 Escrever um provider

⚠ **A parte prática do módulo: emitir evento próprio.** O caminho moderno é *manifest-free*, com `TraceLogging`.

```c
// provider.c — um provider TraceLogging minimo
#include <windows.h>
#include <evntrace.h>
#include <TraceLoggingProvider.h>

// ⚠ define o provider com nome e GUID proprios
TRACELOGGING_DEFINE_PROVIDER(
    g_meuProvider,
    "Meu-Lab-Provider",
    (0x11112222, 0x3333, 0x4444, 0x55, 0x66,
     0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc));

int main(void) {
    TraceLoggingRegister(g_meuProvider);

    // ⚠ emite um evento com dois campos
    TraceLoggingWrite(g_meuProvider,
        "LabEvento",
        TraceLoggingString("teste", "nome"),
        TraceLoggingUInt32(42, "valor"),
        TraceLoggingLevel(TRACE_LEVEL_INFORMATION));

    TraceLoggingUnregister(g_meuProvider);
    return 0;
}
```

⚠ **E a observação, do outro lado:**

```powershell
# 1. Registrar e iniciar uma session para o seu provider
logman create trace MinhaSessao -p "{11112222-3333-4444-5566-778899aabbcc}" -o meu.etl -ets

# 2. Rodar o programa
#    ⚠ o evento vai para a session, se ela estiver ativa

# 3. Parar e ler
logman stop MinhaSessao -ets
tracerpt meu.etl -o meu.xml -of XML
Get-Content meu.xml | Select-String 'LabEvento'
```

⚠ **A demonstração do 12.2 que você faz com as próprias mãos:** sem session ativa, o evento **não aparece em lugar nenhum**. Não é que ele foi perdido — é que **não havia consumidor**. É a característica central do modelo.

```windbg
# E a telemetria de dentro do kernel
dt nt!_ETW_REG_ENTRY -a | head -25
dt nt!_ETW_GUID_ENTRY -a | head -25
!object \*Etw* | head -20
```

---

## Laboratório 12 — Medir a telemetria

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab.**

```powershell
cd C:\lab; mkdir m12; cd m12

# 1. A telemetria disponivel
logman query -ets
logman query providers | Measure-Object -Line
logman query providers Microsoft-Windows-Kernel-Process

# 2. Ligar a session de kernel
logman start "NT Kernel Logger" -p "Windows Kernel Trace" `
  (process,thread,img,file,reg) -o kernel.etl -ets
logman query "NT Kernel Logger" -ets
```

```powershell
# 3. Gerar atividade para ser observada
Start-Process notepad
New-Item C:\lab\m12\teste.txt -ItemType File -Force
Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion

# 4. Parar e analisar
logman stop "NT Kernel Logger" -ets
tracerpt kernel.etl -o kernel.xml -of XML
"eventos: " + (Select-String -Path kernel.xml -Pattern '<Event ' | Measure-Object).Count
```

```powershell
# 5. ⚠ A comparacao do modulo 6: PEB vs eventos de img
#    Liste os modulos que o PEB diz, e os eventos Image/Load do .etl
#    ⚠ Inconsistencia entre as duas fontes = algo escondido

Select-String -Path kernel.xml -Pattern 'Image/Load' |
  Select-Object -First 20
```

**O que observar:** no passo 4, a contagem de eventos é **alta** — dezenas de milhares por minuto de atividade. ⚠ Isso é o **custo** da telemetria, e a razão de ela ser **seletiva**: ligar tudo é caro, e é por isso que a configuração é escolha.

**Exercício 1:** compare a lista de módulos do `PEB` (módulo 6) com os eventos `Image/Load` do `.etl`. ⚠ Escreva as duas listas e aponte qualquer módulo que apareça **só** em uma delas. Explique por que as duas fontes deveriam concordar.

**Exercício 2:** compile o provider do 12.6 e rode-o **duas vezes**: uma com a session ativa e outra sem. ⚠ Escreva o que mudou na observação, e por quê. É a demonstração do modelo *publish/subscribe*.

**Exercício 3 (o que vale):** escolha **um** callback de kernel do 12.5 e responda, por leitura da documentação: (a) o que ele **garante** cobrir, (b) o que ele **não** cobre, (c) por que ele é mais confiável que um provider `ETW` para o que cobre. ⚠ Depois diga qual dos dois você escolheria para detectar injeção de código, e por quê. É o raciocínio que fecha o curso.

---

## Resumo

- ⚠ **Nenhuma camada de telemetria cobre tudo** — `ETW`, `Audit`, `Sysmon`, `AMSI` e callback cobrem coisas diferentes.
- ⚠ **`ETW` é instrumentação, não interceptação**: o código emite; o que não é emitido **não é visto**.
- O modelo é *publish/subscribe* — ⚠ **sem session ativa, o evento não existe para ninguém**.
- O **`NT Kernel Logger`** é a session central; a flag **`img`** registra carregamento de imagem.
- ⚠ **`AMSI` inspeciona CONTEÚDO de linguagem, não binário nativo.**
- ⚠ **Callbacks de kernel não dependem de emissão** — cobrem **menos**, e são **mais confiáveis** no que cobrem.
- ⚠ **`ObRegisterCallbacks` observa e altera abertura de handle** — fecha o raciocínio do módulo 4.

---

## Fim do curso

Você atravessou a fronteira no módulo 1, aprendeu a ler processo, objeto e handle, e passou por memória, `PE`, registro, `ALPC`, token, mitigação, driver e telemetria.

O que fica não é um mapa de estruturas — é **um método**, aplicável a qualquer componente do Windows que você analisar:

> **Onde este código confia em dado que não deveria — e quem valida?**

⚠ **E o próximo passo da trilha é o `Pesquisa de Segurança em Windows`.** Aqui você desenhou o mapa; lá você caça no território: triagem de alvo, contrato do `IOCTL`, corrupção de pool, `BYOVD`, `PPL` e `variant hunting`. Você já tem a pergunta e já sabe ler as estruturas que o achado vai exigir.
