# Módulo 5 — Rede Adjacente

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Descobrir o ASN e o bloco de um alvo, e o que eles revelam.
2. Enumerar o **bloco adjacente** — o vizinho que o cliente esqueceu.
3. Usar DNS reverso (`PTR`) para achar host sem nome.
4. Ler `PeeringDB` e entender a vizinhança de rede.
5. Correlacionar ASN com certificado e com domínio.

---

## ⚠ Conduta — o módulo mais sensível do curso

⚠ **Este é o módulo em que a enumeração mais se aproxima de varredura.** E a linha é técnica:

| Permitido | Proibido |
|---|---|
| Consultar `whois` de IP e de ASN | **Varredura de porta** em faixa |
| Ler `PeeringDB` (fonte pública) | Varredura de host em bloco adjacente |
| Consultar `PTR` de IP que você **já tem** | Enumeração em massa de bloco alheio |
| Mapear **o seu** bloco | Mapear bloco de terceiro |

⚠ **A regra que vale o módulo:**

> **Você consulta a rede do alvo, não a rede que o alvo usa.** O bloco adjacente é
> **investigação de fato** — saber quem está ao lado. **Toque em host dele é outra coisa**, e
> exige autorização específica.

⚠ **E o risco prático:** um `/24` tem 254 endereços. Testar os 254 "só para ver" **é** varredura —
e contra bloco de terceiro, é reconhecimento não autorizado.

⚠ **O que este módulo ensina, então:**

1. **Mapear** o bloco (consulta de registro — passiva)
2. **Correlacionar** com o que você já achou (DNS, certificado)
3. **Identificar** o vizinho que pertence ao mesmo alvo
4. **Não tocar** em nada que não esteja no escopo

---

## 5.1 ASN — a organização da rede

⚠ **O ASN é quem "possui" o bloco de IP.** Ele diz **a que organização pertence** um endereço — e
isso é a chave para a adjacência.

```bash
cd ~/enum-lab
mkdir -p lab5 && cd lab5

ALVO=""      # ← o seu domínio
IP=""

if [ -n "$ALVO" ]; then
    IP=$(dig +short A "$ALVO" | head -1)
fi

if [ -n "$IP" ]; then
    echo "═══ ${ALVO} → ${IP} ═══"
    echo

    echo "── ASN ──"
    whois -h whois.cymru.com " -v ${IP}" 2>/dev/null

    echo
    echo "── bloco ──"
    whois "$IP" 2>/dev/null | grep -iE 'netname|inetnum|CIDR|orgname|org-name|country|descr|abuse' | head -12
fi
```

### A saída do `whois.cymru.com`

```
AS      | IP               | BGP Prefix          | CC | Registry | Allocated  | AS Name
13335   | 104.16.132.229   | 104.16.0.0/13       | US | arin     | 2014-03-28 | CLOUDFLARENET
```

| Campo | O que significa |
|---|---|
| **AS** | Número do sistema autônomo |
| **BGP Prefix** | **O bloco anunciado** — é o que importa |
| **CC** | País do registro |
| **Registry** | ARIN, RIPE, LACNIC, APNIC, AFRINIC |
| **Allocated** | **Quando** o bloco foi alocado |
| **AS Name** | Nome da organização |

⚠ **A linha "BGP Prefix" é a chave da adjacência.** O bloco anunciado (`104.16.0.0/13`) é **a rede
inteira** da organização — e os vizinhos dela são o alvo do módulo.

⚠ **E a linha "Allocated" revela a idade da infraestrutura.** Bloco alocado em 1998 pertence a
organização antiga; alocado em 2024, a empresa nova.

### Os cinco registries regionais

| Registry | Região | Consulta |
|---|---|---|
| **ARIN** | América do Norte | `whois.arin.net` |
| **RIPE NCC** | Europa, Oriente Médio, Ásia Central | `whois.ripe.net` |
| **APNIC** | Ásia-Pacífico | `whois.apnic.net` |
| **LACNIC** | América Latina e Caribe | `whois.lacnic.net` |
| **AFRINIC** | África | `whois.afrinic.net` |

⚠ **O `whois` normal já consulta o registry certo** — você não precisa saber qual. Mas saber que
**ARIN retorna encadeado** (o `NetRange` e depois o `CIDR`) ajuda a ler a saída, que é diferente
entre registries.

