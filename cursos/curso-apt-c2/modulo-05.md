# Módulo 5 — Protocolo de Implant: Análise Defensiva

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Reconhecer, em captura, o **perfil** de um canal de implant — sem decifrar.
2. Distinguir mensagem de check-in, de task e de transferência por assinatura de tamanho e tempo.
3. Calcular regularidade, jitter e janela de atividade a partir de dado real.
4. Identificar o que um protocolo **revela** sobre a operação, mesmo cifrado.
5. Escrever detecção a partir de perfil, não de indicador.

---

## ⚠ A linha deste módulo

Este módulo ensina **análise**. Ele não descreve como construir um protocolo, não fornece
especificação de mensagem para implementação, e não ensina formato que sirva de base para
desenvolver.

⚠ **O que você analisa:** o **perfil de rede** — quando, quanto, com que regularidade. Isso é
observável em tráfego cifrado, e é **todo** o valor defensivo. Você não precisa do conteúdo da
mensagem para detectar um beacon; precisa do padrão.

⚠ **O kit** (`kit/`) demonstra formato de mensagem em `127.0.0.1`, com limites auditáveis. O
Módulo 4, Lab A, faz você verificar isso antes de usar.

---

## 5.1 O que você consegue ver sem decifrar

Retomando o Módulo 9 do curso de redes, aplicado a C2:

| Observável | Visível? | O que revela |
|---|---|---|
| **Destino (IP/SNI)** | Sim, em TLS 1.3 | Infraestrutura nominal |
| **Periodicidade** | Sim | Beacon: intervalo base |
| **Jitter** | Sim | Cuidado do operador com detecção |
| **Tamanho de requisição** | Sim | Check-in vs. task vs. transferência |
| **Tamanho de resposta** | Sim | "Sem trabalho" vs. comando |
| **Duração da conexão** | Sim | Sessão curta vs. longa |
| **Volume acumulado** | Sim | Perfil de coleta |
| **Horário / janela** | Sim | Fuso e rotina do operador |
| **Sequência de eventos** | Sim | Ordem das fases = cadeia |
| **Conteúdo** | **Não** | — |

⚠ **A última linha não é limitação — é irrelevância para a detecção.** Nenhuma das dez células
acima depende de ler a mensagem. **É por isso que C2 cifrado é detectável.**

---

## 5.2 Check-in, task e transferência — a assinatura de tamanho

O implante faz três coisas, e cada uma tem assinatura distinta.

```
CHECK-IN  (a cada intervalo)
  req:  200–600 bytes   ← "estou aqui", com id e metadados
  resp:  50–200 bytes   ← "nada para você" (constante!)

TASK  (quando há trabalho)
  req:  pequeno          ← "o que fazer?" ou "resultado"
  resp: MAIOR            ← o comando em si

TRANSFERÊNCIA (coleta)
  req:  GRANDE e variável  ← o dado
  resp: pequeno            ← confirmação
```

### O que essa tabela diz na prática

| Padrão observado | Leitura |
|---|---|
| Req pequena + resp pequena + regular | **Beacon puro** — só presença |
| Req pequena + resp variável | **Task** — recebendo comando |
| Req GRANDE + resp pequena, repetido | **Exfiltração** |
| Req pequena + resp GRANDE | Download de ferramenta |
| Só um evento, sem repetição | Acesso pontual, ou teste do ator |
| Eventos **só** em horário comercial | Operador humano, naquele fuso |
| Pausa de dias e retomada | Operação por campanha, não contínua |

⚠ **A linha "req pequena + resp pequena + regular" é a assinatura mais durável que existe.** Ela
não depende de protocolo, de cifra, nem de versão de ferramenta. É geometria de tráfego.

⚠ **A pausa de dias merece atenção.** Um beacon que fica 5 dias silencioso e retoma **não é um
beacon defeituoso** — é operação por tarefa, coordenada por humano. Isso muda sua estimativa de
tempo de residência.

---

## 5.3 Calculando o perfil

O analisador de perfil, com as métricas que importam.

