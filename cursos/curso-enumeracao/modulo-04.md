# Módulo 4 — Superfície Esquecida em Documento e Arquivo

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Recuperar conteúdo **removido** por arquivo morto e CDX.
2. Enumerar o que **nunca foi linkado** — `robots`, `sitemap`, índice esquecido.
3. Extrair metadado de documento público.
4. Reconhecer artefato de desenvolvimento esquecido em produção.
5. Montar a linha do tempo de um alvo a partir do arquivo morto.

---

## ⚠ Conduta

⚠ **Consulta passiva, como no módulo 3.** Você lê o que está público e o que foi arquivado por
terceiro. **Nenhuma requisição ao alvo além do que é público e normal.**

⚠ **A exceção que exige cuidado:** ao tentar uma URL que você **descobriu** no `robots.txt` ou no
arquivo morto, você está fazendo requisição ao alvo. **Isso é normal e legítimo em auditoria** — mas
o alvo é **seu ou autorizado**, e o volume é **baixo**.

| Permitido | Proibido |
|---|---|
| Ler `robots.txt` (é público, feito para ser lido) | Varrer diretório em massa |
| Consultar a CDX API (é do Wayback, não do alvo) | Baixar conteúdo exposto por erro |
| Acessar URL pública que você descobriu | Contornar autenticação |
| Ler metadado de documento público | Usar credencial que você encontrou |

⚠ **A última linha do lado direito é a que a lei trata como crime.** Encontrar credencial exposta
**não é** autorização para usá-la. Você **reporta**.

---

## 4.1 O que foi removido — arquivo morto

⚠ **A fonte mais subestimada da enumeração:** o conteúdo que **existiu** e **não existe mais**.

```bash
cd ~/enum-lab
mkdir -p lab4 && cd lab4

ALVO=""

if [ -z "$ALVO" ]; then
    echo "⚠ defina ALVO"
else
    echo "═══ 1. quantas capturas existem ═══"
    curl -s --max-time 30 \
      "http://web.archive.org/cdx/search/cdx?url=${ALVO}&output=json&limit=5" | \
      jq -r '.[] | @tsv' 2>/dev/null | head -5

    echo
    echo "═══ 2. TODAS as URLs já capturadas ═══"
    curl -s --max-time 60 \
      "http://web.archive.org/cdx/search/cdx?url=${ALVO}*&output=json&collapse=urlkey&limit=500" | \
      jq -r '.[] | .[2]' 2>/dev/null | sort -u > urls-arquivadas.txt

    echo "URLs distintas: $(wc -l < urls-arquivadas.txt)"
    head -20 urls-arquivadas.txt
fi
```

⚠ **Note `collapse=urlkey`.** Sem ele, você recebe **uma linha por captura** — e uma URL capturada
200 vezes aparece 200 vezes. Com ele, você recebe **uma por URL**.

### As consultas que revelam o que foi escondido

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ URLs que retornavam 404 na captura ═══"
    curl -s --max-time 60 \
      "http://web.archive.org/cdx/search/cdx?url=${ALVO}*&output=json&filter=statuscode:404&collapse=urlkey&limit=200" | \
      jq -r '.[] | .[2]' 2>/dev/null | sort -u | head -20

    echo
    echo "═══ URLs que retornavam 200 e hoje podem não existir ═══"
    curl -s --max-time 60 \
      "http://web.archive.org/cdx/search/cdx?url=${ALVO}*&output=json&filter=statuscode:200&collapse=urlkey&limit=200" | \
      jq -r '.[] | .[2]' 2>/dev/null | sort -u | head -20

    echo
    echo "═══ linha do tempo: mudanças de status por URL ═══"
    curl -s --max-time 60 \
      "http://web.archive.org/cdx/search/cdx?url=${ALVO}*&output=json&limit=300" | \
      jq -r '.[] | [.[1], .[2], .[4]] | @tsv' 2>/dev/null | \
      awk -F'\t' '{print $3, $2}' | sort -u | head -30
