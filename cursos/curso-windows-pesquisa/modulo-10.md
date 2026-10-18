# Módulo 10 — `Variant Hunting`: O Padrão de um Achado Aplicado a N Produtos

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 10 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 9
**Próximo:** Módulo 11 — Método e reporte

---

## O que este módulo entrega

Ao final, você vai saber **transformar um achado em vários**. Você vai entender o conceito de **padrão** — o que se abstrai de um bug para procurá-lo em outro lugar — e vai saber aplicar isso ao ecossistema, com método e com os limites que o rigor exige.

---

## 10.1 O que é uma variante

⚠ **A definição operacional:**

> **Variante é o MESMO defeito, em outro lugar.** Não é o mesmo bug — é a mesma **causa**,
> aparecendo em outro produto, outra versão, ou outro ponto do mesmo código.

⚠ **A distinção que organiza o módulo:**

| | Bug | ⚠ **Variante** |
|---|---|---|
| Ocorrências | 1 | ⚠ **N** |
| Correção | 1 patch | ⚠ **N patches** |
| Descoberta | Análise do alvo | ⚠ **Abstração do padrão** |
| Método | Módulos 2 a 6 | ⚠ **Este módulo** |
| Valor | 1 achado | ⚠ **N achados, com 1 trabalho** |

⚠ **A razão de a variante valer tanto:** ⚠ o custo marginal de achar a **segunda** ocorrência é uma fração do custo da primeira. ⚠ Quem acha um bug reporta um bug; quem acha o **padrão** reporta uma **classe** — e a classe costuma estar em vários produtos do mesmo fabricante.

⚠ **E é a razão de o curso de `Patch Diffing` existir na trilha:** ⚠ ler um diff é achar **um** bug; aplicar o padrão do diff a N produtos é `variant hunting`. ⚠ Os dois cursos se encontram exatamente aqui.

---

## 10.2 O que se abstrai

⚠ **O passo que define o método, e o mais difícil: transformar um bug concreto em um **padrão procurável**.**

```
   BUG CONCRETO                    ⚠ PADRAO (abstraido)
   ────────────                    ───────────────────

   "o IOCTL 0x80002004 do            "todo IOCTL com METHOD_NEITHER
    driver X nao chama                que dereferencia Type3InputBuffer
    ProbeForRead"                     sem ProbeForRead"

   ⚠ especifico de um              ✅ procurável em N binarios:
     binario                          - METHOD_NEITHER (2 bits)
                                      - uso de Type3InputBuffer
                                      - ausencia de call ProbeForRead
```

⚠ **O padrão tem sempre **três partes**, e as três precisam ser procuráveis:**

| Parte | ⚠ Exemplo |
|---|---|
| **Condição** | `METHOD_NEITHER` no código do `IOCTL` |
| **Ação suspeita** | Uso de `Type3InputBuffer` |
| ⚠ **Ausência** | ⚠ **Nenhum `ProbeForRead` no caminho** |

⚠ **A terceira é a que exige trabalho, e a que a maioria não faz.** ⚠ Procurar uma **ação** é fácil (procurar a chamada); procurar uma **ausência** exige entender **o que deveria estar ali**. ⚠ É a mesma dificuldade do módulo 4 do curso de Web Apps — a omissão não aparece no grep.

⚠ **E é por isso que o módulo 2 (o contrato) é pré-requisito deste:** ⚠ sem saber **o que deveria existir**, você não tem como procurar o que falta.

---

## 10.3 Onde a variante aparece

⚠ **Os quatro âmbitos, em ordem de produtividade:**

```
   1. MESMO FABRICANTE, OUTRO PRODUTO
        ⚠ a equipe escreve IOCTL do mesmo jeito em 12 produtos
        ⚠ e corrige o que foi reportado, nao o PADRAO

   2. MESMA FAMILIA, OUTRA VERSAO
        ⚠ a correcao entra na versao nova e nao na LTS

   3. MESMO PRODUTO, OUTRO IOCTL
        ⚠ 40 IOCTLs, 5 validam tamanho, 35 nao

   4. ⚠ MESMO CODIGO, OUTRA PLATAFORMA
        ⚠ o driver de Windows tem irmao em Linux/macOS
          com o mesmo defeito, no mesmo lugar
```

