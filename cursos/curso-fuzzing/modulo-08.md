# Módulo 8 — Fuzzing de Protocolo e Estado

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Entender por que protocolo é diferente de formato de arquivo.
2. Escrever fuzzer de protocolo com `boofuzz` e manter sessão válida.
3. Modelar máquina de estado e saber onde o fuzzing de estado quebra.
4. Fuzzar servidor próprio em `localhost`, com isolamento.
5. Reconhecer o que o fuzzing de protocolo **não** alcança.

---

## ⚠ Conduta — este módulo tem uma regra adicional

⚠ **O servidor é seu, rodando em `localhost`.** Fuzzing de protocolo contra serviço de terceiro é
**negação de serviço**, mesmo com poucas requisições e mesmo sem intenção. Um fuzzer de protocolo
manda milhares de pacotes malformados por minuto — e isso **derruba serviço real**.

| Você faz | Você **não** faz |
|---|---|
| Sobe servidor próprio em `127.0.0.1` | Fuzza serviço externo |
| Fuzza na sua rede de laboratório | Fuzza a rede da empresa |
| Envia pacote malformado para o seu alvo | Qualquer pacote para alvo de terceiro |

⚠ **Se você for fuzzar produto de código aberto depois do curso**, faça local: compile, suba em
container isolado, e fuzze ali. Nunca contra instância pública.

---

## 8.1 Por que protocolo é diferente

Fuzzing de arquivo é simples: bytes entram, parser processa. Fuzzing de protocolo tem **três**
complicações extras.

| Complicação | Consequência |
|---|---|
| **A estrutura importa** | Aleatoriedade pura não chega ao parser — o servidor rejeita antes |
| **O estado importa** | A mensagem 3 só faz sentido depois de 1 e 2 |
| **A resposta importa** | O cliente precisa reagir ao que o servidor mandou |

```
ARQUIVO                            PROTOCOLO
┌──────────────┐                  ┌──────────────────────────────┐
│ bytes brutos │                  │ 1. handshake                 │
│      ↓       │                  │ 2. autenticação              │
│   parser     │                  │ 3. comando                   │
│      ↓       │                  │ 4. dados                     │
│  crash?      │                  │      ↓                       │
└──────────────┘                  │ cada etapa depende da anterior│
                                  └──────────────────────────────┘
   mutação aleatória funciona         mutação aleatória = 0 progresso
```

⚠ **A tese do módulo:** em protocolo, **geração estruturada vence mutação** — porque a chance de
uma mutação aleatória produzir mensagem válida na etapa certa é praticamente nula.

---

## 8.2 O servidor de laboratório

⚠ **Você escreve o servidor, com bug deliberado.**

