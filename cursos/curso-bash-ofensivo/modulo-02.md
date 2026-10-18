# Módulo 2 — Manipulação de Texto e Dados

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Filtrar e extrair padrões com `grep` usando expressões regulares.
2. Reescrever texto com `sed`, incluindo substituição com captura de grupos.
3. Extrair e agregar campos com `awk`.
4. Combinar `cut`, `sort`, `uniq`, `tr` e `paste` para normalizar dados.
5. Processar JSON com `jq`, incluindo filtros aninhados e construção de objetos.
6. Converter saída crua de ferramenta num dataset tabular utilizável.

---

## ⚠ Ética

Nenhuma mudança aqui. Os dados que você manipula neste módulo saem de containers que você mesmo
subiu. Trate **todo** dado de cliente em engajamento real como confidencial: minimização,
armazenamento cifrado, destruição ao final.

---

## 2.1 A tese deste módulo

Ferramentas de segurança produzem texto. Muito texto. `nmap` produz texto, `ffuf` produz texto,
`dig` produz texto, APIs produzem JSON. **A diferença entre um pentester que automatiza e um que
copia comando de blog é a capacidade de transformar essa saída em dado estruturado.**

Isso não é uma habilidade periférica. É a habilidade central. Você vai passar mais tempo
processando saída do que executando ferramenta.

---

## 2.2 `grep` — o filtro

```bash
grep "porta" arquivo.txt            # linhas contendo "porta"
grep -i "ERRO" log.txt              # ignora maiúsculas/minúsculas
grep -v "comentario" arquivo.txt    # inverte: linhas que NÃO contêm
grep -c "open" nmap.txt             # conta ocorrências (linhas)
grep -r "password" ./config/        # recursivo em diretório
grep -l "api_key" *.txt             # só lista os arquivos que casam
grep -n "TODO" script.sh            # mostra número da linha
grep -w "open" nmap.txt             # palavra inteira, não substring
grep -F "10.0.0.1:8080" arquivo     # trata o padrão como texto literal
```

### Regex com `-E`

`grep -E` (Extended Regex) é o modo que você usa de verdade:

```bash
# IPv4
grep -Eo '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' saida.txt

# Porta e estado numa linha de nmap
grep -E '^[0-9]+/tcp\s+open' scan.txt

# URL
grep -Eo 'https?://[^ ]+' paginas.txt
```

`-o` imprime **só o trecho que casou**, não a linha inteira. Combinado com regex, é como você
extrai campo de linha suja.

### Um aviso sobre regex

Expressões regulares são poderosas e são a fonte número um de bug silencioso em automação.
O padrão que casa um pouco demais parece funcionar nos seus testes e falha em produção.
Duas defesas:

1. **Sempre teste o padrão contra casos-negativos**, não só contra o que você quer achar.
2. **Prefira `-F` (literal) quando você não precisa de regex.** Um ponto em `10.0.0.1` é
   metacaractere; `grep "10.0.0.1"` casa `10x0y0z1` também.

```bash
# Armadilha
echo "10x0y0z1" | grep "10.0.0.1"     # casa! (o ponto é curinga)

# Correção
echo "10x0y0z1" | grep -F "10.0.0.1"  # não casa
```

---

## 2.3 `sed` — o reescritor

`sed` opera em fluxo, linha a linha. O uso dominante é substituição.

```bash
sed 's/antigo/novo/' arquivo            # primeira ocorrência de cada linha
sed 's/antigo/novo/g' arquivo           # todas as ocorrências (global)
sed -i 's/antigo/novo/g' arquivo        # edita o arquivo no lugar (in-place)
sed -i.bak 's/a/b/g' arquivo            # in-place, guardando backup
sed -n '5,10p' arquivo                  # imprime só as linhas 5 a 10
sed '/^#/d' arquivo                     # remove linhas começando com #
sed 's/[[:space:]]\+/ /g' arquivo       # normaliza espaços múltiplos
```

### Captura de grupos

Aqui `sed` fica realmente útil: rearranjar campos.

