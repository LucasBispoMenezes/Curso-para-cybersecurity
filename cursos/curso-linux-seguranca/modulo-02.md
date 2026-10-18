# Módulo 2 — `/proc` e `/sys`: O Sistema ao Vivo

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Ler `/proc` como **fonte de verdade** sobre processo, memória e recurso.
2. Distinguir `/proc/<pid>/status` de `maps` de `fd` — e o que cada um responde.
3. Ler a memória de um processo **seu** por `/proc/<pid>/maps` e `/proc/<pid>/mem`.
4. Entender o que `/sys` expõe, e por que ele é interface do kernel.
5. Reconhecer o que um processo revela sem `strace`.

---

## ⚠ Antes de começar

⚠ **`/proc` não é um sistema de arquivos de verdade.** Não há arquivo em disco — é **interface
direta do kernel**, gerada quando você lê.

| Você pensa que é | Na verdade é |
|---|---|
| Um arquivo com dado | Uma função do kernel que escreve no `read()` |
| Estático | **Muda a cada leitura** |
| Tamanho real | Sempre `0` — o tamanho só se sabe lendo |

⚠ **A consequência prática:** `ls -la /proc/<pid>/maps` mostra tamanho `0`. **Você não pode
copiar, nem comparar hash.** E `cat` duas vezes pode dar resultado diferente.

⚠ **E a regra do módulo:** você lê `/proc` de **processo seu**. Ler a memória de processo de outro
usuário é outra coisa — e só é legítimo com autorização **e** privilégio. O laboratório é a sua VM.

---

## 2.1 `/proc` — o diretório raiz

```bash
mkdir -p ~/lab/mod02 && cd ~/lab/mod02

echo "═══ os arquivos globais ═══"
for f in cmdline cpuinfo meminfo version uptime loadavg filesystems mounts \
         modules partitions swaps devices interrupts self; do
    if [ -e "/proc/$f" ]; then
        printf '  %-16s %s\n' "$f" "$(head -c 60 "/proc/$f" 2>/dev/null | tr '\n' ' ')"
    fi
done

echo
echo "═══ o que cada um responde ═══"
echo "  cmdline    → parâmetros do kernel (módulo 1)"
echo "  modules    → módulos carregados  ← superfície de kernel"
echo "  mounts     → o que está montado  ← superfície de arquivo"
echo "  self       → atalho para o SEU pid"
echo "  sys/kernel → o que o kernel expõe de si"
```

⚠ **`/proc/modules` é superfície de kernel.** Cada módulo carregado é código executando com
privilégio máximo. Um módulo que não deveria estar lá é achado — e o módulo 10 trata disso.

⚠ **E `/proc/self` é o atalho que você vai usar o curso inteiro.** `self` é sempre o processo que
está lendo. **É assim que um programa se inspeciona.**

```bash
echo "═══ o básico de /proc ═══"
echo "meu pid      : $$"
echo "/proc/self   → $(readlink /proc/self)"
echo "meu exe      : $(readlink /proc/self/exe)"
echo "meu cwd      : $(readlink /proc/self/cwd)"
echo "meu root     : $(readlink /proc/self/root)"
echo

echo "═══ módulos carregados (superfície de kernel) ═══"
wc -l < /proc/modules | xargs echo "  total:"
head -8 /proc/modules | awk '{printf "  %-24s %8s bytes  usados por %s\n", $1, $2, $3}'
```

**Produza `proc-raiz.md`:**

| Arquivo | O que contém | Por que importa para segurança |
|---|---|---|
| `cmdline` | | |
| `modules` | | |
| `mounts` | | |
| `meminfo` | | |
| `sys/kernel/` | | |

**Responda:**

1. **Quantos módulos carregados?** Algum você não reconhece?
2. O `cmdline` traz algo suspeito?
3. **O que `readlink /proc/self/exe` devolve?** E `cwd`?
4. Por que `/proc` **não** é um sistema de arquivos normal?

---

## 2.2 `/proc/<pid>/status` — identidade do processo

⚠ **É o arquivo mais informativo sobre um processo.** Ele traz credencial, memória, `capability` e
estado, tudo junto.

```bash
echo "═══ status do processo atual ═══"
cat /proc/self/status | head -40
```

### Os campos que importam para segurança

| Campo | O que diz | Por que importa |
|---|---|---|
| **`Uid`** | real, **efetivo**, salvo, fs | ⚠ **`efetivo` é quem manda** |
| **`Gid`** | idem para grupo | |
| **`CapInh/`Prm`/`Eff`/`Bnd`** | conjunto de capability | **O que substitui `root`** |
| `NoNewPrivs` | impede ganhar privilégio | Defesa contra `setuid` |
| `Seccomp` | filtro de syscall ativo | Isolamento |
| **`VmRSS`** | memória residente | |
| `Threads` | quantas threads | |
| **`NSpid`** | **PID no namespace** | ⚠ Módulo 6 |
| `TracerPid` | quem está depurando | ⚠ Detecção |
| **`Seccomp_filters`** | filtros carregados | |

```bash
echo "═══ credencial e capability ═══"
grep -E '^(Uid|Gid|Groups|Cap(Inh|Prm|Eff|Bnd|Amb)|NoNewPrivs|Seccomp|Seccomp_filters)' /proc/self/status

