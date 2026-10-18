# Módulo 1 — Triagem de Alvo: Como Ler a Superfície de um Driver e Decidir se Vale

**Curso:** Pesquisa de Segurança em Windows: Do Mapa ao Achado
**Módulo:** 1 de 12 · 3 horas
**Pré-requisitos:** curso de Windows Internals · curso de Exploit Development
**Próximo:** Módulo 2 — O contrato do `IOCTL`

---

## O que este módulo entrega

Ao final, você vai saber **escolher alvo com critério** — e recusar candidato sem perder tempo. A competência mais subestimada da pesquisa é **descartar rápido**: quem estuda tudo não estuda nada. Você vai ler um driver **sem executá-lo** e dizer se vale.

---

## 1.1 A pergunta que a pesquisa faz

⚠ **A diferença que organiza os onze módulos:**

| Operador de ferramenta | Pesquisador |
|---|---|
| Roda o scanner e vê o que sai | ⚠ **Escolhe** o que vale a pena |
| Testa tudo que aparece | ⚠ **Descarta 95%** antes de testar |
| Espera o alvo pronto | ⚠ **Define** o alvo |
| Acha o que já é sabido | ⚠ Acha o que ninguém catalogou |

⚠ **E a razão de a triagem vir primeiro, e não o `IOCTL`:** um pesquisador que testa 40 drivers sem critério gasta três semanas e acha o que qualquer scanner acharia. ⚠ O mesmo pesquisador, com tabela de triagem, escolhe **dois** e acha algo na terça-feira.

---

## 1.2 O que se lê antes de executar

⚠ **Um driver `.sys` é um `PE` (módulo 6 do Windows Internals). Ele diz muito sobre si mesmo sem rodar:**

| O que se lê | ⚠ O que revela |
|---|---|
| **Serviço no registro** | Nome, tipo, início, caminho — módulo 7 |
| **Data de assinatura** | ⚠ Antigo = menos auditado |
| **Fabricante** | Antivírus, placa, VPN, RGB, virtualização |
| **Imports** | ⚠ `ZwXxx`, `MmMapIoSpace`, `RtlCopyMemory` |
| **Strings** | Nome de `IOCTL`, mensagem de erro, tag de pool |
| ⚠ **ACL do `\Device`** | ⚠ Quem pode abrir — o alcance |
| **Tamanho e seções** | ⚠ Driver grande = superfície grande |
| ⚠ **`METHOD_*` nos códigos** | ⚠ A triagem em um passo — módulo 2 |

⚠ **A última linha é a que decide a ordem de trabalho**, e é o único item da tabela que se extrai **por cálculo**, sem ler código: os **2 bits baixos** de cada `IOCTL` dizem o método. ⚠ `METHOD_NEITHER` é candidato automático.

---

## 1.3 Os critérios, com peso

⚠ **A tabela de triagem, e cada linha tem um porquê:**

| Critério | ⚠ A pergunta | Peso |
|---|---|---|
| **Alcance** | Quem consegue abrir o device? | ⚠ Alto |
| **Método** | Há `METHOD_NEITHER`? Quantos? | ⚠ Alto |
| ⚠ **Privilégio exigido** | Precisa admin, ou usuário comum basta? | ⚠ Alto |
| **Idade** | Assinado há quanto tempo? | Médio |
| **Complexidade** | Tamanho, número de `IOCTL`, uso de pool | Médio |
| **Instalação** | Vem com o Windows, ou o usuário instala? | Médio |
| ⚠ **Assinatura** | BYOVD conhecido? | ⚠ Alto |
| **Estrutura** | Tem `SecurityProcedure` própria? | Baixo |

⚠ **A linha do privilégio exigido é a que separa achado de curiosidade.** ⚠ Um bug em driver que só o `SYSTEM` alcança é **bug**, e não é escalação. Um bug em driver que **usuário comum** alcança é outra coisa.

