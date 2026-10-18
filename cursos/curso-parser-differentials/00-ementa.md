# Parser Differentials: Onde Duas Implementações Discordam

**Ementa do curso · 30 horas · 10 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Diferença** | Vê "implementações diferentes" | ⚠ **Separa divergência legítima de BUG** |
| **Framing** | Não sabe o que é | ⚠ **Sabe que framing é onde o bug mora** |
| **Duas camadas** | Trata como uma | ⚠ **Procura a discordância ENTRE elas** |
| **Ferramenta** | Não conhece nenhuma | `HTTP Garden`, `WAFFLED`, harness próprio |
| **Corpus** | Entradas aleatórias | ⚠ **Corpus de FRONTEIRA por campo** |
| **Método** | Compara a olho | ⚠ **Pipeline que escala para N implementações** |
| **Resultado** | "as duas diferem" | ⚠ **A hipótese de bug, com critério** |

**Pré-requisito duro:** curso de **Pesquisa em Segurança** (módulos 6 e 7) · curso de **Fuzzing**
(o harness) · idealmente **Patch Diffing** (o módulo 10).

⚠ **Sem o de Fuzzing, você não tem harness.** **Sem o de Pesquisa, você não tem o critério que
separa divergência de bug.**

---

## Por que este curso existe

⚠ **A afirmação que organiza o curso:**

> **Onde há especificação, há N implementações. E cada uma responde às perguntas que a
> especificação deixou em aberto — de forma independente.** **O bug mora nessas respostas
> divergentes.**

⚠ **E a evidência de que a área é produtiva, e ela é medida:**

| Trabalho | O que fez | Resultado |
|---|---|---|
| **HTTP Garden** | Fuzzing diferencial de fluxo HTTP | ⚠ **100+ bugs, 68 corrigidos, 39 exploráveis** |
| **WAFFLED** | Parser differentials em WAFs | ⚠ **120+ exploits contra 5 WAFs** |
| **HTTP/1.1 Must Die** (2025) | O smuggler como ferramenta | ⚠ Confirma que **o framing é o alvo** |
| **Bypassing WAFs: parser differentials** | Método | **A divergência como bypass** |
| **Paper "Parser Differentials"** (USENIX) | Formalização | **O campo como área** |

⚠ **A tese:** **não é preciso achar um bug num parser. Basta achar DOIS parsers que discordam** —
**e a discordância é o bug, porque um dos dois está errado.**

⚠ **E o número que prova o rendimento:** o `WAFFLED` achou **120+ exploits contra 5 WAFs** com um
método — **não com força bruta.** **O caminho existe, e está medido.**

⚠ **A distinção que este curso estabelece, e ela é o critério de tudo:**

| Divergência | É bug? |
|---|---|
| Duas implementações legítimas diferentes | ⚠ **NÃO** — a spec permite |
| Especificação ambígua, ambas defensáveis | ⚠ **NÃO** — é bug da spec |
| ⚠ **Discordância sobre FRAMING** | ⚠⚠ **SIM** |
| Uma viola a spec | ⚠⚠ **SIM** |
| Uma aceita o que a outra recusa **no mesmo dado** | ⚠⚠ **SIM** |

---

## ⚠ Nota de propósito e conduta

⚠ **A linha deste curso é a mesma do Patch Diffing — e mais nítida, porque aqui o alvo é um
SERVIÇO.**

| Este curso faz | **Não** faz |
|---|---|
| Roda N implementações **no seu lab** | ⚠ Manda payload a **WAF de terceiro** |
| Compara comportamento **local** | ⚠ Compara serviços em produção |
| Testa instância **sua ou CTF** | ⚠ Testa instância alheia |
| **Reporta** a divergência ao mantenedor | Publica antes da correção |
| Escreve o harness | ⚠ **Escreve o bypass** |

⚠ **A regra que vale o curso inteiro:**

> **Você baixa as N implementações, sobe as N no SEU lab, e compara.** **O achado vai para os
> mantenedores — não para o WAF de ninguém.**

⚠ **E a tentação específica deste curso, porque ela é real:** **testar um WAF em produção é
"inofensivo" — é só mandar um payload esquisito.** **Não é.** **Mandar payload a um serviço de
terceiro é acesso não autorizado** — **e o teste diferencial exige mandar N payloads, não um.**

⚠ **E o limite de tempo, por curso:**

| Técnica | Testável em produção? |
|---|---|
| Fuzzing diferencial | ⚠ **NUNCA** — volume e intrusão |
| Comparação de N implementações | ⚠ Só as suas |
| Leitura de código | ✓ Sempre |

