# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos nove módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — Método: a pergunta antes da ferramenta

**1. Confirmatória vs. exploratória**

Confirmatória responde pergunta que você **já sabia formular** ("a porta 22 está aberta?").
Exploratória responde "**o que eu não sei que existe?**". A primeira usa varredura de lista; a
segunda usa **correlação de fonte**.

**2. Por que o ativo esquecido**

Porque o ativo consciente está sendo cuidado — monitorado, atualizado, com dono. **O esquecido não
tem dono, não é monitorado, e não aparece em inventário.** É o subdomínio de 2019, o bucket de
teste, o servidor de homologação que ficou em produção.

**3. Quatro famílias**

**Nome** (DNS, CT logs) · **Rede** (ASN, `PTR`) · **Serviço** (`TXT`, padrão) · **Identidade**
(repositório, registro).

**4. Cada resposta gera a próxima**

Um certificado revela nome → o nome revela `CNAME` → o `CNAME` revela o serviço → o serviço revela
o tenant → o tenant revela o dono. **A enumeração é cadeia, não lista.** É o mesmo princípio do
Diamond Model do curso de OSINT: o valor está na **relação**.

**5. Ponto cego**

A ferramenta opera sobre **a entrada que você deu**. O `nmap` varre o IP que você passou; ele não
**descobre** o IP. O `gobuster` testa a wordlist; ele não **gera** a wordlist. **Descobrir o que
enumerar é trabalho humano.**

**6. Por que `nmap` não descobre**

Porque ele recebe o alvo como parâmetro. Descobrir o alvo é o passo anterior — e é o que o CT log,
o `TXT` e o `CNAME` fazem.

**7. Cadeia CT → CNAME → terceiro**

CT log revela `staging.exemplo.com` → `CNAME` revela `exemplo-staging.herokudns.com` → Heroku
revela que o recurso pode ser reivindicado. **O risco aparece no terceiro passo:** o recurso está
livre, e qualquer um o reivindica.

**8. Enumeração é reconhecimento**

É a fase que **precede** ataque. Coletar informação sobre alvo para identificar via de entrada é
reconhecimento — e sem autorização, tem estatuto próprio (Brasil: art. 154-A e correlatos).

**9. Brute force e resolvedor público**

Porque você **consome infraestrutura de terceiro**. Volume alto é indisponibilidade, mesmo sem
tocar no alvo — e o resolvedor não autorizou seu uso sistemático. **É abuso, e o módulo 8 formaliza.**

**10. Três coisas do escopo**

Autorização (base nomeada) · escopo declarado (o que está dentro e fora) · **limites autoimpostos**
(volume, horário, resolvedor).

**11. Limites autoimpostos**

Um `for` mal escrito vira 10.000 consultas contra o resolvedor do provedor. Sem o limite declarado,
você não sabe quando parou de ser consulta e passou a ser uso sistemático.

**12. `SOA`**

O **e-mail do responsável técnico**, no formato `hostmaster.exemplo.com`. Frequentemente um
endereço interno, e às vezes revela o provedor de DNS. E o **serial**, que indica a última
alteração da zona.

---

## Módulo 2 — DNS além do `A`

**1. Oito tipos**

`A`/`AAAA` (endereço) · `CNAME` (apelido, **revela terceiro**) · `MX` (correio) · `TXT` (campo
livre) · `NS` (zona) · `SOA` (autoridade) · `CAA` (restrição de emissão) · `SRV` (serviço).

**2. `CNAME` como fonte da cadeia**

Porque revela **para onde** o nome aponta — e o destino é o terceiro. A partir dele, a próxima
pergunta é sobre o serviço.

**3. `TXT` subestimado**

Campo livre que carrega **declaração de serviço**: `google-site-verification`, `MS=`, `atlassian-`,
`facebook-domain-`, `adobe-idp-`, `docusign=`, `v=spf1 include:`, `_dmarc`.

**4. `SPF`**

`-all` = rígido (só os listados enviam). `~all` = brando (os outros são marcados, não rejeitados).
`?all` = neutro (nenhuma política).

**5. `DMARC p=none`**

Significa "monitore, não bloqueie" — o domínio continua **sujeito a spoofing**. É achado de
postura, e aparece em relatório real.

