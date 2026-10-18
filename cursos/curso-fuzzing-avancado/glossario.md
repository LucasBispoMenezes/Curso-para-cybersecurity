# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Ação** | Action | M3 | ⚠ O que o sistema **faz** — o invariante sob evasão. |
| **Alcance** | Reach | M9 | ⚠ "Chegar ao código" — e **muda por alvo**. |
| **Alvo** | Target | M2 | ⚠ Onde vale a pena olhar. |
| **Aninhamento** | Nesting | M4 | ⚠ O delimitador **dentro de si mesmo**. |
| **Aresta** | Edge | M4 | A **transição** entre blocos. Cobertura melhor que a de blocos. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Barreira de comparação** | Comparison barrier | M4 | ⚠ `if (x == MAGIC)` — a porta fechada. |
| **Bug de lógica** | Logic bug | M2 | ⚠ Não crasha. Exige diferencial ou invariante. |
| **Bug do harness** | — | M10 | ⚠ O traço **começa** no harness. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Campanha** | Campaign | M1 | ⚠ Custa **zero** horas de analista. |
| **Cobertura** | Coverage | M4 | ⚠ Mecanismo, não métrica. Guia a seleção. |
| **Corpus** | Corpus | M5 | ⚠ **O mapa que você dá ao fuzzer.** |
| **Crash** | Crash | M7 | ⚠ **O oráculo mais fraco.** |
| **Crash puro** | — | M7 | Sem sanitizer: pega ~30% dos bugs de memória, ~0% dos de lógica. |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Delimitador** | Delimiter | M4 | O separador de campo. ⚠ A forma inválida é evasão. |
| **Dedup** | Deduplication | M10 | ⚠ Por **traço** — não por hash da entrada. |
| **Desync** | Desync | M8 | Os parsers com estados divergentes. |
| **Determinismo** | Determinism | M6 | ⚠ A mesma entrada, a mesma saída. Invariante universal. |
| **Dicionário** | Dictionary | M4 | ⚠ Os tokens que o fuzzer não descobriria. |
| **Diferencial** | Differential | M7 | ⚠ Oráculo: duas implementações discordam. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Exec/s** | Executions per second | M4 | ⚠ A velocidade — e ela é **do harness**. |
| **Estrutural** | Structural | M6 | Geração que **respeita o formato**. |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Falso crash** | False crash | M3 | ⚠ `abort()` no erro esperado. O harness **inventa**. |
| **Fragmentação** | Fragmentation | M8 | A evasão que divide entre camadas. |
| **Fronteira** | Boundary | M5 | ⚠ O limite de um campo. **Onde o bug mora.** |
| **Fuzzing cego** | Blind fuzzing | M8 | ⚠ Explora tudo com o mesmo esforço. |

## G

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Ganho marginal** | Marginal gain | M8 | ⚠ Δ = 0 por 2+ voltas → mude de família. |
| **Gramática** | Grammar | M6 | ⚠ A descrição do formato. Gera entrada **válida**. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Harness** | Harness | M3 | ⚠ **Tradutor, não porteiro.** |
| **`honggfuzz`** | honggfuzz | M1 | Alternativa ao AFL++ e LibFuzzer. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **In-process** | In-process | M3 | ⚠ O processo vive; o fuzzer chama a função. 50.000+ exec/s. |
| **Invariante** | Invariant | M7 | ⚠ O oráculo mais amplo. Não precisa de referência. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **LibFuzzer** | LibFuzzer | M3 | ⚠ `LLVMFuzzerTestOneInput` — a forma canônica. |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Mapa** | Map | M5 | ⚠ Liga semente a ramo. **Manutenção.** |
| **Minimização** | Minimization | M10 | ⚠ A entrada **mínima** que reproduz. |
| **Mutação** | Mutation | M1 | ⚠ **A única parte que o fuzzer resolve.** |

