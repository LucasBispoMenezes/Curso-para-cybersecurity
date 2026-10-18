# Módulo 10 — Tor em Ambiente Corporativo, Bridges e Bloqueio

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 9

---

## Objetivos

1. Distinguir **bloqueio** de **filtragem** e explicar por que a distinção importa.
2. Reconhecer tráfego Tor por comportamento, não por lista de IP.
3. Entender *pluggable transport* e *bridge*: o que resolvem e o que **não** resolvem.
4. Configurar um transporte ofuscado **próprio** e medir o efeito.
5. Analisar, na sua própria captura, por que um bloqueio por IP é frágil.
6. Decidir, de forma defensável, o que fazer com Tor na sua rede.

---

## ⚠ Conduta e escopo

O Módulo tem **duas audiências** e o material serve às duas com o mesmo conteúdo:

| Audiência | O que este módulo responde |
|---|---|
| **Usuário sob censura** | Como acessar quando a rede bloqueia |
| **Administrador de rede** | O que fazer com Tor sem quebrar privacidade legítima |

⚠ **A linha, e ela é explícita:** este módulo trata de **acesso** (disponibilidade), não de
anonimato novo. Configurar *bridge* devolve o acesso a uma rede que já protegia — **não aumenta**
o anonimato (Módulo 1, §1.5).

⚠ **Nada aqui orienta burlar política corporativa legítima.** Se você administra a rede, este
módulo te dá os elementos para decidir com critério. Se você é usuário, ele te dá os elementos
para entender o que a política da sua organização faz — e a decisão de segui-la é sua e da
organização, não do material.

---

## 10.1 Bloqueio, filtragem, e por que distinguir

Três coisas diferentes, frequentemente tratadas como uma.

| | O que é | Exemplo | Efeito |
|---|---|---|---|
| **Bloqueio total** | Origem/destino inalcançável | IP do relay bloqueado | Tor não conecta |
| **Filtragem por lista** | Lista de IP/domínio bloqueada | Lista de relays de entrada | Tor não encontra guarda |
| **Bloqueio por protocolo** | Detecção por comportamento | DPI reconhece handshake | Tor não passa |
| **Bloqueio ativo** | Derruba a conexão | RST injetado, ou *null route* | Intermitente e frustrante |
| **Sem bloqueio, com política** | Pode usar, com consequência | Política organizacional | Decisão, não impedimento |

⚠ **A distinção mais importante é a última.** Em ambiente corporativo, a questão quase nunca é
"conseguimos bloquear Tor?" — quase sempre conseguimos. A questão é **"deveríamos?"**, e ela tem
custo nos dois sentidos.

### Por que bloqueio por IP é frágil

O Tor tem **milhares de relays**, e a lista muda.

| Mudança | Efeito no bloqueio |
|---|---|
| Relay novo entra no consenso | Não está na lista → passa |
| Relay muda de IP | O IP antigo é inútil |
| **Ponte** (`bridge`) | **Não está no consenso** → o bloqueio não sabe que existe |
| Transporte ofuscado | Não parece Tor → DPI não reconhece |

⚠ **Os dois últimos são a resposta técnica ao bloqueio, e é o assunto do módulo.** A ponte resolve
porque é **não listada**; o transporte resolve porque é **indistinguível**.

---

## 10.2 Reconhecer Tor por comportamento

⚠ **Esta seção é necessária para o administrador e é sensível para o usuário.** O material mostra os
**princípios**, porque um administrador que não entende o mecanismo vai bloquear errado — e
bloquear errado prejudica gente que não tem nada a ver com isso.

### O que um observador de rede consegue ver

| Sinal | O que revela | Por que não é definitivo |
|---|---|---|
| **Destino é datacenter** | Relay, VPN, ou bot | Nuvem legítima também |
| **Volume e tempo** | Padrão de circuito | Qualquer tráfego contínuo se parece |
| **Porta 9001/9030** | ORPort/DirPort conhecidas | Muitos relays usam 443 |
| **Certificado do relay** | Emissor e SAN conhecidos | Só antes de bridge/transporte |
| **Lista de IP** | Relays públicos | Pontes não estão na lista |
| **Handshake** | Assinatura do protocolo | Ofuscado, deixa de aparecer |

⚠ **O ponto que a tabela faz:** **todos** os sinais têm falso positivo, e nenhum é conclusivo —
exceto o handshake sem ofuscação. **É por isso que bloqueio por IP quebra rede legítima**, e é por
isso que DPI é a técnica mais eficaz e a mais invasiva.

