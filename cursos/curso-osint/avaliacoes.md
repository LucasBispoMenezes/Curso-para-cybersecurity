# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos doze módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — Fundamentos e o ciclo

**1. Definição de OSINT**

Inteligência produzida a partir de fonte **aberta** — disponível a qualquer pessoa, obtida **sem**
acesso não autorizado, sem engano e sem violação. As três palavras: *Open* (qualquer um obtém,
legalmente), *Source* (origem identificável), *Intelligence* (análise com relevância, não dado bruto).

**2. A pergunta correta**

Porque "público" na prática é diferente de "obtível sem violar nada". Uma base vazada é acessível
e **não é** OSINT — é dado obtido ilicitamente, com consequência legal própria para quem o manuseia.

**3. Base vazada**

Porque a origem é ilícita. Quem vazou cometeu o crime; quem manuseia assume responsabilidade
própria. "Eu só encontrei" não é defesa — o tratamento do dado é ato seu.

**4. Data broker**

Você não sabe a origem. Se a origem for vazamento, você **manuseou dado ilícito** — e isso é
problema seu, não do vendedor. A pergunta: *"se eu tivesse que explicar num tribunal como obtive
isto, minha resposta seria boa?"*

**5. Dado, informação, achado**

Dado: observação bruta. Informação: dado com contexto. Achado: informação **verificada**, com
fonte, data e confiança declarada. O que transforma informação em achado é a **verificação**.

**6. Confiança obrigatória**

Porque determina o que o consumidor pode fazer. "Alta" permite decidir; "baixa" não. Omitir faz o
consumidor tratar tudo como certo — e em contexto legal ou jornalístico, isso é indesculpável.

**7. Seis fases**

Definição → planejamento → coleta → verificação → análise → documentação. Quebra mais na **coleta
sem registro** e na **verificação com fonte não independente**.

**8. Falso consenso**

Três sites com o mesmo dado que **copiaram um do outro** não são três fontes — são uma. O teste:
as fontes poderiam discordar? Cada uma tem método próprio? Alguma cita a outra como origem?

**9. Quatro erros**

Viés de confirmação → procure o que refuta · falso consenso → verifique independência · ancoragem
→ liste hipóteses antes · conclusão prematura → declare confiança e o que falta.

**10. Curso global**

Porque a mesma pergunta tem resposta diferente em 195 países. Em vez de lista, o curso ensina a
**derivar a fonte da estrutura do dado** — o que sobrevive à mudança de site, de governo e de país.

**11. `DE 123456789`**

É Alemanha, e é **VAT** (imposto de valor agregado) de empresa — logo o registro é o
Handelsregister. Antes de qualquer consulta, o identificador já estreitou o mundo a um país e a um
tipo de registro.

**12. LEI**

Identificador **global** de entidade legal (ISO 17442), mantido pelo GLEIF, gratuito de consultar.
Existe porque a crise de 2008 mostrou que ninguém conseguia dizer **qual entidade jurídica** era
qual em transação internacional. Com o LEI, você tem a entidade sem saber qual é o registro
nacional.

**13. Negativo documentado**

Porque sem ele você refaz o trabalho, e porque um negativo **não documentado** vira "não existe" na
cabeça de quem lê. Documentar a busca, a data e o método transforma ausência em achado.

---

## Módulo 2 — O identificador e a jurisdição

**1. Ler antes de buscar**

Porque o formato do dado **já diz** onde procurar. Isso é o que torna a investigação global viável
sem decorar 200 registros.

**2. O que cada número diz**

`+55 11 98765-4321`: Brasil, DDD 11 (São Paulo), **celular** (o `9` inicial). `+49 30 901820`:
Alemanha, Berlim, **fixo** (não tem o padrão de móvel).

**3. Zero de tronco**

No formato nacional muitos países usam um zero que **desaparece** em E.164. Mantê-lo quebra a
validação. `040` (Hamburgo) vira `+49 40`.

