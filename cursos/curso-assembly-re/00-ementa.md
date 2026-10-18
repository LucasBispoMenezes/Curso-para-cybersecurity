---
title: "Assembly x86-64 e Engenharia Reversa: do Zero ao Avancado"
nivel: intermediario
tags: [assembly, x86-64, engenharia-reversa, ghidra, binario, disassembly]
---

## Visão geral

Este curso ensina a ler código de máquina. Não "decorar instruções de assembly", mas entender o
que um binário está fazendo quando você não tem o código-fonte — e por que isso importa.

Engenharia reversa é a habilidade que sustenta análise de malware, pesquisa de vulnerabilidade,
auditoria de binário de terceiro, verificação de conformidade e recuperação de software legado.
É a diferença entre *suspeitar* que um programa faz algo e *saber* o que ele faz.

O curso vai do zero: você começa escrevendo seu próprio assembly e termina analisando binário
real, comparando versões para achar o que mudou (patch diffing) e automatizando análise.

**Material original.** Referências abertas listadas ao final.


## Pré-requisitos

| Área | Nível exigido |
|---|---|
| Programação | Lógica, funções, ponteiros (mesmo que enferrujado) |
| Linux | Terminal, permissões, pipes |
| Sistemas | Processos, memória, stack — nível conceitual |
| Base numérica | Binário e hexadecimal sem susto |

Se ponteiros te assustam, faça o Módulo 2 com calma — ele existe justamente para isso.


## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | Arquitetura e o mapa da máquina | Como o x86-64 organiza memória, registradores e instruções | 3 |
| 2 | Memória, stack e convenções de chamada | O que ninguém te explicou sobre ponteiros e stack frames | 3 |
| 3 | Assembly na prática | Escrever, montar e depurar programa em assembly puro | 4 |
| 4 | O compilador como tradutor | C → assembly: padrões, otimizações e o que eles escondem | 3 |
| 5 | Ferramentas de análise | `objdump`, `readelf`, `nm`, `strings`, `gdb`, Ghidra | 3 |
| 6 | Engenharia reversa aplicada | Reconstruir lógica de função desconhecida | 4 |
| 7 | Análise de malware e ofuscação | Reconhecer técnicas sem executar o binário | 2 |
| 8 | Patch diffing e automação | Comparar versões, scriptar análise | 2 |

Cada módulo: teoria → demonstração comentada → lab → avaliação. ~60% prática.


## ⚠ Ética e limites

Engenharia reversa é legal em muitos contextos e proibida em outros. Antes de reverter qualquer
binário que não seja seu:

- **Licença de software:** muitos EULAs proíbem engenharia reversa. Isso é restrição contratual,
  não criminal — mas ainda é vinculante.
- **Análise de malware:** legítima e importante. Faça em ambiente isolado, sem rede, em VM
  descartável. Nunca execute amostra desconhecida na sua máquina de trabalho.
- **Circumvenção de proteção:** quebrar DRM ou medida técnica de proteção tem tratamento
  específico na lei em várias jurisdições — inclusive no Brasil.
- **Dados de terceiros:** se o binário processa dado pessoal, a LGPD se aplica ao que você
  extrair dele.

Os labs deste curso são todos com código-fonte próprio. Você tem autorização por definição.


## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (8) | 55% | Capacidade de analisar, não de lembrar |
| Questões objetivas | 20% | Compreensão de mecanismo |
| Projeto final (análise completa) | 25% | Integração de tudo |

Nota mínima sugerida: 70%.
