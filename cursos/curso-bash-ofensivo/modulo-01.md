# Módulo 1 — Fundamentos de Shell Ofensiva

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Linux básico, terminal funcional

---

## Objetivos

Ao final deste módulo você será capaz de:

1. Escrever um script com shebang correto e permissão de execução adequada.
2. Usar `set -euo pipefail` e explicar o que cada uma das três opções protege.
3. Distinguir variáveis de shell de variáveis de ambiente e saber quando cada uma importa.
4. Trabalhar com arrays, incluindo arrays associativos.
5. Controlar streams, redirecionamento e descritores de arquivo.
6. Ler e produzir códigos de saída corretos, e saber por que isso define se seu pipeline funciona.

---

## ⚠ Ética

Tudo neste curso roda em containers locais criados por você. O que separa automação legítima de
crime não é a técnica — é a **autorização escrita e o escopo definido**. Antes de qualquer teste
real: contrato assinado, escopo listado, janela de horário combinada, contato de emergência.

No Brasil, acessar sistema sem autorização é crime (Código Penal, art. 154-A), e dano a serviço
de terceiro também (art. 266). Não existe "só testei rapidinho" que resolva isso.

---

## 1.1 Por que bash, e quando NÃO usar bash

Bash é a linguagem que **sempre está lá**. Em qualquer engajamento, você tem um shell —
e às vezes só isso. Você não vai instalar Python ou Go num servidor comprometido sem chamar
atenção. Mas também, quase sempre, existe um `/bin/bash`.

Isso é vantagem e armadilha ao mesmo tempo. Bash é excelente para:

- encadear programas existentes (o "canivete suíço" do Unix);
- processar texto linha a linha;
- orquestrar ferramentas de linha de comando;
- tarefas rápidas de reconhecimento e triagem.

Bash é péssimo para:

- estruturas de dados complexas (listas de tuplas, dicionários aninhados);
- **qualquer coisa que faça requisições HTTP em escala** — aqui a superfície de erro é grande;
- aritmética de ponto flutuante nativa (`$(( 1/3 ))` retorna `0`);
- texto multilinha, binário, ou parsing de formatos complexos como JSON aninhado.

**A regra prática:** bash para orquestrar, linguagens de propósito geral para construir. Quando
você tiver mais de ~200 linhas em bash processando dados estruturados, está na hora de reescrever.

N O T A Não trate isso como "bash é inferior". Trate como "cada ferramenta tem um escopo".
O erro do iniciante é escrever 800 linhas de bash onde 60 linhas de Python resolveriam; o erro
oposto, e mais comum em pentest, é tentar subir um runtime inteiro onde um loop de `curl` resolveria.

---

## 1.2 O esqueleto de um script que não te trai

```bash
#!/usr/bin/env bash
#
# triage.sh — triagem de disponibilidade de hosts
# Uso: ./triage.sh <arquivo-de-hosts>
#
set -euo pipefail
```

### O shebang

```bash
#!/usr/bin/env bash
```

Prefira `/usr/bin/env bash` a `/bin/bash`. O motivo é portabilidade: o `env` procura o `bash` no
`PATH` do sistema. Num BSD ou num macOS, o bash pode estar em `/usr/local/bin`. Em muitos
containers Alpine, pode não estar no caminho esperado. `env` resolve isso.

### `set -euo pipefail` — desmonte uma opção por vez

Esta linha é o que separa um script de brinquedo de um script de produção. Ela é, na verdade,
três flags:

| Flag | O que faz | O que acontece sem ela |
|---|---|---|
| `-e` | Aborta se um comando retornar código de saída diferente de zero | O script continua depois de um erro, operando com dados inválidos |
| `-u` | Trata variável não definida como erro | `${VAR}` vazio silenciosamente vira string vazia e quebra seus comandos |
| `-o pipefail` | Faz o código de saída do pipeline ser o do último comando que falhou | Um `cmd | grep x` retorna sucesso mesmo se `cmd` morreu |

**O `-e` sozinho é uma armadilha.** Sem `pipefail`, este script falha em silêncio:

```bash
set -e
cat hosts.txt | grep "pattern" | wc -l
```

