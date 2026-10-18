# Módulo 3 — Busca Avançada e Superfície Oculta

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Usar operadores de busca com precisão — e saber quando eles **não** funcionam.
2. Entender o que está indexado, o que não está, e por quê.
3. Recuperar conteúdo **removido** por arquivo morto e cache.
4. Encontrar documento e dado em **índice esquecido**.
5. Fazer a própria pegada digital — o exercício de maior valor prático do módulo.

---

## ⚠ Conduta

⚠ **Este módulo tem a linha mais delicada do curso**, porque busca avançada é frequentemente usada
para alcançar coisa que não deveria ser alcançada.

| Você pode | Você **não pode** |
|---|---|
| Buscar em índice público | Buscar dado que vaza por erro de configuração e **usá-lo** |
| Usar operador de busca | Fazer *dorking* para achar painel exposto e entrar |
| Ler arquivo morto | Contornar autenticação ou rate limit |
| Buscar a **sua própria** pegada | Buscar a pegada de pessoa real |

⚠ **A distinção que vale:** encontrar dado exposto por má configuração **não é autorização para
usá-lo**. Em muitos casos, acessar é o crime — não o buscar (Módulo 10).

⚠ **Todo lab deste módulo usa: dado público de empresa, conteúdo público de referência, e a SUA
própria pegada.** Nenhuma pessoa real.

---

## 3.1 O que é indexado — e o que não é

A primeira coisa a entender é que **existe uma internet que a busca não vê**, e ela é imensa.

| Camada | Descrição | Exemplos |
|---|---|---|
| **Superfície** | Indexado por busca comum | Site público, notícia, blog |
| **Profundo** | Existe, não é indexado | Banco de dado, intranet, catálogo com formulário |
| **Escuro** | Requer software específico | Rede Tor (`.onion`), I2P |
| **Arquivo morto** | Existiu e foi removido | Versão antiga de página, documento retirado |

⚠ **Confusão comum que vale desfazer:** "deep web" **não é** sinônimo de "coisa ilegal". A maior
parte da deep web é entediante — seu extrato bancário, o sistema de RH da sua empresa, o catálogo
da biblioteca. **Não indexado ≠ ilícito.**

### Por que algo não é indexado

| Razão | Exemplo | Você consegue alcançar? |
|---|---|---|
| Precisa de login | Extrato bancário | Não — e não deve |
| Precisa de formulário | Consulta por CPF | Depende da legalidade |
| `robots.txt` bloqueia | Área administrativa | Só se for autorizado |
| Requer software específico | `.onion` | Só com Tor |
| Sem link de entrada | Página órfã | Só por busca avançada |
| Tipo de arquivo não indexado | Dado estruturado | Por `filetype:` |
| Removido depois de indexado | Notícia retirada | **Por arquivo morto** |

⚠ **A linha "sem link de entrada" é o achado interessante.** Página que ninguém linka não aparece
em busca normal — mas pode aparecer por operador específico. É o mecanismo legítimo de *dorking*,
e é onde a linha com uso indevido fica fina.

---

## 3.2 Operadores de busca

Os operadores mudam de sintaxe entre buscadores. Este material usa os do Google como referência e
aponta a diferença.

| Operador | O que faz | Exemplo |
|---|---|---|
| `"frase exata"` | Busca literal | `"relatório anual 2025"` |
| `-termo` | Exclui | `banco -"banco de dados"` |
| `OR` / `\|` | Alternativa | `Müller OR Mueller` |
| `site:` | Limita a domínio (e a subdomínio) | `site:gov.br` |
| `filetype:` | Tipo de arquivo | `filetype:xlsx` |
| `intitle:` | Palavra no título | `intitle:"index of"` |
| `inurl:` | Palavra na URL | `inurl:cadastro` |
| `intext:` | Palavra no corpo | `intext:cnpj` |
| `before:` / `after:` | Recorte temporal | `after:2025-01-01` |
| `AROUND(n)` | Proximidade | `diretor AROUND(3) renúncia` |
| `*` | Curinga (limitado) | `"ministro * renunciou"` |
| `cache:` | Versão em cache | **Depreciado** |
| `related:` | Site similar | `related:bbc.com` |

⚠ **Três avisos que economizam horas:**

1. **`cache:` foi descontinuado** no Google. Use o arquivo morto (§3.3).
2. **`filetype:` só vê o que está indexado** — PDF e documento costumam estar; dado estruturado
   raramente.
3. **Aspas com muitos termos reduzem a zero.** Comece com dois ou três.

### Combinando operadores — o que vale

