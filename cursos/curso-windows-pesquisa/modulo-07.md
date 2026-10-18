# Módulo 7 — `BYOVD`: O Driver Assinado e Vulnerável, e o Que a Assinatura Não Garante

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 7 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 6
**Próximo:** Módulo 8 — `PPL`, `ACG`, `CFG`

---

## O que este módulo entrega

Ao final, você vai entender **a categoria de driver que mudou o jogo** — e por que ela redefine o que significa "assinado". Você vai saber **reconhecer** um candidato a `BYOVD`, **o que a assinatura realmente garante**, e **como se detecta** o uso. É o módulo que fecha o par com o 8: `PPL` recusa privilégio, e `BYOVD` contorna por outra via.

---

## 7.1 A virada

⚠ **O que a assinatura de driver exigia, e o que ela virou:**

```
   ANTES                          DEPOIS
   ─────                          ──────

   driver assinado =              driver assinado =
     ⚠ "veio de fonte conhecida"    ⚠ "veio de fonte conhecida"

   ASSUMIA-SE:                    ⚠ SABE-SE:
     "e, portanto, e' seguro"        a assinatura NAO diz nada
                                     sobre o CODIGO
```

⚠ **A frase que organiza o módulo:**

> **Assinatura garante PROCEDÊNCIA, não ausência de bug.** E o Windows aceita carregar
> um driver assinado **por qualquer fabricante** — inclusive um que ninguém audita.

⚠ **O que decorre disso:** em vez de escrever um driver malicioso e assinar (**difícil**), o atacante **usa um driver assinado que já é vulnerável** (**fácil**). ⚠ É `BYOVD` — *bring your own vulnerable driver*.

⚠ **E a razão de ele ser tão citado:** ele **contorna `PPL`** (módulo 8). ⚠ Se o processo protegido recusa `PROCESS_VM_READ` até de `SYSTEM`, a solução não é pedir acesso — é **chegar em ring 0** e ler de lá.

---

## 7.2 O que a assinatura garante

⚠ **A tabela, e ela é o resumo do módulo:**

| A assinatura garante | ⚠ Não garante |
|---|---|
| Veio de um emissor identificado | ⚠ Que o **código** seja seguro |
| Não foi modificado desde a assinatura | ⚠ Que o **contrato** de `IOCTL` seja válido |
| É rastreável a um fabricante | ⚠ Que o fabricante **ainda exista** |
| Passou por validação de formato | ⚠ Que o `METHOD_NEITHER` tenha `Probe` |
| — | ⚠ Que a ACL do device seja restritiva |
| — | ⚠ Que o driver seja **recente** |

⚠ **A terceira linha é a que ninguém considera, e a mais relevante:** driver de **fabricante extinto** é driver que **ninguém vai corrigir**. ⚠ Ele continua assinado, continua carregando, e o bug continua lá — para sempre.

⚠ **E a segunda linha é o mecanismo:** a assinatura valida o **arquivo**, e o módulo 2 mostrou que o problema está no **contrato**. ⚠ Um arquivo perfeitamente assinado pode declarar `METHOD_NEITHER` sem nunca chamar `ProbeForRead`.

---

## 7.3 Como um candidato se reconhece

⚠ **O perfil do alvo, e ele é a triagem do módulo 1 com pesos diferentes:**

| Característica | ⚠ Por que indica candidato |
|---|---|
| **Fabricante extinto ou pequeno** | ⚠ Não corrige |
| ⚠ **Assinatura antiga** | ⚠ Anterior à cultura de segurança de driver |
| **Ainda instalável em build atual** | ⚠ O Windows **preserva compatibilidade** |
| ⚠ **Expõe device a usuário comum** | ⚠ O pré-requisito de escalação |
| **Tem `METHOD_NEITHER`** | ⚠ Módulo 2 |
| ⚠ **Faz operação de física / MSR / port I/O** | ⚠ ⚠ **Ring 0 a partir de `IOCTL`** |
| **Já tem CVE** | ⚠ Módulo 10 — `variant hunting` |

⚠ **A sexta linha é a que faz o `BYOVD` valer tanto:** drivers de **diagnóstico de hardware**, de **monitoramento** e de **overclock** oferecem ao userspace operações que **só fazem sentido em ring 0** — ler MSR, escrever em `CR`/`MSR`, mapear físico, port I/O. ⚠ Um driver desses, com ACL frouxa, é **ring 0 como serviço**.

⚠ **E a última linha liga este módulo ao 10:** um driver com CVE conhecido é ponto de partida para achar **outros** — no mesmo fabricante, no mesmo produto, na versão seguinte.

