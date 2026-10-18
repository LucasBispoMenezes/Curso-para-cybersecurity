# Módulo 2 — A Superfície de Detecção

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Entender o que é a **superfície de detecção** — e como modelá-la.
2. Reconhecer os **cinco pontos de observação** disponíveis.
3. Saber o que cada ponto **custa** — em volume, em latência e em privacidade.
4. **Inventariar** a telemetria do seu lab.
5. Escolher o ponto de observação — com critério.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Detecção é limitada pelo que você **pode ver**.** **E "pode ver" não é só técnico — é**
> **volume, latência, custo de armazenamento e, frequentemente, política.**

⚠ **E a razão de isso ser um módulo inteiro:** **a maioria dos times escreve a regra antes de
perguntar se o dado existe.** **E descobre depois que ele não existe** — **ou que existe só por 24
horas.**

⚠ **A tese:**

> **A superfície de detecção é o conjunto de pontos onde você tem dado.** **E a primeira pergunta de
> qualquer regra é: "o dado para esta regra existe, e por quanto tempo?".**

⚠ **A tabela dos cinco pontos, e o que cada um dá:**

| # | Ponto | O que vê | ⚠ Custo |
|---|---|---|---|
| 1 | **Rede** | Tudo que passa | ⚠⚠ **Volume** |
| 2 | **Access log** | Path, status, headers | ⚠ Baixo |
| 3 | **Log de aplicação** | O que executou | ⚠ Alto |
| 4 | **Auditoria do SO** | Syscalls, processos | ⚠⚠ **Volume** |
| 5 | ⚠ **Telemetria do endpoint** | O que o processo fez | ⚠⚠⚠ **Privacidade** |

⚠ **A linha 5 é a mais invasiva e a mais poderosa.** **EDR e telemetria de endpoint veem o que o
processo **fez**, não o que ele **pediu**.** **E é por isso que ela é a mais regulada.**

---

## 2.1 O que é a superfície

⚠ **A superfície é o conjunto de pontos onde há dado — e ela tem **três dimensões**.**

| Dimensão | A pergunta | ⚠ Se falha |
|---|---|---|
| **Existência** | O dado é gerado? | ⚠ **A regra é impossível** |
| **Retenção** | Por quanto tempo? | ⚠ A regra só funciona no presente |
| **Acesso** | Você pode consultá-lo? | ⚠ A regra existe e não roda |

⚠ **A terceira dimensão é a que mais surpreende.** **Um dado que existe, é retido, e está numa
ferramenta que o time de detecção não pode consultar** — **é, para efeito de detecção, um dado que
não existe.**

⚠ **E a tabela do que fazer com cada "não":**

| Falha | O que fazer |
|---|---|
| Não existe | ⚠ **Instrumentar — e isso é um projeto** |
| Existe, retenção curta | Ajustar, ou arquivar |
| Sem acesso | ⚠ **O problema é político, não técnico** |
| ⚠ **Existe, retido e acessível** | ✓ **A regra é viável** |

⚠ **A segunda linha é a mais comum e a mais subestimada.** **Uma regra que correlaciona dois eventos
com 7 dias de distância não funciona se a retenção é de 24 horas** — **e ninguém percebe até a
investigação falhar.**

⚠ **A regra escrita:**

> **Antes de escrever a regra, responda três perguntas:** **o dado é gerado?** **por quanto tempo
> fica?** **eu consigo consultá-lo?** **Se qualquer uma falha, a regra não existe** — **mesmo que
> esteja escrita.**

