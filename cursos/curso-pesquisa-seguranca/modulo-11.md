# Módulo 11 — Escrever o Achado

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 10

---

## Objetivos

1. Escrever o achado em **três formatos**: nota técnica, advisory e relatório.
2. Estruturar com **hipótese, evidência, impacto e o que sobrou**.
3. Reconhecer os **quatro vícios** de escrita que destroem credibilidade.
4. Reportar ao mantenedor **no formato que ele espera**.
5. Distinguir o que a evidência **sustenta** do que você **inferiu**.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Achado que não é comunicado não é achado.** E comunicar mal **destrói o valor do achado** —
> **mesmo quando o bug é real.**

⚠ **E o erro é sempre o mesmo, em formas diferentes:**

| Vício | O que faz | Consequência |
|---|---|---|
| **Inflar** | "vulnerabilidade crítica" sem evidência | ⚠ **Perde credibilidade** |
| **Vago** | "o parser é inseguro" | ⚠ Não é acionável |
| **Onisciente** | apresenta inferência como fato | ⚠ **Erro verificável** |
| **Longo** | 20 páginas sem estrutura | ⚠ **Ninguém lê** |

⚠ **A tese:** **o relatório bom é CURTO, ESTRUTURADO, e diz o que NÃO sabe.** **A seção de
limitações é o que dá credibilidade ao resto** — **porque ela prova que você não está inflando.**

⚠ **E é o mesmo princípio dos outros cursos:** **o "não verificado" do curso de Linux, o "não
coberto" do curso de Enumeração, o "o que não resolve" do curso de Exploit.** **Declarar o limite é
o que torna o resto confiável.**

---

## 11.1 Os três formatos

⚠ **O mesmo achado, três audiências, três formatos.**

| Formato | Audiência | Tamanho | Foco |
|---|---|---|---|
| **Nota técnica** | Você, e quem vai continuar | ⚠ **Livre** | Método e o que sobrou |
| **Advisory** | Mantenedor, usuários | ⚠ **1 página** | O que, onde, e como corrigir |
| **Relatório de pesquisa** | Comunidade, cliente | 5–15 páginas | Método, resultado, limitação |

⚠ **A diferença entre eles não é tamanho — é o que cada um OMITE de propósito.**

| O formato | Omite | Por quê |
|---|---|---|
| Nota técnica | Nada | É o registro completo |
| Advisory | ⚠ **O caminho de exploração** | Por que segurança |
| Relatório | ⚠ **Detalhe operacional** | Audiência ampla |

⚠ **A linha do advisory é uma escolha de segurança.** **Você descreve o bug e a correção** — **e
não ensina a explorar.** **A razão é o tempo:** **enquanto a correção não está aplicada, o caminho
detalhado é uma arma.**

⚠ **E é o que o material do `TORCH` faz explicitamente:** **"This guide does not provide steps to
transform a diff into a working exploit."** **A escolha é deliberada** — **e é a postura padrão da
área.**