echo
echo "═══ explicando o Uid ═══"
awk '/^Uid:/ {printf "  real=%s  EFETIVO=%s  salvo=%s  fs=%s\n", $2, $3, $4, $5}' /proc/self/status

echo
echo "═══ namespace do processo ═══"
grep -E '^(NSpid|NStgid)' /proc/self/status

echo
echo "═══ quem me depura? ═══"
grep TracerPid /proc/self/status
```

⚠ **A linha `Uid` tem quatro números, e a diferença entre eles é o coração do modelo de privilégio**:

```
real    → quem você é (o que o login criou)
EFETIVO → quem o kernel usa para decidir permissão   ← ⚠ ESTE
salvo   → para onde o efetivo pode voltar
fs      → usado em acesso a arquivo
```

⚠ **Um binário `setuid` tem `real` = usuário comum e `efetivo` = `root`.** **É exatamente isso que
o torna perigoso** — e é o que o módulo 3 vai explorar.

⚠ **E a linha `CapEff` é um bitmap hexadecimal.** Ela lista o que o processo pode fazer *sem ser
root*: `cap_sys_admin`, `cap_net_raw`, `cap_dac_override`. **É privilégio sem `root` — e é mais
difícil de auditar**, porque não aparece no `ls`.

```bash
echo "═══ decode da CapEff do processo atual ═══"
cap=$(awk '/^CapEff:/ {print $2}' /proc/self/status)
echo "  CapEff = ${cap}"

capsh --decode="$cap" 2>/dev/null || python3 - "$cap" <<'PY'
import sys
CAPS = {
    0:"chown",1:"dac_override",2:"dac_read_search",3:"fowner",4:"fsetid",
    5:"kill",6:"setgid",7:"setuid",8:"setpcap",9:"linux_immutable",
    10:"net_bind_service",11:"net_broadcast",12:"net_admin",13:"net_raw",
    14:"ipc_lock",15:"ipc_owner",16:"sys_module",17:"sys_rawio",
    18:"sys_chroot",19:"sys_ptrace",20:"sys_pacct",21:"sys_admin",
    22:"sys_boot",23:"sys_nice",24:"sys_resource",25:"sys_time",
    26:"sys_tty_config",27:"mknod",28:"lease",29:"audit_write",
    30:"audit_control",31:"setfcap",32:"mac_override",33:"mac_admin",
    34:"syslog",35:"wake_alarm",36:"block_suspend",37:"audit_read",
    38:"perfmon",39:"bpf",40:"checkpoint_restore",
}
v = int(sys.argv[1], 16)
ativas = [CAPS.get(i, f"cap{i}") for i in range(64) if v >> i & 1]
print("  ativas:", ", ".join(ativas) if ativas else "(nenhuma)")
PY
```

⚠ **Note onde `sys_admin`, `sys_module` e `sys_ptrace` aparecem.** Se um serviço comum tem
`cap_sys_admin`, ele pode montar sistema de arquivos — **e isso é privilégio de `root` por outro
nome**.

**Produza `status.md`:**

| Campo | Valor (processo atual) | O que significa |
|---|---|---|
| `Uid` (real/efetivo/salvo/fs) | | |
| `CapEff` | | |
| `NoNewPrivs` | | |
| `Seccomp` | | |
| `TracerPid` | | |
| `NSpid` | | |

**Responda:**

1. **Qual é o seu `Uid` efetivo?** É igual ao real?
2. Quais capability estão ativas? Alguma é perigosa?
3. O `NoNewPrivs` está em `1` ou `0`?
4. **Por que o `Uid` efetivo é o que o kernel usa**, e não o real?

⚠ **A resposta 4 é o modelo inteiro.** O kernel verifica permissão com o **efetivo** — por isso um
`setuid` funciona. E é por isso que **anular o efetivo** (voltando para o real) é a defesa.

---

## 2.3 `/proc/<pid>/maps` — o mapa de memória

⚠ **Este é o arquivo que o curso de C também usou. Aqui você aprende a lê-lo como auditor.**

```bash
echo "═══ mapa de memória do shell atual ═══"
cat /proc/self/maps | head -20

echo
echo "═══ contagem por permissão ═══"
awk '{print $2}' /proc/self/maps | sort | uniq -c | sort -rn