⚠ **A política do curso, escrita com clareza:** aqui se aprende a **reconhecer**, **entender por que a assinatura não protege** e **detectar o uso**. ⚠ **Não** se escreve a cadeia de exploração de um `BYOVD` específico contra alvo real — o lab usa **o seu próprio driver**, e o exercício de `BYOVD` é de **análise e detecção**.

---

## 7.4 Por que ele contorna o que contorna

⚠ **A tabela do "contorna o quê", e ela explica o resto do curso:**

| Defesa | ⚠ `BYOVD` contorna? |
|---|---|
| **`PPL`** | ✅ ✅ **Sim** — é a razão de ele existir |
| **`SeDebugPrivilege` ausente** | ✅ Sim — não precisa |
| **`ACG` / `CFG`** | ⚠ Parcialmente — depende do driver |
| **`HVCI`** | ⚠ Difícil — bloqueia driver sem assinatura **compatível** |
| **Blocklist de driver vulnerável** | ⚠ Depende de estar na lista |
| ⚠ **`Driver Verifier`** | ❌ Não contorna — é instrumento, não defesa |

⚠ **A quinta linha é a defesa que o Windows adicionou**, e é o motivo de `BYOVD` ainda funcionar: ⚠ a lista de drivers vulneráveis é **reativa**. Ela cobre o que já se conhece — e o driver da terça-feira não está nela.

⚠ **A quarta é a defesa estrutural:** `HVCI` (*Hypervisor-Protected Code Integrity*) exige que o código executado em ring 0 seja **compatível com a política** — e restringe justamente as operações que fazem `BYOVD` valer. ⚠ É por isso que elevação em sistema com `HVCI` ligado é outra história.

⚠ **A última linha merece a distinção:** o `Driver Verifier` **não é defesa** — ele é **instrumento de pesquisa e de desenvolvimento**. ⚠ Ele faz o bug aparecer, não impede que aconteça. Confundir os dois é o erro do módulo 8 do curso de Web Apps: *o detector não é a correção*.

---

## 7.5 Detectar o uso

⚠ **A parte deste módulo que se aplica ao trabalho defensivo — e é a mais útil das três:**

```
   O QUE O BYOVD DEIXA DE RASTRO:

   1. ⚠ Carregamento de driver de caminho incomum
        (nao System32\drivers)
   2. ⚠ Servico criado recentemente, com Start=0 ou 1
   3. ⚠ Device aberto por processo que nao deveria
   4. ⚠ IOCTL de driver de hardware chamado por processo de usuario
   5. ⚠ Sequencia: carrega driver -> abre device -> le memoria
   6. ⚠ Driver assinado por emissor que nao aparece mais
```

⚠ **A quinta é a que transforma detecção em correlação:** nenhum dos passos isolado é forte. ⚠ A **sequência** é. É o mesmo raciocínio do módulo 6 do curso de Web Apps — duas fontes que deveriam concordar.

```powershell
# 1. Drivers carregados de fora do System32\drivers
Get-CimInstance Win32_SystemDriver |
  Where-Object { $_.State -eq 'Running' -and
                 $_.PathName -notmatch '\\System32\\drivers\\' } |
  Select-Object Name, PathName, StartMode

# 2. Servicos de kernel criados recentemente
Get-CimInstance Win32_SystemDriver | ForEach-Object {
  $k = "HKLM:\SYSTEM\CurrentControlSet\Services\$($_.Name)"
  [PSCustomObject]@{ Nome = $_.Name
                     Caminho = $_.PathName
                     Inicio = $_.StartMode }
} | Sort-Object Nome

# 3. ⚠ A ASSINATURA, com o emissor
Get-CimInstance Win32_SystemDriver | Where-Object { $_.State -eq 'Running' } |
  ForEach-Object {
    $s = Get-AuthenticodeSignature $_.PathName -ErrorAction SilentlyContinue
    [PSCustomObject]@{ Nome = $_.Name
                       Emissor = $s.SignerCertificate.Subject
                       Valido  = $s.Status }
  } | Where-Object { $_.Valido -ne 'Valid' } | Format-Table -AutoSize
```

```powershell
# 4. ⚠ A CORRELACAO — a parte que vale
#    Para cada driver de terceiro em execucao, olhe a data de assinatura
#    e o fabricante. Combine com: o device esta aberto agora?
Get-Process | ForEach-Object {
  $p = $_
  try { $p.Modules | Where-Object { $_.FileName -match 'drivers\\' } |
        Select-Object @{n='Proc';e={$p.ProcessName}}, FileName }
  catch {}
} | Sort-Object FileName -Unique
```

