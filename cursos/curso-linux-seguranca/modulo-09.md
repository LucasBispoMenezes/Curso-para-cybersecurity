# Módulo 9 — Log, `auditd` e Detecção

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** módulos 1 a 8

---

## Objetivos

1. Entender a hierarquia de log: `journald`, `rsyslog`, `auditd`.
2. Escrever regra de `auditd` que pega o que importa, sem inundar.
3. Reconhecer o que **não** aparece em log — e por quê.
4. Configurar retenção e integridade.
5. Distinguir **registrar** de **detectar**.

---

## ⚠ Antes de começar

⚠ **A distinção que organiza o módulo:**

| Registrar | **Detectar** |
|---|---|
| Guardar evento | **Perceber** o evento relevante |
| Volume alto | **Sinal** |
| "Está no log" | "**Alguém vai ver**" |
| Fácil | **Difícil** |

⚠ **A maior parte das auditorias de Linux verifica se o log existe.** Poucas verificam se ele
**retém o suficiente**, se **cobre o evento relevante**, e se **alguém foi alertado**.

⚠ **E a pergunta que revela o problema:**

> **Se alguém criar um usuário com `uid 0` na sua máquina agora, em quanto tempo você descobre?**
> **E onde isso está registrado?**

⚠ **Se você não sabe responder, o sistema registra e não detecta.** É o que este módulo corrige.

⚠ **Conduta:** você configura log na **sua** VM. **Registrar evento é defesa; evadir detecção é o
oposto** — e o curso não ensina o segundo.

---

## 9.1 A hierarquia — quem registra o quê

⚠ **Três camadas, e cada uma cobre o que as outras não cobrem.**

```
   APLICAÇÃO (sshd, sudo, nginx)
        │
        ├──────────────▶ journald          ← binário, indexado, por unit
        │                   │
        │                   └──▶ rsyslog   ← texto, /var/log
        │                           │
        │                           └──▶ arquivo em disco
        │
   KERNEL (syscall, LSM, netfilter)
        │
        └──────────────▶ auditd            ← ⚠ o ÚNICO que vê syscall
                            │
                            └──▶ /var/log/audit/audit.log
```

| Camada | O que vê | O que **não** vê |
|---|---|---|
| **`journald`** | Saída de aplicação, mensagem do kernel | **Syscall individual** |
| **`rsyslog`** | O que o `journald` encaminha | Idem |
| **`auditd`** | **Syscall, acesso a arquivo, mudança de credencial** | Lógica de aplicação |
| Netfilter (módulo 8) | Pacote | O que o processo faz com ele |

⚠ **A linha do `auditd` é a que importa para segurança.** Ele é o **único** que responde:

- quem abriu `/etc/shadow`?
- quem executou `/usr/bin/passwd`?
- quando uma regra de `iptables` mudou?
- quem mudou o `uid` de alguém?
- qual processo tentou carregar módulo de kernel?

⚠ **Nenhuma dessas perguntas é respondida por `journald` ou `rsyslog`** — porque eles veem a
**mensagem da aplicação**, não a **operação do kernel**.

```bash
mkdir -p ~/lab/mod09 && cd ~/lab/mod09

echo "═══ 1. o que está ativo ═══"
for s in systemd-journald rsyslog auditd; do
    estado=$(systemctl is-active "$s" 2>/dev/null)
    printf '  %-22s %s\n' "$s" "${estado:-não instalado}"
done

echo
echo "═══ 2. configuração do journald ═══"
grep -vE '^#|^$' /etc/systemd/journald.conf 2>/dev/null | sed 's/^/  /' || \
    echo "  (padrão — tudo comentado)"

echo
echo "  ⚠ os parâmetros que importam:"
cat <<'EXPL'
    Storage=persistent      ← ⚠ 'volatile' ou 'auto' perde log no reboot
    SystemMaxUse=           ← ⚠ sem limite, o journal cresce sem fim
    MaxRetentionSec=        ← quanto tempo retém
    ForwardToSyslog=yes     ← encaminha para rsyslog
    Compress=yes
    SystemMaxFileSize=
EXPL

echo
echo "═══ 3. retenção efetiva ═══"
journalctl --disk-usage 2>/dev/null | sed 's/^/  /'
echo "  primeiro log: $(journalctl --no-pager -n1 --reverse -o short-iso 2>/dev/null | head -1 | cut -c1-19)"
echo "  último log  : $(journalctl --no-pager -n1 -o short-iso 2>/dev/null | head -1 | cut -c1-19)"
```

⚠ **`Storage=volatile` é achado grave.** Significa que **todo log some no reboot** — e um atacante
que reinicia apaga a evidência. **É uma linha de configuração, e a correção é `persistent`.**

⚠ **E `SystemMaxUse` ausente é o outro extremo.** Sem limite, o journal cresce até encher o disco
— e **disco cheio é indisponibilidade**.

