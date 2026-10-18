# Módulo 10 — Ética, Legalidade e Limites Globais

**Carga:** 3 horas (1h30 teoria · 1h30 lab)
**Pré-requisitos:** Módulos 1 a 9

---

## Objetivos

1. Entender por que a mesma consulta pode ser legal num país e não em outro.
2. Distinguir as bases legais de tratamento de dado pessoal (LGPD, GDPR e correlatas).
3. Aplicar o teste de proporcionalidade antes de qualquer coleta.
4. Reconhecer as situações em que a resposta correta é **não fazer**.
5. Produzir uma **avaliação de impacto** antes de iniciar investigação.

---

## ⚠ Este é o módulo que determina se você pode usar o resto

Os nove módulos anteriores te deram capacidade técnica. Este determina **quando não usar**.

⚠ **E ele não é decoração jurídica.** A maioria dos problemas reais em OSINT **não é** técnico —
é uma investigação bem-feita que **não deveria ter sido feita**. O achado estava certo; a
pergunta estava errada.

⚠ **Nada aqui é orientação jurídica.** É mapa de risco, para você saber **quando** consultar
advogado — e para você reconhecer a situação em que a resposta é óbvia.

---

## 10.1 Por que jurisdição importa — e como

A pergunta não é "onde o dado está". É **onde você está** e **onde o alvo está**.

```
        VOCÊ (jurisdição A)                  ALVO (jurisdição B)
              │                                     │
              │  ┌───────────────────────────┐      │
              └─▶│   LEIS QUE SE APLICAM     │◀─────┘
                 │                           │
                 │ 1. A lei do SEU país      │
                 │ 2. A lei do país do alvo  │
                 │ 3. Onde o dado está       │
                 │ 4. O termo do serviço     │
                 │ 5. Seu contrato/emprego   │
                 └───────────────────────────┘
                 ⚠ TODAS ao mesmo tempo
```

⚠ **A quinta camada é a mais esquecida.** Seu contrato de trabalho, o código de ética da sua
profissão, o contrato com o cliente — todos impõem limites **adicionais** aos da lei.

| Camada | Origem | Efeito |
|---|---|---|
| **Lei do seu país** | Territorialidade | O que você pode fazer aqui |
| **Lei do país do alvo** | Alcance extraterritorial (GDPR tem) | Pode alcançar você |
| **Onde o dado está** | Soberania de dado | Restringe transferência |
| **Termo do serviço** | Contrato | Vinculante mesmo se legal |
| **Contrato/ética profissional** | Profissão | Restringe mais que a lei |

⚠ **O GDPR é o exemplo de alcance extraterritorial.** Ele se aplica a organização **fora** da UE
que trate dado de pessoa **na** UE, em certas circunstâncias. Isso significa que a sua
investigação no Brasil sobre pessoa residente na Alemanha pode estar sujeita ao GDPR.

---

## 10.2 As bases legais — mapa comparado

| | **LGPD** (Brasil) | **GDPR** (UE) | **EUA** |
|---|---|---|---|
| Dado pessoal | Definido amplamente | Definido amplamente | Setorial e por estado |
| Dado sensível | Categoria especial, proteção reforçada | Igual | Varia (CCPA/CPRA na Califórnia) |
| Base legal | 10 hipóteses; consentimento é uma | 6 bases | Varia |
| **Interesse legítimo** | Previsto | Previsto, **com balanceamento** | Não há conceito geral |
| **Dado público** | **Continua sendo dado pessoal** | **Continua sendo dado pessoal** | Varia |
| Autoridade | ANPD | Autoridade nacional de cada país | FTC / estadual |
| Alcance fora do país | Limitado | **Extraterritorial** | Limitado |

⚠ **A linha "dado público continua sendo dado pessoal" é a mais importante do módulo** e a que
mais gente desconhece.

> **Dado estar publicamente acessível NÃO significa que você pode tratá-lo livremente.**
> Sob LGPD e GDPR, o dado continua protegido. O que muda é a **base legal** aplicável — e
> frequentemente ela **não existe** para o seu caso.

⚠ **Consequência prática:** "está no site do governo, então é livre" é **falso** no Brasil e na
UE. Você precisa de base legal **mesmo** para dado público.

