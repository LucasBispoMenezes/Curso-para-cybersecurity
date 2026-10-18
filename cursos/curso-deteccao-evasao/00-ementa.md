---
title: "Deteccao e Evasao: O Jogo"
nivel: especialista
tags: [deteccao, evasao, waf, sigma, falso-positivo, telemetria]
---# Detecção e Evasão: O Jogo

**Ementa do curso · 34 horas · 11 módulos · PT-BR com termos técnicos em inglês**


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


*Material didático original, de propósito defensivo e de pesquisa. O atacante é simulado no
laboratório próprio, e a regra roda no sensor próprio. Nenhum teste contra SIEM, WAF ou serviço de
terceiro. A falha de detecção é reportada ao mantenedor — nunca publicada antes da correção. Evasão
usada contra sistema alheio é crime (art. 154-A e 266).*
