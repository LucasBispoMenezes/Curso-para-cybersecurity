# Módulo 4 — Usuário, Grupo e Credencial

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Ler `/etc/passwd`, `/etc/shadow` e `/etc/group` e saber o que cada campo significa.
2. Entender PAM e onde a decisão de autenticação realmente acontece.
3. Auditar `sudoers` procurando o caminho de escalação clássico.
4. Reconhecer as formas de delegar privilégio, e por que cada uma vira porta.
5. Distinguir `sudo` mal configurado de conta mal configurada.

---

## ⚠ Antes de começar

⚠ **Este é o módulo onde a escalação mora.** `sudo` mal configurado é a causa número um de
escalação de privilégio em servidor Linux real — **mais que qualquer CVE de kernel**.

⚠ **E é o módulo mais fácil de errar na direção perigosa.** Encontrar uma regra `sudo` ampla na
**sua** VM é o exercício. **Usar `sudo` para ganhar privilégio em host de terceiro é o crime** —
e é o que o módulo 8 do curso de Enumeração já delimitou.

⚠ **O laboratório é a `linux-alvo`**, com a regra `sudo` deliberadamente ampla que o `ansible`
planta. Você a **encontra**, **classifica** e **corrige**. Não a usa.

---

## 4.1 Os três arquivos de identidade

⚠ **Tudo começa em três arquivos.** Eles são a fonte de verdade sobre quem existe no sistema.

```bash
mkdir -p ~/lab/mod04 && cd ~/lab/mod04

echo "═══ /etc/passwd — quem existe ═══"
head -5 /etc/passwd
echo "  ..."
echo "  usuários com shell de login:"
awk -F: '$7 !~ /(nologin|false)$/ {print "    " $1 "  uid=" $3 "  shell=" $7}' /etc/passwd

echo
echo "═══ /etc/shadow — a credencial ═══"
sudo head -3 /etc/shadow 2>/dev/null | sed 's/:[^:]*:/:HASH:/2'
echo "  ⚠ note que o campo 2 é o hash, e está protegido"

echo
echo "═══ /etc/group ═══"
head -5 /etc/group

echo
echo "═══ onde estão de verdade (pode ser NSS, não arquivo) ═══"
grep -E '^passwd|^shadow|^group' /etc/nsswitch.conf
```

### Os campos de `/etc/passwd`

```
usuario:x:1000:1000:Nome Completo:/home/usuario:/bin/bash
│       │ │    │    │              │            │
│       │ │    │    │              │            └─ shell de login
│       │ │    │    │              └─ home
│       │ │    │    └─ GECOS (nome, telefone...)
│       │ │    └─ gid primário
│       │ └─ uid
│       └─ senha (sempre 'x' hoje — está no shadow)
```

### Os campos de `/etc/shadow`

```
usuario:$6$salt$hash:19000:0:99999:7:::
│       │            │     │ │     │ │││
│       │            │     │ │     │ ││└─ data de expiração da conta
│       │            │     │ │     │ │└─ período de inatividade
│       │            │     │ │     │ └─ aviso antes de expirar
│       │            │     │ │     └─ máximo de dias da senha
│       │            │     └─ mínimo de dias
│       │            └─ último dia de mudança (epoch)
│       └─ HASH
└─ usuário
```

⚠ **O campo de hash tem prefixo que diz o algoritmo:**

| Prefixo | Algoritmo | Estado |
|---|---|---|
| `$1$` | MD5 | ⚠ **Obsoleto — quebrável** |
| `$5$` | SHA-256 | Aceitável |
| `$6$` | SHA-512 | ✓ Padrão atual |
| `$y$` | yescrypt | ✓ Melhor (Debian/Ubuntu recente) |
| `$2a$`/`$2b$` | bcrypt | ✓ Bom |
| `!` no início | Conta **bloqueada** | ✓ Esperado |
| `*` | **Nunca teve senha** | ✓ Normal para conta de serviço |
| **vazio** | ⚠ **Senha vazia — login sem senha** | ⚠⚠ **CRÍTICO** |

```bash
echo "═══ auditoria do /etc/shadow ═══"
echo
echo "── 1. contas com senha VAZIA (crítico) ──"
sudo awk -F: '$2 == "" {print "  ⚠⚠ " $1 " — SEM SENHA"}' /etc/shadow
echo "  (fim)"

echo
echo "── 2. contas com senha, por algoritmo ──"
sudo awk -F: '$2 ~ /^\$/ {
    if ($2 ~ /^\$1\$/) a="MD5 (⚠ obsoleto)";
    else if ($2 ~ /^\$5\$/) a="SHA-256";
    else if ($2 ~ /^\$6\$/) a="SHA-512";
    else if ($2 ~ /^\$y\$/) a="yescrypt";
    else if ($2 ~ /^\$2[aby]\$/) a="bcrypt";
    else a="desconhecido";
    print a
}' /etc/shadow | sort | uniq -c | sort -rn | sed 's/^/  /'

echo
echo "── 3. contas bloqueadas ──"
sudo awk -F: '$2 ~ /^[!*]/ {print "  " $1}' /etc/shadow | head -20

echo
echo "── 4. contas sem expiração ──"
sudo awk -F: '$8 == "" {print "  " $1 " — nunca expira"}' /etc/shadow | head -15
```

⚠ **A auditoria 1 é a mais grave.** Uma conta com senha vazia e shell de login **é login sem
senha** — e é achado de severidade crítica.

⚠ **E a auditoria 2 é achado de postura.** Uma conta com `$1$` (MD5) tem hash **quebrável em
minutos** com GPU moderna. **É vulnerabilidade real**, mesmo com senha forte.