⚠ **E a coluna de peso não é ordem de teste — é ordem de valor.** ⚠ Um `METHOD_NEITHER` sem `METHOD_NEITHER` alcançável vale menos que um `METHOD_BUFFERED` com alcance amplo.

---

## 1.4 Onde procurar

⚠ **As quatro categorias, em ordem de produtividade:**

```
   1. ⚠ DRIVERS DE FABRICANTE DE HARDWARE
        placa-mae, RGB, monitor, impressora, teclado
        ⚠ escritos por equipe pequena, com pouco foco em seguranca
        ⚠ e com frequencia expostos a usuario comum

   2. ⚠ SOFTWARE DE SEGURANCA DE TERCEIRO
        antivirus, EDR, VPN, criptografia
        ⚠ rodam como SYSTEM, com privilegio maximo,
          e expoem interface ao usuario

   3. DRIVERS LEGADOS DO PROPRIO WINDOWS
        ⚠ muito auditados — mas a superficie e' grande

   4. ⚠ DRIVERS DE VIRTUALIZACAO E EMULACAO
        hypervisor de terceiro, driver de jogo, anti-cheat
        ⚠ privilegio maximo, alcance amplo
```

⚠ **A segunda é a mais produtiva para pesquisa defensiva, e a mais delicada** — porque o alvo é software de segurança de outra empresa. ⚠ Isso muda o **procedimento** (divulgação responsável), não o método.

⚠ **A primeira é a melhor para quem começa:** fabricante pequeno, driver simples, alcance amplo, e — importante — **disposição a corrigir**.

---

## 1.5 O descarte rápido

⚠ **Os cinco sinais de "não vale", e eles economizam semanas:**

| Sinal | ⚠ Por quê |
|---|---|
| Só o `SYSTEM` alcança o device | ⚠ Não é escalação |
| Sem `IOCTL` — só `READ`/`WRITE` de rotina | Superfície estreita |
| Driver é `WDF` recente, bem estruturado | ⚠ Contrato verificado pelo framework |
| Assinatura recente, com `CFG` e `ACG` | ⚠ Já foi endurecido |
| Já tem CVE público e foi corrigido | ⚠ Alguém passou antes |

⚠ **A terceira merece explicação:** o *WDF* (*Windows Driver Framework*) faz **validação de contrato por você** — inclusive de método de buffer. ⚠ Um driver WDF bem escrito tem menos chance de falhar no que o módulo 2 ensina.

⚠ **E a quinta não é descarte definitivo — é **mudança de objetivo**: um driver já corrigido é alvo de `variant hunting` (módulo 10), não de análise do zero.

---

## 1.6 A ficha de triagem

⚠ **O instrumento, e ele cabe em uma tela:**

```
┌────────────────────────────────────────────────────────────┐
│ FICHA DE TRIAGEM                                            │
├────────────────────────────────────────────────────────────┤
│ Driver:            nome.sys  vX.Y.Z                         │
│ Fabricante:                                                 │
│ Assinatura:        data, emissor                            │
│ Servico:           nome, Start, Type                        │
│ Device:            \Device\...   ⚠ ACL: quem abre?           │
│                                                    │
│ IOCTL total:        N                                       │
│ ⚠ METHOD_BUFFERED:  n    ⚠ NEITHER: n    IN/OUT_DIRECT: n   │
│ Privilégio exigido: admin | usuario comum | qualquer        │
│                                                    │
│ Imports suspeitos:                                          │
│   ⚠ MmMapIoSpace, ProbeFor*, RtlCopyMemory, ObReference    │
│ Strings relevantes:  tags de pool, nomes de IOCTL, versao   │
│                                                    │
│ VEREDITO:   vale | vale com ressalva | descartar            │
│ ⚠ RAZAO:    ...                                             │
└────────────────────────────────────────────────────────────┘
```

