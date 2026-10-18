# Módulo 3 — Permissão: os Doze Bits

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Ler os **doze bits** de permissão, incluindo `setuid`, `setgid` e sticky.
2. Entender `umask` e por que ele cria arquivo permissivo sem ninguém notar.
3. Auditar `setuid`/`setgid` por **necessidade**, não por existência.
4. Usar ACL e entender por que ela escapa da auditoria de `ls`.
5. Reconhecer o que `find -perm` **não** encontra.

---

## ⚠ Antes de começar

⚠ **`chmod 755` é o começo, não o fim.** O modelo de permissão do Linux tem **doze bits**, e a
maioria das auditorias olha só os nove primeiros.

```
  permissão especial  ┌────┐
                      │suid│ sgid │ sticky
                      └────┘
  1 1 1  1 1 1  1 1 1    ← os nove bits clássicos
  │ │ │  │ │ │  │ │ │
  │ │ │  │ │ │  │ │ └─ outros: execução
  │ │ │  │ │ │  │ └─── outros: escrita
  │ │ │  │ │ │  └───── outros: leitura
  │ │ │  │ │ └──────── grupo: execução
  │ │ │  │ └────────── grupo: escrita
  │ │ │  └──────────── grupo: leitura
  │ │ └─────────────── dono: execução
  │ └───────────────── dono: escrita
  └─────────────────── dono: leitura
```

⚠ **E a ACL adiciona uma camada que `ls` não mostra.** Um arquivo `640` pode ter entrada de ACL
dando `rw` a um usuário específico — **e você não vê no `ls -l`**.

⚠ **A regra do módulo:** você audita **a sua VM**. Um `setuid` achado na sua máquina é material de
relatório; o **uso** dele para ganhar privilégio é o módulo que vem depois, e só faz sentido em
laboratório.

---

## 3.1 Os nove bits clássicos — e o que eles realmente significam

⚠ **Permissão de arquivo depende de três coisas:** do **`Uid` efetivo** de quem pede, do **`Gid`**
de quem pede, e de **quem é o dono**. A regra é: **o primeiro que casar decide.**

```
Para abrir /etc/shadow como leitura:

  1. O uid efetivo é o DONO do arquivo?
       sim → usa os bits do DONO. Fim.
  2. O gid efetivo é o GRUPO do arquivo?
       sim → usa os bits do GRUPO. Fim.
  3. Nenhum dos dois?
       → usa os bits de OUTROS.
```

⚠ **A consequência que confunde:** se você é dono do arquivo, **os bits de grupo e outros são
irrelevantes para você** — mesmo que sejam menores. É por isso que `chmod 000` num arquivo seu
ainda permite... **nada**, porque o dono também precisa dos bits. **Mas o `root` passa por cima de
tudo** (`CAP_DAC_OVERRIDE`).

```bash
mkdir -p ~/lab/mod03 && cd ~/lab/mod03

echo "═══ os nove bits em demonstração ═══"
mkdir -p demo && cd demo

echo "conteudo" > arquivo.txt
chmod 640 arquivo.txt

echo "  arquivo criado: $(stat -c '%A %U:%G %n' arquivo.txt)"
echo

echo "── quem passa? ──"
printf '  dono (leitura)   : %s\n' "$([ -r arquivo.txt ] && echo sim || echo não)"
printf '  dono (escrita)   : %s\n' "$([ -w arquivo.txt ] && echo sim || echo não)"
printf '  dono (execução)  : %s\n' "$([ -x arquivo.txt ] && echo sim || echo não)"
printf '  qualquer um (exe): %s\n' "$(stat -c %a arquivo.txt | tail -c2 | grep -qE '[1357]' && echo sim || echo não)"

echo
echo "── bit por bit ──"
stat -c '%A  %a  %U:%G  %n' arquivo.txt
python3 - <<'PY'
import os
st = os.stat("arquivo.txt").st_mode
print(f"  modo octal: {st & 0o7777:04o}")
print(f"  dono : {bin((st >> 6) & 7)[2:].zfill(3)}")
print(f"  grupo: {bin((st >> 3) & 7)[2:].zfill(3)}")
print(f"  outros: {bin(st & 7)[2:].zfill(3)}")
PY
```

⚠ **E o ponto que quase ninguém pensa:** o **dono pode sempre mudar a permissão** — mesmo sem ter
`w` no arquivo. **O dono do arquivo tem controle total sobre a permissão dele.** Um arquivo
`r--r--r--` com você como dono é somente-leitura **para o conteúdo**, mas você pode `chmod` a
qualquer momento.

**Produza `nove-bits.md`:**

| Modo | Dono pode ler? | Grupo pode ler? | Outros podem ler? | Quem passa? |
|---|---|---|---|---|
| `644` | | | | |
| `640` | | | | |
| `600` | | | | |
| `700` | | | | |
| `444` | | | | |

**Responda:**