echo
echo "═══ regiões GRAVÁVEIS e EXECUTÁVEIS (o achado crítico) ═══"
awk '$2 ~ /w/ && $2 ~ /x/ {print "  ⚠⚠ " $0}' /proc/self/maps
echo "  (vazio é o esperado — se aparecer, é achado)"
```

### A estrutura de uma linha

```
7f8a2c000000-7f8a2c021000 r-xp 00000000 08:01 1234567  /usr/lib/libc.so.6
│                          │    │        │     │        │
│                          │    │        │     │        └─ nome do arquivo
│                          │    │        │     └─ inode  ← ⚠ chave do módulo 7
│                          │    │        └─ device
│                          │    └─ offset no arquivo
│                          └─ PERMISSÃO (rwxp)
└─ intervalo de endereço
```

| Flag | Significado |
|---|---|
| `r` | leitura |
| `w` | **escrita** |
| `x` | **execução** |
| `p` | privado (copy-on-write) |
| `s` | **compartilhado** |

⚠ **A combinação `w` + `x` é o achado mais grave possível.** Uma região **gravável e executável**
significa que se alguém escreve ali, o processador **executa**. É o requisito de qualquer exploit
de corrupção de memória — e é o que o curso de fuzzing (módulo 8) explora.

⚠ **E `fs.protected_*` do módulo 1 não cobre isso** — é proteção de arquivo, não de memória. A
proteção de memória é `W^X` (write XOR execute), e vem de `PaX`/`grsecurity`, ou do próprio código.

```bash
echo "═══ o mesmo mapa, mas de um processo com mais bibliotecas ═══"
# rode algo em background
sleep 300 &
BG=$!
sleep 0.3

echo "  pid: ${BG}"
echo
echo "  regiões:"
cat "/proc/${BG}/maps" 2>/dev/null | awk '{
    split($1, a, "-");
    size = strtonum("0x" a[2]) - strtonum("0x" a[1]);
    printf "    %-8s %10d bytes  %s\n", $2, size, ($6 ? $6 : "[anon]");
}' 2>/dev/null | head -20

echo
echo "  W+X: $(awk '$2 ~ /w/ && $2 ~ /x/' /proc/${BG}/maps 2>/dev/null | wc -l)"

kill $BG 2>/dev/null
```

⚠ **Note as entradas `[anon]`.** São memória **sem arquivo por trás** — alocada por `mmap` anônimo.
É onde vive o dado dinâmico, e onde um exploit de heap trabalha. **`[stack]`, `[heap]`, `[vdso]`,
`[vvar]` são as regiões especiais.**

**Produza `maps.md`:**

| Região | Permissão | Tamanho | Arquivo |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantas regiões `r-xp`?** (É código — deve ser só leitura e execução.)
2. Existe alguma região `w` + `x`? **Se sim, é achado crítico.** Explique por quê.
3. Qual a diferença entre `[heap]` e `[stack]`?
4. O que significa `[vdso]`? Por que ele é `r-xp`?

---

## 2.4 `/proc/<pid>/fd` e `exe` — o que o processo segura

⚠ **`fd` é onde os arquivos abertos aparecem — inclusive os que ninguém sabe que estão abertos.**

```bash
sleep 300 &
BG=$!
sleep 0.3

echo "═══ descritores de arquivo do processo ${BG} ═══"
ls -la "/proc/${BG}/fd" 2>/dev/null

