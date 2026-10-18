# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos dez módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — Fundamentos e o modelo de camadas

**1. Os cinco problemas e suas camadas**

Representar o dado (aplicação) · levar de forma confiável (transporte/TCP) · chegar em outra
rede (rede/IP) · chegar em outra máquina na mesma rede (enlace/Ethernet) · transformar em sinal
(física).

**2. Camada 7 vs. camada 3**

Camada 3: o pacote não chegou ou não voltou — diagnóstico é rota, firewall, link. Camada 7: o
pacote chegou, o TCP funcionou, e a resposta está errada — diagnóstico é aplicação, lógica,
dados. Exemplos: "não chega SYN-ACK" (L3) vs. "retorna 500" (L7).

**3. `10.10.10.200/26`**

```
32 - 26 = 6 bits de host → bloco de 64
200 / 64 = 3,125 → bloco 3 → começa em 192
Rede: 10.10.10.192 · Primeiro: 10.10.10.193 · Último: 10.10.10.254 · Broadcast: 10.10.10.255
```

**4. Por que 2 a menos**

Primeiro endereço é a rede, último é broadcast — reservados. **Exceção:** `/31` (RFC 3021) usa
os dois para links ponto a ponto; e `/32` é um host único.

**5. Encapsulamento em uma frase**

Cada camada embrulha o dado da camada de cima com seu próprio header, e a recepção desembrulha
na ordem inversa. Um roteador não precisa entender HTTP porque só lê o header IP — **confia que
o conteúdo é problema das camadas de cima.**

**6. Offsets**

Header IP começa no offset **14** (depois dos 14 bytes de Ethernet). Header TCP começa no offset
**34** (14 + 20). Fixos **porque os headers têm tamanho padrão** — Ethernet sempre 14 sem tag
VLAN; IPv4 sempre 20 sem opções (IHL=5); TCP sempre 20 sem opções (Data Offset=5). **IHL > 5 ou
Data Offset > 5 muda tudo.**

**7. `169.254.169.254`**

Endereço de metadados em AWS/GCP/Azure. Aparece em incidente porque um atacante que consegue
forçar requisição do servidor para esse IP obtém credenciais de instância (SSRF).

**8. Os oito passos**

(1) `connect()` → (2) consulta tabela de rotas → (3) monta segmento TCP → (4) embrulha em IP →
(5) **ARP para descobrir o MAC** → (6) embrulha em Ethernet → (7) placa transmite → (8) switch
encaminha. ARP entra no passo 5 porque o header de enlace precisa de MAC, não de IP.

**9. `default via 10.10.10.1 dev eth0`**

Rota `/0` — casa tudo que nenhuma outra rota casou. Sem ela, só a rede local é alcançável:
qualquer destino externo retorna "network unreachable".

**10. Encapsulamento e exfiltração**

Como cada camada apenas embrulha a de cima, um dado que atravessa a rede pode ser **qualquer
coisa dentro de um protocolo permitido**. Um canal DNS, um ICMP tunelado, um HTTP que na verdade
carrega outro protocolo — todos passam porque o firewall vê a camada de baixo.

---

## Módulo 2 — Ethernet, ARP e a rede local

**1. Quadro Ethernet**

MAC dst (6) + MAC src (6) + EtherType (2) + payload (46–1500) + FCS (4). O FCS **não aparece no
tcpdump** porque a placa de rede **valida e remove o FCS antes de entregar ao kernel** — se o CRC
não bate, o quadro é descartado e você nunca o vê.

**2. MTU 1472**

1472 (payload ICMP) + 8 (header ICMP) + 20 (header IP) = 1500 = MTU do Ethernet padrão. O
payload máximo de `ping` em Ethernet é 1472 porque o ICMP e o IP consomem 28 bytes dos 1500.

**3. MAC desconhecido**

O switch faz **flood**: encaminha o quadro para todas as portas **exceto a de origem**. Ao mesmo
tempo, aprende o MAC de origem e sua porta.

**4. Domínio de broadcast**

Conjunto de máquinas que recebem um broadcast. Desempenho: todo ARP request incomoda todas as
máquinas. Segurança: é o limite dentro do qual um atacante consegue alcançar os outros em
camada 2.

**5. ARP em quatro passos**

Request em broadcast (`ff:ff:ff:ff:ff:ff`) → todas recebem, só a dona responde → reply em
unicast → solicitante guarda no cache. **O MAC de destino no request é broadcast** porque o
solicitante não sabe o MAC — é justamente isso que ele quer descobrir.

**6. "LAN é domínio de confiança"**

Perigosa porque ARP não autentica nada. Consequências: (a) qualquer máquina pode se passar por
qualquer IP; (b) um host comprometido alcança todos os outros em L2; (c) segmentação de rede é a
única defesa estrutural, o que significa que rede "plana" é rede sem defesa.

