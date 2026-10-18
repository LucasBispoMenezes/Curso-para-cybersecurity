# Módulo 4 — Pessoa: Identidade e Registro

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Entender por que **pessoa é o alvo mais regulado** de OSINT, e o que isso exige de você.
2. Reconhecer as diferenças de registro civil e empresarial por país.
3. Aplicar o método de investigação de pessoa com **base legal declarada**.
4. Distinguir o que é lícito sobre **figura pública** e sobre **particular**.
5. Fazer a sua própria verificação de exposição — o exercício central do módulo.

---

## ⚠ As três seções que você lê antes de continuar

Este é o módulo mais sensível do curso, e as regras são explícitas.

### 1. O que este módulo **não** ensina

| Não ensina | Por quê |
|---|---|
| Achar endereço residencial de particular | Dado pessoal sensível; uso restrito |
| Descobrir rotina, localização em tempo real | É vigilância, e é crime |
| Contornar remoção de dado | Violação de vontade expressa |
| Identificar pessoa sob risco | Fonte, vítima, ativista — **risco físico real** |
| "Achar" alguém por curiosidade | Não existe base legal para curiosidade |

⚠ **A regra de ouro, e ela não tem exceção:** investigação sobre pessoa **exige base legal
declarada**. Sem base legal, não é investigação — é violação de privacidade.

### 2. Figura pública ≠ particular

| | Figura pública | Particular |
|---|---|---|
| Base legal | Interesse público, jornalismo, função | Depende; frequentemente **não há** |
| Escopo | Atuação e patrimônio de função | Vida privada |
| Padrão | O que é relevante ao cargo | **Mínimo necessário** |
| Teste | "O público tem direito de saber?" | "Isso é necessário para quê?" |

⚠ **Figura pública não é alvo livre.** O escopo é **a função**, não a pessoa. Endereço residencial
de político **não** é de interesse público; o patrimônio declarado **é**.

### 3. O lab deste módulo não usa pessoa real

Como nos módulos anteriores: você investiga **a si mesmo** e uma **identidade fictícia** que o
curso fornece. Ponto.

---

## 4.1 O que este módulo entrega, então

Se não é "achar pessoas", o que é?

| Habilidade | Onde se aplica |
|---|---|
| Reconhecer **diferença de registro por país** | Due diligence, KYC, jornalismo |
| Saber **derivar** onde procurar | Qualquer jurisdição |
| Distinguir dado **público por função** de dado pessoal | Compliance |
| Verificar identidade com **fonte corroborada** | Antifraude, verificação |
| Medir a **própria** exposição | Segurança pessoal |
| Saber **quando parar** | O mais importante |

⚠ **A última linha é a mais valiosa do módulo.** Saber quando parar é a habilidade que separa
profissional de curioso — e é o que o Módulo 10 formaliza.

---

## 4.2 Registro civil e empresarial por país

A tabela que um curso nacional não pode ter. Não é decorável — é para **consultar e reconhecer
padrão**.

| País | Registro de empresa | Registro de pessoa | Observação |
|---|---|---|---|
| **Brasil** | Receita Federal (CNPJ), Juntas Comerciais | Cartório (nascimento), não público | CPF não é consultável publicamente |
| **Alemanha** | **Handelsregister** (`HRB`/`HRA`) | Melderegister (restrito) | Registro comercial muito aberto |
| **Reino Unido** | **Companies House** | Nenhum central público | **O mais aberto do mundo** |
| **França** | **INSEE** (`SIREN`/`SIRET`), RCS | Nenhum central | |
| **Espanha** | Registro Mercantil (`CIF`/`NIF`) | Padrón municipal | |
| **Portugal** | Registro Comercial, `NIPC` | Nenhum central | |
| **Holanda** | **KVK** | BRP (restrito) | |
| **EUA** | **Estadual** (50 registros!) + SEC | Nenhum central | **Fragmentação é o problema** |
| **Japão** | **Hoji** (registro comercial) | Koseki (fechado) | Transliteração é o problema |
| **Singapura** | **ACRA** | NRIC (restrito) | |
| **Hong Kong** | **Companies Registry** | Nenhum | |
| **Offshore** | Delaware, Panamá, BVI, Luxemburgo | — | **Estrutura, não registro** |