```bash
cd ~/fuzz-lab
mkdir -p protocolo && cd protocolo

cat > servidor.c <<'EOF'
/*
 * Servidor de protocolo com bug deliberado — LABORATÓRIO APENAS
 * Escuta APENAS em 127.0.0.1.
 *
 * Protocolo (linha de texto, terminada em \n):
 *   HELLO <nome>\n        → OK <saudacao>\n
 *   SET <chave> <valor>\n → OK\n            ⚠ BUG: valor sem limite
 *   GET <chave>\n         → VAL <valor>\n
 *   QUIT\n                → BYE\n
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>

#define PORTA 9999
#define MAX_CHAVES 64

typedef struct { char chave[32]; char valor[64]; } Par;

static Par   store[MAX_CHAVES];
static int   n_chaves = 0;
static char  ultimo_valor[4096];       /* ⚠ usado sem verificação de limite */

static void tratar_linha(int fd, char *linha) {
    char resp[8192];

    if (strncmp(linha, "HELLO ", 6) == 0) {
        snprintf(resp, sizeof(resp), "OK ola %s\n", linha + 6);
        send(fd, resp, strlen(resp), 0);

    } else if (strncmp(linha, "SET ", 4) == 0) {
        char *chave = linha + 4;
        char *esp   = strchr(chave, ' ');
        if (!esp) { send(fd, "ERR\n", 4, 0); return; }
        *esp = '\0';
        char *valor = esp + 1;

        /* ⚠ BUG 1: strcpy sem limite — transborda `ultimo_valor` */
        strcpy(ultimo_valor, valor);

        /* ⚠ BUG 2: não verifica n_chaves contra MAX_CHAVES */
        snprintf(store[n_chaves].chave, sizeof(store[0].chave), "%s", chave);
        snprintf(store[n_chaves].valor, sizeof(store[0].valor), "%s", valor);
        n_chaves++;

        send(fd, "OK\n", 3, 0);

    } else if (strncmp(linha, "GET ", 4) == 0) {
        for (int i = 0; i < n_chaves; i++) {
            if (strcmp(store[i].chave, linha + 4) == 0) {
                snprintf(resp, sizeof(resp), "VAL %s\n", store[i].valor);
                send(fd, resp, strlen(resp), 0);
                return;
            }
        }
        send(fd, "NF\n", 3, 0);

    } else if (strncmp(linha, "QUIT", 4) == 0) {
        send(fd, "BYE\n", 4, 0);

    } else {
        send(fd, "ERR\n", 4, 0);
    }
}

int main(void) {
    int srv = socket(AF_INET, SOCK_STREAM, 0);
    if (srv < 0) { perror("socket"); return 1; }

    int on = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &on, sizeof(on));

    struct sockaddr_in end = {0};
    end.sin_family      = AF_INET;
    end.sin_port        = htons(PORTA);
    end.sin_addr.s_addr = inet_addr("127.0.0.1");     /* ⚠ SÓ loopback */

    if (bind(srv, (struct sockaddr *)&end, sizeof(end)) < 0) { perror("bind"); return 1; }
    if (listen(srv, 8) < 0) { perror("listen"); return 1; }

    fprintf(stderr, "servidor de laboratorio em 127.0.0.1:%d\n", PORTA);

    for (;;) {
        int cli = accept(srv, NULL, NULL);
        if (cli < 0) continue;

        char buf[8192];
        ssize_t n;
        while ((n = recv(cli, buf, sizeof(buf) - 1, 0)) > 0) {
            buf[n] = '\0';
            char *linha = strtok(buf, "\n");
            while (linha) {
                tratar_linha(cli, linha);
                linha = strtok(NULL, "\n");
            }
        }
        close(cli);
    }
    return 0;
}
EOF

gcc -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
    -o servidor servidor.c

# Rode em background
./servidor 2>servidor.log &
echo $! > servidor.pid
sleep 1
cat servidor.log
```

⚠ **Note o `inet_addr("127.0.0.1")`.** O servidor **só** aceita conexão local. É uma trava
deliberada: mesmo se você copiar o código, ele não vai escutar em rede.

⚠ **E note `-fsanitize=address`.** O servidor **precisa** estar instrumentado — senão o transbordo
é silencioso e o fuzzer não vê nada.

### Teste à mão

```bash
# Cliente simples
printf 'HELLO ana\nSET x 1\nGET x\nQUIT\n' | nc 127.0.0.1 9999
```

**Esperado:**

```
OK ola ana
OK
VAL 1
BYE
```

---

## 8.3 `boofuzz` — fuzzing com geração estruturada

⚠ **`boofuzz` gera mensagens válidas por construção**, e muta **dentro** da estrutura. É a diferença
central: em vez de mutar bytes, você muta **campos**.

```bash
pip3 install boofuzz
```

```python
#!/usr/bin/env python3
"""
fuzz_protocolo.py — fuzzer de protocolo com boofuzz
⚠ ALVO: servidor de laboratório em 127.0.0.1:9999
"""
from boofuzz import (
    Session, Target, SocketConnection,
    s_get, s_string, s_delim, s_int,
    s_initialize, s_static
)

HOST = "127.0.0.1"
PORTA = 9999


def define_hello():
    """HELLO <nome>\\n"""
    s_initialize("hello")
    s_static("HELLO ")
    s_string("nome", max_len=64)      # ← o fuzzer muta ESTE campo
    s_delim("\n")


def define_set():
    """SET <chave> <valor>\\n — ⚠ campo `valor` sem limite no servidor"""
    s_initialize("set")
    s_static("SET ")
    s_string("chave", max_len=32)
    s_static(" ")
    # ⚠ s_string sem max_len: o boofuzz gera strings longas → dispara o transbordo
    s_string("valor")
    s_delim("\n")


def define_get():
    """GET <chave>\\n"""
    s_initialize("get")
    s_static("GET ")
    s_string("chave", max_len=32)
    s_delim("\n")


def main():
    define_hello()
    define_set()
    define_get()

    sessao = Session(
        target=Target(
            connection=SocketConnection(HOST, PORTA, proto="tcp"),
        ),
        sleep_time=0.01,
        restart_sleep_time=0.5,
    )

    # Encadeia as requisições: HELLO → SET → GET
    # ⚠ Isso é o que mantém a SESSÃO VÁLIDA entre as mutações
    sessao.connect(s_get("hello"))
    sessao.connect(s_get("hello"), s_get("set"))
    sessao.connect(s_get("set"),   s_get("get"))

    print(f"fuzzando {HOST}:{PORTA}")
    print("⚠ apenas servidor de laboratório local")
    sessao.fuzz()


if __name__ == "__main__":
    main()
```

