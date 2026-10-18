# Módulo 12 — Projeto: Investigação Completa Internacional

**Carga:** 3 horas
**Pré-requisitos:** Módulos 1 a 11

---

## O objetivo do módulo

**Um entregável:** uma investigação que atravessa **três jurisdições**, do planejamento ao
relatório, com base legal declarada, cadeia de custódia e limitações.

Não é um exercício sobre OSINT em abstrato. É o método completo aplicado uma vez, ponta a ponta.

---

## ⚠ Sujeito permitido

⚠ **Este projeto **não** usa pessoa real.** Escolha **um** dos três sujeitos:

| Sujeito | Descrição | Onde as jurisdições vêm |
|---|---|---|
| **A — Empresa com subsidiárias** | Grupo real, listado em bolsa, com entidades em 3+ países | Das próprias subsidiárias |
| **B — ONG internacional** | Organização com escritórios em vários países e registro em cada um | Dos registros nacionais |
| **C — O seu próprio rastro internacional** | Você, se tem presença digital em mais de um serviço/país | Seus próprios dados |

⚠ **Sujeito C é legítimo e mais fácil de obter**, mas rende menos em estrutura de propriedade. Se
você tem uma conta em serviço europeu, um domínio, e publicou em plataforma americana, você
**tem** três jurisdições.

⚠ **Nunca pessoa real.** Nem figura pública, nem conhecido, nem "só para testar".

---

## 12.1 O que você vai produzir

```
projeto/
├── 00-escopo.md              o que, por quê, e sob qual base
├── 01-avaliacao-impacto.md   do Módulo 10 — ANTES de coletar
├── 02-planejamento.md        as seis fases do ciclo, com jurisdições
├── 03-identificadores.md     o que cada dado já diz (Módulo 2)
├── 04-coleta/                evidência preservada, com hash
├── 05-cadeia-custodia.md     registro de cada evidência
├── 06-achados.md             o que foi encontrado, com fonte e confiança
├── 07-jurisdicoes.md         o que muda em cada país
├── 08-relatorio.md           o relatório final (Módulo 11)
└── 09-negativo.md            o que foi buscado e não encontrado
```

⚠ **A ordem é o método.** A avaliação de impacto vem **antes** da coleta — não depois. Se você
coletar primeiro e avaliar depois, o exercício perde o sentido.

---

## 12.2 Fase 1 — Escopo e base legal (30 min)

**Produza `00-escopo.md` e `01-avaliacao-impacto.md`.**

`00-escopo.md`:

```markdown
# Escopo da investigação

## Sujeito
Tipo: [empresa / ONG / meu próprio rastro]
Nome: ______

## Pergunta de investigação
(Escrita, respondível. Se não couber em uma frase, não está definida.)

## Por que esta pergunta
(Que decisão ela informa?)

## As três jurisdições
| # | Jurisdição | Como ela entra no escopo |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

## O que está FORA do escopo
⚠ Obrigatório. Liste o que você não vai investigar e por quê.
```

`01-avaliacao-impacto.md`: as **nove seções** do Módulo 10, §10.5.

**Responda:**

1. As três jurisdições são **reais** ou forçadas? Se forçadas, escolha outro sujeito.
2. Qual a **base legal**, e por que não a mais conveniente?
3. **Há pessoa natural no escopo?** Se sim, você aplicou o teste de necessidade?
4. O que você decidiu **não** coletar?

---

## 12.3 Fase 2 — Planejamento e identificadores (30 min)

**Produza `02-planejamento.md` e `03-identificadores.md`.**

Para **cada** identificador que você tem do sujeito, preencha **antes de consultar**:

| Identificador | Tipo | Jurisdição que sugere | Classe de fonte | O que mais ele diz |
|---|---|---|---|---|
| | | | | |

⚠ **Preencha esta tabela antes de qualquer consulta.** Se você preencher depois, você não está
testando o método — está reconstruindo o que já sabe.

**Depois responda:**

1. Em quantos casos o identificador **já dizia** onde procurar?
2. Em algum caso ele **enganou**? (TLD `.io`, `+1`, campo `O` de certificado.)
3. Para cada jurisdição, qual é o **registro** correspondente?

`02-planejamento.md` — as seis fases do ciclo (Módulo 1), aplicadas:

| Fase | O que você faria | Ferramenta | Jurisdição |
|---|---|---|---|
| 1. Definição | | | |
| 2. Planejamento | | | |
| 3. Coleta | | | |
| 4. Verificação | | | |
| 5. Análise | | | |
| 6. Documentação | | | |

⚠ **A linha 4 (verificação) precisa nomear a segunda fonte independente** e explicar por que ela
é independente — não repetição da primeira (Módulo 1, §1.4).

---

