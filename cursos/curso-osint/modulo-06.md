# Módulo 6 — Empresa e Due Diligence Internacional

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Derivar o registro nacional correto a partir de qualquer identificador de empresa.
2. Ler um registro empresarial estrangeiro e extrair o que importa.
3. Desenhar a **estrutura de propriedade** de um grupo, inclusive offshore.
4. Usar LEI, OpenCorporates, OpenSanctions e Open Ownership com critério.
5. Produzir um dossiê de due diligence com confiança declarada.

---

## ⚠ Conduta

⚠ **Empresa e organização são sujeitos legítimos de investigação** — é o que due diligence,
compliance e jornalismo fazem profissionalmente. O material trata isso em profundidade **porque**
é legítimo, não apesar disso.

⚠ **O que continua fora:** pessoa física por trás da empresa, além do que o registro público
declara. Se um administrador é pessoa natural e está listado no registro, isso **é** o registro —
você lê o que ele declara. O que você **não** faz é investigar a vida privada dele (Módulo 4).

⚠ **Nenhuma consulta a base vazada.** O registro público de empresa é a fonte. Se um serviço
oferece "dado de contato de diretores" que não está no registro, **desconfie da origem**.

---

## 6.1 Derivar o registro — o mapa que resolve qualquer país

O Módulo 2 deu o hábito. Aqui, a aplicação.

```
IDENTIFICADOR DE EMPRESA
    │
    ├── TEM SUFIXO DE PAÍS?  (DE, FR, GB, ES...) ──▶ é VAT ou similar
    │        │
    │        ▼
    │    O país tem registro comercial público? ──▶ consulte-o
    │
    ├── TEM FORMATO NACIONAL?  (CNPJ, HRB, SIREN, Company Number)
    │        │
    │        ▼
    │    O formato JÁ diz o país ──▶ vá direto ao registro
    │
    ├── SÓ O NOME?
    │        │
    │        ▼
    │    Use OpenCorporates para descobrir a jurisdição
    │        │
    │        ▼
    │    Confirme no registro nacional (a fonte primária)
    │
    └── TEM LEI?
             │
             ▼
         GLEIF resolve globalmente, em qualquer país
```

⚠ **A regra que economiza horas:** **OpenCorporates agrega; o registro nacional é a fonte.** Nunca
cite OpenCorporates como fonte primária num relatório — cite-o como **índice**, e o registro
nacional como **fonte**.

### Jurisdições-chave, com o que cada uma tem

| Jurisdição | Registro | Identificador | Abertura |
|---|---|---|---|
| **Reino Unido** | **Companies House** | Company Number (8 díg.) | **Documento e conta disponíveis gratuitamente** |
| **Alemanha** | **Handelsregister** | `HRB` / `HRA` | Consulta gratuita; documento pago |
| **França** | **INSEE** / RCS | `SIREN` / `SIRET` | Dado básico gratuito |
| **Holanda** | **KVK** | KvK-nummer | Consulta gratuita limitada |
| **Espanha** | Registro Mercantil | `CIF`/`NIF` | Consulta básica; documento pago |
| **Brasil** | Receita Federal / Junta Comercial | `CNPJ` | Consulta gratuita |
| **EUA** | **50 registros estaduais** + SEC | State ID / CIK | Delaware e outros: gratuito |
| **Japão** | Registro Comercial (Hoji) | 法人番号 (13 díg.) | Básico gratuito |
| **Singapura** | **ACRA** | UEN | Pago |
| **Hong Kong** | Companies Registry | CR Number | Consulta gratuita |

⚠ **O Reino Unido é o caso mais aberto do mundo.** Companies House publica **contas anuais,
endereço registrado e lista de administradores** gratuitamente. Se um alvo tem subsidiária
britânica, comece por lá — frequentemente ela revela o grupo.

⚠ **A linha do Japão tem um detalhe:** o **法人番号** (*hōjin bangō*, número de pessoa jurídica) é
público e de formato fixo (13 dígitos). É a forma mais confiável de identificar empresa japonesa
sem depender de transliteração de nome.

### A ferramenta agregadora