```bash
# Consulta dirigida a um registry específico
which_registry() {
    local ip="$1"
    whois "$ip" 2>/dev/null | grep -iE 'refer:|ReferralServer' | head -2
    # o `whois` segue o encadeamento automaticamente em muitos clientes
}
```

**Produza `asn.md`:**

| Campo | Valor |
|---|---|
| IP do alvo | |
| ASN | |
| Nome do AS | |
| **BGP Prefix** | |
| Registry | |
| País | |
| Alocado em | |

**Responda:**

1. **Qual o bloco do alvo?** Quantos endereços ele contém?
2. O nome do AS é o **mesmo** do domínio, ou de terceiro?
3. O bloco foi alocado quando? O que isso diz sobre a organização?
4. **Se o AS é de nuvem grande**, o que isso muda na sua enumeração?

⚠ **A resposta 4 é importante.** Se o AS é Cloudflare, CloudFront ou Azure, **o IP que você vê é
borda de CDN** — e a origem está atrás. **Você não consegue enumerar a origem por ASN.** O módulo
de OSINT já tratou disso: o IP atrás de CDN **não revela** a origem.

---

## 5.2 O bloco que pertence ao alvo

⚠ **A pergunta certa:** *que blocos pertencem à mesma organização?*

```bash
ASN=""
ORG=""

if [ -n "$ASN" ]; then
    echo "═══ todos os blocos do AS${ASN} ═══"
    whois -h whois.cymru.com " -v ${ASN}" 2>/dev/null | head -5

    echo
    echo "── via registry (ARIN como exemplo) ──"
    whois -h whois.arin.net "a ${ASN}" 2>/dev/null | head -20
fi
```

### Os comandos de consulta por registry

```bash
# Blocos de um ASN — o comando varia por registry
consulta_asn() {
    local asn="$1"
    case "$asn" in
        AS*) asn="${asn#AS}" ;;
    esac

    echo "── cymru (universal) ──"
    whois -h whois.cymru.com " -v AS${asn}" 2>/dev/null | head -10

    echo "── ARIN ──"
    whois -h whois.arin.net "a AS${asn}" 2>/dev/null | head -15

    echo "── RIPE ──"
    whois -h whois.ripe.net "-i origin AS${asn}" 2>/dev/null | head -15
}

# consulta_asn "AS13335"
```

⚠ **Note os comandos diferentes.** ARIN usa `a ASnnnn`; RIPE usa `-i origin ASnnnn`. **É por isso
que a consulta universal (cymru) existe** — ela responde independente de registry.

⚠ **E o `-i origin` do RIPE é o mais produtivo da Europa.** Ele lista **todos os blocos** com
aquela origem — o mapa completo da organização.

### A vizinhança: `PeeringDB`

```bash
ASN=""

if [ -n "$ASN" ]; then
    echo "═══ PeeringDB — quem é este AS ═══"
    curl -s --max-time 20 "https://www.peeringdb.com/api/net?asn=${ASN}" | \
        jq -r '.data[]? | [.name, .aka, .website, .info_type, (.irr_as_set // "-")] | @tsv' 2>/dev/null

    echo
    echo "═══ onde ele troca tráfego ═══"
    curl -s --max-time 20 "https://www.peeringdb.com/api/netfac?asn=${ASN}" | \
        jq -r '.data[]? | [.name, .city, .country] | @tsv' 2>/dev/null | head -8

    echo
    echo "═══ parceiros de peering ═══"
    curl -s --max-time 20 "https://www.peeringdb.com/api/netixlan?asn=${ASN}" | \
        jq -r '.data[]? | [.name, .ipaddr4, .speed] | @tsv' 2>/dev/null | head -8
fi
```

⚠ **O `PeeringDB` é fonte pública e voluntária** — a organização **se registra** para facilitar
peering. Isso significa: **a informação é declarada**, e a ausência **não** significa que o AS não
existe.

⚠ **E ele revela o que o `whois` não revela:** `info_type` (`NSP`, `Content`, `Cable/DSL/ISP`),
`irr_as_set` (o conjunto de rota registrado), e **onde** a organização troca tráfego. **Isso é
contexto de infraestrutura**, e é informação para relatório.

**Produza `blocos.md`:**

