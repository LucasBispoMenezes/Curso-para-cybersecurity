# Módulo 3 — Assinatura, Comportamento, Anomalia

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Conhecer as **três famílias** de detecção — e o que cada uma explora.
2. Saber **quando** cada família funciona, e quando é a escolha errada.
3. Escrever as três, para o mesmo ataque — e **compará-las**.
4. Reconhecer o **custo de manutenção** de cada família.
5. Escolher a família **com critério**, não por preferência.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Toda detecção é uma hipótese sobre o que o ataque **parece**.** **E as três famílias fazem
> hipóteses sobre coisas diferentes** — **a forma, a sequência, e a distribuição.**

⚠ **E a razão de a escolha importar:** **cada família falha de um jeito diferente.** **A assinatura
falha na evasão; o comportamento, na variação legítima; a anomalia, no volume de alertas.**

⚠ **A tese:**

> **A família certa depende do ataque, não da preferência do analista.** **E "usar as três" não é
> resposta** — **porque cada uma custa.**

⚠ **A tabela das três, e o que cada uma pergunta:**

| Família | A pergunta | ⚠ Falha quando |
|---|---|---|
| **Assinatura** | "Isto casa com o padrão?" | ⚠ **O atacante muda a forma** |
| **Comportamento** | "Isto faz o que não deveria?" | ⚠ **O legítimo também faz** |
| **Anomalia** | "Isto é diferente do normal?" | ⚠ **O normal varia** |

⚠ **A linha da assinatura é a do módulo 4 do curso anterior.** **E ela falha por um motivo
estrutural:** **a assinatura compara a forma **normalizada**, e o backend processa **outra**.**

---

## 3.1 Assinatura

⚠ **A família mais usada, a mais rápida de escrever — e a que envelhece mais rápido.**

| Característica | Valor |
|---|---|
| O que ela compara | ⚠ **A forma** — bytes, regex, sequência |
| Velocidade de escrita | ⚠ **Minutos** |
| **Taxa de FP** | ⚠ Baixa, se bem escrita |
| ⚠ **Taxa de FN** | ⚠⚠ **Alta sob evasão** |
| Manutenção | ⚠⚠ **Constante** |

⚠ **A tabela do que a assinatura **pega** e do que ela **deixa passar**, para o mesmo ataque:**

| Forma do payload | A assinatura pega? |
|---|---|
| `<script>` | ✓ Sim |
| `%3Cscript%3E` | ⚠ Se normalizar |
| ⚠ `%253Cscript%253E` | ⚠⚠ **Não, se normalizar uma vez** |
| `<scr<script>ipt>` | ⚠ **Não — o aninhamento** |
| `<SCRIPT>` | ⚠ Se não ignorar case |

⚠ **A segunda e a terceira linhas são a lição do módulo 10 do HTTP Smuggling.** **A assinatura está
**certa**; a **normalização** é que discorda.**

⚠ **E a quarta linha é a evasão clássica:** **o aninhamento** — **o atacante insere o delimitador
dentro de si mesmo** — **e depois da remoção da parte "perigosa", o payload se remonta.** **É a
mecânica mais antiga e mais eficaz da evasão.**

⚠ **A regra escrita:**

> **A assinatura descreve o que o atacante **mandou na última vez**.** **E o atacante muda uma
> coisa.** **É por isso que ela envelhece: ela é um retrato, e o alvo se move.**

```bash
mkdir -p ~/detect-lab/mod03 && cd ~/detect-lab/mod03

echo "═══ 1. assinatura ═══"
echo
cat > assinatura.md <<'EOF'
# A família por ASSINATURA

| Característica | Valor |
|---|---|
| o que compara | ⚠ a FORMA (bytes, regex, sequência) |
| velocidade de escrita | ⚠ minutos |
| taxa de FP | baixa, se bem escrita |
| ⚠ taxa de FN | ⚠⚠ ALTA sob evasão |
| manutenção | ⚠⚠ constante |

## O que ela pega × o que ela deixa passar
| forma do payload | pega? |
|---|---|
| `<script>` | ✓ sim |
| `%3Cscript%3E` | ⚠ se normalizar |
| ⚠ `%253Cscript%253E` | ⚠⚠ NÃO, se normalizar uma vez |
| `<scr<script>ipt>` | ⚠ NÃO — o ANINHAMENTO |
| `<SCRIPT>` | ⚠ se não ignorar case |

## ⚠ a lição do módulo 10 anterior
a assinatura está CERTA.
a NORMALIZAÇÃO é que discorda.
✓ e nenhuma assinatura corrige isso.

## ⚠ o aninhamento — a evasão mais antiga e mais eficaz
o atacante insere o delimitador DENTRO DE SI MESMO.
e depois da remoção da parte "perigosa",
o payload se REMONTA.

## ⚠ A REGRA
a assinatura descreve o que o atacante mandou NA ÚLTIMA VEZ.
e ele muda UMA coisa.
✓ ela envelhece: é um retrato, e o alvo se move.
EOF

cat assinatura.md
```

