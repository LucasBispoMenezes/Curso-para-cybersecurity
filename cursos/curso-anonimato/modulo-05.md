# Módulo 5 — Tor por dentro I: Diretório e Circuito

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Explicar o problema que o Tor resolve e por que ele existe (onion routing).
2. Descrever o consenso de diretório: como o cliente descobre os relays.
3. Distinguir os papéis de relay: guarda, meio, saída, ponte.
4. Construir e inspecionar um circuito **próprio**, lendo o consenso com `stem`.
5. Ler, em captura própria, o handshake de um circuito Tor.

---

## ⚠ Conduta

Nos módulos 5 a 9 você se conecta **à rede Tor real** — isso é uso legítimo e legal. A análise é
sempre do **seu** tráfego.

⚠ **A linha deste módulo:** entender circuito é o que permite proteger. Usar conhecimento de
circuito para **identificar usuário de Tor** é desanonimização — a antítese do que o Tor existe
para fazer, e não está neste curso.

⚠ **Relay de saída:** não é necessário para este curso, e o Módulo 10 explica por quê.

---

## 5.1 O problema: roteamento em cima de roteamento

O Tor foi projetado em 2004 (Dingledine, Mathewson, Syverson) para resolver um problema
específico: **rotear tráfego sem que nenhum ponto único saiba origem e destino ao mesmo tempo.**

| Abordagem | Problema |
|---|---|
| Proxy único | O proxy sabe tudo. Confiança total e única |
| Cadeia de proxies simples | Cada proxy sabe, e a cadeia é frágil |
| **Onion routing** | Cifra **em camadas** — cada salto sabe só o próximo |

**A ideia central, em uma imagem:**

```
     ┌──────────────────────────────────────────────────┐
     │  Cifrado com a chave do salto 3                  │
     │  ┌────────────────────────────────────────────┐  │
     │  │  Cifrado com a chave do salto 2            │  │
     │  │  ┌──────────────────────────────────────┐  │  │
     │  │  │  Cifrado com a chave do salto 1      │  │  │
     │  │  │  ┌────────────────────────────────┐  │  │  │
     │  │  │  │     DADOS (TLS até o destino)  │  │  │  │
     │  │  │  └────────────────────────────────┘  │  │  │
     │  │  └──────────────────────────────────────┘  │  │
     │  └────────────────────────────────────────────┘  │
     └──────────────────────────────────────────────────┘

     Salto 1 abre a camada 1 → vê "entregue ao salto 2"
     Salto 2 abre a camada 2 → vê "entregue ao salto 3"
     Salto 3 abre a camada 3 → vê o destino, e o IP de origem é o do salto 2
```

⚠ **Cada relay conhece apenas o salto anterior e o próximo.** Nenhum deles — nem todos juntos em
condições normais — conhece origem **e** destino associados.

| Relay | Sabe que você... | Sabe que o destino é... |
|---|---|---|
| **Guarda** (1º) | Sim — é o seu IP | **Não** |
| **Meio** (2º) | Não | Não |
| **Saída** (3º) | Não | **Sim** |
| O destino | Não | — |

⚠ **Este é o coração do Tor:** a informação está **particionada**. É por isso que comprometer um
relay **não** desanonimiza — e é por isso que correlação de fluxo (Módulo 9) é o ataque real.

---

## 5.2 O consenso de diretório

O cliente precisa **descobrir** quais relays existem antes de construir circuito. Ele faz isso por
**consenso** assinado pelas autoridades de diretório.

```
┌─────────────────────────────────────────────────────────────────────┐
│ 9 AUTORIDADES DE DIRETÓRIO (Tor Directory Authorities)              │
│  Coletam, votam e assinam a lista de todos os relays                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  consenso assinado (a cada ~1h)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CONSENSO — a "lista telefônica" da rede                              │
│   · Cada relay: nome, endereço, porta, identidade, chaves           │
│   · Flags: Guard, Exit, Fast, Stable, Running, Valid, BadExit       │
│   · Parâmetros: tamanho de circuito, versão mínima de protocolo     │
│   · Assinatura das autoridades — o cliente verifica antes de usar   │
└─────────────────────────────────────────────────────────────────────┘
```

### As flags que determinam seleção