⚠ **A detecção boa aqui é a do curso de Detecção e Evasão:** o sinal isolado é fraco, e a **correlação** é o achado. ⚠ Um driver de RGB assinado em 2014, carregado, com device aberto por um processo que não é o software do fabricante — isso é sinal.

---

## 7.6 A política do curso, e por que ela é necessária

⚠ **Este é o módulo mais sensível do curso, e a delimitação é explícita:**

| Este curso | ⚠ O que não está aqui |
|---|---|
| **Reconhecer** um candidato a `BYOVD` | ⚠ Baixar e usar um `BYOVD` conhecido |
| Explicar **por que a assinatura não protege** | Escrever a cadeia até `SYSTEM` com ele |
| **Detectar** o uso | Esquivar de blocklist ou de `HVCI` |
| Endurecer: blocklist, `HVCI`, ACL | — |

⚠ **A razão é a mesma dos outros cursos:** o que se entrega é a **compreensão** e a **detecção**. ⚠ A cadeia de exploração de um `BYOVD` específico é trabalho de quem tem **alvo autorizado** — e o resultado dela é dano em ring 0, não relatório.

⚠ **E há o argumento de utilidade:** ⚠ quem defende uma frota precisa saber **o que procurar**. Este módulo entrega exatamente isso, e é o uso mais frequente do conhecimento — muito mais frequente que o ofensivo.

⚠ **O lab, portanto, é de análise e detecção:** você examina um driver do **seu** sistema, traça o perfil do 7.3, mede o que ele expõe, e escreve o **procedimento de detecção** do 7.5.

---

## Laboratório 7 — Reconhecer e detectar

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **Análise apenas. Nenhum driver de `BYOVD` é instalado neste lab.**

```powershell
mkdir C:\lab\m07 -Force; cd C:\lab\m07

# ── 1. Perfil dos drivers de TERCEIRO desta VM ──────────────
$linhas = Get-CimInstance Win32_SystemDriver |
  Where-Object { $_.State -eq 'Running' } | ForEach-Object {
    $vi = (Get-Item $_.PathName -ErrorAction SilentlyContinue).VersionInfo
    $as = Get-AuthenticodeSignature $_.PathName -ErrorAction SilentlyContinue
    [PSCustomObject]@{
      Nome       = $_.Name
      Caminho    = $_.PathName
      Fabricante = $vi.CompanyName
      Versao     = $vi.FileVersion
      Assinado   = $as.SignerCertificate.NotAfter
      Emissor    = $as.SignerCertificate.Subject
      ForaDeDrivers = ($_.PathName -notmatch '\\System32\\drivers\\')
    }
  }
$linhas | Where-Object { $_.Fabricante -and $_.Fabricante -notmatch 'Microsoft' } |
  Export-Csv terceiros.csv -NoTypeInformation -Encoding utf8
Import-Csv terceiros.csv | Format-Table Nome, Fabricante, Assinado, ForaDeDrivers -AutoSize
```

```powershell
# ── 2. ⚠ PERFIL DE CANDIDATO — aplique o 7.3 ────────────────
Import-Csv terceiros.csv | ForEach-Object {
  $d = $_.Caminho
  $metodos = @{Neither=0; Buffered=0; Total=0}
  if (Test-Path $d) {
    # ⚠ heuristica: procure constantes de IOCTL no binario
    $bytes = [System.IO.File]::ReadAllBytes($d)
    # ... (⚠ a classificacao precisa DE DESMONTAGEM — modulo 2)
  }
  [PSCustomObject]@{
    Nome = $_.Nome
    Ano  = if ($_.Assinado) { ([datetime]$_.Assinado).Year } else { 0 }
    ⚠ Idade = if ($_.Assinado) { (New-TimeSpan ([datetime]$_.Assinado) (Get-Date)).Days } else { -1 }
    Fora = $_.ForaDeDrivers
  }
} | Sort-Object Idade -Descending | Format-Table -AutoSize
```

```powershell
# ── 3. ⚠ O QUE O DEVICE EXPOE — a pergunta de alcance ───────
#    Sobre o driver que você escolher do perfil acima:
#    - a ACL do \Device permite usuario comum?   (WinObj)
#    - ha METHOD_NEITHER?                        (modulo 2)
#    - quais operacoes sensiveis ele importa?
dumpbin /imports C:\Windows\System32\drivers\<ALVO>.sys |
  Select-String 'MmMapIoSpace|MmMapMemoryDumpMdl|ZwOpenSection|' +
                 'KeBugCheck|__readmsr|__writemsr|READ_PORT|WRITE_PORT'
#    ⚠ cada import desses e' uma operacao de ring 0 exposta
```

