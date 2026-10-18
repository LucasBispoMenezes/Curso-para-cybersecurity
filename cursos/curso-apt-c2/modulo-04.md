# Módulo 4 — Arquitetura de C2 em Camadas

**Carga:** 3 horas (1h15 teoria · 1h45 lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Descrever a arquitetura de C2 em camadas e a função de cada uma.
2. Explicar **o que cada camada revela** a quem defende.
3. Entender os modelos de canal e o que cada um custa ao defensor.
4. Reconhecer, no kit de baixo impacto, a **estrutura** de mensagem de um protocolo de implant.
5. Justificar por que bloqueio de indicador raramente encerra uma operação de APT.

---

## ⚠ A linha deste módulo, explicitada

Este módulo explica **como a arquitetura de C2 é desenhada** — para que você possa **detectá-la**
e **entendê-la em relatório de caso**.

**O que este módulo e seu lab fazem:**

| Faz | Não faz |
|---|---|
| Explica as camadas e a função de cada uma | Não instrui a montar nenhuma delas |
| Analisa estrutura de mensagem **em captura** | Não fornece implant funcional |
| Usa **amostra não funcional** em `127.0.0.1` | Não usa nem simula infraestrutura real |
| Ensina o que revela o que, para detecção | Não ensina a operar ou a esconder operação |

⚠ **O kit de baixo impacto (`kit/`)** deste curso contém artefatos que **demonstram formato** e
**rodam apenas em loopback**. Cada um tem `verifica-limites.sh`, que **prova por análise do
binário** que não há execução de comando, não há persistência, e não há socket externo. Você não
precisa confiar na declaração — pode auditar.

⚠ **Nenhuma camada desta arquitetura é montada neste curso.** Nem domínio, nem VPS, nem
redirecionador, nem servidor. Você analisa o que existe em relatório público e em captura própria.

---

## 4.1 Por que a arquitetura é em camadas

Um implante não fala com o operador. Ele fala com **algo** que encaminha. Isso existe por três
razões, e cada uma tem consequência defensiva.

| Razão | Problema que resolve | **O que isso revela a você** |
|---|---|---|
| **Resiliência** | Derrubar um ponto não mata a operação | O implante tem **lista de fallback** — bloqueio de um destino não encerra |
| **Separação de identidade** | O operador se esconde atrás de intermediário | O IP que você vê **provavelmente não é** o ator |
| **Discrição por reputação** | Domínio reputado não é bloqueado | Domínio de terceiro confiável é o melhor esconderijo |

⚠ **A primeira linha é a que você precisa internalizar.** Se o implante tem lista de fallback,
**bloquear o domínio que você encontrou não contém nada** — só faz o implante tentar o próximo,
possivelmente de forma mais ruidosa (e aí você ganha uma oportunidade de detecção, o que é bom).

---

## 4.2 As camadas e o que cada uma revela

```
┌──────────────────────────────────────────────────────────────────────────┐
│ CAMADA 0 — IMPLANTE (no host da vítima)                                  │
│  · Lista de destino, cronograma, perfil de tráfego                       │
│  · ⚠ REVELA: o que você encontra ao analisar o host. É o que você TEM.    │
│  · Defesa: análise de artefato, análise de memória, telemetria de host   │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │  canal (HTTPS, DNS, nuvem, RMM, custom)
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ CAMADA 1 — PONTO DE ENTRADA / REDIRECIONADOR                             │
│  · Domínio ou IP que o implante contacta                                 │
│  · Serviço de terceiro legítimo usado como relay                         │
│  · ⚠ REVELA: pouca coisa. Geralmente descartável e trocável.             │
│  · Defesa: reputação, padrão de registro, certificado  ← Módulo 6        │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │  proxy / encaminhamento
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ CAMADA 2 — C2 PRIMÁRIO                                                   │
│  · Onde o operador realmente lê e escreve                                │
│  · Frequentemente em região ou provedor distinto da vítima               │
│  · ⚠ REVELA: geografia, provedor, padrão de escolha do ator              │
│  · Defesa: raramente alcançável diretamente; útil para atribuição        │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │  acesso do operador
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ CAMADA 3 — PAINEL / OPERADOR                                             │
│  · Interface humana: lista de vítima, tarefa, upload de ferramenta       │
│  · ⚠ REVELA: TTP de operação, ferramenta, idioma, fuso de atividade      │
│  · Defesa: só por inteligência de terceiro ou erro operacional do ator   │
└──────────────────────────────────────────────────────────────────────────┘
```

⚠ **A conclusão prática, e é dura:** você quase sempre trabalha na **camada 0**. É onde está o
artefato, é onde está a telemetria, é onde você consegue agir. As camadas 1 a 3 são úteis para
**atribuição e contexto** — não para bloqueio.

⚠ **Por isso "bloqueie o domínio" é resposta incompleta.** Ela age na camada 1, que é a mais
descartável de todas.

### O que você pode fazer em cada camada

| Camada | Ação possível | Vale a pena? |
|---|---|---|
| 0 | Detectar comportamento, analisar artefato, remover, caçar persistência | **Sim — é o seu trabalho** |
| 1 | Bloquear, monitorar acesso, correlacionar com outras vítimas | Sim, para **visibilidade** — não para conter |
| 2 | Registrar para atribuição | Contexto, não ação |
| 3 | Inteligência de terceiro | Contexto |

---

## 4.3 Modelos de canal e o que cada um custa ao defensor

| Modelo | Desvantagem do atacante | **Dificuldade do defensor** |
|---|---|---|
| **Domínio próprio, HTTPS** | Precisa registrar; aparece no DNS | **Baixa** — DNS + SNI + reputação |
| **Domínio próprio, rotação (fluxo)** | Operação mais complexa | Média — exige correlação temporal |
| **Serviço de nuvem legítimo** | Depende de política de terceiro | **Alta** — domínio reputado, criptografado |
| **Serviço de código / paste** | Limitação de uso; pode ser removido | Alta |
| **Rede social / mensagem** | Notificação ao usuário | Alta |
| **DNS** | Baixa banda, alta latência | Média — visível, mas volumoso |
| **ICMP / protocolo incomum** | Baixa banda; fácil de bloquear | Baixa — anômalo por definição |
| **RMM legítimo** | Precisa instalar; inventário pode pegar | **Altíssima** — indistinguível de uso legítimo |

⚠ **As duas linhas "Alta/Altíssima" definem a defesa moderna.** Contra canal em serviço reputado:
**você não detecta pelo destino, você detecta pelo comportamento do host** — o processo que fala,
o volume, o horário, a ausência de outro tráfego.

⚠ **A linha RMM é a que mais aparece em caso real e a que menos se discute.** O implante não
precisa de backdoor próprio se o atacante instalar um RMM assinado. **A defesa não é detecção de
rede — é inventário e allowlist.** Se você não sabe quais RMM existem na sua rede, você não
detecta essa camada.

---

## 4.4 Perfil: o que o implante revela por comportamento

Aqui está o que você consegue extrair **sem** decifrar nada (e o Módulo 5 aprofunda).

| Observável | O que revela | O que você faz |
|---|---|---|
| **Periodicidade** | Beacon: intervalo base e jitter | Detecção por CV (perfil) |
| **Tamanho de requisição** | Check-in (pequeno, constante) vs. task (variável) | Assinatura de perfil |
| **Tamanho de resposta** | "Sem trabalho" (mínimo) vs. comando | Idem |
| **Horário** | Fuso do operador; janela de atividade | Correlação temporal |
| **Duração** | Sessão curta (check-in) vs. longa (task) | Perfil |
| **Volume total** | Coleta pequena vs. exfiltração | Baseline |
| **Destino** | Infraestrutura; consistência entre vítimas | Correlação (Módulo 6) |
| **Sequência** | Ordem das fases = cadeia de ataque | Mapeamento ATT&CK |

⚠ **A coluna "horário" é subestimada.** A atividade reflete o **fuso do operador**. Um beacon que
"acorda" sempre às 02h UTC em uma organização que opera em UTC-3 está ativo às 23h locais — e isso
é consistente com um operador em outro continente. **Isso é contexto para atribuição, não prova.**

---

## 4.5 LAB A — Auditar o kit de baixo impacto

**Duração:** 45 min
**Objetivo:** confirmar por análise que o kit **não faz** o que não deve — antes de usá-lo.

⚠ **Este passo é obrigatório e vem primeiro.** Você não confia na declaração; você verifica.

### Passo 1 — Compile e audite

```bash
mkdir -p ~/apt-lab/lab4 && cd ~/apt-lab/lab4
cp -r ~/apt-lab/kit . 2>/dev/null || cp -r ../kit . 2>/dev/null || {
    echo "Kit não encontrado — será fornecido junto com este módulo."
    echo "Se você não tem o kit, siga para o Lab B, que é análise de captura."
    exit 0
}

cd kit
make 2>/dev/null || for f in *.c; do gcc -O2 -o "${f%.c}" "$f" 2>/dev/null; done

chmod +x verifica-limites.sh
./verifica-limites.sh
```

### Passo 2 — Auditando à mão

⚠ **Não aceite o script sem entender. Reproduza a verificação.**

```bash
# 1. Não executa comando?
for b in beacon_simulado sessao_simulada perfil_simulado; do
    [ -x "$b" ] || continue
    echo "--- $b ---"
    nm -D "$b" 2>/dev/null | grep -E '\b(exec[lv]p?e?|system|popen|fork)\b' \
      && echo "  ⚠ ENCONTROU execução de comando" \
      || echo "  ✓ sem execução de comando"

    # 2. Não usa criptografia real?
    nm -D "$b" 2>/dev/null | grep -iE 'EVP_|AES_|DES_|RSA_|libcrypto' \
      && echo "  ⚠ usa biblioteca de criptografia" \
      || echo "  ✓ sem criptografia real"

    # 3. Não persiste?
    strings -n 6 "$b" | grep -iE 'crontab|systemd|/etc/rc|\.bashrc|ld\.so\.preload|CurrentVersion' \
      && echo "  ⚠ referencia persistência" \
      || echo "  ✓ sem referência a persistência"

    # 4. Só loopback?
    strings -n 6 "$b" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | sort -u
done
```

**Produza `auditoria.md`:**

| Artefato | Executa comando? | Cripto real? | Persiste? | Endereços referenciados | **Limite confirmado?** |
|---|---|---|---|---|---|
| beacon_simulado | | | | | |
| sessao_simulada | | | | | |
| perfil_simulado | | | | | |

**Responda:**

1. Algum artefato **violou** um limite? Se sim, qual e como?
2. Que endereços cada artefato referencia? **Todos são loopback?**
3. **Que técnica de verificação você acrescentaria** para cobrir um limite que o script não cobre?
4. Por que verificar por `nm`/`strings` é **insuficiente** sozinho? Que outro método você
   acrescentaria? (Dica: pense em comportamento em runtime.)

⚠ **A resposta 4 é o ponto.** `nm -D` só vê símbolos **dinâmicos**. Um binário **estático**, ou
que resolve símbolo por `dlsym`, esconde a chamada. **Verificação estática é necessária e não é
suficiente** — é por isso que o kit roda em ambiente isolado **apesar** da auditoria. As duas
coisas juntas, não uma no lugar da outra.

---

## 4.6 LAB B — Arquitetura a partir de relatório público

**Duração:** 60 min
**Objetivo:** reconstruir a arquitetura de C2 de um caso real, a partir de fonte pública.

⚠ **Leitura de relatório. Nenhuma consulta a infraestrutura de ator.**

### Passo 1 — Escolha o caso

Use **um** case com detalhe de infraestrutura:

- **The DFIR Report** — https://thedfirreport.com/
- **Google TAG**, **Microsoft**, **ESET**, **SentinelLabs** — relatório de ator
- **CISA advisory** com detalhe técnico

### Passo 2 — Reconstrua a arquitetura

Produza `arquitetura.md`:

```
[IMPLANTE]  →  [CAMADA 1]  →  [CAMADA 2]  →  [CAMADA 3]
   o quê          o quê          o quê          o quê
                 (protocolo)    (provedor)     (operação)
```

| Camada | O que o relatório descreve | Evidência | O que **não** é descrito |
|---|---|---|---|
| 0 — Implante | | | |
| 1 — Entrada | | | |
| 2 — C2 | | | |
| 3 — Operador | | | |

**Preencha o protocolo:**

| Aspecto | O que o relatório diz |
|---|---|
| Canal | |
| Periodicidade / jitter | |
| Tamanho de mensagem | |
| Formato (se descrito) | |
| Fallback / rotação | |
| Criptografia do canal | |

⚠ **A coluna "o que não é descrito" é obrigatória.** Relatórios públicos **omitem** — por
segurança do próprio autor, para não dar vantagem, ou por falta de dado. **A lacuna é parte do
entendimento**, e você precisa saber que ela existe antes de tirar conclusão.

### Passo 3 — O que revela o quê

Produza `revela.md`:

| Observável do relatório | O que ele revela sobre o ator | Confiança | Uso defensivo |
|---|---|---|---|
| Ex.: provedor de hospedagem X | Padrão de escolha; recurso; região | moderada | Correlação entre vítimas |
| Ex.: jitter de 20% | Cuidado com detecção por periodicidade | alta | Ajuste do limiar de CV |
| | | | |

**Responda:**

1. **Em qual camada o relatório tem mais informação?** Por quê?
2. Em qual camada tem **menos**? Isso é limitação do relatório ou do que se pode saber?
3. Que observável de **camada 1** você usaria para correlação entre vítimas? Por quê?
4. O relatório indica **rotação de infraestrutura**? Se sim, o que isso diz sobre bloquear o
   domínio?
5. **Se você tivesse que escrever uma detecção a partir deste caso, de qual camada ela viria?**
   Justifique.

⚠ **A resposta 5 é o resumo do módulo.** Detecção vem da **camada 0**. Você quase nunca detecta o
C2; você detecta **o implant que fala com ele**.

### Critérios de aceitação

- `auditoria.md` com a tabela preenchida e a **verificação reproduzida à mão**, não só o script.
- Você identificou pelo menos uma limitação da verificação estática.
- `arquitetura.md` com as quatro camadas, **incluindo a coluna do que não é descrito**.
- Protocolo preenchido com o que o relatório afirma — e **marcado como não informado** o que ele
  omite.
- `revela.md` com confiança declarada em cada linha.
- Você respondeu de qual camada viria a detecção, e justificou.
- Nenhuma consulta a domínio, IP ou infraestrutura do caso.
- Fontes citadas.

---

## Avaliação

1. Cite as três razões da arquitetura em camadas e a consequência defensiva de cada uma.
2. **Por que "bloquear o domínio" é resposta incompleta?** Em qual camada ele age?
3. Em qual camada você realmente trabalha, e por quê?
4. Descreva as quatro camadas e o que cada uma revela.
5. Por que o IP observado "provavelmente não é o ator"?
6. Qual modelo de canal é mais difícil de detectar e por quê?
7. **Por que RMM legítimo como C2 é o caso mais difícil?** Qual é a defesa?
8. Por que o **horário** de atividade é informação útil? Que confiança você atribui a ela?
9. Por que a lista de fallback do implante é uma oportunidade de detecção?
10. Por que verificação por `nm` é necessária **e** insuficiente? O que a complementa?
11. A partir de qual camada você consegue escrever detecção? Justifique.
12. Por que um relatório público omitir informação é parte do entendimento, não defeito dele?

---

**Próximo:** [Módulo 5 — Protocolo de implant: análise defensiva](modulo-05.md)
