# Módulo 3 — Concorrência e Performance

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Entender por que I/O bloqueante domina o tempo de scripts de reconhecimento.
2. Paralelizar com background jobs, `wait` e controle de jobs.
3. Usar `xargs -P` e `GNU parallel` com limites de concorrência.
4. Evitar corridas de escrita (race condition) em arquivo compartilhado.
5. Saber escolher o nível de paralelismo para não derrubar o alvo nem a própria máquina.

---

## ⚠ Ética

Paralelismo tem uma dimensão ética que quase ninguém ensina: **a diferença entre varredura
e negação de serviço é o volume**. Um pipeline com 500 conexões simultâneas derruba um servidor
pequeno. Isso deixa de ser teste e passa a ser indisponibilidade — art. 266 do Código Penal.

**Regra prática:** em engajamento real, o nível de concorrência é definido com o cliente e escrito
na regra de engajamento. Se não está escrito, use o valor mais conservador possível.

---

## 3.1 O problema

Script sequencial que faz uma requisição por vez:

```bash
for host in $(seq 1 254); do
    timeout 1 ping -c 1 "10.0.0.${host}" > /dev/null 2>&1 && echo "10.0.0.${host}"
done
```

254 hosts × até 1 segundo de timeout = **até 4 minutos** só de espera. A CPU fica ociosa 99%
do tempo: o script está esperando rede, não calculando. Isso é I/O-bound, e é o caso onde
paralelismo dá ganho quase linear.

Com 50 processos simultâneos, os mesmos 254 hosts levam poucos segundos.

### `time` é a sua medida

Nunca estime — meça. Todo lab deste módulo compara sequencial vs. paralelo com `time`.

```bash
time ./script-sequencial.sh > /dev/null
```

---

## 3.2 Nível 1 — Background jobs e `wait`

O mecanismo mais básico e o mais fácil de errar.

```bash
#!/usr/bin/env bash
set -euo pipefail

pids=()

for host in $(seq 1 20); do
    (
        resultado=$(timeout 1 ping -c 1 "127.0.0.${host}" >/dev/null 2>&1 && echo "vivo" || echo "morto")
        echo "${host} ${resultado}"
    ) >> saida.txt &
    pids+=($!)
done

for pid in "${pids[@]}"; do
    wait "${pid}" || true
done

echo "concluído: $(wc -l < saida.txt) hosts processados"
```

### O que está acontecendo

- `( ... ) &` roda o bloco em subshell em background.
- `$!` é o PID do último job em background.
- `wait` bloqueia até o processo terminar. Sem ele, o script pode terminar antes dos filhos.
- `|| true` impede que `set -e` aborte quando um filho retorna não-zero.

### A armadilha sem controle de vazão

Sem limite, o loop acima dispararia **20.000** processos se a lista tivesse 20.000 linhas. O
sistema entra em thrashing, e se o alvo for remoto, você acabou de criar um ataque de negação
de serviço acidental — tanto contra o alvo quanto contra a sua própria máquina.

Nunca dispare paralelismo sem limite superior. Veja a próxima seção.

---

## 3.3 Nível 2 — `xargs -P`: o caminho mais simples

`xargs -P` é a forma mais curta de paralelizar com limite:

```bash
#!/usr/bin/env bash
set -euo pipefail

# -P 20        até 20 processos simultâneos
# -n 1         um argumento por invocação
# -I {}        substituição explícita
seq 1 254 \
  | xargs -P 20 -I {} sh -c 'timeout 1 ping -c 1 "10.0.0.{}" >/dev/null 2>&1 && echo "10.0.0.{}"' \
  > vivos.txt

echo "vivos: $(wc -l < vivos.txt)"
```

Pontos que importam:

| Flag | Efeito |
|---|---|
| `-P N` | número máximo de processos simultâneos |
| `-n N` | quantos argumentos passar por invocação |
| `-I {}` | placeholder explícito; implica `-n 1` e desabilita otimizações |
| `-0` | entrada separada por NUL (combine com `find -print0`) |
| `-r` | não executa nada se a entrada for vazia (evita invocação fantasma) |

### `-P 0` é perigoso

`xargs -P 0` significa "tantos quantos o sistema aguentar". Em máquina com muitos núcleos,
isso é um fork bomb comportado. **Use um número explícito.**

### Com `xargs`, ordem de saída não é garantida

A saída sai na ordem em que os processos terminam, não na ordem da entrada. Se ordem importa,
numerar as linhas antes ou ordenar depois:

```bash
seq 1 254 | xargs -P 20 -I {} sh -c 'echo "{} $(timeout 1 ping -c 1 10.0.0.{} >/dev/null 2>&1 && echo vivo || echo morto)"' \
  | sort -n -k1,1
```

---

## 3.4 Nível 3 — `GNU parallel`

`parallel` faz tudo o que `xargs` faz e mais: retomada, log por job, balanceamento, saída ordenada.

