# Módulo 5 — Telefone Global

**Carga:** 3 horas (1h15 teoria · 1h45 lab)
**Pre-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Normalizar qualquer número para E.164, de qualquer país.
2. Identificar país, região, tipo e operadora — e saber o limite de cada um.
3. Entender por que **portabilidade** quebra a inferência de operadora.
4. Reconhecer o padrão de número por país e o que ele revela.
5. Fazer a análise de um número em **duas jurisdições** diferentes.

---

## ⚠ Conduta

⚠ **Este módulo tem uma linha específica:** o número que você investiga é o **seu**, o de uma
**identidade fictícia**, ou um número **empresarial público** (de empresa, publicado no site dela).

| Você pode | Você **não pode** |
|---|---|
| Analisar o seu número | Analisar número de terceiro |
| Analisar número empresarial público | Descobrir **quem** é o dono de um número |
| Validar formato e operadora | Fazer engenharia social com a operadora |
| Documentar o método | Usar serviço que promete "rastrear número" |

⚠ **A última linha do lado direito é importante.** Serviços que prometem "descubra o dono deste
número" ou operam com base vazada, ou são golpe. **Nenhum deles é OSINT.**

⚠ **Identidade fictícia é permitida** porque é um número construído para o exercício, não
atribuído a pessoa real. É a mesma lógica dos outros labs.

---

## 5.1 Normalizar antes de tudo

Sem normalização, a busca falha — e a maioria das falhas de investigação de telefone são de
**formato**, não de fonte.

```
FORMAS DO MESMO NÚMERO
+55 11 98765-4321          ← E.164 (correto)
011 98765-4321             ← local brasileiro, com zero de tronco
(11) 98765-4321            ← parêntese, sem código de país
+55 (11) 98765.4321        ← código de país com parêntese
0055 11 987654321          ← prefixo internacional (00) em vez de +
5511987654321             ← sem formatação
```

⚠ **Todas estas são o mesmo número, e uma base de dado pode ter qualquer uma.** Normalizar para
E.164 antes de buscar é o passo que a maioria pula.

```bash
mkdir -p ~/osint-lab/lab5 && cd ~/osint-lab/lab5

cat > normaliza.py <<'PY'
#!/usr/bin/env python3
"""Normaliza e classifica números — aceita formas locais com região explícita."""
import sys
import phonenumbers
from phonenumbers import geocoder, carrier, number_type, timezone, PhoneNumberFormat

def analisa(entrada: str, regiao_padrao: str = None) -> dict:
    try:
        p = phonenumbers.parse(entrada, regiao_padrao)
    except phonenumbers.NumberParseException as e:
        return {"erro": str(e)}

    validos = {
        "e164":       phonenumbers.format_number(p, PhoneNumberFormat.E164),
        "internacional": phonenumbers.format_number(
                             p, PhoneNumberFormat.INTERNATIONAL),
        "nacional":   phonenumbers.format_number(p, PhoneNumberFormat.NATIONAL),
        "codigo_pais": p.country_code,
        "regiao":     phonenumbers.region_code_for_number(p),
        "tipo":       number_type(p).name,
        "operadora":  carrier.name_for_number(p, "pt") or "-",
        "localidade": geocoder.description_for_number(p, "pt") or "-",
        "fuso":       (", ".join(timezone.time_zones_for_number(p)) or "-"),
        "valido":     phonenumbers.is_valid_number(p),
        "possivel":   phonenumbers.is_possible_number(p),
    }
    return validos

if __name__ == "__main__":
    casos = [
        ("+55 11 98765-4321", None),
        ("011 98765-4321",    "BR"),
        ("0055 11 987654321", "BR"),
        ("+49 40 1234567",    None),
        ("040 1234567",       "DE"),
        ("+44 20 7946 0958",  None),
        ("+1 202 555 0142",   None),
        ("+351 21 123 4567",  None),
        ("+81 3 1234 5678",   None),
    ]
    print(f"{'ENTRADA':<22} {'E.164':<18} {'PAÍS':<5} {'TIPO':<16} "
          f"{'LOCALIDADE':<18} {'V?'}")
    print("-" * 100)
    for entrada, regiao in casos:
        r = analisa(entrada, regiao)
        if "erro" in r:
            print(f"{entrada:<22} ERRO: {r['erro']}")
            continue
        print(f"{entrada:<22} {r['e164']:<18} {str(r['regiao']):<5} "
              f"{r['tipo']:<16} {r['localidade'][:17]:<18} "
              f"{'sim' if r['valido'] else 'NÃO'}")
PY

python3 normaliza.py
```

