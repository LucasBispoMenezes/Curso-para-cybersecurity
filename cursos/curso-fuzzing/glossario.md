# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| AFL++ | AFL++ | M6 | Fuzzer coverage-guided com fork server. Modos: `afl-clang-fast`, `-lto`, QEMU. |
| `afl-cmin` | Corpus minimization | M6 | Reduz o corpus mantendo **caminhos distintos**. Obrigatório antes de campanha longa. |
| `afl-tmin` | Test case minimization | M10 | Reduz a entrada preservando o **caminho/crash**. |
| Alvo | Target | M4 | O programa sendo fuzzado. **Sempre compilado por você.** |
| ASan | AddressSanitizer | M2 | Detecta heap/stack overflow, UAF, double-free. ~2× lento, 3× memória. |
| Assinatura | Signature | M9 | `tipo + pilha normalizada` de um crash. Base da deduplicação. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Beacon | — | — | Não usado neste curso (ver curso de APT/C2). |
| `boofuzz` | boofuzz | M8 | Framework de fuzzing de protocolo com geração estruturada e máquina de estado. |
| Buffer overflow | Buffer overflow | M1 | Escrita além do limite de um bloco. Stack, heap ou global. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Canário | Stack canary | M1 | Valor entre o buffer e o endereço de retorno. Detecta transbordo de stack. |
| Causa raiz | Root cause | M11 | A **verificação ausente**. Diferente do sintoma. |
| CFISan | Control Flow Integrity Sanitizer | M3 | Detecta type confusion. Exige `-flto` e visibilidade controlada. |
| Corpus | Corpus | M5 | Conjunto de entradas semente. **Decide o resultado da campanha.** |
| Crash flaky | Flaky crash | M10 | Crash que não reproduz sempre. **Não é reportável.** |
| Curadoria | Corpus curation | M5 | Merge e poda do corpus. Feito **depois** da campanha. |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Deduplicação | Deduplication | M9 | Reduzir N crashes a M bugs. Por **pilha normalizada**, não por endereço. |
| Dicionário | Dictionary | M5 | Tokens que o fuzzer injeta. Resolve o `magic`, não o checksum. |
| `double-free` | Double free | M3 | Liberar duas vezes. Corrompe o alocador. Severidade crítica. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Estado residual | Residual state | M4 | Estado global não reinicializado entre chamadas. Causa crash não reproduzível. |
| `exec/s` | Executions per second | M6 | **A métrica que você otimiza.** 1.000 (fork) a 500.000 (in-process). |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Fork server | Fork server | M6 | Processo pai que faz `fork` por entrada, sem `exec`. ~5.000–20.000 exec/s. |
| `-fstack-protector` | Stack protector | M1 / M12 | Ativa o canário. Desativado no módulo 1 para **ver** a corrupção. |
| Fuzzing | Fuzzing | M1 | Alimentar o alvo com entrada inesperada e observar o resultado. |
| Fuzzing contínuo | Continuous fuzzing | M7 | Campanha permanente (OSS-Fuzz, CI). **Acumulativo** pelo corpus. |

## G

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Grammar-based | Grammar-based fuzzing | M12 | Geração a partir de gramática do formato. Para estrutura aninhada. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Hardening | Hardening | M12 | Flags de build que **reduzem a classe** do bug (`_FORTIFY_SOURCE`, `-fPIE`, RELRO). |
| Harness | Harness | M4 | A função que o fuzzer chama. **O gargalo em 8 de 10 casos.** |
| Heap overflow | Heap buffer overflow | M3 | Escrita além do bloco alocado. A classe mais frequente em parser. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| In-process | In-process fuzzing | M7 | libFuzzer: sem `fork`. 50.000–500.000 exec/s. Morre se o alvo morre. |
| Integer overflow | Integer overflow | M3 | Aritmética estoura o tipo. **Via de acesso** para heap overflow. |
| Instrumentação | Instrumentation | M6 | Marcação de blocos básicos na compilação. Sem ela, mutação aleatória. |

## K

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `ktest-gen` | ktest generation | M12 | Converte corpus do AFL em `.ktest` para KLEE. **A ponte fuzzing↔simbólica.** |
| KLEE | KLEE | M12 | VM simbólica sobre LLVM IR. Workshop internacional a cada 2 anos. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| libFuzzer | libFuzzer | M7 | Fuzzer in-process do LLVM. O padrão do OSS-Fuzz. |
| `libprotobuf-mutator` | LPM | M12 | Fuzzing *structure-aware* via protobuf. Para formato estruturado. |
| LSan | LeakSanitizer | M2 | Detecta vazamento. Incluído no ASan. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `magic` | Magic bytes | M5 | Assinatura no início do arquivo. **Resolvido por dicionário.** |
| Minimização | Minimization | M10 | Reduzir a entrada **preservando a propriedade** (mesmo bug). |

