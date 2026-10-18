# Módulo 11 — Projeto: Auditoria da VM Mal Configurada

**Carga:** 3 horas
**Pré-requisitos:** módulos 1 a 10

---

## O objetivo do módulo

**Um entregável:** o relatório de auditoria completo, com achados classificados, evidência
reproduzível, e correção testada.

⚠ **E o alvo é a `linux-alvo`** — a VM com as **falhas plantadas** pelo `ansible` do curso. Você as
encontra, classifica e corrige.

⚠ **A VM tem oito falhas, uma por classe do README:**

| # | Classe | Falha plantada |
|---|---|---|
| 1 | **Permissão excessiva** | Binário `setuid` em diretório gravável |
| 2 | **Privilégio desnecessário** | Serviço rodando como `root` sem precisar |
| 3 | **Credencial exposta** | Arquivo de backup com credencial, legível |
| 4 | **Delegação ampla** | `sudo NOPASSWD` para comando que executa outro |
| 5 | **Isolamento ausente** | Contêiner com socket do Docker montado |
| 6 | **Caminho não confiável** | Cron com caminho relativo |
| 7 | **Detecção ausente** | `auditd` sem regra, `Storage=volatile` |
| 8 | **Superfície desnecessária** | Serviço instalado sem uso |

⚠ **A busca é a auditoria.** Você **não** recebe a lista — você **encontra**. E o gabarito está no
§11.6, **para conferir depois**.

---

## ⚠ Nota de conduta

| Você faz | Você **não** faz |
|---|---|
| Audita a **sua** VM | Audita host de produção |
| **Descreve** o caminho de escalação | **Executa** o caminho |
| Corrige e **testa a correção** | Aplica correção sem testar |
| Documenta com evidência | Aplica em outro ambiente |

⚠ **A VM tem as falhas de propósito.** Ela **nunca** deve ter interface exposta fora da rede
interna do laboratório. **Sem exceção.**

---

## 11.1 Preparação

```bash
mkdir -p ~/lab/projeto && cd ~/lab/projeto
```

⚠ **Se você tem a `linux-alvo`**, entre nela. **Se não**, o `ansible` do curso planta as falhas na
sua `linux-lab`:

```bash
cd ~/lab/projeto

cat > planta-falhas.yml <<'YAML'
---
# planta-falhas.yml — cria oito falhas de configuração para o exercício
# ⚠ SÓ EM VM DE LABORATÓRIO. NUNCA EM PRODUÇÃO.
- name: Planta falhas controladas
  hosts: localhost
  become: true
  tasks:

    # ── 1. PERMISSÃO EXCESSIVA: setuid em diretório gravável ──
    - name: Cria diretório gravável para o binário
      file:
        path: /opt/app-backup
        state: directory
        mode: '0777'

    - name: Cria um script que será setuid
      copy:
        dest: /opt/app-backup/sync.sh
        mode: '0755'
        content: |
          #!/bin/sh
          echo "sincronizando..."
          exit 0

    - name: Torna o script setuid
      file:
        path: /opt/app-backup/sync.sh
        owner: root
        mode: '4755'

    # ── 2. PRIVILÉGIO DESNECESSÁRIO: serviço rodando como root ──
    - name: Cria serviço sem User=
      copy:
        dest: /etc/systemd/system/report-worker.service
        mode: '0644'
        content: |
          [Unit]
          Description=Report worker
          After=network.target
          [Service]
          ExecStart=/usr/bin/sleep 3600
          Restart=always
          # ⚠ sem User= → roda como root
          [Install]
          WantedBy=multi-user.target

    - name: Habilita o serviço
      systemd:
        name: report-worker.service
        enabled: true
        state: started
        daemon_reload: true

    # ── 3. CREDENCIAL EXPOSTA: backup legível ──
    - name: Cria arquivo de backup com credencial
      copy:
        dest: /var/backups/config-2024.tar.gz
        mode: '0644'
        content: |
          BACKUP_CONF
          DB_PASSWORD=Sup3rS3cr3t0!
          API_KEY=sk-live-0000000000000000
          SMTP_PASS=senha-do-smtp

    # ── 4. DELEGAÇÃO AMPLA: sudo NOPASSWD com escape ──
    - name: Cria regra sudo ampla
      copy:
        dest: /etc/sudoers.d/90-backup-operator
        mode: '0440'
        validate: 'visudo -cf %s'
        content: |
          # operador de backup
          %backup ALL=(ALL) NOPASSWD: /usr/bin/tar, /usr/bin/find, /usr/bin/systemctl *

    # ── 6. CAMINHO NÃO CONFIÁVEL: cron com caminho relativo ──
    - name: Cria script de backup do cron
      copy:
        dest: /usr/local/bin/backup-diario.sh
        mode: '0755'
        content: |
          #!/bin/sh
          echo "backup rodando como $(id -un)"
          exit 0

    - name: Cria cron com caminho relativo
      copy:
        dest: /etc/cron.d/backup-diario
        mode: '0644'
        content: |
          SHELL=/bin/sh
          PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
          */5 * * * * root backup-diario.sh
          # ⚠ 'backup-diario.sh' sem caminho absoluto

    # ── 7. DETECÇÃO AUSENTE ──
    - name: journald sem persistência
      lineinfile:
        path: /etc/systemd/journald.conf
        regexp: '^#?Storage='
        line: 'Storage=volatile'

    # ── 8. SUPERFÍCIE DESNECESSÁRIA ──
    - name: Instala serviço sem uso
      apt:
        name: "{{ item }}"
        state: present
      loop:
        - telnet
        - ftp
      ignore_errors: true

    - name: Confirma
      debug:
        msg: "⚠ falhas plantadas: 1,2,3,4,6,7,8 (a 5 depende de contêiner)"
YAML

sudo apt install -y ansible 2>/dev/null
sudo ansible-playbook planta-falhas.yml 2>&1 | tail -20
```

⚠ **A falha 5 (contêiner com socket montado) exige Docker.** Se você tem:

```bash
command -v docker >/dev/null && sudo docker run -d --name lab-cinco \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --privileged nginx 2>/dev/null && echo "✓ falha 5 plantada"
```

---

## 11.2 Fases do projeto

### Fase 1 — A varredura automática (40 min)

⚠ **Rode todo o instrumental do curso e **guarde a saída**.**

```bash
cd ~/lab/projeto
mkdir -p evidencia

# Reutilize os scripts dos módulos anteriores
for m in 01 02 03 04 05 06 07 08 09 10; do
    src=$(ls ~/lab/mod${m}/*.sh 2>/dev/null | head -1)
    [ -n "$src" ] && cp "$src" evidencia/ 2>/dev/null
done
ls evidencia/ 2>/dev/null | head

echo "═══ 1. superfície (módulo 1) ═══"
[ -f ~/lab/mod01/mapa-superficie.sh ] && \
    sudo ~/lab/mod01/mapa-superficie.sh evidencia/mapa.txt

echo
echo "═══ 2. permissão (módulo 3) ═══"
[ -f ~/lab/mod03/audita-permissoes.sh ] && \
    sudo ~/lab/mod03/audita-permissoes.sh evidencia/permissao.txt

echo
echo "═══ 3. identidade e delegação (módulo 4) ═══"
[ -f ~/lab/mod04/audita-contas.sh ] && \
    sudo ~/lab/mod04/audita-contas.sh evidencia/contas.txt

echo
echo "═══ 4. capability (módulo 5) ═══"
[ -f ~/lab/mod05/audita-cap.sh ] && \
    sudo ~/lab/mod05/audita-cap.sh evidencia/capability.txt

echo
echo "═══ 5. arquivo e resíduo (módulo 7) ═══"
[ -f ~/lab/mod07/audita-inode.sh ] && \
    sudo ~/lab/mod07/audita-inode.sh > evidencia/inode.txt 2>&1

echo
echo "═══ 6. rede (módulo 8) ═══"
[ -f ~/lab/mod08/audita-rede.sh ] && \
    sudo ~/lab/mod08/audita-rede.sh evidencia/rede.txt

echo
echo "═══ 7. log e detecção (módulo 9) ═══"
[ -f ~/lab/mod09/audita-log.sh ] && \
    sudo ~/lab/mod09/audita-log.sh evidencia/log.txt

echo
echo "═══ 8. selo (módulo 10) ═══"
[ -f ~/lab/mod10/selo-hardening.sh ] && \
    sudo ~/lab/mod10/selo-hardening.sh evidencia/selo.txt

echo
echo "evidência coletada:"
ls -la evidencia/ | tail -12
```

