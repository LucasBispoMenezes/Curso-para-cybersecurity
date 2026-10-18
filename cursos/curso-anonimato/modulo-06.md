# Módulo 6 — Tor por dentro II: Célula, Stream e Rendes-vous

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulo 5

---

## Objetivos

1. Ler a anatomia de uma célula Tor: fixa, variável, de controle, de relay.
2. Explicar stream multiplexado sobre circuito e por que isso importa para privacidade.
3. Descrever o rendes-vous de um serviço oculto v3, passo a passo.
4. Construir um **serviço oculto próprio** e explicar o que ele revela e o que esconde.
5. Entender por que o endereço `.onion` é a chave pública, e o que isso significa.

---

## ⚠ Conduta

Você vai criar um **serviço oculto próprio, local, didático**. É seu, o conteúdo é seu, e ele não
serve a nenhum propósito além do estudo.

⚠ **A linha:** entender rendes-vous é o que permite proteger quem o usa. **Operar serviço oculto
ilegal é crime, e o material não orienta.** Nenhum exercício aponta para serviço de terceiro.
Você não acessa `.onion` de outra pessoa neste curso — só o seu.

---

## 6.1 A célula — a unidade de transporte do Tor

Tudo no Tor trafega em **células**. Entender a célula é entender o protocolo.

### Célula de tamanho fixo (circuito estabelecido)

```
┌──────────────────┬─────────────────────────────┐
│ CircID (4 bytes) │ Command (1 byte)            │
├──────────────────┴─────────────────────────────┤
│                                                  │
│              Payload (509 bytes)                 │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
   Total: 514 bytes, FIXO
```

⚠ **O tamanho fixo é uma decisão de privacidade, não de eficiência.** Com todas as células do
mesmo tamanho, um observador de rede **não consegue distinguir** uma célula que carrega dado de
uma que carrega comando — só pelo tamanho. Isso é a defesa contra análise de tamanho, e é a razão
pela qual o Tor é "caro" em banda.

### Células variáveis (só para handshake)

Durante o handshake, as células têm tamanho variável — mas depois do circuito estabelecido, tudo
é fixo. É o mesmo princípio: **depois do handshake, nada revela o que vai dentro.**

### Os comandos principais

| Categoria | Comando | Função |
|---|---|---|
| **Controle** | `CREATE` / `CREATED` | Abre salto |
| | `EXTEND` / `EXTENDED` | Estende o circuito |
| | `DESTROY` | Fecha o circuito |
| **Relay** | `RELAY` | Carrega dado ou comando de relay |
| | `RELAY_EARLY` | Relay durante handshake |
| **Fluxo** | `BEGIN` | Abre um stream |
| | `DATA` | Dado do stream |
| | `END` | Fecha o stream |
| | `CONNECTED` | Stream conectado |
| **Controle de fluxo** | `SENDME` | Confirmação de janela |

⚠ **A separação "célula de controle vs. célula de relay" é a arquitetura.** Controle fala com o
relay; relay carrega o que o **cliente** quer — e o relay só vê o conteúdo depois de decifrar a
camada dele. Um `RELAY` que não pode ser decifrado é encaminhado **sem ser lido**.

### Digests e integridade

Células de relay carregam **digest de reconhecimento** e **hash de integridade**, calculados com a
chave do salto. Se a célula foi modificada no caminho, o relay **detecta e derruba o circuito**.

⚠ **Isso significa que um relay no meio não consegue alterar o conteúdo sem ser detectado.**
Ele pode **observar** e pode **descartar** — mas não pode **modificar** silenciosamente. Integridade
é garantida; confidencialidade é garantida; disponibilidade **não é**.

---

## 6.2 Stream: multiplexação sobre circuito

Um circuito carrega vários **streams** — uma conexão TCP cada.

```
                    CIRCUITO (guarda → meio → saída)
                    ═══════════════════════════════
   Stream 1 (TCP) ──┤                              ├──▶ destino A
   Stream 2 (TCP) ──┤       multiplexados          ├──▶ destino A
   Stream 3 (TCP) ──┤       na mesma célula        ├──▶ destino B
   Stream 4 (TCP) ──┤                              ├──▶ destino C
                    ═══════════════════════════════
```