```bash
echo "═══ 4. o que está no /var/log ═══"
ls -la /var/log/ 2>/dev/null | head -20 | sed 's/^/  /'

echo
echo "  ⚠ permissão dos logs:"
for f in /var/log/syslog /var/log/auth.log /var/log/wtmp /var/log/btmp /var/log/lastlog; do
    [ -e "$f" ] && printf '  %-24s %s %s:%s\n' "$f" "$(stat -c %A "$f")" \
        "$(stat -c %U "$f")" "$(stat -c %G "$f")"
done

echo
echo "═══ 5. os arquivos de registro de sessão ═══"
cat <<'EXPL'
  /var/log/wtmp     quem LOGOU e quando    (comando: last)
  /var/log/btmp     quem FALHOU no login   (comando: lastb)  ⚠ requer root
  /var/log/lastlog  último login por usuário (comando: lastlog)
  /var/log/utmp     quem está logado AGORA  (comando: who)

  ⚠ estes são binários — não se lê com 'cat'
  ⚠ são a fonte para saber "quem entrou" e "quem tentou"
EXPL

echo
echo "  logins recentes:"
last -n 5 2>/dev/null | sed 's/^/    /'
echo
echo "  tentativas FALHAS recentes:"
sudo lastb -n 5 2>/dev/null | sed 's/^/    /' || echo "    (requer root)"
```

⚠ **A seção 5 é frequentemente esquecida na auditoria.** `wtmp` e `btmp` são **arquivos binários**
gerenciados por `logrotate` — e se o `logrotate` não os preserva, **o histórico de invasão se perde**.

**Produza `hierarquia.md`:**

| Item | Valor | Achado? |
|---|---|---|
| `journald` ativo | | |
| `rsyslog` ativo | | |
| `auditd` ativo | | |
| `Storage=` do journal | | |
| `SystemMaxUse` | | |
| Retenção efetiva | | |
| Permissão de `/var/log/auth.log` | | |

**Responda:**

1. **O `auditd` está ativo?** Se não, **nenhuma pergunta de syscall tem resposta.**
2. O `Storage` é `persistent`? **Se não, o que isso significa?**
3. **Quantos dias de log** o sistema retém?
4. Qual a permissão do `auth.log`? **Deveria ser mais restrita?**

---

## 9.2 `auditd` — a regra que funciona

⚠ **`auditd` é o único que vê syscall. E é o que precisa de regra escrita.**

```bash
echo "═══ 1. estado do auditd ═══"
sudo auditctl -s 2>/dev/null | sed 's/^/  /' || echo "  auditd não instalado"

echo
echo "═══ 2. regras ativas ═══"
sudo auditctl -l 2>/dev/null | sed 's/^/  /' || echo "  (nenhuma)"
```

### A anatomia de uma regra

```
-w /etc/shadow -p rwa -k leitura_shadow
│  │            │   │    │
│  │            │   │    └─ CHAVE: rótulo para buscar depois
│  │            │   └─ PERMISSÃO: r, w, x, a (atributo)
│  │            └─ CAMINHO monitorado
│  └─ watch: monitorar arquivo/diretório
└─ flag

-a always,exit -F arch=b64 -S execve -F uid=0 -k exec_root
│  │               │          │        │         │
│  │               │          │        │         └─ chave
│  │               │          │        └─ filtro: só uid 0
│  │               │          └─ SYSCALL monitorada
│  │               └─ arquitetura
│  └─ quando e onde: always,exit — toda saída de syscall
└─ flag
```

### As três formas de regra

| Forma | Sintaxe | Uso |
|---|---|---|
| **Watch** | `-w /caminho -p rwa -k chave` | Monitorar **arquivo** ou diretório |
| **Syscall** | `-a always,exit -F arch=b64 -S nome -k chave` | Monitorar **chamada de sistema** |
| **Controle** | `-a never,task` | **Excluir** ruído (idempotência) |