⚠ **E há um custo real do lado defensivo:** DPI de tráfego Tor é indistinguível de DPI para
censura. Uma organização que implementa reconhecimento de Tor está construindo, com as mesmas
engrenagens, uma capacidade de censura. Isso é decisão de política, com consequência.

```bash
# Análise na SUA própria rede: o que você veria
sudo tcpdump -i any -nn -s 0 -c 200 -w tor-reconhecimento.pcap \
     '(tcp port 9001 or tcp port 9030 or tcp port 9040)' 2>/dev/null &
sleep 1
curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null https://example.com 2>/dev/null
sleep 2

tshark -r tor-reconhecimento.pcap -T fields -e ip.dst -e tcp.dstport 2>/dev/null | sort -u | head
```

### Falha de reconhecimento que vale conhecer

⚠ **Um administrador que bloqueia por IP bloqueia também `check.torproject.org` e outras
infraestruturas legítimas** — e frequentemente bloqueia o **serviço de ponte**, que é o que mais
importa para quem depende de comunicação livre.

**A recomendação prática que o módulo defende:** em ambiente corporativo, **política e detecção de
anomalia** resolvem melhor que bloqueio cego. Bloquear quebra caso legítimo e não impede quem
realmente quer passar — porque a ponte existe exatamente para isso.

---

## 10.3 Pluggable transport e bridge — o que resolvem

Aqui está a parte técnica, e é elegante.

```
SEM OFUSCAÇÃO                       COM OFUSCAÇÃO
┌──────┐  handshake Tor visível     ┌──────┐  tráfego aleatório       ┌──────┐
│cliente│──────────────▶│relay│     │cliente│────────────────────────▶│bridge│
└──────┘                └─────┘     └──────┘                          └──────┘
      │                                    │
      ▼                                    ▼
  DPI reconhece e bloqueia            DPI vê ruído, não bloqueia
```

| Elemento | Função |
|---|---|
| **Bridge** | Relay **não listado** no consenso. O bloqueio por lista não a conhece |
| **Pluggable transport** | Camada que **transforma** o tráfego antes de sair |
| **`obfs4`** | Transforma em tráfego sem assinatura reconhecível |
| **`meek`** | Encaminha por CDN grande (domínio reputado, difícil de bloquear) |
| **`snowflake`** | Usa navegador voluntário como ponte — conjunto efêmero e enorme |
| **Conjunto bridge** | Pontes são distribuídas por canal fora da rede (e-mail, site, bot Telegram) |

⚠ **O que a ponte resolve:** acesso. **O que ela NÃO resolve:** anonimato.

| Pergunta | Ponte resolve? |
|---|---|
| Consigo acessar a rede Tor? | **Sim** |
| Meu IP está escondido do relay de entrada? | **Não** — a ponte é quem vê seu IP |
| Estou mais anônimo que sem ponte? | **Não.** A ponte **é** o primeiro salto |
| O destino sabe quem eu sou? | Não — igual ao Tor normal |

⚠ **O ponto do módulo inteiro, e ele é o mesmo do Módulo 1 §1.5:** pluggable transport é
**disponibilidade**, e disponibilidade é a terceira propriedade da tríade (§1.5). Confundir
disponibilidade com anonimato leva a pessoa a **confiar mais** exatamente quando adicionou
complexidade.

⚠ **E há um custo real para quem usa ponte:** o **desempenho** é pior, e a ponte **vê seu IP** —
ou seja, você tem mais um terceiro no caminho. É uma troca: acessa em lugar de não acessar.

### Como a ponte é obtida — o detalhe que importa

| Método | Como |
|---|---|
| **Site** | `bridges.torproject.org` — acesso direto |
| **E-mail** | Endereço do projeto, resposta automática |
| **Bot Telegram** | Canal distribuído |
| **`snowflake`** | Extensão no browser — ponte efêmera |
| **Distribuição em grupo** | Compartilhada entre quem já tem |

⚠ **O primeiro método é o mais frágil sob censura**, e é o único que o material recomenda testar
em laboratório. **Os outros existem porque o canal de distribuição é o que censores bloqueiam
primeiro** — e é por isso que o Tor Project diversificou.

---

## 10.4 LAB — Meça o que a ofuscação faz (e o que não faz)

**Duração:** 120 min

⚠ **Tudo local. Você configura a sua própria instância e analisa a sua própria captura.** Nenhum
ataque a rede, nenhuma tentativa de contornar política de terceiro.

### Passo 1 — Baseline: Tor sem ofuscação (30 min)

