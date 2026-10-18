# Assembly x86-64 e Engenharia Reversa: do Zero ao Avançado

**Ementa do curso · 24 horas · 8 módulos · PT-BR com termos técnicos em inglês**

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

---

## Público-alvo

- Desenvolvedores que querem entender o que o compilador faz com o código que escrevem.
- Profissionais de segurança entrando em análise de malware ou pesquisa de vulnerabilidade.
- Estudantes de sistemas operacionais que querem ver a teoria acontecer.
- Curiosos persistentes que já tentaram ler assembly e desistiram na terceira linha.

**Não é** para quem está começando em programação do zero. Você precisa saber programar em
alguma linguagem — C é o ideal, mas Python ou Go servem como base.

---

## Pré-requisitos

| Área | Nível exigido |
|---|---|
| Programação | Lógica, funções, ponteiros (mesmo que enferrujado) |
| Linux | Terminal, permissões, pipes |
| Sistemas | Processos, memória, stack — nível conceitual |
| Base numérica | Binário e hexadecimal sem susto |

Se ponteiros te assustam, faça o Módulo 2 com calma — ele existe justamente para isso.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Escrever e compilar assembly x86-64 funcional a partir do zero.
2. Explicar o modelo de memória e o papel de cada registrador na ABI System V.
3. Converter código C em assembly mentalmente, prevendo o que o compilador vai gerar.
4. Ler disassembly de função desconhecida e reconstruir sua lógica em pseudocódigo.
5. Identificar loops, condicionais, chamadas de função e estruturas de dados em assembly.
6. Reconhecer padrões de código malicioso sem executá-lo.
7. Comparar duas versões de um binário e isolar o que mudou.
8. Automatizar análise com ferramentas de script.

---

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

---

## Ambiente de laboratório

Uma VM Linux (Debian 12, Ubuntu 22.04+, ou Kali) com:

```bash
sudo apt update
sudo apt install -y build-essential gcc gdb nasm binutils \
                    file strace ltrace python3 python3-pip
# Ghidra: baixe em https://ghidra-sre.org/ (requer JDK 17+)
```

Todos os binários analisados são **compilados por você** ou **amostras didáticas** escritas
para o curso. Nenhum malware real é usado.

---

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

---

## Referências abertas

- **Intel 64 and IA-32 Architectures Software Developer's Manual** — a referência final
- **AMD64 Architecture Programmer's Manual**
- **System V Application Binary Interface, AMD64 Architecture Processor Supplement**
- **GNU Binutils Documentation** — https://sourceware.org/binutils/docs/
- **GDB Documentation** — https://sourceware.org/gdb/documentation/
- **NASM Manual** — https://www.nasm.us/doc/
- **Ghidra Documentation** — https://ghidra-sre.org/
- **"Reverse Engineering for Beginners", Dennis Yurichev** — livre para download
- **MITRE ATT&CK** — https://attack.mitre.org/

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (8) | 55% | Capacidade de analisar, não de lembrar |
| Questões objetivas | 20% | Compreensão de mecanismo |
| Projeto final (análise completa) | 25% | Integração de tudo |

Nota mínima sugerida: 70%.

---

*Material didático original. Nenhum trecho reproduzido de obra comercial protegida.*