| Aspecto | Consequência |
|---|---|
| Vários streams por circuito | Eficiência: um circuito serve várias conexões |
| Streams de **destinos diferentes** no mesmo circuito | ⚠ **A saída correlaciona os destinos** |
| Stream ID é local ao circuito | O relay não sabe a relação entre streams |
| `SENDME` controla janela | Evita que um stream monopolize o circuito |

⚠ **A linha 2 é o risco de privacidade que o Tor Browser resolve por *circuit isolation*.** Se você
abre dois sites no mesmo circuito, a saída vê os dois **e sabe que é o mesmo usuário**. O Tor
Browser separa por contexto (first-party), criando circuito diferente para cada site — ao custo de
mais circuitos e mais latência.

**A regra prática:** *um circuito, um destino.* Se tudo o que você faz no Tor passa pelo mesmo
circuito, você entregou a correlação ao relay de saída.

---

## 6.3 Rendezvous — o serviço oculto

Aqui está a parte mais elegante do Tor: **como duas partes se encontram sem que nenhuma delas
revele a outra onde está**.

```
FASE 1 — O SERVIÇO SE PREPARA (antes de qualquer cliente)
┌─────────────────────────────────────────────────────────────────────┐
│ Serviço escolhe 3 INTRODUCTION POINTS (IP) e publica um descriptor   │
│ no DIRECTORY AUTHORITY, assinado — sem revelar seu IP                │
└─────────────────────────────────────────────────────────────────────┘

FASE 2 — O CLIENTE QUER CONECTAR
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Cliente pega o descriptor no diretório (pelo endereço .onion)     │
│ 2. Cliente constrói circuito até um RENDEZVOUS POINT                 │
│ 3. Cliente monta um "convite" com o rendezvous point + segredo       │
│    e envia para um INTRODUCTION POINT do serviço                     │
└─────────────────────────────────────────────────────────────────────┘

FASE 3 — O SERVIÇO ACEITA
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Serviço recebe o convite (no IP), e constrói circuito até         │
│    o RENDEZVOUS POINT indicado                                       │
│ 5. Serviço envia um RENDEZVOUS1 com o segredo                        │
│ 6. Rendezvous point liga os dois circuitos                           │
└─────────────────────────────────────────────────────────────────────┘

FASE 4 — ENCONTRO
┌─────────────────────────────────────────────────────────────────────┐
│ 7. Cliente e serviço estão conectados pelo RENDEZVOUS POINT          │
│    ⚠ NENHUM dos dois conhece o IP do outro                           │
│    ⚠ O RENDEZVOUS POINT conhece os dois circuitos, não as identidades│
└─────────────────────────────────────────────────────────────────────┘
```

⚠ **A genialidade do rendes-vous é que nem o cliente nem o serviço revelam localização.** O
cliente não sabe onde o serviço está (só o `.onion`); o serviço não sabe quem é o cliente (só que
alguém chegou pelo rendezvous point).

| Elemento | Sabe | **Não sabe** |
|---|---|---|
| Introduction Point | Que o serviço está ativo | Onde o serviço está |
| Rendezvous Point | Que dois circuitos se ligaram | Quem são as partes |
| Cliente | O endereço `.onion` | O IP do serviço |
| Serviço | Que alguém conectou | O IP do cliente |

⚠ **Isso significa que o serviço oculto protege os dois lados.** Não é só "esconder o servidor";
é **esconder o cliente também** — e é por isso que serviços `.onion` são usados por quem precisa
**de** anonimato, não só por quem precisa **oferecer** algo.

---

## 6.4 O endereço `.onion` é a chave pública

Esta é a parte mais elegante e a mais mal-entendida.

```
v3 onion address:
   exemploexemploexemploexemploexemploexemploexemploexemplo.onion
   └─────────────── 56 caracteres, base32 ──────────────┘
   └─ decodifica para: chave pública Ed25519 (32 bytes) + checksum + versão
```

| Propriedade | Consequência |
|---|---|
| Endereço **é** a chave pública | Só quem tem a chave privada pode **responder** por aquele nome |
| Verificação é local | O cliente verifica a assinatura do descriptor — **não precisa de CA** |
| Não há registro | Não existe "dono" de `.onion`; o endereço é derivado da chave |
| Não é revogável | Se a chave vaza, quem tem a chave controla o endereço. **Não há "reset"** |
| Imutável | O endereço não muda; a chave privada é o ativo |

⚠ **A consequência prática mais importante:** um `.onion` não é um domínio. Não há autoridade que
emita, revogue ou transfira. **Não existe CA para `.onion`** — a criptografia substitui a
autoridade. É por isso que o endereço é longo e ilegível: ele **é** a chave.