⚠ **A primeira é a mais produtiva. ⚠ E a razão é organizacional, não técnica:** o fabricante **corrige o que foi reportado** — o `IOCTL` específico — e **não generaliza**. ⚠ O padrão continua nos outros produtos, e ninguém olhou.

⚠ **A quarta é a que mais surpreende:** driver que existe para Windows, Linux e macOS, escrito pela mesma equipe, com o **mesmo defeito de validação** em cada versão. ⚠ Achar um é achar três — e cada um tem seu programa de divulgação.

⚠ **E a segunda é a mais fácil de verificar:** ⚠ se o CVE foi corrigido na versão `v3.2`, verifique `v3.1` e `v2.9`. ⚠ A resposta costuma ser "não".

---

## 10.4 O método de busca

⚠ **Os cinco passos, e cada um é uma decisão:**

```
   1. ABSTRAIA   ->  bug concreto  ->  padrao de 3 partes
        │
   2. COLETE     ->  ⚠ o CONJUNTO: quais binarios procurar?
        │              - produtos do fabricante
        │              - versoes publicadas
        │              - da propria maquina
        │              - repositorio publico de driver
        ▼
   3. PROCURE    ->  heuristica estatica nos binarios
        │              ⚠ candidato, nao conclusao
        ▼
   4. ⚠ CONFIRME  ->  leitura do codigo / desmontagem
        │              ⚠ o passo que a ferramenta nao faz
        ▼
   5. AGRUPE     ->  ⚠ N achados, 1 causa raiz, 1 padrao
```

⚠ **O passo 2 é a decisão de escopo, e a que mais custa.** ⚠ Coletar 200 binários e analisar 5 é pior que coletar 20 e analisar 20. ⚠ A ordem de prioridade é a do módulo 1: **alcance**, idade, fabricante.

⚠ **O passo 4 merece a insistência do curso:** ⚠ a heurística produz **candidato**. ⚠ Um binário que "parece" ter `NEITHER` sem `Probe` pode ter o `Probe` **em função separada**, ou ter `try/except` estruturado de outro jeito. ⚠ Reportar candidato não confirmado é o que queima credibilidade.

⚠ **A ferramenta de apoio, e o que ela faz:**

```powershell
# 1. Extrair os codigos de IOCTL de um conjunto de binarios
#    ⚠ heuristica: procure as constantes no .text
Get-ChildItem C:\Windows\System32\drivers\*.sys | ForEach-Object {
  $f = $_
  $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
  # ⚠ procurar padrao de constante 0x8xxxxxxx nao e' trivial em PowerShell;
  #    use dumpbin/objdump e filtre
  $out = & dumpbin /disasm $f.FullName 2>$null
  $cts = $out | Select-String '0x8[0-9a-fA-F]{7}'
  if ($cts) { [PSCustomObject]@{ Driver = $f.Name; Ocorrencias = $cts.Count } }
} | Sort-Object Ocorrencias -Descending | Select-Object -First 20
```

```powershell
# 2. ⚠ A condicao do padrao: ha import de Probe?
$alvos = Get-ChildItem C:\Windows\System32\drivers\*.sys
$alvos | ForEach-Object {
  $imp = & dumpbin /imports $_.FullName 2>$null
  [PSCustomObject]@{
    Driver     = $_.Name
    ⚠ TemProbe  = [bool]($imp | Select-String 'ProbeForRead|ProbeForWrite')
    TemNeither = [bool]((& dumpbin /disasm $_.FullName 2>$null) |
                        Select-String 'Type3InputBuffer')
  }
} | Where-Object { $_.TemNeither -and -not $_.TemProbe } |
  Format-Table -AutoSize
# ⚠ A LISTA FINAL E' DE CANDIDATOS — ⚠ confirme um por um
```

⚠ **A leitura da segunda consulta é a do curso inteiro:** ⚠ "tem `NEITHER` **e** não tem `Probe`" é o **padrão** do 10.2 — e a lista que sai é **candidato**, não achado. ⚠ O passo 4 existe por isso.

---

## 10.5 O rigor: onde o método falha