1. No modo `640`, o **dono** pode escrever? Por quê?
2. Se você é dono de um `000`, você pode ler? **Teste.**
3. Por que o `root` passa por cima das permissões? Qual mecanismo?
4. O **dono** de um arquivo pode mudar a permissão dele? Mesmo sem `w`?

---

## 3.2 Os três bits especiais

⚠ **`setuid`, `setgid` e sticky — o que cada um faz, e por que `setuid` é o mais perigoso.**

| Bit | Octal | No arquivo | Em diretório |
|---|---|---|---|
| **`setuid`** | 4000 | **Executa como o dono** | ⚠ Irrelevante |
| **`setgid`** | 2000 | Executa como o **grupo** do dono | **Novo arquivo herda o grupo do diretório** |
| **sticky** | 1000 | Irrelevante | **Só o dono pode apagar** |

```bash
echo "═══ como aparecem no ls ═══"
mkdir -p bits && cd bits

touch normal suid sgid sticky ambos
chmod 755 normal
chmod 4755 suid          # setuid
chmod 2755 sgid          # setgid
chmod 1755 sticky        # sticky
chmod 6755 ambos         # setuid + setgid

ls -la
echo
echo "  ⚠ a letra na 4ª posição:"
echo "     s  = setuid + execução"
echo "     S  = setuid SEM execução (⚠ é bug: o bit não faz nada)"
echo "     s/rwx rws = setgid"
echo "     t  = sticky"
```

### A regra do `S` maiúsculo

⚠ **`S` (maiúsculo) significa `setuid` **sem** bit de execução.** E `setuid` **sem execução não faz
nada** — porque `setuid` age na **execução** do arquivo.

⚠ **A consequência de auditoria:** um arquivo com `S` (não `s`) **parece perigoso no `ls`** mas não
é. **E o inverso é o achado:** um arquivo com `s` executável e de dono `root` **é** o caminho de
privilégio.

⚠ **E é por isso que a auditoria de `setuid` exige olhar três coisas:** o bit, o **dono**, e onde
o arquivo está.

```bash
echo "═══ o `s` que não faz nada ═══"
touch falso-setuid
chmod 4644 falso-setuid     # setuid SEM execução
stat -c '%A  %a  %n' falso-setuid
echo "  ⚠ 'S' maiúsculo: setuid sem execução — não faz efeito"
echo

touch real-setuid
chmod 4755 real-setuid
stat -c '%A  %a  %n' real-setuid
echo "  's' minúsculo: setuid COM execução — é o que importa"
```

### Sticky em diretório — o que ela realmente protege

⚠ **`/tmp` com sticky é o padrão correto.** Sem sticky, **qualquer usuário apaga arquivo de
qualquer outro** em `/tmp` — porque o diretório é gravável.

```bash
echo "═══ sticky no diretório ═══"
mkdir -p /tmp/com-sticky /tmp/sem-sticky
chmod 1777 /tmp/com-sticky
chmod 0777 /tmp/sem-sticky

stat -c '  %A  %a  %n' /tmp/com-sticky /tmp/sem-sticky
echo

echo "── a demonstração (com dois usuários) ──"
cat <<'EXPL'
  Sem sticky (0777):
    user A cria /tmp/sem-sticky/arqA
    user B pode: rm /tmp/sem-sticky/arqA   ⚠ APAGA arquivo que não é dele

  Com sticky (1777):
    user A cria /tmp/com-sticky/arqA
    user B tenta: rm /tmp/com-sticky/arqA  → Operation not permitted ✓
EXPL

echo
echo "  ⚠ como testar de verdade (na sua VM):"
echo "     sudo -u nobody touch /tmp/sem-sticky/x"
echo "     sudo -u daemon rm /tmp/sem-sticky/x      # funciona — sem sticky"
echo "     sudo -u nobody touch /tmp/com-sticky/y"
echo "     sudo -u daemon rm /tmp/com-sticky/y      # falha — sticky protege"
```

⚠ **O achado real é: diretório compartilhado (`/tmp`, `/var/tmp`, `/dev/shm`) **sem** sticky.**
Isso significa que a classe de ataque do `/tmp` previsível funciona — um atacante cria arquivo com
nome que um serviço espera, e o serviço o usa como `root`.

⚠ **Por isso o sticky existe**, e por isso ele é **a primeira coisa a verificar** em `/tmp` de
servidor.

**Produza `bits-especiais.md`:**

| Arquivo | Modo | Dono | Efeito real | Risco |
|---|---|---|---|---|
| `S` (maiúsculo) | | | | |
| `s` (minúsculo) | | | | |
| sticky em dir | | | | |

**Responda:**

1. Qual a diferença entre `S` e `s`? **Qual faz efeito?**
2. O que `setgid` faz num **diretório**? (Diferente de num arquivo.)
3. O que sticky protege, e em qual caso ela é necessária?
4. **`/tmp` sem sticky é achado de qual classe?** Por quê?