⚠ **A tabela da evasão por assinatura é o instrumento.** **E a linha do aninhamento é a mais
elegante** — **porque explora a própria remoção que a defesa faz.**

⚠ **E a nota do case é humilhante e real:** **uma assinatura sem `(?i)` deixa `<SCRIPT>` passar** —
**e é o bypass mais trivial que existe.**

**Produza `assinatura.md`:**

| Forma | Pega? |
|---|---|
| `%253C...` | |
| `<scr<script>ipt>` | |
| `<SCRIPT>` | |

**Responda:**

1. **Por que a segunda linha da tabela é a lição do curso anterior?
2. **Como o aninhamento funciona?** Por que é tão eficaz?
3. **Por que a assinatura envelhece?
4. **Onde a assinatura é a escolha certa?** (Dica: o ataque estável.)

---

## 3.2 Comportamento

⚠ **A família que pergunta **o que o sistema faz** — e não como ele foi pedido.**

| Característica | Valor |
|---|---|
| O que ela compara | ⚠ **A ação** — não a forma |
| Velocidade de escrita | Média |
| **Taxa de FP** | ⚠ **Média — o legítimo também age** |
| ⚠ **Taxa de FN** | ✓ **Baixa sob evasão** |
| Manutenção | ✓ Baixa |

⚠ **A vantagem estrutural é direta:** **a evasão muda a **forma**; ela não muda a **ação**.** **Um
payload ofuscado que consegue executar **executa** — **e isso é observável independentemente de
como foi codificado.**

⚠ **A tabela dos exemplos, por ataque:**

| Ataque | A **forma** | A **ação** |
|---|---|---|
| Smuggling | ⚠ `TE` + `CL` | ⚠ **Duas requisições numa** |
| Web shell | `/shell.php?cmd=` | ⚠ **Um processo filho do servidor** |
| SSRF | `?url=http://169.254...` | ⚠ **Uma conexão de saída** |
| Path traversal | `../../etc/passwd` | ⚠ **Uma leitura fora do webroot** |

⚠ **A linha do web shell é a mais forte de todas.** **A forma varia infinitamente — `cmd`, `exec`,
`system`, base64, eval.** **Mas a **ação** é sempre a mesma:** **o servidor web gera um processo
filho.** **E isso se observa no SO, não no payload.**

⚠ **E é por isso que a telemetria de endpoint vale o custo** (módulo 2): **ela vê a ação, e não a
forma.**

⚠ **Mas há o custo, e ele é o FP.** **Um servidor legítimo **também** gera processos filhos** —
**um CGI, um cron, um hook.** **A detecção por comportamento exige modelar o que é normal naquele
host** — **e é aí que ela fica difícil.**

⚠ **A regra escrita:**

> **A forma muda; a ação não.** **É a vantagem estrutural da família.** **E o preço é que o
> legítimo também age.**

