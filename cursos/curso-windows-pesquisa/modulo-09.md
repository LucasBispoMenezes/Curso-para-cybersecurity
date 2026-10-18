# Módulo 9 — `ETW` e `AMSI` Sob Teste: Medir o Que a Telemetria Entrega e Perde

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 9 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 8
**Próximo:** Módulo 10 — `Variant hunting`

---

## O que este módulo entrega

Ao final, você vai saber **medir cobertura de telemetria** — não "está ligado?", mas **"o evento chega, com que informação, e com que taxa de perda?"**. É o módulo que transforma o módulo 12 do Windows Internals em prática de pesquisa, e o que liga este curso ao de Detecção e Evasão.

---

## 9.1 Medir, e não verificar

⚠ **A distinção que organiza o módulo:**

| "Está ligado?" | ⚠ "Quanto cobre?" |
|---|---|
| `logman query` responde | ⚠ Exige **provocar** e **observar** |
| Valor de configuração | ⚠ **Taxa de captura** do evento real |
| Resposta binária | ⚠ Número, com a condição do teste |

⚠ **A frase que resume:**

> **A pergunta não é se a telemetria está ligada. É: eu provoco o evento — e ele CHEGA?
> Com quais campos? Quantas vezes, em N?**

⚠ **E a razão de isso ser pesquisa, e não configuração:** uma frota com `ETW` ligado pode estar **perdendo eventos** — por buffer, por filter, por provider que não emite no caminho que importa. ⚠ A configuração diz "ligado"; a medição diz "chegou em 7 de 10".

⚠ **É a mesma disciplina do módulo 10 do curso de LLM:** ⚠ **provocar, medir, contar**. E a mesma do módulo 5 deste curso: taxa com N, não impressão.

---

## 9.2 As fontes, e o que cada uma cobre

⚠ **O Windows Internals apresentou as camadas. Aqui, o mapa por evento:**

| Evento que interessa | ⚠ `ETW` | Callback | ⚠ Observação |
|---|---|---|---|
| Criação de processo | ✅ `Kernel-Process` | `PsSetCreateProcess` | Ambos |
| Carregamento de imagem | ✅ `img` | `PsSetLoadImage` | ⚠ Chave contra injeção |
| **Abertura de handle** | ⚠ Parcial | ⚠ `ObRegisterCallbacks` | Só callback é confiável |
| Escrita no registro | ✅ `reg` | `CmRegisterCallbackEx` | Ambos |
| Carga de driver | ✅ `drv` | — | ⚠ **Módulo 7** |
| `IOCTL` de driver | ⚠ **Depende do driver** | — | ⚠ **Buraco comum** |
| Chamada `Nt*` direta | ⚠ Parcial | — | ⚠ Requer provider de kernel |
| Conteúdo de script | ❌ | — | ⚠ **Só `AMSI`** |

⚠ **A sexta linha é o buraco que mais importa para este curso.** ⚠ Um driver que **não emite `ETW`** não gera evento — e o módulo 7 mostrou que `BYOVD` é exatamente isso: um driver de terceiro que ninguém instrumentou.

⚠ **E a lógica do callback é a que resolve:** ⚠ o **callback de imagem** e o de **handle** não dependem de ninguém emitir. ⚠ São a segunda fonte que o módulo 6 do Windows Internals exigiu — e é por isso que produto sério usa os dois.

---

## 9.3 O protocolo de medição

⚠ **O método, e ele é o mesmo do módulo 5 (taxa) aplicado a eventos:**

```
   PARA CADA EVENTO:
   ┌──────────────────────────────────────────────────────────┐
   │  1. ESCOLHA o evento de interesse                         │
   │  2. ⚠ PROVOQUE-O de forma controlada, N vezes              │
   │  3. ⚠ CONTE quantas vezes ele CHEGOU ao consumidor          │
   │  4. ⚠ VERIFIQUE os CAMPOS que chegaram (nao so a presenca)  │
   │  5. ⚠ REPITA com a sessao em CARGA (buffer cheio)           │
   │  6. REGISTRE: taxa, campos, condicao                      │
   └──────────────────────────────────────────────────────────┘
```

