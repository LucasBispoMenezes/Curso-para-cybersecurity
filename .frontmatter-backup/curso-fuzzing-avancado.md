---
title: Fuzzing Avancado: Dirigido, Estrutural e Diferencial
nivel: especialista
tags: [fuzzing, diferencial, corpus, gramatica, cobertura, triagem]
---# Fuzzing Avançado: Dirigido, Estrutural e Diferencial

**Ementa do curso · 36 horas · 12 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Fuzzing** | roda o fuzzer | ⚠ **dirige o fuzzer** |
| **Corpus** | sementes aleatórias | ⚠ **de FRONTEIRA, por campo** |
| **Sinal** | crash | ⚠ **diferencial, de comportamento** |
| **Cobertura** | "aumentou" | ⚠ **medida e usada como guia** |
| **Estrutura** | ignora o formato | ⚠ **gramática e invariantes** |
| **Ferramenta** | uma só | ⚠ **o harness próprio, adaptado** |
| **Resultado** | "achei um crash" | ⚠ **o achado com triagem e triplicata** |

**Pré-requisito duro:** curso de **Parser Differentials** (módulos 5 e 6) · curso de **C para
Pesquisa de Segurança** (harness e sanitizers) · **Pesquisa em Segurança** (módulo 7).

⚠ **Sem o de C, você não escreve harness.** **Sem o Parser Differentials, você não tem o
diferencial.**

---

## Por que este curso existe

⚠ **A afirmação que organiza o curso:**

> **Fuzzing não é mandar entradas aleatórias e esperar.** **É escolher **onde** olhar, e construir a
> entrada que chega lá** — **e a parte difícil é a segunda.**

⚠ **E é o que os cursos anteriores deixaram montado, peça por peça:**

| Curso | O que ele deu |
|---|---|
| **C para Pesquisa** | O harness e os sanitizers |
| **Parser Differentials** | O corpus de FRONTEIRA e o comparador |
| **HTTP Smuggling** | O espaço de variantes e o valor da medição |
| **Patch Diffing** | O `1dFuzz` — dirigido pela posição do patch |
| ⚠ **Detecção e Evasão** | ⚠ **O orçamento — medir, não acumular** |

⚠ **A tese:** **o fuzzer é a parte fácil.** **O trabalho é o corpus, o harness, o oráculo e a
triagem** — **e é o que este curso ensina.**

⚠ **E a evidência de que a área continua rendendo, de forma medida:**

| Trabalho | O que fez | Resultado |
|---|---|---|
| **AFL++** | Cobertura, mutação, `MOpt` | O padrão livre atual |
| **LibFuzzer** | In-process, estrutura | O padrão de biblioteca |
| **`1dFuzz`** (2023) | Fuzzing dirigido pela posição do patch | ⚠ **2,26× mais, 43% menos tempo** |
| **Grammar-based fuzzing** | Gramática em vez de bytes | ⚠ Bugs que a mutação não alcança |
| **Snapshot fuzzing** | `Nyx`, `kkAFL` | Kernel e hypervisor |
| ⚠ **Oss-Fuzz** | Fuzzing contínuo | ⚠ **Milhares de bugs em código aberto** |

⚠ **A última linha é o argumento do rendimento.** **O `Oss-Fuzz` não achou um bug — achou dezenas
de milhares** — **porque rodou **onde** valia a pena olhar, e **sempre**.**

⚠ **A tese, reescrita:** **a técnica escala; o gargalo é a escolha do alvo e a qualidade do
oráculo.**

---

## ⚠ Nota de propósito e conduta

| Este curso faz | **Não** faz |
|---|---|
| Fuzza **código seu**, ou aberto, no seu lab | ⚠ Fuzza serviço de terceiro |
| Reporta o crash ao mantenedor | Publica antes da correção |
| Roda **N** cores na sua máquina | ⚠ Roda contra alvo remoto |
| Constrói o harness | ⚠ Manda o fuzz ao WAF de alguém |
| Mede o rendimento | ⚠ Acumula crashes sem triar |

⚠ **A regra que vale o curso inteiro:**

> **O fuzzer roda no SEU processo.** **O alvo é o seu binário, compilado com sanitizer, na sua
> máquina.** **E o crash vai ao mantenedor** — **não a um alvo.**

⚠ **A tentação específica deste curso:** **fuzzar uma coisa que responde na rede é fácil** — **e é o
que o curso **não** faz.** **Fuzzing contra serviço de terceiro é acesso não autorizado com
**volume**:** **o fuzzer manda milhares de entradas por segundo, e o efeito é indistinguível de um
ataque.**

⚠ **A tabela do que é lícito e o que não é, sem ambiguidade:**

| Ato | Lícito? |
|---|---|
| Fuzzar binário seu, local | ✓ |
| Fuzzar projeto aberto, local | ✓ |
| Fuzzar biblioteca no seu processo | ✓ |
| ⚠ Fuzzar serviço de terceiro pela rede | ⚠ **CRIME** |
| ⚠ Fuzzar API pública | ⚠ **CRIME** |
| ⚠ Fuzzar o WAF de alguém | ⚠ **CRIME** |
| Reportar o crash | ✓ |

