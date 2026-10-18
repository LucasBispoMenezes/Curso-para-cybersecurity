# Módulo 7 — Anatomia do Vazamento

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Enumerar os **oito canais de vazamento** de um cliente Tor e como testar cada um.
2. Entender por que o Tor Browser é configurado como é — cada padrão resolve um vazamento.
3. Corrigir vazamentos na ordem certa, do mais crítico ao menos.
4. Medir a sua própria superfície antes e depois, com evidência.
5. Reconhecer que alguns vazamentos **não têm solução técnica**.

---

## ⚠ Conduta

Todo teste deste módulo é **contra você mesmo**, em serviço público de diagnóstico. Nenhum teste
aponta para outra pessoa, nenhum envolve usuário de Tor, nenhum identifica ninguém.

⚠ **Cuidado com o que você salva.** Testes de vazamento geram log em serviço de terceiro. Use
serviço de diagnóstico conhecido, e **não** faça teste em contexto que você não quer associar a
você — porque o teste de vazamento, ironicamente, pode ser um vazamento.

---

## 7.1 Os oito canais

```
┌───────────────────────────────────────────────────────────────────────┐
│ ⑧ COMPORTAMENTO     horário, estilo, ritmo, metadado de arquivo       │
│ ⑦ EXTENSÃO          add-on que vaza, sync, UI customizada             │
│ ⑥ FINGERPRINT       canvas, WebGL, fonte, tela, timezone              │
│ ⑤ WEBRTC            IP real, mesmo atrás de Tor/VPN   ← CRÍTICO       │
│ ④ DNS               resolução local, mesmo com proxy                  │
│ ③ IPv6              caminho nativo, ignorado pelo túnel               │
│ ② CONTA / SESSÃO    login, cookie, token, e-mail de recuperação       │
│ ① APLICAÇÃO         SNI, cabeçalho, requisição fora do circuito       │
└───────────────────────────────────────────────────────────────────────┘
```

⚠ **A ordem de cima para baixo é a ordem de dificuldade de corrigir.** Os de baixo são
configuração; os de cima são **arquitetura e disciplina**.

---

## 7.2 Os críticos — ⑤ e ②

### ⑤ WebRTC — o vazamento que anula tudo

`WebRTC` faz descoberta de IP para conexão ponto a ponto. Ele usa o **candidato ICE**, que
frequentemente inclui **o endereço da interface local** — e a interface local tem o **seu IP real**,
não o IP do circuito Tor.

```
Circuito Tor montado                      WebRTC ativo no browser
┌──────┐                                  ┌──────┐
│ você │──▶[guarda]──▶[meio]──▶[saída]──▶  │ você │──direto──▶ serviço
└──────┘                                  └──────┘
    o site vê o IP da SAÍDA                  o site vê SEU IP REAL
```

⚠ **O vazamento é completo.** Não importa quantos saltos o circuito tem — o `WebRTC` fala pelo
caminho nativo, **fora** do circuito.

**Como testar:**

```bash
# Testes que medem VOCÊ
echo "https://browserleaks.com/webrtc"
echo "https://ipleak.net/"
```

**O antídoto:**

| Ambiente | Como |
|---|---|
| **Tor Browser** | `WebRTC` **desabilitado** por padrão no modo padrão, ou restrito a proxy |
| Firefox comum | `media.peerconnection.enabled = false` em `about:config` |
| Chrome / Edge | `chrome://flags/#disable-webrtc` ou extensão |
| Qualquer browser | Se não precisa de vídeo/áudio P2P, **desligue** |

⚠ **A pergunta honesta:** você precisa de `WebRTC`? Se a resposta é "não sei o que é isso", você
não precisa — e deve desligar. É o vazamento com melhor relação correção/risco que existe.

### ② Conta e sessão — o vazamento mais comum

⚠ **Este é o mais frequente na prática, e não tem solução técnica.**

Se você acessa uma conta pessoal por Tor, **o site sabe exatamente quem você é**. O Tor protegeu
o caminho; você mesmo entregou a identidade no login.

| Situação | O que o serviço sabe |
|---|---|
| Login por Tor na conta pessoal | **Seu nome — o Tor não ajuda** |
| E-mail de recuperação na conta anônima | O endereço liga a duas identidades |
| Mesmo apelido em dois fóruns | Correlação por escolha |
| Assinatura em e-mail anônimo | Dispositivo, software, fuso |
| Telefone para "verificação" | **Identifica você completamente** |

