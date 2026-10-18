# Fuzzing e Pesquisa de Vulnerabilidades: do Zero ao Achado Reproduzível

**Ementa do curso · 40 horas · 12 módulos · PT-BR com termos técnicos em inglês**

---

## Sobre o que é este curso

Este curso ensina a **encontrar vulnerabilidade em software**, com método, e a **provar o achado**
de forma reproduzível. Ele parte de um princípio: fuzzing não é apertar botão — é engenharia de
entrada, de instrumentação e de triagem.

A pergunta que organiza tudo:

> **Por que o fuzzer não achou aquele bug — e o que muda quando eu entendo o motivo?**

⚠ **O curso é sobre achar e corrigir, não sobre armar exploit.** Você vai aprender a classificar
o crash, entender a causa raiz, escrever o reporte e provar o impacto. O passo de transformar o
crash em controle de execução é específico de alvo e não se ensina em abstrato — e não está aqui.

**Material original.** Referências abertas ao final.

---

## Público-alvo

- Desenvolvedores que querem fuzzing no próprio projeto, e não sabem por onde começar.
- Profissionais de segurança que usam ferramenta e não entendem o limite dela.
- Pesquisadores iniciantes que querem produzir achado reproduzível.
- Quem quer entrar em OSS-Fuzz, bug bounty ou programa de divulgação responsável.
- Estudantes de sistemas que querem ver memória corromper de verdade.

**Não é** para quem nunca programou. **C e linha de comando são pré-requisito duro.**

---

## Pré-requisitos

| Área | Nível exigido |
|---|---|
| **C** | Ponteiro, alocação dinâmica, `struct`, aritmética de ponteiro |
| Linux | Terminal, compilação, `gdb` básico, `apt` |
| Assembly | **Leitura** de x86-64 — o curso de assembly deste material cobre |
| Rede | Noções de TCP/HTTP para o módulo de protocolo |
| Sistema | Processo, memória virtual, pilha, heap |

**Teste de nivelamento:**

```c
char buf[8];
strcpy(buf, "isso tem mais de oito bytes");
```

Você explica o que acontece na memória, byte a byte, e por quê? Se não, faça o módulo 1 com
calma — ele existe para isso.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Explicar por que um programa corrompe memória, em nível de byte.
2. Instrumentar um alvo com sanitizer e **interpretar o relatório** que ele produz.
3. Escrever harness de fuzzing que exercita o alvo corretamente.
4. Construir corpus e dicionário que decidem o resultado da campanha.
5. Rodar AFL++ e libFuzzer em modo produtivo, com paralelismo.
6. Fazer fuzzing de protocolo com estado, mantendo sessão válida.
7. Triagem e deduplicar centenas de crashes por causa raiz.
8. Minimizar entrada com `afl-tmin` e explicar por que a minimalidade importa.
9. Reconstruir a causa raiz de um crash no depurador.
10. Escrever patch, teste de regressão e hardening.
11. Aplicar fuzzing *structure-aware* onde o fuzzer genérico falha.
12. Escrever reporte de vulnerabilidade que é aceito.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | Memória, corrupção e o que é um crash | Byte por byte; por que existe bug | 3 |
| 2 | Ambiente e sanitizers | ASan, UBSan, TSan, LSan; build instrumentado | 3 |
| 3 | Anatomia de um bug | Stack overflow, heap overflow, UAF, integer overflow, type confusion | 4 |
| 4 | Harness: a peça que decide tudo | `LLVMFuzzerTestOneInput`, estado, entrada em memória | 4 |
| 5 | Corpus, semente e dicionário | A parte que a maioria faz mal | 3 |
| 6 | AFL++ na prática | Instrumentação, modos, paralelismo, persistent mode | 4 |
| 7 | libFuzzer e integração contínua | In-process, OSS-Fuzz, estrutura de projeto | 3 |
| 8 | Fuzzing de protocolo e estado | `boofuzz`, sessão válida, máquina de estado | 3 |
| 9 | Triagem: de 500 crashes a 4 bugs | Deduplicação, agrupamento, severidade | 4 |
| 10 | Minimização e reprodução | `afl-tmin`, caso mínimo, reprodutibilidade | 3 |
| 11 | Causa raiz no depurador | `gdb`, ASan, rastrear até a origem | 3 |
| 12 | Do achado ao reporte | Patch, regressão, hardening, reporte aceito | 3 |

Cada módulo: teoria → demonstração em alvo próprio → lab → avaliação. ~60% prática.

---

## O laboratório

Todo alvo é **seu**: você compila, você fuzza, você acha. Sem exceção.

```
┌────────────────────────────────────────────────────────────┐
│              SUA VM LINUX (isolada, snapshot antes)         │
│                                                             │
│  alvos/          alvos com bug deliberado, compilados       │
│  harnesses/      harness de cada alvo                       │
│  corpus/         entradas semente                           │
│  findings/       crashes encontrados                        │
│  triagem/        deduplicado, minimizado, classificado      │
└────────────────────────────────────────────────────────────┘
```

⚠ **A regra que não tem exceção:** você fuzza **o que você compilou**. Nada de apontar o fuzzer
para software de terceiro na sua máquina, nada de campanha contra alvo que não é seu.