| Flag | Significado | Como o cliente usa |
|---|---|---|
| **`Guard`** | Confiável e estável o bastante para 1º salto | **Guarda do circuito** |
| **`Exit`** | Permite saída para a internet | **Saída do circuito** |
| **`Fast`** | Banda suficiente | Preferido |
| **`Stable`** | Sem queda prolongada | Preferido |
| **`Running`** | Ativo agora | **Obrigatório** |
| **`Valid`** | Chave válida conforme as autoridades | **Obrigatório** |
| **`BadExit`** | Marcado como saída suspeita | **Excluído da saída** |

⚠ **A flag `BadExit` é um mecanismo de reputação.** Os relays são auditados; um relay de saída
que manipula tráfego (modifica HTML, bloqueia site) é marcado e excluído. Isso não é perfeito —
mas é defesa comunitária, mantida por voluntários, e funciona razoavelmente bem.

### Os três papéis

| Papel | O que faz | Consequência que você precisa saber |
|---|---|---|
| **Guarda** | Primeiro salto, sempre | **Estável por meses** — por projeto |
| **Meio** | Intermediário | Nunca vê origem nem destino |
| **Saída** | Último salto | **Vê o tráfego em claro** se o destino não usar TLS |
| **Ponte** | Entrada não listada | Resiste a bloqueio |

⚠ **O usuário de Tor tem entre 2 e 3 guardas, e eles mudam pouco.** Isso é **por projeto**: um
atacante que observa sua rede precisa saber qual relay vigiar — se a guarda mudasse a cada
sessão, ele vigiaria todos.

**A consequência prática:** a sua guarda conhece seu IP por **meses**. O que ela **não** sabe é
o destino. É uma relação de confiança de longo prazo com conhecimento parcial — e é isso que
mantém o modelo de pé.

---

## 5.3 Construindo o circuito — passo a passo

```
1. Cliente lê o consenso, escolhe guarda, meio, saída (regras de seleção)

2. Cliente → Guarda:      CREATE (handshake, chave do cliente)
   Guarda → Cliente:      CREATED

3. Cliente → Guarda:      EXTEND  (para o meio, cifrado PARA a guarda)
   Guarda → Meio:         CREATE    ← a guarda fala com o meio por você
   Meio → Guarda → Cliente: CREATED

4. Cliente → Guarda → Meio: EXTEND (para a saída)
   Meio → Saída:          CREATE
   Saída → ... → Cliente: CREATED

5. ───────────── CIRCUITO PRONTO ─────────────
   Cliente → [Guarda] → [Meio] → [Saída] → Destino
```

⚠ **Note o passo 3 e 4: a extensão é cifrada em camadas.** A guarda **não consegue ler** para onde
você está estendendo — ela só encaminha o pedido cifrado. Isso é o que torna o modelo funcionar.

⚠ **Cada extensão usa Diffie-Hellman** com o relay de destino. Depois de estendido, o cliente tem
uma **chave por salto** — e é com essas chaves que ele cifra cada camada.

| Nível de cifra | Quem pode abrir |
|---|---|
| Camada da saída | **Só a saída** |
| Camada do meio | Só o meio |
| Camada da guarda | Só a guarda |

---

## 5.4 LAB A — Leia o consenso com `stem`

**Duração:** 60 min

⚠ **Tudo local. Você inspeciona o consenso público e o circuito da sua própria instância.**

### Passo 1 — Conecte ao Tor e leia

