# Módulo 8 — Limites: Volume, Autorização, Termo

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Distinguir **consulta**, **enumeração** e **varredura** — e onde cada uma cruza a linha.
2. Entender por que o **volume** define o ato, não a intenção.
3. Ler termo de uso e saber o que ele vincula.
4. Aplicar o teste de proporcionalidade à enumeração.
5. Produzir a declaração de conduta que fecha o relatório.

---

## ⚠ Este é o módulo que determina se você pode usar o resto

Os sete módulos anteriores deram técnica. Este determina **quando não usar**.

⚠ **E ele não é decoração jurídica.** A maioria dos problemas reais em enumeração **não é**
técnica — é uma enumeração bem-feita que **não deveria ter sido feita**. O achado estava certo; a
permissão não existia.

⚠ **Nada aqui é orientação jurídica.** É mapa de risco, para você saber **quando** consultar
advogado — e para reconhecer a situação em que a resposta é óbvia.

---

## 8.1 Consulta, enumeração, varredura

⚠ **Três atos diferentes, e a fronteira entre eles é mais estreita do que parece.**

| Ato | O que é | Exemplo | Precisa autorização? |
|---|---|---|---|
| **Consulta** | Ler fonte pública sobre um ativo | `whois`, `dig`, `crt.sh` | Não — é público |
| **Enumeração** | Mapear ativo **com consentimento** | `dig` em série no seu domínio | **Sim**, do dono |
| **Varredura** | Testar host que não é seu | `nmap` em faixa alheia | **Sim, específica** |

⚠ **A tabela tem uma armadilha, e ela está na segunda linha.** `dig` é consulta pública — mas
**10.000 `dig` em série** contra o resolvedor de alguém é **uso de recurso de terceiro**. **O ato
muda com o volume.**

```
                ┌─────────────────────────────────────────┐
   CONSULTA     │  1 pergunta ao registro                 │
                │  "de quem é este domínio?"              │
                └─────────────────────────────────────────┘
                                  │
                    ⚠ o volume cresce
                                  ▼
                ┌─────────────────────────────────────────┐
   ENUMERAÇÃO   │  5.000 perguntas, com ritmo             │
                │  "que nomes existem?"                   │
                │  ⚠ já é uso de recurso alheio            │
                │  ⚠ precisa de consentimento do dono      │
                └─────────────────────────────────────────┘
                                  │
                    ⚠ você toca no alvo
                                  ▼
                ┌─────────────────────────────────────────┐
   VARREDURA    │  pacote enviado ao host                 │
                │  "que portas estão abertas?"            │
                │  ⚠ sem autorização = acesso indevido     │
                └─────────────────────────────────────────┘
```

⚠ **A linha entre enumeração e varredura é:** *o pacote chega no host de terceiro?* Se sim, você
precisa de autorização específica — e "só enumerei" não é defesa.

⚠ **E a linha entre consulta e enumeração é o volume.** As duas leem fonte pública, mas uma é
**pergunta** e a outra é **uso sistemático de infraestrutura alheia**.

---

## 8.2 O que muda por jurisdição

⚠ **A mesma enumeração tem estatuto diferente conforme onde você e o alvo estão.**

| Jurisdição | O que muda |
|---|---|
| **Brasil** | Art. 154-A (acesso indevido), art. 266 (interrupção de serviço). **Varredura com volume pode configurar ambos** |
| **UE** | Diretiva de crimes cibernéticos; GDPR se houver dado pessoal no caminho |
| **EUA** | CFAA — a lei é ampla, e "exceder autorização" é interpretado de forma extensa |
| **Reino Unido** | Computer Misuse Act — acesso não autorizado, mesmo sem dano |
| **Regimes restritivos** | A própria enumeração pode ser crime |

⚠ **O que importa mais que a lei local é o contrato.** Contrato de auditoria define o escopo — e
**o que está fora do escopo é igual a não autorizado**, mesmo que você tenha a melhor das intenções.

### As três autorizações que existem

