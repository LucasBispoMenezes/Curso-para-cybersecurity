# Módulo 4 — Automação de Rede

**Carga:** 4 horas (1h15 teoria · 2h45 lab)
**Pré-requisitos:** Módulos 1, 2 e 3

---

## Objetivos

1. Testar portas usando apenas recursos do bash, sem ferramenta externa.
2. Fazer requisições HTTP com `curl` e `wget`, controlando headers, cookies, timeout e retry.
3. Interpretar códigos de status HTTP dentro de um script de automação.
4. Distinguir erro de rede de erro de aplicação — e tratá-los de forma diferente.
5. Orquestrar varreduras com normalização de saída.

---

## ⚠ Ética

Este é o módulo onde é mais fácil sair da linha sem perceber. Um loop de conexões parece
inofensivo e não é.

⚠ **Antes de rodar qualquer script deste módulo contra um alvo:** autorização escrita, escopo
definido, limite de concorrência acordado, e alvo de laboratório próprio. Tudo aqui é testado
contra containers locais — e é assim que deve ficar.

---

## 4.1 `/dev/tcp` — a arma escondida do bash

Bash tem suporte nativo a sockets TCP via caminhos especiais. É recurso de compilação — confirme
que existe antes de depender dele:

```bash
if [[ -e /dev/tcp ]]; then
    echo "suporte a /dev/tcp disponível"
fi
```

### O idioma básico

```bash
# Uma tentativa de conexão. Exit code 0 = porta aberta.
if (exec 3<>/dev/tcp/127.0.0.1/22) 2>/dev/null; then
    echo "porta 22 aberta"
    exec 3<&-   # fecha o descritor
else
    echo "porta 22 fechada ou filtrada"
fi
```

O que está acontecendo:

- `exec 3<>/dev/tcp/host/port` abre o descritor de arquivo 3 apontando para aquele socket.
- O bash tenta a conexão no momento da abertura.
- Erro é mandado para stderr — redirecione para `/dev/null` senão polui sua saída.
- `exec 3<&-` fecha o descritor. **Sempre feche**, ou você esgota o limite de file descriptors
  num loop longo.

### Função reutilizável com timeout

O problema: `/dev/tcp` não tem timeout nativo. Sem proteção, uma porta filtrada trava o script
até o timeout do sistema operacional (pode ser minutos).

```bash
check_port() {
    local host="$1" port="$2" timeout="${3:-2}"
    timeout "${timeout}" bash -c "exec 3<>/dev/tcp/${host}/${port}" 2>/dev/null
}
```

O `timeout` matando um `bash -c` filho é o que faz a proteção funcionar sem matar seu script.

### Enviando dados por `/dev/tcp`

Funciona para protocolos simples — e é didático para entender como um socket opera:

```bash
exec 3<>/dev/tcp/127.0.0.1/80
printf 'HEAD / HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n' >&3
timeout 3 cat <&3 | head -n 1
exec 3<&-
```

N O T A Isto é ótimo para entender o que é um socket e péssimo para uso real. Requisição com
TLS, redirect, cookie, chunked encoding — tudo isso você teria que implementar. **Em produção,
use `curl`.** A lição aqui é o mecanismo, não a ferramenta.

---

## 4.2 Varredura de portas em bash

```bash
#!/usr/bin/env bash
#
# portsweep.sh — varredura de portas via /dev/tcp
# Uso: ./portsweep.sh <host> <portas>  (ex.: 172.30.0.2 22,80,443,8000-8010)
#
set -euo pipefail

HOST="${1:?uso: portsweep.sh <host> <portas>}"
SPEC="${2:?informe portas, ex: 22,80,443}"
TIMEOUT="${TIMEOUT:-2}"
JOBS="${JOBS:-20}"

expandir_portas() {
    local spec="$1" parte inicio fim p
    IFS=',' read -ra partes <<< "${spec}"
    for parte in "${partes[@]}"; do
        if [[ "${parte}" == *-* ]]; then
            inicio="${parte%-*}"; fim="${parte#*-}"
            for (( p=inicio; p<=fim; p++ )); do echo "${p}"; done
        else
            echo "${parte}"
        fi
    done
}

testar() {
    local host="$1" porta="$2"
    if timeout "${TIMEOUT}" bash -c "exec 3<>/dev/tcp/${host}/${porta}" 2>/dev/null; then
        echo "${porta}"
    fi
}

export -f testar
export TIMEOUT

expandir_portas "${SPEC}" \
    | xargs -P "${JOBS}" -I {} bash -c 'testar "$1" {}' _ "${HOST}" \
    | sort -n
```

