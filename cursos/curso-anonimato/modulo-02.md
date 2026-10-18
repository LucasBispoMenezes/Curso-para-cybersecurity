# Módulo 2 — Como a Identidade Vaza

**Carga:** 3 horas (1h30 teoria · 1h30 lab)
**Pre-requisitos:** Módulo 1

---

## Objetivos

1. Enumerar as seis camadas onde identidade aparece, da rede ao comportamento.
2. Entender por que proteger uma camada e deixar outra aberta anula a proteção.
3. Reconhecer identificadores que **persistem** versus os que mudam por sessão.
4. Medir a sua própria exposição por camada.
5. Entender por que o metadado costuma ser mais revelador que o conteúdo.

---

## ⚠ Conduta

Toda medição deste módulo é **contra você mesmo**, na sua rede. Nenhuma consulta a serviço de
terceiro em nome de outra pessoa. Nenhuma técnica de identificação aplicada a outro usuário.

⚠ **A linha, para este módulo especificamente:** entender as camadas de identificação é
privilégio de quem protege. Usar esse entendimento para **atribuir identidade a alguém** que não
consentiu é vigilância — e não está neste curso.

---

## 2.1 As seis camadas

Identidade não está em um lugar. Está em **seis**, e cada uma vaza de forma diferente.

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⑥ COMPORTAMENTO                                                      │
│   horário, ritmo de digitação, padrão de escrita, frequência         │
├─────────────────────────────────────────────────────────────────────┤
│ ⑤ APLICAÇÃO / FINGERPRINT                                            │
│   browser, tela, fontes, extensões, canvas, WebGL, timezone          │
├─────────────────────────────────────────────────────────────────────┤
│ ④ SESSÃO / CONTA                                                     │
│   login, cookie, token, identificador de conta                       │
├─────────────────────────────────────────────────────────────────────┤
│ ③ APLICAÇÃO (conteúdo)                                               │
│   SNI em TLS, cabeçalho HTTP, User-Agent, referer                    │
├─────────────────────────────────────────────────────────────────────┤
│ ② TRANSPORTE / NOME                                                  │
│   consulta DNS, resolução de nome, NTP                               │
├─────────────────────────────────────────────────────────────────────┤
│ ① REDE                                                               │
│   IP de origem, ASN, rádio (Wi-Fi), MAC (local)                      │
└─────────────────────────────────────────────────────────────────────┘
```

⚠ **A tese deste módulo, e ela é curta:** proteger uma camada e deixar outra aberta **anula a
proteção**. Você não tem "70% de anonimato" — você tem um elo intacto e cinco possibilidades de
quebra.

**Exemplos reais de anulação:**

| Você fez | Mas deixou | Resultado |
|---|---|---|
| Usou Tor | DNS do sistema (vaza em claro) | O operador local vê **o que** você consultou |
| Usou Tor Browser | Fez login na conta pessoal | O site **sabe exatamente quem você é** |
| Usou VPN | O browser vazou `WebRTC` | O site vê o **seu IP real** |
| Usou proxy SOCKS5 | `curl` resolveu o nome localmente | **O nome vazou antes do proxy** |
| Tudo certo | Mandou e-mail às 03h toda terça | A **correlação temporal** te identifica |
| Tudo certo | Escreveu no seu estilo | A **análise de escrita** te identifica |

⚠ **Leia a última tabela de novo, e note o padrão.** As duas primeiras linhas são erro de
configuração; as duas últimas são **inevitáveis por software**. Nenhuma ferramenta corrige estilo
de escrita nem horário.

---

## 2.2 Camada ① — Rede: IP, ASN, rádio

O IP de origem é o identificador mais direto — e o menos compreendido.

| O que o IP revela | Como |
|---|---|
| **Operadora / provedor** | Consulta de ASN (público, gratuito) |
| **Região aproximada** | Base de geolocalização (aproximada, e frequentemente errada) |
| **Tipo de conexão** | Residencial, comercial, móvel, datacenter, **VPN ou Tor** |
| **Coerência temporal** | Mudança de IP em horário que não corresponde |

⚠ **A linha "tipo de conexão" é a mais subestimada.** Tráfego vindo de **datacenter** é sinal de
VPN, proxy ou bot. Tráfego vindo de **rede residencial** e mudando de país em dez minutos é
incoerente. Muitos serviços classificam usuário por isso — e é a razão pela qual Tor é bloqueado
por padrão em muitos sites.

⚠ **Geolocalização de IP é chute, não medida.** Ela acerta a região e erra a cidade com frequência,
e erra completamente com VPN e com CGNAT. **Não trate geolocalização como prova** — nem a seu
favor, nem contra.

### Identificadores de camada local

| Identificador | Alcance | Importância |
|---|---|---|
| **MAC** | Só o segmento local | Identifica o **dispositivo**, não a rede — e é **rastreável** em redes públicas |
| **Nome de rede (SSID)** | Local | Histórico de Wi-Fi visitado revela trajetória |
| **Rádio celular** | Operadora | Localização por triangulação, inclusive retroativa |

⚠ **MAC e histórico de SSID merecem atenção porque sobrevivem a trocar de rede.** Um dispositivo
que se conectou a uma rede específica registra isso — e a lista de redes conhecidas é o **mapa de
lugares que você frequentou**. Em contexto de risco físico, isso é informação sensível.

```bash
# Ver os identificadores da sua própria máquina (você é o sujeito)
ip link show | grep -E '^[0-9]+:|link/ether'
nmcli -t -f NAME connection show 2>/dev/null     # redes salvas
iw dev 2>/dev/null | grep ssid
```

---

## 2.3 Camada ② — Nome: DNS

DNS é a camada que mais vaza em configuração amador — e é onde o módulo faz a demonstração prática.

**O problema estrutural:** para conectar a `exemplo.tld`, você precisa do IP. Para ter o IP, você
consulta o resolvedor. **A consulta diz qual nome você quer** — antes de qualquer conexão.

| Configuração | Quem vê o nome consultado |
|---|---|
| DNS do provedor | O **provedor** vê tudo |
| DNS corporativo | O **administrador** vê tudo |
| DNS público (8.8.8.8) | O **operador do resolvedor** vê tudo |
| DoH / DoT | Ninguém no caminho local — só o **operador do resolvedor** |
| **DNS via Tor** | Só o **relay de saída** (e ele não sabe seu IP) |

⚠ **A tabela acima resume por que "usar VPN" não resolve DNS.** Se você usa VPN e o DNS vai pelo
provedor local, o **provedor local** vê o nome que você consultou — mesmo com todo o tráfego
cifrado.

⚠ **E há o vazamento clássico do cliente Tor:** o `tor` **não** resolve DNS localmente. Ele manda
o nome no protocolo, e o **relay de saída** resolve. Mas **programas que não usam SOCKS5 com
`remote_dns` resolvem localmente** — e aí o nome vazou antes do circuito. Isso é o Módulo 3, medido.

```bash
# Qual resolvedor você usa hoje? (você é o sujeito)
cat /etc/resolv.conf
resolvectl status 2>/dev/null | head -20