## O

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Oráculo** | Oracle | M7 | ⚠ **Decide o que é bug.** O maior ganho disponível. |
| **Oss-Fuzz** | OSS-Fuzz | M1 | Fuzzing contínuo. Milhares de bugs em código aberto. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Partida** | Startup | M9 | ⚠ O custo de **levantar o ambiente**. |
| **Platô** | Plateau | M4 | ⚠ Cobertura que satura. Diagnóstico, não nota. |
| **Por processo** | Fork mode | M9 | ⚠ O fuzzer cria o processo a cada entrada. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Ramo** | Branch / Path | M5 | Onde o alvo decide. ⚠ A semente o **exercita**. |
| **Rendimento** | Yield | M11 | ⚠ **Bugs triados / hora de ANALISTA.** |
| **Reproducer** | Reproducer | M10 | ⚠ **É o achado.** Sem ele, é anedota. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Sanitizer** | Sanitizer | M7 | ⚠ O oráculo **mínimo** aceitável. |
| **Semente** | Seed | M5 | ⚠ Válida **até a fronteira** — nem mais, nem menos. |
| **Semente de sessão** | Session seed | M9 | ⚠ O estado pré-construído. Snapshot em escala menor. |
| **Snapshot** | Snapshot | M9 | ⚠ Congela o estado e o restaura a cada execução. |
| **Splice** | Splice | M6 | ⚠ Cruza duas sementes. Produz lixo com campo de tamanho. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **TCS** | Trailing Call Sequence | M8 | ⚠ A distância até a função do patch. |
| **Timeout** | Timeout | M7 | ⚠ Bug **quando o custo não acompanha o tamanho**. |
| **Traço** | Stack trace | M10 | ⚠ **O agrupamento correto.** |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Válida até a fronteira** | — | M5 | ⚠ O critério da semente boa. |

## X

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **`1dFuzz`** | 1dFuzz | M8 | ⚠ Fuzzing **dirigido** pela posição do patch. 2,26× mais, 43% menos tempo. |

---

## Os cinco elementos — consulta rápida

| # | Elemento | Vem pronto? |
|---|---|---|
| 1 | O alvo | ⚠ **Você escolhe** |
| 2 | O harness | ⚠⚠ **Você escreve** |
| 3 | O corpus | ⚠⚠ **Você constrói** |
| 4 | A mutação | ✓ **O fuzzer faz** |
| 5 | O oráculo | ⚠⚠ **Você define** |

⚠ **Três dos cinco são seus.** **É por isso que isto é um curso.**

---

## Os cinco oráculos — consulta rápida

| # | Oráculo | Detecta | Força |
|---|---|---|---|
| 1 | Crash | Segfault | ⚠ **O mais fraco** |
| 2 | Sanitizer | Memória, UB | ⚠ Mínimo |
| 3 | Timeout | Travamento | ⚠ Alto FP |
| 4 | ⚠ Diferencial | Discordância | Lógica |
| 5 | ⚠⚠ Invariante | Propriedade violada | ⚠⚠ **O mais amplo** |

| Oráculo | Memória | Lógica |
|---|---|---|
| Crash puro | ~30% | ⚠ ~0% |
| Sanitizer | ~95% | ⚠ ~0% |
| ⚠ Invariante | ~95% | ⚠⚠ Alto |

---

## Os quatro invariantes universais — consulta rápida

| # | Invariante | Vale para |
|---|---|---|
| 1 | Não lê além de `size` | Qualquer parser |
| 2 | Não escreve além do destino | Qualquer |
| 3 | Retorno num conjunto conhecido | Qualquer |
| 4 | ⚠ A saída é função da entrada | ⚠ **Determinismo** |

⚠ **Vale para QUALQUER parser** — e não sabem nada do seu formato.

---

## Os valores de fronteira — consulta rápida

| Valor | Por quê |
|---|---|
| 0 | Vazio |
| 1 | Mínimo |
| limite − 1 | A fronteira |
| limite | O limite exato |
| ⚠ **limite + 1** | ⚠ **A violação** |
| máximo do tipo | Overflow |

⚠ **O valor mais interessante é onde DUAS fronteiras se cruzam.**

---

## O que torna alvo fértil — consulta rápida

| # | Característica |
|---|---|
| 1 | Entrada **estruturada** |
| 2 | Já **teve bugs** |
| 3 | Complexidade alta |
| 4 | Código **antigo, sem fuzzing** |
| 5 | Sem sanitizer no CI |

⚠ **Um alvo estéril por crash pode ser fértil por diferencial.**