⚠ **A parte do módulo que protege você, e ela é obrigatória:**

| Falha do método | ⚠ O que acontece |
|---|---|
| **Falso positivo** | ⚠ O `Probe` está em função separada |
| **Falso negativo** | ⚠ O driver não usa `NEITHER`, e o bug é outro |
| **Versão errada** | ⚠ Analisou build antiga e reportou como atual |
| ⚠ **Padrão amplo demais** | ⚠ "tem ponteiro" — 90% dos drivers "casam" |
| ⚠ **Padrão estreito demais** | ⚠ Só acha cópia literal |
| **Diferença de biblioteca** | ⚠ O `WDF` faz o `Probe` por você |

⚠ **A última linha é a armadilha técnica mais comum:** ⚠ um driver `WDF` **não chama `ProbeForRead`** — porque o **framework** trata o buffer. ⚠ A heurística do 10.4 vai marcá-lo como candidato, e ele **não é**.

⚠ **E a quarta é a armadilha de escopo:** ⚠ um padrão amplo produz uma lista grande e inútil. ⚠ **A qualidade do padrão é medida pelo tamanho da lista que sobrevive à confirmação** — não pelo número de candidatos.

⚠ **A regra de escrita, que o relatório exige:** ⚠ para cada variante confirmada, declare **o que a heurística marcou** e **o que a confirmação mostrou**. ⚠ A diferença entre as duas é a medida da qualidade do padrão.

---

## 10.6 O relatório de variante

⚠ **O formato, e ele agrega N achados sob uma causa:**

```
VARIANT HUNTING — <padrao>
──────────────────────────────────────────────────────────
PADRAO (3 partes):
  Condicao:  METHOD_NEITHER
  Acao:      uso de Type3InputBuffer
  Ausencia:  ProbeForRead no caminho
                    │
CONJUNTO:   N binarios, criterio de escolha: ...
                    │
CANDIDATOS: X marcados pela heuristica
CONFIRMADOS: ⚠ Y  (⚠ a diferenca X-Y e' a qualidade do padrao)
                    │
TABELA:
  Produto   Versao   IOCTL   Confirmado   ⚠ Alcance (ACL)
  A.sys     v1.2     0x8001  sim          usuario comum
  B.sys     v3.0     0x8004  sim          admin
  C.sys     v1.0     0x8002  ⚠ FALSO POS  (WDF faz o Probe)
                    │
CAUSA RAIZ COMUM: uma frase
DIVULGACAO:     ⚠ um contato por produto, nao N reports avulsos
──────────────────────────────────────────────────────────
```

⚠ **A linha `CAUSA RAIZ COMUM` é o que transforma a lista em achado.** ⚠ N variantes sem a frase de causa são N bugs separados — e perdem o valor de serem o **mesmo** defeito.

⚠ **E a `DIVULGAÇÃO` tem regra própria:** ⚠ quando as variantes são do **mesmo fabricante**, o contato é **um** — com a lista, e não N reports avulsos. ⚠ Fazer N reports separados é o que faz a equipe de segurança do outro lado tratar cada um como evento isolado, e **não generalizar** — que é exatamente o que produziu as variantes.

---

## Laboratório 10 — Aplicar um padrão

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **Análise estática de binários. Nada é executado ou instalado.**

```powershell
mkdir C:\lab\m10 -Force; cd C:\lab\m10
```

```powershell
# ── 1. ⚠ ABSTRAIA o padrao a partir de um achado do seu lab ──
#    Use o driver que VOCE escreveu nos modulos 2 a 6.
#    Padrao de 3 partes:
$padrao = @{
  Condicao = "METHOD_NEITHER"
  Acao     = "uso de Type3InputBuffer"
  Ausencia = "ProbeForRead no caminho"
}
$padrao | Format-List
```

```powershell
# ── 2. ⚠ COLETE o conjunto — decida o escopo ────────────────
#    Opcao A: os drivers desta VM
$conjunto = Get-ChildItem C:\Windows\System32\drivers\*.sys |
            Where-Object { $_.Length -lt 2MB }
"conjunto: $($conjunto.Count) binarios"
#    ⚠ registre o CRITERIO de escolha — ele vai no relatorio
```

