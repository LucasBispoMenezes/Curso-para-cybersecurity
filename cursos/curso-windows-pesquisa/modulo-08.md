# Módulo 8 — `PPL`, `ACG`, `CFG`: O Que Cada Mitigação Realmente Limita

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 8 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 7
**Próximo:** Módulo 9 — `ETW` e `AMSI` sob teste

---

## O que este módulo entrega

Ao final, você vai saber **avaliar uma frota pelo que cada mitigação deixa passar** — e não pelo que ela promete. Você vai entender as três mitigações do lado de quem ataca, e a razão de elas serem **camadas que se cobrem mal**. É o módulo que fecha o par com o 7: `PPL` recusa privilégio, e o resto é o mapa dos desvios.

---

## 8.1 A pergunta que este módulo responde

⚠ **Não é "a mitigação funciona?". É:**

```
   ┌──────────────────────────────────────────────────────────┐
   │  PARA CADA MITIGACAO:                                     │
   │   1. o que ela IMPEDE, concretamente?                     │
   │   2. ⚠ o que ela NAO impede, e por que?                    │
   │   3. ⚠ QUAL CAMINHO ela deixa aberto?                      │
   │   4. ⚠ ela se propaga para processo novo?                  │
   └──────────────────────────────────────────────────────────┘
```

⚠ **A quarta é a que quase ninguém pergunta, e a que decide o desenho real.** ⚠ Mitigação é **por processo**, e uma frota com 80% dos processos cobertos tem **20% de caminho** — que é o que basta.

⚠ **E a lição vem do módulo 10 do Windows Internals:** ⚠ *mitigação não torna impossível — define o **preço** de cada caminho.* Aqui, o trabalho é **medir esse preço** e dizer **qual caminho sobrou**.

---

## 8.2 `PPL`: o que ela realmente faz

⚠ **A proteção que ignora privilégio — e o mecanismo, em detalhe:**

```
   Acesso a um processo protegido:

   chamador com SeDebugPrivilege
        │
        ▼
   ⚠ ObpValidateProtectedProcessAccess
        │
        ├─ o alvo e' PPL?                      -> sim
        ├─ o chamador tem nivel de ASSINATURA
        │  >= o do alvo?                         -> nao
        └─ ⚠ RECUSA — mesmo com SeDebug
```

✅ **O que ela impede:**

| Direito | ⚠ Bloqueado? |
|---|---|
| `PROCESS_VM_READ` | ✅ Sim |
| `PROCESS_VM_WRITE` | ✅ Sim |
| `PROCESS_CREATE_THREAD` | ✅ Sim |
| `PROCESS_SUSPEND_RESUME` | ✅ Sim |
| ⚠ `PROCESS_TERMINATE` | ✅ Sim |
| `PROCESS_QUERY_INFORMATION` | ⚠ Parcial |
| ⚠ `SYNCHRONIZE` | ❌ **Não** |
| **Handle já existente** | ❌ **Não** |

⚠ **As duas últimas são o limite que o relatório precisa declarar:**

⚠ **`SYNCHRONIZE` não é bloqueado.** ⚠ Você não lê a memória, mas **observa o estado** — e tempo de vida de processo é informação.

⚠ **E o handle aberto ANTES da proteção — ou herdado — continua válido.** ⚠ É o módulo 4 do Windows Internals: o direito **congela no handle**. ⚠ `PPL` não reavalia o que já foi concedido.

⚠ **A terceira linha da tabela é a que explica o `BYOVD` do módulo 7:** se falta acesso **por privilégio**, a resposta não é pedir mais privilégio — é **chegar em ring 0**, onde a verificação não existe.

---

## 8.3 `ACG` e `CFG`: o que cada uma cobre

⚠ **As duas mitigações de memória, e o que preservam:**

| Mitigação | ✅ Impede | ⚠ Permite |
|---|---|---|
| **`ACG`** | Página executável nova, imagem modificada | ⚠ **`VirtualProtect` legítimo**, JIT com política |
| **`CFG`** | Chamada indireta para destino não listado | ⚠ Alvo válido escolhido pelo atacante |
| **`kCFG`** (kernel) | Idem, em ring 0 | ⚠ ⚠ **Chamada direta** |

⚠ **A segunda linha de cada uma é o que importa na prática:**

