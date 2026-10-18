# Módulo 5 — Capability e `seccomp`

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Entender capability como **divisão do privilégio de `root`**.
2. Decodificar `CapEff`, `CapPrm`, `CapInh`, `CapBnd` e `CapAmb`.
3. Auditar capability em binário e em processo.
4. Entender `seccomp` e o que ele restringe.
5. Reconhecer a capability **que equivale a `root`** — e por que a auditoria erra nisso.

---

## ⚠ Antes de começar

⚠ **Capability é o mecanismo que substitui `root` para o que não precisa de `root`.** E é
**melhor** que `setuid` — porque divide o privilégio em pedaços.

⚠ **Mas é o mecanismo mais mal auditado do Linux.** Um binário com `cap_sys_admin` **não aparece
no `ls`**, **não aparece no `find -perm`**, e **não aparece no `lynis`**. E `cap_sys_admin` **é
`root` na prática**.

⚠ **A regra do módulo:** você audita a **sua** VM. Uma capability encontrada é achado de relatório;
usá-la para escapar de isolamento é outra coisa — e é o que o módulo 6 vai delimitar com precisão.

---

## 5.1 O que capability resolve

⚠ **`root` é um privilégio indivisível por padrão — e por isso era ruim.**

```
ANTES: setuid-root

  Programa precisa só abrir socket de rede privilegiado (porta 80)
        │
        ▼
  mascara como ROOT                  ⚠ ganha TUDO:
                                       · ler qualquer arquivo
                                       · montar sistema de arquivos
                                       · carregar módulo de kernel
                                       · ptrace em qualquer processo
                                       · alterar qualquer arquivo
```

```
DEPOIS: capability

  Mesmo programa
        │
        ▼
  CAP_NET_BIND_SERVICE               ✓ ganha SÓ:
                                       · abrir porta < 1024
                                       (nada mais)
```

⚠ **A ideia é boa; a implementação é que gera erro.** Porque existem **41 capability**, e algumas
são **equivalentes a `root`**:

| Capability | O que ela permite | ⚠ Equivale a `root`? |
|---|---|---|
| `CAP_CHOWN` | Mudar dono de arquivo | Não |
| `CAP_DAC_OVERRIDE` | **Ignorar permissão de arquivo** | ⚠⚠ **SIM** |
| `CAP_DAC_READ_SEARCH` | Ignorar permissão de leitura | ⚠ **Quase** |
| `CAP_FOWNER` | Ignorar checagem de dono | Não |
| `CAP_KILL` | Matar qualquer processo | Não |
| `CAP_SETUID` | **Mudar o próprio uid** | ⚠⚠ **SIM** |
| `CAP_SETGID` | Mudar o próprio gid | ⚠ |
| `CAP_SETPCAP` | **Mudar capabilities** | ⚠⚠ **SIM** |
| **`CAP_SYS_ADMIN`** | **Montar, namespace, LSM, quase tudo** | ⚠⚠⚠ **SIM** |
| `CAP_SYS_PTRACE` | Depurar qualquer processo | ⚠ **Quase** |
| `CAP_SYS_MODULE` | **Carregar módulo de kernel** | ⚠⚠⚠ **SIM — kernel** |
| `CAP_SYS_RAWIO` | Acesso direto a I/O | ⚠⚠ **SIM** |
| `CAP_SYS_CHROOT` | `chroot` | Não (mas escapa de `chroot`) |
| `CAP_NET_ADMIN` | Configurar rede | ⚠ Alto |
| `CAP_NET_RAW` | Socket cru (ping, sniffer) | Médio |
| `CAP_NET_BIND_SERVICE` | Porta < 1024 | ✓ **Baixo — o caso ideal** |
| `CAP_SYS_TIME` | Mudar relógio | Médio |
| `CAP_AUDIT_CONTROL` | Controlar auditoria | ⚠ Alto |

⚠ **As linhas com `⚠⚠ SIM` são o ponto do módulo.** `CAP_SYS_ADMIN` sozinha dá: montar sistema de
arquivos, criar namespace, alterar LSM, ler `/dev/mem`, e mais. **Chamar `CAP_SYS_ADMIN` de
"privilégio granular" é o erro que o módulo existe para corrigir.**

⚠ **A regra prática:** se você vê `cap_sys_admin`, `cap_sys_module`, `cap_sys_rawio`,
`cap_dac_override` ou `cap_setuid` num binário comum — **é achado equivalente a `setuid root`**.

```bash
mkdir -p ~/lab/mod05 && cd ~/lab/mod05

echo "═══ as 41 capabilities ═══"
capsh --print 2>/dev/null | head -20 || echo "  (capsh indisponível — instale libcap2-bin)"

echo
echo "═══ o que o MEU processo tem ═══"
grep -E '^Cap(Eff|Prm|Inh|Bnd|Amb)' /proc/self/status

echo
echo "═══ decodificando ═══"
for campo in CapInh CapPrm CapEff CapBnd; do
    v=$(awk -v c="$campo" '$1 == c":" {print $2}' /proc/self/status)
    printf '  %-8s = %s\n' "$campo" "$v"
    [ -n "$v" ] && [ "$v" != "0000000000000000" ] && \
        capsh --decode="$v" 2>/dev/null | sed 's/^/      /'
done
```