```bash
cd ~/detect-lab/mod03

echo "═══ 2. comportamento ═══"
echo
cat > comportamento.md <<'EOF'
# A família por COMPORTAMENTO

| Característica | Valor |
|---|---|
| o que compara | ⚠ a AÇÃO — não a forma |
| velocidade de escrita | média |
| taxa de FP | ⚠ média — o legítimo também age |
| ⚠ taxa de FN | ✓ BAIXA sob evasão |
| manutenção | ✓ baixa |

## ⚠ a vantagem ESTRUTURAL
a evasão muda a FORMA.
ela NÃO MUDA A AÇÃO.
✓ um payload ofuscado que executa EXECUTA —
   e isso é observável independentemente de como foi codificado.

## Exemplos, por ataque
| Ataque | A FORMA | A AÇÃO |
|---|---|---|
| smuggling | TE + CL | ⚠ DUAS requisições numa |
| web shell | /shell.php?cmd= | ⚠ um PROCESSO FILHO |
| SSRF | ?url=http://169.254 | ⚠ uma conexão de SAÍDA |
| path traversal | ../../etc/passwd | ⚠ uma LEITURA fora do webroot |

## ⚠ a linha mais forte de todas
o WEB SHELL.
a forma varia infinitamente: cmd, exec, system, base64, eval.
mas a AÇÃO é sempre a mesma:
   ⚠ o servidor web gera um PROCESSO FILHO.
✓ e isso se observa no SO — não no payload.

## ⚠ e o custo
um servidor LEGÍTIMO também gera processos filhos.
a detecção exige modelar o que é normal NAQUELE host.

## ⚠ A REGRA
a forma muda; a ação não.
✓ é a vantagem estrutural da família.
⚠ e o preço é que o legítimo também age.
EOF

cat comportamento.md
```

⚠ **A tabela forma × ação é o instrumento.** **E a linha do web shell é a mais forte** — **porque a
ação é invariante mesmo com ofuscação total.**

⚠ **E o custo é honesto:** **modelar o normal por host é trabalho** — **e é onde o FP aparece.**

**Produza `comportamento.md`:**

| Ataque | A forma | A ação |
|---|---|---|
| Smuggling | | |
| Web shell | | |

**Responda:**

1. **Por que a ação é invariante** sob evasão?
2. **Por que o web shell é o exemplo mais forte?
3. **Onde o FP aparece** nesta família?
4. **Quando ela é a escolha certa?

---

## 3.3 Anomalia

⚠ **A família que não descreve o ataque — descreve o **normal**.**

| Característica | Valor |
|---|---|
| O que ela compara | ⚠ **A distribuição** |
| Velocidade de escrita | Lenta |
| **Taxa de FP** | ⚠⚠ **Alta** |
| ⚠ **Taxa de FN** | ✓ **Baixa** |
| Manutenção | ⚠ **Constante — o normal muda** |

⚠ **A vantagem é a mesma do comportamento, amplificada:** **ela não precisa saber como o ataque é.**
**Ela precisa saber como o **tráfego normal** é** — **e avisa quando deixa de ser.**

⚠ **E é por isso que ela é a única que pega o que ninguém previu.** **Um ataque novo não tem
assinatura** — **mas ele muda a distribuição.**

⚠ **A tabela dos sinais de anomalia:**

| Sinal | O que mede | ⚠ Onde aparece |
|---|---|---|
| Volume de um recurso | Requisições/hora | ⚠ **Pico** |
| Tamanho de resposta | Bytes | ⚠ **Desvio** |
| Cardinalidade | Valores distintos | ⚠ **Enumeração** |
| ⚠ **Hora do dia** | Padrão temporal | ⚠ Fora do horário |
| Origem | ⚠ IP, ASN, país | ⚠ Novo |
| ⚠ **Sequência** | Ordem das ações | ⚠ **Fluxo impossível** |

⚠ **A linha da cardinalidade é a mais elegante.** **Um atacante enumerando IDs gera uma
**variedade** de valores que o normal não gera** — **e o volume total pode ser idêntico.** **É a
anomalia que o volume não pega.**

⚠ **E a linha da sequência é a mais poderosa e a mais difícil.** **Uma ordem de ações que não
existe no normal** — **login → listar → **exportar tudo** → logout** — **é anômala mesmo que cada
ação isolada seja comum.**

⚠ **Mas o problema é o volume de alertas.** **Tráfego normal é intrinsecamente variável** — **e um
modelo que não o captura produz alerta em tudo.** **É a razão de a taxa de FP desta família ser
alta** — **e de ela exigir o módulo 6 antes de ser útil.**

⚠ **A regra escrita:**

> **A anomalia não descreve o ataque; descreve o normal.** **E é a única que pega o que ninguém
> previu.** **O preço é que o normal muda — e o modelo tem que mudar com ele.**