### Os conceitos do `boofuzz`

| Elemento | Função |
|---|---|
| `s_initialize` | Define uma mensagem com nome |
| `s_static` | Bytes fixos, não fuzzados |
| `s_string` | Campo de texto **mutado** |
| `s_int` | Campo inteiro mutado |
| `s_delim` | Delimitador — pode ser mutado (teste de injeção) |
| `Session` | Orquestra a campanha |
| `Target` + `Connection` | Para onde e como enviar |
| **`connect(A, B)`** | **Encadeia: B só é enviada depois de A** |

⚠ **O `connect` é o que resolve o problema de estado.** Sem ele, o `boofuzz` envia cada mensagem
isolada — e o servidor rejeita a `SET` sem `HELLO` anterior. **Com ele, a sessão é mantida** e a
mutação chega ao código que importa.

⚠ **E `s_string("valor")` sem `max_len` é o que dispara o bug.** O `boofuzz` gera automaticamente
strings de vários comprimentos — inclusive muitos longos. Isso exercita o `strcpy` sem limite.

### Rodar

```bash
cd ~/fuzz-lab/protocolo

# Confirme que o servidor está no ar
ss -tlnp 2>/dev/null | grep 9999 || ./servidor 2>>servidor.log &

# Rode o fuzzer por tempo limitado
timeout 120 python3 fuzz_protocolo.py 2>&1 | tee fuzz.log | tail -30
```

⚠ **O `boofuzz` cria um diretório de resultados** (`boofuzz-results/` com arquivo `.db`). Ele é
**sqlite**, e você consulta para ver o que foi enviado:

```bash
ls boofuzz-results/
python3 - <<'PY'
import sqlite3, glob, os
arqs = sorted(glob.glob("boofuzz-results/*.db"), key=os.path.getmtime)
if not arqs:
    print("nenhum resultado")
else:
    con = sqlite3.connect(arqs[-1])
    cur = con.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    print("tabelas:", [r[0] for r in cur.fetchall()])
    try:
        cur.execute("SELECT count(*) FROM cases")
        print("casos registrados:", cur.fetchone()[0])
    except Exception as e:
        print("(schema difere por versão:", e, ")")
    con.close()
PY
```

⚠ **O schema do banco muda entre versões do `boofuzz`.** Se as consultas acima falharem, abra o
arquivo com `sqlite3` e liste as tabelas — o conteúdo está lá, só o nome muda.

---

## 8.4 Máquina de estado — onde funciona e onde quebra

```
ESTADO DO SERVIDOR                    COBERTURA DO FUZZING
┌───────────────┐
│ DESCONECTADO  │
└───────┬───────┘
        │ HELLO
        ▼
┌───────────────┐  ←───────────────── fuzzing funciona bem
│ AUTENTICADO   │                      (cadeia linear)
└───────┬───────┘
        │ SET
        ▼
┌───────────────┐
│ COM DADOS     │
└───────┬───────┘
        │  ┌──────────────┐
        ├─▶│ ESTADO PARALELO │  ← ⚠ fuzzing quebra
        │  └──────────────┘     (cadeia explode)
        │
        ▼
┌───────────────┐
│ CONFIRMADO    │
└───────────────┘
```