⚠ **Note que o seu shell comum tem `CapEff = 0`.** Isso é o esperado — você não é `root` e não tem
capability. **O shell só ganha quando é `root`** (que tem todas) **ou quando o binário foi marcado
com `setcap`**.

**Produza `capability.md`:**

| Campo | Valor | O que significa |
|---|---|---|
| `CapInh` | | |
| `CapPrm` | | |
| `CapEff` | | |
| `CapBnd` | | |
| `CapAmb` | | |

**Responda:**

1. **Qual dos quatro o kernel usa para decidir** se a operação é permitida?
2. O `CapBnd` do seu processo é `000001ffffffffff`? O que isso significa?
3. Por que o shell comum tem `CapEff = 0`?
4. **Por que `CAP_SYS_ADMIN` não é privilégio granular?**

⚠ **A resposta 4 é a tese do módulo.** `CAP_SYS_ADMIN` é chamada de **"the new root"** na
documentação do próprio kernel — porque ela dá montagem, namespace, e uma dúzia de operações
administrativas. **Marcá-la num binário é o mesmo que `setuid root`, com a desvantagem de ser
invisível.**

---

## 5.2 Os cinco conjuntos e como eles se movem

⚠ **Capability não é um valor único — são cinco conjuntos, e a relação entre eles é o mecanismo.**

```
    ┌─────────────┐
    │  CapBnd     │  BOUNDING SET — o teto
    │  (teto)     │  ⚠ nada fora dele pode ser ganho, nunca
    └──────┬──────┘
           ▼
    ┌─────────────┐
    │  CapPrm     │  PERMITTED — o que PODE ser ativado
    └──────┬──────┘
           ▼
    ┌─────────────┐
    │  CapEff     │  EFFECTIVE — o que o kernel usa AGORA  ⚠ ESTE
    └─────────────┘

    ┌─────────────┐
    │  CapInh     │  INHERITED — o que passa para filho via exec
    └─────────────┘
    ┌─────────────┐
    │  CapAmb     │  AMBIENT — o que passa para filho NÃO-privilegiado
    └─────────────┘
```

| Conjunto | Análogo ao `Uid` | Regra |
|---|---|---|
| **`CapEff`** | **efetivo** | ⚠ **É o que o kernel verifica** |
| `CapPrm` | salvo | O que pode ser ativado em `CapEff` |
| `CapInh` | — | Preservado através de `exec` |
| **`CapBnd`** | — | **Teto absoluto — nada acima é alcançável** |
| `CapAmb` | — | Preservado sem privilégio |

⚠ **A regra que decide tudo:** para o kernel permitir uma operação, ela tem que estar em
**`CapEff`**. E para estar em `CapEff`, tem que estar em **`CapPrm`**. E para estar em `CapPrm`, tem
que estar em **`CapBnd`**.

⚠ **`CapBnd` é a fronteira que não pode ser cruzada.** Ela é definida quando o processo executa e
**nunca aumenta**. **É o teto do que aquele processo pode ter**, para sempre.

⚠ **E `CapAmb` é o achado mais sutil.** Ela permite passar capability para um processo filho
**não-privilegiado** — o que significa que uma capability pode **sobreviver a um `exec` de binário
sem `setcap`**. É a forma de capability se espalhar por uma árvore de processos.

```bash
echo "═══ os conjuntos se movem no exec ═══"
cat <<'EXPL'
  exec de binário SEM setcap e SEM setuid:
      CapBnd  preserva
      CapPrm  = (CapInh ∩ CapBnd) | (file permitted se o arquivo tiver)
      CapEff  = CapAmb  (⚠ não herda o Permitted!)
      CapAmb  preserva

  exec de binário COM setcap (file capabilities):
      CapPrm  ganha o que o ARQUIVO tem
      CapEff  ativa
      ⚠ é assim que setcap funciona — como setuid, mas granular

  exec de binário setuid-root:
      CapPrm  = CapBnd   (todas do teto)
      CapEff  = CapPrm
      ⚠ setuid root = TODAS as capabilities
EXPL

echo
echo "═══ a demonstração: setuid root é o conjunto inteiro ═══"
echo "  CapBnd deste shell: $(awk '/^CapBnd:/ {print $2}' /proc/self/status)"
echo
echo "  ⚠ num setuid-root, CapEff = CapBnd — todas as que o teto permite"
echo "  ⚠ é por isso que setuid root é pior que setcap de uma só"
```

