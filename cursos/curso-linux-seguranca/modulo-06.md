# Módulo 6 — Namespace e `cgroup`

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 5

---

## ⚠ Este é o módulo em que você precisa desaprender

⚠ **A afirmação que a maioria carrega, e que está errada:**

> ~~"Contêiner é uma fronteira de segurança."~~

⚠ **Contêiner é um mecanismo de **isolamento de recurso** e de **empacotamento**. Ele **não** é
uma fronteira de segurança por si.** É por isso que existe `seccomp`, `CapabilityBoundingSet`,
`NoNewPrivileges`, `user namespace`, LSM e `read-only rootfs` — **todos precisam ser configurados
separadamente**, e a maioria fica no padrão.

| O que o contêiner dá | O que ele **não** dá |
|---|---|
| Namespace de PID próprio | Fronteira contra exploit de kernel |
| Namespace de rede próprio | Proteção se `privileged: true` |
| Namespace de mount próprio | Proteção se socket do Docker está montado |
| Raiz de sistema de arquivos própria | Isolamento de usuário (sem `userns`) |
| Limite de recurso (`cgroup`) | Qualquer coisa, se `cap_sys_admin` for dada |

⚠ **A tese do módulo:**

> **Todo contêiner com `privileged: true` é host. Todo contêiner com socket do Docker montado é
> host. Todo contêiner com `cap_sys_admin` é host. E o padrão de muitas imagens é ter mais
> privilégio do que precisa.**

⚠ **E este é o módulo onde a conduta é mais rígida.** Você usa `unshare` e `podman` na **sua VM**
para **ver** os mecanismos. **Escapar do contêiner de um terceiro é outra coisa** — e é
exatamente o que o curso não ensina.

---

## Objetivos

1. Entender os oito namespace e o que cada um isola.
2. Ver namespace **sem** contêiner, usando `unshare` e `nsenter`.
3. Entender `cgroup` v1 e v2, e o que cada controlador limita.
4. Auditar um contêiner pelos parâmetros que determinam o isolamento real.
5. Reconhecer as quatro configurações que anulam o isolamento.

---

## 6.1 Os oito namespace

⚠ **Namespace é **partição do recurso global**. Cada namespace dá ao processo a **ilusão** de ter
o recurso só para si.

| Namespace | Isola | Flag do `unshare` | Descoberto em |
|---|---|---|---|
| **`mnt`** | Ponto de montagem | `--mount` | 2002 |
| **`pid`** | Número do processo | `--pid` | 2008 |
| **`net`** | Interface, rota, porta, `iptables` | `--net` | 2009 |
| **`ipc`** | Memória compartilhada, semáforo, fila | `--ipc` | 2009 |
| **`uts`** | `hostname`, `domainname` | `--uts` | 2006 |
| **`user`** | **UID/GID** | `--user` | 2013 |
| **`cgroup`** | Visão da hierarquia de `cgroup` | `--cgroup` | 2016 |
| **`time`** | Relógio (`CLOCK_MONOTONIC`, `BOOTTIME`) | `--time` | 2020 |

⚠ **A ordem da tabela é a ordem do desenvolvimento — e conta uma história.** Os primeiros
(`mnt`, `uts`, `pid`, `net`, `ipc`) vieram para **empacotamento**. Os últimos (`user`, `cgroup`,
`time`) vieram para **segurança** — porque os primeiros **não isolavam privilégio**.

⚠ **E é aí que está o erro comum:** `pid` + `mnt` + `net` isolam **o que o processo vê`, não
**o que ele pode**. Um processo em namespace de PID próprio **ainda é `root`** — e `root` no
namespace é `root` no host, **a menos que `user` namespace esteja ativo**.

⚠ **A linha do `user` namespace é a única que muda privilégio.** Ela mapeia um UID **não privilegiado
do host** para `root` **dentro** do namespace — e é o que permite que um contêiner rootless exista.

```bash
mkdir -p ~/lab/mod06 && cd ~/lab/mod06

echo "═══ os namespace do meu shell ═══"
for ns in mnt pid net ipc uts user cgroup time; do
    printf '  %-8s %s\n' "$ns" "$(readlink /proc/self/ns/$ns 2>/dev/null || echo '—')"
done

echo
echo "═══ dois processos, mesmo namespace? ═══"
echo "  shell atual:"
for ns in mnt pid net uts; do
    printf '    %-6s %s\n' "$ns" "$(readlink /proc/self/ns/$ns 2>/dev/null)"
done

echo
echo "  PID 1 (init):"
for ns in mnt pid net uts; do
    printf '    %-6s %s\n' "$ns" "$(readlink /proc/1/ns/$ns 2>/dev/null)"
done