| # | Tipo | Cobre o quê | Cuidado |
|---|---|---|---|
| 1 | **Ativo próprio** | Tudo | — |
| 2 | **Escopo de bug bounty** | **Só o que o programa declara** | Leia o escopo **inteiro**, incluindo o que está excluído |
| 3 | **Contrato de auditoria** | O que o contrato descreve | Escopo por IP/domínio/**janela de horário** |

⚠ **A armadilha do bug bounty é o escopo incompleto.** Um programa pode declarar
`*.exemplo.com` **e excluir** `admin.exemplo.com`. **Enumerar o excluído é violar o escopo** — e
programas seriamente aplicam isso com banimento permanente.

⚠ **E a armadilha do contrato é a janela de horário.** "Teste entre 22h e 06h" não é sugestão. Se
você enumera às 14h, está fora do escopo — mesmo que o alvo esteja autorizado.

---

## 8.3 O teste de proporcionalidade

⚠ **O instrumento que você aplica antes de cada etapa da enumeração.**

```
1. AUTORIZAÇÃO  →  Este ativo está coberto por autorização escrita?
                    (se não, PARE)
2. NECESSIDADE  →  Isso responde à minha pergunta?
                    (não é "útil" — é necessário?)
3. VOLUME       →  Estou dentro do ritmo razoável para a infraestrutura?
4. IMPACTO      →  Se isso for mal interpretado, causo dano?
5. PROPORÇÃO    →  O benefício do achado justifica o risco?
6. REGISTRO     →  Estou registrando o que faço, com data e método?
```

⚠ **A etapa 3 é a mais esquecida.** Você raramente decide "vou atacar"; você decide "vou aumentar o
paralelismo para terminar mais rápido" — e isso é o mesmo ato, com nome diferente.

⚠ **E a etapa 1 tem poder de parada.** Sem autorização escrita, **não há etapa 2**. Não é
formalidade — é a diferença entre auditoria e crime.

### Aplicando aos cinco casos

| Caso | Autorização? | Volume | Passa? |
|---|---|---|---|
| Enumeração de domínio próprio | Sim (implícita) | Baixo | **Sim** |
| Bug bounty, ativo **no** escopo | Sim | Conforme o programa | **Sim** |
| Bug bounty, ativo **excluído** | **Não** | — | **Não** |
| Cliente com contrato, fora do horário | **Não** naquele horário | — | **Não** |
| Domínio de terceiro "para estudar" | **Não** | Baixo | **Não** |

⚠ **A última linha é a mais comum e a mais violada.** "É só enumeração pública, não estou fazendo
nada de errado" — mas **enumeração sistemática contra ativo de terceiro é reconhecimento**, e é a
fase que precede ataque. **A lei não faz a distinção que a intenção faz.**

---

## 8.4 Termo de uso e `robots.txt`

⚠ **O que vincula, e o que é convenção.**

| Instrumento | Vincula? | Consequência de violar |
|---|---|---|
| **Termo de serviço** | **Sim** — é contrato | Bloqueio, cancelamento, ação civil |
| **`robots.txt`** | **Convenção** — RFC 9309 | Costume e boa-fé; alguns termos o mencionam |
| **`security.txt`** | Declaração de contato | Nenhuma — é convite |
| **Rate limit (`429`)** | **Instrução** | Insistir é abuso |
| **API com chave** | Contrato | Revogação, ação legal |
| **Escopo de bug bounty** | Contrato | Banimento permanente |

⚠ **O `robots.txt` merece nuance.** Ele **não** é lei, e violá-lo **não** é crime por si. Mas ele é
**declaração de vontade do operador** — e ignorá-lo sistematicamente é o que faz o pesquisador
legítimo ser tratado como abusivo.

⚠ **E o `429` é o mais importante da tabela.** Ele é o serviço **pedindo para parar** — e continuar
é o comportamento que caracteriza abuso. **Um script que ignora `429` é um script que insiste.**

```bash
cd ~/enum-lab
mkdir -p lab8 && cd lab8

cat > enumera-respeitoso.sh <<'SCRIPT'
#!/usr/bin/env bash
#
# enumera-respeitoso.sh — o padrão de enumeração que respeita o alvo.
#
set -uo pipefail

DOMINIO="${1:?uso: enumera-respeitoso.sh <dominio> <wordlist> [rps]}"
WORDLIST="${2:?informe a wordlist}"
RPS="${3:-3}"

MAX_RPS=10
if [ "$RPS" -gt "$MAX_RPS" ]; then
    echo "⚠ RPS ${RPS} > limite ${MAX_RPS} — abortando" >&2
    echo "⚠ volume alto é abuso de infraestrutura alheia" >&2
    exit 2
fi

INTERVALO=$(awk -v r="$RPS" 'BEGIN{printf "%.3f", 1/r}')
UA="enum-audit/1.0 (autorizado: <referencia>)"

log() { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*" >&2; }

# ── 0. robots antes de tudo ─────────────────────────────────
log "consultando robots.txt"
ROBOTS=$(curl -s --max-time 10 -A "$UA" "https://${DOMINIO}/robots.txt" 2>/dev/null || true)
if printf '%s' "$ROBOTS" | grep -qi 'disallow: */$'; then
    log "⚠ robots bloqueia tudo — reconsiderar"
fi

# ── 1. wildcard antes de enumerar ───────────────────────────
log "testando wildcard"
aleatorio="nao-existe-$(head -c 6 /dev/urandom | base64 | tr -d '/+=')"
if [ -n "$(dig +short A "${aleatorio}.${DOMINIO}" 2>/dev/null)" ]; then
    log "⚠ WILDCARD ATIVO — contagem por existência não é confiável"