⚠ **A auditoria 4 é a que quase ninguém faz.** Conta sem expiração significa que uma senha **vaza
hoje e vale para sempre** — e a rotação de credencial nunca acontece.

```bash
echo "═══ 5. uid 0 além do root ═══"
awk -F: '$3 == 0 {print "  " $0}' /etc/passwd
echo "  ⚠ qualquer conta com uid 0 É root, independente do nome"

echo
echo "═══ 6. usuário de sistema com shell de login ═══"
awk -F: '$3 < 1000 && $7 !~ /(nologin|false)$/ {print "  ⚠ " $1 "  uid=" $3 "  shell=" $7}' /etc/passwd
echo "  (fim — vazio é o esperado)"

echo
echo "═══ 7. contas sem home mas com shell ═══"
awk -F: '$7 ~ /bash|sh$/ && $6 != "" {print $1, $6}' /etc/passwd | while read -r u h; do
    [ -d "$h" ] || printf '  ⚠ %s: home %s não existe\n' "$u" "$h"
done | head -10
```

⚠ **A auditoria 5 é clássica e grave.** Uma conta com **uid 0** é `root`, mesmo com nome diferente —
e frequentemente é uma conta de backdoor, ou um serviço mal configurado que ganhou `uid 0` "para
funcionar".

⚠ **E a auditoria 6 é o inverso:** usuário de sistema (`uid < 1000`) com shell de login válido.
Serviço não precisa de shell — e **ter um significa mais uma porta**.

**Produza `identidade.md`:**

| Verificação | Achado | Quantidade | Risco |
|---|---|---|---|
| Senha vazia | | | |
| Hash obsoleto (`$1$`) | | | |
| `uid 0` além do `root` | | | |
| Usuário de sistema com shell | | | |
| Conta sem expiração | | | |
| Home inexistente | | | |

**Responda:**

1. **Alguma conta tem senha vazia?** É crítico.
2. Algum hash em **MD5** (`$1$`)? Por que é achado de vulnerabilidade e não de postura?
3. **Alguma conta com `uid 0` que não é `root`?**
4. Por que conta sem expiração é achado?

---

## 4.2 Credencial efetiva versus real, na prática

⚠ **Já visto no módulo 2 — aqui você vê o efeito no login.**

```bash
echo "═══ a credencial do shell ═══"
id
echo

echo "═══ o que o /proc diz ═══"
grep -E '^(Uid|Gid|Groups)' /proc/self/status

echo
echo "═══ a explicação ═══"
cat <<'EXPL'
  Uid: real  efetivo  salvo  fs
       1000  1000     1000   1000     ← você é você

  Num binário setuid-root executando:
  Uid: real  efetivo  salvo  fs
       1000  0        0      1000     ⚠ EFETIVO = root

  ⚠ o kernel decide permissão com o EFETIVO.
  ⚠ por isso setuid funciona.
  ⚠ o real continua 1000 — a identidade não mudou, o privilégio sim.
EXPL

echo
echo "═══ vendo isso num processo setuid de verdade ═══"
for b in /usr/bin/passwd /usr/bin/sudo /usr/bin/su; do
    [ -x "$b" ] || continue
    stat -c '  %A  %U:%G  %n' "$b"
done
```

⚠ **A tabela de credencial é o que permite entender tudo o que vem depois.** `setuid` (módulo 3),
capability (módulo 5) e namespace **de usuário** (módulo 6) são todos formas de manipular essa
tabela.

⚠ **E a linha do `salvo` é o mecanismo do retorno.** Um programa que precisa de privilégio por um
tempo pode **voltar ao real**, fazer o trabalho sem privilégio, e **retornar ao efetivo** depois —
usando `seteuid` com o valor do `salvo`. **É como `sudo` deixa de ser `root` depois de autenticar.**

```bash
echo "═══ demonstrando o modelo completo ═══"
cat > /tmp/cred.c <<'EOF'
#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>

static void mostra(const char *rotulo) {
    printf("  %-12s real=%d efetivo=%d\n", rotulo, getuid(), geteuid());
}

int main(void) {
    mostra("inicial");

    /* desce para o real (o que o programa faz depois de autenticar) */
    seteuid(getuid());
    mostra("após descer");

    /* ⚠ volta ao efetivo — só funciona por causa do 'salvo' */
    if (seteuid(0) == 0) {
        mostra("após voltar");
    } else {
        printf("  após voltar: FALHOU (sem privilégio salvo)\n");
    }
    return 0;
}
EOF

if command -v gcc >/dev/null; then
    gcc -Wall -o /tmp/cred /tmp/cred.c 2>/dev/null
    echo "  sem setuid:"
    /tmp/cred
    echo
    echo "  ⚠ com setuid (requer root para aplicar):"
    echo "     sudo chown root:root /tmp/cred && sudo chmod u+s /tmp/cred"
    echo "     /tmp/cred"
else
    echo "  (gcc indisponível)"
fi
```

**Produza `credencial.md`:**

| Situação | `real` | `efetivo` | `salvo` | Quem decide? |
|---|---|---|---|---|
| Shell comum | | | | |
| `setuid` root | | | | |
| Após `seteuid(getuid())` | | | | |

**Responda:**

1. Qual campo o kernel usa para **decidir permissão**?
2. Por que o `salvo` é necessário? **O que ele permite?**
3. O que `seteuid(getuid())` faz, e por que um programa privilegiado faria isso?
4. Por que `setuid` (módulo 3) e o `salvo` são o mesmo mecanismo?

---

## 4.3 PAM — onde a decisão realmente acontece