```powershell
# ── 3. PROCURE — a heuristica das tres partes ──────────────
$res = $conjunto | ForEach-Object {
  $f = $_
  $dis = & dumpbin /disasm $f.FullName 2>$null
  $imp = & dumpbin /imports $f.FullName 2>$null

  $usaNeither = [bool]($dis | Select-String 'Type3InputBuffer')
  $temProbe   = [bool]($imp | Select-String 'ProbeForRead|ProbeForWrite')
  $ehWDF      = [bool]($imp | Select-String 'Wdf|WDF')

  if ($usaNeither -and -not $temProbe) {
    [PSCustomObject]@{
      Driver    = $f.Name
      Caminho   = $f.FullName
      ⚠ WDF      = $ehWDF       # ⚠ provavel FALSO POSITIVO
      Tamanho   = $f.Length
    }
  }
}
$res | Export-Csv candidatos.csv -NoTypeInformation -Encoding utf8
"candidatos: $($res.Count)"
$res | Format-Table -AutoSize | Out-String | Write-Host
```

```powershell
# ── 4. ⚠ CONFIRME — um por um, na desmontagem ───────────────
#    Para cada candidato:
#    - localize o handler do IOCTL
#    - ⚠ verifique se ha Probe, ou __try/__except, no CAMINHO
#    - ⚠ verifique se o WDF faz o tratamento
$alvo = ($res | Where-Object { -not $_.WDF } | Select-Object -First 1).Caminho
if ($alvo) {
  "══ confirmando: $alvo"
  & dumpbin /disasm $alvo | Select-String 'Type3InputBuffer|Probe|call' |
    Select-Object -First 40
}
```

```powershell
# ── 5. AGRUPE — a tabela e a causa raiz ────────────────────
#    Preencha o formato do 10.6 com:
#    - os confirmados
#    - os falsos positivos, e POR QUE
#    - a CAUSA RAIZ COMUM, em uma frase
```

**O que observar:** no passo 3, o campo `WDF` é o que separa candidato de **falso positivo provável**. ⚠ Um driver `WDF` **não chama `Probe`** — o framework trata. ⚠ Marcá-lo como vulnerável é exatamente o erro que o 10.5 nomeia.

**Exercício 1:** rode os cinco passos e preencha a tabela do 10.6. ⚠ A coluna `Confirmado` precisa ter **sim**, **não** e **falso positivo** — as três.

**Exercício 2:** compare **candidatos** com **confirmados** e escreva, em duas linhas, **a qualidade do seu padrão**. ⚠ Se a lista de candidatos for enorme, o padrão está amplo demais: estreite e repita.

**Exercício 3 (o que vale):** escreva a **causa raiz comum** em uma frase, e o **plano de divulgação** do 10.6 — um contato por fabricante, com a lista. ⚠ Depois responda: se as variantes fossem de **três fabricantes** diferentes, o plano mudaria? Como?

---

## Resumo

- ⚠ **Variante é o MESMO defeito em outro lugar** — a causa se repete, o bug não.
- ⚠ **O custo marginal da segunda ocorrência é uma fração da primeira** — e é por isso que o método vale.
- ⚠ **O padrão tem três partes**: condição, ação suspeita e ⚠ **ausência**.
- ⚠ **Procurar uma ausência exige saber o que deveria existir** — é por isso que o módulo 2 é pré-requisito.
- **Os quatro âmbitos**: mesmo fabricante, outra versão, outro `IOCTL`, outra plataforma.
- ⚠ **O fabricante corrige o que foi reportado, não o padrão** — a razão de a variante existir.
- ⚠ **Heurística produz candidato; a confirmação é sua** — reportar candidato queima credibilidade.
- ⚠ **`WDF` faz o `Probe` por você** — a armadilha de falso positivo mais comum.
- ⚠ **Um contato por fabricante**, com a lista — N reports avulsos não fazem generalizar.

---

## O que o próximo módulo entrega

Você tem todos os métodos. O módulo 11 fecha o ciclo: **do alvo ao achado reproduzível, e a divulgação** — com o formato de reporte que os onze módulos alimentaram.
