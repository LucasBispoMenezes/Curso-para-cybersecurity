# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos doze módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — Modelagem de ameaça para privacidade

**1. Por que "proteção excessiva" é erro**

Porque proteção que você não consegue **manter** é abandonada — e abandonada não protege nada.
Proteção parcial mantida cobre o que cobre. O objetivo é **anonimato suficiente para um adversário
específico**, defensável e sustentável.

**2. Sigilo vs. anonimato**

Sigilo protege **o que** você disse (cifra). Anonimato protege **quem** disse (roteamento).
Combinações: os dois (Signal + Tor); só anonimato (Tor até HTTP puro — o site não sabe quem, mas
todos no caminho leem o quê); só sigilo (**o caso mais comum**: HTTPS — o site não lê o conteúdo,
mas sabe exatamente quem você é); nenhum (rede aberta).

**3. Tor até HTTP puro**

O circuito esconde a origem de todos — inclusive do destino. Mas o **relay de saída** e o caminho
após a saída veem o conteúdo em claro. Anônimo, não sigiloso.

**4. A3 vs. A5**

A3 (provedor) vê **sua conta e seu uso**. A5 (vigilância de rede em escala) vê o **padrão** do
tráfego. Contra A3, Tor vence (não há provedor único). Contra A5, Tor **empata**: esconde o
conteúdo, não o timing.

**5. Contra A5 o que vaza**

O **padrão temporal** e o **volume** — não o conteúdo. A defesa não é mais cifra; é
**indistinguibilidade** (Módulo 9).

**6. "O que não preciso proteger"**

Reduz o escopo e o esforço. Se você publica dado público, seu adversário não precisa de metadata
de origem. Se você tem uma fonte, o **ato da comunicação** é o segredo — não só o conteúdo.

**7. Cinco erros**

Adversário vago → nomeie A1–A6 · confundir sigilo com anonimato → separe as propriedades ·
proteção excessiva → calibre · ignorar alcance físico → software não resolve · **não medir** → medir.

**8. CIA em privacidade**

Confidencialidade = sigilo de conteúdo · Integridade = autenticidade da identidade ·
**Disponibilidade = acesso ao serviço**. A terceira é a mais relevante sob censura.

**9. Pluggable transport**

Resolve **disponibilidade** (você alcança a rede Tor). Não resolve anonimato — a ponte **é** o
primeiro salto e vê seu IP. Confundir leva a pessoa a confiar **mais** exatamente quando adicionou
complexidade.

**10. Alcance físico**

Se o adversário tem o dispositivo, a vigilância está **do lado de dentro** do circuito. Nenhum
protocolo de rede sobrevive a cliente comprometido.

**11. "Como você sabe"**

Porque a introspecção não mede. Você **acha** que está protegido; medir é o que **mostra**. A
coluna honesta é "não sei" — e é o que o curso resolve.

---

## Módulo 2 — Como a identidade vaza

**1. As seis camadas**

① Rede (IP, ASN, rádio) ② Transporte/nome (DNS) ③ Aplicação (SNI, cabeçalho) ④ Sessão/conta
⑤ Aplicação/fingerprint ⑥ Comportamento.

**2. "70% de anonimato" não existe**

Não há soma parcial. Você tem **um elo intacto e cinco possibilidades de quebra**. A formulação
correta é sobre **contra qual adversário** e **com qual conjunto de camadas cobertas**.

**3. DNS**

A consulta revela **qual nome** você quer — **antes** de qualquer conexão. Nenhuma configuração
posterior corrige: o dano ocorreu na resolução.

**4. `remote_dns`**

Em SOCKS4 (e em SOCKS5 com `ATYP=01`), o **cliente** resolve o nome localmente para obter o IP.
O resolvedor local viu o nome **antes** de o proxy receber o pedido.

**5. "VPN resolve DNS"**

Falso. Se o DNS vai pelo resolvedor local, o provedor vê tudo. A VPN só resolve se **redirecionar**
o DNS pelo túnel — e muitas não fazem.

**6. DoH**