# Que porta 53 está saindo da sua máquina?
sudo ss -unp | grep ':53' | head
```

---

## 2.4 Camada ③ — Aplicação: SNI e cabeçalho

Mesmo com TLS, a **aplicação vaza antes da cifra** — Módulo 9 do curso de redes.

| O que vaza | Onde | Visível em TLS 1.3? |
|---|---|---|
| **SNI** — o nome do site | ClientHello | **Sim** |
| ALPN — o protocolo | ClientHello | Sim |
| Versão do TLS, cipher suites | ClientHello | Sim |
| **User-Agent** | Cabeçalho HTTP | Não (cifrado) — mas é único |
| **Referer** | Cabeçalho HTTP | Não |
| **Cookie / token** | Cabeçalho HTTP | Não |
| Tamanho e timing | Toda a conexão | Sim |

⚠ **O `User-Agent` merece destaque: ele é cifrado pelo TLS, mas é enviado ao servidor — e é
frequentemente único.** Um `User-Agent` que combina versão de sistema, versão de browser e
extensões identifica você **no servidor**, não no caminho. O Tor Browser padroniza isso por
projeto; outros browsers não.

⚠ **O SNI é o que sobra em claro, e é por isso que existe ECH** (Encrypted Client Hello). Enquanto
ECH não é universal, o **nome do site que você acessou** é visível para quem observa o caminho —
inclusive com Tor? **Não com Tor**, porque o circuito cifra tudo até o relay de saída. Mas com
VPN: **sim**, o operador de rede vê o SNI.

**A comparação que importa:**

| | Quem vê o SNI |
|---|---|
| HTTPS direto | Provedor, administrador de rede local |
| HTTPS por VPN | **Provedor local não vê**; a VPN vê |
| HTTPS por Tor | **Ninguém no caminho**; o relay de saída vê o tráfego já decifrado |

---

## 2.5 Camada ⑤ — Fingerprint do browser

Esta é a camada que **derrota o anonimato de rede**, e é o assunto do Módulo 8. Aqui, só o mapa.

| Vetor | O que revela | Quão único |
|---|---|---|
| **User-Agent** | Sistema, browser, versão | Médio |
| **Lista de fontes** | Sistema, idioma, software instalado | **Alto** |
| **Tela e densidade** | Modelo, configuração | Médio |
| **Timezone** | Região — e **contradiz** o circuito | **Alto** |
| **Idiomas (`Accept-Language`)** | Origem, preferência | Médio |
| **Canvas / WebGL** | GPU, driver, ruído de renderização | **Muito alto** |
| **Extensões instaladas** | Perfil pessoal | **Muito alto** |
| **Falhas de renderização de fonte** | Sistema exato | Alto |
| **`WebRTC`** | **IP real, mesmo atrás de VPN/Tor** | Crítico |

⚠ **A linha do `WebRTC` é a mais crítica e a mais ignorada.** `WebRTC` faz descoberta de IP para
estabelecer conexão ponto a ponto — e frequentemente **revela o IP real mesmo atrás de VPN**. Um
circuito Tor perfeito com `WebRTC` ativo no browser padrão é **anonimato nulo**.

```bash
# Sua superfície de fingerprint (o serviço EFF mede VOCÊ, não terceiro)
# Abra no browser que você quer testar:
#   https://coveryourtracks.eff.org/
# Anote o resultado e guarde para o Módulo 8.
```

⚠ **O teste é sobre você, e é o exercício central do curso.** Não é medição de outro usuário.

---

## 2.6 Camada ⑥ — Comportamento

A camada que nenhuma ferramenta corrige.

| Padrão | Como identifica |
|---|---|
| **Horário** | Você escreve sempre às 03h de terça |
| **Ritmo** | Latência, pausas, velocidade de digitação |
| **Estilo de escrita** | Vocabulário, pontuação, erro recorrente, idioma |
| **Frequência** | Você responde em 4 minutos, sempre |
| **Escolha de palavra** | Termo técnico específico, regionalismo |
| **Metadado de arquivo** | Autor, software, versão, fuso no arquivo |
| **Tamanho** | Você escreve 3 parágrafos; outro escreveria 1 |

⚠ **A análise de estilo de escrita (stylometry) é técnica real e usada em investigação.** Em
conjunto de texto suficiente, ela identifica autor com precisão relevante — inclusive entre
pessoas que escrevem o mesmo idioma.

⚠ **Metadado de arquivo é o vazamento mais esquecido.** Um documento do Word carrega autor,
empresa, versão do software, tempo de edição, e às vezes comentários de revisão. Jornalista que
publica documento "anonimizado" sem limpar metadado **entrega a fonte**.

```bash
# Ver metadado de um arquivo seu
exiftool documento.docx 2>/dev/null || \
  unzip -p documento.docx docProps/core.xml 2>/dev/null