⚠ **Três observações que valem mais que a tabela:**

1. **"Registro de pessoa" é raro.** Na maioria dos países, dado de pessoa física **não** é
   consultável publicamente — e é assim por projeto (GDPR/LGPD). **Onde parece ser, desconfie da
   origem.**
2. **EUA é o caso mais difícil** porque não há registro federal de empresa: são 50 sistemas
   estaduais. Delaware é o domicílio de milhões de empresas que não operam lá.
3. **Offshore não é um registro diferente — é o mesmo registro com estrutura.** Uma empresa em
   Delaware se registra normalmente. O problema é **quem está por trás**, e isso o Módulo 6 trata.

```bash
# O ponto de partida global para empresa: OpenCorporates agrega registros nacionais
# Consulte pelo nome — e note a jurisdição que ele retorna
curl -s "https://api.opencorporates.com/v0.4/companies/search?q=exemplo&per_page=5" | \
  jq -r '.results.companies[]? | [.company.name, .company.jurisdiction_code,
         .company.company_number, .company.current_status] | @tsv' 2>/dev/null || \
  echo "requer chave de API — use a interface web em opencorporates.com"
```

---

## 4.3 O método — investigação de pessoa com base legal

Quando há base legal (jornalismo, due diligence de contraparte, verificação autorizada), o método é:

```
1. BASE LEGAL      →  Declare POR ESCRITO por que você pode fazer isso
2. ESCOPO          →  O que é necessário e o que é excesso
3. IDENTIFICADOR   →  O que você tem: nome? e-mail? perfil? (Módulo 2)
4. CORROBORAÇÃO    →  Mínimo de DUAS fontes independentes
5. REGISTRO        →  Cada achado com fonte, data, método
6. PARADA          →  Quando a pergunta é respondida, você para
```

⚠ **O passo 1 é escrito, não pensado.** "Eu acho que posso" não é base legal. A forma correta:
*"Investigação de contraparte para contrato X, na qualidade de compliance da empresa Y, com
consentimento contratual expresso na cláusula Z."*

⚠ **O passo 6 é o que ninguém faz.** Investigação não é coleta infinita — é **responder uma
pergunta**. Quando a pergunta é respondida, continuar coletando é excesso de escopo, e excesso de
escopo é violação.

### O teste de necessidade

Para **cada** dado que você procura, pergunte:

| Pergunta | Se a resposta é não... |
|---|---|
| Isso responde à minha pergunta? | **Não colete** |
| Isso é o mínimo necessário? | Reduza |
| Se isso vazar, causa dano? | Trate como sensível, e considere não coletar |
| Eu teria como justificar isso? | **Não colete** |

⚠ **A terceira linha é o teste moral, e a quarta é o jurídico.** Aplicar as duas **antes** de
coletar evita o problema que não tem conserto depois.

---

## 4.4 Corroborar identidade sem violar privacidade

O problema central: como você confirma que duas informações são da **mesma pessoa**, sem coletar
dado que não precisa.

| Técnica | O que faz | Custo de privacidade |
|---|---|---|
| **Sobreposição de contexto** | Mesma empresa, mesmo período, mesma função | Baixo |
| **Consistência temporal** | A informação de A é possível dado B | Baixo |
| **Fonte oficial** | Registro que lista a pessoa na função | Baixo |
| **Colaboração direta** | Perguntar à pessoa | **Nenhum** |
| **Coleta de dado pessoal adicional** | CPF, endereço, etc. | **Alto** — evite |

⚠ **A última linha do lado direito é a tentação do amador.** Diante de duas hipóteses, a pessoa
inexperiente busca **mais dado pessoal** para desempatar. O profissional busca **contexto** — e,
quando possível, **pergunta à própria pessoa**.

⚠ **A linha "colaboração direta" é subestimada.** Em due diligence e em jornalismo, **perguntar é
legítimo e frequentemente a resposta mais rápida**. Não é falta de técnica; é método.

### Quando não há corroboração

