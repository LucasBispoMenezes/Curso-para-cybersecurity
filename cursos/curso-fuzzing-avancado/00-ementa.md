---
title: "Fuzzing Avancado: Dirigido, Estrutural e Diferencial"
nivel: especialista
tags: [fuzzing, diferencial, corpus, gramatica, cobertura, triagem]
---# Fuzzing Avançado: Dirigido, Estrutural e Diferencial

**Ementa do curso · 36 horas · 12 módulos · PT-BR com termos técnicos em inglês**


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


*Material didático original, de propósito defensivo e de pesquisa. O alvo é código próprio ou
aberto, compilado e instrumentado no laboratório. Nenhuma entrada é enviada a serviço de terceiro. O
crash é reportado ao mantenedor — nunca usado contra sistema alheio. Fuzzing contra infraestrutura
de terceiro é crime (art. 154-A e 266).*
