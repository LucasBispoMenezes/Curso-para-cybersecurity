---
title: APT e Infraestrutura de C2: Analise Defensiva
nivel: especialista
tags: [apt, c2, persistencia, infraestrutura, pivoting, deteccao]
---# APT e Infraestrutura de C2: Análise Defensiva

**Ementa do curso · 26 horas · 9 módulos · PT-BR com termos técnicos em inglês**

---

## Sobre o que é este curso — leia antes de tudo

Este é um curso de **análise defensiva** de atores avançados e de sua infraestrutura de comando
e controle. Ele ensina a **reconhecer, mapear, detectar e atribuir** atividade de APT. Não ensina
a operá-la.

A linha, operacionalmente:

| Este curso ensina | Este curso **não** ensina |
|---|---|
| Reconhecer arquitetura de C2 **para poder detectá-la** | Construir servidor de C2 |
| Mapear infraestrutura de ator a partir de dado público | Adquirir ou operar infraestrutura de ataque |
| Analisar protocolo de implant **em captura** | Escrever implant ou agente funcional |
| Entender como APT faz movimento lateral **no relatório de caso** | Executar movimento lateral |
| Atribuir campanha por TTP, infraestrutura e código | Evadir atribuição |
| Construir detecção contra as técnicas observadas | Evadir detecção |
| Fazer threat intelligence e caça a ameaça | Caçar alvo para atacar |

⚠ **Por que essa é a linha, e não outra:** APT é, por definição, capacidade de operar sem ser
detectado, de forma persistente, contra alvo selecionado. Não existe versão didática de um
implante funcional — se ele funciona, é um implante. E o analista que precisa entender como um
APT opera **não precisa construí-lo**: precisa do relatório de caso real, do artefato público, e
da taxonomia. Tudo isso é o que este curso entrega, e é fartamente disponível.

⚠ **O kit de baixo impacto deste curso** (Módulos 4 e 5) contém amostras **não funcionais**: elas
demonstram **estrutura de protocolo, formato de beacon e lógica de perfil** rodando em
`127.0.0.1`, sem executar comando, sem persistir, sem alcançar outro host. Cada uma traz um script
`verifica-limites.sh` que **prova** isso por análise do binário, não por declaração. É didático e
é auditável.

---

## Visão geral

Ransomware é um evento. APT é uma **campanha**. A diferença muda a escala de tempo, a
sofisticação, e o que você consegue fazer contra ela.

Este curso constrói a capacidade de olhar para telemetria e artefato de **atores estatais,
espionagem e grupos persistentes**, entender o que está acontecendo, e responder no ritmo certo —
semanas e meses, não horas.

O foco prático: **threat intelligence aplicada.** Você vai alimentar um modelo de ameaça com
dado público real, mapear infraestrutura a partir de fontes abertas, escrever detecção contra
TTP observado, e executar uma caça a ameaça com hipótese.

**Material original.** Referências abertas ao final.

---

## Público-alvo

- Analistas de CTI (Cyber Threat Intelligence) iniciantes.
- Analistas de SOC/IR que querem subir de "alerta" para "campanha".
- Profissionais de defesa que lidam com alvo de interesse estatal.
- Analistas de malware que querem entender contexto de operação.
- Gestores que precisam calibrar risco de ameaça persistente.

**Não é** para iniciantes em segurança. Este curso assume o conteúdo do curso de malware deste
material — análise de artefato, ATT&CK, resposta a incidente.

---

## Pré-requisitos

| Área | Nível exigido |
|---|---|
| Análise de malware | Curso de malware deste material, ou equivalente |
| ATT&CK | Uso fluente — táticas, técnicas, grupos, software |
| Rede | Análise de captura, DNS, TLS — curso de redes deste material |
| Linux/Windows | Administração e análise de log |
| Inglês | **Leitura técnica obrigatória** — quase todo relatório primário é em inglês |

Teste de nivelamento: você sabe a diferença entre `T1071` e `T1095`? Se não, o Módulo 3 resolve.
Se você não lê `strace`, faça o curso de malware antes.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Distinguir APT de crime organizado e de hacktivismo, por comportamento e não por rótulo.
2. Explicar o ciclo de inteligência e onde cada fonte se encaixa.
3. Descrever a arquitetura de C2 em camadas e como cada camada é detectada.
4. Reconhecer, **em captura**, o perfil de beacon, de task e de exfiltração de um implante.
5. Analisar estrutura de protocolo de implant a partir de artefato não funcional e de relatório.
6. Mapear infraestrutura de ator a partir de fonte pública (domínio, certificado, ASN, hosting).
7. Atribuir campanha com método, e declarar confiança e limites.
8. Escrever detecção contra TTP de APT, com tratamento de falso positivo.
9. Executar caça a ameaça com hipótese baseada em inteligência.
10. Produzir um produto de inteligência para consumidor técnico e para gestão.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | O que é APT e por que é diferente | Definição operacional, atores, motivação, escala de tempo | 2 |
| 2 | Ciclo de inteligência e fontes | Necessidade, coleta, análise, disseminação, feedback | 3 |
| 3 | ATT&CK aplicada e modelo de ameaça | Mapear TTP, priorizar, calibrar para a sua organização | 3 |
| 4 | Arquitetura de C2 em camadas | Redirecionador, canal, fallback — **o que cada camada revela** | 3 |
| 5 | Protocolo de implant: análise defensiva | Perfil de beacon, task, exfiltração, formato — em captura | 4 |
| 6 | Infraestrutura: mapeamento por fonte aberta | Domínio, certificado, ASN, hosting, padrão de registro | 4 |
| 7 | Detecção contra TTP de APT | Regra, telemetria, tratamento de falso positivo | 3 |
| 8 | Caça a ameaça com hipótese | Da inteligência à consulta; documentar o que não achou | 3 |
| 9 | Atribuição, produto e exercício | Método, confiança, relatório, exercício de mesa | 3 |

