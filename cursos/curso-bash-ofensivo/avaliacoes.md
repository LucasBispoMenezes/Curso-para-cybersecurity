# Avaliações — Gabaritos e Critérios

Gabaritos comentados das avaliações dos seis módulos, mais critérios de correção dos labs e do
projeto final.

---

## Módulo 1 — Fundamentos de shell ofensiva

**1. `set -e`, `set -u`, `set -o pipefail`**

- `-e`: aborta o script quando um comando retorna código não-zero. Sem ele, o script segue
  operando com dados inválidos — o erro aparece 40 linhas depois, num lugar sem relação.
- `-u`: trata variável não definida como erro. Sem ele, `${VAR}` vazio vira string vazia e um
  `rm -rf ${DIR}/` mal escrito vira desastre.
- `-o pipefail`: faz o código de saída do pipeline ser o do último comando que falhou. Sem ele,
  `cat inexistente | wc -l` retorna sucesso (código do `wc`), escondendo a falha do `cat`.

**2. `> arquivo 2>&1` vs. `2>&1 > arquivo`**

Leitura da esquerda para a direita. No primeiro, stdout vai para `arquivo`, e `2>&1` duplica o
stderr para onde o stdout aponta **naquele momento** — o arquivo. Ambos vão para o arquivo.
No segundo, `2>&1` duplica o stderr para onde o stdout aponta naquele momento — **o terminal**.
Depois o stdout é redirecionado. Resultado: erro na tela, resultado no arquivo.

**3. O subshell**

Imprime `0`. O lado direito do pipe roda em subshell, e atribuições em subshell não sobem para
o processo pai. Correção: `while ... done < hosts.txt` ou process substitution.

**4. `"${ARR[@]}"` vs. `"${ARR[*]}"`**

`[@]` expande cada elemento como palavra separada, preservando espaços internos. `[*]` junta
tudo numa string, separada pelo primeiro caractere de `IFS`. Com `for x in "${ARR[*]}"`, um
elemento `"dois termos"` vira duas iterações. Use sempre `"${ARR[@]}"`.

**5. `getopts`**

```bash
while getopts ":d:v" opt; do
    case "${opt}" in
        d) DOMINIO="${OPTARG}" ;;
        v) VERBOSE=1 ;;
        :) echo "erro: -${OPTARG} exige valor" >&2; exit 2 ;;
        \?) echo "erro: opção inválida" >&2; exit 2 ;;
    esac
done
shift $((OPTIND - 1))
: "${DOMINIO:?erro: -d é obrigatório}"
```

**6. stdout vs. stderr**

Resultado é o dado que o script produz; diagnóstico é o que você (humano) precisa saber sobre a
execução. Se progresso e resultado saem juntos, `./scan.sh > alvos.txt` grava "varrerando... 3
hosts encontrados" no arquivo de alvos, e a próxima etapa do pipeline processa lixo. Exemplo:
`./scan.sh > alvos.txt` e depois `while read h; do ping "$h"; done < alvos.txt` — com log
misturado, o script tenta pingar a palavra "varrerando".

**7. `: "${VAR:?mensagem}"`**

Aborta com a mensagem se `VAR` estiver vazia ou não definida. É preferível a `if` porque é uma
expressão única, funciona com `set -e`, e comunica a intenção na linha onde a variável é exigida,
não 20 linhas depois.

---

## Módulo 2 — Manipulação de texto e dados

**1. `10x0y0z1`**

O ponto é metacaractere de regex e casa qualquer caractere. `grep "10.0.0.1"` casa
`10x0y0z1`. Correção: `grep -F` (literal) ou escapar os pontos.

**2. `sed -E 's#^([^:]+):([0-9]+)$#\1 porta \2#'`**

Entrada `10.0.0.1:443` → saída `10.0.0.1 porta 443`. O delimitador `#` foi usado porque o texto
contém `/` (em URLs e caminhos), e usar `/` como delimitador exigiria escapar cada ocorrência.

**3. `awk '{print $1}'` vs. `cut -d' ' -f1`**

