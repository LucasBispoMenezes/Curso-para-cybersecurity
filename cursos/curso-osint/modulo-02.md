# Módulo 2 — O Identificador e a Jurisdição

**Carga:** 3 horas (1h30 teoria · 1h30 lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Reconhecer **o tipo** de um identificador antes de consultá-lo.
2. Derivar a jurisdição da própria estrutura do dado.
3. Conhecer a família de identificadores globais (LEI, ISO, IBAN, E.164) e seu uso.
4. Montar o seu próprio **mapa de decisão**: identificador → jurisdição → classe de fonte.
5. Entender por que transliteração e formato local quebram buscas globais.

---

## ⚠ Conduta

Este módulo constrói o **mapa**, não o executa. Nenhuma consulta a pessoa. Os exemplos usam
identificadores genéricos ou de entidades públicas.

⚠ **A regra do curso inteiro:** nenhum lab usa pessoa real como alvo. Empresa e domínio públicos
são sujeitos legítimos; pessoa não é.

---

## 2.1 A ideia central: o identificador já responde metade

A maioria das pessoas olha um dado e vai direto buscar. O método correto é **ler o dado primeiro**,
porque o formato dele **já diz onde procurar**.

| Você vê | Ele já diz |
|---|---|
| `+55 11 98765-4321` | Brasil, DDD 11 (São Paulo), **celular** (9 na frente) |
| `+49 30 901820` | Alemanha, Berlim, **fixo** |
| `CNPJ 12.345.678/0001-90` | Brasil, **pessoa jurídica**, matriz (0001) |
| `DE 123456789` | Alemanha, **VAT** de empresa |
| `GB 123456789` | Reino Unido, VAT |
| `NIF B12345678` | Espanha, **pessoa jurídica** (B) |
| `NIF 12345678Z` | Espanha, **pessoa física** (letra) |
| `SIREN 123 456 789` | França, empresa |
| `SIRET 123 456 789 00012` | França, **estabelecimento** específico |
| `Companies House 12345678` | Reino Unido, 8 dígitos |
| `HRB 12345` | Alemanha, **Handelsregister** (registro comercial) |
| `.de` / `.br` / `.jp` | Jurisdição do **registro de domínio** |
| `IBAN DE89 3704 0044 0532 0130 00` | Alemanha (os 2 primeiros = país) |
| `LEI 5493001KJTIIGC8Y1R12` | **Global** — entidade legal, em qualquer país |

⚠ **Estude esta tabela devagar.** Ela é o resumo de todo o módulo, e o hábito que ela constrói —
**olhar antes de buscar** — é o que torna a investigação global viável.

---

## 2.2 A família dos identificadores globais

Existem identificadores que **atravessam fronteiras por projeto**. Eles são a resposta ao problema
"o alvo pode estar em qualquer lugar".

| Identificador | O que é | Cobre | Onde se consulta |
|---|---|---|---|
| **LEI** (ISO 17442) | Entidade **legal** | Global | **GLEIF** — gratuito, aberto |
| **E.164** (UIT) | Número de telefone | Global | Estrutura; validação por `phonenumbers` |
| **IBAN** (ISO 13616) | Conta bancária | ~80 países | Estrutura: país nos 2 primeiros |
| **BIC / SWIFT** | Instituição financeira | Global | Estrutura de 8 ou 11 caracteres |
| **ISIN** (ISO 6166) | Instrumento financeiro | Global | País nos 2 primeiros caracteres |
| **ISO 3166** | País, subdivisão | Global | Base de todo o resto |
| **DUNS** | Entidade comercial | Global (comercial) | Proprietário — atenção |
| **VAT / IVA** | Contribuinte | UE + vários | Estrutura; validação por país |

⚠ **O LEI é o mais subutilizado e o mais valioso.** Ele existe justamente porque a crise de 2008
mostrou que ninguém conseguia dizer com certeza **qual entidade jurídica** era qual em transação
internacional. Se você tem o LEI, você tem a entidade — sem precisar saber se ela é alemã, japonesa
ou cingapuriana.

**Estrutura do LEI (20 caracteres):**

```
5493001KJTIIGC8Y1R12
└┬─┘└──────┬─────┘└┬┘└┬┘
 │         │       │  └─ 2 dígitos de verificação
 │         │       └──── entidade local (12)
 │         └──────────── código do emissor LOU (4)
 └────────────────────── prefixo da entidade (4)
```

⚠ **Atenção ao DUNS:** é global, mas **proprietário** (D&B). Diferente do LEI, que é mantido por
fundação sem fins lucrativos com acesso aberto. Em relatório, **prefira LEI** — e cite o DUNS como
secundário, sabendo que ele é comercial.

---

## 2.3 Telefone: E.164 e as armadilhas nacionais

O Módulo 5 é o aprofundamento; aqui, o que você precisa para **ler** o dado.

```
+55 11 98765-4321
└┬┘ └┬┘ └───┬────┘
 │   │      └──────── assinante
 │   └─────────────── área local (DDD no Brasil)
 └─────────────────── código de país (E.164)
```

| Armadilha | Exemplo | Por que confunde |
|---|---|---|
| Código de país **não** é área | `+1` cobre EUA **e** Canadá | Não dá para saber o país só pelo `+1` |
| Zero de tronco **não** existe em E.164 | `011` em São Paulo | No formato internacional é `+55 11` |
| Dígito de operadora no Brasil | `0 15` antes do DDD | **Legado**, não existe em E.164 |
| Comprimento varia | Alemanha varia de 4 a 11 dígitos após `+49` | Não há regra universal de tamanho |
| Zero à esquerda é significativo | `+44 20 7...` | Remover o zero quebra a área |

⚠ **A consequência prática:** sem **normalizar** para E.164, a busca falha. `011 98765-4321`,
`+55 11 98765 4321` e `(11) 98765-4321` são **o mesmo número** — e uma base de dado pode ter
qualquer uma das formas.

```bash
# Normalização com a biblioteca oficial do Google (libphonenumber)
pip3 install phonenumbers
python3 - <<'PY'
import phonenumbers

entradas = ["+55 11 98765-4321", "011 98765-4321", "(11) 98765 4321",
            "0049 30 901820",      # Alemão, com prefixo internacional
            "+44 20 7946 0958",    # Reino Unido
            "+1 202 555 0142"]     # EUA

for e in entradas:
    try:
        # Sem região explícita, o libphonenumber exige o "+"
        p = phonenumbers.parse(e, None) if e.startswith("+") else \
            phonenumbers.parse(e, "BR")
        print(f"{e:<22} E.164={phonenumbers.format_number(p, phonenumbers.PhoneNumberFormat.E164):<16} "
              f"país={phonenumbers.region_code_for_number(p)}  "
              f"tipo={phonenumbers.number_type(p).name}")
    except Exception as ex:
        print(f"{e:<22} ERRO: {ex}")
PY
```

⚠ **Note que o `0049` é alemão e o `011` foi interpretado como brasileiro.** A normalização exige
que você saiba **de onde** o número vem — e é por isso que ela é parte do método, não um detalhe.

---

## 2.4 Nome de pessoa: o identificador mais difícil

Nome não tem estrutura internacional. É o identificador com mais variação e menos garantia.

| Problema | Exemplo |
|---|---|
| **Transliteração** | `Dmitri` / `Dmitry` / `Dmitrij` / `Dmytro` |
| **Ordem** | Japão, Coreia, Hungria: sobrenome primeiro |
| **Partícula** | `van`, `von`, `de`, `bin`, `al-` mudam de posição |
| **Nome de casamento** | Espanha e Portugal usam dois sobrenomes |
| **Patronímico** | Rússia, Islândia: nome do meio é do pai |
| **Sem espaço** | Chinês, coreano, japonês (em romaji, varia) |
| **Status de registro** | Alemanha distingue `Geburtsname` de `Familienname` |

⚠ **A regra prática:** busque o nome **em múltiplas formas** e, quando possível, **pela forma
nativa** (caractere original) **e** pela romanizada. Um nome russo pode estar em cirílico, em
transliteração ISO, em transliteração anglo-saxônica, ou em BGN/PCGN — todas corretas, todas
diferentes.

⚠ **E o inverso também vale:** se você não encontra nada por um nome, **tente outras
transliterações antes de concluir que a pessoa não existe**. "Não encontrei" com uma grafia só não
é "não existe".

---

## 2.5 Montando o mapa de decisão

O entregável do módulo: uma **árvore de decisão** que você constrói e usa.

```
IDENTIFICADOR
     │
     ├── TEM CÓDIGO DE PAÍS VISÍVEL? ──── SIM ──▶ jurisdição conhecida
     │        (+55, .de, DE, IBAN)                  │
     │                                              ▼
     │                                     CLASSE DE FONTE
     │                                     ├─ telefone → registro/operadora (M5)
     │                                     ├─ empresa  → registro nacional (M6)
     │                                     ├─ domínio  → registro de TLD (M7)
     │                                     └─ conta    → estrutura IBAN
     │
     └── NÃO TEM? ──────────────────────▶ o que dá contexto
              (nome, apelido, imagem)     ├─ idioma do texto
                                          ├─ TLD que a pessoa usa
                                          ├─ fuso da atividade
                                          ├─ moeda/endereço
                                          └─ aparência de registro local
```

⚠ **A tese do curso está nesse diagrama:** o caminho **da esquerda** é o caso fácil — o dado diz
onde procurar. O caminho **da direita** é o trabalho real: **inferir a jurisdição a partir de
contexto**.

⚠ **E há o caso misto, que é o mais comum:** você tem um nome e um fragmento. "Lena Müller, escreve
em alemão, tem blog em `.de`, recebe em euro". Isso **não é prova** de que está na Alemanha —
Müller existe na Áustria e na Suíça, e a pessoa pode morar em qualquer lugar. É **hipótese**, com
confiança declarada (Módulo 1, §1.2).

---

## 2.6 LAB — Construa o seu mapa de decisão

**Duração:** 90 min

⚠ **Sem alvo real.** Você constrói a ferramenta de trabalho.

### Passo 1 — Reconhecimento de formato (25 min)

Para **cada** identificador abaixo, escreva **o que ele já diz**, **antes** de qualquer consulta:

| Identificador | Tipo | Jurisdição | O que mais ele diz |
|---|---|---|---|
| `+351 21 123 4567` | | | |
| `+81 3 1234 5678` | | | |
| `FR 12 345678901` | | | |
| `HRB 12345 B` | | | |
| `Company Number 09876543` | | | |
| `IBAN NL91ABNA0417164300` | | | |
| `LEI 5493001KJTIIGC8Y1R12` | | | |
| `CIF A12345678` | | | |
| `.io` | | | |
| `SIRET 12345678900012` | | | |

⚠ **Confirme com o que você aprendeu**, e use a estrutura:
- `+351` = Portugal · `+81` = Japão · `FR` = França (VAT) · `HRB` = registro comercial alemão ·
  `Company Number` de 8 dígitos = Reino Unido · `IBAN` mostra país nos 2 primeiros ·
  `A` em CIF espanhol = pessoa jurídica · `.io` = TLD, historicamente do território britânico do
  Oceano Índico, hoje comercial.

### Passo 2 — Aplique a normalização (25 min)

```bash
mkdir -p ~/osint-lab/lab2 && cd ~/osint-lab/lab2

python3 - <<'PY'
import phonenumbers
from phonenumbers import geocoder, carrier, number_type

# IMPORTANTE: sem o "+", a região é obrigatória — é por isso que
# o método exige saber de onde o número vem.
casos = [
    ("+55 11 98765-4321", None),        # já em E.164
    ("011 98765-4321",    "BR"),        # forma local brasileira
    ("+49 30 901820",     None),
    ("030 901820",        "DE"),        # forma local alemã
    ("+44 20 7946 0958",  None),
    ("020 7946 0958",     "GB"),
    ("+1 202 555 0142",   None),
    ("+81 3 1234 5678",   None),
]

print(f"{'ENTRADA':<22} {'E.164':<18} {'PAÍS':<6} {'TIPO':<16} LOCALIZAÇÃO")
print("-" * 95)
for entrada, regiao in casos:
    try:
        p = phonenumbers.parse(entrada, regiao)
        e164 = phonenumbers.format_number(p, phonenumbers.PhoneNumberFormat.E164)
        pais = phonenumbers.region_code_for_number(p)
        tipo = number_type(p).name
        loc  = geocoder.description_for_number(p, "pt") or "-"
        ok   = phonenumbers.is_valid_number(p)
        print(f"{entrada:<22} {e164:<18} {str(pais):<6} {tipo:<16} {loc}  "
              f"{'' if ok else '⚠ INVÁLIDO'}")
    except Exception as e:
        print(f"{entrada:<22} ERRO: {e}")
PY
```

Produza `normalizacao.md`:

| Entrada | E.164 | País | Tipo | Válido? |
|---|---|---|---|---|
| | | | | |

**Responda:**

1. Qual entrada **falhou** sem a região explícita? **Por que o método exige saber a origem?**
2. A localização retornada é a **cidade exata**? Se não, o que ela é de fato?
3. Por que `+1 202 555 0142` retorna país `US` e não `CA`? **O que isso diz sobre `+1`?**
4. O tipo detectado (`MOBILE`, `FIXED_LINE`) é garantido? Por quê não?

⚠ **A resposta 4 é importante:** na maioria dos países, a faixa **pode** ser reaproveitada, e no
Brasil a **portabilidade** significa que o tipo histórico pode não corresponder ao uso atual.

### Passo 3 — Árvore de decisão própria (30 min)

Produza `arvore.md` — a sua ferramenta de trabalho, na forma:

```markdown
# Árvore de decisão: identificador → fonte

## Ramo 1 — Telefone
Estrutura: [+código de país][área][assinante]
1. Normalizar para E.164
2. Identificar país → portabilidade e operadora são POR PAÍS (Módulo 5)
3. Se o país for desconhecido: inferir por idioma/contexto, declarar confiança

## Ramo 2 — Empresa
1. Existe identificador nacional? (CNPJ, VAT, HRB, SIREN...) → jurisdição direta
2. Só o nome? → inferir país, e usar [registro nacional — Módulo 6]
3. Existe LEI? → GLEIF resolve em qualquer país
4. Offshore? → estrutura de propriedade é o problema, não o registro (Módulo 6)

## Ramo 3 — Domínio
1. TLD diz a jurisdição DO REGISTRO, não do dono ← ⚠ cuidado
2. .com/.io/.net são globais → o registro é o ICANN/registrador, não o país
3. Pivô: certificado (crt.sh), ASN, histórico (Módulo 7)

## Ramo 4 — Pessoa
1. Nome não é identificador único
2. Buscar em múltiplas transliterações
3. ⚠ Verificar limite legal ANTES (Módulo 10)

## Ramo 5 — Imagem / local
1. Metadado primeiro (EXIF)
2. Depois: conteúdo — placa, sinal, arquitetura, vegetação (Módulo 8)
```

**Depois responda:**

1. Qual ramo é o **mais fácil**? Por quê?
2. Qual é o **mais difícil**? Por quê?
3. Em qual ramo a **jurisdição pode enganar** mais? (Dica: `.com` e `.io`.)
4. Você acrescentou algum ramo que o modelo não tinha? Qual?

### Passo 4 — O caso do identificador enganoso (10 min)

Responda por escrito:

1. Uma empresa tem site em `.io` e sede em Singapura. `.io` diz alguma coisa sobre a empresa?
2. Um número `+1` pode ser de qual país? Quantos?
3. `DE` como prefixo de VAT — pode aparecer em empresa que não é alemã?

⚠ **As três respostas têm o mesmo formato:** *"pode, em alguns casos — o identificador sugere,
não determina"*. Confiança declarada, sempre.

### Critérios de aceitação

- A tabela do Passo 1 preenchida **sem consulta**, só pela estrutura.
- `normalizacao.md` com o `phonenumbers` rodado e o resultado real.
- Você explicou por que a região explícita é necessária quando falta o `+`.
- `arvore.md` com os cinco ramos e as respostas às quatro perguntas.
- Você identificou o ramo em que a **jurisdição engana mais** — e explicou por quê.
- Você respondeu as três perguntas do Passo 4 no formato "sugere, não determina".
- Nenhuma consulta a pessoa real.

---

## Avaliação

1. Por que "ler o identificador antes de buscar" é o hábito central do módulo?
2. O que `+55 11 98765-4321` já diz, sem consulta? E `+49 30 901820`?
3. Por que o **zero de tronco** quebra uma busca internacional?
4. Explique por que `+1` não permite determinar o país.
5. O que é o LEI, para que ele serve, e por que ele é a resposta global a um problema global?
6. Por que preferir LEI a DUNS em relatório? Qual a diferença estrutural entre os dois?
7. Cite cinco armadilhas de telefone e o efeito de cada uma numa busca.
8. Por que nome é o identificador mais difícil? Cite quatro problemas estruturais.
9. Por que "não encontrei com uma grafia" **não é** "não existe"? O que você faz antes de concluir?
10. Descreva a sua árvore de decisão para empresa. Onde o LEI entra?
11. Por que `.io` não diz nada sobre a jurisdição da empresa? O que ele diz?
12. Complete: "o identificador ____, não ____". Por que a confiança declarada é obrigatória aqui?

---

**Próximo:** [Módulo 3 — Busca avançada e superfície oculta](modulo-03.md)
