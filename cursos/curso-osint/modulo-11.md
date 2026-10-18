# Módulo 11 — Documentação e Cadeia de Custódia

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 10

---

## Objetivos

1. Entender por que **registro** transforma achado em prova.
2. Preservar conteúdo de forma que sobreviva à remoção.
3. Aplicar princípios de cadeia de custódia do **Berkeley Protocol** e da **ISO 27037**.
4. Escrever relatório reprodutível e defensável.
5. Documentar o **negativo** — o que não foi encontrado.

---

## ⚠ Conduta

⚠ **Este módulo trata de prova**, e prova tem requisito. Nada aqui é sobre acessar mais — é sobre
**documentar bem o que você já acessou legitimamente**.

⚠ **E uma nota real:** documentar demais também é risco. Se o seu relatório contém dado pessoal
que não era necessário à finalidade (Módulo 10), o relatório é **tratamento de dado pessoal** —
com as obrigações correspondentes. **Minimização se aplica ao relatório também.**

---

## 11.1 Por que documento — a diferença entre achado e prova

Já dito no Módulo 1, e aqui é o aprofundamento.

| Achado | Prova |
|---|---|
| "Encontrei isso" | "Isto está em [fonte], consultada em [data], por [método], e a cópia está em [local]" |
| Não reproduzível | **Reprodutível** por terceiro |
| Some quando a página cai | **Preservado** |
| Opinião | **Verificável** |

⚠ **A reprodutibilidade é o critério.** Se outra pessoa **não consegue** chegar ao mesmo resultado
com o que você registrou, não é prova — é relato.

⚠ **E o requisito é do **método**, não da boa-fé.** Você pode estar certo e ainda assim não ter
prova, porque não registrou quando e como. **A parte mais frustrante do trabalho de investigação**
é redescobrir algo e não conseguir provar.

### O que registrar, sempre

| Elemento | Por quê | Exemplo |
|---|---|---|
| **Fonte** | Origem identificável | URL completa, com caminho |
| **Data e hora** | Conteúdo muda | `2026-10-18T14:32:11Z` |
| **Método** | Como você chegou | "busca por operador `site:` + CDX" |
| **O que você viu** | O dado exato | Captura, não paráfrase |
| **O que você NÃO viu** | O negativo | "não havia registro de X" |
| **Confiança** | Grau da conclusão | alta / moderada / baixa |
| **Limitações** | O que não se pode concluir | sempre |

---

## 11.2 Preservação — o conteúdo é volátil

⚠ **A página que você cita hoje pode não existir amanhã.** Já visto no Módulo 3; aqui, o
procedimento.

| Método | O que preserva | Confiabilidade |
|---|---|---|
| **Wayback Machine** | Cópia pública, com timestamp | Alta — é de terceiro, verificável |
| **archive.today** | Cópia sob demanda | Alta |
| **Captura de tela com URL e data visíveis** | Aparência | Média |
| **Salvamento local (`wget`, `curl -o`)** | Bytes exatos | Média — você controla |
| **PDF da página** | Aparência + texto | Média |
| **Hash do conteúdo salvo** | **Integridade** | **Alta** — prova que não mudou |
| **Vídeo → arquivo** | Conteúdo original | Alta |

⚠ **A linha do hash é a que quase ninguém faz e a que dá força.** Salvar o conteúdo **e** calcular
o SHA-256 dele permite provar que o arquivo que você apresenta **é** o que você coletou.

```bash
mkdir -p ~/osint-lab/lab11/evidencia && cd ~/osint-lab/lab11

# Preservar uma página, com prova de integridade
preserva() {
    local url="$1"
    local nome
    nome=$(printf '%s' "$url" | sed 's|https\?://||; s|[/?&=]|_|g' | cut -c1-80)
    local dir="evidencia/${nome}"

    mkdir -p "$dir"
    printf '%s\n' "$url" > "$dir/FONTE.txt"
    printf '%s\n' "$(date -Is)" > "$dir/COLETADO-EM.txt"

    # Bytes exatos
    curl -sSL --max-time 30 -A "OSINT-research/1.0" "$url" -o "$dir/pagina.html" || true

    # Hash de integridade
    sha256sum "$dir/pagina.html" > "$dir/pagina.sha256" 2>/dev/null || true

    # Cópia em arquivo público (para sobreviver à remoção)
    printf '%s\n' "Arquivar manualmente em web.archive.org/save/${url}" > "$dir/ARQUIVAR.txt"

    echo "Preservado em ${dir}"
    cat "$dir/pagina.sha256" 2>/dev/null
}

preserva "https://example.com"
```