```bash
mkdir -p ~/pesquisa-lab/mod11 && cd ~/pesquisa-lab/mod11

echo "═══ 1. os três formatos ═══"
echo
cat <<'EXPL'
  ┌──────────────────┬──────────────┬─────────┬──────────────────────────┐
  │ FORMATO          │ AUDIÊNCIA     │ TAMANHO │ OMITE DE PROPÓSITO        │
  ├──────────────────┼──────────────┼─────────┼──────────────────────────┤
  │ nota técnica     │ você         │ livre   │ nada                     │
  │                  │ e quem segue │         │ é o registro COMPLETO     │
  ├──────────────────┼──────────────┼─────────┼──────────────────────────┤
  │ advisory         │ mantenedor   │ 1 pág   │ ⚠ o caminho de exploração │
  │                  │ e usuários   │         │ (segurança)              │
  ├──────────────────┼──────────────┼─────────┼──────────────────────────┤
  │ relatório        │ comunidade   │ 5–15    │ ⚠ detalhe operacional      │
  │ de pesquisa      │ ou cliente   │ páginas │ (audiência ampla)        │
  └──────────────────┴──────────────┴─────────┴──────────────────────────┘

  ⚠ a escolha de omitir o caminho NÃO é censura.
     é o padrão da área: enquanto a correção não foi aplicada,
     o caminho detalhado é uma arma nas mãos de quem ainda não corrigiu.

  ✓ e note: o TORCH diz isso explicitamente —
     "This guide does not provide steps to transform a diff
      into a working exploit."
EXPL

echo
echo "═══ 2. os quatro vícios ═══"
echo
cat <<'EXPL'
  ┌───────────────────────────────────────────────────────────────────┐
  │ VÍCIO 1: INFLAR                                                     │
  ├───────────────────────────────────────────────────────────────────┤
  │ ✗ "vulnerabilidade crítica permite comprometimento total"          │
  │ ✓ "a validação está ausente; o impacto depende de X, que eu        │
  │    não determinei"                                                 │
  │ ⚠ consequência: o mantenedor testa, não consegue reproduzir o      │
  │    impacto alegado, e DESCARTA o relatório inteiro                 │
  └───────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ VÍCIO 2: VAGO                                                       │
  ├───────────────────────────────────────────────────────────────────┤
  │ ✗ "o parser é inseguro"                                            │
  │ ✓ "em parser.c:142, `len` não é comparado com `sizeof(dst)`"       │
  │ ⚠ consequência: não é acionável — ninguém sabe ONDE olhar          │
  └───────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ VÍCIO 3: ONISCIENTE                                                 │
  ├───────────────────────────────────────────────────────────────────┤
  │ ✗ "isto é explorável remotamente"                                  │
  │ ✓ "a validação está ausente; NÃO verifiquei se o caminho é         │
  │    alcançável remotamente"                                         │
  │ ⚠ consequência: uma inferência apresentada como fato é um ERRO      │
  │    verificável — e derruba o resto do relatório                    │
  └───────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ VÍCIO 4: LONGO SEM ESTRUTURA                                        │
  ├───────────────────────────────────────────────────────────────────┤
  │ ✗ 20 páginas narrando o processo em ordem cronológica              │
  │ ✓ 1 página com o essencial na frente, e o método como apêndice      │
  │ ⚠ consequência: NINGUÉM LÊ — e o achado morre no volume            │
  └───────────────────────────────────────────────────────────────────┘
EXPL
```

⚠ **O vício 3 é o mais perigoso, e o mais sutil.** **Inflação é fácil de detectar** — **o
mantenedor tenta reproduzir e não consegue.** **Mas uma inferência apresentada como fato é um
ERRO** — **e erros verificáveis derrubam a confiança no relatório inteiro.** **"Não sei se é
alcançável" é mais forte que "é remotamente explorável"** — **porque a primeira é verdadeira.**

⚠ **E a linha do `parser.c:142` é o que torna o relatório acionável.** **O mantenedor abre o
arquivo e vê.** **Sem isso, ele procura** — **e frequentemente desiste.**

**Produza `vicio.md`:**

| Vício | Sintoma | Correção |
|---|---|---|
| Inflar | | |
| Vago | | |
| Onisciente | | |
| Longo | | |

**Responda:**

1. **Qual vício derruba a confiança inteira?** Por quê?
2. **Qual é o mais fácil de detectar** do lado do mantenedor?
3. **Como corrigir o vício 3?** Escreva a forma correta.
4. **Por que "não sei" é mais forte** que uma afirmação não verificada?

---

## 11.2 A estrutura do achado

⚠ **Quatro partes, e a ordem importa: o essencial primeiro.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. O QUE É (2–3 frases)                                              │
│    componente, versão, o invariante violado, e o tipo                │
│    ⚠ quem lê isso decide se continua lendo                            │
├──────────────────────────────────────────────────────────────────────┤
│ 2. A EVIDÊNCIA                                                       │
│    arquivo:linha, o código literal, o commit, a data                 │
│    ⚠ comando e saída, se houver teste                                 │
├──────────────────────────────────────────────────────────────────────┤
│ 3. O IMPACTO — E O QUE EU NÃO SEI                                    │
│    o que a ausência permite                                          │
│    ⚠ E o que eu NÃO determinei                                        │
├──────────────────────────────────────────────────────────────────────┤
│ 4. A CORREÇÃO SUGERIDA                                               │
│    o que fecharia a porta                                            │
│    ✓ e por que isso corrige (não só "adicione um if")                │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A ordem é deliberada, e é o contrário do que a maioria escreve.** **Quem escreve narra o
processo:** **"primeiro eu li o patch, depois abstraí o padrão, depois procurei..."** **E o
mantenedor lê duas páginas e sai.**

