---
title: "Segurança de Aplicações com LLM: Instrução, Dado e a Fronteira que Não Separa"
nivel: avancado
tags: [llm, prompt-injection, rag, agente, guardrail, bypass, exfiltração, medição]
---
# Segurança de Aplicações com LLM: Instrução, Dado e a Fronteira que Não Separa

**Ementa do curso · 40 horas · 12 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Modelo** | Chama a API e recebe texto | Sabe **onde** ele decide, e o que ele passa a confiar |
| **Prompt** | Escreve instrução no sistema | Reconhece **conteúdo** que compete com ela |
| **Injection** | Conhece o nome | ⚠ Sabe que a **indireta** é a que importa |
| **RAG** | "aumenta o contexto" | Autoriza **por documento**, e mede o que sai |
| **Tool** | O modelo chama função | ⚠ Sabe que ele vira **proxy de requisição** |
| **Agente** | Roda em loop | ⚠ Contém o **estado** que persiste entre sessões |
| **Guardrail** | "tem filtro" | Sabe **o que** ele filtra, e **onde** ele olha |
| **Bypass** | Copia técnica de fórum | Classifica a família e **mede a taxa** |
| **Saída** | Valida o formato | Sabe por que validar saída **não basta** |
| **Resultado** | "não consegui quebrar" | ⚠ **taxa medida**, com o que continua possível |
| **Mentalidade** | "o modelo é burlável" | **"que dado ele trata como instrução, e quem validou?"** |

**Pré-requisito duro:** curso de **Redes** (HTTP, API, TLS) · curso de **Segurança de Aplicações Web e APIs** (fronteira de confiança, autorização, contexto de saída).
**Ajuda muito:** curso de **Pesquisa em Segurança** (hipótese, medição, reporte) e curso de **Detecção e Evasão** (taxa de falso negativo — a mesma aritmética).

⚠ **Sem os dois primeiros, o curso vira coleção de anedota.** A fronteira de confiança e o modelo de autorização vêm de lá; aqui eles são aplicados a uma camada que **não obedece às regras**.

---

## Por que este curso existe

⚠ **A afirmação que organiza o curso inteiro:**

> **O LLM não é um componente da aplicação. É uma fronteira de confiança que trata TEXTO como
> INSTRUÇÃO — e por isso não existe separação de canal.**

⚠ **Leia isso ao lado da tese do curso de Web Apps:**

| Web Apps (módulo 5) | LLM (este curso) |
|---|---|
| Dado e instrução no **mesmo canal** | ⚠ **Idem** |
| ⚠ **A correção é separar os canais** | ⚠ ⚠ **A separação não é possível** |
| `SELECT ... WHERE nome = ?` | ⚠ **Não há equivalente** |
| Parametrizar elimina a causa | ⚠ Reduz-se superfície e contém-se impacto |
| Termina em "corrigido, e o teste prova" | ⚠ Termina em **taxa medida** e **contenção** |

⚠ **A quarta linha é a mais importante do curso inteiro, e a que o separa de todo material existente.**

⚠ **Enquanto SQL tem um canal de dado separado do canal de código, o modelo tem UM só.** Ele é
projetado para ler linguagem natural e obedecer — e **instrução e dado são a mesma coisa, do ponto de
vista dele**. Não existe `bind` para linguagem natural.

⚠ **A consequência prática, dita sem rodeio:**

> **Prompt injection não é um bug a corrigir. É uma propriedade do desenho — e o trabalho do
> profissional é medir a superfície, conter o alcance e declarar o que permanece possível.**

⚠ **E é por isso que este curso existe:** quase todo material de "segurança em LLM" é **catálogo de jailbreak**. Isso responde "o modelo obedece?", e **não** responde a pergunta que uma empresa precisa: *se ele obedecer, o que o atacante alcança, e quanto isso custa?*

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. **Desenhar** a arquitetura de uma aplicação com LLM e marcar **onde a confiança muda**.
2. Explicar por que instrução e dado **não são separáveis** — e o que decorre disso.
3. Reconhecer a diferença entre injection **direta** e **indireta**, e por que a segunda é a que importa.
4. **Autorizar por documento** em um RAG, e medir o que uma consulta traz de volta.
5. Reconhecer **tool abuse**: o modelo como proxy de requisição com a credencial da aplicação.
6. Conter **estado e memória** de agente, e por que a memória é superfície persistente.
7. **Classificar** um guardrail pelo que ele filtra, e apontar **onde ele olha**.
8. **Classificar** uma técnica de bypass na família correta, e explicar o mecanismo.
9. ⚠ **Medir a taxa de sucesso** de um bypass, com uma variável por vez e N repetições.
10. Avaliar por que **validar a saída não basta** — e onde ela ainda serve.
11. Reconhecer a superfície **fora do seu controle**: dados de treino e fine-tuning.
12. **Produzir o relatório**: o que foi demonstrado, a taxa, a contenção e ⚠ **o que continua possível**.

