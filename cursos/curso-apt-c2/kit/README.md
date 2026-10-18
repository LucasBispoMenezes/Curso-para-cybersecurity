# Kit de Baixo Impacto — Amostras Não Funcionais

Este kit existe para **ensinar análise de protocolo de implant sem construir um implante**.

---

## O que este kit é

Três artefatos que demonstram **estrutura** — formato de mensagem, lógica de beacon, perfil de
sessão — rodando **apenas em `127.0.0.1`**, sem executar comando, sem persistir, sem alcançar
outro host.

| Artefato | O que demonstra | O que **não** faz |
|---|---|---|
| `beacon_simulado.c` | Intervalo, jitter, mensagem de check-in, contador de sessão | Não executa comando; não persiste; só loopback |
| `sessao_simulada.c` | Estrutura de mensagem (tipo, id, payload), sequência de sessão | Idem |
| `perfil_simulado.c` | Padrão de requisição/resposta, tamanho típico, agrupamento | Idem |

---

## O que este kit **não** é

⚠ **Não é implante. Não é C2. Não é ponto de partida para construir um.**

As três omissões são deliberadas e são o que torna o kit seguro:

| Omissão | Por quê |
|---|---|
| **Não executa comando** | É a capacidade que transforma "formato de mensagem" em "RCE" |
| **Não persiste** | É o que transforma "programa" em "presença" |
| **Não sai da máquina** | É o que transforma "simulação" em "operação" |

⚠ **Estas três omissões são o que ensina.** Elas são exatamente as **três propriedades que o
analista procura** quando olha um artefato: *executa comando? persiste? fala com alguém?* O kit
mostra a resposta negativa de forma auditável — e você aprende o método de verificar.

**O que você aprende com ele:** reconhecer formato de mensagem em captura, calcular jitter, ler
perfil, distinguir check-in de task. **Tudo** o que o analista precisa. **Sem** nenhuma capacidade
de operar.

---

## Verificação — não confie, audite

```bash
cd kit
make          # ou: gcc -O2 -o <nome> <nome>.c
./verifica-limites.sh
```

O script verifica, **por análise do binário**:

| Limite | Como verifica |
|---|---|
| Sem execução de comando | Símbolos dinâmicos contra `exec*`, `system`, `popen`, `fork` |
| Sem criptografia real | Símbolos contra `EVP_*`, `AES_*`, `libcrypto` |
| Sem persistência | Strings contra `crontab`, `systemd`, `rc`, `Run` |
| Só loopback | Todas as strings IPv4 são `127.0.0.1` |
| Sem biblioteca de rede externa | Confirma que usa apenas chamadas locais |

⚠ **A verificação é necessária e não é suficiente.** `nm -D` só vê símbolos **dinâmicos** — um
binário estático ou que resolva símbolo por `dlsym` escapa. É por isso que o kit roda em **ambiente
isolado mesmo com a auditoria aprovada**. As duas coisas juntas.

**O exercício completo está no Módulo 4, Lab A** — lá você reproduz a verificação à mão e
identifica a limitação do método estático.

---

## Estrutura de cada artefato

Todos seguem o mesmo padrão, com o cabeçalho que declara os limites:

```c
/*
 * AMOSTRA DIDÁTICA DE BAIXO IMPACTO — curso APT/C2
 *
 * Limites verificáveis (ver verifica-limites.sh):
 *   ✗ não executa comando     (sem exec/system/popen)
 *   ✗ não persiste            (sem cron/systemd/rc/Run)
 *   ✗ não cifra nada real     (sem biblioteca de criptografia)
 *   ✗ não sai da máquina      (socket apenas em 127.0.0.1)
 *   ✗ não toca dado de terceiro
 *
 * Propósito: análise de FORMATO e PERFIL de mensagem, em laboratório isolado.
 */
```

⚠ **O cabeçalho não é decoração.** Ele é a declaração auditável do que o artefato é — e o
`verifica-limites.sh` verifica se a declaração é verdadeira.

---

## Uso pretendido

| Onde usar | Como |
|---|---|
| **Aula de análise de protocolo** | Aluno lê o formato, gera captura, reconhece o padrão |
| **Aula de detecção de beacon** | Aluno calcula CV, define limiar, escreve a regra |
| **Aula de verificação de artefato** | Aluno audita os limites e identifica a limitação do método |
| **Exercício de perfil** | Distinguir check-in de task por tamanho e tempo |

ⓘ **Não serve para:** testar EDR, avaliar sandbox, treinar resposta a incidente com artefato
hostil, nem qualquer coisa que exija comportamento real. Para isso, o caminho é **amostra pública
em VM descartável** com o protocolo do Módulo 8 do curso de malware.

---

## Protocolo para rodar o kit

⚠ Mesmo sendo de baixo impacto, o kit roda em **ambiente isolado**. É hábito, e é correto:

```bash
# 1. VM descartável, snapshot antes
# 2. Verificação de isolamento
ip -br addr | grep -v lo | grep -v DOWN && echo "⚠ interface UP" || echo "✓ isolado"

# 3. Auditoria dos limites
./verifica-limites.sh

# 4. Execução, com captura em loopback
sudo tcpdump -i lo -nn -s 0 -w kit.pcap 'tcp port 8099' &
./beacon_simulado 10

# 5. Análise
tcpdump -r kit.pcap -nn | head -20

# 6. Destruir a VM (não confie em limpeza)
```

---

## Se você precisa de mais do que o kit

Se o seu objetivo é treinar com **artefato hostil real**, a resposta não é construir um. É usar o
que já existe:

| Necessidade | Caminho correto |
|---|---|
| Amostra real para análise | Repositório público de amostra (MalwareBazaar, MalShare) |
| Ambiente de análise pronto | **REMnux**, **FLARE VM** |
| Exercício de SOC com artefato | Range de treino / CTF de detecção |
| Exercício de resposta a incidente | Tabletop (Módulo 9) |

⚠ **Construir não é o caminho.** Amostra real existe em quantidade; o que falta não é artefato, é
**ambiente isolado e método**. Os dois estão no curso de malware, Módulo 8.

---

*Material didático original, de propósito defensivo e passivo.*