```bash
mkdir -p ~/detect-lab/mod02 && cd ~/detect-lab/mod02

echo "═══ 1. o que é a superfície ═══"
echo
cat > superficie.md <<'EOF'
# A superfície de detecção

## As três dimensões
| Dimensão | A pergunta | Se falha |
|---|---|---|
| EXISTÊNCIA | o dado é gerado? | ⚠ a regra é IMPOSSÍVEL |
| RETENÇÃO | por quanto tempo? | a regra só funciona no presente |
| ACESSO | eu posso consultá-lo? | a regra existe e NÃO RODA |

## O que fazer com cada "não"
| Falha | O que fazer |
|---|---|
| não existe | ⚠ INSTRUMENTAR — e é um projeto |
| retenção curta | ajustar, ou arquivar |
| sem acesso | ⚠ o problema é POLÍTICO |
| ⚠ existe, retido e acessível | ✓ a regra é VIÁVEL |

## ⚠ a linha subestimada
uma regra que correlaciona dois eventos com 7 DIAS
não funciona se a retenção é de 24 HORAS.
✓ e ninguém percebe até a INVESTIGAÇÃO falhar.

## ⚠ A REGRA
antes de escrever a regra, responda:
1. o dado é GERADO?
2. por quanto tempo FICA?
3. eu consigo CONSULTÁ-LO?
se qualquer uma falha, a regra NÃO EXISTE —
mesmo que esteja escrita.
EOF

cat superficie.md
```

⚠ **As três dimensões são o instrumento.** **E a do acesso é a que o time técnico esquece** —
**porque é organizacional.**

⚠ **E a nota dos 7 dias é o exemplo concreto:** **a retenção é invisível até você precisar
correlacionar.**

**Produza `superficie.md`:**

| Dimensão | A pergunta | Se falha |
|---|---|---|
| Existência | | |
| Retenção | | |
| Acesso | | |

**Responda:**

1. **Qual dimensão é a mais subestimada?** Por quê?
2. **O que uma retenção de 24h impede?
3. **Por que o acesso é um problema político?
4. **O que fazer se o dado não existe?

---

## 2.2 Os cinco pontos

⚠ **Os cinco pontos de observação, e o que cada um dá — com o custo.**

| Ponto | O que vê | Volume | Latência |
|---|---|---|---|
| **Rede** | Pacotes | ⚠⚠ Alto | Baixa |
| **Access log** | Requisições | ✓ Baixo | Baixa |
| **App log** | Decisões | Médio | Média |
| **SO / auditoria** | Syscalls | ⚠⚠ Alto | Média |
| ⚠ **Endpoint** | O processo | ⚠⚠⚠ Muito alto | Alta |

⚠ **A tabela do que cada ponto **não** vê:**

| Ponto | Não vê |
|---|---|
| **Rede** | ⚠ **O que aconteceu depois do TLS**, e o que o app decidiu |
| **Access log** | ⚠ **O corpo**, e o que o backend fez |
| Access log (frontend) | ⚠ **O que o backend viu** |
| **App log** | O que o SO fez |
| **SO** | ⚠ **O que o app decidiu antes** |
| **Endpoint** | ⚠ O que aconteceu em outro host |

⚠ **A linha 3 é a do curso anterior, e a mais importante aqui.** **O access log do **frontend** não
vê o que o **backend** viu** — **e é exatamente aí que o desync acontece.**

⚠ **E é a razão de a detecção de smuggling exigir instrumentar o backend** — **não o proxy.** **O
proxy registra o que ele entendeu; o desync está no que o outro entendeu.**

⚠ **A tabela do que cada ponto custa em **privacidade**:**

| Ponto | Contém dado pessoal? |
|---|---|
| Rede | ⚠ **Sim, se não for TLS** |
| Access log | ⚠ IP, path, às vezes query |
| App log | ⚠ **Pode conter o payload** |
| SO | Médio |
| ⚠ **Endpoint** | ⚠⚠ **Tudo** |

⚠ **A linha do app log é a que mais surpreende.** **Um log que registra o payload registra o que o
usuário mandou** — **e o payload pode conter dado pessoal de outra pessoa.**

⚠ **A regra escrita:**

> **Cada ponto vê uma coisa e cega em outra.** **E cada ponto tem um custo que não é só técnico.**
> **Escolher o ponto é escolher o que você aceita não ver.**

