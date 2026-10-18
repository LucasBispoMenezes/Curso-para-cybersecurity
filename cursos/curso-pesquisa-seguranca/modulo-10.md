# Módulo 10 — Escopo e Ética na Pesquisa

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** Módulos 1 a 9

---

## ⚠ Este é o módulo que protege todo o resto

⚠ **A afirmação que organiza o módulo:**

> **Neste curso, você vai ser mais tentado a ampliar o escopo do que em qualquer outro.** Porque
> **um achado abre a pergunta seguinte** — e a pergunta seguinte **frequentemente aponta para outro
> sistema.**

⚠ **E é a tentação mais natural do mundo:**

| O que acontece | O que você pensa |
|---|---|
| Você lê o patch e abstrai o padrão | "será que tem no projeto B?" |
| O projeto B é de outro fornecedor | ⚠ "é só uma olhada" |
| O padrão realmente está lá | ⚠⚠ **"eu preciso confirmar"** |

⚠ **A terceira linha é a armadilha.** **"Preciso confirmar"** é a frase que transforma **pesquisa
de leitura** em **teste não autorizado.** **E o achado estar certo não muda nada.**

⚠ **A tese:**

> **Ler é sempre legítimo. Testar exige autorização.** E **a linha entre os dois não depende da sua
> intenção, nem da qualidade do achado.**

---

## 10.1 A linha, e ela é operacional

⚠ **A distinção, em atos concretos.**

| Ato | Legítimo? | Por quê |
|---|---|---|
| Ler o código publicado | ✓ **Sempre** | É material publicado |
| Ler o patch | ✓ Sempre | Idem |
| Ler o paper, o advisory | ✓ Sempre | Idem |
| Abrir issue / reportar | ✓ Sempre | É o canal previsto |
| Reimplementar o trecho no seu lab | ✓ **Sempre** | É código seu, no seu ambiente |
| Baixar e rodar o binário **que você compilou** | ✓ De fonte **sua** | Idem |
| Baixar o binário do fornecedor e rodá-lo | ✓ Se **sua** máquina, software publicado | Uso normal |
| ⚠ Testar a **instância em produção** do projeto | ⚠ **Só com autorização** | É sistema de outro |
| ⚠ Testar **outra empresa** por ter o mesmo padrão | ⚠ **Nunca sem contrato** | Fora do escopo |
| ⚠ Enviar PoC para o sistema de alguém | ⚠ **Nunca** | É ataque |

⚠ **A linha está entre "rodar software na minha máquina" e "tocar no sistema de outro".** E ela
**não é ambígua** — embora seja **tentador argumentar que é.**

⚠ **Os três argumentos que não funcionam:**

| Argumento | Por que não funciona |
|---|---|
| "É público, então todo mundo pode testar" | ⚠ **Serviço público ≠ serviço para você testar** |
| "Eu só quero confirmar, não vou causar dano" | ⚠ **A técnica não distingue intenção** |
| "O bug é real, e o fornecedor precisa saber" | ✓ **Reporte.** ⚠ Mas reportar ≠ testar |
| "Está no escopo de outro programa" | ⚠ **O escopo daquele programa é daquele programa** |
| "É só um GET, não muda nada" | ⚠ **Muitos ataques começam com um GET** |

⚠ **A terceira linha é a que mais convence a si mesma.** **"O fornecedor precisa saber"** é verdade
— **e o caminho é reportar, não testar.** **Você leu o código, você tem o padrão, e você tem uma
hipótese.** **A hipótese vira relatório** — **e o fornecedor confirma.**

⚠ **E a quinta linha merece a explicação.** **O `1dFuzz` reproduz bugs com um único request.** **O
padding oracle do curso de Cripto funciona com requests aparentemente inocentes.** **"É só um GET"**
não é critério — **é a descrição de quase todo ataque web.**

