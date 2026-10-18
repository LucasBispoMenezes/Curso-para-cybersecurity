# Parser Differentials

Curso de 30 horas, dez módulos. **Onde duas implementações discordam.**

---

## A linha de progressão

| | Módulo 1 | Módulo 10 |
|---|---|---|
| **Diferença** | "são diferentes" | ⚠ **divergência legítima vs. BUG** |
| **Framing** | não sabe o que é | ⚠ **o bug mora aqui** |
| **Camadas** | trata como uma | ⚠ **a discordância ENTRE elas** |
| **Corpus** | aleatório | ⚠ **FRONTEIRA por campo** |
| **Resultado** | "as duas diferem" | ⚠ **a hipótese, com critério** |

**Pré-requisito duro:** **Fuzzing** (o harness) + **Pesquisa em Segurança** (módulos 6 e 7).

---

## A tese

⚠ **Onde há especificação, há N implementações. E cada uma responde às perguntas que a spec deixou
em aberto — de forma independente.** **O bug mora nas respostas divergentes.**

⚠ **E a evidência, medida:**

| Trabalho | Resultado |
|---|---|
| **HTTP Garden** | ⚠ **100+ bugs, 68 corrigidos, 39 exploráveis** |
| **WAFFLED** | ⚠ **120+ exploits contra 5 WAFs** |
| **HTTP/1.1 Must Die** (2025) | O framing como alvo |

**Não é preciso achar um bug num parser — basta achar DOIS que discordam.**

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [Onde duas implementações discordam](modulo-01.md) | 2 | O problema, e o rendimento |
| 2 | [Spec, implementação, e o espaço em aberto](modulo-02.md) | 3 | ⚠ **Onde a divergência nasce** |
| 3 | [**Divergência legítima vs. bug**](modulo-03.md) | 3 | O critério |
| 4 | [O lab de N implementações](modulo-04.md) | 3 | As N, no seu ambiente |
| 5 | [**O harness diferencial**](modulo-05.md) | 4 | Corpus de fronteira + comparador |
| 6 | [**Framing**](modulo-06.md) | 4 | ⚠ **Onde o bug mora** |
| 7 | [Discordância entre camadas](modulo-07.md) | 3 | O `HTTP Garden` |
| 8 | [WAFs e o caso `WAFFLED`](modulo-08.md) | 3 | ⚠ **O maior rendimento** |
| 9 | [Cadência de ataque](modulo-09.md) | 3 | A categoria recente |
| 10 | [Projeto](modulo-10.md) | 2 | Da divergência ao reporte |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## O critério central: divergência ou bug?

⚠ **O módulo 3 formaliza. E é a linha do curso inteiro:**

| Divergência | É bug? |
|---|---|
| Duas implementações legítimas diferentes | ⚠ **NÃO** |
| Spec ambígua, ambas defensáveis | ⚠ **NÃO** — é bug da spec |
| ⚠ **Discordância sobre FRAMING** | ⚠⚠ **SIM** |
| Uma viola a spec | ⚠⚠ **SIM** |
| Uma aceita o que a outra recusa, **no mesmo dado** | ⚠⚠ **SIM** |

⚠ **A primeira e a terceira linhas são a diferença entre "achei uma diferença" e "achei um bug".**
**Quem não distingue as duas gasta a vida em falsos positivos.**

---

## O que é framing

```
┌──────────────────────────────────────────────────────────────────────┐
│ A MESMA SEQUÊNCIA DE BYTES                                           │
│                                                                      │
│   GET / HTTP/1.1\r\n                                                 │
│   Host: alvo\r\n                                                     │
│   Content-Length: 6\r\n                                              │
│   Transfer-Encoding: chunked\r\n                                     │
│   \r\n                                                               │
│   0\r\n                                                              │
│   \r\n                                                               │
│   GET /admin HTTP/1.1\r\n                                            │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ IMPLEMENTAÇÃO A: o TE vence → ignora o CL → UMA requisição           │
│ IMPLEMENTAÇÃO B: o CL vence → sobram bytes → DUAS requisições        │
└──────────────────────────────────────────────────────────────────────┘

⚠ as DUAS leram a MESMA sequência.
   e discordam sobre ONDE A PRIMEIRA MENSAGEM TERMINA.
   ✓ é discordância de framing — e é BUG.
```

⚠ **O framing é o alvo porque a discordância sobre o limite cria bytes que "sobram"** — **e bytes que
sobram se tornam a próxima mensagem.** **É a origem do request smuggling.**

---

## ⚠ Nota de propósito

| Você faz | Você **não** faz |
|---|---|
| Roda N implementações **no seu lab** | ⚠ Manda payload a **WAF de terceiro** |
| Compara comportamento **local** | ⚠ Compara serviços em produção |
| Testa instância **sua ou CTF** | ⚠ Testa instância alheia |
| **Reporta** ao mantenedor | Publica antes da correção |
| Escreve o **harness** | ⚠ **Escreve o bypass** |

⚠ **A tentação específica:** **testar um WAF em produção é "inofensivo" — é só um payload
esquisito.** **Não é.** **O teste diferencial exige mandar N payloads, não um.** **E o WAF que
processa já foi acessado.**

⚠ **Art. 154-A e 266.** **A intenção não muda o enquadramento.**

---

## O laboratório

```bash
sudo apt install -y gcc g++ python3 python3-pip git curl jq golang-go rustc nodejs npm
pip3 install pwntools requests
mkdir -p ~/parser-lab/{impls,corpus,harness,caderno}
```

⚠ **`impls/` guarda as N implementações** — **baixadas e compiladas por você.** **Nenhuma aponta
para serviço de terceiro.**

---

## Como isso conecta

| Curso | Ligação |
|---|---|
| **Fuzzing** | ⚠ Pré-requisito — o harness e o corpus |
| **Pesquisa** | Pré-requisito — módulos 6 e 7 |
| **Patch Diffing** | O módulo 10, de onde este parte |
| **HTTP Smuggling** | O framing, aprofundado |
| **Detecção e Evasão** | O detector como a implementação que discorda |

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **O critério** | 1 semana | 1–3 |
| **O lab e o harness** | 2 semanas | 4–5 |
| **Framing e camadas** | 2 semanas | 6–7 |
| **WAFs e reporte** | 2 semanas | 8–10 |

⚠ **Estimativa a 10 h/semana.** Os módulos **3 e 6** costumam levar mais: **o critério de bug se
forma com repetição, e o framing exige entender a spec de verdade.**