```bash
# Exemplo 1: documento oficial de um órgão, de um período
site:gov.br filetype:pdf after:2024-01-01 intitle:relatório

# Exemplo 2: reunião de duas entidades, em qualquer página
"conselho de administração" AROUND(5) "joint venture"

# Exemplo 3: registro público em site de terceiro país
site:*.de "Handelsregister" HRB

# Exemplo 4: o mesmo nome em duas grafias, excluindo ruído
(Dmitri OR Dmitry) OR Dmitrij -"Dmitri Mendeleev"
```

⚠ **Regra de ouro dos operadores:** **estreite por iteração.** Comece amplo, veja o volume, e
acrescente operador um por vez. Uma consulta com seis operadores que retorna zero não te ensina
nada — três iterações que retornam 10.000, 200, e 4 te ensinam o que existe.

```bash
# Verifique onde está a sua pegada indexada (você é o sujeito)
echo 'busque no seu buscador favorito:'
echo '  "seu nome completo"'
echo '  "seu apelido" -site:seusite.com'
echo '  "seu email"'
echo '  filetype:pdf "seu nome"'
```

---

## 3.3 Arquivo morto — recuperar o que foi removido

O conteúdo **mais valioso** em OSINT costuma ser o que **já não está lá**.

| Fonte | O que guarda | Como acessar |
|---|---|---|
| **Wayback Machine** | Cópia de página, por data | `web.archive.org` |
| **archive.today** | Cópia sob demanda, e de página que remove conteúdo | `archive.ph` |
| **Google Cache** | Descontinuado | — |
| **Bing Cache** | Versão em cache | Resultado de busca |
| **Common Crawl** | Corpus bruto da web | `commoncrawl.org` |
| **Arquivo nacional** | Documento histórico | Por país |
| **Wayback CDX API** | **Índice** de tudo que foi capturado de um domínio | `web.archive.org/cdx/` |

⚠ **A CDX API é o recurso subestimado.** Ela **não** devolve página — devolve **a lista de URLs
que já foram capturadas** de um domínio, com data. Isso revela **estrutura histórica**: seções que
existiam e não existem mais, página com nome revelador, parâmetro antigo.

```bash
# Todas as capturas de um domínio, com data e status
curl -s "http://web.archive.org/cdx/search/cdx?url=exemplo.gov.br&output=json&limit=50" | \
  jq -r '.[] | @tsv' | head -30

# Só URLs que NÃO existem mais (status 404 na captura)
curl -s "http://web.archive.org/cdx/search/cdx?url=exemplo.gov.br*&output=json&filter=statuscode:404&collapse=urlkey&limit=100" | \
  jq -r '.[] | .[2]' | sort -u | head -30

# Capturas de um caminho específico, ao longo do tempo
curl -s "http://web.archive.org/cdx/search/cdx?url=exemplo.gov.br/equipe*&output=json" | \
  jq -r '.[] | [.[1], .[2]] | @tsv' | head -20
```

⚠ **A segunda consulta é ouro:** URLs que **retornavam 404 na hora da captura** indicam página que
já foi removida. Combinada com o nome da URL, ela conta o que a organização **quis esconder**.

⚠ **Sempre que encontrar algo relevante, arquive imediatamente.** Conteúdo em OSINT é volátil — a
página que você cita hoje pode não existir amanhã, e um achado sem cópia arquivada é um achado
frágil (Módulo 11).

```bash
# Arquive para referência futura
curl -s "https://web.archive.org/save/https://exemplo.gov.br/pagina" | head -5
# ou use archive.ph pelo navegador
```

---

## 3.4 Índice esquecido, metadado e fragmento

Três fontes que quase ninguém usa e que rendem muito.

### Listagem de diretório exposta

Servidor mal configurado lista o conteúdo de uma pasta. Isso é **exposição por erro** e não
autorização — a linha do módulo.

⚠ **Uso correto:** identificar que existe exposição, **reportar ao responsável**, e **não navegar
além do necessário para confirmar**. Uso incorreto — e potencialmente crime — é baixar o conteúdo.

### Metadado de documento

Já visto nos Módulos 2 e 8: documento carrega autor, software, versão, tempo de edição, às vezes
comentário de revisão. **O metadado frequentemente revela mais que o conteúdo.**

```bash
# Exemplo com documento público
# (use um arquivo que você tem direito, ou o seu próprio)
exiftool documento.pdf | head -20
exiftool documento.docx | head -20

# Em lote
find . -name '*.pdf' -exec exiftool -Author -Creator -CreateDate {} \; 2>/dev/null
```

⚠ **Cuidado com o que isso significa para você.** Se documento público do seu alvo carrega
metadado, **o seu também carrega**. Isso é o §3.5.

### Fragmento de URL e parâmetro

Parâmetro na URL frequentemente expõe estrutura interna (`?id=`, `?user=`, `?doc=`). E o
**fragmento** (`#`) raramente é enviado ao servidor, mas aparece em indexação de terceiro.