**4. `+1`**

Código compartilhado por EUA e Canadá (e territórios). O prefixo **não** permite determinar o país.
A ferramenta chuta pelo bloco, e o chute pode estar certo ou não.

**5. LEI**

Identificador global de entidade legal, 20 caracteres, mantido pelo GLEIF. Resolve o problema de
não saber qual registro nacional consultar.

**6. LEI vs. DUNS**

LEI é mantido por fundação **sem fins lucrativos**, com acesso aberto e gratuito. DUNS é
**proprietário** (D&B). Em relatório, prefira LEI; cite DUNS como secundário, sabendo que é comercial.

**7. Cinco armadilhas**

Código de país não é área (`+1`); zero de tronco; dígito de operadora legado; comprimento variável
(Alemanha); zero à esquerda significativo. Cada uma faz a busca falhar.

**8. Nome**

É o identificador com mais variação e menos garantia: transliteração, ordem (sobrenome primeiro em
JP/KR/HU), partícula (`van`, `von`, `bin`), casamento (dois sobrenomes em ES/PT), patronímico,
ausência de espaço.

**9. "Não encontrei"**

Porque a mesma pessoa pode estar em cirílico, em transliteração ISO, em anglo-saxônica ou em
BGN/PCGN — todas corretas. Antes de concluir ausência, teste **múltiplas grafias**, e a forma nativa.

**10. Árvore de empresa**

Identificador nacional existe? → jurisdição direta ao registro. Só nome? → inferir país e usar
OpenCorporates como índice. LEI? → GLEIF resolve em qualquer país. Offshore? → o problema é
**estrutura**, não registro.

**11. `.io`**

Nada sobre a empresa. É um TLD historicamente ligado a um território britânico, hoje comercial, e
usado por startups do mundo inteiro porque "soa tech". O que ele diz é apenas **quem é o registro
do domínio**.

**12. Complete a frase**

"O identificador **sugere**, não **determina**." Por isso confiança declarada é obrigatória: o
dado aponta, não prova.

---

## Módulo 3 — Busca avançada e superfície oculta

**1. Quatro camadas**

Superfície (indexado) · profunda (existe, não indexado — extrato, RH, catálogo) · escura (requer
software, Tor) · arquivo morto (existiu e foi removido). "Deep web" **não** é sinônimo de ilícito:
a maior parte dela é entediante.

**2. Cinco razões para não indexar**

Login · formulário · `robots.txt` · software específico · sem link de entrada · tipo não indexado ·
removido depois.

**3. Sem link de entrada**

Porque a busca comum depende de link. Página órfã não aparece por consulta normal, mas pode
aparecer por operador específico — é o mecanismo legítimo de *dorking*.

**4. `site:` vs. `intitle:`**

`site:` limita a domínio e subdomínio — bom para "o que existe neste site". `intitle:` busca no
título — bom para achar padrão de página (ex.: `intitle:relatório`).

**5. `cache:`**

Foi descontinuado. Substitui-se pelo arquivo morto (Wayback), que é mais confiável porque é de
terceiro e datado.

**6. `filetype:`**

Só vê o que está indexado. PDF e documento costumam estar; dado estruturado e conteúdo gerado
dinamicamente, raramente.

**7. Estreitar por iteração**

Comece amplo, veja o volume, e acrescente operador um por vez. Uma consulta de seis operadores
retornando zero não ensina nada; três iterações que retornam 10.000, 200 e 4 ensinam **o que
existe**.

**8. CDX API**

Devolve o **índice** de capturas — URL, data, status — não a página. Isso revela **estrutura
histórica**: seções que existiram, parâmetro antigo, página removida.

**9. Status 404**

Porque lista URL que **já foi removida**. Combinada com o nome da URL, conta o que a organização
**quis esconder**.

**10. Arquivar imediatamente**

Porque o conteúdo é volátil. Achado sem cópia arquivada é frágil — a página que você cita hoje pode
não existir amanhã, e sem cópia você não tem prova.