⚠ **E por isso um `.onion` vazado é diferente de um domínio vazado.** Se a chave privada do
serviço vaza, o endereço **inteiro** é comprometido, sem possibilidade de rotação — e a única
saída é criar um serviço novo, com endereço novo, e perder a reputação do antigo.

---

## 6.5 LAB — Seu serviço oculto, e a leitura do encontro

**Duração:** 130 min

⚠ **O serviço é seu, o conteúdo é seu, e ele serve só ao estudo.** Não publique nada além do
laboratório, não aponte para nada de terceiro.

### Passo 1 — Suba um serviço oculto local (30 min)

```bash
mkdir -p ~/anon-lab/lab6/servico && cd ~/anon-lab/lab6/servico

# Conteúdo didático do seu serviço
echo "Servico de laboratorio do curso de anonimato" > index.html
echo "Se voce le isso por um circuito Tor, o rendes-vous funcionou." >> index.html

# Servidor web local
python3 -m http.server 8080 --bind 127.0.0.1 &
SRV=$!
sleep 1
curl -s http://127.0.0.1:8080/ | head -2

# Configure o serviço oculto no torrc
sudo tee -a /etc/tor/torrc > /dev/null <<'EOF'

### Laboratório do curso de anonimato — serviço oculto local
HiddenServiceDir /var/lib/tor/lab-onion/
HiddenServicePort 80 127.0.0.1:8080
EOF

sudo systemctl restart tor
sleep 10

# O endereço .onion do SEU serviço
sudo cat /var/lib/tor/lab-onion/hostname
```

### Passo 2 — Acesse o seu próprio serviço (25 min)

⚠ **Você acessa o seu próprio serviço.** Nenhum `.onion` de terceiro.

```bash
MINHA_ONION=$(sudo cat /var/lib/tor/lab-onion/hostname)
echo "Meu serviço: ${MINHA_ONION}"

# Acesse pelo circuito Tor
curl -s --socks5-hostname 127.0.0.1:9050 "http://${MINHA_ONION}/" | head -5
```

**Responda em `servico.md`:**

1. O conteúdo apareceu? **O que isso prova sobre o rendes-vous?**
2. O seu serviço **sabia** de onde a conexão veio? (Verifique os logs do `http.server`.)
3. O cliente soube **onde** o serviço está fisicamente? Como você sabe?

⚠ **A resposta 2 é o ponto.** O log do `http.server` vai mostrar `127.0.0.1` — **porque o Tor
local é quem conecta**. O serviço **não vê** o IP do cliente, mesmo quando o cliente é você
mesmo na mesma máquina. Isso é o rendes-vous funcionando.

### Passo 3 — Leia o descriptor (35 min)

```bash
# O descriptor do seu serviço no diretório
sudo python3 - <<'PY'
from stem.control import Controller
from stem import CircStatus

MINHA = open("/var/lib/tor/lab-onion/hostname").read().strip()
print(f"Serviço: {MINHA}\n")

try:
    with Controller.from_port(port=9051) as c:
        c.authenticate()
        # Lista os pontos de introdução publicados
        desc = c.get_hidden_service_descriptor(MINHA.replace(".onion", ""), default=None)
        if desc:
            print("=== DESCRIPTOR ===")
            print(f"  Pontos de introdução: {len(desc.introduction_points())}")
            for ip in desc.introduction_points():
                print(f"    - {ip.address}:{ip.or_port}")
            print()
            print("OBSERVE: nenhum desses IPs é o seu serviço.")
            print("         São os INTRODUCTION POINTS — intermediários.")
        else:
            print("descriptor indisponível (pode levar alguns minutos para publicar)")
except Exception as e:
    print(f"control port indisponível: {e}")
    print("Habilite ControlPort 9051 no torrc e reinicie.")
PY
```

Produza `rendezvous.md`:

| Elemento | Valor observado |
|---|---|
| Endereço `.onion` do serviço | |
| Nº de pontos de introdução | |
| IP de algum IP (ponto de introdução) | |
| **IP real do serviço aparece?** | |
| **IP do cliente aparece no log do serviço?** | |

**Responda:**