fi
```

⚠ **A consulta 1 é a mais reveladora.** URL que **retornava 404 na captura** é URL que **já foi
removida** quando o Wayback a visitou. Combinada com o nome da URL, ela conta o que a organização
**quis esconder** — um endpoint de admin removido, uma página de funcionário, um diretório de
teste.

⚠ **E a consulta 3 é a linha do tempo.** Ela mostra **quando** cada URL mudou de status: 200 → 404
significa remoção. **Um conjunto de URLs que virou 404 na mesma data é uma limpeza** — e é achado.

**A tabela de interpretação:**

| Padrão observado | O que significa |
|---|---|
| URL que só aparece com 404 | **Removida antes de ser arquivada** |
| URL 200 em 2020, 404 em 2023 | Removida em algum ponto de 2023 |
| Muitas URLs 404 **na mesma data** | **Limpeza deliberada** |
| URL com parâmetro que não existe mais | Endpoint antigo, estrutura diferente |
| Diretório listado que sumiu | Conteúdo movido ou removido |
| Versão antiga com mais páginas | Site **encolheu** — por quê? |

**Produza `arquivo-morto.md`:**

| Métrica | Valor |
|---|---|
| URLs distintas arquivadas | |
| URLs que retornavam 404 | |
| URLs 200 → hoje | |
| Data da captura mais antiga | |
| Data da mais recente | |

**Responda:**

1. **Quantas URLs foram removidas?** Quantas têm nome revelador?
2. Há **concentração de 404 numa data**? O que isso sugere?
3. Alguma URL aponta para **painel, admin, backup ou teste**?
4. **O site encolheu ou cresceu** entre a captura mais antiga e a mais recente?

⚠ **A resposta 4 é uma pergunta que quase ninguém faz.** Um site que tinha 800 páginas em 2019 e
tem 120 hoje **removeu** alguma coisa — e a CDX diz o que.

---

## 4.2 O que nunca foi linkado — `robots` e índice

⚠ **`robots.txt` é uma declaração de intenção.** Ele diz ao crawler o que **não** indexar — e ao
enumerador, **onde olhar**.

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ robots.txt ═══"
    curl -s --max-time 15 "https://${ALVO}/robots.txt" | head -40

    echo
    echo "═══ sitemap.xml ═══"
    curl -s --max-time 15 "https://${ALVO}/sitemap.xml" | head -30
fi
```

⚠ **O `Disallow` é a lista mais valiosa que existe**, e é paradoxal: a organização está dizendo
**exatamente onde não olhar** — e é ali que está o interessante.

```
User-agent: *
Disallow: /admin/
Disallow: /backup/
Disallow: /api/internal/
Disallow: /staging/
Disallow: /?debug=1
```

⚠ **Note o último.** Parâmetro `debug` no `Disallow` revela que **existe modo de depuração** — que
é informação de qualidade, e às vezes é a diferença entre um relatório medíocre e um bom.

⚠ **E o `sitemap.xml` é o contrário:** ele lista o que **deve** ser indexado. Comparar os dois
revela a estrutura completa — o que a organização quer que você ache, e o que ela não quer.

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ comparando robots e sitemap ═══"

    curl -s --max-time 15 "https://${ALVO}/robots.txt" 2>/dev/null | \
        grep -iE '^disallow|^allow' | sed 's/^[^:]*: *//' | grep -v '^$' | \
        sort -u > robots-caminhos.txt

    curl -s --max-time 15 "https://${ALVO}/sitemap.xml" 2>/dev/null | \
        grep -oE '<loc>[^<]+</loc>' | sed 's/<[^>]*>//g' | sort -u > sitemap-urls.txt

    echo "caminhos bloqueados: $(wc -l < robots-caminhos.txt)"
    echo "urls no sitemap:     $(wc -l < sitemap-urls.txt)"

    echo
    echo "── bloqueados que NÃO estão no sitemap (o interessante) ──"
    while IFS= read -r c; do
        [ -z "$c" ] && continue
        base=$(printf '%s' "$c" | sed 's|^/||;s|/$||' | cut -d/ -f1)
        [ -n "$base" ] && ! grep -qi "$base" sitemap-urls.txt && echo "  ${c}"
    done < robots-caminhos.txt | head -20
