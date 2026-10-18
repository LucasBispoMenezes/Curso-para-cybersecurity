---
title: Pesquisa em Seguranca: O Metodo Antes da Tecnica
nivel: intermediario
tags: [pesquisa, metodologia, cve, patch, hipotese, metodo]
---# Pesquisa em Segurança: O Método Antes da Técnica

**Ementa do curso · 30 horas · 12 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Trabalho** | Segue writeup alheio | **Produz o achado original** |
| **Patch** | Vê o commit | **Infere o invariante violado** |
| **CVE** | Lê o resumo | **Reconstrói o bug da descrição e do diff** |
| **Paper** | Lê o abstract | **Avalia o método e a limitação** |
| **Alvo** | Escolhe o que tem tutorial | **Escolhe por superfície e maturidade** |
| **Hipótese** | "vou testar coisas" | **Hipótese falsificável, registrada** |
| **Falha** | Desiste e muda de alvo | **Extrai o que a falha ensinou** |
| **Resultado** | "não achei nada" | **Hipótese, evidência, e o que sobra** |
| **Mentalidade** | "preciso achar um bug" | **"preciso responder uma pergunta"** |

**Pré-requisito duro:** pelo menos **um** curso deste material concluído, e saber ler código em
**duas linguagens**. **Sem isso, o curso fica abstrato.**

---

## Por que este curso existe

⚠ **A distinção que organiza tudo:**

```
OPERADOR                            PESQUISADOR
┌────────────────────────┐          ┌────────────────────────┐
│ usa a ferramenta       │          │ pergunta o que a        │
│ segue o writeup        │          │ ferramenta não cobre    │
│ sabe o que fazer       │          │ sabe O QUE PROCURAR     │
│ depende do alvo pronto │          │ escolhe o alvo          │
│ acha o que já é sabido │          │ acha o que não era      │
└────────────────────────┘          └────────────────────────┘
```

⚠ **E a diferença não é talento — é método.** Um pesquisador tem:
- **Uma pergunta**, não uma tarefa.
- **Um invariante** que ele acredita que deve valer.
- **Um registro** do que testou e do que concluiu.
- **Critério de parada** — sabendo dizer "esta hipótese morreu".

⚠ **A tese do curso:**

> **Pesquisa é o processo de transformar uma intuição vaga em uma hipótese falsificável, e depois
> falsificá-la — com registro, para que o próximo passo seja informado pelo anterior.**

⚠ **E nenhum curso de pentest ensina isso** — porque pentest tem **escopo, prazo e roteiro**. Pesquisa
não tem roteiro: **tem pergunta.**

---

## ⚠ Nota de propósito

⚠ **Este é o curso mais "meta" do material, e o mais fácil de fazer errado.** Ele **não ensina a
achar bug** — ensina **a organizar a busca**, para que o esforço se acumule em vez de se dispersar.

| Este curso faz | **Não** faz |
|---|---|
| Ensinar a ler patch, CVE e paper | Ensinar a técnica de exploração |
| Definir alvo por critério | Ensinar a usar ferramenta |
| Registrar hipótese e evidência | Substituir os cursos técnicos |
| Avaliar contribuição e limite | Ensinar a publicar |
| **Escolher bem o alvo** | **Escolher alvo de terceiro** |

⚠ **E a regra de conduta é a mesma dos outros quinze:** **alvo próprio, alvo CTF publicado, ou
autorização escrita.** **A única diferença é que aqui você vai ser mais tentado a ampliar o escopo**
— porque **um achado interessante abre a pergunta seguinte, e a pergunta seguinte frequentemente
aponta para outro sistema.**

⚠ **E essa tentação é o tema do módulo 10.**

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. **Escolher um alvo** por critério explícito, e justificar a escolha.
2. **Ler um patch** e inferir o **invariante violado** — não só o que mudou.
3. **Ler um CVE** e reconstruir o bug, mesmo sem PoC público.
4. **Ler um paper** e avaliar **método, resultado e limitação**.
5. **Formular hipótese falsificável**, com critério de falsificação.
6. **Manter registro** de pesquisa reprodutível.
7. Reconhecer **variante** e **sibling bug** a partir de um padrão.
8. **Avaliar a maturidade** de um alvo — e por que alvo maduro é pouco produtivo.
9. **Escrever o relatório** com hipótese, evidência, conclusão e o que sobra.
10. **Saber parar** — e quando a pergunta seguinte sai do escopo autorizado.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | O que separa operador de pesquisador | Método, postura, o que se acumula | 2 |
| 2 | Escolher o alvo | Superfície, maturidade, histórico, critério | 3 |
| 3 | Ler um patch | Do diff ao invariante violado | 3 |
| 4 | Ler um CVE | Da descrição ao bug, sem PoC | 3 |
| 5 | Ler um paper | Método, resultado, limitação, replicabilidade | 3 |
| 6 | Hipótese falsificável | Formular, registrar, testar, matar | 3 |
| 7 | Variante e sibling bug | Do padrão ao irmão não corrigido | 3 |
| 8 | Registro de pesquisa | Reprodutibilidade e o caderno de laboratório | 2 |
| 9 | Quando desistir | Critério de parada, e o valor da falha | 2 |
| 10 | Escopo e ética na pesquisa | A tentação de ampliar — e a linha | 2 |
| 11 | Escrever o achado | Relatório, divulgação, e a nota técnica | 3 |
| 12 | Projeto: uma pesquisa completa | Do alvo ao achado, com registro | 3 |

