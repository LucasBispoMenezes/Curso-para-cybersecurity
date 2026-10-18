# Módulo 10 — `hardening` com Selo

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** módulos 1 a 9

---

## Objetivos

1. Aplicar `hardening` com **verificação** — não com confiança na flag.
2. Priorizar as mudanças por **risco × custo**.
3. Ler `sysctl` e saber qual valor é o seguro para cada um.
4. Aplicar LSM (`AppArmor`/`SELinux`) e entender o que ele cobre.
5. Produzir o relatório de endurecimento com o **selo** de cada item.

---

## ⚠ Antes de começar

⚠ **A pergunta que organiza o módulo:**

> **Você aplicou `kernel.randomize_va_space=2`. Como você sabe que está em vigor?**

⚠ **Se a resposta for "eu rodei o `sysctl`", você tem a intenção — não a garantia.** A flag pode
ter sido sobrescrita por outro arquivo, revertida no reboot, ou o serviço não recarregado. **O
`hardening` só conta quando é verificado.**

⚠ **A tese do módulo:**

> **`hardening` não é aplicar. É aplicar, verificar, e registrar o selo.** Sem a verificação, você
> tem uma lista de intenções — e uma lista de intenções não protege contra nada.

⚠ **E o outro lado, igualmente importante:** **`hardening` agressivo quebra o sistema.** Um
`sysctl` a mais desabilita rede; um `LSM` mal configurado impede o serviço de subir; um mount
`noexec` a mais quebra o instalador. **O curso recomenda o mínimo eficaz, testado.**

---

## 10.1 O princípio — mínimo eficaz, com selo

⚠ **A ordem importa. `hardening` é incremental e verificável.**

```
┌──────────────────────────────────────────────────────────────┐
│ 1. INVENTÁRIO                                                │
│    o que existe? (módulos 1–8)                               │
├──────────────────────────────────────────────────────────────┤
│ 2. REDUÇÃO                                                   │
│    o que pode sair?  ← ⚠ o hardening mais eficaz e mais barato│
├──────────────────────────────────────────────────────────────┤
│ 3. CONFIGURAÇÃO                                              │
│    o que ficar, com o mínimo de privilégio                   │
├──────────────────────────────────────────────────────────────┤
│ 4. ISOLAMENTO                                                │
│    seccomp, capability, LSM, namespace                       │
├──────────────────────────────────────────────────────────────┤
│ 5. DETECÇÃO                                                  │
│    auditd, log remoto                                        │
├──────────────────────────────────────────────────────────────┤
│ 6. VERIFICAÇÃO  ← ⚠ o selo                                   │
│    cada item, com comando e resultado                        │
└──────────────────────────────────────────────────────────────┘
```

⚠ **A etapa 2 é a mais eficaz e a mais barata.** Remover um serviço que não é necessário é
**melhor** que endurecê-lo — **a superfície deixa de existir.** Nenhum firewall, nenhum `seccomp`,
nenhum log substitui **não ter o serviço**.

⚠ **E a etapa 6 é a que o módulo inteiro existe para fixar.** Sem ela, você tem a etapa 3 sem saber
se ela pegou.

### A tabela de prioridade

| Prioridade | Ação | Custo | Risco de quebrar |
|---|---|---|---|
| **1** | Remover serviço desnecessário | Baixo | Baixo |
| **2** | Corrigir permissão (`.env`, `setuid`) | **Muito baixo** | Baixo |
| **3** | Corrigir `sudoers` | Baixo | ⚠ Médio — testar |
| **4** | Habilitar `sysctl` de rede e memória | **Muito baixo** | Baixo |
| **5** | Ativar `auditd` | Baixo | Baixo |
| **6** | Configurar log remoto | Médio | Baixo |
| **7** | Diretivas de `systemd` por serviço | **Médio** | ⚠ **Alto** — testar |
| **8** | LSM (AppArmor/SELinux) | Médio | ⚠ **Alto** |
| **9** | `mount` com `nosuid,noexec,nodev` | Médio | ⚠ Alto |
| **10** | `seccomp` customizado | Alto | ⚠ Alto |

⚠ **A ordem é por risco × custo.** As cinco primeiras linhas **resolvem a maior parte** e **quase
não quebram nada**. As cinco últimas são para depois — e exigem janela de manutenção.

⚠ **E é por isso que "aplicar CIS Benchmark inteiro" é má prática.** Ele traz **todos** os itens,
incluindo os de alto risco de quebra — e sem ordem. **O curso aplica por prioridade.**

**Produza `principio.md`:**

| Etapa | O que você fará | Encontrado no seu sistema |
|---|---|---|
| 1 — Inventário | | |
| 2 — Redução | | |
| 3 — Configuração | | |
| 4 — Isolamento | | |
| 5 — Detecção | | |
| 6 — Verificação | | |

**Responda:**

1. **Qual etapa é a mais eficaz e a mais barata?** Por quê?
2. Por que "aplicar o CIS inteiro" é má prática?
3. Qual das dez ações **quase não quebra nada**?
4. **Por que a verificação é uma etapa separada?**

---

## 10.2 `sysctl` — os parâmetros que importam

⚠ **Existem centenas de `sysctl`. Estes são os que mudam risco, com o valor seguro.**

### Memória e exploração

| Parâmetro | Valor seguro | O que faz |
|---|---|---|
| `kernel.randomize_va_space` | **`2`** | ASLR completo. `0` desliga. |
| `kernel.dmesg_restrict` | **`1`** | Só `root` lê `dmesg` — evita vazar endereço de kernel |
| `kernel.kptr_restrict` | **`2`** | Esconde ponteiro de kernel em `/proc` |
| `kernel.yama.ptrace_scope` | **`1`** | Só depura descendente (módulo 2) |
| `kernel.core_pattern` | **`/var/crash/core.%e.%p`** | ⚠ **Nunca pipe, nunca gravável** |
| `kernel.suid_dumpable` | **`0`** | Não gera core dump de processo `setuid` |
| `kernel.perf_event_paranoid` | **`3`** | Bloqueia `perf` para não-`root` |
| `kernel.unprivileged_userns_clone` | **`0`** ou **`1`** | ⚠ Trade-off: `0` reduz superfície, quebra rootless |

