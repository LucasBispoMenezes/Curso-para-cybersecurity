# Módulo 1 — O Sistema como Superfície

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** terminal em Linux

---

## Objetivos

1. Entender o boot e onde cada decisão de segurança é tomada.
2. Ler o estado do `systemd` e saber o que ele revela.
3. Mapear a superfície do sistema: serviço, socket, permissão, ponto de montagem.
4. Distinguir **superfície instalada** de **superfície ativa**.
5. Reconhecer o que um atacante enumera primeiro.

---

## ⚠ Antes de começar

⚠ **Todo comando roda na sua VM do laboratório.** A `linux-lab`, que é limpa. **Nada aqui aponta
para fora.**

⚠ **E a pergunta que organiza o curso inteiro:**

> **Não é "quais vulnerabilidades este sistema tem". É "qual é a superfície que este sistema
> expõe".**

⚠ **A diferença é grande.** Vulnerabilidade é um bug específico. **Superfície é tudo que está
exposto e precisa de defesa** — serviço, porta, arquivo, permissão, socket, cron, módulo, ponto de
montagem. E a superfície existe **antes** de qualquer bug.

---

## 1.1 O boot — onde as decisões são tomadas

⚠ **Cada etapa do boot é uma decisão de segurança.** A maioria fica no padrão, e o padrão raramente
é o mais restrito.

```
┌───────────────────────────────────────────────────────────────┐
│ FIRMWARE (UEFI/BIOS)                                          │
│   · Secure Boot ligado?  ← impede kernel modificado            │
├───────────────────────────────────────────────────────────────┤
│ BOOTLOADER (GRUB)                                             │
│   · Senha no GRUB?       ← sem ela, init=/bin/sh com root      │
│   · Parâmetros do kernel ← o que o cmdline expõe                │
├───────────────────────────────────────────────────────────────┤
│ KERNEL                                                        │
│   · lockdown?  · módulo assinado?  · sysctl permissivo?        │
├───────────────────────────────────────────────────────────────┤
│ INITRAMFS → monta o / real                                    │
│   · qual módulo é carregado?  · /tmp é tmpfs ou disco?         │
├───────────────────────────────────────────────────────────────┤
│ init/systemd (PID 1)                                          │
│   · quantos serviços SOBEM?  ← cada um é superfície            │
├───────────────────────────────────────────────────────────────┤
│ SERVIÇOS, SOCKET, TIMER, CRON                                 │
│   · o que escuta?  · com que usuário?  · o que é gravável?     │
└───────────────────────────────────────────────────────────────┘
```

```bash
# Na VM do laboratório
mkdir -p ~/lab/mod01 && cd ~/lab/mod01

echo "═══ 1. parâmetros do kernel (o que o GRUB passou) ═══"
cat /proc/cmdline

echo
echo "═══ 2. proteção do boot ═══"
[ -d /sys/firmware/efi ] && echo "  boot: UEFI" || echo "  boot: BIOS legado"
mokutil --sb-state 2>/dev/null || echo "  (mokutil indisponível)"
grep -E '^GRUB_TIMEOUT|^GRUB_CMDLINE_LINUX' /etc/default/grub 2>/dev/null

echo
echo "═══ 3. kernel ═══"
uname -a
echo "  lockdown: $(cat /sys/kernel/security/lockdown 2>/dev/null || echo 'não disponível')"
```

⚠ **A linha "parâmetros do kernel" é a primeira pergunta de auditoria.** Se o `cmdline` traz
`init=/bin/sh`, ou `single`, ou `rw init=/bin/bash` — **o sistema tem root sem senha no boot**, e
nada mais importa.

⚠ **E a linha do lockdown é a segunda.** Sem `lockdown=integrity` ou `=confidentiality`, o kernel
permite alterar coisas que não deveria — como ler `/dev/mem`.

**Produza `boot.md`:**