⚠ **Não teste parâmetro para ver "o que acontece".** Isso é *teste de segurança* sem autorização
(Módulo 10). **Observar** parâmetro em URL indexada é OSINT; **manipular** é outra coisa.

---

## 3.5 A sua pegada digital — o exercício do módulo

⚠ **Este é o lab de maior valor prático do curso inteiro.** Você é o alvo, e você tem autorização
total sobre você mesmo.

### O que você vai descobrir

| Camada | O que buscar | O que costuma aparecer |
|---|---|---|
| **Nome** | `"Seu Nome Completo"` | Perfil antigo, menção em ata, lista de turma |
| **Apelido** | O que você usa em fórum, jogo, rede | **Correlação entre contas** |
| **E-mail** | Endereço direto e em `filetype:` | Vazamento, post em lista, commit |
| **Telefone** | Com e sem formatação | Anúncio, cadastro público |
| **Imagem** | Busca reversa | Foto usada em outro perfil |
| **Metadado** | Documento que **você** publicou | Autor, software, local |
| **Domínio** | Se você tem | Registro, histórico, certificado |
| **Sobreposição** | Combinação dos anteriores | **A correlação é o achado** |

⚠ **O ponto não é achar cada item — é ver a correlação.** Isoladamente, um apelido não diz nada.
Combinado com um e-mail em commit público e uma foto com metadado de GPS, ele diz **onde você
estava e quando**.

### O que fazer com o resultado

⚠ **Não entre em pânico e não apague tudo.** A resposta correta é **calibrada pelo seu modelo de
ameaça** — o mesmo exercício do curso de anonimato.

| Achado | Ação |
|---|---|
| Perfil antigo que você quer esquecer | Remover ou desindexar |
| Apelido correlacionando contas | Separar identidades |
| Metadado de documento | **Limpar antes de publicar** (`mat2`) |
| E-mail em vazamento | Trocar senha, e **nunca reutilizar** |
| Foto com GPS | Remover metadado das que estão publicadas |

---

## 3.6 LAB — Busca avançada com sujeito permitido

**Duração:** 120 min

⚠ **Sujeitos permitidos:** (a) **você mesmo**; (b) **entidade pública** — empresa, órgão,
organização; (c) conteúdo de referência. **Nunca pessoa real.**

### Parte A — A sua pegada (45 min)

```bash
mkdir -p ~/osint-lab/lab3 && cd ~/osint-lab/lab3
cat > pegada.md <<'EOF'
# Minha pegada digital — varredura
Data: 2026-10-18

## 1. Nome completo
| Busca | O que apareceu | Fonte | Eu quero isso público? |

## 2. Apelidos / handles
| Apelido | Onde aparece | Correlaciona com outra conta? |

## 3. E-mail
| Endereço | Onde aparece | É vazamento? |

## 4. Telefone
| Forma buscada | Onde aparece |

## 5. Imagem
| Imagem | Busca reversa encontrou | Onde mais ela existe |

## 6. Metadado
| Arquivo que EU publiquei | O que o metadado revela |

## 7. Sobreposição
Qual combinação de dados me identifica sozinha?

## 8. Ação
| Achado | Severidade | Ação | Feito? |
EOF
echo "Arquivo criado. Preencha com buscas reais sobre você."
```

**Roteiro de busca (sobre você):**

```bash
echo "Buscas a fazer — com aspas para precisão, e variando a forma:"
cat <<'EOF'
  "SEU NOME COMPLETO"
  "SEU NOME" -"outro nome parecido"
  "seu.apelido"
  "seu@email.com"
  "seu@email.com" filetype:pdf
  "+55 SEUDDD SEUNUMERO"
  SEUDDD SEUNUMERO -site:seusite
  site:github.com "seu-usuario"
  site:linkedin.com "SEU NOME"
EOF
```

**Busca reversa de imagem:**

```
Google Imagens → ícone da câmera → envie a foto
Também: Yandex (frequentemente melhor para rosto), Bing, TinEye
```

⚠ **Use uma foto sua, não de outra pessoa.** Busca reversa em foto alheia é investigação de pessoa
— e não está no lab.

**Metadado do que você publicou:**

```bash
# Analise um arquivo que você mesmo publicou
exiftool ~/Downloads/seu-documento.pdf 2>/dev/null | head -25

# Limpe antes de publicar (instale mat2)
sudo apt install -y mat2
mat2 ~/Downloads/seu-documento.pdf
exiftool ~/Downloads/seu-documento.cleaned.pdf 2>/dev/null | head -10
```

**Produza `pegada.md` preenchido**, e responda:

1. **Qual combinação de dados te identifica sozinha?** (A sobreposição é o achado.)
2. Você encontrou algo que **não sabia** que estava público?
3. Qual achado tem **maior severidade** no seu caso, e por quê?
4. Que ação você toma **esta semana**?