⚠ **A linha do `core_pattern` é crítica.** Se aponta para **pipe** (`|programa`) ou para diretório
**gravável**, é escalação (módulo 2). **E o padrão de muitas distribuições é `|/usr/share/apport/...`**
— que é pipe. **Com `apport` instalado e o script gravável, é achado.**

### Rede

| Parâmetro | Valor seguro | O que faz |
|---|---|---|
| `net.ipv4.ip_forward` | **`0`** | Não roteia (⚠ `1` se for contêiner/NAT) |
| `net.ipv4.conf.all.accept_redirects` | **`0`** | Não aceita ICMP redirect |
| `net.ipv4.conf.all.accept_source_route` | **`0`** | Não aceita source routing |
| `net.ipv4.conf.all.rp_filter` | **`1`** | Reverse path filter (anti-spoofing) |
| `net.ipv4.tcp_syncookies` | **`1`** | Anti-SYN flood |
| `net.ipv4.conf.all.log_martians` | **`1`** | Registra pacote com endereço impossível |
| `net.ipv4.icmp_echo_ignore_broadcasts` | **`1`** | Não responde broadcast |
| `net.ipv6.conf.all.accept_ra` | **`0`** | Não aceita router advertisement |
| `net.ipv4.conf.all.send_redirects` | **`0`** | Não envia redirect |

### Sistema de arquivos

| Parâmetro | Valor seguro | O que faz |
|---|---|---|
| `fs.protected_symlinks` | **`1`** | Impede symlink em `/tmp` (módulo 7) |
| `fs.protected_hardlinks` | **`1`** | Impede hardlink para arquivo alheio |
| `fs.protected_fifos` | **`2`** | Protege FIFO em diretório sticky |
| `fs.protected_regular` | **`2`** | Protege arquivo regular em diretório sticky |
| `fs.suid_dumpable` | **`0`** | (repetido — vale a ênfase) |

```bash
mkdir -p ~/lab/mod10 && cd ~/lab/mod10

echo "═══ 1. o estado atual de todos os parâmetros ═══"
cat > estado-sysctl.sh <<'SCRIPT'
#!/usr/bin/env bash
# estado-sysctl.sh — compara o estado atual com os valores seguros
set -uo pipefail

declare -A ESPERADO=(
    [kernel.randomize_va_space]="2"
    [kernel.dmesg_restrict]="1"
    [kernel.kptr_restrict]="2"
    [kernel.yama.ptrace_scope]="1"
    [kernel.suid_dumpable]="0"
    [kernel.perf_event_paranoid]="3"
    [net.ipv4.ip_forward]="0"
    [net.ipv4.conf.all.accept_redirects]="0"
    [net.ipv4.conf.all.accept_source_route]="0"
    [net.ipv4.conf.all.rp_filter]="1"
    [net.ipv4.tcp_syncookies]="1"
    [net.ipv4.conf.all.log_martians]="1"
    [net.ipv4.icmp_echo_ignore_broadcasts]="1"
    [net.ipv4.conf.all.send_redirects]="0"
    [net.ipv6.conf.all.accept_ra]="0"
    [fs.protected_symlinks]="1"
    [fs.protected_hardlinks]="1"
    [fs.protected_fifos]="2"
    [fs.protected_regular]="2"
)

printf '%-46s %-10s %-10s %s\n' "PARÂMETRO" "ATUAL" "ESPERADO" "STATUS"
printf '%-46s %-10s %-10s %s\n' "─────────" "─────" "────────" "──────"

ok=0; ruim=0; ausente=0
for k in "${!ESPERADO[@]}"; do
    v=$(sysctl -n "$k" 2>/dev/null)
    e="${ESPERADO[$k]}"
    if [ -z "$v" ]; then
        printf '%-46s %-10s %-10s %s\n' "$k" "—" "$e" "·  inexistente"
        ausente=$((ausente+1))
    elif [ "$v" = "$e" ]; then
        printf '%-46s %-10s %-10s %s\n' "$k" "$v" "$e" "✓  ok"
        ok=$((ok+1))
    else
        printf '%-46s %-10s %-10s %s\n' "$k" "$v" "$e" "⚠  DIFERENTE"
        ruim=$((ruim+1))
    fi
done | sort

echo
echo "  ✓ ok: ${ok}   ⚠ diferentes: ${ruim}   ·  inexistentes: ${ausente}"
echo
echo "── core_pattern (tratamento especial) ──"
cp=$(sysctl -n kernel.core_pattern)
echo "  valor: ${cp}"
case "$cp" in
    \|*) echo "  ⚠⚠ PIPE — executa programa. Verifique se o programa é gravável." ;;
    /*)  d=$(dirname "$cp"); [ -w "$d" ] && echo "  ⚠⚠ diretório GRAVÁVEL: $d" || echo "  ✓ diretório não gravável" ;;
    *)   echo "  ⚠ caminho relativo — depende do cwd" ;;
esac
SCRIPT
chmod +x estado-sysctl.sh
./estado-sysctl.sh | tee sysctl-estado.txt
```

⚠ **A coluna "STATUS" é o entregável.** Ela é **o selo** — cada parâmetro **medido**, não suposto.
E o rodapé dá o **placar**: quantos ok, quantos fora, quantos inexistentes.

⚠ **E os "inexistentes" merecem nota.** Um parâmetro que **não existe no seu kernel** é normal
(versão antiga, módulo não carregado) — mas **você precisa saber disso** para não reportar um
`sysctl` que não faz nada como "aplicado".

**Produza `sysctl.md`:**

| Parâmetro | Atual | Esperado | Status |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantos parâmetros estão no valor seguro?** Quantos fora?
2. **Algum está inexistente?** Qual, e por quê?
3. **O `core_pattern` é pipe ou caminho?** É achado?
4. **Qual parâmetro fora do valor é o mais grave?** Por quê?

---

## 10.3 Aplicar com persistência e verificar

⚠ **Aplicar `sysctl -w` **não persiste**. E o arquivo pode ser sobrescrito por outro de ordem
posterior.

