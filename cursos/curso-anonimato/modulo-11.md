# Módulo 11 — A Ferramenta Certa para Cada Adversário

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** Módulos 1 a 10

---

## Objetivos

1. Montar uma matriz de decisão: adversário × ferramenta × o que fica exposto.
2. Reconhecer as **combinações** que funcionam e as que dão falsa segurança.
3. Entender roteamento no nível de sistema vs. por aplicação.
4. Saber o que fazer quando a resposta correta é "esta ferramenta não resolve o seu caso".
5. Produzir a sua própria matriz, derivada do seu modelo de ameaça.

---

## ⚠ Conduta

Módulo analítico. As medições são as suas. Nenhuma configuração aqui é para rede de terceiro.

⚠ **Uma nota real sobre combinar ferramentas:** empilhar VPN + Tor + proxy **não** soma proteção
automaticamente — e frequentemente **adiciona** superfície. É o erro mais comum de quem lê material
de privacidade pela metade. Este módulo existe para corrigir isso.

---

## 11.1 A matriz de decisão

O entregável central do módulo. Cada célula responde: **"esta ferramenta protege contra este
adversário?"**

```
                          A1    A2    A3    A4    A5    A6
                        oport. rastr. propr. local escala físico
┌──────────────────────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ HTTPS                │  ✓   │  ✗   │  ✗   │  ✗   │  ✗   │  ✗   │
│ VPN                  │  ✓   │  ✓   │  ✗   │  ✓   │  ~   │  ✗   │
│ DNS cifrado (DoH/DoT)│  ✓   │  ✗   │  ~   │  ✓   │  ~   │  ✗   │
│ Proxy                │  ✓   │  ✗   │  ✗   │  ~   │  ✗   │  ✗   │
│ Tor                  │  ✓   │  ✓   │  ✓   │  ✓   │  ~   │  ~   │
│ Tor Browser          │  ✓   │  ✓   │  ✓   │  ✓   │  ~   │  ~   │
│ Mixnet               │  ✓   │  ✓   │  ✓   │  ✓   │  ✓   │  ~   │
│ Dispositivo limpo    │  ✓   │  ✓   │  ✓   │  ✓   │  ✓   │  ✓   │
│ Disciplina de uso    │  ✓   │  ✓   │  ✓   │  ✓   │  ✓   │  ✓   │
│ Compartimentação     │  ✓   │  ✓   │  ✓   │  ✓   │  ✓   │  ✓   │
└──────────────────────┴──────┴──────┴──────┴──────┴──────┴──────┘
   ✓ protege   ~ protege parcialmente   ✗ não protege
```

⚠ **Leia a coluna A2 (rastreador comercial) de novo.** HTTPS, VPN, proxy e DNS cifrado **não
protegem** contra ele — porque o rastreador **não está no caminho**, está **no site**. Você o
enfrenta com o Módulo 8, não com o Módulo 5.

⚠ **A coluna A3 (o provedor) tem a mesma leitura invertida.** VPN **não** protege: o provedor da
VPN **é** o novo provedor. Só Tor protege, porque não há provedor único.

⚠ **As três últimas linhas são universais** — protegem contra tudo, inclusive A6. Não são
ferramentas de rede. São **disciplina**, e é o ponto do curso inteiro.

---

## 11.2 As combinações que funcionam

Só existem quatro, e vale saber por quê.

| Combinação | O que resolve | Quando usar |
|---|---|---|
| **Tor Browser** | Anonimato de rede + fingerprint | O caso geral sob risco |
| **Tor → VPN** | Esconde do ISP que você usa Tor | Quando usar Tor é proibido ou perigoso |
| **VPN → Tor** | Esconde do ISP que você usa Tor, sem confiar na VPN para o destino | Quando você confia na VPN e não no ISP |
| **Mixnet + Tor Browser (assíncrono)** | Resistência a correlação | Adversário A5, comunicação assíncrona |

⚠ **Note que duas combinações envolvem VPN e Tor juntos, e elas são diferentes.** A ordem
importa, e a diferença é **quem vê o quê**:

| Ordem | O ISP vê | A VPN vê | O circuito vê |
|---|---|---|---|
| **Tor → VPN** | só tráfego VPN | **que você usa Tor** | seu IP da VPN |
| **VPN → Tor** | só tráfego VPN | que você usa Tor | seu IP da VPN |

⚠ **Confuso? É porque os dois são parecidos e a diferença é sutil.** Na prática:

| Aspecto | Tor → VPN | VPN → Tor |
|---|---|---|
| Configuração | Tor cliente → tunnel para VPN | Cliente → VPN → Tor (como cliente) |
| Ganho principal | Esconde do cliente final que você veio por Tor | Esconde do ISP que você usa Tor |
| Confiança exigida | Na VPN, para **tudo** | Na VPN, para **esconder o uso** |
| Recomendação geral | Não é a ordem recomendada | Ordem preferida para esse objetivo |

⚠ **A recomendação que o material sustenta:** se você precisa esconder **do seu ISP** que usa Tor,
a ordem é **VPN → Tor** (a VPN é só o transporte, o circuito cuida da privacidade). Se você quer
esconder **do destino** que você veio por Tor, não use VPN — isso não é o que a VPN faz.