⚠ **A última linha do bloco é a comparação do módulo.** `setuid root` dá **o conjunto `CapBnd`
inteiro**. `setcap` de uma só dá **uma**. **É a diferença prática entre o mecanismo antigo e o
novo** — e é o argumento de migrar.

**Produza `conjuntos.md`:**

| Situação | `CapPrm` | `CapEff` | `CapInh` | `CapBnd` |
|---|---|---|---|---|
| Shell comum | | | | |
| `setcap` de uma | | | | |
| `setuid root` | | | | |
| Filho de `CapAmb` | | | | |

**Responda:**

1. **Qual conjunto o kernel verifica?** Qual é o caminho até ele?
2. O que `CapBnd` impede, e por que ela nunca aumenta?
3. **Por que `setuid root` é `CapEff = CapBnd`?**
4. O que `CapAmb` permite que `CapInh` não permite?

---

## 5.3 `setcap` — como a capability é aplicada

⚠ **`setcap` é o `chmod` da capability.** Ele grava no **atributo estendido** do arquivo.

```bash
echo "═══ 1. capabilities no sistema ═══"
getcap -r / 2>/dev/null | tee caps-sistema.txt
echo "  total: $(wc -l < caps-sistema.txt)"

echo
echo "═══ 2. o mesmo, formatado ═══"
while IFS= read -r linha; do
    [ -z "$linha" ] && continue
    caminho=$(printf '%s' "$linha" | awk '{print $1}')
    caps=$(printf '%s' "$linha" | sed 's/^[^ ]* //')
    printf '  %s\n' "$caminho"
    printf '     %s\n' "$caps"
    printf '     %s\n' "$(stat -c '%A %U:%G' "$caminho" 2>/dev/null)"
    printf '     pacote: %s\n' "$(dpkg -S "$caminho" 2>/dev/null | cut -d: -f1 || echo '⚠ NENHUM')"
    echo
done < caps-sistema.txt | head -60
```

### A classificação por risco

⚠ **Toda capability encontrada vai numa das quatro categorias:**

| Categoria | Capability | Classificação |
|---|---|---|
| **Baixo (uso ideal)** | `cap_net_bind_service` | ✓ Aceitável |
| **Médio** | `cap_net_raw`, `cap_net_admin`, `cap_kill`, `cap_chown` | Contexto importa |
| **Alto** | `cap_dac_read_search`, `cap_sys_ptrace`, `cap_sys_chroot`, `cap_audit_*` | ⚠ Reportar |
| **⚠⚠ Equivale a `root`** | **`cap_sys_admin`, `cap_sys_module`, `cap_sys_rawio`, `cap_dac_override`, `cap_setuid`, `cap_setgid`, `cap_setpcap`** | **⚠⚠ Crítico** |

```bash
echo "═══ 3. classificando as capabilities encontradas ═══"
while IFS= read -r linha; do
    [ -z "$linha" ] && continue
    caminho=$(printf '%s' "$linha" | awk '{print $1}')
    caps=$(printf '%s' "$linha" | sed 's/^[^ ]* //' | tr ',' ' ')

    crit=""
    for c in $caps; do
        case "$c" in
            cap_sys_admin|cap_sys_module|cap_sys_rawio|cap_dac_override|cap_setuid|cap_setgid|cap_setpcap)
                crit="${crit} ${c}" ;;
        esac
    done

    if [ -n "$crit" ]; then
        printf '  ⚠⚠ CRÍTICO: %s\n' "$caminho"
        printf '        %s\n' "$caps"
        printf '        equivale a root por: %s\n' "$crit"
    else
        printf '  ·  %s  [%s]\n' "$caminho" "$caps"
    fi
done < caps-sistema.txt
```

⚠ **A listagem acima é o achado mais importante do módulo.** Se um binário comum tem
`cap_sys_admin`, ele pode **montar sistema de arquivos** — o que significa que ele pode montar um
sistema onde a permissão é `777` e ter acesso total. **É `root` sem ser `root`.**

⚠ **E é exatamente o padrão que aparece em servidor real:** alguém precisou de uma operação
privilegiada, deu a capability mais próxima que resolveu, e ela é **muito mais ampla** do que o
necessário. `cap_sys_admin` é a escolha preguiçosa clássica.

```bash
echo "═══ 4. demonstrando que setcap é invisível no ls ═══"
cp /bin/true /tmp/com-cap
ls -l /tmp/com-cap

sudo setcap cap_net_bind_service=ep /tmp/com-cap 2>/dev/null && {
    echo
    echo "  depois do setcap:"
    ls -l /tmp/com-cap
    echo "  ⚠ o ls NÃO mudou — nenhuma letra nova"
    echo
    echo "  mas o getcap vê:"
    getcap /tmp/com-cap | sed 's/^/    /'
    echo
    echo "  e o atributo estendido está lá:"
    getfattr -d -m - /tmp/com-cap 2>/dev/null | sed 's/^/    /'
} || echo "  (setcap requer root — use sudo)"

rm -f /tmp/com-cap
```