`cut -d' '` trata **cada** espaço como separador: com `10.0.0.1   ssh` (dois espaços), o campo 1
sai correto mas o campo 2 sai vazio. `awk` colapsa espaços consecutivos por padrão, então
`awk '{print $2}'` devolve `ssh`. Para saída de ferramenta com espaçamento irregular, `awk` é
a escolha certa.

**4. `uniq` sem `sort`**

`uniq` só remove linhas **adjacentes** iguais. Sem ordenar, duplicatas separadas por outras
linhas sobrevivem. `sort | uniq -c` é o idioma correto.

**5. Contagem por IP**

```bash
awk '{c[$1]++} END {for (ip in c) print c[ip], ip}' arquivo | sort -rn
```

**6. Validar JSON sem abortar**

```bash
if ! jq empty dados.json 2>/dev/null; then
    echo "JSON inválido" >&2
    exit 1
fi
```

O `if` protege do `set -e`, porque um comando em condição de `if` não dispara a saída automática.

**7. `[[ =~ ]]` vs. `grep` em loop**

Cada invocação de `grep` cria um processo novo — `fork` + `exec` + carregamento do binário. Em
50.000 linhas, isso são 50.000 processos. `[[ =~ ]]` é embutido no próprio bash, executando em
memória. A diferença observada é de minutos para segundos.

---

## Módulo 3 — Concorrência e performance

**1. I/O-bound vs. CPU-bound**

Tarefa de rede passa a maior parte do tempo **esperando**, com a CPU ociosa. Vários processos
esperando ao mesmo tempo cabem confortavelmente numa CPU. Tarefa de cálculo disputa núcleos:
acima de `nproc`, o ganho desaparece e depois inverte, por conta do custo de troca de contexto.

**2. `xargs -P 0`**

Significa "sem limite" — um processo por item. Com 8 núcleos e uma lista grande, o sistema local
entra em thrashing. No alvo remoto, centenas de conexões simultâneas derrubam o serviço ou
disparam proteção. Isso deixa de ser teste e passa a ser indisponibilidade.

**3. Corrida em `echo >> arquivo`**

`>>` abre, escreve e fecha. Não é atômico entre processos: duas escritas concorrentes podem
intercalar bytes no meio de uma linha. Manifesta-se mais em sistemas de arquivos de rede (NFS)
e FUSE, onde a atomicidade de append não é garantida. O sintoma é lixo que só aparece em produção.

**4. `export -f` e `export VAR`**

`xargs` inicia um bash novo. Esse processo não herda funções nem variáveis não exportadas.
`export -f funcao` exporta a definição da função; `export VAR` exporta o valor. Sem isso, o
filho não encontra nem a função nem a variável — com `set -u`, falha barulhenta (desejável);
sem, falha silenciosa.

**5. `timeout` externo vs. `--timeout` do `parallel`**

`timeout` mata só o processo que ele iniciou. Descendentes sobrevivem e continuam consumindo.
`--timeout` do `parallel` mata o job e seu grupo de processos.

**6. 50.000 hosts, 2s cada, 15 conexões**

15 jobs × 2s = 30 hosts a cada 2s ≈ 15 hosts/s. 50.000 / 15 ≈ 3.333 segundos ≈ **cerca de 1
hora** (ordem de grandeza). Sem o limite, seria questão de minutos — e fora da regra de engajamento.

**7. Três situações em que aumentar paralelismo é errado**

- Regra de engajamento com limite explícito (aumentar é quebra de contrato).
- Alvo frágil ou com IDS/IPS onde volume gera alerta e o engajamento exige discrição.
- Tarefa CPU-bound acima do número de núcleos (o ganho é negativo).
- Também vale citar: quando o alvo é mediado por VPN com fila, ou quando você esgota
  `ulimit -n` e passa a ver falhas de "too many open files" que parecem erro de rede.

---

## Módulo 4 — Automação de rede

**1. `exec 3<>/dev/tcp/...`**

O bash abre um socket TCP e associa ao descritor 3 (aberto para leitura e escrita). A conexão
é tentada no momento da abertura. Fechar é obrigatório porque cada descritor é recurso finito:
num loop de 10.000 portas, descritores não fechados esgotam o limite e o script começa a falhar
com erro que parece de rede.

**2. Timeout em `/dev/tcp`**