```bash
cd ~/detect-lab/mod03

echo "═══ 3. anomalia ═══"
echo
cat > anomalia.md <<'EOF'
# A família por ANOMALIA

| Característica | Valor |
|---|---|
| o que compara | ⚠ a DISTRIBUIÇÃO |
| velocidade de escrita | lenta |
| taxa de FP | ⚠⚠ ALTA |
| ⚠ taxa de FN | ✓ baixa |
| manutenção | ⚠ CONSTANTE — o normal muda |

## Os sinais
| Sinal | O que mede | Onde aparece |
|---|---|---|
| volume de um recurso | req/hora | ⚠ pico |
| tamanho de resposta | bytes | ⚠ desvio |
| ⚠ CARDINALIDADE | valores distintos | ⚠ ENUMERAÇÃO |
| hora do dia | padrão temporal | fora do horário |
| origem | IP, ASN, país | novo |
| ⚠ SEQUÊNCIA | ordem das ações | ⚠ fluxo impossível |

## ⚠ a linha mais elegante
a CARDINALIDADE.
um atacante enumerando IDs gera uma VARIEDADE de valores
que o normal não gera —
⚠ e o volume total pode ser IDÊNTICO.
✓ é a anomalia que o VOLUME não pega.

## ⚠ a linha mais poderosa e mais difícil
a SEQUÊNCIA.
uma ordem de ações que não existe no normal —
login → listar → EXPORTAR TUDO → logout —
é anômala MESMO que cada ação isolada seja comum.

## ⚠ o problema
tráfego normal é intrinsecamente VARIÁVEL.
um modelo que não o captura produz alerta em TUDO.
✓ é a razão da taxa de FP alta —
   e de ela exigir o módulo 6 antes de ser útil.

## ⚠ A REGRA
a anomalia não descreve o ataque; descreve o NORMAL.
✓ é a única que pega o que NINGUÉM PREVIU.
⚠ e o normal muda — o modelo tem que mudar com ele.
EOF

cat anomalia.md
```

⚠ **Os sinais de anomalia são o instrumento.** **E a cardinalidade é o mais elegante** — **porque
pega o que o volume não pega.**

⚠ **E a nota do volume de alertas é a razão do módulo 6:** **anomalia sem orçamento de FP é um
gerador de ruído.**

**Produza `anomalia.md`:**

| Sinal | O que mede |
|---|---|
| Cardinalidade | |
| Sequência | |
| Volume | |

**Responda:**

1. **Por que a anomalia pega o que ninguém previu?
2. **Por que a cardinalidade é elegante?
3. **O que a sequência pega que a ação isolada não?
4. **Por que a taxa de FP é alta?

---

## 3.4 As três, no mesmo ataque

⚠ **O exercício central do módulo: **escrever as três para um ataque, e comparar.**

| | Assinatura | Comportamento | Anomalia |
|---|---|---|---|
| **O que descreve** | A forma | A ação | A distribuição |
| **Escrita** | Minutos | Horas | Dias |
| **FP (estimado)** | Baixo | Médio | ⚠ Alto |
| **FN sob evasão** | ⚠⚠ Alto | ✓ Baixo | ✓ Baixo |
| **Sobrevive ao patch?** | ⚠ Não | ✓ Sim | ✓ Sim |
| **Manutenção** | ⚠⚠ Alta | ✓ Baixa | ⚠ Alta |

⚠ **A linha "sobrevive ao patch" é a que decide a longo prazo.** **Uma assinatura apodrece no dia em
que o atacante muda um byte.** **A ação, não.**

⚠ **E a tabela do que escrever, para o **mesmo** ataque (um smuggling CL.TE):**

| Família | A regra, em uma frase |
|---|---|
| **Assinatura** | ⚠ "A requisição tem `TE` e `CL` juntos" |
| **Comportamento** | ⚠ "O backend recebeu **duas** requisições onde o frontend contou **uma**" |
| **Anomalia** | ⚠ "O número de requisições por conexão fugiu do normal" |

⚠ **A segunda linha é a mais forte, e a mais difícil de escrever.** **"Duas onde o frontend contou
uma"** exige **correlacionar dois logs** — **e exige que os dois existam** (módulo 2).

⚠ **E a terceira é a mais genérica e a mais ruidosa.** **O número de requisições por conexão varia
naturalmente** — **e o modelo tem que capturar isso.**

