# Fuzzing Avançado

Curso de 36 horas, doze módulos. **Dirigido, estrutural e diferencial.**

---

## A linha de progressão

| | Módulo 1 | Módulo 12 |
|---|---|---|
| **Fuzzing** | roda o fuzzer | ⚠ **dirige o fuzzer** |
| **Corpus** | sementes aleatórias | ⚠ **de fronteira, com mapa** |
| **Sinal** | crash | ⚠ **diferencial ou invariante** |
| **Cobertura** | "aumentou" | ⚠ **medida e usada como guia** |
| **Resultado** | "achei um crash" | ⚠ **o achado triado** |

**Pré-requisito duro:** **Parser Differentials** (5 e 6) + **C para Pesquisa** (harness) + **Pesquisa
em Segurança** (módulo 7).

---

## A tese

⚠ **Fuzzing não é mandar entradas aleatórias e esperar.** **É escolher onde olhar, e construir a
entrada que chega lá** — **e a parte difícil é a segunda.**

⚠ **E o que os cursos anteriores deixaram montado:**

| Curso | O que ele deu |
|---|---|
| **C para Pesquisa** | O harness e os sanitizers |
| **Parser Differentials** | O corpus de fronteira e o comparador |
| **HTTP Smuggling** | O espaço de variantes |
| **Patch Diffing** | O `1dFuzz` |
| ⚠ **Detecção e Evasão** | ⚠ **O orçamento** |

⚠ **O fuzzer é a parte fácil.** **O trabalho é o corpus, o harness, o oráculo e a triagem.**

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [O que o fuzzing é, e o que não é](modulo-01.md) | 2 | O modelo, e o gargalo |
| 2 | [Escolher o alvo](modulo-02.md) | 3 | ⚠ **Onde vale a pena** |
| 3 | [**O harness**](modulo-03.md) | 4 | In-process, com oráculo |
| 4 | [Cobertura e o guia](modulo-04.md) | 3 | ⚠ **Usar, não exibir** |
| 5 | [**O corpus de fronteira**](modulo-05.md) | 3 | Um caso por campo, com mapa |
| 6 | [**Fuzzing estrutural**](modulo-06.md) | 4 | ⚠ **Gramática e invariantes** |
| 7 | [**O oráculo**](modulo-07.md) | 3 | ⚠ **Onde o sinal nasce** |
| 8 | [Dirigido: o `1dFuzz`](modulo-08.md) | 4 | ⚠ **A posição do patch** |
| 9 | [Snapshot e kernel](modulo-09.md) | 3 | O que a mutação não alcança |
| 10 | [**Triagem**](modulo-10.md) | 3 | ⚠ **Distinguir bug de ruído** |
| 11 | [O rendimento](modulo-11.md) | 2 | Medir, não acumular |
| 12 | [Projeto](modulo-12.md) | 2 | **Do fuzz ao reporte** |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## O gargalo não é o fuzzer

```
┌──────────────────────────────────────────────────────────────────────┐
│ O QUE TODO MUNDO FAZ                                                 │
│   instala o AFL++  →  roda por 24h  →  ⚠ "não achou nada"             │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ O QUE O CURSO FAZ                                                    │
│                                                                      │
│   1. ESCOLHER o alvo        ⚠ onde vale a pena, não onde é fácil      │
│   2. O HARNESS              ⚠ o ponto de entrada que o fuzzer usa      │
│   3. O CORPUS               ⚠ de FRONTEIRA, um caso por campo          │
│   4. O ORÁCULO              ⚠ o que É um bug — crash? diff? invariante?│
│   5. A TRIAGEM              ⚠ o que NÃO é bug                          │
│                                                                      │
│   ⚠ e o fuzzer roda no 3, no 4 e no 5.                                │
│      sem eles, ele muta bytes que não chegam ao código.               │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **A segunda linha do primeiro bloco é o fracasso típico** — **e ele não é do fuzzer.**

---

## O corpus de fronteira — herdado

| Valor | Por quê |
|---|---|
| 0 | O caso vazio |
| 1 | O caso mínimo |
| limite − 1 | A fronteira |
| **limite** | ⚠ O limite |
| ⚠ **limite + 1** | ⚠ **Off-by-one** |
| máximo do tipo | ⚠ **Overflow** |

⚠ **Não é aleatório.** **Um caso por CAMPO, e o mapa diz qual.**

---

## O oráculo — onde o sinal nasce

| Oráculo | O sinal | ⚠ Quando |
|---|---|---|
| **Crash** | Segfault, abort, sanitizer | ⚠ O mais simples |
| **Diferencial** | ⚠ **Duas implementações discordam** | ⚠ **O do Parser Differentials** |
| **Invariante** | ⚠ **Uma propriedade foi violada** | ⚠ **O mais poderoso** |
| Timeout | Não terminou | ⚠ Alto FP |
| Alocação | Memória explodiu | Médio |

⚠ **O invariante é o mais poderoso** — e o mais difícil de escrever. **E é o que o `1dFuzz`
formaliza** ao dirigir o fuzzer até a posição do patch.

---

## ⚠ Nota de propósito

| Você faz | Você **não** faz |
|---|---|
| Fuzza **código seu**, ou aberto, no lab | ⚠ Fuzza serviço de terceiro |
| Reporta o crash | Publica antes da correção |
| Roda N cores **na sua máquina** | ⚠ Roda contra alvo remoto |
| Constrói o harness | ⚠ Manda o fuzz ao WAF de alguém |
| Mede o rendimento | ⚠ Acumula crashes sem triar |

⚠ **A tentação específica:** **fuzzar uma coisa que responde na rede é fácil** — **e é o que o curso
não faz.** **O fuzzer manda milhares de entradas por segundo, e o efeito é indistinguível de um
ataque.**

⚠ **Art. 154-A e 266.** **E o fuzzing agrava: o volume é, por si, uma interrupção.**

---

## O laboratório

```bash
sudo apt install -y clang llvm gcc gdb python3 python3-pip git afl++ libfuzzer-14-dev cargo
pip3 install pwntools
mkdir -p ~/fuzz-lab/{alvos,harness,corpus,crashes,triagem,caderno}
```

⚠ **`alvos/`** o binário · **`harness/`** o ponto de entrada · **`corpus/`** as sementes ·
**`crashes/`** os achados · **`triagem/`** ⚠ **onde o trabalho acontece.**

---

## Como isso conecta

| Curso | Ligação |
|---|---|
| **Parser Differentials** | ⚠ Pré-requisito — o corpus e o diferencial |
| **C para Pesquisa** | ⚠ Pré-requisito — o harness |
| **Patch Diffing** | O `1dFuzz` — módulo 8 |
| **Detecção e Evasão** | ⚠ O orçamento — medir, não acumular |

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **O modelo** | 1 semana | 1–2 |
| **Harness e corpus** | 2 semanas | 3–5 |
| **Estrutural e oráculo** | 2 semanas | 6–7 |
| **Dirigido e triagem** | 3 semanas | 8–10 |
| **Rendimento e projeto** | 1 semana | 11–12 |

⚠ **Estimativa a 10 h/semana.** O **módulo 10** costuma surpreender: **a triagem é onde a maioria
dos "achados" morre** — **e é o que separa o relatório crível do ruído.**