| Item | Valor no seu sistema | É o padrão restrito? |
|---|---|---|
| Boot | | |
| Secure Boot | | |
| `GRUB_TIMEOUT` | | |
| `cmdline` | | |
| Lockdown | | |

**Responda:**

1. **O `cmdline` traz algo suspeito?** (`init=`, `single`, `rw` no kernel)
2. Se você editasse o GRUB no boot, entraria como `root`? **Teste na VM** (é sua).
3. O Secure Boot está ligado?
4. **Qual das quatro linhas é a mais grave** se estiver errada?

⚠ **A resposta 2 é o teste clássico.** Reinicie a VM, edite a linha do GRUB, e adicione
`init=/bin/sh`. **Se entrar como `root` sem senha, o sistema não tem fronteira de boot** — e essa
descoberta vai para o relatório do módulo 11.

---

## 1.2 `systemd` — o que ele revela

⚠ **O `systemd` é onde a superfície realmente vive.** Cada `.service`, `.socket`, `.timer` e
`.mount` é superfície.

```bash
echo "═══ serviços que SUBIRAM (não os instalados) ═══"
systemctl list-units --type=service --state=running --no-pager | head -25

echo
echo "═══ contagem ═══"
printf '  running : %s\n' "$(systemctl list-units --type=service --state=running --no-pager | grep -c '\.service')"
printf '  falhados: %s\n' "$(systemctl list-units --type=service --state=failed --no-pager | grep -c '\.service')"

echo
echo "═══ sockets à espera (porta já aberta antes do serviço subir) ═══"
systemctl list-units --type=socket --state=active --no-pager | head -15

echo
echo "═══ timers (cron do systemd) ═══"
systemctl list-timers --all --no-pager | head -15
```

⚠ **Note a diferença entre `running` e `installed`.** Um sistema pode ter 40 serviços instalados e
8 rodando. **A superfície é o que roda** — mas o **instalado** também importa, porque pode ser
ativado por dependência ou por `socket`.

⚠ **E o `socket` unit é sutil e importante.** Ele faz o `systemd` **abrir a porta** e só então
iniciar o serviço — o que significa que **a porta está aberta mesmo com o serviço parado**. É
superfície que a maioria dos inventários não vê.

### O que cada serviço roda como

```bash
echo "═══ serviços rodando como root ═══"
for u in $(systemctl list-units --type=service --state=running --no-pager | \
           awk '/\.service/ {print $1}'); do
    user=$(systemctl show -p User --value "$u" 2>/dev/null)
    [ -z "$user" ] && user="root (padrão)"
    printf '  %-42s %s\n' "$u" "$user"
done | sort -k2 | head -30

echo
echo "═══ total por usuário ═══"
for u in $(systemctl list-units --type=service --state=running --no-pager | \
           awk '/\.service/ {print $1}'); do
    user=$(systemctl show -p User --value "$u" 2>/dev/null)
    [ -z "$user" ] && echo "root" || echo "$user"
done | sort | uniq -c | sort -rn
```

⚠ **A linha "root (padrão)" é o achado mais comum de auditoria de Linux.** Um serviço **sem `User=`
explícito** roda como `root` — não porque precisa, mas porque ninguém configurou. **É a classe 2 do
README: privilégio desnecessário.**

⚠ **E o `systemctl show` é onde você vê isso.** `systemctl status` mostra o estado; `systemctl show
-p` mostra a **configuração efetiva** — e é a configuração que define o privilégio.

### As diretivas de `hardening` que o `systemd` suporta

```bash
echo "═══ diretivas de endurecimento por serviço ═══"
for u in ssh.service systemd-journald.service cron.service 2>/dev/null; do
    systemctl cat "$u" 2>/dev/null | \
        grep -E '^(User|Group|NoNewPrivileges|ProtectSystem|ProtectHome|PrivateTmp|PrivateDevices|ProtectKernelTunables|ProtectKernelModules|ProtectControlGroups|RestrictAddressFamilies|CapabilityBoundingSet|SystemCallFilter)' | \
        sed "s/^/  [${u}] /"
done

echo
echo "═══ usando a ferramenta oficial de análise ═══"
systemd-analyze security ssh.service 2>/dev/null | tail -20 || \
    echo "  (systemd-analyze security requer systemd 240+)"
```

