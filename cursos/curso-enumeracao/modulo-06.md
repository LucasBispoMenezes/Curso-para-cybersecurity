# Módulo 6 — Exposição em Terceiro

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 5

---

## Objetivos

1. Reconhecer padrão de nome que aponta para serviço de terceiro.
2. Entender take-over de subdomínio e como **identificá-lo sem explorá-lo**.
3. Enumerar exposição em bucket, painel e repositório.
4. Investigar histórico de commit sem baixar código.
5. Classificar o achado por severidade e o que reportar.

---

## ⚠ Conduta — o módulo com a linha mais fina

⚠ **Take-over de subdomínio é a técnica onde enumeração e exploração se confundem.** A distinção é
**uma ação**:

| Enumeração | Exploração |
|---|---|
| Verificar que o CNAME aponta para serviço desativado | **Reivindicar o nome no serviço** |
| Verificar que o bucket responde `404 NoSuchBucket` | **Criar o bucket** |
| Verificar que o repositório é público | **Clonar e ler o código** |
| Verificar que o painel existe | **Acessar o painel** |

⚠ **A regra do módulo, sem exceção:**

> **Verificar que o alvo está vulnerável é diagnóstico. Reivindicar o ativo é ataque** — mesmo que
> o serviço permita, mesmo que seja "só para provar", mesmo que ninguém vá notar.

⚠ **Por que isso importa legalmente:** reivindicar um recurso de terceiro é **apoderar-se de coisa
alheia**. No Brasil, isso pode configurar furto (art. 155), apropriação indébita (art. 168) ou
acesso indevido (art. 154-A) — dependendo do caso. **E legalmente, "testei" não é defesa.**

⚠ **E o risco prático:** um subdomínio reivindicado por você passa a **servir conteúdo sob o domínio
do cliente**. Se alguém acessa, você recebe tráfego dele — e isso é problema seu, não do cliente.

---

## 6.1 O padrão de nome que denuncia terceiro

⚠ **Todo serviço de nuvem tem padrão de `CNAME`.** Reconhecê-lo é reconhecer o terceiro.

| Padrão no `CNAME` | Serviço |
|---|---|
| `*.herokudns.com`, `*.herokuapp.com` | **Heroku** |
| `*.cloudfront.net` | **AWS CloudFront** |
| `*.s3.amazonaws.com`, `*.s3.*.amazonaws.com` | **AWS S3** |
| `*.elb.amazonaws.com` | **AWS ELB** |
| `*.azurewebsites.net` | **Azure App Service** |
| `*.cloudapp.azure.com`, `*.azurefd.net` | **Azure** |
| `*.trafficmanager.net` | **Azure Traffic Manager** |
| `*.appspot.com` | **Google App Engine** |
| `*.storage.googleapis.com` | **Google Cloud Storage** |
| `*.github.io` | **GitHub Pages** |
| `*.netlify.app`, `*.netlify.com` | **Netlify** |
| `*.vercel.app` | **Vercel** |
| `*.pages.dev` | **Cloudflare Pages** |
| `*.wordpress.com`, `*.wpengine.com` | **WordPress hospedado** |
| `*.myshopify.com` | **Shopify** |
| `*.statuspage.io` | **Statuspage** |
| `*.zendesk.com` | **Zendesk** |
| `*.salesforce.com`, `*.force.com` | **Salesforce** |
| `*.fastly.net` | **Fastly** |
| `*.readme.io`, `*.gitbook.io` | **Documentação** |

⚠ **Cada um desses padrões é a assinatura de um serviço** — e cada serviço tem **regra própria de
reivindicação**. O padrão diz **para onde** o subdomínio aponta; a regra do serviço diz se ele
**pode ser reivindicado por terceiro**.

