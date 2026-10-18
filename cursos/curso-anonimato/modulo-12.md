# Módulo 12 — Projeto: Sua Superfície de Exposição

**Carga:** 3 horas
**Pré-requisitos:** Módulos 1 a 11

---

## Objetivo do módulo

**Um entregável, e é pessoal:** a medição da sua superfície de exposição, **antes e depois**, com
evidência.

Não é um exercício sobre anonimato em abstrato. É sobre **a sua** configuração, **o seu**
comportamento, e **o que continua exposto** depois de tudo o que você aprendeu.

---

## ⚠ Conduta

⚠ **Todo este projeto é sobre você.** Não há alvo, não há terceiro, não há teste em sistema alheio.
O que você mede é o seu próprio navegador, o seu próprio circuito, a sua própria rede.

⚠ **Cuidado com o que você salva.** O relatório final deste projeto é **sensível**: ele descreve
exatamente onde você está exposto. Guarde-o onde você guarda coisa sensível — cifrado, e não em
repositório público. Um documento que lista as suas fraquezas de privacidade é, ele mesmo, algo a
proteger.

---

## 12.1 O que você vai produzir

```
projeto/
├── 00-modelo-ameaca.pdf/.md      do Módulo 1, revisado
├── 01-antes.md                   medição no Módulo 2, sem correção
├── 02-vazamentos.md              do Módulo 7, com evidência
├── 03-fingerprint.md             do Módulo 8, com entropia
├── 04-correlacao.md              do Módulo 9
├── 05-depois.md                  medição refeita, agora
├── 06-diferenca.md               O ENTREGÁVEL PRINCIPAL
├── 07-residual.md                o que CONTINUA exposto
└── 08-plano.md                   o que fazer daqui pra frente
```

⚠ **O item `06-diferenca.md` é o entregável principal.** Ele compara **antes** e **depois** e
responde: **o que mudou de fato, com evidência?** Se a diferença for pequena, isso **também** é
resultado — e é o resultado mais honesto e mais útil.

---

## 12.2 Método: medir, corrigir, medir

O projeto tem quatro fases, e a **ordem** é o método.

```
FASE 1 — MEDIR (o que eu tenho agora)
   ↓
FASE 2 — CORRIGIR (na ordem de severidade)
   ↓
FASE 3 — MEDIR DE NOVO (com a mesma metodologia)
   ↓
FASE 4 — DOCUMENTAR A DIFERENÇA (e o que sobrou)
```

⚠ **A fase 3 exige a mesma metodologia da fase 1.** Medir com ferramenta diferente nas duas vezes
produz diferença que é **do instrumento**, não da sua correção. **Fixe a metodologia antes de
começar.**

⚠ **E a fase 4 é a que faz o projeto valer.** Sem ela, você tem duas medições soltas. Com ela, você
tem **evidência de que a correção funcionou** — ou de que **não funcionou**, o que é mais valioso
ainda.

---

## 12.3 O que medir — a lista fixa

⚠ **Use exatamente estes itens nas duas medições.** Não acrescente nem tire entre as fases.

| # | Item | Como medir | O que revela |
|---|---|---|---|
| 1 | IP externo visto pelo destino | Serviço de diagnóstico | Camada ① |
| 2 | ASN / tipo de conexão | Serviço de diagnóstico | Camada ① |
| 3 | Resolvedor DNS em uso | `dnsleaktest` (teste estendido) | Camada ② |
| 4 | Nomes DNS em claro na captura | `tcpdump` + `tshark` (Módulo 2) | Camada ② |
| 5 | **`WebRTC` revela IP?** | `browserleaks.com/webrtc` | Camada ⑤ |
| 6 | IPv6 exposto | `browserleaks.com/ip` | Camada ③ |
| 7 | Fingerprint — entropia | `coveryourtracks.eff.org` | Camada ⑤ |
| 8 | Canvas hash | `browserleaks.com/canvas` | Camada ⑤ |
| 9 | Fontes detectadas | `browserleaks.com/fonts` | Camada ⑤ |
| 10 | Resolução relatada | `browserleaks.com` | Camada ⑤ |
| 11 | Timezone relatado | `browserleaks.com` | Camada ⑤ |
| 12 | User-Agent | `httpbin.org/user-agent` | Camada ④ |
| 13 | Metadado em arquivo publicado | `exiftool` | Camada ⑥ |
| 14 | **Entropia do circuito** (volume, tempo) | Captura própria (Módulo 9) | Camada ⑥ |