Cifra **entre você e o resolvedor**. O provedor local deixa de ver; **o operador do resolvedor
passa a ver tudo**. Você **transferiu** a confiança, não eliminou.

**7. Geolocalização**

É estimativa por bloco de IP. Acerta a região, erra a cidade, e erra completamente com VPN e
CGNAT. Não é prova, nem a favor nem contra.

**8. Tipo de conexão**

Datacenter = VPN/proxy/bot — e é a razão pela qual Tor é bloqueado por padrão em muitos sites.
Residencial mudando de país em minutos é incoerente.

**9. SNI**

Vai em claro no ClientHello, porque o servidor precisa lê-lo **antes** de haver chave. Com Tor é
irrelevante: o circuito cifra tudo até a saída, e a saída vê o tráfego **já decifrado**.

**10. User-Agent**

É cifrado no caminho, mas **enviado ao servidor** — e frequentemente único. Identifica você **no
destino**, não no fio.

**11. `WebRTC` crítico**

Faz descoberta de IP para conexão P2P e usa o **candidato ICE**, que inclui o endereço da interface
**local** — o IP real, não o do circuito. Fala pelo caminho nativo, **fora** do túnel. Anula o
circuito.

**12. Comportamento não corrigível**

Horário, estilo de escrita, metadado de arquivo. Não há software que impeça você de escrever às 3h
com a sua pontuação.

**13. MAC e Wi-Fi**

Sobrevivem a trocar de rede. A lista de redes conhecidas é o **mapa dos lugares que você
frequentou** — informação sensível em contexto de risco físico.

---

## Módulo 3 — Proxies

**1. Transfere confiança**

O proxy deixa de ser observado e passa a ser **a única entidade que vê tudo**: sua origem, seu
destino, e o conteúdo se não houver TLS.

**2. Proxy ≠ anonimato**

Confiança **total e única** em um ponto. O Tor distribui em três saltos que não se coordenam —
nenhum conhece origem **e** destino.

**3. HTTP e HTTPS**

Para HTTPS usa `CONNECT`: túnel TCP cego. Vê o **nome** (do `CONNECT`) e o **tamanho**; não vê o
conteúdo.

**4. SOCKS4 obsoleto**

Só IPv4, e **só conecta a IP** → o cliente resolve localmente → **vaza DNS**. Também não tem
negociação de método de autenticação.

**5. `ATYP=03`**

Envia o **domínio** em vez do IP, fazendo o proxy resolver. É a diferença essencial: o nome nunca
sai localmente.

**6. Fluxo do vazamento**

Cliente precisa do IP → pergunta ao resolvedor **local** → o nome vazou → só então fala com o
proxy. O vazamento é **anterior** ao proxy e **irreversível**.

**7. `--socks5` vs `--socks5-hostname`**

`--socks5` resolve localmente e vaza. `--socks5-hostname` manda o nome e não vaza. É literalmente
o vazamento em uma flag.

**8. `proxychains4`**

Dependendo da configuração, resolve o nome localmente antes de encaminhar — vazando. Exige
configuração explícita de proxy DNS.

**9. Tor usa SOCKS5**

Porque SOCKS5 suporta `ATYP=03` (domínio) → o **relay de saída** resolve, e nada vaza localmente.
SOCKS4 obrigaria resolução local.

**10. UA e Accept-Language**

Não mudaram porque o proxy só substitui o **IP**. Cabeçalho é gerado pelo **navegador**, e o
proxy não toca nele.

**11. Proxy honesto**

Honestidade é **afirmação**, não propriedade técnica. Você não tem como verificar que ele não
registra. Só auditoria de terceiro, e ainda assim com confiança.

**12. O que falta**

Fingerprint padronizado (Tor Browser), resistência a correlação (saltos múltiplos) e ausência de
ponto único de confiança (distribuição).

---

## Módulo 4 — VPN

**1. Quatro passos**

Interface ganha IP do túnel → kernel roteia por ali → tráfego cifrado e encapsulado ao servidor →
servidor desencapsula e faz a requisição com **o IP dele**.

**2. Complete a frase**