echo
echo "═══ o que o namespace de PID faz ═══"
echo "  no namespace atual, o PID 2 é:"
cat /proc/2/comm 2>/dev/null | sed 's/^/    /'
echo "  ⚠ num namespace de PID novo, o primeiro processo é PID 1"
```

⚠ **A comparação entre o shell e o PID 1 é o instrumento.** Se os `inode` de namespace (o número
depois de `[`) são **iguais**, os dois processos **compartilham** aquele namespace. Se são
diferentes, **estão isolados**. **É assim que você audita isolamento — comparando inode, não
supondo.**

**Produza `namespaces.md`:**

| Namespace | Inode do shell | Inode do PID 1 | Compartilham? |
|---|---|---|---|
| `mnt` | | | |
| `pid` | | | |
| `net` | | | |
| `uts` | | | |
| `user` | | | |

**Responda:**

1. **Quais namespaces o shell compartilha com o PID 1?** (Numa VM comum: todos.)
2. O `user` namespace existe? Por que ele é o único que muda privilégio?
3. Por que `pid` + `mnt` + `net` isolam **o que o processo vê**, não **o que ele pode**?
4. **Por que a ordem da tabela conta a história** do contêiner?

---

## 6.2 `unshare` — namespace sem contêiner

⚠ **`unshare` é o instrumento do módulo.** Ele cria namespace **sem** Docker, **sem** Podman —
e por isso mostra o **mecanismo** sem a camada que esconde.

```bash
echo "═══ 1. namespace de UTS: hostname próprio ═══"
echo "  hostname atual: $(hostname)"
sudo unshare --uts --fork sh -c 'hostname dentro-do-ns; echo "  dentro: $(hostname)"'
echo "  depois: $(hostname)"

echo
echo "═══ 2. namespace de PID: não vejo os outros processos ═══"
echo "  processos que EU vejo: $(ls /proc | grep -c '^[0-9]')"
sudo unshare --pid --fork --mount-proc sh -c '
    echo "  dentro do ns, processos visíveis: $(ls /proc | grep -c "^[0-9]")"
    echo "  e o meu PID é: $$"
    echo "  e o init do ns: $(cat /proc/1/comm 2>/dev/null)"
'

echo
echo "═══ 3. namespace de MNT: montagem própria ═══"
sudo unshare --mount --fork sh -c '
    mount -t tmpfs tmpfs /mnt
    echo "  dentro: $(findmnt -n -o FSTYPE /mnt 2>/dev/null)"
'
echo "  fora: $(findmnt -n -o FSTYPE /mnt 2>/dev/null || echo 'nada montado')"
echo "  ⚠ a montagem não vazou — é o namespace de mount"

echo
echo "═══ 4. namespace de NET: rede própria, incluindo loopback ═══"
echo "  fora: $(ip -o link show 2>/dev/null | wc -l) interfaces"
sudo unshare --net --fork sh -c '
    echo "  dentro: $(ip -o link show 2>/dev/null | wc -l) interface(s)"
    ip -o link show 2>/dev/null | sed "s/^/    /"
    echo "  ⚠ nem o loopback tem endereço — é namespace de rede vazio"
'
```

⚠ **Cada experimento mostra uma peça do contêiner.** Juntos, eles **são** o contêiner — o Docker
só faz isto, mais `cgroup`, mais `seccomp`/capability, mais o sistema de arquivos.

⚠ **E note a linha do namespace de `net`.** Sem `userns` e sem configurar a interface, o namespace
de rede dá **nenhuma conectividade** — nem `localhost`. **É por isso que o Docker cria `veth` e
ponte:** o namespace sozinho não conecta nada.

⚠ **E a mais importante, o `user` namespace:**

```bash
echo "═══ 5. USER namespace: a única que muda privilégio ═══"
echo "  fora, meu uid real: $(id -u)"
echo

echo "  ── com mapeamento de root para o MEU uid ──"
sudo unshare --user --map-root-user --fork sh -c '
    echo "    dentro do ns, uid: $(id -u)  → parece root"
    echo "    mas o uid REAL (no host) é o meu:"
    grep -E "^Uid:" /proc/self/status | sed "s/^/      /"
    echo
    echo "    ⚠ Posso ler /etc/shadow? (sou root só DENTRO)"
    head -1 /etc/shadow 2>&1 | head -1 | sed "s/^/      /"
'
```

⚠ **A última verificação é o ponto exato do `user` namespace.** Você **parece** `root` dentro
(`uid 0`), mas o kernel **ainda sabe** que você é o seu uid real. **Por isso ler `/etc/shadow`
falha** — o privilégio é ilusório **fora** do namespace.

⚠ **A regra, escrita:** uma operação só é permitida se o privilégio **valer no namespace onde o
recurso vive**. `user` namespace mapeia a identidade — mas **não** dá privilégio sobre recurso do
host.

⚠ **E é por isso que `userns` permite contêiner rootless.** Um processo sem privilégio no host
cria um namespace onde é `root` — e monta, instala pacotes, gerencia processos **dentro** do
namespace, sem tocar no host.

**Produza `unshare.md`:**

| Namespace | O que ficou isolado | O que **não** ficou |
|---|---|---|
| `uts` | | |
| `pid` | | |
| `mnt` | | |
| `net` | | |
| **`user`** | | |

**Responda:**

1. No namespace de `pid`, quantos processos você viu? **Por quê?**
2. A montagem do `mnt` **vazou** para fora? Por quê?
3. **No `user` namespace, você conseguiu ler `/etc/shadow`?** Explique por quê.
4. **Por que `user` namespace é o único que muda privilégio?**

⚠ **A resposta 4 é o divisor de águas do módulo.** Os outros sete namespaces isolam **visão**; o
`user` isola **identidade**. E identidade é o que o kernel usa para decidir permissão.

---

## 6.3 `nsenter` — entrar no namespace de outro processo

⚠ **`nsenter` é o outro lado da moeda.** Ele deixa você **entrar** num namespace existente — e é
**a ferramenta de auditoria** de contêiner.

```bash
echo "═══ 1. um processo em namespace próprio ═══"
sudo unshare --uts --pid --fork --mount-proc --uts \
     sh -c 'hostname ns-de-teste; sleep 300' &
sleep 0.5

# Descobre o PID externo
NSPID=$(pgrep -f 'sleep 300' | head -1)
echo "  PID externo: ${NSPID}"
echo "  hostname dele do lado de fora: $(cat /proc/${NSPID}/comm 2>/dev/null)"
echo

echo "═══ 2. entrando no namespace dele ═══"
sudo nsenter --target "$NSPID" --uts --pid --mount-proc hostname 2>/dev/null
echo "  ⚠ de dentro, o hostname é outro — é o namespace"

echo
echo "═══ 3. comparando os namespace ═══"
for ns in uts pid mnt net; do
    fora=$(readlink /proc/self/ns/$ns 2>/dev/null)
    dele=$(readlink /proc/${NSPID}/ns/$ns 2>/dev/null)
    if [ "$fora" = "$dele" ]; then
        printf '  %-6s COMPARTILHAM  %s\n' "$ns" "$fora"
    else
        printf '  %-6s ISOLADO       meu=%s  dele=%s\n' "$ns" "${fora#*[}" "${dele#*[}"
    fi
done

kill "$NSPID" 2>/dev/null
```

⚠ **A comparação de inode do passo 3 é a técnica de auditoria.** Num contêiner real, você
**compara** os namespaces do processo com os do host — e **descobre o que está compartilhado**.
Isso é achado objetivo, não suposição.

⚠ **E `nsenter` é a ferramenta que exige privilégio.** Entrar no namespace de outro processo exige
`CAP_SYS_ADMIN` — **e é por isso que o `user` namespace importa:** num contêiner rootless, o
namespace de `user` protege, mesmo que o resto esteja compartilhado.

⚠ **A regra do módulo, escrita:**

> **`nsenter` no namespace de um processo seu é diagnóstico. No de um processo alheio é intrusão.**
> E, tecnicamente, ambos exigem o mesmo privilégio — **a diferença é a autorização, não o
> comando.**

**Produza `nsenter.md`:**

| Namespace | Compartilhado? | O que isso significa |
|---|---|---|
| `uts` | | |
| `pid` | | |
| `mnt` | | |
| `net` | | |

**Responda:**

1. **Quais namespaces estavam isolados e quais compartilhados?**
2. O `nsenter` funcionou sem `sudo`? Por quê?
3. **Por que `nsenter` exige privilégio?**
4. Como você usaria isso para **auditar** um contêiner?

---

## 6.4 `cgroup` — o limite de recurso

⚠ **`cgroup` é o que **limita** o consumo.** Namespace isola **visão**; `cgroup` limita **uso**.

```bash
echo "═══ 1. qual versão de cgroup ═══"
stat -fc %T /sys/fs/cgroup/ 2>/dev/null | sed 's/^/  tipo: /'
echo
ls /sys/fs/cgroup/ 2>/dev/null | head -15
echo

if [ -f /sys/fs/cgroup/cgroup.controllers ]; then
    echo "  ✓ cgroup v2 (unificado)"
    echo "  controladores: $(cat /sys/fs/cgroup/cgroup.controllers)"
else
    echo "  cgroup v1 (hierarquias separadas)"
    ls -d /sys/fs/cgroup/*/ 2>/dev/null | head -10 | sed 's/^/    /'
fi

echo
echo "═══ 2. os controladores e o que cada um limita ═══"
cat <<'EXPL'
  cpu         → tempo de CPU (quanto do processador)
  cpuset      → quais núcleos pode usar
  memory      → memória RAM máxima
  pids        → número de processos (⚠ evita fork bomb)
  io          → banda de disco
  hugetlb     → páginas grandes
  rdma        → memória de placa de rede
  devices     → quais dispositivos pode abrir   ◀── ⚠ o de segurança
  freezer     → suspender o grupo
  net_cls     → classificar tráfego
  net_prio    → prioridade de rede
EXPL

echo
echo "═══ 3. limits do meu cgroup ═══"
minhacg=$(awk -F: '{print $3}' /proc/self/cgroup 2>/dev/null | head -1)
echo "  meu cgroup: ${minhacg}"
if [ -f "/sys/fs/cgroup${minhacg}/memory.max" ]; then
    printf '  memory.max : %s\n' "$(cat "/sys/fs/cgroup${minhacg}/memory.max" 2>/dev/null)"
    printf '  pids.max   : %s\n' "$(cat "/sys/fs/cgroup${minhacg}/pids.max" 2>/dev/null)"
    printf '  cpu.max    : %s\n' "$(cat "/sys/fs/cgroup${minhacg}/cpu.max" 2>/dev/null)"
fi
```

⚠ **Note que `memory.max` provavelmente diz `max`.** Isso significa **sem limite**. Num contêiner,
isso é achado — porque um processo pode consumir toda a memória do host.

⚠ **E o controlador `devices` é o único com valor de segurança.** Ele lista **quais dispositivos**
o grupo pode abrir — e é o que impede um contêiner de acessar o disco cru (`/dev/sda`), o que
seria **`root` imediato**.

⚠ **`pids.max` merece atenção especial.** Sem ele, um programa pode criar processos até esgotar o
sistema — **fork bomb**. É o limite mais barato de configurar e o mais útil.

```bash
echo "═══ 4. demonstrando o limite de PID (fork) ═══"
echo "  ⚠ demonstração CONTROLADA — limite baixo, processo morto depois"
echo

# Cria um cgroup v2 temporário com limite de 20 processos
if [ -f /sys/fs/cgroup/cgroup.controllers ] && command -v systemd-run >/dev/null; then
    systemd-run --user --scope -p TasksMax=20 --quiet \
        sh -c '
            echo "    limite de tarefas: $(cat /sys/fs/cgroup$(awk -F: "{print \$3}" /proc/self/cgroup | head -1)/pids.max 2>/dev/null)"
            n=0
            for i in $(seq 1 40); do
                ( sleep 30 & ) 2>/dev/null && n=$((n+1)) || break
            done
            echo "    consegui criar ~${n} processos antes de falhar"
            echo "    ⚠ é o pids.max agindo"
            pkill sleep 2>/dev/null
        ' 2>/dev/null || echo "    (systemd-run --user indisponível)"
else
    echo "  (pule — requer cgroup v2 com systemd-run)"
fi
```

**Produza `cgroup.md`:**

| Item | Valor |
|---|---|
| Versão de `cgroup` | |
| Controladores disponíveis | |
| Meu `cgroup` | |
| `memory.max` | |
| `pids.max` | |
| `cpu.max` | |

**Responda:**

1. Qual versão de `cgroup` o sistema usa?
2. **O `memory.max` tem limite?** Se `max`, o que isso significa?
3. **Por que o controlador `devices` tem valor de segurança?**
4. Por que `pids.max` é o limite mais barato e mais útil?

---

## 6.5 Contêiner — o que determina o isolamento real

⚠ **Agora você tem as peças. Vamos auditar um contêiner de verdade.**

```bash
echo "═══ 1. ferramenta disponível ═══"
for t in docker podman nerdctl; do
    command -v "$t" >/dev/null && echo "  ✓ $t" || echo "  · $t"
done

echo
echo "═══ 2. se há contêiner rodando ═══"
if command -v docker >/dev/null; then
    docker ps --format 'table {{.ID}}\t{{.Image}}\t{{.Names}}' 2>/dev/null | head -5 || \
        echo "  (sem permissão ou nenhum rodando)"
elif command -v podman >/dev/null; then
    podman ps --format 'table {{.ID}}\t{{.Image}}\t{{.Names}}' 2>/dev/null | head -5 || true
else
    echo "  (nenhuma ferramenta de contêiner)"
fi
```

### Os sete parâmetros que determinam o isolamento

| Parâmetro | Valor seguro | Valor perigoso |
|---|---|---|
| **`privileged`** | `false` | ⚠⚠ **`true` = host** |
| **Socket do Docker montado** | ausente | ⚠⚠ **`/var/run/docker.sock` = host** |
| **`cap_add`** | nenhuma, ou mínima | ⚠ `SYS_ADMIN` = host |
| **`userns`** | habilitado (rootless) | desabilitado = `root` no host |
| **`seccomp`** | `default` ou perfil | ⚠ **`unconfined` = sem filtro** |
| **`network`** | `bridge` próprio | ⚠ `host` = rede do host |
| **`pid`** | namespace próprio | ⚠ `host` = vê os processos do host |
| **`read_only` rootfs** | `true` quando possível | `false` = pode escrever |
| **`no-new-privileges`** | `true` | `false` = pode ganhar privilégio |

⚠ **Os dois primeiros são os que **anulam todo o resto**.** Um contêiner `privileged: true` **é o
host** — ele tem todas as capability, todos os dispositivos, e sem seccomp. E um contêiner que
monta o **socket do Docker** pode criar **outro** contêiner privilegiado — **é host por
procuração**.

⚠ **A tabela é o checklist de auditoria de contêiner.** Ela não depende da ferramenta nem da
imagem — depende **de como foi configurado**, e é isso que a auditoria verifica.

```bash
echo "═══ 3. inspecionando um contêiner (se houver) ═══"
if command -v docker >/dev/null && docker ps -q 2>/dev/null | head -1 | grep -q .; then
    CID=$(docker ps -q | head -1)
    echo "  contêiner: ${CID}"
    echo

    echo "  ── os campos de segurança ──"
    docker inspect "$CID" 2>/dev/null | jq -r '
      "  Privileged     : \(.[0].HostConfig.Privileged)",
      "  CapAdd         : \(.[0].HostConfig.CapAdd // [] | join(", "))",
      "  CapDrop        : \(.[0].HostConfig.CapDrop // [] | join(", "))",
      "  SecurityOpt    : \(.[0].HostConfig.SecurityOpt // [] | join(", "))",
      "  NetworkMode    : \(.[0].HostConfig.NetworkMode)",
      "  PidMode        : \(.[0].HostConfig.PidMode)",
      "  IpcMode        : \(.[0].HostConfig.IpcMode)",
      "  ReadonlyRootfs : \(.[0].HostConfig.ReadonlyRootfs)",
      "  UsernsMode     : \(.[0].HostConfig.UsernsMode)",
      "  Binds          : \(.[0].HostConfig.Binds // [] | join(", "))"
    '
    echo
    echo "  ── análise ──"
    docker inspect "$CID" 2>/dev/null | jq -r '.[0].HostConfig' | \
        grep -q '"Privileged": true' && echo "    ⚠⚠ PRIVILEGED — é o host"
    docker inspect "$CID" 2>/dev/null | grep -q 'docker.sock' && echo "    ⚠⚠ SOCKET MONTADO — é o host"
    docker inspect "$CID" 2>/dev/null | jq -r '.[0].HostConfig.CapAdd // [] | .[]' | \
        grep -qE 'SYS_ADMIN|ALL' && echo "    ⚠ CAP_SYS_ADMIN — é o host"
    docker inspect "$CID" 2>/dev/null | jq -r '.[0].HostConfig.SecurityOpt // [] | .[]' | \
        grep -q 'seccomp=unconfined' && echo "    ⚠ SECCOMP DESLIGADO"
    docker inspect "$CID" 2>/dev/null | jq -r '.[0].HostConfig.PidMode' | \
        grep -q host && echo "    ⚠ PID DO HOST"
    docker inspect "$CID" 2>/dev/null | jq -r '.[0].HostConfig.NetworkMode' | \
        grep -q host && echo "    ⚠ REDE DO HOST"
else
    echo "  (nenhum contêiner rodando — a análise fica como método)"
fi
```

⚠ **A seção "análise" é o coração do módulo.** Ela traduz **parâmetro** em **consequência** — que
é o que o relatório precisa. "Tem `cap_add: SYS_ADMIN`" não diz nada ao cliente; **"é equivalente a
`root` no host, por este caminho"** diz.

### As quatro configurações que anulam o isolamento

⚠ **O resumo do módulo, em uma tabela:**

| Configuração | Por que anula tudo |
|---|---|
| **`privileged: true`** | Todas as capability, todos os dispositivos, sem seccomp, sem LSM |
| **`/var/run/docker.sock` montado** | Quem controla o socket **cria contêiner privilegiado** |
| **`cap_add: [SYS_ADMIN]`** | Montagem, namespace, LSM — **`root` na prática** |
| **`pid: host` + `network: host`** | Vê e alcança tudo do host, sem namespace nenhum |

⚠ **E há a quinta, mais sutil:** `userns` desabilitado **com** `security_opt` vazio. O contêiner
tem os namespaces normais, mas o processo roda como **`root` de verdade** — e `root` no namespace é
`root` no host, **exceto** pelas capability que o teto limita.

⚠ **A regra, escrita:**

> **Contêiner com `privileged: true`, com socket montado, ou com `cap_sys_admin` **é o host** —
> não importa o que a configuração diga sobre namespaces.**

**Produza `container.md`:**

| Parâmetro | Valor | Seguro? | Consequência |
|---|---|---|---|
| `Privileged` | | | |
| `CapAdd` | | | |
| `SecurityOpt` | | | |
| `NetworkMode` | | | |
| `PidMode` | | | |
| `ReadonlyRootfs` | | | |
| `Binds` | | | |

**Responda:**

1. **Quantos dos parâmetros estão no valor seguro?**
2. Alguma das **quatro configurações que anulam** está presente?
3. **Por que socket do Docker montado é `root`?**
4. Se `ReadonlyRootfs` é `false`, o que isso permite?

---

## 6.6 LAB — Auditoria de isolamento

**Duração:** 120 min

### Passo 1 — Ver os oito namespace na prática (35 min)

```bash
cd ~/lab/mod06

cat > ve-namespaces.sh <<'SCRIPT'
#!/usr/bin/env bash
# ve-namespaces.sh — demonstra cada namespace sem contêiner
set -uo pipefail

echo "═══════════ NAMESPACE SEM CONTÊINER ═══════════"
echo

echo "── 0. o estado atual ──"
for ns in mnt pid net ipc uts user cgroup time; do
    printf '  %-8s %s\n' "$ns" "$(readlink /proc/self/ns/$ns 2>/dev/null || echo —)"
done
echo

echo "── 1. UTS: hostname ──"
echo "  fora: $(hostname)"
sudo unshare --uts --fork sh -c 'hostname ns-uts; echo "  dentro: $(hostname)"'
echo "  fora de novo: $(hostname)"
echo

echo "── 2. PID: processos ──"
echo "  fora: $(ls /proc | grep -c '^[0-9]') processos visíveis"
sudo unshare --pid --fork --mount-proc sh -c '
    echo "  dentro: $(ls /proc | grep -c "^[0-9]") processo(s)"
    echo "  meu PID dentro: $$"
'
echo

echo "── 3. MNT: montagem ──"
sudo unshare --mount --fork sh -c '
    mount -t tmpfs tmpfs /mnt 2>/dev/null && echo "  dentro: /mnt montado como tmpfs"
'
echo "  fora: $(findmnt -n -o FSTYPE /mnt 2>/dev/null || echo 'não montado')"
echo

echo "── 4. NET: interface ──"
echo "  fora: $(ip -o link show 2>/dev/null | wc -l) interface(s)"
sudo unshare --net --fork sh -c '
    echo "  dentro: $(ip -o link show 2>/dev/null | wc -l) interface(s) — só loopback, sem IP"
'
echo

echo "── 5. IPC: memória compartilhada ──"
sudo unshare --ipc --fork sh -c '
    echo "  dentro: $(ipcs -m 2>/dev/null | grep -c "^0x" || echo 0) segmento(s) de shm"
'
echo "  fora: $(ipcs -m 2>/dev/null | grep -c "^0x" || echo 0) segmento(s)"
echo

echo "── 6. USER: identidade (o único que muda privilégio) ──"
echo "  fora: uid=$(id -u)"
sudo unshare --user --map-root-user --fork sh -c '
    echo "  dentro: uid=$(id -u)  → parece root"
    echo "  mas o kernel sabe: $(awk "/^Uid:/ {print \$2}" /proc/self/status) (uid real)"
    if head -1 /etc/shadow >/dev/null 2>&1; then
        echo "  ⚠ CONSEGUI ler /etc/shadow"
    else
        echo "  ✓ NÃO consegui ler /etc/shadow — o privilégio é ilusório fora do ns"
    fi
'
echo

echo "── 7. CGROUP: visão da hierarquia ──"
echo "  fora: $(awk -F: '{print $3}' /proc/self/cgroup | head -1)"
sudo unshare --cgroup --fork sh -c '
    echo "  dentro: $(awk -F: "{print \$3}" /proc/self/cgroup | head -1)"
' 2>/dev/null || echo "  (requer privilégio)"
echo

echo "── 8. TIME: relógio ──"
sudo unshare --time --fork sh -c 'echo "  dentro: time namespace criado"' 2>/dev/null || \
    echo "  (time namespace requer kernel 5.6+)"
SCRIPT

chmod +x ve-namespaces.sh
sudo ./ve-namespaces.sh 2>&1 | tee namespaces-saida.txt
```

Produza `oito-ns.md`:

| # | Namespace | O que ficou isolado | O que **não** ficou |
|---|---|---|---|
| 1 | `uts` | | |
| 2 | `pid` | | |
| 3 | `mnt` | | |
| 4 | `net` | | |
| 5 | `ipc` | | |
| **6** | **`user`** | | |
| 7 | `cgroup` | | |
| 8 | `time` | | |

**Responda:**

1. **Qual experimento mostrou diferença mais visível?**
2. No `user` namespace, você leu `/etc/shadow`? **Explique o resultado.**
3. No `net`, quantas interfaces havia? **Por que não há conectividade?**
4. **Montar um contêiner é fazer quais destes oito?** Liste.

⚠ **A resposta 4 é a síntese.** Um contêiner faz: `uts` + `pid` + `mnt` + `net` + `ipc` + `cgroup`
+ (às vezes) `user` — **mais** `cgroup` de limite, **mais** `seccomp`, **mais** capability, **mais**
LSM. **Os namespaces são metade.**

### Passo 2 — Semelhança entre `unshare` e contêiner (35 min)

```bash
cd ~/lab/mod06

echo "═══ construindo um contêiner com unshare + chroot ═══"
echo "  ⚠ o contêiner é só isto — e mais configuração"
echo

cat > mini-container.sh <<'SCRIPT'
#!/usr/bin/env bash
# mini-container.sh — o esqueleto de um contêiner, com unshare
# ⚠ NA SUA VM. É para VER o mecanismo, não para escapar de nada.
set -uo pipefail

RAIZ="${1:-/tmp/mini-rootfs}"

echo "── 1. preparando um rootfs mínimo ──"
if [ ! -d "$RAIZ" ]; then
    mkdir -p "$RAIZ"/{bin,lib,lib64,proc,sys,dev,tmp}
    # copia o mínimo para um shell funcionar
    for b in sh ls cat echo mount id; do
        p=$(command -v "$b" 2>/dev/null) || continue
        cp "$p" "$RAIZ/bin/" 2>/dev/null
    done
    # bibliotecas
    for lib in $(ldd "$RAIZ/bin/sh" 2>/dev/null | grep -oE '/lib[^ ]*' | sort -u); do
        d="$RAIZ$(dirname "$lib")"
        mkdir -p "$d" && cp "$lib" "$d/" 2>/dev/null
    done
    echo "  rootfs em ${RAIZ}: $(du -sh "$RAIZ" 2>/dev/null | cut -f1)"
fi

echo
echo "── 2. entrando: namespaces + chroot ──"
echo "     (uts, pid, mnt, ipc, user) + chroot"
echo

sudo unshare --uts --pid --mount --ipc --user --map-root-user --fork --mount-proc \
    sh -c "
        hostname mini-container
        chroot '$RAIZ' /bin/sh -c '
            echo \"    hostname : \$(hostname 2>/dev/null || echo desconhecido)\"
            echo \"    uid      : \$(id -u)\"
            echo \"    processos: \$(ls /proc | grep -c \"^[0-9]\")\"
            echo \"    raiz     : /\"
            echo
            echo \"    ⚠ isto É um contêiner: namespaces + chroot\"
            echo \"    ⚠ e NÃO tem: seccomp, cgroup limit, LSM configurado\"
        '
    " 2>&1

echo
echo "── 3. o que um contêiner ACRESCENTA ──"
cat <<'EXPL'
    Namespaces          ✓ o unshare acima já fez
    chroot/pivot_root   ✓ já fizemos
  ─────────────────────────────────────────────
    cgroup limit        ✗ não temos limite de memória/CPU/PID
    seccomp             ✗ o processo pode chamar qualquer syscall
    capability bound    ✗ todas as capabilities no teto
    LSM (SELinux/AA)    ✗ nenhum perfil
    read-only rootfs    ✗ pode escrever
    user namespace real ✗ mapeamos root, mas sem userns habilitado no host
    veth + bridge       ✗ sem rede, sem NAT

  ⚠ é por isso que "contêiner" não é uma palavra só:
     é um PACOTE de configurações, e cada uma é escolha.
EXPL
SCRIPT

chmod +x mini-container.sh
sudo ./mini-container.sh 2>&1 | head -40
```

⚠ **Esta é a demonstração que muda a percepção.** Depois de montar um "contêiner" com `unshare` em
quinze linhas, fica claro **o que o Docker acrescenta** — e o que ele **não acrescenta** por padrão.

⚠ **E a seção 3 é o resumo:** das **oito** peças do isolamento, o `unshare` faz as duas primeiras.
**As outras seis são configuração** — e é aí que a auditoria trabalha.

**Produza `mini-container.md`:**

| Peça do isolamento | O `unshare` fez? | O Docker faz por padrão? |
|---|---|---|
| Namespaces | | |
| `chroot`/`pivot_root` | | |
| Limite de `cgroup` | | |
| `seccomp` | | |
| Limite de capability | | |
| LSM | | |
| Rootfs somente-leitura | | |
| `user` namespace real | | |

**Responda:**

1. O "contêiner" funcionou? **O que você viu de dentro?**
2. **Quais das oito peças o `unshare` sozinho fez?**
3. Quais o Docker faz **por padrão**, e quais **não**?
4. **Por que "contêiner" não é uma palavra só?**

### Passo 3 — Checklist de auditoria de contêiner (50 min)

Produza `checklist-container.md` — o instrumento que você passará a usar:

```markdown
# Checklist — auditoria de contêiner

## 1. Anulação total — se QUALQUER um for verdadeiro, é host
- [ ] `privileged: true`
- [ ] `/var/run/docker.sock` montado
- [ ] `/var/run/containerd/containerd.sock` montado
- [ ] `cap_add: [SYS_ADMIN]` ou `cap_add: [ALL]`
- [ ] `pid: host` **e** `network: host` **e** `ipc: host`

## 2. Namespace
- [ ] `pid` próprio
- [ ] `network` próprio (ou bridge dedicada)
- [ ] `ipc` próprio
- [ ] `uts` próprio
- [ ] `mnt` próprio
- [ ] `userns` habilitado (rootless sempre)

## 3. Capability
- [ ] `cap_drop: [ALL]` declarado
- [ ] Só as capabilities necessárias em `cap_add`
- [ ] Nenhuma das que equivalem a root

## 4. Filtro
- [ ] `seccomp` no padrão (não `unconfined`)
- [ ] `apparmor`/`selinux` ativo (não `unconfined`)
- [ ] `no-new-privileges: true`

## 5. Sistema de arquivos
- [ ] `read_only: true` quando possível
- [ ] `tmpfs` para o que precisa escrever
- [ ] Nenhum bind de `/`, `/etc`, `/var/run`, `/proc`, `/sys`
- [ ] Nenhum bind de dado sensível do host

## 6. Recurso
- [ ] `memory` limitado
- [ ] `cpus` limitado
- [ ] `pids_limit` definido
- [ ] `ulimits` definidos

## 7. Imagem
- [ ] Não é `:latest` (tag fixa)
- [ ] Roda como usuário não-root (`USER`)
- [ ] Sem `setuid` desnecessário
- [ ] Base atualizada

## 8. Rede
- [ ] Sem `network: host`
- [ ] Porta exposta é só a necessária
- [ ] Nenhuma interface do host exposta
```

**Aplique o checklist:** se houver contêiner rodando na VM, preencha. Se não, **construa um** com
`docker run` ou `podman run` e **compare duas configurações**:

```bash
echo "═══ comparando duas configurações ═══"
cat <<'EXPL'
  ── RUIM ──
    docker run -d --privileged \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v /:/host \
      nginx

    Análise:
      privileged        ⚠⚠ é o host
      socket montado    ⚠⚠ é o host
      / montado         ⚠⚠ vê e escreve tudo do host
      → o checklist item 1 dispara TRÊS vezes

  ── BOA ──
    docker run -d \
      --cap-drop=ALL \
      --cap-add=NET_BIND_SERVICE \
      --security-opt=no-new-privileges \
      --security-opt=seccomp=default \
      --read-only \
      --tmpfs /var/cache/nginx \
      --memory=256m --cpus=0.5 --pids-limit=100 \
      --user 101:101 \
      nginx

    Análise:
      capability        ✓ só o necessário
      no-new-privileges ✓
      seccomp           ✓ padrão
      read-only         ✓
      limite            ✓ memória, cpu, pid
      usuário           ✓ não-root
      → passa em quase todo o checklist
EXPL
```

⚠ **As duas configurações são o entregável.** A comparação **mostra** a diferença — e é a forma
mais direta de comunicar o achado a quem opera contêiner.

**Responda:**

1. **Quantos itens do checklist o contêiner (ou o exemplo) passa?**
2. Qual item do **bloco 1** disparou?
3. **Qual a diferença de risco** entre as duas configurações?
4. **Se você tivesse que escolher UM item** para corrigir primeiro, qual seria?

⚠ **A resposta 4 é a priorização.** O item 1 do bloco 1 (`privileged`) é sempre o primeiro —
porque **anula todo o resto**. Corrigi-lo é uma linha no `docker run`.

### Critérios de aceitação

- `ve-namespaces.sh` rodando, com os **oito** namespaces demonstrados.
- `namespaces.md` com a comparação de inode entre o shell e o PID 1.
- Você demonstrou o `user` namespace e **explicou por que `/etc/shadow` falha**.
- `nsenter.md` com a comparação de namespace de dois processos.
- `cgroup.md` com a versão, os controladores e os limites do seu `cgroup`.
- Você explicou por que o controlador `devices` tem valor de segurança.
- `mini-container.sh` rodando — **você construiu um contêiner** com `unshare` + `chroot`.
- `mini-container.md` com as **oito** peças e quem faz cada uma.
- `checklist-container.md` completo, com os **oito blocos**.
- Você comparou **duas configurações** de contêiner (ruim vs. boa).
- Você identificou **as quatro configurações que anulam** o isolamento.
- Você explicou **por que `privileged: true` é host**.
- ⚠ **Nenhuma tentativa de escapar** de contêiner de terceiro. Tudo na VM.

---

## Avaliação

1. Cite os oito namespace e o que cada um isola. Qual a ordem histórica?
2. **Por que só o `user` namespace muda privilégio?**
3. Por que `pid` + `mnt` + `net` isolam **o que o processo vê**, não **o que ele pode**?
4. **Como você audita isolamento?** Cite a técnica do inode.
5. O que `unshare` faz que o Docker também faz? O que ele **não** faz?
6. **No `user` namespace, por que ler `/etc/shadow` falha?**
7. Por que o namespace de `net` sozinho dá **nenhuma** conectividade?
8. O que `nsenter` faz, e que privilégio ele exige?
9. **Diferencie diagnóstico de intrusão** ao usar `nsenter`.
10. Qual a diferença entre `cgroup` v1 e v2?
11. Cite seis controladores de `cgroup` e o que cada um limita.
12. **Por que o controlador `devices` tem valor de segurança?**
13. Por que `pids.max` é o limite mais barato e útil?
14. **Cite as quatro configurações que anulam o isolamento de um contêiner.**
15. **Por que socket do Docker montado é `root`?** Descreva o caminho.
16. Por que `cap_sys_admin` num contêiner é igual a `privileged: true`?
17. O que `no-new-privileges` previne?
18. **Por que `read_only: true` importa?** O que ele impede?
19. **Por que "contêiner" não é uma palavra só?** Cite as oito peças do isolamento.
20. Se você pudesse corrigir **um** parâmetro, qual seria? Por quê?

---

**Próximo:** [Módulo 7 — Arquivo, `inode` e o que fica para trás](modulo-07.md)