### Parte B — Operadores em entidade pública (35 min)

⚠ **Sujeito: empresa ou órgão público.** É legítimo e não envolve pessoa.

Escolha uma entidade pública (empresa listada, órgão de governo, ONG grande) e aplique:

| Consulta | Objetivo | Resultado |
|---|---|---|
| `site:<dominio> filetype:pdf` | Documento oficial | |
| `site:<dominio> intitle:relatório after:2025-01-01` | Documento recente | |
| `"<nome da empresa>" filetype:xlsx` | Planilha pública | |
| `"<nome>" AROUND(5) "contrato"` | Menção contratual | |
| `"<nome>" -site:<proprio site>` | Menção de terceiro | |
| `inurl:<termo> site:<dominio>` | Estrutura de URL | |
| `"<nome>" OR "<nome alternativo>"` | Variação de grafia | |

**Registre** em `operadores.md`, com **a consulta exata** e **o que retornou** (volume aproximado
e o achado, se houver).

**Responda:**

1. **Em qual iteração o volume caiu de forma útil?** Mostre o número.
2. Qual operador trouxe o resultado **mais inesperado**?
3. Qual consulta retornou **zero**? Por que provavelmente?
4. Você encontrou algum documento com **metadado revelador**? O que ele mostra?

### Parte C — Arquivo morto (40 min)

⚠ **Sujeito: a sua própria pegada, ou entidade pública.** Não arquive página de pessoa.

```bash
# Este é o exercício com o CDX API
DOMINIO="exemplo.gov.br"     # substitua por um domínio seu ou público

echo "=== Capturas existentes ==="
curl -s "http://web.archive.org/cdx/search/cdx?url=${DOMINIO}&output=json&limit=20" | \
  jq -r '.[] | @tsv' 2>/dev/null | head -20

echo
echo "=== URLs que retornavam 404 (página removida) ==="
curl -s "http://web.archive.org/cdx/search/cdx?url=${DOMINIO}*&output=json&filter=statuscode:404&collapse=urlkey&limit=100" | \
  jq -r '.[] | .[2]' 2>/dev/null | sort -u | head -25
```

**Produza `arquivo.md`:**

| Consulta CDX | O que retornou | O que revela |
|---|---|---|
| Capturas gerais | | |
| URLs com 404 histórico | | |

**Responda:**

1. **Quantas URLs que não existem mais você encontrou?** Alguma tem nome revelador?
2. Que **estrutura** do site o histórico revela que o site atual não mostra?
3. Se você achou algo relevante, **você arquivou?** Como?
4. Por que arquivar imediatamente é parte do método, e não uma etapa opcional?

⚠ **A resposta 4 é o ponto:** página que você cita hoje pode não existir amanhã. Achado sem cópia
arquivada é achado frágil — e o Módulo 11 trata isso como cadeia de custódia.

### Critérios de aceitação

- `pegada.md` preenchido com **buscas reais sobre você**.
- Você identificou **a combinação que te identifica sozinha**, não só itens isolados.
- `operadores.md` com a **consulta exata** de cada busca e o volume/achado.
- Você identificou em qual iteração o volume caiu de forma útil, **com número**.
- `arquivo.md` com a consulta CDX rodada e as URLs removidas encontradas.
- Você **arquivou** o conteúdo relevante que encontrou.
- Você limpou o metadado de pelo menos um arquivo com `mat2`.
- ⚠ **Nenhuma busca foi sobre pessoa real.** Só você, e entidade pública.

---

## Avaliação

1. Explique as quatro camadas da internet. Por que "deep web" não é sinônimo de ilícito?
2. Cite cinco razões pelas quais algo não é indexado, com um exemplo de cada.
3. Por que "página sem link de entrada" é o caso interessante para busca avançada?
4. Qual a diferença estrutural entre `site:` e `intitle:`? Quando cada um é mais útil?
5. Por que `cache:` não é mais confiável? O que substitui?
6. Por que `filetype:` não encontra tudo? O que costuma estar e o que não está?
7. Explique a regra de "estreitar por iteração". Por que uma consulta de seis operadores é pior
   que três de dois?
8. O que o CDX API devolve, e por que isso é diferente de devolver a página?
9. **Por que a consulta de URLs com status 404 é valiosa?** O que ela conta?
10. Por que arquivar imediatamente é parte do método e não etapa opcional?
11. Encontrar dado exposto por má configuração é OSINT? O que você pode e o que não pode fazer?
12. Por que a **sobreposição** de dados é o achado, e não cada dado isolado?
13. Por que a linha do *dorking* é a mais delicada do curso? Como você a mantém?

---

**Próximo:** [Módulo 4 — Pessoa: identidade e registro](modulo-04.md)