⚠ **A demonstração 4 é o argumento do módulo inteiro.** `setcap` **não muda nada visível no `ls`**.
Nem `chmod`, nem `find -perm`, nem `ls -la` mostram. **Só `getcap` vê** — e é por isso que a
auditoria que olha só permissão tradicional **passa o binário como limpo**.

⚠ **E é por isso que `getcap -r /` é obrigatório em auditoria de Linux.** Sem ele, metade da
superfície de privilégio é invisível.

**Produza `setcap.md`:**

| Binário | Capability | Categoria | Pacote | Achado? |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Responda:**

1. **Quantas capabilities no sistema?** Quantas são críticas?
2. Alguma é de **binário que não é de pacote**?
3. **Por que `ls` não mostra a capability?** Onde ela fica?
4. Qual binário tem capability **mais ampla que o necessário**?

---

## 5.4 A auditoria que o scanner não faz

⚠ **A comparação que separa auditoria de checklist.**

```bash
echo "═══ o que cada ferramenta vê ═══"
cat <<'EXPL'
  ┌──────────────────────┬───────┬────────┬───────┬─────────┬───────┐
  │ Achado               │ ls -l │ find   │ lynis │ getcap  │ getfattr │
  ├──────────────────────┼───────┼────────┼───────┼─────────┼───────┤
  │ bit setuid           │  ✓    │   ✓    │   ✓   │    ✗    │   ✗   │
  │ capability           │  ✗    │   ✗    │   ✗   │    ✓    │   ✓   │
  │ atributo estendido   │  ✗    │   ✗    │   ✗   │    ✗    │   ✓   │
  │ ACL                  │  ±    │   ✗    │   ✗   │    ✗    │   ✗   │
  │ capability + setuid  │  ✗    │   ✗    │   ✗   │    ✗    │   ✗   │
  └──────────────────────┴───────┴────────┴───────┴─────────┴───────┘
  ⚠ a última linha é a que NENHUMA ferramenta vê sozinha
EXPL

echo
echo "═══ o cruzamento que ninguém faz ═══"
echo "  binários com AMBOS: setuid E capability"
echo

find / -xdev -perm -4000 -type f 2>/dev/null | sort > /tmp/suid.txt
getcap -r / 2>/dev/null | awk '{print $1}' | sort > /tmp/cap.txt

comm -12 /tmp/suid.txt /tmp/cap.txt | while read -r b; do
    printf '  ⚠⚠ %s\n' "$b"
    stat -c '        %A %U:%G' "$b"
    getcap "$b" | sed 's/^/        /'
done
echo "  (fim)"

echo
echo "═══ e o cruzamento de capability com diretório gravável ═══"
while read -r b; do
    d=$(dirname "$b")
    [ -w "$d" ] && printf '  ⚠⚠ %s  (dir %s gravável)\n' "$b" "$d"
done < /tmp/cap.txt
echo "  (fim)"

echo
echo "═══ e capability em binário que NÃO é de pacote ═══"
while read -r b; do
    dpkg -S "$b" >/dev/null 2>&1 || printf '  ⚠⚠ %s  (não é de pacote)\n' "$b"
done < /tmp/cap.txt
echo "  (fim)"
```

⚠ **Os três cruzamentos são o instrumento do módulo:**

| Cruzamento | O que revela |
|---|---|
| `setuid` **e** capability | Binário com **dois** caminhos de privilégio |
| capability em diretório gravável | ⚠⚠ **Qualquer usuário substitui o binário** — e a capability vem junto |
| capability em binário não-pacote | ⚠⚠ **Alguém o colocou ali com privilégio** |

⚠ **O segundo é o mais grave.** Um binário com `cap_net_admin` em diretório gravável significa que
qualquer usuário **escreve sobre ele** e a capability é **do arquivo**, não do dono. **É `root`
para quem escrever.**

⚠ **E note o primeiro:** um binário com `setuid` **e** capability **redun dante**. Isso é sinal de
que alguém adicionou capability **em cima** de um `setuid` existente — provavelmente sem entender
que o `setuid` já dava tudo. **É indicador de configuração feita por tentativa.**

**Produza `cruzamento.md`:**

| Cruzamento | Achados | Crítico? |
|---|---|---|
| `setuid` + capability | | |
| capability + dir gravável | | |
| capability + não-pacote | | |

**Responda:**

1. **Algum dos três cruzamentos achou algo?**
2. Qual é o mais grave, e por quê?
3. **Por que nenhuma ferramenta sozinha vê o cruzamento?**
4. Se você achasse `cap_sys_admin` em `/tmp/`, o que isso significaria?

⚠ **A resposta 4 é o cenário de comprometimento.** Um binário com `cap_sys_admin` em diretório
gravável **não é má configuração** — é **persistência de atacante** ou **instalação não
documentada**. **A classificação muda completamente.**

---

## 5.5 `seccomp` — o filtro de syscall