---

## 3.3 `umask` — a permissão que ninguém escolheu

⚠ **`umask` é a máscara que **subtrai** permissão do valor padrão.** E ela é a fonte silenciosa de
arquivo permissivo.

```bash
echo "═══ umask atual ═══"
umask
printf '  octal: %s\n' "$(umask)"
printf '  simbólico: %s\n' "$(umask -S)"

echo
echo "═══ a conta ═══"
cat <<'EXPL'
  arquivo normal : base 0666  -  umask  → permissão final
  diretório      : base 0777  -  umask  → permissão final

  ⚠ a subtração é por BIT, não aritmética:

    0666  = 110 110 110
    umask 0022 = 000 010 010   (bits a REMOVER)
    ───────────────────────
    0644  = 110 100 100
EXPL

echo
echo "═══ os valores comuns ═══"
for m in 022 027 077 002; do
    f=$(python3 -c "print(oct(0o666 & ~0o$m)[2:].zfill(3))")
    d=$(python3 -c "print(oct(0o777 & ~0o$m)[2:].zfill(3))")
    printf '  umask %-4s → arquivo %s,  diretório %s\n' "$m" "$f" "$d"
done

echo
echo "═══ o achado: umask permissiva ═══"
cat <<'EXPL'
  umask 022 → arquivo 644  ✓ correto
  umask 002 → arquivo 664  ⚠ grupo escreve — ok em grupo compartilhado
  umask 000 → arquivo 666  ⚠⚠ TODOS escrevem — achado
  umask 077 → arquivo 600  ✓ restrito (para dado sensível)
EXPL
```

⚠ **A demonstração que faz o ponto:**

```bash
echo "═══ criando arquivos com umask diferentes ═══"
mkdir -p umask-demo && cd umask-demo

for m in 022 002 000 077; do
    ( umask "$m"
      touch "arq-$m.txt"
      mkdir "dir-$m"
    )
    printf '  umask %-4s → arquivo %-4s  diretório %-4s\n' \
        "$m" "$(stat -c %a "arq-$m.txt")" "$(stat -c %a "dir-$m")"
done

ls -la
cd ..
```

⚠ **A linha `umask 000` é o achado.** Todo arquivo criado fica `666` — **todos leem e escrevem**.
Numa aplicação que grava configuração ou log, isso é exposição direta.

⚠ **E `umask` não aparece em `ls`.** Ela é **estado do processo** — e por isso a auditoria de
permissão exige verificar a `umask` **do serviço**, não só a do shell.

```bash
echo "═══ umask de um serviço de sistema ═══"
echo "  ⚠ a umask do serviço pode diferir da sua"
for u in ssh.service systemd-journald.service cron.service; do
    linha=$(systemctl cat "$u" 2>/dev/null | grep -E 'UMask' | head -1)
    printf '  %-32s %s\n' "$u" "${linha:-（padrão 0022）}"
done

echo
echo "  ⚠ e a umask do /etc/passwd NÃO é a mesma de /etc/shadow:"
stat -c '  %A %a  %n' /etc/passwd /etc/shadow /etc/group /etc/gshadow 2>/dev/null
```

⚠ **A última linha é a comparação que a maioria não faz.** `/etc/shadow` deve ser `640 root:shadow`
— e `/etc/passwd` é `644` de propósito, porque é feito para ser lido. **Saber o esperado é metade
da auditoria.**

**Produza `umask.md`:**

| `umask` | Arquivo criado | Diretório criado | Achado? |
|---|---|---|---|
| `022` | | | |
| `002` | | | |
| `000` | | | |
| `077` | | | |

**Responda:**

1. Qual a sua `umask` atual?
2. Com `umask 000`, que permissão um arquivo novo ganha? **É achado?**
3. Por que `umask` **não** aparece no `ls`?
4. Qual permissão `/etc/shadow` deveria ter, e por quê?

---

## 3.4 `setuid` — auditoria por necessidade

⚠ **O bit `setuid` é o principal caminho de escalação em Linux. E a auditoria não é "quantos
existem" — é "quais são necessários".**

```bash
cd ~/lab/mod03

echo "═══ todos os setuid do sistema ═══"
find / -perm -4000 -type f 2>/dev/null | sort > setuid.txt
wc -l < setuid.txt | xargs echo "  total:"
echo
cat setuid.txt | sed 's/^/  /'
```

### A auditoria em cinco passos

| # | Passo | O que procura |
|---|---|---|
| 1 | **Dono é `root`?** | Se não, `setuid` é inútil ou suspeito |
| 2 | **Bit de execução presente?** | `s` vs. `S` |
| 3 | **Está em caminho do sistema?** | `/usr/bin`, `/bin` — não `/home`, `/tmp` |
| 4 | **É de pacote?** | `dpkg -S` — ou é binário solto |
| 5 | **A distribuição já o traz?** | Fora do padrão = instalado por alguém |