---

## Erros de harness — consulta rápida

| Erro | ⚠ Sintoma |
|---|---|
| ⚠ **Valida antes de passar** | ⚠ Cobertura baixa, nada achado |
| ⚠ **Aborta em erro esperado** | ⚠ **Falsos crashes** |
| Inicializa a cada chamada | ⚠ Execuções lentas |
| Não libera estado | OOM falso |
| Chama só a função "segura" | Metade do código inalcançável |

⚠ **O harness é um TRADUTOR, não um porteiro.**

---

## A triagem — consulta rápida

| Estágio | Quantidade |
|---|---|
| Crashes brutos | ⚠ 200 |
| Após dedup por entrada | 60 |
| ⚠ Após dedup por **traço** | ⚠⚠ **3 a 8** |
| Após triagem | ⚠ **1 a 3** |

**As três perguntas:**

| # | Pergunta |
|---|---|
| 1 | O traço é do **alvo**? |
| 2 | O alvo **decidiu** isso? |
| 3 | Já foi **corrigido**? |

⚠ **Crash não é bug; traço é.**

---

## Quando parar — consulta rápida

| # | Critério | Ação |
|---|---|---|
| 1 | Rendimento caiu | Mudar de eixo |
| 2 | Triagem estourou | **Parar até triar** |
| 3 | Alvo saturado | Trocar de alvo |
| 4 | ⚠ **Achou o bug** | ⚠ **Encerrar e documentar** |

⚠ **Continuar depois do achado **enterra** o bug num monte de crashes que ninguém vai olhar.**

---

## Os quatro eixos — consulta rápida

| Eixo | Retorno | Horas |
|---|---|---|
| ⚠⚠ **Oráculo** | ⚠⚠ 10× mais bugs | 8 |
| ⚠ **Triagem automática** | 5× mais rápido | 6 |
| Corpus | 3× de cobertura | 4 |
| CPU | 1,2× de crashes | ⚠ **0 de analista** |

⚠ **Ordem de investimento: oráculo → triagem → corpus → CPU.**

---

## O rendimento — consulta rápida

| Componente | O que é |
|---|---|
| **Numerador** | ⚠ Bugs **triados** |
| ⚠ **Denominador** | ⚠ **Horas de ANALISTA** |
| **Não entra** | ⚠ Horas de CPU |

| Etapa | Horas típicas |
|---|---|
| Harness | 8 |
| ⚠ **Triar** | ⚠⚠ **16** |
| ⚠ **Rodar** | ⚠ **0** |

⚠ **A campanha é gratuita; o julgamento não.**

---

## Os sete pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **O fuzzer é a parte fácil** — o trabalho é o resto. |
| 2 | **CPU é alugável; julgamento não.** |
| 3 | **A assinatura envelhece; a gramática não.** |
| 4 | **Crash não é bug; traço é.** |
| 5 | **O reproducer é o achado.** |
| 6 | **O rendimento é bugs por hora de analista.** |
| 7 | **Antes de adicionar um núcleo, pergunte o que vai triar.** |

---

## Onde parar — a linha do curso

| Faz | **Não** faz |
|---|---|
| Fuzza **seu** código, ou aberto, no lab | ⚠ Fuzza serviço de terceiro |
| Roda N cores **na sua máquina** | ⚠ Roda contra alvo remoto |
| **Reporta** com reproducer | ⚠ Publica antes da correção |
| Minimiza a entrada | ⚠ Abre issue com entrada de 4 KB |
| Mede o rendimento | ⚠ Reporta horas como resultado |

⚠ **A linha específica:** **o fuzzer manda **milhares** de entradas por segundo.** **Contra terceiro,
isso é indistinguível de ataque** — **e o volume é, por si, uma interrupção.**

⚠ **Art. 154-A e 266.**

---

*Material didático original, de propósito defensivo e de pesquisa. O alvo é código próprio ou
aberto, compilado e instrumentado no laboratório. Nenhuma entrada é enviada a serviço de terceiro. O
crash é reportado ao mantenedor — nunca usado contra sistema alheio. Fuzzing contra infraestrutura
de terceiro é crime (art. 154-A e 266).*