**7. DAI**

Dynamic ARP Inspection: o switch valida cada mensagem ARP contra a tabela de **DHCP snooping**,
que registra qual MAC recebeu qual IP. Resposta ARP que contradiz o registro é descartada.

**8. Handshake TCP**

SYN (seq=X) → SYN-ACK (seq=Y, ack=X+1) → ACK (ack=Y+1). X e Y são os **números de sequência
iniciais**, escolhidos aleatoriamente por cada lado.

**9. SYN consome sequência**

O flag SYN ocupa **um número de sequência** no espaço lógico. Sem isso, o ACK que confirma o SYN
seria indistinguível de um ACK de zero bytes de dado. É a razão pela qual o `ack` do SYN-ACK é
`seq+1`.

**10. `ack 1`**

O `tcpdump` mostra números **relativos** por padrão: o primeiro pacote de cada direção tem seq 1.
Com `-S`, mostra valores **absolutos**. `ack 1` significa "confirmei o primeiro byte" — se você
precisa do número real, use `-S`.

**11. VLAN como segurança**

Isola o domínio de broadcast: um host numa VLAN não fala ARP com outra VLAN. Precisa de
roteador/firewall entre as VLANs, onde se aplica política. **Pode ser furada:** (a) VLAN hopping
via Q-in-Q em `native VLAN` mal configurada; (b) porta de acesso configurada como tronco expõe
todas as VLANs àquele dispositivo.

**12. `ff:ff:ff:ff:ff:ff`**

Broadcast de Ethernet. Duas possibilidades: (a) é um protocolo que legitimamente usa broadcast
(ARP request, DHCP Discover, NDP); (b) é tráfego gerado por algo anômalo. **Distinguir:** pelo
EtherType (`0x0806` = ARP) e pela porta/protocolo na camada de cima.

---

## Módulo 3 — IP, roteamento e ICMP

**1. Header IPv4**

O campo **IHL** diz onde o header TCP começa: IHL em palavras de 4 bytes, então `IHL × 4` = bytes.

**2. IHL = 6**

24 bytes de header IP (6 × 4). O TCP começa em **14 + 24 = offset 38** do quadro, não 34. **Aqui
está o erro de leitura de hexdump mais comum:** quem assume offset 34 lê o header TCP deslocado
de 4 bytes e não entende nada.

**3. TTL 58**

TTL inicial de 64 (Linux) → **6 saltos**. Mas cuidado: o TTL inicial é escolha do emissor, então
6 saltos só vale se o emissor usa 64.

**4. `10.10.10.200/27`**

```
32-27 = 5 bits → 32 endereços
200/32 = 6,25 → bloco 6 → 192
Rede 10.10.10.192 (na verdade 6*32 = 192) · Broadcast 10.10.10.223 · Hosts 193–222 (30 hosts)
```

**5. `10.10.20.0/23`**

32-23 = 9 bits → 512 endereços → **510 hosts**. Máscara: `/23` = 255.255.254.0.

**6. Longest prefix match**

Três rotas: `0.0.0.0/0` via A, `10.0.0.0/8` via B, `10.10.10.0/24` via C. Pacote para
`10.10.10.5`: casam as três; **vence a `/24`** (prefixo mais longo), via C. A `/0` só casaria se
nenhuma outra casasse.

**7. `ip route get`**

Responde "por onde **este** pacote para **este** destino vai sair", aplicando longest prefix
match e devolvendo interface + gateway + IP de origem escolhido. `ip route show` lista a tabela
inteira, sem resolver nenhum destino específico.

**8. ICMP 3/1 vs. 3/3**

3/1 (host unreachable): a rede é conhecida mas o host não é alcançável — problema de roteamento
até o host. 3/3 (port unreachable): **o host foi alcançado**, só não há nada escutando naquela
porta — o problema é de serviço, não de rede. **Conclusões completamente diferentes.**

**9. Bloquear ICMP quebra TCP**

Porque `fragmentation needed` (ICMP 3/4) é o mecanismo do **PMTUD** (Path MTU Discovery). Sem
ele, o emissor nunca descobre que precisa reduzir o tamanho do pacote, e conexões que passam de
um certo tamanho travam — sem erro nenhum. Isso é o black hole de MTU.

**10. Black hole de MTU**

Pacote grande com DF=1 → roteador com MTU menor precisa fragmentar → não pode → descarta e manda
ICMP 3/4 com a MTU correta → **se esse ICMP for bloqueado, o emissor nunca aprende** →
retransmite o mesmo pacote grande → trava. O ICMP 3/4 é o que previne, porque carrega a MTU.

**11. `* * *` e depois responde**

