# Módulo 1 — Método: A Pergunta Antes da Ferramenta

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** curso de redes; OSINT Global (módulo 7)

---

## Objetivos

1. Distinguir enumeração **confirmatória** de enumeração **exploratória**.
2. Montar a matriz **pergunta → método → fonte**.
3. Entender por que a ferramenta padrão tem ponto cego estrutural.
4. Reconhecer quando a ferramenta está respondendo a pergunta **errada**.
5. Definir escopo e autorização antes de qualquer consulta.

---

## ⚠ Antes de qualquer coisa

⚠ **Enumeração é reconhecimento.** É a fase que precede ataque — e feita sem autorização, é ilegal
**independente de você ter atacado ou não**.

| Permitido | Proibido |
|---|---|
| **Domínio seu** | Domínio de terceiro |
| **Lab próprio** | Qualquer coisa sem autorização |
| **Bug bounty com escopo público** | Fora do escopo |
| **Cliente com contrato assinado** | Sem contrato |

⚠ **E o risco prático:** brute force contra resolvedor público é **abuso de recurso alheio**. Não é
"reconhecimento inofensivo" — é consumo de infraestrutura de terceiro.

---

## 1.1 Confirmatória versus exploratória

⚠ **A distinção que organiza o curso inteiro.**

| | Confirmatória | **Exploratória** |
|---|---|---|
| Pergunta | "A porta 22 está aberta?" | **"O que eu não sei que existe?"** |
| Técnica | Varredura de lista | **Correlação de fonte** |
| Cobertura | O que você já suspeita | **O que ninguém mapeou** |
| Ferramenta típica | `nmap`, `gobuster` | `crt.sh`, CDX, `TXT`, PTR |
| Resultado | Confirmação | **Descoberta** |

⚠ **A enumeração rasa é confirmatória.** Ela responde perguntas que você já sabia formular: varrer
uma faixa, testar nomes de uma wordlist, olhar as portas conhecidas. **Ela confirma.**

⚠ **A enumeração esotérica é exploratória.** Ela parte de **outra pergunta**: *"que ativo esta
organização tem que ela mesma não lembra que tem?"* — e usa fonte que **ninguém pensou em
consultar**.

⚠ **A consequência prática:** o ativo mais perigoso não é o que você deixou aberto conscientemente.
É o que você **esqueceu que existia** — um subdomínio de um projeto de 2019, um bucket de teste, um
repositório antigo, um servidor de homologação que ficou em produção.

---

## 1.2 A matriz pergunta → método → fonte

O entregável central do módulo.

| # | A pergunta | O método | A fonte |
|---|---|---|---|
| 1 | Que hosts a organização tem? | Certificado | **CT logs** (`crt.sh`) |
| 2 | Que nome ela esqueceu? | `TXT` + zona | DNS autoritativo |
| 3 | Que serviço está atrás da CDN? | PTR + bloco | `whois`, DNS reverso |
| 4 | Que arquivo ela removeu? | Arquivo morto | **CDX API** |
| 5 | Que página ninguém linka? | Índice + `robots` | `robots.txt`, `sitemap` |
| 6 | Que ambiente ela usa? | Registro de serviço | `TXT`, CNAME, ASN |
| 7 | Que credencial vazou? | Histórico | Commit, gist, paste |
| 8 | Quem é o dono? | Registro | WHOIS, OpenCorporates, LEI |
| 9 | Que vizinho existe? | Bloco adjacente | ASN, `whois` de IP |
| 10 | Que terceiro ela usa? | Padrão de nome | Bucket, painel, CDN |

⚠ **Decore a estrutura, não a tabela.** As dez perguntas se agrupam em **quatro famílias**:

| Família | Perguntas | Fonte dominante |
|---|---|---|
| **Nome** | 1, 2, 4, 5 | DNS e CT logs |
| **Rede** | 3, 9 | ASN e PTR |
| **Serviço** | 6, 10 | Registro e padrão |
| **Identidade** | 7, 8 | Repositório e registro |

⚠ **E há uma propriedade que faz a tabela valer:** **cada resposta gera a próxima pergunta.** Um
certificado (1) revela um nome (2), que revela um serviço (6), que revela um terceiro (10), cujo
registro revela o dono (8). **A enumeração esotérica é uma cadeia, não uma lista.**

```
CT log ──▶ host novo ──▶ TXT de verificação ──▶ serviço de terceiro
                                                       │
                                                       ▼
                                              bucket/tenant exposto
                                                       │
                                                       ▼
                                              registro → dono → outro bloco
```

⚠ **É o mesmo princípio do Diamond Model, do curso de OSINT:** o valor não está em cada vértice —
está na **relação**. Aqui, a relação é "o que isto me permite perguntar em seguida".

---

## 1.3 O ponto cego estrutural da ferramenta

⚠ **Por que a ferramenta padrão não cobre isto.**