echo
echo "═══ resolvido ═══"
for fd in /proc/${BG}/fd/*; do
    printf '  %-8s → %s\n' "$(basename "$fd")" "$(readlink "$fd" 2>/dev/null)"
done

echo
echo "═══ o que o processo executa ═══"
readlink "/proc/${BG}/exe"
readlink "/proc/${BG}/cwd"
readlink "/proc/${BG}/root"

kill $BG 2>/dev/null
```

⚠ **A linha de `fd` é onde aparece o achado clássico do módulo 7:** um processo que mantém um
arquivo aberto **depois de ele ser removido do disco**. O `fd` continua apontando, e o dado
continua acessível — **`/proc/<pid>/fd/N` entrega o conteúdo**, mesmo com o arquivo apagado.

```bash
echo "═══ demonstrando: arquivo removido mas ainda acessível ═══"
echo "segredo do processo" > /tmp/segredo.txt
exec 9< /tmp/segredo.txt          # abre no fd 9
rm /tmp/segredo.txt                # remove do disco

echo "  arquivo existe no disco? $([ -e /tmp/segredo.txt ] && echo sim || echo não)"
echo "  mas o fd 9 ainda aponta: $(readlink /proc/self/fd/9 2>/dev/null)"
echo "  e o conteúdo é: $(cat <&9 2>/dev/null)"

exec 9<&-                          # fecha
```

⚠ **É o `/proc` que entrega isso.** O arquivo foi apagado, o espaço ainda está alocado, e o
descritor aberto é o caminho. **É o mecanismo que o módulo 7 formaliza** — e no curso de malware,
é como um processo mantém a configuração carregada sem arquivo em disco.

⚠ **E a linha `cwd` é achado quando o serviço tem `cwd` em diretório gravável.** Se o `cwd` é
`/tmp` ou um diretório que outro usuário escreve, **caminho relativo no processo vira vetor** — é a
classe 6 (caminho não confiável).

**Produza `fd.md`:**

| `fd` | Aponta para | Tipo | Risco |
|---|---|---|---|
| 0 | | | |
| 1 | | | |
| 2 | | | |
| ... | | | |

**Responda:**

1. **Quantos `fd` o processo tem abertos?**
2. Algum aponta para **arquivo que não existe mais**?
3. O `cwd` está em diretório gravável?
4. **Por que `/proc/<pid>/fd/N` entrega conteúdo de arquivo removido?**

---

## 2.5 `/proc/<pid>/mem` — ler a memória, e o que isso exige

⚠ **`/proc/<pid>/mem` é o **arquivo** que dá acesso à memória. E ele é o que separa diagnóstico de
invasão.**

```bash
echo "═══ lendo a própria memória via /proc/self/mem ═══"
python3 - <<'PY'
import os, re

pid = os.getpid()
segredo = b"TOKEN-DE-TESTE-12345678"     # dado que queremos localizar
print(f"  pid: {pid}")
print(f"  segredo está no endereço: 0x{id(segredo):016x}")
print()

# Lê o mapa para achar as regiões legíveis do próprio processo
with open(f"/proc/{pid}/maps") as f:
    regioes = []
    for linha in f:
        m = re.match(r"([0-9a-f]+)-([0-9a-f]+)\s+(\S+)\s+\S+\s+\S+\s+\S+\s*(.*)", linha)
        if not m:
            continue
        ini, fim, perm, nome = int(m.group(1),16), int(m.group(2),16), m.group(3), m.group(7)
        if "r" in perm:
            regioes.append((ini, fim, perm, nome))

print(f"  regiões legíveis: {len(regioes)}")
print()

# Procura o segredo na própria memória
alvo = segredo
achados = 0
with open(f"/proc/{pid}/mem", "rb", 0) as mem:
    for ini, fim, perm, nome in regioes:
        if fim - ini > 64*1024*1024:
            continue                      # pula regiões enormes
        try:
            mem.seek(ini)
            dados = mem.read(fim - ini)
        except (OSError, ValueError):
            continue
        pos = dados.find(alvo)
        if pos >= 0:
            achados += 1
            print(f"  ⚠ achado em 0x{ini+pos:016x}  [{perm}] {nome or '[anon]'}")
            if achados >= 5:
                break

print()
print(f"  ocorrências: {achados}")
print()
print("  ⚠ isto é a PRÓPRIA memória. Ler de outro processo exige:")
print("     permissão (mesmo uid, ou CAP_SYS_PTRACE), e yama/ptrace_scope")
PY
```

⚠ **Note as duas condições que o script imprime no fim.** Ler `/proc/<pid>/mem` de **outro**
processo exige:

| Condição | O que é |
|---|---|
| **Mesmo `uid`, ou `CAP_SYS_PTRACE`** | O kernel verifica credencial |
| **`yama/ptrace_scope`** | Política adicional do Yama LSM |

```bash
echo "═══ a política que restringe isso ═══"
sysctl kernel.yama.ptrace_scope 2>/dev/null
echo

cat <<'EXPL'
  0 = clássico: qualquer processo com mesmo uid pode depurar
  1 = restrito: só o ancestral pode depurar o descendente   ← recomendado
  2 = admin only: só com CAP_SYS_PTRACE
  3 = nenhum: nem root
EXPL

echo
echo "═══ e a restrição de dmesg / kptr ═══"
sysctl kernel.dmesg_restrict kernel.kptr_restrict 2>/dev/null
```

⚠ **`ptrace_scope=0` é achado de auditoria.** Ele permite que **qualquer processo do mesmo
usuário** leia a memória de outro — o que significa que um processo comprometido com o seu usuário
**lê a sua credencial**.

⚠ **E é assim que um `ssh-agent` ou um gerenciador de senha vira alvo.** O agente tem a chave
desbloqueada na memória, e `ptrace_scope=0` permite lê-la.

⚠ **A regra do módulo, escrita:**

> **Ler `/proc/<pid>/mem` do seu processo é diagnóstico. De outro processo, é depuração — e exige
> que a permissão esteja lá.** O curso mostra o mecanismo; usar fora de laboratório é outra coisa.

**Produza `mem.md`:**

| Item | Valor |
|---|---|
| Regiões legíveis | |
| Ocorrências do segredo | |
| `ptrace_scope` | |
| `dmesg_restrict` | |
| `kptr_restrict` | |

**Responda:**

1. Você achou o segredo? **Em quantas regiões?**
2. Qual o `ptrace_scope` do seu sistema? **Está no valor recomendado?**
3. Por que `ptrace_scope=0` é achado, e não só um detalhe?
4. **Por que ler a memória de outro processo exige permissão?**

---

## 2.6 `/sys` — a interface de kernel

⚠ **`/sys` é o irmão moderno de `/proc`.** Ele expõe o **modelo de dispositivos** do kernel — e,
com ele, **parâmetros de segurança que você pode ler e às vezes escrever**.

```bash
echo "═══ estrutura de /sys ═══"
ls /sys/ | head -20

echo
echo "═══ /sys/kernel — parâmetros do kernel ═══"
ls /sys/kernel/ | head -20

echo
echo "═══ o que importa para segurança ═══"
for f in /sys/kernel/security/lockdown \
         /sys/kernel/security/lsm \
         /sys/kernel/kexec_loaded \
         /sys/kernel/kexec_crash_loaded \
         /sys/kernel/uevent_helper; do
    printf '  %-42s %s\n' "$f" "$(cat "$f" 2>/dev/null || echo '—')"
done
```

### Os parâmetros de `/sys/kernel` que importam

| Caminho | O que revela | Valor de risco |
|---|---|---|
| `/sys/kernel/security/lsm` | **Quais LSM estão ativos** | Vazio = sem SELinux/AppArmor |
| `/sys/kernel/security/lockdown` | Estado do lockdown | `none` = kernel alterável |
| `/sys/kernel/kexec_loaded` | Há kernel alternativo carregado | `1` = suspeito |
| `/sys/kernel/uevent_helper` | **Programa executado em evento** | ⚠ **Se não vazio, é achado** |
| `/sys/kernel/core_pattern` | Onde `core dump` vai | Caminho não confiável = achado |
| `/sys/kernel/mm/transparent_hugepage/enabled` | THP | Relevante para exploit |

⚠ **`uevent_helper` é o achado mais grave desta seção.** Se ele estiver com um caminho, o kernel
**executa aquele programa** quando um dispositivo aparece — **como `root`**. Se o caminho é
gravável, qualquer usuário executa código como `root`. **É escalação por configuração de kernel.**

⚠ **E `/sys/kernel/core_pattern` é o mesmo padrão.** Se o `core dump` aponta para um caminho **em
diretório gravável**, o processo que quebra grava ali — e se o caminho tem pipe (`|/programa`), o
programa roda como `root`.

```bash
echo "═══ conferindo os dois achados críticos ═══"
echo

uh=$(cat /sys/kernel/uevent_helper 2>/dev/null)
if [ -n "$uh" ]; then
    echo "  ⚠⚠ uevent_helper = ${uh}"
    echo "      → o kernel executa isto como root em evento de dispositivo"
    ls -la "$uh" 2>/dev/null
else
    echo "  ✓ uevent_helper vazio (esperado)"
fi

echo
cp=$(sysctl -n kernel.core_pattern 2>/dev/null)
echo "  core_pattern = ${cp}"
case "$cp" in
    \|*) echo "      ⚠ pipe: executa programa"; ;;
    /*)  d=$(dirname "$cp")
         [ -w "$d" ] && echo "      ⚠ diretório do core é GRAVÁVEL: ${d}" || echo "      ✓ diretório não gravável" ;;
    *)   echo "      ⚠ caminho relativo — depende do cwd do processo" ;;
esac
```

⚠ **Os dois achados desta seção são de configuração de kernel**, não de bug — e é por isso que o
curso insiste: **a maioria da escalação em Linux é configuração.** Corrigir é uma linha:
`sysctl -w kernel.core_pattern=/var/crash/core.%e.%p`.

**Produza `sys.md`:**

| Parâmetro | Valor | Risco | Correção |
|---|---|---|---|
| `security/lsm` | | | |
| `lockdown` | | | |
| `uevent_helper` | | | |
| `core_pattern` | | | |
| `kexec_loaded` | | | |

**Responda:**

1. Quais LSM estão ativos? **Se vazio, o que isso significa?**
2. O `uevent_helper` está vazio? **Se não, é crítico.**
3. O `core_pattern` aponta para diretório gravável?
4. **Por que `uevent_helper` com caminho é escalação?**

⚠ **A resposta 4 é o mecanismo.** O kernel executa o helper **como `root`** quando um dispositivo é
adicionado. Se o caminho é gravável por qualquer usuário, esse usuário controla o que roda como
`root` — **sem bug de kernel, sem exploit, sem CVE.**

---

## 2.7 LAB — Diagnóstico sem `strace`

**Duração:** 150 min

### Passo 1 — Perfil completo de um processo (40 min)

⚠ **Quatro arquivos, quatro perguntas.**

```bash
cd ~/lab/mod02

cat > perfil-processo.sh <<'SCRIPT'
#!/usr/bin/env bash
# perfil-processo.sh — perfil de segurança de um processo, só por /proc
set -uo pipefail

PID="${1:?uso: perfil-processo.sh <pid>}"
P="/proc/${PID}"

[ -d "$P" ] || { echo "processo ${PID} não existe" >&2; exit 2; }

echo "═══════════ PERFIL DO PROCESSO ${PID} ═══════════"
echo

echo "── IDENTIDADE ──"
printf '  exe  : %s\n' "$(readlink "$P/exe" 2>/dev/null)"
printf '  cwd  : %s\n' "$(readlink "$P/cwd" 2>/dev/null)"
printf '  root : %s\n' "$(readlink "$P/root" 2>/dev/null)"
printf '  cmd  : %s\n' "$(tr '\0' ' ' < "$P/cmdline" 2>/dev/null)"
echo

echo "── CREDENCIAL ──"
grep -E '^(Uid|Gid|Groups)' "$P/status" 2>/dev/null | sed 's/^/  /'
echo

echo "── CAPABILITIES ──"
grep -E '^Cap(Eff|Prm|Bnd)' "$P/status" 2>/dev/null | sed 's/^/  /'
eff=$(awk '/^CapEff:/ {print $2}' "$P/status" 2>/dev/null)
command -v capsh >/dev/null && echo "    $(capsh --decode="$eff" 2>/dev/null | head -1)"
echo

echo "── ISOLAMENTO ──"
grep -E '^(NoNewPrivs|Seccomp|Seccomp_filters)' "$P/status" 2>/dev/null | sed 's/^/  /'
echo "  namespace:"
for ns in mnt pid net uts ipc user cgroup; do
    [ -e "$P/ns/$ns" ] && printf '    %-8s %s\n' "$ns" "$(readlink "$P/ns/$ns" 2>/dev/null)"
done
echo

echo "── MEMÓRIA ──"
grep -E '^(VmRSS|VmSize|Threads)' "$P/status" 2>/dev/null | sed 's/^/  /'
echo "  regiões W+X: $(awk '$2 ~ /w/ && $2 ~ /x/' "$P/maps" 2>/dev/null | wc -l)  ⚠ deve ser 0"
echo

echo "── DESCRITORES ──"
for fd in "$P"/fd/*; do
    [ -e "$fd" ] || continue
    t=$(readlink "$fd" 2>/dev/null)
    printf '  %-4s → %s\n' "$(basename "$fd")" "$t"
done | head -20
echo

echo "── MAPAS (topo) ──"
head -12 "$P/maps" 2>/dev/null | sed 's/^/  /'
SCRIPT

chmod +x perfil-processo.sh

# Rode em alguns processos
echo "═══ 1. no shell atual ═══"
./perfil-processo.sh $$ | head -50

echo
echo "═══ 2. em um serviço de sistema ═══"
for pid in $(pgrep -f 'systemd-journald|sshd|NetworkManager' 2>/dev/null | head -1); do
    [ -n "$pid" ] && ./perfil-processo.sh "$pid" | head -35
done
```

Produza `perfil.md`:

| Processo | `Uid` efetivo | `CapEff` | `NoNewPrivs` | `Seccomp` | W+X |
|---|---|---|---|---|---|
| shell | | | | | |
| serviço | | | | | |

**Responda:**

1. **O serviço roda com qual `Uid` efetivo?** É justificável?
2. Quais capability ele tem? **Alguma é desnecessária?**
3. O `NoNewPrivs` está em `1`? Se `0`, o serviço pode ganhar privilégio.
4. Algum dos dois tem região **W+X**?

### Passo 2 — Três experimentos controlados (50 min)

⚠ **Os três experimentos que fazem o módulo valer.**

**Experimento A — `setuid` muda o `Uid` efetivo:**

```bash
echo "═══ A. o efeito do setuid na credencial ═══"
id

# Crie um binário simples
cat > /tmp/meu-id.sh <<'EOF'
#!/bin/sh
echo "  dentro: uid=$(id -u)"
grep '^Uid:' /proc/self/status
EOF
chmod +x /tmp/meu-id.sh

echo "  executando sem setuid:"
/tmp/meu-id.sh

echo
echo "  ⚠ aplicar setuid requer root:"
echo "     sudo chown root:root /tmp/meu-id.sh"
echo "     sudo chmod u+s /tmp/meu-id.sh"
echo "     /tmp/meu-id.sh"
echo "  ⚠ script NÃO ganha setuid — o kernel ignora em shebang."
echo "     É preciso binário compilado. Faça com o curso de C, módulo 10."
```

⚠ **A última linha é um detalhe real e importante:** `setuid` **em script é ignorado** pelo kernel
— proteção contra exatamente o vetor que seria trivial. **Só binário compilado ganha o bit.**

**Experimento B — forçar uma região W+X e ver:**

```bash
echo "═══ B. região gravável e executável ═══"
cat > /tmp/wx.c <<'EOF'
#include <stdio.h>
#include <sys/mman.h>
#include <string.h>

int main(void) {
    /* ⚠ PROT_WRITE | PROT_EXEC: o padrão perigoso */
    void *p = mmap(NULL, 4096, PROT_READ | PROT_WRITE | PROT_EXEC,
                   MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED) { perror("mmap"); return 1; }

    memcpy(p, "\xc3", 1);        /* só um `ret`, para demonstrar */

    printf("região W+X em %p\n", p);
    printf("pid: %d\n", (int)getpid());
    printf("⚠ observe /proc/<pid>/maps\n");
    printf("pressione ENTER para sair...\n");
    getchar();

    munmap(p, 4096);
    return 0;
}
EOF