```bash
cd ~/enum-lab
mkdir -p lab6 && cd lab6

ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ todos os CNAME do alvo ═══"
    for nome in "$ALVO" "www.${ALVO}" "api.${ALVO}" "dev.${ALVO}"; do
        cn=$(dig +short CNAME "$nome" 2>/dev/null | head -1 | sed 's/\.$//')
        [ -n "$cn" ] && printf '  %-40s → %s\n' "$nome" "$cn"
    done

    echo
    echo "═══ identificando o serviço pelo padrão ═══"
    dig +short CNAME "$ALVO" 2>/dev/null | sed 's/\.$//' | while read -r cn; do
        [ -z "$cn" ] && continue
        case "$cn" in
            *herokudns*|*herokuapp*)      echo "  ${cn}  → Heroku" ;;
            *cloudfront.net*)             echo "  ${cn}  → AWS CloudFront" ;;
            *s3.amazonaws.com*|*s3.*)     echo "  ${cn}  → AWS S3" ;;
            *azurewebsites.net*)          echo "  ${cn}  → Azure App Service" ;;
            *trafficmanager.net*)         echo "  ${cn}  → Azure Traffic Manager" ;;
            *appspot.com*)                echo "  ${cn}  → Google App Engine" ;;
            *github.io*)                  echo "  ${cn}  → GitHub Pages  ⚠ reivindicável" ;;
            *netlify*)                    echo "  ${cn}  → Netlify" ;;
            *vercel.app*)                 echo "  ${cn}  → Vercel" ;;
            *pages.dev*)                  echo "  ${cn}  → Cloudflare Pages" ;;
            *myshopify.com*)              echo "  ${cn}  → Shopify" ;;
            *zendesk.com*)                echo "  ${cn}  → Zendesk" ;;
            *)                            echo "  ${cn}  → (padrão desconhecido — investigar)" ;;
        esac
    done
fi
```

⚠ **A linha do `github.io` tem o aviso** porque é o serviço onde a reivindicação é **mais simples**:
criar um repositório com o nome certo publica o site. **É o take-over mais comum de reportar.**

**Produza `servicos.md`:**

| Nome | `CNAME` | Serviço | Reivindicável? | Confiança |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Responda:**

1. **Quantos nomes apontam para terceiro?** Para quais serviços?
2. Algum aponta para serviço onde a reivindicação é **trivial** (GitHub Pages, Heroku)?
3. `CNAME` desconhecido — o que você faz para identificar?
4. **Por que saber o serviço não é o mesmo que saber se é vulnerável?**

⚠ **A resposta 4 é a chave do módulo.** Saber que `dev.exemplo.com → exemplo.github.io` **não
significa** que o repositório `exemplo` está disponível. **Significa que é um lugar onde se olha.**

---

## 6.2 Take-over — identificar sem explorar

⚠ **A pergunta que você responde:**

> **O recurso de destino existe, ou está disponível para qualquer pessoa?**

⚠ **A resposta se obtém por observação do que o serviço responde** — e **nunca** por reivindicação.

```bash
ALVO=""
NOME="dev.${ALVO}"

if [ -n "$ALVO" ]; then
    CN=$(dig +short CNAME "$NOME" 2>/dev/null | head -1 | sed 's/\.$//')
    echo "═══ ${NOME} → ${CN} ═══"
    echo

    if [ -z "$CN" ]; then
        echo "sem CNAME — não é candidato"
    else
        echo "── o que o destino responde? ──"
        code=$(curl -s -o /tmp/dest.txt -w '%{http_code}' --max-time 15 "https://${CN}/" 2>/dev/null)
        echo "  HTTP ${code}"
        echo

        case "$code" in
            000) echo "  → não resolve / não responde  ⚠ INVESTIGAR" ;;
            404) echo "  → 404" ;;
            403) echo "  → 403 (existe, negado)" ;;
            200) echo "  → 200 (ativo)" ;;
        esac

        echo
        echo "── a resposta é do serviço ou do 'recurso não existe'? ──"
        echo "⚠ é aqui que se distingue take-over de serviço ativo"
        grep -oiE 'NoSuchBucket|No such app|There is no app|not found|repository not found|404' /tmp/dest.txt 2>/dev/null | sort -u | sed 's/^/    /'
    fi
fi
```

### As assinaturas de "recurso não existe"