```bash
mkdir -p ~/pesquisa-lab/mod10 && cd ~/pesquisa-lab/mod10

echo "═══ 1. a linha, em atos ═══"
echo
cat > a-linha.md <<'EOF'
# A linha

## Legítimo sem autorização
| Ato | Por quê |
|---|---|
| ler código publicado | material publicado |
| ler patch / CVE / paper | idem |
| reportar o achado | canal previsto |
| reimplementar no meu lab | código meu, ambiente meu |
| rodar software publicado na MINHA máquina | uso normal |

## Exige autorização escrita
| Ato | Por quê |
|---|---|
| testar instância em produção | é sistema de outro |
| testar outra empresa pelo padrão | fora do escopo |
| enviar entrada de teste a serviço alheio | é ataque |
| usar credencial encontrada | ⚠ crime |
| ampliar o escopo "só um host" | ⚠ é fora do escopo |

## Os argumentos que NÃO funcionam
| Argumento | Por que não |
|---|---|
| "é público" | público ≠ autorizado |
| "só quero confirmar" | a técnica não distingue intenção |
| "o fornecedor precisa saber" | ✓ reporte — não teste |
| "é só um GET" | quase todo ataque começa com um |
EOF

cat a-linha.md

echo
echo "═══ 2. a tentação, e ela tem forma ═══"
echo
cat <<'EXPL'
  ── a sequência típica da tentação ──

     passo 1: "abstraí o padrão no projeto A"
     passo 2: "o projeto B implementa o mesmo — será que tem lá?"
     ⚠ passo 3: "vou só LER o projeto B"     ← ✓ LEGÍTIMO
     ⚠ passo 4: "achei o padrão no código do B!" ← ✓ LEGÍTIMO
     ⚠ passo 5: "preciso CONFIRMAR"           ← ⚠⚠ AQUI

  ── o que acontece no passo 5 ──
     · você testa a instância do projeto B
     · ou de um cliente do projeto B
     · ⚠ e isso é exatamente o mesmo ato que você denunciaria

  ── o que fazer em vez disso ──
     ✓ passo 5 correto: escrever o ACHADO e o REPORTAR
        · "li o código da versão X, e o trecho Y não valida Z"
        · ⚠ a evidência é a LEITURA, não o teste
        · e o fornecedor confirma no ambiente dele

  ⚠ o passo 4 é onde a pesquisa se completa.
     o passo 5 é onde ela vira outra coisa.
EXPL
```

⚠ **A sequência é o instrumento.** **Os passos 3 e 4 são legítimos** — **é o que o módulo 7 fez.**
**O passo 5 é a linha.** **E o passo 5 "correto" é o combinado dos módulos 11 e 12:** **escrever o
achado com a evidência da LEITURA.**

⚠ **E note que a evidência da leitura é suficiente.** **"Na versão X, commit Y, a função Z não
valida o campo W"** é **um achado completo.** **Você não precisa executar nada** — **e é isso que a
pesquisa de código tem de vantagem sobre o teste.**

**Produza `tentacao.md`:**

| Passo | Legítimo? | O que fazer |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| **5** | | |

**Responda:**

1. **Qual passo é a linha?** Por quê?
2. **O que fazer em vez do passo 5?**
3. **Por que a evidência da leitura basta?**
4. **Qual argumento você já usou consigo mesmo?** Seja honesto.

---

## 10.2 O achado é seu, o alvo não

⚠ **A distinção que resolve o caso difícil: você achou o bug. De quem é ele?**

| Situação | De quem é o bug | O que fazer |
|---|---|---|
| **No seu código** | Seu | Corrigir |
| **No código do seu cliente** | Do cliente | ⚠ Reportar ao cliente |
| **Em projeto aberto** | Do mantenedor | ⚠ **Reportar ao mantenedor** |
| **No sistema de terceiro** | Do terceiro | ⚠ **Reportar ao terceiro** |
| **Você não sabe de quem é** | ⚠ **Declarar incerteza** | Não atribuir |

⚠ **A linha 4 é a que a tentação ataca.** **Você achou o padrão no sistema de outra empresa** —
**e ele é dela.** **Você reporta, e não testa.** **É a mesma regra do curso de Enumeração:** **você
identifica o achado e para.**