⚠ **A linha do telefone merece destaque.** Qualquer serviço que exija número de celular para
"verificação" liga a identidade anônima ao número real. Não há contorno técnico legítimo — a
solução é **não usar** o serviço para o que exige anonimato, ou usar um número que não seja
ligado a você (o que tem implicação legal em alguns contextos e não é o caminho deste curso).

**A regra que resolve ②:**

> **Separe identidades por compartimento.** Conta anônima nunca toca conta pessoal. Nenhum e-mail
> de recuperação cruzado, nenhum telefone, nenhum apelido reutilizado, nenhuma foto, nenhum estilo
> de escrita idêntico.

⚠ **A separação de identidade é disciplina, não configuração.** É onde a maioria falha, e é o que
o Módulo 12 vai medir em você.

---

## 7.3 Os técnicos — ④, ③, ①

### ④ DNS — o vazamento com solução

Já medido no Módulo 3, e resolvido de três formas:

| Solução | Como funciona | Vaza para quem |
|---|---|---|
| `--socks5-hostname` / `ATYP=03` | O proxy resolve | Só o proxy |
| **Tor com `ATYP=03`** | O **relay de saída** resolve | Só a saída |
| `DNSPort` do Tor | O Tor resolve internamente, sem sair | — |
| DoH pelo Tor | Resolve cifrado, via circuito | O resolvedor DoH |

⚠ **`DNSPort` no Tor é a solução completa:** você configura o Tor para escutar DNS em uma porta
local, e todo o sistema resolve **por dentro do circuito**. Nada sai em claro.

```bash
# No torrc:
# DNSPort 5353
# Depois, aponte o resolvedor para 127.0.0.1:5353
```

### ③ IPv6 — o túnel que não cobre tudo

Se a sua interface tem IPv6 global e o túnel (Tor ou VPN) só cobre IPv4, o IPv6 escapa pelo
caminho nativo.

⚠ **E o escape é silencioso.** Você acha que está no circuito; o site com registro `AAAA` recebe
seu IPv6 real.

**Antídoto:**

```bash
# Verificar se você tem IPv6 global
ip -6 addr show scope global

# Desabilitar IPv6 no kernel (para o laboratório)
# /etc/sysctl.d/99-sem-ipv6.conf:
#   net.ipv6.conf.all.disable_ipv6 = 1
#   net.ipv6.conf.default.disable_ipv6 = 1

# Tor Browser já trata isso; outros browsers podem preferir IPv6
```

⚠ **Não desabilite IPv6 permanentemente sem entender o que você usa.** O correto é **verificar se
o seu túnel o cobre** — e o teste de vazamento diz isso.

### ① Aplicação fora do circuito

O vazamento que acontece quando **um programa não usa o proxy**.

| O que vaza | Por quê |
|---|---|
| Requisição que não passa pelo SOCKS5 | Programa mal configurado |
| `curl` sem `--socks5` | Óbvio, e frequente |
| Atualizador automático do browser | Não usa o proxy do browser |
| Cliente de e-mail | Configuração separada |
| Time sync (NTP) | Vai direto, revela fuso e atividade |
| Extensão que faz requisição própria | Fora do escopo do proxy principal |

```bash
# Ver o que está saindo SEM passar pelo Tor (você mede você)
# 1. Capture tudo na sua interface
sudo tcpdump -i any -nn -s 0 -c 500 -w tudo.pcap 'not port 9050' &
TPID=$!
sleep 1
# use o sistema normalmente por 30s
sleep 30
kill $TPID

# 2. O que saiu que NÃO é Tor?
tshark -r tudo.pcap -T fields -e ip.dst 2>/dev/null | sort | uniq -c | sort -rn | head -20
```

⚠ **A resposta pode assustar — e esse é o objetivo.** Programas saem pela interface nativa sem
respeitar o proxy, porque **o proxy é por aplicação, não por sistema**. A solução completa é
rotear no nível de sistema (o Módulo 11 discute), não configurar aplicação por aplicação.

---

## 7.4 Os de arquitetura — ⑥, ⑦, ⑧

Estes são o assunto do Módulo 8 (⑥ e ⑦) e do Módulo 9 (⑧). Aqui, só o mapa.

