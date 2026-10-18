# Enumeração Esotérica

Curso de 26 horas, nove módulos. A superfície que a ferramenta padrão **não** vê.

---

## A linha de progressão

| | Módulo 1 | Módulo 9 |
|---|---|---|
| **Enumeração** | Roda `nmap` e para | Escolhe o método pela **pergunta** |
| **DNS** | `A` e `CNAME` | `TXT`, `MX`, `NS`, `SOA`, zona, wildcard |
| **Certificado** | Não sabe o que é SAN | Encontra host que **não está no DNS** |
| **Documento** | Lê a página atual | Acha o **removido** e o **nunca linkado** |
| **Rede** | Enumera o escopo | Acha o **vizinho de bloco** |
| **Entregável** | Lista de portas | **Mapa de superfície** com evidência |

**Pré-requisito duro:** curso de **redes** + **OSINT Global** (módulo 7) deste material.

---

## A tese

Cursos de enumeração ensinam a rodar ferramenta. Este ensina **que perguntas fazer**.

⚠ **A enumeração comum responde "quais portas estão abertas neste IP" e para.** O que ela não
responde: que hosts a organização tem (certificado), que domínio ela esqueceu (`TXT`, zona),
que arquivo ela publicou e removeu (CDX), que serviço roda atrás da CDN (PTR, bloco), que
credencial vazou (histórico de commit).

⚠ **"Esotérica" quer dizer: fontes que ninguém enumera porque a ferramenta padrão não as cobre.**
Não é segredo — é **método**.

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [Método: a pergunta antes da ferramenta](modulo-01.md) | 2 | A matriz pergunta → método |
| 2 | [DNS além do `A`](modulo-02.md) | 3 | Host achado por `TXT` e por zona |
| 3 | [Certificado como fonte de host](modulo-03.md) | 3 | Host que não está no DNS |
| 4 | [Superfície esquecida](modulo-04.md) | 3 | O que foi removido, e o nunca linkado |
| 5 | [Rede adjacente](modulo-05.md) | 3 | O vizinho de bloco que o cliente esqueceu |
| 6 | [Exposição em terceiro](modulo-06.md) | 3 | Bucket, painel, repositório |
| 7 | [Correlação](modulo-07.md) | 3 | Mapa priorizado + prova de posse |
| 8 | [Limites](modulo-08.md) | 2 | Saber onde parar |
| 9 | [Projeto](modulo-09.md) | 4 | O entregável completo |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## ⚠ Antes do primeiro lab — a regra mais restritiva do material

⚠ **Este curso usa alvo real.** É o único jeito de aprender enumeração. Por isso:

| Sujeito permitido | Sujeito **proibido** |
|---|---|
| **Domínio seu** | Domínio de terceiro |
| **Seu laboratório** (DNS + web local) | Qualquer coisa sem autorização |
| **Bug bounty com escopo público** | Fora do escopo declarado |
| **Cliente com contrato assinado** | Sem contrato |

⚠ **Enumeração é reconhecimento.** Feita sem autorização, é a fase que precede ataque. **A
autorização escrita é o que separa auditoria de crime** — não a intenção.

⚠ **E o risco prático:** brute force de subdomínio contra resolvedor público é **abuso de recurso
de terceiro**. Volume alto é indisponibilidade, mesmo sem intenção.

### O laboratório autossuficiente

Se você não tem domínio, o curso funciona com um lab local:

```bash
mkdir -p ~/enum-lab && cd ~/enum-lab

# 1. Torre de DNS autoritativo (bind9 ou dnsmasq)
# 2. Servidor web com arquivos variados
# 3. Certificado autoassinado com SAN de vários nomes
# 4. Um "arquivo morto" local para exercitar CDX

# tudo em docker-compose, isolado, sem sair da máquina
```

⚠ **O lab local exercita todos os métodos** e é o caminho recomendado para quem não tem domínio
próprio. Cada módulo traz o setup.

---

## Ambiente

```bash
sudo apt update
sudo apt install -y dnsutils whois curl jq tshark python3 python3-pip git
pip3 install dnspython requests
```

⚠ **Ferramenta é opcional.** O curso mostra cada método com `dig`, `curl` e `jq` — sem dependência.
O `subfinder` e o `httpx` aparecem como **aceleração**, não como requisito.

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **Método** | 1 semana | 1 |
| **As três fontes** | 3 semanas | 2–4 |
| **Rede e terceiro** | 2 semanas | 5–6 |
| **Fechamento** | 2 semanas | 7–9 |

⚠ **Estimativa a 10 h/semana.** O módulo 3 (certificado) e o 7 (correlação) costumam levar mais —
são os que exigem julgamento.

---

## Como isso se conecta

| Curso | Ligação |
|---|---|
| **Redes** | Pré-requisito: DNS, TLS, `tcpdump` |
| **OSINT Global** | Módulo 7 de lá: domínio, certificado, ASN |
| **Bash Ofensivo** | Automação de recon com `curl` e `jq` |
| **APT/C2** | Infraestrutura de adversário — a mesma técnica, outro alvo |