Se `hosts.txt` não existir, `cat` falha — mas o código de saída do pipeline é o do `wc -l`,
que retorna `0` e sucesso. O script segue feliz. Com `-o pipefail`, ele para.

⚠ **Existem casos em que você quer deliberadamente ignorar um erro.** Nesses casos, seja explícito:

```bash
# O comando PODE falhar; isso é esperado
if ! grep -q "pattern" arquivo.txt; then
    echo "padrão não encontrado — seguindo em frente"
fi

# Ou, para uma linha só, marque a exceção:
resultado=$(comando-que-pode-falhar || true)
```

A diferença entre "ignorar de propósito" e "ignorar por acidente" é a diferença entre um
profissional e alguém lutando com o script às 3h da manhã.

### `=== Boas práticas: comentário de cabeçalho ===`

Todo script seu começa com um bloco que responde três perguntas: *o que é isso*, *como se usa*,
*quem escreveu*. Quando você reabrir o script seis meses depois num engajamento diferente,
vai agradecer.

```bash
#!/usr/bin/env bash
#
# subscan.sh — enumeração de subdomínios com resolução em massa
# Autor: <seu nome> <email>
# Data: 2026-01-15
# Uso: ./subscan.sh -d example.com -w wordlist.txt [-t 20]
#
set -euo pipefail
```

---

## 1.3 Variáveis: shell vs. ambiente

Há dois espaços de nomes distintos, e confundir os dois gera bugs difíceis.

| Tipo | Como se cria | Visível a | Persiste? |
|---|---|---|---|
| Variável de shell | `NOME=valor` | O processo atual | Não — morre com o shell |
| Variável de ambiente | `export NOME=valor` | Processos filhos | Não — a menos que vá para perfil |

```bash
#!/usr/bin/env bash
set -euo pipefail

TARGET="10.0.0.5"        # variável de shell
export LOGLEVEL="debug"  # variável de ambiente — filhos herdam

echo "Alvo: ${TARGET}"

# Bash procura a variável NO SCRIPT se não estiver exportada
./script-filho.sh
```

### A regra das chaves

Use `${VAR}` sempre, não `$VAR`. Não é só estilo:

```bash
ARQUIVO="dados"
echo "$ARQUIVO.txt"    # imprime "dados.txt"  — bash para no ponto
echo "${ARQUIVO}.txt"  # imprime "dados.txt"  — mesmo resultado aqui
echo "${ARQUIVO}_copia" # imprime "dados_copia"
echo "$ARQUIVO_copia"   # imprime "" — bash procura a variável ARQUIVO_copia, que não existe
```

O último caso é a armadilha real. Com `set -u`, ele aborta o script — que é melhor do que
produzir lixo silenciosamente.

### Valores padrão

O bash tem substituição de padrão embutida, e ela substitui muito `if`:

```bash
: "${WORDLIST:?erro: informe a wordlist}"   # aborta se não definida
TIMEOUT="${TIMEOUT:-5}"                      # usa 5 se não definida
THREADS="${THREADS:=10}"                     # define 10 se não definida
OUTPUT="${OUTPUT:-/tmp/scan-$(date +%s).txt}"
```

Essas quatro formas (`:-`, `:=`, `:?`, `:+`) resolvem 90% dos casos de configuração por
variável de ambiente.

---

## 1.4 Arrays

Bash tem arrays indexados e associativos (a partir do bash 4).

### Arrays indexados

```bash
#!/usr/bin/env bash
set -euo pipefail

HOSTS=(10.0.0.1 10.0.0.2 10.0.0.3)

echo "${HOSTS[0]}"       # primeiro elemento
echo "${#HOSTS[@]}"      # quantidade de elementos: 3
echo "${HOSTS[@]}"       # todos os elementos
echo "${!HOSTS[@]}"      # todos os índices: 0 1 2

for host in "${HOSTS[@]}"; do
    echo "Testando ${host}"
done

HOSTS+=(10.0.0.4)        # append
echo "${HOSTS[-1]}"      # último elemento: 10.0.0.4
```