Cada módulo: teoria → **exercício sobre material real** → lab → avaliação. ~55% prática de leitura.

---

## O laboratório — e ele é diferente dos outros

⚠ **Aqui você não monta VM. Você monta um ACERVO.**

| Recurso | O que é | Onde |
|---|---|---|
| **Um projeto de código aberto** | Para ler patch e histórico | GitHub — **alvo que você estuda, não ataca** |
| **Uma trilha de CVE** | Para reconstruir bugs | NVD, advisories, writeups |
| **Uma pasta de papers** | Para avaliar método | arXiv, USENIX, NDSS, IEEE S&P |
| **Um caderno** | Para o registro | Markdown — **é o entregável do curso** |

```bash
mkdir -p ~/pesquisa-lab/{alvos,papers,cve,caderno} && cd ~/pesquisa-lab
```

⚠ **A pasta `alvos/` guarda cópias de código que você ESTUDA.** Clonar um repositório público para
ler **é legítimo** — é leitura de material publicado. **O que não se faz é testar contra a instância
em produção** (§ módulo 10).

⚠ **E a pasta `caderno/` é o entregável central.** O curso inteiro gira em volta de **um caderno de
pesquisa** que você constrói módulo a módulo.

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Exercícios de leitura (módulos 3–5) | 30% | Leitura de patch, CVE e paper |
| Caderno de pesquisa | 25% | Registro reprodutível e acumulativo |
| Formulação de hipótese (módulo 6) | 15% | Falsificabilidade e critério |
| Análise de variante (módulo 7) | 10% | Do padrão ao irmão |
| Projeto (módulo 12) | 20% | Pesquisa completa, com o que sobrou |

**Rubrica central:** você não entrega "li o paper". Você entrega **a pergunta**, **o método**, **a
evidência**, e **o que aquele passo te permitiu perguntar em seguida**.

---

## Como este curso se conecta

| Curso | O que ele dá |
|---|---|
| **Enumeração Esotérica** | ⚠ **O modelo:** enumerar por pergunta, não por ferramenta |
| **C para Segurança** | Ler código e reconhecer a classe de bug |
| **Linux para Segurança** | Ler patch de kernel, entender config |
| **Exploit Development** | A técnica, quando o achado exige |
| **Criptografia Aplicada** | As cinco classes, e ler paper de cripto |
| **Fuzzing** | ⚠ **Reprodução dirigida** — `1dFuzz` (módulo 7) |

⚠ **Este é o curso que dá direção aos outros.** Sem ele, você tem técnica e não sabe **onde
aplicá-la**.

---

## Referências abertas

- **arXiv cs.CR** — https://arxiv.org/list/cs.CR/recent
- **USENIX Security, NDSS, IEEE S&P, CCS** — as quatro conferências principais
- **NVD** — https://nvd.nist.gov/
- **GitHub Advisory Database** — https://github.com/advisories
- **Patch Diffing In The Dark** — https://github.com/VulnerabilityResearchCentre/patch-diffing-in-the-dark
- **PLocator** — https://arxiv.org/html/2501.17413v1
- **EnBinDiff** — IEEE TQ 2023
- **1dFuzz** — https://dl.acm.org/doi/10.1145/3597926.3598102
- **HTTP Garden** — https://arxiv.org/pdf/2405.17737
- **"How to Read a Paper"** — S. Keshav (o método dos três passos)
- **Project Zero blog** — https://googleprojectzero.blogspot.com/ (o padrão de RCA)
- **Bellingcat** — metodologia de investigação e registro
- **Berkeley Protocol** — preservação de evidência

---

*Material didático original. Leitura de código publicado, patch e paper — material de estudo. Nenhum
teste contra sistema de terceiro sem autorização escrita.*