```bash
mkdir -p ~/osint-lab/lab6 && cd ~/osint-lab/lab6

# GLEIF — o mais confiável para entidade global (API pública, sem chave)
echo "=== Busca por nome no GLEIF ==="
curl -s "https://api.gleif.org/api/v1/lei-records?filter\[entity.legalName\]=Bosch&page\[size\]=3" | \
  jq -r '.data[]? | [.attributes.lei, .attributes.entity.legalName,
         .attributes.entity.legalAddress.country,
         .attributes.entity.status] | @tsv' 2>/dev/null || \
  echo "ajuste o filtro conforme a documentação do GLEIF"

echo
echo "=== Consulta direta por LEI ==="
curl -s "https://api.gleif.org/api/v1/lei-records/5493001KJTIIGC8Y1R12" | \
  jq -r '.data.attributes | [.lei, .entity.legalName,
         .entity.legalAddress.country, .entity.status] | @tsv' 2>/dev/null
```

⚠ **O GLEIF também expõe relação de propriedade** (*relationship records*), o que liga entidade a
entidade. É a base pública mais sólida para estrutura de grupo, quando os LEIs existem.

```bash
# Relações de uma entidade (quem é pai, quem é filho)
curl -s "https://api.gleif.org/api/v1/lei-records/5493001KJTIIGC8Y1R12/direct-parent-relationship" | \
  jq -r '.data.attributes | [.relationship.relationshipType,
         .relationship.startNode, .relationship.endNode] | @tsv' 2>/dev/null || true
```

---

## 6.2 Estrutura de propriedade — o problema real

⚠ **Encontrar a empresa é fácil. Saber quem está por trás é o trabalho.**

```
NÍVEL 0: A empresa com que você negocia
   Nordwind Logistik GmbH (Hamburgo)
        │  100%
        ▼
NÍVEL 1: A holding
   Nordwind Holding B.V. (Holanda)
        │  80%
        ▼
NÍVEL 2: A offshore
   Nordwind Investments S.A. (Panamá)
        │  100%
        ▼
NÍVEL 3: O beneficiário final
   ⚠ Frequentemente não público
```

| Conceito | Definição | Onde se obtém |
|---|---|---|
| **Acionista** | Detém participação | Registro nacional (varia) |
| **Administrador** | Dirige legalmente | **Registro — quase sempre público** |
| **Beneficiário final** (UBO) | Quem **realmente** controla | **Registro de UBO onde existir** |
| **Pessoa exposta politicamente** (PEP) | Cargo público relevante | OpenSanctions, base nacional |

⚠ **O UBO é o objetivo real e a parte mais difícil.** Muitos países não têm registro público de
beneficiário final, e estruturas offshore existem justamente para interpor camadas.

### Onde existir, use o registro de UBO

| Jurisdição | Registro de UBO | Acesso |
|---|---|---|
| **UE** | AMLD — registro nacional de beneficiário final | **Varia muito por país**; alguns bloquearam acesso público |
| **Reino Unido** | **PSC Register** (People with Significant Control) | **Aberto** — o melhor do mundo |
| **Brasil** | Não há registro público de UBO; há declaração à Receita | Não público |
| **EUA** | **Corporate Transparency Act** — registro federal de UBO (recente) | **Não público** — acesso a autoridade |
| **Offshore** | Varia; vários territórios têm registro **não público** | Restrito |

⚠ **A nota do Reino Unido é a mais útil:** o **PSC Register** é público e mostra quem controla.
Para grupo com subsidiária britânica, é a forma mais rápida de ver o UBO.

⚠ **E a nota do Corporate Transparency Act é importante:** criou registro de UBO nos EUA, mas
**não público**. Isso significa que, para empresa americana, você frequentemente **não terá** o UBO
por fonte aberta — e isso se declara (confiança baixa), não se inventa.

### Ferramentas abertas de estrutura

| Ferramenta | O que faz | Limite |
|---|---|---|
| **OpenCorporates** | Agrega registros; mostra ligação entre empresas | Cobertura desigual |
| **Open Ownership Register** | Dado de beneficiário final agregado | Cobertura parcial |
| **OpenSanctions** | Sanção, PEP, entidade de risco | Base de risco, não de propriedade |
| **GLEIF** | Entidade + relação, quando há LEI | Só quem tem LEI |
| **Aleph (OCCRP)** | Investigação e dado agregado | Foco em investigação |

⚠ **Estas ferramentas são ponto de partida, não conclusão.** Elas **não substituem** o registro
nacional. E todas têm buraco de cobertura — o silêncio delas **não prova** ausência.

---

## 6.3 Sinais de risco em due diligence

O que você procura, e por quê.