⚠ **`ACG` em userspace não protege ring 0.** ⚠ E ela **não se propaga**: o processo vizinho sem `ACG` continua injetável — e é o vizinho que se ataca.

⚠ **`CFG` valida que o destino é função; não valida que a chamada era pretendida.** ⚠ Um salto **direto** para uma função legítima tem alvo válido por definição.

⚠ **E `kCFG` merece nota própria, porque é a mitigação que o módulo 3 toca:** depois de corromper pool, a escrita em ponteiro de função exige que o alvo esteja na **lista de alvos válidos do kernel**. ⚠ Isso **não** impede a exploração — **encarece**: é preciso escolher um alvo entre as funções existentes, em vez de escrever código novo.

⚠ **As duas últimas linhas fecham a análise do curso:** ⚠ nenhuma das três mitigações **remove** um caminho. Elas **reduzem o conjunto de primitivas** que a corrupção do módulo 3 pode virar. ⚠ E é por isso que o módulo 6 (confusão de tipo por `TypeInfo`) é tão valioso: ele **não escreve código novo** — ele faz o kernel usar o que já existe.

---

## 8.4 A tabela de avaliação da frota

⚠ **O instrumento que este módulo entrega, e ele é de auditoria:**

```
┌──────────────────────────────────────────────────────────────┐
│ FROTA: <nome>                                                 │
├──────────────────────────────────────────────────────────────┤
│ Processo          PPL  ACG  CFG  Blocklist  HVCI  ⚠ CAMINHO   │
│ ────────────────  ───  ───  ───  ─────────  ────  ─────────  │
│ lsass.exe         ✅   ✅   ✅   —          ✅    ⚠ nenhum?   │
│ MsMpEng.exe       ✅   ?    ✅   —          ✅    —          │
│ servico proprio   ❌   ❌   ⚠    —          ⚠     ⚠ ⚠ AQUI    │
│ navegador         ❌   ⚠    ✅   —          ✅    jovem        │
│ ────────────────  ───  ───  ───  ─────────  ────  ─────────  │
│ ⚠ caminho: o processo MENOS coberto e' a porta               │
└──────────────────────────────────────────────────────────────┘
```

⚠ **A leitura da tabela, e ela é o método:**

⚠ **1. O alvo nunca é o processo mais protegido.** ⚠ `lsass` é o **objetivo**; o **caminho** é o processo ao lado.

⚠ **2. A coluna `Blocklist` é a mais fraca de todas** — ela é **reativa** (módulo 7). ⚠ Se a resposta a `BYOVD` é a blocklist, o driver de terça-feira não está nela.

⚠ **3. `HVCI` é a única que muda o jogo**, porque ela restringe **o que pode rodar em ring 0** — e é lá que as mitigações de userspace deixam de valer.

⚠ **A medição, no sistema, é direta:**

```powershell
# O estado por processo — comando unico, leitura completa
Get-Process | ForEach-Object {
  $m = Get-ProcessMitigation -Name $_.ProcessName -ErrorAction SilentlyContinue
  if ($m) {
    [PSCustomObject]@{
      Proc  = $_.ProcessName
      CFG   = $m.Cfg.Enable
      ACG   = $m.ACG.Enable
      ASLR  = $m.ASLR.ForceRelocateImages
      EAF   = $m.EAF.Enable          # Export Address Filtering
      ⚠ BloqueiaNaoMS = $m.BlockNonMicrosoftBinaries.Enable
    }
  }
} | Sort-Object Proc -Unique | Format-Table -AutoSize
```

```powershell
# ⚠ A protecao de PROCESSO — os bits no EPROCESS
#    kd> dt nt!_PS_PROTECTION -a
#    kd> !process <ENDERECO> 7 | Select-String "Protection"
#    ⚠ Signer: None | Authenticode | Antimalware | Lsa | WinTcb | WinSystem
#    ⚠ Type: None | Light (PPL) | Full (PP)
```

⚠ **A distinção `Light` versus `Full`** é a que quase ninguém faz: ⚠ `PP` (full) exige **mais** — inclusive driver assinado por canal específico. ⚠ Só o `lsass` em modo `LSA` está em `PP`; a maioria dos `PPL` é `Light`.

---

## 8.5 O que sobra depois de tudo

