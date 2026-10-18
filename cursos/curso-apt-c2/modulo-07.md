# Módulo 7 — Detecção contra TTP de APT

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Traduzir TTP observado em regra de detecção, com critério.
2. Entender por que detecção de TTP é mais durável que detecção de indicador.
3. Escrever regra com **tratamento de falso positivo** embutido.
4. Cobrir as técnicas que o dado já existe e **não está sendo usado**.
5. Medir o quanto a sua detecção **encurta** o tempo de residência.

---

## ⚠ Escopo

Este módulo ensina a **construir detecção**. Não ensina a evadir detecção — não há seção sobre
como passar por regra, sobre ofuscação de comportamento, nem sobre timing para não disparar.

⚠ Regras escritas aqui são para a sua organização e para os seus artefatos de laboratório.
**Compartilhar TTP e regra é prática defensiva legítima e encorajada** — é o que faz a defesa
coletiva funcionar contra ator que ataca vários.

---

## 7.1 Por que detecção de TTP, e não de indicador

Retomando a Pirâmide da Dor (Módulo 2), aplicada:

| Tipo de detecção | Alcance | Vida útil | Custo de escrever |
|---|---|---|---|
| Hash de amostra | Aquela amostra | Dias | Baixo |
| Domínio / IP | Aquela campanha | Semanas | Baixo |
| **TTP / comportamento** | **O ator, em qualquer campanha** | **Anos** | **Médio** |

⚠ **A implicação prática:** contra APT, indicador tem vida útil curta porque **o ator troca
infraestrutura entre campanhas e até durante uma**. O que ele **não** troca facilmente é o método
— como ele obtém acesso, como persiste, como se move.

**A regra de alocação deste curso:**

```
70% do esforço  →  detecção de comportamento
30% do esforço  →  indicador (triagem, varredura histórica, bloqueio temporário)
```

⚠ **O inverso é o que acontece na maioria dos times**, porque indicador é fácil, vem pronto em
feed, e produz "resultado visível" imediato (bloqueio). Comportamento exige entender o ator e o
seu ambiente — e o retorno aparece em semanas.

---

## 7.2 As técnicas de APT que valem detecção

A tabela de maior valor do módulo: o que detectar, com o quê, e a dificuldade real.

| TTP (tática) | Sinais observáveis | Telemetria | Falso positivo | Dificuldade |
|---|---|---|---|---|
| **Reconhecimento de conta** (Discovery) | Enumeração em série: `net group`, `net user`, LDAP em volume | Processo + linha de comando | Administração legítima | Baixa |
| **Reconhecimento de rede** | `net view`, `arp -a`, varredura | Processo + linha de comando | Ferramenta de inventário | Média |
| **Acesso a lsass** (Credential Access) | Abrir processo com `PROCESS_VM_READ` | Sysmon 10 / EDR | AV, ferramenta de segurança | **Muito baixa** |
| **Serviço criado remotamente** (Lateral) | `CreateService` com binário em `ADMIN$` | Log de serviço + processo | Deploy de software | Baixa |
| **WMI remoto** (Lateral) | Processo criado via WMI, sem filho local | Log WMI + processo | Administração | Média |
| **Tarefa agendada** (Persistence) | Tarefa nova com ação binária | Criação de tarefa | Software legítimo | Baixa |
| **Conta criada** (Persistence) | Novo usuário, especialmente com privilégio | Log de criação de conta | RH/IT | Baixa |
| **Acesso a nome de backup** (Discovery) | Resolução ou acesso a `*BACKUP*`, `*ARQ*` | DNS + SMB | Backup legítimo no horário dele | **Média-baixa** |
| **Serviço de nuvem novo** (Exfil) | Destino não recorrente + upload | Proxy + volume | SaaS recém-adotado | Média |
| **Deleção de log** (Defense Evasion) | `wevtutil cl`, truncamento | Processo + **ausência** de log | Manutenção rara | Média |
| **Beacon regular** (C2) | CV baixo, volume constante | Rede / proxy | Atualizador, telemetria | Alta |
| **Persistência silenciosa** (Persistence) | Presença sem comportamento | Baseline de inventário | — | **Altíssima** |

⚠ **Quatro linhas merecem destaque, e por razões diferentes:**

1. **Acesso a lsass** — dificuldade **muito baixa** e valor **muito alto**. Praticamente nada
   legítimo faz isso. É a melhor relação custo/benefício de toda a tabela.
2. **Acesso a nome de backup** — o ator precisa descobrir onde está o backup, e essa consulta é
   raríssima em usuário comum. Alto valor, baixo falso positivo.
3. **Deleção de log** — o problema elegante (Módulo 3): se o log foi limpo, **o log não mostra**.
   Detecção depende de **retenção central** ou de evento de **ausência**.