⚠ **O item 5 é o mais importante e o mais frequentemente positivo.** Se `WebRTC` revela o seu IP,
**todo o resto é secundário** até você resolver isso.

⚠ **O item 14 não aparece em nenhum teste público** porque não existe teste para ele. Ele exige
que você **olhe o seu próprio tráfego** — e é o que separa quem leu sobre anonimato de quem
**mediu**.

---

## 12.4 A ordem de correção

⚠ **Severidade decrescente. Corrigir fora de ordem é gastar esforço no lugar errado.**

| # | Correção | Severidade | Esforço |
|---|---|---|---|
| 1 | `WebRTC` desligado | **Crítica** | 5 min |
| 2 | Conta anônima sem cruzamento com a pessoal | **Crítica** | Disciplina contínua |
| 3 | IPv6: verificar cobertura do túnel | Alta | 10 min |
| 4 | DNS pelo túnel (`DNSPort`) | Alta | 15 min |
| 5 | Usar **Tor Browser** para navegar sob risco | Alta | Já instalado |
| 6 | Identificar programas que não usam o proxy | Média | 30 min |
| 7 | Limpar metadado antes de publicar | Média | 10 min |
| 8 | Reduzir extensões | Média | 10 min |
| 9 | Cuidado com horário e volume | Média | Contínuo |
| 10 | Compartimentar por atividade | Alta | Organizacional |

⚠ **As correções 2 e 10 são as mais importantes e as únicas que nenhuma ferramenta faz.** Elas são
disciplina — e é por isso que a maioria as ignora e compra ferramenta em vez disso.

---

## 12.5 Como medir o "antes"

⚠ **Se você não fez as medições ao longo do curso, este é o momento de reconstruir o "antes"** com
honestidade. Duas opções:

| Opção | Como | Ressalva |
|---|---|---|
| **A — Você mediu ao longo do curso** | Use os arquivos dos Módulos 2, 7, 8, 9 | Melhor caso |
| **B — Você não mediu** | Reconstrua de memória, e **declare** que é estimativa | ⚠ Sempre declare |
| **C — Você mediu parcialmente** | Use o que tem, e **declare** o que falta | Mais comum, e suficiente |

⚠ **A opção B é aceitável se declarada.** Um "antes" estimado com a ressalva explícita vale mais
que um "antes" inventado sem ressalva. **O que não vale é apresentar estimativa como medição** —
isso é o mesmo erro que o curso combateu desde o Módulo 1.

---

## 12.6 O entregável principal

`06-diferenca.md` — a estrutura:

```markdown
# Diferença: antes e depois

## 1. Metodologia
Ferramentas: (as mesmas nas duas medições?)
Ambiente: (mesma máquina? mesma rede? mesmo horário do dia?)
Ressalvas: (o "antes" é medido ou estimado?)

## 2. Tabela comparativa

| # | Item | ANTES | DEPOIS | Mudou? | Evidência |
|---|------|-------|--------|--------|-----------|
| 1 | IP externo | | | | |
| ... | ... | | | | |

## 3. O que melhorou
(com evidência de cada item)

## 4. O que NÃO melhorou
(⚠ esta seção é obrigatória)

## 5. O que eu não consegui medir
(nem antes nem depois — e por quê)

## 6. Conclusão honesta
Eu estou mais protegido contra o meu adversário? Em que medida?
O que determina se estou ou não?
```

⚠ **A seção 4 é obrigatória, e é a mais valiosa.** Um projeto que só mostra melhora está medindo
a si mesmo com simpatia. Um projeto que lista **o que continuou exposto** é um instrumento de
trabalho real.

⚠ **A seção 6 não pode ser "sim, estou anônimo".** A resposta correta tem a forma: *"estou mais
protegido contra A3 e A4, e continuo exposto a A5 por correlação de fluxo, e a A6 porque o
dispositivo não está limpo"*. **Você mediu um grau, não um estado.**

---

## 12.7 Os entregáveis avaliados

| # | Arquivo | Peso | O que se avalia |
|---|---|---|---|
| 1 | `00-modelo-ameaca.md` | 10% | Adversário nomeado, com nível A1–A6 |
| 2 | `01-antes.md` | 10% | Metodologia fixa, itens medidos |
| 3 | `02-vazamentos.md` | 20% | Vazamentos com **evidência**, não impressão |
| 4 | `03-fingerprint.md` | 15% | Entropia medida e **convertida para "1 em quantos"** |
| 5 | `04-correlacao.md` | 10% | O que sobrevive ao circuito |
| 6 | **`06-diferenca.md`** | **20%** | **Comparação com evidência, incluindo o que não melhorou** |
| 7 | `07-residual.md` | 10% | O que continua exposto, nomeado |
| 8 | `08-plano.md` | 5% | Ações concretas, com prazo |