gcc -Wall -o /tmp/wx /tmp/wx.c 2>/dev/null && {
    echo "  (compile com gcc — disponível)"
    /tmp/wx &
    WXPID=$!
    sleep 0.5
    echo
    echo "  regiões W+X do processo ${WXPID}:"
    awk '$2 ~ /w/ && $2 ~ /x/ {print "    ⚠⚠ " $0}' /proc/${WXPID}/maps 2>/dev/null
    kill $WXPID 2>/dev/null
} || echo "  (gcc indisponível — pule este experimento)"
```

⚠ **Se a região W+X apareceu, você acabou de ver o requisito de qualquer exploit de corrupção de
memória.** Um atacante que controla o fluxo até uma região W+X **executa código arbitrário** — sem
precisar de ROP.

⚠ **E é por isso que `W^X` (write XOR execute) é regra de segurança.** A correção é `mprotect` para
remover `PROT_WRITE` depois de escrever o código — ou nunca ter as duas permissões.

**Experimento C — arquivo removido ainda legível:**

```bash
echo "═══ C. o arquivo que não existe mais ═══"
python3 - <<'PY'
import os, tempfile, subprocess

# um processo mantém o arquivo aberto
f = tempfile.NamedTemporaryFile(delete=False, prefix="segredo-", suffix=".txt")
nome = f.name
f.write(b"CONTEUDO-CONFIDENCIAL-9999\n")
f.flush()