fi
```

### Outras declarações públicas que revelam estrutura

| Arquivo | O que revela |
|---|---|
| `/.well-known/security.txt` | **Contato de segurança** — e confirma que existe programa |
| `/.well-known/change-password` | Fluxo de senha |
| `/.well-known/openid-configuration` | **Provedor de identidade** e endpoints |
| `/humans.txt` | Equipe (raro hoje, mas revelador) |
| `/sitemap_index.xml` | Múltiplos sitemaps |
| `/feed` / `/rss` | Conteúdo, e **histórico** de publicação |
| `/api` sem versão | Endpoint não versionado |

⚠ **Note o terceiro.** `/.well-known/openid-configuration` é **padrão público** e lista
`authorization_endpoint`, `token_endpoint`, `issuer` — ou seja, **a estrutura de autenticação
inteira**, declarada por convenção.

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ .well-known ═══"
    for p in security.txt change-password openid-configuration; do
        printf '%-38s ' "/.well-known/${p}"
        code=$(curl -s -o /tmp/wk.txt -w '%{http_code}' --max-time 10 \
               "https://${ALVO}/.well-known/${p}" 2>/dev/null)
        if [ "$code" = "200" ]; then
            echo "⚠ 200"
            head -4 /tmp/wk.txt | sed 's/^/      /'
        else
            echo "${code}"
        fi
    done
fi
```

**Produza `robots.md`:**

| Caminho bloqueado | Acessível? | O que é | Prioridade |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantos caminhos o `robots` bloqueia?** Quantos existem de fato?
2. Algum caminho é `admin`, `backup`, `staging` ou `debug`?
3. O `openid-configuration` existe? O que ele revela?
4. **Por que o `Disallow` é a lista mais valiosa** e ao mesmo tempo a mais paradoxal?

⚠ **A resposta 4 é a lição do módulo.** A organização **declara onde não olhar** — e é exatamente
o que o enumerador quer. **Não é falha de segurança; é o propósito do arquivo.** Mas é informação,
e é pública.

⚠ **⚠ E o limite:** descobrir que `/admin/` existe **é enumeração**. Tentar acessar `/admin/` com
credencial que você achou **é outra coisa** — e é crime. **Você reporta o caminho, não o invade.**

---

## 4.3 Metadado de documento público

⚠ **Já visto no curso de OSINT (módulo 8). Aqui, o foco é enumerar estrutura.**

```bash
cd ~/enum-lab/lab4

# Documento público do alvo — baixe UM, e analise
ALVO=""
[ -n "$ALVO" ] && curl -s --max-time 20 "https://${ALVO}/" -o pagina.html

# Se você achou PDF/Office no arquivo morto ou no site:
# curl -s -o doc.pdf "https://${ALVO}/caminho/doc.pdf"
# exiftool doc.pdf
```

### O que o metadado revela sobre **estrutura**

| Campo | O que revela |
|---|---|
| `Creator` / `Producer` | Software usado — e às vezes **versão e template interno** |
| `Author` | **Nome de funcionário** — e o padrão de e-mail |
| `Company` | Razão social **exata** — útil para o registro |
| `CreateDate` / `ModifyDate` | **Quando** o documento foi feito |
| **`XMP` / `Custom`** | Campos internos, às vezes **nome de projeto ou de sistema** |
| Caminho interno em comentário | **Estrutura de diretório da organização** |

⚠ **A linha do `XMP` é a mais valiosa.** Ferramenta interna de geração de documento frequentemente
grava **nome de sistema, de projeto ou de cliente** nos campos customizados — e isso é enumeração
de estrutura interna, sem tocar em nada.