**11. Dado exposto**

Encontrar é observar; **usar** é outra coisa. Você pode identificar que existe exposição e
**reportar ao responsável**; navegar além do necessário para confirmar, e baixar conteúdo, pode
configurar acesso indevido.

**12. Sobreposição**

Porque isoladamente cada dado é fraco — um apelido não diz nada. **Combinado** com e-mail em commit
público e foto com GPS, diz onde você estava e quando. A correlação é o achado.

**13. Dorking**

Porque a mesma técnica serve para achar informação legítima e para achar painel exposto. A
fronteira: encontrar dado exposto não é autorização para usá-lo — e acessar pode ser o crime.

---

## Módulo 4 — Pessoa: identidade e registro

**1. Base legal declarada**

"Eu acho que posso" não é base legal. A forma correta nomeia **por que**, para **quem** e sob
**qual autorização**. Sem isso, não é investigação — é violação de privacidade.

**2. Figura pública vs. particular**

Figura pública: base legal é interesse público/jornalismo; escopo é **a função**; padrão é o que é
relevante ao cargo. Particular: base depende, e frequentemente **não há**; escopo é mínimo
necessário.

**3. Político**

Endereço **não** é de interesse público — a segurança dele não informa a função. Patrimônio
declarado **é** — é obrigação legal e informa sobre conflito de interesse. **A linha é o escopo,
não a pessoa.**

**4. Registro de pessoa**

É raro porque dado de pessoa física **não** é consultável publicamente na maioria dos países — e é
assim **por projeto** (LGPD/GDPR). Onde um site oferece isso, **desconfie da origem**.

**5. EUA**

Não há registro federal de empresa — são **50 sistemas estaduais**. Delaware é o domicílio de
milhões de empresas que não operam lá, por razões societárias e fiscais.

**6. Seis fases**

Base legal → escopo → identificador → corroboração → registro → **parada**. Acrescentar: revisão
por terceiro, quando disponível.

**7. Teste de necessidade**

Isso responde à minha pergunta? É o mínimo? Se vazar, causa dano? Eu teria como justificar? Se
qualquer resposta for ruim, **não colete**.

**8. Mais dado pessoal**

Porque aumenta o impacto sem aumentar a certeza. O profissional busca **contexto** — mesma empresa,
mesmo período, mesma função — e, quando possível, **pergunta à pessoa**.

**9. Perguntar**

Não é falta de técnica; é método. Em due diligence e jornalismo, perguntar é legítimo,
frequentemente mais rápido, e **não gasta privacidade** de ninguém.

**10. Rotina**

Porque dado pessoal identifica, mas **rotina permite ação** — e ação contra pessoa é o dano real.
Saber onde alguém está às 7h de segunda é mais perigoso que o CPF. A defesa é **variar padrão**, não
esconder nome.

**11. Ministro**

Legítimo: patrimônio declarado, atos de ofício, decisões, contratos. Excesso: endereço residencial,
rotina, família sem função pública. A linha é **necessidade ao interesse público**.

**12. Sua exposição**

Porque é o único alvo onde você tem autorização total, e o resultado é **operacional** — você
termina com uma lista do que corrigir, não com um relatório sobre outra pessoa.

**13. Pessoal**

Sem gabarito — depende do seu caso e do seu modelo de ameaça.

---

## Módulo 5 — Telefone global

**1. Normalizar**

Porque a mesma base pode ter o número em qualquer formato — com zero de tronco, com parêntese, sem
código de país. Sem E.164, a busca falha por **formato**, não por ausência.

**2. Cinco formas**

`+55 11 98765-4321`, `011 98765-4321`, `(11) 98765-4321`, `0055 11 987654321`, `5511987654321`.
Todas corretas em algum contexto, todas o mesmo número.

**3. `+1`**

Cobre EUA, Canadá e territórios. Não permite determinar o país.