## 12.4 Fase 3 — Coleta com preservação (45 min)

⚠ **Cada item coletado vira uma evidência com ficha.**

```bash
mkdir -p ~/osint-lab/lab12/{evidencia,coleta} && cd ~/osint-lab/lab12

# Use o preserva.sh do Módulo 11
cp ~/osint-lab/lab11/preserva.sh . 2>/dev/null || cat > preserva.sh <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
preserva() {
    local url="${1:?informe a URL}"
    local nome dir
    nome=$(printf '%s' "$url" | sed 's|https\?://||; s|[/?&=]|_|g' | cut -c1-80)
    dir="evidencia/${nome}"
    mkdir -p "${dir}"
    printf '%s\n' "${url}"        > "${dir}/FONTE.txt"
    printf '%s\n' "$(date -Is)"   > "${dir}/COLETADO-EM.txt"
    curl -sSL --max-time 30 -A "OSINT-research/1.0" "${url}" \
         -o "${dir}/pagina.html" 2>/dev/null || true
    sha256sum "${dir}/pagina.html" > "${dir}/pagina.sha256" 2>/dev/null || true
    echo "── ${dir}"; cat "${dir}/pagina.sha256" 2>/dev/null
}
preserva "${1:?uso: preserva.sh <url>}"
SCRIPT
chmod +x preserva.sh

# Colete suas fontes (empresa pública, registro, certificado)
# ./preserva.sh "https://open.../registro"
# ./preserva.sh "https://crt.sh/?q=dominio"
```

**Produza `05-cadeia-custodia.md`** com uma ficha por evidência, no modelo do Módulo 11, §11.3.

**Requisitos mínimos de coleta:**

| # | O que coletar | Onde |
|---|---|---|
| 1 | Registro na **jurisdição principal** | Registro nacional |
| 2 | Registro em **segunda jurisdição** | Registro nacional |
| 3 | Evidência de **terceira jurisdição** | Registro, ou certificado, ou agregador |
| 4 | **Certificado** (pivô por SAN) | `crt.sh` |
| 5 | **Infraestrutura** (ASN, provedor) | `whois` |
| 6 | **Metadado** de algum documento público | `exiftool` |
| 7 | **Histórico** (CDX) | Arquivo morto |

⚠ **Cada item acima com hash e ficha.** Sem isso, o achado é frágil.

---

## 12.5 Fase 4 — Achados e jurisdições (35 min)

**Produza `06-achados.md` e `07-jurisdicoes.md`.**

`06-achados.md` — um bloco por achado:

```markdown
## Achado N — [título curto]

- **O que:** ______
- **Fonte primária:** [URL]   **Data:** ______
- **Fonte de corroboração:** [URL]   **Data:** ______
- **Independência da segunda fonte:** [por que não é repetição]
- **Evidência preservada:** evidencia/EVD-00N  (SHA-256: ______)
- **Jurisdição:** ______
- **Confiança:** alta / moderada / baixa
- **Por que não é mais alta:** ______
- **O que NÃO se pode concluir disto:** ______
```

`07-jurisdicoes.md` — **a seção que dá nome ao curso**:

| Jurisdição | Regime de dado | Regime de empresa | O que mudou no seu método | O que você teve que fazer diferente |
|---|---|---|---|---|
| | | | | |

**Responda:**

1. **O que foi mais difícil** em cada jurisdição, e por quê?
2. Em qual jurisdição a **fonte oficial** existia e era consultável? Em qual não?
3. Onde você teve que **parar** por limite legal (Módulo 10)?
4. O que teria sido **diferente** se o alvo estivesse só no Brasil?

⚠ **A resposta 4 é a prova do curso.** Se a resposta for "nada seria diferente", você não trabalhou
através de fronteira — você investigou algo que já era do seu país.

---

## 12.6 Fase 5 — Relatório e negativo (40 min)

**Produza `08-relatorio.md`** com as **dez** seções do Módulo 11, §11.4.

**Produza `09-negativo.md`:**

```markdown
# O que foi buscado e NÃO encontrado

## Buscas realizadas
| Busquei | Onde | Jurisdição | Data | Resultado | O que a ausência significa |
|---|---|---|---|---|---|
| | | | | | |

## NÃO COBERTO
⚠ Obrigatório. O que ficou fora do alcance da investigação, e por quê:
- Jurisdições sem consulta pública: ______
- Dado restrito que exigiria base legal que você não tem: ______
- Variações que você não testou (transliteração, nome alternativo): ______
- Período não coberto: ______

## O que seria necessário para cobrir
| Lacuna | O que resolveria | Custo / requisito legal |
|---|---|---|
```

⚠ **A seção "NÃO COBERTO" é o entregável mais honesto do projeto.** Ela é o que impede que o
relatório seja lido como "investigação completa" quando ela não é.