⚠ **No Brasil:** art. 154-A (acesso indevido) e art. 266 (interrupção). **E o fuzzing agrava:** **o
volume de requisições é, por si, uma interrupção.**

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Escolher o **alvo** por critério — e não por facilidade.
2. Escrever o **harness** — in-process, com sanitizer.
3. Construir o **corpus de fronteira** por campo.
4. Usar **cobertura** como guia — e não como métrica de vaidade.
5. Aplicar **fuzzing estrutural** (gramática e invariantes).
6. Rodar o **diferencial** — o do curso anterior, agora como oráculo.
7. Dirigir o fuzzer pela **posição do patch** (`1dFuzz`).
8. Medir o **rendimento** — o que cada hora produziu.
9. **Triar** o crash — e reconhecer o que não é bug.
10. Reportar com **reproducer, triagem e triplicata**.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | O que o fuzzing é, e o que não é | O modelo, e o gargalo | 2 |
| 2 | Escolher o alvo | ⚠ **Onde vale a pena olhar** | 3 |
| 3 | O harness | In-process, sanitizer, oráculo | 4 |
| 4 | Cobertura e o guia | ⚠ **Usar, não exibir** | 3 |
| 5 | O corpus de fronteira | Herdado do Parser Differentials | 3 |
| 6 | Fuzzing estrutural | ⚠ **Gramática e invariantes** | 4 |
| 7 | O oráculo: crash, diferencial, invariante | ⚠ **Onde o sinal nasce** | 3 |
| 8 | Dirigido: o `1dFuzz` | ⚠ **A posição do patch** | 4 |
| 9 | Snapshot e kernel | O que a mutação não alcança | 3 |
| 10 | Triagem e o que não é bug | ⚠ **O trabalho real** | 3 |
| 11 | O rendimento | Medir, não acumular | 2 |
| 12 | Projeto: do fuzz ao reporte | O entregável | 2 |

Cada módulo: teoria → **harness comentado** → lab → avaliação. ~60% prática de execução e triagem.

---

## O laboratório

```bash
sudo apt update
sudo apt install -y clang llvm gcc gdb python3 python3-pip git \
                    afl++ libfuzzer-14-dev cargo 2>/dev/null || true
pip3 install pwntools
# e o alvo: os parsers do curso de C e do Parser Differentials
```

| Ferramenta | Papel | Licença |
|---|---|---|
| **AFL++** | Fuzzing por cobertura, maduro | Livre |
| **LibFuzzer** | In-process, por biblioteca | Livre |
| **`honggfuzz`** | Alternativa, com análise | Livre |
| **Sanitizers** | ASan, MSan, UBSan | Livre |
| **`cargo-fuzz`** | Rust | Livre |
| **AFLFast / `MOpt`** | ⚠ Modos do AFL++ | Livre |

⚠ **O curso **não** fuzz parte de terceiro pela rede.** **O alvo é um binário seu, ou um projeto
aberto compilado por você** — **e o fuzzer roda no seu processo.**

```bash
mkdir -p ~/fuzz-lab/{alvos,harness,corpus,crashes,triagem,caderno} && cd ~/fuzz-lab
```

⚠ **`alvos/` guarda o binário alvo.** **`harness/` o ponto de entrada.** **`corpus/` as sementes.**
**`crashes/` os achados.** **E a `triagem/` é onde o trabalho de verdade acontece.**

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (12) | 35% | O harness rodando, com execução |
| **O corpus** (módulo 5) | 15% | De fronteira, por campo, com mapa |
| **O oráculo** (módulo 7) | 15% | Diferencial ou invariante |
| **A triagem** (módulo 10) | 20% | ⚠ **Distinguir bug de ruído** |
| Projeto (módulo 12) | 15% | Do fuzz ao reporte |

**Rubrica central:** você não entrega "rodei o fuzzer". Você entrega **o alvo escolhido por
critério**, **o corpus com mapa**, **o oráculo**, **o crash triado** — e **o que não era bug**.

---

## Como este curso se conecta

| Curso | Ligação |
|---|---|
| **Parser Differentials** | ⚠ **Pré-requisito direto** — o corpus e o diferencial |
| **C para Pesquisa** | ⚠ **Pré-requisito** — o harness e os sanitizers |
| **HTTP Smuggling** | O espaço de variantes, como corpus |
| **Patch Diffing** | O `1dFuzz` — o módulo 8 deste |
| **Detecção e Evasão** | ⚠ **O orçamento** — medir, não acumular |
| **Exploit Development** | O que fazer com o crash triado |

⚠ **Este é o curso que fecha a trilha.** **Ele reusa o harness, o corpus e o oráculo dos
anteriores** — **e é o teste de que os seis fizeram sentido.**

---

## Referências abertas

- **AFL++** — https://github.com/AFLplusplus/AFLplusplus
- **LibFuzzer** — https://llvm.org/docs/LibFuzzer.html
- **`honggfuzz`** — https://github.com/google/honggfuzz
- **`1dFuzz`** (2023) — https://dl.acm.org/doi/10.1145/3597926.3598102
- **Nyx / `kkAFL`** — snapshot fuzzing
- **Oss-Fuzz** — https://github.com/google/oss-fuzz
- **"The Fuzzing Book"** — https://www.fuzzingbook.org/
- **Grammar-based fuzzing** — `Nautilus`, `Grammarinator`
- **Google Project Zero** — writeups de fuzzing dirigido
- **ASan / MSan / UBSan** — https://clang.llvm.org/docs/

---

*Material didático original, de propósito defensivo e de pesquisa. O alvo é código próprio ou
aberto, compilado e instrumentado no laboratório. Nenhuma entrada é enviada a serviço de terceiro. O
crash é reportado ao mantenedor — nunca usado contra sistema alheio. Fuzzing contra infraestrutura
de terceiro é crime (art. 154-A e 266).*