Hipóteses: (a) os roteadores naqueles saltos não geram ICMP — **mais provável**; (b) ICMP de
volta bloqueado por firewall no caminho; (c) rate limiting de ICMP naqueles roteadores;
(d) o caminho é assimétrico e as respostas tomam outra rota que não passa por eles. Como o
destino responde, **o caminho funciona**.

**12. Quatro diferenças do IPv6**

Header fixo de 40 B (vs. 20 variável) · sem checksum no header · roteador **não fragmenta**
(PMTUD obrigatório) · NDP substitui ARP (sem broadcast). Também: endereço de 128 bits e Hop
Limit no lugar de TTL.

**13. Sem broadcast em IPv6**

Broadcast desperdiça recursos e incomoda todos. IPv6 usa **multicast** com grupos específicos —
quem se inscreve recebe. O ARP é substituído pelo **NDP** (Neighbor Discovery Protocol), que roda
sobre ICMPv6 em multicast.

---

## Módulo 4 — TCP a fundo

**1. Header TCP**

**Data Offset** (4 bits) diz onde o payload começa, em palavras de 4 bytes. No hexdump: identifique
o início do header TCP (offset 34 do quadro, se IP for 20 B), leia o nibble do Data Offset no
byte 12 do header TCP, multiplique por 4, some.

**2. RST de outro IP**

Um IP intermediário respondeu — firewall com `reject`, ou dispositivo de rede no caminho.
**Conclusão:** algo no caminho ativamente recusa o tráfego, e você sabe que ele existe. Um
firewall com `drop` não deixaria nenhum rastro.

**3. `drop` vs. `reject` na captura**

`drop`: nada. O cliente retransmite o SYN com backoff e eventualmente dá timeout — você vê SYN
repetido sem resposta. `reject`: RST (ou ICMP 3/13) imediato. **O `reject` revela que há um
firewall naquele caminho; o `drop` esconde.**

**4. `win 0`**

O receptor está dizendo "estou cheio, não me mande". **Aponta para a aplicação do receptor**,
porque o TCP só anuncia janela zero quando o buffer de recepção está cheio — o que significa que
a aplicação não chamou `recv()`. É um bug de aplicação, não de rede.

**5. Janela de 8 MB**

**Window scale** (opção `wscale`, negociada no handshake): `janela real = win × 2^wscale`. Com
`wscale=7`: 65535 × 128 ≈ 8 MB.

**6. Divergência tcpdump/Wireshark**

`tcpdump` mostra o valor **bruto** do campo de 16 bits. O Wireshark, quando faz reassembly de
fluxo, **aplica o window scale** e mostra o valor efetivo. Os dois estão certos; você precisa
saber qual está olhando.

**7. ACK duplicado**

**Três** ACKs idênticos disparam o fast retransmit. O receptor está dizendo: "recebi os bytes
seguintes, mas falta este aqui, então não posso entregar nada à aplicação".

**8. Head-of-line blocking e SACK**

TCP é um fluxo ordenado; um segmento perdido bloqueia todos os posteriores, mesmo que tenham
chegado. **SACK** permite ao receptor informar os blocos já recebidos, e o emissor retransmite só
o que falta — em vez de reenviar tudo depois do buraco.

**9. RTO vs. fast retransmit**

RTO: mesmo `seq` repetido com **intervalo crescente** (backoff exponencial), sem ACK duplicado
antes. Fast retransmit: **três ACK duplicados primeiro**, depois a retransmissão. O segundo é
mais rápido e indica que os pacotes seguintes chegaram.

**10. `CLOSE-WAIT` acumulando**

O peer enviou FIN, o kernel marcou o estado, e **a aplicação nunca chamou `close()`**. A conexão
fica pendurada. **Componente com problema: a aplicação**, não a rede.

**11. `TIME-WAIT`**

Existe para (a) garantir que o ACK final chegou, e (b) impedir que pacotes atrasados de uma
conexão antiga confundam uma conexão nova com a mesma quíntupla. Torna-se problema em servidor
com muitas conexões curtas: esgota as portas efêmeras. **Solução correta:** `tcp_tw_reuse=1`
(com timestamps). **`tcp_tw_recycle` foi removido** e não deve ser usado.

**12. Black hole em cinco passos**

(1) MTU negociada 1500; (2) túnel no caminho com 1400; (3) pacote grande com DF chega;
(4) roteador descarta e envia ICMP 3/4; (5) **ICMP bloqueado** → emissor não aprende →
retransmite → trava. `ping` funciona porque o pacote pequeno cabe.

**13. Bloquear ICMP quebra TCP**

Porque quebra o PMTUD. O ICMP 3/4 é diagnóstico necessário ao funcionamento do TCP, não um
extra opcional.

---

## Módulo 5 — UDP, DNS e o caminho do nome

**1. Header UDP**