### Fase 2 — A caça dirigida às oito falhas (50 min)

⚠ **Agora você caça. Sem olhar o gabarito.**

```bash
cd ~/lab/projeto

cat > caca.sh <<'SCRIPT'
#!/usr/bin/env bash
# caca.sh — busca dirigida às oito classes de falha
set -uo pipefail

echo "═══════════ CAÇA ÀS OITO CLASSES ═══════════"
echo
echo "⚠ Para cada classe, procure ATIVAMENTE. Não confie na varredura."
echo

echo "── CLASSE 1: PERMISSÃO EXCESSIVA ──"
echo "   procurando setuid em diretório gravável..."
find / -xdev -perm -4000 -type f 2>/dev/null | while read -r b; do
    d=$(dirname "$b")
    [ -w "$d" ] && printf '   ⚠⚠ %s\n        dir: %s (%s)\n' "$b" "$d" "$(stat -c %A "$d")"
done
echo "   procurando diretório 777 com binário executável..."
find / -xdev -type d -perm -0002 2>/dev/null | while read -r d; do
    find "$d" -maxdepth 1 -type f -perm -u+x 2>/dev/null | head -3 | while read -r f; do
        printf '   ⚠ %s (em %s)\n' "$f" "$d"
    done
done | head -10
echo

echo "── CLASSE 2: PRIVILÉGIO DESNECESSÁRIO ──"
echo "   serviços sem User= (rodam como root)..."
for u in $(systemctl list-units --type=service --state=running --no-pager 2>/dev/null | \
           awk '/\.service/ {print $1}'); do
    user=$(systemctl show -p User --value "$u" 2>/dev/null)
    exec_start=$(systemctl show -p ExecStart --value "$u" 2>/dev/null | head -c 80)
    if [ -z "$user" ]; then
        case "$u" in
            systemd-*|dbus*|cron*|ssh*|rsyslog*|polkit*|NetworkManager*|apparmor*|auditd*|getty*|user@*) ;;
            *) printf '   ⚠ %s\n        ExecStart: %s\n' "$u" "$exec_start" ;;
        esac
    fi
done
echo

echo "── CLASSE 3: CREDENCIAL EXPOSTA ──"
echo "   arquivos com palavra-chave de credencial e permissão larga..."
for d in /var/backups /home /root /opt /srv /etc; do
    [ -d "$d" ] || continue
    find "$d" -maxdepth 4 -type f 2>/dev/null | while read -r f; do
        p=$(stat -c %a "$f" 2>/dev/null)
        [ -n "$p" ] || continue
        case "$p" in 600|640|440|400) continue ;; esac
        if grep -qEi 'password|senha|secret|api[_-]?key|token|passwd' "$f" 2>/dev/null; then
            printf '   ⚠ %s  (%s)\n' "$f" "$p"
        fi
    done
done | head -15
echo

echo "── CLASSE 4: DELEGAÇÃO AMPLA ──"
echo "   regras de sudo com NOPASSWD..."
cat /etc/sudoers /etc/sudoers.d/* 2>/dev/null | grep -vE '^#|^$' | grep -n 'NOPASSWD' | sed 's/^/   ⚠ /'
echo "   binários com escape (GTFOBins)..."
ef=$(mktemp); cat /etc/sudoers /etc/sudoers.d/* 2>/dev/null > "$ef"
for b in tar find systemctl docker vim less awk python3 perl env nc socat bash sh; do
    grep -qE "/${b}(\s|$|\*)" "$ef" 2>/dev/null && printf '   ⚠ /%s\n' "$b"
done
rm -f "$ef"
echo "   grupos com poder implícito..."
for g in docker lxd disk sudo adm; do
    m=$(getent group "$g" 2>/dev/null | cut -d: -f4)
    [ -n "$m" ] && printf '   ⚠ %s → %s\n' "$g" "$m"
done
echo

echo "── CLASSE 5: ISOLAMENTO AUSENTE ──"
echo "   contêiner com socket ou privileged..."
if command -v docker >/dev/null; then
    for c in $(docker ps -q 2>/dev/null); do
        priv=$(docker inspect "$c" --format '{{.HostConfig.Privileged}}' 2>/dev/null)
        binds=$(docker inspect "$c" --format '{{range .HostConfig.Binds}}{{.}} {{end}}' 2>/dev/null)
        caps=$(docker inspect "$c" --format '{{.HostConfig.CapAdd}}' 2>/dev/null)
        name=$(docker inspect "$c" --format '{{.Name}}' 2>/dev/null)
        [ "$priv" = "true" ] && printf '   ⚠⚠ %s PRIVILEGED\n' "$name"
        case "$binds" in *docker.sock*) printf '   ⚠⚠ %s socket do Docker montado\n' "$name" ;; esac
        case "$caps" in *SYS_ADMIN*|*ALL*) printf '   ⚠ %s cap add: %s\n' "$name" "$caps" ;; esac
    done
else
    echo "   (docker não instalado)"
fi
echo

echo "── CLASSE 6: CAMINHO NÃO CONFIÁVEL ──"
echo "   cron com caminho relativo..."
for f in /etc/crontab /etc/cron.d/*; do
    [ -f "$f" ] || continue
    grep -vE '^#|^$|^[A-Z]|^[a-z]+=' "$f" 2>/dev/null | while read -r l; do
        c=$(printf '%s' "$l" | awk '{for(i=6;i<=NF;i++) printf "%s ", $i}')
        case "$c" in /*) ;; ?*) printf '   ⚠ %s: %s\n' "$f" "$c" ;; esac
    done
done
echo "   script de cron gravável..."
for f in /etc/crontab /etc/cron.d/*; do
    [ -f "$f" ] || continue
    grep -oE '/[a-zA-Z0-9_/.-]+\.(sh|py|pl)' "$f" 2>/dev/null | while read -r s; do
        [ -e "$s" ] || continue
        [ -w "$s" ] && printf '   ⚠⚠ %s GRAVÁVEL\n' "$s"
    done
done
echo "   ld.so.preload..."
[ -s /etc/ld.so.preload ] && cat /etc/ld.so.preload | sed 's/^/   ⚠ /'
echo

echo "── CLASSE 7: DETECÇÃO AUSENTE ──"
printf '   auditd        : %s\n' "$(systemctl is-active auditd 2>/dev/null || echo ⚠inativo)"
printf '   regras auditd : %s\n' "$(auditctl -l 2>/dev/null | wc -l)"
grep -E '^Storage=' /etc/systemd/journald.conf 2>/dev/null | sed 's/^/   ⚠ /'
grep -qE '^\s*\*\.\*\s+@' /etc/rsyslog.conf /etc/rsyslog.d/*.conf 2>/dev/null && \
    echo "   ✓ log remoto" || echo "   ⚠ sem log remoto"
echo

echo "── CLASSE 8: SUPERFÍCIE DESNECESSÁRIA ──"
for p in telnet ftp vsftpd rsh-server tftpd xinetd snmpd apache2 nginx \
         samba rpcbind avahi-daemon cups; do
    dpkg -l "$p" 2>/dev/null | grep -q '^ii' && printf '   ⚠ instalado: %s\n' "$p"
done
echo
SCRIPT

chmod +x caca.sh
sudo ./caca.sh 2>&1 | tee evidencia/caca.txt
```

