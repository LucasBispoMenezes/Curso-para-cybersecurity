# Detecção e Evasão: O Jogo

**Ementa do curso · 34 horas · 11 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Detecção** | Vê um alerta | ⚠ **Sabe o que o alerta custa** |
| **Assinatura** | Escreve um regex | ⚠ **Sabe onde ela falha** |
| **Evasão** | "codifica o payload" | ⚠ **Entende o que o parser vê** |
| **Telemetria** | Liga o log | ⚠ **Modela o que falta** |
| **Falso positivo** | Reclama | ⚠ **Mede e orça** |
| **Atacante** | Imagina | ⚠ **Perfil com hipótese** |
| **Resultado** | "bloqueei" | ⚠ **Detecção com taxa medida** |

**Pré-requisito duro:** curso de **Pesquisa em Segurança** (módulos 5 e 6) · curso de **Parser
Differentials** (módulo 3) · ter feito **qualquer** dos cursos ofensivos.

⚠ **Sem o de Pesquisa, você não tem o critério.** **Sem ter atacado, você não sabe o que detecta.**

---

## Por que este curso existe

⚠ **A afirmação que organiza o curso:**

> **Detecção não é "escrever a regra que pega o ataque".** **É decidir o que vale a pena ver** — **e
> conviver com o custo de errar.**

⚠ **E a razão de ele ser o último da trilha:** **os cursos anteriores te colocaram do lado do
atacante.** **Aqui você muda de lado** — **e o que muda não é a ferramenta, é o critério.**

⚠ **A tese:**

> **O detector e o atacante olham para os mesmos bytes.** **A diferença é o que cada um consegue
> ver daquele lado do parser.**

⚠ **E a evidência de que a área é difícil, e ela é medida:**

| Trabalho | O que mostrou | Número |
|---|---|---|
| **WAFFLED** | Parser differentials em WAFs | ⚠ **120+ exploits contra 5 WAFs** |
| **Fuzzing de WAFs** | Bypasses triviais | Dezenas por produto |
| **Detection engineering (prática)** | Fadiga de alerta | ⚠ **Taxa de FP > 90% em SIEMs comuns** |
| **Blue Team / Purple Team** | O ciclo | ⚠ **Sem o ciclo, a regra apodrece** |
| ⚠ **O próprio curso anterior** | ⚠ **O WAF é uma camada a mais** | ⚠ **Ele pode CRIAR a divergência** |

⚠ **A última linha é o que liga este curso ao anterior.** **Você passou 32 horas vendo que o WAF
falha por arquitetura** — **e agora vai ver **por que**, do lado de dentro.**

⚠ **A tese, reescrita:** **não é que o WAF seja ruim.** **É que ele compara **uma** forma e o backend
**processa outra** — **e nenhuma regra corrige isso.**

---

## ⚠ Nota de propósito e conduta

⚠ **Este curso é o mais defensivo da trilha — e ainda assim tem uma linha.**

| Este curso faz | **Não** faz |
|---|---|
| Regras no **seu** lab | ⚠ Testar WAF de terceiro |
| Mede a própria taxa de FP | Publica o bypass de produto vivo |
| **Testa a regra contra o próprio ataque** | ⚠ Treina evasion para atacar |
| **Reporta** a falha de detecção | ⚠ Vende a evasão |
| Sobe o atacante no lab | ⚠ Aponta o atacante para fora |

⚠ **A regra que vale o curso inteiro:**

> **O atacante é simulado no SEU lab.** **A regra roda no SEU SIEM.** **E a falha que você encontrar
> vai ao mantenedor do produto — não a um fórum.**

⚠ **E a tentação específica deste curso:** **ele ensina evasão.** **E evasão é dual-use** — **as
mesmas técnicas servem para atacar.** **A linha é o destino:** **você as escreve para medir a
detecção, e as declara como tal.**

⚠ **A tabela do que é lícito e o que não é:**

| Ato | Lícito? |
|---|---|
| Escrever a regra e medir o FP | ✓ |
| Rodar o atacante simulado no seu lab | ✓ |
| Medir a taxa de detecção | ✓ |
| Escrever a evasão para testar a regra | ✓ |
| ⚠ Usar a evasão contra alvo real | ⚠ **CRIME** |
| ⚠ Testar a regra contra WAF de terceiro | ⚠ **CRIME** |
| ⚠ Publicar bypass de produto não corrigido | ⚠ Irresponsável |

