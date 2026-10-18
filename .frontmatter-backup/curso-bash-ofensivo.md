---
title: Bash Ofensivo: Automação para Pentest
nivel: basico
tags: [bash, shell, automação, pentest, script]
---


# Bash Ofensivo: Automação para Pentest

**Ementa do curso · 20 horas · 6 módulos · PT-BR com termos técnicos em inglês**

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

---

## Público-alvo

Desenvolvedores, sysadmins, analistas de infraestrutura, profissionais de suporte N2/N3 e
estudantes de segurança que:

- já usam o terminal Linux com confiança no dia a dia;
- querem migrar para segurança ofensiva ou automatizar trabalho repetitivo;
- nunca escreveram um script de automação de pentest, ou escreveram apenas copiando linhas
  soltas de fóruns.

**Não é** para quem está começando em Linux do zero. Também não é para quem quer um catálogo de
comandos prontos — o foco é entender o mecanismo e saber adaptá-lo.

---

## Pré-requisitos

| Área | Nível exigido |
|---|---|
| Linux básico | `cd`, `ls`, `chmod`, `mkdir`, `cat`, `grep`, pipes e redirecionamento |
| Rede | Modelo TCP/IP, portas, DNS, HTTP — nível conceitual |
| Editores de terminal | `vim` ou `nano` — uso básico |
| Ambiente | Uma VM Linux (Kali, Debian ou Ubuntu) ou WSL2; Docker recomendado |

Teste de autoavaliação: você consegue explicar o que `ls -la /var/log | grep -i error | wc -l`
faz, parte por parte? Se sim, o curso começa no nível certo.

---

## Objetivos de aprendizagem

Ao final do curso, o aluno será capaz de:

1. Escrever scripts bash robustos, com tratamento explícito de erro e código de saída correto.
2. Processar texto e dados estruturados (`grep`, `sed`, `awk`, `jq`) para transformar saída de
   ferramentas em datasets utilizáveis.
3. Paralelizar tarefas de rede com controle de concorrência, sem corromper a saída.
4. Interagir com serviços de rede a partir do próprio shell, sem depender de bibliotecas externas.
5. Construir um pipeline de reconhecimento que agrega, deduplica e prioriza alvos.
6. Orquestrar scanners e fuzzers programaticamente e consolidar achados.
7. Gerar relatórios técnicos em Markdown a partir de dados coletados automaticamente.
8. Reconhecer os limites legais e éticos de um teste de intrusão.

---

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

---

## Ética e escopo legal

Módulo transversal diluído ao longo do curso, com nota de abertura em cada módulo:

- **Escopo autorizado é tudo.** Testar um sistema sem permissão escrita é crime — no Brasil,
  entre outros, pelos artigos 154-A e 266 do Código Penal.
- Regras de engajamento (*rules of engagement*): o que está no escopo, o que não está, janelas
  de horário, contatos de emergência, canal de comunicação.
- Dados encontrados durante um teste: sigilo, minimização, e o que a LGPD exige de quem manuseia
  dado pessoal alheio.
- **Todos os labs deste curso rodam em containers locais e redes isoladas.** Nenhum exercício
  aponta para alvo externo.

---

## Ambiente de laboratório

Todos os módulos incluem um `docker-compose.yml` próprio. Os alunos sobem alvos descartáveis na
própria máquina e destroem ao final. Nada do curso depende de internet durante a execução dos
labs, exceto o pull inicial das imagens.

---

## Entregáveis do material

```
curso-bash-ofensivo/
├── README.md            Índice, trilha de estudo, como montar o ambiente
├── 00-ementa.md         Este documento
├── modulo-01.md         Fundamentos de shell ofensiva
├── modulo-02.md         Manipulação de texto e dados
├── modulo-03.md         Concorrência e performance
├── modulo-04.md         Automação de rede
├── modulo-05.md         Automação de reconhecimento
├── modulo-06.md         Scanning, fuzzing e relatório
├── avaliacoes.md        Questões objetivas e exercícios práticos por módulo
└── glossario.md         Termos em PT-BR com equivalente técnico em inglês
```

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (6) | 60% | Capacidade de construir, não de lembrar |
| Questões objetivas (6 blocos) | 20% | Compreensão de mecanismo |
| Projeto final (pipeline completo) | 20% | Integração de tudo, entrega funcional |

Nota mínima sugerida: 70%.

---

## Referências abertas

Material usado como base conceitual — todos com licença que permite uso e adaptação:

- **GNU Bash Reference Manual** — https://www.gnu.org/software/bash/manual/
- **MITRE ATT&CK** — https://attack.mitre.org/
- **NIST SP 800-115**, *Technical Guide to Information Security Testing and Assessment*
- **OWASP Web Security Testing Guide** — https://owasp.org/www-project-web-security-testing-guide/
- **OWASP Testing Checklist**
- **Kali Linux Documentation** — https://www.kali.org/docs/
- **Nmap Reference Guide** — https://nmap.org/book/man.html
- **Docker Documentation** — https://docs.docker.com/

---

*Material didático original. Nenhum trecho, exemplo ou estrutura de capítulo foi reproduzido de
obra comercial protegida.*