**4. Portabilidade**

O usuário mantém o número ao trocar de operadora. O campo `carrier` retorna a operadora
**histórica da faixa**, não a atual.

**5. `localidade`**

**Não.** Ela é a região **da faixa** — informação histórica, não localização atual. Móvel pode
estar em qualquer lugar.

**6. Tipo**

Porque a faixa pode ser reaproveitada, e a portabilidade pode invalidar a inferência histórica.

**7. Alemanha**

O comprimento da área **varia** (2 a 5 dígitos), então não se pode assumir quantos dígitos são área
e quantos assinante. O `phonenumbers` resolve, um script manual erra.

**8. Zero de tronco**

Zero que existe no formato nacional e **desaparece** no internacional. Mantê-lo quebra a validação.

**9. VoIP**

Não. VoIP permite número de qualquer país sem presença física. O país do número é **onde o serviço
está registrado**, não onde a pessoa está.

**10. Descartável**

Porque é inconsistência: uma contraparte que se apresenta como "empresa com 20 anos" e usa número
de serviço virtual está dizendo duas coisas incompatíveis.

**11. Implicação**

Que a ferramenta **não é confiável nem sobre você** — logo não é sobre o alvo. Toda classificação
de operadora e localidade é **indício**, e a fonte oficial do país é que decide.

**12. Sugere vs. incompatível**

O celular brasileiro **não é incompatível** com ser empresa alemã — pode ter operação no Brasil. O
que torna suspeito é a **ausência de menção**: a proposta não disse que havia operação brasileira.

**13. Fonte oficial**

Porque a ferramenta tem dado histórico. Se o país **não** tiver consulta pública, o achado é de
**confiança baixa** — e é assim que se escreve.

---

## Módulo 6 — Empresa e due diligence

**1. Mapa**

Tem sufixo de país? → é VAT. Tem formato nacional (CNPJ, HRB)? → o formato diz o país. Só nome? →
OpenCorporates como índice, registro nacional como fonte. Tem LEI? → GLEIF resolve globalmente.

**2. OpenCorporates**

Agrega; **não** é fonte primária. Cite-o como índice e o registro nacional como fonte, porque é
ele que tem valor probatório.

**3. Reino Unido**

Companies House publica **contas anuais, endereço registrado e lista de administradores**
gratuitamente. É o registro mais aberto do mundo.

**4. PSC Register**

*People with Significant Control* — registro público de quem **controla** a empresa. Para grupo com
subsidiária britânica, é o caminho mais rápido ao UBO.

**5. EUA**

Não há registro federal; são 50 estaduais. Delaware é onde milhões de empresas se registram sem
operar lá, por razão societária e fiscal.

**6. Três conceitos**

Acionista: detém participação. Administrador: dirige legalmente — **quase sempre público**.
Beneficiário final: quem **realmente controla** — o objetivo real, e o mais difícil.

**7. CTA**

Criou registro de UBO nos EUA, mas **não público** — acesso a autoridade. Isso significa que, por
fonte aberta, você frequentemente **não terá** o UBO de empresa americana. Declara-se, não se inventa.

**8. Offshore**

Por razões legítimas (privacidade, estrutura societária, otimização) e ilegítimas. O que elas
interpõem são **camadas** entre o beneficiário e a operação — e camada é o problema da
investigação.

**9. Sinais**

Registro recente · endereço de contador · centenas de empresas no mesmo endereço · capital
simbólico · diretor repetido · mudança de nome · dissolução e nova empresa. Cada um é **sinal**, não
condenação: pode ser legal, comum e legítimo — o que muda é a **necessidade de verificação**.

**10. Endereço do contador**

Porque é prática normal de mercado: o escritório de contabilidade serve de domicílio. É sinal porque
indica **baixa substância operacional**, e relevante porque exige verificação adicional.

**11. Falso positivo de sanção**

