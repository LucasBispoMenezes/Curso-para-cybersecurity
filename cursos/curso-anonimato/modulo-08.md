# Módulo 8 — Fingerprinting e Superfície de Browser

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Explicar o que é fingerprinting e por que ele **derrota anonimato de rede**.
2. Distinguir fingerprint passivo de ativo, e o que cada um custa.
3. Medir a **sua** entropia de fingerprint e interpretar o número.
4. Explicar cada decisão de projeto do Tor Browser como resposta a um fingerprint.
5. Reduzir superfície de fingerprint sem quebrar a usabilidade.

---

## ⚠ Conduta

Todo fingerprinting deste módulo é **contra você mesmo**, em serviço público de medição. Nenhuma
técnica é aplicada a outro usuário.

⚠ **A linha:** fingerprinting é a base da **desanonimização de navegador**. Entender os vetores é
necessário para se proteger; usá-los para identificar quem não consentiu é vigilância, e não está
neste curso. A distinção é o **sujeito** da medição: você mede **você**.

---

## 8.1 O que é fingerprinting

Fingerprinting é **identificar um navegador sem cookie e sem conta**, pelas características dele.

```
COOKIE                                     FINGERPRINT
┌──────────────────────────────────┐      ┌──────────────────────────────────┐
│ O site te dá um identificador    │      │ O browser se apresenta           │
│ Você pode apagar                 │      │ Você não escolhe isso            │
│ Você pode bloquear               │      │ Não há como apagar               │
│ Não funciona em modo privado     │      │ **Funciona em modo privado**     │
│ 1 site = 1 cookie                │      │ **Vários sites compartilham**    │
└──────────────────────────────────┘      └──────────────────────────────────┘
```

⚠ **A diferença estrutural:** cookie é algo que **lhe dão**; fingerprint é algo que **você emite**
para todo mundo. Você pode apagar cookie; não pode apagar a sua tela, o seu conjunto de fontes, ou
a sua GPU.

**A consequência exata:** fingerprint **atravessa** o Tor. O circuito esconde seu IP, e o site
ainda te reconhece — em outra sessão, com outro circuito, no dia seguinte.

---

## 8.2 Passivo versus ativo

| | Passivo | Ativo |
|---|---|---|
| Como mede | O browser **apresenta** sozinho | O site **pede** ao browser fazer algo |
| Instrumento | Cabeçalho HTTP, JS básico | Canvas, WebGL, áudio, medição de tempo |
| Custo ao site | Nenhum | CPU do visitante |
| Custo ao visitante | Nenhum | Consumo, e **mais exposição** |
| Vetores | User-Agent, idiomas, tela, timezone | Renderização, GPU, latência, cache |
| Detectável pelo usuário? | Difícil | **Sim** — mas só se você olhar |

⚠ **O fingerprint ativo é mais poderoso porque explora o que o hardware revela
involuntariamente.** O `canvas` renderiza texto, e o resultado depende de GPU, driver,
anti-aliasing e fontes instaladas — **a combinação é frequentemente única**.

### Canvas fingerprint — o mecanismo

```javascript
// O que um site faz (descrição do mecanismo, não código para usar)
1. Desenha texto e formas em um <canvas> invisível
2. Lê os pixels resultantes (getImageData)
3. Calcula hash do resultado
4. Compara com o hash de outras visitas
```

⚠ **O resultado varia por GPU, driver e sistema operacional.** Ele não é aleatório — é
**determinístico por máquina**, e é por isso que serve para identificar. O Tor Browser responde
isso de forma específica (§8.4), e é uma das decisões de projeto mais engenhosas do projeto.

---

## 8.3 Medindo a sua entropia

**Entropia** de fingerprint é a medida de quantos outros navegadores se parecem com o seu.

| Entropia (bits) | Significado |
|---|---|
| 0 bits | **Todos** os navegadores são iguais — anonimato perfeito |
| ~10 bits | 1 em 1.024 navegadores |
| **~18 bits** | **1 em ~262.000** — típico de navegador comum |
| ~25 bits | 1 em 33 milhões — quase único |