⚠ **A estrutura certa põe o essencial na frente** — **e o método vira apêndice, ou nota técnica
separada.** **É o mesmo princípio do paper:** **abstract e contribuições no começo** — **e o método
depois.**

⚠ **E a parte 3 merece a explicação.** **Impacto E o que você não sabe** — **na mesma seção.**
**Isso não enfraquece o achado; fortalece.** **Porque mostra que você separou o que verificou do que
inferiu** — **e é exatamente o que o mantenedor precisa saber para triar.**

⚠ **A tabela do que entra em cada parte:**

| Parte | Entra | ⚠ Não entra |
|---|---|---|
| 1 — o que é | componente, versão, invariante, tipo | ⚠ Sua jornada |
| 2 — evidência | código, commit, data, comando | ⚠ Adjetivo |
| 3 — impacto | o que a ausência permite + o que não sabe | ⚠ Superlativo |
| 4 — correção | o que fecharia + por quê | ⚠ "melhore a validação" |

⚠ **A linha do "não entra adjetivo" é a mais violada.** **"Código claramente vulnerável",
"falha grave", "obviamente explorável"** — **todo adjetivo é uma afirmação sem evidência.** **O
código e o commit falam por si.**

```bash
cd ~/pesquisa-lab/mod11

echo "═══ 3. o template do achado ═══"
echo
cat > template-achado.md <<'EOF'
# [Componente] — [o invariante violado], versão [X]

## 1. Resumo
[2 a 3 frases. componente, versão, o invariante, e o tipo de falha.]

## 2. Evidência
| Item | Valor |
|---|---|
| Projeto | |
| Versão | |
| Commit | |
| Arquivo:linha | |
| Data | |

```
[o código literal em volta]
```

[se houve leitura comparada:]
```
[o trecho do outro ponto, que TEM a validação]
```

## 3. O invariante
[o que DEVE valer, e o código não garante]

## 4. Impacto — e o que eu NÃO determinei
| Item | Valor |
|---|---|
| O que a ausência permite | |
| ⚠ O que eu NÃO verifiquei | |
| ⚠ O que depende do ambiente | |

## 5. Correção sugerida
```
[o que fecharia a porta]
```

**Por que isso corrige:**
[⚠ o mecanismo, não só "adicione um if"]

## 6. O que eu não afirmo
⚠ obrigatório:
- não executei nada
- não confirmei a alcançabilidade em runtime
- não sei se outra camada valida
- não classifiquei a severidade

## 7. Como reportar
| Item | Valor |
|---|---|
| Canal | |
| Estado | |
| Prazo | |
EOF

cat template-achado.md

echo
echo "═══ 4. antes e depois ═══"
echo
cat <<'EXPL'
  ── ANTES (os quatro vícios juntos) ──
     "Encontrei uma vulnerabilidade crítica no parser. Após uma análise
      profunda do código, abstraindo o padrão do patch recente, percebi
      que a validação de tamanho está ausente, o que permite
      comprometimento total do sistema remotamente. Recomendo corrigir
      urgentemente."

     ⚠ VÍCIO 1: "crítica", "comprometimento total"
     ⚠ VÍCIO 2: qual arquivo? qual linha? qual versão?
     ⚠ VÍCIO 3: "remotamente" — você VERIFICOU?
     ⚠ VÍCIO 4: dois parágrafos de jornada

  ── DEPOIS ──
     "Em parser.c:142 (v1.2.3, commit a1b2c3d), o comprimento `len` é
      usado em `memcpy` sem ser comparado com `sizeof(dst)`.

      ```
      memcpy(dst, buf, len);        /* sem verificação */
      ```

      O mesmo projeto valida em parser.c:88 (`if (len > sizeof(dst)) return -1;`),
      então o invariante é conhecido.

      O que eu NÃO verifiquei: se o caminho é alcançável com entrada
      externa, e se o chamador valida. A leitura sugere que não, mas
      isto exige confirmação no ambiente do projeto.

      Correção: `if (len > sizeof(dst)) return -ERR;` antes da cópia.
      Isso corrige porque fecha o único ponto onde `len` é usado sem
      faixa."

     ✓ 6 frases. arquivo:linha. commit. data. o contraste interno.
     ✓ o limite declarado. a correção E o porquê.
EXPL
```