```bash
# Analise um documento real que você tem direito
exiftool documento.pdf 2>/dev/null | head -25

echo
echo "═══ buscando por metadado revelador ═══"
exiftool documento.pdf 2>/dev/null | \
    grep -iE 'author|company|creator|producer|title|subject|keywords|comment|software' | head -12
```

⚠ **E se você não tem documento, o `robots` e o arquivo morto frequentemente revelam onde estão.**
`/docs/`, `/download/`, `/whitepaper/` — e cada um é um PDF com metadado.

---

## 4.4 Artefato de desenvolvimento em produção

⚠ **A categoria que mais aparece em auditoria real.**

| Artefato | Como aparece | Risco |
|---|---|---|
| **`.git/` acessível** | `/.git/config`, `/.git/HEAD` | **Código-fonte inteiro** |
| `.svn/`, `.hg/` | Diretório de VCS antigo | Código e histórico |
| `.env` | Arquivo de configuração | **Credencial** |
| `backup.zip`, `.tar.gz`, `.sql` | Backup esquecido | **Dado inteiro** |
| `*.bak`, `*~`, `.swp` | Editor deixou cópia | Código |
| `Dockerfile`, `docker-compose.yml` | Deploy exposto | Estrutura de infraestrutura |
| `.DS_Store`, `Thumbs.db` | Sistema operacional | **Listagem de diretório** |
| `phpinfo.php` | Página de diagnóstico | **Configuração do servidor** |
| `*_old`, `*_test`, `*_dev` | Nome com sufixo | Versão antiga ou de teste |
| `/.well-known/` mal configurado | Listagem | Estrutura |

⚠ **O `.DS_Store` e o `Thumbs.db` são os mais subestimados.** São arquivos de sistema operacional
que contêm **a listagem de arquivo do diretório** onde foram criados — e ninguém lembra de
removê-los ao publicar.

```bash
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ teste de artefato comum (HEAD, não baixa conteúdo) ═══"
    echo "⚠ apenas verifica existência — não baixa nada"
    echo

    for p in .git/config .git/HEAD .svn/entries .env \
             backup.zip backup.tar.gz dump.sql \
             Dockerfile docker-compose.yml .DS_Store Thumbs.db \
             phpinfo.php .htaccess robots.txt sitemap.xml; do

        code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 \
               "https://${ALVO}/${p}" 2>/dev/null)
        case "$code" in
            200) printf '  %-26s ⚠ 200 — EXISTE\n' "/${p}" ;;
            403) printf '  %-26s 403 — existe mas negado\n' "/${p}" ;;
            404) printf '  %-26s 404\n' "/${p}" ;;
            *)   printf '  %-26s %s\n' "/${p}" "$code" ;;
        esac
        sleep 0.3
    done
fi
```

⚠ **Note o comentário "não baixa nada".** O teste usa `-o /dev/null` — verifica **existência**, não
conteúdo. **Isso é enumeração.** Baixar o `.git/` inteiro para extrair o código-fonte é outro ato —
e em alvo que não é seu, é acesso indevido.

⚠ **A regra do módulo, escrita:**

> **Verificar que existe é enumeração. Baixar o conteúdo é aquisição.** Em alvo próprio ou
> autorizado, as duas são legítimas. Fora disso, só a primeira — e ainda assim com escopo.

**Produza `artefatos.md`:**

| Caminho | Código | Existe? | Risco | Você baixou? |
|---|---|---|---|---|
| `/.git/config` | | | | **não** |
| `/.env` | | | | **não** |
| | | | | |

**Responda:**

1. **Quantos artefatos existem?** Quais são de risco alto?
2. Você **verificou** ou **baixou**? Por quê a diferença importa?
3. `/.git/config` existir é achado de qual severidade?
4. **O que você faz** ao encontrar `.env` com credencial?