```bash
cd ~/lab/mod09

echo "═══ 3. as regras que o curso recomenda ═══"
cat > regras-audit.rules <<'RULES'
######################################################################
# Regras de auditoria — Linux para Segurança
# Foco: mudança de credencial, persistência, alteração de controle.
# ⚠ princípio: cada regra responde uma PERGUNTA de investigação.
######################################################################

# ── 1. CREDENCIAL: quem lê ou altera o arquivo de senha ──
-w /etc/passwd  -p wa -k identidade
-w /etc/shadow  -p rwa -k credencial
-w /etc/group   -p wa -k identidade
-w /etc/gshadow -p rwa -k credencial
-w /etc/sudoers -p wa -k delegacao
-w /etc/sudoers.d/ -p wa -k delegacao
-w /etc/pam.d/ -p wa -k autenticacao

# ── 2. PRIVILÉGIO: execução de ferramenta que muda credencial ──
-a always,exit -F arch=b64 -S setuid -S setgid -S setreuid -S setregid -k mudanca_uid
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/passwd -k uso_passwd
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/sudo -k uso_sudo
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/su -k uso_su
-a always,exit -F arch=b64 -S ptrace -k ptrace

# ── 3. CAPABILITY: mudança de conjunto ──
-a always,exit -F arch=b64 -S capset -k capability
-w /usr/bin/ -p wa -k binario_sistema

# ── 4. PERSISTÊNCIA: onde o atacante se instala ──
-w /etc/cron.d/ -p wa -k persistencia
-w /etc/crontab -p wa -k persistencia
-w /etc/systemd/system/ -p wa -k persistencia
-w /var/spool/cron/ -p wa -k persistencia
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/crontab -k cron
-w /etc/rc.local -p wa -k persistencia
-w /etc/ld.so.preload -p wa -k preload
-w /etc/ld.so.conf -p wa -k preload
-w /etc/environment -p wa -k ambiente

# ── 5. KERNEL: carregar módulo, alterar sysctl ──
-a always,exit -F arch=b64 -S init_module -S finit_module -S delete_module -k modulo_kernel
-w /etc/sysctl.conf -p wa -k sysctl
-w /etc/sysctl.d/ -p wa -k sysctl
-a always,exit -F arch=b64 -S mount -S umount2 -k montagem

# ── 6. REDE: alterar firewall, carregar regra ──
-a always,exit -F arch=b64 -S socket -F a0=17 -k socket_raw     # AF_PACKET
-a always,exit -F arch=b64 -S setns -S unshare -k namespace
-w /etc/hosts -p wa -k resolucao
-w /etc/resolv.conf -p wa -k resolucao

# ── 7. EXCLUSÃO DE RUÍDO ──
# ⚠ estas últimas evitam que o normal afogue o relevante
-a always,exit -F arch=b64 -S execve -F exe=/usr/lib/systemd/systemd -k nunca
-a always,exit -F arch=b64 -S execve -F exe=/usr/bin/systemctl -k nunca
RULES

echo "  regras escritas: $(grep -c '^-' regras-audit.rules)"
echo "  ⚠ NÃO aplique ainda — o laboratório testa em modo controlado"
```

⚠ **A estrutura do arquivo é o ponto.** As **sete seções** correspondem às **sete perguntas de
investigação**:

| Seção | Pergunta que responde |
|---|---|
| 1 — Credencial | Quem mexeu na identidade? |
| 2 — Privilégio | Quem virou outro usuário? |
| 3 — Capability | Quem mudou o conjunto de privilégio? |
| 4 — **Persistência** | **Onde o atacante se instalou?** |
| 5 — Kernel | Quem carregou código no kernel? |
| 6 — Rede | Quem mudou a configuração de rede? |
| 7 — Exclusão | — |

⚠ **A seção 4 é a mais valiosa.** Ela cobre **os lugares onde persistência se instala** — cron,
`systemd`, `ld.so.preload`, `environment`. **É a regra que responde "como ele sobreviveu ao
reboot".**

⚠ **E a seção 7 é a que torna tudo viável.** Sem exclusão, o `auditd` registra **milhares de eventos
por minuto** de processos de sistema — e **o log vira ruído**. **A exclusão não é opcional.**

```bash
echo "═══ 4. testando em modo controlado ═══"
echo "  ⚠ adiciona regra temporária, testa, e remove"
echo

# uma regra temporária só para o laboratório
sudo auditctl -w /tmp/teste-audit.txt -p wa -k teste_lab 2>/dev/null && {
    echo "  regra adicionada: -w /tmp/teste-audit.txt"

    # gera o evento
    echo "conteudo" > /tmp/teste-audit.txt
    cat /tmp/teste-audit.txt
    rm -f /tmp/teste-audit.txt

    sleep 1
    echo
    echo "  ═══ o que ficou registrado ═══"
    sudo ausearch -k teste_lab -i 2>/dev/null | tail -20 | sed 's/^/    /' || \
        echo "    (ausearch indisponível)"

    # remove a regra
    sudo auditctl -W /tmp/teste-audit.txt -p wa -k teste_lab 2>/dev/null
    echo
    echo "  ✓ regra removida"
} || echo "  auditd não disponível"
```

⚠ **A saída do `ausearch` é o que o módulo entrega.** Ela mostra: **quem** (uid, `auid`), **quando**
(timestamp), **o quê** (`syscall`, caminho), e **o resultado**. **É a resposta à pergunta de
investigação** — e sem a regra, essa resposta não existe.

⚠ **E note a diferença entre `uid` e `auid`.** O `uid` é **quem executou**; o `auid` é **quem se
autenticou originalmente** — e é o **`auid` que sobrevive ao `sudo`**. **É o campo que prova quem
fez, mesmo através de escalação.**

**Produza `auditd.md`:**

| Seção | Regras | Pergunta que responde | Ruído esperado |
|---|---|---|---|
| 1 — Credencial | | | |
| 2 — Privilégio | | | |
| 3 — Capability | | | |
| 4 — Persistência | | | |
| 5 — Kernel | | | |
| 6 — Rede | | | |

**Responda:**

1. **Quantas regras** em cada seção?
2. Qual seção é a **mais valiosa**? Por quê?
3. **Você testou uma regra?** O que o `ausearch` mostrou?
4. **Por que a seção 7 (exclusão) não é opcional?**

---

## 9.3 O `auid` — o campo que sobrevive ao `sudo`

⚠ **Esta seção vale o módulo.**