⚠ **O contraste é o instrumento.** **O "antes" tem quatro vícios e nenhuma informação
verificável.** **O "depois" tem seis frases, e o mantenedor consegue ir direto ao ponto.**

⚠ **E note o "contraste interno":** **"o mesmo projeto valida em `parser.c:88`".** **Isso é
poderosíssimo** — **porque prova que o invariante é conhecido pelo projeto**, e **que o ponto
corrigido foi esquecido.** **É a variante do módulo 7, em forma de evidência.**

**Produza `antes-depois.md`:**

| Vício | No "antes" | No "depois" |
|---|---|---|
| Inflar | | |
| Vago | | |
| Onisciente | | |
| Longo | | |

**Responda:**

1. **O que o "depois" tem que o "antes" não tem?** Cite cinco.
2. **O que é o "contraste interno"?** Por que é forte?
3. **Qual frase do "depois" declara o limite?**
4. **Por que a correção explica o mecanismo?**

---

## 11.3 Reportar ao mantenedor

⚠ **O formato que o mantenedor espera. E ele é diferente do seu relatório.**

| O que ele precisa | Por quê |
|---|---|
| **Versão afetada** | Para saber se é o branch dele |
| **Passo para reproduzir** — ou a evidência de leitura | ⚠ **Ele vai tentar** |
| **O ponto exato** | Arquivo:linha |
| **O impacto realista** | Para triar |
| **A correção sugerida** | ⚠ Ajuda, mas **não é sua decisão** |

⚠ **A última linha merece a nota.** **Sugerir a correção é útil** — **mas não é sua decisão.**
**O mantenedor conhece o contexto** (compatibilidade, API pública, o resto do sistema). **Você
sugere e ele decide.**

⚠ **E o canal importa. A ordem de preferência:**

| # | Canal | Quando |
|---|---|---|
| 1 | **`/.well-known/security.txt`** | Se existir — é o declarado |
| 2 | `SECURITY.md` no repositório | Muito comum |
| 3 | GitHub Security Advisory (privado) | Padrão em projeto aberto |
| 4 | `security@` do domínio | Quando os outros não existem |
| 5 | ⚠ **Issue pública** | ⚠ **Nunca** — expõe antes da correção |

⚠ **A linha 5 é a mais importante.** **Abrir issue pública com o bug expõe todos os usuários** —
**antes de haver correção.** **É divulgação irresponsável** — **e frequentemente viola o termo do
projeto.**

⚠ **E a linha 1 fecha com o curso de Enumeração.** **O `security.txt` é o canal declarado** — **e
o módulo 4 daquele curso ensinou a procurá-lo.** **Lá era enumeração; aqui é reporte.**

⚠ **A tabela do que fazer depois de reportar:**

| Situação | O que fazer |
|---|---|
| Ele respondeu e corrigiu | ✓ Crédito, e o CVE se aplicável |
| Ele respondeu e discordou | ⚠ **Aceite** — ele conhece o contexto |
| Ele não respondeu em 90 dias | ⚠ Divulgação coordenada — avise antes |
| Ele pediu mais detalhe | ✓ Forneça o que tem — **sem cruzar a linha** |
| ⚠ Ele pediu PoC funcional | ⚠ **Não envie.** Descreva o suficiente |

⚠ **A linha 5 é a mais delicada.** **O mantenedor pode pedir um PoC** — **e é razoável que peça.**
**Mas você não envia PoC funcional.** **Você descreve o caminho o suficiente** — **e ele confirma no
ambiente dele, onde tem autoridade.**

⚠ **E a linha 2 merece a nota mais dura.** **Se ele discordar, ele provavelmente está certo** —
**porque ele conhece o sistema.** **Aceite, registre, e siga.** **Insistir num achado que o
mantenedor refutou é o mesmo custo afundado do módulo 9.**