| Bloco | Registry | Alocado | Anunciado por | Observação |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Responda:**

1. **Quantos blocos o AS tem?** Some os tamanhos — quantos endereços ao todo?
2. O `PeeringDB` tem registro? **Qual `info_type`?**
3. Em quantos pontos de troca a organização está?
4. **O bloco adjacente** ao do alvo — a quem pertence?

⚠ **A resposta 4 é o exercício do módulo.** Calcular o "vizinho" do bloco alvo e descobrir **a quem
ele pertence** — sem tocar nele.

```bash
vizinho() {
    local cidr="$1"
    python3 - "$cidr" <<'PY'
import ipaddress, sys
rede = ipaddress.ip_network(sys.argv[1], strict=False)
print(f"bloco           : {rede}")
print(f"rede            : {rede.network_address}")
print(f"broadcast       : {rede.broadcast_address}")
print(f"tamanho         : {rede.num_addresses} endereços")

anterior = rede.network_address - rede.num_addresses
proximo  = rede.broadcast_address + 1
print(f"vizinho ANTERIOR: {anterior}")
print(f"vizinho PRÓXIMO : {proximo}")
print()
print("⚠ consulte a quem pertencem — NÃO toque nos hosts")
PY
}

# vizinho "104.16.0.0/13"
```

⚠ **Note o comentário final do script.** Você calcula o vizinho e **consulta o registro** dele.
**Você não varre.** A diferença é o que este módulo existe para ensinar.

**Responda (sobre o vizinho):**

1. Quem é o proprietário do bloco adjacente? **É o mesmo alvo?**
2. Se for **o mesmo alvo**, isso é achado? Por quê?
3. Se for **terceiro**, o que você pode concluir? (Dica: provavelmente pouco.)
4. **O que você NÃO faz** com essa informação?

---

## 5.3 `PTR` — DNS reverso

⚠ **O `PTR` é o nome do host a partir do IP.** Ele revela host que **não tem nome DNS direto**.

```bash
IP=""

if [ -n "$IP" ]; then
    echo "═══ PTR do IP do alvo ═══"
    dig +short -x "$IP"

    echo
    echo "═══ o nome do PTR tem padrão? ═══"
    ptr=$(dig +short -x "$IP" | head -1)
    if [ -n "$ptr" ]; then
        echo "  PTR: ${ptr}"
        echo "  slug: $(printf '%s' "$ptr" | awk -F. '{print $(NF-2)}')"
        echo "  país: $(printf '%s' "$ptr" | awk -F. '{print $(NF-1)}')"
    fi
fi
```

### O que o `PTR` revela

| Padrão do `PTR` | O que significa |
|---|---|
| `algo.cliente.provedor.com` | **Cliente do provedor** — nomes de outras organizações |
| `ip-10-0-1-5.regiao.compute.internal` | **Instância de nuvem** — AWS, GCP, Azure |
| `host-213-45-67-8.provedor.net` | **Faixa residencial ou de VPS** |
| `nomelegivel.exemplo.com` | Nome real do host |
| Sem `PTR` | Comum em nuvem; **ausência é informação** |
| `...eu.` ou `...br.` | **Região** — e o módulo 3 já mostrou padrão regional |

⚠ **A linha do `compute.internal` é ouro.** Um `PTR` como `ip-10-0-1-5.us-east-1.compute.internal`
revela **provider, região e intervalo privado** — ou seja, **a arquitetura de nuvem da organização**.

⚠ **E a linha "cliente do provedor" é a mais curiosa.** Blocos de VPS frequentemente têm `PTR` com
**o nome do cliente** — o que significa que consultar o reverso de IPs ao redor revela **outras
organizações** hospedadas no mesmo bloco.

```bash
# ⚠ cuidado: consultar PTR de IPs adjacentes é informação, não varredura —
#    mas mantenha o volume BAIXO e o bloco dentro do escopo
IP=""

if [ -n "$IP" ]; then
    base=$(printf '%s' "$IP" | cut -d. -f1-3)
    echo "═══ PTR nos 10 IPs vizinhos (volume baixo, escopo próprio) ═══"
    echo "⚠ só faça isto no SEU bloco, ou no bloco autorizado"
    echo

    ultimo=$(printf '%s' "$IP" | cut -d. -f4)
    for i in $(seq $((ultimo > 5 ? ultimo - 5 : 1)) $((ultimo + 5))); do
        [ "$i" -gt 255 ] && continue
        alvo="${base}.${i}"
        ptr=$(dig +short -x "$alvo" 2>/dev/null | head -1 | sed 's/\.$//')
        [ -n "$ptr" ] && printf '  %-16s → %s\n' "$alvo" "$ptr"
        sleep 0.4
    done
fi
```