⚠ **`systemd-analyze security` é o instrumento mais útil deste módulo.** Ele dá uma **nota de 0 a 10**
para o isolamento do serviço, e lista **exatamente qual diretiva falta**. É auditoria automatizada do
`systemd`.

⚠ **E as diretivas existem para isso:** `ProtectSystem=strict` deixa o `/usr` somente-leitura para o
serviço; `NoNewPrivileges=yes` impede que ele ganhe privilégio; `PrivateTmp=yes` dá `/tmp` próprio.
**Nenhuma exige mudar o programa.**

**Produza `systemd.md`:**

| Métrica | Valor |
|---|---|
| Serviços rodando | |
| Serviços rodando como `root` | |
| Sockets ativos | |
| Timers | |
| Nota do `systemd-analyze security` para `ssh` | |

**Responda:**

1. **Quantos serviços rodam como `root`?** Quantos **precisam**?
2. Quantos têm `User=` explícito?
3. O `systemd-analyze security` deu que nota? **Quais diretivas ele aponta como faltando?**
4. **Qual serviço rodando como `root` é o mais injustificável?**

⚠ **A resposta 4 é o primeiro achado real de auditoria.** Um serviço que roda como `root` **sem
precisar** é superfície de privilégio — e a correção é uma linha de `User=`.

---

## 1.3 Superfície instalada versus ativa

⚠ **A distinção que evita o inventário errado.**

| | Instalada | Ativa |
|---|---|---|
| **O que é** | Pacote presente no sistema | Serviço rodando ou porta aberta |
| **Risco** | Pode ser ativado, tem CVE | **Está exposto agora** |
| **Prioridade** | Média | **Alta** |
| **Inventário** | `dpkg -l` | `systemctl` + `ss` |

```bash
echo "═══ 1. portas escutando (superfície ATIVA) ═══"
ss -tulpn 2>/dev/null | head -20

echo
echo "═══ 2. contagem por endereço ═══"
ss -tuln 2>/dev/null | tail -n +2 | awk '{print $5}' | \
    sed 's/.*://' | sort -n | uniq -c | sort -rn | head -10

echo
echo "═══ 3. escutando em TODAS as interfaces (0.0.0.0 / ::) ═══"
ss -tuln 2>/dev/null | grep -E '0\.0\.0\.0|\*:|\[::\]' | head -15

echo
echo "═══ 4. pacotes instalados (superfície INSTALADA) ═══"
dpkg -l 2>/dev/null | grep -c '^ii' | xargs echo "  pacotes instalados:"

echo
echo "  os que costumam ser superfície desnecessária:"
for pkg in telnet ftp vsftpd rsh-server talk nis ypbind tftpd \
           xinetd inetd snmpd apache2 nginx mariadb-server postgresql \
           samba nfs-kernel-server rpcbind avahi-daemon cups; do
    dpkg -l "$pkg" 2>/dev/null | grep -q '^ii' && \
        printf '    ⚠ instalado: %s\n' "$pkg"
done
```

⚠ **A linha 3 é a mais importante do módulo.** Um serviço escutando em `127.0.0.1` é **local**; o
mesmo serviço em `0.0.0.0` está **em toda interface** — inclusive na que você não sabia que existia.

⚠ **A regra prática:** todo serviço que escuta em `0.0.0.0` **sem necessidade** é achado. Ele
deveria escutar em `127.0.0.1` ou numa interface específica.

⚠ **E a linha 4 lista o que o curso chama de "superfície desnecessária"** — classe 8. `telnet`,
`tftpd`, `rsh`, `nis` são protocolo sem criptografia, e quase nunca precisam estar instalados.

**Produza `superficie.md`:**