⚠ **A análise que fecha o módulo, e ela é o produto:**

```
   ⚠ COM TODAS AS MITIGACOES APLICADAS, O QUE AINDA EXISTE:

   1. ACESSO JA CONCEDIDO       -> ⚠ handle herdado, ou aberto antes
   2. PROCESSO NAO COBERTO      -> ⚠ a coluna "caminho" da tabela
   3. ⚠ RING 0                  -> ⚠ BYOVD, bug proprio, driver do lab
   4. ⚠ CANAIS LATERAIS         -> ETW, AMSI, driver de terceiro
   5. ⚠ ESTADO PERSISTENTE      -> servico, tarefa, registro
   6. ⚠ CONFUSAO DE TIPO        -> o kernel usa o que JA existe
```

⚠ **A primeira linha é a mais prática e a mais esquecida:** ⚠ nenhuma mitigação **revoga** acesso concedido. Se um processo herdou um handle privilegiado, ou o abriu **antes** de a proteção ser aplicada, o acesso está lá.

⚠ **E a sexta fecha o arco do curso:** ⚠ a confusão de tipo do módulo 6 **não escreve código novo** e **não pede acesso novo** — ela faz o kernel **interpretar** de outro jeito. ⚠ É a classe que menos depende de mitigação, e é por isso que ela vale tanto.

⚠ **A conclusão honesta, e ela repete o curso de Web Apps:** ⚠ mitigação **encarece**, não **impede**. ⚠ O relatório de uma frota diz **qual caminho sobrou**, com o custo de cada um — e não "o sistema está protegido".

---

## 8.6 O que o relatório exige

⚠ **O formato, e ele tem uma seção que este módulo introduz:**

```
AVALIACAO DE MITIGACAO — <frota>
──────────────────────────────────────────────────────────
POR PROCESSO:   tabela do 8.4, completa
                    │
⚠ CAMINHO:       o processo menos coberto, e POR QUE
⚠ O QUE SOBRA:    o que ainda existe depois de tudo (8.5)
                    │
CUSTO DE CADA CAMINHO:
   - o que se ganha ao cobri-lo
   - ⚠ o que ele CUSTA (latencia, compatibilidade, operacao)
──────────────────────────────────────────────────────────
```

⚠ **A última seção é a que separa auditoria de recomendação ingênua.** ⚠ Ligar `ACG` em processo que gera código em runtime **quebra o produto**. ⚠ Ligar `BlockNonMicrosoftBinaries` em ambiente com software legítimo de terceiro **quebra a operação**.

⚠ **É a aritmética do módulo 10 do curso de LLM e do curso de Detecção e Evasão:** ⚠ toda defesa tem **dois erros**, e o que a desliga é sempre o **custo operacional**. ⚠ Recomendar sem medir o custo é o que faz a recomendação ser ignorada.

---

## Laboratório 8 — Avaliar a frota

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **Análise. Nada é alterado no sistema além das consultas.**

```powershell
mkdir C:\lab\m08 -Force; cd C:\lab\m08

# ── 1. A TABELA POR PROCESSO ────────────────────────────────
Get-Process | ForEach-Object {
  $m = Get-ProcessMitigation -Name $_.ProcessName -ErrorAction SilentlyContinue
  if ($m) {
    [PSCustomObject]@{
      Processo = $_.ProcessName
      Id       = $_.Id
      CFG      = if ($m.Cfg) { $m.Cfg.Enable } else { '?' }
      ACG      = if ($m.ACG) { $m.ACG.Enable } else { '?' }
      ASLR     = if ($m.ASLR) { $m.ASLR.ForceRelocateImages } else { '?' }
      NaoMS   = if ($m.BlockNonMicrosoftBinaries) { $m.BlockNonMicrosoftBinaries.Enable } else { '?' }
    }
  }
} | Sort-Object Processo -Unique |
  Export-Csv mitigacao.csv -NoTypeInformation -Encoding utf8
Import-Csv mitigacao.csv | Format-Table -AutoSize | Out-File mitigacao.txt
Get-Content mitigacao.txt | Select-Object -First 30
```