```bash
mkdir -p ~/anon-lab/lab10 && cd ~/anon-lab/lab10

# Capture o tráfego Tor normal (você é o sujeito)
sudo tcpdump -i any -nn -s 0 -w normal.pcap '(tcp port 9001 or tcp port 443 or tcp port 9030)' &
TPID=$!
sleep 1

curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null https://check.torproject.org/
sleep 3
kill $TPID 2>/dev/null

# Analise o que um observador veria
echo "=== DESTINOS ==="
tshark -r normal.pcap -T fields -e ip.dst 2>/dev/null | sort -u | head -10
echo
echo "=== PORTAS ==="
tshark -r normal.pcap -T fields -e tcp.dstport 2>/dev/null | sort -n | uniq -c | sort -rn | head
echo
echo "=== TAMANHOS DE PACOTE ==="
tshark -r normal.pcap -T fields -e frame.len 2>/dev/null | \
  awk '{ if ($1<600) a++; else b++ } END {print "  < 600 bytes:", a; print "  >= 600 bytes:", b}'
echo
echo "=== PRIMEIROS BYTES DO PAYLOAD (assinatura do handshake) ==="
tcpdump -r normal.pcap -nn -X 2>/dev/null | head -25
```

Produza `baseline-tor.md`:

| Sinal observável | Valor |
|---|---|
| Destinos | |
| Portas de destino | |
| Distribuição de tamanho de pacote | |
| **Células de 514 bytes?** | |
| Padrão do primeiro payload | |

**Responda:**

1. Quantos pacotes têm exatamente **514 bytes**? **Por que esse número?** (Módulo 6 §6.1.)
2. Um observador de rede consegue dizer **"isto é Tor"** olhando só isso? Como?
3. Qual sinal é o **mais decisivo** — a porta, o destino, ou o tamanho?

⚠ **A resposta 3 é a chave do módulo.** O tamanho fixo de célula é a assinatura mais forte, e é
uma **decisão de privacidade** que também é **identificador**. Todo trade-off tem os dois lados.

### Passo 2 — Ativar transporte ofuscado e re-medir (40 min)

⚠ **Para este passo você precisa de uma ponte.** Se você não quiser solicitar, **pule para o Passo
3** — o módulo funciona com a análise conceitual.

```bash
# Instale o obfs4proxy (já incluído na instalação do curso)
which obfs4proxy && echo "obfs4proxy disponível" || sudo apt install -y obfs4proxy

# Se você obteve uma ponte obfs4, ela tem este formato:
#   obfs4 192.0.2.1:443 FINGERPRINT cert=... iat-mode=0
#
# Configure no torrc:
cat <<'EOF'
# Exemplo — substitua pela SUA ponte e NÃO use endereço de exemplo
# UseBridges 1
# Bridge obfs4 <IP>:<PORTA> <FINGERPRINT> cert=<CERT> iat-mode=0
# ClientTransportPlugin obfs4 exec /usr/bin/obfs4proxy
EOF
```

⚠ **Não use endereço de exemplo nem ponte alheia.** Se você não tem ponte, faça o **Passo 3** e
analise o comportamento conceitualmente — o módulo não exige uma.

**Se você conectou com ofuscação, re-meça:**

```bash
sudo tcpdump -i any -nn -s 0 -w ofuscado.pcap '(tcp and not port 9050 and not port 9051)' &
TPID=$!
sleep 1
curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null https://check.torproject.org/
sleep 3
kill $TPID 2>/dev/null

echo "=== DISTRIBUIÇÃO DE TAMANHO (com ofuscação) ==="
tshark -r ofuscado.pcap -T fields -e frame.len 2>/dev/null | \
  sort -n | uniq -c | sort -rn | head -10

echo
echo "=== Ainda há células de 514 bytes? ==="
tshark -r ofuscado.pcap -T fields -e frame.len 2>/dev/null | grep -c '^514$' || echo "0"
```

Produza `ofuscacao.md`:

| Sinal | Tor normal | Tor com ofuscação | Mudou? |
|---|---|---|---|
| Padrão do handshake | | | |
| Tamanho de pacote | | | |
| Células de 514 bytes | | | |
| Porta de destino | | | |
| Detecção por DPI | | | |

**Responda:**

1. A assinatura do handshake **desapareceu**? O que apareceu no lugar?
2. Os pacotes de 514 bytes **ainda existem**? **Por que sim ou por que não?**
3. **A sua privacidade melhorou?** Explique em termos de **quem sabe o quê**:

| Parte | Sem ponte | Com ponte |
|---|---|---|
| Quem sabe seu IP | | |
| Quem sabe seu destino | | |
| Quantidade de terceiros | | |

⚠ **A resposta 3 é o resumo do módulo.** A ponte **adiciona** um terceiro que vê seu IP — e
remove o conhecimento da lista de relays. É troca, não ganho puro.