Se você só tem **uma** fonte, o achado é **confiança baixa** — e se declara assim. Não se
"confirma" achado repetindo a mesma fonte (Módulo 1, §1.4).

---

## 4.5 A sua exposição — o exercício do módulo

⚠ **Você é o alvo, e você autoriza.** É o exercício de maior valor prático e o único que não tem
risco de terceiro.

### O que muda quando você olha para si

O Módulo 3 já fez a varredura. Aqui, você faz a **estruturação** — e a decisão.

| Categoria | Exposição típica | Severidade |
|---|---|---|
| Nome em documento oficial | Alto (identifica, é permanente) | Média |
| Perfil profissional | Esperado (LinkedIn) | Baixa |
| Perfil antigo em fórum | Médio (correlaciona identidades) | **Alta** |
| E-mail em vazamento | Alto | **Alta** |
| Telefone em cadastro público | Médio | Média |
| Foto com GPS | Alto | **Alta** |
| Metadado em documento | Médio | Média |
| Endereço em registro aberto | **Alto** | **Crítica** |
| Rotina observável (horário, trajeto) | **Crítico** | **Crítica** |

⚠ **A última linha é o que OSINT sobre pessoa **deve** proteger.** Não é o nome que causa dano —
é a **rotina**. Se alguém sabe onde você está às 7h de segunda, isso é mais perigoso que seu CPF.

⚠ **E é por isso que o curso não ensina a descobrir rotina**: a habilidade existe, o dano é real, e
a defesa é o que se ensina.

---

## 4.6 LAB — Estrutura de investigação e sua exposição

**Duração:** 120 min

⚠ **Sujeitos:** você mesmo, e uma identidade **fictícia** fornecida abaixo. Nenhuma pessoa real.

### Parte A — A identidade fictícia (35 min)

O curso fornece este alvo construído. Ele **não existe**, e o exercício é o de **derivar o método**:

```
CASO DIDÁTICO — "Contraparte Internacional"

Você é analista de compliance e precisa avaliar esta contraparte antes de
assinar contrato de fornecimento:

  Nome:      Nordwind Logistik GmbH
  País:      Alemanha
  Sede:      declarada em Hamburgo
  Identif.:  VAT DE 812345678
  Site:      nordwind-logistik.de
  Contato:   +49 40 1234567
  Proposta:  fornecimento de transporte, € 2,4 milhões/ano
```

**Produza `caso-didatico.md` — apenas o PLANO, sem executar:**

| Fase | O que você faria | Que jurisdição | Que fonte |
|---|---|---|---|
| 1. Base legal | | | |
| 2. Escopo | | | |
| 3. Identificador | | | |
| 4. Registro de empresa | | | |
| 5. Verificação de VAT | | | |
| 6. Domínio e certificado | | | |
| 7. Estrutura de propriedade | | | |
| 8. Corroboração | | | |

**Responda:**

1. **O identificador diz a jurisdição?** Como?
2. Qual registro alemão você consultaria, e o que ele deve conter?
3. **Como você verifica se o VAT existe e é válido?** (Existe serviço oficial da UE para isso.)
4. Qual a **segunda fonte independente** para confirmar a existência da empresa?
5. O que, neste caso, seria **excesso de escopo**? (Dica: você NÃO precisa saber quem são os
   funcionários.)
6. Se a empresa fosse **de Delaware** em vez de Alemanha, o que mudaria no seu plano?

### Parte B — A sua exposição estruturada (45 min)

Retome a varredura do Módulo 3 (`pegada.md`) e **estruture**:

Produza `exposicao.md`:

```markdown
# Minha exposição estruturada

## 1. Inventário por severidade

| Dado exposto | Onde | Severidade | Dano possível | Ação |
|---|---|---|---|---|
| | | crítica/alta/média/baixa | | |

## 2. O que eu considero INACEITÁVEL
(liste o que você não quer público de jeito nenhum)

## 3. O que é rotina observável sobre mim
| Padrão | Quem poderia observar | O que revela |
|---|---|---|
| horário de deslocamento | | |
| local frequente | | |
| padrão de rede social | | |

## 4. Ação por prioridade
| # | Ação | Prazo | Feito? |
|---|---|---|---|
| 1 | | | |
```