---

## 5.2 O que cada campo diz — e o limite de cada um

| Campo | O que diz | **Limite que você precisa saber** |
|---|---|---|
| `código_pais` | País do número | `+1` cobre EUA **e** Canadá, não distingue |
| `regiao` | País provável | Pode estar errado em número de serviço |
| `tipo` | Móvel, fixo, VoIP, especial | **Portabilidade pode invalidar** |
| `operadora` | Operadora **histórica** da faixa | **Portabilidade pode invalidar** |
| `localidade` | Região **da faixa** | **Não é onde a pessoa está** |
| `fuso` | Fuso do país/região | Aproximação |
| `valido` | O formato existe naquele país | **Não** diz se está em uso |

⚠ **As três linhas em negrito são onde a maioria erra.**

### Portabilidade — o campo que mente

**Portabilidade numérica** significa que o usuário pode manter o número ao **trocar de operadora**.
Consequência direta:

```
Número com faixa histórica da Operadora A
        │
        ▼
Pessoa mudou para Operadora B em 2021
        │
        ▼
O campo "operadora" retorna A ← FALSO
```

⚠ **E o mesmo vale para o tipo.** No Brasil, a faixa histórica de celular pode hoje ser usada por
serviço, e vice-versa em alguns casos.

| País | Portabilidade | Consulta oficial |
|---|---|---|
| **Brasil** | Sim, desde 2008 | Consulta pública da ABR Telecom |
| **Reino Unido** | Sim | Ofcom / serviço de consulta |
| **Alemanha** | Sim | Bundesnetzagentur |
| **EUA** | Sim | NPAC (consulta comercial) |
| **França** | Sim | ARCEP |

⚠ **A consequência metodológica:** usar `carrier` do `phonenumbers` é **indício**, não fato. Se a
operadora importa para a investigação, **verifique na fonte oficial do país**.

---

## 5.3 O padrão de número por país

Cada país organiza o número de forma própria, e o **padrão revela informação**.

| País | Estrutura | O que revela |
|---|---|---|
| **Brasil** | `+55` `DD` `9XXXX-XXXX` | DDD = região; `9` inicial = celular |
| **Alemanha** | `+49` `área variável` `número` | Área de 2 a 5 dígitos — **comprimento variável** |
| **Reino Unido** | `+44` `20` `XXXXXXXX` | `20` = Londres; `7` inicial = celular |
| **França** | `+33` `1` `XX XX XX XX` | `1` = Paris; `6`/`7` = celular |
| **EUA/Canadá** | `+1` `NPA` `NXX` `XXXX` | NPA = código de área |
| **Japão** | `+81` `3` `XXXX-XXXX` | `3` = Tóquio; 10 ou 11 dígitos |
| **Portugal** | `+351` `21` `XXX XXXX` | `21` = Lisboa; `9` = celular |
| **Espanha** | `+34` `9XX XXX XXX` | 9 dígitos, sem zero de tronco |
| **China** | `+86` `10` `XXXX XXXX` | `10` = Pequim |

⚠ **Alemanha é o caso mais confuso** porque o comprimento da área **varia**. Isso significa que
você não pode assumir quantos dígitos são área e quantos são assinante — o `phonenumbers` resolve,
mas o seu script manual pode errar.

⚠ **O zero de tronco é a armadilha global.** Em muitos países, o número **nacional** tem um zero
que **desaparece** no formato internacional: `040` em Hamburgo vira `+49 40`. Manter o zero quebra
a validação.

---

## 5.4 Números especiais e o que eles indicam

| Tipo | Exemplo | O que indica |
|---|---|---|
| **Fixo geográfico** | `+49 40 ...` | Região — mas **não** onde a pessoa está hoje |
| **Móvel** | `+55 11 9...` | Pode estar em qualquer lugar; a área é **histórica** |
| **VoIP / não geográfico** | Faixas específicas por país | Serviço, possível descartável |
| **Número de serviço** | `+44 800 ...`, `+55 0800 ...` | Chamada gratuita, institucional |
| **Premium** | `+55 0900 ...` | Cobrança — comum em fraude |
| **Toll-free** | `+1 800 ...` | Empresa, frequentemente do exterior |
| **Descartável** | Faixas de app de mensagem | **Achado por si** — evita identificação |