Porta origem (16) + porta destino (16) + comprimento (16) + checksum (16) = 8 bytes. UDP tem 8
bytes porque **não oferece nenhuma das garantias** que ocupam espaço no TCP — sem sequência, sem
ACK, sem janela, sem flags.

**2. Três aplicações UDP**

DNS (pergunta/resposta, retransmissão na aplicação — handshake custaria 3 RTTs) · VoIP (pacote
atrasado é pior que pacote perdido; retransmitir vira ruído) · DHCP (**não tem IP ainda**, não
pode fazer TCP).

**3. 443/UDP**

É **QUIC**. O HTTP/3 roda sobre QUIC, que roda sobre UDP. Reimplementa confiabilidade, ordem e
congestion control **na aplicação**, ganhando multiplexação sem head-of-line blocking.

**4. Header DNS**

ID (16) · flags (16, incluindo QR) · QDCOUNT, ANCOUNT, NSCOUNT, ARCOUNT (16 cada) = 12 bytes.
**QR** diz se é pergunta (0) ou resposta (1).

**5. Nome no DNS**

Cada rótulo precedido por 1 byte de comprimento, terminado por byte `00` (raiz). Exemplo:
`07 exemplo 03 lab 00` = `exemplo.lab.`

**6. `0xc00c`**

Ponteiro de compressão: os **dois bits mais altos `11`** indicam que os 14 bits restantes são um
**offset dentro da própria mensagem** onde o nome já apareceu. **Risco:** ponteiros circulares,
offsets fora dos limites, e nomes que se referenciam mutuamente causando loop no parser.

**7. TXT como vetor**

TXT aceita até 255 bytes de texto livre por registro, e múltiplos registros. **Um campo "livre" é
um canal** — perfeito para carregar dado de saída (nome do subdomínio) e de entrada (conteúdo do
TXT).

**8. 200 consultas em 10 min**

**Conclusão:** forte indício de túnel DNS ou C2. **Evidência:** (a) 200 consultas em 600s = um a
cada 3s, ritmo automatizado; (b) nome de 60 caracteres (host normal tem <30); (c) sempre o mesmo
domínio `tunnel.example`, subdomínio diferente a cada vez; (d) TTL 0, ou seja, "não cacheie".
Falta confirmar: entropia dos rótulos e se há resposta de tamanho similar.

**9. Jitter**

Variação aleatória no intervalo entre beacons, para quebrar a detecção por periodicidade. O
desvio padrão dos intervalos sobe e o padrão regular desaparece. **O que continua detectável:**
domínio desconhecido, entropia alta nos nomes, ausência de padrão de navegação.

**10. DNSSEC vs. DoH**

DNSSEC: **autenticidade** — assinatura criptográfica das respostas, cadeia de confiança desde a
raiz. DoH/DoT: **confidencialidade** — cifra a consulta no caminho. Ter um não implica o outro:
DoH sem DNSSEC significa consulta cifrada até um resolvedor que pode estar envenenado.

**11. Dois falsos positivos**

CDN com subdomínio longo e randômico (`d111111abcdef8.cloudfront.net`) · telemetria de software
legítimo fazendo consulta periódica a domínio próprio · serviços de DNS dinâmico (DDNS) · anti-vírus
consultando reputação de domínio em intervalo regular.

**12. Flag `TC`**

Truncated. A resposta não coube em 512 bytes (limite UDP clássico). O cliente **repete a consulta
sobre TCP**, que não tem esse limite. É por isso que DNS também usa TCP na porta 53 para respostas
grandes, transferência de zona e DNSSEC.

---

## Módulo 6 — `tcpdump` na prática

**1. `-nn`**

Desabilita resolução de **nomes e de portas**. Sem ele, o `tcpdump` faz **consulta DNS reversa de
cada IP** que aparece — cada consulta é tráfego de rede, o que destrói o desempenho numa captura
de volume e polui a saída com nomes aleatórios. Também torna a saída não-determinística.

**2. `-s 0` vs. `-s 96`**

`-s 0` = snaplen ilimitado, captura o pacote inteiro. `-s 96` = só os primeiros 96 bytes (headers,
sem payload). **Precisa ser decidido antes**, porque o `.pcap` grava o que foi capturado — não há
como recuperar payload depois. Em captura de incidente, use `-s 0`.

**3. `-C 100 -W 10`**

`-C 100`: novo arquivo a cada 100 MB. `-W 10`: mantém no máximo 10 arquivos, descartando o mais
antigo. **Juntos, mantêm o uso de disco em ~1 GB.** Obrigatório em servidor: sem isso, uma captura
esquecida enche a partição e derruba o serviço.

**4. `-Z`**