```bash
echo "═══ 1. a ordem que decide o valor final ═══"
cat <<'EXPL'
  O systemd-sysctl carrega em ORDEM ALFABÉTICA:

    /etc/sysctl.conf              ← ⚠ carregado também, ordem variável
    /etc/sysctl.d/10-*.conf
    /etc/sysctl.d/50-*.conf
    /etc/sysctl.d/99-*.conf       ← ⚠ o ÚLTIMO ganha
    /run/sysctl.d/                ← ⚠ mas /run tem precedência em alguns casos
    /usr/lib/sysctl.d/            ← distribuição

  ⚠ se DOIS arquivos definem o mesmo parâmetro, o ÚLTIMO a carregar ganha.
  ⚠ e o valor em vigor pode NÃO ser o que você escreveu.

  → por isso: USE O NÚMERO ALTO (99-) e VERIFIQUE depois.
EXPL

echo
echo "═══ 2. onde o valor ATUAL está definido ═══"
for k in kernel.randomize_va_space kernel.dmesg_restrict net.ipv4.ip_forward; do
    echo "  ── ${k} ──"
    grep -rn "^[[:space:]]*${k//./\\.}" /etc/sysctl.conf /etc/sysctl.d/ \
         /usr/lib/sysctl.d/ /run/sysctl.d/ 2>/dev/null | sed 's/^/    /' || \
        echo "    (não definido em arquivo — é padrão do kernel)"
done

echo
echo "═══ 3. o arquivo do curso — prioridade máxima ═══"
cat > 99-hardening.conf <<'CONF'
######################################################################
# hardening — Linux para Segurança
# Número 99 para carregar por ÚLTIMO (a ordem alfabética decide).
# ⚠ cada linha aqui foi TESTADA. Linha não testada é linha que quebra.
######################################################################

# ── MEMÓRIA E EXPLORAÇÃO ──
kernel.randomize_va_space = 2
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.yama.ptrace_scope = 1
kernel.suid_dumpable = 0
kernel.perf_event_paranoid = 3
kernel.core_pattern = /var/crash/core.%e.%p.%t

# ── REDE ──
net.ipv4.ip_forward = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_source_route = 0

# ── SISTEMA DE ARQUIVOS ──
fs.protected_symlinks = 1
fs.protected_hardlinks = 1
fs.protected_fifos = 2
fs.protected_regular = 2
CONF

echo "  ✓ 99-hardening.conf criado ($(grep -c '=' 99-hardening.conf) parâmetros)"
echo
echo "  ⚠ IP_FORWARD: se esta máquina roda contêiner com NAT, NÃO aplique ip_forward=0"
echo "     verifique: docker/podman ativo? então ajuste."
```

⚠ **O aviso do `ip_forward` é real.** Se a máquina roda Docker com rede bridge, `ip_forward=0`
**quebra a rede dos contêineres**. **É o exemplo perfeito de `hardening` que quebra** — e é o item
que o CIS traz sem contexto.

```bash
echo "═══ 4. aplicando e VERIFICANDO o selo ═══"
echo

sudo cp 99-hardening.conf /etc/sysctl.d/99-hardening.conf
sudo mkdir -p /var/crash
sudo chmod 700 /var/crash

echo "  recarregando:"
sudo sysctl --system 2>&1 | grep -E 'hardening|Applying' | head -5 | sed 's/^/    /'

echo
echo "  ═══ O SELO: verificação item por item ═══"
./estado-sysctl.sh | tail -28

echo
echo "  ═══ persistência: sobrevive ao próximo boot? ═══"
echo "  ⚠ teste real: reinicie a VM e rode o estado-sysctl.sh de novo"
echo "     é a ÚNICA verificação de persistência que vale"
```

⚠ **A verificação de persistência exige **reboot**. Não há atalho.** Um `sysctl` que volta no boot
é `hardening` que não existe — e você só descobre **testando**.

⚠ **E o selo tem que ser registrado.** Cada item com: **o valor medido, o esperado, e o status**.
É isso que vai para o relatório, e é isso que o cliente pode conferir.

**Produza `aplicado.md`:**

| Parâmetro | Aplicado? | Medido após | Persistente? (após reboot) |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantos parâmetros mudaram** de valor depois de aplicar?
2. Algum **não mudou**? **Por que?** (Alguém sobrescreve, ou o módulo não está carregado.)
3. Você **reiniciou a VM** para testar persistência?
4. **Qual parâmetro pode quebrar contêiner?** Você verificou se aplica?

---

## 10.4 LSM — o controle que ninguém configura

⚠ **`LSM` (`Linux Security Module`) é **controle de acesso obrigatório**.** Ele restringe **mesmo
para `root`** — e é a única camada que faz isso.

| LSM | Modelo | Distribuição | Estado comum |
|---|---|---|---|
| **`AppArmor`** | Perfil por caminho | Debian, Ubuntu, SUSE | Instalado, **poucos perfis em enforce** |
| **`SELinux`** | Rótulo e tipo | RHEL, Fedora, CentOS | Instalado, **às vezes permissivo** |
| `Yama` | Restrição de `ptrace` | Todas | Ativo (é o do `ptrace_scope`) |
| `Smack` | Rótulo | Embarcado | — |
| `TOMOYO` | Caminho | — | — |
| `Landlock` | Restrição por processo | Moderno | Emergente |
| `Lockdown` | Integridade do kernel | UEFI | Frequentemente `nono` |

⚠ **A linha de `AppArmor`/`SELinux` é o achado mais comum do módulo.** O LSM **está instalado** e
**não está em modo de bloqueio** — porque alguém o colocou em `complain` para resolver um problema,
**e nunca voltou**.

