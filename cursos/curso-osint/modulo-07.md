# Módulo 7 — Domínio, Infraestrutura e Certificado

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Investigar domínio **independente do TLD**, e entender o que o TLD diz e não diz.
2. Usar `whois`, `dig` e histórico para mapear infraestrutura.
3. Fazer **pivô por certificado** — o método mais produtivo do módulo.
4. Correlacionar por ASN, provedor e bloco de endereço.
5. Distinguir relação **confirmada** de relação **sugerida**.

---

## ⚠ Conduta

⚠ **Este módulo é 100% consulta passiva.** Você consulta `whois`, `dig`, transparência de
certificado e base pública. **Você não conecta ao host analisado, não resolve contra ele, não
escaneia porta, não testa serviço.**

| Fazer | **Não fazer** |
|---|---|
| `whois`, `dig`, `crt.sh` | Conectar ao domínio |
| Ler certificado **em fonte que você já tem** | Abrir `openssl s_client` contra o host |
| Consultar histórico em base pública | Varredura de porta |
| Ler relatório de terceiro | Qualquer interação |

⚠ **A mesma regra do curso de APT/C2, Módulo 6:** análise é diferente de contato. Tocar no host
informa seu IP a ele — e em OSINT de investigação, isso pode ser exatamente o que o alvo queria
saber.

⚠ **Sujeito permitido:** domínio de **empresa ou entidade pública**, ou um domínio **seu**. Nunca
domínio pessoal de terceiro.

---

## 7.1 O que o TLD diz — e o que não diz

A confusão mais comum de OSINT de domínio.

| TLD | Diz | **Não diz** |
|---|---|---|
| `.br` | Registro é o Registro.br; pode haver exigência de presença | Que a empresa é brasileira |
| `.de` | Registro é o DENIC | Que o dono está na Alemanha |
| `.jp` | Registro japonês | Que o dono é japonês |
| **`.com`** | **Nada sobre país** — é o registro global | Qualquer coisa sobre jurisdição |
| **`.io`** | Historicamente território britânico; hoje comercial | Nada sobre o dono |
| `.co` | Colômbia no registro; usado globalmente | Que é colombiano |
| **`.onion`** | Rede Tor | Ver Módulo 6 do curso de anonimato |

⚠ **A linha `.io` é a armadilha mais comum em tecnologia.** Startups do mundo inteiro usam `.io`
porque "soa tech". O TLD **não** diz nada sobre a empresa.

⚠ **E a linha `.com` é a mais importante:** é o registro **global**, gerido por ICANN/registradores
acreditados. Não há registro nacional a consultar — você consulta o **registrador**.

### O que consultar, por camada

| Camada | Ferramenta | O que revela |
|---|---|---|
| **Registro do domínio** | `whois` | Registrante (se não mascarado), datas, nameserver, registrador |
| **Histórico do registro** | Serviço de histórico WHOIS | **Mudança de dono, de contato, de NS** |
| **Resolução** | `dig` | IP, NS, MX, TXT, CAA |
| **Certificado** | Transparência de certificado | **SAN — pivô mais produtivo** |
| **Rede** | `whois` de IP / ASN | Provedor, bloco, país |
| **Histórico de conteúdo** | CDX API (Módulo 3) | O que o site **era** |

```bash
mkdir -p ~/osint-lab/lab7 && cd ~/osint-lab/lab7

DOMINIO="exemplo.com"   # use domínio de empresa pública, ou um seu

echo "=== REGISTRO ==="
whois "$DOMINIO" 2>/dev/null | grep -iE 'creat|updat|expir|registrar:|name server|registrant' | head -20

echo
echo "=== NOMES DE SERVIDOR ==="
dig +short NS "$DOMINIO"

echo
echo "=== ENDEREÇOS ==="
dig +short A "$DOMINIO"
dig +short AAAA "$DOMINIO"

echo
echo "=== CORREIO (revela provedor de e-mail) ==="
dig +short MX "$DOMINIO"

echo
echo "=== TXT (verificação de serviço, SPF) ==="
dig +short TXT "$DOMINIO" | head -10
```

⚠ **O MX é subestimado.** Ele revela **onde o e-mail da organização é hospedado** — Google Workspace,
Microsoft 365, provedor próprio. Isso diz muito sobre a maturidade de TI e sobre o provedor.

