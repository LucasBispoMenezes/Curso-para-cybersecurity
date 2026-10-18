# C para Pesquisa de Segurança: Memória, Bug e Comportamento Indefinido

**Ementa do curso · 32 horas · 11 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **C** | Escreve função, usa `if` e `for` | Escreve parser que resiste a entrada hostil |
| **Memória** | Sabe o que é variável | Desenha o layout byte a byte e prevê a corrupção |
| **Bug** | Não sabe o que é UB | Reconhece a classe, a causa e o antídoto |
| **Ferramenta** | `gcc` e `printf` | `clang`, sanitizer, `gdb`, `valgrind`, fuzzer |
| **Mentalidade** | "funcionou, está certo" | "funcionou **neste** caso, e por quê" |

**Pré-requisito duro:** saber programar em **qualquer** linguagem (lógica, função, laço, variável).
**Não** exige C prévio — o módulo 1 começa do zero.

---

## Por que este curso existe

Três cursos deste material — **assembly e RE**, **malware**, **fuzzing** — declaram C como
pré-requisito duro. Nenhum ensina. Você trava no mesmo lugar em três cursos diferentes.

⚠ **E há um segundo motivo, mais importante:** quase todo curso de C ensina a **escrever** C.
Nenhum ensina a **entender por que o C quebra**. Este curso ensina a escrever C sabendo onde ele
vai falhar — que é a habilidade de quem pesquisa vulnerabilidade.

| Curso de C comum | Este curso |
|---|---|
| Sintaxe, ponteiro, struct | Os mesmos, **mais** o que acontece na memória |
| "Não faça isso" | "Isso é UB, e o compilador pode fazer **qualquer coisa**" |
| Testa com entrada normal | Testa com **entrada hostil** |
| Não fala de sanitizer | `ASan`, `UBSan`, `valgrind` desde o módulo 3 |
| Não fala de compilador | `-O0` vs. `-O2` **mudando o comportamento** |
| Não fala de fuzzing | O alvo dos módulos 8–11 é **fuzzável** |

⚠ **A tese do curso:** em C, "o programa funcionou" não é prova de nada. O curso inteiro é sobre
**descobrir por que funcionou** — e o que aconteceria se a entrada fosse outra.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Explicar o modelo de memória de C: objeto, ponteiro, `sizeof`, alinhamento, duração de vida.
2. Distinguir **comportamento definido, não especificado e indefinido** — e as consequências.
3. Reconhecer as sete classes de bug de C por **leitura do código**, antes de rodar.
4. Instrumentar com `ASan`, `UBSan` e `valgrind`, e **ler** o diagnóstico.
5. Prever quando `-O2` muda o comportamento, e por quê.
6. Escrever código que valida entrada em **todos** os limites.
7. Reconhecer overflow inteiro, use-after-free e corrupção de pilha no código.
8. Construir um parser que sobrevive a entrada hostil.
9. Escrever `Makefile` com flags de hardening.
10. Produzir alvo fuzzável, pronto para o curso de fuzzing.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | C do zero com olhar de memória | Compilar, tipos, `printf`, função, laço | 3 |
| 2 | Ponteiro, array e o modelo de memória | O que ponteiro **é**; `sizeof`; alinhamento | 4 |
| 3 | Alocação dinâmica e duração de vida | `malloc`, `free`, stack vs. heap, `static` | 3 |
| 4 | String, buffer e o limite ausente | `strcpy`, `memcpy`, `snprintf`; por que C quebra | 3 |
| 5 | Comportamento indefinido — a parte que ninguém ensina | UB, sequência de avaliação, otimização, `-O2` | 4 |
| 6 | As sete classes de bug em C | Stack/heap overflow, UAF, integer, type, formato, nulo | 4 |
| 7 | Ferramentas: sanitizer, `gdb`, `valgrind` | Instrumentar, ler diagnóstico, depurar | 3 |
| 8 | Struct, union, enum e layout real | Padding, ordem, `union` como truque de exploração | 2 |
| 9 | Arquivo, binário e parsing | Ler arquivo, validar formato, tratar erro | 2 |
| 10 | Escrever C que resiste a entrada hostil | Padrão de validação, contrato de posse, hardening | 2 |
| 11 | Projeto: parser resistente e fuzzável | O alvo que o curso de fuzzing usa | 2 |

Cada módulo: teoria → **demonstração com saída real** → lab → avaliação. ~65% prática.

---