### Por que isso importa se o `nmap` existe

Três motivos concretos:

1. **Nmap pode não estar instalado** no host onde você está. O bash está.
2. **Nmap faz muito barulho.** O `/dev/tcp` gera um SYN normal, sem assinatura de ferramenta.
3. **Você controla cada detalhe** — timing, ordem, o que fazer com o resultado.

Mas seja honesto sobre a limitação: `/dev/tcp` só diz **aberta ou não**. Não detecta serviço,
versão, nem distingue `closed` de `filtered`. Para isso, ferramenta dedicada.

---

## 4.3 `curl` — o canivete HTTP

```bash
curl -s https://example.com                      # silencioso (sem barra de progresso)
curl -sS https://example.com                     # silencioso mas mostra erros
curl -o pagina.html https://example.com          # salva em arquivo
curl -I https://example.com                      # só cabeçalhos (HEAD)
curl -L https://example.com                      # segue redirecionamentos
curl -s -o /dev/null -w '%{http_code}' https://example.com   # só o status
```

### As flags que você usa em automação

```bash
curl -sS \
     --max-time 10 \
     --connect-timeout 3 \
     --retry 3 \
     --retry-delay 1 \
     --retry-connrefused \
     -A 'Mozilla/5.0 (compatible; audit)' \
     -H 'Accept: application/json' \
     -o resposta.json \
     -w '%{http_code} %{time_total} %{size_download}\n' \
     'https://alvo.local/api/status'
```

| Flag | Por quê |
|---|---|
| `-sS` | silencioso, mas erros ainda aparecem |
| `--connect-timeout` | limita só a fase de conexão |
| `--max-time` | limita a requisição inteira |
| `--retry` | reexecuta em falha transitória |
| `--retry-connrefused` | inclui "conexão recusada" nos casos de retry |
| `-w` | escreve métricas no final — é como você captura status sem parsing |
| `-o` | separa corpo de métricas |

### A regra de ouro do `-w`

**Nunca faça parsing da saída do `curl` para descobrir o status HTTP.** Use `-w`:

```bash
status=$(curl -s -o /tmp/corpo -w '%{http_code}' --max-time 10 "https://alvo.local/")
echo "status=${status}"
```

Isso é robusto. `curl -I | grep "HTTP/" | awk '{print $2}'` quebra na primeira resposta
inesperada.

### Separando erro de rede de erro de aplicação

Distinção fundamental que quase todo script iniciante ignora:

```bash
#!/usr/bin/env bash
set -euo pipefail

verificar_url() {
    local url="$1"
    local codigo
    local saida

    # -w sempre escreve; o exit code do curl indica erro de transporte
    if ! saida=$(curl -sS -o /dev/null -w '%{http_code}' \
                    --connect-timeout 3 --max-time 10 "$url" 2>&1); then
        echo "ERRO_REDE  ${url}  ${saida}"
        return 1
    fi

    codigo="${saida}"
    case "${codigo}" in
        2*|3*) echo "OK         ${url}  ${codigo}" ;;
        4*)    echo "CLIENTE    ${url}  ${codigo}" ;;
        5*)    echo "SERVIDOR   ${url}  ${codigo}" ;;
        *)     echo "INESPERADO ${url}  ${codigo}" ;;
    esac
}
```

**Erro de rede** (DNS não resolve, conexão recusada, timeout) é falha do `curl` — exit code
não-zero, nenhum status HTTP. **Erro de aplicação** (404, 500) é sucesso do `curl` — exit code
zero, status HTTP presente. Confundir os dois faz o script tratar servidor fora do ar e página
inexistente como a mesma coisa.

### Cookies e sessão

```bash
# Jar de cookies para manter sessão entre requisições
curl -s -c cookies.txt -d 'user=admin&pass=x' https://alvo.local/login
curl -s -b cookies.txt https://alvo.local/painel
```

⚠ Testar autenticação sem autorização é exatamente o ato que o art. 154-A tipifica. Faça isso
apenas contra alvos de laboratório, ou em engajamento com escopo que cubra autenticação.

---

## 4.4 `wget` e quando preferir cada um

| Necessidade | Ferramenta |
|---|---|
| Requisição única, parse da resposta | `curl` |
| Download recursivo de site | `wget` |
| Retomar download interrompido | `wget -c` |
| Espelhar com controle de profundidade | `wget -r -l 2` |
| Métricas de tempo, formato de saída | `curl -w` |
| Script que faz POST/JSON | `curl` |