⚠ **E o TXT revela verificação de serviço** — Google, Microsoft, provedor de CDN, serviço de
pagamento. Cada TXT de verificação é uma **integração declarada**.

---

## 7.2 Transparência de certificado — o pivô mais produtivo

Já visto nos cursos de redes e de APT. Em OSINT, é a ferramenta de correlação mais eficiente.

**Por que funciona:** TLS exige certificado. Certificado é **público e registrado em log público**
obrigatório (Certificate Transparency). E o certificado contém o **SAN** — a lista de nomes que ele
cobre.

⚠ **Um certificado com vários nomes do mesmo operador revela, de uma vez, múltiplos domínios da
mesma organização.** É o pivô.

```bash
echo "=== Certificados emitidos para um domínio ==="
curl -s "https://crt.sh/?q=${DOMINIO}&output=json" | \
  jq -r '.[] | [.common_name, .issuer_name, .not_before] | @tsv' 2>/dev/null | \
  sort -u | head -20

echo
echo "=== TODOS os nomes já cobertos (pivô principal) ==="
curl -s "https://crt.sh/?q=%25.${DOMINIO}&output=json" | \
  jq -r '.[].name_value' 2>/dev/null | tr '\n' '\n' | sort -u | head -30

echo
echo "=== Busca por ORGANIZAÇÃO no certificado (correlação) ==="
curl -s "https://crt.sh/?O=Nome+da+Empresa&output=json" | \
  jq -r '.[].name_value' 2>/dev/null | sort -u | head -20
```

⚠ **O `%25` na segunda consulta é o `%` codificado** — ele faz busca por **subdomínio curinga**, e
é o que transforma "certificado de um domínio" em "todos os nomes daquela organização".

⚠ **E a terceira consulta é a mais poderosa e a menos conhecida:** buscar **por campo de
organização (O)** no certificado. Certificado de empresa frequentemente traz o nome da organização,
e isso correlaciona **domínios de entidades diferentes do mesmo grupo**.

⚠ **O campo `O` do certificado é autodeclarado.** Não é verificado por ninguém. Um atacante pode
pôr "Microsoft" no campo `O`. **Isso é indício, não prova** — exatamente o mesmo raciocínio do SNI
no curso de anonimato.

---

## 7.3 ASN, provedor e bloco

O host onde o serviço roda conta uma história.

```bash
IP=$(dig +short A "$DOMINIO" | head -1)
echo "IP: $IP"

echo
echo "=== A qual rede o IP pertence ==="
whois "$IP" 2>/dev/null | grep -iE 'orgname|org-name|netname|country|descr|CIDR|inetnum' | head -15

echo
echo "=== ASN (organização dona do bloco) ==="
whois -h whois.cymru.com " -v ${IP}" 2>/dev/null
```

| O que o ASN revela | Interpretação |
|---|---|
| Provedor de nuvem grande | Infraestrutura moderna, ou só hospedagem |
| Datacenter pequeno, região específica | Escolha deliberada de jurisdição |
| Provedor de CDN | O IP é borda — não revela origem |
| Provedor de e-mail | Serviço terceirizado |
| Provedor residencial | Incomum para empresa |
| Bloco próprio | Recurso |

⚠ **A linha da CDN é armadilha comum.** Se o domínio está atrás de Cloudflare ou similar, o IP que
você vê é **borda da CDN**, não o servidor de origem. Toda conclusão sobre "onde a empresa hospeda"
a partir desse IP é **errada**.

⚠ **E a linha do bloco próprio:** um /24 ou maior registrado para a organização é indicação de
**capacidade**, não de tamanho — empresas grandes e pequenas têm blocos.

---

## 7.4 Correlacionar — confirmado versus sugerido

O entregável conceitual do módulo.

| Pivô | Força | O que ele **prova** |
|---|---|---|
| **Certificado compartilhado (mesmo fingerprint)** | **Forte** | Cobertura pelo **mesmo** certificado |
| **SAN compartilhado** | Forte | Emitido junto, pelo mesmo pedido |
| **Registrante idêntico no WHOIS** | Média | Mesma pessoa/entidade **declarou** |
| **Nameserver idêntico** | Média | Mesmo provedor de DNS |
| **E-mail de contato idêntico** | Média | Mesma pessoa declarou |
| **ASN idêntico** | **Fraca** | Mesmo provedor — milhares compartilham |
| **Padrão de nome** | Fraca | Sugere mesma automação |
| **Data de registro próxima** | Fraca | Sugere campanha |
| **Campo `O` do certificado** | **Fraca** | Autodeclarado, não verificado |