⚠ **PAM é o `Pluggable Authentication Modules`.** Ele **substitui** a verificação de senha direta —
e é onde `sudo`, `login`, `sshd` e `su` decidem se você passa.

```
  sshd/login/su/sudo
        │
        ▼
   ┌─────────┐
   │  PAM    │  ← a decisão real
   └────┬────┘
        │
   ┌────┴────────────────────────────────────┐
   │ pam_unix.so      senha no /etc/shadow   │
   │ pam_env.so       variável de ambiente   │
   │ pam_limits.so    ulimit                 │
   │ pam_nologin.so   bloqueio global        │
   │ pam_faillock.so  bloqueio após N falhas │
   │ pam_pwquality.so força da senha         │
   │ pam_tally2.so    contador de falha      │
   │ pam_ldap.so      autenticação remota    │
   │ pam_kerberos.so  Kerberos               │
   │ pam_mkhomedir.so cria home no login     │
   │ pam_exec.so      ⚠ EXECUTA PROGRAMA     │
   │ pam_script.so    ⚠ executa script       │
   └─────────────────────────────────────────┘
```

⚠ **As duas últimas linhas são o achado.** `pam_exec` e `pam_script` **executam programa** durante
a autenticação — e se o programa ou script for **gravável**, **qualquer usuário executa código no
contexto de quem autentica**. Frequentemente `root`.

```bash
echo "═══ módulos PAM instalados ═══"
ls /lib/*/security/pam_*.so 2>/dev/null | xargs -n1 basename | sort | head -30
echo "  total: $(ls /lib/*/security/pam_*.so 2>/dev/null | wc -l)"

echo
echo "═══ configuração PAM do sshd ═══"
cat /etc/pam.d/sshd 2>/dev/null | grep -vE '^#|^$' | head -20

echo
echo "═══ configuração PAM do sudo ═══"
cat /etc/pam.d/sudo 2>/dev/null | grep -vE '^#|^$'

echo
echo "═══ configuração PAM do login ═══"
cat /etc/pam.d/login 2>/dev/null | grep -vE '^#|^$' | head -20
```

### As quatro colunas de uma linha PAM

```
auth   required   pam_unix.so   nullok
│      │          │             │
│      │          │             └─ argumento do módulo
│      │          └─ O MÓDULO
│      └─ CONTROLE: o que fazer com o resultado
└─ TIPO: auth, account, password, session
```

| Controle | Significa |
|---|---|
| `required` | Precisa passar; falha **não** para imediatamente |
| `requisite` | Precisa passar; falha **para imediatamente** |
| `sufficient` | Se passar, **libera** — não precisa dos seguintes |
| `optional` | Não é decisivo |
| `[success=1 default=ignore]` | Controle avançado |

⚠ **`nullok` é o argumento que produz achado.** Ele diz ao `pam_unix` que **senha vazia é
aceita** — ou seja, **conta sem senha autentica sem senha**. **É a configuração que transforma a
auditoria 1 do §4.1 em exploração.**

```bash
echo "═══ ⚠ caça ao nullok ═══"
grep -rn 'nullok' /etc/pam.d/ 2>/dev/null | sed 's/^/  /'
echo "  ⚠ nullok aceita senha VAZIA — combinado com conta sem senha, é login livre"

echo
echo "═══ ⚠ caça ao pam_exec / pam_script ═══"
grep -rnE 'pam_(exec|script)' /etc/pam.d/ 2>/dev/null | sed 's/^/  /'
echo "  ⚠ se o programa apontado for gravável, é execução como quem autentica"

echo
echo "═══ política de senha ═══"
for f in /etc/security/pwquality.conf /etc/security/pam_pwquality.conf; do
    [ -f "$f" ] && { echo "  [${f}]"; grep -vE '^#|^$' "$f" | head -12 | sed 's/^/    /'; }
done

echo
echo "═══ bloqueio após tentativas falhas ═══"
grep -rnE 'pam_(faillock|tally)' /etc/pam.d/ 2>/dev/null | sed 's/^/  /'
echo "  ⚠ sem faillock, brute force de senha não tem limite"
```

⚠ **O `nullok` é o achado mais direto do módulo.** Ele permite autenticar sem senha. **E a
combinação é fatal:** conta com senha vazia **e** `nullok` no PAM = **login sem nenhuma
credencial**.

⚠ **`pam_faillock` ausente é achado de postura.** Sem bloqueio, um ataque de força bruta de senha
**não tem limite** — e é a forma mais comum de comprometer SSH.

**Produza `pam.md`:**

| Verificação | Encontrado | Risco | Correção |
|---|---|---|---|
| `nullok` em qualquer arquivo | | | |
| `pam_exec` / `pam_script` | | | |
| `pam_faillock` presente | | | |
| Política de senha | | | |
| Módulo de autenticação remota | | | |

**Responda:**

1. **Achou `nullok`?** Em qual arquivo, e o que isso permite?
2. Achou `pam_exec` ou `pam_script`? **O programa é gravável?**
3. O `pam_faillock` está configurado? **Se não, o que isso permite?**
4. **Por que PAM é onde a decisão acontece**, e não no `/etc/shadow`?

---

## 4.4 `sudoers` — o caminho de escalação clássico

⚠ **Este é o arquivo mais perigoso do sistema.** Uma linha mal escrita é `root` para quem a
encontrar.