| Sinal | O que indica | Onde se vê |
|---|---|---|
| **Registro muito recente** | Baixa maturidade; possível casca | Data de constituição |
| **Endereço = endereço de contador** | Empresa de fachada, comum e legítimo | Endereço registrado |
| **Centenas de empresas no mesmo endereço** | Escritório de formação de casca | Consulta cruzada |
| **Capital social simbólico** | Baixa substância | Registro |
| **Nomes de diretor iguais a outra do grupo** | Controle cruzado | Administradores |
| **Mudança recente de nome ou de país** | Reorganização, ou tentativa de ocultar | Histórico |
| **Dissolução e nova empresa com mesmo time** | Fuga de passivo | Histórico |
| **País de constituição sem operação** | Interposição | Endereço vs. atividade |
| **Sanção ou PEP no grupo** | Bloqueio regulatório | OpenSanctions |
| **Endereço residencial como sede** | Baixa estrutura | Endereço |

⚠ **O endereço do contador e o capital simbólico são sinais, não condenações.** Legal, comum e
legítimo. O que muda é a **necessidade de verificação adicional**.

```bash
# Sanção, PEP e entidade de risco — consulta pública
echo "=== OpenSanctions ==="
curl -s "https://api.opensanctions.org/search/default?q=Nordwind&limit=5" | \
  jq -r '.results[]? | [.id, .caption, .schema, (.datasets|join(","))] | @tsv' 2>/dev/null || \
  echo "requer chave — use a interface web: opensanctions.org/search"
```

⚠ **Consulta positiva em base de sanção exige verificação de homônimo.** Nomes se repetem muito, e
**falso positivo em sanção tem consequência grave** — para a contraparte e para você.

---

## 6.4 O dossiê de due diligence

O entregável do módulo. Estrutura fixa:

```markdown
TLP:AMBER

# Due Diligence — [Nome da contraparte]
Data: 2026-10-18    Analista: <nome>    Confiança global: [alta/moderada/baixa]

## 1. Escopo e base legal
Por que esta investigação é feita, e sob qual autorização.

## 2. Identificação
| Campo | Valor | Fonte | Data |
| Nome legal | | | |
| Identificador nacional | | | |
| LEI (se houver) | | | |
| Jurisdição | | | |
| Data de constituição | | | |
| Situação atual | | | |
| Endereço registrado | | | |

## 3. Estrutura de propriedade
(cadeia de participação, até onde conseguir)
| Nível | Entidade | Jurisdição | Participação | Fonte |
| Beneficiário final | | | | |

## 4. Administração
| Nome | Cargo | Desde | Outras empresas | Fonte |

## 5. Verificações de risco
| Verificação | Ferramenta | Resultado | Falso positivo possível? | Confiança |

## 6. Inconsistências observadas
(comportamento que não bate com a declaração)

## 7. Avaliação
Confiança: [nível]
Raciocínio:
Risco identificado:

## 8. O que NÃO foi possível confirmar
⚠ Obrigatória:
- | Item | Por que não | O que seria necessário |

## 9. Recomendação
| Ação | Base |
```

⚠ **A seção 8 é obrigatória e é a que separa dossiê de palpite.** Em due diligence, o que **não**
foi confirmado é informação tão valiosa quanto o que foi — porque é o que determina a decisão.

⚠ **E a seção 6 é onde a investigação rende.** A contraparte que declara ser europeia, com 20 anos,
atendendo só na Europa, e apresenta celular brasileiro (caso do Módulo 5) tem **inconsistência**.
Inconsistência não é prova de fraude — é **motivo para pedir mais informação**.

---

## 6.5 LAB — Dossiê de uma empresa real

**Duração:** 150 min

⚠ **Sujeito: empresa pública.** Escolha uma **empresa listada em bolsa, ou grande empresa com
subsidiárias internacionais**. São sujeitos legítimos, com dado abundante, e o exercício rende mais
que um caso fictício.

**Sugestões de alvo** (todas com registro abundante e subsidiárias em várias jurisdições):

| Alvo | Por que é bom para o exercício |
|---|---|
| Um grupo industrial com subsidiária no Reino Unido | Companies House aberto |
| Um grupo com subsidiária na Alemanha | Handelsregister |
| Uma empresa com entidades registradas no GLEIF | Estrutura por LEI |
| Uma empresa sancionada ou PEP-adjacente | Exercício de risco |

⚠ **Se preferir o caso didático**, use o `Nordwind Logistik GmbH` do Módulo 5 — mas ele é fictício,
e você não terá dado real. **Empresa pública rende mais.**

### Passo 1 — Identificação (30 min)

Produza `01-identificacao.md`:

| Campo | Valor | Fonte (URL) | Data da consulta |
|---|---|---|---|
| Nome legal | | | |
| Nome comercial | | | |
| Identificador nacional | | | |
| LEI | | | |
| Jurisdição | | | |
| Constituição | | | |
| Situação | | | |
| Endereço registrado | | | |