```bash
# "10.0.0.1:80" → "http://10.0.0.1:80"
echo "10.0.0.1:80" | sed -E 's#^([^:]+):([0-9]+)$#http://\1:\2#'

# Reformata "Sobrenome, Nome" → "Nome Sobrenome"
echo "Silva, Joao" | sed -E 's/^([^,]+),\s*(.+)$/\2 \1/'
```

Detalhe importante: quando o texto tem barras (URLs, caminhos), **use outro delimitador**.
`sed` aceita qualquer caractere logo após o `s`. No exemplo acima usei `#`.

### Cuidado com `-i` em portabilidade

`sed -i` é uma das maiores dores de portabilidade entre GNU/Linux e BSD/macOS. GNU aceita
`sed -i 's/a/b/'`, BSD exige `sed -i '' 's/a/b/'`. Em script que roda em ambiente misto:

```bash
sed -i.bak 's/a/b/g' arquivo && rm -f arquivo.bak
```

Isso funciona nos dois.

---

## 2.4 `awk` — o extrator e agregador

`awk` é uma linguagem de programação inteira escondida atrás de uma sintaxe curta, e é aqui que
separa quem processa dados de quem luta com `cut`.

### O modelo mental

`awk` divide cada linha em campos por um separador. `$1` é o primeiro campo, `$2` o segundo,
`$0` é a linha inteira, `NF` é o número de campos, `NR` é o número da linha.

```bash
awk '{print $1}' arquivo               # primeiro campo (espaço/tab como separador)
awk -F: '{print $1}' /etc/passwd       # separador é :
awk -F, '{print $2, $4}' dados.csv     # campos 2 e 4 de CSV
awk 'NR > 1' dados.csv                 # pula o cabeçalho
awk 'NF > 0' arquivo                   # só linhas não vazias
awk '{print $NF}' arquivo              # último campo
```

### Filtrando com condição

```bash
awk -F: '$3 >= 1000 {print $1}' /etc/passwd      # usuários com UID >= 1000
awk '/open/ {print $1}' nmap.txt                 # linha contendo "open"
awk '$1 ~ /^10\./ {print}' hosts.txt             # primeiro campo começando com 10.
awk '!($0 in visto) { visto[$0]=1; print }' a.txt  # deduplica preservando ordem
```

### Agregando

Este é o motivo pelo qual `awk` ganha de `cut`:

```bash
# Contagem por valor — equivale a sort | uniq -c, em uma passada
awk -F, 'NR>1 {c[$3]++} END {for (k in c) print c[k], k}' acessos.csv | sort -rn

# Soma de uma coluna
awk -F, 'NR>1 {s+=$4} END {print s}' vendas.csv

# Média
awk -F, 'NR>1 {s+=$4; n++} END {printf "%.2f\n", s/n}' vendas.csv

# Múltiplas estatísticas de uma vez
awk -F, 'NR>1 { if($4>max) max=$4; if(min==""||$4<min) min=$4; s+=$4; n++ }
         END { printf "n=%d min=%s max=%s media=%.2f\n", n, min, max, s/n }' dados.csv
```

### `awk` com múltiplos separadores

Muito comum em saída de varredura mista:

```bash
# Trata ":", "/" e "," como separadores
awk -F'[:,/]' '{print $1, $2}' scan.txt
```

---

## 2.5 O kit de normalização: `cut`, `sort`, `uniq`, `tr`

```bash
cut -d: -f1 arquivo              # campo 1, separador :
cut -c1-20 arquivo               # primeiros 20 caracteres
cut -d, -f2,4 dados.csv          # campos 2 e 4

sort arquivo                     # ordenação alfabética
sort -n arquivo                  # numérica  ← esquecer o -n é erro clássico
sort -rn arquivo                 # numérica reversa
sort -u arquivo                  # ordena e remove duplicatas
sort -t: -k3 -n /etc/passwd      # campo 3, numérico, separador :
sort -k1,1 -k2,2nr arquivo       # ordenação multi-chave

uniq -c arquivo                  # conta ocorrências (só adjacentes!)
uniq -d arquivo                  # só duplicados
uniq -u arquivo                  # só únicos

tr '[:upper:]' '[:lower:]'       # minúsculas
tr -d '\r'                       # remove CR (arquivos de Windows)
tr -s ' '                        # comprime espaços repetidos
tr ',' '\t'                      # converte CSV em TSV
```

