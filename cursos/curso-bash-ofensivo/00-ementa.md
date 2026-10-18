---
title: "Bash Ofensivo: Automacao para Pentest"
nivel: basico
tags: [bash, shell, automacao, pentest, script]
---

## Visão geral

Este curso ensina a escrever scripts bash para automação de testes de intrusão. Ele não
é um curso de "como invadir sistemas": é um curso de **como pensar em automação ofensiva** —
construir ferramentas próprias, encadear programas, processar saída de scanner e transformar
saída crua em decisão.

O fio condutor é a ideia de que um pentester que só sabe rodar ferramentas é substituível por
um script. O profissional que escreve o script não é.

Todo o material é **original**. As referências abertas usadas como base conceitual estão
listadas ao final desta ementa.


## Pré-requisitos

| Área | Nível exigido |
|---|---|
| Linux básico | `cd`, `ls`, `chmod`, `mkdir`, `cat`, `grep`, pipes e redirecionamento |
| Rede | Modelo TCP/IP, portas, DNS, HTTP — nível conceitual |
| Editores de terminal | `vim` ou `nano` — uso básico |
| Ambiente | Uma VM Linux (Kali, Debian ou Ubuntu) ou WSL2; Docker recomendado |

Teste de autoavaliação: você consegue explicar o que `ls -la /var/log | grep -i error | wc -l`
faz, parte por parte? Se sim, o curso começa no nível certo.


## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | Fundamentos de shell ofensiva | Scripting defensável sob pressão | 3 |
| 2 | Manipulação de texto e dados | O coração da automação de pentest | 3 |
| 3 | Concorrência e performance | Fazer em paralelo o que é lento em série | 3 |
| 4 | Automação de rede | Sockets, HTTP e orquestração de varredura | 4 |
| 5 | Automação de reconhecimento | Da enumeração manual ao pipeline | 4 |
| 6 | Scanning, fuzzing e relatório | Fechar o ciclo com entrega | 3 |

Cada módulo: teoria → demonstrações comentadas → lab prático → avaliação.
Aproximadamente 60% do tempo é prática.


## Ambiente de laboratório

Todos os módulos incluem um `docker-compose.yml` próprio. Os alunos sobem alvos descartáveis na
própria máquina e destroem ao final. Nada do curso depende de internet durante a execução dos
labs, exceto o pull inicial das imagens.


## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (6) | 60% | Capacidade de construir, não de lembrar |
| Questões objetivas (6 blocos) | 20% | Compreensão de mecanismo |
| Projeto final (pipeline completo) | 20% | Integração de tudo, entrega funcional |

Nota mínima sugerida: 70%.


*Material didático original. Nenhum trecho, exemplo ou estrutura de capítulo foi reproduzido de
obra comercial protegida.*