VPN **transfere confiança**; não **elimina observação**. Você escolhe **qual entidade** sabe —
muda o observador, não a existência de um.

**3. Seis confianças**

Não registra · não correlaciona · não entrega a terceiro · não foi comprometido · usa criptografia
de verdade · não é fachada. **Nenhuma é verificável tecnicamente.**

**4. Jurisdição**

Determina a que ordem legal o provedor responde — e portanto quais dados ele é obrigado a
fornecer ou a retomar.

**5. VPN vs. Tor**

VPN: **1** entidade vê origem + destino. Tor: **0** isoladamente — a informação está particionada
entre guarda (origem), meio (nada) e saída (destino).

**6. "Estudável" vs. "confiável"**

Tor é protocolo aberto: você **lê** o que ele faz. VPN é serviço: você **confia** no que ele diz.
Isso torna VPN decisão de **confiança**, não de engenharia.

**7. Mito "256 bits"**

Padrão da indústria; não diferencia. O que importa é **não-registro verificável**, **jurisdição**
e **vazamento de DNS/IPv6** — e isso a cifra não toca.

**8. Valor real da VPN**

Ocultar IP do destino (principal) · proteger contra observação local do SNI · contornar bloqueio
geográfico · esconder o conteúdo da rede local (que TLS já fazia).

**9. Ordem**

`VPN → Tor`: a VPN é só transporte, o circuito cuida da privacidade — faz sentido para esconder
do ISP. `Tor → VPN`: a VPN passa a ver todo o tráfego **já decifrado**, e você confia nela para
**tudo** — não é a ordem recomendada.

**10. Quantas camadas**

Só a ① (IP). ②, ③ (contra a VPN), ④, ⑤ e ⑥ ficam **exatamente iguais**.

**11. User-Agent com VPN**

Não muda: é gerado pelo navegador e cifrado pelo TLS. O **servidor** o vê — e é a camada ⑤, contra
a qual a VPN não faz nada.

**12. IPv6**

Muitas VPNs só cobrem IPv4. O IPv6 segue pelo caminho nativo e entrega o IP real a qualquer site
com registro `AAAA`. É **silencioso** — você acha que está no túnel.

**13. Resultado do teste**

Se `dnsleaktest` mostra o provedor local, a VPN não está roteando DNS — e você tem vazamento real,
apesar do túnel.

---

## Módulo 5 — Tor I: diretório e circuito

**1. Onion routing**

Cifra em **camadas**, uma por salto: cada relay abre só a sua camada e conhece apenas o salto
anterior e o próximo. "Cadeia simples" daria a cada proxy o conhecimento do fim.

**2. Três informações**

Origem (só a guarda) · destino (só a saída) · associação origem↔destino (**ninguém**, em condições
normais).

**3. Consenso**

Lista assinada de todos os relays, publicada pelas **autoridades de diretório**. O cliente
**verifica a assinatura** antes de usar — o consenso é o único ponto de confiança do sistema, e é
verificável.

**4. Sete flags**

`Guard` (1º salto) · `Exit` (saída) · `Fast` · `Stable` · `Running` (obrigatória) · `Valid`
(obrigatória) · `BadExit` (excluído da saída).

**5. `BadExit`**

Reputação comunitária: relay de saída que manipula tráfego é marcado e excluído. Defesa
voluntária, não perfeita, mas funcional.

**6. Guarda estável**

Se a guarda mudasse a cada sessão, um atacante que observa sua rede teria de **vigiar todos os
relays**. Estabilidade significa que ele precisa vigiar **um** — e que você conhece a relação.

**7. Guarda e saída**

Guarda: sabe seu IP, não o destino. Saída: sabe o destino, não seu IP.

**8. O que precisaria controlar**

**Ambos** — ou observar os dois pontos. É o **ataque de correlação** (Módulo 9), e é por isso que
comprometer **um** relay não desanonimiza.

**9. Cinco passos**

Lê o consenso → `CREATE` à guarda → `EXTEND` ao meio (cifrado **para** a guarda) → `EXTEND` à
saída → circuito pronto.