⚠ **Sempre faça as **duas** coisas:** salve local **e** arquive em serviço público. O local é o
que você controla; o público é o que é verificável por terceiro **e** sobrevive à remoção.

---

## 11.3 Cadeia de custódia

O conceito que vem da investigação forense, adaptado a OSINT. O padrão é o **Berkeley Protocol
on Digital Open Source Investigations** (ONU) e a **ISO 27037**.

```
COLETA → PRESERVAÇÃO → ANÁLISE → APRESENTAÇÃO
   │           │            │            │
   │           │            │            └─ quem, quando, como
   │           │            └─ método, ferramenta, versão
   │           └─ hash, cópia, armazenamento
   └─ fonte, data, autor
```

### O registro de custódia

```markdown
# Cadeia de Custódia

## Item: EVD-001
Descrição: página de listagem de contratos do órgão X
Fonte original (URL): https://...
Coletado por: <nome>
Coletado em: 2026-10-18T14:32:11Z
Método: curl + salvamento local, com User-Agent identificado

## Integridade
SHA-256 do arquivo: <hash>
Arquivo: evidencia/.../pagina.html
Cópia pública: https://web.archive.org/web/...

## Histórico
| Data/hora | Quem | Ação | Observação |
|---|---|---|---|
| 2026-10-18T14:32Z | <nome> | Coleta | — |
| 2026-10-18T14:35Z | <nome> | Arquivamento público | — |
| 2026-10-18T15:10Z | <nome> | Análise | Extraí a tabela |
| 2026-10-19T09:00Z | <revisor> | Verificação | Confirmou hash |

## Observações
- Conteúdo mudou desde a coleta? [ ] sim  [ ] não
- Alguém além de mim teve acesso? [ ] sim  [ ] não
```

⚠ **A linha "conteúdo mudou?" é o que o registro de custódia existe para responder.** Se a página
mudou depois, você tem a versão da data — e a cópia arquivada prova isso.

⚠ **A linha "alguém além de mim" é o que protege a integridade.** Prova que pode ser contestada é
prova que registra **quem tocou** — e isso vale tanto em tribunal quanto em jornalismo.

---

## 11.4 O relatório reprodutível

O formato que um terceiro consegue seguir.

```markdown
TLP:AMBER

# [Título: o que a investigação descobriu]

Data: 2026-10-18        Autor: <nome>
Classificação: TLP:AMBER     Confiança global: moderada

---

## 1. Sumário
(3 a 5 frases. O que foi investigado, o que se encontrou, o que importa.)

## 2. Pergunta de investigação
(O que se pretendia responder — a fase 1 do ciclo.)

## 3. Base legal / escopo
(Do Módulo 10. Obrigatório quando há pessoa no escopo.)

## 4. Método
| Etapa | O que foi feito | Ferramenta / técnica |
|---|---|---|
(Reprodutível: outra pessoa consegue repetir?)

## 5. Achados
### 5.1 [Achado 1]
- **O que:** ______
- **Fonte:** [URL]  **Data da consulta:** ______
- **Evidência:** evidencia/EVD-00X
- **Confiança:** alta / moderada / baixa
- **Corroboração:** [segunda fonte independente]

### 5.2 [...]

## 6. Linha do tempo
| Data | Evento | Fonte | Evidência |

## 7. Análise
(O que os achados juntos significam — e o raciocínio.)

## 8. Confiança e o que NÃO se pode concluir
⚠ Obrigatória.
| Item | Confiança | Por que não é mais alta | O que seria necessário |
|---|---|---|---|

## 9. O que NÃO foi encontrado
⚠ Obrigatória.
| Busquei | Onde | Resultado | O que a ausência significa |
|---|---|---|---|

## 10. Anexos
| ID | Tipo | Arquivo | SHA-256 |
|---|---|---|---|
```