Baixa privilégio (para usuário sem privilégio ou para um usuário especificado) **depois** de abrir
a interface. Importa porque significa que um bug explorável no `tcpdump` não resulta em
comprometimento com root.

**5. Filtro: SYN sem ACK para 443, exceto 10.10.10.10**

```bash
'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn and dst port 443 and not host 10.10.10.10'
```

**6. `tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn`**

`tcp[tcpflags]` lê o byte de flags. `(tcp-syn|tcp-ack)` é máscara com os dois bits. `== tcp-syn`
significa "o resultado tem o bit SYN e **não** o bit ACK". Pega **só SYN puro**, ou seja, só
tentativas de abertura — exclui o SYN-ACK, que é resposta.

**7. `ip[2:2]` vs. `greater`**

`greater 1000` compara o **tamanho do quadro** (incluindo os 14 bytes de Ethernet).
`ip[2:2] > 1000` lê o campo "tamanho total" **do header IP**. A diferença de 14 bytes importa
quando você caça pacote grande para diagnóstico de MTU.

**8. Payload TCP e `tcp[12]`**

`tcp[12]` é o byte que contém o **Data Offset** nos 4 bits altos. `(tcp[12] & 0xf0) >> 2` dá o
tamanho do header TCP em bytes — necessário para saber onde o payload começa, porque o header
pode ter opções.

**9. `dropped by kernel: 4321`**

Você **não pode** concluir que algo **não aconteceu**. A captura tem furos: pacotes foram
descartados por falta de buffer. Qualquer conclusão do tipo "não houve X" é inválida. Solução:
capturar de novo com `-B` maior e filtro mais específico.

**10. Sem reassembly**

`tcpdump` mostra pacote por pacote, sem reconstruir o fluxo. Ele nem tenta: reassembly exige manter
estado por conexão, o que custa memória e velocidade — incompatível com a proposta de baixo
overhead. **`tshark -z follow,tcp`** faz isso.

**11. Quando não usar `tcpdump`**

Análise de protocolo de aplicação (usar `tshark`) · reassembly de fluxo (`tshark -z follow`) ·
achar processo dono da conexão (`ss -tanp`) · ver estado interno do TCP sem capturar (`ss -ti`) ·
link de 10 Gbps (usar `dumpcap` ou amostragem).

**12. `.pcap` com credenciais**

Tratar como dado sensível: cifrar em repouso, definir política de retenção, restringir acesso,
destruir ao final do engajamento. Em muitos contratos isso é obrigação contratual; com dados
pessoais, é obrigação da LGPD.

---

## Módulo 7 — Análise com `tshark`

**1. `-f` vs. `-Y`**

`-f` (capture filter, BPF) aplica **antes** de capturar — o pacote não é gravado. `-Y` (display
filter) aplica **depois** de ler — o pacote está no arquivo. **Só o `-Y` é reversível**, e é por
isso que ele importa: você pode refinar a análise sem recapturar.

**2. Capturar largo**

Porque a captura restritiva é irreversível. Se você capturou só `tcp port 80` e o incidente
envolvia DNS, a informação não existe mais. Capturar largo e filtrar depois erra para o lado que
tem conserto.

**3. Display filter do SYN**

```
tcp.flags.syn == 1 && tcp.flags.ack == 0 && tcp.dstport == 443 && ip.src == 10.10.10.20
```

**4. Retransmissões e falso positivo**

```bash
tshark -r cap.pcap -Y 'tcp.analysis.retransmission'
```

Falso positivo porque o Wireshark marca como retransmissão o pacote cujo conteúdo **já foi visto**
na captura. Se você capturou só um lado da conversa, ou o próprio `tcpdump` perdeu pacotes, o
dissector pode marcar como duplicata algo que na verdade é o primeiro envio. **Sempre confirmar
com o contexto.**

**5. `-z expert`**

Reporta anomalias detectadas pelos dissectores: checksum incorreto, retransmissão, conexão
recusada, pacote malformado, campo inválido. É a triagem mais rápida de uma captura grande, e é
subestimado porque o nome não sugere o que faz.

**6. Sites sem quebrar TLS**

**`tls.handshake.extensions_server_name`** — o SNI, que vai em claro no ClientHello mesmo em
TLS 1.3. Ou `dns.qry.name` para as consultas de nome.

**7. CSV quebrado**

Campos que contêm vírgula (como `http.user_agent` completo) quebram a estrutura. Evitar com
`-E separator=/t` (tabulação), ou exportar como JSON (`-T json`) e converter com `jq`.

**8. `-z follow,tcp,ascii,N`**

Reconstrói a conversa TCP número N, ordenando os segmentos por número de sequência e mostrando o
conteúdo. **Cuidado:** ele torna legível **tudo** que trafegou em claro — credenciais, cookies,
corpo de mensagem. Exige autorização e tratamento do resultado como material sensível.