⚠ **A linha `RAZÃO` é obrigatória**, e é o que separa triagem de palpite. ⚠ Não basta dizer "vale" — é preciso dizer **por qual critério**.

---

## 1.7 Ler sem executar

⚠ **Os comandos do módulo — todos **estáticos**, nenhum executa o driver:**

```powershell
# 1. O inventário de servicos de kernel em execucao
Get-CimInstance Win32_SystemDriver |
  Where-Object { $_.State -eq 'Running' } |
  Select-Object Name, PathName, StartMode |
  Sort-Object Name | Format-Table -AutoSize

# 2. De onde vem, e como esta assinado
Get-AuthenticodeSignature C:\Windows\System32\drivers\meudrv.sys |
  Select-Object Status, SignerCertificate
(Get-Item C:\Windows\System32\drivers\meudrv.sys).VersionInfo |
  Select-Object CompanyName, ProductName, FileVersion

# 3. Carregado, mas sem arquivo em drivers\ ? (⚠ driver de terceiro)
Get-CimInstance Win32_SystemDriver | Where-Object {
  $_.PathName -and $_.PathName -notmatch 'System32\\drivers' } |
  Select-Object Name, PathName
```

```powershell
# 4. Analise estatica do binario — imports e strings
dumpbin /headers meudrv.sys | Select-String 'machine|timestamp|subsystem'
dumpbin /imports meudrv.sys | Select-String 'Zw|Mm|Probe|Ob|Io'
strings -n 6 meudrv.sys 2>$null | Select-String -Pattern 'IOCTL|DRV_|tag' | Select-Object -First 30

# 5. ⚠ A TRIAGEM DECISIVA: extraia os codigos de IOCTL
#    e classifique pelos 2 bits baixos
#      xx00 = METHOD_BUFFERED     xx01 = METHOD_IN_DIRECT
#      xx10 = METHOD_OUT_DIRECT   xx11 = ⚠ METHOD_NEITHER
```

```python
# 6. Classificar os codigos extraidos — o passo que decide a ordem
import re, sys

# ⚠ cole aqui os valores hex que a desmontagem/strings revelaram
codigos = set()   # ex.: {0x80002000, 0x80002003, ...}

def metodo(ctl):
    return {0:"METHOD_BUFFERED", 1:"METHOD_IN_DIRECT",
            2:"METHOD_OUT_DIRECT", 3:"⚠ METHOD_NEITHER"}[ctl & 3]

def funcao(ctl):  return (ctl >> 2) & 0xFFF
def acesso(ctl):
    return {0:"ANY", 1:"READ", 2:"WRITE", 3:"READ+WRITE"}[(ctl >> 14) & 3]

for c in sorted(codigos):
    print(f"0x{c:08X}  func={funcao(c):3d}  {metodo(c):18s}  acesso={acesso(c)}")

neither = [c for c in codigos if (c & 3) == 3]
print(f"\n⚠ {len(neither)} de {len(codigos)} sao METHOD_NEITHER")
```

⚠ **Note o que este módulo fez:** ele **não executou nada**, não instalou driver e não tocou no alvo. ⚠ A triagem inteira é **leitura** — e é assim que deve ser. Executar vem no módulo 2, e sempre na VM com snapshot.

---

## Laboratório 1 — Triar três drivers

⚠ **Não testado em VM. Valide antes de publicar.**
⚠ **Leitura estática apenas. Nenhum driver é executado neste lab.**

```powershell
mkdir C:\lab\m01 -Force; cd C:\lab\m01

# 1. Inventario: os drivers de TERCEIRO em execucao nesta VM
Get-CimInstance Win32_SystemDriver | Where-Object { $_.State -eq 'Running' } |
  ForEach-Object {
    $vi = (Get-Item $_.PathName -ErrorAction SilentlyContinue).VersionInfo
    [PSCustomObject]@{
      Nome = $_.Name; Caminho = $_.PathName
      Fabricante = $vi.CompanyName; Versao = $vi.FileVersion
    }
  } | Where-Object { $_.Fabricante -and $_.Fabricante -notmatch 'Microsoft' } |
  Format-Table -AutoSize | Out-File -Encoding utf8 terceiros.txt

Get-Content terceiros.txt
```