| Canal | Por que é de arquitetura |
|---|---|
| ⑥ Fingerprint | Vem do hardware, sistema e configuração instalada |
| ⑦ Extensão | Cada add-on é uma superfície nova; add-on único identifica |
| ⑧ Comportamento | É a pessoa, não o software |

⚠ **A tese do módulo, e ela é dura:** os canais ⑤, ② e ⑧ **não têm solução técnica completa**.
⑤ e ② têm mitigação com disciplina; ⑧ tem mitigação parcial (variar horário, alterar estilo) e
nunca eliminação.

**É por isso que "usar Tor" não é a resposta.** É uma parte da resposta, e a parte mais fácil.

---

## 7.5 LAB — Relatório de vazamento, com evidência

**Duração:** 150 min

⚠ **Você é o sujeito de todos os testes.** Nenhum terceiro, nenhum usuário de Tor, nenhuma
identificação de alguém.

### Passo 1 — Linha de base com configuração padrão (40 min)

**Use o browser comum, sem Tor, e meça tudo.**

```bash
mkdir -p ~/anon-lab/lab7 && cd ~/anon-lab/lab7

echo "=== TESTES A ABRIR NO BROWSER PADRÃO ==="
cat <<'EOF'
1. https://browserleaks.com/webrtc      ← IP real?
2. https://ipleak.net/                  ← IPv4, IPv6, DNS, WebRTC
3. https://browserleaks.com/ip          ← IPv6 vazou?
4. https://dnsleaktest.com/             ← DNS vazou? (rode "Extended test")
5. https://coveryourtracks.eff.org/     ← fingerprint
6. https://amiunique.org/               ← bits únicos
EOF
```

Produza `baseline.md`:

| Teste | Resultado | Vazou? | Observação |
|---|---|---|---|
| WebRTC revela IP | | | |
| IPv4 | | | |
| IPv6 | | | |
| DNS — quais resolvedores aparecem | | | |
| Fingerprint — unicidade | | | |
| AmIUnique — bits | | | |

⚠ **Anote os resolvedores que aparecem no `dnsleaktest`.** Eles revelam quem vê suas consultas.
Se for o seu provedor, ele vê tudo.

### Passo 2 — Compare: `curl` + Tor vs. Tor Browser (40 min)

⚠ **A comparação mais instrutiva do módulo.**

**A. `curl` por Tor (só o protocolo, sem proteção de fingerprint):**

```bash
echo "=== curl por Tor: o que o servidor vê ==="
curl -s --socks5-hostname 127.0.0.1:9050 https://httpbin.org/headers | head -20
echo
curl -s --socks5-hostname 127.0.0.1:9050 https://httpbin.org/ip
```

**B. Tor Browser (a proteção completa):**

```
Abra o Tor Browser e repita os MESMOS testes do Passo 1
(na janela padrão do Tor Browser, sem maximizar)
```

Produza `comparacao.md`:

| Teste | Browser padrão | curl por Tor | Tor Browser | O que mudou |
|---|---|---|---|---|
| IP visto pelo destino | | | | |
| WebRTC revela IP | | | | |
| IPv6 | | | | |
| Fingerprint unicidade | | | | |
| User-Agent | | | | |
| Timezone | | | | |
| Resolução de tela relatada | | | | |

**Responda:**

1. **O `curl` por Tor esconde o IP?** Ele esconde o fingerprint?
2. **Qual a diferença prática** entre os dois? Por que o Tor Browser existe?
3. O `WebRTC` foi resolvido pelo Tor Browser? **Como?**
4. A resolução de tela relatada pelo Tor Browser é a sua real? **Por que não?**
5. O timezone relatado é o seu? **Se não for, que vazamento o Tor Browser está corrigindo?**

⚠ **A resposta 4 é reveladora:** o Tor Browser **arredonda** a resolução de janela para múltiplos
comuns, e **não** a informa exatamente. É por isso que ele pede que você **não maximize** — a
janela maximizada em tela não padrão é um fingerprint forte.

### Passo 3 — Corrija e re-meça (50 min)

⚠ **Ordem de correção: do crítico para o leve.**

| Ordem | Correção | Como |
|---|---|---|
| 1 | Desligar `WebRTC` | `about:config` → `media.peerconnection.enabled = false` |
| 2 | Verificar IPv6 | Testar; se vaza, desabilitar ou confirmar cobertura pelo túnel |
| 3 | Resolver DNS pelo túnel | `DNSPort` no Tor, ou confirmar `ATYP=03` |
| 4 | Fechar o que não usa o proxy | Identificar com captura; desabilitar ou configurar |
| 5 | Limpar metadado antes de publicar | `mat2`, `exiftool` |
| 6 | Reduzir superfície de extensão | Remover o que não usa |