Envolvendo em `timeout N bash -c '...'`. Matar o `bash -c` filho funciona melhor porque o script
principal continua vivo: você recebe um código `124` e segue para a próxima porta. Matar o pai
encerraria o pipeline inteiro.

**3. `curl -w` vs. parsing do cabeçalho**

`-w '%{http_code}'` é campo documentado e estável. Parsing de `HTTP/1.1 200 OK` quebra na
primeira resposta inesperada: `HTTP/2`, resposta com múltiplos blocos por causa de redirect,
resposta com quebra de linha diferente, output mesclado com stderr.

**4. Erro de rede vs. erro de aplicação**

Erro de rede: o `curl` falha — DNS não resolve, conexão recusada, timeout. Nenhum status HTTP.
Erro de aplicação: o `curl` tem sucesso — status 404, 500. Tratar igual faz um servidor fora do
ar e uma página inexistente virarem o mesmo "falhou", o que impede qualquer decisão.

**5. 4xx sem retry, 5xx com retry**

4xx é resposta definitiva: o recurso não existe ou o cliente não tem acesso — repetir produz o
mesmo resultado e só gera carga. 5xx é falha do servidor e frequentemente transitória; retry com
backoff resolve e é o comportamento esperado de qualquer cliente HTTP.

**6. `/dev/tcp` — limitações e vantagens**

Limitações: só diz aberta/fechada (não detecta serviço nem versão); não distingue `closed` de
`filtered`; sem timeout nativo; sem controle fino de timing. Vantagens: não depende de binário
externo; gera SYN sem assinatura de ferramenta; controle total sobre cada detalhe.

**7. 200 endpoints, 8 conexões, timeout 10s**

Tempo mínimo teórico: 200 / 8 = 25 rodadas × 10s = **250 segundos** (≈ 4 min) no pior caso, se
todos derem timeout. Estrutura: fila de endpoints alimentando pool fixo de 8 workers, sem
retry que multiplique rodadas, com métricas por endpoint e log de progresso em stderr
para você poder estimar andamento.

---

## Módulo 5 — Automação de reconhecimento

**1. Formato único por estágio**

Permite testar cada estágio isolado com entrada simulada, permite recombinar estágios, e permite
substituir uma ferramenta sem reescrever o resto. Quando algo sai errado, você sabe qual script
consertar — sem isso, um recon de 4 estágios vira um bloco monolítico onde o bug pode estar em
qualquer lugar.

**2. `awk '!visto[$0]++'` vs. `sort | uniq`**

`awk` deduplica **preservando a ordem original** e mantendo a primeira ocorrência, em memória.
`sort | uniq` ordena a saída — o que muda a ordem — e usa disco para ordenação. Use `awk` quando
ordem importa; `sort -u` quando o volume é grande demais para memória.

**3. Código `124`**

É o código que o `timeout` usa quando mata o processo. Tratá-lo separado permite distinguir
"ferramenta travou" de "ferramenta falhou com erro". A ação correta difere: travamento em
ferramenta de rede pode significar alvo com filtragem, não erro seu.

**4. CNAME relevante**

Quando revela infraestrutura fora do escopo nominal: `api.exemplo.local` → load balancer de
outro provedor. O A record mostra só um IP; o CNAME mostra o provedor, o ambiente (`-prod`,
`-stg`), e às vezes o nome do projeto. Também ajuda a identificar subdomínios irmãos por padrão
de nome.

**5. Resolvedor público com 50.000 consultas**

Técnicas: você gera tráfego que parece ataque de amplificação; seu IP é bloqueado; os resultados
podem vir inconsistentes por cache; latência e perda de pacote distorcem a medição. Éticas: você
consome recurso de terceiro não incluído no escopo; gera alerta em quem opera aquele resolvedor;
viola termos de uso de praticamente todo serviço público de DNS.

**6. Contagem de fontes como priorização**

Um ativo descoberto por três fontes independentes é mais provavelmente real e relevante. Limitação:
fontes correlacionadas não são independentes — se três fontes bebem do mesmo registro DNS, a
contagem infla sem agregar informação. E um ativo crítico pode aparecer numa fonte só.

**7. Wordlist de 100.000 nomes**