```bash
cd ~/pesquisa-lab/mod11

echo "═══ 5. o reporte ao mantenedor ═══"
echo
cat <<'EXPL'
  ── a ordem dos canais ──
     1. /.well-known/security.txt   ← o declarado
     2. SECURITY.md no repositório
     3. GitHub Security Advisory (privado)
     4. security@ do domínio
     5. ⚠ issue pública → NUNCA

  ⚠ o canal 5 expõe TODOS os usuários antes da correção existir.

  ── o template do reporte ──
     assunto: [componente] validação ausente de comprimento em parser.c

     versão afetada : v1.2.3 (e provavelmente anteriores)
     commit          : a1b2c3d
     ponto           : parser.c:142

     [evidência — o código literal]

     o mesmo repositório valida em parser.c:88, então o invariante é
     conhecido.

     NÃO verifiquei: alcançabilidade com entrada externa.
     A confirmação exige o ambiente de vocês.

     sugestão: comparar `len` com `sizeof(dst)` antes da cópia.

  ── o que esperar ──
     · resposta e correção       → ✓ crédito
     · resposta discordando      → ⚠ ACEITE. ele conhece o contexto
     · silêncio em 90 dias       → ⚠ divulgação coordenada, avisando antes
     · pedido de PoC funcional   → ⚠ NÃO. descreva o suficiente.
EXPL
```

⚠ **O template do reporte é o instrumento.** **Note que ele tem uma linha de "NÃO verifiquei"** —
**e ela é o que faz o reporte ser levado a sério.** **O mantenedor sabe que você é honesto sobre o
escopo do que fez.**

⚠ **E a linha do "ele conhece o contexto" é a mais importante a internalizar.** **O mantenedor
pode discordar porque:**
- **O caminho não é alcançável** — e ele sabe da arquitetura.
- **Outra camada valida** — e ele conhece o sistema.
- **A mudança quebraria a API pública** — e ele tem os usuários.

**Produza `reporte.md`:**

| Item | Valor |
|---|---|
| Canal | |
| Versão afetada | |
| Ponto | |
| O que NÃO verifiquei | |

**Responda:**

1. **Qual a ordem dos canais?** Por que a issue pública é a última?
2. **O que você NÃO envia** mesmo se pedido?
3. **O que fazer se ele discordar?** Por quê?
4. **Por que a linha "não verifiquei"** fortalece o reporte?

---

## 11.4 LAB — Escreva os três formatos

**Duração:** 120 min

### Passo 1 — A nota técnica (35 min)

⚠ **O registro completo. **Aqui não há omissão** — é o seu material.**

```bash
cd ~/pesquisa-lab/mod11

cat > caderno/11-nota-tecnica.md <<'EOF'
# Nota técnica — [título]

## 1. Identificação
| Campo | Valor |
|---|---|
| Data | |
| Alvo / versão / commit | |
| Autorização | |
| ID no caderno | |

## 2. O que eu li (fonte da pergunta)
| Fonte | Referência |
|---|---|
| patch / CVE / paper | |
| o padrão abstraído | |

## 3. O método (⚠ completo)
1. abstraí o padrão do [fonte]
2. apliquei os três níveis de leitura
3. busquei o irmão nos níveis [1..5]
4. verifiquei os cinco falsos positivos
5. confirmei por leitura / código próprio / alvo autorizado

## 4. A evidência
```
[comando literal]

[saída literal]
```

[o código em volta, arquivo:linha]

## 5. O invariante violado
[o que DEVE valer]

## 6. O resultado
| Item | Valor |
|---|---|
| Estado | confirmado / falsificado / inconclusivo |
| O que sustenta | |

## 7. O que eu NÃO verifiquei
⚠ mínimo 3:
- 
- 
- 

## 8. As cinco perguntas do módulo 1, respondidas
| # | Pergunta | Resposta |
|---|---|---|
| 1 | invariante | |
| 2 | quem confia | |
| 3 | suposição | |
| 4 | por que o patch corrige | |
| 5 | irmão existe | |
| 6 | como falsifiquei | |
| 7 | o que destrava | |

## 9. O que isso destrava
[o backlog]

## 10. Referências
[links]
EOF

echo "  ⚠ a nota técnica é o registro COMPLETO — não omite nada"
head -25 caderno/11-nota-tecnica.md
```

