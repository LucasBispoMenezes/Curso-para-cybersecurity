# Módulo 9 — Resistência a Correlação

**Carga:** 3 horas (1h15 teoria · 1h45 lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Explicar por que o ataque mais forte contra anonimato de rede **não** é quebrar cifra.
2. Descrever correlação de fluxo e ataque de confirmação, com o que cada um exige.
3. Entender por que o Tor resiste — e onde ele **não** resiste.
4. Reconhecer o `end-to-end` timing como limite estrutural.
5. Entender mixnet e atraso como resposta, e o preço que ela cobra.
6. Saber o que fazer quando o seu adversário é A5/A6 (Módulo 1).

---

## ⚠ Conduta — leia antes de tudo

Este módulo descreve **como um ataque de correlação funciona**. Ele não ensina a **executá-lo**.

| Este módulo faz | Este módulo **não** faz |
|---|---|
| Explica o princípio da correlação | Instrui a correlacionar tráfego de alguém |
| Explica o ataque de confirmação | Instrui a injetar tráfego em circuito de terceiro |
| Usa medição **local** e **própria** | Usa observação de rede de terceiro |
| Explica a defesa (atraso, mixnet) | Explica como evadir vigilância legal |

⚠ **A distinção é o sujeito:** você mede **o seu próprio** tempo de ida e volta, no **seu próprio**
circuito. Correlacionar o tráfego de outra pessoa é vigilância — e exige autoridade legal que o
material não fornece nem presume.

⚠ **Nota real:** correlação de fluxo em escala é técnica de Estado e de operadora grande, com
acesso a múltiplos pontos de observação. Nenhum laboratório doméstico a reproduz. O que este
módulo ensina é o **princípio** — para que você entenda o que o Tor garante e o que não.

---

## 9.1 O ataque que importa

Existe uma hierarquia de ataques contra o Tor. É útil na ordem de **quão realista** cada um é:

| Ataque | Exige | Realista? |
|---|---|---|
| Quebrar a cifra | Recurso computacional absurdo | **Não** |
| Comprometer um relay | Acesso à infraestrutura | Difícil, e **insuficiente** |
| Corromper o diretório | Comprometer autoridades | Muito difícil, e detectável |
| **Correlação de fluxo** | **Ver origem E destino** | **Sim — este é o ataque** |
| Comprometer o **cliente** | Malware no dispositivo, ou pressão física | **Sim, e é o mais frequente** |
| Análise de comportamento | Paciência e dado | **Sim, e não depende de criptografia** |

⚠ **Três linhas são realistas, e nenhuma delas envolve criptografia.** Isso é o achado mais
importante do módulo: **o Tor não é quebrado por matemática — é contornado por observação, por
dispositivo comprometido, ou por comportamento.**

---

## 9.2 Correlação de fluxo

O princípio, que é simples de enunciar e difícil de executar.

```
                ┌─────────────────────────────────────────────┐
                │          ADVERSÁRIO OBSERVA                 │
                │                                             │
   OBSERVA A ───┤  vê: você enviou 4.218 células             │
   (perto de    │      no padrão de tempo P                   │
    você)       │                                             │
                │                                             │
                │  vê: um serviço recebeu 4.218 células       │
   OBSERVA B ───┤      no padrão de tempo P                   │
   (perto do    │                                             │
    destino)    │  CONCLUSÃO: é o mesmo fluxo                 │
                └─────────────────────────────────────────────┘
```

**O ataque não quebra nada. Ele compara.**

| Elemento | Por que funciona |
|---|---|
| **Tamanho** | O circuito carrega um volume; o destino recebe o **mesmo** volume |
| **Tempo** | O padrão temporal de envio e recebimento se correlaciona |
| **Contagem de célula** | Células são de tamanho fixo — a **contagem** é reproduzida ponta a ponta |
| **Nada é alterado** | O adversário não precisa modificar nem interceptar. Só **ver** |

⚠ **O Tor não esconde o volume nem o tempo.** Ele esconde **quem** está se comunicando com **quem**
— para quem vê **um** ponto. Contra quem vê **dois** pontos, o volume e o timing são a assinatura.

### O que a correlação exige

| Requisito | Consequência |
|---|---|
| Observar **entrada** (perto de você) | Operadora, autoridade com acesso a operadora |
| Observar **saída** (perto do destino) | Idem — e frequentemente é **outro país** |
| Observar **ao mesmo tempo** | Coordenação entre duas observações |
| Volume de tráfego suficiente | Tráfego baixo (navegar) é difícil; tráfego alto (transferir) é fácil |
| **Descobrir qual de milhares é o seu** | O problema real: o Tor tem milhares de circuitos |

⚠ **A última linha é a razão pela qual a correlação passiva não escala bem.** Ela identifica um
fluxo **depois** de já suspeitar dele — não descobre quem você é entre milhões. É preciso
**selecionar** o alvo primeiro — e é aí que a hipótese entra.

**Isso muda a defesa:** se o adversário precisa **suspeitar** antes de correlacionar, então
**não parecer suspeito** vale mais que qualquer cifra. É o §9.5.

### O ataque de confirmação

Versão ativa da correlação, e mais eficiente contra **tráfego baixo**.

```
1. Adversário observa o alvo de entrada, e identifica período de silêncio
2. Adversário injeta tráfego (ou bloqueia, ou atrasa) no fluxo suspeito
3. Observa se o destino reage — se a página carrega mais devagar,
   se a resposta chega com atraso
4. O padrão de reação confirma o vínculo
```

⚠ **Isso é mais eficiente porque não exige observar os dois pontos o tempo todo** — exige
manipular um ponto e observar o outro. E o efeito é detectável com **menos tráfego**.

**A consequência defensiva:** o ataque de confirmação é **ativo**, e deixa rastro — latência
anômala, perda, comportamento estranho. Um circuito que fica inexplicavelmente lento pode ser
**confirmação em curso**, não problema de rede.

⚠ **O que fazer com essa suspeita:** registrar (horário, circuito, comportamento), e **mudar de
circuito**. Não há contramedida técnica melhor — e é por isso que o Tor Browser nem tenta.

---

## 9.3 Por que o Tor resiste — e onde não resiste

O Tor **não** pretende resistir a correlação global. Ele pretende tornar a correlação **cara**.

| O que o Tor faz | O que ele garante |
|---|---|
| Células de tamanho fixo | Não vaza tamanho **por célula** |
| Distribuição de guarda | Dificulta saber qual relay vigiar |
| Milhares de circuitos | Dificulta saber qual é o seu |
| Atravessar jurisdições | Dificulta observar os dois pontos |
| Circuito novo periodicamente | Encurta a janela de correlação |

⚠ **Ele **não** garante:**

| O que o Tor não esconde | Por quê |
|---|---|
| **Seu volume total** | O circuito tem o volume do seu tráfego |
| **Seu padrão de atividade** | Você está ativo às 3h, e o circuito está ativo às 3h |
| **A duração da sua sessão** | Circuito aberto por 6h é visível |
| **O timing** | End-to-end timing é informação preservada |
| **O dispositivo** | Comprometimento do cliente derrota o Tor por completo |

⚠ **A frase que resume o modelo de segurança do Tor:**

> **O Tor foi projetado contra um adversário que vê a rede em parte. Contra um adversário que vê a
> rede inteira, ele reduz o custo do ataque — não o elimina.**

E a última linha da tabela anterior é a mais dura: **se o adversário tem o seu dispositivo, o Tor
não ajuda.** Nenhum protocolo de rede sobrevive a um cliente comprometido. É o limite estrutural.

---

## 9.4 Mixnet — quando você precisa de mais

Se o seu adversário é **A5 (vigilância de rede em escala)**, o Tor tem limite. A resposta é a
**mixnet**.

| | Tor | Mixnet |
|---|---|---|
| Unidade de tempo | **Milissegundos** (baixa latência) | **Minutos a horas** (alta latência) |
| Embaralhamento | Por circuito, ordem preservada | **Mistura entre fluxos**, ordem destruída |
| Resistência a correlação | **Parcial** | **Forte** |
| Uso | Navegação, comunicação | **E-mail, mensagem assíncrona** |
| Preço | Latência moderada | **Latência alta** |
| Implementação | Tor | **Nym**, **Loopix**, mixnets acadêmicas |

⚠ **O preço da mixnet é a latência, e é o motivo pelo qual ela não substitui o Tor.** Ninguém
navega na web com 5 minutos por requisição.

**O princípio da mixnet:** em vez de encaminhar o **seu** pacote imediatamente, o nó **acumula
pacotes** de vários usuários, **embaralha**, e reenvia. Como o timing é destruído, a correlação
por tempo **deixa de funcionar**.

| Cenário | Ferramenta |
|---|---|
| Preciso navegar com anonimato | **Tor** |
| Preciso trocar mensagem assíncrona sob vigilância em escala | **Mixnet** |
| Preciso de tempo real sob adversário A5 | **Problema em aberto** — há perda |

⚠ **A última linha é honesta e é o mais importante do módulo.** Não existe solução para baixa
latência com resistência forte a correlação global. **É limitação fundamental, não de software.**

**O que fazer, na prática:** escolher o **tipo de comunicação** conforme o adversário.

| Se o adversário é... | Anonimato de rede basta? |
|---|---|
| A1 — Oportunista | Sim, sobra |
| A2 — Rastreador comercial | Sim; fingerprint (Módulo 8) importa mais |
| A3 — Provedor | Sim, com Tor bem configurado |
| A4 — Operador local | Sim, com Tor bem configurado |
| **A5 — Vigilância em escala** | **Parcialmente.** Tor + mixnet para assíncrono; baixa latência fica exposta |
| **A6 — Alcance físico** | **Não.** O dispositivo precisa estar limpo, e há limite humano |

---

## 9.5 A defesa que a cifra não dá

Se correlação depende de **selecionar** o alvo, então a defesa mais forte é **não ser selecionado**.

| Prática | O que ela evita |
|---|---|
| **Usar sempre, não só quando importa** | Você não se destaca por usar Tor |
| **Não variar o comportamento** | Horário, volume, duração constantes |
| **Não usar Tor só para o sensível** | O único usuário de Tor da rede é óbvio |
| **Distribuir uso ao longo do tempo** | Sessão de 6h às 3h é padrão |
| **Separar identidade por compartimento** | Um aparelho, uma conta, uma pessoa |
| **Não misturar a fonte com a publicação** | Circuito e aparelho diferentes |

⚠ **A primeira linha é a mais importante e a mais contraintuitiva:** usar Tor **o tempo todo**, e
não só quando a comunicação é sensível, faz você **menos** visível — porque você não é o único
circuito estranho.

**A segunda mais importante:** o **horário** e o **volume** denunciam. Um circuito que só existe às
03h de terça, com 4 MB, é mais identificável que um circuito ativo o dia inteiro.

⚠ **A "anonymity set" é o conceito que resume isto.** Você é anônimo na medida em que **se parece
com muitos outros**. Cada coisa que te torna único — horário, volume, dispositivo, extensão,
estilo — reduz o conjunto em que você se esconde. É a mesma conclusão do Módulo 8, aplicada a
tráfego em vez de a browser.

---

## 9.6 LAB — Meça o que a correlação usaria

**Duração:** 105 min

⚠ **Você mede o SEU próprio circuito.** Nenhuma observação de terceiro, nenhum circuito alheio,
nenhuma injeção em tráfego que não seja o seu.

### Passo 1 — O que o seu circuito revela (35 min)

⚠ **Você captura a sua própria interface.** O que você está vendo é o que **um observador na sua
rede** veria.

```bash
mkdir -p ~/anon-lab/lab9 && cd ~/anon-lab/lab9

# Capture TODO o tráfego para relays Tor (você é o sujeito)
sudo tcpdump -i any -nn -s 0 -w meu-tor.pcap 'tcp portrange 9001-9999 or tcp port 443' &
TPID=$!
sleep 1

# Gere tráfego de tamanhos diferentes
echo "=== download pequeno ==="
curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null https://example.com
sleep 2

echo "=== download médio ==="
curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null https://www.gnu.org/licenses/gpl-3.0.txt
sleep 3

echo "=== download grande ==="
curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null \
  https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.1.tar.gz 2>/dev/null || \
  curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null https://www.gnu.org/licenses/gpl-3.0.txt
sleep 4

kill $TPID 2>/dev/null
```

**Analise o volume e o tempo:**

```bash
# Volume total por destino, e distribuição no tempo
tshark -r meu-tor.pcap -q -z conv,tcp 2>/dev/null | head -20

# Série temporal de bytes por segundo
tshark -r meu-tor.pcap -T fields -e frame.time_relative -e frame.len 2>/dev/null | \
python3 -c "
import sys, collections
buckets = collections.defaultdict(int)
for l in sys.stdin:
    p = l.rstrip().split('\t')
    if len(p) < 2: continue
    try:
        t = float(p[0]); n = int(p[1])
    except ValueError: continue
    buckets[int(t)] += n
if buckets:
    tmax = max(buckets)
    print(f'{'segundo':>8} {'bytes':>10}  gráfico')
    for t in range(0, min(tmax + 1, 40)):
        n = buckets.get(t, 0)
        barra = '#' * min(60, n // 500)
        print(f'{t:>8} {n:>10}  {barra}')
"
```

Produva `volume.md`:

| Requisição | Bytes enviados | Bytes recebidos | Duração | Segundos ativos |
|---|---|---|---|---|
| Pequena | | | | |
| Média | | | | |
| Grande | | | | |

**Responda:**

1. **Um observador na sua rede consegue distinguir qual requisição foi pequena e qual foi grande?**
   Como?
2. O **tamanho** do download aparece no fio, mesmo com cifra e circuito? Por quê?
3. Qual o **período de atividade** observável? Quantos segundos de silêncio, e quantos de tráfego?
4. **Se esse padrão fosse repetido todos os dias no mesmo horário**, o que ele revelaria?

⚠ **A resposta 4 é a demonstração da correlação:** o atacante não precisa decifrar nada. Ele
precisa do **padrão**, e o padrão é visível.

### Passo 2 — Timing: o que sobrevive ao circuito (30 min)

```bash
# Meça o tempo de ida e volta do SEU circuito (para o serviço de diagnóstico)
echo "=== RTT direto x RTT pelo circuito ==="
for i in 1 2 3; do
    echo -n "direto:   "; curl -s -o /dev/null -w '%{time_total}s\n' --max-time 10 https://check.torproject.org/
done
echo
for i in 1 2 3; do
    echo -n "via Tor:  "; curl -s --socks5-hostname 127.0.0.1:9050 \
        -o /dev/null -w '%{time_total}s\n' --max-time 30 https://check.torproject.org/
done
```

Produza `timing.md`:

| Medição | Direto | Via circuito | Diferença |
|---|---|---|---|
| Tentativa 1 | | | |
| Tentativa 2 | | | |
| Tentativa 3 | | | |
| **Média** | | | |

**Responda:**

1. Qual a latência adicionada pelo circuito? **Quantos saltos ela representa?**
2. Essa latência é **constante**? Por que não?
3. **O timing de ida e volta dá informação a quem observa?** Qual?
4. Se um atacante pudesse **medir as duas pontas**, o que a diferença de tempo revelaria?

### Passo 3 — O que a sua atividade diz de você (25 min)

Sem ferramenta, sobre você:

| Elemento | Seu padrão | Quão identificável |
|---|---|---|
| Horário típico de uso | | |
| Dias da semana | | |
| Duração média de sessão | | |
| Volume típico | | |
| Frequência (mensagens/dia) | | |
| Comportamento antes e depois de usar Tor | | |

**Responda:**

1. Se alguém observasse a sua rede por 30 dias, **que padrão identificaria você?**
2. **Usar Tor só para o sensível te torna mais ou menos visível?** Por quê?
3. Se você **usasse Tor o tempo todo**, quantos circuitos existiriam na sua rede? O que isso faz
   com a sua anonymity set?
4. Você consegue manter uso constante? **Se não, o que isso significa para o seu modelo?**

### Passo 4 — O relatório de resistência (15 min)

Produza `relatorio-correlacao.md`:

```markdown
# Resistência a Correlação — Autoavaliação

## 1. O que o meu circuito revela a um observador local
(volume, tempo, duração, horário — com as medições)

## 2. O que sobrevive ao circuito
(timing end-to-end, volume total, padrão de atividade)

## 3. O que um adversário precisaria para me correlacionar
[ ] Observar perto de mim
[ ] Observar perto do destino
[ ] Selecionar o meu fluxo entre os outros
[ ] As três coisas ao mesmo tempo

## 4. Qual é o adversário que isto NÃO protege
(do meu modelo do Módulo 1)

## 5. O que eu mudo no comportamento
(três alterações concretas que eu adoto)

## 6. Limitações
- Não medi as duas pontas (não é possível legitimamente)
- Não testei ataque ativo (é vigilância, fora do escopo)
- O padrão medido é de uma sessão, não de 30 dias
- Não consigo avaliar adversário A6 (alcance físico)
```

### Critérios de aceitação

- `volume.md` com as três requisições medidas, e a resposta sobre se o tamanho é distinguível.
- Você **provou na captura** que o volume aparece no fio apesar da cifra.
- `timing.md` com a latência do circuito medida **três vezes** e a média.
- Você respondeu o que o timing revela a quem observa as duas pontas.
- A tabela do Passo 3 preenchida **sobre você**, com o horário que você realmente usa.
- Você respondeu se usar Tor só para o sensível te torna **mais** visível — e por quê.
- `relatorio-correlacao.md` com as seis seções e a **seção de limitações**.
- Você nomeou o adversário (do Módulo 1) contra o qual isto **não** protege.
- Nenhuma observação de terceiro. Nenhuma injeção em tráfego alheio.

---

## Avaliação

1. Por que o ataque mais forte contra anonimato de rede **não** é quebrar cifra?
2. Cite os três ataques realistas e explique por que os três contornam a criptografia.
3. Descreva correlação de fluxo. O que o adversário precisa observar?
4. Por que o tamanho da célula ser fixo **não** esconde o volume total?
5. Qual é a **dificuldade real** da correlação passiva? O que isso implica para a defesa?
6. Descreva ataque de confirmação em quatro passos. Por que ele é mais eficiente contra tráfego baixo?
7. Por que a confirmação é **ativa** e deixa rastro? O que fazer com essa suspeita?
8. Enuncie o modelo de segurança do Tor em uma frase, com o que ele cobre e o que não cobre.
9. Por que um dispositivo comprometido **anula** o Tor? É falha do protocolo?
10. Compare Tor e mixnet em latência, embaralhamento e uso.
11. Por que mixnet não substitui o Tor na navegação?
12. Existe solução para baixa latência com resistência forte a correlação global? O que isso diz
    sobre comunicação em tempo real sob adversário A5?
13. Por que usar Tor **o tempo todo** te torna mais anônimo, e não menos?
14. O que é "anonymity set"? Como o horário e o volume a reduzem?
15. Por que o que a cifra não protege — comportamento — é a defesa que mais importa?

---

**Próximo:** [Módulo 10 — Tor em ambiente corporativo](modulo-10.md)