⚠ **E a linha 5 é a mesma do módulo 7 do curso de Enumeração.** **Quando você não consegue atribuir
posse, você declara** — **e não atribui por proximidade.**

⚠ **A tabela de onde reportar, e o que esperar:**

| Destino | Canal | O que esperar |
|---|---|---|
| Mantenedor de projeto aberto | GitHub Security Advisory, `security@` | Coordenação, crédito |
| Fornecedor comercial | PSIRT, `security.txt` | SLA, às vezes bug bounty |
| Bug bounty | O programa, o escopo | ⚠ **Só o escopo declarado** |
| Cliente | O contrato, o contato técnico | Prazo contratado |
| ⚠ Sem canal claro | ⚠ **Divulgação coordenada** | Prazo razoável antes de publicar |

⚠ **A linha do `security.txt` fecha com o curso de Enumeração.** **`/.well-known/security.txt` é o
canal declarado** — **e é uma das fontes que o módulo 4 daquele curso ensinou a procurar.** **Aqui
ele tem a função oposta:** **não é para enumerar, é para reportar.**

⚠ **E a linha da divulgação coordenada merece o número.** **O padrão de mercado é 90 dias** — **e
o Project Zero adota esse prazo explicitamente.** **Publicar antes disso é divulgação
irresponsável** — **e frequentemente viola o termo do próprio programa.**

**Produza `achado-alvo.md`:**

| Situação | De quem é | O que fazer |
|---|---|---|
| Seu código | | |
| Cliente | | |
| Projeto aberto | | |
| Terceiro | | |
| Não sei | | |

**Responda:**

1. **Por que "reportar" e "testar" são atos diferentes?**
2. **Onde reportar** num projeto aberto?
3. **O que fazer quando não sabe de quem é?**
4. **Qual o prazo padrão** de divulgação coordenada?

---

## 10.3 Pesquisa de código versus teste

⚠ **A vantagem da pesquisa de leitura, e ela é grande.**

| | Pesquisa de leitura | Teste autorizado |
|---|---|---|
| **Exige autorização?** | ✓ **Não** — é material publicado | ⚠ **Sim, escrita** |
| **Alcance** | ⚠ **Todo projeto aberto** | Só o escopo |
| **Risco de dano** | ✓ Zero | ⚠ Existe |
| **Evidência** | Código, versão, commit | Comando e saída |
| **Força** | ⚠ **"Não valida na versão X"** | "Confirmado" |
| **Limite** | ⚠ Não prova alcançabilidade | ✓ Prova |

⚠ **A vantagem é o alcance.** **Você pode ler 40 implementações de um protocolo** — **e é isso que
o `HTTP Garden` fez, achando 100 bugs.** **Testar 40 sistemas exigiria autorização de 40 partes.**

⚠ **E a limitação é honesta:** **a leitura não prova que o caminho é alcançável** (módulo 7, falso
positivo 3). **Mas isso não é problema — é declaração.** **Você reporta e diz: "li, e a
alcançabilidade exige confirmação."**

⚠ **A regra escrita:**

> **A pesquisa de leitura cobre o que o teste autorizado não alcança. Ela não substitui o teste —
> ela identifica onde testar importa.**

⚠ **E é o que o módulo 6 já dizia:** **a observação por leitura é sempre disponível** — **e é o
fundamento do curso.** **O teste é confirmação, não descoberta.**