| Tipo de protocolo | Fuzzing funciona? | Por quê |
|---|---|---|
| **Cadeia linear** (HELLO → SET → GET) | **Sim, bem** | Uma sequência válida basta |
| **Com ramificação** (se X, então Y) | Parcialmente | Precisa de sequência por ramo |
| **Com estado paralelo** | **Mal** | Combinações explodem |
| **Com dependência de tempo** | Mal | Estado muda sozinho |
| **Com dependência cruzada** (conexão A afeta B) | **Muito mal** | Requer múltiplas conexões |
| **Com sessão autenticada complexa** | Mal | Precisa de credencial válida |

⚠ **A conclusão honesta:** fuzzing de protocolo funciona muito bem em protocolo de **cadeia
linear**, e mal em protocolo **com estado rico**. A maioria dos protocolos reais é o segundo.

**O que fazer quando o protocolo tem estado rico:**

| Abordagem | Como |
|---|---|
| Fuzzar **um estado por vez** | Sobe o servidor no estado, fuzza só a mensagem seguinte |
| Fuzzar **o parser de uma mensagem** | Extrai a função de parse e fuzza isolada (mais rápido, mais preciso) |
| **Replay de sessão** | Grava sessão real, muta uma mensagem, reenvia |
| **Gramática de estado** | Modela a máquina inteira (módulo 12) |

⚠ **A segunda linha é a mais eficaz na prática.** Se o parser da mensagem está numa função, extraia
e fuzze **aquela função** com libFuzzer — muito mais rápido que fuzzar o servidor pela rede. **É o
mesmo princípio do módulo 4: refatorar para tornar fuzzável.**

---

## 8.5 O que fuzzing de protocolo não alcança

⚠ **Honestidade necessária, porque este módulo costuma gerar expectativa errada.**

| Alcança | Não alcança |
|---|---|
| Transbordo no parser de mensagem | Bug **lógico** (autenticação, autorização) |
| Formato inválido mal tratado | Race condition entre conexões |
| Campo sem limite | Bug que exige **sequência específica** raríssima |
| Delimitador mal escapado | Bug que exige **dependência cruzada** |
| Overflow de contador | Timing / ordem de pacote |
| Estado não reinicializado | Bug de criptografia |

⚠ **A coluna da direita é a maior parte dos bugs reais de protocolo.** Fuzzing acha o que é
**corrupção de memória ao processar entrada** — e isso é uma fração dos bugs que existem.

**E a consequência para o reporte:** você precisa declarar **o que fuzzou e o que não**. *"Fuzzeei
o parser da mensagem SET; não cobri a máquina de estado, autorização nem concorrência"* é o
cabeçalho de um reporte honesto.

---

## 8.6 LAB — Fuzzer de protocolo completo

**Duração:** 120 min

### Passo 1 — Suba o servidor e confirme (25 min)

```bash
cd ~/fuzz-lab/protocolo

# Mate instância antiga, se houver
[ -f servidor.pid ] && kill "$(cat servidor.pid)" 2>/dev/null
pkill -f './servidor' 2>/dev/null

gcc -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer \
    -o servidor servidor.c

./servidor 2>servidor.log &
echo $! > servidor.pid
sleep 1

# Confirme: SÓ escuta em loopback
ss -tlnp 2>/dev/null | grep 9999

# Teste válido
printf 'HELLO ana\nSET x 1\nGET x\nQUIT\n' | nc 127.0.0.1 9999
```

Produza `servidor.md`:

| Teste | Resultado |
|---|---|
| Escuta em qual endereço? | |
| Responde a HELLO? | |
| Responde a SET/GET? | |
| `netstat` confirma que NÃO escuta em 0.0.0.0? | |

⚠ **A última linha é a verificação de segurança.** Se aparecer `0.0.0.0:9999`, **pare** e corrija —
o servidor está exposto na rede.

### Passo 2 — Dispare o bug à mão (25 min)

⚠ **Antes de fuzzar, provoque o bug manualmente.** Isso prova que o bug existe e que o fuzzer vai
ter o que achar.

```bash
# SET com valor muito longo → transborda `ultimo_valor[4096]`
VALOR_LONGO=$(python3 -c 'print("A" * 5000)')
printf "HELLO ana\nSET k %s\nGET k\n" "$VALOR_LONGO" | nc 127.0.0.1 9999 >/dev/null 2>&1
sleep 1

# Veja o log do servidor (que tem ASan)
tail -30 servidor.log
```

**A saída do ASan no servidor:**