```python
#!/usr/bin/env python3
"""
perfil-canal.py — perfil de canal a partir de um fluxo de conexões.

Entrada: TSV com  timestamp_epoch <TAB> destino <TAB> bytes_enviados <TAB> bytes_recebidos
Uso:     python3 perfil-canal.py conexoes.tsv
"""
import sys, statistics, collections

def carrega(caminho):
    por_destino = collections.defaultdict(list)
    with open(caminho) as f:
        for linha in f:
            p = linha.rstrip("\n").split("\t")
            if len(p) < 4:
                continue
            try:
                t = float(p[0]); env = int(p[2]); rec = int(p[3])
            except ValueError:
                continue
            por_destino[p[1]].append((t, env, rec))
    return por_destino

def perfil(eventos):
    eventos = sorted(eventos)
    tempos = [e[0] for e in eventos]
    envs = [e[1] for e in eventos]
    recs = [e[2] for e in eventos]

    if len(tempos) < 3:
        return None

    intervalos = [b - a for a, b in zip(tempos, tempos[1:])]
    med = statistics.mean(intervalos)
    desv = statistics.pstdev(intervalos)
    cv = desv / med if med else float("inf")

    return {
        "n": len(eventos),
        "intervalo_med": med,
        "intervalo_desv": desv,
        "cv": cv,
        "env_med": statistics.mean(envs),
        "env_desv": statistics.pstdev(envs) if len(envs) > 1 else 0,
        "rec_med": statistics.mean(recs),
        "rec_desv": statistics.pstdev(recs) if len(recs) > 1 else 0,
        "total_env": sum(envs),
        "total_rec": sum(recs),
        "primeiro": min(tempos),
        "ultimo": max(tempos),
    }

def hora_utc(ts):
    import time
    return time.strftime("%H:%M", time.gmtime(ts))

caminho = sys.argv[1] if len(sys.argv) > 1 else "conexoes.tsv"
dados = carrega(caminho)

print(f"{'DESTINO':<28} {'N':>4} {'INT(s)':>7} {'CV':>5} "
      f"{'ENV':>7} {'REC':>7} {'TOTAL':>10}  AVALIAÇÃO")
print("-" * 104)

for destino, eventos in sorted(dados.items(), key=lambda x: -len(x[1])):
    p = perfil(eventos)
    if not p:
        continue

    # Classificação do padrão
    if p["rec_med"] < 300 and p["env_med"] < 1000 and p["cv"] < 0.30:
        aval = "⚠ BEACON (check-in regular)"
    elif p["env_med"] > 3000 and p["rec_med"] < 1000:
        aval = "⚠ EXFILTRACAO (upload dominante)"
    elif p["rec_med"] > 3000 and p["env_med"] < 1000:
        aval = "⚠ DOWNLOAD (recebimento dominante)"
    elif p["rec_desv"] > p["rec_med"]:
        aval = "  TASK (resposta variável)"
    else:
        aval = "  indiferenciado"

    print(f"{destino:<28} {p['n']:>4} {p['intervalo_med']:>7.1f} {p['cv']:>5.2f} "
          f"{p['env_med']:>7.0f} {p['rec_med']:>7.0f} {p['total_env']:>10}  {aval}")

print()
print("REGRAS DE LEITURA")
print("  · check-in: req pequena + resp pequena + CV baixo")
print("  · exfiltração: upload >> download, repetido")
print("  · task: resposta com desvio padrão maior que a média")
print("  · CV < 0.15 quase não existe em tráfego humano")
print()
print("SEMPRE combine com: domínio desconhecido, ausência de outro tráfego")
print("no host, horário fora do comercial. Perfil sozinho gera falso positivo.")
```

⚠ **A última nota do script não é decoração.** Perfil isolado **gera falso positivo** — qualquer
atualizador tem perfil de check-in. O que fecha o caso é a **combinação**.

---

## 5.4 Janela de atividade e o que ela revela