⚠ **No Brasil:** art. 154-A e 266. **E a evasão, quando usada, é o meio — não atenua a pena.**

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Modelar a **superfície de detecção** de um sistema.
2. Escrever uma regra e **medir a taxa de falso positivo**.
3. Entender por que a **normalização** é o elo onde tudo falha.
4. Reconhecer as **famílias de evasão** e o que cada uma explora.
5. **Instrumentar a telemetria** que falta — e saber o que ela custa.
6. Construir o **perfil do atacante** a partir de hipótese.
7. Rodar o **ciclo purple**: atacar, detectar, medir, ajustar.
8. Distinguir **detecção por assinatura, por comportamento e por anomalia**.
9. **Orçar** uma regra — o que ela custa em FP e em manutenção.
10. Reportar a falha de detecção **com evidência e sem expor terceiros**.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | O jogo | O modelo, e quem vê o quê | 2 |
| 2 | A superfície de detecção | ⚠ **Onde se pode ver** | 3 |
| 3 | Assinatura, comportamento, anomalia | ⚠ **As três famílias** | 4 |
| 4 | A normalização e o elo fraco | ⚠ **Onde tudo falha** | 4 |
| 5 | Telemetria e o que falta | O que logar — e o custo | 3 |
| 6 | Falso positivo e o orçamento | ⚠ **Medir, não reclamar** | 3 |
| 7 | O perfil do atacante | Do TTP à hipótese | 3 |
| 8 | O ciclo purple | ⚠ **A regra que apodrece** | 4 |
| 9 | Evasão: as famílias | O que cada uma explora | 4 |
| 10 | O detector que discorda | O lado de dentro do módulo 10 anterior | 2 |
| 11 | Projeto: a regra medida | O entregável | 2 |

Cada módulo: teoria → **regra comentada** → lab → avaliação. ~55% prática de medição.

---

## O laboratório

```bash
sudo apt update
sudo apt install -y python3 python3-pip git curl jq \
                    suricata zeek elasticsearch kibana 2>/dev/null || true
pip3 install requests pyyaml
docker --version  # para o SIEM leve
```

| Ferramenta | Papel | Licença |
|---|---|---|
| **Suricata** | IDS por assinatura | Livre |
| **Zeek** | Análise de tráfego, logs ricos | Livre |
| **`ivre` / `scapy`** | Manipular pacotes | Livre |
| **Sigma** | Regras portáveis | Livre |
| **ELK / OpenSearch** | O SIEM, no seu lab | Livre |
| **ModSecurity + CRS** | O WAF didático | Livre |
| **O atacante do curso anterior** | ⚠ **O seu**, em 127.0.0.1 | — |

⚠ **O curso **não** toca em SIEM, WAF ou sensor de terceiro.** **Você sobe o seu** — **e a
telemetria é sua.**

```bash
mkdir -p ~/detect-lab/{regras,ataque,telemetria,medicoes,caderno} && cd ~/detect-lab
```

⚠ **`regras/` guarda as assinaturas.** **`ataque/` guarda o atacante simulado — o do curso
anterior.** **`medicoes/` guarda a taxa de acerto.** **E `caderno/` segue o módulo 3 do Pesquisa.**

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (11) | 40% | A regra escrita **e medida** |
| **Taxa de FP** (módulo 6) | 20% | ⚠ **Medida, não estimada** |
| **As três famílias** (módulo 3) | 10% | Sabe quando usar cada uma |
| **O ciclo purple** (módulo 8) | 15% | Atacou, detectou, ajustou |
| Projeto (módulo 11) | 15% | A regra, com taxa e limitações |

**Rubrica central:** você não entrega "escrevi uma regra". Você entrega **a regra**, **a taxa de
detecção**, **a taxa de falso positivo** — e **o que ela não pega**.

---

## Como este curso se conecta

| Curso | Ligação |
|---|---|
| **Pesquisa em Segurança** | ⚠ Pré-requisito — módulos 5 e 6 |
| **Parser Differentials** | ⚠ Pré-requisito — módulo 3, o critério |
| **HTTP Smuggling** | ⚠ **O módulo 10 dele é metade deste** |
| **Fuzzing** | O corpus e a medição |
| **Patch Diffing** | Ver o que o patch de detecção mudou |
| **Exploit Development** | O que você está detectando |

⚠ **Este curso fecha o eixo defensivo.** **E ele se lê melhor depois do HTTP Smuggling** — **porque
o módulo 10 de lá já apresentou as defesas, e aqui você as mede.**

---

## Referências abertas

- **MITRE ATT&CK** — https://attack.mitre.org/
- **Sigma** — https://github.com/SigmaHQ/sigma
- **Suricata** — https://suricata.io/
- **Zeek** — https://zeek.org/
- **OWASP CRS** — https://coreruleset.org/
- **WAFFLED** — a pesquisa sobre divergência em WAFs
- **Detection Engineering (práticas)** — a disciplina
- **Purple Team** — o ciclo
- **RFC 9110 / 9112** — a spec que o detector lê
- **"=" False Positive" (Google SRE)** — sobre o custo de alertar

---

*Material didático original, de propósito defensivo e de pesquisa. O atacante é simulado no
laboratório próprio, e a regra roda no sensor próprio. Nenhum teste contra SIEM, WAF ou serviço de
terceiro. A falha de detecção é reportada ao mantenedor — nunca publicada antes da correção. Evasão
usada contra sistema alheio é crime (art. 154-A e 266).*