⚠ **A linha "descartável" é informação de investigação.** Um número de serviço de mensagem virtual
numa contraparte que diz ser "empresa estabelecida há 20 anos" é **inconsistência** — e
inconsistência é o que se procura.

⚠ **E a linha "VoIP" merece atenção:** VoIP permite número de qualquer país sem presença física.
Um número alemão não indica que a pessoa está na Alemanha.

---

## 5.5 A linha do que não se faz

Retomando a conduta, com precisão:

| Prática | Situação |
|---|---|
| Normalizar e classificar formato | **Legítimo** |
| Verificar se a faixa existe | **Legítimo** |
| Consultar portabilidade de **número próprio** | **Legítimo** |
| Analisar número empresarial publicado | **Legítimo** |
| Usar serviço que "descobre o dono" | **Não** — base vazada ou golpe |
| Ligar para descobrir quem atende | **Não** — abordagem ao alvo |
| Enviar mensagem para testar | **Não** — abordagem |
| Consultar cadastro restrito de operadora | **Não** — acesso indevido |

⚠ **A fronteira exata:** você analisa **a estrutura do número**. Não busca **quem o usa**. A segunda
pergunta exige base legal, e frequentemente não há fonte aberta que a responda legitimamente.

---

## 5.6 LAB — Análise de um número em duas jurisdições

**Duração:** 105 min

⚠ **Sujeitos permitidos:** o **seu** número, e os números **fictícios** abaixo. Mais nenhum.

### Passo 1 — A base (25 min)

Rode o `normaliza.py` e produza `base.md`:

| Entrada | E.164 | País | Tipo | Localidade | Operadora | Válido |
|---|---|---|---|---|---|---|
| | | | | | | |

**Responda:**

1. Qual entrada exigiu **região explícita** para ser interpretada? Por quê?
2. A **localidade** retornada é onde o dono está? Por quê não?
3. Qual número tem `tipo` **MENOS confiável**, e por quê?
4. `+1 202 555 0142` — qual país retornou? Isso significa que é daquele país?

⚠ **A resposta 4 é o ponto do §5.2.** `+1` é código compartilhado — a ferramenta chuta pelo
prefixo, e o chute pode estar certo ou não.

### Passo 2 — O caso de duas jurisdições (45 min)

```
CASO DIDÁTICO — "Contato inconsistente"

Nordwind Logistik GmbH (Alemanha) forneceu, na proposta comercial:

  Telefone comercial:  +49 40 1234567      → Hamburgo, fixo
  Telefone do contato: +55 11 91234-5678   → São Paulo, celular
  WhatsApp:            mesmo número brasileiro

A empresa diz ser alemã, com 20 anos de mercado, atendendo só na Europa.
```

**Produza `duas-jurisdicoes.md`:**

| Número | E.164 | País | Região | Tipo | O que sugere | Inconsistente? |
|---|---|---|---|---|---|---|
| `+49 40 1234567` | | | | | | |
| `+55 11 91234-5678` | | | | | | |

**Responda:**

1. **Os dois números são consistentes com a história da empresa?** Por quê?
2. O fixo alemão em Hamburgo **confirma** que a empresa está em Hamburgo? O que ele confirma de
   fato?
3. O celular brasileiro **é** incompatível com ser empresa alemã? Ou apenas **sugere** algo?
4. Se o número fosse **VoIP** em vez de móvel, sua avaliação mudaria? Como?
5. Se o número brasileiro fosse de **faixa empresarial publicada no site**, isso mudaria?
6. **Que verificação independente** você faria antes de levantar suspeita formal?

⚠ **A resposta 3 é o exercício de julgamento.** É **sugere**, não **incompatível** — empresa alemã
pode ter operação no Brasil, ou contratado pessoa no Brasil. Mas **a proposta não mencionou isso**,
e a ausência de menção é a inconsistência. Escreva com essa distinção.

⚠ **A resposta 6 é o método.** Antes de levantar suspeita, você **verifica**. E verificação em
due diligence frequentemente é: **perguntar à contraparte**.

### Passo 3 — O seu próprio número (25 min)

⚠ **Você é o sujeito.**