```bash
echo "═══ auditoria em cinco passos ═══"
echo

while IFS= read -r b; do
    dono=$(stat -c '%U' "$b" 2>/dev/null)
    modo=$(stat -c '%A' "$b" 2>/dev/null)
    pkg=$(dpkg -S "$b" 2>/dev/null | cut -d: -f1)

    printf '  %s\n' "$b"
    printf '     dono : %s\n' "$dono"
    printf '     modo : %s\n' "$modo"
    printf '     pacote: %s\n' "${pkg:-⚠ NENHUM — binário solto}"

    # o teste crítico
    d=$(dirname "$b")
    [ -w "$d" ] && printf '     ⚠⚠ DIRETÓRIO GRAVÁVEL: %s\n' "$d"

    # dono não-root
    [ "$dono" != "root" ] && printf '     ⚠ dono não-root\n'

    echo
done < setuid.txt | head -60
```

⚠ **A linha "NENHUM — binário solto" é achado grave.** Um `setuid` **que não pertence a pacote**
significa que **alguém o colocou ali** — e rodando como `root`. **É a assinatura de persistência**
(ou de instalação manual que ninguém documentou).

⚠ **E a linha do diretório gravável é crítica.** Já vista no módulo 1: se o diretório é gravável,
qualquer usuário **substitui o binário** — e ele roda como `root`.

```bash
echo "═══ 1. setuid que NÃO é de pacote ═══"
while IFS= read -r b; do
    dpkg -S "$b" >/dev/null 2>&1 || echo "  ⚠ ${b}"
done < setuid.txt
echo "  (fim)"

echo
echo "═══ 2. setuid fora dos diretórios do sistema ═══"
grep -vE '^/(usr/)?(s?bin|lib|libexec|opt)/' setuid.txt | sed 's/^/  ⚠ /'
echo "  (fim)"

echo
echo "═══ 3. setuid em diretório gravável ═══"
while IFS= read -r b; do
    d=$(dirname "$b")
    [ -w "$d" ] && stat -c '  ⚠⚠ %n   (dir %n)' "$b" 2>/dev/null && \
        stat -c '      dir: %A %U  %n' "$d"
done < setuid.txt
echo "  (fim)"

echo
echo "═══ 4. o padrão esperado (para comparar) ═══"
cat <<'EXPL'
  Num Ubuntu/Debian mínimo, os setuid legítimos são poucos:
    /usr/bin/passwd          muda sua senha
    /usr/bin/su              troca de usuário
    /usr/bin/sudo            executa como outro
    /usr/bin/mount / umount  monta (às vezes)
    /usr/bin/pkexec          polkit
    /usr/bin/chsh / chfn     shell e info do usuário
    /usr/bin/newgrp / gpasswd  grupo
    /usr/lib/.../dbus-daemon-launch-helper
    /usr/lib/.../ssh-keysign
    /usr/lib/snapd/snap-confine  (se snap instalado)

  ⚠ qualquer coisa FORA desta lista merece justificativa
EXPL
```

⚠ **A quarta seção é o instrumento.** Auditoria de `setuid` **não é "quantos tem"** — é **"quais
não deveriam estar aqui"**. A lista de esperados é curta, e tudo fora dela exige explicação.

⚠ **E é aí que entram os binários de terceiro.** Uma aplicação que "precisa" de `setuid` para
funcionar é aquela cuja instalação adicionou um caminho de `root` — e frequentemente **sem
atualização**, porque não é de pacote.

**Produza `setuid.md`:**

| Binário | Dono | Modo | Pacote | Esperado? | Risco |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |

**Responda:**

1. **Quantos `setuid` fora da lista esperada?**
2. Algum **não é de pacote**? **É o achado mais grave.** Por quê?
3. Algum está em **diretório gravável**?
4. Qual `setuid` você **removeria**? Com qual argumento?

⚠ **A resposta 4 é a decisão de auditoria.** Remover `setuid` pode quebrar funcionalidade. **A
recomendação é removê-lo e testar**, com a alternativa (capability) se necessário — o módulo 5.

---

## 3.5 ACL — a permissão que `ls` não mostra

⚠ **A ACL adiciona entrada por **usuário específico**, fora dos nove bits.** E é invisível no
`ls -l`.

```bash
echo "═══ 1. habilitando ACL (o kernel já suporta) ═══"
mount | grep -E ' / ' | grep -o 'acl' || echo "  ⚠ ACL não listada na montagem — pode estar ativa mesmo assim"

echo
echo "═══ 2. criando uma ACL ═══"
cd ~/lab/mod03
echo "dado" > com-acl.txt
chmod 640 com-acl.txt

echo "  antes da ACL:"
ls -l com-acl.txt

# Adiciona permissão para um usuário específico
setfacl -m u:daemon:r com-acl.txt 2>/dev/null && {
    echo
    echo "  depois da ACL:"
    ls -l com-acl.txt
    echo "  ⚠ note o '+' no fim das permissões — indica ACL presente"
    echo
    echo "  a ACL completa (invisível no ls):"
    getfacl com-acl.txt 2>/dev/null | sed 's/^/    /'
} || echo "  (setfacl indisponível — instale acl)"
```