```bash
echo "═══ 1. quais LSM estão ativos ═══"
cat /sys/kernel/security/lsm 2>/dev/null | tr ',' '\n' | sed 's/^/  /'
echo
echo "  ⚠ se a lista NÃO tem selinux nem apparmor, nenhum MAC está ativo"

echo
echo "═══ 2. AppArmor ═══"
if command -v aa-status >/dev/null; then
    sudo aa-status --enabled 2>/dev/null && echo "  ✓ AppArmor habilitado" || echo "  ⚠ AppArmor NÃO habilitado"
    echo
    sudo aa-status 2>/dev/null | head -12 | sed 's/^/  /'
    echo
    echo "  perfis em COMPLAIN (só avisam, não bloqueiam):"
    sudo aa-status 2>/dev/null | sed -n '/complain/,/^$/p' | head -10 | sed 's/^/    ⚠ /'
else
    echo "  (apparmor-utils não instalado — instale: sudo apt install apparmor-utils)"
fi

echo
echo "═══ 3. SELinux ═══"
if command -v getenforce >/dev/null; then
    echo "  modo: $(getenforce)"
    case "$(getenforce)" in
        Enforcing)  echo "  ✓ bloqueando" ;;
        Permissive) echo "  ⚠⚠ PERMISSIVE — registra mas NÃO bloqueia" ;;
        Disabled)   echo "  ⚠⚠ DESABILITADO" ;;
    esac
    sestatus 2>/dev/null | head -8 | sed 's/^/  /'
else
    echo "  (SELinux não instalado — normal em Debian/Ubuntu)"
fi

echo
echo "═══ 4. os perfis de AppArmor que importam ═══"
if [ -d /etc/apparmor.d ]; then
    echo "  perfis instalados: $(ls /etc/apparmor.d/ 2>/dev/null | grep -cv 'abstractions\|tunables\|force-complain\|disable')"
    echo
    echo "  perfis em enforce:"
    sudo aa-status 2>/dev/null | sed -n '/profiles are in enforce/,/^$/p' | head -20 | sed 's/^/    /'
    echo
    echo "  perfis em complain (⚠ não bloqueiam):"
    sudo aa-status 2>/dev/null | sed -n '/profiles are in complain/,/^$/p' | head -10 | sed 's/^/    ⚠ /'
fi
```

### O que o LSM cobre, e o que não

| Cobre | Não cobre |
|---|---|
| Restringe o que o processo pode acessar, **mesmo como `root`** | Exploit dentro do próprio processo |
| Limita dano de serviço comprometido | Configuração errada do serviço |
| Perfil por caminho — bloqueia caminho não previsto | Syscall (isso é `seccomp`) |
| Impede escrita em caminho fora do perfil | Acesso à rede (isso é `nft`) |

⚠ **A primeira linha é a razão de existir do LSM.** **Só ele restringe `root`.** Seccomp restringe
syscall, capability limita operação, namespace limita visão — **mas `root` com as capability
adequadas passa por tudo isso.** **O LSM é a camada que diz "não, nem `root`".**

```bash
echo "═══ 5. demonstrando o AppArmor em modo complain vs enforce ═══"
echo
cat <<'EXPL'
  Cenário: um serviço que só deve ler /var/lib/app/

  Em COMPLAIN:
    · tenta acessar /etc/shadow
    · o kernel REGISTRA a violação
    · ⚠ mas PERMITE
    · você tem evidência, não proteção

  Em ENFORCE:
    · tenta acessar /etc/shadow
    · o kernel NEGA
    · ⚠ e registra
    · você tem proteção E evidência

  ⚠ aviso: colocar em enforce sem perfil testado QUEBRA o serviço.
  ⚠ o caminho é: complain → observar log → ajustar perfil → enforce
EXPL

echo
echo "═══ 6. onde ficam os logs de violação ═══"
echo "  journald:"
sudo journalctl -k --no-pager -g 'apparmor|SELinux|audit' 2>/dev/null | tail -5 | sed 's/^/    /' || \
    echo "    (nenhum evento)"
echo
echo "  auditd (se auditd ativo):"
sudo ausearch -m AVC -ts recent 2>/dev/null | tail -5 | sed 's/^/    /' || \
    echo "    (sem evento AVC, ou auditd inativo)"
```

⚠ **O procedimento de `complain` → `enforce` é o conteúdo prático da seção.** Você **não** coloca
em `enforce` direto — porque o perfil pode não cobrir tudo que o serviço faz. **Você observa o log,
ajusta, e então bloqueia.**

⚠ **E é por isso que "AppArmor instalado" não é o selo.** O selo é **"perfil X em enforce, com
zero violação nos últimos N dias"** — o que é verificável.

**Produza `lsm.md`:**

| LSM | Estado | Modo | Perfis em enforce | Achado |
|---|---|---|---|---|
| `AppArmor` | | | | |
| `SELinux` | | | | |
| `Yama` | | | | |
| `Lockdown` | | | | |

**Responda:**

1. **Qual LSM está ativo?** Em que modo?
2. **Quantos perfis em `enforce`?** Quantos em `complain`?
3. **Por que só o LSM restringe `root`?** Compare com `seccomp` e capability.
4. Qual o procedimento de `complain` → `enforce`?

---

## 10.5 `systemd` — o `hardening` por serviço

⚠ **A superfície real de um servidor são os **serviços**. E o `systemd` dá as diretivas.**

```bash
echo "═══ 1. o placar do seu sistema ═══"
echo
cat > placar-systemd.sh <<'SCRIPT'
#!/usr/bin/env bash
# placar-systemd.sh — nota de isolamento por serviço
set -uo pipefail

DIRETIVAS="NoNewPrivileges ProtectSystem ProtectHome PrivateTmp PrivateDevices
ProtectKernelTunables ProtectKernelModules ProtectControlGroups ProtectProc
RestrictAddressFamilies CapabilityBoundingSet SystemCallFilter MemoryDenyWriteExecute
RestrictNamespaces LockPersonality RestrictSUIDSGID RestrictRealtime
ProtectClock ProtectHostname ProtectKernelLogs RemoveIPC"

printf '%-40s %-8s %s\n' "SERVIÇO" "NOTA" "DIRETIVAS PRESENTES"
printf '%-40s %-8s %s\n' "───────" "────" "──────────────────"

total=0; soma=0
for u in $(systemctl list-units --type=service --state=running --no-pager 2>/dev/null | \
           awk '/\.service/ {print $1}'); do
    n=0
    for d in $DIRETIVAS; do
        systemctl cat "$u" 2>/dev/null | grep -q "^${d}=" && n=$((n+1))
    done
    nota=$(( n * 10 / 21 ))
    printf '%-40s %-8s %s\n' "$u" "${nota}/10" "${n} de 21"
    total=$((total+1)); soma=$((soma+nota))
done | sort -t/ -k1 -n

echo
[ "$total" -gt 0 ] && echo "  média: $((soma/total))/10   serviços: ${total}"
echo
echo "  ⚠ nota 0 significa: o serviço roda com o padrão (que é permissivo)"
echo "  ⚠ nota não é o objetivo — o objetivo é o serviço ter as diretivas QUE PRECISA"
SCRIPT
chmod +x placar-systemd.sh
./placar-systemd.sh | head -35
```

### As diretivas por categoria