**10. Extensão cifrada**

A guarda **não consegue ler** para onde você está estendendo — só encaminha o pedido cifrado. É o
que torna o modelo funcionar.

**11. Vários circuitos**

Porque circuitos têm uso limitado, e reutilizar o mesmo circuito revela a associação entre os
destinos.

**12. Circuit isolation**

Circuito separado por contexto (first-party no Tor Browser). Impede que um relay de saída
correlacione **dois sites seus** como sendo do mesmo usuário.

**13. Porta 443**

Significa **pluggable transport** ou **ponte** — o tráfego Tor foi ofuscado para não ser
reconhecido (Módulo 10).

---

## Módulo 6 — Tor II: célula, stream, rendes-vous

**1. Célula fixa**

`CircID` (4) + `Command` (1) + `Payload` (509) = **514 bytes**. Fixo para que a **análise de
tamanho** não revele o que vai dentro — defesa contra inferência por tamanho.

**2. Grupos de comando**

Controle (`CREATE`, `EXTEND`, `DESTROY`) · Relay (`RELAY`, `RELAY_EARLY`) · Fluxo (`BEGIN`,
`DATA`, `END`, `CONNECTED`) · Controle de fluxo (`SENDME`).

**3. Digest e integridade**

Calculados com a chave do salto. Um relay no meio **não consegue modificar** sem ser detectado —
ele pode **observar** e **descartar**, não alterar.

**4. Multiplexação**

Vários streams no mesmo circuito, inclusive para **destinos diferentes**. Risco: a **saída
correlaciona os destinos** como do mesmo usuário.

**5. "Um circuito, um destino"**

Porque streams de destinos diferentes no mesmo circuito entregam a associação ao relay de saída.

**6. Quatro fases**

Serviço publica descriptor e escolhe pontos de introdução → cliente monta circuito ao rendezvous
point e envia convite por um IP → serviço conecta ao rendezvous point → os dois circuitos se
ligam.

**7. Nenhum revela localização**

O cliente não sabe onde o serviço está (só o `.onion`); o serviço não sabe quem é o cliente (só que
chegou pelo rendezvous).

**8. Tabela das partes**

IP: sabe que o serviço está ativo, **não** onde ele está · Rendezvous: sabe que dois circuitos se
ligaram, **não** quem são · Cliente: sabe o `.onion`, **não** o IP do serviço · Serviço: sabe que
alguém conectou, **não** o IP do cliente.

**9. Endereço = chave**

O `.onion` é a chave pública Ed25519. Não há registro nem CA — a **criptografia substitui a
autoridade**. Só quem tem a chave privada pode responder por aquele nome.

**10. Sem CA**

Não existe autoridade emissora porque não há a quem emitir: o endereço é **derivado** da chave.
Verificação é **local**.

**11. Chave vazada**

Quem tem a chave **controla o endereço**. Não há rotação — a única saída é criar serviço novo,
endereço novo, e perder a reputação do antigo.

**12. Protege o cliente**

O rendes-vous esconde as **duas** pontas: o serviço não sabe quem conectou. É por isso que `.onion`
serve a quem **precisa** de anonimato, não só a quem quer oferecer algo.

---

## Módulo 7 — Anatomia do vazamento

**1. Oito canais**

① Aplicação fora do circuito · ② Conta/sessão · ③ IPv6 · ④ DNS · ⑤ `WebRTC` · ⑥ Fingerprint ·
⑦ Extensão · ⑧ Comportamento. Ordem de severidade: ⑤ e ② primeiro.

**2. `WebRTC` anula**

Descobre IP para P2P usando o candidato ICE, que inclui o **endereço da interface local**. Fala
pelo caminho **nativo**, fora do túnel. O circuito deixa de importar.

**3. Conta/sessão sem solução técnica**

Se você faz login, o serviço sabe quem você é — o Tor protegeu o caminho e **você** entregou a
identidade. Só **compartimentação** resolve: conta anônima nunca toca a pessoal.

**4. Telefone**