```bash
seq 1 254 | parallel -j 20 --timeout 1 -q \
    'ping -c 1 10.0.0.{} >/dev/null 2>&1 && echo "10.0.0.{}"'

# Saída NA ORDEM da entrada — resolve o problema do xargs
seq 1 100 | parallel -j 20 -k 'echo "item {}" | md5sum'

# Retomada: pula jobs já concluídos com sucesso no arquivo de registro
seq 1 1000 | parallel -j 20 --joblog progresso.log --resume 'do-something {}'

# Progresso visual
seq 1 1000 | parallel -j 20 --bar 'do-something {}'
```

### Por que `--timeout` do `parallel` é melhor que `timeout`

O `--timeout` do `parallel` mede o tempo por job e mata o job e seus filhos. O `timeout` externo
só mata o processo que ele iniciou — descendentes podem sobreviver e continuar consumindo.

### `--resume` é o recurso que muda vidas

Recon grande leva horas. Se cair no meio, você não quer recomeçar do zero.

```bash
parallel -j 20 --joblog recon.log --resume 'ping -c1 10.0.0.{}' ::: $(seq 1 254)
```

Rodar de novo pula tudo que já saiu com código 0 no log.

### Comparativo

| Critério | `xargs -P` | `GNU parallel` |
|---|---|---|
| Instalação | presente em todo Linux | precisa instalar |
| Ordem de saída | não controlada | `-k` preserva |
| Retomada | não | `--resume` |
| Timeout por job | via `timeout` externo | `--timeout` nativo |
| Log por job | manual | `--joblog` |
| Progresso | manual | `--bar`, `--eta` |

**Escolha:** `xargs -P` para o caso simples e ambiente onde você não controla o que está
instalado. `GNU parallel` quando o job é longo e a retomada importa.

---

## 3.5 A corrida de escrita

Aqui mora o bug que mais custa tempo em pipeline paralelo.

```bash
# PERIGOSO
for i in $(seq 1 100); do
    ( echo "resultado ${i}" >> resultados.txt ) &
done
wait
```

Parece certo e geralmente funciona — mas não é atômico. Em sistemas de arquivos com append
não-atômico (NFS, alguns FUSE), duas escritas simultâneas podem intercalar bytes e corromper
a linha. O arquivo fica com lixo que só aparece depois, em produção.

### Solução 1 — um arquivo por job, concatenar depois

A mais robusta:

```bash
#!/usr/bin/env bash
set -euo pipefail

SAIDA="$(mktemp -d)"
trap 'rm -rf "${SAIDA}"' EXIT

paralelo_item() {
    local i="$1"
    echo "resultado ${i}" > "${SAIDA}/${i}.txt"
}
export -f paralelo_item
export SAIDA

seq 1 100 | xargs -P 20 -I {} bash -c 'paralelo_item {}'

cat "${SAIDA}"/*.txt | sort -V > resultados.txt
echo "linhas: $(wc -l < resultados.txt)"
```

Note `export -f` e `export SAIDA` — sem isso, o subshell iniciado por `xargs` não vê a função
nem a variável. `set -u` tornaria isso um erro barulhento, que é o comportamento desejado.

### Solução 2 — processo agregador único

Produtor gera, consumidor único escreve. Ordem garantida, arquivo único:

```bash
#!/usr/bin/env bash
set -euo pipefail

{
    for i in $(seq 1 100); do
        ( echo "resultado ${i}" ) &
    done
    wait
} | sort -n | tee resultados.txt > /dev/null

echo "linhas: $(wc -l < resultados.txt)"
```

Aqui o `|` serializa a escrita num único consumidor. Simples e correto quando a saída cabe
em memória.

### Solução 3 — `flock`

Quando você precisa mesmo de múltiplos processos escrevendo no mesmo arquivo:

```bash
exec 9>>resultados.txt
flock 9
echo "linha protegida" >> resultados.txt
exec 9>&-
```

Ou, mais prático:

```bash
flock resultados.lock -c 'echo "linha" >> resultados.txt'
```

`flock` é bloqueio cooperativo: só funciona se **todos** os escritores usarem. Se um deles
não usar, a proteção não existe.

### Qual usar

| Cenário | Escolha |
|---|---|
| Muitos jobs, saída pequena | Processo agregador único |
| Muitos jobs, saída grande ou ordem importa | Arquivo por job + concatenação |
| Escritores concorrentes inevitáveis | `flock` |
| Volume enorme, dados estruturados | Cada job grava JSON Lines; agregar depois com `jq -s` |

---

## 3.6 Escolhendo o nível de paralelismo

Não existe um número universal. Existe um raciocínio:

| Fator | Efeito no número |
|---|---|
| Tarefa espera rede | pode subir (50, 100) |
| Tarefa faz CPU local | limite pelos núcleos (`nproc`) |
| Alvo é servidor frágil | desça drasticamente (5, 10) |
| Você está em VPN | latência alta; muito paralelismo ajuda |
| Alvo tem IDS/IPS | muito paralelismo gera alerta — e o engajamento pode exigir discrição |
| Você está em máquina pequena | `ulimit -n` limita file descriptors; monitore |

```bash
# Baseie-se nos núcleos para CPU-bound
JOBS="$(nproc)"

# Valor conservador por padrão para rede
JOBS="${JOBS:-10}"

echo "rodando com ${JOBS} jobs"
```