---

## 11.3 As combinações que dão falsa segurança

Estas são as que adicionam superfície **sem** adicionar proteção.

| Combinação | Por que dá falsa segurança |
|---|---|
| **VPN + proxy HTTP** | Dois intermediários, um deles vendo tudo em claro |
| **Tor + extensão "anti-fingerprint"** | A extensão te distingue dos outros usuários de Tor (Módulo 8 §8.5) |
| **Tor + `WebRTC` ligado** | O circuito é anulado (Módulo 7 §7.2) |
| **Dois proxies em cadeia** | Dois pontos que te conhecem, sem distribuição de confiança |
| **Tor + login pessoal** | O site te identifica; o circuito foi decorativo (Módulo 7 §7.2) |
| **VPN "sem registro"** | Não verificável; é afirmação, não propriedade (Módulo 4 §4.3) |
| **Navegador comum via Tor** | Você tem o circuito, e o fingerprint intacto (Módulo 8) |
| **Tor no celular, sem verificar o app** | O app pode vazar fora do circuito |

⚠ **A segunda linha merece destaque porque é contraintuitiva.** Uma extensão "anti-fingerprint"
faz você **diferente dos outros usuários de Tor** — e a defesa do Tor Browser é justamente
**ser igual a todos**. A extensão **piora**.

⚠ **A "regra do elo mais fraco" resolve todos os casos da tabela:** antes de adicionar uma
ferramenta, pergunte **"qual camada do Módulo 2 ela protege, e essa camada é a minha mais fraca?"**.
Se não for, você não está reforçando — está complicando.

---

## 11.4 Roteamento por sistema vs. por aplicação

O problema que aparece em todo laboratório deste curso, e que merece nome próprio.

| | Por aplicação | Por sistema |
|---|---|---|
| Exemplo | `curl --socks5`, configuração do browser | `nftables`, `tun`, roteamento por tabela |
| Cobertura | **Só a aplicação configurada** | **Tudo** |
| Vaza | Atualizador, NTP, extensão, app de fundo | Nada, se configurado corretamente |
| Risco | **Um programa esquecido anula tudo** | Configuração complexa quebra a rede |
| Dificuldade | Baixa | Média |

⚠ **Nada neste curso faz roteamento de sistema, e é deliberado.** Roteamento forçado de todo o
tráfego por Tor **quebra a rede**, prende você em configuração difícil de reverter, e — o mais
importante — pode **piorar** o anonimato, porque aplicações que esperam IP real passam a
comportar-se de forma inconsistente.

**A solução correta, quando você precisa de cobertura total, é uma máquina dedicada:**

| Abordagem | Uso |
|---|---|
| **Whonix** | Gateway Tor + VM isolada, cobertura de sistema |
| **Tails** | Sistema amnésico que roteia tudo por Tor por padrão |
| **VM dedicada** | Máquina só para a atividade sensível, sem nada mais |
| **Qubes OS** | Compartimentação por VM |

⚠ **Estas são as respostas corretas porque isolam por arquitetura, não por configuração.** Você
não confia que uma aplicação respeite o proxy; você **garante** que não há outra rota.

⚠ **Nota sobre Tails:** ele resolve um problema específico — **você não deixa rastro no
dispositivo**. Isso é diferente de anonimato de rede, e é frequentemente o que mais falta. Se o
adversário tem alcance físico (A6), o Tails resolve a parte de disco; não resolve a parte de
comportamento.

---

## 11.5 Quando a resposta é "não resolve"

O módulo mais honesto é o que admite o que não tem solução.

| Se o seu problema é... | A resposta é... |
|---|---|
| O adversário tem o seu dispositivo | **Não há solução técnica.** O dispositivo precisa estar limpo, e há limite |
| O adversário tem a sua rede inteira (A5) e você precisa de tempo real | **Não há solução conhecida** para baixa latência resistente |
| Você precisa de telefone, e a verificação exige número | **Não tem contorno técnico.** A escolha é não usar o serviço |
| O adversário pode ler o seu texto e comparar estilo | **Mitigação parcial.** Não é eliminável |
| Você precisa de comunicação em tempo real sob A5 | **Perda de privacidade é o custo** |
| O adversário é a sua chave privada mal guardada | **Nenhuma ferramenta resolve** — é higiene |

⚠ **A última linha é a que mais causa dano na prática.** Tor, VPN e mixnet não protegem uma chave
privada mal guardada, uma senha reutilizada, ou um token vazado. A maior parte das quebras de
anonimato real **não é** de protocolo — é de **higiene**.

**A hierarquia de risco real, em ordem de frequência:**

| Ordem | Causa da quebra | Prevenível? |
|---|---|---|
| 1 | Conta/identidade cruzada | **Sim** — disciplina |
| 2 | Chave/senha mal guardada | **Sim** — higiene |
| 3 | Dispositivo comprometido | **Parcialmente** |
| 4 | Fingerprint de browser | **Sim** — Tor Browser |
| 5 | Vazamento de DNS / `WebRTC` | **Sim** — configuração |
| 6 | Correlação de fluxo | **Parcialmente** |
| 7 | Quebra de criptografia | **Não acontece** |