```bash
python3 - <<'PY'
import phonenumbers
from phonenumbers import geocoder, carrier, number_type, timezone

MEU = "+55 11 99999-9999"   # SUBSTITUA pelo seu
p = phonenumbers.parse(MEU, None)

print(f"Número:      {MEU}")
print(f"E.164:       {phonenumbers.format_number(p, phonenumbers.PhoneNumberFormat.E164)}")
print(f"País:        {phonenumbers.region_code_for_number(p)}")
print(f"Tipo:        {number_type(p).name}")
print(f"Operadora:   {carrier.name_for_number(p, 'pt') or '-'}")
print(f"Localidade:  {geocoder.description_for_number(p, 'pt') or '-'}")
print(f"Fuso:        {', '.join(timezone.time_zones_for_number(p))}")
print()
print("⚠ A operadora acima é a HISTÓRICA da faixa.")
print("   Se você mudou de operadora com portabilidade, está errada.")
PY
```

**Produza `meu-numero.md`:**

| Campo | Valor | Confere com a realidade? |
|---|---|---|
| E.164 | | |
| País | | |
| Tipo | | |
| Operadora (histórica) | | |
| Localidade | | |

**Responda:**

1. A operadora retornada é a sua **operadora atual**? Se não, **por que não**?
2. A localidade retornada é **onde você está**? Se não, o que ela é?
3. **Qual dos campos mentiu sobre você?** Esse é o campo que você não pode confiar em investigação.
4. Se alguém analisasse o seu número, que conclusão **errada** poderia tirar?

⚠ **A resposta 3 e 4 são o ponto do lab.** Você acabou de descobrir **na prática** que a
ferramenta de classificação erra sobre você — e isso significa que ela erra sobre o alvo.

⚠ **E aproveite:** verifique no seu app de operadora se você tem portabilidade, e veja se o
`carrier` bate. Se não bate, você acabou de confirmar o §5.2 com o seu próprio número.

### Passo 4 — Verificação oficial (10 min)

⚠ **A verificação que vale é na fonte do país.**

| País | Onde verificar portabilidade of icialmente |
|---|---|
| Brasil | Consulta pública da ABR Telecom (site oficial) |
| Alemanha | Bundesnetzagentur |
| Reino Unido | Ofcom |
| França | ARCEP |

**Produza `verificacao.md`:**

| Número | Ferramenta usou | O que disse | Fonte oficial consultável | O que a oficial diria |
|---|---|---|---|---|
| | | | | |

**Responda:**

1. Por que a **fonte oficial do país** é necessária, quando a ferramenta já deu uma resposta?
2. E se o país não tiver consulta pública? O que isso significa para o seu achado?

⚠ **A resposta 2 é o formato de toda resposta honesta em OSINT:** se não há fonte oficial
consultável, o achado é de **confiança baixa** — e se declara assim.

### Critérios de aceitação

- `base.md` com o `normaliza.py` rodado e o resultado real.
- Você explicou por que a região explícita é necessária, e qual formato exige.
- `duas-jurisdicoes.md` com a **distinção entre "sugere" e "incompatível"** escrita
  explicitamente na resposta 3.
- Você nomeou a **verificação independente** antes de levantar suspeita.
- `meu-numero.md` com o seu número analisado e **qual campo mentiu sobre você**.
- Você explicou por que `carrier` é histórico e não atual.
- `verificacao.md` com a fonte oficial nomeada, e o que fazer quando não existe.
- ⚠ Nenhum número de terceiro foi analisado.

---

## Avaliação

1. Por que normalizar para E.164 é o primeiro passo, e não um detalhe?
2. Cite cinco formas do mesmo número. Por que todas são "corretas"?
3. Por que `+1` não permite determinar o país? Quantos países ele cobre?
4. Explique portabilidade e seu efeito sobre o campo `operadora`.
5. **O campo `localidade` diz onde a pessoa está?** O que ele diz, então?
6. Por que o tipo (`MOBILE`/`FIXED_LINE`) não é garantido?
7. Por que Alemanha é o caso mais confuso de estrutura de número?
8. O que é zero de tronco e por que manter ele quebra uma busca internacional?
9. Um número VoIP indica que a pessoa está no país do número? Por quê não?
10. Por que um número descartável é, em si, informação de investigação?
11. Na prática, você descobriu que a ferramenta **não confia nem no seu próprio número atual**. O
    que isso implica para a análise de um alvo?
12. Distinga "sugere" de "incompatível" com o exemplo do caso didático.
13. Por que a fonte oficial do país é necessária mesmo quando a ferramenta já respondeu?

---

**Próximo:** [Módulo 6 — Empresa e due diligence internacional](modulo-06.md)