```bash
cd ~/detect-lab/mod02

echo "═══ 2. os cinco pontos ═══"
echo
cat > pontos.md <<'EOF'
# Os cinco pontos

| Ponto | O que vê | Volume | Latência | Dado pessoal? |
|---|---|---|---|---|
| REDE | pacotes | ⚠⚠ alto | baixa | ⚠ sim, se sem TLS |
| ACCESS LOG | requisições | ✓ baixo | baixa | ⚠ IP, path, query |
| APP LOG | decisões | médio | média | ⚠ pode ter o payload |
| SO / AUDITORIA | syscalls | ⚠⚠ alto | média | médio |
| ⚠ ENDPOINT | o processo | ⚠⚠⚠ muito alto | alta | ⚠⚠ TUDO |

## O que cada ponto NÃO vê
| Ponto | Não vê |
|---|---|
| rede | o que veio DEPOIS do TLS, e o que o app decidiu |
| access log | ⚠ O CORPO, e o que o backend fez |
| ⚠ access log do FRONTEND | ⚠ **O QUE O BACKEND VIU** |
| app log | o que o SO fez |
| SO | o que o app decidiu ANTES |
| endpoint | o que aconteceu em OUTRO host |

## ⚠ a linha do curso anterior
o access log do FRONTEND não vê o que o BACKEND viu.
e é EXATAMENTE aí que o desync acontece.
✓ por isso a detecção de smuggling exige instrumentar o BACKEND.

## ⚠ A REGRA
cada ponto vê uma coisa e CEGA em outra.
e escolher o ponto é escolher o que você aceita NÃO VER.
EOF

cat pontos.md
```

⚠ **A tabela do "não vê" é o instrumento.** **E a linha do access log do frontend é a que liga ao
curso anterior:** **o ponto cego tem o tamanho do diferencial de parsers.**

⚠ **E a coluna de privacidade é o custo que o time técnico não orça.** **Um log que registra o
payload registra dado de terceiros.**

**Produza `pontos.md`:**

| Ponto | O que não vê |
|---|---|
| Rede | |
| Access log (frontend) | |
| Endpoint | |

**Responda:**

1. **Qual ponto vê o desync?** Por que os outros não?
2. **Qual ponto é o mais invasivo?
3. **Por que o app log pode conter dado pessoal?
4. **O que cada ponto cega?

---

## 2.3 O inventário

⚠ **O instrumento do módulo: o inventário da telemetria.** **E ele é uma tabela que você preenche
com o que **existe**, não com o que você gostaria.**

| # | Fonte | Existe? | Retenção | Acessível? | ⚠ Vê o ataque? |
|---|---|---|---|---|---|
| 1 | Access log do frontend | | | | |
| 2 | Access log do backend | | | | |
| 3 | Log de aplicação | | | | |
| 4 | PCAP | | | | |
| 5 | Log do SO | | | | |

⚠ **A última coluna é a que responde à pergunta do módulo.** **E ela tem três respostas possíveis:**
**sim · não · não sei.** **E o "não sei" é o mais comum** — **e o mais perigoso, porque parece um
sim.**

⚠ **A tabela do que fazer com cada resposta:**

| Resposta | Ação |
|---|---|
| Sim | ⚠ **Escreva a regra** |
| Não | ⚠ **Instrumente, ou aceite a cegueira** |
| ⚠ **Não sei** | ⚠⚠ **Teste — com o atacante do lab** |

⚠ **A terceira linha é o que o lab resolve.** **Você não adivinha se o log vê o ataque: você
**roda** o ataque e **olha** o log.** **É a razão de o atacante ser pré-requisito.**

⚠ **E a tabela do que o inventário revela, tipicamente:**

| Fonte | Vê o smuggling? |
|---|---|
| Access log do frontend | ⚠ **Não** — ele conta 1 |
| ⚠ Access log do backend | ⚠⚠ **Sim** — ele vê o path estranho |
| PCAP | ✓ Sim, se sem TLS |
| ⚠ PCAP com TLS | ⚠ **Não, sem a chave** |

⚠ **A regra escrita:**

> **O inventário se preenche com teste, não com suposição.** **"Acho que este log vê" é a origem de
> metade das regras que não funcionam.**