```bash
echo "═══ a minha regra de sudo ═══"
sudo -l 2>/dev/null || echo "  (requer senha)"

echo
echo "═══ o arquivo ═══"
sudo cat /etc/sudoers 2>/dev/null | grep -vE '^#|^$' | head -40

echo
echo "═══ os arquivos em sudoers.d ═══"
ls -la /etc/sudoers.d/ 2>/dev/null
for f in /etc/sudoers.d/*; do
    [ -f "$f" ] || continue
    echo "  ── ${f} ──"
    sudo cat "$f" 2>/dev/null | grep -vE '^#|^$' | sed 's/^/    /'
done
```

### A anatomia de uma linha

```
Usuario  Host = (RunAs_User:RunAs_Group)  NOPASSWD:  Comando
│        │    │                            │          │
│        │    │                            │          └─ o que executa
│        │    │                            └─ se exige senha
│        │    └─ como quem executa (root, por padrão)
│        └─ em qual host
└─ quem
```

⚠ **As três formas de perigo:**

| Forma | Exemplo | Por quê é perigoso |
|---|---|---|
| **`NOPASSWD` com comando amplo** | `u ALL=(ALL) NOPASSWD: ALL` | `root` completo, sem senha |
| **Comando com *wildcard* amplo** | `/usr/bin/systemctl *` | Qualquer serviço, inclusive perigoso |
| **Comando que executa outro** | `vim`, `less`, `find`, `awk` | Escapa para shell |
| **`SETENV` com `LD_PRELOAD`** | permite variável de ambiente | Carrega biblioteca arbitrária |
| **Editor e paginador** | `nano`, `vi`, `more` | `:!sh` no vi = shell |
| **`ALL=(ALL) NOPASSWD:` + binário com escape** | | `GTFOBins` lista centenas |

⚠ **A linha do wildcard é a mais sutil.** `sudo systemctl *` **parece** limitado — mas o usuário
pode rodar `systemctl link` com unit arbitrário, e **a unit executa como `root`**. **O wildcard
destrói a restrição.**

⚠ **E a linha do comando que executa outro é a clássica.** `sudo vim` permite `:!sh` — **shell como
`root`**. `sudo less` permite `!sh`. `sudo find / -exec sh \;` — **shell como `root`**.

```bash
echo "═══ caça aos padrões perigosos no sudoers ═══"
echo

sudo cat /etc/sudoers /etc/sudoers.d/* 2>/dev/null | grep -vE '^#|^$' > /tmp/sudoers-efetivo.txt

echo "── 1. NOPASSWD ──"
grep -n 'NOPASSWD' /tmp/sudoers-efetivo.txt | sed 's/^/  ⚠ /' || echo "  (nenhum)"

echo
echo "── 2. ALL=(ALL) ALL — root completo ──"
grep -nE 'ALL\s*=\s*\(ALL(:ALL)?\)\s*(NOPASSWD:\s*)?ALL' /tmp/sudoers-efetivo.txt | sed 's/^/  ⚠ /' || echo "  (nenhum)"

echo
echo "── 3. WILDCARD em comando ──"
grep -nE ':\s*[^,]*\*' /tmp/sudoers-efetivo.txt | sed 's/^/  ⚠ /' || echo "  (nenhum)"

echo
echo "── 4. binários com escape conhecido (GTFOBins) ──"
for bin in vi vim nano emacs less more man find awk sed python python3 perl \
           ruby irb lua node nc ncat socat tar zip unzip git svn \
           env systemctl journalctl apt dpkg docker nmap tcpdump \
           chmod chown mount umount passwd; do
    grep -qE "/${bin}(\s|$|\*)" /tmp/sudoers-efetivo.txt 2>/dev/null && \
        printf '  ⚠ /%s\n' "$bin"
done

echo
echo "── 5. SETENV ──"
grep -n 'SETENV' /tmp/sudoers-efetivo.txt | sed 's/^/  ⚠ /' || echo "  (nenhum)"

echo
echo "── 6. comandos que executam outro ──"
grep -nE '/(sh|bash|zsh|ksh|csh)(\s|$)' /tmp/sudoers-efetivo.txt | sed 's/^/  ⚠⚠ /' || echo "  (nenhum)"
```

⚠ **A seção 4 é a mais reveladora e a mais útil.** Ela checa contra a lista do **GTFOBins** — o
catálogo público de binários que escapam para shell. **E a recomendação é defensiva:** são os
binários que **não devem estar numa regra `sudo`**.

⚠ **E a seção 6 é crítico imediato.** `sudo` para `sh`/`bash` **é `sudo` para tudo** — porque a
partir do shell você faz qualquer coisa.

```bash
echo "═══ o insight do wildcard ═══"
cat <<'EXPL'
  Regra: usuario ALL=(ALL) NOPASSWD: /usr/bin/systemctl *

  Parece limitado a "gerenciar serviços".
  Na prática:
    1. usuário cria /tmp/evil.service com ExecStart=/bin/bash
    2. sudo systemctl link /tmp/evil.service
    3. sudo systemctl start evil.service
    4. → shell como ROOT

  ⚠ o wildcard não restringe nada.
  ⚠ a restrição só funciona quando o comando NÃO consegue executar outro.
EXPL
```

⚠ **O exemplo é o argumento do módulo.** A regra **parece** restrita; e a restrição não existe,
porque o comando autorizado tem **capacidade de executar outra coisa**. **É o conceito que o
relatório precisa explicar** — não basta listar a regra.

**Produza `sudoers.md`:**

| Regra | Usuário | NOPASSWD? | Comando | Perigo | Por quê |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |

**Responda:**

1. **Quantas regras `NOPASSWD`?** Alguma dá `root` completo?
2. Alguma usa **wildcard**? **Ela restringe de fato?**
3. Algum binário da lista GTFOBins? Qual?
4. **Explique, em três passos, como a regra mais perigosa vira `root`.** (Raciocínio, não execução.)