# PDF
pdfinfo documento.pdf 2>/dev/null | head -20
exiftool documento.pdf 2>/dev/null | head -20
```

⚠ **Comportamento é a camada que faz "anonimato técnico perfeito" não bastar.** Você pode ter
circuito, browser e DNS perfeitos e ainda ser identificado por **como** escreve e **quando**
escreve. É por isso que o Módulo 9 (resistência a correlação) e o Módulo 12 (sua superfície) são
o fecho do curso.

---

## 2.7 LAB — Meça as suas seis camadas

**Duração:** 90 min

⚠ **Você mede você mesmo.** Anote tudo: no Módulo 12 você refaz e compara.

### Passo 1 — Camada ① e ② (20 min)

```bash
mkdir -p ~/anon-lab/lab2 && cd ~/anon-lab/lab2

{
echo "=== DATA ==="; date -Is
echo "=== IP LOCAL ==="; ip -br addr
echo "=== ROTAS ==="; ip route show
echo "=== RESOLVEDOR ==="; cat /etc/resolv.conf
echo "=== MAC ==="; ip link show | grep -E '^[0-9]+:|link/ether'
echo "=== REDES WI-FI SALVAS ==="; nmcli -t -f NAME connection show 2>/dev/null
} | tee camada-1-2.txt
```

**Responda em `medicao.md`:**

| Item | Valor observado | O que ele revela sobre você |
|---|---|---|
| IP local | | |
| MAC | | |
| Resolvedor configurado | | |
| Nº de redes Wi-Fi salvas | | |

1. Seu MAC identifica o **dispositivo**. Em quantas redes ele já foi visto?
2. Seu resolvedor é seu provedor, corporativo, ou público? **Quem vê tudo que você consulta?**

⚠ **A resposta 2 é o objetivo do lab.** Se o resolvedor é o do provedor, ele vê cada nome que
você resolve. Isso é a camada ② aberta.

### Passo 2 — Camada ② na captura (25 min)

⚠ **Capture somente o seu próprio tráfego, na sua máquina.**

```bash
# Terminal 1 — capture DNS
sudo tcpdump -i any -nn -s 0 -w dns-proprio.pcap 'udp port 53 or tcp port 53' &
TCPD=$!

