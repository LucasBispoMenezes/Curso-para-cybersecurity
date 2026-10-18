---
title: "Parser Differentials: Onde Duas Implementacoes Discordam"
nivel: especialista
tags: [parser, differential, framing, waf, harness, divergencia]
---# Parser Differentials: Onde Duas Implementações Discordam

**Ementa do curso · 30 horas · 10 módulos · PT-BR com termos técnicos em inglês**


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


*Material didático original, de propósito defensivo e de pesquisa. Comparação entre implementações
no laboratório próprio, ou com autorização escrita. Nenhum payload é enviado a serviço de terceiro.
O achado é reportado ao mantenedor — nunca usado contra sistema alheio.*