## O

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| OSS-Fuzz | OSS-Fuzz | M7 | Serviço do Google de fuzzing contínuo para projeto aberto. Gratuito. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Persistent mode | Persistent mode | M6 | Processo não morre entre entradas. Ganho de **10×–50×**. |
| Pilha normalizada | Normalized stack | M9 | `função@arquivo:linha`, sem endereço. **Base da deduplicação.** |
| PoC | Proof of Concept | M9 | Entrada que **reproduz** o crash. Não é exploit. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Reprogramação | — | — | Não usado neste curso. |
| Regressão | Regression test | M12 | Teste que **falha no código com bug** e **passa no corrigido**. |
| `rip` | Instruction pointer | M11 | Endereço da instrução da falha. Mais preciso que o número de linha. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Sanitizer | Sanitizer | M2 | ASan, UBSan, TSan, LSan. Transforma corrupção silenciosa em falha diagnosticada. |
| Semente | Seed | M5 | Entrada inicial do corpus. **Colocar perto do bug é a técnica mais eficaz.** |
| Sintoma | Symptom | M11 | **Onde o acesso ilegal aconteceu.** Diferente da causa. |
| `stability` | Stability | M6 | Campo do AFL++ que mede reprodutibilidade da cobertura. `< 95%` = problema. |
| Structure-aware | Structure-aware fuzzing | M12 | Harness que mantém campo consistente (tamanho, checksum). |
| Symbolic execution | Symbolic execution | M12 | Resolve a validação que o fuzzer não atravessa. Ponte via `ktest-gen`. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Type confusion | Type confusion | M3 | Objeto de tipo A tratado como B. Crítica — dá controle de vtable. |
| Triagem | Triage | M9 | Reduzir N crashes a M bugs, com severidade por critério. |
| TSan | ThreadSanitizer | M2 | Detecta race condition. **Mutuamente exclusivo com ASan.** |

## U

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| UBSan | UndefinedBehaviorSanitizer | M2 | Pega integer overflow, shift inválido. **Pega o primeiro erro que o ASan não vê.** |
| UF | — | — | Não usado neste curso. |
| Use-after-free | Use-after-free (UAF) | M3 | Usa memória já liberada. **A classe mais perigosa.** |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Vazamento | Memory leak | M2 | Memória alocada e não liberada. Severidade baixa, mas quebra persistent mode. |
| Verificação ausente | Missing check | M11 | **A causa raiz.** A comparação que deveria existir. |

## W

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `watchpoint` | Watchpoint | M11 | Dispara quando o valor muda. Responde "**quando** isso mudou". |

---

## As cinco classes de bug — consulta rápida

| Classe | ASan detecta | UBSan detecta | Severidade típica |
|---|---|---|---|
| Stack buffer overflow | ✓ `stack-buffer-overflow` | — | **Alta** |
| Heap buffer overflow | ✓ `heap-buffer-overflow` | — | **Alta** |
| Use-after-free | ✓ `heap-use-after-free` | — | **Crítica** |
| Integer overflow | ✗ | **✓** | Média (isolado) · Alta (com overflow) |
| Type confusion | Parcial | — | **Crítica** (CFISan) |

⚠ **UBSan e ASan são complementares.** Ligue os dois: `-fsanitize=address,undefined`.

---

## Flags de compilação — consulta rápida

| Uso | Flags |
|---|---|
| Referência | `-g -O1 -no-pie` |
| **Padrão do curso** | `-g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer` |
| Hardened | `+ -fstack-protector-all -D_FORTIFY_SOURCE=2 -fPIE` |
| libFuzzer | `-g -O1 -fsanitize=fuzzer,address,undefined -fno-omit-frame-pointer` |
| AFL++ | `AFL_USE_ASAN=1 AFL_USE_UBSAN=1 afl-clang-fast -g -O1 -fno-omit-frame-pointer` |
| C++ com CFI | `-fsanitize=cfi -flto -fvisibility=hidden` |

⚠ **`-g` sempre.** Sem símbolo, o módulo 11 não funciona.
⚠ **`-fno-omit-frame-pointer` sempre.** Sem ele, o backtrace do `gdb` vira `??`.

---

## Onde estão os três pontos — consulta rápida

| Ponto | Onde aparece | Como ver |
|---|---|---|
| **Causa** | A verificação ausente | Comparar `#0` com `allocated by` |
| **Sintoma** | O acesso ilegal | Campo `#0` do ASan |
| **Crash** | Onde o programa morre | `bt` do `gdb`, ou o sinal |

⚠ **Corrigir o sintoma não resolve.** A correção vai na causa.

---

## Os cinco erros de harness — consulta rápida

| # | Erro | Sintoma |
|---|---|---|
| 1 | Não chama o alvo | Cobertura zero desde `INITED` |
| 2 | Ignora parte da entrada | Cobertura estagna baixo |
| 3 | **Estado não reinicializado** | Crash não reproduz; `stability` < 100% |
| 4 | Vaza por chamada | OOM em minutos (pior em persistent) |
| 5 | Lento (I/O por chamada) | `exec/s` < 500 |

---

## Os cinco pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **Quando o fuzzer não acha, o harness tem a culpa em 8 de 10 casos.** |
| 2 | **O corpus decide o resultado** — semente perto do bug é a técnica mais eficaz. |
| 3 | **Sintoma não é causa.** Corrigir onde morreu não resolve. |
| 4 | **Relatório de triagem sem "o que não foi triado" é incompleto.** |
| 5 | **A distinção entre "DoS" e "potencial de controle" é o que faz o reporte valer.** |

---

## O que o curso não ensina — explícito

| Não ensina | Por quê |
|---|---|
| Cálculo de offset | Específico de alvo, não se ensina em abstrato |
| Controle de EIP | Idem |
| ROP chain | Idem |
| Bypass de mitigação | Idem |
| Armar exploit funcional | Passo seguinte, específico do alvo |

⚠ **Saber distinguir "crash de DoS" de "crash com potencial de controle" é o limite — e é o que
faz um reporte ser priorizado.**

---

*Material didático original, de propósito defensivo e de pesquisa.*