```bash
wget -q -O - https://example.com          # corpo em stdout
wget -q --spider https://example.com      # só verifica existência (HEAD)
wget -c https://example.com/arquivo.iso   # retoma download
wget --limit-rate=200k https://example.com/arquivo.iso
```

N O T A `wget -q --spider` retorna exit code `0`/`8` — é um teste de disponibilidade bem
eficiente quando você não precisa de mais nada.

---

## 4.5 Aguardando serviço ficar pronto

Padrão que você vai usar em todo pipeline: esperar o alvo subir antes de testar.

```bash
#!/usr/bin/env bash
set -euo pipefail

esperar_servico() {
    local url="$1" tentativas="${2:-30}" intervalo="${3:-2}"
    local n

    for (( n=1; n<=tentativas; n++ )); do
        if curl -sS -o /dev/null --connect-timeout 2 --max-time 5 "${url}"; then
            echo "serviço disponível após ${n} tentativa(s)" >&2
            return 0
        fi
        sleep "${intervalo}"
    done

    echo "timeout: ${url} não respondeu em ${tentativas} tentativas" >&2
    return 1
}

esperar_servico "http://127.0.0.1:8080/health" 15 2
```

Note que progresso vai para stderr e o `return` de sucesso para o fluxo do script. Sem isso,
o log de espera polui o resultado.

---

## 4.6 LAB — Checador de serviços com retry e timeout

**Duração:** 150 min
**Objetivo:** construir um verificador de serviços web que classifica corretamente erro de rede,
erro de aplicação e indisponibilidade temporária.

### Passo 1 — Suba alvos com comportamentos distintos

```bash
mkdir -p lab4 && cd lab4
docker network create --subnet 172.30.0.0/24 net4 2>/dev/null || true

# 1. Responde 200
docker run -d --name svc-ok --network net4 --ip 172.30.0.2 nginx:alpine >/dev/null

# 2. Responde 404 em /
docker run -d --name svc-404 --network net4 --ip 172.30.0.3 \
  -e NGINX_ENTRYPOINT_QUIET_LOGS=1 httpd:alpine >/dev/null

# 3. Demora para responder — usamos um container que só escuta depois de um tempo
docker run -d --name svc-lento --network net4 --ip 172.30.0.4 alpine \
  sh -c 'sleep 8; while true; do nc -l -p 80 -e echo -e "HTTP/1.1 200 OK\r\n\r\nok"; done' >/dev/null

# 4. Não existe — testa caminho de erro de rede
#    (172.30.0.99 está fora de uso de propósito)
```

⚠ Tudo isso é a rede `172.30.0.0/24` criada agora, isolada na sua máquina.

### Passo 2 — Escreva `health.sh`

Requisitos:

1. Recebe lista de URLs (uma por linha) via arquivo `-f` ou stdin.
2. Para cada URL, produz uma linha TSV: `url<TAB>classe<TAB>status<TAB>tempo_ms<TAB>tentativas`.
3. Classes possíveis: `OK` (2xx/3xx), `CLIENTE` (4xx), `SERVIDOR` (5xx), `REDE` (transporte falhou).
4. Faz até 3 tentativas em falha **transitória** — rede ou 5xx — com backoff de 1s, 2s.
5. Erro 4xx **não** gera retry (não é transitório).
6. Paraleliza com limite configurável (`-j`).
7. Resultado em stdout, progresso em stderr.
8. Código de saída: `0` se todas OK/cliente, `1` se alguma falhou, `3` se o arquivo não existe.

### Esqueleto com a estrutura difícil pronta

