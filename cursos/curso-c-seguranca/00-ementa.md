---
title: "C para Pesquisa de Seguranca: Memoria, Bug e Comportamento Indefinido"
nivel: intermediario
tags: [c, memoria, ub, sanitizer, ponteiro, corrupcao]
---title: C para Pesquisa de Seguranca: Memoria, Bug e Comportamento Indefinido
nivel: basico
tags: [c, memoria, ub, sanitizer, ponteiro, corrupcao]

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


## Como este curso se conecta aos outros

| Curso | O que ele assume de você |
|---|---|
| **Assembly e RE** | Ponteiro, `sizeof`, alinhamento, struct (módulos 2 e 8) |
| **Malware** | Leitura de código, memória, `malloc`/`free` (módulos 3 e 6) |
| **Fuzzing** | **Tudo**: alvo fuzzável, harness, validação (módulos 4, 9, 10, 11) |
| **Redes** | — |

⚠ **O módulo 11 entrega o alvo que o curso de fuzzing usa.** Ao terminar, você tem um parser que
compila com sanitizer, lê de buffer, e tem validação — os três requisitos de fuzzing.


*Material didático original. Bug provocado apenas em código próprio, na própria máquina. Nenhum
material que ensine armar exploit ou atacar código de terceiro.*