| Categoria | Diretiva | O que faz |
|---|---|---|
| **Privilégio** | `NoNewPrivileges=yes` | Impede ganhar privilégio (módulo 3) |
| | `CapabilityBoundingSet=` | Teto de capability (módulo 5) |
| **Sistema de arquivos** | `ProtectSystem=strict` | `/usr`, `/boot`, `/etc` somente leitura |
| | `ProtectHome=yes` | `/home` inacessível |
| | `ReadWritePaths=` | Exceção ao `ProtectSystem` |
| | `PrivateTmp=yes` | `/tmp` próprio (módulo 7) |
| | `PrivateDevices=yes` | Sem `/dev` real |
| **Kernel** | `ProtectKernelTunables=yes` | Sem escrita em `/proc/sys`, `/sys` |
| | `ProtectKernelModules=yes` | Sem carregar módulo |
| | `ProtectKernelLogs=yes` | Sem ler `dmesg` |
| | `ProtectControlGroups=yes` | Sem mexer em `cgroup` |
| **Syscall** | `SystemCallFilter=` | Restringe syscall (`seccomp` — módulo 5) |
| | `SystemCallArchitectures=native` | Só a arquitetura nativa |
| | `MemoryDenyWriteExecute=yes` | ⚠ Força `W^X` (módulo 2) |
| **Rede** | `RestrictAddressFamilies=` | Limita família de socket |
| | `PrivateNetwork=yes` | Sem rede (só loopback) |
| | `IPAddressAllow=` | Filtro de destino |
| **Namespace** | `RestrictNamespaces=yes` | Sem criar namespace |
| **Outros** | `LockPersonality=yes` | Não muda personalidade de execução |
| | `RestrictSUIDSGID=yes` | Não cria arquivo `setuid` |
| | `RestrictRealtime=yes` | Sem prioridade de tempo real |
| | `RemoveIPC=yes` | Remove IPC no fim |

⚠ **As três diretivas de maior valor:**

| Diretiva | Por que |
|---|---|
| **`NoNewPrivileges=yes`** | Fecha o `setuid` — e não quebra quase nada |
| **`ProtectSystem=strict`** | Torna a maior parte do disco somente leitura |
| **`MemoryDenyWriteExecute=yes`** | ⚠ **Fecha o requisito de exploit** — mas quebra JIT |

⚠ **A terceira tem asterisco grande.** Ela **quebra** Java, .NET, Node.js (V8), e qualquer coisa
com compilação em tempo de execução. **É a diretiva mais eficaz e a mais provável de causar
incidente** — e por isso o teste é obrigatório.

```bash
echo "═══ 2. aplicando em um serviço — o procedimento ═══"
echo
cat <<'EXPL'
  ⚠ NUNCA edite /usr/lib/systemd/system/*.service diretamente.
     A próxima atualização de pacote sobrescreve.

  USE override:

    sudo systemctl edit nome.service

    # cria /etc/systemd/system/nome.service.d/override.conf

    [Service]
    NoNewPrivileges=yes
    ProtectSystem=strict
    ProtectHome=yes
    PrivateTmp=yes
    ReadWritePaths=/var/lib/nome /var/log/nome
    RestrictSUIDSGID=yes
    LockPersonality=yes

  DEPOIS:

    sudo systemctl daemon-reload
    sudo systemctl restart nome.service
    sudo systemctl status nome.service      ← ⚠ confira que SUBIU

  ⚠ se não subir: sudo journalctl -u nome.service -n 30
     e reverta: sudo systemctl revert nome.service
EXPL

echo
echo "═══ 3. o teste de verdade ═══"
echo "  ⚠ demonstrando com um serviço de teste"
echo

# cria um serviço de teste
sudo tee /etc/systemd/system/teste-hardening.service > /dev/null <<'UNIT'
[Unit]
Description=Teste de hardening
[Service]
ExecStart=/bin/sleep 3600
UNIT

sudo systemctl daemon-reload
sudo systemctl start teste-hardening.service 2>/dev/null

if systemctl is-active teste-hardening.service >/dev/null 2>&1; then
    echo "  ✓ serviço de teste rodando"
    echo
    echo "  antes do hardening:"
    for d in NoNewPrivileges ProtectSystem PrivateTmp MemoryDenyWriteExecute; do
        printf '    %-28s %s\n' "$d" "$(systemctl show -p "$d" --value teste-hardening.service 2>/dev/null || echo '—')"
    done

    # aplica
    sudo mkdir -p /etc/systemd/system/teste-hardening.service.d
    sudo tee /etc/systemd/system/teste-hardening.service.d/override.conf > /dev/null <<'OVR'
[Service]
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
RestrictSUIDSGID=yes
LockPersonality=yes
OVR

    sudo systemctl daemon-reload
    sudo systemctl restart teste-hardening.service 2>/dev/null
    sleep 1

    echo
    echo "  depois do hardening:"
    for d in NoNewPrivileges ProtectSystem ProtectHome PrivateTmp RestrictSUIDSGID; do
        printf '    %-28s %s\n' "$d" "$(systemctl show -p "$d" --value teste-hardening.service 2>/dev/null || echo '—')"
    done

    echo
    systemctl is-active teste-hardening.service >/dev/null 2>&1 && \
        echo "  ✓ SELO: serviço SUBIU com as diretivas aplicadas" || \
        echo "  ⚠ serviço NÃO subiu — veja journalctl"

    sudo systemctl stop teste-hardening.service 2>/dev/null
    sudo systemctl disable teste-hardening.service 2>/dev/null
else
    echo "  (não foi possível criar o serviço de teste)"
fi

sudo rm -f /etc/systemd/system/teste-hardening.service
sudo rm -rf /etc/systemd/system/teste-hardening.service.d
sudo systemctl daemon-reload 2>/dev/null
```

⚠ **A seção é o procedimento completo, e a ordem importa:** `systemctl edit` → `daemon-reload` →
`restart` → **`status`**. **O `status` é o selo** — se o serviço **não subiu**, a diretiva quebrou
algo, e você **reverte** com `systemctl revert`.

⚠ **E o teste com serviço próprio é o que prova.** Você **aplica**, **confirma que subiu**, e
**vê o valor efetivo** com `systemctl show -p`. **Três verificações, não uma.**

**Produza `systemd-hardening.md`:**

| Serviço | Nota | Diretivas | Aplicou? | Subiu? |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Responda:**

