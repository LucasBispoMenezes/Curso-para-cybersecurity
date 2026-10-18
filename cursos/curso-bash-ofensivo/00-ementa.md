---
title: "Bash Ofensivo: Automacao para Pentest"
nivel: intermediario
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

| Área                 | Nível exigido                                                            |
| -------------------- | ------------------------------------------------------------------------ |
| Linux básico         | `cd`, `ls`, `chmod`, `mkdir`, `cat`, `grep`, pipes e redirecionamento    |
| Rede                 | Modelo TCP/IP, portas, DNS, HTTP — nível conceitual                      |
| Editores de terminal | `vim` ou `nano` — uso básico                                             |
| Ambiente             | Uma VM Linux (Kali, Debian ou Ubuntu) ou WSL2; Docker recomendado        |
| Terminal             | ⚠ Fluência: `grep`, pipes, redirecionamento, `$?`, variáveis de ambiente |

Teste de autoavaliação: você consegue explicar o que `ls -la /var/log | grep -i error | wc -l`
faz, parte por parte? Se sim, o curso começa no nível certo.

## Estrutura

| #   | Módulo                        | Foco                                      | Horas |
| --- | ----------------------------- | ----------------------------------------- | ----- |
| 1   | Fundamentos de shell ofensiva | Scripting defensável sob pressão          | 3     |
| 2   | Manipulação de texto e dados  | O coração da automação de pentest         | 3     |
| 3   | Concorrência e performance    | Fazer em paralelo o que é lento em série  | 3     |
| 4   | Automação de rede             | Sockets, HTTP e orquestração de varredura | 4     |
| 5   | Automação de reconhecimento   | Da enumeração manual ao pipeline          | 4     |
| 6   | Scanning, fuzzing e relatório | Fechar o ciclo com entrega                | 3     |

Cada módulo: teoria → demonstrações comentadas → lab prático → avaliação.
Aproximadamente 50% do tempo é prática.

## Ambiente de laboratório

Cada módulo traz os comandos `docker run` e `docker network create` que sobem o alvo em uma rede
dedicada, e a limpeza correspondente ao final. Nada do curso depende de internet durante a execução
dos labs, exceto o pull inicial das imagens.

## Critérios de avaliação

| Instrumento                       | Peso | O que mede                              |
| --------------------------------- | ---- | --------------------------------------- |
| Labs por módulo (6)               | 60%  | Capacidade de construir, não de lembrar |
| Questões objetivas (6 blocos)     | 20%  | Compreensão de mecanismo                |
| Projeto final (pipeline completo) | 20%  | Integração de tudo, entrega funcional   |

⚠ A soma dos labs é de 10h30, contra as 20h do curso — cerca de 50% do tempo. O restante é teoria,
demonstração e avaliação.

Nota mínima sugerida: 70%.

## Referências

Cinco obras abertas sustentam o conteúdo deste curso. Cada uma responde por uma parte específica
do material — a coluna da direita diz qual.

| Obra                                                                                 | Onde                                                        | O que ela sustenta neste curso                                                                                     |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **GNU Bash Reference Manual**                                                        | <https://www.gnu.org/software/bash/manual/bash.html>        | A semântica de expansão, arrays, tratamento de variável não definida, descritores e redirecionamento — M1, M2 e M3 |
| **MITRE ATT&CK**                                                                     | <https://attack.mitre.org/>                                 | O vocabulário de técnica e o que um pipeline de recon realmente alimenta — M5 e M6                                 |
| **NIST SP 800-115** (Technical Guide to Information Security Testing and Assessment) | <https://csrc.nist.gov/pubs/sp/800/115/final>               | O método de engajamento, planejamento de varredura e tratamento de achado — M1, M4 e M6                            |
| **OWASP Web Security Testing Guide**                                                 | <https://owasp.org/www-project-web-security-testing-guide/> | A estrutura de teste de aplicação e a taxonomia dos achados de web — M4 e M6                                       |
| **Kali Linux Documentation**                                                         | <https://www.kali.org/docs/>                                | O ambiente de laboratório e o uso das ferramentas em container — M1 a M6                                           |

⚠ **Consultadas em outubro de 2026.** São referências **conceituais**: o curso não reproduz trecho,
exemplo nem estrutura dessas obras — apenas segue os mesmos conceitos, com material próprio.

⚠ **A licença de cada obra é a do seu publicador.** Nenhuma delas é pré-requisito para acompanhar o
curso; todas servem a quem quiser ir além do que aqui está.

_Material didático original. Nenhum trecho, exemplo ou estrutura de capítulo foi reproduzido de
obra comercial protegida._