| Categoria | Quantidade | Exemplos |
|---|---|---|
| Porta escutando | | |
| Escutando em `0.0.0.0` | | |
| Pacotes instalados | | |
| Superfície desnecessária | | |

**Responda:**

1. **Quantas portas escutam em `0.0.0.0`?** Quais **precisam**?
2. Algum serviço de protocolo inseguro está instalado? **Qual?**
3. **Qual porta é a mais surpreendente** de estar aberta?
4. Por que "instalado mas parado" ainda conta como superfície?

---

## 1.4 O que o atacante enumera primeiro

⚠ **Entender a ordem do adversário organiza a sua prioridade.**

| # | O que ele faz | O que você tem que ter respondido |
|---|---|---|
| 1 | **`id`** — quem sou eu? | Qual usuário o serviço roda |
| 2 | **`uname -a`** — que kernel? | Se o kernel está atualizado |
| 3 | **`cat /etc/os-release`** | Versão e suporte |
| 4 | **`ss -tulpn`** — o que escuta? | Inventário de porta |
| 5 | **`ps aux`** — o que roda? | Inventário de processo |
| 6 | **`find / -perm -4000`** | **Binário `setuid`** |
| 7 | **`sudo -l`** | **Regra de `sudoers`** |
| 8 | **`crontab -l`, `/etc/cron.*`** | Job agendado |
| 9 | **`ls -la /home`, `/var/backups`** | Arquivo legível |
| 10 | **`getcap -r /`** | **Capability** |
| 11 | **`cat /proc/self/status`** | Privilégio real e efetivo |
| 12 | **`env`** | Variável herdada |
| 13 | **Histórico de shell, `.ssh/`, `.bashrc`** | Credencial |
| 14 | **Rede e DNS** | Movimento lateral |

```bash
echo "═══ simulação: o que um atacante veria nesta VM ═══"
echo "⚠ execução LOCAL, na sua VM — é assim que o auditor vê"
echo

echo "── 1. quem sou eu ──"
id
echo

echo "── 2. kernel e distro ──"
uname -r
grep PRETTY_NAME /etc/os-release 2>/dev/null
echo

echo "── 3. o que escuta ──"
ss -tuln 2>/dev/null | tail -n +2 | wc -l | xargs echo "  portas:"
echo

echo "── 4. binários setuid ──"
find / -perm -4000 -type f 2>/dev/null | head -20
echo "  total: $(find / -perm -4000 -type f 2>/dev/null | wc -l)"
echo

echo "── 5. minha regra de sudo ──"
sudo -n -l 2>/dev/null || echo "  (requer senha ou não há sudo)"
echo

echo "── 6. cron ──"
ls -la /etc/cron.d/ /etc/cron.daily/ 2>/dev/null | head -10
echo

echo "── 7. capabilities ──"
getcap -r / 2>/dev/null | head -10
echo "  total: $(getcap -r / 2>/dev/null | wc -l)"
```

⚠ **A lista é a mesma que o `lynis` produz — e é por isso que este módulo existe.** Se você entende
o que cada linha procura, o `lynis` deixa de ser caixa-preta. **Ele vira conferência.**

⚠ **E as linhas 6, 7 e 10 são onde a escalação mora.** `setuid`, `sudoers` e `capability` são as
três superfícies de privilégio — os módulos 3, 4 e 5 do curso são sobre elas.

**Produza `enumera.md`:**

| # | Verificação | Resultado | Achado? |
|---|---|---|---|
| 1 | `id` | | |
| 2 | Kernel | | |
| 3 | Portas | | |
| 4 | `setuid` | | |
| 5 | `sudo -l` | | |
| 6 | Cron | | |
| 7 | Capability | | |

**Responda:**

1. **Quantos `setuid` você achou?** Algum fora do padrão?
2. Você tem regra de `sudo`? Qual?
3. Algum `setuid` em diretório **gravável**? (É o achado crítico.)
4. **Qual das sete linhas é a mais provável de ter achado crítico?** Por quê?

