# Módulo 4 — VPN: o que ela é e o que ela não é

**Carga:** 3 horas (1h30 teoria · 1h30 lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Explicar o que uma VPN faz no fio: túnel, rota, cifra.
2. Distinguir VPN de anonimato — e nomear exatamente o que a VPN não resolve.
3. Entender o modelo de confiança da VPN e por que ele é **único e total**.
4. Reconhecer os cinco mitos comerciais mais comuns de VPN.
5. Medir, na sua própria rede, o que muda e o que não muda com VPN.

---

## ⚠ Conduta

Você vai medir **a sua própria conexão**. Se você usar uma VPN comercial, é do seu próprio
tráfego. Nenhuma medição envolve outro usuário. Nenhuma técnica de identificação de terceiro.

⚠ **VPN é legal.** Usar VPN é legal no Brasil e em quase toda jurisdição. O que importa aqui é
que você **entenda** o que ela faz — porque a propaganda da indústria diz coisas que a
engenharia não sustenta.

---

## 4.1 O que uma VPN realmente é

Uma VPN é um **túnel de camada 3**, e vale desmontar pedaço por pedaço.

```
SEM VPN                                COM VPN
┌──────┐  IP real  ┌──────────┐        ┌──────┐  IP real  ┌────────┐
│ você │──────────▶│ provedor │        │ você │──────────▶│  VPN   │
└──────┘           └──────────┘        └──────┘  (túnel   └───┬────┘
    │                  │               cifrado)              │
    ▼                  ▼                                       ▼
 destino vê         o provedor                          destino vê
 SEU IP             vê o destino                        O IP DA VPN
```

### O que acontece no fio

1. **Sua interface ganha um IP do túnel.** O kernel passa a rotear por ali.
2. **Todo o tráfego é cifrado e encapsulado** dentro de pacotes IP que vão para o servidor VPN.
3. **O servidor VPN desencapsula** e faz a requisição para o destino, **com o IP dele**.
4. A resposta volta pelo túnel.

| Camada | O que a VPN faz |
|---|---|
| IP de origem, para o destino | **Substitui** pelo IP do provedor |
| Conteúdo, contra a rede local | **Cifra** |
| Conteúdo, contra o provedor | **Não cifra** — ele vê tudo depois de desencapsular |
| DNS | **Depende da configuração** — frequentemente redireciona, e vaza se mal configurado |
| Fingerprint do browser | **Não afeta** |
| Comportamento | **Não afeta** |

⚠ **A linha "DNS depende da configuração" é onde a VPN mais falha na prática.** Muitos clientes
roteiam DNS pelo túnel; alguns, não. E um único vazamento de DNS revela o nome de todo site que
você acessou — mesmo com todo o resto cifrado (Módulo 2).

---

## 4.2 VPN ≠ anonimato — a tabela que resolve a confusão

| Pergunta | VPN resolve? |
|---|---|
| O destino sabe meu IP? | **Não** — vê o do provedor |
| Meu provedor sabe que eu uso Tor? | **Não** — vê tráfego para a VPN |
| O provedor da VPN sabe o que eu faço? | **SIM — tudo** |
| O site sabe quem eu sou (login)? | **Não** |
| Meu browser deixa de ter fingerprint único? | **Não** |
| Meu horário de atividade deixa de me identificar? | **Não** |
| O provedor da VPN pode me identificar? | **SIM — é o ponto** |

⚠ **A linha mais importante é a última.** Uma VPN é, por construção, uma entidade que **sabe
exatamente quem você é e o que você faz**. Você escolhe **qual entidade** vai saber — você mudou
o observador, não eliminou a observação.

**A frase que resume:** VPN é **redirecionamento de confiança**, e ela é **total e única**.

| | Quantas entidades sabem seu IP + destino |
|---|---|
| Direto | O provedor (parcialmente) + o destino |
| Com VPN | **O provedor da VPN — tudo** |
| Com Tor | **Nenhuma isoladamente — 3 relays, cada um com parte** |

---

## 4.3 O modelo de confiança

Isto é o coração do módulo, e é o que a propaganda omite.

**Usando VPN, você confia totalmente no provedor para:**

| Você confia que ele... | Ele consegue trair? |
|---|---|
| Não registra seu IP e destino | **Sim, trivialmente** |
| Não correlaciona sua sessão | **Sim** |
| Não entrega dado a terceiro | **Sim** |
| Não foi comprometido | **Sim** |
| Usa criptografia de verdade | **Sim** |
| Não é uma fachada de outra entidade | **Sim** |

⚠ **Você não tem como verificar nenhuma dessas seis afirmações.** É por isso que existem
**auditorias independentes** e **política de não-registro verificável** — e é por isso que a
**jurisdição** do provedor importa: ela determina a que ordem legal ele responde.

| Elemento | O que você pode verificar |
|---|---|
| Protocolo usado é o que ele diz | **Sim**, em parte (captura) |
| Não há vazamento de DNS | **Sim** (teste) |
| Não há vazamento de IPv6 | **Sim** (teste) |
| Ele não registra | **Não** — só por auditoria de terceiro |
| Ele não foi comprometido | **Não** |
| Ele não é quem diz ser | **Não** |

**A diferença estrutural com o Tor:**

| | VPN | Tor |
|---|---|---|
| Entidades que veem você + destino | **1** (o provedor) | **0** isoladamente |
| Precisa confiar em alguém | **Sim, totalmente** | Confiança distribuída |
| Um elo comprometido revela? | **Tudo** | Só parte |
| Verificável tecnicamente? | Não | **Sim** — você lê a especificação |

⚠ **A última linha é a razão pela qual o Tor é estudável e a VPN não.** Tor é protocolo aberto:
você **lê** o que ele faz. VPN é um serviço: você **confia** no que ele diz. Isso não torna VPN
inútil — torna VPN uma decisão de **confiança**, não de **engenharia**.

---

## 4.4 Os cinco mitos comerciais

| Mito | Realidade |
|---|---|
| "VPN deixa você anônimo" | **Não.** Transfere confiança para um provedor que te vê por inteiro |
| "VPN protege contra hacker em Wi-Fi público" | **Parcialmente** — só se o ataque for local, sem TLS, e a VPN estiver ativa |
| "VPN militar / 256 bits é mais segura" | **Marketing.** AES-256 já é o padrão; o que importa é **outra coisa** |
| "VPN esconde todo o seu tráfego" | **Não esconde do provedor da VPN**, nem do destino após desencapsular |
| "Sem registro, então estou seguro" | **Não verificável.** É afirmação, não propriedade |

⚠ **O mito do Wi-Fi público merece atenção porque é o mais plausível.** TLS já protege o conteúdo
em Wi-Fi aberto; a VPN acrescenta proteção contra ataque **local ativo** (ARP spoofing, portal
falso) e contra ver o **nome** dos sites que você visita (SNI). Isso é valor real — **mas não é
anonimato**, e a propaganda vende como se fosse.

**O que a VPN resolve de verdade, em ordem de valor:**

1. **Ocultar seu IP do destino** — real, e é o principal.
2. **Proteger contra observação local do SNI/nome** — real, se a VPN for usada de verdade.
3. **Contornar bloqueio geográfico** — real, e é o uso mais comum.
4. **Adicionar uma camada sob o Tor** (`VPN → Tor`) — real, com ressalva.
5. **Esconder o conteúdo da rede local** — real, mas TLS já fazia isso.

⚠ **A linha 4 é a única combinação que faz sentido para privacidade, e tem ressalva:** `VPN → Tor`
esconde do provedor que você usa Tor. **Mas a VPN passa a saber que você usa Tor** — e se ela
registra, você trocou um problema por outro. A ordem importa: **Tor → VPN** é pior ainda (Tor
sabe que existe uma VPN e o destino vê a VPN). Nenhuma das duas é anonimato novo.

---

## 4.5 O que a VPN não toca

Retomando o Módulo 2, o que **permanece igual** com VPN ativa:

| Camada | Muda com VPN? |
|---|---|
| ① IP de origem | **Sim** — para o destino |
| ② DNS | Depende da configuração |
| ③ SNI | **Não** contra a VPN; sim contra a rede local |
| ④ Sessão / conta | **Não** |
| ⑤ Fingerprint | **Não** |
| ⑥ Comportamento | **Não** |

⚠ **Quatro das seis camadas ficam exatamente iguais.** E a camada ⑤ (fingerprint) é aquela que
identifica você **no servidor** — contra a qual a VPN não faz absolutamente nada.

**A demonstração que você vai fazer no lab:** com VPN ativa, você continua com o mesmo
`User-Agent`, o mesmo `Accept-Language`, o mesmo fingerprint, o mesmo horário, e o mesmo padrão de
escrita. Tudo o que o Módulo 2 listou como vazamento **permanece vazando**.

---

## 4.6 LAB — Meça o que muda com VPN

**Duração:** 90 min

⚠ **Se você não tiver VPN, não instale uma só para o lab.** O lab funciona com **qualquer** túnel
que você já tenha, ou com um túnel SSH (`ssh -D`) que você mesmo cria, ou apenas pelo exercício
analítico. **Não é necessário assinar serviço nenhum.**

### Opção A — Se você já usa VPN (30 min)

```bash
mkdir -p ~/anon-lab/lab4 && cd ~/anon-lab/lab4
```

**Meça ANTES (VPN desligada):**

```bash
sudo bash -c '
{
echo "=== DATA ==="; date -Is
echo "=== IP EXTERNO ==="; curl -s --max-time 8 https://httpbin.org/ip
echo "=== CABECALHOS ==="; curl -s --max-time 8 https://httpbin.org/headers
echo "=== DNS ==="; cat /etc/resolv.conf
echo "=== ROTAS ==="; ip route show | head -5
echo "=== IPv6 ==="; ip -6 addr show scope global 2>/dev/null | head -5
} ' > antes.txt
```

**Ligue a VPN e meça DEPOIS:**

```bash
# (você liga a VPN pelo cliente dela; depois:)
sudo bash -c '
{
echo "=== DATA ==="; date -Is
echo "=== IP EXTERNO ==="; curl -s --max-time 8 https://httpbin.org/ip
echo "=== CABECALHOS ==="; curl -s --max-time 8 https://httpbin.org/headers
echo "=== DNS ==="; cat /etc/resolv.conf
echo "=== ROTAS ==="; ip route show | head -5
echo "=== IPv6 ==="; ip -6 addr show scope global 2>/dev/null | head -5
} ' > depois.txt

diff --side-by-side antes.txt depois.txt | head -40
```

### Opção B — Túnel SSH: uma VPN que você controla (30 min)

Se você tem acesso a um host qualquer (VPS, servidor, máquina), um túnel SSH **encaminha tudo** e
serve para estudar:

```bash
# Encaminhamento dinâmico: cria um SOCKS5 que sai pelo host remoto
# (você controla o host remoto → sem terceiro envolvido)
ssh -D 1080 -N -f usuario@seu-host

# Todo tráfego que passar por 1080 sai com o IP do host remoto
curl -s --socks5-hostname 127.0.0.1:1080 https://httpbin.org/ip
```

⚠ **Isso não é VPN de camada 3, é proxy SOCKS5** — mas serve para medir o mesmo efeito: o destino
vê outro IP, e **as outras cinco camadas do Módulo 2 continuam iguais**.

### Passo — A tabela que importa

Produza `vpn-medicao.md`:

| O que medir | Sem VPN | Com VPN | Muda? |
|---|---|---|---|
| IP externo | | | |
| ASN / tipo de conexão | | | |
| **User-Agent** | | | |
| **Accept-Language** | | | |
| Resolvedor de DNS | | | |
| Interface de saída | | | |
| IPv6 exposto | | | |
| **Fingerprint do browser** | | | |
| **Horário da atividade** | | | |
| **Estilo de escrita** | | | |

**Responda:**

1. Quantas linhas da tabela mudaram? **Quantas** das seis camadas do Módulo 2 estão protegidas?
2. O `User-Agent` mudou com a VPN? **Por quê não?** Quem vê esse cabeçalho?
3. O `Accept-Language` mudou? Quem o vê?
4. Você tem IPv6 exposto? **A sua VPN cobre IPv6, ou ele escapa pelo caminho nativo?** Isso é
   vazamento real.

⚠ **A resposta 4 é um vazamento concreto e frequente.** Muitas VPNs só cobrem IPv4 — e o IPv6
segue pelo caminho nativo, entregando seu IP real a qualquer site com registro `AAAA`.
**Verifique com um teste dedicado:**

```bash
# Teste de vazamento de IPv6 — use um serviço de diagnóstico (você é o sujeito)
echo "https://test-ipv6.com/"
echo "https://ipleak.net/"
```

5. Liste **três coisas** que mudariam se você usasse Tor em vez de VPN, e **duas** que continuariam
   iguais.

| Aspecto | VPN | Tor |
|---|---|---|
| O destino vê meu IP | | |
| Quem vê meu destino | | |
| Fingerprint do browser | | |
| Comportamento | | |
| Precisa confiar em um só? | | |

### Passo 3 — Teste de vazamento (30 min)

⚠ **Testes de vazamento medem VOCÊ.** São serviços públicos de diagnóstico.

```bash
echo "Testes para abrir no browser com a VPN ligada:"
echo "  1. https://ipleak.net/          ← IP, DNS, WebRTC"
echo "  2. https://browserleaks.com/ip  ← IPv4 e IPv6"
echo "  3. https://dnsleaktest.com/     ← vazamento de DNS"
```

Produza `vazamentos.md`:

| Teste | IPv4 vazou? | IPv6 vazou? | DNS vazou? | WebRTC revelou IP? |
|---|---|---|---|---|
| ipleak | | | | |
| browserleaks/ip | | | | |
| dnsleaktest | | | | |

**Responda:**

1. Qual vazamento você encontrou? **Todos os três testes concordam?**
2. Se o DNS vazou, **quem viu os nomes que você consultou?**
3. Se o `WebRTC` revelou IP, **a VPN está cobrindo a sua navegação de verdade?**
4. **Qual é o valor real da VPN no seu caso, com os vazamentos que você encontrou?** Responda em
   termos concretos, não em "mais segurança".

### Critérios de aceitação

- `vpn-medicao.md` com a tabela completa, antes e depois.
- Você contou **quantas das seis camadas** ficaram protegidas (a resposta correta é baixa).
- Você verificou especificamente o **vazamento de IPv6** e reportou o resultado.
- `vazamentos.md` com os três testes e a comparação entre eles.
- Você **não** assinou serviço nenhum para o lab (Opção B é suficiente).
- A resposta 4 avalia o valor **concreto** da VPN no seu caso, não em abstrato.

---

## Avaliação

1. Descreva o que acontece no fio quando você liga uma VPN, em quatro passos.
2. Complete: VPN **transfere** ____; não ____. Explique as duas partes.
3. Enumere as seis confianças que você deposita num provedor de VPN. Quais são verificáveis?
4. Por que a jurisdição do provedor importa? O que ela determina?
5. Compare VPN e Tor no número de entidades que veem sua origem **e** seu destino.
6. Por que o Tor é "estudável" e a VPN não? O que isso implica para a decisão?
7. Demolir o mito "VPN militar de 256 bits é mais segura".
8. O que a VPN resolve de verdade, em ordem de valor? Onde está o valor real?
9. Por que `VPN → Tor` faz sentido e `Tor → VPN` não?
10. Das seis camadas do Módulo 2, quantas a VPN protege? Quais ficam exatamente iguais?
11. Por que o `User-Agent` continua idêntico com VPN ativa, e quem o vê?
12. Explique o vazamento de IPv6. Por que ele é frequente e por que é grave?
13. Se você fez o teste de vazamento, qual foi o resultado? O que ele diz do valor da sua VPN?

---

**Próximo:** [Módulo 5 — Tor por dentro I: diretório e circuito](modulo-05.md)