⚠ **A referência prática:** navegador comum mede entre **17 e 20 bits**. Isso significa que a
impressão dele é quase única na população de visitantes — e que **um fingerprint vale como
identificador**, mesmo sem cookie.

⚠ **E o Tor Browser mede próximo de zero** — porque todos os usuários do Tor Browser são
configurados para parecer iguais. Isso é o **objetivo do projeto**, e é o que faz o Tor Browser
não ser "um Firefox com proxy".

### Como medir

```
Abra no browser que você quer medir:
  1. https://coveryourtracks.eff.org/        ← "bits of identifying information"
  2. https://amiunique.org/fingerprint       ← "entropy bits"
  3. https://browserleaks.com/canvas
  4. https://browserleaks.com/webgl
  5. https://browserleaks.com/fonts
```

```bash
# Registro local para comparação (você guarda o seu)
mkdir -p ~/anon-lab/lab8 && cd ~/anon-lab/lab8
cat > entropia.md <<'EOF'
# Minha entropia de fingerprint

## Browser padrão (data: ____)
- Cover Your Tracks — bits únicos: ____
- AmIUnique — entropy: ____
- Canvas hash: ____
- WebGL renderer: ____
- Fontes detectadas: ____

## Tor Browser (data: ____)
- Cover Your Tracks — bits únicos: ____
- AmIUnique — entropy: ____
- Canvas hash: ____
- WebGL renderer: ____
- Fontes detectadas: ____

## Diferença
EOF
echo "Arquivo criado: entropia.md"
```

---

## 8.4 Por que o Tor Browser é o que é

Cada decisão de projeto do Tor Browser existe para **reduzir entropia**. Este é o conteúdo central
do módulo: **ler cada escolha como resposta a um vetor**.

| Vetor | O que o Tor Browser faz | Por quê |
|---|---|---|
| **User-Agent** | Idêntico para todos os usuários da versão | UA único = identificador |
| **Resolução de janela** | **Arredonda** para múltiplos comuns; pede não maximizar | Tela exata é rara |
| **Timezone** | Reporta UTC | Timezone contradiz o circuito |
| **Canvas** | Pede permissão, ou devolve ruído padronizado | Canvas é quase único |
| **WebGL** | Restrito ou desabilitado | Renderer revela GPU exata |
| **Fontes** | Conjunto limitado e padronizado | Lista de fontes revela software instalado |
| **Idiomas** | `en-US` para todos | `Accept-Language` revela origem |
| **Extensões** | **Nenhuma** por padrão; whitelist | Cada add-on é superfície nova |
| **`WebRTC`** | Desabilitado / restrito | Vaza IP real (Módulo 7) |
| **Media queries** | Respostas padronizadas | Revelam hardware |
| **Sensor de bateria** | Bloqueado | Revela dispositivo |
| **Gamepad, sensores** | Bloqueados | Superfície desnecessária |
| **Cache** | Isolado por contexto | Cache é canal lateral |
| **Pool de circuito** | **Circuit isolation** por first-party | Impede correlação entre sites |

⚠ **Note o padrão: o Tor Browser sacrifica funcionalidade por indistinguibilidade.** Ele é mais
lento, tem menos recurso, e **não deixa você personalizar** — porque personalizar é se destacar.

⚠ **A linha "circuit isolation" é a mais estrutural.** Cada site de primeiro nível ganha circuito
próprio. Isso significa mais circuitos, mais latência, e **impossibilidade de um relay de saída
correlacionar dois sites seus** (Módulo 6).

### As três "letras" do Tor Browser

| Nível | O que faz | Quando usar |
|---|---|---|
| **Standard** | Todas as proteções de fingerprint | Uso normal |
| **Safer** | Desabilita JS em sites HTTP, bloqueia alguns recursos | Quando você não confia no site |
| **Safest** | Desabilita JS em todos os sites | Quando o site funciona sem JS |