```bash
cd ~/detect-lab/mod02

echo "═══ 3. o inventário ═══"
echo
cat > inventario.md <<'EOF'
# Inventário da telemetria

## As fontes
| # | Fonte | Existe? | Retenção | Acessível? | ⚠ Vê o ataque? |
|---|---|---|---|---|---|
| 1 | access log do frontend | | | | |
| 2 | access log do backend | | | | |
| 3 | log de aplicação | | | | |
| 4 | PCAP (sem TLS) | | | | |
| 5 | PCAP (com TLS) | | | | |
| 6 | log do SO | | | | |

## O que cada resposta significa
| Resposta | Ação |
|---|---|
| SIM | ⚠ escreva a regra |
| NÃO | ⚠ instrumente, ou aceite a cegueira |
| ⚠ NÃO SEI | ⚠⚠ TESTE — com o atacante do lab |

## ⚠ as três dimensões, por fonte
| Fonte | Existe? | Retém? | Acessível? |
|---|---|---|---|
| | | | |

## O veredito
| Item | Valor |
|---|---|
| fontes que veem o ataque | |
| fontes que NÃO veem | |
| ⚠ fontes que eu NÃO SEI | |

## ⚠ o que o inventário revelou
| Item | Valor |
|---|---|
| a fonte mais ÚTIL | |
| a que eu PRECISO instrumentar | |
| a que eu vou DESCARTAR | |
EOF

cat inventario.md

echo
echo "═══ 4. o teste do inventário ═══"
echo
cat <<'EXPL'
  ── PARA CADA FONTE, RESPONDA RODANDO ──

     1. marque o estado atual do log
     2. ⚠ rode o ataque do curso anterior
     3. marque de novo
     4. a diferença é a resposta

     ── E O QUE PROCURAR ──
        · o path que o atacante escolheu?
        · uma requisição a MAIS?
        · ⚠ o header que ninguém mandou?
        · a contagem mudou?

  ✓ e "a contagem mudou" é o mais fácil de medir.
     é o instrumento do módulo 5 do curso anterior.
EXPL
```

⚠ **O inventário se preenche com teste.** **E a coluna do "não sei" é o que o atacante resolve** —
**porque você roda o ataque e olha.**

⚠ **E a nota do PCAP com TLS é a lição do ponto de observação:** **o ponto mais caro em volume é
também o mais limitado** — **porque o TLS o cega.**

**Produza `inventario.md`:**

| Fonte | Existe? | Vê o ataque? |
|---|---|---|
| Access log do frontend | | |
| Access log do backend | | |
| PCAP | | |

**Responda:**

1. **Qual fonte vê o ataque?** Qual não?
2. **Quantas ficaram em "não sei"?** Como resolver?
3. **O que o TLS faz com a captura de rede?
4. **Qual fonte você precisa instrumentar?

---

## 2.4 LAB — O inventário

**Duração:** 120 min

### Passo 1 — Preencha o inventário (50 min)

⚠ **Com teste, não com suposição.**