```powershell
# ── 2. ⚠ PROCESSOS PROTEGIDOS — os bits do EPROCESS ─────────
#    (precisa de acesso; rode como admin e trate o que faltar)
Get-CimInstance Win32_Process | Where-Object {
  $_.Name -in @('lsass.exe','MsMpEng.exe','services.exe','csrss.exe',
                'wininit.exe','smss.exe','SecurityHealthService.exe')
} | Select-Object Name, ProcessId, ExecutablePath | Format-Table -AutoSize

# ⚠ E no WinDbg, sobre a VM com kernel debug:
```

```
kd> !process 0 0 lsass.exe
kd> dt nt!_PS_PROTECTION -a
kd> !process <ENDERECO> 7
#    ⚠ leia Protection: Signer Lsa / Type Light ou Full
kd> dt nt!_EPROCESS <ENDERECO> Protection
```

```powershell
# ── 3. ⚠ HVCI e integridade de codigo ──────────────────────
Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard |
  Select-Object -Property *
#    ⚠ SecurityServicesRunning: 1=Credential Guard, 2=HVCI
#    ⚠ CodeIntegrityPolicyEnforcementStatus
bcdedit /enum {current} | Select-String 'hypervisor|vsm|integrity'
```

```powershell
# ── 4. ⚠ O "CAMINHO" — o processo menos coberto ─────────────
#    Cruze a tabela do passo 1 com a lista de processos que
#    EXPÕEM interface a usuario comum ou carregam driver de terceiro
Import-Csv mitigacao.csv | Where-Object { $_.CFG -eq 'OFF' -or $_.ACG -eq 'OFF' } |
  Format-Table Processo, CFG, ACG, NaoMS -AutoSize
```

```powershell
# ── 5. ⚠ O QUE SOBRA — os acessos ja concedidos ─────────────
#    Handles herdados ou abertos antes da protecao continuam validos.
#    (⚠ handle.exe do Sysinternals; rode como admin)
# handle.exe -p lsass | Select-Object -First 25
# ⚠ observe QUEM tem handle para lsass, e com que acesso
```

**O que observar:** no passo 4, a lista de processos sem `CFG`/`ACG` **é** o caminho. ⚠ Não é uma falha de segurança — é a realidade de uma frota, e o trabalho de quem audita é **nomeá-la**. ⚠ E no passo 5, a prova de que acesso concedido não se revoga.

**Exercício 1:** monte a **tabela do 8.4** para esta VM, com a coluna `CAMINHO` preenchida. ⚠ A linha de conclusão é obrigatória: qual é o processo menos coberto, e por quê.

**Exercício 2:** liste o **conteúdo do 8.5** para esta VM, com pelo menos **quatro** itens. ⚠ Para cada um, escreva **o que ele permitiria** e **a que custo se fecharia**.

**Exercício 3 (o que vale):** escolha **uma** mitigação desligada em algum processo e escreva a **recomendação completa** no formato do 8.6 — incluindo a seção de **custo**. ⚠ Note o que ela quebraria. É a diferença entre auditoria e lista de desejos.

---

## Resumo

- ⚠ **A pergunta não é "funciona?" — é "o que ela NÃO impede, e que caminho sobra".**
- ⚠ **`PPL` recusa até `SYSTEM`** em `VM_READ`, `VM_WRITE`, `CREATE_THREAD` e `TERMINATE` — ⚠ mas **não revoga handle concedido**.
- ⚠ **`SYNCHRONIZE` não é bloqueado** em processo protegido — sobra o tempo de vida.
- ⚠ **`ACG` não protege ring 0 e não se propaga** — o processo vizinho é a porta.
- ⚠ **`CFG` valida o destino, não a intenção**; `kCFG` **encarece** o módulo 3 sem remover o caminho.
- ⚠ **Mitigação é POR PROCESSO** — a frota com 80% de cobertura tem 20% de caminho, e é isso que basta.
- ⚠ **A blocklist é reativa**; **`HVCI` é a única que muda o jogo**, porque restringe ring 0.
- ⚠ **Seis coisas sobram depois de tudo** — e a confusão de tipo é a que menos depende de mitigação.
- ⚠ **Recomendar sem medir o custo operacional** é o que faz a recomendação ser ignorada.

---

## O que o próximo módulo entrega

Você sabe avaliar a defesa. O módulo 9 vira para o outro lado da mesma moeda: **`ETW` e `AMSI` sob teste** — o que a telemetria entrega, o que ela perde, e como se mede isso.