| Serviço | Assinatura de disponível |
|---|---|
| **AWS S3** | `NoSuchBucket` — e o bucket está livre |
| **Heroku** | `No such app` |
| **GitHub Pages** | `404 There isn't a GitHub Pages site here` |
| **Azure** | `404 Web Site not found` |
| **Shopify** | `Sorry, this shop is currently unavailable.` |
| **Zendesk** | `Help Center Closed` |
| **Netlify** | `Not Found - Request ID` |
| **Vercel** | `404: NOT_FOUND` |
| **Cargo/Readme** | `Project not found` |

⚠ **A assinatura é a prova do diagnóstico.** `NoSuchBucket` significa **literalmente** que o bucket
não existe — e S3 permite que qualquer um crie bucket com nome livre **no mundo**. **Isso é o
take-over, e você acabou de identificá-lo sem tocar em nada.**

⚠ **Mas atenção ao falso positivo.** Duas coisas produzem assinatura parecida:

| Falso positivo | Como distinguir |
|---|---|
| O serviço está **fora do ar** temporariamente | Teste em outro momento, e veja se a assinatura muda |
| A assinatura é de **outro** recurso | Compare o texto exato com a tabela oficial do serviço |
| O `CNAME` aponta para **proxy** que responde 404 genérico | Sem assinatura específica → **não é prova** |

⚠ **A terceira linha é a regra:** **sem assinatura específica do serviço, você não tem prova.**
Um `404` genérico não é diagnóstico — é só "não achei".

```bash
# Verificação dupla: a assinatura é específica?
verifica_takeover() {
    local nome="$1"
    local cn
    cn=$(dig +short CNAME "$nome" 2>/dev/null | head -1 | sed 's/\.$//')
    [ -z "$cn" ] && { echo "  ${nome}: sem CNAME"; return 0; }

    local body
    body=$(curl -s --max-time 15 -L "https://${cn}/" 2>/dev/null | head -c 4000)

    local achou=""
    for assinatura in "NoSuchBucket" "No such app" \
                      "There isn't a GitHub Pages site here" \
                      "Web Site not found" \
                      "this shop is currently unavailable" \
                      "Help Center Closed" \
                      "Project not found"; do
        if printf '%s' "$body" | grep -qiF "$assinatura"; then
            achou="$assinatura"
            break
        fi
    done

    if [ -n "$achou" ]; then
        printf '  %-40s ⚠ TAKE-OVER: "%s"\n' "$nome" "$achou"
    else
        printf '  %-40s ✓ serviço responde (não é take-over)\n' "$nome"
    fi
}

# verifica_takeover "dev.exemplo.com"
```

⚠ **Note que a função nunca tenta reivindicar.** Ela lê a resposta e compara com a assinatura
conhecida. **Isso é o diagnóstico completo, e para aqui.**

⚠ **E o passo seguinte é reportar** — não testar "para confirmar". **A assinatura já confirmou.**

**Produza `takeover.md`:**

| Nome | `CNAME` | Serviço | Assinatura encontrada | Take-over? | Confiança |
|---|---|---|---|---|---|
| | | | | | |

**Responda:**

1. **Quantos candidatos a take-over?** Quais serviços?
2. A assinatura encontrada é **específica do serviço** ou é `404` genérico?
3. **Você reivindicou algum?** Confirme que não, e explique por quê.
4. Qual o **risco real** de um take-over não corrigido?

⚠ **A resposta 4 é o que justifica a severidade alta.** Um subdomínio reivindicado pode: servir
conteúdo de phishing sob domínio legítimo, receber cookie do domínio pai (se mal configurado),
burlar allowlist que confia em `*.exemplo.com`, e obter certificado válido para o domínio.

---

## 6.3 Bucket e armazenamento