**9. Tempo de resposta**

```bash
tshark -r cap.pcap -Y 'http.request or http.response' -T fields \
  -e frame.number -e frame.time_epoch -e http.request.uri -e http.response.code
```
Diferença entre `frame.time_epoch` do request e da response correspondente.

**10. 200 requisições, 180 respostas**

(a) captura iniciada no meio (requisições antes, ou respostas depois); (b) pacotes perdidos pelo
kernel (checar `dropped`); (c) respostas não chegaram (timeout, RST) — o que pode ser o incidente;
(d) reassembly não completou porque a captura terminou.

**11. `tshark` mais lento**

Ele **disseca cada pacote** — percorre o registro de dissectores, interpreta cada protocolo,
expande campos. `tcpdump` só imprime um resumo. É a contrapartida do poder de análise.

**12. `.pcap` de 5 GB**

```bash
tshark -r cap.pcap -q -z expert | head -50
```
Ou `-z conv,tcp` para inventário. **Motivo:** você precisa do panorama antes de mergulhar. O
`expert` aponta onde há anomalia; o `conv` mostra quem falou com quem. Ir direto ao pacote sem
panorama é como procurar agulha sem saber o tamanho do palheiro.

---

## Módulo 8 — `traceroute` e o mapeamento de caminho

**1. Mecanismo**

TTL decresce 1 por roteador; quando chega a 0 o roteador descarta e responde ICMP `Time Exceeded`.
Enviando sondas com TTL 1, 2, 3..., cada roteador sucessivo é forçado a responder. Precisa ser
**roteador intermediário** porque um roteador só gera esse ICMP quando **descarta** o pacote — o
que só acontece quando o TTL expira ali.

**2. Sinal de chegada**

UDP: ICMP 3/3 (`port unreachable`) · ICMP: `echo reply` · TCP com porta fechada: RST · TCP com
porta aberta: SYN-ACK.

**3. `-T -p 443`**

Porque o firewall de borda **precisa** deixar passar 443 para o negócio funcionar. UDP alto e ICMP
são frequentemente bloqueados; 443 não pode ser.

**4. `* * *` seguido de resposta**

O caminho **funciona**. O roteador naquele salto simplesmente não gera ICMP — política padrão por
medo de abuso. Você não achou um problema.

**5. Tempo inclui a volta**

O tempo medido é ida até o salto N + volta do salto N. Se a rota de volta for diferente (e
frequentemente é), o número não representa a latência de ida daquele trecho. Engana porque você
pode atribuir a lentidão ao caminho de ida quando ela está na volta.

**6. 150 ms seguido de 12 ms**

Roteadores dão **prioridade baixa** ao processamento de ICMP: responder sonda é trabalho feito
quando a CPU está livre. O roteador responde devagar, **mas encaminha o pacote de dado rápido**.
Prova: o salto seguinte é mais rápido.

**7. O mito do salto ruim**

**Regra correta:** a latência que importa é **a do destino final**. Latência alta em salto
intermediário seguida de latência baixa depois **não indica problema**. Para avaliar um salto,
compare com o destino — se o destino tem 12 ms e o intermediário tem 150 ms, o intermediário não
adiciona nada.

**8. 100% de perda no salto 3, 0% no destino**

O salto 3 não responde sonda nenhuma (política). O `mtr` conta "não respondeu" como 100% de perda.
**Como o destino não tem perda, não há perda real no caminho.**

**9. `traceroute` vs. `mtr`**

`traceroute` = foto, uma medição pontual. `mtr` = filme, contínuo, com perda, latência e desvio
padrão por salto. **Para problema intermitente, `mtr`** — rode por minutos ou horas.

**10. O que `traceroute` não mostra**

(a) Caminho único e estável — mostra um mosaico; (b) conteúdo de túneis (VPN, MPLS, IPsec viram
um salto); (c) caminho de ida (mostra ida + volta); (d) capacidade do link (mede latência, não
banda); (e) problema **antes** do gateway, na própria LAN.

**11. Caminho mudando entre execuções**

ECMP, failover, mudança de política. Significa que **um `traceroute` é uma amostra, não a
topologia**. Nunca conclua sobre a estrutura da rede a partir de uma execução só.

**12. Mesmo salto, três IPs**

O roteador tem várias interfaces, **ou** há balanceamento de carga mandando cada sonda por um
caminho diferente. Significa que a lista de saltos pode **não corresponder a nenhum caminho real
único**.

**13. `StDev` alto**

Jitter — variação da latência. Sofrem mais: **VoIP, videoconferência, jogos online** e qualquer
aplicação de tempo real. `StDev` alto com `Avg` baixo ainda é ruim para essas aplicações, e não
aparece em média nenhuma.

---

## Módulo 9 — TLS, HTTP/2 e interceptação