```bash
echo "═══ os campos de um evento de auditoria ═══"
cat <<'EXPL'
  time->Fri Oct 18 ...
  type=SYSCALL msg=audit(1234567890.123:456): arch=c000003e syscall=257
      success=yes exit=3 a0=ffffff9c a1=... a2=...
      items=1 ppid=1234 pid=5678
      auid=1000 uid=1000 gid=1000 euid=1000 suid=1000 fsuid=1000
      egid=1000 sgid=1000 fsgid=1000 tty=pts0 ses=3
      comm="cat" exe="/usr/bin/cat" key="teste_lab"
  │
  ├─ auid  = AUDIT UID — quem se logou ORIGINALMENTE
  ├─ uid   = quem executa AGORA
  ├─ euid  = efetivo (módulo 4!)
  ├─ suid  = salvo
  ├─ fsuid = para acesso a arquivo
  ├─ comm  = nome do programa
  ├─ exe   = caminho do binário
  ├─ ses   = ID da sessão de login  ← ⚠ agrupa tudo de um login
  └─ key   = a chave da regra
EXPL

echo
echo "═══ por que isso importa ═══"
cat <<'EXPL'
  Cenário: usuário entra por SSH, roda sudo, e edita /etc/passwd

    uid  = 0        (é root por causa do sudo)
    auid = 1000     ← ⚠ MAS quem fez foi o usuário de uid 1000

  ⚠ o uid diz "root fez isso" — inútil para investigação
  ⚠ o auid diz "o usuário joao fez isso, com privilégio"
  ⚠ e o 'ses' liga todos os eventos do MESMO login

  ⚠ sem auid, toda ação com privilégio parece ter sido feita por root
     e você não consegue atribuir a ninguém.
EXPL

echo
echo "═══ buscando por sessão ═══"
echo "  ⚠ o 'ses' permite reconstruir tudo que um login fez:"
echo
echo "    sudo ausearch -a <auid> -ts recent"
echo "    sudo ausearch -k mudanca_uid -i | grep auid"
echo "    sudo aureport --auth --summary"
```

⚠ **A demonstração é conceitual porque exige `sudo` no laboratório.** Mas o ponto é objetivo:
**`auid` é o campo de atribuição.** Sem ele, você tem evento sem responsável.

⚠ **E é por isso que `auditd` é obrigatório.** `journald` registra a mensagem `sudo: user : TTY=...
COMMAND=...` — mas **não registra o que o comando fez com privilégio**. **O `auditd` registra a
operação do kernel com o `auid` junto** — e é o casamento dos dois que reconstrói o incidente.

**Produza `auid.md`:**

| Campo | O que significa | Por que importa |
|---|---|---|
| `auid` | | |
| `uid` | | |
| `euid` | | |
| `ses` | | |
| `exe` | | |
| `key` | | |

**Responda:**

1. **Qual campo atribui a ação** a quem realmente fez?
2. Por que `uid` sozinho é **inútil** numa investigação com `sudo`?
3. O que `ses` permite reconstruir?
4. **Por que `journald` sozinho não resolve** a pergunta de atribuição?

---

## 9.4 O que **não** aparece em log

⚠ **A parte honesta do módulo.** Saber o limite do log é o que faz a auditoria ser confiável.

| Ação | `journald` vê? | `auditd` vê? | Comentário |
|---|---|---|---|
| Login por SSH | ✓ | ✓ (com regra) | |
| `sudo` usado | ✓ | ✓ | |
| Criar usuário | ✓ | ✓ | |
| **Ler `/etc/shadow`** | **✗** | ✓ | ⚠ só com regra `-w` |
| **Executar binário sem `execve` logado** | ✗ | ✓ | ⚠ só com regra `-S execve` |
| **Escrever em memória de processo** | ✗ | parcial | `ptrace` com regra |
| **Conexão de saída** | ✗ | ✗ | ⚠ módulo 8, e é netfilter |
| **Leitura de arquivo comum** | ✗ | ✗ sem regra | ⚠ volume seria absurdo |
| **Operação dentro de contêiner** | parcial | parcial | ⚠ log do host não vê o namespace |
| **Ação com `auid` apagado** | ✗ | ✗ | `loginuid` pode ser zerado |
| **Tráfego em rede sem netfilter** | ✗ | ✗ | |
| **Conteúdo de arquivo lido** | ✗ | ✗ | ⚠ só o acesso, não o dado |
| **Evento durante reboot** | ✗ | ✗ | ⚠ e `Storage=volatile` piora |

⚠ **As três linhas mais importantes:**

| Linha | Consequência |
|---|---|
| **Log do host não vê o contêiner** | Você precisa do log **de dentro** |
| **`auid` pode ser apagado** | Existe forma de perder atribuição |
| **`Storage=volatile` + reboot** | ⚠ **Evidência desaparece** |