N O T A A diferença entre `"${HOSTS[@]}"` e `"${HOSTS[*]}"` importa. O primeiro expande cada
elemento como uma palavra separada e preserva espaços internos; o segundo junta tudo numa string
só, separada pelo primeiro caractere de `IFS`. **Sempre use `"${ARRAY[@]}"`** com aspas, a menos
que você tenha um motivo concreto para não usar.

### Arrays associativos

Muito úteis para guardar relação host → serviço:

```bash
#!/usr/bin/env bash
set -euo pipefail

declare -A SERVICOS
SERVICOS["10.0.0.1"]="ssh:22,http:80"
SERVICOS["10.0.0.2"]="https:443"

for host in "${!SERVICOS[@]}"; do
    printf '%-12s %s\n' "${host}" "${SERVICOS[${host}]}"
done
```

A saída de `"${!SERVICOS[@]}"` não tem ordem garantida. Se a ordem importar, ordene:

```bash
for host in $(printf '%s\n' "${!SERVICOS[@]}" | sort); do
    echo "${host}"
done
```

---

## 1.5 Streams, redirecionamento e descritores

Todo processo Unix nasce com três descritores de arquivo:

| Descritor | Nome | Uso |
|---|---|---|
| `0` | stdin | entrada padrão |
| `1` | stdout | saída padrão — *resultado legítimo* |
| `2` | stderr | erros, avisos, progresso — *diagnóstico* |

A separação não é cosmética. Num pipeline de pentest, você frequentemente quer capturar
**resultado** num arquivo e deixar **erro** aparecer no terminal, ou vice-versa.

```bash
# Redireciona só stdout para arquivo; erros continuam na tela
./scan.sh > resultados.txt

# Redireciona só stderr para arquivo
./scan.sh 2> erros.log

# Redireciona ambos
./scan.sh > tudo.txt 2>&1

# Descarta stderr (use com parcimônia — você está escondendo diagnóstico)
./scan.sh 2>/dev/null

# Ambos para lugar nenhum
./scan.sh > /dev/null 2>&1
```

### Ordem importa

```bash
./cmd > arquivo 2>&1   # stdout e stderr vão juntos para arquivo  (correto)
./cmd 2>&1 > arquivo   # stderr vai para a TELA, stdout para arquivo (quase sempre errado)
```

No segundo caso, `2>&1` duplica o stderr para onde o stdout aponta **naquele momento** — o
terminal. Depois o stdout é redirecionado. Ler da esquerda para a direita é a regra.

### O padrão `tee` para log e tela ao mesmo tempo

```bash
./scan.sh 2>&1 | tee -a scan.log
```

Isso mostra na tela e grava no arquivo simultaneamente. Em script, lembre de `pipefail` para
não perder o código de saída do `./scan.sh`.

### A armadilha do subshell

```bash
# Isto NÃO funciona como esperado
CONTADOR=0
cat hosts.txt | while read -r host; do
    CONTADOR=$((CONTADOR + 1))
done
echo "${CONTADOR}"   # imprime 0
```

O lado direito de um pipe roda em subshell, e variáveis de subshell não sobem para o processo pai.
Três correções possíveis:

```bash
# 1. Redirecionamento em vez de pipe (bash 4+)
CONTADOR=0
while read -r host; do
    CONTADOR=$((CONTADOR + 1))
done < hosts.txt
echo "${CONTADOR}"   # correto

# 2. Process substitution
while read -r host; do
    CONTADOR=$((CONTADOR + 1))
done < <(cat hosts.txt)

# 3. Acumular num arquivo temporário e contar depois
cat hosts.txt | while read -r host; do
    echo "${host}" >> /tmp/processados.txt
done
echo "$(wc -l < /tmp/processados.txt)"
```

---

## 1.6 Códigos de saída

Todo comando retorna um inteiro de 0 a 255. `0` significa sucesso; qualquer outro valor significa
falha. `$?` guarda o código do último comando.

```bash
#!/usr/bin/env bash
set -euo pipefail

if grep -q "10.0.0.1" hosts.txt; then
    echo "host presente"
else
    echo "host ausente"
fi

# Convenção: 0 = ok, 1 = erro genérico, 2 = erro de uso
case "$1" in
    ""|-h|--help)
        echo "Uso: $0 <arquivo>"
        exit 2
        ;;
esac
```