### Fase 3 — Análise e classificação (40 min)

⚠ **Agora você escreve o achado. Formato obrigatório:**

```markdown
## Achado N — [título curto]

**Classe**: [1–8]
**Classificação**: vulnerabilidade | má configuração | postura

**Evidência**
```
[o comando]

[a saída literal]
```

**Por que importa**
[o mecanismo, em 2–3 frases. Não "é ruim" — POR QUÊ]

**Caminho de exploração** (descrição, sem executar)
[1. ...
 2. ...
 3. ...]

**Correção**
```
[os comandos]
```

**Verificação da correção**
```
[o comando que prova que corrigiu]
```

**Risco de quebrar**: baixo | médio | alto
**Reversão**: [o comando]
```

⚠ **A seção "caminho de exploração" é **descrição**, não execução.** Cada passo escrito, e nenhum
executado. **É a linha do projeto.**

⚠ **E a seção "verificação da correção" é obrigatória.** Achado sem prova de correção é **meia
auditoria**.

### Fase 4 — Correção e verificação (30 min)

⚠ **Para cada achado das classes 1 a 4 e 6 a 8, aplique e verifique.**

```bash
cd ~/lab/projeto

cat > corrige.sh <<'SCRIPT'
#!/usr/bin/env bash
# corrige.sh — aplica as correções do exercício
# ⚠ SÓ NA VM. Cada correção é seguida de verificação.
set -uo pipefail

confirma() { printf '\n%s [s/N] ' "$1"; read -r r; [ "$r" = "s" ]; }

echo "═══════════ CORREÇÕES ═══════════"

# ── CLASSE 1 ──
if confirma "Corrigir setuid em /opt/app-backup?"; then
    sudo chmod u-s /opt/app-backup/sync.sh 2>/dev/null
    sudo chmod 755 /opt/app-backup 2>/dev/null
    sudo chown root:root /opt/app-backup 2>/dev/null
    echo "── VERIFICAÇÃO ──"
    stat -c '  %A %U:%G %n' /opt/app-backup /opt/app-backup/sync.sh
    find / -xdev -perm -4000 -type f 2>/dev/null | while read -r b; do
        [ -w "$(dirname "$b")" ] && echo "  ⚠ AINDA: $b"
    done
    echo "  (fim — vazio = corrigido)"
fi

# ── CLASSE 2 ──
if confirma "Corrigir report-worker.service (rodar como não-root)?"; then
    sudo systemctl edit --force --full report-worker.service <<'UNIT'
[Unit]
Description=Report worker
After=network.target
[Service]
User=nobody
Group=nogroup
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ExecStart=/usr/bin/sleep 3600
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
    sudo systemctl daemon-reload
    sudo systemctl restart report-worker.service 2>/dev/null
    sleep 1
    echo "── VERIFICAÇÃO ──"
    printf '  status : %s\n' "$(systemctl is-active report-worker.service 2>/dev/null)"
    printf '  User   : %s\n' "$(systemctl show -p User --value report-worker.service 2>/dev/null)"
    printf '  NoNewPrivileges: %s\n' "$(systemctl show -p NoNewPrivileges --value report-worker.service 2>/dev/null)"
    # confirma o uid REAL do processo
    pid=$(systemctl show -p MainPID --value report-worker.service 2>/dev/null)
    [ -n "$pid" ] && [ "$pid" != "0" ] && \
        printf '  uid real do processo: %s\n' "$(awk '/^Uid:/ {print $2}' /proc/${pid}/status 2>/dev/null)"
fi

# ── CLASSE 3 ──
if confirma "Corrigir permissão de /var/backups/config-2024.tar.gz?"; then
    sudo chmod 600 /var/backups/config-2024.tar.gz 2>/dev/null
    echo "── VERIFICAÇÃO ──"
    stat -c '  %A %a %U:%G %n' /var/backups/config-2024.tar.gz
fi

# ── CLASSE 4 ──
if confirma "Corrigir /etc/sudoers.d/90-backup-operator?"; then
    echo "  ⚠ MANTENHA UMA SESSÃO DE ROOT ABERTA"
    sudo cp /etc/sudoers.d/90-backup-operator /tmp/sudoers-backup 2>/dev/null
    sudo tee /etc/sudoers.d/90-backup-operator > /dev/null <<'CONF'
# operador de backup — corrigido
# ⚠ comando específico, SEM wildcard, e sem binário que executa outro
%backup ALL=(root) /usr/local/bin/backup-wrapper
CONF
    sudo chmod 440 /etc/sudoers.d/90-backup-operator
    if sudo visudo -c >/dev/null 2>&1; then
        echo "  ✓ sintaxe válida"
    else
        echo "  ⚠ SINTAXE INVÁLIDA — revertendo"
        sudo cp /tmp/sudoers-backup /etc/sudoers.d/90-backup-operator
    fi
    echo "── VERIFICAÇÃO ──"
    cat /etc/sudoers.d/90-backup-operator | sed 's/^/  /'
fi

# ── CLASSE 6 ──
if confirma "Corrigir cron com caminho relativo?"; then
    sudo tee /etc/cron.d/backup-diario > /dev/null <<'CONF'
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
# ⚠ caminho ABSOLUTO
*/5 * * * * root /usr/local/bin/backup-diario.sh
CONF
    echo "── VERIFICAÇÃO ──"
    grep -vE '^#|^$|^[A-Z]' /etc/cron.d/backup-diario | sed 's/^/  /'
fi

# ── CLASSE 7 ──
if confirma "Corrigir detecção (journald persistente + regras)?"; then
    sudo sed -i 's/^#\?Storage=.*/Storage=persistent/' /etc/systemd/journald.conf
    sudo systemctl restart systemd-journald 2>/dev/null
    echo "── VERIFICAÇÃO ──"
    grep '^Storage=' /etc/systemd/journald.conf | sed 's/^/  /'
    echo "  ⚠ reinicie para confirmar persistência"
fi

# ── CLASSE 8 ──
if confirma "Remover pacotes de superfície desnecessária?"; then
    for p in telnet ftp; do
        sudo apt remove --purge -y "$p" 2>/dev/null | tail -1
    done
    echo "── VERIFICAÇÃO ──"
    for p in telnet ftp; do
        dpkg -l "$p" 2>/dev/null | grep -q '^ii' && echo "  ⚠ ainda instalado: $p" || echo "  ✓ removido: $p"
    done
fi

echo
echo "═══════════ RE-VERIFICAÇÃO ═══════════"
sudo ./caca.sh 2>&1 | tail -40
SCRIPT

chmod +x corrige.sh
sudo ./corrige.sh
```