⚠ **Note o aviso.** Consultar `PTR` de **dez** IPs ao redor é informação de vizinhança. Consultar
**254** é varredura de bloco. **O volume é o que define o ato** — e o limite do curso é baixo.

**Produza `ptr.md`:**

| IP | `PTR` | Padrão | O que revela |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. O `PTR` do alvo existe? **Qual o padrão?**
2. Ele revela **provedor de nuvem e região**? Quais?
3. Os vizinhos revelaram **outras organizações**?
4. **Por que consultar dez IPs é informação e 254 é varredura?**

---

## 5.4 Correlação — ASN × domínio × certificado

⚠ **A pergunta que integra o módulo:**

> **Os nomes do certificado resolvem para o bloco do alvo, ou para terceiro?**

```bash
cd ~/enum-lab/lab5

# Se você fez o módulo 3
if [ -f ../lab3/nomes-ct.txt ]; then
    echo "═══ nomes do CT log e o ASN de cada um ═══"
    printf '%-48s %-18s %s\n' "NOME" "IP" "ASN"
    printf '%-48s %-18s %s\n' "────" "──" "───"

    i=0
    while IFS= read -r nome; do
        [ -z "$nome" ] && continue
        i=$((i+1))
        [ "$i" -gt 15 ] && break        # ⚠ limite: 15 nomes

        ip=$(dig +short A "$nome" 2>/dev/null | head -1)
        [ -z "$ip" ] && continue

        asn=$(whois -h whois.cymru.com " -v ${ip}" 2>/dev/null | tail -1 | awk -F'|' '{gsub(/ /,"",$1); print $1" "$7}')
        printf '%-48s %-18s %s\n' "$nome" "$ip" "$asn"

        sleep 1                          # ⚠ cymru pede ritmo
    done < ../lab3/nomes-ct.txt
fi
```

### A tabela de correlação

| Observação | O que significa |
|---|---|
| Todos os nomes no **mesmo AS** | Infraestrutura centralizada |
| Nomes em **AS de nuvem** | Hospedagem terceirizada |
| Nomes em **AS diferentes** | Multi-provider, ou equipes independentes |
| **Um nome em AS de terceiro desconhecido** | **Achado** — investigar |
| Nome no AS do alvo **e** nome em CDN | Origem + borda |

⚠ **A quarta linha é o achado de segurança.** Um subdomínio que resolve para bloco de **outra
organização** pode ser: serviço legítimo terceirizado, ou **take-over** — o módulo 6 decide.

⚠ **E a quinta linha explica o CDN.** Se `www` está em Cloudflare e `api` está no bloco próprio, a
organização usa CDN para o site público e expõe a origem no `api`. **Isso é achado de arquitetura.**

**Produza `correlacao.md`:**

| Nome (CT) | IP | ASN | AS Name | Categoria |
|---|---|---|---|---|
| | | | | |
| | | | | |

⚠ **A coluna "categoria" tem quatro valores:**

| Categoria | Significado |
|---|---|
| **Próprio** | ASN do alvo |
| **Nuvem** | AWS, GCP, Azure, Cloudflare |
| **CDN** | Borda de distribuição |
| **Terceiro** | **Desconhecido — investigar** |

**Responda:**

1. **A maioria dos nomes está no AS do alvo** ou em nuvem?
2. Algum nome está em AS de **terceiro desconhecido**? Qual?
3. O `www` e o `api` estão no **mesmo** AS? Se não, o que isso revela?
4. **Qual nome é o achado mais interessante** da correlação?

---

## 5.5 LAB — Mapa de rede do alvo

**Duração:** 120 min

### Passo 1 — ASN e blocos (35 min)