⚠ **Fuzzing consome recurso.** Um fuzzer rodando contra um serviço de terceiro é negação de
serviço, mesmo sem intenção. O curso inteiro roda em `localhost`.

---

## Ambiente

```bash
sudo apt update
sudo apt install -y build-essential clang llvm lld gdb \
                    afl++ afl++-doc python3 python3-pip \
                    valgrind strace file binutils \
                    libprotobuf-dev protobuf-compiler \
                    cmake ninja-build git curl
pip3 install boofuzz
```

| Ferramenta | Papel no curso |
|---|---|
| `clang` + sanitizers | Build instrumentado — o coração do módulo 2 |
| `afl++` | Fuzzer principal (módulos 6, 9, 10) |
| `libFuzzer` | Fuzzer in-process (módulo 7) |
| `gdb` | Causa raiz (módulo 11) |
| `boofuzz` | Fuzzing de protocolo com estado (módulo 8) |
| `libprotobuf-mutator` | Fuzzing *structure-aware* (módulo 12) |

Verificação:

```bash
clang --version
afl-fuzz --version
afl-clang-fast --version
gdb --version | head -1
python3 -c "import boofuzz; print('boofuzz ok')"
```

⚠ **Se o `afl-clang-fast` não estiver presente**, o AFL++ não foi instalado com os compiladores
instrumentados. Reinstale com `afl++` completo — sem ele, metade do curso não funciona.

---

## Estrutura do curso em quatro etapas

O curso segue a trilha validada na pesquisa:

| Etapa | Módulos | Você termina com |
|---|---|---|
| **1 — Fundamentos** | 1–3 | Um alvo com bug próprio, e você sabe explicar a corrupção |
| **2 — Ferramentas** | 4–7 | Campanha rodando, crash encontrado, reporte do ASan entendido |
| **3 — Pesquisa** | 8–10 | Fuzzer de protocolo, triagem de 500 crashes, entrada mínima |
| **4 — Original** | 11–12 | Causa raiz reconstruída, patch, regressão, reporte |

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (12) | 50% | Alvo fuzzado, crash encontrado, evidência anexada |
| Relatório de triagem (módulo 9) | 20% | De N crashes a M bugs, com método |
| Causa raiz (módulo 11) | 15% | Explicação correta, no nível do código |
| Reporte final (módulo 12) | 15% | Aceito pelo critério de qualidade |

**Rubrica central:** você não entrega "rodei o fuzzer". Você entrega **o alvo**, **o harness**,
**a entrada que quebra**, **o relatório do sanitizer** e **a explicação da causa**.

---

## ⚠ Nota de propósito e conduta

| Este curso faz | Este curso **não** faz |
|---|---|
| Fuzzing em alvo que você compilou | Fuzzing em software de terceiro |
| Análise de causa raiz e priorização | Cálculo de offset, controle de EIP, exploit |
| Reporte e divulgação responsável | Uso do achado para atacar |
| Patch e teste de regressão | — |

⚠ **A linha, e ela é técnica:** encontrar a vulnerabilidade e **entender** por que ela dá controle
é necessário para priorizar. **Armar o exploit** é passo seguinte, específico de alvo, e não está
no material. Quem reporta melhor que outro é quem entende a severidade — e é isso que o curso
ensina.

⚠ **Divulgação responsável é parte do conteúdo, não apêndice.** O módulo 12 traz o procedimento:
reportar ao mantenedor, respeitar prazo, e publicar depois do patch.

---

## Referências abertas

- **Fuzzing101** — https://github.com/antonio-morales/Fuzzing101 — 10 exercícios, 10 CVEs
- **libFuzzer Tutorial** (Google) — https://github.com/google/fuzzing/blob/master/tutorial/libFuzzerTutorial.md
- **libFuzzer documentation** — https://llvm.org/docs/LibFuzzer.html
- **AFL++ "Fuzzing in Depth"** — https://aflplus.plus/docs/fuzzing_in_depth
- **AFL++ binary-only targets** — https://aflplus.plus/docs/fuzzing_binary-only_targets/
- **AddressSanitizer** — https://clang.llvm.org/docs/AddressSanitizer.html
- **OSS-Fuzz** — https://github.com/google/oss-fuzz
- **libprotobuf-mutator** — https://github.com/google/libprotobuf-mutator
- **Structure-Aware Fuzzing with libFuzzer** — https://github.com/google/fuzzing/blob/master/docs/structure-aware-fuzzing.md
- **AFLSmart** — https://arxiv.org/pdf/1811.09447.pdf
- **OpenSecurityTraining2 `Vulns1001`/`Vulns1002`** — https://ost2.fyi/
- **pwn.college — Program Security, System Security** — https://pwn.college/dojos
- **Project Zero — Root Cause Analyses** — https://googleprojectzero.github.io/0days-in-the-wild/rca.html
- **strlcpy/strcpy pitfalls**, *"The C Programming Language"* — contexto
- **ISO 27037** — preservação de evidência

---

*Material didático original, de propósito defensivo e de pesquisa. Todo alvo é compilado pelo
aluno. Nenhum material que ensine armar exploit ou atacar alvo de terceiro.*