⚠ **A tabela tem uma lição:** o que **prova** é o que é **assinado por autoridade** — o
certificado. O resto é **declaração** (WHOIS, `O`) ou **infraestrutura compartilhada** (ASN),
que é fraca porque milhares de organizações compartilham.

⚠ **E "prova" aqui é relativa.** Mesmo certificado compartilhado prova cobertura **do mesmo
certificado** — não prova que as duas entidades têm o mesmo dono. Uma agência de marketing pode
gerenciar certificado para vários clientes.

**A formulação correta, para relatório:**

> "Os domínios A e B compartilham o mesmo certificado (fingerprint X, emitido em D). Isso é
> **consistente com** administração conjunta. **Não prova** o mesmo proprietário: o certificado
> pode ter sido emitido por prestador de serviço para clientes distintos. **Confiança: moderada.**"

---

## 7.5 LAB — Mapa de infraestrutura de uma entidade pública

**Duração:** 120 min

⚠ **Sujeito: domínio de empresa ou órgão público, ou um seu.** Nunca domínio de pessoa.

### Passo 1 — Registro e resolução (25 min)

```bash
cd ~/osint-lab/lab7
DOMINIO="<escolha um domínio público>"   # ex.: uma empresa listada, um órgão

{
echo "=== WHOIS ==="
whois "$DOMINIO" 2>/dev/null | head -40
echo
echo "=== DNS ==="
for r in NS A AAAA MX TXT CAA SOA; do
    echo "--- $r ---"
    dig +short "$r" "$DOMINIO" | head -10
done
} | tee registro.txt
```

Produza `registro.md`:

| Campo | Valor | Fonte |
|---|---|---|
| Registrador | | |
| Criado em | | |
| Atualizado em | | |
| Expira em | | |
| Nameservers | | |
| Provedor de e-mail (MX) | | |
| Serviços verificados (TXT) | | |
| CAA (quem pode emitir) | | |

**Responda:**

1. O WHOIS mostra o registrante? Se está mascarado, **o que isso significa**?
2. O provedor de e-mail é próprio ou terceirizado? O que isso sugere?
3. Os TXT revelam **quais serviços** a organização usa?
4. O CAA restringe quem pode emitir certificado? Por que isso é boa prática?

⚠ **A resposta 1 é o formato certo de achado negativo:** WHOIS mascarado é o **padrão** hoje
(privacidade), então isso **não é** indício de nada. Declare assim — não invente suspeita.

### Passo 2 — Pivô por certificado (40 min)

⚠ **O coração do lab.**

```bash
echo "=== Nomes cobertos por certificados deste domínio ==="
curl -s "https://crt.sh/?q=%25.${DOMINIO}&output=json" | \
  jq -r '.[].name_value' 2>/dev/null | sort -u > nomes-cert.txt
wc -l nomes-cert.txt
head -30 nomes-cert.txt

echo
echo "=== Emissores distintos ==="
curl -s "https://crt.sh/?q=${DOMINIO}&output=json" | \
  jq -r '.[].issuer_name' 2>/dev/null | sort -u | head -10

echo
echo "=== Organizações declaradas no certificado ==="
curl -s "https://crt.sh/?q=${DOMINIO}&output=json" | \
  jq -r '.[].name_value, .[].issuer_name' 2>/dev/null | sort -u | head -20
```

Produza `certificado.md`:

| Observação | Valor | O que sugere | Força |
|---|---|---|---|
| Nº de nomes cobertos | | | |
| Emissores distintos | | | |
| Organizações declaradas | | | |
| Nomes **fora** do domínio principal | | | |

**Responda:**

1. Quantos **outros domínios** o certificado revelou? Algum é de **outra marca** do mesmo grupo?
2. Que emissores aparecem? O uso de Let's Encrypt (gratuito) diz algo sobre a organização?
3. **Os nomes revelados são todos do mesmo dono?** Como você distinguiria servidor de cliente de
   servidor de terceiro?
4. Se um nome no SAN é de **marca diferente**, o que você faz antes de concluir que são do mesmo
   grupo?

⚠ **A resposta 4 é o exercício de julgamento.** Você **verifica** — e a verificação é: o registro
da outra empresa (Módulo 6), ou a declaração dela. Certificado indica; não conclui.