⚠ **`seccomp` restringe **quais chamadas de sistema** o processo pode fazer.** É a defesa mais
próxima do processo — e a mais eficaz contra exploit.

```bash
echo "═══ 1. seccomp no meu processo ═══"
grep -E '^Seccomp' /proc/self/status

echo
echo "═══ 2. os modos ═══"
cat <<'EXPL'
  Seccomp: 0  → desligado
  Seccomp: 1  → STRICT: só read, write, exit, sigreturn   (quase inútil)
  Seccomp: 2  → FILTER: BPF decide cada syscall            ← o usado
  Seccomp_filters: N → quantos filtros carregados
EXPL

echo
echo "═══ 3. seccomp nos serviços ═══"
for u in $(systemctl list-units --type=service --state=running --no-pager 2>/dev/null | \
           awk '/\.service/ {print $1}' | head -20); do
    pid=$(systemctl show -p MainPID --value "$u" 2>/dev/null)
    [ -z "$pid" ] || [ "$pid" = "0" ] && continue
    sc=$(awk '/^Seccomp:/ {print $2}' "/proc/${pid}/status" 2>/dev/null)
    nf=$(awk '/^Seccomp_filters:/ {print $2}' "/proc/${pid}/status" 2>/dev/null)
    [ -n "$sc" ] && printf '  %-40s Seccomp=%s  filtros=%s  %s\n' \
        "$u" "$sc" "${nf:-0}" "$([ "$sc" = "2" ] && echo '✓' || echo '·')"
done

echo
echo "═══ 4. o que o systemd suporta ═══"
cat <<'EXPL'
  No unit:
    SystemCallFilter=@system-service     ← conjunto pré-definido
    SystemCallFilter=~@privileged @resources    ← nega conjuntos
    SystemCallArchitectures=native       ← só a arquitetura nativa
    SystemCallErrorNumber=EPERM          ← em vez de matar, devolve erro
    LockPersonality=yes
    RestrictAddressFamilies=AF_UNIX AF_INET
    MemoryDenyWriteExecute=yes           ← ⚠ bloqueia região W+X (módulo 2)
    RestrictRealtime=yes
EXPL

echo
echo "  ⚠ MemoryDenyWriteExecute=yes é W^X forçado pelo systemd"
```

⚠ **`Seccomp=2` é o estado desejado.** Um serviço com `Seccomp: 0` **pode fazer qualquer chamada
de sistema** — e num exploit, isso significa que ele pode `execve`, `ptrace`, `mount`, tudo.

⚠ **E `MemoryDenyWriteExecute=yes` é a diretiva que fecha o achado do módulo 2.** Ela impede
região **gravável e executável** — ou seja, bloqueia o requisito de qualquer exploit de corrupção
de memória. **É uma linha no unit.**

⚠ **A demonstração de seccomp com `unshare`:**

```bash
echo "═══ 5. demonstrando um filtro seccomp ═══"
echo "  ⚠ requer python3 com seccomp, ou o comando 'firejail'/'bwrap'"
echo

if command -v bwrap >/dev/null; then
    echo "  com bwrap (filtro ativo):"
    bwrap --unshare-all --ro-bind / / --dev /dev sh -c 'grep Seccomp /proc/self/status' 2>/dev/null | sed 's/^/    /'
else
    echo "  bwrap não instalado — o exemplo abaixo ilustra"
fi

echo
cat <<'EXPL'
  Em Python com a lib seccomp:

    import seccomp
    f = seccomp.SyscallFilter(defaction=seccomp.ALLOW)
    f.add_rule(seccomp.KILL, "execve")     # ⚠ mata se tentar executar
    f.add_rule(seccomp.KILL, "ptrace")
    f.load()

  Depois disso, o processo NÃO CONSEGUE executar nada.
  ⚠ é a defesa mais forte: mesmo com corrupção de memória,
     o atacante não consegue chamar execve.
EXPL
```

⚠ **O último bloco é o argumento de segurança.** Seccomp **não impede a corrupção de memória** —
mas **impede o próximo passo**. Um exploit que consegue controle de fluxo mas **não consegue
`execve`** tem muito menos utilidade. **É defesa em profundidade.**

**Produza `seccomp.md`:**

| Serviço | `Seccomp` | Filtros | Deveria ter? |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantos serviços têm `Seccomp=2`?** Quantos têm `0`?
2. O que `Seccomp=1` (strict) restringe?
3. **Por que seccomp é defesa em profundidade**, e não prevenção de corrupção?
4. Que diretiva do `systemd` fecha o achado de região W+X?

---

## 5.6 LAB — Auditoria de capability

**Duração:** 120 min

### Passo 1 — Inventário completo (35 min)