Consequência grave: bloqueio, dano à contraparte, e dano à sua credibilidade. Evita-se **verificando
o homônimo** — data de nascimento, nacionalidade, outros identificadores.

**12. Seção do não confirmado**

Porque é o que determina a decisão. Em due diligence, "não consegui confirmar o UBO" muda o que o
decisor assina, ou se ele pede mais informação. É informação, não omissão.

**13. Ausência não é prova**

Cobertura parcial das bases · homônimo · atraso de entrada · registros em jurisdição sem consulta
pública · variação de grafia.

---

## Módulo 7 — Domínio, infraestrutura e certificado

**1. `.io`**

Nada sobre jurisdição. É TLD historicamente ligado a território britânico e hoje comercial. A
confusão é comum porque soa "tech".

**2. `.com`**

É o registro global — ICANN/registradores acreditados. Não há registro nacional a consultar; você
consulta o **registrador**.

**3. MX e TXT**

MX revela **onde o e-mail é hospedado** (Google Workspace, Microsoft 365, próprio) — diz muito
sobre maturidade de TI. TXT revela **verificação de serviço** — cada entrada é uma integração
declarada.

**4. Pivô por certificado**

TLS exige certificado; certificado é **público e registrado em log obrigatório** (CT); e o
certificado contém o **SAN** — a lista de nomes cobertos. Logo, um certificado revela **múltiplos
domínios da mesma organização** de uma vez.

**5. Campo `O`**

Busca por **organização declarada** no certificado. Correlaciona domínios de entidades diferentes
do mesmo grupo.

**6. `O` não é prova**

Porque é **autodeclarado** e não verificado por ninguém. Um atacante pode pôr "Microsoft". Mesmo
raciocínio do SNI no curso de anonimato: indício, não prova.

**7. ASN**

Fraco porque **milhares** de organizações compartilham o mesmo ASN de nuvem. Prova apenas que os
hosts estão no **mesmo provedor**, não que têm o mesmo dono.

**8. CDN**

O IP é **borda da CDN**, não servidor de origem. Você **não pode** concluir onde a empresa hospeda.
Toda conclusão sobre localização a partir desse IP é errada.

**9. Força**

Prova o que é **assinado por autoridade** (certificado). WHOIS e `O` são **declaração**. ASN e
padrão de nome são **infraestrutura compartilhada** — fracos por definição.

**10. Certificado compartilhado**

**Não** prova o mesmo dono: uma agência pode gerenciar certificado para vários clientes. Prova
apenas **cobertura pelo mesmo certificado**.

**11. WHOIS mascarado**

Porque privacidade no WHOIS é o **padrão** hoje — exigida por GDPR em muitos casos. Não é indício
de nada; é o normal.

**12. Formulação**

"Os domínios A e B compartilham o mesmo certificado (fingerprint X, emitido em D). Isso é
**consistente com** administração conjunta. **Não prova** o mesmo proprietário: o certificado pode
ter sido emitido por prestador de serviço para clientes distintos. **Confiança: moderada.**"

---

## Módulo 8 — Imagem, vídeo e geolocalização

**1. Seis campos**

`GPSLatitude/Longitude` (coordenada) · `DateTimeOriginal` (data **e hora**) · `Make`/`Model`
(dispositivo) · `SerialNumber` (**identifica o aparelho**) · `Software` (editou, e com o quê) ·
`Artist` (declarado).

**2. Número de série**

Identifica o **dispositivo** — e permite correlacionar duas fotos como do mesmo aparelho sem
nenhum outro indício.

**3. Sem EXIF**

Imagem de câmera: foi **limpo** deliberadamente. Imagem de rede social: **normal** — a plataforma
remove.

**4. Inconsistente**

Porque prova **manipulação**. Ausente apenas indica limpeza; **inconsistente** (modelo de 2020,
data de 2015) indica que alguém editou os campos.

**5. Motores**