### Passo 3 — Infraestrutura e correlação (40 min)

```bash
IP=$(dig +short A "$DOMINIO" | head -1)
echo "=== ASN do IP: $IP ==="
whois -h whois.cymru.com " -v ${IP}" 2>/dev/null
whois "$IP" 2>/dev/null | grep -iE 'orgname|netname|country|descr|inetnum' | head -10

echo
echo "=== É CDN? (indício: IP muda, e o provedor é de CDN) ==="
for i in 1 2 3; do dig +short A "$DOMINIO" | head -1; done

echo
echo "=== Histórico de conteúdo (CDX) ==="
curl -s "http://web.archive.org/cdx/search/cdx?url=${DOMINIO}*&output=json&collapse=urlkey&limit=50" | \
  jq -r '.[] | .[2]' 2>/dev/null | sort -u | head -25
```

Produza `infra.md`:

| Item | Valor | O que revela |
|---|---|---|
| IP atual | | |
| ASN / provedor | | |
| País do bloco | | |
| É CDN? | | |
| IP muda entre consultas? | | |
| Seções históricas reveladas pelo CDX | | |

**Responda:**

1. **O IP é do servidor de origem ou de CDN?** Como você sabe?
2. Se é CDN, **o que você pode concluir** sobre onde a empresa hospeda? (Certifique-se de que a
   resposta é "pouco".)
3. O ASN é de nuvem grande, datacenter pequeno, ou provedor próprio?
4. **O CDX revelou seção que o site não mostra mais?** Qual, e o que ela diz?

### Passo 4 — O relatório (15 min)

Produza `relatorio-infra.md` seguindo o modelo abaixo, com as **seis** seções:

```markdown
TLP:AMBER
# Mapa de infraestrutura — [domínio]
Data: 2026-10-18   Analista: <nome>

## 1. Objeto e método
## 2. Identificação do domínio
## 3. Nomes revelados por certificado
## 4. Infraestrutura
## 5. Correlações, com FORÇA de cada pivô
| Pivô | Valor | Força (forte/média/fraca) | O que prova |
## 6. O que NÃO é possível concluir
⚠ Obrigatória, mínimo 4 itens
```

**Os quatro itens obrigatórios da seção 6 devem incluir:**

- que o certificado compartilhado **não prova** o mesmo proprietário
- que o campo `O` do certificado é **autodeclarado**
- que o TLD **não determina** a jurisdição do dono
- que o IP atrás de CDN **não revela** a origem

### Critérios de aceitação

- `registro.md` com todos os campos, incluindo CAA.
- Você explicou que WHOIS mascarado é o **padrão**, não indício.
- `certificado.md` com o pivô rodado e os nomes **fora** do domínio principal identificados.
- Você identificou **emissor** e **organização declarada**, e explicou que `O` é autodeclarado.
- `infra.md` com a resposta correta sobre CDN — **"não se conclui onde a empresa hospeda"**.
- O CDX revelou estrutura histórica, e você documentou.
- `relatorio-infra.md` com as seis seções e os **quatro itens** obrigatórios.
- Cada correlação com **força declarada**.
- ⚠ Nenhuma conexão ao host, nenhuma varredura, nenhuma consulta a nome contra o domínio.

---

## Avaliação

1. O que `.io` diz sobre a jurisdição de uma empresa? Por que a confusão é comum?
2. Por que `.com` não tem registro nacional a consultar? O que você consulta, então?
3. Explique por que MX e TXT são subestimados. O que cada um revela?
4. Descreva o pivô por certificado. Por que o SAN é tão produtivo?
5. O que a busca por campo **`O`** do certificado faz, e por que ela é poderosa?
6. Por que o campo `O` **não é prova**? Relacione com o SNI do curso de anonimato.
7. Por que ASN é um pivô **fraco** para correlação? O que ele pode provar?
8. Explique o problema do IP atrás de CDN. O que você **não** pode concluir?
9. Compare os pivôs em força: certificado, WHOIS, NS, ASN, padrão de nome, `O`. Por que a ordem é
   essa?
10. Certificado compartilhado **prova** o mesmo dono? Por que a resposta é "não"?
11. Por que WHOIS mascarado **não é** indício de nada hoje?
12. Escreva a formulação correta de relatório para "A e B compartilham certificado".

---

**Próximo:** [Módulo 8 — Imagem, vídeo e geolocalização](modulo-08.md)