Cada módulo: teoria → artefato ou relatório comentado → lab → avaliação. ~50% prática de análise.

---

## ⚠ Nota de escopo e conduta

Este curso trata de **atores que operam contra infraestrutura de terceiros**. Isso impõe regras
que não existem nos outros cursos deste material:

| Regra | Por quê |
|---|---|
| **Nenhum lab constrói infraestrutura de ataque** | Nem domínio, nem VPS, nem redirecionador, nem servidor |
| **Nenhum lab aponta para alvo de terceiro** | Análise de infraestrutura é **passiva**: consulta pública, histórico, certificado |
| **Nenhum lab adquire ou executa amostra real de APT** | Amostra de APT é artefato sensível; use o kit e o relatório público |
| **Toda consulta a fonte pública é identificada** | Seu IP aparece no log de quem você consulta |
| **Atores são tratados por informação pública** | Nada de "como atacar o grupo X" |

⚠ **Ponto que merece atenção explícita:** mapear infraestrutura de adversário por fonte aberta é
atividade legítima de CTI e amplamente praticada. **Interagir com essa infraestrutura — conexão,
varredura, teste — não é.** A diferença é a mesma do curso de redes: analisar é diferente de
tocar. Este curso é integralmente **passivo**.

⚠ **Encontrar dado de vítima em relatório ou amostra é obrigação.** Minimização, sigilo,
retenção definida, destruição documentada. A LGPD vale aqui como em qualquer lugar.

---

## Ambiente

```bash
sudo apt update
sudo apt install -y python3 python3-pip jq whois dnsutils \
                    openssl curl tshark tcpdump yara
pip3 install yara-python sigma-cli
```

**Ferramentas de análise de infraestrutura (todas de fonte pública):**

| Ferramenta / fonte | Uso |
|---|---|
| `dig`, `whois` | Registro, histórico, nameserver |
| `openssl s_client` | Certificado, emissor, SAN, validade |
| **crt.sh** | Transparência de certificado — busca por domínio e emissor |
| **VirusTotal** | Reputação (requer conta) |
| **Shodan / Censys** | Host exposto (requer conta; **consulta, nunca interação**) |
| **urlscan.io** | Captura de página já feita por terceiro |
| **MITRE ATT&CK** | Taxonomia |
| **MISP / OpenCTI** | Plataforma de inteligência (opcional, para o Módulo 9) |

⚠ **Todas as ferramentas acima são de consulta.** Nenhuma delas, em nenhum lab, será usada para
tocar na infraestrutura que você está analisando.

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (9) | 45% | Capacidade de analisar e de produzir detecção |
| Produto de inteligência (Módulo 6) | 25% | Método aplicado, confiança declarada |
| Caça a ameaça documentada (Módulo 8) | 15% | Hipótese, consulta, resultado — inclusive negativo |
| Plano de defesa + exercício (Módulo 9) | 15% | Tradução em decisão de negócio |

**Rubrica central:** todo entregável tem seção de **confiança** e seção de **limitações**. Um
produto de inteligência que afirma sem qualificar confiança é um produto ruim — mesmo que a
conclusão esteja certa.

---

## Referências abertas

- **MITRE ATT&CK** — https://attack.mitre.org/ — grupos, software, campanhas
- **MITRE ATT&CK Navigator** — priorização e cobertura
- **MITRE Center for Threat-Informed Defense** — metodologia
- **CISA Advisories** — https://www.cisa.gov/news-events/cybersecurity-advisories
- **CISA #StopRansomware** — atores com atividade de ransomware
- **The DFIR Report** — https://thedfirreport.com/ — casos com TTP detalhado
- **Google Threat Analysis Group (TAG)** — relatórios de ator
- **Microsoft Threat Intelligence** — relatórios de ator
- **ESET / Kaspersky / SentinelLabs research** — análise técnica de APT
- **Volexity, Mandiant research** — casos
- **CERT.br** — https://www.cert.br/ — advisories e boas práticas
- **MISP Project** — https://www.misp-project.org/
- **OpenCTI** — https://filigran.io/solutions/open-cti/
- **Traffic Light Protocol (TLP)** — FIRST — marcação de compartilhamento
- **"Intelligence-Driven Incident Response"** — Roberts & Brown — referência conceitual
- **"Structured Analytic Techniques for Intelligence Analysis"** — Heuer & Pherson
- **Pyramid of Pain** — David Bianco — valor relativo de indicador
- **Diamond Model of Intrusion Analysis** — Caltagirone, Pendergast, Betz

---

*Material didático original, de propósito defensivo. Nenhum trecho reproduzido de obra comercial
protegida, e nenhum material que ensine a operar infraestrutura de ataque.*