### As bases legais que costumam cobrir OSINT

| Base | Quando se aplica | Limite |
|---|---|---|
| **Consentimento** | A pessoa autorizou | Precisa ser específico e revogável |
| **Interesse legítimo** | Avaliação, segurança, jornalismo | **Exige balanceamento** — não é passe livre |
| **Cumprimento de obrigação legal** | KYC, compliance | Só o necessário para a obrigação |
| **Exercício regular de direitos** | Processo judicial | No escopo do processo |
| **Proteção do crédito** | Análise de risco | Escopo restrito |
| **Estudos e pesquisa** | Pesquisa acadêmica | Anonimização quando possível |
| **Jornalismo** | Interesse público | **Proteção reforçada, mas com limites** |

⚠ **A linha "interesse legítimo" é a mais invocada e a mais mal usada.** Ela **não** é um passe
livre: exige **teste de balanceamento** — o seu interesse tem que prevalecer sobre os direitos da
pessoa, considerando expectativa razoável e impacto.

> "Eu tenho interesse legítimo em saber" **não** passa no teste. O teste pergunta: **a pessoa
> esperaria razoavelmente isso?**

---

## 10.3 O teste de proporcionalidade

O instrumento que você aplica **antes** de coletar.

```
1. FINALIDADE     →  Qual o propósito ESPECÍFICO? (não "por via das dúvidas")
2. NECESSIDADE    →  Isso é necessário para o propósito? (não é "útil" — é necessário?)
3. PROPORCIONALIDADE →  O impacto na pessoa é proporcional ao benefício?
4. BASE LEGAL     →  Qual base cobre isto? (se não há, PARE)
5. EXPECTATIVA    →  A pessoa esperaria razoavelmente isso?
6. MINIMIZAÇÃO    →  Estou coletando o mínimo?
7. RETENÇÃO       →  Quanto tempo guardo, e destruo depois?
```

⚠ **Aplicar as sete **antes** evita o problema que não tem conserto depois.** Uma vez que você
tem o dado, você tem a responsabilidade — e apagar não desfaz o tratamento.

### Exemplos de aplicação

| Caso | Passa? | Por quê |
|---|---|---|
| Compliance verifica empresa antes de contrato | **Sim** | Finalidade clara, obrigação legal, escopo definido |
| Jornalista investiga gasto público de ministro | **Sim** | Interesse público, escopo na função |
| Jornalista busca endereço residencial do ministro | **Não** | Não é necessário ao interesse público |
| Empresa investiga candidato a emprego | **Parcial** | Só o que é relevante e informado |
| Você busca um conhecido "para saber" | **Não** | Sem finalidade, sem base |
| ONG documenta violação de direitos | **Sim** | Interesse público, pessoa protegida |

⚠ **A terceira linha é a mais instrutiva.** O mesmo jornalista, na mesma investigação, pode fazer
uma coisa e não a outra. **A linha é o escopo, não a pessoa.**

---

## 10.4 As situações em que a resposta é não

Lista fechada, para você reconhecer de imediato.

| Situação | Por quê |
|---|---|
| **Pessoa sob risco** — fonte, vítima, ativista, refugiado | Risco **físico** real |
| **Menor de idade** | Proteção reforçada; e frequentemente sem base |
| **Dado sensível** (saúde, religião, orientação, biometria) | Categoria especial |
| **Rotina e localização** de particular | É vigilância |
| **Vida privada** não relacionada à finalidade | Teste de necessidade reprova |
| **Perseguição** — mesmo "por justiça" | É crime, e não existe versão aceitável |
| **Investigação sem base legal declarada** | A resposta é a pergunta |
| **Uso de base vazada** | Dado ilícito |
| **Contornar remoção** que a pessoa pediu | Violação de vontade |
| **Automação sobre pessoa** | Escala o risco sem escala o benefício |

⚠ **A primeira linha é a mais importante e a mais violada por engano.** Você pode ter
**autorização** para investigar uma organização e, no processo, atingir uma pessoa que se
**esconde** dessa organização — uma fonte, uma vítima, um denunciante. Nesses casos, o dano é
**físico**.