⚠ **O passo 4 é o que distingue "o evento chegou" de "o evento serve".** ⚠ Um evento de criação de processo **sem o caminho da imagem** ou **sem a linha de comando** chega — e não permite investigar.

⚠ **O passo 5 é o mais revelador e o mais ignorado.** ⚠ Sessões de `ETW` têm **buffer**, e sob carga o evento **se perde**. ⚠ Uma telemetria que captura 100% em ambiente limpo e **40% sob ataque** não é telemetria: é amostragem.

⚠ **A razão de o passo 5 existir:** ⚠ quem ataca **gera carga**. Um ataque que produz mil eventos por segundo é exatamente o cenário em que a perda acontece — e o atacante que sabe disso **produz ruído**.

---

## 9.4 O que se provoca, e o que se mede

⚠ **Os eventos do escopo deste curso, e como cada um se provoca:**

| Evento | ⚠ Como provocar |
|---|---|
| **Criação de processo** | `Start-Process notepad` |
| **Carregamento de imagem** | ⚠ `LoadLibrary` de DLL própria |
| **Abertura de handle** | `OpenProcess` de um alvo |
| **Escrita no registro** | `New-ItemProperty` |
| ⚠ **Carga de driver** | ⚠ `sc create` + `sc start` do **seu** driver |
| ⚠ **`IOCTL` do seu driver** | ⚠ O cliente do lab |
| **Escrita em disco** | Copiar arquivo |

```powershell
# O experimento, em um script
mkdir C:\lab\m09 -Force; cd C:\lab\m09

# 1. Sessao de kernel com as flags que importam
logman start "NTLab" -p "Windows Kernel Trace" `
  (process,thread,img,file,reg,drv) -o lab.etl -max 64 -ets
logman query "NTLab" -ets