Produza `nota-tecnica.md`:

| Seção | Preenchida |
|---|---|
| Fonte da pergunta | |
| Método completo | |
| Evidência literal | |
| O que **não** verifiquei | |

**Responda:**

1. **A nota técnica omite algo?** Por quê não?
2. **Ela tem o comando literal** e a saída?
3. **Ela responde as sete perguntas?**
4. **Quantos itens tem na seção 7?**

### Passo 2 — O advisory (35 min)

⚠ **Uma página. A audiência é o mantenedor e os usuários.**

```bash
cd ~/pesquisa-lab/mod11

echo "═══ O ADVISORY — UMA PÁGINA ═══"
echo
cat <<'EXPL'
  ⚠ REGRA: uma página. se passar, corte.

  ── o que entra ──
     ✓ componente, versão, ponto exato
     ✓ o invariante violado, em uma frase
     ✓ a evidência (o trecho de código)
     ✓ o impacto REALISTA — e o que não foi verificado
     ✓ a correção sugerida, e por que corrige
     ✓ como reportar / onde está o canal

  ── o que NÃO entra ──
     ✗ o caminho de exploração (⚠ segurança)
     ✗ sua jornada de descoberta
     ✗ o método completo
     ✗ superlativo
     ✗ detalhe que exige o paper inteiro
EXPL

cat > advisory-achado.md <<'EOF'
# [Componente] — validação ausente de comprimento

**Versão afetada:** [X] (e provavelmente anteriores)
**Ponto:** [arquivo:linha]
**Commit verificado:** [hash]
**Data:** [data]

## Resumo
[2 frases: o que está ausente, e onde. SEM adjetivo.]

## Evidência
```
[o código literal em volta, com o arquivo:linha]
```

## O invariante
[o que DEVE valer, em uma frase]

## Impacto — e o que não foi verificado
[o que a ausência permite]
⚠ **Não verificado:** [o que depende do ambiente do projeto]

## Correção sugerida
```
[o trecho corrigido]
```
**Por que corrige:** [o mecanismo, em uma frase]

## Canal de reporte
[security.txt / SECURITY.md / advisory privado]
EOF

cat advisory-achado.md

echo
echo "  ⚠ conte as linhas. se passar de uma página, corte."
wc -l advisory-achado.md
```

Produza `advisory.md`:

| Item | Presente | Observação |
|---|---|---|
| Versão e ponto | | |
| Evidência | | |
| Invariante | | |
| Não verificado | | |
| Correção + por quê | | |
| **Caminho de exploração** | | ⚠ deve estar **ausente** |

**Responda:**

1. **O advisory cabe em uma página?**
2. **Ele omite o caminho de exploração?** Confirme.
3. **Ele declara o que não foi verificado?**
4. **Quantos adjetivos sobraram?** Corte-os.

### Passo 3 — O relatório de pesquisa (50 min)

⚠ **O formato mais longo, e o que exige **método e limitação** explícitos.**