```python
#!/usr/bin/env python3
"""janela.py — distribuição de atividade por hora UTC"""
import sys, collections, time

horas = collections.Counter()
with open(sys.argv[1] if len(sys.argv) > 1 else "conexoes.tsv") as f:
    for linha in f:
        p = linha.rstrip("\n").split("\t")
        if len(p) < 2:
            continue
        try:
            horas[time.gmtime(float(p[0])).tm_hour] += 1
        except ValueError:
            continue

maximo = max(horas.values()) if horas else 1
for h in range(24):
    n = horas.get(h, 0)
    barra = "█" * int(40 * n / maximo) if maximo else ""
    print(f"{h:02d}h UTC  {n:>5}  {barra}")

print()
print("LEITURA:")
print("  · atividade 24h sem pausa  → automação total")
print("  · pausa em horário 'de dormir' do operador → fuso humano")
print("  · atividade só em janela estreita → operação manual, coordenada")
```

⚠ **O que você faz com isso:** correlaciona com o **fuso da sua operação**. Se a sua organização
opera em UTC-3 e a atividade cessa consistentemente às 03h UTC (00h local), a janela de silêncio
é das 00h às 09h locais — **e isso é consistente com um operador em outro continente**. É contexto
para atribuição (Módulo 9), **não prova**.

---

## 5.5 Da perfil à detecção

A regra que decorre deste módulo, e ela é uma regra de **comportamento**, não de indicador:

```
DETECÇÃO: host com perfil de beacon para destino desconhecido

Condições (todas):
  1. Nº de conexões ao mesmo destino >= 20 em 24h
  2. CV do intervalo < 0,25
  3. Volume médio de requisição < 1 KB
  4. Destino não está na allowlist de categoria aprovada
  5. O host não tem outro tráfego de navegação no período

Exclusões:
  · Processo assinado e conhecido (atualizador)
  · Destino com categoria de negócio aprovada
  · Horário e volume consistentes com backup/janela de manutenção

Falso positivo esperado:
  · Agente de monitoramento, atualizador, telemetria de fabricante
  · Cliente de sincronização em nuvem corporativo
```

⚠ **A condição 5 é a que mais reduz falso positivo e a mais ignorada.** Um host que faz beacon
**e** navega normalmente é suspeito moderado. Um host que faz beacon e **nada mais** é
comprometido. É a diferença entre "tem um padrão" e "só tem esse padrão".

---

## 5.6 LAB — Perfil de canal a partir de captura própria

**Duração:** 150 min

⚠ **Tudo em loopback (`127.0.0.1`) e na faixa de laboratório `10.12.12.0/24`** — terceira faixa
do material, separada da de redes e da de malware, para que os laboratórios nunca se cruzem.

### Passo 1 — Confirme os limites do kit (20 min)

Se você tem o kit:

```bash
mkdir -p ~/apt-lab/lab5 && cd ~/apt-lab/lab5
cp -r ~/apt-lab/kit . && cd kit
make 2>/dev/null || for f in *.c; do gcc -O2 -o "${f%.c}" "$f"; done
chmod +x verifica-limites.sh && ./verifica-limites.sh
```

⚠ **Rode a auditoria antes de executar.** É o Módulo 4, Lab A. Se você não tem o kit, gere o
tráfego você mesmo no Passo 2 — o lab funciona igual.

### Passo 2 — Gere três perfis distintos (30 min)