sleep 1
# Gere consultas
dig exemplo.com > /dev/null 2>&1
dig github.com > /dev/null 2>&1
curl -s -o /dev/null https://example.org
sleep 2

kill $TCPD 2>/dev/null

# Leia os nomes que VOCÊ consultou
tshark -r dns-proprio.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name 2>/dev/null | sort -u
```

**Responda:**

1. Os nomes aparecem em claro na captura? **Quantos?**
2. Se você usar DoH a partir de agora, eles apareceriam? **Teste:**

```bash
# Testar consulta cifrada (requer curl com suporte a DoH; ajuste se necessário)
curl -s -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=exemplo.com&type=A' | head -c 200
echo
```

3. Com DoH, quem vê o nome consultado? **Quem sai ganhando e quem continua vendo?**
4. **DoH resolve o vazamento para o provedor local?** E para o operador do resolvedor?

⚠ **A resposta 4 é a mais importante do passo.** DoH cifra **entre você e o resolvedor** — o
provedor local deixa de ver. Mas **o operador do resolvedor passa a ver tudo.** Você não eliminou
a confiança; você a **transferiu**.

### Passo 3 — Camada ③ com e sem proxy (25 min)

⚠ **Você vai usar `curl` e um proxy local seu.** Nada contra terceiro.

```bash
# 1. Acesse um serviço que reporta o que você envia
curl -s https://httpbin.org/headers | head -20

# 2. Veja o User-Agent que você mandou
curl -s https://httpbin.org/user-agent

# 3. Mude o User-Agent e veja a diferença
curl -s -A "UA-falso-de-teste" https://httpbin.org/user-agent