⚠ **No Brasil:** art. 154-A (acesso indevido) e art. 266 (interrupção). **Um WAF que processa o
payload já foi acessado** — **não importa a intenção.**

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. **Formalizar** o problema de parser differential.
2. Reconhecer **onde** a especificação deixa em aberto — os pontos de divergência.
3. **Distinguir** divergência legítima de bug, com critério.
4. Rodar **N implementações** no seu lab.
5. Escrever o **harness diferencial** — do curso de Fuzzing.
6. Construir **corpus de fronteira** por campo.
7. Aplicar o método a **WAFs** — o caso `WAFFLED`.
8. Procurar a discordância **ENTRE CAMADAS** — o `HTTP Garden`.
9. **Verificar** a hipótese contra os cinco falsos positivos.
10. Reportar a **cada mantenedor**, sem expor os outros.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | Onde duas implementações discordam | O problema, e por que rende | 2 |
| 2 | Spec, implementação, e o espaço em aberto | ⚠ **Onde a divergência nasce** | 3 |
| 3 | Divergência legítima vs. bug | ⚠ **O critério** | 3 |
| 4 | O lab de N implementações | Subir as N, no seu ambiente | 3 |
| 5 | O harness diferencial | Corpus de fronteira, comparador | 4 |
| 6 | **Framing** | ⚠ **Onde o bug mora** | 4 |
| 7 | Discordância entre camadas | O `HTTP Garden` | 3 |
| 8 | WAFs e o caso `WAFFLED` | ⚠ **O caso de maior rendimento** | 3 |
| 9 | Cadência de ataque | A categoria recente | 3 |
| 10 | Projeto: da divergência ao reporte | O entregável | 2 |

Cada módulo: teoria → **par divergente comentado** → lab → avaliação. ~60% prática de comparação.

---

## O laboratório

```bash
sudo apt update
sudo apt install -y gcc g++ python3 python3-pip git curl jq \
                    golang-go rustc cargo nodejs npm 2>/dev/null || true
pip3 install pwntools requests
```

| Ferramenta | Papel | Licença |
|---|---|---|
| **HTTP Garden** | Fuzzing diferencial de fluxo HTTP | Livre |
| **`h11` / `h2`** | Parser HTTP em Python | Livre |
| **Nginx / Apache / HAProxy** | Implementações para comparar | Livre |
| **`smuggler`** | O caso de smuggling | Livre |
| **wafw00f** | Detecção — ⚠ só em alvo seu | Livre |
| **`pytest`** | O harness | Livre |

⚠ **O curso **não** usa serviço de terceiro.** **Você baixa e sobe as implementações no seu lab** —
**e a comparação é entre processos locais.** **É o que torna o método legítimo e reproduzível.**

```bash
mkdir -p ~/parser-lab/{impls,corpus,harness,caderno} && cd ~/parser-lab
```

⚠ **`impls/` guarda as N implementações.** **`corpus/` guarda as entradas de fronteira.**
**`harness/` guarda o comparador.** **E `caderno/` segue o módulo 3 do Pesquisa.**

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (10) | 45% | O diferencial rodado, com corpus de fronteira |
| **Critério de bug** (módulo 3) | 20% | ⚠ **Separou divergência legítima de bug?** |
| Corpus de fronteira (módulo 5) | 10% | Cobre os pontos de divergência? |
| Framing (módulo 6) | 10% | ⚠ A discordância sobre o limite |
| Projeto (módulo 10) | 15% | Da divergência ao reporte |

**Rubrica central:** você não entrega "as duas implementações diferem". Você entrega **a
divergência classificada**, **o critério**, **a evidência** — e **a quem reportar**.

---

## Como este curso se conecta

| Curso | Ligação |
|---|---|
| **Pesquisa em Segurança** | Pré-requisito — módulos 6 e 7 |
| **Fuzzing** | O harness e o corpus — ⚠ **pré-requisito direto** |
| **Patch Diffing** | O módulo 10 — de onde este parte |
| **HTTP Smuggling** | O caso de framing, aprofundado |
| **Detecção e Evasão** | O outro lado: como o detector discorda |
| **Criptografia Aplicada** | A implementação divergente de primitiva |

⚠ **Este curso é o módulo 10 do Patch Diffing levado ao osso.** **E ele alimenta o de HTTP
Smuggling** — **porque framing é divergência de parsing, e smuggling é o exploit do framing.**

---

## Referências abertas

- **HTTP Garden** — https://github.com/narfindustries/http-garden
- **WAFFLED** — a pesquisa sobre divergência em WAFs
- **HTTP/1.1 Must Die: The Smuggler's Guide** (2025)
- **Bypassing WAFs: Parser Differentials** — https://blog.sicuranext.com/bypassing-wafs-parser-differentials/
- **"Parser Differentials"** — paper, USENIX Security
- **RFC 9110 / 9112** — HTTP semantics e HTTP/1.1
- **RFC 7230 §3.5** — "Message Parsing Robustness" (⚠ a origem do problema)
- **`h11`** — https://github.com/python-hyper/h11
- **`h2`** — https://github.com/python-hyper/h2
- **`smuggler`** — https://github.com/defparam/smuggler
- **PortSwigger Research** — HTTP/2 e request smuggling

---

*Material didático original, de propósito defensivo e de pesquisa. Comparação entre implementações
no laboratório próprio, ou com autorização escrita. Nenhum payload é enviado a serviço de terceiro.
O achado é reportado ao mantenedor — nunca usado contra sistema alheio.*