```bash
echo "═══ 1. o problema do contêiner ═══"
cat <<'EXPL'
  Contêiner tem namespace de PID e de mount (módulo 6).
  O journald do HOST vê:
    · o processo do contêiner? parcialmente (por PID do host)
    · o log da APLICAÇÃO dentro? ⚠ não, se ela escreve em arquivo interno

  → você precisa coletar o log de dentro do contêiner
  → e o auditd do host NÃO audita syscall dentro do namespace do contêiner
     (na prática, depende da configuração)

  ⚠ conclusão: log de contêiner é um problema SEPARADO.
EXPL

echo
echo "═══ 2. loginuid — a atribuição que pode falhar ═══"
cat /proc/self/loginuid 2>/dev/null | sed 's/^/  meu loginuid: /'
echo
cat <<'EXPL'
  /proc/<pid>/loginuid  = o auid do processo
  ⚠ valor 4294967295 (0xFFFFFFFF) significa NÃO DEFINIDO
  ⚠ acontece em: processo de kernel, contêiner sem configuração, serviço de sistema

  Se um processo relevante tem loginuid indefinido, a ação dele
  NÃO É ATRIBUÍVEL a um usuário.

  ⚠ verifique: processos com loginuid indefinido que fazem trabalho relevante
EXPL

echo
echo "  processos com loginuid indefinido:"
count=0
for pid in $(ls /proc 2>/dev/null | grep '^[0-9]' | head -60); do
    lu=$(cat "/proc/${pid}/loginuid" 2>/dev/null)
    if [ "$lu" = "4294967295" ]; then
        count=$((count+1))
        [ "$count" -le 6 ] && printf '    %-8s %s\n' "$pid" "$(cat "/proc/${pid}/comm" 2>/dev/null)"
    fi
done
echo "    total (dos 60 primeiros): ${count}"
echo "  ⚠ normal para processo de sistema; anômalo para serviço de aplicação"

echo
echo "═══ 3. retenção — a evidência que some ═══"
cat <<'EXPL'
  Se a retenção é de 7 dias e o incidente foi há 10, não há evidência.
  ⚠ o atacante ESPERA por isso.

  Regra prática:
    · 90 dias mínimo em servidor de produção
    · 1 ano em sistema crítico ou com requisito regulatório
    · e a retenção precisa estar FORA da máquina (log remoto)
      ⚠ porque atacante com root apaga o log local
EXPL

echo
echo "  ⚠ log local + atacante com root = evidência perdida"
echo "  ⚠ a única defesa é log REMOTO (rsyslog para outro host, ou SIEM)"
```

⚠ **A última linha é a conclusão mais importante do módulo.** **Log local não sobrevive a um
atacante com `root`.** Ele tem `truncate`, `rm`, e desativação de serviço. **A única defesa é o log
sair da máquina em tempo real.**

**Produza `limites.md`:**

| Ação | Está em log? | Com qual regra | Onde |
|---|---|---|---|
| Login SSH | | | |
| `sudo` | | | |
| Ler `/etc/shadow` | | | |
| Conexão de saída | | | |
| Operação em contêiner | | | |

**Responda:**

1. **Qual ação** você não consegue ver sem `auditd`?
2. **Por que log de contêiner é um problema separado?**
3. O que `loginuid = 4294967295` significa?
4. **Por que log local não sobrevive a atacante com `root`?** Qual a defesa?

---

## 9.5 LAB — Configurar detecção

**Duração:** 120 min

### Passo 1 — Diagnóstico do log atual (30 min)

