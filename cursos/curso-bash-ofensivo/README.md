# Bash Ofensivo: Automação para Pentest

Curso de 20 horas sobre automação de testes de intrusão com bash. Seis módulos, teoria curta e
lab longo, tudo rodando em containers locais.

**Este é material original.** Não reproduz texto, exemplos nem estrutura de capítulos de
nenhuma obra comercial. As referências conceituais abertas estão na [ementa](00-ementa.md).

---

## Como usar este material

**Se você é aluno, siga em ordem.** Os módulos se acumulam: o script que você escreve no Módulo 2
vira entrada no Módulo 3, que alimenta o pipeline do Módulo 5. Pular a ordem funciona, mas você
refaz trabalho.

**Se você é instrutor**, cada módulo é independente o suficiente para uma aula de 3 a 4 horas.
Os labs têm gabarito em `avaliacoes.md`, e o `docker-compose.yml` no topo de cada módulo sobe
o alvo correspondente.

**Ritmo sugerido:** uma sessão de 2h por semana durante 10 semanas, ou uma imersão de 4 dias
(5h/dia). Não tente fazer 20h em um fim de semana — o Módulo 5 não entra na cabeça sem dormir
no meio.

---

## Trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [Fundamentos de shell ofensiva](modulo-01.md) | 3 | Um script que falha de forma controlada e registra erro |
| 2 | [Manipulação de texto e dados](modulo-02.md) | 3 | Saída crua de scanner virando tabela limpa |
| 3 | [Concorrência e performance](modulo-03.md) | 3 | Varredura paralela com saída à prova de corrida |
| 4 | [Automação de rede](modulo-04.md) | 4 | Checador de serviços com retry e timeout |
| 5 | [Automação de reconhecimento](modulo-05.md) | 4 | Pipeline de recon com dataset consolidado |
| 6 | [Scanning, fuzzing e relatório](modulo-06.md) | 3 | Pipeline end-to-end que gera relatório |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## Ambiente

Você precisa de **uma** destas opções:

1. **VM Linux** — Kali, Debian 12 ou Ubuntu 22.04+. É o caminho recomendado, porque é o mesmo
   ambiente que você encontra em engajamento real.
2. **WSL2 no Windows** — funciona bem para todos os labs. Instale com
   `wsl --install -d Ubuntu`.
3. **Container descartável** — se você não quer instalar nada, rode a partir de uma imagem
   `kalilinux/kali-rolling` e reinstale os pacotes a cada sessão.

Além disso: **Docker** e **Docker Compose** instalados. Todos os alvos dos labs são containers.

```bash
# Verificação rápida do ambiente
bash --version          # 5.0 ou superior
docker --version
docker compose version
python3 --version       # 3.8+
```

Se os quatro comandos respondem, você está pronto.

### Pacotes usados ao longo do curso

Não instale tudo de uma vez — cada módulo lista o que precisa. O conjunto completo:

```bash
sudo apt update
sudo apt install -y jq curl wget dnsutils nmap ffuf gobuster \
                    parallel netcat-openbsd tree shellcheck
```

`shellcheck` merece destaque: ele entra no Módulo 1 e é usado em todos os seguintes. É o linter
de bash que pega a maior parte dos bugs silenciosos antes de você rodar o script.

---

## Convenções do material

- Blocos de código marcados com `bash` são para digitar. Os que começam com `$` mostram o comando
  e a saída esperada abaixo.
- `N O T A` marca um detalhe que costuma morder o aluno.
- `⚠ É T I C A` marca a fronteira legal do que está sendo ensinado.
- Cada módulo termina com um **lab** e um bloco de **avaliação**.

---

## Os labs

Todos os labs são **locais e isolados**. Nenhum exercício do curso aponta para alvo externo,
de terceiro ou da internet. Se você adaptar um script daqui para uso real, a única coisa que
torna isso legal é **autorização escrita e escopo definido**.

⚠ Testar sistemas sem autorização é crime no Brasil (Código Penal, arts. 154-A e 266) e na
maioria das jurisdições. Não faça.