⚠ **A resposta 4 é o que o relatório exige.** O cliente não quer "achado: regra ampla". Quer
**"esta regra permite `root` por este caminho, e a correção é esta"**.

---

## 4.5 Delegação — as formas de dar privilégio

⚠ **Todo mecanismo de delegar privilégio é um risco. A tabela completa:**

| Mecanismo | Como funciona | Risco |
|---|---|---|
| **`sudo`** | Executa como outro usuário | **O mais comum de errar** |
| **`setuid`** | Binário executa como dono | Módulo 3 |
| **Capability** | Privilégio granular sem `root` | Módulo 5 |
| **`polkit`** | Autorização por policy, para desktop/serviço | Regra ampla em `/usr/share/polkit-1/rules.d/` |
| **`pkexec`** | `sudo` do polkit | Frequentemente `setuid` |
| **`cron`** | Executa agendado | ⚠ **Caminho relativo e arquivo gravável** |
| **`systemd`** | Serviço como outro usuário | `User=` ausente = `root` |
| **ACL** | Permissão por usuário | Módulo 3 |

⚠ **`polkit` merece atenção porque é pouco auditado.** Ele é o mecanismo do desktop, e frequentemente
tem regra que permite a usuário **ativo localmente** executar ação administrativa **sem senha**.

```bash
echo "═══ polkit — o delegador esquecido ═══"
ls /etc/polkit-1/rules.d/ /usr/share/polkit-1/rules.d/ 2>/dev/null | head -20

echo
echo "  regras que permitem sem autenticação:"
for d in /etc/polkit-1/rules.d /usr/share/polkit-1/rules.d; do
    [ -d "$d" ] || continue
    grep -l 'YES\|no.*auth' "$d"/*.rules 2>/dev/null | head -5 | sed 's/^/    /'
done

echo
echo "  ⚠ pkexec é setuid?"
stat -c '  %A %U:%G %n' /usr/bin/pkexec 2>/dev/null

echo
echo "═══ cron — a delegação por tempo ═══"
echo "  crontab de usuário:"
ls -la /var/spool/cron/crontabs/ 2>/dev/null | head -10
echo
echo "  cron do sistema:"
for f in /etc/crontab /etc/cron.d/*; do
    [ -f "$f" ] || continue
    printf '  %s  [%s %s]\n' "$(stat -c '%A %U:%G' "$f")" "$f" "$(basename "$f")"
    grep -vE '^#|^$|^[A-Z]' "$f" 2>/dev/null | head -3 | sed 's/^/      /'
done

echo
echo "═══ ⚠ o padrão de cron que gera escalação ═══"
cat <<'EXPL'
  Caminho RELATIVO no cron:
    */5 * * * * backup.sh          ← sem caminho absoluto

    → o cron procura no PATH
    → se um diretório do PATH do cron é gravável, você controla o comando
    → ele roda como ROOT

  Script em diretório GRAVÁVEL:
    */5 * * * * /home/usuario/script.sh

    → mas se o script (ou o diretório) é gravável por outro usuário
    → esse outro usuário edita o script
    → e ele roda como ROOT

  ⚠ verificar: todo comando do cron tem caminho absoluto?
  ⚠ todo script apontado é NÃO gravável por outros?
EXPL
```

⚠ **O padrão do cron é o mais subestimado.** Um `backup.sh` **sem caminho absoluto** executa o que
estiver no `PATH` do cron — e o `PATH` pode ter diretório gravável. **É escalação por
configuração, e nenhum scanner encontra.**

```bash
echo "═══ auditoria de cron ═══"
echo
echo "── caminho relativo em comando de cron ──"
for f in /etc/crontab /etc/cron.d/*; do
    [ -f "$f" ] || continue
    grep -vE '^#|^$|^[A-Z]|^[a-z]+=' "$f" 2>/dev/null | while read -r linha; do
        cmd=$(printf '%s' "$linha" | awk '{for(i=6;i<=NF;i++) printf "%s ", $i}')
        case "$cmd" in
            /*) ;;                                    # absoluto, ok
            ?*) printf '  ⚠ %s: %s\n' "$f" "$cmd" ;;  # relativo!
        esac
    done
done
echo "  (fim)"

echo
echo "── script de cron gravável por outros ──"
for f in /etc/crontab /etc/cron.d/*; do
    [ -f "$f" ] || continue
    grep -oE '/[a-zA-Z0-9_/.-]+\.(sh|py|pl)' "$f" 2>/dev/null | while read -r s; do
        [ -e "$s" ] || continue
        if [ -w "$s" ]; then
            printf '  ⚠⚠ %s é GRAVÁVEL\n' "$s"
        else
            d=$(dirname "$s")
            [ -w "$d" ] && printf '  ⚠⚠ diretório %s é GRAVÁVEL (script %s)\n' "$d" "$s"
        fi
    done
done
echo "  (fim)"

echo
echo "── diretórios do PATH do cron que são graváveis ──"
grep -E '^PATH=' /etc/crontab 2>/dev/null
for d in /usr/local/sbin /usr/local/bin /usr/sbin /usr/bin /sbin /bin; do
    [ -d "$d" ] && [ -w "$d" ] && printf '  ⚠ %s é GRAVÁVEL\n' "$d"
done
echo "  (fim)"
```

**Produza `delegacao.md`:**

| Mecanismo | Regra encontrada | Risco | Correção |
|---|---|---|---|
| `sudo` | | | |
| `polkit` | | | |
| `pkexec` | | | |
| `cron` (caminho) | | | |
| `cron` (script) | | | |
| `systemd` | | | |