```bash
cd ~/apt-lab/lab5

cat > gerador.py <<'EOF'
"""gera três perfis de tráfego para análise — laboratório"""
import time, random, socket, sys

ALVO = ("127.0.0.1", 8099)

def conecta(env, rec_esperado=0):
    try:
        s = socket.create_connection(ALVO, timeout=2)
        s.sendall(b"A" * env)
        dado = s.recv(4096)
        s.close()
        return len(dado)
    except Exception:
        return 0

def registra(t, dst, env, rec, arquivo):
    with open(arquivo, "a") as f:
        f.write(f"{t:.3f}\t{dst}\t{env}\t{rec}\n")

modo = sys.argv[1] if len(sys.argv) > 1 else "checkin"
arq = "conexoes.tsv"

if modo == "checkin":
    print("perfil: CHECK-IN regular, req 300B, resp 100B, a cada 2s")
    for _ in range(40):
        t = time.time()
        rec = conecta(300)
        registra(t, "127.0.0.1:8099-checkin", 300, rec or 100, arq)
        time.sleep(2.0 * random.uniform(0.85, 1.15))

elif modo == "task":
    print("perfil: TASK — req pequena, resposta variável")
    for i in range(30):
        t = time.time()
        env = random.randint(180, 320)
        rec = random.choice([100, 120, 4000, 8000, 15000])
        registra(t, "127.0.0.1:8099-task", env, rec, arq)
        time.sleep(random.uniform(1.5, 3.5))

elif modo == "exfil":
    print("perfil: EXFILTRACAO — upload dominante, repetido")
    for i in range(25):
        t = time.time()
        env = random.randint(20000, 60000)
        rec = random.randint(50, 150)
        registra(t, "127.0.0.1:8099-exfil", env, rec, arq)
        time.sleep(random.uniform(0.8, 2.2))

elif modo == "humano":
    print("perfil: navegação humana irregular")
    for i in range(40):
        t = time.time()
        env = random.randint(200, 3000)
        rec = random.randint(5000, 200000)
        registra(t, "127.0.0.1:8099-humano", env, rec, arq)
        time.sleep(random.choice([0.3, 0.8, 1.5, 4, 9, 20]))
EOF

: > conexoes.tsv
for m in checkin task exfil humano; do
    python3 gerador.py "$m"
    sleep 1
done

wc -l conexoes.tsv
```

### Passo 3 — Perfil automatizado (30 min)

```bash
python3 perfil-canal.py conexoes.tsv
python3 janela.py conexoes.tsv
```

Produza `perfil.md`:

| Destino | N | Intervalo médio | CV | Env médio | Rec médio | Classificação do script | **Sua classificação** |
|---|---|---|---|---|---|---|---|
| checkin | | | | | | | |
| task | | | | | | | |
| exfil | | | | | | | |
| humano | | | | | | | |

**Responda:**

1. O script classificou os quatro corretamente? **Onde ele errou ou ficou ambíguo?**
2. Qual perfil teve **CV mais baixo**? Por quê?
3. O perfil `exfil` tem CV baixo? Ele foi classificado como exfiltração? **Por qual critério —
   CV ou assimetria?**
4. O perfil `humano` foi classificado como quê? Ele **seria** falso positivo no seu ambiente?
5. Qual critério **sozinho** geraria mais falso positivo? Justifique com os números.

### Passo 4 — Defina seus limiares (30 min)

⚠ **Este é o entregável central. Os limiares vêm dos SEUS números, não do texto.**

```bash
# Distribuição de CV por perfil — para você escolher o corte
python3 - <<'PY'
import statistics, collections
por = collections.defaultdict(list)
for l in open("conexoes.tsv"):
    p = l.rstrip("\n").split("\t")
    if len(p) < 4: continue
    por[p[1]].append((float(p[0]), int(p[2]), int(p[3])))
for dst, ev in por.items():
    ev.sort()
    d = [b[0]-a[0] for a,b in zip(ev, ev[1:])]
    if len(d) < 3: continue
    med = statistics.mean(d); desv = statistics.pstdev(d)
    print(f"{dst:<28} CV={desv/med:.3f}  min={min(d):.2f}  max={max(d):.2f}")
PY
```

Produza `limiares.md`:

| Perfil | CV medido | Intervalo medido | Você classificaria como suspeito? | **Limiar que você usa** |
|---|---|---|---|---|
| checkin | | | | CV < ? |
| task | | | | |
| exfil | | | | Env/Rec > ? |
| humano | | | | |

**Escreva sua regra final:**

```
DETECÇÃO: <nome>
Condições:
  1. ...
  2. ...
Exclusões:
  · ...
Falso positivo esperado:
  · ... (nomeie DOIS casos legítimos concretos)
Limiar escolhido e justificativa:
  · ...
```

⚠ **Os dois falsos positivos concretos são obrigatórios.** "Pode dar falso positivo" não é
resposta. Nomeie: *"agente de monitoramento X que faz check-in a cada 5 min"*.