---

## 12.7 Fase 6 — Teste de reprodutibilidade (20 min)

⚠ **O teste que decide se o projeto vale.**

Entregue o projeto a alguém — ou releia com 24h de distância — e responda:

| Pergunta | Resposta |
|---|---|
| Consigo repetir cada coleta **só** com o que está escrito? | |
| Em qual achado faltou informação? | |
| Alguma fonte sem URL completa? | |
| Alguma evidência sem hash? | |
| Algum achado sem confiança declarada? | |
| Alguma conclusão que **excede** a evidência? | |

**Corrija o que falhar** e registre as correções em `10-revisao.md`.

---

## Os entregáveis avaliados

| # | Arquivo | Peso | O que se avalia |
|---|---|---|---|
| 1 | `00-escopo.md` | 5% | Pergunta respondível; três jurisdições reais |
| 2 | `01-avaliacao-impacto.md` | **15%** | As nove seções, com base legal justificada |
| 3 | `02-planejamento.md` | 5% | As seis fases, com o negativo previsto |
| 4 | `03-identificadores.md` | 10% | Preenchido **antes** de consultar |
| 5 | `05-cadeia-custodia.md` | 10% | Ficha por evidência, com histórico |
| 6 | `06-achados.md` | **20%** | Fonte, corroboração independente, confiança, limite |
| 7 | `07-jurisdicoes.md` | 10% | O que **mudou** por jurisdição |
| 8 | `08-relatorio.md` | **15%** | Dez seções, reprodutível |
| 9 | `09-negativo.md` | 10% | Buscas registradas + "não coberto" |

**Penalidades automáticas:**

- Coleta **antes** da avaliação de impacto: −20%.
- Achado sem fonte ou sem data: −15%.
- Corroboração que **cita a mesma origem** da primária: −15%.
- Achado sem **confiança declarada**: −15%.
- Conclusão que excede a evidência: −20%.
- Seção "não coberto" ausente: −15%.
- **Pessoa real como sujeito**: projeto zerado.

---

## Avaliação final

1. Por que a avaliação de impacto vem **antes** da coleta? O que muda se for depois?
2. Por que preencher a tabela de identificadores **antes** de consultar testa o método?
3. Cite três identificadores que **enganam** sobre a jurisdição. Por que cada um engana?
4. Por que "segunda fonte independente" não pode ser outro site com o mesmo dado?
5. O que o SHA-256 de uma evidência prova, e o que ele **não** prova?
6. Em qual jurisdição você teve que **parar**, e sob qual regra?
7. O que teria sido diferente se o alvo estivesse só no seu país?
8. Por que a seção "não coberto" é o entregável mais honesto do projeto?
9. O que o teste de reprodutibilidade revelou que você não tinha percebido?
10. **O que você faria diferente** se refizesse esta investigação?

---

## Encerramento do curso

Você começou distinguindo OSINT de acesso indevido e termina com uma investigação internacional
completa, com cadeia de custódia e limitações declaradas.

O que você aprendeu não foi uma lista de sites — foi **um método que funciona em qualquer país**:
ler o identificador antes de buscar, derivar o registro da estrutura do dado, corroborar com fonte
independente, declarar confiança, documentar o negativo, e **saber quando parar**.

E as coisas que o curso tentou te deixar, em ordem de importância:

| # | O que fica |
|---|---|
| 1 | **A fronteira não é "é público?" — é "qualquer pessoa obtém sem violar nada?"** |
| 2 | **O identificador diz onde procurar.** Ler antes de buscar. |
| 3 | **Confiança declarada é obrigatória.** Sem ela, o achado não é acionável. |
| 4 | **A mesma consulta tem legalidade diferente por jurisdição** — e você responde às duas leis. |
| 5 | **Saber quando não fazer** é a habilidade que separa profissional de curioso. |

⚠ **A nota final, e ela é sobre responsabilidade.** Você agora sabe encontrar informação sobre
pessoas, organizações e lugares que cruzam fronteiras. Isso serve para verificar o que alguém
afirma, proteger quem precisa de proteção, e responsabilizar quem abusa de poder. E serve para
perseguir, expor e vigiar. **O que separa os dois é a base legal, o escopo e o propósito** — e é
por isso que o curso obriga você a escrever isso **antes** de começar.

Referências para continuar: **Berkeley Protocol** (ONU) · **Bellingcat** ·
**OpenCorporates** · **OpenSanctions** · **Open Ownership** · **GLEIF** · **crt.sh** ·
**Wayback Machine / CDX** · **GDELT**, **ACLED** · **Copernicus / Sentinel** · **SunCalc** ·
**LGPD** e **GDPR** · **ISO 27037** (preservação de evidência)