# 2. ⚠ PROVOQUE N=10 vezes, uma de cada
1..10 | ForEach-Object { Start-Process notepad -WindowStyle Hidden; Start-Sleep -Milliseconds 200 }
1..10 | ForEach-Object { New-ItemProperty -Path HKCU:\Software -Name "lab$_" `
                            -Value 1 -PropertyType DWORD -Force | Out-Null }

# 3. Pare e analise
logman stop "NTLab" -ets
tracerpt lab.etl -o lab.xml -of XML -y
"criacao de processo: " + (Select-String -Path lab.xml -Pattern 'Process/Start').Count
"imagem carregada:    " + (Select-String -Path lab.xml -Pattern 'Image/Load').Count
"registro:            " + (Select-String -Path lab.xml -Pattern 'Registry').Count
# ⚠ compare com os 10 que voce provocou
```

⚠ **A comparação é o achado:** ⚠ se você provocou 10 criações de processo e o `.etl` mostra 10, a cobertura é 100% **naquelas condições**. ⚠ Se mostra 7, você acabou de medir a **perda** — e o número vai para o relatório.

⚠ **E os **campos** precisam ser verificados:**

```powershell
# ⚠ O evento chegou — mas trouxe o que?
$ev = Select-String -Path lab.xml -Pattern 'Process/Start' -Context 0,12
$ev | Select-Object -First 1 | ForEach-Object { $_.Context.PostContext }
# ⚠ procure: ProcessID, ImageFileName, CommandLine, ParentPID
# ⚠ a AUSENCIA de CommandLine muda o que a investigacao consegue fazer
```

---

## 9.5 `AMSI`: a camada de conteúdo

⚠ **O que `AMSI` cobre, e o que a medição revela:**

| ✅ `AMSI` inspeciona | ⚠ Não inspeciona |
|---|---|
| Conteúdo de **script** (PowerShell, VBS, JS) | ⚠ **Binário nativo** |
| Assembly **.NET** | ⚠ Conteúdo que chega por outro caminho |
| Macro de `Office` | ⚠ `AMSI` **desligado** no processo |
| ⚠ **O texto, antes de executar** | ⚠ Script **obfuscado em camadas** |

⚠ **A quarta linha é o que testes de campo costumam mostrar:** ⚠ `AMSI` é uma **interface** — se o processo não a carrega, ou se a política a desliga, **não há inspeção nenhuma**. ⚠ E a medição é direta: o processo tem `amsi.dll` carregada?

```powershell
# 1. Quem carrega AMSI
Get-Process | ForEach-Object {
  $p = $_
  try { if ($p.Modules.ModuleName -contains 'amsi.dll') { $p.ProcessName } } catch {}
} | Sort-Object -Unique

# 2. ⚠ E o caminho inverso: quem processa script e NAO tem AMSI?
Get-Process | Where-Object { $_.ProcessName -match 'powershell|wscript|cscript|mshta' } |
  ForEach-Object {
    $p = $_
    try {
      [PSCustomObject]@{ Proc = $p.ProcessName
        AMSI = ($p.Modules.ModuleName -contains 'amsi.dll') }
    } catch {}
  } | Format-Table -AutoSize
# ⚠ um processo de script sem AMSI e' um buraco de cobertura
```

⚠ **A segunda consulta é o formato do achado:** ⚠ não "AMSI está instalado", e sim **"estes processos processam script e não carregam AMSI"**. ⚠ É a diferença entre verificar configuração e medir cobertura.

---

## 9.6 O relatório de cobertura

⚠ **O formato, e ele é o entregável deste módulo:**

```
MEDICAO DE COBERTURA DE TELEMETRIA
──────────────────────────────────────────────────────────
CONDICAO:      sessao, flags, buffer, carga do sistema
                    │
EVENTO          PROVOCADO   CAPTURADO   ⚠ CAMPOS AUSENTES
Process/Start       10          10        ⚠ CommandLine
Image/Load          10           8        ImageBase
Registry            10          10        —
IOCTL (driver)      10           0        ⚠ ⚠ NAO HA PROVIDER
                    │
⚠ SOB CARGA:    repetir com N x 100 -> taxa cai para X%
⚠ BURACO:       o evento que NAO tem fonte (linha do IOCTL)
──────────────────────────────────────────────────────────
```

⚠ **A linha `SOB CARGA` é a que qualifica o número.** ⚠ A taxa medida em ambiente limpo **não vale** para o cenário em que o ataque acontece — e declará-la sem a ressalva é o erro que o curso de Detecção e Evasão combate.

⚠ **E a linha `BURACO` é o achado de maior valor:** ⚠ o evento que **não tem fonte nenhuma**. ⚠ No caso do curso, é o `IOCTL` de driver — e o módulo 7 explicou por que isso importa tanto.

⚠ **A recomendação que segue é a do 8.6:** ⚠ ligar o que falta **tem custo** — buffer, latência, volume de log. ⚠ E o custo precisa estar na recomendação, ou ela é ignorada.

---

## Laboratório 9 — Medir a cobertura

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **Snapshot recomendado. O lab cria sessões `ETW` e as encerra.**

```powershell
mkdir C:\lab\m09 -Force; cd C:\lab\m09
```

```powershell
# cobertura.ps1 — provoca N vezes, e conta o que chega
param([int]$N = 10, [string]$Flags = "process,thread,img,file,reg,drv")

logman stop "NTLab" -ets 2>$null | Out-Null
logman start "NTLab" -p "Windows Kernel Trace" ($Flags.Split(',')) `
  -o lab.etl -max 64 -ets
if ($LASTEXITCODE -ne 0) { "⚠ falha ao iniciar a sessao"; exit 1 }
Start-Sleep -Seconds 2

# ⚠ PROVOQUE — uma de cada vez, com marcador
1..$N | ForEach-Object { Start-Process notepad -WindowStyle Hidden; Start-Sleep -Milliseconds 150 }
1..$N | ForEach-Object { New-ItemProperty -Path HKCU:\Software -Name "lab$_" `
                            -Value 1 -PropertyType DWORD -Force | Out-Null }
Start-Sleep -Seconds 2

logman stop "NTLab" -ets
tracerpt lab.etl -o lab.xml -of XML -y | Out-Null

# ⚠ CONTE — e compare com o provocado
$proc = (Select-String -Path lab.xml -Pattern 'Process/Start').Count
$img  = (Select-String -Path lab.xml -Pattern 'Image/Load').Count
$reg  = (Select-String -Path lab.xml -Pattern 'Registry').Count

[PSCustomObject]@{
  Provocado             = $N
  ProcessStart          = $proc
  ImageLoad             = $img
  Registry              = $reg
  ⚠ TaxaProcesso         = "$([math]::Round(100*$proc/$N,0))%"
  ⚠ TaxaImagem           = "$([math]::Round(100*$img/$N,0))%"
} | Format-List
```

```powershell
# ⚠ 2. SOB CARGA — o passo que qualifica o numero
#    Rode o mesmo, mas provoque 100 por segundo em paralelo
logman start "NTCarga" -p "Windows Kernel Trace" (process,img) -o carga.etl -max 16 -ets
$jobs = 1..20 | ForEach-Object {
  Start-Job { 1..50 | ForEach-Object { Start-Process cmd -ArgumentList '/c exit' `
                -WindowStyle Hidden } }
}
$jobs | Wait-Job | Out-Null; $jobs | Remove-Job
logman stop "NTCarga" -ets
tracerpt carga.etl -o carga.xml -of XML -y | Out-Null
"provocados ~1000; capturados: " + (Select-String -Path carga.xml -Pattern 'Process/Start').Count
# ⚠ a taxa SOB CARGA e' o numero que vale
```

```powershell
# ⚠ 3. OS CAMPOS — o evento serve para investigar?
$ctx = Select-String -Path lab.xml -Pattern 'Process/Start' -Context 0,10
$ctx | Select-Object -First 1 | ForEach-Object { $_.Context.PostContext }
# ⚠ anote QUAIS campos vieram: PID, ImageFileName, CommandLine, ParentPID
```

```powershell
# ⚠ 4. O BURACO — o evento que NAO tem fonte
#    - o IOCTL do seu driver de lab aparece em ETW?  (⚠ teste)
#    - um driver de terceiro gera evento de IOCTL?   (⚠ teste)
#    Escreva a conclusao no relatorio: qual evento do escopo NAO tem provider
```

**O que observar:** no passo 2, a taxa **cai** com a carga. ⚠ É a lição central: telemetria medida em ambiente limpo superestima a cobertura. ⚠ E no passo 4, o evento sem provider é o **buraco** — e é o que o relatório precisa nomear.

**Exercício 1:** rode o `cobertura.ps1` com **duas** configurações de `-max` (16 e 64) e compare as taxas. ⚠ Escreva, em duas linhas, o que o resultado diz sobre **dimensionar buffer**.

**Exercício 2:** compare os campos que vieram no passo 3 com os que a investigação exigiria (módulo 6 do Windows Internals: caminho, linha de comando, `PID` pai). ⚠ Liste os **ausentes** e o que cada um impediria de responder.

**Exercício 3 (o que vale):** preencha o **formato do 9.6** completo, com a linha `SOB CARGA` e a linha `BURACO`. ⚠ Depois escreva a **recomendação** com o custo — e o que ela quebraria. É o critério do módulo 8 aplicado a telemetria.

---

## Resumo

- ⚠ **A pergunta é "quanto cobre?", não "está ligado?"** — e ela exige **provocar e contar**.
- ⚠ **Verificar o campo, não só a presença** — um evento sem `CommandLine` chega e não serve.
- ⚠ **A taxa SOB CARGA é o número que vale** — e quem ataca **produz ruído**.
- ⚠ **`IOCTL` de driver costuma não ter provider** — é o buraco que o módulo 7 explica.
- ⚠ **Callbacks não dependem de emissão** — são a segunda fonte confiável, e cobrem menos.
- ⚠ **`AMSI` é interface, e não inspeção:** processo de script sem `amsi.dll` é buraco de cobertura.
- ⚠ **O achado é "estes processos processam script e não carregam AMSI"** — não "AMSI está instalado".
- ⚠ **A recomendação tem custo** — buffer, latência, volume — e sem ele ela é ignorada.

---

## O que o próximo módulo entrega

Você sabe medir o que a defesa vê. O módulo 10 fecha a parte de pesquisa: **`variant hunting`** — o padrão de um achado aplicado a N produtos, onde um bug se transforma em vários.