---

## O laboratório

⚠ **Decisão de desenho: o modelo roda local.**

| Por quê | Consequência |
|---|---|
| ⚠ **Taxa medida precisa ser reproduzível** | Modelo de terceiro muda sem aviso |
| **A trilha inteira faz assim** | O alvo é sempre seu |
| Custo e disponibilidade | Sem chave, sem cota, sem rede |
| ⚠ **Acesso ao modelo cru** | Sem guardrail do provedor atrapalhando a medição |

```bash
# O modelo local — escolha UM e anote a versao no relatorio
# ⚠ a TAXA depende do modelo. Sem anotar a versao, o numero nao vale.

# Opcao A: Ollama (mais simples)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:8b
ollama list                        # ⚠ anote a versao exata
ollama run llama3.1:8b "diga ok"

# Opcao B: llama.cpp (mais controle)
git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp
make -j"$(nproc)"
./llama-server -m modelos/modelo.gguf --port 8080 -c 8192

# O laboratorio da aplicacao
mkdir -p ~/llm-lab && cd ~/llm-lab
python3 -m venv .venv && source .venv/bin/activate
pip install requests flask chromadb sentence-transformers pytest
```

⚠ **Quatro regras do laboratório:**

⚠ **Anote modelo, versão, quantização e parâmetros** (`temperature`, `top_p`, `seed`) em **todo** resultado. Sem isso, a taxa de sucesso do módulo 10 não é comparável — nem com a sua própria medição de ontem.

⚠ **O alvo é o seu modelo, na sua máquina, com os seus documentos.** Nenhum lab aponta para serviço de terceiro, nem para dados reais de alguém.

⚠ **Sem `temperature=0` você não mede nada** — a variação entre execuções vira ruído, e o módulo 10 exige uma variável por vez.

⚠ **Os labs não foram testados em ambiente isolado.** Valide antes de publicar ou usar em aula.

---

## Como este curso se conecta aos outros

| Curso | Ligação |
|---|---|
| **Web Apps e APIs** | Pré-requisito: fronteira, autorização, contexto de saída |
| **Redes** | Pré-requisito: HTTP, API, TLS |
| **Pesquisa em Segurança** | ⚠ Método: hipótese, medição, reporte |
| **Detecção e Evasão** | ⚠ Ligação: taxa de falso negativo — a mesma aritmética do módulo 10 |
| **Linux Internals** | Paralelo: a mesma tese em outra fronteira |
| **Threat Modeling / Arquitetura** | Ligação: decidir onde pôr o modelo |

⚠ **A ligação com `Detecção e Evasão` é a mais produtiva.** Lá, a pergunta é *quanto custa **detectar**, e qual a taxa de falso negativo*. Aqui, *quanto custa **conter**, e qual a taxa de bypass bem-sucedido*. ⚠ **É a mesma aritmética de custo**, aplicada ao outro lado — e por isso o módulo 10 se parece com o módulo de medição de lá.

---

## Módulos

| # | Módulo | Horas |
|---|---|---|
| 1 | A arquitetura de uma aplicação com LLM, e a fronteira nova | 3 |
| 2 | Instrução e dado: a confusão fundadora | 3 |
| 3 | Prompt injection direta | 3 |
| 4 | ⚠ Prompt injection indireta: o conteúdo envenenado | 4 |
| 5 | Exfiltração via RAG e via contexto | 4 |
| 6 | Tool abuse: o modelo como proxy de requisição | 4 |
| 7 | Agentes, memória e o problema do estado | 3 |
| 8 | Guardrails: a anatomia da defesa, e onde ela olha | 4 |
| 9 | ⚠ Bypass: as famílias | 4 |
| 10 | ⚠ Bypass: a medição | 3 |
| 11 | Dados de treino, fine-tuning e a superfície que não é sua | 3 |
| 12 | Projeto final: aplicação com LLM, e o que continua possível | 2 |

**Ordem de leitura:** linear. Os módulos 3 a 7 são os ataques; 8 a 10 são a defesa e o rompimento dela; 2 é a base de tudo.

---

## Avaliação e encerramento

- `avaliacoes.md` — banco de questões por módulo, com resposta comentada.
- `glossario.md` — os termos do curso, definidos uma vez, em ordem.
- `README.md` — índice e ordem de leitura.

⚠ **A entrega do módulo 12 tem uma coluna que nenhum outro curso da trilha tem:**

> **"Continua possível mesmo com todas as defesas aplicadas"** — porque, em LLM, a coluna
> "corrigido" muitas vezes está vazia, e o relatório honesto diz por quê.

---

*Material didático original. Todo alvo é modelo rodando localmente, na máquina do aluno, com documentos
fictícios. Nenhum material que ensine atacar serviço de terceiro ou contornar política de provedor.*