⚠ **As seções 8 e 9 são o que separa relatório profissional de relatório amador.** A 8 diz **o
limite da conclusão**; a 9 diz **o que foi procurado e não achado** — e essa segunda é o que
impede que outra pessoa refaça o trabalho.

⚠ **A seção 9 tem um efeito colateral valioso:** ela **força você a registrar o negativo**, o que
evita a armadilha do "não achei, logo não existe".

---

## 11.5 Documentar o negativo

⚠ **A parte mais subestimada do módulo.** Um negativo **documentado** é achado; um negativo
**não documentado** é trabalho refeito.

| Formato | O que significa |
|---|---|
| "Não encontrei nada" | **Nada.** Inútil. |
| "Busquei X em Y, em [data], com [método], e não havia registro" | **Achado.** |
| "Busquei X em Y e não encontrei; **não busquei em Z** porque [razão]" | **Achado forte.** |

⚠ **A terceira linha é o padrão.** Ela diz o que você cobriu **e** o que ficou fora — e o que
ficou fora é frequentemente onde o dado está.

**Exemplo de seção 9 bem escrita:**

```markdown
## 9. O que NÃO foi encontrado

| Busquei | Onde | Resultado | O que a ausência significa |
|---|---|---|---|
| Empresa no Handelsregister alemão | handelsregister.de | Não encontrada | Não há registro com este nome exato. **Não** significa que não existe: pode estar sob outro nome, ou ser filial |
| Sanção | OpenSanctions | Nada | Ausência **não é** prova: base tem cobertura parcial |
| Registro no UK | Companies House | Não encontrado | Sem entidade britânica com este nome |

⚠ **Não coberto:** registros em jurisdições sem consulta pública; variação
de transliteração do nome; entidades constituídas após a data da consulta.
```

⚠ **A nota final é obrigatória.** Ela é a diferença entre "não existe" e "não encontrei **com esta
busca**".

---

## 11.6 LAB — Preservar, registrar e escrever

**Duração:** 120 min

⚠ **Sujeito:** empresa ou entidade pública, ou a sua pegada. Nunca pessoa.

### Passo 1 — Preserve com integridade (35 min)

```bash
mkdir -p ~/osint-lab/lab11/evidencia && cd ~/osint-lab/lab11

# Use a função do §11.2
cat > preserva.sh <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

preserva() {
    local url="${1:?informe a URL}"
    local nome dir
    nome=$(printf '%s' "$url" | sed 's|https\?://||; s|[/?&=]|_|g' | cut -c1-80)
    dir="evidencia/${nome}"
    mkdir -p "${dir}"

    printf '%s\n' "${url}"            > "${dir}/FONTE.txt"
    printf '%s\n' "$(date -Is)"       > "${dir}/COLETADO-EM.txt"
    printf '%s\n' "OSINT-research/1.0" > "${dir}/USER-AGENT.txt"

    curl -sSL --max-time 30 -A "OSINT-research/1.0" "${url}" \
         -o "${dir}/pagina.html" 2>/dev/null || echo "(falha ao baixar)" > "${dir}/pagina.html"

    sha256sum "${dir}/pagina.html" 2>/dev/null > "${dir}/pagina.sha256" || true

    {
      echo "Arquive também em:"
      echo "  https://web.archive.org/save/${url}"
      echo "  https://archive.ph/  (manual)"
    } > "${dir}/ARQUIVAR.txt"

    echo "── ${dir} ──"
    ls -la "${dir}"
    cat "${dir}/pagina.sha256" 2>/dev/null
}

preserva "${1:?uso: preserva.sh <url>}"
SCRIPT
chmod +x preserva.sh

# Preserve uma fonte pública real do seu caso
./preserva.sh "https://example.com"
```

**Produza `preservacao.md`:**