N O T A **`uniq` só funciona em linhas adjacentes.** `uniq -c` sem `sort` antes dá resultado
errado. `sort | uniq -c` é o idioma correto, e é o que todo mundo escreve.

### Dois utilitários que economizam tempo

```bash
# Números aleatórios para ID de tarefa
shuf -i 1-1000 -n 5

# Intercalar arquivos linha a linha
paste -d, hosts.txt portas.txt

# Rodar em fatias (útil pra dividir wordlist entre processadores)
split -n l/4 wordlist.txt parte-
```

---

## 2.6 `jq` — JSON sem sofrimento

APIs de segurança respondem JSON. `jq` é o padrão de fato para processá-lo no shell.

```bash
# Requer um arquivo de exemplo — criamos um abaixo
jq '.' dados.json                       # formata bonito
jq -r '.nome' dados.json                # raw (sem aspas)
jq '.servidores[0]' dados.json          # primeiro elemento
jq '.servidores[] | .ip' dados.json     # itera array
jq -r '.servidores[].ip' dados.json     # um IP por linha
jq '.servidores | length' dados.json    # tamanho do array
jq 'keys' dados.json                    # chaves do objeto raiz
jq -r '.servidores[] | select(.porta==443) | .ip' dados.json
jq 'has("nome")' dados.json
```

### Construindo JSON com `jq`

Subestimado. `jq` também **gera** JSON, o que torna seus scripts composáveis:

```bash
jq -n --arg host "10.0.0.1" --argjson porta 443 \
   '{host: $host, porta: $porta, estado: "aberta"}'
```

Saída:

```json
{
  "host": "10.0.0.1",
  "porta": 443,
  "estado": "aberta"
}
```

### Tratando entrada inválida

```bash
if ! jq empty dados.json 2>/dev/null; then
    echo "JSON inválido" >&2
    exit 1
fi
```

### O idioma `-c` para processar em streaming

`jq -c` emite um objeto compacto por linha — perfeito para encadear com `while read`:

```bash
jq -c '.servidores[]' dados.json | while read -r srv; do
    ip=$(jq -r '.ip' <<< "${srv}")
    echo "processando ${ip}"
done
```

---

## 2.7 LAB — De saída crua a tabela limpa

**Duração:** 90 min
**Objetivo:** pegar saída realista de varredura e produzir um dataset tabular utilizável.

### Passo 1 — Gere a saída crua

```bash
docker run -d --name alvo-www --network host nginx:alpine 2>/dev/null || true
mkdir -p lab2 && cd lab2

nmap -sV -oG scan.gnmap 127.0.0.1 > /dev/null 2>&1 || true
nmap -sV 127.0.0.1 > scan.txt 2>/dev/null
cat scan.txt
```

Se você não tiver `nmap` instalado ainda, gere um arquivo de amostra representativo:

```bash
cat > scan.txt <<'EOF'
Starting Nmap ( https://nmap.org ) at 2026-01-15 10:00 -03
Nmap scan report for localhost (127.0.0.1)
Host is up (0.00010s latency).
Not shown: 997 closed tcp ports (conn-refused)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.2p1 Debian 2+deb12u2
80/tcp   open  http    nginx 1.24.0
5432/tcp open  postgresql PostgreSQL DB 15.4
Nmap done: 1 IP address (1 host up) scanned in 3.21 seconds
EOF
```

### Passo 2 — Extraia a tabela

Escreva `parse-scan.sh` que produz, **em stdout**, uma tabela TSV com cabeçalho:

```
host	porta	protocolo	servico	versao
```

Requisitos:

- Ignore as linhas de cabeçalho e rodapé do nmap.
- Só inclua linhas cujo estado seja `open`.
- A versão pode conter espaços — deve ficar num campo só.
- Nada de `grep | cut | cut | cut` encadeado: use `awk` com um separador adequado.