⚠ **Bucket exposto é a exposição mais frequente em nuvem.**

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ derivando nomes de bucket do padrão ═══"
    slug=$(printf '%s' "$ALVO" | cut -d. -f1)

    for bucket in "$slug" "$slug-backup" "$slug-dev" "$slug-prod" \
                  "$slug-assets" "$slug-static" "$slug-media" "$slug-data" \
                  "${slug}.com" "www.${slug}"; do

        for host in "${bucket}.s3.amazonaws.com" \
                    "s3.amazonaws.com/${bucket}" \
                    "${bucket}.s3.us-east-1.amazonaws.com"; do

            code=$(curl -s -o /tmp/b.txt -w '%{http_code}' --max-time 10 \
                   "https://${host}/" 2>/dev/null)

            case "$code" in
                200) echo "  ⚠ 200 ABERTO: ${host}"
                     grep -oE '<Key>[^<]+' /tmp/b.txt 2>/dev/null | head -3 | sed 's/^/         /' ;;
                403) echo "  ·  403 existe (privado): ${host}" ;;
                404) grep -qi 'NoSuchBucket' /tmp/b.txt 2>/dev/null && \
                       echo "  ⚠ 404 NoSuchBucket — NOME LIVRE: ${host}" ;;
            esac
            sleep 0.3
        done
    done
fi
```

⚠ **A linha do `NoSuchBucket` é o take-over de bucket** — o nome está livre, e qualquer pessoa pode
criar. **E é grave**, porque o nome está referenciado em algum lugar do domínio do alvo.

⚠ **A linha do `200` é exposição direta** — o bucket é público. **Note que o comando só lê a
primeira lista**; baixar o conteúdo é **aquisição**, e o módulo 4 já estabeleceu a distinção.

### As regras de nome de bucket

| Serviço | Nome é global? | Reivindicável? |
|---|---|---|
| **AWS S3** | **Sim, global** | Sim, se livre |
| **GCP Storage** | Sim, global | Sim, se livre |
| **Azure Blob** | Sim, global | Sim, se livre |
| **DigitalOcean Spaces** | Por região | Sim |
| **Backblaze B2** | Global | Sim |

⚠ **"Nome global" significa que só existe um bucket com aquele nome no mundo** — e por isso o
take-over funciona. **É a razão pela qual bucket abandonado é risco.**

⚠ **E note as variações de URL do S3.** O bucket responde em três formas:
`bucket.s3.amazonaws.com`, `s3.amazonaws.com/bucket`, e `bucket.s3.REGIAO.amazonaws.com`. **Testar
só uma forma perde achado** — é erro comum.

**Produza `buckets.md`:**

| Nome candidato | Serviço | HTTP | Assinatura | Estado | Risco |
|---|---|---|---|---|---|
| | | | | | |

**Responda:**

1. **Quantos buckets existem?** Quantos são públicos?
2. Algum retornou `NoSuchBucket`? **Isso é take-over — qual severidade?**
3. Que nomes você **derivou** do slug do alvo, e por quê esses?
4. Por que testar **três formas** de URL do S3 é necessário?

---

## 6.4 Repositório e histórico

⚠ **A exposição mais comum em organização de tecnologia** — e a mais fácil de resolver.

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    slug=$(printf '%s' "$ALVO" | cut -d. -f1)

    echo "═══ repositórios com o slug do alvo (busca pública) ═══"
    echo "⚠ busca na API pública — não clona nada"
    echo

    for termo in "$slug" "$slug-com" "$slug-api"; do
        printf '── "%s" ──\n' "$termo"
        curl -s --max-time 15 \
          "https://api.github.com/search/repositories?q=${termo}&per_page=5" | \
          jq -r '.items[]? | [.full_name, .visibility, (.description // "-")] | @tsv' 2>/dev/null | \
          head -5 | sed 's/^/    /'
        echo
        sleep 2
    done
fi
```

⚠ **Note o aviso "não clona nada".** A busca na API é **enumeração**. Clonar o repositório para ler
o código é **aquisição** — e mesmo repositório público tem termo de uso, e mesmo código público
pode conter **credencial de terceiro**.

### O que procurar sem baixar