fi

# ── 2. enumeração com limite e respeito ─────────────────────
n=0
while IFS= read -r nome; do
    [ -z "$nome" ] && continue
    case "$nome" in \#*) continue;; esac
    n=$((n+1))

    resp=$(curl -s -w '\n%{http_code}' -o /dev/null --max-time 8 -A "$UA" \
                "https://${nome}.${DOMINIO}/" 2>/dev/null)
    codigo=$(printf '%s' "$resp" | tail -1)

    case "$codigo" in
        429) log "429 — serviço pediu para parar; aguardando 60 s"
             sleep 60 ;;
        200|403|401|301|302) log "[${n}] ${nome}.${DOMINIO} → ${codigo}" ;;
    esac

    sleep "$INTERVALO"
done < "$WORDLIST"

log "concluído: ${n} nomes"
SCRIPT
chmod +x enumera-respeitoso.sh
```

⚠ **Note as três travas no script:**
1. **RPS máximo** — recusa acima de 10
2. **`robots` consultado primeiro** — e avisa se bloqueia tudo
3. **`429` tratado como instrução** — aguarda 60 s

⚠ **E o `User-Agent` se identifica.** Quem opera o serviço precisa saber quem consulta — sem isso,
você é tráfego anônimo indistinguível de abuso.

---

## 8.5 A declaração de conduta

⚠ **O instrumento que fecha o relatório — e o que o torna defensável.**

```markdown
# Declaração de conduta — enumeração

## 1. Autorização
| Item | Valor |
|---|---|
| Base | [ativo próprio / contrato nº ____ / programa ____] |
| Referência (URL ou documento) | |
| Data da autorização | |
| Escopo autorizado | |

## 2. Escopo efetivamente usado
| Ativo | Tipo | Dentro do escopo? |
|---|---|---|

## 3. Fora do escopo — não tocado
| Ativo | Por que deixei fora |
|---|---|

## 4. Volume
| Recurso | Volume máximo usado |
|---|---|
| Consultas DNS/s | |
| Requisições HTTP/s | |
| Total de nomes testados | |
| Recursos de terceiro consultados | |

## 5. O que eu NÃO fiz — declaração explícita
- [ ] Não varri porta em ativo que não é meu
- [ ] Não reivindiquei nenhum recurso (bucket, subdomínio, tenant)
- [ ] Não baixei conteúdo de bucket, repositório ou artefato
- [ ] Não usei credencial encontrada
- [ ] Não acessei painel administrativo
- [ ] Não me cadastrei em serviço para testar
- [ ] Não contornei autenticação ou rate limit
- [ ] Não testei fora da janela autorizada
- [ ] Não enumerei ativo fora do escopo

## 6. O que eu reportei
| Achado | A quem | Data | Canal |
|---|---|---|---|

## 7. Dados encontrados
| Tipo de dado | O que fiz | Retenção |
|---|---|---|

## 8. Limitações desta enumeração
- Fontes não consultadas, e por quê
- Período não coberto
- Ativo que eu não consegui atribuir

## Assinatura
Analista: ______  Data: ______
```

⚠ **A seção 5 é a mais importante, e ela é uma lista de "não".** Em auditoria, **o que você não fez
protege tanto quanto o que fez** — e declarar é o que impede a dúvida.

⚠ **A seção 7 é a que a LGPD exige.** Enumeração frequentemente **encontra dado pessoal**: nome de
funcionário no metadado, e-mail no `SOA`, lista de membro em painel. **O que fazer com isso é
obrigação, não escolha** — minimização, sigilo, retenção definida, destruição documentada.

---

## 8.6 LAB — A declaração, sobre o seu caso

**Duração:** 60 min

### Passo 1 — Aplique o teste de proporcionalidade (20 min)

⚠ **Para cada consulta que você fez nos módulos 2 a 6, aplique as seis etapas.**

```bash
cd ~/enum-lab/lab8

cat > proporcionalidade.csv <<'EOF'
etapa_autorizacao,etapa_necessidade,etapa_volume,etapa_impacto,etapa_proporcao,etapa_registro,veredito
EOF

cat >> proporcionalidade.csv <<'EOF'
sim,sim,baixo,nenhum,sim,sim,PASSA
sim,sim,alto,possivel,depende,parcial,REVER
nao,-,-,-,-,-,BLOQUEIA
EOF

column -t -s, proporcionalidade.csv
```

Produza `proporcionalidade.md` com **as suas próprias consultas**:

| Consulta feita | Autorização | Volume | Passa? | O que você ajustaria |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Responda:**

1. Alguma consulta sua **não passaria** no teste? Qual?
2. Você usou um volume que, em retrospecto, era **alto demais**?
3. **Qual etapa você esqueceu de aplicar?** (A maioria esquece a 3 — volume.)
4. O que você faria **diferente** numa próxima enumeração?

### Passo 2 — Verifique o volume real do que você fez (20 min)

⚠ **Meça o que você fez**, em vez de estimar.

```bash
cd ~/enum-lab