**6. `CAA` ausente**

Sem `CAA`, **qualquer CA pode emitir** certificado para o domínio. Um emissor comprometido, ou um
erro de validação, produz certificado válido.

**7. Zona aberta**

`AXFR` deveria ser restrito ao secundário. Aberta, ela entrega **a lista completa de nomes** — o que
normalmente exigiria brute force. **Ao encontrá-la, você para a enumeração de nome: já tem a
resposta.**

**8. `SOA` e serial**

E-mail do responsável técnico + serial (última alteração). Comparar serial ao longo do tempo revela
**quando** a organização mudou algo.

**9. Wildcard antes do brute force**

Porque wildcard responde para **qualquer** nome. Sem testar antes, 5.000 nomes "existem" — e todos
são o mesmo wildcard. **A contagem por existência deixa de ser confiável.**

**10. Wildcard com `CNAME`**

Porque **todo nome não usado é um take-over em potencial** — o destino é reivindicável. Wildcard
com `A` só aponta para um IP, sem risco de reivindicação.

**11. Brute force não escala**

50.000 nomes a 5 RPS = **2,8 horas** — e ainda é cobertura parcial. O CT log entrega mais, em
segundos, sem sobrecarregar ninguém.

**12. Ferramenta errada**

Quando existe CT log (a lista já está lá); com wildcard ativo; com domínio grande; quando você
**não tem autorização**.

**13. Limite de RPS**

Porque acima de certo volume, contra resolvedor de terceiro, **é varredura** — e varredura de
recurso alheio é abuso, independente de você ter tocado no alvo.

---

## Módulo 3 — Certificado como fonte de host

**1. Cadeia estrutural**

TLS exige certificado → é assinado por CA → CA é obrigada a registrar em **log público** (CT) → o
log contém todos os nomes do SAN → **você tem a lista de host da organização, de graça**.

**2. Comparação**

Brute force: parcial, 2,8 h para 50.000 nomes, **precisa autorização**. CT log: quase completa,
segundos, **não precisa** — é log público obrigatório.

**3. Quase completa**

Porque para o certificado funcionar ele precisa listar os nomes. **Incompleta** porque certificado
curinga cobre nome sem listá-lo, e host sem TLS não aparece.

**4. `%25`**

É o `%` codificado — faz busca por **subdomínio curinga**, transformando "certificado de um
domínio" em "todos os nomes da organização".

**5. `exclude=expired`**

Sem ele, você recebe anos de certificado expirado, e a lista vira ruído.

**6. `tr ',' '\n'`**

Porque `name_value` às vezes traz **vários nomes separados por vírgula** — sem o `tr`, você perde
todos menos o primeiro.

**7. Três categorias**

**Ativo** (resolve `A`) · **`CNAME`** (aponta para terceiro) · **Fora do DNS** (no CT, sem
resolução).

**8. `CNAME` é a mais valiosa**

Porque aponta para **terceiro** — e o terceiro pode ter o recurso livre. **É o candidato a
take-over.**

**9. Nome no CT sem DNS**

(1) Existiu e foi removido do DNS. (2) É interno, e o DNS público não o tem. (3) Apontava para
serviço de terceiro desativado. (4) Nunca esteve no DNS público.

**10. Validade**