| Item | Valor |
|---|---|
| URL coletada | |
| Data/hora da coleta | |
| Tamanho do arquivo | |
| **SHA-256** | |
| Arquivo público arquivado? | |

**Responda:**

1. O SHA-256 **prova** o quê, exatamente?
2. Se a página mudar amanhã, **como você prova o que estava lá hoje**?
3. Por que salvar local **e** arquivar em público? Qual a função de cada um?
4. O `User-Agent` ficou registrado? Por que isso importa?

### Passo 2 — Cadeia de custódia (30 min)

Escolha **três** evidências do seu caso (do Módulo 6 ou 7) e produza a ficha do §11.3 para cada.

**Depois responda:**

1. Você consegue **reproduzir** cada coleta? Se não, o que falta?
2. Alguma evidência sua **já mudou** desde que você coletou?
3. Quem, além de você, tocou nos arquivos? Está registrado?

### Passo 3 — Relatório (40 min)

Produza `relatorio.md` com as **dez** seções do §11.4.

⚠ **As seções 8 e 9 são obrigatórias e são o que será avaliado com mais rigor.**

Requisitos mínimos:

| Seção | Mínimo |
|---|---|
| 5 (Achados) | 3 achados, cada um com fonte, data, evidência e confiança |
| 6 (Linha do tempo) | 4 eventos |
| **8 (Confiança)** | **cada achado com o motivo de a confiança não ser mais alta** |
| **9 (Não encontrado)** | **4 linhas, mais a nota de "não coberto"** |
| 10 (Anexos) | cada evidência com SHA-256 |

### Passo 4 — O teste de reprodutibilidade (15 min)

⚠ **O teste que decide se o seu relatório vale.**

Entregue o relatório a **alguém** (colega, ou você mesmo depois de 24h) e peça que responda:

| Pergunta | Resposta |
|---|---|
| Você consegue repetir a coleta **só** com o que está escrito? | |
| Em qual achado faltou informação? | |
| Alguma fonte não tem URL completa? | |
| Algum achado não tem cópia preservada? | |

**Se não houver ninguém para testar**, faça o exercício sozinho: leia o relatório como se fosse de
outra pessoa, e anote **onde você travaria**.

**Responda:**

1. **Em qual achado faltou informação** para reproduzir?
2. Que correção você faz no relatório?
3. **Por que o teste de reprodutibilidade é o critério**, e não a sua convicção?

### Critérios de aceitação

- `preservacao.md` com o **SHA-256 real** de uma coleta feita.
- Você explicou o que o hash prova e o que ele **não** prova.
- Três fichas de cadeia de custódia, com o **histórico** preenchido.
- `relatorio.md` com as **dez** seções.
- Cada achado com **fonte, data, evidência e confiança**.
- A **seção 8** traz, para cada achado, o motivo de a confiança **não** ser mais alta.
- A **seção 9** tem quatro buscas registradas **mais** a nota de "não coberto".
- O **teste de reprodutibilidade** foi feito, e a falha identificada e corrigida.
- ⚠ Nenhuma pessoa como alvo.

---

## Avaliação

1. Diferencie achado de prova. Qual é o critério que os separa?
2. Cite cinco elementos que você registra sempre. Qual é o mais esquecido?
3. Por que o hash do conteúdo salvo dá força à preservação? O que ele prova?
4. Por que salvar local **e** arquivar em público? Qual a função de cada um?
5. Descreva as quatro etapas da cadeia de custódia.
6. Por que o registro de custódia precisa dizer **quem tocou** no material?
7. Por que "conteúdo mudou?" é a pergunta que a custódia existe para responder?
8. O que torna um relatório **reprodutível**? Qual o teste prático?
9. Por que as seções "confiança" e "não encontrado" separam relatório profissional de amador?
10. Escreva a diferença entre "não encontrei nada" e um negativo documentado.
11. Por que a nota de "não coberto" é obrigatória na seção 9?
12. Por que minimização se aplica **ao relatório** também, e não só à coleta?

---

**Próximo:** [Módulo 12 — Projeto: investigação completa internacional](modulo-12.md)