| Sinal público | Como ver | Risco |
|---|---|---|
| **Repositório público da organização** | Busca na API | Baixo — é público de propósito |
| **Repositório pessoal de funcionário** | Mesmo slug | **Médio** — pode ter config interna |
| **Gist com config** | Busca pública | Médio |
| **Arquivo `.env` no histórico** | API de conteúdo, **sem clonar** | **Alto** |
| **Credencial em commit antigo** | Só se você **tem direito** de olhar | **Alto** |
| **Token em issue/PR antiga** | Busca | Alto |

⚠ **A linha 4 e a 5 são a parte mais delicada.** Credencial em repositório **público** é pública —
mas **usá-la é crime**, e **baixar o histórico inteiro para encontrá-la é aquisição**.

⚠ **E a regra do módulo se aplica:** você **verifica que o repositório existe** e que ele tem
indicador de risco. **Você não extrai a credencial.**

```bash
# Verificação PÚBLICA e leve: existe arquivo sensível na raiz?
verifica_repo() {
    local repo="$1"      # formato: dono/nome
    echo "── ${repo} ──"

    for arq in .env .env.example config.json credentials.json secrets.yml \
               .aws/credentials id_rsa terraform.tfstate; do

        code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
               "https://api.github.com/repos/${repo}/contents/${arq}" 2>/dev/null)

        [ "$code" = "200" ] && printf '  ⚠ EXISTE: %s\n' "${arq}"
        sleep 0.5
    done
}

# verifica_repo "dono/repo"
```

⚠ **Note que o comando só verifica a existência** — como o módulo 4 fez com `.git`. **Verificar que
existe é achado; baixar o conteúdo é aquisição.**

⚠ **E a checagem de `.env.example`** é sinal **positivo** — significa que a organização tem prática
de documentar variável sem expor valor. **Ausência de `.env` também é informação.**

**Produza `repositorios.md`:**

| Repositório | Visibilidade | Arquivo sensível? | Risco | Você baixou? |
|---|---|---|---|---|
| | | | | **não** |

**Responda:**

1. Existe repositório com o slug do alvo? **É da organização ou de funcionário?**
2. Algum tem arquivo sensível na raiz?
3. **Você baixou algum conteúdo?** Por que não?
4. Se você encontrasse credencial **pública**, o que faria?

⚠ **A resposta 4 é a linha ética.** Você **reporta a existência** — com repositório, arquivo e data.
**Você não usa a credencial, mesmo para "testar se funciona".** E o achado é de severidade alta
porque **a organização não sabe que está exposta**.

---

## 6.5 Painel e serviço de terceiro

⚠ **SaaS exposto é a superfície que ninguém enumera.**

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    slug=$(printf '%s' "$ALVO" | cut -d. -f1)

    echo "═══ painéis e SaaS com o slug ═══"
    echo "⚠ verificação de EXISTÊNCIA apenas"
    echo

    for url in \
        "https://${slug}.atlassian.net" \
        "https://${slug}.zendesk.com" \
        "https://${slug}.statuspage.io" \
        "https://${slug}.myshopify.com" \
        "https://${slug}.sentry.io" \
        "https://${slug}.slack.com" \
        "https://${slug}.gitbook.io" \
        "https://${slug}.readme.io" \
        "https://${slug}.freshdesk.com" \
        "https://admin.${ALVO}" \
        "https://portal.${ALVO}" \
        "https://painel.${ALVO}"; do

        code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -L "$url" 2>/dev/null)
        case "$code" in
            200) printf '  ⚠ 200  %s\n' "$url" ;;
            403) printf '  ·  403  %s\n' "$url" ;;
            3*)  printf '  ·  %s   %s\n' "$code" "$url" ;;
        esac
        sleep 0.4
    done