```bash
mkdir -p ~/anon-lab/lab5 && cd ~/anon-lab/lab5

# Grave o consenso
sudo cat /var/lib/tor/cached-consensus 2>/dev/null | head -30 || \
  tor --list-fingerprint 2>/dev/null

# Melhor: ler via control port (mais confiável)
cat > le-consenso.py <<'PY'
#!/usr/bin/env python3
"""Lê o consenso do Tor e resume os relays — você é o sujeito, nada de terceiro."""
from stem.control import Controller
from stem import Flag

import sys

try:
    with Controller.from_port(port=9051) as c:
        c.authenticate()
        relays = list(c.get_network_statuses())
except Exception as e:
    # Fallback: ler o consenso em cache e parsear
    print(f"control port indisponível ({e}); tentando consenso em cache", file=sys.stderr)
    caminho = "/var/lib/tor/cached-consensus"
    try:
        texto = open(caminho).read()
    except PermissionError:
        sys.exit("sem permissão — rode com sudo, ou habilite o ControlPort")

    import re
    entradas = re.split(r"\nr ", texto)
    for e in entradas[1:60]:
        linhas = e.split("\n")
        nome = linhas[0].split()[0] if linhas else "?"
        flags = ""
        for l in linhas:
            if l.startswith("s "):
                flags = l[2:].strip()
                break
        print(f"{nome:<20} {flags}")
    sys.exit(0)

print(f"Total de relays no consenso: {len(relays)}\n")

contagem = {f: 0 for f in ["Guard", "Exit", "Fast", "Stable", "Running", "Valid", "BadExit"]}
for r in relays:
    for nome in contagem:
        if getattr(Flag, nome, nome) in r.flags or nome in [str(x) for x in r.flags]:
            contagem[nome] += 1

print("=== FLAGS ===")
for f, n in contagem.items():
    print(f"  {f:<10} {n:>6}")

print()
print("=== 10 GUARDAS DE EXEMPLO ===")
i = 0
for r in relays:
    if "Guard" in [str(x) for x in r.flags]:
        print(f"  {r.nickname:<20} {r.address}:{r.or_port}  banda={r.bandwidth}")
        i += 1
        if i >= 10:
            break

print()
print("=== 10 SAÍDAS DE EXEMPLO ===")
i = 0
for r in relays:
    if "Exit" in [str(x) for x in r.flags]:
        print(f"  {r.nickname:<20} {r.address}:{r.or_port}")
        i += 1
        if i >= 10:
            break
PY

# Tentativa 1: com control port (habilite no torrc se quiser)
sudo python3 le-consenso.py 2>&1 | head -60
```

⚠ **Se o control port não estiver habilitado**, o script cai no consenso em cache. Se nem isso
funcionar, inspecione o arquivo à mão:

```bash
sudo head -c 2000 /var/lib/tor/cached-consensus | tr -d '\r' | head -40
# Procure as linhas 'r <nome> <identidade> ...' e 's <flags>'
```

### Passo 2 — Analise

Produza `consenso.md`:

| Métrica | Valor |
|---|---|
| Total de relays no consenso | |
| Quantos têm `Guard` | |
| Quantos têm `Exit` | |
| Quantos têm `BadExit` | |
| Quantos têm `Running` | |
| **Fração do total que pode ser saída** | |

**Responda:**

1. **Qual a porcentagem de relays que podem ser saída?** Por que é baixa?
2. Um relay de saída vê **o quê** do seu tráfego? E a guarda?
3. Se um atacante quisesse observar seu circuito, **qual relay ele preferiria controlar** para
   saber seu IP? E para saber seu destino?
4. **O que ele precisaria controlar para saber os dois?** Por que isso é o ataque de correlação
   (Módulo 9)?

⚠ **A resposta 4 é o resumo do modelo de segurança do Tor.** Escreva-a com cuidado — é a base dos
Módulos 6 e 9.

---

## 5.5 LAB B — Leia o seu circuito

**Duração:** 60 min

### Passo 1 — Circuitos ativos

```bash
# Com nyx (monitor visual de circuito)
sudo -u debian-tor nyx 2>/dev/null || nyx 2>/dev/null || echo "nyx indisponível"

# Com stem: lista circuitos
cat > ve-circuitos.py <<'PY'
#!/usr/bin/env python3
"""Lista os SEUS circuitos Tor — sujeito é você."""
import sys
from stem import CircStatus
from stem.control import Controller

try:
    with Controller.from_port(port=9051) as c:
        c.authenticate()
        for circ in sorted(c.get_circuits(), key=lambda x: x.id):
            print(f"Circuito {circ.id}  status={circ.status}")
            for i, hop in enumerate(circ.path):
                fp = hop[0]
                nick = c.get_network_status(fp, default=None)
                nome = nick.nickname if nick else fp[:10]
                papel = ["GUARDA", "MEIO", "SAÍDA"][i] if len(circ.path) == 3 else f"salto {i+1}"
                print(f"    {papel:<8} {nome}")
            print()
except Exception as e:
    print(f"Erro: {e}", file=sys.stderr)
    print("Habilite o ControlPort em /etc/tor/torrc:")
    print("  ControlPort 9051")
    print("  CookieAuthentication 1")
    sys.exit(1)
PY

sudo python3 ve-circuitos.py
```

### Passo 2 — Gere tráfego e observe o circuito