**1. Três propriedades**

Confidencialidade, integridade, **autenticidade**. O certificado é público **porque a
autenticidade depende de ele ser verificável por qualquer um** — o cliente precisa poder validar
sem segredo compartilhado prévio.

**2. Handshake TLS 1.3**

ClientHello → ServerHello → {EncryptedExtensions, Certificate, CertificateVerify, Finished} →
{Finished}. **Um RTT** (zero em retomada com PSK).

**3. TLS 1.2 vs. 1.3**

Em 1.2, o **certificado vai em claro**: um observador lê o nome, o emissor, a validade, os SANs.
Em 1.3, o certificado vai **cifrado**. Sobra em claro apenas o **SNI** no ClientHello, mais ALPN,
versões e cipher suites.

**4. SNI e ECH**

SNI (Server Name Indication) é o nome do domínio que o cliente anuncia no ClientHello para o
servidor escolher o certificado certo — precisa ir em claro porque o servidor precisa lê-lo
**antes** de haver chave. **ECH** (Encrypted Client Hello) cifra o SNI, usando a chave pública do
servidor obtida por outro canal (DNS/HTTPS RR).

**5. SNI não é prova**

Nada verifica o SNI — o cliente pode colocar qualquer valor. **Cenário de abuso:** malware põe
`www.google.com` no SNI e conecta a um IP que não pertence ao Google; quem só olha o SNI conclui
que o host acessou o Google. O único jeito de conferir é comparar o SNI com o IP real e o
certificado (que em TLS 1.3 não é visível).

**6. HTTP/2 e multiplexação**

Uma conexão transporta **várias requisições intercaladas em frames**. A correspondência "uma
conexão = uma requisição" deixa de valer, e o `tcp.stream` do `.pcap` não corresponde mais a uma
única transação.

**7. HPACK**

Compressão de cabeçalho com **dicionário dinâmico** construído ao longo da conexão. Sem o estado
completo da conexão desde o início, você não consegue decodificar — um `.pcap` capturado no meio
não basta.

**8. Fluxo do proxy**

Cliente faz TLS **com o proxy** · proxy faz TLS **com o servidor**. **Duas conexões TLS
independentes.** O proxy termina uma e origina a outra, lendo o conteúdo no meio.

**9. O que determina se funciona**

**Se a CA do proxy está no trust store do cliente.** O cliente valida o certificado apresentado
pelo proxy; se o emissor não é uma CA em que ele confia, a validação falha e o cliente aborta.
É exatamente o mecanismo de defesa funcionando.

**10. `certificate pinning`**

O cliente fixa a **chave pública ou o hash esperado** do certificado, em vez de confiar em
qualquer CA do store. Derrota a interceptação porque o certificado do proxy tem chave diferente,
**mesmo que a CA esteja instalada**.

**11. Cinco informações sem decifrar**

SNI (destino nominal) · IP real (para onde conectou de verdade) · tamanho de pacote (perfil de
tráfego) · timing e duração (beacon vs. navegação) · volume por conversa (upload vs. download) ·
certificado (só em TLS 1.2).

**12. Ressalva ao relatório**

"O SNI é autodeclarado e não verificado. O host anunciou `www.google.com`, mas isso não prova que
acessou o Google — é preciso confirmar o IP de destino e, se possível, o certificado."

**13. `SSLKEYLOGFILE`**

Só funciona em **cliente que você controla**, porque exige instrumentar o cliente para exportar as
chaves de sessão. Não existe técnica legítima de decifrar captura de terceiro — é o propósito
inteiro do TLS.

**14. LGPD e proxy**

Base legal para o tratamento · **minimização** (não capturar mais do que o necessário) · prazo de
retenção definido · controle de acesso ao que for retido · informação aos usuários · avaliação de
impacto. Um proxy que decifra tudo e loga indefinidamente é problema de conformidade, mesmo com
intenção legítima.

---

## Módulo 10 — `scapy`, firewall e diagnóstico

**1. Operador `/`**

Empilha camadas: `IP() / TCP()` monta TCP **dentro** de IP. É a tradução literal do
encapsulamento — exatamente o que o kernel faria, mas com controle campo a campo.

**2. Fechada vs. filtrada**

Fechada: resposta **RST** (chegou no host, nada escutando). Filtrada: **nenhuma resposta**, ou
ICMP 3/1, 3/10, 3/13. A diferença é entre "o host me respondeu" e "algo no caminho descartou".

**3. Cinco hooks**

PREROUTING (antes da rota — DNAT) · INPUT (para esta máquina) · FORWARD (atravessa esta máquina) ·
OUTPUT (gerado por esta máquina) · POSTROUTING (depois da rota — SNAT).

**4. Bloquear tráfego entre outros hosts**