⚠ **A linha 7 é o que a mídia discute e o que quase nunca causa dano.** As linhas 1 e 2 — as que
**você** controla — causam a maioria. **Alocar esforço na ordem inversa é o erro mais comum.**

---

## 11.6 LAB — A sua matriz de decisão

**Duração:** 60 min

### Passo 1 — Retome o seu modelo (10 min)

Abra o `modelo-ameaca.md` do Módulo 1. **O seu adversário continua o mesmo?**

Produza `modelo-revisado.md`:

| Elemento | Módulo 1 | Agora | Mudou por quê |
|---|---|---|---|
| O que protejo | | | |
| Adversário (A1–A6) | | | |
| O que não preciso proteger | | | |
| Alcance físico? | | | |

⚠ **Se não mudou, tudo bem — mas escreva.** Mudar o modelo no meio do curso é **resultado**, não
fracasso: você aprendeu algo que reordena as prioridades.

### Passo 2 — A matriz do seu caso (25 min)

Produza `minha-matriz.md`:

| Ferramenta | Protege contra o MEU adversário? | Qual camada protege | Onde falha no meu caso | Custo/complexidade |
|---|---|---|---|---|
| HTTPS | | | | |
| VPN | | | | |
| DNS cifrado | | | | |
| Proxy | | | | |
| Tor | | | | |
| Tor Browser | | | | |
| Ponte + ofuscação | | | | |
| Mixnet | | | | |
| VM dedicada | | | | |

**Depois, a decisão:**

```markdown
## Ferramentas que eu USO
| Ferramenta | Por que | O que ela cobre | O que ela NÃO cobre |

## Ferramentas que eu DESCARTO
| Ferramenta | Por que descartei |

## O que não tem solução no meu caso
| Problema | Por que não tem | Mitigação adotada |
```

### Passo 3 — Teste as combinações (15 min)

Para **cada** combinação que você está pensando em usar, preencha:

| Combinação | Quem vê meu IP | Quem vê meu destino | Quem vê meu conteúdo | Terceiros | Vale a pena? |
|---|---|---|---|---|---|
| Tor | | | | | |
| VPN | | | | | |
| VPN → Tor | | | | | |
| Tor → VPN | | | | | |

**Responda:**

1. Alguma das suas combinações **adiciona** terceiro sem adicionar proteção? Qual?
2. Qual delas tem **menos** terceiros que conhecem você **e** o destino simultaneamente?
3. **Se você não conseguisse confiar em nenhum terceiro**, qual sobraria?

### Passo 4 — A hierarquia do seu risco (10 min)

Da lista §11.5, ordene pelo **seu** caso:

| Ordem | Risco no meu caso | Já mitigado? | Próxima ação |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Responda:**

1. Qual risco **você não tinha considerado** antes deste curso?
2. Qual mitigação você adota **esta semana** (não "algum dia")?
3. Qual é a mitigação de **maior impacto e menor custo** no seu caso?

### Critérios de aceitação

- `modelo-revisado.md` com a comparação contra o Módulo 1, **explicando qualquer mudança**.
- `minha-matriz.md` com as nove ferramentas avaliadas **contra o seu adversário**, não em geral.
- A seção "ferramentas que eu descarto" com justificativa — **descartar é resultado**.
- Você identificou uma combinação que **adiciona terceiro sem adicionar proteção**.
- Você respondeu qual ferramenta sobra se você **não confiar em nenhum terceiro**.
- A hierarquia do Passo 4 com ações concretas, e uma marcada para esta semana.
- Você identificou um risco que **não havia considerado** antes.

---

## Avaliação

1. Por que HTTPS, VPN e proxy **não** protegem contra rastreador comercial (A2)? Onde está o
   rastreador?
2. Por que VPN **não** protege contra o provedor (A3)? O que a VPN é, nesse caso?
3. Explique a diferença entre `Tor → VPN` e `VPN → Tor` em termos de quem vê o quê.
4. Qual das duas ordens o material recomenda para esconder do ISP? Por quê?
5. Por que `Tor → VPN` é considerada a ordem não recomendada?
6. Cite três combinações que dão falsa segurança e explique cada uma.
7. Por que extensão "anti-fingerprint" **piora** sua situação no Tor?
8. Enuncie a "regra do elo mais fraco" como pergunta, e aplique-a a uma combinação sua.
9. Explique a diferença entre roteamento por aplicação e por sistema. Qual vaza?
10. Por que este curso **não** faz roteamento de sistema? O que é a resposta correta, e por quê?
11. Qual problema o Tails resolve, e qual ele **não** resolve?
12. Cite três situações em que a resposta correta é "não tem solução técnica".
13. Ordene as sete causas de quebra de anonimato por frequência real. Qual é a que a mídia discute,
    e por que ela é a menos relevante?

---

**Próximo:** [Módulo 12 — Projeto: sua superfície de exposição](modulo-12.md)