### Passo 3 — O que a ofuscação não resolve (25 min)

Sem ponte, análise conceitual. Responda por escrito em `nao-resolve.md`:

| Pergunta | Resposta | Por quê |
|---|---|---|
| A ofuscação esconde que **você** usa Tor? | | |
| A ofuscação esconde **o que** você faz? | | |
| A ofuscação esconde o seu **IP da ponte**? | | |
| A ofuscação aumenta a sua **anonymity set**? | | |
| A ofuscação resolve **correlação de fluxo**? | | |
| A ofuscação resolve **fingerprint**? | | |

**Responda:**

1. Complete: "pluggable transport resolve ____ , e não resolve ____."
2. Qual das seis perguntas é a que mais gente erra? Por quê?
3. Se o seu adversário é A5 (vigilância em escala), a ponte **piora** ou **melhora** a sua
   situação? Justifique. (Dica: a ponte é um ponto a mais para observar.)

⚠ **A resposta 3 é contraintuitiva e é honesta:** contra A5, adicionar uma ponte **adiciona
superfície**. Ela troca um conjunto grande de relays conhecidos por um ponto que **vê seu IP
diretamente**. Depende do que o adversário observa — e é por isso que a modelagem de ameaça
(Módulo 1) precede qualquer escolha de ferramenta.

### Passo 4 — A decisão da rede (25 min)

⚠ **Agora a perspectiva do administrador.** Você decide o que fazer com Tor na **sua** rede.

Produza `decisao-rede.md`:

| Opção | Vantagem | Desvantagem | Custo | Que usuário legítimo eu prejudico |
|---|---|---|---|---|
| Bloquear por IP | | | | |
| Bloquear por DPI | | | | |
| Não bloquear, monitorar | | | | |
| Política clara + exceção aprovada | | | | |

**Responda:**

1. **Quem, numa organização, legitimamente usa Tor?** Liste pelo menos três casos.
2. Se você bloqueia por IP, **quem você bloqueia junto** sem querer?
3. **Qual é a diferença entre política e impedimento técnico?** Qual funciona melhor?
4. **Quem decide** o que fazer com Tor na sua rede? Você, ou o jurídico, ou a gestão?
5. Onde a sua resposta ao Tor vira, tecnicamente, **capacidade de censura**?

⚠ **A resposta 5 é importante e honesta.** A engrenagem de DPI é a mesma em corporação e em
regime censório. Reconhecer isso não impede a decisão — mas a torna **consciente**, que é o
mínimo que uma organização deve a si mesma.

### Critérios de aceitação

- `baseline-tor.md` com a contagem de células de 514 bytes e o sinal **mais decisivo** identificado.
- `ofuscacao.md` comparando os dois casos, com a resposta sobre **quem sabe o quê**.
- Você respondeu que a ponte **adiciona** um terceiro que vê seu IP.
- `nao-resolve.md` com as seis perguntas respondidas.
- Você completou a frase "pluggable transport resolve __, e não resolve __".
- `decisao-rede.md` com os três usuários legítimos de Tor listados.
- Você identificou onde a resposta ao Tor vira capacidade de censura.
- Nenhuma ponte alheia foi usada; nenhuma tentativa de contornar política de terceiro.

---

## Avaliação

1. Distinga bloqueio total, filtragem por lista e bloqueio por protocolo.
2. Por que bloqueio por IP é frágil? Cite três mudanças que o tornam inútil.
3. O que é uma ponte e por que ela escapa do bloqueio por lista?
4. Por que todo sinal de reconhecimento de Tor tem falso positivo?
5. Qual o sinal mais decisivo de Tor num tráfego não ofuscado, e por que ele é também uma
   decisão de privacidade?
6. Explique `obfs4`, `meek` e `snowflake` em uma frase cada.
7. **Complete: pluggable transport resolve ____, não resolve ____.** Explique as duas.
8. O que a ponte resolve em termos de **acesso**? E o que ela faz em termos de **anonimato**?
9. Quem passa a ver seu IP quando você usa ponte? Isso é melhor ou pior que a lista de relays?
10. Contra adversário A5, a ponte piora ou melhora a situação? Justifique com o que o adversário
    observa.
11. Por que a engrenagem de bloqueio de Tor é a mesma de censura? O que uma organização deve
    fazer com esse reconhecimento?
12. Quem, numa organização, legitimamente usa Tor? Cite três casos e o que cada um perde se você
    bloquear.
13. O que funciona melhor: política ou impedimento técnico? Por quê?

---

**Próximo:** [Módulo 11 — A ferramenta certa para cada adversário](modulo-11.md)