**`FORWARD`**. `INPUT` só vê pacote **destinado à própria máquina**; tráfego que atravessa vai
para `FORWARD`. Este é o erro número um de configuração de firewall.

**5. `ct state established,related`**

Permite o tráfego de **resposta** de conexões que a própria máquina iniciou (o kernel rastreia via
`conntrack`). Sem ela, a política de `INPUT` bloquearia as respostas do tráfego que a política de
`OUTPUT` permitiu sair — e **nada funcionaria**. `related` cobre ICMP de erro associado, inclusive
o `fragmentation needed`.

**6. Ordem**

Firewall: **primeira regra que casa vence** e o processamento da chain para — ordem é crítica.
Roteamento: **prefixo mais longo vence**, independente da ordem na tabela. São modelos opostos.

**7. `drop` vs. `reject`**

`drop`: o emissor não recebe nada, espera, dá timeout ("travou"). `reject`: recusa imediata
("conexão recusada"). **`drop` na borda** (esconde a existência do firewall de quem sonda);
**`reject` na rede interna** (diagnóstico possível, usuário entende o erro).

**8. Aplicar política `drop` remotamente**

(1) Adicione `accept` para sua porta de acesso **primeiro**. (2) **Abra uma segunda sessão** e
confirme que funciona. (3) Só então aplique a política `drop`. (4) Deixe um mecanismo de reversão
pronto (uma sessão de console, ou um `at`/cron que restaura as regras após N minutos).

**9. Sete passos**

Sintoma exato → localizar camada → **coletar evidência sem hipótese** → comparar com o que
funciona → seguir tráfego pelos dois lados → formular hipótese e testar → documentar. **O passo 3
proíbe hipótese porque** uma teoria precoce faz você coletar só a evidência que a confirma —
viés de confirmação. Evidência primeiro, teoria depois.

**10. Capturar nos dois lados**

Porque mostra **onde o pacote aparece e onde ele desaparece**. Se o SYN sai do cliente e não chega
no servidor, o problema está no caminho (rota, firewall). Se chega e a resposta não volta, o
problema é no servidor. É o passo que localiza a falha em minutos.

**11. `win 0` com ACKs fluindo**

**Não é problema de rede.** O TCP está funcionando: o receptor está anunciando janela zero porque
a **aplicação dele não está consumindo os dados** (não chama `recv()`). A rede entregou tudo. O
problema é a aplicação do receptor.

**12. Funciona por IP, não por nome**

(a) DNS — `dig nome`, conferir `/etc/resolv.conf`; (b) **`/etc/nsswitch.conf`** e `/etc/hosts`
(uma entrada errada em `hosts` resolve para o lugar errado); (c) proxy configurado para o cliente
HTTP, que só aplica a nomes.

**13. `nft flush ruleset`**

Remove **todas** as regras de **todas** as tabelas — o firewall fica vazio, sem política. Em
produção, isso expõe a máquina completamente. **Antes de rodar:** salve o estado
(`nft list ruleset > backup.nft`), tenha console alternativo de acesso, e saiba o comando de
restauração (`nft -f backup.nft`). Em laboratório, tudo bem — **e restaure depois**.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Evidência anexada | 35% | A captura/saída está no entregável, não só a conclusão |
| Interpretação correta | 30% | O que a evidência mostra, e o que ela **não** mostra |
| Método explícito | 20% | O raciocínio está registrado, não só o resultado |
| Honestidade | 15% | Hipóteses erradas registradas; limitações declaradas |

**Penalidades automáticas:**

- Conclusão sem captura anexada: −35% (o lab inteiro depende disso).
- Afirmar que algo "não aconteceu" a partir de captura com `dropped > 0`: −20%.
- Concluir que um salto intermediário tem problema sem comparar com o destino (`mtr`/`traceroute`):
  −15%.
- Reportar SNI como prova de acesso: −15%.
- Executar qualquer coisa fora de `10.10.10.0/24`: **lab zerado**.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| Método | Tentativa e erro | Sete passos seguidos | Sete passos + hipóteses erradas documentadas |
| Evidência | Conclusão sem captura | Captura de um lado | Captura dos dois lados, comparadas |
| Camadas | Confunde camadas | Localiza a camada correta | Localiza a camada e explica por que descartou as outras |
| Honestidade | Afirma mais do que provou | Reconhece limites | Lista o que descartou e o que a evidência não prova |
| Reversão (lab) | Ambiente deixado sujo | Reverteu | Reverteu e **confirmou** com comando de verificação |

**O item de maior valor em todo o curso:** a seção **Limitações** de cada relatório. O que a
captura não prova é o que separa um analista que sabe o que está fazendo de um que está chutando
com confiança.

---

*Material didático original. Nenhum trecho reproduzido de obra comercial protegida.*