⚠ **A resposta 4 é a linha ética do módulo.** Você **não usa** a credencial. Você **reporta** —
com o caminho, o horário e a informação de que existe. **Usar é crime**, mesmo que a credencial
estivesse "exposta".

---

## 4.5 LAB — Linha do tempo e superfície esquecida

**Duração:** 120 min

### Passo 1 — Linha do tempo do alvo (40 min)

```bash
cd ~/enum-lab/lab4
ALVO=""

if [ -z "$ALVO" ]; then
    echo "⚠ defina ALVO"
else
    echo "═══ coletando todas as capturas ═══"
    curl -s --max-time 90 \
      "http://web.archive.org/cdx/search/cdx?url=${ALVO}*&output=json&limit=2000" | \
      jq -r '.[] | [.[1], .[2], .[4]] | @tsv' 2>/dev/null > capturas.tsv

    echo "capturas: $(wc -l < capturas.tsv)"

    echo
    echo "═══ distribuição por ano ═══"
    cut -f1 capturas.tsv | cut -c1-4 | sort | uniq -c

    echo
    echo "═══ distribuição por código de status ═══"
    cut -f3 capturas.tsv | sort | uniq -c | sort -rn | head -8

    echo
    echo "═══ mês com mais 404 (limpeza?) ═══"
    awk -F'\t' '$3 ~ /^404/ {print substr($1,1,7)}' capturas.tsv | \
        sort | uniq -c | sort -rn | head -5
fi
```

Produza `linha-tempo.md`:

| Ano | Capturas | 200 | 404 | Outros |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Responda:**

1. **Em que ano houve mais 404?** O que isso sugere?
2. O site **cresceu ou encolheu** ao longo do tempo? Como você sabe?
3. Algum mês concentra remoções? **Qual?**
4. **Que evento** você intui a partir do padrão? (Limpeza, migração, reestruturação.)

⚠ **A resposta 4 é inferência, e você declara como inferência.** "Concentração de 404 em março de
2023 **sugere** migração" — não "houve migração". **Confiança moderada, e se escreve assim.**

### Passo 2 — Toda a superfície pública declarada (40 min)

```bash
cd ~/enum-lab/lab4
ALVO=""

if [ -n "$ALVO" ]; then
    mkdir -p superficie && cd superficie

    # 1. robots
    curl -s --max-time 15 "https://${ALVO}/robots.txt" -o robots.txt 2>/dev/null

    # 2. sitemap e índice
    curl -s --max-time 15 "https://${ALVO}/sitemap.xml" -o sitemap.xml 2>/dev/null
    curl -s --max-time 15 "https://${ALVO}/sitemap_index.xml" -o sitemap_index.xml 2>/dev/null

    # 3. well-known
    for p in security.txt openid-configuration change-password; do
        curl -s --max-time 10 "https://${ALVO}/.well-known/${p}" -o "wk-${p}" 2>/dev/null
    done

    # 4. resumo
    echo "═════ RESUMO ═════"
    for f in *; do
        n=$(wc -c < "$f" 2>/dev/null)
        printf '  %-32s %s bytes\n' "$f" "$n"
    done

    echo
    echo "═════ caminhos declarados no robots ═════"
    grep -iE '^(disallow|allow)' robots.txt 2>/dev/null | sed 's/^/  /' | head -20
fi
```

Produza `superficie.md`:

| Fonte | Existe? | O que declarou | Achado relevante |
|---|---|---|---|
| `robots.txt` | | | |
| `sitemap.xml` | | | |
| `security.txt` | | | |
| `openid-configuration` | | | |

**Responda:**

1. **Quantos caminhos o `robots` declara?** Algum é sensível?
2. O `security.txt` existe? **Isso é achado positivo** — indica maturidade.
3. O `openid-configuration` existe? O que ele revela de estrutura?
4. **Qual declaração pública foi a mais reveladora**, e por quê?

### Passo 3 — Artefato e metadado (25 min)