⚠ **Note os três cuidados no script:**
1. **`visudo -c` depois de editar `sudoers`** — sintaxe inválida **tranca todo o `sudo`**
2. **Reversão se a validação falhar** — backup e restauração automática
3. **`--force --full` no `systemctl edit`** — para o serviço de teste

⚠ **E note que cada correção tem `VERIFICAÇÃO` logo abaixo.** **Aplicar sem verificar é o erro que
o módulo 10 corrigiu.**

### Fase 5 — O relatório (20 min)

**Produza `relatorio-auditoria.md`:**

```markdown
# Relatório de Auditoria — VM de Laboratório

## 1. Escopo e autorização
| Item | Valor |
|---|---|
| Alvo | [hostname da VM] |
| Base da autorização | Ativo próprio — máquina de laboratório |
| Data | |
| Analista | |

## 2. Método
- Instrumental do curso, módulos 1–10
- Varredura automática + caça dirigida por classe
- **Nenhuma exploração executada** — apenas descrição de caminho

## 3. Resumo executivo
| Classe | Achados | Críticos | Corrigidos |
|---|---|---|---|
| 1 — Permissão excessiva | | | |
| 2 — Privilégio desnecessário | | | |
| 3 — Credencial exposta | | | |
| 4 — Delegação ampla | | | |
| 5 — Isolamento ausente | | | |
| 6 — Caminho não confiável | | | |
| 7 — Detecção ausente | | | |
| 8 — Superfície desnecessária | | | |
| **Total** | | | |

## 4. Achados detalhados
[os oito achados no formato do §11.3]

## 5. O que verifiquei e está correto
| Item | Valor | Referência |
|---|---|---|

## 6. O que NÃO foi verificado
⚠ Mínimo 3

## 7. Declaração de conduta
| Ação | Feita? |
|---|---|
| Descrevi caminho de escalação | sim |
| **Executei caminho de escalação** | **não** |
| Auditei outro host | não |
| Apliquei correção sem testar | não |
| Reverti o que quebrou | (conforme) |

## 8. Próximos passos
| # | Ação | Prioridade |
|---|---|---|
```

