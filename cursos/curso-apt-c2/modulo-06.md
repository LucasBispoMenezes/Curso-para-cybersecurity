# Módulo 6 — Infraestrutura: Mapeamento por Fonte Aberta

**Carga:** 4 horas (1h15 teoria · 2h45 lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Mapear infraestrutura de ator usando **apenas** fonte pública e consulta passiva.
2. Analisar domínio: registro, histórico, nameserver, padrão de nomenclatura.
3. Analisar certificado e usar transparência de certificado para correlação.
4. Correlacionar por ASN, provedor e bloco de endereço.
5. Escrever um produto de infraestrutura com **confiança declarada** e **limites declarados**.

---

## ⚠ A regra deste módulo, sem exceção

**Toda análise é passiva.** Você consulta o que terceiros já publicaram. Você **não** toca na
infraestrutura.

| Fazer | **Não fazer** |
|---|---|
| `whois`, `dig` em registro histórico | Conectar ao host analisado |
| Consultar `crt.sh`, VirusTotal, urlscan | Enviar requisição ao domínio |
| Ler certificado já registrado por terceiro | Abrir `openssl s_client` contra o host do ator |
| Correlacionar por ASN e provedor | Varredura de faixa |
| Ler relatório público | Qualquer interação |

⚠ **"Testar se está no ar" é interação.** Uma única requisição ao domínio do adversário é
contato — ele vê seu IP, e você se anunciou. Isso vale para o profissional e para o estudante.

⚠ **Toda consulta registra você.** `crt.sh`, VirusTotal e `whois` mantêm log. Em contexto real,
consulte dentro da política da organização — e saiba que o adversário frequentemente monitora
quem pesquisa a infraestrutura dele.

⚠ **Não use este módulo para chegar a uma vítima.** Se o mapeamento de infraestrutura levar a
identificar quem foi atacado, esse dado é sensível: minimização, sigilo, e **jamais** em produto
TLP:CLEAR (Módulo 2).

---

## 6.1 Por que mapear infraestrutura

O mapeamento serve a **três** finalidades defensivas, e nenhuma delas é atacar:

| Finalidade | O que você ganha |
|---|---|
| **Correlação** | "Esta infraestrutura já apareceu em outro caso" — liga campanhas |
| **Antecipação** | Padrão de registro do ator permite **identificar o próximo domínio antes do uso** |
| **Atribuição** | Provedor, região, cuidado operacional — contexto (Módulo 9) |

⚠ **A finalidade "antecipação" é a mais valiosa e a mais subestimada.** Se você descobre que um
ator registra domínio sempre com o mesmo provedor, mesmo padrão de nome, e mesmo certificado,
você pode **monitorar o padrão** — e detectar o domínio **antes** de ele ser usado contra você.

**Isso é defesa proativa real**, e não requer tocar em nada.

---

## 6.2 Domínio: o que cada elemento revela

```bash
# WHOIS — registro
whois exemplo-desconhecido.tld

# Nomes de servidor
dig +short NS exemplo-desconhecido.tld
dig +short A exemplo-desconhecido.tld
dig +short MX exemplo-desconhecido.tld
dig +short TXT exemplo-desconhecido.tld

# Delegação e histórico
dig +trace exemplo-desconhecido.tld
```

### A tabela do que analisar

| Elemento | O que olhar | O que revela |
|---|---|---|
| **Data de criação** | Idade do domínio | **Registro novo é forte indício** em contexto de campanha |
| **Data de atualização** | Mudança recente | Ator ativo, reformulando infraestrutura |
| **Registrador** | Quem vendeu | Provedor barato vs. cuidadoso |
| **Privacidade do WHOIS** | Mascarado? | Quase universal hoje — pouco discriminante |
| **Nameserver** | Qual provedor de DNS | **Padrão do ator** se recorrente |
| **País do NS** | Geografia da hospedagem | Contexto, nunca prova |
| **Registrante em massa** | Mesmo registrante, vários domínios | **Correlação: blocos de campanha** |
| **Padrão de nome** | Estrutura, comprimento, entropia | Automação de registro |
| **MX** | Tem e-mail? | Domínio com e-mail é diferente de descartável |
| **TXT** | Verificação, SPF | Pode revelar serviço usado |

### O padrão de nomenclatura — o achado mais útil

```
Caso didático — domínios ligados à mesma campanha:

  cdn-entrega-segura.tld
  cdn-entrega-expressa.tld
  cdn-entrega-rapida.tld
       └── mesma estrutura, mesmo prefixo, mesmo sufixo temático

  d-b2c7f1.tld
  d-9a4e08.tld
  d-3f1c55.tld
       └── prefixo fixo + sufixo hex de 6 → geração automatizada

  empresa-nome-real.tld
       └── imita marca legítima (typosquatting ou combosquatting)
```

| Padrão | O que indica | Uso defensivo |
|---|---|---|
| Estrutura repetida + tema | Mesmo operador, geração por template | Regra de detecção por padrão |
| Prefixo + hex aleatório | **Geração automatizada** | Detecção por regex de nome |
| Imita marca legítima | Engano de vítima | Bloqueio por similaridade |
| Palavra temática ("segura", "entrega") | Engenharia social | Conscientização e filtro |

⚠ **A detecção por padrão de nome é a mais durável deste módulo.** Enquanto o ator usa o mesmo
template, sua regra pega o **próximo** domínio. E templates mudam devagar — diferente de
indicador, que muda a cada campanha.

---

## 6.3 Certificado: a fonte de correlação mais poderosa

TLS precisa de certificado, e certificado é **público e registrado** — inclusive o histórico.
A **transparência de certificado** (Certificate Transparency) é um log público obrigatório. Isso
significa: todo certificado emitido para um domínio **está registrado em log público**.

### O que você extrai de um certificado

```bash
# Se você tem certificado coletado por terceiro (arquivo), analise o arquivo:
openssl x509 -in cert.pem -noout -subject -issuer -dates -ext subjectAltName

# Análise de certificado obtido em fonte de análise pública:
echo | openssl x509 -noout -text -in cert.pem | head -40
```

| Campo | O que revela |
|---|---|
| **CN / SAN** | Nomes cobertos — frequentemente **outros domínios do mesmo ator** |
| **Emissor (CA)** | Let's Encrypt grátis vs. CA paga; **padrão do ator** |
| **Validade** | Curtíssima = automação e descartável; longa = recurso |
| **Algoritmo / chave** | Padrão de geração |
| **Número de série** | Correlação entre certificados |
| **Fingerprint** | Identificador estável para correlação e para IOC durável |
| **Data de emissão** | **Revela o início da operação** — frequentemente antes do uso |

⚠ **A linha "data de emissão" é ouro.** A emissão do certificado é um evento **registrado e
público**, e frequentemente acontece antes de o domínio ser usado. **Isso permite detectar
infraestrutura preparada** — o ator registra, emite certificado, e o defender que monitora o
padrão **vê antes do ataque**.

### SAN — a correlação entre domínios

```
Subject Alternative Name:
    DNS: cdn-entrega-segura.tld
    DNS: cdn-entrega-expressa.tld
    DNS: api-entrega-segura.tld
```

⚠ **Um certificado com vários nomes do mesmo operador é achado de alto valor.** Ele revela de
uma vez **múltiplos domínios da mesma campanha** — e o método de correlação se chama "pivô por
certificado": você pega o fingerprint de um, busca o certificado, e encontra os irmãos.

### Consulta em transparência de certificado

```bash
# Consulta em fonte pública (a API é pública; você consulta, não toca no domínio do ator)
curl -s "https://crt.sh/?q=exemplo-desconhecido.tld&output=json" | \
  jq -r '.[] | [.common_name, .issuer_name, .not_before, .entry_timestamp] | @tsv' | \
  sort -u | head -20
```

⚠ **A consulta é ao `crt.sh`, não ao domínio analisado.** Isso é passivo — o `crt.sh` é o log
público, e o domínio do ator não toma conhecimento.

```bash
# Pivô por CA: busca por organizações que emitiram para um padrão
# (a API aceita busca por nome, e você filtra o resultado)
curl -s "https://crt.sh/?q=%25.exemplo-desconhecido.tld&output=json" | \
  jq -r '.[].name_value' | sort -u
```

---

## 6.4 ASN, provedor e bloco

```bash
# A qual rede um IP pertence
whois 203.0.113.7 | grep -iE 'orgname|netname|country|descr|CIDR'

# ASN — a "organização" do IP
# Ferramenta: whois contra serviço de ASN, ou base pública de mapeamento
whois -h whois.cymru.com " -v 203.0.113.7"
```

### A tabela de correlação por infraestrutura

| Elemento | Padrão que indica | Uso |
|---|---|---|
| **ASN recorrente** | Ator prefere certo provedor | Bloqueio/monitoramento desse ASN (com cuidado) |
| **Bloco /24 próprio** | Recurso: registrou faixa inteira | Contexto de capacidade |
| **Hospedagem em VPS barata** | Pouco recurso | Menor sofisticação |
| **Nuvem de grande provedor** | Recurso e boa reputação | Difícil de bloquear |
| **Mesmo /24 em várias campanhas** | Operador consistente | **Correlação** |
| **Região geográfica consistente** | Escolha deliberada | Contexto para atribuição |
| **Mudança de provedor entre campanhas** | Operação profissional | Dificulta correlação por ASN |

⚠ **Bloquear por ASN é arriscado.** Um ASN de nuvem grande hospeda milhares de serviços
legítimos. Bloquear o ASN de um provedor popular quebra a sua operação. **Correlacione por ASN;
não bloqueie por ASN** — a menos que seja um bloco pequeno e dedicado, e mesmo aí com avaliação.

---

## 6.5 O produto de infraestrutura

O entregável é um documento com **duas colunas que a maioria esquece: confiança e limite.**

```markdown
TLP:AMBER                 (considere: há vítima identificável?)

# Infraestrutura atribuída a [campanha]
Data: 2026-10-18   Analista: <nome>

## 1. Objeto
O que foi analisado e por quê.

## 2. Indicadores
| Tipo | Valor | Fingerprint | Primeira observação | Confiança |
|---|---|---|---|---|

## 3. Correlação
Por qual pivô (certificado, NS, registrante, padrão de nome, ASN).
E a força de cada correlação.

## 4. Padrão observado
O template, o provedor, o CA, a região.

## 5. Avaliação
  Confiança: [alta / moderada / baixa]
  Raciocínio: ...

## 6. O que NÃO se pode concluir
  ...

## 7. Ação recomendada
  · Detecção por padrão: [regex de nome, fingerprint de CA, provedor]
  · Bloqueio: [vale a pena? o que quebra?]
  · Monitoramento: [o que observar]

## 8. Fontes
```

⚠ **A seção 6 é obrigatória e é a que separa produto de adivinhação.** Ela responde:
*"que conclusão alguém poderia tirar daqui que o dado NÃO sustenta?"*

Exemplos reais do que vai nessa seção:

- "A geografia do provedor **não indica** a origem do operador; ele pode contratar em qualquer lugar."
- "A correlação por certificado **não prova** mesmo operador; a CA é gratuita e acessível a todos."
- "O padrão de nome **é consistente com** outro caso, mas **não é exclusivo** desta campanha."
- "**Não foi possível** determinar se este domínio foi usado contra outras vítimas."

---

## 6.6 LAB — Produto de infraestrutura com confiança declarada

**Duração:** 165 min

⚠ **Este lab é integralmente passivo.** Nenhuma conexão ao domínio analisado. Toda consulta é a
`whois`, `dig`, `crt.sh` ou leitura de relatório.

### Passo 1 — Escolha o alvo do mapeamento (15 min)

**Opção A (recomendada, sem risco):** use um **caso didático** fornecido abaixo.

**Opção B:** use um caso real de **relatório público** — The DFIR Report, CISA advisory, vendor
research — com infraestrutura documentada.

⚠ **Se você usar caso real: analise o que o relatório já publicou.** Não consulte o domínio, não
resolva, não conecte. Você está analisando **infraestrutura que já é histórica e documentada**, e
aplica o método ao que já está no relatório.

<details>
<summary>Caso didático — "Campanha de três domínios" (construído para o curso)</summary>

```
Relatório público de terceiro descreve:

  cdn-entrega-segura.example-tld
      criado: 2026-09-14
      registrador: provedor de baixo custo
      NS: ns1.dns-barato.example-tld
      certificado: Let's Encrypt, emitido 2026-09-15
        SAN: cdn-entrega-segura, cdn-entrega-expressa, api-entrega-segura
      IP: 203.0.113.7 em ASN de VPS pequena, região: Europa Oriental
      uso: C2 do implante, check-in a cada 5 min

  cdn-entrega-expressa.example-tld
      criado: 2026-09-14 (mesmo dia)
      mesmo registrador, mesmo NS
      mesmo certificado (SAN compartilhado)

  api-entrega-segura.example-tld
      criado: 2026-10-02
      mesmo registrador
      mesmo NS
      certificado próprio: Let's Encrypt, emitido 2026-10-03
      IP: 203.0.113.42, mesmo /24, mesmo ASN
      uso: descrito no relatório como "estágio seguinte da operação"
```
</details>

### Passo 2 — Colete (60 min)

Para cada domínio do caso, produza `coleta-infra.md`:

| Domínio | Criado | Registrador | NS | CA | Emitido | SAN | IP | ASN | Região |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

**Se você tiver acesso a `crt.sh`**, consulte pelo nome do domínio (é o log público, não o
domínio do ator):

```bash
for d in cdn-entrega-segura.example-tld cdn-entrega-expressa.example-tld; do
    echo "=== $d ==="
    curl -s "https://crt.sh/?q=${d}&output=json" 2>/dev/null | \
      jq -r '.[] | [.common_name, .issuer_name, .not_before] | @tsv' 2>/dev/null | \
      sort -u | head -10
done
```

⚠ Se `crt.sh` retornar vazio, é esperado — domínios didáticos não existem. **O método é o
entregável, não o resultado.** Documente o comando que você rodaria e o que procuraria.

### Passo 3 — Correlacione (45 min)

Produza `correlacao.md`:

| Pivô | Valor | Domínios ligados | Força da correlação | Por que a força é essa |
|---|---|---|---|---|
| Certificado (fingerprint) | | | | |
| SAN compartilhado | | | | |
| Nameserver | | | | |
| Registrador | | | | |
| Padrão de nome | | | | |
| ASN / bloco | | | | |
| Data de criação | | | | |

**Responda — e esta é a parte central do lab:**

1. Qual pivô produz correlação **mais forte**? Justifique.
2. Qual pivô produz **mais falso positivo**? Por quê?
3. Dois domínios criados **no mesmo dia** com o mesmo NS e o mesmo certificado — qual a força da
   correlação? **O que poderia produzir o mesmo padrão sem ser o mesmo operador?**
4. O terceiro domínio foi criado **18 dias depois** dos outros. Isso enfraquece a correlação? Como?
5. O ASN é de VPS pequena. **Isso prova** que o operador está naquela região? Justifique.

⚠ **A resposta 3 é a mais importante.** Mesmo certificado e mesmo NS **não prova** o mesmo
operador: uma CA gratuita e um provedor de DNS barato estão acessíveis a qualquer um. A
correlação é **consistente com**, não **prova de**.

### Passo 4 — Escreva o padrão detectável (30 min)

O entregável de maior valor durável:

```markdown
## Padrão observado

Nome: [estrutura do nome, com as partes fixas e as variáveis]
   Ex.: cdn-entrega-{palavra}.example-tld
   Ex.: d-{hex6}.example-tld

Provedor de DNS: [qual]
CA: [qual]
Região/bloco: [qual]
Criação: [padrão temporal, se houver]

## Regra de detecção por padrão

### 1. Padrão de nome (regex)
   ^cdn-entrega-[a-z]+\.example-tld$
   ^d-[0-9a-f]{6}\.example-tld$

### 2. Pivô de certificado
   CA = [X]  AND  primeiro domínio do SAN casa o padrão de nome

### 3. Consulta periódica
   Rodar semanalmente: consultar transparência de certificado por
   emissor + padrão, listar domínios NOVOS desde a última execução.

## O que isso detecta ANTES do uso
   Domínio registrado, certificado emitido, sem tráfego ainda
   → você tem a chance de bloquear antes do primeiro check-in

## Falso positivo esperado
   [quem legitimamente tem esse padrão]
```

⚠ **A seção "detecta ANTES do uso" é o ponto do lab inteiro.** Monitorar transparência de
certificado por padrão permite **antecipar** infraestrutura preparada. É defesa proativa que não
toca em nada.

### Passo 5 — O produto (15 min)

Produza `produto-infra.md` seguindo **exatamente** o modelo da seção 6.5, com:

- Todas as oito seções.
- **Confiança declarada** na avaliação.
- **Seção 6 (o que não se pode concluir)** com pelo menos **quatro** itens.
- Marcação TLP justificada — e considere se há vítima identificável no caso.

### Critérios de aceitação

- `coleta-infra.md` com os dez campos por domínio.
- `correlacao.md` com **força declarada** em cada pivô e a justificativa.
- Você respondeu o que **além** do mesmo operador poderia produzir o mesmo padrão de correlação.
- Você explicou por que ASN **não prova** geografia do operador.
- Padrão detectável escrito com **regex** e com o pivô de certificado.
- Você explicou o que a técnica detecta **antes** do uso do domínio.
- `produto-infra.md` com as oito seções e **quatro** itens na seção de limitações.
- TLP justificado considerando identificabilidade da vítima.
- **Nenhuma conexão** ao domínio analisado. Nenhum `dig` contra o nome, nenhum `openssl` contra o
  host, nenhum `curl` ao domínio.

---

## Avaliação

1. Cite as três finalidades defensivas do mapeamento de infraestrutura.
2. Por que "antecipação" é a finalidade mais valiosa, e como ela funciona?
3. Por que "testar se está no ar" é interação proibida, e não análise?
4. Cite seis elementos do WHOIS e o que cada um revela.
5. Por que padrão de nomenclatura é o achado mais durável do módulo?
6. Por que um domínio registrado **recentemente** é indício forte em contexto de campanha?
7. Explique o que é transparência de certificado e por que ela é uma fonte poderosa.
8. Por que a **data de emissão do certificado** é informação de ouro para defesa proativa?
9. O que é o SAN e como ele permite correlacionar domínios de uma só vez?
10. Por que correlação por mesmo certificado **não prova** o mesmo operador?
11. Por que bloquear por ASN é arriscado? O que fazer em vez disso?
12. Por que a seção "o que não se pode concluir" é obrigatória em produto de inteligência?
13. Escreva um item que pertenceria a essa seção, sobre geografia de provedor.

---

**Próximo:** [Módulo 7 — Detecção contra TTP de APT](modulo-07.md)