Yandex: rostos e lugares. Google: cobertura ampla, objeto. TinEye: **ocorrência mais antiga**.
PimEyes: rosto — e este curso **não usa**, porque busca facial por pessoa identificável é
investigação de pessoa, com exigência de base legal.

**6. Sete camadas**

Contexto → texto visível → estrutura → infraestrutura → geometria solar → referência cruzada →
convergência.

**7. Mais subestimada**

A camada 4 (**infraestrutura**): padrão de placa, hidrante, poste, tomada — é **padrão nacional**, e
reduz o mundo a um país em segundos.

**8. Sombra**

Direção da sombra + direção da câmera → direção do sol. Com a data, você determina a **hora**,
porque o sol só está naquela direção naquele momento. Resposta é **faixa**, não hora exata: a
sombra dá intervalo.

**9. Armadilhas**

Hemisfério sul (direção invertida) · horário de verão (desloca 1h) · latitude alta (geometria
atípica) · sombra artificial (poste à noite) · orientação da câmera desconhecida · distorção de
lente.

**10. Sentinel**

Porque é **gratuita, datada e reprocessável** — você comprova **quando** a imagem foi feita, o que
é essencial para cadeia de custódia. Mapa comercial é datado de forma imprecisa.

**11. Deepfake**

Porque detectores não acompanham a geração, e análise visual não sustenta conclusão em relatório.
Em vez disso, verifique **proveniência**: quem publicou primeiro, por qual canal, e se há fonte
primária.

**12. Telegram**

Enviar **como arquivo** preserva o original, incluindo GPS. Enviar **como foto** comprime e remove.
A diferença é uma opção na interface.

**13. Sua foto**

Porque você tem a **verdade** para verificar o método — você sabe onde foi tirada. Isso mostra onde
o método acerta e onde ele erra, e revela sua própria exposição.

---

## Módulo 9 — Ferramentas e linha de comando

**1. Critério**

Pergunte **que tipo de dado eu tenho?** — o tipo determina a classe de ferramenta. "Existe API, use
a API" evita trabalho porque API tem formato estável, limite declarado e permissão implícita;
*scraping* de HTML quebra quando o site muda.

**2. Cinco regras**

Identifique-se no UA · respeite `robots.txt` · ponha intervalo · ponha limite → trate `429`.

**3. User-Agent**

Porque o administrador precisa saber **quem** está consultando. Sem identificação, você é tráfego
anônimo indistinguível de abuso.

**4. `429`**

*Too Many Requests* — o serviço pedindo para parar. Ignorar é insistir, e insistir é abuso.

**5. Tratamento**

Ler o código, aguardar (respeitando `Retry-After` se houver), tentar de novo com limite de
tentativas, e desistir registrando. Nunca em rajada.

**6. `robots.txt`**

É declaração de vontade do operador. É vinculante por costume e frequentemente por termo — e
violá-lo é o que faz o pesquisador legítimo ser bloqueado junto com o abusivo.

**7. Não automatizar**

Consulta única · fonte sem API · resultado ambíguo · fonte que proíbe · **dado sensível** ·
**pessoa** · fonte pequena. A mais importante é **pessoa**: automatizar escala o risco sem escalar
o benefício.

**8. Coleta excessiva**

Porque automação coleta **tudo que encontra**, não o que é necessário. Viola o **teste de
necessidade** (Módulo 4/10) sem que você perceba.

**9. Pessoa**

Não é limitação técnica — é **decisão**. Nenhuma ferramenta do curso automatiza investigação de
pessoa, porque automação escala o dano potencial.

**10. Dependência de terceiro**

`crt.sh` e a CDX API. Se pararem, você usa o navegador para consulta manual, ou busca fonte
alternativa — e **registra a mudança de método** no relatório (senão a reprodutibilidade quebra).

**11. Scraping vs. API**

Dois aspectos: **técnico** — quebra quando o HTML muda; **legal/contratual** — não tem permissão
implícita como a API tem.

**12. Sem intervalo**

