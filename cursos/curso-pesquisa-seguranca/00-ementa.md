---
title: "Pesquisa em Seguranca: O Metodo Antes da Tecnica"
nivel: avancado
tags: [pesquisa, metodologia, cve, patch, hipotese, metodo]
---
# Pesquisa em Segurança: O Método Antes da Técnica

**Ementa do curso · 30 horas · 12 módulos · PT-BR com termos técnicos em inglês**


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


*Material didático original. Leitura de código publicado, patch e paper — material de estudo. Nenhum
teste contra sistema de terceiro sem autorização escrita.*
