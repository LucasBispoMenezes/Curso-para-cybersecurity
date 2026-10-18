# Pesquisa em Segurança

Curso de 30 horas, doze módulos. **O método antes da técnica.**

---

## A linha de progressão

| | Módulo 1 | Módulo 12 |
|---|---|---|
| **Trabalho** | Segue writeup alheio | **Produz achado original** |
| **Patch** | Vê o commit | **Infere o invariante violado** |
| **CVE** | Lê o resumo | **Reconstrói o bug, sem PoC** |
| **Paper** | Lê o abstract | **Avalia método e limitação** |
| **Alvo** | O que tem tutorial | **Critério explícito** |
| **Hipótese** | "vou testar coisas" | **Falsificável, com critério** |
| **Falha** | Desiste | **Extrai o que ensinou** |
| **Mentalidade** | "achar um bug" | **"responder uma pergunta"** |

**Pré-requisito:** um curso deste material concluído + ler código em **duas linguagens**.

---

## A tese

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

⚠ **A diferença não é talento — é método.** Um pesquisador tem **uma pergunta**, **um invariante**
em que acredita, **um registro** do que testou, e **critério de parada**.

⚠ **Nenhum curso de pentest ensina isso** — porque pentest tem **escopo, prazo e roteiro**.
Pesquisa não tem roteiro: **tem pergunta.**

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [O que separa operador de pesquisador](modulo-01.md) | 2 | A postura e o método |
| 2 | [Escolher o alvo](modulo-02.md) | 3 | Um alvo **escolhido por critério** |
| 3 | [Ler um patch](modulo-03.md) | 3 | O **invariante violado** |
| 4 | [Ler um CVE](modulo-04.md) | 3 | O bug reconstruído, sem PoC |
| 5 | [Ler um paper](modulo-05.md) | 3 | Método, resultado, limitação |
| 6 | [**Hipótese falsificável**](modulo-06.md) | 3 | Uma hipótese com critério de morte |
| 7 | [**Variante e sibling bug**](modulo-07.md) | 3 | Do padrão ao irmão não corrigido |
| 8 | [Registro de pesquisa](modulo-08.md) | 2 | O caderno reprodutível |
| 9 | [Quando desistir](modulo-09.md) | 2 | Critério de parada |
| 10 | [Escopo e ética](modulo-10.md) | 2 | Saber a linha — e onde ela está |
| 11 | [Escrever o achado](modulo-11.md) | 3 | Relatório e nota técnica |
| 12 | [Projeto: pesquisa completa](modulo-12.md) | 3 | **O achado, com o que sobrou** |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## As sete perguntas do pesquisador

⚠ **O instrumento que percorre o curso inteiro. Marque o que você já sabe responder:**

| # | Pergunta | Por que importa |
|---|---|---|
| 1 | **Qual é o invariante?** | O que deve valer, e pode não valer |
| 2 | **Quem confia nesse invariante?** | Quem quebra se ele falhar |
| 3 | **Que suposição o código faz?** | É onde o bug mora |
| 4 | **O que o patch mudou?** | E **por que** isso corrige |
| 5 | **Existe irmão desse padrão?** | ⚠ **O caminho para o achado original** |
| 6 | **Como eu falsifico isto?** | Sem isso, não é hipótese |
| 7 | **O que isso destrava?** | A pergunta seguinte |

⚠ **A pergunta 5 é a ponte entre "achar 1-day" e "achar bug novo".** **Você acha o padrão num lugar,
e procura o mesmo padrão em outros** — que é o que o módulo 7 formaliza.

---

## O laboratório — um ACERVO, não uma VM

⚠ **Aqui você não monta máquina. Você monta material de estudo.**

| Pasta | O que guarda |
|---|---|
| `alvos/` | Código público que você **estuda** (clonar é legítimo) |
| `papers/` | Artigos para avaliar método |
| `cve/` | Trilhas para reconstruir bugs |
| **`caderno/`** | ⚠ **O entregável do curso** |

```bash
mkdir -p ~/pesquisa-lab/{alvos,papers,cve,caderno} && cd ~/pesquisa-lab
```

⚠ **`caderno/` é onde o curso acontece.** Cada módulo adiciona uma seção — e no fim, você tem um
registro de pesquisa **reprodutível**.

---

## O que este curso NÃO é

| Este curso faz | Não faz |
|---|---|
| Ensinar a **ler** patch, CVE e paper | Ensinar a **técnica** de exploração |
| Definir alvo por critério | Ensinar a usar ferramenta |
| Registrar hipótese e evidência | Substituir os cursos técnicos |
| Ensinar a **avaliar** contribuição | Ensinar a **publicar** |
| **Escolher bem o alvo** | **Escolher alvo de terceiro** |

⚠ **É o curso mais "meta" do material, e o mais fácil de fazer errado.** Ele **não acha bug por
você** — ele faz o esforço **acumular** em vez de se dispersar.

---

## ⚠ Nota de propósito

⚠ **Aqui você vai ser mais tentado a ampliar escopo** — porque **um achado abre a pergunta seguinte,
e a pergunta seguinte aponta para outro sistema.**

| Você faz | Você **não** faz |
|---|---|
| Lê código **publicado** | Testa contra instância em produção |
| Estuda patch **público** | Aplica PoC em sistema alheio |
| Alvo próprio, CTF, ou autorizado | Alvo de terceiro, por interessante que seja |
| Reporta o achado | Publica sem coordenação |

⚠ **A regra:** **ler é sempre legítimo; testar exige autorização.** **É a linha que o módulo 10
formaliza** — e é o módulo que eu mais recomendo ler primeiro se você tiver pressa.

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **Postura e alvo** | 1 semana | 1–2 |
| **Os três objetos de leitura** | 3 semanas | 3–5 |
| **Método** | 2 semanas | 6–8 |
| **Fechamento** | 2 semanas | 9–12 |

⚠ **Estimativa a 10 h/semana.** Os módulos 3 e 5 costumam levar mais — **ler patch e ler paper são
habilidades separadas**, e as duas exigem prática.