fi
```

### O que cada achado significa

| Achado | Significado | Risco |
|---|---|---|
| Painel de terceiro existe | Organização usa o serviço | Baixo — informação |
| Painel **aceita cadastro aberto** | Terceiro entra na organização | **Alto** |
| Painel expõe **nome de membro** | Enumeração de funcionário | Médio — LGPD |
| `admin.` / `portal.` responde 200 | Página interna exposta | **Médio-alto** |
| `admin.` responde 403 | Existe, protegido | Baixo — mas confirma existência |

⚠ **A linha 2 é o achado mais grave da tabela.** Um tenant de Atlassian (Jira/Confluence) com
**auto-cadastro habilitado** permite que qualquer pessoa com e-mail entre na organização. **E a
verificação disso é pública** — a tela de cadastro responde.

⚠ **A linha 3 é achado de conformidade.** Se o painel lista membros publicamente, há
**dado pessoal exposto** — e isso é LGPD, não só segurança.

⚠ **E a linha 5 merece nuance:** `403` significa que **existe** — e confirma a existência de um
painel administrativo, que é informação. **Não é vulnerabilidade; é superfície.**

**Produza `saas.md`:**

| URL | HTTP | Existe? | Risco | Observação |
|---|---|---|---|---|
| | | | | |

**Responda:**

1. **Quantos painéis de terceiro existem?**
2. Algum aceita **cadastro aberto**? Como você verificaria (sem se cadastrar)?
3. `admin.` responde? Com qual código?
4. **Qual achado é de LGPD** e não só de segurança?

⚠ **A resposta 2 é uma linha fina.** Verificar se o cadastro está aberto **é público** — a tela de
cadastro aparece para qualquer um. **Cadastrar-se para confirmar é outra coisa**, e não se faz.

---

## 6.6 LAB — Exposição em terceiro, sem explorar

**Duração:** 120 min

### Passo 1 — Mapeie os serviços (35 min)

```bash
cd ~/enum-lab/lab6
ALVO=""

if [ -z "$ALVO" ]; then
    echo "⚠ defina ALVO"
else
    mkdir -p achados

    # Todos os CNAME dos nomes que você já achou
    cat > todos-nomes.txt <<EOF
${ALVO}
www.${ALVO}
api.${ALVO}
EOF
    [ -f ../lab3/nomes-ct.txt ] && cat ../lab3/nomes-ct.txt >> todos-nomes.txt

    sort -u todos-nomes.txt > nomes.txt
    echo "nomes a verificar: $(wc -l < nomes.txt)"
    echo

    printf '%-46s %-42s %s\n' "NOME" "CNAME" "SERVIÇO"
    printf '%-46s %-42s %s\n' "────" "─────" "───────"

    i=0
    while IFS= read -r nome; do
        [ -z "$nome" ] && continue
        i=$((i+1)); [ "$i" -gt 30 ] && break

        cn=$(dig +short +time=3 CNAME "$nome" 2>/dev/null | head -1 | sed 's/\.$//')
        [ -z "$cn" ] && continue

        servico="desconhecido"
        case "$cn" in
            *heroku*)        servico="Heroku" ;;
            *cloudfront*)    servico="AWS CloudFront" ;;
            *s3*)            servico="AWS S3" ;;
            *azurewebsites*) servico="Azure" ;;
            *trafficmanager*)servico="Azure TM" ;;
            *appspot*)       servico="Google App Engine" ;;
            *github.io*)     servico="GitHub Pages" ;;
            *netlify*)       servico="Netlify" ;;
            *vercel*)        servico="Vercel" ;;
            *pages.dev*)     servico="Cloudflare Pages" ;;
            *myshopify*)     servico="Shopify" ;;
            *zendesk*)       servico="Zendesk" ;;
        esac

        printf '%-46s %-42s %s\n' "$nome" "$cn" "$servico"
        sleep 0.3
    done < nomes.txt | tee servicos.txt
fi
```

Produza `servicos-lab.md`:

| Nome | `CNAME` | Serviço | Reivindicável? |
|---|---|---|---|
| | | | |

**Responda:**

1. **Quantos dos 30 nomes apontam para terceiro?**
2. Qual serviço aparece mais?
3. Algum serviço é de **reivindicação trivial**?
4. Por que este passo **não toca** em nenhum serviço?

### Passo 2 — Diagnostique, sem reivindicar (45 min)

```bash
cd ~/enum-lab/lab6

