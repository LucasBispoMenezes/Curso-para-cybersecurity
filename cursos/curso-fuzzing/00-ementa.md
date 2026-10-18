---
title: "Fuzzing e Pesquisa de Vulnerabilidades: do Zero ao Achado Reproduzivel"
nivel: avancado
tags: [fuzzing, afl, cobertura, crash, triagem, harness]
---title: Fuzzing e Pesquisa de Vulnerabilidades: do Zero ao Achado Reproduzivel
nivel: especialista
tags: [fuzzing, afl, cobertura, crash, triagem, harness]
---# Fuzzing e Pesquisa de Vulnerabilidades: do Zero ao Achado Reproduzível

**Ementa do curso · 40 horas · 12 módulos · PT-BR com termos técnicos em inglês**


## Público-alvo

- Desenvolvedores que querem fuzzing no próprio projeto, e não sabem por onde começar.
- Profissionais de segurança que usam ferramenta e não entendem o limite dela.
- Pesquisadores iniciantes que querem produzir achado reproduzível.
- Quem quer entrar em OSS-Fuzz, bug bounty ou programa de divulgação responsável.
- Estudantes de sistemas que querem ver memória corromper de verdade.

**Não é** para quem nunca programou. **C e linha de comando são pré-requisito duro.**


## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Explicar por que um programa corrompe memória, em nível de byte.
2. Instrumentar um alvo com sanitizer e **interpretar o relatório** que ele produz.
3. Escrever harness de fuzzing que exercita o alvo corretamente.
4. Construir corpus e dicionário que decidem o resultado da campanha.
5. Rodar AFL++ e libFuzzer em modo produtivo, com paralelismo.
6. Fazer fuzzing de protocolo com estado, mantendo sessão válida.
7. Triagem e deduplicar centenas de crashes por causa raiz.
8. Minimizar entrada com `afl-tmin` e explicar por que a minimalidade importa.
9. Reconstruir a causa raiz de um crash no depurador.
10. Escrever patch, teste de regressão e hardening.
11. Aplicar fuzzing *structure-aware* onde o fuzzer genérico falha.
12. Escrever reporte de vulnerabilidade que é aceito.


## O laboratório

Todo alvo é **seu**: você compila, você fuzza, você acha. Sem exceção.

```
┌────────────────────────────────────────────────────────────┐
│              SUA VM LINUX (isolada, snapshot antes)         │
│                                                             │
│  alvos/          alvos com bug deliberado, compilados       │
│  harnesses/      harness de cada alvo                       │
│  corpus/         entradas semente                           │
│  findings/       crashes encontrados                        │
│  triagem/        deduplicado, minimizado, classificado      │
└────────────────────────────────────────────────────────────┘
```

⚠ **A regra que não tem exceção:** você fuzza **o que você compilou**. Nada de apontar o fuzzer
para software de terceiro na sua máquina, nada de campanha contra alvo que não é seu.

⚠ **Fuzzing consome recurso.** Um fuzzer rodando contra um serviço de terceiro é negação de
serviço, mesmo sem intenção. O curso inteiro roda em `localhost`.


## Estrutura do curso em quatro etapas

O curso segue a trilha validada na pesquisa:

| Etapa | Módulos | Você termina com |
|---|---|---|
| **1 — Fundamentos** | 1–3 | Um alvo com bug próprio, e você sabe explicar a corrupção |
| **2 — Ferramentas** | 4–7 | Campanha rodando, crash encontrado, reporte do ASan entendido |
| **3 — Pesquisa** | 8–10 | Fuzzer de protocolo, triagem de 500 crashes, entrada mínima |
| **4 — Original** | 11–12 | Causa raiz reconstruída, patch, regressão, reporte |


## ⚠ Nota de propósito e conduta

| Este curso faz | Este curso **não** faz |
|---|---|
| Fuzzing em alvo que você compilou | Fuzzing em software de terceiro |
| Análise de causa raiz e priorização | Cálculo de offset, controle de EIP, exploit |
| Reporte e divulgação responsável | Uso do achado para atacar |
| Patch e teste de regressão | — |

⚠ **A linha, e ela é técnica:** encontrar a vulnerabilidade e **entender** por que ela dá controle
é necessário para priorizar. **Armar o exploit** é passo seguinte, específico de alvo, e não está
no material. Quem reporta melhor que outro é quem entende a severidade — e é isso que o curso
ensina.

⚠ **Divulgação responsável é parte do conteúdo, não apêndice.** O módulo 12 traz o procedimento:
reportar ao mantenedor, respeitar prazo, e publicar depois do patch.


*Material didático original, de propósito defensivo e de pesquisa. Todo alvo é compilado pelo
aluno. Nenhum material que ensine armar exploit ou atacar alvo de terceiro.*