1. **Qual a nota média** dos seus serviços?
2. Qual serviço tem **nota mais baixa**? É o mais crítico?
3. Você testou o procedimento? **O serviço subiu?**
4. **Qual diretiva você não aplicaria** sem testar em janela? Por quê?

---

## 10.6 LAB — Endurecimento com selo

**Duração:** 120 min

### Passo 1 — O selo completo (40 min)

```bash
cd ~/lab/mod10

cat > selo-hardening.sh <<'SCRIPT'
#!/usr/bin/env bash
# selo-hardening.sh — aplica hardening E verifica cada item com selo
# ⚠ roda LOCAL, na VM. Apresenta o estado, não muda nada sem confirmação.
set -uo pipefail

REL="${1:-selo.txt}"

{
    echo "═══════════ SELO DE HARDENING ═══════════"
    echo "host: $(hostname)"
    echo "data: $(date -Is)"
    echo "kernel: $(uname -r)"
    echo

    ##########################################
    echo "── 1. MEMÓRIA E EXPLORAÇÃO ──"
    declare -A M=(
        [kernel.randomize_va_space]=2 [kernel.dmesg_restrict]=1
        [kernel.kptr_restrict]=2 [kernel.yama.ptrace_scope]=1
        [kernel.suid_dumpable]=0 [kernel.perf_event_paranoid]=3
    )
    for k in "${!M[@]}"; do
        v=$(sysctl -n "$k" 2>/dev/null); e="${M[$k]}"
        [ "$v" = "$e" ] && s="✓" || s="⚠"
        printf '  %s %-38s = %-8s (esperado %s)\n' "$s" "$k" "${v:-—}" "$e"
    done
    cp=$(sysctl -n kernel.core_pattern 2>/dev/null)
    case "$cp" in
        \|*) printf '  ⚠ %-38s = %s  ⚠ PIPE\n' "kernel.core_pattern" "$cp" ;;
        /*)  d=$(dirname "$cp")
             [ -w "$d" ] && printf '  ⚠ %-38s = %s  ⚠ dir gravável\n' "kernel.core_pattern" "$cp" || \
                            printf '  ✓ %-38s = %s\n' "kernel.core_pattern" "$cp" ;;
        *)   printf '  ⚠ %-38s = %s\n' "kernel.core_pattern" "$cp" ;;
    esac
    echo

    ##########################################
    echo "── 2. REDE ──"
    declare -A R=(
        [net.ipv4.ip_forward]=0 [net.ipv4.conf.all.accept_redirects]=0
        [net.ipv4.conf.all.accept_source_route]=0 [net.ipv4.conf.all.rp_filter]=1
        [net.ipv4.tcp_syncookies]=1 [net.ipv4.conf.all.log_martians]=1
        [net.ipv4.icmp_echo_ignore_broadcasts]=1 [net.ipv4.conf.all.send_redirects]=0
        [net.ipv6.conf.all.accept_ra]=0
    )
    for k in "${!R[@]}"; do
        v=$(sysctl -n "$k" 2>/dev/null); e="${R[$k]}"
        [ "$v" = "$e" ] && s="✓" || s="⚠"
        printf '  %s %-44s = %-8s (esperado %s)\n' "$s" "$k" "${v:-—}" "$e"
    done
    echo

    ##########################################
    echo "── 3. SISTEMA DE ARQUIVOS ──"
    declare -A F=(
        [fs.protected_symlinks]=1 [fs.protected_hardlinks]=1
        [fs.protected_fifos]=2 [fs.protected_regular]=2
    )
    for k in "${!F[@]}"; do
        v=$(sysctl -n "$k" 2>/dev/null); e="${F[$k]}"
        [ "$v" = "$e" ] && s="✓" || s="⚠"
        printf '  %s %-38s = %-8s (esperado %s)\n' "$s" "$k" "${v:-—}" "$e"
    done
    echo

    ##########################################
    echo "── 4. LSM ──"
    lsm=$(cat /sys/kernel/security/lsm 2>/dev/null)
    printf '  %s ativos: %s\n' "$([ -n "$lsm" ] && echo ✓ || echo ⚠)" "${lsm:-nenhum}"
    if command -v aa-status >/dev/null; then
        enf=$(aa-status 2>/dev/null | grep -oE '^[0-9]+' | head -1)
        com=$(aa-status 2>/dev/null | grep -oE '^[0-9]+' | sed -n 2p)
        printf '  ✓ AppArmor: %s em enforce, %s em complain\n' "${enf:-?}" "${com:-?}"
    fi
    if command -v getenforce >/dev/null; then
        m=$(getenforce)
        case "$m" in
            Enforcing)  printf '  ✓ SELinux: Enforcing\n' ;;
            Permissive) printf '  ⚠ SELinux: Permissive (não bloqueia)\n' ;;
            *)          printf '  ⚠ SELinux: %s\n' "$m" ;;
        esac
    fi
    echo

    ##########################################
    echo "── 5. MONTAGEM ──"
    for mp in /tmp /var/tmp /home; do
        opts=$(findmnt -n -o OPTIONS --target "$mp" 2>/dev/null)
        [ -z "$opts" ] && continue
        r=""
        for f in nosuid noexec nodev; do
            case ",$opts," in *",$f,"*) r="$r ✓$f" ;; *) r="$r ⚠$f" ;; esac
        done
        printf '  %-12s %s\n' "$mp" "$r"
    done
    echo

    ##########################################
    echo "── 6. DETECÇÃO ──"
    for s in auditd rsyslog systemd-journald; do
        a=$(systemctl is-active "$s" 2>/dev/null)
        [ "$a" = "active" ] && printf '  ✓ %-20s %s\n' "$s" "$a" || printf '  ⚠ %-20s %s\n' "$s" "${a:-inativo}"
    done
    printf '  %s regras de auditd: %s\n' \
        "$([ "$(auditctl -l 2>/dev/null | wc -l)" -gt 10 ] && echo ✓ || echo ⚠)" \
        "$(auditctl -l 2>/dev/null | wc -l)"
    grep -q '^-e 2' /etc/audit/rules.d/*.rules 2>/dev/null && \
        printf '  ✓ auditd imutável (-e 2)\n' || printf '  ⚠ auditd NÃO imutável\n'
    grep -qE '^\s*\*\.\*\s+@' /etc/rsyslog.conf /etc/rsyslog.d/*.conf 2>/dev/null && \
        printf '  ✓ log remoto configurado\n' || printf '  ⚠ SEM log remoto\n'
    echo

    ##########################################
    echo "── 7. SUPERFÍCIE ──"
    printf '  portas em escuta      : %s\n' "$(ss -tuln 2>/dev/null | tail -n +2 | wc -l)"
    printf '  em 0.0.0.0            : %s\n' "$(ss -tuln 2>/dev/null | grep -cE '0\.0\.0\.0|\*:')"
    printf '  setuid                : %s\n' "$(find / -xdev -perm -4000 -type f 2>/dev/null | wc -l)"
    printf '  setuid em dir gravável: %s\n' "$(find / -xdev -perm -4000 -type f 2>/dev/null | \
        while read -r b; do [ -w "$(dirname "$b")" ] && echo x; done | wc -l)"
    printf '  capabilities          : %s\n' "$(getcap -r / 2>/dev/null | wc -l)"
    printf '  serviços rodando      : %s\n' "$(systemctl list-units --type=service --state=running --no-pager 2>/dev/null | grep -c '\.service')"
    echo

    ##########################################
    echo "── 8. PLACAR ──"
    ok=$(grep -c '^  ✓' <<< "$(cat <<'EOF'
EOF
)" 2>/dev/null || true)
    echo "  ⚠ conte os ✓ e ⚠ acima — o placar é o selo"
    echo "  ⚠ item sem ✓ é item NÃO verificado ou fora do valor"

} > "$REL" 2>&1

cat "$REL"
echo
echo "salvo em ${REL}"
SCRIPT

chmod +x selo-hardening.sh
sudo ./selo-hardening.sh selo.txt
```