cat > diagnostica.sh <<'SCRIPT'
#!/usr/bin/env bash
# Diagnostica take-over SEM reivindicar nada.
set -uo pipefail

ARQ="${1:?informe o arquivo nome<TAB>cname}"
LIMITE="${2:-15}"

printf '%-42s %-8s %s\n' "NOME" "HTTP" "DIAGNÓSTICO"
printf '%-42s %-8s %s\n' "────" "────" "───────────"

i=0
while IFS=$'\t' read -r nome cname servico; do
    [ -z "$nome" ] && continue
    i=$((i+1)); [ "$i" -gt "$LIMITE" ] && break

    code=$(curl -s -o /tmp/d.txt -w '%{http_code}' --max-time 12 -L "https://${cname}/" 2>/dev/null)

    diag="?"
    body=$(head -c 4000 /tmp/d.txt 2>/dev/null)

    for assin in "NoSuchBucket" "No such app" \
                 "There isn't a GitHub Pages site here" \
                 "Web Site not found" "this shop is currently unavailable" \
                 "Help Center Closed" "Project not found" "NOT_FOUND"; do
        if printf '%s' "$body" | grep -qiF "$assin"; then
            diag="⚠ TAKE-OVER: ${assin}"
            break
        fi
    done

    [ "$diag" = "?" ] && case "$code" in
        200) diag="ativo" ;;
        403) diag="existe (negado)" ;;
        404) diag="404 genérico — NÃO é prova" ;;
        000) diag="não responde" ;;
        *)   diag="HTTP ${code}" ;;
    esac

    printf '%-42s %-8s %s\n' "$nome" "$code" "$diag"
    sleep 0.5
done < "$ARQ"
SCRIPT
chmod +x diagnostica.sh

[ -f servicos.txt ] && diagnostica.sh servicos.txt 15 | tee diagnostico.txt
```

⚠ **Note a linha do `404 genérico — NÃO é prova`.** É a distinção mais importante do módulo: sem
assinatura **específica do serviço**, você **não tem diagnóstico**.

Produza `diagnostico.md`:

| Nome | HTTP | Assinatura | Diagnóstico | É prova? |
|---|---|---|---|---|
| | | | | |

**Responda:**

1. **Quantos take-over confirmados?** Em quais serviços?
2. Quantos deram `404` **genérico**? Por que **não** são prova?
3. **Você reivindicou algo?** Confirme e explique.
4. Qual a **evidência** que você levaria ao relatório: a assinatura ou o `404`?

⚠ **A resposta 4 é o critério de reporte.** O relatório cita **a assinatura literal** — por
exemplo, `NoSuchBucket` — porque é ela que o mantenedor consegue verificar. **"Deu 404" não serve.**

### Passo 3 — Bucket, repositório e painel (30 min)

```bash
cd ~/enum-lab/lab6
ALVO=""

if [ -n "$ALVO" ]; then
    slug=$(printf '%s' "$ALVO" | cut -d. -f1)

    echo "═══ buckets derivados (verificação) ═══"
    for b in "$slug" "$slug-backup" "$slug-dev" "$slug-static" "$slug-assets"; do
        code=$(curl -s -o /tmp/bk.txt -w '%{http_code}' --max-time 10 \
               "https://${b}.s3.amazonaws.com/" 2>/dev/null)
        case "$code" in
            200) echo "  ⚠ ABERTO: ${b}" ;;
            404) grep -qi NoSuchBucket /tmp/bk.txt 2>/dev/null && echo "  ⚠ LIVRE: ${b}" ;;
        esac
        sleep 0.4
    done

    echo
    echo "═══ painéis (verificação de existência) ═══"
    for url in "https://${slug}.atlassian.net" "https://${slug}.zendesk.com" \
               "https://admin.${ALVO}" "https://portal.${ALVO}"; do
        code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -L "$url" 2>/dev/null)
        [ "$code" != "000" ] && [ "$code" != "404" ] && printf '  %-4s %s\n' "$code" "$url"
        sleep 0.4
    done

    echo
    echo "═══ repositório (busca pública, sem clonar) ═══"
    curl -s --max-time 15 "https://api.github.com/search/repositories?q=${slug}&per_page=5" | \
        jq -r '.items[]? | [.full_name, .visibility] | @tsv' 2>/dev/null | sed 's/^/  /'