```bash
#!/usr/bin/env bash
#
# health.sh — verificador de serviços HTTP com retry e timeout
# Uso: ./health.sh -f urls.txt [-j 10] [-t 10] [-r 3]
#
set -euo pipefail

ARQUIVO=""
JOBS=10
TIMEOUT=10
RETRIES=3

while getopts ":f:j:t:r:h" opt; do
    case "${opt}" in
        f) ARQUIVO="${OPTARG}" ;;
        j) JOBS="${OPTARG}" ;;
        t) TIMEOUT="${OPTARG}" ;;
        r) RETRIES="${OPTARG}" ;;
        h) echo "Uso: $0 -f urls.txt [-j 10] [-t 10] [-r 3]"; exit 0 ;;
        :) echo "erro: -${OPTARG} exige valor" >&2; exit 2 ;;
        \?) echo "erro: opção inválida -${OPTARG}" >&2; exit 2 ;;
    esac
done

log() { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*" >&2; }

checar() {
    local url="$1" tentativa codigo saida inicio fim tempo classe

    for (( tentativa=1; tentativa<=RETRIES; tentativa++ )); do
        inicio=$(date +%s%N)

        if saida=$(curl -sS -o /dev/null -w '%{http_code}' \
                      --connect-timeout 3 --max-time "${TIMEOUT}" \
                      "${url}" 2>&1); then
            fim=$(date +%s%N)
            tempo=$(( (fim - inicio) / 1000000 ))
            codigo="${saida}"

            case "${codigo}" in
                2*|3*) classe="OK" ;;
                4*)    classe="CLIENTE" ;;
                5*)    classe="SERVIDOR" ;;
                *)     classe="INESPERADO" ;;
            esac

            # Só 5xx merece retry; 4xx é definitivo
            if [[ "${classe}" != "SERVIDOR" ]] || (( tentativa == RETRIES )); then
                printf '%s\t%s\t%s\t%s\t%s\n' \
                    "${url}" "${classe}" "${codigo}" "${tempo}" "${tentativa}"
                return 0
            fi
        else
            fim=$(date +%s%N)
            tempo=$(( (fim - inicio) / 1000000 ))
            if (( tentativa == RETRIES )); then
                printf '%s\t%s\t%s\t%s\t%s\n' \
                    "${url}" "REDE" "000" "${tempo}" "${tentativa}"
                return 0
            fi
        fi

        sleep "$(( tentativa ))"
    done
}

export -f checar
export TIMEOUT RETRIES

[[ -r "${ARQUIVO}" ]] || { log "erro: não consigo ler ${ARQUIVO}"; exit 3; }

printf 'url\tclasse\tstatus\ttempo_ms\ttentativas\n' >&1

grep -vE '^\s*(#|$)' "${ARQUIVO}" \
  | xargs -P "${JOBS}" -I {} bash -c 'checar "$1"' _ {} \
  | sort

log "concluído"
```

### Passo 3 — Teste

```bash
cat > urls.txt <<'EOF'
# alvos de laboratório
http://172.30.0.2/
http://172.30.0.3/nada-aqui
http://172.30.0.4/
http://172.30.0.99/
EOF

./health.sh -f urls.txt -j 4 | column -t -s$'\t'
```

Resultados esperados:

| URL | Classe esperada | Por quê |
|---|---|---|
| `172.30.0.2` | `OK` | nginx responde 200 |
| `172.30.0.3/nada-aqui` | `CLIENTE` | httpd responde 404 |
| `172.30.0.4` (depois dos 8s) | `OK` | serviço sobe tarde |
| `172.30.0.99` | `REDE` | sem host nessa altura |

### Passo 4 — Verificação de código de saída

```bash
./health.sh -f urls.txt -j 4 > /dev/null; echo "exit=$?"
# deve ser 1, porque 172.30.0.99 falhou

./health.sh -f naoexiste.txt > /dev/null 2>&1; echo "exit=$?"
# deve ser 3
```

Adicione essa lógica de agregação ao seu script: conte por classe e use isso para definir o
código de saída no final.

### Critérios de aceitação

- As quatro URLs aparecem classificadas corretamente.
- A URL `172.30.0.99` é a única com `tentativas=3` — as outras resolvem na primeira.
- Nenhuma linha do resultado contém log de progresso misturado.
- `./health.sh -f naoexiste.txt` retorna `3`.
- `time ./health.sh -f urls.txt -j 4` e `-j 1` têm tempos diferentes que você consegue explicar.
- `shellcheck health.sh` sem erros de nível *error*.

### Limpeza

```bash
docker rm -f svc-ok svc-404 svc-lento 2>/dev/null || true
docker network rm net4
```

---

## Avaliação

1. O que o bash está fazendo quando você escreve `exec 3<>/dev/tcp/host/porta`? Por que é preciso
   fechar o descritor depois?
2. `/dev/tcp` não tem timeout nativo. Como você o protege, e por que matar um `bash -c` filho
   funciona melhor que matar o script pai?
3. Por que usar `curl -w '%{http_code}'` é mais robusto que fazer parsing do cabeçalho da resposta?
4. Descreva a diferença entre erro de rede e erro de aplicação num script de health check. Por que
   tratar os dois igual produz falso positivo?
5. Por que uma resposta 4xx não deve disparar retry, e uma 5xx deve?
6. Cite duas limitações de `/dev/tcp` em relação ao `nmap` e duas vantagens.
7. Você precisa testar 200 endpoints com regra de engajamento limitando a 8 conexões simultâneas
   e timeout de 10s. Qual o tempo mínimo teórico total? Como você estruturaria o script para
   respeitar isso?

---

**Próximo:** [Módulo 5 — Automação de reconhecimento](modulo-05.md)
