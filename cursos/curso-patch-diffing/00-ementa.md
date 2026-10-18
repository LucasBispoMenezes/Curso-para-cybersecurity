---
title: "Analise Diferencial de Patch: Do Diff ao Achado"
nivel: especialista
tags: [patch, diff, binario, 1-day, variant, ghidra]
---title: Analise Diferencial de Patch: Do Diff ao Achado
nivel: especialista
tags: [patch, diff, binario, 1-day, variant, ghidra]
---# Análise Diferencial de Patch: Do Diff ao Achado

**Ementa do curso · 32 horas · 11 módulos · PT-BR com termos técnicos em inglês**


## Por que este curso existe

⚠ **A afirmação que organiza o curso:**

> **O patch é a documentação mais honesta de um bug — e o diff de binário é a sua única leitura
> quando não há fonte.**

⚠ **E o motivo de ele ser um curso inteiro, e não um módulo:**

| O que o módulo 3 do curso de Pesquisa ensinou | O que este curso acrescenta |
|---|---|
| Os três níveis de leitura | ⚠ **O nível de BINÁRIO**, sem fonte |
| O que é sinal e o que é ruído | ⚠ **Como separar quando o diff tem 400 funções** |
| A variante por ecossistema | ⚠ **A busca sistemática em N projetos** |
| O conceito de silent patch | ⚠ **A caça sistemática, com ferramenta** |

⚠ **E a evidência de que a área está ativa e é produtiva:**

| Trabalho | O que fez | Resultado |
|---|---|---|
| **Patch Diffing In The Dark** | Curso livre sobre diff de CVE real | ⚠ **Método completo, com Ghidra** |
| **DiffRays** | Modo `AutoDiff`: dado o CVE, baixa e diffa | **Automatiza o passo que trava** |
| **PLocator** (2025) | Localiza o **código do patch** | Patch + 2 referências → localização |
| **EnBinDiff** (2023) | Foco em patch **data-only** | ⚠ **20 1-days, falso negativo 11% → 1,63%** |
| **1dFuzz** (2023) | Fuzzing dirigido pela posição | **2,26× mais, 43% menos tempo** |
| **Ghidriff** | Diff de binário automatizado | Ghidra com menos cliques |

⚠ **A tese:** **o patch deixa rastro. E o rastro é localizável, comparável, e — o mais importante —
reproduzível.** **Você não precisa de sorte; precisa de método.**

⚠ **E o rendimento é conhecido:** o `EnBinDiff` achou **20 1-days reais** com a técnica.
**O caminho existe, e está medido.**


## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Montar o **ambiente de diff** — com proveniência de build correta.
2. Ler um diff de **fonte** e inferir o invariante (curso de Pesquisa, módulo 3).
3. Ler um diff de **binário** — com `Ghidra`, `BinDiff`, `DiffRays`.
4. **Separar sinal de ruído** quando o diff tem centenas de funções.
5. **Localizar o código do patch** — a técnica do `PLocator`.
6. Reproduzir o bug numa versão vulnerável, **em alvo próprio**.
7. Caçar **silent patch** sistematicamente.
8. Encontrar a **variante por ecossistema** — o caminho para o 0-day.
9. Usar **fuzzing dirigido** pela posição do patch.
10. Reportar o achado **sem publicar antes da correção**.


## O laboratório

```bash
sudo apt update
sudo apt install -y gcc gdb python3 python3-pip git curl jq file binutils \
                    ghidra 2>/dev/null || true
pip3 install pwntools ropper
```

| Ferramenta | Papel | Licença |
|---|---|---|
| **Ghidra** | SRE, Version Tracking | Livre |
| **BinDiff** | Diff de binário (Windows, Linux) | Gratuito (Google) |
| **Ghidriff** | Ghidra automatizado | Livre |
| **DiffRays** | `AutoDiff` por CVE | Livre |
| **Diaphora** | Diff no IDA | Livre |
| **pwntools** | Reprodução | Livre |

⚠ **O curso usa `Ghidra` como base** — porque é livre, e **porque o Version Tracking dele é o que
ensina o processo.** **As outras automatizam — e você não deve automatizar antes de entender.**

```bash
# Ghidra (se o apt não tiver)
# baixe de: https://ghidra-sre.org/
mkdir -p ~/patch-lab/{alvos,diffs,ferramentas,caderno} && cd ~/patch-lab
```

⚠ **A pasta `alvos/` guarda os pares de binários** — versão N-1 e N, **do mesmo fornecedor**.
**É a proveniência que o módulo 2 exige.**


## Como este curso se conecta

| Curso | Ligação |
|---|---|
| **Pesquisa em Segurança** | Pré-requisito direto — os módulos 3, 4 e 7 |
| **Assembly e RE** | Ler o disassembly e o descompilado |
| **Exploit Development** | A primitiva, quando o 1-day exige |
| **Fuzzing** | O `1dFuzz` — fuzzing dirigido pela posição do patch |
| **Linux para Segurança** | Kernel diff, e a config que o 1-day explora |
| **C para Segurança** | A classe do bug |

⚠ **Este curso é o módulo 3 do Pesquisa, levado ao osso.** E ele **alimenta o Exploit** — porque
**um 1-day reproduzido é material de exploit.**


*Material didático original, de propósito defensivo e de pesquisa. Diff de binário público, e
reprodução apenas em alvo próprio, CTF publicado, ou com autorização escrita. O achado é reportado
ao mantenedor — nunca usado contra sistema de terceiro.*