⚠ **O nível "Safest" é o mais seguro e o mais quebrado.** A maioria dos sites não funciona sem JS.
Isso é a tensão real de privacidade — e é por isso que existe uma escada, e não um botão.

---

## 8.5 Reduzir superfície sem quebrar usabilidade

A tensão que todo material ignora.

| Estratégia | Efeito em fingerprint | Efeito em uso |
|---|---|---|
| **Parecer com todos** (Tor Browser) | **Entropia baixa** | Perde personalização |
| **Parecer aleatório** (anti-fingerprint) | *Pode aumentar* — perfil raro | Quebra sites |
| **Bloquear tudo** | Entropia baixa, mas detectável | Muito quebra |
| **Nada** | Entropia alta | Funciona |

⚠ **A linha 2 é contraintuitiva e é armadilha comum.** Extensões "anti-fingerprinting" que
**randomizam** seus valores fazem você **diferente dos outros** — e isso **aumenta** a entropia.
Um navegador que devolve valor aleatório de canvas é **mais único** que um que devolve valor
padronizado.

**A regra que resolve:** fingeprint bem mitigado é **igual aos outros**, não único. Se a extensão
te deixa "seguro mas diferente", ela te deixou **mais identificável**.

⚠ **A última linha da tabela merece uma palavra:** "nada" é uma escolha legítima para muita
gente. Não é obrigatório se proteger de fingerprint comercial. A pergunta é o seu modelo de ameaça
(Módulo 1) — e se o adversário é A2 (rastreador comercial), a resposta pode ser aceitar o
rastreamento e reduzir em outro lugar.

---

## 8.6 LAB — Meça, explique, e reduza

**Duração:** 120 min

### Passo 1 — Meça os dois browsers (40 min)

```bash
cd ~/anon-lab/lab8
# Use o entropia.md criado acima
```

**Meça e registre:**

| Vetor | Browser padrão | Tor Browser | Diferença |
|---|---|---|---|
| User-Agent | | | |
| Resolução relatada | | | |
| Timezone | | | |
| Idiomas (`Accept-Language`) | | | |
| Canvas hash | | | |
| WebGL renderer | | | |
| Nº de fontes detectadas | | | |
| **Entropia (bits)** | | | |
| `WebRTC` revela IP? | | | |

**Responda:**

1. Qual a diferença de entropia em bits entre os dois? **Traduza para "1 em quantos".**
2. Qual vetor teve a **maior** diferença? Por quê?
3. O Tor Browser relatou a **sua** resolução? **Se não, o que ele fez?**
4. O Tor Browser relatou o **seu** timezone? Se não, o que isso resolve?

⚠ **A resposta 4 é o ponto:** o timezone é um **contraditor de circuito**. Um circuito terminando
em outro continente com timezone local é inconsistência — sinal de Tor. Reportar UTC elimina a
contradição.

### Passo 2 — Explique cada decisão de projeto (35 min)

Para **cada** item da tabela do §8.4, escreva **o que seria possível saber** se o Tor Browser não
fizesse aquilo:

| Decisão do Tor Browser | Se ele não fizesse: o que vazaria | Quão identificável seria |
|---|---|---|
| Arredondar resolução | | |
| Reportar UTC | | |
| Padronizar User-Agent | | |
| Limitar fontes | | |
| Canvas com ruído | | |
| Desabilitar WebRTC | | |
| Circuit isolation | | |

⚠ **A coluna "quão identificável seria" é o exercício.** Você está raciocinando sobre entropia —
não listando recursos.

### Passo 3 — Reduza a superfície do browser padrão (35 min)

⚠ **Você mexe no seu browser, não em nada de terceiro.**

| # | Ação | Onde | O que ela elimina |
|---|---|---|---|
| 1 | Desabilitar `WebRTC` | Firefox: `about:config` → `media.peerconnection.enabled=false` | Canal ⑤ (crítico) |
| 2 | Bloquear cookie de terceiro | Configuração de privacidade | Correlação entre sites |
| 3 | Remover extensão que você não usa | `about:addons` | Vetor ⑦ |
| 4 | Ativar proteção contra fingerprint do próprio Firefox | `privacy.resistFingerprinting` | Vários |
| 5 | Testar novamente e comparar | Cover Your Tracks | — |