```bash
cd ~/enum-lab/lab5
ALVO=""

if [ -z "$ALVO" ]; then
    echo "⚠ defina ALVO"
else
    IP=$(dig +short A "$ALVO" | head -1)
    echo "═══ ${ALVO} → ${IP} ═══"
    echo

    {
        echo "── ASN ──"
        whois -h whois.cymru.com " -v ${IP}"

        echo
        echo "── bloco ──"
        whois "$IP" 2>/dev/null | grep -iE 'netname|inetnum|CIDR|NetRange|orgname|org-name|country|abuse-mailbox' | head -14

        echo
        echo "── PTR ──"
        dig +short -x "$IP"
    } | tee asn-completo.txt
fi
```

Produza `mapa-rede.md`:

| Item | Valor |
|---|---|
| IP | |
| ASN | |
| AS Name | |
| BGP Prefix | |
| Tamanho do bloco | |
| Registry | |
| País | |
| Alocado | |
| `PTR` | |

**Responda:**

1. **O AS pertence ao alvo** ou é de nuvem/CDN?
2. **O `PTR` revela arquitetura** (nuvem, região, provedor)?
3. O bloco é **grande ou pequeno**? Quantos endereços?
4. Se é CDN, **você consegue enumerar a origem** por ASN? Por quê não?

### Passo 2 — O vizinho (30 min)

```bash
cd ~/enum-lab/lab5

cat > vizinho.sh <<'SCRIPT'
#!/usr/bin/env bash
# Calcula os blocos vizinhos de um CIDR e consulta o registro deles.
# ⚠ NÃO toca em nenhum host.
set -uo pipefail

CIDR="${1:?uso: vizinho.sh <cidr>}"

python3 - "$CIDR" <<'PY' > vizinhos.txt
import ipaddress, sys
rede = ipaddress.ip_network(sys.argv[1], strict=False)
print(rede.network_address - rede.num_addresses)
print(rede.broadcast_address + 1)
PY

echo "═══════ VISINHANÇA DE ${CIDR} ═══════"
echo "⚠ consulta de REGISTRO apenas — nenhum host é tocado"
echo

while IFS= read -r ip; do
    [ -z "$ip" ] && continue
    printf '─── %s ───\n' "$ip"
    whois "$ip" 2>/dev/null | grep -iE 'netname|NetName|orgname|OrgName|descr' | head -3 | sed 's/^/    /'
    echo
    sleep 1
done < vizinhos.txt
SCRIPT
chmod +x vizinho.sh

# Substitua pelo bloco REAL do seu alvo (do passo 1)
CIDR=""
[ -n "$CIDR" ] && ./vizinho.sh "$CIDR" | tee visinhanca.txt
```

Produza `visinhanca.md`:

| Bloco vizinho | Proprietário | Mesmo alvo? | Observação |
|---|---|---|---|
| | | | |

**Responda:**

1. **O vizinho pertence ao mesmo alvo?** Se sim, é achado — por quê?
2. Se pertence a terceiro, **o que você pode concluir**? (Provavelmente pouco — justifique.)
3. **Você tocou em algum host** do bloco vizinho? Confirme que não.
4. Qual a diferença entre **consultar o registro** do bloco e **varrer** o bloco?

⚠ **A resposta 4 é a linha do módulo.** Consultar registro é leitura de banco público; varrer é
enviar pacote para host de terceiro. **O primeiro é enumeração. O segundo, sem autorização, é
reconhecimento não autorizado** — e é o que a lei trata como acesso indevido quando o pacote chega.

### Passo 3 — Correlação com o CT log (40 min)

```bash
cd ~/enum-lab/lab5

if [ -f ../lab3/nomes-ct.txt ]; then
    echo "═══ correlacionando nomes do CT log com ASN ═══"
    echo "⚠ 15 nomes no máximo, ritmo de 1 s entre consultas"
    echo

    cat > correl.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail
ARQ="${1:?informe o arquivo}"
LIMITE="${2:-15}"
i=0

printf '%-48s %-16s %-8s %s\n' "NOME" "IP" "ASN" "AS NAME"
printf '%-48s %-16s %-8s %s\n' "────" "──" "───" "───────"

while IFS= read -r nome; do
    [ -z "$nome" ] && continue
    i=$((i+1)); [ "$i" -gt "$LIMITE" ] && break

    ip=$(dig +short +time=3 A "$nome" 2>/dev/null | head -1)
    [ -z "$ip" ] && continue

    linha=$(whois -h whois.cymru.com " -v ${ip}" 2>/dev/null | tail -1)
    asn=$(printf '%s' "$linha" | awk -F'|' '{gsub(/ /,"",$1); print $1}')
    nome_as=$(printf '%s' "$linha" | awk -F'|' '{print $NF}' | sed 's/^ *//')

    printf '%-48s %-16s %-8s %s\n' "$nome" "$ip" "$asn" "$nome_as"
    sleep 1
done < "$ARQ"
SCRIPT
chmod +x correl.sh

    ./correl.sh ../lab3/nomes-ct.txt 15 | tee correlacao.txt
fi
```