```bash
cd ~/pesquisa-lab/mod10

echo "═══ 3. leitura vs. teste ═══"
echo
cat <<'EXPL'
  ┌──────────────────────┬────────────────────┬────────────────────────┐
  │                      │ LEITURA            │ TESTE AUTORIZADO       │
  ├──────────────────────┼────────────────────┼────────────────────────┤
  │ autorização          │ ✓ não exige        │ ⚠ escrita              │
  │ alcance              │ ⚠ 40 projetos       │ o escopo               │
  │ risco                │ ✓ zero             │ ⚠ existe               │
  │ prova alcançável?    │ ⚠ não              │ ✓ sim                  │
  │ evidência            │ código + commit    │ comando + saída        │
  └──────────────────────┴────────────────────┴────────────────────────┘

  ⚠ a linha do "não prova alcançável" NÃO é fraqueza — é declaração.
     você reporta: "a validação está ausente na versão X.
     a alcançabilidade exige confirmação no ambiente do projeto."

  ✓ e o mantenedor confirma. é esse o fluxo.
EXPL

echo
echo "═══ 4. o relatório SEM teste ═══"
echo
cat > relatorio-sem-teste.md <<'EOF'
# Achado por leitura — relatório

## 1. O que eu li
| Item | Valor |
|---|---|
| Projeto | |
| Versão exata | |
| Commit | |
| Arquivo:linha | |
| Data da leitura | |

## 2. O que está ausente
[⚠ o trecho que NÃO existe, e deveria]

```
[o código em volta, literal]
```

## 3. O invariante que não é garantido
[o que DEVE valer, e o código não garante]

## 4. A comparação (se houver)
| Onde | Garante? | Fonte |
|---|---|---|
| neste ponto | não | este código |
| em outro ponto | sim | commit X |

## 5. O que eu NÃO posso afirmar
⚠ obrigatório:
- não executei nada
- não confirmei a alcançabilidade em runtime
- não sei se outra camada valida
- não classifiquei a severidade real

## 6. O que o mantenedor precisa confirmar
| # | Verificação | Por que |
|---|---|---|
| 1 | o caminho é alcançável? | |
| 2 | outra camada valida? | |

## 7. Como reportar
| Item | Valor |
|---|---|
| Canal | |
| Estado | ⚠ reportado / a reportar |
| Prazo de divulgação | |
EOF

cat relatorio-sem-teste.md
```

⚠ **O relatório sem teste é o entregável do módulo.** **E a seção 5 é a que dá credibilidade:**
**ela declara exatamente o que a leitura não prova.** **É o oposto do relatório inflado** — **e é
o que faz o mantenedor confiar.**

⚠ **E a seção 6 é o que você pede ao mantenedor.** **Duas perguntas objetivas** — **e ele responde
no ambiente dele, com autoridade que você não tem.**

**Produza `relatorio-leitura.md`:**

| Seção | Preenchida | Observação |
|---|---|---|
| O que li | | |
| O que está ausente | | |
| O invariante | | |
| O que NÃO afirmo | | |
| O que confirmar | | |

**Responda:**

1. **Por que o relatório sem teste é forte?**
2. **O que a seção 5 acrescenta?**
3. **O que você pede ao mantenedor?**
4. **Por que a leitura alcança o que o teste não alcança?**

---

## 10.4 LAB — Aplique o limite

**Duração:** 60 min

### Passo 1 — Revise o caderno pelo critério de escopo (25 min)

⚠ **Cada investigação do caderno: ela ficou na leitura, ou cruzou a linha?**

```bash
cd ~/pesquisa-lab/mod10

cat > audita-escopo.sh <<'SCRIPT'
#!/usr/bin/env bash
# audita-escopo.sh — verifica o escopo de cada investigação
set -uo pipefail
cd ~/pesquisa-lab/caderno || exit 2

echo "═══════════ AUDITORIA DE ESCOPO ═══════════"
echo

printf '  %-10s %-16s %-16s %s\n' "ID" "tipo de observação" "autorização" "cruzou?"
printf '  %-10s %-16s %-16s %s\n' "──" "─────────────────" "───────────" "───────"

for f in INV-*.md; do
    [ -f "$f" ] || continue
    id="${f%.md}"
    # procura o tipo de observação registrado
    obs=$(grep -iE 'tipo de observação|como obtenho' "$f" 2>/dev/null | head -1 | sed 's/.*: *//' | cut -c1-16)
    [ -z "$obs" ] && obs="?"

    # procura autorização
    aut=$(grep -iE 'autoriza' "$f" 2>/dev/null | head -1 | sed 's/.*: *//' | cut -c1-16)
    [ -z "$aut" ] && aut="⚠ não declarada"

    # decide
    case "$obs" in
        *leitura*) cruzou="✓ não" ;;
        *código*|*codigo*) cruzou="✓ não" ;;
        *alvo*|*autorizado*) cruzou="depende" ;;
        *terceiro*|*terceiro*) cruzou="⚠⚠ SIM" ;;
        *) cruzou="?" ;;
    esac

    printf '  %-10s %-16s %-16s %s\n' "$id" "$obs" "$aut" "$cruzou"
done

echo
echo "── VEREDICTO ──"
semaut=$(grep -l -i 'autoriza' INV-*.md 2>/dev/null | wc -l)
total=$(ls INV-*.md 2>/dev/null | wc -l)
echo "  fichas                    : $total"
echo "  com autorização declarada : $semaut"
echo
[ "$semaut" -lt "$total" ] && echo "  ⚠ há investigação sem declarar a base de autorização"
echo "  ⚠ lembre: leitura não exige. teste exige DOCUMENTO."
SCRIPT

chmod +x audita-escopo.sh
./audita-escopo.sh
```