Liga a identidade anônima ao número real. Não há contorno técnico **legítimo**. A escolha é não
usar o serviço para o que exige anonimato.

**5. `DNSPort`**

O Tor escuta DNS localmente e resolve **por dentro do circuito**. Nada sai em claro — é a solução
completa, não parcial.

**6. IPv6**

Se a interface tem IPv6 global e o túnel só cobre IPv4, o IPv6 escapa pelo caminho nativo. Testa-se
com serviço de diagnóstico que mostra IPv6 (`browserleaks.com/ip`, `ipleak.net`).

**7. Programas vazam**

Porque o proxy é **por aplicação**, não por sistema. Solução completa: roteamento de sistema, ou
melhor, **VM dedicada / Whonix / Tails** — isolamento por arquitetura.

**8. Resolução arredondada**

Evita que uma tela incomum vire identificador. Todos os usuários do Tor Browser relatam valores
**padronizados** — é por isso que maximizar é desencorajado.

**9. Metadado**

Autor, software, versão, tempo de edição, revisões. Publicar sem limpar entrega a **fonte** e
frequentemente o **dispositivo**.

**10. ⑥⑦⑧ são de arquitetura**

⑥ vem do hardware e do sistema; ⑦ de cada add-on, que é superfície nova; ⑧ é a pessoa. Nenhum é
configuração de rede.

**11. `curl`+Tor vs. Tor Browser**

`curl`+Tor esconde o IP e **não** toca o fingerprint. Tor Browser padroniza o fingerprint para
**todos** os usuários. Confundir os dois faz a pessoa achar que está protegida quando só o
protocolo está estudado.

**12. Testar pode vazar**

O teste é uma **visita** a serviço de terceiro, registrada. Testar vazamento em contexto que você
não quer associar a você é, ele mesmo, um vazamento.

---

## Módulo 8 — Fingerprinting

**1. Cookie vs. fingerprint**

Cookie é **dado a você** (apagável, bloqueável). Fingerprint é **emitido por você** (tela, GPU,
fontes) — não apagável, compartilhado entre sites, funciona em modo privado. Por isso
**atravessa** o Tor.

**2. Passivo vs. ativo**

Passivo: o browser apresenta sozinho (UA, idiomas, tela, timezone). Ativo: o site pede ação
(canvas, WebGL, áudio, medição de tempo).

**3. Canvas**

Renderiza texto e formas num `<canvas>` invisível, lê os pixels e faz hash. O resultado depende de
GPU, driver, anti-aliasing e fontes — é **determinístico por máquina**, e por isso identifica.

**4. Entropia**

Medida de quantos outros se parecem com você. 18 bits ≈ **1 em ~262.000**.

**5. Típico**

17–20 bits em navegador comum — quase único. Um fingerprint vale como **identificador sem
cookie**.

**6. Arredondar e UTC**

Resolução arredondada evita tela rara como identificador. UTC elimina o **contraditor de
circuito**: timezone local com circuito estrangeiro é inconsistência, e sinal de Tor.

**7. Circuit isolation**

Circuito por contexto first-party. Impede que um relay de saída correlacione dois sites seus.

**8. Randomizar piora**

Faz você **diferente dos outros**. Fingeprint bem mitigado é **igual aos outros**, não único. Um
navegador que devolve valor aleatório é **mais** único que um que devolve valor padronizado.

**9. "Igual aos outros"**

Porque entropia é sobre **parecer-se com muitos**. Ser único é ser identificável — mesmo que por
valor "aleatório".

**10. Comum vs. universal**

"Comum" = igual a quem ativou `resistFingerprinting` (subconjunto). "Universal" = igual a **todos**
(Tor Browser). A diferença de tamanho do conjunto **é** a diferença de proteção.

**11. Cinco decisões**

UA padronizado · resolução arredondada · UTC · canvas com ruído · WebRTC desabilitado ·
circuit isolation.

**12. Não escolher proteção máxima**

É defensável quando o modelo de ameaça não a exige (A2, por exemplo). O que determina é **o
adversário**, não a vontade de ser cuidadoso.

---