---

## 11.3 A rubrica

| # | Item | Peso |
|---|---|---|
| 1 | **Os oito achados encontrados** | 30% |
| 2 | Classificação correta (vulnerabilidade vs. má config vs. postura) | 10% |
| 3 | Evidência com **comando e saída literal** | 15% |
| 4 | **Caminho de exploração descrito, não executado** | 10% |
| 5 | Correção com **comando** | 10% |
| 6 | **Verificação da correção** | 10% |
| 7 | Reversão documentada | 5% |
| 8 | Seção 6 — o que não foi verificado | 5% |
| 9 | Declaração de conduta | 5% |

**Penalidades automáticas:**

- Achado sem evidência: −10% cada.
- **Caminho de escalação executado**: **projeto zerado**.
- Correção sem verificação: −10% cada.
- `sudoers` editado sem `visudo -c`: −15%.
- Achado classificado como "vulnerabilidade" quando é postura: −5% cada.
- Ausência da seção "não verificado": −10%.

---

## 11.4 Roteiro

| Bloco | Duração | O que fazer |
|---|---|---|
| 1 | 40 min | Varredura automática + evidência salva |
| 2 | 50 min | Caça dirigida às oito classes |
| 3 | 40 min | Análise e classificação por achado |
| 4 | 30 min | Correção + verificação |
| 5 | 20 min | Relatório |