Produza `correlacao-asn.md`:

| Categoria | Quantos nomes | Exemplos |
|---|---|---|
| Próprio (ASN do alvo) | | |
| Nuvem | | |
| CDN | | |
| **Terceiro desconhecido** | | |

**Responda:**

1. **Qual categoria domina?** O que isso diz sobre a arquitetura?
2. Quantos nomes estão em **terceiro desconhecido**?
3. O nome em terceiro desconhecido é **candidato a take-over** ou **serviço legítimo**?
4. **O que você faria para confirmar** — sem sair do escopo?

### Passo 4 — O relatório (15 min)

Produza `relatorio-rede.md`:

```markdown
# Mapa de rede — [alvo]

## 1. Método e data
## 2. ASN e blocos
| Item | Valor |
|---|---|
## 3. Vizinhança
| Bloco | Proprietário | Mesmo alvo? |
## 4. PTR e arquitetura
| IP | PTR | O que revela |
## 5. Correlação ASN × domínio
| Categoria | Nomes |
## 6. Achados
| Achado | Evidência | Severidade |
## 7. O que NÃO se pode concluir
⚠ Obrigatório, mínimo 3:
- que o IP atrás de CDN **não** revela a origem
- que o vizinho de bloco **não** é do alvo (ou é — mas não se conclui por proximidade)
- que **nenhum host** fora do escopo foi tocado
## 8. Limites respeitados
- PTR consultado em quantos IPs: ____
- Blocos consultados (registro): ____
- Hosts tocados fora do escopo: **nenhum**
```

### Critérios de aceitação

- `asn-completo.txt` com ASN, bloco, registry e `PTR`.
- Você identificou se o AS é **próprio, nuvem ou CDN** — e a consequência para a enumeração.
- `vizinho.sh` calculando os **dois** blocos adjacentes, e o registro de cada um consultado.
- `visinhanca.md` com o proprietário de cada vizinho.
- Você confirmou que **não tocou em nenhum host** fora do escopo.
- `correl.sh` rodado em **no máximo 15 nomes**, com ritmo de 1 s.
- `correlacao-asn.md` com as **quatro** categorias contadas.
- `relatorio-rede.md` com a seção 8 preenchida com os **números reais**.
- ⚠ **Nenhuma varredura de porta ou de host.** Apenas consulta de registro.

---

## Avaliação

1. O que o ASN representa, e por que ele é a chave da adjacência?
2. Qual campo do `whois.cymru.com` importa para o bloco, e por quê?
3. O que "Allocated" revela sobre a organização?
4. Cite os cinco registries regionais e a região de cada um.
5. Por que o `whois` normal já resolve o registry certo?
6. Qual comando lista blocos de um ASN no RIPE, e por que ele é o mais produtivo na Europa?
7. **Se o AS é de CDN, o que você não consegue enumerar?** Por quê?
8. O que o `PeeringDB` revela que o `whois` não revela? E qual a limitação dele?
9. O que um `PTR` com `compute.internal` revela? Por que é ouro?
10. Por que o `PTR` de IP vizinho frequentemente revela **outras organizações**?
11. **Diferencie consultar o registro do bloco de varrer o bloco.** Por que o volume define o ato?
12. Quantos IPs vizinhos é informação, e quantos é varredura? Justifique.
13. Num mapa de correlação, o que significa "um nome em AS de terceiro desconhecido"?
14. Por que o `www` em CDN e o `api` no bloco próprio é achado de arquitetura?
15. Cite três coisas que o mapa de rede **não** permite concluir.

---

**Próximo:** [Módulo 6 — Exposição em terceiro](modulo-06.md)
