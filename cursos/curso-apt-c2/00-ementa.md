---
title: "APT e Infraestrutura de C2: Analise Defensiva"
nivel: intermediario
tags: [apt, c2, persistencia, infraestrutura, pivoting, deteccao]
---
**Ementa do curso · 26 horas · 9 módulos · PT-BR com termos técnicos em inglês**


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