⚠ **A regra escrita:**

> **A assinatura é o retrato; o comportamento é o invariante; a anomalia é o alarme.** **Você
> escreve a assinatura primeiro porque é rápido** — **e não porque seja suficiente.**

```bash
cd ~/detect-lab/mod03

echo "═══ 4. as três, no mesmo ataque ═══"
echo
cat > tres-familias.md <<'EOF'
# As três, no mesmo ataque

## Comparação
| | assinatura | comportamento | anomalia |
|---|---|---|---|
| o que descreve | a FORMA | a AÇÃO | a DISTRIBUIÇÃO |
| escrita | minutos | horas | dias |
| FP (estimado) | baixo | médio | ⚠ alto |
| FN sob evasão | ⚠⚠ alto | ✓ baixo | ✓ baixo |
| ⚠ sobrevive ao patch? | ⚠ NÃO | ✓ SIM | ✓ SIM |
| manutenção | ⚠⚠ alta | ✓ baixa | ⚠ alta |

## Para o MESMO ataque (CL.TE)
| Família | A regra, em uma frase |
|---|---|
| assinatura | "a requisição tem TE e CL juntos" |
| ⚠ comportamento | "o backend recebeu DUAS onde o frontend contou UMA" |
| anomalia | "o número de requisições por conexão fugiu do normal" |

## ⚠ a linha "sobrevive ao patch"
uma assinatura apodrece no dia em que o atacante muda UM BYTE.
a AÇÃO, não.
✓ é o que decide a LONGO PRAZO.

## ⚠ e a segunda regra é a mais forte
"duas onde o frontend contou uma" exige CORRELACIONAR DOIS LOGS —
e exige que os dois EXISTAM (módulo 2).

## ⚠ A REGRA
a assinatura é o RETRATO.
o comportamento é o INVARIANTE.
a anomalia é o ALARME.
✓ você escreve a assinatura primeiro porque é RÁPIDO —
   não porque seja SUFICIENTE.
EOF

cat tres-familias.md
```

⚠ **A tabela comparativa é o entregável do módulo.** **E a linha "sobrevive ao patch" é a que
justifica as outras duas famílias** — **mesmo custando mais.**

⚠ **E a regra do "primeiro porque é rápido" é honesta:** **a assinatura não é errada** — **ela é
**insuficiente**, e você a escreve por economia.**

**Produza `tres-familias.md`:**

| | Assinatura | Comportamento | Anomalia |
|---|---|---|---|
| FP | | | |
| FN sob evasão | | | |
| Sobrevive ao patch? | | | |

**Responda:**

1. **Qual sobrevive ao patch?** Por que a assinatura não?
2. **Qual é a mais forte para o smuggling?** Por que é difícil de escrever?
3. **Por que você escreve a assinatura primeiro?
4. **Qual exige o módulo 6 antes de ser útil?

---

## 3.5 LAB — As três, medidas

**Duração:** 150 min

### Passo 1 — Escreva as três (50 min)

⚠ **Para o **mesmo** ataque do módulo 1. E cada uma em um arquivo.**