```bash
cd ~/lab/mod09

cat > audita-log.sh <<'SCRIPT'
#!/usr/bin/env bash
# audita-log.sh — diagnóstico de capacidade de registro e detecção
set -uo pipefail

SAIDA="${1:-log.txt}"

{
    echo "═══════════ AUDITORIA DE LOG E DETECÇÃO ═══════════"
    echo "host: $(hostname)   data: $(date -Is)"
    echo

    echo "── 1. SERVIÇOS DE LOG ──"
    for s in systemd-journald rsyslog auditd; do
        printf '  %-22s %s\n' "$s" "$(systemctl is-active "$s" 2>/dev/null || echo 'não instalado')"
    done
    echo

    echo "── 2. CONFIGURAÇÃO DO JOURNALD ──"
    grep -vE '^#|^$' /etc/systemd/journald.conf 2>/dev/null | sed 's/^/  /'
    echo "  storage efetivo : $(journalctl --no-pager -n1 -o json 2>/dev/null | \
        head -1 | grep -oE '"_SOURCE_REALTIME_TIMESTAMP"' >/dev/null && echo persistent || echo '?')"
    echo "  uso em disco   : $(journalctl --disk-usage 2>/dev/null | grep -oE '[0-9.]+[KMGT]?B' | head -1)"
    echo

    echo "── 3. RETENÇÃO ──"
    printf '  mais antigo: %s\n' "$(journalctl --no-pager -o short-iso 2>/dev/null | head -1 | cut -c1-19)"
    printf '  mais novo  : %s\n' "$(journalctl --no-pager -n1 --reverse -o short-iso 2>/dev/null | head -1 | cut -c1-19)"
    echo

    echo "── 4. ROTATE ──"
    [ -f /etc/logrotate.conf ] && grep -E '^(rotate|weekly|daily|monthly|size)' /etc/logrotate.conf 2>/dev/null | sed 's/^/  /'
    echo "  regras em /etc/logrotate.d/: $(ls /etc/logrotate.d/ 2>/dev/null | wc -l)"
    echo

    echo "── 5. ARQUIVOS DE SESSÃO ──"
    for f in /var/log/wtmp /var/log/btmp /var/log/lastlog /var/log/utmp; do
        [ -e "$f" ] && printf '  %-22s %s  %s\n' "$f" "$(stat -c %A "$f")" "$(stat -c %s "$f")"
    done
    echo

    echo "── 6. AUDITD: ESTADO ──"
    if command -v auditctl >/dev/null; then
        auditctl -s 2>/dev/null | sed 's/^/  /'
    else
        echo "  ⚠ auditd NÃO INSTALADO — nenhuma pergunta de syscall tem resposta"
    fi
    echo

    echo "── 7. AUDITD: REGRAS ATIVAS ──"
    auditctl -l 2>/dev/null | sed 's/^/  /' || echo "  (nenhuma, ou indisponível)"
    echo

    echo "── 8. COBERTURA DAS SETE PERGUNTAS ──"
    regras=$(auditctl -l 2>/dev/null || true)
    q() { printf '%s' "$regras" | grep -q "$1" && echo "✓ coberta" || echo "⚠ NÃO coberta"; }
    printf '  credencial (passwd/shadow) : %s\n' "$(q 'passwd\|shadow\|credencial\|identidade')"
    printf '  privilégio (setuid/sudo)   : %s\n' "$(q 'setuid\|sudo\|mudanca_uid')"
    printf '  capability                 : %s\n' "$(q 'capset\|capability')"
    printf '  persistência (cron/systemd): %s\n' "$(q 'cron\|systemd\|persistencia')"
    printf '  kernel (módulo)            : %s\n' "$(q 'module\|modulo_kernel')"
    printf '  rede (firewall/unshare)    : %s\n' "$(q 'socket\|setns\|namespace')"
    printf '  montagem                   : %s\n' "$(q 'mount\|montagem')"
    echo

    echo "── 9. ATRIBUIÇÃO (loginuid) ──"
    indef=0
    for pid in $(ls /proc 2>/dev/null | grep '^[0-9]'); do
        lu=$(cat "/proc/${pid}/loginuid" 2>/dev/null)
        [ "$lu" = "4294967295" ] && indef=$((indef+1))
    done
    printf '  processos com loginuid indefinido: %s\n' "$indef"
    echo

    echo "── 10. LOG REMOTO ──"
    if grep -qE '^\s*\*\.\*\s+@' /etc/rsyslog.conf /etc/rsyslog.d/*.conf 2>/dev/null; then
        grep -hE '^\s*\*\.\*\s+@' /etc/rsyslog.conf /etc/rsyslog.d/*.conf 2>/dev/null | sed 's/^/  ✓ /'
    else
        echo "  ⚠ NENHUM log remoto configurado"
        echo "     ⚠ atacante com root apaga o log local — sem remoto, evidência se perde"
    fi

} > "$SAIDA" 2>&1

echo "salvo em ${SAIDA} ($(wc -l < "$SAIDA") linhas)"
SCRIPT

chmod +x audita-log.sh
sudo ./audita-log.sh log.txt
cat log.txt
```

Produza `diagnostico-log.md`:

| Item | Valor | Achado? |
|---|---|---|
| `journald` | | |
| `rsyslog` | | |
| **`auditd`** | | |
| `Storage` | | |
| Retenção (dias) | | |
| **Cobertura das 7 perguntas** | | |
| Log remoto | | |

**Responda:**

1. **Quantas das sete perguntas estão cobertas?**
2. Nenhuma coberta? **É o achado mais comum, e o mais grave.**
3. Qual a retenção? **Cobre um incidente de 30 dias atrás?**
4. Existe log remoto? **Se não, o que isso significa?**

### Passo 2 — Aplicar as regras e testar (40 min)

```bash
cd ~/lab/mod09

echo "═══ 1. backup do estado atual ═══"
sudo cp -r /etc/audit/rules.d/ /tmp/audit-rules-backup-$(date +%s) 2>/dev/null && \
    echo "  ✓ backup em /tmp/" || echo "  (auditd não instalado)"

echo
echo "═══ 2. instalando as regras do curso ═══"
if command -v auditctl >/dev/null; then
    sudo cp regras-audit.rules /etc/audit/rules.d/99-curso.rules 2>/dev/null && \
        echo "  ✓ regras copiadas para /etc/audit/rules.d/99-curso.rules"

    # carrega em modo de teste (sem reiniciar o serviço)
    echo
    echo "  carregando regras em modo de teste..."
    sudo augenrules --load 2>&1 | head -5 | sed 's/^/    /' || \
        sudo auditctl -R regras-audit.rules 2>&1 | head -5 | sed 's/^/    /'

    echo
    echo "  regras ativas agora: $(sudo auditctl -l 2>/dev/null | wc -l)"
else
    echo "  ⚠ auditd não instalado — instale com: sudo apt install auditd audispd-plugins"
fi

echo
echo "═══ 3. gerando evento e verificando ═══"
echo "  ⚠ na VM: simula a ação e verifica o registro"

# muda um arquivo monitorado
sudo touch /etc/cron.d/teste-audit 2>/dev/null
sudo rm -f /etc/cron.d/teste-audit 2>/dev/null

sleep 1

echo
echo "  ── o que ficou registrado (chave persistencia) ──"
sudo ausearch -k persistencia -ts recent 2>/dev/null | tail -25 | sed 's/^/    /' || \
    echo "    (ausearch indisponível ou sem evento)"

echo
echo "  ── resumo por chave ──"
sudo aureport -k --summary 2>/dev/null | tail -20 | sed 's/^/    /' || \
    echo "    (aureport indisponível)"
```