```bash
cd ~/lab/mod05

cat > audita-cap.sh <<'SCRIPT'
#!/usr/bin/env bash
# audita-cap.sh — auditoria de capability e seccomp
set -uo pipefail

SAIDA="${1:-capability.txt}"

CRITICAS="cap_sys_admin cap_sys_module cap_sys_rawio cap_dac_override cap_setuid cap_setgid cap_setpcap"
ALTAS="cap_dac_read_search cap_sys_ptrace cap_sys_chroot cap_audit_control cap_audit_write cap_mac_admin cap_mac_override"

{
    echo "═══════════ AUDITORIA DE CAPABILITY ═══════════"
    echo "host: $(hostname)   data: $(date -Is)"
    echo

    echo "── 1. CAPABILITIES DO PRÓPRIO PROCESSO ──"
    grep -E '^Cap(Eff|Prm|Inh|Bnd|Amb)' /proc/self/status | sed 's/^/  /'
    echo

    echo "── 2. INVENTÁRIO (getcap -r /) ──"
    getcap -r / 2>/dev/null | sed 's/^/  /'
    echo

    echo "── 3. CLASSIFICAÇÃO POR RISCO ──"
    getcap -r / 2>/dev/null | while read -r caminho resto; do
        caps=$(printf '%s' "$resto" | tr ',' ' ')
        nivel="BAIXO"; motivo=""

        for c in $caps; do
            case "$c" in
                *net_bind_service*) [ "$nivel" = "BAIXO" ] && nivel="BAIXO (uso ideal)" ;;
            esac
        done

        for c in $caps; do
            for x in $CRITICAS; do
                [ "$c" = "$x" ] && { nivel="⚠⚠ CRÍTICO"; motivo="${motivo} ${c}"; }
            done
            for x in $ALTAS; do
                [ "$c" = "$x" ] && { [ "$nivel" != "⚠⚠ CRÍTICO" ] && nivel="⚠ ALTO"; motivo="${motivo} ${c}"; }
            done
        done

        printf '  %-12s %s\n' "$nivel" "$caminho"
        printf '               %s\n' "$caps"
        [ -n "$motivo" ] && printf '               equivale a root por:%s\n' "$motivo"
    done
    echo

    echo "── 4. CRUZAMENTO: capability + setuid ──"
    find / -xdev -perm -4000 -type f 2>/dev/null | sort > /tmp/_suid
    getcap -r / 2>/dev/null | awk '{print $1}' | sort > /tmp/_cap
    comm -12 /tmp/_suid /tmp/_cap 2>/dev/null | sed 's/^/  ⚠⚠ /'
    echo

    echo "── 5. CRUZAMENTO: capability + diretório gravável ──"
    while read -r b; do
        [ -z "$b" ] && continue
        d=$(dirname "$b")
        [ -w "$d" ] && printf '  ⚠⚠ %s  (dir %s gravável)\n' "$b" "$d"
    done < /tmp/_cap
    echo

    echo "── 6. CRUZAMENTO: capability + não-pacote ──"
    while read -r b; do
        [ -z "$b" ] && continue
        dpkg -S "$b" >/dev/null 2>&1 || printf '  ⚠ %s  (não é de pacote)\n' "$b"
    done < /tmp/_cap
    echo

    echo "── 7. SECCOMP POR SERVIÇO ──"
    for u in $(systemctl list-units --type=service --state=running --no-pager 2>/dev/null | \
               awk '/\.service/ {print $1}'); do
        pid=$(systemctl show -p MainPID --value "$u" 2>/dev/null)
        [ -z "$pid" ] || [ "$pid" = "0" ] && continue
        [ -e "/proc/${pid}/status" ] || continue
        sc=$(awk '/^Seccomp:/ {print $2}' "/proc/${pid}/status" 2>/dev/null)
        [ -n "$sc" ] && printf '  %-42s Seccomp=%s\n' "$u" "$sc"
    done
    echo

    echo "── 8. DIRETIVAS DE ISOLAMENTO NO SYSTEMD ──"
    for u in $(systemctl list-units --type=service --state=running --no-pager 2>/dev/null | \
               awk '/\.service/ {print $1}' | head -15); do
        tem=$(systemctl cat "$u" 2>/dev/null | \
              grep -cE '^(NoNewPrivileges|SystemCallFilter|MemoryDenyWriteExecute|ProtectSystem|PrivateTmp|CapabilityBoundingSet)')
        printf '  %-42s %s diretiva(s)\n' "$u" "$tem"
    done
    echo

    echo "── 9. SERVIÇOS SEM ISOLAMENTO NENHUM ──"
    for u in $(systemctl list-units --type=service --state=running --no-pager 2>/dev/null | \
               awk '/\.service/ {print $1}'); do
        tem=$(systemctl cat "$u" 2>/dev/null | \
              grep -cE '^(NoNewPrivileges|SystemCallFilter|MemoryDenyWriteExecute|ProtectSystem|PrivateTmp)')
        [ "$tem" = "0" ] && printf '  ⚠ %s\n' "$u"
    done

    rm -f /tmp/_suid /tmp/_cap

} > "$SAIDA" 2>&1

echo "salvo em ${SAIDA} ($(wc -l < "$SAIDA") linhas)"
SCRIPT

chmod +x audita-cap.sh
sudo ./audita-cap.sh capability.txt
head -80 capability.txt
```