```
=================================================================
==NNNN==ERROR: AddressSanitizer: global-buffer-overflow on address ...
WRITE of size 5001 at 0x... thread T0
    #0 __interceptor_strcpy
    #1 tratar_linha /home/.../servidor.c:41:9        ← a linha do strcpy
    ...
0x... is located 0 bytes to the right of global variable 'ultimo_valor'
```

Produza `bug-manual.md`:

| Campo | Valor |
|---|---|
| Tipo do erro do ASan | |
| Linha culpada (`#0`) | |
| Variável transbordada | |
| Tamanho necessário para disparar | |
| O servidor morreu? | |

**Responda:**

1. **Qual o menor tamanho** que dispara o transbordo? (Teste com tamanhos decrescentes.)
2. Depois do ASan abortar, o servidor ainda responde? **Por que não?**
3. O bug é `global-buffer-overflow` ou `stack-buffer-overflow`? Por quê?

⚠ **A resposta 2 é operacional:** com ASan, o servidor **morre**. Para fuzzing de servidor, isso
significa que você precisa **reiniciar** o servidor depois de cada crash — e o `boofuzz` tem
`restart_sleep_time` para isso.

### Passo 3 — Fuzze com `boofuzz` (45 min)

```bash
# Reinicie o servidor (o crash anterior matou)
./servidor 2>>servidor.log & echo $! > servidor.pid
sleep 1

# Ajuste o script para reiniciar o servidor automaticamente
cat > fuzz_protocolo.py <<'PY'
#!/usr/bin/env python3
"""Fuzzer de protocolo — LABORATÓRIO APENAS, alvo local"""
import subprocess, time, os, signal
from boofuzz import (Session, Target, SocketConnection,
                     s_get, s_string, s_static, s_delim, s_initialize)

HOST, PORTA = "127.0.0.1", 9999

def define():
    s_initialize("hello")
    s_static("HELLO "); s_string("nome", max_len=64); s_delim("\n")

    s_initialize("set")
    s_static("SET "); s_string("chave", max_len=32); s_static(" ")
    s_string("valor")              # ← sem max_len: gera strings longas
    s_delim("\n")

    s_initialize("get")
    s_static("GET "); s_string("chave", max_len=32); s_delim("\n")

def main():
    define()
    sessao = Session(
        target=Target(connection=SocketConnection(HOST, PORTA, proto="tcp")),
        sleep_time=0.01,
        restart_sleep_time=1.0,
    )
    sessao.connect(s_get("hello"))
    sessao.connect(s_get("hello"), s_get("set"))
    sessao.connect(s_get("set"),   s_get("get"))
    print(f"fuzzando {HOST}:{PORTA} — alvo de laboratorio local")
    sessao.fuzz()

if __name__ == "__main__":
    main()
PY

# ⚠ Limite: 90 segundos. Fuzzing de servidor é LENTO.
timeout 90 python3 fuzz_protocolo.py 2>&1 | tail -20
echo
echo "=== servidor sobreviveu? ==="
ss -tlnp 2>/dev/null | grep -c 9999
```

Produza `fuzz-protocolo.md`:

| Métrica | Valor |
|---|---|
| Casos enviados | |
| O servidor crashou? | |
| Quantas vezes precisou reiniciar? | |
| O ASan registrou o transbordo? | |
| Tempo da sessão | |

**Responda:**

1. **Quantos casos por segundo** o fuzzing de protocolo fez? Compare com os 100.000 do libFuzzer.
2. Por que a diferença é tão grande? Cite três razões.
3. O fuzzer **achou** o bug do `SET`? Se não, por quê?
4. **Se você quisesse achar esse bug rapidamente**, o que faria em vez de fuzzar pela rede?

⚠ **A resposta 4 é a lição central do módulo.** Fuzzar o **parser isolado** com libFuzzer acharia o
mesmo bug em segundos. Fuzzar **pela rede** leva minutos e não escala. **O protocolo é o transporte;
o bug está no parser.**

### Passo 4 — Compare as duas abordagens (25 min)

⚠ **O experimento que prova a tese.**

