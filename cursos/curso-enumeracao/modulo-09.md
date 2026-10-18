# Módulo 9 — Projeto: Mapa de Superfície Autorizado

**Carga:** 4 horas
**Pré-requisitos:** Módulos 1 a 8

---

## O objetivo do módulo

**Um entregável:** o mapa de superfície completo, com autorização declarada, evidência reproduzível
e priorização justificada.

⚠ **E a escolha do sujeito é parte do exercício.** Antes de qualquer consulta, você escolhe — e
**declara por quê**.

| Sujeito | Base da autorização | Quando usar |
|---|---|---|
| **1. Domínio próprio** | Implícita — é seu | **Recomendado para o projeto** |
| **2. Laboratório local** | Implícita — é seu | Se você não tem domínio |
| **3. Bug bounty com escopo público** | **O escopo do programa** | Se você quiser exercitar escopo real |

⚠ **Nenhuma outra opção.** Domínio de terceiro, domínio de conhecido, "para estudar" — **não são
sujeitos válidos**, e o projeto com eles é zerado independente da qualidade técnica.

---

## 9.1 O que você vai produzir

```
projeto-enumeracao/
├── 00-autorizacao.md          a base, nomeada, ANTES de tudo
├── 01-escopo.md               o que está dentro e o que está fora
├── 02-metodo.md               as fontes e a ordem
├── 03-dns/                    saída do módulo 2
├── 04-ct-log/                 saída do módulo 3
├── 05-arquivo-morto/          saída do módulo 4
├── 06-rede/                   saída do módulo 5
├── 07-terceiro/               saída do módulo 6
├── 08-dedupe/                 normalização
├── 09-posse/                  prova de posse
├── 10-prioridade/             pontuação
├── 11-mapa.md                 O ENTREGÁVEL
└── 12-declaracao.md           conduta
```

⚠ **A ordem dos diretórios é a ordem do método.** E `00-autorizacao.md` vem **primeiro** — porque
sem ele, o resto não se faz.

---

## 9.2 Fases do projeto

### Fase 1 — Autorização e escopo (30 min)

```bash
mkdir -p ~/enum-lab/projeto/{03-dns,04-ct-log,05-arquivo-morto,06-rede,07-terceiro,08-dedupe,09-posse,10-prioridade}
cd ~/enum-lab/projeto
```

**Produza `00-autorizacao.md`:**

```markdown
# Autorização

## Base
[ ] Ativo próprio — domínio: ______
[ ] Laboratório local — endereço: ______
[ ] Programa de bug bounty
    URL do escopo: ______
    Data da consulta ao escopo: ______

## Se bug bounty: o escopo EXPLÍCITO
### Dentro
| Ativo | Tipo |
|---|---|
### Fora
| Ativo | Tipo |
|---|---|
### Regras do programa
| Regra | O que ela diz |
|---|---|
| Volume máximo | |
| Horário | |
| Proibido | |
```

**Produza `01-escopo.md`** com a mesma estrutura do módulo 8, §8.5 seção 2 e 3.

⚠ **Se você escolheu bug bounty, leia o escopo inteiro antes de continuar.** Programa com
`*.exemplo.com` no escopo e `admin.exemplo.com` excluído significa: **enumerar o excluído é violar
o escopo.**

### Fase 2 — Coleta pelas cinco fontes (90 min)

```bash
cd ~/enum-lab/projeto
ALVO=""
```

**DNS (módulo 2):**

```bash
[ -n "$ALVO" ] && {
    {
        for t in A AAAA CNAME MX TXT NS SOA CAA; do
            echo "─── ${t} ───"
            dig +noall +answer "$t" "$ALVO"
        done
        echo "─── _dmarc ───"
        dig +noall +answer TXT "_dmarc.${ALVO}"
    } > 03-dns/dns-completo.txt 2>&1

    grep -oE '[a-z0-9._-]+\.' 03-dns/dns-completo.txt | sed 's/\.$//' | sort -u > 03-dns/nomes.txt
    echo "DNS: $(wc -l < 03-dns/nomes.txt) nomes"
}
```

**CT log (módulo 3):**

```bash
[ -n "$ALVO" ] && {
    curl -s --max-time 45 \
      "https://crt.sh/?q=%25.${ALVO}&output=json&exclude=expired&exclude=wildcards" | \
      jq -r '.[].name_value' 2>/dev/null | tr ',' '\n' | \
      sed 's/^\*\.//;s/^ *//;s/ *$//' | grep -v '^$' | sort -u > 04-ct-log/nomes.txt

    echo "CT log: $(wc -l < 04-ct-log/nomes.txt) nomes"
}
```

**Arquivo morto (módulo 4):**