Produza `inventario-cap.md`:

| # | Binário | Capability | Nível | Pacote | Achado? |
|---|---|---|---|---|---|
| | | | | | |

**Responda:**

1. **Quantas capabilities no total?** Quantas críticas?
2. Algum cruzamento disparou?
3. **Quantos serviços têm `Seccomp=2`?** Quantos têm `0`?
4. **Quantos serviços sem isolamento nenhum?**

### Passo 2 — A capability plantada na `linux-alvo` (35 min)

```bash
cd ~/lab/mod05

echo "═══ procurando a capability plantada ═══"
sudo ./audita-cap.sh cap-alvo.txt >/dev/null 2>&1

echo "── capabilities presentes ──"
sed -n '/INVENTÁRIO/,/CLASSIFICAÇÃO/p' cap-alvo.txt | head -20

echo
echo "── classificadas ──"
sed -n '/CLASSIFICAÇÃO/,/CRUZAMENTO/p' cap-alvo.txt | head -25

echo
echo "═══════════ ANÁLISE ═══════════"
cat <<'EXPL'
  Para a capability mais ampla que você encontrar, responda:

  1. QUAL binário?             (caminho)
  2. QUAL capability?          (nome)
  3. O binário é DE PACOTE?    (dpkg -S)
  4. O que a capability dá?    (operação específica)
  5. Ela é MAIS AMPLA que o necessário?  (provavelmente sim)
  6. Existe capability MENOR que resolve?
  7. Equivale a root?          (compare com a tabela)
  8. Correção:                 (setcap alternativa)
EXPL
```

⚠ **A pergunta 6 é o exercício real de auditoria.** Raramente a correção é "remover a capability"
— porque o programa **precisa** dela. A correção é **trocar por uma menor** que resolve o mesmo
problema.

| Se o programa precisa... | Não use | Use |
|---|---|---|
| Abrir porta < 1024 | `cap_sys_admin` | **`cap_net_bind_service`** |
| Ler arquivo sem permissão | `cap_dac_override` | `cap_dac_read_search`, ou **ajustar ACL** |
| Configurar interface de rede | `cap_sys_admin` | **`cap_net_admin`** |
| Fazer `chroot` | `cap_sys_admin` | **`cap_sys_chroot`** |
| Mudar o relógio | `cap_sys_admin` | **`cap_sys_time`** |
| Enviar pacote cru | `cap_sys_admin` | **`cap_net_raw`** |

⚠ **A tabela é a resposta do módulo.** `cap_sys_admin` é a escolha preguiçosa porque **engloba
tudo** — e é exatamente por isso que ela é o achado. **A correção é sempre a capability mínima que
resolve**, e a tabela mapeia as seis combinações mais comuns.

Produza `cap-plantada.md`:

| Campo | Valor |
|---|---|
| Binário | |
| Capability | |
| É de pacote? | |
| O que dá | |
| Mais ampla que o necessário? | |
| Capability menor que resolve | |
| Equivale a `root`? | |
| Correção | |

**Responda:**

1. **Qual a capability plantada?** Em qual binário?
2. Ela é **mais ampla que o necessário**? **Qual seria a mínima?**
3. **Equivale a `root`?** Por qual operação?
4. **Você usou a capability?** Confirme que **não**.

### Passo 3 — Correção e relatório (50 min)

Produza `relatorio-cap.md`:

```markdown
# Auditoria de capability — [host]

## 1. Método e data
## 2. Inventário
| Binário | Capability | Nível | Pacote |
|---|---|---|---|

## 3. Achados críticos
| # | Binário | Capability | Por que é root | Correção |
|---|---|---|---|---|

## 4. Achados altos
## 5. Cruzamentos
| Cruzamento | Achados |
|---|---|
| setuid + capability | |
| capability + dir gravável | |
| capability + não-pacote | |

## 6. Seccomp e isolamento
| Métrica | Valor |
|---|---|
| Serviços com Seccomp=2 | |
| Serviços com Seccomp=0 | |
| Serviços sem isolamento | |

## 7. O que NÃO foi verificado
⚠ Mínimo 3
```

**As correções, escritas como comando:**

