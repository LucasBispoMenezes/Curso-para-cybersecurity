# APT e Infraestrutura de C2 — Análise Defensiva

Curso de 26 horas, nove módulos. Ensina a reconhecer, mapear, detectar e atribuir atividade de
ator avançado.

**Este é um curso defensivo e passivo.** Ele não constrói infraestrutura de C2, não escreve
implant, não executa movimento lateral, e não toca em infraestrutura de adversário. Toda análise
de infraestrutura é **consulta a fonte pública** — nunca interação.

Por que assim: entender como um APT opera é o que permite defender contra ele. E esse entendimento
vem de **relatório de caso, artefato público e taxonomia** — não de reconstruir a ferramenta.
Quem precisa construir não é analista; e um implante que funciona é um implante, independentemente
do rótulo que se dê a ele.

**Material original.** Referências abertas na [ementa](00-ementa.md).

---

## Por onde começar

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [O que é APT e por que é diferente](modulo-01.md) | 2 | Definição operacional e comparativo com crime |
| 2 | [Ciclo de inteligência e fontes](modulo-02.md) | 3 | Necessidade de inteligência escrita e priorizada |
| 3 | [ATT&CK aplicada e modelo de ameaça](modulo-03.md) | 3 | Modelo de ameaça calibrado para a sua organização |
| 4 | [Arquitetura de C2 em camadas](modulo-04.md) | 3 | Arquitetura mapeada e o que cada camada revela |
| 5 | [Protocolo de implant: análise defensiva](modulo-05.md) | 4 | Perfil de beacon e task lido em captura |
| 6 | [Infraestrutura por fonte aberta](modulo-06.md) | 4 | Mapa de infraestrutura com confiança declarada |
| 7 | [Detecção contra TTP de APT](modulo-07.md) | 3 | Regra de detecção com falso positivo tratado |
| 8 | [Caça a ameaça com hipótese](modulo-08.md) | 3 | Caça documentada, inclusive quando negativa |
| 9 | [Atribuição, produto e exercício](modulo-09.md) | 3 | Produto de inteligência e exercício conduzido |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md) · [Kit de baixo impacto](kit/README.md)

**Ritmo sugerido:** 3h por semana durante 9 semanas. Os Módulos 4–6 são densos de análise e
rendem mais em duas sessões cada.

---

## ⚠ O kit de baixo impacto

Os Módulos 4 e 5 usam um kit de amostras **não funcionais**, em `kit/`:

| Propriedade | Como é garantida |
|---|---|
| Não executa comando | Sem `exec`/`system`/`popen` — **verificado por script** |
| Não persiste | Não escreve em `cron`, `systemd`, `Run`, `rc.local` — **verificado** |
| Não sai da máquina | Socket apenas em `127.0.0.1` — **verificado** |
| Não cifra nada real | Sem biblioteca de criptografia — **verificado** |
| Não toca dado de terceiro | Opera só em `./mw-teste/` |

⚠ **O `verifica-limites.sh` do kit prova cada uma dessas afirmações** analisando o binário
compilado. Você não precisa confiar na declaração — pode auditar em dois minutos. Um instrutor
pode revisar o kit inteiro antes de usar em aula.

**O que o kit ensina sem executar nada de perigoso:** formato de mensagem, lógica de beacon com
jitter, comportamento de task, perfil de exfiltração, marcador de sessão. É tudo o que o analista
precisa reconhecer em captura.

---

## As consultas de fonte pública — o que você faz e o que não faz

Toda análise de infraestrutura neste curso é **passiva**:

| Fazer | Não fazer |
|---|---|
| Consultar `whois`, `dig`, `crt.sh` | Conectar ao host analisado |
| Ver certificado via `openssl s_client` **em fonte que você já tem** | Testar porta no host do adversário |
| Consultar histórico em VirusTotal, urlscan | Enviar requisição ao domínio |
| Ler relatório público de terceiro | Fazer scan de infraestrutura de ator |

⚠ **"Interagir com a infraestrutura do adversário" não é análise — é contato.** Ele vê você, e
você acabou de se anunciar. Isso vale tanto para o profissional quanto para quem estuda.

⚠ **Toda consulta identifica você.** `whois`, `crt.sh` e VirusTotal registram seu IP. Em contexto
profissional real, consulte dentro da política da sua organização — e saiba que o adversário pode
monitorar quem consulta o domínio dele.