Tecnicamente: sobrecarga do serviço, podendo caracterizar negação de serviço. Legalmente: pode
configurar abuso, e certamente viola o termo — com consequência para você e para quem vier depois.

---

## Módulo 10 — Ética, legalidade e limites

**1. Cinco camadas**

Lei do seu país · lei do país do alvo (extraterritorialidade) · onde o dado está · termo do serviço
· contrato/ética profissional. A mais esquecida é a **quinta**: contrato e código de ética impõem
limites **adicionais** aos da lei.

**2. GDPR extraterritorial**

Aplica-se a organização **fora** da UE que trate dado de pessoa **na** UE, em certas circunstâncias.
Logo, sua investigação no Brasil sobre residente na Alemanha pode estar sujeita ao GDPR.

**3. "É público"**

Porque sob LGPD e GDPR o dado **continua sendo dado pessoal** mesmo publicado. O que muda é a
**base legal** aplicável — e frequentemente ela não existe para o seu caso.

**4. Cinco bases**

Consentimento (específico, revogável) · interesse legítimo (**exige balanceamento**) · obrigação
legal (só o necessário) · exercício de direitos (no escopo do processo) · pesquisa/jornalismo
(com limites).

**5. Interesse legítimo**

Não é passe livre: exige **teste de balanceamento** — o seu interesse prevalece sobre os direitos
da pessoa, considerando **expectativa razoável** e impacto? "Eu tenho interesse em saber" não passa.

**6. Proporcionalidade**

Finalidade específica → necessidade → proporcionalidade → base legal → expectativa razoável →
minimização → retenção. Se a **base legal** não existe, **pare** antes de coletar.

**7. Ministro**

Patrimônio é obrigação legal declarada e informa sobre conflito de interesse — interesse público.
Endereço não informa a função, e a segurança dele não é matéria pública. **A linha é o escopo, não
a pessoa.**

**8. Cinco "não"**

Pessoa sob risco (dano **físico**) · menor · dado sensível · rotina/localização · perseguição. A
mais importante é a primeira, porque o dano é irreversível e frequentemente você a atinge **sem
querer**, no meio de investigação sobre organização.

**9. Poder de parada**

Significa: **pare a coleta e escale** antes de prosseguir. Não é formalidade — o dano a uma fonte,
denunciante ou vítima pode ser físico.

**10. Cenário D**

Comum porque parte de um pedido **vago** que parece legítimo. Problemático porque "verificar **tudo**"
não tem finalidade definida, escopo definido, nem base legal — e frequentemente é retaliação com
roupa de compliance.

**11. Alternativa**

Reformular: o que o cliente **realmente** quer? Ex.: verificar se houve apropriação de propriedade
intelectual é pergunta **diferente** de "tudo sobre ele", e frequentemente tem base legal onde a
segunda não tem. Ofereça a versão com escopo.

**12. Sócio vs. endereço**

Sócio de empresa devedora: identificação para ação de cobrança, no escopo do regular exercício de
direitos. Endereço **residencial** do mesmo sócio: não é necessário à cobrança, e expõe
localização — reprovado no teste de necessidade.

---

## Módulo 11 — Documentação e custódia

**1. Achado vs. prova**

O critério é **reprodutibilidade**: outra pessoa consegue chegar ao mesmo resultado com o que você
registrou?

**2. Cinco elementos**

Fonte · data/hora · método · o que você viu · o que você **não** viu (+ confiança, limitações). O
mais esquecido é o **negativo**.

**3. Hash**

Prova que o arquivo que você apresenta **é** o que você coletou — integridade. **Não** prova que o
conteúdo da página era verdadeiro, nem que a fonte era idônea.

**4. Local + público**

Local é o que você controla. Público é verificável por terceiro **e** sobrevive à remoção da fonte
original.

**5. Quatro etapas**

Coleta → preservação → análise → apresentação.

**6. Quem tocou**

Porque prova que pode ser contestada é prova que registra **a cadeia** — e isso vale tanto em
tribunal quanto em jornalismo.