print(f"  arquivo criado: {nome}")

# remove do disco, mantendo o fd aberto
os.unlink(nome)
print(f"  removido do disco? {not os.path.exists(nome)}")
print(f"  mas o fd {f.fileno()} continua: {os.readlink(f'/proc/self/fd/{f.fileno()}')}")
print(f"  e o conteúdo ainda é legível:")

os.lseek(f.fileno(), 0, 0)
print(f"    {os.read(f.fileno(), 100)!r}")

f.close()
print()
print("  ⚠ o dado viveu no inode, não no nome.")
print("  ⚠ enquanto houver fd aberto, o espaço não é liberado.")
PY
```

⚠ **O experimento C é o mecanismo do módulo 7.** Um processo que segura `fd` mantém o dado
acessível **mesmo depois de `rm`**. É como um serviço mantém a configuração carregada sem deixar
arquivo legível em disco — e como um malware pode esconder o que usa.

Produza `experimentos.md`:

| Experimento | O que você viu | Por que importa |
|---|---|---|
| A — `setuid` | | |
| B — W+X | | |
| C — arquivo removido | | |

**Responda:**

1. No experimento A, `setuid` em script funcionou? **Por quê?**
2. No experimento B, a região W+X apareceu? **O que ela permite?**
3. No experimento C, o conteúdo continuou acessível por qual caminho?
4. **Qual dos três levaria ao relatório** como achado de configuração?

### Passo 3 — Os dois críticos de `/sys` (30 min)

```bash
cd ~/lab/mod02