```powershell
# ── 4. ⚠ PROCEDIMENTO DE DETECCAO — o entregavel
#    Escreva as consultas do 7.5 em um script, e rode:
```

```powershell
# detectar.ps1 — o procedimento de deteccao do modulo
$suspeitos = @()

# (a) driver de fora do diretorio padrao
$suspeitos += Get-CimInstance Win32_SystemDriver | Where-Object {
    $_.State -eq 'Running' -and $_.PathName -notmatch '\\System32\\drivers\\' } |
  ForEach-Object { [PSCustomObject]@{ Sinal='fora_do_padrao'; Nome=$_.Name; Det=$_.PathName } }

# (b) assinatura ausente ou invalida
$suspeitos += Get-CimInstance Win32_SystemDriver |
  Where-Object { $_.State -eq 'Running' } | ForEach-Object {
    $s = Get-AuthenticodeSignature $_.PathName -ErrorAction SilentlyContinue
    if ($s.Status -ne 'Valid') {
      [PSCustomObject]@{ Sinal='assinatura'; Nome=$_.Name; Det=$s.Status }
    }
  }

# (c) ⚠ assinatura antiga E device aberto por processo nao esperado
$suspeitos += Import-Csv terceiros.csv | Where-Object {
    $_.Assinado -and (New-TimeSpan ([datetime]$_.Assinado) (Get-Date)).Days -gt 2555
  } | ForEach-Object {
    [PSCustomObject]@{ Sinal='assinatura_antiga'; Nome=$_.Nome; Det=$_.Assinado }
  }

$suspeitos | Format-Table -AutoSize
$suspeitos | Export-Csv deteccao.csv -NoTypeInformation -Encoding utf8
"⚠ $($suspeitos.Count) sinais encontrados — ⚠ CORRELACIONE, nao conclua"
```

**O que observar:** o passo 4 produz **sinais**, não conclusões. ⚠ Cada linha isolada pode ser legítima — um driver de hardware assinado em 2016 é comum. ⚠ O achado está na **correlação**: assinatura antiga **e** device aberto **e** operação sensível exposta.

**Exercício 1:** trace o **perfil do 7.3** para os três drivers mais antigos da VM, com o veredito de cada característica. ⚠ Marque explicitamente quais são candidatos e **por quê**.

**Exercício 2:** para o driver que mais se aproxima do perfil, liste os **imports de operação sensível** (passo 3) e escreva, para cada um, **o que ele permitiria** se o device fosse alcançável por usuário comum.

**Exercício 3 (o que vale):** refine o **`detectar.ps1`** para correlacionar **três** sinais em vez de listar: assinatura antiga **+** device aberto por processo que não é o fabricante **+** exposição de operação sensível. ⚠ Escreva por que a correlação reduz falso positivo, e o que **ainda** poderia ser legítimo. É o raciocínio que liga este módulo ao curso de Detecção e Evasão.

---

## Resumo

- ⚠ **Assinatura garante PROCEDÊNCIA, não ausência de bug** — e o Windows carrega driver assinado de qualquer fabricante.
- ⚠ **É mais fácil usar um driver vulnerável que já existe do que escrever e assinar um malicioso.**
- ⚠ **`BYOVD` contorna `PPL`** — se o processo recusa acesso até de `SYSTEM`, a resposta é chegar em **ring 0**.
- ⚠ **Fabricante extinto é o pior caso:** continua assinado, continua carregando, e **ninguém vai corrigir**.
- ⚠ **Drivers de diagnóstico e overclock expõem operação de ring 0** — MSR, físico, port I/O — e são o perfil clássico.
- ✅ **`HVCI` é a defesa estrutural**; a **blocklist** é reativa e cobre só o que já se conhece.
- ⚠ **`Driver Verifier` não é defesa** — é instrumento.
- ⚠ **A detecção é por CORRELAÇÃO**: assinatura antiga + device aberto + operação sensível. Sinal isolado é fraco.

---

## O que o próximo módulo entrega

Você entende o caminho que contorna privilégio. O módulo 8 volta às mitigações e mostra **o que cada uma realmente limita** — `PPL`, `ACG` e `CFG` do lado de quem ataca, e por que o desenho de defesa do Windows é feito de camadas que se cobrem mal.