**7. "Conteúdo mudou?"**

Porque se a página mudou depois, você tem a versão **da data** — e a cópia arquivada prova isso.

**8. Reprodutível**

Ser seguível por terceiro. O teste é entregar a alguém e perguntar: *você consegue repetir só com
o que está escrito?*

**9. As duas seções**

Porque "confiança" diz o **limite da conclusão** e "não encontrado" diz **o que foi procurado e não
achado** — a segunda impede que outra pessoa refaça o trabalho.

**10. Negativo**

"Não encontrei nada" = inútil. "Busquei X em Y, em [data], com [método], e não havia registro" =
**achado**.

**11. "Não coberto"**

Porque distingue "não existe" de "não encontrei **com esta busca**" — e o que ficou fora é
frequentemente onde o dado está.

**12. Relatório**

Porque se ele contém dado pessoal que não era necessário à finalidade, o **relatório** é tratamento
de dado pessoal — com as obrigações correspondentes.

---

## Módulo 12 — Projeto

**1. Antes**

Porque se você coletar primeiro, a avaliação vira justificativa retroativa — e o propósito da
avaliação é **decidir antes**, quando ainda é possível não coletar.

**2. Antes de consultar**

Porque testa se você **sabe derivar** a fonte da estrutura. Preenchendo depois, você apenas
reconstrói o que já descobriu.

**3. Três que enganam**

`.io` (TLD comercial, nada sobre o dono) · `+1` (código compartilhado) · campo `O` do certificado
(autodeclarado). Todos **sugerem** sem determinar.

**4. Independência**

Porque se as duas beberam da mesma origem, você tem **uma** fonte com dois endereços. O teste:
poderiam discordar?

**5. Hash**

Prova integridade do arquivo que você apresenta. **Não** prova veracidade do conteúdo, nem
idoneidade da fonte, nem que você não alterou **antes** de calcular o hash.

**6-10. Pessoais**

Sem gabarito — dependem do sujeito, das jurisdições e do que você encontrou.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Fonte citada | 30% | Toda afirmação factual tem URL e data |
| Método explícito | 25% | O raciocínio está registrado, não só o resultado |
| Confiança declarada | 25% | Cada achado com grau e justificativa |
| Limitações | 20% | O que não foi possível confirmar |

**Penalidades automáticas:**

- Afirmação factual sem fonte: −20%.
- Achado sem confiança declarada: −20%.
- Corroboração que cita a mesma origem: −15%.
- Ausência de seção de limitações: −20%.
- Coleta em serviço de terceiro sem respeitar intervalo/limite: −15%.
- **Pessoa real como alvo de investigação**: **lab zerado**.
- **Uso de base vazada ou dado de origem ilícita**: **lab zerado**.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| Escopo | Vago | Pergunta definida | Pergunta definida + o que **não** está no escopo |
| Base legal | Não declara | Declara a base | Declara, justifica e mostra o balanceamento |
| Identificadores | Consulta primeiro | Deriva a fonte | Preenche a tabela **antes** de consultar |
| Coleta | Sem registro | Fonte e data | Fonte, data, hash e cadeia de custódia |
| Corroboração | Uma fonte | Duas fontes | Duas **independentes**, com a independência justificada |
| Confiança | Não declara | Grau por achado | Grau + **motivo de não ser mais alta** |
| Negativo | Ausente | Lista o buscado | Lista + **"não coberto"** + o que resolveria |
| Jurisdição | Ignora | Menciona | Explica **o que mudou** o método em cada país |

**O item de maior valor em todo o curso:** a seção **"o que não foi possível confirmar"** — com a
nota de **não coberto**. É o que separa investigação de afirmação.

---

*Material didático original, de propósito investigativo e defensivo. Nenhum trecho reproduzido de
obra comercial protegida, e nenhum material que ensine acesso não autorizado, engenharia social,
ou violação de privacidade.*