fi
```

Produza `terceiro.md`:

| Categoria | Achado | Estado | Severidade | Você explorou? |
|---|---|---|---|---|
| Bucket | | | | não |
| Painel | | | | não |
| Repositório | | | | não |

**Responda:**

1. Quantos achados em cada categoria?
2. Algum é **crítico**? Qual, e por quê?
3. **Você baixou conteúdo, se cadastrou ou reivindicou algo?** Confirme que não.
4. **O que vai no relatório** sobre cada achado?

### Passo 4 — O relatório (10 min)

Produza `relatorio-terceiro.md`:

```markdown
# Exposição em terceiro — [alvo]

## 1. Método e data
## 2. Serviços de terceiro identificados
| Nome | CNAME | Serviço |
## 3. Take-over de subdomínio
| Nome | CNAME | Assinatura literal | Confirmado? | Severidade |
## 4. Bucket e armazenamento
| Nome | Estado | Severidade |
## 5. Repositório e painel
| Achado | Estado | Observação |
## 6. Achados priorizados
| # | Achado | Evidência | Severidade | Correção |
## 7. O que NÃO se pode concluir
⚠ Obrigatório, mínimo 3:
- que 404 genérico NÃO é diagnóstico de take-over
- que NÃO foi feita nenhuma reivindicação de recurso
- que nenhum conteúdo de bucket/repositório foi baixado
## 8. Declaração de conduta
| Ação | Feita? |
|---|---|
| Reivindiquei algum recurso | **não** |
| Baixei conteúdo de bucket | **não** |
| Clonei repositório | **não** |
| Acessei painel | **não** |
| Me cadastrei em serviço | **não** |
```

⚠ **A seção 8 é declaração, não decoração.** Ela é o que separa o relatório de auditoria do
relatório de quem testou "só para provar".

### Critérios de aceitação

- `servicos.txt` com **os 30 nomes** verificados por `CNAME`, com o serviço identificado.
- `diagnostica.sh` rodando em **no máximo 15 nomes**, com o diagnóstico por assinatura.
- Você distinguiu **take-over confirmado** de `404` genérico, e explicou por quê.
- `buckets.md` com as cinco variações testadas, e as **três formas** de URL do S3.
- `repositorios.md` com a coluna "você baixou" marcada **"não"**.
- `saas.md` com os painéis verificados por existência.
- `relatorio-terceiro.md` com as **oito** seções e a **seção 8 preenchida**.
- ⚠ **Nenhuma reivindicação, nenhum download, nenhum cadastro.** Confirmado na seção 8.

---

## Avaliação

1. Cite oito padrões de `CNAME` e o serviço de cada um.
2. Por que saber o serviço **não** significa saber se é vulnerável?
3. Descreva a diferença entre **verificar** que o recurso está livre e **reivindicá-lo**.
4. Por que reivindicar recurso de terceiro é crime, mesmo que o serviço permita?
5. O que é a "assinatura" de um take-over? Cite quatro.
6. **Por que `404` genérico não é prova de take-over?** O que é prova?
7. Cite três falsos positivos de take-over e como distinguir cada um.
8. Por que o take-over de bucket funciona? O que "nome global" significa?
9. Por que testar **três formas** de URL do S3 é necessário?
10. Qual o risco real de um take-over não corrigido? Cite quatro consequências.
11. Por que verificar existência de `.env` é achado e baixar o conteúdo não é?
12. Se você encontra credencial **pública**, o que faz e o que **não** faz?
13. Por que painel de terceiro com **cadastro aberto** é o achado mais grave da categoria SaaS?
14. Qual achado de SaaS é de **LGPD** e não só de segurança?
15. Por que a declaração de conduta (seção 8) é parte do entregável?

---

**Próximo:** [Módulo 7 — Correlação: de achado a mapa](modulo-07.md)