```bash
# Correção 5 — limpar metadado (instale mat2, ou use exiftool)
sudo apt install -y mat2 exiftool

# Demonstração: crie um arquivo com metadado e limpe
echo "documento de teste" > doc.txt
# (converta para docx/pdf se tiver)
libreoffice --headless --convert-to docx doc.txt 2>/dev/null || true

echo "=== ANTES ==="
exiftool doc.docx 2>/dev/null | head -15

mat2 doc.docx 2>/dev/null || exiftool -all= -overwrite_original doc.docx
rm -f doc.cleaned.docx

echo "=== DEPOIS ==="
exiftool doc.docx 2>/dev/null | head -15
```

Produza `correcoes.md`:

| # | Correção aplicada | Antes | Depois | Resolvido? |
|---|---|---|---|---|
| 1 | WebRTC | | | |
| 2 | IPv6 | | | |
| 3 | DNS | | | |
| 4 | Aplicação fora do proxy | | | |
| 5 | Metadado | | | |
| 6 | Extensões | | | |

**Responda:**

1. **Quantos dos oito canais você resolveu?** Quantos continuam abertos?
2. Qual canal **não tem solução técnica**? O que você faz a respeito?
3. Você consegue afirmar que está "anônimo" agora? **Por que não?**
4. **Qual canal é o mais provável de te identificar na prática**, no seu caso?

### Passo 4 — O relatório de vazamento (20 min)

Produza `relatorio-vazamento.md` — este é o entregável avaliado do módulo:

```markdown
# Relatório de Vazamento — Autoavaliação
Data: 2026-10-18     Sujeito: <você>

## 1. Metodologia
Ferramentas, ambiente, serviços de diagnóstico usados.

## 2. Canais testados
| Canal | Testado? | Resultado | Evidência |

## 3. Vazamentos encontrados
| Vazamento | Severidade | Como foi detectado | Correção aplicada | Resolvido? |

## 4. Canais sem solução técnica
| Canal | Por que não tem solução | Mitigação adotada |

## 5. Superfície residual
O que continua exposto DEPOIS das correções.

## 6. Limitações deste relatório
⚠ Obrigatória. Ex.: não testei de outra rede; não testei com outro
hardware; não testei canal ⑧ (comportamento) de forma mensurável;
o teste em si gera log em serviço de terceiro.
```

### Critérios de aceitação

- `baseline.md` com **todos** os testes do Passo 1 medidos.
- `comparacao.md` mostrando a diferença entre `curl`+Tor e Tor Browser — três ferramentas, não duas.
- Você explicou por que o Tor Browser **arredonda** a resolução e pede para não maximizar.
- `correcoes.md` com as seis correções, **ordenadas por severidade**.
- Você identificou **quantos canais têm solução técnica e quantos não**.
- `relatorio-vazamento.md` com as seis seções e a **seção de limitações** preenchida.
- Você **não** afirma estar anônimo ao final — você afirma o que continua exposto.

---

## Avaliação

1. Enumere os oito canais de vazamento. Qual a ordem de severidade?
2. Explique por que `WebRTC` anula um circuito Tor. Por que ele escapa do túnel?
3. Por que o vazamento de conta/sessão **não tem solução técnica**? O que resolve?
4. Por que o número de telefone é um vazamento definitivo?
5. Descreva `DNSPort` e por que ele é a solução completa para DNS.
6. Por que o IPv6 escapa do túnel? Como você testa se ele escapa?
7. Por que programas vazam mesmo com proxy configurado? Qual é a solução completa?
8. Por que o Tor Browser arredonda a resolução de janela? O que isso evita?
9. Liste três fontes de metadado de arquivo e por que publicar sem limpar é grave.
10. Por que os canais ⑥, ⑦ e ⑧ são "de arquitetura"? O que os distingue dos técnicos?
11. Qual é a diferença prática entre `curl`+Tor e Tor Browser? Por que confundir os dois é o erro
    mais comum do tema?
12. Por que "testar vazamento" pode ser, ele mesmo, um vazamento? O que isso implica?

---

**Próximo:** [Módulo 8 — Fingerprinting e superfície de browser](modulo-08.md)
