# Anonimato e Privacidade na Internet

Curso de 34 horas, doze módulos, sobre **como o anonimato de rede funciona por dentro** — e onde
ele quebra.

**Para quem protege e para quem defende.** Jornalista, ativista, pesquisador, advogado, fonte sob
risco — e o analista que precisa entender tráfego Tor sem quebrar a privacidade de quem usa Tor
legitimamente (que é a maioria).

⚠ **Sobre o que não é este curso.** Não é sobre desanonimizar ninguém, não é sobre correlação de
fluxo contra terceiro, não é sobre evadir investigação. Anonimato de rede é uma ferramenta de
proteção de direitos — o mesmo Tor que protege uma fonte jornalística protege uma vítima de
perseguição. É por isso que ele existe.

**Material original.** Referências abertas na [ementa](00-ementa.md).

---

## A tese do curso

TODO MATERIAL sobre anonimato diz "use Tor" e para aí. Nenhum explica **de quem** aquilo protege,
nem **onde** a proteção quebra.

Este curso inverte a pergunta. Cada módulo responde:

> **"Contra qual adversário isto protege, e onde a proteção falha?"**

E o fio condutor é uma frase que vale o curso inteiro:

> **Anonimato é uma cadeia, e a cadeia vale o elo mais fraco.**
> Circuíto Tor perfeito + browser que vaza `WebRTC` + DNS em claro = **sensação de anonimato**,
> que é pior que nada — porque muda o seu comportamento sem mudar o seu risco.

---

## Trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [Modelagem de ameaça](modulo-01.md) | 2 | Seu adversário nomeado, com recurso estimado |
| 2 | [Como a identidade vaza](modulo-02.md) | 3 | Mapa das camadas onde identidade aparece |
| 3 | [Proxies: HTTP, SOCKS4, SOCKS5](modulo-03.md) | 3 | Um proxy medido, com vazamento demonstrado |
| 4 | [VPN: o que é e o que não é](modulo-04.md) | 3 | O túnel explicado, com o mito demolido |
| 5 | [Tor I: diretório e circuito](modulo-05.md) | 4 | Circuito lido, com guarda e consenso |
| 6 | [Tor II: célula, stream, rendes-vous](modulo-06.md) | 4 | Serviço oculto próprio funcionando |
| 7 | [Anatomia do vazamento](modulo-07.md) | 4 | Relatório dos seus vazamentos, com prova |
| 8 | [Fingerprinting](modulo-08.md) | 3 | Superfície medida antes e depois |
| 9 | [Resistência a correlação](modulo-09.md) | 3 | Correlação explicada e por que Tor resiste |
| 10 | [Tor em rede corporativa](modulo-10.md) | 3 | Tráfego distinguido, sem bloquear errado |
| 11 | [Ferramenta para cada adversário](modulo-11.md) | 2 | Matriz de decisão própria |
| 12 | [Projeto: superfície de exposição](modulo-12.md) | 3 | Medição antes/depois, com evidência |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md) · [Laboratório](labs/README.md)

---

## ⚠ Antes do primeiro lab

### O que é legal (e é o que este curso faz)

| Prática | Situação |
|---|---|
| Usar Tor, VPN, proxy | **Legal** |
| Rodar relay Tor (não de saída) | Legal |
| Rodar serviço oculto próprio, para estudo | Legal |
| Fingerprinting **contra você mesmo** | Legal, e o exercício central |
| Capturar tráfego **na sua rede** | Legal |
| Proteger fonte ou comunicação sob risco | Legal — e frequentemente dever profissional |

### O que não está neste curso

| Prática | Por que |
|---|---|
| Desanonimizar terceiro | É a antítese do que o Tor existe para fazer |
| Correlação de fluxo contra alvo | É vigilância; exige autoridade legal |
| Proxy de interceptação para terceiro | Lei 9.296/96 — interceptação |
| Serviço oculto ilegal | Crime, e o material não orienta |
| Evadir investigação legítima | Não é anonimato; é obstrução |

⚠ **Todo laboratório usa circuito próprio, serviço oculto próprio e rede própria.** Você é sujeito
e objeto de toda medição. Nada roda contra terceiro.

⚠ **Relay de saída:** o Módulo 10 explica por quê rodar um **não é necessário** para este curso e
tem implicação legal em algumas jurisdições — o tráfego de terceiro passa pela sua máquina.

---

## Monte o laboratório

```bash
sudo apt update
sudo apt install -y tor torbrowser-launcher python3 python3-pip \
                    tcpdump tshark curl netcat-openbsd socat \
                    proxychains4 nyx obfs4proxy
pip3 install stem requests
```

Verificação:

```bash
tor --version           # 0.4.8+
python3 -c "import stem, requests; print('ok')"
tcpdump --version | head -1
```

**Duas ferramentas, dois propósitos** — e confundi-las é o erro prático número um do tema:

| Ferramenta | Para quê | Proteção de fingerprint |
|---|---|---|
| **Tor Browser** | Navegar de verdade | **Completa** — é o projeto dele |
| **`tor` + `curl`** | **Estudar** o protocolo | Nenhuma |

⚠ **Estudar com `curl` não te protege; navegar com Tor Browser te protege.** Este curso usa `curl`
para você **ver** o protocolo e Tor Browser para você **medir** a proteção. Se você só fizer a
primeira parte, você entende o Tor e continua exposto.

---

## A faixa do laboratório

```
10.13.13.0/24   ← quarta faixa do material
```

Separada das outras três (`10.10.10.0/24` em redes, `10.11.11.0/24` em malware, `10.12.12.0/24`
em APT) para que os laboratórios nunca se cruzem.

⚠ **Nos Módulos 5–9 você se conecta à rede Tor real.** Isso é uso legítimo. A análise é sempre do
**seu** tráfego, nunca de outro usuário.

---

## Como este curso é diferente dos outros deste material

Os três cursos anteriores analisavam **artefato de terceiro** (rede do cliente, malware, ator).
Este analisa **você**.

Isso muda três coisas:

1. **Toda medição é contra você mesmo.** Fingerprint, vazamento, circuito — o sujeito é você. Não
   há como "testar em produção" e não há terceiro envolvido.
2. **O resultado é pessoal e operacional.** Você termina com uma lista do que ainda expõe você —
   não com um relatório sobre outra pessoa.
3. **A conclusão honesta costuma ser "não resolvido".** Anonimato perfeito não existe; existe
   anonimato **suficiente para um adversário específico**. O curso treina você a dizer qual é o
   seu, e o que ele não cobre.