## ⚠ Nota de propósito

Este curso ensina C **para pesquisa defensiva**. O bug é provocado **no seu próprio código**, na
sua máquina, com alvo que você escreveu.

| Este curso faz | **Não** faz |
|---|---|
| Bug no seu código, para você entender | Bug em código de terceiro |
| Ler o diagnóstico do sanitizer | Armar exploit |
| Escrever parser que resiste | Atacar parser alheio |
| Código UB para ver o efeito | Código UB para evadir detecção |

⚠ **Todo alvo é seu.** O curso inteiro roda em `~/c-lab/`.

---

## O laboratório

```bash
sudo apt update
sudo apt install -y build-essential clang llvm gdb valgrind \
                    make binutils file xxd python3
```

```bash
mkdir -p ~/c-lab/{src,bin,tmp} && cd ~/c-lab
```

Verificação:

```bash
gcc --version | head -1
clang --version | head -1
valgrind --version
gdb --version | head -1
```

⚠ **Os três compiladores importam.** `gcc` e `clang` divergem em UB — e o módulo 5 explora
exatamente essa diferença. `valgrind` é o quarto detector, mais lento e mais profundo que o ASan.

---

## Flags que você vai usar o curso inteiro

| Uso | Flags |
|---|---|
| **Desenvolvimento** | `-g -O0 -Wall -Wextra` |
| **Instrumentado** | `-g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer` |
| **Otimizado** | `-g -O2 -Wall -Wextra` |
| **Hardened** | `-O2 -D_FORTIFY_SOURCE=2 -fstack-protector-strong -fPIE -pie` |
| **Valgrind** | `-g -O0` (**sem** sanitizer — são incompatíveis) |

⚠ **`-Wall -Wextra` desde o módulo 1.** O compilador avisa sobre metade dos bugs deste curso antes
de você rodar. **Ignorar aviso é a decisão que torna o bug possível.**

⚠ **Sanitizer e `valgrind` não convivem.** O módulo 7 explica quando usar cada um.

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (11) | 55% | Código que compila, roda, e você explica |
| Análise de UB (módulo 5) | 15% | Prever o que o compilador faz |
| Diagnóstico de bug (módulo 6) | 15% | Reconhecer classe por leitura |
| Projeto (módulo 11) | 15% | Parser fuzzável, com validação |

**Rubrica central:** você não entrega "compilou". Você entrega **o código**, **a saída**, e **a
explicação** — inclusive quando a explicação é "isto é UB, e o comportamento não é garantido".

---

## Como este curso se conecta aos outros

| Curso | O que ele assume de você |
|---|---|
| **Assembly e RE** | Ponteiro, `sizeof`, alinhamento, struct (módulos 2 e 8) |
| **Malware** | Leitura de código, memória, `malloc`/`free` (módulos 3 e 6) |
| **Fuzzing** | **Tudo**: alvo fuzzável, harness, validação (módulos 4, 9, 10, 11) |
| **Redes** | — |

⚠ **O módulo 11 entrega o alvo que o curso de fuzzing usa.** Ao terminar, você tem um parser que
compila com sanitizer, lê de buffer, e tem validação — os três requisitos de fuzzing.

---

## Referências abertas

- **ISO/IEC 9899** — o padrão C (draft público: `n1570` para C11, `n2310` para C17)
- **"What Every C Programmer Should Know About Undefined Behavior"** — Chris Lattner, LLVM Blog, 3 partes
- **LLVM UB Manual** — https://llvm.org/docs/UndefinedBehavior.html
- **AddressSanitizer** — https://clang.llvm.org/docs/AddressSanitizer.html
- **UndefinedBehaviorSanitizer** — https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html
- **Valgrind Manual** — https://valgrind.org/docs/manual/
- **CERT C Coding Standard** — https://wiki.sei.cmu.edu/confluence/display/c/
- **"The C Programming Language"** — Kernighan & Ritchie
- **"Modern C"** — Jens Gustedt (livre em PDF)
- **"Expert C Programming: Deep C Secrets"** — Peter van der Linden
- **cppreference C** — https://en.cppreference.com/w/c
- **OpenSecurityTraining2 `Vulns1001`/`Vulns1002`** — https://ost2.fyi/
- **GNU C Manual** — https://www.gnu.org/software/gnu-c-manual/

---

*Material didático original. Bug provocado apenas em código próprio, na própria máquina. Nenhum
material que ensine armar exploit ou atacar código de terceiro.*