**Responda:**

1. **Quantos `pkexec`/`polkit` setuid existem?**
2. Algum comando de cron com **caminho relativo**?
3. Algum script de cron **gravável**?
4. **Explique como o cron de caminho relativo vira `root`.**

---

## 4.6 LAB — Auditoria de identidade e delegação

**Duração:** 120 min

### Passo 1 — Auditoria de conta (35 min)

```bash
cd ~/lab/mod04

cat > audita-contas.sh <<'SCRIPT'
#!/usr/bin/env bash
# audita-contas.sh — auditoria de identidade, credencial e delegação
set -uo pipefail

SAIDA="${1:-contas.txt}"

{
    echo "═══════════ AUDITORIA DE IDENTIDADE ═══════════"
    echo "host: $(hostname)   data: $(date -Is)"
    echo

    echo "── 1. SENHA VAZIA (CRÍTICO) ──"
    awk -F: '$2 == "" {print "  ⚠⚠ " $1}' /etc/shadow
    echo

    echo "── 2. ALGORITMO DE HASH ──"
    awk -F: '$2 ~ /^\$/ {
        if ($2 ~ /^\$1\$/) a="MD5 ⚠";
        else if ($2 ~ /^\$5\$/) a="SHA-256";
        else if ($2 ~ /^\$6\$/) a="SHA-512";
        else if ($2 ~ /^\$y\$/) a="yescrypt";
        else if ($2 ~ /^\$2[aby]\$/) a="bcrypt";
        else a="outro";
        print a
    }' /etc/shadow | sort | uniq -c | sort -rn | sed 's/^/  /'
    echo

    echo "── 3. UID 0 ALÉM DO ROOT ──"
    awk -F: '$3 == 0 {print "  ⚠ " $1}' /etc/passwd
    echo

    echo "── 4. USUÁRIO DE SISTEMA COM SHELL ──"
    awk -F: '$3 < 1000 && $7 !~ /(nologin|false)$/ {print "  ⚠ " $1 " (" $7 ")"}' /etc/passwd
    echo

    echo "── 5. CONTAS SEM EXPIRAÇÃO ──"
    awk -F: '$8 == "" {print "  " $1}' /etc/shadow | head -20
    echo

    echo "── 6. GRUPO SUDO/ADM ──"
    for g in sudo adm wheel docker lxd; do
        membros=$(getent group "$g" 2>/dev/null | cut -d: -f4)
        [ -n "$membros" ] && printf '  %-8s → %s\n' "$g" "$membros"
    done
    echo

    echo "── 7. PAM: nullok ──"
    grep -rn 'nullok' /etc/pam.d/ 2>/dev/null | sed 's/^/  ⚠ /'
    echo

    echo "── 8. PAM: exec/script ──"
    grep -rnE 'pam_(exec|script)' /etc/pam.d/ 2>/dev/null | sed 's/^/  ⚠ /'
    echo

    echo "── 9. PAM: faillock ──"
    if grep -rq 'pam_faillock' /etc/pam.d/ 2>/dev/null; then
        echo "  ✓ presente"
        grep -rn 'pam_faillock' /etc/pam.d/ 2>/dev/null | head -4 | sed 's/^/    /'
    else
        echo "  ⚠ AUSENTE — brute force sem limite"
    fi
    echo

    echo "── 10. SUDOERS ──"
    cat /etc/sudoers 2>/dev/null | grep -vE '^#|^$' | sed 's/^/  /'
    for f in /etc/sudoers.d/*; do
        [ -f "$f" ] || continue
        echo "  ── ${f} ──"
        cat "$f" 2>/dev/null | grep -vE '^#|^$' | sed 's/^/    /'
    done
    echo

    echo "── 11. SUDOERS: NOPASSWD ──"
    cat /etc/sudoers /etc/sudoers.d/* 2>/dev/null | grep -n 'NOPASSWD' | sed 's/^/  ⚠ /'
    echo

    echo "── 12. SUDOERS: GTFOBins conhecidos ──"
    ef=$(mktemp); cat /etc/sudoers /etc/sudoers.d/* 2>/dev/null > "$ef"
    for b in vi vim nano less more find awk sed python3 perl ruby \
             env systemctl docker tar git nc socat bash sh; do
        grep -qE "/${b}(\s|$|\*)" "$ef" 2>/dev/null && printf '  ⚠ /%s\n' "$b"
    done
    rm -f "$ef"
    echo

    echo "── 13. CRON: caminho relativo ──"
    for f in /etc/crontab /etc/cron.d/*; do
        [ -f "$f" ] || continue
        grep -vE '^#|^$|^[A-Z]|^[a-z]+=' "$f" 2>/dev/null | while read -r l; do
            c=$(printf '%s' "$l" | awk '{for(i=6;i<=NF;i++) printf "%s ", $i}')
            case "$c" in /*) ;; ?*) printf '  ⚠ %s: %s\n' "$f" "$c" ;; esac
        done
    done
    echo

    echo "── 14. CRON: script gravável ──"
    for f in /etc/crontab /etc/cron.d/*; do
        [ -f "$f" ] || continue
        grep -oE '/[a-zA-Z0-9_/.-]+\.(sh|py|pl)' "$f" 2>/dev/null | while read -r s; do
            [ -e "$s" ] || continue
            if [ -w "$s" ]; then printf '  ⚠⚠ %s gravável\n' "$s"
            else d=$(dirname "$s"); [ -w "$d" ] && printf '  ⚠⚠ %s gravável (dir de %s)\n' "$d" "$s"; fi
        done
    done
    echo

    echo "── 15. GRUPO COM PODER IMPLÍCITO ──"
    for g in docker lxd disk adm sudo wheel; do
        members=$(getent group "$g" 2>/dev/null | cut -d: -f4)
        if [ -n "$members" ]; then
            case "$g" in
                docker|lxd) printf '  ⚠⚠ grupo %s → %s (equivale a root)\n' "$g" "$members" ;;
                disk)       printf '  ⚠⚠ grupo %s → %s (lê disco cru)\n' "$g" "$members" ;;
                *)          printf '  ·  grupo %s → %s\n' "$g" "$members" ;;
            esac
        fi
    done

} > "$SAIDA" 2>&1

echo "salvo em ${SAIDA} ($(wc -l < "$SAIDA") linhas)"
SCRIPT

chmod +x audita-contas.sh
sudo ./audita-contas.sh contas.txt
head -80 contas.txt
```