⚠ **A nota sobre perseguição vale ser explícita:** "stalkerware", monitoramento não consentido e
perseguição digital são **crime** no Brasil (Lei 14.132/2021 tipifica o *stalking*) e na maioria
das jurisdições. Não há uso "ético" de técnica de perseguição.

---

## 10.5 Avaliação de impacto — o artefato do módulo

Antes de qualquer investigação que toque pessoa, produza isto:

```markdown
# Avaliação de Impacto e Conformidade — [Investigação]

Data: 2026-10-18     Autor: <nome>

## 1. Finalidade específica
(O propósito, em uma frase. Se não couber, não está definido.)

## 2. Base legal
[ ] Consentimento
[ ] Interesse legítimo — teste de balanceamento abaixo
[ ] Obrigação legal — qual:
[ ] Exercício regular de direitos — qual processo:
[ ] Pesquisa — qual projeto, com que aprovação:
[ ] Jornalismo — qual interesse público:

Se NENHUMA se aplica → **PARAR AQUI**

## 3. Teste de balanceamento (se interesse legítimo)
- Interesse: ______
- Direito afetado: ______
- Expectativa razoável da pessoa: ______
- Impacto potencial: ______
- Mitigação possível: ______
- **Conclusão: prevalece? [ ] sim  [ ] não  [ ] precisa de consultoria jurídica**

## 4. Escopo — o que EU VOU coletar
| Dado | Por que é necessário | Jurisdição | Retenção |
|---|---|---|---|

## 5. Escopo — o que EU NÃO VOU coletar
⚠ Obrigatório. Liste o que fica fora e por quê.

## 6. Sujeitos protegidos
[ ] Há fonte, vítima, denunciante ou pessoa sob risco no escopo?
[ ] Menor de idade?
[ ] Dado sensível?
Se sim a qualquer → **escalar antes de prosseguir**

## 7. Conformidade por jurisdição
| Jurisdição | Regime aplicável | O que exige | Atendido? |
|---|---|---|---|

## 8. Retenção e destruição
| Dado | Prazo | Como será destruído | Responsável |
|---|---|---|---|

## 9. Aprovação
Quem aprovou esta investigação: ______    Data: ______
```

⚠ **A seção 5 é obrigatória e é a mais difícil.** Definir o que você **não** vai coletar exige
disciplina — e é o que separa investigação de coleta compulsiva.

⚠ **A seção 6 tem poder de parada.** Se há pessoa sob risco no escopo, **você para e escala**
antes de continuar. Não é formalidade: o dano a uma fonte é irreversível.

---

## 10.6 LAB — Avaliação de impacto e julgamento

**Duração:** 90 min

⚠ **Nenhuma consulta executada.** O lab é de **julgamento**, e o entregável é a avaliação.

### Passo 1 — Aplique a avaliação (40 min)

Escolha **um** dos cenários e produza a avaliação completa:

| Cenário | Descrição |
|---|---|
| **A** | Você é analista de compliance. A empresa vai fechar contrato com fornecedor na Alemanha. Verificar existência, situação e sanção. |
| **B** | Você é jornalista. Investigar repasse de verba pública a uma ONG, cujo dirigente é pessoa natural nomeada em registro público. |
| **C** | Você é pesquisador. Coletar dado de empresas de um setor, para estudo acadêmico, sem tocar pessoa. |
| **D** | Você é profissional de segurança. O cliente pediu "verificar tudo que existir sobre este ex-funcionário que saiu brigado". |

**Produza `avaliacao.md`** com as **nove** seções do modelo §10.5.

**Responda, no fim:**

1. Qual base legal se aplica, e **por que não a mais conveniente**?
2. Se você invocou interesse legítimo, **o balanceamento passou?** Mostre o raciocínio.
3. **Qual dado você decidiu NÃO coletar**, e por quê?
4. Há **sujeito protegido** no escopo? Qual, e o que você faz?

### Passo 2 — O cenário D, especificamente (25 min)

⚠ **O cenário D é o que mais aparece no mundo real, e é o que exige mais julgamento.**

"Verificar tudo que existir sobre este ex-funcionário que saiu brigado."

Responda por escrito em `cenario-d.md`:

1. **Qual é a finalidade real** deste pedido? (Descreva com precisão.)
2. Qual base legal cobriria isso? **Existe**?
3. O que o teste de proporcionalidade diz?
4. **Qual é o risco para você** se você fizer? (Não para a empresa — para você.)
5. O que você **faz** com o pedido? Escreva a resposta que você daria ao cliente.
6. **O que você oferece em vez disso**, se houver algo legítimo por trás do pedido?

⚠ **A resposta 6 é a mais construtiva.** Frequentemente, o que o cliente quer **é** legítimo — ele
só formulou mal. Ex.: verificar se ex-funcionário levou propriedade intelectual é uma pergunta
**diferente** de "verificar tudo sobre ele", e frequentemente tem base legal onde a segunda não tem.

### Passo 3 — Julgamento em série (25 min)

Para **cada** situação, escreva: **(a)** faz ou não faz; **(b)** base legal; **(c)** onde para.

| # | Situação | Faz? | Base | Onde para |
|---|---|---|---|---|
| 1 | Confirmar que um fornecedor existe, antes de pagar | | | |
| 2 | Buscar endereço de sócio de empresa devedora | | | |
| 3 | Buscar endereço residencial do mesmo sócio | | | |
| 4 | Verificar PEP de diretor de banco | | | |
| 5 | Verificar PEP da filha do diretor, que não tem cargo | | | |
| 6 | Confirmar diploma de candidato, com o consentimento dele | | | |
| 7 | Confirmar diploma sem o consentimento | | | |
| 8 | Analisar foto de fachada para confirmar que a empresa existe | | | |
| 9 | Analisar foto que mostra o sócio em casa | | | |
| 10 | Coletar dado de 10.000 pessoas para "análise de risco" | | | |

**Responda:**

1. Quais pares **(2,3)**, **(4,5)** e **(6,7)** têm a **mesma pessoa** e respostas **diferentes**?
   Explique a linha em cada par.
2. Na **situação 10**, o que muda em relação a coletar de 10 pessoas?
3. **Qual situação é a mais difícil de julgar?** Por quê?

⚠ **A resposta 1 é o coração do módulo:** a mesma pessoa, o mesmo dado, e respostas **diferentes**
porque **a finalidade e o escopo mudam**. É por isso que "é público?" é a pergunta errada.

### Critérios de aceitação

- `avaliacao.md` com as **nove** seções e a **seção 5** (o que não coletar) preenchida.
- Você nomeou a base legal e explicou **por que não a mais conveniente**.
- Se invocou interesse legítimo, o **balanceamento** está demonstrado.
- `cenario-d.md` com a resposta que você daria ao cliente, **escrita**.
- Você propôs **a alternativa legítima** ao pedido do cenário D.
- A tabela de julgamento preenchida nas **dez** situações.
- Você explicou os três pares em que a **mesma pessoa** recebe resposta diferente.
- Você identificou a situação mais difícil de julgar.
- ⚠ Nenhuma consulta executada.

---

## Avaliação

1. Cite as cinco camadas de lei/regra que se aplicam simultaneamente. Qual é a mais esquecida?
2. Explique o alcance extraterritorial do GDPR. Por que ele alcança você no Brasil?
3. **Por que "o dado é público" não significa "posso tratar livremente"** sob LGPD e GDPR?
4. Cite cinco bases legais e o limite de cada uma.
5. Por que interesse legítimo **não é** passe livre? Descreva o teste de balanceamento.
6. Aplique o teste de proporcionalidade em sete passos a um caso concreto.
7. Por que o mesmo jornalista pode buscar o patrimônio do ministro e não o endereço dele?
8. Cite cinco situações em que a resposta é "não faça", e justifique a mais importante.
9. Por que "sujeito protegido no escopo" tem poder de parada? O que isso significa na prática?
10. Por que o cenário "verificar tudo sobre o ex-funcionário" é tão comum e tão problemático?
11. O que você oferece em vez de recusar o pedido? Dê um exemplo.
12. Explique por que "buscar sócio de empresa devedora" e "buscar endereço residencial do sócio"
    têm respostas diferentes.

---

**Próximo:** [Módulo 11 — Documentação e cadeia de custódia](modulo-11.md)