# 4. Compare com o Tor Browser (se tiver) — o UA do Tor Browser é padronizado
```

Produza `cabecalhos.md`:

| Campo enviado | Seu valor | É único? | Como apareceria ao servidor |
|---|---|---|---|
| User-Agent | | | |
| Accept-Language | | | |
| Accept-Encoding | | | |
| Referer | | | |
| Cookie | | | |

**Responda:**

1. Qual dos campos enviados é o **mais identificável** no seu caso?
2. Um servidor que recebe todos esses campos — **quanto ele sabe sobre você?**
3. **O que muda se você usar HttpOnly e bloquear cookie de terceiro?** O que **não** muda?

### Passo 4 — Camada ⑤: fingerprint (10 min)

```bash
# No browser que você quer testar, abra:
echo "https://coveryourtracks.eff.org/"
echo "https://browserleaks.com/webrtc"      # ← atenção especial
echo "https://amiunique.org/"
```

Produza `fingerprint.md`:

| Teste | Resultado | Observação |
|---|---|---|
| Cover Your Tracks — quão única é a impressão? | | |
| Tem rastreadores bloqueados? | | |
| **WebRTC revela IP real?** | | |
| AmIUnique — bits de identificação | | |

⚠ **Se o teste de `WebRTC` revelar o seu IP real, você acabou de encontrar o vazamento crítico do
módulo.** Mesmo em rede corporativa com proxy, `WebRTC` freqüentemente escapa. Anote — o Módulo 7
volta nisso com o antídoto.

### Passo 5 — Camada ⑥: comportamento (10 min)

Sem ferramenta. Responda por escrito:

1. Em que horário você costuma escrever? **Esse padrão te identificaria numa auditoria?**
2. Você tem uma expressão, um regionalismo, ou um erro recorrente de escrita? **Qual?**
3. Se você publicasse um documento "anônimo", **que metadado ele carregaria?** Teste:

```bash
# Crie um documento e veja o que ele carrega de você
echo "teste" > teste.txt
# Para docx (se tiver libreoffice ou word):
# libreoffice --headless --convert-to docx teste.txt 2>/dev/null
exiftool teste.docx 2>/dev/null | head -20 || echo "(sem docx — teste com um arquivo seu)"
```

4. **Você limpa metadado antes de publicar?** Se não, o que isso revela a quem receber?

### Critérios de aceitação

- `medicao.md` com as seis camadas medidas, com os comandos usados.
- Você **capturou os seus próprios nomes DNS** e contou quantos saíram em claro.
- Você explicou que **DoH transfere confiança, não a elimina**.
- `cabecalhos.md` com o campo mais identificável do seu caso.
- `fingerprint.md` com o resultado do teste de `WebRTC` — **positivo ou negativo** (a resposta
  negativa também é achado).
- Você identificou um padrão comportamental próprio que a ferramenta não corrige.
- Você testou se um arquivo seu carrega metadado de autor.
- Nenhuma medição envolveu terceiro.

---

## Avaliação

1. Enumere as seis camadas de identificação, de baixo para cima.
2. Explique por que "70% de anonimato" não existe. Qual é a formulação correta?
3. Por que DNS é a camada que mais vaza em configuração amador? O que a consulta revela **antes**
   da conexão?
4. O que é `remote_dns` no SOCKS5 e por que a ausência dele vaza o nome?
5. Por que "VPN resolve DNS" é falso? Quem vê a consulta em cada configuração?
6. DoH cifra a consulta e transfere a confiança para quem?
7. Por que geolocalização de IP deve ser tratada como chute e não como medida?
8. Por que o tipo de conexão (residencial, datacenter) é um identificador? Como isso afeta usuário
   de Tor na prática?
9. Por que o SNI sobrevive em claro, e por que ele é irrelevante quando se usa Tor?
10. Por que o `User-Agent` é identificável **no servidor** e não no caminho?
11. **Por que `WebRTC` é o vazamento mais crítico da camada ⑤?**
12. Explique por que a camada ⑥ (comportamento) não pode ser corrigida por software. Dê três
    exemplos.
13. Por que MAC e histórico de Wi-Fi são sensíveis mesmo em rede cifrada?

---

**Próximo:** [Módulo 3 — Proxies: HTTP, SOCKS4, SOCKS5](modulo-03.md)