### A anatomia da ACL

```
# file: com-acl.txt
# owner: usuario
# group: usuario
user::rw-                    ← dono (os nove bits)
user:daemon:r--              ← ⚠ ENTRADA EXTRA — invisível no ls
group::r--                   ← grupo (os nove bits)
mask::r--                    ← ⚠ teto EFETIVO para grupo e entradas
other::---                   ← outros (os nove bits)
```

⚠ **A linha `mask` é a parte que engana.** Ela é o **teto** de permissão para **grupo e entradas
nomeadas**. Uma entrada `user:daemon:rwx` com `mask::r--` dá **apenas leitura** — porque a máscara
corta.

⚠ **É o achado de auditoria mais sutil da permissão:** `getfacl` mostra `rwx`, e o **efetivo** é
`r--`. **Ler a ACL sem ler a máscara leva a conclusão errada.**

```bash
echo "═══ 3. a máscara cortando a permissão ═══"
setfacl -m u:daemon:rwx com-acl.txt 2>/dev/null
setfacl -m m::r com-acl.txt 2>/dev/null

echo "  a ACL diz rwx, a máscara diz r:"
getfacl com-acl.txt 2>/dev/null | grep -E 'user:daemon|mask' | sed 's/^/    /'
echo
echo "  ⚠ o efetivo para daemon é r--, não rwx — a máscara corta"
echo "  ⚠ getfacl mostra 'effective' quando você pede:"
getfacl -e com-acl.txt 2>/dev/null | grep 'effective' | sed 's/^/    /'
```

⚠ **`getfacl -e` é a flag que resolve.** Ela mostra as permissões **efetivas**, com a máscara já
aplicada. **Use `-e` em auditoria** — sem ela, você lê a intenção, não o efeito.

### ACL padrão em diretório — a herança silenciosa

⚠ **Um diretório pode ter **ACL padrão**, que é aplicada a todo arquivo criado dentro dele.**

```bash
echo "═══ 4. ACL padrão (herança) ═══"
mkdir -p dir-com-acl-padrao
setfacl -d -m u:daemon:rwx dir-com-acl-padrao 2>/dev/null

echo "  ACL do diretório:"
getfacl dir-com-acl-padrao 2>/dev/null | grep -E 'default|^user' | sed 's/^/    /'

echo
touch dir-com-acl-padrao/novo.txt
echo "  ACL do arquivo CRIADO dentro:"
getfacl dir-com-acl-padrao/novo.txt 2>/dev/null | grep -E 'user:|mask' | sed 's/^/    /'
echo
echo "  ⚠ o arquivo nasceu com a ACL herdada — ninguém a definiu nele"
```

⚠ **A ACL padrão é o vetor que quase ninguém audita.** Um diretório com `default` dá permissão a
**todo** arquivo criado dentro dele — **para sempre**, sem que ninguém precise definir nada.

**Produza `acl.md`:**

| Arquivo | Modo (`ls`) | Entrada de ACL | Efetivo | Risco |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Responda:**

1. Como você detecta que um arquivo tem ACL? **Qual o sinal no `ls`?**
2. O que a máscara faz? **Por que `getfacl` sem `-e` engana?**
3. O que é ACL padrão em diretório? **Por que é difícil de auditar?**
4. **Por que a ACL escapa da auditoria que só faz `find -perm`?**

⚠ **A resposta 4 é o ponto do módulo.** `find -perm` lê os **nove bits**. Uma ACL pode dar acesso
que os bits negam — **e o `find` não vê.**

```bash
echo "═══ 5. a auditoria que encontra ACL ═══"
echo "  ⚠ `find -perm` NÃO encontra ACL. É preciso procurar o '+'."
echo
find / -xdev -type f 2>/dev/null | while read -r f; do
    ls -l "$f" 2>/dev/null | grep -q '^.\{10\}+' && echo "  ACL: $f"
done | head -20
echo "  (fim — pode demorar)"
```

---

## 3.6 O que `find -perm` não encontra

⚠ **A tabela que resume o módulo.**

| Achado | `find -perm` vê? | Como encontrar |
|---|---|---|
| Nove bits clássicos | **Sim** | `find -perm` |
| `setuid`/`setgid`/sticky | **Sim** | `find -perm -4000` |
| **ACL** | **Não** | `ls` com `+`, ou `getfacl` |
| **ACL padrão em diretório** | **Não** | `getfacl -d` |
| **`umask` do processo** | **Não** | `/proc/<pid>/status` ou config do serviço |
| **Capability** | **Não** | `getcap -r /` ← módulo 5 |
| **Atributo estendido (`+i`)** | **Não** | `lsattr` |
| **`setuid` em diretório gravável** | **Não** | `find` + `-w` no diretório |
| **Dono não-`root` com `setuid`** | Parcial | `stat -c %U` |
| **Binário solto (não de pacote)** | **Não** | `dpkg -S` |