⚠ **A resposta 3 é a mais importante do módulo.** Um `setuid` em diretório gravável significa que
**qualquer usuário pode substituir o binário** — e ele roda como `root`. **É escalação imediata, e
é falha de configuração, não de kernel.**

```bash
echo "═══ o teste crítico: setuid em diretório gravável ═══"
find / -perm -4000 -type f 2>/dev/null | while read -r b; do
    dir=$(dirname "$b")
    if [ -w "$dir" ] && [ "$(stat -c %A "$dir")" != "drwxr-xr-x" ]; then
        printf '  ⚠ CRÍTICO: %s\n' "$b"
        stat -c '      dir: %n  perms: %A' "$dir"
    fi
done
echo "  (fim)"
```

⚠ **Este comando é o coração do módulo 11.** Ele encontra a falha de configuração que **mais gera
escalação em servidor real** — e que **nenhum scanner de vulnerabilidade detecta**, porque não é
CVE.

---

## 1.5 LAB — O mapa da superfície

**Duração:** 120 min

### Passo 1 — Boot e `systemd` (35 min)

```bash
cd ~/lab/mod01

cat > mapa-superficie.sh <<'SCRIPT'
#!/usr/bin/env bash
# mapa-superficie.sh — inventário de superfície de um sistema Linux
# ⚠ roda LOCAL, na máquina que você audita
set -uo pipefail

SAIDA="${1:-mapa.txt}"

{
    echo "═══════════════ MAPA DE SUPERFÍCIE ═══════════════"
    echo "host  : $(hostname)"
    echo "data  : $(date -Is)"
    echo "kernel: $(uname -r)"
    echo "distro: $(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d'"' -f2)"
    echo

    echo "── 1. BOOT ──"
    echo "  cmdline : $(cat /proc/cmdline)"
    echo "  firmware: $([ -d /sys/firmware/efi ] && echo UEFI || echo BIOS)"
    echo "  lockdown: $(cat /sys/kernel/security/lockdown 2>/dev/null || echo indisponível)"
    echo

    echo "── 2. SERVIÇOS RODANDO ──"
    systemctl list-units --type=service --state=running --no-pager 2>/dev/null | \
        awk '/\.service/ {print "  " $1}'
    echo

    echo "── 3. SERVIÇOS COMO ROOT ──"
    for u in $(systemctl list-units --type=service --state=running --no-pager 2>/dev/null | \
               awk '/\.service/ {print $1}'); do
        user=$(systemctl show -p User --value "$u" 2>/dev/null)
        [ -z "$user" ] && echo "  ⚠ ${u}"
    done
    echo

    echo "── 4. SOCKETS ATIVOS ──"
    systemctl list-units --type=socket --state=active --no-pager 2>/dev/null | \
        awk '/\.socket/ {print "  " $1}'
    echo

    echo "── 5. PORTAS ESCUTANDO ──"
    ss -tulpn 2>/dev/null | tail -n +2 | sed 's/^/  /'
    echo

    echo "── 6. ESCUTANDO EM TODAS AS INTERFACES ──"
    ss -tuln 2>/dev/null | grep -E '0\.0\.0\.0|\*:|\[::\]' | sed 's/^/  ⚠ /'
    echo

    echo "── 7. SETUID / SETGID ──"
    find / -perm -4000 -type f 2>/dev/null | sed 's/^/  suid: /'
    find / -perm -2000 -type f 2>/dev/null | sed 's/^/  sgid: /'
    echo

    echo "── 8. SETUID EM DIRETÓRIO GRAVÁVEL (CRÍTICO) ──"
    find / -perm -4000 -type f 2>/dev/null | while read -r b; do
        d=$(dirname "$b")
        [ -w "$d" ] && echo "  ⚠⚠ ${b}   (dir ${d} gravável)"
    done
    echo

    echo "── 9. CAPABILITIES ──"
    getcap -r / 2>/dev/null | sed 's/^/  /'
    echo

    echo "── 10. CRON ──"
    ls -la /etc/cron.d/ /etc/cron.daily/ /etc/cron.hourly/ 2>/dev/null | sed 's/^/  /'
    for f in /etc/cron.d/*; do
        [ -f "$f" ] || continue
        printf '  [%s] %s\n' "$f" "$(stat -c '%A %U' "$f")"
    done
    echo

    echo "── 11. PACOTES DE SUPERFÍCIE DESNECESSÁRIA ──"
    for p in telnet ftp vsftpd rsh-server talk nis ypbind tftpd xinetd inetd \
             snmpd apache2 nginx samba rpcbind avahi-daemon cups; do
        dpkg -l "$p" 2>/dev/null | grep -q '^ii' && echo "  ⚠ ${p}"
    done
    echo

    echo "── 12. MONTAGEM ──"
    findmnt -rno TARGET,SOURCE,FSTYPE,OPTIONS 2>/dev/null | sed 's/^/  /' | head -20
    echo

    echo "── 13. SYSCTL RELEVANTE ──"
    for k in kernel.randomize_va_space kernel.dmesg_restrict \
             kernel.kptr_restrict kernel.core_pattern \
             net.ipv4.ip_forward fs.protected_symlinks fs.protected_hardlinks; do
        printf '  %-34s = %s\n' "$k" "$(sysctl -n "$k" 2>/dev/null)"
    done

} > "$SAIDA" 2>&1

echo "mapa salvo em: ${SAIDA}"
wc -l < "$SAIDA" | xargs echo "linhas:"
SCRIPT

chmod +x mapa-superficie.sh
./mapa-superficie.sh mapa.txt

echo
echo "═══ prévia ═══"
head -60 mapa.txt
```