### Por que isso define se seu pipeline funciona

Um pipeline que sempre retorna sucesso é um pipeline que mente para você. Se `scan.sh` termina
com `exit 0` mesmo quando não encontrou nada — ou pior, quando falhou — nenhuma automação
construída em cima dele consegue tomar decisão.

**Convenção que vale adotar em todo script seu:**

| Código | Significado |
|---|---|
| `0` | Executou e encontrou resultado |
| `1` | Executou, mas não encontrou resultado |
| `2` | Erro de uso / argumento inválido |
| `3` | Erro de dependência (ferramenta ausente, arquivo inacessível) |

Isso deixa o script montável: `scan.sh alvo.txt && proximo-estagio.sh` só avança quando houve
resultado.

### `trap` — limpeza que sempre acontece

Script que cria arquivo temporário e morre no meio deixa lixo. `trap` resolve:

```bash
#!/usr/bin/env bash
set -euo pipefail

TMPDIR="$(mktemp -d)"
trap 'rm -rf "${TMPDIR}"' EXIT

echo "trabalhando em ${TMPDIR}"
# ... o resto do script
# ao sair, por qualquer motivo, a limpeza roda
```

O `EXIT` cobre saída normal, `exit` explícito e erro com `set -e`. Combine com `INT TERM` quando
quiser capturar Ctrl-C:

```bash
trap 'echo "interrompido"; rm -rf "${TMPDIR}"; exit 130' INT TERM
```

---

## 1.7 Funções e passagem de argumentos

```bash
#!/usr/bin/env bash
set -euo pipefail

log() {
    local nivel="$1"; shift
    printf '[%s] %-5s %s\n' "$(date '+%H:%M:%S')" "${nivel}" "$*" >&2
}

verificar_dependencia() {
    local ferramenta="$1"
    if ! command -v "${ferramenta}" >/dev/null 2>&1; then
        log ERRO "dependência ausente: ${ferramenta}"
        return 3
    fi
}

main() {
    log INFO "iniciando"
    verificar_dependencia nmap || exit 3
    verificar_dependencia jq || exit 3
    log INFO "ambiente ok"
}

main "$@"
```

Pontos que decidem a qualidade do script:

- **`local`** em toda variável de função. Sem isso, você polui o escopo global e cria bug de
  estado compartilhado.
- **`"$@"`** preserva argumentos com espaços. `"$*"` junta tudo numa palavra. Use `"$@"` para
  repassar.
- **`command -v`** em vez de `which`. `which` é programa externo e pode não existir; `command -v`
  é embutido no shell.
- **`return` em funções, `exit` em scripts.** Misturar os dois quebra a composição.
- **`log()` escreve em stderr.** Resultado legítimo vai para stdout; diagnóstico vai para stderr.
  Isso é o que permite `./script.sh > dados.txt` funcionar corretamente.

---

## 1.8 Parseando argumentos com `getopts`

Nada de ler `$1`, `$2`, `$3` na mão. `getopts` é embutido e resolve:

```bash
#!/usr/bin/env bash
#
# hostcheck.sh — verifica disponibilidade de hosts
# Uso: ./hostcheck.sh -f hosts.txt [-t 3] [-o saida.txt]
#
set -euo pipefail

ARQUIVO=""
TIMEOUT=5
SAIDA=""

while getopts ":f:t:o:h" opt; do
    case "${opt}" in
        f) ARQUIVO="${OPTARG}" ;;
        t) TIMEOUT="${OPTARG}" ;;
        o) SAIDA="${OPTARG}" ;;
        h) echo "Uso: $0 -f hosts.txt [-t 5] [-o saida.txt]"; exit 0 ;;
        :) echo "erro: -${OPTARG} exige um valor" >&2; exit 2 ;;
        \?) echo "erro: opção inválida -${OPTARG}" >&2; exit 2 ;;
    esac
done
shift $((OPTIND - 1))

: "${ARQUIVO:?erro: -f é obrigatório}"

if [[ ! -r "${ARQUIVO}" ]]; then
    echo "erro: não consigo ler ${ARQUIVO}" >&2
    exit 3
fi

echo "arquivo=${ARQUIVO} timeout=${TIMEOUT} saida=${SAIDA:-stdout}"
```

