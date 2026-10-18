# Análise Diferencial de Patch

Curso de 32 horas, onze módulos. **Do diff ao achado.**

---

## A linha de progressão

| | Módulo 1 | Módulo 11 |
|---|---|---|
| **Diff** | Usa `git diff` | Lê **binário** sem fonte |
| **Patch** | Vê o que mudou | **Infere o invariante** |
| **Ruído** | Não sabe separar | **Sinal vs. ruído por fluxo de controle** |
| **CVE** | Lê o resumo | **Reproduz o bug** |
| **Ferramenta** | Nenhuma | `Ghidra`, `BinDiff`, `DiffRays` |
| **Variant** | Mesmo arquivo | **Ecossistema → 0-day** |
| **Resultado** | "o patch corrige X" | **O 1-day reproduzido** |

**Pré-requisito duro:** **Pesquisa em Segurança** (módulos 3, 4, 7) + **Assembly e RE**.

---

## A tese

⚠ **O patch é a documentação mais honesta de um bug. E o diff de binário é a única leitura quando
não há fonte.**

⚠ **A evidência de que funciona, e ela é medida:**

| Trabalho | Resultado |
|---|---|
| **Patch Diffing In The Dark** | Método completo, com Ghidra, sobre CVE real |
| **DiffRays** | `AutoDiff`: dado o CVE, baixa e diffa |
| **PLocator** (2025) | Localiza o **código do patch** |
| **EnBinDiff** (2023) | ⚠ **20 1-days, falso negativo 11% → 1,63%** |
| **1dFuzz** (2023) | Fuzzing dirigido: **2,26× mais, 43% menos tempo** |

**O caminho existe, e está medido.**

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [Por que o diff é a fonte mais honesta](modulo-01.md) | 2 | O método, e o ganho |
| 2 | [Ambiente e proveniência do build](modulo-02.md) | 3 | Um par legível — não um diff de ruído |
| 3 | [Diff de fonte](modulo-03.md) | 3 | O invariante, em três níveis |
| 4 | [Diff de binário — manual](modulo-04.md) | 4 | `Ghidra`, Version Tracking, o processo |
| 5 | [**Sinal e ruído**](modulo-05.md) | 3 | O critério que separa 400 funções em 3 |
| 6 | [As ferramentas](modulo-06.md) | 3 | `BinDiff`, `Ghidriff`, `DiffRays` |
| 7 | [**Localizar o código do patch**](modulo-07.md) | 3 | O critério de localização |
| 8 | [**Reproduzir o 1-day**](modulo-08.md) | 4 | PoC em alvo próprio |
| 9 | [Silent patch](modulo-09.md) | 3 | Caça sistemática, sem CVE |
| 10 | [Variante por ecossistema](modulo-10.md) | 2 | De 1-day a **0-day** |
| 11 | [Projeto](modulo-11.md) | 2 | **Do CVE ao achado** |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## O critério central: sinal vs. ruído

⚠ **O problema prático do diff de binário.** Um patch de segurança toca **3 funções relevantes** —
e o diff mostra **400 alteradas**, porque **build diferente gera ruído**.

```
SINAL (mudança de segurança)          RUÍDO (mudança de build)
┌────────────────────────────┐        ┌────────────────────────────┐
│ um `if` acrescentado       │        │ endereço diferente         │
│ comparação com limite      │        │ registrador diferente      │
│ verificação de tipo        │        │ otimização diferente       │
│ mudança de tipo            │        │ inline / desinlined        │
│ retorno de erro novo       │        │ ordem de seções            │
│ ordem de operações         │        │ strings movidas            │
└────────────────────────────┘        └────────────────────────────┘

⚠ a heurística: mudança de CONTROLE DE FLUXO é sinal.
   mudança de FORMA (mesmo fluxo, instruções diferentes) é ruído.
```

⚠ **E a proveniência do build é o pré-requisito.** *"Compiler/build differences can create enormous
noise, so exact build provenance matters."* **Sem o mesmo compilador e as mesmas flags, o diff é
inútil.**

---

## As quatro ferramentas

| Ferramenta | O que faz | Quando |
|---|---|---|
| **Ghidra + Version Tracking** | Diff manual, com entendimento | ⚠ **Primeiro — sempre** |
| **BinDiff** | Diff estrutural | Windows, largo uso |
| **Ghidriff** | Ghidra automatizado | Volume |
| **DiffRays** | `AutoDiff` por CVE | ⚠ **Quando você só tem o CVE** |

⚠ **Comece pelo livre e manual.** **Sem entender o processo, a saída da ferramenta não diz nada** —
e você não consegue separar o sinal do ruído.

---

## ⚠ Nota de propósito

⚠ **Este é o curso mais próximo de "produzir arma"** — porque **a saída dele é um 1-day funcional.**

| Você faz | Você **não** faz |
|---|---|
| Diff de **binário público** | Diff de binário de cliente sem autorização |
| Reprodução em **alvo próprio ou CTF** | Reprodução em sistema de terceiro |
| **Reporta** ao mantenedor | Publica antes da correção |
| Caça silent patch em **projeto aberto** | Testa instância em produção |
| Escreve o 1-day para **entender** | Usa o 1-day contra alguém |

⚠ **A linha temporal:** **analisar no dia da divulgação é método legítimo — é o que faz a defesa.**
**Usar o 1-day antes de a correção ser aplicada é o crime.** **A técnica é a mesma; o destino é que
muda.**

⚠ **Art. 154-A e 266.** Exploit funcional contra alvo real é **crime consumado**.

---

## O laboratório

```bash
sudo apt update && sudo apt install -y gcc gdb git curl jq binutils
pip3 install pwntools ropper
mkdir -p ~/patch-lab/{alvos,diffs,ferramentas,caderno}
```

⚠ **A pasta `alvos/` guarda os PARES** — versão N-1 e N, **do mesmo fornecedor**. É a proveniência
do módulo 2.

---

## Como isso conecta

| Curso | Ligação |
|---|---|
| **Pesquisa em Segurança** | Pré-requisito — os módulos 3, 4 e 7 |
| **Assembly e RE** | Ler o descompilado |
| **Exploit Development** | A primitiva do 1-day |
| **Fuzzing** | O `1dFuzz` — dirigido pela posição |
| **Linux para Segurança** | Kernel diff |

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **Método** | 1 semana | 1–2 |
| **Leitura** | 3 semanas | 3–6 |
| **Reprodução** | 2 semanas | 7–8 |
| **Achado** | 2 semanas | 9–11 |

⚠ **Estimativa a 10 h/semana.** O módulo 5 costuma levar mais — **separar sinal de ruído em 400
funções é a habilidade central**, e ela se forma com repetição.