```bash
# Extraia o parser de mensagem para uma função fuzzável
cat > parser_msg.c <<'EOF'
/* parser de mensagem isolado — fuzzável diretamente */
#include <string.h>
#include <stdio.h>

static char ultimo_valor[4096];

/* ⚠ o MESMO bug, agora acessível ao libFuzzer */
void tratar_linha(const char *linha) {
    if (strncmp(linha, "SET ", 4) == 0) {
        const char *chave = linha + 4;
        const char *esp = strchr(chave, ' ');
        if (!esp) return;
        char valor[4000];
        size_t n = strlen(esp + 1);
        if (n >= sizeof(valor)) return;        /* cópia local, segura */
        memcpy(valor, esp + 1, n); valor[n] = '\0';
        strcpy(ultimo_valor, valor);           /* ⚠ BUG preservado */
    }
}
EOF

cat > parser_msg_fuzz.c <<'EOF'
#include <stdint.h>
#include <stddef.h>
void tratar_linha(const char *linha);
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    if (size < 4 || size > 8192) return 0;
    char *buf = __builtin_alloca(size + 1);
    __builtin_memcpy(buf, data, size);
    buf[size] = '\0';
    tratar_linha(buf);
    return 0;
}
EOF

clang -g -O1 -fsanitize=fuzzer,address,undefined -fno-omit-frame-pointer \
    -o parser_msg_fuzz parser_msg_fuzz.c parser_msg.c

mkdir -p corpus-msg
printf 'SET k valor\n' > corpus-msg/s1

timeout 60 ./parser_msg_fuzz corpus-msg -max_total_time=30 -print_final_stats=1 2>&1 | \
    grep -E 'exec/s|crash|ERROR|SUMMARY|stat::' | tail -8
```

Produza `comparacao-protocolo.md`:

| Abordagem | Exec/s | Tempo até o crash | Escala? |
|---|---|---|---|
| Fuzzar servidor pela rede (`boofuzz`) | | | Não |
| **Fuzzar parser isolado (`libFuzzer`)** | | | **Sim** |

**Responda:**

1. **Quantas vezes mais rápido** foi o parser isolado?
2. O bug é o **mesmo** nas duas abordagens? O que muda?
3. **O que você perde** ao fuzzar só o parser isolado, em vez do servidor?
4. Como você combina as duas abordagens num projeto real?

⚠ **A resposta 3 é o equilíbrio.** Ao isolar o parser, você **perde a máquina de estado, a
autorização e a concorrência** — e são justamente os bugs que o fuzzing pela rede também não acha
bem. **Você não perde muito; você perde o que já não estava sendo coberto.**

### Critérios de aceitação

- `servidor.md` com a verificação de que **NÃO** escuta em `0.0.0.0`.
- `bug-manual.md` com o relatório do ASan do servidor e o **tamanho mínimo** medido.
- Você explicou por que o servidor morre e precisa reiniciar.
- `fuzz-protocolo.md` com os casos por segundo medidos e a comparação com libFuzzer.
- `comparacao-protocolo.md` com as duas abordagens e o **fator de diferença**.
- Você identificou o que se **perde** ao isolar o parser, e respondeu se perde muito.
- O alvo foi **sempre** `127.0.0.1`. Nenhum pacote saiu para fora.
- O servidor foi encerrado ao final (`kill $(cat servidor.pid)`).

---

## Avaliação

1. Por que fuzzing de protocolo é diferente de fuzzing de arquivo? Cite as três complicações.
2. Por que mutação aleatória é praticamente inútil em protocolo?
3. O que o `connect(A, B)` do `boofuzz` faz, e por que é essencial?
4. Por que `s_string("valor")` **sem** `max_len` dispara o bug do servidor?
5. Cite três tipos de protocolo em que fuzzing **funciona bem** e três em que funciona **mal**.
6. Por que protocolo com **estado paralelo** é o pior caso?
7. Cite quatro abordagens para protocolo com estado rico. Qual é a mais eficaz?
8. Por que fuzzar o parser isolado é muito melhor que fuzzar pela rede?
9. O que você **perde** ao isolar o parser? Perde muito?
10. Por que fuzzing de protocolo acha corrupção de memória mas **não** acha bug lógico?
11. Cite três classes de bug de protocolo que o fuzzing **não** alcança.
12. Por que o servidor instrumentado com ASan **morre** no crash, e o que isso exige da campanha?
13. O que você precisa declarar no reporte sobre o que fuzzou e o que não fuzzou?

---

**Próximo:** [Módulo 9 — Triagem: de 500 crashes a 4 bugs](modulo-09.md)