```bash
echo "Depois de cada alteração, re-meça e registre em entropia.md"
```

Produza `reducao.md`:

| Alteração | Entropia antes | Entropia depois | Resolvido? | O que quebrou? |
|---|---|---|---|---|
| WebRTC off | | | | |
| Cookie de terceiro | | | | |
| Extensões removidas | | | | |
| `resistFingerprinting` | | | | |

**Responda:**

1. **A entropia caiu?** Se subiu, o que aconteceu?
2. Alguma alteração **quebrou** um site? Qual a relação custo/benefício?
3. **`resistFingerprinting` do Firefox te deixa parecido com quem?** (Dica: com outros usuários
   que também ligaram — e não com a maioria.)
4. Se você quiser entropia **próxima de zero**, qual é a única resposta?

⚠ **A resposta 3 é sutil e importante:** `resistFingerprinting` faz seu valor ser **comum** — entre
quem o ativou. Isso é melhor que valor único, e pior que valor **universal**. A diferença entre
"comum" e "universal" é a razão pela qual o Tor Browser troca o Firefox inteiro.

### Passo 4 — O relatório de fingerprint (10 min)

Produza `relatorio-fingerprint.md`:

```markdown
# Fingerprint — Autoavaliação

## 1. Entropia medida
Browser padrão: ____ bits  →  1 em ____
Tor Browser:    ____ bits  →  1 em ____
Depois das correções: ____ bits  →  1 em ____

## 2. Vetores que mais contribuem
(ordene os seus por contribuição para a entropia)

## 3. O que reduzir sem quebrar
(três alterações que você manteve)

## 4. O que NÃO tem solução sem o Tor Browser
(liste os vetores onde a única resposta é usar o Tor Browser)

## 5. Limitações
- A medição é de 1 navegador, 1 máquina, 1 momento
- Serviços medem de forma diferente entre si
- Não medi fingerprint de servidor (só de cliente)
- O teste em si é uma visita, e fica registrada em serviço de terceiro
```

### Critérios de aceitação

- `entropia.md` com os dois browsers medidos, **com bits convertidos em "1 em quantos"**.
- Você identificou o vetor com maior diferença entre os browsers.
- `reducao.md` com as quatro alterações e a entropia antes/depois.
- Você respondeu o que aconteceu se a entropia subiu.
- A tabela de decisões de projeto do §8.4 preenchida com a coluna "quão identificável seria".
- Você explicou por que `resistFingerprinting` deixa você "comum" e não "universal".
- `relatorio-fingerprint.md` com a seção de limitações.
- Toda medição foi **do seu próprio navegador**.

---

## Avaliação

1. Explique a diferença estrutural entre cookie e fingerprint. Por que fingerprint atravessa o Tor?
2. Diferencie fingerprint passivo e ativo, com dois vetores de cada.
3. Descreva o mecanismo do canvas fingerprint. Por que o resultado é determinístico?
4. O que é entropia de fingerprint? Traduza 18 bits em "1 em quantos".
5. Qual a entropia típica de navegador comum? O que isso significa na prática?
6. **Por que o Tor Browser arredonda a resolução e reporta UTC?** O que cada um evita?
7. O que é *circuit isolation* e que correlação ela impede?
8. Por que extensões "anti-fingerprinting" que randomizam podem **piorar** sua situação?
9. Por que "igual aos outros" é a meta, e não "único"?
10. Qual a diferença entre "comum" e "universal"? O que isso diz sobre `resistFingerprinting`?
11. Cite cinco decisões de projeto do Tor Browser e o vetor que cada uma resolve.
12. Por que não escolher proteção máxima é uma decisão defensável? O que determina?

---

**Próximo:** [Módulo 9 — Resistência a correlação](modulo-09.md)