```bash
# Roteiro de consulta
cat <<'EOF'
1. GLEIF      → LEI e nome legal canônico
2. OpenCorporates → jurisdições onde a empresa aparece
3. Registro nacional da jurisdição principal → fonte primária
4. Companies House (se houver entidade no UK) → PSC Register
EOF
```

### Passo 2 — Estrutura de propriedade (45 min)

Produza `02-estrutura.md`:

| Nível | Entidade | Jurisdição | Tipo | Participação | Fonte |
|---|---|---|---|---|---|
| 0 | (a empresa) | | | — | |
| 1 | | | | | |
| 2 | | | | | |
| UBO | | | | | |

**Responda:**

1. Você **conseguiu** chegar ao UBO? Se não, **em que nível parou e por quê?**
2. Cada salto da cadeia tem **fonte**? Ela é registro ou agregador?
3. Se você parou no nível 1, **o que seria necessário** para continuar?
4. Alguma jurisdição da cadeia é conhecida por opacidade? Qual, e como isso afeta seu achado?

⚠ **A resposta 1 é o resultado mais comum, e o correto é declarar a parada.** "Não consegui
determinar o UBO" é achado legítimo, e se escreve com confiança **baixa** — não se omite.

### Passo 3 — Risco e inconsistência (40 min)

Produza `03-risco.md`:

| Verificação | Ferramenta | Resultado | Falso positivo? | Confiança |
|---|---|---|---|---|
| Sanção | OpenSanctions | | | |
| PEP na administração | OpenSanctions | | | |
| Endereço = contador? | Registro | | | |
| Capital simbólico? | Registro | | | |
| Data de constituição recente? | Registro | | | |
| Mudança recente de nome? | Histórico + CDX | | | |
| Inconsistências observadas | | | | |

**Responda:**

1. Você achou **alguma** inconsistência? Descreva-a com precisão.
2. Se achou sanção, **verificou o homônimo?** Como?
3. **Qual dos sinais de risco do §6.3 apareceu**, e qual **não** apareceu?
4. A ausência de sanção **prova** que não há risco? Justifique.

⚠ **A resposta 4 é o formato de todo achado negativo:** ausência em base **não é** prova de
ausência. A base tem cobertura parcial, nome tem homônimo, e a entrada tem atraso.

### Passo 4 — O dossiê (35 min)

Produza `dossie.md` seguindo **exatamente** o modelo do §6.4, com as **nove** seções.

⚠ **A seção 8 (o que não foi confirmado) precisa ter no mínimo três itens.** Em due diligence
real, essa seção é o que o decisor lê primeiro — porque é o que determina se ele assina ou pede
mais informação.

### Critérios de aceitação

- `01-identificacao.md` com **fonte e data** em cada linha.
- Você usou o **registro nacional** como fonte primária, não só o agregador.
- `02-estrutura.md` com a cadeia montada **até onde foi possível**, e a **parada declarada**.
- Cada salto da cadeia tem fonte identificada.
- `03-risco.md` com as sete verificações e a coluna de falso positivo preenchida.
- Você verificou homônimo **se** achou sanção ou PEP.
- Você explicou por que ausência em base **não é** prova de ausência.
- `dossie.md` com as **nove** seções e **três itens** na seção 8.
- Todas as fontes citadas com URL.

---

## Avaliação

1. Descreva o mapa de derivação de registro. Por que LEI resolve globalmente?
2. Por que OpenCorporates é **índice** e não fonte primária num relatório?
3. Por que o Reino Unido é o caso mais aberto do mundo? O que ele publica?
4. O que é o PSC Register e por que ele é tão útil?
5. Qual o problema do registro empresarial nos EUA? O que é Delaware?
6. Diferencie acionista, administrador e beneficiário final. Qual é o objetivo real?
7. O Corporate Transparency Act resolveu o problema de UBO nos EUA? Explique o que ele mudou e o
   que **não** mudou.
8. Por que estruturas offshore existem? O que elas interpõem?
9. Cite cinco sinais de risco e explique por que cada um é **sinal e não condenação**.
10. Por que "endereço do contador" é comum e legítimo, e ainda assim relevante?
11. Por que falso positivo em base de sanção tem consequência grave? Como você evita?
12. Por que a seção "o que não foi confirmado" é a que o decisor lê primeiro?
13. Por que ausência em base de risco **não prova** ausência de risco? Cite três razões.

---

**Próximo:** [Módulo 7 — Domínio, infraestrutura e certificado](modulo-07.md)