⚠ **A verificação é o entregável técnico.** Você **gerou** o evento e **confirmou** que ele foi
registrado **com a chave certa** e **com o `auid` correto**. **Sem essa confirmação, a regra é
teoria.**

⚠ **E note o `aureport -k --summary`.** Ele dá a **contagem por chave** — ou seja, **quais regras
estão gerando evento e quais nunca dispararam**. **Uma regra que nunca dispara pode estar errada**,
e é o tipo de erro que só aparece assim.

```bash
echo "═══ 4. o que NÃO disparou ═══"
echo
cat <<'EXPL'
  Regras que não dispararam em 24h merecem investigação:

    1. a regra está ERRADA?     (caminho errado, syscall inexistente)
    2. o evento não acontece?   (normal para regra de incidente raro)
    3. o serviço não recarregou as regras?

  ⚠ verifique com:  sudo auditctl -l | grep <chave>
  ⚠ e teste manualmente: gere o evento de propósito
EXPL

echo
echo "  contagem por chave:"
sudo aureport -k --summary 2>/dev/null | tail -15 | sed 's/^/    /'
```

**Produza `regras-testadas.md`:**

| Chave | Disparou? | Eventos | O evento foi o esperado? |
|---|---|---|---|
| `credencial` | | | |
| `persistencia` | | | |
| `mudanca_uid` | | | |
| `capability` | | | |

**Responda:**

1. **Quantas regras dispararam** no teste?
2. **Alguma chave não tem evento nenhum?** O que fazer?
3. O evento foi **atribuído a quem**? (Campo `auid`.)
4. **O `aureport` mostrou a chave que você esperava** para o evento que você gerou?

### Passo 3 — Retenção e log remoto (50 min)

⚠ **A metade do módulo que a maioria esquece.**

```bash
cd ~/lab/mod09

cat > config-retensao.sh <<'SCRIPT'
#!/usr/bin/env bash
# config-retensao.sh — configuração de retenção e integridade de log
set -uo pipefail

echo "═══════════ RETENÇÃO E INTEGRIDADE ═══════════"
echo

echo "── 1. JOURNALD: retenção ──"
cat <<'EXPL'
  Em /etc/systemd/journald.conf:

    [Journal]
    Storage=persistent              ← ⚠ sobrevive a reboot
    SystemMaxUse=2G                 ← limite de disco
    SystemKeepFree=1G               ← espaço livre mínimo
    MaxRetentionSec=90day           ← ⚠ retenção explícita
    MaxFileSec=1month
    Compress=yes
    ForwardToSyslog=yes
    Audit=yes                       ← ⚠ recebe os eventos do auditd
EXPL

echo
echo "── 2. AUDITD: retenção ──"
cat <<'EXPL'
  Em /etc/audit/auditd.conf:

    max_log_file = 50               ← tamanho por arquivo (MB)
    num_logs = 20                   ← ⚠ número de rotações
    max_log_file_action = keep_logs ← ⚠ NÃO use 'rotate' nem 'ignore'
    space_left_action = email       ← ⚠ ou 'exec' para alertar
    admin_space_left_action = single
    disk_full_action = single       ← ⚠ para de aceitar login se encher
    disk_error_action = single
    flush = incremental

  ⚠ 'max_log_file_action = rotate' APAGA o mais antigo.
     'keep_logs' preserva até o limite de num_logs — melhor para investigação.
EXPL

echo
echo "  estado atual:"
grep -vE '^#|^$' /etc/audit/auditd.conf 2>/dev/null | grep -E '^(max|num|space|disk|flush)' | sed 's/^/    /'

echo
echo "── 3. INTEGRIDADE: o log pode ser alterado? ──"
cat <<'EXPL'
  VERDADE DESCONFORTÁVEL:
    log local, com root disponível, É ALTERÁVEL.
    root pode: truncar, apagar, editar, desativar o serviço.

  Defesas parciais:
    · auditd com 'immutable' → -e 2 nas regras
      ⚠ impede QUALQUER mudança de regra até o reboot
      ⚠ e também impede o atacante de remover regra

    · log remoto (rsyslog para outro host)
      ⚠ o atacante teria que comprometer DOIS hosts

    · SIEM / coletor externo
      ⚠ a única defesa real

  ⚠ se você tem um host, você tem log alterável.
  ⚠ se você tem DOIS hosts, o atacante precisa dos dois.
EXPL

echo
echo "  ⚠ regra imutável (-e 2) presente?"
grep -q '^-e 2' /etc/audit/rules.d/*.rules 2>/dev/null && \
    echo "    ✓ presente" || echo "    ⚠ AUSENTE — regras podem ser removidas pelo atacante"

echo
echo "── 4. LOG REMOTO: a defesa real ──"
echo
cat <<'EXPL'
  Em /etc/rsyslog.d/50-remoto.conf:

    *.* @@log-servidor.exemplo.com:514     ← TCP (recomendado)
    *.* @log-servidor.exemplo.com:514      ← UDP (⚠ pode perder)
    # ou:
    action(type="omfwd" target="log.exemplo.com" port="514"
           protocol="tcp" queue.type="LinkedList"
           queue.filename="fwdq" queue.saveonshutdown="on"
           action.resumeRetryCount="-1")

  ⚠ queue.saveonshutdown="on" faz o log sobreviver a queda do destino.

  Para o AUDITD, encaminhe /var/log/audit/audit.log:
    · com audisp-remote
    · ou com um agente que lê o arquivo e envia
EXPL

echo
echo "  configuração atual de log remoto:"
grep -rhE '^\s*[^#].*@' /etc/rsyslog.conf /etc/rsyslog.d/*.conf 2>/dev/null | sed 's/^/    /' || \
    echo "    ⚠ nenhuma"

echo
echo "── 5. O TESTE: quanto tempo você levaria para descobrir? ──"
cat <<'EXPL'
  Cenário: alguém cria agora um usuário com uid 0 na sua máquina.

  Perguntas para responder:
    1. A criação do usuário está em log?          (journald + auditd)
    2. A atribuição está clara?                    (auid)
    3. Alguém SERIA ALERTADO?                      ⚠ o centro da questão
    4. Quanto tempo o log retém?                   (e o incidente foi quando?)
    5. O log sobrevive se o atacante apagar?       ⚠ log remoto

  ⚠ se a resposta 3 é "ninguém", você REGISTRA e não DETECTA.
EXPL
SCRIPT

chmod +x config-retensao.sh
sudo ./config-retensao.sh 2>&1 | tee retensao-saida.txt
```