| Ferramenta | O que ela faz | O que ela **não** consegue |
|---|---|---|
| `nmap` | Varre porta de IP que você deu | **Descobrir o IP** |
| `gobuster` / `ffuf` | Testa palavra de wordlist | **Sair da wordlist** |
| `whois` | Consulta registro | **Correlacionar** registro com certificado |
| `crt.sh` (manual) | Lista certificado | **Cruzar** com DNS e ASN |
| Scraper de página | Lê o que está linkado | **Ler o que foi removido** |

⚠ **O ponto cego é sempre o mesmo: a ferramenta opera sobre a entrada que você deu.** Ela não
**gera** a entrada. Descobrir **que** enumerar é trabalho humano, e é o que este curso ensina.

⚠ **E é por isso que "usar a ferramenta certa" não resolve.** Você pode ter as dez melhores
ferramentas e continuar enumerando o óbvio — porque a ferramenta recebe o que você já sabia.

---

## 1.4 A pergunta que gera a próxima

⚠ **O exercício mental que treina o método.**

```
Você tem: exemplo.com

╔══════════════════════════════════════════════════════════╗
║ PERGUNTA 1: que outros nomes existem?                    ║
║ MÉTODO:     CT logs                                      ║
║ RESPOSTA:   api-dev.exemplo.com, staging.exemplo.com     ║
╚══════════════════════════════════════════════════════════╝
                        │
                        ▼
╔══════════════════════════════════════════════════════════╗
║ PERGUNTA 2: para onde staging aponta?                    ║
║ MÉTODO:     CNAME                                         ║
║ RESPOSTA:   staging.exemplo.com → exemplo-staging.       ║
║             herokudns.com  ║
╚══════════════════════════════════════════════════════════╝
                        │
                        ▼
╔══════════════════════════════════════════════════════════╗
║ PERGUNTA 3: o ambiente de nuvem aceita nome novo?        ║
║ MÉTODO:     parse                     ║
║ RESPOSTA:   ⚠ o nome derivado está disponível —           ║
║             take-over possível                            ║
╚══════════════════════════════════════════════════════════╝
```

⚠ **A pergunta 3 é a que a ferramenta nunca faria.** Ela não está em nenhuma wordlist; ela nasce
de **você ter visto o CNAME e saber o que aquilo significa.**

⚠ **E é exatamente este o tipo de achado que aparece em relatório de auditoria** — um subdomínio
que aponta para serviço desativado, e que qualquer pessoa pode reivindicar.

---

## 1.5 Escopo e autorização — antes da primeira consulta

⚠ **Este é o único módulo do material em que a primeira coisa é um documento, não um comando.**

```markdown
# Registro de escopo — enumeração

## Autorização
[ ] Ativo próprio
[ ] Contrato assinado — número: ______
[ ] Programa de bug bounty — URL do escopo: ______
[ ] Nenhuma das anteriores → **PARAR**

## Escopo declarado
| Ativo | Tipo | Dentro do escopo? |
|---|---|---|
| | domínio | |
| | faixa de IP | |
| | host específico | |

## Fora do escopo (explícito)
| Ativo | Por que fora |
|---|---|
| | |

## Limites autoimpostos
- Máximo de consultas DNS por segundo: ____
- Máximo de requisições HTTP por segundo: ____
- Resolvedor usado: ____ (local? do próprio domínio?)
- Horário permitido: ____

## O que eu NÃO vou fazer
⚠ Obrigatório:
- varredura de porta fora do escopo
- brute force contra resolvedor público
- qualquer teste que altere estado do alvo
- ...

## Registro
| Data | Consulta | Fonte | Resultado |
|---|---|---|---|
```

⚠ **A seção "limites autoimpostos" é a que evita acidente.** Sem ela, um `for` mal escrito vira
10.000 consultas DNS contra o resolvedor do provedor — e isso é abuso, ainda que você não tenha
tocado no alvo.

⚠ **E o registro de consulta é o que transforma a enumeração em entregável.** Sem data e fonte, o
achado não é reproduzível — é a mesma regra do curso de OSINT, e é o módulo 7 daqui.

---

## 1.6 LAB — A matriz, sobre alvo próprio

**Duração:** 60 min

### Passo 1 — Defina o escopo (15 min)

```bash
mkdir -p ~/enum-lab/lab1 && cd ~/enum-lab/lab1
```

Escolha **um** dos três sujeitos:

| Opção | Como |
|---|---|
| **A — Domínio próprio** | Um domínio que você registrou, ou um subdomínio de serviço gratuito que você controla |
| **B — Lab local** | O `docker-compose` com DNS + web (setup no módulo 2) |
| **C — Escopo público** | Um programa de bug bounty cujo escopo é **público e explícito** — leia o escopo antes |

⚠ **Se for a opção C, você precisa ler o escopo do programa e citar a URL.** Programa que não
declara escopo **não** é autorização.

Escreva `escopo.md` com o modelo do §1.5, **preenchido**.

**Responda:**