Pipeline: coleta (resolução em massa com resolvedor local no lab, 50 jobs) → normalização (TSV
com origem) → enriquecimento (portas nas que resolveram, fingerprint nas com web) → priorização
(contagem de fontes + criticidade de serviço). Prova de escopo: log com timestamp de início e
fim, contagem de consultas emitidas, print do comando executado, e a lista completa de nomes
testados — anexada ao relatório.

---

## Módulo 6 — Scanning, fuzzing e relatório

**1. Parsing de tela vs. estruturado**

Saída de tela muda entre versões, tem cor (sequências ANSI no meio do texto), quebra por largura
de terminal e inclui barra de progresso. Exemplo concreto: `nmap` muda a formatação do cabeçalho
entre versões menores, e um `grep 'open' | awk '{print $1}'` que funcionava passa a capturar a
linha de cabeçalho. XML tem schema estável.

**2. Baseline**

É a resposta que o alvo dá para um caminho que com certeza não existe. Sem baseline você não
distingue "encontrei algo" de "este servidor responde 200 para tudo" — o que acontece em muitas
aplicações com roteamento catch-all. Sem baseline, o fuzzer reporta a wordlist inteira.

**3. `401` mais interessante que `200`**

`401` significa que o recurso **existe** e está protegido — há algo ali que o alvo considerou
digno de autenticação. `200` de página genérica pode ser só o catch-all. Ordem de interesse
típica: `401`/`403` → `200`/`201` com conteúdo distinto → `301`/`302` → resto.

**4. Deduplicar mantendo maior prioridade**

```bash
awk -F'\t' '
    BEGIN { p["200"]=5; p["401"]=9; p["403"]=8; p["301"]=3 }
    {
        s = ($1 in p) ? p[$1] : 1
        if (!($3 in visto) || s > visto[$3]) { visto[$3]=s; linha[$3]=$0 }
    }
    END { for (c in linha) print visto[c]"\t"linha[c] }
' achados.tsv | sort -rn | cut -f2-
```

**5. Achado vs. vulnerabilidade comprovada**

Achado é um comportamento observado que merece investigação. Vulnerabilidade comprovada é um
achado cuja exploração foi demonstrada, com impacto demonstrado. O relatório precisa distinguir
porque a recomendação e a urgência de correção dependem disso — e porque chamar todo achado de
vulnerabilidade destrói a credibilidade de quem reporta.

**6. Inflar severidade**

É erro profissional grave porque: erode confiança no relatório inteiro; faz o cliente investir
recurso onde não importa; e quando um achado realmente crítico aparecer, ninguém vai priorizar.
Além disso, em ambiente com processo de gestão de risco, classificação inflada contamina
métricas de toda a organização.

**7. As três informações**

O que foi encontrado (com evidência), como reproduzir (passo a passo que outra pessoa consegue
seguir), e qual o impacto real (o que um atacante ganha com isso). Sem os três, o achado vira
ruído e o cliente não consegue agir.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Correção funcional | 40% | O script faz o que o enunciado pede, com os casos de borda |
| Tratamento de erro | 20% | Falha de forma comportada, com código de saída correto |
| Qualidade do código | 20% | Legibilidade, uso de `local`, ausência de repetição desnecessária |
| Separação stdout/stderr | 10% | Resultado no stdout, diagnóstico no stderr |
| `shellcheck` limpo | 10% | Sem erros de nível *error* |

**Penalidades automáticas:**

- Script que corrompe saída em execução paralela: lab refeito.
- Script que aponta para alvo fora do laboratório: lab zerado.
- `set -euo pipefail` ausente: −20%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| Funcionalidade | Não roda de ponta a ponta | Roda no lab, com ajuste manual | Roda em qualquer alvo do lab sem edição |
| Tratamento de erro | Ignora falhas | Trata os casos previstos | Trata os casos previstos e os imprevistos |
| Formato de saída | Texto livre | TSV consistente | TSV + JSON, documentado |
| Documentação | Sem README | README com uso | README com uso e decisões de projeto |
| Escopo/ética | Nenhuma menção | Nota curta | Limites de concorrência documentados e justificados |

---

*Material didático original. Nenhum trecho foi reproduzido de obra comercial protegida.*