## Módulo 9 — Resistência a correlação

**1. Não é quebra de cifra**

Porque os ataques realistas — correlação, cliente comprometido, comportamento — **contornam** a
criptografia em vez de quebrá-la.

**2. Três ataques realistas**

Correlação de fluxo (observa os dois pontos) · cliente comprometido (malware ou física) · análise
de comportamento (não depende de criptografia).

**3. Correlação de fluxo**

O adversário **vê** o volume e o padrão temporal nos dois pontos e **compara**. Não quebra nada,
não modifica nada — só observa.

**4. Célula fixa e volume**

Células fixas escondem o **conteúdo** da célula, não a **contagem**. O volume total é preservado
ponta a ponta.

**5. Dificuldade real**

**Selecionar** o alvo entre milhares de circuitos. Isso implica: o adversário precisa **suspeitar**
antes de correlacionar — e portanto **não parecer suspeito** vale mais que cifra.

**6. Confirmação em quatro passos**

Identifica período de silêncio → injeta tráfego ou bloqueia → observa reação no outro ponto →
confirma o vínculo. Mais eficiente contra tráfego **baixo** porque não exige observar sempre.

**7. Confirmação é ativa**

Deixa rastro: latência anômala, perda, comportamento estranho. Um circuito inexplicavelmente lento
pode ser **confirmação em curso** — registrar e **mudar de circuito**.

**8. Modelo de segurança**

"O Tor foi projetado contra adversário que vê a rede **em parte**. Contra quem vê a rede inteira,
ele **reduz o custo** do ataque — não o elimina."

**9. Dispositivo comprometido**

A vigilância fica **do lado de dentro** do circuito. Não é falha do protocolo — é limite
estrutural: nenhum protocolo de rede sobrevive a cliente comprometido.

**10. Tor vs. mixnet**

Tor: milissegundos, baixa latência, ordem preservada, resistência **parcial**. Mixnet: minutos a
horas, **embaralha entre fluxos**, ordem destruída, resistência **forte**.

**11. Mixnet não substitui**

Ninguém navega com 5 minutos por requisição. Ela serve a comunicação **assíncrona**.

**12. Baixa latência + A5**

**Não há solução conhecida.** É limitação fundamental, não de software. A resposta honesta é
**perda de privacidade** em tempo real sob A5.

**13. Tor o tempo todo**

Porque você não se destaca. O único usuário de Tor da rede é óbvio; o padrão constante não é.
Aquilo te faz **menos** visível.

**14. Anonymity set**

Conjunto de quem você se parece. Horário, volume, dispositivo, extensão e estilo **reduzem** o
conjunto — mesma conclusão do Módulo 8, aplicada a tráfego.

**15. Comportamento é a defesa**

Porque é o que a cifra **não** cobre — e o adversário que precisa **selecionar** o alvo usa
justamente isso.

---

## Módulo 10 — Ambiente corporativo, bridges e bloqueio

**1. Três tipos**

Bloqueio total (origem inalcançável) · filtragem por lista (IP/domínio) · bloqueio por protocolo
(DPI reconhece o comportamento).

**2. IP frágil**

Relay novo entra no consenso e não está na lista · relay muda de IP · **ponte não está no
consenso** · transporte ofuscado não parece Tor.

**3. Ponte**

Relay **não listado** no consenso. O bloqueio por lista não sabe que ela existe.

**4. Todo sinal tem falso positivo**

Destino datacenter = nuvem legítima · volume/tempo = qualquer tráfego contínuo · porta 9001 =
muitos relays usam 443 · IP = pontes mudam. **Só o handshake sem ofuscação é conclusivo.**

**5. Sinal mais decisivo**

O **tamanho de célula** e o padrão do handshake. E a decisão de tamanho fixo, que **protege** a
privacidade, é também **identificador** — todo trade-off tem os dois lados.

**6. Três transportes**

`obfs4` transforma em tráfego sem assinatura reconhecível · `meek` encaminha por CDN grande, com
domínio reputado · `snowflake` usa navegador voluntário, com conjunto efêmero e enorme.