Produza `analise-mapa.md`:

| Seção | Achado | Quantidade | Risco |
|---|---|---|---|
| 3 — serviços como root | | | |
| 6 — escutando em todas as interfaces | | | |
| 7 — `setuid`/`setgid` | | | |
| **8 — `setuid` gravável** | | | |
| 9 — capability | | | |
| 11 — superfície desnecessária | | | |
| 13 — `sysctl` | | | |

**Responda:**

1. **Quantos serviços rodam como `root`?** Quantos têm justificativa?
2. Alguma porta escuta em `0.0.0.0` sem precisar?
3. **A seção 8 achou algo?** Se sim, é achado crítico.
4. Qual `sysctl` está **fora** do valor recomendado?

### Passo 2 — Compare com o `lynis` (35 min)

⚠ **O `lynis` faz o mesmo que o seu script — e mais.** Rodá-lo agora mostra o que você deixou
passar.

```bash
# Instale o lynis
sudo apt install -y lynis 2>/dev/null || {
    echo "instalando do fonte..."
    cd /tmp && git clone --depth 1 https://github.com/CISOfy/lynis.git 2>/dev/null && \
    cd lynis && sudo ./lynis audit system --quick 2>/dev/null | head -50
}

echo "═══ auditando com o lynis ═══"
sudo lynis audit system --quick 2>&1 | tail -60
```

⚠ **O `lynis` dá um índice de endurecimento e lista sugestões.** Compare com o seu mapa:

| O que o `lynis` achou | Você achou? | Por quê não |
|---|---|---|
| | | |
| | | |

**Responda:**

1. **Quantos achados do `lynis` você já tinha?**
2. **Qual o `lynis` achou que você não achou?** Por quê?
3. Qual você achou que o `lynis` **não** achou?
4. **O `lynis` encontrou o `setuid` em diretório gravável?** (Dica: provavelmente não.)

⚠ **A resposta 4 é a lição.** O `lynis` verifica **configuração conhecida**; ele não cruza
`setuid` com permissão de diretório, nem entende o **seu** contexto. **É por isso que auditoria
humana ainda existe.**

### Passo 3 — Priorize (30 min)

Produza `prioridade-mod01.md`:

| # | Achado | Classe (1–8) | Evidência | Risco | Correção |
|---|---|---|---|---|---|
| | | | | | |