1. Quantos pontos de introdução o seu serviço publicou?
2. **Os pontos de introdução são o seu serviço?** O que eles são?
3. Descreva as quatro fases do rendes-vous, aplicadas ao que você acabou de fazer.
4. **Que informação cada parte tem, e o que cada uma não tem?** Preencha:

| Parte | Sabe | Não sabe |
|---|---|---|
| Serviço | | |
| Ponto de introdução | | |
| Rendezvous point | | |
| Cliente | | |

### Passo 4 — O endereço é a chave (20 min)

```bash
# Decodifique o endereço .onion e veja o que ele contém
python3 - <<'PY'
import base64, hashlib

endereco = open("/var/lib/tor/lab-onion/hostname").read().strip().replace(".onion", "")
print(f"Endereço: {endereco}  ({len(endereco)} caracteres)\n")

# v3: base32 (sem padding) de 35 bytes: versão(1) + chave(32) + checksum(2)
try:
    bruto = base64.b32decode(endereco.upper() + "=" * ((8 - len(endereco) % 8) % 8))
    print(f"Bytes decodificados: {len(bruto)}")
    print(f"  versão:   0x{bruto[0]:02x}   (esperado 0x03)")
    print(f"  chave:    {bruto[1:33].hex()}")
    print(f"  checksum: {bruto[33:35].hex()}")
    # O checksum verifica o endereço
    esperado = hashlib.sha3_256(b".onion checksum" + bruto[1:33] + bytes([bruto[0]])).digest()[:2]
    print(f"  checksum esperado: {esperado.hex()}")
    print(f"  checksum válido?  {'SIM' if esperado == bruto[33:35] else 'NÃO'}")
    print()
    print("CONCLUSÃO: o endereço CONTÉM a chave pública do serviço.")
    print("Não há registro, nem CA. A criptografia substitui a autoridade.")
except Exception as e:
    print(f"erro ao decodificar: {e}")
PY
```

**Responda:**

1. Quantos bytes tem a chave no endereço? **Por que 32 bytes?**
2. O checksum foi validado localmente? **Que autoridade foi consultada?**
3. **O que acontece se a chave privada do serviço vazar?** O endereço pode ser "recuperado"?
4. Compare com um domínio: quem emite, quem revoga, quem transfere. **O que muda?**

### Passo 5 — Limpeza (obrigatória)

```bash
# Remova a configuração de laboratório
sudo sed -i '/### Laboratório do curso de anonimato/,/HiddenServicePort 80 127.0.0.1:8080/d' /etc/tor/torrc
sudo systemctl restart tor
kill $SRV 2>/dev/null

# Confirme
sudo grep -c 'HiddenServiceDir' /etc/tor/torrc || echo "0 (limpo)"
```

### Critérios de aceitação

- Um serviço oculto **seu** funcionando, acessível pelo circuito Tor.
- `servico.md` com as três respostas, incluindo o que **não** foi revelado.
- `rendezvous.md` com a tabela das quatro partes e o que cada uma sabe.
- Você identificou **ponto de introdução** e explicou por que ele não é o serviço.
- Você decodificou o endereço `.onion` e confirmou que ele **contém a chave pública**.
- Você explicou por que não há CA para `.onion`.
- Você explicou por que um `.onion` vazado não tem rotação.
- A configuração de laboratório foi **removida** ao final.
- Nenhum `.onion` de terceiro foi acessado.

---

## Avaliação

1. Desenhe a célula de tamanho fixo com os campos e tamanhos. Por que o tamanho é fixo?
2. Cite os quatro grupos de comando (controle, relay, fluxo, controle de fluxo) e um exemplo de
   cada.
3. Como o digest e o hash de integridade protegem contra relay intermediário malicioso? O que
   ele **consegue** fazer?
4. Explique multiplexação de stream. Que risco de privacidade ela cria, e o que o resolve?
5. Por que "um circuito, um destino" é a regra prática?
6. Descreva as quatro fases do rendes-vous.
7. Explique por que nem o cliente nem o serviço revelam localização.
8. O que cada parte do rendes-vous sabe e não sabe? Faça a tabela.
9. **Por que o endereço `.onion` é a chave pública?** Que consequência isso tem sobre emissão e
   revogação?
10. Por que não existe CA para `.onion`?
11. Se a chave privada do serviço vazar, o que acontece? Por que não há rotação?
12. Por que `.onion` protege o **cliente** também, e não só o servidor?

---

**Próximo:** [Módulo 7 — Anatomia do vazamento](modulo-07.md)