**7. Complete a frase**

"Pluggable transport resolve **disponibilidade**, e não resolve **anonimato**." A ponte **é** o
primeiro salto e vê seu IP.

**8. Acesso vs. anonimato**

Resolve **acesso** (você alcança a rede Tor). Não aumenta anonimato: a ponte vê seu IP, e você
**adicionou** um terceiro no caminho.

**9. Quem vê seu IP**

A ponte. É **diferente** da lista pública de relays: você trocou um conjunto grande e não
correlacionado por **um** ponto que vê você diretamente.

**10. Contra A5**

Depende do que o adversário observa. A ponte **adiciona superfície** — é troca, não ganho puro. Por
isso a modelagem de ameaça precede a escolha.

**11. Engrenagem de censura**

A DPI que reconhece Tor é a mesma que reconhece qualquer coisa. Reconhecer isso não impede a
decisão, mas a torna **consciente**.

**12. Usuário legítimo**

Jornalista protegendo fonte · pesquisador acessando dado sensível · vítima de perseguição ·
advogado em caso sensível. Bloquear cega o acesso **legítimo** e não impede quem realmente quer
passar — porque a ponte existe para isso.

**13. Política vs. impedimento**

Política funciona melhor: preserva o caso legítimo, deixa rastro de decisão, e não cria capacidade
de censura sem controle. Impedimento técnico cego quebra uso legítimo e é contornável.

---

## Módulo 11 — Ferramenta para cada adversário

**1. A2**

O rastreador **não está no caminho** — está **no site**. Você o enfrenta com fingerprint (Módulo 8),
não com roteamento.

**2. A3**

VPN **é** o novo provedor. Usar VPN contra o provedor é trocar de observador, não eliminar.

**3. `Tor → VPN` vs. `VPN → Tor`**

Nos dois, o ISP vê só tráfego VPN e a VPN vê que você usa Tor. A diferença está em **quem vê o
destino**: em `Tor → VPN`, a VPN recebe o tráfego **já entregue pelo circuito**; em `VPN → Tor`, a
VPN é apenas transporte e o circuito cuida da privacidade.

**4. Recomendação**

**`VPN → Tor`**, quando o objetivo é esconder **do ISP** que você usa Tor. A VPN é só o transporte.

**5. `Tor → VPN` não recomendada**

Porque a VPN passa a ver todo o tráfego **já decifrado** pelo circuito, e você confia nela para
**tudo** — mais um ponto único de confiança, na posição errada.

**6. Falsa segurança**

Tor + extensão anti-fingerprint (te distingue dos outros usuários de Tor) · Tor + `WebRTC` (anula o
circuito) · Tor + login pessoal (o site te identifica; o circuito foi decorativo).

**7. Extensão anti-fingerprint**

Porque a defesa do Tor Browser é **ser igual a todos**. Uma extensão que altera valores te faz
**diferente dos outros usuários de Tor** — e piora.

**8. Regra do elo mais fraco**

Pergunta: "qual camada esta ferramenta protege, e essa camada **é** a minha mais fraca?" Se não
for, você complicou sem reforçar.

**9. Aplicação vs. sistema**

Por aplicação cobre **só** o que foi configurado — um programa esquecido (atualizador, NTP,
extensão) vaza. Por sistema cobre tudo, com configuração complexa que quebra a rede.

**10. Por que o curso não faz**

Roteamento forçado **quebra** a rede, é difícil de reverter, e pode piorar o anonimato
(aplicações que esperam IP real passam a se comportar de forma inconsistente). A resposta correta é
**isolar por arquitetura**: Whonix, Tails, Qubes, VM dedicada.

**11. Tails**

Resolve **não deixar rastro no dispositivo** (sistema amnésico). Não resolve comportamento, e não
resolve alcance físico de forma completa.

**12. Sem solução**

Adversário com o dispositivo · tempo real sob A5 · serviço que exige número de telefone · estilo de
escrita · chave privada mal guardada.

**13. Ordem de frequência**