⚠ **A seção 15 é o achado que mais surpreende.** Pertencer ao grupo **`docker`** significa poder
montar o sistema de arquivos do host num contêiner — **e portanto `root`**. O grupo `disk` permite
ler o disco cru. **Ninguém audita grupo.**

Produza `auditoria-contas.md`:

| Seção | Achado | Quantidade | Risco |
|---|---|---|---|
| 1 — senha vazia | | | |
| 2 — hash | | | |
| 3 — `uid 0` | | | |
| 4 — shell de sistema | | | |
| 5 — sem expiração | | | |
| 6 — grupo sudo | | | |
| 7 — `nullok` | | | |
| 10/11 — `sudoers` | | | |
| 12 — GTFOBins | | | |
| 13/14 — cron | | | |
| **15 — grupo poderoso** | | | |

**Responda:**

1. **Quantos achados nas quinze seções?**
2. Que seção você **não teria pensado** em auditar?
3. Algum usuário no grupo `docker`/`lxd`/`disk`? **Por que isso é `root`?**
4. Qual achado é de **vulnerabilidade** e qual é de **postura**?

### Passo 2 — A regra `sudo` plantada (35 min)

⚠ **A `linux-alvo` tem a regra ampla que o `ansible` do curso planta.** Encontre-a e classifique.

```bash
cd ~/lab/mod04

echo "═══ procurando a regra plantada ═══"
sudo ./audita-contas.sh contas-alvo.txt >/dev/null 2>&1

echo "── regras NOPASSWD ──"
grep -A2 'NOPASSWD' contas-alvo.txt | head -20

echo
echo "── regras com wildcard ──"
grep -n '\*' contas-alvo.txt | grep -E 'ALL|/usr' | head -10

echo
echo "── binários da lista GTFOBins ──"
sed -n '/GTOBins\|GTFOBins/,/^$/p' contas-alvo.txt | head -15

echo
echo "═══════════ ANÁLISE DA REGRA MAIS PERIGOSA ═══════════"
cat <<'EXPL'
  Para a regra mais perigosa que você encontrar, responda:

  1. QUEM pode?              (usuário ou grupo)
  2. COMO?                   (com senha, ou NOPASSWD)
  3. O QUE?                  (comando exato)
  4. O comando EXECUTA outro? (se sim, é root completo)
  5. Se não executa: existe opção do comando que executa?
  6. A restrição REAL é o quê?  (provavelmente nada)
  7. Caminho para root:       (descreva em passo, sem executar)
  8. Correção:                (o comando que resolve, ou a regra reescrita)
EXPL
```

Produza `regra-perigosa.md`:

| Campo | Valor |
|---|---|
| Quem pode | |
| Com senha? | |
| Comando exato | |
| Executa outro comando? | |
| Opção alternativa que executa? | |
| Restrição real | |
| Caminho para `root` (raciocínio) | |
| Correção | |

**Responda:**

1. **Qual é a regra mais perigosa** da `linux-alvo`?
2. Ela **executa outro comando** diretamente, ou por opção?
3. **Você executou o caminho?** Confirme que **não**.
4. **Qual correção você recomenda?** Escreva a linha nova.

⚠ **A resposta 3 é a linha do módulo.** Você **descreve** o caminho; **não executa**. A diferença
entre encontrar e usar é a diferença entre auditoria e ataque — e a VM tem a regra **de propósito**
para que você a pratique sem consequência. **O hábito é o que importa.**

### Passo 3 — Relatório e correção (50 min)

Produza `relatorio-identidade.md`:

```markdown
# Auditoria de identidade e delegação — [host]

## 1. Método e data
## 2. Dimensões auditadas
| Dimensão | Verificados | Achados | Críticos |
|---|---|---|---|
| Conta e senha | | | |
| Hash | | | |
| uid | | | |
| Shell | | | |
| Expiração | | | |
| Grupo | | | |
| PAM | | | |
| sudoers | | | |
| polkit | | | |
| cron | | | |
| systemd | | | |

## 3. Achados críticos
| # | Achado | Evidência | Classificação | Correção |
|---|---|---|---|---|

## 4. Achados médios
## 5. Achados de postura
## 6. O que verifiquei e está correto
## 7. O que NÃO foi verificado
⚠ Mínimo 3:
- regra em servidor de diretório (LDAP/AD) — fora do escopo
- política de senha efetiva na autenticação remota
- auditoria de cada serviço individualmente
```

⚠ **A seção 3 exige a coluna "classificação"**, que separa:

| Classificação | Significado | Exemplo |
|---|---|---|
| **Vulnerabilidade** | Explorável como está | Senha vazia, `NOPASSWD: ALL` |
| **Má configuração** | Aumenta risco, precisa contexto | Hash MD5, sem expiração |
| **Postura** | Boa prática ausente | Sem `pam_faillock` |