```bash
cd ~/detect-lab/mod02

echo "═══ O INVENTÁRIO, PREENCHIDO PELO TESTE ═══"
echo
cat <<'EXPL'
  ── O PROCEDIMENTO ──

     1. confirme que o lab do curso anterior está no ar
        (~/smuggle-lab — frontend e backend)

     2. ⚠ escolha UMA fonte e marque o estado dela
        ex.: wc -l no log do backend

     3. rode o ataque:
        python3 ~/smuggle-lab/mod09/varre.py <porta>

     4. ⚠ marque de novo, e compare

     5. repita para cada fonte
EXPL

cat > mede-fonte.sh <<'SCRIPT'
#!/usr/bin/env bash
# mede-fonte.sh — marca o estado de uma fonte de telemetria
set -uo pipefail

FONTE="${1:?uso: mede-fonte.sh <arquivo-de-log>}"

if [ ! -f "$FONTE" ]; then
    echo "  ⚠ não existe: $FONTE"
    exit 1
fi

linhas=$(wc -l < "$FONTE" 2>/dev/null)
tam=$(stat -c %s "$FONTE" 2>/dev/null)
requisicoes=$(grep -c '═══ requisição' "$FONTE" 2>/dev/null || echo 0)
mod=$(stat -c %y "$FONTE" 2>/dev/null | cut -d. -f1)

printf '  arquivo    : %s\n' "$FONTE"
printf '  linhas     : %s\n' "$linhas"
printf '  tamanho    : %s B\n' "$tam"
printf '  ⚠ eventos  : %s\n' "$requisicoes"
printf '  modificado : %s\n' "$mod"
SCRIPT

chmod +x mede-fonte.sh

echo "  ── o marcador está pronto ──"
echo
echo "  ── e o teste completo de uma fonte ──"
cat <<'EXPL'
     ANTES:
       ~/detect-lab/mod02/mede-fonte.sh ~/smuggle-lab/evidencia/backend-cl.log

     RODE O ATAQUE:
       python3 ~/smuggle-lab/mod09/varre.py 8081

     DEPOIS:
       ~/detect-lab/mod02/mede-fonte.sh ~/smuggle-lab/evidencia/backend-cl.log

     ⚠ e a diferença na linha "eventos" é a resposta.
EXPL

cat > caderno/PD-002.md <<'EOF'
# PD-002 — o inventário

**Data:** ____

## 1. As fontes e o estado
| # | Fonte | Existe? | Retenção | Acessível? |
|---|---|---|---|---|
| 1 | access log do frontend | | | |
| 2 | access log do backend | | | |
| 3 | log de aplicação | | | |
| 4 | PCAP | | | |
| 5 | log do SO | | | |

## 2. O teste, fonte por fonte
| Fonte | Eventos ANTES | Eventos DEPOIS | ⚠ Mudou? |
|---|---|---|---|
| | | | |

## 3. A pergunta do módulo
| Fonte | Vê o ataque? | Como sei |
|---|---|---|
| | | |

## 4. As que ficaram em "não sei"
| Fonte | Por que não sei | Como descobrir |
|---|---|---|
| | | |

## 5. O veredito
| Item | Valor |
|---|---|
| a fonte MAIS útil | |
| a que eu PRECISO instrumentar | |
| a que eu DESCARTEI | |

## 6. As três dimensões (existência, retenção, acesso)
| Fonte | Existe | Retém | Acesso |
|---|---|---|---|
| | | | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não liguei captura em rede de terceiro
- [ ] não acessei log de outro sistema
- [ ] não testei fora de 127.0.0.1

## 8. O que NÃO foi verificado
EOF

echo "  ⚠ a ficha PD-002 criada"
```

**Produza `inventario-preenchido.md`:**

| Fonte | Vê o ataque? | Como você sabe |
|---|---|---|
| | | |

**Responda:**

1. **Quantas fontes você testou?** Quantas veem o ataque?
2. **Qual ficou em "não sei"?** Como resolver?
3. **O que o teste revelou** que a suposição não revelaria?
4. **Qual fonte você vai instrumentar?

### Passo 2 — Escolha o ponto e justifique (40 min)

⚠ **O ponto de observação é uma decisão, e ela se justifica.**

```bash
cd ~/detect-lab/mod02

echo "═══ ESCOLHENDO O PONTO ═══"
echo
cat > ponto-escolhido.md <<'EOF'
# O ponto de observação

## O ataque a detectar (do módulo 1)
| Item | Valor |
|---|---|
| a variante | |
| o rastro | |

## Os pontos candidatos
| # | Ponto | Vê o ataque? | Volume | Latência | Dado pessoal? |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |

## ⚠ O escolhido
| Item | Valor |
|---|---|
| Ponto | |
| Por que este | |
| ⚠ O que ele NÃO vê | |
| Retenção necessária | |
| Volume estimado | |

## A justificativa
| Dimensão | Situação |
|---|---|
| existe? | |
| retém? | |
| acessível? | |

## ⚠ O que eu aceito não ver
| Item | Consequência |
|---|---|
| | |
EOF

cat ponto-escolhido.md

echo "  ⚠ e a última seção é a mais importante:"
echo "     o que você ACEITA não ver é o que a regra vai deixar passar."
```

⚠ **A seção "o que eu aceito não ver" é o compromisso do módulo.** **Uma regra sem cegueira
declarada é uma regra que promete demais.**

⚠ **E a coluna do dado pessoal entra na justificativa** — **porque escolher o ponto não é só
técnico.**

**Produza `ponto-escolhido.md`:**