```bash
cd ~/detect-lab/mod03

echo "═══ ESCREVENDO AS TRÊS ═══"
echo
cat <<'EXPL'
  ── O ATAQUE É O DO MÓDULO 1 ──
     (o que você escolheu: CL.TE, CL.CL, ou o espaço no header)

  ── E VOCÊ ESCREVE TRÊS REGRAS ──

     1. ASSINATURA
        · regex sobre o log
        · ⚠ a mais rápida de escrever

     2. COMPORTAMENTO
        · correlaciona DOIS logs (frontend × backend)
        · ⚠ a mais forte, e a mais difícil

     3. ANOMALIA
        · mede a distribuição das requisições por conexão
        · ⚠ a mais ruidosa
EXPL

mkdir -p ~/detect-lab/regras

cat > ~/detect-lab/regras/assinatura.yml <<'EOF'
# REGRA 1 — ASSINATURA
# ⚠ descreve a FORMA do ataque
id: assinatura-tecl-001
titulo: TE e CL na mesma requisição
family: assinatura
ttp: T1190

deteccao:
  fonte: access log ou log do backend
  logica: |
    transfer-encoding presente
    E content-length presente
  regex: '(?i)^transfer-encoding:.*\n(?:.*\n)*?^content-length:|(?i)^content-length:.*\n(?:.*\n)*?^transfer-encoding:'

⚠ limitacoes:
  - "não pega CL.CL"
  - "não pega TE.TE ofuscado"
  - "⚠ NÃO PEGA se a normalização alterar a forma"
EOF

cat > ~/detect-lab/regras/comportamento.yml <<'EOF'
# REGRA 2 — COMPORTAMENTO
# ⚠ descreve a AÇÃO — correlaciona dois logs
id: comportamento-desync-001
titulo: o backend viu mais requisições que o frontend
family: comportamento
ttp: T1190

deteccao:
  fonte: DOIS logs (frontend e backend)
  logica: |
    para cada janela de N segundos:
      n_backend = requisições no log do backend
      n_frontend = requisições no log do frontend
      ⚠ se n_backend > n_frontend: ALERTA
  janela: 10s

⚠ vantagem:
  - "não depende da forma do payload"
  - "sobrevive à evasão"

⚠ limitacoes:
  - "⚠ exige que os DOIS logs existam"
  - "⚠ exige correlacionar por tempo"
  - "pode ter FP se os relógios divergirem"
EOF

cat > ~/detect-lab/regras/anomalia.yml <<'EOF'
# REGRA 3 — ANOMALIA
# ⚠ descreve a DISTRIBUIÇÃO
id: anomalia-req-por-conexao-001
titulo: requisições por conexão fora do normal
family: anomalia
ttp: T1190

deteccao:
  fonte: log do backend
  logica: |
    medir a DISTRIBUIÇÃO do número de requisições por conexão
    em tráfego LEGÍTIMO
    ⚠ alertar quando fugir do intervalo observado
  metodo: "percentil 99 do tráfego legítimo"

⚠ limitacoes:
  - "⚠ o normal VARIA — o intervalo precisa ser reestimado"
  - "⚠ alta taxa de FP sem tráfego legítimo suficiente"
  - "não distingue o ataque de um cliente automatizado legítimo"
EOF

echo "  ── as três escritas ──"
ls -1 ~/detect-lab/regras/*.yml | sed 's/^/     /'
echo
echo "  ⚠ e note que cada arquivo DECLARA as limitações."
echo "     é o módulo 9 do curso de Pesquisa."
```

⚠ **As três regras, no mesmo arquivo, mostram a diferença.** **E cada uma **declara as
limitações**** — **porque uma regra sem limitação declarada promete demais.**

⚠ **E a nota da janela na regra 2 é o que exige o módulo 2:** **correlacionar dois logs exige que os
dois existam** — **e é a razão do inventário.**

**Produza `tres-regras.md`:**

| Regra | Família | O que descreve | Limitação |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. **As três foram escritas?** Qual foi a mais rápida?
2. **A regra 2 exige o quê?** Isso existe no seu lab?
3. **Cada regra declara limitações?
4. **Qual você acha que vai ter mais FP?

### Passo 2 — Meça as três (60 min)

⚠ **O mesmo ataque, as três regras, e a taxa de cada uma.**