⚠ **A tabela é o argumento do curso inteiro.** A auditoria de permissão que olha só `-perm` cobre
**metade** das formas de privilégio.

⚠ **E o atributo estendido merece nota.** `chattr +i` deixa o arquivo **imutável** — nem `root`
apaga sem remover o atributo. É usado tanto para **proteger** (`+i` em `/etc/passwd`) quanto para
**persistir** (`+i` num binário malicioso, para dificultar remoção). **É achado nos dois sentidos.**

```bash
echo "═══ atributos estendidos ═══"
lsattr /etc/passwd /etc/shadow /usr/bin/passwd 2>/dev/null | sed 's/^/  /'
echo
echo "  um 'i' na coluna significa IMUTÁVEL:"
lsattr /etc/passwd 2>/dev/null | grep -q 'i' && echo "    ⚠ /etc/passwd é imutável" || echo "    /etc/passwd não é imutável"
echo
echo "  ⚠ imutável em binário comum pode ser persistência:"
find / -xdev -type f 2>/dev/null | while read -r f; do
    attr=$(lsattr "$f" 2>/dev/null | awk '{print $1}')
    case "$attr" in *i*) echo "    +i: $f" ;; esac
done | head -10
```

**Produza `nao-visto.md`:**

| Forma de privilégio | `find -perm` vê? | Como achar |
|---|---|---|
| ACL | | |
| ACL padrão | | |
| `umask` | | |
| Capability | | |
| Atributo estendido | | |
| Binário solto | | |

**Responda:**

1. **Por que `find -perm` cobre só metade?**
2. O que `chattr +i` faz? **Em que sentido ele é achado?**
3. Como você acha `setuid` em diretório gravável? (Não é `find -perm` sozinho.)
4. **Qual forma de privilégio você acha que é a mais esquecida?** Por quê?

---

## 3.7 LAB — Auditoria de permissão completa

**Duração:** 120 min

### Passo 1 — O script de auditoria (40 min)

```bash
cd ~/lab/mod03

cat > audita-permissoes.sh <<'SCRIPT'
#!/usr/bin/env bash
# audita-permissoes.sh — auditoria de permissão além dos nove bits
set -uo pipefail

SAIDA="${1:-permissao.txt}"
ROOT="${2:-/}"

{
    echo "═══════════ AUDITORIA DE PERMISSÃO ═══════════"
    echo "host: $(hostname)   data: $(date -Is)"
    echo "raiz: ${ROOT}"
    echo

    echo "── 1. UMASK (do shell atual) ──"
    printf '  umask: %s\n' "$(umask)"
    [ "$(umask)" = "0000" ] || [ "$(umask)" = "000" ] && echo "  ⚠⚠ PERMISSIVA"
    echo

    echo "── 2. SETUID ──"
    find "$ROOT" -xdev -perm -4000 -type f 2>/dev/null | sort | while read -r b; do
        printf '  %s\n' "$b"
        printf '     %s  %s:%s\n' "$(stat -c %A "$b")" "$(stat -c %U "$b")" "$(stat -c %G "$b")"
        pkg=$(dpkg -S "$b" 2>/dev/null | cut -d: -f1)
        printf '     pacote: %s\n' "${pkg:-⚠ NÃO É DE PACOTE}"
        # maiúsculo = sem execução = não faz efeito
        stat -c %A "$b" | grep -q '^...S' && printf '     ⚠ "S" maiúsculo: setuid inócuo\n'
    done
    echo

    echo "── 3. SETUID EM DIRETÓRIO GRAVÁVEL ──"
    find "$ROOT" -xdev -perm -4000 -type f 2>/dev/null | while read -r b; do
        d=$(dirname "$b")
        [ -w "$d" ] && printf '  ⚠⚠ %s  (dir %s gravável)\n' "$b" "$d"
    done
    echo

    echo "── 4. SETGID ──"
    find "$ROOT" -xdev -perm -2000 -type f 2>/dev/null | sort | head -30 | sed 's/^/  /'
    echo

    echo "── 5. DIRETÓRIO COMPARTILHADO SEM STICKY ──"
    for d in /tmp /var/tmp /dev/shm; do
        [ -d "$d" ] || continue
        m=$(stat -c %a "$d")
        case "$m" in
            *1*|*3*|*5*|*7*) printf '  ✓ %s  %s (tem sticky)\n' "$d" "$m" ;;
            *) printf '  ⚠ %s  %s SEM sticky\n' "$d" "$m" ;;
        esac
    done
    echo

    echo "── 6. ARQUIVO COM ACL ──"
    find "$ROOT" -xdev -type f 2>/dev/null | while read -r f; do
        ls -l "$f" 2>/dev/null | grep -q '^.\{10\}+' && getfacl -p "$f" 2>/dev/null | \
            grep -vE '^#|^$' | sed "s|^|  [${f}] |"
    done | head -40
    echo

    echo "── 7. DIRETÓRIO COM ACL PADRÃO ──"
    find "$ROOT" -xdev -type d 2>/dev/null | while read -r d; do
        getfacl -p "$d" 2>/dev/null | grep -q '^default:' && printf '  ⚠ %s tem ACL padrão\n' "$d"
    done | head -20
    echo

    echo "── 8. CAPABILITIES (getcap) ──"
    getcap -r "$ROOT" 2>/dev/null | sed 's/^/  /'
    echo

    echo "── 9. ATRIBUTO IMUTÁVEL ──"
    find "$ROOT" -xdev -type f 2>/dev/null | while read -r f; do
        a=$(lsattr "$f" 2>/dev/null | awk '{print $1}')
        case "$a" in *i*) printf '  +i %s\n' "$f" ;; esac
    done | head -20
    echo

    echo "── 10. ARQUIVO SENSÍVEL COM PERMISSÃO ERRADA ──"
    for f in /etc/shadow /etc/gshadow /etc/passwd /etc/group \
             /root /etc/crontab /var/spool/cron; do
        [ -e "$f" ] || continue
        printf '  %-22s %s %s:%s\n' "$f" "$(stat -c %A "$f")" "$(stat -c %U "$f")" "$(stat -c %G "$f")"
    done
    echo
    echo "  esperado:"
    echo "    /etc/shadow   640 root:shadow"
    echo "    /etc/gshadow  640 root:shadow"
    echo "    /etc/passwd   644 root:root"
    echo "    /root         700 root:root"
    echo "    /etc/crontab  644 root:root"

} > "$SAIDA" 2>&1

echo "salvo em ${SAIDA} ($(wc -l < "$SAIDA") linhas)"
SCRIPT

chmod +x audita-permissoes.sh
sudo ./audita-permissoes.sh permissao.txt
head -70 permissao.txt
```