cat > checa-sys.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "═══ 1. uevent_helper ═══"
uh=$(cat /sys/kernel/uevent_helper 2>/dev/null)
if [ -n "$uh" ]; then
    echo "  ⚠⚠ CRÍTICO: ${uh}"
    echo "      o kernel executa isto como root em evento de dispositivo"
    [ -e "$uh" ] && stat -c '      perms: %A  dono: %U:%G' "$uh"
else
    echo "  ✓ vazio (correto)"
fi
echo

echo "═══ 2. core_pattern ═══"
cp=$(sysctl -n kernel.core_pattern 2>/dev/null)
echo "  valor: ${cp}"
case "$cp" in
    \|*)
        prog=$(printf '%s' "$cp" | sed 's/^|//')
        echo "  ⚠ pipe → executa programa: ${prog}"
        [ -e "$prog" ] && stat -c '      perms: %A  dono: %U:%G' "$prog"
        ;;
    /*)
        d=$(dirname "$cp")
        if [ -w "$d" ]; then
            echo "  ⚠ diretório GRAVÁVEL: ${d}"
            stat -c '      perms: %A  dono: %U:%G' "$d"
        else
            echo "  ✓ diretório não gravável"
        fi
        ;;
    *)
        echo "  ⚠ caminho relativo — depende do cwd do processo que quebra"
        ;;
esac
echo

echo "═══ 3. LSM ativo ═══"
lsm=$(cat /sys/kernel/security/lsm 2>/dev/null)
echo "  ${lsm:-（vazio）}"
case "${lsm:-}" in
    *selinux*)  echo "  ✓ SELinux presente" ;;
    *apparmor*) echo "  ✓ AppArmor presente" ;;
    *yama*)     echo "  ✓ Yama presente" ;;
    "")         echo "  ⚠ nenhum LSM além do padrão mínimo" ;;
esac
echo

echo "═══ 4. lockdown ═══"
cat /sys/kernel/security/lockdown 2>/dev/null || echo "  não disponível"
echo

echo "═══ 5. kexec ═══"
printf '  kexec_loaded       : %s\n' "$(cat /sys/kernel/kexec_loaded 2>/dev/null || echo '—')"
printf '  kexec_crash_loaded : %s\n' "$(cat /sys/kernel/kexec_crash_loaded 2>/dev/null || echo '—')"
SCRIPT

chmod +x checa-sys.sh
./checa-sys.sh | tee sys-critico.txt
```

Produza `sys-critico.md`:

| Item | Valor | Crítico? | Correção |
|---|---|---|---|
| `uevent_helper` | | | |
| `core_pattern` | | | |
| LSM | | | |
| `lockdown` | | | |
| `kexec_loaded` | | | |

**Responda:**

1. Algum dos dois críticos disparou?
2. Quais LSM estão ativos?
3. **Se não há LSM, o que isso significa para o resto do hardening?**
4. **Qual a correção de cada um?** Escreva o comando.

### Passo 4 — A tabela de leitura de `/proc` (30 min)

Produza `tabela-proc.md` — **o que você passará a consultar**:

| Caminho | Pergunta que responde | Achado típico |
|---|---|---|
| `/proc/<pid>/status` | | |
| `/proc/<pid>/maps` | | |
| `/proc/<pid>/fd/` | | |
| `/proc/<pid>/exe` | | |
| `/proc/<pid>/cwd` | | |
| `/proc/<pid>/ns/` | | |
| `/proc/<pid>/mem` | | |
| `/proc/modules` | | |
| `/proc/mounts` | | |
| `/sys/kernel/uevent_helper` | | |
| `/sys/kernel/core_pattern` | | |
| `/sys/kernel/security/lsm` | | |

⚠ **Preencha com o achado que você viu nos labs** — não com definição genérica.

### Critérios de aceitação

- `perfil-processo.sh` rodando em **dois** processos, com saída real.
- Você identificou `Uid` efetivo, `CapEff`, `NoNewPrivs` e `Seccomp` de cada um.
- Você verificou **W+X** nos dois — e reportou o resultado.
- Os **três experimentos** (A, B, C) executados, com o resultado observado.
- Você explicou por que `setuid` em **script** é ignorado.
- Você viu a região W+X no experimento B (ou registrou que o `gcc` faltou).
- `checa-sys.sh` rodado, com `uevent_helper` e `core_pattern` avaliados.
- Você escreveu a **correção** de cada achado de `/sys`.
- `tabela-proc.md` preenchida com o **achado visto**, não com definição.

---

## Avaliação

1. Por que `/proc` não é sistema de arquivos normal? Qual a consequência prática?
2. **Qual é o `Uid` que o kernel usa para decidir permissão?** Por que não o real?
3. O que `setuid` faz com os quatro valores de `Uid`?
4. **Por que `setuid` em script é ignorado pelo kernel?**
5. O que `CapEff` é, e por que privilégio por capability é mais difícil de auditar?
6. Cite três capability perigosas e o que cada uma permite.
7. Descreva a estrutura de uma linha de `/proc/<pid>/maps`.
8. **Por que `w` + `x` na mesma região é o achado mais grave?**
9. O que é `W^X`, e como se corrige uma região W+X?
10. O que `[vdso]`, `[stack]` e `[heap]` são?
11. **Por que `/proc/<pid>/fd/N` entrega conteúdo de arquivo removido?**
12. O que `readlink /proc/<pid>/cwd` revela, e quando é achado?
13. O que ler `/proc/<pid>/mem` de **outro** processo exige? Cite as duas condições.
14. O que `ptrace_scope` faz? Por que `0` é achado?
15. **Por que `uevent_helper` com caminho é escalação?** Descreva o mecanismo.
16. Por que `core_pattern` com pipe ou diretório gravável é achado?
17. O que `/sys/kernel/security/lsm` vazio significa?
18. **Por que ler `/proc` do seu processo é diagnóstico e de outro é invasão?**

---

**Próximo:** [Módulo 3 — Permissão: os doze bits](modulo-03.md)