⚠ **E a correção, escrita como comando:**

```bash
cat <<'EXPL'
═══ CORREÇÕES — os comandos ═══

1. Senha vazia:
     sudo passwd -l usuario          # bloqueia a conta
     # ou: sudo passwd usuario       # define senha

2. Hash obsoleto:
     # força troca na próxima sessão:
     sudo chage -d 0 usuario
     # e ajuste o algoritmo em /etc/login.defs e /etc/pam.d/common-password

3. uid 0 indevido:
     sudo usermod -u 1001 usuario    # muda o uid
     # ⚠ antes: confira arquivos do usuário com  find / -uid 0

4. nullok no PAM:
     sudo sed -i 's/\bnullok\b//g' /etc/pam.d/*
     # ⚠ muito cuidado: teste o login em outra sessão ANTES de fechar a atual

5. pam_faillock:
     sudo apt install libpam-modules
     # configure em /etc/security/faillock.conf:
     #   deny = 5
     #   unlock_time = 900

6. sudoers NOPASSWD amplo:
     sudo visudo
     # troque:
     #   usuario ALL=(ALL) NOPASSWD: ALL
     # por:
     #   usuario ALL=(ALL) /usr/bin/comando-especifico
     # ⚠ e o comando NÃO deve executar outro

7. Comando que executa outro:
     # substitua por wrapper que valida o argumento:
     #   Cmnd_Alias X = /usr/local/bin/wrapper
     # com o wrapper checando o que recebe

8. Cron com caminho relativo:
     sudo visudo -c                       # valida sintaxe, não cron
     # edite o crontab e use caminho ABSOLUTO:
     #   */5 * * * * /usr/local/bin/backup.sh

9. Script de cron gravável:
     sudo chown root:root /caminho/script.sh
     sudo chmod 755 /caminho/script.sh
     # e o DIRETÓRIO também: chmod 755 no dir

10. Grupo docker/lxd/disk:
     sudo deluser usuario docker
     # ⚠ avalie se a pessoa precisa; se sim, use rootless docker

11. umask de serviço:
     sudo systemctl edit nome.service
     # adicione [Service]  UMask=0027
EXPL
```

**Responda:**

1. **Quantos achados críticos?** Quantos se corrigem com **um comando**?
2. **Qual correção pode te trancar fora do sistema?** Como você se protege?
3. Qual achado você classificaria como **vulnerabilidade** vs. **postura**?
4. **O que não foi verificado**, e o que isso significa?

⚠ **A resposta 2 é prática e crítica.** Corrigir `nullok` ou `sudoers` **pode impedir o seu próprio
acesso**. **Sempre mantenha uma sessão de `root` aberta** enquanto corrige autenticação. **É a
regra de ouro de mexer em `sudoers`.**

### Critérios de aceitação

- `audita-contas.sh` rodando com `sudo`, com as **quinze seções**.
- Você identificou **senha vazia**, **hash por algoritmo** e **`uid 0` indevido** (mesmo que vazio).
- `credencial.md` com os três cenários e o `salvo` explicado.
- `pam.md` com `nullok`, `pam_exec` e `faillock` verificados.
- `sudoers.md` com **todas** as regras, e a coluna "por quê" preenchida.
- Você explicou **em três passos** como a regra perigosa vira `root` — **sem executar**.
- `delegacao.md` com `polkit`, `cron` e `systemd` cobertos.
- Você identificou **grupo poderoso** (`docker`/`lxd`/`disk`) e explicou por que é `root`.
- `regra-perigosa.md` com a **análise de oito campos**.
- Você confirmou **não ter executado** o caminho de escalação.
- `relatorio-identidade.md` com a coluna **classificação** e a seção 7 com três itens.
- Cada achado com a **correção em comando**.

---

## Avaliação

1. Descreva os sete campos de `/etc/passwd` e os de `/etc/shadow`.
2. Como o prefixo de hash indica o algoritmo? Qual é o obsoleto e por quê?
3. **Por que conta com senha vazia é crítico?** E o que `nullok` faz com isso?
4. **Por que conta com `uid 0` é `root`**, independente do nome?
5. Por que usuário de sistema com shell de login é achado?
6. Por que conta **sem expiração** é achado de postura?
7. Explique `real`, `efetivo`, `salvo` e `fs`. Qual o kernel usa?
8. O que `seteuid(getuid())` faz, e por que um programa privilegiado faria isso?
9. Diferencie `required`, `requisite` e `sufficient` no controle PAM.
10. **Por que `pam_exec` ou `pam_script` é achado** quando o programa é gravável?
11. Por que `pam_faillock` ausente é achado? O que ele previne?
12. Descreva a anatomia de uma linha de `sudoers`.
13. **Por que `NOPASSWD: ALL` é `root` completo**, e por que `NOPASSWD` num comando específico
    ainda pode ser?
14. **Por que o wildcard em `sudoers` não restringe nada?** Dê um exemplo.
15. Por que `sudo` para `vim`, `less` ou `find` é `root`?
16. **Por que `cron` com caminho relativo vira escalação?**
17. **Por que pertencer ao grupo `docker` equivale a `root`?** E `disk`?
18. **O que é `polkit`, e por que é pouco auditado?**
19. Qual a correção de `sudoers`, e qual o cuidado antes de aplicá-la?
20. Diferencie achado de **vulnerabilidade**, **má configuração** e **postura**.

---

**Próximo:** [Módulo 5 — Capability e `seccomp`](modulo-05.md)