---

## 11.5 Critérios de aceitação

- Planta de falhas executada (ou a `linux-alvo` disponível).
- **Varredura automática** com saída em `evidencia/`.
- `caca.sh` rodado, com `caca.txt` mostrando a busca por **oito classes**.
- **Os oito achados encontrados**, cada um com:
  - classe e classificação
  - **evidência com comando e saída literal**
  - **caminho de exploração descrito** (não executado)
  - correção em comando
  - **verificação da correção**
  - risco de quebrar e reversão
- **Nenhum caminho de escalação executado** — confirmado.
- Correção aplicada em **pelo menos seis** dos oito, com verificação.
- `sudoers` editado **somente** com `visudo -c` e backup.
- `relatorio-auditoria.md` com as **oito** seções.
- Seção 6 com **três itens** mínimos.
- Declaração de conduta preenchida.

---

## 11.6 Gabarito — só depois de procurar

⚠ **Não leia antes de fazer a Fase 2.** O valor do exercício está em encontrar.

| # | Classe | Onde | O achado |
|---|---|---|---|
| **1** | Permissão excessiva | `/opt/app-backup/sync.sh` | `setuid` com diretório `0777` — **qualquer usuário substitui o binário e ele roda como `root`** |
| **2** | Privilégio desnecessário | `report-worker.service` | Sem `User=` → roda como `root`, sem nenhuma diretiva de isolamento. `ExecStart=/usr/bin/sleep` **não precisa de `root`** |
| **3** | Credencial exposta | `/var/backups/config-2024.tar.gz` | `0644` com `DB_PASSWORD`, `API_KEY`, `SMTP_PASS` em texto |
| **4** | Delegação ampla | `/etc/sudoers.d/90-backup-operator` | `NOPASSWD: /usr/bin/tar, /usr/bin/find, /usr/bin/systemctl *` — **os três escapam para shell**: `tar --checkpoint-action=exec`, `find -exec`, e o wildcard do `systemctl` permite `link` de unit arbitrário |
| **5** | Isolamento ausente | contêiner `lab-cinco` | Socket do Docker montado + `--privileged` — **é o host** |
| **6** | Caminho não confiável | `/etc/cron.d/backup-diario` | `backup-diario.sh` **sem caminho absoluto** — o cron resolve pelo `PATH` |
| **7** | Detecção ausente | `/etc/systemd/journald.conf` | `Storage=volatile` — **todo log some no reboot**. E `auditd` inativo |
| **8** | Superfície desnecessária | pacotes `telnet`, `ftp` | Protocolo sem criptografia, sem uso, instalado |

