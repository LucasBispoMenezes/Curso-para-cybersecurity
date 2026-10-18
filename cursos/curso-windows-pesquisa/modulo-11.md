# Módulo 11 — Método e Reporte: Do Alvo ao Achado Reproduzível, e a Divulgação

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 11 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 10
**Próximo:** Módulo 12 — Projeto final

---

## O que este módulo entrega

É o fecho do método. Ao final, você vai saber **conduzir uma investigação inteira** — escolher alvo, manter registro, reproduzir com taxa, escrever o reporte e divulgar. Não há técnica nova: há a **disciplina** que transforma os dez módulos em trabalho que se pode entregar.

---

## 11.1 O ciclo, em oito passos

```
   1. ALVO        ->  triagem (modulo 1)
        │              ⚠ e a DECISAO de gastar tempo nele
        ▼
   2. CONTRATO    ->  os IOCTLs, os metodos, o alcance (modulo 2)
        │
        ▼
   3. HIPOTESE    ->  ⚠ falsificavel, escrita ANTES de testar
        │
        ▼
   4. LAB         ->  ⚠ versao, build, config do Verifier
        │
        ▼
   5. TRIGGER     ->  o minimo que dispara
        │
        ▼
   6. TAXA        ->  ⚠ N repeticoes, e o numero que vale
        │
        ▼
   7. PRIMITIVA   ->  ⚠ o que o bug PERMITE, nao o que ele causa
        │
        ▼
   8. REPORTE     ->  escrito para quem vai corrigir
```

⚠ **O passo 3 é o que separa operador de pesquisador — e é o mesmo do curso de Pesquisa em Segurança.** ⚠ `"vou testar o driver"` não é hipótese. ⚠ `"este IOCTL usa METHOD_NEITHER e o handler não tem ProbeForRead no caminho"` é.

⚠ **E o passo 7 é o que este curso exige de forma específica:** ⚠ **primitiva, não consequência.** "Executou código" é consequência; "escrita em endereço escolhido, demonstrada com o valor X no endereço Y" é **primitiva** — e é o que se reporta.

---

## 11.2 A ficha de hipótese

⚠ **O instrumento, e ele se repete em todos os módulos deste curso:**

```
FICHA DE HIPOTESE
──────────────────────────────────────────────────────────
Alvo:            meudrv.sys vX.Y.Z
Superficie:      IOCTL 0x80002004 — METHOD_NEITHER
Contrato:        ⚠ o que DEVERIA existir (Probe, checagem, copia)
Observacao:      ⚠ o que FOI lido no codigo/desmontagem
Hipotese:        a ausencia observada permite <primitiva>
Falsificacao:    ⚠ o que me faria abandonar — e em quanto tempo
Teste minimo:    ⚠ a requisicao mais simples que prova
──────────────────────────────────────────────────────────
```

⚠ **O campo `Falsificacao` é obrigatório.** ⚠ Uma hipótese que não pode morrer é crença — e crença produz falso positivo, que é o que queima credibilidade em pesquisa de kernel.

⚠ **E o campo `Contrato` conecta este módulo ao 2:** ⚠ você não está procurando "coisa suspeita" — está comparando **o que deveria existir** com **o que existe**. ⚠ É o **omisso** que você procura, e ele só é visível contra o esperado.

---

## 11.3 O laboratório da investigação

⚠ **O que precisa estar registrado em **todo** resultado, e cada item tem um motivo:**

| Item | ⚠ Por quê |
|---|---|
| **Build do Windows** | ⚠ O comportamento muda entre builds |
| **Versão do driver** | ⚠ A variante é a versão ao lado |
| **Sinal do `Hash`** | ⚠ Prova que o binário analisado é o mesmo |
| **Config do `Verifier`** | ⚠ Sem special pool, o resultado é outro |
| ⚠ **Se é `WDF` ou `WDM`** | ⚠ Muda o que "validação" significa |
| **Estado do sistema** | Snapshot limpo? Carga? Outros drivers? |
| ⚠ **O trigger, em bytes** | ⚠ O que o outro lado vai rodar |

⚠ **A quinta linha é a que mais engana.** ⚠ Um driver `WDF` faz validação por framework — e a "ausência de `Probe`" que a heurística marcou **não é omissão**. ⚠ É a armadilha do módulo 10, e ela reaparece no reporte.

⚠ **E o `Hash` do binário não é burocracia:** ⚠ fabricante publica versões com o mesmo número. ⚠ Sem o hash, "analisei a v1.2" não identifica o que você analisou.

---

## 11.4 A taxa

⚠ **A disciplina do módulo 5 aplicada a todo achado:**