Produza `auditoria-escopo.md`:

| ID | Tipo de observação | Autorização | Cruzou a linha? |
|---|---|---|---|
| | | | |

**Responda:**

1. **Alguma investigação usou teste** em vez de leitura?
2. **Qual tem autorização declarada?**
3. **Alguma está sem a base declarada?** Corrija.
4. **Se alguma cruzou**, o que fazer agora?

### Passo 2 — Escreva a declaração de conduta (20 min)

⚠ **O instrumento que fecha o curso — e o mesmo do curso de Enumeração.**

```bash
cd ~/pesquisa-lab/mod10

cat > declaracao-conduta.md <<'EOF'
# Declaração de conduta — pesquisa

## 1. O que eu fiz
| Ato | Sim/Não | Base |
|---|---|---|
| li código publicado | | material publicado |
| li patch / CVE / paper | | idem |
| reimplementei trecho no meu lab | | código próprio |
| rodei binário compilado por mim | | próprio |
| reportei ao mantenedor | | canal previsto |

## 2. O que eu NÃO fiz
- [ ] não testei instância em produção de terceiro
- [ ] não enviei entrada de teste a serviço alheio
- [ ] não usei credencial encontrada
- [ ] não ampliei o escopo autorizado
- [ ] não testei outra empresa por ter o mesmo padrão
- [ ] não publiquei achado sem coordenação

## 3. As investigações e o escopo
| ID | Tipo de observação | Autorização | Cruzou? |
|---|---|---|---|
| | | | |

## 4. O que eu reportei
| Achado | A quem | Data | Canal |
|---|---|---|---|
| | | | |

## 5. A linha, em uma frase
⚠ a regra que eu apliquei:

"________________________________________________"

## 6. Se eu tivesse cruzado
⚠ o que fazer: parar, não usar o dado, reportar o ocorrido.

## Assinatura
Analista: ______   Data: ______
EOF

cat declaracao-conduta.md
```

Produza `declaracao.md`:

| Seção | Preenchida |
|---|---|
| O que fiz | |
| O que **não** fiz | |
| Escopo por investigação | |
| A linha, em uma frase | |

**Responda:**

1. **Todas as caixas da seção 2 estão marcadas?**
2. **Escreva a linha em uma frase.**
3. **Alguma investigação exige revisão?**
4. **A declaração te defende?** Releia como estranho.

### Passo 3 — O caso difícil (15 min)

⚠ **O exercício que consolida: um cenário com resposta não óbvia.**