Produza `auditoria-permissao.md`:

| Seção | Achado | Quantidade | Risco |
|---|---|---|---|
| 1 — `umask` | | | |
| 2 — `setuid` | | | |
| 3 — `setuid` gravável | | | |
| 4 — `setgid` | | | |
| 5 — `/tmp` sem sticky | | | |
| 6 — ACL | | | |
| 7 — ACL padrão | | | |
| 8 — capability | | | |
| 9 — imutável | | | |
| 10 — sensível | | | |

**Responda:**

1. **Quantos achados nas dez seções?**
2. Qual seção surpreendeu — achou algo que você não esperava?
3. **O `setuid` em diretório gravável** apareceu?
4. Qual seção **você não teria pensado** em verificar?

### Passo 2 — O que o `lynis` não vê (35 min)

⚠ **Compare as duas auditorias.**

```bash
cd ~/lab/mod03

echo "═══ o que o lynis reporta sobre permissão ═══"
sudo lynis audit system --quick 2>/dev/null | \
    grep -iE 'permission|setuid|sticky|umask|acl|capab' | head -20

echo
echo "═══ o que a SUA auditoria achou ═══"
grep -cE '⚠' permissao.txt | xargs echo "  achados:"
grep -E '⚠⚠' permissao.txt | head -10

echo
echo "═══════════ COMPARAÇÃO ═══════════"
cat <<'EXPL'
  O lynis verifica:
    ✓ setuid presentes
    ✓ permissão de arquivo conhecido
    ✓ sticky em /tmp

  O lynis NÃO verifica:
    ✗ setuid em diretório GRAVÁVEL      ← cruza duas coisas
    ✗ ACL (permissão fora dos nove bits)
    ✗ ACL PADRÃO em diretório
    ✗ setuid que NÃO é de pacote
    ✗ atributo imutável em binário suspeito
    ✗ umask do SERVIÇO (diferente da do shell)
EXPL
```

Produza `lynis-vs-manual.md`:

| Verificação | `lynis` faz? | Sua auditoria faz? | Qual é melhor |
|---|---|---|---|
| `setuid` presente | | | |
| `setuid` gravável | | | |
| ACL | | | |
| ACL padrão | | | |
| `setuid` não-pacote | | | |
| `umask` de serviço | | | |

**Responda:**

1. **Quantas verificações o `lynis` cobre** das seis?
2. **Qual a sua auditoria cobre e o `lynis` não?**
3. Por que o `lynis` **não cruza** `setuid` com permissão de diretório?
4. **Qual das duas você rodaria primeiro** num cliente? Por quê?

⚠ **A resposta 3 é conceitual.** O `lynis` verifica **itens conhecidos de configuração**. Cruzar
duas dimensões (o bit e a permissão do diretório) é **raciocínio sobre o sistema**, não conferência
de checklist. **É a diferença entre scanner e auditor.**