```bash
# Em um terminal, capture na SUA interface
sudo tcpdump -i any -nn -s 0 -c 200 'tcp port 9001 or tcp port 443' -w tor-handshake.pcap &
TPID=$!
sleep 1

# Gere tráfego (Tor daemon está em 9050)
curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null https://check.torproject.org/
sleep 3
kill $TPID 2>/dev/null

# Analise: procure o tráfego para relays (porta 9001 é ORPort típica)
tcpdump -r tor-handshake.pcap -nn | head -20

# Conte conexões por porta de destino
tshark -r tor-handshake.pcap -T fields -e tcp.dstport 2>/dev/null | sort | uniq -c | sort -rn | head
```

Produza `circuito.md`:

| Elemento | Observado |
|---|---|
| Nº de circuitos ativos | |
| Guarda (1º salto) | |
| Meio (2º salto) | |
| Saída (3º salto) | |
| Porta de destino do tráfego Tor | |
| Quantas conexões para relays | |

**Responda:**

1. Quantos circuitos o seu cliente mantém **ao mesmo tempo**? **Por que mais de um?**
2. A guarda mudou entre circuitos? **Por quê não?** (Relacione ao §5.2.)
3. O tráfego para os relays foi para a **porta 9001** ou para **443**? Se viu 443, o que isso
   significa? (Dica: *bridge* e *pluggable transport*.)
4. Olhando a captura, **você consegue saber para onde o circuito vai?** Por que não?
5. **Se você controlasse a guarda**, o que você saberia? E se controlasse a saída?

### Passo 3 — O circuito muda por destino?

```bash
# Observe duas requisições e veja se usam o mesmo circuito
sudo python3 ve-circuitos.py > circ-antes.txt
curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null https://example.com
curl -s --socks5-hostname 127.0.0.1:9050 -o /dev/null https://check.torproject.org/
sudo python3 ve-circuitos.py > circ-depois.txt
diff circ-antes.txt circ-depois.txt
```

**Responda:**

1. O circuito mudou entre as duas requisições?
2. **Por que o cliente Tor reutiliza circuito em vez de construir um por conexão?**
3. Que risco de privacidade existe em reutilizar o mesmo circuito para destinos diferentes?

⚠ **A resposta 3 é importante:** dois sites diferentes alcançados pelo **mesmo** circuito estão
com a mesma guarda e a mesma saída. Um relay de saída malicioso correlaciona os dois destinos como
**do mesmo usuário**. Isso é *circuit isolation* — e é exatamente o que o Tor Browser faz ao
separar circuito por aba/first-party.

### Critérios de aceitação

- Você obteve o consenso (por control port ou por cache) e contou os relays.
- `consenso.md` com a tabela e a **fração de saídas** calculada.
- Você listou **seus** circuitos, com guarda, meio e saída identificados.
- Você capturou o handshake do Tor e identificou a porta de destino.
- Você respondeu **o que um atacante precisaria controlar** para saber origem e destino — e
  relacionou a correlação de fluxo.
- Você respondeu por que a guarda é **estável** e por que isso é por projeto.
- Você identificou o risco de reutilização de circuito.
- Nenhuma análise envolveu usuário de Tor que não seja você.

---

## Avaliação

1. Explique onion routing em uma frase. Por que "camadas" e não "cadeia simples"?
2. Quais as três informações que se deseja separar, e quem sabe cada uma?
3. Descreva o consenso de diretório. Quem assina e por que o cliente verifica?
4. Liste as sete flags principais e o papel de cada uma na seleção de circuito.
5. O que é a flag `BadExit` e qual problema ela ataca?
6. Explique por que a guarda é **estável por meses**. Que problema isso resolve?
7. Se um atacante controlasse a guarda, o que ele saberia? E se controlasse a saída?
8. **O que ele precisaria controlar para saber origem e destino? Por que isso é difícil?**
9. Descreva os cinco passos de construção de circuito.
10. Por que a extensão de circuito é cifrada em camadas? O que a guarda **não** consegue ler?
11. Por que o cliente Tor mantém vários circuitos ao mesmo tempo?
12. O que é *circuit isolation* e que risco ele resolve?
13. Se você viu tráfego Tor na porta 443 em vez de 9001, o que isso significa?

---

**Próximo:** [Módulo 6 — Tor por dentro II: célula, stream, rendes-vous](modulo-06.md)