```powershell
# taxa.ps1 — N execucoes, e o numero que vale
param([int]$N = 100, [string]$Trigger = ".\trigger.exe")

$hits = 0; $classes = @()
1..$N | ForEach-Object {
    $p = Start-Process $Trigger -PassThru -WindowStyle Hidden
    $p | Wait-Process -Timeout 5 -ErrorAction SilentlyContinue
    $bc = (Get-WinEvent -FilterHashtable @{LogName='System'; Id=1001} `
                        -MaxEvents 1 -ErrorAction SilentlyContinue).Message
    if ($bc -match '0x[0-9A-Fa-f]+') {
        $hits++
        $classes += ($bc -split "`n" | Select-String 'BUGCHECK_CODE|0x' |
                     Select-Object -First 1).ToString().Trim()
    }
}
[PSCustomObject]@{
  N          = $N
  Hits       = $hits
  ⚠ Taxa      = "$([math]::Round(100*$hits/$N,1))%"
  ⚠ Classes   = ($classes | Group-Object | Sort-Object Count -Descending |
                Select-Object -First 3 | ForEach-Object { "$($_.Name) ($($_.Count))" }) -join '; '
} | Format-List
```

| Taxa | ⚠ Leitura |
|---|---|
| 100% | ✅ Determinístico |
| 50–99% | ⚠ Corrida real, reprodutível |
| 5–49% | ⚠ Janela estreita — e você diz que alargou |
| 1–4% | ⚠ Documente a taxa **e** as técnicas |
| 0% | ❌ ⚠ **A hipótese está errada** |

⚠ **A última linha vale repetir pela terceira vez no curso:** ⚠ zero **não** é "não é bug". ⚠ É "a janela é outra".

---

## 11.5 O reporte

⚠ **A estrutura, e cada seção existe por um motivo:**

```markdown
# <Driver>: <classe> em <funcao>

## Resumo
⚠ Uma frase: o que e', o que permite, e em que versao.

## Alvo
- driver, versao, hash, data de assinatura, fabricante
- ⚠ WDF ou WDM
- build do Windows testada

## Pre-requisito de acesso
- ⚠ a ACL do device: quem abre?
- ⚠ privilegio exigido: nenhum | usuario comum | admin
   ← a linha que define a GRAVIDADE

## Causa raiz
⚠ UMA FRASE, com a linha/funcao.
   "o handler do IOCTL 0x... dereferencia Type3InputBuffer
    sem ProbeForRead, na funcao X+0x1f"

## Reproducao
- config do Driver Verifier
- o trigger (⚠ bytes, nao narrativa)
- ⚠ A TAXA, com N

## Evidencia
- o relatorio do !analyze -v, ou
- a observacao de comportamento (⚠ modulo 6)
- ⚠ A PRIMITIVA demonstrada — nao a consequencia

## Impacto
- o que a primitiva permite, medido
- ⚠ sem exagerar: nao e' "RCE" se exige admin

## Correcao
- o que falta no contrato (modulo 2)
- e a defesa em profundidade (ACL, blocklist, HVCI)

## ⚠ LIMITACOES
- o que NAO foi testado
- o que NAO e' auditavel
- ⚠ ferramenta/IOCTL novo = nao coberto

## Divulgacao
- canal, data, prazo
```

⚠ **A seção `LIMITAÇÕES` é obrigatória, e é a mesma do curso de LLM.** ⚠ Ela protege o reporte e informa quem decide. ⚠ Sem ela, o achado é desmentível por quem conhece o assunto.

⚠ **E a linha `PRIMITIVA` é a que este curso insistiu em separar:** ⚠ você reporta **o que o bug permite**, não a cadeia que você montou. ⚠ É a razão de o curso não ter ensinado a cadeia completa — ela não é o que se entrega.

---

## 11.6 Divulgação

⚠ **A tabela de decisão:**

| Situação | ⚠ O que fazer |
|---|---|
| Driver do **seu** lab | ✅ Análise e aprendizado |
| Alvo com **contrato escrito** | ✅ Escopo definido, autorização assinada |
| Driver de **terceiro**, sem contrato | ❌ Não é pesquisa — é alvo alheio |
| Variante de **mesmo fabricante** | ⚠ **Um** contato, com a lista |
| ⚠ **Coordenador** (`CVD`, `MSRC`) | ⚠ Prazo e canal definidos |
| Bug **sem correção possível** | ⚠ Defesa em profundidade no reporte |

⚠ **A quarta linha é a regra do módulo 10:** ⚠ N reports avulsos fazem a equipe tratar cada um como evento isolado — e **não generalizar**, que é o que produziu as variantes. ⚠ Um contato com a lista é o que muda o resultado.

⚠ **E a última é a honestidade técnica:** ⚠ nem todo bug de driver **tem** correção — driver de fabricante extinto, produto descontinuado, hardware fora de linha. ⚠ Quando a correção não existe, o reporte entrega **defesa em profundidade**: ACL, blocklist, `HVCI`. ⚠ É a mesma estrutura do curso de LLM: quando não há correção, entrega-se **contenção e declaração**.

---

## 11.7 Ética e o limite do curso

⚠ **A delimitação, escrita com clareza:**

| Este curso | ⚠ O que não está aqui |
|---|---|
| Encontrar o bug no **seu** alvo | Invasão de sistema de terceiro |
| **Reproduzir** com taxa | Publicar exploit funcional |
| **Reportar** a primitiva | Vender ou usar a cadeia |
| Endurecer a frota | — |

⚠ **A vulnerabilidade que você achar num kernel que **não é seu** é achado de outra pessoa.** ⚠ Reportar é trabalho técnico; explorar sem autorização é outra coisa — e essa distinção não é burocracia, é o que faz a área existir.

⚠ **E o argumento prático, que vale mais que o moral:** ⚠ toda a técnica deste curso é **reutilizável**, e o crédito também. ⚠ Quem reporta com método é convidado a continuar; quem publica sem coordenar perde o acesso ao alvo — e ao próximo.

---

## Laboratório 11 — O ciclo completo

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **Snapshot. `Driver Verifier` ligado.**

**Objetivo:** produzir **um** achado completo, do alvo ao reporte. Não precisa ser 0-day — **reproduzir um CVE conhecido com método próprio é o exercício.**

```powershell
mkdir C:\lab\m11 -Force; cd C:\lab\m11