```bash
cd ~/detect-lab/mod03

echo "═══ MEDINDO AS TRÊS ═══"
echo
cat > mede-tres.py <<'PY'
#!/usr/bin/env python3
"""
mede-tres.py — roda o ataque e mede as TRÊS famílias.

⚠ DIDÁTICO e LOCAL. lê os SEUS logs.
"""
import sys, os, re, subprocess, time
from collections import Counter

BACKEND = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/smuggle-lab/evidencia/backend-cl.log")

# ─── regra 1: ASSINATURA ───
RX_ASSINATURA = re.compile(
    r"(?i)transfer-encoding:.*\n(?:.*\n)*?content-length:|"
    r"(?i)content-length:.*\n(?:.*\n)*?transfer-encoding:", re.M)

# ─── regra 2: COMPORTAMENTO (proxy) ───
# ⚠ mede o que o backend VIU, por janela
RX_EVENTO = re.compile(r"═══ requisição #(\d+)")


def le(caminho):
    try:
        return open(caminho, errors="replace").read()
    except FileNotFoundError:
        return ""


def eventos(txt):
    return [e.strip() for e in txt.split("═══ requisição") if e.strip()]


def assinatura(txt) -> int:
    return len(RX_ASSINATURA.findall(txt))


def comportamento(txt) -> int:
    """
    ⚠ o comportamento: requisições que o backend processou
    e que NÃO têm a forma de uma requisição legítima isolada.
    heurística: eventos cujo PATH contém o marca do atacante
    """
    n = 0
    for ev in eventos(txt):
        m = re.search(r"PATH: (\S+)", ev)
        if m and re.search(r"[A-Z]{2,}\d{4,}|V[0-9a-f]{6}", m.group(1)):
            n += 1
    return n


def anomalia(txt) -> int:
    """a cardinalidade dos paths — valores distintos"""
    paths = re.findall(r"PATH: (\S+)", txt)
    if not paths:
        return 0
    c = Counter(paths)
    # ⚠ paths que aparecem UMA vez e têm forma estranha
    return sum(1 for p, n in c.items() if n == 1 and len(p) > 12)


def mede(nome, antes, depois, fn):
    a = fn(antes)
    b = fn(depois)
    return nome, a, b, (b - a)


def main():
    print("═══ AS TRÊS FAMÍLIAS, MEDIDAS ═══")
    print()
    print(f"  backend: {BACKEND}")
    print()

    antes = le(BACKEND)
    n_antes = len(eventos(antes))

    print("  ── rode o ataque AGORA e pressione ENTER ──")
    print("     (em outro terminal:)")
    print("     python3 ~/smuggle-lab/mod09/varre.py 8081")
    input()

    time.sleep(1)
    depois = le(BACKEND)
    n_depois = len(eventos(depois))

    print(f"  eventos: {n_antes} → {n_depois}  (⚠ delta {n_depois - n_antes})")
    print()

    resultados = [
        mede("1. ASSINATURA", antes, depois, assinatura),
        mede("2. COMPORTAMENTO", antes, depois, comportamento),
        mede("3. ANOMALIA", antes, depois, anomalia),
    ]

    print(f"  {'família':<20} {'antes':<8} {'depois':<8} {'⚠ disparou':<12}")
    print("  " + "-"*52)
    for nome, a, b, d in resultados:
        marca = "⚠ SIM" if d > 0 else "não"
        print(f"  {nome:<20} {a:<8} {b:<8} {marca:<12}")

    print()
    print("  ═══ O VEREDITO ═══")
    pegaram = [n for n, _, _, d in resultados if d > 0]
    print(f"  famílias que pegaram o ataque: {len(pegaram)} de 3")
    for n in pegaram:
        print(f"     ✓ {n}")
    print()
    print("  ⚠ e isto é a TAXA DE DETECÇÃO — provisória.")
    print("     ⚠ falta o FALSO POSITIVO: rode tráfego LEGÍTIMO e conte de novo.")
    print()
    print("  ⚠ tudo local. nenhum serviço de terceiro.")


if __name__ == "__main__":
    main()
PY

chmod +x mede-tres.py
echo "  ── pronto ──"
echo "     python3 ~/detect-lab/mod03/mede-tres.py ~/smuggle-lab/evidencia/backend-cl.log"
```

⚠ **O medidor roda as três sobre o mesmo delta de log.** **E ele mede o **delta** — o que cada
família acusou **por causa do ataque**.

⚠ **E a nota final é o que falta:** **a taxa de detecção é provisória até você rodar tráfego
legítimo** — **que é o módulo 6.**

**Produza `tres-medidas.md`:**

| Família | Disparou? | Quantos |
|---|---|---|
| Assinatura | | |
| Comportamento | | |
| Anomalia | | |

**Responda:**

1. **Quantas famílias pegaram o ataque?
2. **Qual deu o sinal mais claro?
3. **Alguma deu falso positivo?** Como você sabe?
4. **O que falta para a taxa ser real?

### Passo 3 — Compare e decida (40 min)

⚠ **A comparação, e a decisão sobre qual usar.**