N O T A Você pode aumentar `ulimit -n` para permitir mais conexões simultâneas, mas isso
multiplica o impacto no alvo. A pergunta certa não é "quantas conexões eu aguento?" e sim
"quantas este alvo suporta e esta regra de engajamento permite?".

---

## 3.7 LAB — Varredura paralela com saída à prova de corrida

**Duração:** 90 min
**Objetivo:** medir com números o ganho do paralelismo, e provar que a saída não corrompe.

### Passo 1 — Ambiente

```bash
docker network create --subnet 172.29.0.0/24 par-net 2>/dev/null || true

for i in $(seq 10 40); do
    docker run -d --name "no${i}" --network par-net --ip "172.29.0.${i}" alpine sleep 900 >/dev/null
done
docker ps --format '{{.Names}}' | grep '^no' | wc -l   # deve mostrar 31
```

⚠ A faixa `172.29.0.0/24` é alvo exclusivo deste laboratório. Não reutilize estes scripts
apontando para outra rede.

### Passo 2 — Versão sequencial

```bash
cat > seq.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
for i in $(seq 10 40); do
    if timeout 1 ping -c 1 "172.29.0.${i}" >/dev/null 2>&1; then
        echo "172.29.0.${i}"
    fi
done
EOF
chmod +x seq.sh

time ./seq.sh > seq-saida.txt
wc -l < seq-saida.txt
```

Anote o tempo real. Este é o seu baseline.

### Passo 3 — Versão paralela com `xargs -P`

```bash
cat > par.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
JOBS="${1:-20}"
seq 10 40 | xargs -P "${JOBS}" -I {} sh -c \
  'timeout 1 ping -c 1 "172.29.0.{}" >/dev/null 2>&1 && echo "172.29.0.{}"'
EOF
chmod +x par.sh

time ./par.sh 20 > par-saida.txt
```

### Passo 4 — Prove que a saída é íntegra

Compare as duas saídas. **Elas têm que ser idênticas depois de ordenadas.**

```bash
sort seq-saida.txt > a.txt
sort par-saida.txt > b.txt
diff a.txt b.txt && echo "OK: saídas idênticas"

# Deve ter 31 linhas, e todas devem ser IPv4 válido
wc -l < par-saida.txt
grep -cvE '^172\.29\.0\.([0-9]{1,3})$' par-saida.txt   # deve imprimir 0
```

O `grep -c` com `-v` conta linhas que **não** casam o formato. Zero é o resultado esperado —
qualquer linha corrompida apareceria aqui.

### Passo 5 — Varra o número de jobs

```bash
for j in 1 5 20 50; do
    printf 'jobs=%-3s ' "${j}"
    /usr/bin/time -f '%e s' ./par.sh "${j}" > /dev/null
done
```

Você deveria ver ganho forte até ~20 e depois começar a achatar. Explique por quê com números:
com 31 hosts e timeout de 1s, o limite inferior é o tempo de uma rodada de ping (≈1s) desde que
`jobs >= 31`. Acima disso, não há o que ganhar.

### Passo 6 — Teste de corrida com `parallel --resume`

```bash
seq 10 40 | parallel -j 20 --joblog lab3.log --bar 'echo "172.29.0.{}"' > /dev/null
wc -l < lab3.log

# Rode de novo — deve pular tudo com sucesso registrado
seq 10 40 | parallel -j 20 --joblog lab3.log --resume 'echo "172.29.0.{}"' | wc -l
```

### Critérios de aceitação

- `diff` entre as saídas ordenadas não aponta diferença.
- A contagem de linhas inválidas é `0`.
- Você tem uma tabela com o tempo das quatro configurações de `jobs`.
- O script sequencial e o paralelo retornam código `0` com `set -euo pipefail` ativo.
- `shellcheck seq.sh par.sh` sem erros de nível *error*.

### Limpeza

```bash
docker ps --format '{{.Names}}' | grep '^no' | xargs -r docker rm -f
docker network rm par-net
```

---

## Avaliação

1. Por que uma tarefa que espera rede ganha quase linearmente com paralelismo, e uma que calcula
   não? Relacione com núcleos de CPU.
2. O que acontece se você usar `xargs -P 0` numa máquina com 8 núcleos e um alvo remoto? Descreva
   o efeito nos dois lados.
3. Por que `echo >> arquivo` em background pode corromper a saída, e em qual sistema de arquivos
   isso se manifesta mais?
4. Explique o papel de `export -f` e `export VAR` quando você chama uma função bash a partir de
   `xargs -I {} bash -c '...'`.
5. Qual a diferença entre `timeout` externo e `--timeout` do `parallel` quando o job gera
   processos filhos?
6. Você tem 50.000 hosts, tarefa de 2 segundos cada, alvo em VPN com regra de engajamento
   limitando a 15 conexões simultâneas. Quantos jobs você usa? Que tempo total você espera,
   em ordem de grandeza?
7. Descreva três situações em que aumentar o paralelismo é **a decisão errada**.

---

**Próximo:** [Módulo 4 — Automação de rede](modulo-04.md)