4. **Persistência silenciosa** — o caso do ator que só se posiciona (Módulo 1). Não há
   comportamento: só a existência. **Exige baseline de inventário**, não regra de evento.

---

## 7.3 A regra com tratamento de falso positivo

Toda regra deste curso tem **três blocos**: seleção, exceção, e **declaração do esperado**.

```yaml
title: Acesso a Memoria de Processo de Credencial (LSASS)
id: 7a1f3e2d-0000-4000-8000-000000000010
status: stable
description: >
  Detecta abertura de processo com direito de leitura sobre lsass.exe,
  comportamento necessário para extração de credencial em memoria.
references:
    - https://attack.mitre.org/techniques/T1003/001/
author: <seu nome>
date: 2026-10-18
tags:
    - attack.credential_access
    - attack.t1003.001
logsource:
    category: process_access
    product: windows
detection:
    selection:
        TargetImage|endswith: '\lsass.exe'
        GrantedAccess|contains:
            - '0x1010'
            - '0x1410'
            - '0x1438'
            - '0x143a'
            - '0x1fffff'
    filter_seguranca:
        SourceImage|endswith:
            - '\MsMpEng.exe'          # Defender
            - '\csrss.exe'
            - '\wininit.exe'
            - '\services.exe'
            - '\svchost.exe'
    filter_edr:
        SourceImage|endswith:
            - '\CSFalconService.exe'
            - '\SentinelAgent.exe'
    condition: selection and not (filter_seguranca or filter_edr)
falsepositives:
    - Ferramenta de backup corporativa com agente proprio
    - Solucao de gestao de credencial que exige leitura do processo
    - Administrador executando ferramenta de diagnostico autorizada
level: critical
```

### Por que esta regra é boa — os cinco elementos

| Elemento | Como aparece na regra |
|---|---|
| **Especificidade** | Não é "abre processo"; é **lsass** com **máscara de acesso específica** |
| **Combinação** | Alvo + direito concedido (dois critérios, não um) |
| **Contexto** | Restringe ao processo alvo, não a qualquer acesso |
| **Exceções** | Bloco `filter_*` com os que legitimamente fazem isso |
| **Declaração** | `falsepositives` nomeia **quem** legitimamente dispara |

⚠ **A máscara de acesso é o critério que faz a regra.** `0x1010` e `0x1410` são as combinações
necessárias para ler a memória do processo. Sem a máscara, você alerta em todo antivírus e
ferramenta de segurança — e desliga a regra em uma semana.

⚠ **A regra de barrar ruído, em uma frase:** *quem legitimamente faz isso, o que o distingue?* A
resposta vira `filter_*`. Se você não sabe quem legitimamente faz, **você não terminou a regra** —
e vai descobrir por reclamação do time de operação.

---

## 7.4 Detecção de ausência — o caso difícil

Algumas das técnicas mais importantes **não geram evento**. A detecção precisa procurar o que
**falta**.

| O que falta | Como detectar |
|---|---|
| **Log de segurança depois de certo ponto** | Heartbeat: o agente deveria mandar evento periódico; o silêncio é o sinal |
| **Comportamento do host depois do login** | Baseline de "o que este host faz normalmente" |
| **Tráfego de um host** | Baseline de conectividade esperada |
| **Persistência nova** | Inventário diferencial: o que existe hoje que não existia há 7 dias |
| **Execução de um processo que sempre roda** | Ausência de evento de processo esperado |

⚠ **O inventário diferencial é a técnica mais subutilizada e mais poderosa deste módulo.** Você
não procura "o que é malicioso" — procura **"o que é novo"**. Isso pega exatamente o caso do ator
que apenas se posiciona, porque **a novidade é o sinal**, não o comportamento.

```bash
# Linux — inventário diferencial simples, para ilustrar o conceito
# 1. Linha de base (rodar periodicamente e guardar)
inventario() {
    {
        echo "=== SERVICOS ===";  systemctl list-units --type=service --no-pager
        echo "=== CRON ===";      ls -la /etc/cron.* 2>/dev/null
        echo "=== SYSTEMD UNIT FILES ==="; ls -la /etc/systemd/system/
        echo "=== CHAVES SSH ==="; find / -name authorized_keys -exec ls -la {} \; 2>/dev/null
        echo "=== PORTA ESCUTANDO ==="; ss -tlnp
        echo "=== CONTAS ===";    awk -F: '$3>=1000 && $3<65534 {print $1, $3, $7}' /etc/passwd
        echo "=== LIB PRELOAD ==="; cat /etc/ld.so.preload 2>/dev/null
    } | sort
}

inventario > "base-$(date +%Y%m%d).txt"
# Na próxima execução:
#   diff base-<antiga> base-<nova> | grep '^>'   ← tudo novo é candidato
```