1. Qual sujeito você escolheu, e **qual a base da autorização**?
2. Que limites você se impôs, e por quê?
3. **O que você decidiu NÃO fazer**, mesmo estando no escopo?

### Passo 2 — Preencha a matriz para o seu caso (25 min)

Produza `matriz.md` — a matriz **aplicada ao seu alvo**, não copiada da tabela do §1.2:

| # | Pergunta aplicável ao meu alvo | Método | Fonte | Já sei a resposta? |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| ... | | | | |

⚠ **A última coluna importa.** Marque "já sei" nas perguntas que você **já** responde hoje — e
"não" nas que você vai aprender a responder. **A diferença entre as duas colunas é o curso.**

**Responda:**

1. **Quantas perguntas você já sabe responder** hoje, antes de fazer o curso?
2. Qual delas você **não sabia que era possível** perguntar?
3. Qual pergunta, no seu alvo, parece **mais promissora**? Por quê?

### Passo 3 — Faça uma consulta e registre (20 min)

⚠ **Uma consulta, feita com o método do curso.**

```bash
# Registro estruturado de consulta
registra() {
    local metodo="$1" alvo="$2" consulta="$3"
    local arq="registro.tsv"
    [ -f "$arq" ] || printf 'data\tmetodo\talvo\tconsulta\tresultado\n' > "$arq"

    printf '%s\t%s\t%s\t%s\t%s\n' \
        "$(date -Is)" "$metodo" "$alvo" "$consulta" "(ver arquivo)" >> "$arq"
}

ALVO=""     # ← o seu

if [ -z "$ALVO" ]; then
    echo "⚠ defina ALVO antes de continuar"
else
    echo "═══ consulta 1: registro do domínio ═══"
    whois "$ALVO" 2>/dev/null | grep -iE 'creat|updat|expir|registrar:|name server' | head -10

    echo
    echo "═══ consulta 2: nameserver ═══"
    dig +short NS "$ALVO"

    echo
    echo "═══ consulta 3: todos os tipos relevantes ═══"
    for t in A AAAA MX TXT CAA SOA; do
        printf '%-6s ' "$t"
        dig +short "$t" "$ALVO" 2>/dev/null | head -2 | tr '\n' ' '
        echo
    done

    registra "whois+dig" "$ALVO" "NS,A,AAAA,MX,TXT,CAA,SOA"
fi
```

Produza `primeira-consulta.md`:

| Consulta | Resultado | O que revela | Próxima pergunta que gera |
|---|---|---|---|
| WHOIS | | | |
| NS | | | |
| MX | | | |
| TXT | | | |
| CAA | | | |
| SOA | | | |

**Responda:**

1. **Qual campo gerou uma pergunta nova?** Qual?
2. O `TXT` revelou algum serviço? Qual?
3. O `MX` revelou provedor de e-mail? Próprio ou terceirizado?
4. **O `SOA` tem algum campo interessante?** (Dica: e-mail do responsável técnico.)

⚠ **A resposta 4 é um detalhe que quase ninguém olha.** O `SOA` traz o **e-mail do responsável
técnico** — que frequentemente é um endereço interno, e às vezes revela o provedor de DNS.

### Critérios de aceitação

- `escopo.md` preenchido, com a **base da autorização nomeada**.
- Você identificou **pelo menos quatro coisas que NÃO vai fazer**.
- `matriz.md` com a matriz **aplicada ao seu alvo**, com a coluna "já sei" preenchida.
- Você nomeou **qual pergunta não sabia que era possível**.
- Uma consulta real feita, com **registro em `registro.tsv`** (data, método, alvo, consulta).
- `primeira-consulta.md` com a **próxima pergunta** que cada campo gerou.
- Você olhou o `SOA` e reportou o que ele traz.
- ⚠ **Nenhuma consulta fora do escopo declarado.**

---

## Avaliação

1. Diferencie enumeração confirmatória de exploratória, com um exemplo de cada.
2. Por que o ativo mais perigoso é o que a organização **esqueceu**?
3. Cite as quatro famílias de pergunta e a fonte dominante de cada.
4. **Por que cada resposta gera a próxima pergunta?** Dê um exemplo de cadeia.
5. Qual o ponto cego estrutural da ferramenta padrão? Por que "usar a ferramenta certa" não resolve?
6. Por que o `nmap` não consegue descobrir o IP, só varrer o que você deu?
7. Descreva a cadeia `CT log → CNAME → serviço de terceiro` e onde o risco aparece.
8. Por que a enumeração é reconhecimento, e o que isso implica legalmente?
9. Por que brute force contra resolvedor público é abuso, mesmo sem tocar no alvo?
10. Que três coisas o registro de escopo precisa conter antes da primeira consulta?
11. Por que "limites autoimpostos" evita acidente? Dê um exemplo.
12. O que o campo `SOA` revela que quase ninguém olha?

---

**Próximo:** [Módulo 2 — DNS além do `A`](modulo-02.md)