### Passo 5 — Aplique a um caso (20 min)

Receba este log de proxy (dado de laboratório, fim educacional):

```
2026-10-18T02:14:03Z 10.12.12.20 -> hxxps://cdn.entrega-ok.tld/a  req=412   resp=88
2026-10-18T02:14:33Z 10.12.12.20 -> hxxps://cdn.entrega-ok.tld/a  req=412   resp=88
2026-10-18T02:15:03Z 10.12.12.20 -> hxxps://cdn.entrega-ok.tld/a  req=412   resp=88
2026-10-18T02:15:33Z 10.12.12.20 -> hxxps://cdn.entrega-ok.tld/a  req=412   resp=88
2026-10-18T02:16:04Z 10.12.12.20 -> hxxps://cdn.entrega-ok.tld/a  req=412   resp=88
2026-10-18T11:02:11Z 10.12.12.31 -> hxxps://d-b2c7f1.tld/x  req=288  resp=104
2026-10-18T11:07:29Z 10.12.12.31 -> hxxps://d-b2c7f1.tld/x  req=288  resp=104
2026-10-18T11:13:02Z 10.12.12.31 -> hxxps://d-b2c7f1.tld/x  req=288  resp=104
2026-10-18T11:18:41Z 10.12.12.31 -> hxxps://d-b2c7f1.tld/x  req=288  resp=104
2026-10-18T11:24:15Z 10.12.12.31 -> hxxps://d-b2c7f1.tld/x  req=288  resp=104
```

Produza `caso.md`:

1. Calcule o intervalo e o CV dos dois hosts. Qual dos dois é mais regular?
2. **Os dois têm perfil de beacon. Por que apenas um é o achado?** Cite três critérios.
3. O primeiro host tem intervalo de 30s; o segundo, de ~5,5 min. **Isso muda sua avaliação?**
4. O nome do destino do segundo é `d-b2c7f1`. **O que isso sugere?**
5. Escreva a consulta que você usaria para encontrar o segundo host e **não** o primeiro.

⚠ **A resposta 3 é contraintuitiva:** intervalo **curto** é mais fácil de detectar, mas intervalo
**longo e regular** é mais típico de operação cuidadosa — e passa por baixo de muitos limiares
que exigem "muitas conexões". **Um beacon de 5 minutos é 10 vezes menos eventos e igualmente
suspeito.**

### Critérios de aceitação

- Auditoria do kit rodada (ou gerador próprio, se não houver kit).
- `perfil.md` com a tabela completa e **sua** classificação comparada à do script.
- Você identificou onde o script errou ou ficou ambíguo.
- `limiares.md` com limiares **derivados dos seus números**, não do texto.
- Regra final com **dois falsos positivos concretos nomeados**.
- `caso.md` distinguindo os dois hosts **por três critérios**, não por intuição.
- Você notou que beacon de intervalo longo é igualmente suspeito.
- Nada fora de `127.0.0.1` e `10.12.12.0/24`.

---

## Avaliação

1. Liste seis observáveis visíveis em tráfego de C2 cifrado.
2. Por que a impossibilidade de ler o conteúdo **não impede** a detecção de C2?
3. Descreva a assinatura de tamanho de check-in, task e transferência.
4. Qual é a assinatura mais durável de um beacon, e por que ela não depende de protocolo?
5. Um beacon fica 5 dias silencioso e retoma. O que isso indica?
6. Explique CV e por que ele é melhor que comparar intervalos individuais.
7. Por que CV < 0.15 "quase não existe" em tráfego humano legítimo?
8. Que informação a **janela de atividade** revela, e com que confiança?
9. Por que o perfil isolado gera falso positivo? O que fecha o caso?
10. Qual é a condição que mais reduz falso positivo numa regra de beacon? Por que ela é ignorada?
11. Por que um beacon de intervalo **longo** é igualmente suspeito, e por que ele escapa de
    muitos limiares?
12. Por que exfiltração pode ter CV baixo sem ser um beacon? Por qual critério você a distingue?

---

**Próximo:** [Módulo 6 — Infraestrutura por fonte aberta](modulo-06.md)