Produza `selo.md` — a tabela do selo, com **status por item**:

| Dimensão | Itens | Com ✓ | Com ⚠ |
|---|---|---|---|
| Memória | | | |
| Rede | | | |
| Sistema de arquivos | | | |
| LSM | | | |
| Montagem | | | |
| Detecção | | | |
| Superfície | | | |

**Responda:**

1. **Quantos itens com ✓ no total?**
2. **Qual dimensão tem mais ⚠?** É a prioridade.
3. Qual item você **não consegue verificar** com comando?
4. **O selo prova que o sistema está endurecido?** Explique o limite.

⚠ **A resposta 4 é a honestidade do módulo.** O selo prova que **os parâmetros conferidos** estão
no valor esperado. Ele **não** prova que o sistema é seguro — porque **sobra o que não foi
conferido** (aplicação, lógica, configuração específica). **O selo é medida, não garantia.**

### Passo 2 — Aplicar por prioridade (40 min)

```bash
cd ~/lab/mod10

echo "═══ APLICANDO POR PRIORIDADE ═══"
echo
cat > aplica-prioridade.sh <<'SCRIPT'
#!/usr/bin/env bash
# aplica-prioridade.sh — hardening em ordem de risco × custo
set -uo pipefail

echo "⚠ Este script MOSTRA o que fazer. Ele não aplica sem confirmação."
echo

echo "── PRIORIDADE 1: REDUÇÃO (o mais eficaz, o mais barato) ──"
cat <<'EXPL'
  Nada a aplicar — é REMOÇÃO. Verifique:

    sudo systemctl list-units --type=service --state=running
    # para cada serviço: é necessário?

    sudo systemctl stop  nome.service
    sudo systemctl disable nome.service

  Pacotes de superfície desnecessária:
    sudo apt remove --purge telnet ftp rsh-server tftpd xinetd snmpd
    sudo apt remove --purge apache2 nginx samba rpcbind avahi-daemon cups
    # ⚠ confirme antes. Alguns são dependência de outro.

  ⚠ RISCO DE QUEBRAR: baixo.  GANHO: alto (a superfície deixa de existir)
EXPL

echo
echo "── PRIORIDADE 2: PERMISSÃO (o achado mais acionável) ──"
cat <<'EXPL'
    sudo chmod 600 /caminho/.env          # se estiver 644
    sudo chmod 1777 /tmp                  # se faltar sticky
    sudo chmod u-s /caminho/binario       # setuid desnecessário
    sudo chown root:root /dir             # setuid em dir gravável

  ⚠ RISCO DE QUEBRAR: baixo.  GANHO: alto
EXPL

echo
echo "── PRIORIDADE 3: SUDOERS ──"
cat <<'EXPL'
    sudo visudo
    # troque NOPASSWD: ALL por comando específico

  ⚠ RISCO: MÉDIO — pode te trancar fora.
  ⚠ MANTENHA UMA SESSÃO DE ROOT ABERTA enquanto edita.
  ⚠ e valide: sudo visudo -c
EXPL

echo
echo "── PRIORIDADE 4: SYSCTL ──"
cat <<'EXPL'
    sudo cp 99-hardening.conf /etc/sysctl.d/
    sudo sysctl --system
    # ⚠ e VERIFIQUE item por item
    # ⚠ e REINICIE para testar persistência
    # ⚠ ip_forward=0 QUEBRA contêiner com NAT — verifique antes

  ⚠ RISCO DE QUEBRAR: baixo (exceto ip_forward).
  GANHO: alto
EXPL

echo
echo "── PRIORIDADE 5: AUDITD ──"
cat <<'EXPL'
    sudo apt install auditd audispd-plugins
    sudo cp regras-audit.rules /etc/audit/rules.d/99-curso.rules
    sudo augenrules --load
    sudo systemctl enable --now auditd

  ⚠ RISCO DE QUEBRAR: baixo.
  GANHO: alto (é o único que responde a pergunta de syscall)
  ⚠ com a seção de EXCLUSÃO, senão o log vira ruído.
EXPL

echo
echo "── PRIORIDADE 6: LOG REMOTO ──"
cat <<'EXPL'
    sudo tee /etc/rsyslog.d/50-remoto.conf > /dev/null <<'CONF'
    *.* action(type="omfwd" target="log.exemplo.com" port="514"
               protocol="tcp" queue.type="LinkedList"
               queue.filename="fwdq" queue.saveonshutdown="on"
               action.resumeRetryCount="-1")
    CONF
    sudo systemctl restart rsyslog

  ⚠ RISCO DE QUEBRAR: baixo.
  GANHO: crítico — é a ÚNICA defesa contra atacante com root apagar o log.
EXPL

echo
echo "── PRIORIDADE 7+: O QUE EXIGE JANELA ──"
cat <<'EXPL'
    ⚠ Só com janela de manutenção e plano de reversão:

    7. Diretivas de systemd por serviço
    8. LSM (AppArmor/SELinux em enforce)
    9. mount com nosuid,noexec,nodev
    10. seccomp customizado

  ⚠ RISCO DE QUEBRAR: ALTO.
  ⚠ para cada um: aplique em UM serviço, teste, e só então propague.
  ⚠ e sempre saiba o comando de reverter.
EXPL
SCRIPT
chmod +x aplica-prioridade.sh
./aplica-prioridade.sh
```

