# Análise Diferencial de Patch: Do Diff ao Achado

**Ementa do curso · 32 horas · 11 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Diff** | Usa `git diff` | Lê **binário** sem fonte, e acha o que mudou |
| **Patch** | Vê o que mudou | **Infere o invariante** e o padrão |
| **Ruído** | Não sabe separar | Reconhece **sinal de ruído** por fluxo de controle |
| **CVE** | Lê o resumo | **Reproduz o bug** a partir do diff |
| **Ferramenta** | Não conhece nenhuma | `Ghidra`, `BinDiff`, `Ghidriff`, `DiffRays` |
| **Variant** | Procura no mesmo arquivo | Procura no **ecossistema**, e acha 0-day |
| **Timing** | Analisa o patch depois | Analisa **no dia da divulgação**, com método |
| **Resultado** | "o patch corrige X" | **O 1-day reproduzido, ou o 0-day** |

**Pré-requisito duro:** curso de **Pesquisa em Segurança** (módulos 3, 4 e 7) · curso de **Assembly
e RE** · curso de **Exploit Development** (para entender a primitiva).

⚠ **Sem o de Pesquisa, você não tem o método.** **Sem o de Assembly, você não lê o diff de binário.**

---

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

---

## ⚠ Nota de propósito e conduta

⚠ **Este curso é o mais próximo de "produzir arma" do material** — porque **a saída dele é um
1-day funcional.** E **um 1-day é utilizável contra qualquer sistema não corrigido.**

| Este curso faz | **Não** faz |
|---|---|
| Diff de **binário público** | Diff de binário de cliente sem autorização |
| Reprodução em **alvo próprio ou CTF** | Reprodução em sistema de terceiro |
| **Reporta** o achado ao mantenedor | Publica antes da correção |
| Caça silent patch em **projeto aberto** | Testa instância em produção |
| Escreve o 1-day para **entender** | Usa o 1-day contra alguém |
| Fuzzing dirigido no **seu lab** | Fuzzing contra serviço alheio |

⚠ **A regra que vale o curso inteiro:**

> **Você baixa o binário público, diffa na sua máquina, e reproduz no SEU alvo.** **O achado vai
> para o mantenedor — não para o sistema de ninguém.**

⚠ **E a linha temporal importa.** **Analisar um patch no dia da divulgação é método legítimo** —
**é o que faz a defesa.** **Usar o 1-day para atacar antes de a correção ser aplicada é o crime.**
**A técnica é a mesma; o que muda é onde ela vai.**

⚠ **No Brasil:** art. 154-A (acesso indevido) e art. 266 (interrupção). **Exploit funcional contra
alvo real é crime consumado** — a execução já é o acesso.

---

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

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | Por que o diff é a fonte mais honesta | O método, e o que se ganha | 2 |
| 2 | O ambiente, e a proveniência do build | O que torna o diff legível | 3 |
| 3 | Diff de fonte | `git diff`, três níveis, invariante | 3 |
| 4 | Diff de binário — manual | `Ghidra`, Version Tracking, leitura | 4 |
| 5 | Sinal e ruído | Separar o que importa quando tem 400 funções | 3 |
| 6 | As ferramentas — `BinDiff`, `Ghidriff`, `DiffRays` | Automatizar sem perder o entendimento | 3 |
| 7 | Localizar o código do patch | `PLocator`, e o critério de localização | 3 |
| 8 | Reproduzir o 1-day | Do diff ao PoC, em alvo próprio | 4 |
| 9 | Silent patch | Caça sistemática, sem CVE como guia | 3 |
| 10 | Variante por ecossistema | De 1-day a 0-day | 2 |
| 11 | Projeto: do CVE ao achado | O entregável completo | 2 |

Cada módulo: teoria → **diff comentado** → lab → avaliação. ~65% prática de leitura.

---

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

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (11) | 50% | Diff lido, achado localizado, evidência |
| Sinal vs. ruído (módulo 5) | 15% | Separação com critério explícito |
| Localização do patch (módulo 7) | 10% | O critério, não a ferramenta |
| Reprodução (módulo 8) | 10% | 1-day reproduzido em alvo próprio |
| Projeto (módulo 11) | 15% | Do CVE ao achado, com caderno |

**Rubrica central:** você não entrega "diffei os binários". Você entrega **o invariante**, **o
código do patch localizado**, **a evidência** — e **o que isso destrava**.

---

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

---

## Referências abertas

- **Patch Diffing In The Dark** — https://github.com/VulnerabilityResearchCentre/patch-diffing-in-the-dark
- **DiffRays** — https://github.com/pwnfuzz/diffrays
- **Ghidriff** — https://github.com/clearbluejar/ghidriff
- **BinDiff** — https://github.com/google/bindiff
- **Diaphora** — https://github.com/joxeankoret/diaphora
- **PLocator** — https://arxiv.org/html/2501.17413v1
- **EnBinDiff** — IEEE TQ 2023
- **1dFuzz** — https://dl.acm.org/doi/10.1145/3597926.3598102
- **"Introduction to Binary Diffing"** — Orange Cyberdefense, parte 1 e 2
- **7 Free and Open Source Tools for Binary Diffing** — Packetlabs, 2025
- **Microsoft Patch Tuesday** — a fonte mensal de pares de binários
- **Project Zero** — o padrão de root cause analysis

---

*Material didático original, de propósito defensivo e de pesquisa. Diff de binário público, e
reprodução apenas em alvo próprio, CTF publicado, ou com autorização escrita. O achado é reportado
ao mantenedor — nunca usado contra sistema de terceiro.*