```powershell
# 2. Para os TRES mais antigos (⚠ data de assinatura mais velha),
#    preencha a ficha de triagem do 1.6
$drivers = @("C:\Windows\System32\drivers\drv1.sys",
             "C:\Windows\System32\drivers\drv2.sys",
             "C:\Windows\System32\drivers\drv3.sys")

foreach ($d in $drivers) {
  if (-not (Test-Path $d)) { continue }
  "══ $d"
  Get-AuthenticodeSignature $d | Select-Object Status,
    @{n='Assinado';e={$_.SignerCertificate.NotAfter}}
  (Get-Item $d).VersionInfo | Select-Object CompanyName, FileVersion
  dumpbin /imports $d | Select-String 'Zw|Mm|Probe|Ob|Io' | Select-Object -First 15
  ""
}
```

```bash
# 3. ⚠ A classificacao por metodo — o passo decisivo
#    Cole os hex que aparecerem na desmontagem/strings em codigos.py
python codigos.py
```

```powershell
# 4. A ACL do device — quem alcanca?
#    ⚠ WinObj (Sysinternals) mostra \Device e o SecurityDescriptor
#    Procure: "Everyone", "Users", "Authenticated Users" com acesso
#    ⚠ Se "Users" tem leitura/escrita, o alcance e' de usuario comum
```

**O que observar:** no passo 4, um device que concede acesso a `Users` ou `Authenticated Users` tem **alcance de usuário comum** — e é isso que transforma um bug em **escalação de privilégio**. ⚠ Um driver com o mesmo bug e ACL restrita ao `SYSTEM` não produz escalação.

**Exercício 1:** preencha a **ficha de triagem do 1.6** para os três drivers, com a linha `VEREDITO` e `RAZÃO` preenchidas. ⚠ Para os descartados, a razão precisa citar **qual critério do 1.5** se aplica.

**Exercício 2:** dos três, escolha **um** para o resto do curso e justifique em três linhas. ⚠ A justificativa precisa usar os **pesos** do 1.3 — não "parece interessante".

**Exercício 3 (o que vale):** escreva um script que, dado um `.sys`, produza a **contagem por método** lendo os imports e as strings. ⚠ O script é **heurístico** — ele não desmonta o binário com precisão. Escreva, em duas linhas, **onde ele erra** e por que a desmontagem (módulo 2) continua necessária. É o mesmo raciocínio do curso de Web Apps sobre ferramenta: ela informa, você confirma.

---

## Resumo

- ⚠ **A competência subestimada da pesquisa é descartar rápido** — quem estuda tudo não estuda nada.
- ⚠ **Toda a triagem é leitura estática**: registro, assinatura, imports, strings, ACL, métodos. Nada executa.
- ⚠ **Os 2 bits baixos do `IOCTL` classificam o risco em um passo** — `METHOD_NEITHER` é candidato automático.
- ⚠ **Privilégio exigido é o que separa escalação de bug** — driver que só o `SYSTEM` alcança não produz escalação.
- **As quatro categorias de alvo**, em ordem de produtividade: hardware de fabricante pequeno, software de segurança, drivers legados, virtualização.
- ⚠ **Os cinco sinais de descarte** — e o último (CVE já corrigido) é **mudança de objetivo**, não fim.
- ⚠ **A ficha de triagem exige `RAZÃO`** — "vale" sem critério é palpite.

---

## O que o próximo módulo entrega

Você escolheu o alvo. O módulo 2 abre **o contrato**: o código do `IOCTL`, o método de buffer e **onde a validação falta** — a tese do curso inteiro.