Produza `aplicacao.md`:

| Prioridade | Ação | Aplicou? | Verificou? | Reverteu? |
|---|---|---|---|---|
| 1 — Redução | | | | |
| 2 — Permissão | | | | |
| 3 — `sudoers` | | | | |
| 4 — `sysctl` | | | | |
| 5 — `auditd` | | | | |
| 6 — Log remoto | | | | |

**Responda:**

1. **Quantas prioridades você aplicou?** Quantas verificou?
2. Qual exigiu **plano de reversão**? Você o escreveu?
3. **Qual é o comando de reverter** para cada uma das três primeiras?
4. **Qual você não aplicaria** sem janela? Por quê?

### Passo 3 — O relatório de endurecimento (40 min)

Produza `relatorio-hardening.md`:

```markdown
# Relatório de endurecimento — [host]

## 1. Método, escopo e data
## 2. Estado inicial
| Dimensão | Itens | Conformes | Não conformes |
|---|---|---|---|
| sysctl memória | | | |
| sysctl rede | | | |
| sysctl FS | | | |
| LSM | | | |
| Montagem | | | |
| Detecção | | | |
| Superfície | | | |

## 3. Mudanças aplicadas
| # | Parâmetro | Antes | Depois | Aplicado | Verificado | Reversível |
|---|---|---|---|---|---|---|

## 4. Estado após
| Dimensão | Conformes | Não conformes | Delta |
|---|---|---|---|

## 5. O que NÃO foi aplicado, e por quê
| Item | Motivo | Condição para aplicar |
|---|---|---|
| ip_forward=0 (se contêiner) | quebraria NAT | janela |
| MemoryDenyWriteExecute | quebra JIT | teste por serviço |
| AppArmor enforce | perfil não testado | ciclo complain |

## 6. Procedimento de reversão
| Mudança | Reverter |
|---|---|
| sysctl | remover o arquivo + `sysctl --system` |
| systemd | `systemctl revert nome.service` |
| sudoers | `visudo` e remover a linha |
| pacote | `apt install --reinstall` |

## 7. Verificação de persistência
- [ ] Reboot realizado
- [ ] `selo.txt` obtido após o reboot
- [ ] Comparação antes/depois
- [ ] Todo item ainda conforme

## 8. Limites deste relatório
⚠ Mínimo 3:
- o selo cobre parâmetros CONFERIDOS, não o sistema inteiro
- hardening de aplicação está fora do escopo
- configuração de LSM exige perfil por serviço
```

⚠ **A seção 5 é a que diferencia o relatório.** Ela diz **o que você decidiu não fazer e por quê**
— e **sob qual condição aplicaria**. **É isso que o cliente precisa**, porque ele decide com o
contexto dele.

⚠ **E a seção 7 é a verificação que 90% dos relatórios pulam.** **O `hardening` só está aplicado se
sobreviveu a um reboot.** Sem essa confirmação, você tem intenção.

### Critérios de aceitação

- `selo-hardening.sh` rodando, com as **oito** seções.
- `selo.md` com o **placar por dimensão** e a contagem de ✓ e ⚠.
- `sysctl.md` com **todos** os parâmetros medidos, e o `core_pattern` classificado.
- Você criou `99-hardening.conf` com as **três categorias** de `sysctl`.
- Você aplicou e **verificou** — e testou **persistência com reboot**.
- `lsm.md` com o LSM ativo, o modo, e a contagem de perfis em `enforce` vs. `complain`.
- Você explicou **por que só o LSM restringe `root`**.
- `placar-systemd.sh` rodado, com a nota dos serviços.
- Você demonstrou o procedimento de **`systemctl edit`** e **confirmou que o serviço subiu**.
- Você identificou **qual diretiva não aplicaria sem testar** e por quê.
- `aplicacao.md` com as **seis** prioridades.
- Você escreveu o **comando de reverter** de cada mudança.
- `relatorio-hardening.md` com as **oito** seções, incluindo a seção 5.
- Você testou **persistência com reboot** e registrou o resultado.

---

## Avaliação

1. Descreva as seis etapas do `hardening` com selo.
2. **Por que a redução é a etapa mais eficaz e mais barata?**
3. Por que "aplicar o CIS inteiro" é má prática?
4. Cite cinco `sysctl` de memória com o valor seguro de cada um.
5. **Por que `core_pattern` com pipe é achado crítico?**
6. Cite cinco `sysctl` de rede e o que cada um previne.
7. **Por que `fs.protected_symlinks` importa?** Qual módulo conecta?
8. Qual a ordem de carregamento dos arquivos de `sysctl`? Qual ganha?
9. **Como você verifica persistência?** Por que não há atalho?
10. **Qual `sysctl` quebra contêiner?** Por quê?
11. O que `LSM` é, e o que ele cobre?
12. **Por que só o `LSM` restringe `root`?** Compare com `seccomp` e capability.
13. Diferencie `complain` de `enforce`. Qual o procedimento entre eles?
14. Diferencie `AppArmor` e `SELinux` — modelo e distribuição.
15. Cite três diretivas de `systemd` de maior valor e o que cada uma faz.
16. **Qual diretiva fecha o requisito de exploit?** Qual serviço ela quebra?
17. **Por que nunca editar `/usr/lib/systemd/system/*.service`?**
18. Qual a sequência para aplicar diretiva e **confirmar que funcionou**?
19. Qual o comando de reverter uma diretiva de `systemd`?
20. **O selo prova que o sistema é seguro?** Explique o limite.

---

**Próximo:** [Módulo 11 — Projeto: auditoria da VM mal configurada](modulo-11.md)