| Item | Valor |
|---|---|
| Ponto | |
| O que não vê | |
| O que aceito não ver | |

**Responda:**

1. **Qual ponto você escolheu?** Por quê?
2. **O que ele não vê?** E o que você aceita?
3. **Qual a retenção necessária?
4. **O ponto contém dado pessoal?** Como você lida com isso?

### Passo 3 — Documente (30 min)

Produza `relatorio-superficie.md`:

```markdown
# Relatório — a superfície de detecção

## 1. O ataque
| Item | Valor |
|---|---|
| variante | |
| rastro esperado | |

## 2. O inventário
| # | Fonte | Existe | Retém | Acesso | ⚠ Vê? |
|---|---|---|---|---|---|
| | | | | | |

## 3. O teste
| Fonte | ANTES | DEPOIS | Mudou? |
|---|---|---|---|
| | | | |

## 4. ⚠ O ponto escolhido
| Item | Valor |
|---|---|
| ponto | |
| por quê | |
| o que NÃO vê | |
| o que ACEITO não ver | |

## 5. As fontes descartadas
| Fonte | Por quê |
|---|---|
| | |

## 6. ⚠ O que eu NÃO fiz
- [ ] não liguei captura em rede alheia
- [ ] não acessei log de outro sistema
- [ ] não testei fora de 127.0.0.1
- [ ] não guardei dado pessoal de terceiros

## 7. O que NÃO foi verificado
⚠ mínimo 3

## 8. O que isso destrava
| # | Próxima regra | Prioridade |
|---|---|---|
```

**Produza `relatorio-superficie.md`:**

| Item | Valor |
|---|---|
| Ponto escolhido | |
| Fontes descartadas | |
| O que não foi verificado | |

**Responda:**

1. **O ponto escolhido está justificado?
2. **As fontes descartadas estão com o motivo?
3. **A cegueira aceita está declarada?
4. **O que você não fez?**

### Critérios de aceitação

- `superficie.md` com as **três** dimensões e o que fazer em cada falha.
- Você explicou **por que o acesso é político**.
- Você explicou **o que uma retenção curta impede**.
- `pontos.md` com os **cinco** pontos e o custo de cada.
- Você explicou **o que cada ponto NÃO vê**.
- Você explicou **por que o access log do frontend não vê o desync**.
- Você explicou **o custo de privacidade** de cada ponto.
- `inventario.md` com as **seis** fontes e as três dimensões.
- Você explicou **por que "não sei" é perigoso**.
- O **teste, fonte por fonte**, com o antes e o depois.
- Você usou o **atacante do curso anterior** para testar.
- `inventario-preenchido.md` com a resposta de cada fonte.
- `ponto-escolhido.md` com a **justificativa** e a **cegueira aceita**.
- Você explicou **o que aceita não ver**.
- `caderno/PD-002.md` com as **oito** seções.
- `relatorio-superficie.md` com as **oito** seções.
- Você citou **três itens** do que não verificou.
- ⚠ **Nenhum log, captura ou sensor de terceiro.**

---

## Avaliação

1. **O que é a superfície de detecção?**
2. **Cite as três dimensões.** Qual é a mais subestimada?
3. **O que fazer se o dado não existe?
4. **Por que o acesso é um problema político?
5. **Cite os cinco pontos** e o que cada um dá.
6. **Qual é o mais invasivo?** Por quê?
7. **Por que o PCAP com TLS é limitado?
8. **O que o access log do frontend NÃO vê?**
9. **Por que isso importa para o smuggling?
10. **O que o app log pode conter** de sensível?
11. **Como se preenche o inventário?** Com o quê?
12. **Por que "não sei" é perigoso?
13. **Como resolver um "não sei"?
14. **Cite três fontes de tráfego legítimo.
15. **O que é escolher o ponto de observação?
16. **O que a justificativa precisa conter?
17. **Por que declarar a cegueira aceita?
18. **O que a retenção determina?
19. **Como o custo de privacidade entra na escolha?
20. **O que liga este módulo ao curso anterior?

---

**Próximo:** [Módulo 3 — Assinatura, comportamento, anomalia](modulo-03.md)