```bash
cd ~/enum-lab/lab4
ALVO=""

if [ -n "$ALVO" ]; then
    echo "═══ artefatos (verificação de existência) ═══"
    for p in .git/HEAD .git/config .env backup.zip .DS_Store Dockerfile phpinfo.php; do
        code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "https://${ALVO}/${p}" 2>/dev/null)
        [ "$code" = "200" ] && printf '  %-24s ⚠ 200\n' "/${p}" || true
        sleep 0.3
    done

    echo
    echo "═══ metadado de documento público ═══"
    # se você achou um PDF no arquivo morto, baixe UM e analise
    # curl -s -o doc.pdf "https://${ALVO}/caminho"
    # exiftool doc.pdf | grep -iE 'author|company|creator|producer'
fi
```

Produza `artefato-meta.md`:

| Item | Existe? | Risco | O que revela | Você baixou? |
|---|---|---|---|---|
| `.git/HEAD` | | | | não |
| `.env` | | | | não |
| Documento PDF | | | | (1, para análise) |

**Responda:**

1. Existe artefato de desenvolvimento exposto? **Qual a severidade?**
2. Se você achou `.env`, **você o abriu?** Por quê não?
3. O metadado do documento revelou autor, empresa ou software?
4. **O que você reporta**, e o que você **não** faz?

### Passo 4 — O relatório (15 min)

Produza `relatorio-esquecido.md`:

```markdown
# Superfície esquecida — [alvo]

## 1. Método e data
## 2. Arquivo morto
| Métrica | Valor |
|---|---|
| URLs arquivadas | |
| Removidas (404) | |
| Período coberto | |
## 3. Superfície declarada
| Fonte | Achado |
|---|---|
## 4. Artefatos
| Caminho | Status | Severidade | Reportado? |
|---|---|---|---|
## 5. Achados priorizados
| # | Achado | Evidência | Severidade | Ação |
|---|---|---|---|---|
## 6. O que NÃO se pode concluir
⚠ Obrigatório, mínimo 3:
- que o arquivo morto **não** prova o estado atual
- que verificar existência **não** é o mesmo que acessar conteúdo
- que nenhum conteúdo de artefato foi baixado
```

### Critérios de aceitação

- `capturas.tsv` obtido com a CDX API, e a **distribuição por ano** calculada.
- Você identificou o **mês com concentração de 404** e escreveu a inferência **como inferência**.
- `robots.txt` obtido, com os caminhos listados.
- Você testou os **três** `.well-known`, incluindo `openid-configuration`.
- `artefatos.md` com a coluna "você baixou" marcada **"não"** em todos.
- Você explicou a diferença entre **verificar existência** e **acessar conteúdo**.
- `relatorio-esquecido.md` com as **seis** seções e **três itens** na seção 6.
- ⚠ Nenhum conteúdo de artefato foi baixado. Nenhuma credencial foi usada.

---

## Avaliação

1. Por que o arquivo morto é a fonte mais subestimada?
2. Para que serve `collapse=urlkey` na CDX API?
3. **Por que a consulta de status 404 é a mais reveladora?**
4. O que significa concentração de 404 numa mesma data?
5. Por que o `Disallow` do `robots.txt` é a lista mais valiosa — e o paradoxo dela?
6. O que o `sitemap.xml` revela, e por que comparar com o `robots` é útil?
7. O que `/.well-known/openid-configuration` revela? Por que ele é público por convenção?
8. Cite cinco artefatos de desenvolvimento e o risco de cada um.
9. Por que `.DS_Store` e `Thumbs.db` são subestimados?
10. **Diferencie verificar existência de acessar conteúdo.** Por que a distinção importa legalmente?
11. O que o metadado de documento revela sobre **estrutura** (não sobre a pessoa)?
12. Encontrar `.env` com credencial: o que você faz, e o que você **não** faz?
13. Por que "concentração de 404 sugere migração" é **inferência** e não fato?

---

**Próximo:** [Módulo 5 — Rede adjacente](modulo-05.md)