Validade curta (90 dias) = **automação** (ACME/Let's Encrypt). Validade longa (365+) = emissão
manual, com renovação anual.

**11. Quantidade de emissores**

Muitos emissores = equipes independentes, sem padrão. Um só = automação centralizada, maturidade de
DevOps.

**12. Derivar nomes**

Normalizando o padrão (`s/[0-9]+/N/g` agrupa `api-01`, `api-02`). É legítimo porque o padrão é
**observado e público** — você deriva de dado real, não de chute.

**13. Cinco vs. cinco mil**

Cinco nomes derivados de padrão é **hipótese dirigida** — consulta. Cinco mil combinações é
**varredura** — uso sistemático contra recurso alheio. **O volume define o ato.**

**14. Três coisas que o CT não conclui**

Que o host existe **hoje** (certificado pode ser de 2024) · que o nome não existe (curinga cobre) ·
que o host é do cliente (pode ser de terceiro).

---

## Módulo 4 — Superfície esquecida

**1. Arquivo morto subestimado**

Porque mostra o que **existiu e não existe mais** — e a organização raramente sabe o que removeu.
É a fonte que revela estrutura histórica e limpeza deliberada.

**2. `collapse=urlkey`**

Sem ele, você recebe **uma linha por captura** — uma URL capturada 200 vezes aparece 200 vezes. Com
ele, uma por URL.

**3. Status 404**

Porque lista URL que **já foi removida**. Combinada com o nome da URL, conta o que a organização
quis esconder.

**4. Concentração de 404**

**Limpeza deliberada** — ou migração, ou reestruturação. É **inferência**, e se declara como
inferência.

**5. `Disallow`**

É a lista de onde a organização **não quer** que se olhe — e é o que o enumerador quer. O paradoxo:
**a informação está declarada, publicamente, e ninguém olha.**

**6. `sitemap` e comparação**

O `sitemap` lista o que **deve** ser indexado. Comparar com o `robots` revela a estrutura completa:
o que a organização quer que você ache, e o que ela não quer.

**7. `openid-configuration`**

Padrão público que lista `authorization_endpoint`, `token_endpoint`, `issuer` — **a estrutura de
autenticação inteira**, declarada por convenção.

**8. Cinco artefatos**

`.git/` (código-fonte) · `.env` (credencial) · backup (dado) · `Dockerfile` (infra) · `.DS_Store`
(listagem de diretório).

**9. `.DS_Store` e `Thumbs.db`**

Arquivos de sistema operacional que contêm **a listagem de arquivo do diretório** onde foram
criados — e ninguém lembra de removê-los ao publicar.

**10. Verificar vs. acessar**

**Verificar existência** é enumeração (o `curl -o /dev/null` checa o código HTTP). **Acessar
conteúdo** é aquisição (`curl -o arquivo` traz os bytes). O segundo, em alvo que não é seu, é acesso
indevido.

**11. Metadado e estrutura**

`XMP`/`Custom` às vezes grava **nome de projeto, sistema ou cliente**. O `Creator`/`Producer` revela
software e template interno. Comentário às vezes revela **estrutura de diretório**.

**12. `.env` com credencial**

Você **reporta** — caminho, horário, existência. Você **não usa** a credencial, mesmo para "testar
se funciona". Usar é crime, ainda que a credencial estivesse exposta.

**13. Inferência**

Porque o arquivo morto mostra **o que foi capturado**, com data — não **por quê**. A concentração
de 404 **sugere**; não prova. Você escreve "sugere migração", com confiança moderada.

---

## Módulo 5 — Rede adjacente

**1. ASN**

O número que identifica quem **possui** o bloco de IP. É a chave porque permite encontrar os blocos
**vizinhos** e as outras organizações no mesmo espaço.

**2. Campo do cymru**

**BGP Prefix** — o bloco anunciado. É ele que dá a rede inteira da organização, e o ponto de partida
para a adjacência.

**3. "Allocated"**

A **idade** da infraestrutura. Bloco de 1998 pertence a organização antiga; de 2024, a empresa nova.

**4. Cinco registries**

**ARIN** (América do Norte) · **RIPE NCC** (Europa, Oriente Médio, Ásia Central) · **APNIC**
(Ásia-Pacífico) · **LACNIC** (América Latina e Caribe) · **AFRINIC** (África).

**5. `whois` normal**

Porque ele segue o encadeamento de referência entre registries automaticamente. Você não precisa
saber qual é — mas saber que ARIN retorna encadeado ajuda a ler a saída.

**6. RIPE**

`whois -h whois.ripe.net "-i origin ASnnnn"` — lista **todos os blocos** com aquela origem. É o
comando mais produtivo na Europa.

**7. AS de CDN**

**A origem.** Se o IP é borda de CDN, o servidor real está atrás — e não é alcançável por ASN. O
curso de OSINT já estabeleceu: IP atrás de CDN **não revela** a origem.

**8. PeeringDB**

Revela `info_type`, `irr_as_set` e **onde** a organização troca tráfego. Limitação: é **declaração
voluntária** — a ausência **não** significa que o AS não existe.

**9. `compute.internal`**

**Provider, região e intervalo privado** — ou seja, a arquitetura de nuvem. Ex.:
`ip-10-0-1-5.us-east-1.compute.internal` revela AWS, us-east-1, e o intervalo privado.

**10. PTR de vizinho**

Porque blocos de VPS frequentemente têm `PTR` com **o nome do cliente** — então consultar o reverso
ao redor revela **outras organizações** hospedadas no mesmo bloco.

**11. Registro vs. varredura**

Consultar registro é **leitura de banco público**. Varrer é **enviar pacote ao host de terceiro**. O
primeiro é enumeração; o segundo, sem autorização, é reconhecimento não autorizado.

**12. Quantos IPs**

**Dez** ao redor é informação de vizinhança (consulta de registro/`PTR`). **254** é varredura de
bloco. **O volume define o ato** — e o limite do curso é baixo.

**13. Terceiro desconhecido**

Pode ser: serviço legítimo terceirizado, ou **take-over** — o módulo 6 decide, pela assinatura do
serviço.

**14. `www` em CDN, `api` no bloco próprio**

**Achado de arquitetura:** a organização usa CDN para o site público e **expõe a origem** no `api`.
Isso significa que a CDN não protege tudo — e que a origem é alcançável.

**15. Três coisas que não se conclui**

Que o vizinho é do alvo (proximidade não é posse) · que a origem está no bloco (CDN esconde) · que
o AS define a organização (nuvem compartilha).

---

## Módulo 6 — Exposição em terceiro

**1. Oito padrões**

`herokudns` (Heroku) · `cloudfront.net` (AWS CF) · `s3.amazonaws.com` (S3) · `azurewebsites.net`
(Azure) · `appspot.com` (GAE) · `github.io` (GitHub Pages) · `netlify.app` · `vercel.app` ·
`myshopify.com` · `zendesk.com`.

**2. Serviço não é vulnerabilidade**

Porque saber que `dev.exemplo.com → exemplo.github.io` só diz **onde olhar**. Se o repositório
`exemplo` existe, o subdomínio está seguro. **O serviço indica o lugar; a assinatura indica o
diagnóstico.**

**3. Verificar vs. reivindicar**

Verificar é **ler a resposta** do destino e comparar com a assinatura conhecida. Reivindicar é
**criar o recurso** — o que faz dele seu. O primeiro é diagnóstico; o segundo é ataque.

**4. Por que é crime**

Porque reivindicar recurso de terceiro é **apoderar-se de coisa alheia** — art. 155 (furto), 168
(apropriação indébita) ou 154-A, conforme o caso. E o serviço permitir **não é** autorização do
dono do subdomínio.

**5. Assinaturas**

`NoSuchBucket` (S3) · `No such app` (Heroku) · `There isn't a GitHub Pages site here` (GitHub) ·
`404 Web Site not found` (Azure) · `this shop is currently unavailable` (Shopify).

**6. `404` genérico**

Porque **qualquer coisa** devolve 404 — proxy, serviço fora do ar, recurso diferente. **Prova é a
assinatura específica do serviço**, que o mantenedor consegue verificar.

**7. Falsos positivos**

Serviço fora do ar (teste em outro momento) · assinatura de **outro** recurso (compare com a tabela
oficial) · proxy com 404 genérico (**sem assinatura → não é prova**).

**8. Bucket e nome global**

Porque **só existe um bucket com aquele nome no mundo**. Se está livre, qualquer um cria — e o nome
está referenciado em algum lugar do domínio do alvo.

**9. Três formas de URL do S3**

`bucket.s3.amazonaws.com`, `s3.amazonaws.com/bucket`, `bucket.s3.REGIAO.amazonaws.com`. Testar só
uma **perde achado**.

**10. Quatro consequências**

Phishing sob domínio legítimo · receber cookie do domínio pai (se mal configurado) · burlar
allowlist que confia em `*.exemplo.com` · obter **certificado válido** para o domínio.

**11. Verificar `.env`**

Porque **existir** é achado — a organização não sabe que está exposta. **Baixar** é aquisição, e
mesmo repositório público tem termo de uso — e o conteúdo pode ter **credencial de terceiro**.

**12. Credencial pública**

**Reporta** a existência, com repositório, arquivo e data. **Não usa**, mesmo para "testar se
funciona". O achado é de severidade alta porque a exposição é desconhecida.

**13. Cadastro aberto**

Porque permite que **qualquer pessoa com e-mail entre na organização** — acesso a Jira, Confluence,
dado interno. E a verificação é pública: a tela de cadastro responde.

**14. LGPD**

Painel que **expõe nome de membro** publicamente. Isso é **dado pessoal** — e é conformidade, não só
segurança.

**15. Declaração de conduta**

Porque separa o relatório de auditoria do relatório de quem testou "só para provar". Ela é o que
torna o entregável **defensável**.

---

## Módulo 7 — Correlação

**1. Normalizações**

Minúscula · ponto final (`exemplo.com.`) · curinga (`*.`) · esquema (`https://`) · representação de
IP · espaço em branco.

**2. 2+ fontes**

Porque **independência de fonte é o que dá confiança** — o mesmo princípio do curso de OSINT. Um
nome no CT log, no DNS e no arquivo morto é **corroborado por três fontes independentes**.

**3. Cinco evidências**

Registro de domínio (**forte**) · registro de empresa (**forte**) · bloco de IP (**forte**) ·
certificado (média) · `NS`/`MX` (média) · **ASN (fraca)** · nome parecido (**fraca**).

**4. ASN é fraca**

Porque **milhares** de organizações compartilham o mesmo ASN de nuvem. Prova apenas que os hosts
estão no mesmo provedor — não que têm o mesmo dono.

**5. Ativo órfão**

Ativo no DNS/certificado do cliente cujo **recurso de destino não pertence a ninguém**. É o take-over
— e o mais valioso porque a organização **não sabe** que o ativo está exposto.

**6. Recurso de outra organização**

Porque é o **funcionamento normal** da nuvem — vários clientes no mesmo provedor. Não é achado do
seu cliente, e não é seu para reportar. **Você declara que verificou.**

**7. Matriz**

`exposição × alcance × facilidade`. O produto força a comparação e obriga a **justificar** por que
um achado vem antes de outro.

**8. Zona aberta**

Porque entrega **o mapa inteiro** de nomes — e isso **multiplica o risco de tudo** que está nele. O
impacto é indireto, mas alto.

**9. Exposição vs. postura**

**Exposição:** bucket livre, take-over, `.env` acessível. **Postura:** `DMARC p=none`, ausência de
`CAA`. A primeira é vulnerabilidade; a segunda é configuração.

**10. Heurística**

A pontuação não conhece o contexto do cliente — regulação, criticidade, exposição pública. Quando
ela erra, você **ajusta e declara o motivo**.

**11. Candidatos**

Porque diz ao cliente **onde olhar depois** — e mostra que você **não inventou achado** para inflar
o relatório. É o que constrói confiança.

**12. Declaração de conduta**

Porque em auditoria, **o que você não fez protege tanto quanto o que fez** — e declarar é o que
impede a dúvida. É o que torna o relatório defensável.

**13. Não consegui atribuir**

Você **declara incerteza** — "não foi possível atribuir posse com a evidência disponível". Atribuir
por palpite é o erro que faz o relatório perder credibilidade — e o que faz perder o ativo órfão.

---

## Módulo 8 — Limites

**1. Consulta, enumeração, varredura**

**Consulta:** leitura de fonte pública sobre ativo. **Enumeração:** mapeamento com consentimento.
**Varredura:** pacote enviado a host que não é seu. Linhas: a enumeração precisa de consentimento;
a varredura, de autorização específica.

**2. Volume define o ato**

Porque você **raramente decide atacar** — você decide aumentar o paralelismo para terminar mais
rápido. **É o mesmo ato, com nome diferente** — e o efeito na infraestrutura de terceiro é idêntico.

**3. 10.000 `dig`**

Porque você **consome infraestrutura de terceiro**. O resolvedor não autorizou uso sistemático, e o
volume é o que caracteriza abuso — não a intenção.

**4. Linha enumeração/varredura**

O pacote **chega no host de terceiro**? Se sim, autorização específica. "Só enumerei" não é defesa
porque a lei não distingue a fase que precede ataque.

**5. Três autorizações**

**Ativo próprio** (implícita) · **escopo de bug bounty** (só o declarado) · **contrato de auditoria**
(IP/domínio/janela).

**6. Armadilha do bug bounty**

Escopo **incompleto**: `*.exemplo.com` pode **excluir** `admin.exemplo.com`. Enumerar o excluído é
violar o escopo — e programas seriamente aplicam banimento permanente.

**7. Armadilha do contrato**

A **janela de horário**. "Teste entre 22h e 06h" não é sugestão — se você enumera às 14h, está fora
do escopo, mesmo com o alvo autorizado.

**8. Proporcionalidade**

Autorização → necessidade → **volume** → impacto → proporção → registro. Se a autorização não
existe, não há etapa 2.

**9. Etapa esquecida**

A **3 (volume)**. Você não decide "vou atacar"; você decide "vou paralelizar mais".

**10. Termo vs. `robots` vs. `429`**

**Termo de serviço:** contrato — vincula, com consequência civil. **`robots.txt`:** convenção (RFC
9309) — declaração de vontade. **`429`:** **instrução** do serviço.

**11. `429`**

Porque é o serviço **pedindo para parar**. Continuar é o comportamento que caracteriza abuso — e um
script que ignora `429` é um script que insiste.

**12. `User-Agent`**

Porque quem opera o serviço precisa saber **quem** consulta. Sem identificação, você é tráfego
anônimo indistinguível de abuso.

**13. Lista de "não"**

A seção 5 da declaração. Importa porque em auditoria **o que você não fez protege tanto quanto o
que fez** — e declarar impede a dúvida.

**14. LGPD**

Minimização · sigilo · retenção definida · destruição documentada. Enumeração frequentemente
encontra dado pessoal: nome no metadado, e-mail no `SOA`, lista de membro em painel.

**15. "É só enumeração pública"**

Porque enumeração sistemática contra ativo de terceiro **é reconhecimento** — a fase que precede
ataque. **A lei não faz a distinção que a intenção faz.**

---

## Módulo 9 — Projeto

**1. Autorização antes**

Porque sem ela, o resto não se faz. É a diferença entre auditoria e crime.

**2. Três sujeitos**

**Domínio próprio** · **laboratório local** · **escopo de bug bounty**. Os outros não são válidos
porque não têm base — e "estudar" não é autorização.

**3–12. Pessoais**

Dependem do sujeito escolhido, das fontes consultadas e do que você achou.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Fonte citada | 30% | Toda consulta com data, fonte e saída |
| Método explícito | 25% | A cadeia de pergunta → resposta está registrada |
| Limitações | 25% | O que não foi possível concluir, e por quê |
| Volume respeitado | 20% | `sleep`, RPS, limite de nomes |

**Penalidades automáticas:**

- Consulta sem data: −15%.
- Sujeito inválido (terceiro sem autorização): **lab zerado**.
- Script sem `sleep` em consulta a terceiro: −15%.
- `404` genérico apresentado como take-over: −20%.
- Reivindicação, download ou cadastro: **lab zerado**.
- Ausência de declaração de conduta: −20%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| Autorização | Não declara | Nomeia a base | Nomeia, com escopo e limites |
| Fontes | Uma | Três | **Cinco**, com limitação de cada |
| Cadeia | Lista de achado | Achados organizados | **Cada achado gera a próxima pergunta** |
| Posse | Não avalia | Verifica registro | **Classifica a força** da evidência |
| Prioridade | Ordem de descoberta | Ordena por risco | Pontua e **justifica o ajuste** |
| Postura | Mistura | Separa | Separa e recomenda |
| Limitações | Ausente | Lista o óbvio | Lista + **declaração de conduta completa** |
| Conduta | Ausente | Menciona | **Nove caixas** + dado pessoal tratado |

**O item de maior valor:** a **cadeia de perguntas** — mostrar que cada achado abriu uma pergunta
nova. É o que separa enumeração de lista.

---

*Material didático original, de propósito defensivo e de auditoria autorizada.*
