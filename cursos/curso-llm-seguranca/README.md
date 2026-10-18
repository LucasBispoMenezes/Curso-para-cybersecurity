# Segurança de Aplicações com LLM

**Curso · 40 horas · 12 módulos · Nível: avançado**

---

## Sobre este curso

Este curso ensina a **encontrar, entender, conter e medir** falhas de segurança em aplicações que usam modelos de linguagem.

A afirmação que organiza tudo:

> **O LLM não é um componente da aplicação. É uma fronteira de confiança que trata TEXTO como
> INSTRUÇÃO — e por isso não existe separação de canal.**

⚠ **Leia isso ao lado da tese do curso de Web Apps e APIs.** Lá, o dado e a instrução também ocupavam o mesmo canal — e a correção era **separar**. Aqui, a separação **não é possível**: o modelo é projetado para ler linguagem natural e obedecer, e **instrução e dado são a mesma coisa, do ponto de vista dele**. Não existe `bind` para linguagem natural.

⚠ **A consequência prática, dita sem rodeio:**

> **Prompt injection não é um bug a corrigir. É uma propriedade do desenho.** O trabalho do
> profissional é **medir a superfície, conter o alcance e declarar o que permanece possível.**

⚠ **E é por isso que este curso existe.** Quase todo material de "segurança em LLM" é catálogo de jailbreak — responde *"o modelo obedece?"* e não responde o que uma empresa precisa: ***se ele obedecer, o que o atacante alcança, e quanto isso custa?***

---

## Pré-requisitos

| Pré-requisito | Por quê |
|---|---|
| **Segurança de Aplicações Web e APIs** | fronteira de confiança, autorização, contexto de saída |
| **Redes** | HTTP, API, TLS |
| **Pesquisa em Segurança** *(ajuda)* | hipótese, medição, reporte |
| **Detecção e Evasão** *(ajuda)* | taxa de falso negativo — a mesma aritmética |

⚠ **Sem os dois primeiros, o curso vira coleção de anedota.**

---

## Estrutura

| # | Módulo | Horas | O que entrega |
|---|---|---|---|
| 1 | [Arquitetura e a fronteira nova](modulo-01.md) | 3 | as **oito** fronteiras, e as quatro decisões |
| 2 | [Instrução e dado](modulo-02.md) | 3 | por que não há `bind` — do tokenizador à saída |
| 3 | [Injection direta](modulo-03.md) | 3 | as cinco famílias, e por que é a menos grave |
| 4 | [**Injection indireta**](modulo-04.md) | 4 | ⚠ o conteúdo envenenado — **o coração do curso** |
| 5 | [Exfiltração via RAG e contexto](modulo-05.md) | 4 | as quatro vias de saída, e a autorização por documento |
| 6 | [Tool abuse](modulo-06.md) | 4 | o modelo como proxy — o **SSRF do mundo do LLM** |
| 7 | [Agentes, memória e estado](modulo-07.md) | 3 | procedência, e o ataque que **persiste** |
| 8 | [Guardrails](modulo-08.md) | 4 | ⚠ **onde cada defesa olha** |
| 9 | [Bypass: as famílias](modulo-09.md) | 4 | as **oito** famílias, com mecanismo |
| 10 | [**Bypass: a medição**](modulo-10.md) | 3 | ⚠ taxa, controle e os dois números |
| 11 | [Dados de treino e fine-tuning](modulo-11.md) | 3 | a superfície que **não se audita** |
| 12 | [Projeto final](modulo-12.md) | 2 | defeitos não anunciados, e a coluna **`CONTINUA POSSÍVEL`** |

**Ordem de leitura:** linear. Os módulos 3 a 7 são os ataques; 8 a 10 são a defesa e o rompimento dela; o 2 é a base de todos.

---

## O laboratório

⚠ **Decisão de desenho: o modelo roda local.**

```bash
# Ollama (mais simples)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:8b
ollama list          # ⚠ ANOTE a versao — sem ela, a taxa nao vale

mkdir -p ~/llm-lab && cd ~/llm-lab
python3 -m venv .venv && source .venv/bin/activate
pip install requests flask pytest
```

| Por quê local | Consequência |
|---|---|
| ⚠ **Taxa medida precisa ser reproduzível** | Modelo de terceiro muda sem aviso |
| Acesso ao modelo cru | Sem guardrail do provedor atrapalhando a medição |
| Custo e disponibilidade | Sem chave, sem cota, sem rede |
| **A trilha faz assim** | O alvo é sempre seu |

⚠ **Quatro regras:** anote **modelo, versão, quantização e parâmetros** em todo resultado; use **`temperature=0`** quando for comparar; o alvo é **o seu modelo, na sua máquina, com documentos fictícios**; e **os labs não foram testados em ambiente isolado** — valide antes de publicar.

---

## Conexões com os outros cursos da trilha

| Curso | Ligação |
|---|---|
| **Web Apps e APIs** | Pré-requisito: fronteira, autorização, contexto de saída |
| **Redes** | Pré-requisito: HTTP, API, TLS |
| **Detecção e Evasão** | ⚠ **A aritmética do módulo 10 é a mesma** — taxa de dois erros, e o falso positivo desliga a defesa |
| **Pesquisa em Segurança** | Método: hipótese, medição, reporte |
| **Linux Internals** | Paralelo: a mesma tese em outra fronteira |
| **Cadeia de Exploração Web** *(futuro)* | Continuação: composição de achados |

⚠ **A diferença de fundo em relação a todos os outros cursos da trilha:** nos cursos de kernel e de web, a correção existe — `WHERE dono_id = ?` elimina o IDOR, `realpath` elimina o traversal. ⚠ **Aqui, a coluna "corrigido" muitas vezes fica vazia** — e o que se entrega é **taxa, contenção e declaração**.

---

## Cobertura

| Referência | Onde |
|---|---|
| **`OWASP Top 10 LLM`** | LLM01 prompt injection → 3, 4 e 9 · LLM02 vazamento → 5 · LLM05 saída insegura → 6 e 8 · LLM06 agency excessiva → 6 e 7 · LLM03 dado de treino → 11 · LLM07 vazamento de prompt → 5 e 8 · LLM08 vetor e embedding → 5 · LLM10 consumo → 6 e 10 |
| `OWASP API Top 10` | API1/API5 → 6 (autorização em ferramenta) |
| **`MITRE ATLAS`** | reconhecimento de alvo → 1 e 11 · evasão de defesa → 9 · impacto → 6 e 7 |

---

## Arquivos do curso

```
curso-llm-seguranca/
├── README.md          ← este arquivo
├── 00-ementa.md       ← ementa completa
├── modulo-01.md ... modulo-12.md
├── avaliacoes.md      ← banco de questões
└── glossario.md       ← termos do curso
```

---

*Material didático original. Todo alvo é modelo rodando localmente, na máquina do aluno, com documentos
fictícios. Nenhum material que ensine atacar serviço de terceiro ou contornar política de provedor.*