⚠ **Classifique cada achado pelas oito classes do README:**

| Classe | Achado |
|---|---|
| 1 — Permissão excessiva | |
| 2 — Privilégio desnecessário | |
| 3 — Credencial exposta | |
| 4 — Delegação ampla | |
| 5 — Isolamento ausente | |
| 6 — Caminho não confiável | |
| 7 — Detecção ausente | |
| 8 — Superfície desnecessária | |

**Responda:**

1. **Qual classe concentrou mais achado?**
2. Qual achado você corrigiria **primeiro**? Por quê?
3. Qual achado é **falha de configuração** e qual seria **falha de kernel**?
4. **Quantos achados você consegue corrigir com uma linha?**

⚠ **A resposta 4 é o teste de utilidade do relatório.** Se o achado exige mudar código, é caro; se
exige **uma linha de configuração**, é barato — e é o que o cliente corrige amanhã.

### Passo 4 — A tabela de verificação (20 min)

Produza `checklist.md` — o que você passará a verificar em **toda** auditoria:

```markdown
# Checklist de superfície — Linux

## Boot
- [ ] `cmdline` sem `init=`/`single`
- [ ] GRUB com senha
- [ ] Secure Boot ligado
- [ ] Lockdown configurado

## Serviço
- [ ] Lista de serviço rodando
- [ ] Cada um com `User=` explícito
- [ ] Nenhum serviço sem `NoNewPrivileges=yes`
- [ ] `systemd-analyze security` ≥ 7 em todos

## Rede
- [ ] Inventário de porta
- [ ] Cada porta com justificativa
- [ ] Nada em `0.0.0.0` sem precisar
- [ ] `socket` unit revisado

## Privilégio
- [ ] Inventário de `setuid`
- [ ] **Nenhum `setuid` em diretório gravável**
- [ ] Inventário de capability
- [ ] `sudo -l` revisado

## Configuração
- [ ] `sysctl` conferido
- [ ] Montagem conferida
- [ ] Cron revisado
- [ ] Superfície desnecessária removida
```

### Critérios de aceitação

- `mapa-superficie.sh` rodando, com `mapa.txt` de saída **real**.
- Você identificou **quantos serviços rodam como `root`**.
- Você rodou a **seção 8** (`setuid` em diretório gravável) — mesmo que vazia.
- Você rodou o `lynis` e **comparou** com o seu mapa.
- Você identificou **um achado do `lynis` que você não tinha**.
- Você identificou **um achado seu que o `lynis` não tinha**.
- `prioridade-mod01.md` com cada achado **classificado nas oito classes**.
- Você identificou **quantos achados se corrigem com uma linha**.
- `checklist.md` completo.

---

## Avaliação

1. Descreva as seis etapas do boot e o que cada uma decide.
2. Por que `init=/bin/sh` no `cmdline` anula todo o resto?
3. O que `lockdown=confidentiality` impede que `lockdown=integrity` não impede?
4. Qual a diferença entre serviço **running** e **installed**? Qual é a superfície?
5. **O que é um `socket` unit e por que ele é superfície invisível?**
6. Por que serviço sem `User=` explícito roda como `root`?
7. **O que `systemd-analyze security` faz, e o que ele aponta?**
8. Cite quatro diretivas de `hardening` do `systemd` e o que cada uma faz.
9. Qual a diferença entre superfície **ativa** e **instalada**? Por que a instalada importa?
10. Por que escutar em `0.0.0.0` é diferente de escutar em `127.0.0.1`?
11. **Por que `setuid` em diretório gravável é achado crítico?**
12. **Por que o `lynis` não encontra `setuid` em diretório gravável?** O que isso diz sobre
    auditoria automatizada?
13. Cite as oito classes de má configuração.
14. Por que "configuração é o controle de acesso" e não detalhe?

---

**Próximo:** [Módulo 2 — `/proc` e `/sys`](modulo-02.md)