# ── PASSO 1: ALVO ───────────────────────────────────────────
#    ⚠ Escolha entre: o driver que VOCE escreveu (modulos 2-6),
#      ou um driver do sistema. Justifique com o modulo 1.
```

```markdown
# caça-hipotese.md — PASSO 3
Alvo:
Superficie:
Contrato:        ⚠ o que DEVERIA existir
Observacao:      ⚠ o que FOI lido
Hipotese:
Falsificacao:    ⚠ o que me faria abandonar
Teste minimo:
```

```powershell
# ── PASSO 4: LAB — registre o ambiente ──────────────────────
bcdedit /enum {current} | Select-String 'description|integrity|hypervisor'
[System.Environment]::OSVersion.Version
verifier /querysettings
Get-FileHash C:\Windows\System32\drivers\<ALVO>.sys -Algorithm SHA256
```

```powershell
# ── PASSO 5 e 6: TRIGGER e TAXA ─────────────────────────────
#    Use o taxa.ps1 do 11.4. ⚠ Registre N e o resultado.
```

```powershell
# ── PASSO 7: PRIMITIVA ──────────────────────────────────────
#    ⚠ Responda: o bug PERMITE escrita? leitura? controle de fluxo?
#    ⚠ Se nao souber, o achado nao esta pronto.
```

```markdown
# reporte.md — PASSO 8
⚠ A estrutura do 11.5 COMPLETA, incluindo LIMITACOES
```

**O que observar:** o passo 7 é o mais desconfortável e o mais importante. ⚠ Se você não consegue dizer **o que a primitiva permite**, você tem um crash — não um achado. ⚠ E o passo 3 é o que impede que a investigação vire tentativa.

**Exercício 1:** preencha a ficha de hipótese para o seu alvo, com **todos** os seis campos. ⚠ O campo `Falsificação` precisa dizer **o que** e **em quanto tempo**.

**Exercício 2:** rode o `taxa.ps1` com N=100 e registre as três informações: taxa, classes de bugcheck e a condição. ⚠ Se a taxa for baixa, **alargue** (módulo 5) antes de reportar.

**Exercício 3 (o que vale):** escreva o **reporte completo** no formato do 11.5, com a seção `LIMITAÇÕES` preenchida e a linha `PRIMITIVA` explícita. ⚠ Depois releia e corte todo adjetivo. O que sobra é o que se entrega.

---

## Resumo

- **O ciclo tem oito passos**, e o 3 (hipótese falsificável) e o 7 (primitiva) são os que qualificam o trabalho.
- ⚠ **Você procura o OMISSO** — e ele só é visível contra **o que deveria existir** (módulo 2).
- ⚠ **Registre build, versão, hash, config do `Verifier` e se é `WDF`** — sem isso o resultado não vale.
- ⚠ **`WDF` é a armadilha**: o framework faz a validação, e a "ausência de `Probe`" não é omissão.
- ⚠ **A taxa é parte do achado** — e zero significa hipótese errada, não ausência de bug.
- ⚠ **Reporta-se a PRIMITIVA, não a consequência** — e não a cadeia que você montou.
- ⚠ **A seção de limitações é obrigatória** — ela protege o reporte de ser desmentido.
- ⚠ **Um contato por fabricante**, com a lista de variantes.
- ⚠ **Quando não há correção, entrega-se contenção e declaração** — a mesma estrutura do curso de LLM.

---

## O que o próximo módulo entrega

Você tem o ciclo. O módulo 12 fecha o curso com **um alvo com defeitos não anunciados** — e o entregável é o reporte completo, com a primitiva, a taxa e a divulgação.