Produza `retencao.md`:

| Item | Valor atual | Deveria ser | Achado |
|---|---|---|---|
| `Storage` | | `persistent` | |
| `SystemMaxUse` | | limite definido | |
| `MaxRetentionSec` | | `90day` | |
| `max_log_file_action` | | `keep_logs` | |
| `num_logs` | | ≥ 20 | |
| `-e 2` (imutável) | | presente | |
| Log remoto | | configurado | |

**Responda:**

1. **A retenção cobre 90 dias?** Se não, qual o risco?
2. O `max_log_file_action` é `keep_logs` ou `rotate`? **Qual a diferença?**
3. **A regra `-e 2` está presente?** O que ela impede?
4. **Existe log remoto?** Se não, **o log sobrevive a um atacante com `root`?**

⚠ **A resposta 4 é a conclusão do módulo.** Log local **não** é evidência confiável contra atacante
com `root`. **Só o remoto é.** E é a recomendação de maior valor do relatório.

### Critérios de aceitação

- `audita-log.sh` rodando, com as **dez** seções.
- Você identificou **quantas das sete perguntas** estão cobertas (provavelmente **zero**).
- `regras-audit.rules` com as **sete seções** e a **exclusão de ruído**.
- Você aplicou as regras e **testou** uma delas gerando o evento.
- Você confirmou o evento no `ausearch`, **com a chave e o `auid`**.
- Você usou `aureport -k --summary` e identificou **qual regra não disparou**.
- Você explicou por que **`auid` e `uid` são diferentes**, e por que isso importa.
- `limites.md` com o que **não** aparece em log, e as duas lacunas principais.
- `retencao.md` com a retenção **real** e o que deveria ser.
- Você explicou por que `volatile` é achado grave.
- Você explicou por que **log local não sobrevive** a atacante com `root`.
- `relatorio-log.md` com o **teste das cinco perguntas** respondido.

---

## Avaliação

1. Descreva as três camadas de log e o que cada uma cobre.
2. **Qual é a única que vê syscall?** Cite cinco perguntas que só ela responde.
3. Por que `Storage=volatile` é achado grave?
4. O que `SystemMaxUse` ausente causa?
5. Cite os quatro arquivos de sessão (`wtmp`, `btmp`, `utmp`, `lastlog`) e o comando de cada um.
6. Descreva a anatomia de uma regra de `auditd` — as duas formas.
7. **Por que `auid` e `uid` são diferentes?** Qual atribui a ação?
8. O que `ses` permite reconstruir?
9. **Por que `journald` sozinho não resolve** a atribuição?
10. Cite as sete seções de regra e a pergunta de cada uma.
11. **Por que a seção de persistência é a mais valiosa?**
12. Por que a **exclusão de ruído** não é opcional?
13. **Cite cinco ações que NÃO aparecem em log.**
14. **Por que log de contêiner é um problema separado?**
15. O que `loginuid = 4294967295` significa?
16. O que `-e 2` nas regras de auditoria faz? Qual o efeito colateral?
17. Diferencie `max_log_file_action = rotate` de `keep_logs`.
18. **Por que log local não sobrevive a atacante com `root`?** Qual a única defesa real?
19. O que `queue.saveonshutdown="on"` faz?
20. **Diferencie registrar de detectar.** Qual é o difícil, e por quê?

---

**Próximo:** [Módulo 10 — `hardening` com selo](modulo-10.md)
