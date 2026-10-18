# Detecção e Evasão

Curso de 34 horas, onze módulos. **O jogo, dos dois lados.**

---

## A linha de progressão

| | Módulo 1 | Módulo 11 |
|---|---|---|
| **Assinatura** | um regex | ⚠ **com taxa medida** |
| **Evasão** | "codifica o payload" | ⚠ **o que o parser vê** |
| **Telemetria** | liga o log | ⚠ **modela o que falta** |
| **Falso positivo** | reclama | ⚠ **mede e orça** |
| **Resultado** | "bloqueei" | ⚠ **detecção medida** |

**Pré-requisito duro:** **Pesquisa em Segurança** (módulos 5 e 6) + **Parser Differentials**
(módulo 3) + ter feito **algum** curso ofensivo.

---

## A tese

⚠ **Detecção não é "escrever a regra que pega o ataque".** **É decidir o que vale a pena ver** — **e
conviver com o custo de errar.**

⚠ **E o que liga este curso ao anterior:**

| Trabalho | Número |
|---|---|
| **WAFFLED** | ⚠ **120+ exploits contra 5 WAFs** |
| Fuzzing de WAFs | Dezenas de bypasses por produto |
| Prática de SIEM | ⚠ **Taxa de FP > 90%** |

⚠ **Não é que o WAF seja ruim.** **É que ele compara **uma** forma e o backend **processa outra** —
**e nenhuma regra corrige isso.**

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [O jogo](modulo-01.md) | 2 | O modelo, quem vê o quê |
| 2 | [A superfície de detecção](modulo-02.md) | 3 | ⚠ **Onde se pode ver** |
| 3 | [**Assinatura, comportamento, anomalia**](modulo-03.md) | 4 | ⚠ **As três famílias** |
| 4 | [**A normalização e o elo fraco**](modulo-04.md) | 4 | ⚠ **Onde tudo falha** |
| 5 | [Telemetria e o que falta](modulo-05.md) | 3 | O que logar — e o custo |
| 6 | [**Falso positivo e o orçamento**](modulo-06.md) | 3 | ⚠ **Medir, não reclamar** |
| 7 | [O perfil do atacante](modulo-07.md) | 3 | Do TTP à hipótese |
| 8 | [**O ciclo purple**](modulo-08.md) | 4 | ⚠ **A regra que não apodrece** |
| 9 | [Evasão: as famílias](modulo-09.md) | 4 | O que cada uma explora |
| 10 | [O detector que discorda](modulo-10.md) | 2 | O lado de dentro |
| 11 | [Projeto](modulo-11.md) | 2 | **A regra medida** |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## O critério central: o que o alerta custa

⚠ **O módulo 6 formaliza. E é a linha do curso:**

| A regra | Verdadeiro + | Falso + | ⚠ Custo |
|---|---|---|---|
| Pega tudo | ✓ | ⚠⚠ **Milhares** | ⚠ **O time desliga** |
| Pega nada | ⚠ Zero | ✓ Zero | ⚠ **Não protege** |
| ⚠ **Medida** | ✓ | ✓ **Orçado** | ✓ **Sobrevive** |

⚠ **A primeira linha é o fracasso mais comum da área** — **e ele não parece fracasso: parece
diligência.**

---

## O elo fraco

```
┌──────────────────────────────────────────────────────────────────────┐
│ O ATACANTE MANDA                                                     │
│   %253Cscript%253E                                                    │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ O WAF NORMALIZA                                      ⚠ UMA VEZ        │
│   → vê: %3Cscript%3E                                                 │
│   → compara com a assinatura "<script"   ⚠ NÃO CASA                   │
│   → ✓ DEIXA PASSAR                                                    │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ O BACKEND NORMALIZA                                  ⚠ DUAS VEZES    │
│   → vê: <script>                                                     │
│   → ⚠ E EXECUTA                                                       │
└──────────────────────────────────────────────────────────────────────┘

⚠ a regra está CERTA. a normalização é que discorda.
✓ e nenhuma assinatura corrige isso.
```

---

## ⚠ Nota de propósito

| Você faz | Você **não** faz |
|---|---|
| Regras no **seu** lab | ⚠ Testar WAF de terceiro |
| Mede a própria taxa de FP | Publica bypass de produto vivo |
| Testa a regra **contra o próprio ataque** | ⚠ Treina evasão para atacar |
| **Reporta** a falha | ⚠ Vende a evasão |
| Sobe o atacante no lab | ⚠ Aponta o atacante para fora |

⚠ **A tentação específica:** **este curso ensina evasão, e evasão é dual-use.** **A linha é o
destino:** **você a escreve para medir a detecção, e a declara como tal.**

⚠ **Art. 154-A e 266.** **E a evasão, quando usada, é o meio — não atenua a pena.**

---

## O laboratório

```bash
sudo apt install -y suricata zeek python3 python3-pip git curl jq
pip3 install requests pyyaml
mkdir -p ~/detect-lab/{regras,ataque,telemetria,medicoes,caderno}
```

⚠ **`ataque/` guarda o atacante do curso anterior** — **o seu, em 127.0.0.1.** **E o sensor é seu.**

---

## Como isso conecta

| Curso | Ligação |
|---|---|
| **HTTP Smuggling** | ⚠ **O módulo 10 dele é metade deste** |
| **Parser Differentials** | ⚠ Pré-requisito — módulo 3 |
| **Patch Diffing** | O que o patch de detecção mudou |
| **Fuzzing** | O corpus e a medição |

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **O modelo** | 1 semana | 1–2 |
| **As famílias** | 2 semanas | 3–4 |
| **Telemetria e o custo** | 1 semana | 5–6 |
| **O ciclo** | 2 semanas | 7–8 |
| **Evasão e projeto** | 2 semanas | 9–11 |

⚠ **Estimativa a 10 h/semana.** O **módulo 6** costuma surpreender: **medir o próprio falso positivo
é desconfortável** — **e é o que separa a regra que sobrevive da que o time desliga.**