```bash
cd ~/pesquisa-lab/mod11

cat > relatorio-pesquisa.md <<'EOF'
# [Título] — investigação e achado

**Data:** ____   **Autor:** ____
**Estado:** confirmado / falsificado / inconclusivo

---

## 1. Resumo
[3 a 5 frases. o que eu investiguei, o que achei, e o que não sei.]

## 2. Contexto
| Item | Valor |
|---|---|
| Alvo | |
| Versão / commit | |
| Região produtiva (módulo 2) | |
| Produtividade avaliada | |

## 3. Método
⚠ as sete perguntas (módulo 1):
| # | Pergunta | Resposta |
|---|---|---|
| 1 | invariante | |
| 2 | quem confia | |
| 3 | suposição | |
| 4 | por que o patch corrige | |
| 5 | irmão existe | |
| 6 | como falsifiquei | |
| 7 | o que destrava | |

⚠ os três níveis de leitura (módulo 3):
| Nível | Resultado |
|---|---|
| 1 — o que mudou | |
| 2 — por que corrige | |
| 3 — invariante | |

⚠ a busca (módulo 7):
| Nível | Usado? | Candidatos |
|---|---|---|
| 1 — termo | | |
| 2 — estrutural | | |
| 5 — diferencial | | |

## 4. Evidência
```
[comando literal + saída]
```

## 5. O achado
| Item | Valor |
|---|---|
| Invariante violado | |
| Onde | |
| Evidência | |
| 1-day ou 0-day | |
| Classificação | |

## 6. O que eu NÃO verifiquei
⚠ mínimo 3:
- 
- 
- 

## 7. O que sobrou
| # | Pergunta aberta | Prioridade |
|---|---|---|
| 1 | | |
| 2 | | |

## 8. Correção sugerida
[o que fecharia a porta, e por que]

## 9. Declaração de conduta
| Ação | Feita? |
|---|---|
| li código publicado | sim |
| reimplementei no meu lab | |
| testei instância de terceiro | ⚠ **não** |
| ampliei o escopo | ⚠ **não** |
| reportei ao mantenedor | |

## 10. Referências
[as fontes]
EOF

cat relatorio-pesquisa.md
echo
echo "  ⚠ a seção 9 é a mesma do módulo 10 — e ela fecha o relatório."
```

Produza `relatorio.md`:

| Seção | Preenchida | O que falta |
|---|---|---|
| Resumo | | |
| Método (as sete + níveis) | | |
| Evidência | | |
| O que não verifiquei | | |
| O que sobrou | | |
| Declaração | | |

**Responda:**

1. **O relatório tem o método explícito?**
2. **Ele declara o que não verificou?** Quantos itens?
3. **Ele lista o que sobrou?**
4. **A declaração de conduta está preenchida?**
5. **Os três formatos contam a mesma coisa?** O que muda entre eles?

### Critérios de aceitação

- `vicio.md` com os **quatro** vícios e a correção de cada.
- Você identificou **qual derruba a confiança inteira**.
- `antes-depois.md` com os quatro vícios marcados no "antes" e ausentes no "depois".
- Você explicou **o que é o "contraste interno"** e por que é forte.
- `nota-tecnica.md` com as **dez** seções — o registro **completo**.
- Você confirmou que a nota técnica **não omite** nada.
- `advisory.md` cabendo em **uma página**.
- Você **removeu o caminho de exploração** e explicou por quê.
- Você **cortou os adjetivos**.
- `reporte.md` com os **cinco** canais na ordem.
- Você explicou **por que a issue pública é a última**.
- Você explicou **o que fazer se o mantenedor discordar**.
- `relatorio.md` com as **dez** seções.
- Você listou **três** itens em "não verifiquei".
- Você listou **duas** perguntas em "o que sobrou".
- A **declaração de conduta** está preenchida.
- ⚠ **Nenhum teste contra terceiro** — e o relatório declara isso.

---

## Avaliação

1. **Por que achado não comunicado não é achado?**
2. **Cite os quatro vícios.**
3. **Qual vício derruba a confiança inteira?** Por quê?
4. **Por que uma inferência como fato é um erro verificável?**
5. **Cite os três formatos** e a audiência de cada.
6. **O que o advisory omite de propósito?** Por quê?
7. **Por que essa omissão não é censura?**
8. **Cite as quatro partes** do achado, e a ordem.
9. **Por que a ordem é o contrário** do que a maioria escreve?
10. **O que entra na parte 3?** Por que isso fortalece?
11. **O que NÃO entra na evidência?**
12. **O que é o "contraste interno"?** Por que é forte?
13. **Cite os cinco canais de reporte, na ordem.**
14. **Por que a issue pública é a última?**
15. **O que fazer se o mantenedor discordar?** Por quê?
16. **O que NÃO enviar** mesmo se pedido?
17. **Por que "não verifiquei" fortalece** o reporte?
18. **O que a nota técnica tem que os outros não têm?**
19. **O que o relatório de pesquisa acrescenta?**
20. **Por que a declaração de conduta fecha** o relatório?

---

**Próximo:** [Módulo 12 — Projeto: uma pesquisa completa](modulo-12.md)