Esqueleto:

```bash
#!/usr/bin/env bash
set -euo pipefail

ARQ="${1:?uso: parse-scan.sh <arquivo-nmap>}"
HOST="desconhecido"

printf 'host\tporta\tprotocolo\tservico\tversao\n'

while IFS= read -r linha; do
    if [[ "${linha}" =~ ^Nmap\ scan\ report\ for\ (.+) ]]; then
        HOST="${BASH_REMATCH[1]}"
        continue
    fi

    # PORT STATE SERVICE VERSION
    if [[ "${linha}" =~ ^([0-9]+)/([a-z]+)[[:space:]]+open[[:space:]]+([^[:space:]]+)[[:space:]]*(.*)$ ]]; then
        printf '%s\t%s\t%s\t%s\t%s\n' \
            "${HOST}" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" \
            "${BASH_REMATCH[3]}" "${BASH_REMATCH[4]}"
    fi
done < "${ARQ}"
```

N O T A Repare que usei `[[ =~ ]]` (regex nativo do bash) em vez de `grep` aqui. Em loop linha a
linha, invocar `grep` como subprocesso para cada linha é ordens de magnitude mais lento. Regex do
bash fica em memória. Guarde essa ideia — ela volta com força no Módulo 3.

### Passo 3 — Agregue

Com a tabela gerada, responda usando **uma linha de `awk` cada**:

1. Quantos serviços abertos por host?
2. Quais serviços aparecem mais de uma vez?
3. Liste as portas abertas em ordem numérica crescente.

```bash
./parse-scan.sh scan.txt > servicos.tsv

awk -F'\t' 'NR>1 {c[$1]++} END {for (h in c) print h, c[h]}' servicos.tsv
awk -F'\t' 'NR>1 {print $4}' servicos.tsv | sort | uniq -c | sort -rn
awk -F'\t' 'NR>1 {print $2}' servicos.tsv | sort -n | uniq
```

### Passo 4 — Exporte JSON

Acrescente `--json` ao script para emitir o mesmo dataset em JSON Lines, usando `jq -n`:

```bash
printf '{"host":"%s","porta":%s,"protocolo":"%s","servico":"%s","versao":"%s"}\n' \
    "${HOST}" "${porta}" "${proto}" "${servico}" "${versao}"
```

### Critérios de aceitação

- `./parse-scan.sh scan.txt | column -t -s$'\t'` mostra tabela alinhada e legível.
- Linhas de rodapé do nmap não aparecem.
- Serviços com versão de múltiplas palavras ficam íntegros no último campo.
- `./parse-scan.sh scan.txt | awk -F'\t' 'NR>1' | wc -l` retorna 3 no arquivo de amostra.
- `shellcheck parse-scan.sh` sem erros de nível *error*.

### Limpeza

```bash
docker rm -f alvo-www 2>/dev/null || true
```

---

## Avaliação

1. Por que `grep "10.0.0.1"` pode casar a string `10x0y0z1`? Como evitar?
2. O que `sed -E 's#^([^:]+):([0-9]+)$#\1 porta \2#'` faz com a entrada `10.0.0.1:443`?
   Por que o delimitador `#` foi usado?
3. Qual a diferença prática entre `awk '{print $1}'` e `cut -d' ' -f1`? Cite um caso em que
   um funciona e o outro não.
4. Por que `uniq -c` sem `sort` antes produz resultado incorreto?
5. Escreva um comando `awk` de uma linha que imprima quantas vezes cada IP aparece na coluna 1
   de um arquivo, ordenado do mais frequente para o menos.
6. Como você valida se um arquivo é JSON válido antes de passar para `jq`, sem que o script
   aborte com `set -e`?
7. Em um loop que lê 50.000 linhas, por que usar `[[ =~ ]]` em vez de `grep` muda o tempo de
   execução de minutos para segundos?

---

**Próximo:** [Módulo 3 — Concorrência e performance](modulo-03.md)