**Responda:**

1. **Qual a sua exposição de maior severidade?** Por que ela é pior que as outras?
2. Qual informação você **decidiu não remover**, e por quê? (Remover tudo não é o objetivo.)
3. **Que rotina sua é observável?** Quanto tempo levaria para alguém mapear?
4. Qual ação você executa **esta semana**?

⚠ **A resposta 3 é a mais importante do curso sobre pessoa.** Você não precisa de dado pessoal para
saber a rotina de alguém — precisa de observação. É por isso que a defesa contra OSINT hostil é
**variar padrão**, e não esconder nome.

### Parte C — Quando parar (40 min)

⚠ **O exercício de julgamento.**

Para **cada** situação abaixo, escreva: **(a)** você faz? **(b)** sob qual base legal? **(c)** onde
você para?

| # | Situação | Faz? | Base legal | Onde para |
|---|---|---|---|---|
| 1 | Empresa quer avaliar fornecedor estrangeiro | | | |
| 2 | Jornalista investiga ministro e procura o endereço da casa dele | | | |
| 3 | Empresa suspeita de fraude e quer o CPF do funcionário | | | |
| 4 | Você quer saber se um conhecido tem antecedente | | | |
| 5 | ONG documenta violação de direitos e o alvo é um agente público | | | |
| 6 | Recrutador quer confirmar se candidato trabalhou onde diz | | | |
| 7 | Pesquisador quer dado de pessoa que publicou artigo acadêmico | | | |
| 8 | Você quer saber se você mesmo aparece em vazamento | | | |

**Depois responda:**

1. Em qual situação a resposta é **"não faço"**? Por quê?
2. Na **situação 2**, qual a diferença entre o patrimônio dele e o endereço dele?
3. Na **situação 8**, por que o seu próprio caso é diferente de todos os outros?
4. **Escreva sua regra pessoal**: em uma frase, quando você **não** investiga alguém.

⚠ **A resposta 4 é o entregável do módulo.** É a sua regra, escrita, para você consultar antes de
começar — porque a decisão tomada **depois** de encontrar algo é sempre pior.

### Critérios de aceitação

- `caso-didatico.md` com as oito fases e **sem execução** de consulta.
- Você identificou o registro alemão correto e o serviço oficial de validação de VAT da UE.
- Você nomeou o que seria **excesso de escopo** no caso.
- Você explicou o que mudaria se a empresa fosse de Delaware.
- `exposicao.md` com o inventário por severidade e a **parte C respondida**.
- Você identificou uma **rotina observável sua**, e por que ela é mais perigosa que dado pessoal.
- A tabela de julgamento preenchida nas **oito** situações.
- **Sua regra pessoal escrita em uma frase.**
- ⚠ Nenhuma consulta sobre pessoa real.

---

## Avaliação

1. Por que investigação sobre pessoa exige base legal **declarada**, e não apenas "eu acho que
   posso"?
2. Distinga figura pública de particular em base legal, escopo e padrão.
3. Endereço residencial de político é de interesse público? E o patrimônio declarado? Explique.
4. Por que "registro de pessoa" é raro no mundo? O que isso implica quando um site oferece?
5. Por que EUA é o caso mais difícil de registro empresarial? O que é Delaware e por que importa?
6. Descreva as seis fases do método de investigação de pessoa. Qual você acrescentaria?
7. O que é o teste de necessidade? Aplique-o a um dado que você já coletou.
8. Por que "coletar mais dado pessoal" é a resposta errada para desempatar duas hipóteses? O que
   o profissional faz?
9. Por que perguntar à pessoa é método legítimo e subestimado?
10. **Por que rotina observável é mais perigoso que dado pessoal?** O que isso implica para a
    defesa?
11. Na situação "jornalista investiga ministro", onde está a linha entre o legítimo e o excesso?
12. Por que a sua própria exposição é o alvo de maior valor prático, e o único sem risco?
13. Escreva a sua regra pessoal de quando não investigar.

---

**Próximo:** [Módulo 5 — Telefone global](modulo-05.md)