### Passo 3 — Relatório e correção (45 min)

Produza `relatorio-permissao.md`:

```markdown
# Auditoria de permissão — [host]

## 1. Método e data
## 2. Resultado por dimensão
| Dimensão | Verificados | Achados | Críticos |
|---|---|---|---|
| Nove bits | | | |
| setuid | | | |
| setgid | | | |
| sticky | | | |
| ACL | | | |
| ACL padrão | | | |
| Capability | | | |
| Atributo estendido | | | |

## 3. Achados críticos
| # | Achado | Evidência | Correção | Custo |
|---|---|---|---|---|

## 4. Achados médios
## 5. O que verify e está correto
## 6. O que NÃO foi verificado
⚠ Mínimo 3:
- permissão de arquivo dentro de pacote (não auditada linha a linha)
- ACL em sistema de arquivos sem suporte
- umask de cada serviço individualmente
```

**Para cada achado crítico, escreva a correção exata:**

```bash
echo "═══ correções — os comandos ═══"
cat <<'EXPL'
  1. setuid desnecessário:
       sudo chmod u-s /caminho/binario
       # ⚠ TESTE antes: pode quebrar funcionalidade

  2. setuid em diretório gravável:
       sudo chown root:root /dir
       sudo chmod 755 /dir
       # ou mover o binário para /usr/local/bin

  3. /tmp sem sticky:
       sudo chmod 1777 /tmp

  4. ACL indevida:
       sudo setfacl -x u:usuario /caminho    # remove a entrada
       sudo setfacl -b /caminho              # remove todas

  5. ACL padrão indevida:
       sudo setfacl -k /dir                  # remove o default

  6. umask permissiva em serviço:
       # no unit: UMask=0027
       sudo systemctl edit nome.service

  7. atributo imutável suspeito:
       sudo chattr -i /caminho

  8. capability excessiva:
       sudo setcap -r /caminho               # remove todas
EXPL
```

**Responda:**

1. **Quantos achados críticos?** Quantos se corrigem com **um comando**?
2. Qual correção **pode quebrar funcionalidade**? **Como você testaria?**
3. **Qual achado você deixaria para o cliente decidir?** Por quê?
4. **O que você não conseguiu verificar**, e o que isso significa para a confiança do relatório?

⚠ **A resposta 4 é a honestidade de auditoria.** Um relatório que não declara cobertura incompleta
**parece mais completo e é menos útil** — porque o cliente não sabe onde não olhar.

### Critérios de aceitação

- `audita-permissoes.sh` rodando com `sudo`, com as **dez seções** preenchidas.
- Você identificou os **doze bits** e a diferença entre `S` e `s`.
- Você demonstrou `umask` com os **quatro valores** e o arquivo criado por cada um.
- `setuid.md` com **todos** os binários, o pacote de cada um, e quais estão fora da lista esperada.
- Você **cruzou** `setuid` com permissão de diretório — não só listou.
- `acl.md` com a entrada **e a máscara**, e a diferença entre `getfacl` e `getfacl -e`.
- Você demonstrou **ACL padrão** e o arquivo que herda.
- `lynis-vs-manual.md` com as **seis** verificações comparadas.
- Você identificou **duas** verificações que o `lynis` não faz.
- `relatorio-permissao.md` com a seção 6 (não verificado) com **três itens**.
- Cada achado crítico com a **correção exata** em comando.

---

## Avaliação

1. Descreva os doze bits e o que cada um faz.
2. **Qual é o `Uid` que o kernel usa?** E qual a ordem de verificação (dono → grupo → outros)?
3. Por que o dono do arquivo pode mudar permissão **mesmo sem `w`**?
4. Qual a diferença entre `s` e `S`? **Qual faz efeito?**
5. O que `setgid` faz num **arquivo**? E num **diretório**?
6. O que sticky protege? **Por que `/tmp` sem sticky é achado?**
7. **Por que `setuid` em script é ignorado pelo kernel?**
8. Explique `umask` com a conta bit a bit de `0666 & ~0022`.
9. **Por que `umask` não aparece no `ls`**, e onde verificá-la?
10. Descreva a auditoria de `setuid` em cinco passos.
11. **Por que "setuid que não é de pacote" é achado grave?**
12. O que a máscara de ACL faz? **Por que `getfacl` sem `-e` engana?**
13. O que é ACL **padrão**, e por que é difícil de auditar?
14. Como você detecta que um arquivo tem ACL, olhando o `ls`?
15. **Cite seis formas de privilégio que `find -perm` não encontra.**
16. O que `chattr +i` faz, e em que dois sentidos ele é achado?
17. O que `/etc/shadow` deveria ter de permissão e dono? Compare com o seu.
18. **O que o `lynis` não verifica** sobre permissão, e por quê?

---

**Próximo:** [Módulo 4 — Usuário, grupo e credencial](modulo-04.md)