```bash
[ -n "$ALVO" ] && {
    curl -s --max-time 60 \
      "http://web.archive.org/cdx/search/cdx?url=${ALVO}*&output=json&collapse=urlkey&limit=1000" | \
      jq -r '.[] | [.[1], .[2], .[4]] | @tsv' 2>/dev/null > 05-arquivo-morto/cdx.tsv

    cut -f2 05-arquivo-morto/cdx.tsv | sort -u > 05-arquivo-morto/urls.txt
    echo "CDX: $(wc -l < 05-arquivo-morto/urls.txt) urls"

    curl -s --max-time 15 "https://${ALVO}/robots.txt" -o 05-arquivo-morto/robots.txt 2>/dev/null
    curl -s --max-time 15 "https://${ALVO}/sitemap.xml" -o 05-arquivo-morto/sitemap.xml 2>/dev/null
}
```

**Rede (módulo 5):**

```bash
[ -n "$ALVO" ] && {
    IP=$(dig +short A "$ALVO" | head -1)
    echo "IP: ${IP}" > 06-rede/asn.txt
    [ -n "$IP" ] && {
        whois -h whois.cymru.com " -v ${IP}" >> 06-rede/asn.txt 2>/dev/null
        whois "$IP" 2>/dev/null | grep -iE 'netname|inetnum|CIDR|NetRange|orgname|country' >> 06-rede/asn.txt
        dig +short -x "$IP" > 06-rede/ptr.txt
    }
    cat 06-rede/asn.txt
}
```

**Terceiro (módulo 6):**

```bash
[ -n "$ALVO" ] && {
    : > 07-terceiro/cnames.tsv
    cat 03-dns/nomes.txt 04-ct-log/nomes.txt 2>/dev/null | sort -u | head -40 | \
    while IFS= read -r nome; do
        [ -z "$nome" ] && continue
        cn=$(dig +short +time=3 CNAME "$nome" 2>/dev/null | head -1 | sed 's/\.$//')
        [ -n "$cn" ] && printf '%s\t%s\n' "$nome" "$cn" >> 07-terceiro/cnames.tsv
        sleep 0.3
    done
    echo "CNAME: $(wc -l < 07-terceiro/cnames.tsv)"
    cat 07-terceiro/cnames.tsv
}
```

### Fase 3 — Deduplicação e posse (40 min)

```bash
cd ~/enum-lab/projeto

# Consolide
: > 08-dedupe/todos.tsv
printf 'fonte\ttipo\tvalor\tobservacao\n' >> 08-dedupe/todos.tsv

for par in "03-dns/nomes.txt:dns:nome" \
           "04-ct-log/nomes.txt:ct:nome" \
           "05-arquivo-morto/urls.txt:cdx:url"; do
    caminho="${par%%:*}"; resto="${par#*:}"
    fonte="${resto%%:*}"; tipo="${resto#*:}"
    [ -f "$caminho" ] || continue
    while IFS= read -r v; do
        [ -z "$v" ] && continue
        printf '%s\t%s\t%s\t\n' "$fonte" "$tipo" "$v" >> 08-dedupe/todos.tsv
    done < "$caminho"
done

cp ../lab7/normaliza.py 08-dedupe/ 2>/dev/null || echo "⚠ copie o normaliza.py do módulo 7"

python3 08-dedupe/normaliza.py 08-dedupe/todos.tsv > 08-dedupe/dedup.txt 2>/dev/null
head -30 08-dedupe/dedup.txt
```

**Avalie posse** dos dez ativos mais corroborados (módulo 7, `posse.sh`), e produza
`09-posse/avaliacao.md`.

### Fase 4 — Priorização (30 min)

```bash
cd ~/enum-lab/projeto

cat > 10-prioridade/achados.csv <<'EOF'
achado,exposicao,alcance,facilidade
EOF

# ⚠ Preencha com os SEUS achados
cat >> 10-prioridade/achados.csv <<'EOF'
subdominio apontando para servico de terceiro,informacao,internet,facil
nome no CT log sem DNS,historico,internet,medio
caminho no robots nao linkado,superficie,internet,medio
EOF

cp ../lab7/prioriza.py 10-prioridade/ 2>/dev/null
python3 10-prioridade/prioriza.py 10-prioridade/achados.csv
```

### Fase 5 — O mapa (40 min)

**Produza `11-mapa.md`** com as **oito** seções do módulo 7, §7.4.

Requisitos mínimos:

| Seção | Mínimo |
|---|---|
| 2 — Método | As **cinco** fontes, com limitação de cada |
| 3 — Inventário | **15 ativos**, com fontes e dono |
| 4 — Priorizados | **6 achados**, com nível |
| 5 — Postura | **2 achados** |
| 6 — Candidatos | **3 itens**, com o que confirmaria |
| **7 — Não coberto** | **4 itens** + declaração de conduta |
| 8 — Próximos passos | **4 ações** priorizadas |