1 conta cruzada · 2 chave/senha mal guardada · 3 dispositivo comprometido · 4 fingerprint ·
5 DNS/`WebRTC` · 6 correlação · 7 quebra de criptografia. A **7** é a que a mídia discute, e é a que
**quase nunca** causa dano.

---

## Módulo 12 — Projeto

**1. Mesma metodologia**

Porque instrumento diferente produz diferença que é **do instrumento**, não da correção. Você
mediria o ruído da ferramenta e chamaria de resultado.

**2. Fase 4**

Sem ela você tem duas medições soltas. Com ela, você tem **evidência de que a correção funcionou** —
ou de que **não** funcionou, o que é mais valioso ainda.

**3. "Antes" não medido**

Reconstruir de memória é aceitável **se declarado**. O que não vale é apresentar **estimativa como
medição** — o erro que o curso combateu desde o Módulo 1.

**4. Item 14**

Não existe teste público para entropia de circuito — exige que você **olhe o seu próprio tráfego**.
É o item que separa quem leu sobre anonimato de quem **mediu**.

**5. `WebRTC`**

Porque, se positivo, **todo o resto é secundário** até resolver. O circuito está anulado.

**6. Ordem de severidade**

Corrigir fora de ordem gasta esforço no lugar errado — você ajusta extensão enquanto o `WebRTC`
entrega o IP real.

**7. Duas correções sem ferramenta**

Compartimentação de conta e disciplina de uso. Nenhum software faz. A maioria ignora porque
**comprar ferramenta** é mais fácil que **mudar hábito**.

**8. Seção "não melhorou"**

Porque um projeto que só mostra melhora está medindo a si mesmo **com simpatia**. A lista do que
continuou exposto é o **instrumento de trabalho real**.

**9. "Estou anônimo"**

Porque anonimato é **grau contra adversário específico**. A forma correta: *"estou mais protegido
contra A3 e A4; continuo exposto a A5 por correlação e a A6 porque o dispositivo não está limpo"*.

**10. Medir antes**

Porque depois de corrigir, o "antes" **não existe mais**. Corrigir sem medir destrói o dado.

**11–12. Pessoal**

Sem gabarito — depende do seu caso, do seu adversário e dos seus números.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Medição própria | 35% | O resultado vem de captura/teste **seu**, não de afirmação |
| Interpretação | 25% | Lê o resultado corretamente, inclusive o negativo |
| Limitações | 25% | Declara o que não conseguiu medir e por quê |
| Metodologia | 15% | Comandos reproduzíveis, ambiente declarado |

**Penalidades automáticas:**

- Afirmar proteção sem medição que a sustente: −25%.
- Declarar adversário coberto por ferramenta que o material diz que **não** cobre: −20%.
- Estimativa apresentada como medição: −15%.
- Entropia sem conversão para "1 em quantos": −10%.
- **Qualquer medição de tráfego de terceiro, ou identificação de outro usuário**: **lab zerado**.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| Modelo | Adversário vago | A1–A6 nomeado | Nomeado, com o ganho dele e alcance físico |
| Metodologia | Ad hoc | Comandos listados | Idêntica antes e depois, com ambiente declarado |
| Medição | Impressão | Um teste por camada | Todos os 14 itens, com evidência |
| Fingerprint | Sem entropia | Bits medidos | Bits convertidos em "1 em quantos", e comparados |
| Diferença | Só o que melhorou | Tabela antes/depois | **Inclui o que não melhorou**, com motivo |
| Residual | Ausente | Lista o óbvio | Nomeia o que continua exposto e **qual adversário** |
| Conclusão | "Estou anônimo" | "Estou mais protegido" | "Contra A_x sim, contra A_y não, por [razão]" |

**O item de maior valor em todo o curso:** a seção **"o que não melhorou"** do `06-diferenca.md`.
É o que separa alguém que **mediu** de alguém que **esperou melhorar**.

---

*Material didático original, de propósito defensivo e de proteção de privacidade. Nenhum trecho
reproduzido de obra comercial protegida, e nenhum material que ensine desanonimização de terceiro
ou evasão de investigação legítima.*