```bash
cat <<'EXPL'
═══ CORREÇÕES — os comandos ═══

1. Remover capability:
     sudo setcap -r /caminho/binario

2. Trocar por capability MÍNIMA:
     sudo setcap -r /caminho/binario
     sudo setcap cap_net_bind_service=ep /caminho/binario
     # ⚠ TESTE: pode quebrar funcionalidade

3. Capability em diretório gravável:
     sudo chown root:root /dir
     sudo chmod 755 /dir
     # ⚠ a capability é DO ARQUIVO — se alguém pode escrever, ganha a capability

4. setuid + capability (redundante):
     sudo chmod u-s /caminho     # remove o setuid
     # mantenha só a capability mínima

5. Capability em binário não-pacote:
     # investigue a origem ANTES de remover — pode ser persistência
     sudo ls -la /caminho
     sudo stat /caminho
     # se for desconhecido: remover e investigar o sistema

6. Seccomp nos serviços:
     sudo systemctl edit nome.service
     # [Service]
     #   SystemCallFilter=@system-service
     #   SystemCallFilter=~@privileged @resources
     #   SystemCallArchitectures=native

7. MemoryDenyWriteExecute:
     # [Service]
     #   MemoryDenyWriteExecute=yes
     # ⚠ pode quebrar aplicação com JIT (Java, .NET, V8)

8. CapabilityBoundingSet (restringir o teto):
     # [Service]
     #   CapabilityBoundingSet=CAP_NET_BIND_SERVICE
     # ⚠ define o teto do que o serviço pode ter

9. NoNewPrivileges:
     # [Service]
     #   NoNewPrivileges=yes
     # ⚠ impede o serviço de ganhar privilégio via setuid
EXPL
```

⚠ **A nota 5 é a mais importante.** Capability num binário **desconhecido** não é má configuração —
é **suspeita de comprometimento**. **A ação muda:** você **investiga**, não só remove.

⚠ **E a nota 7 tem ressalva real:** `MemoryDenyWriteExecute=yes` **quebra** aplicação com JIT —
Java, .NET, V8 (Node.js). **É a diretiva mais eficaz e a mais provável de causar problema**, e por
isso o teste é obrigatório.

**Responda:**

1. **Quantos achados críticos?** Quantos se corrigem com `setcap -r`?
2. Qual binário precisa de capability **menor em vez de nenhuma**?
3. Algum caso é **suspeita de comprometimento**? Qual?
4. **Testar `MemoryDenyWriteExecute` quebraria algum serviço?** Como você testaria com segurança?

⚠ **A resposta 4 é procedimento.** Testar diretiva de isolamento **em produção** quebra serviço.
Testar na VM, com `systemctl edit` (que cria override), e reverter com `systemctl revert`.

### Critérios de aceitação

- `audita-cap.sh` rodando com `sudo`, com as **nove seções**.
- `capability.md` com os **cinco conjuntos** do seu processo, e o `CapEff` explicado.
- Você explicou por que `setuid root` é `CapEff = CapBnd`.
- `setcap.md` com **todas** as capabilities do sistema, classificadas por nível.
- Você demonstrou que `setcap` é **invisível no `ls`** e visível no `getcap`.
- Os **três cruzamentos** executados, com o resultado (mesmo vazio).
- Você identificou **uma capability mais ampla que o necessário** e a mínima que resolve.
- `seccomp.md` com a contagem de `Seccomp=2` e `Seccomp=0`.
- Você explicou por que `MemoryDenyWriteExecute` fecha o achado do módulo 2.
- `cap-plantada.md` com os **oito campos**.
- Você confirmou **não ter usado** a capability.
- `relatorio-cap.md` com as **sete** seções e **três itens** na seção 7.
- Você distinguiu **má configuração** de **suspeita de comprometimento**.

---

## Avaliação

1. O que capability resolve, e por que `root` indivisível era ruim?
2. **Por que `CAP_SYS_ADMIN` não é privilégio granular?** Cite quatro operações que ela dá.
3. Cite as cinco capability que equivalem a `root`.
4. Descreva os cinco conjuntos e a relação entre eles.
5. **Qual conjunto o kernel verifica?** Qual o caminho até ele?
6. O que `CapBnd` impede? Por que ela nunca aumenta?
7. **Por que `setuid root` é `CapEff = CapBnd`?** O que isso implica?
8. O que `CapAmb` permite que `CapInh` não permite?
9. **Por que `ls` não mostra capability?** Onde ela fica, e como vê-la?
10. **Por que `find -perm` não encontra capability?** O que ela cobre então?
11. Cite os três cruzamentos de auditoria de capability.
12. **Por que capability em diretório gravável é crítico?** A capability é do arquivo ou do dono?
13. **Por que `cap_sys_admin` em binário comum é escolha preguiçosa?**
14. Para abrir porta < 1024, qual capability usar? E para `chroot`?
15. O que `seccomp` faz? Diferencie os modos 0, 1 e 2.
16. **Por que seccomp é defesa em profundidade**, e não prevenção de corrupção?
17. Que diretiva do `systemd` força `W^X`? Qual serviço ela pode quebrar?
18. O que `CapabilityBoundingSet` faz num unit?
19. **Diferencie capability excessiva de suspeita de comprometimento.** A ação muda?
20. Qual o cuidado ao testar diretiva de isolamento em produção?

---

**Próximo:** [Módulo 6 — Namespace e `cgroup`](modulo-06.md)