```bash
cd ~/pesquisa-lab/mod10

echo "═══ O CASO DIFÍCIL ═══"
echo
cat > caso-dificil.md <<'EOF'
# Caso difícil — decida e justifique

## O cenário
Você lê o patch do projeto A, abstrai o padrão, e encontra o MESMO padrão
no código do projeto B (também aberto). Você tem certeza de que é o mesmo bug.
O projeto B tem um `security.txt` com canal de reporte, e um bug bounty cujo
escopo cobre `*.projetob.com` — mas NÃO cobre a versão open source que você leu.

## As quatro perguntas

### 1. Você pode LER o projeto B?
[ ] sim  [ ] não
Por quê:

### 2. Você pode TESTAR o projeto B open source na SUA máquina?
[ ] sim  [ ] não
Por quê:

### 3. Você pode TESTAR a instância em produção?
[ ] sim  [ ] não
Por quê:

### 4. O escopo do bug bounty cobre o que você achou?
[ ] sim  [ ] não  [ ] não sei
O que fazer:

## A decisão
| Item | Sua resposta |
|---|---|
| O que eu faço com o achado | |
| Por qual canal | |
| O que a evidência é (leitura? teste?) | |
| O que eu peço ao mantenedor | |

## A justificativa em três frases
1.
2.
3.
EOF

cat caso-dificil.md
```

Produza `caso-dificil.md`:

| Pergunta | Sua resposta |
|---|---|
| Ler? | |
| Testar o open source na sua máquina? | |
| Testar produção? | |
| O escopo cobre? | |

**Responda:**

1. **A resposta 1 é sim** — e por quê?
2. **A resposta 3 é não** — e por quê?
3. **O escopo não cobre** — o que isso muda?
4. **Qual a evidência** que você leva?

⚠ **A resposta 4 é o ponto.** **O escopo do bug bounty cobre `*.projetob.com`** — **a instância em
produção.** **O código open source que você leu NÃO está no escopo.** **Mas você não precisa
testar:** **você lê, escreve o achado, e reporta pelo `security.txt`.** **A evidência é a
leitura** — **e a leitura está sempre disponível.**

### Critérios de aceitação

- `a-linha.md` com os atos **legítimos** e os que **exigem autorização**.
- Você identificou os **três argumentos que não funcionam**.
- `tentacao.md` com os **cinco passos** e a marcação do passo da linha.
- Você explicou **o que fazer em vez do passo 5**.
- Você reconheceu **um argumento que já usou** consigo mesmo.
- `achado-alvo.md` com as **cinco** situações de posse.
- Você explicou a diferença entre **reportar** e **testar**.
- `relatorio-leitura.md` com as **cinco** seções e a seção dos limites.
- Você explicou **por que o relatório sem teste é forte**.
- `audita-escopo.sh` rodado, com o tipo de observação de cada investigação.
- Você verificou **a base de autorização** de cada uma.
- `declaracao.md` com as **seis** seções.
- **Todas as caixas** da seção 2 marcadas.
- Você escreveu **a linha em uma frase**.
- `caso-dificil.md` com as **quatro** perguntas respondidas e justificadas.
- Você explicou **por que o escopo não cobre** o código que você leu — e por que isso **não**
  impede o achado.
- ⚠ **Nenhum teste contra sistema de terceiro** — em nenhuma das investigações.

---

## Avaliação

1. **Por que este curso te deixa mais tentado** que os outros a ampliar escopo?
2. **Qual passo da sequência é a linha?** Por quê?
3. **Cite três argumentos que não funcionam.**
4. **Por que "o fornecedor precisa saber" não justifica testar?**
5. **Por que "é só um GET" não é critério?**
6. **O que fazer em vez do passo 5?**
7. **Por que a evidência da leitura basta?**
8. **Cite as cinco situações de posse** de um achado.
9. **Diferencie reportar de testar.**
10. **Onde reportar** num projeto aberto?
11. **O que fazer quando não sabe de quem é o bug?**
12. **Qual o prazo padrão** de divulgação coordenada?
13. **Qual a vantagem da leitura** sobre o teste?
14. **Qual a limitação da leitura?** Por que ela não é fraqueza?
15. **O que a seção de limites** do relatório acrescenta?
16. **O que você pede ao mantenedor?** Por quê?
17. **Por que o escopo do bug bounty não cobre** o código open source?
18. **Isso impede o achado?** Justifique.
19. **O que fazer se você já cruzou a linha?**
20. **Escreva a linha em uma frase.**

---

**Próximo:** [Módulo 11 — Escrever o achado](modulo-11.md)