### Fase 6 — A declaração (20 min)

**Produza `12-declaracao.md`** com as oito seções do módulo 8, §8.5.

---

## 9.3 O que se avalia

| # | Arquivo | Peso | O que se avalia |
|---|---|---|---|
| 1 | `00-autorizacao.md` | **10%** | Base **nomeada**, antes de qualquer consulta |
| 2 | `01-escopo.md` | 5% | O que está fora, explicitado |
| 3 | `03-dns/` a `07-terceiro/` | 20% | As **cinco** fontes, com saída real |
| 4 | `08-dedupe/` | 10% | Duplicação calculada |
| 5 | `09-posse/` | 10% | Força da evidência por ativo |
| 6 | `10-prioridade/` | 10% | Pontuação e **ajuste justificado** |
| 7 | **`11-mapa.md`** | **25%** | As oito seções, com evidência |
| 8 | `12-declaracao.md` | 10% | As nove caixas + dado pessoal |

**Penalidades automáticas:**

- Autorização **não nomeada**: −25%.
- **Sujeito inválido** (terceiro sem autorização): **projeto zerado**.
- Fonte consultada sem `sleep` / ritmo: −15%.
- `404` genérico apresentado como take-over: −20%.
- Achado de postura apresentado como exposição: −10%.
- Reivindicação, download ou cadastro: **projeto zerado**.
- Seção 7 sem declaração de conduta: −15%.

---

## 9.4 Roteiro de execução

| Bloco | Duração | O que fazer |
|---|---|---|
| **1** | 30 min | Autorização e escopo — **antes de qualquer consulta** |
| **2** | 90 min | As cinco fontes, com saída salva |
| **3** | 40 min | Deduplicação + avaliação de posse |
| **4** | 30 min | Priorização |
| **5** | 40 min | O mapa |
| **6** | 20 min | A declaração |

⚠ **Resista à tentação de inverter.** Coletar antes de ter autorização é o erro que zera o projeto —
e é o mesmo erro que, fora do laboratório, produz consequência legal.

---

## Avaliação final

1. Por que a autorização vem **antes** da primeira consulta?
2. Cite os três sujeitos válidos, e por que os outros não são.
3. Se você escolheu bug bounty, **como você determinou o escopo**? O que ficou fora?
4. **Quantas fontes você consultou?** Qual trouxe mais achado único?
5. Qual a **taxa de duplicação**? O que ela indica?
6. Quais ativos você **não conseguiu atribuir**? Por que a resposta é "não consegui", e não um
   palpite?
7. **Onde você ajustou a pontuação** por contexto? Por quê?
8. Qual achado você levaria **primeiro** ao cliente?
9. Cite três coisas que a sua enumeração **não** cobriu.
10. **A declaração de conduta o defende?** Explique.
11. O que você faria **diferente** numa próxima enumeração?
12. **Qual foi o achado mais interessante**, e o que ele revela sobre a organização?

---

## Encerramento do curso

Você começou rodando `nmap` e terminou com um mapa de superfície que a ferramenta padrão não
produziria — porque as fontes que você usou **não estão na ferramenta**.

O que você aprendeu não foi uma lista de comando. Foi **um método** — escolher a pergunta antes da
ferramenta, derivar a fonte da estrutura do dado, seguir a cadeia de pergunta em pergunta, provar
posse antes de atribuir, e **declarar o que você não fez**.

| # | O que fica |
|---|---|
| 1 | **Enumeração boa é exploratória, não confirmatória** — ela descobre o que ninguém mapeou. |
| 2 | **O ativo mais perigoso é o que a organização esqueceu que tinha.** |
| 3 | **Certificado é a melhor fonte de host** — e é público por obrigação regulatória. |
| 4 | **Verificar existência é enumeração; acessar conteúdo é aquisição.** A linha é o ato. |
| 5 | **O volume define o ato** — e a autorização escrita é o que separa auditoria de crime. |

⚠ **A nota final, e ela é sobre responsabilidade.** Você agora sabe encontrar superfície que
ninguém mapeou. Isso serve para auditar o que é seu, proteger o que é do cliente, e **encontrar a
falha antes do adversário**. E serve para reconhecer alvo — que é a fase que precede ataque.

**O que separa os dois é a autorização escrita, o escopo declarado, e o volume respeitado.** É por
isso que o curso pede o documento antes da primeira consulta — e é por isso que a declaração de
conduta fecha o relatório.

Referências para continuar: **OWASP WSTG** (Information Gathering) · **crt.sh** · **Wayback CDX** ·
**ProjectDiscovery docs** · **PeeringDB** · **RFC 9309** (`robots.txt`) ·
**Berkeley Protocol** · **Bellingcat** · **OSINT Framework**