⚠ **A saída do `diff` não é "achado" — é "candidato".** Toda mudança tem explicação legítima
(instalou software, mudou configuração, criou conta). **O valor está em ter a lista curta** e
revisar; sem baseline, você não tem lista nenhuma.

---

## 7.5 Medindo o que a detecção encurta

Detecção contra APT não impede — **encurta**. Como medir isso.

| Métrica | Definição | Como melhorar |
|---|---|---|
| **Ponto de detecção na cadeia** | Em qual fase o alerta dispara | Detecção mais cedo na cadeia = mais tempo |
| **Tempo de residência** | Da entrada até a detecção | Detecção por fase inicial |
| **Cobertura de técnicas do ator** | % das técnicas relevantes com regra testada | Módulo 3 |
| **Tempo de retroatividade** | Quanto histórico você consegue consultar | **Retenção de log** |
| **Tempo de resposta** | Da detecção à contenção | Processo e autoridade |

⚠ **A linha "ponto de detecção na cadeia" é a mais importante e a mais ignorada.** Se a sua
detecção dispara na fase ⑦ (impacto), o valor é quase zero contra APT — mas contra APT **não há
fase ⑦**. Você tem que detectar em ①②③, onde ainda há tempo de agir.

```
Detecta em ① (acesso)     →  meses de vantagem
Detecta em ③ (descoberta) →  semanas
Detecta em ⑤ (lateral)    →  dias
Detecta em ⑥ (exfil)      →  horas, e o dado já saiu
```

⚠ **A coluna "tempo de retroatividade" transforma retenção de log em controle de detecção.** Se a
sua retenção é 30 dias e o ator está lá há 8 meses, você **não consegue** caçar retroativamente.
**Retenção é decisão de arquitetura que determina a sua capacidade de detectar APT** — e é
frequentemente tratada como item de conformidade, não de segurança.

---

## 7.6 LAB — Escrever detecção contra o TTP do seu ator

**Duração:** 120 min

### Passo 1 — Escolha três técnicas da sua lacuna (15 min)

Use o `cobertura.md` do Módulo 3. Escolha **três** técnicas da lacuna, priorizando:

1. Uma de **dificuldade baixa** (resultado rápido, valida o processo)
2. Uma de **dificuldade média**
3. Uma do tipo **"tenho o dado, não uso"** (melhor custo/benefício)

Produza `selecao.md`:

| Técnica | ID | Dificuldade | Por que escolhi | Tenho telemetria? |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

### Passo 2 — Escreva as três regras (50 min)

Para **cada** uma, produza uma regra completa com **três blocos**:

```yaml
title: <nome descritivo do comportamento, não da ferramenta>
id: <uuid>
status: experimental
description: <o comportamento observado, em linguagem própria>
references:
    - <URL da técnica na ATT&CK>
author: <seu nome>
date: 2026-10-18
tags:
    - attack.<tatica>
    - attack.<tecnica>
logsource:
    category: <...>
    product: <...>
detection:
    selection:
        <critério específico 1>
        <critério específico 2>          # combinação, não sinal único
    filter_legitimo:
        <quem legitimamente faz isso>
    condition: selection and not filter_legitimo
falsepositives:
    - <caso concreto 1>
    - <caso concreto 2>
level: <high|critical — reserve critical>
```

**Para cada regra, preencha também:**

| Item | Regra 1 | Regra 2 | Regra 3 |
|---|---|---|---|
| Critério **específico** (não genérico) | | | |
| Combinação usada (2+ critérios) | | | |
| Exceções identificadas | | | |
| **Falso positivo concreto 1** | | | |
| **Falso positivo concreto 2** | | | |
| Como você **testaria** | | | |
| Em que fase da cadeia dispara | | | |

⚠ **"Falso positivo concreto" significa nomear.** *"Agente de backup da ferramenta X, que roda às
02h com a conta de serviço Y"* é concreto. *"Pode dar falso positivo"* não é.

### Passo 3 — Prove que a regra funciona (25 min)

⚠ **Regra não testada é hipótese.** Teste cada uma.

**Para YARA** (se a regra for desse tipo):

```bash
yara regra.yar alvo
yara regra.yar /usr/bin/* 2>/dev/null | head    # DEVE ser vazio ou quase
```

**Para Sigma**, o teste é a validação de sintaxe + a construção do evento:

```bash
pip3 install sigma-cli 2>/dev/null
sigma check regra.yml

# Monte o evento que a regra deve casar, e verifique campo a campo
cat > evento-teste.json <<'EOF'
{
  "EventID": 10,
  "TargetImage": "C:\\Windows\\System32\\lsass.exe",
  "SourceImage": "C:\\Temp\\suspeito.exe",
  "GrantedAccess": "0x1410"
}
EOF
# Confirme: cada campo que a regra usa existe no evento, com o nome exato?
```

**Produza `testes.md`:**

| Regra | Sintaxe válida? | Evento de teste construído? | Casou no teste? | Casou em arquivo legítimo? | Veredito |
|---|---|---|---|---|---|
| | | | | | |

**Responda:**

1. Alguma regra **não** casou no evento de teste? **Por quê?** Corrija o campo, não a lógica.
2. Alguma regra casou em arquivo/evento legítimo? Se sim, **qual a exclusão que falta?**
3. Qual das três você consideraria **pronta para produção**? Por quê?
4. Qual das três precisa de **telemetria que você não tem**? Isso muda a tarefa de "escrever
   regra" para quê?

### Passo 4 — Meça o encurtamento (20 min)

Produza `encurtamento.md`:

```markdown
## Ponto de detecção de cada regra

| Regra | Fase da cadeia | O que acontece ANTES desta fase (e você não viu) | Vantagem ganha |
|---|---|---|---|
| | | | |

## Tempo de retroatividade

Retenção de log atual (declare ou estime): ____ dias

Se o ator estivesse ativo há 8 meses, eu conseguiria consultar:
  [ ] 8 meses  [ ] parte  [ ] nada

## O que eu faria com a retenção que tenho
[descreva a consulta histórica que você rodaria AGORA, com a regra nova]

## Cobertura antes e depois

| Métrica | Antes | Depois |
|---|---|---|
| Técnicas com regra testada | | |
| Fase mais precoce coberta | | |
| Categoria "tenho dado, não uso" restante | | |
```

⚠ **A seção "O que eu faria com a retenção que tenho" é a mais prática.** Toda regra nova merece
**uma consulta retroativa imediata**. Você acabou de aprender a detectar algo — **procure no
histórico agora**.

### Passo 5 — Reporte a lacuna que sobra (10 min)

Produza `lacuna.md`:

| Técnica ainda sem cobertura | Por quê (telemetria? recurso? dificuldade?) | Custo aproximado de resolver | Quem decide |
|---|---|---|---|
| | | | |

**Responda:**

1. Qual lacuna é **de detecção** (escrever regra resolve)?
2. Qual lacuna é **de telemetria** (resolver exige projeto)?
3. Qual lacuna é **de arquitetura** (resolver exige mudança estrutural, tipo segmentação ou
   backup imutável)?
4. **Dessas três categorias, qual você leva para a gestão primeiro?** Justifique.

### Critérios de aceitação

- `selecao.md` com as três técnicas e a justificativa por dificuldade.
- Três regras completas, cada uma com **seleção, exceção e declaração do esperado**.
- Cada regra tem **mínimo de dois critérios** na seleção (combinação, não sinal único).
- **Dois falsos positivos concretos nomeados** por regra.
- `testes.md` com o evento de teste construído e o resultado real.
- Você explicou por que uma regra não casou (campo, não lógica) e corrigiu.
- `encurtamento.md` com o ponto de detecção de cada regra na cadeia.
- Você descreveu a **consulta retroativa** que rodaria com a regra nova.
- `lacuna.md` classificando cada lacuna em detecção / telemetria / arquitetura.

---

## Avaliação

1. Compare detecção por hash, por domínio e por TTP em alcance e vida útil.
2. Por que o ator troca infraestrutura entre campanhas, e o que ele **não** troca facilmente?
3. Qual a proporção de esforço entre comportamento e indicador que este curso recomenda? Por que
   a maioria dos times faz o inverso?
4. Qual técnica tem a melhor relação custo/benefício, e por quê?
5. Por que "acesso a nome de backup" é um bom alvo de detecção?
6. Explique o problema elegante da deleção de log. O que detecta a limpeza, se o log foi limpo?
7. Por que "persistência silenciosa" não tem evento para detectar? O que resolve?
8. Cite os três blocos de uma regra boa. O que vai em cada um?
9. Por que a máscara de acesso é essencial na detecção de acesso a lsass?
10. O que acontece se você não escrever o bloco de exceção? Como você descobre o que faltou?
11. Explique inventário diferencial. Por que ele pega o ator que só se posiciona?
12. Por que "ponto de detecção na cadeia" é a métrica mais importante? Compare detectar em ① e
    em ⑥.
13. Por que retenção de log é um controle de **detecção** e não só de conformidade?
14. Toda regra nova merece o quê, imediatamente?

---

**Próximo:** [Módulo 8 — Caça a ameaça com hipótese](modulo-08.md)