**Penalidades automáticas:**

- "Antes" apresentado como medição quando é estimativa, **sem declarar**: −20%.
- Entropia sem conversão para "1 em quantos": −10%.
- `06-diferenca.md` sem a seção 4 (**o que NÃO melhorou**): −25%.
- Conclusão afirmando "estou anônimo": −15%.
- Afirmar estar protegido contra adversário que o próprio material diz que a ferramenta não cobre
  (ex.: VPN contra A3): −20%.

---

## 12.8 Roteiro sugerido

Se você quiser um plano de execução:

| Bloco | Duração | O que fazer |
|---|---|---|
| **Bloco 1** | 30 min | Retomar o modelo (Módulo 1) e fixar a metodologia de medição |
| **Bloco 2** | 40 min | Medir o "antes" (ou reconstruir, declarando) |
| **Bloco 3** | 40 min | Aplicar as correções na **ordem de severidade** |
| **Bloco 4** | 40 min | Medir de novo, **com a mesma metodologia** |
| **Bloco 5** | 30 min | Escrever `06-diferenca.md` e `07-residual.md` |

⚠ **Resista à tentação de fazer o Bloco 3 antes do 2.** Você precisa do "antes" — e depois de
corrigir, o "antes" **não existe mais**. Corrigir sem ter medido destrói o dado.

---

## Avaliação final

1. Por que a fase 3 exige a **mesma metodologia** da fase 1? O que acontece se mudar o instrumento?
2. Por que a fase 4 é a que faz o projeto valer? O que você tem sem ela?
3. Das três opções de "antes", qual é a correta quando você não mediu? O que é obrigatório declarar?
4. Por que o item 14 não aparece em nenhum teste público? Como você o mede?
5. Por que `WebRTC` é o item mais importante da lista? O que acontece se ele for positivo?
6. Por que a ordem de correção é por severidade decrescente? O que acontece corrigindo fora de
   ordem?
7. Quais as duas correções que nenhuma ferramenta faz? Por que a maioria as ignora?
8. Por que `06-diferenca.md` **precisa** ter a seção "o que não melhorou"?
9. Por que "sim, estou anônimo" é resposta errada? Qual é a forma correta?
10. Por que a medição tem que vir **antes** da correção, e não depois?
11. Você está mais protegido contra o seu adversário agora do que no início do curso? **Em que
    medida, e com que evidência?**
12. Qual item continua exposto no seu caso, e o que você faria a respeito?

---

## Encerramento do curso

Você começou distinguindo sigilo de anonimato e termina com uma medição da sua própria superfície
de exposição, com evidência, e com uma lista do que continua aberto.

O que você aprendeu não foi uma lista de ferramentas. Foi **um método** — nomear o adversário,
medir a exposição por camada, corrigir na ordem certa, e **declarar o que não foi resolvido**. Um
método que funciona quando a ferramenta muda, quando o adversário muda, e quando o cenário muda.

E a coisa mais importante que o curso tentou te dar não é uma técnica: é **calibragem**. Você agora
sabe que:

- **Anonimato é uma cadeia, e vale o elo mais fraco.**
- **A maior parte das quebras reais não é de protocolo** — é de identidade cruzada, de higiene, de
  comportamento.
- **Existem problemas sem solução**, e a resposta correta é **dizer isso** — não confiar mais do
  que os fatos sustentam.

⚠ **A última nota do curso, e ela é sobre responsabilidade.** Você agora sabe descrever onde alguém
está exposto. Isso serve para proteger — uma fonte, uma pessoa sob risco, você mesmo. O mesmo
conhecimento serve para identificar quem não quer ser identificado. **O que separa os dois é o
consentimento e o propósito**, e é por isso que toda medição deste curso foi contra você mesmo.

Referências para continuar: **spec.torproject.org** · **Tor Project community** ·
**"Tor: The Second-Generation Onion Router"** · **OONI** · **EFF Surveillance Self-Defense** ·
**Cover Your Tracks** · **Security in-a-box** · **Nym / Loopix** (mixnet) · **Whonix** · **Tails**