echo "═══ volume usado nos labs ═══"
echo

# nomes testados
for f in lab2/nomes.txt lab3/nomes-ct.txt; do
    [ -f "$f" ] && printf '  %-28s %s nomes\n' "$f" "$(wc -l < "$f")"
done

# consultas registradas
for f in lab1/registro.tsv lab2/registro-dns.tsv; do
    [ -f "$f" ] && printf '  %-28s %s consultas\n' "$f" "$(($(wc -l < "$f") - 1))"
done

echo
echo "═══ recursos de TERCEIRO consultados ═══"
echo "  crt.sh            (log público — uso aceitável, ritmo baixo)"
echo "  whois.cymru.com   (serviço público — pede ritmo de ~1/s)"
echo "  web.archive.org   (CDX API — pede ritmo baixo)"
echo
echo "  ⚠ estes são infraestrutura de terceiro: o volume é conduta, não performance"
```

Produza `volume-real.md`:

| Recurso | Volume usado | Ritmo | Aceitável? | Observação |
|---|---|---|---|---|
| `crt.sh` | | | | |
| `whois.cymru.com` | | | | |
| CDX API | | | | |
| Alvo direto | | | | |

**Responda:**

1. **Qual recurso de terceiro você consultou mais?**
2. Você respeitou o ritmo recomendado em cada um?
3. Algum dos seus scripts **não tinha `sleep`**? Qual?
4. **O que você mudaria** para a próxima vez?

⚠ **A resposta 3 é autoauditoria.** Se algum script seu rodou sem pausa, você usou infraestrutura
de terceiro sem ritmo — e isso é o comportamento que o módulo existe para corrigir.

### Passo 3 — Escreva a declaração (20 min)

Produza `declaracao-conduta.md` com as **oito** seções do §8.5, **preenchidas para o seu caso**.

Requisitos:

| Seção | Mínimo |
|---|---|
| 1 — Autorização | Base **nomeada** |
| 2 — Escopo usado | Todos os ativos |
| 3 — Fora do escopo | **2 itens** que você deixou de fora |
| 4 — Volume | **Números reais**, do passo 2 |
| **5 — O que não fiz** | **Todas as nove caixas marcadas** |
| 6 — Reportado | O que você reportou, se reportou |
| 7 — Dados encontrados | **O que você achou de dado pessoal** |
| 8 — Limitações | **3 itens** |

**Responda:**

1. **Todas as nove caixas da seção 5 estão marcadas?** Se alguma não, você tem um problema.
2. Você **encontrou dado pessoal** durante a enumeração? Onde?
3. O que você fez com ele?
4. **A declaração é suficiente** para você se defender? Justifique.

⚠ **A resposta 4 é o teste real.** Se alguém questionar sua conduta, **a declaração responde**. Se
ela não responde, ela está incompleta.

### Critérios de aceitação

- `proporcionalidade.md` com as **suas consultas** avaliadas nas seis etapas.
- Você identificou **uma consulta que não passaria** no teste.
- `volume-real.md` com os **números medidos**, não estimados.
- Você identificou **o script sem `sleep`**, se houver.
- `declaracao-conduta.md` com as **oito** seções.
- As **nove** caixas da seção 5 marcadas.
- Você identificou **dado pessoal encontrado** e o que fez com ele.
- Você respondeu se a declaração **o defende**.

---

## Avaliação

1. Diferencie consulta, enumeração e varredura. Onde está a linha de cada uma?
2. **Por que o volume define o ato** e não a intenção?
3. Por que 10.000 `dig` contra o resolvedor alheio é abuso, mesmo sendo consulta pública?
4. Qual a linha entre enumeração e varredura? O que "só enumerei" não é defesa para?
5. Cite três autorizações e o que cada uma cobre.
6. **Qual a armadilha do bug bounty?** Por que ler o escopo inteiro é obrigatório?
7. Qual a armadilha do contrato de auditoria?
8. Aplique o teste de proporcionalidade em seis etapas a um caso concreto.
9. **Qual etapa é a mais esquecida**, e por quê?
10. Diferencie termo de serviço, `robots.txt` e `429`. Qual vincula, e qual é instrução?
11. Por que ignorar `429` é abuso, e não performance?
12. Por que o `User-Agent` deve se identificar?
13. Qual seção da declaração de conduta é uma lista de "não", e por que ela importa?
14. O que a LGPD exige sobre dado pessoal encontrado na enumeração?
15. Por que "é só enumeração pública" não é defesa contra ativo de terceiro?

---

**Próximo:** [Módulo 9 — Projeto: mapa de superfície autorizado](modulo-09.md)