```bash
cd ~/detect-lab/mod03

echo "═══ COMPARANDO E DECIDINDO ═══"
echo
cat > caderno/PD-003.md <<'EOF'
# PD-003 — as três famílias

**Data:** ____

## 1. O ataque
| Item | Valor |
|---|---|
| variante | |
| do módulo 1 | |

## 2. As três regras
| # | Família | O que descreve | Arquivo |
|---|---|---|---|
| 1 | assinatura | | regras/assinatura.yml |
| 2 | comportamento | | regras/comportamento.yml |
| 3 | anomalia | | regras/anomalia.yml |

## 3. A medição
| Família | Antes | Depois | ⚠ Disparou? |
|---|---|---|---|
| assinatura | | | |
| comportamento | | | |
| anomalia | | | |

## 4. ⚠ A comparação
| | assinatura | comportamento | anomalia |
|---|---|---|---|
| pegou? | | | |
| FP estimado | | | |
| exige o quê | | | |
| sobrevive à evasão? | | | |

## 5. A decisão
| Item | Valor |
|---|---|
| a que eu VOU usar | |
| por quê | |
| ⚠ a que eu vou MANTER como secundária | |
| a que eu DESCARTO | |

## 6. As limitações declaradas
| Regra | Limitação |
|---|---|
| | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não testei contra sensor de terceiro
- [ ] não rodei tráfego de outro sistema
- [ ] não publiquei nada

## 8. O que NÃO foi verificado
⚠ mínimo 3
EOF

cat caderno/PD-003.md | head -30
```

⚠ **A decisão é o entregável.** **E ela exige justificar **por que** uma família é a primária** —
**não escolher por preferência.**

⚠ **E a coluna "a que eu vou manter como secundária" é realista:** **você mantém a assinatura
mesmo escolhendo o comportamento** — **porque ela é barata e pega o caso trivial.**

**Produza `decisao.md`:**

| Item | Valor |
|---|---|
| Primária | |
| Secundária | |
| Descartada | |
| Por quê | |

**Responda:**

1. **Qual família você escolheu como primária?** Por quê?
2. **Qual você mantém como secundária?
3. **Qual descartou?** Por quê?
4. **O que não foi verificado?**

### Critérios de aceitação

- `assinatura.md` com a tabela **forma × pega**.
- Você explicou **por que `%253C` não é pego**.
- Você explicou **como o aninhamento funciona** e por que é eficaz.
- Você explicou **por que a assinatura envelhece**.
- `comportamento.md` com a tabela **forma × ação**.
- Você explicou **por que a ação é invariante** sob evasão.
- Você explicou **por que o web shell é o exemplo mais forte**.
- Você explicou **onde o FP aparece** nesta família.
- `anomalia.md` com os **seis** sinais.
- Você explicou **por que a cardinalidade é elegante**.
- Você explicou **o que a sequência pega** que a ação isolada não.
- Você explicou **por que a taxa de FP é alta**.
- `tres-familias.md` com a comparação e a linha **"sobrevive ao patch"**.
- **As três regras escritas**, uma por arquivo.
- Cada regra **declara as limitações**.
- Você explicou **o que a regra 2 exige** (dois logs).
- **As três medidas** sobre o mesmo ataque.
- Você explicou **por que a taxa é provisória**.
- `caderno/PD-003.md` com as **oito** seções.
- `decisao.md` com a família **primária, secundária e descartada**, e o porquê.
- ⚠ **Nenhum sensor de terceiro.**

---

## Avaliação

1. **Cite as três famílias** e a pergunta de cada uma.
2. **Quando a assinatura falha?** Por que é estrutural?
3. **O que `%253C` demonstra?
4. **Como o aninhamento funciona?** Por que é eficaz?
5. **Por que a assinatura envelhece?
6. **O que o comportamento compara?
7. **Por que a ação é invariante** sob evasão?
8. **Por que o web shell é o exemplo mais forte?
9. **Onde o FP aparece** no comportamento?
10. **O que a anomalia descreve?** Por que pega o imprevisto?
11. **Cite quatro sinais de anomalia.**
12. **Por que a cardinalidade é elegante?
13. **O que a sequência pega?
14. **Por que a taxa de FP da anomalia é alta?
15. **Qual família sobrevive ao patch?** Por quê?
16. **Qual é a mais forte para o smuggling?
17. **Por que a regra de comportamento é difícil de escrever?
18. **Por que você escreve a assinatura primeiro?
19. **Qual exige o módulo 6 antes de ser útil?
20. **Por que cada regra deve declarar limitações?

---

**Próximo:** [Módulo 4 — A normalização e o elo fraco](modulo-04.md)