⚠ **A classe 4 é a mais interessante.** As três entradas do `sudo` **parecem** restritas — e
**nenhuma** é. `tar`, `find` e `systemctl` com wildcard **executam comando arbitrário**:

| Comando | Como escapa |
|---|---|
| `sudo tar cf /dev/null x --checkpoint=1 --checkpoint-action=exec=sh` | Executa `sh` como `root` |
| `sudo find / -exec sh \;` | Executa `sh` como `root` |
| `sudo systemctl link /tmp/evil.service` | Registra unit arbitrário → `start` → `root` |

⚠ **A correção correta da classe 4 é a mais difícil do projeto.** Remover as três entradas
**quebra o operador de backup** — e ele precisa de algo. **A resposta é um wrapper**:
`/usr/local/bin/backup-wrapper`, que recebe argumento validado e chama só o que é permitido.
**É a diferença entre "remover a funcionalidade" e "corrigir o privilégio".**

---

## Avaliação final

1. Cite as oito classes de má configuração, com um achado de cada.
2. **Por que `setuid` em diretório gravável é crítico?** O mecanismo.
3. **Por que `tar`, `find` e `systemctl` com `sudo` escapam para shell?** Dê o comando de cada.
4. **Por que o wildcard em `sudoers` não restringe nada?**
5. Qual a correção da classe 4 que **mantém a funcionalidade**?
6. Por que serviço sem `User=` rodando como `root` é achado, e não detalhe?
7. **Por que `Storage=volatile` é achado grave?**
8. Por que cron com caminho relativo vira escalação?
9. **Por que `visudo -c` depois de editar é obrigatório?** O que acontece sem ele?
10. Por que a correção do módulo 10 exige **verificação**?
11. **O que separa "descrever o caminho" de "executar o caminho"?** Por que essa linha é o
    projeto?
12. Por que a seção "o que não foi verificado" é obrigatória?

---

## Encerramento do curso

Você começou em `chmod 755` e terminou auditando uma VM com oito falhas plantadas, classificando
cada uma, descrevendo o caminho de exploração **sem executar**, corrigindo, e **verificando a
correção**.

O que você aprendeu não foi uma lista de comando. Foi que **o controle de acesso do Linux está em
quinze lugares** — e que **o caminho de escalação está sempre na interseção de dois deles**.

| # | O que fica |
|---|---|
| 1 | **Não é "quais vulnerabilidades" — é "qual é a superfície".** |
| 2 | **`/proc` é a fonte de verdade.** Processo, socket, namespace, credencial — tudo está lá. |
| 3 | **Capability é invisível no `ls`** — e `cap_sys_admin` é `root` na prática. |
| 4 | **Contêiner não é fronteira de segurança.** `privileged`, socket montado e `SYS_ADMIN` **são o host**. |
| 5 | **Log local não sobrevive a atacante com `root`.** Só o remoto é evidência. |
| 6 | **`hardening` sem verificação é intenção.** O selo é o que vale. |

⚠ **E a ponte para os outros cursos.** Este é o que faltava para **exploit development**,
**malware** e **APT/C2**. O `/proc`, a memória, o `setuid`, a capability e o namespace são a base
dos três. **Sem este, você trava no mesmo lugar nas três.**

Referências para continuar: **`man 5 proc`**, **`man 7 capabilities`**, **`man 7 namespaces`**,
**`man 5 sudoers`** · **Linux Kernel Documentation** · **CIS Benchmarks** · **Lynis** ·
**"The Linux Programming Interface"** (Kerrisk) · **OST2 `Arch1001`** · **`GTFOBins`** (consulta
defensiva) · **Bellingcat** (metodologia de investigação)