O `:` inicial em `":f:t:o:h"` ativa o modo silencioso, que permite o caso `:)` que você está
tratando. E o `:` depois de cada letra significa "esta opção exige valor".

---

## 1.9 LAB — Script de triagem com erro controlado

**Duração:** 60–90 min
**Objetivo:** aplicar tudo o que foi visto, construindo um script que **falha de forma
comportada** e **registra o que aconteceu**.

### Requisitos

Escreva `triage.sh` que:

1. Aceite `-f <arquivo>` com uma lista de hosts (um por linha) e `-o <arquivo>` opcional de saída.
2. Valide a existência e legibilidade do arquivo de entrada.
3. Verifique dependências (`ping`, `timeout`) e aborte com código `3` se faltar alguma.
4. Leia o arquivo linha a linha, ignorando linhas vazias e começando com `#`.
5. Faça ping com timeout curto em cada host.
6. Escreva resultado **em stdout** no formato `host<TAB>status`, e log de progresso **em stderr**.
7. Registre falhas num arquivo de log separado, sem abortar por causa de host individual morto.
8. Termine com código `0` se achou ao menos um host vivo, `1` se não achou nenhum.

### Estrutura inicial sugerida

```bash
#!/usr/bin/env bash
#
# triage.sh — triagem de disponibilidade de hosts
# Uso: ./triage.sh -f hosts.txt [-o vivos.txt]
#
set -euo pipefail

VIVOS=0
MORTOS=0
LOG="triage-$(date +%Y%m%d-%H%M%S).log"

log()  { printf '[%s] %-5s %s\n' "$(date '+%H:%M:%S')" "$1" "$2" >&2; }
falha(){ echo "$*" >> "${LOG}"; }

# ... seu código aqui
```

### Alvo de teste (container local)

Crie um ambiente com hosts que respondem e hosts que não respondem:

```bash
docker network create --subnet 172.28.0.0/24 triage-net 2>/dev/null || true

docker run -d --name alvo1 --network triage-net --ip 172.28.0.10 alpine sleep 3600
docker run -d --name alvo2 --network triage-net --ip 172.28.0.11 alpine sleep 3600

cat > hosts.txt <<'EOF'
# hosts de laboratório — apenas ambiente local isolado
172.28.0.10
172.28.0.11
172.28.0.99   # este não existe, deve falhar
EOF
```

⚠ 172.28.0.0/24 é o seu laboratório. Não aponte este script para faixas que você não criou.

### Critérios de aceitação

- `./triage.sh -f hosts.txt` produz 2 vivos e registra 1 falha.
- `./triage.sh -f naoexiste.txt` retorna código `3`, com mensagem clara em stderr.
- `./triage.sh -f hosts.txt > vivos.txt` escreve só o resultado no arquivo, com progresso na tela.
- `echo $?` depois de rodar sem resultado retorna `1`.
- `shellcheck triage.sh` não aponta erros de nível *error*.

### Limpeza

```bash
docker rm -f alvo1 alvo2
docker network rm triage-net
```

---

## Avaliação

1. Explique, em uma frase cada, o que `set -e`, `set -u` e `set -o pipefail` fazem — e dê um
   exemplo concreto do que quebra sem cada um.
2. Por que `./cmd > arquivo 2>&1` e `./cmd 2>&1 > arquivo` produzem resultados diferentes?
3. O que este script imprime, e por quê?
   ```bash
   X=0
   echo hello | while read -r y; do X=$((X+1)); done
   echo "${X}"
   ```
4. Qual a diferença entre `"${ARR[@]}"` e `"${ARR[*]}"`? Quando a escolha muda o resultado?
5. Escreva a linha de `getopts` que aceita `-d <domínio>` obrigatório e `-v` (flag sem valor).
6. Por que um script de automação deve escrever resultado em stdout e diagnóstico em stderr?
   Dê um exemplo em que misturar os dois quebra um pipeline.
7. O que `: "${VAR:?mensagem}"` faz, e por que é preferível a checar com `if`?

---

**Próximo:** [Módulo 2 — Manipulação de texto e dados](modulo-02.md)
